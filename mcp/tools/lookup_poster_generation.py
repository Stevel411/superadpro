"""
lookup_poster_generation — full state of a specific BPG generation.

Returns the stored candidate URLs, status, age, and a probe of whether
each candidate URL is still fetchable (xAI imgen.x.ai URLs expire after
24-48 hours; once expired, the proxied /api/posters/.../image endpoint
returns 410 Gone and the browser shows a broken image).

Built 15 May 2026 evening after Steve flagged poster result page for
generation 5 showing broken images. The proxy fix shipped earlier in
the session works correctly for new generations, but old generations
whose xAI URLs have expired need to be identified so they can be
either regenerated or flagged in the UI.
"""
import json
import urllib.request
import urllib.error
import os
from datetime import datetime, timezone
from sqlalchemy import text
from .registry import register_tool


def _probe_url(url: str, timeout: int = 8) -> dict:
    """HEAD-like probe of a poster image URL. Returns dict with
    {status_code, content_type, content_length, error}.
    Sends the xAI Bearer auth recipe if it looks like an xAI URL —
    same as the production _bpg_fetch_xai_image helper.
    """
    if not url:
        return {"status_code": None, "error": "empty_url"}
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; SuperAdPro-MCP/1.0)",
            "Accept": "image/*,*/*;q=0.8",
        }
        if "imgen.x.ai" in url or "x.ai" in url:
            xai_key = os.environ.get("XAI_API_KEY", "").strip()
            if xai_key:
                headers["Authorization"] = f"Bearer {xai_key}"
        req = urllib.request.Request(url, headers=headers, method="GET")
        # Use GET with Range: bytes=0-0 instead of HEAD — some image hosts
        # respond differently to HEAD. Single byte is enough to confirm
        # the URL is fetchable.
        req.add_header("Range", "bytes=0-0")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return {
                "status_code": resp.status,
                "content_type": resp.headers.get("Content-Type"),
                "content_length": resp.headers.get("Content-Length"),
                "fetchable": True,
            }
    except urllib.error.HTTPError as e:
        return {
            "status_code": e.code,
            "error": f"HTTPError {e.code}",
            "fetchable": False,
        }
    except urllib.error.URLError as e:
        return {
            "status_code": None,
            "error": f"URLError: {e.reason}",
            "fetchable": False,
        }
    except Exception as e:
        return {
            "status_code": None,
            "error": f"{type(e).__name__}: {e}",
            "fetchable": False,
        }


@register_tool(
    name="lookup_poster_generation",
    description=(
        "Look up a specific Brand Poster Generator generation by ID. Returns "
        "the generation's status, template, owner, stored candidate URLs, "
        "chosen index/URL, and a live probe of each candidate URL to see if "
        "it's still fetchable (HTTP 200) or expired (HTTP 4xx). Use this to "
        "diagnose 'why is my poster result page showing broken images' — "
        "expired xAI URLs (>24-48h old) are the most common cause."
    ),
    category="diagnostic",
    input_schema={
        "type": "object",
        "properties": {
            "generation_id": {
                "type": "integer",
                "description": "Numeric ID of the poster generation (the {id} in /brand-posters/result/{id})",
            },
            "probe_urls": {
                "type": "boolean",
                "description": "If true (default), probe each candidate URL with a 1-byte GET to check if it's still fetchable. Set to false to skip network calls.",
                "default": True,
            },
        },
        "required": ["generation_id"],
    },
)
def lookup_poster_generation(db, generation_id: int = 0, probe_urls: bool = True):
    if not generation_id:
        return {"error": "generation_id required"}

    row = db.execute(text("""
        SELECT pg.id, pg.user_id, pg.template_id, pg.status,
               pg.candidate_urls, pg.chosen_index, pg.chosen_url,
               pg.error_message, pg.credits_charged,
               pg.created_at, pg.completed_at,
               u.username, u.email,
               pt.slug AS template_slug, pt.name AS template_name
        FROM poster_generations pg
        JOIN users u ON u.id = pg.user_id
        LEFT JOIN poster_templates pt ON pt.id = pg.template_id
        WHERE pg.id = :gid
        LIMIT 1
    """), {"gid": generation_id}).fetchone()

    if not row:
        return {"error": f"No poster generation with id {generation_id}"}

    try:
        candidates_raw = json.loads(row.candidate_urls) if row.candidate_urls else []
    except Exception as e:
        candidates_raw = []
        parse_error = str(e)
    else:
        parse_error = None

    age_seconds = None
    age_hours = None
    if row.created_at:
        now = datetime.utcnow()
        delta = (now - row.created_at).total_seconds()
        age_seconds = int(delta)
        age_hours = round(delta / 3600, 2)

    # Probe each candidate URL
    probes = []
    if probe_urls:
        for idx, url in enumerate(candidates_raw):
            probe = _probe_url(url) if url else {"error": "empty_url"}
            probes.append({
                "index": idx,
                "url": url,
                "url_host": (url.split("/")[2] if url and "://" in url else None),
                "probe": probe,
            })
    else:
        probes = [{"index": i, "url": u, "probe": None} for i, u in enumerate(candidates_raw)]

    # Summary
    fetchable_count = sum(1 for p in probes if p.get("probe", {}) and p["probe"].get("fetchable"))
    expired_likely = bool(probe_urls) and fetchable_count == 0 and len(candidates_raw) > 0

    return {
        "generation": {
            "id": row.id,
            "user_id": row.user_id,
            "owner_username": row.username,
            "owner_email": row.email,
            "template_id": row.template_id,
            "template_slug": row.template_slug,
            "template_name": row.template_name,
            "status": row.status,
            "chosen_index": row.chosen_index,
            "chosen_url": row.chosen_url,
            "error_message": row.error_message,
            "credits_charged": row.credits_charged,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "completed_at": row.completed_at.isoformat() if row.completed_at else None,
            "age_seconds": age_seconds,
            "age_hours": age_hours,
        },
        "candidates": {
            "stored_count": len(candidates_raw),
            "parse_error": parse_error,
            "probed": probes,
            "fetchable_count": fetchable_count if probe_urls else None,
            "expired_likely": expired_likely,
        },
        "diagnosis": (
            "All candidate URLs unfetchable — almost certainly expired. "
            "xAI imgen.x.ai URLs expire after 24-48 hours. The proxy "
            "endpoint will return 410 Gone, browser shows broken images. "
            "Recommend regenerating the poster set."
            if expired_likely
            else (
                f"{fetchable_count}/{len(candidates_raw)} candidates fetchable"
                if probe_urls else "URL probing skipped"
            )
        ),
    }
