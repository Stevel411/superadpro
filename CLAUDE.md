# CLAUDE.md — SuperAdPro Project Instructions

## Project Overview

SuperAdPro is a video advertising and affiliate marketing platform. FastAPI/Python backend, Jinja2 templates (99) + React frontend (42 pages), PostgreSQL, deployed on Railway auto-deploying from GitHub main branch.

- **Live URL:** https://www.superadpro.com
- **GitHub:** Stevel411/superadpro
- **Domain:** www.superadpro.com (bare domain forwards via GoDaddy)
- **Owner:** Steve (founder, non-coder background, 61, direct iterative working style)

## Architecture

- **Backend:** FastAPI, Python, SQLAlchemy ORM, 370+ routes, 210+ API endpoints, 26 DB models
- **Frontend:** React (Vite build) at `frontend/src/`, served from `static/app/`
- **Templates:** Jinja2 at `templates/` (public pages use dark deep-space theme, member pages use white content with dark sidebar)
- **Database:** PostgreSQL on Railway
- **Storage:** Cloudflare R2 (`superadpro-media` bucket) for avatars/banners
- **Email:** Brevo (transactional + autoresponder), Zoho (noreply@superadpro.com)
- **Payments:** Stripe (cards), USDT/Polygon via Alchemy (crypto)
- **AI:** Anthropic Claude API (Haiku for cost-optimised generation)

## Engineering Principles — NON-NEGOTIABLE

### No Vibe Coding
Diagnose root cause before fixing. If a fix takes more than 2 attempts, stop and rethink the approach entirely. Don't patch repeatedly. Test the actual user flow, not just whether code runs.

### Search Before Fixing Framework Errors
When hitting framework-specific errors (React, FastAPI, SQLAlchemy, Vite, etc.), search the web for the error message/code before attempting a fix. Others will have encountered and solved the same issue. Don't trial-and-error — find the proven solution first.

### No Half Measures
Every feature must be fully thought through logically and executed precisely BEFORE pushing. Trace the COMPLETE flow end-to-end — not just "does the code run" but "does the money go to the right people."

### First Principles
Always diagnose from first principles before writing any fix. Understand the root cause fully — check model definitions, field names, FK constraints, dependency order — before touching code.

### Use Existing Logic
If commission logic exists in a module, USE IT — don't write simplified duplicates in route handlers.

## Mandatory Checks Before Every Push

### 1. Logic Verification
- All `getElementById` calls have matching HTML `id=` attributes
- All event handler functions (`oninput`/`onclick`/`onchange`) are defined
- Save/API payloads match backend field names
- CSS selectors scope correctly (no leaking across groups)
- Full user flow traced end-to-end

### 2. Template Validation (Jinja2)
```bash
python3 -c "from jinja2 import Environment, FileSystemLoader; env = Environment(loader=FileSystemLoader('templates')); env.get_template('FILENAME.html'); print('OK')"
```

### 3. Python AST Validation
```bash
python3 -c "import ast; ast.parse(open('app/main.py').read()); print('OK')"
```

### 4. Git Pattern — ALWAYS
```bash
git pull origin main --rebase && git push origin main
```
Always pull before push to avoid divergence.

## Critical Technical Rules

### Decimal Arithmetic on Money Fields
ALL database money columns are `Numeric(18,6)` which returns Python `Decimal` objects. NEVER use `+=` or `-=` with Python floats on these columns. Always use:
```python
from decimal import Decimal
user.balance = Decimal(str(user.balance or 0)) + Decimal(str(amount))
```
This applies to: `balance`, `total_earned`, `grid_earnings`, `level_earnings`, `course_earnings`, `upline_earnings`, `bonus_earnings`, and any `Money` column.

### Sidebar CSS
`_sidebar.html` contains NO CSS — only HTML. Every internal page template MUST include full sidebar CSS (`.sidebar`, `.nav-scroll`, `.nav-group`, `.nav-header`, `.nav-children`, `.nav-chevron`, `.nav-divider`, `.nav-item`, `.nav-icon`, `.nav-standalone`, `.sidebar-logo`, `.sidebar-brand`, `.sidebar-footer`). Reference: `linkhub-editor.html` lines 19–40.

### Layout Principle
Always use `align-items: stretch` on grid/flex row containers so cards fill equal height. Pair with `display: flex; flex-direction: column` on cards and `flex: 1` on card bodies.

### DB Migrations
New columns must be added to BOTH:
1. The SQLAlchemy model in `database.py`
2. The `run_migrations()` function as `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`

`create_all()` only creates NEW tables — it does NOT add columns to existing tables.

### React Page Routes
Every React page path in `frontend/src/App.jsx` needs a corresponding backend route in `app/main.py` that serves the React `index.html`. Without this, direct URL access returns 404.

```python
@app.get("/your-page")
def your_page(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")
```

### New pip Packages
Add to `requirements.txt`. Railway deployment takes 3-4 minutes instead of the usual 1-2 when new packages are installed.

## Design System

### Public Pages (dark theme)
- Background: `#050d1a`, accents: cyan `#38bdf8` / violet `#8b5cf6`
- Fonts: DM Sans, Rethink Sans, Sora

### Member Pages (light theme)
- Sidebar: dark, exactly 224px width
- Topbar: 72px height
- Content background: `#f0f3f9`
- Content cards: white with `border: 1px solid #e8ecf2`, `border-radius: 14px`
- Hero banners: gradient backgrounds matching Dashboard style (purple/blue gradients, 18px border-radius, 30px padding, Sora font headings)
- Fonts: DM Sans (body), Rethink Sans (UI), Sora (headings/numbers)

### Logo
"SuperAd" in white, "Pro" in cyan `#38bdf8` — rendered via `_sidebar.html` across all pages.

## Compensation Plan — DEFINITIVE (from source code, verified)

### Stream 1: Membership Commissions
- **Tiers:** Basic $20/mo, Pro $35/mo, Creator $59/mo
- **Commission:** 50% of the member's fee goes to their direct sponsor (the person who personally referred them)
- **Amounts:** Basic = $10/mo, Pro = $17.50/mo, Creator = $29.50/mo
- **Renewal cap:** On renewals, the sponsor's commission is capped by the sponsor's OWN tier. A Basic sponsor earning from a Pro referral gets capped at $10, not $17.50. This prevents Basic members earning more than their own tier's value.
- **Recurring:** Paid every month as long as the member stays active
- **Depth:** 1 level only — your direct referrals. NOT multi-level.
- **Source:** `app/payment.py` — `MEMBERSHIP_SPONSOR_SHARE = 10.0`, `_stripe_renew_membership()` with `COMMISSION_CAPS`

### Stream 2: 8×8 Income Grid (Campaign Tiers)
**Structure:** 8 levels × 8 positions per level = 64 positions per grid. NOT a pyramid — every level has exactly 8 slots.

**Tier prices:**
| Tier | Name | Price |
|------|------|-------|
| 1 | Starter | $20 |
| 2 | Builder | $50 |
| 3 | Pro | $100 |
| 4 | Advanced | $200 |
| 5 | Elite | $400 |
| 6 | Premium | $600 |
| 7 | Executive | $800 |
| 8 | Ultimate | $1,000 |

**Commission split per purchase (paid immediately when someone buys a tier):**
- **40% → Direct sponsor** — the person who personally referred the buyer. ONE person gets this.
- **50% → Uni-level pool** — 6.25% × 8 levels up the buyer's SPONSOR CHAIN (not the grid). Each of the 8 people in the chain above the buyer gets 6.25%. If the chain is shorter than 8, remaining levels go to company.
- **5% → Platform** — SuperAdPro operations
- **5% → Grid completion bonus pool** — accrues per seat fill, paid to grid owner when grid reaches 64/64

**CRITICAL: Who earns what from a single purchase:**
- The DIRECT SPONSOR earns 40% ($40 on a $100 tier) + they ALSO get 6.25% ($6.25) as level 1 of the uni-level chain = $46.25 total
- The 7 other people in the sponsor chain above the buyer each get 6.25% ($6.25 on $100)
- You do NOT earn 40% + all 8 uni-level positions. The 40% goes to the direct sponsor. The uni-level goes to 8 DIFFERENT people in the chain.

**Grid completion bonus (paid from the 5% pool when grid fills to 64/64):**
| Tier | Bonus (64 × price × 5%) |
|------|------------------------|
| 1 | $64 |
| 2 | $160 |
| 3 | $320 |
| 4 | $640 |
| 5 | $1,280 |
| 6 | $1,920 |
| 7 | $2,560 |
| 8 | $3,200 |

**Spillover model:** When a member purchases a tier, they fill ONE seat in EVERY upline grid at that tier (walking up the full sponsor chain). One person, one seat per grid advance.

**Qualification rule:** To earn commissions at a tier, you must have an active (or in-grace) video campaign at that SAME tier or higher. 14-day grace period after campaign views are fully delivered. If unqualified, commission goes to company (does NOT walk up).

**Grid auto-renewal:** When a grid completes (64/64), a new grid opens automatically. If the owner didn't have an active campaign at completion, the bonus rolls over into the next grid's pool.

**Source:** `app/grid.py`, `app/database.py` lines 29-101

### Stream 3: Course Marketplace (Infinite Pass-Up)
- **Course tiers:** $100 (Starter), $300 (Advanced), $500 (Elite)
- **Commission:** 100% of the course price on every sale
- **Single sale counter** per affiliate (all tiers combined)
- **Keep/pass-up pattern:** Sales 1, 3, 5, 7, 9+ → you KEEP 100%. Sales 2, 4, 6, 8 → passes up to your pass_up_sponsor.
- **Pass-up sponsor assignment (set at registration):**
  - If you are your sponsor's 1st, 3rd, 5th referral → your pass_up_sponsor = your direct sponsor
  - If you are your sponsor's 2nd, 4th, 6th referral → your pass_up_sponsor = your sponsor's pass_up_sponsor
- **Infinite cascade:** When a pass-up fires, the commission goes to your pass_up_sponsor. If that counts as THEIR 2nd/4th/6th/8th sale, it passes up again to THEIR pass_up_sponsor. This chains infinitely.
- **Qualification:** Must own the course tier to earn commissions on that tier. If the recipient doesn't own the tier, commission goes to company (does NOT walk up). This creates FOMO.
- **Source:** `app/course_engine.py`

### Stream 4: SuperMarket (Digital Products)
- **Split:** Creator 50%, Affiliate 25%, Platform 25%
- **Source:** `app/main.py` line ~2910

## Key Files

| File | Purpose |
|------|---------|
| `app/main.py` | All backend routes (~17,000 lines) |
| `app/grid.py` | Grid engine — commission processing, spillover, qualification |
| `app/course_engine.py` | Course pass-up commission system |
| `app/database.py` | SQLAlchemy models + migrations |
| `app/payment.py` | Membership renewals, auto-activation |
| `app/crypto_payments.py` | USDT/Polygon payment processing |
| `app/stripe_service.py` | Stripe checkout sessions |
| `app/brevo_service.py` | Email sending via Brevo API |
| `app/moderation.py` | AI content moderation (Claude API) |
| `frontend/src/App.jsx` | React router — all page routes |
| `frontend/src/components/layout/Sidebar.jsx` | Sidebar navigation |
| `frontend/src/components/layout/AppLayout.jsx` | Member page layout wrapper |

## Sidebar Structure

Groups: Dashboard | Account | Ad Hub (Watch to Earn, Campaign Tiers, Ad Hub) | Creator Tools (LinkHub, Link Tools, SuperPages🔒) | Super Products | Courses (Library, Marketplace, Create🔒) | Affiliate (Network, Comp Plan, Social Share, Team Messenger, Leaderboard, Achievements, Challenges) | Marketing Suite (Campaign Studio, Niche Finder, Video Scripts, Email Swipes, QR Generator) | Learn (Training Centre)

Pro-locked items (🔒): SuperPages, ProSeller AI, My Leads, Create Course — show grey with lock icon, redirect to `/upgrade`.

## Admin Endpoints

- `/admin/force-migrate?secret=superadpro-owner-2026` — run DB migrations
- `/admin/debug-dashboard?secret=superadpro-owner-2026` — step-by-step dashboard error isolation
- `/admin/fix-owner` — set owner to permanent Pro + admin
- `/admin/seed-owner-campaigns` — seed all 8 campaign tiers for owner
- `/admin/test-grid-e2e?secret=superadpro-owner-2026&tier=1&chain_depth=8&buyers_per_level=2` — E2E grid commission test
- `/admin/test-grid-cleanup?secret=superadpro-owner-2026` — clean up all test data
- `/admin/grid-audit?secret=superadpro-owner-2026&owner_username=SuperAdPro&tier=1` — full grid audit

## Maintenance Reminders

- MaxMind GeoLite2-Country.mmdb — update monthly from maxmind.com
- GitHub token expires mid-Sep 2026 — renew at github.com/settings/tokens
- Run E2E tests quarterly
- Verify Stripe price IDs in Railway vars quarterly

## Steve's Preferences

- Reviews deployed changes on the live URL, gives clear visual feedback
- Prefers targeted fixes over full rebuilds unless necessary
- References external products (Stan Store, Linktree, Leadpages, Craigslist) as design benchmarks
- Design philosophy: simplicity, single colour pickers not preset swatches, font dropdown not card grids
- No opacity dimming on unselected cards — full vibrancy always
- Test credentials: SuperAdPro / SuperAdPro@1411 (2FA enabled)

## Current Status (Updated: 25 March 2026 — Session 2)

### Last Session: 25 March 2026

**Completed:**
- Code splitting with React.lazy — main bundle 2.3MB → 689KB (70% reduction). Used v7_startTransition on BrowserRouter to eliminate white flash on navigation (found via web search). Background preloading of common pages after 2s/5s.
- Notification polling — topbar bell polls every 30 seconds for new messages/alerts.
- New member notifications — sponsor gets email + auto welcome message in Team Messenger on registration. Team Messenger contacts filter fixed (shows all referrals, not just active).
- Password reset fixed — two bugs: (1) reset_token vs reset_url keyword mismatch (500 error), (2) frontend sends new_password but backend reads password (always fails 8-char validation).
- Campaign tier activation routing — link was /activate-tier?tier=1 but React route is /activate/:tierId. Fixed link + added backend route.
- CRITICAL: Grid creation for buyers — process_tier_purchase was paying commissions and filling upline grids but never creating the buyer's own grid. Fixed.
- Campaign tier "active" status — now checks for grid ownership (active or completed), not just video campaigns.
- Commission display — all amounts now show exact 2 decimal places ($1.25 not $1). Income cards, activity feed, network stats all fixed.
- Admin dashboard — sponsor shows @username (ID X) instead of #1, BASIC badge shown in cyan.
- Profile page — sponsor shows @username instead of #1.
- Wallet — commission status fixed from "Pending" to "Paid" (balance already credited).
- Decimal/float safety — final sweep caught remaining issues in course_engine.py, payment.py (deductions), main.py (membership commission None safety). Zero unsafe operations remaining.
- CLAUDE.md created with full project instructions + "Search Before Fixing" engineering principle added.

**Live Testing Results:**
- Stripe membership activation: working perfectly, $10 commission in 25 seconds ✅
- Crypto tier 1 purchase: instant confirmation, $8 direct + $1.25 uni-level commissions correct ✅
- Grid for buyer was NOT created (fixed mid-session) — next test should verify
- steve1 (ID 85) test account active, sponsored by SuperAdPro

**Pending / Next Session:**
- Verify grid creation fix with next tier purchase test
- Full 4-account sponsor chain grid commission test
- Course pass-up cascade fix — write down the intended model and implement
- Dashboard estimator — Steve wants real activity counts not monthly estimates (needs clarification on which component)
- Stripe price update: $30 → $35 Pro, create Creator tier $59/mo
- Live crypto withdrawal test
- Video Creator build (Phase 3 — multi-session)

### Platform Stats
- 99 Jinja2 templates, ~42 React pages, 370+ routes, 210+ API endpoints, 26 DB models
- 3 income streams: Membership, Grid/Campaigns, Courses
- Pricing: Basic $20/mo, Pro $35/mo, Creator $59/mo
- Main JS bundle: 689KB (code-split with background preloading)