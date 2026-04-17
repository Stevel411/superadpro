import os
from decimal import Decimal
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, BigInteger, String, ForeignKey, Float, Boolean, DateTime, Text, text, Numeric

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
engine = create_engine(DATABASE_URL, pool_pre_ping=False, pool_size=5, max_overflow=10, connect_args={"connect_timeout": 5})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── Grid constants ────────────────────────────────────────────
GRID_WIDTH    = 8      # positions per level
GRID_LEVELS   = 8      # levels deep
GRID_TOTAL    = 64     # 64 positions filled by referrals across 8 levels

# ── Commission split (Stream 2 — Profit Engine Grid) ─────────
# Per entry: 40% direct sponsor + 50% uni-level + 5% platform + 5% bonus pool
DIRECT_PCT    = 0.40   # 40% → to the person who personally referred the entrant
UNILEVEL_PCT  = 0.50   # 50% → split across 8 uni-level positions (6.25% each)
PER_LEVEL_PCT = 0.0625 # 6.25% → each of 8 levels in the upline chain
PLATFORM_PCT  = 0.05   # 5%  → SuperAdPro platform fee
BONUS_POOL_PCT = 0.05  # 5%  → Grid completion bonus pool


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
    5: "Elite",
    6: "Premium",
    7: "Executive",
    8: "Ultimate",
}

# ── Grid Completion Bonus (paid from 5% bonus pool) ─────────
# Total pool per grid = 64 seats × price × 5% = price × 3.2
# Bonus pays out ONLY if grid owner has an active (unexpired) campaign at that tier
GRID_COMPLETION_BONUS = {
    1: 64.0,      # 64 × $20 × 0.05 = $64
    2: 160.0,     # 64 × $50 × 0.05 = $160
    3: 320.0,     # 64 × $100 × 0.05 = $320
    4: 640.0,     # 64 × $200 × 0.05 = $640
    5: 1280.0,    # 64 × $400 × 0.05 = $1,280
    6: 1920.0,    # 64 × $600 × 0.05 = $1,920
    7: 2560.0,    # 64 × $800 × 0.05 = $2,560
    8: 3200.0,    # 64 × $1000 × 0.05 = $3,200
}

# ── Campaign View Targets per Tier ───────────────────────────
# Views delivered per campaign purchase/repurchase cycle
# Campaign stays active until views are delivered, then expires
# 14-day grace period after expiry before qualification drops
CAMPAIGN_VIEW_TARGETS = {
    1: 2000,
    2: 6000,
    3: 16000,
    4: 30000,
    5: 60000,
    6: 100000,
    7: 130000,
    8: 170000,
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
    sending_wallet      = Column(String, nullable=True)    # wallet they send crypto payments FROM
    is_admin            = Column(Boolean, default=False)
    is_active           = Column(Boolean, default=False)
    membership_tier     = Column(String, default="basic")    # basic ($20/mo) or pro ($30/mo)
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
    interests           = Column(String, nullable=True)    # comma-separated interest tags
    age_range           = Column(String, nullable=True)    # "18-24","25-34","35-44","45-54","55+"
    gender              = Column(String, nullable=True)    # "male","female","other"
    created_at          = Column(DateTime, default=datetime.utcnow)
    membership_activated_by_referral = Column(Boolean, default=False)  # first month gifted
    low_balance_warned  = Column(Boolean, default=False)               # 3-day warning sent
    onboarding_completed = Column(Boolean, default=False)              # launch wizard done
    first_payment_to_company = Column(Boolean, default=False)          # True after 1st month payment goes to company
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
    stripe_subscription_id  = Column(String, nullable=True)                 # active Stripe subscription ID
    membership_expires_at   = Column(DateTime, nullable=True)               # next renewal date
    membership_billing      = Column(String, default="monthly")             # "monthly" or "annual"

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
    tx_hash         = Column(String, nullable=True)
    status          = Column(String, default="pending")  # pending/processing/paid/failed
    requested_at    = Column(DateTime, default=datetime.utcnow)
    processed_at    = Column(DateTime, nullable=True)


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
    views_target    = Column(Integer, default=0)       # from CAMPAIGN_VIEW_TARGETS
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
    capture_sequence_id  = Column(Integer, nullable=True)      # FK to email_sequences
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

class AdListing(Base):
    __tablename__ = "ad_listings"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    title        = Column(String, nullable=False)
    slug         = Column(String, unique=True, index=True, nullable=True)
    description  = Column(String, nullable=False)
    category     = Column(String, nullable=False, default="general")
    link_url     = Column(String, nullable=False)
    image_url    = Column(String, nullable=True)
    is_active    = Column(Boolean, default=True)
    is_featured  = Column(Boolean, default=False)
    clicks       = Column(Integer, default=0)
    views        = Column(Integer, default=0)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", backref="ad_listings")


class BannerAd(Base):
    __tablename__ = "banner_ads"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    title        = Column(String, nullable=False)
    slug         = Column(String, unique=True, index=True, nullable=True)
    description  = Column(String, nullable=True)
    image_url    = Column(String, nullable=False)           # banner image URL (R2 or external)
    link_url     = Column(String, nullable=False)           # click-through destination
    size         = Column(String, default="728x90")         # standard banner size
    category     = Column(String, default="general")
    keywords     = Column(String, nullable=True)            # comma-separated SEO keywords
    location     = Column(String, nullable=True)            # city/region for local targeting
    is_active    = Column(Boolean, default=True)
    is_featured  = Column(Boolean, default=False)
    status       = Column(String, default="pending")        # pending/approved/rejected
    clicks       = Column(Integer, default=0)
    impressions  = Column(Integer, default=0)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", backref="banner_ads")


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
    "pro_member":       {"icon": "⭐", "title": "Pro Upgraded",       "desc": "Upgraded to Pro membership"},
    "first_funnel":     {"icon": "📄", "title": "Funnel Creator",     "desc": "Created your first funnel page"},
    "first_linkhub":    {"icon": "🔗", "title": "Link Master",        "desc": "Created your LinkHub page"},
    "grid_tier_3":      {"icon": "📊", "title": "Grid Climber",       "desc": "Reached Campaign Tier 3"},
    "grid_tier_5":      {"icon": "🎯", "title": "Grid Commander",     "desc": "Reached Campaign Tier 5"},
    "grid_tier_8":      {"icon": "🌟", "title": "Grid Legend",        "desc": "Completed all 8 campaign tiers"},
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
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


try:
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
        "CREATE TABLE IF NOT EXISTS p2p_transfers (id SERIAL PRIMARY KEY, from_user_id INTEGER REFERENCES users(id), to_user_id INTEGER REFERENCES users(id), amount_usdt FLOAT, note VARCHAR, status VARCHAR DEFAULT 'completed', created_at TIMESTAMP DEFAULT NOW())",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_activated_by_referral BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS low_balance_warned BOOLEAN DEFAULT FALSE",
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
        # Ensure admin/owner account is always Pro, active, and top of network
        "UPDATE users SET membership_tier = 'pro', is_active = true WHERE is_admin = true",
        "UPDATE users SET membership_tier = 'pro', is_active = true, is_admin = true WHERE username = 'SuperAdPro'",
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
            cycle_number INTEGER DEFAULT 1,
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
    ]
    results = []
    with engine.connect() as conn:
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
    run_migrations()
except Exception as e:
    print(f"⚠️ run_migrations skipped: {e}")

# Force critical column additions with direct connection
try:
    with engine.connect() as conn:
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

        # ── Pro Tier: membership_tier + email system (2026-03-11) ──
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_tier VARCHAR DEFAULT 'basic'"))

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
        """))
        # ── Stripe ──
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_billing VARCHAR DEFAULT 'monthly'"))

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

# ── Rename supercut -> superscene tables (one-time migration) ──
try:
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
# 50% AI costs / 15% company / 35% commissions (15% L1, 10% L2, 10% L3)
MATRIX_COMMISSION_RATES = {1: Decimal("0.15"), 2: Decimal("0.10"), 3: Decimal("0.10")}


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


class ChallengeProgress(Base):
    """Tracks a member's 30-day challenge progress."""
    __tablename__ = "challenge_progress"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    started_at      = Column(DateTime, default=datetime.utcnow)
    current_day     = Column(Integer, default=1)          # 1-30
    xp              = Column(Integer, default=0)
    streak          = Column(Integer, default=0)          # consecutive days with at least 1 task done
    last_active_day = Column(Integer, default=0)          # last day they completed a task
    completed_tasks = Column(Text, default="")            # comma-separated "day:task_id" e.g. "1:watch,1:tour,2:watch"
    badges          = Column(Text, default="")            # comma-separated badge IDs
    is_complete     = Column(Boolean, default=False)      # True when all 30 days done
    completed_at    = Column(DateTime, nullable=True)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="challenge_progress")
