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

API CONTRACT
------------
Verified against xAI docs on 12 May 2026:
  - https://docs.x.ai/docs/guides/image-generations
  - https://docs.x.ai/developers/model-capabilities/images/generation

Two endpoints used depending on whether we have a reference photo:
  - POST /v1/images/generations   (text-to-image; no reference)
  - POST /v1/images/edits         (with reference photo)

Both accept {prompt, model, n, aspect_ratio}. The /edits endpoint also
requires {image: {url, type: "image_url"}} pointing at the reference.

Response shape (same for both): {"data": [{"url": "...", "revised_prompt": "..."}]}
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

    Routes to two different endpoints depending on whether we have a
    reference photo:
      - Text-to-image: POST /v1/images/generations (no reference)
      - Image edit:    POST /v1/images/edits       (with reference photo)
    
    Both endpoints return the same response shape: {"data": [{"url": ...}, ...]}.
    Verified against xAI docs (https://docs.x.ai/docs/guides/image-generations
    and /developers/model-capabilities/images/generation) on 12 May 2026.

    Returns:
        {"images": [url, url, url, url], "raw": <full response>}
        OR
        {"error": "...", "status_code": int}
    """
    if not XAI_API_KEY:
        return {"error": "XAI_API_KEY not configured"}

    headers = {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json",
    }

    if reference_url:
        # ── Image edit path: uses the member's photo as a base ──
        # Per docs: /v1/images/edits accepts {prompt, model, image: {url, type}}.
        # The 'image' field is a single object, not an array (use 'images'
        # for multi-image which we don't need yet).
        endpoint = f"{XAI_BASE_URL}/images/edits"
        payload = {
            "model": GROK_IMAGINE_MODEL,
            "prompt": prompt,
            "image": {
                "url": reference_url,
                "type": "image_url",
            },
            "n": n,
            "aspect_ratio": aspect,
        }
    else:
        # ── Text-to-image path: pure prompt → 4 candidates ──
        endpoint = f"{XAI_BASE_URL}/images/generations"
        payload = {
            "model": GROK_IMAGINE_MODEL,
            "prompt": prompt,
            "n": n,
            "aspect_ratio": aspect,
        }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.post(endpoint, json=payload, headers=headers)

            if resp.status_code >= 400:
                logger.warning(
                    f"Grok Imagine API error {resp.status_code} on {endpoint}: "
                    f"{resp.text[:500]}"
                )
                return {
                    "error": f"Grok Imagine returned {resp.status_code}",
                    "status_code": resp.status_code,
                    "detail": resp.text[:500],
                }

            data = resp.json()

            # Parse the response — xAI uses the OpenAI convention:
            # {"data": [{"url": "...", "revised_prompt": "..."}, ...]}
            urls = []
            if "data" in data and isinstance(data["data"], list):
                urls = [item.get("url") for item in data["data"] if item.get("url")]

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
