"""
SuperAdPro Grid Commission Test Suite — Spillover Model
========================================================
Run: python tests/test_grid_commissions.py

Commission Architecture (40/50/5/5):
  40% → Direct Sponsor (person who referred the buyer)
  50% → Uni-Level Pool (6.25% × 8 levels up the sponsor chain)
   5% → Platform Fee
   5% → Grid Completion Bonus Pool (accrues per seat, pays on completion)

Spillover Model:
  One purchase fills one seat in EVERY upline grid at that tier.
  One person, one seat per advance.

Grid Completion Bonus:
  Only pays if grid owner has active campaign at that tier.
  If no active campaign, bonus rolls to next advance.

Tests cover:
1. Commission split percentages (40/50/5/5)
2. Direct sponsor gets 40% on purchase
3. Uni-level chain pays 6.25% to each of 8 levels
4. Short chain — remaining uni-level goes to platform
5. No sponsor — 40% absorbed by platform
6. Spillover fills multiple upline grids
7. One person one seat per advance (dedup)
8. Grid completion at 64 seats
9. Auto-spawn of next advance on completion
10. Completion bonus WITH active campaign
11. Completion bonus WITHOUT active campaign (rolls over)
12. Bonus rollover accumulates across advances
13. Multiple tiers pay correct amounts
14. Campaign view tracking and completion
"""

import sys, os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base

TestBase = declarative_base()

class User(TestBase):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    email = Column(String)
    password = Column(String)
    sponsor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    balance = Column(Float, default=0.0)
    campaign_balance = Column(Float, default=0.0)  # dual-wallet: campaign wallet
    total_earned = Column(Float, default=0.0)
    total_withdrawn = Column(Float, default=0.0)
    grid_earnings = Column(Float, default=0.0)
    level_earnings = Column(Float, default=0.0)
    upline_earnings = Column(Float, default=0.0)
    bonus_earnings = Column(Float, default=0.0)
    total_team = Column(Integer, default=0)
    personal_referrals = Column(Integer, default=0)

class Grid(TestBase):
    __tablename__ = "grids"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    package_tier = Column(Integer)
    package_price = Column(Float)
    advance_number = Column(Integer, default=1)
    positions_filled = Column(Integer, default=0)
    revenue_total = Column(Float, default=0.0)
    bonus_pool_accrued = Column(Float, default=0.0)
    bonus_paid = Column(Boolean, default=False)
    bonus_rolled_over = Column(Boolean, default=False)
    is_complete = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    owner_paid = Column(Boolean, default=False)

class GridPosition(TestBase):
    __tablename__ = "grid_positions"
    id = Column(Integer, primary_key=True)
    grid_id = Column(Integer, ForeignKey("grids.id"))
    member_id = Column(Integer, ForeignKey("users.id"))
    grid_level = Column(Integer)
    position_num = Column(Integer)
    is_overspill = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Commission(TestBase):
    __tablename__ = "commissions"
    id = Column(Integer, primary_key=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    grid_id = Column(Integer, ForeignKey("grids.id"), nullable=True)
    amount_usdt = Column(Float)
    commission_type = Column(String)
    package_tier = Column(Integer)
    status = Column(String, default="pending")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

class VideoCampaign(TestBase):
    __tablename__ = "video_campaigns"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="Test")
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    platform = Column(String, default="youtube")
    video_url = Column(String, default="https://youtube.com/test")
    embed_url = Column(String, default="https://youtube.com/embed/test")
    video_id = Column(String, nullable=True)
    status = Column(String, default="active")
    views_target = Column(Integer, default=0)
    views_delivered = Column(Integer, default=0)
    campaign_tier = Column(Integer, default=1)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    grace_expires_at = Column(DateTime, nullable=True)
    purchase_number = Column(Integer, default=1)
    target_country = Column(String, nullable=True)
    target_interests = Column(String, nullable=True)
    target_age_min = Column(Integer, nullable=True)
    target_age_max = Column(Integer, nullable=True)
    target_gender = Column(String, nullable=True)
    priority_level = Column(Integer, default=0)
    owner_tier = Column(Integer, default=1)
    is_featured = Column(Boolean, default=False)
    is_spotlight = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

engine = create_engine("sqlite:///:memory:")
TestBase.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

# Mock the database module
import types
mock_db = types.ModuleType("app.database")
mock_db.User = User
mock_db.Grid = Grid
mock_db.GridPosition = GridPosition
mock_db.Commission = Commission
mock_db.VideoCampaign = VideoCampaign
mock_db.GRID_WIDTH = 8
mock_db.GRID_LEVELS = 8
mock_db.GRID_TOTAL = 64
mock_db.DIRECT_PCT = 0.40
mock_db.UNILEVEL_PCT = 0.50
mock_db.PER_LEVEL_PCT = 0.0625
mock_db.PLATFORM_PCT = 0.05
mock_db.BONUS_POOL_PCT = 0.05
mock_db.GRID_PACKAGES = {1: 20.0, 2: 50.0, 3: 100.0, 4: 200.0, 5: 400.0, 6: 600.0, 7: 800.0, 8: 1000.0}
mock_db.GRID_COMPLETION_BONUS = {1: 64.0, 2: 160.0, 3: 320.0, 4: 640.0, 5: 1280.0, 6: 1920.0, 7: 2560.0, 8: 3200.0}
mock_db.CAMPAIGN_GRACE_DAYS = 14
sys.modules["app.database"] = mock_db

from app.grid import (
    process_tier_purchase, place_member_in_grid, get_grid_stats,
    record_campaign_view, check_campaign_completion,
    get_or_create_active_grid, _owner_has_active_campaign,
    _user_is_qualified
)

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"
results = {"pass": 0, "fail": 0}

def check(name, condition, detail=""):
    if condition:
        results["pass"] += 1
        print(f"  {PASS}  {name}")
    else:
        results["fail"] += 1
        print(f"  {FAIL}  {name}  {'— ' + detail if detail else ''}")

def make_user(db, username, sponsor=None, is_admin=False):
    u = User(username=username, email=f"{username}@test.com", password="x",
             is_admin=is_admin, is_active=True, balance=0, total_earned=0,
             grid_earnings=0, level_earnings=0, bonus_earnings=0,
             total_team=0, personal_referrals=0,
             sponsor_id=sponsor.id if sponsor else None)
    db.add(u); db.flush()
    return u

def make_campaign(db, user_id, tier=1, status="active", views_target=1000):
    c = VideoCampaign(user_id=user_id, campaign_tier=tier, status=status,
                      views_target=views_target, views_delivered=0,
                      is_completed=False)
    db.add(c); db.flush()
    return c

def get_comms(db, comm_type=None, from_user=None):
    q = db.query(Commission)
    if comm_type:
        q = q.filter(Commission.commission_type == comm_type)
    if from_user:
        q = q.filter(Commission.from_user_id == from_user)
    return q.all()

def reset_db():
    TestBase.metadata.drop_all(engine)
    TestBase.metadata.create_all(engine)

# ═══════════════════════════════════════════════════════════════
# TEST 1: Commission Split Percentages
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 1: Commission Split Percentages ═══")
check("40% + 50% + 5% + 5% = 100%",
      abs(0.40 + 0.50 + 0.05 + 0.05 - 1.0) < 0.0001)
check("6.25% × 8 levels = 50%",
      abs(0.0625 * 8 - 0.50) < 0.0001)

# ═══════════════════════════════════════════════════════════════
# TEST 2: Direct Sponsor Gets 40%
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 2: Direct Sponsor Gets 40% (Qualified) ═══")
reset_db()
db = Session()
company = make_user(db, "company", is_admin=True)
sponsor = make_user(db, "sponsor", sponsor=company)
buyer = make_user(db, "buyer", sponsor=sponsor)
# Sponsor must have active campaign at tier 1 to qualify
make_campaign(db, sponsor.id, tier=1)
db.commit()

result = process_tier_purchase(db, buyer.id, 1)
check("Purchase succeeds", result["success"])

db.refresh(sponsor)
expected_direct = 20.0 * 0.40  # $8
check(f"Sponsor grid_earnings = ${expected_direct}", abs(float(sponsor.grid_earnings) - expected_direct) < 0.01,
      f"got ${float(sponsor.grid_earnings):.2f}")
check("Sponsor campaign_balance includes direct + uni-level", float(sponsor.campaign_balance) > expected_direct)

direct_comms = get_comms(db, "direct_sponsor")
check("Direct sponsor commission recorded", len(direct_comms) == 1)
check(f"Direct commission = ${expected_direct}", abs(float(direct_comms[0].amount_usdt) - expected_direct) < 0.01)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 3: Uni-Level Chain Pays 6.25% to 8 Levels
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 3: Uni-Level Chain 6.25% × 8 Levels (All Qualified) ═══")
reset_db()
db = Session()
# Build chain of 10: company → u1 → u2 → ... → u9 → buyer
chain = [make_user(db, "company", is_admin=True)]
for i in range(1, 10):
    chain.append(make_user(db, f"u{i}", sponsor=chain[-1]))
buyer = make_user(db, "buyer", sponsor=chain[-1])
# Give all chain members active campaigns at tier 1
for u in chain:
    make_campaign(db, u.id, tier=1)
db.commit()

process_tier_purchase(db, buyer.id, 1)

per_level = 20.0 * 0.0625  # $1.25
for i in range(1, 9):  # 8 levels up from buyer
    user = chain[-(i)]  # walk from buyer's sponsor up
    db.refresh(user)
    check(f"Level {i} ({user.username}) got ${per_level:.2f}",
          abs(float(user.level_earnings) - per_level) < 0.01,
          f"got ${float(user.level_earnings):.4f}")

uni_comms = get_comms(db, "uni_level")
check(f"8 uni-level commissions recorded", len(uni_comms) == 8)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 4: Short Chain — Remaining Goes to Platform
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 4: Short Chain — Qualified Paid, Rest Absorbed ═══")
reset_db()
db = Session()
company = make_user(db, "company", is_admin=True)
sponsor = make_user(db, "sponsor", sponsor=company)
buyer = make_user(db, "buyer", sponsor=sponsor)
# sponsor has active campaign; company is admin (auto-qualified)
make_campaign(db, sponsor.id, tier=1)
db.commit()

process_tier_purchase(db, buyer.id, 1)

uni_comms = get_comms(db, "uni_level")
paid_comms = [c for c in uni_comms if c.to_user_id is not None]
platform_comms = [c for c in uni_comms if c.to_user_id is None]
# Admin auto-qualifies, so sponsor + company both earn. Chain beyond company is empty.
check("2 paid uni-level (sponsor + admin company)", len(paid_comms) == 2,
      f"got {len(paid_comms)} paid")
check("6 company-absorbed uni-level (empty chain beyond company)", len(platform_comms) == 6,
      f"got {len(platform_comms)} absorbed")
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 5: No Sponsor — 40% Platform Absorb
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 5: No Sponsor — 40% Platform Absorb ═══")
reset_db()
db = Session()
buyer = make_user(db, "buyer")
db.commit()

process_tier_purchase(db, buyer.id, 1)
direct_comms = get_comms(db, "direct_sponsor")
check("Direct commission recorded", len(direct_comms) == 1)
check("Goes to platform (to_user_id is None)", direct_comms[0].to_user_id is None)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 6: Spillover Fills Multiple Upline Grids
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 6: Spillover Fills Multiple Upline Grids ═══")
reset_db()
db = Session()
# Chain: root → A → B → C → buyer
root = make_user(db, "root")
a = make_user(db, "alice", sponsor=root)
b = make_user(db, "bob", sponsor=a)
c = make_user(db, "carol", sponsor=b)
buyer = make_user(db, "buyer", sponsor=c)
db.commit()

result = process_tier_purchase(db, buyer.id, 1)
check("Purchase succeeds", result["success"])
check("Grids filled in result", len(result["grids_filled"]) > 0)

# Check each upline has buyer in their grid
for upline in [c, b, a, root]:
    grid = db.query(Grid).filter(Grid.owner_id == upline.id, Grid.package_tier == 1).first()
    check(f"{upline.username}'s grid exists", grid is not None)
    if grid:
        pos = db.query(GridPosition).filter(
            GridPosition.grid_id == grid.id,
            GridPosition.member_id == buyer.id
        ).first()
        check(f"Buyer seated in {upline.username}'s grid", pos is not None)

check(f"Result shows {len(result['grids_filled'])} grids filled",
      len(result["grids_filled"]) == 4)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 7: One Person One Seat Per Advance (Dedup)
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 7: One Person One Seat Per Advance ═══")
reset_db()
db = Session()
root = make_user(db, "root")
sponsor = make_user(db, "sponsor", sponsor=root)
buyer = make_user(db, "buyer", sponsor=sponsor)
db.commit()

# First purchase
r1 = process_tier_purchase(db, buyer.id, 1)
# Try duplicate — spillover should skip already-seated grids
r2 = process_tier_purchase(db, buyer.id, 1)

grid = db.query(Grid).filter(Grid.owner_id == sponsor.id, Grid.package_tier == 1).first()
positions = db.query(GridPosition).filter(
    GridPosition.grid_id == grid.id,
    GridPosition.member_id == buyer.id
).all()
check("Buyer appears only once in sponsor's grid", len(positions) == 1)
check("Second purchase fills 0 new grids in already-filled chain",
      len(r2["grids_filled"]) == 0)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 8: Grid Completion at 64 Seats
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 8: Grid Completion at 64 Seats ═══")
reset_db()
db = Session()
owner = make_user(db, "owner")
# Create a campaign so bonus pays
make_campaign(db, owner.id, tier=1)
db.commit()

grid = get_or_create_active_grid(db, owner.id, 1)

# Fill 64 seats via direct placement
for i in range(64):
    member = make_user(db, f"m{i}", sponsor=owner)
    db.commit()
    place_member_in_grid(db, member.id, owner.id, 1)

db.refresh(grid)
check("Grid is complete", grid.is_complete == True)
check("64 positions filled", grid.positions_filled == 64)
check("Bonus was paid", grid.bonus_paid == True)

# Check next advance auto-spawned
next_grid = db.query(Grid).filter(
    Grid.owner_id == owner.id,
    Grid.package_tier == 1,
    Grid.is_complete == False
).first()
check("Next advance grid spawned", next_grid is not None)
if next_grid:
    check("Next advance number = 2", next_grid.advance_number == 2)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 9: Completion Bonus WITH Active Campaign
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 9: Completion Bonus WITH Active Campaign ═══")
reset_db()
db = Session()
owner = make_user(db, "owner")
make_campaign(db, owner.id, tier=1, views_target=1000)
db.commit()

grid = get_or_create_active_grid(db, owner.id, 1)

for i in range(64):
    member = make_user(db, f"m{i}", sponsor=owner)
    db.commit()
    place_member_in_grid(db, member.id, owner.id, 1)

db.refresh(owner)
# Expected bonus = 64 × $20 × 5% = $64
expected_bonus = 64.0
check(f"Owner bonus_earnings = ${expected_bonus}",
      abs(float(owner.bonus_earnings) - expected_bonus) < 0.01,
      f"got ${float(owner.bonus_earnings):.2f}")

bonus_comms = [c for c in db.query(Commission).all() if c.commission_type == "grid_completion_bonus"]
check("Completion bonus commission recorded", len(bonus_comms) == 1)
if bonus_comms:
    check(f"Bonus amount = ${expected_bonus}",
          abs(float(bonus_comms[0].amount_usdt) - expected_bonus) < 0.01)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 10: Completion Bonus WITHOUT Campaign (Rolls Over)
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 10: No Campaign — Bonus Rolls Over ═══")
reset_db()
db = Session()
owner = make_user(db, "owner")
# NO campaign created
db.commit()

grid = get_or_create_active_grid(db, owner.id, 1)
for i in range(64):
    member = make_user(db, f"m{i}", sponsor=owner)
    db.commit()
    place_member_in_grid(db, member.id, owner.id, 1)

db.refresh(grid)
check("Grid is complete", grid.is_complete == True)
check("Bonus NOT paid", grid.bonus_paid == False)
check("Bonus rolled over flag set", grid.bonus_rolled_over == True)

db.refresh(owner)
check("Owner bonus_earnings = $0", abs(float(owner.bonus_earnings)) < 0.01)

# Check the new advance grid has the rolled-over bonus
next_grid = db.query(Grid).filter(
    Grid.owner_id == owner.id, Grid.package_tier == 1, Grid.is_complete == False
).first()
check("Next advance has rolled-over bonus pool",
      next_grid is not None and float(next_grid.bonus_pool_accrued) >= 64.0 - 0.01,
      f"got ${float(next_grid.bonus_pool_accrued):.2f}" if next_grid else "no grid")
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 11: Bonus Rollover Accumulates
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 11: Bonus Rollover Accumulates Across Advances ═══")
reset_db()
db = Session()
owner = make_user(db, "owner")
# NO campaign for first advance
db.commit()

# Fill first grid (64 seats) — bonus rolls over
for i in range(64):
    member = make_user(db, f"a{i}", sponsor=owner)
    db.commit()
    place_member_in_grid(db, member.id, owner.id, 1)

# Now add campaign before second grid completes
make_campaign(db, owner.id, tier=1)
db.commit()

# Fill second grid (64 seats) — bonus should include rollover
for i in range(64):
    member = make_user(db, f"b{i}", sponsor=owner)
    db.commit()
    place_member_in_grid(db, member.id, owner.id, 1)

db.refresh(owner)
# Expected: $64 (first advance rollover) + $64 (second advance) = $128
expected = 128.0
check(f"Owner bonus_earnings = ${expected} (accumulated)",
      abs(float(owner.bonus_earnings) - expected) < 0.01,
      f"got ${float(owner.bonus_earnings):.2f}")
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 12: Multiple Tiers Pay Correct Amounts
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 12: Multiple Tiers Pay Correct Amounts ═══")
reset_db()
db = Session()
company = make_user(db, "company", is_admin=True)
sponsor = make_user(db, "sponsor", sponsor=company)
db.commit()

for tier, price in [(1, 20.0), (3, 100.0), (5, 400.0), (8, 1000.0)]:
    buyer = make_user(db, f"buyer_t{tier}", sponsor=sponsor)
    db.commit()
    result = process_tier_purchase(db, buyer.id, tier)
    check(f"Tier {tier} (${price}) purchase succeeds", result["success"])

    direct_comms = [c for c in get_comms(db, "direct_sponsor", from_user=buyer.id)]
    expected = price * 0.40
    if direct_comms:
        check(f"  Tier {tier} direct = ${expected:.2f}",
              abs(float(direct_comms[0].amount_usdt) - expected) < 0.01)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 13: Platform Fee is 5%
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 13: Platform Fee = 5% ═══")
reset_db()
db = Session()
sponsor = make_user(db, "sponsor")
buyer = make_user(db, "buyer", sponsor=sponsor)
db.commit()

process_tier_purchase(db, buyer.id, 1)
platform_comms = get_comms(db, "platform")
check("Platform fee recorded", len(platform_comms) == 1)
check("Platform fee = $1.00 (5% of $20)",
      abs(float(platform_comms[0].amount_usdt) - 1.0) < 0.01)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 14: Total Commission Adds Up to 95%
# (5% bonus pool accrues on grid, not paid as commission)
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 14: Commissions Total 95% (5% in bonus pool) ═══")
reset_db()
db = Session()
# Full 8-level chain — all qualified
chain = [make_user(db, "root")]
for i in range(1, 9):
    chain.append(make_user(db, f"u{i}", sponsor=chain[-1]))
buyer = make_user(db, "buyer", sponsor=chain[-1])
for u in chain:
    make_campaign(db, u.id, tier=1)
db.commit()

process_tier_purchase(db, buyer.id, 1)

all_comms = db.query(Commission).filter(Commission.from_user_id == buyer.id).all()
total_paid = sum(float(c.amount_usdt) for c in all_comms)
expected_95 = 20.0 * 0.95  # $19 (40% + 50% + 5%)
check(f"Total commissions = ${expected_95:.2f} (95%)",
      abs(total_paid - expected_95) < 0.01,
      f"got ${total_paid:.2f}")
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 15: Bonus Pool Accrues 5% Per Seat
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 15: Bonus Pool Accrues 5% Per Seat ═══")
reset_db()
db = Session()
owner = make_user(db, "owner")
member1 = make_user(db, "m1", sponsor=owner)
member2 = make_user(db, "m2", sponsor=owner)
db.commit()

place_member_in_grid(db, member1.id, owner.id, 1)
place_member_in_grid(db, member2.id, owner.id, 1)

grid = db.query(Grid).filter(Grid.owner_id == owner.id, Grid.package_tier == 1).first()
expected_pool = 2 * 20.0 * 0.05  # 2 seats × $20 × 5% = $2.00
check(f"Bonus pool = ${expected_pool:.2f} after 2 seats",
      abs(float(grid.bonus_pool_accrued) - expected_pool) < 0.01,
      f"got ${float(grid.bonus_pool_accrued):.2f}")
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 16: Campaign View Tracking
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 16: Campaign View Tracking ═══")
reset_db()
db = Session()
owner = make_user(db, "owner")
campaign = make_campaign(db, owner.id, tier=1, views_target=5)
db.commit()

for i in range(4):
    result = record_campaign_view(db, campaign.id)
    check(f"View {i+1} recorded", result["success"])

db.refresh(campaign)
check("4 views delivered", campaign.views_delivered == 4)
check("Not completed yet", campaign.is_completed == False)

# 5th view should complete
result = record_campaign_view(db, campaign.id)
check("5th view completes campaign", result["completed"] == True)

db.refresh(campaign)
check("Campaign marked completed", campaign.is_completed == True)
check("Status = completed", campaign.status == "completed")

# Try recording after completion
result = record_campaign_view(db, campaign.id)
check("Cannot record views on completed campaign", result["success"] == False)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 17: Campaign Completion Check
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 17: Campaign Completion Check ═══")
reset_db()
db = Session()
owner = make_user(db, "owner")
campaign = make_campaign(db, owner.id, tier=1, views_target=100)
db.commit()

status = check_campaign_completion(db, campaign.id)
check("Progress = 0%", status["progress_pct"] == 0.0)

# Add 50 views
for i in range(50):
    record_campaign_view(db, campaign.id)

status = check_campaign_completion(db, campaign.id)
check("Progress = 50%", status["progress_pct"] == 50.0)
check("Not completed", status["completed"] == False)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 18: Active Campaign Check
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 18: Active Campaign Detection ═══")
reset_db()
db = Session()
owner = make_user(db, "owner")
db.commit()

check("No campaign = False", _owner_has_active_campaign(db, owner.id, 1) == False)

campaign = make_campaign(db, owner.id, tier=1)
db.commit()
check("Active campaign = True", _owner_has_active_campaign(db, owner.id, 1) == True)
check("Wrong tier = False", _owner_has_active_campaign(db, owner.id, 2) == False)

campaign.is_completed = True
db.commit()
check("Completed campaign = False", _owner_has_active_campaign(db, owner.id, 1) == False)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 19: Spillover Doesn't Fill Buyer's Own Grid
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 19: Buyer Doesn't Fill Own Grid ═══")
reset_db()
db = Session()
root = make_user(db, "root")
buyer = make_user(db, "buyer", sponsor=root)
db.commit()

# Buyer already has a grid from previous purchase
get_or_create_active_grid(db, buyer.id, 1)
process_tier_purchase(db, buyer.id, 1)

buyer_grid = db.query(Grid).filter(Grid.owner_id == buyer.id, Grid.package_tier == 1).first()
buyer_pos = db.query(GridPosition).filter(
    GridPosition.grid_id == buyer_grid.id,
    GridPosition.member_id == buyer.id
).first()
check("Buyer NOT in own grid", buyer_pos is None)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 20: Completion Bonus for Higher Tiers
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 20: Tier 5 Completion Bonus = $1,280 ═══")
reset_db()
db = Session()
owner = make_user(db, "owner")
make_campaign(db, owner.id, tier=5)
db.commit()

for i in range(64):
    member = make_user(db, f"m{i}", sponsor=owner)
    db.commit()
    place_member_in_grid(db, member.id, owner.id, 5)

db.refresh(owner)
expected = 64 * 400.0 * 0.05  # $1,280
check(f"Tier 5 bonus = ${expected:.0f}",
      abs(float(owner.bonus_earnings) - expected) < 0.01,
      f"got ${float(owner.bonus_earnings):.2f}")
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 21: Spillover + Commission Are Independent
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 21: Commissions Paid Even Without Upline Grids ═══")
reset_db()
db = Session()
sponsor = make_user(db, "sponsor")
buyer = make_user(db, "buyer", sponsor=sponsor)
make_campaign(db, sponsor.id, tier=1)
db.commit()

result = process_tier_purchase(db, buyer.id, 1)
check("Purchase succeeds", result["success"])

db.refresh(sponsor)
check("Sponsor got 40% direct", abs(float(sponsor.grid_earnings) - 8.0) < 0.01)
# Sponsor also gets uni-level as level 1
check("Sponsor got 6.25% uni-level too", abs(float(sponsor.level_earnings) - 1.25) < 0.01)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 22: Invalid Tier Rejected
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 22: Invalid Tier Rejected ═══")
reset_db()
db = Session()
buyer = make_user(db, "buyer")
db.commit()

result = process_tier_purchase(db, buyer.id, 99)
check("Invalid tier returns error", result["success"] == False)
check("Error message present", "Invalid" in result.get("error", ""))
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 23: Unqualified Sponsor — 40% Goes to Company
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 23: Unqualified Sponsor — 40% to Company ═══")
reset_db()
db = Session()
sponsor = make_user(db, "sponsor")
buyer = make_user(db, "buyer", sponsor=sponsor)
# Sponsor has NO campaign — unqualified
db.commit()

process_tier_purchase(db, buyer.id, 1)

db.refresh(sponsor)
check("Sponsor earned $0 (unqualified)", abs(float(sponsor.grid_earnings)) < 0.01,
      f"got ${float(sponsor.grid_earnings):.2f}")

direct_comms = get_comms(db, "direct_sponsor")
check("Direct commission recorded", len(direct_comms) == 1)
check("Goes to company (to_user_id is None)", direct_comms[0].to_user_id is None)
check("Notes mention unqualified", "unqualified" in (direct_comms[0].notes or "").lower())
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 24: Unqualified Uni-Level — Company Absorbs
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 24: Unqualified Uni-Level — Company Absorbs ═══")
reset_db()
db = Session()
root = make_user(db, "root")
mid = make_user(db, "mid", sponsor=root)   # NO campaign
sponsor = make_user(db, "sponsor", sponsor=mid)
buyer = make_user(db, "buyer", sponsor=sponsor)
# Only sponsor and root qualified, mid is NOT
make_campaign(db, sponsor.id, tier=1)
make_campaign(db, root.id, tier=1)
db.commit()

process_tier_purchase(db, buyer.id, 1)

db.refresh(mid)
check("Mid earned $0 (unqualified at uni-level)", abs(float(mid.level_earnings)) < 0.01)

db.refresh(sponsor)
check("Sponsor earned direct (qualified)", float(sponsor.grid_earnings) > 0)

db.refresh(root)
check("Root earned uni-level (qualified)", float(root.level_earnings) > 0)
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 25: Higher Tier Campaign Qualifies for Lower Tier
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 25: Higher Tier Qualifies for Lower ═══")
reset_db()
db = Session()
sponsor = make_user(db, "sponsor")
buyer = make_user(db, "buyer", sponsor=sponsor)
# Sponsor has tier 3 campaign — should qualify for tier 1
make_campaign(db, sponsor.id, tier=3)
db.commit()

process_tier_purchase(db, buyer.id, 1)

db.refresh(sponsor)
check("Sponsor earned on tier 1 with tier 3 campaign", float(sponsor.grid_earnings) > 0,
      f"got ${float(sponsor.grid_earnings):.2f}")
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 26: Lower Tier Campaign Does NOT Qualify for Higher
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 26: Lower Tier Does NOT Qualify for Higher ═══")
reset_db()
db = Session()
sponsor = make_user(db, "sponsor")
buyer = make_user(db, "buyer", sponsor=sponsor)
# Sponsor has tier 1 campaign — should NOT qualify for tier 3
make_campaign(db, sponsor.id, tier=1)
db.commit()

process_tier_purchase(db, buyer.id, 3)

db.refresh(sponsor)
check("Sponsor earned $0 on tier 3 with tier 1 campaign", abs(float(sponsor.grid_earnings)) < 0.01,
      f"got ${float(sponsor.grid_earnings):.2f}")
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 27: Grace Period — Still Qualified After Completion
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 27: Grace Period — Qualified After Completion ═══")
reset_db()
db = Session()
sponsor = make_user(db, "sponsor")
buyer = make_user(db, "buyer", sponsor=sponsor)
# Sponsor has completed campaign with grace period still active
campaign = make_campaign(db, sponsor.id, tier=1, views_target=5)
db.commit()

# Complete the campaign
for i in range(5):
    record_campaign_view(db, campaign.id)

db.refresh(campaign)
check("Campaign completed", campaign.is_completed == True)
check("Grace period set", campaign.grace_expires_at is not None)

# Now buy — sponsor should still qualify during grace
buyer2 = make_user(db, "buyer2", sponsor=sponsor)
db.commit()
process_tier_purchase(db, buyer2.id, 1)

db.refresh(sponsor)
check("Sponsor earned during grace period", float(sponsor.grid_earnings) > 0,
      f"got ${float(sponsor.grid_earnings):.2f}")
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 28: Grace Period Expired — No Longer Qualified
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 28: Grace Expired — Not Qualified ═══")
reset_db()
db = Session()
sponsor = make_user(db, "sponsor")
buyer = make_user(db, "buyer", sponsor=sponsor)
# Sponsor has completed campaign with expired grace period
campaign = make_campaign(db, sponsor.id, tier=1, views_target=1)
db.commit()

record_campaign_view(db, campaign.id)

# Manually expire the grace period
db.refresh(campaign)
campaign.grace_expires_at = datetime.utcnow() - timedelta(days=1)
db.commit()

# Now buy — sponsor should NOT qualify
buyer2 = make_user(db, "buyer2", sponsor=sponsor)
db.commit()
process_tier_purchase(db, buyer2.id, 1)

db.refresh(sponsor)
check("Sponsor earned $0 (grace expired)", abs(float(sponsor.grid_earnings)) < 0.01,
      f"got ${float(sponsor.grid_earnings):.2f}")
db.close()

# ═══════════════════════════════════════════════════════════════
# TEST 29: Campaign Completion Sets Grace Period
# ═══════════════════════════════════════════════════════════════
print("\n═══ TEST 29: Completion Sets 14-Day Grace ═══")
reset_db()
db = Session()
owner = make_user(db, "owner")
campaign = make_campaign(db, owner.id, tier=1, views_target=3)
db.commit()

for i in range(3):
    record_campaign_view(db, campaign.id)

db.refresh(campaign)
check("Campaign completed", campaign.is_completed == True)
check("Grace expires set", campaign.grace_expires_at is not None)
if campaign.grace_expires_at and campaign.completed_at:
    diff = (campaign.grace_expires_at - campaign.completed_at).days
    check(f"Grace period = 14 days (got {diff})", diff == 14)
db.close()

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
print(f"\n{'═'*60}")
total = results["pass"] + results["fail"]
print(f"  RESULTS: {results['pass']}/{total} passed, {results['fail']} failed")
if results["fail"] == 0:
    print(f"  \033[92m🎉 ALL TESTS PASSED!\033[0m")
else:
    print(f"  \033[91m⚠️  {results['fail']} TESTS FAILED\033[0m")
print(f"{'═'*60}\n")

sys.exit(0 if results["fail"] == 0 else 1)
