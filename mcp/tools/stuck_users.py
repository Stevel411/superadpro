"""
stuck_users — users currently in problematic states.

Returns IDs only (no PII). Steve can then use these IDs in his own admin
interface to investigate individual cases.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="stuck_users",
    description=(
        "Lists user IDs currently in bad states: stuck crypto payments, stuck "
        "withdrawals, failed generations. Returns IDs only (no PII) so admin can "
        "investigate. Best tool for triaging active user problems."
    ),
    category="user_impact",
    input_schema={"type": "object", "properties": {}},
)
def stuck_users(db):
    now = datetime.now(timezone.utc)

    # Stuck crypto payments (>30 min pending, not yet expired)
    stuck_crypto = db.execute(text("""
        SELECT user_id, COUNT(*) as count, MIN(created_at) as oldest
        FROM crypto_payment_orders
        WHERE status = 'pending'
          AND created_at < :threshold
          AND expires_at > NOW()
        GROUP BY user_id
        ORDER BY MIN(created_at) ASC
        LIMIT 100
    """), {"threshold": now - timedelta(minutes=30)}).fetchall()

    # Pending withdrawals >24hr
    stuck_withdrawals = db.execute(text("""
        SELECT user_id, COUNT(*) as count, MIN(requested_at) as oldest, SUM(amount_usdt) as total
        FROM withdrawals
        WHERE status = 'pending' AND requested_at < :t
        GROUP BY user_id
        ORDER BY MIN(requested_at) ASC
        LIMIT 100
    """), {"t": now - timedelta(hours=24)}).fetchall()

    # Users with recent failed generations (3+ failures in last 2 hours)
    try:
        gen_failures = db.execute(text("""
            SELECT user_id, COUNT(*) as fails, MAX(created_at) as most_recent
            FROM superscene_videos
            WHERE status = 'failed' AND created_at >= :t
            GROUP BY user_id
            HAVING COUNT(*) >= 3
            ORDER BY COUNT(*) DESC
            LIMIT 50
        """), {"t": now - timedelta(hours=2)}).fetchall()
    except Exception:
        gen_failures = []

    return {
        "timestamp": now.isoformat(),
        "stuck_crypto_payments": {
            "count": len(stuck_crypto),
            "users": [
                {
                    "user_id": r.user_id,
                    "pending_orders": r.count,
                    "oldest_minutes_ago": int((now - r.oldest.replace(tzinfo=timezone.utc)).total_seconds() / 60) if r.oldest else None,
                }
                for r in stuck_crypto
            ],
        },
        "stuck_withdrawals": {
            "count": len(stuck_withdrawals),
            "users": [
                {
                    "user_id": r.user_id,
                    "pending_withdrawals": r.count,
                    "oldest_hours_ago": int((now - r.oldest.replace(tzinfo=timezone.utc)).total_seconds() / 3600) if r.oldest else None,
                    "total_usd_pending": float(r.total or 0),
                }
                for r in stuck_withdrawals
            ],
        },
        "repeat_generation_failures": {
            "count": len(gen_failures),
            "users": [
                {
                    "user_id": r.user_id,
                    "failures_last_2h": r.fails,
                }
                for r in gen_failures
            ],
        },
    }
