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


def _video_embed(url):
    """Return an embed iframe for a YouTube or Vimeo URL, or '' if unrecognised."""
    import re
    u = (url or "").strip()
    if not u:
        return ""
    m = re.search(r"(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{6,})", u)
    if m:
        return ('<iframe class="fb-frame" src="https://www.youtube.com/embed/' + m.group(1) + '" '
                'frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>')
    m = re.search(r"vimeo\.com/(?:video/)?(\d+)", u)
    if m:
        return ('<iframe class="fb-frame" src="https://player.vimeo.com/video/' + m.group(1) + '" '
                'frameborder="0" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen></iframe>')
    return ""


def _color(v):
    import re
    v = v.strip() if isinstance(v, str) else ""
    return v if re.match(r'^#[0-9a-fA-F]{3,8}$', v) else ""


_PAD_MAP = {"sm": "12px", "md": "28px", "lg": "52px"}

# Curated professional font set (loaded on editor + published pages)
FONTS = {
    "inter": "'Inter',system-ui,sans-serif",
    "bricolage": "'Bricolage Grotesque',sans-serif",
    "poppins": "'Poppins',sans-serif",
    "montserrat": "'Montserrat',sans-serif",
    "dmsans": "'DM Sans',sans-serif",
    "worksans": "'Work Sans',sans-serif",
    "playfair": "'Playfair Display',serif",
    "lora": "'Lora',serif",
    "merriweather": "'Merriweather',serif",
    "oswald": "'Oswald',sans-serif",
    "anton": "'Anton',sans-serif",
    "spacemono": "'Space Mono',monospace",
}


def _num(v, lo, hi):
    try:
        n = float(v)
    except (TypeError, ValueError):
        return None
    if n < lo:
        n = lo
    if n > hi:
        n = hi
    return n


def style_css(st):
    """Sanitised CSS from an element's style object. Every value bounded/whitelisted — no injection."""
    if not isinstance(st, dict):
        return ""
    o = []
    ff = FONTS.get(st.get("font"))
    if ff:
        o.append("font-family:" + ff)
    fs = _num(st.get("size"), 8, 160)
    if fs is not None:
        o.append("font-size:" + str(int(fs)) + "px")
    if str(st.get("weight")) in ("300", "400", "500", "600", "700", "800", "900"):
        o.append("font-weight:" + str(st.get("weight")))
    lh = _num(st.get("lh"), 0.8, 3)
    if lh is not None:
        o.append("line-height:" + ("%g" % lh))
    ls = _num(st.get("ls"), -5, 30)
    if ls is not None:
        o.append("letter-spacing:" + ("%g" % ls) + "px")
    col = _color(st.get("color"))
    if col:
        o.append("color:" + col)
    if st.get("align") in ("left", "center", "right"):
        o.append("text-align:" + st.get("align"))
    bg = _color(st.get("bg"))
    if bg:
        o.append("background:" + bg)
    for k, css in (("pt", "padding-top"), ("pb", "padding-bottom"), ("pl", "padding-left"),
                   ("pr", "padding-right"), ("mt", "margin-top"), ("mb", "margin-bottom")):
        v = _num(st.get(k), 0, 240)
        if v is not None:
            o.append(css + ":" + str(int(v)) + "px")
    r = _num(st.get("radius"), 0, 90)
    if r is not None:
        o.append("border-radius:" + str(int(r)) + "px")
    bw = _num(st.get("bw"), 0, 24)
    bc = _color(st.get("bc"))
    if bw is not None and bw > 0 and bc:
        o.append("border:" + str(int(bw)) + "px solid " + bc)
    return ";".join(o)


def _merge_style(b):
    """Element style object, back-filled from legacy top-level props so old blocks keep working."""
    st = dict(b.get("style")) if isinstance(b.get("style"), dict) else {}
    if "align" not in st and b.get("align") in ("left", "center", "right"):
        st["align"] = b["align"]
    if "color" not in st and b.get("color"):
        st["color"] = b["color"]
    if "bg" not in st and b.get("bg"):
        st["bg"] = b["bg"]
    if "pt" not in st and b.get("pad") in _PAD_MAP:
        px = int(_PAD_MAP[b["pad"]].replace("px", ""))
        st["pt"] = px
        st["pb"] = px
    return st


def render_block(b):
    """Render one content block using the unified style engine."""
    if not isinstance(b, dict):
        return ""
    t = b.get("type", "")
    st = _merge_style(b)
    css = style_css(st)
    sa = (' style="' + css + '"') if css else ''
    if t == "heading":
        lvl = b.get("level") if b.get("level") in ("h1", "h2", "h3") else "h2"
        return '<' + lvl + ' class="fb-h"' + sa + '>' + esc(b.get("text"), "Your heading") + '</' + lvl + '>'
    if t == "subheading":
        return '<div class="fb-sub"' + sa + '>' + esc(b.get("text"), "A supporting subheading").replace("\n", "<br>") + '</div>'
    if t == "text":
        return '<div class="fb-t"' + sa + '>' + esc(b.get("text"), "Add your text here.").replace("\n", "<br>") + '</div>'
    if t == "list":
        raw = b.get("text") or "First point\nSecond point\nThird point"
        items = "".join('<li>' + esc(x) + '</li>' for x in str(raw).split("\n") if x.strip())
        return '<ul class="fb-list"' + sa + '>' + items + '</ul>'
    if t == "image":
        u = imgurl(b, "url", "")
        inner = ('<img class="fb-img" src="' + u + '"/>') if u else '<div class="fb-img-ph">No image yet</div>'
        href = (b.get("href") or "").strip()
        if u and href:
            inner = '<a href="' + html.escape(href) + '">' + inner + '</a>'
        return '<div class="fb-imgwrap"' + sa + '>' + inner + '</div>'
    if t == "button":
        href = (b.get("href") or "").strip()
        variant = " fo-btn--ghost" if b.get("variant") == "ghost" else ""
        bstyle = ''
        btnbg = _color(b.get("btnbg"))
        btnfg = _color(b.get("btnfg"))
        bfont = FONTS.get(st.get("font"))
        bsize = _num(st.get("size"), 8, 60)
        if btnbg:
            bstyle += 'background:' + btnbg + ';border-color:' + btnbg + ';'
        if btnfg:
            bstyle += 'color:' + btnfg + ';'
        if bfont:
            bstyle += 'font-family:' + bfont + ';'
        if bsize is not None:
            bstyle += 'font-size:' + str(int(bsize)) + 'px;'
        stattr = (' style="' + bstyle + '"') if bstyle else ''
        al = st.get("align") if st.get("align") in ("left", "center", "right") else "left"
        return ('<div style="text-align:' + al + '"><a class="fo-btn' + variant + '"' + stattr + ' href="'
                + (html.escape(href) if href else "#") + '">' + esc(b.get("text"), "Button") + '</a></div>')
    if t == "video":
        emb = _video_embed(b.get("url", ""))
        body = ('<div class="fb-video">' + emb + '</div>') if emb else '<div class="fb-video-ph">Paste a YouTube or Vimeo link</div>'
        return '<div' + sa + '>' + body + '</div>'
    if t == "divider":
        al = st.get("align") if st.get("align") in ("left", "center", "right") else "left"
        return '<div style="text-align:' + al + '"><hr class="fb-div"/></div>'
    if t == "spacer":
        try:
            h = max(4, min(240, int(b.get("height", 32))))
        except Exception:
            h = 32
        return '<div style="height:' + str(h) + 'px"></div>'
    return ""


def _blocks(p):
    blocks = p.get("blocks") if isinstance(p.get("blocks"), list) else []
    inner = "".join(render_block(b) for b in blocks)
    if not inner:
        inner = '<div class="fb-empty">Add your first block</div>'
    return '<div class="s s-blocks"><div class="fo-wr fb-wrap">' + inner + '</div></div>'


SECTIONS = {
    "nav": _nav, "hero": _hero, "heroCenter": _hero_center, "stats": _stats, "features": _features,
    "featRow": _featrow, "steps": _steps, "quote": _quote, "pricing": _pricing, "faq": _faq,
    "cta": _cta, "footer": _footer, "bio": _bio, "webinar": _webinar, "comingSoon": _coming, "thankYou": _thanks,
    "blocks": _blocks,
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


def _capture_script(page_id):
    return (
        "<script>(function(){var pid=" + str(int(page_id or 0)) + ";"
        "document.querySelectorAll('form.fo-optin').forEach(function(f){"
        "f.addEventListener('submit',function(e){e.preventDefault();"
        "var em=(f.querySelector('input[type=email]')||{}).value||'';"
        "var nm=f.querySelector('input[name=name]');nm=nm?nm.value:'';"
        "if(!em||em.indexOf('@')<0){return;}"
        "var b=f.querySelector('button,[type=submit]');if(b){b.disabled=true;}"
        "fetch('/api/folio/capture/'+pid,{method:'POST',headers:{'Content-Type':'application/json'},"
        "body:JSON.stringify({email:em,name:nm})}).then(function(r){return r.json();}).then(function(d){"
        "f.innerHTML='<div style=\\'padding:12px;font-weight:700\\'>\\u2713 You\\u2019re in \\u2014 check your inbox.</div>';"
        "}).catch(function(){if(b){b.disabled=false;}});});});})();</script>"
    )


_FONTS_LINK = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
               '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Poppins:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800;900&family=Oswald:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Merriweather:wght@400;700;900&display=swap" rel="stylesheet"/>')


def render_unlayer_page(body_html, title="My page", page_id=0):
    """Take Unlayer's exported HTML and inject our fonts + lead-capture wiring."""
    h = body_html or ""
    if "</head>" in h:
        h = h.replace("</head>", _FONTS_LINK + "</head>", 1)
    if "</body>" in h:
        h = h.replace("</body>", _capture_script(page_id) + "</body>", 1)
    else:
        h = h + _capture_script(page_id)
    return h


def render_gjs_page(body_html, css, title="My page", page_id=0):
    """Full standalone HTML document for a GrapesJS-authored page."""
    capture = (
        "<script>(function(){var pid=" + str(int(page_id or 0)) + ";"
        "document.querySelectorAll('form.fo-optin').forEach(function(f){"
        "f.addEventListener('submit',function(e){e.preventDefault();"
        "var em=(f.querySelector('input[type=email]')||{}).value||'';"
        "var nm=f.querySelector('input[name=name]');nm=nm?nm.value:'';"
        "if(!em||em.indexOf('@')<0){return;}"
        "var b=f.querySelector('button,[type=submit]');if(b){b.disabled=true;}"
        "fetch('/api/folio/capture/'+pid,{method:'POST',headers:{'Content-Type':'application/json'},"
        "body:JSON.stringify({email:em,name:nm})}).then(function(r){return r.json();}).then(function(d){"
        "f.innerHTML='<div style=\\'padding:12px;font-weight:700\\'>\\u2713 You\\u2019re in \\u2014 check your inbox.</div>';"
        "}).catch(function(){if(b){b.disabled=false;}});});});})();</script>"
    )
    fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
             '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Poppins:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700;800&family=Work+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800;900&family=Lora:wght@400;500;600;700&family=Merriweather:wght@400;700;900&family=Oswald:wght@400;500;600;700&family=Anton&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>')
    return ('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>'
            '<meta name="viewport" content="width=device-width, initial-scale=1"/>'
            '<title>' + html.escape(title or "My page") + '</title>' + fonts
            + '<style>*{box-sizing:border-box}body{margin:0}' + (css or "") + '</style></head><body>'
            + (body_html or "") + capture + '</body></html>')


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
            '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Poppins:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700;800&family=Work+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800;900&family=Lora:wght@400;500;600;700&family=Merriweather:wght@400;700;900&family=Oswald:wght@400;500;600;700&family=Anton&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>'
            '<style>' + FOLIO_CSS + '</style></head><body>'
            + render_sections(sections, accent) + capture + '</body></html>')
