"""
Lead Finder — Powered by Outscraper API
========================================

Two search modes:
- MAPS: Google Maps local businesses (restaurants, gyms, services)
- SEARCH: Google Web Search for network marketers, affiliates, etc.

Both modes enrich with email addresses via Outscraper's contact enrichment.
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from datetime import datetime
from typing import Optional
from urllib.parse import quote_plus

import httpx

logger = logging.getLogger("superadpro.lead_finder")

OUTSCRAPER_API_KEY = os.getenv("OUTSCRAPER_API_KEY", "")
OUTSCRAPER_BASE_URL = "https://api.outscraper.cloud"

_search_cache = {}
_rate_limits = {}

MAX_SEARCHES_PER_DAY = 10
CACHE_TTL_HOURS = 24
MAX_RESULTS = 20

# Country → locale/language mapping for Google Maps/Search
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


async def _outscraper_request(endpoint: str, params: dict, max_wait_seconds: int = 120) -> dict:
    """
    Make an Outscraper API request. Outscraper uses an async job pattern:
    - POST /endpoint returns a request_id
    - GET /requests/{request_id} polls for completion
    - Once status == 'Success', the data is in the response
    """
    if not OUTSCRAPER_API_KEY:
        raise ValueError("OUTSCRAPER_API_KEY not set in environment")

    headers = {"X-API-KEY": OUTSCRAPER_API_KEY}
    url = f"{OUTSCRAPER_BASE_URL}{endpoint}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Start the job
        logger.info(f"Outscraper request: {endpoint} with {params}")
        response = await client.get(url, headers=headers, params=params)

        if response.status_code == 401:
            raise ValueError("Outscraper API key invalid or account has no credits")
        if response.status_code == 402:
            raise ValueError("Outscraper account needs credits topped up")
        if response.status_code >= 400:
            logger.error(f"Outscraper error {response.status_code}: {response.text[:300]}")
            raise ValueError(f"Outscraper API error: {response.status_code}")

        data = response.json()

        # If response has data immediately
        if data.get("status") == "Success" and data.get("data"):
            return data

        # If async, poll for the result
        request_id = data.get("id")
        if not request_id:
            return data

        poll_url = f"{OUTSCRAPER_BASE_URL}/requests/{request_id}"
        elapsed = 0
        poll_interval = 3
        while elapsed < max_wait_seconds:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
            poll_resp = await client.get(poll_url, headers=headers)
            if poll_resp.status_code != 200:
                logger.warning(f"Poll failed {poll_resp.status_code}")
                continue
            poll_data = poll_resp.json()
            status = poll_data.get("status", "")
            if status == "Success":
                return poll_data
            if status in ("Failed", "Cancelled"):
                raise ValueError(f"Outscraper task {status}")

        raise TimeoutError(f"Outscraper task timed out after {max_wait_seconds}s")


async def search_maps(niche: str, location: str, locale: str = "en-GB", lang: str = "en") -> list:
    """
    Search Google Maps for local businesses.
    Returns name, address, phone, website, rating, email, category.
    """
    query = f"{niche} in {location}"

    params = {
        "query": query,
        "limit": MAX_RESULTS,
        "language": lang,
        "async": "false",
        "enrichment": "domains_service",  # Extracts emails from websites
    }

    try:
        data = await _outscraper_request("/maps/search-v3", params)
    except Exception as e:
        logger.error(f"Maps search failed: {e}")
        raise

    results = []
    raw = data.get("data", [])
    # Outscraper returns nested array: data[0] is the first query's results
    if raw and isinstance(raw[0], list):
        raw = raw[0]

    for item in raw[:MAX_RESULTS]:
        if not isinstance(item, dict):
            continue
        results.append({
            "name": item.get("name", ""),
            "address": item.get("full_address") or item.get("address", ""),
            "phone": item.get("phone", ""),
            "website": item.get("site", "") or item.get("website", ""),
            "rating": str(item.get("rating", "")) if item.get("rating") else "",
            "review_count": str(item.get("reviews", "")) if item.get("reviews") else "",
            "category": item.get("type", "") or item.get("category", ""),
            "email": _extract_email(item),
            "source": "maps",
        })

    return results


async def search_web(query: str, locale: str = "en-GB", lang: str = "en") -> list:
    """
    Search the web via Google Search for network marketers, affiliates, etc.
    Returns websites with extracted emails.
    """
    params = {
        "query": query,
        "pagesPerQuery": 2,  # 2 pages of results = ~20 sites
        "language": lang,
        "async": "false",
        "enrichment": "domains_service",
    }

    try:
        data = await _outscraper_request("/google-search-v3", params)
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        raise

    results = []
    raw = data.get("data", [])
    if raw and isinstance(raw[0], list):
        raw = raw[0]

    seen_domains = set()
    for item in raw[:MAX_RESULTS * 2]:
        if not isinstance(item, dict):
            continue
        website = item.get("link", "") or item.get("url", "")
        if not website:
            continue
        from urllib.parse import urlparse
        domain = urlparse(website).netloc.replace("www.", "")
        if domain in seen_domains:
            continue
        seen_domains.add(domain)

        email = _extract_email(item)
        # For web search, only include results that have an email
        if not email:
            continue

        results.append({
            "name": item.get("title", domain) or domain,
            "address": "",
            "phone": _extract_phone(item),
            "website": website,
            "rating": "",
            "review_count": "",
            "category": item.get("description", "")[:80] if item.get("description") else "",
            "email": email,
            "source": "web",
        })

        if len(results) >= MAX_RESULTS:
            break

    return results


def _extract_email(item: dict) -> str:
    """Extract first valid email from an Outscraper result item."""
    for key in ("email_1", "email", "emails"):
        val = item.get(key, "")
        if isinstance(val, list):
            for e in val:
                if e and "@" in str(e):
                    return str(e)
        elif val and "@" in str(val):
            return str(val)
    # Check nested emails array
    emails_arr = item.get("emails", [])
    if isinstance(emails_arr, list):
        for e in emails_arr:
            if isinstance(e, dict):
                v = e.get("value", "") or e.get("email", "")
                if v and "@" in str(v):
                    return str(v)
    return ""


def _extract_phone(item: dict) -> str:
    for key in ("phone_1", "phone", "phones"):
        val = item.get(key, "")
        if isinstance(val, list):
            for p in val:
                if p:
                    return str(p)
        elif val:
            return str(val)
    return ""


async def search_businesses(niche: str, location: str, locale: str = "en-GB", lang: str = "en", mode: str = "maps") -> list:
    """Unified entry point. mode = 'maps' or 'web'."""
    if mode == "web":
        query = niche if not location else f"{niche} {location}"
        return await search_web(query, locale=locale, lang=lang)
    return await search_maps(niche, location, locale=locale, lang=lang)
