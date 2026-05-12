"""
SuperAdPro Brand Poster Generator — Gating & Helpers

Brand Poster Generator (BPG) is gated behind Credit Nexus pack ownership.
Members who own at least one completed Nexus pack purchase get unlimited
BPG access. Members without packs see the preview gallery only.

This gating model was locked 12 May 2026:
  - Simple binary unlock (any pack tier counts)
  - No monthly limits, no per-tier ladders, no trial generations
  - The Brand Poster Generator is the attractor; the Nexus pack is what
    members are actually buying

Why this is the right model:
  - Members join SuperAdPro to make money — BPG is the recruiting weapon
    they get once they've invested in a Nexus pack
  - Gating drives Nexus pack purchases (highest-leverage commission stream
    at 85% to affiliates + completion bonuses)
  - Each Nexus pack purchase opens a 3x3 matrix that pays commissions
    up 3 levels — the BPG gate makes Nexus packs THE primary product
"""
from sqlalchemy.orm import Session
from .database import User, CreditPackPurchase


def member_has_bpg_access(db: Session, user: User) -> bool:
    """Does this member have access to generate posters with the Brand
    Poster Generator?

    A member has BPG access if and only if they own at least one
    Credit Nexus pack with status='completed'.

    Returns False for:
      - Free/Basic members who haven't bought a pack
      - Members whose only pack purchase is still pending payment
      - Members whose pack was refunded (status='refunded')

    Returns True for:
      - Any member who has completed at least one Credit Nexus pack
        purchase at any tier (starter through ultimate)

    Note: We deliberately do NOT check Profit Grid campaign ownership.
    BPG is the Nexus attractor specifically — Grid earners need to
    invest in a Nexus pack to unlock BPG. This is a strategic choice
    to drive Nexus volume, not an oversight.
    """
    if not user:
        return False

    purchase = db.query(CreditPackPurchase).filter(
        CreditPackPurchase.user_id == user.id,
        CreditPackPurchase.status == "completed",
    ).first()

    return purchase is not None


def get_member_pack_summary(db: Session, user: User) -> dict:
    """Return a dict describing the member's pack ownership state for
    use in the BPG gating UI. Lets the upsell screen show a personalised
    pitch (e.g. "Upgrade to $50 pack" if they already own $20).

    Returns:
      {
        "has_access": bool,
        "pack_count": int,
        "highest_tier_key": str | None,    # e.g. "starter", "builder", "pro"
        "total_invested_usd": float,
      }
    """
    if not user:
        return {
            "has_access": False,
            "pack_count": 0,
            "highest_tier_key": None,
            "total_invested_usd": 0.0,
        }

    purchases = db.query(CreditPackPurchase).filter(
        CreditPackPurchase.user_id == user.id,
        CreditPackPurchase.status == "completed",
    ).all()

    if not purchases:
        return {
            "has_access": False,
            "pack_count": 0,
            "highest_tier_key": None,
            "total_invested_usd": 0.0,
        }

    # Find the highest-priced pack owned
    highest = max(purchases, key=lambda p: float(p.pack_price or 0))

    return {
        "has_access": True,
        "pack_count": len(purchases),
        "highest_tier_key": highest.pack_key,
        "total_invested_usd": sum(float(p.pack_price or 0) for p in purchases),
    }
