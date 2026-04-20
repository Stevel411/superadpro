"""
user_impact — how many real users are experiencing problems.

Counts affected users (not raw error counts) across key failure modes.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="user_impact",
    description=(
        "Shows how many users are currently experiencing problems vs succeeding. "
        "Distinguishes between 'rare errors' and 'widespread outages'. During launch, "
        "use this to decide whether to escalate or wait."
    ),
    category="user_impact",
    input_schema={
        "type": "object",
        "properties": {
            "hours": {"type": "integer", "default": 1},
        },
    },
)
def user_impact(db, hours: int = 1):
    hours = min(int(hours or 1), 72)
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=hours)

    # Users with failed generations (Creative Studio)
    users_with_gen_failures = 0
    total_failed_generations = 0
    try:
        r = db.execute(text("""
            SELECT
                COUNT(DISTINCT user_id) as users,
                COUNT(*) as total
            FROM superscene_videos
            WHERE created_at >= :t AND status = 'failed'
        """), {"t": since}).fetchone()
        users_with_gen_failures = r.users or 0
        total_failed_generations = r.total or 0
    except Exception:
        pass

    # Users with successful generations
    users_with_gen_success = 0
    try:
        users_with_gen_success = db.execute(text("""
            SELECT COUNT(DISTINCT user_id)
            FROM superscene_videos
            WHERE created_at >= :t AND status = 'completed'
        """), {"t": since}).scalar() or 0
    except Exception:
        pass

    # Users with stuck crypto payments (>30 min pending)
    users_stuck_crypto = db.execute(text("""
        SELECT COUNT(DISTINCT user_id)
        FROM crypto_payment_orders
        WHERE status = 'pending'
          AND created_at < :threshold
          AND expires_at > NOW()
    """), {"threshold": now - timedelta(minutes=30)}).scalar() or 0

    # Users whose withdrawals are stuck >24hr
    users_stuck_withdrawals = db.execute(text("""
        SELECT COUNT(DISTINCT user_id)
        FROM withdrawals
        WHERE status = 'pending' AND requested_at < :t
    """), {"t": now - timedelta(hours=24)}).scalar() or 0

    # Total active users in window (users who did anything)
    active_users = db.execute(text("""
        SELECT COUNT(DISTINCT user_id) FROM (
            SELECT user_id FROM course_purchases WHERE created_at >= :t
            UNION
            SELECT user_id FROM credit_pack_purchases WHERE created_at >= :t
            UNION
            SELECT id AS user_id FROM users WHERE created_at >= :t
        ) AS act
    """), {"t": since}).scalar() or 0

    # Calculate impact pct
    impacted_total = users_stuck_crypto + users_stuck_withdrawals + users_with_gen_failures
    impact_pct = None
    if active_users > 0:
        impact_pct = round(impacted_total / active_users * 100, 1)

    # Determine severity
    if impact_pct is None or impact_pct < 2:
        severity = "healthy"
    elif impact_pct < 10:
        severity = "degraded"
    else:
        severity = "critical"

    return {
        "window_hours": hours,
        "timestamp": now.isoformat(),
        "severity": severity,
        "active_users_in_window": active_users,
        "impacted_users": {
            "total": impacted_total,
            "pct_of_active": impact_pct,
            "generation_failures": users_with_gen_failures,
            "stuck_crypto_payments": users_stuck_crypto,
            "stuck_withdrawals": users_stuck_withdrawals,
        },
        "successful_users": {
            "generation_completions": users_with_gen_success,
        },
        "raw_counts": {
            "failed_generations": total_failed_generations,
        },
    }
