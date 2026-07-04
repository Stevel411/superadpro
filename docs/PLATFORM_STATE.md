# SuperAdPro — Platform State

> **For next Claude:** This is a snapshot of CURRENT TRUTH about each part of the platform — *not* a session diary. Read this FIRST in every new session. If it conflicts with `CLAUDE.md`, `LAUNCH_LOG.md`, or the Claude.ai project instructions, **this file wins** (it's the most recent).
>
> **For Steve:** Update at the END of every session. Replace, don't append. The narrative of what happened lives in `LAUNCH_LOG.md`. This file answers "what is true right now."

**Last updated:** 2026-07-02 (full stale-data refresh + backup-status correction — HEAD `54c60d8`; previous snapshot was 2026-06-09 and carried pre-v2 grid economics, an open Founder offer, and a 95/5 Campaign Tier split, all long superseded)

---

## Production environment

| Surface | State |
|---|---|
| Domain | `www.superadpro.com` (Cloudflare → Railway). Bare `superadpro.com` only forwards root — ref links must use `www`. |
| Repo | `github.com/Stevel411/superadpro` (private, `main` auto-deploys) |
| Backend | FastAPI / Python on Railway, monolithic `app/main.py`, SQLAlchemy models in `app/database.py` |
| Frontend | React/Vite SPA served by FastAPI from `static/app/` |
| Templates | ~99 Jinja2 templates (legacy, gradually migrating to React) |
| Database | PostgreSQL on Railway. `SKIP_MIGRATIONS=true` — schema changes land via one-shot admin GET endpoints, model columns deployed AFTER the column exists (two-deploy rule for `users` table). |
| Media | Cloudflare R2 (`superadpro-media` bucket) |
| Deploy | `git push origin main` → Railway nixpacks → live in ~1-3 min |
| Frontend builds | Nixpacks compiles Python ONLY — frontend must be `npm run build`-ed locally and `static/app/` committed. Source-only push ships a stale bundle silently. |
| Admin access | Cloudflare Access on `/admin*`; all secret-gated admin routes converted to session-auth post-breach |

---

## Payment rails (locked truth — verified 2026-07-02)

**THREE live rails.** Any doc or instruction claiming "BSC-only" or "Stripe/NOWPayments retired" is stale — the Claude.ai project instructions still carry this error; ignore it.

| Rail | Status | Notes |
|---|---|---|
| **Stripe** | ✅ LIVE | Subscriptions for memberships ($15 Founder / $20 Partner), payment mode for Campaign Tiers, PIF vouchers, custom domains. `User.stripe_subscription_id` is live. Known webhook-delivery reliability caveat (`invoice.paid` self-healing branch catches missed `checkout.session.completed`). Reconciliation endpoint: `/admin/api/stripe-reconciliation?days=N`. |
| **NOWPayments** | ✅ LIVE | Inbound crypto. Forwarding hot wallet `0xa96be652a08d9905f15b7fbe2255708709becd09`. List API needs JWT (`NOWPAYMENTS_EMAIL`/`PASSWORD` in Railway — deletable, recovery done); `get_payment_status(id)` works with `x-api-key`. |
| **WalletConnect / BSC** | ✅ LIVE | Self-custody. Treasury `0xb2Ccdf9050A8d05A346F6879eC4fa633f9b2554D`. Reown project `b256ce910011e012fedc82dc8c11881b`. Scanner is in-process (30s tick, advisory lock `1885347291`), stall-prone — see Open Issues. Unique amounts = base ±50¢ deterministic from `(user_id, order_id)`. |
| **Polygon** | ❌ Retired | All 8 inbound endpoints 410-gated (`7ec8fe19f`). ~350 lines of dead handler bodies queued for cleanup (keep `_resolve_superscene_credits` + `SUPERSCENE_CREDIT_RATE` — used by live NOWPayments flow). |
| **Airwallex** | ❌ Never wired | Ignore. |

**Treasury operating model (post-breach, confirmed by Steve 2 Jul 2026):** the BSC treasury deliberately holds ~zero balance. Member withdrawals are funded JUST-IN-TIME by Steve from his Binance account — inbound USDT top-ups from rotating Binance hot wallets (varying sender addresses, odd amounts) shortly before payouts. **Consequence: unattributed treasury INBOUND transfers in a treasury-scan sweep are almost certainly Steve's funding top-ups, NOT missed member payments.** Cross-check against withdrawals paid around the same time before concluding a member payment was missed (2 Jul lesson: a sweep of the scanner-outage week surfaced 4 unattributed inbounds ~$237 that were misread as stranded member payments; they were Steve's withdrawal funding).

**Money truth lives in the gateways, not mirror tables** (breach wiped mirrors on 3 Jun). Canonical tools per question:
- "Did they pay?" → `/admin/api/gateway-forensics?user_ids=N` (live Stripe + NOWPayments)
- "What did they get?" → `/admin/api/user-fulfillment?user_id=N` (aggregates grid positions, credit packs, credits, commissions — blind to Stripe charges)
- "Balance dispute?" → `/admin/api/user-ledger?user_id=N` (reconciles both wallets + commissions + withdrawals). `lookup_user` is blind to `campaign_balance`.

**Stripe SDK in this container (Python 3.12):** `PaymentIntent.list()` throws `KeyError:0` — never use. Use `Charge.list()` / `BalanceTransaction.list()` with manual pagination; `to_dict()` not `dict()`; `auto_paging_iter()` fails.

---

## Commission economics — `docs/commission-spec.md` is THE source

**Do not quote commission numbers from memory or this file's history — read the spec.** The spec's "⚡ CURRENT LIVE PLAN" banner is authoritative. Summary as of 2026-07-02, verified against `app/database.py` constants:

| Stream | Split | Notes |
|---|---|---|
| **Membership** | Sponsor **$10 flat/mo** per active direct, both tiers. Company keeps $10 (Partner $20) or $5 (Founder $15). Annual = $100 to sponsor per activation. | No tier caps, no per-tier rates. Renewal cron reads `membership_price_locked`. |
| **Campaign Tiers / Profit Grid** | **v2 LIVE (21 Jun, amended 22 Jun): 50% direct / 25% uni-level (5% × 5 levels) / 25% bonus pool / 0% company = 100% to members.** | Gated by `database.py::GRID_V2_LIVE = True` (`V2_DIRECT_PCT=0.50`, `V2_PER_LEVEL_PCT=0.05`, `V2_UNILEVEL_DEPTH=5`, `V2_BONUS_POOL_PCT=0.25`, welcome bonus scrapped 22 Jun). 16-seat 4×4 grid; bonus pool pays at seats 4/8/12/16, = 4× tier price total; ≤$400 half-cash/half-step-up, >$400 all cash. Instant rollback: flip `GRID_V2_LIVE=False` → v1 (30/50-over-8/20). |
| **Creator Credits** | Flat **20% direct** to sponsor. | Matrix retired 30 May 2026 (`credit_matrix.py::FLAT_REFERRAL_RATE`). Any 85/15 or matrix language is stale. |
| **Withdrawals** | $1 flat to company per withdrawal. | |
| **Courses** | Retired / not a live stream. | Course Academy references linger in ~17 files — cleanup tracked. |

**Marketing claim scope (unchanged):** "We share 100% of revenue with our Partners" is approved ONLY attached to Campaign/Grid context (true: 0% company there). Never as a bare platform-wide claim — membership retains a company share. Any future company cut on Grid breaks the live public claim.

**Launchpad (grid tier 0, $10):** the paid on-ramp that switches on the comp plan for free users. Under v2: $5 direct / $40 bonus pool per the standard split.

**Watch-to-Earn is load-bearing:** it is the withdrawal gate (daily watching keeps the campaign wallet active + grid-qualified) and makes Campaign Tiers a legitimate advertising product. Access gate: `get_user_highest_tier >= 0` (an active owned Grid — membership alone is NOT enough). Frontend check must be `typeof ht==='number' && ht>=0` (tier-0 falsy bug, fixed `fc11aa1a2`).

---

## Membership & Founder product

- **Founder offer CLOSED** (deadline 29 May 2026 23:59 UTC). $15/mo locked for life for those who claimed; spot retained through lapse. ~95 founders incl. ~6 test/admin-held spots (deliberately left). Sponsor earns $10 flat on every Founder renewal, forever.
- **Post-cap strategy:** all acquisition focus = Partners at $20/mo ($10 to the business per active member).
- **Live concern (30 Jun):** ~30 overdue non-Stripe founders (mostly $0 balance) against a ~4-Jul renewal runway. Dashboard renewal nudge shipped (`d4c2d23c8`: banner + once-daily modal → `/upgrade?renew=1`). Steve's call on broadcast/extension. ⚠️ Never resend a broadcast on a 502 — origin continues; resend = double-email.
- **Team gifting:** BUILT, feature-flagged OFF (`app_config['team_gifting_enabled']='false'`). Was held for the Founder cap; offer is now closed, so enabling is purely Steve's call: `POST /admin/api/team-gifting-flag {"enabled": true}`.

---

## Email system

- **Provider = `EMAIL_PROVIDER` env var** (`ses` live; unset silently defaults to `brevo` — if transactional mail goes silent, check this FIRST). Separate `MEMBER_BULK_PROVIDER=ses` for member sends. Resend is dead leftover.
- **Member sending domains: BUILT & PROVEN LIVE.** Members verify their own domain (DKIM/SPF/DMARC → our SES account); `_member_sender_identity()` wired into all three send paths (`f7ae1adc4`). Proven end-to-end (`mail.directmailpro.net` → Gmail inbox, member-DKIM-signed). GoDaddy: pick the single-domain option (it auto-appends the domain in Name).
- **Allowance: 5,000/month free** (`MONTHLY_EMAIL_LIMIT`), then boost packs $3.75/$14.25/$21.75/$74.25 (1k/5k/10k/50k).
- **SES quota:** approved 50,000/day + 14/sec; increase to 250,000/day + 50/sec requested 19 Jun, pending. When granted: set `SES_DAILY_SOFT_CAP≈230000` + `SES_MAX_PER_SEC≈45` in Railway, confirm via `/admin/api/ses-capacity`. Until then the in-app governor sits safely under live limits.
- **Verify tool:** `GET /admin/api/test-email?to=addr`.
- **Send-protection system (3 Jul 2026, LIVE + production-proven):** per-member daily caps ramp with LIFETIME sends (<1k → 500/day, <10k → 2,000, 10k+ → 5,000; `app/send_limits.py`), enforced in `_check_email_allowance` (all send paths; sequences defer to next cron tick). Broadcasts: durable `member_broadcasts` rows + `broadcast_log` recipient claims (UNIQUE index REQUIRED — `_ensure_broadcast_log_table` must run on every claim path) = exactly-once delivery; daily-capped and deploy-interrupted broadcasts auto-resume (`_broadcast_resume_loop`, strong-ref'd — asyncio tasks WITHOUT strong refs get GC'd silently). Admin: `/admin/api/send-cap` (override), `/admin/api/broadcast-state?fix=1&probe=1` (diagnostics), `/admin/api/broadcast-resume-now` (manual pass). Member-facing: "Today X/cap" chip + "How it works" tab.
- **Bounce/complaint auto-pause: VERIFIED EXISTS** — attributed SES complaint sets `users.email_sending_paused`, checked on every member send; admin unpause after review.
- Remaining guardrail note: email body footer still SuperAdPro-branded.

---

## Blog system (flagship member product)

- **Shipped and active** (decision 21 Jun — overrides all prior "do not launch" notes). Gated to full paid members (`is_pro()`; free + Launchpad excluded). Spec: `docs/blog-system-spec.md`.
- Editor: TipTap with custom blocks (callout/video/CTA), R2 image/video upload, drag/drop + paste-to-upload, live Write/Split/Preview rendering exact published CSS, 820px reading column.
- **Media system DONE (2 Jul):** one layout control (Left · Normal · Wide · Full · Right) + S/M/L size on images AND video; floats wrap text with mobile stacking; `aspect-ratio:16/9` (never `padding-bottom:56.25%` — breaks when floated) across all three CSS surfaces (editor / split-preview / `blog_render.py`). S/M/L: in-column 40/60/85%, floated 240/360/460px caps — one-line tunes if Steve wants different feel.
- Sidebar Arrange system (reorder/show-hide + live preview, `blog_link_widgets` JSON), 6 themes × 8 palettes audited at 0 issues (25 Jun). Public render sanitised via bleach.
- **Rule:** Claude self-screenshots every blog/theme change (all 6 themes) before shipping.
- **AI blog-writing feature: PARKED** (Steve's hold). `draft`/`outline` modes already exist in `/api/blog/ai/assist`; the new piece is live web research (Grok Live Search). Banked decisions: video = embed a real YouTube clip (never generate), images = grok_imagine (1 hero). Must ship with compliance guardrails (no undisclaimed income claims, no fabricated stats) + a gating decision (Pro-only/quota/credits — Steve's call). Do not build until greenlit.

---

## Custom domains (blog + SuperPages — ONE shared system)

- **FULLY BUILT — do not rebuild.** `CustomDomain` model, `app/custom_domains.py`, `app/railway_api.py` (Railway GraphQL → Let's Encrypt auto-TLS), host-routing middleware, cert-polling cron, member UIs.
- **Guided setup page live:** `/my-site/domain` (sending-domains style: record cards, one-tap Copy, auto-polling status), linked from My Site → Settings CTA.
- **Config ON but UNPROVEN:** `/admin/api/domain-config` shows all four `RAILWAY_*` vars set, `total_custom_domains: 0` — the flow has never once run in production. **First real test: Steve connects his own domain ~2026-07-03.** Watch `registered_with_railway` / `tls_certificate_issued` tick from 0; a first-run bug is plausible — get the exact error text if it stalls. The "we issue HTTPS automatically" page copy is honest but unproven until this test passes.

---

## Access gating & AI architecture

- **Tier gate single source of truth (28 Jun):** `app/tier_gate.py::PAID_REQUIRED_PREFIXES` decides which APIs need active paid membership. Never scatter per-handler `is_active` checks. Two layers: `RequireTier` (frontend redirect) + `TierGateMiddleware` (hard 403 backstop). Visitor-facing endpoints under gated prefixes MUST go in `GATE_EXEMPT_PREFIXES` or logged-out visitors on members' pages get 401'd. Payment/reactivation endpoints must never be gated. Hard-lock model (reads included) is a deliberate platform-wide decision.
- **Campaign wallet withdrawal** gated separately in `app/withdrawals.py::_validate_campaign_structural`; affiliate wallet always withdrawable; retry path passes `check_membership=False`.
- **AI:** Grok 4.1 Fast = ALL member-facing text AI via `grok_service.ai_text_generate` (`XAI_API_KEY`); Claude Haiku 4.5 silent fallback; Claude = engineering + watchdog diagnostics only, never member features. Video: EvoLink (Sora 2 Pro / Veo 3.1) + FAL (Kling/Seedance, cheaper). Creative Studio generate path: fail-fast 45s + auto-refund + client-token idempotency (double-charge structurally impossible, `029a7b8`). NEVER say "SuperScene" in member-facing copy — internal name only.

---

## Security posture (post 3-Jun-2026 treasury breach)

- Active: Cloudflare Access on `/admin*`; 2FA-gated withdrawal approvals (`withdrawal_approvals`); in-process security watchdog + table-drop alert (noise-tuned `75fcda457`); secret-log redaction middleware; origin-verify on `/cron`; secret-gated admin routes → session-auth; treasury egress hard-lock.
- Attacker accounts 670/673/674: **deleted by Steve deliberately** (Action Fraud declined). Do not flag as evidence loss.
- `SECURITY.md` invariants (no `?secret=` on privileged routes, no state-changing GETs, `scripts/security_check.py` before every push) are **unreconciled** with the tappable-admin-GET convention and the daily-briefing cron's `?secret=`. Needs a dedicated pass with Steve — which posture wins.
- **GitHub PAT still plaintext in the Claude.ai project instructions** — rotation pending, repeatedly flagged.
- **DB backups: WORKING — verified against live R2 2 Jul** (`/admin/api/backups`: unbroken daily history since 14 Jun, 27.5 MB today). `app/db_backup.py` pure-Python logical JSON dump to R2; predates 8 Jun; age-tiered retention fixed `da064f95` (9 Jun — old count-based pruning had evicted all earlier history, which is why nothing pre-14-Jun survives). Replaced the dead pg_dump path entirely; stale `nixpacks.toml` comment removed 2 Jul. Boot daemon dumps on deploy when the newest R2 backup is >20h old. Known quirk: with two replicas both boot dumps race the R2 recency check → duplicate same-second backups on multi-replica boot days (harmless, doubles DB read load on those boots — cheap fix queued).
- rippa (#343) carries a known INTENTIONAL ~$70.37 legacy over-credit — do not reclaim.

---

## Proposals awaiting member feedback (NOT live — do not build)

1. **New affiliate grid plan** (New-Profit-Grid-Plan-50.pdf, $50 tier): 40/20/15/25. Awaiting feedback + Steve's explicit greenlight.
2. **Watcher Pool — campaign tier re-split** (proposed 3 Jul 2026, article `watcher-pool-proposal.docx` circulated to members): NEW campaign purchases would move from 50 direct / 25 uni / 25 bonus to **30 direct / 25 uni / 10 bonus / 35 Watcher Pool** (still 100% to members, claim intact). Mechanics agreed in discussion: per-view drip (fund = 35% of price ÷ view target → 0.35–0.47¢/verified view, instant to campaign wallet), first daily watch stays unpaid qualification for tier-holders, ELIGIBILITY = every active member (Steve, 4 Jul — membership-only members earn too, ad-spend-funded), 20 paid watches/day cap, existing campaigns keep bought terms, ~$36 one-off seed on the 8,914-view backlog so watching pays from day one. PLUS (Steve, 4 Jul): opt-in Subscribe button on the watch page — watcher taps + confirms to join the advertiser's SuperLeads list (reuses blog-capture pattern; consent logged with timestamp). Subscription state is PER-ADVERTISER: one lead per (advertiser, watcher-email) in a single auto-list 'Watch-to-Earn subscribers' with capturing campaign as source — button shows 'Subscribed ✓' across ALL that advertiser's videos once subscribed; button unlocks only after the watch verifies; unsubscribed watchers can re-opt-in via a fresh tap (reactivates the lead, never silent resubscribe). Repeat-day watches pay again (once/day/campaign server rule verified live) — frequency IS the delivery model (targets 1k-30k vs ~599 members); article to disclose 'views = daily-capped repeat exposure' + campaign stats to show unique watchers (Steve decision pending on flat-rate repeats + disclosure line). HARD RULES: never auto-capture, never pay for subscribing (list-quality + shared SES reputation). Data basis: /admin/api/w2e-stats 3 Jul — 17 active campaigns, 8,914 backlog, ~21 watches/day, 426-day drain, watched_beyond_minimum_today = 0. **Nothing ships until Steve relays member verdict.**

## Open issues (ranked)

1. **First custom-domain production run (~3 Jul)** — see Custom domains above.
2. **BSC scanner silent-stall risk** — orphaned advisory lock (27 May, ~6.5h) + succeed-with-empty-result RPC gap (Matt case): needs a no-tick alarm. Restart clears it.
3. **Stripe webhook delivery reliability** — `invoice.paid` self-heal is catching missed `checkout.session.completed`; Stripe Dashboard delivery investigation still not done.
4. **Lapse wave from 4 Jul** — ~30 overdue $0-balance founders lapse automatically as grace windows end (spots survive lapse; reactivation at locked price). Final-day warnings ship automatically going forward; the FIRST cohort needs one `GET /admin/api/process-renewals` tap on 3 Jul (the 06:00 cron predates the feature).
5. **Broadcast resume-loop self-fire unproven** — GC strong-ref fix deployed (`53befe56`); identical logic proven via `/admin/api/broadcast-resume-now`; awaiting first natural timer-fired resume.
6. **Retirement-aware scanner cleanup** — `commission_routing`/`pack_ownership`/`matrix_integrity` false-positive criticals for post-30-May flat-20%/no-matrix state (investigated 30 Jun: no real money problems).
7. **i18n backlog** — 19 frontend locales stale on flat pricing keys (`863ae66` en-only); non-EN locales carry stale grid rates; backend training locales (de/es/fr/hi/it/pt) need retranslation vs 18-lesson corpus.
8. **Dead code queued:** legacy Polygon handler bodies (~350 lines + `crypto_payments.py`); escrow subsystem (`_escrow_pending_commission`, `PendingCommission`, `_release_pending_for_user` — zero callers; handle existing pending rows in cleanup).
9. Smaller tracked: stale-rate sweep (`/new-grid` still shows scrapped welcome-bonus plan; `PassupVisualiser.jsx` hard-codes 36 seats — NOTE: GridVisualiser retired-grid display fixed `ebf36ad3` 3 Jul, ledger phantom = $0.00 verified), Course Academy references (~17 files), `/achievements` still Jinja, `cache_invalidate_user()` namespace coverage, historical `membership_company` backfill (bookkeeping only), admin revenue 3-dp display.

## Open product decisions (Steve)

- Blog door positioning (5th Tools tile vs standalone flagship) — when blog build resumes post new-design cutover.
- AI blog-writing gating model (Pro-only / quota / credits).
- Custom-domain entry prominence (card on My Site dashboard vs Settings only).
- New-design cutover timing → then platform simplification to THREE dashboard doorways (Watch-to-Earn / Income / four Tools: SuperPages, SuperLeads, Creative Studio, Ad Studio). Sunset with redirects, not hard deletes.
- Team gifting enable timing (offer closed; flag is ready).
- Platform-wide wallet-vs-commission reconciliation run (is the #343 over-credit pattern isolated?).

---

## Operational cron / scheduled work

| Service | Schedule | Status |
|---|---|---|
| `daily-briefing-cron` | `0 6 * * *` UTC | ✅ Live — curl image, `/cron/daily-briefing?secret=$CRON_SECRET`, email to Steve, idempotent per UTC date |
| `process_auto_renewals` | rides daily-briefing | ✅ Live (22 Jun) — idempotent per member-month. Lifecycle self-escalates (3 Jul): grace-start email → **automatic final-day warning on day 4** → lapse. Manual: `GET /admin/api/process-renewals` (tappable). |
| BSC scanner | in-process, 30s | ⚠️ Live, stall-prone (Open Issue #3) |
| Sending-domain verify | `/cron/verify-sending-domains` | ✅ Live |
| Custom-domain cert polling | cron | ✅ Configured — exercised for real from first domain connection onward |
| Daily DB backup | boot daemon, `skip_if_recent_hours=20` | ✅ Live & verified (daily in R2 since 14 Jun) — `app/db_backup.py` pure-Python logical dump → R2 `backups/`, no pg_dump dependency. Age-tiered retention (all <14d / weekly to 90d / monthly to 2y / floor 7). List: `GET /admin/api/backups` · manual run: `GET /admin/api/backup/run` · restore: `load_backup`. |

---

## How to verify any claim in this file

| Claim type | How |
|---|---|
| Commission rates / payouts | `docs/commission-spec.md` — the "CURRENT LIVE PLAN" banner. Cross-check `app/database.py` v2 constants. Spec and code agree as of 2026-07-02. |
| Financial state | `/admin/finances` or `/admin/api/finance-summary` |
| Did user X pay? | `gateway-forensics?user_ids=X` (live gateways) — never mirror tables |
| User balance dispute | `/admin/api/user-ledger?user_id=X` |
| Live DB state | SuperAdPro Monitoring MCP (`platform_pulse`, `lookup_user`, `commission_audit hours=168`, `commission_anomalies` first) |
| Schema | Read `app/database.py`; grep for USAGE, don't trust comments |
| Custom-domain config | `/admin/api/domain-config` |
| Email provider/delivery | `/admin/api/test-email?to=` · SES caps `/admin/api/ses-capacity` |
| Brand colours | `static/design-tokens.css` (cobalt/cyan/white lock applies to SuperAdPro's OWN surfaces only — member templates span varied tasteful palettes) |

---

## Things known to be MISLEADING elsewhere

- **Claude.ai project instructions:** payment stack section says BSC-only with Stripe/NOWPayments dead — WRONG (three live rails). Income-streams block says Campaign Tiers 95/5 and Credit Nexus 85/15 — WRONG (Grid = 100% to members under v2; Credits = flat 20%). Grid mechanics line (40/50/10) — WRONG. PAT sits in plaintext there — rotate.
- **Old `LAUNCH_LOG.md` entries** describe superseded grid splits (40/50/10 → 30/50/20 → v2 50/25/25) — most recent entry wins; this file + the spec banner win over all of them.
- **`CLAUDE.md` historical session blocks** are narrative, not current state; commission numbers were deliberately removed from it (30 Jun) — never re-add them there.
- Past handover docs may carry claims later corrected (e.g. "live grid 30/50/20, v2 not live" was true until 21 Jun, stale after).
