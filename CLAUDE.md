# CLAUDE.md — SuperAdPro Project Instructions

## 🎯 Most Recent Session (16-17 May 2026) — what shipped

Saturday session, ~12 hours of focused work. All commits live on production.

**Frontend / marketing surface:**
- New `/start` acquisition funnel — full page rebuild
- 3D constellation hero (`@react-three/fiber`, 240 nodes, 380 edges, GSAP scroll choreography across six beats)
- Background video (Pavel Danilyuk Pexels CC0, diverse team stacking hands, landscape 1080p, 5.4MB)
- Cobalt + cyan + white palette (replaced amber/gold throughout)
- Headline: "Be one of the first 100. Locked at $15/mo forever."
- Animated counter counts DOWN from 100 to live `founding_remaining`
- Single CTA per page ("Claim your Founder spot") — bottom CTA removed
- Centred layout, soft section transitions, "Back to top" closer

**Rotator system (the main piece of engineering):**
- `rotator_queue` + `rotator_assignments` tables shipped
- All 23 active Founders auto-enrolled into the queue
- Each click of "Claim your Founder spot" hits `POST /api/start/peek-next-sponsor` which advances the queue and returns the picked Founder's username
- Register page shows "You've been matched with @{founder} — an active Founder"
- Auto-enrol wired into all 4 Founder-creation paths going forward (paid activation, gift, WalletConnect/crypto, balance conversion) — new Founders never need manual queue-addition
- Admin diagnostics page at `/admin/rotator` with verdict banner, queue table, recent assignments, "Re-enrol Founders" button as belt-and-braces

**Founder billing fixes (data integrity):**
- Discovered legacy bug: Founder `membership_expires_at = datetime(2099, 12, 31)` interpreted "lifetime" as "lifetime free access from one $15 payment" instead of "$15/month with price locked for life"
- Fixed forward: paid activation → today + 30 days, gift → today + 30 days
- `process_auto_renewals` in `app/payment.py` now reads `membership_price_locked` — Founders charged $15, Partners $20, sponsor always gets flat $10
- Boot-time data migration migrated 23 legacy 2099-expiry rows to correct monthly billing
- Admin user-detail panel now surfaces `membership_expires_at`, `membership_price_locked`, `is_founding_member`, `founding_spot_number` so this never goes invisible again

**Other:**
- My Campaigns "View" button fixed (was sending users to raw YouTube; now opens `/watch?preview=<id>`)
- Re-engagement broadcast sent to 41 inactive signups (41/41 delivered)
- Fixed bug where stale referral cookie was hijacking the `/start` funnel — frontend now ignores cookies when `via=start`
- Email broadcast to 41 inactive signups (commit `34109559`, `da951544`)

**Key commits (chronological):**
`e13af2b9` Watch preview · `34109559` re-engagement · `f331300e` /start initial · `186e922a` JOIN button + rotator auto-enrol · `538d5995` admin /rotator page · `7fe8e390` Founder activation auto-enrol all 4 paths · `12465e3c` peek-on-click rotation · `a751a1e2` removed duplicate CTA

**Project workflow change:**
Steve created a Claude Project (this one) on 17 May 2026 to separate engineering work (this project) from strategic/brainstorming work (chat sessions outside the project). Going forward: structural engineering happens here with full context; product/brand/business decisions happen in chats outside.

---

## 🎯 Next Up — pick from this list when starting a new session

1. **Member-facing rotator opt-out toggle.** Currently Founders email support to be removed from the rotator. Build a toggle in their account settings page that flips `users.rotator_opted_in`. Estimated 20-30 min.

2. **Rotator dashboard widget for Founders.** Show each opted-in Founder their current queue position + last-assigned timestamp, so they have visibility into when the next signup will come their way. 30-45 min.

3. **Latent `u.sponsor.username` bug in founder_offer broadcast endpoint.** Same pattern that crashed re-engagement dry-run before it was fixed. Won't fire until admin runs `founder_offer` dry-run. 5-min fix.

4. **Live count polling on `/start`.** Re-fetch `/api/start/stats` every 30s while visitor is on page; animate the founding-spots-remaining number down if it changed. Powerful scarcity signal. 10 min.

5. **AI Trading Hub concept** (parked from April) — Pro feature, plain-English strategy → AI bot → backtest → live deploy. Phase 1: Strategy Builder + Backtester. ~3-4 sessions of work. Discuss in chat session first before starting engineering.

6. **BPG strategic positioning flywheel** (parked from 12 May) — BPG showcase on `/credit-nexus`, featured tile on `/creative-studio`, harden non-pack-owner upsell on `/brand-posters`. ~1.5-2 hours focused work.

7. **Command Centre dashboard + menu redesign** — Steve had mockups (`hub-dashboard.html`, `command-centre-desktop.html`, `recruiting-hq-mockup.html`). On hold until launch-incident follow-ups clear.

---

## 🎯 Immediate Next Task (16 May 2026)

**Platform launched 15 May 2026 with incident.** Test12 verified working as Founding Partner #18 on real on-chain payment. Platform is up and serving customers, but the launch session exposed real issues that need follow-up.

**Tomorrow's priority list, ordered by impact:**

1. **BSC scanner cron not firing on schedule.** Confirmed last night — orphan transfers stopped getting filed for 2+ hours, test12's transfer only matched after manual admin trigger. Daily-briefing cron fires fine, so it's specific to the BSC scan cron. Investigate cron-job.org config, Railway scheduler, or whatever wires `/cron/scan-bsc-payments`. **Until fixed: if a paying signup gets stuck, hit `/admin/api/trigger-bsc-scan?from_block=98475000` from your admin browser to recover them.**

2. **Alchemy RPC rate-limiting on free tier.** ~50% of chunks failed during the manual scan last night. Test12's specific block succeeded by luck. Add a backup RPC endpoint (Ankr, QuickNode, or BSC's public RPC) as fallback, or upgrade Alchemy tier.

3. **`SKIP_MIGRATIONS=true` is still set in Railway env vars** — bypasses migrations on every deploy. Safe for now but needs careful unsetting during a quiet window. The proper fix is to move migrations off import-time (eliminates the two-container contention root cause that caused the launch-night outage).

4. **3 stuck NOWPayments orders** (SAP-151-101, SAP-187-99, SAP-224-98) need marking expired. Pure data hygiene.

5. **Jason's orphan transfer** (orphan id 16, 20.83 USDT from `0xa96be...`) needs marking resolved/refunded.

6. **BPG audit + backfill** — run `/admin/api/bpg/audit-and-backfill` (audit only, GET), then `?backfill=true` for anything still salvageable. Endpoint shipped last night.

7. **Translations** — Sprint 1/2/2c added ~40 new English strings (founding partner copy, badge labels, expired-poster banner) not yet translated into the 19 other languages. Spanish/French/German/etc users see English fallback for those strings.

8. **Audit other places that surface raw xAI URLs to the browser.** Creative Studio gallery, posters history page — same proxy pattern as `/api/posters/generation/{id}/candidate/{idx}/image` needs applying everywhere xAI URLs leak to `<img src>`.

9. **Tier 2 admin MCP tools** to build: `activate_user_manually`, `mark_order_expired`, `reconcile_orphan_transfer`, `grant_founding_spot`. All with dry-run mode + audit log. Removes the need for browser-session admin triggers entirely.

10. **CompensationPlan.jsx, PassupVisualiser.jsx, CompensationHubPage.jsx, IncomeMembershipPage, IncomePage** still show old Basic/Pro commission economics in places. Public templates (membership.html, upgrade.html) still reference $35/Pro. Comp plan PDFs in 20 languages outdated.

11. **Member email broadcast** to 15 grandfathered founders + 108 free members announcing Partner Programme.

12. **Command Centre redesign** (the previous "next task" before the launch). Steve had ideas for dashboard + menu restructure — see earlier mockups (`hub-dashboard.html`, `command-centre-desktop.html`, `command-centre-mockup.html`, `recruiting-hq-mockup.html`). Picks up once the launch-incident follow-ups are clear.

## 🚨 Lessons From the 15 May 2026 Launch Incident — INTERNALISE THESE

The launch session was brutal — original SQL bug, multiple deploy hangs, customer payment misdiagnosis, hours of firefighting. Several specific failure modes recurred. Encode them so future sessions don't repeat them.

### Lesson 1 — Verify before declaring done

**The pattern:** ship a fix, claim "done", move on, only to discover the next morning (or via Steve catching it manually) that the fix didn't actually work because no live verification happened.

**The rule:** After ANY change to a money path (activation, commission, payment, withdrawal, founding spot claim), the next action MUST be a live end-to-end test before declaring done. Not just `python -m compileall`. Not just `npm run build`. An actual real-world flow exercised end-to-end against production or a staging mirror. If that's not possible (no test signup available), say so explicitly and mark the task "shipped but not verified" rather than "complete".

### Lesson 2 — Read the SQL before pushing

**The pattern:** the original founding-spot bug was `SELECT COUNT(*) ... FOR UPDATE` — invalid PostgreSQL (FOR UPDATE forbidden with aggregates). Caught silently by a surrounding try/except. Every paying signup since the deploy got mispriced. Cost: ~24 hours of broken signups + manual customer recovery.

**The rule:** any new raw SQL goes through three checks BEFORE the commit: (a) is this valid PostgreSQL syntax — actually parse it mentally or run it against a dev DB; (b) is the try/except wrapping it going to swallow real errors and let the code fall through to a wrong outcome; (c) if this fails for any reason, what's the user-visible failure mode? Bias toward failing loud (raise) over failing silent (fall-through to wrong default).

### Lesson 3 — Investigate before theorising

**The pattern:** Jason payment incident — I built an elaborate "this is a scam" theory based on confidence rather than data. Steve was about to send rude reply variants accusing a paying customer. The actual answer was visible in the database in one query.

**The rule:** when something doesn't match expectations, the FIRST action is `lookup_user(identifier)` / `lookup_payment_by_txid(tx_hash)` / `list_orphan_transfers()` / `recent_signups()`. Never start with a theory. The MCP diagnostic tools exist specifically for this — use them before forming any narrative. If a theory forms anyway, the next action is data verification, not "let me draft three reply variants".

### Lesson 4 — Migrations don't belong at import-time

**The pattern:** Railway redeploy spawned two backend containers running module-level `run_migrations()` simultaneously. Each tried `ALTER TABLE users ...`, deadlocked, ran 5-second lock_timeout, retried forever. The main app couldn't import. The whole site went down. Recovery required emergency `SKIP_MIGRATIONS=true` kill-switch.

**The rule:** migrations don't belong at import-time. Move them to a one-shot release-phase command (Railway pre-deploy hook or equivalent). Until that's done, `SKIP_MIGRATIONS=true` stays in Railway env vars, and any schema change goes through a deliberate manual migration run rather than relying on auto-application on deploy.

### Lesson 5 — Confident-then-wrong is a real failure mode

**The pattern:** multiple times in one session I made a confident call ("Jason is a scammer", "the order is matched", "test11 paid via WalletConnect"), built reasoning around it, then was wrong. Each one wasted Steve's time and risked a real customer outcome.

**The rule:** when about to make a high-stakes confident claim that drives a customer-facing decision (refund / accuse / activate / refuse), pause. Ask: am I pattern-matching from memory or from data this turn? If memory, query the database or the MCP tool FIRST before stating the conclusion. If still uncertain after data lookup, say "I'm not sure" rather than presenting a guess as conviction.

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
- **Payments:** NOWPayments (350+ cryptos + card via Banxa) parallel-running with WalletConnect / self-custody BSC USDT-BEP-20 via Reown AppKit. Outbound withdrawals: BSC USDT-BEP-20 (primary) + TRC-20 via Tron. Polygon USDT inbound is DEPRECATED and being retired (`crypto_payments.py` is legacy, will be removed after 2-week parallel run completes). Stripe fully removed.
- **AI:** Anthropic Claude API (Haiku for cost-optimised generation), xAI Grok API (sales agent, content, prompts), EvoLink + fal.ai (video/image generation)

## The Four Income Streams — CANONICAL REFERENCE

**→ Read `docs/commission-spec.md` FIRST. That file is the locked ground truth for commission rates, tier prices, and payout mechanics.**

The spec at `docs/commission-spec.md` supersedes any commission-related content anywhere else in the repo — including this file, code comments, old spec docs, or memory from previous sessions. If this section and the spec file disagree, the spec file wins. Raise the discrepancy with Steve.

### Why this matters

Earlier versions of this file and various session memories carried fabricated or stale commission numbers ($28,000+ Grid earnings, $97 course prices, "L1/L2/L3" level-based Nexus rates, "$103,976 per Grid cycle", etc.). Steve had to catch these manually across multiple sessions. The spec file exists so every new session starts from confirmed numbers instead of guessing.

### Quick summary (full detail in spec file)

- **Stream 01 Membership (cobalt blue):** 50% commission, capped at sponsor's own tier for both monthly AND annual. Excess retained by company (do not mention in customer-facing copy). Code: `app/main.py::_activate_membership`.
- **Stream 02 Grid (green):** 8×8 grid, 40% direct + 6.25% × 8 levels + 5% completion bonus. Requires active campaign at tier or above to earn. Code: `app/grid.py`.
- **Stream 03 Nexus (purple):** 3×3 matrix per pack (39 positions). **15% direct / 10% spillover** (relationship-based, NOT level-based) + 10% completion bonus. No tier ownership required. 8 independent matrices possible per member. Code: `app/credit_matrix.py`.
- **Stream 04 Courses (amber/orange):** Tier-ownership required. Odd/even 1+Up pass-up structure. Details partially unconfirmed — check spec and ask Steve before publishing. Code: `app/course_engine.py`.

### Cross-stream rules

- All streams coexist — members build all four in whatever order suits them.
- Streams are independent: buying a credit pack doesn't affect your Grid, joining Nexus doesn't affect your Membership stream.
- **DO NOT invent cross-stream mechanics** in public copy. If the code doesn't do it, the page doesn't claim it.
- Before writing ANY public commission copy, read `docs/commission-spec.md` and verify against the source module.

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

### Engine-Level Invariants Over Caller-Passed Flags
When the same business decision needs to be made at multiple callsites (e.g. "is this an upgrade or a fresh activation?", "should sponsor commission be paid?"), implement it INSIDE the engine that makes the decision — not as a flag each caller has to remember to pass correctly.

Why: every caller is one developer-mistake away from getting the flag wrong. As callers multiply, the surface area for silent bugs multiplies with them. The 9 May 2026 commission double-pay bugs (NOWPayments and WalletConnect rails paying sponsor commission on same-tier monthly→annual switches and Basic→Pro Annual upgrades) are the canonical example: three callsites each had different partial logic, and one had no logic at all.

Pattern: the engine examines the *current state* of the entities involved and classifies the operation itself. The classification, not a caller-passed flag, drives the side-effect decisions. Caller-passed flags can remain as advisory hints — log a warning when caller and engine disagree so stale callers surface during development.

The same pattern fixed the test1/test2 stuck-lapsed bug: the original code class was "fragile cooperation between caller and callee, where caller must remember to do X." The fix-forward was "callee enforces the invariant, callers can't get it wrong."

For the membership engine specifically (`_activate_membership` in `app/main.py`): it now calls `_classify_membership_activation(user, target_tier, target_billing)` BEFORE mutating user state, returning one of `"fresh"`, `"reactivation"`, `"tier_upgrade"`, `"cadence_switch"`, `"redundant"`. The classification — not the caller's `is_upgrade` parameter — determines whether sponsor commission is paid. NEVER reintroduce trust in caller-passed flags for the commission decision.

### Reuse Existing Components
Before building ANY new feature, check how similar features work elsewhere in the codebase. If a component exists (e.g. CryptoCheckout, AppLayout, CryptoPaymentOrder flow), USE IT. Never write a custom version of something that already works. Ask: "How does this work everywhere else on the platform?"

### Surgical Changes
Touch only what the request asked for. Do not "improve" adjacent code, comments, formatting, or variable names while editing — even if you'd do it differently. Match the existing style of the file, even where it's inconsistent with your preference. Every changed line must trace directly back to the user's request. If you notice unrelated dead code or a cleanup opportunity, mention it — don't delete it. The only cleanup you own is orphans YOUR changes created (unused imports/variables/functions that became dead because of your edit).

### Goal-Driven Execution
Transform imperative requests into verifiable success criteria before writing code.

- "Fix the bug" → "Write a test or reproduction steps that show the bug, then make them pass"
- "Add validation" → "Write test cases for invalid inputs, then make them fail correctly"
- "Refactor X" → "Define what behaviour must remain identical, verify before and after"

For multi-step tasks, state a brief plan with a verification step for each item:
```
1. [Step] → verify: [what I'll check before moving on]
2. [Step] → verify: [what I'll check before moving on]
```
Strong success criteria let the work be checked objectively. Weak criteria ("make it work") leave room for silent misinterpretation. If the success criteria aren't clear from the request, ask before coding — don't guess.

### Surface Assumptions Before Coding
If the request is ambiguous, state the interpretation you're about to run with before you start — don't silently pick one and proceed. If multiple interpretations are viable and the choice materially affects the approach, present them as options. Push back when a simpler approach exists rather than quietly over-engineering. Stop and name confusion rather than flailing through it — asking one clarifying question costs less than rewriting a wrong answer.

## Claude Code Operating Rules — READ BEFORE FIRST ACTION

If this session is running in Claude Code (local shell access on Steve's machine, not a sandboxed chat interface), the rules below apply on top of everything else in this file. Claude Code can `railway logs`, `psql`, `gh`, `git push`, run the dev server, hit production endpoints, modify env vars — vastly more capability than a chat session. That capability is dangerous without the discipline below.

### Production safety

- **Never push to `main` in the same turn the user requested a change.** Always: make the change → run pre-push checks → SHOW Steve the diff and wait for explicit "go" or "push it" before the actual `git push`. The only exception is genuine production emergencies where Steve has said "just fix it" — and even then, announce the push before doing it.
- **`SKIP_MIGRATIONS=true` is currently set in Railway and must stay set** until migrations are moved off import-time. Don't unset it without an explicit conversation and a maintenance window.
- **Never run destructive SQL on production** (`DELETE`, `DROP`, `TRUNCATE`, `ALTER TABLE ... DROP COLUMN`, untested `UPDATE` without `WHERE` covering only the intended rows). For data corrections, write the SELECT first, show Steve the rows that would be affected, get confirmation, then UPDATE.
- **`docs/commission-spec.md` is the locked ground truth for commission rates and tier prices.** Do not write commission code without reading it. The spec wins over the code if they disagree — raise the discrepancy with Steve, don't silently make the code "match memory".

### Verify before declaring done

- For ANY money path change (activation, commission, payment, withdrawal, founding spot, balance credit), the next action after pushing MUST be a live end-to-end test against production. Not just compileall, not just npm build. An actual real flow.
- If a live test isn't possible right now (no test signup, off-hours), say so explicitly and mark "shipped but not verified" — don't claim "complete".
- After ANY `frontend/src/*` edit: `cd frontend && npm install --legacy-peer-deps && npm run build` and commit `static/app/`. Railway's nixpacks.toml does NOT run npm. Source-only pushes ship a stale bundle silently.
- After ANY `app/*.py` edit: `python3 -m compileall -q app/` before push. Verifies imports and syntax. Won't catch runtime bugs but catches the cheap ones.
- After ANY new raw SQL: read it carefully — does this parse as valid PostgreSQL? Is the try/except going to swallow real errors? What's the user-visible failure if it fails?

### Diagnose with data, not theories

- When something doesn't match expectations, the FIRST action is a database / MCP tool lookup, not a hypothesis. Available diagnostic tools (use them):
  - `lookup_user(identifier)` — full state of one user
  - `lookup_payment_by_txid(tx_hash)` — trace TXID through every payment table
  - `list_orphan_transfers(status)` — unmatched on-chain transfers
  - `recent_signups(hours)` — recent users + activation state
  - `lookup_poster_generation(id)` — BPG generation state + URL probe
  - `platform_pulse` — overall health snapshot
  - `payment_integrity` — stuck payments, expired-not-cleared orders
  - `commission_audit` / `commission_anomalies` — commission correctness
- If you've made a confident wrong call earlier in this conversation, OWN IT. Don't quietly pivot. Say what was wrong and what changed your mind.
- Never psychoanalyse a paying customer based on circumstantial evidence. The Jason incident on 15 May was a customer paying via NOWPayments who Claude was about to accuse of being a scammer. The actual answer was in one database query.

### Deploy mechanics

- Repo: `Stevel411/superadpro`. Author convention for ALL commits: `Claude (via Steve) <claude@superadpro.dev>`.
- Token in env (don't echo): use the GitHub token stored in `.env` or shell config. If missing, ask Steve.
- Railway auto-deploys main. Wait ~2 min per deploy. Check site is back up via `curl https://www.superadpro.com/api/founding-members/status` — JSON response = real app, plain text or hang = still booting / broken.
- If a deploy hangs (Railway shows healthy primitive responder but real endpoints time out), suspect migration contention. With SKIP_MIGRATIONS=true set this shouldn't happen — if it does, something else is wrong, investigate logs.

### Working pattern with Steve

- Steve works night shifts. Long sessions (5-12 hours). Direct iterative style.
- Don't ask clarifying questions when the answer is in the codebase / database. Look first, ask only when genuinely needed.
- Don't expand scope. If Steve asks for X, deliver X. Adjacent improvements that ARE worth doing get raised separately ("I noticed Y while doing X — want me to handle that too?") — never silently included.
- Match Steve's energy. When he's tired and says "just fix it", focus. When he's exploring ideas, brainstorm.
- The default mode is senior engineer doing the work, not assistant suggesting steps for Steve to take. Don't say "you could run X command" — run X command yourself.

### When NOT to use Claude Code

- Marketing copy, customer emails, broadcast announcements — those are fine here but bias toward Steve drafting tone himself
- Strategic decisions (pricing, product direction, comp plan structure) — surface options, Steve picks
- Anything affecting member balances, founding spots, or commission economics in production — verify with Steve before executing

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

⚠️ **Every new React page MUST have ALL of the following — miss any one and the route 404s in production.** This is the most common cause of shipped-but-broken pages.

**Mandatory checklist when adding a new React page:**

1. **React Router** — Add the `<Route>` in `frontend/src/App.jsx` (public or protected as needed)
2. **Component file** — Create the `.jsx` file, usually in `frontend/src/pages/` or `frontend/src/pages/public/`
3. **i18n namespace** — Add keys to `frontend/src/i18n/locales/en.json`, then to all 19 other language files
4. **FastAPI handler** — Add a route in `app/main.py` that serves the React `index.html` (see pattern below)
5. **Vite build** — Run `cd frontend && npm run build` and commit `static/app/`
6. **Python compile check** — Run `python3 -m compileall -q app/` before push

The FastAPI handler is the step that gets forgotten most often. Without it, hitting the URL directly returns `{"detail":"Not Found"}` — the backend intercepts the request before React Router can see it.

```python
# For a public page (no auth needed)
@app.get("/your-page")
def your_page(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)

# For a protected page (user must be logged in)
@app.get("/your-page")
def your_page(request: Request, user: User = Depends(get_current_user)):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)
```

**Verification before considering a new React page "done":** Claim the page is live only after confirming it loads end-to-end at the deployed URL, not after a successful build. "Python compiles" and "Vite builds" are necessary but not sufficient — they don't test the request path a real user takes.

### New pip Packages
Add to `requirements.txt`. Railway deployment takes 3-4 minutes instead of the usual 1-2 when new packages are installed.

### Payment Rails — current architecture (May 2026)

**Three rails, one canonical activator.** The shared activation handler `_nowpayments_activate_product(db, user, order, meta)` in `app/main.py` (~line 7530) is reused by all rails. Adding new product types means editing this handler — it's the single source of truth for fulfilment.

| Rail | Status | Module | Treasury | Inbound? | Outbound? |
|---|---|---|---|---|---|
| **WalletConnect / BSC** | **PRIMARY** (live 6 May 2026) | `app/walletconnect_payments.py` | `0xb2Cc...554D` BSC | ✅ self-custody | ✅ via `app/withdrawals.py` |
| **NOWPayments** | Parallel-running (retiring ~20 May 2026) | `app/nowpayments_service.py` | NOWPayments custodial | ✅ 350+ cryptos + Banxa card | ❌ |
| **Polygon legacy** | DEPRECATED — do not extend | `app/crypto_payments.py` | `0x7174...0467` (dormant) | ❌ disabled | ❌ |

**WalletConnect rail mechanics:**
- Member clicks "Pay with Wallet" on `/upgrade`, `/activate-tier/N`, or `/credit-matrix`
- Frontend `WalletConnectButton.jsx` (lazy-loaded `vendor-walletconnect` chunk, ~266KB gz) calls `POST /api/onchain/create-intent` with `{product_type, product_key, product_meta?}`
- Backend creates `WalletConnectPaymentOrder` with **cent-unique amount** (e.g. $19.97 instead of $20.00 — hash-based offset ±50¢, ~100 unique values per tier). Partial unique index on `(unique_amount) WHERE status='pending'` is the race-proof collision constraint
- Reown AppKit modal opens, member signs USDT-BEP-20 transfer for `unique_amount` to treasury from their own wallet
- Frontend polls `GET /api/onchain/order/{id}` every 4s
- `POST /cron/scan-bsc-payments` (every 30s, CRON_SECRET-gated): expires stale orders → `eth_getLogs` paginated 10-block chunks (Alchemy free tier cap) → match on Decimal exact equality at 6dp → run activator → unmatched transfers persist to `OnchainOrphanTransfer` for support reconciliation
- 15-minute order expiry. After that the order is dead; if a tx arrives late it lands in the orphan table

**Critical constants (single source of truth in `app/withdrawals.py`):**
- `TREASURY_ADDRESS_BSC = "0xb2Ccdf9050A8d05A346F6879eC4fa633f9b2554D"` (env-overridable)
- `USDT_CONTRACT_BSC = "0x55d398326f99059fF775485246999027B3197955"` BSC mainnet
- `USDT_DECIMALS_BSC = 18` — **NOT 6 like Polygon/Tron**. Mixing this up sends effectively zero on-chain (off by 10¹²)
- `BSC_CHAIN_ID = 56`
- `BSC_RPC_URL` — Alchemy free tier, 10-block `eth_getLogs` cap

**Frontend env:**
- `VITE_WALLETCONNECT_PROJECT_ID` — Reown Project ID `b256ce910011e012fedc82dc8c11881b`. If missing at build time, button renders disabled with a "self-custody payment unavailable" message rather than crashing

**Product key naming — match the canonical activator:**
- Membership: `membership_basic`, `membership_pro`, `membership_basic_annual`, `membership_pro_annual`
- Grid: `grid_1` … `grid_8`
- Credit Matrix / Nexus: `credit_matrix_starter`, `credit_matrix_builder`, `credit_matrix_pro`, `credit_matrix_advanced`, `credit_matrix_elite`, `credit_matrix_premium`, `credit_matrix_executive`, `credit_matrix_ultimate` (NOT `nexus_N` — that was a foundation-commit naming guess and was corrected 6 May)
- Email boost: `email_boost_1000`/`5000`/`10000`/`50000`
- SuperScene packs: `superscene_starter`/`creator`/`studio`/`pro`
- Course: `course_starter`/`advanced`/`elite` — **rejected at create-intent** until Uthena MRR rail lands

**Orphan reconciliation:**
- `OnchainOrphanTransfer` captures USDT transfers to treasury that don't match any pending order — late arrivals, rounded-amount sends ($20.00 vs $19.97), spam, withdrawal returns
- `likely_rounded_amount=True` flag for transfers whose amount equals a known base price exactly — high-signal triage candidates
- Admin orphan-resolution UI is queued for next session. Until then, query the table directly: `SELECT * FROM onchain_orphan_transfers WHERE NOT resolved ORDER BY seen_at DESC`

**Diagnostic endpoints:**
- `GET /admin/walletconnect-health` — admin-only, returns `{connected, latest_block, treasury_usdt, treasury_bnb, error}`
- `POST /cron/scan-bsc-payments` (Authorization: Bearer $CRON_SECRET) — manual trigger for the watcher

**The 2-week parallel run plan:**
1. Both rails active. Members can choose either button on checkout
2. Watch `OnchainOrphanTransfer` and the cron's `errors` field daily
3. After 2 weeks of clean operation, hide the NOWPayments button (UI only — keep the IPN endpoint live for in-flight invoices)
4. After 4 weeks, decommission `nowpayments_service.py` and `crypto_payments.py`

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

## Marketing Materials — Downloadable Deck

Members download a 9-slide "4 Income Streams" PowerPoint from `/marketing-materials` (React page `frontend/src/pages/MarketingMaterials.jsx`). Deck is available in 20 languages.

**How it works:**
- UI shows language picker (auto-detects from platform language on mount)
- Slide preview strip shows 9 thumbnails with emoji + stream colour gradient
- Download URL: `/static/downloads/income-streams/SuperAdPro-4-Income-Streams-{LANG}.pptx` (codes UPPERCASE — EN, ES, FR, DE, PT, IT, AR, ZH, JA, KO, RU, HI, NL, PL, TR, VI, TH, ID, TL, SW)
- Files are static — pre-built per language, served directly from the repo

**Deck design:**
- 9 slides, 16:9 layout, stream-coloured backgrounds (cobalt S1, green S2, purple S3, amber S4)
- Two concentric circles in stream colour upper-left (signature visual)
- 30pt stream titles, consistent ~0.4" bottom breathing room across all slides
- Brand terms kept in English in all languages: SuperAdPro, Pro, Basic, Campaign Grid, Credit Nexus, Course Academy, Creative Studio, Income Chains, Pass-Up, UNI-LEVEL, 1+Up

**If regenerating the deck** (e.g. commission change requires updated numbers):
- Build scripts are NOT in the repo — they live in `/home/claude/deck/` during active sessions and get cleaned up between sessions
- To rebuild: use `build-i18n.js` reading strings from `strings/{lang}.json`
- To update copy: change `strings/en.json` first, then translate to all 19 others
- Always commit outputs to `static/downloads/income-streams/` overwriting existing files
- If slide count changes, also update `SLIDE_NAMES`, `SLIDE_COLORS`, emoji array, and "Preview — N Slides" label in `MarketingMaterials.jsx`, then `npm run build` + commit `static/app/`

## Key Files

| File | Purpose |
|------|---------|
| `app/main.py` | All backend routes (~17,000 lines) |
| `app/grid.py` | Grid engine — commission processing, spillover, qualification |
| `app/course_engine.py` | Course pass-up commission system |
| `app/database.py` | SQLAlchemy models + migrations |
| `app/payment.py` | Membership renewals, auto-activation |
| `app/crypto_payments.py` | LEGACY — USDT/Polygon payment processing. Being retired; do NOT add new product types here. Use `walletconnect_payments.py` for the BSC self-custody rail. |
| `app/walletconnect_payments.py` | **PRIMARY** self-custody BSC USDT-BEP-20 rail. Includes `PRODUCT_PRICES`, `create_payment_intent`, `match_incoming_transfer`, watcher (`scan_treasury_transfers`), `health_check`. Hash-based cent-unique amount matching. Order expiry 15 min, watcher cadence 30s. Treasury `0xb2Cc...554D` (shared with outbound withdrawals). |
| `app/nowpayments_service.py` | NOWPayments invoice creation, PRODUCT_CATALOG. Parallel-running with WalletConnect for ~2 weeks before retirement. |
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

## Daily Briefing System

Steve receives a morning email every day summarising platform health, generated by `GET /cron/daily-briefing?secret=$CRON_SECRET`. The endpoint:

1. Computes today's metrics (signups, commissions, audits, anomalies) — see `_compute_daily_metrics()` in `app/main.py`
2. Reads `LAUNCH_LOG.md` from repo root for human-curated context
3. Sends both to Grok 4.1 Fast (Claude Haiku 4.5 fallback) for AI summarisation
4. Emails the summary + raw metrics + a "copy to brief Claude" block via Brevo
5. Persists the briefing in the `daily_briefings` table for history

**Schedule:** Railway cron at 06:00 UTC daily.

**Manual trigger / preview:** `GET /cron/daily-briefing?secret=...&dryrun=1` returns the would-be email as JSON without sending or persisting. Use this to test changes to the metrics function or AI prompt.

**Configuration env vars:** `CRON_SECRET`, `DAILY_BRIEFING_EMAIL`, `DAILY_BRIEFING_NAME`.

**For future-Claude:** When Steve starts a new chat saying "read LAUNCH_LOG.md and brief me" or pastes the daily briefing email contents, that file is the source of truth for current platform state. Read it top-to-bottom before responding. Update its "Recently shipped" and "Currently watching" sections at the end of any session that ships meaningful work.

**Idempotency:** The cron checks for an existing briefing for today's UTC date and skips if one exists. Safe to retry on cron failures.

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

## Current Status (Updated: 24 April 2026)

### Most recent session: 24 April 2026 — Deck Replacement

**Completed:**
- Built new 9-slide "4 Income Streams" deck from scratch (replaced old 5-slide version)
- All commission numbers verified against `docs/commission-spec.md` (one $45/$540 fabrication caught by Steve and corrected mid-session)
- Design refinements: two concentric circles per slide in signature stream colour, 30pt titles, consistent ~0.4" bottom breathing room across all 9 slides, no corner ticks, no ambient dots
- Underlying layout bug fixed on S4 (grid caption was overlapping tier card — affected all languages including EN)
- Translated deck into 19 other languages (ES, FR, DE, PT, IT, AR, ZH, JA, KO, RU, HI, NL, PL, TR, VI, TH, ID, TL, SW) — all Claude-generated, Spanish + Chinese spot-checked for layout, others built clean but not per-slide verified
- 20 `.pptx` files deployed to `static/downloads/income-streams/SuperAdPro-4-Income-Streams-{LANG}.pptx`
- Updated `frontend/src/pages/MarketingMaterials.jsx`: SLIDE_NAMES expanded from 5 to 9, SLIDE_COLORS to 9 matching stream colours, emoji array to 9, label "Preview — 5 Slides" → "Preview — 9 Slides"
- Frontend bundle rebuilt, committed `static/app/`
- Commit `9b10d1d` pushed to main, Railway auto-deployed

**New 9-slide structure:**
1. Cover — 4 Income Streams intro
2. Membership · Opportunity (50%/UNL/2x, income card shows 3 Basic = $30/mo OR 3 Pro = $52.50/mo — never a single fabricated number)
3. Membership · Annual vs Monthly (comparison: $175/mo vs $1,750 upfront)
4. Campaign Grid · Opportunity (40%/6.25%/5%, 8×8 visual)
5. Grid · Math (tier ladder + stacked total $103,976)
6. Credit Nexus · Opportunity (15%/10%/10%, 3×3 matrix, 8 pack tiers)
7. Nexus · Repurchase engine (4-step cycle, $200 pack example = $1,590)
8. Course Academy · Opportunity (100%, 4 pass-ups, uses "Example" tier names because back office will hold real course names)
9. Course Academy · How 1+Up Pass-Up works (12-cell sales 1-12 visualization)

**Translation caveat to remember:** The 18 non-EN, non-ES, non-ZH languages were translated by Claude and not visually verified per-slide. If members report layout issues in a specific language, it's a fast fix — just need language + slide identified.

**Pending (carried from earlier):**
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

### Previous session: 30-31 March + 1 April 2026

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

### Platform Stats
- 99 Jinja2 templates, ~42 React pages, 370+ routes, 210+ API endpoints, 26 DB models
- 4 income streams: Membership, Grid/Campaigns, Courses (coming soon), SuperMarket (coming soon)
- Pricing: Basic $20/mo or $200/yr, Pro $35/mo or $350/yr
- Payments: WalletConnect (self-custody BSC USDT-BEP-20 via Reown AppKit, primary inbound rail) + NOWPayments (350+ cryptos, parallel-running for ~2 weeks before retirement). Polygon legacy. No Stripe.
- Main JS bundle: 579KB index + 1,020KB walletconnect chunk lazy-loaded only on /upgrade, /activate-tier, /credit-matrix (266KB gzipped)

## Maintenance Reminders

- MaxMind GeoLite2-Country.mmdb — update monthly from maxmind.com
- GitHub token "Claude Access" expires mid-Sep 2026
- GitHub token "SuperAdPro Claude" expires ~Apr 30 2026 — renew before then
- Run E2E tests quarterly

### Weekly: API Provider Balance Checks (CRITICAL)
These providers require prepaid balances. If they run dry, member-facing features break silently:
- **fal.ai** (fal.ai/dashboard/billing) — Powers: image generation (Flux, Nano Banana), video (Kling, WAN, Hailuo), Reimagine (img2img). Cost: ~$0.03-0.08 per generation.
- **EvoLink** (evolink.ai dashboard) — Powers: Sora 2, Grok video, exclusive models. Cost: ~$0.05-0.15 per generation.
- **Brevo** (app.brevo.com) — Powers: transactional emails, autoresponder sequences, weekly digest. Check sending limits.
- **NOWPayments** — No prepaid balance needed (charges per transaction), but check for any holds or issues.
- **xAI/Grok** — Check API usage limits and billing status.
Recommended: Keep at least $50 float in fal.ai and EvoLink at all times. Enable low-balance email alerts in each provider dashboard.
