# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Stripe Payment Service
# Handles: membership subscriptions, grid/campaign purchases,
#          email boost packs, webhook processing
# ═══════════════════════════════════════════════════════════════
import os
import stripe
from typing import Optional

STRIPE_SECRET_KEY       = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET   = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PUBLISHABLE_KEY  = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
SITE_URL                = os.getenv("SITE_URL", "https://www.superadpro.com")

# Membership price IDs — set these in Railway env vars after creating
# products in Stripe dashboard
STRIPE_BASIC_PRICE_ID   = os.getenv("STRIPE_BASIC_PRICE_ID", "")   # $20/mo recurring
STRIPE_PRO_PRICE_ID     = os.getenv("STRIPE_PRO_PRICE_ID", "")     # $35/mo recurring — price_1TD1KEBxEFGz0qoH2yZNibw1


def get_stripe():
    """Return configured stripe module."""
    stripe.api_key = STRIPE_SECRET_KEY
    return stripe


# ── Membership Checkout ──────────────────────────────────────

def create_membership_checkout(user_id: int, tier: str, email: str) -> dict:
    """
    Create a Stripe Checkout Session for membership subscription.
    tier: 'basic' ($20/mo) or 'pro' ($35/mo)
    Returns: {success, url} or {success, error}
    """
    s = get_stripe()
    price_id = STRIPE_PRO_PRICE_ID if tier == "pro" else STRIPE_BASIC_PRICE_ID

    if not price_id:
        return {"success": False, "error": "Stripe price not configured. Contact admin."}

    try:
        session = s.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=email,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{SITE_URL}/payment-success?session_id={{CHECKOUT_SESSION_ID}}&type=membership&tier={tier}",
            cancel_url=f"{SITE_URL}/upgrade?cancelled=1",
            metadata={
                "user_id": str(user_id),
                "payment_type": "membership",
                "tier": tier,
            },
            subscription_data={
                "metadata": {
                    "user_id": str(user_id),
                    "tier": tier,
                }
            },
            allow_promotion_codes=True,
        )
        return {"success": True, "url": session.url, "session_id": session.id}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Grid / Campaign Tier Checkout ────────────────────────────

def create_grid_checkout(user_id: int, package_tier: int, price_usd: float, tier_name: str, email: str) -> dict:
    """
    Create a Stripe Checkout Session for a Campaign Tier (grid) purchase.
    One-time payment.
    """
    s = get_stripe()
    try:
        session = s.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            customer_email=email,
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(price_usd * 100),  # cents
                    "product_data": {
                        "name": f"Campaign {package_tier} — {tier_name}",
                        "description": f"SuperAdPro 8×8 Grid Campaign Tier {package_tier}",
                    },
                },
                "quantity": 1,
            }],
            success_url=f"{SITE_URL}/payment-success?session_id={{CHECKOUT_SESSION_ID}}&type=grid&tier={package_tier}",
            cancel_url=f"{SITE_URL}/campaign-tiers?cancelled=1",
            metadata={
                "user_id": str(user_id),
                "payment_type": "grid",
                "package_tier": str(package_tier),
                "price_usd": str(price_usd),
            },
        )
        return {"success": True, "url": session.url, "session_id": session.id}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Email Boost Pack Checkout ────────────────────────────────

BOOST_PACKS = {
    "1000":  {"emails": 1000,  "price": 5.00,  "label": "🚀 1,000 Email Boost"},
    "5000":  {"emails": 5000,  "price": 19.00, "label": "⚡ 5,000 Email Boost"},
    "10000": {"emails": 10000, "price": 29.00, "label": "🔥 10,000 Email Boost"},
    "50000": {"emails": 50000, "price": 99.00, "label": "💎 50,000 Email Boost"},
}

def create_boost_checkout(user_id: int, pack_key: str, email: str) -> dict:
    """Create Stripe Checkout for an email boost pack."""
    s = get_stripe()
    pack = BOOST_PACKS.get(pack_key)
    if not pack:
        return {"success": False, "error": "Invalid boost pack"}
    try:
        session = s.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            customer_email=email,
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(pack["price"] * 100),
                    "product_data": {
                        "name": pack["label"],
                        "description": f"{pack['emails']:,} additional email sends — never expire",
                    },
                },
                "quantity": 1,
            }],
            success_url=f"{SITE_URL}/pro/leads?boost_success=1&pack={pack_key}",
            cancel_url=f"{SITE_URL}/pro/leads?tab=boost&cancelled=1",
            metadata={
                "user_id": str(user_id),
                "payment_type": "email_boost",
                "pack_key": pack_key,
                "emails": str(pack["emails"]),
            },
        )
        return {"success": True, "url": session.url, "session_id": session.id}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Webhook Processing ───────────────────────────────────────

def verify_webhook(payload: bytes, sig_header: str) -> Optional[object]:
    """Verify Stripe webhook signature. Returns event or None."""
    s = get_stripe()
    try:
        return s.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except Exception:
        return None


def get_session(session_id: str) -> Optional[object]:
    """Retrieve a checkout session by ID."""
    s = get_stripe()
    try:
        return s.checkout.Session.retrieve(session_id)
    except Exception:
        return None


def get_subscription(subscription_id: str) -> Optional[object]:
    """Retrieve a subscription by ID."""
    s = get_stripe()
    try:
        return s.Subscription.retrieve(subscription_id)
    except Exception:
        return None


def cancel_subscription(subscription_id: str) -> bool:
    """Cancel a Stripe subscription immediately."""
    s = get_stripe()
    try:
        s.Subscription.cancel(subscription_id)
        return True
    except Exception:
        return False


def is_configured() -> bool:
    """Check if Stripe keys are set."""
    return bool(STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET)


# ── Course Checkout ──────────────────────────────────────────

def create_course_checkout(user_id: int, course_id: int, course_title: str,
                            course_tier: int, price_usd: float, email: str) -> dict:
    """Create a Stripe Checkout Session for a course purchase."""
    s = get_stripe()
    try:
        session = s.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            customer_email=email,
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(price_usd * 100),
                    "product_data": {
                        "name": course_title,
                        "description": f"SuperAdPro Course — Tier {course_tier}",
                    },
                },
                "quantity": 1,
            }],
            success_url=f"{SITE_URL}/payment-success?session_id={{CHECKOUT_SESSION_ID}}&type=course&course_id={course_id}",
            cancel_url=f"{SITE_URL}/courses?cancelled=1",
            metadata={
                "user_id": str(user_id),
                "payment_type": "course",
                "course_id": str(course_id),
                "price_usd": str(price_usd),
            },
        )
        return {"success": True, "url": session.url, "session_id": session.id}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── SuperMarket Checkout ─────────────────────────────────────

def create_supermarket_checkout(user_id: int, product_id: int, product_title: str,
                                 price_usd: float, email: str,
                                 affiliate_id: int = None) -> dict:
    """Create a Stripe Checkout Session for a SuperMarket product purchase."""
    s = get_stripe()
    try:
        session = s.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            customer_email=email,
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(price_usd * 100),
                    "product_data": {
                        "name": product_title,
                        "description": "SuperAdPro SuperMarket — Digital Product",
                    },
                },
                "quantity": 1,
            }],
            success_url=f"{SITE_URL}/payment-success?session_id={{CHECKOUT_SESSION_ID}}&type=supermarket&product_id={product_id}",
            cancel_url=f"{SITE_URL}/marketplace?cancelled=1",
            metadata={
                "user_id": str(user_id),
                "payment_type": "supermarket",
                "product_id": str(product_id),
                "price_usd": str(price_usd),
                "affiliate_id": str(affiliate_id) if affiliate_id else "",
            },
        )
        return {"success": True, "url": session.url, "session_id": session.id}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── SuperCut Credit Pack Checkout ────────────────────────────

SUPERCUT_PACKS = {
    "starter": {"credits": 50,   "price_usd": 8.00,  "label": "SuperCut Starter"},
    "creator": {"credits": 150,  "price_usd": 20.00, "label": "SuperCut Creator"},
    "studio":  {"credits": 500,  "price_usd": 50.00, "label": "SuperCut Studio"},
    "pro":     {"credits": 1200, "price_usd": 99.00, "label": "SuperCut Pro"},
}


def create_supercut_checkout(user_id: int, pack_slug: str, email: str) -> dict:
    """
    Create a one-time Stripe Checkout Session for a SuperCut credit pack.
    Returns: {success, url, session_id} or {success, error}
    """
    pack = SUPERCUT_PACKS.get(pack_slug)
    if not pack:
        return {"success": False, "error": f"Unknown pack: {pack_slug}"}

    s = get_stripe()
    try:
        session = s.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            customer_email=email,
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(pack["price_usd"] * 100),
                    "product_data": {
                        "name": pack["label"],
                        "description": f"{pack['credits']} SuperCut video generation credits",
                    },
                },
                "quantity": 1,
            }],
            success_url=f"{SITE_URL}/supercut?pack_success=1&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{SITE_URL}/supercut?pack_cancelled=1",
            metadata={
                "user_id":        str(user_id),
                "payment_type":   "supercut_credits",
                "pack_slug":      pack_slug,
                "credits":        str(pack["credits"]),
            },
        )
        return {"success": True, "url": session.url, "session_id": session.id}
    except Exception as e:
        return {"success": False, "error": str(e)}
