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
