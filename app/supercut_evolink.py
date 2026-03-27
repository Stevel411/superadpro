"""
SuperCut — EvoLink API Integration
AI Video Generation via EvoLink (aggregates Kling 3.0, Seedance 2.0, Sora 2 Pro, Veo 3.1)
Base URL: https://api.evolink.ai/v1
Auth: Bearer token (EVOLINK_API_KEY env var)
Format: OpenAI-compatible

Supports:
  - Text-to-Video (all models)
  - Image-to-Video (all models)
  - AI Audio generation (Seedance 2.0, Veo 3.1)
"""
import os
import logging
import httpx
from typing import Optional, List

logger = logging.getLogger("superadpro.supercut")

EVOLINK_API_KEY = os.getenv("EVOLINK_API_KEY", "")
EVOLINK_BASE_URL = "https://api.evolink.ai/v1"

# Model ID mapping: our internal key -> EvoLink model string
MODEL_MAP = {
    "kling3":    "kling-v3",
    "seedance2": "seedance-2.0",
    "sora2":     "sora-2-pro",
    "veo31":     "veo-3.1",
}

# Credit cost per 5 seconds of video
CREDITS_PER_5S = {
    "kling3":    3,
    "seedance2": 2,
    "sora2":     4,
    "veo31":     5,
}

# Extra credit cost for AI audio generation
AUDIO_EXTRA_PER_5S = 1

# Which models support image-to-video
I2V_SUPPORTED = {"kling3", "seedance2", "sora2", "veo31"}

# Which models support native audio generation
AUDIO_SUPPORTED = {"seedance2", "veo31"}


def calc_credits(model_key: str, duration_seconds: int, with_audio: bool = False) -> int:
    """Calculate credit cost for a given model, duration, and audio option."""
    rate = CREDITS_PER_5S.get(model_key, 3)
    segments = duration_seconds // 5
    base = rate * segments
    if with_audio and model_key in AUDIO_SUPPORTED:
        base += AUDIO_EXTRA_PER_5S * segments
    return base


def model_supports_i2v(model_key: str) -> bool:
    return model_key in I2V_SUPPORTED


def model_supports_audio(model_key: str) -> bool:
    return model_key in AUDIO_SUPPORTED


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
    generate_audio: bool = False,
) -> dict:
    """
    Submit a video generation task to EvoLink.
    Supports text-to-video and image-to-video modes.
    Returns: {success, task_id, mode} or {success, error}
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

    # Determine generation mode
    mode = "text-to-video"
    if image_urls and len(image_urls) > 0:
        if model_key not in I2V_SUPPORTED:
            return {"success": False, "error": f"{model_id} does not support image-to-video"}
        payload["image_urls"] = image_urls
        mode = "image-to-video"

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
    """
    Upload an image to EvoLink file hosting for image-to-video.
    Returns: {success, file_url} or {success, error}
    """
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
    """
    Poll EvoLink for video generation status.
    Returns: {success, status, video_url} or {success, error}
    status values: 'pending' | 'processing' | 'completed' | 'failed'
    """
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

            return {
                "success": True,
                "status": status,
                "video_url": video_url,
                "raw": data,
            }

        return {"success": False, "error": f"EvoLink poll error: {resp.status_code}"}

    except Exception as e:
        logger.exception("EvoLink poll_status error")
        return {"success": False, "error": str(e)}
