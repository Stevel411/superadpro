"""
SuperScene — EvoLink API Integration
AI Video, Image & Music Generation via EvoLink
Base URL: https://api.evolink.ai/v1
Auth: Bearer token (EVOLINK_API_KEY env var)

Smart Routing: Users select quality tiers (Quick/Standard/Premium/Ultra)
and the system auto-selects the best model for the job.

Models integrated: Kling O3, Kling 3.0, Seedance 1.5 Pro, Sora 2 Pro,
VEO 3.1, Hailuo 2.3, WAN 2.6, Grok Imagine, + image & music models.
"""
import os
import logging
import httpx
from typing import Optional, List

logger = logging.getLogger("superadpro.superscene")

EVOLINK_API_KEY = os.getenv("EVOLINK_API_KEY", "")
EVOLINK_BASE_URL = "https://api.evolink.ai/v1"
EVOLINK_FILES_URL = "https://files-api.evolink.ai"

# ═══ VIDEO MODELS ═══════════════════════════════════════════
# model_key → EvoLink model ID

MODEL_MAP = {
    # Kling O3 (next-gen)
    "kling-o3":           "kling-o3-text-to-video",
    # Kling 3.0
    "kling3":             "kling-v3-text-to-video",
    # Seedance 1.5 Pro (supports audio)
    "seedance":           "seedance-1.5-pro",
    # Sora 2 Pro Preview (per-second billing)
    "sora2":              "sora-2-pro-preview",
    # VEO 3.1 Fast (supports 4K + reference)
    "veo31":              "veo-3-1-fast-lite",
    # VEO 3.1 Pro (highest quality, 4K)
    "veo31-pro":          "veo-3.1-generate-preview",
    # Hailuo 2.3 (T2V + I2V)
    "hailuo23":           "MiniMax-Hailuo-2.3",
    # Hailuo 2.3 Fast (I2V only, fastest)
    "hailuo23-fast":      "MiniMax-Hailuo-2.3-Fast",
    # Hailuo 02 (T2V + I2V + FLF)
    "hailuo02":           "MiniMax-Hailuo-02",
    # WAN 2.6 (T2V)
    "wan26":              "wan2.6-text-to-video",
    # Grok Imagine Video
    "grok-video":         "grok-imagine-video",
    # Sora 2 Beta Max (no watermark)
    "sora2-max":          "sora-2-beta-max",
    # Kling Motion Control
    "kling-motion":       "kling-v3-motion-control",
    # Kling O3 Video Edit
    "kling-edit":         "kling-o3-video-edit",
    # VEO 3.1 Extend
    "veo31-extend":       "veo3.1-fast-extend",
}

# I2V model variants (some models use different IDs for image-to-video)
MODEL_MAP_I2V = {
    "kling-o3":           "kling-o3-image-to-video",
    "kling3":             "kling-v3-image-to-video",
    "seedance":           "seedance-1.5-pro",
    "sora2":              "sora-2-pro-preview",
    "veo31":              "veo-3-1-fast-lite",
    "veo31-pro":          "veo-3.1-generate-preview",
    "hailuo23":           "MiniMax-Hailuo-2.3",
    "hailuo23-fast":      "MiniMax-Hailuo-2.3-Fast",
    "hailuo02":           "MiniMax-Hailuo-02",
    "wan26":              "wan2.6-image-to-video",
    "wan26-flash":        "wan-2.6-i2v-flash",
    "grok-video":         "grok-imagine-video",
}

# ═══ SMART ROUTING: Quality Tiers ═══════════════════════════
# Maps tier → best model for text-to-video and image-to-video

TIER_ROUTES_T2V = {
    "quick":    "hailuo23",       # Fastest, cheapest
    "standard": "kling3",         # Best balance
    "premium":  "kling-o3",       # Highest quality
    "ultra":    "veo31-pro",      # 4K cinematic
}

TIER_ROUTES_I2V = {
    "quick":    "hailuo23-fast",  # Fastest I2V
    "standard": "seedance",       # Good I2V with audio option
    "premium":  "kling-o3",       # Best I2V quality
    "ultra":    "sora2",          # Premium I2V
}

# Credits per 5 seconds by model (ensures profitability)
CREDITS_PER_5S = {
    # Quick tier
    "hailuo23":        1,
    "hailuo23-fast":   1,
    "hailuo02":        1,
    "wan26":           1,
    # Standard tier
    "kling3":          3,
    "seedance":        2,
    # Premium tier
    "kling-o3":        5,
    "sora2":           8,
    "grok-video":      4,
    "sora2-max":       10,
    # Ultra tier
    "veo31":           3,
    "veo31-pro":       15,
    # Special features
    "kling-motion":    8,
    "kling-edit":      8,
    "veo31-extend":    4,
}

AUDIO_EXTRA_PER_5S = 1

I2V_SUPPORTED = {
    "kling-o3", "kling3", "seedance", "sora2", "veo31", "veo31-pro",
    "hailuo23", "hailuo23-fast", "hailuo02", "wan26", "grok-video",
}
AUDIO_SUPPORTED = {"seedance", "veo31-pro", "kling3", "kling-o3"}
# Note: veo31 (fast-lite) does NOT support audio — only veo31-pro (preview) does
# Note: sora2 does NOT support audio generation
# Note: wan26 generates audio by DEFAULT — no parameter needed
STYLE_REF_SUPPORTED = {"seedance", "veo31", "veo31-pro"}
STYLE_REF_MAX = {"seedance": 9, "veo31": 3, "veo31-pro": 3}

# Models that use Kling-style image params (singular image_url)
KLING_STYLE_MODELS = {"kling3", "kling-o3", "kling-motion", "kling-edit"}

# ═══ IMAGE MODELS ═══════════════════════════════════════════

IMAGE_MODELS = {
    "nano-banana-2":     "nano-banana-2",
    "nano-banana-pro":   "nano-banana-pro",
    "nano-banana-beta":  "nano-banana-2-beta",
    "seedream-5":        "doubao-seedream-5.0-lite",
    "seedream-4.5":      "doubao-seedream-4.5",
    "gpt-image":         "gpt-image-1",
    "gpt-image-1.5":     "gpt-image-1.5",
    "z-turbo":           "z-image-turbo",
}

IMAGE_CREDITS = {
    "nano-banana-2":    {"1k": 1, "2k": 2, "4k": 4},
    "nano-banana-pro":  {"1k": 3, "2k": 4, "4k": 5},
    "nano-banana-beta": {"1k": 1, "2k": 2, "4k": 4},
    "seedream-5":       {"1k": 1, "2k": 2, "4k": 4},
    "seedream-4.5":     {"1k": 2, "2k": 3, "4k": 5},
    "gpt-image":        {"1k": 2, "2k": 3, "4k": 5},
    "gpt-image-1.5":    {"1k": 3, "2k": 4, "4k": 5},
    "z-turbo":          {"1k": 1, "2k": 1, "4k": 2},
}

IMAGE_TIER_ROUTES = {
    "quick":    "z-turbo",
    "standard": "nano-banana-2",
    "premium":  "gpt-image-1.5",
    "ultra":    "nano-banana-pro",
}

# ═══ MUSIC MODELS ═══════════════════════════════════════════

MUSIC_MODELS = {
    "suno-v4":      "suno-v4-beta",
    "suno-v4.5":    "suno-v4.5-beta",
    "suno-v5":      "suno-v5-beta",
    "suno-persona": "suno-persona",
}

MUSIC_CREDITS = {
    "suno-v4": 1,
    "suno-v4.5": 2,
    "suno-v5": 3,
    "suno-persona": 1,
}

MUSIC_TIER_ROUTES = {
    "quick":    "suno-v4",
    "standard": "suno-v4.5",
    "premium":  "suno-v5",
}


# ═══ ROUTING FUNCTIONS ══════════════════════════════════════

def resolve_video_model(tier: str, is_i2v: bool = False) -> str:
    """Resolve quality tier to best model key."""
    if is_i2v:
        return TIER_ROUTES_I2V.get(tier, "kling3")
    return TIER_ROUTES_T2V.get(tier, "kling3")


def resolve_image_model(tier: str) -> str:
    return IMAGE_TIER_ROUTES.get(tier, "nano-banana-2")


def resolve_music_model(tier: str) -> str:
    return MUSIC_TIER_ROUTES.get(tier, "suno-v4")


def calc_credits(model_key: str, duration_seconds: int, with_audio: bool = False) -> int:
    rate = CREDITS_PER_5S.get(model_key, 3)
    segments = max(duration_seconds // 5, 1)
    base = rate * segments
    if with_audio and model_key in AUDIO_SUPPORTED:
        base += AUDIO_EXTRA_PER_5S * segments
    return base


def calc_image_credits(model_key: str, quality: str = "1k") -> int:
    costs = IMAGE_CREDITS.get(model_key, {"1k": 2, "2k": 3, "4k": 5})
    return costs.get(quality, costs.get("1k", 2))


def model_supports_i2v(model_key: str) -> bool:
    return model_key in I2V_SUPPORTED


def model_supports_audio(model_key: str) -> bool:
    return model_key in AUDIO_SUPPORTED


def model_supports_style_ref(model_key: str) -> bool:
    return model_key in STYLE_REF_SUPPORTED


def _headers():
    return {
        "Authorization": f"Bearer {EVOLINK_API_KEY}",
        "Content-Type": "application/json",
    }


async def generate_video(
    model_key: str,
    prompt: str,
    duration: int,
    ratio: str,
    image_urls: Optional[List[str]] = None,
    style_refs: Optional[List[str]] = None,
    generate_audio: bool = False,
    generation_type: Optional[str] = None,
    resolution: Optional[str] = None,
    negative_prompt: Optional[str] = None,
    seed: Optional[int] = None,
) -> dict:
    """
    Submit a video generation task to EvoLink.
    Endpoint: POST /v1/videos/generations
    Returns: {success, task_id, mode} or {success, error}
    """
    if not EVOLINK_API_KEY:
        return {"success": False, "error": "EvoLink API key not configured"}

    model_id = MODEL_MAP.get(model_key)
    if not model_id:
        return {"success": False, "error": f"Unknown model: {model_key}"}

    # Determine if we need the I2V model variant
    use_i2v_model = False

    payload = {
        "model": model_id,
        "prompt": prompt,
        "duration": duration,
        "aspect_ratio": ratio,
    }

    # Resolution (quality parameter — EvoLink uses "quality" for most models)
    if resolution:
        payload["quality"] = resolution

    # Negative prompt (supported by Kling models)
    if negative_prompt:
        payload["negative_prompt"] = negative_prompt

    mode = "text-to-video"

    # Style references (REFERENCE mode)
    if style_refs and len(style_refs) > 0 and model_key in STYLE_REF_SUPPORTED:
        max_refs = STYLE_REF_MAX.get(model_key, 3)
        payload["image_urls"] = style_refs[:max_refs]
        if model_key == "veo31":
            payload["generation_type"] = "REFERENCE"
        mode = "style-reference"

    # Image-to-video (overrides style refs if both provided)
    elif image_urls and len(image_urls) > 0:
        if model_key not in I2V_SUPPORTED:
            return {"success": False, "error": f"{model_id} does not support image-to-video"}
        # Different models expect different image parameter names
        # Kling models: image_url (singular string) + image_start
        # Other models: image_urls (array)
        if model_key in KLING_STYLE_MODELS:
            payload["image_url"] = image_urls[0]
            payload["image_start"] = image_urls[0]
        else:
            payload["image_urls"] = image_urls
        # Switch to I2V model variant if available
        i2v_model = MODEL_MAP_I2V.get(model_key)
        if i2v_model:
            payload["model"] = i2v_model
        if len(image_urls) == 2 and model_key == "veo31":
            payload["generation_type"] = "FIRST&LAST"
            mode = "first-and-last"
        else:
            mode = "image-to-video"

    # Explicit generation_type override
    if generation_type:
        payload["generation_type"] = generation_type

    # Audio generation — different models use different param names
    if generate_audio and model_key in AUDIO_SUPPORTED:
        if model_key in KLING_STYLE_MODELS:
            # Kling 3.0 and O3 use 'sound' parameter (on/off)
            payload["sound"] = "on"
        else:
            # Seedance, VEO preview use 'generate_audio'
            payload["generate_audio"] = True

    # Seed for reproducibility
    if seed is not None:
        payload["seed"] = seed

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{EVOLINK_BASE_URL}/videos/generations",
                json=payload,
                headers=_headers(),
            )
            data = resp.json()

        logger.info(f"EvoLink generate response ({resp.status_code}): {data}")

        if resp.status_code in (200, 201):
            task_id = data.get("id") or data.get("task_id")
            if task_id:
                return {"success": True, "task_id": str(task_id), "mode": mode}
            return {"success": False, "error": "No task_id in response", "raw": data}

        err_msg = "EvoLink error"
        if isinstance(data.get("error"), dict):
            err_msg = data["error"].get("message", err_msg)
        elif isinstance(data.get("error"), str):
            err_msg = data["error"]
        elif data.get("message"):
            err_msg = data["message"]
        return {"success": False, "error": err_msg, "status": resp.status_code}

    except httpx.TimeoutException:
        return {"success": False, "error": "EvoLink request timed out"}
    except Exception as e:
        logger.exception("EvoLink generate_video error")
        return {"success": False, "error": str(e)}


async def upload_image(image_data: bytes, filename: str, content_type: str) -> dict:
    """
    Upload an image to EvoLink file hosting for I2V or style refs.
    Endpoint: POST https://files-api.evolink.ai/upload
    """
    if not EVOLINK_API_KEY:
        return {"success": False, "error": "EvoLink API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{EVOLINK_FILES_URL}/upload",
                headers={"Authorization": f"Bearer {EVOLINK_API_KEY}"},
                files={"file": (filename, image_data, content_type)},
            )
            data = resp.json()

        logger.info(f"EvoLink upload response ({resp.status_code}): {data}")

        if resp.status_code in (200, 201):
            # Try multiple response formats
            file_url = (
                data.get("url")
                or data.get("file_url")
                or data.get("data", {}).get("url")
                or data.get("data", {}).get("file_url")
            )
            if file_url:
                return {"success": True, "file_url": file_url}
            return {"success": False, "error": "No file_url in response", "raw": data}

        err_msg = f"Upload failed ({resp.status_code})"
        if isinstance(data.get("error"), dict):
            err_msg = data["error"].get("message", err_msg)
        elif isinstance(data.get("error"), str):
            err_msg = data["error"]
        elif data.get("message"):
            err_msg = data["message"]
        return {"success": False, "error": err_msg, "status": resp.status_code, "raw": data}

    except Exception as e:
        logger.exception("EvoLink upload_image error")
        return {"success": False, "error": str(e)}


async def poll_status(task_id: str) -> dict:
    """
    Poll EvoLink for video generation status.
    Endpoint: GET /v1/tasks/{task_id}
    Returns: {success, status, video_url} or {success, error}
    """
    if not EVOLINK_API_KEY:
        return {"success": False, "error": "EvoLink API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{EVOLINK_BASE_URL}/tasks/{task_id}",
                headers=_headers(),
            )
            data = resp.json()

        if resp.status_code == 200:
            status = data.get("status", "pending")
            video_url = None

            if status == "completed":
                # EvoLink docs: result is in results[0] or various locations
                results = data.get("results") or []
                video_url = (
                    (results[0] if results else None)
                    or data.get("video_url")
                    or data.get("output", {}).get("url")
                    or (data.get("choices") or [{}])[0].get("video", {}).get("url")
                )

            return {"success": True, "status": status, "video_url": video_url, "raw": data}

        return {"success": False, "error": f"EvoLink poll error: {resp.status_code}"}

    except Exception as e:
        logger.exception("EvoLink poll_status error")
        return {"success": False, "error": str(e)}

# ── Music Generation (Suno via EvoLink) ──────────────────────

MUSIC_MODELS = {
    "suno-v4":      "suno-v4-beta",
    "suno-v4.5":    "suno-v4.5-beta",
    "suno-v5":      "suno-v5-beta",
}

MUSIC_CREDITS = {
    "suno-v4": 1,
    "suno-v4.5": 2,
    "suno-v5": 3,
}


async def generate_music(
    model_key: str,
    prompt: str,
    custom_mode: bool = False,
    style: str = "",
    title: str = "",
    instrumental: bool = False,
    vocal_gender: str = "",
    negative_style: str = "",
) -> dict:
    """
    Generate music via Suno on EvoLink.
    Endpoint: POST /v1/audios/generations
    Returns: {success, task_id} or {success, error}
    """
    if not EVOLINK_API_KEY:
        return {"success": False, "error": "EvoLink API key not configured"}

    model_id = MUSIC_MODELS.get(model_key)
    if not model_id:
        return {"success": False, "error": f"Unknown music model: {model_key}"}

    payload = {
        "model": model_id,
        "prompt": prompt,
        "custom_mode": custom_mode,
        "instrumental": instrumental,
    }

    if custom_mode:
        if style:
            payload["style"] = style
        if title:
            payload["title"] = title
        if vocal_gender:
            payload["vocal_gender"] = vocal_gender
        if negative_style:
            payload["negative_style"] = negative_style

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{EVOLINK_BASE_URL}/audios/generations",
                json=payload,
                headers=_headers(),
            )
            data = resp.json()

        logger.info(f"EvoLink music generate response ({resp.status_code}): {data}")

        if resp.status_code in (200, 201):
            task_id = data.get("id") or data.get("task_id")
            if task_id:
                return {"success": True, "task_id": str(task_id)}
            return {"success": False, "error": "No task_id in response", "raw": data}

        err_msg = "EvoLink music error"
        if isinstance(data.get("error"), dict):
            err_msg = data["error"].get("message", err_msg)
        elif isinstance(data.get("error"), str):
            err_msg = data["error"]
        elif data.get("message"):
            err_msg = data["message"]
        return {"success": False, "error": err_msg, "status": resp.status_code}

    except httpx.TimeoutException:
        return {"success": False, "error": "EvoLink music request timed out"}
    except Exception as e:
        logger.exception("EvoLink generate_music error")
        return {"success": False, "error": str(e)}


async def poll_music_status(task_id: str) -> dict:
    """
    Poll EvoLink for music generation status.
    Endpoint: GET /v1/tasks/{task_id}  (same as video)
    """
    if not EVOLINK_API_KEY:
        return {"success": False, "error": "EvoLink API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{EVOLINK_BASE_URL}/tasks/{task_id}",
                headers=_headers(),
            )
            data = resp.json()

        if resp.status_code == 200:
            status = data.get("status", "pending")
            audio_url = None

            if status == "completed":
                results = data.get("results") or []
                # Suno returns audio URLs in results array
                if results and isinstance(results[0], str):
                    audio_url = results[0]
                elif results and isinstance(results[0], dict):
                    audio_url = results[0].get("audio_url") or results[0].get("url")
                # Fallback
                if not audio_url:
                    audio_url = data.get("audio_url") or data.get("output", {}).get("url")

            return {"success": True, "status": status, "audio_url": audio_url, "raw": data}

        return {"success": False, "error": f"EvoLink poll error: {resp.status_code}"}

    except Exception as e:
        logger.exception("EvoLink poll_music_status error")
        return {"success": False, "error": str(e)}
