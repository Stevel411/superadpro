"""
AdvantageLife — CoinPayments v2 service (Phase 5).

Matrix-plan buyers pay the COMPANY in USDT via a CoinPayments v2 invoice; funds
settle into custody, from which Steve runs the weekly payout batch.

Auth (v2): every request carries three headers and an HMAC-SHA256 signature
(Base64) computed with the integration CLIENT SECRET over the canonical string:
    BOM + METHOD + URL + CLIENT_ID + TIMESTAMP(UTC ISO) + RAW_BODY
Webhooks are signed by CoinPayments with the SAME scheme and headers, so they are
verified with the client secret (there is no separate webhook secret). This is
the trust boundary: only a correctly-signed webhook can confirm a payment.

Env (Railway):
  COINPAYMENTS_CLIENT_ID       — integration Client ID
  COINPAYMENTS_CLIENT_SECRET   — integration Client Secret
  (optional) COINPAYMENTS_API_URL       default https://a-api.coinpayments.net
  (optional) COINPAYMENTS_WEBHOOK_URL   default https://www.advantagelife.club/api/webhook/coinpayments
  (optional) COINPAYMENTS_USD_CURRENCY_ID  CoinPayments USD currency id
"""
import os
import hmac
import hashlib
import base64
import json
import logging
from datetime import datetime

import httpx

logger = logging.getLogger("coinpayments")

API_BASE      = os.environ.get("COINPAYMENTS_API_URL", "https://a-api.coinpayments.net").rstrip("/")
CLIENT_ID     = os.environ.get("COINPAYMENTS_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("COINPAYMENTS_CLIENT_SECRET", "")
WEBHOOK_URL   = os.environ.get("COINPAYMENTS_WEBHOOK_URL",
                               "https://www.advantagelife.club/api/webhook/coinpayments")
USD_CURRENCY_ID = os.environ.get("COINPAYMENTS_USD_CURRENCY_ID", "5057")

_BOM = "\ufeff"


def is_configured() -> bool:
    return bool(CLIENT_ID and CLIENT_SECRET)


def _timestamp() -> str:
    # UTC ISO-8601 to seconds, e.g. 2026-07-20T17:05:15
    return datetime.utcnow().isoformat(timespec="seconds")


def _sign(method: str, url: str, timestamp: str, body_str: str) -> str:
    """HMAC-SHA256 (Base64) over BOM + METHOD + URL + CLIENT_ID + TS + BODY."""
    msg = _BOM + method + url + CLIENT_ID + timestamp + (body_str or "")
    digest = hmac.new(CLIENT_SECRET.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(digest).decode("ascii")


# ── webhook verification (the trust boundary) ──────────────────────────────
def verify_webhook(body_bytes: bytes, client_hdr: str, timestamp_hdr: str, signature_hdr: str) -> bool:
    """Verify a CoinPayments v2 webhook using the same signature scheme, keyed by
    the client secret. URL must match the registered webhook URL exactly."""
    if not is_configured():
        logger.error("CoinPayments not configured (client id/secret missing)")
        return False
    if not signature_hdr:
        logger.warning("CoinPayments webhook: no signature header")
        return False
    if client_hdr and client_hdr != CLIENT_ID:
        logger.warning("CoinPayments webhook: client id mismatch")
        return False
    body_str = body_bytes.decode("utf-8")
    computed = _sign("POST", WEBHOOK_URL, timestamp_hdr or "", body_str)
    ok = hmac.compare_digest(computed, signature_hdr)
    if not ok:
        logger.warning("CoinPayments webhook: signature mismatch "
                       f"computed_prefix={computed[:10]} received_prefix={(signature_hdr or '')[:10]}")
    return ok


def parse_webhook(body_bytes: bytes) -> dict:
    try:
        return json.loads(body_bytes.decode("utf-8"))
    except Exception as e:
        logger.error(f"CoinPayments webhook parse failed: {e}")
        return {}


def _dig(d, *keys):
    for k in keys:
        if isinstance(d, dict) and k in d:
            d = d[k]
        else:
            return None
    return d


def extract_invoice(data: dict):
    """Pull (our_invoice_id, status_str) from a webhook body, trying the likely
    v2 shapes. our_invoice_id is the 'invoiceId' we set at creation (ALM-...)."""
    inv = data.get("invoice") if isinstance(data.get("invoice"), dict) else data
    our_id = (_dig(inv, "invoiceId") or _dig(inv, "invoiceIdString")
              or _dig(data, "invoiceId") or _dig(inv, "customData", "invoiceId"))
    status = (_dig(inv, "status") or _dig(data, "status") or _dig(data, "type") or "")
    return our_id, str(status)


def status_is_complete(status: str) -> bool:
    return str(status).lower() in ("completed", "complete", "paid", "invoicecompleted", "invoicepaid")


def status_is_failed(status: str) -> bool:
    return str(status).lower() in ("cancelled", "canceled", "timedout", "expired", "failed")


# ── invoice creation (buyer pays company) ──────────────────────────────────
def create_invoice(*, amount_usd, item_name: str, custom: str, buyer_email: str) -> dict:
    """Create a v2 merchant invoice. Returns {ok, invoice_id, checkout_url, error, raw}.
    NOTE: the exact v2 invoice body is confirmed on the first live test; the
    handler logs the raw response so any field tweak is a one-line fix."""
    if not is_configured():
        return {"ok": False, "error": "CoinPayments not configured"}
    url = API_BASE + "/api/v2/merchant/invoices"
    amt = f"{float(amount_usd):.2f}"
    payload = {
        "currency": USD_CURRENCY_ID,
        "invoiceId": custom,
        "items": [{"name": item_name, "quantity": {"value": "1", "type": "2"},
                   "amount": amt, "originalAmount": amt}],
        "amount": {"total": amt, "breakdown": {"subtotal": amt}},
        "buyer": {"email": buyer_email or ""},
    }
    body_str = json.dumps(payload, separators=(",", ":"))
    ts = _timestamp()
    headers = {
        "Content-Type": "application/json",
        "X-CoinPayments-Client": CLIENT_ID,
        "X-CoinPayments-Timestamp": ts,
        "X-CoinPayments-Signature": _sign("POST", url, ts, body_str),
    }
    try:
        resp = httpx.post(url, content=body_str, headers=headers, timeout=25)
        data = resp.json()
    except Exception as e:
        logger.error(f"CoinPayments create_invoice failed: {e}")
        return {"ok": False, "error": str(e)}
    if resp.status_code >= 400:
        logger.error(f"CoinPayments create_invoice HTTP {resp.status_code}: {data}")
        return {"ok": False, "error": f"{resp.status_code}: {data}"}
    inv = data.get("invoice", data) if isinstance(data, dict) else {}
    checkout = (inv.get("link") or inv.get("invoiceUrl") or inv.get("url")
                or _dig(data, "checkout", "url"))
    return {"ok": True, "invoice_id": inv.get("id") or inv.get("invoiceId"),
            "checkout_url": checkout, "raw": data}
