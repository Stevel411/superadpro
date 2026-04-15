"""
Lead Finder — Google Maps Business Scraper
============================================
Scrapes publicly available business data from Google Maps
using Playwright (headless browser). Zero API cost.

Features:
- Search by niche + location
- Extracts: name, address, phone, website, rating, category
- Email extraction from business websites
- 24-hour result caching per query
- Rate limiting per user (10 searches/day for Pro)

Usage:
    results = await search_businesses("personal trainers", "Manchester UK")
"""

import asyncio
import hashlib
import json
import logging
import re
import time
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import quote_plus, urlparse

logger = logging.getLogger("superadpro.lead_finder")

# In-memory cache: { query_hash: { "results": [...], "expires": timestamp } }
_search_cache = {}

# Rate limiting: { user_id: { "date": "YYYY-MM-DD", "count": int } }
_rate_limits = {}

MAX_SEARCHES_PER_DAY = 10
CACHE_TTL_HOURS = 24
MAX_RESULTS = 20


def _cache_key(niche: str, location: str) -> str:
    raw = f"{niche.lower().strip()}|{location.lower().strip()}"
    return hashlib.md5(raw.encode()).hexdigest()


def _check_rate_limit(user_id: int) -> tuple[bool, int]:
    """Returns (allowed, remaining_searches)."""
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


def _get_cached(niche: str, location: str) -> Optional[list]:
    key = _cache_key(niche, location)
    entry = _search_cache.get(key)
    if entry and time.time() < entry["expires"]:
        logger.info(f"Lead Finder cache HIT: {niche} in {location}")
        return entry["results"]
    return None


def _set_cache(niche: str, location: str, results: list):
    key = _cache_key(niche, location)
    _search_cache[key] = {
        "results": results,
        "expires": time.time() + (CACHE_TTL_HOURS * 3600)
    }


async def search_businesses(niche: str, location: str) -> list:
    """
    Search Google Maps for businesses matching niche + location.
    Returns list of dicts with business details.
    """
    from playwright.async_api import async_playwright

    query = f"{niche} in {location}"
    url = f"https://www.google.com/maps/search/{quote_plus(query)}"

    results = []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 900},
                locale="en-GB",
            )
            page = await context.new_page()

            # Accept cookies if prompted
            page.set_default_timeout(15000)

            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)

            # Try to dismiss cookie consent
            try:
                accept_btn = page.locator("button:has-text('Accept all')")
                if await accept_btn.count() > 0:
                    await accept_btn.first.click()
                    await page.wait_for_timeout(1000)
            except Exception:
                pass

            # Wait for results to load
            await page.wait_for_timeout(3000)

            # Scroll the results panel to load more
            feed = page.locator('[role="feed"]')
            if await feed.count() > 0:
                for _ in range(3):
                    await feed.evaluate("el => el.scrollTop = el.scrollHeight")
                    await page.wait_for_timeout(1500)

            # Extract business links
            links = await page.locator('a[href*="/maps/place/"]').all()
            seen_names = set()

            for link in links[:MAX_RESULTS * 2]:
                try:
                    aria = await link.get_attribute("aria-label")
                    if not aria or aria in seen_names:
                        continue
                    seen_names.add(aria)

                    href = await link.get_attribute("href")
                    if not href or "/maps/place/" not in href:
                        continue

                    results.append({
                        "name": aria,
                        "href": href,
                    })

                    if len(results) >= MAX_RESULTS:
                        break
                except Exception:
                    continue

            # Now visit each business page to get details
            detailed = []
            for biz in results[:MAX_RESULTS]:
                try:
                    await page.goto(biz["href"], wait_until="domcontentloaded")
                    await page.wait_for_timeout(2000)

                    detail = {
                        "name": biz["name"],
                        "address": "",
                        "phone": "",
                        "website": "",
                        "rating": "",
                        "review_count": "",
                        "category": "",
                        "email": "",
                    }

                    # Extract address
                    try:
                        addr_el = page.locator('[data-item-id="address"] .fontBodyMedium')
                        if await addr_el.count() > 0:
                            detail["address"] = (await addr_el.first.text_content()).strip()
                    except Exception:
                        pass

                    # Try alternate address selector
                    if not detail["address"]:
                        try:
                            addr_btn = page.locator('button[data-item-id="address"]')
                            if await addr_btn.count() > 0:
                                detail["address"] = (await addr_btn.first.get_attribute("aria-label") or "").replace("Address: ", "")
                        except Exception:
                            pass

                    # Extract phone
                    try:
                        phone_btn = page.locator('button[data-item-id^="phone:"]')
                        if await phone_btn.count() > 0:
                            phone_label = await phone_btn.first.get_attribute("aria-label") or ""
                            detail["phone"] = phone_label.replace("Phone: ", "").strip()
                    except Exception:
                        pass

                    # Extract website
                    try:
                        web_link = page.locator('a[data-item-id="authority"]')
                        if await web_link.count() > 0:
                            detail["website"] = (await web_link.first.get_attribute("href") or "").strip()
                    except Exception:
                        pass

                    # Extract rating
                    try:
                        rating_el = page.locator('div.fontDisplayLarge')
                        if await rating_el.count() > 0:
                            detail["rating"] = (await rating_el.first.text_content()).strip()
                    except Exception:
                        pass

                    # Extract review count
                    try:
                        review_el = page.locator('button[jsaction*="review"] span span')
                        if await review_el.count() > 0:
                            rc = (await review_el.first.text_content()).strip()
                            detail["review_count"] = re.sub(r"[^\d]", "", rc)
                    except Exception:
                        pass

                    # Extract category
                    try:
                        cat_btn = page.locator('button[jsaction*="category"]')
                        if await cat_btn.count() > 0:
                            detail["category"] = (await cat_btn.first.text_content()).strip()
                    except Exception:
                        pass

                    detailed.append(detail)
                    logger.info(f"  Scraped: {detail['name']} | {detail['phone']} | {detail['website']}")

                except Exception as e:
                    logger.warning(f"  Failed to scrape {biz['name']}: {e}")
                    detailed.append({
                        "name": biz["name"],
                        "address": "", "phone": "", "website": "",
                        "rating": "", "review_count": "", "category": "", "email": "",
                    })

            await browser.close()

            # Try to extract emails from websites
            detailed = await _enrich_emails(detailed)

            return detailed

    except Exception as e:
        logger.error(f"Lead Finder search error: {e}")
        return []


async def _enrich_emails(businesses: list) -> list:
    """Visit business websites to find email addresses."""
    from playwright.async_api import async_playwright

    sites_to_check = [(i, b) for i, b in enumerate(businesses) if b.get("website")]
    if not sites_to_check:
        return businesses

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                viewport={"width": 1280, "height": 900},
            )

            for idx, biz in sites_to_check[:10]:  # Limit to 10 website checks
                try:
                    page = await context.new_page()
                    page.set_default_timeout(8000)
                    website = biz["website"]
                    if not website.startswith("http"):
                        website = "https://" + website

                    await page.goto(website, wait_until="domcontentloaded")
                    await page.wait_for_timeout(1500)

                    # Get page content and search for emails
                    content = await page.content()
                    emails = re.findall(
                        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                        content
                    )

                    # Filter out common junk emails
                    junk = {'example.com', 'domain.com', 'email.com', 'yoursite.com',
                            'sentry.io', 'wixpress.com', 'w3.org', 'schema.org',
                            'googlemail.com', 'test.com'}
                    valid_emails = [e for e in emails if not any(j in e.lower() for j in junk)]

                    if valid_emails:
                        businesses[idx]["email"] = valid_emails[0]
                        logger.info(f"  Email found for {biz['name']}: {valid_emails[0]}")

                    await page.close()
                except Exception as e:
                    logger.debug(f"  Email scrape failed for {biz.get('website')}: {e}")
                    try:
                        await page.close()
                    except Exception:
                        pass

            await browser.close()
    except Exception as e:
        logger.warning(f"Email enrichment error: {e}")

    return businesses
