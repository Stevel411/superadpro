# ═══════════════════════════════════════════════════════════════
# SuperAdPro — 8×8 Recurring Profit Engine Grid (Spillover Model)
#
# Commission Architecture (Stream 2) — updated 21 May 2026:
#   40% → Direct Sponsor   (person who personally referred the entrant)
#   50% → Uni-Level Pool   (6.25% × 8 levels in the entrant's upline chain)
#    0% → Platform Fee     (reallocated to bonus pool 21 May 2026)
#   10% → Grid Completion Bonus Pool (accrues per seat, pays on grid completion)
#
# Total: 100% to affiliates. Canonical source: docs/commission-spec.md §2.
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
from decimal import Decimal
from .database import (
    User, Grid, GridPosition, Commission, VideoCampaign,
    CourseCommission, CreditMatrixCommission,
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
    bypass_repurchase_guard: bool = False,
) -> dict:
    """
    Main entry point for a tier purchase (new or repurchase).
    
    1. Pay commissions (40% direct, 50% uni-level, 5% platform)
       — the 5% bonus pool accrues on each grid during spillover fill
    2. Fill one seat in every upline grid at this tier (spillover)
    
    The buyer's sponsor_id is used for commission payments.
    The spillover walks the FULL upline chain filling grids.

    bypass_repurchase_guard: only set True from manual-recovery admin endpoints
    where the operator knows the buyer SHOULD activate even though there's an
    in-flight campaign at this tier (e.g. legacy direct-USDT recoveries).
    The normal payment-flow path NEVER sets this — it relies on the
    invoice-creation guard at /api/nowpayments/create-invoice as the
    primary defence and this as the belt-and-braces backstop.
    """
    price = GRID_PACKAGES.get(package_tier)
    if not price:
        return {"success": False, "error": "Invalid package tier"}

    buyer = db.query(User).filter(User.id == buyer_id).first()
    if not buyer:
        return {"success": False, "error": "Buyer not found"}

    # ── Defence-in-depth: refuse if in-flight campaign exists at this tier ──
    # Catches the rare race where two invoices for the same tier both pay
    # before either activates. The primary guard is at invoice creation;
    # this is the second line of defence at activation time.
    if not bypass_repurchase_guard:
        in_flight = db.query(VideoCampaign).filter(
            VideoCampaign.user_id == buyer_id,
            VideoCampaign.campaign_tier == package_tier,
            VideoCampaign.is_completed == False,
        ).first()
        if in_flight:
            return {
                "success": False,
                "error": (
                    f"In-flight Campaign Tier {package_tier} already exists "
                    f"({in_flight.views_delivered or 0}/{in_flight.views_target or 0} views). "
                    f"Refusing to double-activate. Manual review required."
                ),
                "code": "campaign_in_flight",
                "in_flight_campaign_id": in_flight.id,
            }

    # Pay commissions based on the buyer's sponsor chain
    _pay_direct_sponsor(db, buyer, price, package_tier)
    _pay_unilevel_chain(db, buyer, price, package_tier)
    _record_platform_fee(db, price, package_tier, buyer_id)

    # Create the buyer's own grid at this tier (so they can receive spillover)
    get_or_create_active_grid(db, buyer_id, package_tier)

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
                grid.revenue_total    = Decimal(str(grid.revenue_total or 0)) + Decimal(str(price))

                # Accrue 5% bonus pool on this grid
                bonus_amount = round(float(price) * BONUS_POOL_PCT, 2)
                grid.bonus_pool_accrued = Decimal(str(grid.bonus_pool_accrued or 0)) + Decimal(str(bonus_amount))

                # NOTE: legacy code used to do `owner.total_team += 1` here.
                # Removed 1 May 2026: total_team is no longer a denormalised
                # counter. Network counts are computed live via recursive CTE
                # in compute_descendant_counts(). The += 1 increments at
                # spillover sites were one of the main drift sources.

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
    grid.revenue_total    = Decimal(str(grid.revenue_total or 0)) + Decimal(str(price))

    # Accrue 5% bonus pool
    bonus_amount = round(float(price) * BONUS_POOL_PCT, 2)
    grid.bonus_pool_accrued = Decimal(str(grid.bonus_pool_accrued or 0)) + Decimal(str(bonus_amount))

    # NOTE: legacy code used to do `owner.total_team += 1` here.
    # Removed 1 May 2026 — see compute_descendant_counts() in app/main.py.

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
    amount = round(float(price) * DIRECT_PCT, 2)

    if not buyer.sponsor_id:
        _record_commission(db, buyer.id, None, amount, "direct_sponsor",
                           f"No sponsor — 40% company absorb on ${price}",
                           package_tier)
        return

    sponsor = db.query(User).filter(User.id == buyer.sponsor_id).first()

    # Check if sponsor is qualified at this tier or above
    if sponsor and _user_is_qualified(db, sponsor.id, package_tier):
        sponsor.campaign_balance = Decimal(str(sponsor.campaign_balance or 0)) + Decimal(str(amount))
        sponsor.total_earned  = Decimal(str(sponsor.total_earned or 0)) + Decimal(str(amount))
        sponsor.grid_earnings = Decimal(str(sponsor.grid_earnings or 0)) + Decimal(str(amount))
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
    per_level = round(float(price) * PER_LEVEL_PCT, 2)
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
            upline.campaign_balance = Decimal(str(upline.campaign_balance or 0)) + Decimal(str(per_level))
            upline.total_earned   = Decimal(str(upline.total_earned or 0)) + Decimal(str(per_level))
            upline.level_earnings = Decimal(str(upline.level_earnings or 0)) + Decimal(str(per_level))
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
    amount = round(float(price) * PLATFORM_PCT, 2)
    # 21 May 2026: PLATFORM_PCT is now 0.00 (reallocated to completion
    # bonus). Skip the row entirely instead of writing $0 commissions
    # that would clutter the audit tables and trip the commission
    # anomalies scanner. Function kept callable so all existing
    # callsites continue to work; just no-op when amount is 0.
    if amount <= 0:
        return
    _record_commission(db, buyer_id, None, amount, "platform",
                       f"Platform fee on ${price}",
                       package_tier)


def _complete_grid(db: Session, grid: Grid):
    """
    Mark complete. Check if owner is qualified at this tier.
    If yes: pay completion bonus from this grid's accrued pool.
    If no: roll bonus pool into next advance.
    Then auto-spawn next advance + send completion notification.

    Note: If there was a rollover from a previous advance, it was already
    pre-loaded into this grid's bonus_pool_accrued when the grid was spawned.

    Order fixed 29 Apr 2026 — qualification check now runs BEFORE the grid is
    marked complete. Under the new tier-ownership-qualifies rule, the grid
    being completed itself counts toward qualification (because the owner has
    an active Grid at this tier — *this* grid). If we marked it complete first,
    the qualification check would miss it and roll over even when it shouldn't.
    """
    # Capture qualification BEFORE setting is_complete so the grid being
    # completed still counts as the owner's active grid for qualification.
    has_active_campaign = _owner_has_active_campaign(db, grid.owner_id, grid.package_tier)

    grid.is_complete  = True
    grid.completed_at = datetime.utcnow()

    owner = db.query(User).filter(User.id == grid.owner_id).first()
    bonus_amount = float(grid.bonus_pool_accrued or 0)

    if has_active_campaign and owner and bonus_amount > 0:
        # Pay the completion bonus
        owner.campaign_balance = Decimal(str(owner.campaign_balance or 0)) + Decimal(str(bonus_amount))
        owner.total_earned   = Decimal(str(owner.total_earned or 0)) + Decimal(str(bonus_amount))
        owner.bonus_earnings = Decimal(str(owner.bonus_earnings or 0)) + Decimal(str(bonus_amount))
        grid.bonus_paid      = True
        grid.owner_paid      = True

        _record_commission(db, grid.owner_id, grid.owner_id, bonus_amount,
                           "grid_completion_bonus",
                           f"Grid completion bonus tier {grid.package_tier} advance {grid.advance_number}",
                           grid.package_tier)
    else:
        # No active qualification — roll bonus into next advance
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

    # ── Completion notification ──
    # Best-effort, never breaks the parent transaction (mirrors the pattern
    # in main.py for tier-purchase notifications). Log on failure, no rollback.
    try:
        from .database import Notification
        if owner and grid.bonus_paid:
            # Bonus paid out — celebratory notification with amount
            notif_title = f"🎉 Grid Tier {grid.package_tier} complete!"
            notif_msg = (f"Your Tier {grid.package_tier} grid (advance {grid.advance_number}) just filled "
                         f"all 64 seats. ${bonus_amount:.2f} completion bonus added to your Campaign Wallet. "
                         f"Advance {grid.advance_number + 1} is now open and ready for new spillover.")
        elif owner and grid.bonus_rolled_over:
            # Bonus rolled over because not qualified
            notif_title = f"🔄 Grid Tier {grid.package_tier} complete — bonus rolled over"
            notif_msg = (f"Your Tier {grid.package_tier} grid (advance {grid.advance_number}) filled all 64 seats. "
                         f"Because qualification wasn't active, the ${bonus_amount:.2f} bonus rolled into "
                         f"advance {grid.advance_number + 1}. Get qualified to claim it on the next completion.")
        else:
            # Edge: no bonus accrued and no rollover — still notify completion
            notif_title = f"🎉 Grid Tier {grid.package_tier} complete!"
            notif_msg = (f"Your Tier {grid.package_tier} grid (advance {grid.advance_number}) just filled. "
                         f"Advance {grid.advance_number + 1} is now open.")
        if owner:
            db.add(Notification(
                user_id=grid.owner_id,
                type="commission",
                icon="🎉" if grid.bonus_paid else "🔄",
                title=notif_title,
                message=notif_msg,
                link="/grid-visualiser",
            ))
    except Exception as e:
        # Notifications are best-effort. Do NOT rollback — the bonus payment
        # and grid completion must persist regardless.
        import logging
        logging.getLogger(__name__).warning(
            f"Grid completion notification failed for grid {grid.id} owner {grid.owner_id}: {e}"
        )


def _user_is_qualified(db: Session, user_id: int, package_tier: int) -> bool:
    """
    Check if a user is qualified to earn commissions at this tier.

    Qualified means ANY of:
      - User is admin/master affiliate (qualifies for all tiers)
      - User owns an active Grid at this tier or above (i.e. they have purchased
        a Campaign Tier — purchase alone qualifies them, no campaign needed)
      - User has an active video campaign at this tier or above (legacy path,
        retained so existing qualified users don't lose their status)
      - User has a completed campaign still in the 14-day grace period at this
        tier or above (legacy grace-period path)

    Updated 29 Apr 2026 — Steve confirmed product rule: tier purchase alone
    triggers full Watch-to-Earn activation including commission qualification.
    Members can earn from downline tier purchases the moment they buy their
    own tier; creating a video campaign is a separate optional action that
    lets THEM earn from watchers but isn't required to earn commissions.
    """
    # Master affiliate bypass — qualifies for all tiers
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.is_admin:
        return True

    now = datetime.utcnow()

    # Primary path (Apr 2026): an active Grid at this tier or above means
    # the user has paid for a Campaign Tier and is qualified to earn.
    has_active_grid = db.query(Grid).filter(
        Grid.owner_id == user_id,
        Grid.package_tier >= package_tier,
        Grid.is_complete == False,
    ).first()
    if has_active_grid:
        return True

    # Legacy path: active video campaign at this tier or above. Kept so users
    # who qualified pre-Apr-2026 retain their status; harmless overlap with
    # the Grid path above for users who have both.
    active = db.query(VideoCampaign).filter(
        VideoCampaign.user_id == user_id,
        VideoCampaign.campaign_tier >= package_tier,
        VideoCampaign.status.in_(["active", "paused"]),
        VideoCampaign.is_completed == False
    ).first()
    if active:
        return True

    # Legacy path: completed campaign still within grace period at this tier or above
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
    # Cache invalidation — commission posted, dashboard/wallet/earnings
    # caches for the recipient need to refresh on next read. Late import
    # so grid.py stays decoupled from main.py at module load time.
    # Skip for platform commissions (to_user_id is None — no user cache to invalidate).
    if to_user_id:
        try:
            from .stats_cache import cache_invalidate_user
            cache_invalidate_user(to_user_id)
        except Exception as e:
            # Cache failures must NEVER break commission writes. Log and continue.
            import logging
            logging.getLogger("superadpro.cache").warning(
                f"cache_invalidate_user({to_user_id}) failed in _record_commission: {e}"
            )


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
        "total_earned":     float(total_earned),
        "total_bonus_earned": float(user.bonus_earnings or 0) if user else 0,
        "active_grids_detail": [
            {
                "tier":            g.package_tier,
                "price":           g.package_price,
                "advance":           g.advance_number,
                "filled":          g.positions_filled,
                "pct":             round(float(g.positions_filled or 0) / float(GRID_TOTAL) * 100),
                "revenue":         g.revenue_total,
                "bonus_pool":      float(g.bonus_pool_accrued or 0),
                "owner_potential": float(g.revenue_total or 0) * float(PER_LEVEL_PCT),
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
    """Unified commission history feed — merges all three commission tables.

    Three sources, all surfaced as a single time-ordered list for the
    /api/wallet activity feed:

      1. Commission              (grid + membership + misc; uses to_user_id, amount_usdt)
      2. CourseCommission        (Course Academy pass-up; uses earner_id, amount)
      3. CreditMatrixCommission  (Credit Nexus matrix payouts; uses earner_id, amount,
                                  defaults commission_type='matrix_level')

    Bug history (7 May 2026): this function previously queried only the
    Commission table, so credit-pack and course commissions never
    appeared in the wallet activity. Steve noticed his $3 Credit Nexus
    commission from test3's Starter pack was in his balance (verified
    via three audit tools) but missing from /wallet's activity feed.

    Each row is normalised to a dict matching what Wallet.jsx expects:
      { created_at, commission_type, amount_usdt, status, package_tier }
    Returning dicts (not ORM objects) also fixes a latent bug where
    SQLAlchemy ORM objects were being returned to JSONResponse —
    only fields that don't require lazy-loading were leaking through.

    The frontend's renderer (Wallet.jsx ~line 312) maps known
    commission_type values to friendly labels and falls back to
    '💰 ' + commission_type.replace('_', ' ') for unknown types,
    so new types added to any of these tables will render gracefully
    even before the frontend gets explicit handling.
    """
    rows = []

    # Source 1: Commission (grid + membership)
    base_commissions = db.query(Commission).filter(
        Commission.to_user_id == user_id
    ).order_by(Commission.created_at.desc()).limit(limit).all()
    for c in base_commissions:
        rows.append({
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "commission_type": c.commission_type or "unknown",
            "amount_usdt": float(c.amount_usdt or 0),
            "status": c.status or "paid",
            "package_tier": c.package_tier,
            "source": "grid",
        })

    # Source 2: CreditMatrixCommission (Credit Nexus)
    matrix_commissions = db.query(CreditMatrixCommission).filter(
        CreditMatrixCommission.earner_id == user_id
    ).order_by(CreditMatrixCommission.created_at.desc()).limit(limit).all()
    for c in matrix_commissions:
        rows.append({
            "created_at": c.created_at.isoformat() if c.created_at else None,
            # 'matrix_level' / 'matrix_completion' (default 'matrix_level').
            # Frontend's fallback renders 'matrix_level' as '💰 matrix level'
            # which is acceptable; we can add an explicit emoji+label mapping
            # in Wallet.jsx in a follow-up if desired.
            "commission_type": c.commission_type or "matrix_level",
            "amount_usdt": float(c.amount or 0),
            "status": c.status or "paid",
            # No package_tier on matrix commissions — pack_price is closest
            # equivalent but the frontend's "Tier N" badge wouldn't be
            # meaningful for credit packs (which are a price ladder, not
            # a numbered tier system). Leave None.
            "package_tier": None,
            "source": "credit_nexus",
        })

    # Source 3: CourseCommission (Course Academy)
    course_commissions = db.query(CourseCommission).filter(
        CourseCommission.earner_id == user_id
    ).order_by(CourseCommission.created_at.desc()).limit(limit).all()
    for c in course_commissions:
        rows.append({
            "created_at": c.created_at.isoformat() if c.created_at else None,
            # Frontend will fall back-render 'direct_sale' → '💰 direct sale'
            # and 'pass_up' → '💰 pass up'. Could add explicit mapping in a
            # follow-up — for now they'll render clearly enough that members
            # can identify the source.
            "commission_type": c.commission_type or "course",
            "amount_usdt": float(c.amount or 0),
            # CourseCommission has no status column — they're written when
            # paid, so always 'paid' for the feed.
            "status": "paid",
            "package_tier": c.course_tier,
            "source": "course",
        })

    # Merge time-sorted, take the top N
    rows.sort(key=lambda r: r["created_at"] or "", reverse=True)
    return rows[:limit]
