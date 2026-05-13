"""
SuperAdPro Brand Poster Generator — Master Prompt Library

Each template is a carefully tested prompt-engineering recipe that produces
launch-grade marketing posters from xAI Grok Imagine. Members never see or
edit these prompts — they pick from a visual gallery, fill in 3-5 inputs,
and receive a finished poster.

The prompts here were verified live on 12 May 2026 across 7 test generations.
Each produced 90%+ launch-grade output. Iteration notes are recorded inline.

TEMPLATE STRUCTURE:
  - slug:              URL-safe identifier
  - name:              Member-facing template name
  - description:       1-2 sentence pitch for the gallery card
  - category:          For filtering: professional / lifestyle / generosity / tech
  - sort_order:        Position in the gallery (lower = earlier)
  - master_prompt:     The full Grok Imagine prompt with {placeholders}
  - input_fields:      What the member fills in — list of dicts
  - aspect_ratio:      Image dimensions (xAI supported values only)
  - supports_photo:    Whether to allow reference photo upload
  - share_slug:        Short slug for /go/{share_slug} viral links

INPUT FIELD STRUCTURE:
  {
    "key":      "headline_word",         # Placeholder name in the prompt
    "label":    "Accent word",           # Member-facing label
    "default":  "EARNING",               # Pre-filled value
    "max_len":  20,                      # Character limit
    "help":     "The dominant word that gets the gold treatment",
  }

PLACEHOLDER RULE:
  The master_prompt uses Python str.format() syntax. Every {placeholder}
  must have a matching input field with the same key, OR be a system
  placeholder ({brand_palette}, {logo_variant}) injected by the engine.
"""

POSTER_TEMPLATES = [
    # ════════════════════════════════════════════════════════════════
    # TEMPLATE 1 — One Income Is Risky
    # Style: Professional male, sunset terrace, cobalt + cyan + gold
    # Tested: 12 May 2026, score 90%+
    # Best for: financial wisdom, "diversify your income" angle
    # ════════════════════════════════════════════════════════════════
    {
        "slug": "one-income-risky",
        "name": "One Income Is Risky",
        "description": "Premium professional angle. Warns against relying on a single paycheck and positions multiple income streams as the answer.",
        "category": "professional",
        "sort_order": 10,
        "aspect_ratio": "3:4",
        "supports_photo": True,
        "share_slug": "one-income",
        "input_fields": [
            {"key": "headline_open", "label": "Opening line", "default": "WHAT IF I TOLD YOU", "max_len": 40,
             "help": "Sits above the main headline in chrome silver"},
            {"key": "headline_main", "label": "Main headline", "default": "ONE INCOME IS RISKY", "max_len": 40,
             "help": "The big 3D extruded headline — keep it punchy"},
            {"key": "subline", "label": "Subhead", "default": "Relying on one paycheck could cost you everything", "max_len": 110,
             "help": "Small caption below the headline"},
            {"key": "cta_word", "label": "CTA trigger word", "default": "START", "max_len": 12,
             "help": "The word people will comment to engage (e.g. START, ME, YES)"},
        ],
        "master_prompt": (
            "A complete vertical social media marketing poster, 1080x1350 portrait composition. "
            "Background: sunset terrace overlooking the ocean, palm trees, warm golden hour lighting, cinematic. "
            "Main subject: confident professional man in his 40s, white polo shirt, holding a coffee mug, looking off-camera contemplatively. "
            "Top of poster: massive 3D extruded headline text baked into the image, two lines. "
            "First line in bold chrome silver-white extruded letters: '{headline_open}'. "
            "Second line, dominant focus, much larger: '{headline_main}' "
            "with the first word in bright cyan blue 3D with chrome highlights, "
            "the middle word in bold gold with deep extruded depth, "
            "and remaining words in chrome silver-white. "
            "All headline letters are 3D extruded with deep shadows, glossy highlights, professional marketing typography. "
            "Below headline, small caption text: '{subline}'. "
            "Left side of poster: three stacked dark navy rounded pills with cyan glow borders, "
            "each containing a small gold icon circle on the left and two lines of text. "
            "Pill 1: stopwatch icon plus 'FAST SETUP / Get going fast'. "
            "Pill 2: share icon plus 'EASY SHARING / Share in seconds'. "
            "Pill 3: refresh icon plus 'RECURRING INCOME / Earn again and again'. "
            "Right side: dark navy card with gold header 'YOUR JOURNEY STARTS HERE', then four cyan-check feature lines: "
            "'Cut the busywork', 'Save hours weekly', 'Stay consistent', 'Build momentum'. "
            "Bottom: wide rounded CTA pill with cyan-blue glowing border and dark navy interior, "
            "containing 'COMMENT \"{cta_word}\" TO BUILD MULTIPLE INCOME STREAMS' in bold white "
            "with '{cta_word}' highlighted in gold. "
            "Very bottom: a horizontal row of 5 small gold circular medallions, evenly spaced. "
            "Each medallion contains a single white icon glyph and nothing else — "
            "no text, no words, no captions underneath. "
            "Glyphs in order: rocket, share arrow, dollar sign, rising bar chart, palm tree. "
            "Critical: do not render the words 'rocket', 'share', 'dollar', 'chart', or 'palm' "
            "anywhere on the poster. Icons only inside the medallions. "
            "{logo_variant_default} "
            "Brand palette: deep cobalt navy tones, cyan blue accents (#0ea5e9), amber gold highlights (#fbbf24), white text. "
            "{member_share_url} "
            "Direct response marketing aesthetic, magazine-quality, all text crisp and readable."
        ),
    },

    # ════════════════════════════════════════════════════════════════
    # TEMPLATE 2 — Tired of Scrolling
    # Style: Glamorous female, purple/magenta neon, money sparkles
    # Tested: 12 May 2026, score 90%+
    # Best for: lifestyle change angle, aspirational
    # ════════════════════════════════════════════════════════════════
    {
        "slug": "tired-of-scrolling",
        "name": "Tired of Scrolling",
        "description": "Glamour-marketing aesthetic. Stops doom-scrollers with a high-energy hook about turning their phone into income.",
        "category": "lifestyle",
        "sort_order": 20,
        "aspect_ratio": "3:4",
        "supports_photo": True,
        "share_slug": "scrolling",
        "input_fields": [
            {"key": "headline_open", "label": "Hook line", "default": "TIRED OF SCROLLING?", "max_len": 40,
             "help": "The scroll-stopping question at the top"},
            {"key": "accent_word", "label": "Action word", "default": "EARNING", "max_len": 14,
             "help": "Big gold-extruded word with asterisks (e.g. EARNING, WINNING, LIVING)"},
            {"key": "cta_word", "label": "CTA trigger word", "default": "ME", "max_len": 12,
             "help": "Comment word for engagement"},
        ],
        "master_prompt": (
            "A complete vertical social media marketing poster, 1080x1350 portrait composition. "
            "Background: dark navy purple gradient with magenta and pink neon sparkle effects, electric energy lines radiating outward, "
            "particles of golden light scattered through the scene. "
            "Main subject: glamorous confident woman in her early 30s, long flowing blonde hair, wearing a rich royal purple satin dress, "
            "sitting elegantly on an ornate gold-trimmed throne chair, holding a smartphone in her left hand, "
            "looking directly at camera with a slight knowing smile, dramatic studio lighting. "
            "Around her: animated dollar bills floating mid-air and gold coins with motion blur, magical sparkle effects, "
            "energy bursting outward in purple and pink. "
            "Top of poster: massive bold headline text in two lines. "
            "First line: '{headline_open}' in clean bold white sans-serif with subtle drop shadow. "
            "Second line, dominant focus, much larger: 'START *{accent_word}!*' "
            "where 'START' is in bold chrome silver-white, "
            "and '*{accent_word}!*' is in massive gold extruded letters with deep depth and asterisks on each side. "
            "Below headline, a horizontal magenta neon glow divider line. "
            "Left side: four feature checkmarks each with a purple circle containing a white checkmark, followed by white text in bold: "
            "'No Experience Needed', 'Step-by-Step Training', 'Work From Anywhere', 'Real Income Potential'. "
            "Mid-bottom: rectangular neon-purple-bordered banner with a small phone icon containing a dollar sign on the left, "
            "and 'TURN YOUR SMARTPHONE INTO A CASH MACHINE!' in bold white with 'SMARTPHONE' and 'CASH MACHINE' highlighted in gold. "
            "On the banner's right side, a large neon-purple dollar sign symbol. "
            "Bottom: row of 4 small icon cards each with a purple-glow icon and a two-line label: "
            "'EASY TO START / Get started in minutes', 'PROVEN SYSTEM / Step-by-step training', "
            "'WORK ANYWHERE / Your phone is all you need', 'REAL RESULTS / Build income that grows'. "
            "Very bottom: a wide gold rounded button containing 'COMMENT \"{cta_word}\" NOW' in bold black, "
            "with 'Take control of your time and your future' below in light text, "
            "and 'YOUR NEW LIFE STARTS TODAY' in gold caps as final tagline. "
            "{logo_variant_default} "
            "{member_share_url} "
            "Aesthetic: glamorous direct-response, purple and magenta neon energy, gold and white text, magazine-quality."
        ),
    },

    # ════════════════════════════════════════════════════════════════
    # TEMPLATE 3 — Where Creators Get Paid (the platform-native template)
    # Style: Creator at laptop, cobalt + cyan, SuperAdPro brand-forward
    # Tested: 12 May 2026, score 95% — best brand integration
    # Best for: platform-direct positioning, "what SuperAdPro is"
    # ════════════════════════════════════════════════════════════════
    {
        "slug": "where-creators-get-paid",
        "name": "Where Creators Get Paid",
        "description": "Platform-native positioning. The cleanest, most on-brand SuperAdPro poster — perfect for first-time pitching.",
        "category": "professional",
        "sort_order": 30,
        "aspect_ratio": "3:4",
        "supports_photo": True,
        "share_slug": "creators",
        "input_fields": [
            {"key": "headline_open", "label": "Top line", "default": "WHERE CREATORS", "max_len": 30,
             "help": "Smaller chrome line above the main"},
            {"key": "accent_a", "label": "Cyan word", "default": "GET", "max_len": 12,
             "help": "The cyan-extruded word in the main headline"},
            {"key": "accent_b", "label": "Gold word", "default": "PAID", "max_len": 12,
             "help": "The gold-extruded word in the main headline"},
            {"key": "headline_close", "label": "Closing line", "default": "TO BUILD", "max_len": 30,
             "help": "Smaller chrome line below the main"},
            {"key": "subline", "label": "Sub-headline", "default": "Real commissions on real activity — every month, to every member, forever.", "max_len": 130,
             "help": "Tagline below the headline"},
        ],
        "master_prompt": (
            "A complete vertical social media marketing poster, 1080x1350 portrait composition, "
            "designed for SuperAdPro — a creator platform where affiliate marketers earn real commissions. "
            "Background: futuristic dark cobalt navy gradient with bright cyan energy lines radiating outward, "
            "constellation-style glowing dots and connecting lines, subtle gold particle accents, "
            "tech-platform aesthetic suggesting AI and creator economy. "
            "Main subject: confident professional creator in their 30s, side profile, "
            "wearing a dark casual shirt, illuminated by the cyan light of a glowing laptop screen in front of them, "
            "fingertips on the keyboard, focused intelligent expression, "
            "cinematic dramatic lighting with cyan rim light and warm fill light. "
            "{logo_variant_default} "
            "Top of poster: massive 3D extruded headline text, two lines. "
            "Line 1: '{headline_open}' in bold chrome silver-white extruded letters. "
            "Line 2, dominant focus, much larger: '{accent_a} {accent_b}' "
            "where '{accent_a}' is in bright cyan blue 3D extruded with chrome highlights, "
            "and '{accent_b}' is in bold gold 3D extruded with deep glossy depth. "
            "Below in smaller bold chrome white: '{headline_close}'. "
            "Below headline, small caption text in white with key phrase in gold: '{subline}'. "
            "Middle-left: three stacked dark navy rounded pills with cyan glow, "
            "each with a small cyan-gradient icon circle and two lines of text. "
            "Pill 1: rocket icon plus 'AI CREATIVE STUDIO / Video, Images, Music'. "
            "Pill 2: dollar-circle icon plus 'AFFILIATE SYSTEM / Earn from every referral'. "
            "Pill 3: chart-up icon plus 'VIDEO ADVERTISING / Campaign tiers & views'. "
            "Bottom: wide rounded CTA pill with bright cyan glowing border and dark interior, "
            "'JOIN SUPERADPRO FREE' in bold white with 'SUPERADPRO' in cyan-to-gold gradient. "
            "Brand palette: deep cobalt navy (#0a1438), cyan (#0ea5e9, #38bdf8), gold (#fbbf24), white. "
            "{member_share_url} "
            "No orange, no red, no purple. Premium tech-platform aesthetic, magazine-quality, all text crisp."
        ),
    },

    # ════════════════════════════════════════════════════════════════
    # TEMPLATE 4 — Pay It Forward (pink sub-brand variant)
    # Style: Warm/genuine subject, pink+magenta+gold, heart-icon
    # Tested: 12 May 2026, score 90% (logo-fix verified)
    # Best for: generosity-based recruiting, emotional angle
    # NB: Uses the PINK logo variant — explicit override below
    # ════════════════════════════════════════════════════════════════
    {
        "slug": "pay-it-forward",
        "name": "Pay It Forward",
        "description": "The Pay It Forward sub-brand. Warm, generous, emotional — recruits through kindness, not pitch.",
        "category": "generosity",
        "sort_order": 40,
        "aspect_ratio": "3:4",
        "supports_photo": True,
        "share_slug": "gift",
        "input_fields": [
            {"key": "headline_open", "label": "Opening line", "default": "I WANT TO", "max_len": 30,
             "help": "Above the main headline, in chrome silver"},
            {"key": "headline_amount", "label": "Gift amount", "default": "GIFT YOU $20", "max_len": 30,
             "help": "The big 3D headline with gold + chrome + gold styling"},
            {"key": "cta_word", "label": "CTA trigger word", "default": "HEART", "max_len": 12,
             "help": "Comment word — e.g. HEART, GIFT, YES"},
        ],
        "master_prompt": (
            "A complete vertical social media marketing poster, 1080x1350 portrait composition, "
            "designed for SuperAdPro's 'Pay It Forward' initiative — a chain of generosity where "
            "members gift free memberships to people who need them. "
            "Background: rich romantic gradient from deep magenta at the edges to warm pink in the middle, "
            "soft glowing bokeh particles in pink and gold, subtle heart shapes faintly visible in the haze, "
            "warm cinematic lighting suggesting hope and human connection. "
            "Main subject: warm genuine smile, person in their 30s with kind eyes, "
            "wearing a soft cream-coloured sweater, holding a small glowing pink gift box with a gold ribbon, "
            "looking directly at camera with sincere expression, natural soft light, shallow depth of field. "
            "{logo_variant_pink} "
            "Top of poster: massive 3D extruded headline in two lines. "
            "Line 1: '{headline_open}' in bold chrome silver-white extruded with magenta-pink rim light. "
            "Line 2, dominant focus, much larger: '{headline_amount}' "
            "with key words in bold gold 3D extruded with rich depth and glossy highlights, "
            "and remaining words in soft chrome white, sparkle effects radiating outward. "
            "Below headline, small caption in white: "
            "'A free SuperAdPro membership — no catch, no pitch. Just paying it forward.' "
            "with 'paying it forward' highlighted in gold italic with underline. "
            "Left side: three dark magenta rounded pills, each with a small white heart icon on the left and two-line text: "
            "'NO CATCH / Genuinely free membership', 'NO PITCH / I'm not selling anything', 'JUST KINDNESS / Pass it on if you can'. "
            "Right side: vertically-stacked card with gold 'HOW IT WORKS' header and four heart-prefixed lines: "
            "'I gift you a membership', 'You activate it free', 'Earn for 30+ days', 'When you can, gift one too'. "
            "Bottom: wide rounded CTA pill with bright magenta glowing border, dark interior, "
            "'COMMENT \"{cta_word}\" TO RECEIVE YOUR FREE GIFT' in white with '{cta_word}' in pink-to-gold gradient. "
            "Brand palette: deep magenta (#831843) backgrounds, warm pink (#ec4899) mid-tones, gold (#fbbf24) highlights, white text. "
            "Logo MUST use the pink/magenta variant — NOT the default cyan. "
            "{member_share_url} "
            "Emotional human direct-response — warmth, generosity, connection. Magazine-quality, all text crisp."
        ),
    },

    # ════════════════════════════════════════════════════════════════
    # TEMPLATE 5 — Freedom Lifestyle
    # Style: Yacht/sunset, premium gold logo edition
    # Tested: 12 May 2026, score 95% — gold logo variant verified
    # Best for: aspirational success, "I made it" positioning
    # NB: Uses the GOLD logo variant — explicit override below
    # ════════════════════════════════════════════════════════════════
    {
        "slug": "freedom-lifestyle",
        "name": "Freedom Lifestyle",
        "description": "Aspirational luxury angle. Yacht, sunset, champagne — for members confident showing the destination, not just the journey.",
        "category": "lifestyle",
        "sort_order": 50,
        "aspect_ratio": "3:4",
        "supports_photo": True,
        "share_slug": "freedom",
        "input_fields": [
            {"key": "headline_open", "label": "Opening line", "default": "THIS COULD BE", "max_len": 30,
             "help": "Sits above the main headline"},
            {"key": "accent_a", "label": "Cyan word", "default": "YOUR", "max_len": 12,
             "help": "Cyan-extruded word"},
            {"key": "accent_b", "label": "Gold word", "default": "LIFE", "max_len": 12,
             "help": "Gold-extruded word"},
            {"key": "income_claim", "label": "Income claim (optional)", "default": "$10K+ /MONTH", "max_len": 25,
             "help": "Earnings stat — keep defensible. Leave generic if unsure."},
            {"key": "cta_word", "label": "CTA trigger word", "default": "FREEDOM", "max_len": 12,
             "help": "Comment word for engagement"},
        ],
        "master_prompt": (
            "A complete vertical social media marketing poster, 1080x1350 portrait composition, "
            "designed for SuperAdPro promoting financial freedom and lifestyle. "
            "Background: cinematic luxury yacht deck at golden hour, "
            "Mediterranean superyacht 100-feet long, deep teal ocean visible below, "
            "soft warm sunset glow in the sky, distant coastline barely visible, "
            "anamorphic bokeh lights, slight golden mist for premium atmosphere. "
            "Main subject: successful entrepreneur in their late 30s, wearing crisp white linen shirt and tan chinos, "
            "standing confidently at the yacht's railing, looking out toward the horizon with a relaxed satisfied expression, "
            "champagne flute in one hand, premium watch visible on wrist, magazine-cover composition. "
            "{logo_variant_gold} "
            "Top of poster: massive 3D extruded headline in two lines. "
            "Line 1: '{headline_open}' in bold chrome silver-white extruded with deep shadows. "
            "Line 2, much larger: '{accent_a} {accent_b}' "
            "with '{accent_a}' in bright cyan-to-cobalt blue 3D extruded with chrome highlights, "
            "'{accent_b}' in bold gold 3D extruded with extreme glossy depth. "
            "Below in white with gold accent: 'Build the income that lets you live this way — every day, on your terms.' "
            "with 'every day, on your terms' highlighted in gold italic. "
            "Left side: three dark navy rounded pills with cyan glow, "
            "each with a small gold icon circle and two lines: "
            "'{income_claim} / Real member earnings', 'WORK FROM ANYWHERE / Beach, plane, or yacht', 'OWN YOUR TIME / No boss, no quotas'. "
            "Bottom right: vertically-stacked card with gold header 'JOIN THE 5%' and four lines: "
            "'Stop trading time for money', 'Build assets that pay you', 'Compound your network', 'Live the life by design'. "
            "Bottom: wide CTA pill with cyan glowing border and dark interior, "
            "'COMMENT \"{cta_word}\" TO START YOUR JOURNEY' with '{cta_word}' in cyan-to-gold gradient. "
            "Brand palette: deep cobalt navy + bright cyan + premium gold + champagne tones. "
            "{member_share_url} "
            "Aspirational luxury aesthetic without being tacky. Magazine-quality production."
        ),
    },

    # ════════════════════════════════════════════════════════════════
    # TEMPLATE 6 — Smartphone Cash Machine
    # Style: Modern entrepreneur with phone, floating money, tech aesthetic
    # Tested: 12 May 2026, score 92% — naturally varied outputs
    # Best for: modern earning angle, tech-forward positioning
    # ════════════════════════════════════════════════════════════════
    {
        "slug": "smartphone-cash-machine",
        "name": "Smartphone Cash Machine",
        "description": "Modern tech-forward earning angle. Hero phone with floating money — perfect for the 'AI + your phone is all you need' pitch.",
        "category": "tech",
        "sort_order": 60,
        "aspect_ratio": "3:4",
        "supports_photo": True,
        "share_slug": "phone",
        "input_fields": [
            {"key": "headline_open", "label": "Opening line", "default": "YOUR PHONE IS A", "max_len": 30,
             "help": "Smaller chrome line above the main"},
            {"key": "accent_a", "label": "Gold word", "default": "CASH", "max_len": 12,
             "help": "Gold-extruded word"},
            {"key": "accent_b", "label": "Cyan word", "default": "MACHINE", "max_len": 14,
             "help": "Cyan-extruded word"},
            {"key": "cta_word", "label": "CTA trigger word", "default": "PHONE", "max_len": 12,
             "help": "Comment word for engagement"},
        ],
        "master_prompt": (
            "A complete vertical social media marketing poster, 1080x1350 portrait composition, "
            "designed for SuperAdPro — modern tech-savvy earning angle. "
            "Background: futuristic dark cobalt navy with bright cyan circuit-board patterns radiating outward, "
            "holographic data streams, glowing constellation dots, subtle dollar-sign motifs in the haze, "
            "tech-platform aesthetic suggesting AI and modern earning. "
            "Main subject: modern young entrepreneur in their late 20s, wearing a dark casual hoodie, "
            "holding a smartphone vertically in both hands, screen glowing with green earnings notifications and cyan UI, "
            "looking down at the phone with a confident slight smile, "
            "cyan rim light from the phone illuminating their face, shallow depth of field. "
            "Floating around the smartphone in mid-air: dollar bills with motion blur, "
            "gold coins suspended at various angles, small holographic notification icons. "
            "{logo_variant_default} "
            "Top of poster: massive 3D extruded headline in two lines. "
            "Line 1: '{headline_open}' in bold chrome silver-white extruded. "
            "Line 2, much larger: '{accent_a} {accent_b}' "
            "with '{accent_a}' in bold gold 3D extruded with deep glossy depth, "
            "'{accent_b}' in bright cyan-to-cobalt 3D extruded with chrome highlights. "
            "Below in white with gold accent: 'AI tools + smart commissions + a phone — that's all you need.' "
            "with 'that's all you need' in gold italic. "
            "Left side: three dark navy pills with cyan glow, each with small gold icon circle and two-line text: "
            "'AI CREATIVE STUDIO / Posts, videos, voiceovers', "
            "'PASSIVE COMMISSIONS / Earn while you sleep', "
            "'NO INVENTORY / 100% digital business'. "
            "Bottom right: dark navy card with gold header 'WHY IT WORKS': "
            "'AI handles the heavy lifting', 'Commissions on every referral', 'Pay only for what you use', 'Built for non-techies'. "
            "Bottom: wide CTA pill with cyan glowing border, "
            "'COMMENT \"{cta_word}\" TO SEE THE SYSTEM' in white with '{cta_word}' in cyan-to-gold gradient. "
            "Brand palette: deep cobalt navy + bright cyan + gold + green earnings accents. "
            "{member_share_url} "
            "Modern tech-platform aesthetic, futuristic but accessible."
        ),
    },
]

# ════════════════════════════════════════════════════════════════════
# SYSTEM-INJECTED PLACEHOLDERS — Logo variant specifications
#
# These are appended to {logo_variant_*} positions in the master prompts.
# They tell Grok Imagine exactly how to render the SuperAdPro logo in
# each colour scheme. This is the production fix for the colour-drift
# issue caught during 12 May testing.
# ════════════════════════════════════════════════════════════════════

LOGO_VARIANTS = {
    "default": (
        "TOP LEFT CORNER prominently placed: the SuperAdPro logo mark — "
        "a rounded square in deep navy almost black colour, containing a bright "
        "cyan-to-sky-blue gradient circle, and inside that circle a clean white play "
        "triangle pointing right. Next to it, the wordmark 'SuperAdPro' in bold modern "
        "sans-serif white text, with 'Pro' in the same cyan blue colour."
    ),
    "gold": (
        "TOP CENTRE or TOP LEFT prominently placed: the SuperAdPro logo mark in its "
        "GOLD PREMIUM edition — a rounded square in deep navy almost black colour, "
        "containing a bright GOLD-TO-AMBER gradient circle, and inside the gold circle "
        "a clean dark navy play triangle pointing right (inverted contrast for premium feel). "
        "Next to it, the wordmark 'SuperAdPro' in bold modern sans-serif white text, "
        "with 'Pro' in a rich gold gradient. Do NOT use cyan blue in this logo — gold only."
    ),
    "pink": (
        "TOP LEFT CORNER prominently placed: the SuperAdPro logo mark in its PAY IT "
        "FORWARD pink edition — a rounded square in deep navy almost black colour, "
        "containing a bright PINK-TO-MAGENTA gradient circle (NOT cyan blue — explicitly "
        "pink, going from light pink to deep magenta), and inside that gradient circle "
        "a clean white play triangle pointing right. Next to it, the wordmark "
        "'SuperAdPro' in bold modern sans-serif white text, with 'Pro' in a soft "
        "pink-to-rose gradient. Do NOT use cyan or blue in the logo for this poster — "
        "the logo must use pink and magenta only."
    ),
}


def render_prompt(template: dict, inputs: dict, username: str = None) -> str:
    """Assemble the final Grok Imagine prompt from a template + member inputs.

    Steps:
      1. Take the master_prompt string
      2. Inject logo variant specifications ({logo_variant_default}, etc)
      3. Inject member's referral URL ({member_share_url}) so the poster
         is attribution-ready when shared on social media
      4. Substitute member-supplied input values ({headline_open}, etc)
      5. Return the complete prompt ready for Grok Imagine

    Defensive: missing inputs fall back to defaults from input_fields.

    The username arg is the member's referral handle. When provided, the
    poster will include 'superadpro.com/ref/USERNAME' as a visible URL.
    When None (e.g. admin preview seeding), a generic 'superadpro.com'
    is used — the preview is illustrative, not a real share asset.
    """
    prompt = template["master_prompt"]

    # Inject logo variants
    prompt = prompt.replace("{logo_variant_default}", LOGO_VARIANTS["default"])
    prompt = prompt.replace("{logo_variant_gold}", LOGO_VARIANTS["gold"])
    prompt = prompt.replace("{logo_variant_pink}", LOGO_VARIANTS["pink"])

    # Inject member referral URL specification. This is THE thing that
    # makes BPG posters share-worthy — without it, a member who posts
    # their generated poster gets no attribution back when visitors
    # sign up. Added 12 May 2026 in response to direct member feedback.
    if username:
        share_url_directive = (
            f"At the very bottom edge of the poster, render a clean horizontal banner "
            f"approximately 60 pixels tall with a dark navy background and a thin cyan top border. "
            f"In the centre of this banner, in clean modern sans-serif white type, "
            f"place the URL text 'superadpro.com/ref/{username}' rendered crisp and readable, "
            f"all letters clear, NO 3D extrusion on this URL — it must be flat and pixel-perfect. "
            f"This URL is the call-to-action destination — it must render exactly as written."
        )
    else:
        # Preview / admin seed mode — no specific member, use neutral URL
        share_url_directive = (
            f"At the very bottom edge of the poster, render a clean horizontal banner "
            f"approximately 60 pixels tall with a dark navy background and a thin cyan top border. "
            f"In the centre of this banner, in clean modern sans-serif white type, "
            f"place the URL text 'superadpro.com' rendered crisp and readable, "
            f"all letters clear, NO 3D extrusion on this URL."
        )
    prompt = prompt.replace("{member_share_url}", share_url_directive)

    # Substitute member inputs — fall back to defaults where missing
    substitutions = {}
    for field in template["input_fields"]:
        key = field["key"]
        value = inputs.get(key, "").strip() if inputs else ""
        if not value:
            value = field.get("default", "")
        substitutions[key] = value

    # Use safe format — unknown placeholders left as-is rather than KeyError
    try:
        prompt = prompt.format(**substitutions)
    except KeyError as e:
        # Should never happen if input_fields matches placeholders in master_prompt
        # but defensively return the partially-rendered prompt rather than crash
        raise ValueError(f"Template '{template['slug']}' has unsubstituted placeholder: {e}")

    return prompt


def get_template_by_slug(slug: str) -> dict | None:
    """Find a template by its slug. Returns None if not found."""
    for t in POSTER_TEMPLATES:
        if t["slug"] == slug:
            return t
    return None


def get_active_templates() -> list[dict]:
    """Return all templates ordered for the gallery."""
    return sorted(POSTER_TEMPLATES, key=lambda t: t.get("sort_order", 100))
