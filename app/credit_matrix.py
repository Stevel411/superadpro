"""
Credit Matrix Engine — 3×3 Forced Matrix with Commission Payouts
================================================================
Each of the 8 credit packs has its OWN independent 3×3 matrix.
A member who buys all 8 packs has 8 separate matrices filling.

Handles: matrix creation (per pack), position placement (BFS spillover),
commission calculation, and matrix advancing.

COMMISSION MODEL:
  Commission rate is based on RELATIONSHIP, not matrix level:
    DIRECT REFERRAL (you personally recruited them) = 15%
    SPILLOVER (someone else in your tree recruited them) = 10%

  Running commission per purchase pays up to 3 upline levels
  (15% direct at L1 + 10% spillover at L2 + 10% spillover at L3 = up to 35%).

  COMPLETION BONUS: SCRAPPED 29 May 2026 (Steve). The 10%-of-matrix-value
  bonus stacked on top of the 35% running commission and broke the budget —
  running + bonus + the 50% AI cost exceeded 100% of pack revenue at full
  consumption. Running commissions stay (they fit the 50% non-AI half, ~15%
  margin). Matrices still complete and cycle; there is no bonus payout.

PACK PRICE SPLIT:
  50% → AI cost budget (covers Creative Studio token usage)
  15% → Company revenue
  35% → Matrix commissions (15% + 10% + 10%)

TERMINOLOGY: "Advance" not "Cycle" — when a matrix completes,
the member advances to a new matrix for that pack.
"""

from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError

from .database import (
    User, CreditMatrix, CreditMatrixPosition, CreditMatrixCommission,
    CreditPackPurchase, SuperSceneCredit,
    CREDIT_PACKS, MATRIX_WIDTH, MATRIX_DEPTH, MATRIX_COMMISSION_RATES,
)

import logging
logger = logging.getLogger(__name__)

# Total downline positions in a 3×3 matrix: 3 + 9 + 27 = 39
MATRIX_MAX_DOWNLINE = sum(MATRIX_WIDTH ** i for i in range(1, MATRIX_DEPTH + 1))


# ═══════════════════════════════════════════════════════════════
#  MATRIX CREATION & LOOKUP (per pack)
# ═══════════════════════════════════════════════════════════════

def get_or_create_active_matrix(db: Session, user_id: int, pack_key: str) -> CreditMatrix:
    """Get the user's active matrix for a specific pack, or create one."""
    matrix = db.query(CreditMatrix).filter(
        and_(
            CreditMatrix.owner_id == user_id,
            CreditMatrix.pack_key == pack_key,
            CreditMatrix.status == "active",
        )
    ).first()

    if not matrix:
        # Count completed advances for this pack to set advance number
        completed = db.query(CreditMatrix).filter(
            and_(
                CreditMatrix.owner_id == user_id,
                CreditMatrix.pack_key == pack_key,
                CreditMatrix.status == "completed",
            )
        ).count()

        matrix = CreditMatrix(
            owner_id=user_id,
            pack_key=pack_key,
            advance_number=completed + 1,
            status="active",
            positions_filled=0,
        )
        db.add(matrix)
        db.flush()

        # Create the owner's root position at level 0
        root = CreditMatrixPosition(
            matrix_id=matrix.id,
            user_id=user_id,
            parent_position_id=None,
            level=0,
            position_index=0,
            pack_key=pack_key,
            pack_price=Decimal("0"),
        )
        db.add(root)
        db.flush()

    return matrix


# ═══════════════════════════════════════════════════════════════
#  BFS SPILLOVER PLACEMENT
# ═══════════════════════════════════════════════════════════════

def find_next_available_position(db: Session, matrix: CreditMatrix) -> CreditMatrixPosition:
    """
    BFS traversal to find the next open slot in the matrix.
    Fills left-to-right, top-to-bottom (breadth-first spillover).
    Returns the parent position where the new member should be placed.
    """
    positions = db.query(CreditMatrixPosition).filter(
        CreditMatrixPosition.matrix_id == matrix.id
    ).order_by(CreditMatrixPosition.level, CreditMatrixPosition.id).all()

    # Build children lookup
    children_map = {}
    for pos in positions:
        children_map.setdefault(pos.id, [])
        if pos.parent_position_id is not None:
            children_map.setdefault(pos.parent_position_id, [])
            children_map[pos.parent_position_id].append(pos)

    # BFS from root
    from collections import deque
    root = next((p for p in positions if p.level == 0), None)
    if not root:
        return None

    queue = deque([root])
    while queue:
        current = queue.popleft()
        if current.level >= MATRIX_DEPTH:
            continue
        current_children = children_map.get(current.id, [])
        if len(current_children) < MATRIX_WIDTH:
            return current
        for child in sorted(current_children, key=lambda c: c.position_index):
            queue.append(child)

    return None  # Matrix is full


# ═══════════════════════════════════════════════════════════════
#  MATRIX PLACEMENT (3 levels deep — matches 3×3 matrix shape)
# ═══════════════════════════════════════════════════════════════

def place_in_matrix(db: Session, buyer: User, pack_key: str, pack_price: Decimal, sponsor: User) -> dict:
    """
    Place a buyer into upline matrices — MAX 3 LEVELS UP in the sponsor tree.
    
    The 3×3 matrix shape defines the commission depth:
      Level 1 (3 slots):  buyer → sponsor
      Level 2 (9 slots):  buyer → sponsor → sponsor's sponsor
      Level 3 (27 slots): buyer → sponsor → sponsor's sponsor → one more up
    
    Beyond 3 levels, the buyer does NOT fill any more matrices.
    This caps total payout at 35% per purchase (15% + 10% + 10%).
    
    Commission rate per position:
      15% if the matrix owner personally recruited the buyer
      10% if the buyer is spillover (recruited by someone else)
    Completion bonus: SCRAPPED 29 May 2026 — matrices complete & cycle, no bonus payout.
    """
    result = {
        "success": False,
        "matrix_id": None,
        "position_id": None,
        "level": None,
        "commissions_paid": [],
        "matrices_filled": [],
        "error": None,
    }

    # Create the buyer's own matrix (so their downline fills it)
    get_or_create_active_matrix(db, buyer.id, pack_key)

    # Walk up the sponsor chain — MAX 3 LEVELS (matches matrix depth)
    current_id = buyer.id
    first_placement = True

    for depth in range(1, MATRIX_DEPTH + 1):  # 1, 2, 3 only
        current_user = db.query(User).filter(User.id == current_id).first()
        if not current_user or not current_user.sponsor_id:
            break

        upline_id = current_user.sponsor_id

        # Don't place buyer in their own matrix
        if upline_id == buyer.id:
            current_id = upline_id
            continue

        # Get or create the upline's active matrix for this pack
        matrix = get_or_create_active_matrix(db, upline_id, pack_key)

        # Skip if full
        if matrix.positions_filled >= MATRIX_MAX_DOWNLINE:
            current_id = upline_id
            continue

        # One person, one seat per advance
        already_seated = db.query(CreditMatrixPosition).filter(
            and_(
                CreditMatrixPosition.matrix_id == matrix.id,
                CreditMatrixPosition.user_id == buyer.id,
            )
        ).first()

        if already_seated:
            current_id = upline_id
            continue

        # Find next open BFS position
        parent_pos = find_next_available_position(db, matrix)
        if not parent_pos:
            current_id = upline_id
            continue

        # Determine position index
        existing_children = db.query(CreditMatrixPosition).filter(
            and_(
                CreditMatrixPosition.matrix_id == matrix.id,
                CreditMatrixPosition.parent_position_id == parent_pos.id,
            )
        ).count()

        new_level = parent_pos.level + 1

        position = CreditMatrixPosition(
            matrix_id=matrix.id,
            user_id=buyer.id,
            parent_position_id=parent_pos.id,
            level=new_level,
            position_index=existing_children,
            pack_key=pack_key,
            pack_price=pack_price,
        )
        db.add(position)
        db.flush()

        matrix.positions_filled += 1
        db.flush()

        # Pay commission — 15% direct or 10% spillover
        commissions = pay_matrix_commissions(db, matrix, position, buyer, pack_price)
        result["commissions_paid"].extend(commissions)

        entry = {
            "matrix_id": matrix.id,
            "owner_id": upline_id,
            "position_id": position.id,
            "level": new_level,
            "filled": matrix.positions_filled,
            "complete": False,
        }

        # Check for completion
        if matrix.positions_filled >= MATRIX_MAX_DOWNLINE:
            complete_matrix(db, matrix)
            entry["complete"] = True

        result["matrices_filled"].append(entry)

        if first_placement:
            result["matrix_id"] = matrix.id
            result["position_id"] = position.id
            result["level"] = new_level
            first_placement = False

        current_id = upline_id

    result["success"] = True
    return result


# ═══════════════════════════════════════════════════════════════
#  COMMISSION PAYMENTS
# ═══════════════════════════════════════════════════════════════

# Commission rates based on RELATIONSHIP, not matrix level
DIRECT_RATE = Decimal("0.15")           # You personally recruited them
SPILLOVER_RATE = Decimal("0.10")        # Someone else recruited them
# ── Flat-20% Nexus switch (30 May 2026) ──
# The matrix is retired. Every credit-pack purchase now pays a flat 20% to the
# buyer's DIRECT sponsor only — no levels, no spillover, no completion. Sponsor
# is always set (a real member, or the company account id 1 for no-ref signups,
# in which case the 20% accrues to the company). See purchase_credit_pack.
FLAT_REFERRAL_RATE = Decimal("0.20")
COMPLETION_BONUS_RATE = Decimal("0")    # SCRAPPED 29 May 2026 — no completion bonus (see complete_matrix)


def pay_matrix_commissions(
    db: Session,
    matrix: CreditMatrix,
    position: CreditMatrixPosition,
    buyer: User,
    pack_price: Decimal,
) -> list:
    """
    Pay commissions to the matrix owner.
    Rate is based on RELATIONSHIP, not position level:
      - 15% if the buyer is a DIRECT referral of the matrix owner
      - 10% if the buyer is SPILLOVER (recruited by someone else in the tree)
    """
    commissions_paid = []

    owner = db.query(User).filter(User.id == matrix.owner_id).first()
    if not owner:
        return commissions_paid

    # Don't pay commission to yourself
    if owner.id == buyer.id:
        logger.info(f"Matrix commission skipped: owner {owner.username} bought own pack")
        return commissions_paid

    # Determine relationship: did the matrix owner personally recruit this buyer?
    is_direct = (buyer.sponsor_id == owner.id)
    rate = DIRECT_RATE if is_direct else SPILLOVER_RATE
    commission_type = "matrix_direct" if is_direct else "matrix_spillover"

    amount = Decimal(str(pack_price)) * rate

    commission = CreditMatrixCommission(
        matrix_id=matrix.id,
        earner_id=owner.id,
        from_user_id=buyer.id,
        from_position_id=position.id,
        level=position.level,
        rate=rate,
        pack_price=pack_price,
        amount=amount,
        commission_type=commission_type,
        status="paid",
    )
    db.add(commission)

    # Credit the owner
    owner.balance = Decimal(str(owner.balance or 0)) + amount
    owner.total_earned = Decimal(str(owner.total_earned or 0)) + amount
    owner.matrix_earnings = Decimal(str(getattr(owner, 'matrix_earnings', 0) or 0)) + amount

    # Update matrix total
    matrix.total_earned = Decimal(str(matrix.total_earned or 0)) + amount

    db.flush()

    # Cache invalidation — owner balance/earnings just changed
    try:
        from .stats_cache import cache_invalidate_user
        cache_invalidate_user(owner.id)
    except Exception as e:
        logger.warning(f"cache_invalidate_user({owner.id}) failed in pay_matrix_commissions: {e}")

    commissions_paid.append({
        "earner": owner.username,
        "level": position.level,
        "is_direct": is_direct,
        "rate": float(rate),
        "amount": float(amount),
    })

    logger.info(
        f"Matrix commission: {owner.username} earned ${float(amount):.2f} "
        f"({'DIRECT 15%' if is_direct else 'SPILLOVER 10%'}) from {buyer.username} "
        f"pack={matrix.pack_key} pos=L{position.level}"
    )

    return commissions_paid


# ═══════════════════════════════════════════════════════════════
#  MATRIX COMPLETION & ADVANCING
# ═══════════════════════════════════════════════════════════════

def complete_matrix(db: Session, matrix: CreditMatrix):
    """Handle matrix completion — mark complete, create next advance. Completion bonus scrapped 29 May 2026."""
    owner = db.query(User).filter(User.id == matrix.owner_id).first()
    if not owner:
        return

    # Completion bonus SCRAPPED 29 May 2026 (Steve). The 10%-of-matrix-value
    # bonus (10% × 39 × pack price = 3.9 × price on a 39/39 fill) stacked ON TOP
    # of the up-to-35% running matrix commission. Running + bonus + the 50% AI
    # cost budget exceeded 100% of pack revenue at full consumption — i.e. it
    # could put the company underwater on a fully populated, fully consumed
    # pack. Running commissions (15% direct / 10% spillover) stay; they fit
    # inside the 50% non-AI half and leave ~15% company margin. The matrix
    # still completes and cycles to the next advance below — there is simply no
    # bonus payout.
    bonus_amount = Decimal("0")

    # Mark complete (matrix still cycles to a new advance — see below)
    matrix.status = "completed"
    matrix.completed_at = datetime.utcnow()
    matrix.completion_bonus_paid = bonus_amount
    db.flush()

    logger.info(
        f"Credit Matrix COMPLETED: {owner.username} pack={matrix.pack_key} "
        f"advance #{matrix.advance_number}, bonus=${float(bonus_amount):.2f}"
    )

    # Create next advance for the same pack
    new_matrix = CreditMatrix(
        owner_id=owner.id,
        pack_key=matrix.pack_key,
        advance_number=matrix.advance_number + 1,
        status="active",
        positions_filled=0,
    )
    db.add(new_matrix)
    db.flush()

    root = CreditMatrixPosition(
        matrix_id=new_matrix.id,
        user_id=owner.id,
        parent_position_id=None,
        level=0,
        position_index=0,
        pack_key=matrix.pack_key,
        pack_price=Decimal("0"),
    )
    db.add(root)
    db.flush()

    logger.info(f"Credit Matrix: advance #{new_matrix.advance_number} started for {owner.username} pack={matrix.pack_key}")


# ═══════════════════════════════════════════════════════════════
#  PURCHASE ENTRY POINT
# ═══════════════════════════════════════════════════════════════

def purchase_credit_pack(db: Session, buyer: User, pack_key: str, payment_ref: str = None, payment_method: str = "crypto") -> dict:
    """
    Main entry point: member buys a credit pack.
    1. Validate pack
    2. Record the purchase
    3. Award credits (SuperScene credits)
    4. Place in sponsor's matrix FOR THIS PACK
    5. Pay commissions
    Returns result dict.
    """
    pack = CREDIT_PACKS.get(pack_key)
    if not pack:
        return {"success": False, "error": f"Invalid pack: {pack_key}"}

    # ── Idempotency guard (28 May 2026) ────────────────────────────────────
    # This path awards credits AND pays the full matrix commission chain
    # (direct, spillover, completion). It had NO replay protection: a Stripe
    # webhook retry of a nexus_pack checkout would run the whole thing again —
    # double-awarding credits and double-paying every upline matrix commission
    # out of company funds. Stripe retries on any non-2xx, so this was a real
    # loaded gun, not a theoretical one.
    #
    # Fix: if a purchase with this payment_ref already exists, this is a replay
    # — return the prior result idempotently, paying/awarding nothing. The
    # unique partial index uniq_credit_pack_payment_ref is the race-proof
    # backstop (two concurrent retries hitting different replicas both pass the
    # SELECT, but the second INSERT below collides on the index and is caught).
    # Only guards refs we actually set (Stripe = stripe_{session}, NOWPayments
    # = order id); a null ref (legacy/manual) is unaffected.
    if payment_ref:
        prior = db.query(CreditPackPurchase).filter(
            CreditPackPurchase.payment_ref == payment_ref
        ).first()
        if prior:
            import logging as _logging
            _logging.getLogger(__name__).warning(
                f"DUPLICATE NEXUS PURCHASE BLOCKED (payment_ref={payment_ref}): "
                f"buyer={buyer.id} pack={pack_key} — replay of purchase {prior.id}. "
                f"Idempotency working; no credits/commissions re-issued."
            )
            return {
                "success": True,
                "idempotent_replay": True,
                "purchase_id": prior.id,
                "credits_awarded": prior.credits_awarded,
                "pack": prior.pack_key,
                "price": float(prior.pack_price),
                "message": "Pack already processed for this payment (idempotent).",
            }

    price = Decimal(str(pack["price"]))
    credits = pack["credits"]

    # Record the purchase
    purchase = CreditPackPurchase(
        user_id=buyer.id,
        pack_key=pack_key,
        pack_price=price,
        credits_awarded=credits,
        payment_method=payment_method,
        payment_ref=payment_ref,
        status="completed",
    )
    db.add(purchase)
    try:
        db.flush()  # surfaces a unique-index collision before we award anything
    except IntegrityError:
        # Race: a concurrent retry inserted the same payment_ref between our
        # SELECT above and this flush. The DB index refused our duplicate.
        # Roll back and return idempotently — the winning request did the work.
        db.rollback()
        import logging as _logging
        _logging.getLogger(__name__).warning(
            f"DUPLICATE NEXUS PURCHASE BLOCKED at index (payment_ref={payment_ref}): "
            f"buyer={buyer.id} pack={pack_key} — concurrent replay refused by DB."
        )
        won = db.query(CreditPackPurchase).filter(
            CreditPackPurchase.payment_ref == payment_ref
        ).first() if payment_ref else None
        return {
            "success": True,
            "idempotent_replay": True,
            "purchase_id": won.id if won else None,
            "credits_awarded": won.credits_awarded if won else credits,
            "pack": pack_key,
            "price": float(price),
            "message": "Pack already processed for this payment (idempotent, race).",
        }

    # Award SuperScene credits
    existing_credits = db.query(SuperSceneCredit).filter(SuperSceneCredit.user_id == buyer.id).first()
    if existing_credits:
        existing_credits.balance = (existing_credits.balance or 0) + credits
    else:
        new_credits = SuperSceneCredit(user_id=buyer.id, balance=credits)
        db.add(new_credits)
    db.flush()

    # ── Flat 20% referral commission (matrix retired 30 May 2026) ──
    # Pay the buyer's DIRECT sponsor 20% of the pack price. No matrix, no
    # spillover, no levels, no completion. sponsor_id is always set: a real
    # member earns, or the company account (id 1) earns when there's no
    # referrer (no-ref signups default sponsor_id=1 at registration), so the
    # 20% accrues to the company in that case. Commission is written to the
    # existing credit_matrix_commissions table (type='direct_referral') so the
    # central earnings reader (compute_user_earnings -> nexus_earnings) and
    # every dashboard that depends on it keep working unchanged.
    sponsor = None
    if buyer.sponsor_id:
        sponsor = db.query(User).filter(User.id == buyer.sponsor_id).first()

    commission_amount = None
    commission_id = None
    if sponsor:
        commission_amount = (Decimal(str(price)) * FLAT_REFERRAL_RATE).quantize(Decimal("0.000001"))
        com = CreditMatrixCommission(
            matrix_id=None,
            earner_id=sponsor.id,
            from_user_id=buyer.id,
            from_position_id=None,
            level=1,
            rate=FLAT_REFERRAL_RATE,
            pack_price=Decimal(str(price)),
            amount=commission_amount,
            commission_type="direct_referral",
            status="paid",
        )
        db.add(com)
        # Credit the sponsor's withdrawable balance (atomic increment to avoid
        # races when several of a sponsor's referrals buy at once).
        from sqlalchemy import func as _sqlfunc
        db.query(User).filter(User.id == sponsor.id).update(
            {User.balance: _sqlfunc.coalesce(User.balance, 0) + commission_amount},
            synchronize_session=False,
        )
        db.flush()
        commission_id = com.id

    db.commit()

    # Invalidate the sponsor's 60s earnings cache so the new commission shows
    # immediately on their dashboard.
    if sponsor:
        try:
            from .stats_cache import cache_invalidate_user
            cache_invalidate_user(sponsor.id)
        except Exception:
            pass

    return {
        "success": True,
        "purchase_id": purchase.id,
        "credits_awarded": credits,
        "pack": pack_key,
        "price": float(price),
        "referral_commission": {
            "sponsor_id": sponsor.id if sponsor else None,
            "amount": float(commission_amount) if commission_amount is not None else 0.0,
            "rate": float(FLAT_REFERRAL_RATE),
            "commission_id": commission_id,
            "to_company": bool(sponsor and sponsor.id == 1),
        } if sponsor else None,
    }


# ═══════════════════════════════════════════════════════════════
#  TREE & HISTORY QUERIES (per pack)
# ═══════════════════════════════════════════════════════════════

def get_matrix_tree(db: Session, user_id: int, pack_key: str = None) -> dict:
    """
    Get a user's active matrix tree for a specific pack.

    If pack_key is None and the user owns multiple active matrices (one per
    purchased tier), this picks the HIGHEST-tier matrix as the default. This
    is deterministic — unlike the prior .first() which let Postgres pick
    arbitrarily and produced confusing UX where the same user might see
    different matrices on different page loads.

    The "filled" counts are computed live from the credit_matrix_positions
    table rather than the cached matrix.positions_filled field, which has
    been observed to drift (see Steve's diagnostic 13 May 2026 — matrix #5
    had positions_filled=1 but the actual position count was 2). Standing
    rule: no denormalised counters; use live ledger reads.
    """
    query = db.query(CreditMatrix).filter(
        and_(CreditMatrix.owner_id == user_id, CreditMatrix.status == "active")
    )
    if pack_key:
        query = query.filter(CreditMatrix.pack_key == pack_key)

    if pack_key:
        # Caller asked for a specific pack — exact match or nothing
        matrix = query.first()
    else:
        # Caller didn't specify. Pick the highest-tier active matrix
        # the user owns. We pull all candidates and sort in Python because
        # the natural order ("ultimate" > "executive" > ... > "starter")
        # isn't alphabetical and isn't naturally reflected in the DB.
        candidates = query.all()
        if not candidates:
            matrix = None
        else:
            # Build a tier-priority map: index in CREDIT_PACKS defines tier
            # rank (later = higher). Unknown pack_keys sort to the bottom.
            pack_order = list(CREDIT_PACKS.keys())  # starter → ultimate
            def tier_rank(m):
                try:
                    return pack_order.index(m.pack_key or "")
                except ValueError:
                    return -1
            candidates.sort(key=tier_rank, reverse=True)
            matrix = candidates[0]

    if not matrix:
        return {"matrix": None, "tree": None, "stats": None}

    positions = db.query(CreditMatrixPosition).filter(
        CreditMatrixPosition.matrix_id == matrix.id
    ).order_by(CreditMatrixPosition.level, CreditMatrixPosition.position_index).all()

    # Build tree structure
    nodes = []
    for pos in positions:
        user = db.query(User).filter(User.id == pos.user_id).first()
        nodes.append({
            "id": pos.id,
            "user_id": pos.user_id,
            "username": user.username if user else "Unknown",
            "member_id": "SAP-" + str(pos.user_id).zfill(5),
            "level": pos.level,
            "position_index": pos.position_index,
            "parent_id": pos.parent_position_id,
            "pack_key": pos.pack_key,
            "pack_price": float(pos.pack_price or 0),
            "is_direct": (user.sponsor_id == user_id) if user else False,
            "created_at": pos.created_at.isoformat() if pos.created_at else None,
        })

    # Commission stats — already filtered to this matrix's earnings.
    # Group by COMMISSION TYPE (matrix_direct / matrix_spillover /
    # matrix_completion), NOT by tree level. The Nexus commission
    # structure is relationship-based, not level-based — see
    # docs/commission-spec.md section 3. An earlier version of this
    # function grouped by level which produced the misleading
    # "L1 25% / L2 15% / L3 10%" panel that contradicts spec.
    total_earned = db.query(CreditMatrixCommission).filter(
        and_(CreditMatrixCommission.matrix_id == matrix.id, CreditMatrixCommission.earner_id == user_id)
    ).all()

    earnings_direct = Decimal("0")
    earnings_spillover = Decimal("0")
    earnings_completion = Decimal("0")
    total = Decimal("0")
    for c in total_earned:
        if c.commission_type == "matrix_direct":
            earnings_direct += c.amount
        elif c.commission_type == "matrix_spillover":
            earnings_spillover += c.amount
        elif c.commission_type == "matrix_completion":
            earnings_completion += c.amount
        total += c.amount

    # Filled position counts by tree level (purely structural — for the
    # 3×3×3 spatial layout). These are NOT commission tiers; they're just
    # where each member sits in the tree shape.
    l1_filled = len([n for n in nodes if n["level"] == 1])
    l2_filled = len([n for n in nodes if n["level"] == 2])
    l3_filled = len([n for n in nodes if n["level"] == 3])
    live_filled = l1_filled + l2_filled + l3_filled

    # Filled counts by RELATIONSHIP (direct vs spillover). This is what
    # actually drives commission rate. is_direct was already computed
    # per-node in the loop above — re-use it. Level 0 (the owner themself)
    # is excluded; only downline counts.
    direct_filled = len([n for n in nodes if n["level"] > 0 and n["is_direct"]])
    spillover_filled = len([n for n in nodes if n["level"] > 0 and not n["is_direct"]])

    pack = CREDIT_PACKS.get(matrix.pack_key or "", {})
    pack_price = Decimal(str(pack.get("price", 0)))

    # Maximum earning potential for THIS matrix at full cycle —
    # honest figures based on the real commission structure, not
    # the fabricated "$4,690 per Nexus" that lived in the frontend.
    # Per spec: 3 direct × 15% + 36 spillover × 10%. Completion bonus scrapped
    # 29 May 2026 — no longer part of the projection (see complete_matrix).
    max_direct = Decimal("3") * pack_price * Decimal("0.15")
    max_spillover = Decimal("36") * pack_price * Decimal("0.10")
    max_completion = Decimal("0")  # completion bonus scrapped 29 May 2026
    max_total_per_cycle = max_direct + max_spillover

    return {
        "matrix": {
            "id": matrix.id,
            "pack_key": matrix.pack_key,
            "pack_label": pack.get("label", matrix.pack_key),
            "pack_price": float(pack_price),
            "pack_credits": pack.get("credits", 0),
            "advance_number": matrix.advance_number,
            "status": matrix.status,
            "positions_filled": live_filled,
            "max_positions": MATRIX_MAX_DOWNLINE,
            "fill_percentage": round(live_filled / MATRIX_MAX_DOWNLINE * 100, 1),
            "total_earned": float(matrix.total_earned or 0),
            "created_at": matrix.created_at.isoformat() if matrix.created_at else None,
        },
        "tree": nodes,
        "stats": {
            # Tree-level fill counts (spatial layout only, not commission tiers)
            "l1_filled": l1_filled,
            "l1_max": MATRIX_WIDTH,
            "l2_filled": l2_filled,
            "l2_max": MATRIX_WIDTH ** 2,
            "l3_filled": l3_filled,
            "l3_max": MATRIX_WIDTH ** 3,

            # Relationship-based fill counts (THIS drives commission rate)
            "direct_filled": direct_filled,
            "direct_max": MATRIX_WIDTH,   # only the 3 L1 slots can be filled directly
            "spillover_filled": spillover_filled,
            "spillover_max": MATRIX_MAX_DOWNLINE - MATRIX_WIDTH,  # 39 - 3 = 36

            # Relationship-based earnings (matches commission types in DB)
            "earnings_direct": float(earnings_direct),
            "earnings_spillover": float(earnings_spillover),
            "earnings_completion": float(earnings_completion),
            "total_earned": float(total),

            # Honest max-cycle potential figures for this matrix's pack tier
            "max_direct_per_cycle": float(max_direct),
            "max_spillover_per_cycle": float(max_spillover),
            "max_completion_per_cycle": float(max_completion),
            "max_total_per_cycle": float(max_total_per_cycle),
        },
    }


def get_all_matrices(db: Session, user_id: int) -> dict:
    """
    Get all 8 matrices for a user — one per pack.
    Returns which packs have active matrices (purchased) and which don't.

    Uses live position counts (excluding owner) rather than the
    matrix.positions_filled cached field, which has been observed to
    drift out of sync. See standing rule: no denormalised counters.
    """
    result = {"purchased": [], "locked": [], "total_earned": 0, "total_filled": 0}

    for pack_key, pack in CREDIT_PACKS.items():
        # Check if user has ever purchased this pack
        has_purchased = db.query(CreditPackPurchase).filter(
            and_(
                CreditPackPurchase.user_id == user_id,
                CreditPackPurchase.pack_key == pack_key,
                CreditPackPurchase.status == "completed",
            )
        ).first() is not None

        # Check if user has a matrix for this pack (as owner) — pick the
        # current (highest advance_number) one if there are multiple
        matrix = db.query(CreditMatrix).filter(
            and_(CreditMatrix.owner_id == user_id, CreditMatrix.pack_key == pack_key)
        ).order_by(CreditMatrix.advance_number.desc()).first()

        # Count completed advances
        completed_advances = db.query(CreditMatrix).filter(
            and_(
                CreditMatrix.owner_id == user_id,
                CreditMatrix.pack_key == pack_key,
                CreditMatrix.status == "completed",
            )
        ).count()

        # Live position count for the current matrix — excluding the owner
        # (level 0) because the owner doesn't "count" against the 39 downline
        # slots. Standing rule: no denormalised counters.
        if matrix:
            live_filled = db.query(CreditMatrixPosition).filter(
                and_(
                    CreditMatrixPosition.matrix_id == matrix.id,
                    CreditMatrixPosition.level != 0,
                )
            ).count()
        else:
            live_filled = 0

        pack_info = {
            "pack_key": pack_key,
            "label": pack["label"],
            "price": pack["price"],
            "credits": pack["credits"],
            "has_matrix": matrix is not None,
            "positions_filled": live_filled,
            "max_positions": MATRIX_MAX_DOWNLINE,
            "total_earned": float(matrix.total_earned or 0) if matrix else 0,
            "advance_number": matrix.advance_number if matrix else 0,
            "completed_advances": completed_advances,
            "status": matrix.status if matrix else "none",
        }

        if has_purchased or (matrix is not None):
            result["purchased"].append(pack_info)
            result["total_earned"] += pack_info["total_earned"]
            result["total_filled"] += pack_info["positions_filled"]
        else:
            result["locked"].append(pack_info)

    return result


def get_matrix_history(db: Session, user_id: int, pack_key: str = None) -> list:
    """Get all completed matrix advances for a user, optionally filtered by pack."""
    query = db.query(CreditMatrix).filter(CreditMatrix.owner_id == user_id)
    if pack_key:
        query = query.filter(CreditMatrix.pack_key == pack_key)

    matrices = query.order_by(CreditMatrix.pack_key, CreditMatrix.advance_number.desc()).all()

    return [{
        "id": m.id,
        "pack_key": m.pack_key,
        "advance_number": m.advance_number,
        "status": m.status,
        "positions_filled": m.positions_filled,
        "total_earned": float(m.total_earned or 0),
        "completion_bonus": float(m.completion_bonus_paid or 0),
        "completed_at": m.completed_at.isoformat() if m.completed_at else None,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    } for m in matrices]
