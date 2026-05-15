"""
list_orphan_transfers — recent OnchainOrphanTransfer rows.

When a payment arrives at the treasury but doesn't match any pending
WalletConnectPaymentOrder (usually because the order expired before
the on-chain tx confirmed), it gets filed as an orphan. These are
recoverable but need manual reconciliation.

Built 15 May 2026 after Jason's stuck-payment incident.
"""
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="list_orphan_transfers",
    description=(
        "List recent OnchainOrphanTransfer rows — USDT transfers that arrived at "
        "the treasury but couldn't be auto-matched to a pending order. Usually "
        "happens when a member's order expired (15-min window) before the on-chain "
        "transaction confirmed, or they sent a rounded amount. Funds are safe but "
        "need manual reconciliation. Returns from-address, amount, tx_hash."
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
                "description": "Filter: 'unresolved' (default), 'resolved', 'all'",
                "default": "unresolved",
            },
        },
    },
)
def list_orphan_transfers(db, limit: int = 20, status: str = "unresolved"):
    limit = max(1, min(int(limit), 100))
    where = ""
    if status == "unresolved":
        where = "WHERE resolved = FALSE"
    elif status == "resolved":
        where = "WHERE resolved = TRUE"
    elif status != "all":
        return {"error": "status must be one of: unresolved, resolved, all"}

    try:
        rows = db.execute(text(f"""
            SELECT id, tx_hash, from_address, amount_usdt, block_number,
                   likely_rounded_amount, seen_at, resolved,
                   resolution_note, resolved_at, resolved_by_user_id
            FROM onchain_orphan_transfers
            {where}
            ORDER BY seen_at DESC
            LIMIT :lim
        """), {"lim": limit}).fetchall()
    except Exception as e:
        return {"error": f"Query failed: {e}", "orphans": []}

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
                "likely_rounded_amount": bool(r.likely_rounded_amount),
                "seen_at": r.seen_at.isoformat() if r.seen_at else None,
                "resolved": bool(r.resolved),
                "resolution_note": r.resolution_note,
                "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
                "resolved_by_user_id": r.resolved_by_user_id,
            }
            for r in rows
        ],
    }
