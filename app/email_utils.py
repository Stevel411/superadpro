# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Email Utilities
# Brevo HTTP API · Cobalt branding · AI Marketing & Advertising
# ═══════════════════════════════════════════════════════════════
import os, json, logging, urllib.request
from app.brand_config import BRAND_NAME, SITE_URL as _BRAND_SITE_URL, FROM_EMAIL as _BRAND_FROM_EMAIL

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
FROM_EMAIL    = _BRAND_FROM_EMAIL
SITE_URL      = _BRAND_SITE_URL
FROM_DISPLAY  = BRAND_NAME


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "",
               from_email: str = None, from_name: str = None,
               reply_to_email: str = None, reply_to_name: str = None,
               return_message_id: bool = False,
               category: str = "transactional", list_unsubscribe: str = None,
               member_bulk: bool = False):
    """Send a transactional email via Brevo.

    By default uses the platform's noreply sender. For broadcasts that
    should appear FROM Steve personally, pass from_email=FROM_EMAIL
    and from_name='Steve Lawson'. reply_to_email lets replies go to a
    different address than the sender.

    category: 'transactional' (default) or 'marketing'. Marketing sends are
    additionally blocked for unsubscribed addresses. bounce/complaint/manual
    suppression blocks both categories.

    list_unsubscribe: URL for the List-Unsubscribe / one-click header. Pass on
    marketing sends so mail clients render a native unsubscribe button (and so
    SES reputation is protected). Omit for transactional mail.

    Returns True/False by default. Pass return_message_id=True to get
    a (success, message_id) tuple for audit logging.
    """
    # Suppression gate — never send to a bounced/complained/manually-suppressed
    # address, nor a marketing send to an unsubscribed one. Checked first so it
    # applies to BOTH the SES and Brevo paths below.
    from . import suppression
    if suppression.is_suppressed(to_email, category):
        logger.info(f"[suppressed/{category}] skip send to {to_email}")
        return (False, None) if return_message_id else False

    # Provider fork: when EMAIL_PROVIDER=ses, deliver via Amazon SES (SMTP)
    # instead of Brevo. Brevo path below is untouched and remains the default.
    from . import mailer
    chosen = mailer.member_bulk_provider() if member_bulk else mailer.provider()
    if chosen == "ses":
        r = mailer.ses_send(
            to_email, subject, html_body, text_body or "",
            from_email=from_email, from_name=from_name,
            reply_to_email=reply_to_email, reply_to_name=reply_to_name,
            list_unsubscribe=list_unsubscribe,
        )
        if not r["ok"]:
            logger.error(f"SES send failed to {to_email}: {r.get('error')}")
        return (r["ok"], r["message_id"]) if return_message_id else r["ok"]

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
    if list_unsubscribe:
        # RFC 2369 / RFC 8058 one-click. Brevo forwards custom headers.
        payload_dict["headers"] = {
            "List-Unsubscribe": f"<{list_unsubscribe}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
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
    return '<table cellpadding="0" cellspacing="0" align="center"><tr><td style="padding-right:10px;vertical-align:middle"><table cellpadding="0" cellspacing="0"><tr><td style="width:40px;height:40px;background:linear-gradient(135deg,#0a1f52,#c8102e);border-radius:50%;text-align:center;vertical-align:middle"><span style="font-size:20px;color:#fff;font-weight:900;line-height:40px;display:block;padding-left:3px">&#9654;</span></td></tr></table></td><td style="vertical-align:middle"><span style="font-family:Arial,sans-serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.3px">Advantage</span><span style="font-family:Arial,sans-serif;font-size:22px;font-weight:900;color:#ff6178;letter-spacing:-0.3px">Life</span></td></tr></table>'

def _footer_logo():
    return '<table cellpadding="0" cellspacing="0" align="center" style="margin-bottom:10px"><tr><td style="padding-right:6px;vertical-align:middle"><span style="display:inline-block;width:22px;height:22px;background:#0a1f52;border-radius:50%;text-align:center;line-height:22px;font-size:11px;color:#fff;font-weight:900;padding-left:2px">&#9654;</span></td><td style="vertical-align:middle"><span style="font-family:Arial,sans-serif;font-size:14px;font-weight:900;color:#0a1f52">Advantage</span><span style="font-family:Arial,sans-serif;font-size:14px;font-weight:900;color:#c8102e">Life</span></td></tr></table>'

def _btn(url, label, color="#c8102e"):
    return f'<table cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 4px"><tr><td style="background:{color};border-radius:10px;text-align:center"><a href="{url}" style="display:inline-block;padding:16px 40px;font-family:Arial,sans-serif;font-size:15px;font-weight:800;color:#fff;text-decoration:none;letter-spacing:0.3px">{label}</a></td></tr></table>'

def _card(content, bg="#f8fafc", border="#e2e8f0"):
    return f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:{bg};border:1px solid {border};border-radius:14px;padding:24px">{content}</td></tr></table>'

def _check(*items):
    rows = ""
    for item in items:
        rows += f'<tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.04);vertical-align:top"><table cellpadding="0" cellspacing="0"><tr><td style="color:#22c55e;font-weight:700;font-size:18px;padding-right:12px;vertical-align:top;line-height:1.5">&#10003;</td><td style="font-size:15px;color:#334155;line-height:1.6">{item}</td></tr></table></td></tr>'
    return f'<table width="100%" cellpadding="0" cellspacing="0">{rows}</table>'


def _shell(tag, hero_bg, hero, body, unsubscribe_url=None):
    # unsubscribe_url is only passed for marketing sends (founder/re-engagement
    # broadcasts). Transactional emails (welcome, receipts, password resets)
    # call _shell without it, so no unsubscribe link appears on them.
    unsub = (f'<br><a href="{unsubscribe_url}" style="color:#cbd5e1;text-decoration:none">Unsubscribe</a>'
             if unsubscribe_url else '')
    return f'''<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#e8edf5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf5;padding:36px 16px"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">
<tr><td style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.04),0 20px 60px rgba(0,0,0,0.08)">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#0f1d3a,#172554);padding:22px 32px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td>{_logo()}</td><td align="right" style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3);vertical-align:middle">{tag}</td></tr></table></td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:{hero_bg};padding:36px 36px 32px">{hero}</td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 36px">{body}</td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:24px 36px;text-align:center">{_footer_logo()}<div style="font-size:12px;color:#94a3b8;line-height:1.8">AI Marketing &amp; Advertising Platform<br><a href="{SITE_URL}" style="color:#c8102e;text-decoration:none">advantagelife.club</a>{unsub}</div></td></tr></table>
</td></tr></table></td></tr></table></body></html>'''


def _nurture_shell(tag, hero_bg, hero, body, unsubscribe_url=None):
    unsub_url = unsubscribe_url or f"{SITE_URL}/unsubscribe"
    return f'''<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#e8edf5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf5;padding:36px 16px"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">
<tr><td style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.04),0 20px 60px rgba(0,0,0,0.08)">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#0f1d3a,#172554);padding:22px 32px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td>{_logo()}</td><td align="right" style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3);vertical-align:middle">{tag}</td></tr></table></td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:{hero_bg};padding:36px 36px 32px">{hero}</td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 36px">{body}</td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:24px 36px;text-align:center">{_footer_logo()}<div style="font-size:12px;color:#94a3b8;line-height:1.8">AI Marketing &amp; Advertising Platform &middot; <a href="{SITE_URL}" style="color:#c8102e;text-decoration:none">advantagelife.club</a><br>You're receiving this because you have a {BRAND_NAME} account.<br><a href="{unsub_url}" style="color:#cbd5e1;text-decoration:none">Unsubscribe from these emails</a></div></td></tr></table>
</td></tr></table></td></tr></table></body></html>'''


# ═══════════════════════════════════════════════════════════════
# EMAIL 1: WELCOME
# ═══════════════════════════════════════════════════════════════
def send_welcome_email(to_email, first_name, username):
    hero = f'<div style="font-size:48px;margin-bottom:14px">&#127881;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">Welcome to {BRAND_NAME}, <span style="color:#c8102e">{first_name}!</span></p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">Your account is live and ready. You\'re now part of a growing community using AI to build their business.</p>'
    creds = f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:linear-gradient(135deg,#172554,#1e3a8a);border-radius:14px;padding:22px 26px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.15)"><table width="100%"><tr><td style="font-size:14px;color:rgba(255,255,255,0.6)">Username</td><td align="right" style="font-size:14px;color:#fff;font-weight:700">{username}</td></tr></table></td></tr><tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.15)"><table width="100%"><tr><td style="font-size:14px;color:rgba(255,255,255,0.6)">Status</td><td align="right" style="font-size:14px;color:#4ade80;font-weight:700">&#10003; Active</td></tr></table></td></tr><tr><td style="padding:9px 0"><table width="100%"><tr><td style="font-size:14px;color:rgba(255,255,255,0.6)">Dashboard</td><td align="right" style="font-size:13px;color:#fff;font-weight:600">advantagelife.club/dashboard</td></tr></table></td></tr></table></td></tr></table>'
    body = creds + _card('<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0284c7;margin:0 0 14px">What you can do right now</p>' + _check('Sell Watch-to-Earn campaign packs member-to-member — you keep 100%', 'Build landing pages and funnels with the Page Builder', 'Grow your list with Email Marketing, and share your LinkHub', 'Do your daily watch to stay qualified to earn'), bg='#f0f9ff', border='#bae6fd') + _btn(f"{SITE_URL}/dashboard", "Go to my dashboard &rarr;")
    return send_email(to_email, f"Welcome to {BRAND_NAME}, {first_name}!", _shell("Welcome", "linear-gradient(135deg,#f0f9ff,#e0f2fe)", hero, body), f"Welcome to {BRAND_NAME}, {first_name}! Username: {username}. Login: {SITE_URL}/dashboard")


def send_welcome_free_email(to_email, first_name, username):
    """Welcome email for a FREE signup (register_process path).

    Deliberately distinct from send_welcome_email: a free signup is NOT
    active and cannot open the is_pro-gated tools, so this copy never
    claims 'Active' and never lists tools they can't use. It tells the
    truth about the free state and points at the one real next step —
    activating membership ($100 lifetime / $50 annual) — which is the conversion the
    funnel is currently losing at 0%.
    """
    hero = (
        '<div style="font-size:48px;margin-bottom:14px">&#128075;</div>'
        f'<p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">'
        f'Welcome to {BRAND_NAME}, <span style="color:#c8102e">{first_name}!</span></p>'
        '<p style="margin:0;font-size:15px;color:#475569;line-height:1.7">'
        'Your free account is created. Here&rsquo;s what it is, and how to switch on the full toolkit.</p>'
    )
    creds = (
        '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr>'
        '<td style="background:linear-gradient(135deg,#172554,#1e3a8a);border-radius:14px;padding:22px 26px">'
        '<table width="100%" cellpadding="0" cellspacing="0">'
        '<tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.15)"><table width="100%"><tr>'
        '<td style="font-size:14px;color:rgba(255,255,255,0.6)">Username</td>'
        f'<td align="right" style="font-size:14px;color:#fff;font-weight:700">{username}</td></tr></table></td></tr>'
        '<tr><td style="padding:9px 0"><table width="100%"><tr>'
        '<td style="font-size:14px;color:rgba(255,255,255,0.6)">Plan</td>'
        '<td align="right" style="font-size:14px;color:#fbbf24;font-weight:700">Free &mdash; tools locked</td>'
        '</tr></table></td></tr></table></td></tr></table>'
    )
    body = (
        creds
        + _card(
            '<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0284c7;margin:0 0 14px">'
            'Unlock every tool &mdash; $100 lifetime or $50/year</p>'
            + _check(
                'Page Builder &mdash; landing pages and funnels that convert',
                'LinkHub &mdash; one smart, branded link for everything you share',
                'Email Marketing &mdash; lists, automated sequences, broadcasts',
                'Video Campaigns &mdash; get your ad in front of real members',
            ),
            bg='#f0f9ff', border='#bae6fd',
        )
        + _btn(f"{SITE_URL}/join", "Unlock my account &rarr;")
    )
    return send_email(
        to_email,
        f"Welcome to {BRAND_NAME}, {first_name} — here's how to get started",
        _shell("Welcome", "linear-gradient(135deg,#f0f9ff,#e0f2fe)", hero, body),
        f"Welcome to {BRAND_NAME}, {first_name}! Your free account ({username}) is created. "
        f"Unlock every tool for a one-time $100 lifetime (or $50/year): {SITE_URL}/join",
    )


# ═══════════════════════════════════════════════════════════════
# EMAIL 2: COMMISSION EARNED
# ═══════════════════════════════════════════════════════════════
def send_commission_email(to_email, first_name, commission_type="Affiliate", from_username=""):
    fr = f" &middot; from <strong>{from_username}</strong>" if from_username else ""
    hero = f'<div style="font-size:48px;margin-bottom:14px">&#128176;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#15803d;line-height:1.2">Cha-Ching, <span style="color:#c8102e">{first_name}!</span></p><p style="margin:0;font-size:15px;color:#166534;line-height:1.7">Money just landed in your {BRAND_NAME} wallet.</p>'
    body = f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:14px;padding:28px;text-align:center"><p style="margin:0 0 6px;font-size:20px;font-weight:900;color:#15803d">Commission Received!</p><p style="margin:0;font-size:14px;color:#16a34a;font-weight:600">{commission_type}{fr}</p></td></tr></table>' + _card('<p style="margin:0;font-size:15px;color:#166534;line-height:1.7">Your earnings are building up in your wallet. Once you hit the <strong>$10 minimum</strong>, you can withdraw to your USDT wallet anytime.</p>', bg='#f0fdf4', border='#bbf7d0') + _btn(f"{SITE_URL}/wallet", "View my wallet &rarr;", "#22c55e")
    return send_email(to_email, f"Cha-Ching! You just earned a commission on {BRAND_NAME}!", _shell("Earnings", "linear-gradient(135deg,#f0fdf4,#dcfce7)", hero, body))


# ═══════════════════════════════════════════════════════════════
# EMAIL 3: PASSWORD RESET
# ═══════════════════════════════════════════════════════════════
def send_password_reset_email(to_email, first_name, reset_url):
    hero = f'<div style="font-size:48px;margin-bottom:14px">&#128272;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">Reset your password, <span style="color:#c8102e">{first_name}</span></p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">We received a request to reset your {BRAND_NAME} password. Click the button below — it\'s only valid for <strong>1 hour</strong>.</p>'
    body = f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="border:2px dashed #e2e8f0;border-radius:14px;padding:28px;text-align:center"><p style="margin:0 0 18px;font-size:15px;color:#64748b">Click the button below to set your new password:</p>{_btn(reset_url, "Reset my password &rarr;")}<p style="margin:16px 0 0;font-size:13px;color:#94a3b8">This link expires in 1 hour</p></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:14px 18px"><p style="margin:0;font-size:14px;color:#713f12;line-height:1.6"><strong>Didn\'t request this?</strong> You can safely ignore this email. Your password won\'t change unless you click the link above.</p></td></tr></table><p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.8">If the button doesn\'t work, copy and paste this link:<br><span style="color:#c8102e;font-size:11px;word-break:break-all">{reset_url}</span></p>'
    return send_email(to_email, f"Reset your {BRAND_NAME} password", _shell("Security", "#ffffff", hero, body), f"Hi {first_name}, reset your {BRAND_NAME} password: {reset_url} (expires in 1 hour)")


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
            f"Your {BRAND_NAME} membership is active{spot_line}. "
            f"You're locked in at $15/month for life — that price never changes for you, "
            f"no matter what we charge new members down the line.</p>"
        )
        body = _card(
            '<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#d97706;margin:0 0 14px">What being a Founding Partner means</p>' +
            _check(
                '$15/month price locked for life — never increases for you',
                'Founding Partner badge displayed across the platform',
                f'Full {BRAND_NAME} platform — Creative Studio, Brand Posters, MyLeads, all AI tools',
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
            f"Hi {first_name}, your {BRAND_NAME} Founding Partner membership is active. "
            f"You're locked in at $15/month for life. Go to {SITE_URL}/dashboard",
        )

    # ── Standard Partner activation ──
    hero = (
        f'<div style="font-size:48px;margin-bottom:14px">&#128640;</div>'
        f'<p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">'
        f"You're officially a Partner, <span style=\"color:#c8102e\">{first_name}!</span></p>"
        f'<p style="margin:0;font-size:15px;color:#1e40af;line-height:1.7">'
        f"Your {BRAND_NAME} membership is now active. Here's everything you've unlocked:</p>"
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
    body += _btn(f"{SITE_URL}/dashboard", "Explore my dashboard &rarr;", "#c8102e")
    return send_email(
        to_email,
        f"Your {BRAND_NAME} Partner membership is active!",
        _shell("You're in!", "linear-gradient(135deg,#f0f9ff,#e0f2fe)", hero, body),
        f"Hi {first_name}, your {BRAND_NAME} Partner membership is now active. Go to {SITE_URL}/dashboard",
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
    return send_email(to_email, f"Your {BRAND_NAME} membership renews in {dw}", _shell("Renewal", "linear-gradient(135deg,#fffbeb,#fef3c7)", hero, body), f"Hi {first_name}, your membership renews in {dw}. Check balance: {SITE_URL}/wallet")


# ═══════════════════════════════════════════════════════════════
# NURTURE SEQUENCE — 5 emails for members who haven't activated
# ═══════════════════════════════════════════════════════════════

def send_nurture_email(to_email, first_name, email_num, unsubscribe_url=None):
    """AdvantageLife follow-up sequence for free signups who haven't joined.
    5 emails. Real model only: $100 lifetime / $50 annual, sell Watch-to-Earn
    packs 100% P2P, 3/6/9 pass-up. Claims stay clean — income tied to effort,
    never guaranteed; '100%' scoped to packs. Gated off unless NURTURE_ENABLED."""
    a = f"{SITE_URL}/join"

    if email_num == 1:
        hero = f'<div style="font-size:48px;margin-bottom:14px">&#128075;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">{first_name}, here\'s what your account can do</p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">Your free account is live &mdash; so let me tell you plainly what it is, and what it becomes when you unlock it.</p>'
        body = _card(
            '<p style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0284c7;margin:0 0 14px">The full toolkit, one membership</p>' +
            _check(
                'Page Builder &mdash; landing pages and funnels that convert',
                'LinkHub &mdash; one smart, branded link for everything you share',
                'Email Marketing &mdash; lists, automated sequences, broadcasts',
                'Video Campaigns &mdash; get your ad in front of real members',
            ),
            bg='#f0f9ff', border='#bae6fd',
        ) + _card(
            '<p style="margin:0;font-size:15px;color:#475569;line-height:1.7">The tools are only half of it. The other half is a real advertising product you can sell &mdash; and keep 100% of. More on that soon. For now, have a look around.</p>',
            bg='#f8fafc', border='#e2e8f0',
        ) + _btn(a, "See what unlocking gets me &rarr;")
        subj = f"{first_name}, here's what your AdvantageLife account can do"
        hbg = "linear-gradient(135deg,#f0f9ff,#e0f2fe)"

    elif email_num == 2:
        hero = f'<div style="font-size:48px;margin-bottom:14px">&#128176;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">The part most people don\'t believe at first</p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">Here\'s what makes AdvantageLife different from anything you\'ve seen.</p>'
        body = _card(
            '<p style="margin:0;font-size:15px;color:#166534;line-height:1.7">The product is <strong>Watch-to-Earn campaign packs</strong> &mdash; real advertising, real views delivered by real members. When you sell one, the price of that pack passes <strong>straight to you</strong>. Member to member. The company takes no cut of the pack. You keep 100%.</p>',
            bg='#f0fdf4', border='#bbf7d0',
        ) + _card(
            '<p style="margin:0;font-size:15px;color:#334155;line-height:1.7">That\'s not a teaser rate or a "first sale" gimmick &mdash; it\'s how every pack sale works. There\'s a fair <strong>3/6/9 pass-up</strong> on top, so the team you build together can grow into something bigger than you could sell alone. But the foundation is simple: you sell a pack, you get paid.</p>',
            bg='#f8fafc', border='#e2e8f0',
        ) + _btn(a, "Unlock my account &rarr;") + '<p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:12px">What you earn depends on your effort and the team you build &mdash; it\'s not automatic. But it\'s real, and it\'s yours.</p>'
        subj = "The part most people don't believe at first"
        hbg = "linear-gradient(135deg,#f0fdf4,#dcfce7)"

    elif email_num == 3:
        hero = f'<div style="font-size:48px;margin-bottom:14px">&#129300;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">Is this too good to be true? Fair question.</p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">If part of you is skeptical, good &mdash; you should be. There\'s a lot of junk online.</p>'
        body = _card(
            '<p style="margin:0;font-size:15px;color:#334155;line-height:1.7">Here\'s why AdvantageLife holds up: the packs are a <strong>real advertising product</strong>. Real members watch real ads and deliver real views. That\'s what you\'re selling &mdash; not a spot in a scheme. The daily watch isn\'t busywork; it\'s what makes the views genuine and the whole thing legitimate.</p>',
            bg='#f8fafc', border='#e2e8f0',
        ) + _card(
            '<p style="margin:0;font-size:15px;color:#166534;line-height:1.7">That\'s the difference between this and the "get rich quick" pitches you\'ve rightly learned to ignore. There\'s an actual product, with actual deliverables, and you keep the commission because you did the work of selling it.</p>',
            bg='#f0fdf4', border='#bbf7d0',
        ) + _btn(a, "Take a proper look &rarr;")
        subj = "Is this too good to be true? Fair question."
        hbg = "linear-gradient(135deg,#f0f9ff,#e0f2fe)"

    elif email_num == 4:
        hero = f'<div style="font-size:48px;margin-bottom:14px">&#128273;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">One decision, then it\'s yours</p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">Joining AdvantageLife is a one-time decision &mdash; not a monthly bill hanging over you.</p>'
        body = _card(
            '<p style="margin:0;font-size:16px;color:#0f172a;line-height:1.7"><strong>$100 once, for lifetime access.</strong> Or <strong>$50 for a year</strong> if you\'d rather start smaller. Either way you get the full toolkit and the ability to sell packs and earn. No subscription creeping up on you every month.</p>',
            bg='#f0f9ff', border='#bae6fd',
        ) + _card(
            '<p style="margin:0;font-size:15px;color:#334155;line-height:1.7">Pay by card or crypto &mdash; whichever suits you. And your sponsor earns nothing on your join, so nobody\'s pushing you in for their own commission. It\'s just the platform, unlocked.</p>',
            bg='#f8fafc', border='#e2e8f0',
        ) + _btn(a, "Join AdvantageLife &rarr;")
        subj = f"One decision, then it's yours, {first_name}"
        hbg = "linear-gradient(135deg,#f0f9ff,#e0f2fe)"

    else:
        hero = f'<div style="font-size:48px;margin-bottom:14px">&#127775;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">What this is really about</p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">Underneath the tools and the packs, here\'s what AdvantageLife is really about: building something that\'s yours, on your terms.</p>'
        body = _card(
            '<p style="margin:0;font-size:15px;color:#334155;line-height:1.7">The people who do well here aren\'t lucky. They show up, they use the tools, they build a real team, and they keep 100% of what they sell. It takes effort &mdash; real effort. But the effort is <strong>yours</strong>, the income is <strong>yours</strong>, and the life you build with it is <strong>yours</strong>.</p>',
            bg='#f8fafc', border='#e2e8f0',
        ) + _card(
            '<p style="margin:0;font-size:16px;color:#0a1f52;line-height:1.7;font-weight:700;text-align:center">Your effort. Your income. 100% yours.</p>',
            bg='#f0f9ff', border='#bae6fd',
        ) + _btn(a, "Join AdvantageLife &rarr;") + '<p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:16px;line-height:1.8">This is the last email in this series &mdash; I won\'t keep nudging.<br>But your account\'s here whenever you decide.</p>'
        subj = "What this is really about"
        hbg = "linear-gradient(135deg,#f0f9ff,#e0f2fe)"

    return send_email(to_email, subj, _nurture_shell(f"Email {email_num} of 5", hbg, hero, body, unsubscribe_url=unsubscribe_url), category="marketing", list_unsubscribe=unsubscribe_url)


# ═══════════════════════════════════════════════════════════════
# FOUNDING PARTNER BROADCAST — 16 May 2026
# ═══════════════════════════════════════════════════════════════
def render_founder_offer_email(first_name: str, spots_remaining: int = 82, unsubscribe_url: str = None) -> dict:
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
        f"Steve here &mdash; founder of {BRAND_NAME}. I'm writing because I made a change to the platform "
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
        f'<p style="margin:0;font-size:13px;color:#64748b">Founder, {BRAND_NAME}</p>'
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
        unsubscribe_url=unsubscribe_url,
    )

    # Plain-text fallback for mail clients that don't render HTML
    text = (
        f"Hi {safe_name},\n\n"
        f"Steve here — founder of {BRAND_NAME}. I'm writing because I made a change to the platform "
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
        f"Founder, {BRAND_NAME}\n"
    )

    return {"subject": subject, "html": html, "text": text}


def send_founder_offer_broadcast_one(to_email: str, first_name: str,
                                     spots_remaining: int = 82,
                                     unsubscribe_url: str = None):
    """Send the founder-offer broadcast to a single recipient.

    Used by the admin batch endpoint. Returns (success, brevo_message_id).
    From address is steve@superadpro.com so replies route to Steve's inbox.
    """
    rendered = render_founder_offer_email(first_name, spots_remaining, unsubscribe_url=unsubscribe_url)
    return send_email(
        to_email,
        rendered["subject"],
        rendered["html"],
        rendered["text"],
        from_email=FROM_EMAIL,
        from_name="Steve Lawson",
        reply_to_email=FROM_EMAIL,
        reply_to_name="Steve Lawson",
        return_message_id=True,
        category="marketing",
        list_unsubscribe=unsubscribe_url,
    )


def render_reengagement_email(first_name: str, spots_remaining: int = 82, unsubscribe_url: str = None) -> dict:
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

    subject = f"Quick note from Steve — your {BRAND_NAME} account is ready when you are"

    hero = (
        f'<p style="margin:0 0 10px;font-size:26px;font-weight:900;color:#0f172a;line-height:1.3">'
        f"Hi {safe_name},</p>"
        f'<p style="margin:0;font-size:15px;color:#334155;line-height:1.7">'
        f"Steve here, founder of {BRAND_NAME}. You created an account with us in the last few days "
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

    section_cta = _btn(cta, "Visit your account &rarr;", "#c8102e")

    section_reply = (
        '<p style="margin:24px 0 0;font-size:14px;color:#475569;line-height:1.7">'
        "Either way &mdash; thanks for signing up, and welcome."
        "</p>"
        '<p style="margin:14px 0 0;font-size:14px;color:#475569;line-height:1.7">'
        "If you've got any questions or want to push back on anything, just reply to this email. "
        "It comes straight to me."
        "</p>"
        '<p style="margin:18px 0 4px;font-size:15px;font-weight:700;color:#0f172a">Steve</p>'
        f'<p style="margin:0;font-size:13px;color:#64748b">Founder, {BRAND_NAME}</p>'
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
        unsubscribe_url=unsubscribe_url,
    )

    text = (
        f"Hi {safe_name},\n\n"
        f"Steve here, founder of {BRAND_NAME}. You created an account with us in the last few days "
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
        f"Founder, {BRAND_NAME}\n"
    )

    return {"subject": subject, "html": html, "text": text}


def send_reengagement_broadcast_one(to_email: str, first_name: str,
                                    spots_remaining: int = 82,
                                    unsubscribe_url: str = None):
    """Send the re-engagement broadcast to a single recipient.

    Wrapper around send_email that matches the founder_offer broadcast
    sender pattern: from steve@superadpro.com, reply-to steve. Returns
    (success, brevo_message_id) for the admin batch endpoint to log.
    """
    rendered = render_reengagement_email(first_name, spots_remaining, unsubscribe_url=unsubscribe_url)
    return send_email(
        to_email,
        rendered["subject"],
        rendered["html"],
        rendered["text"],
        from_email=FROM_EMAIL,
        from_name="Steve Lawson",
        reply_to_email=FROM_EMAIL,
        reply_to_name="Steve Lawson",
        return_message_id=True,
        category="marketing",
        list_unsubscribe=unsubscribe_url,
    )
