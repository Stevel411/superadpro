"""
SuperCut — EvoLink API Integration
AI Video Generation via EvoLink (aggregates Kling 3.0, Seedance 2.0, Sora 2 Pro, Veo 3.1)
Base URL: https://api.evolink.ai/v1
Auth: Bearer token (EVOLINK_API_KEY env var)
Format: OpenAI-compatible

Supports:
  - Text-to-Video (all models)
  - Image-to-Video (all models)
  - Style References (Veo 3.1 REFERENCE mode, Seedance 2.0 multi-ref)
  - AI Audio generation (Seedance 2.0, Veo 3.1)
  - Storyboard: generate scenes individually, chain via last-frame-as-first
"""
import os
import logging
import httpx
from typing import Optional, List

logger = logging.getLogger("superadpro.supercut")

EVOLINK_API_KEY = os.getenv("EVOLINK_API_KEY", "")
EVOLINK_BASE_URL = "https://api.evolink.ai/v1"

MODEL_MAP = {
    "kling3":    "kling-v3",
    "seedance2": "seedance-2.0",
    "sora2":     "sora-2-pro",
    "veo31":     "veo-3.1",
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
# Style reference: Veo supports REFERENCE mode (up to 3 images), Seedance supports multi-ref
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
    Modes:
      - TEXT: prompt only
      - Image-to-Video: prompt + image_urls (first frame)
      - REFERENCE: prompt + style_refs (style guidance, Veo/Seedance)
      - FIRST&LAST: prompt + 2 image_urls (start + end frame, Veo)
    """
    if not EVOLINK_API_KEY:
        return {"success": False, "error": "EvoLink API key not configured"}

    model_id = MODEL_MAP.get(model_key)
    if not model_id:
        return {"success": False, "error": f"Unknown model: {model_key}"}

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
        payload["image_urls"] = image_urls
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

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{EVOLINK_BASE_URL}/video/generations",
                json=payload,
                headers=_headers(),
            )
            data = resp.json()

        if resp.status_code in (200, 201):
            task_id = data.get("id") or data.get("task_id")
            if task_id:
                return {"success": True, "task_id": str(task_id), "mode": mode}
            return {"success": False, "error": "No task_id in response", "raw": data}

        return {"success": False, "error": data.get("error", {}).get("message", "EvoLink error"), "status": resp.status_code}

    except httpx.TimeoutException:
        return {"success": False, "error": "EvoLink request timed out"}
    except Exception as e:
        logger.exception("EvoLink generate_video error")
        return {"success": False, "error": str(e)}


async def upload_image(image_data: bytes, filename: str, content_type: str) -> dict:
    """Upload an image to EvoLink file hosting for I2V or style refs."""
    if not EVOLINK_API_KEY:
        return {"success": False, "error": "EvoLink API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{EVOLINK_BASE_URL}/files",
                headers={"Authorization": f"Bearer {EVOLINK_API_KEY}"},
                files={"file": (filename, image_data, content_type)},
            )
            data = resp.json()
        if resp.status_code in (200, 201):
            file_url = data.get("url") or data.get("file_url")
            if file_url:
                return {"success": True, "file_url": file_url}
            return {"success": False, "error": "No file_url in response", "raw": data}
        return {"success": False, "error": data.get("error", {}).get("message", "Upload failed"), "status": resp.status_code}
    except Exception as e:
        logger.exception("EvoLink upload_image error")
        return {"success": False, "error": str(e)}


async def poll_status(task_id: str) -> dict:
    """Poll EvoLink for video generation status."""
    if not EVOLINK_API_KEY:
        return {"success": False, "error": "EvoLink API key not configured"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{EVOLINK_BASE_URL}/video/generations/{task_id}",
                headers=_headers(),
            )
            data = resp.json()
        if resp.status_code == 200:
            status = data.get("status", "pending")
            video_url = None
            if status == "completed":
                video_url = (
                    data.get("video_url")
                    or data.get("output", {}).get("url")
                    or (data.get("choices") or [{}])[0].get("video", {}).get("url")
                )
            return {"success": True, "status": status, "video_url": video_url, "raw": data}
        return {"success": False, "error": f"EvoLink poll error: {resp.status_code}"}
    except Exception as e:
        logger.exception("EvoLink poll_status error")
        return {"success": False, "error": str(e)}
