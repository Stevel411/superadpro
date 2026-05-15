"""
member_composition — Read-only snapshot of the platform's membership cohort.

Built specifically to plan the flat-pricing migration (15 May 2026): we need to
know exactly how many members fall into each tier × billing bucket before
deciding who gets grandfathered as a founding member at $15/mo lifetime.

Use cases:
  - "How many founding spots will be left after we grandfather existing actives?"
  - "How many annual subscribers will roll onto $15/mo when their term expires?"
  - "What's the earliest activation date — i.e. who gets founding spot #1?"
  - Post-migration sanity check: "Did the right number of users get grandfathered?"

Returns aggregates only — no user IDs, no PII. The earliest/latest dates are
ISO timestamps without identifying which user they belong to.

Returns:
  by_tier:                   counts grouped by membership_tier
  by_billing:                counts grouped by membership_billing (active users only)
  by_billing_and_tier:       cross-tab of paying members
  active_count:              total is_active=True
  active_excluding_grace:    is_active=True AND not in grace period
  in_grace_period_count:     count currently in grace
  annual_expiring_next_30d:  annual subs renewing within 30 days
  annual_expiring_next_90d:  annual subs renewing within 90 days
  founding_spot_planning:    derived numbers Steve actually needs
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="member_composition",
    description=(
        "Member cohort breakdown for migration planning. Returns counts grouped "
        "by membership tier (free/basic/pro), billing cycle (monthly/annual), "
        "grace-period status, and annual-expiry windows. Built for the flat-"
        "pricing migration so we can plan grandfathering precisely. Read-only, "
        "no PII — aggregates and dates only. Use this before any pricing change "
        "and again after to verify the migration landed correctly."
    ),
    category="composition",
    input_schema={"type": "object", "properties": {}},
)
def member_composition(db):
    now = datetime.now(timezone.utc)
    in_30_days = now + timedelta(days=30)
    in_90_days = now + timedelta(days=90)

    # ── Total user count (sanity baseline) ──
    total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0

    # ── Breakdown by membership_tier (all users) ──
    tier_rows = db.execute(text("""
        SELECT membership_tier, COUNT(*) AS cnt
        FROM users
        GROUP BY membership_tier
    """)).fetchall()
    by_tier = {row.membership_tier or "null": row.cnt for row in tier_rows}
    # Ensure expected keys present even if zero
    for key in ("free", "basic", "pro"):
        by_tier.setdefault(key, 0)

    # ── Active users by billing (these are the payers) ──
    billing_rows = db.execute(text("""
        SELECT membership_billing, COUNT(*) AS cnt
        FROM users
        WHERE is_active = TRUE
        GROUP BY membership_billing
    """)).fetchall()
    by_billing = {row.membership_billing or "null": row.cnt for row in billing_rows}
    for key in ("monthly", "annual"):
        by_billing.setdefault(key, 0)

    # ── Cross-tab: tier × billing for active payers ──
    # This is the key data — tells us exactly how many fall into each bucket
    # that needs different grandfathering treatment.
    crosstab_rows = db.execute(text("""
        SELECT membership_tier, membership_billing, COUNT(*) AS cnt
        FROM users
        WHERE is_active = TRUE
        GROUP BY membership_tier, membership_billing
    """)).fetchall()
    by_billing_and_tier = {}
    for row in crosstab_rows:
        key = f"{row.membership_tier or 'null'}_{row.membership_billing or 'null'}"
        by_billing_and_tier[key] = row.cnt
    # Ensure expected keys present
    for key in ("basic_monthly", "basic_annual", "pro_monthly", "pro_annual"):
        by_billing_and_tier.setdefault(key, 0)

    # ── Active counts (with and without grace period filter) ──
    active_count = db.execute(text(
        "SELECT COUNT(*) FROM users WHERE is_active = TRUE"
    )).scalar() or 0

    in_grace_count = db.execute(text("""
        SELECT COUNT(*) FROM membership_renewals mr
        JOIN users u ON u.id = mr.user_id
        WHERE u.is_active = TRUE AND mr.in_grace_period = TRUE
    """)).scalar() or 0

    active_excluding_grace = active_count - in_grace_count

    # ── Annual subscribers expiring within X days ──
    # Useful for predicting when grandfathered annual subscribers will roll
    # over to $15/mo monthly billing. Helps plan cash flow.
    expiring_30d = db.execute(text("""
        SELECT COUNT(*) FROM users
        WHERE is_active = TRUE
          AND membership_billing = 'annual'
          AND membership_expires_at IS NOT NULL
          AND membership_expires_at <= :cutoff
          AND membership_expires_at >= NOW()
    """), {"cutoff": in_30_days}).scalar() or 0

    expiring_90d = db.execute(text("""
        SELECT COUNT(*) FROM users
        WHERE is_active = TRUE
          AND membership_billing = 'annual'
          AND membership_expires_at IS NOT NULL
          AND membership_expires_at <= :cutoff
          AND membership_expires_at >= NOW()
    """), {"cutoff": in_90_days}).scalar() or 0

    # ── Activation date range for founding spot numbering ──
    # Earliest active member gets spot #1, etc. We surface the date range so
    # Steve can see how far back the grandfather cohort reaches.
    earliest_row = db.execute(text("""
        SELECT MIN(activated_at) AS earliest, MAX(activated_at) AS latest
        FROM users
        WHERE is_active = TRUE AND activated_at IS NOT NULL
    """)).fetchone()

    earliest_active = earliest_row.earliest.isoformat() if earliest_row and earliest_row.earliest else None
    latest_active = earliest_row.latest.isoformat() if earliest_row and earliest_row.latest else None

    # ── Founding spot planning maths ──
    # The number Steve actually wants: "how many founding spots are left after
    # I grandfather existing actives?"
    # Policy locked: ALL currently-active members (excluding grace) become
    # founding members 1..N. The rest of the 100 spots open to new signups.
    FOUNDING_TOTAL = 100
    spots_used_by_grandfathering = min(active_excluding_grace, FOUNDING_TOTAL)
    spots_remaining_for_new_signups = max(0, FOUNDING_TOTAL - spots_used_by_grandfathering)
    overflow_actives = max(0, active_excluding_grace - FOUNDING_TOTAL)

    return {
        "timestamp": now.isoformat(),
        "total_users": total_users,
        "by_tier": by_tier,
        "by_billing": by_billing,
        "by_billing_and_tier": by_billing_and_tier,
        "active_count": active_count,
        "active_excluding_grace": active_excluding_grace,
        "in_grace_period_count": in_grace_count,
        "annual_expiring_next_30d": expiring_30d,
        "annual_expiring_next_90d": expiring_90d,
        "earliest_active_activation": earliest_active,
        "latest_active_activation": latest_active,
        "founding_spot_planning": {
            "total_spots": FOUNDING_TOTAL,
            "spots_used_by_grandfathering": spots_used_by_grandfathering,
            "spots_remaining_for_new_signups": spots_remaining_for_new_signups,
            "overflow_actives_no_founding_status": overflow_actives,
        },
    }
