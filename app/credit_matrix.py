"""
Credit Matrix Engine — 3×3 Forced Matrix with Commission Payouts
================================================================
Each of the 8 credit packs has its OWN independent 3×3 matrix.
A member who buys all 8 packs has 8 separate matrices filling.

Handles: matrix creation (per pack), position placement (BFS spillover),
commission calculation, matrix advancing, and completion bonuses.

COMMISSION MODEL:
  Commission rate is based on RELATIONSHIP, not matrix level:
    DIRECT REFERRAL (you personally recruited them) = 15%
    SPILLOVER (someone else in your tree recruited them) = 10%
    COMPLETION BONUS = 10% of total matrix value (39 × pack price)
  
  Total commission split = 35% of pack price:
    15% direct + 10% spillover + 10% completion bonus = 35%

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
#  MATRIX PLACEMENT (walks entire upline tree — like the Grid)
# ═══════════════════════════════════════════════════════════════

def place_in_matrix(db: Session, buyer: User, pack_key: str, pack_price: Decimal, sponsor: User) -> dict:
    """
    Place a buyer into their UPLINE TREE's matrices FOR THIS SPECIFIC PACK.
    
    Works exactly like the Grid — same mechanic, different shape:
    - Grid = 8 levels wide, 64 positions
    - Matrix = 3 levels wide (3+9+27), 39 positions
    
    Walk up the sponsor chain. For each upline member who has a matrix 
    for this pack with room, place the buyer in it via BFS.
    One person, one seat per matrix advance.
    
    Your entire downline tree fills your matrix — not just your 
    direct referrals. When the matrix hits 39/39, it advances.
    
    Commission: 15% if buyer is direct referral, 10% if spillover.
    Completion bonus: 10% of total matrix value at 39/39.
    """
    result = {
        "success": False,
        "matrices_filled": [],
        "commissions_paid": [],
        "error": None,
    }

    # Also create the buyer's own matrix for this pack (so they can receive spillover)
    get_or_create_active_matrix(db, buyer.id, pack_key)

    # Walk up the sponsor chain — place buyer in each upline's matrix
    current_id = buyer.id
    visited = set()
    first_placement = True

    while True:
        current_user = db.query(User).filter(User.id == current_id).first()
        if not current_user or not current_user.sponsor_id:
            break

        upline_id = current_user.sponsor_id
        if upline_id in visited:
            break  # prevent infinite loops
        visited.add(upline_id)

        # Don't place buyer in their own matrix
        if upline_id == buyer.id:
            current_id = upline_id
            continue

        # Get or create the upline's active matrix for this pack
        matrix = get_or_create_active_matrix(db, upline_id, pack_key)

        # Check if matrix has room
        if matrix.positions_filled >= MATRIX_MAX_DOWNLINE:
            # Matrix is full — still walk up but skip this one
            current_id = upline_id
            continue

        # Check buyer isn't already in this matrix (one person, one seat per advance)
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

        # Determine position index (0, 1, or 2)
        existing_children = db.query(CreditMatrixPosition).filter(
            and_(
                CreditMatrixPosition.matrix_id == matrix.id,
                CreditMatrixPosition.parent_position_id == parent_pos.id,
            )
        ).count()

        new_level = parent_pos.level + 1

        # Create the position
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

        # Pay commission to this upline member
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

        # Track first placement for backward compatibility
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
COMPLETION_BONUS_RATE = Decimal("0.10") # 10% of total matrix value on completion


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
    """Handle matrix completion — pay 10% bonus, mark complete, create next advance."""
    owner = db.query(User).filter(User.id == matrix.owner_id).first()
    if not owner:
        return

    # Completion bonus = 10% of total matrix value (39 positions × pack price)
    pack = CREDIT_PACKS.get(matrix.pack_key, {})
    pack_price = Decimal(str(pack.get("price", 0)))
    bonus_amount = MATRIX_MAX_DOWNLINE * pack_price * COMPLETION_BONUS_RATE  # 39 × price × 10%

    if bonus_amount > 0:
        bonus_commission = CreditMatrixCommission(
            matrix_id=matrix.id,
            earner_id=owner.id,
            from_user_id=owner.id,
            from_position_id=0,
            level=0,
            rate=COMPLETION_BONUS_RATE,
            pack_price=pack_price,
            amount=bonus_amount,
            commission_type="matrix_completion",
            status="paid",
        )
        db.add(bonus_commission)

        owner.balance = Decimal(str(owner.balance or 0)) + bonus_amount
        owner.total_earned = Decimal(str(owner.total_earned or 0)) + bonus_amount
        owner.matrix_earnings = Decimal(str(getattr(owner, 'matrix_earnings', 0) or 0)) + bonus_amount

    # Mark complete
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
    db.flush()

    # Award SuperScene credits
    existing_credits = db.query(SuperSceneCredit).filter(SuperSceneCredit.user_id == buyer.id).first()
    if existing_credits:
        existing_credits.balance = (existing_credits.balance or 0) + credits
    else:
        new_credits = SuperSceneCredit(user_id=buyer.id, balance=credits)
        db.add(new_credits)
    db.flush()

    # Find the buyer's sponsor for matrix placement
    sponsor = None
    if buyer.sponsor_id:
        sponsor = db.query(User).filter(User.id == buyer.sponsor_id).first()

    if not sponsor:
        # No sponsor — create the buyer's own matrix but skip commission
        matrix = get_or_create_active_matrix(db, buyer.id, pack_key)
        db.commit()
        return {
            "success": True,
            "purchase_id": purchase.id,
            "credits_awarded": credits,
            "pack": pack_key,
            "price": float(price),
            "matrix_placement": None,
            "message": "Credits awarded. No sponsor — matrix placement skipped.",
        }

    # Place in EVERY upline's matrix for this pack (walks the full sponsor chain)
    placement = place_in_matrix(db, buyer, pack_key, price, sponsor)

    if placement["success"] and placement.get("position_id"):
        purchase.matrix_entry_id = placement["position_id"]

    db.commit()

    return {
        "success": True,
        "purchase_id": purchase.id,
        "credits_awarded": credits,
        "pack": pack_key,
        "price": float(price),
        "matrix_placement": {
            "matrix_id": placement.get("matrix_id"),
            "position_id": placement.get("position_id"),
            "level": placement.get("level"),
            "matrices_filled": placement.get("matrices_filled", []),
            "commissions_paid": placement.get("commissions_paid", []),
        },
    }


# ═══════════════════════════════════════════════════════════════
#  TREE & HISTORY QUERIES (per pack)
# ═══════════════════════════════════════════════════════════════

def get_matrix_tree(db: Session, user_id: int, pack_key: str = None) -> dict:
    """
    Get a user's active matrix tree for a specific pack (or first active if no pack specified).
    """
    query = db.query(CreditMatrix).filter(
        and_(CreditMatrix.owner_id == user_id, CreditMatrix.status == "active")
    )
    if pack_key:
        query = query.filter(CreditMatrix.pack_key == pack_key)

    matrix = query.first()

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

    # Commission stats
    total_earned = db.query(CreditMatrixCommission).filter(
        and_(CreditMatrixCommission.matrix_id == matrix.id, CreditMatrixCommission.earner_id == user_id)
    ).all()

    earnings_by_level = {1: 0, 2: 0, 3: 0}
    total = Decimal("0")
    for c in total_earned:
        if c.level in earnings_by_level:
            earnings_by_level[c.level] += float(c.amount)
        total += c.amount

    l1_filled = len([n for n in nodes if n["level"] == 1])
    l2_filled = len([n for n in nodes if n["level"] == 2])
    l3_filled = len([n for n in nodes if n["level"] == 3])

    pack = CREDIT_PACKS.get(matrix.pack_key or "", {})

    return {
        "matrix": {
            "id": matrix.id,
            "pack_key": matrix.pack_key,
            "pack_label": pack.get("label", matrix.pack_key),
            "pack_price": pack.get("price", 0),
            "pack_credits": pack.get("credits", 0),
            "advance_number": matrix.advance_number,
            "status": matrix.status,
            "positions_filled": matrix.positions_filled,
            "max_positions": MATRIX_MAX_DOWNLINE,
            "fill_percentage": round(matrix.positions_filled / MATRIX_MAX_DOWNLINE * 100, 1),
            "total_earned": float(matrix.total_earned or 0),
            "created_at": matrix.created_at.isoformat() if matrix.created_at else None,
        },
        "tree": nodes,
        "stats": {
            "l1_filled": l1_filled,
            "l1_max": MATRIX_WIDTH,
            "l2_filled": l2_filled,
            "l2_max": MATRIX_WIDTH ** 2,
            "l3_filled": l3_filled,
            "l3_max": MATRIX_WIDTH ** 3,
            "earnings_l1": round(earnings_by_level[1], 2),
            "earnings_l2": round(earnings_by_level[2], 2),
            "earnings_l3": round(earnings_by_level[3], 2),
            "total_earned": float(total),
        },
    }


def get_all_matrices(db: Session, user_id: int) -> dict:
    """
    Get all 8 matrices for a user — one per pack.
    Returns which packs have active matrices (purchased) and which don't.
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

        # Check if user has a matrix for this pack (as owner)
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

        pack_info = {
            "pack_key": pack_key,
            "label": pack["label"],
            "price": pack["price"],
            "credits": pack["credits"],
            "has_matrix": matrix is not None,
            "positions_filled": matrix.positions_filled if matrix else 0,
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
