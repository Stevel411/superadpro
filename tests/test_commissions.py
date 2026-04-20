"""
SuperAdPro Commission Test Suite
=================================
Run: python tests/test_commissions.py
"""

import sys, os

# ── Patch database module before import ──
# We need to prevent app/database.py from connecting to the real DB
# So we monkey-patch the engine creation

import importlib
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime

# Create test engine and base
test_engine = create_engine("sqlite:///:memory:")
TestBase = declarative_base()

# Now patch os.environ so database.py doesn't crash, then import what we need
# But since database.py hardcodes engine params incompatible with sqlite,
# we'll directly import only the models we need by exec'ing the course_engine

# Instead, let's just recreate the minimal models we need for testing:

class User(TestBase):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    email = Column(String)
    password = Column(String)
    sponsor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    pass_up_sponsor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    course_sale_count = Column(Integer, default=0)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    balance = Column(Float, default=0.0)
    total_earned = Column(Float, default=0.0)
    course_earnings = Column(Float, default=0.0)
    upline_earnings = Column(Float, default=0.0)
    personal_referrals = Column(Integer, default=0)
    total_team = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Course(TestBase):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True)
    title = Column(String)
    slug = Column(String)
    description = Column(Text, nullable=True)
    price = Column(Float)
    tier = Column(Integer)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    thumbnail_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class CoursePurchase(TestBase):
    __tablename__ = "course_purchases"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    course_tier = Column(Integer)
    amount_paid = Column(Float)
    payment_method = Column(String, default="wallet")
    tx_ref = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class CourseCommission(TestBase):
    __tablename__ = "course_commissions"
    id = Column(Integer, primary_key=True)
    purchase_id = Column(Integer, ForeignKey("course_purchases.id"))
    buyer_id = Column(Integer, ForeignKey("users.id"))
    earner_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    course_tier = Column(Integer)
    commission_type = Column(String)
    pass_up_depth = Column(Integer, default=0)
    source_chain = Column(Integer, nullable=True)  # Income Chain (1-4), NULL for direct sales
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
TestBase.metadata.create_all(test_engine)
Session = sessionmaker(bind=test_engine)

# ── Patch app.database so course_engine uses our test models ──
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import types
mock_db = types.ModuleType("app.database")
mock_db.User = User
mock_db.Course = Course
mock_db.CoursePurchase = CoursePurchase
mock_db.CourseCommission = CourseCommission
sys.modules["app.database"] = mock_db

from app.course_engine import (
    process_course_purchase, assign_passup_sponsor,
    PASSUP_POSITIONS, is_passup_sale
)


# ═══ Test Helpers ═══
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

def make_user(db, username, sponsor=None, is_admin=False, balance=10000):
    u = User(username=username, email=f"{username}@test.com", password="x",
             is_admin=is_admin, is_active=True, balance=balance,
             total_earned=0, course_earnings=0, upline_earnings=0,
             personal_referrals=0, total_team=0, course_sale_count=0,
             sponsor_id=sponsor.id if sponsor else None)
    db.add(u); db.flush()
    if sponsor:
        assign_passup_sponsor(db, u, sponsor)
        db.flush()
    return u

def make_course(db, title, price, tier):
    c = Course(title=title, slug=title.lower().replace(" ","-"), price=price, tier=tier, is_active=True, sort_order=tier)
    db.add(c); db.flush()
    return c

def own_course(db, user, course):
    db.add(CoursePurchase(user_id=user.id, course_id=course.id, course_tier=course.tier, amount_paid=0, payment_method="test"))
    db.flush()


# ══════════════════════════════════════════════════════
# TESTS
# ══════════════════════════════════════════════════════

def test_passup_positions():
    print("\n━━ TEST 1: Pass-Up Position Logic ━━")
    check("Sale 1 KEPT", not is_passup_sale(1))
    check("Sale 2 PASS-UP", is_passup_sale(2))
    check("Sale 3 KEPT", not is_passup_sale(3))
    check("Sale 4 PASS-UP", is_passup_sale(4))
    check("Sale 5 KEPT", not is_passup_sale(5))
    check("Sale 6 PASS-UP", is_passup_sale(6))
    check("Sale 7 KEPT", not is_passup_sale(7))
    check("Sale 8 PASS-UP", is_passup_sale(8))
    check("Sale 9 KEPT", not is_passup_sale(9))
    check("Sale 10 KEPT", not is_passup_sale(10))
    check("Sale 100 KEPT", not is_passup_sale(100))

def test_passup_sponsor_assignment():
    print("\n━━ TEST 2: Pass-Up Sponsor Assignment ━━")
    db = Session()
    admin = make_user(db, "t2_admin", is_admin=True)
    steve = make_user(db, "t2_steve")
    steve.pass_up_sponsor_id = admin.id; db.flush()

    a = make_user(db, "t2_a", sponsor=steve)  # 1st
    b = make_user(db, "t2_b", sponsor=steve)  # 2nd
    c = make_user(db, "t2_c", sponsor=steve)  # 3rd
    d = make_user(db, "t2_d", sponsor=steve)  # 4th

    check("1st ref → pass-up = Steve", a.pass_up_sponsor_id == steve.id)
    check("2nd ref → pass-up = admin", b.pass_up_sponsor_id == admin.id, f"got {b.pass_up_sponsor_id}")
    check("3rd ref → pass-up = Steve", c.pass_up_sponsor_id == steve.id)
    check("4th ref → pass-up = admin", d.pass_up_sponsor_id == admin.id)

    # Deeper level
    a1 = make_user(db, "t2_a1", sponsor=a)  # a's 1st
    a2 = make_user(db, "t2_a2", sponsor=a)  # a's 2nd → a's pass-up = steve
    check("Depth 2: a's 1st → pass-up = a", a1.pass_up_sponsor_id == a.id)
    check("Depth 2: a's 2nd → pass-up = Steve", a2.pass_up_sponsor_id == steve.id, f"got {a2.pass_up_sponsor_id}")
    db.rollback(); db.close()

def test_direct_sale():
    print("\n━━ TEST 3: Direct Sale — Sponsor Keeps 100% ━━")
    db = Session()
    admin = make_user(db, "t3_admin", is_admin=True)
    steve = make_user(db, "t3_steve"); steve.pass_up_sponsor_id = admin.id
    c = make_course(db, "t3-starter", 100, 1)
    own_course(db, steve, c)
    buyer = make_user(db, "t3_buyer", sponsor=steve)
    r = process_course_purchase(db, buyer.id, c.id, payment_method="wallet")
    check("Success", r["success"])
    check("Steve earns $100", r["commission"]["earner_username"]=="t3_steve" and r["commission"]["amount"]==100)
    check("Type = direct_sale", r["commission"]["type"]=="direct_sale")
    db.rollback(); db.close()

def test_passup_sale():
    print("\n━━ TEST 4: Pass-Up Sales ━━")
    db = Session()
    admin = make_user(db, "t4_admin", is_admin=True)
    steve = make_user(db, "t4_steve"); steve.pass_up_sponsor_id = admin.id
    alice = make_user(db, "t4_alice", sponsor=steve)
    c = make_course(db, "t4-starter", 100, 1)
    own_course(db, steve, c); own_course(db, alice, c)

    b1 = make_user(db, "t4_b1", sponsor=alice)
    r1 = process_course_purchase(db, b1.id, c.id, payment_method="wallet")
    check("Sale #1 → Alice keeps", r1["commission"]["earner_username"]=="t4_alice")

    b2 = make_user(db, "t4_b2", sponsor=alice)
    r2 = process_course_purchase(db, b2.id, c.id, payment_method="wallet")
    check("Sale #2 → passes to Steve", r2["commission"]["earner_username"]=="t4_steve", f"got {r2['commission']['earner_username']}")

    b3 = make_user(db, "t4_b3", sponsor=alice)
    r3 = process_course_purchase(db, b3.id, c.id, payment_method="wallet")
    check("Sale #3 → Alice keeps", r3["commission"]["earner_username"]=="t4_alice")

    b4 = make_user(db, "t4_b4", sponsor=alice)
    r4 = process_course_purchase(db, b4.id, c.id, payment_method="wallet")
    check("Sale #4 → passes to Steve", r4["commission"]["earner_username"]=="t4_steve")
    db.rollback(); db.close()

def test_fomo_direct():
    print("\n━━ TEST 5: FOMO — Unqualified Sponsor → Company ━━")
    db = Session()
    admin = make_user(db, "t5_admin", is_admin=True)
    steve = make_user(db, "t5_steve"); steve.pass_up_sponsor_id = admin.id
    c2 = make_course(db, "t5-adv", 300, 2)
    # Steve does NOT own tier 2
    buyer = make_user(db, "t5_buyer", sponsor=steve)
    r = process_course_purchase(db, buyer.id, c2.id, payment_method="wallet")
    check("Commission to platform", r["commission"]["type"]=="platform", f"got {r['commission']['type']}")
    check("Steve did NOT earn", r["commission"]["earner_username"]!="t5_steve")
    db.rollback(); db.close()

def test_fomo_passup():
    print("\n━━ TEST 6: FOMO — Unqualified Pass-Up Sponsor, Cascade Walks Up ━━")
    db = Session()
    admin = make_user(db, "t6_admin", is_admin=True)
    steve = make_user(db, "t6_steve"); steve.pass_up_sponsor_id = admin.id
    alice = make_user(db, "t6_alice", sponsor=steve)
    c2 = make_course(db, "t6-adv", 300, 2)
    own_course(db, alice, c2)
    # Steve does NOT own tier 2 — pass-up should walk past him to admin

    b1 = make_user(db, "t6_b1", sponsor=alice)
    process_course_purchase(db, b1.id, c2.id, payment_method="wallet")

    b2 = make_user(db, "t6_b2", sponsor=alice)
    r2 = process_course_purchase(db, b2.id, c2.id, payment_method="wallet")
    # Production behaviour: cascade walks Steve (unqualified) → admin (qualified as admin)
    # Commission is pass_up to admin, NOT to platform
    check("Pass-up cascades past unqualified Steve to admin",
          r2["commission"]["type"]=="pass_up", f"got {r2['commission']['type']}")
    check("Admin receives the cascaded commission",
          r2["commission"]["earner_username"]=="t6_admin",
          f"got {r2['commission'].get('earner_username')}")
    db.rollback(); db.close()

def test_infinite_cascade():
    print("\n━━ TEST 7: Infinite Cascade — 3-4 Levels Deep ━━")
    db = Session()
    admin = make_user(db, "t7_admin", is_admin=True)
    steve = make_user(db, "t7_steve"); steve.pass_up_sponsor_id = admin.id
    c = make_course(db, "t7-starter", 100, 1)
    own_course(db, steve, c)

    alice = make_user(db, "t7_alice", sponsor=steve); own_course(db, alice, c)
    a_r1 = make_user(db, "t7_ar1", sponsor=alice)  # Alice 1st
    carol = make_user(db, "t7_carol", sponsor=alice); own_course(db, carol, c)  # Alice 2nd
    check("Carol pass-up = Steve", carol.pass_up_sponsor_id == steve.id)

    c_b1 = make_user(db, "t7_cb1", sponsor=carol)
    process_course_purchase(db, c_b1.id, c.id, payment_method="wallet")
    c_b2 = make_user(db, "t7_cb2", sponsor=carol)
    r = process_course_purchase(db, c_b2.id, c.id, payment_method="wallet")
    check("Carol pass-up → Steve (3 levels)", r["commission"]["earner_username"]=="t7_steve", f"got {r['commission']['earner_username']}")

    c_r1 = make_user(db, "t7_cr1", sponsor=carol)
    grace = make_user(db, "t7_grace", sponsor=carol); own_course(db, grace, c)
    check("Grace pass-up = Steve (4 levels)", grace.pass_up_sponsor_id == steve.id)

    g_b1 = make_user(db, "t7_gb1", sponsor=grace)
    process_course_purchase(db, g_b1.id, c.id, payment_method="wallet")
    g_b2 = make_user(db, "t7_gb2", sponsor=grace)
    r2 = process_course_purchase(db, g_b2.id, c.id, payment_method="wallet")
    check("Grace pass-up → Steve (4 levels)", r2["commission"]["earner_username"]=="t7_steve")
    db.rollback(); db.close()

def test_no_sponsor():
    print("\n━━ TEST 8: No Sponsor → Platform ━━")
    db = Session()
    admin = make_user(db, "t8_admin", is_admin=True)
    c = make_course(db, "t8-starter", 100, 1)
    buyer = make_user(db, "t8_buyer")
    r = process_course_purchase(db, buyer.id, c.id, payment_method="wallet")
    check("Commission to platform", r["commission"]["type"]=="platform")
    db.rollback(); db.close()

def test_all_tiers():
    print("\n━━ TEST 9: All Three Tiers ━━")
    db = Session()
    admin = make_user(db, "t9_admin", is_admin=True)
    c1 = make_course(db, "t9-s", 100, 1); c2 = make_course(db, "t9-a", 300, 2); c3 = make_course(db, "t9-e", 500, 3)
    # Use a fresh sponsor per tier so sale counters don't cross-contaminate
    for co, exp in [(c1,100),(c2,300),(c3,500)]:
        sponsor = make_user(db, f"t9_sp{co.tier}"); sponsor.pass_up_sponsor_id = admin.id; db.flush()
        own_course(db, sponsor, co)
        b = make_user(db, f"t9_b{co.tier}", sponsor=sponsor)
        r = process_course_purchase(db, b.id, co.id, payment_method="wallet")
        check(f"Tier {co.tier} → ${exp}", r["commission"]["amount"]==exp and r["commission"]["earner_username"]==f"t9_sp{co.tier}")
    db.rollback(); db.close()

def test_sale_9_onwards():
    print("\n━━ TEST 10: Sale 9+ Always Kept ━━")
    db = Session()
    admin = make_user(db, "t10_admin", is_admin=True)
    steve = make_user(db, "t10_steve"); steve.pass_up_sponsor_id = admin.id
    alice = make_user(db, "t10_alice", sponsor=steve)
    c = make_course(db, "t10-s", 100, 1)
    own_course(db, alice, c); own_course(db, steve, c)
    for i in range(1, 13):
        b = make_user(db, f"t10_b{i}", sponsor=alice)
        r = process_course_purchase(db, b.id, c.id, payment_method="wallet")
        if i >= 9:
            check(f"Sale #{i} → Alice keeps", r["commission"]["earner_username"]=="t10_alice")
    db.rollback(); db.close()

def test_wallet():
    print("\n━━ TEST 11: Wallet Deduction ━━")
    db = Session()
    admin = make_user(db, "t11_admin", is_admin=True)
    steve = make_user(db, "t11_steve")
    c = make_course(db, "t11-s", 100, 1)
    b = make_user(db, "t11_buyer", sponsor=steve, balance=250)
    process_course_purchase(db, b.id, c.id, payment_method="wallet")
    check("Balance = $150", float(b.balance)==150.0, f"got {b.balance}")
    poor = make_user(db, "t11_poor", sponsor=steve, balance=50)
    r = process_course_purchase(db, poor.id, c.id, payment_method="wallet")
    check("Insufficient rejected", not r["success"])
    db.rollback(); db.close()

def test_duplicate():
    print("\n━━ TEST 12: Duplicate Blocked ━━")
    db = Session()
    admin = make_user(db, "t12_admin", is_admin=True)
    c = make_course(db, "t12-s", 100, 1)
    b = make_user(db, "t12_buyer", balance=10000)
    r1 = process_course_purchase(db, b.id, c.id, payment_method="wallet")
    check("First OK", r1["success"])
    r2 = process_course_purchase(db, b.id, c.id, payment_method="wallet")
    check("Duplicate blocked", not r2["success"])
    db.rollback(); db.close()


if __name__ == "__main__":
    print("\n" + "═"*60)
    print("  SuperAdPro Commission Test Suite")
    print("═"*60)

    test_passup_positions()
    test_passup_sponsor_assignment()
    test_direct_sale()
    test_passup_sale()
    test_fomo_direct()
    test_fomo_passup()
    test_infinite_cascade()
    test_no_sponsor()
    test_all_tiers()
    test_sale_9_onwards()
    test_wallet()
    test_duplicate()

    print("\n" + "═"*60)
    total = results["pass"] + results["fail"]
    if results["fail"] == 0:
        print(f"  \033[92m✓ ALL {total} TESTS PASSED\033[0m")
    else:
        print(f"  \033[91m✗ {results['fail']} FAILED\033[0m out of {total} tests")
    print("═"*60 + "\n")
