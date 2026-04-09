# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Email Utilities
# Brevo HTTP API · Cobalt theme · AI Marketing & Advertising
# ═══════════════════════════════════════════════════════════════
import os, json, logging, urllib.request

logger = logging.getLogger(__name__)
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
FROM_EMAIL    = os.getenv("FROM_EMAIL", "noreply@superadpro.com")
SITE_URL      = os.getenv("SITE_URL", "https://www.superadpro.com")
FROM_DISPLAY  = "SuperAdPro"

def send_email(to_email, subject, html_body, text_body=""):
    if not BREVO_API_KEY:
        logger.error("BREVO_API_KEY not set"); return False
    payload = json.dumps({"sender":{"name":FROM_DISPLAY,"email":FROM_EMAIL},"to":[{"email":to_email}],"subject":subject,"htmlContent":html_body,"textContent":text_body or subject}).encode("utf-8")
    req = urllib.request.Request("https://api.brevo.com/v3/smtp/email", data=payload, headers={"accept":"application/json","api-key":BREVO_API_KEY,"content-type":"application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            ok = resp.status in (200,201); logger.info(f"Email sent to {to_email}: {resp.status}"); return ok
    except Exception as e:
        logger.error(f"Email failed to {to_email}: {e}"); return False

# ═══════════════════════════════════════════════════════════════
# SHARED COMPONENTS — Cobalt brand identity
# ═══════════════════════════════════════════════════════════════
def _logo():
    return '<table cellpadding="0" cellspacing="0" align="center"><tr><td style="padding-right:10px;vertical-align:middle"><table cellpadding="0" cellspacing="0"><tr><td style="width:36px;height:36px;background:linear-gradient(135deg,#0ea5e9,#6366f1);border-radius:50%;text-align:center;vertical-align:middle"><span style="font-size:16px;color:#fff;font-weight:900;line-height:36px;display:block;padding-left:2px">&#9654;</span></td></tr></table></td><td style="vertical-align:middle"><span style="font-family:Helvetica Neue,Arial,sans-serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.3px">Super</span><span style="font-family:Helvetica Neue,Arial,sans-serif;font-size:22px;font-weight:900;color:#0ea5e9;letter-spacing:-0.3px">Ad</span><span style="font-family:Helvetica Neue,Arial,sans-serif;font-size:22px;font-weight:900;color:#a78bfa;letter-spacing:-0.3px">Pro</span></td></tr></table>'

def _flogo():
    return '<table cellpadding="0" cellspacing="0" align="center" style="margin-bottom:8px"><tr><td style="padding-right:6px;vertical-align:middle"><span style="display:inline-block;width:22px;height:22px;background:#0ea5e9;border-radius:50%;text-align:center;line-height:22px;font-size:11px;color:#fff;font-weight:900;padding-left:1px">&#9654;</span></td><td style="vertical-align:middle"><span style="font-family:Helvetica Neue,Arial,sans-serif;font-size:14px;font-weight:900;color:#64748b">Super</span><span style="font-family:Helvetica Neue,Arial,sans-serif;font-size:14px;font-weight:900;color:#0ea5e9">Ad</span><span style="font-family:Helvetica Neue,Arial,sans-serif;font-size:14px;font-weight:900;color:#a78bfa">Pro</span></td></tr></table>'

def _shell(tag, hero_bg, hero, body):
    return f'''<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#e8edf5;font-family:Helvetica Neue,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf5;padding:36px 16px"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%"><tr><td style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.04),0 20px 60px rgba(0,0,0,.08)">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#0f1d3a,#172554);padding:20px 32px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td>{_logo()}</td><td align="right" style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.35);vertical-align:middle">{tag}</td></tr></table></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:{hero_bg};padding:36px 40px 32px">{hero}</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 40px">{body}</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:24px 40px;text-align:center">{_flogo()}<div style="font-size:12px;color:#94a3b8;line-height:1.8">AI Marketing &amp; Advertising Platform<br><a href="{SITE_URL}" style="color:#0ea5e9;text-decoration:none">www.superadpro.com</a></div></td></tr></table>
</td></tr></table></td></tr></table></body></html>'''

def _nshell(tag, hero_bg, hero, body):
    return f'''<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#e8edf5;font-family:Helvetica Neue,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf5;padding:36px 16px"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%"><tr><td style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.04),0 20px 60px rgba(0,0,0,.08)">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#0f1d3a,#172554);padding:20px 32px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td>{_logo()}</td><td align="right" style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.35);vertical-align:middle">{tag}</td></tr></table></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:{hero_bg};padding:36px 40px 32px">{hero}</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 40px">{body}</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:24px 40px;text-align:center">{_flogo()}<div style="font-size:12px;color:#94a3b8;line-height:1.8">AI Marketing &amp; Advertising Platform &middot; <a href="{SITE_URL}" style="color:#0ea5e9;text-decoration:none">superadpro.com</a><br>You received this because you have a SuperAdPro account.<br><a href="{SITE_URL}/unsubscribe" style="color:#cbd5e1;text-decoration:none">Unsubscribe</a></div></td></tr></table>
</td></tr></table></td></tr></table></body></html>'''

def _btn(url, label, color="#0ea5e9"):
    return f'<table cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 4px"><tr><td style="background:{color};border-radius:50px;text-align:center"><a href="{url}" style="display:inline-block;padding:17px 44px;font-size:16px;font-weight:800;color:#fff;text-decoration:none;letter-spacing:.3px;font-family:Helvetica Neue,Arial,sans-serif">{label}</a></td></tr></table>'

def _card(content, bg="#f8fafc", border="#e2e8f0"):
    return f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:{bg};border:1px solid {border};border-radius:14px;padding:24px">{content}</td></tr></table>'

def _check(*items):
    rows = ""
    for item in items:
        rows += f'<tr><td style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,.04);vertical-align:top"><table cellpadding="0" cellspacing="0"><tr><td style="color:#22c55e;font-weight:700;font-size:18px;padding-right:12px;vertical-align:top;line-height:1.5">&#10003;</td><td style="font-size:15px;color:#334155;line-height:1.5">{item}</td></tr></table></td></tr>'
    return f'<table width="100%" cellpadding="0" cellspacing="0">{rows}</table>'

# For backwards compatibility
_logo_html = _logo
_email_shell = _shell
_nurture_shell = _nshell
_cta_button = _btn
_info_card = _card
_checklist = _check

# ═══════════════════════════════════════════════════════════════
# WELCOME EMAIL
# ═══════════════════════════════════════════════════════════════
def send_welcome_email(to_email, first_name, username):
    hero = f'<div style="font-size:52px;line-height:1;margin-bottom:16px">&#127881;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">Welcome to the team, <span style="color:#0ea5e9">{first_name}!</span></p><p style="margin:0;font-size:16px;color:#475569;line-height:1.7">Your SuperAdPro account is live. You\'re now part of a growing community of digital marketers using AI-powered tools to build their business.</p>'
    body = f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:linear-gradient(135deg,#172554,#1e3a8a);border-radius:14px;padding:22px 26px">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.15)"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;color:rgba(255,255,255,.6)">Username</td><td align="right" style="font-size:14px;color:#fff;font-weight:700">{username}</td></tr></table></td></tr>
<tr><td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.15)"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;color:rgba(255,255,255,.6)">Status</td><td align="right" style="font-size:14px;color:#86efac;font-weight:700">&#10003; Active</td></tr></table></td></tr>
<tr><td style="padding:9px 0"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;color:rgba(255,255,255,.6)">Dashboard</td><td align="right" style="font-size:13px;color:#fff;font-weight:600">superadpro.com/dashboard</td></tr></table></td></tr>
</table></td></tr></table>
{_card('<p style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0284c7;margin:0 0 14px">What you can do right now</p>' + _check('Share your referral link and earn $10/month per Basic referral, $17.50 per Pro','Open Creative Studio and generate AI videos, images, music, and voiceovers','Build your LinkHub page and share it everywhere','Watch daily videos to qualify for campaign commissions'), bg='#f0f9ff', border='#bae6fd')}
{_btn(f"{SITE_URL}/dashboard", "Go to My Dashboard &rarr;")}'''
    return send_email(to_email, f"Welcome to SuperAdPro, {first_name}!", _shell("Welcome","linear-gradient(135deg,#f0f9ff,#e0f2fe)",hero,body), f"Welcome to SuperAdPro, {first_name}! Username: {username}. Login: {SITE_URL}/dashboard")

# ═══════════════════════════════════════════════════════════════
# COMMISSION EMAIL
# ═══════════════════════════════════════════════════════════════
def send_commission_email(to_email, first_name, commission_type="Affiliate", from_username=""):
    fl = f" &middot; from <strong>{from_username}</strong>" if from_username else ""
    hero = f'<div style="font-size:52px;line-height:1;margin-bottom:16px">&#128176;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#15803d;line-height:1.2">Cha-Ching, <span style="color:#0ea5e9">{first_name}!</span></p><p style="margin:0;font-size:16px;color:#166534;line-height:1.7">Money just landed in your SuperAdPro wallet.</p>'
    body = f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:16px;padding:32px;text-align:center"><p style="margin:0 0 6px;font-size:20px;font-weight:900;color:#15803d">Commission Received!</p><p style="margin:0;font-size:15px;color:#16a34a;font-weight:600">{commission_type}{fl}</p></td></tr></table>
{_card('<p style="margin:0;font-size:15px;color:#166534;line-height:1.7">Your earnings are building up in your wallet. Once you hit the <strong>$10 minimum</strong>, you can withdraw to your USDT wallet anytime.</p>', bg='#f0fdf4', border='#bbf7d0')}
{_btn(f"{SITE_URL}/wallet", "View My Wallet &rarr;", color="#22c55e")}'''
    return send_email(to_email, "Cha-Ching! You just earned a commission!", _shell("Commission","linear-gradient(135deg,#f0fdf4,#dcfce7)",hero,body))

# ═══════════════════════════════════════════════════════════════
# PASSWORD RESET
# ═══════════════════════════════════════════════════════════════
def send_password_reset_email(to_email, first_name, reset_url):
    hero = f'<div style="font-size:52px;line-height:1;margin-bottom:16px">&#128272;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">Reset your password, <span style="color:#0ea5e9">{first_name}</span></p><p style="margin:0;font-size:16px;color:#475569;line-height:1.7">We received a request to reset your SuperAdPro password. Click below &mdash; valid for <strong>1 hour</strong>.</p>'
    body = f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="border:2px dashed #e2e8f0;border-radius:14px;padding:30px;text-align:center"><p style="margin:0 0 20px;font-size:15px;color:#64748b">Click the button below to set your new password:</p>{_btn(reset_url, "Reset My Password &rarr;")}<p style="margin:16px 0 0;font-size:13px;color:#94a3b8">This link expires in 1 hour</p></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:14px 18px"><p style="margin:0;font-size:14px;color:#713f12;line-height:1.6"><strong>Didn\'t request this?</strong> You can safely ignore this email. Your password won\'t change unless you click the link above.</p></td></tr></table>
<p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.8">If the button doesn\'t work, paste this into your browser:<br><span style="color:#0ea5e9;font-size:11px;word-break:break-all">{reset_url}</span></p>'''
    return send_email(to_email, "Reset your SuperAdPro password", _shell("Security","#ffffff",hero,body), f"Reset your password: {reset_url}")

# ═══════════════════════════════════════════════════════════════
# MEMBERSHIP ACTIVATED
# ═══════════════════════════════════════════════════════════════
def send_membership_activated_email(to_email, first_name):
    hero = f'<div style="font-size:52px;line-height:1;margin-bottom:16px">&#128640;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#0f172a;line-height:1.2">You\'re officially a member, <span style="color:#7c3aed">{first_name}!</span></p><p style="margin:0;font-size:16px;color:#4c1d95;line-height:1.7">Your membership is now active. Here\'s everything you\'ve unlocked:</p>'
    body = f'''{_card(_check('Earn 50% referral commissions &mdash; $10/month per Basic, $17.50 per Pro','Creative Studio &mdash; AI video clips, full videos, images, music, voiceover, lip sync','All 8 campaign tiers and the income grid','LinkHub, Link Tools, Content Creator, and more','Withdraw earnings via USDT anytime from $10'), bg='#faf5ff', border='#ddd6fe')}
{_card('<p style="margin:0;font-size:15px;color:#166534;text-align:center;line-height:1.6"><strong>Pro tip:</strong> Refer just 2 Basic members and your membership pays for itself every month.</p>', bg='#f0fdf4', border='#bbf7d0')}
{_btn(f"{SITE_URL}/dashboard", "Explore My Dashboard &rarr;", color="#7c3aed")}'''
    return send_email(to_email, f"Your SuperAdPro membership is active!", _shell("You're In!","linear-gradient(135deg,#faf5ff,#ede9fe)",hero,body), f"Your membership is active. Dashboard: {SITE_URL}/dashboard")

# ═══════════════════════════════════════════════════════════════
# RENEWAL REMINDER
# ═══════════════════════════════════════════════════════════════
def send_renewal_reminder_email(to_email, first_name, days_left):
    dw = f"{days_left} day{'s' if days_left!=1 else ''}"
    uc = "#ef4444" if days_left<=3 else "#f59e0b"
    hero = f'<div style="font-size:52px;line-height:1;margin-bottom:16px">&#9200;</div><p style="margin:0 0 10px;font-size:28px;font-weight:900;color:#92400e;line-height:1.2">Your membership renews in <span style="color:{uc}">{dw}</span></p><p style="margin:0;font-size:16px;color:#78350f;line-height:1.7">Just a heads up, {first_name} &mdash; make sure your wallet has enough to cover it.</p>'
    body = f'''{_card(f'<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06)"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:15px;color:#475569">Renewal date</td><td align="right" style="font-size:15px;color:#0f172a;font-weight:700">in {dw}</td></tr></table></td></tr><tr><td style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06)"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:15px;color:#475569">Amount</td><td align="right" style="font-size:15px;color:#0f172a;font-weight:700">$20 (Basic) / $35 (Pro)</td></tr></table></td></tr><tr><td style="padding:10px 0"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:15px;color:#475569">Paid from</td><td align="right" style="font-size:15px;color:#0f172a;font-weight:700">Your wallet</td></tr></table></td></tr></table>', bg='#fffbeb', border='#fde68a')}
{_card('<p style="margin:0;font-size:15px;color:#9a3412;line-height:1.6;text-align:center">If your wallet doesn\'t have enough, your commissions will pause until renewal is complete.</p>', bg='#fff7ed', border='#fed7aa')}
{_btn(f"{SITE_URL}/wallet", "Check My Wallet Balance", color=uc)}'''
    return send_email(to_email, f"Your membership renews in {dw}", _shell("Reminder","linear-gradient(135deg,#fffbeb,#fef3c7)",hero,body), f"Membership renews in {dw}. Check: {SITE_URL}/wallet")

# ═══════════════════════════════════════════════════════════════
# NURTURE SEQUENCE — 5 emails for inactive members
# ═══════════════════════════════════════════════════════════════
def send_nurture_email(to_email, first_name, email_num):
    a = f"{SITE_URL}/pay-membership"
    if email_num == 1:
        hero = f'<div style="font-size:52px;line-height:1;margin-bottom:14px">&#128075;</div><p style="margin:0 0 10px;font-size:26px;font-weight:900;color:#0f172a;line-height:1.2">Hey {first_name}, your account is ready &mdash; but not activated yet</p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">You created your SuperAdPro account but haven\'t activated. Here\'s what\'s waiting.</p>'
        body = f'''{_card('<p style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#0284c7;margin:0 0 14px">What activating unlocks</p>' + _check('Earn $10/month for every Basic referral and $17.50 for every Pro &mdash; recurring','Access the full 8-level income grid and earn from your whole network','Creative Studio &mdash; AI video, images, music, voiceover, and lip sync','Watch daily videos and qualify for campaign commissions'), bg='#f0f9ff', border='#bae6fd')}
{_card('<p style="margin:0;font-size:15px;color:#166534;line-height:1.7"><strong>The maths is simple:</strong> Refer just 2 Basic members and your $20/month membership pays for itself. Everything after that is profit.</p>', bg='#f0fdf4', border='#bbf7d0')}
{_btn(a, "Activate My Membership &mdash; $20/month &rarr;")}
<p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:14px">Cancel anytime</p>'''
        subj = f"You're in but not activated yet, {first_name}"
        hbg = "linear-gradient(135deg,#f0f9ff,#e0f2fe)"
    elif email_num == 2:
        hero = f'<div style="font-size:52px;line-height:1;margin-bottom:14px">&#128176;</div><p style="margin:0 0 10px;font-size:26px;font-weight:900;color:#4c1d95;line-height:1.2">Let\'s talk about what $20 actually buys you</p><p style="margin:0;font-size:15px;color:#4c1d95;line-height:1.7">Most subscriptions cost $20 and give you software. SuperAdPro gives you software <strong>and</strong> an income.</p>'
        body = f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px"><tr><td width="31%" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:18px;text-align:center;vertical-align:top"><p style="font-size:26px;font-weight:900;color:#0ea5e9;margin:0 0 4px">$10</p><p style="font-size:12px;color:#64748b;margin:0;line-height:1.4">per Basic referral<br>per month</p></td><td width="3%"></td><td width="31%" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:18px;text-align:center;vertical-align:top"><p style="font-size:26px;font-weight:900;color:#8b5cf6;margin:0 0 4px">$17.50</p><p style="font-size:12px;color:#64748b;margin:0;line-height:1.4">per Pro referral<br>per month</p></td><td width="3%"></td><td width="31%" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:18px;text-align:center;vertical-align:top"><p style="font-size:26px;font-weight:900;color:#0ea5e9;margin:0 0 4px">8</p><p style="font-size:12px;color:#64748b;margin:0;line-height:1.4">income grid<br>levels deep</p></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px"><tr><td width="48%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;vertical-align:top"><p style="font-size:13px;font-weight:800;color:#94a3b8;margin:0 0 12px">&#10060; Without membership</p><p style="font-size:14px;color:#64748b;margin:4px 0;line-height:1.5">No commission earnings</p><p style="font-size:14px;color:#64748b;margin:4px 0;line-height:1.5">No income grid access</p><p style="font-size:14px;color:#64748b;margin:4px 0;line-height:1.5">Limited tools</p></td><td width="4%"></td><td width="48%" style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:18px;vertical-align:top"><p style="font-size:13px;font-weight:800;color:#16a34a;margin:0 0 12px">&#10003; Active member</p><p style="font-size:14px;color:#166534;margin:4px 0;line-height:1.5">$10-$17.50 per referral/month</p><p style="font-size:14px;color:#166534;margin:4px 0;line-height:1.5">Full 8-tier income grid</p><p style="font-size:14px;color:#166534;margin:4px 0;line-height:1.5">Creative Studio + all AI tools</p></td></tr></table>
{_btn(a, "Start Earning &mdash; Activate Now &rarr;", color="#7c3aed")}'''
        subj = f"Here's what $20 actually gets you on SuperAdPro"
        hbg = "linear-gradient(135deg,#faf5ff,#ede9fe)"
    elif email_num == 3:
        hero = f'<div style="font-size:52px;line-height:1;margin-bottom:14px">&#129327;</div><p style="margin:0 0 10px;font-size:26px;font-weight:900;color:#15803d;line-height:1.2">What if your membership paid for itself?</p><p style="margin:0;font-size:15px;color:#166534;line-height:1.7">It can. Here\'s the exact maths &mdash; no fluff, no hype.</p>'
        body = f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:24px"><tr><td><p style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#15803d;margin:0 0 16px">The self-funding formula</p><table width="100%" cellpadding="0" cellspacing="0"><tr style="border-bottom:1px solid rgba(0,0,0,.07)"><td style="padding:10px 0;font-size:15px;color:#334155">Your monthly membership</td><td style="padding:10px 0;font-size:15px;font-weight:700;color:#0f172a;text-align:right">&minus; $20.00</td></tr><tr style="border-bottom:1px solid rgba(0,0,0,.07)"><td style="padding:10px 0;font-size:15px;color:#334155">1 Basic referral &times; $10/month</td><td style="padding:10px 0;font-size:15px;font-weight:700;color:#16a34a;text-align:right">+ $10.00</td></tr><tr style="border-bottom:1px solid rgba(0,0,0,.07)"><td style="padding:10px 0;font-size:15px;color:#334155">2 Basic referrals &times; $10/month</td><td style="padding:10px 0;font-size:15px;font-weight:700;color:#16a34a;text-align:right">+ $20.00</td></tr><tr><td style="padding:12px 0;font-size:16px;font-weight:800;color:#0f172a">Net cost to you</td><td style="padding:12px 0;font-size:18px;font-weight:900;color:#15803d;text-align:right">$0.00 &#127881;</td></tr></table></td></tr></table>
{_card('<p style="margin:0;font-size:15px;color:#0284c7;line-height:1.7"><strong>And it compounds:</strong> 5 referrals = $50/month. 10 referrals = $100/month. Plus you earn from their networks through the 8-level income grid. Pro referrals pay $17.50 each.</p>', bg='#f0f9ff', border='#bae6fd')}
{_btn(a, "Activate &amp; Start Referring &rarr;", color="#22c55e")}'''
        subj = f"2 referrals = your membership costs you nothing, {first_name}"
        hbg = "linear-gradient(135deg,#f0fdf4,#dcfce7)"
    elif email_num == 4:
        hero = f'<div style="font-size:52px;line-height:1;margin-bottom:14px">&#128064;</div><p style="margin:0 0 10px;font-size:26px;font-weight:900;color:#92400e;line-height:1.2">Here\'s what you\'re missing, {first_name}</p><p style="margin:0;font-size:15px;color:#78350f;line-height:1.7">Your free account gives you a taste, but active members are using the full platform to create content and build their income.</p>'
        body = f'''{_card('<p style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#92400e;margin:0 0 14px">What active members are using right now</p>' + _check('Creative Studio &mdash; AI videos, images, music, and voiceovers in minutes','Referral commissions &mdash; $10-$17.50 per member, every month','Campaign Tiers &mdash; activate the 8&times;8 income grid for deeper earnings','Credit Matrix &mdash; earn when your network buys AI credit packs'), bg='#fffbeb', border='#fde68a')}
{_card('<p style="margin:0;font-size:15px;color:#166534;line-height:1.7"><strong>The good news:</strong> Your account is still here, your referral link is still live, and your position in the network is waiting. One click and you\'re in.</p>', bg='#f0fdf4', border='#bbf7d0')}
{_btn(a, "Activate My Account Now &rarr;", color="#f59e0b")}
<p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:14px">$20/month &middot; Cancel anytime</p>'''
        subj = f"Here's what you're missing on SuperAdPro, {first_name}"
        hbg = "linear-gradient(135deg,#fffbeb,#fef3c7)"
    else:
        hero = f'<div style="font-size:52px;line-height:1;margin-bottom:14px">&#128075;</div><p style="margin:0 0 10px;font-size:26px;font-weight:900;color:#0f172a;line-height:1.2">Last one from us, {first_name}</p><p style="margin:0;font-size:15px;color:#475569;line-height:1.7">This is the final email in this sequence. After this we\'ll stop &mdash; but your account stays open whenever you\'re ready.</p>'
        body = f'''{_card('<p style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#64748b;margin:0 0 14px">Quick reminder of what\'s waiting</p>' + _check('$10/month for every Basic referral, $17.50 for every Pro &mdash; recurring','8-level income grid earning from your entire network','Creative Studio with AI video, images, music, voiceover, and lip sync','Campaign Tiers, Credit Matrix, and Watch to Earn','Withdraw earnings in USDT anytime from $10'))}
{_btn(a, "Activate My Membership &mdash; $20/month", color="#8b5cf6")}
<p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:16px;line-height:1.8">Not interested? No hard feelings &mdash; your free account stays open.<br><a href="{SITE_URL}/unsubscribe" style="color:#cbd5e1;text-decoration:none">Unsubscribe</a></p>'''
        subj = f"Last email from us, {first_name} — your account is waiting"
        hbg = "linear-gradient(135deg,#f8fafc,#f1f5f9)"
    return send_email(to_email, subj, _nshell(f"Email {email_num} of 5", hbg, hero, body))
