# ═══════════════════════════════════════════════════════════════
# SuperAdPro — 8×8 Recurring Profit Engine Grid (Spillover Model)
#
# Commission Architecture (Stream 2):
#   40% → Direct Sponsor   (person who personally referred the entrant)
#   50% → Uni-Level Pool   (6.25% × 8 levels in the entrant's upline chain)
#    5% → Platform Fee     (SuperAdPro)
#    5% → Grid Completion Bonus Pool (accrues per seat, pays on grid completion)
#
# Qualification Rule:
#   To earn commissions at a tier, the recipient must have an active
#   (or in-grace) campaign at that SAME tier or HIGHER.
#   If unqualified, the 40% direct goes to company (does NOT walk up).
#   Uni-level: each level checked individually — unqualified = company absorb.
#
# Spillover Model:
#   When a member purchases a tier, they fill ONE seat in EVERY upline
#   grid at that tier. One person, one seat per advance.
#
# Campaign Lifecycle:
#   Purchase tier → campaign active → views delivered → campaign expires
#   → 14-day grace period → qualification drops → repurchase (any tier)
#
# Commissions paid per seat fill — no waiting for grid completion.
# ═══════════════════════════════════════════════════════════════
from sqlalchemy.orm import Session
from .database import (
    User, Grid, GridPosition, Commission, VideoCampaign,
    GRID_WIDTH, GRID_LEVELS, GRID_TOTAL,
    DIRECT_PCT, UNILEVEL_PCT, PER_LEVEL_PCT, PLATFORM_PCT, BONUS_POOL_PCT,
    GRID_PACKAGES, GRID_COMPLETION_BONUS, CAMPAIGN_GRACE_DAYS
)
from datetime import datetime, timedelta
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


def process_tier_purchase(
    db:           Session,
    buyer_id:     int,
    package_tier: int,
) -> dict:
    """
    Main entry point for a tier purchase (new or repurchase).
    
    1. Pay commissions (40% direct, 50% uni-level, 5% platform)
       — the 5% bonus pool accrues on each grid during spillover fill
    2. Fill one seat in every upline grid at this tier (spillover)
    
    The buyer's sponsor_id is used for commission payments.
    The spillover walks the FULL upline chain filling grids.
    """
    price = GRID_PACKAGES.get(package_tier)
    if not price:
        return {"success": False, "error": "Invalid package tier"}

    buyer = db.query(User).filter(User.id == buyer_id).first()
    if not buyer:
        return {"success": False, "error": "Buyer not found"}

    # Pay commissions based on the buyer's sponsor chain
    _pay_direct_sponsor(db, buyer, price, package_tier)
    _pay_unilevel_chain(db, buyer, price, package_tier)
    _record_platform_fee(db, price, package_tier, buyer_id)

    # Spillover: fill one seat in every upline grid at this tier
    grids_filled = _spillover_fill(db, buyer_id, package_tier)

    db.commit()
    return {
        "success": True,
        "buyer_id": buyer_id,
        "package_tier": package_tier,
        "price": price,
        "grids_filled": grids_filled,
    }


def _spillover_fill(db: Session, buyer_id: int, package_tier: int) -> list:
    """
    Walk the buyer's entire upline chain. For each upline member who has
    a grid at this tier, place the buyer in it (one seat per grid per advance).
    One person, one seat per advance — skip if already seated.
    """
    grids_filled = []
    current_id = buyer_id
    price = GRID_PACKAGES[package_tier]

    # Walk up the sponsor chain
    visited = set()
    while True:
        current_user = db.query(User).filter(User.id == current_id).first()
        if not current_user or not current_user.sponsor_id:
            break
        upline_id = current_user.sponsor_id
        if upline_id in visited:
            break  # prevent infinite loops
        visited.add(upline_id)

        # Don't place buyer in their own grid
        if upline_id == buyer_id:
            current_id = upline_id
            continue

        # Get or create the upline's active grid at this tier
        grid = get_or_create_active_grid(db, upline_id, package_tier)

        # Check buyer isn't already in this grid (one person, one seat per advance)
        already_seated = db.query(GridPosition).filter(
            GridPosition.grid_id   == grid.id,
            GridPosition.member_id == buyer_id
        ).first()

        if not already_seated:
            level, position = _next_slot(db, grid)
            if level is not None:
                gp = GridPosition(
                    grid_id      = grid.id,
                    member_id    = buyer_id,
                    grid_level   = level,
                    position_num = position,
                    is_overspill = True,
                )
                db.add(gp)

                grid.positions_filled += 1
                grid.revenue_total    += price

                # Accrue 5% bonus pool on this grid
                bonus_amount = round(float(price) * BONUS_POOL_PCT, 6)
                grid.bonus_pool_accrued = float(grid.bonus_pool_accrued or 0) + bonus_amount

                owner = db.query(User).filter(User.id == upline_id).first()
                if owner:
                    owner.total_team += 1

                entry = {
                    "grid_id": grid.id,
                    "owner_id": upline_id,
                    "level": level,
                    "position": position,
                    "filled": grid.positions_filled,
                    "complete": False,
                }

                # Check for grid completion
                if grid.positions_filled >= GRID_TOTAL:
                    _complete_grid(db, grid)
                    entry["complete"] = True

                grids_filled.append(entry)

        current_id = upline_id

    return grids_filled


def place_member_in_grid(
    db:           Session,
    member_id:    int,
    owner_id:     int,
    package_tier: int,
    is_overspill: bool = False
) -> dict:
    """
    Legacy direct placement function — still works for manual/admin placement.
    For normal purchases, use process_tier_purchase() which handles spillover.
    """
    if member_id == owner_id:
        return {"success": False, "error": "Cannot join your own grid"}

    price = GRID_PACKAGES.get(package_tier)
    if not price:
        return {"success": False, "error": "Invalid package tier"}

    grid = get_or_create_active_grid(db, owner_id, package_tier)

    # One person, one seat per advance
    already_seated = db.query(GridPosition).filter(
        GridPosition.grid_id   == grid.id,
        GridPosition.member_id == member_id
    ).first()
    if already_seated:
        return {"success": False, "error": "Already seated in this grid"}

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

    # Accrue 5% bonus pool
    bonus_amount = round(float(price) * BONUS_POOL_PCT, 6)
    grid.bonus_pool_accrued = float(grid.bonus_pool_accrued or 0) + bonus_amount

    owner = db.query(User).filter(User.id == owner_id).first()
    if owner:
        owner.total_team += 1

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


def _pay_direct_sponsor(db: Session, buyer: User, price: float, package_tier: int):
    """40% to the buyer's personal sponsor."""
    amount = round(float(price) * DIRECT_PCT, 6)

    if not buyer.sponsor_id:
        _record_commission(db, buyer.id, None, amount, "direct_sponsor",
                           f"No sponsor — 40% company absorb on ${price}",
                           package_tier)
        return

    sponsor = db.query(User).filter(User.id == buyer.sponsor_id).first()

    # Check if sponsor is qualified at this tier or above
    if sponsor and _user_is_qualified(db, sponsor.id, package_tier):
        sponsor.balance       += amount
        sponsor.total_earned  += amount
        sponsor.grid_earnings += amount
        _record_commission(db, buyer.id, sponsor.id, amount, "direct_sponsor",
                           f"Direct sponsor 40% — buyer {buyer.id} on ${price} package",
                           package_tier)
    else:
        # Sponsor unqualified — 40% goes to company, does NOT walk up
        _record_commission(db, buyer.id, None, amount, "direct_sponsor",
                           f"Sponsor unqualified at tier {package_tier} — 40% company absorb",
                           package_tier)


def _pay_unilevel_chain(db: Session, buyer: User, price: float, package_tier: int):
    """6.25% to each of 8 sponsor chain levels above the buyer.
    Each level checked individually — if unqualified at this tier, company absorbs."""
    per_level = round(float(price) * PER_LEVEL_PCT, 6)
    current_id = buyer.id

    for lvl in range(1, GRID_LEVELS + 1):
        current_user = db.query(User).filter(User.id == current_id).first()
        if not current_user or not current_user.sponsor_id:
            for remaining in range(lvl, GRID_LEVELS + 1):
                _record_commission(db, buyer.id, None, per_level, "uni_level",
                                   f"Uni-level {remaining} — chain ended, company absorb",
                                   package_tier)
            break

        upline_id = current_user.sponsor_id
        upline    = db.query(User).filter(User.id == upline_id).first()

        if upline and _user_is_qualified(db, upline_id, package_tier):
            # Qualified — pay the commission
            upline.balance        += per_level
            upline.total_earned   += per_level
            upline.level_earnings += per_level
            _record_commission(db, buyer.id, upline_id, per_level, "uni_level",
                               f"Uni-level {lvl} — 6.25% of ${price}",
                               package_tier)
        else:
            # Unqualified at this tier — company absorbs
            _record_commission(db, buyer.id, None, per_level, "uni_level",
                               f"Uni-level {lvl} — unqualified at tier {package_tier}, company absorb",
                               package_tier)

        current_id = upline_id


def _record_platform_fee(db: Session, price: float, package_tier: int, buyer_id: int = None):
    amount = round(float(price) * PLATFORM_PCT, 6)
    _record_commission(db, buyer_id, None, amount, "platform",
                       f"Platform 5% fee on ${price}",
                       package_tier)


def _complete_grid(db: Session, grid: Grid):
    """
    Mark complete. Check if owner has active campaign at this tier.
    If yes: pay completion bonus from this grid's accrued pool.
    If no: roll bonus pool into next advance.
    Then auto-spawn next advance.
    
    Note: If there was a rollover from a previous advance, it was already
    pre-loaded into this grid's bonus_pool_accrued when the grid was spawned.
    """
    grid.is_complete  = True
    grid.completed_at = datetime.utcnow()

    owner = db.query(User).filter(User.id == grid.owner_id).first()
    bonus_amount = float(grid.bonus_pool_accrued or 0)

    # Does owner have an active campaign at this tier?
    has_active_campaign = _owner_has_active_campaign(db, grid.owner_id, grid.package_tier)

    if has_active_campaign and owner and bonus_amount > 0:
        # Pay the completion bonus
        owner.balance        += bonus_amount
        owner.total_earned   += bonus_amount
        owner.bonus_earnings  = float(owner.bonus_earnings or 0) + bonus_amount
        grid.bonus_paid      = True
        grid.owner_paid      = True

        _record_commission(db, grid.owner_id, grid.owner_id, bonus_amount,
                           "grid_completion_bonus",
                           f"Grid completion bonus tier {grid.package_tier} advance {grid.advance_number}",
                           grid.package_tier)
    else:
        # No active campaign — roll bonus into next advance
        grid.bonus_rolled_over = True
        grid.owner_paid = False

    # Auto-spawn next advance
    new_grid = Grid(
        owner_id      = grid.owner_id,
        package_tier  = grid.package_tier,
        package_price = grid.package_price,
        advance_number  = grid.advance_number + 1,
    )
    # If bonus rolled over, carry it into the new grid's pool
    if grid.bonus_rolled_over:
        new_grid.bonus_pool_accrued = bonus_amount
    db.add(new_grid)
    db.flush()


def _user_is_qualified(db: Session, user_id: int, package_tier: int) -> bool:
    """
    Check if a user is qualified to earn commissions at this tier.
    Qualified means: has an active campaign at this tier OR ABOVE,
    OR has a completed campaign within the 14-day grace period at this tier or above.
    Admin/master affiliate always qualifies.
    """
    # Master affiliate bypass — qualifies for all tiers
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.is_admin:
        return True

    now = datetime.utcnow()

    # Check for active (non-completed) campaign at this tier or above
    active = db.query(VideoCampaign).filter(
        VideoCampaign.user_id == user_id,
        VideoCampaign.campaign_tier >= package_tier,
        VideoCampaign.status.in_(["active", "paused"]),
        VideoCampaign.is_completed == False
    ).first()
    if active:
        return True

    # Check for completed campaign still within grace period at this tier or above
    in_grace = db.query(VideoCampaign).filter(
        VideoCampaign.user_id == user_id,
        VideoCampaign.campaign_tier >= package_tier,
        VideoCampaign.is_completed == True,
        VideoCampaign.grace_expires_at != None,
        VideoCampaign.grace_expires_at > now
    ).first()
    if in_grace:
        return True

    return False


def _owner_has_active_campaign(db: Session, owner_id: int, package_tier: int) -> bool:
    """Check if the grid owner has an active or in-grace campaign at this tier or above.
    Used for grid completion bonus eligibility."""
    return _user_is_qualified(db, owner_id, package_tier)


def _next_slot(db: Session, grid: Grid):
    for level in range(1, GRID_LEVELS + 1):
        filled = db.query(GridPosition).filter(
            GridPosition.grid_id    == grid.id,
            GridPosition.grid_level == level
        ).count()
        if filled < GRID_WIDTH:
            return level, filled + 1
    return None, None


def _record_commission(db: Session, from_user_id: Optional[int], to_user_id: Optional[int],
                       amount: float, comm_type: str, notes: str,
                       package_tier: int = None):
    db.add(Commission(
        from_user_id    = from_user_id,
        to_user_id      = to_user_id,
        amount_usdt     = amount,
        commission_type = comm_type,
        package_tier    = package_tier,
        status          = "paid" if to_user_id else "platform",
        notes           = notes,
        paid_at         = datetime.utcnow(),
    ))


# ── Campaign View Tracking ───────────────────────────────────

def record_campaign_view(db: Session, campaign_id: int) -> dict:
    """
    Increment views_delivered on a campaign.
    If views_target reached, mark campaign as completed and set grace period.
    Returns status info.
    """
    campaign = db.query(VideoCampaign).filter(VideoCampaign.id == campaign_id).first()
    if not campaign:
        return {"success": False, "error": "Campaign not found"}

    if campaign.is_completed:
        return {"success": False, "error": "Campaign already completed"}

    campaign.views_delivered = (campaign.views_delivered or 0) + 1

    completed = False
    if campaign.views_target and campaign.views_delivered >= campaign.views_target:
        campaign.is_completed = True
        campaign.completed_at = datetime.utcnow()
        campaign.grace_expires_at = datetime.utcnow() + timedelta(days=CAMPAIGN_GRACE_DAYS)
        campaign.status = "completed"
        completed = True

    db.commit()
    return {
        "success": True,
        "views_delivered": campaign.views_delivered,
        "views_target": campaign.views_target,
        "completed": completed,
        "grace_expires_at": campaign.grace_expires_at.isoformat() if completed else None,
    }


def check_campaign_completion(db: Session, campaign_id: int) -> dict:
    """Check if a campaign has hit its view target."""
    campaign = db.query(VideoCampaign).filter(VideoCampaign.id == campaign_id).first()
    if not campaign:
        return {"completed": False, "error": "Not found"}
    return {
        "completed": campaign.is_completed,
        "views_delivered": campaign.views_delivered or 0,
        "views_target": campaign.views_target or 0,
        "progress_pct": round((campaign.views_delivered or 0) / max(campaign.views_target or 1, 1) * 100, 1),
    }


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
        "total_bonus_earned": round(float(user.bonus_earnings or 0), 2) if user else 0,
        "active_grids_detail": [
            {
                "tier":            g.package_tier,
                "price":           g.package_price,
                "advance":           g.advance_number,
                "filled":          g.positions_filled,
                "pct":             round(float(g.positions_filled or 0) / float(GRID_TOTAL) * 100),
                "revenue":         g.revenue_total,
                "bonus_pool":      round(float(g.bonus_pool_accrued or 0), 2),
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
