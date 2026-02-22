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
GRID_TOTAL    = 64     # 8 × 8 = total positions per grid

# Commission split
OWNER_PCT     = 0.45   # grid owner earns 45% of grid revenue
UPLINE_PCT    = 0.25   # upline earns 25% per grid completion
LEVEL_PCT     = 0.25   # 25% split equally across 8 levels
COMPANY_PCT   = 0.05   # platform management fee

# Package prices
GRID_PACKAGES = {
    1: 10.0,
    2: 25.0,
    3: 50.0,
    4: 100.0,
    5: 250.0,
    6: 500.0,
    7: 750.0,
    8: 1000.0
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
    created_at          = Column(DateTime, default=datetime.utcnow)

class Grid(Base):
    """One grid instance per user per package tier."""
    __tablename__ = "grids"
    id              = Column(Integer, primary_key=True, index=True)
    owner_id        = Column(Integer, ForeignKey("users.id"), index=True)
    package_tier    = Column(Integer)                      # 1-8
    package_price   = Column(Float)                        # $10-$1000
    cycle_number    = Column(Integer, default=1)           # which cycle (1,2,3...)
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
    commission_type = Column(String)   # 'grid_owner','level_pool','upline','company'
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

Base.metadata.create_all(bind=engine)

# ── Auto-migration: add missing columns if they don't exist ──────────────
def run_migrations():
    """Add any new columns that don't exist yet in the live DB."""
    migrations = [
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
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
            except Exception:
                pass
        conn.commit()

run_migrations()
