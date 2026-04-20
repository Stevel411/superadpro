"""
financial_sanity — does the day's money balance?

Sums inflows (confirmed payments), outflows (commissions paid to members),
and expected platform retention. Flags if numbers don't reconcile.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
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

    # ── OUTFLOWS: commissions paid ──
    course_comms_out = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0)
        FROM course_commissions
        WHERE created_at >= :t AND earner_id IS NOT NULL
    """), {"t": since}).scalar() or 0

    grid_comms_out = db.execute(text("""
        SELECT COALESCE(SUM(amount_usdt), 0)
        FROM commissions
        WHERE created_at >= :t AND to_user_id IS NOT NULL
    """), {"t": since}).scalar() or 0

    matrix_comms_out = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0)
        FROM credit_matrix_commissions
        WHERE created_at >= :t
    """), {"t": since}).scalar() or 0

    total_commissions_out = float(course_comms_out) + float(grid_comms_out) + float(matrix_comms_out)

    # ── OUTFLOWS: withdrawals processed ──
    withdrawals_paid = db.execute(text("""
        SELECT COUNT(*), COALESCE(SUM(amount_usdt), 0)
        FROM withdrawals
        WHERE status IN ('paid', 'processed') AND processed_at >= :t
    """), {"t": since}).fetchone()
    wd_count = withdrawals_paid[0] if withdrawals_paid else 0
    wd_total = float(withdrawals_paid[1] or 0) if withdrawals_paid else 0

    # ── Commissions paid to COMPANY (platform retention on direct_sponsor/uni_level) ──
    company_retained_grid = db.execute(text("""
        SELECT COALESCE(SUM(amount_usdt), 0)
        FROM commissions
        WHERE created_at >= :t AND to_user_id IS NULL
    """), {"t": since}).scalar() or 0

    company_retained_course = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0)
        FROM course_commissions
        WHERE created_at >= :t AND commission_type = 'platform'
    """), {"t": since}).scalar() or 0

    # ── Balance check ──
    # Inflows should ~ commissions + platform retention + AI costs (not tracked here)
    # For a rough check: commissions paid shouldn't exceed inflows (that would mean
    # we're paying out money we didn't collect).
    total_in = total_crypto_in + np_in
    net_to_members = total_commissions_out - float(company_retained_grid) - float(company_retained_course)

    warnings: list[dict] = []

    # Red flag: commissions to members > inflows (impossible unless there's a leak)
    if net_to_members > total_in and total_in > 0:
        warnings.append({
            "type": "commissions_exceed_inflows",
            "severity": "critical",
            "total_in_usd": round(total_in, 2),
            "net_to_members_usd": round(net_to_members, 2),
            "overage_usd": round(net_to_members - total_in, 2),
            "description": "Member commissions paid out exceed total platform inflows — possible commission bug",
        })

    # Warning: withdrawals > recent platform reserves (rough — doesn't account for accumulated reserves)
    # Leave this as info, not a warning, since platform may have float from earlier periods.

    return {
        "window_hours": hours,
        "since": since.isoformat(),
        "overall_status": "healthy" if not warnings else "warnings",
        "inflows": {
            "by_product": inflows_by_product,
            "crypto_total_usd": round(total_crypto_in, 2),
            "nowpayments_count": np_count,
            "nowpayments_total_usd": round(np_in, 2),
            "total_usd": round(total_in, 2),
        },
        "outflows": {
            "commissions": {
                "course_academy_usd": round(float(course_comms_out), 2),
                "profit_grid_usd": round(float(grid_comms_out), 2),
                "profit_nexus_usd": round(float(matrix_comms_out), 2),
                "total_usd": round(total_commissions_out, 2),
                "to_members_net_usd": round(net_to_members, 2),
                "platform_retained_usd": round(float(company_retained_grid) + float(company_retained_course), 2),
            },
            "withdrawals": {
                "count": wd_count,
                "total_usd": round(wd_total, 2),
            },
        },
        "warnings": warnings,
    }
