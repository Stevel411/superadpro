"""
SuperAdPro — Amazon SNS message signature verification.

The SES bounce/complaint webhook (POST /webhooks/ses/notifications) is a public,
unauthenticated endpoint — it has to be, because Amazon SNS posts to it. That
makes signature verification non-negotiable: without it, anyone who finds the URL
could POST forged 'complaint' notifications and have us suppress arbitrary
addresses and pause arbitrary members. This module is the gate.

Verification follows AWS's documented procedure:
  1. SigningCertURL must be https and a real Amazon SNS host
     (sns.<region>.amazonaws.com) — this blocks an attacker pointing us at a
     cert they control (SSRF / key substitution).
  2. Rebuild the exact canonical string AWS signed (field set differs by Type).
  3. Verify the base64 Signature against the certificate's public key
     (SignatureVersion 1 = SHA1, 2 = SHA256, PKCS#1 v1.5).

Certs are cached in-process by URL (they rotate rarely).
"""
import re
import base64
import logging
import urllib.request
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

_CERT_HOST_RE = re.compile(r"^sns\.[a-z0-9-]+\.amazonaws\.com$")
_cert_cache = {}   # url -> public_key

# Field order AWS uses to build the string-to-sign, per message Type.
_SIGN_FIELDS = {
    "Notification": ("Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"),
    "SubscriptionConfirmation": ("Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"),
    "UnsubscribeConfirmation": ("Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"),
}


def _cert_url_ok(url: str) -> bool:
    try:
        u = urlparse(url or "")
    except Exception:
        return False
    return u.scheme == "https" and bool(_CERT_HOST_RE.match((u.netloc or "").lower()))


def _canonical_string(msg: dict) -> bytes:
    fields = _SIGN_FIELDS.get(msg.get("Type", ""))
    if not fields:
        return b""
    parts = []
    for f in fields:
        if f == "Subject" and "Subject" not in msg:
            continue  # Subject is omitted from the string when absent
        if f not in msg:
            continue
        parts.append(f"{f}\n{msg[f]}\n")
    return "".join(parts).encode("utf-8")


def _load_public_key(cert_url: str):
    if cert_url in _cert_cache:
        return _cert_cache[cert_url]
    req = urllib.request.Request(cert_url, headers={"User-Agent": "SuperAdPro-SNS-Verify"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        pem = resp.read()
    from cryptography.x509 import load_pem_x509_certificate
    cert = load_pem_x509_certificate(pem)
    pub = cert.public_key()
    _cert_cache[cert_url] = pub
    return pub


def verify_sns_message(msg: dict) -> bool:
    """Return True only if msg carries a valid AWS SNS signature."""
    try:
        if not isinstance(msg, dict) or msg.get("Type") not in _SIGN_FIELDS:
            return False
        cert_url = msg.get("SigningCertURL") or msg.get("SigningCertUrl")
        if not _cert_url_ok(cert_url):
            logger.warning(f"[sns] rejected cert URL: {cert_url}")
            return False
        signature = base64.b64decode(msg.get("Signature", ""))
        canonical = _canonical_string(msg)
        if not canonical or not signature:
            return False

        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import padding
        algo = hashes.SHA256() if str(msg.get("SignatureVersion")) == "2" else hashes.SHA1()
        pub = _load_public_key(cert_url)
        pub.verify(signature, canonical, padding.PKCS1v15(), algo)
        return True
    except Exception as e:
        logger.warning(f"[sns] signature verification failed: {e}")
        return False


def confirm_subscription(msg: dict) -> bool:
    """Visit the SubscribeURL to confirm an SNS subscription. Verify first."""
    url = msg.get("SubscribeURL")
    if not url:
        return False
    try:
        u = urlparse(url)
        if u.scheme != "https" or not (u.netloc or "").lower().endswith(".amazonaws.com"):
            logger.warning(f"[sns] refused SubscribeURL host: {url}")
            return False
        with urllib.request.urlopen(url, timeout=10) as resp:
            ok = 200 <= resp.status < 300
        logger.warning(f"[sns] subscription confirm {'OK' if ok else 'FAILED'} for {msg.get('TopicArn')}")
        return ok
    except Exception as e:
        logger.error(f"[sns] subscription confirm error: {e}")
        return False
