# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Email Utilities
# Uses Resend API for transactional email delivery
# ═══════════════════════════════════════════════════════════════
import os
import logging
import resend

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL     = os.getenv("FROM_EMAIL", "SuperAdPro <noreply@mail.superadpro.com>")
SITE_URL       = os.getenv("SITE_URL", "https://superadpro.com")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """Send an email via Resend. Returns True on success."""
    if not RESEND_API_KEY:
        logger.warning(f"Resend not configured — would send to {to_email}: {subject}")
        return False

    try:
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }
        if text_body:
            params["text"] = text_body

        result = resend.Emails.send(params)
        logger.info(f"Email sent to {to_email}: {subject} (id: {result.get('id', 'n/a')})")
        return True

    except Exception as e:
        logger.error(f"Email send failed to {to_email}: {e}")
        return False


# ═══════════════════════════════════════════════════════════════
# Welcome Email — sent after registration
# ═══════════════════════════════════════════════════════════════
def send_welcome_email(to_email: str, first_name: str, username: str) -> bool:
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050d1a;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050d1a;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0a1628;border:1px solid rgba(0,180,216,0.2);border-radius:12px;overflow:hidden;max-width:560px;width:100%">

  <tr><td style="background:linear-gradient(135deg,#00b4d8,#6d28d9);padding:28px 32px;text-align:center">
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:3px;text-transform:uppercase">SuperAdPro</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:1px">Video Advertising Platform</div>
  </td></tr>

  <tr><td style="padding:36px 32px">
    <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:#ffffff">Welcome to SuperAdPro!</p>
    <p style="margin:0 0 20px;font-size:15px;color:rgba(200,220,255,0.8);line-height:1.7">
      Hi {first_name},<br><br>
      Your account has been created successfully. Here are your details:
    </p>

    <div style="background:rgba(0,180,216,0.06);border:1px solid rgba(0,180,216,0.15);border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:13px;color:#64748b">Username</p>
      <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#00d4ff">{username}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#64748b">Email</p>
      <p style="margin:0;font-size:16px;font-weight:700;color:#00d4ff">{to_email}</p>
    </div>

    <p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#ffffff">Here's how to get started:</p>

    <div style="margin-bottom:24px">
      <p style="margin:0 0 10px;font-size:14px;color:rgba(200,220,255,0.8);line-height:1.7">
        <strong style="color:#16a34a">Step 1:</strong> Complete your profile — add your wallet address and country<br>
        <strong style="color:#00b4d8">Step 2:</strong> Activate your $20/month membership<br>
        <strong style="color:#6d28d9">Step 3:</strong> Choose a campaign tier to launch your Profit Engine Grid<br>
        <strong style="color:#f59e0b">Step 4:</strong> Watch daily videos to stay qualified for commissions
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0 28px">
      <a href="{SITE_URL}/dashboard"
         style="display:inline-block;background:linear-gradient(135deg,#00b4d8,#6d28d9);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:6px;letter-spacing:0.5px">
        Go to My Dashboard
      </a>
    </td></tr></table>
  </td></tr>

  <tr><td style="background:rgba(0,0,0,0.3);padding:18px 32px;border-top:1px solid rgba(0,180,216,0.1);text-align:center">
    <p style="margin:0;font-size:11px;color:rgba(200,220,255,0.35);line-height:1.7">
      SuperAdPro &middot; Video Advertising &amp; Affiliate Platform<br>
      <a href="{SITE_URL}" style="color:rgba(0,180,216,0.6);text-decoration:none">superadpro.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

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

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050d1a;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050d1a;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0a1628;border:1px solid rgba(0,180,216,0.2);border-radius:12px;overflow:hidden;max-width:560px;width:100%">

  <tr><td style="background:linear-gradient(135deg,#00b4d8,#6d28d9);padding:28px 32px;text-align:center">
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:3px;text-transform:uppercase">SuperAdPro</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:1px">Video Advertising Platform</div>
  </td></tr>

  <tr><td style="padding:36px 32px">
    <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:#ffffff">Password Reset Request</p>
    <p style="margin:0 0 20px;font-size:15px;color:rgba(200,220,255,0.8);line-height:1.7">
      Hi {first_name},<br><br>
      We received a request to reset the password for your SuperAdPro account.
      Click the button below to set a new password.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0 28px">
      <a href="{reset_url}"
         style="display:inline-block;background:linear-gradient(135deg,#00b4d8,#6d28d9);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:6px;letter-spacing:0.5px">
        Reset My Password
      </a>
    </td></tr></table>

    <p style="margin:0 0 12px;font-size:13px;color:rgba(200,220,255,0.6);line-height:1.7">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 28px;font-size:12px;color:#00b4d8;word-break:break-all">{reset_url}</p>

    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:14px 16px;margin-bottom:24px">
      <p style="margin:0;font-size:13px;color:rgba(251,191,36,0.9);line-height:1.6">
        This link expires in 1 hour. If you didn't request a password reset,
        you can safely ignore this email.
      </p>
    </div>
  </td></tr>

  <tr><td style="background:rgba(0,0,0,0.3);padding:18px 32px;border-top:1px solid rgba(0,180,216,0.1);text-align:center">
    <p style="margin:0;font-size:11px;color:rgba(200,220,255,0.35);line-height:1.7">
      SuperAdPro &middot; Video Advertising &amp; Affiliate Platform<br>
      This email was sent to {to_email}.
      <a href="{SITE_URL}" style="color:rgba(0,180,216,0.6);text-decoration:none">superadpro.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    return send_email(
        to_email  = to_email,
        subject   = "Reset your SuperAdPro password",
        html_body = html_body,
        text_body = f"Hi {first_name}, reset your SuperAdPro password here: {reset_url} (expires in 1 hour)",
    )


# ═══════════════════════════════════════════════════════════════
# Commission Notification Email
# ═══════════════════════════════════════════════════════════════
def send_commission_email(to_email: str, first_name: str, commission_type: str = "Affiliate", from_username: str = "") -> bool:
    from_line = f" from <strong>{from_username}</strong>" if from_username else ""
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050d1a;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050d1a;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0a1628;border:1px solid rgba(0,180,216,0.2);border-radius:12px;overflow:hidden;max-width:560px;width:100%">

  <tr><td style="background:linear-gradient(135deg,#16a34a,#059669);padding:28px 32px;text-align:center">
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:3px;text-transform:uppercase">SuperAdPro</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:1px">Commission Received!</div>
  </td></tr>

  <tr><td style="padding:36px 32px;text-align:center">
    <p style="margin:0 0 12px;font-size:42px">&#127881;</p>
    <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#16a34a">Cha-Ching!</p>
    <p style="margin:0 0 8px;font-size:16px;color:#e2e8f0">Hey {first_name}, you just received a commission!</p>
    <p style="margin:0 0 24px;font-size:14px;color:rgba(200,220,255,0.5)">{commission_type} commission{from_line}</p>
    <p style="margin:0 0 28px;font-size:13px;color:rgba(200,220,255,0.4)">Log in to your dashboard to see the full details and your updated balance.</p>

    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0">
      <a href="{SITE_URL}/dashboard"
         style="display:inline-block;background:linear-gradient(135deg,#00b4d8,#6d28d9);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:6px">
        View My Dashboard
      </a>
    </td></tr></table>
  </td></tr>

  <tr><td style="background:rgba(0,0,0,0.3);padding:18px 32px;border-top:1px solid rgba(0,180,216,0.1);text-align:center">
    <p style="margin:0;font-size:11px;color:rgba(200,220,255,0.35);line-height:1.7">
      SuperAdPro &middot; Video Advertising &amp; Affiliate Platform<br>
      <a href="{SITE_URL}" style="color:rgba(0,180,216,0.6);text-decoration:none">superadpro.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    return send_email(
        to_email  = to_email,
        subject   = "Cha-Ching! You received a commission on SuperAdPro!",
        html_body = html_body,
    )


# ═══════════════════════════════════════════════════════════════
# Membership Activation Email
# ═══════════════════════════════════════════════════════════════
def send_membership_activated_email(to_email: str, first_name: str) -> bool:
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050d1a;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050d1a;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0a1628;border:1px solid rgba(0,180,216,0.2);border-radius:12px;overflow:hidden;max-width:560px;width:100%">

  <tr><td style="background:linear-gradient(135deg,#00b4d8,#6d28d9);padding:28px 32px;text-align:center">
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:3px;text-transform:uppercase">SuperAdPro</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:1px">Membership Activated</div>
  </td></tr>

  <tr><td style="padding:36px 32px">
    <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:#ffffff">You're All Set, {first_name}!</p>
    <p style="margin:0 0 20px;font-size:15px;color:rgba(200,220,255,0.8);line-height:1.7">
      Your $20/month membership is now active. You're ready to start earning with SuperAdPro.
    </p>

    <p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#ffffff">What's unlocked:</p>
    <div style="margin-bottom:24px">
      <p style="margin:0 0 10px;font-size:14px;color:rgba(200,220,255,0.8);line-height:1.7">
        &#10003; Watch &amp; Earn daily videos<br>
        &#10003; Earn referral commissions<br>
        &#10003; Access campaign tiers and Profit Engine Grids<br>
        &#10003; Full marketing suite (AI Studio, Niche Finder, Swipe File)
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0">
      <a href="{SITE_URL}/dashboard"
         style="display:inline-block;background:linear-gradient(135deg,#00b4d8,#6d28d9);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:6px">
        Go to Dashboard
      </a>
    </td></tr></table>
  </td></tr>

  <tr><td style="background:rgba(0,0,0,0.3);padding:18px 32px;border-top:1px solid rgba(0,180,216,0.1);text-align:center">
    <p style="margin:0;font-size:11px;color:rgba(200,220,255,0.35);line-height:1.7">
      SuperAdPro &middot; Video Advertising &amp; Affiliate Platform<br>
      <a href="{SITE_URL}" style="color:rgba(0,180,216,0.6);text-decoration:none">superadpro.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    return send_email(
        to_email  = to_email,
        subject   = "Your SuperAdPro membership is active!",
        html_body = html_body,
    )


# ═══════════════════════════════════════════════════════════════
# Renewal Reminder Email
# ═══════════════════════════════════════════════════════════════
def send_renewal_reminder_email(to_email: str, first_name: str, days_left: int) -> bool:
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050d1a;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050d1a;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0a1628;border:1px solid rgba(0,180,216,0.2);border-radius:12px;overflow:hidden;max-width:560px;width:100%">

  <tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 32px;text-align:center">
    <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:3px;text-transform:uppercase">SuperAdPro</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:1px">Membership Renewal Reminder</div>
  </td></tr>

  <tr><td style="padding:36px 32px">
    <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:#ffffff">Heads Up, {first_name}!</p>
    <p style="margin:0 0 20px;font-size:15px;color:rgba(200,220,255,0.8);line-height:1.7">
      Your membership renews in <strong style="color:#f59e0b">{days_left} day{'s' if days_left != 1 else ''}</strong>.
      Make sure you have at least <strong style="color:#16a34a">$20 USDT</strong> in your wallet balance
      for auto-renewal, or your commissions will be paused.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0">
      <a href="{SITE_URL}/wallet"
         style="display:inline-block;background:linear-gradient(135deg,#00b4d8,#6d28d9);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:6px">
        Check My Balance
      </a>
    </td></tr></table>
  </td></tr>

  <tr><td style="background:rgba(0,0,0,0.3);padding:18px 32px;border-top:1px solid rgba(0,180,216,0.1);text-align:center">
    <p style="margin:0;font-size:11px;color:rgba(200,220,255,0.35);line-height:1.7">
      SuperAdPro &middot; Video Advertising &amp; Affiliate Platform<br>
      <a href="{SITE_URL}" style="color:rgba(0,180,216,0.6);text-decoration:none">superadpro.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    return send_email(
        to_email  = to_email,
        subject   = f"Your SuperAdPro membership renews in {days_left} day{'s' if days_left != 1 else ''}",
        html_body = html_body,
    )


# ═══════════════════════════════════════════════════════════════
# VIP Waiting List Welcome Email
# ═══════════════════════════════════════════════════════════════
def send_vip_welcome_email(to_email: str, name: str) -> bool:
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#060918;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060918;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#0c1929;border:1px solid rgba(56,189,248,0.15);border-radius:16px;overflow:hidden;max-width:560px;width:100%">

  <tr><td style="background:linear-gradient(135deg,#0a2540,#0e3a5c);padding:36px 32px;text-align:center">
    <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:2px">SUPER<span style="color:#38bdf8">AD</span>PRO</div>
    <div style="font-size:12px;color:rgba(186,230,253,0.5);margin-top:6px;letter-spacing:1.5px">VIP EARLY ACCESS</div>
  </td></tr>

  <tr><td style="padding:40px 32px">
    <p style="margin:0 0 8px;font-size:42px;text-align:center">🎉</p>
    <p style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;text-align:center">You're on the VIP List!</p>
    <p style="margin:0 0 28px;font-size:15px;color:rgba(186,230,253,0.6);line-height:1.7;text-align:center">
      Welcome {name} — you've secured your spot on the SuperAdPro VIP waiting list.
      You'll be among the very first to get access when we launch.
    </p>

    <div style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.12);border-radius:12px;padding:24px;margin-bottom:28px">
      <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#fff;text-align:center">What's Coming:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:rgba(186,230,253,0.7);line-height:2">
        <tr><td style="padding:4px 0">🎬 <strong style="color:#38bdf8">Qualify by Participating</strong> — watch real video ads to stay qualified for commissions</td></tr>
        <tr><td style="padding:4px 0">📣 <strong style="color:#38bdf8">Real Views for Your Offers</strong> — drive genuine engaged traffic as an affiliate</td></tr>
        <tr><td style="padding:4px 0">⚡ <strong style="color:#38bdf8">Three Income Streams</strong> — memberships, campaign commissions &amp; course sales</td></tr>
        <tr><td style="padding:4px 0">💰 <strong style="color:#38bdf8">95% Payout · Instant</strong> — paid the moment it's earned, no waiting</td></tr>
        <tr><td style="padding:4px 0">🤖 <strong style="color:#38bdf8">AI-Powered Tools</strong> — sales chatbot, funnel builder &amp; marketing suite</td></tr>
      </table>
    </div>

    <div style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.15);border-radius:10px;padding:18px;margin-bottom:28px;text-align:center">
      <p style="margin:0;font-size:14px;color:rgba(251,191,36,0.85);line-height:1.6">
        <strong>Why VIP matters:</strong> When we launch, VIP members get first access.
        The earlier you're in, the stronger your position in the network.
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:10px 0">
      <a href="{SITE_URL}/compensation-plan"
         style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#38bdf8);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.5px">
        Preview the Compensation Plan
      </a>
    </td></tr></table>

    <p style="margin:24px 0 0;font-size:13px;color:rgba(186,230,253,0.35);text-align:center;line-height:1.6">
      We'll send you one more email on launch day with your exclusive early access link.
      That's it — no spam, ever.
    </p>
  </td></tr>

  <tr><td style="background:rgba(0,0,0,0.3);padding:20px 32px;border-top:1px solid rgba(56,189,248,0.08);text-align:center">
    <p style="margin:0;font-size:11px;color:rgba(186,230,253,0.2);line-height:1.7">
      SuperAdPro &middot; Video Advertising &amp; Affiliate Platform<br>
      <a href="{SITE_URL}" style="color:rgba(56,189,248,0.4);text-decoration:none">superadpro.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    return send_email(
        to_email  = to_email,
        subject   = f"🎉 You're on the VIP list, {name}!",
        html_body = html_body,
        text_body = f"Welcome {name}! You've secured your spot on the SuperAdPro VIP waiting list. We'll email you the moment we launch. Preview the comp plan: {SITE_URL}/compensation-plan",
    )
