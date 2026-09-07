"""
AdvantageLife — CoinPayments service (Phase 5).

Matrix-plan buyers pay the COMPANY in USDT via CoinPayments; funds settle into
the CoinPayments custody balance, from which Steve runs the weekly payout batch.

Two halves:
  * create_transaction() — starts a payment (buyer pays company). Needs the API
    key pair. Returns a checkout URL + txn_id.
  * verify_ipn() — verifies the CoinPayments IPN (HMAC-SHA512 of the RAW POST
    body, hex, in the "HMAC" header, keyed by the IPN secret). This is the trust
    boundary: only a verified IPN can confirm a payment and create commissions.

All of this is gated on env — with nothing configured, is_configured() is False
and the checkout endpoint refuses cleanly rather than half-firing.

Env (set in Railway when going live):
  COINPAYMENTS_PUBLIC_KEY   — API public key
  COINPAYMENTS_PRIVATE_KEY  — API private key
  COINPAYMENTS_IPN_SECRET   — IPN secret (a random string you set in CoinPayments)
  COINPAYMENTS_MERCHANT_ID  — merchant ID (checked against the IPN 'merchant' field)
"""
import os
import hmac
import hashlib
import logging
import urllib.parse

import httpx

logger = logging.getLogger("coinpayments")

API_URL = "https://www.coinpayments.net/api.php"
PUBLIC_KEY  = os.environ.get("COINPAYMENTS_PUBLIC_KEY", "")
PRIVATE_KEY = os.environ.get("COINPAYMENTS_PRIVATE_KEY", "")
IPN_SECRET  = os.environ.get("COINPAYMENTS_IPN_SECRET", "")
MERCHANT_ID = os.environ.get("COINPAYMENTS_MERCHANT_ID", "")

# USDT on the chains we accept for payment-in. Buyer pays in one of these.
PAY_CURRENCIES = {"trc20": "USDT.TRC20", "bep20": "USDT.BEP20", "erc20": "USDT.ERC20"}


def is_configured() -> bool:
    return bool(PUBLIC_KEY and PRIVATE_KEY and IPN_SECRET and MERCHANT_ID)


def ipn_configured() -> bool:
    """Verification only needs the IPN secret + merchant id."""
    return bool(IPN_SECRET and MERCHANT_ID)


# ── IPN verification (the trust boundary) ──────────────────────────────────
def verify_ipn(body_bytes: bytes, hmac_header: str, merchant_field: str) -> bool:
    """Verify a CoinPayments IPN.

    CoinPayments signs the RAW POST body with HMAC-SHA512 (hex) keyed by the IPN
    secret, and sends it in the 'HMAC' header. We also confirm the 'merchant'
    field matches our merchant id.
    """
    if not IPN_SECRET or not MERCHANT_ID:
        logger.error("CoinPayments IPN not configured (secret/merchant missing)")
        return False
    if not hmac_header:
        logger.warning("CoinPayments IPN: no HMAC header")
        return False
    if (merchant_field or "") != MERCHANT_ID:
        logger.warning("CoinPayments IPN: merchant mismatch")
        return False
    computed = hmac.new(IPN_SECRET.strip().encode("utf-8"),
                        body_bytes, hashlib.sha512).hexdigest()
    ok = hmac.compare_digest(computed, hmac_header)
    if not ok:
        logger.warning("CoinPayments IPN: HMAC mismatch "
                       f"computed_prefix={computed[:8]} received_prefix={(hmac_header or '')[:8]}")
    return ok


def parse_ipn_body(body_bytes: bytes) -> dict:
    """CoinPayments IPN bodies are form-urlencoded."""
    try:
        parsed = urllib.parse.parse_qs(body_bytes.decode("utf-8"))
        return {k: v[0] if isinstance(v, list) and v else v for k, v in parsed.items()}
    except Exception as e:
        logger.error(f"CoinPayments IPN parse failed: {e}")
        return {}


def status_is_complete(status) -> bool:
    """CoinPayments status: >=100 or ==2 means complete/paid."""
    try:
        s = int(status)
    except (TypeError, ValueError):
        return False
    return s >= 100 or s == 2


def status_is_failed(status) -> bool:
    try:
        return int(status) < 0
    except (TypeError, ValueError):
        return False


# ── checkout creation (buyer pays company) ─────────────────────────────────
def _signed_post(params: dict) -> dict:
    """POST to the CoinPayments API with the private-key HMAC over the encoded body."""
    params = dict(params)
    params.update({"version": "1", "key": PUBLIC_KEY, "format": "json"})
    encoded = urllib.parse.urlencode(params)
    sig = hmac.new(PRIVATE_KEY.encode("utf-8"), encoded.encode("utf-8"),
                   hashlib.sha512).hexdigest()
    resp = httpx.post(API_URL, data=encoded,
                      headers={"HMAC": sig,
                               "Content-Type": "application/x-www-form-urlencoded"},
                      timeout=20)
    return resp.json()


def create_transaction(*, amount_usd, item_name: str, custom: str,
                       buyer_email: str, ipn_url: str, network: str = "trc20") -> dict:
    """Create a payment (buyer pays company in USDT). Returns
    {ok, txn_id, checkout_url, address, amount, error}."""
    if not is_configured():
        return {"ok": False, "error": "CoinPayments not configured"}
    currency2 = PAY_CURRENCIES.get((network or "trc20").lower(), "USDT.TRC20")
    try:
        data = _signed_post({
            "cmd": "create_transaction",
            "amount": str(amount_usd),
            "currency1": "USD",
            "currency2": currency2,
            "buyer_email": buyer_email or "",
            "item_name": item_name,
            "custom": custom,
            "ipn_url": ipn_url,
        })
    except Exception as e:
        logger.error(f"CoinPayments create_transaction failed: {e}")
        return {"ok": False, "error": str(e)}
    if data.get("error") and data.get("error") != "ok":
        return {"ok": False, "error": data.get("error")}
    r = data.get("result", {}) or {}
    return {"ok": True, "txn_id": r.get("txn_id"), "checkout_url": r.get("checkout_url"),
            "address": r.get("address"), "amount": r.get("amount")}
