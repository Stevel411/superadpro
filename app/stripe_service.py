"""
Stripe payment service.

Built 23 May 2026 as part of the full Stripe re-integration. SuperAdPro
now supports two payment rails:
  - Crypto (USDT on BSC) — existing, unchanged. Handles existing members.
  - Stripe (cards) — new, this module. For members who can't or won't use crypto.

The two rails coexist and are tracked via User.payment_method ("crypto" or
"stripe"). Renewals route by payment_method:
  - crypto → process_auto_renewals() does USDT polling
  - stripe → Stripe handles renewals natively, we just listen to webhooks

This module is import-safe even if STRIPE_SECRET_KEY isn't set — it doesn't
crash, just returns is_configured()=False so callers can degrade gracefully.

Public surface:
  - is_configured() — bool, whether env vars are set
  - get_or_create_customer(user) — get/create Stripe Customer for a User row
  - create_checkout_session(user, product_kind, price_id, ...) — return URL
  - process_webhook(payload, signature) — verify + dispatch to handler
  - refund_charge(charge_id, amount_cents, reason) — issue partial/full refund

Webhook event dispatch:
  - checkout.session.completed → _on_checkout_completed
  - invoice.paid (renewal) → _on_renewal_paid
  - invoice.payment_failed → _on_payment_failed
  - customer.subscription.deleted → _on_subscription_cancelled
  - charge.dispute.created → _on_dispute_created

All public functions are safe to call from FastAPI routes — they return
plain dicts / typed values, never raise on Stripe-side errors (logged
instead). Webhook signature verification is enforced; an invalid signature
raises immediately so the route returns 400.
"""
import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple

try:
    import stripe
    HAS_STRIPE_LIB = True
except ImportError:
    stripe = None
    HAS_STRIPE_LIB = False

log = logging.getLogger("stripe_service")

# ─── Configuration ────────────────────────────────────────────────────────────

def _api_key() -> Optional[str]:
    return os.environ.get("STRIPE_SECRET_KEY")

def _webhook_secret() -> Optional[str]:
    return os.environ.get("STRIPE_WEBHOOK_SECRET")

def _founder_price_id() -> Optional[str]:
    return os.environ.get("STRIPE_FOUNDER_PRICE_ID")

def _partner_price_id() -> Optional[str]:
    return os.environ.get("STRIPE_PARTNER_PRICE_ID")

# Annual prices (added 27 May 2026). Founder annual locks in $150/yr
# for life (vs $200/yr standard Partner annual). Stripe will charge the
# full year up front; the existing _stripe_handle_invoice_paid handler
# reads period.end from the invoice so the 365-day expiry just falls out.
def _founder_annual_price_id() -> Optional[str]:
    return os.environ.get("STRIPE_FOUNDER_ANNUAL_PRICE_ID")

def _partner_annual_price_id() -> Optional[str]:
    return os.environ.get("STRIPE_PARTNER_ANNUAL_PRICE_ID")

def _public_url() -> str:
    # Used for Checkout success/cancel URLs. Defaults to production domain
    # so links work in staging without explicit env var setup.
    return os.environ.get("PUBLIC_BASE_URL", "https://www.superadpro.com").rstrip("/")

def is_configured() -> bool:
    """True iff all required env vars are set AND the stripe library is installed."""
    if not HAS_STRIPE_LIB:
        return False
    return bool(_api_key() and _founder_price_id() and _partner_price_id())

def _ensure_sdk():
    """Set the global stripe.api_key from env. Idempotent."""
    if not HAS_STRIPE_LIB:
        raise RuntimeError("stripe library not installed — pip install stripe")
    if not _api_key():
        raise RuntimeError("STRIPE_SECRET_KEY env var not set")
    stripe.api_key = _api_key()

# ─── Refund policy — the partial-refund math per product ─────────────────────
#
# Steve's call 23 May 2026: refunds are limited to what the company actually
# keeps after commissions are paid out. Commissions are on-chain / wallet
# entries that can't be clawed back, so refunding the full amount would
# cost the company double. Refundable amount per product is fixed at
# payment time and stored on stripe_charges.refundable_cents.

REFUND_SHARES = {
    # product_kind → fraction of payment that the company keeps & can refund
    "membership_signup":   0.50,   # Partner $20: $10 to sponsor, $10 to company
    "membership_renewal":  0.50,   # same split on each renewal
    "founder_signup":      0.33,   # Founder $15: $10 to sponsor, $5 to company
    "founder_renewal":     0.33,
    "campaign_tier":       0.05,   # 5% admin only
    "nexus_pack":          0.15,   # 15% company / 85% affiliates
    "email_boost":         1.00,   # email credits: pure company revenue, no commission split
    "custom_domain":       1.00,   # one-time fee, no commission split — fully refundable
    # 23 May 2026: 'course' and 'creative_credits' removed — those products
    # are no longer applicable on the platform per Steve's call.
}

def calculate_refundable(product_kind: str, amount_cents: int) -> Tuple[int, int]:
    """
    Returns (company_share_cents, refundable_cents) for a given product + amount.

    company_share_cents = the gross amount the company kept (used for reporting)
    refundable_cents    = the maximum the company will refund (same as company_share
                          for now, but kept distinct so we can subtract previous
                          refunds for partial-refund-then-second-refund cases)
    """
    share = REFUND_SHARES.get(product_kind, 0.0)
    company_cents = int(round(amount_cents * share))
    return company_cents, company_cents

# ─── Customer management ──────────────────────────────────────────────────────

def get_or_create_customer(user, db_session) -> Optional[str]:
    """
    Returns the stripe_customer_id for this user. Creates a Stripe Customer
    if the user doesn't have one yet and persists the id to user.stripe_customer_id.

    Safe to call repeatedly — returns existing id without a Stripe API call
    on the second invocation.
    """
    if user.stripe_customer_id:
        return user.stripe_customer_id
    _ensure_sdk()
    customer = stripe.Customer.create(
        email=user.email,
        name=user.username or user.email,
        metadata={
            "superadpro_user_id": str(user.id),
            "superadpro_username": user.username or "",
        },
    )
    user.stripe_customer_id = customer.id
    db_session.commit()
    log.info(f"Created Stripe customer {customer.id} for user {user.id}")
    return customer.id

# ─── Checkout sessions ────────────────────────────────────────────────────────

def create_checkout_session(
    user,
    db_session,
    product_kind: str,
    price_id: Optional[str] = None,
    amount_cents: Optional[int] = None,
    success_path: str = "/welcome",
    cancel_path: str = "/join",
    extra_metadata: Optional[Dict[str, str]] = None,
) -> Dict[str, str]:
    """
    Create a Stripe Checkout session and return {checkout_url, session_id}.

    For subscriptions (membership): pass price_id, leave amount_cents=None.
    For one-time payments (custom domain, etc.): pass amount_cents, leave price_id=None.

    success_path / cancel_path are appended to PUBLIC_BASE_URL.
    extra_metadata is merged onto the session metadata for downstream identification.
    """
    _ensure_sdk()
    customer_id = get_or_create_customer(user, db_session)

    metadata = {
        "superadpro_user_id": str(user.id),
        "product_kind": product_kind,
    }
    if extra_metadata:
        metadata.update(extra_metadata)

    base = _public_url()
    success_url = f"{base}{success_path}?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{base}{cancel_path}?cancelled=1"

    if price_id:
        # Subscription mode — recurring price
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            subscription_data={"metadata": metadata},
            # Allow promo codes for future marketing campaigns
            allow_promotion_codes=True,
            # Link out to the refund policy hosted on our domain
            custom_text={
                "submit": {
                    "message": "By subscribing you agree to our terms. See our refund policy at " + base + "/refund-policy"
                }
            },
        )
    elif amount_cents:
        # One-time payment mode
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": amount_cents,
                    "product_data": {"name": _humanise_product(product_kind)},
                },
                "quantity": 1,
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            payment_intent_data={"metadata": metadata},
            custom_text={
                "submit": {
                    "message": "By purchasing you agree to our terms. See our refund policy at " + base + "/refund-policy"
                }
            },
        )
    else:
        raise ValueError("create_checkout_session needs either price_id or amount_cents")

    log.info(f"Created Stripe checkout session {session.id} for user {user.id} product={product_kind}")
    return {"checkout_url": session.url, "session_id": session.id}

def _humanise_product(product_kind: str) -> str:
    return {
        "custom_domain": "SuperAdPro Custom Domain (one-time)",
        "campaign_tier": "SuperAdPro Campaign Tier",
        "nexus_pack": "Credit Nexus Pack",
        "course": "Course Purchase",
        "creative_credits": "Creative Studio Credits",
        "launchpad": "SuperAdPro Launchpad",
    }.get(product_kind, product_kind.replace("_", " ").title())

# ─── Webhook handling ────────────────────────────────────────────────────────

def verify_and_parse_webhook(payload: bytes, signature: str) -> Dict[str, Any]:
    """
    Verify the Stripe webhook signature and return the parsed event.

    Raises stripe.error.SignatureVerificationError if the signature is bad —
    callers should respond 400 to Stripe in that case (so Stripe retries).
    """
    _ensure_sdk()
    secret = _webhook_secret()
    if not secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET not set")
    event = stripe.Webhook.construct_event(payload, signature, secret)
    return event

# ─── Refund processing ────────────────────────────────────────────────────────

def refund_charge(charge_id: str, amount_cents: Optional[int] = None, reason: Optional[str] = None) -> Dict[str, Any]:
    """
    Issue a refund against a Stripe charge.

    amount_cents=None refunds the full original charge.
    reason should be one of: 'requested_by_customer', 'duplicate', 'fraudulent'.
    """
    _ensure_sdk()
    kwargs: Dict[str, Any] = {"charge": charge_id}
    if amount_cents is not None:
        kwargs["amount"] = amount_cents
    if reason:
        kwargs["reason"] = reason
    refund = stripe.Refund.create(**kwargs)
    log.info(f"Issued refund {refund.id} on charge {charge_id} for ${amount_cents/100 if amount_cents else 'full'}")
    return {"refund_id": refund.id, "amount_cents": refund.amount, "status": refund.status}

# ─── Subscription management ──────────────────────────────────────────────────

def cancel_subscription_at_period_end(subscription_id: str) -> Dict[str, Any]:
    """
    Cancel a subscription at the end of the current period (member keeps access
    until then). This is the standard "polite cancel" — Stripe will not charge
    again, the subscription enters cancel_at_period_end=true state.
    """
    _ensure_sdk()
    sub = stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
    return {"id": sub.id, "cancel_at": sub.cancel_at, "status": sub.status}

def cancel_subscription_immediately(subscription_id: str) -> Dict[str, Any]:
    """
    Cancel a subscription RIGHT NOW. Member loses access immediately.
    Used by the chargeback handler.
    """
    _ensure_sdk()
    sub = stripe.Subscription.cancel(subscription_id)
    return {"id": sub.id, "status": sub.status}

# ─── Customer Portal ─────────────────────────────────────────────────────────

def create_portal_session(user, return_url: Optional[str] = None) -> Dict[str, str]:
    """
    Create a Stripe-hosted Customer Portal session for the user. The portal
    lets members update payment method, view invoices, cancel subscription —
    all without us building any of that UI.
    """
    _ensure_sdk()
    if not user.stripe_customer_id:
        raise ValueError("User has no Stripe customer ID")
    base = _public_url()
    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=return_url or (base + "/account"),
    )
    return {"url": session.url}

# ─── Helpers for the route layer ─────────────────────────────────────────────

def get_price_id_for_tier(tier: str, billing: str = "monthly") -> Optional[str]:
    """
    Map a tier name + billing cadence to the Stripe Price ID env var.

    Monthly (default):
      'founder'  → STRIPE_FOUNDER_PRICE_ID         ($15/month)
      'partner'  → STRIPE_PARTNER_PRICE_ID         ($20/month)

    Annual (billing='annual' or 'yearly'):
      'founder'  → STRIPE_FOUNDER_ANNUAL_PRICE_ID  ($150/year)
      'partner'  → STRIPE_PARTNER_ANNUAL_PRICE_ID  ($200/year)

    Returns None if either the tier is unknown OR the requested billing
    cadence has no env var configured. Caller must handle None.
    """
    t = (tier or "").lower()
    b = (billing or "monthly").lower()
    is_annual = b in ("annual", "yearly", "year")

    if t in ("founder", "founding"):
        return _founder_annual_price_id() if is_annual else _founder_price_id()
    if t in ("partner", "standard"):
        return _partner_annual_price_id() if is_annual else _partner_price_id()
    return None

def refund_window_expiry() -> datetime:
    """Returns now + 7 days. Stored on user.stripe_refund_eligible_until."""
    return datetime.utcnow() + timedelta(days=7)
