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
    return f"""<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="article"><meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}"><meta property="og:site_name" content="{escape(ctx.blog_title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">{og}{canon}
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
    return (f'<div class="{mk_cls}">Powered by '
            f'<a class="mk" href="{ref}"><span class="d">'
            f'<svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span> '
            f'SuperAdPro</a></div>')


def _share_html(ctx, btn_cls):
    nets = [("𝕏", "https://twitter.com/intent/tweet"), ("f", "https://www.facebook.com/sharer/sharer.php"),
            ("in", "https://www.linkedin.com/sharing/share-offsite"), ("🔗", "#")]
    return "".join(f'<span class="{btn_cls}">{g}</span>' for g, _ in nets)


# ════════════════════════════════════════════════════════════════════════════
# BANNER THEME (default) — green editorial, Merriweather. Mirrors
# docs/blog-assets/theme-banner-home.html / -post.html.
# ════════════════════════════════════════════════════════════════════════════
_BANNER_CSS = """
:root{--ink:#1a2620;--soft:#5c6b63;--line:#e3e8e4;--bg:#fcfdfc;--accent:#0f6e4f;--gold:#b8893a;--paper:#f5f7f4}
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
.banner{background:linear-gradient(135deg,#0f6e4f,#0a4d37);color:#fff;text-align:center;padding:74px 24px;position:relative;overflow:hidden}
.banner::after{content:"";position:absolute;inset:0;background:radial-gradient(70% 120% at 50% 0%,rgba(255,255,255,.12),transparent 60%)}
.banner .k{font-weight:600;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#a7e0c9;position:relative}
.banner h1{font-weight:900;font-size:52px;line-height:1.08;margin:16px auto 0;max-width:16ch;position:relative}
.banner p{font-size:19px;color:#d6ece2;margin:18px auto 0;max-width:54ch;position:relative;font-style:italic;font-family:'Merriweather',serif}
.feed{padding:64px 0 30px}
.lead-post{display:grid;grid-template-columns:1.15fr 1fr;gap:38px;align-items:center;margin-bottom:60px}
.lead-post .img{aspect-ratio:16/11;border-radius:16px;overflow:hidden;box-shadow:0 24px 50px -28px rgba(15,110,79,.5)}
.tagrow{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}.tagrow.center{justify-content:center}
.tag{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);background:#e7f3ee;padding:5px 10px;border-radius:6px}
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
.cover{aspect-ratio:16/8;border-radius:18px;margin:14px auto 0;max-width:1000px;box-shadow:0 28px 60px -32px rgba(15,110,79,.45)}
.body{font-family:'Merriweather',serif;font-size:19px;line-height:1.78;color:#26332c}
.body p{margin:26px 0}.body h2{font-size:30px;font-weight:900;margin:46px 0 4px;line-height:1.2}
.body img{max-width:100%;border-radius:14px;margin:30px 0}
.body blockquote{border-left:4px solid var(--accent);padding:6px 0 6px 26px;margin:34px 0;font-size:24px;font-style:italic;line-height:1.5}
.share-row{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:20px 0;margin:48px 0 0}
.share-row .btns{display:flex;gap:9px}.share-row .lbl{font-size:13px;color:var(--soft);margin-right:4px}
.share-row .btns span,.sb{width:40px;height:40px;border-radius:10px;border:1px solid var(--line);display:grid;place-items:center;color:var(--soft);font-size:15px;cursor:pointer}
.optin{background:linear-gradient(135deg,#0f6e4f,#0a4d37);border-radius:20px;padding:44px;text-align:center;color:#fff;margin:54px 0}
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
    body = [f"{head}<style>{_BANNER_CSS}</style></head><body>", _banner_header(ctx, active="Home")]
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
    body = [f"{head}<style>{_BANNER_CSS}</style></head><body>", _banner_header(ctx)]
    body.append(
        f'<div class="post-top wrap">{_tagrow(p, center=True)}<h1>{escape(p.title)}</h1>'
        f'<div class="meta center"><span class="avatar"></span> {escape(ctx.username)} · {p.date_str} · {p.read_minutes} min read</div></div>'
        f'<div class="cover" style="{p.cover_style()}"></div>'
    )
    body.append(f'<article class="article"><div class="body">{p.body or ""}</div>')
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
