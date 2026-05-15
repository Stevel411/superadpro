"""
list_orphan_transfers — recent OnchainOrphanTransfer rows.

When a payment arrives at the treasury but doesn't match any pending
WalletConnectPaymentOrder (usually because the order expired before
the on-chain tx confirmed), it gets filed as an orphan. These are
recoverable but need manual reconciliation.

Built 15 May 2026 after Jason's stuck-payment incident where the only
way to see orphan state was screenshots of /admin/orphans.
"""
from datetime import datetime, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="list_orphan_transfers",
    description=(
        "List recent OnchainOrphanTransfer rows — USDT transfers that arrived at "
        "the treasury but couldn't be auto-matched to a pending order. Usually "
        "happens when a member's order expired (15-min window) before the on-chain "
        "transaction confirmed. Funds are safe but need manual reconciliation. "
        "Returns from-address, amount, tx_hash, and timestamps so admin can "
        "identify which user the orphan belongs to."
    ),
    category="diagnostic",
    input_schema={
        "type": "object",
        "properties": {
            "limit": {
                "type": "integer",
                "description": "Max rows to return (default 20, max 100)",
                "default": 20,
            },
            "status": {
                "type": "string",
                "description": "Filter by orphan status: 'pending' (default), 'resolved', 'all'",
                "default": "pending",
            },
        },
    },
)
def list_orphan_transfers(db, limit: int = 20, status: str = "pending"):
    limit = max(1, min(int(limit), 100))
    where = ""
    params = {"lim": limit}
    if status == "pending":
        where = "WHERE status = 'pending' OR status IS NULL"
    elif status == "resolved":
        where = "WHERE status = 'resolved'"
    elif status != "all":
        return {"error": "status must be one of: pending, resolved, all"}

    try:
        rows = db.execute(text(f"""
            SELECT id, tx_hash, from_address, amount_usdt, block_number,
                   detected_at, status, resolved_at, resolved_to_user_id, notes
            FROM onchain_orphan_transfers
            {where}
            ORDER BY detected_at DESC
            LIMIT :lim
        """), params).fetchall()
    except Exception as e:
        return {"error": f"Query failed (table may not exist): {e}", "orphans": []}

    return {
        "count": len(rows),
        "status_filter": status,
        "orphans": [
            {
                "id": r.id,
                "tx_hash": r.tx_hash,
                "from_address": r.from_address,
                "amount_usdt": float(r.amount_usdt or 0),
                "block_number": r.block_number,
                "detected_at": r.detected_at.isoformat() if r.detected_at else None,
                "status": r.status,
                "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
                "resolved_to_user_id": r.resolved_to_user_id,
                "notes": r.notes,
            }
            for r in rows
        ],
    }
