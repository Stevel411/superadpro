"""
reconcile_stuck_payment — attach an on-chain transfer to a stuck order.

When a member pays the right product but the scanner couldn't match it
(silent-loss bug from 7 May, fixed by cursor-based scanning), this tool
links the on-chain tx_hash to the WalletConnectPaymentOrder, marks it
'confirmed', and triggers product activation via the canonical handler.

This tool DOES NOT call _nowpayments_activate_product directly because
that lives in the main app. Instead it sets the order to 'confirmed' and
the next cron tick will pick it up via the standard activation path.

Validates:
  - The order exists and is in 'pending' or 'expired' status
  - The tx_hash exists in onchain_orphan_transfers
  - The amount on-chain matches the order's expected_amount within 1 cent
"""
from decimal import Decimal
from sqlalchemy import text
from .registry import register_tool
from ._audit import log_audit


@register_tool(
    name="reconcile_stuck_payment",
    description=(
        "Attach an orphaned on-chain tx to a stuck WalletConnectPaymentOrder, "
        "marking the order 'confirmed' so the next cron tick activates the "
        "product. Validates that the on-chain amount matches the order's "
        "expected amount within 1 cent. Defaults to dry_run=true."
    ),
    category="payments",
    input_schema={
        "type": "object",
        "properties": {
            "order_id": {"type": "integer", "description": "WalletConnectPaymentOrder.id"},
            "tx_hash": {"type": "string", "description": "On-chain transaction hash to attach"},
        },
        "required": ["order_id", "tx_hash"],
    },
)
def reconcile_stuck_payment(db, order_id: int, tx_hash: str,
                             dry_run: bool = True, _caller_token: str = None):
    tx_hash = (tx_hash or "").strip().lower()
    if not tx_hash.startswith("0x"):
        return {"error": "tx_hash must start with 0x", "executed": False, "dry_run": dry_run}

    order = db.execute(text("""
        SELECT id, user_id, product_key, unique_amount, status, from_address, tx_hash
        FROM walletconnect_payment_orders
        WHERE id = :id
    """), {"id": order_id}).fetchone()

    if not order:
        return {"error": f"order {order_id} not found", "executed": False, "dry_run": dry_run}

    if order.status not in ("pending", "expired"):
        return {
            "error": f"order is in status '{order.status}' — only pending/expired can be reconciled",
            "executed": False,
            "dry_run": dry_run,
        }

    orphan = db.execute(text("""
        SELECT id, from_address, amount_usdt, resolved
        FROM onchain_orphan_transfers
        WHERE LOWER(tx_hash) = :h
    """), {"h": tx_hash}).fetchone()

    if not orphan:
        return {
            "error": f"tx {tx_hash} not in onchain_orphan_transfers — scanner may not have seen it yet",
            "executed": False,
            "dry_run": dry_run,
        }

    expected = Decimal(str(order.unique_amount or 0))
    onchain = Decimal(str(orphan.amount_usdt or 0))
    delta = abs(expected - onchain)

    if delta > Decimal("0.01"):
        return {
            "error": (
                f"amount mismatch: order expected ${expected}, on-chain was ${onchain} "
                f"(delta ${delta}). Refusing to reconcile."
            ),
            "executed": False,
            "dry_run": dry_run,
        }

    payload = {
        "order_id": order.id,
        "user_id": order.user_id,
        "product_key": order.product_key,
        "tx_hash": tx_hash,
        "expected_amount": float(expected),
        "onchain_amount": float(onchain),
        "from_address": orphan.from_address,
        "previous_status": order.status,
    }

    if dry_run:
        log_audit(db, "reconcile_stuck_payment", "wc_order", str(order.id), "reconcile",
                  payload, executed=False, caller_token=_caller_token)
        db.commit()
        return {
            "dry_run": True,
            "executed": False,
            "preview": payload,
            "would_set_status": "confirmed",
            "next_step": "Order will be activated by the next cron tick (within ~1 minute).",
        }

    # Live: link the tx to the order, set status confirmed
    db.execute(text("""
        UPDATE walletconnect_payment_orders
        SET status = 'confirmed',
            tx_hash = :tx,
            from_address = COALESCE(from_address, :from_addr),
            confirmed_at = NOW()
        WHERE id = :id
    """), {"tx": tx_hash, "from_addr": orphan.from_address, "id": order.id})

    db.execute(text("""
        UPDATE onchain_orphan_transfers
        SET resolved = TRUE,
            resolved_at = NOW(),
            resolution_note = :note
        WHERE id = :id
    """), {"id": orphan.id, "note": f"reconciled to wc_order {order.id}"})

    log_audit(db, "reconcile_stuck_payment", "wc_order", str(order.id), "reconcile",
              payload, executed=True, caller_token=_caller_token)
    db.commit()

    return {
        "dry_run": False,
        "executed": True,
        "order_id": order.id,
        "set_to_status": "confirmed",
        "linked_tx": tx_hash,
        "next_step": "Activation will run on the next cron tick (within ~1 minute).",
    }
