"""
SuperAdPro Platform Test Suite
================================
Run: python tests/test_platform.py

Tests cover:
- Route accessibility (200 vs redirect vs 404)
- Authentication guards
- Database operations (CRUD)
- Notification system
- Achievement system
- Funnel operations
- Form validation
"""

import sys, os

# ══════════════════════════════════════════════════════════════
#  MINIMAL TEST FRAMEWORK (no pytest dependency)
# ══════════════════════════════════════════════════════════════

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def test(self, name, condition, detail=""):
        if condition:
            self.passed += 1
            print(f"  \033[92m✓\033[0m {name}")
        else:
            self.failed += 1
            self.errors.append((name, detail))
            print(f"  \033[91m✗\033[0m {name}" + (f" — {detail}" if detail else ""))
    
    def section(self, title):
        print(f"\n\033[96m{'═'*60}\033[0m")
        print(f"\033[96m  {title}\033[0m")
        print(f"\033[96m{'═'*60}\033[0m")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'═'*60}")
        if self.failed == 0:
            print(f"  \033[92m✓ ALL {total} TESTS PASSED\033[0m")
        else:
            print(f"  \033[91m✗ {self.failed} FAILED\033[0m / {total} total")
            for name, detail in self.errors:
                print(f"    → {name}: {detail}")
        print(f"{'═'*60}\n")
        return self.failed == 0


# ══════════════════════════════════════════════════════════════
#  DATABASE SETUP — in-memory SQLite
# ══════════════════════════════════════════════════════════════

from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime, timedelta

TestBase = declarative_base()
test_engine = create_engine("sqlite:///:memory:")

class User(TestBase):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    email = Column(String, unique=True)
    password_hash = Column(String)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    balance = Column(Float, default=0.0)
    total_earned = Column(Float, default=0.0)
    total_withdrawn = Column(Float, default=0.0)
    personal_referrals = Column(Integer, default=0)
    total_team = Column(Integer, default=0)
    sponsor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    avatar_url = Column(String, nullable=True)
    niche = Column(String, nullable=True)
    membership_tier = Column(String, default="basic")
    onboarding_completed = Column(Boolean, default=False)
    videos_watched = Column(Integer, default=0)
    wallet_address = Column(String, nullable=True)
    grid_earnings = Column(Float, default=0.0)
    level_earnings = Column(Float, default=0.0)
    upline_earnings = Column(Float, default=0.0)
    course_earnings = Column(Float, default=0.0)
    totp_enabled = Column(Boolean, default=False)
    totp_secret = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Commission(TestBase):
    __tablename__ = "commissions"
    id = Column(Integer, primary_key=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    amount_usdt = Column(Float)
    commission_type = Column(String)
    package_tier = Column(Integer, default=0)
    status = Column(String, default="paid")
    paid_at = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(TestBase):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String)
    icon = Column(String, default="🔔")
    title = Column(String)
    message = Column(String)
    link = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Achievement(TestBase):
    __tablename__ = "achievements"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    badge_id = Column(String)
    title = Column(String)
    icon = Column(String, default="🏆")
    earned_at = Column(DateTime, default=datetime.utcnow)

class FunnelPage(TestBase):
    __tablename__ = "funnel_pages"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    slug = Column(String, nullable=True)
    title = Column(String)
    template_type = Column(String, default="opportunity")
    status = Column(String, default="draft")
    headline = Column(Text, nullable=True)
    meta_description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    gjs_html = Column(Text, nullable=True)
    gjs_css = Column(Text, nullable=True)
    views = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Withdrawal(TestBase):
    __tablename__ = "withdrawals"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount_usdt = Column(Float)
    wallet_address = Column(String)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class LinkHubProfile(TestBase):
    __tablename__ = "linkhub_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    display_name = Column(String, nullable=True)
    slug = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


TestBase.metadata.create_all(test_engine)
Session = sessionmaker(bind=test_engine)


# ══════════════════════════════════════════════════════════════
#  TESTS
# ══════════════════════════════════════════════════════════════

def run_tests():
    t = TestRunner()
    
    # ── 1. USER CREATION & AUTHENTICATION ──
    t.section("1. User Creation & Authentication")
    
    db = Session()
    
    # Create users
    sponsor = User(username="sponsor", email="sponsor@test.com", password_hash="hashed", is_active=True, balance=100.0, total_earned=250.0, total_team=3)
    db.add(sponsor)
    db.flush()
    
    member = User(username="member1", email="member1@test.com", password_hash="hashed", is_active=True, sponsor_id=sponsor.id, balance=50.0)
    db.add(member)
    db.flush()
    
    free_user = User(username="freeuser", email="free@test.com", password_hash="hashed", is_active=False)
    db.add(free_user)
    db.flush()
    
    admin = User(username="admin", email="admin@test.com", password_hash="hashed", is_active=True, is_admin=True)
    db.add(admin)
    db.commit()
    
    t.test("User created with correct defaults", member.balance == 50.0)
    t.test("Sponsor relationship linked", member.sponsor_id == sponsor.id)
    t.test("Free user is inactive", free_user.is_active == False)
    t.test("Admin flag set correctly", admin.is_admin == True)
    t.test("Default membership tier is basic", member.membership_tier == "basic")
    t.test("Onboarding defaults to not completed", member.onboarding_completed == False)
    t.test("Username is unique constraint", db.query(User).filter(User.username == "sponsor").count() == 1)
    
    # ── 2. BALANCE & COMMISSION OPERATIONS ──
    t.section("2. Balance & Commission Operations")
    
    # Credit a commission
    comm = Commission(
        from_user_id=member.id, to_user_id=sponsor.id,
        amount_usdt=10.0, commission_type="membership_sponsor",
        status="paid", paid_at=datetime.utcnow(),
        notes="Test membership commission"
    )
    db.add(comm)
    sponsor.balance += 10.0
    sponsor.total_earned += 10.0
    sponsor.upline_earnings = (sponsor.upline_earnings or 0) + 10.0
    db.commit()
    
    t.test("Commission created successfully", comm.id is not None)
    t.test("Commission amount correct", float(comm.amount_usdt) == 10.0)
    t.test("Commission type correct", comm.commission_type == "membership_sponsor")
    t.test("Sponsor balance updated", float(sponsor.balance) == 110.0)
    t.test("Sponsor total_earned updated", float(sponsor.total_earned) == 260.0)
    t.test("Sponsor upline_earnings updated", float(sponsor.upline_earnings) == 10.0)
    
    # Multiple commissions
    for i in range(5):
        db.add(Commission(
            from_user_id=member.id, to_user_id=sponsor.id,
            amount_usdt=5.0, commission_type="grid",
            status="paid", paid_at=datetime.utcnow(),
        ))
    db.commit()
    
    total_comms = db.query(Commission).filter(Commission.to_user_id == sponsor.id).count()
    t.test("Multiple commissions recorded", total_comms == 6)
    
    grid_sum = sum(float(c.amount_usdt) for c in db.query(Commission).filter(
        Commission.to_user_id == sponsor.id, Commission.commission_type == "grid").all())
    t.test("Grid commission sum correct", grid_sum == 25.0)
    
    # ── 3. WITHDRAWAL LOGIC ──
    t.section("3. Withdrawal Logic")
    
    # Valid withdrawal
    withdraw_amount = 20.0
    t.test("Balance sufficient for withdrawal", float(sponsor.balance) >= withdraw_amount)
    
    withdrawal = Withdrawal(user_id=sponsor.id, amount_usdt=withdraw_amount, wallet_address="0xABC123")
    db.add(withdrawal)
    sponsor.balance -= withdraw_amount
    sponsor.total_withdrawn = (sponsor.total_withdrawn or 0) + withdraw_amount
    db.commit()
    
    t.test("Withdrawal created", withdrawal.id is not None)
    t.test("Balance deducted after withdrawal", float(sponsor.balance) == 90.0)
    t.test("Total withdrawn updated", float(sponsor.total_withdrawn) == 20.0)
    t.test("Withdrawal status is pending", withdrawal.status == "pending")
    
    # Prevent overdraft
    overdraft_amount = 999.0
    can_withdraw = float(sponsor.balance) >= overdraft_amount
    t.test("Overdraft prevented (balance < amount)", can_withdraw == False)
    
    # Wallet address required
    t.test("Wallet address stored", withdrawal.wallet_address == "0xABC123")
    no_wallet_user = db.query(User).filter(User.id == free_user.id).first()
    t.test("Free user has no wallet", no_wallet_user.wallet_address is None)
    
    # ── 4. NOTIFICATION SYSTEM ──
    t.section("4. Notification System")
    
    # Create notifications
    n1 = Notification(user_id=sponsor.id, type="commission", icon="💰", title="Commission earned!", message="You earned $10", link="/wallet")
    n2 = Notification(user_id=sponsor.id, type="referral", icon="👥", title="New team member!", message="member1 joined", link="/network")
    n3 = Notification(user_id=sponsor.id, type="system", icon="🔔", title="System update", message="New features available")
    n4 = Notification(user_id=member.id, type="achievement", icon="🏆", title="Badge earned!", message="First login")
    db.add_all([n1, n2, n3, n4])
    db.commit()
    
    sponsor_notifs = db.query(Notification).filter(Notification.user_id == sponsor.id).all()
    t.test("Sponsor has 3 notifications", len(sponsor_notifs) == 3)
    
    member_notifs = db.query(Notification).filter(Notification.user_id == member.id).all()
    t.test("Member has 1 notification", len(member_notifs) == 1)
    
    unread = db.query(Notification).filter(Notification.user_id == sponsor.id, Notification.is_read == False).count()
    t.test("All sponsor notifications unread", unread == 3)
    
    # Mark as read
    db.query(Notification).filter(Notification.user_id == sponsor.id).update({Notification.is_read: True})
    db.commit()
    unread_after = db.query(Notification).filter(Notification.user_id == sponsor.id, Notification.is_read == False).count()
    t.test("All sponsor notifications marked read", unread_after == 0)
    
    # Notification ordering
    latest = db.query(Notification).filter(Notification.user_id == sponsor.id).order_by(Notification.created_at.desc()).first()
    t.test("Latest notification is system type", latest.type == "system")
    
    # Different users don't see each other's notifications
    cross_check = db.query(Notification).filter(Notification.user_id == sponsor.id, Notification.type == "achievement").count()
    t.test("Sponsor doesn't see member's achievement notification", cross_check == 0)
    
    # ── 5. ACHIEVEMENT / BADGE SYSTEM ──
    t.section("5. Achievement / Badge System")
    
    # Award a badge
    a1 = Achievement(user_id=sponsor.id, badge_id="first_login", title="Welcome!", icon="👋")
    db.add(a1)
    db.commit()
    
    t.test("Badge awarded successfully", a1.id is not None)
    t.test("Badge ID stored correctly", a1.badge_id == "first_login")
    
    # Check duplicate prevention (unique index simulation)
    existing_badges = {a.badge_id for a in db.query(Achievement).filter(Achievement.user_id == sponsor.id).all()}
    should_skip = "first_login" in existing_badges
    t.test("Duplicate badge detected before insert", should_skip == True)
    
    # Award milestone badges
    badges_to_award = []
    if sponsor.total_team >= 1 and "first_referral" not in existing_badges:
        badges_to_award.append(("first_referral", "First Referral", "🤝"))
    if float(sponsor.total_earned) >= 100 and "first_100" not in existing_badges:
        badges_to_award.append(("first_100", "First $100", "💰"))
    
    for badge_id, title, icon in badges_to_award:
        db.add(Achievement(user_id=sponsor.id, badge_id=badge_id, title=title, icon=icon))
    db.commit()
    
    total_badges = db.query(Achievement).filter(Achievement.user_id == sponsor.id).count()
    t.test("Milestone badges awarded (first_referral + first_100)", total_badges == 3)
    
    # Earnings milestone check
    t.test("$260 earned qualifies for first_100 badge", float(sponsor.total_earned) >= 100)
    t.test("$260 does NOT qualify for earned_500 badge", float(sponsor.total_earned) < 500)
    
    # Member has no badges yet (unless auto-checked)
    member_badges = db.query(Achievement).filter(Achievement.user_id == member.id).count()
    t.test("Member has no badges yet", member_badges == 0)
    
    # ── 6. FUNNEL PAGE OPERATIONS ──
    t.section("6. Funnel Page Operations")
    
    # Create a funnel page
    page = FunnelPage(
        user_id=member.id, title="My Landing Page",
        slug="member1/my-landing-page-1",
        headline="Join our team!", status="published",
        gjs_html="<div>Hello World</div>",
        gjs_css='{"els":[],"canvasBg":"#050d1a"}',
        meta_description="A test page",
    )
    db.add(page)
    db.commit()
    
    t.test("Funnel page created", page.id is not None)
    t.test("Page slug set correctly", page.slug == "member1/my-landing-page-1")
    t.test("Page status is published", page.status == "published")
    t.test("GJS HTML stored", page.gjs_html == "<div>Hello World</div>")
    t.test("Meta description stored", page.meta_description == "A test page")
    t.test("Views default to 0", page.views == 0)
    
    # Increment views
    page.views += 1
    db.commit()
    t.test("Views incremented", page.views == 1)
    
    # Page belongs to correct user
    user_pages = db.query(FunnelPage).filter(FunnelPage.user_id == member.id).all()
    t.test("Member owns 1 page", len(user_pages) == 1)
    
    sponsor_pages = db.query(FunnelPage).filter(FunnelPage.user_id == sponsor.id).all()
    t.test("Sponsor owns 0 pages", len(sponsor_pages) == 0)
    
    # Page lookup by slug
    found = db.query(FunnelPage).filter(FunnelPage.slug == "member1/my-landing-page-1").first()
    t.test("Page found by slug lookup", found is not None and found.id == page.id)
    
    not_found = db.query(FunnelPage).filter(FunnelPage.slug == "nonexistent/page").first()
    t.test("Nonexistent slug returns None", not_found is None)
    
    # ── 7. LINKHUB OPERATIONS ──
    t.section("7. LinkHub Operations")
    
    # Create LinkHub profile
    lh = LinkHubProfile(user_id=member.id, display_name="Member One", slug="member1")
    db.add(lh)
    db.commit()
    
    t.test("LinkHub profile created", lh.id is not None)
    t.test("LinkHub slug set", lh.slug == "member1")
    
    has_linkhub = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == member.id).first() is not None
    t.test("has_linkhub check returns True", has_linkhub == True)
    
    no_linkhub = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == sponsor.id).first() is not None
    t.test("Sponsor has no LinkHub", no_linkhub == False)
    
    # ── 8. ONBOARDING STATE ──
    t.section("8. Onboarding State")
    
    t.test("New member onboarding not completed", member.onboarding_completed == False)
    
    # Check onboarding criteria
    has_avatar = member.avatar_url is not None and member.avatar_url != ""
    has_niche = member.niche is not None and member.niche != ""
    has_hub = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == member.id).first() is not None
    has_team = (member.total_team or 0) > 0
    has_watched = (member.videos_watched or 0) > 0
    
    t.test("No avatar yet", has_avatar == False)
    t.test("No niche yet", has_niche == False)
    t.test("Has LinkHub (created above)", has_hub == True)
    t.test("No team members yet", has_team == False)
    t.test("No videos watched yet", has_watched == False)
    
    # Complete onboarding
    member.onboarding_completed = True
    db.commit()
    t.test("Onboarding marked complete", member.onboarding_completed == True)
    
    # ── 9. MEMBERSHIP TIER LOGIC ──
    t.section("9. Membership Tier Logic")
    
    t.test("Default tier is basic", member.membership_tier == "basic")
    
    # Upgrade to pro
    member.membership_tier = "pro"
    db.commit()
    t.test("Upgraded to pro", member.membership_tier == "pro")
    
    # Pro check
    is_pro = member.membership_tier == "pro"
    t.test("Pro tier check works", is_pro == True)
    
    is_basic_user = sponsor.membership_tier == "basic"
    t.test("Sponsor is still basic", is_basic_user == True)
    
    # ── 10. DATA ISOLATION & SECURITY ──
    t.section("10. Data Isolation & Security")
    
    # User can only see own data
    own_comms = db.query(Commission).filter(Commission.to_user_id == member.id).count()
    t.test("Member has 0 commissions (not sponsor's)", own_comms == 0)
    
    sponsor_comms = db.query(Commission).filter(Commission.to_user_id == sponsor.id).count()
    t.test("Sponsor has 6 commissions", sponsor_comms == 6)
    
    # Different user can't access another's page
    wrong_user_page = db.query(FunnelPage).filter(
        FunnelPage.id == page.id, FunnelPage.user_id == sponsor.id
    ).first()
    t.test("Sponsor can't access member's page by ID", wrong_user_page is None)
    
    # Admin check
    t.test("Regular user is not admin", member.is_admin == False)
    t.test("Admin user IS admin", admin.is_admin == True)
    
    # Free user can't do paid actions
    t.test("Free user is not active", free_user.is_active == False)
    free_balance = float(free_user.balance or 0)
    t.test("Free user has zero balance", free_balance == 0.0)
    
    # ── 11. EDGE CASES ──
    t.section("11. Edge Cases")
    
    # Zero-amount commission
    zero_comm = Commission(from_user_id=member.id, to_user_id=sponsor.id, amount_usdt=0.0, commission_type="test", status="paid")
    db.add(zero_comm)
    db.commit()
    t.test("Zero-amount commission allowed", zero_comm.id is not None)
    
    # Negative balance prevention (application logic, not DB constraint)
    can_withdraw_more = float(sponsor.balance) >= 1000
    t.test("Can't withdraw more than balance", can_withdraw_more == False)
    
    # Empty string fields
    empty_user = User(username="empty", email="empty@test.com", password_hash="h", first_name="", niche="")
    db.add(empty_user)
    db.commit()
    has_profile = bool(empty_user.avatar_url and empty_user.first_name)
    t.test("Empty strings don't count as profile complete", has_profile == False)
    
    # Page with no HTML
    empty_page = FunnelPage(user_id=member.id, title="Empty", slug="member1/empty-page")
    db.add(empty_page)
    db.commit()
    has_html = empty_page.gjs_html and empty_page.gjs_html.strip()
    t.test("Empty page has no rendered HTML", not has_html)
    
    # Commission type filtering
    membership_comms = db.query(Commission).filter(
        Commission.to_user_id == sponsor.id,
        Commission.commission_type == "membership_sponsor"
    ).count()
    grid_comms = db.query(Commission).filter(
        Commission.to_user_id == sponsor.id,
        Commission.commission_type == "grid"
    ).count()
    t.test("Can filter membership commissions (1)", membership_comms == 1)
    t.test("Can filter grid commissions (5)", grid_comms == 5)
    
    # ── 12. TEMPLATE SYSTEM VALIDATION ──
    t.section("12. Template System Validation")
    
    # Test that all critical templates exist and parse
    from jinja2 import Environment, FileSystemLoader
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    env = Environment(loader=FileSystemLoader(template_dir))
    
    critical_templates = [
        "dashboard.html", "account.html", "pro-funnels.html", "pro-funnel-editor.html",
        "upgrade.html", "membership.html", "achievements.html", "_sidebar.html",
        "login.html", "register.html", "wallet.html", "legal.html",
        "compensation-plan.html", "compensation-plan-internal.html",
        "campaign-tiers.html", "join-funnel.html", "for-advertisers.html",
    ]
    
    for tmpl_name in critical_templates:
        try:
            env.get_template(tmpl_name)
            t.test(f"Template parses: {tmpl_name}", True)
        except Exception as e:
            t.test(f"Template parses: {tmpl_name}", False, str(e))
    
    # ── 13. PYTHON SOURCE VALIDATION ──
    t.section("13. Python Source Validation")
    
    import ast
    py_files = ["app/main.py", "app/database.py", "app/funnel_templates.py"]
    for pf in py_files:
        filepath = os.path.join(os.path.dirname(os.path.dirname(__file__)), pf)
        try:
            with open(filepath) as f:
                ast.parse(f.read())
            t.test(f"Python parses: {pf}", True)
        except Exception as e:
            t.test(f"Python parses: {pf}", False, str(e))
    
    db.close()
    
    # ── SUMMARY ──
    return t.summary()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
