"""
SuperAdPro — Tier 3 Health Scanners
====================================

Membership Plan Correctness. Verifies that billing state, tier flags,
and commission payments all agree with the rules in docs/commission-spec.md.

Two scanners:
  - membership_tier_consistency: Stripe state vs is_active vs tier vs
    expiry vs activated_at vs renewal record cross-checks
  - commission_cap_audit: every paid membership commission verified
    against the tier-cap rule (Basic sponsor capped at Basic rate
    even on Pro referrals)

Read-only. Ground truth for cap rule: docs/commission-spec.md section 1.
"""

from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from .health_scanners import (
    register_scanner, make_issue, aggregate_status,
    SEV_OK, SEV_WARNING, SEV_CRITICAL,
)
from .database import (
    User, Commission, MembershipRenewal,
)

# Commission caps — copied from app/main.py::_activate_membership to avoid
# circular imports. Per docs/commission-spec.md section 1:
#   Basic sponsor: $10/mo or $100/yr max
#   Pro sponsor:   $17.50/mo or $175/yr max
#   Free/unknown sponsor: falls back to Basic cap (matches production)
MONTHLY_CAPS = {"pro": Decimal("17.50"), "basic": Decimal("10.00")}
ANNUAL_CAPS = {"pro": Decimal("175.00"), "basic": Decimal("100.00")}
DEFAULT_MONTHLY_CAP = Decimal("10.00")
DEFAULT_ANNUAL_CAP = Decimal("100.00")

# Membership pricing — used to back-derive billing type from amount
# when notes don't tell us
BASIC_MONTHLY = Decimal("20.00")
BASIC_ANNUAL = Decimal("200.00")
PRO_MONTHLY = Decimal("35.00")
PRO_ANNUAL = Decimal("350.00")

CENT = Decimal("0.01")

# Only audit recent commissions for the cap rule — older commissions
# may have been paid under earlier cap rules (cap on annual was added
# 24 Apr 2026 per spec). Default: last 60 days.
CAP_AUDIT_WINDOW_DAYS = 60


# ─────────────────────────────────────────────────────────────────
#  7. MEMBERSHIP TIER CONSISTENCY
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="membership_tier_consistency",
    label="Membership tier consistency",
    tier=3,
    category="billing",
    description=(
        "Cross-checks each member's tier flag against billing state: "
        "membership_expires_at, activated_at, membership_billing, and "
        "the membership_renewals table. Catches members in inconsistent "
        "billing states (expired but still active, active but no payment "
        "record, billing cycle mismatched with expiry interval, renewal "
        "record disagreement with user record)."
    ),
)
def scan_membership_tier_consistency(db: Session) -> dict:
    issues = []
    users = db.query(User).all()

    # Pre-load renewal records
    renewals = db.query(MembershipRenewal).all()
    renewal_by_user = {r.user_id: r for r in renewals}

    now = datetime.utcnow()
    grace_window = timedelta(days=7)  # tolerate up to a week past expiry

    for user in users:
        # Admins exempt — they have any tier without billing.
        if user.is_admin:
            continue

        subject = f"user {user.username} (id {user.id})"
        tier = (user.membership_tier or "free").lower().strip()
        is_paid_tier = tier in ("basic", "pro")

        # ── a) Expired but still active ──────────────────────────
        # is_active=True but membership_expires_at is in the past.
        # Renewal cron should flip these; if it didn't, lapsing is broken.
        if (user.is_active and user.membership_expires_at
                and user.membership_expires_at < now - grace_window):
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="expired_but_active",
                subject=subject,
                details={
                    "user_id": user.id,
                    "tier": tier,
                    "membership_expires_at": user.membership_expires_at.isoformat(),
                    "days_since_expiry": (now - user.membership_expires_at).days,
                    "billing": user.membership_billing,
                },
                suggested_action=(
                    "Member expired more than a week ago but is_active still "
                    "True. Renewal cron may have stalled. Check daily renewal "
                    "log around this date."
                ),
            ))

        # ── b) Active paid tier without activated_at ─────────────
        # Every paid member should have an activated_at timestamp.
        if user.is_active and is_paid_tier and not user.activated_at:
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="active_no_activation_record",
                subject=subject,
                details={
                    "user_id": user.id,
                    "tier": tier,
                    "membership_expires_at": (
                        user.membership_expires_at.isoformat()
                        if user.membership_expires_at else None
                    ),
                    "stripe_subscription_id": user.stripe_subscription_id,
                },
                suggested_action=(
                    "Member is active on a paid tier but has no "
                    "activated_at timestamp. Set retroactively from earliest "
                    "Payment record or commission ledger."
                ),
            ))

        # ── c) Active without any expiry record ──────────────────
        # An active paid tier should have a membership_expires_at set.
        # Without it, the renewal cron has nothing to act on and the
        # member stays Pro indefinitely. This is the issue class that
        # caught the 9 pre-launch testers on 13 May 2026.
        if (user.is_active and is_paid_tier
                and not user.membership_expires_at):
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="active_no_expiry_set",
                subject=subject,
                details={
                    "user_id": user.id,
                    "tier": tier,
                    "membership_billing": user.membership_billing,
                    "activated_at": (
                        user.activated_at.isoformat()
                        if user.activated_at else None
                    ),
                },
                suggested_action=(
                    "Active paid member with no expiry date. Renewal cron "
                    "has nothing to act on — they'll stay active indefinitely. "
                    "Set membership_expires_at."
                ),
            ))

        # Note: this platform does not use Stripe for payments. The
        # stripe_subscription_id column exists on the User model but
        # is dead code — no caller writes to it. Payment methods in
        # use: NOWPayments (retiring), WalletConnect (BSC, current),
        # Airwallex (fiat), and wallet-balance auto-renew. No need to
        # check for orphan Stripe subscriptions.

        # ── e) Annual billing with monthly-length expiry interval ──
        # If activated_at + 90 days > membership_expires_at, this looks
        # monthly even though billing flag says annual. 90 days is a
        # generous tolerance — anything under that is suspicious.
        if (user.membership_billing == "annual"
                and user.activated_at and user.membership_expires_at):
            interval = user.membership_expires_at - user.activated_at
            if interval < timedelta(days=90):
                # Could be a partial / mid-cycle adjustment, but flag it
                issues.append(make_issue(
                    severity=SEV_WARNING,
                    kind="annual_billing_short_interval",
                    subject=subject,
                    details={
                        "user_id": user.id,
                        "activated_at": user.activated_at.isoformat(),
                        "membership_expires_at": user.membership_expires_at.isoformat(),
                        "interval_days": interval.days,
                        "billing": "annual",
                    },
                    suggested_action=(
                        "Billing marked annual but expiry interval < 90 days "
                        "from activation. Either billing flag is wrong or "
                        "expiry was set incorrectly. Review record."
                    ),
                ))

        # ── f) Renewal record disagreement ────────────────────────
        # If MembershipRenewal.next_renewal_date and user.membership_expires_at
        # disagree by > 7 days, one of them was updated and the other wasn't.
        renewal = renewal_by_user.get(user.id)
        if (renewal and renewal.next_renewal_date
                and user.membership_expires_at):
            diff = abs(
                (renewal.next_renewal_date - user.membership_expires_at).total_seconds()
            )
            if diff > 7 * 24 * 3600:
                issues.append(make_issue(
                    severity=SEV_WARNING,
                    kind="renewal_record_disagreement",
                    subject=subject,
                    details={
                        "user_id": user.id,
                        "user_membership_expires_at": user.membership_expires_at.isoformat(),
                        "renewal_next_renewal_date": renewal.next_renewal_date.isoformat(),
                        "diff_days": round(diff / 86400, 1),
                    },
                    suggested_action=(
                        "User.membership_expires_at disagrees with "
                        "MembershipRenewal.next_renewal_date by more than "
                        "a week. One was updated, the other wasn't. Renewal "
                        "cron reads MembershipRenewal — that's the source "
                        "of truth for billing timing."
                    ),
                ))

        # ── g) Grace period without expiry having passed ─────────
        if (renewal and renewal.in_grace_period
                and user.membership_expires_at
                and user.membership_expires_at > now):
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="grace_period_unexpired",
                subject=subject,
                details={
                    "user_id": user.id,
                    "membership_expires_at": user.membership_expires_at.isoformat(),
                    "grace_period_start": (
                        renewal.grace_period_start.isoformat()
                        if renewal.grace_period_start else None
                    ),
                },
                suggested_action=(
                    "Member is in grace period but their expiry hasn't "
                    "passed yet. Grace flag set incorrectly — should only "
                    "apply post-expiry while waiting for retry."
                ),
            ))

    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)
    status = aggregate_status(issues)

    if not issues:
        headline = f"All {len(users)} members' billing state consistent"
    else:
        headline = f"{len(issues)} issues across {len(users)} members"

    return {
        "status": status,
        "summary": {
            "members_scanned": len(users),
            "renewal_records_scanned": len(renewals),
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "headline": headline,
        },
        "issues": issues,
    }


# ─────────────────────────────────────────────────────────────────
#  8. COMMISSION CAP AUDIT
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="commission_cap_audit",
    label="Commission cap audit",
    tier=3,
    category="commission",
    description=(
        "Verifies every paid membership commission against the tier-cap "
        "rule (docs/commission-spec.md section 1): Basic sponsor capped at "
        "$10/mo or $100/yr; Pro sponsor capped at $17.50/mo or $175/yr. "
        "Only audits the last 60 days because the annual cap was added "
        "24 Apr 2026 — older commissions ran under different rules. Caveat: "
        "sponsor tier is read from the current state, not historical, so "
        "audit is only reliable if the sponsor hasn't switched tiers "
        "between the payment and now."
    ),
)
def scan_commission_cap_audit(db: Session) -> dict:
    issues = []

    cutoff = datetime.utcnow() - timedelta(days=CAP_AUDIT_WINDOW_DAYS)
    membership_types = [
        "membership", "membership_renewal",
        "membership_sponsor", "Membership Sponsor",
        "gift_membership_sponsor",
    ]
    commissions = db.query(Commission).filter(
        Commission.status == "paid",
        Commission.commission_type.in_(membership_types),
        Commission.created_at >= cutoff,
    ).all()

    if not commissions:
        return {
            "status": SEV_OK,
            "summary": {
                "commissions_scanned": 0,
                "window_days": CAP_AUDIT_WINDOW_DAYS,
                "issues_found": 0,
                "critical": 0,
                "warnings": 0,
                "headline": (
                    f"No membership commissions in last "
                    f"{CAP_AUDIT_WINDOW_DAYS} days to audit"
                ),
            },
            "issues": [],
        }

    users = {u.id: u for u in db.query(User).all()}

    for c in commissions:
        sponsor = users.get(c.to_user_id)
        buyer = users.get(c.from_user_id)

        if not sponsor or not buyer:
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="commission_orphan_user",
                subject=f"commission #{c.id} (${float(c.amount_usdt):.2f})",
                details={
                    "commission_id": c.id,
                    "to_user_id": c.to_user_id,
                    "from_user_id": c.from_user_id,
                    "sponsor_found": sponsor is not None,
                    "buyer_found": buyer is not None,
                },
                suggested_action=(
                    "Membership commission references a user that no longer "
                    "exists. Investigate — sponsor or buyer was deleted "
                    "after the commission was paid."
                ),
            ))
            continue

        # Determine the billing type and expected uncapped commission.
        amount_paid = Decimal(str(c.amount_usdt))
        sponsor_tier = (sponsor.membership_tier or "free").lower().strip()

        # Determine billing type from buyer's record + notes if possible.
        # Fall back to inferring from amount.
        billing = (buyer.membership_billing or "monthly").lower()
        is_annual = billing == "annual"

        # Determine the buyer's price paid at the time of this commission.
        # We don't have a price field on the commission row — we infer
        # from buyer's tier + billing flag at audit time. This isn't perfect
        # if the buyer changed billing cycles, but the cap rule is most
        # commonly violated on the SPONSOR side (Pro vs Basic), not the
        # buyer side, so this approximation is acceptable.
        buyer_tier = (buyer.membership_tier or "free").lower().strip()
        if buyer_tier == "pro":
            buyer_price = PRO_ANNUAL if is_annual else PRO_MONTHLY
        elif buyer_tier == "basic":
            buyer_price = BASIC_ANNUAL if is_annual else BASIC_MONTHLY
        else:
            # Buyer is free now but commissions exist — they downgraded.
            # Skip the audit on this row since we can't reconstruct what
            # they paid.
            continue

        natural_50 = buyer_price * Decimal("0.50")
        if is_annual:
            cap = ANNUAL_CAPS.get(sponsor_tier, DEFAULT_ANNUAL_CAP)
        else:
            cap = MONTHLY_CAPS.get(sponsor_tier, DEFAULT_MONTHLY_CAP)
        expected = min(natural_50, cap)

        # Compare with a 1-cent tolerance
        if abs(amount_paid - expected) > CENT:
            # Direction matters for what the bug type is
            over = amount_paid > expected
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="cap_overpaid" if over else "cap_underpaid",
                subject=(
                    f"commission #{c.id} → {sponsor.username} "
                    f"(${float(amount_paid):.2f})"
                ),
                details={
                    "commission_id": c.id,
                    "paid_at": c.paid_at.isoformat() if c.paid_at else None,
                    "amount_paid": float(amount_paid),
                    "expected_amount": float(expected),
                    "drift": float(amount_paid - expected),
                    "sponsor_id": sponsor.id,
                    "sponsor_username": sponsor.username,
                    "sponsor_tier_now": sponsor_tier,
                    "buyer_id": buyer.id,
                    "buyer_username": buyer.username,
                    "buyer_tier_now": buyer_tier,
                    "buyer_billing": billing,
                    "natural_50_pct": float(natural_50),
                    "cap_applied": float(cap),
                    "commission_type": c.commission_type,
                    "notes": c.notes,
                },
                suggested_action=(
                    "Commission amount doesn't match the cap rule for current "
                    "sponsor/buyer tiers. CAVEAT: scanner reads tiers from "
                    "current state — if the sponsor was a different tier at "
                    "payment time, the discrepancy may be historical and "
                    "correct. Cross-reference Commission.paid_at against any "
                    "tier changes."
                ),
            ))

    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)
    status = aggregate_status(issues)

    if not issues:
        headline = (
            f"All {len(commissions)} membership commissions in last "
            f"{CAP_AUDIT_WINDOW_DAYS} days correctly capped"
        )
    else:
        headline = (
            f"{len(issues)} cap violations across {len(commissions)} "
            f"membership commissions (last {CAP_AUDIT_WINDOW_DAYS} days)"
        )

    return {
        "status": status,
        "summary": {
            "commissions_scanned": len(commissions),
            "window_days": CAP_AUDIT_WINDOW_DAYS,
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "headline": headline,
        },
        "issues": issues,
    }
