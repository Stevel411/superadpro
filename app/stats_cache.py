"""
Dashboard & Analytics Stats Cache
==================================
In-memory cache with TTL for expensive aggregation queries.
Prevents recalculating SUM/COUNT on every page load.

Cache strategy:
- Dashboard stats: 60s TTL (refreshed on commission events)
- Leaderboard: 300s TTL (5 minutes)
- Analytics: 120s TTL (2 minutes)

At 10,000+ members, replace with Redis.
"""

import time
import logging
from typing import Any, Optional

logger = logging.getLogger("superadpro.cache")

# In-memory cache store: { key: (value, expires_at) }
_cache = {}


def cache_get(key: str) -> Optional[Any]:
    """Get a cached value. Returns None if expired or missing."""
    entry = _cache.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if time.time() > expires_at:
        del _cache[key]
        return None
    return value


def cache_set(key: str, value: Any, ttl: int = 60):
    """Set a cache value with TTL in seconds."""
    _cache[key] = (value, time.time() + ttl)


def cache_delete(key: str):
    """Delete a specific cache entry."""
    _cache.pop(key, None)


def cache_invalidate_user(user_id: int):
    """Invalidate all cached data for a specific user.
    Called when commissions are created, grids update, etc."""
    keys_to_delete = [k for k in _cache if k.startswith(f"dash:{user_id}:") or k.startswith(f"analytics:{user_id}:")]
    for k in keys_to_delete:
        del _cache[k]
    logger.debug(f"Cache invalidated for user {user_id}: {len(keys_to_delete)} keys")


def cache_invalidate_leaderboard():
    """Invalidate leaderboard cache."""
    keys_to_delete = [k for k in _cache if k.startswith("leaderboard:")]
    for k in keys_to_delete:
        del _cache[k]


def cache_stats():
    """Return cache statistics for monitoring."""
    now = time.time()
    total = len(_cache)
    expired = sum(1 for _, (_, exp) in _cache.items() if now > exp)
    return {"total_keys": total, "expired": expired, "active": total - expired}
