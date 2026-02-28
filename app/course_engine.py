"""
SuperAdPro Course Commission Engine — Infinite Pass-Up System
=============================================================

COMP PLAN:
  - 3 tiers: $100 (Starter), $300 (Advanced), $500 (Elite)
  - 100% commission on every course sale
  - Single counter per affiliate: course_sale_count (all tiers combined)
  - Sales 1, 3, 5, 7+ → affiliate KEEPS 100%
  - Sales 2, 4, 6 → 100% PASSES UP to pass_up_sponsor

PASS-UP SPONSOR ASSIGNMENT (set once, at registration):
  - If you are your sponsor's 1st, 3rd, or 5th referral (kept):
    your pass_up_sponsor = your direct sponsor
  - If you are your sponsor's 2nd, 4th, or 6th referral (passed up):
    your pass_up_sponsor = your sponsor's pass_up_sponsor

CASCADE:
  When a pass-up fires, the commission goes to your pass_up_sponsor.
  That person's 2nd/4th/6th sales also pass up to THEIR pass_up_sponsor.
  This creates infinite depth — pass-ups cascade up forever.

QUALIFICATION:
  Must own the course tier to earn commissions on that tier.
  If pass_up_sponsor is unqualified, commission walks further up
  the pass_up_sponsor chain until a qualified person is found.
  If nobody qualifies, commission goes to the platform (admin).
"""

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import (
    User, Course, CoursePurchase, CourseCommission
)


PASSUP_POSITIONS = {2, 4, 6}


def is_passup_sale(sale_number: int) -> bool:
    return sale_number in PASSUP_POSITIONS


def assign_passup_sponsor(db: Session, new_user: User, sponsor: User):
    """
    Set the new user's pass_up_sponsor based on their position
    in the sponsor's referral sequence. Call at registration time.

    Position 1, 3, 5, 7+ (kept) -> pass_up_sponsor = direct sponsor
    Position 2, 4, 6 (passed up) -> pass_up_sponsor = sponsor's pass_up_sponsor
    """
    if not sponsor:
        new_user.pass_up_sponsor_id = None
        return

    referral_number = db.query(User).filter(
        User.sponsor_id == sponsor.id
    ).count()

    if referral_number in PASSUP_POSITIONS:
        new_user.pass_up_sponsor_id = sponsor.pass_up_sponsor_id or sponsor.id
    else:
        new_user.pass_up_sponsor_id = sponsor.id


def user_owns_tier(db: Session, user_id: int, course_tier: int) -> bool:
    purchase = db.query(CoursePurchase).filter(
        CoursePurchase.user_id == user_id,
        CoursePurchase.course_tier == course_tier
    ).first()
    return purchase is not None


def find_qualified_passup_recipient(db: Session, start_user_id: int, course_tier: int, max_depth: int = 500):
    current_id = start_user_id
    depth = 0
    while current_id is not None and depth < max_depth:
        depth += 1
        candidate = db.query(User).filter(User.id == current_id).first()
        if candidate is None:
            break
        if candidate.is_admin:
            return candidate, depth
        if user_owns_tier(db, candidate.id, course_tier):
            return candidate, depth
        current_id = candidate.pass_up_sponsor_id
    return None, depth


def process_course_purchase(db: Session, buyer_id: int, course_id: int,
                            payment_method: str = "wallet", tx_ref: str = None) -> dict:
    buyer = db.query(User).filter(User.id == buyer_id).first()
    if not buyer:
        return {"success": False, "error": "Buyer not found"}

    course = db.query(Course).filter(
        Course.id == course_id, Course.is_active == True
    ).first()
    if not course:
        return {"success": False, "error": "Course not found or inactive"}

    existing = db.query(CoursePurchase).filter(
        CoursePurchase.user_id == buyer_id,
        CoursePurchase.course_tier == course.tier
    ).first()
    if existing:
        return {"success": False, "error": f"Already purchased Tier {course.tier}"}

    if payment_method == "wallet" and buyer.balance < course.price:
        return {"success": False, "error": f"Insufficient balance. Need ${course.price:.2f}, have ${buyer.balance:.2f}"}

    purchase = CoursePurchase(
        user_id=buyer_id,
        course_id=course_id,
        course_tier=course.tier,
        amount_paid=course.price,
        payment_method=payment_method,
        tx_ref=tx_ref
    )
    db.add(purchase)
    db.flush()

    if payment_method == "wallet":
        buyer.balance -= course.price

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


def _distribute_commission(db: Session, purchase: CoursePurchase,
                           buyer: User, course: Course) -> dict:
    sponsor_id = buyer.sponsor_id
    commission_amount = float(course.price)

    if not sponsor_id:
        return _credit_platform(db, purchase, course, commission_amount,
                                "No sponsor - organic purchase")

    sponsor = db.query(User).filter(User.id == sponsor_id).first()
    if not sponsor:
        return _credit_platform(db, purchase, course, commission_amount,
                                "Sponsor not found")

    sponsor.course_sale_count = (sponsor.course_sale_count or 0) + 1
    sale_number = sponsor.course_sale_count

    if is_passup_sale(sale_number):
        passup_target_id = sponsor.pass_up_sponsor_id
        if not passup_target_id:
            return _credit_platform(db, purchase, course, commission_amount,
                                    f"Pass-up from {sponsor.username} sale #{sale_number} - no pass-up sponsor (root)")

        earner, depth = find_qualified_passup_recipient(db, passup_target_id, course.tier)
        if earner:
            return _credit_earner(
                db, purchase, course, earner, commission_amount,
                commission_type="pass_up",
                depth=depth,
                notes=f"Pass-up from {sponsor.username} sale #{sale_number} (Tier {course.tier}, ${commission_amount})"
            )
        else:
            return _credit_platform(db, purchase, course, commission_amount,
                                    f"Pass-up from {sponsor.username} sale #{sale_number} - no qualified upline")
    else:
        if user_owns_tier(db, sponsor.id, course.tier):
            return _credit_earner(
                db, purchase, course, sponsor, commission_amount,
                commission_type="direct_sale",
                depth=0,
                notes=f"Direct sale #{sale_number} at Tier {course.tier} - {sponsor.username} keeps 100%"
            )
        else:
            earner, depth = find_qualified_passup_recipient(
                db, sponsor.pass_up_sponsor_id, course.tier
            )
            if earner:
                return _credit_earner(
                    db, purchase, course, earner, commission_amount,
                    commission_type="qualification_skip",
                    depth=depth,
                    notes=f"{sponsor.username} unqualified at Tier {course.tier} - skipped to {earner.username}"
                )
            else:
                return _credit_platform(db, purchase, course, commission_amount,
                                        f"{sponsor.username} unqualified, no qualified upline found")


def _credit_earner(db, purchase, course, earner, amount,
                   commission_type, depth, notes) -> dict:
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


def _credit_platform(db, purchase, course, amount, notes) -> dict:
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


def get_user_course_stats(db: Session, user_id: int) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {}

    purchases = db.query(CoursePurchase).filter(
        CoursePurchase.user_id == user_id
    ).all()
    owned_tiers = [p.course_tier for p in purchases]

    commissions = db.query(CourseCommission).filter(
        CourseCommission.earner_id == user_id
    ).all()
    total_earned = sum(float(c.amount) for c in commissions)
    direct_count = sum(1 for c in commissions if c.commission_type == "direct_sale")
    passup_count = sum(1 for c in commissions if c.commission_type == "pass_up")

    return {
        "owned_tiers": owned_tiers,
        "total_earned": total_earned,
        "direct_commissions": direct_count,
        "passup_commissions": passup_count,
        "course_sale_count": user.course_sale_count or 0,
        "pass_up_sponsor_id": user.pass_up_sponsor_id,
    }
