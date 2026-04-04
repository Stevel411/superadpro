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
    Unified AI text generation. Tries preferred provider first, falls back to other.

    Args:
        prompt: The user prompt
        max_tokens: Maximum output tokens
        system: Optional system instruction (prepended to prompt for Gemini)
        prefer: "gemini" or "claude" — which to try first

    Returns:
        Generated text string
    """
    if prefer == "gemini":
        # Try Gemini first, fallback to Claude
        try:
            result = await gemini_generate(prompt, max_tokens, system)
            logger.info("AI generation: Gemini succeeded")
            return result
        except Exception as e:
            logger.warning(f"Gemini failed ({e}), falling back to Claude")
            try:
                full_prompt = (system + "\n\n" + prompt) if system else prompt
                result = await claude_generate(full_prompt, max_tokens)
                logger.info("AI generation: Claude fallback succeeded")
                return result
            except Exception as e2:
                logger.error(f"Both Gemini and Claude failed: {e2}")
                raise Exception(f"AI generation failed: {e2}")
    else:
        # Try Claude first, fallback to Gemini
        try:
            full_prompt = (system + "\n\n" + prompt) if system else prompt
            result = await claude_generate(full_prompt, max_tokens)
            logger.info("AI generation: Claude succeeded")
            return result
        except Exception as e:
            logger.warning(f"Claude failed ({e}), falling back to Gemini")
            try:
                result = await gemini_generate(prompt, max_tokens, system)
                logger.info("AI generation: Gemini fallback succeeded")
                return result
            except Exception as e2:
                logger.error(f"Both Claude and Gemini failed: {e2}")
                raise Exception(f"AI generation failed: {e2}")
