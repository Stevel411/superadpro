"""
SuperPages Template Builder
Generates complete element arrays for the React editor.
Each template returns {els, canvasBg} ready to save as gjs_css JSON.
"""
import json

CW = 1100  # Canvas width


def _uid():
    import time, random, string
    return 'e' + hex(int(time.time() * 1000))[2:] + ''.join(random.choices(string.ascii_lowercase, k=3))


def _centre(w):
    return (CW - w) / 2


def build_template(key, username="demo"):
    """Return {els, canvasBg, canvasBgImage} for a given template key."""
    builder = BUILDERS.get(key)
    if not builder:
        builder = BUILDERS.get('lead-capture')
    return builder(username)


# ═══════════════════════════════════════════════════════════
# TEMPLATE 1: Lead Capture
# ═══════════════════════════════════════════════════════════
def _lead_capture(username):
    els = []
    y = 40

    els.append({'id': _uid(), 'type': 'label', 'x': _centre(200), 'y': y, 'w': 200, 'h': 30, 'txt': '🔒 FREE ACCESS', 's': {'fontFamily': 'DM Sans,sans-serif', 'fontWeight': '700', 'fontSize': '12px', 'color': '#0ea5e9', 'textAlign': 'center', 'background': 'rgba(14,165,233,0.1)', 'borderRadius': '20px', 'border': '1px solid rgba(14,165,233,0.2)'}})
    y += 65

    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(900), 'y': y, 'w': 900, 'h': 90, 'txt': 'Start Building Your Online Income Today', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '900', 'fontSize': '42px', 'color': '#fff', 'textAlign': 'center'}})
    y += 100

    els.append({'id': _uid(), 'type': 'text', 'x': _centre(700), 'y': y, 'w': 700, 'h': 75, 'txt': 'Get instant access to our proven system — professional marketing funnels, AI-powered tools, and step-by-step training. Enter your email below to get started.', 's': {'fontFamily': 'Outfit,sans-serif', 'fontSize': '16px', 'color': '#94a3b8', 'textAlign': 'center', 'lineHeight': '1.8'}})
    y += 100

    els.append({'id': _uid(), 'type': 'form', 'x': _centre(500), 'y': y, 'w': 500, 'h': 260,
        'txt': '<div style="text-align:center;padding:4px"><div style="font-family:Sora,sans-serif;font-weight:800;font-size:20px;color:#fff;margin-bottom:6px">Get Free Access</div><div style="font-size:13px;color:#94a3b8;margin-bottom:16px">Enter your details below</div><input placeholder="Your first name" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#1a1a2e;font-size:13px;margin-bottom:8px;box-sizing:border-box"><input placeholder="Your email" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#1a1a2e;font-size:13px;margin-bottom:10px;box-sizing:border-box"><div style="width:100%;padding:12px;border-radius:10px;background:#0ea5e9;color:#fff;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box">Get Access →</div></div>',
        's': {'background': 'rgba(15,23,41,0.6)', 'borderRadius': '18px', 'border': '1px solid rgba(14,165,233,0.15)', 'padding': '20px'},
        '_formHeading': 'Get Free Access', '_formSubtitle': 'Enter your details below', '_formBtnText': 'Get Access →', '_formBtnColor': '#0ea5e9', '_formShowName': True})
    y += 310

    # Feature boxes
    features = [
        ('🚀', 'Ready-Made Funnels', 'Professional landing pages built for you — just add your link'),
        ('🤖', 'AI-Powered Tools', 'Let artificial intelligence write your copy and build your campaigns'),
        ('💰', 'Multiple Income Streams', 'Earn from referrals, team commissions, and digital product sales'),
    ]
    for i, (icon, title, desc) in enumerate(features):
        fx = 50 + i * 350
        els.append({'id': _uid(), 'type': 'icontext', 'x': fx, 'y': y, 'w': 320, 'h': 105,
            'txt': f'<div style="display:flex;gap:16px;align-items:flex-start"><div style="font-size:28px;flex-shrink:0;width:40px;text-align:center">{icon}</div><div><div style="font-family:Sora,sans-serif;font-weight:700;font-size:15px;color:#fff;margin-bottom:4px">{title}</div><div style="font-size:13px;color:#94a3b8;line-height:1.6">{desc}</div></div></div>',
            's': {}})
    y += 145

    els.append({'id': _uid(), 'type': 'divider', 'x': _centre(700), 'y': y, 'w': 700, 'h': 2, 'txt': '', 's': {'background': '#334155', 'borderRadius': '1px'}})
    y += 30

    # Testimonials
    testimonials = [
        ('Sarah M.', 'Affiliate Marketer', 'Made my first commission within 48 hours of joining. The ready-made funnels made it so easy to start.'),
        ('James K.', 'Side Hustler', 'I promote during lunch breaks. Last month I earned more from affiliates than my overtime pay.'),
        ('Maria L.', 'Full-Time Affiliate', 'Quit my 9-to-5 after 6 months. Between commissions and my team, I earn more than my old salary.'),
    ]
    for i, (name, role, text) in enumerate(testimonials):
        tx = 50 + i * 350
        els.append({'id': _uid(), 'type': 'testimonial', 'x': tx, 'y': y, 'w': 320, 'h': 180,
            'txt': f'<div style="margin-bottom:8px"><span style="color:#fbbf24">★★★★★</span></div><div style="font-size:14px;color:#e2e8f0;line-height:1.7;font-style:italic;margin-bottom:10px">"{text}"</div><div style="font-size:13px;color:#64748b;font-weight:600">— {name}, {role}</div>',
            's': {'background': '#1e293b', 'borderRadius': '16px', 'borderLeft': '4px solid #fbbf24', 'padding': '20px'}})
    y += 200

    # CTA
    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(800), 'y': y, 'w': 800, 'h': 50, 'txt': 'Ready to Start Earning?', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '800', 'fontSize': '28px', 'color': '#fff', 'textAlign': 'center'}})
    y += 75
    els.append({'id': _uid(), 'type': 'text', 'x': _centre(600), 'y': y, 'w': 600, 'h': 50, 'txt': 'Join thousands of members building real income online — your spot is waiting.', 's': {'fontSize': '15px', 'color': '#64748b', 'textAlign': 'center'}})
    y += 65
    els.append({'id': _uid(), 'type': 'button', 'x': _centre(350), 'y': y, 'w': 350, 'h': 56, 'txt': 'Get Started Now →', 'url': f'/ref/{username}', 's': {'background': 'linear-gradient(135deg,#0ea5e9,#6366f1)', 'color': '#fff', 'fontFamily': 'Sora,sans-serif', 'fontWeight': '700', 'fontSize': '18px', 'textAlign': 'center', 'borderRadius': '14px', 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center'}})

    return {'els': els, 'canvasBg': '#050d1a'}


# ═══════════════════════════════════════════════════════════
# TEMPLATE 2: Video Sales Letter
# ═══════════════════════════════════════════════════════════
def _video_sales(username):
    els = []
    y = 30

    els.append({'id': _uid(), 'type': 'label', 'x': _centre(220), 'y': y, 'w': 220, 'h': 30, 'txt': '⚡ WATCH THIS FIRST', 's': {'fontFamily': 'DM Sans,sans-serif', 'fontWeight': '700', 'fontSize': '12px', 'color': '#fbbf24', 'textAlign': 'center', 'background': 'rgba(251,191,36,0.1)', 'borderRadius': '20px', 'border': '1px solid rgba(251,191,36,0.2)'}})
    y += 65

    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(950), 'y': y, 'w': 950, 'h': 110, 'txt': 'How Everyday People Are Earning $500–$5,000/Month From Their Phone', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '900', 'fontSize': '38px', 'color': '#fff', 'textAlign': 'center'}})
    y += 155

    els.append({'id': _uid(), 'type': 'text', 'x': _centre(650), 'y': y, 'w': 650, 'h': 65, 'txt': 'Watch the 3-minute video below to discover the simple system that\'s changing lives — no experience needed.', 's': {'fontSize': '16px', 'color': '#94a3b8', 'textAlign': 'center', 'lineHeight': '1.7'}})
    y += 80

    els.append({'id': _uid(), 'type': 'video', 'x': _centre(800), 'y': y, 'w': 800, 'h': 450, 'txt': '', 's': {'borderRadius': '16px'}})
    y += 480

    els.append({'id': _uid(), 'type': 'button', 'x': _centre(400), 'y': y, 'w': 400, 'h': 60, 'txt': 'Yes! Show Me How →', 'url': f'/ref/{username}', 's': {'background': 'linear-gradient(135deg,#8b5cf6,#ec4899)', 'color': '#fff', 'fontFamily': 'Sora,sans-serif', 'fontWeight': '700', 'fontSize': '20px', 'textAlign': 'center', 'borderRadius': '14px', 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center'}})
    y += 155

    # Social proof stats
    stats = [('10,000+', 'Active Members'), ('$2.5M+', 'Commissions Paid'), ('150+', 'Countries')]
    for i, (val, label) in enumerate(stats):
        sx = 150 + i * 300
        els.append({'id': _uid(), 'type': 'stat', 'x': sx, 'y': y, 'w': 250, 'h': 80,
            'txt': f'<div style="font-family:Sora,sans-serif;font-size:32px;font-weight:900;color:#8b5cf6">{val}</div><div style="font-size:12px;color:#64748b;margin-top:2px">{label}</div>',
            's': {'textAlign': 'center'}})
    y += 145

    # Testimonial
    els.append({'id': _uid(), 'type': 'testimonial', 'x': _centre(700), 'y': y, 'w': 700, 'h': 170,
        'txt': '<div style="margin-bottom:8px"><span style="color:#fbbf24">★★★★★</span></div><div style="font-size:15px;color:#e2e8f0;line-height:1.7;font-style:italic;margin-bottom:10px">"I was sceptical at first, but I watched the video and decided to give it a try. Within my first week I made my first commission. Now I\'m earning consistently every month."</div><div style="font-size:13px;color:#64748b;font-weight:600">— David R., Part-Time Marketer</div>',
        's': {'background': '#1e293b', 'borderRadius': '16px', 'borderLeft': '4px solid #8b5cf6', 'padding': '24px'}})

    return {'els': els, 'canvasBg': '#0f0a1e'}


# ═══════════════════════════════════════════════════════════
# TEMPLATE 3: Product Offer
# ═══════════════════════════════════════════════════════════
def _product_offer(username):
    els = []
    y = 30

    els.append({'id': _uid(), 'type': 'label', 'x': _centre(180), 'y': y, 'w': 180, 'h': 30, 'txt': '🏆 BEST VALUE', 's': {'fontFamily': 'DM Sans,sans-serif', 'fontWeight': '700', 'fontSize': '12px', 'color': '#10b981', 'textAlign': 'center', 'background': 'rgba(16,185,129,0.1)', 'borderRadius': '20px', 'border': '1px solid rgba(16,185,129,0.2)'}})
    y += 65

    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(900), 'y': y, 'w': 900, 'h': 90, 'txt': 'The Complete Online Business Toolkit', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '900', 'fontSize': '40px', 'color': '#fff', 'textAlign': 'center'}})
    y += 100

    els.append({'id': _uid(), 'type': 'text', 'x': _centre(700), 'y': y, 'w': 700, 'h': 65, 'txt': 'Everything you need to launch, grow and scale your online business — in one powerful platform.', 's': {'fontSize': '16px', 'color': '#94a3b8', 'textAlign': 'center', 'lineHeight': '1.8'}})
    y += 100

    # Price card
    els.append({'id': _uid(), 'type': 'box', 'x': _centre(500), 'y': y, 'w': 500, 'h': 280, 'txt': '', 's': {'background': 'rgba(16,185,129,0.05)', 'border': '2px solid rgba(16,185,129,0.2)', 'borderRadius': '20px'}})
    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(300), 'y': y + 30, 'w': 300, 'h': 50, 'txt': '<span style="font-size:18px;color:#64748b;text-decoration:line-through">$97/mo</span> <span style="color:#10b981">$30/mo</span>', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '900', 'fontSize': '36px', 'color': '#10b981', 'textAlign': 'center'}})

    features = ['✓ AI Funnel Builder', '✓ Marketing Automation', '✓ Email Autoresponder', '✓ Lead Dashboard', '✓ Training Library', '✓ 50% Referral Commissions']
    for i, feat in enumerate(features):
        els.append({'id': _uid(), 'type': 'text', 'x': _centre(350), 'y': y + 95 + i * 25, 'w': 350, 'h': 22,
            'txt': feat, 's': {'fontSize': '14px', 'color': '#e2e8f0', 'textAlign': 'center'}})

    els.append({'id': _uid(), 'type': 'button', 'x': _centre(300), 'y': y + 250, 'w': 300, 'h': 50, 'txt': 'Get Started — $30/mo', 'url': f'/ref/{username}', 's': {'background': '#10b981', 'color': '#fff', 'fontFamily': 'Sora,sans-serif', 'fontWeight': '700', 'fontSize': '16px', 'textAlign': 'center', 'borderRadius': '12px', 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center'}})
    y += 320

    # Guarantee
    els.append({'id': _uid(), 'type': 'text', 'x': _centre(500), 'y': y, 'w': 500, 'h': 50, 'txt': '🛡️ 30-Day Money Back Guarantee — Zero Risk', 's': {'fontSize': '14px', 'color': '#64748b', 'textAlign': 'center'}})

    return {'els': els, 'canvasBg': '#0f172a'}


# ═══════════════════════════════════════════════════════════
# TEMPLATE 4: Business Opportunity
# ═══════════════════════════════════════════════════════════
def _business_opportunity(username):
    els = []
    y = 40

    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(950), 'y': y, 'w': 950, 'h': 110, 'txt': 'Tired of Working Hard for Someone Else\'s Dream?', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '900', 'fontSize': '40px', 'color': '#fff', 'textAlign': 'center'}})
    y += 155

    els.append({'id': _uid(), 'type': 'text', 'x': _centre(700), 'y': y, 'w': 700, 'h': 75, 'txt': 'Discover how thousands of ordinary people are building extraordinary income from home — with a simple, proven system that anyone can follow.', 's': {'fontSize': '16px', 'color': '#94a3b8', 'textAlign': 'center', 'lineHeight': '1.8'}})
    y += 100

    els.append({'id': _uid(), 'type': 'button', 'x': _centre(350), 'y': y, 'w': 350, 'h': 56, 'txt': 'Learn How It Works →', 'url': f'/ref/{username}', 's': {'background': 'linear-gradient(135deg,#f59e0b,#ef4444)', 'color': '#fff', 'fontFamily': 'Sora,sans-serif', 'fontWeight': '700', 'fontSize': '18px', 'textAlign': 'center', 'borderRadius': '14px', 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center'}})
    y += 155

    # Income stats
    stats = [('$500+', 'Starter Income'), ('$2,000+', 'Growth Phase'), ('$5,000+', 'Full-Time Income'), ('$10,000+', 'Leadership Level')]
    for i, (val, label) in enumerate(stats):
        sx = 60 + i * 260
        els.append({'id': _uid(), 'type': 'stat', 'x': sx, 'y': y, 'w': 230, 'h': 80,
            'txt': f'<div style="font-family:Sora,sans-serif;font-size:30px;font-weight:900;color:#f59e0b">{val}</div><div style="font-size:12px;color:#64748b;margin-top:2px">{label}</div>',
            's': {'textAlign': 'center'}})
    y += 145

    # Steps
    steps = [
        ('01', 'Join the Platform', 'Sign up in 60 seconds and get your personal referral link and marketing tools.'),
        ('02', 'Share With Others', 'Use our AI-built funnels and social media content to spread the word.'),
        ('03', 'Earn Commissions', 'Get paid every time someone joins through your link. Build a team and earn more.'),
    ]
    for i, (num, title, desc) in enumerate(steps):
        sx = 50 + i * 350
        els.append({'id': _uid(), 'type': 'icontext', 'x': sx, 'y': y, 'w': 320, 'h': 115,
            'txt': f'<div style="display:flex;gap:16px;align-items:flex-start"><div style="font-family:Sora,sans-serif;font-size:24px;font-weight:900;color:#f59e0b;flex-shrink:0;width:40px">{num}</div><div><div style="font-family:Sora,sans-serif;font-weight:700;font-size:16px;color:#fff;margin-bottom:4px">{title}</div><div style="font-size:13px;color:#94a3b8;line-height:1.6">{desc}</div></div></div>',
            's': {}})
    y += 155

    # Testimonials
    els.append({'id': _uid(), 'type': 'testimonial', 'x': 50, 'y': y, 'w': 500, 'h': 170,
        'txt': '<div style="margin-bottom:8px"><span style="color:#fbbf24">★★★★★</span></div><div style="font-size:14px;color:#e2e8f0;line-height:1.7;font-style:italic;margin-bottom:10px">"I started as a complete beginner 4 months ago. Now I earn more from my side business than my day job pays me."</div><div style="font-size:13px;color:#64748b;font-weight:600">— Alex P., Network Marketer</div>',
        's': {'background': '#1e293b', 'borderRadius': '16px', 'borderLeft': '4px solid #f59e0b', 'padding': '20px'}})

    els.append({'id': _uid(), 'type': 'testimonial', 'x': 570, 'y': y, 'w': 500, 'h': 170,
        'txt': '<div style="margin-bottom:8px"><span style="color:#fbbf24">★★★★★</span></div><div style="font-size:14px;color:#e2e8f0;line-height:1.7;font-style:italic;margin-bottom:10px">"The tools do 90% of the work. I share my link on social media and the funnels convert. It really is that simple."</div><div style="font-size:13px;color:#64748b;font-weight:600">— Rachel K., Stay-at-Home Mum</div>',
        's': {'background': '#1e293b', 'borderRadius': '16px', 'borderLeft': '4px solid #f59e0b', 'padding': '20px'}})

    return {'els': els, 'canvasBg': '#1a1a2e'}


# ═══════════════════════════════════════════════════════════
# TEMPLATE 5: Webinar Registration
# ═══════════════════════════════════════════════════════════
def _webinar_registration(username):
    els = []
    y = 30

    els.append({'id': _uid(), 'type': 'label', 'x': _centre(250), 'y': y, 'w': 250, 'h': 30, 'txt': '🔴 FREE LIVE TRAINING', 's': {'fontFamily': 'DM Sans,sans-serif', 'fontWeight': '700', 'fontSize': '12px', 'color': '#ec4899', 'textAlign': 'center', 'background': 'rgba(236,72,153,0.1)', 'borderRadius': '20px', 'border': '1px solid rgba(236,72,153,0.2)'}})
    y += 65

    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(900), 'y': y, 'w': 900, 'h': 110, 'txt': 'How to Build a $5,000/Month Online Business in 90 Days', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '900', 'fontSize': '38px', 'color': '#fff', 'textAlign': 'center'}})
    y += 155

    els.append({'id': _uid(), 'type': 'text', 'x': _centre(650), 'y': y, 'w': 650, 'h': 75, 'txt': 'Join our FREE 60-minute masterclass and learn the exact 3-step system used by 10,000+ members to generate consistent online income.', 's': {'fontSize': '16px', 'color': '#94a3b8', 'textAlign': 'center', 'lineHeight': '1.8'}})
    y += 100

    # Countdown
    els.append({'id': _uid(), 'type': 'countdown', 'x': _centre(500), 'y': y, 'w': 500, 'h': 80, 'txt': '', 's': {}, '_targetDate': '2026-04-01T19:00'})
    y += 100

    # Registration form
    els.append({'id': _uid(), 'type': 'form', 'x': _centre(500), 'y': y, 'w': 500, 'h': 260,
        'txt': '<div style="text-align:center;padding:4px"><div style="font-family:Sora,sans-serif;font-weight:800;font-size:20px;color:#fff;margin-bottom:6px">Reserve Your Seat</div><div style="font-size:13px;color:#94a3b8;margin-bottom:16px">Seats are limited — register now</div><input placeholder="Your first name" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#1a1a2e;font-size:13px;margin-bottom:8px;box-sizing:border-box"><input placeholder="Your email" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#1a1a2e;font-size:13px;margin-bottom:10px;box-sizing:border-box"><div style="width:100%;padding:12px;border-radius:10px;background:#ec4899;color:#fff;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box">Save My Seat →</div></div>',
        's': {'background': 'rgba(15,23,41,0.6)', 'borderRadius': '18px', 'border': '1px solid rgba(236,72,153,0.15)', 'padding': '20px'},
        '_formHeading': 'Reserve Your Seat', '_formSubtitle': 'Seats are limited — register now', '_formBtnText': 'Save My Seat →', '_formBtnColor': '#ec4899', '_formShowName': True})
    y += 310

    # What you'll learn
    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(600), 'y': y, 'w': 600, 'h': 65, 'txt': 'In This Free Training You\'ll Discover:', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '800', 'fontSize': '24px', 'color': '#fff', 'textAlign': 'center'}})
    y += 75

    learns = [
        ('🎯', 'The 3-Step System', 'The exact framework our top earners use to generate $5K+ per month consistently'),
        ('🤖', 'AI Automation Secrets', 'How to let AI do 90% of the marketing work so you can focus on income'),
        ('💰', 'Commission Blueprint', 'The compensation structure that pays you monthly recurring income for life'),
    ]
    for i, (icon, title, desc) in enumerate(learns):
        lx = 50 + i * 350
        els.append({'id': _uid(), 'type': 'icontext', 'x': lx, 'y': y, 'w': 320, 'h': 105,
            'txt': f'<div style="display:flex;gap:16px;align-items:flex-start"><div style="font-size:28px;flex-shrink:0;width:40px;text-align:center">{icon}</div><div><div style="font-family:Sora,sans-serif;font-weight:700;font-size:15px;color:#fff;margin-bottom:4px">{title}</div><div style="font-size:13px;color:#94a3b8;line-height:1.6">{desc}</div></div></div>',
            's': {}})

    return {'els': els, 'canvasBg': '#1a0a1e'}


# ═══════════════════════════════════════════════════════════
# TEMPLATE 6: Coaching Program
# ═══════════════════════════════════════════════════════════
def _coaching_program(username):
    els = []
    y = 40

    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(800), 'y': y, 'w': 800, 'h': 90, 'txt': 'Transform Your Life With Expert Coaching', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '900', 'fontSize': '40px', 'color': '#fff', 'textAlign': 'center'}})
    y += 100

    els.append({'id': _uid(), 'type': 'text', 'x': _centre(650), 'y': y, 'w': 650, 'h': 75, 'txt': 'Personalised 1-on-1 coaching to help you build a thriving online business. Get clarity, accountability, and a proven roadmap to your income goals.', 's': {'fontSize': '16px', 'color': '#94a3b8', 'textAlign': 'center', 'lineHeight': '1.8'}})
    y += 100

    els.append({'id': _uid(), 'type': 'button', 'x': _centre(300), 'y': y, 'w': 300, 'h': 50, 'txt': 'Book a Free Call →', 'url': f'/ref/{username}', 's': {'background': '#6366f1', 'color': '#fff', 'fontFamily': 'Sora,sans-serif', 'fontWeight': '700', 'fontSize': '16px', 'textAlign': 'center', 'borderRadius': '12px', 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center'}})
    y += 155

    # What's included boxes
    includes = [
        ('📞', 'Weekly 1-on-1 Calls', 'Direct access to your coach for strategy sessions and accountability check-ins'),
        ('📋', 'Custom Action Plan', 'A personalised roadmap built around your goals, schedule and experience level'),
        ('🎓', 'Full Training Access', 'Complete library of courses, templates and tools included with your coaching'),
    ]
    for i, (icon, title, desc) in enumerate(includes):
        ix = 50 + i * 350
        els.append({'id': _uid(), 'type': 'review', 'x': ix, 'y': y, 'w': 320, 'h': 140,
            'txt': f'<div style="font-size:28px;margin-bottom:8px">{icon}</div><div style="font-family:Sora,sans-serif;font-weight:700;font-size:15px;color:#fff;margin-bottom:4px">{title}</div><div style="font-size:13px;color:#94a3b8;line-height:1.6">{desc}</div>',
            's': {'background': '#1e293b', 'borderRadius': '16px', 'borderLeft': '4px solid #6366f1', 'padding': '20px'}})
    y += 180

    # Testimonials
    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(500), 'y': y, 'w': 500, 'h': 65, 'txt': 'What Our Clients Say', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '800', 'fontSize': '24px', 'color': '#fff', 'textAlign': 'center'}})
    y += 75

    els.append({'id': _uid(), 'type': 'testimonial', 'x': 50, 'y': y, 'w': 500, 'h': 160,
        'txt': '<div style="margin-bottom:8px"><span style="color:#fbbf24">★★★★★</span></div><div style="font-size:14px;color:#e2e8f0;line-height:1.7;font-style:italic;margin-bottom:8px">"The coaching completely changed my approach. I went from struggling to earning consistently within 8 weeks."</div><div style="font-size:13px;color:#64748b;font-weight:600">— Emma T., Business Owner</div>',
        's': {'background': '#1e293b', 'borderRadius': '16px', 'borderLeft': '4px solid #fbbf24', 'padding': '20px'}})

    els.append({'id': _uid(), 'type': 'testimonial', 'x': 570, 'y': y, 'w': 500, 'h': 160,
        'txt': '<div style="margin-bottom:8px"><span style="color:#fbbf24">★★★★★</span></div><div style="font-size:14px;color:#e2e8f0;line-height:1.7;font-style:italic;margin-bottom:8px">"Having a personal coach who actually cares about my success made all the difference. Best investment I\'ve ever made."</div><div style="font-size:13px;color:#64748b;font-weight:600">— Marcus W., Entrepreneur</div>',
        's': {'background': '#1e293b', 'borderRadius': '16px', 'borderLeft': '4px solid #fbbf24', 'padding': '20px'}})

    return {'els': els, 'canvasBg': '#0f172a'}


# ═══════════════════════════════════════════════════════════
# TEMPLATE 7: Digital Product
# ═══════════════════════════════════════════════════════════
def _digital_product(username):
    els = []
    y = 40

    els.append({'id': _uid(), 'type': 'label', 'x': _centre(200), 'y': y, 'w': 200, 'h': 30, 'txt': '📚 INSTANT DOWNLOAD', 's': {'fontFamily': 'DM Sans,sans-serif', 'fontWeight': '700', 'fontSize': '12px', 'color': '#14b8a6', 'textAlign': 'center', 'background': 'rgba(20,184,166,0.1)', 'borderRadius': '20px', 'border': '1px solid rgba(20,184,166,0.2)'}})
    y += 65

    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(900), 'y': y, 'w': 900, 'h': 90, 'txt': 'The Ultimate Guide to Online Income', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '900', 'fontSize': '40px', 'color': '#fff', 'textAlign': 'center'}})
    y += 100

    els.append({'id': _uid(), 'type': 'text', 'x': _centre(700), 'y': y, 'w': 700, 'h': 75, 'txt': '97 pages of actionable strategies, templates and blueprints to build your first $1,000/month online — even if you\'re starting from zero.', 's': {'fontSize': '16px', 'color': '#94a3b8', 'textAlign': 'center', 'lineHeight': '1.8'}})
    y += 155

    # What's inside
    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(400), 'y': y, 'w': 400, 'h': 55, 'txt': 'What\'s Inside:', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '800', 'fontSize': '22px', 'color': '#14b8a6', 'textAlign': 'center'}})
    y += 65

    items = [
        '✓ Chapter 1: Choosing Your Niche (with AI research tool)',
        '✓ Chapter 2: Building Your First Funnel in 30 Minutes',
        '✓ Chapter 3: Traffic Strategies That Work in 2026',
        '✓ Chapter 4: Email Marketing That Converts',
        '✓ Chapter 5: Scaling to $5,000/Month and Beyond',
        '✓ BONUS: 10 Ready-Made Social Media Templates',
    ]
    for i, item in enumerate(items):
        els.append({'id': _uid(), 'type': 'text', 'x': _centre(500), 'y': y + i * 30, 'w': 500, 'h': 25,
            'txt': item, 's': {'fontSize': '15px', 'color': '#e2e8f0', 'textAlign': 'center'}})
    y += len(items) * 30 + 30

    els.append({'id': _uid(), 'type': 'button', 'x': _centre(350), 'y': y, 'w': 350, 'h': 56, 'txt': 'Download Now — Free', 'url': f'/ref/{username}', 's': {'background': '#14b8a6', 'color': '#fff', 'fontFamily': 'Sora,sans-serif', 'fontWeight': '700', 'fontSize': '18px', 'textAlign': 'center', 'borderRadius': '14px', 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center'}})
    y += 100

    els.append({'id': _uid(), 'type': 'text', 'x': _centre(400), 'y': y, 'w': 400, 'h': 25, 'txt': '⚡ Instant delivery to your inbox — no spam, ever.', 's': {'fontSize': '13px', 'color': '#64748b', 'textAlign': 'center'}})

    return {'els': els, 'canvasBg': '#0c1222'}


# ═══════════════════════════════════════════════════════════
# TEMPLATE 8: Affiliate Funnel
# ═══════════════════════════════════════════════════════════
def _affiliate_funnel(username):
    els = []
    y = 40

    els.append({'id': _uid(), 'type': 'label', 'x': _centre(250), 'y': y, 'w': 250, 'h': 30, 'txt': '💰 EARN 50% COMMISSIONS', 's': {'fontFamily': 'DM Sans,sans-serif', 'fontWeight': '700', 'fontSize': '12px', 'color': '#ef4444', 'textAlign': 'center', 'background': 'rgba(239,68,68,0.1)', 'borderRadius': '20px', 'border': '1px solid rgba(239,68,68,0.2)'}})
    y += 65

    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(900), 'y': y, 'w': 900, 'h': 110, 'txt': 'Turn Your Network Into a Money-Making Machine', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '900', 'fontSize': '40px', 'color': '#fff', 'textAlign': 'center'}})
    y += 155

    els.append({'id': _uid(), 'type': 'text', 'x': _centre(700), 'y': y, 'w': 700, 'h': 75, 'txt': 'Share your unique link. Earn 50% commission on every referral. Get paid monthly — it\'s that simple. No products to create, no orders to fulfil.', 's': {'fontSize': '16px', 'color': '#94a3b8', 'textAlign': 'center', 'lineHeight': '1.8'}})
    y += 100

    # Earnings potential
    els.append({'id': _uid(), 'type': 'heading', 'x': _centre(500), 'y': y, 'w': 500, 'h': 55, 'txt': 'Your Earning Potential:', 's': {'fontFamily': 'Sora,sans-serif', 'fontWeight': '800', 'fontSize': '22px', 'color': '#fff', 'textAlign': 'center'}})
    y += 65

    earnings = [('10 Referrals', '$150/mo', '#10b981'), ('50 Referrals', '$750/mo', '#0ea5e9'), ('100 Referrals', '$1,500/mo', '#8b5cf6'), ('500 Referrals', '$7,500/mo', '#ef4444')]
    for i, (refs, income, color) in enumerate(earnings):
        ex = 60 + i * 260
        els.append({'id': _uid(), 'type': 'stat', 'x': ex, 'y': y, 'w': 230, 'h': 80,
            'txt': f'<div style="font-family:Sora,sans-serif;font-size:28px;font-weight:900;color:{color}">{income}</div><div style="font-size:12px;color:#64748b;margin-top:2px">{refs}</div>',
            's': {'textAlign': 'center'}})
    y += 145

    els.append({'id': _uid(), 'type': 'button', 'x': _centre(400), 'y': y, 'w': 400, 'h': 56, 'txt': 'Start Earning Now →', 'url': f'/ref/{username}', 's': {'background': 'linear-gradient(135deg,#ef4444,#f59e0b)', 'color': '#fff', 'fontFamily': 'Sora,sans-serif', 'fontWeight': '700', 'fontSize': '18px', 'textAlign': 'center', 'borderRadius': '14px', 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center'}})
    y += 155

    # How it works
    steps = [
        ('1️⃣', 'Get Your Link', 'Sign up and get your unique referral link in 60 seconds flat.'),
        ('2️⃣', 'Share Everywhere', 'Post on social media, send to friends, use our marketing templates.'),
        ('3️⃣', 'Get Paid Monthly', 'Earn 50% of every subscription — paid directly to your account.'),
    ]
    for i, (icon, title, desc) in enumerate(steps):
        sx = 50 + i * 350
        els.append({'id': _uid(), 'type': 'icontext', 'x': sx, 'y': y, 'w': 320, 'h': 105,
            'txt': f'<div style="display:flex;gap:16px;align-items:flex-start"><div style="font-size:28px;flex-shrink:0;width:40px;text-align:center">{icon}</div><div><div style="font-family:Sora,sans-serif;font-weight:700;font-size:15px;color:#fff;margin-bottom:4px">{title}</div><div style="font-size:13px;color:#94a3b8;line-height:1.6">{desc}</div></div></div>',
            's': {}})

    return {'els': els, 'canvasBg': '#1a1a2e'}


# ═══════════════════════════════════════════════════════════
# Registry
# ═══════════════════════════════════════════════════════════
BUILDERS = {
    'lead-capture': _lead_capture,
    'video-sales': _video_sales,
    'product-offer': _product_offer,
    'network-opportunity': _business_opportunity,
    'webinar-registration': _webinar_registration,
    'coaching-program': _coaching_program,
    'digital-product': _digital_product,
    'affiliate-income': _affiliate_funnel,
}
