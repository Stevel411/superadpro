"""Content Kit share graphics — 1080x1080 branded social posts, rendered per
member with their handle/link baked in. Matches the approved starter-library
mockup EXACTLY: 150deg diagonal gradient backgrounds (one flat), gold accent
words (tagline = green, watch = none). Pure Pillow + numpy.
"""
import os
from io import BytesIO
import numpy as np
from PIL import Image, ImageDraw, ImageFont

_FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")

S = 1080
PAD = 84
NAVY = (10, 31, 82)
NAVY2 = (18, 56, 143)
RED = (200, 16, 46)
GOLD = (240, 165, 42)
GREEN = (34, 194, 107)
WHITE = (255, 255, 255)
DIM = (200, 214, 245)
TEAL_A = (14, 42, 110)
TEAL_B = (21, 150, 176)

GRAPHICS = {
    "join": {
        "grad": [(0.0, NAVY), (1.0, NAVY2)],
        "lines": [[("Join ", WHITE), ("free.", GOLD)], [("Every tool", WHITE)], [("from day one.", WHITE)]],
        "sub": "No card. No catch. Full access.",
        "link": "advantagelife.club/ref/%s",
    },
    "watch": {
        "grad": [(0.0, TEAL_A), (1.0, TEAL_B)],
        "lines": [[("Your ads.", WHITE)], [("Watched by", WHITE)], [("real people.", WHITE)]],
        "sub": "Not bots. Real members, every view.",
        "link": "advantagelife.club/ref/%s",
    },
    "tagline": {
        "grad": [(0.0, NAVY)],
        "lines": [[("Your effort.", WHITE)], [("Your income.", WHITE)], [("100% yours.", GREEN)]],
        "sub": None,
        "link": "advantagelife.club/ref/%s",
    },
    "games": {
        "grad": [(0.0, NAVY), (1.0, RED)],
        "lines": [[("Free game.", WHITE)], [("Real prize.", WHITE)], [("$400 ", GOLD), ("monthly.", WHITE)]],
        "sub": "Top score each month wins.",
        "link": "advantagelife.club/play/flight/%s",
    },
    "antispam": {
        "grad": [(0.0, NAVY), (0.7, NAVY2), (1.0, RED)],
        "lines": [[("No ad budget.", WHITE)], [("No cold DMs.", WHITE)], [("Just ", WHITE), ("share.", GOLD)]],
        "sub": "Share something people actually want.",
        "link": "advantagelife.club/ref/%s",
    },
    "freedom": {
        "grad": [(0.0, NAVY), (1.0, NAVY2)],
        "lines": [[("Financial", WHITE)], [("freedom isn't", WHITE)], [("luck. It's ", WHITE), ("a plan.", GOLD)]],
        "sub": None,
        "link": "advantagelife.club/ref/%s",
    },
}
GRAPHIC_KEYS = tuple(GRAPHICS.keys())
GRAPHIC_LABELS = {
    "join": "Join free", "watch": "Watched by real people", "tagline": "Your effort, your income",
    "games": "$400 game prize", "antispam": "No cold DMs", "freedom": "Freedom is a plan",
}


def _font(weight, size):
    p = os.path.join(_FONT_DIR, "Inter-%s.ttf" % weight)
    return ImageFont.truetype(p, size) if os.path.exists(p) else ImageFont.load_default()


def _grad_bg(stops):
    if len(stops) == 1:
        return Image.new("RGB", (S, S), stops[0][1])
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    t = (xx + yy) / (2.0 * (S - 1))
    pos = np.array([p for p, _ in stops], dtype=np.float32)
    cols = np.array([c for _, c in stops], dtype=np.float32)
    r = np.interp(t, pos, cols[:, 0])
    g = np.interp(t, pos, cols[:, 1])
    b = np.interp(t, pos, cols[:, 2])
    arr = np.stack([r, g, b], axis=-1).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def _line_w(draw, segs, font):
    return sum(draw.textbbox((0, 0), t, font=font)[2] for t, _ in segs)


def render(key, username):
    g = GRAPHICS.get((key or "").lower()) or GRAPHICS["join"]
    uname = (username or "member").lstrip("@")[:32]
    img = _grad_bg(g["grad"])
    d = ImageDraw.Draw(img)

    bx, by = PAD, PAD
    d.rounded_rectangle([bx, by, bx + 60, by + 60], radius=16, fill=WHITE)
    d.line([(bx + 14, by + 46), (bx + 26, by + 31), (bx + 34, by + 40), (bx + 48, by + 20)],
           fill=RED, width=6, joint="curve")
    d.line([(bx + 40, by + 20), (bx + 48, by + 20), (bx + 48, by + 28)], fill=RED, width=6, joint="curve")
    fb = _font("Black", 40)
    tx = bx + 60 + 18
    ty = by + (60 - 40) // 2 - 2
    d.text((tx, ty), "Advantage", font=fb, fill=WHITE)
    aw = d.textbbox((0, 0), "Advantage", font=fb)[2]
    d.text((tx + aw, ty), "Life", font=fb, fill=RED)

    usable = S - PAD * 2
    size = 128
    while size > 60:
        f = _font("Black", size)
        if max(_line_w(d, ln, f) for ln in g["lines"]) <= usable:
            break
        size -= 4
    fh = _font("Black", size)
    lh = int(size * 1.06)
    sub_h = 50 if g["sub"] else 0
    block_h = lh * len(g["lines"]) + sub_h
    y = by + 60 + max(60, (S - PAD - 220 - (by + 60) - block_h) // 2)

    for ln in g["lines"]:
        x = PAD
        for text, col in ln:
            d.text((x, y), text, font=fh, fill=col)
            x += d.textbbox((0, 0), text, font=fh)[2]
        y += lh
    if g["sub"]:
        d.text((PAD, y + 8), g["sub"], font=_font("Bold", 34), fill=DIM)

    link = g["link"] % uname
    fl = _font("Bold", 36)
    ly = S - PAD - 36
    d.polygon([(PAD, ly - 2), (PAD, ly + 30), (PAD + 22, ly + 14)], fill=GOLD)
    d.text((PAD + 34, ly - 2), link, font=fl, fill=WHITE)

    out = BytesIO()
    img.save(out, format="PNG")
    out.seek(0)
    return out.getvalue()


# ── Winner's certificate (Watch-to-Earn Games) ──────────────────────────────
import calendar as _calendar
import math as _math


def _period_label(period):
    try:
        y, m = str(period).split("-")
        return "%s %s" % (_calendar.month_name[int(m)], y)
    except Exception:
        return str(period)


def _ctext(d, cx, y, text, font, fill):
    w = d.textbbox((0, 0), text, font=font)[2]
    d.text((cx - w / 2, y), text, font=font, fill=fill)


def _star(d, cx, cy, r_out, r_in, fill):
    pts = []
    for i in range(10):
        ang = -_math.pi / 2 + i * _math.pi / 5
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * _math.cos(ang), cy + r * _math.sin(ang)))
    d.polygon(pts, fill=fill)


def render_certificate(name, game_label, period, score):
    """A4-landscape branded winner's certificate (PNG bytes)."""
    W, H = 1600, 1130
    img = Image.new("RGB", (W, H), (236, 240, 249))
    d = ImageDraw.Draw(img)
    m = 46
    d.rounded_rectangle([m, m, W - m, H - m], radius=30, fill=WHITE)
    for off, wdt in ((80, 5), (94, 2)):
        d.rounded_rectangle([off, off, W - off, H - off], radius=18, outline=GOLD, width=wdt)
    cx = W // 2
    # logo: navy tile + red tick + wordmark, centred
    tile = 56
    lx = cx - 150
    ly = 128
    d.rounded_rectangle([lx, ly, lx + tile, ly + tile], radius=15, fill=NAVY)
    d.line([(lx + 13, ly + 43), (lx + 24, ly + 29), (lx + 31, ly + 37), (lx + 44, ly + 18)],
           fill=RED, width=6, joint="curve")
    fb = _font("Black", 38)
    wt = lx + tile + 16
    wy = ly + (tile - 38) // 2 - 2
    d.text((wt, wy), "Advantage", font=fb, fill=NAVY)
    aw = d.textbbox((0, 0), "Advantage", font=fb)[2]
    d.text((wt + aw, wy), "Life", font=fb, fill=RED)
    # eyebrow
    d.text((cx - d.textbbox((0, 0), "C E R T I F I C A T E   O F   A C H I E V E M E N T", font=_font("Bold", 26))[2] / 2, 244),
           "C E R T I F I C A T E   O F   A C H I E V E M E N T", font=_font("Bold", 26), fill=GOLD)
    # title
    _ctext(d, cx, 292, "%s Champion" % game_label, _font("Black", 82), NAVY)
    d.line([(cx - 110, 418), (cx + 110, 418)], fill=GOLD, width=4)
    # presented to
    _ctext(d, cx, 452, "This certificate is proudly presented to", _font("Medium", 32), (92, 103, 134))
    _ctext(d, cx, 506, (name or "Member")[:34], _font("Black", 92), NAVY)
    # achievement
    _ctext(d, cx, 648, "for achieving the top score of", _font("Medium", 32), (92, 103, 134))
    _ctext(d, cx, 694, "{:,}".format(int(score or 0)), _font("Black", 70), RED)
    _ctext(d, cx, 800, _period_label(period), _font("Bold", 38), NAVY2)
    # gold seal + star
    sx, sy = cx, 936
    d.ellipse([sx - 52, sy - 52, sx + 52, sy + 52], fill=GOLD)
    d.ellipse([sx - 44, sy - 44, sx + 44, sy + 44], outline=WHITE, width=3)
    _star(d, sx, sy, 26, 11, WHITE)
    # footer
    _ctext(d, cx, H - 118, "AdvantageLife  ·  Watch-to-Earn Games  ·  $400 Prize",
           _font("SemiBold", 25), (120, 134, 166))
    out = BytesIO()
    img.save(out, "PNG")
    return out.getvalue()
