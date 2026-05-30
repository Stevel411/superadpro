# ═══════════════════════════════════════════════════════════════
# SuperAdPro — 6×6 Profit Grid (Spillover Model)
#
# Commission Architecture (Stream 2) — updated 25 May 2026:
#   40% → Direct Sponsor   (person who personally referred the entrant)
#   50% → Uni-Level Pool   (6.25% × 8 levels in the entrant's upline chain)
#    0% → Platform Fee     (reallocated to bonus pool 21 May 2026)
#   10% → Grid Completion Bonus Pool (accrues per seat, pays at seat 36)
#
# Grid shape (25 May 2026): 6 wide × 6 deep = 36 positions.
# Completion bonus pays when seat 36 fills. UNILEVEL_DEPTH stays at 8
# (decoupled from GRID_LEVELS) — the grid is now a visualisation of a
# slice of uni-level activity, not the full chain. Total $/year is
# unchanged from the previous 8×8/64 model; cycles just complete ~1.78×
# more often.
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
    GRID_WIDTH, GRID_LEVELS, GRID_TOTAL, UNILEVEL_DEPTH,
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


def _policy_bonus_target(package_tier: int) -> float:
    """Returns the policy-target completion bonus for a tier under the
    current 10%/36-seat rules: tier_price × GRID_TOTAL × BONUS_POOL_PCT.

    Used by _accrue_to_pool to cap accrual at the target (so pools never
    exceed the displayed $72/$180/etc.), and by _complete_grid to back-fill
    legacy grids whose pools accrued under historical rates (pre-21-May
    5% rate, or pre-25-May 64-seat geometry) so members still receive the
    full advertised bonus. The pool is what gets PAID, but the target is
    what gets PROMISED, and the promise wins.
    """
    return float(GRID_PACKAGES.get(package_tier, 0)) * float(GRID_TOTAL) * float(BONUS_POOL_PCT)


def _accrue_to_pool(grid: Grid, raw_accrual: float) -> Decimal:
    """Adds `raw_accrual` (10% of seat price) to `grid.bonus_pool_accrued`,
    capped at the policy target for this tier. Returns the resulting pool
    value as a Decimal so callers can debug if needed.

    Why cap: in-flight grids whose pools were back-filled to the policy
    target by the 26 May retroactive migration would otherwise continue
    accruing on top of the target as new seats fill, over-paying the
    completion bonus relative to the advertised $72/$180/etc.

    Pre-cap behaviour preserved for grids still below target — they keep
    accruing normally.
    """
    target = Decimal(str(_policy_bonus_target(grid.package_tier)))
    current = Decimal(str(grid.bonus_pool_accrued or 0))
    proposed = current + Decimal(str(raw_accrual))
    grid.bonus_pool_accrued = min(proposed, target)
    return grid.bonus_pool_accrued


def process_tier_purchase(
    db:           Session,
    buyer_id:     int,
    package_tier: int,
    bypass_repurchase_guard: bool = False,
    source_event_id: str = None,
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

    source_event_id (28 May 2026): a payment-event identifier (Stripe passes
    the checkout session id). When set, it is (a) stamped on every grid
    commission row for traceability, and (b) used by the replay guard below
    to detect a re-run of the SAME payment event — closing the Stripe-retry
    double-pay hole. The guard sits at the entry point, BEFORE any balance is
    credited, because the commission writers credit balances inline; a
    per-row guard would leave balances double-credited while refusing the row.
    """
    price = GRID_PACKAGES.get(package_tier)
    if not price:
        return {"success": False, "error": "Invalid package tier"}

    buyer = db.query(User).filter(User.id == buyer_id).first()
    if not buyer:
        return {"success": False, "error": "Buyer not found"}

    # ── Payment-event replay guard (28 May 2026) ───────────────────────────
    # If this exact payment event has already produced grid commissions, it's
    # a replay (e.g. Stripe re-delivering checkout.session.completed). Bail
    # before crediting anyone. Checked first so no balance is touched on a
    # replay. Member-bound commission rows also carry source_event_id and are
    # backstopped by uniq_commission_event, but this entry check is what
    # protects the inline balance credits.
    if source_event_id:
        already = db.query(Commission).filter(
            Commission.source_event_id == source_event_id,
            Commission.commission_type.in_(["direct_sponsor", "uni_level"]),
        ).first()
        if already:
            import logging as _logging
            _logging.getLogger(__name__).warning(
                f"DUPLICATE GRID PURCHASE BLOCKED (event={source_event_id}): "
                f"buyer={buyer_id} tier={package_tier} — replay of an already-"
                f"processed payment event. No commissions/placements re-issued."
            )
            return {
                "success": True,
                "idempotent_replay": True,
                "buyer_id": buyer_id,
                "package_tier": package_tier,
                "message": "Tier purchase already processed for this payment event.",
            }

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

    # ── Sequential tier purchase gate (added 26 May 2026) ─────────────────
    # Steve's rule: members must own all lower tiers before buying a
    # higher one. So Tier N requires that the member has previously
    # owned Tier N-1 (any historical Grid record at that tier counts,
    # active or complete). Tier 1 has no prerequisite.
    #
    # Why: keeps the upline chain coherent — every downline upgrade
    # creates an at-risk grace event for upline who must catch up.
    # If anyone could skip from Tier 1 → Tier 5, the grace-period
    # economics break, and members who never bought Tiers 2–4 still
    # somehow earn at those tiers.
    #
    # Existing Grids that pre-date this rule are grandfathered:
    # the check only inspects whether the prerequisite tier has EVER
    # been owned, not whether the entire ladder is contiguous. That
    # means a historical skip (Tier 1 + Tier 3, no Tier 2) blocks
    # Tier 4 purchase — the member must buy Tier 2 first to fill the
    # gap. Acceptable, because Steve confirmed no historical skips
    # exist at this stage of platform life.
    #
    # bypass_repurchase_guard bypasses this too — manual recovery is
    # always allowed to skip checks (the admin knows what they're doing).
    if not bypass_repurchase_guard and package_tier > 1:
        prerequisite_tier = package_tier - 1
        owns_prerequisite = db.query(Grid).filter(
            Grid.owner_id     == buyer_id,
            Grid.package_tier == prerequisite_tier,
        ).first()
        if not owns_prerequisite:
            return {
                "success": False,
                "error": (
                    f"Tier {package_tier} requires Tier {prerequisite_tier} first. "
                    f"Campaign Tiers must be purchased in order — buy Tier "
                    f"{prerequisite_tier} before Tier {package_tier}."
                ),
                "code": "tier_sequence_violation",
                "required_tier": prerequisite_tier,
            }

    # Pay commissions based on the buyer's sponsor chain
    _pay_direct_sponsor(db, buyer, price, package_tier, source_event_id=source_event_id)
    _pay_unilevel_chain(db, buyer, price, package_tier, source_event_id=source_event_id)
    _record_platform_fee(db, price, package_tier, buyer_id)

    # Create the buyer's own grid at this tier (so they can receive spillover)
    # and flag it as a GENUINE purchase — this is the one place the grid owner
    # is the actual buyer. Spillover-created grids (get_or_create_active_grid
    # called from _spillover_fill) leave owner_purchased=False, so they won't
    # falsely show the owner as having an active tier they never bought.
    _own_grid = get_or_create_active_grid(db, buyer_id, package_tier)
    if not _own_grid.owner_purchased:
        _own_grid.owner_purchased = True
        db.add(_own_grid)

    # Spillover: fill one seat in every upline grid at this tier
    grids_filled = _spillover_fill(db, buyer_id, package_tier)

    # ── Grace-period escrow side-effects ───────────────────────────────
    # 1. Release any pending commissions the buyer themselves now
    #    qualifies for (i.e. they upgraded to or past the required tier).
    # 2. Send "your downline upgraded" notifications + emails to anyone
    #    whose commission slot just got escrowed by this purchase.
    released = _release_pending_for_user(db, buyer_id, package_tier)
    _notify_grace_escrow_events(db, buyer, package_tier, price)

    db.commit()

    # Best-effort email side-effects AFTER commit so a mailer failure
    # doesn't roll back the actual commission writes.
    try:
        _send_grace_escrow_emails(db, buyer, package_tier, price)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(
            f"Grace-escrow email side-effects failed for buyer {buyer_id} "
            f"tier {package_tier}: {e}"
        )
    if released:
        try:
            _send_release_email(db, buyer, released)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"Release-confirmation email failed for buyer {buyer_id}: {e}"
            )

    return {
        "success": True,
        "buyer_id": buyer_id,
        "package_tier": package_tier,
        "price": price,
        "grids_filled": grids_filled,
        "released_pending": released,
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

                # Accrue 10% bonus pool on this grid, capped at policy target.
                # The cap matters because retroactive top-ups (26 May 2026) may
                # have already set this grid's pool to the full target — further
                # accrual must not push past the advertised $72/$180/etc.
                bonus_amount = round(float(price) * BONUS_POOL_PCT, 2)
                _accrue_to_pool(grid, bonus_amount)

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

    # Accrue 10% bonus pool, capped at policy target (see _accrue_to_pool).
    bonus_amount = round(float(price) * BONUS_POOL_PCT, 2)
    _accrue_to_pool(grid, bonus_amount)

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


# ── Grace-period escrow constants & helpers ──────────────────────────────
# Per Steve's product spec (26 May 2026): when an unqualified upline
# would have earned a commission from a downline's tier upgrade, hold
# the funds in escrow for 3 days. If the upline upgrades in time, the
# escrowed commissions are released to them; otherwise they expire and
# pay to the company.
GRACE_PERIOD_DAYS = 3


def _escrow_pending_commission(db: Session, recipient_id: int, trigger_id: int,
                                amount: float, commission_type: str,
                                package_tier: int, notes: str = None) -> None:
    """Write a PendingCommission row instead of paying the company.

    Notification side-effects (in-app bell + email) are emitted at the
    end of process_tier_purchase once all escrow rows for this purchase
    are written, so members get one combined notification per upgrade
    event rather than one per commission slot.
    """
    from .database import PendingCommission
    expires_at = datetime.utcnow() + timedelta(days=GRACE_PERIOD_DAYS)
    pc = PendingCommission(
        recipient_id    = recipient_id,
        trigger_id      = trigger_id,
        amount_usdt     = Decimal(str(round(amount, 2))),
        commission_type = commission_type,
        package_tier    = package_tier,
        required_tier   = package_tier,  # match-the-tier rule (Steve, 26 May 2026)
        status          = "pending",
        expires_at      = expires_at,
        notes           = notes,
    )
    db.add(pc)


def _release_pending_for_user(db: Session, user_id: int, just_acquired_tier: int) -> list:
    """When `user_id` just acquired `just_acquired_tier`, release any
    of their pending commissions where required_tier <= just_acquired_tier
    AND the grace period hasn't expired yet. Pay the amounts to their
    campaign_balance, write 'paid' Commission rows for audit, and mark
    the pending rows as 'released'.

    Returns a list of dicts describing what was released — used by the
    caller to build the release-confirmation notification + email.
    """
    from .database import PendingCommission, User as _User, Notification as _Notification
    pending = db.query(PendingCommission).filter(
        PendingCommission.recipient_id == user_id,
        PendingCommission.status == "pending",
        PendingCommission.required_tier <= just_acquired_tier,
        PendingCommission.expires_at > datetime.utcnow(),
    ).all()
    if not pending:
        return []

    user = db.query(_User).filter(_User.id == user_id).first()
    released_summary = []
    total_released = Decimal("0")

    for pc in pending:
        amt = Decimal(str(pc.amount_usdt or 0))
        # Credit the wallet
        user.campaign_balance = Decimal(str(user.campaign_balance or 0)) + amt
        user.total_earned     = Decimal(str(user.total_earned or 0))     + amt
        if pc.commission_type == "direct_sponsor":
            user.grid_earnings = Decimal(str(user.grid_earnings or 0)) + amt
        elif pc.commission_type == "uni_level":
            user.level_earnings = Decimal(str(user.level_earnings or 0)) + amt
        # Audit log
        _record_commission(
            db, pc.trigger_id, user_id, float(amt), pc.commission_type,
            f"Grace-period release: pending #{pc.id} (trigger user {pc.trigger_id}, "
            f"tier {pc.package_tier}) claimed by tier {just_acquired_tier} upgrade",
            pc.package_tier,
        )
        # Mark as released
        pc.status = "released"
        pc.released_at = datetime.utcnow()
        total_released += amt
        released_summary.append({
            "pending_id": pc.id,
            "amount": float(amt),
            "commission_type": pc.commission_type,
            "trigger_id": pc.trigger_id,
            "tier": pc.package_tier,
        })

    # In-app notification for the release
    if released_summary:
        n_count = len(released_summary)
        db.add(_Notification(
            user_id = user_id,
            type    = "commission",
            icon    = "🔓",
            title   = f"${float(total_released):.2f} released from grace period",
            message = (f"You just upgraded to Tier {just_acquired_tier} — "
                       f"{n_count} pending commission{'s' if n_count != 1 else ''} "
                       f"released to your Campaign Wallet."),
            link    = "/wallet",
        ))

    return released_summary


def _notify_grace_escrow_events(db: Session, buyer: User, package_tier: int, price: float) -> None:
    """For every pending commission just created by this buyer's
    upgrade (i.e. created in the last few seconds), drop an in-app
    notification on the recipient's bell with a 'you have 3 days' CTA.

    Same-transaction with process_tier_purchase; emails are sent
    AFTER commit (see _send_grace_escrow_emails).
    """
    from .database import PendingCommission, Notification as _Notification
    cutoff = datetime.utcnow() - timedelta(seconds=10)
    fresh = db.query(PendingCommission).filter(
        PendingCommission.trigger_id == buyer.id,
        PendingCommission.package_tier == package_tier,
        PendingCommission.status == "pending",
        PendingCommission.created_at >= cutoff,
    ).all()
    if not fresh:
        return

    # Group by recipient so each member gets ONE notification combining
    # all their escrowed slots for this event (not one per uni-level rung)
    by_recipient = {}
    for pc in fresh:
        by_recipient.setdefault(pc.recipient_id, []).append(pc)

    buyer_name = (buyer.first_name or buyer.username or f"user {buyer.id}")
    for recipient_id, rows in by_recipient.items():
        total = sum(float(r.amount_usdt or 0) for r in rows)
        # Use the earliest expiry as the deadline shown to the member
        earliest_expiry = min((r.expires_at for r in rows), default=datetime.utcnow())
        deadline_str = earliest_expiry.strftime("%d %b %H:%M UTC")
        db.add(_Notification(
            user_id = recipient_id,
            type    = "commission",
            icon    = "⏳",
            title   = f"${total:.2f} held — your downline upgraded to Tier {package_tier}",
            message = (f"{buyer_name} just upgraded to Tier {package_tier}. You have until "
                       f"{deadline_str} to upgrade and claim ${total:.2f} in commissions, "
                       f"or it goes to the company."),
            link    = "/grid-visualiser",
        ))


def _send_grace_escrow_emails(db: Session, buyer: User, package_tier: int, price: float) -> None:
    """Best-effort: email each recipient of a freshly-escrowed pending
    commission slot from this purchase, telling them they have 3 days
    to upgrade and claim. Called AFTER db.commit() so mailer failures
    don't roll back commissions.
    """
    from .database import PendingCommission
    from .email_utils import _shell, _card, _btn, _check, send_email, SITE_URL
    cutoff = datetime.utcnow() - timedelta(seconds=30)
    fresh = db.query(PendingCommission).filter(
        PendingCommission.trigger_id == buyer.id,
        PendingCommission.package_tier == package_tier,
        PendingCommission.status == "pending",
        PendingCommission.created_at >= cutoff,
    ).all()
    if not fresh:
        return

    by_recipient = {}
    for pc in fresh:
        by_recipient.setdefault(pc.recipient_id, []).append(pc)

    buyer_name = (buyer.first_name or buyer.username or f"user {buyer.id}")
    for recipient_id, rows in by_recipient.items():
        recipient = db.query(User).filter(User.id == recipient_id).first()
        if not recipient or not recipient.email:
            continue
        total = sum(float(r.amount_usdt or 0) for r in rows)
        earliest_expiry = min((r.expires_at for r in rows), default=datetime.utcnow())
        deadline_str = earliest_expiry.strftime("%d %b %Y, %H:%M UTC")
        first_name = recipient.first_name or recipient.username or "there"

        hero = (
            f'<div style="font-size:48px;margin-bottom:14px">&#127881;</div>'
            f'<p style="margin:0 0 10px;font-size:26px;font-weight:900;color:#0f1d3a;line-height:1.25">'
            f'You earned <span style="color:#0ea5e9">${total:.2f}</span>, {first_name}!</p>'
            f'<p style="margin:0;font-size:15px;color:#475569;line-height:1.7">'
            f'<strong>{buyer_name}</strong> just activated Campaign Tier {package_tier} '
            f'(${int(price)}), and you earned a commission on it. Here\'s how to claim it.'
            f'</p>'
        )

        explainer = (
            f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">'
            f'<tr><td style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;padding:24px">'
            f'<p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:1px;'
            f'text-transform:uppercase;color:#0284c7">What\'s happening</p>'
            f'<p style="margin:0 0 12px;font-size:14.5px;color:#334155;line-height:1.7">'
            f'<strong>You earned this commission.</strong> When your team activates a Campaign Tier, '
            f'you earn on it &mdash; this time that\'s <strong>${total:.2f}</strong>.</p>'
            f'<p style="margin:0 0 12px;font-size:14.5px;color:#334155;line-height:1.7">'
            f'<strong>Why it\'s being held.</strong> The compensation plan pays Grid commissions at '
            f'tiers you hold yourself. This was earned at <strong>Tier {package_tier}</strong>, so to '
            f'receive it you\'d need an active Tier {package_tier} (or higher).</p>'
            f'<p style="margin:0;font-size:14.5px;color:#334155;line-height:1.7">'
            f'<strong>You have until {deadline_str}.</strong> Upgrade before then and the full '
            f'<strong>${total:.2f}</strong> is released to your Campaign Wallet automatically &mdash; '
            f'and you\'ll earn at this tier going forward. Prefer not to upgrade? That\'s absolutely fine; '
            f'no action is needed.</p>'
            f'</td></tr></table>'
        )

        commission_card = (
            f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">'
            f'<tr><td style="background:linear-gradient(135deg,#172554,#1e3a8a);'
            f'border-radius:14px;padding:26px;text-align:center">'
            f'<p style="margin:0 0 6px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.6);'
            f'text-transform:uppercase;letter-spacing:1px">Held for you</p>'
            f'<p style="margin:0 0 8px;font-size:38px;font-weight:900;color:#22d3ee;'
            f'font-family:\'Sora\',sans-serif">${total:.2f}</p>'
            f'<p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);font-weight:600">'
            f'Available to claim until {deadline_str}'
            f'</p></td></tr></table>'
        )

        body = explainer + commission_card + _btn(
            f"{SITE_URL}/campaign-tiers", f"Upgrade to Tier {package_tier} &amp; claim ${total:.2f} &rarr;")

        subject = f"You earned ${total:.2f}, {first_name} — here's how to claim it"
        text = (f"Hi {first_name}, {buyer_name} just activated Campaign Tier {package_tier} and you earned "
                f"${total:.2f} in commission. The plan pays Grid commissions at tiers you hold yourself, and "
                f"this was earned at Tier {package_tier}. Upgrade to Tier {package_tier} (or higher) by "
                f"{deadline_str} and the ${total:.2f} releases to your Campaign Wallet automatically. Prefer not "
                f"to upgrade? No action needed. Upgrade: {SITE_URL}/campaign-tiers")
        try:
            send_email(recipient.email, subject,
                       _shell("Commission Available", "linear-gradient(135deg,#f0f9ff,#e0f2fe)", hero, body),
                       text)
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                f"Grace-escrow email send failed for recipient {recipient_id}"
            )


def _send_release_email(db: Session, buyer: User, released: list) -> None:
    """Confirmation email when a member upgrades in time and unlocks
    their pending commissions. Sent AFTER commit.
    """
    if not released:
        return
    from .email_utils import _shell, _card, _btn, send_email, SITE_URL
    recipient = buyer  # the buyer IS the recipient — they upgraded and unlocked their own pending rows
    if not recipient.email:
        return
    total = sum(r.get("amount", 0) for r in released)
    n_count = len(released)
    first_name = recipient.first_name or recipient.username or "there"

    hero = (
        f'<div style="font-size:48px;margin-bottom:14px">&#128275;</div>'
        f'<p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#15803d;line-height:1.2">'
        f'Unlocked, <span style="color:#0ea5e9">{first_name}!</span></p>'
        f'<p style="margin:0;font-size:15px;color:#166534;line-height:1.7">'
        f'You upgraded in time. <strong>${total:.2f}</strong> in pending commissions '
        f'just released to your Campaign Wallet.'
        f'</p>'
    )
    amount_card = (
        f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">'
        f'<tr><td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;'
        f'border-radius:14px;padding:28px;text-align:center">'
        f'<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#15803d;'
        f'text-transform:uppercase;letter-spacing:1px">Released to wallet</p>'
        f'<p style="margin:0 0 6px;font-size:36px;font-weight:900;color:#14532d;'
        f'font-family:\'Sora\',sans-serif">${total:.2f}</p>'
        f'<p style="margin:0;font-size:13px;color:#15803d;font-weight:600">'
        f"{n_count} commission{'s' if n_count != 1 else ''} unlocked"
        f'</p></td></tr></table>'
    )
    body = amount_card + _btn(f"{SITE_URL}/wallet", "View my wallet &rarr;", "#22c55e")
    subject = f"Unlocked: ${total:.2f} released to your wallet"
    text = (f"Hi {first_name}, you upgraded in time! ${total:.2f} in pending commissions "
            f"just released. View your wallet: {SITE_URL}/wallet")
    try:
        send_email(recipient.email, subject,
                   _shell("Unlocked", "linear-gradient(135deg,#f0fdf4,#dcfce7)", hero, body),
                   text)
    except Exception:
        import logging
        logging.getLogger(__name__).warning(
            f"Release-confirmation email failed for user {recipient.id}"
        )


def _pay_direct_sponsor(db: Session, buyer: User, price: float, package_tier: int, source_event_id: str = None):
    """40% to the buyer's personal sponsor — or escrowed for 3 days if
    the sponsor isn't qualified at this tier (grace period to upgrade).
    """
    amount = round(float(price) * DIRECT_PCT, 2)

    if not buyer.sponsor_id:
        # No sponsor at all — money goes to company directly, no escrow.
        # There's nobody who could "catch up" to claim it.
        _record_commission(db, buyer.id, None, amount, "direct_sponsor",
                           f"No sponsor — 40% company absorb on ${price}",
                           package_tier, source_event_id=source_event_id)
        return

    sponsor = db.query(User).filter(User.id == buyer.sponsor_id).first()

    # Check if sponsor is qualified at this tier or above
    if sponsor and _user_is_qualified(db, sponsor.id, package_tier):
        sponsor.campaign_balance = Decimal(str(sponsor.campaign_balance or 0)) + Decimal(str(amount))
        sponsor.total_earned  = Decimal(str(sponsor.total_earned or 0)) + Decimal(str(amount))
        sponsor.grid_earnings = Decimal(str(sponsor.grid_earnings or 0)) + Decimal(str(amount))
        _record_commission(db, buyer.id, sponsor.id, amount, "direct_sponsor",
                           f"Direct sponsor 40% — buyer {buyer.id} on ${price} package",
                           package_tier, source_event_id=source_event_id)
    elif sponsor:
        # Sponsor unqualified — escrow for 3 days, sponsor can claim by
        # upgrading to this tier within the grace window.
        _escrow_pending_commission(
            db,
            recipient_id    = sponsor.id,
            trigger_id      = buyer.id,
            amount          = amount,
            commission_type = "direct_sponsor",
            package_tier    = package_tier,
            notes           = (f"40% direct on ${price} from buyer {buyer.id} — "
                               f"escrowed pending upgrade to tier {package_tier}"),
        )
    else:
        # Sponsor record missing (shouldn't happen, but defensive). No
        # escrow possible — company absorbs.
        _record_commission(db, buyer.id, None, amount, "direct_sponsor",
                           f"Sponsor {buyer.sponsor_id} not found — 40% company absorb",
                           package_tier, source_event_id=source_event_id)


def _pay_unilevel_chain(db: Session, buyer: User, price: float, package_tier: int, source_event_id: str = None):
    """6.25% to each of 8 sponsor chain levels above the buyer.
    Each level checked individually — if unqualified at this tier,
    the slot is escrowed for 3 days (grace period to upgrade).

    25 May 2026: uses UNILEVEL_DEPTH (=8), decoupled from GRID_LEVELS (=6).
    Grid visualises 6 levels; commissions still walk 8 levels of sponsor chain.
    26 May 2026: unqualified slots escrow instead of company-absorb.
    """
    per_level = round(float(price) * PER_LEVEL_PCT, 2)
    current_id = buyer.id

    for lvl in range(1, UNILEVEL_DEPTH + 1):
        current_user = db.query(User).filter(User.id == current_id).first()
        if not current_user or not current_user.sponsor_id:
            # Chain ended (top of tree) — remaining levels go to company.
            # No escrow because there's nobody to claim.
            for remaining in range(lvl, UNILEVEL_DEPTH + 1):
                _record_commission(db, buyer.id, None, per_level, "uni_level",
                                   f"Uni-level {remaining} — chain ended, company absorb",
                                   package_tier, source_event_id=source_event_id)
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
                               package_tier, source_event_id=source_event_id)
        elif upline:
            # Unqualified at this tier — escrow for 3 days. Upline can
            # claim by upgrading to package_tier within the grace window.
            _escrow_pending_commission(
                db,
                recipient_id    = upline.id,
                trigger_id      = buyer.id,
                amount          = per_level,
                commission_type = "uni_level",
                package_tier    = package_tier,
                notes           = (f"Uni-level {lvl} (6.25% of ${price}) — "
                                   f"escrowed pending upgrade to tier {package_tier}"),
            )
        else:
            # Upline record missing (defensive). No escrow possible.
            _record_commission(db, buyer.id, None, per_level, "uni_level",
                               f"Uni-level {lvl} — upline {upline_id} not found, company absorb",
                               package_tier, source_event_id=source_event_id)

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

    # Pay the HIGHER of actual-accrued vs policy-target. Grids that accrued
    # under historical rates (pre-21-May 5%, pre-25-May 64-seat) might fall
    # short of the advertised $72/$180/etc. — top them up so the displayed
    # bonus is what gets paid. Forward grids cap at the target via
    # _accrue_to_pool, so actual_accrued == target for those.
    actual_accrued = float(grid.bonus_pool_accrued or 0)
    policy_target = _policy_bonus_target(grid.package_tier)
    bonus_amount = max(actual_accrued, policy_target)
    # Persist the topped-up value so the grid record matches what was paid.
    if bonus_amount > actual_accrued:
        grid.bonus_pool_accrued = Decimal(str(bonus_amount))

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
                         f"all {GRID_TOTAL} seats. ${bonus_amount:.2f} completion bonus added to your Campaign Wallet. "
                         f"Advance {grid.advance_number + 1} is now open and ready for new spillover.")
        elif owner and grid.bonus_rolled_over:
            # Bonus rolled over because not qualified
            notif_title = f"🔄 Grid Tier {grid.package_tier} complete — bonus rolled over"
            notif_msg = (f"Your Tier {grid.package_tier} grid (advance {grid.advance_number}) filled all {GRID_TOTAL} seats. "
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

        # ── Award the grid_bonus_paid achievement ─────────────────────
        # First time a member's grid completes AND pays out the bonus,
        # they get the "Grid Bonus Earned" badge. Idempotent: re-checks
        # for an existing row before inserting. The badge is intentionally
        # awarded only when bonus_paid (not on rollover) — the badge means
        # "you received the bonus", not "you completed a grid".
        #
        # metadata_json captures the actual bonus amount and tier so the
        # badge can display "$72 · Tier 1" rather than the generic title.
        # Updated on each subsequent completion to reflect the LATEST and
        # HIGHEST grid bonus the member has earned (so the badge stays
        # impressive as members progress up the tier ladder).
        if owner and grid.bonus_paid:
            import json as _json
            from .database import Achievement, BADGES
            already_has = db.query(Achievement).filter(
                Achievement.user_id == grid.owner_id,
                Achievement.badge_id == "grid_bonus_paid",
            ).first()
            new_meta = _json.dumps({
                "amount": round(float(bonus_amount), 2),
                "tier": grid.package_tier,
            })
            if already_has:
                # Already has the badge — bump metadata to the highest
                # bonus to date if this one's larger. Keeps the badge
                # marketing-grade ("earned $720 from a Tier 4 grid"
                # outclasses an old "$72 Tier 1" record).
                try:
                    prev = _json.loads(already_has.metadata_json or "{}")
                    if float(bonus_amount) > float(prev.get("amount", 0)):
                        already_has.metadata_json = new_meta
                except Exception:
                    already_has.metadata_json = new_meta
            elif "grid_bonus_paid" in BADGES:
                b = BADGES["grid_bonus_paid"]
                db.add(Achievement(
                    user_id=grid.owner_id,
                    badge_id="grid_bonus_paid",
                    title=b["title"],
                    icon=b["icon"],
                    metadata_json=new_meta,
                ))
                # Companion notification so the badge unlock surfaces in
                # the notification feed too, not just on the achievements
                # page. Same best-effort pattern as the completion notif.
                db.add(Notification(
                    user_id=grid.owner_id,
                    type="achievement",
                    icon=b["icon"],
                    title=f'Badge earned: {b["title"]}!',
                    message=f'You earned a ${bonus_amount:.2f} grid completion bonus from Tier {grid.package_tier}!',
                    link="/achievements",
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
                       package_tier: int = None, source_event_id: str = None):
    # source_event_id (28 May 2026): stamped on the row so the purchase event
    # is traceable and so the entry-point replay guard in process_tier_purchase
    # can detect a re-run by querying for prior commissions with this event id.
    # The dedup DECISION lives at the entry point (before any balance is
    # credited), NOT here — crediting happens in the callers before this is
    # called, so an in-row guard would leave balances double-credited while
    # refusing the row. Legacy callers pass None and are unaffected.
    db.add(Commission(
        from_user_id    = from_user_id,
        to_user_id      = to_user_id,
        amount_usdt     = amount,
        commission_type = comm_type,
        package_tier    = package_tier,
        status          = "paid" if to_user_id else "platform",
        notes           = notes,
        paid_at         = datetime.utcnow(),
        source_event_id = source_event_id,
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
