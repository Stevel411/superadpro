"""
grant_credits — manually credit Profit Nexus credits to a user.

Use cases:
  - Customer support: member proves they paid but activation failed
  - Promo: granting promotional credits
  - Compensation for a documented platform issue

This tool ONLY adds credits. It does NOT place the user in a matrix and
does NOT pay sponsor commissions — for that, use reconcile_stuck_payment
on a real on-chain payment, or trigger purchase_credit_pack via the main
app's admin interface.
"""
from sqlalchemy import text
from .registry import register_tool
from ._audit import log_audit


@register_tool(
    name="grant_credits",
    description=(
        "Manually add Profit Nexus credits to a user's balance. Does NOT "
        "place them in a matrix or pay commissions — that's reconcile_stuck_"
        "payment's job. Use only for support / promo / compensation. Caps at "
        "5,000 credits per call to prevent fat-finger disasters. Defaults to "
        "dry_run=true."
    ),
    category="credits",
    input_schema={
        "type": "object",
        "properties": {
            "user_id": {"type": "integer", "description": "users.id"},
            "credits": {"type": "integer", "description": "Number of credits to grant (1 to 5000)", "minimum": 1, "maximum": 5000},
            "reason": {"type": "string", "description": "Why this grant is happening (saved to audit log)"},
        },
        "required": ["user_id", "credits", "reason"],
    },
)
def grant_credits(db, user_id: int, credits: int, reason: str,
                   dry_run: bool = True, _caller_token: str = None):
    if credits < 1 or credits > 5000:
        return {"error": "credits must be 1..5000 per call", "executed": False, "dry_run": dry_run}

    user = db.execute(text("""
        SELECT id, username
        FROM users
        WHERE id = :id
    """), {"id": user_id}).fetchone()

    if not user:
        return {"error": f"user {user_id} not found", "executed": False, "dry_run": dry_run}

    # Credits are tracked in superscene_credits.balance (one row per user).
    existing = db.execute(text("""
        SELECT id, balance FROM superscene_credits WHERE user_id = :uid
    """), {"uid": user_id}).fetchone()

    before_credits = int(existing.balance) if existing and existing.balance is not None else 0
    after_credits = before_credits + credits

    payload = {
        "user_id": user.id,
        "username": user.username,
        "before_credits": before_credits,
        "after_credits": after_credits,
        "delta": credits,
        "reason": reason,
        "had_credits_row": bool(existing),
    }

    if dry_run:
        log_audit(db, "grant_credits", "user", str(user.id), "grant",
                  payload, executed=False, caller_token=_caller_token)
        db.commit()
        return {"dry_run": True, "executed": False, "preview": payload}

    if existing:
        db.execute(text("""
            UPDATE superscene_credits
            SET balance = COALESCE(balance, 0) + :n
            WHERE user_id = :uid
        """), {"n": credits, "uid": user.id})
    else:
        db.execute(text("""
            INSERT INTO superscene_credits (user_id, balance)
            VALUES (:uid, :n)
        """), {"uid": user.id, "n": credits})

    log_audit(db, "grant_credits", "user", str(user.id), "grant",
              payload, executed=True, caller_token=_caller_token)
    db.commit()

    return {"dry_run": False, "executed": True, **payload}
