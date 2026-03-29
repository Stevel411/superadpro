"""
SuperScene — fal.ai Provider Integration
Video generation via fal.ai queue API (REST, no SDK needed)
Base URL: https://queue.fal.run
Auth: Key header (FAL_KEY env var)

fal.ai is the cheaper provider for:
- Kling 3.0 (61% cheaper than EvoLink)
- Seedance 1.5 Pro (competitive)
- Wan 2.6 (competitive)
- Hailuo 2.3 (available)
"""
import os
import logging
import httpx
from typing import Optional, List

logger = logging.getLogger("superadpro.fal")

FAL_KEY = os.getenv("FAL_KEY", "")
FAL_QUEUE_URL = "https://queue.fal.run"

# ═══ MODEL ROUTING ═══════════════════════════════════════════
# model_key → fal.ai model endpoint path

FAL_MODELS_T2V = {
    # Only models where fal.ai is cheaper or EvoLink doesn't have them
    # Kling 3.0: fal=$0.084/s vs EvoLink=$0.075/s → EvoLink cheaper, REMOVED
    # Seedance: similar pricing, keep as fallback
    "wan26":         "fal-ai/wan/v2.6/text-to-video",
    "hailuo23":      "fal-ai/minimax-video/video-01",
}

FAL_MODELS_I2V = {
    "wan26":         "fal-ai/wan/v2.6/image-to-video",
}

# Models available on fal.ai
FAL_SUPPORTED = set(FAL_MODELS_T2V.keys())


def _headers():
    return {
        "Authorization": f"Key {FAL_KEY}",
        "Content-Type": "application/json",
    }


def is_available(model_key: str) -> bool:
    """Check if a model is available on fal.ai."""
    return bool(FAL_KEY) and model_key in FAL_SUPPORTED


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
    Submit a video generation task to fal.ai queue.
    Returns: {success, task_id, provider} or {success, error}
    
    fal.ai uses queue-based async processing:
    1. POST to queue endpoint → get request_id
    2. Poll status endpoint → get result when COMPLETED
    """
    if not FAL_KEY:
        return {"success": False, "error": "fal.ai API key not configured"}

    # Determine T2V or I2V
    is_i2v = image_urls and len(image_urls) > 0
    
    if is_i2v:
        model_path = FAL_MODELS_I2V.get(model_key)
    else:
        model_path = FAL_MODELS_T2V.get(model_key)
    
    if not model_path:
        return {"success": False, "error": f"Model {model_key} not available on fal.ai"}

    # Build fal.ai input payload
    payload = {
        "prompt": prompt,
        "duration": str(duration),
        "aspect_ratio": ratio,
    }

    # Image-to-video
    if is_i2v:
        # fal.ai Kling V3 I2V uses start_image_url
        if "kling" in model_key:
            payload["start_image_url"] = image_urls[0]
        else:
            payload["image_url"] = image_urls[0]

    # Audio
    if generate_audio:
        payload["generate_audio"] = True

    # Negative prompt
    if negative_prompt:
        payload["negative_prompt"] = negative_prompt

    # Seed
    if seed is not None:
        payload["seed"] = seed

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{FAL_QUEUE_URL}/{model_path}",
                json=payload,
                headers=_headers(),
            )
            data = resp.json()

        logger.info(f"fal.ai submit response ({resp.status_code}): {data}")

        if resp.status_code in (200, 201):
            request_id = data.get("request_id")
            if request_id:
                # Store the model path with the request_id so we can poll correctly
                # Format: "fal:{model_path_with_pipes}:{request_id}"
                # Replace / with | to avoid URL path issues
                safe_path = model_path.replace("/", "|")
                composite_id = f"fal:{safe_path}:{request_id}"
                return {"success": True, "task_id": composite_id, "provider": "fal"}
            return {"success": False, "error": "No request_id in fal.ai response", "raw": data}

        err_msg = data.get("detail", data.get("message", f"fal.ai error ({resp.status_code})"))
        return {"success": False, "error": err_msg, "raw": data}

    except httpx.TimeoutException:
        return {"success": False, "error": "fal.ai request timed out"}
    except Exception as e:
        logger.exception("fal.ai generate_video error")
        return {"success": False, "error": str(e)}


async def poll_status(composite_task_id: str) -> dict:
    """
    Poll fal.ai for generation status.
    composite_task_id format: "fal:{model_path}:{request_id}"
    
    fal.ai status endpoint: GET https://queue.fal.run/{model_path}/requests/{request_id}/status
    fal.ai result endpoint: GET https://queue.fal.run/{model_path}/requests/{request_id}
    """
    if not FAL_KEY:
        return {"success": False, "error": "fal.ai API key not configured"}

    try:
        parts = composite_task_id.split(":", 2)
        if len(parts) != 3 or parts[0] != "fal":
            return {"success": False, "error": "Invalid fal.ai task ID format"}
        
        # Restore slashes from pipe encoding
        model_path = parts[1].replace("|", "/")
        request_id = parts[2]
        
        status_url = f"{FAL_QUEUE_URL}/{model_path}/requests/{request_id}/status"
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(status_url, headers=_headers())
            data = resp.json()

        logger.info(f"fal.ai status response: {data}")

        status = data.get("status", "").upper()
        
        if status == "COMPLETED":
            # Fetch the actual result
            result_url = f"{FAL_QUEUE_URL}/{model_path}/requests/{request_id}"
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp2 = await client.get(result_url, headers=_headers())
                result = resp2.json()

            logger.info(f"fal.ai result: {result}")

            # fal.ai returns video in result.video.url
            video_url = None
            if isinstance(result.get("video"), dict):
                video_url = result["video"].get("url")
            elif isinstance(result.get("data"), dict):
                video_url = result["data"].get("video", {}).get("url")
            
            if video_url:
                return {"success": True, "status": "completed", "video_url": video_url}
            return {"success": True, "status": "completed", "video_url": None, "raw": result}

        elif status in ("IN_QUEUE", "IN_PROGRESS"):
            return {"success": True, "status": "processing"}

        elif status == "FAILED":
            error = data.get("error", "Generation failed on fal.ai")
            return {"success": True, "status": "failed", "error": error}

        else:
            return {"success": True, "status": "processing"}

    except Exception as e:
        logger.exception("fal.ai poll_status error")
        return {"success": False, "error": str(e)}
