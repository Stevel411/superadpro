"""
SuperAdPro — Tier 2 Health Scanners
====================================

Member State & Lifecycle. Surfaces:
  - balance / total_earned / total_withdrawn drift vs live ledger sums
  - is_active vs membership_tier disagreement (free↔inactive, basic/pro↔active)
  - orphan / circular / abnormal referral relationships
  - pack ownership inconsistencies (matrix without purchase, or vice versa)

Each scanner is read-only. Live ledger is truth per Steve's standing rule.
"""

from __future__ import annotations
from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func

from .health_scanners import (
    register_scanner, make_issue, aggregate_status,
    SEV_OK, SEV_WARNING, SEV_CRITICAL,
)
from .database import (
    User, Commission, Withdrawal, CourseCommission,
    CreditMatrix, CreditMatrixCommission, CreditMatrixPosition,
    CreditPackPurchase,
)

# Drift threshold — small rounding diffs (sub-cent) aren't worth flagging.
DRIFT_CENTS_THRESHOLD = Decimal("0.01")


# ─────────────────────────────────────────────────────────────────
#  4. MEMBER STATE ANOMALIES
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="member_state_anomalies",
    label="Member state anomalies",
    tier=2,
    category="member",
    description=(
        "Verifies each member's cached counters against the live ledger: "
        "total_withdrawn vs sum of paid withdrawals, total_earned vs sum of "
        "paid commissions across all three commission tables. Also catches "
        "is_active / membership_tier disagreement: per the User model "
        "comment, 'both flags must agree (free ↔ inactive, basic/pro ↔ "
        "active).' Negative balances flagged as critical."
    ),
)
def scan_member_state_anomalies(db: Session) -> dict:
    issues = []
    users = db.query(User).all()

    # Pre-aggregate the ledger in bulk — much faster than 4 queries per user
    # for 88 users (and scales linearly as members grow).
    #
    # 1. paid withdrawals by user
    withdrawn_rows = db.query(
        Withdrawal.user_id,
        func.coalesce(func.sum(Withdrawal.amount_usdt), 0),
    ).filter(
        Withdrawal.status.in_(["paid", "completed"]),
    ).group_by(Withdrawal.user_id).all()
    withdrawn_by_user = {uid: float(amt) for uid, amt in withdrawn_rows}

    # 2. paid grid + membership + legacy nexus commissions
    comm_rows = db.query(
        Commission.to_user_id,
        func.coalesce(func.sum(Commission.amount_usdt), 0),
    ).filter(
        Commission.status == "paid",
    ).group_by(Commission.to_user_id).all()
    grid_etc_by_user = {uid: float(amt) for uid, amt in comm_rows}

    # 3. course commissions (no status field — all rows count)
    course_rows = db.query(
        CourseCommission.earner_id,
        func.coalesce(func.sum(CourseCommission.amount), 0),
    ).group_by(CourseCommission.earner_id).all()
    course_by_user = {uid: float(amt) for uid, amt in course_rows}

    # 4. credit matrix commissions (status defaults paid)
    nexus_rows = db.query(
        CreditMatrixCommission.earner_id,
        func.coalesce(func.sum(CreditMatrixCommission.amount), 0),
    ).filter(
        CreditMatrixCommission.status == "paid",
    ).group_by(CreditMatrixCommission.earner_id).all()
    nexus_by_user = {uid: float(amt) for uid, amt in nexus_rows}

    for user in users:
        subject = f"user {user.username} (id {user.id})"

        # ── a) total_withdrawn drift vs Withdrawal ledger ────────
        cached_withdrawn = float(user.total_withdrawn or 0)
        live_withdrawn = withdrawn_by_user.get(user.id, 0.0)
        if abs(Decimal(str(cached_withdrawn)) - Decimal(str(live_withdrawn))) > DRIFT_CENTS_THRESHOLD:
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="total_withdrawn_drift",
                subject=subject,
                details={
                    "user_id": user.id,
                    "cached_total_withdrawn": round(cached_withdrawn, 2),
                    "live_total_withdrawn": round(live_withdrawn, 2),
                    "drift": round(cached_withdrawn - live_withdrawn, 2),
                },
                suggested_action=(
                    "Cached counter is stale. Live readers (compute_total_withdrawn) "
                    "ignore this column already, so this is cosmetic. Future repair "
                    "tool: recompute counter from ledger."
                ),
            ))

        # ── b) total_earned drift vs combined commission ledger ──
        cached_earned = float(user.total_earned or 0)
        live_earned = (
            grid_etc_by_user.get(user.id, 0.0)
            + course_by_user.get(user.id, 0.0)
            + nexus_by_user.get(user.id, 0.0)
        )
        if abs(Decimal(str(cached_earned)) - Decimal(str(live_earned))) > DRIFT_CENTS_THRESHOLD:
            # Direction matters: if cached is HIGHER than live, the member's UI
            # is showing them too much earned (concerning). If LOWER, member is
            # under-credited on the display (also concerning, different fix).
            direction = "over_counting" if cached_earned > live_earned else "under_counting"
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="total_earned_drift",
                subject=subject,
                details={
                    "user_id": user.id,
                    "cached_total_earned": round(cached_earned, 2),
                    "live_total_earned": round(live_earned, 2),
                    "drift": round(cached_earned - live_earned, 2),
                    "direction": direction,
                    "components": {
                        "grid_membership_legacy": round(grid_etc_by_user.get(user.id, 0.0), 2),
                        "course": round(course_by_user.get(user.id, 0.0), 2),
                        "credit_matrix": round(nexus_by_user.get(user.id, 0.0), 2),
                    },
                },
                suggested_action=(
                    "Live readers (compute_user_earnings) ignore this cached "
                    "column. Cosmetic in member-facing pages, but the admin "
                    "user list shows the cached value. Recompute via future "
                    "repair tool."
                ),
            ))

        # ── c) Negative balance — should never happen ────────────
        if user.balance is not None and float(user.balance) < 0:
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="negative_balance",
                subject=subject,
                details={
                    "user_id": user.id,
                    "balance": float(user.balance),
                },
                suggested_action=(
                    "Manual review — balance should never go negative. "
                    "Indicates a withdrawal or deduction that overran "
                    "available funds."
                ),
            ))

        # ── d) is_active vs membership_tier disagreement ─────────
        # Under flat-pricing (locked 15 May 2026): free ↔ inactive,
        # partner/founding ↔ active. Admins are exempt — flagged
        # is_admin=True and may have any tier without payment.
        if not user.is_admin:
            tier = (user.membership_tier or "free").lower().strip()
            is_paid_tier = tier in ("partner", "founding")
            if is_paid_tier and not user.is_active:
                issues.append(make_issue(
                    severity=SEV_WARNING,
                    kind="paid_tier_inactive",
                    subject=subject,
                    details={
                        "user_id": user.id,
                        "membership_tier": tier,
                        "is_active": user.is_active,
                        "activated_at": user.activated_at.isoformat() if user.activated_at else None,
                        "membership_expires_at": user.membership_expires_at.isoformat() if user.membership_expires_at else None,
                    },
                    suggested_action=(
                        "Member's tier says paid but is_active=False — they "
                        "appear lapsed in any code that gates on is_active "
                        "but pages reading membership_tier alone will treat "
                        "them as paid. Investigate billing state."
                    ),
                ))
            elif not is_paid_tier and user.is_active:
                issues.append(make_issue(
                    severity=SEV_WARNING,
                    kind="free_tier_active",
                    subject=subject,
                    details={
                        "user_id": user.id,
                        "membership_tier": tier,
                        "is_active": user.is_active,
                    },
                    suggested_action=(
                        "Free-tier member is flagged active. Either tier was "
                        "wrongly downgraded after activation, or is_active "
                        "wasn't cleared when they cancelled. Investigate."
                    ),
                ))

        # ── e) Has earnings but no commission record ─────────────
        # If total_earned > $1 but live_earned is effectively zero, the
        # cached counter inflated without any underlying payment. Skip
        # users where total_earned is small (could just be rounding).
        if cached_earned > 1.0 and live_earned < 0.01:
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="phantom_earnings",
                subject=subject,
                details={
                    "user_id": user.id,
                    "cached_total_earned": round(cached_earned, 2),
                    "live_total_earned": round(live_earned, 2),
                },
                suggested_action=(
                    "total_earned > $1 but no paid commissions in any ledger "
                    "table. Either pre-launch test data left behind, or "
                    "commissions were reversed without resetting the counter."
                ),
            ))

    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)
    status = aggregate_status(issues)

    if not issues:
        headline = f"All {len(users)} members' state consistent"
    else:
        headline = f"{len(issues)} issues across {len(users)} members"

    return {
        "status": status,
        "summary": {
            "members_scanned": len(users),
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "headline": headline,
        },
        "issues": issues,
    }


# ─────────────────────────────────────────────────────────────────
#  5. REFERRAL GRAPH HEALTH
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="referral_graph_health",
    label="Referral graph health",
    tier=2,
    category="member",
    description=(
        "Scans the sponsor_id graph for structural problems: orphan "
        "sponsor_ids pointing at non-existent users, circular sponsorship "
        "(A→B→A), unusually deep sponsor chains that may indicate a bug, "
        "and non-admin members with no sponsor (sponsorless registrations)."
    ),
)
def scan_referral_graph_health(db: Session) -> dict:
    issues = []
    users = db.query(User).all()
    user_ids = {u.id for u in users}
    users_by_id = {u.id: u for u in users}

    # ── a) Orphan sponsor_id — points at user that doesn't exist ──
    for user in users:
        if user.sponsor_id is not None and user.sponsor_id not in user_ids:
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="orphan_sponsor",
                subject=f"user {user.username} (id {user.id})",
                details={
                    "user_id": user.id,
                    "missing_sponsor_id": user.sponsor_id,
                },
                suggested_action=(
                    "Sponsor user has been deleted. Commission routing on any "
                    "future purchase by this member will fail to find the "
                    "upline. Manually reassign sponsor_id to a valid user."
                ),
            ))

    # ── b) Non-admin members with no sponsor ──────────────────────
    # Self-signups without a referrer should still have SOMEONE as sponsor
    # — typically the admin/owner account. Sponsorless non-admins mean
    # commissions can't walk up the tree on their purchases.
    for user in users:
        if user.is_admin:
            continue
        if user.sponsor_id is None:
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="sponsorless_member",
                subject=f"user {user.username} (id {user.id})",
                details={
                    "user_id": user.id,
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                },
                suggested_action=(
                    "Non-admin member has no sponsor_id. Their purchases "
                    "won't pay upline commissions. Assign to admin (default "
                    "fallback) or to whoever they signed up under."
                ),
            ))

    # ── c) Circular sponsorship (A→B→A or longer cycles) ──────────
    # For each user, walk up the sponsor chain until we hit None, an
    # already-visited ID (cycle), an orphan, or a depth cap. Cap at
    # 200 to bound execution time on a corrupted dataset.
    DEPTH_CAP = 200
    chain_depths = []
    cycles_found = set()  # dedupe by the cycle members involved

    for user in users:
        visited = []
        current_id = user.id
        depth = 0
        while current_id is not None and depth < DEPTH_CAP:
            if current_id in visited:
                # Cycle detected. Report once per cycle by its sorted membership.
                cycle_start = visited.index(current_id)
                cycle_members = tuple(sorted(visited[cycle_start:]))
                if cycle_members not in cycles_found:
                    cycles_found.add(cycle_members)
                    member_names = [
                        users_by_id[mid].username if mid in users_by_id else f"id{mid}"
                        for mid in cycle_members
                    ]
                    issues.append(make_issue(
                        severity=SEV_CRITICAL,
                        kind="circular_sponsorship",
                        subject=f"cycle involving {', '.join(member_names)}",
                        details={
                            "cycle_user_ids": list(cycle_members),
                            "cycle_usernames": member_names,
                            "detected_from": user.id,
                        },
                        suggested_action=(
                            "Sponsorship cycle — commission walks will loop. "
                            "Code caps walks at 3 levels (Nexus) / 8 (Grid) "
                            "so not crash-causing, but logically broken. "
                            "Manually break the cycle by reassigning one "
                            "member's sponsor_id."
                        ),
                    ))
                break
            visited.append(current_id)
            current_user = users_by_id.get(current_id)
            if not current_user:
                break  # orphan — already flagged above
            current_id = current_user.sponsor_id
            depth += 1
        if depth >= DEPTH_CAP:
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="excessive_sponsor_depth",
                subject=f"user {user.username} (id {user.id})",
                details={
                    "user_id": user.id,
                    "depth_walked": depth,
                    "depth_cap": DEPTH_CAP,
                },
                suggested_action=(
                    "Sponsor chain longer than depth cap — likely an "
                    "undetected cycle or genuinely malformed graph. "
                    "Manual DB review."
                ),
            ))
        else:
            chain_depths.append(depth)

    # ── d) Abnormal sponsor depth distribution (informational) ────
    # Most healthy MLM trees have depths < 20. If we see a chain of
    # 50+, that's worth a warning even if not a cycle.
    if chain_depths:
        max_depth = max(chain_depths)
        if max_depth > 50:
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="unusually_deep_chain",
                subject=f"chain of depth {max_depth}",
                details={
                    "max_depth": max_depth,
                    "depth_cap": DEPTH_CAP,
                },
                suggested_action=(
                    "Genuine deep chain or undetected anomaly. Review "
                    "the sponsor chain manually."
                ),
            ))

    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)
    status = aggregate_status(issues)

    if not issues:
        headline = f"Referral graph clean across {len(users)} members"
    else:
        headline = f"{len(issues)} graph issues across {len(users)} members"

    return {
        "status": status,
        "summary": {
            "members_scanned": len(users),
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "max_chain_depth": max(chain_depths) if chain_depths else 0,
            "headline": headline,
        },
        "issues": issues,
    }


# ─────────────────────────────────────────────────────────────────
#  6. PACK OWNERSHIP CONSISTENCY
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="pack_ownership_consistency",
    label="Pack ownership consistency",
    tier=2,
    category="commission",
    description=(
        "Cross-checks credit_pack_purchases against credit_matrices. "
        "Every completed purchase should result in either an active "
        "matrix for the same pack tier or a completed prior advance. "
        "Empty matrices (positions_filled=0) without a backing "
        "purchase are flagged as never-used rows — matrices with any "
        "downline spillover positions are working as designed and "
        "are not flagged regardless of owner purchase status."
    ),
)
def scan_pack_ownership_consistency(db: Session) -> dict:
    issues = []

    purchases = db.query(CreditPackPurchase).all()
    matrices = db.query(CreditMatrix).all()
    users = {u.id: u for u in db.query(User).all()}

    # Group by (user_id, pack_key) for cross-checking
    purchases_by_key = defaultdict(list)
    for p in purchases:
        purchases_by_key[(p.user_id, p.pack_key)].append(p)

    matrices_by_key = defaultdict(list)
    for m in matrices:
        matrices_by_key[(m.owner_id, m.pack_key)].append(m)

    all_keys = set(purchases_by_key.keys()) | set(matrices_by_key.keys())

    for user_id, pack_key in all_keys:
        user = users.get(user_id)
        user_name = user.username if user else f"id={user_id}"
        subject = f"user {user_name} / {pack_key} pack"

        user_purchases = purchases_by_key.get((user_id, pack_key), [])
        user_matrices = matrices_by_key.get((user_id, pack_key), [])

        completed_purchases = [p for p in user_purchases if p.status == "completed"]
        active_matrices = [m for m in user_matrices if m.status == "active"]

        # ── a) Completed purchase but no matrix at all ────────────
        if completed_purchases and not user_matrices:
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="purchase_without_matrix",
                subject=subject,
                details={
                    "user_id": user_id, "pack_key": pack_key,
                    "completed_purchases": len(completed_purchases),
                    "purchase_ids": [p.id for p in completed_purchases],
                    "earliest_purchase": min(
                        p.created_at for p in completed_purchases
                    ).isoformat() if completed_purchases else None,
                },
                suggested_action=(
                    "Member paid for this pack but no matrix exists. "
                    "They've been billed without entering the matrix system — "
                    "no commissions can flow from their downline. Manually "
                    "create the matrix or refund."
                ),
            ))

        # ── b) Active matrix but no completed purchase ────────────
        # Admin grants are legitimate — flag only non-admin cases.
        #
        # 21 May 2026 (Steve flag): refined definition. Previous
        # version flagged ANY active matrix without a purchase as
        # "matrix_without_purchase", but the spec explicitly allows
        # matrices to be auto-created via downline spillover — a
        # founding member sponsored directly by SuperAdPro can have
        # a Starter matrix purely because one of their downline
        # bought a Starter pack. That walks up `place_in_matrix`,
        # auto-creates a Starter matrix for each upline, and works
        # exactly as the 3×3 design intends. Flagging those as
        # "orphan" produces a permanent noise floor that grows with
        # every legitimate spillover purchase.
        #
        # Real failure mode this check should still catch: a matrix
        # row exists in the DB with NO positions filled (not even
        # the owner's root) AND no purchase. That's genuinely never-
        # used empty state — an accidental row that could be cleaned
        # up without breaking commission flow.
        #
        # New rule: only flag matrices where positions_filled == 0
        # and owner has no purchase. Matrices with any spillover
        # positions are working as designed regardless of whether
        # the owner personally bought the pack.
        empty_matrices = [m for m in active_matrices if (m.positions_filled or 0) == 0]
        if empty_matrices and not completed_purchases:
            if user and user.is_admin:
                # Admin self-test or seed — informational, not an issue
                pass
            else:
                issues.append(make_issue(
                    severity=SEV_CRITICAL,
                    kind="matrix_without_purchase",
                    subject=subject,
                    details={
                        "user_id": user_id, "pack_key": pack_key,
                        "empty_matrix_count": len(empty_matrices),
                        "matrix_ids": [m.id for m in empty_matrices],
                    },
                    suggested_action=(
                        "Empty matrix (positions_filled=0) exists without a "
                        "completed purchase by the owner. Genuine never-used "
                        "row — safe to clean up. If purchase was attempted "
                        "and failed, check IPN handler / wallet payment "
                        "confirmation logs for that user."
                    ),
                ))

        # ── c) Multiple active matrices for same pack tier ────────
        if len(active_matrices) > 1:
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="duplicate_active_matrix",
                subject=subject,
                details={
                    "user_id": user_id, "pack_key": pack_key,
                    "active_matrix_count": len(active_matrices),
                    "matrices": [
                        {"id": m.id, "advance_number": m.advance_number,
                         "created_at": m.created_at.isoformat() if m.created_at else None}
                        for m in active_matrices
                    ],
                },
                suggested_action=(
                    "Two or more active matrices for the same pack tier. "
                    "Commissions on the next purchase will route ambiguously "
                    "(get_matrix_tree picks .first()). Pick the canonical "
                    "matrix (typically highest advance_number) and mark the "
                    "other(s) completed or merge manually."
                ),
            ))

        # ── d) advance_number sequencing ──────────────────────────
        all_user_matrices = sorted(
            user_matrices, key=lambda m: m.advance_number
        )
        if all_user_matrices:
            expected = list(range(1, len(all_user_matrices) + 1))
            actual = [m.advance_number for m in all_user_matrices]
            if actual != expected:
                issues.append(make_issue(
                    severity=SEV_WARNING,
                    kind="advance_number_gap",
                    subject=subject,
                    details={
                        "user_id": user_id, "pack_key": pack_key,
                        "expected_advances": expected,
                        "actual_advances": actual,
                        "matrix_ids_in_order": [m.id for m in all_user_matrices],
                    },
                    suggested_action=(
                        "advance_number values aren't 1..N sequential. A "
                        "matrix may have been deleted or skipped. Check "
                        "completion history."
                    ),
                ))

    # Summary
    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)
    status = aggregate_status(issues)

    if not issues:
        headline = (
            f"All {len(purchases)} purchases / {len(matrices)} matrices consistent"
        )
    else:
        headline = (
            f"{len(issues)} issues across {len(purchases)} purchases / "
            f"{len(matrices)} matrices"
        )

    return {
        "status": status,
        "summary": {
            "purchases_scanned": len(purchases),
            "matrices_scanned": len(matrices),
            "user_pack_pairs_checked": len(all_keys),
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "headline": headline,
        },
        "issues": issues,
    }
