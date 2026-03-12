"""
SuperAdPro Funnel Templates
Pre-configured canvas element arrays for the page builder.
Each template is a dict with: name, description, category, icon, bg_color, elements[]
"""
import secrets

def _uid():
    return 'e' + secrets.token_hex(6)

def get_templates():
    return [
        lead_capture_template(),
        vsl_template(),
        product_offer_template(),
        webinar_template(),
        bio_link_template(),
        affiliate_recruit_template(),
    ]

def lead_capture_template():
    els = []
    y = 30
    # Logo
    els.append({'id':_uid(),'type':'text','x':30,'y':y,'w':280,'h':35,'txt':'<span style="font-family:Sora,sans-serif;font-weight:800;font-size:18px;color:#fff">Your<span style="color:#38bdf8">Brand</span></span>','s':{}})
    y += 70
    # Headline
    els.append({'id':_uid(),'type':'heading','x':50,'y':y,'w':1000,'h':60,'txt':'Get Your Free Guide to [Your Topic]','s':{'fontFamily':'Sora,sans-serif','fontWeight':'900','fontSize':'42px','color':'#ffffff','textAlign':'center'}})
    y += 80
    # Subheadline
    els.append({'id':_uid(),'type':'text','x':150,'y':y,'w':800,'h':40,'txt':'Discover the exact strategies that [target audience] are using to [achieve desired result] — without [common pain point].','s':{'fontFamily':'Outfit,sans-serif','fontSize':'17px','color':'#94a3b8','textAlign':'center','lineHeight':'1.7'}})
    y += 60
    # Video placeholder
    els.append({'id':_uid(),'type':'video','x':150,'y':y,'w':800,'h':450,'txt':'','s':{}})
    y += 480
    # Email capture form
    els.append({'id':_uid(),'type':'form','x':250,'y':y,'w':600,'h':280,'txt':'<div style="text-align:center;padding:4px" data-redirect="" data-thankyou="You are in! Check your inbox."><div style="font-family:Sora,sans-serif;font-weight:800;font-size:20px;color:#fff;margin-bottom:6px">Download Your Free Guide</div><div style="font-size:13px;color:#94a3b8;margin-bottom:16px">Enter your details below and we\'ll send it straight to your inbox</div><input placeholder="Your first name" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:13px;margin-bottom:8px;box-sizing:border-box"><input placeholder="Your email" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:13px;margin-bottom:10px;box-sizing:border-box"><div style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box;cursor:pointer">Get Instant Access →</div></div>','s':{'background':'rgba(15,23,41,0.4)','borderRadius':'18px','border':'1px solid rgba(14,165,233,0.12)','padding':'24px'}})
    y += 310
    # Trust badges
    els.append({'id':_uid(),'type':'text','x':200,'y':y,'w':700,'h':30,'txt':'<span style="font-size:12px;color:#475569">🔒 We respect your privacy. Unsubscribe anytime. No spam, ever.</span>','s':{'textAlign':'center'}})
    y += 50
    # Features
    els.append({'id':_uid(),'type':'text','x':150,'y':y,'w':800,'h':200,'txt':'<div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#0ea5e9;font-weight:700">✓</span> Step-by-step instructions you can follow today</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#0ea5e9;font-weight:700">✓</span> Real examples from people who\'ve done it</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#0ea5e9;font-weight:700">✓</span> No experience or technical skills required</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#0ea5e9;font-weight:700">✓</span> Completely free — no credit card needed</div>','s':{}})
    y += 230
    # Disclaimer
    els.append({'id':_uid(),'type':'text','x':200,'y':y,'w':700,'h':25,'txt':'<span style="font-size:11px;color:#475569">Results vary. This is educational content, not a guarantee of income.</span>','s':{'textAlign':'center'}})

    return {
        'name': 'Lead Capture',
        'description': 'Email capture with headline, video, form and feature list',
        'category': 'lead_capture',
        'icon': '📧',
        'bg_color': '#050d1a',
        'elements': els,
    }

def vsl_template():
    els = []
    y = 30
    els.append({'id':_uid(),'type':'text','x':30,'y':y,'w':280,'h':35,'txt':'<span style="font-family:Sora,sans-serif;font-weight:800;font-size:18px;color:#fff">Your<span style="color:#38bdf8">Brand</span></span>','s':{}})
    y += 80
    # Attention headline
    els.append({'id':_uid(),'type':'text','x':150,'y':y,'w':800,'h':30,'txt':'<span style="font-family:DM Sans,sans-serif;font-weight:700;font-size:14px;color:#f59e0b;letter-spacing:2px;text-transform:uppercase">⚡ FREE TRAINING — WATCH NOW</span>','s':{'textAlign':'center'}})
    y += 40
    els.append({'id':_uid(),'type':'heading','x':50,'y':y,'w':1000,'h':70,'txt':'How [Audience] Are Getting [Result] in [Timeframe] Without [Pain Point]','s':{'fontFamily':'Sora,sans-serif','fontWeight':'900','fontSize':'38px','color':'#ffffff','textAlign':'center','lineHeight':'1.15'}})
    y += 90
    els.append({'id':_uid(),'type':'text','x':200,'y':y,'w':700,'h':35,'txt':'Watch this short video to discover the method that\'s changing everything.','s':{'fontFamily':'Outfit,sans-serif','fontSize':'16px','color':'#94a3b8','textAlign':'center'}})
    y += 55
    # Video
    els.append({'id':_uid(),'type':'video','x':100,'y':y,'w':900,'h':506,'txt':'','s':{}})
    y += 530
    # CTA Button
    els.append({'id':_uid(),'type':'cta','x':250,'y':y,'w':600,'h':60,'txt':'Get Started Now — It\'s Free →','s':{'background':'linear-gradient(135deg,#0ea5e9,#6366f1)','color':'#fff','fontFamily':'Sora,sans-serif','fontWeight':'800','fontSize':'20px','textAlign':'center','borderRadius':'14px','display':'flex','alignItems':'center','justifyContent':'center','boxShadow':'0 0 40px rgba(14,165,233,0.25)'},'url':'/register'})
    y += 90
    # Social proof
    els.append({'id':_uid(),'type':'text','x':150,'y':y,'w':800,'h':120,'txt':'<div style="font-size:15px;color:#e2e8f0;line-height:1.7;font-style:italic;margin-bottom:12px">"I was skeptical at first, but after watching the training I knew this was different. Within 2 weeks I had my first results."</div><div style="font-size:13px;color:#64748b;font-weight:600">— Sarah M., Small Business Owner</div>','s':{'background':'#1e293b','borderRadius':'16px','borderLeft':'4px solid #0ea5e9','padding':'24px'}})
    y += 150
    # Second CTA
    els.append({'id':_uid(),'type':'button','x':300,'y':y,'w':500,'h':50,'txt':'Watch the Training →','s':{'background':'linear-gradient(135deg,#10b981,#059669)','color':'#fff','fontFamily':'Sora,sans-serif','fontWeight':'700','fontSize':'16px','textAlign':'center','borderRadius':'12px','display':'flex','alignItems':'center','justifyContent':'center'},'url':'/register'})

    return {
        'name': 'Video Sales Letter',
        'description': 'Video-led page with attention headline, VSL, social proof and CTA',
        'category': 'vsl',
        'icon': '🎬',
        'bg_color': '#050d1a',
        'elements': els,
    }

def product_offer_template():
    els = []
    y = 30
    els.append({'id':_uid(),'type':'text','x':30,'y':y,'w':280,'h':35,'txt':'<span style="font-family:Sora,sans-serif;font-weight:800;font-size:18px;color:#fff">Your<span style="color:#10b981">Product</span></span>','s':{}})
    y += 80
    # Badge
    els.append({'id':_uid(),'type':'text','x':400,'y':y,'w':300,'h':28,'txt':'<span style="font-size:12px;font-weight:700;color:#10b981;background:rgba(16,185,129,0.1);padding:6px 16px;border-radius:20px;border:1px solid rgba(16,185,129,0.2)">🏆 MOST POPULAR</span>','s':{'textAlign':'center'}})
    y += 45
    els.append({'id':_uid(),'type':'heading','x':100,'y':y,'w':900,'h':55,'txt':'The Complete [Product Name] Package','s':{'fontFamily':'Sora,sans-serif','fontWeight':'900','fontSize':'36px','color':'#ffffff','textAlign':'center'}})
    y += 70
    els.append({'id':_uid(),'type':'text','x':150,'y':y,'w':800,'h':40,'txt':'Everything you need to [achieve goal] — all in one place, at one price.','s':{'fontFamily':'Outfit,sans-serif','fontSize':'17px','color':'#94a3b8','textAlign':'center'}})
    y += 60
    # Image placeholder
    els.append({'id':_uid(),'type':'image','x':200,'y':y,'w':700,'h':350,'txt':'','s':{'background':'#1e293b','borderRadius':'16px','border':'1px dashed #334155','display':'flex','alignItems':'center','justifyContent':'center','color':'#475569','fontSize':'13px'}})
    y += 380
    # Price
    els.append({'id':_uid(),'type':'text','x':300,'y':y,'w':500,'h':60,'txt':'<div style="text-align:center"><span style="font-size:16px;color:#64748b;text-decoration:line-through">$197</span> <span style="font-family:Sora,sans-serif;font-size:48px;font-weight:900;color:#10b981">$97</span> <span style="font-size:14px;color:#64748b">one-time</span></div>','s':{}})
    y += 80
    # CTA
    els.append({'id':_uid(),'type':'cta','x':250,'y':y,'w':600,'h':56,'txt':'Get Instant Access →','s':{'background':'linear-gradient(135deg,#10b981,#059669)','color':'#fff','fontFamily':'Sora,sans-serif','fontWeight':'800','fontSize':'18px','textAlign':'center','borderRadius':'14px','display':'flex','alignItems':'center','justifyContent':'center','boxShadow':'0 0 40px rgba(16,185,129,0.2)'},'url':'/register'})
    y += 80
    # Features
    els.append({'id':_uid(),'type':'text','x':150,'y':y,'w':800,'h':250,'txt':'<div style="font-family:Sora,sans-serif;font-weight:700;font-size:18px;color:#fff;margin-bottom:16px;text-align:center">What\'s Included:</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#10b981;font-weight:700">✓</span> Complete video training course (10+ hours)</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#10b981;font-weight:700">✓</span> Downloadable templates and worksheets</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#10b981;font-weight:700">✓</span> Private community access</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#10b981;font-weight:700">✓</span> 30-day money-back guarantee</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#10b981;font-weight:700">✓</span> Lifetime updates included</div>','s':{}})
    y += 280
    # Guarantee
    els.append({'id':_uid(),'type':'text','x':250,'y':y,'w':600,'h':80,'txt':'<div style="text-align:center;font-size:14px;color:#94a3b8;line-height:1.7"><span style="font-size:24px">🛡️</span><br><strong style="color:#fff">30-Day Money-Back Guarantee</strong><br>Try it risk-free. If it\'s not for you, get a full refund.</div>','s':{'background':'rgba(255,255,255,0.03)','borderRadius':'12px','border':'1px solid rgba(255,255,255,0.06)','padding':'16px'}})

    return {
        'name': 'Product Offer',
        'description': 'Sales page with pricing, features, guarantee and CTA',
        'category': 'product',
        'icon': '🛍️',
        'bg_color': '#050d1a',
        'elements': els,
    }

def webinar_template():
    els = []
    y = 30
    els.append({'id':_uid(),'type':'text','x':30,'y':y,'w':280,'h':35,'txt':'<span style="font-family:Sora,sans-serif;font-weight:800;font-size:18px;color:#fff">Your<span style="color:#f59e0b">Brand</span></span>','s':{}})
    y += 70
    # Urgency badge
    els.append({'id':_uid(),'type':'text','x':350,'y':y,'w':400,'h':30,'txt':'<span style="font-size:12px;font-weight:700;color:#f43f5e;background:rgba(244,63,94,0.1);padding:6px 16px;border-radius:20px;border:1px solid rgba(244,63,94,0.2)">🔴 LIVE EVENT — LIMITED SPOTS</span>','s':{'textAlign':'center'}})
    y += 50
    els.append({'id':_uid(),'type':'heading','x':50,'y':y,'w':1000,'h':70,'txt':'Free Live Training: How to [Achieve Specific Result] in [Timeframe]','s':{'fontFamily':'Sora,sans-serif','fontWeight':'900','fontSize':'36px','color':'#ffffff','textAlign':'center','lineHeight':'1.15'}})
    y += 85
    els.append({'id':_uid(),'type':'text','x':150,'y':y,'w':800,'h':35,'txt':'Join [Your Name] for a free 60-minute masterclass that will change how you think about [topic].','s':{'fontFamily':'Outfit,sans-serif','fontSize':'16px','color':'#94a3b8','textAlign':'center'}})
    y += 55
    # Date/time
    els.append({'id':_uid(),'type':'text','x':300,'y':y,'w':500,'h':70,'txt':'<div style="text-align:center"><div style="font-family:Sora,sans-serif;font-size:24px;font-weight:800;color:#f59e0b">Thursday, [Date] at 7PM GMT</div><div style="font-size:13px;color:#64748b;margin-top:4px">Can\'t make it live? Register anyway — we\'ll send you the replay.</div></div>','s':{'background':'rgba(245,158,11,0.08)','borderRadius':'12px','border':'1px solid rgba(245,158,11,0.15)','padding':'16px'}})
    y += 100
    # Registration form
    els.append({'id':_uid(),'type':'form','x':250,'y':y,'w':600,'h':280,'txt':'<div style="text-align:center;padding:4px" data-redirect="" data-thankyou="You are in! Check your inbox."><div style="font-family:Sora,sans-serif;font-weight:800;font-size:20px;color:#fff;margin-bottom:6px">Reserve Your Free Spot</div><div style="font-size:13px;color:#94a3b8;margin-bottom:16px">Enter your details to secure your place</div><input placeholder="Your first name" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:13px;margin-bottom:8px;box-sizing:border-box"><input placeholder="Your email" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:13px;margin-bottom:10px;box-sizing:border-box"><div style="width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;font-weight:700;font-size:14px;text-align:center;box-sizing:border-box;cursor:pointer">Save My Spot →</div></div>','s':{'background':'rgba(15,23,41,0.5)','borderRadius':'18px','border':'1px solid rgba(245,158,11,0.12)','padding':'24px'}})
    y += 310
    # What you'll learn
    els.append({'id':_uid(),'type':'text','x':150,'y':y,'w':800,'h':220,'txt':'<div style="font-family:Sora,sans-serif;font-weight:700;font-size:18px;color:#fff;margin-bottom:16px;text-align:center">In this training you\'ll discover:</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#f59e0b;font-weight:700">①</span> The #1 mistake that keeps [audience] stuck — and how to fix it</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#f59e0b;font-weight:700">②</span> The exact framework used by [successful people] to [get result]</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#f59e0b;font-weight:700">③</span> A live demonstration you can follow along with</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#f59e0b;font-weight:700">④</span> Your personal action plan to implement immediately</div>','s':{}})

    return {
        'name': 'Webinar Registration',
        'description': 'Event signup with date, urgency, registration form and agenda',
        'category': 'webinar',
        'icon': '🎤',
        'bg_color': '#050d1a',
        'elements': els,
    }

def bio_link_template():
    els = []
    y = 40
    # Avatar placeholder
    els.append({'id':_uid(),'type':'image','x':475,'y':y,'w':150,'h':150,'txt':'','s':{'background':'linear-gradient(135deg,#0ea5e9,#6366f1)','borderRadius':'50%','border':'3px solid rgba(255,255,255,0.15)','display':'flex','alignItems':'center','justifyContent':'center','color':'#fff','fontSize':'40px'}})
    y += 170
    els.append({'id':_uid(),'type':'heading','x':250,'y':y,'w':600,'h':40,'txt':'Your Name','s':{'fontFamily':'Sora,sans-serif','fontWeight':'800','fontSize':'28px','color':'#ffffff','textAlign':'center'}})
    y += 45
    els.append({'id':_uid(),'type':'text','x':250,'y':y,'w':600,'h':30,'txt':'Entrepreneur | Coach | [Your Niche]','s':{'fontFamily':'Outfit,sans-serif','fontSize':'15px','color':'#94a3b8','textAlign':'center'}})
    y += 50
    # Bio
    els.append({'id':_uid(),'type':'text','x':200,'y':y,'w':700,'h':50,'txt':'Helping [target audience] achieve [specific result]. Based in [location]. Let\'s connect!','s':{'fontFamily':'Outfit,sans-serif','fontSize':'14px','color':'#64748b','textAlign':'center','lineHeight':'1.7'}})
    y += 70
    # Link buttons
    links = [
        ('🎬 Watch My Free Training', '#0ea5e9', '#0284c7'),
        ('📧 Join My Email List', '#6366f1', '#4f46e5'),
        ('🛍️ Shop My Products', '#10b981', '#059669'),
        ('📱 Follow Me on Instagram', '#f43f5e', '#e11d48'),
        ('🎤 Book a Free Call', '#f59e0b', '#d97706'),
    ]
    for label, c1, c2 in links:
        els.append({'id':_uid(),'type':'button','x':200,'y':y,'w':700,'h':50,'txt':label,'s':{'background':f'linear-gradient(135deg,{c1},{c2})','color':'#fff','fontFamily':'Outfit,sans-serif','fontWeight':'700','fontSize':'15px','textAlign':'center','borderRadius':'12px','display':'flex','alignItems':'center','justifyContent':'center'},'url':'#'})
        y += 62

    return {
        'name': 'Bio Link Page',
        'description': 'Personal bio with avatar, links and social — like Linktree but yours',
        'category': 'bio',
        'icon': '👤',
        'bg_color': '#0c1220',
        'elements': els,
    }

def affiliate_recruit_template():
    els = []
    y = 30
    els.append({'id':_uid(),'type':'text','x':30,'y':y,'w':350,'h':35,'txt':'<span style="font-family:Sora,sans-serif;font-weight:800;font-size:18px;color:#fff">SuperAd<span style="color:#38bdf8">Pro</span></span>','s':{}})
    y += 80
    els.append({'id':_uid(),'type':'heading','x':50,'y':y,'w':1000,'h':65,'txt':'Your Complete Online Business — Ready in Minutes','s':{'fontFamily':'Sora,sans-serif','fontWeight':'900','fontSize':'40px','color':'#ffffff','textAlign':'center','lineHeight':'1.15'}})
    y += 80
    els.append({'id':_uid(),'type':'text','x':150,'y':y,'w':800,'h':40,'txt':'Four income streams. AI marketing tools. Instant commissions. Everything you need to build a real online business — all in one platform.','s':{'fontFamily':'Outfit,sans-serif','fontSize':'16px','color':'#94a3b8','textAlign':'center','lineHeight':'1.7'}})
    y += 60
    # Video
    els.append({'id':_uid(),'type':'video','x':150,'y':y,'w':800,'h':450,'txt':'','s':{}})
    y += 480
    # Stats row
    stats = [('$20','To Start',50,'#10b981'),('4','Income Streams',280,'#0ea5e9'),('95%','Paid Out',510,'#f59e0b'),('9','AI Tools',740,'#6366f1')]
    for val, label, x_off, color in stats:
        els.append({'id':_uid(),'type':'text','x':x_off+50,'y':y,'w':180,'h':70,'txt':f'<div style="text-align:center"><div style="font-family:Sora,sans-serif;font-size:32px;font-weight:900;color:{color}">{val}</div><div style="font-size:12px;color:#64748b;margin-top:2px">{label}</div></div>','s':{}})
    y += 100
    # CTA
    els.append({'id':_uid(),'type':'cta','x':200,'y':y,'w':700,'h':60,'txt':'Join SuperAdPro — Start for $20 →','s':{'background':'linear-gradient(135deg,#0ea5e9,#6366f1)','color':'#fff','fontFamily':'Sora,sans-serif','fontWeight':'800','fontSize':'20px','textAlign':'center','borderRadius':'14px','display':'flex','alignItems':'center','justifyContent':'center','boxShadow':'0 0 50px rgba(14,165,233,0.2)'},'url':'/register'})
    y += 90
    # Features
    els.append({'id':_uid(),'type':'text','x':100,'y':y,'w':900,'h':220,'txt':'<div style="font-family:Sora,sans-serif;font-weight:700;font-size:18px;color:#fff;margin-bottom:16px;text-align:center">What You Get as a Member:</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#0ea5e9;font-weight:700">✓</span> 50% commission on every referral — every month</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#0ea5e9;font-weight:700">✓</span> 8-tier income grid with up to $3,200 completion bonus</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#0ea5e9;font-weight:700">✓</span> AI-powered marketing suite — funnels, emails, social posts</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#0ea5e9;font-weight:700">✓</span> Course marketplace with pass-up commissions up to $500</div><div style="display:flex;gap:10px;padding:10px 0;font-size:14px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.05)"><span style="color:#0ea5e9;font-weight:700">✓</span> Watch to Earn — get paid to watch member campaigns</div>','s':{}})
    y += 250
    # Disclaimer
    els.append({'id':_uid(),'type':'text','x':200,'y':y,'w':700,'h':25,'txt':'<span style="font-size:11px;color:#475569">Income examples are illustrative. Results depend on individual effort and activity.</span>','s':{'textAlign':'center'}})

    return {
        'name': 'Affiliate Recruit',
        'description': 'SuperAdPro recruitment page with video, stats, features and join CTA',
        'category': 'recruit',
        'icon': '🚀',
        'bg_color': '#050d1a',
        'elements': els,
    }
