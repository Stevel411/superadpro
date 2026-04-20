"""
payment_integrity — are payments flowing correctly?

Checks for payments that look stuck, lost, or orphaned across both payment rails
(direct USDT via crypto_payment_orders + NOWPayments via nowpayments_orders).
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="payment_integrity",
    description=(
        "Checks payment flows for stuck transactions, expired-but-not-cleared orders, "
        "and payments that confirmed on-chain but didn't credit the user. Critical "
        "for catching payment processor issues before members complain."
    ),
    category="financial",
    input_schema={"type": "object", "properties": {}},
)
def payment_integrity(db):
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)
    one_day_ago = now - timedelta(hours=24)

    issues: list[dict] = []

    # 1. Crypto orders pending >30min but not yet expired — may be stuck
    stuck_crypto = db.execute(text("""
        SELECT COUNT(*), COALESCE(SUM(base_amount), 0) as total
        FROM crypto_payment_orders
        WHERE status = 'pending'
          AND created_at < :threshold
          AND expires_at > NOW()
    """), {"threshold": now - timedelta(minutes=30)}).fetchone()
    if stuck_crypto and stuck_crypto[0] > 0:
        issues.append({
            "type": "stuck_crypto_orders",
            "severity": "medium" if stuck_crypto[0] < 20 else "high",
            "count": stuck_crypto[0],
            "total_usd_pending": float(stuck_crypto[1] or 0),
            "description": "Crypto orders pending >30 min but not yet expired",
        })

    # 2. Confirmed crypto orders in last 24h where product wasn't activated
    # (indicator: status='confirmed' but user has no corresponding purchase/grid/etc.)
    # This is a proxy check — if there are confirmed orders with product_type='course'
    # but no course_purchase in the last day, that suggests webhook/activation failure
    orphan_crypto_courses = db.execute(text("""
        SELECT COUNT(*)
        FROM crypto_payment_orders cpo
        WHERE cpo.status = 'confirmed'
          AND cpo.confirmed_at >= :t
          AND cpo.product_type = 'course'
          AND NOT EXISTS (
            SELECT 1 FROM course_purchases cp
            WHERE cp.user_id = cpo.user_id
              AND cp.created_at BETWEEN cpo.confirmed_at - INTERVAL '10 minutes'
                                     AND cpo.confirmed_at + INTERVAL '10 minutes'
          )
    """), {"t": one_day_ago}).scalar() or 0
    if orphan_crypto_courses > 0:
        issues.append({
            "type": "orphan_confirmed_course_payments",
            "severity": "critical",
            "count": orphan_crypto_courses,
            "description": "Crypto payment confirmed but no course purchase created — activation failed",
        })

    # 3. NOWPayments orders stuck (if table exists)
    stuck_np = 0
    try:
        stuck_np = db.execute(text("""
            SELECT COUNT(*)
            FROM nowpayments_orders
            WHERE status IN ('pending', 'waiting', 'confirming')
              AND created_at < :threshold
        """), {"threshold": now - timedelta(hours=2)}).scalar() or 0
    except Exception:
        pass

    if stuck_np > 0:
        issues.append({
            "type": "stuck_nowpayments_orders",
            "severity": "medium" if stuck_np < 10 else "high",
            "count": stuck_np,
            "description": "NOWPayments orders in waiting/confirming state >2 hours",
        })

    # 4. Withdrawals stuck >48 hours (beyond normal processing)
    stuck_wd = db.execute(text("""
        SELECT COUNT(*), COALESCE(SUM(amount_usdt), 0)
        FROM withdrawals
        WHERE status = 'pending' AND requested_at < :t
    """), {"t": now - timedelta(hours=48)}).fetchone()
    if stuck_wd and stuck_wd[0] > 0:
        issues.append({
            "type": "stuck_withdrawals",
            "severity": "high",
            "count": stuck_wd[0],
            "total_usd_pending": float(stuck_wd[1] or 0),
            "description": "Withdrawals pending >48 hours",
        })

    # ── Throughput (should be non-zero during active hours) ──
    confirmed_last_hour = db.execute(text("""
        SELECT COUNT(*) FROM crypto_payment_orders
        WHERE status = 'confirmed' AND confirmed_at >= :t
    """), {"t": one_hour_ago}).scalar() or 0

    confirmed_today = db.execute(text("""
        SELECT COUNT(*), COALESCE(SUM(base_amount), 0)
        FROM crypto_payment_orders
        WHERE status = 'confirmed' AND confirmed_at >= :t
    """), {"t": one_day_ago}).fetchone()

    return {
        "timestamp": now.isoformat(),
        "overall_status": "healthy" if not issues else ("critical" if any(i["severity"] == "critical" for i in issues) else "degraded"),
        "issues": issues,
        "throughput": {
            "confirmed_crypto_last_hour": confirmed_last_hour,
            "confirmed_crypto_today_count": confirmed_today[0] if confirmed_today else 0,
            "confirmed_crypto_today_usd": float(confirmed_today[1] or 0) if confirmed_today else 0,
        },
    }
