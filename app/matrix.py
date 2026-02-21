from sqlalchemy.orm import Session
from .database import User, MatrixPosition
from typing import Optional

MATRIX_WIDTH = 3
MATRIX_DEPTH = 10

def get_next_available_position(db: Session, matrix_level: int, sponsor_id: int) -> Optional[MatrixPosition]:
    sponsor_position = db.query(MatrixPosition).filter(
        MatrixPosition.user_id == sponsor_id,
        MatrixPosition.matrix_level == matrix_level
    ).first()

    if sponsor_position:
        children = db.query(MatrixPosition).filter(
            MatrixPosition.parent_id == sponsor_position.id,
            MatrixPosition.matrix_level == matrix_level
        ).count()
        if children < MATRIX_WIDTH:
            return sponsor_position

    return find_spillover_position(db, matrix_level, sponsor_id)

def find_spillover_position(db: Session, matrix_level: int, sponsor_id: int) -> Optional[MatrixPosition]:
    sponsor_position = db.query(MatrixPosition).filter(
        MatrixPosition.user_id == sponsor_id,
        MatrixPosition.matrix_level == matrix_level
    ).first()

    if not sponsor_position:
        return get_first_available_position(db, matrix_level)

    queue = [sponsor_position]
    while queue:
        current = queue.pop(0)
        children = db.query(MatrixPosition).filter(
            MatrixPosition.parent_id == current.id,
            MatrixPosition.matrix_level == matrix_level
        ).all()
        if len(children) < MATRIX_WIDTH:
            return current
        for child in children:
            depth = get_position_depth(db, child)
            if depth < MATRIX_DEPTH:
                queue.append(child)
    return None

def get_first_available_position(db: Session, matrix_level: int) -> Optional[MatrixPosition]:
    all_positions = db.query(MatrixPosition).filter(
        MatrixPosition.matrix_level == matrix_level
    ).order_by(MatrixPosition.id).all()

    for position in all_positions:
        children = db.query(MatrixPosition).filter(
            MatrixPosition.parent_id == position.id,
            MatrixPosition.matrix_level == matrix_level
        ).count()
        depth = get_position_depth(db, position)
        if children < MATRIX_WIDTH and depth < MATRIX_DEPTH:
            return position
    return None

def get_position_depth(db: Session, position: MatrixPosition) -> int:
    depth = 0
    current = position
    while current.parent_id:
        current = db.query(MatrixPosition).filter(
            MatrixPosition.id == current.parent_id
        ).first()
        if not current:
            break
        depth += 1
    return depth

def place_in_matrix(db: Session, user_id: int, matrix_level: int, sponsor_id: int) -> dict:
    existing = db.query(MatrixPosition).filter(
        MatrixPosition.user_id == user_id,
        MatrixPosition.matrix_level == matrix_level
    ).first()
    if existing:
        return {"success": False, "error": "Already in this matrix"}

    parent_position = get_next_available_position(db, matrix_level, sponsor_id)

    if not parent_position:
        root_exists = db.query(MatrixPosition).filter(
            MatrixPosition.matrix_level == matrix_level
        ).first()
        if not root_exists:
            position = MatrixPosition(
                user_id=user_id,
                matrix_level=matrix_level,
                position=1,
                parent_id=None
            )
            db.add(position)
            db.commit()
            db.refresh(position)
            update_sponsor_stats(db, sponsor_id)
            return {"success": True, "position": position, "is_spillover": False}
        return {"success": False, "error": "Matrix is full"}

    siblings = db.query(MatrixPosition).filter(
        MatrixPosition.parent_id == parent_position.id,
        MatrixPosition.matrix_level == matrix_level
    ).count()

    is_spillover = parent_position.user_id != sponsor_id

    position = MatrixPosition(
        user_id=user_id,
        matrix_level=matrix_level,
        position=siblings + 1,
        parent_id=parent_position.id
    )
    db.add(position)
    db.commit()
    db.refresh(position)

    update_sponsor_stats(db, sponsor_id)
    if is_spillover:
        update_spillover_stats(db, parent_position.user_id)

    return {
        "success": True,
        "position": position,
        "is_spillover": is_spillover,
        "parent_user_id": parent_position.user_id
    }

def get_upline_members(db: Session, position: MatrixPosition, matrix_level: int) -> dict:
    level_members = {}
    current = position
    depth = 1

    while current.parent_id and depth <= MATRIX_DEPTH:
        parent = db.query(MatrixPosition).filter(
            MatrixPosition.id == current.parent_id
        ).first()
        if not parent:
            break
        user = db.query(User).filter(User.id == parent.user_id).first()
        if user and user.wallet_address:
            if depth not in level_members:
                level_members[depth] = []
            level_members[depth].append(user.wallet_address)
        current = parent
        depth += 1

    return level_members

def get_downline_at_levels(db: Session, user_id: int, matrix_level: int) -> dict:
    user_position = db.query(MatrixPosition).filter(
        MatrixPosition.user_id == user_id,
        MatrixPosition.matrix_level == matrix_level
    ).first()

    if not user_position:
        return {}

    level_members = {}
    current_level = [user_position]
    depth = 1

    while current_level and depth <= MATRIX_DEPTH:
        next_level = []
        wallets = []
        for pos in current_level:
            children = db.query(MatrixPosition).filter(
                MatrixPosition.parent_id == pos.id,
                MatrixPosition.matrix_level == matrix_level
            ).all()
            for child in children:
                user = db.query(User).filter(User.id == child.user_id).first()
                if user and user.wallet_address:
                    wallets.append(user.wallet_address)
                next_level.append(child)
        if wallets:
            level_members[depth] = wallets
        current_level = next_level
        depth += 1

    return level_members

def update_sponsor_stats(db: Session, sponsor_id: int):
    if not sponsor_id:
        return
    sponsor = db.query(User).filter(User.id == sponsor_id).first()
    if sponsor:
        sponsor.personal_referrals += 1
        sponsor.total_team += 1
        db.commit()

def update_spillover_stats(db: Session, parent_user_id: int):
    parent = db.query(User).filter(User.id == parent_user_id).first()
    if parent:
        parent.overspill_referrals += 1
        parent.total_team += 1
        db.commit()
