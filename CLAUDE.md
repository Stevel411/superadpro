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
- **Payments:** NOWPayments (350+ cryptos + card via Banxa), direct USDT/USDC on Polygon via Alchemy. Stripe fully removed.
- **AI:** Anthropic Claude API (Haiku for cost-optimised generation), xAI Grok API (sales agent, content, prompts), EvoLink + fal.ai (video/image generation)

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

### Reuse Existing Components
Before building ANY new feature, check how similar features work elsewhere in the codebase. If a component exists (e.g. CryptoCheckout, AppLayout, CryptoPaymentOrder flow), USE IT. Never write a custom version of something that already works. Ask: "How does this work everywhere else on the platform?"

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
- **Tiers:** Basic $20/mo ($200/year), Pro $35/mo ($350/year). Creator tier abandoned.
- **Commission:** 50% of the member's fee goes to their direct sponsor
- **Monthly amounts:** Basic = $10/mo, Pro = $17.50/mo
- **Annual amounts:** Basic = $100 one-time, Pro = $175 one-time (flat 50%, no tier cap)
- **Renewal cap:** On monthly renewals, the sponsor's commission is capped by the sponsor's OWN tier. A Basic sponsor earning from a Pro referral gets capped at $10, not $17.50. Annual payments bypass this cap.
- **Recurring:** Monthly paid every month; annual paid once for 365 days
- **Depth:** 1 level only — your direct referrals. NOT multi-level.
- **Source:** `app/payment.py`, `app/main.py` `_activate_membership()`

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

**CRITICAL: The real earning power is the GRID, not a single purchase.**
The grid has 64 positions (8 levels × 8 wide). Every position that fills in YOUR grid earns you 6.25% of the tier price via the uni-level chain. So the grid owner earns 6.25% × 64 = **400% of the tier price** in uni-level commissions from a full grid, PLUS the 5% completion bonus pool (64 × price × 5% = 320% of tier price), PLUS 40% direct on anyone they personally referred.

**What a completed grid earns the grid owner (uni-level + bonus only, excludes direct referral commissions):**
| Tier | Price | Uni-level (6.25% × 64) | Completion Bonus | Total per Grid |
|------|-------|----------------------|-----------------|---------------|
| 1 | $20 | $80 | $64 | **$144** |
| 2 | $50 | $200 | $160 | **$360** |
| 3 | $100 | $400 | $320 | **$720** |
| 4 | $200 | $800 | $640 | **$1,440** |
| 5 | $400 | $1,600 | $1,280 | **$2,880** |
| 6 | $600 | $2,400 | $1,920 | **$4,320** |
| 7 | $800 | $3,200 | $2,560 | **$5,760** |
| 8 | $1,000 | $4,000 | $3,200 | **$7,200** |

Grids auto-renew after completion — a new grid opens immediately and the cycle repeats.
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
| `app/crypto_payments.py` | USDT/Polygon payment processing, PRODUCT_PRICES |
| `app/nowpayments_service.py` | NOWPayments invoice creation, PRODUCT_CATALOG |
| `app/grok_service.py` | xAI Grok API — chat, content, sales agent |
| `app/grok_imagine.py` | Grok direct video/image generation |
| `app/superscene_evolink.py` | EvoLink/fal.ai video routing, credit calculations |
| `app/stripe_service.py` | DISABLED — Stripe removed, file kept as dead code |
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

## Current Status (Updated: 1 April 2026)

### Recent Sessions: 30-31 March + 1 April 2026

**Completed:**
- Stripe removed entirely — all payments via NOWPayments + direct USDT/USDC
- Annual membership: $200 Basic / $350 Pro, 365-day expiry, flat 50% sponsor commission
- Upgrade page: monthly/annual toggle with SAVE 17% badge
- How It Works page: full 7-section public page with pricing
- SuperScene: 10 video models with real dollar pricing (50% markup), sorted cheapest-first
- SuperScene credit packs: prices corrected for 50% markup ($8/$25/$83/$198)
- SuperScene USDT checkout: uses standard CryptoCheckout component
- SuperScene tabs sync with URL (?tab=packs survives refresh)
- Grok AI: text API (grok_service.py), video+image direct provider (grok_imagine.py)
- Free tools: Meme Generator, QR Code Generator, Social Media Banner Creator
- SEO: sitemap, meta tags, footer links, explore page links
- Codebase audit: Decimal fixes, XSS sanitisation, rate limiting, orphan cleanup
- Autoresponder: fully operational, all 6 cron jobs running on cron-job.org
- Brevo domain auth + FROM_EMAIL configured
- CreateCampaign page wrapped in AppLayout
- Explainer video script written

**Pending:**
- NOWPayments Banxa KYB approval (card payments)
- Non-www redirect (superadpro.com causes redirect loops)
- Google Search Console — submit sitemap
- SuperSeller E2E test
- SuperScene: convert credit system to real USD wallet (pay-per-use)
- TREASURY_PRIVATE_KEY + POL gas for auto-withdrawals
- Duplicate Jinja2/React route cleanup (15 routes)
- MaxMind GeoIP update (last: 17 Mar 2026)
- Course Marketplace (Phase 2)
- SuperMarket (Phase 2)
- How It Works videos + screenshots

### Platform Stats
- 99 Jinja2 templates, ~42 React pages, 370+ routes, 210+ API endpoints, 26 DB models
- 4 income streams: Membership, Grid/Campaigns, Courses (coming soon), SuperMarket (coming soon)
- Pricing: Basic $20/mo or $200/yr, Pro $35/mo or $350/yr
- Payments: NOWPayments (350+ cryptos) + direct USDT/USDC on Polygon. No Stripe.
- Main JS bundle: 689KB (code-split with background preloading)

## Maintenance Reminders

- MaxMind GeoLite2-Country.mmdb — update monthly from maxmind.com
- GitHub token "Claude Access" expires mid-Sep 2026
- GitHub token "SuperAdPro Claude" expires ~Apr 30 2026 — renew before then
- Run E2E tests quarterly# deploy 1775403298
