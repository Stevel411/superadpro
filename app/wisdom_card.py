"""Daily Wisdom share card — server-side PNG.

Rendered on the server rather than in the browser so the output is identical
on every device: html2canvas gives a different image on an old Android phone
than on a desktop, and this file is the thing members put their name to.

Portrait is 1080x1350 (4:5) — the shape that fills a phone screen on
Instagram, Facebook and WhatsApp without being cropped. Square is 1080x1080.

The source line is drawn on every card, including this one. That is the
whole point of the feature: a quote goes out with its provenance attached
or it does not go out.
"""

import io
import os

from PIL import Image, ImageDraw, ImageFont

_FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")

SIZES = {
    "4x5": (1080, 1350),
    "1x1": (1080, 1080),
}

# name -> (top, bottom, text, muted, rule, brand-accent)
STYLES = {
    "navy":  ("#0a1f52", "#12388f", "#ffffff", "#b8c7e8", "#c8102e", "#f0a8b4"),
    "red":   ("#8f1830", "#c8102e", "#ffffff", "#f3c4cc", "#0a1f52", "#ffd9df"),
    "ink":   ("#0f172a", "#1e293b", "#ffffff", "#94a3b8", "#c8102e", "#f0a8b4"),
    "light": ("#f8fafc", "#e9eef6", "#0a1f52", "#64748b", "#c8102e", "#c8102e"),
}


def _font(weight: str, size: int):
    path = os.path.join(_FONT_DIR, "Inter-%s.ttf" % weight)
    if not os.path.exists(path):                     # never crash a share
        return ImageFont.load_default()
    return ImageFont.truetype(path, size)


def _hex(c: str):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def _gradient(size, top, bottom):
    w, h = size
    base = Image.new("RGB", (1, h))
    px = base.load()
    t, b = _hex(top), _hex(bottom)
    for y in range(h):
        f = y / max(1, h - 1)
        px[0, y] = (int(t[0] + (b[0] - t[0]) * f),
                    int(t[1] + (b[1] - t[1]) * f),
                    int(t[2] + (b[2] - t[2]) * f))
    return base.resize(size)


def _wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _fit(draw, text, max_w, max_h, weight="Bold", hi=64, lo=30):
    """Largest size at which the quote fits the box. Long quotes shrink
    rather than overflow or get truncated — a cut-off quote is worse than
    a small one."""
    best = (lo, _wrap(draw, text, _font(weight, lo), max_w))
    for size in range(hi, lo - 1, -2):
        f = _font(weight, size)
        lines = _wrap(draw, text, f, max_w)
        if len(lines) * int(size * 1.34) <= max_h:
            return size, lines, f
        best = (size, lines)
    f = _font(weight, lo)
    return lo, _wrap(draw, text, f, max_w), f


def render(quote: dict, ref_link: str, style: str = "navy", fmt: str = "4x5",
           member_name: str = None) -> bytes:
    W, H = SIZES.get(fmt, SIZES["4x5"])
    top, bottom, ink, muted, rule, accent = STYLES.get(style, STYLES["navy"])

    img = _gradient((W, H), top, bottom).convert("RGB")

    # One soft accent bloom, top right. Kept subtle — the words are the hero.
    glow = Image.new("RGB", (W, H), _hex(top))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W - 340, -300, W + 300, 340], fill=_hex(rule))
    img = Image.blend(img, glow, 0.13)

    d = ImageDraw.Draw(img)
    M = 84                       # margin
    box = W - M * 2

    # eyebrow
    f_eb = _font("Black", 25)
    d.text((M, M), "DAILY WISDOM", font=f_eb, fill=_hex(muted))

    # quote — sized to fit, never truncated
    q_top = M + 96
    foot_h = 300 if fmt == "4x5" else 280
    q_space = H - q_top - foot_h
    size, lines, f_q = _fit(d, quote.get("text", ""), box, q_space)
    lh = int(size * 1.34)
    y = q_top
    for ln in lines:
        d.text((M, y), ln, font=f_q, fill=_hex(ink))
        y += lh

    # provenance — the red rule, then who and where. Always drawn.
    y += 34
    d.rectangle([M, y, M + box, y + 5], fill=_hex(rule))
    y += 26
    f_who = _font("Black", 33)
    d.text((M, y), (quote.get("author") or "").upper(), font=f_who, fill=_hex(ink))
    y += 44
    f_src = _font("Medium", 24)
    for ln in _wrap(d, quote.get("source") or "", f_src, box)[:2]:
        d.text((M, y), ln, font=f_src, fill=_hex(muted))
        y += 32

    # footer — brand, the member's link, the tagline
    fy = H - M - 96
    f_br = _font("Black", 38)
    d.text((M, fy), "Advantage", font=f_br, fill=_hex(ink))
    off = d.textlength("Advantage", font=f_br)
    d.text((M + off, fy), "Life", font=f_br, fill=_hex(accent))

    f_lk = _font("SemiBold", 25)
    d.text((M, fy + 50), ref_link, font=f_lk, fill=_hex(muted))

    f_tag = _font("Black", 22)
    tag = ["YOUR EFFORT.", "YOUR INCOME.", "100% YOURS."]
    ty = fy - 6
    for ln in tag:
        w = d.textlength(ln, font=f_tag)
        d.text((W - M - w, ty), ln, font=f_tag, fill=_hex(muted))
        ty += 30

    if member_name:
        f_nm = _font("SemiBold", 24)
        d.text((M, fy + 84), "Shared by %s" % member_name, font=f_nm, fill=_hex(muted))

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


def caption(quote: dict, ref_link: str) -> str:
    """Text to paste alongside the image. No hype and no earnings claim —
    a quote post that pitches stops being a quote post."""
    return (
        "\u201c%s\u201d\n\u2014 %s, %s\n\n%s"
        % (quote.get("text", ""), quote.get("author", ""),
           quote.get("source", ""), ref_link)
    )
