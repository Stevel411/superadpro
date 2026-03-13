# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Video URL Parser & Embed Generator
# Supports: YouTube, Vimeo, Direct MP4
# ═══════════════════════════════════════════════════════════════
import re
from urllib.parse import urlparse, parse_qs
from typing import Optional


ALLOWED_PLATFORMS = {"youtube", "vimeo", "direct"}


def parse_video_url(url: str) -> Optional[dict]:
    """
    Parse a video URL and return platform, video_id, and embed_url.
    Returns None if URL is not a recognised/allowed platform.
    """
    url = url.strip()

    # ── YouTube ──────────────────────────────────────────────
    yt_patterns = [
        r'(?:youtube\.com/watch\?(?:.*&)?v=|youtu\.be/|youtube\.com/shorts/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
    ]
    for pattern in yt_patterns:
        m = re.search(pattern, url)
        if m:
            vid_id = m.group(1)
            return {
                "platform": "youtube",
                "video_id": vid_id,
                "embed_url": f"https://www.youtube.com/embed/{vid_id}?rel=0&modestbranding=1",
            }

    # ── Vimeo ────────────────────────────────────────────────
    m = re.search(r'vimeo\.com/(?:video/)?(\d+)', url)
    if m:
        vid_id = m.group(1)
        return {
            "platform": "vimeo",
            "video_id": vid_id,
            "embed_url": f"https://player.vimeo.com/video/{vid_id}?title=0&byline=0",
        }

    # ── Direct MP4/WebM/OGG (uploaded to R2 or any URL) ──────
    if url.endswith(('.mp4', '.webm', '.ogg')) or '/funnel-videos/' in url or '/static/uploads/' in url:
        return {
            "platform": "direct",
            "video_id": url.split('/')[-1].split('.')[0],
            "embed_url": url,
        }

    return None


def platform_label(platform: str) -> str:
    return {"youtube": "YouTube", "vimeo": "Vimeo", "direct": "Uploaded"}.get(platform, platform.title())


def platform_colour(platform: str) -> str:
    return {
        "youtube": "#ff0000",
        "vimeo":   "#1ab7ea",
        "direct":  "#10b981",
    }.get(platform, "#00b4d8")
