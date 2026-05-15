"""
recent_signups — recently registered users with activation status.

Counterpart to lookup_user — instead of "tell me about this specific
user", this tool answers "who has signed up recently and are they
active or stuck?". Essential during launch monitoring to spot a
spike in stuck signups.

Built 15 May 2026.
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="recent_signups",
    description=(
        "List users who registered in the last N hours, with their current "
        "activation state, founding status, sponsor, and any pending payment "
        "orders. Use to spot trends like 'signups are happening but nobody's "
        "activating' which would indicate a payment-flow bug. Default 24h, max 168h."
    ),
    category="diagnostic",
    input_schema={
        "type": "object",
        "properties": {
            "hours": {
                "type": "integer",
                "description": "Lookback window in hours (default 24, max 168)",
                "default": 24,
            },
            "only_inactive": {
                "type": "boolean",
                "description": "If true, only return signups still in Free/Inactive state (default false)",
                "default": False,
            },
        },
    },
)
def recent_signups(db, hours: int = 24, only_inactive: bool = False):
    hours = max(1, min(int(hours), 168))
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    where_active = "AND u.is_active = FALSE" if only_inactive else ""

    rows = db.execute(text(f"""
        SELECT u.id, u.username, u.email, u.is_active, u.membership_tier,
               u.is_founding_member, u.founding_spot_number, u.sponsor_id,
               u.created_at, u.activated_at,
               (SELECT username FROM users WHERE id = u.sponsor_id) AS sponsor_username
        FROM users u
        WHERE u.created_at >= :since
          {where_active}
        ORDER BY u.created_at DESC
        LIMIT 100
    """), {"since": since}).fetchall()

    # For each user, find pending orders
    user_ids = [r.id for r in rows]
    pending_wc = {}
    pending_np = {}
    if user_ids:
        try:
            wc_rows = db.execute(text("""
                SELECT user_id, COUNT(*) AS cnt, MAX(created_at) AS latest
                FROM walletconnect_payment_orders
                WHERE user_id = ANY(:ids) AND status = 'pending'
                GROUP BY user_id
            """), {"ids": user_ids}).fetchall()
            pending_wc = {r.user_id: {"count": r.cnt, "latest": r.latest.isoformat() if r.latest else None} for r in wc_rows}
        except Exception:
            pass
        try:
            np_rows = db.execute(text("""
                SELECT user_id, COUNT(*) AS cnt, MAX(created_at) AS latest
                FROM nowpayments_orders
                WHERE user_id = ANY(:ids) AND status IN ('pending', 'waiting', 'confirming')
                GROUP BY user_id
            """), {"ids": user_ids}).fetchall()
            pending_np = {r.user_id: {"count": r.cnt, "latest": r.latest.isoformat() if r.latest else None} for r in np_rows}
        except Exception:
            pass

    return {
        "window_hours": hours,
        "since": since.isoformat(),
        "only_inactive": only_inactive,
        "count": len(rows),
        "signups": [
            {
                "id": r.id,
                "username": r.username,
                "email": r.email,
                "is_active": r.is_active,
                "membership_tier": r.membership_tier,
                "is_founding_member": bool(r.is_founding_member),
                "founding_spot_number": r.founding_spot_number,
                "sponsor_id": r.sponsor_id,
                "sponsor_username": r.sponsor_username,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "activated_at": r.activated_at.isoformat() if r.activated_at else None,
                "pending_walletconnect_orders": pending_wc.get(r.id),
                "pending_nowpayments_orders": pending_np.get(r.id),
            }
            for r in rows
        ],
    }
