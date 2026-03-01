# ═══════════════════════════════════════════════════════════════
# SuperAdPro — 8×8 Recurring Profit Engine Grid
#
# Commission Architecture (Stream 2):
#   40% → Direct Sponsor   (person who personally referred the entrant)
#   55% → Uni-Level Pool   (variable % across 8 levels: 15/10/8/6/5/4/4/3)
#    5% → Platform Fee     (SuperAdPro)
#
# Commissions paid per seat fill — no waiting for grid completion.
# ═══════════════════════════════════════════════════════════════
from sqlalchemy.orm import Session
from .database import (
    User, Grid, GridPosition, Commission,
    GRID_WIDTH, GRID_LEVELS, GRID_TOTAL,
    DIRECT_PCT, UNILEVEL_PCT, PER_LEVEL_PCT, PLATFORM_PCT,
    GRID_PACKAGES
)
from datetime import datetime
from typing import Optional


def get_or_create_active_grid(db: Session, owner_id: int, package_tier: int) -> Grid:
    grid = db.query(Grid).filter(
        Grid.owner_id     == owner_id,
        Grid.package_tier == package_tier,
        Grid.is_complete  == False
    ).first()
    if not grid:
        grid = Grid(
            owner_id      = owner_id,
            package_tier  = package_tier,
            package_price = GRID_PACKAGES[package_tier],
            advance_number  = _next_advance_number(db, owner_id, package_tier),
        )
        db.add(grid)
        db.commit()
        db.refresh(grid)
    return grid


def _next_advance_number(db: Session, owner_id: int, package_tier: int) -> int:
    completed = db.query(Grid).filter(
        Grid.owner_id     == owner_id,
        Grid.package_tier == package_tier,
        Grid.is_complete  == True
    ).count()
    return completed + 1


def place_member_in_grid(
    db:           Session,
    member_id:    int,
    owner_id:     int,
    package_tier: int,
    is_overspill: bool = False
) -> dict:
    if member_id == owner_id:
        return {"success": False, "error": "Cannot join your own grid"}

    price = GRID_PACKAGES.get(package_tier)
    if not price:
        return {"success": False, "error": "Invalid package tier"}

    grid = get_or_create_active_grid(db, owner_id, package_tier)
    level, position = _next_slot(db, grid)
    if level is None:
        return {"success": False, "error": "Grid is full"}

    gp = GridPosition(
        grid_id      = grid.id,
        member_id    = member_id,
        grid_level   = level,
        position_num = position,
        is_overspill = is_overspill,
    )
    db.add(gp)

    grid.positions_filled += 1
    grid.revenue_total    += price

    owner = db.query(User).filter(User.id == owner_id).first()
    if owner:
        owner.total_team += 1

    # Pay commissions immediately on every seat fill
    _pay_direct_sponsor(db, grid, member_id, price)
    _pay_unilevel_chain(db, grid, member_id, price)
    _record_platform_fee(db, grid, price)

    complete = grid.positions_filled >= GRID_TOTAL
    if complete:
        _complete_grid(db, grid)

    db.commit()
    return {
        "success":    True,
        "grid_id":    grid.id,
        "grid_level": level,
        "position":   position,
        "advance":      grid.advance_number,
        "filled":     grid.positions_filled,
        "complete":   complete,
    }


def _pay_direct_sponsor(db: Session, grid: Grid, member_id: int, price: float):
    """40% to the member's personal sponsor."""
    member = db.query(User).filter(User.id == member_id).first()
    amount = round(float(price) * DIRECT_PCT, 6)

    if not member or not member.sponsor_id:
        _record_commission(db, grid, None, amount, "direct_sponsor",
                           f"No sponsor — 40% platform absorb on ${price}")
        return

    sponsor = db.query(User).filter(User.id == member.sponsor_id).first()
    if sponsor:
        sponsor.balance       += amount
        sponsor.total_earned  += amount
        sponsor.grid_earnings += amount

    _record_commission(db, grid, member.sponsor_id, amount, "direct_sponsor",
                       f"Direct sponsor 40% — member {member_id} on ${price} package")


def _pay_unilevel_chain(db: Session, grid: Grid, member_id: int, price: float):
    """Variable % to each of 8 sponsor chain levels: 15/10/8/6/5/4/4/3."""
    from .database import LEVEL_PCTS
    current_id = member_id

    for lvl in range(1, GRID_LEVELS + 1):
        level_pct = LEVEL_PCTS[lvl - 1]  # 0-indexed
        per_level = round(float(price) * level_pct, 6)

        current_user = db.query(User).filter(User.id == current_id).first()
        if not current_user or not current_user.sponsor_id:
            # Chain shorter than 8 — absorb remaining into platform
            for remaining in range(lvl, GRID_LEVELS + 1):
                rem_pct = LEVEL_PCTS[remaining - 1]
                rem_amt = round(float(price) * rem_pct, 6)
                _record_commission(db, grid, None, rem_amt, "uni_level",
                                   f"Uni-level {remaining} — chain ended, platform absorb")
            break

        upline_id = current_user.sponsor_id
        upline    = db.query(User).filter(User.id == upline_id).first()
        if upline:
            upline.balance        += per_level
            upline.total_earned   += per_level
            upline.level_earnings += per_level

        _record_commission(db, grid, upline_id, per_level, "uni_level",
                           f"Uni-level {lvl} — {level_pct*100:.0f}% of ${price}")
        current_id = upline_id


def _record_platform_fee(db: Session, grid: Grid, price: float):
    amount = round(float(price) * PLATFORM_PCT, 6)
    _record_commission(db, grid, None, amount, "platform",
                       f"Platform 5% fee on ${price}")


def _complete_grid(db: Session, grid: Grid):
    """Mark complete and auto-spawn next advance. All money already paid per-entry."""
    grid.is_complete  = True
    grid.completed_at = datetime.utcnow()
    grid.owner_paid   = True

    new_grid = Grid(
        owner_id      = grid.owner_id,
        package_tier  = grid.package_tier,
        package_price = grid.package_price,
        advance_number  = grid.advance_number + 1,
    )
    db.add(new_grid)
    db.flush()


def _next_slot(db: Session, grid: Grid):
    for level in range(1, GRID_LEVELS + 1):
        filled = db.query(GridPosition).filter(
            GridPosition.grid_id    == grid.id,
            GridPosition.grid_level == level
        ).count()
        if filled < GRID_WIDTH:
            return level, filled + 1
    return None, None


def _record_commission(db: Session, grid: Grid, to_user_id: Optional[int],
                       amount: float, comm_type: str, notes: str):
    db.add(Commission(
        from_user_id    = grid.owner_id,
        to_user_id      = to_user_id,
        grid_id         = grid.id,
        amount_usdt     = amount,
        commission_type = comm_type,
        package_tier    = grid.package_tier,
        status          = "paid" if to_user_id else "platform",
        notes           = notes,
        paid_at         = datetime.utcnow(),
    ))


# ── Query helpers ─────────────────────────────────────────────

def get_user_grids(db: Session, user_id: int) -> list:
    return db.query(Grid).filter(
        Grid.owner_id == user_id
    ).order_by(Grid.package_tier, Grid.advance_number.desc()).all()


def get_grid_stats(db: Session, user_id: int) -> dict:
    grids     = get_user_grids(db, user_id)
    user      = db.query(User).filter(User.id == user_id).first()
    completed = [g for g in grids if g.is_complete]
    active    = [g for g in grids if not g.is_complete]

    total_earned = sum(float(g.revenue_total or 0) for g in grids) * float(PER_LEVEL_PCT)

    return {
        "total_grids":      len(grids),
        "completed_advances": len(completed),
        "active_grids":     len(active),
        "total_members":    sum(g.positions_filled for g in grids),
        "total_earned":     round(total_earned, 2),
        "active_grids_detail": [
            {
                "tier":            g.package_tier,
                "price":           g.package_price,
                "advance":           g.advance_number,
                "filled":          g.positions_filled,
                "pct":             round(float(g.positions_filled or 0) / float(GRID_TOTAL) * 100),
                "revenue":         g.revenue_total,
                "owner_potential": round(float(g.revenue_total or 0) * float(PER_LEVEL_PCT), 2),
            }
            for g in active
        ]
    }


def get_grid_positions(db: Session, grid_id: int) -> dict:
    positions = db.query(GridPosition).filter(
        GridPosition.grid_id == grid_id
    ).all()
    levels = {i: [] for i in range(1, GRID_LEVELS + 1)}
    for p in positions:
        levels[p.grid_level].append({
            "position":     p.position_num,
            "member_id":    p.member_id,
            "is_overspill": p.is_overspill,
        })
    return levels


def get_user_commission_history(db: Session, user_id: int, limit: int = 50) -> list:
    return db.query(Commission).filter(
        Commission.to_user_id == user_id
    ).order_by(Commission.created_at.desc()).limit(limit).all()
