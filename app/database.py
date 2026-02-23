import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Float, Boolean, DateTime, Text, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── Grid constants ────────────────────────────────────────────
GRID_WIDTH    = 8      # positions per level
GRID_LEVELS   = 8      # levels deep
GRID_TOTAL    = 63     # seats 1-63 (seat 0 = owner, not an entrant)

# ── Commission split (Stream 2 — Profit Engine Grid) ─────────
# Per entry: 25% direct sponsor + 70% uni-level + 5% platform
DIRECT_PCT    = 0.25   # 25% → to the person who personally referred the entrant
UNILEVEL_PCT  = 0.70   # 70% → split across 8 uni-level positions (8.75% each)
PER_LEVEL_PCT = 0.0875 # 8.75% → each of 8 levels in the upline chain
PLATFORM_PCT  = 0.05   # 5%  → SuperAdPro platform fee

# Legacy aliases (kept for any old references — map to correct values)
OWNER_PCT     = DIRECT_PCT    # 0.25
UPLINE_PCT    = UNILEVEL_PCT  # 0.70
LEVEL_PCT     = PER_LEVEL_PCT # 0.0875
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
    wallet_address      = Column(String, nullable=True)
    is_admin            = Column(Boolean, default=False)
    is_active           = Column(Boolean, default=False)
    balance             = Column(Float, default=0.0)      # available USDT balance
    total_earned        = Column(Float, default=0.0)      # lifetime earnings
    total_withdrawn     = Column(Float, default=0.0)      # lifetime withdrawals
    grid_earnings       = Column(Float, default=0.0)      # earnings from grid completions
    level_earnings      = Column(Float, default=0.0)      # earnings from level pool
    upline_earnings     = Column(Float, default=0.0)      # earnings as upline on others' grids
    personal_referrals  = Column(Integer, default=0)      # direct recruits
    total_team          = Column(Integer, default=0)      # entire network size
    country             = Column(String, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

class Grid(Base):
    """One grid instance per user per package tier."""
    __tablename__ = "grids"
    id              = Column(Integer, primary_key=True, index=True)
    owner_id        = Column(Integer, ForeignKey("users.id"), index=True)
    package_tier    = Column(Integer)                      # 1-8
    package_price   = Column(Float)                        # $10-$1000
    advance_number    = Column(Integer, default=1)           # which advance (1,2,3...)
    positions_filled = Column(Integer, default=0)          # 0-64
    is_complete     = Column(Boolean, default=False)       # True when 64 filled
    owner_paid      = Column(Boolean, default=False)       # owner payout sent
    revenue_total   = Column(Float, default=0.0)           # total revenue collected
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
    amount_usdt     = Column(Float)
    commission_type = Column(String)   # 'direct_sponsor','uni_level','platform','membership'
    package_tier    = Column(Integer)
    status          = Column(String, default="pending")  # pending/paid/failed
    tx_hash         = Column(String, nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    paid_at         = Column(DateTime, nullable=True)

class Payment(Base):
    """Incoming payments from members."""
    __tablename__ = "payments"
    id              = Column(Integer, primary_key=True, index=True)
    from_user_id    = Column(Integer, ForeignKey("users.id"))
    to_user_id      = Column(Integer, ForeignKey("users.id"), nullable=True)
    amount_usdt     = Column(Float)
    payment_type    = Column(String)
    tx_hash         = Column(String, unique=True)
    status          = Column(String, default="pending")
    created_at      = Column(DateTime, default=datetime.utcnow)

class Withdrawal(Base):
    """Outgoing withdrawals to member wallets."""
    __tablename__ = "withdrawals"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"))
    amount_usdt     = Column(Float)
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
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# ── Auto-migration: add missing columns if they don't exist ──────────────
def run_migrations():
    """Add any new columns that don't exist yet in the live DB."""
    migrations = [
        "CREATE TABLE IF NOT EXISTS video_campaigns (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), title VARCHAR NOT NULL, description TEXT, category VARCHAR, platform VARCHAR NOT NULL, video_url VARCHAR NOT NULL, embed_url VARCHAR NOT NULL, video_id VARCHAR, status VARCHAR DEFAULT 'active', views_target INTEGER DEFAULT 0, views_delivered INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())",
                "CREATE TABLE IF NOT EXISTS password_reset_tokens (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), token VARCHAR UNIQUE NOT NULL, expires_at TIMESTAMP NOT NULL, used BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW())",
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
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR",
        # Video watch system
        "CREATE TABLE IF NOT EXISTS video_watches (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), campaign_id INTEGER REFERENCES video_campaigns(id), watched_at TIMESTAMP DEFAULT NOW(), watch_date VARCHAR, duration_secs INTEGER DEFAULT 30)",
        "CREATE TABLE IF NOT EXISTS watch_quotas (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) UNIQUE, package_tier INTEGER DEFAULT 1, daily_required INTEGER DEFAULT 1, today_watched INTEGER DEFAULT 0, today_date VARCHAR, consecutive_missed INTEGER DEFAULT 0, last_quota_met VARCHAR, commissions_paused BOOLEAN DEFAULT FALSE, updated_at TIMESTAMP DEFAULT NOW())",
        "CREATE INDEX IF NOT EXISTS idx_video_watches_user_date ON video_watches(user_id, watch_date)",
        "CREATE INDEX IF NOT EXISTS idx_video_watches_campaign ON video_watches(campaign_id)",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
            except Exception:
                pass
        conn.commit()

run_migrations()
