import os
from decimal import Decimal
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, BigInteger, String, ForeignKey, Float, Boolean, DateTime, Text, text, Numeric, UniqueConstraint

# Precision type for all financial columns — 18 digits, 6 decimal places
# Prevents floating-point drift across millions of transactions
Money = Numeric(18, 6)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
try:
    import geoip2.database as _geoip2_db
    import os as _os
    _GEOIP_PATH = _os.path.join(_os.path.dirname(__file__), "..", "data", "GeoLite2-Country.mmdb")
    _geoip_reader = _geoip2_db.Reader(_GEOIP_PATH) if _os.path.exists(_GEOIP_PATH) else None
except Exception:
    _geoip_reader = None
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
# Railway Postgres URLs use postgres:// but SQLAlchemy requires postgresql://
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
engine = create_engine(
    DATABASE_URL,
    # Enable pool_pre_ping during launch period: costs ~1-2ms per query
    # but eliminates the failure mode where a Postgres-side idle-killed
    # connection gets handed to a request and fails with "server closed
    # the connection unexpectedly". For a launch with 1000+ potential
    # concurrent users, the safety > the latency cost. Can revisit
    # post-launch once traffic patterns are understood.
    pool_pre_ping=True,
    # Sized for two replicas × 30 connections each = 60 total, well
    # under Railway Postgres's typical 100-connection limit. Leaves
    # headroom for migrations, MCP service, and ad-hoc admin queries.
    pool_size=10,
    max_overflow=20,
    # Proactively retire connections after 1 hour. Railway's Postgres
    # idle-kills connections after a window we don't fully control; if
    # SQLAlchemy hands a killed connection back to a request, the
    # request fails with "connection closed" or "server closed the
    # connection unexpectedly". pool_recycle ensures we cycle them
    # before the server does as a defence-in-depth alongside
    # pool_pre_ping.
    pool_recycle=3600,
    # Wait up to 10s for an available connection from the pool before
    # erroring. Default is 30s which is too long for a synchronous
    # request — better to fail fast at 10s and let Railway's load
    # balancer route to the other replica.
    pool_timeout=10,
    # Connection-level defensive timeouts (added 15 May 2026 after a
    # launch-night outage where a stuck database lock from a previous
    # container instance hung the entire app boot — every ALTER TABLE
    # in the import-time migration blocks waited forever for the lock).
    #
    # options sets Postgres session parameters that take effect on every
    # connection from this pool. lock_timeout=5s makes any statement that
    # can't acquire its lock in 5 seconds raise QueryCanceledError, which
    # the surrounding try/except in each migration block catches and
    # logs. The migration is idempotent so a missed run is harmless —
    # next deploy when the lock is free picks it up.
    #
    # statement_timeout=60s is a longer fallback for non-lock-related
    # hangs (e.g. accidentally writing a query that scans an enormous
    # table at startup). Long enough that legitimate migrations complete,
    # short enough that we never hang a deploy for more than a minute.
    connect_args={
        "connect_timeout": 5,
        "options": "-c lock_timeout=5000 -c statement_timeout=60000",
    },
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── Migration kill-switch (added 15 May 2026 launch-night) ─────────
# When SKIP_MIGRATIONS=true is set in environment, all module-level
# migration blocks below are bypassed. The app boots without running
# any ALTER TABLE / CREATE INDEX / seed logic.
#
# When to use: deploy is stuck in a crash loop because two container
# instances are running migrations simultaneously and deadlocking on
# the users table. Set the flag, deploy, app boots clean, then unset
# the flag for the next deploy when there's no contention.
#
# Safe because: migrations are idempotent. The schema only needs to
# be initialised ONCE; on subsequent boots the ALTER TABLE...IF NOT
# EXISTS statements are no-ops anyway. Skipping them on a single
# boot where the schema is already correct is harmless.
SKIP_MIGRATIONS = os.getenv("SKIP_MIGRATIONS", "").lower() in ("true", "1", "yes")
if SKIP_MIGRATIONS:
    print("⚠️ SKIP_MIGRATIONS=true — bypassing all module-level migration blocks")

# ── Grid constants ────────────────────────────────────────────
# 25 May 2026 — Steve cut the grid from 8×8/64 to 6×6/36.
# Uni-level pay depth stays at 8 levels (PER_LEVEL_PCT * 8 = 50%);
# the grid is now a visualisation of a slice of uni-level activity,
# not the full chain. Completion bonus pays when seat 36 fills,
# new grid opens for the owner, and the next two levels of
# uni-level activity populate the new grid.
#
# Lifetime earnings unchanged — same money, faster cycles (~1.78×
# more completions/year). Total bonus pool generated per $ of tier
# sales is identical (10% of every tier purchase still routes to
# the active grid's bonus pool); it just pays out on 36 fills
# instead of 64.
#
# Previous: GRID_WIDTH=8, GRID_LEVELS=8, GRID_TOTAL=64.
#
# IMPORTANT: UNILEVEL_DEPTH is decoupled from GRID_LEVELS.
# GRID_LEVELS = visual grid shape (6 rows). UNILEVEL_DEPTH = how
# many sponsor-chain levels the 6.25% commission walks (still 8,
# unchanged). Uni-level commission math (PER_LEVEL_PCT × 8 = 50%)
# is preserved exactly as before; only the grid display shrinks.
GRID_WIDTH      = 6      # positions per visible grid row
GRID_LEVELS     = 6      # visible grid rows
GRID_TOTAL      = 36     # 36 positions in the visualised grid
UNILEVEL_DEPTH  = 8      # sponsor-chain depth for 6.25% commissions (unchanged)

# ── Commission split (Stream 2 — Profit Engine Grid) ─────────
# 21 May 2026 — Steve's commercial decision: reallocate the 5%
# platform share to double the completion bonus from 5% to 10%.
# New split: 40% Direct / 50% Uni-Level / 10% Completion Bonus /
# 0% Platform. 100% of every Grid commission flows back to
# affiliates. Marketing rationale: "100% to affiliates" is a
# differentiator that drives Membership activations (where the
# company actually makes its money at $10 flat per activation).
#
# Forward-only — no retroactive recalculation of historical
# completion bonuses. Applies to all Grid activations from this
# deploy onwards.
#
# Previous split (until 20 May 2026):
#   DIRECT_PCT     = 0.40   (unchanged)
#   UNILEVEL_PCT   = 0.50   (unchanged)
#   PER_LEVEL_PCT  = 0.0625 (unchanged)
#   PLATFORM_PCT   = 0.05   → now 0.00
#   BONUS_POOL_PCT = 0.05   → now 0.10
DIRECT_PCT    = 0.40   # 40% → to the person who personally referred the entrant
UNILEVEL_PCT  = 0.50   # 50% → split across 8 uni-level positions (6.25% each)
PER_LEVEL_PCT = 0.0625 # 6.25% → each of 8 levels in the upline chain
PLATFORM_PCT  = 0.00   # 0%  → reallocated to bonus pool (21 May 2026)
BONUS_POOL_PCT = 0.10  # 10% → Grid completion bonus pool (was 5%, +5% from platform)


# Legacy aliases
OWNER_PCT     = DIRECT_PCT    # 0.40
UPLINE_PCT    = UNILEVEL_PCT  # 0.50
LEVEL_PCT     = PER_LEVEL_PCT # 0.0625
COMPANY_PCT   = PLATFORM_PCT  # 0.05

# Package prices
GRID_PACKAGES = {
    1: 20.0,
    2: 50.0,
    3: 100.0,
    4: 200.0,
    5: 400.0,
    6: 600.0,
    7: 800.0,
    8: 1000.0
}

GRID_TIER_NAMES = {
    1: "Starter",
    2: "Builder",
    3: "Pro",
    4: "Advanced",
    5: "Premium",
    6: "Elite",
    7: "Master",
    8: "Champion",
}

# ── Grid Completion Bonus (paid from 10% bonus pool) ─────────
# 25 May 2026: grid cut from 64 → 36 seats. Bonus values recalculated:
#   Total pool per grid = 36 seats × price × 10% = price × 3.6
# Bonus pays out ONLY if grid owner has an active (unexpired) campaign at that tier.
#
# Historical:
#   pre-25-May-2026 (64-grid at 10%): 128 / 320 / 640 / 1280 / 2560 / 3840 / 5120 / 6400
#   pre-21-May-2026 (64-grid at  5%):  64 / 160 / 320 /  640 / 1280 / 1920 / 2560 / 3200
GRID_COMPLETION_BONUS = {
    1: 72.0,      # 36 × $20   × 0.10 = $72
    2: 180.0,     # 36 × $50   × 0.10 = $180
    3: 360.0,     # 36 × $100  × 0.10 = $360
    4: 720.0,     # 36 × $200  × 0.10 = $720
    5: 1440.0,    # 36 × $400  × 0.10 = $1,440
    6: 2160.0,    # 36 × $600  × 0.10 = $2,160
    7: 2880.0,    # 36 × $800  × 0.10 = $2,880
    8: 3600.0,    # 36 × $1000 × 0.10 = $3,600
}

# ── Campaign View Targets per Tier ───────────────────────────
# Views delivered per campaign purchase/repurchase cycle
# Campaign stays active until views are delivered, then expires
# 14-day grace period after expiry before qualification drops
#
# View targets sized to give each tier a meaningfully different delivery
# duration (member retention via price-commitment alignment): tier 1 ≈ 1
# month, tier 8 ≈ 6 months at typical platform delivery rates. Higher
# tiers buy longer "your campaign is live" runways, so members aren't on a
# rebuy treadmill. Set 1 May 2026 — Option B from product discussion.
CAMPAIGN_VIEW_TARGETS = {
    1: 2000,     # ~1 month — Starter $20
    2: 4000,     # ~2 months — Builder $50
    3: 8000,     # ~2 months — Pro $100
    4: 15000,    # ~3 months — Advanced $200
    5: 30000,    # ~4 months — Premium $400
    6: 50000,    # ~4 months — Elite $600
    7: 80000,    # ~5 months — Master $800
    8: 120000,   # ~6 months — Champion $1,000
}

# Grace period (days) after campaign expires before losing tier qualification
CAMPAIGN_GRACE_DAYS = 14

# ── Campaign Tier Features ────────────────────────────────────
# Controls what each grid tier unlocks for video campaigns
CAMPAIGN_TIER_FEATURES = {
    1: {"max_campaigns": 1,  "monthly_views": 500,    "targeting": False, "demographics": False, "priority": 0, "featured": False, "spotlight": False, "reach": "category"},
    2: {"max_campaigns": 3,  "monthly_views": 1500,   "targeting": False, "demographics": False, "priority": 0, "featured": False, "spotlight": False, "reach": "category"},
    3: {"max_campaigns": 5,  "monthly_views": 5000,   "targeting": False, "demographics": False, "priority": 0, "featured": False, "spotlight": False, "reach": "extended"},
    4: {"max_campaigns": 10, "monthly_views": 10000,  "targeting": True,  "demographics": True,  "priority": 0, "featured": False, "spotlight": False, "reach": "extended"},
    5: {"max_campaigns": 20, "monthly_views": 20000,  "targeting": True,  "demographics": True,  "priority": 1, "featured": False, "spotlight": False, "reach": "full"},
    6: {"max_campaigns": 30, "monthly_views": 30000,  "targeting": True,  "demographics": True,  "priority": 2, "featured": True,  "spotlight": False, "reach": "full"},
    7: {"max_campaigns": 50, "monthly_views": 40000,  "targeting": True,  "demographics": True,  "priority": 3, "featured": True,  "spotlight": True,  "reach": "full"},
    8: {"max_campaigns": 999,"monthly_views": 50000,  "targeting": True,  "demographics": True,  "priority": 4, "featured": True,  "spotlight": True,  "reach": "full"},
}

class User(Base):
    __tablename__ = "users"
    id                  = Column(Integer, primary_key=True, index=True)
    username            = Column(String, unique=True, index=True)
    email               = Column(String, index=True)
    password            = Column(String)
    first_name          = Column(String, nullable=True)
    last_name           = Column(String, nullable=True)
    sponsor_id          = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    pass_up_sponsor_id  = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # permanent pass-up chain
    course_sale_count   = Column(Integer, default=0)              # total personally referred course sales (any tier)
    wallet_address      = Column(String, nullable=True)
    wallet_network      = Column(String, nullable=True)    # 'tron' (TRC-20) or 'bsc' (BEP-20). NULL for legacy users until they re-enter address.
    sending_wallet      = Column(String, nullable=True)    # wallet they send crypto payments FROM
    is_admin            = Column(Boolean, default=False)
    is_active           = Column(Boolean, default=False)
    # Fast Start hero — dashboard activation prompt for paid Partners
    # who haven't yet bought their Grid Tier 1 ($20 grid_1 product).
    # Added 17 May 2026 to drive Grid Tier 1 activation conversion.
    #
    # State machine (used by the dashboard React surface):
    #   - Both NULL          → hero shown in full ("Activate Grid" ignition)
    #   - pressed_at set,    → user clicked the button but didn't finish payment.
    #     hidden_at NULL       Render the degraded "Continue activation →" link
    #                          with × dismiss button.
    #   - hidden_at set      → user dismissed permanently OR bought Grid Tier 1.
    #                          Nothing renders. (Auto-set on successful grid_1
    #                          activation in _nowpayments_activate_product.)
    #
    # Both nullable timestamps so absence = pristine never-seen state.
    fast_start_pressed_at = Column(DateTime, nullable=True)
    fast_start_hidden_at  = Column(DateTime, nullable=True)
    membership_tier     = Column(String, default="free")     # free (registered, no membership), basic ($20/mo or $200/yr), pro ($35/mo or $350/yr).
                                                              # Default is 'free' deliberately — earlier this defaulted to 'basic' which made
                                                              # every newly registered user look like a Basic-tier member regardless of payment.
                                                              # If you're checking 'is this user paid?' use is_active. Reading membership_tier
                                                              # alone tells you 'what tier they would pay for / are paying for', not 'are they
                                                              # paying right now'. Both flags must agree (free ↔ inactive, basic/pro ↔ active).
    balance             = Column(Money, default=0.0)      # affiliate wallet — always withdrawable
    campaign_balance    = Column(Money, default=0.0)      # campaign wallet — requires active tier + watch quota
    total_earned        = Column(Money, default=0.0)      # lifetime earnings (both wallets combined)
    total_withdrawn     = Column(Money, default=0.0)      # lifetime withdrawals
    grid_earnings       = Column(Money, default=0.0)      # earnings from grid completions
    level_earnings      = Column(Money, default=0.0)      # earnings from level pool
    upline_earnings     = Column(Money, default=0.0)      # earnings as upline on others' grids
    personal_referrals  = Column(Integer, default=0)      # direct recruits
    total_team          = Column(Integer, default=0)      # entire network size
    country             = Column(String, nullable=True)
    display_city        = Column(String, nullable=True)    # Populated by GeoIP at registration; /explore activity feed uses this
    interests           = Column(String, nullable=True)    # comma-separated interest tags
    age_range           = Column(String, nullable=True)    # "18-24","25-34","35-44","45-54","55+"
    gender              = Column(String, nullable=True)    # "male","female","other"
    created_at          = Column(DateTime, default=datetime.utcnow)
    membership_activated_by_referral = Column(Boolean, default=False)  # first month gifted
    low_balance_warned  = Column(Boolean, default=False)               # 3-day warning sent
    # Server-side persistence for the 'You earned your first $X!' banner.
    # Replaces the localStorage-only flag that didn't sync across devices.
    # Timestamp (not boolean) so future milestone-based re-surfaces can
    # compare against the dismissal date. NULL = never dismissed.
    story_prompt_dismissed_at = Column(DateTime, nullable=True)
    onboarding_completed = Column(Boolean, default=False)              # launch wizard done
    first_payment_to_company = Column(Boolean, default=False)          # True after 1st month payment goes to company
    # Email broadcast opt-out (added 11 May 2026). True = excluded from admin
    # broadcast emails. Transactional emails (welcome, commission notifications,
    # password reset, etc.) ignore this flag and always send.
    email_opt_out          = Column(Boolean, default=False, index=True)
    email_unsubscribe_token = Column(String(64), nullable=True, index=True)  # opaque token for one-click unsubscribe link
    course_earnings         = Column(Money, default=0.0)               # lifetime earnings from course commissions
    bonus_earnings          = Column(Money, default=0.0)               # lifetime grid completion bonus earnings
    marketplace_earnings    = Column(Money, default=0.0)               # lifetime earnings from course marketplace (creator + sponsor)
    # ── KYC fields ──
    kyc_status              = Column(String, default="none")               # none, pending, approved, rejected
    kyc_dob                 = Column(String, nullable=True)                # date of birth YYYY-MM-DD
    kyc_id_type             = Column(String, nullable=True)                # passport, drivers_licence, national_id
    kyc_id_filename         = Column(String, nullable=True)                # uploaded file name
    kyc_submitted_at        = Column(DateTime, nullable=True)
    kyc_reviewed_at         = Column(DateTime, nullable=True)
    kyc_rejection_reason    = Column(String, nullable=True)
    # ── 2FA fields ──
    totp_secret             = Column(String, nullable=True)                # base32-encoded TOTP secret
    totp_enabled            = Column(Boolean, default=False)               # True once user confirms setup
    avatar_url              = Column(Text, nullable=True)                  # profile photo URL or base64
    # Email credits for autoresponder boost
    email_credits           = Column(Integer, default=0)                    # purchased boost credits
    emails_sent_today       = Column(Integer, default=0)                    # daily counter (resets daily)
    emails_sent_today_date  = Column(String, nullable=True)                 # date string for reset check
    # Stripe
    # 23 May 2026: full Stripe re-integration alongside crypto rail.
    # stripe_subscription_id existed since the old (now-dead) Stripe code;
    # stripe_customer_id, payment_method, and stripe_refund_eligible_until
    # added in the re-integration. payment_method drives renewal routing
    # (crypto → existing process_auto_renewals + USDT polling; stripe →
    # Stripe handles renewals natively, we just watch webhooks).
    # stripe_refund_eligible_until is set on every successful Stripe payment
    # to (now + 7 days). The /api/stripe/refund endpoint compares to this
    # before processing.
    stripe_customer_id      = Column(String, nullable=True, index=True)     # Stripe Customer object ID (cus_...)
    stripe_subscription_id  = Column(String, nullable=True)                 # active Stripe subscription ID
    payment_method          = Column(String, default="crypto")              # "crypto" or "stripe" — drives renewal routing
    stripe_refund_eligible_until = Column(DateTime, nullable=True)          # last_payment_at + 7 days; refunds only honoured within this window
    membership_expires_at   = Column(DateTime, nullable=True)               # next renewal date
    membership_billing      = Column(String, default="monthly")             # "monthly" or "annual"
    activated_at            = Column(DateTime, nullable=True)               # first payment / activation timestamp; preserved on subsequent renewals
    stuck_lapsed_alerted_at = Column(DateTime, nullable=True)               # set by /cron/stuck-lapsed-alert when this user is first detected as stuck-lapsed; cleared on reactivation. Idempotency for the alert email — same user only emails once.
    # ── Flat-pricing partner model (added 15 May 2026) ─────────────────────
    # New three-state membership model replacing legacy free/basic/pro tiers:
    #   - free      → registered but not paying
    #   - partner   → paying $20/mo, full platform access
    #   - founding  → one of the 100 founding partners, $15/mo locked for life
    # Tier gating removed: partner and founding both get full access.
    # The Pro/Basic distinction no longer exists — every paying member is a
    # Partner. The original 100 paying members are Founding Partners with a
    # permanent $15/mo rate. Legacy 'basic'/'pro' values in this column are
    # migrated to 'founding' on the cutover date for all currently-active users.
    is_founding_member      = Column(Boolean, default=False, index=True)    # True for the first 100 paying partners
    founding_spot_number    = Column(Integer, nullable=True, unique=True)   # 1..100 — display rank for founders, NULL otherwise
    # When set, this overrides all standard pricing logic — the renewal cron
    # charges this amount instead of computing from tier. Founding partners
    # have this set to 15.00 at migration; standard partners leave it NULL so
    # they pay the prevailing $20/mo rate.
    membership_price_locked = Column(Numeric(10, 2), nullable=True)

class StripeCharge(Base):
    """One row per Stripe charge / refund / chargeback for full audit trail.

    Added 23 May 2026 alongside the full Stripe re-integration. Stripe is the
    source of truth for the actual money movement; this table is our local
    mirror so we can answer 'did user X pay Y on date Z?' without hitting the
    Stripe API every time, support our refund decision logic without making
    network calls, and survive Stripe API outages.

    One row written per webhook event:
      - checkout.session.completed → kind='charge', amount_cents=full_amount
      - charge.refunded            → kind='refund', amount_cents=refunded_amount (negative)
      - charge.dispute.created     → kind='chargeback', amount_cents=disputed_amount (negative)
      - charge.dispute.closed_won  → kind='chargeback_won' (rare, recovers the funds)
      - charge.dispute.closed_lost → kind='chargeback_lost'

    Membership renewals (subscription invoices) come through as separate
    charge rows with product='membership_renewal' and the same stripe_subscription_id.
    """
    __tablename__ = "stripe_charges"
    id                      = Column(Integer, primary_key=True, index=True)
    user_id                 = Column(Integer, ForeignKey("users.id"), index=True)
    stripe_charge_id        = Column(String, nullable=True, index=True)     # ch_... — the Charge object ID; null for some webhook events
    stripe_payment_intent_id = Column(String, nullable=True, index=True)    # pi_... — PaymentIntent ID, more stable reference
    stripe_subscription_id  = Column(String, nullable=True, index=True)     # sub_... — for renewal-related charges
    stripe_session_id       = Column(String, nullable=True, index=True)     # cs_... — Checkout session that triggered this charge
    kind                    = Column(String, index=True)                    # charge|refund|chargeback|chargeback_won|chargeback_lost
    product                 = Column(String, index=True)                    # membership_signup|membership_renewal|custom_domain|campaign_tier|nexus_pack|course|creative_credits
    amount_cents            = Column(Integer)                               # signed; refunds + chargebacks are negative
    currency                = Column(String, default="usd")
    company_share_cents     = Column(Integer, default=0)                    # what the company kept after commissions (used for partial-refund cap)
    refundable_cents        = Column(Integer, default=0)                    # what we'd refund if asked (= company_share for membership; product-dependent otherwise)
    description             = Column(String, nullable=True)                 # human-readable summary
    raw_event_json          = Column(Text, nullable=True)                   # full webhook payload for forensics
    created_at              = Column(DateTime, default=datetime.utcnow, index=True)

class Grid(Base):
    """One grid instance per user per package tier."""
    __tablename__ = "grids"
    id              = Column(Integer, primary_key=True, index=True)
    owner_id        = Column(Integer, ForeignKey("users.id"), index=True)
    package_tier    = Column(Integer)                      # 1-8
    package_price   = Column(Money)                        # $20-$1000
    advance_number    = Column(Integer, default=1)           # which advance (1,2,3...)
    positions_filled = Column(Integer, default=0)          # 0-64
    is_complete     = Column(Boolean, default=False)       # True when 64 filled
    owner_paid      = Column(Boolean, default=False)       # owner payout sent
    revenue_total   = Column(Money, default=0.0)           # total revenue collected
    bonus_pool_accrued = Column(Money, default=0.0)        # 5% bonus pool accumulator
    bonus_paid      = Column(Boolean, default=False)       # True if completion bonus paid
    bonus_rolled_over = Column(Boolean, default=False)     # True if bonus rolled to next advance (no active campaign)
    created_at      = Column(DateTime, default=datetime.utcnow)
    completed_at    = Column(DateTime, nullable=True)

class GridPosition(Base):
    """A single person's position inside someone's grid."""
    __tablename__ = "grid_positions"
    id              = Column(Integer, primary_key=True, index=True)
    grid_id         = Column(Integer, ForeignKey("grids.id"), index=True)
    member_id       = Column(Integer, ForeignKey("users.id"), index=True)   # person filling this seat
    grid_level      = Column(Integer, index=True)                # 1-8
    position_num    = Column(Integer)                            # 1-8 within the level
    is_overspill    = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)

class Commission(Base):
    """Every commission payment — full audit trail."""
    __tablename__ = "commissions"
    id              = Column(Integer, primary_key=True, index=True)
    from_user_id    = Column(Integer, ForeignKey("users.id"))
    to_user_id      = Column(Integer, ForeignKey("users.id"))
    grid_id         = Column(Integer, ForeignKey("grids.id"), nullable=True)
    amount_usdt     = Column(Money)
    commission_type = Column(String, index=True)   # 'direct_sponsor','uni_level','platform','membership'
    package_tier    = Column(Integer)
    status          = Column(String, default="pending", index=True)  # pending/paid/failed
    tx_hash         = Column(String, nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow, index=True)
    paid_at         = Column(DateTime, nullable=True)


class PendingCommission(Base):
    """Grace-period escrow for commissions an upline would have earned
    if they'd been qualified at the downline's purchase tier.

    Added 26 May 2026 per Steve's product spec: when Joe (Tier 1) sees
    Fred (Joe's downline) upgrade to Tier 2, Joe's would-have-been-paid
    direct + uni-level commissions are held in escrow for 3 days. If Joe
    upgrades to Tier 2 within that window, the pending commissions are
    released to his campaign_balance. Otherwise they expire and go to
    the company.

    Why a separate table from Commission: Commission rows are immutable
    audit records. Pending rows are transient state with a status
    transition, expiry timestamp, and trigger event. Conflating them
    would bloat the commission ledger and complicate the audit tools
    that already exist (commission_audit, commission_anomalies).
    """
    __tablename__ = "pending_commissions"
    id              = Column(Integer, primary_key=True, index=True)
    recipient_id    = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    # The downline whose upgrade triggered this escrow. Useful for the
    # "Fred upgraded — you have 3 days to catch up" notification copy.
    trigger_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    grid_id         = Column(Integer, ForeignKey("grids.id"), nullable=True)
    advance_number  = Column(Integer, nullable=True)
    amount_usdt     = Column(Money, nullable=False)
    # 'direct_sponsor' or 'uni_level' — matches Commission.commission_type
    # so existing analytics can union the two tables if needed.
    commission_type = Column(String, nullable=False)
    # The tier the downline upgraded TO — what the recipient needs to
    # match or exceed to claim this commission.
    package_tier    = Column(Integer, nullable=False)
    # The tier the recipient would need to own to qualify for release.
    # Currently always equals package_tier (Steve's rule: match the tier),
    # but stored explicitly so policy changes don't require a migration.
    required_tier   = Column(Integer, nullable=False)
    status          = Column(String, default="pending", index=True, nullable=False)  # pending|released|expired
    created_at      = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    expires_at      = Column(DateTime, nullable=False, index=True)
    released_at     = Column(DateTime, nullable=True)
    # T-24h reminder dispatch tracker so the cron doesn't double-send.
    reminder_sent_at = Column(DateTime, nullable=True)
    notes           = Column(Text, nullable=True)

    recipient = relationship("User", foreign_keys=[recipient_id])
    trigger   = relationship("User", foreign_keys=[trigger_id])

class Course(Base):
    """Three-tier course catalogue."""
    __tablename__ = "courses"
    id              = Column(Integer, primary_key=True, index=True)
    title           = Column(String, nullable=False)
    slug            = Column(String, unique=True, index=True)
    description     = Column(Text, nullable=True)
    price           = Column(Money, nullable=False)          # 100 / 300 / 500
    tier            = Column(Integer, nullable=False)         # 1, 2, 3
    is_active       = Column(Boolean, default=True)
    sort_order      = Column(Integer, default=0)
    thumbnail_url   = Column(String, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

class CourseChapter(Base):
    """Chapters within a course."""
    __tablename__ = "course_chapters"
    id              = Column(Integer, primary_key=True, index=True)
    course_id       = Column(Integer, ForeignKey("courses.id"), index=True)
    title           = Column(String, nullable=False)
    sort_order      = Column(Integer, default=0)
    created_at      = Column(DateTime, default=datetime.utcnow)

class CourseLesson(Base):
    """Individual video lessons within a chapter."""
    __tablename__ = "course_lessons"
    id              = Column(Integer, primary_key=True, index=True)
    course_id       = Column(Integer, ForeignKey("courses.id"), index=True)
    chapter_id      = Column(Integer, ForeignKey("course_chapters.id"), index=True)
    title           = Column(String, nullable=False)
    video_url       = Column(String, nullable=True)       # YouTube/Vimeo embed URL
    duration_mins   = Column(Integer, default=0)
    sort_order      = Column(Integer, default=0)
    created_at      = Column(DateTime, default=datetime.utcnow)

class CourseProgress(Base):
    """Tracks which lessons a user has completed."""
    __tablename__ = "course_progress"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)
    course_id       = Column(Integer, ForeignKey("courses.id"), index=True)
    lesson_id       = Column(Integer, ForeignKey("course_lessons.id"), index=True)
    completed_at    = Column(DateTime, default=datetime.utcnow)

class CoursePurchase(Base):
    """Records every course purchase by a user."""
    __tablename__ = "course_purchases"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)
    course_id       = Column(Integer, ForeignKey("courses.id"))
    course_tier     = Column(Integer)                         # denormalised for fast lookup
    amount_paid     = Column(Money)
    payment_method  = Column(String, default="wallet")        # wallet / stripe / crypto
    tx_ref          = Column(String, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

class CourseCommission(Base):
    """Audit trail for every course commission (pass-up or direct)."""
    __tablename__ = "course_commissions"
    id              = Column(Integer, primary_key=True, index=True)
    purchase_id     = Column(Integer, ForeignKey("course_purchases.id"))
    buyer_id        = Column(Integer, ForeignKey("users.id"))         # who bought
    earner_id       = Column(Integer, ForeignKey("users.id"))         # who earns
    amount          = Column(Money)
    course_tier     = Column(Integer)
    commission_type = Column(String)    # 'direct_sale' or 'pass_up'
    pass_up_depth   = Column(Integer, default=0)    # 0 = direct, 1+ = levels walked
    source_chain    = Column(Integer, nullable=True, index=True)
    # Which Income Chain this commission flowed through (1-4).
    # Populated for pass_up commissions based on the sale number that triggered the cascade:
    #   sale #2 → chain 1   ("Income Chain 1")
    #   sale #4 → chain 2   ("Income Chain 2")
    #   sale #6 → chain 3   ("Income Chain 3")
    #   sale #8 → chain 4   ("Income Chain 4")
    # NULL for direct_sale and platform commissions (they don't flow through a chain).
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

class CoursePassUpTracker(Base):
    """Tracks how many sales each affiliate has made at each tier.
       The 1st sale at each tier passes up; all others are kept."""
    __tablename__ = "course_passup_tracker"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)
    course_tier     = Column(Integer)                         # 1, 2, 3
    sales_count     = Column(Integer, default=0)              # total sales closed at this tier
    first_passed_up = Column(Boolean, default=False)          # True once 1st sale was passed up
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Payment(Base):
    """Incoming payments from members."""
    __tablename__ = "payments"
    id              = Column(Integer, primary_key=True, index=True)
    from_user_id    = Column(Integer, ForeignKey("users.id"))
    to_user_id      = Column(Integer, ForeignKey("users.id"), nullable=True)
    amount_usdt     = Column(Money)
    payment_type    = Column(String)
    tx_hash         = Column(String, unique=True)
    status          = Column(String, default="pending")
    created_at      = Column(DateTime, default=datetime.utcnow)

class Withdrawal(Base):
    """Outgoing withdrawals to member wallets."""
    __tablename__ = "withdrawals"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"))
    amount_usdt     = Column(Money)
    wallet_address  = Column(String)
    # Which network this withdrawal is on. Determines which send function
    # the dispatcher routes to (send_usdt_tron vs send_usdt_bsc) and which
    # block explorer the admin/member sees a link to. Stored at request time
    # so historical withdrawals stay accurate even if the member later
    # switches their wallet to a different network.
    network         = Column(String, nullable=True)  # 'tron' or 'bsc'. NULL for legacy Polygon-era rows.
    tx_hash         = Column(String, nullable=True)
    # status: pending / processing / paid / failed / failed_permanent / failed_refunded
    #   pending           — queued, will be picked up by the retry cron
    #   processing        — RPC call in flight
    #   paid              — on-chain success, tx_hash set
    #   failed            — legacy/manual marker (not auto-retried)
    #   failed_permanent  — exceeded max retries OR structurally blocked; refunded if grid-blocked
    #   failed_refunded   — admin manually refunded a stuck withdrawal
    status          = Column(String, default="pending")
    requested_at    = Column(DateTime, default=datetime.utcnow)
    processed_at    = Column(DateTime, nullable=True)
    # Which balance column the deduction came from — required for safe refunds.
    # Without this, admin refund logic has to guess and risks silent corruption.
    wallet_type     = Column(String, default="affiliate")  # affiliate | campaign
    # Retry tracking — populated by /cron/process-pending-withdrawals
    attempts          = Column(Integer, default=0)
    last_attempted_at = Column(DateTime, nullable=True)
    last_error        = Column(String, nullable=True)
    # Idempotency — client sends a UUID per Withdraw button click. Unique
    # index on the column means a double-submit (double-click, retry on flaky
    # 4G) can't spawn a second on-chain transfer; the second insert collides
    # and we return the original attempt's stored result instead.
    idempotency_key   = Column(String, nullable=True, unique=True, index=True)
    # Free-form admin notes (used by the refund flow to record why/who).
    notes             = Column(Text, nullable=True)


class PurchaseConsent(Base):
    """Captures a user's express consent to the no-refund / immediate-
    activation terms BEFORE they make any money-in transaction.

    Why this exists:
    UK Consumer Contracts Regulations 2013 give consumers a 14-day
    right to cancel digital services purchased online. That right can
    be lawfully waived ONLY if the consumer (a) gives express prior
    consent to immediate performance, AND (b) explicitly acknowledges
    that they lose the right to cancel. A generic "no refunds" tickbox
    in the TOS is not sufficient — the consent must be tied to the
    specific transaction and recorded with evidence.

    Each row is the audit trail for one consent event. The
    `consent_text_hash` is the SHA-256 of the exact disclaimer text
    the user accepted; that lets us prove consent was given to the
    text in force at the time, even if we later update the disclaimer.
    `consent_version` is a human-readable label for the same thing.

    Validity:
      A consent is "fresh" for `CONSENT_VALIDITY_SECONDS` (default 300s
      = 5 minutes) — long enough to complete a checkout flow, short
      enough that someone can't pre-consent days in advance and use it
      to buy without seeing the latest disclaimer.

      `consumed_at` is stamped when the consent is used to authorise an
      actual purchase. A consent can only be consumed once — prevents
      one consent event from authorising multiple back-to-back
      purchases (which would defeat the per-transaction express-consent
      requirement).

      Created 2 May 2026, pre-soft-launch. See app/main.py for the
      consent capture endpoint and require_fresh_consent helper.
    """
    __tablename__ = "purchase_consents"
    id                = Column(Integer, primary_key=True, autoincrement=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # The text the user actually saw and accepted
    consent_version   = Column(String(20), nullable=False)   # e.g. "v1.0", "v1.1"
    consent_text_hash = Column(String(64), nullable=False)   # SHA-256 hex of the exact text
    # Evidence
    ip_address        = Column(String(50), nullable=True)
    user_agent        = Column(String(500), nullable=True)
    # Lifecycle
    created_at        = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    consumed_at       = Column(DateTime, nullable=True, index=True)
    # What the consent ultimately authorised — set when consumed.
    # Helpful for forensics: "show me which purchase this consent
    # authorised". Free-form because money-in transaction types vary.
    consumed_for      = Column(String(100), nullable=True)


class PasswordResetToken(Base):
    """One-time password reset tokens — expire after 1 hour."""
    __tablename__ = "password_reset_tokens"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), index=True)
    token      = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    used       = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class VideoCampaign(Base):
    """An advertiser's video campaign — URL-based, iframe embedded."""
    __tablename__ = "video_campaigns"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)
    title           = Column(String, nullable=False)
    description     = Column(Text, nullable=True)
    category        = Column(String, nullable=True)
    platform        = Column(String, nullable=False)   # youtube/rumble/vimeo
    video_url       = Column(String, nullable=False)   # original URL pasted
    embed_url       = Column(String, nullable=False)   # cleaned iframe src
    video_id        = Column(String, nullable=True)    # platform video ID
    status          = Column(String, default="active") # active/paused/completed/deleted
    views_target    = Column(Integer, default=2000)    # minimum tier-1 target; explicit per-tier values from CAMPAIGN_VIEW_TARGETS
    views_delivered = Column(Integer, default=0)       # tracked via watch system
    campaign_tier   = Column(Integer, default=1)       # which tier purchase this campaign is for
    is_completed    = Column(Boolean, default=False)   # True when views_delivered >= views_target
    completed_at    = Column(DateTime, nullable=True)  # when views target was reached
    grace_expires_at = Column(DateTime, nullable=True) # 14 days after completed_at — lose qualification after this
    purchase_number = Column(Integer, default=1)       # which purchase/repurchase cycle (1,2,3...)
    # Targeting (Advanced tier and above)
    target_country  = Column(String, nullable=True)    # ISO country or null=worldwide
    target_interests = Column(String, nullable=True)   # comma-separated interest tags
    # Demographics targeting (Advanced tier 4+)
    target_age_min  = Column(Integer, nullable=True)   # min age (e.g. 18)
    target_age_max  = Column(Integer, nullable=True)   # max age (e.g. 55)
    target_gender   = Column(String, nullable=True)    # "male","female","all" or null
    # Priority (Elite tier and above)
    priority_level  = Column(Integer, default=0)       # 0=normal, 1-4=priority tiers
    owner_tier      = Column(Integer, default=1)       # owner's package tier (1-8)
    # Featured & Spotlight (Premium tier 6+ / Executive 7+)
    is_featured     = Column(Boolean, default=False)   # auto-featured on public page
    is_spotlight    = Column(Boolean, default=False)   # brand spotlight (large card)
    # CTA — optional "Visit Website" button shown after watch completes
    cta_url         = Column(String, nullable=True)    # destination URL (validated on input)
    cta_clicks      = Column(Integer, default=0)       # total clicks through the CTA
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VideoWatch(Base):
    """Records every completed video watch (30s minimum met)."""
    __tablename__ = "video_watches"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)
    campaign_id     = Column(Integer, ForeignKey("video_campaigns.id"), index=True)
    watched_at      = Column(DateTime, default=datetime.utcnow)
    watch_date      = Column(String, index=True)   # YYYY-MM-DD for daily quota checks
    duration_secs   = Column(Integer, default=30)  # seconds watched
    # ── Apr 2026: server-side anti-cheat columns ──
    # started_at records when the user was ASSIGNED this video (a row gets
    # created at assignment time, before they've watched anything). Used to
    # enforce server-side that >= 30 seconds have actually passed before
    # accepting a "mark watched" request. is_complete distinguishes started
    # rows (False) from completed rows (True). Quota only counts complete.
    # Existing data is all completed (default True for migration compat).
    started_at      = Column(DateTime, nullable=True)
    is_complete     = Column(Boolean, default=True, nullable=False)


class WatchQuota(Base):
    """Daily quota tracking per member — updated each day."""
    __tablename__ = "watch_quotas"
    id                  = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    package_tier        = Column(Integer, default=1)      # 1-8, synced from active grid
    daily_required      = Column(Integer, default=1)      # videos required per day
    today_watched       = Column(Integer, default=0)      # reset daily
    today_date          = Column(String, nullable=True)   # YYYY-MM-DD of today's count
    consecutive_missed  = Column(Integer, default=0)      # days in a row below quota
    last_quota_met      = Column(String, nullable=True)   # YYYY-MM-DD last day quota met
    commissions_paused  = Column(Boolean, default=False)  # True after 5 missed days
    streak_days         = Column(Integer, default=0)      # consecutive days quota met
    total_watched       = Column(Integer, default=0)      # lifetime videos watched
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)



class MembershipRenewal(Base):
    """Tracks monthly membership renewal status per member."""
    __tablename__ = "membership_renewals"
    id                  = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    activated_at        = Column(DateTime, nullable=True)       # first activation date
    next_renewal_date   = Column(DateTime, nullable=True)       # when next $20 is due
    last_renewed_at     = Column(DateTime, nullable=True)       # last successful renewal
    renewal_source      = Column(String, default="wallet")      # wallet/referral/manual
    grace_period_start  = Column(DateTime, nullable=True)       # when grace period began
    in_grace_period     = Column(Boolean, default=False)
    total_renewals      = Column(Integer, default=0)
    # Auto-renew from balance: default True preserves the existing platform
    # behaviour (process_auto_renewals deducts $20 from balance if available).
    # New checkout flow (9 May 2026) lets members opt out at signup or via
    # account settings. When False, the renewal cron skips balance deduction
    # and instead sends a reminder + lapses the member after grace period.
    auto_renew_from_balance = Column(Boolean, default=True)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class P2PTransfer(Base):
    """Peer-to-peer wallet transfers between members."""
    __tablename__ = "p2p_transfers"
    id              = Column(Integer, primary_key=True, index=True)
    from_user_id    = Column(Integer, ForeignKey("users.id"), index=True)
    to_user_id      = Column(Integer, ForeignKey("users.id"), index=True)
    amount_usdt     = Column(Money)
    note            = Column(String, nullable=True)             # optional message
    status          = Column(String, default="completed")       # completed/reversed
    created_at      = Column(DateTime, default=datetime.utcnow)

class AIUsageQuota(Base):
    """Daily AI tool usage tracking per member."""
    __tablename__ = "ai_usage_quotas"
    id                  = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    quota_date          = Column(String, nullable=True)       # YYYY-MM-DD of current day
    campaign_studio_uses = Column(Integer, default=0)         # resets daily
    niche_finder_uses   = Column(Integer, default=0)          # resets daily
    campaign_studio_total = Column(Integer, default=0)        # lifetime total
    niche_finder_total  = Column(Integer, default=0)          # lifetime total
    social_posts_uses   = Column(Integer, default=0)          # resets daily
    social_posts_total  = Column(Integer, default=0)          # lifetime total
    video_scripts_uses  = Column(Integer, default=0)          # resets daily
    video_scripts_total = Column(Integer, default=0)          # lifetime total
    swipe_file_uses     = Column(Integer, default=0)          # resets daily
    swipe_file_total    = Column(Integer, default=0)          # lifetime total
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AIResponseCache(Base):
    """Cache AI responses to avoid duplicate API calls for identical prompts."""
    __tablename__ = "ai_response_cache"
    id          = Column(Integer, primary_key=True, index=True)
    tool        = Column(String, index=True)              # e.g. "niche_finder", "social_posts"
    prompt_hash = Column(String, index=True, unique=True) # SHA256 of the prompt
    response    = Column(Text)                            # cached JSON response
    hit_count   = Column(Integer, default=0)              # times served from cache
    created_at  = Column(DateTime, default=datetime.utcnow)
    expires_at  = Column(DateTime)                        # cache TTL

class FunnelPage(Base):
    """Member-created landing pages and funnel steps."""
    __tablename__ = "funnel_pages"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)
    slug            = Column(String, index=True)           # unique URL slug: username/page-name
    title           = Column(String, nullable=False)       # page title
    template_type   = Column(String, default="opportunity") # opportunity/optin/bridge/webinar/thankyou
    status          = Column(String, default="draft")      # draft/published
    # Content fields (legacy single-section)
    headline        = Column(Text, nullable=True)
    subheadline     = Column(Text, nullable=True)
    body_copy       = Column(Text, nullable=True)
    cta_text        = Column(String, nullable=True)
    cta_url         = Column(String, nullable=True)
    video_url       = Column(String, nullable=True)
    image_url       = Column(String, nullable=True)
    # Section-based content (JSON array of section objects)
    sections_json   = Column(Text, nullable=True)          # JSON: [{type,data,style}]
    # Style
    color_scheme    = Column(String, default="dark")
    accent_color    = Column(String, default="#00d4ff")
    custom_bg       = Column(String, default="")
    font_family     = Column(String, default="Rethink Sans")
    custom_css      = Column(Text, nullable=True)
    # GrapesJS visual editor data
    gjs_components  = Column(Text, nullable=True)          # JSON: GrapesJS components tree
    gjs_styles      = Column(Text, nullable=True)          # JSON: GrapesJS styles
    gjs_html        = Column(Text, nullable=True)          # compiled HTML from GrapesJS
    gjs_css         = Column(Text, nullable=True)          # compiled CSS from GrapesJS
    # SEO
    meta_description = Column(Text, nullable=True)
    og_image_url    = Column(String, nullable=True)
    # Funnel linking
    funnel_name     = Column(String, nullable=True)
    funnel_order    = Column(Integer, default=0)
    next_page_id    = Column(Integer, ForeignKey("funnel_pages.id"), nullable=True)
    # Tracking
    views           = Column(Integer, default=0)
    clicks          = Column(Integer, default=0)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # AI Funnel Generator (Pro tier)
    has_capture_form     = Column(Boolean, default=False)
    capture_form_heading = Column(String, nullable=True)
    capture_form_subtext = Column(String, nullable=True)
    capture_sequence_id  = Column(Integer, nullable=True)      # FK to email_sequences — the default sequence to run when this page captures a lead. Existed before Phase 1; Phase 1 makes this explicitly set at page-create time rather than inferred at capture time.
    # Phase 1 (Campaign Hub, 18 May 2026): explicit list binding. When
    # a form on this page captures a lead, the new MemberLead.list_id
    # is set to default_list_id automatically. Set at page-create via
    # the campaign-setup modal — either picks an existing list or
    # auto-creates one called "<Page title> leads".
    default_list_id      = Column(Integer, ForeignKey("lead_lists.id"), nullable=True, index=True)
    leads_captured       = Column(Integer, default=0)
    is_ai_generated      = Column(Boolean, default=False)
    ai_niche            = Column(String, nullable=True)
    ai_audience         = Column(String, nullable=True)
    ai_story            = Column(Text, nullable=True)
    ai_tone             = Column(String, nullable=True)
    # A/B testing
    ab_variant_of       = Column(Integer, ForeignKey("funnel_pages.id"), nullable=True)  # parent page ID
    ab_split_pct        = Column(Integer, default=50)  # traffic % to variant B (this page)


class VIPSignup(Base):
    __tablename__ = "vip_signups"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, nullable=False)
    email       = Column(String, nullable=False, unique=True)
    created_at  = Column(DateTime, default=datetime.utcnow)


class ShortLink(Base):
    """Bitly-style short links: superadpro.com/go/slug"""
    __tablename__ = "short_links"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)
    slug            = Column(String, unique=True, index=True)    # the /go/slug part
    destination_url = Column(Text, nullable=False)                # long URL
    title           = Column(String, nullable=True)               # optional label
    clicks          = Column(Integer, default=0)
    last_clicked    = Column(DateTime, nullable=True)
    is_rotator      = Column(Boolean, default=False)
    rotator_id      = Column(Integer, ForeignKey("link_rotators.id"), nullable=True)
    # Smart redirect features
    click_cap       = Column(Integer, nullable=True)              # deactivate after N clicks
    expires_at      = Column(DateTime, nullable=True)             # deactivate after date
    geo_redirect_json    = Column(Text, nullable=True)            # JSON: {country_code: url}
    device_redirect_json = Column(Text, nullable=True)            # JSON: {mobile: url, desktop: url}
    password_hash   = Column(String, nullable=True)               # bcrypt hash for password-protected links
    tags_json       = Column(Text, nullable=True)                 # JSON: ["tag1","tag2"]
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LinkRotator(Base):
    """Rotates traffic across multiple destination URLs."""
    __tablename__ = "link_rotators"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)
    slug            = Column(String, unique=True, index=True)    # the /go/slug for the rotator
    title           = Column(String, nullable=False)
    mode            = Column(String, default="equal")            # equal / weighted
    destinations_json = Column(Text, nullable=True)              # JSON: [{url, weight, clicks}]
    total_clicks    = Column(Integer, default=0)
    last_clicked    = Column(DateTime, nullable=True)
    current_index   = Column(Integer, default=0)                 # for round-robin
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LinkClick(Base):
    """Individual click event for analytics — tracks source, time, device and geo."""
    __tablename__ = "link_clicks"
    id              = Column(Integer, primary_key=True, index=True)
    link_id         = Column(Integer, index=True)
    link_type       = Column(String, default="short")   # "short" or "rotator"
    source          = Column(String, nullable=True)      # facebook, google, direct, etc.
    referrer        = Column(Text, nullable=True)
    country         = Column(String, nullable=True)      # ISO code e.g. "GB"
    country_name    = Column(String, nullable=True)      # Full name e.g. "United Kingdom"
    device          = Column(String, nullable=True)      # mobile / desktop / tablet
    browser         = Column(String, nullable=True)      # chrome / safari / firefox / edge
    utm_source      = Column(String, nullable=True)
    utm_medium      = Column(String, nullable=True)
    utm_campaign    = Column(String, nullable=True)
    clicked_at      = Column(DateTime, default=datetime.utcnow, index=True)


class FunnelLead(Base):
    """Captured leads from funnel opt-in forms."""
    __tablename__ = "funnel_leads"
    id          = Column(Integer, primary_key=True, index=True)
    page_id     = Column(Integer, ForeignKey("funnel_pages.id"), index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), index=True)   # page owner
    name        = Column(String, nullable=True)
    email       = Column(String, nullable=False)
    phone       = Column(String, nullable=True)
    source      = Column(String, nullable=True)       # direct, facebook, google, etc.
    ip_address  = Column(String, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)


class FunnelEvent(Base):
    """Analytics events for funnel pages — views, clicks, conversions."""
    __tablename__ = "funnel_events"
    id          = Column(Integer, primary_key=True, index=True)
    page_id     = Column(Integer, ForeignKey("funnel_pages.id"), index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), index=True)   # page owner
    event_type  = Column(String, nullable=False)       # view, click, optin, purchase
    referrer    = Column(Text, nullable=True)
    device      = Column(String, nullable=True)
    ip_address  = Column(String, nullable=True)
    meta_json   = Column(Text, nullable=True)          # extra data as JSON
    created_at  = Column(DateTime, default=datetime.utcnow)


class SignupFunnelEvent(Base):
    """Signup → activation funnel instrumentation (added 24 May 2026).

    Tracks where Free users drop off between registration and paid activation.
    Distinct from FunnelEvent (which tracks member-built FunnelPages); this
    table is for platform-level conversion analytics.

    Events fired (so far):
      - 'dashboard_view_inactive': Free user landed on /dashboard
      - 'upgrade_view_inactive':   Free user landed on /upgrade

    Idempotent per (user_id, event, UTC date) — fired at most once per day so
    repeated dashboard refreshes don't inflate the denominator. The endpoint
    handler enforces this with an existence check before insert.

    Stops firing once user.is_active=True — we only care about the
    pre-activation funnel here.
    """
    __tablename__ = "signup_funnel_events"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event      = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class MarketingAsset(Base):
    """Admin-curated marketing landing pages members can share with their
    referral link automatically baked in (added 23 May 2026).

    Served at /m/<slug>/<username> — short URL pattern so it fits any social
    platform's character budget. When a visitor hits that URL the handler:
      1. Looks up asset by slug (404 if missing or unpublished)
      2. Looks up the member by username (404 if missing)
      3. Substitutes placeholders in html_template:
         - {{ACTIVATION_URL}} → /register?ref=<username>
         - {{REFERRAL_URL}}   → https://www.superadpro.com/ref/<username>
         - {{USERNAME}}       → <username>
         - {{FIRST_NAME}}     → member's first_name (or username if blank)
      4. Sets the standard 'ref' cookie to <username> (30-day, samesite=lax)
         so the existing /api/register handler attributes the sponsor
         identically to /ref/<username> and /join/<username>
      5. Logs a MarketingAssetVisit row for asset-level analytics

    html_template is the full HTML page (already produced collaboratively
    via the chat workflow). Storing the whole template per asset means we
    can iterate on a page without code deploys.
    """
    __tablename__ = "marketing_assets"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    slug            = Column(String(32), nullable=False, unique=True, index=True)
    title           = Column(String(200), nullable=False)
    description     = Column(Text, nullable=True)
    asset_type      = Column(String(20), default="page", nullable=False)  # 'page' | 'video' | 'image'
    html_template   = Column(Text, nullable=True)
    hero_image_path = Column(String(500), nullable=True)
    thumbnail_path  = Column(String(500), nullable=True)
    video_url       = Column(String(500), nullable=True)
    is_published    = Column(Boolean, default=False, nullable=False, index=True)
    published_at    = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class MarketingAssetVisit(Base):
    """One row per visit to /m/<slug>/<username>. Enables both per-asset
    analytics (which asset converts best?) and per-member analytics
    (which member's shares get the most traction?).

    signup_attributed_user_id is populated by the registration handler
    when a new signup arrives with a 'ref' cookie matching this visit's
    member_username AND the visit happened within the cookie's 30-day
    window. Joined on (member_username, IP hash, created_at) — best-effort
    attribution, not strict.
    """
    __tablename__ = "marketing_asset_visits"
    id                         = Column(Integer, primary_key=True, autoincrement=True)
    asset_id                   = Column(Integer, ForeignKey("marketing_assets.id"), nullable=False, index=True)
    member_username            = Column(String(50), nullable=False, index=True)
    visitor_ip_hash            = Column(String(64), nullable=True)
    user_agent                 = Column(String(500), nullable=True)
    signup_attributed_user_id  = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at                 = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class WatchdogLog(Base):
    """AI Watchdog activity log — every check, fix, and escalation."""
    __tablename__ = "watchdog_logs"
    id          = Column(Integer, primary_key=True, index=True)
    run_type    = Column(String, nullable=False)       # health_check, auto_fix, ai_escalation, alert
    status      = Column(String, default="ok")         # ok, warning, error, fixed
    summary     = Column(Text, nullable=False)
    details     = Column(Text, nullable=True)          # JSON detail
    ai_used     = Column(Boolean, default=False)
    ai_model    = Column(String, nullable=True)
    ai_tokens   = Column(Integer, default=0)
    created_at  = Column(DateTime, default=datetime.utcnow)


class LinkHubProfile(Base):
    """LinkHub — user's public bio link page (Linktree-style)."""
    __tablename__ = "linkhub_profiles"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    display_name    = Column(String, nullable=True)
    bio             = Column(Text, nullable=True)
    avatar_data     = Column(Text, nullable=True)          # base64 data URL — legacy, migrating to R2
    avatar_r2_url   = Column(String, nullable=True)        # R2 public URL for avatar
    banner_r2_url   = Column(String, nullable=True)        # R2 public URL for banner
    bg_r2_url       = Column(String, nullable=True)        # R2 public URL for background
    theme           = Column(String, default="dark")       # dark|light|gradient|neon|minimal
    bg_color        = Column(String, default="#050d1a")
    btn_color       = Column(String, nullable=True)
    btn_text_color  = Column(String, nullable=True)        # button text/icon colour
    text_color      = Column(String, nullable=True)
    accent_color    = Column(String, default="#00d4ff")
    font_family     = Column(String, default="Rethink Sans")
    is_published    = Column(Boolean, default=True)
    total_views     = Column(Integer, default=0)
    social_links    = Column(Text, nullable=True)          # JSON: [{platform, url}]
    banner_image    = Column(Text, nullable=True)          # base64 header banner
    bg_image        = Column(Text, nullable=True)          # base64 background image
    bg_gradient     = Column(String, nullable=True)        # e.g. "135deg,#ff6b35,#f7c59f"
    soc_icon_shape  = Column(String, default="circle")     # circle|square|pill
    follower_count  = Column(String, nullable=True)        # e.g. "12.4K"
    btn_style_type  = Column(String, default="3d")         # flat|3d|outline
    btn_radius      = Column(String, default="12px")       # 6px|12px|50px
    btn_font_size   = Column(Integer, default=15)          # 8-40px
    btn_align       = Column(String, default="center")     # left|center|right
    arrow_style     = Column(String, default="arrow")      # none|arrow|chevron|double|triangle|circle|dash
    icon_size       = Column(Integer, default=22)          # 12-36px
    arrow_size      = Column(Integer, default=16)          # 10-32px
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow)

class LinkHubLink(Base):
    """Individual link inside a LinkHub profile."""
    __tablename__ = "linkhub_links"
    id              = Column(Integer, primary_key=True, index=True)
    profile_id      = Column(Integer, ForeignKey("linkhub_profiles.id"), index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)
    title           = Column(String, nullable=False)
    url             = Column(String, nullable=False)
    icon            = Column(String, default="🔗")         # emoji or icon key
    btn_style       = Column(String, default="filled")     # filled|pill|solid
    subtitle        = Column(String, nullable=True)        # optional sub-label
    font_size       = Column(Integer, default=14)          # px
    font_weight     = Column(String, default="semibold")   # normal|semibold|bold|black
    text_align      = Column(String, default="center")     # left|center|right
    thumbnail       = Column(Text, nullable=True)          # base64 link thumbnail
    btn_bg_color    = Column(String, nullable=True)        # per-link bg colour override
    btn_text_color  = Column(String, nullable=True)        # per-link text colour override
    is_active       = Column(Boolean, default=True)
    sort_order      = Column(Integer, default=0)
    click_count     = Column(Integer, default=0)
    created_at      = Column(DateTime, default=datetime.utcnow)

class LinkHubClick(Base):
    """Click analytics for LinkHub links."""
    __tablename__ = "linkhub_clicks"
    id              = Column(Integer, primary_key=True, index=True)
    link_id         = Column(Integer, ForeignKey("linkhub_links.id"), index=True)
    profile_id      = Column(Integer, ForeignKey("linkhub_profiles.id"), index=True)
    referrer        = Column(String, nullable=True)
    device          = Column(String, nullable=True)        # mobile|desktop|tablet
    browser         = Column(String, nullable=True)        # chrome|safari|firefox|edge|other
    country         = Column(String, nullable=True)        # ISO code e.g. GB
    country_name    = Column(String, nullable=True)        # Full name e.g. United Kingdom
    source          = Column(String, nullable=True)        # facebook|google|direct|etc
    utm_source      = Column(String, nullable=True)
    utm_medium      = Column(String, nullable=True)
    utm_campaign    = Column(String, nullable=True)
    clicked_at      = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    """Platform notifications for members."""
    __tablename__ = "notifications"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), index=True)
    type        = Column(String, nullable=False)         # referral, commission, achievement, system
    icon        = Column(String, default="🔔")
    title       = Column(String, nullable=False)
    message     = Column(String, nullable=False)
    link        = Column(String, nullable=True)          # optional action URL
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    # Optional i18n key. When present, frontend translates title/message
    # against the user's current locale instead of using the literal text.
    # See Layer 3 of Command Centre — re-engagement notifications need
    # to render in the recipient's language regardless of when created.
    translation_key = Column(String, nullable=True)

    user = relationship("User", backref="notifications")


class Achievement(Base):
    """Badges and milestones earned by members."""
    __tablename__ = "achievements"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), index=True)
    badge_id    = Column(String, nullable=False)          # unique key e.g. 'first_referral'
    title       = Column(String, nullable=False)
    icon        = Column(String, default="🏆")
    earned_at   = Column(DateTime, default=datetime.utcnow)
    # Per-instance data carried with this specific award. JSON string.
    # Example for grid_bonus_paid: '{"amount": 72.0, "tier": 1}' so the
    # badge can display the exact bonus the member earned, not just the
    # generic title. Added 26 May 2026. Optional, defaults to NULL on
    # historical rows.
    metadata_json = Column(Text, nullable=True)

    user = relationship("User", backref="achievements")


# Badge definitions — checked automatically
BADGES = {
    "first_login":      {"icon": "👋", "title": "Welcome!",           "desc": "Logged in for the first time"},
    "profile_complete": {"icon": "🪪", "title": "Identity Set",       "desc": "Completed your profile"},
    "first_referral":   {"icon": "🤝", "title": "First Referral",     "desc": "Referred your first member"},
    "team_of_5":        {"icon": "👥", "title": "Squad Leader",       "desc": "Built a team of 5 members"},
    "team_of_10":       {"icon": "🔥", "title": "Team Builder",       "desc": "Built a team of 10 members"},
    "team_of_25":       {"icon": "⚡", "title": "Growth Machine",     "desc": "Built a team of 25 members"},
    "team_of_50":       {"icon": "🚀", "title": "Empire Builder",     "desc": "Built a team of 50 members"},
    "first_100":        {"icon": "💰", "title": "First $100",         "desc": "Earned your first $100"},
    "earned_500":       {"icon": "💎", "title": "$500 Club",          "desc": "Earned $500 in total"},
    "earned_1000":      {"icon": "🏆", "title": "$1,000 Milestone",   "desc": "Earned $1,000 in total"},
    "earned_5000":      {"icon": "👑", "title": "$5,000 Legend",      "desc": "Earned $5,000 in total"},
    "founding_member":  {"icon": "⭐", "title": "Founding Partner",   "desc": "Claimed one of the 100 founding spots ($15/mo locked for life)"},
    "first_funnel":     {"icon": "📄", "title": "Funnel Creator",     "desc": "Created your first funnel page"},
    "first_linkhub":    {"icon": "🔗", "title": "Link Master",        "desc": "Created your LinkHub page"},
    "grid_tier_3":      {"icon": "📊", "title": "Grid Climber",       "desc": "Reached Campaign Tier 3"},
    "grid_tier_5":      {"icon": "🎯", "title": "Grid Commander",     "desc": "Reached Campaign Tier 5"},
    "grid_tier_8":      {"icon": "🌟", "title": "Grid Legend",        "desc": "Completed all 8 campaign tiers"},
    "grid_bonus_paid":  {"icon": "♛", "title": "Grid Bonus Earned",  "desc": "Filled a 36-seat campaign grid — completion bonus paid into your wallet"},
}


class NurtureSequence(Base):
    """Tracks free members through the 5-email nurture campaign."""
    __tablename__ = "nurture_sequences"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    next_email      = Column(Integer, default=1)           # 1-5, which email to send next
    next_send_at    = Column(DateTime, nullable=True)      # when to send it
    completed       = Column(Boolean, default=False)       # all 5 sent or cancelled
    cancelled_at    = Column(DateTime, nullable=True)      # set when user pays
    created_at      = Column(DateTime, default=datetime.utcnow)
    last_sent_at    = Column(DateTime, nullable=True)


class Prospect(Base):
    """ProSeller CRM — prospect pipeline for affiliates."""
    __tablename__ = "prospects"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)  # the affiliate
    name            = Column(String, nullable=False)
    platform        = Column(String, nullable=True)        # instagram/whatsapp/facebook/linkedin/twitter/text
    source          = Column(String, nullable=True)        # how they found them: cold_dm, fb_group, referral, link_click, etc.
    stage           = Column(String, default="cold")       # cold/contacted/interested/objecting/hot/closing/converted/lost
    notes           = Column(Text, nullable=True)
    link_clicks     = Column(Integer, default=0)           # how many times this prospect clicked the affiliate's link
    last_contact_at = Column(DateTime, nullable=True)      # last time affiliate messaged them
    follow_up_at    = Column(DateTime, nullable=True)      # next follow-up due date
    is_converted    = Column(Boolean, default=False)       # True when they sign up
    converted_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # their user ID if they joined
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProSellerMessage(Base):
    """Log of AI-generated messages for analytics and caching."""
    __tablename__ = "proseller_messages"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)
    prospect_id     = Column(Integer, ForeignKey("prospects.id"), nullable=True)
    message_type    = Column(String)                       # cold_opener/objection/followup/closing
    platform        = Column(String, nullable=True)        # target platform
    situation       = Column(String, nullable=True)        # the scenario or objection key
    prompt_context  = Column(Text, nullable=True)          # what the affiliate typed/selected
    generated_text  = Column(Text, nullable=True)          # the AI response
    was_copied      = Column(Boolean, default=False)       # did they copy it?
    created_at      = Column(DateTime, default=datetime.utcnow)


class EmailSequence(Base):
    """AI-generated autoresponder sequences owned by each Pro member."""
    __tablename__ = "email_sequences"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)
    title           = Column(String, nullable=True)        # e.g. 'Fitness Niche Welcome Sequence'
    niche           = Column(String, nullable=True)
    tone            = Column(String, nullable=True)        # professional/casual/motivational/straight-talking
    num_emails      = Column(Integer, default=5)
    emails_json     = Column(Text, nullable=True)          # JSON: [{subject, body_html, send_delay_days}]
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)


class LeadList(Base):
    """Named lists for organizing leads by campaign/source/niche."""
    __tablename__ = "lead_lists"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), index=True)
    name        = Column(String(100), nullable=False)
    description = Column(String(300), nullable=True)
    color       = Column(String(10), default="#0ea5e9")    # hex colour for visual tag
    lead_count  = Column(Integer, default=0)
    sequence_id = Column(Integer, ForeignKey("email_sequences.id"), nullable=True)  # default sequence for this list
    created_at  = Column(DateTime, default=datetime.utcnow)


class ShareCode(Base):
    """Portable page-share codes (SAP-XXXX-XXXX).

    Lets members hand other members a self-contained snapshot of a
    FunnelPage that imports as a fresh draft. Page-only by design —
    list and sequence bindings are NOT carried across; the importer
    wires their own campaign on import via the Phase 1 modal flow.

    Visibility:
      - is_public=False (default) — private, only the code-holder can import
      - is_public=True            — appears in the admin-curated marketplace

    Spec locked 18 May 2026: no attribution shown to importers, ever.
    The owner_user_id column is admin-side tracking only — used for
    abuse handling and marketplace submission audit. It is NEVER
    exposed in the import payload or any public-facing endpoint.

    payload_json is the canonical snapshot. Schema-versioned via the
    top-level "v" key so importers stay forward-compatible across
    future FunnelPage column additions.
    """
    __tablename__ = "share_codes"
    id            = Column(Integer, primary_key=True, index=True)
    code          = Column(String(20), unique=True, index=True, nullable=False)  # SAP-XXXX-XXXX
    owner_user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    source_page_id = Column(Integer, ForeignKey("funnel_pages.id"), nullable=True)  # nullable: page may be deleted later
    payload_json  = Column(Text, nullable=False)           # full v1 snapshot
    is_public     = Column(Boolean, default=False, index=True)  # admin-flipped for marketplace
    uses_count    = Column(Integer, default=0)             # incremented per successful import
    created_at    = Column(DateTime, default=datetime.utcnow)
    expires_at    = Column(DateTime, nullable=True)        # NULL = never expires; reserved for future revocation


class MemberLead(Base):
    """Email leads captured by each member's funnel forms (Pro tier)."""
    __tablename__ = "member_leads"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), index=True)   # the affiliate
    email           = Column(String, nullable=False)
    name            = Column(String, nullable=True)
    source_funnel_id = Column(Integer, ForeignKey("funnel_pages.id"), nullable=True)
    source_url      = Column(String, nullable=True)
    list_id         = Column(Integer, ForeignKey("lead_lists.id"), nullable=True, index=True)
    brevo_contact_id = Column(String, nullable=True)       # Brevo's contact ID
    status          = Column(String, default="new")        # new/nurturing/hot/converted/unsubscribed
    email_sequence_id = Column(Integer, ForeignKey("email_sequences.id"), nullable=True)
    emails_sent     = Column(Integer, default=0)
    emails_opened   = Column(Integer, default=0)
    emails_clicked  = Column(Integer, default=0)
    last_opened_at  = Column(DateTime, nullable=True)
    last_clicked_at = Column(DateTime, nullable=True)
    is_hot          = Column(Boolean, default=False)       # auto-flagged: opens > 2 or clicks > 0
    # When a lead's email matches a User who later activates Partner
    # membership, we set attribution_user_id to that user's id. This is
    # the link that makes per-page commission attribution possible — the
    # campaign dashboard joins MemberLead -> User -> Commission via this
    # field to answer "which page earned me $X this month?". Set by the
    # _attribute_lead_to_activation helper called from
    # initialise_renewal_record (the unified post-activation hook).
    attribution_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    attribution_set_at  = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmailSendLog(Base):
    """Tracks every email sent through a member's autoresponder."""
    __tablename__ = "email_send_log"
    id              = Column(Integer, primary_key=True, index=True)
    lead_id         = Column(Integer, ForeignKey("member_leads.id"), index=True)
    sequence_id     = Column(Integer, ForeignKey("email_sequences.id"))
    email_index     = Column(Integer)                      # which email in the sequence (1, 2, 3...)
    brevo_message_id = Column(String, nullable=True)       # from Brevo API response
    status          = Column(String, default="sent")       # sent/opened/clicked/bounced
    sent_at         = Column(DateTime, default=datetime.utcnow)
    opened_at       = Column(DateTime, nullable=True)
    clicked_at      = Column(DateTime, nullable=True)


class BroadcastLog(Base):
    """Platform-broadcast email audit trail.

    Distinct from EmailSendLog (which tracks autoresponder sends to
    member-owned leads). This tracks broadcasts FROM SuperAdPro TO
    members — e.g. pricing changes, feature launches, founding offer
    announcements. One row per recipient per broadcast.

    Added 16 May 2026 for the Founding Partner pricing broadcast.
    """
    __tablename__ = "broadcast_log"
    id               = Column(Integer, primary_key=True, index=True)
    broadcast_key    = Column(String(64), index=True, nullable=False)  # e.g. "founder_offer_2026_05"
    user_id          = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    email_address    = Column(String, nullable=False)  # snapshot at send time
    brevo_message_id = Column(String, nullable=True)
    status           = Column(String, default="sent")  # sent | failed | skipped
    error_message    = Column(Text, nullable=True)
    sent_at          = Column(DateTime, default=datetime.utcnow, index=True)


# ═══════════════════════════════════════════════════════════════
#  MEMBER COURSE MARKETPLACE
# ═══════════════════════════════════════════════════════════════

class TeamMessage(Base):
    """Direct messages between sponsors and their referrals."""
    __tablename__ = "team_messages"
    id            = Column(Integer, primary_key=True, index=True)
    from_user_id  = Column(Integer, ForeignKey("users.id"), index=True)
    to_user_id    = Column(Integer, ForeignKey("users.id"), index=True)
    message       = Column(Text, nullable=False)
    is_read       = Column(Boolean, default=False)
    is_broadcast  = Column(Boolean, default=False)  # True when this row was created by the broadcast endpoint, surfaced in UI as a small "Broadcast" tag so recipients know the message wasn't personally written to them
    created_at    = Column(DateTime, default=datetime.utcnow)


class MemberCourse(Base):
    """Course created by a Pro member for the marketplace."""
    __tablename__ = "member_courses"
    id                    = Column(Integer, primary_key=True, index=True)
    creator_id            = Column(Integer, ForeignKey("users.id"), index=True)
    title                 = Column(String(100), nullable=False)
    slug                  = Column(String, unique=True, index=True)
    description           = Column(Text, nullable=True)
    short_description     = Column(String(160), nullable=True)
    price                 = Column(Numeric(10, 2), nullable=False)
    thumbnail_url         = Column(String, nullable=True)
    category              = Column(String, nullable=True)       # marketing, crypto, fitness, business, tech, lifestyle, creative, other
    difficulty_level      = Column(String, default="beginner")  # beginner, intermediate, advanced
    status                = Column(String, default="draft")     # draft, pending_review, ai_rejected, approved, published, suspended
    ai_review_result      = Column(Text, nullable=True)         # JSON: plagiarism score, flagged issues, pass/fail
    ai_reviewed_at        = Column(DateTime, nullable=True)
    admin_reviewed_at     = Column(DateTime, nullable=True)
    admin_notes           = Column(Text, nullable=True)
    total_sales           = Column(Integer, default=0)
    total_revenue         = Column(Numeric(12, 2), default=0)
    total_duration_mins   = Column(Integer, default=0)
    lesson_count          = Column(Integer, default=0)
    is_public             = Column(Boolean, default=True)
    creator_agreed_terms_at = Column(DateTime, nullable=True)
    created_at            = Column(DateTime, default=datetime.utcnow)
    updated_at            = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Relationships
    chapters              = relationship("MemberCourseChapter", back_populates="course", cascade="all, delete-orphan", order_by="MemberCourseChapter.chapter_order")


class MemberCourseChapter(Base):
    """Organises lessons into chapters within a member course."""
    __tablename__ = "member_course_chapters"
    id              = Column(Integer, primary_key=True, index=True)
    course_id       = Column(Integer, ForeignKey("member_courses.id", ondelete="CASCADE"), index=True)
    title           = Column(String, nullable=False)
    chapter_order   = Column(Integer, default=0)
    # Relationships
    course          = relationship("MemberCourse", back_populates="chapters")
    lessons         = relationship("MemberCourseLesson", back_populates="chapter", cascade="all, delete-orphan", order_by="MemberCourseLesson.lesson_order")


class MemberCourseLesson(Base):
    """Individual lesson within a chapter of a member course."""
    __tablename__ = "member_course_lessons"
    id              = Column(Integer, primary_key=True, index=True)
    chapter_id      = Column(Integer, ForeignKey("member_course_chapters.id", ondelete="CASCADE"), index=True)
    course_id       = Column(Integer, ForeignKey("member_courses.id"), index=True)    # denormalised for queries
    title           = Column(String, nullable=False)
    lesson_order    = Column(Integer, default=0)
    content_type    = Column(String, default="text")   # video, text, pdf, mixed
    video_url       = Column(String, nullable=True)
    text_content    = Column(Text, nullable=True)       # rich text HTML
    pdf_url         = Column(String, nullable=True)
    duration_minutes = Column(Integer, default=0)
    is_preview      = Column(Boolean, default=False)    # free preview lesson
    # Relationships
    chapter         = relationship("MemberCourseChapter", back_populates="lessons")


class MemberCoursePurchase(Base):
    """Records a purchase of a member-created course."""
    __tablename__ = "member_course_purchases"
    id                  = Column(Integer, primary_key=True, index=True)
    course_id           = Column(Integer, ForeignKey("member_courses.id"), index=True)
    buyer_id            = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # null for guest
    buyer_email         = Column(String, nullable=True)
    buyer_name          = Column(String, nullable=True)
    amount_paid         = Column(Numeric(10, 2), nullable=False)
    creator_commission  = Column(Numeric(10, 2), nullable=False)   # 50%
    sponsor_commission  = Column(Numeric(10, 2), nullable=False)   # 25%
    company_commission  = Column(Numeric(10, 2), nullable=False)   # 25%
    sponsor_id          = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # who got sponsor commission
    payment_method      = Column(String, default="stripe")         # stripe, wallet, crypto
    payment_ref         = Column(String, nullable=True)            # Stripe payment intent ID
    status              = Column(String, default="completed")      # completed, refunded, disputed
    access_token        = Column(String, unique=True, nullable=True)  # token-based access for guests
    refunded_at         = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════
# SUPERMARKET — Digital Product Marketplace (50/25/25)
# ═══════════════════════════════════════════════════════════════

class DigitalProduct(Base):
    """A digital product listed on SuperMarket for download/sale."""
    __tablename__ = "digital_products"
    id                    = Column(Integer, primary_key=True, index=True)
    creator_id            = Column(Integer, ForeignKey("users.id"), index=True)
    title                 = Column(String(120), nullable=False)
    slug                  = Column(String, unique=True, index=True)
    short_description     = Column(String(200), nullable=True)
    description           = Column(Text, nullable=True)              # rich text sales page content
    price                 = Column(Numeric(10, 2), nullable=False)
    compare_price         = Column(Numeric(10, 2), nullable=True)    # original price for "was $X" display
    banner_url            = Column(Text, nullable=True)              # product banner/thumbnail
    category              = Column(String, default="other")          # ebook, template, software, audio, graphics, other
    tags                  = Column(String, nullable=True)            # comma-separated tags for search
    # Product files
    file_url              = Column(Text, nullable=True)              # main downloadable file (base64 or R2 URL)
    file_name             = Column(String, nullable=True)            # original filename for display
    file_size_bytes       = Column(Integer, nullable=True)           # file size for display
    bonus_file_url        = Column(Text, nullable=True)              # optional bonus file
    bonus_file_name       = Column(String, nullable=True)
    # Sales page extras
    features_json         = Column(Text, nullable=True)              # JSON array of feature bullet points
    faq_json              = Column(Text, nullable=True)              # JSON array of {q, a} FAQ items
    demo_url              = Column(String, nullable=True)            # link to demo/preview
    video_url             = Column(String, nullable=True)            # sales video (YouTube/Vimeo)
    # Affiliate settings
    affiliate_commission  = Column(Integer, default=25)              # affiliate % (default 25%)
    affiliate_approved_only = Column(Boolean, default=False)         # require approval to promote
    promo_materials_json  = Column(Text, nullable=True)              # JSON: email swipes, banners, social posts
    # Review & compliance
    status                = Column(String, default="draft")          # draft, pending_review, approved, published, suspended
    ai_review_result      = Column(Text, nullable=True)              # JSON scan results
    ai_reviewed_at        = Column(DateTime, nullable=True)
    admin_reviewed_at     = Column(DateTime, nullable=True)
    admin_notes           = Column(Text, nullable=True)
    creator_agreed_terms  = Column(Boolean, default=False)
    creator_agreed_at     = Column(DateTime, nullable=True)
    # Stats
    total_sales           = Column(Integer, default=0)
    total_revenue         = Column(Numeric(12, 2), default=0)
    total_affiliates      = Column(Integer, default=0)
    conversion_rate       = Column(Numeric(5, 2), default=0)         # sales/clicks %
    total_clicks          = Column(Integer, default=0)
    total_refunds         = Column(Integer, default=0)
    avg_rating            = Column(Numeric(3, 2), default=0)
    review_count          = Column(Integer, default=0)
    is_featured           = Column(Boolean, default=False)
    # Timestamps
    created_at            = Column(DateTime, default=datetime.utcnow)
    updated_at            = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at          = Column(DateTime, nullable=True)


class DigitalProductPurchase(Base):
    """Records a purchase of a SuperMarket digital product."""
    __tablename__ = "digital_product_purchases"
    id                  = Column(Integer, primary_key=True, index=True)
    product_id          = Column(Integer, ForeignKey("digital_products.id"), index=True)
    buyer_id            = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    buyer_email         = Column(String, nullable=True)
    buyer_name          = Column(String, nullable=True)
    amount_paid         = Column(Numeric(10, 2), nullable=False)
    creator_commission  = Column(Numeric(10, 2), nullable=False)     # 50%
    affiliate_commission = Column(Numeric(10, 2), nullable=False)    # 25%
    platform_commission = Column(Numeric(10, 2), nullable=False)     # 25%
    affiliate_id        = Column(Integer, ForeignKey("users.id"), nullable=True)  # who referred the sale
    payment_method      = Column(String, default="stripe")
    payment_ref         = Column(String, nullable=True)
    status              = Column(String, default="completed")        # completed, refunded, disputed
    download_token      = Column(String, unique=True, nullable=True) # token for download access
    download_count      = Column(Integer, default=0)
    refunded_at         = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)


class DigitalProductReview(Base):
    """Buyer review/rating for a SuperMarket product."""
    __tablename__ = "digital_product_reviews"
    id          = Column(Integer, primary_key=True, index=True)
    product_id  = Column(Integer, ForeignKey("digital_products.id"), index=True)
    buyer_id    = Column(Integer, ForeignKey("users.id"), index=True)
    rating      = Column(Integer, nullable=False)           # 1-5 stars
    title       = Column(String(100), nullable=True)
    comment     = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=True)             # verified purchase
    created_at  = Column(DateTime, default=datetime.utcnow)


class DigitalProductAffiliate(Base):
    """Tracks which affiliates are approved to promote a product."""
    __tablename__ = "digital_product_affiliates"
    id          = Column(Integer, primary_key=True, index=True)
    product_id  = Column(Integer, ForeignKey("digital_products.id"), index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), index=True)
    status      = Column(String, default="approved")        # pending, approved, rejected
    clicks      = Column(Integer, default=0)
    sales       = Column(Integer, default=0)
    earnings    = Column(Numeric(10, 2), default=0)
    created_at  = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════
# SUPERSELLER — AI Sales Autopilot
# ═══════════════════════════════════════════════════════════════

class CoPilotBriefing(Base):
    """Daily AI Co-Pilot briefing cached per user."""
    __tablename__ = "copilot_briefings"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    briefing_date = Column(String, nullable=False)          # YYYY-MM-DD
    narrative    = Column(Text, nullable=True)               # AI morning briefing text
    actions      = Column(Text, nullable=True)               # JSON list of action cards
    generated_at = Column(DateTime, default=datetime.utcnow)

class SuperSellerCampaign(Base):
    __tablename__ = "superseller_campaigns"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # Campaign type: 'superadpro' (default full pipeline) or 'custom' (custom offer agent)
    campaign_type   = Column(String(20), default="superadpro")
    # Setup wizard inputs
    niche           = Column(String(200), nullable=False)
    audience        = Column(Text)
    tone            = Column(String(50), default="professional")
    goal            = Column(String(50), default="lead_generation")
    # Generated assets (JSON)
    landing_page_html = Column(Text)
    social_posts_json = Column(Text)
    email_sequence_json = Column(Text)
    video_scripts_json = Column(Text)
    ad_copy_json    = Column(Text)
    strategy_json   = Column(Text)
    # Funnel & tracking
    funnel_url      = Column(String(500))
    landing_page_id = Column(Integer, nullable=True)
    brevo_list_id   = Column(Integer, nullable=True)
    # Custom AI Agent fields
    offer_name      = Column(String(200))          # "Crypto Mastery Course"
    offer_url       = Column(String(500))           # The affiliate link
    offer_description = Column(Text)                # What the product does
    offer_pricing   = Column(Text)                  # Pricing details
    offer_benefits  = Column(Text)                  # Key benefits (JSON or text)
    offer_objections = Column(Text)                 # Common objections + answers (JSON or text)
    offer_extra_context = Column(Text)              # Any extra info the agent should know
    agent_name      = Column(String(100))           # Custom agent name e.g. "CryptoBot"
    agent_greeting  = Column(Text)                  # Custom welcome message
    # Stats
    leads_count     = Column(Integer, default=0)
    conversions_count = Column(Integer, default=0)
    link_clicks     = Column(Integer, default=0)
    page_views      = Column(Integer, default=0)
    chat_conversations = Column(Integer, default=0)
    # Page customizations (editor overrides)
    custom_video_url    = Column(String(500), nullable=True)   # YouTube/Vimeo/MP4
    custom_headline     = Column(String(300), nullable=True)
    custom_subtitle     = Column(Text, nullable=True)
    custom_cta_text     = Column(String(100), nullable=True)
    custom_cta_color    = Column(String(20), nullable=True)    # hex
    custom_html_inject  = Column(Text, nullable=True)          # tracking pixels, scripts
    # Status
    status          = Column(String(20), default="generating")
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GiftVoucher(Base):
    """Pay It Forward gift vouchers — members gift memberships/tiers to others."""
    __tablename__ = "gift_vouchers"
    id                = Column(Integer, primary_key=True, autoincrement=True)
    gifter_user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    voucher_code      = Column(String(12), unique=True, nullable=False, index=True)
    # What's being gifted
    gift_type         = Column(String(20), nullable=False, default="membership")  # membership or tier
    gift_value        = Column(Numeric(10, 2), nullable=False, default=20)  # dollar value
    tier_num          = Column(Integer, nullable=True)  # null for membership, 1-8 for tier
    # Recipient info (optional — can be open voucher)
    recipient_name    = Column(String(100), nullable=True)
    recipient_email   = Column(String(200), nullable=True)
    personal_message  = Column(Text, nullable=True)
    # Payment
    is_free_voucher   = Column(Boolean, default=False)  # True if auto-granted on tier upgrade
    payment_method    = Column(String(20), nullable=True)  # crypto, wallet, free
    payment_ref       = Column(String(200), nullable=True)
    # Claim tracking
    status            = Column(String(20), default="available")  # available, claimed, expired
    claimed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    claimed_at        = Column(DateTime, nullable=True)
    # Click / view tracking — populated when /api/gift/{code} loads.
    # Lets the gifter see "link viewed but not claimed", which is the
    # most actionable signal for marketing iteration: a click without a
    # claim means the landing page isn't converting; no clicks at all
    # means the share message isn't compelling enough to open. Without
    # this, gifters only see "claimed yes/no" with no idea whether the
    # link was even seen. (Added 2 May 2026 as part of PIF analytics.)
    link_clicks       = Column(Integer, default=0, nullable=False)
    first_clicked_at  = Column(DateTime, nullable=True)
    last_clicked_at   = Column(DateTime, nullable=True)
    # Chain tracking
    pif_chain_depth   = Column(Integer, default=1)  # how many generations deep
    parent_voucher_id = Column(Integer, ForeignKey("gift_vouchers.id"), nullable=True)
    # Timestamps
    created_at        = Column(DateTime, default=datetime.utcnow)
    expires_at        = Column(DateTime, nullable=True)  # null = never expires


class CryptoPaymentOrder(Base):
    """Pending crypto payment orders — matched to incoming USDT transfers."""
    __tablename__ = "crypto_payment_orders"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # Product info
    product_type    = Column(String(50), nullable=False)   # membership, grid, course, supermarket, email_boost
    product_key     = Column(String(100), nullable=False)  # membership_basic, grid_3, course_42, etc.
    product_meta    = Column(Text, nullable=True)           # JSON: extra info (course_id, tier, etc.)
    # Payment
    base_amount     = Column(Numeric(18, 6), nullable=False)  # e.g. 20.000000
    unique_amount   = Column(Numeric(18, 6), nullable=False)  # base price — matching by sender address now
    # Status
    status          = Column(String(20), default="pending")  # pending / confirmed / expired / cancelled
    tx_hash         = Column(String(100), nullable=True)
    from_address    = Column(String(50), nullable=True)
    confirmed_at    = Column(DateTime, nullable=True)
    expires_at      = Column(DateTime, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)


class WalletConnectPaymentOrder(Base):
    """Self-custody crypto payment orders — user signs from their own wallet
    via WalletConnect, sends USDT-BEP-20 directly to the treasury on BSC.

    Mirrors the shape of CryptoPaymentOrder so downstream activation handlers
    can treat both rails similarly, but targets BSC (chain 56) and uses
    cent-level uniqueness on the amount (e.g. $19.97, $19.98, $19.99) rather
    than the 6-decimal micro-amounts used by the legacy Polygon flow.

    Lifecycle:
      1. User clicks "Pay with Wallet" on Upgrade / ActivateTier / Nexus / Course
      2. Backend creates this row with status='pending', a unique amount,
         and expires_at = now + 15 min
      3. Frontend opens Reown AppKit, user approves the BSC USDT transfer
      4. Cron watcher (/cron/scan-bsc-payments, 30s interval) reads recent
         BSC USDT Transfer events to the treasury and matches by amount
      5. On match: status='confirmed', tx_hash + from_address recorded,
         downstream activation handler runs (membership / grid / nexus / course)
    """
    __tablename__ = "walletconnect_payment_orders"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # Product info — same shape as CryptoPaymentOrder for downstream handler reuse
    product_type    = Column(String(50), nullable=False)   # membership, grid, course, nexus, email_boost, superscene
    product_key     = Column(String(100), nullable=False)  # membership_basic, grid_3, nexus_5, course_starter, etc.
    product_meta    = Column(Text, nullable=True)           # JSON: extra info (course_id, tier, billing_period, etc.)
    # Pricing — Numeric(18,6) for arithmetic precision; cent-level uniqueness applied at create time
    base_amount     = Column(Numeric(18, 6), nullable=False)  # e.g. 20.000000 (sticker price)
    unique_amount   = Column(Numeric(18, 6), nullable=False, index=True)  # e.g. 19.970000 (what user sends)
    # Status
    status          = Column(String(20), default="pending", index=True)  # pending / confirmed / expired / cancelled
    tx_hash         = Column(String(80), nullable=True, index=True)  # 0x + 64 hex
    from_address    = Column(String(50), nullable=True)
    block_number    = Column(BigInteger, nullable=True)
    confirmed_at    = Column(DateTime, nullable=True)
    expires_at      = Column(DateTime, nullable=False, index=True)
    created_at      = Column(DateTime, default=datetime.utcnow)


class OnchainOrphanTransfer(Base):
    """Incoming USDT-BEP-20 transfers to the treasury that did NOT match
    any pending WalletConnectPaymentOrder.

    Captured by the /cron/scan-bsc-payments watcher. Reasons a transfer
    can land here:
      - Member's order expired (15 min) before their tx confirmed on-chain
      - Member sent a rounded amount ($20.00 instead of $19.97) — wallet
        UX or human error
      - Withdrawal returned to treasury (rare)
      - Spam / unrelated transfer to the address

    Persisted (not just logged) so support can reconcile when a member
    emails saying "I paid but didn't get my membership". Admin can
    manually attach + activate, or mark as spam/ignore.

    `likely_rounded_amount=True` flags transfers whose amount matches a
    base price exactly (e.g. $20.00, $50.00) — these are the high-signal
    candidates for "member sent the wrong amount" and should be
    triaged first.

    Idempotency: tx_hash is unique. Repeated cron runs that re-see the
    same transfer will hit the unique constraint and skip insertion.
    """
    __tablename__ = "onchain_orphan_transfers"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    tx_hash         = Column(String(80), nullable=False, unique=True, index=True)
    from_address    = Column(String(50), nullable=False, index=True)
    amount_usdt     = Column(Numeric(18, 6), nullable=False)
    block_number    = Column(BigInteger, nullable=True)
    likely_rounded_amount = Column(Boolean, default=False, nullable=False)
    seen_at         = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved        = Column(Boolean, default=False, nullable=False, index=True)
    resolution_note = Column(Text, nullable=True)
    resolved_at     = Column(DateTime, nullable=True)
    resolved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class BscScanFailedChunk(Base):
    """Block ranges where eth_getLogs failed during the WalletConnect scan.

    Added 24 May 2026 after Matt (user 374) lost activation when the chunk
    containing his tx (block 100151692) silently returned empty results
    from a public BSC RPC — the call succeeded on the wire but the
    provider's index didn't have the transfer, so the scanner advanced
    its cursor past Matt's block without ever seeing his payment.

    This table backs THREE behaviours that didn't exist before:

    1. Cross-run persistence of failures. Previously a failed chunk in
       one cron run lived only in that run's stats dict and was lost
       once the function returned. Now each failed chunk is upserted
       here, and every cron run prepends ALL pending entries to its
       scan plan — guaranteeing repeated retry across cron lifetimes.

    2. Attempt counting + escalation. attempt_count increments on every
       failure. After ESCALATE_AT_ATTEMPTS attempts (default 10, ~5 min
       of cron retries) an email alert fires to ops. After
       GIVE_UP_AT_ATTEMPTS (default 100, ~50 min) the chunk is marked
       resolved='abandoned' so it stops eating scan budget.

    3. Diagnostics surface. Admin can see "this block range has failed
       N times" and decide whether a paid RPC is needed or if it's
       just a transient outage.

    Idempotency: (from_block, to_block) is unique; INSERT...ON CONFLICT
    increments attempt_count and updates last_error.

    Resolution states:
      'pending'   — still failing, will be retried
      'resolved'  — eventually succeeded on retry, all transfers in
                    range now in scan history
      'abandoned' — exceeded GIVE_UP_AT_ATTEMPTS, manual review needed
    """
    __tablename__ = "bsc_scan_failed_chunks"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    from_block      = Column(BigInteger, nullable=False)
    to_block        = Column(BigInteger, nullable=False)
    attempt_count   = Column(Integer, default=1, nullable=False)
    last_error      = Column(Text, nullable=True)
    status          = Column(String(20), default="pending", nullable=False, index=True)  # pending / resolved / abandoned
    first_seen_at   = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_attempt_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at     = Column(DateTime, nullable=True)
    alerted_at      = Column(DateTime, nullable=True)  # set when escalation email fires, prevents alert spam

    __table_args__ = (
        UniqueConstraint("from_block", "to_block", name="uq_bsc_scan_failed_chunk_range"),
    )


class AppConfig(Base):
    """Generic key/value store for small app-wide state that needs to
    persist across deploys but doesn't warrant a dedicated table.

    Current uses:
      - 'wc_scan_cursor': last successfully scanned BSC block for the
        WalletConnect rail. Watcher cron resumes from here so late-
        arriving payments to expired orders still get captured as
        orphans (instead of falling off the back of a moving 10-block
        scan window). Bug surfaced 7 May 2026 smoke test.

    Reserved for future cursors / one-off flags. Keep entries small
    and scalar — anything bigger should get its own table.
    """
    __tablename__ = "app_config"
    key   = Column(String(80), primary_key=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class NowPaymentsOrder(Base):
    """NOWPayments invoice-based payment orders (crypto + fiat card)."""
    __tablename__ = "nowpayments_orders"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # Product info
    product_type    = Column(String(50), nullable=False)   # membership, grid, email_boost, superscene
    product_key     = Column(String(100), nullable=False)  # membership_basic, grid_3, etc.
    product_meta    = Column(Text, nullable=True)           # JSON: extra info
    # Pricing
    price_usd       = Column(Numeric(18, 6), nullable=False)  # Price in USD
    # NOWPayments references
    np_invoice_id   = Column(BigInteger, nullable=True, index=True)  # NOWPayments invoice ID
    np_payment_id   = Column(BigInteger, nullable=True, index=True)  # NOWPayments payment ID
    internal_order_id = Column(String(100), nullable=True, index=True)  # SAP-{user}-{id}
    invoice_url     = Column(Text, nullable=True)
    # Payment details (filled by IPN)
    pay_currency    = Column(String(20), nullable=True)    # btc, eth, usdttrc20, etc.
    pay_amount      = Column(Numeric(18, 8), nullable=True)
    actually_paid   = Column(Numeric(18, 8), nullable=True)
    outcome_amount  = Column(Numeric(18, 8), nullable=True)
    outcome_currency = Column(String(20), nullable=True)
    # Status
    status          = Column(String(30), default="pending")  # pending / waiting / confirming / confirmed / finished / failed / expired / refunded
    confirmed_at    = Column(DateTime, nullable=True)
    # Auto-recovery audit fields (added 12 May 2026 with partial-payment
    # tolerance handling). When a payment arrives within 5% of the required
    # amount we auto-activate via the standard flow; these columns record
    # that fact so we can audit and tune the tolerance threshold over time.
    partial_recovery_logged       = Column(Boolean, default=False, nullable=True)
    partial_recovery_shortfall_usd = Column(Numeric(18, 6), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"⚠️ create_all skipped: {e}")

# ── Auto-migration: add missing columns if they don't exist ──────────────
def run_migrations():
    """Add any new columns that don't exist yet in the live DB."""
    migrations = [
        # ── Float → Numeric(18,6) migration for financial precision ──
        "ALTER TABLE users ALTER COLUMN balance TYPE NUMERIC(18,6) USING COALESCE(balance,0)::NUMERIC(18,6)",
        "ALTER TABLE users ALTER COLUMN total_earned TYPE NUMERIC(18,6) USING COALESCE(total_earned,0)::NUMERIC(18,6)",
        "ALTER TABLE users ALTER COLUMN total_withdrawn TYPE NUMERIC(18,6) USING COALESCE(total_withdrawn,0)::NUMERIC(18,6)",
        "ALTER TABLE users ALTER COLUMN grid_earnings TYPE NUMERIC(18,6) USING COALESCE(grid_earnings,0)::NUMERIC(18,6)",
        "ALTER TABLE users ALTER COLUMN level_earnings TYPE NUMERIC(18,6) USING COALESCE(level_earnings,0)::NUMERIC(18,6)",
        "ALTER TABLE users ALTER COLUMN upline_earnings TYPE NUMERIC(18,6) USING COALESCE(upline_earnings,0)::NUMERIC(18,6)",
        "ALTER TABLE users ALTER COLUMN course_earnings TYPE NUMERIC(18,6) USING COALESCE(course_earnings,0)::NUMERIC(18,6)",
        "ALTER TABLE grids ALTER COLUMN package_price TYPE NUMERIC(18,6) USING COALESCE(package_price,0)::NUMERIC(18,6)",
        "ALTER TABLE grids ALTER COLUMN revenue_total TYPE NUMERIC(18,6) USING COALESCE(revenue_total,0)::NUMERIC(18,6)",
        "ALTER TABLE commissions ALTER COLUMN amount_usdt TYPE NUMERIC(18,6) USING COALESCE(amount_usdt,0)::NUMERIC(18,6)",
        "ALTER TABLE courses ALTER COLUMN price TYPE NUMERIC(18,6) USING COALESCE(price,0)::NUMERIC(18,6)",
        "ALTER TABLE course_purchases ALTER COLUMN amount_paid TYPE NUMERIC(18,6) USING COALESCE(amount_paid,0)::NUMERIC(18,6)",
        "ALTER TABLE course_commissions ALTER COLUMN amount TYPE NUMERIC(18,6) USING COALESCE(amount,0)::NUMERIC(18,6)",
        "ALTER TABLE payments ALTER COLUMN amount_usdt TYPE NUMERIC(18,6) USING COALESCE(amount_usdt,0)::NUMERIC(18,6)",
        "ALTER TABLE withdrawals ALTER COLUMN amount_usdt TYPE NUMERIC(18,6) USING COALESCE(amount_usdt,0)::NUMERIC(18,6)",
        "ALTER TABLE p2p_transfers ALTER COLUMN amount_usdt TYPE NUMERIC(18,6) USING COALESCE(amount_usdt,0)::NUMERIC(18,6)",
        # ── End Numeric migration ──
        "CREATE TABLE IF NOT EXISTS video_campaigns (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), title VARCHAR NOT NULL, description TEXT, category VARCHAR, platform VARCHAR NOT NULL, video_url VARCHAR NOT NULL, embed_url VARCHAR NOT NULL, video_id VARCHAR, status VARCHAR DEFAULT 'active', views_target INTEGER DEFAULT 0, views_delivered INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())",
                "CREATE TABLE IF NOT EXISTS password_reset_tokens (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), token VARCHAR UNIQUE NOT NULL, expires_at TIMESTAMP NOT NULL, used BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW())",
        "CREATE TABLE IF NOT EXISTS membership_renewals (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) UNIQUE, activated_at TIMESTAMP, next_renewal_date TIMESTAMP, last_renewed_at TIMESTAMP, renewal_source VARCHAR DEFAULT 'wallet', grace_period_start TIMESTAMP, in_grace_period BOOLEAN DEFAULT FALSE, total_renewals INTEGER DEFAULT 0, updated_at TIMESTAMP DEFAULT NOW())",
        # Auto-renew opt-in column (added 9 May 2026 with new checkout flow).
        # DEFAULT TRUE preserves existing behaviour for all current members —
        # process_auto_renewals (in app/payment.py) already deducts $20 from
        # balance if available, this column simply makes that controllable.
        "ALTER TABLE membership_renewals ADD COLUMN IF NOT EXISTS auto_renew_from_balance BOOLEAN DEFAULT TRUE",
        "CREATE TABLE IF NOT EXISTS p2p_transfers (id SERIAL PRIMARY KEY, from_user_id INTEGER REFERENCES users(id), to_user_id INTEGER REFERENCES users(id), amount_usdt FLOAT, note VARCHAR, status VARCHAR DEFAULT 'completed', created_at TIMESTAMP DEFAULT NOW())",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_activated_by_referral BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS low_balance_warned BOOLEAN DEFAULT FALSE",
        # Story-prompt banner dismissal — persists across devices so a member
        # who dismissed on mobile doesn't see it again on desktop. Timestamp
        # rather than boolean so future milestones can compare against the
        # dismissal date (e.g. 'show again for new earnings tier'). Added
        # 10 May 2026 after launch-day reports of the banner re-firing.
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS story_prompt_dismissed_at TIMESTAMP",
        # ── Platform-status table (maintenance mode 'panic button') ──
        # Single-row table holding current operational mode. Read by
        # is_maintenance_mode() / is_soft_maintenance() helpers before
        # every money-affecting endpoint. Added 11 May 2026.
        (
            "CREATE TABLE IF NOT EXISTS platform_status ("
            "id SERIAL PRIMARY KEY, "
            "mode VARCHAR(30) NOT NULL DEFAULT 'live', "
            "reason VARCHAR(500), "
            "set_by_user_id INTEGER REFERENCES users(id), "
            "set_at TIMESTAMP DEFAULT NOW(), "
            "updated_at TIMESTAMP DEFAULT NOW())"
        ),
        # Seed the single row if not present. Subsequent calls are no-ops
        # because of the WHERE NOT EXISTS guard.
        (
            "INSERT INTO platform_status (id, mode) "
            "SELECT 1, 'live' "
            "WHERE NOT EXISTS (SELECT 1 FROM platform_status WHERE id = 1)"
        ),
        # ── Admin email broadcast (11 May 2026) ──
        # Lets the owner send broadcast emails to all members from the
        # admin panel. List is always live (pulled from users table at
        # send time). email_opt_out gates per-member opt-out for compliance.
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_unsubscribe_token VARCHAR(64)",
        "CREATE INDEX IF NOT EXISTS idx_users_email_unsub_token ON users(email_unsubscribe_token)",
        "CREATE INDEX IF NOT EXISTS idx_users_email_opt_out ON users(email_opt_out)",
        (
            "CREATE TABLE IF NOT EXISTS admin_broadcasts ("
            "id SERIAL PRIMARY KEY, "
            "subject VARCHAR(300) NOT NULL, "
            "body_html TEXT NOT NULL, "
            "body_text TEXT, "
            "audience_filter TEXT NOT NULL DEFAULT '{\"status\":\"all\"}', "
            "recipient_count INTEGER DEFAULT 0, "
            "sent_count INTEGER DEFAULT 0, "
            "failed_count INTEGER DEFAULT 0, "
            "status VARCHAR(20) DEFAULT 'pending', "
            "error_message TEXT, "
            "sent_by_user_id INTEGER REFERENCES users(id), "
            "created_at TIMESTAMP DEFAULT NOW(), "
            "started_at TIMESTAMP, "
            "completed_at TIMESTAMP)"
        ),
        "CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_status ON admin_broadcasts(status)",
        "CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_created ON admin_broadcasts(created_at DESC)",
        "CREATE TABLE IF NOT EXISTS ai_usage_quotas (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) UNIQUE, quota_date VARCHAR, campaign_studio_uses INTEGER DEFAULT 0, niche_finder_uses INTEGER DEFAULT 0, campaign_studio_total INTEGER DEFAULT 0, niche_finder_total INTEGER DEFAULT 0, updated_at TIMESTAMP DEFAULT NOW())",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS sending_wallet VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS balance FLOAT DEFAULT 0.0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earned FLOAT DEFAULT 0.0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_withdrawn FLOAT DEFAULT 0.0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS grid_earnings FLOAT DEFAULT 0.0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS level_earnings FLOAT DEFAULT 0.0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS upline_earnings FLOAT DEFAULT 0.0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_referrals INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_team INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS sponsor_id INTEGER",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS pass_up_sponsor_id INTEGER",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS course_sale_count INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR",
        # Video watch system
        "CREATE TABLE IF NOT EXISTS video_watches (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), campaign_id INTEGER REFERENCES video_campaigns(id), watched_at TIMESTAMP DEFAULT NOW(), watch_date VARCHAR, duration_secs INTEGER DEFAULT 30)",
        "CREATE TABLE IF NOT EXISTS watch_quotas (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) UNIQUE, package_tier INTEGER DEFAULT 1, daily_required INTEGER DEFAULT 1, today_watched INTEGER DEFAULT 0, today_date VARCHAR, consecutive_missed INTEGER DEFAULT 0, last_quota_met VARCHAR, commissions_paused BOOLEAN DEFAULT FALSE, updated_at TIMESTAMP DEFAULT NOW())",
        "ALTER TABLE watch_quotas ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0",
        "ALTER TABLE watch_quotas ADD COLUMN IF NOT EXISTS total_watched INTEGER DEFAULT 0",
        "CREATE INDEX IF NOT EXISTS idx_video_watches_user_date ON video_watches(user_id, watch_date)",
        "CREATE INDEX IF NOT EXISTS idx_video_watches_campaign ON video_watches(campaign_id)",
        # Rename cycle_number → advance_number if old column exists
        "ALTER TABLE grids RENAME COLUMN cycle_number TO advance_number",
        # If column doesn't exist at all, add it
        "ALTER TABLE grids ADD COLUMN IF NOT EXISTS advance_number INTEGER DEFAULT 1",
        # Funnel page builder
        "CREATE TABLE IF NOT EXISTS funnel_pages (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), slug VARCHAR, title VARCHAR NOT NULL, template_type VARCHAR DEFAULT 'opportunity', status VARCHAR DEFAULT 'draft', headline TEXT, subheadline TEXT, body_copy TEXT, cta_text VARCHAR, cta_url VARCHAR, video_url VARCHAR, image_url VARCHAR, sections_json TEXT, color_scheme VARCHAR DEFAULT 'dark', accent_color VARCHAR DEFAULT '#00d4ff', font_family VARCHAR DEFAULT 'Rethink Sans', custom_css TEXT, meta_description TEXT, og_image_url VARCHAR, funnel_name VARCHAR, funnel_order INTEGER DEFAULT 0, next_page_id INTEGER REFERENCES funnel_pages(id), views INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_pages_slug_unique ON funnel_pages(slug) WHERE slug IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS idx_funnel_pages_user ON funnel_pages(user_id)",
        "ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS gjs_components TEXT",
        "ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS gjs_styles TEXT",
        "ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS gjs_html TEXT",
        "ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS gjs_css TEXT",
        "CREATE TABLE IF NOT EXISTS funnel_leads (id SERIAL PRIMARY KEY, page_id INTEGER REFERENCES funnel_pages(id), user_id INTEGER REFERENCES users(id), name VARCHAR, email VARCHAR NOT NULL, phone VARCHAR, source VARCHAR, ip_address VARCHAR, created_at TIMESTAMP DEFAULT NOW())",
        "CREATE INDEX IF NOT EXISTS idx_funnel_leads_page ON funnel_leads(page_id)",
        "CREATE INDEX IF NOT EXISTS idx_funnel_leads_user ON funnel_leads(user_id)",
        "CREATE TABLE IF NOT EXISTS funnel_events (id SERIAL PRIMARY KEY, page_id INTEGER REFERENCES funnel_pages(id), user_id INTEGER REFERENCES users(id), event_type VARCHAR NOT NULL, referrer TEXT, device VARCHAR, ip_address VARCHAR, meta_json TEXT, created_at TIMESTAMP DEFAULT NOW())",
        "CREATE INDEX IF NOT EXISTS idx_funnel_events_page ON funnel_events(page_id)",
        "CREATE INDEX IF NOT EXISTS idx_funnel_events_user ON funnel_events(user_id)",
        # Targeting & priority columns on video_campaigns
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_country VARCHAR",
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_interests VARCHAR",
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 0",
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS owner_tier INTEGER DEFAULT 1",
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_age_min INTEGER",
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_age_max INTEGER",
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_gender VARCHAR",
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE",
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS is_spotlight BOOLEAN DEFAULT FALSE",
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS cta_url VARCHAR",
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS cta_clicks INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS age_range VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR",
        # User interests
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS interests VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE",
        "ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS sections_json TEXT",
        "ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS font_family VARCHAR DEFAULT 'Rethink Sans'",
        "ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS custom_css TEXT",
        "ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS meta_description TEXT",
        "ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS og_image_url VARCHAR",
        "ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS custom_bg VARCHAR DEFAULT ''",
        "CREATE TABLE IF NOT EXISTS link_rotators (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), slug VARCHAR UNIQUE, title VARCHAR NOT NULL, mode VARCHAR DEFAULT 'equal', destinations_json TEXT, total_clicks INTEGER DEFAULT 0, last_clicked TIMESTAMP, current_index INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())",
        "CREATE TABLE IF NOT EXISTS short_links (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), slug VARCHAR UNIQUE, destination_url TEXT NOT NULL, title VARCHAR, clicks INTEGER DEFAULT 0, last_clicked TIMESTAMP, is_rotator BOOLEAN DEFAULT FALSE, rotator_id INTEGER REFERENCES link_rotators(id), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())",
        "CREATE TABLE IF NOT EXISTS vip_signups (id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, email VARCHAR NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT NOW())",
        "CREATE TABLE IF NOT EXISTS ad_listings (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), title VARCHAR NOT NULL, description VARCHAR NOT NULL, category VARCHAR NOT NULL DEFAULT 'general', link_url VARCHAR NOT NULL, image_url VARCHAR, is_active BOOLEAN DEFAULT TRUE, is_featured BOOLEAN DEFAULT FALSE, clicks INTEGER DEFAULT 0, views INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())",
        # ── KYC columns ──
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR DEFAULT 'none'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_dob VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_id_type VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_id_filename VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_rejection_reason VARCHAR",
        # ── 2FA columns ──
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE",
        # ── Link Tools — geo, UTM, smart redirects ──
        "ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS country_name VARCHAR",
        "ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS browser VARCHAR",
        "ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS utm_source VARCHAR",
        "ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS utm_medium VARCHAR",
        "ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR",
        "ALTER TABLE short_links ADD COLUMN IF NOT EXISTS click_cap INTEGER",
        "ALTER TABLE short_links ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP",
        "ALTER TABLE short_links ADD COLUMN IF NOT EXISTS geo_redirect_json TEXT",
        "ALTER TABLE short_links ADD COLUMN IF NOT EXISTS device_redirect_json TEXT",
        "ALTER TABLE short_links ADD COLUMN IF NOT EXISTS password_hash VARCHAR",
        "ALTER TABLE short_links ADD COLUMN IF NOT EXISTS tags_json TEXT",
        # Crypto payment matching now uses sender wallet address — drop unique on amount
        "ALTER TABLE crypto_payment_orders DROP CONSTRAINT IF EXISTS crypto_payment_orders_unique_amount_key",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS sending_wallet VARCHAR",
        # Ad Board SEO columns
        "ALTER TABLE ad_listings ADD COLUMN IF NOT EXISTS keywords VARCHAR",
        "ALTER TABLE ad_listings ADD COLUMN IF NOT EXISTS location VARCHAR",
        "ALTER TABLE ad_listings ADD COLUMN IF NOT EXISTS price VARCHAR",
        "ALTER TABLE ad_listings ADD COLUMN IF NOT EXISTS contact_info VARCHAR",
        "ALTER TABLE ad_listings ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active'",
        # Banner Ads table
        "CREATE TABLE IF NOT EXISTS banner_ads (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), title VARCHAR NOT NULL, slug VARCHAR UNIQUE, description VARCHAR, image_url VARCHAR NOT NULL, link_url VARCHAR NOT NULL, size VARCHAR DEFAULT '728x90', category VARCHAR DEFAULT 'general', keywords VARCHAR, location VARCHAR, is_active BOOLEAN DEFAULT TRUE, is_featured BOOLEAN DEFAULT FALSE, status VARCHAR DEFAULT 'pending', clicks INTEGER DEFAULT 0, impressions INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())",
        # Video campaign SEO columns
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS slug VARCHAR",
        "ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS keywords VARCHAR",
        # Ensure admin/owner account is always active and top of network.
        # Pre-flat-pricing this also set membership_tier='pro' on every startup
        # but that clobbered the founding-partner status applied by the flat-
        # pricing migration further below. Admin tier is now set by the flat-
        # pricing migration to 'founding' (admin counts as a founding partner)
        # and we leave it alone on subsequent restarts.
        "UPDATE users SET is_active = true WHERE is_admin = true",
        "UPDATE users SET is_active = true, is_admin = true WHERE username = 'SuperAdPro'",
        # ── Credit Matrix tables ──
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS matrix_earnings NUMERIC(18,6) DEFAULT 0",
        """CREATE TABLE IF NOT EXISTS credit_pack_purchases (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            pack_key VARCHAR(20) NOT NULL,
            pack_price NUMERIC(18,6) NOT NULL,
            credits_awarded INTEGER NOT NULL,
            payment_method VARCHAR(20) DEFAULT 'crypto',
            payment_ref VARCHAR(200),
            status VARCHAR(20) DEFAULT 'completed',
            matrix_entry_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS credit_matrices (
            id SERIAL PRIMARY KEY,
            owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            advance_number INTEGER DEFAULT 1,
            status VARCHAR(20) DEFAULT 'active',
            positions_filled INTEGER DEFAULT 0,
            total_earned NUMERIC(18,6) DEFAULT 0,
            completion_bonus_paid NUMERIC(18,6) DEFAULT 0,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS credit_matrix_positions (
            id SERIAL PRIMARY KEY,
            matrix_id INTEGER REFERENCES credit_matrices(id) ON DELETE CASCADE NOT NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            parent_position_id INTEGER REFERENCES credit_matrix_positions(id),
            level INTEGER NOT NULL,
            position_index INTEGER DEFAULT 0,
            pack_key VARCHAR(20),
            pack_price NUMERIC(18,6) DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS credit_matrix_commissions (
            id SERIAL PRIMARY KEY,
            matrix_id INTEGER REFERENCES credit_matrices(id) ON DELETE CASCADE NOT NULL,
            earner_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            from_position_id INTEGER REFERENCES credit_matrix_positions(id) NOT NULL,
            level INTEGER NOT NULL,
            rate NUMERIC(8,4) NOT NULL,
            pack_price NUMERIC(18,6) NOT NULL,
            amount NUMERIC(18,6) NOT NULL,
            commission_type VARCHAR(30) DEFAULT 'matrix_level',
            status VARCHAR(20) DEFAULT 'paid',
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        "CREATE INDEX IF NOT EXISTS idx_credit_matrices_owner ON credit_matrices(owner_id)",
        "CREATE INDEX IF NOT EXISTS idx_credit_matrix_positions_matrix ON credit_matrix_positions(matrix_id)",
        "CREATE INDEX IF NOT EXISTS idx_credit_matrix_positions_user ON credit_matrix_positions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_credit_matrix_commissions_earner ON credit_matrix_commissions(earner_id)",
        "CREATE INDEX IF NOT EXISTS idx_credit_pack_purchases_user ON credit_pack_purchases(user_id)",
        # Income Chain — source_chain on course_commissions
        # Tags every pass-up commission with its originating chain (1-4).
        # NULL for direct sales. Populated for every pass-up and related platform absorption.
        "ALTER TABLE course_commissions ADD COLUMN IF NOT EXISTS source_chain INTEGER",
        "CREATE INDEX IF NOT EXISTS idx_course_commissions_source_chain ON course_commissions(source_chain)",
        "CREATE INDEX IF NOT EXISTS idx_course_commissions_earner_chain ON course_commissions(earner_id, source_chain)",
        # /explore page (Phase 1): User display_city column (country already exists).
        # GeoIP populates these at registration; users can optionally override in profile.
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_city VARCHAR",
        # /explore page Phase 2 — Member stories (first-dollar narratives, opt-in, admin-moderated).
        # Kept empty on Phase 1 launch; forms + admin UI arrive in Phase 2.
        """CREATE TABLE IF NOT EXISTS member_stories (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            display_initials VARCHAR(4),
            display_country VARCHAR(100),
            niche VARCHAR(100),
            days_to_milestone INTEGER,
            milestone_label VARCHAR(120),
            milestone_color VARCHAR(20) DEFAULT 'green',
            story_text VARCHAR(400),
            now_monthly_amount NUMERIC(12,2),
            approved BOOLEAN DEFAULT FALSE,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )""",
        "CREATE INDEX IF NOT EXISTS idx_member_stories_approved ON member_stories(approved, sort_order)",
        "CREATE INDEX IF NOT EXISTS idx_member_stories_user ON member_stories(user_id)",
        # /explore page Phase 3 — Member showcase (featured artifacts, opt-in, admin-moderated).
        # artifact_type: 'bio-link' | 'landing-page' | 'campaign' | 'course'
        # artifact_id: FK to the respective table row (linkhub_profiles / funnel_pages / video_campaigns / courses)
        """CREATE TABLE IF NOT EXISTS member_showcase (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            artifact_type VARCHAR(32) NOT NULL,
            artifact_id INTEGER,
            display_title VARCHAR(160),
            display_niche VARCHAR(80),
            metric_label VARCHAR(60),
            metric_value VARCHAR(40),
            accent_color VARCHAR(20) DEFAULT 'sky',
            approved BOOLEAN DEFAULT FALSE,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )""",
        "CREATE INDEX IF NOT EXISTS idx_member_showcase_approved ON member_showcase(approved, artifact_type, sort_order)",
        "CREATE INDEX IF NOT EXISTS idx_member_showcase_user ON member_showcase(user_id)",
        # ── Layer 3 (Apr 2026): translatable notifications ──
        # Optional translation key — when present, frontend looks it up
        # against the user's current i18n locale so notifications speak
        # the user's language. Falls back to literal title/message
        # columns when null (backwards-compatible with existing data).
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS translation_key VARCHAR",
        # ── Apr 2026: broadcast support in Team Messenger ──
        # Marks rows created by the /api/team-messages/broadcast endpoint
        # so the UI can render a small "Broadcast" tag on them. Existing
        # rows default to false (regular 1-on-1 messages).
        "ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT FALSE",
        # ── Apr 2026: server-side watch-cheat protection ──
        # started_at records when the user was assigned the video (so we
        # can verify server-side that >=30s passed before accepting mark-
        # complete). is_complete=true for all existing rows (they're all
        # genuine completed watches; only the new assignment endpoint
        # creates is_complete=false rows).
        "ALTER TABLE video_watches ADD COLUMN IF NOT EXISTS started_at TIMESTAMP",
        "ALTER TABLE video_watches ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT TRUE",
        # Make sure existing rows are flagged complete (handles the case
        # where the column already existed but with NULL defaults)
        "UPDATE video_watches SET is_complete = TRUE WHERE is_complete IS NULL",
        # ── 2 May 2026: Withdrawal hardening (pre-launch blocker) ──
        # Six gaps closed in one migration — see app/database.py Withdrawal
        # model for full rationale on each column.
        #   wallet_type      — fixes admin-refund silent corruption risk
        #   attempts/last_*  — retry tracking; without these, cron loops forever
        #   idempotency_key  — double-spend guard (double-click / 4G retry)
        #   notes            — admin refund audit trail (was already referenced
        #                      via hasattr(); making it real)
        "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS wallet_type VARCHAR DEFAULT 'affiliate'",
        # Backfill: any existing rows pre-migration came from the affiliate
        # wallet (campaign-wallet withdrawals didn't ship with wallet_type
        # tagging). NULL→'affiliate' keeps refund logic safe; the 13 current
        # users haven't withdrawn yet so this is mostly defensive.
        "UPDATE withdrawals SET wallet_type = 'affiliate' WHERE wallet_type IS NULL",
        "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0",
        "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMP",
        "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS last_error VARCHAR",
        "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR",
        # Unique index on idempotency_key — two clients submitting the same
        # UUID get a constraint violation on the second insert, which the
        # request_withdrawal handler catches and converts into "return the
        # first attempt's stored result". The WHERE clause skips the legacy
        # rows that have NULL keys (Postgres unique allows multiple NULLs
        # anyway, but being explicit makes intent obvious).
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_withdrawals_idempotency_key ON withdrawals (idempotency_key) WHERE idempotency_key IS NOT NULL",
        "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS notes TEXT",
        # ── 2 May 2026: Pay It Forward analytics ──
        # Track link clicks so gifters can see "link viewed but not
        # claimed" — the actionable signal for marketing iteration.
        # See app/database.py GiftVoucher model for full rationale.
        "ALTER TABLE gift_vouchers ADD COLUMN IF NOT EXISTS link_clicks INTEGER DEFAULT 0 NOT NULL",
        "ALTER TABLE gift_vouchers ADD COLUMN IF NOT EXISTS first_clicked_at TIMESTAMP",
        "ALTER TABLE gift_vouchers ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMP",
        # ── 2 May 2026: PurchaseConsent table ──
        # New table; SQLAlchemy create_all() will create it on boot. The
        # CREATE TABLE IF NOT EXISTS below is belt-and-braces in case
        # create_all is ever skipped on a particular environment. Holds
        # the audit trail of every user's express consent to the
        # no-refund / immediate-activation terms before each money-in
        # transaction. See PurchaseConsent class docstring for full
        # rationale.
        """CREATE TABLE IF NOT EXISTS purchase_consents (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            consent_version VARCHAR(20) NOT NULL,
            consent_text_hash VARCHAR(64) NOT NULL,
            ip_address VARCHAR(50),
            user_agent VARCHAR(500),
            created_at TIMESTAMP NOT NULL DEFAULT now(),
            consumed_at TIMESTAMP,
            consumed_for VARCHAR(100)
        )""",
        "CREATE INDEX IF NOT EXISTS ix_purchase_consents_user_id ON purchase_consents (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_purchase_consents_created_at ON purchase_consents (created_at)",
        "CREATE INDEX IF NOT EXISTS ix_purchase_consents_consumed_at ON purchase_consents (consumed_at)",
        # ── 6 May 2026: Multi-network USDT withdrawals (TRC-20 + BEP-20) ──
        # Replaces single-network Polygon path. wallet_network on User stores
        # the member's chosen network ('tron' or 'bsc'); network on Withdrawal
        # stamps each request with the network it was sent on so historical
        # rows stay accurate even if the member later switches networks.
        # NULL on legacy rows is intentional — those are pre-migration
        # Polygon-era data and we don't backfill (they would be incorrect
        # to label as either tron or bsc retroactively).
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_network VARCHAR",
        "ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS network VARCHAR",
        "CREATE INDEX IF NOT EXISTS ix_withdrawals_network ON withdrawals (network)",
        # WalletConnect / self-custody BSC inbound payments (May 2026 onwards).
        # Phase 1 of the NOWPayments → self-custody migration; runs alongside
        # nowpayments_orders for ~2 weeks before NOWPayments inbound is retired.
        "CREATE TABLE IF NOT EXISTS walletconnect_payment_orders ("
        "  id SERIAL PRIMARY KEY,"
        "  user_id INTEGER NOT NULL REFERENCES users(id),"
        "  product_type VARCHAR(50) NOT NULL,"
        "  product_key VARCHAR(100) NOT NULL,"
        "  product_meta TEXT,"
        "  base_amount NUMERIC(18,6) NOT NULL,"
        "  unique_amount NUMERIC(18,6) NOT NULL,"
        "  status VARCHAR(20) DEFAULT 'pending',"
        "  tx_hash VARCHAR(80),"
        "  from_address VARCHAR(50),"
        "  block_number BIGINT,"
        "  confirmed_at TIMESTAMP,"
        "  expires_at TIMESTAMP NOT NULL,"
        "  created_at TIMESTAMP DEFAULT NOW()"
        ")",
        "CREATE INDEX IF NOT EXISTS idx_wcpo_user ON walletconnect_payment_orders(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_wcpo_status ON walletconnect_payment_orders(status)",
        "CREATE INDEX IF NOT EXISTS idx_wcpo_unique_amount ON walletconnect_payment_orders(unique_amount)",
        "CREATE INDEX IF NOT EXISTS idx_wcpo_tx_hash ON walletconnect_payment_orders(tx_hash)",
        "CREATE INDEX IF NOT EXISTS idx_wcpo_expires_at ON walletconnect_payment_orders(expires_at)",
        # Race-proof collision prevention: only one pending order can hold
        # any given unique_amount at a time. INSERT collisions raise
        # IntegrityError — caller catches and re-rolls. Partial index so
        # confirmed/expired orders (which can legitimately share an
        # amount with future pending orders) don't trigger the constraint.
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_wcpo_unique_amount_pending "
        "ON walletconnect_payment_orders(unique_amount) WHERE status = 'pending'",
        # ── Onchain orphan transfers (Stage 2, 6 May 2026) ──
        # USDT transfers to treasury that didn't match any pending order.
        # Persisted for support reconciliation when members report
        # paying but not getting activated.
        "CREATE TABLE IF NOT EXISTS onchain_orphan_transfers ("
        "  id SERIAL PRIMARY KEY,"
        "  tx_hash VARCHAR(80) NOT NULL UNIQUE,"
        "  from_address VARCHAR(50) NOT NULL,"
        "  amount_usdt NUMERIC(18,6) NOT NULL,"
        "  block_number BIGINT,"
        "  likely_rounded_amount BOOLEAN NOT NULL DEFAULT FALSE,"
        "  seen_at TIMESTAMP NOT NULL DEFAULT NOW(),"
        "  resolved BOOLEAN NOT NULL DEFAULT FALSE,"
        "  resolution_note TEXT,"
        "  resolved_at TIMESTAMP,"
        "  resolved_by_user_id INTEGER REFERENCES users(id)"
        ")",
        "CREATE INDEX IF NOT EXISTS idx_orphan_tx_hash ON onchain_orphan_transfers(tx_hash)",
        "CREATE INDEX IF NOT EXISTS idx_orphan_from_addr ON onchain_orphan_transfers(from_address)",
        "CREATE INDEX IF NOT EXISTS idx_orphan_resolved ON onchain_orphan_transfers(resolved)",

        # ── BSC scan failed chunks (added 24 May 2026) ──
        # Block ranges where eth_getLogs failed during the WalletConnect
        # scan. Persisted so failed chunks are retried across cron lifetimes,
        # attempt-counted for escalation, and surfaced for admin diagnostics.
        # Added after Matt (user 374) lost activation when his block silently
        # returned empty results from a flaky public RPC.
        "CREATE TABLE IF NOT EXISTS bsc_scan_failed_chunks ("
        "  id SERIAL PRIMARY KEY,"
        "  from_block BIGINT NOT NULL,"
        "  to_block BIGINT NOT NULL,"
        "  attempt_count INTEGER NOT NULL DEFAULT 1,"
        "  last_error TEXT,"
        "  status VARCHAR(20) NOT NULL DEFAULT 'pending',"
        "  first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),"
        "  last_attempt_at TIMESTAMP NOT NULL DEFAULT NOW(),"
        "  resolved_at TIMESTAMP,"
        "  alerted_at TIMESTAMP,"
        "  CONSTRAINT uq_bsc_scan_failed_chunk_range UNIQUE (from_block, to_block)"
        ")",
        "CREATE INDEX IF NOT EXISTS idx_bsc_failed_chunks_status ON bsc_scan_failed_chunks(status)",
        "CREATE INDEX IF NOT EXISTS idx_bsc_failed_chunks_range ON bsc_scan_failed_chunks(from_block, to_block)",

        # ── App-wide key/value store (added 7 May 2026) ──
        # Persists small scalar state across deploys. First use:
        # 'wc_scan_cursor' = last successfully scanned BSC block.
        "CREATE TABLE IF NOT EXISTS app_config ("
        "  key VARCHAR(80) PRIMARY KEY,"
        "  value TEXT,"
        "  updated_at TIMESTAMP NOT NULL DEFAULT NOW()"
        ")",
        # ── Rotator queue (added 16 May 2026 for /start funnel) ──
        # Round-robin pool of active members who opted in to receive
        # rotator-distributed signups. Queue position is just an integer:
        # lowest = next in line; after assignment we set their position
        # to MAX+1 to move them to the back. Concurrency-safe via the
        # existing pg_advisory_xact_lock pattern.
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS rotator_opted_in BOOLEAN DEFAULT FALSE",
        "CREATE TABLE IF NOT EXISTS rotator_queue ("
        "  id SERIAL PRIMARY KEY,"
        "  user_id INTEGER UNIQUE REFERENCES users(id),"
        "  queue_position INTEGER NOT NULL,"
        "  joined_at TIMESTAMP DEFAULT NOW(),"
        "  last_assigned_at TIMESTAMP"
        ")",
        "CREATE INDEX IF NOT EXISTS idx_rotator_queue_position ON rotator_queue(queue_position)",
        "CREATE TABLE IF NOT EXISTS rotator_assignments ("
        "  id SERIAL PRIMARY KEY,"
        "  signup_user_id INTEGER REFERENCES users(id),"
        "  assigned_sponsor_id INTEGER REFERENCES users(id),"
        "  assigned_at TIMESTAMP DEFAULT NOW(),"
        "  funnel_source VARCHAR(64) DEFAULT 'start'"
        ")",
        "CREATE INDEX IF NOT EXISTS idx_rotator_assignments_signup ON rotator_assignments(signup_user_id)",
        # ── Signup funnel instrumentation (24 May 2026) ──
        # Tracks Free user drop-off between registration and paid activation.
        # See SignupFunnelEvent docstring. Endpoint /api/funnel/track is the
        # write side; reporting query is /admin/api/signup-funnel-stats.
        "CREATE TABLE IF NOT EXISTS signup_funnel_events ("
        "  id SERIAL PRIMARY KEY,"
        "  user_id INTEGER NOT NULL REFERENCES users(id),"
        "  event VARCHAR(50) NOT NULL,"
        "  created_at TIMESTAMP NOT NULL DEFAULT NOW()"
        ")",
        "CREATE INDEX IF NOT EXISTS idx_signup_funnel_user_event ON signup_funnel_events(user_id, event)",
        "CREATE INDEX IF NOT EXISTS idx_signup_funnel_created ON signup_funnel_events(created_at)",
        # ── Marketing assets — admin-curated landing pages (23 May 2026) ──
        # Members share /m/<slug>/<username> URLs with their ref baked in.
        # See MarketingAsset docstring for the full mechanic.
        "CREATE TABLE IF NOT EXISTS marketing_assets ("
        "  id SERIAL PRIMARY KEY,"
        "  slug VARCHAR(32) NOT NULL UNIQUE,"
        "  title VARCHAR(200) NOT NULL,"
        "  description TEXT,"
        "  asset_type VARCHAR(20) NOT NULL DEFAULT 'page',"
        "  html_template TEXT,"
        "  hero_image_path VARCHAR(500),"
        "  thumbnail_path VARCHAR(500),"
        "  video_url VARCHAR(500),"
        "  is_published BOOLEAN NOT NULL DEFAULT FALSE,"
        "  published_at TIMESTAMP,"
        "  created_at TIMESTAMP NOT NULL DEFAULT NOW(),"
        "  updated_at TIMESTAMP NOT NULL DEFAULT NOW()"
        ")",
        "CREATE INDEX IF NOT EXISTS idx_marketing_assets_slug ON marketing_assets(slug)",
        "CREATE INDEX IF NOT EXISTS idx_marketing_assets_published ON marketing_assets(is_published)",
        "CREATE TABLE IF NOT EXISTS marketing_asset_visits ("
        "  id SERIAL PRIMARY KEY,"
        "  asset_id INTEGER NOT NULL REFERENCES marketing_assets(id),"
        "  member_username VARCHAR(50) NOT NULL,"
        "  visitor_ip_hash VARCHAR(64),"
        "  user_agent VARCHAR(500),"
        "  signup_attributed_user_id INTEGER REFERENCES users(id),"
        "  created_at TIMESTAMP NOT NULL DEFAULT NOW()"
        ")",
        "CREATE INDEX IF NOT EXISTS idx_marketing_visits_asset ON marketing_asset_visits(asset_id)",
        "CREATE INDEX IF NOT EXISTS idx_marketing_visits_member ON marketing_asset_visits(member_username)",
        "CREATE INDEX IF NOT EXISTS idx_marketing_visits_signup ON marketing_asset_visits(signup_attributed_user_id)",
        "CREATE INDEX IF NOT EXISTS idx_marketing_visits_created ON marketing_asset_visits(created_at)",
    ]
    results = []
    with engine.connect() as conn:
        # ── Defensive timeouts (added 15 May 2026 launch-night) ──
        # Prevent any single ALTER/CREATE from hanging the entire app
        # boot if another connection holds a conflicting lock. Per-statement
        # timeouts; each statement's exception is already caught in the
        # loop body and recorded as ('skip', reason).
        try:
            conn.execute(text("SET lock_timeout = '5s'"))
            conn.execute(text("SET statement_timeout = '30s'"))
        except Exception as _e:
            # If even setting the timeout fails, fall through — at worst
            # we're back to the no-timeout behaviour we had before.
            pass
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
                results.append(("ok", sql[:60]))
            except Exception as e:
                conn.rollback()
                results.append(("skip", f"{sql[:50]} — {e}"))
    return results

try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    run_migrations()
except Exception as e:
    print(f"⚠️ run_migrations skipped: {e}")


def migrate_founder_expiries_one_shot():
    """ONE-SHOT data migration (added 16 May 2026).

    A previous Claude session implemented Founder activation with
    `membership_expires_at = datetime(2099, 12, 31)`, interpreting
    'lifetime' as 'lifetime free access for a one-time $15 payment'.
    The intent was always '$15/month with the price locked for life'.

    This function corrects existing rows. It is idempotent — runs on
    every app boot but only touches rows that still have the 2099
    bug. Once all legacy rows are fixed, subsequent runs are no-ops.

    Scope is intentionally tight:
      - is_founding_member = TRUE (only Founders are affected by the bug)
      - membership_expires_at > '2099-01-01' (so already-correct rows
        with today+30 expiries are never touched)
      - is_admin = FALSE (SuperAdPro house account stays untouched)

    New expiry: today + 30 days. Members continue paying $15/month at
    their locked price after migration (renewal cron in payment.py
    correctly honours membership_price_locked as of commit df548287).
    """
    from datetime import datetime as _dt, timedelta as _td
    new_expiry = _dt.utcnow() + _td(days=30)
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("SET lock_timeout = '5s'"))
                conn.execute(text("SET statement_timeout = '30s'"))
            except Exception:
                pass
            # Count first (cheap, no-op if zero) so we log meaningful state
            count_row = conn.execute(text(
                "SELECT COUNT(*) FROM users "
                "WHERE is_founding_member = TRUE "
                "  AND COALESCE(is_admin, FALSE) = FALSE "
                "  AND membership_expires_at > '2099-01-01'"
            )).fetchone()
            n = count_row[0] if count_row else 0
            if n == 0:
                # No legacy rows — already migrated (or none existed).
                # Silent — no need to log every boot.
                return
            # Apply
            result = conn.execute(text(
                "UPDATE users "
                "   SET membership_expires_at = :new_exp "
                " WHERE is_founding_member = TRUE "
                "   AND COALESCE(is_admin, FALSE) = FALSE "
                "   AND membership_expires_at > '2099-01-01'"
            ), {"new_exp": new_expiry})
            conn.commit()
            affected = getattr(result, 'rowcount', n)
            print(
                f"✓ Founder expiry migration: {affected} legacy 2099 row(s) "
                f"reset to {new_expiry.strftime('%Y-%m-%d')} "
                f"(monthly billing at locked $15/mo resumes from this date)"
            )
    except Exception as e:
        # Don't crash app boot over a data migration. Worst case is the
        # rows stay buggy for another deploy cycle; not worth halting.
        print(f"⚠️ founder expiry migration skipped: {e}")


try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    migrate_founder_expiries_one_shot()
except Exception as e:
    print(f"⚠️ migrate_founder_expiries_one_shot skipped: {e}")


def autoenrol_founders_to_rotator():
    """ONE-SHOT data migration (added 16 May 2026).

    Auto-enrols all active Founders into the rotator_queue with
    sequential queue positions, so the /start funnel can distribute
    public signups to them immediately. Founders opt OUT later from
    their dashboard if they don't want rotator-assigned signups.

    Steve's call: rotator should serve Founders specifically (not all
    paying members) — they paid for the early-member privilege and
    the /start page is pitched around becoming one of the first 100.

    Idempotent: only inserts rotator_queue rows for Founders that
    aren't already in the queue, and only flips rotator_opted_in
    where it's currently FALSE. Re-running on subsequent boots is
    a no-op.

    Scope:
      - is_active = TRUE (skip lapsed founders)
      - is_founding_member = TRUE
      - COALESCE(is_admin, FALSE) = FALSE (skip SuperAdPro)
      - id NOT IN existing rotator_queue
    """
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("SET lock_timeout = '5s'"))
                conn.execute(text("SET statement_timeout = '30s'"))
            except Exception:
                pass

            # Eligible Founders not yet in the queue
            rows = conn.execute(text("""
                SELECT u.id, u.username
                  FROM users u
                  LEFT JOIN rotator_queue rq ON rq.user_id = u.id
                 WHERE u.is_active = TRUE
                   AND u.is_founding_member = TRUE
                   AND COALESCE(u.is_admin, FALSE) = FALSE
                   AND rq.user_id IS NULL
                 ORDER BY u.founding_spot_number NULLS LAST, u.id
            """)).fetchall()

            if not rows:
                # No eligible Founders to enrol (either all already in queue,
                # or none active). Log so deploy logs always show migration ran.
                existing_count = conn.execute(text(
                    "SELECT COUNT(*) FROM rotator_queue"
                )).scalar() or 0
                print(
                    f"✓ Rotator auto-enrol: 0 new enrolments needed "
                    f"(queue already has {existing_count} member(s))"
                )
                return

            # Current max position so we slot new enrolments at the back
            mx_row = conn.execute(text(
                "SELECT COALESCE(MAX(queue_position), 0) FROM rotator_queue"
            )).fetchone()
            next_pos = (mx_row[0] or 0) + 1

            inserted = 0
            for r in rows:
                uid, uname = r[0], r[1]
                try:
                    conn.execute(text("""
                        INSERT INTO rotator_queue (user_id, queue_position, joined_at)
                        VALUES (:uid, :pos, NOW())
                        ON CONFLICT (user_id) DO NOTHING
                    """), {"uid": uid, "pos": next_pos})
                    conn.execute(text("""
                        UPDATE users
                           SET rotator_opted_in = TRUE
                         WHERE id = :uid
                           AND COALESCE(rotator_opted_in, FALSE) = FALSE
                    """), {"uid": uid})
                    inserted += 1
                    next_pos += 1
                except Exception as ie:
                    print(f"  ⚠️ rotator enrol failed for {uname} (id={uid}): {ie}")
            conn.commit()
            if inserted:
                print(
                    f"✓ Rotator auto-enrol: {inserted} active Founder(s) added to queue, "
                    f"opted_in=TRUE flipped"
                )
    except Exception as e:
        print(f"⚠️ autoenrol_founders_to_rotator skipped: {e}")


try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    autoenrol_founders_to_rotator()
except Exception as e:
    print(f"⚠️ autoenrol_founders_to_rotator skipped: {e}")


def file_missed_orphan_sap00205_one_shot():
    """ONE-SHOT data migration (added 17 May 2026).

    On 15 May during the launch incident, SAP-00205 (@chrissxx, user 205)
    sent $14.54 USDT to treasury at BSC block 98459311 — payment for
    her Basic order #17 which had already started to expire. The BSC
    watcher cron was running unreliably that day and never scanned the
    block, so the transfer never landed in onchain_orphan_transfers.

    Result: $14.54 sat in treasury invisible to all platform tooling.
    She raised it 17 May; Steve refunded the $14.54 from treasury back
    to her wallet 0xe7cBdA5...E73e via tx 0xe088cbab...1422 (block
    98812922) and asked for the books to balance.

    This migration retroactively files the original transfer as a
    resolved orphan with a resolution_note linking the refund tx, so
    financial sanity checks see a clean $14.54-in / $14.54-out pair
    instead of a phantom inbound.

    Idempotent: tx_hash has a unique constraint. Re-running on later
    boots is a no-op (insertion silently skipped or pre-check returns).
    """
    target_tx = "0xad61d059a75d9d9d055f72ab7c4efb9e47b91dac6404ee3cd2cf58b4a21cd6c0"
    refund_tx = "0xe088cbabff8d91ee11b5edbb0c40942e6879dca8f9329e83a62410ab5b8d1422"
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("SET lock_timeout = '5s'"))
                conn.execute(text("SET statement_timeout = '30s'"))
            except Exception:
                pass

            existing = conn.execute(
                text("SELECT id, resolved FROM onchain_orphan_transfers WHERE tx_hash = :tx"),
                {"tx": target_tx},
            ).fetchone()
            if existing:
                # Already filed by a previous boot — silent no-op.
                return

            conn.execute(text("""
                INSERT INTO onchain_orphan_transfers (
                    tx_hash, from_address, amount_usdt, block_number,
                    likely_rounded_amount, seen_at,
                    resolved, resolution_note, resolved_at
                ) VALUES (
                    :tx, :frm, :amt, :blk,
                    FALSE, NOW(),
                    TRUE, :note, NOW()
                )
            """), {
                "tx": target_tx,
                "frm": "0xe7cbda5d119abe105e29f9d62c7069ae3c34e73e",
                "amt": "14.54",
                "blk": 98459311,
                "note": (
                    "SAP-00205 (chrissxx) paid $14.54 to expired Basic order #17 "
                    "on 15 May at block 98459311. BSC watcher cron missed the block "
                    "during the launch incident — transfer never auto-filed. "
                    f"Refunded $14.54 from treasury on 17 May via {refund_tx} "
                    "(block 98812922). Books balance: $14.54 in / $14.54 out. "
                    "Filed retroactively by one-shot migration."
                ),
            })
            conn.commit()
            print(
                f"✓ SAP-00205 missed orphan filed retroactively: "
                f"$14.54 USDT from chrissxx, refund linked to {refund_tx[:18]}..."
            )
    except Exception as e:
        # Don't crash boot over a one-shot data fix.
        print(f"⚠️ file_missed_orphan_sap00205_one_shot skipped: {e}")


# NOTE: file_missed_orphan_sap00205_one_shot intentionally runs OUTSIDE
# the SKIP_MIGRATIONS gate. SKIP_MIGRATIONS exists to skip schema work
# and long-running migrations at boot to avoid container contention.
# This is a single-row idempotent INSERT WHERE NOT EXISTS — no schema
# change, no batch update, can't cause contention. The whole reason we
# need this fix is that the books are wrong; gating it behind a flag
# that may not be unset for a while would leave them wrong indefinitely.
try:
    file_missed_orphan_sap00205_one_shot()
except Exception as e:
    print(f"⚠️ file_missed_orphan_sap00205_one_shot skipped: {e}")


def resolve_layer3_test_orphan_one_shot():
    """ONE-SHOT data migration (added 17 May 2026).

    On 17 May Steve sent a $1 USDT BEP-20 transfer to the BSC treasury
    as the live verification test that Layer 3's in-process scanner
    was running. The scanner correctly picked it up within ~60 seconds
    and filed it as OnchainOrphanTransfer id=30 (tx
    0x1387e02e...c44, block 98827412). This was the end-to-end proof
    that closed out the BSC scanner reliability work.

    Orphan stays in the table for audit purposes but should be marked
    resolved so it doesn't sit as 'unresolved' forever. The $1 is a
    small test cost retained by the company (not refunded).

    Idempotent: only acts when the row exists, is the matching tx_hash,
    and is currently unresolved. Re-running is a no-op.
    """
    test_tx = "0x1387e02ead14b0b1e1029e372912a67142fde26894e501b614d136307d438c44"
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("SET lock_timeout = '5s'"))
                conn.execute(text("SET statement_timeout = '15s'"))
            except Exception:
                pass

            row = conn.execute(
                text("""
                    SELECT id, resolved FROM onchain_orphan_transfers
                     WHERE tx_hash = :tx
                """),
                {"tx": test_tx},
            ).fetchone()
            if not row:
                # Orphan never landed — unexpected since we verified live, but
                # don't crash boot. Future restarts may pick it up if it does
                # arrive late.
                return
            if row[1]:  # already resolved
                return

            conn.execute(text("""
                UPDATE onchain_orphan_transfers
                   SET resolved = TRUE,
                       resolved_at = NOW(),
                       resolution_note = :note
                 WHERE tx_hash = :tx
                   AND resolved = FALSE
            """), {
                "tx": test_tx,
                "note": (
                    "Layer-3 in-process BSC scanner verification test, 17 May 2026. "
                    "Steve sent $1 USDT from his personal wallet to treasury to "
                    "confirm the new in-process scheduler was alive and processing "
                    "transfers end-to-end. Scanner picked it up within ~60s, "
                    "proving Layer 3 working. $1 retained as company test cost "
                    "(not refunded). Closes out BSC scanner reliability work."
                ),
            })
            conn.commit()
            print(f"✓ Layer-3 test orphan #{row[0]} marked resolved")
    except Exception as e:
        print(f"⚠️ resolve_layer3_test_orphan_one_shot skipped: {e}")


try:
    resolve_layer3_test_orphan_one_shot()
except Exception as e:
    print(f"⚠️ resolve_layer3_test_orphan_one_shot skipped: {e}")

# Force critical column additions with direct connection
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        # Same defensive timeouts as run_migrations above.
        try:
            conn.execute(text("SET lock_timeout = '5s'"))
            conn.execute(text("SET statement_timeout = '30s'"))
        except Exception:
            pass
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS interests VARCHAR"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_country VARCHAR"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_interests VARCHAR"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS owner_tier INTEGER DEFAULT 1"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_age_min INTEGER"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_age_max INTEGER"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_gender VARCHAR"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS is_spotlight BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS age_range VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), type VARCHAR NOT NULL, icon VARCHAR DEFAULT '🔔', title VARCHAR NOT NULL, message VARCHAR NOT NULL, link VARCHAR, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW())"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS achievements (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), badge_id VARCHAR NOT NULL, title VARCHAR NOT NULL, icon VARCHAR DEFAULT '🏆', earned_at TIMESTAMP DEFAULT NOW())"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_user_badge ON achievements(user_id, badge_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id)"))
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS ab_variant_of INTEGER REFERENCES funnel_pages(id)"))
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS ab_split_pct INTEGER DEFAULT 50"))
        conn.execute(text("ALTER TABLE ai_usage_quotas ADD COLUMN IF NOT EXISTS social_posts_uses INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE ai_usage_quotas ADD COLUMN IF NOT EXISTS social_posts_total INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE ai_usage_quotas ADD COLUMN IF NOT EXISTS video_scripts_uses INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE ai_usage_quotas ADD COLUMN IF NOT EXISTS video_scripts_total INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE ai_usage_quotas ADD COLUMN IF NOT EXISTS swipe_file_uses INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE ai_usage_quotas ADD COLUMN IF NOT EXISTS swipe_file_total INTEGER DEFAULT 0"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS ai_response_cache (id SERIAL PRIMARY KEY, tool VARCHAR, prompt_hash VARCHAR UNIQUE, response TEXT, hit_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), expires_at TIMESTAMP)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS link_clicks (id SERIAL PRIMARY KEY, link_id INTEGER, link_type VARCHAR DEFAULT 'short', source VARCHAR, referrer TEXT, country VARCHAR, device VARCHAR, clicked_at TIMESTAMP DEFAULT NOW())"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_payment_to_company BOOLEAN DEFAULT FALSE"))
        # --- Course + Pass-Up tables ---
        conn.execute(text("CREATE TABLE IF NOT EXISTS courses (id SERIAL PRIMARY KEY, title VARCHAR NOT NULL, slug VARCHAR UNIQUE, description TEXT, price FLOAT NOT NULL, tier INTEGER NOT NULL, is_active BOOLEAN DEFAULT TRUE, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS course_purchases (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), course_id INTEGER REFERENCES courses(id), course_tier INTEGER, amount_paid FLOAT, payment_method VARCHAR DEFAULT 'wallet', tx_ref VARCHAR, created_at TIMESTAMP DEFAULT NOW())"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_course_purchases_user ON course_purchases(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_course_purchases_tier ON course_purchases(user_id, course_tier)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS course_commissions (id SERIAL PRIMARY KEY, purchase_id INTEGER REFERENCES course_purchases(id), buyer_id INTEGER REFERENCES users(id), earner_id INTEGER REFERENCES users(id), amount FLOAT, course_tier INTEGER, commission_type VARCHAR, pass_up_depth INTEGER DEFAULT 0, notes TEXT, created_at TIMESTAMP DEFAULT NOW())"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS course_passup_tracker (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), course_tier INTEGER, sales_count INTEGER DEFAULT 0, first_passed_up BOOLEAN DEFAULT FALSE, updated_at TIMESTAMP DEFAULT NOW())"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_passup_tracker_user_tier ON course_passup_tracker(user_id, course_tier)"))
        # Seed default courses if empty
        conn.execute(text("""
            INSERT INTO courses (title, slug, description, price, tier, sort_order)
            SELECT * FROM (VALUES
                ('SuperAdPro Starter', 'starter', 'Master the fundamentals of digital advertising and affiliate marketing.', 100, 1, 1),
                ('SuperAdPro Advanced', 'advanced', 'Advanced traffic strategies, funnel building and conversion optimisation.', 300, 2, 2),
                ('SuperAdPro Elite', 'elite', 'Complete business-in-a-box: high-ticket sales, team building and scaling systems.', 500, 3, 3)
            ) AS v(title, slug, description, price, tier, sort_order)
            WHERE NOT EXISTS (SELECT 1 FROM courses LIMIT 1)
        """))
        # Add course_earnings column to users
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS course_earnings FLOAT DEFAULT 0.0"))
        # Add slug column to ad_listings
        conn.execute(text("ALTER TABLE ad_listings ADD COLUMN IF NOT EXISTS slug VARCHAR"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_listings_slug ON ad_listings(slug) WHERE slug IS NOT NULL"))
        # Mark existing users as onboarding complete (they don't need the wizard)
        conn.execute(text("UPDATE users SET onboarding_completed = TRUE WHERE onboarding_completed IS NULL OR (created_at < NOW() - INTERVAL '1 hour')"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS avatar_data TEXT"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS btn_color VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS btn_text_color VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS text_color VARCHAR"))
        # ── LinkHub tables ──
        conn.execute(text("CREATE TABLE IF NOT EXISTS linkhub_profiles (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) UNIQUE, display_name VARCHAR, bio TEXT, avatar_url VARCHAR, theme VARCHAR DEFAULT 'dark', bg_color VARCHAR DEFAULT '#050d1a', accent_color VARCHAR DEFAULT '#00d4ff', font_family VARCHAR DEFAULT 'Rethink Sans', is_published BOOLEAN DEFAULT TRUE, total_views INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS linkhub_links (id SERIAL PRIMARY KEY, profile_id INTEGER REFERENCES linkhub_profiles(id), user_id INTEGER REFERENCES users(id), title VARCHAR NOT NULL, url VARCHAR NOT NULL, icon VARCHAR DEFAULT '🔗', is_active BOOLEAN DEFAULT TRUE, sort_order INTEGER DEFAULT 0, click_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS linkhub_clicks (id SERIAL PRIMARY KEY, link_id INTEGER REFERENCES linkhub_links(id), profile_id INTEGER REFERENCES linkhub_profiles(id), referrer VARCHAR, device VARCHAR, country VARCHAR, clicked_at TIMESTAMP DEFAULT NOW())"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_linkhub_profiles_user ON linkhub_profiles(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_linkhub_links_profile ON linkhub_links(profile_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_linkhub_clicks_link ON linkhub_clicks(link_id)"))
        # ── Nurture sequence table ──
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS nurture_sequences (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) UNIQUE,
                next_email INTEGER DEFAULT 1,
                next_send_at TIMESTAMP,
                completed BOOLEAN DEFAULT FALSE,
                cancelled_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                last_sent_at TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_nurture_user ON nurture_sequences(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_nurture_send ON nurture_sequences(next_send_at) WHERE completed = FALSE AND cancelled_at IS NULL"))
        # ── LinkHub upgrades ──
        conn.execute(text("ALTER TABLE linkhub_links ADD COLUMN IF NOT EXISTS btn_style VARCHAR DEFAULT 'filled'"))
        conn.execute(text("ALTER TABLE linkhub_links ADD COLUMN IF NOT EXISTS subtitle VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS social_links TEXT"))
        # LinkHub v2 enhanced editing columns
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS banner_image TEXT"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS bg_image TEXT"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS bg_gradient VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS soc_icon_shape VARCHAR DEFAULT 'circle'"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS follower_count VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_links ADD COLUMN IF NOT EXISTS font_size INTEGER DEFAULT 14"))
        conn.execute(text("ALTER TABLE linkhub_links ADD COLUMN IF NOT EXISTS font_weight VARCHAR DEFAULT 'semibold'"))
        conn.execute(text("ALTER TABLE linkhub_links ADD COLUMN IF NOT EXISTS text_align VARCHAR DEFAULT 'center'"))
        conn.execute(text("ALTER TABLE linkhub_links ADD COLUMN IF NOT EXISTS thumbnail TEXT"))

        # ── R2 image URL columns (2026-03-09) ──
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS avatar_r2_url VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS banner_r2_url VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS bg_r2_url VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS btn_style_type VARCHAR DEFAULT '3d'"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS btn_radius VARCHAR DEFAULT '12px'"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS btn_font_size INTEGER DEFAULT 15"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS btn_align VARCHAR DEFAULT 'center'"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS arrow_style VARCHAR DEFAULT 'arrow'"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS icon_size INTEGER DEFAULT 22"))
        conn.execute(text("ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS arrow_size INTEGER DEFAULT 16"))

        # ── Per-link button colours (2026-03-09) ──
        conn.execute(text("ALTER TABLE linkhub_links ADD COLUMN IF NOT EXISTS btn_bg_color VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_links ADD COLUMN IF NOT EXISTS btn_text_color VARCHAR"))

        # ── LinkHub click analytics upgrade (2026-03-09) ──
        conn.execute(text("ALTER TABLE linkhub_clicks ADD COLUMN IF NOT EXISTS browser VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_clicks ADD COLUMN IF NOT EXISTS country_name VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_clicks ADD COLUMN IF NOT EXISTS source VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_clicks ADD COLUMN IF NOT EXISTS utm_source VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_clicks ADD COLUMN IF NOT EXISTS utm_medium VARCHAR"))
        conn.execute(text("ALTER TABLE linkhub_clicks ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR"))

        # ── Course learning system (2026-03-09) ──
        conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR"))
        conn.execute(text("""CREATE TABLE IF NOT EXISTS course_chapters (
            id SERIAL PRIMARY KEY, course_id INTEGER REFERENCES courses(id),
            title VARCHAR NOT NULL, sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW())"""))
        conn.execute(text("""CREATE TABLE IF NOT EXISTS course_lessons (
            id SERIAL PRIMARY KEY, course_id INTEGER REFERENCES courses(id),
            chapter_id INTEGER REFERENCES course_chapters(id),
            title VARCHAR NOT NULL, video_url VARCHAR, duration_mins INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())"""))
        conn.execute(text("""CREATE TABLE IF NOT EXISTS course_progress (
            id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
            course_id INTEGER REFERENCES courses(id),
            lesson_id INTEGER REFERENCES course_lessons(id),
            completed_at TIMESTAMP DEFAULT NOW())"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_course_chapters_course ON course_chapters(course_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_course_lessons_chapter ON course_lessons(chapter_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_course_progress_user ON course_progress(user_id, course_id)"))

        # ── New business model: 40/50/5/5 spillover + bonus pool (2026-03-10) ──
        conn.execute(text("ALTER TABLE grids ADD COLUMN IF NOT EXISTS bonus_pool_accrued NUMERIC(18,6) DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE grids ADD COLUMN IF NOT EXISTS bonus_paid BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE grids ADD COLUMN IF NOT EXISTS bonus_rolled_over BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_earnings NUMERIC(18,6) DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS campaign_balance NUMERIC(18,6) DEFAULT 0.0"))
        # Achievement metadata for badges that carry per-instance data
        # (e.g. grid_bonus_paid stores the bonus amount + tier). 26 May 2026.
        conn.execute(text("ALTER TABLE achievements ADD COLUMN IF NOT EXISTS metadata_json TEXT"))

        # ── Grace-period escrow (26 May 2026) ──
        # Holds unqualified-upline commissions for 3 days while the
        # member has a chance to upgrade and claim them. Per Steve's spec:
        # "If Fred upgrades to Tier 2 and Joe is still on Tier 1, Joe's
        # would-be 40% + 6.25% are held; Joe has 3 days to upgrade or
        # the funds go to the company."
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pending_commissions (
                id               SERIAL PRIMARY KEY,
                recipient_id     INTEGER NOT NULL REFERENCES users(id),
                trigger_id       INTEGER NOT NULL REFERENCES users(id),
                grid_id          INTEGER REFERENCES grids(id),
                advance_number   INTEGER,
                amount_usdt      NUMERIC(18,6) NOT NULL,
                commission_type  VARCHAR NOT NULL,
                package_tier     INTEGER NOT NULL,
                required_tier    INTEGER NOT NULL,
                status           VARCHAR DEFAULT 'pending' NOT NULL,
                created_at       TIMESTAMP DEFAULT NOW() NOT NULL,
                expires_at       TIMESTAMP NOT NULL,
                released_at      TIMESTAMP,
                reminder_sent_at TIMESTAMP,
                notes            TEXT
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pending_commissions_recipient_status ON pending_commissions(recipient_id, status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pending_commissions_expires_at ON pending_commissions(expires_at) WHERE status = 'pending'"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS campaign_tier INTEGER DEFAULT 1"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS purchase_number INTEGER DEFAULT 1"))

        # ── ProSeller CRM (2026-03-10) ──
        conn.execute(text("""CREATE TABLE IF NOT EXISTS prospects (
            id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
            name VARCHAR NOT NULL, platform VARCHAR, source VARCHAR,
            stage VARCHAR DEFAULT 'cold', notes TEXT,
            link_clicks INTEGER DEFAULT 0, last_contact_at TIMESTAMP,
            follow_up_at TIMESTAMP, is_converted BOOLEAN DEFAULT FALSE,
            converted_user_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prospects_user ON prospects(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects(user_id, stage)"))
        conn.execute(text("""CREATE TABLE IF NOT EXISTS proseller_messages (
            id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
            prospect_id INTEGER REFERENCES prospects(id),
            message_type VARCHAR, platform VARCHAR, situation VARCHAR,
            prompt_context TEXT, generated_text TEXT,
            was_copied BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW())"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_proseller_msgs_user ON proseller_messages(user_id)"))

        # ── Campaign grace period + qualification model (2026-03-11) ──
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS grace_expires_at TIMESTAMP"))

        # ── membership_tier column (2026-03-11; default updated 20 May 2026) ──
        # Default changed from 'basic' (legacy dual-tier model) to 'free'
        # under flat-pricing. The ALTER TABLE IF NOT EXISTS is a no-op on
        # existing databases — this just makes future fresh databases get
        # the right default. Existing legacy rows are handled by the
        # 'legacy tier purge' migration further down.
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_tier VARCHAR DEFAULT 'free'"))

        conn.execute(text("""CREATE TABLE IF NOT EXISTS email_sequences (
            id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
            title VARCHAR, niche VARCHAR, tone VARCHAR,
            num_emails INTEGER DEFAULT 5, emails_json TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW())"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_email_sequences_user ON email_sequences(user_id)"))

        conn.execute(text("""CREATE TABLE IF NOT EXISTS member_leads (
            id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
            email VARCHAR NOT NULL, name VARCHAR,
            source_funnel_id INTEGER REFERENCES funnel_pages(id),
            source_url VARCHAR, brevo_contact_id VARCHAR,
            status VARCHAR DEFAULT 'new',
            email_sequence_id INTEGER REFERENCES email_sequences(id),
            emails_sent INTEGER DEFAULT 0, emails_opened INTEGER DEFAULT 0,
            emails_clicked INTEGER DEFAULT 0,
            last_opened_at TIMESTAMP, last_clicked_at TIMESTAMP,
            is_hot BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_member_leads_user ON member_leads(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_member_leads_status ON member_leads(user_id, status)"))

        conn.execute(text("""CREATE TABLE IF NOT EXISTS email_send_log (
            id SERIAL PRIMARY KEY,
            lead_id INTEGER REFERENCES member_leads(id),
            sequence_id INTEGER REFERENCES email_sequences(id),
            email_index INTEGER, brevo_message_id VARCHAR,
            status VARCHAR DEFAULT 'sent',
            sent_at TIMESTAMP DEFAULT NOW(),
            opened_at TIMESTAMP, clicked_at TIMESTAMP)"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_email_send_log_lead ON email_send_log(lead_id)"))

        # Lead Lists
        conn.execute(text("""CREATE TABLE IF NOT EXISTS lead_lists (
            id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
            name VARCHAR(100) NOT NULL, description VARCHAR(300),
            color VARCHAR(10) DEFAULT '#0ea5e9', lead_count INTEGER DEFAULT 0,
            sequence_id INTEGER REFERENCES email_sequences(id),
            created_at TIMESTAMP DEFAULT NOW())"""))
        conn.execute(text("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS list_id INTEGER REFERENCES lead_lists(id)"))

        # ── Lead attribution (campaign dashboard, 18 May 2026) ──
        # When a captured lead later activates Partner membership, the
        # activation pipeline sets attribution_user_id to the new
        # user's id. This is the join that powers per-page commission
        # attribution on /pro/funnels.
        conn.execute(text("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS attribution_user_id INTEGER REFERENCES users(id)"))
        conn.execute(text("ALTER TABLE member_leads ADD COLUMN IF NOT EXISTS attribution_set_at TIMESTAMP"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_member_leads_attribution ON member_leads(attribution_user_id)"))

        # ── EmailSendLog brevo_message_id (18 May 2026) ──
        # Added in commit 029bf94 to the model + CREATE TABLE, but no
        # ALTER for pre-existing tables. On Steve's live DB this caused
        # capture_lead to fail with InFailedSqlTransaction when
        # attempting to insert an EmailSendLog row with the column.
        conn.execute(text("ALTER TABLE email_send_log ADD COLUMN IF NOT EXISTS brevo_message_id VARCHAR"))

        # New columns on funnel_pages for AI funnel generator
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS has_capture_form BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS capture_form_heading VARCHAR"))
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS capture_form_subtext VARCHAR"))
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS capture_sequence_id INTEGER"))
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS leads_captured INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS ai_niche VARCHAR"))
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS ai_audience VARCHAR"))
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS ai_story TEXT"))
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS ai_tone VARCHAR"))

        # ── Phase 1 (Campaign Hub, 18 May 2026): explicit list binding ──
        # Pages now bind to a specific LeadList. When the capture endpoint
        # runs, MemberLead.list_id is set from page.default_list_id, so
        # leads land in the right bucket automatically. This is the
        # foundational change that unlocks source-page visibility,
        # cross-navigation, and the campaign-setup modal.
        # capture_sequence_id (already exists, line 2678) serves as the
        # default_sequence binding — no new column needed there.
        conn.execute(text("ALTER TABLE funnel_pages ADD COLUMN IF NOT EXISTS default_list_id INTEGER REFERENCES lead_lists(id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_funnel_pages_default_list ON funnel_pages(default_list_id)"))

        # ── Share Code system (19 May 2026): portable page-share codes ──
        # SAP-XXXX-XXXX codes that let members hand a page snapshot to
        # another member. Page-only — list/sequence binding stays
        # local to the recipient and is wired via the Phase 1 modal
        # on import. is_public is admin-flipped for the marketplace.
        # payload_json is schema-versioned via the top-level "v" key.
        conn.execute(text("""CREATE TABLE IF NOT EXISTS share_codes (
            id SERIAL PRIMARY KEY,
            code VARCHAR(20) UNIQUE NOT NULL,
            owner_user_id INTEGER NOT NULL REFERENCES users(id),
            source_page_id INTEGER REFERENCES funnel_pages(id),
            payload_json TEXT NOT NULL,
            is_public BOOLEAN DEFAULT FALSE,
            uses_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP)"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_share_codes_code ON share_codes(code)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_share_codes_owner ON share_codes(owner_user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_share_codes_public ON share_codes(is_public) WHERE is_public = TRUE"))

        # ── Member Course Marketplace tables ──
        conn.execute(text("""CREATE TABLE IF NOT EXISTS member_courses (
            id SERIAL PRIMARY KEY, creator_id INTEGER REFERENCES users(id),
            title VARCHAR(100) NOT NULL, slug VARCHAR UNIQUE,
            description TEXT, short_description VARCHAR(160),
            price NUMERIC(10,2) NOT NULL, thumbnail_url VARCHAR,
            category VARCHAR, difficulty_level VARCHAR DEFAULT 'beginner',
            status VARCHAR DEFAULT 'draft',
            ai_review_result TEXT, ai_reviewed_at TIMESTAMP,
            admin_reviewed_at TIMESTAMP, admin_notes TEXT,
            total_sales INTEGER DEFAULT 0, total_revenue NUMERIC(12,2) DEFAULT 0,
            total_duration_mins INTEGER DEFAULT 0, lesson_count INTEGER DEFAULT 0,
            is_public BOOLEAN DEFAULT TRUE, creator_agreed_terms_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_member_courses_creator ON member_courses(creator_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_member_courses_slug ON member_courses(slug)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_member_courses_status ON member_courses(status)"))

        conn.execute(text("""CREATE TABLE IF NOT EXISTS member_course_chapters (
            id SERIAL PRIMARY KEY, course_id INTEGER REFERENCES member_courses(id) ON DELETE CASCADE,
            title VARCHAR NOT NULL, chapter_order INTEGER DEFAULT 0)"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mc_chapters_course ON member_course_chapters(course_id)"))

        conn.execute(text("""CREATE TABLE IF NOT EXISTS member_course_lessons (
            id SERIAL PRIMARY KEY,
            chapter_id INTEGER REFERENCES member_course_chapters(id) ON DELETE CASCADE,
            course_id INTEGER REFERENCES member_courses(id),
            title VARCHAR NOT NULL, lesson_order INTEGER DEFAULT 0,
            content_type VARCHAR DEFAULT 'text',
            video_url VARCHAR, text_content TEXT, pdf_url VARCHAR,
            duration_minutes INTEGER DEFAULT 0, is_preview BOOLEAN DEFAULT FALSE)"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mc_lessons_chapter ON member_course_lessons(chapter_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mc_lessons_course ON member_course_lessons(course_id)"))

        conn.execute(text("""CREATE TABLE IF NOT EXISTS member_course_purchases (
            id SERIAL PRIMARY KEY, course_id INTEGER REFERENCES member_courses(id),
            buyer_id INTEGER REFERENCES users(id),
            buyer_email VARCHAR, buyer_name VARCHAR,
            amount_paid NUMERIC(10,2) NOT NULL,
            creator_commission NUMERIC(10,2) NOT NULL,
            sponsor_commission NUMERIC(10,2) NOT NULL,
            company_commission NUMERIC(10,2) NOT NULL,
            sponsor_id INTEGER REFERENCES users(id),
            payment_method VARCHAR DEFAULT 'stripe', payment_ref VARCHAR,
            status VARCHAR DEFAULT 'completed',
            access_token VARCHAR UNIQUE, refunded_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW())"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mcp_course ON member_course_purchases(course_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mcp_buyer ON member_course_purchases(buyer_id)"))

        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS marketplace_earnings NUMERIC(18,6) DEFAULT 0"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_credits INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS emails_sent_today INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS emails_sent_today_date VARCHAR"))
        conn.execute(text("ALTER TABLE ai_usage_quotas ADD COLUMN IF NOT EXISTS copilot_asks_today INTEGER DEFAULT 0"))
        # ── Co-Pilot ──
        conn.execute(text("""CREATE TABLE IF NOT EXISTS copilot_briefings (
            id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) UNIQUE,
            briefing_date VARCHAR, narrative TEXT, actions TEXT,
            generated_at TIMESTAMP DEFAULT NOW()
        )"""))
        # ── Stripe ──
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_billing VARCHAR DEFAULT 'monthly'"))
        # 23 May 2026: full Stripe re-integration. stripe_customer_id and
        # payment_method are new — payment_method drives renewal routing
        # (crypto path runs in process_auto_renewals; stripe path is
        # handled by Stripe webhook events). stripe_refund_eligible_until
        # is set on every successful Stripe payment to (now + 7 days).
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR DEFAULT 'crypto'"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_refund_eligible_until TIMESTAMP"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id)"))
        # Charge / refund / chargeback audit table
        conn.execute(text("""CREATE TABLE IF NOT EXISTS stripe_charges (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            stripe_charge_id VARCHAR,
            stripe_payment_intent_id VARCHAR,
            stripe_subscription_id VARCHAR,
            stripe_session_id VARCHAR,
            kind VARCHAR,
            product VARCHAR,
            amount_cents INTEGER,
            currency VARCHAR DEFAULT 'usd',
            company_share_cents INTEGER DEFAULT 0,
            refundable_cents INTEGER DEFAULT 0,
            description VARCHAR,
            raw_event_json TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stripe_charges_user ON stripe_charges(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stripe_charges_charge_id ON stripe_charges(stripe_charge_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stripe_charges_pi ON stripe_charges(stripe_payment_intent_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stripe_charges_subscription ON stripe_charges(stripe_subscription_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stripe_charges_session ON stripe_charges(stripe_session_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stripe_charges_kind ON stripe_charges(kind)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stripe_charges_product ON stripe_charges(product)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stripe_charges_created ON stripe_charges(created_at)"))

        # ── SuperMarket digital products ──
        conn.execute(text("""CREATE TABLE IF NOT EXISTS digital_products (
            id SERIAL PRIMARY KEY, creator_id INTEGER REFERENCES users(id),
            title VARCHAR(120) NOT NULL, slug VARCHAR UNIQUE, short_description VARCHAR(200),
            description TEXT, price NUMERIC(10,2) NOT NULL, compare_price NUMERIC(10,2),
            banner_url TEXT, category VARCHAR DEFAULT 'other', tags VARCHAR,
            file_url TEXT, file_name VARCHAR, file_size_bytes INTEGER,
            bonus_file_url TEXT, bonus_file_name VARCHAR,
            features_json TEXT, faq_json TEXT, demo_url VARCHAR, video_url VARCHAR,
            affiliate_commission INTEGER DEFAULT 25, affiliate_approved_only BOOLEAN DEFAULT FALSE,
            promo_materials_json TEXT,
            status VARCHAR DEFAULT 'draft', ai_review_result TEXT, ai_reviewed_at TIMESTAMP,
            admin_reviewed_at TIMESTAMP, admin_notes TEXT,
            creator_agreed_terms BOOLEAN DEFAULT FALSE, creator_agreed_at TIMESTAMP,
            total_sales INTEGER DEFAULT 0, total_revenue NUMERIC(12,2) DEFAULT 0,
            total_affiliates INTEGER DEFAULT 0, conversion_rate NUMERIC(5,2) DEFAULT 0,
            total_clicks INTEGER DEFAULT 0, total_refunds INTEGER DEFAULT 0,
            avg_rating NUMERIC(3,2) DEFAULT 0, review_count INTEGER DEFAULT 0,
            is_featured BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(),
            published_at TIMESTAMP
        )"""))
        conn.execute(text("""CREATE TABLE IF NOT EXISTS digital_product_purchases (
            id SERIAL PRIMARY KEY, product_id INTEGER REFERENCES digital_products(id),
            buyer_id INTEGER REFERENCES users(id), buyer_email VARCHAR, buyer_name VARCHAR,
            amount_paid NUMERIC(10,2) NOT NULL, creator_commission NUMERIC(10,2) NOT NULL,
            affiliate_commission NUMERIC(10,2) NOT NULL, platform_commission NUMERIC(10,2) NOT NULL,
            affiliate_id INTEGER REFERENCES users(id), payment_method VARCHAR DEFAULT 'stripe',
            payment_ref VARCHAR, status VARCHAR DEFAULT 'completed',
            download_token VARCHAR UNIQUE, download_count INTEGER DEFAULT 0,
            refunded_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
        )"""))
        conn.execute(text("""CREATE TABLE IF NOT EXISTS digital_product_reviews (
            id SERIAL PRIMARY KEY, product_id INTEGER REFERENCES digital_products(id),
            buyer_id INTEGER REFERENCES users(id), rating INTEGER NOT NULL,
            title VARCHAR(100), comment TEXT, is_verified BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        )"""))
        conn.execute(text("""CREATE TABLE IF NOT EXISTS digital_product_affiliates (
            id SERIAL PRIMARY KEY, product_id INTEGER REFERENCES digital_products(id),
            user_id INTEGER REFERENCES users(id), status VARCHAR DEFAULT 'approved',
            clicks INTEGER DEFAULT 0, sales INTEGER DEFAULT 0,
            earnings NUMERIC(10,2) DEFAULT 0, created_at TIMESTAMP DEFAULT NOW()
        )"""))

        # Master affiliate username
        conn.execute(text("UPDATE users SET username = 'SuperAdPro' WHERE is_admin = true AND username != 'SuperAdPro'"))

        # SuperSeller campaigns table
        conn.execute(text("""CREATE TABLE IF NOT EXISTS superseller_campaigns (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            niche VARCHAR(200) NOT NULL,
            audience TEXT,
            tone VARCHAR(50) DEFAULT 'professional',
            goal VARCHAR(50) DEFAULT 'lead_generation',
            landing_page_html TEXT,
            social_posts_json TEXT,
            email_sequence_json TEXT,
            video_scripts_json TEXT,
            ad_copy_json TEXT,
            strategy_json TEXT,
            funnel_url VARCHAR(500),
            landing_page_id INTEGER,
            brevo_list_id INTEGER,
            leads_count INTEGER DEFAULT 0,
            conversions_count INTEGER DEFAULT 0,
            link_clicks INTEGER DEFAULT 0,
            page_views INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'generating',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW())"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ss_user ON superseller_campaigns(user_id)"))

        # Custom AI Agent columns
        conn.execute(text("ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(20) DEFAULT 'superadpro'"))
        conn.execute(text("ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS offer_name VARCHAR(200)"))
        conn.execute(text("ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS offer_url VARCHAR(500)"))
        conn.execute(text("ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS offer_description TEXT"))
        conn.execute(text("ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS offer_pricing TEXT"))
        conn.execute(text("ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS offer_benefits TEXT"))
        conn.execute(text("ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS offer_objections TEXT"))
        conn.execute(text("ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS offer_extra_context TEXT"))
        conn.execute(text("ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS agent_name VARCHAR(100)"))
        conn.execute(text("ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS agent_greeting TEXT"))
        conn.execute(text("ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS chat_conversations INTEGER DEFAULT 0"))

        # ── Crypto payment orders table ──
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS crypto_payment_orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                product_type VARCHAR(50) NOT NULL,
                product_key VARCHAR(100) NOT NULL,
                product_meta TEXT,
                base_amount NUMERIC(18,6) NOT NULL,
                unique_amount NUMERIC(18,6) NOT NULL UNIQUE,
                status VARCHAR(20) DEFAULT 'pending',
                tx_hash VARCHAR(100),
                from_address VARCHAR(50),
                confirmed_at TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_crypto_orders_user ON crypto_payment_orders(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_crypto_orders_status ON crypto_payment_orders(status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_crypto_orders_amount ON crypto_payment_orders(unique_amount)"))
        # Drop unique constraint on unique_amount — matching is now by sender wallet address
        try:
            conn.execute(text("ALTER TABLE crypto_payment_orders DROP CONSTRAINT IF EXISTS crypto_payment_orders_unique_amount_key"))
        except Exception:
            pass
        try:
            conn.execute(text("DROP INDEX IF EXISTS ix_crypto_payment_orders_unique_amount"))
        except Exception:
            pass

        conn.commit()
        print("✅ Force migration: interests + targeting + onboarding + linkhub + nurture + linkhub-v2 + R2 + courses confirmed")

        # SuperSeller page customization columns
        for col, typ in [
            ("custom_video_url", "VARCHAR(500)"),
            ("custom_headline", "VARCHAR(300)"),
            ("custom_subtitle", "TEXT"),
            ("custom_cta_text", "VARCHAR(100)"),
            ("custom_cta_color", "VARCHAR(20)"),
            ("custom_html_inject", "TEXT"),
        ]:
            conn.execute(text(f"ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS {col} {typ}"))
        conn.commit()
        print("✅ SuperSeller page editor columns added")

        # Team Messages table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS team_messages (
                id SERIAL PRIMARY KEY,
                from_user_id INTEGER REFERENCES users(id),
                to_user_id INTEGER REFERENCES users(id),
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_team_msg_from ON team_messages(from_user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_team_msg_to ON team_messages(to_user_id)"))
        conn.commit()
        print("✅ Team messages table added")

except Exception as e:
    print(f"⚠️ Force migration note: {e}")

# ── activated_at migration (isolated so unrelated failures can't roll it back) ──
# This MUST run on its own commit, because the giant migration block above wraps
# 450+ statements in a single transaction — if any one statement fails, all are
# rolled back, leaving the SQLAlchemy model out of sync with the live schema and
# breaking the entire app (every User query 500s with UndefinedColumn).
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP"))
        conn.execute(text("UPDATE users SET activated_at = COALESCE(membership_expires_at - INTERVAL '31 days', created_at) WHERE is_active = TRUE AND activated_at IS NULL"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_activated_at ON users(activated_at) WHERE activated_at IS NOT NULL"))
        conn.commit()
        print("✅ activated_at column added/verified on users table")
except Exception as e:
    print(f"⚠️ activated_at migration failed: {e}")

# ── stuck_lapsed_alerted_at migration (isolated, same reason as activated_at above) ──
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stuck_lapsed_alerted_at TIMESTAMP"))
        conn.commit()
        print("✅ stuck_lapsed_alerted_at column added/verified on users table")
except Exception as e:
    print(f"⚠️ stuck_lapsed_alerted_at migration failed: {e}")

# ── Fast Start hero columns (added 17 May 2026) ──
# Two nullable timestamps tracking the dashboard "Activate Grid" hero state.
# Both NULL = pristine never-seen. pressed_at set = "in progress". hidden_at
# set = "dismissed or activated, never show again". Isolated migration so a
# failure here doesn't cascade through other column adds.
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS fast_start_pressed_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS fast_start_hidden_at TIMESTAMP"))
        conn.commit()
        print("✅ fast_start_pressed_at + fast_start_hidden_at columns added/verified on users table")
except Exception as e:
    print(f"⚠️ fast_start_* migration failed: {e}")

# UN-GATED column add for fast_start — runs regardless of SKIP_MIGRATIONS
# because IF NOT EXISTS makes this a trivially safe no-op once the column
# exists, and we need these columns NOW to ship the dashboard hero.
# Same precedent as the SAP-00205 orphan one-shot (commit ff77dc5).
try:
    with engine.connect() as conn:
        try:
            conn.execute(text("SET lock_timeout = '5s'"))
            conn.execute(text("SET statement_timeout = '15s'"))
        except Exception:
            pass
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS fast_start_pressed_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS fast_start_hidden_at TIMESTAMP"))
        conn.commit()
except Exception as e:
    print(f"⚠️ fast_start_* un-gated column add failed: {e}")

# ── Partial-payment auto-recovery audit fields (added 12 May 2026) ──
# When a NOWPayments partial payment is within 5% tolerance of the
# required amount, the IPN handler now auto-activates it. These
# columns let us audit which orders were auto-recovered and how short
# they were so we can tune the tolerance threshold over time.
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE nowpayments_orders ADD COLUMN IF NOT EXISTS partial_recovery_logged BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE nowpayments_orders ADD COLUMN IF NOT EXISTS partial_recovery_shortfall_usd NUMERIC(18,6)"))
        conn.commit()
        print("✅ partial_recovery columns added/verified on nowpayments_orders table")
except Exception as e:
    print(f"⚠️ partial_recovery migration failed: {e}")

# ── One-shot data fix: user 179 'itsamazing' missing membership_expires_at ──
# Discovered 15 May 2026 during flat-pricing migration planning. User 179 was
# manually recovered via payments_table row 'manual_recovery_grid_1' on
# 13 May 2026 (a Grid Tier 1 purchase that fell through and was admin-restored
# at 13:52:23). That recovery flipped is_active=True and membership_tier='pro'
# but did NOT populate membership_expires_at, leaving the renewal cron unable
# to schedule their next charge.
#
# Fix: set membership_expires_at = activated_at + 31 days = 2026-06-13.
# Effect: user receives 31 days of membership starting from their activation
# (gives them the month they effectively paid for, even though the $20 was
# for a Grid tier not membership — fair handling of the data inconsistency).
# At expiry the standard renewal cron picks them up like any other monthly
# member, and once the flat-pricing migration ships they'll roll onto $15/mo
# founding rate.
#
# Idempotent: only sets the date if currently NULL. Safe to run on every
# startup; once fixed, the WHERE clause matches zero rows.
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        conn.execute(text("""
            UPDATE users
            SET membership_expires_at = activated_at + INTERVAL '31 days'
            WHERE id = 179
              AND is_active = TRUE
              AND membership_expires_at IS NULL
              AND activated_at IS NOT NULL
        """))
        conn.commit()
        print("✅ user 179 (itsamazing) membership_expires_at fix applied/verified")
except Exception as e:
    print(f"⚠️ user 179 expiry fix failed: {e}")

# ─────────────────────────────────────────────────────────────────────────
# FLAT-PRICING PARTNER MIGRATION (15 May 2026)
# ─────────────────────────────────────────────────────────────────────────
# Migrates from legacy three-tier model (free/basic/pro at $0/$20/$35) to
# flat partner model (free/partner/founding at $0/$20/$15 lifetime locked).
#
# Two phases, both idempotent so the block is safe on every Railway startup:
#
#   Phase 1 — Schema additions:
#     - is_founding_member (Boolean, default FALSE, indexed)
#     - founding_spot_number (Integer, unique, nullable; 1..100 for founders)
#     - membership_price_locked (Numeric(10,2), nullable; overrides standard
#       price in renewal cron when set)
#
#   Phase 2 — One-shot grandfathering:
#     - All is_active=TRUE users at migration moment become founding partners
#     - Assigned founding_spot_number in ascending activated_at order (1, 2, …)
#     - membership_price_locked set to 15.00 for each
#     - membership_tier set to 'founding' (replacing legacy 'basic'/'pro')
#     - membership_expires_at left UNTOUCHED — each user honours their current
#       paid period; the $15/mo rate kicks in at renewal time
#     - Idempotent guard: skips any user already flagged is_founding_member,
#       so a re-run touches zero rows once the migration has succeeded
#
# Lapse policy at expiry (handled by renewal cron, not this block):
#   - Comped accounts that don't pay $15 within grace period → lose founding
#     status (is_founding_member=FALSE, spot_number cleared, tier='free')
#   - Paid accounts continue at $15/mo until they cancel
#
# Note on user #1 (SuperAdPro admin): permanently active with 2099 expiry —
# becomes founding spot #1 by virtue of being earliest activated_at. Honoured
# as perma-comped admin account; renewal cron never fires for far-future expiry.
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        # ── Defensive timeouts (added 15 May 2026 after launch-night outage) ──
        # If another connection holds a lock on the users table (idle
        # transaction, long-running cron, anything), ALTER TABLE will wait
        # forever — and because this code runs at import time, that hangs
        # the entire app boot. A redeploy at 17:00 BST tonight got stuck in
        # exactly this state for ~30 min, with the primitive health
        # responder in start.py answering Railway healthchecks while the
        # real FastAPI app never finished loading.
        #
        # lock_timeout: give up acquiring a table lock after 5 seconds.
        # statement_timeout: give up a single statement after 30 seconds.
        # Both fire as exceptions, which the outer try/except below catches
        # and logs. The migration is idempotent so missing a run on one
        # boot is harmless — it'll succeed on the next deploy when the
        # lock is free.
        conn.execute(text("SET lock_timeout = '5s'"))
        conn.execute(text("SET statement_timeout = '30s'"))

        # Phase 1: schema columns
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS founding_spot_number INTEGER"))
        # Unique constraint on spot number to prevent two users sharing a spot —
        # the migration assigns them carefully but a race in /api/claim-founding
        # could otherwise race. CREATE UNIQUE INDEX IF NOT EXISTS is the
        # idempotent way (ALTER TABLE ADD UNIQUE CONSTRAINT errors on re-run).
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_founding_spot_number ON users(founding_spot_number) WHERE founding_spot_number IS NOT NULL"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_is_founding_member ON users(is_founding_member) WHERE is_founding_member = TRUE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_price_locked NUMERIC(10,2)"))
        conn.commit()
        print("✅ flat-pricing partner columns added/verified on users table")

        # Phase 2: one-shot grandfathering. We use a window function to assign
        # spot numbers atomically in a single UPDATE statement, ordered by
        # activated_at ASC. Users without activated_at (shouldn't happen given
        # the earlier activated_at backfill migration, but defensive) fall to
        # the end of the order via NULLS LAST.
        #
        # The WHERE clause filters on is_founding_member = FALSE so:
        #   - First run: matches all is_active=TRUE users, assigns spots 1..N
        #   - Subsequent runs: matches zero rows (already flagged), no-op
        # This makes it safe to redeploy without re-running the migration.
        result = conn.execute(text("""
            WITH ordered_actives AS (
                SELECT
                    id,
                    ROW_NUMBER() OVER (ORDER BY activated_at ASC NULLS LAST, id ASC) AS spot
                FROM users
                WHERE is_active = TRUE
                  AND is_founding_member = FALSE
            )
            UPDATE users u
            SET is_founding_member = TRUE,
                founding_spot_number = oa.spot,
                membership_price_locked = 15.00,
                membership_tier = 'founding'
            FROM ordered_actives oa
            WHERE u.id = oa.id
              AND oa.spot <= 100
            RETURNING u.id, u.founding_spot_number
        """))
        grandfathered = result.fetchall()
        conn.commit()
        if grandfathered:
            spots = sorted([r.founding_spot_number for r in grandfathered])
            print(f"✅ flat-pricing grandfathering: {len(grandfathered)} users granted founding partner status (spots {spots[0]}..{spots[-1]})")
        else:
            print("✅ flat-pricing grandfathering: no users to migrate (already complete)")
except Exception as e:
    print(f"⚠️ flat-pricing migration failed: {e}")

# ── Post-migration tier normalisation ─────────────────────────────────────
# Defensive idempotent fixup: any user flagged is_founding_member=TRUE who
# still has a legacy tier ('basic'/'pro') gets normalised to 'founding'.
# This handles the case where the admin-seed block (lines ~1701-1702) clobbered
# admin user tiers BACK to 'pro' after the migration set them to 'founding'.
# The seed block has now been corrected to leave membership_tier alone, but
# this one-shot fixup ensures any user whose tier got clobbered in the gap
# gets corrected on the next startup.
#
# Idempotent: WHERE membership_tier != 'founding' means once everyone is
# correctly tagged, the UPDATE matches zero rows.
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        # Same defensive timeouts as the flat-pricing migration above —
        # see comments there for rationale.
        conn.execute(text("SET lock_timeout = '5s'"))
        conn.execute(text("SET statement_timeout = '30s'"))
        result = conn.execute(text("""
            UPDATE users
            SET membership_tier = 'founding'
            WHERE is_founding_member = TRUE
              AND membership_tier != 'founding'
            RETURNING id
        """))
        normalised = result.fetchall()
        conn.commit()
        if normalised:
            print(f"✅ flat-pricing tier normalisation: {len(normalised)} founding members had tier corrected to 'founding'")
        else:
            print("✅ flat-pricing tier normalisation: all founding members correctly tagged")
except Exception as e:
    print(f"⚠️ tier normalisation failed: {e}")

# ── Legacy 'basic'/'pro' tier purge (20 May 2026) ──
# Locked tier model under flat pricing: free / partner / founding.
# 'basic' and 'pro' are legacy strings from the dual-tier model that
# was retired 15 May 2026. They should no longer exist on any user row.
#
# Two cases to clean up:
#   1. is_active=TRUE  AND tier IN ('basic','pro') AND is_founding_member=FALSE
#      → these are paying members on the old tier strings. They paid for
#        Basic or Pro before the flat-pricing migration and were either
#        missed by the founding-grandfather (only first 100 got promoted)
#        or activated through a code path that still wrote the legacy
#        string. Normalise to 'partner' — they're paying $20/mo (or
#        whatever the renewal cron charges) and 'partner' is the
#        correct flat-pricing label.
#
#   2. is_active=FALSE AND tier IN ('basic','pro')
#      → inactive users still tagged with a legacy tier. The 10 May
#        migration covered the basic case; this is the catch-all for
#        any 'pro' inactives plus any 'basic' rows that slipped through.
#        Normalise to 'free' — they're not paying, the tier is metadata
#        only at this point.
#
# Idempotent: subsequent boots match zero rows. The defensive timeouts
# match the rest of the migration block (5s lock, 30s statement).
#
# Founders are explicitly excluded from case 1 (is_founding_member=FALSE
# filter) so even if a paid-Founder row somehow has tier='basic' it gets
# normalised to 'partner' via case 1, NOT to 'founding'. Founder status
# is owned by is_founding_member + the prior 'flat-pricing tier
# normalisation' block — this migration doesn't override it.
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        conn.execute(text("SET lock_timeout = '5s'"))
        conn.execute(text("SET statement_timeout = '30s'"))

        # Case 1: active legacy paying members → partner
        result_active = conn.execute(text("""
            UPDATE users
            SET membership_tier = 'partner'
            WHERE is_active = TRUE
              AND membership_tier IN ('basic', 'pro')
              AND COALESCE(is_founding_member, FALSE) = FALSE
            RETURNING id, username
        """))
        moved_to_partner = result_active.fetchall()

        # Case 2: inactive legacy → free
        result_inactive = conn.execute(text("""
            UPDATE users
            SET membership_tier = 'free'
            WHERE is_active = FALSE
              AND membership_tier IN ('basic', 'pro')
            RETURNING id, username
        """))
        moved_to_free = result_inactive.fetchall()

        conn.commit()

        if moved_to_partner:
            usernames = ", ".join(f"@{r.username}" for r in moved_to_partner[:10])
            extra = f" (and {len(moved_to_partner) - 10} more)" if len(moved_to_partner) > 10 else ""
            print(f"✅ legacy tier purge: {len(moved_to_partner)} active users moved basic/pro → partner: {usernames}{extra}")
        if moved_to_free:
            usernames = ", ".join(f"@{r.username}" for r in moved_to_free[:10])
            extra = f" (and {len(moved_to_free) - 10} more)" if len(moved_to_free) > 10 else ""
            print(f"✅ legacy tier purge: {len(moved_to_free)} inactive users moved basic/pro → free: {usernames}{extra}")
        if not moved_to_partner and not moved_to_free:
            print("✅ legacy tier purge: no rows to migrate (already clean)")
except Exception as e:
    print(f"⚠️ legacy tier purge failed: {e}")

# ── Achievement badge_id migration: pro_member → founding_member (20 May 2026) ──
# The 'pro_member' badge was awarded under the Basic/Pro dual-tier model
# when a user upgraded to Pro. Under flat-pricing that badge has no meaning
# (no Pro tier exists). We repurpose the slot for the 100-spot Founding
# achievement, which is genuinely valuable under the new model.
#
# Migration policy: any user who was a Founder at migration time keeps the
# badge (renamed to 'founding_member'). Any user who had 'pro_member' but
# is NOT a founding member has the badge deleted — it's no longer earnable.
# Idempotent.
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        conn.execute(text("SET lock_timeout = '5s'"))
        conn.execute(text("SET statement_timeout = '30s'"))

        # Step 1: rename pro_member → founding_member for users who are founding
        renamed = conn.execute(text("""
            UPDATE achievements
            SET badge_id = 'founding_member'
            WHERE badge_id = 'pro_member'
              AND user_id IN (SELECT id FROM users WHERE is_founding_member = TRUE)
            RETURNING user_id
        """)).fetchall()

        # Step 2: delete pro_member for users who are NOT founding (no
        # equivalent meaning under flat-pricing)
        deleted = conn.execute(text("""
            DELETE FROM achievements
            WHERE badge_id = 'pro_member'
            RETURNING user_id
        """)).fetchall()

        conn.commit()
        if renamed or deleted:
            print(
                f"✅ achievement migration: {len(renamed)} pro_member → founding_member, "
                f"{len(deleted)} pro_member badges deleted (non-founding holders)"
            )
        else:
            print("✅ achievement migration: no pro_member badges to migrate")
except Exception as e:
    print(f"⚠️ achievement migration failed: {e}")

# ── Brand Poster Generator tables (added 12 May 2026) ──
# Three tables for the BPG feature in Creative Studio. Defined as
# SQLAlchemy models above, but kept as an isolated CREATE TABLE block
# here because the initial Base.metadata.create_all on line ~1478
# silently skipped these tables on first Railway deploy (likely an
# engine state / import ordering issue). Without these tables, any
# call to /api/posters/* fails with 'relation does not exist'.
#
# This block uses CREATE TABLE IF NOT EXISTS so it's idempotent and
# safe to run on every startup. Mirrors the SQLAlchemy schema 1:1.
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        # poster_templates — the master catalogue (6 templates seeded
        # from app/poster_templates.py at first endpoint hit)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS poster_templates (
                id                  SERIAL PRIMARY KEY,
                slug                VARCHAR(60) UNIQUE NOT NULL,
                name                VARCHAR(120) NOT NULL,
                description         TEXT NOT NULL,
                category            VARCHAR(40) DEFAULT 'general',
                sort_order          INTEGER DEFAULT 100,
                is_active           BOOLEAN DEFAULT TRUE,
                master_prompt       TEXT NOT NULL,
                input_fields        TEXT NOT NULL,
                aspect_ratio        VARCHAR(10) DEFAULT '3:4',
                supports_photo      BOOLEAN DEFAULT TRUE,
                preview_image_url   TEXT,
                thumbnail_url       TEXT,
                share_slug          VARCHAR(40) UNIQUE,
                created_at          TIMESTAMP DEFAULT NOW(),
                updated_at          TIMESTAMP DEFAULT NOW()
            )
        """))
        # Indexes for poster_templates
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_templates_slug ON poster_templates(slug)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_templates_category ON poster_templates(category)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_templates_sort_order ON poster_templates(sort_order)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_templates_is_active ON poster_templates(is_active)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_templates_share_slug ON poster_templates(share_slug)"))

        # poster_generations — one row per Generate click
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS poster_generations (
                id                    SERIAL PRIMARY KEY,
                user_id               INTEGER NOT NULL REFERENCES users(id),
                template_id           INTEGER NOT NULL REFERENCES poster_templates(id),
                input_values          TEXT NOT NULL,
                reference_photo_url   TEXT,
                rendered_prompt       TEXT,
                candidate_urls        TEXT,
                chosen_index          INTEGER,
                chosen_url            TEXT,
                status                VARCHAR(20) DEFAULT 'pending',
                error_message         TEXT,
                credits_charged       INTEGER DEFAULT 0,
                grok_request_id       VARCHAR(80),
                created_at            TIMESTAMP DEFAULT NOW(),
                completed_at          TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_generations_user_id ON poster_generations(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_generations_template_id ON poster_generations(template_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_generations_status ON poster_generations(status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_generations_created_at ON poster_generations(created_at)"))

        # poster_template_shares — viral landing page click tracking
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS poster_template_shares (
                id                  SERIAL PRIMARY KEY,
                share_slug          VARCHAR(40) NOT NULL,
                template_id         INTEGER NOT NULL REFERENCES poster_templates(id),
                sharer_user_id      INTEGER NOT NULL REFERENCES users(id),
                visitor_ip_hash     VARCHAR(64),
                visitor_country     VARCHAR(2),
                user_agent          VARCHAR(300),
                referrer            VARCHAR(500),
                converted_user_id   INTEGER REFERENCES users(id),
                converted_at        TIMESTAMP,
                visited_at          TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_shares_share_slug ON poster_template_shares(share_slug)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_shares_template_id ON poster_template_shares(template_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_shares_sharer_user_id ON poster_template_shares(sharer_user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_shares_converted_user_id ON poster_template_shares(converted_user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_poster_shares_visited_at ON poster_template_shares(visited_at)"))

        conn.commit()
        print("✅ Brand Poster Generator tables (poster_templates, poster_generations, poster_template_shares) created/verified")
except Exception as e:
    print(f"⚠️ Brand Poster Generator migration failed: {e}")

# ── Rename supercut -> superscene tables (one-time migration) ──
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        # Rename tables if old names exist
        for old, new in [("supercut_credits", "superscene_credits"), ("supercut_videos", "superscene_videos"), ("supercut_orders", "superscene_orders")]:
            try:
                conn.execute(text(f"ALTER TABLE IF EXISTS {old} RENAME TO {new}"))
            except Exception:
                pass
        # Rename indexes
        for old, new in [("idx_sc_videos_user", "idx_ss_videos_user"), ("idx_sc_videos_task", "idx_ss_videos_task"), ("idx_sc_orders_user", "idx_ss_orders_user")]:
            try:
                conn.execute(text(f"ALTER INDEX IF EXISTS {old} RENAME TO {new}"))
            except Exception:
                pass
        conn.commit()
        print("✅ supercut -> superscene table rename migration done")
except Exception as e:
    print(f"⚠️ Table rename note: {e}")

# ── SuperScene tables (own block so earlier failures don't skip these) ──
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS superscene_credits (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
                balance INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS superscene_videos (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                task_id VARCHAR(200) NOT NULL,
                model_key VARCHAR(20) NOT NULL,
                model_name VARCHAR(50),
                prompt TEXT NOT NULL,
                duration INTEGER NOT NULL,
                ratio VARCHAR(10) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                video_url TEXT,
                credits_used INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                completed_at TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ss_videos_user ON superscene_videos(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ss_videos_task ON superscene_videos(task_id)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS superscene_orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                pack_slug VARCHAR(30) NOT NULL,
                credits INTEGER NOT NULL,
                amount_usd NUMERIC(10,2) NOT NULL,
                payment_method VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                stripe_session_id VARCHAR(200),
                crypto_order_id INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                completed_at TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ss_orders_user ON superscene_orders(user_id)"))

        # ── NOWPayments orders table ──
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS nowpayments_orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                product_type VARCHAR(50) NOT NULL,
                product_key VARCHAR(100) NOT NULL,
                product_meta TEXT,
                price_usd NUMERIC(18,6) NOT NULL,
                np_invoice_id BIGINT,
                np_payment_id BIGINT,
                internal_order_id VARCHAR(100),
                invoice_url TEXT,
                pay_currency VARCHAR(20),
                pay_amount NUMERIC(18,8),
                actually_paid NUMERIC(18,8),
                outcome_amount NUMERIC(18,8),
                outcome_currency VARCHAR(20),
                status VARCHAR(30) DEFAULT 'pending',
                confirmed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_np_orders_user ON nowpayments_orders(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_np_orders_invoice ON nowpayments_orders(np_invoice_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_np_orders_payment ON nowpayments_orders(np_payment_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_np_orders_internal ON nowpayments_orders(internal_order_id)"))

        # ── Pipeline tables (long-form video) ──
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS superscene_pipelines (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                title VARCHAR(200),
                script TEXT NOT NULL,
                style VARCHAR(50) DEFAULT 'cinematic',
                model_key VARCHAR(30) DEFAULT 'kling3',
                voice VARCHAR(50) DEFAULT 'en-US-GuyNeural',
                resolution VARCHAR(10) DEFAULT '1080p',
                status VARCHAR(20) DEFAULT 'draft',
                total_scenes INTEGER DEFAULT 0,
                completed_scenes INTEGER DEFAULT 0,
                credits_used INTEGER DEFAULT 0,
                final_video_url TEXT,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ss_pipe_user ON superscene_pipelines(user_id)"))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS superscene_pipeline_scenes (
                id SERIAL PRIMARY KEY,
                pipeline_id INTEGER NOT NULL REFERENCES superscene_pipelines(id) ON DELETE CASCADE,
                scene_number INTEGER NOT NULL,
                narration_text TEXT,
                visual_prompt TEXT,
                transition_type VARCHAR(20) DEFAULT 'cut',
                duration_seconds NUMERIC(6,2),
                voiceover_url TEXT,
                video_url TEXT,
                video_task_id VARCHAR(100),
                status VARCHAR(20) DEFAULT 'pending',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ss_pipe_scene ON superscene_pipeline_scenes(pipeline_id)"))

        # Seed master affiliate (SAP-00001 / user 1) with 500 free credits
        conn.execute(text("""
            INSERT INTO superscene_credits (user_id, balance)
            VALUES (1, 500)
            ON CONFLICT (user_id) DO UPDATE
              SET balance = GREATEST(superscene_credits.balance, 500)
        """))
        conn.commit()
        print("✅ SuperScene tables created + 500 credits seeded for SAP-00001")

except Exception as e:
    print(f"⚠️ Force migration note: {e}")

# ── Always-run: ensure SAP-00001 has at least 500 SuperScene credits ──
try:
    with engine.connect() as conn:
        conn.execute(text("""
            INSERT INTO superscene_credits (user_id, balance)
            VALUES (1, 500)
            ON CONFLICT (user_id) DO UPDATE
              SET balance = GREATEST(superscene_credits.balance, 500)
        """))
        conn.commit()
        print("✅ SuperScene: SAP-00001 credit floor confirmed (500)")
except Exception as e:
    print(f"⚠️ SuperScene seed note: {e}")

# ── Gift Vouchers (Pay It Forward) ──
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS gift_vouchers (
                id SERIAL PRIMARY KEY,
                gifter_user_id INTEGER NOT NULL REFERENCES users(id),
                voucher_code VARCHAR(12) UNIQUE NOT NULL,
                gift_type VARCHAR(20) NOT NULL DEFAULT 'membership',
                gift_value NUMERIC(10,2) NOT NULL DEFAULT 20,
                tier_num INTEGER,
                recipient_name VARCHAR(100),
                recipient_email VARCHAR(200),
                personal_message TEXT,
                is_free_voucher BOOLEAN DEFAULT FALSE,
                payment_method VARCHAR(20),
                payment_ref VARCHAR(200),
                status VARCHAR(20) DEFAULT 'available',
                claimed_by_user_id INTEGER REFERENCES users(id),
                claimed_at TIMESTAMP,
                pif_chain_depth INTEGER DEFAULT 1,
                parent_voucher_id INTEGER REFERENCES gift_vouchers(id),
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_gift_vouchers_code ON gift_vouchers(voucher_code)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_gift_vouchers_gifter ON gift_vouchers(gifter_user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_gift_vouchers_status ON gift_vouchers(status)"))
        conn.commit()
        print("✅ Gift vouchers table created")
except Exception as e:
    print(f"⚠️ Gift vouchers note: {e}")

# ── 30-Day Challenge table ──
try:
    with engine.connect() as conn:
        conn.execute(text("""CREATE TABLE IF NOT EXISTS challenge_progress (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            started_at TIMESTAMP DEFAULT NOW(),
            current_day INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0,
            streak INTEGER DEFAULT 0,
            last_active_day INTEGER DEFAULT 0,
            completed_tasks TEXT DEFAULT '',
            badges TEXT DEFAULT '',
            is_complete BOOLEAN DEFAULT FALSE,
            completed_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT NOW()
        )"""))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_challenge_user ON challenge_progress(user_id)"))
        conn.commit()
        print("✅ Challenge progress table created")
except Exception as e:
    print(f"⚠️ Challenge note: {e}")

# ── Daily Briefings (cron morning email) ──
try:
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS daily_briefings (
                id SERIAL PRIMARY KEY,
                briefing_date VARCHAR(10) UNIQUE NOT NULL,
                metrics_json TEXT NOT NULL,
                summary_text TEXT NOT NULL,
                launch_log_md TEXT,
                email_sent_to VARCHAR(120),
                email_sent_at TIMESTAMP,
                generation_ms INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_daily_briefings_date ON daily_briefings(briefing_date)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_daily_briefings_created ON daily_briefings(created_at)"))
        conn.commit()
        print("✅ Daily briefings table created")
except Exception as e:
    print(f"⚠️ Daily briefings note: {e}")


# ── Custom Domains: table creation + v2 columns (21 May + 25 May 2026) ──
# v1 (21 May) defined the SQLAlchemy CustomDomain model but the production
# CREATE TABLE step was missed — the model existed in code but no physical
# table was created in Postgres. The /api/custom-domains endpoint hit this
# and returned 500. Discovered 25 May during the Custom Domain v2 deploy
# verification.
#
# This block now does both jobs:
#   1. CREATE TABLE IF NOT EXISTS — base v1 schema (idempotent)
#   2. ALTER TABLE ADD COLUMN IF NOT EXISTS — v2 Railway integration columns
#
# Both halves are idempotent so re-running across redeploys is safe.
#
# v2 columns:
#   railway_domain_id   — UUID returned by customDomainCreate mutation
#   tls_status          — Railway's certificateStatus (ISSUED, ISSUING, etc.)
#   dns_records_json    — JSON-encoded list of DNS records to display in UI
try:
    with engine.connect() as conn:
        # v1 base table — was meant to exist since 21 May, never actually
        # created on prod. SQLAlchemy's create_all does not run here for
        # historical reasons; explicit DDL keeps the migration narrative
        # readable and matches the pattern of other tables in this file.
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS custom_domains (
                id                   SERIAL PRIMARY KEY,
                user_id              INTEGER NOT NULL REFERENCES users(id),
                domain               VARCHAR NOT NULL UNIQUE,
                verification_status  VARCHAR DEFAULT 'pending',
                last_error           TEXT,
                last_checked_at      TIMESTAMP,
                verified_at          TIMESTAMP,
                created_at           TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_custom_domains_user_id ON custom_domains(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON custom_domains(verification_status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_custom_domains_created ON custom_domains(created_at)"))

        # v2 columns (25 May 2026) — additive, nullable, safe on retry
        conn.execute(text("ALTER TABLE custom_domains ADD COLUMN IF NOT EXISTS railway_domain_id VARCHAR"))
        conn.execute(text("ALTER TABLE custom_domains ADD COLUMN IF NOT EXISTS tls_status VARCHAR"))
        conn.execute(text("ALTER TABLE custom_domains ADD COLUMN IF NOT EXISTS dns_records_json TEXT"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_custom_domains_railway_id ON custom_domains(railway_domain_id)"))
        conn.commit()
        print("✅ Custom Domains table ensured (v1 base + v2 Railway columns)")
except Exception as e:
    print(f"⚠️ Custom Domains migration note: {e}")


# ── membership_tier 'basic'→'free' migration for inactive users (10 May 2026) ──
# Background: until launch day, the User model defaulted membership_tier to
# 'basic' which made every newly-registered free user look paid in any code
# that read the tier alone. This caused BasicToolsPage and the dashboard hero
# to render as if the free user had Basic access (server gates still blocked
# their actions, but the UI lied). We changed the default to 'free' and need
# a one-time UPDATE to fix existing rows that pre-date that change.
#
# Safety: the WHERE clause is doubly restrictive — only rows where the user
# is_active=FALSE AND tier='basic'. Paying Basic and Pro members are never
# touched (their is_active=TRUE). Idempotent on subsequent restarts because
# the WHERE clause matches zero rows after the first run.
try:
    with engine.connect() as conn:
        result = conn.execute(text(
            "UPDATE users SET membership_tier = 'free' "
            "WHERE is_active = FALSE AND membership_tier = 'basic'"
        ))
        conn.commit()
        rowcount = getattr(result, "rowcount", -1)
        if rowcount > 0:
            print(f"✅ membership_tier migration: {rowcount} inactive users moved from 'basic' to 'free'")
        else:
            print("✅ membership_tier migration: no rows to migrate (already on 'free' or all users active)")
except Exception as e:
    print(f"⚠️ membership_tier migration note: {e}")


# ── Admin repair audit log (13 May 2026) ──
# Every mutation made by /admin/repair/* tools is logged here BEFORE
# commit, so we always have an audit trail of what was changed, when,
# by which admin, and why. Read after creation; never updated.
# Built alongside the platform health scanner framework — see
# app/health_scanners.py and app/health_repair.py.
try:
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS admin_repair_log (
                id SERIAL PRIMARY KEY,
                repair_tool VARCHAR(80) NOT NULL,
                target_kind VARCHAR(40) NOT NULL,
                target_id INTEGER NOT NULL,
                admin_user_id INTEGER NOT NULL REFERENCES users(id),
                admin_username VARCHAR(80) NOT NULL,
                dry_run BOOLEAN NOT NULL DEFAULT FALSE,
                success BOOLEAN NOT NULL DEFAULT FALSE,
                changes_json TEXT NOT NULL,
                summary TEXT,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_admin_repair_log_tool "
            "ON admin_repair_log(repair_tool)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_admin_repair_log_target "
            "ON admin_repair_log(target_kind, target_id)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_admin_repair_log_admin "
            "ON admin_repair_log(admin_user_id)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_admin_repair_log_created "
            "ON admin_repair_log(created_at)"
        ))
        conn.commit()
        print("✅ admin_repair_log table ready")
except Exception as e:
    print(f"⚠️ admin_repair_log migration note: {e}")


# ── Marketing assets — seed PIF landing page (23 May 2026) ──
# Loads the HTML template from app/marketing_assets/pif.html and upserts
# the canonical PIF row into the marketing_assets table.
#
# Idempotent — the upsert (insert-or-update on conflict) means every boot
# refreshes the template from disk, so authoring iterations land on
# deploy without any admin endpoint round-trip. To author a new asset,
# add a new file in app/marketing_assets/ and a new seed block here.
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    import os as _os
    _pif_html_path = _os.path.join(_os.path.dirname(__file__), 'marketing_assets', 'pif.html')
    if _os.path.exists(_pif_html_path):
        with open(_pif_html_path, 'r', encoding='utf-8') as _f:
            _pif_html = _f.read()
        with engine.connect() as conn:
            conn.execute(text("SET lock_timeout = '5s'"))
            conn.execute(text("SET statement_timeout = '30s'"))
            conn.execute(text("""
                INSERT INTO marketing_assets (
                    slug, title, description, asset_type, html_template,
                    hero_image_path, is_published, published_at, created_at, updated_at
                ) VALUES (
                    :slug, :title, :description, :asset_type, :html_template,
                    :hero_image_path, TRUE, NOW(), NOW(), NOW()
                )
                ON CONFLICT (slug) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    html_template = EXCLUDED.html_template,
                    hero_image_path = EXCLUDED.hero_image_path,
                    is_published = EXCLUDED.is_published,
                    updated_at = NOW()
            """), {
                "slug": "pif",
                "title": "Pay It Forward — Give someone a free month",
                "description": "Gift a SuperAdPro membership to someone who needs it. When they activate, you become their sponsor. Beautifully designed landing page with the chain-reaction story, gift card preview, and clear math.",
                "asset_type": "page",
                "html_template": _pif_html,
                "hero_image_path": "/static/images/marketing/pif-bg.jpg",
            })
            conn.commit()
            print(f"✅ marketing asset 'pif' seeded ({len(_pif_html)} chars HTML)")
    else:
        print(f"⚠️ PIF template not found at {_pif_html_path} — skipping seed")
except Exception as e:
    print(f"⚠️ PIF marketing asset seed failed: {e}")

# ─────────────────────────────────────────────────────────────────────────
# ONE-SHOT BACKFILL — Stripe webhook expires_at corruption (26 May 2026)
# ─────────────────────────────────────────────────────────────────────────
# Discovered 26 May 2026 via member_composition audit. 16 active members
# had membership_expires_at in the past despite being is_active=TRUE.
# Root cause: _stripe_handle_invoice_paid was reading invoice.period_end
# (the lookback usage period for revenue recognition) instead of
# invoice.lines.data[0].period.end (the service period being paid for).
# On a fresh subscription's first invoice these are NOT equivalent —
# period_end equals the subscription create timestamp, so expires_at was
# being written seconds before activated_at on every Stripe-rail signup.
#
# Webhook fix shipped in same commit as this migration. This block heals
# the historical corruption.
#
# Heuristic: any active monthly user whose expires_at < activated_at + 1d
# is corrupted (no legitimate path produces that state). Backfill to
# activated_at + 31 days for monthly, + 365 days for annual.
#
# Also heals the two NULL-expires_at edge cases (cryptobase26, verokins —
# historical activations that never set the field). Same backfill rule.
#
# Skips the SuperAdPro admin (user id 1 has activated_at = 2099-11-30
# sentinel and a far-future expiry, neither touched).
#
# Idempotent: WHERE clause excludes already-correct rows. Safe to leave
# in the boot block forever; once healed it matches zero rows.
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        # Monthly: expires_at < activated_at + 1 day OR expires_at IS NULL
        _monthly_result = conn.execute(text("""
            UPDATE users
            SET membership_expires_at = activated_at + INTERVAL '31 days'
            WHERE is_active = TRUE
              AND activated_at IS NOT NULL
              AND activated_at < '2099-01-01'
              AND COALESCE(membership_billing, 'monthly') = 'monthly'
              AND (
                  membership_expires_at IS NULL
                  OR membership_expires_at < activated_at + INTERVAL '1 day'
              )
            RETURNING id, username, activated_at, membership_expires_at
        """))
        _monthly_rows = list(_monthly_result)
        # Annual: same logic with 365-day window. Currently expected to be
        # zero rows (no annual subscribers yet) but covers the case if a
        # future annual signup hits the same bug before the webhook fix
        # propagates.
        _annual_result = conn.execute(text("""
            UPDATE users
            SET membership_expires_at = activated_at + INTERVAL '365 days'
            WHERE is_active = TRUE
              AND activated_at IS NOT NULL
              AND activated_at < '2099-01-01'
              AND membership_billing = 'annual'
              AND (
                  membership_expires_at IS NULL
                  OR membership_expires_at < activated_at + INTERVAL '1 day'
              )
            RETURNING id, username
        """))
        _annual_rows = list(_annual_result)
        conn.commit()
        if _monthly_rows or _annual_rows:
            print(
                f"✅ Stripe expires_at backfill: healed "
                f"{len(_monthly_rows)} monthly + {len(_annual_rows)} annual rows"
            )
            for _r in _monthly_rows[:20]:
                print(f"   • user {_r.id} ({_r.username}) → {_r.membership_expires_at}")
            if len(_monthly_rows) > 20:
                print(f"   • … and {len(_monthly_rows) - 20} more")
        else:
            print("✅ Stripe expires_at backfill: no corrupted rows (already healed)")
except Exception as e:
    print(f"⚠️ Stripe expires_at backfill failed: {e}")

# ─────────────────────────────────────────────────────────────────────
# Diagnostic — count legacy launch-wizard funnel pages (26 May 2026)
# ─────────────────────────────────────────────────────────────────────
# The /api/launch-wizard/generate-funnel endpoint was removed in the
# funnel-cleanup commit. It wrote rows with template_type='sections' and
# a JSON body_copy field — a schema the React editor cannot edit but the
# public /p/{slug} renderer still handles via section-templates.js.
#
# Any existing rows of this kind continue to render publicly but cannot
# be edited. This block logs the count + a sample so we know how many
# members may have orphaned pages. It does NOT modify anything.
#
# Read-only. Safe in boot block. One-line log on every boot.
try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    with engine.connect() as conn:
        _lw_count = conn.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM funnel_pages
            WHERE template_type = 'sections'
        """)).scalar() or 0
        _lw_published = conn.execute(text("""
            SELECT COUNT(*) AS cnt
            FROM funnel_pages
            WHERE template_type = 'sections' AND status = 'published'
        """)).scalar() or 0
        print(f"ℹ️  Legacy launch-wizard pages: {_lw_count} total, {_lw_published} published")
except Exception as e:
    print(f"⚠️ Launch-wizard diagnostic failed: {e}")


def migrate_grid_bonus_pools_one_shot():
    """ONE-SHOT data migration (added 26 May 2026).

    Top up every grid's bonus_pool_accrued to the current policy target
    if it's currently below. Closes the underpayment gap exposed when
    SuperAdPro's first completed Tier 1 grid paid out at $54 instead of
    the displayed $72 — pool had accrued under historical 5% rate
    (pre-21-May-2026) and old 64-seat geometry (pre-25-May-2026).

    Two passes:

    1. ACTIVE grids — bump bonus_pool_accrued up to the policy target
       so the bonus card on the Grid page reads correctly today. Future
       seat fills cap at the target via _accrue_to_pool, so this does
       not double-credit.

    2. COMPLETED grids that paid LESS than the policy target — issue a
       'grid_completion_bonus_topup' commission for the difference,
       credit the owner's campaign_balance, and bump bonus_pool_accrued
       on the grid record to match. Paying-members-only: skip the
       company account (id=1) and any inactive users.

    Idempotent via:
      - Active pass: only touches grids where pool < target.
      - Completed pass: checks for an existing _topup commission for
        the same (grid_id, advance_number) before paying again.

    Safe to re-run; will no-op once all pools match policy.
    """
    try:
        if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')

        # Hardcoded targets — must match GRID_COMPLETION_BONUS dict above.
        # Re-derived here so this migration doesn't crash if constants drift.
        # Tier price × 36 seats × 10% = target.
        TARGETS = {1: 72.0, 2: 180.0, 3: 360.0, 4: 720.0,
                   5: 1440.0, 6: 2160.0, 7: 2880.0, 8: 3600.0}

        with engine.connect() as conn:
            conn.execute(text("SET lock_timeout = '10s'"))
            conn.execute(text("SET statement_timeout = '60s'"))

            # ── Pass 1: active grids ──────────────────────────────────
            active_grids = conn.execute(text("""
                SELECT id, owner_id, package_tier,
                       COALESCE(bonus_pool_accrued, 0) AS pool
                FROM grids
                WHERE is_complete = FALSE
            """)).fetchall()

            active_topped = 0
            for g in active_grids:
                target = TARGETS.get(int(g.package_tier))
                if target is None:
                    continue
                if float(g.pool) >= target:
                    continue  # already at or above target — no-op
                conn.execute(text("""
                    UPDATE grids
                       SET bonus_pool_accrued = :target
                     WHERE id = :gid
                """), {"target": target, "gid": int(g.id)})
                active_topped += 1
            conn.commit()
            print(f"📊 Grid bonus pool migration — active pass: topped up {active_topped} grids")

            # ── Pass 2: completed grids underpaid ─────────────────────
            # Pull completed grids with a pool below target, owned by a
            # paying member (not the company), where we haven't already
            # issued a topup commission for this grid.
            underpaid = conn.execute(text("""
                SELECT g.id AS grid_id,
                       g.owner_id,
                       g.package_tier,
                       g.advance_number,
                       COALESCE(g.bonus_pool_accrued, 0) AS pool_paid
                FROM grids g
                JOIN users u ON u.id = g.owner_id
                WHERE g.is_complete = TRUE
                  AND g.bonus_paid = TRUE
                  AND u.is_active  = TRUE
                  AND u.id <> 0
                  AND NOT EXISTS (
                      SELECT 1 FROM commissions c
                      WHERE c.commission_type = 'grid_completion_bonus_topup'
                        AND c.notes LIKE '%grid ' || g.id || ' advance ' || g.advance_number || '%'
                  )
            """)).fetchall()

            completed_topped = 0
            total_topup = 0.0
            for row in underpaid:
                target = TARGETS.get(int(row.package_tier))
                if target is None:
                    continue
                shortfall = round(target - float(row.pool_paid), 2)
                if shortfall <= 0.01:
                    continue  # within rounding tolerance — skip

                # Credit campaign_balance, log the topup commission,
                # bump pool record to the topped-up value.
                conn.execute(text("""
                    UPDATE users
                       SET campaign_balance = COALESCE(campaign_balance, 0) + :amt,
                           total_earned     = COALESCE(total_earned, 0)     + :amt,
                           bonus_earnings   = COALESCE(bonus_earnings, 0)   + :amt
                     WHERE id = :uid
                """), {"amt": shortfall, "uid": int(row.owner_id)})

                conn.execute(text("""
                    UPDATE grids
                       SET bonus_pool_accrued = :target
                     WHERE id = :gid
                """), {"target": target, "gid": int(row.grid_id)})

                conn.execute(text("""
                    INSERT INTO commissions
                        (from_user_id, to_user_id, amount_usdt, commission_type,
                         notes, package_tier, status, created_at)
                    VALUES
                        (:uid, :uid, :amt, 'grid_completion_bonus_topup',
                         :notes, :tier, 'paid', NOW())
                """), {
                    "uid":   int(row.owner_id),
                    "amt":   shortfall,
                    "notes": (f"Retroactive top-up: grid {row.grid_id} advance "
                              f"{row.advance_number} paid ${row.pool_paid} but "
                              f"policy target is ${target} (10%/36 seats). "
                              f"Difference credited to bring all members to current "
                              f"completion bonus rate."),
                    "tier":  int(row.package_tier),
                })

                completed_topped += 1
                total_topup += shortfall

            conn.commit()
            print(f"📊 Grid bonus pool migration — completed pass: topped up {completed_topped} grids "
                  f"totalling ${round(total_topup, 2)} in retroactive payments")

            # ── Pass 3: backfill grid_bonus_paid badge ────────────────
            # Anyone who already completed a grid and got the bonus paid
            # but never received the new 'grid_bonus_paid' badge gets it
            # awarded now. Badge was added 26 May 2026 alongside this
            # migration — without this pass, the first member to complete
            # a grid (SuperAdPro) wouldn't get the badge.
            badge_backfill = conn.execute(text("""
                SELECT DISTINCT g.owner_id
                FROM grids g
                JOIN users u ON u.id = g.owner_id
                WHERE g.is_complete = TRUE
                  AND g.bonus_paid  = TRUE
                  AND u.is_active   = TRUE
                  AND NOT EXISTS (
                      SELECT 1 FROM achievements a
                      WHERE a.user_id  = g.owner_id
                        AND a.badge_id = 'grid_bonus_paid'
                  )
            """)).fetchall()

            badge_awarded = 0
            for row in badge_backfill:
                # Compute the bonus amount + tier this member would have
                # earned from their most recent (or highest) completed grid.
                # Stored in metadata_json so the achievements page displays
                # "$X · Tier Y" rather than a generic title.
                meta_row = conn.execute(text("""
                    SELECT g.package_tier, COALESCE(g.bonus_pool_accrued, 0) AS amt
                    FROM grids g
                    WHERE g.owner_id = :uid
                      AND g.is_complete = TRUE
                      AND g.bonus_paid = TRUE
                    ORDER BY g.bonus_pool_accrued DESC NULLS LAST
                    LIMIT 1
                """), {"uid": int(row.owner_id)}).fetchone()
                if meta_row:
                    import json as _json2
                    meta_payload = _json2.dumps({
                        "amount": round(float(meta_row.amt), 2),
                        "tier": int(meta_row.package_tier),
                    })
                else:
                    meta_payload = None

                conn.execute(text("""
                    INSERT INTO achievements (user_id, badge_id, title, icon, earned_at, metadata_json)
                    VALUES (:uid, 'grid_bonus_paid',
                            'Grid Bonus Earned', :icon, NOW(), :meta)
                """), {"uid": int(row.owner_id), "icon": "♛", "meta": meta_payload})
                # Companion notification
                conn.execute(text("""
                    INSERT INTO notifications
                        (user_id, type, icon, title, message, link, is_read, created_at)
                    VALUES
                        (:uid, 'achievement', :icon,
                         'Badge earned: Grid Bonus Earned!',
                         :msg,
                         '/achievements', FALSE, NOW())
                """), {
                    "uid": int(row.owner_id),
                    "icon": "♛",
                    "msg": (f'You earned a ${round(float(meta_row.amt), 2)} grid completion bonus '
                            f'from Tier {int(meta_row.package_tier)}!') if meta_row
                           else 'Filled a 36-seat campaign grid — completion bonus paid into your wallet',
                })
                badge_awarded += 1
            conn.commit()
            print(f"📊 Grid bonus pool migration — badge backfill: awarded {badge_awarded} grid_bonus_paid badges")

            # ── Pass 4: refresh icon and metadata on EXISTING badges ──
            # Badges awarded in the first 24h (yesterday's deploy)
            # used the old 💎 icon and had no metadata_json. Bring them
            # into line with the new purple ♛ + metadata payload so the
            # badge displays the bonus amount + tier. Idempotent —
            # only updates rows that still match the old shape.
            stale = conn.execute(text("""
                SELECT a.id, a.user_id
                FROM achievements a
                WHERE a.badge_id = 'grid_bonus_paid'
                  AND (a.icon <> :new_icon OR a.metadata_json IS NULL)
            """), {"new_icon": "♛"}).fetchall()

            refreshed = 0
            for arow in stale:
                meta_row = conn.execute(text("""
                    SELECT g.package_tier, COALESCE(g.bonus_pool_accrued, 0) AS amt
                    FROM grids g
                    WHERE g.owner_id = :uid
                      AND g.is_complete = TRUE
                      AND g.bonus_paid = TRUE
                    ORDER BY g.bonus_pool_accrued DESC NULLS LAST
                    LIMIT 1
                """), {"uid": int(arow.user_id)}).fetchone()
                if not meta_row:
                    continue
                import json as _json3
                meta_payload = _json3.dumps({
                    "amount": round(float(meta_row.amt), 2),
                    "tier":   int(meta_row.package_tier),
                })
                conn.execute(text("""
                    UPDATE achievements
                       SET icon = :icon, metadata_json = :meta
                     WHERE id = :id
                """), {"icon": "♛", "meta": meta_payload, "id": int(arow.id)})
                refreshed += 1
            conn.commit()
            print(f"📊 Grid bonus pool migration — refreshed icon/metadata on {refreshed} existing badges")

            # ── Pass 5: refresh icon on the COMPANION notification rows ──
            # Pass 4 updated achievements.icon to ♛ but the matching
            # notification row (created at award time) still has the old
            # 💎 icon. The dashboard toast reads from the notification,
            # not the achievement, so without this pass the toast would
            # display a diamond instead of the new crown. Idempotent.
            notif_refresh = conn.execute(text("""
                UPDATE notifications
                   SET icon = :new_icon
                 WHERE type = 'achievement'
                   AND icon <> :new_icon
                   AND title LIKE '%Grid Bonus Earned%'
            """), {"new_icon": "♛"})
            conn.commit()
            print(f"📊 Grid bonus pool migration — refreshed icon on {notif_refresh.rowcount} notification rows")

    except Exception as e:
        print(f"⚠️ grid bonus pool migration skipped: {e}")


try:
    if SKIP_MIGRATIONS: raise RuntimeError('SKIP_MIGRATIONS=true')
    migrate_grid_bonus_pools_one_shot()
except Exception as e:
    print(f"⚠️ migrate_grid_bonus_pools_one_shot skipped: {e}")


# ─────────────────────────────────────────────
# SuperScene Models
# ─────────────────────────────────────────────

class SuperSceneCredit(Base):
    __tablename__ = "superscene_credits"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    balance    = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class SuperSceneVideo(Base):
    __tablename__ = "superscene_videos"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id       = Column(String, nullable=False, index=True)
    model_key     = Column(String(20), nullable=False)
    model_name    = Column(String(50))
    prompt        = Column(Text, nullable=False)
    duration      = Column(Integer, nullable=False)
    ratio         = Column(String(10), nullable=False)
    status        = Column(String(20), default="pending")   # pending|processing|completed|failed
    video_url     = Column(Text)
    credits_used  = Column(Integer, nullable=False, default=0)
    created_at    = Column(DateTime, default=datetime.utcnow)
    completed_at  = Column(DateTime)

    user = relationship("User", foreign_keys=[user_id])


class SuperSceneOrder(Base):
    __tablename__ = "superscene_orders"
    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    pack_slug        = Column(String(30), nullable=False)
    credits          = Column(Integer, nullable=False)
    amount_usd       = Column(Numeric(10, 2), nullable=False)
    payment_method   = Column(String(20), nullable=False)
    status           = Column(String(20), default="pending")
    stripe_session_id= Column(String(200))
    crypto_order_id  = Column(Integer)
    created_at       = Column(DateTime, default=datetime.utcnow)
    completed_at     = Column(DateTime)

    user = relationship("User", foreign_keys=[user_id])


class SuperScenePipeline(Base):
    """Long-form video pipeline — script to scenes to voiceover to video to assembly."""
    __tablename__ = "superscene_pipelines"
    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    title            = Column(String(200))
    script           = Column(Text, nullable=False)
    style            = Column(String(50), default="cinematic")
    model_key        = Column(String(30), default="kling3")
    voice            = Column(String(50), default="en-US-GuyNeural")
    resolution       = Column(String(10), default="1080p")
    status           = Column(String(20), default="draft")
    total_scenes     = Column(Integer, default=0)
    completed_scenes = Column(Integer, default=0)
    credits_used     = Column(Integer, default=0)
    final_video_url  = Column(Text)
    error_message    = Column(Text)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user   = relationship("User", foreign_keys=[user_id])
    scenes = relationship("SuperScenePipelineScene", back_populates="pipeline", cascade="all, delete-orphan", order_by="SuperScenePipelineScene.scene_number")


class SuperScenePipelineScene(Base):
    """Individual scene within a long-form video pipeline."""
    __tablename__ = "superscene_pipeline_scenes"
    id               = Column(Integer, primary_key=True, index=True)
    pipeline_id      = Column(Integer, ForeignKey("superscene_pipelines.id", ondelete="CASCADE"), nullable=False)
    scene_number     = Column(Integer, nullable=False)
    narration_text   = Column(Text)
    visual_prompt    = Column(Text)
    transition_type  = Column(String(20), default="cut")
    duration_seconds = Column(Numeric(6, 2))
    voiceover_url    = Column(Text)
    video_url        = Column(Text)
    video_task_id    = Column(String(100))
    status           = Column(String(20), default="pending")
    error_message    = Column(Text)
    created_at       = Column(DateTime, default=datetime.utcnow)

    pipeline = relationship("SuperScenePipeline", back_populates="scenes")


# ═══════════════════════════════════════════════════════════
# SuperDeck — AI Presentation Studio
# ═══════════════════════════════════════════════════════════
class Presentation(Base):
    """A member's presentation/slide deck."""
    __tablename__ = "presentations"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title        = Column(String(300), default="Untitled Presentation")
    slides_json  = Column(Text, default="[]")
    theme        = Column(String(50), default="midnight")
    slide_count  = Column(Integer, default=0)
    thumbnail_url = Column(Text)
    status       = Column(String(20), default="draft")
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", backref="presentations")


# ═══════════════════════════════════════════════════════════
#  CREDIT MATRIX — 3×3 Forced Matrix Compensation Plan
# ═══════════════════════════════════════════════════════════

# Credit pack definitions (not a DB model — constants)
CREDIT_PACKS = {
    "starter":   {"price": 20,   "credits": 100,   "label": "Starter",   "completion_bonus": 0},
    "builder":   {"price": 50,   "credits": 250,   "label": "Builder",   "completion_bonus": 0},
    "pro":       {"price": 100,  "credits": 500,   "label": "Pro",       "completion_bonus": 0},
    "advanced":  {"price": 200,  "credits": 1000,  "label": "Advanced",  "completion_bonus": 0},
    "elite":     {"price": 400,  "credits": 2000,  "label": "Elite",     "completion_bonus": 0},
    "premium":   {"price": 600,  "credits": 3000,  "label": "Premium",   "completion_bonus": 0},
    "executive": {"price": 800,  "credits": 4000,  "label": "Executive", "completion_bonus": 0},
    "ultimate":  {"price": 1000, "credits": 5000,  "label": "Ultimate",  "completion_bonus": 0},
}

MATRIX_WIDTH = 3
MATRIX_DEPTH = 3
# 50% AI costs / 15% company / 35% commissions
# Nexus commission is RELATIONSHIP-based, not level-based. The truth:
#   - matrix_direct:    15% (buyer was personally referred by matrix owner)
#   - matrix_spillover: 10% (buyer was placed via someone else's overflow)
#   - matrix_completion: 10% of (39 × pack_price) when matrix fills
# See docs/commission-spec.md section 3 for ground truth.
# Authoritative constants live in app/credit_matrix.py as DIRECT_RATE,
# SPILLOVER_RATE, COMPLETION_BONUS_RATE — this constant is kept for
# backward-compatible imports only. Earlier comment described it as
# {L1: 15%, L2: 10%, L3: 10%} which was wrong and caused a frontend
# regression where the visualiser displayed fabricated rates.
MATRIX_COMMISSION_RATES = {
    "direct": Decimal("0.15"),
    "spillover": Decimal("0.10"),
    "completion": Decimal("0.10"),
}


class CreditPackPurchase(Base):
    """Record of a credit pack purchase that enters the matrix."""
    __tablename__ = "credit_pack_purchases"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pack_key      = Column(String(20), nullable=False)   # starter/builder/pro/elite/ultimate
    pack_price    = Column(Numeric(18, 6), nullable=False)
    credits_awarded = Column(Integer, nullable=False)
    payment_method = Column(String(20), default="crypto")  # crypto / stripe / wallet
    payment_ref   = Column(String(200))                    # NOW Payments order ID or Stripe session
    status        = Column(String(20), default="completed")  # pending / completed / refunded
    matrix_entry_id = Column(Integer, ForeignKey("credit_matrix_positions.id"), nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    buyer = relationship("User", backref="credit_pack_purchases")


class CreditMatrix(Base):
    """A 3×3 matrix instance belonging to a user, scoped to a specific credit pack."""
    __tablename__ = "credit_matrices"
    id            = Column(Integer, primary_key=True, index=True)
    owner_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pack_key      = Column(String(20), nullable=True, index=True)  # which pack this matrix is for
    advance_number = Column(Integer, default=1)                    # increments each time matrix completes
    status        = Column(String(20), default="active", index=True)           # active / completed
    positions_filled = Column(Integer, default=0)                  # 0-39 (1 owner + 3+9+27 downline)
    total_earned  = Column(Numeric(18, 6), default=0)              # total commissions earned from this matrix
    completion_bonus_paid = Column(Numeric(18, 6), default=0)
    completed_at  = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", backref="credit_matrices")


class CreditMatrixPosition(Base):
    """A single position in someone's 3×3 matrix tree."""
    __tablename__ = "credit_matrix_positions"
    id            = Column(Integer, primary_key=True, index=True)
    matrix_id     = Column(Integer, ForeignKey("credit_matrices.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_position_id = Column(Integer, ForeignKey("credit_matrix_positions.id"), nullable=True)
    level         = Column(Integer, nullable=False)          # 0=owner, 1-3=downline levels
    position_index = Column(Integer, default=0)              # 0-2 within parent (left/mid/right)
    pack_key      = Column(String(20))                       # which pack triggered this entry
    pack_price    = Column(Numeric(18, 6), default=0)
    created_at    = Column(DateTime, default=datetime.utcnow)

    matrix = relationship("CreditMatrix", backref="positions")
    user = relationship("User", backref="credit_matrix_positions")
    parent = relationship("CreditMatrixPosition", remote_side=[id], backref="children")


class CreditMatrixCommission(Base):
    """Commission earned from a matrix position being filled."""
    __tablename__ = "credit_matrix_commissions"
    id            = Column(Integer, primary_key=True, index=True)
    matrix_id     = Column(Integer, ForeignKey("credit_matrices.id", ondelete="CASCADE"), nullable=False, index=True)
    earner_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    from_user_id  = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    from_position_id = Column(Integer, ForeignKey("credit_matrix_positions.id"), nullable=False)
    level         = Column(Integer, nullable=False)          # 1, 2, or 3
    rate          = Column(Numeric(8, 4), nullable=False)    # 0.10, 0.05, or 0.03
    pack_price    = Column(Numeric(18, 6), nullable=False)   # original pack price
    amount        = Column(Numeric(18, 6), nullable=False)   # actual commission amount
    commission_type = Column(String(30), default="matrix_level", index=True)  # matrix_level / matrix_completion
    status        = Column(String(20), default="paid")       # paid / pending / held
    created_at    = Column(DateTime, default=datetime.utcnow)

    earner = relationship("User", foreign_keys=[earner_id], backref="credit_matrix_commissions_earned")
    from_user = relationship("User", foreign_keys=[from_user_id], backref="credit_matrix_commissions_generated")


# ═════════════════════════════════════════════════════════════
# Admin repair audit log.
# Every mutation made by the platform health repair tools is logged
# here BEFORE commit, so the database always has a trail of what was
# changed, when, by whom, and why. Built 13 May 2026 alongside the
# health scanner framework. Read-only after creation; never updated.
# ═════════════════════════════════════════════════════════════
class AdminRepairLog(Base):
    """Audit trail for every admin repair-tool mutation.

    One row per repair RUN (not per row touched). The `changes_json`
    field holds the structured before/after for each row the run
    modified, so we can fully reconstruct what happened.
    """
    __tablename__ = "admin_repair_log"
    id            = Column(Integer, primary_key=True, index=True)
    repair_tool   = Column(String(80), nullable=False, index=True)   # e.g. 'matrix-indices'
    target_kind   = Column(String(40), nullable=False)               # e.g. 'matrix' / 'user'
    target_id     = Column(Integer, nullable=False, index=True)      # subject id
    admin_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    admin_username = Column(String(80), nullable=False)              # snapshot at run time
    dry_run       = Column(Boolean, default=False, nullable=False)   # was this an actual write?
    success       = Column(Boolean, default=False, nullable=False)
    changes_json  = Column(Text, nullable=False)                     # JSON: list of {table, id, before, after}
    summary       = Column(Text)                                     # human-readable summary
    error_message = Column(Text)                                     # if success=False
    created_at    = Column(DateTime, default=datetime.utcnow, index=True)


# ═════════════════════════════════════════════════════════════
# /explore page — Phase 2 & 3 opt-in tables.
# Empty on Phase 1 launch. Phase 2 wires MemberStory. Phase 3 wires MemberShowcase.
# ═════════════════════════════════════════════════════════════
class MemberStory(Base):
    """First-dollar stories shown on /explore tab 2.
    User-submitted, admin-moderated. Only rows with approved=True are public."""
    __tablename__ = "member_stories"
    id                 = Column(Integer, primary_key=True, index=True)
    user_id            = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    display_initials   = Column(String(4), nullable=True)     # "SM", "DR" — shown on card
    display_country    = Column(String(100), nullable=True)   # free text, not ISO — "India" / "UK" / "USA"
    niche              = Column(String(100), nullable=True)   # "Yoga teacher", "Crypto trader", etc.
    days_to_milestone  = Column(Integer, nullable=True)       # e.g. 3
    milestone_label    = Column(String(120), nullable=True)   # "first $17.50" / "first grid completion"
    milestone_color    = Column(String(20), default="green")  # sky / indigo / amber / green / pink
    story_text         = Column(String(400), nullable=True)   # narrative body, max ~200 chars recommended
    now_monthly_amount = Column(Numeric(12, 2), nullable=True)  # current monthly earnings (optional)
    approved           = Column(Boolean, default=False, index=True)
    sort_order         = Column(Integer, default=0)           # admin-set display order
    created_at         = Column(DateTime, default=datetime.utcnow)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MemberShowcase(Base):
    """Featured artifacts shown on /explore tab 3.
    User-opted, admin-moderated. Only rows with approved=True are public.
    artifact_type + artifact_id reference the underlying work."""
    __tablename__ = "member_showcase"
    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    artifact_type  = Column(String(32), nullable=False)       # bio-link | landing-page | campaign | course
    artifact_id    = Column(Integer, nullable=True)           # FK to the respective table's id
    display_title  = Column(String(160), nullable=True)       # "The clean eating reset · 7 days"
    display_niche  = Column(String(80), nullable=True)        # "Nutrition", "Trading", "Wellness"
    metric_label   = Column(String(60), nullable=True)        # "Clicks this month" / "Active subscribers" / "Conversion rate" / "Sales total"
    metric_value   = Column(String(40), nullable=True)        # "8,420" / "1,247" / "12.4%" / "$3,840" — free text
    accent_color   = Column(String(20), default="sky")        # sky / indigo / amber / green / pink
    approved       = Column(Boolean, default=False, index=True)
    sort_order     = Column(Integer, default=0)
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DailyBriefing(Base):
    """Stores the morning briefing generated by /cron/daily-briefing.
    
    One row per day. Stores the raw metrics snapshot AND the AI-generated
    summary so future-Claude (and future-Steve) can scroll back through
    daily history when investigating "when did X start happening?".
    
    Added 10 May 2026 alongside the launch — see CLAUDE.md "Daily
    Briefing System" section.
    """
    __tablename__ = "daily_briefings"
    id              = Column(Integer, primary_key=True, index=True)
    briefing_date   = Column(String(10), unique=True, index=True, nullable=False)  # "2026-05-10" (UTC date)
    metrics_json    = Column(Text, nullable=False)        # raw stats dict as JSON
    summary_text    = Column(Text, nullable=False)        # AI-written briefing
    launch_log_md   = Column(Text, nullable=True)         # snapshot of LAUNCH_LOG.md at time of briefing
    email_sent_to   = Column(String(120), nullable=True)  # which email got the briefing
    email_sent_at   = Column(DateTime, nullable=True)
    generation_ms   = Column(Integer, nullable=True)      # how long the AI call took
    created_at      = Column(DateTime, default=datetime.utcnow, index=True)


class PlatformStatus(Base):
    """Single-row table holding the platform's current operational mode.

    Used by the maintenance-mode 'panic button' so Steve can halt money
    flows site-wide with one click. Two tiers:
      - 'soft_maintenance'  → withdrawals halted, everything else live
      - 'hard_maintenance'  → all money flows halted (withdrawals, tier
                              purchases, course purchases, credit packs,
                              P2P transfers, new signups)
      - 'live'              → normal operation (default)

    Read by helper functions in main.py (is_maintenance_mode,
    is_soft_maintenance) that check before every money-affecting endpoint
    and the signup endpoint. Toggled via /admin/api/maintenance-set.

    Convention: there is always exactly one row with id=1. The
    seed-on-startup logic in run_migrations() inserts it if missing.
    Storing as a row (not env var) so toggle history is preserved in
    set_by_user_id / set_at / reason for audit.
    """
    __tablename__ = "platform_status"
    id              = Column(Integer, primary_key=True)            # always 1
    mode            = Column(String(30), default="live", nullable=False, index=True)
    reason          = Column(String(500), nullable=True)            # why was it flipped
    set_by_user_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    set_at          = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ──────────────────────────────────────────────────────────────────────
# Admin Email Broadcast (added 11 May 2026)
#
# Lets the platform owner send broadcast emails to all members directly
# from the admin panel, without leaving the platform or syncing to an
# external email tool. List is always live: emails are pulled from the
# users table at send time.
# ──────────────────────────────────────────────────────────────────────

class AdminBroadcast(Base):
    """Log of every admin email broadcast sent.
    
    Records subject, body, recipient filter, count, and send progress so
    the admin can see what's been sent and to whom. Progress fields let
    the send happen in background batches without losing track.
    """
    __tablename__ = "admin_broadcasts"
    id                = Column(Integer, primary_key=True, index=True)
    subject           = Column(String(300), nullable=False)
    body_html         = Column(Text, nullable=False)
    body_text         = Column(Text, nullable=True)
    
    # Audience filter — JSON serialised dict like {"status": "all"} or 
    # {"status": "active", "tier_min": 2, "country": "GB"}
    audience_filter   = Column(Text, nullable=False, default='{"status":"all"}')
    
    # Send progress
    recipient_count   = Column(Integer, default=0)        # total resolved at send time
    sent_count        = Column(Integer, default=0)        # actually delivered
    failed_count      = Column(Integer, default=0)
    status            = Column(String(20), default="pending", index=True)  # pending/sending/completed/failed
    error_message     = Column(Text, nullable=True)
    
    # Metadata
    sent_by_user_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at        = Column(DateTime, default=datetime.utcnow, index=True)
    started_at        = Column(DateTime, nullable=True)
    completed_at      = Column(DateTime, nullable=True)

    sent_by = relationship("User", foreign_keys=[sent_by_user_id])


# ════════════════════════════════════════════════════════════════════
# BRAND POSTER GENERATOR (May 2026)
#
# AI-powered finished-poster generator inside Creative Studio.
# Members pick from a curated library of 6 templates, fill in 3-5 text
# inputs, optionally upload a reference photo of themselves, and receive
# a complete branded marketing poster from xAI Grok Imagine.
#
# The secret sauce is the curated prompt library — members never see
# or edit prompts. Templates are seeded server-side from
# app/poster_templates.py (the master prompt data file).
# ════════════════════════════════════════════════════════════════════

class PosterTemplate(Base):
    """Master template catalogue — seeded from poster_templates.py.

    Each template defines the prompt-engineering recipe for one poster
    style. The master_prompt contains {placeholders} that get filled
    in from member inputs at generation time.
    """
    __tablename__ = "poster_templates"

    id                = Column(Integer, primary_key=True, index=True)
    slug              = Column(String(60), unique=True, nullable=False, index=True)
    name              = Column(String(120), nullable=False)
    description       = Column(Text, nullable=False)         # Member-facing 1-2 sentence pitch
    category          = Column(String(40), default="general", index=True)  # e.g. lifestyle, professional, generosity
    sort_order        = Column(Integer, default=100, index=True)
    is_active         = Column(Boolean, default=True, index=True)

    # The actual prompt-engineering content (members never see this)
    master_prompt     = Column(Text, nullable=False)         # With {placeholder} tokens
    input_fields      = Column(Text, nullable=False)         # JSON: [{key, label, default, max_len, help}]
    aspect_ratio      = Column(String(10), default="3:4")    # Maps to Grok Imagine aspect
    supports_photo    = Column(Boolean, default=True)        # Reference photo enabled?

    # Asset URLs (R2-hosted)
    preview_image_url = Column(Text, nullable=True)          # Pre-rendered gallery example
    thumbnail_url     = Column(Text, nullable=True)          # Smaller thumbnail for cards

    # Sharing
    share_slug        = Column(String(40), unique=True, nullable=True, index=True)  # /go/{slug}

    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PosterGeneration(Base):
    """One record per Generate click. Captures inputs, candidates returned,
    final chosen image, and credits consumed. Members can revisit past
    generations from the History page to re-download without re-paying.
    """
    __tablename__ = "poster_generations"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    template_id       = Column(Integer, ForeignKey("poster_templates.id"), nullable=False, index=True)

    # Input snapshot — everything the member typed/uploaded
    input_values      = Column(Text, nullable=False)         # JSON dict matching template's input_fields
    reference_photo_url = Column(Text, nullable=True)        # R2 URL if member uploaded a photo

    # The full prompt that was sent to Grok Imagine (for debugging / iteration)
    rendered_prompt   = Column(Text, nullable=True)

    # Generation outcome
    candidate_urls    = Column(Text, nullable=True)          # JSON array of 4 Grok Imagine URLs
    chosen_index      = Column(Integer, nullable=True)       # Which candidate (0-3) the member picked
    chosen_url        = Column(Text, nullable=True)          # The R2-archived final URL
    status            = Column(String(20), default="pending", index=True)
                                                              # pending / generating / ready / chosen / failed / refunded
    error_message     = Column(Text, nullable=True)

    # Billing
    credits_charged   = Column(Integer, default=0)
    grok_request_id   = Column(String(80), nullable=True)    # For debugging Grok-side issues

    created_at        = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at      = Column(DateTime, nullable=True)

    user              = relationship("User", foreign_keys=[user_id])
    template          = relationship("PosterTemplate", foreign_keys=[template_id])


class PosterTemplateShare(Base):
    """Tracks visits to /go/{slug} share links. Powers the viral loop:
    members share their generated poster, visitors land on a public
    page promoting the same template, and the original member is
    credited as sponsor if the visitor signs up.
    """
    __tablename__ = "poster_template_shares"

    id                = Column(Integer, primary_key=True, index=True)
    share_slug        = Column(String(40), nullable=False, index=True)
    template_id       = Column(Integer, ForeignKey("poster_templates.id"), nullable=False, index=True)
    sharer_user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Visitor tracking (no PII)
    visitor_ip_hash   = Column(String(64), nullable=True)
    visitor_country   = Column(String(2), nullable=True)
    user_agent        = Column(String(300), nullable=True)
    referrer          = Column(String(500), nullable=True)

    # Outcome
    converted_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    converted_at      = Column(DateTime, nullable=True)

    visited_at        = Column(DateTime, default=datetime.utcnow, index=True)

    template          = relationship("PosterTemplate", foreign_keys=[template_id])
    sharer            = relationship("User", foreign_keys=[sharer_user_id])
    converted_user    = relationship("User", foreign_keys=[converted_user_id])



class ExplainerVideo(Base):
    """Member-facing video explainer library.

    Backs the /videos page (members-only library) and admin /admin/videos
    upload/manage UI. Videos are hosted on Cloudflare R2 — playback URL
    is the public R2 URL. No YouTube integration in v1.

    Designed around 4 fixed categories matching the Learn door taxonomy:
    'getting-started' | 'income-streams' | 'tools' | 'advanced'.
    Adding new categories is a 1-line frontend change; the column itself
    is just a string so no migration is needed.

    View tracking: a row is added to ExplainerVideoView every time a
    member plays past the 5-second threshold. The aggregate view_count
    on the video itself is a denormalised counter updated by the same
    tracking endpoint — used for sorting and admin analytics.

    Built 14 May 2026 after Steve identified video explainers as the
    real conversion blocker (not pricing, not features).
    """
    __tablename__ = "explainer_videos"

    id            = Column(Integer, primary_key=True, index=True)
    slug          = Column(String(80), unique=True, nullable=False, index=True)
                                                  # "what-is-superadpro"
    title         = Column(String(200), nullable=False)
    description   = Column(Text, nullable=True)   # 1-3 sentences, shown on the card
    category      = Column(String(30), nullable=False, index=True, default="getting-started")
                                                  # getting-started / income-streams / tools / advanced

    # Hosting — R2 only in v1
    r2_url        = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)   # auto-generated frame or custom upload
    duration_sec  = Column(Integer, nullable=True)       # display "1:30" / "2:45"

    # Display & lifecycle
    sort_order    = Column(Integer, default=0, index=True)   # within category, ascending
    is_published  = Column(Boolean, default=False, index=True)
                                                  # False = draft, only admin sees
    view_count    = Column(Integer, default=0)    # denormalised; updated by track-view endpoint

    # Authorship & timing
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at    = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator       = relationship("User", foreign_keys=[created_by_user_id])


class ExplainerVideoView(Base):
    """Per-play tracking record. One row per qualifying view (>5s playback).

    Used to compute the view_count on ExplainerVideo, and to power
    admin analytics: which videos hold attention, which members are
    watching, watch completion rates, etc.

    Lightweight by design — no per-second heartbeats, just one row
    when the 5-second threshold is crossed. The played_to_end flag
    is set when the <video> 'ended' event fires.
    """
    __tablename__ = "explainer_video_views"

    id             = Column(Integer, primary_key=True, index=True)
    video_id       = Column(Integer, ForeignKey("explainer_videos.id"), nullable=False, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    watched_seconds = Column(Integer, default=0)   # how far they got (best-effort)
    played_to_end  = Column(Boolean, default=False)
    viewed_at      = Column(DateTime, default=datetime.utcnow, index=True)

    video          = relationship("ExplainerVideo", foreign_keys=[video_id])
    user           = relationship("User", foreign_keys=[user_id])


# ────────────────────────────────────────────────────────────────────
# Custom Domain mapping for SuperPages (21 May 2026)
#
# Per-user CNAME model: member points e.g. pages.theirbrand.com to our
# Railway URL via a CNAME record, then ALL their published pages are
# accessible at pages.theirbrand.com/<page-slug>. One DNS setup, then
# unlimited pages.
#
# v1 ships free — no billing column yet. When we monetize, add
# subscription/billing fields here (the model already has user_id which
# is the natural billing target).
#
# HTTPS is the member's responsibility (Cloudflare/their DNS provider) —
# Level-2 architecture: we don't run Let's Encrypt automation server-side.
# Members who want HTTPS proxy through Cloudflare Free, which terminates
# TLS at the edge and forwards plain HTTP back to our Railway service.
# This is fine because Railway's external endpoint is HTTPS and the
# member's Cloudflare-to-Railway leg is over the public internet under
# Cloudflare's own TLS to our origin.
#
# Verification: cron does a DNS CNAME lookup hourly on pending rows.
# Verified when the CNAME resolves to our configured Railway host.
# ────────────────────────────────────────────────────────────────────
class CustomDomain(Base):
    __tablename__ = "custom_domains"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # The hostname the member is bringing — e.g. "pages.theirbrand.com".
    # Lowercased and stripped of protocol/trailing slash at write time.
    # Unique across the platform: no two members can claim the same host.
    domain          = Column(String, nullable=False, unique=True, index=True)
    # pending — DNS not yet verified (CNAME doesn't resolve or doesn't
    #           point at us)
    # verified — CNAME points at our Railway host AND Railway has issued
    #            a Let's Encrypt cert for it; live routing is active and
    #            HTTPS works
    # failed   — verification cron has retried N times and given up;
    #            member can re-trigger by editing/saving
    verification_status = Column(String, default="pending", index=True)
    # Last error message from the verification cron, e.g.
    # "CNAME points to wrong host: foo.example.com (expected
    # superadpro.up.railway.app)". Shown to member in the labs UI so
    # they know what to fix without calling support.
    last_error      = Column(Text, nullable=True)
    last_checked_at = Column(DateTime, nullable=True)
    verified_at     = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow, index=True)

    # ── Railway API integration (Custom Domain v2, 25 May 2026) ──────
    # When a domain is registered with Railway via the GraphQL API,
    # Railway returns a UUID we keep here so we can later poll status
    # and delete-on-removal. Populated by the v2 create flow.
    # Nullable so legacy v1 rows (DNS-only verification) can coexist.
    railway_domain_id = Column(String, nullable=True, index=True)
    # Latest Railway certificateStatus value. Drives the member-facing
    # status display (Pending DNS / Validating ownership / Issuing cert /
    # Live with HTTPS / Error). Updated by the verification cron.
    tls_status      = Column(String, nullable=True)
    # JSON-encoded list of DNS records Railway told us to surface to
    # the member (CNAME routing record + TXT ownership record). Shape:
    # [{"recordType":"CNAME","hostlabel":"pages",
    #   "requiredValue":"abc.up.railway.app","status":"PROPAGATING"},...]
    # Stored verbatim so the UI can always show the latest values
    # without re-querying Railway on every page load.
    dns_records_json = Column(Text, nullable=True)

    user            = relationship("User", foreign_keys=[user_id])
