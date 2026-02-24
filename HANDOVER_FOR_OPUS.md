# SuperAdPro — Complete Platform Handover Brief
**For:** Claude Opus (new session)  
**Project:** SuperAdPro — video advertising platform with affiliate income system  
**Live URL:** https://superadpro-production.up.railway.app  
**GitHub:** https://github.com/Stevel411/superadpro  
**Stack:** FastAPI + PostgreSQL + Jinja2 templates, deployed on Railway  

---

## WHO IS STEVE (the user)

- 61 years old, works nights, available during the day
- Strong background in forex trading and web development
- Building SuperAdPro as a passive income SaaS business
- **Primary frustration:** Too much time spent fixing code errors and regressions — needs a robust, stable build
- Prefers direct communication, wants problems fixed not explained

---

## WHAT SUPERADPRO IS

A **video advertising platform** where:
- **Advertisers** pay to have their videos watched by real engaged members
- **Members** earn commissions by watching videos and growing their team
- Three income streams create compounding residual income

### The Three Income Streams

**Stream 1 — Membership Income (S1)**
- $20/month recurring membership fee
- 100% of this goes to your direct sponsor (not split)
- Auto-renewed monthly from wallet balance
- 5-day grace period if balance insufficient

**Stream 2 — Profit Engine Grid (S2)**
- 8×8 grid system (63 seats per grid)
- When your grid fills, it "advances" and a new one starts
- Commission split per entry fee paid: 25% direct sponsor / 70% uni-level / 5% platform
- 8 tiers: $20/$50/$100/$200/$400/$600/$800/$1,000
- Tier names: Starter/Builder/Pro/Advanced/Elite/Premium/Executive/Ultimate

**Stream 3 — Course Sales (S3)**
- Marketing Mastery Course
- AI Mastery Course
- Commission structure same as S2 (25/70/5)

### Key Terminology Rules
- NEVER say "matrix", "MLM", "pyramid", "guaranteed", "cycler"
- Say: "Income Grid", "advance" (not cycle), "engaged video views" (not guaranteed views), "uni-level"

---

## TECHNICAL ARCHITECTURE

### File Structure
```
superadpro/
├── app/
│   ├── main.py          # All routes (64 total), helper functions
│   ├── database.py      # SQLAlchemy models, constants, run_migrations()
│   ├── crud.py          # create_user, get_user_by_* functions
│   ├── grid.py          # 8×8 grid engine, commission distribution
│   ├── payment.py       # USDT payment processing, renewals, P2P transfers
│   ├── email_utils.py   # Password reset emails (SMTP)
│   └── video_utils.py   # YouTube/Rumble/Vimeo URL parser, embed builder
├── templates/           # 26 Jinja2 HTML templates
├── requirements.txt
└── Procfile
```

### Key Constants (app/database.py)
```python
GRID_LEVELS   = 8
GRID_TOTAL    = 63        # seats per grid
DIRECT_PCT    = 0.25      # 25% to direct sponsor
UNILEVEL_PCT  = 0.70      # 70% split across 8 upline levels
PER_LEVEL_PCT = 0.0875    # 8.75% per upline level
PLATFORM_PCT  = 0.05      # 5% to platform

GRID_PACKAGES = {1:20, 2:50, 3:100, 4:200, 5:400, 6:600, 7:800, 8:1000}
GRID_TIER_NAMES = {1:"Starter",2:"Builder",3:"Pro",4:"Advanced",
                   5:"Elite",6:"Premium",7:"Executive",8:"Ultimate"}

MEMBERSHIP_FEE = 20.0     # $20/month
```

### Database Tables
- `users` — main user table with balance, earnings columns
- `grids` — 8×8 grid instances per user per tier
- `grid_positions` — seats within each grid
- `commissions` — commission transaction log
- `withdrawals` — withdrawal requests
- `video_campaigns` — advertiser video campaigns
- `video_watches` — watch history per user
- `watch_quotas` — daily watch quota tracking
- `membership_renewals` — auto-renewal records
- `p2p_transfers` — peer-to-peer wallet transfers
- `ai_usage_quotas` — rate limiting for AI tools
- `password_reset_tokens`

### Authentication
- Cookie-based: `user_id` cookie (httponly, 30-day)
- `get_current_user(request, db)` dependency in all protected routes
- Unauthenticated → redirect to `/?login=1` (opens login modal)
- No separate login page — login/register are modals on the public homepage

### Key Routes
```
PUBLIC:
GET  /                    → index.html (has login + register modals)
GET  /how-it-works        → how-it-works.html
GET  /compensation-plan   → compensation-plan.html
GET  /packages            → packages.html
GET  /faq                 → faq.html
GET  /for-advertisers     → for-advertisers.html
GET  /legal               → legal.html
GET  /ref/{username}      → redirects to /?join={username} (opens register modal with sponsor)

AUTH MODALS:
POST /api/register        → JSON endpoint, sets cookie, returns {success, redirect}
POST /api/login           → JSON endpoint, sets cookie, returns {success, redirect}
GET  /login               → redirects to /?login=1
GET  /register            → redirects to /?register=1

MEMBER (all require auth cookie):
GET  /dashboard           → dashboard.html
GET  /income-grid         → income-grid.html
GET  /wallet              → wallet.html
GET  /affiliate           → affiliate.html
GET  /account             → account.html
GET  /watch               → watch.html (Watch & Earn video player)
GET  /video-library       → video-library.html
GET  /upload              → upload-video.html
GET  /campaign-studio     → campaign-studio.html (AI tool)
GET  /niche-finder        → niche-finder.html (AI tool)
GET  /swipe-file          → swipe-file.html
GET  /pay-membership      → pay-membership.html (activate account)

ADMIN (secret-protected):
GET  /admin/force-wipe?secret=superadpro-reset-2026
GET  /admin/run-migrations?secret=superadpro-migrate-2026
GET  /admin/activate-owner?secret=superadpro-owner-2026&username=USERNAME
GET  /admin/db-check?secret=superadpro-migrate-2026
GET  /admin/test-register?secret=superadpro-migrate-2026
GET  /admin/test-dashboard?secret=superadpro-migrate-2026
```

---

## DESIGN SYSTEM — CRITICAL

This is the **single most important thing** to get right. Regressions to wrong themes are Steve's #1 frustration.

### PUBLIC PAGES (/, /how-it-works, /packages, /compensation-plan, /faq, etc.)
- **Background:** Dark deep-space: `#050d1a` or `#0a0f1e`
- **Font:** `Rethink Sans` (Google Fonts)
- **Accent colours:** Cyan `#00b4d8` / `#00d4ff` and Violet `#6d28d9`
- **Text:** White `#ffffff` headings, `rgba(200,220,255,0.7)` body
- **Nav:** Dark `rgba(10,18,40,0.9)` with cyan/violet gradient logo
- **Cards:** `rgba(10,18,40,0.9)` background, `rgba(0,180,216,0.15)` borders

### MEMBER PAGES (dashboard, wallet, affiliate, account, etc.)
- **Sidebar + topbar:** DARK — `#0f172a` sidebar, `#ffffff` topbar with shadow
- **Content area:** WHITE/LIGHT — `#f0f4f8` page background, `#ffffff` cards
- **Sidebar text:** White links, cyan active state
- **Content text:** Dark `#0f172a` headings, `#64748b` secondary
- **Money amounts:** Green `#16a34a` for positive, red `#dc2626` for negative
- **Accent:** Cyan `#00b4d8` and violet `#6d28d9` for buttons/highlights

### Logo
- Hexagon shape with "SAP" or lightning bolt icon
- Gradient: cyan `#00b4d8` → violet `#6d28d9`
- "SUPERADPRO" text in Rethink Sans 800 weight

---

## MODAL SYSTEM (login + register)

Both modals use a **clean naming scheme** (rebuilt from scratch after repeated fragmentation):

```css
.m-overlay  /* position:fixed overlay, rgba(2,6,18,0.88) backdrop */
.m-box      /* dark card #111827, border rgba(0,212,255,0.18) */
.m-close, .m-title, .m-sub, .m-err, .m-field, .m-label, .m-input
.m-row, .m-terms, .m-btn, .m-foot
```

```javascript
mOpen('mLogin')    // open login modal
mOpen('mReg')      // open register modal  
mOpen('mReg', 'username')  // open register with sponsor pre-filled
mClose('mLogin')
mClose('mReg')
// Legacy aliases preserved:
openRegModal(s) → mOpen('mReg', s)
openLoginModal() → mOpen('mLogin')
```

Modal IDs: `id="mLogin"` and `id="mReg"`

Auto-open on page load:
```javascript
if (new URLSearchParams(window.location.search).get('login') === '1') mOpen('mLogin');
if (new URLSearchParams(window.location.search).get('register') === '1') mOpen('mReg');
if (new URLSearchParams(window.location.search).get('join')) mOpen('mReg', join_val);
```

Submit via fetch() to JSON endpoints:
- Register → `POST /api/register` with `{first_name, email, username, password, confirm_password, ref}`
- Login → `POST /api/login` with `{username, password}`

---

## WATCH & EARN SYSTEM

Members must watch videos daily to qualify for commissions:

- **Minimum watch time:** 30 seconds per video (`WATCH_DURATION = 30`)
- **Daily quota:** Based on tier (Tier 1 = 1 video/day minimum)
- **Grace period:** 5 days of missed quotas before commissions pause (`GRACE_DAYS = 5`)
- **Auto-reactivate:** Complete quota → commissions resume automatically
- Timer in JS counts 30s → calls `POST /api/record-watch` with `campaign_id`
- `get_or_create_quota(db, user)` manages quota records
- `get_next_campaign(db, user_id)` returns next unwatched video

---

## AI MARKETING SUITE

Three tools under `/campaign-studio`, `/niche-finder`, `/swipe-file`:

- **AI Campaign Studio** — generates video ad scripts, hooks, CTAs
- **Niche Finder** — identifies profitable niches for campaigns
- **Swipe File** — 60+ curated marketing templates

Rate limiting: 10 AI generations/day per tool via `ai_usage_quotas` table.
AI calls go to `POST /api/campaign-studio/generate` and `POST /api/niche-finder/generate`.
Requires `ANTHROPIC_API_KEY` in Railway environment variables.

---

## CURRENT KNOWN ISSUES (as of handover)

### 1. REGISTRATION BROKEN — DB sequence issue
The registration flow produces "Internal Server Error" because:
- Previous TRUNCATE commands left stale entries in PostgreSQL unique indexes
- Fix: hit `/admin/force-wipe?secret=superadpro-reset-2026` which uses `TRUNCATE ... RESTART IDENTITY CASCADE`
- Then hit `/admin/run-migrations?secret=superadpro-migrate-2026`
- Then register fresh

### 2. PACKAGES PAGE SHOWING WRONG THEME
The `/packages` page is showing an old dark-themed template where the **tier prices are wrong** (showing $10/$25/$50/$100 instead of $20/$50/$100/$200/$400/$600/$800/$1,000).

The correct packages template must:
- Show 8 tiers: $20, $50, $100, $200, $400, $600, $800, $1,000
- Tier names: Starter, Builder, Pro, Advanced, Elite, Premium, Executive, Ultimate
- Use the dark public page theme (cyan/violet, `#050d1a` background)
- Include engaged video views per tier
- "Activate Campaign Tier" buttons

### 3. OTHER PAGES MAY HAVE SIMILAR REGRESSIONS
After recent audit-and-fix commits, some templates may have been overwritten with older versions. All public pages should use the dark deep-space theme. All member pages should use white content + dark sidebar.

---

## RAILWAY ENVIRONMENT VARIABLES NEEDED

```
DATABASE_URL        = (auto-set by Railway PostgreSQL addon)
SECRET_KEY          = (random string for sessions)
COMPANY_WALLET      = (your USDT Base Chain wallet address)
ANTHROPIC_API_KEY   = (for AI tools — currently missing, AI tools won't work without this)
SMTP_HOST           = (for password reset emails)
SMTP_PORT           = 587
SMTP_USER           = (email address)
SMTP_PASS           = (email password)
FROM_EMAIL          = noreply@superadpro.com
BETA_CODE           = (optional — leave unset to allow open registration)
CRON_SECRET         = (for /cron/process-renewals endpoint auth)
```

---

## PENDING TASKS (what Steve wants done)

1. **Fix registration flow** — run force-wipe + migrations, verify fresh registration works end-to-end
2. **Fix packages page** — restore correct 8-tier pricing and dark theme
3. **Audit all public pages** — ensure none have reverted to wrong theme or wrong data
4. **Add ANTHROPIC_API_KEY to Railway** — so AI tools work
5. **Test full member journey:** register → activate membership → watch video → see commissions
6. **SMTP setup** — add env vars so password reset emails work
7. **Remove /dev/reset-watch** before production launch

---

## HOW TO MAKE CODE CHANGES

1. All code lives at `/home/claude/superadpro/` in the Claude computer environment
2. Edit files using `str_replace` or `create_file` tools
3. Always validate Python with: `python3 -c "import ast; ast.parse(open('app/main.py').read())"`
4. Always validate templates with: Jinja2 Environment parse check
5. Commit and push: `git add -A && git commit -m "message" && git push origin main`
6. Railway auto-deploys in ~90 seconds after push
7. Test live at https://superadpro-production.up.railway.app

---

## IMPORTANT PATTERNS TO FOLLOW

### get_dashboard_context() — what it returns
Every member page uses this base context. Never remove a key:
```python
{
    "request", "user", "display_name", "balance", "total_earned",
    "grid_earnings", "level_earnings", "upline_earnings", "sponsor_earnings",
    "personal_referrals", "total_team", "grid_stats", "active_grids",
    "recent_commissions", "sponsor_username", "wallet_address",
    "total_withdrawn", "is_active", "member_id", "GRID_PACKAGES",
    "GRID_TOTAL", "OWNER_PCT", "UPLINE_PCT", "LEVEL_PCT", "renewal"
}
```

### Protected routes pattern
```python
@app.get("/dashboard")
def dashboard(request: Request, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("dashboard.html", ctx)
```

### JSON API endpoints (modals use these)
```python
@app.post("/api/register")
async def api_register(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    # ... validation ...
    response = JSONResponse({"success": True, "redirect": "/dashboard?new=1"})
    set_secure_cookie(response, user.id)
    return response
```

### Never do this (causes opaque redirect issues with fetch())
```python
# BAD — returns 303 redirect which fetch() can't handle
return RedirectResponse(url="/dashboard", status_code=303)
# GOOD — return JSON and let JS redirect
return JSONResponse({"success": True, "redirect": "/dashboard"})
```

---

## GIT HISTORY (recent commits)
The codebase has been actively developed over ~4 days. Recent commits:
- `371372c` — Full platform audit, 26 templates verified, 2 missing templates created
- `a3e5da9` — force-wipe with RESTART IDENTITY CASCADE
- `f5d60ad` — Fix missing text import in reset/force-wipe endpoints  
- `5b5cb50` — Add force-wipe and db-check admin endpoints
- `5e7ebb4` — Full DB reset wipe all tables
- `259c6b4` — Fix registration internal server error (missing DB columns)
- `c2a9273` — Complete modal rebuild (clean CSS/HTML/JS from scratch)

---

## FIRST ACTIONS FOR NEW SESSION

Start by asking Steve to confirm:
1. Has he run `/admin/force-wipe` and `/admin/run-migrations`?
2. Can he register successfully now?
3. Which specific pages look wrong (screenshot helpful)?

Then fix packages.html with correct 8-tier pricing, and do a visual audit of all public pages.

The golden rule: **public pages = dark space theme, member pages = white content + dark sidebar**. Any deviation from this is a regression that must be fixed.
