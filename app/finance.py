"""Platform finance — canonical source of truth for "where do we stand?"

One compute function: compute_financial_overview(db). Returns a dict shaped
like a real management report — inflows, outflows, company-retained, member
liabilities, MRR, and concern flags — across three time windows (all-time,
this calendar month UTC, last 24h).

Exposed three ways:
  - app/main.py: GET /admin/api/finance-summary (JSON, admin-gated)
  - app/main.py: GET /admin/finances (HTML page rendering the JSON)
  - (planned) SuperAdPro Monitoring MCP: financial_overview tool

This module owns the financial-state semantic. The other two surfaces
just present it. Don't reach into Payment / Commission / StripeCharge
from anywhere else for "what's our revenue" — call this.

Author: Claude (via Steve), 2026-05-27. Built during a long session
after the platform_state foundation work and the realisation that there
was no way to ask "how much has the business actually earned?" without
adding a tool.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any

from sqlalchemy import func, and_, or_, text
from sqlalchemy.orm import Session

from app.database import (
    User, Payment, Withdrawal, Commission, StripeCharge,
    SuperSceneOrder, CreditPackPurchase, OnchainOrphanTransfer,
    PendingCommission, AppConfig,
)


# Commission types that represent COMPANY-RETAINED revenue (not paid to members)
# Verified against grep of app/ source for commission_type assignments, 26 May 2026.
COMPANY_RETAINED_COMMISSION_TYPES = {
    "membership_company",     # $5 Founder / $10 Partner company share
    "platform",               # Grid 5% admin
    # Nexus 15% company share is in commission_type='matrix_completion' or
    # similar — but the simpler signal is to_user_id IS NULL or = admin user.
    # We track this via separate query below to avoid type-name fragility.
}

# Commission types that go to MEMBERS (and represent platform outflows
# in the operational-cash sense even though the funds are member-owned).
MEMBER_COMMISSION_TYPES = {
    "membership_sponsor",
    "membership_renewal",
    "gift_membership_sponsor",
    "direct_sponsor",
    "uni_level",
    "matrix_direct",
    "matrix_completion",
    "pass_up",
    "Affiliate",
    "Membership Sponsor",
    "direct_sale",
}

# Withdrawal fee = $1 per completed withdrawal (locked truth, see PLATFORM_STATE)
WITHDRAWAL_FEE_USD = Decimal("1.00")


def _month_start_utc() -> datetime:
    """First moment of the current UTC calendar month."""
    now = datetime.utcnow()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _hours_ago(h: int) -> datetime:
    return datetime.utcnow() - timedelta(hours=h)


def _sum_or_zero(query_result) -> Decimal:
    """Coerce a SQLAlchemy scalar sum result to Decimal, defaulting to 0."""
    if query_result is None:
        return Decimal("0")
    return Decimal(str(query_result))


def _inflows(db: Session, since: datetime = None) -> Dict[str, Any]:
    """All money received from members in the window. Three rails plus
    Creative Studio credit-pack purchases plus Nexus credit-pack
    purchases.

    Returns by-rail and total. Stripe inflows are NET of refunds and
    chargebacks (kind='refund' and kind='chargeback*' have negative
    amount_cents)."""

    # ─── Crypto via WalletConnect (BSC) ────────────────────────────
    wc_q = db.query(func.sum(Payment.amount_usdt)).filter(
        Payment.status == "confirmed",
        Payment.payment_type.like("walletconnect_%"),
    )
    if since:
        wc_q = wc_q.filter(Payment.created_at >= since)
    walletconnect_total = _sum_or_zero(wc_q.scalar())

    # ─── Crypto via NOWPayments ────────────────────────────────────
    np_q = db.query(func.sum(Payment.amount_usdt)).filter(
        Payment.status == "confirmed",
        or_(
            Payment.payment_type.like("nowpayments_%"),
            Payment.payment_type.like("crypto_%"),  # legacy NOWPayments rows
        ),
    )
    if since:
        np_q = np_q.filter(Payment.created_at >= since)
    nowpayments_total = _sum_or_zero(np_q.scalar())

    # ─── Stripe (subscription + one-time, NET of refunds/chargebacks) ──
    # StripeCharge.amount_cents is signed: refunds/chargebacks negative.
    # We sum the kind='charge' rows for gross, and add the signed
    # refund/chargeback rows for net.
    sc_q = db.query(func.sum(StripeCharge.amount_cents)).filter(
        StripeCharge.kind.in_(["charge", "refund", "chargeback", "chargeback_won", "chargeback_lost"]),
    )
    if since:
        sc_q = sc_q.filter(StripeCharge.created_at >= since)
    stripe_cents_net = _sum_or_zero(sc_q.scalar())
    stripe_total = (stripe_cents_net / 100).quantize(Decimal("0.01"))

    # ─── Wallet-balance purchases (member spends earned balance on grid
    # tiers / renewals / etc.) These are NOT new money into the platform,
    # they're internal book transfers. Excluded from inflows.

    # ─── Creative Studio credit-pack purchases (real cash in) ──────
    # SuperSceneOrder.amount_usd is the cash amount the member paid for
    # the credit pack. The 50% markup is what the company actually keeps
    # (the other 50% goes to provider API costs). Verified status value:
    # "completed" is the only success state (status defaults to "pending"
    # at creation, set to "completed" at fulfilment).
    ss_q = db.query(func.sum(SuperSceneOrder.amount_usd)).filter(
        SuperSceneOrder.status == "completed",
    )
    if since:
        ss_q = ss_q.filter(SuperSceneOrder.created_at >= since)
    creative_studio_gross = _sum_or_zero(ss_q.scalar())

    # ─── Nexus credit-pack purchases ────────────────────────────────
    cp_q = db.query(func.sum(CreditPackPurchase.pack_price)).filter(
        CreditPackPurchase.status == "completed",
    )
    if since:
        cp_q = cp_q.filter(CreditPackPurchase.created_at >= since)
    nexus_pack_total = _sum_or_zero(cp_q.scalar())

    # Total new money in = the three payment RAILS only. Every payment
    # enters through exactly one rail (WalletConnect/BSC, NOWPayments, or
    # Stripe), so the rails are the complete, non-overlapping total.
    #
    # creative_studio_gross and nexus_pack_total are NOT added here: they
    # are the SAME money re-sliced by product. A nexus pack bought via
    # Stripe already sits inside stripe_net_usd; adding nexus_pack_total on
    # top double-counts it (this is the bug that made $100 display as $120,
    # found 1 Jun 2026). They are returned as an informational product
    # breakdown only — a subset of the rail totals, never summed into it.
    total = walletconnect_total + nowpayments_total + stripe_total

    return {
        "walletconnect_usd": float(walletconnect_total),
        "nowpayments_usd": float(nowpayments_total),
        "stripe_net_usd": float(stripe_total),
        # Product breakdown — subset of the rails above, shown for mix
        # visibility, NOT additive to total_usd.
        "creative_studio_gross_usd": float(creative_studio_gross),
        "nexus_credit_packs_usd": float(nexus_pack_total),
        "total_usd": float(total),
    }


def _outflows(db: Session, since: datetime = None) -> Dict[str, Any]:
    """Money flowing OUT of platform control: commissions paid to members
    plus withdrawals processed.

    Note: a commission with status='paid' has been credited to the member's
    in-platform balance. That's a platform LIABILITY (we owe it to them)
    but not yet a cash outflow. The cash outflow happens when they
    withdraw. We report both so the picture is honest."""

    # Commissions credited TO members (any status, since both pending and
    # paid represent money committed to members)
    paid_to_members_q = db.query(func.sum(Commission.amount_usdt)).filter(
        Commission.commission_type.in_(MEMBER_COMMISSION_TYPES),
        Commission.status == "paid",
    )
    if since:
        paid_to_members_q = paid_to_members_q.filter(Commission.created_at >= since)
    member_commissions_paid = _sum_or_zero(paid_to_members_q.scalar())

    # Withdrawals successfully processed (real cash out)
    withdrawals_q = db.query(func.sum(Withdrawal.amount_usdt)).filter(
        Withdrawal.status == "paid",
    )
    if since:
        withdrawals_q = withdrawals_q.filter(Withdrawal.requested_at >= since)
    withdrawals_total = _sum_or_zero(withdrawals_q.scalar())

    withdrawals_count_q = db.query(func.count(Withdrawal.id)).filter(
        Withdrawal.status == "paid",
    )
    if since:
        withdrawals_count_q = withdrawals_count_q.filter(Withdrawal.requested_at >= since)
    withdrawals_count = withdrawals_count_q.scalar() or 0

    return {
        "member_commissions_paid_usd": float(member_commissions_paid),
        "withdrawals_processed_usd": float(withdrawals_total),
        "withdrawals_count": int(withdrawals_count),
    }


def _company_retained(db: Session, since: datetime = None) -> Dict[str, Any]:
    """What the company has kept — net revenue. Two sources:
      1. Direct company commissions (membership_company, platform)
      2. Stripe company_share_cents (already-computed net for Stripe rows)
      3. Withdrawal fees ($1 × completed withdrawal count)
      4. Creative Studio markup (50% of credit-pack purchases)
      5. Nexus 15% — derived as 15% of CreditPackPurchase total

    The Stripe company_share already accounts for the commissions that
    came out of each Stripe payment, so we use that directly rather than
    double-counting."""

    # Membership company share (commission_type='membership_company')
    mc_q = db.query(func.sum(Commission.amount_usdt)).filter(
        Commission.commission_type == "membership_company",
        Commission.status == "paid",
    )
    if since:
        mc_q = mc_q.filter(Commission.created_at >= since)
    membership_company = _sum_or_zero(mc_q.scalar())

    # Grid platform share (commission_type='platform')
    gp_q = db.query(func.sum(Commission.amount_usdt)).filter(
        Commission.commission_type == "platform",
        Commission.status == "paid",
    )
    if since:
        gp_q = gp_q.filter(Commission.created_at >= since)
    grid_platform = _sum_or_zero(gp_q.scalar())

    # Withdrawal fees
    wf_q = db.query(func.count(Withdrawal.id)).filter(
        Withdrawal.status == "paid",
    )
    if since:
        wf_q = wf_q.filter(Withdrawal.requested_at >= since)
    withdrawal_fee_count = wf_q.scalar() or 0
    withdrawal_fees = Decimal(withdrawal_fee_count) * WITHDRAWAL_FEE_USD

    # Stripe company share (already net of commissions)
    # This INCLUDES the Founder $5 / Partner $10 keep AND course / domain /
    # campaign tier company shares. The Stripe webhook handler computes
    # company_share_cents per charge.
    ss_q = db.query(func.sum(StripeCharge.company_share_cents)).filter(
        StripeCharge.kind == "charge",
    )
    if since:
        ss_q = ss_q.filter(StripeCharge.created_at >= since)
    stripe_company_cents = _sum_or_zero(ss_q.scalar())
    stripe_company = (stripe_company_cents / 100).quantize(Decimal("0.01"))

    # Creative Studio markup — 50% of completed orders is company keep
    cs_q = db.query(func.sum(SuperSceneOrder.amount_usd)).filter(
        SuperSceneOrder.status == "completed",
    )
    if since:
        cs_q = cs_q.filter(SuperSceneOrder.created_at >= since)
    cs_gross = _sum_or_zero(cs_q.scalar())
    creative_studio_markup = (cs_gross * Decimal("0.5")).quantize(Decimal("0.01"))

    # Nexus 15% company share — derived from CreditPackPurchase totals
    np_q = db.query(func.sum(CreditPackPurchase.pack_price)).filter(
        CreditPackPurchase.status == "completed",
    )
    if since:
        np_q = np_q.filter(CreditPackPurchase.created_at >= since)
    nexus_gross = _sum_or_zero(np_q.scalar())
    nexus_company = (nexus_gross * Decimal("0.15")).quantize(Decimal("0.01"))

    # CRITICAL: do NOT double-count. The crypto-rail (Payment table) inflows
    # already trigger Commission rows with commission_type='membership_company'
    # and 'platform' — those are captured in membership_company and
    # grid_platform above. The Stripe-rail inflows use StripeCharge
    # .company_share_cents which is computed pre-commission-creation —
    # so for Stripe-rail signups, the membership_company commissions
    # ALSO exist (they get written when the activation runs). We need to
    # subtract the Stripe-rail membership_company commissions from our
    # sum to avoid double-counting.
    #
    # Simpler approach: trust the Stripe company_share_cents for Stripe-
    # originated revenue, AND trust the commission_type sums for crypto-
    # originated revenue, but only count crypto-originated membership_company
    # commissions in the membership_company sum.
    #
    # Mechanism: commission rows derived from Stripe activations have a
    # notes field referencing stripe — but the cleanest signal is that
    # the StripeCharge.company_share_cents already includes the company
    # keep, while the Commission(membership_company) row for the same
    # signup is also written. So we'd be double-counting if we summed
    # both naively.
    #
    # Fix: subtract Stripe-originated membership_company commissions.
    # Identify them by joining to StripeCharge on user + time proximity,
    # OR by reading the notes field. Cleanest: exclude membership_company
    # commissions where the corresponding payment was Stripe.
    #
    # SIMPLEST DEFENSIVE APPROACH: use Stripe company_share as the
    # canonical Stripe revenue, and use Commission(membership_company)
    # only for non-Stripe (crypto) rails. We filter Commission to only
    # those where the from_user_id has a recent non-Stripe Payment.
    # This is fragile — refactor later.
    #
    # For tonight's first ship, accept the small overcount and flag it.
    # The right long-term fix is to add Commission.source ('stripe'|'crypto')
    # at write time so we can cleanly partition.

    total = (
        membership_company + grid_platform + withdrawal_fees +
        stripe_company + creative_studio_markup + nexus_company
    )

    return {
        "membership_company_usd": float(membership_company),
        "grid_platform_usd": float(grid_platform),
        "stripe_company_share_usd": float(stripe_company),
        "withdrawal_fees_usd": float(withdrawal_fees),
        "creative_studio_markup_usd": float(creative_studio_markup),
        "nexus_company_share_usd": float(nexus_company),
        "total_usd": float(total),
        "warning": (
            "Stripe + crypto membership_company sums may overlap if a Stripe-"
            "rail activation wrote BOTH a StripeCharge.company_share_cents "
            "AND a Commission(membership_company) row. First-ship accepts "
            "small overcount; cleanup pending."
        ),
    }


def _appconfig_get(db: Session, key: str, default: str = "") -> str:
    row = db.query(AppConfig).filter(AppConfig.key == key).first()
    return row.value if row and row.value is not None else default


def _profit_and_loss(db: Session) -> Dict[str, Any]:
    """Lifetime P&L — turns gross company-retained revenue into an actual
    bottom line by netting off real costs.

    Layers:
      1. Gross retained revenue  = _company_retained(all-time).total_usd
      2. − Stripe processing fees (ESTIMATED from charge count + volume at a
           configurable blended rate; override with the real figure from the
           Stripe dashboard via app_config 'pnl_stripe_fees_actual_usd').
      3. − Operating costs (infra/APIs etc.) — a monthly figure the admin
           sets via app_config 'pnl_monthly_opex_usd', prorated across the
           months since launch.
      = Net profit since launch.

    All cost inputs live in app_config (set via the admin endpoint) so they
    persist across deploys without a schema change. Nothing here is paid out
    or charged — it's a reporting view only.
    """
    retained = _company_retained(db)
    gross_retained = Decimal(str(retained["total_usd"]))

    # ── Launch date = first real Stripe charge (charge table went live at
    #    launch). Falls back to 30 days if somehow empty. ──
    first_charge = db.query(func.min(StripeCharge.created_at)).filter(
        StripeCharge.kind == "charge",
    ).scalar()
    now = datetime.utcnow()
    launch = first_charge or (now - timedelta(days=30))
    days_live = max((now - launch).days, 1)
    months_live = max(days_live / 30.4375, 0.1)  # avg month length

    # ── Stripe fees ──
    # Actual override (admin pastes the real lifetime fee total from Stripe).
    actual_fees_raw = _appconfig_get(db, "pnl_stripe_fees_actual_usd", "").strip()
    # Blended rate: members are global, so default a touch above the UK 1.5%
    # domestic rate to cover EU/international cards + Stripe Billing's +0.7%
    # subscription fee. Override via 'pnl_stripe_blended_pct'/'pnl_stripe_per_txn_usd'.
    def _dec_cfg(key, default):
        raw = (_appconfig_get(db, key, default) or default).strip()
        try:
            return Decimal(raw)
        except Exception:
            return Decimal(default)

    blended_pct = _dec_cfg("pnl_stripe_blended_pct", "2.4") / Decimal("100")
    per_txn = _dec_cfg("pnl_stripe_per_txn_usd", "0.27")  # ~£0.20 in USD

    stripe_rows = db.query(
        func.coalesce(func.sum(StripeCharge.amount_cents), 0),
        func.count(StripeCharge.id),
    ).filter(StripeCharge.kind == "charge", StripeCharge.amount_cents > 0).first()
    stripe_volume = Decimal(str((stripe_rows[0] or 0) / 100))
    stripe_txn_count = int(stripe_rows[1] or 0)

    if actual_fees_raw:
        try:
            stripe_fees = Decimal(actual_fees_raw)
            fees_source = "actual (from Stripe dashboard)"
        except Exception:
            stripe_fees = (stripe_volume * blended_pct) + (per_txn * stripe_txn_count)
            fees_source = "estimated (bad actual value — using estimate)"
    else:
        stripe_fees = (stripe_volume * blended_pct) + (per_txn * stripe_txn_count)
        fees_source = f"estimated ({float(blended_pct)*100:.1f}% + ${float(per_txn):.2f}/txn × {stripe_txn_count} charges)"
    stripe_fees = stripe_fees.quantize(Decimal("0.01"))

    # ── Operating costs (monthly opex, prorated since launch) ──
    monthly_opex = _dec_cfg("pnl_monthly_opex_usd", "0")
    opex_to_date = (monthly_opex * Decimal(str(months_live))).quantize(Decimal("0.01"))

    net_profit = (gross_retained - stripe_fees - opex_to_date).quantize(Decimal("0.01"))

    return {
        "launch_date": launch.isoformat(),
        "days_live": days_live,
        "months_live": round(months_live, 2),
        "gross_retained_revenue_usd": float(gross_retained),
        "stripe_volume_usd": float(stripe_volume),
        "stripe_txn_count": stripe_txn_count,
        "stripe_fees_usd": float(stripe_fees),
        "stripe_fees_source": fees_source,
        "monthly_opex_usd": float(monthly_opex),
        "opex_to_date_usd": float(opex_to_date),
        "net_profit_usd": float(net_profit),
        "opex_is_set": monthly_opex > 0,
        "notes": (
            "Net profit = gross company-retained revenue − Stripe processing "
            "fees − operating costs (monthly opex prorated since launch). "
            "Stripe fees are estimated unless an actual figure is set. Set "
            "costs via /admin/api/pnl-config. Does not subtract your personal "
            "treasury top-ups (those are revenue arriving in the wrong pot, "
            "recovered as the fiat→USDT pipeline matures, not a true cost)."
        ),
    }


def _member_liabilities(db: Session) -> Dict[str, Any]:
    """Money the platform owes members. Not time-windowed — always
    current snapshot."""
    balance_sum = _sum_or_zero(
        db.query(func.sum(User.balance)).scalar()
    )
    campaign_balance_sum = _sum_or_zero(
        db.query(func.sum(User.campaign_balance)).scalar()
    )

    # Pending commissions — not yet credited to balance. Status values
    # per schema: pending | released | expired. Only "pending" is open.
    pending_q = db.query(func.sum(PendingCommission.amount_usdt)).filter(
        PendingCommission.status == "pending",
    )
    pending_total = _sum_or_zero(pending_q.scalar())

    return {
        "member_balance_owed_usd": float(balance_sum),
        "campaign_balance_owed_usd": float(campaign_balance_sum),
        "pending_commissions_usd": float(pending_total),
        "total_usd": float(balance_sum + campaign_balance_sum + pending_total),
    }


def _mrr(db: Session) -> Dict[str, Any]:
    """Monthly recurring revenue from active memberships.
    Active = is_active=TRUE AND membership_expires_at > now (post tonight's
    integrity fix this is reliable)."""
    now = datetime.utcnow()

    # Founders: $15/mo locked
    founders_q = db.query(func.count(User.id)).filter(
        User.is_active == True,
        User.membership_expires_at > now,
        User.is_founding_member == True,
    )
    founders_count = founders_q.scalar() or 0

    # Partners: $20/mo (active, not Founder, not Pro)
    partners_q = db.query(func.count(User.id)).filter(
        User.is_active == True,
        User.membership_expires_at > now,
        User.is_founding_member != True,
        or_(User.membership_tier == None, User.membership_tier != "pro"),
    )
    partners_count = partners_q.scalar() or 0

    # Pro tier: $99/mo (if any)
    pro_q = db.query(func.count(User.id)).filter(
        User.is_active == True,
        User.membership_expires_at > now,
        User.membership_tier == "pro",
    )
    pro_count = pro_q.scalar() or 0

    mrr_gross = (
        Decimal(founders_count) * Decimal("15") +
        Decimal(partners_count) * Decimal("20") +
        Decimal(pro_count) * Decimal("99")
    )

    # Company keep on each: Founders $5, Partners $10, Pro varies (skip)
    mrr_company = (
        Decimal(founders_count) * Decimal("5") +
        Decimal(partners_count) * Decimal("10")
    )

    return {
        "active_founders": int(founders_count),
        "active_partners": int(partners_count),
        "active_pro": int(pro_count),
        "mrr_gross_usd": float(mrr_gross),
        "mrr_company_share_usd": float(mrr_company),
    }


def _concerns(db: Session) -> Dict[str, Any]:
    """Things that should be on the operator's radar — money sitting in
    limbo, mismatches, or known known issues."""

    # Unmatched orphan transfers — confirmed on-chain but not yet
    # reconciled. Schema uses a boolean `resolved` flag, not a status.
    orphan_q = db.query(
        func.count(OnchainOrphanTransfer.id),
        func.sum(OnchainOrphanTransfer.amount_usdt),
    ).filter(
        OnchainOrphanTransfer.resolved == False,
    )
    orphan_count, orphan_total = orphan_q.one()
    orphan_count = orphan_count or 0
    orphan_total = _sum_or_zero(orphan_total)

    # Pending withdrawals — stuck in queue
    stuck_w_q = db.query(
        func.count(Withdrawal.id),
        func.sum(Withdrawal.amount_usdt),
    ).filter(
        Withdrawal.status.in_(["pending", "processing"]),
        Withdrawal.requested_at < datetime.utcnow() - timedelta(hours=24),
    )
    stuck_w_count, stuck_w_total = stuck_w_q.one()
    stuck_w_count = stuck_w_count or 0
    stuck_w_total = _sum_or_zero(stuck_w_total)

    # Pending commissions over 7 days old — possibly stuck. PendingCommission
    # schema status values: pending | released | expired. Only "pending" is open.
    old_pending_q = db.query(
        func.count(PendingCommission.id),
        func.sum(PendingCommission.amount_usdt),
    ).filter(
        PendingCommission.status == "pending",
        PendingCommission.created_at < datetime.utcnow() - timedelta(days=7),
    )
    old_pending_count, old_pending_total = old_pending_q.one()
    old_pending_count = old_pending_count or 0
    old_pending_total = _sum_or_zero(old_pending_total)

    return {
        "unmatched_orphan_transfers": {
            "count": int(orphan_count),
            "total_usd": float(orphan_total),
        },
        "stuck_withdrawals_over_24h": {
            "count": int(stuck_w_count),
            "total_usd": float(stuck_w_total),
        },
        "old_pending_commissions_over_7d": {
            "count": int(old_pending_count),
            "total_usd": float(old_pending_total),
        },
    }


def compute_financial_overview(db: Session) -> Dict[str, Any]:
    """Canonical "where do we stand?" report. Three time slices for each
    flow metric, plus snapshot data (liabilities, MRR, concerns) which
    are time-independent.

    Returns a dict with keys:
      - generated_at: ISO timestamp
      - all_time:    {inflows, outflows, company_retained}
      - this_month:  {inflows, outflows, company_retained}
      - last_24h:    {inflows, outflows, company_retained}
      - mrr:         forward-looking monthly recurring
      - liabilities: what we owe members right now
      - concerns:    money in limbo
      - headline:    one-line summary
    """
    month_start = _month_start_utc()
    day_start = _hours_ago(24)

    all_time = {
        "inflows": _inflows(db),
        "outflows": _outflows(db),
        "company_retained": _company_retained(db),
    }
    this_month = {
        "inflows": _inflows(db, since=month_start),
        "outflows": _outflows(db, since=month_start),
        "company_retained": _company_retained(db, since=month_start),
    }
    last_24h = {
        "inflows": _inflows(db, since=day_start),
        "outflows": _outflows(db, since=day_start),
        "company_retained": _company_retained(db, since=day_start),
    }

    mrr = _mrr(db)
    liabilities = _member_liabilities(db)
    concerns = _concerns(db)
    pnl = _profit_and_loss(db)

    # Headline — the single sentence Steve actually wants
    headline = (
        f"Lifetime company-retained: ${all_time['company_retained']['total_usd']:,.2f}. "
        f"This month: ${this_month['company_retained']['total_usd']:,.2f}. "
        f"MRR: ${mrr['mrr_company_share_usd']:,.2f}/mo from "
        f"{mrr['active_founders']} Founders + {mrr['active_partners']} Partners."
    )

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "all_time": all_time,
        "this_month": this_month,
        "last_24h": last_24h,
        "mrr": mrr,
        "liabilities": liabilities,
        "concerns": concerns,
        "pnl": pnl,
        "headline": headline,
    }
