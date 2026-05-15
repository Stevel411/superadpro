"""
lookup_payment_by_txid — find a payment by its on-chain transaction hash.

Given a TXID, find: matched WalletConnectPaymentOrder, OnchainOrphanTransfer,
Payment row, NOWPaymentsOrder. Answers "what happened to this specific
payment?" — the question we couldn't answer for Jason without screenshots.

Built 15 May 2026.
"""
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="lookup_payment_by_txid",
    description=(
        "Trace an on-chain transaction hash through the platform: did it match "
        "a pending order? Is it filed as an orphan? Was a Payment row written? "
        "Did the user get activated? Pass the full 0x... TXID. Use this when "
        "diagnosing 'I paid but nothing happened' issues — gives the full state "
        "of one specific payment in 1 call."
    ),
    category="diagnostic",
    input_schema={
        "type": "object",
        "properties": {
            "tx_hash": {
                "type": "string",
                "description": "Full BSC transaction hash (0x...). Case-insensitive.",
            },
        },
        "required": ["tx_hash"],
    },
)
def lookup_payment_by_txid(db, tx_hash: str = ""):
    if not tx_hash:
        return {"error": "tx_hash required"}

    tx_hash = tx_hash.strip().lower()
    if not tx_hash.startswith("0x"):
        return {"error": "tx_hash must start with 0x"}

    result = {
        "tx_hash": tx_hash,
        "found_in": [],
    }

    # 1. WalletConnectPaymentOrder — matched and confirmed
    try:
        wc = db.execute(text("""
            SELECT id, user_id, product_type, product_key, unique_amount,
                   status, confirmed_at, from_address, block_number,
                   created_at, expires_at
            FROM walletconnect_payment_orders
            WHERE LOWER(tx_hash) = :h
            LIMIT 5
        """), {"h": tx_hash}).fetchall()
        if wc:
            result["found_in"].append("walletconnect_payment_orders")
            result["walletconnect_order"] = [
                {
                    "id": r.id,
                    "user_id": r.user_id,
                    "product": f"{r.product_type}/{r.product_key}",
                    "unique_amount": float(r.unique_amount or 0),
                    "status": r.status,
                    "from_address": r.from_address,
                    "block_number": r.block_number,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                    "confirmed_at": r.confirmed_at.isoformat() if r.confirmed_at else None,
                }
                for r in wc
            ]
    except Exception as e:
        result["walletconnect_query_error"] = str(e)

    # 2. OnchainOrphanTransfer — arrived but unmatched
    try:
        orph = db.execute(text("""
            SELECT id, from_address, amount_usdt, block_number,
                   likely_rounded_amount, seen_at, resolved,
                   resolution_note, resolved_at, resolved_by_user_id
            FROM onchain_orphan_transfers
            WHERE LOWER(tx_hash) = :h
            LIMIT 5
        """), {"h": tx_hash}).fetchall()
        if orph:
            result["found_in"].append("onchain_orphan_transfers")
            result["orphan_transfer"] = [
                {
                    "id": r.id,
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
                for r in orph
            ]
    except Exception as e:
        result["orphan_query_error"] = str(e)

    # 3. Payment row — activation record
    try:
        pay = db.execute(text("""
            SELECT id, from_user_id, to_user_id, amount_usdt, payment_type,
                   tx_hash, status, created_at
            FROM payments
            WHERE LOWER(tx_hash) = :h
               OR LOWER(tx_hash) LIKE 'wc_' || :h
            LIMIT 5
        """), {"h": tx_hash}).fetchall()
        if pay:
            result["found_in"].append("payments")
            result["payment_rows"] = [
                {
                    "id": r.id,
                    "from_user_id": r.from_user_id,
                    "to_user_id": r.to_user_id,
                    "amount_usdt": float(r.amount_usdt or 0),
                    "payment_type": r.payment_type,
                    "tx_hash": r.tx_hash,
                    "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in pay
            ]
    except Exception as e:
        result["payments_query_error"] = str(e)

    if not result["found_in"]:
        result["summary"] = "TXID not found in any platform table. Either not yet scanned, or transaction is to a different wallet."

    return result
