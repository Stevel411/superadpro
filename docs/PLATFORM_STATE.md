# SuperAdPro — Platform State

> **For next Claude:** This is a snapshot of CURRENT TRUTH about each part of the platform — *not* a session diary. Read this FIRST in every new session. If it conflicts with `CLAUDE.md` or `LAUNCH_LOG.md`, this file wins (it's the most recent).
>
> **For Steve:** Update at the END of every session. Replace, don't append. The narrative of what happened lives in `LAUNCH_LOG.md`. This file answers "what is true right now."

**Last updated:** 2026-05-26 (late evening, after commits `c9c9164` + `b064405`)

---

## Production environment

| Surface | State |
|---|---|
| Domain | `www.superadpro.com` (Cloudflare → Railway). Bare `superadpro.com` only forwards root — ref links must use `www`. |
| Repo | `github.com/Stevel411/superadpro` (private, main branch auto-deploys) |
| Backend | FastAPI / Python on Railway, ~42k lines `app/main.py`, 26 SQLAlchemy models in `app/database.py` |
| Frontend | React/Vite SPA, ~42 pages, served by FastAPI from `static/app/` |
| Templates | ~99 Jinja2 templates (legacy, gradually being migrated to React) |
| Database | PostgreSQL on Railway |
| Media | Cloudflare R2 (`superadpro-media` bucket) |
| Deploy | `git push origin main` → Railway nixpacks build → live in 1-3 min |
| Frontend builds | Nixpacks compiles Python ONLY — frontend must be `npm run build`-ed locally and `static/app/` committed |

---

## Payment rails (locked truth, verify before changing)

| Rail | Status | Notes |
|---|---|---|
| **WalletConnect / BSC** | ✅ LIVE | Self-custody, BSC treasury `0xb2Ccdf9050A8d05A346F6879eC4fa633f9b2554D`. Reown project `b256ce910011e012fedc82dc8c11881b`. Alchemy free-tier RPC, 10-block `eth_getLogs` cap. |
| **NOWPayments** | ✅ LIVE | Inbound crypto signups. CLAUDE.md says "retired" — that is WRONG. Don't trust that claim. |
| **Stripe** | ⚠️ LIVE (with known issue) | Subscription mode for memberships ($15 Founder / $20 Partner / $99 Pro), payment mode for Campaign Tiers + PIF vouchers + custom domains. Webhook delivery reliability issue — see Open Issues. |
| **Polygon** | ❌ Retired | Old wallet `0x7174...` dormant. Don't use. |
| **Stripe legacy field** | ❌ Dead | `User.stripe_subscription_id` is the NEW field (live); a different legacy `User.stripe_subscription_id` reference in old code is dead. |
| **Airwallex** | ❌ Never wired | Mentioned in old docs, never went live. Ignore. |

---

## Income streams (locked truth, 5 May 2026)

| Stream | Affiliate share | Company share |
|---|---|---|
| Membership | 50% | 50% |
| Campaign Tiers (Profit Grid) | 95% | 5% (admin only — not a primary revenue line) |
| Withdrawals | — | $1 flat per withdrawal |
| Credit Nexus | 85% | 15% |
| Courses | 100% | 0% |
| Profit Grid mechanics (per `app/grid.py`) | 40% direct + 50% uni-level (6.25% × 8 levels) + 10% completion-bonus pool | — |

---

## Founder product (locked, 16 May 2026)

- **$15/month, locked for life.** Not a one-time payment.
- **100 spots total.** Atomically claimed via `pg_advisory_xact_lock(7423957)` inside `_activate_membership`.
- **Currently used: 72/100** (Annemiek took #72 on 26 May).
- **Sponsor commission:** flat $10 on every Founder renewal forever. Company keeps $5.
- A Founder's referrals are standard Partners at $20/month with standard $10/$10 split. Founders do NOT change commission economics for their downline.
- Renewal cron (`payment.process_auto_renewals`) reads `membership_price_locked` — Founders charged $15, Partners $20.
- Founder spot is retained after lapse (not reclaimed). If a Founder lapses then reactivates, they get their original spot back.

---

## AI architecture (1 May 2026)

| Model | Use | Key |
|---|---|---|
| Grok 4.1 Fast | All production text AI for member features. Single entry point: `grok_service.ai_text_generate(prompt|messages, system, max_tokens)` | `XAI_API_KEY` |
| Claude (you) | Engineering partner + `watchdog.py` admin diagnostics ONLY. Never serves member features. | — |
| Claude Haiku 4.5 | Silent fallback for grok_service | `ANTHROPIC_API_KEY` |
| EvoLink | Video (Sora 2 Pro, Veo 3.1 exclusives) | `EVOLINK_API_KEY` |
| FAL | Video (Kling/Seedance — cheaper) | `FAL_KEY` |

---

## Funnel/SuperPages system (canonical state, 26 May 2026)

After the cleanup commit `b064405`, this is the WHOLE system:

| Surface | State |
|---|---|
| `/pro/funnels` | ✅ LIVE — gallery page (React) |
| `/pro/funnels/new` | ✅ LIVE — create page, 8 templates + Blank Canvas |
| `/pro/funnel/{id}/edit` | ✅ LIVE — React visual editor |
| `POST /api/funnels/from-template` | ✅ LIVE — uses `app/template_builder.py:BUILDERS` (9 builders including legacy `coaching-program`) |
| `POST /api/funnels/save` | ✅ LIVE — Blank Canvas save |
| `POST /api/funnels/ai-generate` | ❌ **NOT BUILT** — "Coming soon" pill on `/pro/funnels/new`. Pre-decisions needed from Steve before building (see Open Decisions). |
| `/p/{slug}` public render | ✅ LIVE — renders via `templates/funnel-render.html`, supports BOTH `gjs_css` JSON schema (current editor) AND legacy `body_copy` sections schema (orphaned launch-wizard pages). |

**Canonical files:**
- `app/template_builder.py` — `BUILDERS` dict, 9 templates
- `frontend/src/data/funnelTemplates.js` — UI tile registry (8 + Blank Canvas)
- `frontend/src/pages/FunnelsNew.jsx` — create page (contains dead AI modal scaffolding awaiting Session 2)

**Removed in `b064405`** (don't re-add): `app/funnel_templates.py`, `app/main.py.backup`, `/launch-wizard` route, `/api/launch-wizard/*` endpoints (×4), `/api/pro/funnel/create-from-template`, `/api/pro/funnel/templates`, `/api/funnels/templates`, `NICHE_TEMPLATES`/`NICHE_STATS`/`NICHE_STEPS`/`NICHE_TESTIMONIALS` dicts (~350 lines of unreachable niche fallback).

---

## Database integrity (current state)

| Concern | State |
|---|---|
| Members with `expires_at < activated_at` | ✅ HEALED — 18 rows fixed by backfill in `c9c9164` |
| Members with `expires_at IS NULL` | ✅ HEALED — 2 rows fixed by backfill in `c9c9164` |
| Members with `expires_at` 1 day short | ℹ️ Known acceptable — 4 rows, will self-correct on next renewal under fixed webhook |
| Stripe webhook expires_at corruption | ✅ FIXED — `_stripe_handle_invoice_paid` now reads `lines.data[*].period.end`, has invariant guard against writing `expires_at < activated_at` |
| `member_composition.already_expired` count | 0 ✅ |
| `member_composition.no_expiry_set` count | 0 ✅ |
| `commission_audit.overall_status` | healthy ✅ |

---

## Brand identity (locked, no drift)

- **Palette:** cobalt blue (`#0a1438`, `#1e3a8a`), sky/cyan accent (`#06b6d4`, `#0ea5e9`, `#22d3ee`), white. **No amber/gold accents** — only exception is the Profit Grid section on the Video Sales Page (documented exception, not a precedent).
- **Typography:** Sora (headings), DM Sans (body), JetBrains Mono (code/tags).
- **Public pages:** dark deep-space aesthetic with cobalt gradients.
- **Member pages:** white cards on light cobalt/grey background.
- **Tokens:** ~70 CSS variables in the design token system. Use tokens, not hex codes, where they exist.

---

## Messaging discipline (locked)

- **"Tools first" positioning.** Members can use the full toolkit (SuperPages, LinkHub, Creative Studio, Lead Finder, etc.) for their own business without ever referring anyone. The comp plan is optional, not the headline.
- Lead with "AI marketing tools for $20/month," NOT earnings claims.
- No income claims that aren't backed by income disclaimers.
- **Never say "SuperScene"** — always "Creative Studio."

---

## Open issues (ranked by impact)

### Open

1. **Stripe webhook delivery reliability.** TWO members (Annemiek, Kelly) in 24 hours have paid via Stripe but `checkout.session.completed` did NOT reach our handler — both were rescued by the `invoice.paid` self-healing branch (rows show `tx_hash` starting `stripe-invoice-recovery_`). Self-healing is a band-aid; we need root cause. **Needs:** Stripe Dashboard → Developers → Webhooks → endpoint → delivery attempts for 26 May 08:49 UTC (Annemiek) AND 26 May 06:29 UTC (Kelly); Railway logs same windows. Two webhook endpoints exist — verify Stripe is configured to call `/api/stripe/webhook` (line 11646 in `app/main.py` after `b064405`), NOT legacy `/api/webhook/stripe` (returns 410).

2. **Post-signup copy confusion.** Two members in 24 hours have misread the post-payment activation flow as "I have to pay more to access what I bought." Kelly cancelled inside 12 hours. The "Next step: activate a Campaign Tier" line at `app/main.py:_activate_membership` (~line 9696/9699) needs a copy pass — separate "what you just bought" from "optional next step" clearly. Not urgent but actively costing churn.

3. **AI funnel generator not built.** `/pro/funnels/new` has a "Coming soon" pill where the Generate button used to be. Building the proper version is "Session 2" of the funnel cleanup work. Needs Steve pre-decisions:
   - Does AI generate full layout, or fill copy into a chosen template? (Strong recommendation: fill copy.)
   - Input fields: keep niche + audience + story + tone, ADD call-to-action goal?
   - Output guardrails: no income claims, no fabricated stats, length limits, niche filter
   - Post-generation flow: AI fills template → user lands on `/pro/funnel/{id}/edit` to polish

4. **My Marketing hub** not yet built. Per `docs/my-marketing-plan.md` (24 May 2026). Mockups + designs in `/mnt/user-data/outputs/` from the planning session. ~1.5-2 sessions of work, ~3 hours total.

### Tracked but lower priority

- **`docs/commission-spec.md` is out of date** — describes old 8×8/64 grid model. Current truth is in `app/grid.py` header comment (6×6/36, 25 May 2026 change). Spec doc needs update.
- **28 unmatched orphan transfers** (~$500 USDT) — arrived at treasury, couldn't auto-match. Manual reconciliation needed.
- **GridStreamPage fabricated $103,976 hero counter** — needs live numbers or removal.
- **`COMING_SOON_HTML` constant** at `app/main.py:177-270` (~100 lines dead HTML). Code hygiene.
- **`cache_invalidate_user()` namespace coverage** — only clears `dash:` and `analytics:` prefixes, not `descendants:` / `withdrawn:` / `earnings:`. Several commission-credit sites bypass `create_notification()` (the only invalidation site) by writing `Notification(...)` directly.
- **Historical `membership_company` backfill** — every membership activation since WalletConnect went live is missing its company-side commission row. No missing money; bookkeeping only.
- **`/achievements` page is still Jinja** — should be migrated to React route.
- **i18n translation pass** — 19 frontend locales need pricing-tier key updates (commit `863ae66`); 6 backend training locales need translation against 18-lesson corpus (commit `c0d2643`).
- **Custom Domain v2 sessions 2-4** — promoted out of labs but follow-up work not done.
- **Share-code XSS test** — never executed.
- **Stripe reconciliation cron** — never scheduled.
- **`COLOR-1` polish** at `ElementInspectorPanel.jsx:4566`.
- **R2 hero background filename** — `marketing-bg/R9K1t.jpg` should probably be renamed to something descriptive like `growth-hero-bg.jpg`.

---

## Open product decisions (awaiting Steve)

Things Claude can't move on without your call:

1. **AI funnel generator design** (4 questions above under Open Issue #3).
2. **My Marketing hub launch timing** — Steve needs to contact members for testimonial quote permission before launch.
3. **Dashboard "Active Members" count semantics** — should it include or exclude the (now zero) expired-but-flagged-active members? With the integrity fix shipped, this is moot for now, but the semantic question is open.

---

## Operational cron / scheduled work

| Service | Schedule | Status |
|---|---|---|
| `daily-briefing-cron` | `0 6 * * * UTC` | ✅ Live — image `curlimages/curl:latest`, calls `/cron/daily-briefing?secret=$CRON_SECRET`. Email to `stevelawsonmarketing@gmail.com`. Idempotent per UTC date. |
| `process_auto_renewals` | (in-process) | ✅ Live — wallet-balance renewals for monthly members. Stripe renewals handled by Stripe directly. |
| BSC scanner | (in-process) | ✅ Live — Layers 1-6 reliability work shipped (24 May). Self-healing cursor + silent-empty-result detection + cross-run retry + reconciler. |

---

## How to verify any claim in this file

| Claim type | How to verify |
|---|---|
| Commission rates / payouts | Read `docs/commission-spec.md`. If spec contradicts code, raise with Steve. |
| Live DB state | Use SuperAdPro Monitoring MCP — `member_composition`, `lookup_user`, `commission_audit`, `platform_pulse`. Cached 60s. |
| Specific user state | `lookup_user(identifier=...)` |
| Commit history | `git log` in the cloned repo |
| Schema | Read `app/database.py` directly |
| Active route | `grep -n "@app\." app/main.py` |
| Brand colours | `static/design-tokens.css` |

---

## Things known to be MISLEADING in other docs

Be skeptical of:

- **`CLAUDE.md`** claims NOWPayments is "retired" — WRONG. It's live.
- **`docs/commission-spec.md`** describes 8×8/64 grid — WRONG. Current is 6×6/36.
- **Old `LAUNCH_LOG.md` entries** may reference webhook endpoints, payment rails, or product details that have since changed. Most recent entry wins; cross-check against this file.
- Past handover docs may include claims that turned out to be incorrect (e.g. the 26 May handover said `/funnels/visual` was a 404 — it's actually a 302 redirect to the React editor; the real issue was schema mismatch, not the URL).
