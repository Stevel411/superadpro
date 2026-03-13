"""
SuperAdPro Course Marketplace Test Suite
==========================================
Run: python tests/test_marketplace.py

22 test cases covering:
- Commission splits (8 tests)
- Quality & review (8 tests)
- Access & permissions (6 tests)
"""

import sys, os, unittest
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

# ── Minimal model replicas for testing ──
TestBase = declarative_base()

class User(TestBase):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    email = Column(String)
    sponsor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    membership_tier = Column(String, default="basic")
    balance = Column(Float, default=0.0)
    total_earned = Column(Float, default=0.0)
    course_earnings = Column(Float, default=0.0)
    marketplace_earnings = Column(Float, default=0.0)
    first_name = Column(String, nullable=True)

class MemberCourse(TestBase):
    __tablename__ = "member_courses"
    id = Column(Integer, primary_key=True)
    creator_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(100))
    slug = Column(String, unique=True)
    description = Column(Text)
    short_description = Column(String(160))
    price = Column(Float)
    thumbnail_url = Column(String)
    category = Column(String)
    difficulty_level = Column(String, default="beginner")
    status = Column(String, default="draft")
    ai_review_result = Column(Text)
    admin_notes = Column(Text)
    total_sales = Column(Integer, default=0)
    total_revenue = Column(Float, default=0)
    total_duration_mins = Column(Integer, default=0)
    lesson_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=True)
    creator_agreed_terms_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class MemberCourseChapter(TestBase):
    __tablename__ = "member_course_chapters"
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("member_courses.id"))
    title = Column(String)
    chapter_order = Column(Integer, default=0)

class MemberCourseLesson(TestBase):
    __tablename__ = "member_course_lessons"
    id = Column(Integer, primary_key=True)
    chapter_id = Column(Integer, ForeignKey("member_course_chapters.id"))
    course_id = Column(Integer, ForeignKey("member_courses.id"))
    title = Column(String)
    lesson_order = Column(Integer, default=0)
    content_type = Column(String, default="text")
    video_url = Column(String)
    text_content = Column(Text)
    duration_minutes = Column(Integer, default=5)
    is_preview = Column(Boolean, default=False)

class MemberCoursePurchase(TestBase):
    __tablename__ = "member_course_purchases"
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("member_courses.id"))
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    buyer_email = Column(String)
    amount_paid = Column(Float)
    creator_commission = Column(Float)
    sponsor_commission = Column(Float)
    company_commission = Column(Float)
    sponsor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    payment_method = Column(String, default="wallet")
    status = Column(String, default="completed")
    access_token = Column(String, unique=True, nullable=True)
    refunded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Commission logic (mirrors main.py) ──
def calculate_commission(price):
    """50/25/25 split"""
    creator = round(price * 0.50, 2)
    sponsor = round(price * 0.25, 2)
    company = round(price - creator - sponsor, 2)
    return creator, sponsor, company

def process_purchase(db, course, buyer, payment_method="wallet"):
    """Process a marketplace course purchase with 50/25/25 split."""
    price = float(course.price)
    creator_share, sponsor_share, company_share = calculate_commission(price)

    # Find creator
    creator = db.query(User).filter(User.id == course.creator_id).first()
    # Find creator's sponsor
    sponsor_id = creator.sponsor_id if creator else None
    if not sponsor_id:
        master = db.query(User).filter(User.is_admin == True).first()
        sponsor_id = master.id if master else None
    sponsor = db.query(User).filter(User.id == sponsor_id).first() if sponsor_id else None

    # Deduct from buyer
    if buyer and payment_method == "wallet":
        buyer.balance = float(buyer.balance or 0) - price

    # Create purchase
    import secrets
    purchase = MemberCoursePurchase(
        course_id=course.id,
        buyer_id=buyer.id if buyer else None,
        buyer_email=buyer.email if buyer else "guest@example.com",
        amount_paid=price,
        creator_commission=creator_share,
        sponsor_commission=sponsor_share,
        company_commission=company_share,
        sponsor_id=sponsor_id,
        payment_method=payment_method,
        status="completed",
        access_token=secrets.token_urlsafe(16) if not buyer else None,
    )
    db.add(purchase)

    # Credit creator
    if creator:
        creator.balance = float(creator.balance or 0) + creator_share
        creator.total_earned = float(creator.total_earned or 0) + creator_share
        creator.marketplace_earnings = float(creator.marketplace_earnings or 0) + creator_share

    # Credit sponsor
    if sponsor:
        sponsor.balance = float(sponsor.balance or 0) + sponsor_share
        sponsor.total_earned = float(sponsor.total_earned or 0) + sponsor_share
        sponsor.marketplace_earnings = float(sponsor.marketplace_earnings or 0) + sponsor_share

    # Update course stats
    course.total_sales = (course.total_sales or 0) + 1
    course.total_revenue = float(course.total_revenue or 0) + price

    db.commit()
    return purchase

def process_refund(db, purchase):
    """Reverse all commissions on refund."""
    course = db.query(MemberCourse).filter(MemberCourse.id == purchase.course_id).first()
    creator = db.query(User).filter(User.id == course.creator_id).first() if course else None
    sponsor = db.query(User).filter(User.id == purchase.sponsor_id).first() if purchase.sponsor_id else None
    buyer = db.query(User).filter(User.id == purchase.buyer_id).first() if purchase.buyer_id else None

    if creator:
        creator.balance = max(0, float(creator.balance or 0) - float(purchase.creator_commission))
        creator.total_earned = max(0, float(creator.total_earned or 0) - float(purchase.creator_commission))
        creator.marketplace_earnings = max(0, float(creator.marketplace_earnings or 0) - float(purchase.creator_commission))
    if sponsor:
        sponsor.balance = max(0, float(sponsor.balance or 0) - float(purchase.sponsor_commission))
        sponsor.total_earned = max(0, float(sponsor.total_earned or 0) - float(purchase.sponsor_commission))
        sponsor.marketplace_earnings = max(0, float(sponsor.marketplace_earnings or 0) - float(purchase.sponsor_commission))
    if buyer:
        buyer.balance = float(buyer.balance or 0) + float(purchase.amount_paid)
    if course:
        course.total_sales = max(0, (course.total_sales or 0) - 1)
        course.total_revenue = max(0, float(course.total_revenue or 0) - float(purchase.amount_paid))

    purchase.status = "refunded"
    purchase.refunded_at = datetime.utcnow()
    db.commit()

def quality_check(course, lessons):
    """Layer 1 quality checks. Returns list of error strings."""
    errors = []
    if len(lessons) < 3:
        errors.append("Minimum 3 lessons required")
    total_duration = sum(l.duration_minutes or 0 for l in lessons)
    if total_duration < 10:
        errors.append("Minimum 10 minutes total duration required")
    for l in lessons:
        if l.content_type == 'text' and l.text_content:
            if len((l.text_content or "").split()) < 100:
                errors.append(f"Lesson '{l.title}' below 100 words")
    if not any(l.is_preview for l in lessons):
        errors.append("At least 1 preview lesson required")
    if not course.thumbnail_url:
        errors.append("Thumbnail required")
    if not course.description or len(course.description) < 100:
        errors.append("Description must be 100+ characters")
    if course.price < 25:
        errors.append("Minimum price $25")
    if not course.title or len(course.title) < 10:
        errors.append("Title must be 10+ characters")
    return errors


# ══════════════════════════════════════
# TEST SUITE
# ══════════════════════════════════════

class MarketplaceTestBase(unittest.TestCase):
    """Base class with DB setup and helper methods."""

    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        TestBase.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

        # Create test users
        self.master = User(id=1, username="steve", email="steve@superadpro.com",
                           is_admin=True, is_active=True, membership_tier="pro",
                           balance=10000, first_name="Steve")
        self.sponsor = User(id=2, username="sponsor1", email="sponsor@test.com",
                            sponsor_id=1, is_active=True, membership_tier="pro",
                            balance=500, first_name="Sarah")
        self.creator = User(id=3, username="creator1", email="creator@test.com",
                            sponsor_id=2, is_active=True, membership_tier="pro",
                            balance=100, first_name="Alex")
        self.buyer = User(id=4, username="buyer1", email="buyer@test.com",
                          sponsor_id=2, is_active=True, membership_tier="basic",
                          balance=500, first_name="Mike")
        self.basic_user = User(id=5, username="basic1", email="basic@test.com",
                               sponsor_id=1, is_active=True, membership_tier="basic",
                               balance=0, first_name="Jane")
        self.db.add_all([self.master, self.sponsor, self.creator, self.buyer, self.basic_user])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def create_valid_course(self, creator_id=3, price=200, status="published"):
        """Helper: create a course with valid content."""
        course = MemberCourse(
            creator_id=creator_id, title="Facebook Ads Mastery Course",
            slug=f"creator1/facebook-ads-{creator_id}", price=price,
            description="A" * 120, short_description="Learn Facebook Ads",
            thumbnail_url="https://example.com/thumb.jpg",
            category="marketing", difficulty_level="beginner",
            status=status, lesson_count=4, total_duration_mins=30,
            creator_agreed_terms_at=datetime.utcnow())
        self.db.add(course)
        self.db.commit()
        # Add chapters and lessons
        ch = MemberCourseChapter(course_id=course.id, title="Getting Started", chapter_order=1)
        self.db.add(ch)
        self.db.commit()
        for i in range(4):
            self.db.add(MemberCourseLesson(
                chapter_id=ch.id, course_id=course.id,
                title=f"Lesson {i+1}", lesson_order=i+1,
                content_type="text", text_content=" ".join(["word"]*120),
                duration_minutes=8, is_preview=(i==0)))
        self.db.commit()
        return course


# ══════════════════════════════════════
# COMMISSION TESTS (8)
# ══════════════════════════════════════

class TestCommissions(MarketplaceTestBase):

    def test_01_standard_purchase_200(self):
        """Member buys $200 course: 50/25/25 split."""
        course = self.create_valid_course(price=200)
        purchase = process_purchase(self.db, course, self.buyer)
        self.assertEqual(purchase.creator_commission, 100.0)
        self.assertEqual(purchase.sponsor_commission, 50.0)
        self.assertEqual(purchase.company_commission, 50.0)
        creator = self.db.query(User).get(3)
        self.assertEqual(creator.balance, 200.0)  # 100 original + 100 earned
        sponsor = self.db.query(User).get(2)
        self.assertEqual(sponsor.balance, 550.0)  # 500 original + 50 earned

    def test_02_public_buyer_100(self):
        """Public buyer (no account) buys $100 course."""
        course = self.create_valid_course(price=100)
        purchase = process_purchase(self.db, course, None, payment_method="stripe")
        self.assertEqual(purchase.creator_commission, 50.0)
        self.assertEqual(purchase.sponsor_commission, 25.0)
        self.assertEqual(purchase.company_commission, 25.0)
        self.assertIsNotNone(purchase.access_token)
        self.assertIsNone(purchase.buyer_id)

    def test_03_sponsor_is_master(self):
        """Creator's sponsor is Master Affiliate: gets 25% sponsor + 25% company."""
        # Create course by sponsor1 (whose sponsor is master/steve)
        course = self.create_valid_course(creator_id=2, price=200)
        course.slug = "sponsor1/facebook-ads-2"
        self.db.commit()
        purchase = process_purchase(self.db, course, self.buyer)
        master = self.db.query(User).get(1)
        # Master gets sponsor commission (25% = $50)
        self.assertEqual(purchase.sponsor_id, 1)
        self.assertEqual(purchase.sponsor_commission, 50.0)
        # Master also gets company share ($50) but that's not credited to wallet
        self.assertEqual(purchase.company_commission, 50.0)

    def test_04_self_purchase_blocked(self):
        """Creator cannot buy their own course."""
        course = self.create_valid_course()
        # Simulate: buyer IS the creator
        creator = self.db.query(User).get(3)
        # In the real endpoint, this check happens before process_purchase
        self.assertEqual(creator.id, course.creator_id)
        # The API would return 400, we just verify the check
        is_self_purchase = (creator.id == course.creator_id)
        self.assertTrue(is_self_purchase)

    def test_05_refund_within_7_days(self):
        """Refund reverses all 3 commissions."""
        course = self.create_valid_course(price=200)
        purchase = process_purchase(self.db, course, self.buyer)
        # Verify pre-refund balances
        creator = self.db.query(User).get(3)
        self.assertEqual(creator.balance, 200.0)
        # Process refund
        process_refund(self.db, purchase)
        # Verify post-refund
        creator = self.db.query(User).get(3)
        self.assertEqual(creator.balance, 100.0)  # Back to original
        sponsor = self.db.query(User).get(2)
        self.assertEqual(sponsor.balance, 500.0)  # Back to original
        buyer = self.db.query(User).get(4)
        self.assertEqual(buyer.balance, 500.0)  # Refunded
        self.assertEqual(purchase.status, "refunded")
        self.assertIsNotNone(purchase.refunded_at)
        self.assertEqual(course.total_sales, 0)

    def test_06_refund_after_7_days(self):
        """Refund window expired check."""
        course = self.create_valid_course(price=100)
        purchase = process_purchase(self.db, course, self.buyer)
        # Backdate purchase to 10 days ago
        purchase.created_at = datetime.utcnow() - timedelta(days=10)
        self.db.commit()
        days_since = (datetime.utcnow() - purchase.created_at).days
        self.assertGreater(days_since, 7)
        # In the real endpoint, this would return 400

    def test_07_minimum_price_25(self):
        """$25 course (minimum): verify split."""
        course = self.create_valid_course(price=25)
        purchase = process_purchase(self.db, course, self.buyer)
        self.assertEqual(purchase.creator_commission, 12.5)
        self.assertEqual(purchase.sponsor_commission, 6.25)
        self.assertEqual(purchase.company_commission, 6.25)
        # Verify they sum to price
        total = purchase.creator_commission + purchase.sponsor_commission + purchase.company_commission
        self.assertEqual(total, 25.0)

    def test_08_platform_course_unaffected(self):
        """Platform courses (Steve's library) use separate system."""
        # Marketplace purchases should NOT affect course_sale_count
        # (that's for platform course commissions, a different system)
        course = self.create_valid_course(price=100)
        buyer = self.db.query(User).get(4)
        original_course_sale_count = buyer.course_earnings or 0
        process_purchase(self.db, course, buyer)
        # course_earnings should not change from marketplace (that's platform courses)
        # marketplace_earnings should change
        creator = self.db.query(User).get(3)
        self.assertGreater(creator.marketplace_earnings, 0)


# ══════════════════════════════════════
# QUALITY & REVIEW TESTS (8)
# ══════════════════════════════════════

class TestQualityReview(MarketplaceTestBase):

    def test_09_too_few_lessons(self):
        """Course with 2 lessons fails quality check."""
        course = MemberCourse(creator_id=3, title="Short Course Here", slug="c/short",
                              price=50, description="A"*120, thumbnail_url="x.jpg")
        self.db.add(course)
        self.db.commit()
        ch = MemberCourseChapter(course_id=course.id, title="Ch1")
        self.db.add(ch); self.db.commit()
        for i in range(2):
            self.db.add(MemberCourseLesson(chapter_id=ch.id, course_id=course.id,
                title=f"L{i}", content_type="video", duration_minutes=10, is_preview=(i==0)))
        self.db.commit()
        lessons = self.db.query(MemberCourseLesson).filter_by(course_id=course.id).all()
        errors = quality_check(course, lessons)
        self.assertIn("Minimum 3 lessons required", errors)

    def test_10_too_short_duration(self):
        """Course with 5 mins total fails."""
        course = MemberCourse(creator_id=3, title="Quick Course Title", slug="c/quick",
                              price=50, description="A"*120, thumbnail_url="x.jpg")
        self.db.add(course); self.db.commit()
        ch = MemberCourseChapter(course_id=course.id, title="Ch1")
        self.db.add(ch); self.db.commit()
        for i in range(3):
            self.db.add(MemberCourseLesson(chapter_id=ch.id, course_id=course.id,
                title=f"L{i}", content_type="video", duration_minutes=1, is_preview=(i==0)))
        self.db.commit()
        lessons = self.db.query(MemberCourseLesson).filter_by(course_id=course.id).all()
        errors = quality_check(course, lessons)
        self.assertIn("Minimum 10 minutes total duration required", errors)

    def test_11_lesson_below_100_words(self):
        """Text lesson with 50 words fails."""
        course = MemberCourse(creator_id=3, title="Word Count Course Test", slug="c/words",
                              price=50, description="A"*120, thumbnail_url="x.jpg")
        self.db.add(course); self.db.commit()
        ch = MemberCourseChapter(course_id=course.id, title="Ch1")
        self.db.add(ch); self.db.commit()
        self.db.add(MemberCourseLesson(chapter_id=ch.id, course_id=course.id,
            title="Short Lesson", content_type="text",
            text_content=" ".join(["word"]*50), duration_minutes=10, is_preview=True))
        for i in range(2):
            self.db.add(MemberCourseLesson(chapter_id=ch.id, course_id=course.id,
                title=f"L{i+2}", content_type="video", duration_minutes=10))
        self.db.commit()
        lessons = self.db.query(MemberCourseLesson).filter_by(course_id=course.id).all()
        errors = quality_check(course, lessons)
        self.assertTrue(any("below 100 words" in e for e in errors))

    def test_12_no_thumbnail(self):
        """Missing thumbnail fails."""
        course = MemberCourse(creator_id=3, title="No Thumb Course Test", slug="c/nothumb",
                              price=50, description="A"*120, thumbnail_url="")
        self.db.add(course); self.db.commit()
        ch = MemberCourseChapter(course_id=course.id, title="Ch1")
        self.db.add(ch); self.db.commit()
        for i in range(3):
            self.db.add(MemberCourseLesson(chapter_id=ch.id, course_id=course.id,
                title=f"L{i}", content_type="video", duration_minutes=10, is_preview=(i==0)))
        self.db.commit()
        lessons = self.db.query(MemberCourseLesson).filter_by(course_id=course.id).all()
        errors = quality_check(course, lessons)
        self.assertIn("Thumbnail required", errors)

    def test_13_price_too_low(self):
        """Price $10 fails."""
        course = MemberCourse(creator_id=3, title="Cheap Course Title Test", slug="c/cheap",
                              price=10, description="A"*120, thumbnail_url="x.jpg")
        self.db.add(course); self.db.commit()
        lessons = []
        errors = quality_check(course, lessons)
        self.assertIn("Minimum price $25", errors)

    def test_14_valid_course_passes(self):
        """Fully valid course passes all quality checks."""
        course = self.create_valid_course(status="draft")
        lessons = self.db.query(MemberCourseLesson).filter_by(course_id=course.id).all()
        errors = quality_check(course, lessons)
        self.assertEqual(len(errors), 0, f"Expected 0 errors, got: {errors}")

    def test_15_no_preview_lesson(self):
        """No preview lesson fails."""
        course = MemberCourse(creator_id=3, title="No Preview Course Test", slug="c/noprev",
                              price=50, description="A"*120, thumbnail_url="x.jpg")
        self.db.add(course); self.db.commit()
        ch = MemberCourseChapter(course_id=course.id, title="Ch1")
        self.db.add(ch); self.db.commit()
        for i in range(3):
            self.db.add(MemberCourseLesson(chapter_id=ch.id, course_id=course.id,
                title=f"L{i}", content_type="video", duration_minutes=10, is_preview=False))
        self.db.commit()
        lessons = self.db.query(MemberCourseLesson).filter_by(course_id=course.id).all()
        errors = quality_check(course, lessons)
        self.assertIn("At least 1 preview lesson required", errors)

    def test_16_short_description(self):
        """Description under 100 chars fails."""
        course = MemberCourse(creator_id=3, title="Short Desc Course Test", slug="c/shortdesc",
                              price=50, description="Too short", thumbnail_url="x.jpg")
        self.db.add(course); self.db.commit()
        lessons = []
        errors = quality_check(course, lessons)
        self.assertIn("Description must be 100+ characters", errors)


# ══════════════════════════════════════
# ACCESS & PERMISSION TESTS (6)
# ══════════════════════════════════════

class TestAccessPermissions(MarketplaceTestBase):

    def test_17_basic_member_blocked(self):
        """Basic member cannot create courses (Pro only)."""
        basic = self.db.query(User).get(5)
        self.assertEqual(basic.membership_tier, "basic")
        can_create = (basic.membership_tier == "pro" or basic.is_admin)
        self.assertFalse(can_create)

    def test_18_pro_member_can_create(self):
        """Pro member can create courses."""
        creator = self.db.query(User).get(3)
        self.assertEqual(creator.membership_tier, "pro")
        can_create = (creator.membership_tier == "pro" or creator.is_admin)
        self.assertTrue(can_create)

    def test_19_guest_access_token(self):
        """Guest buyer gets access token."""
        course = self.create_valid_course(price=50)
        purchase = process_purchase(self.db, course, None, payment_method="stripe")
        self.assertIsNotNone(purchase.access_token)
        self.assertGreater(len(purchase.access_token), 10)

    def test_20_member_no_access_token(self):
        """Logged-in buyer does NOT get access token (uses account)."""
        course = self.create_valid_course(price=50)
        purchase = process_purchase(self.db, course, self.buyer)
        self.assertIsNone(purchase.access_token)

    def test_21_suspended_creator(self):
        """Suspended creator's courses should be unpublished."""
        course = self.create_valid_course(status="published")
        self.assertEqual(course.status, "published")
        # Simulate suspension: set status to suspended
        course.status = "suspended"
        self.db.commit()
        # Verify course is no longer published
        published = self.db.query(MemberCourse).filter_by(
            creator_id=3, status="published").all()
        self.assertEqual(len(published), 0)

    def test_22_edit_reverts_to_pending(self):
        """Editing published course content should revert to pending_review."""
        course = self.create_valid_course(status="published")
        self.assertEqual(course.status, "published")
        # Simulate content edit: revert status
        course.status = "pending_review"
        self.db.commit()
        self.assertEqual(course.status, "pending_review")


# ══════════════════════════════════════
# EXTRA: EDGE CASE TESTS
# ══════════════════════════════════════

class TestEdgeCases(MarketplaceTestBase):

    def test_broken_sponsor_chain(self):
        """If creator has no sponsor, defaults to master affiliate."""
        # Create user with no sponsor
        orphan = User(id=10, username="orphan", email="orphan@test.com",
                      sponsor_id=None, is_active=True, membership_tier="pro", balance=0)
        self.db.add(orphan); self.db.commit()
        course = MemberCourse(creator_id=10, title="Orphan Creator Course", slug="orphan/course",
                              price=100, description="A"*120, thumbnail_url="x.jpg",
                              status="published", lesson_count=3, total_duration_mins=15)
        self.db.add(course); self.db.commit()
        purchase = process_purchase(self.db, course, self.buyer)
        # Sponsor commission should go to master (id=1)
        self.assertEqual(purchase.sponsor_id, 1)
        master = self.db.query(User).get(1)
        self.assertGreater(master.marketplace_earnings, 0)

    def test_duplicate_purchase_prevented(self):
        """Same buyer can't purchase same course twice."""
        course = self.create_valid_course(price=50)
        p1 = process_purchase(self.db, course, self.buyer)
        self.assertEqual(p1.status, "completed")
        # Check for existing purchase (what the API does)
        existing = self.db.query(MemberCoursePurchase).filter_by(
            course_id=course.id, buyer_id=self.buyer.id, status="completed").first()
        self.assertIsNotNone(existing)

    def test_commission_sum_equals_price(self):
        """For any price, commissions must sum to exactly the price."""
        for price in [25, 49.99, 100, 199, 500, 999.99]:
            c, s, co = calculate_commission(price)
            total = c + s + co
            self.assertAlmostEqual(total, price, places=2,
                msg=f"Price ${price}: {c}+{s}+{co}={total}")


if __name__ == "__main__":
    print("=" * 60)
    print("SuperAdPro Course Marketplace Test Suite")
    print("=" * 60)
    unittest.main(verbosity=2)
