"""
SuperScene — EvoLink API Integration
AI Video Generation via EvoLink
Base URL: https://api.evolink.ai/v1
File Upload: https://files-api.evolink.ai
Auth: Bearer token (EVOLINK_API_KEY env var)

Documented endpoints (verified against EvoLink docs):
  - POST /v1/videos/generations  → submit video generation task
  - GET  /v1/tasks/{task_id}     → poll task status
  - POST https://files-api.evolink.ai/upload → upload files

Models: kling-v3, seedance-2-0, sora-2-pro, veo-3.1
"""
import os
import logging
import httpx
from typing import Optional, List

logger = logging.getLogger("superadpro.superscene")

EVOLINK_API_KEY = os.getenv("EVOLINK_API_KEY", "")
EVOLINK_BASE_URL = "https://api.evolink.ai/v1"
EVOLINK_FILES_URL = "https://files-api.evolink.ai"

# Model ID mapping — extracted from evolink.ai model pages
# Kling uses separate model IDs for T2V vs I2V
MODEL_MAP = {
    "kling3":    "kling-v3-text-to-video",
    "seedance2": "seedance-1.5-pro",
    "sora2":     "sora-2-pro",
    "veo31":     "veo-3-1-fast-lite",
}

# Kling image-to-video uses a different model ID
MODEL_MAP_I2V = {
    "kling3":    "kling-v3-image-to-video",
    "seedance2": "seedance-1.5-pro",
    "sora2":     "sora-2-pro",
    "veo31":     "veo-3-1-fast-lite",
}

CREDITS_PER_5S = {
    "kling3":    3,
    "seedance2": 2,
    "sora2":     4,
    "veo31":     5,
}

AUDIO_EXTRA_PER_5S = 1

I2V_SUPPORTED = {"kling3", "seedance2", "sora2", "veo31"}
AUDIO_SUPPORTED = {"seedance2", "veo31"}
STYLE_REF_SUPPORTED = {"seedance2", "veo31"}
STYLE_REF_MAX = {"seedance2": 9, "veo31": 3}


def calc_credits(model_key: str, duration_seconds: int, with_audio: bool = False) -> int:
    rate = CREDITS_PER_5S.get(model_key, 3)
    segments = max(duration_seconds // 5, 1)
    base = rate * segments
    if with_audio and model_key in AUDIO_SUPPORTED:
        base += AUDIO_EXTRA_PER_5S * segments
    return base


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
        # Kling: image_url (singular string) or image_start
        # Seedance/Veo/Sora: image_urls (array)
        if model_key == "kling3":
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

    # Audio generation
    if generate_audio and model_key in AUDIO_SUPPORTED:
        payload["generate_audio"] = True
        payload["audio"] = True  # some models use 'audio' param

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
