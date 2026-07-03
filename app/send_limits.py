"""
Per-member daily sending protection — warm-up ramp + daily ceilings.
════════════════════════════════════════════════════════════════════
Added 3 Jul 2026 (Steve). Professional ESPs (AWeber/GetResponse class)
never let a new account blast at full volume: sending capacity is EARNED
through clean history. This module gives SuperAdPro the same invisible
protection so no single member can drain the shared SES daily quota or
torch the platform's sender reputation (which is every member's
deliverability).

Model:
  - Daily cap ramps with LIFETIME successful sends (volume-based, the
    industry-correct basis — reputation is earned by volume, not tenure):
        < 1,000 lifetime sends  ->   500 / day   (warming up)
        < 10,000                -> 2,000 / day   (established)
        10,000+                 -> 5,000 / day   (trusted)
  - Resets at midnight UTC. Counted from EmailSendLog (source of truth,
    no denormalised counter to drift).
  - Per-member overrides live in app_config key 'send_cap_overrides'
    (JSON {user_id: cap}) — Steve sets them via the tappable
    /admin/api/send-cap endpoint. cap 0 = remove override.
  - Enforced inside _check_email_allowance in main.py, which every send
    path (sequences, single sends, broadcasts, tests) already flows
    through. Sequence sends at the cap simply defer to the next cron
    tick; broadcasts send today's headroom and pause (claim-table dedupe
    makes tomorrow's re-send exactly-once).

This complements the existing reputation gate (email_sending_paused on
attributed SES complaints) and the platform SES governor. Together:
ramp (how fast), monthly allowance + credits (how many), complaint
pause (how clean).
"""
import json
import time
from datetime import datetime

from sqlalchemy import text

# (lifetime_sends_below, daily_cap, label) — order matters.
DAILY_RAMP_TIERS = [
    (1_000, 500, "Warming up"),
    (10_000, 2_000, "Established"),
    (None, 5_000, "Trusted sender"),
]

# user_id -> (expires_epoch, lifetime, sent_today, day_key)
_cache: dict = {}
_CACHE_SECS = 60


def _utc_midnight():
    now = datetime.utcnow()
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _counts(db, user_id: int):
    """(lifetime_sends, sent_today) from EmailSendLog joined through the
    member's leads. Every log row is one delivered send attempt."""
    day_key = datetime.utcnow().strftime("%Y-%m-%d")
    hit = _cache.get(user_id)
    if hit and hit[0] > time.time() and hit[3] == day_key:
        return hit[1], hit[2]
    row = db.execute(text("""
        SELECT COUNT(*) AS lifetime,
               COUNT(*) FILTER (WHERE l.sent_at >= :midnight) AS today
        FROM email_send_log l
        JOIN member_leads m ON m.id = l.lead_id
        WHERE m.user_id = :uid
    """), {"uid": user_id, "midnight": _utc_midnight()}).mappings().first()
    lifetime = int(row["lifetime"] or 0)
    today = int(row["today"] or 0)
    _cache[user_id] = (time.time() + _CACHE_SECS, lifetime, today, day_key)
    return lifetime, today


def note_sends(user_id: int, n: int):
    """Bump the cached today-count after sends so checks inside the cache
    window stay accurate (the DB rows are the durable truth)."""
    hit = _cache.get(user_id)
    if hit:
        _cache[user_id] = (hit[0], hit[1] + n, hit[2] + n, hit[3])


def _override_for(db, user_id: int):
    try:
        raw = db.execute(text(
            "SELECT value FROM app_config WHERE key = 'send_cap_overrides'"
        )).scalar()
        if raw:
            return int(json.loads(raw).get(str(user_id), 0)) or None
    except Exception:
        pass
    return None


def daily_state(db, user) -> dict:
    """Full daily-protection state for a member. Cheap (cached 60s)."""
    lifetime, today = _counts(db, user.id)
    override = _override_for(db, user.id)
    if override:
        cap, label = override, "Custom limit"
        next_tier_at = None
    else:
        cap, label, next_tier_at = DAILY_RAMP_TIERS[-1][1], DAILY_RAMP_TIERS[-1][2], None
        for threshold, tier_cap, tier_label in DAILY_RAMP_TIERS:
            if threshold is None or lifetime < threshold:
                cap, label, next_tier_at = tier_cap, tier_label, threshold
                break
    return {
        "cap": cap,
        "sent_today": today,
        "remaining": max(0, cap - today),
        "lifetime_sends": lifetime,
        "tier": label,
        "next_tier_at": next_tier_at,   # lifetime sends needed for the next tier (None at top / override)
        "resets": "midnight UTC",
    }
