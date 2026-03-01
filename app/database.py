import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Float, Boolean, DateTime, Text, text, Numeric

# Precision type for all financial columns — 18 digits, 6 decimal places
# Prevents floating-point drift across millions of transactions
Money = Numeric(18, 6)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
# Railway Postgres URLs use postgres:// but SQLAlchemy requires postgresql://
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=20, max_overflow=40)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── Grid constants ────────────────────────────────────────────
GRID_WIDTH    = 8      # positions per level
GRID_LEVELS   = 8      # levels deep
GRID_TOTAL    = 63     # seats 1-63 (seat 0 = owner, not an entrant)

# ── Commission split (Stream 2 — Profit Engine Grid) ─────────
# Per entry: 40% direct sponsor + 55% uni-level (variable) + 5% platform
DIRECT_PCT    = 0.40   # 40% → to the person who personally referred the entrant
UNILEVEL_PCT  = 0.55   # 55% → split across 8 uni-level positions (variable per level)
PER_LEVEL_PCT = 0.0875 # legacy — now variable per level, see LEVEL_PCTS
PLATFORM_PCT  = 0.05   # 5%  → SuperAdPro platform fee

# Variable uni-level percentages per level (total = 55%)
LEVEL_PCTS = [0.15, 0.10, 0.08, 0.06, 0.05, 0.04, 0.04, 0.03]

# Legacy aliases
OWNER_PCT     = DIRECT_PCT    # 0.40
UPLINE_PCT    = UNILEVEL_PCT  # 0.55
LEVEL_PCT     = PER_LEVEL_PCT # 0.0875 (legacy compat)
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

class User(Base):
    __tablename__ = "users"
    id                  = Column(Integer, primary_key=True, index=True)
    username            = Column(String, unique=True, index=True)
    email               = Column(String, index=True)
    password            = Column(String)
    first_name          = Column(String, nullable=True)
    last_name           = Column(String, nullable=True)
    sponsor_id          = Column(Integer, ForeignKey("users.id"), nullable=True)
    pass_up_sponsor_id  = Column(Integer, ForeignKey("users.id"), nullable=True)  # permanent pass-up chain
    course_sale_count   = Column(Integer, default=0)              # total personally referred course sales (any tier)
    wallet_address      = Column(String, nullable=True)
    is_admin            = Column(Boolean, default=False)
    is_active           = Column(Boolean, default=False)
    balance             = Column(Money, default=0.0)      # available USDT balance
    total_earned        = Column(Money, default=0.0)      # lifetime earnings
    total_withdrawn     = Column(Money, default=0.0)      # lifetime withdrawals
    grid_earnings       = Column(Money, default=0.0)      # earnings from grid completions
    level_earnings      = Column(Money, default=0.0)      # earnings from level pool
    upline_earnings     = Column(Money, default=0.0)      # earnings as upline on others' grids
    personal_referrals  = Column(Integer, default=0)      # direct recruits
    total_team          = Column(Integer, default=0)      # entire network size
    country             = Column(String, nullable=True)
    interests           = Column(String, nullable=True)    # comma-separated interest tags
    created_at          = Column(DateTime, default=datetime.utcnow)
    membership_activated_by_referral = Column(Boolean, default=False)  # first month gifted
    low_balance_warned  = Column(Boolean, default=False)               # 3-day warning sent
    onboarding_completed = Column(Boolean, default=False)              # launch wizard done
    first_payment_to_company = Column(Boolean, default=False)          # True after 1st month payment goes to company
    course_earnings         = Column(Money, default=0.0)               # lifetime earnings from course commissions

class Grid(Base):
    """One grid instance per user per package tier."""
    __tablename__ = "grids"
    id              = Column(Integer, primary_key=True, index=True)
    owner_id        = Column(Integer, ForeignKey("users.id"), index=True)
    package_tier    = Column(Integer)                      # 1-8
    package_price   = Column(Money)                        # $10-$1000
    advance_number    = Column(Integer, default=1)           # which advance (1,2,3...)
    positions_filled = Column(Integer, default=0)          # 0-64
    is_complete     = Column(Boolean, default=False)       # True when 64 filled
    owner_paid      = Column(Boolean, default=False)       # owner payout sent
    revenue_total   = Column(Money, default=0.0)           # total revenue collected
    created_at      = Column(DateTime, default=datetime.utcnow)
    completed_at    = Column(DateTime, nullable=True)

class GridPosition(Base):
    """A single person's position inside someone's grid."""
    __tablename__ = "grid_positions"
    id              = Column(Integer, primary_key=True, index=True)
    grid_id         = Column(Integer, ForeignKey("grids.id"), index=True)
    member_id       = Column(Integer, ForeignKey("users.id"))   # person filling this seat
    grid_level      = Column(Integer)                            # 1-8
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
    commission_type = Column(String)   # 'direct_sponsor','uni_level','platform','membership'
    package_tier    = Column(Integer)
    status          = Column(String, default="pending")  # pending/paid/failed
    tx_hash         = Column(String, nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
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
    created_at      = Column(DateTime, default=datetime.utcnow)

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
    status          = Column(String, default="active") # active/paused/deleted
    views_target    = Column(Integer, default=0)       # from package tier
    views_delivered = Column(Integer, default=0)       # simulated/tracked
    # Targeting (Advanced tier and above)
    target_country  = Column(String, nullable=True)    # ISO country or null=worldwide
    target_interests = Column(String, nullable=True)   # comma-separated interest tags
    # Priority (Elite tier and above)
    priority_level  = Column(Integer, default=0)       # 0=normal, 1-4=priority tiers
    owner_tier      = Column(Integer, default=1)       # owner's package tier (1-8)
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
    is_rotator      = Column(Boolean, default=False)              # if True, this is a rotator entry
    rotator_id      = Column(Integer, ForeignKey("link_rotators.id"), nullable=True)
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
    """Individual click event for analytics — tracks source, time, and device."""
    __tablename__ = "link_clicks"
    id          = Column(Integer, primary_key=True, index=True)
    link_id     = Column(Integer, index=True)          # ShortLink or LinkRotator ID
    link_type   = Column(String, default="short")      # "short" or "rotator"
    source      = Column(String, nullable=True)        # Derived from referrer: facebook, google, direct, etc.
    referrer    = Column(Text, nullable=True)           # Raw HTTP referer header
    country     = Column(String, nullable=True)         # Future: GeoIP
    device      = Column(String, nullable=True)         # mobile / desktop / tablet
    clicked_at  = Column(DateTime, default=datetime.utcnow, index=True)


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


Base.metadata.create_all(bind=engine)

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

run_migrations()

# Force critical column additions with direct connection
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS interests VARCHAR"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_country VARCHAR"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS target_interests VARCHAR"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE video_campaigns ADD COLUMN IF NOT EXISTS owner_tier INTEGER DEFAULT 1"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE"))
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
        conn.commit()
        print("✅ Force migration: interests + targeting + onboarding columns confirmed")
except Exception as e:
    print(f"⚠️ Force migration note: {e}")
