"""
Brevo (formerly SendInBlue) email service for SuperAdPro autoresponder.
Uses the Brevo REST API v3 — no SDK needed, just httpx.
Requires BREVO_API_KEY and BREVO_SENDER_EMAIL env vars on Railway.
"""
import os
import asyncio
import httpx
import json
from datetime import datetime

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("FROM_EMAIL", os.environ.get("BREVO_SENDER_EMAIL", "noreply@superadpro.com"))
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "SuperAdPro")
BREVO_BASE_URL = "https://api.brevo.com/v3"


def _headers():
    return {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
    }


async def send_email(to_email: str, to_name: str, subject: str, html_content: str,
                     sender_name: str = None, sender_email: str = None,
                     reply_to_email: str = None, reply_to_name: str = None):
    """Send a single transactional email via Brevo API.

    Retries with exponential backoff on transient failures (429 rate limit,
    5xx server errors, network exceptions). Important for launch-day bursts
    when 1000+ verification emails could fire in an hour and Brevo's per-second
    rate limits could trip. Without retry, a transient blip means a real user
    gets locked out of their account because their verification email didn't
    arrive.

    Permanent failures (400 bad request, 401/403 auth) are NOT retried —
    those indicate a code or config bug and retrying just delays surfacing it.

    reply_to_email: optional address the admin's reply should go to. When
    set, hitting Reply in the recipient's mail client targets this address
    instead of the FROM sender. Useful for support tickets where the
    recipient (admin) should be able to reply directly to the member who
    submitted the ticket. Brevo supports this via the replyTo field.
    """
    if not BREVO_API_KEY:
        print("[Brevo] No API key — email not sent")
        return {"ok": False, "error": "No Brevo API key configured"}

    payload = {
        "sender": {
            "name": sender_name or BREVO_SENDER_NAME,
            "email": sender_email or BREVO_SENDER_EMAIL,
        },
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }
    if reply_to_email:
        payload["replyTo"] = {
            "email": reply_to_email,
            "name": reply_to_name or reply_to_email,
        }

    # Retry config: 3 attempts total, exponential backoff 1s → 2s → 4s
    # Total max delay is 7 seconds before giving up — within the typical
    # FastAPI request timeout of 30s and acceptable for a user waiting on
    # signup confirmation.
    RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
    MAX_ATTEMPTS = 3

    last_error = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{BREVO_BASE_URL}/smtp/email",
                    headers=_headers(),
                    json=payload,
                )

                if resp.status_code in (200, 201):
                    data = resp.json()
                    if attempt > 1:
                        print(f"[Brevo] Send succeeded on retry {attempt} for {to_email}")
                    return {"ok": True, "message_id": data.get("messageId", "")}

                # Non-retryable failures — give up immediately
                if resp.status_code not in RETRYABLE_STATUS_CODES:
                    try:
                        data = resp.json()
                        err = data.get("message", str(resp.status_code))
                    except Exception:
                        err = f"HTTP {resp.status_code}"
                    print(f"[Brevo] Permanent failure: {resp.status_code} {err}")
                    return {"ok": False, "error": err}

                # Retryable failure
                last_error = f"HTTP {resp.status_code}"
                print(f"[Brevo] Attempt {attempt}/{MAX_ATTEMPTS} failed: {last_error}")

        except (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError) as e:
            last_error = f"network: {type(e).__name__}: {e}"
            print(f"[Brevo] Attempt {attempt}/{MAX_ATTEMPTS} network error: {last_error}")
        except Exception as e:
            # Unexpected — don't retry, surface immediately
            print(f"[Brevo] Unexpected exception: {e}")
            return {"ok": False, "error": str(e)}

        # Exponential backoff before next attempt (skip after final attempt)
        if attempt < MAX_ATTEMPTS:
            delay = 2 ** (attempt - 1)  # 1s, 2s, 4s
            await asyncio.sleep(delay)

    return {"ok": False, "error": f"Failed after {MAX_ATTEMPTS} attempts: {last_error}"}


async def send_batch_emails(messages: list):
    """Send multiple emails via Brevo batch API.
    messages: list of {to_email, to_name, subject, html_content}
    """
    if not BREVO_API_KEY:
        return {"ok": False, "error": "No Brevo API key"}

    message_versions = []
    for m in messages[:1000]:  # Brevo limit: 1000 per batch
        message_versions.append({
            "to": [{"email": m["to_email"], "name": m.get("to_name", "")}],
            "subject": m.get("subject", ""),
            "htmlContent": m.get("html_content", ""),
        })

    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "messageVersions": message_versions,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{BREVO_BASE_URL}/smtp/email",
                headers=_headers(),
                json=payload,
            )
            if resp.status_code in (200, 201):
                return {"ok": True}
            else:
                return {"ok": False, "error": resp.text[:200]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def create_brevo_contact(email: str, first_name: str = "", list_ids: list = None):
    """Create or update a contact in Brevo."""
    if not BREVO_API_KEY:
        return None

    payload = {
        "email": email,
        "attributes": {"FIRSTNAME": first_name or ""},
        "updateEnabled": True,
    }
    if list_ids:
        payload["listIds"] = list_ids

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{BREVO_BASE_URL}/contacts",
                headers=_headers(),
                json=payload,
            )
            data = resp.json()
            return data.get("id")
    except Exception:
        return None


def wrap_email_html(body_html: str, member_name: str = "SuperAdPro Member"):
    """Wrap email body in a styled template."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);">
<div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px 28px;">
<div style="font-size:18px;font-weight:800;color:#fff;">Super<span style="color:#38bdf8;">Ad</span>Pro</div>
</div>
<div style="padding:28px;font-size:15px;line-height:1.8;color:#334155;">
{body_html}
</div>
<div style="padding:16px 28px;background:#f8f9fb;border-top:1px solid #e8ecf2;font-size:11px;color:#94a3b8;text-align:center;">
Sent by {member_name} via SuperAdPro · <a href="{{{{unsubscribe_url}}}}" style="color:#94a3b8;">Unsubscribe</a>
</div>
</div>
</div>
</body>
</html>"""
