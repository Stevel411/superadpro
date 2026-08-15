"""Content Kit share graphics — 1080x1080 branded social posts, rendered per
member with their handle/link baked in. Flat solid AdvantageLife colours (no
gradients). Same pure-Pillow approach as score_card.py.
"""
import os
from io import BytesIO
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
DIM = (159, 180, 230)

# Each graphic: bg colour, accent (corner rule), heading lines as [(text,colour)]
# segments, optional sub, and a link template (%s = username).
GRAPHICS = {
    "join": {
        "bg": NAVY, "accent": RED,
        "lines": [[("Join ", WHITE), ("free.", GOLD)],
                  [("Every tool", WHITE)], [("from day one.", WHITE)]],
        "sub": "No card. No catch. Full access.",
        "link": "advantagelife.club/ref/%s",
    },
    "watch": {
        "bg": NAVY, "accent": (23, 169, 162),
        "lines": [[("Your ads.", WHITE)], [("Watched by", WHITE)], [("real people.", GOLD)]],
        "sub": "Not bots. Real members, every view.",
        "link": "advantagelife.club/ref/%s",
    },
    "tagline": {
        "bg": NAVY, "accent": GOLD,
        "lines": [[("Your effort.", WHITE)], [("Your income.", WHITE)], [("100% yours.", GOLD)]],
        "sub": None,
        "link": "advantagelife.club/ref/%s",
    },
    "games": {
        "bg": NAVY, "accent": RED,
        "lines": [[("Free game.", WHITE)], [("Real prize.", WHITE)], [("$400 ", GOLD), ("monthly.", WHITE)]],
        "sub": "Top score each month wins.",
        "link": "advantagelife.club/play/flight/%s",
    },
    "antispam": {
        "bg": NAVY, "accent": GREEN,
        "lines": [[("No ad budget.", WHITE)], [("No cold DMs.", WHITE)], [("Just ", WHITE), ("share.", GOLD)]],
        "sub": "Share something people actually want.",
        "link": "advantagelife.club/ref/%s",
    },
    "freedom": {
        "bg": NAVY, "accent": RED,
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


def _line_w(draw, segs, font):
    return sum(draw.textbbox((0, 0), t, font=font)[2] for t, _ in segs)


def render(key, username):
    g = GRAPHICS.get((key or "").lower()) or GRAPHICS["join"]
    uname = (username or "member").lstrip("@")[:32]
    img = Image.new("RGB", (S, S), g["bg"])
    d = ImageDraw.Draw(img)

    # corner accent block (flat, adds interest without gradients)
    d.rectangle([0, 0, 14, S], fill=g["accent"])

    # brand mark (top)
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

    # heading — auto-fit so the widest line fits the usable width
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

    # link (bottom) with a small play chevron
    link = g["link"] % uname
    fl = _font("Bold", 36)
    ly = S - PAD - 36
    d.polygon([(PAD, ly - 2), (PAD, ly + 30), (PAD + 22, ly + 14)], fill=GOLD)
    d.text((PAD + 34, ly - 2), link, font=fl, fill=WHITE)

    out = BytesIO()
    img.save(out, format="PNG")
    out.seek(0)
    return out.getvalue()
