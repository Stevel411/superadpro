"""
AI Content Moderation for SuperAdPro
Uses Claude API to scan ads, banners, and video content before publishing.
Clean content → auto-approved. Flagged → pending admin review.
"""

import os
import json
import logging
import requests

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

MODERATION_PROMPT = """You are a content moderator for SuperAdPro, a video advertising and affiliate marketing platform. 
Review the following user-submitted content and determine if it should be APPROVED or FLAGGED for manual review.

APPROVE if the content is:
- A legitimate product, service, or business listing
- Professional and appropriate
- Not misleading or deceptive
- Free of prohibited content

FLAG if the content contains any of:
- Adult/sexual content or nudity
- Hate speech, racism, discrimination
- Illegal products or services (drugs, weapons, counterfeit goods)
- Scams, phishing, or deceptive schemes
- Pyramid schemes or fraudulent income claims
- Violence, threats, or harassment
- Gambling (unlicensed)
- Malware, hacking tools, or security exploits
- Personal information of others (doxxing)
- Cryptocurrency scams or fake token promotions
- Misleading health claims or fake pharmaceuticals
- Content targeting minors inappropriately
- Excessive use of ALL CAPS, spam-like text, or clickbait

Respond with ONLY a JSON object (no markdown, no backticks):
{"decision": "approve" or "flag", "reason": "brief explanation", "confidence": 0.0 to 1.0}
"""


def moderate_content(title: str, description: str = "", keywords: str = "", category: str = "", link_url: str = "") -> dict:
    """
    Scan content using Claude API. Returns:
    {"decision": "approve"|"flag"|"error", "reason": str, "confidence": float}
    """
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set — auto-approving all content")
        return {"decision": "approve", "reason": "API key not configured — auto-approved", "confidence": 0.0}

    content_text = f"""
TITLE: {title}
DESCRIPTION: {description}
KEYWORDS: {keywords}
CATEGORY: {category}
LINK URL: {link_url}
"""

    try:
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 200,
                "messages": [
                    {"role": "user", "content": MODERATION_PROMPT + "\n\nCONTENT TO REVIEW:\n" + content_text}
                ],
            },
            timeout=15,
        )

        if response.status_code != 200:
            logger.error(f"Moderation API error: {response.status_code} — {response.text[:200]}")
            return {"decision": "flag", "reason": f"API error ({response.status_code}) — queued for manual review", "confidence": 0.0}

        data = response.json()
        text = ""
        for block in data.get("content", []):
            if block.get("type") == "text":
                text += block.get("text", "")

        # Parse JSON response
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        result = json.loads(text)
        decision = result.get("decision", "flag").lower()
        reason = result.get("reason", "No reason provided")
        confidence = float(result.get("confidence", 0.5))

        if decision not in ("approve", "flag"):
            decision = "flag"

        logger.info(f"Moderation result: {decision} ({confidence:.2f}) — {reason[:80]}")
        return {"decision": decision, "reason": reason, "confidence": confidence}

    except json.JSONDecodeError as e:
        logger.error(f"Moderation JSON parse error: {e} — raw: {text[:200]}")
        return {"decision": "flag", "reason": "Could not parse AI response — queued for manual review", "confidence": 0.0}
    except requests.Timeout:
        logger.error("Moderation API timeout")
        return {"decision": "flag", "reason": "API timeout — queued for manual review", "confidence": 0.0}
    except Exception as e:
        logger.error(f"Moderation error: {e}")
        return {"decision": "flag", "reason": f"Error: {str(e)[:100]} — queued for manual review", "confidence": 0.0}
