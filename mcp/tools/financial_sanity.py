"""
financial_sanity — does the day's money balance?

Sums inflows (confirmed payments), outflows (commissions paid to members),
and expected platform retention. Flags if numbers don't reconcile.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from ._commission_buckets import GRID_TYPES, MEMBERSHIP_TYPES, ADMIN_TYPES
from .registry import register_tool


@register_tool(
    name="financial_sanity",
    description=(
        "End-to-end financial reconciliation for the day. Inflows (confirmed "
        "crypto payments) vs outflows (commissions paid + withdrawals processed). "
        "Flags if the books don't balance within expected tolerances."
    ),
    category="financial",
    input_schema={
        "type": "object",
        "properties": {
            "hours": {"type": "integer", "default": 24},
        },
    },
)
def financial_sanity(db, hours: int = 24):
    hours = min(int(hours or 24), 168)
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=hours)

    # ── INFLOWS ──
    # Confirmed crypto payments by product type
    crypto_in = db.execute(text("""
        SELECT product_type, COUNT(*) as cnt, COALESCE(SUM(base_amount), 0) as total
        FROM crypto_payment_orders
        WHERE status = 'confirmed' AND confirmed_at >= :t
        GROUP BY product_type
    """), {"t": since}).fetchall()

    inflows_by_product = {
        r.product_type: {"count": r.cnt, "total_usd": float(r.total or 0)}
        for r in crypto_in
    }
    total_crypto_in = sum(v["total_usd"] for v in inflows_by_product.values())

    # NOWPayments inflows (if table exists)
    np_in = 0.0
    np_count = 0
    try:
        np_row = db.execute(text("""
            SELECT COUNT(*), COALESCE(SUM(price_usd), 0)
            FROM nowpayments_orders
            WHERE status IN ('finished', 'confirmed')
              AND created_at >= :t
        """), {"t": since}).fetchone()
        if np_row:
            np_count = np_row[0]
            np_in = float(np_row[1] or 0)
    except Exception:
        pass

    # WalletConnect/BSC inflows — self-custody payments signed directly by the
    # member from their own wallet. Lives in walletconnect_payment_orders since
    # 7 May 2026 when the BSC rail launched parallel to NOWPayments.
    # `base_amount` is the sticker price (matches the convention used for
    # crypto_payment_orders above); `unique_amount` is the cent-offset version
    # the user actually sends (a few cents less). Using base_amount keeps this
    # report a "product revenue" view consistent with the legacy crypto rail.
    wc_in = 0.0
    wc_count = 0
    wc_by_product: dict[str, dict] = {}
    try:
        wc_rows = db.execute(text("""
            SELECT product_type, COUNT(*) as cnt, COALESCE(SUM(base_amount), 0) as total
            FROM walletconnect_payment_orders
            WHERE status = 'confirmed' AND confirmed_at >= :t
            GROUP BY product_type
        """), {"t": since}).fetchall()
        for r in wc_rows:
            wc_by_product[r.product_type] = {"count": r.cnt, "total_usd": float(r.total or 0)}
            wc_count += r.cnt
            wc_in += float(r.total or 0)
    except Exception:
        pass

    # Stripe inflows — card payments via Stripe Checkout / saved-card (Link).
    # Lives in stripe_charges table (NOT the legacy payments table — Stripe has
    # its own dedicated source-of-truth table since the rail was reinstated
    # 23 May 2026). Filter kind='charge' to exclude refunds/chargebacks (which
    # are stored as negative amount_cents rows). Group by product so we can
    # break down membership_signup vs membership_renewal vs campaign_tier vs
    # nexus_pack — same shape as walletconnect_by_product.
    #
    # Added 28 May 2026 — this monitor previously had a Stripe blind spot that
    # fired a daily false "commissions_exceed_inflows" critical warning every
    # day, because real Stripe revenue (~$240-320/day from memberships) was
    # invisible. Closing the blind spot here makes the warning a real signal
    # again instead of noise.
    stripe_in = 0.0
    stripe_count = 0
    stripe_by_product: dict[str, dict] = {}
    try:
        stripe_rows = db.execute(text("""
            SELECT product, COUNT(*) as cnt,
                   COALESCE(SUM(amount_cents), 0) as total_cents
            FROM stripe_charges
            WHERE kind = 'charge'
              AND created_at >= :t
            GROUP BY product
        """), {"t": since}).fetchall()
        for r in stripe_rows:
            usd = float(r.total_cents or 0) / 100.0
            stripe_by_product[r.product or "unknown"] = {
                "count": r.cnt, "total_usd": round(usd, 2),
            }
            stripe_count += r.cnt
            stripe_in += usd
    except Exception:
        pass

    # Orphan transfers — money at the treasury that DID arrive but couldn't be
    # auto-matched to a pending order. Surfaced separately (not summed into the
    # main inflow total) because it represents unallocated funds awaiting manual
    # reconciliation rather than confirmed product revenue.
    orphan_unresolved_usd = 0.0
    orphan_unresolved_count = 0
    try:
        orphan_row = db.execute(text("""
            SELECT COUNT(*), COALESCE(SUM(amount_usdt), 0)
            FROM onchain_orphan_transfers
            WHERE resolved = false AND seen_at >= :t
        """), {"t": since}).fetchone()
        if orphan_row:
            orphan_unresolved_count = orphan_row[0]
            orphan_unresolved_usd = float(orphan_row[1] or 0)
    except Exception:
        pass

    # ── OUTFLOWS: commissions paid ──
    course_comms_out = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0)
        FROM course_commissions
        WHERE created_at >= :t AND earner_id IS NOT NULL
    """), {"t": since}).scalar() or 0

    # `commissions` table is multi-purpose. Bucket sums by commission_type so
    # the financial reconciliation report doesn't conflate Profit Grid payouts
    # with membership recurring revenue with manual admin adjustments.
    commissions_rows = db.execute(text("""
        SELECT commission_type,
               COALESCE(SUM(amount_usdt), 0) as total,
               COALESCE(SUM(CASE WHEN to_user_id IS NULL THEN amount_usdt ELSE 0 END), 0) as to_company
        FROM commissions
        WHERE created_at >= :t
        GROUP BY commission_type
    """), {"t": since}).fetchall()

    grid_comms_out = 0.0
    membership_comms_out = 0.0
    admin_comms_out = 0.0
    other_comms_out = 0.0
    company_retained_grid = 0.0
    company_retained_membership = 0.0
    for r in commissions_rows:
        ct = r.commission_type
        total = float(r.total or 0)
        to_co = float(r.to_company or 0)
        if ct in GRID_TYPES:
            grid_comms_out += total
            company_retained_grid += to_co
        elif ct in MEMBERSHIP_TYPES:
            membership_comms_out += total
            company_retained_membership += to_co
        elif ct in ADMIN_TYPES:
            admin_comms_out += total
        else:
            other_comms_out += total

    matrix_comms_out = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0)
        FROM credit_matrix_commissions
        WHERE created_at >= :t
    """), {"t": since}).scalar() or 0

    total_commissions_out = (
        float(course_comms_out)
        + float(grid_comms_out)
        + float(membership_comms_out)
        + float(matrix_comms_out)
        + float(admin_comms_out)
        + float(other_comms_out)
    )

    # ── OUTFLOWS: withdrawals processed ──
    withdrawals_paid = db.execute(text("""
        SELECT COUNT(*), COALESCE(SUM(amount_usdt), 0)
        FROM withdrawals
        WHERE status IN ('paid', 'processed') AND processed_at >= :t
    """), {"t": since}).fetchone()
    wd_count = withdrawals_paid[0] if withdrawals_paid else 0
    wd_total = float(withdrawals_paid[1] or 0) if withdrawals_paid else 0

    # ── Commissions paid to COMPANY (platform retention) ──
    # company_retained_grid + company_retained_membership already computed
    # above per-bucket from the commissions table. Only course remains.
    company_retained_course = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0)
        FROM course_commissions
        WHERE created_at >= :t AND commission_type = 'platform'
    """), {"t": since}).scalar() or 0

    # ── Balance check ──
    # Inflows should ~ commissions + platform retention + AI costs (not tracked here)
    # For a rough check: commissions paid shouldn't exceed inflows (that would mean
    # we're paying out money we didn't collect).
    total_in = total_crypto_in + np_in + wc_in + stripe_in
    total_platform_retained = (
        float(company_retained_grid)
        + float(company_retained_membership)
        + float(company_retained_course)
    )
    net_to_members = total_commissions_out - total_platform_retained

    warnings: list[dict] = []

    # Commissions vs inflows.
    #
    # A naive same-window compare is misleading: a commission created today —
    # especially a Profit Grid completion bonus — is funded by tier sales that
    # happened on EARLIER days. Comparing today's payouts against today's
    # inflows therefore over-fires on any slow sales day even when the platform
    # is fully solvent (the payout was funded by last week's revenue). This
    # produced a daily false "critical" that trained the eye to ignore it.
    #
    # Fix (1 Jun 2026): the timing skew only washes out over a multi-day
    # window. So:
    #   - On a SHORT window (< 72h) an overage is expected timing noise →
    #     report it as informational, not critical. It is NOT a money leak.
    #   - On a multi-day window (>= 72h) the funded-on-an-earlier-day effect
    #     has largely averaged out, so a persistent overage is a real signal →
    #     critical. A small tolerance band absorbs rounding / boundary effects.
    if net_to_members > total_in and total_in > 0:
        overage = net_to_members - total_in
        # Tolerance: ignore trivial overages (rounding, one commission landing
        # a second after a window edge). 5% of inflows or $25, whichever larger.
        tolerance = max(total_in * 0.05, 25.0)
        is_multiday = hours >= 72

        if is_multiday and overage > tolerance:
            warnings.append({
                "type": "commissions_exceed_inflows",
                "severity": "critical",
                "window_hours": hours,
                "total_in_usd": round(total_in, 2),
                "net_to_members_usd": round(net_to_members, 2),
                "overage_usd": round(overage, 2),
                "description": (
                    f"Over a {hours}h window, member commissions exceed inflows by "
                    f"${round(overage, 2)} beyond tolerance — the timing skew should "
                    f"have averaged out over this long a window, so investigate "
                    f"(commission bug, mispriced payout, or genuine reserve drawdown)."
                ),
            })
        else:
            # Short-window overage, or within tolerance → informational note.
            warnings.append({
                "type": "commissions_exceed_inflows_timing",
                "severity": "info",
                "window_hours": hours,
                "total_in_usd": round(total_in, 2),
                "net_to_members_usd": round(net_to_members, 2),
                "overage_usd": round(overage, 2),
                "description": (
                    "Member commissions exceed inflows for this short window. This "
                    "is normal timing skew — commissions (esp. Grid completion "
                    "bonuses) are funded by sales on earlier days. Not a leak. "
                    "Re-check with hours>=72 to confirm the multi-day picture is "
                    "balanced."
                ),
            })

    # Warning: withdrawals > recent platform reserves (rough — doesn't account for accumulated reserves)
    # Leave this as info, not a warning, since platform may have float from earlier periods.

    # overall_status only escalates on real warning/critical severities — an
    # info-level timing note (expected short-window skew) keeps it "healthy".
    has_real_warning = any(w.get("severity") in ("warning", "critical") for w in warnings)

    return {
        "window_hours": hours,
        "since": since.isoformat(),
        "overall_status": "warnings" if has_real_warning else "healthy",
        "inflows": {
            "by_product": inflows_by_product,
            "crypto_total_usd": round(total_crypto_in, 2),
            "nowpayments_count": np_count,
            "nowpayments_total_usd": round(np_in, 2),
            "walletconnect_count": wc_count,
            "walletconnect_total_usd": round(wc_in, 2),
            "walletconnect_by_product": wc_by_product,
            "stripe_count": stripe_count,
            "stripe_total_usd": round(stripe_in, 2),
            "stripe_by_product": stripe_by_product,
            "orphan_transfers_unresolved_count": orphan_unresolved_count,
            "orphan_transfers_unresolved_usd": round(orphan_unresolved_usd, 2),
            "total_usd": round(total_in, 2),
        },
        "outflows": {
            "commissions": {
                "course_academy_usd": round(float(course_comms_out), 2),
                "profit_grid_usd": round(grid_comms_out, 2),
                "membership_usd": round(membership_comms_out, 2),
                "profit_nexus_usd": round(float(matrix_comms_out), 2),
                "admin_adjustments_usd": round(admin_comms_out, 2),
                "other_usd": round(other_comms_out, 2),
                "total_usd": round(total_commissions_out, 2),
                "to_members_net_usd": round(net_to_members, 2),
                "platform_retained_usd": round(total_platform_retained, 2),
                "platform_retained_breakdown": {
                    "profit_grid_usd": round(company_retained_grid, 2),
                    "membership_usd": round(company_retained_membership, 2),
                    "course_academy_usd": round(float(company_retained_course), 2),
                },
            },
            "withdrawals": {
                "count": wd_count,
                "total_usd": round(wd_total, 2),
            },
        },
        "warnings": warnings,
    }
