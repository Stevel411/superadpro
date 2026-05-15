"""
member_composition — Read-only snapshot of the platform's membership cohort.

Built specifically to plan the flat-pricing migration (15 May 2026): we need to
know exactly how many members fall into each tier × billing bucket before
deciding who gets grandfathered as a founding member at $15/mo lifetime.

ALSO classifies active members by whether they paid REAL MONEY or were
manually activated by admin / activated via referral gift. The grandfathering
rule should reward actual paying customers, not comped accounts.

Classification rules (per active user):
  - "paid_real_money" if ANY of:
      * Has at least one confirmed payments row (status in paid/confirmed/finished)
      * Has at least one nowpayments_orders row with status='finished' or confirmed_at
      * Has at least one walletconnect_payment_orders row with status='confirmed'
      * Has membership_renewals with renewal_source IN ('wallet', 'auto_renew_from_balance')
        AND total_renewals > 0 (they actually renewed from real money)
  - "manual_activation" if active but no payment record found and:
      * membership_renewals.renewal_source = 'manual', OR
      * No membership_renewals row at all (admin-flipped is_active directly)
  - "referral_gift_only" if active and:
      * membership_activated_by_referral = TRUE
      * AND no other payment evidence (gift was their only "payment")

Returns aggregates only — no user IDs, no PII. The earliest/latest dates are
ISO timestamps without identifying which user they belong to.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="member_composition",
    description=(
        "Member cohort breakdown for migration planning. Returns counts grouped "
        "by membership tier (free/basic/pro), billing cycle (monthly/annual), "
        "grace-period status, annual-expiry windows, AND classification by "
        "whether each active member paid real money or was comped via admin "
        "activation / referral gift. Built for the flat-pricing migration so we "
        "can grandfather only genuine paying customers. Read-only, no PII — "
        "aggregates and dates only."
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

    # ── Annual subscribers expiring soon ──
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
    earliest_row = db.execute(text("""
        SELECT MIN(activated_at) AS earliest, MAX(activated_at) AS latest
        FROM users
        WHERE is_active = TRUE AND activated_at IS NOT NULL
    """)).fetchone()

    earliest_active = earliest_row.earliest.isoformat() if earliest_row and earliest_row.earliest else None
    latest_active = earliest_row.latest.isoformat() if earliest_row and earliest_row.latest else None

    # ── Edge-case user IDs needing review ──
    # We surface user IDs (no PII otherwise) for migration edge cases so admin
    # can investigate before the migration runs. Each subset is a state that
    # the migration must handle specially.
    paid_no_expiry_users = db.execute(text("""
        SELECT u.id, u.username, u.activated_at::text AS activated_at,
               u.membership_tier, u.is_admin
        FROM users u
        WHERE u.is_active = TRUE
          AND u.membership_expires_at IS NULL
          AND (
            EXISTS (
              SELECT 1 FROM payments p
              WHERE p.from_user_id = u.id
                AND p.status IN ('paid', 'confirmed', 'finished', 'completed')
            )
            OR EXISTS (
              SELECT 1 FROM nowpayments_orders npo
              WHERE npo.user_id = u.id
                AND (npo.status = 'finished' OR npo.confirmed_at IS NOT NULL)
            )
            OR EXISTS (
              SELECT 1 FROM walletconnect_payment_orders wco
              WHERE wco.user_id = u.id
                AND wco.status = 'confirmed'
            )
          )
    """)).fetchall()
    paid_no_expiry = [
        {
            "user_id": r.id,
            "username": r.username,
            "activated_at": r.activated_at,
            "membership_tier": r.membership_tier,
            "is_admin": r.is_admin,
        }
        for r in paid_no_expiry_users
    ]

    # Far-future expiry users (Steve's perma-comped admin/founder account fits here)
    far_future_users = db.execute(text("""
        SELECT u.id, u.username, u.is_admin,
               u.membership_expires_at::text AS expires_at
        FROM users u
        WHERE u.is_active = TRUE
          AND u.membership_expires_at > NOW() + INTERVAL '1100 days'
    """)).fetchall()
    far_future_active = [
        {
            "user_id": r.id,
            "username": r.username,
            "is_admin": r.is_admin,
            "expires_at": r.expires_at,
        }
        for r in far_future_users
    ]

    # ═══════════════════════════════════════════════════════════════════════
    # PAID-VS-COMPED CLASSIFICATION
    # ─────────────────────────────────────────────────────────────────────
    # Goal: identify which active members reached active state by paying
    # real money vs being comped (admin manual activation, referral gift only).
    # ═══════════════════════════════════════════════════════════════════════

    # Users who have at least one confirmed payment of any kind — this is the
    # "paid real money" set. We treat any of three rails as evidence:
    #   - payments table with status indicating success
    #   - nowpayments_orders with status='finished' (the IPN-confirmed terminal state)
    #   - walletconnect_payment_orders with status='confirmed'
    paid_real_money_count = db.execute(text("""
        SELECT COUNT(DISTINCT u.id)
        FROM users u
        WHERE u.is_active = TRUE
          AND (
            EXISTS (
              SELECT 1 FROM payments p
              WHERE p.from_user_id = u.id
                AND p.status IN ('paid', 'confirmed', 'finished', 'completed')
            )
            OR EXISTS (
              SELECT 1 FROM nowpayments_orders npo
              WHERE npo.user_id = u.id
                AND (npo.status = 'finished' OR npo.confirmed_at IS NOT NULL)
            )
            OR EXISTS (
              SELECT 1 FROM walletconnect_payment_orders wco
              WHERE wco.user_id = u.id
                AND wco.status = 'confirmed'
            )
          )
    """)).scalar() or 0

    # Subset: those who paid REAL MONEY specifically for membership (any product
    # purchase counts as "paid customer" for grandfathering purposes — if they
    # bought a Campaign Tier or credit pack, they're a real customer too —
    # but it's useful to split out membership-specific payments).
    paid_for_membership_count = db.execute(text("""
        SELECT COUNT(DISTINCT u.id)
        FROM users u
        WHERE u.is_active = TRUE
          AND (
            EXISTS (
              SELECT 1 FROM nowpayments_orders npo
              WHERE npo.user_id = u.id
                AND npo.product_type = 'membership'
                AND (npo.status = 'finished' OR npo.confirmed_at IS NOT NULL)
            )
            OR EXISTS (
              SELECT 1 FROM walletconnect_payment_orders wco
              WHERE wco.user_id = u.id
                AND wco.product_type = 'membership'
                AND wco.status = 'confirmed'
            )
            OR EXISTS (
              SELECT 1 FROM payments p
              WHERE p.from_user_id = u.id
                AND p.payment_type = 'membership'
                AND p.status IN ('paid', 'confirmed', 'finished', 'completed')
            )
          )
    """)).scalar() or 0

    # Active members whose only renewal_source is 'manual' AND who have no
    # payment record → admin-comped accounts.
    manual_only_count = db.execute(text("""
        SELECT COUNT(*)
        FROM users u
        LEFT JOIN membership_renewals mr ON mr.user_id = u.id
        WHERE u.is_active = TRUE
          AND COALESCE(mr.renewal_source, '') = 'manual'
          AND NOT EXISTS (
            SELECT 1 FROM payments p
            WHERE p.from_user_id = u.id
              AND p.status IN ('paid', 'confirmed', 'finished', 'completed')
          )
          AND NOT EXISTS (
            SELECT 1 FROM nowpayments_orders npo
            WHERE npo.user_id = u.id
              AND (npo.status = 'finished' OR npo.confirmed_at IS NOT NULL)
          )
          AND NOT EXISTS (
            SELECT 1 FROM walletconnect_payment_orders wco
            WHERE wco.user_id = u.id
              AND wco.status = 'confirmed'
          )
    """)).scalar() or 0

    # Active members with NO membership_renewals row at all → admin flipped
    # is_active directly without ever creating a renewal row.
    no_renewal_row_count = db.execute(text("""
        SELECT COUNT(*)
        FROM users u
        WHERE u.is_active = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM membership_renewals mr WHERE mr.user_id = u.id
          )
    """)).scalar() or 0

    # Active members activated by referral gift (first-month gift, no money
    # from them). Note: this is OR-overlapping with paid_real_money — a user
    # could have been gifted month 1 then paid for month 2+. So we report this
    # AND a "gift-only" subset that excludes anyone with real payment evidence.
    gifted_total_count = db.execute(text("""
        SELECT COUNT(*)
        FROM users
        WHERE is_active = TRUE
          AND membership_activated_by_referral = TRUE
    """)).scalar() or 0

    gifted_only_count = db.execute(text("""
        SELECT COUNT(*)
        FROM users u
        WHERE u.is_active = TRUE
          AND u.membership_activated_by_referral = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM payments p
            WHERE p.from_user_id = u.id
              AND p.status IN ('paid', 'confirmed', 'finished', 'completed')
          )
          AND NOT EXISTS (
            SELECT 1 FROM nowpayments_orders npo
            WHERE npo.user_id = u.id
              AND (npo.status = 'finished' OR npo.confirmed_at IS NOT NULL)
          )
          AND NOT EXISTS (
            SELECT 1 FROM walletconnect_payment_orders wco
            WHERE wco.user_id = u.id
              AND wco.status = 'confirmed'
          )
    """)).scalar() or 0

    # ── Diagnostic: membership_expires_at distribution for active accounts ──
    # This tells us when each cohort's current paid/comped period actually
    # ends — critical for the migration because we need to honour existing
    # paid periods before applying the new $15/mo rate.
    expiry_distribution_rows = db.execute(text("""
        SELECT
          CASE
            WHEN membership_expires_at IS NULL THEN 'no_expiry_set'
            WHEN membership_expires_at < NOW() THEN 'already_expired'
            WHEN membership_expires_at < NOW() + INTERVAL '32 days' THEN 'expires_within_month'
            WHEN membership_expires_at < NOW() + INTERVAL '95 days' THEN 'expires_1_to_3_months'
            WHEN membership_expires_at < NOW() + INTERVAL '370 days' THEN 'expires_3_to_12_months'
            WHEN membership_expires_at < NOW() + INTERVAL '1100 days' THEN 'expires_1_to_3_years'
            ELSE 'expires_far_future'
          END AS bucket,
          COUNT(*) AS cnt
        FROM users
        WHERE is_active = TRUE
        GROUP BY bucket
    """)).fetchall()
    expiry_distribution = {row.bucket: row.cnt for row in expiry_distribution_rows}
    for key in ('no_expiry_set', 'already_expired', 'expires_within_month',
                'expires_1_to_3_months', 'expires_3_to_12_months',
                'expires_1_to_3_years', 'expires_far_future'):
        expiry_distribution.setdefault(key, 0)

    # Cross-classify expiry with paid-vs-comped so we can see EXACTLY when
    # each cohort's price flips to $15/mo:
    #   - paid members: at their next renewal date
    #   - comped members: at their expiry date (or never if no_expiry_set)
    expiry_by_paid_status = {}
    for paid_status in ('paid', 'comped'):
        paid_filter = "EXISTS" if paid_status == 'paid' else "NOT EXISTS"
        rows = db.execute(text(f"""
            SELECT
              CASE
                WHEN u.membership_expires_at IS NULL THEN 'no_expiry_set'
                WHEN u.membership_expires_at < NOW() THEN 'already_expired'
                WHEN u.membership_expires_at < NOW() + INTERVAL '32 days' THEN 'expires_within_month'
                WHEN u.membership_expires_at < NOW() + INTERVAL '95 days' THEN 'expires_1_to_3_months'
                WHEN u.membership_expires_at < NOW() + INTERVAL '370 days' THEN 'expires_3_to_12_months'
                WHEN u.membership_expires_at < NOW() + INTERVAL '1100 days' THEN 'expires_1_to_3_years'
                ELSE 'expires_far_future'
              END AS bucket,
              COUNT(*) AS cnt
            FROM users u
            WHERE u.is_active = TRUE
              AND {paid_filter} (
                SELECT 1 FROM payments p
                WHERE p.from_user_id = u.id
                  AND p.status IN ('paid', 'confirmed', 'finished', 'completed')
                UNION
                SELECT 1 FROM nowpayments_orders npo
                WHERE npo.user_id = u.id
                  AND (npo.status = 'finished' OR npo.confirmed_at IS NOT NULL)
                UNION
                SELECT 1 FROM walletconnect_payment_orders wco
                WHERE wco.user_id = u.id
                  AND wco.status = 'confirmed'
              )
            GROUP BY bucket
        """)).fetchall()
        expiry_by_paid_status[paid_status] = {row.bucket: row.cnt for row in rows}

    # Bottom-line classification (mutually exclusive):
    # - genuine_paying_customers: has real payment evidence (regardless of
    #   whether their first month was a gift — they paid subsequently)
    # - comped_active_members:   active but no payment evidence
    comped_active_count = active_count - paid_real_money_count

    # ── Founding spot planning maths ──
    # Updated policy: only members who paid real money get grandfathered.
    FOUNDING_TOTAL = 100
    spots_used_by_grandfathering = min(paid_real_money_count, FOUNDING_TOTAL)
    spots_remaining_for_new_signups = max(0, FOUNDING_TOTAL - spots_used_by_grandfathering)
    overflow_actives = max(0, paid_real_money_count - FOUNDING_TOTAL)

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
        "edge_cases_for_review": {
            "paid_with_no_expiry_set": paid_no_expiry,
            "far_future_expiry_active": far_future_active,
        },
        "expiry_distribution_active": expiry_distribution,
        "expiry_by_paid_status": expiry_by_paid_status,
        "paid_classification": {
            "paid_real_money": paid_real_money_count,
            "paid_for_membership_specifically": paid_for_membership_count,
            "comped_active_members": comped_active_count,
            "manual_activation_no_payment": manual_only_count,
            "no_renewal_row_admin_flipped": no_renewal_row_count,
            "referral_gift_total": gifted_total_count,
            "referral_gift_only_no_subsequent_payment": gifted_only_count,
            "note": (
                "paid_real_money + comped_active_members = active_count. "
                "manual_activation_no_payment and no_renewal_row_admin_flipped "
                "are diagnostic subsets of comped_active_members. "
                "referral_gift_only excludes members who paid after their gift."
            ),
        },
        "founding_spot_planning": {
            "total_spots": FOUNDING_TOTAL,
            "policy": "Only paid_real_money members are grandfathered as founding members.",
            "spots_used_by_grandfathering": spots_used_by_grandfathering,
            "spots_remaining_for_new_signups": spots_remaining_for_new_signups,
            "overflow_actives_no_founding_status": overflow_actives,
            "comped_actives_excluded_from_grandfathering": comped_active_count,
        },
    }

