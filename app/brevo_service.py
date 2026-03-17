"""
Brevo (formerly SendInBlue) email service for SuperAdPro autoresponder.
Uses the Brevo REST API v3 — no SDK needed, just httpx.
Requires BREVO_API_KEY and BREVO_SENDER_EMAIL env vars on Railway.
"""
import os
import httpx
import json
from datetime import datetime

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "noreply@superadpro.com")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "SuperAdPro")
BREVO_BASE_URL = "https://api.brevo.com/v3"


def _headers():
    return {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
    }


async def send_email(to_email: str, to_name: str, subject: str, html_content: str, sender_name: str = None, sender_email: str = None):
    """Send a single transactional email via Brevo API."""
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

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{BREVO_BASE_URL}/smtp/email",
                headers=_headers(),
                json=payload,
            )
            data = resp.json()
            if resp.status_code in (200, 201):
                return {"ok": True, "message_id": data.get("messageId", "")}
            else:
                print(f"[Brevo] Send failed: {resp.status_code} {data}")
                return {"ok": False, "error": data.get("message", str(resp.status_code))}
    except Exception as e:
        print(f"[Brevo] Exception: {e}")
        return {"ok": False, "error": str(e)}


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
