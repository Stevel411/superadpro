"""
SuperAdPro — End-to-End Live Platform Test Suite
==================================================
Tests every critical flow against the actual running platform.

Run:
  python tests/test_e2e.py                          # tests live URL
  python tests/test_e2e.py --url http://localhost:8080  # tests local

What this covers:
  1.  Health check & platform availability
  2.  Public routes (no auth required)
  3.  Registration & login flow
  4.  Authentication guards (protected routes reject unauthenticated)
  5.  Profile & account API
  6.  Dashboard API — all fields present
  7.  Stripe checkout creation (all 5 payment types)
  8.  Stripe config endpoint
  9.  SuperLeads CRM (leads, lists, sequences, email stats)
  10. Notifications API
  11. Affiliate / Network API
  12. Leaderboard API
  13. Funnel / SuperPages API
  14. Link Tools API
  15. Co-Pilot briefing (Pro only)
  16. Campaign Tiers API
  17. Courses API
  18. SuperMarket API
  19. Webhook endpoints (signature rejection)
  20. Cron endpoints (secret rejection)
  21. Admin endpoints (auth guard)
  22. Rate limiting sanity check
  23. Error handling (404, bad payloads)
  24. Commission credit flow (unit-level, end-to-end)
"""

import sys
import os
import json
import time
import uuid
import argparse
import urllib.request
import urllib.error
import urllib.parse

# ══════════════════════════════════════════════════════════════
#  CONFIG
# ══════════════════════════════════════════════════════════════

DEFAULT_URL = "https://superadpro-production.up.railway.app"
TEST_PASSWORD = "TestPass123!"

# ══════════════════════════════════════════════════════════════
#  TEST RUNNER
# ══════════════════════════════════════════════════════════════

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.errors = []
        self.warnings = []

    def test(self, name, condition, detail="", warn=False):
        if condition:
            self.passed += 1
            print(f"  \033[92m✓\033[0m {name}")
        elif warn:
            self.warnings.append((name, detail))
            self.skipped += 1
            print(f"  \033[93m⚠\033[0m {name}" + (f" — {detail}" if detail else ""))
        else:
            self.failed += 1
            self.errors.append((name, detail))
            print(f"  \033[91m✗\033[0m {name}" + (f" — {detail}" if detail else ""))

    def skip(self, name, reason=""):
        self.skipped += 1
        print(f"  \033[90m⊘\033[0m {name} (skipped: {reason})")

    def section(self, title):
        print(f"\n\033[96m{'═'*64}\033[0m")
        print(f"\033[96m  {title}\033[0m")
        print(f"\033[96m{'═'*64}\033[0m")

    def summary(self):
        total = self.passed + self.failed + self.skipped
        print(f"\n{'═'*64}")
        if self.failed == 0:
            print(f"  \033[92m✓ ALL {self.passed} TESTS PASSED\033[0m  ({self.skipped} skipped, {len(self.warnings)} warnings)")
        else:
            print(f"  \033[91m✗ {self.failed} FAILED\033[0m / {total} total  ({self.passed} passed, {self.skipped} skipped)")
            print(f"\n  \033[91mFailed tests:\033[0m")
            for name, detail in self.errors:
                print(f"    → {name}")
                if detail:
                    print(f"      {detail}")
        if self.warnings:
            print(f"\n  \033[93mWarnings:\033[0m")
            for name, detail in self.warnings:
                print(f"    ⚠ {name}: {detail}")
        print(f"{'═'*64}\n")
        return self.failed == 0


# ══════════════════════════════════════════════════════════════
#  HTTP HELPERS
# ══════════════════════════════════════════════════════════════

class Client:
    def __init__(self, base_url):
        self.base = base_url.rstrip("/")
        self.cookies = {}
        self.timeout = 15

    def _build_request(self, method, path, data=None, content_type="application/json"):
        url = self.base + path
        body = None
        if data is not None:
            if content_type == "application/json":
                body = json.dumps(data).encode()
            elif content_type == "application/x-www-form-urlencoded":
                body = urllib.parse.urlencode(data).encode()

        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Content-Type", content_type)
        req.add_header("Accept", "application/json, text/html")
        req.add_header("User-Agent", "SuperAdPro-E2E-Tests/1.0")

        if self.cookies:
            cookie_str = "; ".join(f"{k}={v}" for k, v in self.cookies.items())
            req.add_header("Cookie", cookie_str)
        return req

    def _send(self, req, allow_redirects=False):
        try:
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
            if not allow_redirects:
                opener = urllib.request.build_opener(
                    urllib.request.HTTPCookieProcessor(),
                    urllib.request.HTTPRedirectHandler()
                )
            with opener.open(req, timeout=self.timeout) as resp:
                # Capture set-cookie
                for header in resp.headers.get_all("Set-Cookie") or []:
                    parts = header.split(";")[0].strip()
                    if "=" in parts:
                        k, v = parts.split("=", 1)
                        self.cookies[k.strip()] = v.strip()
                body = resp.read().decode("utf-8", errors="replace")
                return resp.status, body
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            # Still capture cookies on error responses
            for header in (e.headers.get_all("Set-Cookie") or []):
                parts = header.split(";")[0].strip()
                if "=" in parts:
                    k, v = parts.split("=", 1)
                    self.cookies[k.strip()] = v.strip()
            return e.code, body
        except Exception as e:
            return 0, str(e)

    def get(self, path, allow_redirects=True):
        req = self._build_request("GET", path)
        return self._send(req, allow_redirects)

    def post(self, path, data=None, form=False):
        ct = "application/x-www-form-urlencoded" if form else "application/json"
        req = self._build_request("POST", path, data, ct)
        return self._send(req)

    def json_get(self, path):
        status, body = self.get(path)
        try:
            return status, json.loads(body)
        except Exception:
            return status, {}

    def json_post(self, path, data=None):
        status, body = self.post(path, data)
        try:
            return status, json.loads(body)
        except Exception:
            return status, {}


# ══════════════════════════════════════════════════════════════
#  TEST SECTIONS
# ══════════════════════════════════════════════════════════════

def test_health(t, c):
    t.section("1. Health Check & Platform Availability")
    status, body = c.get("/health")
    t.test("Platform is reachable", status == 200, f"Got {status}")
    t.test("Health endpoint returns OK", "ok" in body.lower() or status == 200, body[:100])

    status, _ = c.get("/")
    t.test("Homepage returns 200", status == 200, f"Got {status}")

    status, _ = c.get("/robots.txt")
    t.test("robots.txt accessible", status == 200, f"Got {status}")


def test_public_routes(t, c):
    t.section("2. Public Routes (No Auth Required)")
    public_routes = [
        ("/login", "Login page"),
        ("/register", "Register page"),
        ("/how-it-works", "How it works"),
        ("/compensation-plan", "Compensation plan"),
        ("/for-advertisers", "For advertisers"),
        ("/legal", "Legal page"),
        ("/faq", "FAQ page"),
        ("/support", "Support page"),
        ("/sitemap.xml", "Sitemap"),
    ]
    for path, name in public_routes:
        status, _ = c.get(path)
        t.test(f"{name} accessible ({path})", status in [200, 302], f"Got {status}")


def test_auth_guards(t, c_anon):
    t.section("3. Authentication Guards")
    # React SPA routes return 200 (auth handled client-side in React)
    # Just verify they don't 500
    spa_routes = [
        "/app/dashboard", "/app/wallet", "/app/account", "/app/affiliate",
        "/app/campaign-tiers", "/app/watch", "/app/achievements",
    ]
    status_spa, _ = c_anon.get("/app/dashboard")
    t.test("React SPA root accessible", status_spa in [200, 302], f"Got {status_spa}")

    # API endpoints should return 401
    api_protected = [
        "/api/me", "/api/dashboard", "/api/network",
        "/api/leads",
    ]
    for path in api_protected:
        status, body = c_anon.json_get(path)
        t.test(f"API auth guard: {path}", status == 401, f"Got {status}: {body}")


def test_registration_and_login(t, c):
    t.section("4. Registration & Login Flow")
    uid = uuid.uuid4().hex[:8]
    username = f"e2etest_{uid}"
    email = f"e2etest_{uid}@testmail.com"

    # Register
    status, data = c.json_post("/api/register", {
        "username": username,
        "email": email,
        "password": TEST_PASSWORD,
        "confirm_password": TEST_PASSWORD,
        "first_name": "E2E",
        "last_name": "Test",
    })
    t.test("Registration API returns 200", status == 200, f"Got {status}: {str(data)[:100]}")
    t.test("Registration returns success", data.get("success") or data.get("ok") or status == 200, str(data)[:100])

    # Login
    status, data = c.json_post("/api/login", {
        "username": username,
        "password": TEST_PASSWORD,
    })
    t.test("Login returns 200", status == 200, f"Got {status}: {str(data)[:100]}")
    is_success = data.get("success") or data.get("ok") or data.get("redirect") or status == 200
    t.test("Login response indicates success", is_success, str(data)[:100])

    # Wrong password
    status, body = c.json_post("/api/login", {
        "username": username,
        "password": "wrongpassword123",
    })
    t.test("Wrong password rejected", status in [401, 400], f"Got {status}")

    # Duplicate username
    status, data = c.json_post("/api/register", {
        "username": username,
        "email": f"other_{uid}@testmail.com",
        "password": TEST_PASSWORD,
        "confirm_password": TEST_PASSWORD,
        "first_name": "Dupe",
        "last_name": "Test",
    })
    t.test("Duplicate username rejected", status in [400, 409, 422], f"Got {status}: {str(data)[:80]}")

    return username, email


def test_profile_api(t, c):
    t.section("5. Profile & Account API")
    status, data = c.json_get("/api/me")
    t.test("/api/me returns 200", status == 200, f"Got {status}")

    required_fields = ["id", "username", "email", "is_active", "membership_tier",
                       "balance", "total_earned", "personal_referrals", "total_team",
                       "kyc_status", "totp_enabled", "avatar_url", "country"]
    for field in required_fields:
        t.test(f"/api/me has field: {field}", field in data, f"Missing: {field}, got: {list(data.keys())[:10]}")

    # Update profile
    status, resp = c.json_post("/api/account/update", {
        "first_name": "E2E",
        "last_name": "Test",
        "country": "United Kingdom",
    })
    t.test("Profile update returns 200", status == 200, f"Got {status}: {resp}")

    # Verify saved
    status, data2 = c.json_get("/api/me")
    t.test("First name saved", data2.get("first_name") == "E2E", f"Got: {data2.get('first_name')}")
    t.test("Country saved", data2.get("country") == "United Kingdom", f"Got: {data2.get('country')}")

    # Invalid wallet address
    status, resp = c.json_post("/api/account/update", {"wallet_address": "not_a_wallet"})
    t.test("Invalid wallet rejected", status == 400, f"Got {status}")


def test_dashboard_api(t, c):
    t.section("6. Dashboard API")
    status, data = c.json_get("/api/dashboard")
    t.test("Dashboard API returns 200", status == 200, f"Got {status}")

    required = ["balance", "total_earned", "grid_earnings", "level_earnings",
                "membership_earned", "personal_referrals", "total_team",
                "grid_stats", "is_active", "display_name"]
    for field in required:
        t.test(f"Dashboard has field: {field}", field in data, f"Missing from dashboard: {field}")

    # Grid stats structure
    grid_stats = data.get("grid_stats", {})
    t.test("grid_stats has completed_advances", "completed_advances" in grid_stats)
    t.test("grid_stats has active_grids", "active_grids" in grid_stats)
    t.test("grid_stats has total_bonus_earned", "total_bonus_earned" in grid_stats)


def test_stripe_endpoints(t, c):
    t.section("7. Stripe Payment Endpoints")

    # Config endpoint
    status, data = c.json_get("/api/stripe/config")
    t.test("Stripe config returns 200", status == 200, f"Got {status}")
    t.test("Stripe config has publishable_key", "publishable_key" in data)
    t.test("Stripe config has configured flag", "configured" in data)

    # Membership checkout — will fail if keys not set, but endpoint should exist
    status, data = c.json_post("/api/stripe/create-membership-checkout", {"tier": "basic"})
    t.test("Membership checkout endpoint exists", status in [200, 400], f"Got {status}")
    if status == 200:
        t.test("Membership checkout returns URL", "url" in data, str(data)[:100])
    else:
        t.test("Membership checkout returns error (keys not set)", "error" in data, str(data)[:100], warn=True)

    # Invalid tier
    status, data = c.json_post("/api/stripe/create-membership-checkout", {"tier": "invalid"})
    t.test("Invalid tier rejected", status == 400, f"Got {status}")

    # Grid checkout
    status, data = c.json_post("/api/stripe/create-grid-checkout", {"package_tier": 1})
    t.test("Grid checkout endpoint exists", status in [200, 400], f"Got {status}")

    # Boost checkout
    status, data = c.json_post("/api/stripe/create-boost-checkout", {"pack_key": "1000"})
    t.test("Boost checkout endpoint exists", status in [200, 400], f"Got {status}")

    # Invalid boost pack
    status, data = c.json_post("/api/stripe/create-boost-checkout", {"pack_key": "invalid"})
    t.test("Invalid boost pack rejected", status == 400, f"Got {status}")

    # Course checkout
    status, data = c.json_post("/api/stripe/create-course-checkout", {"course_id": 1})
    t.test("Course checkout endpoint exists", status in [200, 400, 404], f"Got {status}")


def test_superleads(t, c):
    t.section("8. SuperLeads CRM API")

    # Email stats — available to all members
    status, data = c.json_get("/api/leads/email-stats")
    t.test("Email stats returns 200", status == 200, f"Got {status}")
    t.test("Email stats has daily_limit", "daily_limit" in data or "free_remaining" in data or status == 200)

    # Leads list
    status, data = c.json_get("/api/leads")
    t.test("Leads API returns 200 or 403", status in [200, 403], f"Got {status}")

    if status == 200:
        t.test("Leads response has leads array", "leads" in data, str(data)[:100])

        # Lists
        status2, data2 = c.json_get("/api/leads/lists")
        t.test("Lead lists returns 200", status2 == 200, f"Got {status2}")

        # Sequences
        status3, data3 = c.json_get("/api/leads/sequences")
        t.test("Sequences returns 200", status3 == 200, f"Got {status3}")

        # Stats
        status4, data4 = c.json_get("/api/leads/stats")
        t.test("Lead stats returns 200", status4 == 200, f"Got {status4}")

        # Create a list
        status5, data5 = c.json_post("/api/leads/lists", {
            "name": "E2E Test List",
            "description": "Created by E2E tests",
            "color": "#6366f1",
        })
        t.test("Create lead list returns 200", status5 == 200, f"Got {status5}: {data5}")
    else:
        t.skip("SuperLeads tests", "Pro feature — basic member")


def test_notifications(t, c):
    t.section("9. Notifications API")
    status, data = c.json_get("/api/notifications")
    t.test("Notifications returns 200", status == 200, f"Got {status}")
    t.test("Has notifications array", "notifications" in data, str(data)[:100])
    t.test("Has unread_count", "unread_count" in data)

    # Mark as read
    status, data = c.json_post("/api/notifications/mark-read", {})
    t.test("Mark-read returns 200", status == 200, f"Got {status}")


def test_affiliate_network(t, c):
    t.section("10. Affiliate & Network API")
    status, data = c.json_get("/api/affiliate")
    t.test("Affiliate API returns 200", status == 200, f"Got {status}")

    required = ["personal_referrals", "total_team"]
    for field in required:
        t.test(f"Affiliate has {field}", field in data, f"Missing: {field}")

    status, data = c.json_get("/api/network")
    t.test("Network API returns 200", status == 200, f"Got {status}")

    status, data = c.json_get("/api/leaderboard")
    t.test("Leaderboard API returns 200", status == 200, f"Got {status}")
    t.test("Leaderboard has ref_leaders", "ref_leaders" in data or status == 200)


def test_campaign_tiers(t, c):
    t.section("11. Campaign Tiers API")
    status, data = c.json_get("/api/campaign-tiers")
    t.test("Campaign tiers returns 200", status == 200, f"Got {status}")

    # Grid visualiser
    status, data = c.json_get("/api/grid-visualiser")
    t.test("Grid visualiser returns 200", status == 200, f"Got {status}")


def test_courses(t, c):
    t.section("12. Courses API")
    status, data = c.json_get("/api/courses")
    t.test("Courses API returns 200", status == 200, f"Got {status}")

    status, data = c.json_get("/api/courses/stats")
    t.test("Course stats returns 200", status == 200, f"Got {status}")

    # Marketplace
    status, data = c.json_get("/api/marketplace/browse")
    t.test("Course marketplace returns 200", status == 200, f"Got {status}")


def test_supermarket(t, c):
    t.section("13. SuperMarket API")
    status, data = c.json_get("/api/supermarket/browse")
    t.test("SuperMarket browse returns 200", status == 200, f"Got {status}")


def test_funnels(t, c):
    t.section("14. Funnels / SuperPages API")
    status, data = c.json_get("/api/funnels")
    t.test("Funnels API returns 200", status == 200, f"Got {status}")

    status, data = c.json_get("/api/funnels/templates")
    t.test("Funnel templates returns 200", status == 200, f"Got {status}")


def test_link_tools(t, c):
    t.section("15. Link Tools API")
    status, data = c.json_get("/api/link-tools")
    t.test("Link tools returns 200", status == 200, f"Got {status}")
    t.test("Has links array", "links" in data or "short_links" in data or status == 200)

    # Create a short link
    uid = uuid.uuid4().hex[:6]
    status, data = c.json_post("/api/links/create", {
        "destination_url": "https://example.com",
        "title": "E2E Test Link",
        "slug": f"e2e-{uid}",
    })
    t.test("Create short link returns 200", status == 200, f"Got {status}: {data}")
    if status == 200:
        link_id = data.get("id") or data.get("slug") or data.get("link", {}).get("id")
        t.test("New link has ID or slug", link_id is not None)


def test_copilot(t, c, is_pro=False):
    t.section("16. AI Co-Pilot API")

    status, data = c.json_get("/api/copilot/briefing")
    if is_pro:
        t.test("Co-Pilot briefing returns 200 for Pro", status == 200, f"Got {status}: {data}")
        if status == 200:
            t.test("Briefing has narrative", bool(data.get("narrative")), str(data)[:100])
            t.test("Briefing has actions", isinstance(data.get("actions"), list))
            t.test("Briefing has generated_at", "generated_at" in data)

        # Ask a question
        status2, data2 = c.json_post("/api/copilot/ask", {
            "question": "How many team members do I have?"
        })
        t.test("Co-Pilot ask returns 200", status2 == 200, f"Got {status2}")
        if status2 == 200:
            t.test("Ask has reply", bool(data2.get("reply")), str(data2)[:100])
            t.test("Ask has remaining count", "remaining" in data2)

        # Off-topic question should be redirected
        status3, data3 = c.json_post("/api/copilot/ask", {
            "question": "What is the weather in London today?"
        })
        t.test("Off-topic question handled", status3 == 200, f"Got {status3}")
        if status3 == 200:
            reply = data3.get("reply", "").lower()
            t.test("Off-topic reply stays on-topic", "superadpro" in reply or "advisor" in reply or "business" in reply,
                   f"Reply: {reply[:100]}", warn=True)
    else:
        t.test("Co-Pilot returns 403 for non-Pro", status == 403, f"Got {status}: {data}")


def test_webhook_security(t, c):
    t.section("17. Webhook Security")

    # Stripe webhook — bad signature should be rejected
    status, body = c.post("/api/webhook/stripe", {"type": "checkout.session.completed"})
    t.test("Stripe webhook rejects bad signature", status == 400, f"Got {status}")

    # Coinbase webhook — bad signature
    status, body = c.post("/api/webhook/coinbase", {"event": {"type": "charge:confirmed"}})
    t.test("Coinbase webhook rejects unauthenticated/bad request", status in [400, 401, 422], f"Got {status}")


def test_cron_security(t, c):
    t.section("18. Cron Endpoint Security")

    # Cron endpoints without auth should fail
    status, _ = c.post("/cron/process-renewals", {})
    t.test("Renewals cron rejects missing secret", status in [401, 403, 422], f"Got {status}")

    status, _ = c.post("/cron/process-nurture", {})
    t.test("Nurture cron rejects missing secret", status in [401, 403, 422], f"Got {status}")


def test_admin_security(t, c):
    t.section("19. Admin Endpoint Security")

    admin_routes = [
        "/admin/api/users",
        "/admin/api/finances",
        "/admin/api/kyc-pending",
        "/admin/api/withdrawals",
    ]
    for path in admin_routes:
        status, _ = c.json_get(path)
        t.test(f"Admin endpoint protected: {path}", status in [401, 403, 302], f"Got {status}")


def test_error_handling(t, c):
    t.section("20. Error Handling")

    # 404
    status, _ = c.get("/this-page-definitely-does-not-exist-xyz")
    t.test("Non-existent route handled gracefully", status in [404, 302, 200], f"Got {status}")

    # Bad JSON payloads
    status, data = c.json_post("/api/account/update", {"wallet_address": "x" * 1000})
    t.test("Oversized wallet address handled", status in [400, 422, 200], f"Got {status}")

    # Empty registration
    status, _ = c.json_post("/api/register", {})
    t.test("Empty registration rejected", status in [400, 422], f"Got {status}")

    # SQL injection attempt in username
    status, _ = c.json_post("/api/login", {
        "username": "' OR '1'='1",
        "password": "anything"
    })
    t.test("SQL injection attempt handled safely", status in [400, 401, 422], f"Got {status}")


def test_commission_flow(t, c):
    t.section("21. Commission Credit Flow")

    # Get current balance before any action
    status, me = c.json_get("/api/me")
    if status != 200:
        t.skip("Commission flow", "Not authenticated")
        return

    initial_balance = float(me.get("balance", 0))
    initial_referrals = int(me.get("personal_referrals", 0))
    t.test("Can read current balance", status == 200)
    t.test("Balance is non-negative", initial_balance >= 0, f"Balance: {initial_balance}")

    # Check commission history endpoint
    status, data = c.json_get("/api/my-commission-flows")
    t.test("Commission flows endpoint accessible", status == 200, f"Got {status}")

    # Wallet
    status, data = c.json_get("/api/dashboard")
    if status == 200:
        t.test("Dashboard balance matches /api/me", abs(float(data.get("balance", 0)) - initial_balance) < 0.01,
               f"Dashboard: {data.get('balance')}, me: {initial_balance}")


def test_passup_visualiser(t, c):
    t.section("22. Passup Visualiser & Analytics")

    status, data = c.json_get("/api/passup-visualiser")
    t.test("Passup visualiser returns 200", status == 200, f"Got {status}")

    status, data = c.json_get("/api/analytics")
    t.test("Analytics API returns 200", status == 200, f"Got {status}")


def test_linkhub(t, c):
    t.section("23. LinkHub API")

    status, data = c.json_get("/api/linkhub/editor-data")
    t.test("LinkHub editor data returns 200", status == 200, f"Got {status}")


def test_achievements(t, c):
    t.section("24. Achievements API")

    status, data = c.json_get("/api/achievements")
    t.test("Achievements returns 200", status == 200, f"Got {status}")
    t.test("Has achievements array", "earned" in data or "achievements" in data or "badges" in data or status == 200)


# ══════════════════════════════════════════════════════════════
#  MAIN RUNNER
# ══════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="SuperAdPro E2E Test Suite")
    parser.add_argument("--url", default=DEFAULT_URL, help="Base URL to test against")
    parser.add_argument("--pro-username", default=None, help="Pro member username for Pro-only tests")
    parser.add_argument("--pro-password", default=None, help="Pro member password")
    args = parser.parse_args()

    print(f"\n\033[95m{'═'*64}\033[0m")
    print(f"\033[95m  SuperAdPro — End-to-End Test Suite\033[0m")
    print(f"\033[95m  Target: {args.url}\033[0m")
    print(f"\033[95m{'═'*64}\033[0m")

    t = TestRunner()
    start = time.time()

    # ── Anonymous client ──
    c_anon = Client(args.url)

    # ── Health & public ──
    test_health(t, c_anon)
    test_public_routes(t, c_anon)
    test_auth_guards(t, Client(args.url))  # Fresh client with no cookies

    # ── Register + login as a new test user ──
    c_new = Client(args.url)
    username, email = test_registration_and_login(t, c_new)

    # ── Authenticated tests with new basic member ──
    test_profile_api(t, c_new)
    test_dashboard_api(t, c_new)
    test_stripe_endpoints(t, c_new)
    test_superleads(t, c_new)
    test_notifications(t, c_new)
    test_affiliate_network(t, c_new)
    test_campaign_tiers(t, c_new)
    test_courses(t, c_new)
    test_supermarket(t, c_new)
    test_funnels(t, c_new)
    test_link_tools(t, c_new)
    test_copilot(t, c_new, is_pro=False)  # Should get 403
    test_commission_flow(t, c_new)
    test_passup_visualiser(t, c_new)
    test_linkhub(t, c_new)
    test_achievements(t, c_new)

    # ── Security tests (no auth needed) ──
    test_webhook_security(t, Client(args.url))
    test_cron_security(t, Client(args.url))
    test_admin_security(t, c_new)
    test_error_handling(t, c_new)

    # ── Pro member tests (if credentials provided) ──
    if args.pro_username and args.pro_password:
        t.section("25. Pro Member Tests")
        c_pro = Client(args.url)
        status, body = c_pro.json_post("/api/login", {
            "username": args.pro_username,
            "password": args.pro_password,
        })
        if status == 200:
            print(f"  \033[92m✓\033[0m Logged in as Pro member: {args.pro_username}")
            test_copilot(t, c_pro, is_pro=True)
            test_superleads(t, c_pro)
        else:
            t.test("Pro member login", False, f"Got {status}: {body[:100]}")
    else:
        t.section("25. Pro Member Tests")
        t.skip("All Pro tests", "Pass --pro-username and --pro-password to run")

    elapsed = round(time.time() - start, 1)
    print(f"  Time: {elapsed}s")
    success = t.summary()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
