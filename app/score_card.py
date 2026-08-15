"""Dynamic game score share cards (1200x630 social og:image).

Renders the approved AdvantageLife split-card design per (game, username, score):
- Left 660px navy panel: brand, "@name threw down", big gold score, unit,
  taunt, then a prize pill + red CTA pill.
- Right 540px panel: a flat-vector game scene (Flight / Run / Beach).

Pure Pillow, no headless browser. Text auto-fits so no name/score overflows.
"""
import os
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

_FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")

W, H = 1200, 630
LEFT_W = 660
PAD = 56

NAVY = (10, 31, 82)        # #0a1f52
RED = (200, 16, 46)        # #c8102e
GOLD = (240, 165, 42)      # #f0a52a
GREEN = (34, 194, 107)     # #22c26b
WHITE = (255, 255, 255)

GAMES = {
    "flight": {"label": "Freedom Flight", "unit": "gaps cleared", "taunt": "Beat it if you can."},
    "run":    {"label": "Coast Run",      "unit": "metres",       "taunt": "Go further if you dare."},
    "beach":  {"label": "Beach Bounce",   "unit": "metres up",    "taunt": "Climb higher if you can."},
}


def _font(weight, size):
    path = os.path.join(_FONT_DIR, "Inter-%s.ttf" % weight)
    if not os.path.exists(path):
        return ImageFont.load_default()
    return ImageFont.truetype(path, size)


def _tw(draw, text, font):
    b = draw.textbbox((0, 0), text, font=font)
    return b[2] - b[0]


def _fit_font(draw, text, weight, start, min_size, max_w):
    """Largest size (<= start) whose text width fits max_w."""
    size = start
    while size > min_size:
        f = _font(weight, size)
        if _tw(draw, text, f) <= max_w:
            return f
        size -= 4
    return _font(weight, min_size)


def _ellipsize(draw, text, font, max_w):
    if _tw(draw, text, font) <= max_w:
        return text
    while text and _tw(draw, text + "\u2026", font) > max_w:
        text = text[:-1]
    return text + "\u2026"


def _rounded_pill(draw, xy, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def _fmt_score(game, score):
    try:
        return "{:,}".format(int(score))
    except (TypeError, ValueError):
        return "0"


# ─────────────────────────── game scenes ───────────────────────────
def _scene(game):
    """Draw the right-panel game scene onto a 540x630 image."""
    p = Image.new("RGB", (W - LEFT_W, H), (124, 201, 242))  # sky #7cc9f2
    d = ImageDraw.Draw(p, "RGBA")
    w = W - LEFT_W

    def sun(cx, cy, r):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 130))

    if game == "flight":
        sun(410, 130, 62)
        d.rectangle([0, 430, w, H], fill=(23, 169, 162))       # sea #17a9a2
        d.rectangle([0, 430, w, 456], fill=(15, 143, 140))     # sea top edge
        # rock sea-stacks (tan columns, rounded tops), leaving a centre gap
        for x, top in ((60, 300), (396, 232)):
            d.rounded_rectangle([x, top, x + 72, 430], radius=36, fill=(216, 177, 131))
            d.rectangle([x, top + 36, x + 72, 430], fill=(216, 177, 131))
            d.rectangle([x + 36, top + 40, x + 72, 430], fill=(191, 148, 100))
        # foam dashes
        for fx, fy in ((230, 472), (150, 524), (330, 560)):
            d.rounded_rectangle([fx, fy, fx + 100, fy + 9], radius=4, fill=(255, 255, 255, 150))
        # gull
        gx, gy = 250, 250
        d.ellipse([gx, gy, gx + 76, gy + 48], fill=WHITE, outline=NAVY, width=5)
        d.polygon([(gx + 70, gy + 18), (gx + 96, gy + 24), (gx + 70, gy + 30)], fill=GOLD)
        d.ellipse([gx + 48, gy + 12, gx + 60, gy + 24], fill=NAVY)

    elif game == "run":
        sun(430, 120, 54)
        d.rectangle([0, 470, w, 528], fill=(244, 226, 184))    # sandy verge
        d.rectangle([0, 528, w, H], fill=(64, 73, 94))         # road
        for dx in range(30, w, 130):
            d.rounded_rectangle([dx, 588, dx + 46, 597], radius=4, fill=(255, 255, 255, 190))
        # vespa
        vx, vy = 150, 470
        d.ellipse([vx + 24, vy + 24, vx + 74, vy + 74], fill=(42, 51, 80))
        d.ellipse([vx + 38, vy + 38, vx + 60, vy + 60], fill=(201, 211, 234))
        d.ellipse([vx + 98, vy + 24, vx + 148, vy + 74], fill=(42, 51, 80))
        d.ellipse([vx + 112, vy + 38, vx + 134, vy + 60], fill=(201, 211, 234))
        d.rounded_rectangle([vx + 26, vy, vx + 138, vy + 40], radius=18, fill=RED)
        d.polygon([(vx + 118, vy + 4), (vx + 150, vy + 2), (vx + 138, vy + 40)], fill=RED)
        d.ellipse([vx + 64, vy - 30, vx + 94, vy], fill=(240, 201, 160))  # rider head
        d.pieslice([vx + 62, vy - 34, vx + 96, vy], 180, 360, fill=NAVY)  # helmet

    else:  # beach
        sun(430, 120, 54)
        d.rectangle([0, 470, w, 526], fill=(43, 182, 201))     # sea band
        d.rectangle([0, 526, w, H], fill=(244, 226, 184))      # sand
        # palm
        d.rectangle([w - 130, 300, w - 115, 526], fill=(176, 125, 70))
        for ang in (0, 62, -62):
            import math
            ax, ay = w - 122, 300
            rad = math.radians(ang)
            ex = ax + int(104 * math.sin(rad)) if ang else ax + 104
            d.polygon([(ax, ay), (ax + 104, ay - 20 if not ang else ay + int(-34 * math.cos(rad))),
                       (ax + 20, ay + 28)], fill=(47, 163, 106))
        # simpler fronds: three green blobs
        d.ellipse([w - 150, 250, w - 40, 300], fill=(47, 163, 106))
        d.ellipse([w - 210, 268, w - 110, 312], fill=(47, 163, 106))
        d.ellipse([w - 90, 268, w + 10, 312], fill=(47, 163, 106))
        # platforms
        for px, py, raft in ((60, 250, False), (250, 360, True), (120, 460, False)):
            col = (55, 183, 214) if raft else (200, 155, 94)
            d.rounded_rectangle([px, py, px + 110, py + 20], radius=7, fill=col)
        # beach ball
        bx, by, r = 110, 288, 26
        import math
        cols = [(255, 90, 95), (255, 210, 63), (31, 182, 201), (255, 255, 255), (255, 138, 61), (91, 141, 239)]
        for i, c in enumerate(cols):
            d.pieslice([bx - r, by - r, bx + r, by + r], i * 60, (i + 1) * 60, fill=c)
        d.ellipse([bx - r, by - r, bx + r, by + r], outline=NAVY, width=2)

    return p


# ─────────────────────────── card render ───────────────────────────
def render(game, username, score):
    game = (game or "flight").lower()
    if game not in GAMES:
        game = "flight"
    meta = GAMES[game]
    disp_score = _fmt_score(game, score)
    uname = (username or "member").lstrip("@")[:32]

    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)

    # right scene
    img.paste(_scene(game), (LEFT_W, 0))

    # left panel is already navy (base fill)
    inner_w = LEFT_W - PAD * 2  # ~548

    # --- brand row (top) ---
    bx, by = PAD, PAD
    d.rounded_rectangle([bx, by, bx + 44, by + 44], radius=13, fill=WHITE)
    # red trend arrow inside the white square
    d.line([(bx + 10, by + 34), (bx + 19, by + 23), (bx + 25, by + 29), (bx + 36, by + 15)],
           fill=RED, width=4, joint="curve")
    d.line([(bx + 30, by + 15), (bx + 36, by + 15), (bx + 36, by + 21)], fill=RED, width=4, joint="curve")
    f_brand = _font("Black", 30)
    tx = bx + 44 + 14
    ty = by + (44 - 30) // 2 - 2
    d.text((tx, ty), "Advantage", font=f_brand, fill=WHITE)
    aw = _tw(d, "Advantage", f_brand)
    d.text((tx + aw, ty), "Life", font=f_brand, fill=RED)

    # --- footer (bottom): prize pill + CTA pill ---
    foot_y = H - PAD - 54
    cta_label = "Play free \u2192"
    f_cta = _font("Black", 18)
    cta_w = _tw(d, cta_label, f_cta) + 56
    cta_x = LEFT_W - PAD - cta_w
    _rounded_pill(d, [cta_x, foot_y, cta_x + cta_w, foot_y + 54], 27, fill=RED)
    d.text((cta_x + 28, foot_y + 27), cta_label, font=f_cta, fill=WHITE, anchor="lm")
    # prize pill (left of CTA)
    prize_label = "$400 to this month's top score"
    f_prize = _font("Bold", 16)
    pr_w = _tw(d, prize_label, f_prize) + 44
    if PAD + pr_w > cta_x - 16:  # shorten if it would collide
        prize_label = "$400 top score"
        pr_w = _tw(d, prize_label, f_prize) + 44
    _rounded_pill(d, [PAD, foot_y, PAD + pr_w, foot_y + 54], 27, outline=GOLD, width=2)
    d.text((PAD + 22, foot_y + 27), prize_label, font=f_prize, fill=GOLD, anchor="lm")

    # --- hero block (vertically centred between brand and footer) ---
    who = "@%s threw down" % uname
    f_who = _font("Bold", 19)
    who = _ellipsize(d, who, f_who, inner_w)
    f_score = _fit_font(d, disp_score, "Black", 118, 64, inner_w)
    f_unit = _font("Bold", 15)
    unit = meta["unit"].upper()
    f_taunt = _fit_font(d, meta["taunt"], "Black", 44, 30, inner_w)

    # measure block height for vertical centring
    who_h = 24
    score_h = f_score.size
    unit_h = 20
    taunt_h = f_taunt.size + 6
    gap1, gap2, gap3 = 22, 12, 38
    block_h = who_h + gap1 + score_h + gap2 + unit_h + gap3 + taunt_h
    top = by + 44  # below brand
    bottom = foot_y
    y = top + max(0, (bottom - top - block_h) // 2)

    d.text((PAD, y), who, font=f_who, fill=GREEN)
    y += who_h + gap1
    d.text((PAD, y), disp_score, font=f_score, fill=GOLD)
    y += score_h + gap2
    # spaced uppercase unit (letter-spacing ~0.2em faux via char spacing)
    ux = PAD
    for ch in unit:
        d.text((ux, y), ch, font=f_unit, fill=(255, 255, 255))
        ux += _tw(d, ch, f_unit) + 3
    # dim the unit by drawing a translucent navy over? simpler: draw at reduced brightness
    y += unit_h + gap3
    d.text((PAD, y), meta["taunt"], font=f_taunt, fill=WHITE)

    out = BytesIO()
    img.save(out, format="PNG")
    out.seek(0)
    return out.getvalue()
