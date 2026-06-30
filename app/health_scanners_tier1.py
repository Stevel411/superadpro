"""
SuperAdPro — Tier 1 Health Scanners
====================================

Matrix & Compensation Integrity. The most money-adjacent scans —
issues here often indicate real financial routing problems.

Scanners:
  - matrix_integrity:   structural correctness of matrix tree
                        (position_index gaps, duplicates, orphans,
                         counter drift)
  - commission_routing: every commission references a real position
                        whose matrix_id, level, and pack_price are
                        internally consistent
  - completion_bonus:   matrices marked complete have a paid bonus;
                        active matrices with 39 positions are caught

Read-only. See app/health_scanners.py for framework.
"""

from __future__ import annotations
from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session

from .health_scanners import (
    register_scanner, make_issue, aggregate_status, make_result,
    SEV_OK, SEV_WARNING, SEV_CRITICAL,
)
from .database import (
    User, CreditMatrix, CreditMatrixPosition, CreditMatrixCommission,
    MATRIX_WIDTH, MATRIX_DEPTH,
)

# Matrix totals match those in credit_matrix.py:
# 3 + 9 + 27 = 39 downline positions (excluding the level-0 owner).
MATRIX_MAX_DOWNLINE = 3 + 9 + 27


# ─────────────────────────────────────────────────────────────────
#  1. MATRIX INTEGRITY
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="matrix_integrity",
    label="Matrix tree integrity",
    tier=1,
    category="matrix",
    description=(
        "Scans every active and completed matrix for structural issues: "
        "duplicate or gappy position_index within sibling sets, orphan "
        "positions whose parent doesn't exist, owner positions (level 0) "
        "missing or duplicated, and cached positions_filled counters that "
        "disagree with the live position count."
    ),
)
def scan_matrix_integrity(db: Session) -> dict:
    issues = []
    matrices = db.query(CreditMatrix).all()

    matrices_scanned = 0
    positions_scanned = 0

    for matrix in matrices:
        matrices_scanned += 1
        positions = db.query(CreditMatrixPosition).filter(
            CreditMatrixPosition.matrix_id == matrix.id
        ).all()
        positions_scanned += len(positions)

        # Look up owner username for human-readable subject
        owner = db.query(User).filter(User.id == matrix.owner_id).first()
        owner_name = owner.username if owner else f"user_id={matrix.owner_id}"
        subject_base = f"matrix #{matrix.id} ({owner_name} / {matrix.pack_key})"

        # 1a. There must be exactly one level-0 position (the owner)
        level0 = [p for p in positions if p.level == 0]
        if len(level0) == 0:
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="missing_owner_position",
                subject=subject_base,
                details={
                    "matrix_id": matrix.id, "owner_id": matrix.owner_id,
                    "advance_number": matrix.advance_number,
                },
                suggested_action=(
                    f"Run /admin/repair/matrix-indices/{matrix.id}?confirm=true "
                    "after dry-run review"
                ),
            ))
        elif len(level0) > 1:
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="duplicate_owner_position",
                subject=subject_base,
                details={
                    "matrix_id": matrix.id, "owner_id": matrix.owner_id,
                    "level0_count": len(level0),
                    "position_ids": [p.id for p in level0],
                },
                suggested_action="Manual DB review — duplicate root positions",
            ))

        # 1b. Owner position user_id must match matrix owner
        for p in level0:
            if p.user_id != matrix.owner_id:
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="owner_position_user_mismatch",
                    subject=subject_base,
                    details={
                        "position_id": p.id, "position_user_id": p.user_id,
                        "matrix_owner_id": matrix.owner_id,
                    },
                    suggested_action="Manual DB review — root position wrong user",
                ))

        # 1c. position_index gaps and duplicates within each parent's children
        # Group children by parent_position_id.
        by_parent = defaultdict(list)
        for p in positions:
            if p.parent_position_id is not None:
                by_parent[p.parent_position_id].append(p)

        for parent_id, children in by_parent.items():
            indices = sorted(p.position_index for p in children)
            # Duplicates: any index appearing twice
            duplicates = sorted(set(
                i for i in indices if indices.count(i) > 1
            ))
            # Gaps: expected 0..n-1 contiguous; if max index >= len, there are gaps
            expected = list(range(len(indices)))
            gaps = sorted(set(expected) - set(indices))

            if duplicates:
                issues.append(make_issue(
                    severity=SEV_WARNING,
                    kind="position_index_duplicate",
                    subject=subject_base,
                    details={
                        "matrix_id": matrix.id,
                        "parent_position_id": parent_id,
                        "child_count": len(children),
                        "duplicate_indices": duplicates,
                        "actual_indices": indices,
                        "child_positions": [
                            {"id": p.id, "user_id": p.user_id, "position_index": p.position_index}
                            for p in children
                        ],
                    },
                    suggested_action=(
                        f"Run /admin/repair/matrix-indices/{matrix.id}?confirm=true "
                        "to renumber siblings to 0..N-1 by creation order. "
                        "Display layer renders by array order (not index) so "
                        "members aren't dropped — but the data should be repaired."
                    ),
                ))

            if gaps and not duplicates:
                # Pure gap (no duplicates) means deleted-and-not-renumbered.
                issues.append(make_issue(
                    severity=SEV_WARNING,
                    kind="position_index_gap",
                    subject=subject_base,
                    details={
                        "matrix_id": matrix.id,
                        "parent_position_id": parent_id,
                        "child_count": len(children),
                        "missing_indices": gaps,
                        "actual_indices": indices,
                    },
                    suggested_action=f"Run /admin/repair/matrix-indices/{matrix.id}?confirm=true",
                ))

            # Too many children for matrix width — indicates a placement bug
            if len(children) > MATRIX_WIDTH:
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="parent_overfilled",
                    subject=subject_base,
                    details={
                        "matrix_id": matrix.id,
                        "parent_position_id": parent_id,
                        "child_count": len(children),
                        "max_per_parent": MATRIX_WIDTH,
                    },
                    suggested_action="Manual review — placement engine exceeded MATRIX_WIDTH",
                ))

        # 1d. Orphan positions — parent_position_id points at a non-existent position
        position_ids = {p.id for p in positions}
        for p in positions:
            if p.parent_position_id is not None and p.parent_position_id not in position_ids:
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="orphan_position",
                    subject=subject_base,
                    details={
                        "matrix_id": matrix.id,
                        "position_id": p.id,
                        "missing_parent_id": p.parent_position_id,
                        "user_id": p.user_id,
                    },
                    suggested_action="Manual DB review — referential integrity broken",
                ))

        # 1e. Cached positions_filled drift vs live count
        # Standing rule: live ledger is truth. Cached counter is auxiliary.
        #
        # POST-RETIREMENT (30 May 2026): the matrix is retired. complete_matrix
        # and the placement engine were removed, so NOTHING in the live payout
        # path reads positions_filled anymore — these matrices are frozen
        # historical rows. The drift is therefore purely cosmetic record-keeping
        # and can never affect money or completion. It used to escalate to
        # CRITICAL on the theory that the completion check read this counter;
        # that path no longer exists. Emit a single WARNING for the record, no
        # critical. (See credit_matrix.py MATRIX_RETIREMENT_DATE.)
        downline_actual = len([p for p in positions if p.level > 0])
        if matrix.positions_filled != downline_actual:
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="positions_filled_drift",
                subject=subject_base,
                details={
                    "matrix_id": matrix.id,
                    "cached_positions_filled": matrix.positions_filled,
                    "live_downline_count": downline_actual,
                    "drift": matrix.positions_filled - downline_actual,
                },
                suggested_action=(
                    "Cosmetic only. Matrix retired 30 May 2026 — no completion "
                    "or payout path reads positions_filled, and the display layer "
                    "uses the live count. This is a frozen historical row; the "
                    "stale counter cannot affect money. Safe to leave, or run "
                    "repair to recompute if you want the cached value tidy."
                ),
            ))

    # Build the result
    status = aggregate_status(issues)
    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)

    if not issues:
        headline = f"All {matrices_scanned} matrices structurally clean"
    else:
        parts = []
        if crit_count:
            parts.append(f"{crit_count} critical")
        if warn_count:
            parts.append(f"{warn_count} warning")
        headline = f"{', '.join(parts)} across {matrices_scanned} matrices"

    return {
        "status": status,
        "summary": {
            "matrices_scanned": matrices_scanned,
            "positions_scanned": positions_scanned,
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "headline": headline,
        },
        "issues": issues,
    }


# ─────────────────────────────────────────────────────────────────
#  2. COMMISSION ROUTING AUDIT
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="commission_routing",
    label="Commission routing audit",
    tier=1,
    category="commission",
    description=(
        "For each CreditMatrixCommission row, verify: (a) the referenced "
        "position exists and belongs to the same matrix, (b) the level "
        "matches the position's tree level, (c) the rate matches the "
        "expected rate for direct (15%) vs spillover (10%) vs completion "
        "(10%), (d) the amount equals pack_price × rate, (e) the matrix "
        "is owned by the earner."
    ),
)
def scan_commission_routing(db: Session) -> dict:
    issues = []
    commissions = db.query(CreditMatrixCommission).all()

    # Pre-load matrices for fast lookup
    matrices = {m.id: m for m in db.query(CreditMatrix).all()}
    positions = {p.id: p for p in db.query(CreditMatrixPosition).all()}
    users = {u.id: u for u in db.query(User).all()}

    # Matrix-era expected rates (apply ONLY to matrix_level / matrix_completion
    # rows that predate the 30 May 2026 retirement).
    EXPECTED_DIRECT = Decimal("0.15")
    EXPECTED_SPILLOVER = Decimal("0.10")
    EXPECTED_COMPLETION = Decimal("0.10")

    # Live (post-retirement) flat-referral expectation. See credit_matrix.py:
    # purchase_credit_pack writes commission_type='direct_referral' with
    # matrix_id=None, from_position_id=None, level=1, rate=0.20.
    from .credit_matrix import FLAT_REFERRAL_RATE  # canonical 0.20

    for c in commissions:
        earner = users.get(c.earner_id)
        earner_name = earner.username if earner else f"user_id={c.earner_id}"
        subject = f"commission #{c.id} (to {earner_name}, ${float(c.amount):.2f})"

        # ── Post-retirement flat-20% direct path (live money) ──────────────
        # These are NOT matrix commissions. The 3×3 matrix was retired 30 May
        # 2026; every credit-pack purchase now pays a flat 20% to the buyer's
        # direct sponsor with no matrix, position, level, or spillover. Auditing
        # them against the matrix-era invariants (which expect a real matrix_id
        # and from_position_id) produces permanent false-positive criticals.
        # Audit them against their OWN invariants so the live path still has
        # coverage, then skip the matrix-era checks below.
        if c.commission_type == "direct_referral":
            flat_issues = []
            if c.matrix_id is not None:
                flat_issues.append("matrix_id should be NULL (no matrix post-retirement)")
            if c.from_position_id is not None:
                flat_issues.append("from_position_id should be NULL")
            if c.level != 1:
                flat_issues.append(f"level should be 1 (got {c.level})")
            if abs(Decimal(str(c.rate)) - FLAT_REFERRAL_RATE) > Decimal("0.001"):
                flat_issues.append(
                    f"rate should be {float(FLAT_REFERRAL_RATE)} (got {float(c.rate)})"
                )
            expected_amt = (Decimal(str(c.pack_price)) * FLAT_REFERRAL_RATE)
            if abs(Decimal(str(c.amount)) - expected_amt) > Decimal("0.01"):
                flat_issues.append(
                    f"amount should be pack_price × 0.20 = {float(expected_amt):.2f} "
                    f"(got {float(c.amount):.2f})"
                )
            if not earner:
                flat_issues.append(f"earner_id {c.earner_id} not found")

            if flat_issues:
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="flat_referral_invariant_violation",
                    subject=subject,
                    details={
                        "commission_id": c.id,
                        "violations": flat_issues,
                        "rate": float(c.rate),
                        "amount": float(c.amount),
                        "pack_price": float(c.pack_price),
                        "matrix_id": c.matrix_id,
                        "from_position_id": c.from_position_id,
                        "level": c.level,
                    },
                    suggested_action=(
                        "Live flat-20% referral row violates the post-retirement "
                        "invariant (matrix_id NULL / from_position_id NULL / "
                        "level 1 / rate 0.20 / amount = price×0.20). Check "
                        "purchase_credit_pack."
                    ),
                ))
            continue

        # a) Matrix must exist
        matrix = matrices.get(c.matrix_id)
        if not matrix:
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="commission_orphan_matrix",
                subject=subject,
                details={
                    "commission_id": c.id, "missing_matrix_id": c.matrix_id,
                    "amount": float(c.amount),
                },
                suggested_action="Manual DB review — commission references deleted matrix",
            ))
            continue

        # b) Earner must own the matrix
        if matrix.owner_id != c.earner_id:
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="commission_wrong_earner",
                subject=subject,
                details={
                    "commission_id": c.id, "matrix_id": c.matrix_id,
                    "matrix_owner_id": matrix.owner_id, "earner_id": c.earner_id,
                },
                suggested_action="Manual DB review — money routed to non-owner",
            ))

        # c) Completion commissions have from_position_id=0 by convention;
        #    level commissions must reference a real position
        if c.commission_type == "matrix_completion":
            # Verify the rate
            if abs(c.rate - EXPECTED_COMPLETION) > Decimal("0.001"):
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="completion_rate_mismatch",
                    subject=subject,
                    details={
                        "commission_id": c.id, "actual_rate": float(c.rate),
                        "expected_rate": float(EXPECTED_COMPLETION),
                    },
                    suggested_action="Manual review — completion rate ≠ 10%",
                ))
            # Verify the amount = 39 × pack_price × 10%
            expected_amount = Decimal(str(MATRIX_MAX_DOWNLINE)) * Decimal(str(c.pack_price)) * EXPECTED_COMPLETION
            if abs(Decimal(str(c.amount)) - expected_amount) > Decimal("0.01"):
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="completion_amount_mismatch",
                    subject=subject,
                    details={
                        "commission_id": c.id, "actual_amount": float(c.amount),
                        "expected_amount": float(expected_amount),
                        "pack_price": float(c.pack_price),
                    },
                    suggested_action="Manual review — completion bonus calc wrong",
                ))
        else:
            # Level commission — must reference a real position
            position = positions.get(c.from_position_id)
            if not position:
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="commission_orphan_position",
                    subject=subject,
                    details={
                        "commission_id": c.id,
                        "missing_position_id": c.from_position_id,
                    },
                    suggested_action="Manual DB review — commission's from_position deleted",
                ))
                continue

            # Position must be in the same matrix
            if position.matrix_id != c.matrix_id:
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="commission_position_matrix_mismatch",
                    subject=subject,
                    details={
                        "commission_id": c.id, "commission_matrix_id": c.matrix_id,
                        "position_matrix_id": position.matrix_id,
                    },
                    suggested_action="Manual review — commission attached to wrong matrix",
                ))

            # Level on the commission should match position level
            if c.level != position.level:
                issues.append(make_issue(
                    severity=SEV_WARNING,
                    kind="commission_level_mismatch",
                    subject=subject,
                    details={
                        "commission_id": c.id, "commission_level": c.level,
                        "position_level": position.level,
                    },
                    suggested_action=(
                        "Recompute — commission_level should always equal "
                        "position.level at insert time"
                    ),
                ))

            # Rate must match direct/spillover convention
            buyer = users.get(position.user_id)
            if buyer:
                is_direct = (buyer.sponsor_id == matrix.owner_id)
                expected_rate = EXPECTED_DIRECT if is_direct else EXPECTED_SPILLOVER
                expected_type = "matrix_direct" if is_direct else "matrix_spillover"
                if abs(c.rate - expected_rate) > Decimal("0.001"):
                    issues.append(make_issue(
                        severity=SEV_CRITICAL,
                        kind="commission_rate_mismatch",
                        subject=subject,
                        details={
                            "commission_id": c.id,
                            "buyer_id": buyer.id, "buyer_username": buyer.username,
                            "is_direct": is_direct,
                            "actual_rate": float(c.rate),
                            "expected_rate": float(expected_rate),
                            "actual_type": c.commission_type,
                            "expected_type": expected_type,
                        },
                        suggested_action=(
                            "Manual review — rate doesn't match buyer's "
                            "sponsorship relationship to matrix owner"
                        ),
                    ))

                # Amount must equal pack_price × rate
                expected_amount = Decimal(str(c.pack_price)) * c.rate
                if abs(Decimal(str(c.amount)) - expected_amount) > Decimal("0.01"):
                    issues.append(make_issue(
                        severity=SEV_CRITICAL,
                        kind="commission_amount_mismatch",
                        subject=subject,
                        details={
                            "commission_id": c.id,
                            "actual_amount": float(c.amount),
                            "expected_amount": float(expected_amount),
                            "pack_price": float(c.pack_price),
                            "rate": float(c.rate),
                        },
                        suggested_action="Manual review — amount ≠ pack_price × rate",
                    ))

    status = aggregate_status(issues)
    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)

    if not issues:
        headline = f"All {len(commissions)} commissions correctly routed"
    else:
        headline = f"{len(issues)} issues across {len(commissions)} commissions"

    return {
        "status": status,
        "summary": {
            "commissions_scanned": len(commissions),
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "headline": headline,
        },
        "issues": issues,
    }


# ─────────────────────────────────────────────────────────────────
#  3. COMPLETION BONUS AUDIT
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="completion_bonus",
    label="Completion bonus audit",
    tier=1,
    category="commission",
    description=(
        "Verifies the completion lifecycle: every completed matrix has a "
        "matrix_completion commission paid, every active matrix at 39/39 "
        "is correctly transitioning, and no matrix has been double-paid "
        "completion bonus across advance cycles."
    ),
)
def scan_completion_bonus(db: Session) -> dict:
    issues = []
    matrices = db.query(CreditMatrix).all()

    # Pre-load completion commissions grouped by matrix_id
    completion_commissions = db.query(CreditMatrixCommission).filter(
        CreditMatrixCommission.commission_type == "matrix_completion"
    ).all()
    completions_by_matrix = defaultdict(list)
    for c in completion_commissions:
        completions_by_matrix[c.matrix_id].append(c)

    users = {u.id: u for u in db.query(User).all()}

    for matrix in matrices:
        owner = users.get(matrix.owner_id)
        owner_name = owner.username if owner else f"user_id={matrix.owner_id}"
        subject = (
            f"matrix #{matrix.id} ({owner_name} / {matrix.pack_key} "
            f"adv {matrix.advance_number})"
        )

        # Live downline count
        live_downline = db.query(CreditMatrixPosition).filter(
            CreditMatrixPosition.matrix_id == matrix.id,
            CreditMatrixPosition.level > 0,
        ).count()

        comms = completions_by_matrix.get(matrix.id, [])

        if matrix.status == "completed":
            # Should have exactly one completion commission
            if len(comms) == 0:
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="completed_no_bonus",
                    subject=subject,
                    details={
                        "matrix_id": matrix.id,
                        "completed_at": (
                            matrix.completed_at.isoformat()
                            if matrix.completed_at else None
                        ),
                        "completion_bonus_paid_field": float(matrix.completion_bonus_paid or 0),
                    },
                    suggested_action=(
                        "Manual review — matrix marked completed but no "
                        "matrix_completion commission was paid"
                    ),
                ))
            elif len(comms) > 1:
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="completed_double_bonus",
                    subject=subject,
                    details={
                        "matrix_id": matrix.id,
                        "bonus_commission_count": len(comms),
                        "commission_ids": [c.id for c in comms],
                        "total_amount_paid": float(sum(c.amount for c in comms)),
                    },
                    suggested_action=(
                        "Manual review — completion bonus paid more than once "
                        "for this matrix advance"
                    ),
                ))
            # The completed matrix should have had 39 downline positions when it completed.
            # We can't check the historical count, but if a matrix is currently "completed"
            # and shows < 39, something un-filled it after completion.
            if live_downline != MATRIX_MAX_DOWNLINE:
                issues.append(make_issue(
                    severity=SEV_WARNING,
                    kind="completed_position_count_mismatch",
                    subject=subject,
                    details={
                        "matrix_id": matrix.id,
                        "live_downline": live_downline,
                        "expected": MATRIX_MAX_DOWNLINE,
                    },
                    suggested_action=(
                        "Position records changed after completion — "
                        "investigate to confirm no positions were lost"
                    ),
                ))

        elif matrix.status == "active":
            # Active matrix at 39/39 should have transitioned to completed
            if live_downline >= MATRIX_MAX_DOWNLINE:
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="active_should_be_complete",
                    subject=subject,
                    details={
                        "matrix_id": matrix.id,
                        "live_downline": live_downline,
                        "status": matrix.status,
                    },
                    suggested_action=(
                        "Manual review — matrix is full but never transitioned "
                        "to completed; member is owed a completion bonus"
                    ),
                ))
            # An active matrix should NOT have a completion commission yet
            if comms:
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="active_with_bonus",
                    subject=subject,
                    details={
                        "matrix_id": matrix.id,
                        "bonus_commission_count": len(comms),
                        "commission_ids": [c.id for c in comms],
                    },
                    suggested_action=(
                        "Manual review — matrix is active but a completion "
                        "bonus has been paid"
                    ),
                ))

    status = aggregate_status(issues)
    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)

    if not issues:
        headline = f"All {len(matrices)} matrices' completion state consistent"
    else:
        headline = f"{len(issues)} issues across {len(matrices)} matrices"

    return {
        "status": status,
        "summary": {
            "matrices_scanned": len(matrices),
            "completion_commissions_scanned": len(completion_commissions),
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "headline": headline,
        },
        "issues": issues,
    }
