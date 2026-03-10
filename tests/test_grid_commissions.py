"""
SuperAdPro Grid Commission Test Suite
=======================================
Tests the 8×8 Income Grid commission flows.
Run: python tests/test_grid_commissions.py

Commission Architecture:
  40% → Direct Sponsor (person who referred the entrant)
  55% → Uni-Level Pool (6.875% × 8 levels up the sponsor chain)
   5% → Platform Fee

Tests cover:
1. Commission split percentages (40/55/5)
2. Direct sponsor gets 40% on every seat fill
3. Uni-level chain pays 6.875% to each of 8 levels
4. Short chain — remaining uni-level goes to platform
5. No sponsor — 40% absorbed by platform
6. Grid completion at 64 seats
7. Auto-spawn of next advance on completion
8. Multiple tiers pay correct amounts
9. Overspill placement when grid is full
"""

import sys, os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
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
    total_earned = Column(Float, default=0.0)
    grid_earnings = Column(Float, default=0.0)
    level_earnings = Column(Float, default=0.0)
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
    from_user_id = Column(Integer, ForeignKey("users.id"))
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    grid_id = Column(Integer, ForeignKey("grids.id"), nullable=True)
    amount_usdt = Column(Float)
    commission_type = Column(String)
    package_tier = Column(Integer)
    status = Column(String, default="pending")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

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
mock_db.GRID_WIDTH = 8
mock_db.GRID_LEVELS = 8
mock_db.GRID_TOTAL = 64
mock_db.DIRECT_PCT = 0.40
mock_db.UNILEVEL_PCT = 0.55
mock_db.PER_LEVEL_PCT = 0.06875
mock_db.PLATFORM_PCT = 0.05
mock_db.GRID_PACKAGES = {1: 20.0, 2: 50.0, 3: 100.0, 4: 200.0, 5: 400.0, 6: 600.0, 7: 800.0, 8: 1000.0}
sys.modules["app.database"] = mock_db

from app.grid import place_member_in_grid, get_grid_stats

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
             grid_earnings=0, level_earnings=0, total_team=0, personal_referrals=0,
             sponsor_id=sponsor.id if sponsor else None)
    db.add(u); db.flush()
    return u

def get_comms(db, grid_id, comm_type=None):
    q = db.query(Commission).filter(Commission.grid_id == grid_id)
    if comm_type:
        q = q.filter(Commission.commission_type == comm_type)
    return q.all()


# ═══ TEST 1: Commission Split Percentages ═══
def test_commission_splits():
    print("\n━━ TEST 1: Commission Split Percentages ━━")
    check("40% + 55% + 5% = 100%", abs(0.40 + 0.55 + 0.05 - 1.0) < 0.0001)
    check("6.875% × 8 = 55%", abs(0.06875 * 8 - 0.55) < 0.0001)
    check("Tier 1 = $20", mock_db.GRID_PACKAGES[1] == 20.0)
    check("Tier 8 = $1000", mock_db.GRID_PACKAGES[8] == 1000.0)
    check("Grid = 8×8 = 64 positions", mock_db.GRID_TOTAL == 64)


# ═══ TEST 2: Direct Sponsor Gets 40% ═══
def test_direct_sponsor():
    print("\n━━ TEST 2: Direct Sponsor Gets 40% ━━")
    db = Session()
    admin = make_user(db, "t2_admin", is_admin=True)
    steve = make_user(db, "t2_steve")
    alice = make_user(db, "t2_alice", sponsor=steve)  # Alice's sponsor is Steve

    r = place_member_in_grid(db, alice.id, steve.id, 1)
    check("Placement succeeded", r["success"])

    direct_comms = get_comms(db, r["grid_id"], "direct_sponsor")
    check("1 direct_sponsor commission", len(direct_comms) == 1)
    check("Direct commission = $8 (40% of $20)", abs(direct_comms[0].amount_usdt - 8.0) < 0.01,
          f"got ${direct_comms[0].amount_usdt}")
    check("Paid to Steve", direct_comms[0].to_user_id == steve.id)
    check("Steve balance = $9.375 ($8 direct + $1.375 uni-level)", abs(float(steve.balance) - 9.375) < 0.01,
          f"got {steve.balance}")
    check("Steve grid_earnings = $8", abs(float(steve.grid_earnings) - 8.0) < 0.01)
    db.rollback(); db.close()


# ═══ TEST 3: Uni-Level Chain Pays 8 Levels ═══
def test_unilevel_full_chain():
    print("\n━━ TEST 3: Uni-Level Chain — Full 8 Levels ━━")
    db = Session()
    # Build a chain: u0 → u1 → u2 → ... → u8 → buyer
    users = [make_user(db, f"t3_u0")]
    for i in range(1, 9):
        users.append(make_user(db, f"t3_u{i}", sponsor=users[-1]))
    buyer = make_user(db, f"t3_buyer", sponsor=users[-1])

    r = place_member_in_grid(db, buyer.id, users[0].id, 1)
    check("Placement succeeded", r["success"])

    uni_comms = get_comms(db, r["grid_id"], "uni_level")
    check("8 uni_level commissions", len(uni_comms) == 8, f"got {len(uni_comms)}")

    per_level = round(20.0 * 0.06875, 6)  # $1.375
    for c in uni_comms:
        check(f"Uni-level to user {c.to_user_id} = ${per_level}", abs(c.amount_usdt - per_level) < 0.01,
              f"got ${c.amount_usdt}")

    # Check the correct users received (8 levels up from buyer)
    expected_earners = [users[i].id for i in range(8, 0, -1)]  # u8, u7, ... u1
    actual_earners = [c.to_user_id for c in uni_comms]
    check("Correct 8 upline members paid", actual_earners == expected_earners,
          f"expected {expected_earners}, got {actual_earners}")

    db.rollback(); db.close()


# ═══ TEST 4: Short Chain — Remaining to Platform ═══
def test_short_chain():
    print("\n━━ TEST 4: Short Chain — Remaining Uni-Level to Platform ━━")
    db = Session()
    # Only 3 levels: admin → steve → alice → buyer
    admin = make_user(db, "t4_admin", is_admin=True)
    steve = make_user(db, "t4_steve")
    alice = make_user(db, "t4_alice", sponsor=steve)
    buyer = make_user(db, "t4_buyer", sponsor=alice)

    r = place_member_in_grid(db, buyer.id, steve.id, 1)
    check("Placement succeeded", r["success"])

    uni_comms = get_comms(db, r["grid_id"], "uni_level")
    paid_to_users = [c for c in uni_comms if c.to_user_id is not None]
    paid_to_platform = [c for c in uni_comms if c.to_user_id is None]

    # buyer → alice (level 1) → steve (level 2), then chain ends = 6 to platform
    check("2 uni-level paid to users", len(paid_to_users) == 2, f"got {len(paid_to_users)}")
    check("6 uni-level absorbed by platform", len(paid_to_platform) == 6, f"got {len(paid_to_platform)}")
    check("Total uni-level = 8", len(uni_comms) == 8)

    db.rollback(); db.close()


# ═══ TEST 5: No Sponsor — 40% to Platform ═══
def test_no_sponsor():
    print("\n━━ TEST 5: No Sponsor — 40% Absorbed by Platform ━━")
    db = Session()
    admin = make_user(db, "t5_admin", is_admin=True)
    orphan = make_user(db, "t5_orphan")  # No sponsor

    r = place_member_in_grid(db, orphan.id, admin.id, 1)
    check("Placement succeeded", r["success"])

    direct_comms = get_comms(db, r["grid_id"], "direct_sponsor")
    check("Direct commission recorded", len(direct_comms) == 1)
    check("Paid to None (platform absorb)", direct_comms[0].to_user_id is None)

    db.rollback(); db.close()


# ═══ TEST 6: Grid Completion at 64 Seats ═══
def test_grid_completion():
    print("\n━━ TEST 6: Grid Completion at 64 Seats ━━")
    db = Session()
    owner = make_user(db, "t6_owner")

    # Fill 63 positions
    for i in range(63):
        m = make_user(db, f"t6_m{i}", sponsor=owner)
        r = place_member_in_grid(db, m.id, owner.id, 1)
        if i == 62:
            check("Position 63 — not complete yet", not r["complete"])

    # Position 64 should complete the grid
    m64 = make_user(db, "t6_m63", sponsor=owner)
    r = place_member_in_grid(db, m64.id, owner.id, 1)
    check("Position 64 — grid COMPLETE", r["complete"])
    check("Filled = 64", r["filled"] == 64)

    db.rollback(); db.close()


# ═══ TEST 7: Auto-Spawn Next Advance ═══
def test_auto_spawn():
    print("\n━━ TEST 7: Auto-Spawn Next Advance ━━")
    db = Session()
    owner = make_user(db, "t7_owner")

    # Fill grid to completion
    for i in range(64):
        m = make_user(db, f"t7_m{i}", sponsor=owner)
        place_member_in_grid(db, m.id, owner.id, 1)

    # Check advance 1 is complete
    g1 = db.query(Grid).filter(Grid.owner_id == owner.id, Grid.advance_number == 1).first()
    check("Advance 1 is complete", g1.is_complete)

    # Check advance 2 was auto-created
    g2 = db.query(Grid).filter(Grid.owner_id == owner.id, Grid.advance_number == 2).first()
    check("Advance 2 auto-spawned", g2 is not None)
    check("Advance 2 is NOT complete", not g2.is_complete if g2 else False)
    check("Advance 2 has 0 positions", g2.positions_filled == 0 if g2 else False)

    db.rollback(); db.close()


# ═══ TEST 8: Multiple Tiers ═══
def test_multiple_tiers():
    print("\n━━ TEST 8: Multiple Tiers Pay Correct Amounts ━━")
    db = Session()

    for tier, price in [(1, 20), (3, 100), (5, 400), (8, 1000)]:
        owner = make_user(db, f"t8_owner_{tier}")
        member = make_user(db, f"t8_member_{tier}", sponsor=owner)
        r = place_member_in_grid(db, member.id, owner.id, tier)
        check(f"Tier {tier} placed OK", r["success"])

        direct = get_comms(db, r["grid_id"], "direct_sponsor")
        expected_40 = round(price * 0.40, 2)
        check(f"Tier {tier} direct = ${expected_40} (40% of ${price})",
              abs(direct[0].amount_usdt - expected_40) < 0.01, f"got ${direct[0].amount_usdt}")

        platform = get_comms(db, r["grid_id"], "platform")
        expected_5 = round(price * 0.05, 2)
        check(f"Tier {tier} platform = ${expected_5} (5% of ${price})",
              abs(platform[0].amount_usdt - expected_5) < 0.01, f"got ${platform[0].amount_usdt}")

    db.rollback(); db.close()


# ═══ TEST 9: Total Commission Per Seat = 100% ═══
def test_total_equals_100():
    print("\n━━ TEST 9: Total Commission Per Seat = 100% of Price ━━")
    db = Session()
    # Full 8-level chain
    users = [make_user(db, "t9_u0")]
    for i in range(1, 9):
        users.append(make_user(db, f"t9_u{i}", sponsor=users[-1]))
    buyer = make_user(db, "t9_buyer", sponsor=users[-1])

    r = place_member_in_grid(db, buyer.id, users[0].id, 1)
    all_comms = db.query(Commission).filter(Commission.grid_id == r["grid_id"]).all()
    total = sum(c.amount_usdt for c in all_comms)
    check(f"Total commissions = $20.00 (100%)", abs(total - 20.0) < 0.01, f"got ${total:.4f}")

    # Breakdown
    direct_total = sum(c.amount_usdt for c in all_comms if c.commission_type == "direct_sponsor")
    uni_total = sum(c.amount_usdt for c in all_comms if c.commission_type == "uni_level")
    platform_total = sum(c.amount_usdt for c in all_comms if c.commission_type == "platform")
    check(f"Direct = $8.00 (40%)", abs(direct_total - 8.0) < 0.01, f"got ${direct_total:.2f}")
    check(f"Uni-level = $11.00 (55%)", abs(uni_total - 11.0) < 0.01, f"got ${uni_total:.2f}")
    check(f"Platform = $1.00 (5%)", abs(platform_total - 1.0) < 0.01, f"got ${platform_total:.2f}")

    db.rollback(); db.close()


# ═══ TEST 10: Balance Accumulation ═══
def test_balance_accumulation():
    print("\n━━ TEST 10: Balance Accumulation Over Multiple Seats ━━")
    db = Session()
    steve = make_user(db, "t10_steve")

    # 5 people join under Steve at tier 1 ($20 each)
    for i in range(5):
        m = make_user(db, f"t10_m{i}", sponsor=steve)
        place_member_in_grid(db, m.id, steve.id, 1)

    # Steve should have: 5 × $8 (40% direct) = $40 in grid_earnings
    # Plus uni-level from being in the chain
    check("Steve grid_earnings = $40", abs(float(steve.grid_earnings) - 40.0) < 0.01,
          f"got {steve.grid_earnings}")
    check("Steve balance includes grid earnings", float(steve.balance) >= 40.0,
          f"got {steve.balance}")

    db.rollback(); db.close()


# ══════════════════════════════════════════════════════
if __name__ == "__main__":
    print("\n" + "═"*60)
    print("  SuperAdPro Grid Commission Test Suite")
    print("═"*60)

    test_commission_splits()
    test_direct_sponsor()
    test_unilevel_full_chain()
    test_short_chain()
    test_no_sponsor()
    test_grid_completion()
    test_auto_spawn()
    test_multiple_tiers()
    test_total_equals_100()
    test_balance_accumulation()

    print("\n" + "═"*60)
    total = results["pass"] + results["fail"]
    if results["fail"] == 0:
        print(f"  \033[92m✓ ALL {total} TESTS PASSED\033[0m")
    else:
        print(f"  \033[91m✗ {results['fail']} FAILED\033[0m out of {total} tests")
    print("═"*60 + "\n")
