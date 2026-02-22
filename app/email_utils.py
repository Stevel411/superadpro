# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Email Utilities
# Uses SMTP (Gmail app password via env vars)
# ═══════════════════════════════════════════════════════════════
import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")        # e.g. noreply@superadpro.com
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")    # Gmail app password
FROM_NAME     = "SuperAdPro"
FROM_EMAIL    = SMTP_USER
SITE_URL      = os.getenv("SITE_URL", "https://superadpro-production.up.railway.app")


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """Send an email via SMTP. Returns True on success."""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"Email not configured — would send to {to_email}: {subject}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg["To"]      = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())

        logger.info(f"Email sent to {to_email}: {subject}")
        return True

    except Exception as e:
        logger.error(f"Email send failed to {to_email}: {e}")
        return False


def send_password_reset_email(to_email: str, first_name: str, reset_token: str) -> bool:
    reset_url = f"{SITE_URL}/reset-password?token={reset_token}"

    html_body = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#050d1a;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050d1a;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0a1628;border:1px solid rgba(0,180,216,0.2);border-radius:12px;overflow:hidden;max-width:560px;width:100%">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#00b4d8,#6d28d9);padding:28px 32px;text-align:center">
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:3px;text-transform:uppercase">SuperAdPro</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:1px">Video Advertising Platform</div>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 32px">
    <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:#ffffff">Password Reset Request</p>
    <p style="margin:0 0 20px;font-size:15px;color:rgba(200,220,255,0.8);line-height:1.7">
      Hi {first_name},<br><br>
      We received a request to reset the password for your SuperAdPro account.
      Click the button below to set a new password.
    </p>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0 28px">
      <a href="{reset_url}"
         style="display:inline-block;background:linear-gradient(135deg,#00b4d8,#6d28d9);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:6px;letter-spacing:0.5px">
        Reset My Password →
      </a>
    </td></tr></table>

    <p style="margin:0 0 12px;font-size:13px;color:rgba(200,220,255,0.6);line-height:1.7">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 28px;font-size:12px;color:#00b4d8;word-break:break-all">{reset_url}</p>

    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:14px 16px;margin-bottom:24px">
      <p style="margin:0;font-size:13px;color:rgba(251,191,36,0.9);line-height:1.6">
        ⏱ <strong>This link expires in 1 hour.</strong> If you didn't request a password reset, 
        you can safely ignore this email — your password will not be changed.
      </p>
    </div>

    <p style="margin:0;font-size:13px;color:rgba(200,220,255,0.5);line-height:1.7">
      For security, this link can only be used once. If you need further help, 
      contact us at <a href="mailto:support@superadpro.com" style="color:#00b4d8">support@superadpro.com</a>
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:rgba(0,0,0,0.3);padding:18px 32px;border-top:1px solid rgba(0,180,216,0.1);text-align:center">
    <p style="margin:0;font-size:11px;color:rgba(200,220,255,0.35);line-height:1.7">
      SuperAdPro · Video Advertising &amp; Affiliate Platform<br>
      This email was sent to {to_email}. 
      <a href="{SITE_URL}" style="color:rgba(0,180,216,0.6);text-decoration:none">superadpro.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    text_body = f"""SuperAdPro — Password Reset

Hi {first_name},

We received a request to reset your SuperAdPro password.

Click here to reset it (link expires in 1 hour):
{reset_url}

If you didn't request this, ignore this email — your password won't change.

— The SuperAdPro Team
support@superadpro.com
"""

    return send_email(
        to_email  = to_email,
        subject   = "Reset your SuperAdPro password",
        html_body = html_body,
        text_body = text_body,
    )
