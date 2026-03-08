# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Email Utilities
# Uses Brevo SMTP for transactional email delivery
# ═══════════════════════════════════════════════════════════════
import os
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

SMTP_HOST  = os.getenv("SMTP_HOST", "smtp-relay.brevo.com")
SMTP_PORT  = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER  = os.getenv("SMTP_USER", "")
SMTP_PASS  = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "superadpro@proton.me")
SITE_URL   = os.getenv("SITE_URL", "https://superadpro-production.up.railway.app")

FROM_DISPLAY = f"SuperAdPro <{FROM_EMAIL}>"


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """Send an email via Brevo SMTP. Returns True on success."""
    if not SMTP_USER or not SMTP_PASS:
        logger.warning(f"SMTP not configured — would send to {to_email}: {subject}")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = FROM_DISPLAY
        msg["To"]      = to_email
        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Email send failed to {to_email}: {e}")
        return False


# ═══════════════════════════════════════════════════════════════
# SHARED EMAIL HEADER & FOOTER — SuperAdPro branded
# ═══════════════════════════════════════════════════════════════

def _email_header(accent_color="#0ea5e9", tagline="Video Advertising Platform"):
    """Branded header with inline SVG logo."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SuperAdPro</title></head>
<body style="margin:0;padding:0;background:#050d1a;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050d1a;padding:32px 16px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">

  <!-- Logo bar — matches site exactly -->
  <tr><td align="center" style="padding-bottom:20px">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:8px;vertical-align:middle">
        <!-- Exact site logo: cyan circle + white play triangle -->
        <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#0ea5e9"/>
          <path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/>
        </svg>
      </td>
      <td style="vertical-align:middle">
        <!-- Exact site wordmark: Super + Ad (cyan) + Pro, Sora font -->
        <span style="font-family:Sora,'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:800;color:#ffffff">Super</span><span style="font-family:Sora,'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:800;color:#38bdf8">Ad</span><span style="font-family:Sora,'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:800;color:#ffffff">Pro</span>
      </td>
    </tr></table>
    <div style="font-size:11px;color:rgba(56,189,248,0.5);letter-spacing:2px;text-transform:uppercase;margin-top:6px">{tagline}</div>
  </td></tr>

  <!-- Main card -->
  <tr><td style="background:#0a1628;border:1px solid rgba(0,200,232,0.15);border-radius:16px;overflow:hidden">
    <!-- Top accent bar -->
    <div style="height:3px;background:linear-gradient(90deg,{accent_color},#6d28d9,{accent_color})"></div>
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:36px 36px 0">
"""

def _email_footer(to_email=""):
    """Branded footer."""
    unsub = f"<br>This email was sent to {to_email}." if to_email else ""
    return f"""
    </td></tr>

    <!-- CTA divider -->
    <tr><td style="padding:0 36px 36px"></td></tr>

    <!-- Footer -->
    <tr><td style="background:rgba(0,0,0,0.35);padding:20px 36px;border-top:1px solid rgba(0,200,232,0.08)">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:11px;color:rgba(200,220,255,0.3);line-height:1.8">
            <strong style="color:rgba(0,200,232,0.5)">SuperAdPro</strong> &middot; Video Advertising &amp; Affiliate Platform<br>
            <a href="{SITE_URL}" style="color:rgba(0,200,232,0.4);text-decoration:none">{SITE_URL}</a>{unsub}
          </td>
          <td align="right">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#0ea5e9" opacity="0.5"/>
              <path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white" opacity="0.7"/>
            </svg>
          </td>
        </tr>
      </table>
    </td></tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _cta_button(url, label, color="#00c8e8"):
    return f"""<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0 8px">
      <a href="{url}" style="display:inline-block;background:linear-gradient(135deg,{color},#0077a8);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:8px;letter-spacing:0.5px">{label}</a>
    </td></tr></table>"""


def _info_box(content, border_color="rgba(0,200,232,0.2)"):
    return f"""<div style="background:rgba(0,200,232,0.05);border:1px solid {border_color};border-radius:10px;padding:18px 20px;margin:20px 0">{content}</div>"""


# ═══════════════════════════════════════════════════════════════
# Welcome Email
# ═══════════════════════════════════════════════════════════════
def send_welcome_email(to_email: str, first_name: str, username: str) -> bool:
    html_body = _email_header(tagline="Welcome to the Platform") + f"""
      <p style="margin:0 0 6px;font-size:24px;font-weight:800;color:#ffffff">Welcome aboard, {first_name}! 🎉</p>
      <p style="margin:0 0 24px;font-size:15px;color:rgba(200,220,255,0.7);line-height:1.7">
        Your SuperAdPro account is ready. Here are your details:
      </p>

      {_info_box(f'''
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:rgba(200,220,255,0.45);padding-bottom:4px">USERNAME</td>
            <td style="font-size:12px;color:rgba(200,220,255,0.45);padding-bottom:4px">EMAIL</td>
          </tr>
          <tr>
            <td style="font-size:17px;font-weight:700;color:#00c8e8;padding-right:20px">{username}</td>
            <td style="font-size:15px;font-weight:600;color:#e2eaf8">{to_email}</td>
          </tr>
        </table>
      ''')}

      <p style="margin:20px 0 12px;font-size:16px;font-weight:700;color:#ffffff">Get started in 4 steps:</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
        <tr>
          <td width="32" valign="top" style="padding-top:2px">
            <div style="width:24px;height:24px;border-radius:50%;background:rgba(0,200,232,0.15);border:1px solid rgba(0,200,232,0.3);text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#00c8e8">1</div>
          </td>
          <td style="font-size:14px;color:rgba(200,220,255,0.75);line-height:1.6;padding-bottom:12px">
            <strong style="color:#fff">Complete your profile</strong> — add your wallet address and country
          </td>
        </tr>
        <tr>
          <td width="32" valign="top" style="padding-top:2px">
            <div style="width:24px;height:24px;border-radius:50%;background:rgba(0,200,232,0.15);border:1px solid rgba(0,200,232,0.3);text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#00c8e8">2</div>
          </td>
          <td style="font-size:14px;color:rgba(200,220,255,0.75);line-height:1.6;padding-bottom:12px">
            <strong style="color:#fff">Activate your membership</strong> — starting from just $20/month
          </td>
        </tr>
        <tr>
          <td width="32" valign="top" style="padding-top:2px">
            <div style="width:24px;height:24px;border-radius:50%;background:rgba(0,200,232,0.15);border:1px solid rgba(0,200,232,0.3);text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#00c8e8">3</div>
          </td>
          <td style="font-size:14px;color:rgba(200,220,255,0.75);line-height:1.6;padding-bottom:12px">
            <strong style="color:#fff">Choose your campaign tier</strong> — launch your ad campaigns
          </td>
        </tr>
        <tr>
          <td width="32" valign="top" style="padding-top:2px">
            <div style="width:24px;height:24px;border-radius:50%;background:rgba(0,200,232,0.15);border:1px solid rgba(0,200,232,0.3);text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#00c8e8">4</div>
          </td>
          <td style="font-size:14px;color:rgba(200,220,255,0.75);line-height:1.6">
            <strong style="color:#fff">Watch daily videos</strong> — stay qualified for commissions
          </td>
        </tr>
      </table>

      {_cta_button(f"{SITE_URL}/dashboard", "Go to My Dashboard")}
    """ + _email_footer(to_email)

    return send_email(
        to_email  = to_email,
        subject   = f"Welcome to SuperAdPro, {first_name}!",
        html_body = html_body,
        text_body = f"Welcome to SuperAdPro, {first_name}! Your username is {username}. Log in at {SITE_URL}/dashboard",
    )


# ═══════════════════════════════════════════════════════════════
# Password Reset Email
# ═══════════════════════════════════════════════════════════════
def send_password_reset_email(to_email: str, first_name: str, reset_token: str) -> bool:
    reset_url = f"{SITE_URL}/reset-password?token={reset_token}"

    html_body = _email_header(accent_color="#00c8e8", tagline="Account Security") + f"""
      <p style="margin:0 0 6px;font-size:24px;font-weight:800;color:#ffffff">Password Reset Request</p>
      <p style="margin:0 0 24px;font-size:15px;color:rgba(200,220,255,0.7);line-height:1.7">
        Hi {first_name}, we received a request to reset your SuperAdPro password.
        Click the button below to choose a new one.
      </p>

      {_cta_button(reset_url, "Reset My Password")}

      <p style="margin:16px 0 8px;font-size:13px;color:rgba(200,220,255,0.45)">Or copy this link into your browser:</p>
      <p style="margin:0 0 20px;font-size:12px;color:#00c8e8;word-break:break-all;background:rgba(0,200,232,0.05);border:1px solid rgba(0,200,232,0.1);border-radius:6px;padding:10px 12px">{reset_url}</p>

      {_info_box('<p style="margin:0;font-size:13px;color:rgba(251,191,36,0.85);line-height:1.6">⏱ This link expires in <strong>1 hour</strong>. If you didn\'t request a password reset, you can safely ignore this email — your account is secure.</p>', border_color="rgba(251,191,36,0.2)")}
    """ + _email_footer(to_email)

    return send_email(
        to_email  = to_email,
        subject   = "Reset your SuperAdPro password",
        html_body = html_body,
        text_body = f"Hi {first_name}, reset your SuperAdPro password: {reset_url} (expires in 1 hour)",
    )


# ═══════════════════════════════════════════════════════════════
# Commission Notification Email
# ═══════════════════════════════════════════════════════════════
def send_commission_email(to_email: str, first_name: str, commission_type: str = "Affiliate", from_username: str = "") -> bool:
    from_line = f"from <strong style='color:#00c8e8'>{from_username}</strong>" if from_username else ""

    html_body = _email_header(accent_color="#22c55e", tagline="Commission Received") + f"""
      <div style="text-align:center;padding:8px 0 20px">
        <div style="font-size:52px;line-height:1">💰</div>
        <p style="margin:12px 0 4px;font-size:28px;font-weight:900;color:#22c55e">Cha-Ching!</p>
        <p style="margin:0;font-size:16px;color:rgba(200,220,255,0.8)">Hey {first_name}, you just earned a commission!</p>
      </div>

      {_info_box(f'''
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:rgba(200,220,255,0.45);padding-bottom:6px">COMMISSION TYPE</td>
          </tr>
          <tr>
            <td style="font-size:18px;font-weight:700;color:#22c55e">{commission_type} {from_line}</td>
          </tr>
        </table>
      ''', border_color="rgba(34,197,94,0.2)")}

      <p style="margin:16px 0 0;font-size:14px;color:rgba(200,220,255,0.55);text-align:center;line-height:1.6">
        Log in to your dashboard to see the full details and your updated wallet balance.
      </p>

      {_cta_button(f"{SITE_URL}/dashboard", "View My Dashboard", color="#22c55e")}
    """ + _email_footer(to_email)

    return send_email(
        to_email  = to_email,
        subject   = f"Cha-Ching! You received a {commission_type} commission on SuperAdPro!",
        html_body = html_body,
    )


# ═══════════════════════════════════════════════════════════════
# Membership Activation Email
# ═══════════════════════════════════════════════════════════════
def send_membership_activated_email(to_email: str, first_name: str) -> bool:
    html_body = _email_header(tagline="Membership Activated") + f"""
      <p style="margin:0 0 6px;font-size:24px;font-weight:800;color:#ffffff">You're all set, {first_name}! ✅</p>
      <p style="margin:0 0 24px;font-size:15px;color:rgba(200,220,255,0.7);line-height:1.7">
        Your $20/month SuperAdPro membership is now active. Here's what you've unlocked:
      </p>

      {_info_box('''
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:14px;color:rgba(200,220,255,0.8);line-height:2;padding:2px 0">
            <span style="color:#22c55e;font-weight:700">✓</span>&nbsp; Watch &amp; Earn daily videos<br>
            <span style="color:#22c55e;font-weight:700">✓</span>&nbsp; Earn referral commissions<br>
            <span style="color:#22c55e;font-weight:700">✓</span>&nbsp; Access campaign tiers and ad tools<br>
            <span style="color:#22c55e;font-weight:700">✓</span>&nbsp; Full AI marketing suite
          </td></tr>
        </table>
      ''')}

      {_cta_button(f"{SITE_URL}/dashboard", "Go to Dashboard")}
    """ + _email_footer(to_email)

    return send_email(
        to_email  = to_email,
        subject   = "Your SuperAdPro membership is active!",
        html_body = html_body,
        text_body = f"Hi {first_name}, your SuperAdPro membership is now active. Go to {SITE_URL}/dashboard",
    )


# ═══════════════════════════════════════════════════════════════
# Renewal Reminder Email
# ═══════════════════════════════════════════════════════════════
def send_renewal_reminder_email(to_email: str, first_name: str, days_left: int) -> bool:
    days_word = f"{days_left} day{'s' if days_left != 1 else ''}"
    urgency_color = "#ef4444" if days_left <= 3 else "#f59e0b"

    html_body = _email_header(accent_color=urgency_color, tagline="Membership Renewal Reminder") + f"""
      <p style="margin:0 0 6px;font-size:24px;font-weight:800;color:#ffffff">Heads up, {first_name}! ⏰</p>
      <p style="margin:0 0 24px;font-size:15px;color:rgba(200,220,255,0.7);line-height:1.7">
        Your SuperAdPro membership renews in <strong style="color:{urgency_color}">{days_word}</strong>.
        Make sure you have at least <strong style="color:#22c55e">$20 USDT</strong> in your wallet
        for auto-renewal, or your commissions will be paused.
      </p>

      {_info_box(f'<p style="margin:0;font-size:14px;color:rgba(200,220,255,0.75);line-height:1.6">Your membership renews in <strong style="color:{urgency_color}">{days_word}</strong>. Top up your wallet now to avoid any interruption to your account.</p>', border_color=f"rgba(245,158,11,0.25)")}

      {_cta_button(f"{SITE_URL}/wallet", "Check My Wallet Balance", color=urgency_color)}
    """ + _email_footer(to_email)

    return send_email(
        to_email  = to_email,
        subject   = f"Your SuperAdPro membership renews in {days_word}",
        html_body = html_body,
        text_body = f"Hi {first_name}, your SuperAdPro membership renews in {days_word}. Check your balance: {SITE_URL}/wallet",
    )


# ═══════════════════════════════════════════════════════════════
# VIP Waiting List Welcome Email
# ═══════════════════════════════════════════════════════════════
def send_vip_welcome_email(to_email: str, name: str) -> bool:
    html_body = _email_header(accent_color="#00c8e8", tagline="VIP Early Access") + f"""
      <div style="text-align:center;padding:4px 0 20px">
        <div style="font-size:48px;line-height:1">🎉</div>
        <p style="margin:12px 0 4px;font-size:26px;font-weight:900;color:#ffffff">You're on the VIP List!</p>
        <p style="margin:0;font-size:15px;color:rgba(200,220,255,0.65)">
          Welcome {name} — you've secured your early access spot.
        </p>
      </div>

      {_info_box('''
        <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#fff">What's coming at launch:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:14px;color:rgba(200,220,255,0.75);line-height:2">
            🎬&nbsp; <strong style="color:#00c8e8">Watch &amp; Earn</strong> — qualify by watching real video ads<br>
            📣&nbsp; <strong style="color:#00c8e8">Real Ad Views</strong> — drive genuine engaged traffic<br>
            ⚡&nbsp; <strong style="color:#00c8e8">Multiple Income Streams</strong> — memberships, commissions &amp; courses<br>
            💰&nbsp; <strong style="color:#00c8e8">Instant Payouts</strong> — paid the moment it\'s earned via USDT<br>
            🤖&nbsp; <strong style="color:#00c8e8">AI Marketing Suite</strong> — page builder, funnels &amp; AI content tools
          </td></tr>
        </table>
      ''')}

      {_info_box(f'<p style="margin:0;font-size:13px;color:rgba(251,191,36,0.85);line-height:1.6;text-align:center"><strong>Why VIP matters:</strong> The earlier you\'re in, the stronger your position in the network. You\'ll receive one email on launch day with your exclusive early access link.</p>', border_color="rgba(251,191,36,0.2)")}

      {_cta_button(f"{SITE_URL}/compensation-plan", "Preview the Compensation Plan")}
    """ + _email_footer(to_email)

    return send_email(
        to_email  = to_email,
        subject   = f"🎉 You're on the VIP list, {name}!",
        html_body = html_body,
        text_body = f"Welcome {name}! You've secured your VIP spot on SuperAdPro. Preview the comp plan: {SITE_URL}/compensation-plan",
    )
