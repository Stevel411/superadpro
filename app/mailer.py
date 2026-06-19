"""
SuperAdPro — switchable email transport.

The provider is chosen by the EMAIL_PROVIDER env var so the Brevo -> Amazon SES
cutover is a single Railway env flip with ZERO code change and no redeploy:

    EMAIL_PROVIDER=brevo   (default)  -> existing Brevo REST paths, untouched
    EMAIL_PROVIDER=ses                -> Amazon SES via SMTP (this module)

The two historical send functions — app.email_utils.send_email (sync) and
app.brevo_service.send_email (async) — keep their own Brevo code exactly as
it was. Each gains a single fork at the top: when EMAIL_PROVIDER == "ses" they
delegate delivery to ses_send() here and adapt the result to their own return
shape. Nothing else (templates, call sites, retry semantics for Brevo) changes.

SES is reached over SMTP+STARTTLS (port 587) using stdlib smtplib — no new
dependency, and SES SMTP credentials are a one-click create in the SES console
(simpler than IAM access keys for a non-AWS operator).

Required env vars when EMAIL_PROVIDER=ses:
    SES_SMTP_HOST   e.g. email-smtp.eu-west-1.amazonaws.com   (region-specific)
    SES_SMTP_PORT   default 587
    SES_SMTP_USER   SES SMTP username (from "Create SMTP credentials")
    SES_SMTP_PASS   SES SMTP password
    FROM_EMAIL      a verified sender on the verified domain, e.g. noreply@superadpro.com

ses_send() returns a normalised dict: {"ok": bool, "message_id": str|None, "error": str|None}
"""
import os
import re
import ssl
import time
import smtplib
import logging
import threading
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid

logger = logging.getLogger(__name__)

# ── Global SES send governor ──────────────────────────────────────────────────
# A single uvicorn worker runs the app, so module-level state is the authoritative
# account-wide view of SES usage. Two protections, both enforced at the universal
# ses_send() chokepoint so every member-bulk path (autoresponder drips, member
# broadcasts) is covered automatically:
#   1. A per-second floor across ALL concurrent sends. Each broadcast job paces
#      itself, but two members broadcasting at once could still sum over the SES
#      account rate cap and trigger throttling errors.
#   2. A daily soft cap set just below the AWS account quota, so the platform
#      degrades gracefully with a clear message instead of SES bouncing mail and
#      burning shared sender reputation.
# On boot the daily count is reconciled from EmailSendLog (reconcile_daily_count)
# so a mid-day restart doesn't reset the cap to zero.
#
# Tunables (Railway env, picked up on next deploy):
#   SES_DAILY_SOFT_CAP  default 45000  — keep below the live AWS daily quota
#   SES_MAX_PER_SEC     default 12     — keep below the live AWS per-second rate
_SES_GOV_LOCK = threading.Lock()
_SES_LAST_SEND_MONO = 0.0
_SES_DAY = None            # 'YYYY-MM-DD' (UTC)
_SES_DAY_COUNT = 0

def _ses_daily_soft_cap() -> int:
    try:
        return int(os.getenv("SES_DAILY_SOFT_CAP", "45000"))
    except ValueError:
        return 45000

def _ses_min_interval() -> float:
    try:
        rate = float(os.getenv("SES_MAX_PER_SEC", "12"))
    except ValueError:
        rate = 12.0
    return (1.0 / rate) if rate > 0 else 0.0

def reconcile_daily_count(n: int) -> None:
    """Seed today's SES counter from a durable source (EmailSendLog) on boot, so a
    restart mid-day doesn't reset the daily cap. Called once from app startup."""
    global _SES_DAY, _SES_DAY_COUNT
    with _SES_GOV_LOCK:
        _SES_DAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        _SES_DAY_COUNT = max(0, int(n or 0))
        logger.info(f"[mailer/ses] daily counter reconciled to {_SES_DAY_COUNT} for {_SES_DAY}")

def ses_capacity_snapshot() -> dict:
    """Read-only view of the SES governor for admin diagnostics."""
    with _SES_GOV_LOCK:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        count = _SES_DAY_COUNT if _SES_DAY == today else 0
    cap = _ses_daily_soft_cap()
    interval = _ses_min_interval()
    return {
        "utc_date": today,
        "sent_today": count,
        "soft_cap": cap,
        "remaining": max(0, cap - count),
        "max_per_sec": round(1.0 / interval, 2) if interval > 0 else None,
    }

def _ses_reserve_slot():
    """Reserve one global send slot. Enforces the daily soft cap, then the
    per-second floor (sleeping if needed). Returns (ok: bool, reason: str).
    Counts attempts, not just successes — conservative for a reputation cap."""
    global _SES_LAST_SEND_MONO, _SES_DAY, _SES_DAY_COUNT
    cap = _ses_daily_soft_cap()
    interval = _ses_min_interval()
    with _SES_GOV_LOCK:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if _SES_DAY != today:
            _SES_DAY = today
            _SES_DAY_COUNT = 0
        if _SES_DAY_COUNT >= cap:
            return False, "daily_cap"
        if interval > 0:
            wait = interval - (time.monotonic() - _SES_LAST_SEND_MONO)
            if wait > 0:
                time.sleep(wait)
        _SES_LAST_SEND_MONO = time.monotonic()
        _SES_DAY_COUNT += 1
        return True, ""

# Read fresh each call (cheap) so a Railway env change is picked up on the next
# send without a process restart being strictly required for the flag itself.
def provider() -> str:
    return os.getenv("EMAIL_PROVIDER", "brevo").strip().lower()

def member_bulk_provider() -> str:
    """Provider for MEMBER-owned bulk sends (autoresponder drips + member
    broadcasts to their own leads), independent of the platform-wide
    EMAIL_PROVIDER. Lets member bulk run on a SEPARATE Amazon SES account (its
    own reputation/IP pool) while SuperAdPro's own transactional mail stays on
    the global provider — so one member's bad list can never get the account
    that sends password resets/receipts suspended. Default 'brevo' (no-op until
    flipped to 'ses' once the members SES account is out of sandbox)."""
    return os.getenv("MEMBER_BULK_PROVIDER", "brevo").strip().lower()

# Back-compat module-level flag (most call sites read mailer.EMAIL_PROVIDER).
EMAIL_PROVIDER = provider()

_SES_RETRYABLE = (
    smtplib.SMTPServerDisconnected,
    smtplib.SMTPConnectError,
    smtplib.SMTPHeloError,
    ssl.SSLError,
    OSError,
)
_MAX_ATTEMPTS = 3


def _html_to_text(html: str) -> str:
    """Cheap HTML -> plaintext fallback for the text/plain MIME part.

    A multipart/alternative with a real text part materially helps SES
    deliverability and spam scoring vs HTML-only. Not a full renderer — just
    enough to give a readable fallback when a caller didn't supply text.
    """
    if not html:
        return " "
    t = re.sub(r"(?i)<br\s*/?>", "\n", html)
    t = re.sub(r"(?i)</p\s*>", "\n\n", t)
    t = re.sub(r"(?i)<li[^>]*>", "\n  - ", t)
    t = re.sub(r"<[^>]+>", "", t)
    t = re.sub(r"&nbsp;", " ", t)
    t = re.sub(r"&amp;", "&", t)
    t = re.sub(r"&mdash;", "-", t)
    t = re.sub(r"&rarr;", "->", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip() or " "


def ses_send(to_email: str, subject: str, html: str, text: str = None,
             from_email: str = None, from_name: str = None,
             reply_to_email: str = None, reply_to_name: str = None,
             list_unsubscribe: str = None) -> dict:
    """Deliver one email via Amazon SES over SMTP. Synchronous.

    list_unsubscribe: optional URL/mailto for the List-Unsubscribe header.
    Marketing broadcasts should pass this (protects SES sender reputation by
    giving recipients a one-click opt-out their mail client honours). Omit for
    transactional mail.

    Returns {"ok", "message_id", "error"}.
    """
    host = os.getenv("SES_SMTP_HOST", "")
    port = int(os.getenv("SES_SMTP_PORT", "587"))
    smtp_user = os.getenv("SES_SMTP_USER", "")
    smtp_pass = os.getenv("SES_SMTP_PASS", "")
    from_email = from_email or os.getenv("FROM_EMAIL", "noreply@superadpro.com")
    from_name = from_name or os.getenv("BREVO_SENDER_NAME", "SuperAdPro")

    if not (host and smtp_user and smtp_pass):
        logger.error("[mailer/ses] SES_SMTP_HOST/USER/PASS not configured")
        return {"ok": False, "message_id": None, "error": "SES SMTP not configured"}

    # Global account-wide governor: daily soft cap + per-second rate floor across
    # all concurrent sends. Rejects gracefully when the daily cap is hit rather
    # than letting SES bounce mail and harm shared sender reputation.
    _ok, _reason = _ses_reserve_slot()
    if not _ok:
        logger.warning(f"[mailer/ses] send rejected by governor ({_reason}); to={to_email}")
        return {"ok": False, "message_id": None,
                "error": "Daily email sending capacity reached — please try again shortly."}

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((from_name, from_email))
    msg["To"] = to_email
    if reply_to_email:
        msg["Reply-To"] = formataddr((reply_to_name or from_name, reply_to_email))
    if list_unsubscribe:
        # RFC 2369 / RFC 8058 — one-click unsubscribe for marketing mail.
        msg["List-Unsubscribe"] = f"<{list_unsubscribe}>"
        msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    try:
        msg_id = make_msgid(domain=from_email.split("@")[-1])
    except Exception:
        msg_id = make_msgid()
    msg["Message-ID"] = msg_id
    # Order matters: last part is the preferred one (HTML).
    msg.attach(MIMEText(text or _html_to_text(html), "plain", "utf-8"))
    msg.attach(MIMEText(html or "", "html", "utf-8"))
    raw = msg.as_string()

    ctx = ssl.create_default_context()
    last_error = None
    for attempt in range(1, _MAX_ATTEMPTS + 1):
        try:
            with smtplib.SMTP(host, port, timeout=20) as s:
                s.ehlo()
                s.starttls(context=ctx)
                s.ehlo()
                s.login(smtp_user, smtp_pass)
                s.sendmail(from_email, [to_email], raw)
            if attempt > 1:
                logger.info(f"[mailer/ses] sent on retry {attempt} -> {to_email}")
            return {"ok": True, "message_id": msg_id, "error": None}
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"[mailer/ses] auth failed (check SES_SMTP_USER/PASS): {e}")
            return {"ok": False, "message_id": None, "error": "SES auth failed"}
        except smtplib.SMTPRecipientsRefused as e:
            logger.error(f"[mailer/ses] recipient refused {to_email}: {e}")
            return {"ok": False, "message_id": None, "error": "recipient refused"}
        except smtplib.SMTPSenderRefused as e:
            # Usually an unverified From identity or still-in-sandbox account.
            logger.error(f"[mailer/ses] sender refused {from_email}: {e}")
            return {"ok": False, "message_id": None, "error": "sender refused (verify domain / leave sandbox)"}
        except _SES_RETRYABLE as e:
            last_error = f"{type(e).__name__}: {e}"
            logger.warning(f"[mailer/ses] attempt {attempt}/{_MAX_ATTEMPTS} transient: {last_error}")
        except Exception as e:
            logger.error(f"[mailer/ses] unexpected: {e}")
            return {"ok": False, "message_id": None, "error": str(e)}
        if attempt < _MAX_ATTEMPTS:
            time.sleep(2 ** (attempt - 1))  # 1s, 2s
    return {"ok": False, "message_id": None, "error": f"SES failed after {_MAX_ATTEMPTS}: {last_error}"}
