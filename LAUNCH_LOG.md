# SuperAdPro Launch Log

> **For future-Claude reading this in a new session:** This file is the curated narrative of where the platform is right now. Read top-to-bottom for full context on recent decisions, currently-watched concerns, and pending work. The daily-briefing email Steve receives includes these sections too. Whoever you are, you're caught up after reading this.

> **For Steve:** Update the curated sections below at the end of each session. The auto-snapshot block at the top of the daily-briefing email is generated fresh from the database — you don't update that.

---

## Status as of 2026-05-12 (day 3 of launch) — BIG DAY

**Brand Poster Generator shipped.** This is the day BPG went from idea to production end-to-end. Members can now generate branded marketing posters in 60 seconds with their referral link automatically baked in. Members grew from 29 → 66+ in one day (+127%). 11 production changes shipped across the day.

The morning started with a major Dashboard timeout incident during the signup surge (cache TTL had been left at 5s as a stale workaround) — fixed before lunch. The afternoon brought a series of customer payment-flow issues that exposed real UX gaps; resolved both technically (auto-recovery on partial payments) and through clearer checkout labels. The evening was head-down BPG launch work: 6 master prompts, 9 backend endpoints, 4 React pages, admin seeding UI, Dashboard hero carousel (5 slides), and the strategic BPG-as-Nexus-attractor positioning across three sales surfaces.

## Shipped on day 3 (12 May 2026)

### Production fixes
- **`e69f6fc` Dashboard cache TTL restored to 60s** — was 5s as a 9-May workaround for stale-balance UX. Proper invalidation shipped 10 May (26 call sites). TTL bump never happened. Signup surge (29 → 66 members in one day) exposed the gap; Dashboard endpoint was re-running expensive queries on every hit. ~12x DB query reduction.
- **`7428857` Partial-payment auto-recovery** — NOWPayments IPN now auto-activates orders within 5% tolerance of pay_price. Resolves the silent friction where members lose $1-2 to Coinbase/Binance fees and their order sat in `partially_paid` waiting for admin Recover. New `partial_recovery_logged` + `partial_recovery_shortfall_usd` audit columns on `nowpayments_orders`.
- **`7428857` Checkout payment-method UX rewrite** — labels changed from "Crypto Wallet"/"NOWPayments" to "Pay from My Wallet (MetaMask, Trust, etc.)"/"Pay from Exchange (Coinbase, Binance, Kraken)". Exchange option now appears FIRST. Driven by Chris (real customer) clicking wrong button and getting stuck at WalletConnect modal.
- **`420fa8a` Three broken `/credit-matrix` navigation links fixed** — user-facing route is `/credit-nexus`. Stale links existed in BrandPostersGallery (2x) and BrandPosterForm.

### Brand Poster Generator (the headline feature)
- **`3bffee6` Schema + master prompt library** — 3 new DB tables (`poster_templates`, `poster_generations`, `poster_template_shares`). 6 templates: One Income Is Risky, Tired of Scrolling, Where Creators Get Paid, Pay It Forward, Freedom Lifestyle, Smartphone Cash Machine. 3 logo variants (default cyan, gold premium, pink Pay It Forward).
- **`ff6d0de` Backend endpoints + Grok wrapper + gating** — 9 endpoints under `/api/posters/*`. Gating is simple binary on `CreditPackPurchase` ownership (any tier qualifies, any pack). `app/grok_imagine_service.py` wraps xAI Grok Imagine with aspect-ratio mapping (4:5 → 3:4 etc).
- **`9ddf7e6` React UI + reference photo upload + SPA routes** — 4 React pages under `frontend/src/pages/brand-posters/`: Gallery, Form, Result picker (2x2 grid), History.
- **`5d49d10` Isolated CREATE TABLE migration block** — `Base.metadata.create_all` silently skipped the 3 BPG tables on first deploy. Added explicit `CREATE TABLE IF NOT EXISTS` block to `app/database.py` matching the `partial_recovery_columns` pattern. Idempotent.
- **`86808a1` Admin UI at /admin/bpg** — self-contained HTML page with one-click "Seed All Missing" + "Force Regenerate All" buttons. Per-template Regenerate buttons. Real-time log output. No React build needed.
- **`0531d96` HTTP 403 fix on image download** — Grok generation succeeded but xAI CDN rejected default Python urllib User-Agent. Added real-browser UA + Bearer auth header to the download Request.
- **`bcf518f` Preview URLs wired through to gallery cards** — `/api/posters/templates` was reading from static catalogue ignoring DB; gallery component ignored `preview_image_url` entirely. Fixed both.
- **`b95ed8b` Referral attribution baked into posters** — `render_prompt(template, inputs, username)` now injects `superadpro.com/ref/{username}` as a visible URL banner on every poster a member generates. Closes the viral loop.
- **`420fa8a` Form-page referral explainer** — single-line cyan accent bar reassuring members their link is automatic.

### Dashboard carousel
- **`acb4d67` Rotating hero carousel** — Per Steve's direction: Dashboard top is a storefront for products and income streams, not a stats screen. V1: hardcoded slides, 60-second rotation, pause-on-hover, manual arrows, dot indicators, swipeable on mobile.
- **`4c29e67` Expanded to 5 slides** — added Membership ($20-$35 entry, blue gradient, Rocket icon) and Profit Grid (8×8 mechanics, emerald gradient, TrendingUp icon). Final order: Nexus → Membership → Grid → BPG → Pay It Forward.

### BPG-as-Nexus-attractor flywheel (the strategic shift)
- **`6c9a1b0` Sidebar entry** under Tools → Brand Posters (`/brand-posters`, Sparkles icon, Basic tier).
- **`7f4579b` BPG showcase on Credit Nexus page** — `frontend/src/components/BpgNexusShowcase.jsx` — purple/violet hero with horizontal scrolling gallery of all 6 preview images. Strategically placed BETWEEN the ProductExplainer and the pack pricing grid so members see what they unlock before they see how much it costs. Self-fetches templates + access-check in parallel.
- **`7f4579b` BPG promo banner on Creative Studio** — sleek banner above the tab bar with gold ✨ icon and "Try it" CTA. Every Creative Studio visit surfaces BPG.

## Currently watching (updated 12 May)

- **Live BPG end-to-end test still pending** — we built the whole pipeline and verified the admin seed works (6 preview images successfully generated and uploaded to R2). What we have NOT yet tested is a real Nexus pack member going through the full flow: log in → click slide → land on gallery → click template → fill form → click Generate → see 4 candidates → pick favourite → download. **First thing to do this morning before any more building.**
- **Grok URL rendering quality** — the new `{member_share_url}` placeholder asks Grok to render `superadpro.com/ref/{username}` as a clean horizontal banner. We haven't verified Grok handles this well; URL text in AI-generated images can be unreliable. May need prompt tuning if posters come back with garbled URLs. **First Nexus-pack-member test will reveal this.**
- **Payment-flow friction is the biggest remaining UX problem** — we saw 5 customer issues in one day (wrong-currency request, abandoned cart x2, partial-paid, BSC vs Coinbase confusion, Chris's WalletConnect-vs-NOWPayments mix-up). Auto-recovery handles small shortfalls now, but the larger pattern is real. Worth a dedicated session on checkout UX next week.
- **Steve's xAI key was pasted in cleartext in conversation** — replaced/rotated nothing. Should be rotated when Steve has 5 minutes. Not urgent but accumulating risk.
- **`@tanstack/router` supply chain attack (11 May 2026)** — we don't use router, only `@tanstack/react-query@5.100.9` which is unaffected (released 2 weeks before attack, query repo separate from router repo). Verified clean via `npm audit signatures` 13 May. Documented for awareness only.

## Open items
- **BPG i18n** — Carousel slides and BPG form/gallery are English-only. The 20-language i18n system in the platform isn't wired into BPG yet.
- **BPG sidebar entry uses `Sparkles` icon** — same as Creative Studio. Worth distinguishing later, no blocker.
- **`@tanstack/react-query@5.100.9` upgrade window** — current version is 2 weeks old; latest is 5.100.10. Lockfile pins to 5.100.9. No urgency, no security issue, just noted.
- **Membership and Pro upgrade flow** — the new carousel slide goes to `/upgrade` which works, but the Pro upgrade UX hasn't been audited for new members coming from the carousel rather than from inside the app.

## Day-3 metrics

- Members: 29 → 66 (+127%) in one calendar day
- New signups in last 24h at session-end: 50
- Memberships purchased: 4
- Credit packs purchased: 3
- Commissions paid: 32 (20 Profit Grid + 8 Membership + 4 Credit Nexus)
- Production commits: 17 (BPG launch + fixes)
- Customer support cases handled: 4
- Open red flags: 0



Healthy. 25 members, 7 new signups in last 24h. **First real grid tier customer landed overnight:** Cynniam (SAP-00157) purchased Tier 1 ($20) at 00:38 UTC and Tier 2 ($50) at 01:17 UTC. Commission cascade fired correctly end-to-end — Steve earned $4.37 as direct sponsor (uni_level L1). Zero anomalies across all monitoring tools.

This validates that the grid commission system works on production with a real member doing real purchases. A launch isn't really validated until that happens, and now it has.

## Shipped on day 2 (11 May)

- **`94ae4f27` Maintenance mode 'panic button'** — two-tier kill switch (soft = withdrawals only, hard = all money + signups) with admin toggle UI in the Overview tab and member-facing banner on dashboard. Single-row `platform_status` table. Helpers cached 5s. Withdrawal cron also pauses in maintenance mode.
- **`c7258495` Support tickets: email admin in real-time** — `/api/support/ticket` now sends Brevo email alongside in-app notification. Reply-To routes back to the member. Uses `SUPPORT_EMAIL` env var with `DAILY_BRIEFING_EMAIL` as fallback so it works out-of-the-box.
- **`6783e72f` Story-prompt dismissal: server-side persistence** — new `users.story_prompt_dismissed_at` column. Optimistic-local + server-persist pattern.
- **`e9bb5821` Skip story-prompt banner for admin** — Steve was seeing it as user_id=1.
- **`27e4119b` Platform Tour mobile fix** — new `/media/tour-video/{slug}` endpoint with Range support. Root cause: Cloudflare was caching 200 OK and serving to iOS Safari's Range probe, causing black screen. Same pattern as `serve_welcome_video`.
- **`c4c7ae6d` Wallet section video added to Platform Tour** — compressed 38MB → 5.6MB, h264 High profile.
- **`e3bbfde0` Foolproof first-withdrawal flow** — always-visible destination panel + first-withdrawal confirmation modal. Refactored `handleWithdraw` into validate+gate / dispatchWithdrawal.
- **`b3a1d405` Bookkeeping fix** — `_activate_membership` now writes the `membership_company` row alongside `membership_sponsor`. Forward-fix only; historical backfill SQL not yet run.
- **`b305fdcf` MCP monitoring fixes** — commission bucket helper at `mcp/tools/_commission_buckets.py` as single source of truth. `financial_sanity` reconciliation math corrected.

## Currently watching (updated 11 May)

- **Cynniam's grid completion path** — first real member to enter the grid system. Her Tier 1 and Tier 2 grids should fill via spillover from subsequent purchases. Watch `/admin/api/users` → her profile for grid completion bonuses if and when her grids complete.
- **Daily briefing cron timing** — schedule is `0 7 * * *` UTC = 08:00 BST in summer. Email arrives at 08:00 BST, not 07:00. Don't panic if Railway UI shows "Last run failed yesterday" while emails are arriving — Railway only updates that indicator on failure, today's success doesn't clear it.
- **`payment_integrity` MCP tool gap** — only tracks legacy `crypto_payment_orders` table. Doesn't capture WalletConnect-BSC OR NOWPayments rails. Will show $0 inflow even on days with real revenue. Needs fixing later, not urgent. Workaround: cross-check by looking at `Payment` table directly or `commission_audit` for evidence of activity.
- **`platform_pulse` MCP tool gap** — doesn't include tier purchases in the purchases-today breakdown (only courses, credit_packs, memberships). Tier purchases show up indirectly via the commission breakdown but not as their own metric.
- **CRON_SECRET rotation** — secret was inadvertently leaked into chat during a URL-parameter mix-up. Should be rotated on the main service AND all cron services (daily-briefing, stuck-lapsed-alert, etc.). Values must match exactly across all services.
- **Cache TTL restoration** (still pending) — see launch-day notes below. After 24-48h clean operation, the four sites at `ttl=5` should go back to `ttl=60`.

## Parked for future sessions

- **Compensation plan redesign / passive income pool** — Steve proposed Pro membership = $10 company / $25 redistributed pool; Courses = 50% affiliate / 50% pool. At 1000 Pro members this is ~$45/month back per active member. Five design questions outstanding: direct sponsor's share on Pro upgrades, grandfathering, course mechanics, anti-gaming, who participates. Conversation ended at "Have I got that right?"
- **Social Image Studio** — internally-built tool for network-marketer-style social images. Hybrid architecture decided: AI generates personalised photoreal backgrounds (Grok Imagine API), browser overlays editable text + branding. Blocked by Grok Imagine's 60-70% likeness-consistency rate which isn't production-ready. Two paths: ship template-based infrastructure now and bolt on AI-personalisation later, OR wait for image models to improve. Claude's recommendation: ship infrastructure now. Steve rejected first round of design mockups for not matching network-marketer aesthetic (wants loud/saturated, not tasteful/restrained).
- **Course Academy as 4th income stream** — 100% commissions + pass-up. Spec is locked, just needs implementation.

---



The platform is genuinely ready. The hardest engineering work shipped in the past two weeks: engine-level commission classification (closed an entire bug class), withdrawal hardening (idempotency keys + retry backoff), data integrity (denormalised counters → live ledger reads), the two-step upgrade flow with switch-to-annual support, and a polished checkout with colour-coded payment rails.

Last night's smoke test caught three real bugs that would have hit launch otherwise: the broken WalletConnect parent/child JSX in the new checkout (pay button never appeared after wallet connection), the dead-end payment-success page (no Dashboard CTA after a real-money payment), and the cache-invalidation gap (60-second stale balance after commissions posted). All three fixed and verified with $20 of real USDT on BSC.

The single most important verified fact: **WalletConnect membership purchase works end-to-end with real money.** Wallet connects, MetaMask USDT prompt appears, transaction confirms, backend polls and detects, redirect to /payment-success, on-chain receipt displays, sponsor commission posts to balance, balance updates within 5 seconds.

## Currently watching

- **First public registrations** — registration opened today (10 May). Watch `/admin/api/users?status=inactive&limit=100` for orphan-signup growth that exceeds expected referral counts. Orphan signups (no `?ref=`) are now defaulted to the `SuperAdPro` admin user as sponsor.
- **Daily Briefing email delivery** — first one fires tomorrow 06:00 UTC. If it doesn't arrive, check Railway service `daily-briefing-cron` logs and `daily_briefings` table for entries.
- **Cache TTL restoration** — four sites in `main.py` (~3736, 11312, 11341, 11440) at `cache_set ttl=5` should go back to `ttl=60` after 24-48h of clean operation. The 5s TTL was a launch-eve safety measure; the comprehensive cache invalidation sweep `36ef2fd` makes the longer TTL safe again.
- **Switch-to-Annual path** (`/api/switch-to-annual`) is shipped but UNTESTED with real money. Engine classifier defends against worst outcome (commission double-pay), but the path itself is new code only validated logically. If a Monthly→Annual switch fails on launch day, that's where to look first.
- **NOWPayments rail** — third-party processor redirect path. Not exercised in last night's smoke test. Should work — no recent code changes — but worth noting.
- **Cache invalidation audit** — the 5s TTL fix from 9 May papers over a deeper issue: `cache_invalidate_user()` only clears keys with `dash:` and `analytics:` prefixes, but there are also `descendants:`, `withdrawn:`, `earnings:` namespaces that aren't invalidated. Several commission-credit sites bypass `create_notification()` (the only place that calls invalidation), going directly to `Notification(...)`. **Post-launch work**: extend the invalidator to all user-keyed prefixes AND wire up invalidation calls at every commission write site.
- **`membership_company` row write verification** — `b3a1d405` added the missing company-share commission row to `_activate_membership`. Next real WalletConnect or NOWPayments membership activation should produce TWO commission rows (one `membership_sponsor` to the sponsor, one `membership_company` with `to_user_id IS NULL`), not one. Verify by running `commission_audit` after the next activation: the `membership` bucket should now show both commission types.
- **Audit endpoint** (`GET /admin/api/audit-double-pays`) — should always return 0 active users with suspect commissions. Run once or twice a day for the first week. If it ever returns >0, stop and investigate immediately.

## Recently shipped (last 7 days)

- b3a1d405 Bookkeeping fix: `_activate_membership` now writes the `membership_company` row (10 May)
- b305fdcf MCP monitoring: bucket commissions table by income stream — also fixed latent reconciliation bug in `financial_sanity` (10 May)
- 6acd877 membership_tier='basic' default lie eliminated — proper data model fix (10 May)
- 0e28a21 Logout race condition: ProtectedRoute + RequireTier now route unauth to / (10 May)
- 2d49a05 Onboarding wizard → dismissible banner on dashboard (10 May)
- 76e6069 + a0b94a1 All 4 registration gates removed (10 May, launch day)
- b965d1e + 62ca937 Payment pages translated × 20 languages (~1,820 strings) (10 May)
- dc73e1b Income Streams deck softened across 20 languages (10 May)
- 7ecc208 + 1bdcc52 Public-facing data audit: removed fake stats, softened income claims (10 May)
- ca2120f + c2f1d80 + c420224 Mobile fixes: nav, welcome video, hamburger menu (10 May)
- 34e2bba + 76d866b ProSeller AI grounded prompt + chat field-name fix (10 May)
- 36ef2fd Cache invalidation: comprehensive sweep across commission/balance write sites (10 May)
- e9797f8 Pay It Forward: share UX + status filter (10 May)
- c5a368d Stuck-lapsed hourly cron alert (10 May)
- d79d41a9 Daily Briefing System: cron + Grok + email + LAUNCH_LOG.md (10 May)
- 80e28635 Cache: shorten user-specific TTL from 60s to 5s
- 1d3be450 PaymentSuccess: add visible Dashboard CTA so success page isn't a dead-end
- 5599b019 Checkout: fix broken WalletConnect flow — Pay button never appeared after connection
- 4c3c68df Checkout rails: fill cards with rail colours instead of leaving them white
- 6267ee1c Header Connect Wallet pill: blend with header so it doesn't compete with page CTAs
- db21d9dc PayItForward: shorten orange button label to 'Connect Wallet — $20'
- ad69289b PayItForward: orange Connect Wallet button always visible (not just when connected)
- 773f90a0 PayItForward: centre the orange Connect Wallet button
- 1ee32774 PayItForward: colour-code the three rails by payment type
- dbc49365 Checkout: fix Connect Wallet button drift + add bottom breathing room
- b32bc150 WalletConnectGate: subtle tip below Connect button about Edit accounts
- 51a29b28 Checkout: reorder, condense, widen + filled orange Connect Wallet button
- 34043e7a Payment buttons go green platform-wide
- f9ef9e0c Engine-level membership classification + audit endpoint (closed bug class)
- 57bc99c9 Upgrade flow: add 'Switch to Annual' path for monthly members
- 1680d99a Upgrade flow: split into two-step (Choose Plan → Configure & Pay)

## Open issues / known gaps

- **Coming Soon HTML cleanup** — ~100 lines of dead HTML at `app/main.py:177-270` (`COMING_SOON_HTML` constant, no longer renders since `PRE_LAUNCH_MODE=False` hardcoded on launch day). Pure code hygiene, no functional impact.
- **Mobile audit Flows 2-6** — registration on mobile, upgrade page on mobile, WalletConnect modal on `/upgrade/checkout` on mobile, Pay It Forward on mobile, Wallet on mobile. Started but never completed.
- **Member-facing dashboard hype-language audit** — not yet done.
- **Marketing video voiceover transcripts** — not audited for fabricated claims.
- **Brevo email subject lines/preheaders** — set in Brevo dashboard, not in repo. Should be reviewed for consistency with platform messaging.
- **Cache invalidation audit** (described above under Currently watching) — proper fix is post-launch.
- **Daily cron alert on stuck-lapsed detector** — Today's `c5a368d` shipped the foundation but should be tested with a real stuck user.
- **Gift Voucher Created page should visibly show the share link** — current page creates the voucher but the share link is harder to find than it should be.
- **Welcome video subtitles/captions** — accessibility gap, not blocking.
- **405 console error on `/upgrade/checkout`** — logged but never investigated. Likely benign browser prefetch trying POST. Won't block launch but should be confirmed dismissable.
- **Pay-It-Forward sales/info page** — entry point to the gift-video story was discussed but never built. Right now PIF is reachable only via direct URL or sidebar; no marketing landing.
- **Historical `membership_company` backfill** — `b3a1d405` fixes future activations only. Every membership activation that went through `_activate_membership` since WalletConnect went live is missing its company-side commission row in the ledger (no missing money, only missing bookkeeping rows). Backfill is straightforward: scan `payments` table for `payment_type IN ('membership', 'membership_upgrade', 'membership_cadence_switch')` with `status='confirmed'` and insert the matching `membership_company` row using `actual_charge - existing_sponsor_share`. Decide whether to run this based on whether you'll ever want historically accurate company-revenue reports.

## Pending decisions

- **Switch-to-Annual smoke test with real money** — not yet done because $200 was more than Steve wanted to spend pre-launch. The engine classifier protects against the worst outcome but a live test would still be valuable. Decision deferred until post-launch budget allows.

## How the daily briefing works

Every morning at 06:00 UTC, Railway runs `GET /cron/daily-briefing?secret=$CRON_SECRET`. The endpoint:

1. Computes today's metrics from the database (signups, commissions, audits, anomalies)
2. Reads this file for human-curated context
3. Sends both to Grok 4.1 Fast (with Claude Haiku 4.5 fallback) for AI summarisation
4. Emails the summary + raw metrics + a copy-block to `DAILY_BRIEFING_EMAIL`
5. Stores the briefing in the `daily_briefings` table for history

Steve reads the email each morning. If everything's green, he doesn't need to do anything — the email IS the daily check-in. If something looks off, he forwards the copy-block to a new Claude chat as the first message and that Claude is briefed instantly.

Configuration (Railway env vars): `DAILY_BRIEFING_EMAIL`, `DAILY_BRIEFING_NAME`, `CRON_SECRET`. Manual trigger: `GET /cron/daily-briefing?secret=...&dryrun=1` returns the would-be email as JSON without sending or persisting.

## Notes for next session

If you (future Claude) are reading this in a fresh session, the most useful thing you can do is:
1. Trust the engine-level classifier — don't reintroduce `is_upgrade` flag dependence at any callsite. The engine is the source of truth.
2. Use `compute_user_earnings()` and friends for any read of user balance/totals, not the denormalised User columns. The 1 May data integrity work made the live ledger the truth; never go back to denormalised reads.
3. Read `docs/commission-spec.md` before writing any commission-related code or copy. It's the canonical truth on percentages and flows.
4. If a user reports a "stuck" or "double-paid" issue, run `/admin/api/audit-double-pays` first before assuming it's a new bug class.
5. CSS tokens live in `static/design-tokens.css` (70+ vars). Do not introduce hardcoded hex values into new components.
6. The `commissions` table is multi-purpose — it holds Profit Grid events, membership commissions, Pay It Forward gift redemptions, and admin adjustments. Never assume "row in commissions table = grid event". When grouping commission_type values for any report, use `mcp/tools/_commission_buckets.py` as the single source of truth (`bucket_for(commission_type)` returns one of `profit_grid` / `membership` / `admin` / `other`). When a new `commission_type` value is introduced anywhere in the codebase, add it to that helper.

When you finish a session that introduced something noteworthy, update the "Recently shipped" and "Currently watching" sections of this file before pushing. Keep the format identical so the daily briefing parser doesn't break.
