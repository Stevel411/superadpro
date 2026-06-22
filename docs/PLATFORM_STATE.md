# SuperAdPro — Platform State

> **For next Claude:** This is a snapshot of CURRENT TRUTH about each part of the platform — *not* a session diary. Read this FIRST in every new session. If it conflicts with `CLAUDE.md` or `LAUNCH_LOG.md`, this file wins (it's the most recent).
>
> **For Steve:** Update at the END of every session. Replace, don't append. The narrative of what happened lives in `LAUNCH_LOG.md`. This file answers "what is true right now."

**Last updated:** 2026-06-09 (Mon/Tue night, after payment-data-recovery session — HEAD `a812f3c`; see `handover-2026-06-09.md`)

---

## Production environment

| Surface | State |
|---|---|
| Domain | `www.superadpro.com` (Cloudflare → Railway). Bare `superadpro.com` only forwards root — ref links must use `www`. |
| Repo | `github.com/Stevel411/superadpro` (private, main branch auto-deploys) |
| Backend | FastAPI / Python on Railway, ~43k lines `app/main.py`, 26 SQLAlchemy models in `app/database.py` |
| Frontend | React/Vite SPA, ~43 pages (TeamGiftAccept added today), served by FastAPI from `static/app/` |
| Templates | ~99 Jinja2 templates (legacy, gradually being migrated to React) |
| Database | PostgreSQL on Railway |
| Media | Cloudflare R2 (`superadpro-media` bucket) |
| Deploy | `git push origin main` → Railway nixpacks build → live in 1-3 min |
| Frontend builds | Nixpacks compiles Python ONLY — frontend must be `npm run build`-ed locally and `static/app/` committed |

---

## Payment rails (locked truth, verify before changing)

| Rail | Status | Notes |
|---|---|---|
| **WalletConnect / BSC** | ✅ LIVE (with intermittent stall risk) | Self-custody, BSC treasury `0xb2Ccdf9050A8d05A346F6879eC4fa633f9b2554D`. Reown project `b256ce910011e012fedc82dc8c11881b`. Alchemy free-tier RPC, 10-block `eth_getLogs` cap. **Scanner went silently stalled for ~6.5 hours on 27 May (06:18 → 13:47 UTC)** — see Open Issues. |
| **NOWPayments** | ✅ LIVE | Inbound crypto signups. CLAUDE.md says "retired" — that is WRONG. Don't trust that claim. |
| **Stripe** | ⚠️ LIVE (with known webhook reliability issue) | Subscription mode for memberships ($15 Founder / $20 Partner / $99 Pro), payment mode for Campaign Tiers + PIF vouchers + custom domains. Webhook delivery reliability issue — see Open Issues. |
| **Polygon** | ❌ Retired | Old wallet `0x7174...` dormant. Don't use. |
| **Stripe legacy field** | ❌ Dead | `User.stripe_subscription_id` is the NEW field (live); a different legacy `User.stripe_subscription_id` reference in old code is dead. |
| **Airwallex** | ❌ Never wired | Mentioned in old docs, never went live. Ignore. |

---

## Payment-data recovery — current truth (post-3-Jun breach, updated 2026-06-09)

The breach wiped order/mirror rows (`payments`, `stripe_charges`, `nowpayments_orders`, `walletconnect_payment_orders`). The payments themselves are permanent in the gateways' live APIs (Stripe, NOWPayments) and on-chain. **Never treat the mirror tables as source of truth.** Orphan queue = **0**.

| Recovery item | State |
|---|---|
| Stripe charges | ✅ Recovered — 92 record-only `StripeCharge` rows written via `Charge.list()` (the old `BalanceTransaction.list(type="charge")` + `ch_` filter missed `payment`-typed `py_` charges). |
| Off-rail payers (bank / off-coin) | ✅ itsamazing 179 (bank), bestonthenetinfo 228 (bank), worksmarter 181 (nowpayments_eth) — record-only `Payment` rows written, channel-tagged. |
| connect 365 | ✅ Explained — real NOWPayments `partially_paid` (~$14.72 of $15); order in DB. |
| 6 BSC-direct membership payers (196,205,290,352,374,303) | ⚠️ **VERIFIED, NOT YET WRITTEN** — apply `onchain-historical-reconcile` (do-first). |
| verokins 325, cryptobase26 351 | ⏸ PARKED — founding $15, no provable payment post-wipe (WC unique-amount link destroyed). Watch for renewal. Do not guess-assign. |
| mattfeast 152 Tier 1 (~$20) | ⏳ Breach-wiped tier payment, recoverable via on-chain technique around its `GridPosition.created_at`. |

**`member_composition` caveat:** its "comped" count = "no surviving payment record," NOT deliberate free accounts. Cross-check with ground truth.

**NOWPayments:** list-payments (`GET /v1/payment`) is JWT-only — needs `NOWPAYMENTS_EMAIL`/`NOWPAYMENTS_PASSWORD` (now in Railway env; deletable post-recovery). `get_payment_status(id)` works with the `x-api-key`. Forwarding hot wallet (pools member payments → treasury): `0xa96be652a08d9905f15b7fbe2255708709becd09`.

**WC unique amounts:** `base ± up to 50¢` (`UNIQUE_RANGE_CENTS=50`), deterministic from `(user_id, order_id)`. Founding band $14.50–$15.50. Order_id wiped → exact recompute impossible → post-wipe direct payments cannot be provably attributed.

**Forensic toolkit (admin GETs, Steve loads from browser; write endpoints = dry-run default + 2FA on `&apply=1&code=`):**
- `gateway-forensics?user_ids=` — DB mirror + live Stripe + live NOWPayments per user (read-only)
- `treasury-scan?after=ISO&before=ISO` — treasury USDT inbound + attribution flags (read-only; tight windows)
- `gift-activation-check?user_ids=` — GiftVoucher claimed-by (read-only)
- `onchain-historical-reconcile?user_ids=` — match wiped direct-WC payments to treasury inbound (WRITE)
- `record-offrail-payment?entries=uid:amount:channel[:date]` — channel-tagged record-only Payment (WRITE)
- `stripe-charge-backfill` — `Charge.list()` recovery, resumable (WRITE)

**Polygon (re-confirmed closed 2026-06-09):** gateway 410-gated; `WalletConnect.jsx` forces BSC. The only stale "switch to Polygon" copy was in dead `WalletGuideCard.jsx` (now deleted). No live misdirection exists.

**Attacker accounts 670/673/674:** DELETED by Steve (the LAUNCH_LOG "do not delete — evidence" note is stale).

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

## Founder product (locked, 16 May 2026; **deadline added 27 May 2026**)

- **$15/month, locked for life.** Not a one-time payment.
- **Annual option live (added 27 May 2026 evening):** Founder $150/year, Partner $200/year. All four rails wired (Stripe card, NOWPayments crypto, wallet — wallet still gated to crypto for annual). Stripe annual Price IDs in env vars `STRIPE_FOUNDER_ANNUAL_PRICE_ID` and `STRIPE_PARTNER_ANNUAL_PRICE_ID`. Webhook handlers (`_stripe_handle_checkout_completed` + self-healing `_stripe_handle_invoice_paid`) both read `billing` from session metadata so annual cadence flows through correctly. Sponsor commission rule: $100 (10× monthly) per annual activation.
- **100 spots total.** Atomically claimed via `pg_advisory_xact_lock(7423957)` inside `_activate_membership`.
- **Currently used: 95/100** (5 real spots remaining: #81, #85, #88, #91, #96). Note: ~6 spots are held by test/admin accounts (incl. Master Affiliate user #1) — deliberately left in place, see note below. Real paying founders top out around ~94.
- **POST-CAP STRATEGY (Steve, 28 May 2026):** once the remaining Founder spots are gone, the entire focus is acquiring **Partners at $20/month** ($10 to the business per signup). No more Founder mechanics needed. The Founder offer was a launch accelerant; Partner volume is the ongoing revenue engine.
- **🆕 DEADLINE: 2026-05-29 23:59 UTC.** Offer closes on **whichever comes first**: 100 spots claimed OR deadline passed.
  - Stored as ISO timestamp in `app_config['founder_offer_close_at']`.
  - Helper `_founder_offer_still_open(db)` in `app/main.py` is the canonical check.
  - Wired into 3 public activation rails: `_activate_membership`, balance-rail, gift-claim.
  - Admin tools (`/admin/founder-promote-from-balance`, Stripe recovery) intentionally bypass — admin can still promote case-by-case.
  - Admin endpoints: `GET /admin/api/founder-offer-status` (read), `POST /admin/api/founder-offer-deadline` (update).
- **Sponsor commission:** flat $10 on every Founder renewal forever. Company keeps $5.
- A Founder's referrals are standard Partners at $20/month with standard $10/$10 split. Founders do NOT change commission economics for their downline.
- Renewal cron (`payment.process_auto_renewals`) reads `membership_price_locked` — Founders charged $15, Partners $20.
- Founder spot is retained after lapse (not reclaimed). If a Founder lapses then reactivates, they get their original spot back.

---

## Team gifting (added 27 May 2026 — FEATURE-FLAGGED OFF)

Direct-to-team gifting flow. Members gift a $20 membership directly to an inactive direct referral; recipient gets a notification, has **7 days** to accept or decline.

**State: BUILT BUT DISABLED.** Default `app_config['team_gifting_enabled'] = 'false'`.

**To enable post-Founder-offer-close (Saturday 30 May or later):**
```
POST /admin/api/team-gifting-flag {"enabled": true}
```

**Why disabled:** the 7-day acceptance window could straddle the Founder cap. Disabled until the Founder offer closes to avoid edge cases.

**Schema:** `gift_vouchers` extended with `reserved_for_user_id` (FK users) + `reserved_until` (datetime).
**Status values added:** `reserved` (awaiting consent), `declined`, `expired`.

**Backend endpoints (all in `app/main.py`):**
- `GET /api/pay-it-forward/giftable-team` — lists inactive direct referrals + vouchers needing re-target. Lazy-expires reserved vouchers past their window.
- `POST /api/pay-it-forward/create-team-gift` — body `{recipient_user_id, personal_message, pay_method: 'wallet'|'crypto'}`. Wallet immediate; crypto via NOWPayments invoice.
- `GET /api/gift/team/{code}/preview` — recipient-facing preview, auth-required.
- `POST /api/gift/team/{code}/accept` — recipient accepts. Full activation (including Founder allocation honouring `_founder_offer_still_open`). $10 sponsor commission paid via `gift_membership_sponsor` type.
- `POST /api/gift/team/{code}/decline` — recipient declines. No refund. Voucher → status `declined`.
- `POST /api/pay-it-forward/retarget/{code}` — gifter re-targets `{action: 'retarget', new_recipient_user_id}` OR converts `{action: 'convert_to_shareable'}`.

**Frontend:**
- New route `/gift/team/:code` (placed BEFORE `/gift/:code` in App.jsx — React Router order matters)
- New page `frontend/src/pages/TeamGiftAccept.jsx` (recipient accept/decline UI)
- Card added to `PayItForward.jsx` — only renders when `teamData.enabled === true`

**Safety invariants:**
- Recipient must be in gifter's direct downline (`sponsor_id` check)
- Recipient must be inactive at create AND at acceptance
- Cannot double-gift same recipient (returns 400 with existing voucher code)
- Voucher acceptance is idempotent (status check before activation)

---

## Dashboard Founder banner (updated 27 May 2026)

Component `frontend/src/components/FoundingPartnerBanner.jsx`. Rendered near the top of `Dashboard.jsx`. Polls `/api/founding-members/status` every 60s; countdown ticks locally every 1s.

**Now shows to ALL logged-in users (was: free members only), with role-aware CTA:**

| Audience | Eyebrow | CTA |
|---|---|---|
| Free members | "Final Call · Founding Partner Circle" | "Claim Your Seat →" → `/upgrade` |
| Active members | "Final Call · Push your team before Friday" | "Push my team →" → `/my-team` |

Auto-hides when `status.is_open === false` (count filled OR deadline passed). Per-session dismissable. Visual treatment is gold/amber — documented brand exception, predates the cobalt+cyan lock.

**API extension:** `/api/founding-members/status` now returns `deadline_utc`, `closed_by` (`null` | `'count_cap'` | `'deadline'`), `now_utc`.

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

## Funnel/SuperPages system (canonical state, 26 May 2026 — unchanged today)

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

---

## Admin tooling additions (this session)

| Endpoint | What it does |
|---|---|
| `GET /admin/api/founder-offer-status` | Returns `{is_open, current_founder_count, spots_remaining, deadline_utc, closed_by, now_utc}`. Mirrors the helper's logic so what admin sees matches what activation rails see. |
| `POST /admin/api/founder-offer-deadline` | Body `{deadline_utc: "ISO-8601" | null}`. Update deadline at runtime — extend, shorten, or remove (`null` = count-cap only). |
| `GET /admin/api/team-gifting-flag` | Returns `{enabled: bool}`. |
| `POST /admin/api/team-gifting-flag` | Body `{enabled: bool}`. Flip the team gifting feature flag. |

`/admin/finances` dashboard + `/admin/api/finance-summary` from yesterday remain live.

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

- **Palette:** cobalt blue (`#0a1438`, `#1e3a8a`), sky/cyan accent (`#06b6d4`, `#0ea5e9`, `#22d3ee`), white. **No amber/gold accents** — only exceptions are (a) the Profit Grid section on the Video Sales Page, and (b) the FoundingPartnerBanner gold treatment (predates the brand lock). Neither is a precedent.
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

### Active and time-sensitive

1. **🆕 Database backups have been failing for weeks.** Symptom: scheduler logs "Backup file too small — likely empty database or auth error" twice daily. Root cause: `pg_dump` binary is not installed in the Railway container. nixpacks auto-detected `postgresql_16.dev` provides headers for compiling psycopg2 but NOT the pg_dump binary. **No working backup exists.** Attempted fix on 27 May by adding `postgresql_17` to nixpacks; Railway build failed (package name issue — need to find correct nixpkgs package, possibly `postgresql` plain or `postgresql_15`, or switch to a Dockerfile installing via apt). Reverted to unblock annual-billing deploy. Code-side diagnostics improved in commits `4f28387` + `085f6b3` (pipefail, real pg_dump stderr surfaced, GET trigger endpoint at `/admin/api/backup/run`) — when correct package is installed, fix will Just Work. **TOP PRIORITY.**

2. **🆕 Revenue display bug (cosmetic, unfixed).** Admin dashboard Overview tab shows Total Revenue with three decimal places (e.g. "$2,668.486"). Currency should render at 2 dp. Formatting-only — underlying data is fine. The fractional third digit suggests revenue is summed from values carrying sub-cent precision (crypto conversions / commission math). Fix is the display formatter, not the data. Quick fix next time in the admin finance UI.

3. **BSC scanner can silently stall for hours.** On 27 May the in-process scanner produced zero scans from 06:18 UTC to 13:47 UTC (~6.5 hours). Root cause: orphaned Postgres advisory lock held by a dead connection. Resolved by Railway service restart. **NEEDS:** monitoring alarm — if no `bsc-scan tick` log line containing "scanned=N" fires within 5 minutes, alert. This is the gap the planned daily integrity-check cron would close.

4. **Stripe webhook delivery reliability (still open).** Members hit the `invoice.paid` self-healing branch because `checkout.session.completed` doesn't always arrive (rows show `tx_hash` starting `stripe-invoice-recovery_`). Separate from the race bug below (that was both webhooks arriving and racing; this is one not arriving). Needs Stripe Dashboard delivery-attempt investigation. Verify Stripe calls `/api/stripe/webhook`, NOT legacy `/api/webhook/stripe` (410).

5. **Post-signup copy confusion (still open).** The "Next step: activate a Campaign Tier" line at `app/main.py:_activate_membership` needs a copy pass. Cost Kelly her membership 26 May.

### Resolved this session (28 May 2026) — kept for reference

- **✅ Duplicate sponsor commissions (Stripe webhook race).** Found via Floyd/@ourfreedom's $30-with-2-referrals question. Two webhooks (checkout.session.completed + invoice.paid) hitting different replicas within ~350ms both read is_active=False, both paid the sponsor. 8 duplicates platform-wide, $80 over-paid, $30 recovered, $50 absorbed (earnwithdarius had already withdrawn). Three-layer fix shipped (`d952cfb` + `9de748a`): per-user advisory lock + is_active recheck + DB partial-unique-index on (from_user, to_user, type, source_event_id). Verified zero duplicates since. Cleanup tooling: `/admin/api/user-commissions/{username}`, `/admin/api/audit-double-pays`, `/admin/api/sweep-double-pays?confirm=yes`, `/admin/api/reverse-commission/{id}`.
- **✅ Founder allocator closed offer 9 spots early (MAX vs COUNT bug).** Found via Steve spotting "95 active / 91 founders" on dashboard. Allocator gated on `max_spot_taken < 100` AND assigned `MAX+1`; demoted-account gaps in spot numbering pushed MAX to 100 while COUNT was 91, slamming the offer shut early. 4 members (williamnormanii, earnwithjason, earningcreator, michellg) paid $20 Partner while spots were open. Fixed (`1d6938e`): cap on COUNT only, spot assignment fills lowest gap ≤100. The 4 retroactively converted to Founders @ $15 locked, silently, via `/admin/api/grant-founder/{username}` (spots 62, 69, 73, 77). $5 differences NOT refunded unless member asks (Steve's call).

### Tracked

- **AI funnel generator not built.** `/pro/funnels/new` has a "Coming soon" pill. Pre-decisions needed from Steve (see Open Decisions).
- **My Marketing hub** not yet built. Per `docs/my-marketing-plan.md`.
- **`docs/commission-spec.md` is out of date** — describes old 8×8/64 grid. Current is 6×6/36 per `app/grid.py`.
- **28 unmatched orphan transfers** (~$500 USDT) — manual reconciliation needed.
- **GridStreamPage fabricated $103,976 hero counter** — needs live numbers or removal.
- **`COMING_SOON_HTML` constant** at `app/main.py:177-270` (~100 lines dead HTML). Code hygiene.
- **`cache_invalidate_user()` namespace coverage** — only clears `dash:` and `analytics:`, not `descendants:`/`withdrawn:`/`earnings:`.
- **Historical `membership_company` backfill** — every membership activation since WalletConnect went live is missing its company-side commission row. No missing money; bookkeeping only.
- **`/achievements` page is still Jinja** — should be migrated to React route.
- **i18n translation pass** — 19 frontend locales need pricing-tier key updates (commit `863ae66`); 6 backend training locales need translation against 18-lesson corpus (commit `c0d2643`).
- **Custom Domain v2 sessions 2-4** — promoted out of labs but follow-up work not done.
- **Share-code XSS test** — never executed.
- **Stripe reconciliation cron** — never scheduled.
- **`COLOR-1` polish** at `ElementInspectorPanel.jsx:4566`.
- **R2 hero background filename** — `marketing-bg/R9K1t.jpg` should probably be renamed to something descriptive.
- **🆕 Creative Studio video generator** shows raw HTML on upstream 502s. JSONDecodeError path should catch and show user-friendly error + auto-retry once. Credits-refund behaviour on upstream failure also needs verification.
- **🆕 Broadcast plain-text detection edge case:** the `_normalise_broadcast_body` helper detects HTML via block tags (p, div, br, h1-6, ul, ol, li, table, etc.). Inline tags like `<strong>` or `<em>` in plain-text input get escaped to literal text. Acceptable for now; document this so the next admin who writes `<strong>bold</strong>` in a plain-text email understands why it appears literally.

---

## Open product decisions (awaiting Steve)

1. **AI funnel generator design** — does AI generate full layout, or fill copy into a chosen template? Input fields? Output guardrails? Post-generation flow?
2. **My Marketing hub launch timing** — Steve needs to contact members for testimonial quote permission before launch.
3. **Dashboard "Active Members" count semantics** — should it include or exclude the (now zero) expired-but-flagged-active members?
4. **🆕 Creative Studio v2 — the asymmetric bet (added 27 May 2026 evening).** Draft brief lives at `docs/creative-studio-v2-brief.md`. Steve's instinct (confirmed via competitor-strategy exercise): build a category-leading creative tool that's affiliate-aware, funnel-integrated, and brand-memory-locked — the one move a smart competitor can't out-execute in 12 months. Brief has good bones, needs answers to 8 foundational questions before becoming real scope (positioning, success metric, build vs partner vs raise, relationship to existing Creative Studio, etc.). Decision point: post-Founder-cap-close, run a dedicated scoping session — not a building session. 5 member conversations between now and Saturday will sharpen the direction.
5. **🆕 Welcome Banner Template (added 27 May 2026 evening).** Members are requesting a personalised "Welcome to SuperAdPro" banner generator for their new team members. Spec saved at `docs/welcome-banner-template-spec.md`. Steve's preferred aesthetic is the Sayeam Ahmed sunset version (Miami sunset, Ferrari + yacht, single person right-side). Recommended path: Option A (templated overlay using a fixed AI-generated background + photo upload with background removal + name overlay). Slot into the existing Brand Poster Generator as a new template, NOT a parallel tool. Estimated 1-2 days engineering after Saturday's design decisions. Ship target: Monday or alongside Saturday's team-gifting launch.

---

## Operational cron / scheduled work

| Service | Schedule | Status |
|---|---|---|
| `daily-briefing-cron` | `0 6 * * * UTC` | ✅ Live — image `curlimages/curl:latest`, calls `/cron/daily-briefing?secret=$CRON_SECRET`. **CRON_SECRET sync fixed 27 May** (was mismatched with main service). Email to `stevelawsonmarketing@gmail.com`. Idempotent per UTC date. |
| `stuck-lapsed-alert-cron` | (per Railway) | ✅ Live — same secret-sync issue as daily-briefing; **fixed 27 May**. |
| `process_auto_renewals` | `0 6 * * * UTC` (rides daily-briefing) | ✅ Live (22 Jun 2026) — **runs inside the daily-briefing cron**, not a separate service and NOT in-process (there is no app scheduler; the Procfile is web-only). Maintenance-guarded (money-cron wall) + skipped on dryrun; idempotent per member-month. Result counts (renewed/warned/grace/lapsed) appear in the daily-briefing email for visibility. Manual trigger: `/admin/process-renewals` or `/cron/process-renewals?secret=$CRON_SECRET`. Wallet-balance renewals for monthly members; Stripe renewals handled by Stripe natively. **Prior note claiming "(in-process) Live" was inaccurate — nothing was scheduling it.** |
| BSC scanner | (in-process, 30s interval) | ⚠️ Live but stall-prone — see Open Issue #1. Multi-replica safe via `pg_try_advisory_lock(1885347291)`, but orphaned-lock recovery is only via service restart. |

---

## How to verify any claim in this file

| Claim type | How to verify |
|---|---|
| **Financial state ("how much has the business earned?")** | Visit `/admin/finances` (browser, brand-styled HTML) or curl `/admin/api/finance-summary` (JSON). Both backed by `app/finance.py:compute_financial_overview`. |
| **Founder offer status** | `GET /admin/api/founder-offer-status` (admin auth) returns deadline + count + is_open. |
| Commission rates / payouts | Read `docs/commission-spec.md` (currently out of date — see Tracked Issues). If spec contradicts code, code wins. |
| Live DB state | Use SuperAdPro Monitoring MCP — `member_composition`, `lookup_user`, `commission_audit`, `platform_pulse`. Cached 60s. |
| Specific user state | `lookup_user(identifier=...)` |
| Specific tx hash trace | `lookup_payment_by_txid(tx_hash=...)` |
| Commit history | `git log` in the cloned repo |
| Schema | Read `app/database.py` directly. **DO NOT** trust schema comments; grep for where fields are USED. |
| Active route | `grep -n "@app\." app/main.py` |
| Brand colours | `static/design-tokens.css` |

---

## Things known to be MISLEADING in other docs

Be skeptical of:

- **`CLAUDE.md`** claims NOWPayments is "retired" — WRONG. It's live.
- **`docs/commission-spec.md`** describes 8×8/64 grid — WRONG. Current is 6×6/36.
- **Old `LAUNCH_LOG.md` entries** may reference webhook endpoints, payment rails, or product details that have since changed. Most recent entry wins; cross-check against this file.
- Past handover docs may include claims that turned out to be incorrect (e.g. the 26 May handover said `/funnels/visual` was a 404 — it's actually a 302 redirect; the real issue was schema mismatch, not the URL).
