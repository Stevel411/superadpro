# ═══════════════════════════════════════════════════════════════
# SuperAdPro — 8×8 Recurring Grid Engine
# 45% Owner | 25% Upline | 25% Level Pool | 5% Company
# ═══════════════════════════════════════════════════════════════
from sqlalchemy.orm import Session
from .database import (
    User, Grid, GridPosition, Commission,
    GRID_WIDTH, GRID_LEVELS, GRID_TOTAL,
    OWNER_PCT, UPLINE_PCT, LEVEL_PCT, COMPANY_PCT,
    GRID_PACKAGES
)
from datetime import datetime
from typing import Optional

# ── Per-level pool weight (flat = equal across 8 levels) ──────
LEVEL_WEIGHT = 1.0 / GRID_LEVELS   # 12.5% of the 25% pool each

def get_or_create_active_grid(db: Session, owner_id: int, package_tier: int) -> Grid:
    """Get the current open grid for this owner+tier, or create one."""
    grid = db.query(Grid).filter(
        Grid.owner_id    == owner_id,
        Grid.package_tier == package_tier,
        Grid.is_complete  == False
    ).first()
    if not grid:
        grid = Grid(
            owner_id      = owner_id,
            package_tier  = package_tier,
            package_price = GRID_PACKAGES[package_tier],
            cycle_number  = _next_cycle_number(db, owner_id, package_tier),
        )
        db.add(grid)
        db.commit()
        db.refresh(grid)
    return grid

def _next_cycle_number(db: Session, owner_id: int, package_tier: int) -> int:
    completed = db.query(Grid).filter(
        Grid.owner_id    == owner_id,
        Grid.package_tier == package_tier,
        Grid.is_complete  == True
    ).count()
    return completed + 1

def place_member_in_grid(
    db: Session,
    member_id:    int,
    owner_id:     int,
    package_tier: int,
    is_overspill: bool = False
) -> dict:
    """
    Place a new member into owner's active grid.
    Returns placement result + triggers commissions if grid completes.
    """
    # Validate
    if member_id == owner_id:
        return {"success": False, "error": "Cannot join your own grid"}

    price = GRID_PACKAGES.get(package_tier)
    if not price:
        return {"success": False, "error": "Invalid package tier"}

    # Get active grid
    grid = get_or_create_active_grid(db, owner_id, package_tier)

    # Work out which level and position
    level, position = _next_slot(db, grid)
    if level is None:
        return {"success": False, "error": "Grid unexpectedly full"}

    # Place the member
    gp = GridPosition(
        grid_id      = grid.id,
        member_id    = member_id,
        grid_level   = level,
        position_num = position,
        is_overspill = is_overspill,
    )
    db.add(gp)

    # Update grid counters
    grid.positions_filled += 1
    grid.revenue_total    += price

    # Update owner's team count
    owner = db.query(User).filter(User.id == owner_id).first()
    if owner:
        owner.total_team += 1

    # Distribute level pool commission immediately
    _pay_level_commission(db, grid, level, price)

    # Check grid completion
    result = {
        "success":    True,
        "grid_id":    grid.id,
        "grid_level": level,
        "position":   position,
        "cycle":      grid.cycle_number,
        "filled":     grid.positions_filled,
        "complete":   False,
    }

    if grid.positions_filled >= GRID_TOTAL:
        result["complete"] = True
        _complete_grid(db, grid)

    db.commit()
    return result


def _next_slot(db: Session, grid: Grid):
    """Find next available level + position in the grid (fill level by level, left to right)."""
    for level in range(1, GRID_LEVELS + 1):
        filled = db.query(GridPosition).filter(
            GridPosition.grid_id    == grid.id,
            GridPosition.grid_level == level
        ).count()
        if filled < GRID_WIDTH:
            return level, filled + 1
    return None, None


def _pay_level_commission(db: Session, grid: Grid, level: int, price: float):
    """Pay 25%/8 of the entry price to the grid owner as level pool commission."""
    amount = round(price * LEVEL_PCT * LEVEL_WEIGHT, 6)

    owner = db.query(User).filter(User.id == grid.owner_id).first()
    if owner:
        owner.balance        += amount
        owner.total_earned   += amount
        owner.level_earnings += amount

    comm = Commission(
        from_user_id    = grid.owner_id,   # conceptually flowing from the grid
        to_user_id      = grid.owner_id,
        grid_id         = grid.id,
        amount_usdt     = amount,
        commission_type = "level_pool",
        package_tier    = grid.package_tier,
        status          = "paid",
        notes           = f"Level {level} fill — {LEVEL_PCT*LEVEL_WEIGHT*100:.4f}% of ${price}",
        paid_at         = datetime.utcnow(),
    )
    db.add(comm)


def _complete_grid(db: Session, grid: Grid):
    """
    Grid hit 64 positions.
    1. Pay owner 45% of total grid revenue
    2. Pay upline 25% of total grid revenue
    3. Mark grid complete
    4. Auto-spawn next grid (overspill seeds it)
    """
    grid.is_complete  = True
    grid.completed_at = datetime.utcnow()

    total_revenue = grid.revenue_total
    owner_amount  = round(total_revenue * OWNER_PCT, 6)
    upline_amount = round(total_revenue * UPLINE_PCT, 6)
    company_amount= round(total_revenue * COMPANY_PCT, 6)

    # ── Pay grid owner ────────────────────────────────
    owner = db.query(User).filter(User.id == grid.owner_id).first()
    if owner:
        owner.balance       += owner_amount
        owner.total_earned  += owner_amount
        owner.grid_earnings += owner_amount

    _record_commission(db, grid, grid.owner_id, owner_amount, "grid_owner",
                       f"Grid #{grid.cycle_number} completion — 45% of ${total_revenue:,.2f}")

    # ── Pay upline ────────────────────────────────────
    upline_id = _get_upline_id(db, grid.owner_id)
    if upline_id:
        upline = db.query(User).filter(User.id == upline_id).first()
        if upline:
            upline.balance          += upline_amount
            upline.total_earned     += upline_amount
            upline.upline_earnings  += upline_amount
        _record_commission(db, grid, upline_id, upline_amount, "upline",
                           f"Upline residual — {grid.owner_id}'s Grid #{grid.cycle_number} completed")
    else:
        # No upline — company takes it
        _record_commission(db, grid, None, upline_amount, "company",
                           "Upline residual — no upline, goes to company")

    # ── Company fee ───────────────────────────────────
    _record_commission(db, grid, None, company_amount, "company",
                       f"5% platform fee — Grid #{grid.cycle_number}")

    # ── Spawn next grid ───────────────────────────────
    new_grid = Grid(
        owner_id      = grid.owner_id,
        package_tier  = grid.package_tier,
        package_price = grid.package_price,
        cycle_number  = grid.cycle_number + 1,
    )
    db.add(new_grid)
    db.flush()

    grid.owner_paid = True


def _get_upline_id(db: Session, user_id: int) -> Optional[int]:
    """Get the sponsor_id of this user (their direct upline)."""
    user = db.query(User).filter(User.id == user_id).first()
    return user.sponsor_id if user else None


def _record_commission(db: Session, grid: Grid, to_user_id: Optional[int],
                       amount: float, comm_type: str, notes: str):
    comm = Commission(
        from_user_id    = grid.owner_id,
        to_user_id      = to_user_id,
        grid_id         = grid.id,
        amount_usdt     = amount,
        commission_type = comm_type,
        package_tier    = grid.package_tier,
        status          = "paid" if to_user_id else "company",
        notes           = notes,
        paid_at         = datetime.utcnow(),
    )
    db.add(comm)


# ── Query helpers ─────────────────────────────────────────────

def get_user_grids(db: Session, user_id: int) -> list:
    """All grids owned by user, newest first."""
    return db.query(Grid).filter(
        Grid.owner_id == user_id
    ).order_by(Grid.package_tier, Grid.cycle_number.desc()).all()


def get_grid_stats(db: Session, user_id: int) -> dict:
    """Dashboard stats for a user's grid activity."""
    grids      = get_user_grids(db, user_id)
    user       = db.query(User).filter(User.id == user_id).first()
    completed  = [g for g in grids if g.is_complete]
    active     = [g for g in grids if not g.is_complete]

    total_members = sum(g.positions_filled for g in grids)

    return {
        "total_grids":      len(grids),
        "completed_cycles": len(completed),
        "active_grids":     len(active),
        "total_members":    total_members,
        "grid_earnings":    user.grid_earnings    if user else 0,
        "level_earnings":   user.level_earnings   if user else 0,
        "upline_earnings":  user.upline_earnings  if user else 0,
        "total_earned":     user.total_earned     if user else 0,
        "balance":          user.balance          if user else 0,
        "active_grids_detail": [
            {
                "tier":     g.package_tier,
                "price":    g.package_price,
                "cycle":    g.cycle_number,
                "filled":   g.positions_filled,
                "pct":      round((g.positions_filled / GRID_TOTAL) * 100),
                "revenue":  g.revenue_total,
                "owner_potential": round(g.revenue_total * OWNER_PCT, 2),
            }
            for g in active
        ]
    }


def get_grid_positions(db: Session, grid_id: int) -> dict:
    """Return level-by-level breakdown of a grid."""
    positions = db.query(GridPosition).filter(
        GridPosition.grid_id == grid_id
    ).all()

    levels = {i: [] for i in range(1, GRID_LEVELS + 1)}
    for p in positions:
        levels[p.grid_level].append({
            "position": p.position_num,
            "member_id": p.member_id,
            "is_overspill": p.is_overspill,
        })
    return levels


def get_user_commission_history(db: Session, user_id: int, limit: int = 50) -> list:
    """Recent commissions received by a user."""
    return db.query(Commission).filter(
        Commission.to_user_id == user_id
    ).order_by(Commission.created_at.desc()).limit(limit).all()
