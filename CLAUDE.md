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

## Income Streams

1. **Membership:** Basic $20/mo, Pro $35/mo, Creator $59/mo. 50% commission to sponsor ($10/$17.50/$29.50).
2. **8×8 Grid/Campaigns:** 8 tiers ($20–$1,000). Commission split: 40% direct sponsor, 50% uni-level (6.25% × 8 levels), 5% platform, 5% bonus pool.
3. **Courses:** 100% commission, pass-up model (sales 2,4,6,8 pass up to pass_up_sponsor). Must own the tier to earn.

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

## Current Status (Updated: 25 March 2026)

### Last Session: 24 March 2026

**Completed:**
- Social Share page — unified single-flow rebuild (pick platform → generate AI post → share). Removed standalone Social Post Generator from sidebar.
- Earnings calculator on /earn — split into two separate calculators (membership monthly recurring vs grid per-purchase)
- Homepage Advertise/Create/Grow card titles — moved below cards and centred
- Campaign Tiers hero banner — rebuilt to match Dashboard gradient style
- Pay It Forward specification document — full blueprint (Company Lead Rotator + Buddy System) saved as .docx
- E2E grid commission test — built and verified. Commissions flow correctly across all 8 levels, spillover works, math = 100%.
- CRITICAL FIX: Decimal/float type mismatch in ALL money operations across grid.py, course_engine.py, payment.py, main.py. Would have crashed every real payment.
- Missing backend routes fixed: /network, /ad-board, /2fa-setup, /supermarket/create
- Full platform robustness scan: 104 templates valid, 19 Python files valid, all pages responding, zero unsafe Decimal operations remaining
- CLAUDE.md created

**Pending / Next Session:**
- Course pass-up cascade fix — currently single-level, needs true infinite cascade (received pass-ups should increment recipient's sale count and trigger their own pass-ups)
- Live crypto payment test — Steve setting up test accounts with USDT on Polygon
- Campaign Tiers card animations — parked, not worth the risk
- Stripe price update: $30 → $35 Pro, create Creator tier $59/mo
- SuperSeller E2E test
- TREASURY_PRIVATE_KEY + POL gas for auto-withdrawals
- Crypto checkout React UI
- Video Creator build (Phase 3 — multi-session)
- Pay It Forward build (post-launch)

### Platform Stats
- 99 Jinja2 templates, ~42 React pages, 370+ routes, 210+ API endpoints, 26 DB models
- 3 income streams: Membership, Grid/Campaigns, Courses
- Pricing: Basic $20/mo, Pro $35/mo, Creator $59/mo
