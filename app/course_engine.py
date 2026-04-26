"""
SuperAdPro Course Commission Engine — Infinite Pass-Up System
=============================================================

COMP PLAN:
  - 3 tiers: $100 (Starter), $300 (Advanced), $500 (Elite)
  - 100% commission on every course sale
  - Single counter per affiliate: course_sale_count (all tiers combined)
  - Sales 1, 3, 5, 7, 9+ → affiliate KEEPS 100%
  - Sales 2, 4, 6, 8 → 100% PASSES UP to pass_up_sponsor

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

  - DIRECT SALES: If the sponsor does not own the tier, the commission goes
    to the company. It does NOT walk up. This keeps direct sales simple
    and creates FOMO for affiliates to own every tier they recruit into.

  - PASS-UP SALES: The commission walks up the pass-up chain until it finds
    someone who owns the tier (or an admin). This is the infinite-cascade
    behaviour described above. If nobody in the chain qualifies, the commission
    goes to the company. This rewards active uplines who own all tiers and
    prevents commissions from being lost to unqualified middle nodes.
"""

from datetime import datetime
import logging
from sqlalchemy.orm import Session
from decimal import Decimal
from sqlalchemy import text
from app.database import (
    User, Course, CoursePurchase, CourseCommission
)

logger = logging.getLogger("superadpro.course_engine")


PASSUP_POSITIONS = {2, 4, 6, 8}

# Income Chain mapping — each pass-up position opens a different "Income Chain"
# for the receiving upline. Used in member-facing UI (dashboard, earnings page).
SALE_TO_CHAIN = {2: 1, 4: 2, 6: 3, 8: 4}
CHAIN_NAMES = {
    1: "Income Chain 1",
    2: "Income Chain 2",
    3: "Income Chain 3",
    4: "Income Chain 4",
}
CHAIN_OPENS_AT = {1: 2, 2: 4, 3: 6, 4: 8}


def sale_number_to_chain(sale_number: int):
    """Map a sale number (2/4/6/8) to an Income Chain number (1/2/3/4).
    Returns None for non-passup sales."""
    return SALE_TO_CHAIN.get(sale_number)


def is_passup_sale(sale_number: int) -> bool:
    return sale_number in PASSUP_POSITIONS


def assign_passup_sponsor(db: Session, new_user: User, sponsor: User):
    """
    Set the new user's pass_up_sponsor based on their position
    in the sponsor's referral sequence. Call at registration time.

    Position 1, 3, 5, 7, 9+ (kept) -> pass_up_sponsor = direct sponsor
    Position 2, 4, 6, 8 (passed up) -> pass_up_sponsor = sponsor's pass_up_sponsor
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

    # Atomic write block: purchase row + balance deduction + commission distribution
    # all commit together. If anything raises, rollback so we don't leave the
    # buyer charged with no commission flowing or no purchase record.
    try:
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
    except Exception as exc:
        db.rollback()
        logger.error(
            f"Course purchase EXCEPTION for buyer {buyer_id} "
            f"(course_id={course_id}, tier={course.tier}, price=${course.price}): {exc}",
            exc_info=True,
        )
        return {
            "success": False,
            "error": "Purchase failed due to a system error. Your balance has not been charged. Please try again.",
        }

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
    commission_amount = course.price  # Decimal from DB — no float conversion needed

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
        # Pass-up sale: commission walks up the pass-up chain until it finds
        # someone who owns the tier (or an admin). If nobody in the chain qualifies,
        # the commission goes to the company. This is the "infinite cascade" model
        # described at the top of this file.
        chain_number = sale_number_to_chain(sale_number)  # 1, 2, 3, or 4
        chain_label = CHAIN_NAMES.get(chain_number, "Income Chain")

        passup_target_id = sponsor.pass_up_sponsor_id
        if not passup_target_id:
            return _credit_platform(db, purchase, course, commission_amount,
                                    f"Pass-up from {sponsor.username} sale #{sale_number} ({chain_label}) - no pass-up sponsor (root)",
                                    source_chain=chain_number)

        earner, depth = find_qualified_passup_recipient(db, passup_target_id, course.tier)

        if earner is not None:
            return _credit_earner(
                db, purchase, course, earner, commission_amount,
                commission_type="pass_up",
                depth=depth,
                notes=f"{chain_label} cascade from {sponsor.username} sale #{sale_number} — walked {depth} level(s) to {earner.username} (Tier {course.tier}, ${commission_amount})",
                source_chain=chain_number,
            )
        else:
            return _credit_platform(db, purchase, course, commission_amount,
                                    f"{chain_label} cascade from {sponsor.username} sale #{sale_number} — no qualified recipient in chain at Tier {course.tier}, commission to company",
                                    source_chain=chain_number)
    else:
        # Direct sale: commission goes to sponsor
        if user_owns_tier(db, sponsor.id, course.tier):
            return _credit_earner(
                db, purchase, course, sponsor, commission_amount,
                commission_type="direct_sale",
                depth=0,
                notes=f"Direct sale #{sale_number} at Tier {course.tier} - {sponsor.username} keeps 100%",
                source_chain=None,
            )
        else:
            # Sponsor doesn't own the tier — commission goes to company, not upline
            return _credit_platform(db, purchase, course, commission_amount,
                                    f"{sponsor.username} doesn't own Tier {course.tier} - commission to company (FOMO)",
                                    source_chain=None)


def _credit_earner(db, purchase, course, earner, amount,
                   commission_type, depth, notes, source_chain=None) -> dict:
    commission = CourseCommission(
        purchase_id=purchase.id,
        buyer_id=purchase.user_id,
        earner_id=earner.id,
        amount=amount,
        course_tier=course.tier,
        commission_type=commission_type,
        pass_up_depth=depth,
        source_chain=source_chain,
        notes=notes
    )
    db.add(commission)
    earner.balance = Decimal(str(earner.balance or 0)) + Decimal(str(amount))
    earner.total_earned = Decimal(str(earner.total_earned or 0)) + Decimal(str(amount))
    earner.course_earnings = Decimal(str(earner.course_earnings or 0)) + Decimal(str(amount))
    return {
        "earner_id": earner.id,
        "earner_username": earner.username,
        "amount": amount,
        "type": commission_type,
        "depth": depth,
        "source_chain": source_chain,
        "chain_name": CHAIN_NAMES.get(source_chain) if source_chain else None,
        "notes": notes
    }


def _credit_platform(db, purchase, course, amount, notes, source_chain=None) -> dict:
    admin = db.query(User).filter(User.is_admin == True).first()
    commission = CourseCommission(
        purchase_id=purchase.id,
        buyer_id=purchase.user_id,
        earner_id=admin.id if admin else None,
        amount=amount,
        course_tier=course.tier,
        commission_type="platform",
        pass_up_depth=0,
        source_chain=source_chain,
        notes=notes
    )
    db.add(commission)
    if admin:
        admin.balance = Decimal(str(admin.balance or 0)) + Decimal(str(amount))
        admin.total_earned = Decimal(str(admin.total_earned or 0)) + Decimal(str(amount))
    return {
        "earner_id": admin.id if admin else None,
        "earner_username": "PLATFORM" if not admin else admin.username,
        "amount": amount,
        "type": "platform",
        "depth": 0,
        "source_chain": source_chain,
        "chain_name": CHAIN_NAMES.get(source_chain) if source_chain else None,
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
    total_earned = sum((c.amount or 0) for c in commissions)
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
