"""
SuperAdPro Course Commission Engine
====================================
Infinite Pass-Up System with 100% Commissions

RULES:
1. Every affiliate earns 100% commission on their personal course sales.
2. HOWEVER, the affiliate's FIRST sale at each tier passes UP to their
   qualified sponsor (someone who owns that tier or higher).
3. If the direct sponsor is NOT qualified, the pass-up walks the sponsor
   chain upward until it finds a qualified person.
4. If nobody in the chain qualifies, the commission goes to the platform
   (company account / admin).
5. "Qualified" means the potential earner has PURCHASED that course tier
   themselves (you must own what you sell).

This creates infinite depth:
  - Affiliate A recruits B, B recruits C, C recruits D...
  - D's 1st sale at Tier 1 passes up to C (if qualified), C's 1st passed
    to B, B's 1st passed to A... and so on forever up the chain.
  - Every subsequent sale at that tier, the affiliate keeps 100%.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import (
    User, Course, CoursePurchase, CourseCommission,
    CoursePassUpTracker
)


def get_or_create_tracker(db: Session, user_id: int, course_tier: int) -> CoursePassUpTracker:
    """Get or create the pass-up tracker for a user at a specific tier."""
    tracker = db.query(CoursePassUpTracker).filter(
        CoursePassUpTracker.user_id == user_id,
        CoursePassUpTracker.course_tier == course_tier
    ).first()
    if not tracker:
        tracker = CoursePassUpTracker(
            user_id=user_id,
            course_tier=course_tier,
            sales_count=0,
            first_passed_up=False
        )
        db.add(tracker)
        db.flush()
    return tracker


def user_owns_tier(db: Session, user_id: int, course_tier: int) -> bool:
    """Check if a user has purchased a course at this tier (or higher)."""
    purchase = db.query(CoursePurchase).filter(
        CoursePurchase.user_id == user_id,
        CoursePurchase.course_tier >= course_tier
    ).first()
    return purchase is not None


def find_qualified_upline(db: Session, starting_sponsor_id: int, course_tier: int, max_depth: int = 500):
    """
    Walk the sponsor chain upward from starting_sponsor_id to find
    the first person who OWNS this course tier (qualified earner).

    Returns (user, depth) or (None, depth) if nobody qualifies.
    """
    current_id = starting_sponsor_id
    depth = 0

    while current_id is not None and depth < max_depth:
        depth += 1
        user = db.query(User).filter(User.id == current_id).first()
        if user is None:
            break

        # Check if this person owns the tier
        if user_owns_tier(db, user.id, course_tier):
            return user, depth

        # Move up to their sponsor
        current_id = user.sponsor_id

    return None, depth


def process_course_purchase(db: Session, buyer_id: int, course_id: int, payment_method: str = "wallet", tx_ref: str = None) -> dict:
    """
    Main entry point: process a course purchase and distribute commissions.

    Returns a dict with purchase details and commission info.
    """
    buyer = db.query(User).filter(User.id == buyer_id).first()
    if not buyer:
        return {"success": False, "error": "Buyer not found"}

    course = db.query(Course).filter(Course.id == course_id, Course.is_active == True).first()
    if not course:
        return {"success": False, "error": "Course not found or inactive"}

    # Check if already purchased this tier
    existing = db.query(CoursePurchase).filter(
        CoursePurchase.user_id == buyer_id,
        CoursePurchase.course_tier == course.tier
    ).first()
    if existing:
        return {"success": False, "error": f"Already purchased Tier {course.tier}"}

    # Check wallet balance if paying from wallet
    if payment_method == "wallet" and buyer.balance < course.price:
        return {"success": False, "error": f"Insufficient balance. Need ${course.price:.2f}, have ${buyer.balance:.2f}"}

    # --- Create the purchase record ---
    purchase = CoursePurchase(
        user_id=buyer_id,
        course_id=course_id,
        course_tier=course.tier,
        amount_paid=course.price,
        payment_method=payment_method,
        tx_ref=tx_ref
    )
    db.add(purchase)
    db.flush()  # get the purchase ID

    # Deduct from wallet if applicable
    if payment_method == "wallet":
        buyer.balance -= course.price

    # --- Commission Distribution ---
    commission_result = _distribute_commission(db, purchase, buyer, course)

    db.commit()

    return {
        "success": True,
        "purchase_id": purchase.id,
        "course": course.title,
        "tier": course.tier,
        "amount": course.price,
        "commission": commission_result
    }


def _distribute_commission(db: Session, purchase: CoursePurchase, buyer: User, course: Course) -> dict:
    """
    Determine who earns the 100% commission for this purchase.

    Logic:
    1. The buyer's sponsor is the REFERRING affiliate.
    2. If the sponsor has no previous sales at this tier, this IS their
       first sale — so it passes up to THEIR qualified upline.
    3. If the sponsor HAS previous sales (already passed up their 1st),
       the sponsor keeps 100%.
    4. The pass-up keeps walking until it finds someone who:
       a) Has already passed up their own 1st sale at this tier, AND
       b) Owns this tier themselves (qualified).
       OR reaches the top of the chain → platform keeps it.
    """
    sponsor_id = buyer.sponsor_id
    commission_amount = course.price  # 100% commission

    # No sponsor = organic purchase → platform revenue
    if not sponsor_id:
        return _credit_platform(db, purchase, course, commission_amount,
                                "No sponsor — organic purchase")

    sponsor = db.query(User).filter(User.id == sponsor_id).first()
    if not sponsor:
        return _credit_platform(db, purchase, course, commission_amount,
                                "Sponsor not found")

    # Get or create the sponsor's tracker for this tier
    tracker = get_or_create_tracker(db, sponsor.id, course.tier)

    # Increment the sponsor's sale count (they referred this buyer)
    tracker.sales_count += 1

    if not tracker.first_passed_up:
        # This is the sponsor's 1st sale at this tier → PASS UP
        tracker.first_passed_up = True

        # Find qualified upline to receive the pass-up
        earner, depth = _find_passup_recipient(db, sponsor, course.tier)

        if earner:
            return _credit_earner(
                db, purchase, course, earner, commission_amount,
                commission_type="pass_up",
                depth=depth,
                notes=f"Pass-up from {sponsor.username}'s 1st Tier {course.tier} sale (depth {depth})"
            )
        else:
            return _credit_platform(db, purchase, course, commission_amount,
                                    f"Pass-up: no qualified upline found above {sponsor.username}")
    else:
        # Sponsor has already passed up their 1st → they KEEP this commission
        # But they must be qualified (own the tier)
        if user_owns_tier(db, sponsor.id, course.tier):
            return _credit_earner(
                db, purchase, course, sponsor, commission_amount,
                commission_type="direct_sale",
                depth=0,
                notes=f"Direct commission — {sponsor.username}'s sale #{tracker.sales_count} at Tier {course.tier}"
            )
        else:
            # Sponsor hasn't bought the tier themselves — pass up to qualified
            earner, depth = find_qualified_upline(db, sponsor.sponsor_id, course.tier)
            if earner:
                return _credit_earner(
                    db, purchase, course, earner, commission_amount,
                    commission_type="pass_up",
                    depth=depth,
                    notes=f"Sponsor {sponsor.username} unqualified at Tier {course.tier} — passed up {depth} levels"
                )
            else:
                return _credit_platform(db, purchase, course, commission_amount,
                                        f"No qualified earner in chain above {sponsor.username}")


def _find_passup_recipient(db: Session, sponsor: User, course_tier: int, max_depth: int = 500):
    """
    Walk upward from sponsor's sponsor to find the first QUALIFIED person
    who has already passed up their own 1st sale at this tier.

    Qualified = owns the tier AND has already had their 1st sale pass up
    (or is an admin/platform owner).
    """
    current_id = sponsor.sponsor_id
    depth = 0

    while current_id is not None and depth < max_depth:
        depth += 1
        candidate = db.query(User).filter(User.id == current_id).first()
        if candidate is None:
            break

        # Admin/platform owner always qualifies
        if candidate.is_admin:
            return candidate, depth

        # Must own the tier
        if user_owns_tier(db, candidate.id, course_tier):
            # Check if they've already passed up their own 1st sale
            their_tracker = get_or_create_tracker(db, candidate.id, course_tier)
            if their_tracker.first_passed_up or their_tracker.sales_count > 0:
                return candidate, depth
            # They haven't had any sales yet at this tier — this pass-up
            # BECOMES their 1st sale pass-up, so it continues walking
            their_tracker.sales_count += 1
            their_tracker.first_passed_up = True
            # Keep walking up

        current_id = candidate.sponsor_id

    return None, depth


def _credit_earner(db: Session, purchase, course, earner, amount, commission_type, depth, notes) -> dict:
    """Credit commission to the earner's wallet and log it."""
    commission = CourseCommission(
        purchase_id=purchase.id,
        buyer_id=purchase.user_id,
        earner_id=earner.id,
        amount=amount,
        course_tier=course.tier,
        commission_type=commission_type,
        pass_up_depth=depth,
        notes=notes
    )
    db.add(commission)

    # Credit the earner's balance
    earner.balance += amount
    earner.total_earned += amount
    earner.course_earnings += amount

    return {
        "earner_id": earner.id,
        "earner_username": earner.username,
        "amount": amount,
        "type": commission_type,
        "depth": depth,
        "notes": notes
    }


def _credit_platform(db: Session, purchase, course, amount, notes) -> dict:
    """Commission goes to the platform (no qualified upline)."""
    # Find admin user to credit, or just log it
    admin = db.query(User).filter(User.is_admin == True).first()

    commission = CourseCommission(
        purchase_id=purchase.id,
        buyer_id=purchase.user_id,
        earner_id=admin.id if admin else None,
        amount=amount,
        course_tier=course.tier,
        commission_type="platform",
        pass_up_depth=0,
        notes=notes
    )
    db.add(commission)

    if admin:
        admin.balance += amount
        admin.total_earned += amount

    return {
        "earner_id": admin.id if admin else None,
        "earner_username": "PLATFORM" if not admin else admin.username,
        "amount": amount,
        "type": "platform",
        "depth": 0,
        "notes": notes
    }


# ─── Utility / Reporting ───────────────────────────────────────

def get_user_course_stats(db: Session, user_id: int) -> dict:
    """Get a user's course-related stats for their dashboard."""
    purchases = db.query(CoursePurchase).filter(
        CoursePurchase.user_id == user_id
    ).all()
    owned_tiers = [p.course_tier for p in purchases]

    # Commissions earned
    commissions = db.query(CourseCommission).filter(
        CourseCommission.earner_id == user_id
    ).all()
    total_earned = sum(c.amount for c in commissions)
    direct_count = sum(1 for c in commissions if c.commission_type == "direct_sale")
    passup_count = sum(1 for c in commissions if c.commission_type == "pass_up")

    # Sales made (as referring affiliate)
    trackers = db.query(CoursePassUpTracker).filter(
        CoursePassUpTracker.user_id == user_id
    ).all()
    total_sales = sum(t.sales_count for t in trackers)

    return {
        "owned_tiers": owned_tiers,
        "total_earned": total_earned,
        "direct_commissions": direct_count,
        "passup_commissions": passup_count,
        "total_sales": total_sales,
        "trackers": {t.course_tier: {"sales": t.sales_count, "passed_up": t.first_passed_up} for t in trackers}
    }
