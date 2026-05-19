# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Email Utilities
# Brevo HTTP API · Cobalt branding · AI Marketing & Advertising
# ═══════════════════════════════════════════════════════════════
import os, json, logging, urllib.request

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
FROM_EMAIL    = os.getenv("FROM_EMAIL", "noreply@superadpro.com")
SITE_URL      = os.getenv("SITE_URL", "https://www.superadpro.com")
FROM_DISPLAY  = "SuperAdPro"


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "",
               from_email: str = None, from_name: str = None,
               reply_to_email: str = None, reply_to_name: str = None,
               return_message_id: bool = False):
    """Send a transactional email via Brevo.

    By default uses the platform's noreply sender. For broadcasts that
    should appear FROM Steve personally, pass from_email='steve@superadpro.com'
    and from_name='Steve Lawson'. reply_to_email lets replies go to a
    different address than the sender.

    Returns True/False by default. Pass return_message_id=True to get
    a (success, brevo_message_id) tuple for audit logging.
    """
    if not BREVO_API_KEY:
        logger.error("BREVO_API_KEY not set")
        return (False, None) if return_message_id else False
    payload_dict = {
        "sender": {
            "name": from_name or FROM_DISPLAY,
            "email": from_email or FROM_EMAIL,
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": text_body or subject,
    }
    if reply_to_email:
        payload_dict["replyTo"] = {
            "email": reply_to_email,
            "name": reply_to_name or from_name or FROM_DISPLAY,
        }
    payload = json.dumps(payload_dict).encode("utf-8")
    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "accept": "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            ok = resp.status in (200, 201)
            msg_id = None
            if ok:
                try:
                    body = json.loads(resp.read().decode("utf-8"))
                    msg_id = body.get("messageId")
                except Exception:
                    pass
            logger.info(f"Email sent to {to_email}: {resp.status}")
            return (ok, msg_id) if return_message_id else ok
    except Exception as e:
        logger.error(f"Email failed to {to_email}: {e}")
        return (False, None) if return_message_id else False


# ═══════════════════════════════════════════════════════════════
# SHARED COMPONENTS — Cobalt branded
# ═══════════════════════════════════════════════════════════════

def _logo():
    return '<table cellpadding="0" cellspacing="0" align="center"><tr><td style="padding-right:10px;vertical-align:middle"><table cellpadding="0" cellspacing="0"><tr><td style="width:40px;height:40px;background:linear-gradient(135deg,#0ea5e9,#6366f1);border-radius:50%;text-align:center;vertical-align:middle"><span style="font-size:20px;color:#fff;font-weight:900;line-height:40px;display:block;padding-left:3px">&#9654;</span></td></tr></table></td><td style="vertical-align:middle"><span style="font-family:Arial,sans-serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.3px">Super</span><span style="font-family:Arial,sans-serif;font-size:22px;font-weight:900;color:#0ea5e9;letter-spacing:-0.3px">Ad</span><span style="font-family:Arial,sans-serif;font-size:22px;font-weight:900;color:#a78bfa;letter-spacing:-0.3px">Pro</span></td></tr></table>'

def _footer_logo():
    return '<table cellpadding="0" cellspacing="0" align="center" style="margin-bottom:10px"><tr><td style="padding-right:6px;vertical-align:middle"><span style="display:inline-block;width:22px;height:22px;background:#0ea5e9;border-radius:50%;text-align:center;line-height:22px;font-size:11px;color:#fff;font-weight:900;padding-left:2px">&#9654;</span></td><td style="vertical-align:middle"><span style="font-family:Arial,sans-serif;font-size:14px;font-weight:900;color:#64748b">Super</span><span style="font-family:Arial,sans-serif;font-size:14px;font-weight:900;color:#0ea5e9">Ad</span><span style="font-family:Arial,sans-serif;font-size:14px;font-weight:900;color:#a78bfa">Pro</span></td></tr></table>'

def _btn(url, label, color="#0ea5e9"):
    return f'<table cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 4px"><tr><td style="background:{color};border-radius:10px;text-align:center"><a href="{url}" style="display:inline-block;padding:16px 40px;font-family:Arial,sans-serif;font-size:15px;font-weight:800;color:#fff;text-decoration:none;letter-spacing:0.3px">{label}</a></td></tr></table>'

def _card(content, bg="#f8fafc", border="#e2e8f0"):
    return f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:{bg};border:1px solid {border};border-radius:14px;padding:24px">{content}</td></tr></table>'

def _check(*items):
    rows = ""
    for item in items:
        rows += f'<tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.04);vertical-align:top"><table cellpadding="0" cellspacing="0"><tr><td style="color:#22c55e;font-weight:700;font-size:18px;padding-right:12px;vertical-align:top;line-height:1.5">&#10003;</td><td style="font-size:15px;color:#334155;line-height:1.6">{item}</td></tr></table></td></tr>'
    return f'<table width="100%" cellpadding="0" cellspacing="0">{rows}</table>'


def _shell(tag, hero_bg, hero, body):
    return f'''<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#e8edf5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf5;padding:36px 16px"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">
<tr><td style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.04),0 20px 60px rgba(0,0,0,0.08)">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#0f1d3a,#172554);padding:22px 32px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td>{_logo()}</td><td align="right" style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3);vertical-align:middle">{tag}</td></tr></table></td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:{hero_bg};padding:36px 36px 32px">{hero}</td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 36px">{body}</td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:24px 36px;text-align:center">{_footer_logo()}<div style="font-size:12px;color:#94a3b8;line-height:1.8">AI Marketing &amp; Advertising Platform<br><a href="{SITE_URL}" style="color:#0ea5e9;text-decoration:none">www.superadpro.com</a></div></td></tr></table>
</td></tr></table></td></tr></table></body></html>'''


def _nurture_shell(tag, hero_bg, hero, body):
    return f'''<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#e8edf5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf5;padding:36px 16px"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">
<tr><td style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.04),0 20px 60px rgba(0,0,0,0.08)">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#0f1d3a,#172554);padding:22px 32px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td>{_logo()}</td><td align="right" style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3);vertical-align:middle">{tag}</td></tr></table></td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:{hero_bg};padding:36px 36px 32px">{hero}</td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 36px">{body}</td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:24px 36px;text-align:center">{_footer_logo()}<div style="font-size:12px;color:#94a3b8;line-height:1.8">AI Marketing &amp; Advertising Platform &middot; <a href="{SITE_URL}" style="color:#0ea5e9;text-decoration:none">superadpro.com</a><br>You're receiving this because you have a SuperAdPro account.<br><a href="{SITE_URL}/unsubscribe" style="color:#cbd5e1;text-decoration:none">Unsubscribe from these emails</a></div></td></tr></table>
</td></tr></table></td></tr></table></body></html>'''


# ═══════════════════════════════════════════════════════════════
# EMAIL 1: WELCOME
# ═══════════════════════════════════════════════════════════════
def send_welcome_email(to_email, first_name, username):
    hero = f'<div style="font-size:48px;margin-bottom:14px">&#127881;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">Welcome to SuperAdPro, <span style="color:#0ea5e9">{first_name}!</span></p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">Your account is live and ready. You\'re now part of a growing community of digital marketers using AI to build their business.</p>'
    creds = f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:linear-gradient(135deg,#172554,#1e3a8a);border-radius:14px;padding:22px 26px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.15)"><table width="100%"><tr><td style="font-size:14px;color:rgba(255,255,255,0.6)">Username</td><td align="right" style="font-size:14px;color:#fff;font-weight:700">{username}</td></tr></table></td></tr><tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.15)"><table width="100%"><tr><td style="font-size:14px;color:rgba(255,255,255,0.6)">Status</td><td align="right" style="font-size:14px;color:#4ade80;font-weight:700">&#10003; Active</td></tr></table></td></tr><tr><td style="padding:9px 0"><table width="100%"><tr><td style="font-size:14px;color:rgba(255,255,255,0.6)">Dashboard</td><td align="right" style="font-size:13px;color:#fff;font-weight:600">superadpro.com/dashboard</td></tr></table></td></tr></table></td></tr></table>'
    body = creds + _card('<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0284c7;margin:0 0 14px">What you can do right now</p>' + _check('Share your referral link and earn $10/month for every Partner you refer', 'Create AI videos, images, and music in the Creative Studio', 'Build your personal LinkHub page and share it everywhere', 'Watch daily videos to qualify for campaign commissions'), bg='#f0f9ff', border='#bae6fd') + _btn(f"{SITE_URL}/dashboard", "Go to my dashboard &rarr;")
    return send_email(to_email, f"Welcome to SuperAdPro, {first_name}!", _shell("Welcome", "linear-gradient(135deg,#f0f9ff,#e0f2fe)", hero, body), f"Welcome to SuperAdPro, {first_name}! Username: {username}. Login: {SITE_URL}/dashboard")


# ═══════════════════════════════════════════════════════════════
# EMAIL 2: COMMISSION EARNED
# ═══════════════════════════════════════════════════════════════
def send_commission_email(to_email, first_name, commission_type="Affiliate", from_username=""):
    fr = f" &middot; from <strong>{from_username}</strong>" if from_username else ""
    hero = f'<div style="font-size:48px;margin-bottom:14px">&#128176;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#15803d;line-height:1.2">Cha-Ching, <span style="color:#0ea5e9">{first_name}!</span></p><p style="margin:0;font-size:15px;color:#166534;line-height:1.7">Money just landed in your SuperAdPro wallet.</p>'
    body = f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:14px;padding:28px;text-align:center"><p style="margin:0 0 6px;font-size:20px;font-weight:900;color:#15803d">Commission Received!</p><p style="margin:0;font-size:14px;color:#16a34a;font-weight:600">{commission_type}{fr}</p></td></tr></table>' + _card('<p style="margin:0;font-size:15px;color:#166534;line-height:1.7">Your earnings are building up in your wallet. Once you hit the <strong>$10 minimum</strong>, you can withdraw to your USDT wallet anytime.</p>', bg='#f0fdf4', border='#bbf7d0') + _btn(f"{SITE_URL}/wallet", "View my wallet &rarr;", "#22c55e")
    return send_email(to_email, "Cha-Ching! You just earned a commission on SuperAdPro!", _shell("Earnings", "linear-gradient(135deg,#f0fdf4,#dcfce7)", hero, body))


# ═══════════════════════════════════════════════════════════════
# EMAIL 3: PASSWORD RESET
# ═══════════════════════════════════════════════════════════════
def send_password_reset_email(to_email, first_name, reset_url):
    hero = f'<div style="font-size:48px;margin-bottom:14px">&#128272;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">Reset your password, <span style="color:#0ea5e9">{first_name}</span></p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">We received a request to reset your SuperAdPro password. Click the button below — it\'s only valid for <strong>1 hour</strong>.</p>'
    body = f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="border:2px dashed #e2e8f0;border-radius:14px;padding:28px;text-align:center"><p style="margin:0 0 18px;font-size:15px;color:#64748b">Click the button below to set your new password:</p>{_btn(reset_url, "Reset my password &rarr;")}<p style="margin:16px 0 0;font-size:13px;color:#94a3b8">This link expires in 1 hour</p></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:14px 18px"><p style="margin:0;font-size:14px;color:#713f12;line-height:1.6"><strong>Didn\'t request this?</strong> You can safely ignore this email. Your password won\'t change unless you click the link above.</p></td></tr></table><p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.8">If the button doesn\'t work, copy and paste this link:<br><span style="color:#0ea5e9;font-size:11px;word-break:break-all">{reset_url}</span></p>'
    return send_email(to_email, "Reset your SuperAdPro password", _shell("Security", "#ffffff", hero, body), f"Hi {first_name}, reset your SuperAdPro password: {reset_url} (expires in 1 hour)")


# ═══════════════════════════════════════════════════════════════
# EMAIL 4: MEMBERSHIP ACTIVATED
# ═══════════════════════════════════════════════════════════════
def send_membership_activated_email(to_email, first_name, billing="monthly",
                                    is_upgrade=False, tier="partner",
                                    is_founding_member=False,
                                    founding_spot_number=None):
    """Send the "your membership is active" email.

    Under flat-pricing (15 May 2026) there's a single paid tier called
    'Partner'. is_founding_member=True means the member claimed one of
    the first 100 founding spots and gets a celebratory variant that
    emphasises the $15/mo lifetime lock.

    Legacy parameters kept for caller compatibility:
      - is_upgrade: no-op now. Pro upgrades retired (/api/upgrade-to-pro
        returns 410 Gone). Callers may still pass it; we ignore it.
      - tier: also no-op (everyone paid is 'partner'). Kept so the
        call site at app/main.py:7058 doesn't break.

    The Pro-upgrade email variant that used to live here was deleted
    on 16 May 2026 because no live code path can trigger it anymore.
    """
    # ── Founding Partner variant ──
    if is_founding_member:
        spot_line = (
            f" — you're Founding Partner #{founding_spot_number} of 100"
            if founding_spot_number else " — you're one of the first 100 Founding Partners"
        )
        hero = (
            f'<div style="font-size:48px;margin-bottom:14px">&#11088;</div>'
            f'<p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">'
            f"Welcome, Founding Partner <span style=\"color:#d97706\">{first_name}!</span></p>"
            f'<p style="margin:0;font-size:15px;color:#78350f;line-height:1.7">'
            f"Your SuperAdPro membership is active{spot_line}. "
            f"You're locked in at $15/month for life — that price never changes for you, "
            f"no matter what we charge new members down the line.</p>"
        )
        body = _card(
            '<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#d97706;margin:0 0 14px">What being a Founding Partner means</p>' +
            _check(
                '$15/month price locked for life — never increases for you',
                'Founding Partner badge displayed across the platform',
                'Full SuperAdPro platform — Creative Studio, Brand Posters, MyLeads, all AI tools',
                'Earn $10/month for every Partner you refer — recurring while they stay active',
                'Build all four income streams: Membership, Profit Grid, Profit Nexus, Course Academy',
            ),
            bg='#fffbeb', border='#fde68a',
        ) + _card(
            '<p style="margin:0;font-size:15px;color:#166534;text-align:center;line-height:1.7">'
            '<strong>The math is simple:</strong> 2 Partner referrals at $10/month each '
            'covers your $15/month founding membership, with $5/month profit. After that, '
            'every additional referral is pure income.</p>',
            bg='#f0fdf4', border='#bbf7d0',
        ) + _btn(f"{SITE_URL}/dashboard", "Go to my dashboard &rarr;", "#d97706")
        return send_email(
            to_email,
            f"You're a Founding Partner, {first_name}! \u2b50",
            _shell("Founding Partner", "linear-gradient(135deg,#fffbeb,#fef3c7)", hero, body),
            f"Hi {first_name}, your SuperAdPro Founding Partner membership is active. "
            f"You're locked in at $15/month for life. Go to {SITE_URL}/dashboard",
        )

    # ── Standard Partner activation ──
    hero = (
        f'<div style="font-size:48px;margin-bottom:14px">&#128640;</div>'
        f'<p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">'
        f"You're officially a Partner, <span style=\"color:#0ea5e9\">{first_name}!</span></p>"
        f'<p style="margin:0;font-size:15px;color:#1e40af;line-height:1.7">'
        f"Your SuperAdPro membership is now active. Here's everything you've unlocked:</p>"
    )
    body = _card(
        _check(
            'Earn $10/month for every Partner you refer — recurring while they stay active',
            'Full Creative Studio — AI video, images, music, voiceover, and lip sync',
            'Brand Poster Generator with templates for every niche',
            'MyLeads CRM, LinkHub, SuperPages, and all platform tools',
            'Watch daily campaign videos to qualify for grid commissions',
            'Withdraw earnings via USDT anytime from $10',
        ),
        bg='#f0f9ff', border='#bae6fd',
    ) + _card(
        '<p style="margin:0;font-size:15px;color:#166534;text-align:center;line-height:1.6">'
        '<strong>Pro tip:</strong> Refer 2 Partners and your $20/month membership pays for itself. '
        'Every additional referral is pure income.</p>',
        bg='#f0fdf4', border='#bbf7d0',
    )
    if billing == "monthly":
        body += _card(
            '<p style="margin:0;font-size:14px;color:#1e40af;text-align:center;line-height:1.6">'
            f'&#128176; <strong>Prefer to pay yearly?</strong> Save 17% by switching to annual billing — '
            f'$200/year instead of $240. Switch anytime from your '
            f'<a href="{SITE_URL}/upgrade" style="color:#2563eb;font-weight:700;text-decoration:underline">account page</a>.</p>',
            bg='#eff6ff', border='#bfdbfe',
        )
    body += _btn(f"{SITE_URL}/dashboard", "Explore my dashboard &rarr;", "#0ea5e9")
    return send_email(
        to_email,
        f"Your SuperAdPro Partner membership is active!",
        _shell("You're in!", "linear-gradient(135deg,#f0f9ff,#e0f2fe)", hero, body),
        f"Hi {first_name}, your SuperAdPro Partner membership is now active. Go to {SITE_URL}/dashboard",
    )


# ═══════════════════════════════════════════════════════════════
# EMAIL 5: RENEWAL REMINDER
# ═══════════════════════════════════════════════════════════════
def send_renewal_reminder_email(to_email, first_name, days_left):
    dw = f"{days_left} day{'s' if days_left != 1 else ''}"
    uc = "#ef4444" if days_left <= 3 else "#f59e0b"
    hero = f'<div style="font-size:48px;margin-bottom:14px">&#9200;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#92400e;line-height:1.2">Your membership renews in <span style="color:{uc}">{dw}</span></p><p style="margin:0;font-size:15px;color:#78350f;line-height:1.7">Just a friendly heads up, {first_name} — make sure your wallet has enough to cover your renewal.</p>'
    det = f'<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.06)"><table width="100%"><tr><td style="font-size:15px;color:#475569">Renewal date</td><td align="right" style="font-size:15px;color:#0f172a;font-weight:700">in {dw}</td></tr></table></td></tr><tr><td style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.06)"><table width="100%"><tr><td style="font-size:15px;color:#475569">Amount needed</td><td align="right" style="font-size:15px;color:#0f172a;font-weight:700">$20 USDT</td></tr></table></td></tr><tr><td style="padding:10px 0"><table width="100%"><tr><td style="font-size:15px;color:#475569">Paid from</td><td align="right" style="font-size:15px;color:#0f172a;font-weight:700">your wallet balance</td></tr></table></td></tr></table>'
    body = _card(det, bg='#fffbeb', border='#fde68a') + _card('<p style="margin:0;font-size:14px;color:#9a3412;line-height:1.6;text-align:center">If your wallet doesn\'t have enough funds, your commissions will pause until renewal is complete.</p>', bg='#fff7ed', border='#fed7aa') + _btn(f"{SITE_URL}/wallet", "Check my wallet balance", uc)
    return send_email(to_email, f"Your SuperAdPro membership renews in {dw}", _shell("Renewal", "linear-gradient(135deg,#fffbeb,#fef3c7)", hero, body), f"Hi {first_name}, your membership renews in {dw}. Check balance: {SITE_URL}/wallet")


# ═══════════════════════════════════════════════════════════════
# NURTURE SEQUENCE — 5 emails for members who haven't activated
# ═══════════════════════════════════════════════════════════════

def send_nurture_email(to_email, first_name, email_num):
    a = f"{SITE_URL}/pay-membership"

    if email_num == 1:
        hero = f'<div style="font-size:48px;margin-bottom:14px">&#128075;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">Hey {first_name}, your account is ready &mdash; but it\'s not activated yet</p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">You created your SuperAdPro account but haven\'t activated your membership. Here\'s what\'s waiting &mdash; including the founding partner offer that won\'t be around forever.</p>'
        body = _card(
            '<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#d97706;margin:0 0 10px">&#11088; Founding Partner offer &mdash; limited to the first 100</p>'
            '<p style="margin:0;font-size:14px;color:#78350f;line-height:1.6">Activate now and lock in <strong>$15/month for life</strong> as a Founding Partner. That price never goes up, no matter what we charge new members later. Once the 100 spots are filled, the offer is gone permanently.</p>',
            bg='#fffbeb', border='#fde68a',
        ) + _card(
            '<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0284c7;margin:0 0 14px">What activating unlocks</p>' +
            _check(
                'Earn $10/month for every Partner you refer &mdash; recurring while they remain active',
                'Full Creative Studio &mdash; AI video, images, music, voiceover, lip sync',
                'Brand Poster Generator + MyLeads CRM + SuperPages',
                'Access the 8-level Profit Grid and earn from your whole network',
                'Build all four income streams: Membership, Grid, Nexus, Course Academy',
            ),
            bg='#f0f9ff', border='#bae6fd',
        ) + _btn(a, "Claim my Founding Partner spot &rarr;", "#d97706") + '<p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:12px">$15/month locked for life &middot; Cancel anytime</p>'
        subj = f"You're in &mdash; but you haven't claimed your founding spot yet, {first_name}"
        hbg = "linear-gradient(135deg,#fffbeb,#fef3c7)"

    elif email_num == 2:
        hero = f'<div style="font-size:48px;margin-bottom:14px">&#128176;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#4c1d95;line-height:1.2">Let\'s talk about what $15/month actually buys you</p><p style="margin:0;font-size:15px;color:#6d28d9;line-height:1.7">Most subscriptions cost $15/month and give you software. SuperAdPro gives you software <strong>and</strong> an income &mdash; and Founding Partners lock that price in for life.</p>'
        stats = '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px"><tr><td width="32%" style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:18px;text-align:center;vertical-align:top"><p style="font-size:26px;font-weight:900;color:#d97706;margin:0 0 4px">$15</p><p style="font-size:12px;color:#64748b;margin:0;line-height:1.4">Founding Partner<br>per month, locked</p></td><td width="2%"></td><td width="32%" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:18px;text-align:center;vertical-align:top"><p style="font-size:26px;font-weight:900;color:#0ea5e9;margin:0 0 4px">$10</p><p style="font-size:12px;color:#64748b;margin:0;line-height:1.4">earned per referral<br>per month</p></td><td width="2%"></td><td width="32%" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:18px;text-align:center;vertical-align:top"><p style="font-size:26px;font-weight:900;color:#0ea5e9;margin:0 0 4px">8</p><p style="font-size:12px;color:#64748b;margin:0;line-height:1.4">Profit Grid<br>levels deep</p></td></tr></table>'
        comp = '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px"><tr><td width="49%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;vertical-align:top"><p style="font-size:13px;font-weight:800;color:#94a3b8;margin:0 0 12px">&#10060; Free account</p><p style="font-size:14px;color:#64748b;margin:4px 0;line-height:1.5">No commission earnings</p><p style="font-size:14px;color:#64748b;margin:4px 0;line-height:1.5">No grid access</p><p style="font-size:14px;color:#64748b;margin:4px 0;line-height:1.5">Limited tools</p></td><td width="2%"></td><td width="49%" style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:18px;vertical-align:top"><p style="font-size:13px;font-weight:800;color:#16a34a;margin:0 0 12px">&#10003; Active Partner</p><p style="font-size:14px;color:#166534;margin:4px 0;line-height:1.5">$10/month per referral, recurring</p><p style="font-size:14px;color:#166534;margin:4px 0;line-height:1.5">Full 8-level Profit Grid</p><p style="font-size:14px;color:#166534;margin:4px 0;line-height:1.5">Creative Studio + all AI tools</p></td></tr></table>'
        body = stats + comp + _card('<p style="margin:0;font-size:15px;color:#4c1d95;line-height:1.7"><strong>Here\'s the thing:</strong> Your referral link is already live. Every person who visits it and joins is in your network &mdash; but you won\'t earn a single dollar unless your membership is active. And if you activate before the first 100 founding spots are gone, you lock in $15/month for life.</p>', bg='#faf5ff', border='#ddd6fe') + _btn(a, "Claim my Founding Partner spot &rarr;", "#d97706")
        subj = f"Here's what $15/month locked for life actually gets you"
        hbg = "linear-gradient(135deg,#fffbeb,#fef3c7)"

    elif email_num == 3:
        hero = f'<div style="font-size:48px;margin-bottom:14px">&#129327;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#15803d;line-height:1.2">What if your membership paid for itself?</p><p style="margin:0;font-size:15px;color:#166534;line-height:1.7">It can. Here\'s the exact math at the Founding Partner price &mdash; no fluff, no hype.</p>'
        calc = '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:24px"><tr><td><p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#15803d;margin:0 0 16px">The self-funding formula &mdash; Founding Partner price</p><table width="100%" cellpadding="0" cellspacing="0"><tr style="border-bottom:1px solid rgba(0,0,0,0.07)"><td style="padding:10px 0;font-size:15px;color:#334155">Your monthly Founding Partner cost</td><td style="padding:10px 0;font-size:15px;font-weight:700;color:#0f172a;text-align:right">&minus; $15.00</td></tr><tr style="border-bottom:1px solid rgba(0,0,0,0.07)"><td style="padding:10px 0;font-size:15px;color:#334155">1 Partner referral &times; $10/month</td><td style="padding:10px 0;font-size:15px;font-weight:700;color:#16a34a;text-align:right">+ $10.00</td></tr><tr style="border-bottom:1px solid rgba(0,0,0,0.07)"><td style="padding:10px 0;font-size:15px;color:#334155">2 Partner referrals &times; $10/month</td><td style="padding:10px 0;font-size:15px;font-weight:700;color:#16a34a;text-align:right">+ $20.00</td></tr><tr><td style="padding:12px 0;font-size:16px;font-weight:800;color:#0f172a">Net result with just 2 referrals</td><td style="padding:12px 0;font-size:18px;font-weight:900;color:#15803d;text-align:right">+ $5.00 profit &#127881;</td></tr></table></td></tr></table>'
        body = calc + _card('<p style="margin:0;font-size:15px;color:#0284c7;line-height:1.7"><strong>And it compounds:</strong> 5 referrals = $35/month profit. 10 referrals = $85/month. Plus you earn from their networks through the 8-level Profit Grid, the Nexus matrix, and Course Academy pass-ups. The Founding Partner price stays locked at $15/month forever.</p>', bg='#f0f9ff', border='#bae6fd') + _btn(a, "Claim my founding spot &amp; start earning &rarr;", "#d97706")
        subj = f"2 referrals = $5/month profit at the founding price, {first_name}"
        hbg = "linear-gradient(135deg,#f0fdf4,#dcfce7)"

    elif email_num == 4:
        hero = f'<div style="font-size:48px;margin-bottom:14px">&#128064;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#92400e;line-height:1.2">You\'re missing out on tools <em>and</em> income, {first_name}</p><p style="margin:0;font-size:15px;color:#78350f;line-height:1.7">Every day without an active membership is a day you\'re not earning from your network or using the AI tools that come with it. And every day, more Founding Partner spots get claimed.</p>'
        body = _card(
            '<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#92400e;margin:0 0 14px">What you\'re missing right now</p>' +
            _check(
                'Recurring $10/month commissions from every Partner you refer',
                'Creative Studio &mdash; AI video, image, music, voiceover, lip sync',
                'Brand Poster Generator + MyLeads CRM + SuperPages',
                'Profit Grid earnings from people joining your network',
                'Founding Partner $15/month price &mdash; locked for life if you act now',
            ),
            bg='#fffbeb', border='#fde68a',
        ) + _card(
            '<p style="margin:0;font-size:15px;color:#9a3412;line-height:1.7"><strong>Timing matters.</strong> The earlier you activate, the stronger your position in the grid &mdash; and the more Founding Partner spots are still available. Once 100 are claimed, the $15/month locked price is gone for good.</p>',
            bg='#fff7ed', border='#fed7aa',
        ) + _card(
            '<p style="margin:0;font-size:15px;color:#166534;line-height:1.7">&#10003; <strong>The good news:</strong> Your account is still here, your referral link is still live, and your founding spot is still available. One click and you\'re in.</p>',
            bg='#f0fdf4', border='#bbf7d0',
        ) + _btn(a, "Claim my founding spot now &rarr;", "#d97706") + '<p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:12px">$15/month locked for life &middot; Cancel anytime &middot; Earnings depend on your referrals and activity</p>'
        subj = f"You're missing out on tools and income, {first_name}"
        hbg = "linear-gradient(135deg,#fffbeb,#fef3c7)"

    else:
        hero = f'<div style="font-size:48px;margin-bottom:14px">&#128680;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#991b1b;line-height:1.2">This is our last nudge, {first_name}</p><p style="margin:0;font-size:15px;color:#7f1d1d;line-height:1.7">This is the final email in this sequence. After this, we\'ll stop &mdash; but your account stays open and your referral link stays live.</p>'
        body = _card(
            '<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#64748b;margin:0 0 14px">A quick summary of what\'s waiting</p>' +
            _check(
                '$10/month for every Partner you refer &mdash; recurring while they stay active',
                '8-level Profit Grid earning from your whole network',
                'Creative Studio &mdash; AI video, images, music, voiceover, lip sync',
                'Brand Poster Generator, MyLeads CRM, SuperPages, LinkHub',
                'Withdraw earnings in USDT anytime from $10',
                'Founding Partner $15/month price &mdash; locked for life if claimed before 100 spots are filled',
            ),
        ) + _btn(a, "Claim my Founding Partner spot &mdash; $15/month locked", "#d97706") + '<p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:16px;line-height:1.8">Not interested? No hard feelings &mdash; your free account stays open.<br>We won\'t send any more activation emails after this one.</p>'
        subj = f"This is our last email to you, {first_name} &mdash; we mean it"
        hbg = "linear-gradient(135deg,#fef2f2,#fee2e2)"

    return send_email(to_email, subj, _nurture_shell(f"Email {email_num} of 5", hbg, hero, body))


# ═══════════════════════════════════════════════════════════════
# FOUNDING PARTNER BROADCAST — 16 May 2026
# ═══════════════════════════════════════════════════════════════
def render_founder_offer_email(first_name: str, spots_remaining: int = 82) -> dict:
    """Render the Founding Partner pricing broadcast for one recipient.

    Returns {'subject', 'html', 'text'} so callers can either send
    immediately or preview the rendered output.

    spots_remaining is interpolated into the body — read the live count
    from /api/founding-members/status at send time so the email is
    accurate at the moment of delivery.

    Tone: Steve-personal, founder voice, plain numbers, no hype.
    From: steve@superadpro.com (not noreply) so replies go to Steve.
    """
    safe_name = (first_name or "there").strip() or "there"
    cta = f"{SITE_URL}/upgrade"

    # Subject line — fixed per Steve's call on the draft
    subject = f"{spots_remaining} founding member spots available"

    # Hero section — same shell pattern as other emails
    hero = (
        f'<p style="margin:0 0 10px;font-size:26px;font-weight:900;color:#0f172a;line-height:1.3">'
        f"Hi {safe_name},</p>"
        f'<p style="margin:0;font-size:15px;color:#334155;line-height:1.7">'
        f"Steve here &mdash; founder of SuperAdPro. I'm writing because I made a change to the platform "
        f"this week that affects you directly, and I'd rather tell you about it personally than let you "
        f"find out by accident.</p>"
    )

    # Body sections — built as cards so they render reliably across mail clients
    section_short = _card(
        '<p style="margin:0 0 12px;font-size:15px;color:#0f172a;line-height:1.7"><strong>The short version:</strong> '
        'I scrapped the old Basic and Pro tier structure. From now on there\'s just one paid membership, '
        'called <strong>Partner</strong>, at $20/month. Everyone gets the full platform &mdash; Creative Studio, '
        'the Brand Poster Generator, MyLeads CRM, the AI tools, the lot. No upgrade prompts. No locked features. '
        'One price, everything included.</p>',
        bg='#f8fafc', border='#e2e8f0',
    )

    section_founding_intro = (
        '<p style="margin:24px 0 12px;font-size:17px;font-weight:800;color:#0f172a">'
        'Now here\'s the bit that matters for you specifically.</p>'
    )

    section_founding_offer = _card(
        '<p style="margin:0 0 12px;font-size:15px;color:#78350f;line-height:1.7">'
        'I\'ve put aside the first 100 paid memberships as <strong>Founding Partner spots</strong> at '
        '<strong>$15/month &mdash; locked for life</strong>. That means whatever I charge new members next year '
        'or the year after, your price never changes. Ever.</p>'
        '<p style="margin:0;font-size:15px;color:#78350f;line-height:1.7">'
        'Founding Partners also get a badge on their profile, early access to anything new I build, and the '
        'recognition that you backed this platform when it was just starting out.</p>',
        bg='#fffbeb', border='#fde68a',
    )

    section_spots_left = (
        '<div style="text-align:center;margin:24px 0">'
        f'<p style="margin:0;font-size:28px;font-weight:900;color:#d97706;line-height:1.2">'
        f'As of right now, there are {spots_remaining} spots left.</p>'
        '</div>'
    )

    section_no_pressure = (
        '<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7">'
        'You don\'t have to take one. Your free account stays open either way. But if you\'ve been on the '
        'fence, this is the cheapest the membership will ever be, and the offer disappears the moment '
        'spot #100 is claimed.</p>'
    )

    section_math = _card(
        '<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#15803d;margin:0 0 14px">'
        'Quick math at $15/month</p>'
        + _check(
            'Refer 1 Partner &rarr; you earn $10/month back',
            'Refer 2 Partners &rarr; membership pays for itself with $5/month profit',
            'Refer 5 Partners &rarr; $35/month profit',
            'Plus you\'re earning from your whole network through the Profit Grid, the Nexus matrix, and the Course Academy',
        ),
        bg='#f0fdf4', border='#bbf7d0',
    )

    section_cta = _btn(cta, "Claim my Founding Partner spot &rarr;", "#d97706")

    section_reply = (
        '<p style="margin:24px 0 0;font-size:14px;color:#475569;line-height:1.7">'
        'If you\'ve got questions or want to push back on the pricing change, just reply to this email. '
        'It comes straight to me.</p>'
        '<p style="margin:14px 0 0;font-size:14px;color:#475569;line-height:1.7">'
        'Either way &mdash; thanks for being here.</p>'
        '<p style="margin:18px 0 4px;font-size:15px;font-weight:700;color:#0f172a">Steve</p>'
        '<p style="margin:0;font-size:13px;color:#64748b">Founder, SuperAdPro</p>'
    )

    body = (
        section_short
        + section_founding_intro
        + section_founding_offer
        + section_spots_left
        + section_no_pressure
        + section_math
        + section_cta
        + section_reply
    )

    html = _shell(
        "Quick update from Steve",
        "linear-gradient(135deg,#ffffff,#f1f5f9)",
        hero,
        body,
    )

    # Plain-text fallback for mail clients that don't render HTML
    text = (
        f"Hi {safe_name},\n\n"
        "Steve here — founder of SuperAdPro. I'm writing because I made a change to the platform "
        "this week that affects you directly.\n\n"
        "The short version: I scrapped the Basic and Pro tier structure. From now on there's just "
        "one paid membership, called Partner, at $20/month. Everyone gets the full platform.\n\n"
        f"Now here's the bit that matters for you: I've put aside the first 100 paid memberships as "
        f"Founding Partner spots at $15/month — locked for life. As of right now, there are "
        f"{spots_remaining} spots left.\n\n"
        "You don't have to take one. Your free account stays open either way. But this is the "
        "cheapest the membership will ever be, and the offer disappears the moment spot #100 is claimed.\n\n"
        "Quick math at $15/month:\n"
        "  - Refer 1 Partner → you earn $10/month back\n"
        "  - Refer 2 Partners → membership pays for itself with $5/month profit\n"
        "  - Refer 5 Partners → $35/month profit\n"
        "  - Plus you're earning from your whole network through Profit Grid, Nexus matrix, Course Academy\n\n"
        f"Claim a spot: {cta}\n\n"
        "If you've got questions or want to push back on the pricing change, just reply to this email. "
        "It comes straight to me.\n\n"
        "Either way — thanks for being here.\n\n"
        "Steve\n"
        "Founder, SuperAdPro\n"
    )

    return {"subject": subject, "html": html, "text": text}


def send_founder_offer_broadcast_one(to_email: str, first_name: str,
                                     spots_remaining: int = 82):
    """Send the founder-offer broadcast to a single recipient.

    Used by the admin batch endpoint. Returns (success, brevo_message_id).
    From address is steve@superadpro.com so replies route to Steve's inbox.
    """
    rendered = render_founder_offer_email(first_name, spots_remaining)
    return send_email(
        to_email,
        rendered["subject"],
        rendered["html"],
        rendered["text"],
        from_email="steve@superadpro.com",
        from_name="Steve Lawson",
        reply_to_email="steve@superadpro.com",
        reply_to_name="Steve Lawson",
        return_message_id=True,
    )


def render_reengagement_email(first_name: str, spots_remaining: int = 82) -> dict:
    """Render the soft-tone re-engagement broadcast for recent inactive signups.

    Returns {'subject', 'html', 'text'}. Sent on 16 May 2026 to the cohort
    of users who signed up in the last 72h but never activated. Tone is
    deliberately soft (no mention of the checkout bug, no urgency language
    beyond the spot count) — Steve picked 'general / not specific about
    technical issues' for this audience.

    spots_remaining is interpolated live at send time via the same source
    used by render_founder_offer_email (SELECT COUNT(*) WHERE
    is_founding_member = TRUE; 100 - that). Keeps the spot number accurate
    at moment of delivery.

    From: steve@superadpro.com (not noreply) so replies route to Steve.
    """
    safe_name = (first_name or "there").strip() or "there"
    cta = f"{SITE_URL}/upgrade"

    subject = "Quick note from Steve — your SuperAdPro account is ready when you are"

    hero = (
        f'<p style="margin:0 0 10px;font-size:26px;font-weight:900;color:#0f172a;line-height:1.3">'
        f"Hi {safe_name},</p>"
        f'<p style="margin:0;font-size:15px;color:#334155;line-height:1.7">'
        f"Steve here, founder of SuperAdPro. You created an account with us in the last few days "
        f"and I wanted to drop you a personal note rather than letting the welcome email do all the work."
        f"</p>"
    )

    section_no_pressure_open = (
        '<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7">'
        "If life got in the way, that's completely fine. Your free account is still active right "
        "now, exactly as you left it."
        "</p>"
    )

    section_founding_intro = (
        '<p style="margin:24px 0 12px;font-size:17px;font-weight:800;color:#0f172a">'
        "One small thing worth knowing before you decide either way."
        "</p>"
    )

    section_founding_offer = _card(
        '<p style="margin:0 0 12px;font-size:15px;color:#78350f;line-height:1.7">'
        "I set aside the first 100 paid memberships as <strong>Founding Partner</strong> spots. "
        "The price is <strong>$15/month locked for life</strong> instead of the standard $20/month "
        "&mdash; whatever I charge new members next year or the year after, a Founding Partner's "
        "price never changes."
        "</p>",
        bg='#fffbeb', border='#fde68a',
    )

    section_spots_left = (
        '<div style="text-align:center;margin:24px 0">'
        f'<p style="margin:0;font-size:28px;font-weight:900;color:#d97706;line-height:1.2">'
        f'As of right now, there are {spots_remaining} spots left.'
        f'</p>'
        '</div>'
    )

    section_no_pressure_close = (
        '<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7">'
        "No pressure on it. Your free account stays open whether or not you take one. But if "
        "you'd been weighing it up, this is the cheapest the membership will ever be, and the "
        "offer goes away the moment spot #100 is claimed."
        "</p>"
    )

    section_cta = _btn(cta, "Visit your account &rarr;", "#0ea5e9")

    section_reply = (
        '<p style="margin:24px 0 0;font-size:14px;color:#475569;line-height:1.7">'
        "Either way &mdash; thanks for signing up, and welcome."
        "</p>"
        '<p style="margin:14px 0 0;font-size:14px;color:#475569;line-height:1.7">'
        "If you've got any questions or want to push back on anything, just reply to this email. "
        "It comes straight to me."
        "</p>"
        '<p style="margin:18px 0 4px;font-size:15px;font-weight:700;color:#0f172a">Steve</p>'
        '<p style="margin:0;font-size:13px;color:#64748b">Founder, SuperAdPro</p>'
    )

    body = (
        section_no_pressure_open
        + section_founding_intro
        + section_founding_offer
        + section_spots_left
        + section_no_pressure_close
        + section_cta
        + section_reply
    )

    html = _shell(
        "A note from Steve",
        "linear-gradient(135deg,#ffffff,#f1f5f9)",
        hero,
        body,
    )

    text = (
        f"Hi {safe_name},\n\n"
        "Steve here, founder of SuperAdPro. You created an account with us in the last few days "
        "and I wanted to drop you a personal note rather than letting the welcome email do all the work.\n\n"
        "If life got in the way, that's completely fine. Your free account is still active right "
        "now, exactly as you left it.\n\n"
        "One small thing worth knowing before you decide either way: I set aside the first 100 "
        "paid memberships as Founding Partner spots. The price is $15/month locked for life instead "
        "of the standard $20/month — whatever I charge new members next year or the year after, a "
        "Founding Partner's price never changes.\n\n"
        f"As of right now, there are {spots_remaining} spots left.\n\n"
        "No pressure on it. Your free account stays open whether or not you take one. But if you'd "
        "been weighing it up, this is the cheapest the membership will ever be, and the offer goes "
        "away the moment spot #100 is claimed.\n\n"
        f"Visit your account: {cta}\n\n"
        "Either way — thanks for signing up, and welcome.\n\n"
        "If you've got any questions or want to push back on anything, just reply to this email. "
        "It comes straight to me.\n\n"
        "Steve\n"
        "Founder, SuperAdPro\n"
    )

    return {"subject": subject, "html": html, "text": text}


def send_reengagement_broadcast_one(to_email: str, first_name: str,
                                    spots_remaining: int = 82):
    """Send the re-engagement broadcast to a single recipient.

    Wrapper around send_email that matches the founder_offer broadcast
    sender pattern: from steve@superadpro.com, reply-to steve. Returns
    (success, brevo_message_id) for the admin batch endpoint to log.
    """
    rendered = render_reengagement_email(first_name, spots_remaining)
    return send_email(
        to_email,
        rendered["subject"],
        rendered["html"],
        rendered["text"],
        from_email="steve@superadpro.com",
        from_name="Steve Lawson",
        reply_to_email="steve@superadpro.com",
        reply_to_name="Steve Lawson",
        return_message_id=True,
    )
