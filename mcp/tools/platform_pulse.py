"""
platform_pulse — 30-second platform health snapshot.

This is the FIRST tool Claude calls when asked "how are things?" — it gives an
overall traffic-light status plus the headline numbers.

Returns:
  status: healthy | degraded | critical
  active_users_now, signups_last_hour, purchases_today, errors_last_hour
  red_flags: any immediate concerns
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="platform_pulse",
    description=(
        "30-second platform health snapshot. Traffic-light status plus headline "
        "metrics: active users, signups last hour, purchases today, red flags. "
        "This is the first tool to call when asked 'how's the platform doing'."
    ),
    category="performance",
    input_schema={"type": "object", "properties": {}},
)
def platform_pulse(db):
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)
    one_day_ago = now - timedelta(hours=24)

    # Total users
    total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0

    # Active signups in last hour
    signups_1h = db.execute(text(
        "SELECT COUNT(*) FROM users WHERE created_at >= :t"
    ), {"t": one_hour_ago}).scalar() or 0

    signups_24h = db.execute(text(
        "SELECT COUNT(*) FROM users WHERE created_at >= :t"
    ), {"t": one_day_ago}).scalar() or 0

    # Active users — users who've done something in last hour (signup, commission, purchase)
    active_1h = db.execute(text("""
        SELECT COUNT(DISTINCT user_id) FROM (
          SELECT user_id FROM course_purchases WHERE created_at >= :t
          UNION
          SELECT user_id FROM credit_pack_purchases WHERE created_at >= :t
          UNION
          SELECT id AS user_id FROM users WHERE created_at >= :t
        ) AS recent
    """), {"t": one_hour_ago}).scalar() or 0

    # Purchases today
    course_today = db.execute(text(
        "SELECT COUNT(*) FROM course_purchases WHERE created_at >= :t"
    ), {"t": one_day_ago}).scalar() or 0

    pack_today = db.execute(text(
        "SELECT COUNT(*) FROM credit_pack_purchases WHERE created_at >= :t"
    ), {"t": one_day_ago}).scalar() or 0

    # Commissions fired today (all three systems)
    course_comms_today = db.execute(text(
        "SELECT COUNT(*) FROM course_commissions WHERE created_at >= :t"
    ), {"t": one_day_ago}).scalar() or 0

    grid_comms_today = db.execute(text(
        "SELECT COUNT(*) FROM commissions WHERE created_at >= :t"
    ), {"t": one_day_ago}).scalar() or 0

    matrix_comms_today = db.execute(text(
        "SELECT COUNT(*) FROM credit_matrix_commissions WHERE created_at >= :t"
    ), {"t": one_day_ago}).scalar() or 0

    # ── Red flag detection ──
    red_flags: list[dict] = []

    # Stuck crypto payments (>30 min pending)
    stuck_crypto = db.execute(text("""
        SELECT COUNT(*) FROM crypto_payment_orders
        WHERE status = 'pending'
          AND created_at < :threshold
          AND expires_at > NOW()
    """), {"threshold": now - timedelta(minutes=30)}).scalar() or 0
    if stuck_crypto > 5:
        red_flags.append({
            "type": "stuck_crypto_payments",
            "severity": "medium" if stuck_crypto < 20 else "high",
            "count": stuck_crypto,
            "note": f"{stuck_crypto} crypto payments pending >30 min",
        })

    # Pending withdrawals >24hr
    old_withdrawals = db.execute(text("""
        SELECT COUNT(*) FROM withdrawals
        WHERE status = 'pending' AND requested_at < :t
    """), {"t": now - timedelta(hours=24)}).scalar() or 0
    if old_withdrawals > 0:
        red_flags.append({
            "type": "old_pending_withdrawals",
            "severity": "medium",
            "count": old_withdrawals,
            "note": f"{old_withdrawals} withdrawals waiting >24 hours",
        })

    # Any negative commissions (emergency)
    recent_negatives = db.execute(text("""
        SELECT COUNT(*) FROM (
          SELECT 1 FROM course_commissions WHERE created_at >= :t AND amount < 0
          UNION ALL
          SELECT 1 FROM commissions WHERE created_at >= :t AND amount_usdt < 0
          UNION ALL
          SELECT 1 FROM credit_matrix_commissions WHERE created_at >= :t AND amount < 0
        ) AS n
    """), {"t": one_day_ago}).scalar() or 0
    if recent_negatives > 0:
        red_flags.append({
            "type": "negative_commissions",
            "severity": "critical",
            "count": recent_negatives,
            "note": "Commissions with negative amounts detected — this indicates a bug",
        })

    # Determine overall status
    severities = [f["severity"] for f in red_flags]
    if "critical" in severities:
        status = "critical"
    elif "high" in severities or signups_1h == 0 and now.hour < 22 and now.hour > 7:
        # Only flag "no signups" during active hours
        status = "degraded" if "high" in severities else "healthy"
    else:
        status = "healthy"

    return {
        "status": status,
        "timestamp": now.isoformat(),
        "users": {
            "total": total_users,
            "new_last_hour": signups_1h,
            "new_last_24h": signups_24h,
            "active_last_hour": active_1h,
        },
        "purchases_today": {
            "courses": course_today,
            "credit_packs": pack_today,
            "total": course_today + pack_today,
        },
        "commissions_today": {
            "course_academy": course_comms_today,
            "profit_grid": grid_comms_today,
            "profit_nexus": matrix_comms_today,
            "total": course_comms_today + grid_comms_today + matrix_comms_today,
        },
        "red_flags": red_flags,
    }
