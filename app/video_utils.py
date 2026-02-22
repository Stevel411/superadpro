# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Video URL Parser & Embed Generator
# Supports: YouTube, Rumble, Vimeo
# ═══════════════════════════════════════════════════════════════
import re
from urllib.parse import urlparse, parse_qs
from typing import Optional


ALLOWED_PLATFORMS = {"youtube", "rumble", "vimeo"}


def parse_video_url(url: str) -> Optional[dict]:
    """
    Parse a video URL and return platform, video_id, and embed_url.
    Returns None if URL is not a recognised/allowed platform.
    """
    url = url.strip()

    # ── YouTube ──────────────────────────────────────────────
    # youtube.com/watch?v=ID
    # youtu.be/ID
    # youtube.com/shorts/ID
    # youtube.com/embed/ID  (already an embed — still valid)
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

    # ── Rumble ───────────────────────────────────────────────
    # rumble.com/vXXXXX-title.html
    # rumble.com/embed/vXXXXX/
    m = re.search(r'rumble\.com/(?:embed/)?([a-zA-Z0-9]+)(?:[/-]|\.html|$)', url)
    if m and 'rumble.com' in url:
        vid_id = m.group(1)
        return {
            "platform": "rumble",
            "video_id": vid_id,
            "embed_url": f"https://rumble.com/embed/{vid_id}/",
        }

    # ── Vimeo ────────────────────────────────────────────────
    # vimeo.com/VIDEO_ID
    # player.vimeo.com/video/VIDEO_ID
    m = re.search(r'vimeo\.com/(?:video/)?(\d+)', url)
    if m:
        vid_id = m.group(1)
        return {
            "platform": "vimeo",
            "video_id": vid_id,
            "embed_url": f"https://player.vimeo.com/video/{vid_id}?title=0&byline=0",
        }

    return None


def platform_label(platform: str) -> str:
    return {"youtube": "YouTube", "rumble": "Rumble", "vimeo": "Vimeo"}.get(platform, platform.title())


def platform_colour(platform: str) -> str:
    return {
        "youtube": "#ff0000",
        "rumble":  "#85c742",
        "vimeo":   "#1ab7ea",
    }.get(platform, "#00b4d8")
