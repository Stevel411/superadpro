"""
Coinbase Commerce integration for SuperAdPro.
Handles charge creation and webhook verification for:
  - Membership payments ($20)
  - Grid tier purchases ($20 - $1,000)

Setup:
  1. Create account at commerce.coinbase.com
  2. Get API key from Settings > Security > API keys
  3. Get Webhook Shared Secret from Settings > Notifications
  4. Set env vars: COINBASE_COMMERCE_API_KEY, COINBASE_WEBHOOK_SECRET
  5. Add webhook URL: https://superadpro-production.up.railway.app/api/webhook/coinbase
"""
import os
import hmac
import hashlib
import json
import logging
import requests
from datetime import datetime

logger = logging.getLogger("superadpro.coinbase")

# ── Config ──
COINBASE_API_KEY       = os.getenv("COINBASE_COMMERCE_API_KEY", "")
COINBASE_WEBHOOK_SECRET = os.getenv("COINBASE_WEBHOOK_SECRET", "")
COINBASE_API_URL       = "https://api.commerce.coinbase.com"
BASE_URL               = os.getenv("BASE_URL", "https://superadpro-production.up.railway.app")

# ── Sandbox mode — set COINBASE_SANDBOX=true for testing ──
SANDBOX_MODE = os.getenv("COINBASE_SANDBOX", "false").lower() == "true"


def create_charge(
    user_id: int,
    username: str,
    payment_type: str,          # "membership" or "grid_tier"
    amount_usd: float,
    description: str,
    package_tier: int = 0,
    redirect_url: str = None,
    cancel_url: str = None,
) -> dict:
    """
    Create a Coinbase Commerce charge.
    Returns {"success": True, "hosted_url": "...", "charge_id": "..."}
    or {"success": False, "error": "..."}
    """
    if not COINBASE_API_KEY:
        return {"success": False, "error": "Coinbase Commerce API key not configured"}

    # Metadata passed through to webhook for processing
    metadata = {
        "user_id":      str(user_id),
        "username":     username,
        "payment_type": payment_type,
        "package_tier": str(package_tier),
    }

    payload = {
        "name":          f"SuperAdPro — {description}",
        "description":   description,
        "pricing_type":  "fixed_price",
        "local_price": {
            "amount":    str(amount_usd),
            "currency":  "USD"
        },
        "metadata":      metadata,
        "redirect_url":  redirect_url or f"{BASE_URL}/payment/success",
        "cancel_url":    cancel_url or f"{BASE_URL}/payment/cancelled",
    }

    headers = {
        "Content-Type":  "application/json",
        "X-CC-Api-Key":  COINBASE_API_KEY,
        "X-CC-Version":  "2018-03-22",
    }

    try:
        resp = requests.post(
            f"{COINBASE_API_URL}/charges",
            json=payload,
            headers=headers,
            timeout=15
        )
        data = resp.json()

        if resp.status_code in (200, 201):
            charge = data.get("data", {})
            logger.info(f"Coinbase charge created: {charge.get('id')} for user {user_id} — ${amount_usd}")
            return {
                "success":    True,
                "charge_id":  charge.get("id"),
                "code":       charge.get("code"),
                "hosted_url": charge.get("hosted_url"),
                "expires_at": charge.get("expires_at"),
            }
        else:
            error_msg = data.get("error", {}).get("message", resp.text)
            logger.error(f"Coinbase charge failed: {error_msg}")
            return {"success": False, "error": error_msg}

    except requests.RequestException as e:
        logger.error(f"Coinbase API request failed: {e}")
        return {"success": False, "error": f"Payment service unavailable: {e}"}


def verify_webhook_signature(payload_body: bytes, signature: str) -> bool:
    """
    Verify the X-CC-Webhook-Signature header using HMAC-SHA256.
    """
    if not COINBASE_WEBHOOK_SECRET:
        logger.warning("Webhook secret not configured — skipping verification")
        return SANDBOX_MODE  # Only allow unverified in sandbox

    expected = hmac.new(
        COINBASE_WEBHOOK_SECRET.encode("utf-8"),
        payload_body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


def parse_webhook_event(payload: dict) -> dict:
    """
    Extract relevant info from a Coinbase Commerce webhook event.
    Returns {"event_type": "charge:confirmed", "charge_id": "...", "metadata": {...}, ...}
    """
    event = payload.get("event", {})
    event_type = event.get("type", "")
    data = event.get("data", {})
    metadata = data.get("metadata", {})

    # Get payment amount and currency
    payments = data.get("payments", [])
    paid_amount = 0.0
    paid_currency = "USD"
    if payments:
        last_payment = payments[-1]
        paid_amount = float(last_payment.get("value", {}).get("local", {}).get("amount", 0))
        paid_currency = last_payment.get("value", {}).get("local", {}).get("currency", "USD")

    return {
        "event_type":    event_type,
        "charge_id":     data.get("id", ""),
        "charge_code":   data.get("code", ""),
        "metadata":      metadata,
        "user_id":       int(metadata.get("user_id", 0)),
        "username":      metadata.get("username", ""),
        "payment_type":  metadata.get("payment_type", ""),
        "package_tier":  int(metadata.get("package_tier", 0)),
        "paid_amount":   paid_amount,
        "paid_currency": paid_currency,
        "status":        data.get("timeline", [{}])[-1].get("status", ""),
    }
