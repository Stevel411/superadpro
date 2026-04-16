"""
Lead Finder — Powered by Outscraper API (direct HTTP calls)
============================================================

Two search modes:
- MAPS: Google Maps local businesses
- SEARCH: Google Web Search for network marketers, affiliates, etc.
"""

import asyncio
import hashlib
import logging
import os
import re
import time
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse

import httpx

logger = logging.getLogger("superadpro.lead_finder")

OUTSCRAPER_API_KEY = os.getenv("OUTSCRAPER_API_KEY", "")
OUTSCRAPER_BASE = "https://api.app.outscraper.com"

_search_cache = {}
_rate_limits = {}

MAX_SEARCHES_PER_DAY = 10
CACHE_TTL_HOURS = 24
MAX_RESULTS = 20

COUNTRY_LOCALE_MAP = {
    "GB": ("en-GB", "en"), "UK": ("en-GB", "en"), "IE": ("en-IE", "en"),
    "FR": ("fr-FR", "fr"), "DE": ("de-DE", "de"), "ES": ("es-ES", "es"),
    "IT": ("it-IT", "it"), "PT": ("pt-PT", "pt"), "NL": ("nl-NL", "nl"),
    "BE": ("fr-BE", "fr"), "CH": ("de-CH", "de"), "AT": ("de-AT", "de"),
    "PL": ("pl-PL", "pl"), "SE": ("sv-SE", "sv"), "NO": ("nb-NO", "no"),
    "DK": ("da-DK", "da"), "FI": ("fi-FI", "fi"), "RU": ("ru-RU", "ru"),
    "TR": ("tr-TR", "tr"), "GR": ("el-GR", "el"), "CZ": ("cs-CZ", "cs"),
    "HU": ("hu-HU", "hu"), "RO": ("ro-RO", "ro"),
    "US": ("en-US", "en"), "CA": ("en-CA", "en"),
    "MX": ("es-MX", "es"), "BR": ("pt-BR", "pt"), "AR": ("es-AR", "es"),
    "CL": ("es-CL", "es"), "CO": ("es-CO", "es"), "PE": ("es-PE", "es"),
    "CN": ("zh-CN", "zh"), "JP": ("ja-JP", "ja"), "KR": ("ko-KR", "ko"),
    "IN": ("en-IN", "en"), "TH": ("th-TH", "th"), "VN": ("vi-VN", "vi"),
    "ID": ("id-ID", "id"), "PH": ("en-PH", "en"), "MY": ("ms-MY", "ms"),
    "SG": ("en-SG", "en"), "HK": ("zh-HK", "zh"), "TW": ("zh-TW", "zh"),
    "AE": ("ar-AE", "ar"), "SA": ("ar-SA", "ar"), "EG": ("ar-EG", "ar"),
    "IL": ("he-IL", "iw"), "ZA": ("en-ZA", "en"), "NG": ("en-NG", "en"),
    "KE": ("en-KE", "en"), "GH": ("en-GH", "en"),
    "AU": ("en-AU", "en"), "NZ": ("en-NZ", "en"),
}


def get_locale_for_country(country_code: str) -> tuple:
    if not country_code:
        return ("en-GB", "en")
    return COUNTRY_LOCALE_MAP.get(country_code.upper(), ("en-GB", "en"))


def _cache_key(mode: str, query: str, location: str = "") -> str:
    raw = f"{mode}|{query.lower().strip()}|{location.lower().strip()}"
    return hashlib.md5(raw.encode()).hexdigest()


def _check_rate_limit(user_id: int) -> tuple[bool, int]:
    today = datetime.utcnow().strftime("%Y-%m-%d")
    entry = _rate_limits.get(user_id)
    if not entry or entry["date"] != today:
        _rate_limits[user_id] = {"date": today, "count": 0}
        return True, MAX_SEARCHES_PER_DAY
    if entry["count"] >= MAX_SEARCHES_PER_DAY:
        return False, 0
    return True, MAX_SEARCHES_PER_DAY - entry["count"]


def _increment_rate_limit(user_id: int):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    entry = _rate_limits.get(user_id)
    if not entry or entry["date"] != today:
        _rate_limits[user_id] = {"date": today, "count": 1}
    else:
        entry["count"] += 1


def _get_cached(mode: str, query: str, location: str = "") -> Optional[list]:
    key = _cache_key(mode, query, location)
    entry = _search_cache.get(key)
    if entry and time.time() < entry["expires"]:
        logger.info(f"Lead Finder cache HIT: {mode} {query} {location}")
        return entry["results"]
    return None


def _set_cache(mode: str, query: str, location: str, results: list):
    key = _cache_key(mode, query, location)
    _search_cache[key] = {
        "results": results,
        "expires": time.time() + (CACHE_TTL_HOURS * 3600)
    }


def _get_headers():
    if not OUTSCRAPER_API_KEY:
        raise ValueError("OUTSCRAPER_API_KEY environment variable not set")
    return {"X-API-KEY": OUTSCRAPER_API_KEY, "Accept": "application/json"}


def _extract_email(item: dict) -> str:
    """Try multiple fields to find an email in the result."""
    if not isinstance(item, dict):
        return ""
    for key in ("email_1", "email"):
        val = item.get(key)
        if val and isinstance(val, str) and "@" in val:
            return val
    emails = item.get("emails")
    if isinstance(emails, list):
        for e in emails:
            if isinstance(e, str) and "@" in e:
                return e
            if isinstance(e, dict):
                v = e.get("value") or e.get("email")
                if v and "@" in str(v):
                    return str(v)
    for key in item.keys():
        if "email" in key.lower() and "validator" not in key.lower():
            val = item.get(key)
            if val and isinstance(val, str) and "@" in val:
                return val
    return ""


def _extract_phone(item: dict) -> str:
    if not isinstance(item, dict):
        return ""
    for key in ("phone", "phone_1"):
        val = item.get(key)
        if val:
            return str(val)
    phones = item.get("phones")
    if isinstance(phones, list) and phones:
        return str(phones[0])
    return ""


async def _api_get(client: httpx.AsyncClient, path: str, params: dict, max_retries: int = 5) -> dict:
    """Call Outscraper API with retry on 503 / network errors (Railway + Outscraper both flaky)."""
    last_error = None
    for attempt in range(max_retries):
        try:
            resp = await client.get(
                f"{OUTSCRAPER_BASE}{path}",
                headers=_get_headers(),
                params=params,
            )
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 402:
                raise ValueError("Outscraper account needs credits — please top up")
            if resp.status_code == 401:
                raise ValueError("Outscraper API key invalid")
            if resp.status_code == 503:
                last_error = f"503 service unavailable (attempt {attempt+1}/{max_retries})"
                logger.warning(f"[Outscraper] 503, retrying in {2 + attempt*2}s (attempt {attempt+1}/{max_retries})")
                await asyncio.sleep(2 + attempt * 2)  # 2s, 4s, 6s, 8s, 10s
                continue
            # Other errors — don't retry
            logger.error(f"[Outscraper] Status {resp.status_code}: {resp.text[:300]}")
            raise ValueError(f"Outscraper returned status {resp.status_code}")
        except httpx.RequestError as e:
            last_error = f"{type(e).__name__}: {e}"
            logger.warning(f"[Outscraper] Network error (attempt {attempt+1}/{max_retries}): {e}")
            await asyncio.sleep(2 + attempt * 2)
            continue
    raise ValueError(f"Search service temporarily unavailable. Please try again. ({last_error})")


async def _poll_task(client: httpx.AsyncClient, request_id: str, max_wait: int = 90) -> dict:
    """Poll an async task until complete."""
    poll_url = f"{OUTSCRAPER_BASE}/requests/{request_id}"
    elapsed = 0
    interval = 3
    while elapsed < max_wait:
        await asyncio.sleep(interval)
        elapsed += interval
        try:
            resp = await client.get(poll_url, headers=_get_headers(), timeout=20.0)
            if resp.status_code != 200:
                continue
            d = resp.json()
            status = d.get("status", "")
            if status == "Success":
                return d
            if status in ("Failed", "Cancelled"):
                raise ValueError(f"Outscraper task {status}")
        except httpx.RequestError:
            continue
    raise TimeoutError(f"Outscraper task timed out after {max_wait}s")


async def search_maps(niche: str, location: str, lang: str = "en", region: str = None) -> list:
    """Search Google Maps via Outscraper API."""
    query = f"{niche}, {location}" if location else niche
    
    params = {
        "query": query,
        "limit": MAX_RESULTS,
        "language": lang,
        "async": "false",
        "enrichment": "domains_service",  # Adds emails from websites
    }
    # NOTE: region parameter causes Outscraper's server to return
    # "DNS cache overflow" — locale is embedded in query text instead
    
    logger.info(f"[Outscraper] Maps: {query}")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        data = await _api_get(client, "/maps/search-v3", params)
        
        # Handle async response — poll until done
        if data.get("status") == "Pending" and data.get("id"):
            data = await _poll_task(client, data["id"])
    
    # Parse the results - data.data is array of query-result arrays
    raw = data.get("data", [])
    if raw and isinstance(raw[0], list):
        places = raw[0]
    elif raw and isinstance(raw[0], dict):
        places = raw
    else:
        places = []
    
    logger.info(f"[Outscraper] Maps got {len(places)} places")
    
    output = []
    for item in places[:MAX_RESULTS]:
        if not isinstance(item, dict):
            continue
        output.append({
            "name": item.get("name", "") or "",
            "address": item.get("full_address") or item.get("address") or "",
            "phone": _extract_phone(item),
            "website": item.get("site") or item.get("website") or "",
            "rating": str(item.get("rating", "")) if item.get("rating") else "",
            "review_count": str(item.get("reviews", "")) if item.get("reviews") else "",
            "category": item.get("type") or item.get("category") or "",
            "email": _extract_email(item),
            "source": "maps",
        })
    return output


async def search_web(query: str, lang: str = "en", region: str = None) -> list:
    """Search Google (web) via Outscraper, then enrich with emails."""
    params = {
        "query": query,
        "pagesPerQuery": 2,
        "language": lang,
        "async": "false",
    }
    # NOTE: region parameter causes Outscraper server errors
    
    logger.info(f"[Outscraper] Web: {query}")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        data = await _api_get(client, "/google-search-v3", params)
        if data.get("status") == "Pending" and data.get("id"):
            data = await _poll_task(client, data["id"])
        
        # Extract search results — Outscraper returns 'organic_results' field
        raw = data.get("data", [])
        organic = []
        if raw and isinstance(raw[0], dict):
            organic = raw[0].get("organic_results") or raw[0].get("organic") or raw[0].get("results") or []
        elif raw and isinstance(raw[0], list):
            organic = raw[0]
        
        logger.info(f"[Outscraper] Web got {len(organic)} search results")
        
        # Collect unique non-social domains
        sites = []
        seen = set()
        skip_domains = ("facebook.com", "instagram.com", "twitter.com", "x.com",
                        "linkedin.com", "youtube.com", "wikipedia.org", "reddit.com",
                        "pinterest.com", "tiktok.com", "google.com", "amazon.com",
                        "trustpilot.com", "glassdoor.com", "indeed.com", "yelp.com")
        
        for item in organic:
            if not isinstance(item, dict):
                continue
            url = item.get("link") or item.get("url") or ""
            if not url or not url.startswith("http"):
                continue
            domain = urlparse(url).netloc.replace("www.", "").lower()
            if not domain or domain in seen:
                continue
            if any(s in domain for s in skip_domains):
                continue
            seen.add(domain)
            sites.append({
                "domain": domain,
                "url": url,
                "title": item.get("title") or domain,
                "description": item.get("description") or item.get("snippet") or "",
            })
            if len(sites) >= MAX_RESULTS:
                break
        
        if not sites:
            return []
        
        # Enrich: fetch emails/contacts for these domains
        logger.info(f"[Outscraper] Enriching {len(sites)} domains")
        enrich_params = {
            "query": [s["domain"] for s in sites],
            "async": "false",
        }
        try:
            ed = await _api_get(client, "/emails-and-contacts", enrich_params)
            if ed.get("status") == "Pending" and ed.get("id"):
                ed = await _poll_task(client, ed["id"])
            enrichment = ed.get("data", [])
        except Exception as e:
            logger.warning(f"[Outscraper] Enrichment failed: {e}")
            enrichment = []
    
    # Map domain → contact data
    contact_map = {}
    if isinstance(enrichment, list):
        for entry in enrichment:
            if isinstance(entry, dict):
                dom = (entry.get("domain") or entry.get("query") or "").replace("www.", "").lower()
                if dom:
                    contact_map[dom] = entry
    
    # Build final results — include sites with emails (or return all if no emails found)
    output = []
    for site in sites:
        contact = contact_map.get(site["domain"], {})
        email = _extract_email(contact)
        if not email:
            continue
        output.append({
            "name": site["title"] or site["domain"],
            "address": "",
            "phone": _extract_phone(contact),
            "website": site["url"],
            "rating": "",
            "review_count": "",
            "category": (site["description"] or "")[:100],
            "email": email,
            "source": "web",
        })
    
    logger.info(f"[Outscraper] Web final results: {len(output)}")
    return output


async def search_businesses(niche: str, location: str, locale: str = "en-GB", lang: str = "en", mode: str = "maps") -> list:
    """Unified entry point. mode = 'maps' or 'web'."""
    region = locale.split("-")[-1] if "-" in locale else None
    if mode == "web":
        query = f"{niche} {location}".strip() if location else niche
        return await search_web(query, lang=lang, region=region)
    return await search_maps(niche, location, lang=lang, region=region)
