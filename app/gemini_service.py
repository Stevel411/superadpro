"""
Unified AI text generation service.
Primary: Google Gemini (free tier / low cost)
Fallback: Anthropic Claude (if Gemini fails or is rate-limited)
"""
import os
import logging
import httpx

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models"


async def gemini_generate(prompt: str, max_tokens: int = 2000, system: str = "") -> str:
    """Call Google Gemini API. Returns generated text or raises on failure."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")

    url = f"{GEMINI_URL}/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

    contents = []
    if system:
        contents.append({"role": "user", "parts": [{"text": system + "\n\n" + prompt}]})
    else:
        contents.append({"role": "user", "parts": [{"text": prompt}]})

    payload = {
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": 0.7,
        }
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            error_detail = resp.text[:300]
            logger.error(f"Gemini API error {resp.status_code}: {error_detail}")
            raise Exception(f"Gemini API error: {resp.status_code}")

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise Exception("Gemini returned no candidates")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise Exception("Gemini returned no content parts")

        return parts[0].get("text", "")


async def claude_generate(prompt: str, max_tokens: int = 2000, model: str = None) -> str:
    """Call Anthropic Claude API. Returns generated text or raises on failure."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set")

    if model is None:
        model = "claude-haiku-4-5-20251001"

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text


async def ai_generate(prompt: str, max_tokens: int = 2000, system: str = "", prefer: str = "gemini") -> str:
    """
    Unified AI text generation — routes through Grok 4.1 Fast with Claude Haiku 4.5 fallback.

    The function name and signature are kept stable so existing call sites don't
    need updating, but the routing has migrated from Gemini-first to Grok-first
    as part of the cost-optimisation work in May 2026. The `prefer` parameter is
    accepted for backwards compatibility but no longer affects routing.

    Args:
        prompt: The user prompt
        max_tokens: Maximum output tokens
        system: Optional system instruction
        prefer: ignored — kept for backwards compatibility

    Returns:
        Generated text string
    """
    from .grok_service import ai_text_generate
    return await ai_text_generate(prompt=prompt, system=system, max_tokens=max_tokens, temperature=0.7)
