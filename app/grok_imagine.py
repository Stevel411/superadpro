"""
SuperScene — Grok Imagine Provider (xAI Direct)
Video and image generation via xAI's Grok Imagine API.

Video: POST https://api.x.ai/v1/videos/generations → poll → video URL
Image: POST https://api.x.ai/v1/images/generations → image URLs

Pricing: ~$4.20/min for video, ~$0.07 per image
"""
import os
import logging
import httpx
from typing import Optional, List

logger = logging.getLogger("superadpro.grok_imagine")

XAI_API_KEY = os.getenv("XAI_API_KEY", "")
XAI_BASE = "https://api.x.ai/v1"


def _headers():
    return {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json",
    }


# ═══ VIDEO GENERATION ═════════════════════════════════════════

def is_available(model_key: str) -> bool:
    """Check if this model should route to Grok Imagine."""
    return bool(XAI_API_KEY) and model_key in ("grok-video",)


async def generate_video(
    model_key: str,
    prompt: str,
    duration: int,
    ratio: str,
    image_urls: Optional[List[str]] = None,
    generate_audio: bool = False,
    resolution: Optional[str] = None,
    negative_prompt: Optional[str] = None,
    seed: Optional[int] = None,
) -> dict:
    """
    Submit a video generation request to xAI Grok Imagine.
    Returns: {success, task_id, mode, provider} or {success, error}
    """
    if not XAI_API_KEY:
        return {"success": False, "error": "XAI_API_KEY not configured"}

    is_i2v = bool(image_urls and len(image_urls) > 0)

    payload = {
        "model": "grok-imagine-video",
        "prompt": prompt,
    }

    # Duration: Grok supports up to 15s via API
    if duration:
        payload["duration"] = min(duration, 15)

    # Aspect ratio
    if ratio:
        payload["aspect_ratio"] = ratio

    # Resolution
    if resolution:
        res_map = {"480p": "480p", "720p": "720p"}
        payload["resolution"] = res_map.get(resolution, "720p")

    # Image-to-video
    if is_i2v and image_urls:
        payload["image"] = {"url": image_urls[0]}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{XAI_BASE}/videos/generations",
                json=payload,
                headers=_headers(),
            )
            data = resp.json()

        logger.info(f"Grok Imagine video submit ({resp.status_code}): {str(data)[:300]}")

        if resp.status_code in (200, 201):
            request_id = data.get("request_id")
            if request_id:
                # Use grok: prefix so polling knows which provider to use
                composite_id = f"grok:{request_id}"
                return {
                    "success": True,
                    "task_id": composite_id,
                    "mode": "image-to-video" if is_i2v else "text-to-video",
                    "provider": "grok-imagine",
                }
            # Some responses return the video directly (synchronous)
            if data.get("video", {}).get("url"):
                return {
                    "success": True,
                    "task_id": f"grok:direct:{data['video']['url'][:50]}",
                    "mode": "image-to-video" if is_i2v else "text-to-video",
                    "provider": "grok-imagine",
                    "video_url": data["video"]["url"],
                }
            return {"success": False, "error": f"No request_id in response: {str(data)[:200]}"}

        error = data.get("error", data.get("message", f"HTTP {resp.status_code}"))
        return {"success": False, "error": f"Grok Imagine error: {error}"}

    except httpx.TimeoutException:
        return {"success": False, "error": "Grok Imagine video request timed out"}
    except Exception as e:
        logger.exception("Grok Imagine video generation error")
        return {"success": False, "error": str(e)}


async def poll_video_status(composite_task_id: str) -> dict:
    """
    Poll xAI for video generation status.
    composite_task_id format: "grok:{request_id}"
    """
    if not XAI_API_KEY:
        return {"success": False, "error": "XAI_API_KEY not configured"}

    try:
        parts = composite_task_id.split(":", 1)
        if len(parts) != 2 or parts[0] != "grok":
            return {"success": False, "error": "Invalid Grok task ID format"}

        request_id = parts[1]

        # Handle direct URLs (synchronous responses)
        if request_id.startswith("direct:"):
            return {"success": True, "status": "completed", "video_url": None}

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{XAI_BASE}/videos/{request_id}",
                headers={"Authorization": f"Bearer {XAI_API_KEY}"},
            )
            data = resp.json()

        logger.info(f"Grok Imagine poll ({resp.status_code}): {str(data)[:300]}")

        status = data.get("status", "").lower()

        if status == "done":
            video_url = data.get("video", {}).get("url")
            return {
                "success": True,
                "status": "completed",
                "video_url": video_url,
            }
        elif status in ("queued", "processing", "in_progress"):
            return {"success": True, "status": "processing"}
        elif status in ("error", "failed"):
            error = data.get("error", "Video generation failed")
            return {"success": True, "status": "failed", "error": error}
        else:
            # Unknown status — treat as processing
            return {"success": True, "status": "processing"}

    except Exception as e:
        logger.exception("Grok Imagine poll error")
        return {"success": False, "error": str(e)}


# ═══ IMAGE GENERATION ═════════════════════════════════════════

async def generate_image(
    prompt: str,
    n: int = 1,
    size: str = "1024x1024",
    response_format: str = "url",
    model_id: str = "grok-imagine-image",
) -> dict:
    """
    Generate image(s) using Grok Imagine.
    model_id: 'grok-imagine-image' ($0.02) or 'grok-imagine-image-pro' ($0.07)
    Returns: {success, images: [{url}]} or {success, error}
    """
    if not XAI_API_KEY:
        return {"success": False, "error": "XAI_API_KEY not configured"}

    # Validate model name
    valid_models = ("grok-imagine-image", "grok-imagine-image-pro")
    api_model = model_id if model_id in valid_models else "grok-imagine-image"

    payload = {
        "model": api_model,
        "prompt": prompt,
        "n": min(n, 4),
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{XAI_BASE}/images/generations",
                json=payload,
                headers=_headers(),
            )
            data = resp.json()

        logger.info(f"Grok Imagine image ({resp.status_code}): {str(data)[:300]}")

        if resp.status_code in (200, 201):
            images = data.get("data", [])
            return {
                "success": True,
                "images": [{"url": img.get("url", "")} for img in images],
            }

        error = data.get("error", data.get("message", f"HTTP {resp.status_code}"))
        return {"success": False, "error": f"Grok image error: {error}"}

    except httpx.TimeoutException:
        return {"success": False, "error": "Grok image request timed out"}
    except Exception as e:
        logger.exception("Grok Imagine image error")
        return {"success": False, "error": str(e)}
