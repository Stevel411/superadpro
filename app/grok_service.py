"""
SuperAdPro — Grok AI Service (xAI)
OpenAI-compatible API wrapper for Grok models.
Used for: AI Sales Agent, prompt generation, content creation.
Ultra-cheap: $0.20/M input, $0.50/M output tokens.
"""

import os
import httpx
import logging

logger = logging.getLogger(__name__)

XAI_API_KEY = os.getenv("XAI_API_KEY", "")
XAI_BASE_URL = "https://api.x.ai/v1"

# ── Model choices ─────────────────────────────────────────
# grok-4-1-fast       — best value, 2M context, reasoning
# grok-4              — flagship, highest quality
# grok-3-mini         — lightweight, very cheap
MODELS = {
    "fast": "grok-4-1-fast",
    "flagship": "grok-4",
    "mini": "grok-3-mini",
}

DEFAULT_MODEL = "grok-4-1-fast"


async def grok_chat(
    messages: list[dict],
    model: str = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    system_prompt: str = None,
) -> dict:
    """
    Send a chat completion request to Grok.
    
    Args:
        messages: List of {"role": "user|assistant|system", "content": "..."}
        model: Model name or alias ("fast", "flagship", "mini")
        temperature: 0-2, lower = more deterministic
        max_tokens: Max response length
        system_prompt: Optional system prompt prepended to messages
    
    Returns:
        {"content": str, "model": str, "usage": dict} or {"error": str}
    """
    if not XAI_API_KEY:
        return {"error": "XAI_API_KEY not configured"}

    # Resolve model alias
    resolved_model = MODELS.get(model, model) if model else DEFAULT_MODEL

    # Prepend system prompt if provided
    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)

    payload = {
        "model": resolved_model,
        "messages": full_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{XAI_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {XAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if resp.status_code != 200:
            error_body = resp.text
            logger.error(f"Grok API error {resp.status_code}: {error_body}")
            return {"error": f"Grok API error: {resp.status_code}", "detail": error_body}

        data = resp.json()
        choice = data.get("choices", [{}])[0]
        message = choice.get("message", {})
        usage = data.get("usage", {})

        return {
            "content": message.get("content", ""),
            "model": data.get("model", resolved_model),
            "usage": {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            },
            "finish_reason": choice.get("finish_reason", ""),
        }

    except httpx.TimeoutException:
        logger.error("Grok API timeout")
        return {"error": "Grok API request timed out"}
    except Exception as e:
        logger.error(f"Grok API exception: {e}")
        return {"error": str(e)}


async def grok_generate_prompt(topic: str, style: str = "cinematic") -> str:
    """Generate a creative prompt for SuperScene video/image generation."""
    result = await grok_chat(
        messages=[{"role": "user", "content": f"Write a detailed visual prompt for AI video generation about: {topic}. Style: {style}. Keep it under 200 words. Be specific about camera angles, lighting, mood, and motion."}],
        system_prompt="You are a creative director who writes stunning visual prompts for AI video generation. Be vivid, specific, and cinematic. Output ONLY the prompt, no explanations.",
        temperature=0.9,
        max_tokens=300,
    )
    return result.get("content", "")


async def grok_generate_content(
    content_type: str,
    topic: str,
    tone: str = "professional",
    length: str = "medium",
) -> str:
    """
    Generate marketing content for SuperSeller.
    content_type: "social_post" | "email" | "ad_copy" | "video_script" | "strategy"
    """
    length_guide = {"short": "2-3 sentences", "medium": "1-2 paragraphs", "long": "3-5 paragraphs"}
    
    prompts = {
        "social_post": f"Write a {tone} social media post about: {topic}. Length: {length_guide.get(length, '1-2 paragraphs')}. Include relevant hashtags.",
        "email": f"Write a {tone} marketing email about: {topic}. Length: {length_guide.get(length, '1-2 paragraphs')}. Include a compelling subject line at the start.",
        "ad_copy": f"Write {tone} advertising copy about: {topic}. Length: {length_guide.get(length, '2-3 sentences')}. Focus on benefits and a clear call to action.",
        "video_script": f"Write a {tone} video script about: {topic}. Length: {length_guide.get(length, '1-2 paragraphs')}. Include visual directions in brackets.",
        "strategy": f"Write a {tone} marketing strategy overview for: {topic}. Length: {length_guide.get(length, '3-5 paragraphs')}. Include actionable steps.",
    }

    result = await grok_chat(
        messages=[{"role": "user", "content": prompts.get(content_type, prompts["social_post"])}],
        system_prompt="You are an expert digital marketing copywriter. Write compelling, conversion-focused content. Output ONLY the content, no meta-commentary.",
        temperature=0.8,
        max_tokens=800,
    )
    return result.get("content", "")


async def grok_sales_agent(
    prospect_message: str,
    product_info: str,
    conversation_history: list[dict] = None,
) -> str:
    """
    AI Sales Agent — handles prospect objections and questions.
    Uses conversation history for context.
    """
    system = f"""You are a friendly, knowledgeable AI sales assistant for SuperAdPro.
You help prospects understand the platform and answer their questions.
Be helpful, not pushy. Address objections honestly.
Keep responses concise (2-4 sentences unless they ask for detail).

Product information:
{product_info}"""

    messages = conversation_history or []
    messages.append({"role": "user", "content": prospect_message})

    result = await grok_chat(
        messages=messages,
        system_prompt=system,
        temperature=0.7,
        max_tokens=500,
    )
    return result.get("content", "I'm here to help! Could you tell me more about what you're looking for?")


def is_configured() -> bool:
    """Check if Grok API is configured."""
    return bool(XAI_API_KEY)


# ────────────────────────────────────────────────────────────────────
# Unified text-generation entry point for the rest of the application.
#
# Migration philosophy (Steve, 1 May 2026): Claude is the operational
# partner used for engineering this codebase; Grok 4.1 Fast handles
# all member-facing text AI in production. Cost is 5-10x lower than
# Haiku 4.5 with equivalent benchmark quality at the chat/copy tier.
#
# This function is the ONE entry point — every endpoint that used to
# call _call_ai, _call_ai_with_system, or gemini_service.ai_generate
# now routes here. Anthropic Claude Haiku 4.5 stays wired as silent
# fallback: if xAI has an outage we don't break customer features,
# and the cost spike is bounded to the duration of the outage.
# ────────────────────────────────────────────────────────────────────

async def ai_text_generate(
    prompt: str = None,
    system: str = "",
    messages: list = None,
    max_tokens: int = 2000,
    temperature: float = 0.7,
) -> str:
    """Generate text via Grok 4.1 Fast with Claude Haiku 4.5 fallback.

    Two calling styles:
      - Single-shot: pass `prompt` (and optionally `system`)
      - Multi-turn:  pass `messages` (list of {role, content}) and optionally `system`
                     The `system` argument becomes a system_prompt.

    On Grok success: returns the generated text.
    On Grok failure (network error, non-200, empty content): silently retries
    via Claude Haiku 4.5. If both fail, raises Exception so the caller can
    decide whether to surface an error or render a graceful fallback.

    Never returns empty string on success. Never raises on partial provider
    failure — only when ALL providers fail.
    """
    import asyncio

    # Normalise inputs into a messages list for Grok's chat-completion shape.
    if messages is None:
        if prompt is None:
            raise ValueError("ai_text_generate requires either `prompt` or `messages`")
        chat_messages = [{"role": "user", "content": prompt}]
    else:
        chat_messages = list(messages)

    # ── Primary: Grok 4.1 Fast ──────────────────────────────────────
    if XAI_API_KEY:
        try:
            result = await grok_chat(
                messages=chat_messages,
                system_prompt=system or None,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = result.get("content", "") if isinstance(result, dict) else ""
            if content and content.strip():
                logger.info("ai_text_generate: Grok succeeded")
                return content
            # Empty response — log and fall through to Claude
            logger.warning(f"ai_text_generate: Grok returned empty/error: {result.get('error', 'no content')}")
        except Exception as e:
            logger.warning(f"ai_text_generate: Grok exception, falling back to Claude: {e}")

    # ── Fallback: Claude Haiku 4.5 ──────────────────────────────────
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise Exception("Both Grok and Claude unavailable: XAI_API_KEY missing or failed, and ANTHROPIC_API_KEY not set")

    # Build Anthropic-shape payload. Anthropic uses `system` separately and
    # only allows user/assistant roles in messages — strip any system roles
    # that may have been embedded.
    claude_messages = [
        {"role": m["role"], "content": str(m["content"])[:50000]}
        for m in chat_messages
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    if not claude_messages:
        raise Exception("ai_text_generate: no valid messages to send")

    last_error = None
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=180) as client:
                payload = {
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": max_tokens,
                    "messages": claude_messages,
                }
                if system:
                    payload["system"] = system
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json=payload,
                )
                data = resp.json()
                if "content" in data and len(data["content"]) > 0:
                    text = data["content"][0].get("text", "")
                    if text:
                        logger.info("ai_text_generate: Claude fallback succeeded")
                        return text
                last_error = f"Claude response error: {data}"
                logger.warning(f"ai_text_generate Claude attempt {attempt+1} failed: {last_error}")
        except Exception as e:
            last_error = str(e)
            logger.warning(f"ai_text_generate Claude attempt {attempt+1} exception: {last_error}")
        if attempt < 1:
            await asyncio.sleep(2)

    raise Exception(f"All AI providers failed. Last error: {last_error}")
