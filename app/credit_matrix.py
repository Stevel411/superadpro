"""
Credit Matrix Engine — 3×3 Forced Matrix with Commission Payouts
================================================================
Each of the 8 credit packs has its OWN independent 3×3 matrix.
A member who buys all 8 packs has 8 separate matrices filling.

Handles: matrix creation (per pack), position placement (BFS spillover),
commission calculation (L1=15%, L2=10%, L3=10%), matrix advancing,
and completion bonuses.

PACK PRICE SPLIT:
  50% → AI cost budget (covers Creative Studio token usage)
  15% → Company revenue
  35% → Matrix commissions:
    Level 1 (3 positions):  15% of pack price per position
    Level 2 (9 positions):  10% of pack price per position
    Level 3 (27 positions): 10% of pack price per position
  Total 39 positions to fill per matrix.

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
#  MATRIX PLACEMENT (pack-specific)
# ═══════════════════════════════════════════════════════════════

def find_matrix_for_placement(db: Session, sponsor_id: int, buyer_id: int, pack_key: str) -> CreditMatrix:
    """
    Find the best matrix to place a new member into FOR THIS SPECIFIC PACK.
    Priority: sponsor's active matrix for this pack. If full, walk up sponsor chain.
    """
    current_id = sponsor_id
    visited = set()

    while current_id and current_id not in visited:
        visited.add(current_id)
        matrix = get_or_create_active_matrix(db, current_id, pack_key)

        if matrix.positions_filled < MATRIX_MAX_DOWNLINE:
            return matrix

        # Walk up to sponsor's sponsor
        user = db.query(User).filter(User.id == current_id).first()
        if user and user.sponsor_id and user.sponsor_id != current_id:
            current_id = user.sponsor_id
        else:
            break

    return get_or_create_active_matrix(db, sponsor_id, pack_key)


def place_in_matrix(db: Session, buyer: User, pack_key: str, pack_price: Decimal, sponsor: User) -> dict:
    """
    Place a buyer into their sponsor's matrix FOR THIS SPECIFIC PACK.
    Returns dict with placement details and commissions paid.
    """
    result = {
        "success": False,
        "matrix_id": None,
        "position_id": None,
        "level": None,
        "commissions_paid": [],
        "matrix_completed": False,
        "error": None,
    }

    target_matrix = find_matrix_for_placement(db, sponsor.id, buyer.id, pack_key)
    if not target_matrix:
        result["error"] = "No active matrix found for placement"
        return result

    parent_pos = find_next_available_position(db, target_matrix)
    if not parent_pos:
        result["error"] = "Matrix is full — should have advanced"
        return result

    # Determine position index (0, 1, or 2)
    existing_children = db.query(CreditMatrixPosition).filter(
        and_(
            CreditMatrixPosition.matrix_id == target_matrix.id,
            CreditMatrixPosition.parent_position_id == parent_pos.id,
        )
    ).count()

    new_level = parent_pos.level + 1

    position = CreditMatrixPosition(
        matrix_id=target_matrix.id,
        user_id=buyer.id,
        parent_position_id=parent_pos.id,
        level=new_level,
        position_index=existing_children,
        pack_key=pack_key,
        pack_price=pack_price,
    )
    db.add(position)
    db.flush()

    target_matrix.positions_filled += 1
    db.flush()

    result["success"] = True
    result["matrix_id"] = target_matrix.id
    result["position_id"] = position.id
    result["level"] = new_level

    # Pay commissions
    commissions = pay_matrix_commissions(db, target_matrix, position, buyer, pack_price)
    result["commissions_paid"] = commissions

    # Check for completion (39 downline positions filled)
    if target_matrix.positions_filled >= MATRIX_MAX_DOWNLINE:
        complete_matrix(db, target_matrix)
        result["matrix_completed"] = True

    return result


# ═══════════════════════════════════════════════════════════════
#  COMMISSION PAYMENTS
# ═══════════════════════════════════════════════════════════════

def pay_matrix_commissions(
    db: Session,
    matrix: CreditMatrix,
    position: CreditMatrixPosition,
    buyer: User,
    pack_price: Decimal,
) -> list:
    """
    Pay commissions to the matrix owner based on which level the new position is at.
    L1 = 15%, L2 = 10%, L3 = 10%.
    """
    commissions_paid = []
    level = position.level

    if level not in MATRIX_COMMISSION_RATES:
        return commissions_paid

    rate = MATRIX_COMMISSION_RATES[level]
    amount = Decimal(str(pack_price)) * rate

    owner = db.query(User).filter(User.id == matrix.owner_id).first()
    if not owner:
        return commissions_paid

    # Don't pay commission to yourself
    if owner.id == buyer.id:
        logger.info(f"Matrix commission skipped: owner {owner.username} bought own pack")
        return commissions_paid

    commission = CreditMatrixCommission(
        matrix_id=matrix.id,
        earner_id=owner.id,
        from_user_id=buyer.id,
        from_position_id=position.id,
        level=level,
        rate=rate,
        pack_price=pack_price,
        amount=amount,
        commission_type="matrix_level",
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
        "level": level,
        "rate": float(rate),
        "amount": float(amount),
    })

    logger.info(
        f"Matrix commission: {owner.username} earned ${float(amount):.2f} "
        f"(L{level} {float(rate)*100:.0f}%) from {buyer.username} "
        f"pack={matrix.pack_key}"
    )

    return commissions_paid


# ═══════════════════════════════════════════════════════════════
#  MATRIX COMPLETION & ADVANCING
# ═══════════════════════════════════════════════════════════════

def complete_matrix(db: Session, matrix: CreditMatrix):
    """Handle matrix completion — pay bonus, mark complete, create next advance."""
    owner = db.query(User).filter(User.id == matrix.owner_id).first()
    if not owner:
        return

    # Completion bonus (currently $0 — Steve to decide amounts)
    pack = CREDIT_PACKS.get(matrix.pack_key, {})
    bonus_amount = Decimal(str(pack.get("completion_bonus", 0)))

    if bonus_amount > 0:
        bonus_commission = CreditMatrixCommission(
            matrix_id=matrix.id,
            earner_id=owner.id,
            from_user_id=owner.id,
            from_position_id=0,
            level=0,
            rate=Decimal("0"),
            pack_price=Decimal("0"),
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

    # Place in sponsor's matrix FOR THIS SPECIFIC PACK
    placement = place_in_matrix(db, buyer, pack_key, price, sponsor)

    if placement["success"]:
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
            "commissions_paid": placement.get("commissions_paid", []),
            "matrix_completed": placement.get("matrix_completed", False),
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
