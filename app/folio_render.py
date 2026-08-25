"""
Folio renderer — turns stored page section-data into clean, safe, standalone HTML.

A page is stored as: accent (hex) + sections [{type, props}]. This module maps each
section type to responsive HTML built from the Folio design-system tokens. All member
text is HTML-escaped so a published page can't be injected into. Kept deliberately in
sync with the front-end section library (same class names, same markup shape).
"""
import html

AV = "https://i.pravatar.cc/"


def esc(v, default=""):
    if v is None:
        v = default
    return html.escape(str(v))


def lnk(p, f):
    u = p.get(f + "_href")
    u = u.strip() if isinstance(u, str) else ""
    return ' href="' + html.escape(u) + '"' if u else ' href="#"'


def imgurl(p, f, default):
    u = p.get(f)
    u = u.strip() if isinstance(u, str) and u.strip() else default
    for c in ('"', "'", '(', ')', '\\', ' ', '\n'):
        u = u.replace(c, '')
    return u


# --- section renderers (each takes a props dict, returns HTML) ---
def _nav(p):
    return ('<div class="s-nav"><div class="fo-wr in">'
            '<div class="fo-logo"><span class="m">\u2726</span> ' + esc(p.get("brand"), "YourBrand") + '</div>'
            '<div class="links"><a' + lnk(p, "l1") + '>' + esc(p.get("l1"), "Features") + '</a><a' + lnk(p, "l2") + '>' + esc(p.get("l2"), "Pricing") + '</a>'
            '<a class="fo-btn"' + lnk(p, "cta") + '>' + esc(p.get("cta"), "Get started") + '</a></div></div></div>')


def _hero(p):
    head = esc(p.get("headline"), "27 free traffic sources")
    accent = esc(p.get("headline_accent"), "most marketers never touch.")
    return ('<div class="s s-hero"><div class="fo-wr g"><div>'
            '<div class="fo-eyebrow">' + esc(p.get("eyebrow"), "Free download \u00b7 2026") + '</div>'
            '<h1>' + head + ' <span class="u">' + accent + '</span></h1>'
            '<p class="fo-lede">' + esc(p.get("lede"), "Find buyers without paying for ads \u2014 with a simple daily routine you can start today.") + '</p>'
            '<form class="fo-form fo-optin" style="margin-top:22px"><input class="fo-input" type="email" name="email" required placeholder="' + esc(p.get("placeholder"), "Your best email") + '"/>'
            '<button class="fo-btn" type="submit">' + esc(p.get("button"), "Send the playbook") + '</button></form>'
            '<div class="rea"><div class="avs"><span style="background-image:url(' + AV + '56?img=12)"></span>'
            '<span style="background-image:url(' + AV + '56?img=32)"></span><span style="background-image:url(' + AV + '56?img=45)"></span></div>'
            '<div class="t"><span class="stars">\u2605\u2605\u2605\u2605\u2605</span><br>' + esc(p.get("proof"), "9,400+ downloads") + '</div></div>'
            '</div><div class="cover-stage"><div class="cover"><div class="seal"><b>' + esc(p.get("seal"), "FREE") + '</b><span>Guide</span></div>'
            '<div class="kk">' + esc(p.get("coverKk"), "The Playbook") + '</div>'
            '<div class="ct">' + esc(p.get("coverTitle"), "27 Free Traffic Sources") + '</div>'
            '<div class="cs">' + esc(p.get("coverSub"), "Where to find buyers without spending a penny.") + '</div></div></div></div></div>')


def _hero_center(p):
    return ('<div class="s s-herocenter"><div class="fo-wr">'
            '<span class="badge">' + esc(p.get("badge"), "\u2605 Loved by 9,400 marketers") + '</span>'
            '<h1 class="fo-disp">' + esc(p.get("headline"), "The last traffic course you'll ever need to buy.") + '</h1>'
            '<p class="fo-lede">' + esc(p.get("lede"), "Everything that actually works, in one place \u2014 no fluff, no theory, no monthly fees.") + '</p>'
            '<div class="btns"><a class="fo-btn"' + lnk(p, "button") + '>' + esc(p.get("button"), "Get instant access") + '</a>'
            '<a class="fo-btn fo-btn--ghost"' + lnk(p, "button2") + '>' + esc(p.get("button2"), "Watch the trailer") + '</a></div></div></div>')


def _stat(p, k, dn, dl):
    return '<div><div class="n">' + esc(p.get(k + "n"), dn) + '</div><div class="l">' + esc(p.get(k + "l"), dl) + '</div></div>'


def _stats(p):
    return ('<div class="s-stats"><div class="fo-wr g">'
            + _stat(p, "a", "27", "Free sources") + _stat(p, "b", "0", "Ad spend")
            + _stat(p, "c", "9.4k", "Downloads") + _stat(p, "d", "4.9", "Rating") + '</div></div>')


def _card(p, k, dic, dt, dp):
    return ('<div class="card"><div class="ic">' + esc(p.get(k + "i"), dic) + '</div>'
            '<h3>' + esc(p.get(k + "t"), dt) + '</h3><p>' + esc(p.get(k + "p"), dp) + '</p></div>')


def _features(p):
    return ('<div class="s s-features"><div class="fo-wr">'
            '<div class="fo-eyebrow">' + esc(p.get("eyebrow"), "Inside") + '</div>'
            '<h2 class="fo-disp">' + esc(p.get("heading"), "Everything you need to start this week.") + '</h2>'
            '<p class="sub">' + esc(p.get("sub"), "No fluff \u2014 just the sources, the scripts, and the routine.") + '</p><div class="cards">'
            + _card(p, "c1", "\u25ce", "The 27 sources", "Ranked by speed and effort so you start where it's easiest.")
            + _card(p, "c2", "\u270e", "Copy-paste scripts", "The exact posts and hooks that get clicks \u2014 swipe them.")
            + _card(p, "c3", "\u21bb", "The daily routine", "A 30-minute checklist that keeps visitors coming.")
            + '</div></div></div>')


def _shot(p):
    u = imgurl(p, "shot", "")
    if u:
        return '<div class="shot shot-img" style="background-image:url(' + u + ');background-size:cover;background-position:center"></div>'
    return '<div class="shot"></div>'


def _featrow(p):
    lis = ("<li>" + esc(p.get("k1"), "A ranked list so you start easy") + "</li>"
           "<li>" + esc(p.get("k2"), "Ready-made copy for every platform") + "</li>"
           "<li>" + esc(p.get("k3"), "A simple daily checklist") + "</li>")
    return ('<div class="s s-featrow"><div class="fo-wr g"><div>'
            '<div class="fo-eyebrow">' + esc(p.get("eyebrow"), "Built for speed") + '</div>'
            '<h2 class="fo-disp">' + esc(p.get("heading"), "Set it up once. Watch it work every day.") + '</h2>'
            '<p class="fo-lede">' + esc(p.get("lede"), "You don't need a following or a budget \u2014 just a plan you'll stick to.") + '</p>'
            '<ul class="chk">' + lis + '</ul></div>' + _shot(p) + '</div></div>')


def _step(p, k, dn, dt, dp):
    return ('<div class="step"><div class="num">' + esc(p.get(k + "n"), dn) + '</div>'
            '<h3>' + esc(p.get(k + "t"), dt) + '</h3><p>' + esc(p.get(k + "p"), dp) + '</p></div>')


def _steps(p):
    return ('<div class="s s-steps"><div class="fo-wr"><div class="head">'
            '<div class="fo-eyebrow" style="text-align:center">' + esc(p.get("eyebrow"), "Three steps") + '</div>'
            '<h2 class="fo-disp">' + esc(p.get("heading"), "Up and running in an afternoon.") + '</h2></div><div class="g">'
            + _step(p, "s1", "1", "Grab it", "Drop your email and it lands in seconds. Free, no card.")
            + _step(p, "s2", "2", "Pick sources", "Start with the three easiest using the ready-made scripts.")
            + _step(p, "s3", "3", "Run the routine", "Thirty minutes a day and the visitors show up.")
            + '</div></div></div>')


def _quote(p):
    q = esc(p.get("quote"), "I stopped burning money on ads and doubled my leads in a month.")
    hl = esc(p.get("highlight"), "")
    body = ('"' + q + '"') if not hl else ('"' + q + ' <span class="hl">' + hl + '</span>"')
    return ('<div class="s s-quote"><div class="fo-wr"><p class="q fo-disp">' + body + '</p>'
            '<div class="qby"><div class="a" style="background-image:url(' + imgurl(p, "avatar", AV + "96?img=47") + ')"></div>'
            '<div class="n"><b>' + esc(p.get("name"), "Dana Reyes") + '</b><span>' + esc(p.get("role"), "Affiliate marketer") + '</span></div></div></div></div>')


def _plan(p, k, dn, dpr, feat, tag, items):
    lis = "".join("<li>" + esc(x) + "</li>" for x in items)
    tg = ('<div class="tag">' + esc(tag) + '</div>') if tag else ''
    btncls = "fo-btn" if feat else "fo-btn fo-btn--ghost"
    return ('<div class="plan' + (' feat' if feat else '') + '">' + tg
            + '<div class="pn">' + esc(p.get(k + "n"), dn) + '</div>'
            + '<div class="pr">' + esc(p.get(k + "pr"), dpr) + '<span>/mo</span></div>'
            + '<ul>' + lis + '</ul><a class="' + btncls + '"' + lnk(p, k + "b") + '>' + esc(p.get(k + "b"), "Choose") + '</a></div>')


def _pricing(p):
    return ('<div class="s s-pricing"><div class="fo-wr"><div class="head">'
            '<div class="fo-eyebrow" style="text-align:center">' + esc(p.get("eyebrow"), "Pricing") + '</div>'
            '<h2 class="fo-disp">' + esc(p.get("heading"), "Start free. Upgrade when it pays.") + '</h2></div><div class="g">'
            + _plan(p, "p1", "Starter", "$0", False, None, ["Core playbook", "5 sources", "Email support"])
            + _plan(p, "p2", "Pro", "$29", True, "Popular", ["All 27 sources", "Script vault", "Routine tracker", "Priority support"])
            + _plan(p, "p3", "Team", "$79", False, None, ["Everything in Pro", "5 seats", "Shared library"])
            + '</div></div></div>')


def _qa(p, k, dq, da):
    return ('<div class="qa"><div class="qq">' + esc(p.get(k + "q"), dq) + ' <span class="ic">+</span></div>'
            '<div class="a">' + esc(p.get(k + "a"), da) + '</div></div>')


def _faq(p):
    return ('<div class="s s-faq"><div class="fo-wr g"><h2 class="fo-disp">' + esc(p.get("heading"), "Questions, answered.") + '</h2>'
            + _qa(p, "q1", "Is it really free?", "Yes \u2014 the core playbook costs nothing and there's no card required.")
            + _qa(p, "q2", "Do I need an audience?", "No. The point is finding traffic from scratch.")
            + _qa(p, "q3", "How fast are results?", "It depends on your offer and effort \u2014 no guarantees, but most sources start within a week.")
            + '</div></div>')


def _cta(p):
    return ('<div class="s s-cta"><div class="fo-wr">'
            '<h2 class="fo-disp">' + esc(p.get("heading"), "Get 27 free traffic sources \u2014 free.") + '</h2>'
            '<p>' + esc(p.get("sub"), "Drop your email and it lands in your inbox in seconds.") + '</p>'
            '<form class="fo-form fo-optin"><input class="fo-input" type="email" name="email" required placeholder="' + esc(p.get("placeholder"), "Your best email") + '"/>'
            '<button class="fo-btn fo-btn--light" type="submit">' + esc(p.get("button"), "Send it to me") + '</button></form>'
            '<div class="fine">' + esc(p.get("fine"), "No spam. Unsubscribe anytime.") + '</div></div></div>')


def _footer(p):
    return ('<div class="s-footer"><div class="fo-wr"><div class="g">'
            '<div><div class="fo-logo" style="color:#fff"><span class="m">\u2726</span> ' + esc(p.get("brand"), "YourBrand") + '</div>'
            '<p class="about">' + esc(p.get("about"), "The free playbook and tools smart marketers use to get traffic without ads.") + '</p></div>'
            '<div><h4>Product</h4><a>Features</a><a>Pricing</a></div><div><h4>Company</h4><a>About</a><a>Contact</a></div></div>'
            '<div class="bot"><span>' + esc(p.get("copy"), "\u00a9 2026 YourBrand") + '</span><span>Built with Folio</span></div></div></div>')


def _bio(p):
    def lk(k, d, pri=False):
        return '<a class="lk' + (' pri' if pri else '') + '"' + lnk(p, k) + '>' + esc(p.get(k), d) + '</a>'
    return ('<div class="s-bio"><div class="av" style="background-image:url(' + imgurl(p, "avatar", AV + "160?img=25") + ')"></div>'
            '<h1>' + esc(p.get("name"), "Alex Rivers") + '</h1>'
            '<div class="h">' + esc(p.get("bio"), "Marketer & creator. Helping you get traffic without the guesswork.") + '</div>'
            '<div class="links">'
            + lk("l1", "\U0001F4D5 Get my free Traffic Playbook", True)
            + lk("l2", "\U0001F3A5 Watch my latest video")
            + lk("l3", "\U0001F4AC Join the free community")
            + lk("l4", "\U0001F6E0 The tools I actually use")
            + '</div><div class="soc"><i>ig</i><i>yt</i><i>x</i><i>in</i></div></div>')


def _webinar(p):
    lis = ("<li>" + esc(p.get("w1"), "Where to find buyers without paying for ads") + "</li>"
           "<li>" + esc(p.get("w2"), "The daily routine that keeps them coming") + "</li>"
           "<li>" + esc(p.get("w3"), "How to turn free traffic into real sales") + "</li>")
    return ('<div class="s-web"><div class="fo-wr g"><div>'
            '<span class="date">\u25f7 ' + esc(p.get("date"), "Thu \u00b7 2:00 PM EST \u00b7 Free") + '</span>'
            '<h1 class="fo-disp">' + esc(p.get("headline"), "The 3-step system for free traffic that converts.") + '</h1>'
            '<p class="fo-lede">' + esc(p.get("lede"), "A live 45-minute training where I walk through the exact routine \u2014 and answer your questions at the end.") + '</p>'
            '<ul class="learn">' + lis + '</ul></div>'
            '<div class="card"><h4>' + esc(p.get("formTitle"), "Save your free seat") + '</h4>'
            '<form class="fo-optin"><input class="fo-input" name="name" placeholder="First name"/><input class="fo-input" type="email" name="email" required placeholder="Your best email"/>'
            '<button class="fo-btn" type="submit">' + esc(p.get("button"), "Reserve my seat \u2192") + '</button></form>'
            '<div style="text-align:center;font-size:12px;color:#8b8e9c;margin-top:12px">Seats are limited \u00b7 Replay for registrants</div></div></div></div>')


def _coming(p):
    head = esc(p.get("headline"), "Something worth")
    accent = esc(p.get("headline_accent"), "waiting for.")
    return ('<div class="s-coming"><div class="fo-wr"><div class="fo-logo"><span class="m">\u2726</span> ' + esc(p.get("brand"), "YourBrand") + '</div>'
            '<h1 class="fo-disp">' + head + ' <span class="u">' + accent + '</span></h1>'
            '<p>' + esc(p.get("lede"), "We're putting the finishing touches on it. Drop your email and be first through the door.") + '</p>'
            '<form class="fo-form fo-optin"><input class="fo-input" type="email" name="email" required placeholder="Your best email"/><button class="fo-btn" type="submit">' + esc(p.get("button"), "Notify me") + '</button></form>'
            '<div class="soon">' + esc(p.get("soon"), "Launching Spring 2026") + '</div></div></div>')


def _thanks(p):
    return ('<div class="s s-thanks"><div class="fo-wr"><div class="tick">\u2713</div>'
            '<h1 class="fo-disp">' + esc(p.get("headline"), "You're in! Check your inbox.") + '</h1>'
            '<p class="fo-lede">' + esc(p.get("lede"), "Your playbook is on its way. While you wait \u2014 watch this 2-minute intro.") + '</p>'
            '<div class="vid"><div class="play">\u25b6</div></div>'
            '<div style="margin-top:30px"><a class="fo-btn"' + lnk(p, "button") + '>' + esc(p.get("button"), "Get started now \u2192") + '</a></div></div></div>')


SECTIONS = {
    "nav": _nav, "hero": _hero, "heroCenter": _hero_center, "stats": _stats, "features": _features,
    "featRow": _featrow, "steps": _steps, "quote": _quote, "pricing": _pricing, "faq": _faq,
    "cta": _cta, "footer": _footer, "bio": _bio, "webinar": _webinar, "comingSoon": _coming, "thankYou": _thanks,
}


def render_sections(sections, accent="#5b3df5"):
    """Render a list of {type, props} into the inner .fo-page HTML."""
    acc = accent if (isinstance(accent, str) and accent.startswith("#") and len(accent) <= 9) else "#5b3df5"
    body = []
    for s in (sections or []):
        if not isinstance(s, dict):
            continue
        fn = SECTIONS.get(s.get("type"))
        if fn:
            try:
                body.append(fn(s.get("props") or {}))
            except Exception:
                continue
    return '<div class="fo-page" style="--fo-accent:' + html.escape(acc) + '">' + "".join(body) + '</div>'


def render_page(sections, accent="#5b3df5", title="My page", page_id=0):
    """Full standalone HTML document for a published page. page_id wires the opt-in capture."""
    from .folio_css import FOLIO_CSS
    capture = (
        "<script>(function(){var pid=" + str(int(page_id or 0)) + ";"
        "document.querySelectorAll('form.fo-optin').forEach(function(f){"
        "f.addEventListener('submit',function(e){e.preventDefault();"
        "var em=(f.querySelector('input[type=email]')||{}).value||'';"
        "var nm=f.querySelector('input[name=name]');nm=nm?nm.value:'';"
        "if(!em||em.indexOf('@')<0){return;}"
        "var b=f.querySelector('button');if(b){b.disabled=true;b.textContent='\\u2026';}"
        "fetch('/api/folio/capture/'+pid,{method:'POST',headers:{'Content-Type':'application/json'},"
        "body:JSON.stringify({email:em,name:nm})}).then(function(r){return r.json();}).then(function(d){"
        "f.innerHTML='<div class=\\'fo-thanks\\'>\\u2713 You\\u2019re in \\u2014 check your inbox.</div>';"
        "}).catch(function(){if(b){b.disabled=false;b.textContent='Try again';}});});});})();</script>"
    )
    return ('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>'
            '<meta name="viewport" content="width=device-width, initial-scale=1"/>'
            '<title>' + html.escape(title or "My page") + '</title>'
            '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>'
            '<style>' + FOLIO_CSS + '</style></head><body>'
            + render_sections(sections, accent) + capture + '</body></html>')
