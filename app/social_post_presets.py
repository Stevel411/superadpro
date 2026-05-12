"""
SuperAdPro — Social Post Studio Vibe Presets
=============================================

12 vibe templates that members pick from to generate marketing-grade
images of themselves. Each preset is a fully-assembled prompt template
plus metadata for the UI (label, description, suggested CTA copy).

Phase 3 ships the first 6 (tonight). Phase 3.5 fills in the remaining
6 with refined prompts.

Architecture: prompt strings are pure data, no logic. UI shows the
preset grid, member picks one, backend retrieves the template by key
and passes it to grok_imagine_service.generate_candidates().

Prompt design principles (from spec):
- Professional photography style
- Cinematic lighting
- Sharp focus, marketing-grade quality
- Negative space for text overlay
- Identifiable but flattering rendering of the subject
"""

PRESETS = {
    # ════════════════════════════════════════════════════════════════
    # Tier 1 — Tonight's launch set (6 presets, fully prompted)
    # ════════════════════════════════════════════════════════════════

    "pro-headshot": {
        "label": "Pro Headshot",
        "description": "Studio-lit professional portrait, polished and authoritative",
        "thumbnail_emoji": "🎯",
        "category": "professional",
        "suggested_aspect": "4:5",
        "prompt": (
            "Professional studio headshot of a successful entrepreneur, "
            "soft key lighting with subtle rim light, neutral charcoal grey backdrop, "
            "subject wearing a sharp dark blazer over a crisp white shirt, "
            "confident relaxed expression with a slight smile, "
            "shot on Phase One IQ4 medium format, 80mm lens, f/2.8, "
            "high-end editorial portrait style, sharp focus on eyes, "
            "shallow depth of field, marketing-grade quality, "
            "magazine-cover composition with negative space at the top for text"
        ),
    },

    "luxury-lifestyle": {
        "label": "Luxury Lifestyle",
        "description": "On a private yacht, sun-drenched and aspirational",
        "thumbnail_emoji": "🛥️",
        "category": "lifestyle",
        "suggested_aspect": "4:5",
        "prompt": (
            "Cinematic luxury lifestyle photo, subject standing on the deck of a "
            "100-foot superyacht at golden hour, Mediterranean sea in soft focus "
            "behind, wearing crisp linen and aviator sunglasses, "
            "warm orange and teal colour grade, "
            "wide aperture lens compression, anamorphic bokeh, "
            "looking off-camera contemplatively, "
            "Travel + Leisure editorial style, "
            "sharp focus on subject with creamy background, "
            "negative space in the upper-left third for headline text"
        ),
    },

    "city-night": {
        "label": "City Night",
        "description": "Neon-lit downtown, after-dark entrepreneur vibe",
        "thumbnail_emoji": "🌃",
        "category": "lifestyle",
        "suggested_aspect": "9:16",
        "prompt": (
            "Subject standing in front of a backdrop of skyscrapers at night, "
            "rain-slicked street reflecting neon signs in magenta and cyan, "
            "wearing a tailored long coat, hands in pockets, looking down the street, "
            "moody cinematic colour palette, deep contrast, "
            "Blade Runner aesthetic, ARRI Alexa look, "
            "shot at 35mm f/1.4, slight motion in background lights, "
            "subject sharp and well-exposed, "
            "negative space on the right for vertical title text"
        ),
    },

    "studio-backdrop": {
        "label": "Studio Backdrop",
        "description": "Bold solid colour, clean and high-impact",
        "thumbnail_emoji": "🎨",
        "category": "professional",
        "suggested_aspect": "1:1",
        "prompt": (
            "Subject against a bold solid colour seamless paper backdrop "
            "in deep navy blue, three-point studio lighting "
            "(key, fill, hair light), wearing a sharp business-casual outfit, "
            "arms relaxed and confident posture, looking directly at camera, "
            "Vogue-style portrait composition, "
            "Hasselblad H6D, 100mm lens, f/4.5, "
            "subject perfectly sharp, evenly lit, "
            "high-end commercial photography quality, "
            "designed for thumbnail use — works at small sizes"
        ),
    },

    "premium-closeup": {
        "label": "Premium Closeup",
        "description": "Tight portrait, dramatic mood lighting",
        "thumbnail_emoji": "🔥",
        "category": "professional",
        "suggested_aspect": "1:1",
        "prompt": (
            "Tight portrait closeup, dramatic Rembrandt lighting with deep shadows "
            "on one side, subject thoughtful and serious, "
            "rich warm tones, gold-amber light glancing across the face, "
            "subtle film grain, Kodak Portra 400 colour science, "
            "shot on Leica M11, 75mm Summilux f/1.4 wide open, "
            "tack-sharp eyes, dreamy bokeh, "
            "moody confident character study, "
            "art-print quality, gallery-grade portraiture, "
            "negative space at left for vertical headline"
        ),
    },

    "authority-speaker": {
        "label": "Authority Speaker",
        "description": "On stage at a packed event, owning the room",
        "thumbnail_emoji": "🎤",
        "category": "professional",
        "suggested_aspect": "16:9",
        "prompt": (
            "Subject mid-speech on a large conference stage, "
            "spotlit from above, packed auditorium of 2000 people slightly out of focus "
            "behind, modern minimalist stage design with backlit panels, "
            "subject in a fitted dark suit, microphone in hand, "
            "captured mid-gesture with confident expression, "
            "TED conference photography style, "
            "Sony A1, 70-200mm at 135mm, f/2.8, ISO 800, "
            "subject sharp, audience and stage softly blurred, "
            "dramatic but flattering lighting, "
            "wide cinematic framing with subject left-of-centre and headline space to the right"
        ),
    },

    # ════════════════════════════════════════════════════════════════
    # Tier 2 — Phase 3.5 / tomorrow (placeholders so the keys exist)
    # ════════════════════════════════════════════════════════════════
    # Filling these in tomorrow when fresh — leaving them out of the
    # API response for now via the AVAILABLE_KEYS list below.

    "supercar": {
        "label": "Supercar",
        "description": "Standing beside a luxury supercar at a private garage",
        "thumbnail_emoji": "🏎️",
        "category": "lifestyle",
        "suggested_aspect": "4:5",
        "prompt": (
            "PLACEHOLDER — to be filled in Phase 3.5. "
            "Subject standing beside a Lamborghini Huracán in matte black, "
            "private garage with concrete floor and ambient warm lighting."
        ),
    },

    "private-jet": {
        "label": "Private Jet",
        "description": "Boarding a private jet, travel-success aesthetic",
        "thumbnail_emoji": "✈️",
        "category": "lifestyle",
        "suggested_aspect": "4:5",
        "prompt": "PLACEHOLDER — Phase 3.5",
    },

    "penthouse-office": {
        "label": "Penthouse Office",
        "description": "Glass-walled office overlooking the city",
        "thumbnail_emoji": "🏙️",
        "category": "professional",
        "suggested_aspect": "16:9",
        "prompt": "PLACEHOLDER — Phase 3.5",
    },

    "gala-event": {
        "label": "Gala Event",
        "description": "Black-tie event, champagne and crystal chandeliers",
        "thumbnail_emoji": "🥂",
        "category": "lifestyle",
        "suggested_aspect": "4:5",
        "prompt": "PLACEHOLDER — Phase 3.5",
    },

    "mountain-summit": {
        "label": "Mountain Summit",
        "description": "Triumphant atop a peak, sunrise behind",
        "thumbnail_emoji": "⛰️",
        "category": "lifestyle",
        "suggested_aspect": "16:9",
        "prompt": "PLACEHOLDER — Phase 3.5",
    },

    "casual-charisma": {
        "label": "Casual Charisma",
        "description": "Outdoor café, golden hour, approachable warmth",
        "thumbnail_emoji": "☕",
        "category": "professional",
        "suggested_aspect": "1:1",
        "prompt": "PLACEHOLDER — Phase 3.5",
    },
}


# Which presets are ready for production use. The other 6 still show in
# the UI's "coming soon" section but can't actually be selected.
AVAILABLE_KEYS = [
    "pro-headshot",
    "luxury-lifestyle",
    "city-night",
    "studio-backdrop",
    "premium-closeup",
    "authority-speaker",
]


def get_preset(preset_key: str) -> dict | None:
    """Return the preset config, or None if not found / not available."""
    if preset_key not in AVAILABLE_KEYS:
        return None
    return PRESETS.get(preset_key)


def list_presets_for_ui() -> list[dict]:
    """Lean list for the UI grid (no full prompts — those stay backend-side
    to protect against members peeking at the prompt engineering).
    """
    out = []
    for key, preset in PRESETS.items():
        out.append({
            "key": key,
            "label": preset["label"],
            "description": preset["description"],
            "thumbnail_emoji": preset["thumbnail_emoji"],
            "category": preset["category"],
            "suggested_aspect": preset["suggested_aspect"],
            "available": key in AVAILABLE_KEYS,
        })
    return out


def assemble_prompt(preset_key: str, custom_addons: str = "") -> str | None:
    """Build the final prompt string to send to Grok Imagine.

    custom_addons is an optional member-supplied free-text addition,
    appended to the preset prompt. We sanitise it lightly (length cap)
    but don't filter content here — that's the Grok safety layer's job.
    """
    preset = get_preset(preset_key)
    if not preset:
        return None
    prompt = preset["prompt"]
    if custom_addons:
        addon = custom_addons.strip()[:500]  # hard cap on member additions
        if addon:
            prompt = f"{prompt}. Additional direction: {addon}"
    return prompt
