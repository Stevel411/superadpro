"""
Explainer Video — voice & style catalog.

Single source of truth for the Explainer tool's "Look & sound" options, and
the unified voice list for the whole Creative Studio voiceover surface.

Voices run on edge-tts (free Microsoft Neural TTS) — there is NO per-use API
cost, so offering a large catalog and unlimited audition previews costs the
platform nothing. Every voice id below is a real edge-tts Neural voice, so a
preview request will always succeed.

Styles are prompt presets that shape each scene's *visual_prompt*; they do not
force a model. The video model is selected separately by the quality tier
(standard / premium) at generate time.

This module is intentionally dependency-free so it can be imported anywhere
(endpoints, the pipeline orchestrator, migrations) without import cycles.
"""

# ── Voices ──────────────────────────────────────────────────────────────────
# Curated ~24 across accents and tones. `tone` is a descriptive hint for the
# picker only — it does not change synthesis. All ids verified valid edge-tts.
VOICES = [
    # United States
    {"id": "en-US-GuyNeural",          "name": "Guy",      "gender": "Male",   "accent": "US",         "tone": "Warm"},
    {"id": "en-US-JennyNeural",        "name": "Jenny",    "gender": "Female", "accent": "US",         "tone": "Friendly"},
    {"id": "en-US-AriaNeural",         "name": "Aria",     "gender": "Female", "accent": "US",         "tone": "Calm"},
    {"id": "en-US-DavisNeural",        "name": "Davis",    "gender": "Male",   "accent": "US",         "tone": "Authoritative"},
    {"id": "en-US-JaneNeural",         "name": "Jane",     "gender": "Female", "accent": "US",         "tone": "Energetic"},
    {"id": "en-US-TonyNeural",         "name": "Tony",     "gender": "Male",   "accent": "US",         "tone": "Confident"},
    {"id": "en-US-NancyNeural",        "name": "Nancy",    "gender": "Female", "accent": "US",         "tone": "Warm"},
    {"id": "en-US-AndrewNeural",       "name": "Andrew",   "gender": "Male",   "accent": "US",         "tone": "Natural"},
    {"id": "en-US-EmmaNeural",         "name": "Emma",     "gender": "Female", "accent": "US",         "tone": "Bright"},
    {"id": "en-US-BrianNeural",        "name": "Brian",    "gender": "Male",   "accent": "US",         "tone": "Casual"},
    {"id": "en-US-EricNeural",         "name": "Eric",     "gender": "Male",   "accent": "US",         "tone": "Deep"},
    # United Kingdom
    {"id": "en-GB-RyanNeural",         "name": "Ryan",     "gender": "Male",   "accent": "British",    "tone": "Confident"},
    {"id": "en-GB-SoniaNeural",        "name": "Sonia",    "gender": "Female", "accent": "British",    "tone": "Warm"},
    {"id": "en-GB-ThomasNeural",       "name": "Thomas",   "gender": "Male",   "accent": "British",    "tone": "Calm"},
    {"id": "en-GB-LibbyNeural",        "name": "Libby",    "gender": "Female", "accent": "British",    "tone": "Friendly"},
    {"id": "en-GB-MaisieNeural",       "name": "Maisie",   "gender": "Female", "accent": "British",    "tone": "Youthful"},
    # Australia
    {"id": "en-AU-NatashaNeural",      "name": "Natasha",  "gender": "Female", "accent": "Australian", "tone": "Upbeat"},
    {"id": "en-AU-WilliamNeural",      "name": "William",  "gender": "Male",   "accent": "Australian", "tone": "Relaxed"},
    # India
    {"id": "en-IN-NeerjaNeural",       "name": "Neerja",   "gender": "Female", "accent": "Indian",     "tone": "Warm"},
    {"id": "en-IN-PrabhatNeural",      "name": "Prabhat",  "gender": "Male",   "accent": "Indian",     "tone": "Clear"},
    # Ireland
    {"id": "en-IE-ConnorNeural",       "name": "Connor",   "gender": "Male",   "accent": "Irish",      "tone": "Friendly"},
    {"id": "en-IE-EmilyNeural",        "name": "Emily",    "gender": "Female", "accent": "Irish",      "tone": "Bright"},
    # South Africa
    {"id": "en-ZA-LeahNeural",         "name": "Leah",     "gender": "Female", "accent": "S. African", "tone": "Calm"},
    {"id": "en-ZA-LukeNeural",         "name": "Luke",     "gender": "Male",   "accent": "S. African", "tone": "Confident"},
]

# ── Styles ──────────────────────────────────────────────────────────────────
# `prompt` is woven into each scene's visual prompt at generate time. `thumb`
# is a slug the frontend maps to a preview thumbnail asset (added with the UI).
STYLES = [
    {"key": "cinematic",  "label": "Cinematic",        "desc": "Filmic depth, dramatic lighting, movie-grade mood",
     "prompt": "cinematic film look, dramatic lighting, shallow depth of field, rich color grade", "thumb": "cinematic"},
    {"key": "corporate",  "label": "Clean & corporate", "desc": "Bright, modern, professional and trustworthy",
     "prompt": "clean modern corporate style, bright even lighting, minimal, professional, crisp", "thumb": "corporate"},
    {"key": "bold",       "label": "Bold & punchy",     "desc": "High-contrast, fast, attention-grabbing",
     "prompt": "bold high-contrast look, punchy saturated color, dynamic energetic framing", "thumb": "bold"},
    {"key": "animated3d", "label": "3D animated",       "desc": "Polished 3D-animated, soft and stylized",
     "prompt": "polished 3D animation, soft global illumination, stylized, vibrant", "thumb": "animated3d"},
    {"key": "ugc",        "label": "UGC / handheld",    "desc": "Authentic, phone-shot, social-native feel",
     "prompt": "authentic handheld UGC style, natural light, casual phone-shot realism, candid", "thumb": "ugc"},
    {"key": "whiteboard", "label": "Whiteboard",        "desc": "Simple explainer animation with clean icons",
     "prompt": "clean whiteboard explainer animation, simple line icons, hand-drawn marker style, white background", "thumb": "whiteboard"},
    {"key": "futuristic", "label": "Tech / futuristic", "desc": "Sleek, neon, high-tech and modern",
     "prompt": "sleek futuristic tech aesthetic, neon accents, dark UI, holographic glow, modern", "thumb": "futuristic"},
    {"key": "lifestyle",  "label": "Warm lifestyle",    "desc": "Relatable people, golden-hour warmth",
     "prompt": "warm lifestyle look, golden hour light, relatable real people, soft inviting tones", "thumb": "lifestyle"},
]

# ── Derived lookups & defaults ────────────────────────────────────────────────
VOICE_IDS = frozenset(v["id"] for v in VOICES)
STYLE_KEYS = frozenset(s["key"] for s in STYLES)
_STYLE_PROMPT = {s["key"]: s["prompt"] for s in STYLES}

DEFAULT_VOICE = "en-GB-SoniaNeural"
DEFAULT_STYLE = "cinematic"


def is_valid_voice(voice_id: str) -> bool:
    """True if voice_id is a known, previewable catalog voice."""
    return voice_id in VOICE_IDS


def is_valid_style(style_key: str) -> bool:
    return style_key in STYLE_KEYS


def style_prompt(style_key: str) -> str:
    """Visual-prompt modifier for a style key (falls back to the default)."""
    return _STYLE_PROMPT.get(style_key, _STYLE_PROMPT[DEFAULT_STYLE])
