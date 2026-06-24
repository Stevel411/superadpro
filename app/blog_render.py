"""
Member Site & Blog platform — server-side rendering engine.
=============================================================
Public blog pages are rendered as real server-side HTML (NOT the React SPA) so
crawlers and social cards get proper meta tags on first byte — best-in-class SEO
is a flagship requirement (docs/blog-system-spec.md §10).

A *theme* = a layout + a palette/token set + a default font. Content is
theme-agnostic: the same Blog/BlogPost data flows through whichever theme is
active. This module exposes two entry points used by the routes in main.py:

    render_blog_feed(ctx)  -> full HTML for the blog home (post feed)
    render_blog_post(ctx)  -> full HTML for a single post

`ctx` is a BlogRenderContext carrying the resolved blog + member + content.
Each theme registers a (feed_fn, post_fn) pair in THEMES; unknown themes fall
back to Banner (the default). Phase 1 ships Banner; the other five themes
(Classic Sidebar, Journal, Bento, Cinematic, Glass) slot in here next.
"""

from dataclasses import dataclass, field
from datetime import datetime
from html import escape
import json

# ── HTML sanitization (XSS defense) ──────────────────────────────────────────
# Post bodies are rich HTML authored by members and rendered to the public, so
# they MUST be sanitized with a strict allowlist before storage and before
# render (defense in depth). bleach is already a project dependency; if it ever
# fails to import we fail safe by escaping the entire body (formatting lost, but
# no script can execute). Swapping to nh3 later is a one-function change.
_SANITIZE_TAGS = {
    "p", "br", "hr", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u",
    "s", "strike", "del", "ul", "ol", "li", "blockquote", "pre", "code",
    "a", "img", "span", "figure", "figcaption",
}
_SANITIZE_ATTRS = {
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title", "width", "height"],
    "span": ["class"], "p": ["class"],
    "h1": ["class"], "h2": ["class"], "h3": ["class"],
    "code": ["class"], "pre": ["class"],
}
_SANITIZE_PROTOCOLS = ["http", "https", "mailto"]
try:
    import bleach as _bleach
    _HAVE_BLEACH = True
except Exception:
    _HAVE_BLEACH = False


def sanitize_html(html):
    """Strip scripts/handlers/unsafe URLs; keep a safe formatting allowlist."""
    if not html:
        return ""
    if not _HAVE_BLEACH:
        return escape(html)
    return _bleach.clean(
        html, tags=_SANITIZE_TAGS, attributes=_SANITIZE_ATTRS,
        protocols=_SANITIZE_PROTOCOLS, strip=True,
    )

BASE_URL = "https://www.superadpro.com"
FONT_LINK = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
             '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')

# Default font pairing per theme (Blog.font can override later via FONT_PAIRINGS).
_THEME_FONTS = {
    "banner": "Merriweather:ital,wght@0,400;0,700;0,900;1,400|Inter:wght@400;500;600;700",
}

# Deterministic gradient placeholders for posts without a cover image.
_GRADIENTS = [
    ("#cfe8dd", "#a7d3c0"), ("#f3e6d0", "#e6c894"), ("#dbe7f5", "#aac6e6"),
    ("#ecdcef", "#cbabd6"), ("#d3ece4", "#a3cdbb"), ("#f6dcd8", "#e6aaa0"),
    ("#e2e8d8", "#bcca9c"),
]


def _grad(seed: int) -> str:
    a, b = _GRADIENTS[seed % len(_GRADIENTS)]
    return f"linear-gradient(135deg,{a},{b})"


# Curated accent palettes (research-informed, 2026). A palette swaps the --accent
# / --accent-dark tokens; each theme keeps its own structural neutrals + signature
# decorative colours. "default" = the theme's own built-in accent (no override).
PALETTES = {
    "forest":     ("#0f6e4f", "#0a4d37", "Forest"),
    "cobalt":     ("#1e3a8a", "#122456", "Cobalt"),
    "plum":       ("#7c3aed", "#5b21b6", "Plum"),
    "terracotta": ("#c2622d", "#92481f", "Terracotta"),
    "rose":       ("#c43f63", "#922b46", "Rose"),
    "slate":      ("#1f3354", "#13213a", "Slate"),
    "ink":        ("#1a1a1a", "#000000", "Ink"),
}


def _palette_css(ctx):
    """Token override block; empty for the default (theme keeps its own accent)."""
    p = getattr(ctx, "palette", "default")
    if not p or p == "default" or p not in PALETTES:
        return ""
    a, d, _ = PALETTES[p]
    return f":root{{--accent:{a};--accent-dark:{d}}}"


# ── data carriers ────────────────────────────────────────────────────────────
@dataclass
class PostView:
    title: str
    slug: str
    excerpt: str = ""
    cover_image: str = ""
    body: str = ""
    published_at: datetime = None
    read_minutes: int = 4
    tags: list = field(default_factory=list)   # list[(name, slug)]
    seed: int = 0

    @property
    def date_str(self) -> str:
        return self.published_at.strftime("%b %-d, %Y") if self.published_at else ""

    def cover_style(self) -> str:
        if self.cover_image:
            return f"background-image:url('{escape(self.cover_image)}');background-size:cover;background-position:center"
        return f"background:{_grad(self.seed)}"


@dataclass
class BlogRenderContext:
    blog_title: str
    tagline: str
    slug: str
    username: str
    theme: str = "banner"
    font: str = "classic-serif"
    nav: list = field(default_factory=list)        # list[(label, href)]
    social: list = field(default_factory=list)     # list[(network, url)]
    posts: list = field(default_factory=list)      # list[PostView]
    post: PostView = None                          # single-post view
    optin_title: str = "Get the next one in your inbox"
    optin_sub: str = "New posts straight to your inbox."
    base_path: str = ""                            # e.g. /sites/{slug}
    palette: str = "default"                       # accent palette key (see PALETTES)

    def post_url(self, post: PostView) -> str:
        return f"{self.base_path}/p/{post.slug}"


# ── shared helpers (used by every theme) ─────────────────────────────────────
def _seo_head(ctx, page_title, description, og_image="", canonical=""):
    fonts = _THEME_FONTS.get(ctx.theme, _THEME_FONTS["banner"])
    font_hrefs = "".join(
        f'<link href="https://fonts.googleapis.com/css2?family={fam}&display=swap" rel="stylesheet">'
        for fam in fonts.split("|")
    )
    desc = escape(description or ctx.tagline or ctx.blog_title)[:300]
    title = escape(page_title)
    og = f'<meta property="og:image" content="{escape(og_image)}">' if og_image else ""
    canon = f'<link rel="canonical" href="{escape(canonical)}">' if canonical else ""
    rss = f'<link rel="alternate" type="application/rss+xml" title="{escape(ctx.blog_title)} RSS" href="{BASE_URL}/sites/{escape(ctx.slug)}/rss.xml">'
    return f"""<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="article"><meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}"><meta property="og:site_name" content="{escape(ctx.blog_title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">{og}{canon}{rss}
{FONT_LINK}{font_hrefs}
"""


def _nav_html(ctx, cls_link, cls_sub, active=""):
    items = ctx.nav or [("Home", ctx.base_path or "/")]
    links = "".join(
        f'<a class="{cls_link}{" active" if lbl==active else ""}" href="{escape(href)}">{escape(lbl)}</a>'
        for lbl, href in items
    )
    return links + f'<a class="{cls_sub}" href="#subscribe">Subscribe</a>'


_SOCIAL_GLYPH = {"instagram": "◎", "x": "𝕏", "twitter": "𝕏", "youtube": "▶",
                 "tiktok": "♪", "linkedin": "in", "facebook": "f", "threads": "@"}


def _social_html(ctx, span_cls):
    if not ctx.social:
        return ""
    return "".join(
        f'<a class="{span_cls}" href="{escape(url)}" target="_blank" rel="noopener">{_SOCIAL_GLYPH.get(net.lower(), "•")}</a>'
        for net, url in ctx.social
    )


def _powered_footer(ctx, mk_cls="powered"):
    """Non-removable referral footer — links through the member's /ref/{username}."""
    ref = f"{BASE_URL}/ref/{escape(ctx.username)}"
    report = f"{BASE_URL}/sites/{escape(ctx.slug)}/report"
    return (f'<div class="{mk_cls}">Powered by '
            f'<a class="mk" href="{ref}"><span class="d">'
            f'<svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span> '
            f'SuperAdPro</a>'
            f'<a class="mk" href="{report}" style="opacity:.45;font-size:11px;margin-left:12px">Report</a></div>')


def _share_html(ctx, btn_cls):
    nets = [("𝕏", "https://twitter.com/intent/tweet"), ("f", "https://www.facebook.com/sharer/sharer.php"),
            ("in", "https://www.linkedin.com/sharing/share-offsite"), ("🔗", "#")]
    return "".join(f'<span class="{btn_cls}">{g}</span>' for g, _ in nets)


# ════════════════════════════════════════════════════════════════════════════
# BANNER THEME (default) — green editorial, Merriweather. Mirrors
# docs/blog-assets/theme-banner-home.html / -post.html.
# ════════════════════════════════════════════════════════════════════════════
_BANNER_CSS = """
:root{--ink:#1a2620;--soft:#5c6b63;--line:#e3e8e4;--bg:#fcfdfc;--accent:#0f6e4f;--accent-dark:#0a4d37;--gold:#b8893a;--paper:#f5f7f4}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;color:var(--ink);background:var(--bg)}
h1,h2,h3,.serif{font-family:'Merriweather',serif}a{text-decoration:none;color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 40px}.article{max-width:720px;margin:0 auto;padding:0 40px}
.bhead{border-bottom:1px solid var(--line);background:#fff}.bhead .in{display:flex;align-items:center;height:74px;gap:24px}
.blogname{font-family:'Merriweather',serif;font-weight:900;font-size:24px;letter-spacing:-.3px}
.bnav{margin-left:auto;display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.bnav a{font-size:15px;font-weight:500;color:var(--soft);padding:9px 14px;border-radius:8px}
.bnav a.active,.bnav a:hover{color:var(--ink)}
.subbtn{background:var(--accent);color:#fff!important;font-weight:600;padding:10px 18px!important;border-radius:9px;font-size:14px}
.banner{background:linear-gradient(135deg,var(--accent),var(--accent-dark));color:#fff;text-align:center;padding:74px 24px;position:relative;overflow:hidden}
.banner::after{content:"";position:absolute;inset:0;background:radial-gradient(70% 120% at 50% 0%,rgba(255,255,255,.12),transparent 60%)}
.banner .k{font-weight:600;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#a7e0c9;position:relative}
.banner h1{font-weight:900;font-size:52px;line-height:1.08;margin:16px auto 0;max-width:16ch;position:relative}
.banner p{font-size:19px;color:#d6ece2;margin:18px auto 0;max-width:54ch;position:relative;font-style:italic;font-family:'Merriweather',serif}
.feed{padding:64px 0 30px}
.lead-post{display:grid;grid-template-columns:1.15fr 1fr;gap:38px;align-items:center;margin-bottom:60px}
.lead-post .img{aspect-ratio:16/11;border-radius:16px;overflow:hidden;box-shadow:0 24px 50px -28px rgba(20,40,70,.4)}
.tagrow{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}.tagrow.center{justify-content:center}
.tag{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);background:color-mix(in srgb,var(--accent) 13%,#fff);padding:5px 10px;border-radius:6px}
.lead-post h2{font-weight:900;font-size:36px;line-height:1.12;letter-spacing:-.5px}
.lead-post .ex{font-size:17px;color:var(--soft);line-height:1.6;margin:16px 0 18px}
.meta{font-size:13px;color:var(--soft);display:flex;align-items:center;gap:8px}.meta.center{justify-content:center}
.avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--gold),#d9a85a)}
.divider{border:none;border-top:1px solid var(--line);margin:0 0 50px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.card .img{aspect-ratio:16/10;border-radius:13px;overflow:hidden;margin-bottom:16px}
.card h3{font-weight:700;font-size:20px;line-height:1.25;margin-bottom:9px}
.card .ex{font-size:14.5px;color:var(--soft);line-height:1.55;margin-bottom:12px}
.empty{text-align:center;color:var(--soft);padding:80px 0;font-size:17px}
.post-top{text-align:center;padding:58px 0 30px}
.post-top h1{font-weight:900;font-size:46px;line-height:1.12;letter-spacing:-.6px;margin:18px auto;max-width:18ch}
.cover{aspect-ratio:16/8;border-radius:18px;margin:14px auto 0;max-width:1000px;box-shadow:0 28px 60px -32px rgba(20,40,70,.35)}
.body{font-family:'Merriweather',serif;font-size:19px;line-height:1.78;color:#26332c}
.body p{margin:26px 0}.body h2{font-size:30px;font-weight:900;margin:46px 0 4px;line-height:1.2}
.body img{max-width:100%;border-radius:14px;margin:30px 0}
.body blockquote{border-left:4px solid var(--accent);padding:6px 0 6px 26px;margin:34px 0;font-size:24px;font-style:italic;line-height:1.5}
.share-row{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:20px 0;margin:48px 0 0}
.share-row .btns{display:flex;gap:9px}.share-row .lbl{font-size:13px;color:var(--soft);margin-right:4px}
.share-row .btns span,.sb{width:40px;height:40px;border-radius:10px;border:1px solid var(--line);display:grid;place-items:center;color:var(--soft);font-size:15px;cursor:pointer}
.optin{background:linear-gradient(135deg,var(--accent),var(--accent-dark));border-radius:20px;padding:44px;text-align:center;color:#fff;margin:54px 0}
.optin h3{font-family:'Merriweather';font-weight:900;font-size:28px;color:#fff}
.optin p{color:#cfe8dd;font-size:16px;margin:12px 0 24px}
.optin .form{display:flex;gap:10px;max-width:440px;margin:0 auto}
.optin input{flex:1;border:none;border-radius:11px;padding:15px 18px;font-size:15px}
.optin button{background:#fff;color:var(--accent);font-weight:700;border:none;border-radius:11px;padding:0 26px;font-size:15px;cursor:pointer}
.optin .tiny{font-size:12px;color:#a7e0c9;margin-top:14px}
.bfoot{margin-top:70px;background:var(--paper);border-top:1px solid var(--line);padding:46px 0}
.bfoot .in{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap}
.bfoot .social{display:flex;gap:10px}
.bfoot .social a{width:38px;height:38px;border-radius:10px;background:#fff;border:1px solid var(--line);display:grid;place-items:center;color:var(--soft);font-size:15px}
.powered{font-size:13px;color:var(--soft)}.powered .mk{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line);padding:7px 13px;border-radius:8px;margin-left:4px;color:var(--accent);font-weight:700}
.powered .mk .d{width:16px;height:16px;border-radius:5px;background:linear-gradient(135deg,#06b6d4,#1e3a8a);display:inline-grid;place-items:center}.powered .mk .d svg{width:8px;height:8px}
@media(max-width:880px){.grid{grid-template-columns:1fr}.lead-post{grid-template-columns:1fr}.banner h1{font-size:36px}.post-top h1{font-size:32px}.bnav{display:none}}
"""


def _banner_header(ctx, active=""):
    return (f'<div class="bhead"><div class="wrap in">'
            f'<a class="blogname" href="{ctx.base_path or "/"}">{escape(ctx.blog_title)}</a>'
            f'<div class="bnav">{_nav_html(ctx, "", "subbtn", active)}</div></div></div>')


def _banner_footer(ctx):
    return (f'<div class="bfoot"><div class="wrap in">'
            f'<div class="social">{_social_html(ctx, "")}</div>'
            f'{_powered_footer(ctx)}</div></div>')


def _tagrow(post, center=False):
    if not post.tags:
        return ""
    c = " center" if center else ""
    return f'<div class="tagrow{c}">' + "".join(f'<span class="tag">{escape(n)}</span>' for n, _ in post.tags) + "</div>"


def render_banner_feed(ctx):
    head = _seo_head(ctx, ctx.blog_title, ctx.tagline, canonical=f"{BASE_URL}{ctx.base_path}")
    body = [f"{head}<style>{_BANNER_CSS}{_palette_css(ctx)}</style></head><body>", _banner_header(ctx, active="Home")]
    body.append(
        f'<div class="banner"><div class="k">{escape(ctx.tagline or "")}</div>'
        f'<h1>{escape(ctx.blog_title)}</h1></div>'
    )
    if not ctx.posts:
        body.append('<div class="wrap"><div class="empty">No posts published yet — check back soon.</div></div>')
    else:
        body.append('<div class="wrap feed">')
        lead = ctx.posts[0]
        body.append(
            f'<a class="lead-post" href="{ctx.post_url(lead)}"><div class="img" style="{lead.cover_style()}"></div>'
            f'<div>{_tagrow(lead)}<h2>{escape(lead.title)}</h2>'
            f'<p class="ex">{escape(lead.excerpt)}</p>'
            f'<div class="meta"><span class="avatar"></span> {escape(ctx.username)} · {lead.date_str} · {lead.read_minutes} min read</div></div></a>'
        )
        rest = ctx.posts[1:]
        if rest:
            body.append('<hr class="divider"><div class="grid">')
            for p in rest:
                body.append(
                    f'<a class="card" href="{ctx.post_url(p)}"><div class="img" style="{p.cover_style()}"></div>'
                    f'{_tagrow(p)}<h3>{escape(p.title)}</h3><p class="ex">{escape(p.excerpt)}</p>'
                    f'<div class="meta">{p.date_str} · {p.read_minutes} min</div></a>'
                )
            body.append('</div>')
        body.append('</div>')
    body.append(_banner_footer(ctx))
    body.append("</body></html>")
    return "".join(body)


def render_banner_post(ctx):
    p = ctx.post
    head = _seo_head(ctx, f"{p.title} — {ctx.blog_title}", p.excerpt,
                     og_image=p.cover_image, canonical=f"{BASE_URL}{ctx.post_url(p)}")
    body = [f"{head}<style>{_BANNER_CSS}{_palette_css(ctx)}</style></head><body>", _banner_header(ctx)]
    body.append(
        f'<div class="post-top wrap">{_tagrow(p, center=True)}<h1>{escape(p.title)}</h1>'
        f'<div class="meta center"><span class="avatar"></span> {escape(ctx.username)} · {p.date_str} · {p.read_minutes} min read</div></div>'
        f'<div class="cover" style="{p.cover_style()}"></div>'
    )
    body.append(f'<article class="article"><div class="body">{sanitize_html(p.body)}</div>')
    # tags + share
    body.append(
        f'<div class="share-row"><div class="tagrow">'
        + "".join(f'<span class="tag">{escape(n)}</span>' for n, _ in p.tags)
        + f'</div><div style="display:flex;align-items:center"><span class="lbl">Share</span>'
        f'<div class="btns">{_share_html(ctx, "")}</div></div></div>'
    )
    # opt-in (the moat)
    body.append(
        f'<div class="optin" id="subscribe"><h3>{escape(ctx.optin_title)}</h3>'
        f'<p>{escape(ctx.optin_sub)}</p>'
        f'<div class="form"><input placeholder="you@email.com"><button>Subscribe</button></div>'
        f'<div class="tiny">No spam. Unsubscribe anytime.</div></div>'
    )
    body.append('</article>')
    body.append(_banner_footer(ctx))
    body.append("</body></html>")
    return "".join(body)


# ── theme dispatch ───────────────────────────────────────────────────────────
THEMES = {
    "banner": (render_banner_feed, render_banner_post),
}


def render_blog_feed(ctx) -> str:
    feed_fn, _ = THEMES.get(ctx.theme, THEMES["banner"])
    return feed_fn(ctx)


def render_blog_post(ctx) -> str:
    _, post_fn = THEMES.get(ctx.theme, THEMES["banner"])
    return post_fn(ctx)


# ════════════════════════════════════════════════════════════════════════════
# SHARED ARTICLE (post-reading) view — token-driven, used by all non-Banner
# themes. Each theme defines :root tokens (--ink/--soft/--line/--bg/--card/
# --accent/--hfont/--bfont); this adapts to them (incl. dark Cinematic).
# ════════════════════════════════════════════════════════════════════════════
_ARTICLE_CSS = """
.art-top{text-align:center;padding:52px 24px 24px;max-width:1080px;margin:0 auto}
.art-top h1{font-family:var(--hfont);font-weight:800;font-size:44px;line-height:1.12;letter-spacing:-.5px;color:var(--ink);max-width:18ch;margin:16px auto}
.art-meta{color:var(--soft);font-size:14px;display:inline-flex;gap:9px;align-items:center}
.art-av{width:30px;height:30px;border-radius:50%;background:var(--accent);opacity:.85}
.art-trow{display:flex;gap:8px;justify-content:center;margin-bottom:6px}
.art-tag{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--accent);background:color-mix(in srgb,var(--accent) 13%,transparent);padding:5px 10px;border-radius:6px}
.art-cover{aspect-ratio:16/8;border-radius:18px;max-width:1000px;margin:8px auto 0;box-shadow:0 26px 60px -34px rgba(20,20,50,.4)}
.art-wrap{max-width:720px;margin:0 auto;padding:0 40px}
.art-body{font-family:var(--bfont);font-size:19px;line-height:1.78;color:var(--ink);padding-top:12px}
.art-body p{margin:24px 0}.art-body .lead-para{font-size:21px}
.art-body h2{font-family:var(--hfont);font-weight:800;font-size:28px;margin:42px 0 4px;line-height:1.2;color:var(--ink)}
.art-body img{max-width:100%;border-radius:12px;margin:26px 0}
.art-body blockquote{border-left:4px solid var(--accent);padding:4px 0 4px 24px;margin:30px 0;font-size:23px;font-style:italic;line-height:1.5;color:var(--ink)}
.art-share{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:18px 0;margin-top:44px;gap:14px;flex-wrap:wrap}
.art-share .lbl{font-size:13px;color:var(--soft);margin-right:4px}
.art-sb{width:38px;height:38px;border-radius:9px;border:1px solid var(--line);display:inline-grid;place-items:center;color:var(--soft);margin-left:7px;cursor:pointer}
.art-optin{background:var(--accent);border-radius:18px;padding:42px;text-align:center;color:#fff;margin:42px 0}
.art-optin h3{font-family:var(--hfont);font-weight:800;font-size:25px;color:#fff}
.art-optin p{opacity:.88;margin:10px 0 20px;font-size:15px}
.art-optin .f{display:flex;gap:9px;max-width:430px;margin:0 auto}
.art-optin input{flex:1;border:none;border-radius:11px;padding:14px 16px;font-size:14.5px}
.art-optin button{background:#fff;color:var(--accent);border:none;border-radius:11px;padding:0 24px;font-weight:700;font-size:14.5px;cursor:pointer}
"""


def _article_markup(ctx):
    p = ctx.post
    trow = ('<div class="art-trow">' + "".join(f'<span class="art-tag">{escape(n)}</span>' for n, _ in p.tags) + "</div>") if p.tags else ""
    shtags = "".join(f'<span class="art-tag">{escape(n)}</span>' for n, _ in p.tags)
    shbtns = "".join(f'<span class="art-sb">{g}</span>' for g in ("𝕏", "f", "in", "🔗"))
    return (
        f'<div class="art-top">{trow}<h1>{escape(p.title)}</h1>'
        f'<div class="art-meta"><span class="art-av"></span> {escape(ctx.username)} · {p.date_str} · {p.read_minutes} min read</div></div>'
        f'<div class="art-cover" style="{p.cover_style()}"></div>'
        f'<article class="art-wrap"><div class="art-body">{sanitize_html(p.body)}</div>'
        f'<div class="art-share"><div>{shtags}</div><div><span class="lbl">Share</span>{shbtns}</div></div>'
        f'<div class="art-optin" id="subscribe"><h3>{escape(ctx.optin_title)}</h3><p>{escape(ctx.optin_sub)}</p>'
        f'<div class="f"><input placeholder="you@email.com"><button>Subscribe</button></div></div></article>'
    )


def _post_page(ctx, theme_css, header_html, footer_html):
    head = _seo_head(ctx, f"{ctx.post.title} — {ctx.blog_title}", ctx.post.excerpt,
                     og_image=ctx.post.cover_image, canonical=f"{BASE_URL}{ctx.post_url(ctx.post)}")
    return (f"{head}<style>{theme_css}{_palette_css(ctx)}{_ARTICLE_CSS}</style></head><body>"
            f"{header_html}{_article_markup(ctx)}{footer_html}</body></html>")


# ── Static page rendering (About/Contact/etc.) ───────────────────────────────
# Pages are clean title+body documents (no date/share/subscribe). Rendered in a
# simple palette-aware layout that works across all themes.
_PAGE_CSS = """:root{--accent:#0f6e4f;--accent-dark:#0a4d37;--hfont:'Georgia',serif;--bfont:'Georgia',serif}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#1a2030;background:#fff;line-height:1.65}
.pg-nav{border-bottom:1px solid #eceff5;padding:18px 24px;display:flex;align-items:center;gap:22px;max-width:1080px;margin:0 auto;flex-wrap:wrap}
.pg-nav .home{font-weight:800;font-size:19px;color:#0a1438;text-decoration:none}
.pg-nav a.lnk{color:#5b6b8c;font-size:14px;text-decoration:none;font-weight:500}
.pg-nav a.lnk:hover{color:var(--accent)}
.pg-nav .sp{margin-left:auto}
.pg-wrap{max-width:720px;margin:0 auto;padding:54px 24px 90px}
.pg-wrap h1{font-family:var(--hfont);font-size:40px;font-weight:800;letter-spacing:-.5px;color:#0a1438;margin-bottom:30px;line-height:1.12}
"""


def render_blog_page(ctx):
    """Render a standalone page (ctx.post carries title/slug/body)."""
    desc = (ctx.post.excerpt or ctx.tagline or ctx.blog_title)
    head = _seo_head(ctx, f"{ctx.post.title} — {ctx.blog_title}", desc,
                     canonical=f"{BASE_URL}/sites/{ctx.slug}/{ctx.post.slug}")
    nav = "".join(f'<a class="lnk" href="{escape(h)}">{escape(l)}</a>'
                  for l, h in (ctx.nav or [("Home", f"/sites/{ctx.slug}")]))
    return (f"{head}<style>{_PAGE_CSS}{_palette_css(ctx)}{_ARTICLE_CSS}</style></head><body>"
            f'<div class="pg-nav"><a class="home" href="/sites/{escape(ctx.slug)}">{escape(ctx.blog_title)}</a>'
            f'<span class="sp"></span>{nav}</div>'
            f'<div class="pg-wrap"><h1>{escape(ctx.post.title)}</h1>'
            f'<div class="art-body">{sanitize_html(ctx.post.body)}</div></div>'
            f'{_powered_footer(ctx)}</body></html>')


def _cards_html(ctx, posts, card_cls, img_cls, h_tag="h3"):
    out = []
    for p in posts:
        trow = "".join(f'<span class="tag">{escape(n)}</span>' for n, _ in p.tags[:1])
        out.append(
            f'<a class="{card_cls}" href="{ctx.post_url(p)}"><div class="{img_cls}" style="{p.cover_style()}"></div>'
            f'<div class="cbody"><div class="tagrow">{trow}</div><{h_tag}>{escape(p.title)}</{h_tag}>'
            f'<p class="ex">{escape(p.excerpt)}</p><div class="m">{p.date_str} · {p.read_minutes} min</div></div></a>'
        )
    return "".join(out)


def _navlinks(ctx, cls):
    items = ctx.nav or [("Home", ctx.base_path or "/")]
    return "".join(f'<a class="{cls}" href="{escape(h)}">{escape(l)}</a>' for l, h in items)


# ════════════════════════════════════════════════════════════════════════════
# CLASSIC SIDEBAR — navy/burgundy, PT Serif, main column + widgets
# ════════════════════════════════════════════════════════════════════════════
_CS_CSS = """
:root{--ink:#1d2330;--soft:#646c7e;--line:#e6e8ee;--bg:#fbfbfd;--card:#fff;--accent:#8a1f3d;--accent-dark:#6a1730;--navy:#1d2c4a;--paper:#f4f5f8;--hfont:'PT Serif',serif;--bfont:'PT Serif',serif}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;color:var(--ink);background:var(--bg)}
h1,h2,h3,h4{font-family:'PT Serif',serif}a{text-decoration:none;color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 40px}
.chead{background:var(--navy);color:#fff}.chead .in{display:flex;align-items:center;height:80px;gap:24px}
.cname{font-family:'PT Serif',serif;font-weight:700;font-size:26px;color:#fff}
.cnav{margin-left:auto;display:flex;gap:6px}.cnav a{font-size:14.5px;font-weight:500;color:#c3cbdb;padding:8px 13px;border-radius:7px}.cnav a:hover{color:#fff;background:rgba(255,255,255,.08)}
.strip{background:var(--accent);height:4px}
.layout{display:grid;grid-template-columns:1fr 320px;gap:48px;padding:50px 0}
.post{padding-bottom:38px;margin-bottom:38px;border-bottom:1px solid var(--line)}
.post .cat{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.post h2{font-size:30px;font-weight:700;line-height:1.2;margin:9px 0 12px}
.post .meta{font-size:13px;color:var(--soft);margin-bottom:14px}.post .ex{font-size:16px;color:#3c4456;line-height:1.65}
.post .more{display:inline-block;margin-top:14px;font-weight:600;color:var(--accent);font-size:14.5px}
.post .thumb{aspect-ratio:21/9;border-radius:10px;margin-bottom:18px}
.side .widget{background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px;margin-bottom:24px}
.side h4{font-size:17px;font-weight:700;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid var(--accent);display:inline-block}
.subbox{background:var(--navy);color:#fff}.subbox h4{color:#fff;border-color:#fff}.subbox p{font-size:13.5px;color:#c3cbdb;margin-bottom:14px}
.subbox input{width:100%;border:none;border-radius:8px;padding:11px 13px;font-size:14px;margin-bottom:9px}
.subbox button{width:100%;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:11px;font-weight:600;font-size:14px;cursor:pointer}
.tags{display:flex;flex-wrap:wrap;gap:8px}.tags span{font-size:12.5px;color:var(--soft);background:var(--paper);border:1px solid var(--line);padding:6px 11px;border-radius:20px}
.cfoot{background:var(--navy);color:#aebbd0;padding:40px 0}.cfoot .in{display:flex;justify-content:space-between;align-items:center}
.cfoot .social{display:flex;gap:9px}.cfoot .social a{width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,.08);display:grid;place-items:center;font-size:14px;color:#aebbd0}
.powered{font-size:13px}.powered .mk{color:#fff;font-weight:700;background:rgba(255,255,255,.1);padding:6px 12px;border-radius:7px;margin-left:5px;display:inline-flex;align-items:center;gap:6px}
.powered .mk .d{width:15px;height:15px;border-radius:4px;background:linear-gradient(135deg,#06b6d4,#1e3a8a);display:inline-grid;place-items:center}.powered .mk .d svg{width:8px;height:8px}
@media(max-width:880px){.layout{grid-template-columns:1fr}.cnav{display:none}}
"""
def _cs_header(ctx):
    return f'<div class="chead"><div class="wrap in"><a class="cname" href="{ctx.base_path or "/"}">{escape(ctx.blog_title)}</a><div class="cnav">{_navlinks(ctx,"")}</div></div></div><div class="strip"></div>'
def _cs_footer(ctx):
    return f'<div class="cfoot"><div class="wrap in"><div class="social">{_social_html(ctx,"")}</div>{_powered_footer(ctx)}</div></div>'
def render_cs_feed(ctx):
    posts_html=""
    for p in ctx.posts:
        cat=p.tags[0][0] if p.tags else ""
        posts_html+=(f'<article class="post"><div class="thumb" style="{p.cover_style()}"></div>'
            f'<div class="cat">{escape(cat)}</div><h2>{escape(p.title)}</h2>'
            f'<div class="meta">By {escape(ctx.username)} · {p.date_str} · {p.read_minutes} min read</div>'
            f'<p class="ex">{escape(p.excerpt)}</p><a class="more" href="{ctx.post_url(p)}">Continue reading →</a></article>')
    if not ctx.posts: posts_html='<p style="color:var(--soft)">No posts yet.</p>'
    tagset={}
    for p in ctx.posts:
        for n,sl in p.tags: tagset[sl]=n
    topics="".join(f'<span>{escape(n)}</span>' for n in list(tagset.values())[:8])
    popular="".join(f'<a href="{ctx.post_url(p)}" style="display:block;font-size:14.5px;font-weight:600;padding:9px 0;border-bottom:1px solid var(--line);color:#2a3142">{escape(p.title)}</a>' for p in ctx.posts[:3])
    head=_seo_head(ctx,ctx.blog_title,ctx.tagline,canonical=f"{BASE_URL}{ctx.base_path}")
    return (f"{head}<style>{_CS_CSS}{_palette_css(ctx)}</style></head><body>{_cs_header(ctx)}"
        f'<div class="wrap layout"><div class="main">{posts_html}</div>'
        f'<aside class="side"><div class="widget"><h4>About</h4><p style="font-size:14px;color:var(--soft);line-height:1.6">{escape(ctx.tagline or ctx.blog_title)}</p></div>'
        f'<div class="widget subbox" id="subscribe"><h4>Subscribe</h4><p>New posts in your inbox.</p><input placeholder="you@email.com"><button>Join the list</button></div>'
        f'<div class="widget"><h4>Popular</h4>{popular}</div>'
        f'<div class="widget"><h4>Topics</h4><div class="tags">{topics}</div></div></aside></div>'
        f"{_cs_footer(ctx)}</body></html>")
def render_cs_post(ctx):
    return _post_page(ctx,_CS_CSS,_cs_header(ctx),_cs_footer(ctx))


# ════════════════════════════════════════════════════════════════════════════
# JOURNAL — minimal single column, Spectral, cream
# ════════════════════════════════════════════════════════════════════════════
_JN_CSS = """
:root{--ink:#1c1a17;--soft:#7a746c;--line:#e7e2d9;--bg:#faf8f3;--card:#fff;--accent:#1c1a17;--accent-dark:#000000;--hfont:'Spectral',serif;--bfont:'Spectral',serif}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Spectral',serif;color:var(--ink);background:var(--bg)}
a{text-decoration:none;color:inherit}.col{max-width:660px;margin:0 auto;padding:0 40px}
.jhead{text-align:center;padding:64px 0 16px}.jname{font-weight:800;font-size:32px;letter-spacing:-.4px}
.jtag{font-style:italic;color:var(--soft);font-size:16px;margin-top:8px}
.jnav{display:flex;justify-content:center;gap:26px;margin-top:22px;padding-bottom:30px;border-bottom:1px solid var(--line)}
.jnav a{font-family:'Inter';font-size:13px;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:var(--soft)}.jnav a:hover{color:var(--ink)}
.entry{padding:38px 0;border-bottom:1px solid var(--line)}
.entry .date{font-family:'Inter';font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--soft);margin-bottom:12px}
.entry h2{font-weight:800;font-size:30px;line-height:1.18;letter-spacing:-.4px}
.entry .ex{font-size:18px;line-height:1.7;color:#403a33;margin-top:12px}
.entry .etags{font-family:'Inter';font-size:12.5px;color:var(--soft);margin-top:14px}.entry .etags b{color:var(--accent);font-weight:600}
.jsub{text-align:center;padding:50px 0;border-bottom:1px solid var(--line)}.jsub h3{font-weight:800;font-size:24px}
.jsub p{color:var(--soft);font-size:16px;margin:10px 0 20px;font-style:italic}
.jsub .f{display:flex;gap:8px;max-width:400px;margin:0 auto}.jsub input{flex:1;border:1px solid var(--line);background:#fff;padding:13px 15px;font-family:'Inter';font-size:14px}
.jsub button{background:var(--ink);color:var(--bg);border:none;padding:0 22px;font-family:'Inter';font-weight:600;font-size:14px;cursor:pointer}
.jfoot{text-align:center;padding:40px 0 56px}.jfoot .social{display:flex;gap:22px;justify-content:center;font-family:'Inter';font-size:13px;font-weight:500;color:var(--soft);margin-bottom:18px}
.jfoot .social a{color:var(--soft)}
.powered{font-family:'Inter';font-size:13px;color:var(--soft)}.powered .mk{color:var(--ink);font-weight:700;display:inline-flex;align-items:center;gap:6px}
.powered .mk .d{width:15px;height:15px;border-radius:4px;background:linear-gradient(135deg,#06b6d4,#1e3a8a);display:inline-grid;place-items:center}.powered .mk .d svg{width:8px;height:8px}
"""
def _jn_header(ctx):
    return f'<div class="col jhead"><div class="jname">{escape(ctx.blog_title)}</div><div class="jtag">{escape(ctx.tagline or "")}</div><div class="jnav">{_navlinks(ctx,"")}</div></div>'
def _jn_footer(ctx):
    return f'<div class="col jfoot"><div class="social">{_social_html(ctx,"")}</div>{_powered_footer(ctx)}</div>'
def render_jn_feed(ctx):
    entries=""
    for p in ctx.posts:
        tg=" · ".join(f"<b>{escape(n)}</b>" for n,_ in p.tags)
        entries+=(f'<article class="entry"><div class="date">{p.date_str}</div>'
            f'<a href="{ctx.post_url(p)}"><h2>{escape(p.title)}</h2></a><p class="ex">{escape(p.excerpt)}</p>'
            f'<div class="etags">{tg}{" · " if tg else ""}{p.read_minutes} min read</div></article>')
    if not ctx.posts: entries='<div class="entry" style="text-align:center;color:var(--soft)">No posts yet.</div>'
    head=_seo_head(ctx,ctx.blog_title,ctx.tagline,canonical=f"{BASE_URL}{ctx.base_path}")
    return (f"{head}<style>{_JN_CSS}{_palette_css(ctx)}</style></head><body>{_jn_header(ctx)}"
        f'<div class="col">{entries}</div>'
        f'<div class="col jsub" id="subscribe"><h3>Subscribe</h3><p>New field notes, about once a week.</p>'
        f'<div class="f"><input placeholder="you@email.com"><button>Join</button></div></div>'
        f"{_jn_footer(ctx)}</body></html>")
def render_jn_post(ctx):
    return _post_page(ctx,_JN_CSS,_jn_header(ctx),_jn_footer(ctx))


# ════════════════════════════════════════════════════════════════════════════
# BENTO — modular tile grid, Space Grotesk, indigo/violet
# ════════════════════════════════════════════════════════════════════════════
_BN_CSS = """
:root{--ink:#15131f;--soft:#6a6580;--line:#eceaf2;--bg:#f6f5fa;--card:#fff;--accent:#7c3aed;--accent-dark:#5b21b6;--violet:#7c3aed;--indigo:#5b21b6;--coral:#f0598a;--teal:#0ea5a0;--amber:#f5a623;--hfont:'Space Grotesk',sans-serif;--bfont:'DM Sans',sans-serif}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:var(--ink);background:var(--bg)}
h1,h2,h3{font-family:'Space Grotesk',sans-serif}a{text-decoration:none;color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 40px}
.bhead{display:flex;align-items:center;height:84px;gap:24px}.bname{font-weight:700;font-size:24px;letter-spacing:-.5px}
.bnav{margin-left:auto;display:flex;gap:4px;align-items:center}.bnav a{font-size:14.5px;font-weight:600;color:var(--soft);padding:9px 14px;border-radius:10px}.bnav a:hover{color:var(--ink);background:#fff}
.bnav .sub{background:var(--ink);color:#fff!important;padding:10px 18px!important;border-radius:11px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:200px;gap:18px;padding:14px 0 40px}
.tile{border-radius:22px;padding:26px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end}
.tile .cat{font-family:'Space Grotesk';font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.85;margin-bottom:8px}
.tile h2,.tile h3{font-weight:700;line-height:1.15;letter-spacing:-.3px}
.feat{grid-column:span 2;grid-row:span 2;background:linear-gradient(150deg,var(--accent),var(--accent-dark));color:#fff}
.feat h2{font-size:28px}.feat .ex{font-size:14.5px;opacity:.9;margin-top:10px;line-height:1.5}.feat .meta{font-size:13px;opacity:.85;margin-top:14px}
.t-img{grid-row:span 2;color:#fff}.t-white{background:#fff;border:1px solid var(--line)}
.t-white .cat{color:var(--accent);opacity:1}.t-white h3{font-size:18px}.t-white .ex{font-size:13.5px;color:var(--soft);margin-top:6px;line-height:1.5}
.t-sub{background:var(--ink);color:#fff;grid-column:span 2}.t-sub h3{font-size:21px}.t-sub p{font-size:13.5px;opacity:.7;margin:8px 0 14px}
.t-sub .f{display:flex;gap:8px}.t-sub input{flex:1;border:none;border-radius:10px;padding:11px 13px;font-size:13.5px}.t-sub button{background:var(--accent);color:#fff;border:none;border-radius:10px;padding:0 18px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:'Space Grotesk'}
.t-tags{background:#fff;border:1px solid var(--line)}.t-tags h3{font-size:15px;margin-bottom:12px}.t-tags .ts{display:flex;flex-wrap:wrap;gap:7px}.t-tags .ts span{font-size:12px;font-weight:600;color:var(--soft);background:var(--bg);padding:6px 11px;border-radius:20px}
.bfoot{border-top:1px solid var(--line);padding:34px 0;display:flex;justify-content:space-between;align-items:center}
.bfoot .social{display:flex;gap:9px}.bfoot .social a{width:38px;height:38px;border-radius:11px;background:#fff;border:1px solid var(--line);display:grid;place-items:center;color:var(--soft);font-size:14px}
.powered{font-size:13px;color:var(--soft)}.powered .mk{color:var(--violet);font-weight:700;background:#fff;border:1px solid var(--line);padding:7px 12px;border-radius:9px;margin-left:5px;display:inline-flex;align-items:center;gap:6px}
.powered .mk .d{width:15px;height:15px;border-radius:4px;background:linear-gradient(135deg,#06b6d4,#1e3a8a);display:inline-grid;place-items:center}.powered .mk .d svg{width:8px;height:8px}
@media(max-width:880px){.grid{grid-template-columns:1fr;grid-auto-rows:auto}.tile{min-height:180px}.feat,.t-sub{grid-column:span 1}.bnav{display:none}}
"""
_BN_IMGCLS=["","background:linear-gradient(150deg,#f0598a,#d83f72)","background:linear-gradient(150deg,#0ea5a0,#0c7d79)","background:linear-gradient(150deg,#f5a623,#e08a10)"]
def _bn_header(ctx):
    return f'<div class="wrap"><div class="bhead"><a class="bname" href="{ctx.base_path or "/"}">◆ {escape(ctx.blog_title)}</a><div class="bnav">{_navlinks(ctx,"")}<a class="sub" href="#subscribe">Subscribe</a></div></div></div>'
def _bn_footer(ctx):
    return f'<div class="wrap"><div class="bfoot"><div class="social">{_social_html(ctx,"")}</div>{_powered_footer(ctx)}</div></div>'
def render_bn_feed(ctx):
    tiles=""
    if ctx.posts:
        f=ctx.posts[0];cat=" · ".join(n for n,_ in f.tags) or ""
        tiles+=(f'<a class="tile feat" href="{ctx.post_url(f)}"><div><div class="cat">{escape(cat)}</div>'
            f'<h2>{escape(f.title)}</h2><p class="ex">{escape(f.excerpt)}</p>'
            f'<div class="meta">{escape(ctx.username)} · {f.read_minutes} min read</div></div></a>')
    img_i=0
    rest=ctx.posts[1:]
    for idx,p in enumerate(rest):
        cat=p.tags[0][0] if p.tags else ""
        if idx%2==0:
            img_i+=1;style=_BN_IMGCLS[img_i%len(_BN_IMGCLS)] or f"background:{_grad(p.seed)}"
            tiles+=(f'<a class="tile t-img" href="{ctx.post_url(p)}" style="{style}"><div><div class="cat">{escape(cat)}</div><h3>{escape(p.title)}</h3></div></a>')
        else:
            tiles+=(f'<a class="tile t-white" href="{ctx.post_url(p)}"><div class="cat">{escape(cat)}</div><h3>{escape(p.title)}</h3><p class="ex">{escape(p.excerpt)}</p></a>')
    tagset={}
    for p in ctx.posts:
        for n,sl in p.tags: tagset[sl]=n
    topics="".join(f'<span>{escape(n)}</span>' for n in list(tagset.values())[:6])
    tiles+=(f'<div class="tile t-tags"><h3>Topics</h3><div class="ts">{topics}</div></div>'
        f'<div class="tile t-sub" id="subscribe"><h3>Get the next one</h3><p>New notes about once a week.</p>'
        f'<div class="f"><input placeholder="you@email.com"><button>Join</button></div></div>')
    head=_seo_head(ctx,ctx.blog_title,ctx.tagline,canonical=f"{BASE_URL}{ctx.base_path}")
    return (f"{head}<style>{_BN_CSS}{_palette_css(ctx)}</style></head><body>{_bn_header(ctx)}"
        f'<div class="wrap"><div class="grid">{tiles}</div></div>{_bn_footer(ctx)}</body></html>')
def render_bn_post(ctx):
    return _post_page(ctx,_BN_CSS,_bn_header(ctx),_bn_footer(ctx))


# ════════════════════════════════════════════════════════════════════════════
# CINEMATIC — dark premium, glowing gradient hero, Sora
# ════════════════════════════════════════════════════════════════════════════
_CN_CSS = """
:root{--bg:#0a0a12;--card:#13131f;--ink:#f3f2f8;--soft:#9a98ad;--line:#23222f;--accent:#a855f7;--accent-dark:#7c3aed;--g1:#a855f7;--g2:#ec4899;--g3:#22d3ee;--hfont:'Sora',sans-serif;--bfont:'Inter',sans-serif}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;color:var(--ink);background:var(--bg)}
h1,h2,h3{font-family:'Sora',sans-serif}a{text-decoration:none;color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 40px}
.chead{display:flex;align-items:center;height:80px;gap:24px;border-bottom:1px solid var(--line)}
.cname{font-weight:800;font-size:22px;background:linear-gradient(110deg,#fff,#c9c7d6);-webkit-background-clip:text;background-clip:text;color:transparent}
.cnav{margin-left:auto;display:flex;gap:4px;align-items:center}.cnav a{font-size:14.5px;font-weight:500;color:var(--soft);padding:9px 14px;border-radius:9px}.cnav a:hover{color:#fff}
.cnav .sub{background:linear-gradient(110deg,var(--accent),var(--accent-dark));color:#fff!important;font-weight:600;padding:10px 18px!important;border-radius:10px}
.hero{position:relative;border-radius:24px;overflow:hidden;margin:34px 0 14px;min-height:380px;display:flex;align-items:flex-end;padding:48px;background:radial-gradient(120% 120% at 80% 10%,rgba(168,85,247,.5),transparent 50%),radial-gradient(120% 120% at 10% 90%,rgba(236,72,153,.42),transparent 55%),linear-gradient(135deg,#1a1430,#0c0c18)}
.hero::after{content:"";position:absolute;inset:0;border-radius:24px;border:1px solid rgba(255,255,255,.08)}
.hero .in{position:relative;max-width:640px}.hero .cat{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--g3)}
.hero h1{font-weight:800;font-size:42px;line-height:1.08;letter-spacing:-1px;margin:14px 0}.hero .ex{font-size:16px;color:#c7c5d6;line-height:1.55;max-width:54ch}
.hero .meta{font-size:13.5px;color:var(--soft);margin-top:18px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:34px 0 50px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden}.card .img{aspect-ratio:16/10}
.card .cbody{padding:20px}.card .cat{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.card h3{font-weight:700;font-size:18px;line-height:1.25;margin:8px 0 8px}.card .ex{font-size:13.5px;color:var(--soft);line-height:1.5}.card .m{font-size:12px;color:#6a6880;margin-top:12px}
.card .tagrow{display:none}
.subband{border-radius:20px;padding:44px;text-align:center;background:radial-gradient(100% 140% at 50% 0%,rgba(168,85,247,.3),transparent 60%),var(--card);border:1px solid var(--line);margin-bottom:40px}
.subband h3{font-weight:800;font-size:26px}.subband p{color:var(--soft);font-size:15px;margin:10px 0 22px}
.subband .f{display:flex;gap:9px;max-width:430px;margin:0 auto}.subband input{flex:1;background:#0a0a12;border:1px solid var(--line);border-radius:11px;padding:14px 16px;color:#fff;font-size:14px}
.subband button{background:linear-gradient(110deg,var(--accent),var(--accent-dark));color:#fff;border:none;border-radius:11px;padding:0 24px;font-weight:700;font-size:14px;cursor:pointer;font-family:'Sora'}
.cfoot{border-top:1px solid var(--line);padding:34px 0;display:flex;justify-content:space-between;align-items:center}
.cfoot .social{display:flex;gap:9px}.cfoot .social a{width:38px;height:38px;border-radius:11px;background:var(--card);border:1px solid var(--line);display:grid;place-items:center;color:var(--soft);font-size:14px}
.powered{font-size:13px;color:var(--soft)}.powered .mk{color:#fff;font-weight:700;background:var(--card);border:1px solid var(--line);padding:7px 12px;border-radius:9px;margin-left:5px;display:inline-flex;align-items:center;gap:6px}
.powered .mk .d{width:15px;height:15px;border-radius:4px;background:linear-gradient(135deg,#06b6d4,#1e3a8a);display:inline-grid;place-items:center}.powered .mk .d svg{width:8px;height:8px}
@media(max-width:880px){.grid{grid-template-columns:1fr}.hero h1{font-size:30px}.cnav{display:none}}
"""
def _cn_header(ctx):
    return f'<div class="wrap"><div class="chead"><a class="cname" href="{ctx.base_path or "/"}">{escape(ctx.blog_title)}</a><div class="cnav">{_navlinks(ctx,"")}<a class="sub" href="#subscribe">Subscribe</a></div></div></div>'
def _cn_footer(ctx):
    return f'<div class="wrap"><div class="cfoot"><div class="social">{_social_html(ctx,"")}</div>{_powered_footer(ctx)}</div></div>'
def render_cn_feed(ctx):
    hero=""
    if ctx.posts:
        f=ctx.posts[0];cat=" · ".join(n for n,_ in f.tags) or ""
        hero=(f'<div class="hero"><div class="in"><div class="cat">{escape(cat)}</div>'
            f'<h1>{escape(f.title)}</h1><p class="ex">{escape(f.excerpt)}</p>'
            f'<div class="meta">{escape(ctx.username)} · {f.date_str} · {f.read_minutes} min read</div></div></div>')
        hero=f'<a href="{ctx.post_url(f)}" style="display:block">{hero}</a>'
    cards=_cards_html(ctx,ctx.posts[1:],"card","img")
    head=_seo_head(ctx,ctx.blog_title,ctx.tagline,canonical=f"{BASE_URL}{ctx.base_path}")
    return (f"{head}<style>{_CN_CSS}{_palette_css(ctx)}</style></head><body>{_cn_header(ctx)}"
        f'<div class="wrap">{hero}<div class="grid">{cards}</div>'
        f'<div class="subband" id="subscribe"><h3>Get the next one in your inbox</h3><p>New posts, straight to your inbox.</p>'
        f'<div class="f"><input placeholder="you@email.com"><button>Subscribe</button></div></div></div>{_cn_footer(ctx)}</body></html>')
def render_cn_post(ctx):
    return _post_page(ctx,_CN_CSS,_cn_header(ctx),_cn_footer(ctx))


# ════════════════════════════════════════════════════════════════════════════
# GLASS — frosted cards on pastel mesh, Outfit, violet
# ════════════════════════════════════════════════════════════════════════════
_GL_CSS = """
:root{--ink:#1a1830;--soft:#5e5a78;--line:rgba(255,255,255,.55);--card:rgba(255,255,255,.45);--bg:#eef2ff;--accent:#6d28d9;--accent-dark:#5b21b6;--hfont:'Outfit',sans-serif;--bfont:'Inter',sans-serif}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;color:var(--ink);min-height:100vh;background:radial-gradient(50% 50% at 12% 18%,#b8e6ff 0,transparent 60%),radial-gradient(45% 45% at 88% 12%,#ffd6ec 0,transparent 55%),radial-gradient(55% 55% at 75% 85%,#d7c9ff 0,transparent 60%),radial-gradient(50% 50% at 20% 92%,#c7f5e3 0,transparent 55%),linear-gradient(135deg,#eef2ff,#fdf2f8);background-attachment:fixed}
h1,h2,h3{font-family:'Outfit',sans-serif}a{text-decoration:none;color:inherit}
.wrap{max-width:1060px;margin:0 auto;padding:0 40px}
.glass{background:rgba(255,255,255,.45);backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);border:1px solid rgba(255,255,255,.55);box-shadow:0 16px 50px -20px rgba(80,70,160,.32)}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.glass{background:rgba(255,255,255,.92)}}
.ghead{position:sticky;top:18px;z-index:20;margin:18px auto 0;max-width:1060px;border-radius:18px;padding:0 26px}.ghead .in{display:flex;align-items:center;height:64px;gap:20px}
.gname{font-weight:800;font-size:21px;letter-spacing:-.4px}.gnav{margin-left:auto;display:flex;gap:3px;align-items:center}
.gnav a{font-size:14.5px;font-weight:600;color:var(--soft);padding:8px 13px;border-radius:10px}.gnav a:hover{color:var(--ink);background:rgba(255,255,255,.5)}
.gnav .sub{background:var(--accent);color:#fff!important;padding:9px 17px!important;border-radius:11px}
.ghero{text-align:center;padding:60px 24px 36px}.ghero .k{font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
.ghero h1{font-weight:800;font-size:50px;line-height:1.06;letter-spacing:-1.4px;margin:16px auto 0;max-width:15ch}.ghero p{font-size:18px;color:var(--soft);margin:16px auto 0;max-width:50ch}
.feat{border-radius:24px;padding:14px;display:grid;grid-template-columns:1.1fr 1fr;gap:8px;align-items:stretch;margin-bottom:26px}
.feat .img{border-radius:16px;min-height:300px}.feat .tx{padding:30px 26px;display:flex;flex-direction:column;justify-content:center}
.feat .cat{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.feat h2{font-weight:800;font-size:30px;line-height:1.15;letter-spacing:-.5px;margin:10px 0}.feat .ex{font-size:15px;color:var(--soft);line-height:1.6}.feat .meta{font-size:13px;color:var(--soft);margin-top:16px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.card{border-radius:20px;overflow:hidden}.card .img{aspect-ratio:16/10}
.card .cbody{padding:20px}.card .cat{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.card h3{font-weight:700;font-size:18px;line-height:1.25;margin:8px 0 8px}.card .ex{font-size:13.5px;color:var(--soft);line-height:1.5}.card .m{font-size:12px;color:#8682a0;margin-top:12px}.card .tagrow{display:none}
.gsub{border-radius:22px;padding:44px;text-align:center;margin:30px 0}.gsub h3{font-weight:800;font-size:26px}.gsub p{color:var(--soft);font-size:15px;margin:10px 0 22px}
.gsub .f{display:flex;gap:9px;max-width:420px;margin:0 auto}.gsub input{flex:1;border:1px solid var(--line);background:rgba(255,255,255,.6);border-radius:12px;padding:14px 16px;font-size:14px}
.gsub button{background:var(--accent);color:#fff;border:none;border-radius:12px;padding:0 24px;font-weight:700;font-size:14px;cursor:pointer;font-family:'Outfit'}
.gfoot{border-radius:18px;padding:26px 30px;margin:0 0 40px;display:flex;justify-content:space-between;align-items:center}
.gfoot .social{display:flex;gap:9px}.gfoot .social a{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.5);border:1px solid var(--line);display:grid;place-items:center;color:var(--soft);font-size:14px}
.powered{font-size:13px;color:var(--soft)}.powered .mk{color:var(--accent);font-weight:700;background:rgba(255,255,255,.6);border:1px solid var(--line);padding:7px 12px;border-radius:9px;margin-left:5px;display:inline-flex;align-items:center;gap:6px}
.powered .mk .d{width:15px;height:15px;border-radius:4px;background:linear-gradient(135deg,#06b6d4,#1e3a8a);display:inline-grid;place-items:center}.powered .mk .d svg{width:8px;height:8px}
@media(max-width:880px){.grid{grid-template-columns:1fr}.feat{grid-template-columns:1fr}.ghero h1{font-size:34px}.gnav{display:none}}
"""
def _gl_header(ctx):
    return f'<div class="ghead glass"><div class="in"><a class="gname" href="{ctx.base_path or "/"}">◈ {escape(ctx.blog_title)}</a><div class="gnav">{_navlinks(ctx,"")}<a class="sub" href="#subscribe">Subscribe</a></div></div></div>'
def _gl_footer(ctx):
    return f'<div class="wrap"><div class="gfoot glass"><div class="social">{_social_html(ctx,"")}</div>{_powered_footer(ctx)}</div></div>'
def render_gl_feed(ctx):
    body=""
    if ctx.posts:
        f=ctx.posts[0];cat=" · ".join(n for n,_ in f.tags) or ""
        body+=(f'<a class="feat glass" href="{ctx.post_url(f)}"><div class="img" style="{f.cover_style()}"></div>'
            f'<div class="tx"><div class="cat">{escape(cat)}</div><h2>{escape(f.title)}</h2>'
            f'<p class="ex">{escape(f.excerpt)}</p><div class="meta">{escape(ctx.username)} · {f.date_str} · {f.read_minutes} min read</div></div></a>')
    cards=""
    for p in ctx.posts[1:]:
        cat=p.tags[0][0] if p.tags else ""
        cards+=(f'<a class="card glass" href="{ctx.post_url(p)}"><div class="img" style="{p.cover_style()}"></div>'
            f'<div class="cbody"><div class="cat">{escape(cat)}</div><h3>{escape(p.title)}</h3>'
            f'<p class="ex">{escape(p.excerpt)}</p><div class="m">{p.date_str} · {p.read_minutes} min</div></div></a>')
    head=_seo_head(ctx,ctx.blog_title,ctx.tagline,canonical=f"{BASE_URL}{ctx.base_path}")
    return (f"{head}<style>{_GL_CSS}{_palette_css(ctx)}</style></head><body>{_gl_header(ctx)}"
        f'<div class="wrap"><div class="ghero"><div class="k">{escape(ctx.tagline or "")}</div><h1>{escape(ctx.blog_title)}</h1></div>'
        f'{body}<div class="grid">{cards}</div>'
        f'<div class="gsub glass" id="subscribe"><h3>Get the next one in your inbox</h3><p>New posts, straight to your inbox.</p>'
        f'<div class="f"><input placeholder="you@email.com"><button>Subscribe</button></div></div></div>{_gl_footer(ctx)}</body></html>')
def render_gl_post(ctx):
    return _post_page(ctx,_GL_CSS,_gl_header(ctx),_gl_footer(ctx))


# ── register all themes + their fonts ────────────────────────────────────────
_THEME_FONTS.update({
    "classic-sidebar": "PT+Serif:wght@400;700|Inter:wght@400;500;600;700",
    "journal": "Spectral:ital,wght@0,400;0,500;0,600;0,800;1,400|Inter:wght@400;500;600",
    "bento": "Space+Grotesk:wght@500;600;700|DM+Sans:wght@400;500;600;700",
    "cinematic": "Sora:wght@400;600;700;800|Inter:wght@400;500;600",
    "glass": "Outfit:wght@400;500;600;700;800|Inter:wght@400;500;600",
})
THEMES.update({
    "classic-sidebar": (render_cs_feed, render_cs_post),
    "journal": (render_jn_feed, render_jn_post),
    "bento": (render_bn_feed, render_bn_post),
    "cinematic": (render_cn_feed, render_cn_post),
    "glass": (render_gl_feed, render_gl_post),
})
