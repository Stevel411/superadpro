"""
resolve_orphan_transfer — mark an OnchainOrphanTransfer row resolved.

Schema (matches app/database.py OnchainOrphanTransfer):
  resolved = Column(Boolean, default=False, ...)
  resolution_note = Column(Text, nullable=True)
  resolved_at = Column(DateTime, nullable=True)
"""
from sqlalchemy import text
from .registry import register_tool
from ._audit import log_audit


@register_tool(
    name="resolve_orphan_transfer",
    description=(
        "Mark an OnchainOrphanTransfer row as resolved. Use for treasury "
        "deposits the scanner couldn't auto-match. Resolution must be 'spam', "
        "'manual', or 'reconciled'. Defaults to dry_run=true."
    ),
    category="orphan",
    input_schema={
        "type": "object",
        "properties": {
            "orphan_id": {"type": "integer", "description": "Primary key of onchain_orphan_transfers"},
            "resolution": {"type": "string", "enum": ["spam", "manual", "reconciled"]},
            "note": {"type": "string", "description": "Free-text note saved alongside the resolution"},
        },
        "required": ["orphan_id", "resolution"],
    },
)
def resolve_orphan_transfer(db, orphan_id: int, resolution: str, note: str = "",
                             dry_run: bool = True, _caller_token: str = None):
    row = db.execute(text("""
        SELECT id, tx_hash, from_address, amount_usdt, resolved, resolution_note, resolved_at
        FROM onchain_orphan_transfers
        WHERE id = :id
    """), {"id": orphan_id}).fetchone()

    if not row:
        return {"error": f"orphan {orphan_id} not found", "executed": False, "dry_run": dry_run}

    before = {
        "id": row.id,
        "tx_hash": row.tx_hash,
        "from_address": row.from_address,
        "amount_usdt": float(row.amount_usdt or 0),
        "resolved": bool(row.resolved),
        "resolution_note": row.resolution_note,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
    }

    if row.resolved:
        return {
            "error": "orphan already resolved — refusing to overwrite",
            "before": before,
            "executed": False,
            "dry_run": dry_run,
        }

    new_note = f"{resolution}: {note or 'no additional note'}"
    payload = {
        "orphan_id": orphan_id, "resolution": resolution, "note": note,
        "before": before, "new_resolution_note": new_note,
    }

    if dry_run:
        log_audit(db, "resolve_orphan_transfer", "orphan", str(orphan_id), resolution,
                  payload, executed=False, caller_token=_caller_token)
        db.commit()
        return {"dry_run": True, "executed": False, "would_affect": 1, "preview": payload}

    db.execute(text("""
        UPDATE onchain_orphan_transfers
        SET resolved = TRUE, resolved_at = NOW(), resolution_note = :note
        WHERE id = :id
    """), {"id": orphan_id, "note": new_note})

    log_audit(db, "resolve_orphan_transfer", "orphan", str(orphan_id), resolution,
              payload, executed=True, caller_token=_caller_token)
    db.commit()

    return {"dry_run": False, "executed": True, "affected": 1, "before": before, "resolution": resolution}
