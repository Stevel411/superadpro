"""
expire_pending_orders — bulk expire stale pending payment orders.

After a long incident or for routine cleanup, expires pending payment
orders that are past their TTL but stuck in 'pending'. This is the cron's
job normally, but if cron fails, this tool catches up.

Affects:
  - walletconnect_payment_orders where status='pending' AND expires_at < now
  - nowpayments_orders where status='pending' AND created_at < (now - 24h)

Capped at 500 rows per call to avoid runaway updates.
"""
from sqlalchemy import text
from .registry import register_tool
from ._audit import log_audit


@register_tool(
    name="expire_pending_orders",
    description=(
        "Bulk expire stale pending payment orders (WalletConnect orders past "
        "expires_at, NOWPayments orders >24h old). Capped at 500 rows per "
        "call. Defaults to dry_run=true."
    ),
    category="payments",
    input_schema={
        "type": "object",
        "properties": {
            "scope": {
                "type": "string",
                "enum": ["walletconnect", "nowpayments", "both"],
                "description": "Which order table to operate on",
                "default": "both",
            },
            "limit": {"type": "integer", "description": "Max rows to affect (default 100, hard cap 500)", "default": 100},
        },
    },
)
def expire_pending_orders(db, scope: str = "both", limit: int = 100,
                          dry_run: bool = True, _caller_token: str = None):
    limit = max(1, min(500, int(limit)))
    counts = {}

    if scope in ("walletconnect", "both"):
        counts["walletconnect_to_expire"] = db.execute(text("""
            SELECT COUNT(*) FROM walletconnect_payment_orders
            WHERE status = 'pending' AND expires_at < NOW()
        """)).scalar() or 0

    if scope in ("nowpayments", "both"):
        counts["nowpayments_to_expire"] = db.execute(text("""
            SELECT COUNT(*) FROM nowpayments_orders
            WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours'
        """)).scalar() or 0

    payload = {"scope": scope, "limit": limit, "counts": counts}

    if dry_run:
        log_audit(db, "expire_pending_orders", "bulk", scope, "expire",
                  payload, executed=False, caller_token=_caller_token)
        db.commit()
        return {"dry_run": True, "executed": False, "preview": payload}

    affected = {}

    if scope in ("walletconnect", "both"):
        result = db.execute(text("""
            WITH targets AS (
              SELECT id FROM walletconnect_payment_orders
              WHERE status = 'pending' AND expires_at < NOW()
              ORDER BY expires_at ASC
              LIMIT :lim
            )
            UPDATE walletconnect_payment_orders o
            SET status = 'expired'
            FROM targets t WHERE o.id = t.id
        """), {"lim": limit})
        affected["walletconnect"] = result.rowcount

    if scope in ("nowpayments", "both"):
        result = db.execute(text("""
            WITH targets AS (
              SELECT id FROM nowpayments_orders
              WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours'
              ORDER BY created_at ASC
              LIMIT :lim
            )
            UPDATE nowpayments_orders o
            SET status = 'expired'
            FROM targets t WHERE o.id = t.id
        """), {"lim": limit})
        affected["nowpayments"] = result.rowcount

    log_audit(db, "expire_pending_orders", "bulk", scope, "expire",
              {**payload, "affected": affected}, executed=True, caller_token=_caller_token)
    db.commit()

    return {"dry_run": False, "executed": True, "affected": affected}
