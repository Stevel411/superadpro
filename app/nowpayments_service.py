"""
SuperAdPro — NOWPayments Integration Service
Crypto + Fiat card payments via NOWPayments invoice API.

Flow:
  1. User clicks "Pay with NOWPayments" → backend creates invoice via API
  2. User is redirected to NOWPayments hosted invoice page
  3. User pays with crypto (350+ coins) or fiat card (Visa/MC/Apple Pay/Google Pay)
  4. NOWPayments sends IPN webhook to our callback URL
  5. Backend verifies HMAC signature, matches order, activates product

API Base: https://api.nowpayments.io/v1
Auth: x-api-key header
IPN: HMAC-SHA512 signature in x-nowpayments-sig header

Env vars required:
  NOWPAYMENTS_API_KEY    — API key from NOWPayments dashboard
  NOWPAYMENTS_IPN_SECRET — IPN secret key from Payment Settings
"""

import os
import json
import hmac
import hashlib
import logging
import httpx
from decimal import Decimal
from typing import Optional

logger = logging.getLogger("superadpro.nowpayments")

# ── Config ──────────────────────────────────────────────────────
NOWPAYMENTS_API_KEY = os.environ.get("NOWPAYMENTS_API_KEY", "")
NOWPAYMENTS_IPN_SECRET = os.environ.get("NOWPAYMENTS_IPN_SECRET", "")
NOWPAYMENTS_API_BASE = "https://api.nowpayments.io/v1"
SITE_URL = os.environ.get("SITE_URL", "https://www.superadpro.com")

# ── Product prices (USD) — single source of truth ───────────────
# Memberships & grids share prices with crypto_payments.py
PRODUCT_CATALOG = {
    # Memberships — flat partner pricing 15 May 2026
    # Standard partner $20/mo or $200/yr. Founding partner uses the same
    # product key — the locked price on the user record overrides this
    # default at activation time. Legacy 'basic'/'pro' keys retained for
    # backward compatibility with any cached checkout pages but now resolve
    # to the standard partner price.
    "membership_partner":         {"price": Decimal("20.00"),  "type": "membership",  "desc": "SuperAdPro Partner Membership (Monthly)"},
    "membership_partner_annual":  {"price": Decimal("200.00"), "type": "membership",  "desc": "SuperAdPro Partner Membership (Annual — Save $40)"},
    # Legacy keys — all now resolve to standard partner price under flat
    # pricing. Will be removed in a future cleanup sprint.
    "membership_basic":           {"price": Decimal("20.00"),  "type": "membership",  "desc": "SuperAdPro Partner Membership (Monthly)"},
    "membership_pro":             {"price": Decimal("20.00"),  "type": "membership",  "desc": "SuperAdPro Partner Membership (Monthly)"},
    "membership_basic_annual":    {"price": Decimal("200.00"), "type": "membership",  "desc": "SuperAdPro Partner Membership (Annual — Save $40)"},
    "membership_pro_annual":      {"price": Decimal("200.00"), "type": "membership",  "desc": "SuperAdPro Partner Membership (Annual — Save $40)"},
    # Grid / Campaign Tiers
    "grid_1":               {"price": Decimal("20.00"),   "type": "grid", "desc": "Campaign Tier 1 — Starter"},
    "grid_2":               {"price": Decimal("50.00"),   "type": "grid", "desc": "Campaign Tier 2 — Builder"},
    "grid_3":               {"price": Decimal("100.00"),  "type": "grid", "desc": "Campaign Tier 3 — Pro"},
    "grid_4":               {"price": Decimal("200.00"),  "type": "grid", "desc": "Campaign Tier 4 — Advanced"},
    "grid_5":               {"price": Decimal("400.00"),  "type": "grid", "desc": "Campaign Tier 5 — Premium"},
    "grid_6":               {"price": Decimal("600.00"),  "type": "grid", "desc": "Campaign Tier 6 — Elite"},
    "grid_7":               {"price": Decimal("800.00"),  "type": "grid", "desc": "Campaign Tier 7 — Master"},
    "grid_8":               {"price": Decimal("1000.00"), "type": "grid", "desc": "Campaign Tier 8 — Champion"},
    # Email Boost Packs
    "email_boost_1000":     {"price": Decimal("5.00"),  "type": "email_boost", "desc": "Email Boost — 1,000 Credits"},
    "email_boost_5000":     {"price": Decimal("19.00"), "type": "email_boost", "desc": "Email Boost — 5,000 Credits"},
    "email_boost_10000":    {"price": Decimal("29.00"), "type": "email_boost", "desc": "Email Boost — 10,000 Credits"},
    "email_boost_50000":    {"price": Decimal("99.00"), "type": "email_boost", "desc": "Email Boost — 50,000 Credits"},
    # Pay It Forward — gift voucher (fixed $20)
    "pif_voucher":          {"price": Decimal("20.00"), "type": "pif", "desc": "Pay It Forward — Gift Voucher"},
    # Pro upgrade — deprecated 15 May 2026. Under flat partner pricing
    # there are no tier upgrades. Key retained at $0 so any orphaned
    # checkout link returns a clear error rather than 500ing. The legacy
    # /api/upgrade-to-pro endpoint also returns 410 Gone.
    "membership_pro_upgrade": {"price": Decimal("0.00"), "type": "membership_upgrade", "desc": "Deprecated — tier upgrades no longer exist"},
}

# ── Credit Matrix (Profit Nexus) packs ───────────────────────────
# These are generated DYNAMICALLY from CREDIT_PACKS in database.py
# so the two files can never drift apart on price or pack count.
# Previously this section was hardcoded with stale prices (e.g. $20
# pack listed at $25, $1000 listed at $500, missing 3 packs entirely)
# which caused real overcharge/undercharge bugs at the NOWPayments
# checkout. (Apr 25 2026 fix.)
#
# Source of truth: CREDIT_PACKS in app/database.py — used by
# credit_matrix.py for matrix logic, commission calcs, credit awards.
# This block keeps PRODUCT_CATALOG aligned automatically.
def _build_credit_matrix_entries():
    """Pull pack prices and labels from CREDIT_PACKS at import time."""
    from .database import CREDIT_PACKS
    entries = {}
    for pack_key, pack in CREDIT_PACKS.items():
        product_key = f"credit_matrix_{pack_key}"
        entries[product_key] = {
            "price": Decimal(str(pack["price"])),
            "type": "credit_matrix",
            "desc": f"Profit Nexus {pack['label']} — {pack['credits']:,} Credits",
        }
    return entries

PRODUCT_CATALOG.update(_build_credit_matrix_entries())


def is_configured() -> bool:
    """Check if NOWPayments API key is set."""
    return bool(NOWPAYMENTS_API_KEY)


def _api_headers() -> dict:
    """Standard headers for NOWPayments API calls."""
    return {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
    }


# ── API Status Check ────────────────────────────────────────────

def check_api_status() -> dict:
    """GET /status — check if NOWPayments API is available."""
    try:
        resp = httpx.get(f"{NOWPAYMENTS_API_BASE}/status", headers=_api_headers(), timeout=10)
        data = resp.json()
        return {"available": data.get("message") == "OK"}
    except Exception as e:
        logger.error(f"NOWPayments status check failed: {e}")
        return {"available": False, "error": str(e)}


# ── Invoice Creation ────────────────────────────────────────────

def create_invoice(
    product_key: str,
    user_id: int,
    order_id: int,
    custom_price: Optional[Decimal] = None,
    custom_description: Optional[str] = None,
) -> dict:
    """
    Create a NOWPayments invoice for a product purchase.

    Returns:
        {"success": True, "invoice_url": "...", "invoice_id": "...", "np_id": int}
        or {"success": False, "error": "..."}
    """
    if not NOWPAYMENTS_API_KEY:
        return {"success": False, "error": "NOWPayments API key not configured"}

    # Look up product or use custom price.
    # custom_price wins when provided — callers compute dynamic prices
    # (founding discount, tier upgrades) that override the catalog price.
    # If caller doesn't pass custom_price, we fall back to the catalog.
    # Test13 bug on 16 May 2026: founding-price override at /api/nowpayments/
    # create-invoice set price_usd=$15, but create_invoice ignored that and
    # used the $20 catalog price because product_key was in the catalog.
    if product_key in PRODUCT_CATALOG:
        product = PRODUCT_CATALOG[product_key]
        description = custom_description or product["desc"]
        product_type_for_redirect = product.get("type", "membership")
        if custom_price is not None:
            price_amount = float(custom_price)
        else:
            price_amount = float(product["price"])
    elif custom_price is not None:
        price_amount = float(custom_price)
        description = custom_description or f"SuperAdPro Purchase: {product_key}"
        product_type_for_redirect = "superscene" if product_key.startswith("superscene_") else "membership"
    else:
        return {"success": False, "error": f"Unknown product: {product_key}"}

    if price_amount <= 0:
        return {"success": False, "error": "Invalid price amount"}

    # Build unique order ID for tracking: SAP-{user_id}-{order_id}
    internal_order_id = f"SAP-{user_id}-{order_id}"

    # IPN callback URL — NOWPayments will POST status updates here
    ipn_callback_url = f"{SITE_URL}/api/webhook/nowpayments"

    # Success/cancel redirect URLs. type= is read by /payment-success page
    # to render the right confirmation copy (Tier vs Membership vs Credit
    # Pack vs Email Boost). Without it the page defaults to "Membership
    # Activated" regardless of product, which previously caused user
    # confusion after Campaign Tier purchases.
    success_url = f"{SITE_URL}/payment-success?source=nowpayments&order_id={order_id}&type={product_type_for_redirect}"
    cancel_url = f"{SITE_URL}/payment-cancelled?source=nowpayments"

    payload = {
        "price_amount": price_amount,
        "price_currency": "usd",
        "order_id": internal_order_id,
        "order_description": description,
        "ipn_callback_url": ipn_callback_url,
        "success_url": success_url,
        "cancel_url": cancel_url,
        "is_fee_paid_by_user": False,  # We absorb the 0.5% fee
        # Restrict checkout to USDT-BEP-20 only. TRC-20 is disabled because
        # NOWPayments admitted (May 2026) that their TRC-20 deposit + payout
        # network fees consume ~46% of every $20 transaction (deposit fee
        # ~$3.50, service fee ~$0.10, payout fee ~$5.60), making it
        # economically unviable. BSC fees are normal (~0.5% + minimal gas).
        # When self-custody is built we can re-enable TRC-20 directly.
        #
        # NOTE: The /invoice endpoint expects pay_currency (singular,
        # string) NOT pay_currencies (plural, array) — the array form is
        # for the /payment endpoint. Passing the wrong field broke
        # checkout for one launch test (May 6 2026); fix is the singular.
        "pay_currency": "usdtbsc",
    }

    try:
        resp = httpx.post(
            f"{NOWPAYMENTS_API_BASE}/invoice",
            json=payload,
            headers=_api_headers(),
            timeout=15,
        )
        data = resp.json()

        if resp.status_code in (200, 201) and data.get("invoice_url"):
            logger.info(f"NOWPayments invoice created: {data['id']} for order {internal_order_id}")
            return {
                "success": True,
                "invoice_url": data["invoice_url"],
                "invoice_id": internal_order_id,
                "np_id": data["id"],  # NOWPayments internal invoice ID
            }
        else:
            error = data.get("message") or data.get("statusCode") or str(data)
            logger.error(f"NOWPayments invoice creation failed: {error}")
            return {"success": False, "error": f"NOWPayments error: {error}"}

    except httpx.TimeoutException:
        logger.error("NOWPayments API timeout")
        return {"success": False, "error": "Payment service timeout — please try again"}
    except Exception as e:
        logger.error(f"NOWPayments invoice creation error: {e}")
        return {"success": False, "error": str(e)}


# ── IPN Signature Verification ──────────────────────────────────

def _sort_object(obj):
    """Recursively sort a dict by keys (mirrors JS Object.keys().sort())."""
    if isinstance(obj, dict):
        return {k: _sort_object(obj[k]) for k in sorted(obj.keys())}
    elif isinstance(obj, list):
        return [_sort_object(item) for item in obj]
    return obj


def verify_ipn_signature(body_bytes: bytes, signature: str) -> bool:
    """
    Verify NOWPayments IPN webhook signature.

    Process:
      1. Parse body as JSON
      2. Sort all keys alphabetically (recursively)
      3. JSON.stringify with sorted keys, no spaces, preserving UTF-8 as-is
      4. HMAC-SHA512 with IPN secret
      5. Compare hex digest with x-nowpayments-sig header

    CRITICAL: ensure_ascii=False is required. Python's default escapes any
    non-ASCII character to \\uXXXX form, but NOWPayments' Node.js
    JSON.stringify outputs raw UTF-8 bytes. Any em-dash (—), accented
    character or emoji in the IPN body causes mismatched HMAC otherwise.
    Found 29 Apr 2026 — 403'd every Campaign Tier (e.g. "Campaign Tier 1 — Starter")
    and annual membership IPN since the Custody → non-custodial migration.
    """
    if not NOWPAYMENTS_IPN_SECRET:
        logger.error("NOWPAYMENTS_IPN_SECRET not configured")
        return False

    if not signature:
        logger.error("No x-nowpayments-sig header in webhook")
        return False

    try:
        body_data = json.loads(body_bytes)
        sorted_data = _sort_object(body_data)
        # ensure_ascii=False keeps UTF-8 as-is to match Node JSON.stringify
        # separators removes the default ', ' and ': ' Python adds, also matching JS
        sorted_json = json.dumps(sorted_data, separators=(",", ":"), ensure_ascii=False)

        computed = hmac.new(
            NOWPAYMENTS_IPN_SECRET.strip().encode("utf-8"),
            sorted_json.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()

        ok = hmac.compare_digest(computed, signature)
        if not ok:
            # Log just enough to diagnose without leaking the secret or full body
            order_id = body_data.get("order_id", "?") if isinstance(body_data, dict) else "?"
            logger.warning(
                f"NOWPayments IPN HMAC mismatch order_id={order_id} "
                f"body_len={len(body_bytes)} sorted_len={len(sorted_json)} "
                f"computed_prefix={computed[:8]} received_prefix={signature[:8]} "
                f"non_ascii_chars={sum(1 for c in sorted_json if ord(c) > 127)}"
            )
        return ok
    except Exception as e:
        logger.error(f"IPN signature verification failed: {e}")
        return False


def parse_ipn_body(body_bytes: bytes) -> dict:
    """Parse and return the IPN webhook body."""
    try:
        return json.loads(body_bytes)
    except Exception:
        return {}


# ── Payment Status Helpers ──────────────────────────────────────

# NOWPayments payment statuses:
# waiting → confirming → confirmed → sending → partially_paid → finished → failed → refunded → expired
TERMINAL_STATUSES = {"finished", "confirmed", "partially_paid", "failed", "refunded", "expired"}
SUCCESS_STATUSES = {"finished", "confirmed"}


def is_payment_finished(status: str) -> bool:
    """Check if payment has reached a successful terminal state."""
    return status in SUCCESS_STATUSES


def is_payment_failed(status: str) -> bool:
    """Check if payment has reached a failed/expired state."""
    return status in {"failed", "refunded", "expired"}


# ── Get Payment Status (manual check) ──────────────────────────

def get_payment_status(payment_id: int) -> dict:
    """GET /payment/{payment_id} — check payment status manually."""
    try:
        resp = httpx.get(
            f"{NOWPAYMENTS_API_BASE}/payment/{payment_id}",
            headers=_api_headers(),
            timeout=10,
        )
        return resp.json()
    except Exception as e:
        logger.error(f"NOWPayments payment status check failed: {e}")
        return {"error": str(e)}
