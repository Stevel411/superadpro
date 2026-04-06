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
    # Memberships
    "membership_basic":         {"price": Decimal("20.00"),  "type": "membership",  "desc": "SuperAdPro Basic Membership (Monthly)"},
    "membership_pro":           {"price": Decimal("35.00"),  "type": "membership",  "desc": "SuperAdPro Pro Membership (Monthly)"},
    "membership_basic_annual":  {"price": Decimal("200.00"), "type": "membership",  "desc": "SuperAdPro Basic Membership (Annual — Save $40)"},
    "membership_pro_annual":    {"price": Decimal("350.00"), "type": "membership",  "desc": "SuperAdPro Pro Membership (Annual — Save $70)"},
    # Grid / Campaign Tiers
    "grid_1":               {"price": Decimal("20.00"),   "type": "grid", "desc": "Campaign Tier 1 — Starter"},
    "grid_2":               {"price": Decimal("50.00"),   "type": "grid", "desc": "Campaign Tier 2 — Builder"},
    "grid_3":               {"price": Decimal("100.00"),  "type": "grid", "desc": "Campaign Tier 3 — Accelerator"},
    "grid_4":               {"price": Decimal("200.00"),  "type": "grid", "desc": "Campaign Tier 4 — Growth"},
    "grid_5":               {"price": Decimal("400.00"),  "type": "grid", "desc": "Campaign Tier 5 — Momentum"},
    "grid_6":               {"price": Decimal("600.00"),  "type": "grid", "desc": "Campaign Tier 6 — Velocity"},
    "grid_7":               {"price": Decimal("800.00"),  "type": "grid", "desc": "Campaign Tier 7 — Impact"},
    "grid_8":               {"price": Decimal("1000.00"), "type": "grid", "desc": "Campaign Tier 8 — Summit"},
    # Email Boost Packs
    "email_boost_1000":     {"price": Decimal("5.00"),  "type": "email_boost", "desc": "Email Boost — 1,000 Credits"},
    "email_boost_5000":     {"price": Decimal("19.00"), "type": "email_boost", "desc": "Email Boost — 5,000 Credits"},
    "email_boost_10000":    {"price": Decimal("29.00"), "type": "email_boost", "desc": "Email Boost — 10,000 Credits"},
    "email_boost_50000":    {"price": Decimal("99.00"), "type": "email_boost", "desc": "Email Boost — 50,000 Credits"},
    # SuperScene Credit Packs
    "superscene_starter":   {"price": Decimal("11.00"),  "type": "superscene", "desc": "SuperScene Starter — 50 Credits"},
    "superscene_creator":   {"price": Decimal("33.00"),  "type": "superscene", "desc": "SuperScene Creator — 150 Credits"},
    "superscene_studio":    {"price": Decimal("110.00"), "type": "superscene", "desc": "SuperScene Studio — 500 Credits"},
    "superscene_pro":       {"price": Decimal("264.00"), "type": "superscene", "desc": "SuperScene Pro — 1,200 Credits"},
    # Credit Matrix Packs
    "credit_matrix_starter":  {"price": Decimal("25.00"),  "type": "credit_matrix", "desc": "Credit Matrix Starter — 150 Credits"},
    "credit_matrix_builder":  {"price": Decimal("50.00"),  "type": "credit_matrix", "desc": "Credit Matrix Builder — 350 Credits"},
    "credit_matrix_pro":      {"price": Decimal("100.00"), "type": "credit_matrix", "desc": "Credit Matrix Pro — 800 Credits"},
    "credit_matrix_elite":    {"price": Decimal("250.00"), "type": "credit_matrix", "desc": "Credit Matrix Elite — 2,200 Credits"},
    "credit_matrix_ultimate": {"price": Decimal("500.00"), "type": "credit_matrix", "desc": "Credit Matrix Ultimate — 5,000 Credits"},
}


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

    # Look up product or use custom price (for SuperScene pay-per-use)
    if product_key in PRODUCT_CATALOG:
        product = PRODUCT_CATALOG[product_key]
        price_amount = float(product["price"])
        description = product["desc"]
    elif custom_price is not None:
        price_amount = float(custom_price)
        description = custom_description or f"SuperAdPro Purchase: {product_key}"
    else:
        return {"success": False, "error": f"Unknown product: {product_key}"}

    if price_amount <= 0:
        return {"success": False, "error": "Invalid price amount"}

    # Build unique order ID for tracking: SAP-{user_id}-{order_id}
    internal_order_id = f"SAP-{user_id}-{order_id}"

    # IPN callback URL — NOWPayments will POST status updates here
    ipn_callback_url = f"{SITE_URL}/api/webhook/nowpayments"

    # Success/cancel redirect URLs
    success_url = f"{SITE_URL}/payment-success?source=nowpayments&order_id={order_id}"
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
      3. JSON.stringify with sorted keys (no spaces, no escaping slashes)
      4. HMAC-SHA512 with IPN secret
      5. Compare hex digest with x-nowpayments-sig header
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
        # Use separators without spaces to match JS JSON.stringify
        sorted_json = json.dumps(sorted_data, separators=(",", ":"))

        computed = hmac.new(
            NOWPAYMENTS_IPN_SECRET.strip().encode("utf-8"),
            sorted_json.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()

        return hmac.compare_digest(computed, signature)
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
