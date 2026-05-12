"""
SuperAdPro — Grok Imagine Service (xAI)
========================================

Image generation via xAI's Grok Imagine model. Used by Social Post Studio
to generate marketing-grade photos of members in vibe contexts (Pro
Headshot, Luxury Lifestyle, City Night, etc.).

Phase 3 of Social Post Studio. Returns 4 candidates per generation so
members can pick the best one.

Cost: ~$0.07/image (verify in xAI dashboard). Members charged 5 credits
per generation, 3 per regenerate, 2 per upscale.

Model: grok-imagine-image-quality (replaces -pro on 15 May 2026; we ship
with the new name 3 days early per Steve's call 12 May 2026).

API CONTRACT NOTE
-----------------
xAI's Imagine API endpoint is on the same v1 base as the chat API but
the exact request/response shape may differ. This wrapper is structured
so the API call is isolated to _call_xai_imagine(). If the live API
behaves differently than assumed, fix that one function — error handling,
credits refund, and audit logging in the calling code all stay valid.
"""

import os
import httpx
import logging
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)

XAI_API_KEY = os.getenv("XAI_API_KEY", "")
XAI_BASE_URL = "https://api.x.ai/v1"

# Model name — pinned per Steve's decision 12 May 2026
GROK_IMAGINE_MODEL = "grok-imagine-image-quality"

# How many candidates to return per generation. Spec: 4.
DEFAULT_CANDIDATE_COUNT = 4

# Per-image approx provider cost in USD. Used for margin reporting only.
# Real cost comes from xAI billing dashboard.
APPROX_COST_USD_PER_IMAGE = 0.07

# Request timeout: image gen takes longer than chat, allow generous time.
REQUEST_TIMEOUT_SECONDS = 120


def is_available() -> bool:
    """True if the XAI_API_KEY is configured at all."""
    return bool(XAI_API_KEY)


async def _call_xai_imagine(
    prompt: str,
    reference_url: Optional[str] = None,
    n: int = DEFAULT_CANDIDATE_COUNT,
    aspect: str = "1:1",
) -> dict:
    """The actual HTTP call to xAI's Imagine API.

    Isolated so the rest of the wrapper stays stable if xAI changes
    the request/response shape.

    Returns:
        {"images": [url, url, url, url], "raw": <full response>}
        OR
        {"error": "...", "status_code": int}
    """
    if not XAI_API_KEY:
        return {"error": "XAI_API_KEY not configured"}

    # Best-effort payload shape — OpenAI-compatible image generation
    # convention. xAI follows OpenAI's API closely. Adjust here if the
    # real API differs (we'll learn from the first live test).
    payload = {
        "model": GROK_IMAGINE_MODEL,
        "prompt": prompt,
        "n": n,
        "response_format": "url",
    }
    # Aspect ratio mapped to size if the API supports it
    aspect_to_size = {
        "1:1":  "1024x1024",
        "4:5":  "1024x1280",
        "9:16": "768x1344",
        "16:9": "1344x768",
    }
    if aspect in aspect_to_size:
        payload["size"] = aspect_to_size[aspect]
    if reference_url:
        # Reference image for img2img-style generation. If the API uses a
        # different parameter name (e.g. 'image' or 'reference_image'),
        # this is the spot to adjust.
        payload["reference_image"] = reference_url

    headers = {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                f"{XAI_BASE_URL}/images/generations",
                json=payload,
                headers=headers,
            )

            if resp.status_code >= 400:
                logger.warning(
                    f"Grok Imagine API error {resp.status_code}: {resp.text[:500]}"
                )
                return {
                    "error": f"Grok Imagine returned {resp.status_code}",
                    "status_code": resp.status_code,
                    "detail": resp.text[:500],
                }

            data = resp.json()

            # Parse the response — OpenAI convention is {"data": [{"url": ...}, ...]}
            urls = []
            if "data" in data and isinstance(data["data"], list):
                urls = [item.get("url") for item in data["data"] if item.get("url")]
            elif "images" in data and isinstance(data["images"], list):
                urls = [
                    item.get("url") if isinstance(item, dict) else item
                    for item in data["images"]
                ]

            if not urls:
                logger.warning(f"Grok Imagine returned no images: {data}")
                return {"error": "No images returned by Grok Imagine", "raw": data}

            return {"images": urls, "raw": data}

    except httpx.TimeoutException:
        logger.warning(f"Grok Imagine timeout after {REQUEST_TIMEOUT_SECONDS}s")
        return {"error": "Grok Imagine timed out — try again"}
    except Exception as exc:
        logger.exception(f"Grok Imagine call failed: {exc}")
        return {"error": f"Image generation failed: {exc}"}


async def generate_candidates(
    prompt: str,
    reference_url: Optional[str] = None,
    aspect: str = "1:1",
    n: int = DEFAULT_CANDIDATE_COUNT,
) -> dict:
    """High-level: generate N candidate images for a prompt + optional reference.

    Returns:
        success: {"images": [url1, url2, ...], "cost_usd": float}
        failure: {"error": "...", "detail": "..."}

    Caller is responsible for credits handling (deduct before, refund on error).
    This function is pure — no side effects to the database.
    """
    result = await _call_xai_imagine(
        prompt=prompt,
        reference_url=reference_url,
        n=n,
        aspect=aspect,
    )

    if "error" in result:
        return result

    images = result.get("images", [])
    cost_usd = round(APPROX_COST_USD_PER_IMAGE * len(images), 4)

    return {
        "images": images,
        "cost_usd": cost_usd,
    }
