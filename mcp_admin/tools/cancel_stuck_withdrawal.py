"""
cancel_stuck_withdrawal — cancel a stuck pending withdrawal.

When a withdrawal has been pending for >24h and the BSC RPC has
permanently failed (wallet rotation, insufficient gas, etc.), admin can
cancel it here. The user's balance is restored.

Tool is paranoid:
  - Refuses to cancel withdrawals not in 'pending' status
  - Refuses if the withdrawal has any retry attempts <60min ago
    (might still succeed)
  - Logs the entire before-state to mcp_admin_audit
"""
from decimal import Decimal
from sqlalchemy import text
from .registry import register_tool
from ._audit import log_audit


@register_tool(
    name="cancel_stuck_withdrawal",
    description=(
        "Cancel a stuck pending withdrawal and restore the user's balance. "
        "Refuses if status is not 'pending', or if there's been a retry "
        "attempt within the last 60 minutes (might still succeed). Defaults "
        "to dry_run=true."
    ),
    category="withdrawals",
    input_schema={
        "type": "object",
        "properties": {
            "withdrawal_id": {"type": "integer", "description": "withdrawals.id"},
            "reason": {"type": "string", "description": "Why this is being cancelled (saved to audit log)"},
        },
        "required": ["withdrawal_id", "reason"],
    },
)
def cancel_stuck_withdrawal(db, withdrawal_id: int, reason: str,
                             dry_run: bool = True, _caller_token: str = None):
    w = db.execute(text("""
        SELECT id, user_id, amount_usdt, status, requested_at, last_attempted_at, last_error
        FROM withdrawals
        WHERE id = :id
    """), {"id": withdrawal_id}).fetchone()

    if not w:
        return {"error": f"withdrawal {withdrawal_id} not found", "executed": False, "dry_run": dry_run}

    if w.status != "pending":
        return {
            "error": f"withdrawal is in status '{w.status}' — only pending can be cancelled",
            "executed": False,
            "dry_run": dry_run,
        }

    # Recent retry guard
    if w.last_attempted_at:
        recent = db.execute(text("""
            SELECT 1 WHERE :t > NOW() - INTERVAL '60 minutes'
        """), {"t": w.last_attempted_at}).fetchone()
        if recent:
            return {
                "error": "withdrawal had a retry attempt in the last 60 minutes — wait before cancelling",
                "last_attempted_at": w.last_attempted_at.isoformat() if w.last_attempted_at else None,
                "executed": False,
                "dry_run": dry_run,
            }

    amount = Decimal(str(w.amount_usdt or 0))
    payload = {
        "withdrawal_id": w.id,
        "user_id": w.user_id,
        "amount_usdt": float(amount),
        "reason": reason,
        "previous_status": w.status,
        "last_error": w.last_error,
    }

    if dry_run:
        log_audit(db, "cancel_stuck_withdrawal", "withdrawal", str(w.id), "cancel",
                  payload, executed=False, caller_token=_caller_token)
        db.commit()
        return {
            "dry_run": True,
            "executed": False,
            "preview": payload,
            "would_restore_balance": float(amount),
        }

    # Live: cancel + restore balance atomically
    # Note column matches the actual schema (no cancelled_at / cancel_reason
    # columns on this table — schema confirmed in app/database.py:395).
    db.execute(text("""
        UPDATE withdrawals
        SET status = 'cancelled',
            processed_at = NOW(),
            notes = COALESCE(notes, '') ||
                    CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE E'\n' END ||
                    'CANCELLED via mcp_admin: ' || :reason
        WHERE id = :id AND status = 'pending'
    """), {"reason": reason, "id": w.id})

    # Restore balance — uses correct wallet column based on withdrawal source.
    # The withdrawal table tracks wallet_type so refund hits the same balance
    # the deduction came from (otherwise affiliate->campaign or vice versa).
    wallet_type = db.execute(text("""
        SELECT wallet_type FROM withdrawals WHERE id = :id
    """), {"id": w.id}).scalar() or "affiliate"

    if wallet_type == "campaign":
        db.execute(text("""
            UPDATE users
            SET campaign_balance = COALESCE(campaign_balance, 0) + :amt
            WHERE id = :uid
        """), {"amt": amount, "uid": w.user_id})
    else:
        db.execute(text("""
            UPDATE users
            SET balance = COALESCE(balance, 0) + :amt
            WHERE id = :uid
        """), {"amt": amount, "uid": w.user_id})

    log_audit(db, "cancel_stuck_withdrawal", "withdrawal", str(w.id), "cancel",
              {**payload, "refunded_to": wallet_type}, executed=True, caller_token=_caller_token)
    db.commit()

    return {
        "dry_run": False,
        "executed": True,
        "withdrawal_id": w.id,
        "balance_restored": float(amount),
        "user_id": w.user_id,
        "refunded_to_wallet": wallet_type,
    }
