# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Email Utilities
# Brevo HTTP API · Light theme · Warm & welcoming
# ═══════════════════════════════════════════════════════════════
import os
import json
import logging
import urllib.request

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
FROM_EMAIL    = os.getenv("FROM_EMAIL", "superadpro@proton.me")
SITE_URL      = os.getenv("SITE_URL", "https://superadpro-production.up.railway.app")
FROM_DISPLAY  = "SuperAdPro"


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """Send via Brevo HTTP API."""
    if not BREVO_API_KEY:
        logger.error("BREVO_API_KEY not set")
        return False
    payload = json.dumps({
        "sender":     {"name": FROM_DISPLAY, "email": FROM_EMAIL},
        "to":         [{"email": to_email}],
        "subject":    subject,
        "htmlContent": html_body,
        "textContent": text_body or subject,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "accept":       "application/json",
            "api-key":      BREVO_API_KEY,
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            ok = resp.status in (200, 201)
            logger.info(f"Email sent to {to_email}: {resp.status}")
            return ok
    except Exception as e:
        logger.error(f"Email failed to {to_email}: {e}")
        return False


# ═══════════════════════════════════════════════════════════════
# SHARED COMPONENTS
# ═══════════════════════════════════════════════════════════════

def _logo_html():
    """SuperAdPro logo: cyan circle with play arrow + wordmark."""
    return '''
    <table cellpadding="0" cellspacing="0" align="center">
      <tr>
        <td style="padding-right:12px;vertical-align:middle">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:46px;height:46px;background:#0ea5e9;border-radius:50%;text-align:center;vertical-align:middle">
                <span style="font-size:22px;color:#ffffff;font-weight:900;line-height:46px;display:block;padding-left:3px">&#9654;</span>
              </td>
            </tr>
          </table>
        </td>
        <td style="vertical-align:middle">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:900;color:#1e293b;letter-spacing:-0.5px">SuperAd</span><span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:900;color:#0ea5e9;letter-spacing:-0.5px">Pro</span>
        </td>
      </tr>
    </table>'''


def _email_shell(tagline: str, hero_bg: str, hero_content: str, body_content: str) -> str:
    """Full email shell: white card, light grey outer."""
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SuperAdPro</title>
</head>
<body style="margin:0;padding:0;background:#e8edf5;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf5;padding:36px 16px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">

  <!-- White card -->
  <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.04),0 20px 60px rgba(0,0,0,0.08)">

    <!-- Header: logo bar -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:28px 40px 24px;border-bottom:1px solid #f1f5f9">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>{_logo_html()}</td>
            <td align="right" style="font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;vertical-align:middle">{tagline}</td>
          </tr></table>
        </td>
      </tr>
    </table>

    <!-- Hero banner -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:{hero_bg};padding:36px 40px 32px">{hero_content}</td></tr>
    </table>

    <!-- Body -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:32px 40px">{body_content}</td></tr>
    </table>

    <!-- Footer -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:24px 40px;text-align:center">
        <table cellpadding="0" cellspacing="0" align="center" style="margin-bottom:10px">
          <tr>
            <td style="padding-right:8px;vertical-align:middle">
              <span style="display:inline-block;width:26px;height:26px;background:#0ea5e9;border-radius:50%;text-align:center;line-height:26px;font-size:13px;color:#fff;font-weight:900;padding-left:2px">&#9654;</span>
            </td>
            <td style="vertical-align:middle">
              <span style="font-family:Georgia,serif;font-size:15px;font-weight:900;color:#64748b">SuperAd</span><span style="font-family:Georgia,serif;font-size:15px;font-weight:900;color:#0ea5e9">Pro</span>
            </td>
          </tr>
        </table>
        <div style="font-size:13px;color:#94a3b8;line-height:1.8">
          Video Advertising &amp; Affiliate Platform<br>
          <a href="{SITE_URL}" style="color:#0ea5e9;text-decoration:none">{SITE_URL}</a>
        </div>
      </td></tr>
    </table>

  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _cta_button(url: str, label: str, color: str = "#0ea5e9") -> str:
    return f'''<table cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 4px">
      <tr><td style="background:{color};border-radius:50px;text-align:center">
        <a href="{url}" style="display:inline-block;padding:17px 44px;font-family:Georgia,serif;font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px">{label}</a>
      </td></tr>
    </table>'''


def _info_card(content: str, bg: str = "#f8fafc", border: str = "#e2e8f0") -> str:
    return f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td style="background:{bg};border:1px solid {border};border-radius:14px;padding:24px">{content}</td></tr>
    </table>'''


def _checklist(*items) -> str:
    rows = ""
    for item in items:
        rows += f'''<tr>
          <td style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.04);vertical-align:top">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="color:#22c55e;font-weight:700;font-size:18px;padding-right:12px;vertical-align:top;line-height:1.5">&#10003;</td>
              <td style="font-size:16px;color:#334155;line-height:1.5">{item}</td>
            </tr></table>
          </td>
        </tr>'''
    return f'<table width="100%" cellpadding="0" cellspacing="0">{rows}</table>'


# ═══════════════════════════════════════════════════════════════
# EMAIL 1: WELCOME
# ═══════════════════════════════════════════════════════════════
def send_welcome_email(to_email: str, first_name: str, username: str) -> bool:
    hero = f"""
      <div style="font-size:52px;line-height:1;margin-bottom:16px">&#127881;</div>
      <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:32px;font-weight:900;color:#1e293b;line-height:1.2">
        Welcome to the community, <span style="color:#0ea5e9">{first_name}!</span>
      </p>
      <p style="margin:0;font-size:17px;color:#475569;line-height:1.7">
        Your SuperAdPro account is live and ready. You're now part of a growing community of digital marketers and advertisers.
      </p>"""

    body = f"""
      <!-- Cyan credential box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr><td style="background:#0ea5e9;border-radius:14px;padding:22px 26px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.25)">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="font-size:15px;color:rgba(255,255,255,0.8);font-weight:500">Username</td>
                  <td align="right" style="font-size:15px;color:#ffffff;font-weight:700">{username}</td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.25)">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="font-size:15px;color:rgba(255,255,255,0.8);font-weight:500">Status</td>
                  <td align="right" style="font-size:15px;color:#86efac;font-weight:700">&#10003; Active</td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:9px 0">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="font-size:15px;color:rgba(255,255,255,0.8);font-weight:500">Dashboard</td>
                  <td align="right" style="font-size:14px;color:#ffffff;font-weight:600">superadpro.com/dashboard</td>
                </tr></table>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- What you can do -->
      {_info_card(
        '<p style="font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0284c7;margin:0 0 14px">What you can do right now</p>' +
        _checklist(
            'Watch daily videos and qualify for commissions',
            'Share your referral link and start earning $10/month per member',
            'Access 9 AI marketing tools',
            'Build and publish your own ad funnels',
        ),
        bg='#f0f9ff', border='#bae6fd'
      )}

      {_cta_button(f"{SITE_URL}/dashboard", "Go to My Dashboard &rarr;")}"""

    html = _email_shell("Welcome", "linear-gradient(135deg,#f0f9ff,#e0f2fe)", hero, body)
    return send_email(
        to_email=to_email,
        subject=f"Welcome to SuperAdPro, {first_name}! 🎉",
        html_body=html,
        text_body=f"Welcome to SuperAdPro, {first_name}! Your username is {username}. Log in at {SITE_URL}/dashboard",
    )


# ═══════════════════════════════════════════════════════════════
# EMAIL 2: CHA-CHING COMMISSION
# ═══════════════════════════════════════════════════════════════
def send_commission_email(to_email: str, first_name: str, commission_type: str = "Affiliate", from_username: str = "") -> bool:
    from_line = f" &middot; from <strong>{from_username}</strong>" if from_username else ""

    hero = f"""
      <div style="font-size:52px;line-height:1;margin-bottom:16px">&#128176;</div>
      <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:32px;font-weight:900;color:#15803d;line-height:1.2">
        Cha-Ching, <span style="color:#0ea5e9">{first_name}!</span>
      </p>
      <p style="margin:0;font-size:17px;color:#166534;line-height:1.7">
        Money just landed in your SuperAdPro wallet. Here's what came in:
      </p>"""

    body = f"""
      <!-- Green money card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr><td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:16px;padding:32px;text-align:center">
          <div style="font-size:38px;margin-bottom:12px">&#129689; &#129689; &#129689;</div>
          <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:22px;font-weight:900;color:#15803d">Commission Received!</p>
          <p style="margin:0;font-size:16px;color:#16a34a;font-weight:600">{commission_type}{from_line}</p>
        </td></tr>
      </table>

      <!-- Flow strip -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr><td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:15px 20px;text-align:center">
          <span style="font-size:22px">&#128179;</span>
          <span style="font-size:15px;color:#94a3b8;margin:0 8px">&rarr;</span>
          <span style="font-size:16px;color:#16a34a;font-weight:600">Added to your wallet balance</span>
          <span style="font-size:15px;color:#94a3b8;margin:0 8px">&rarr;</span>
          <span style="font-size:22px">&#127974;</span>
        </td></tr>
      </table>

      {_info_card(
        '<p style="margin:0;font-size:16px;color:#166534;line-height:1.7">Your earnings are building up in your wallet. Once you hit the <strong>$10 minimum</strong>, you can withdraw to your USDT wallet anytime — no waiting, no delays.</p>',
        bg='#f0fdf4', border='#bbf7d0'
      )}

      {_cta_button(f"{SITE_URL}/wallet", "View My Wallet &#128176;", color="#22c55e")}"""

    html = _email_shell("Commission Alert", "linear-gradient(135deg,#f0fdf4,#dcfce7)", hero, body)
    return send_email(
        to_email=to_email,
        subject=f"Cha-Ching! You received a {commission_type} commission on SuperAdPro!",
        html_body=html,
    )


# ═══════════════════════════════════════════════════════════════
# EMAIL 3: PASSWORD RESET
# ═══════════════════════════════════════════════════════════════
def send_password_reset_email(to_email: str, first_name: str, reset_url: str) -> bool:
    hero = f"""
      <div style="font-size:52px;line-height:1;margin-bottom:16px">&#128272;</div>
      <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:32px;font-weight:900;color:#1e293b;line-height:1.2">
        Reset your password, <span style="color:#0ea5e9">{first_name}</span>
      </p>
      <p style="margin:0;font-size:17px;color:#475569;line-height:1.7">
        We received a request to reset your SuperAdPro password. Click the button below — it's only valid for <strong>1 hour</strong>.
      </p>"""

    body = f"""
      <!-- Reset box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr><td style="border:2px dashed #e2e8f0;border-radius:14px;padding:30px;text-align:center">
          <p style="margin:0 0 20px;font-size:16px;color:#64748b">Click the button below to set your new password:</p>
          {_cta_button(reset_url, "Reset My Password &rarr;")}
          <p style="margin:16px 0 0;font-size:14px;color:#94a3b8">&#9201; This link expires in 1 hour</p>
        </td></tr>
      </table>

      <!-- Warning -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr><td style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:14px 18px">
          <p style="margin:0;font-size:15px;color:#713f12;line-height:1.6">
            &#128274; <strong>Didn't request this?</strong> You can safely ignore this email. Your password won't change unless you click the link above.
          </p>
        </td></tr>
      </table>

      <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.8">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="color:#0ea5e9;font-size:12px;word-break:break-all">{reset_url}</span>
      </p>"""

    html = _email_shell("Account Security", "#ffffff", hero, body)
    return send_email(
        to_email=to_email,
        subject="Reset your SuperAdPro password",
        html_body=html,
        text_body=f"Hi {first_name}, reset your SuperAdPro password: {reset_url} (expires in 1 hour)",
    )


# ═══════════════════════════════════════════════════════════════
# EMAIL 4: MEMBERSHIP ACTIVATED
# ═══════════════════════════════════════════════════════════════
def send_membership_activated_email(to_email: str, first_name: str) -> bool:
    hero = f"""
      <div style="font-size:52px;line-height:1;margin-bottom:16px">&#128640;</div>
      <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:32px;font-weight:900;color:#1e293b;line-height:1.2">
        You're officially a member, <span style="color:#7c3aed">{first_name}!</span>
      </p>
      <p style="margin:0;font-size:17px;color:#4c1d95;line-height:1.7">
        Your $20/month SuperAdPro membership is now active. Here's everything you've just unlocked:
      </p>"""

    body = f"""
      {_info_card(
        _checklist(
            'Watch &amp; Earn daily videos',
            'Earn 50% referral commissions ($10/month per member you refer)',
            'Access all 8 campaign tiers and ad tools',
            'Full AI marketing suite — 9 tools included',
            'Build unlimited funnel pages',
            'Withdraw earnings via USDT anytime',
        ),
        bg='#faf5ff', border='#ddd6fe'
      )}

      {_info_card(
        '<p style="margin:0;font-size:16px;color:#166534;text-align:center;line-height:1.6">&#128161; <strong>Pro tip:</strong> Refer just 2 members and your membership pays for itself every month.</p>',
        bg='#f0fdf4', border='#bbf7d0'
      )}

      {_cta_button(f"{SITE_URL}/dashboard", "Explore My Dashboard &rarr;", color="#7c3aed")}"""

    html = _email_shell("You're In!", "linear-gradient(135deg,#faf5ff,#ede9fe)", hero, body)
    return send_email(
        to_email=to_email,
        subject="Your SuperAdPro membership is active! 🚀",
        html_body=html,
        text_body=f"Hi {first_name}, your SuperAdPro membership is now active. Go to {SITE_URL}/dashboard",
    )


# ═══════════════════════════════════════════════════════════════
# EMAIL 5: RENEWAL REMINDER
# ═══════════════════════════════════════════════════════════════
def send_renewal_reminder_email(to_email: str, first_name: str, days_left: int) -> bool:
    days_word = f"{days_left} day{'s' if days_left != 1 else ''}"
    urgency_color = "#ef4444" if days_left <= 3 else "#f59e0b"

    hero = f"""
      <div style="font-size:52px;line-height:1;margin-bottom:16px">&#9200;</div>
      <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:32px;font-weight:900;color:#92400e;line-height:1.2">
        Your membership renews in <span style="color:{urgency_color}">{days_word}</span>
      </p>
      <p style="margin:0;font-size:17px;color:#78350f;line-height:1.7">
        Just a friendly heads up, {first_name} — your $20/month membership renewal is coming up. Make sure your wallet has enough to cover it!
      </p>"""

    body = f"""
      {_info_card(
        f'''<table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:16px;color:#475569">&#128197; Renewal date</td>
              <td align="right" style="font-size:16px;color:#1e293b;font-weight:700">in {days_word}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:16px;color:#475569">&#128179; Amount needed</td>
              <td align="right" style="font-size:16px;color:#1e293b;font-weight:700">$20 USDT</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:10px 0">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:16px;color:#475569">&#127974; Paid from</td>
              <td align="right" style="font-size:16px;color:#1e293b;font-weight:700">your wallet balance</td>
            </tr></table>
          </td></tr>
        </table>''',
        bg='#fffbeb', border='#fde68a'
      )}

      {_info_card(
        '<p style="margin:0;font-size:16px;color:#9a3412;line-height:1.6;text-align:center">&#9888;&#65039; If your wallet doesn\'t have enough funds, your commissions will pause until renewal is complete.</p>',
        bg='#fff7ed', border='#fed7aa'
      )}

      {_cta_button(f"{SITE_URL}/wallet", "Check My Wallet Balance", color=urgency_color)}"""

    html = _email_shell("Heads Up", "linear-gradient(135deg,#fffbeb,#fef3c7)", hero, body)
    return send_email(
        to_email=to_email,
        subject=f"Your SuperAdPro membership renews in {days_word}",
        html_body=html,
        text_body=f"Hi {first_name}, your SuperAdPro membership renews in {days_word}. Check your balance: {SITE_URL}/wallet",
    )
