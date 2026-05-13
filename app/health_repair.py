"""
SuperAdPro — Platform Health Repair Tools
==========================================

WRITE-LEVEL tools that fix the issues surfaced by app/health_scanners.py.

Engineering bar (higher than scanners — these mutate live data):
  1. Dry-run by default. Mutations only happen when ?confirm=true.
  2. Single target per request. A bug can't cascade across the platform.
  3. Transaction-wrapped. Any verification failure rolls back.
  4. Audit log. Every change written to admin_repair_log BEFORE commit.
  5. Post-state verification. After mutation we re-run the same checks
     the scanner did. If they still fail, we rollback rather than
     leaving the data in a different broken state.
  6. Idempotent. Running twice should be a no-op the second time.

Each repair returns a dict:
  {
    "tool": str,
    "target_kind": str,
    "target_id": int,
    "dry_run": bool,
    "would_change": [   # what we PROPOSE to do (always populated)
      {"table": "...", "id": ..., "before": {...}, "after": {...}}
    ],
    "applied": bool,    # False if dry_run or if verification failed
    "verification": {...},  # post-state checks
    "audit_log_id": int | None,
  }
"""

from __future__ import annotations
import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import and_

from .database import (
    User, CreditMatrix, CreditMatrixPosition, AdminRepairLog,
)

logger = logging.getLogger(__name__)

MATRIX_MAX_DOWNLINE = 3 + 9 + 27  # 39 — matches credit_matrix.py


def _write_audit(
    db: Session,
    tool: str,
    target_kind: str,
    target_id: int,
    admin: User,
    dry_run: bool,
    success: bool,
    changes: list,
    summary: str,
    error: str = None,
) -> int:
    """Insert an audit row. Returns the new row id.

    Called BEFORE the parent transaction commits, so if the transaction
    is rolled back, the audit row goes with it. The audit row is the
    last thing flushed before commit, after all the real mutations are
    staged — this means the audit accurately reflects what was committed.
    """
    log = AdminRepairLog(
        repair_tool=tool,
        target_kind=target_kind,
        target_id=target_id,
        admin_user_id=admin.id,
        admin_username=admin.username or "<no username>",
        dry_run=dry_run,
        success=success,
        changes_json=json.dumps(changes, default=str),
        summary=summary,
        error_message=error,
    )
    db.add(log)
    db.flush()
    return log.id


# ─────────────────────────────────────────────────────────────────
#  REPAIR: matrix position_index reindexing
# ─────────────────────────────────────────────────────────────────
def repair_matrix_indices(
    db: Session, matrix_id: int, admin: User, confirm: bool = False
) -> dict:
    """Reindex position_index values within a matrix's sibling sets.

    For each parent in the tree, renumbers its children to 0..N-1 in
    creation order (oldest = index 0). This collapses both duplicate
    indices and gaps. The owner position at level 0 is left alone.

    Also recomputes matrix.positions_filled (cached counter) from the
    live downline count.

    Does NOT touch commissions, user balances, or anything money-related.
    Position records themselves (id, user_id, parent_position_id, level,
    pack_key, pack_price, created_at) are preserved; only position_index
    changes, plus matrix.positions_filled.

    Returns a structured result dict (see module docstring).
    """
    result = {
        "tool": "matrix-indices",
        "target_kind": "matrix",
        "target_id": matrix_id,
        "dry_run": not confirm,
        "would_change": [],
        "applied": False,
        "verification": {},
        "audit_log_id": None,
    }

    matrix = db.query(CreditMatrix).filter(CreditMatrix.id == matrix_id).first()
    if not matrix:
        result["error"] = f"No matrix with id={matrix_id}"
        return result

    owner = db.query(User).filter(User.id == matrix.owner_id).first()
    owner_name = owner.username if owner else f"user_id={matrix.owner_id}"
    result["target_label"] = f"matrix #{matrix.id} ({owner_name} / {matrix.pack_key})"

    # ── Phase 1: build the change set (no writes yet) ───────────────
    positions = db.query(CreditMatrixPosition).filter(
        CreditMatrixPosition.matrix_id == matrix_id
    ).all()

    # Group children by parent
    children_by_parent = {}
    for p in positions:
        if p.parent_position_id is not None:
            children_by_parent.setdefault(p.parent_position_id, []).append(p)

    changes = []

    for parent_id, kids in children_by_parent.items():
        # Sort by created_at (then by id as tiebreaker) — oldest = index 0
        ordered = sorted(kids, key=lambda c: (c.created_at or datetime.min, c.id))
        for new_index, child in enumerate(ordered):
            if child.position_index != new_index:
                changes.append({
                    "table": "credit_matrix_positions",
                    "id": child.id,
                    "before": {"position_index": child.position_index},
                    "after": {"position_index": new_index},
                    "context": {
                        "user_id": child.user_id,
                        "parent_position_id": parent_id,
                        "level": child.level,
                    },
                })

    # Cached positions_filled recompute
    live_downline = len([p for p in positions if p.level > 0])
    if matrix.positions_filled != live_downline:
        changes.append({
            "table": "credit_matrices",
            "id": matrix.id,
            "before": {"positions_filled": matrix.positions_filled},
            "after": {"positions_filled": live_downline},
            "context": {"reason": "recompute from live position count"},
        })

    result["would_change"] = changes
    result["change_count"] = len(changes)

    if not changes:
        result["applied"] = True   # nothing to do = success
        result["summary"] = "No changes needed — matrix already consistent"
        # Still log the dry-run for auditability
        try:
            audit_id = _write_audit(
                db=db, tool="matrix-indices", target_kind="matrix",
                target_id=matrix_id, admin=admin, dry_run=not confirm,
                success=True, changes=[],
                summary=result["summary"],
            )
            db.commit()
            result["audit_log_id"] = audit_id
        except Exception as exc:
            logger.warning(f"matrix-indices audit log failed for matrix {matrix_id}: {exc}")
            db.rollback()
        return result

    summary = (
        f"{len(changes)} change(s) staged for matrix #{matrix_id}: "
        + ", ".join(f"{c['table']}.{c['id']}" for c in changes[:5])
        + ("..." if len(changes) > 5 else "")
    )
    result["summary"] = summary

    # ── Phase 2: dry-run? Stop here, log the proposal, and return ────
    if not confirm:
        try:
            audit_id = _write_audit(
                db=db, tool="matrix-indices", target_kind="matrix",
                target_id=matrix_id, admin=admin, dry_run=True,
                success=True, changes=changes,
                summary="DRY RUN — " + summary,
            )
            db.commit()
            result["audit_log_id"] = audit_id
        except Exception as exc:
            logger.warning(f"matrix-indices dry-run audit log failed: {exc}")
            db.rollback()
        return result

    # ── Phase 3: apply changes inside a transaction ─────────────────
    try:
        # Apply position_index changes
        for change in changes:
            if change["table"] == "credit_matrix_positions":
                pos = db.query(CreditMatrixPosition).filter(
                    CreditMatrixPosition.id == change["id"]
                ).first()
                if not pos:
                    raise RuntimeError(
                        f"Position {change['id']} disappeared during repair"
                    )
                pos.position_index = change["after"]["position_index"]
            elif change["table"] == "credit_matrices":
                m = db.query(CreditMatrix).filter(
                    CreditMatrix.id == change["id"]
                ).first()
                if not m:
                    raise RuntimeError(f"Matrix {change['id']} disappeared")
                m.positions_filled = change["after"]["positions_filled"]
        db.flush()

        # ── Phase 4: post-state verification ─────────────────────────
        # Re-fetch and check the same invariants. If any fail, rollback.
        verification = _verify_matrix_indices(db, matrix_id)
        result["verification"] = verification

        if not verification["all_pass"]:
            raise RuntimeError(
                "Post-repair verification failed: "
                + ", ".join(verification["failed_checks"])
            )

        # ── Phase 5: audit log + commit ──────────────────────────────
        audit_id = _write_audit(
            db=db, tool="matrix-indices", target_kind="matrix",
            target_id=matrix_id, admin=admin, dry_run=False,
            success=True, changes=changes, summary=summary,
        )
        result["audit_log_id"] = audit_id
        db.commit()
        result["applied"] = True
        return result

    except Exception as exc:
        db.rollback()
        logger.exception(
            f"matrix-indices repair failed for matrix {matrix_id}: {exc}"
        )
        # Log the failure separately (new transaction)
        try:
            audit_id = _write_audit(
                db=db, tool="matrix-indices", target_kind="matrix",
                target_id=matrix_id, admin=admin, dry_run=False,
                success=False, changes=changes,
                summary="FAILED: " + summary, error=str(exc)[:1000],
            )
            db.commit()
            result["audit_log_id"] = audit_id
        except Exception as inner:
            logger.exception(f"Failed to log failure: {inner}")
            db.rollback()
        result["error"] = str(exc)
        return result


def _verify_matrix_indices(db: Session, matrix_id: int) -> dict:
    """Re-check the invariants after a repair. Used by repair_matrix_indices
    as the gate before committing.
    """
    failed = []
    positions = db.query(CreditMatrixPosition).filter(
        CreditMatrixPosition.matrix_id == matrix_id
    ).all()
    matrix = db.query(CreditMatrix).filter(CreditMatrix.id == matrix_id).first()

    # Check 1: no duplicate position_index within any parent's children
    children_by_parent = {}
    for p in positions:
        if p.parent_position_id is not None:
            children_by_parent.setdefault(p.parent_position_id, []).append(p)

    for parent_id, kids in children_by_parent.items():
        indices = [k.position_index for k in kids]
        if len(set(indices)) != len(indices):
            failed.append(f"parent {parent_id} still has duplicate indices: {indices}")

    # Check 2: no gaps within any parent's children
    for parent_id, kids in children_by_parent.items():
        indices = sorted(k.position_index for k in kids)
        expected = list(range(len(kids)))
        if indices != expected:
            failed.append(f"parent {parent_id} indices {indices} != expected {expected}")

    # Check 3: cached positions_filled matches live downline count
    live = len([p for p in positions if p.level > 0])
    if matrix.positions_filled != live:
        failed.append(
            f"positions_filled cache {matrix.positions_filled} != live {live}"
        )

    return {
        "all_pass": len(failed) == 0,
        "failed_checks": failed,
        "live_downline": live,
        "cached_positions_filled": matrix.positions_filled,
        "child_groups_checked": len(children_by_parent),
    }


# ─────────────────────────────────────────────────────────────────
#  REPAIR: backfill membership_expires_at for pre-launch testers
# ─────────────────────────────────────────────────────────────────
# Steve gifted 9 testers a 1-year Pro membership before public launch
# as a thank-you for pre-launch testing. The activation path used
# (whatever it was — predates /admin/api/user/{id}/gift-membership)
# set is_active=True and membership_tier='pro' but did NOT set
# membership_expires_at. The membership_tier_consistency scanner
# flagged this on 13 May 2026.
#
# This is a ONE-TIME fix scoped to a known list of usernames, not a
# generic "fix everyone missing expiry" tool. The reason: a future
# member appearing in the same broken state should be FLAGGED by
# the scanner, not silently auto-fixed. The scanner is the alarm;
# this is the targeted patch for known-good cases.
#
# Each tester gets: membership_expires_at = activated_at + 365 days.
# If the result is in the past (unlikely — they joined recently), we
# refuse to write that record and surface it in the result so admin
# can decide manually. We won't silently expire someone retroactively.
TESTER_USERNAMES = [
    "blazinglion", "richard1980", "mattfeast", "runshi", "tbillion",
    "interprofits", "cynniam", "thomasgrant", "chrisbrown",
]


def repair_backfill_tester_expiry(
    db: Session, admin: User, confirm: bool = False
) -> dict:
    """Set membership_expires_at = activated_at + 365 days for the 9
    pre-launch testers who were given comp'd Pro memberships.

    Dry-run by default. Same engineering bar as repair_matrix_indices:
    single bounded scope, transaction-wrapped, audit log, post-state
    verification.

    Refuses to set an expiry date in the past. If activated_at + 365
    days < now, the row is skipped and surfaced in `skipped` so the
    admin can decide what to do (extend further, expire now, etc.).
    """
    result = {
        "tool": "backfill-tester-expiry",
        "target_kind": "user_set",
        "target_id": 0,  # not a single ID — multiple users
        "dry_run": not confirm,
        "would_change": [],
        "skipped": [],
        "not_found": [],
        "applied": False,
        "verification": {},
        "audit_log_id": None,
    }

    now = datetime.utcnow()

    # ── Phase 1: load all 9 testers ────────────────────────────────
    testers = db.query(User).filter(
        User.username.in_(TESTER_USERNAMES)
    ).all()
    found_names = {u.username for u in testers}
    result["not_found"] = sorted(set(TESTER_USERNAMES) - found_names)

    # ── Phase 2: build change set ─────────────────────────────────
    for user in testers:
        # Skip users who already have an expiry — repair tool should
        # never overwrite a valid expiry date.
        if user.membership_expires_at is not None:
            result["skipped"].append({
                "user_id": user.id,
                "username": user.username,
                "reason": "already has expiry set",
                "current_expires_at": user.membership_expires_at.isoformat(),
            })
            continue

        if user.activated_at is None:
            # Can't compute activated_at + 365. Flag.
            result["skipped"].append({
                "user_id": user.id,
                "username": user.username,
                "reason": "no activated_at to base expiry on",
            })
            continue

        new_expiry = user.activated_at + timedelta(days=365)
        if new_expiry < now:
            # Their year is already up. Surface it — admin decides.
            result["skipped"].append({
                "user_id": user.id,
                "username": user.username,
                "reason": "activated_at + 365 days is in the past — refusing to expire retroactively",
                "activated_at": user.activated_at.isoformat(),
                "proposed_expiry": new_expiry.isoformat(),
                "days_overdue": (now - new_expiry).days,
            })
            continue

        result["would_change"].append({
            "table": "users",
            "id": user.id,
            "before": {"membership_expires_at": None},
            "after": {"membership_expires_at": new_expiry.isoformat()},
            "context": {
                "username": user.username,
                "activated_at": user.activated_at.isoformat(),
                "expires_after": "365 days",
            },
        })

    result["change_count"] = len(result["would_change"])
    summary_parts = [f"{len(result['would_change'])} testers to set"]
    if result["skipped"]:
        summary_parts.append(f"{len(result['skipped'])} skipped")
    if result["not_found"]:
        summary_parts.append(f"{len(result['not_found'])} not found by username")
    summary = ", ".join(summary_parts)
    result["summary"] = summary

    # ── Phase 3: dry-run? Log and return ───────────────────────────
    if not confirm:
        try:
            audit_id = _write_audit(
                db=db, tool="backfill-tester-expiry", target_kind="user_set",
                target_id=0, admin=admin, dry_run=True, success=True,
                changes=result["would_change"],
                summary="DRY RUN — " + summary,
            )
            db.commit()
            result["audit_log_id"] = audit_id
        except Exception as exc:
            logger.warning(f"backfill-tester-expiry dry-run audit failed: {exc}")
            db.rollback()
        return result

    # Nothing to write? Still success, log it.
    if not result["would_change"]:
        try:
            audit_id = _write_audit(
                db=db, tool="backfill-tester-expiry", target_kind="user_set",
                target_id=0, admin=admin, dry_run=False, success=True,
                changes=[], summary="No-op — " + summary,
            )
            db.commit()
            result["audit_log_id"] = audit_id
            result["applied"] = True
        except Exception as exc:
            logger.warning(f"backfill-tester-expiry no-op audit failed: {exc}")
            db.rollback()
        return result

    # ── Phase 4: apply changes ─────────────────────────────────────
    try:
        for change in result["would_change"]:
            target = db.query(User).filter(User.id == change["id"]).first()
            if not target:
                raise RuntimeError(
                    f"User {change['id']} disappeared during repair"
                )
            if target.membership_expires_at is not None:
                # Defensive — someone else set it between our load and now
                raise RuntimeError(
                    f"User {target.username} expiry changed mid-repair "
                    f"(found {target.membership_expires_at}, expected NULL)"
                )
            # Parse the ISO string back to datetime for write
            target.membership_expires_at = datetime.fromisoformat(
                change["after"]["membership_expires_at"]
            )
        db.flush()

        # ── Phase 5: verify ────────────────────────────────────────
        verification = _verify_tester_expiry(db, result["would_change"])
        result["verification"] = verification
        if not verification["all_pass"]:
            raise RuntimeError(
                "Post-repair verification failed: "
                + ", ".join(verification["failed_checks"])
            )

        # ── Phase 6: audit + commit ────────────────────────────────
        audit_id = _write_audit(
            db=db, tool="backfill-tester-expiry", target_kind="user_set",
            target_id=0, admin=admin, dry_run=False, success=True,
            changes=result["would_change"], summary=summary,
        )
        result["audit_log_id"] = audit_id
        db.commit()
        result["applied"] = True
        return result

    except Exception as exc:
        db.rollback()
        logger.exception(f"backfill-tester-expiry repair failed: {exc}")
        try:
            audit_id = _write_audit(
                db=db, tool="backfill-tester-expiry", target_kind="user_set",
                target_id=0, admin=admin, dry_run=False, success=False,
                changes=result["would_change"],
                summary="FAILED: " + summary, error=str(exc)[:1000],
            )
            db.commit()
            result["audit_log_id"] = audit_id
        except Exception as inner:
            logger.exception(f"Failed to log failure: {inner}")
            db.rollback()
        result["error"] = str(exc)
        return result


def _verify_tester_expiry(db: Session, changes: list) -> dict:
    """Confirm each user we changed now has the expected expiry."""
    failed = []
    checked = 0
    for change in changes:
        target = db.query(User).filter(User.id == change["id"]).first()
        if not target:
            failed.append(f"user {change['id']} disappeared")
            continue
        expected_iso = change["after"]["membership_expires_at"]
        expected = datetime.fromisoformat(expected_iso)
        if target.membership_expires_at != expected:
            failed.append(
                f"user {change['id']} expiry {target.membership_expires_at} "
                f"!= expected {expected}"
            )
        checked += 1
    return {
        "all_pass": len(failed) == 0,
        "failed_checks": failed,
        "users_checked": checked,
    }
