# SuperAdPro Launch Log

> **For future-Claude reading this in a new session:** This file is the curated narrative of where the platform is right now. Read top-to-bottom for full context on recent decisions, currently-watched concerns, and pending work. The daily-briefing email Steve receives includes these sections too. Whoever you are, you're caught up after reading this.

> **For Steve:** Update the curated sections below at the end of each session. The auto-snapshot block at the top of the daily-briefing email is generated fresh from the database — you don't update that.

---

---

## Status as of 2026-06-05 (Friday) — Session 2: SYNTHETIC-BALANCE SURFACE CLOSED + SECRET-IN-URL CLASS ELIMINATED

Continuation of the same day. Platform still **OFFLINE** + withdrawals **FROZEN**. This session closed the breach class end-to-end and built the detection layer that didn't previously exist. HEAD = `3acdca1a0`.

### What the 3-Jun breach actually was
An application/API attack, **not** a code/repo breach: public API docs exposed the endpoint map; ~40 admin GETs were gated only by a guessable hardcoded secret; attacker self-promoted to admin, minted synthetic balance, and the app auto-paid the treasury. Member ledger intact. Attacker accounts **670/673/674 = evidence, do not delete.**

### Commits (12, in order)
- `871771f7d` Removed secret-in-URL balance-mint route (`GET /admin/adjust-balance` → 410).
- `b4de3f787` Detection: security-watch **Check 4** (synthetic-balance divergence) + **Check 5** (treasury-drain); `GET /admin/api/balance-reconciliation` review tool; fixed the one credit path (team-gift) that didn't bump `total_earned`.
- `5f24904b7` `/cron/security-watch` accepts admin session (phone-tappable, no secret).
- **`c357c49bd` Root cause:** `AppConfig` never imported at module scope → `_secwatch_get/_set` threw `NameError` every run. **The watchdog had never run since it was written.** Fixed.
- `f5bbcb0d5` First-run baseline arms Check 4/5 in one pass.
- `a12e1b829` **2FA on admin balance adjustments** (`POST /admin/api/user/{id}/adjust-balance` verifies TOTP). Frontend code field added + bundle rebuilt.
- `5394a5c7d` **In-process security watchdog:** 60s daemon loop runs `run_security_watch` automatically (advisory lock `1885347292`, can't-die loop). Kill switch `SECWATCH_INPROC_ENABLED` (default true).
- `c558ef143` Blocked-attempt tripwire (failed/missing 2FA on balance-adjust → instant alert, throttled 1/5min) + collapsed legit-adjustment double-alert.
- `dadfa8687` Converted 10 high-risk admin routes from `?secret=` → session auth.
- `3acdca1a0` Deleted **18 dead dev/test endpoints (~1,365 lines)** + converted 13 read-only diagnostics to session auth + `/admin/finances` session-only. **Secret-gated admin routes: 43 → ~0.**

### Verified
Email alert channel (live); reconciliation report (flagged user 334/test30 with $4 unexplained excess — untraced); synthetic-balance alarm Check 4 (exact-math fire on +$5); admin-adjustment alarm Check 2; 2FA on balance adjust (−5 restore required code). **Still to confirm:** in-process loop ticking post-deploy (+$5, don't tap any link, expect alert email within ~60s, then −5).

### Key rules established
- `User.balance` is a **stored mutable column**, not ledger-computed; withdrawal eligibility reads it directly.
- **Invariant:** every legit credit to `balance` also bumps `total_earned` → `balance <= total_earned` for legit accounts. Check 4 + reconciliation depend on this. **Any new credit path must bump `total_earned` in lockstep.**
- New AppConfig markers: `secwatch_sum_balance`, `secwatch_sum_earned`, `secwatch_treasury_usdt`, `secwatch_paid_wd_total`, `secwatch_last_blocked_adj_ts`. New env flag: `SECWATCH_INPROC_ENABLED`.

### Next (ranked)
1. **Cold-storage sweep + thin hot float + rotate the hot wallet** (Steve, hardware wallet) — the #1 residual: the hot-wallet key lives on the server, which no app lock can protect. Update BSC scanner watched address + member deposit address in the same deploy.
2. Confirm in-process watchdog ticking (test above).
3. Funded-reopen tests: withdrawal approval lock end-to-end + treasury-drain alarm positive test.
4. **Rotate the GitHub PAT** (still plaintext, full read+write — a leaked push token is a treasury risk) + 2FA on GitHub/Railway accounts.
5. Trace user 334 (test30) $4 excess.
6. Run `scripts/security_check.py` as independent validation.

### Watch
In-process watchdog advisory lock `1885347292` (heartbeat every 30 ticks); Check 5 blind for a cycle if `treasury_usdt` reads null (BSC RPC fail); tripwire throttles 1 email/5min; stale `_DEV_ONLY_PATHS` entries for deleted routes left in place (harmless).

---

## Status as of 2026-06-05 (Friday) — TREASURY EGRESS HARD-LOCK + `/cron` LOCK ACTIVATED

Platform still **OFFLINE** (`MAINTENANCE_MODE` on) and **withdrawals FROZEN** (`WITHDRAWALS_ENABLED` unset). This session: activated the parked `/cron` Cloudflare-only lock, shipped a hard-lock on treasury withdrawals, and ran a treasury-focused vulnerability assessment. HEAD = `4e99c92` (+ this docs commit).

### Commits / changes (5 June)
- **`4e99c92` — Treasury egress hard-lock.** New table `withdrawal_approvals` (append-only, UNIQUE per withdrawal). The 2FA release route records an approval (who/when + amount & destination snapshot) BEFORE flipping to `pending`. `process_withdrawal` now REFUSES to broadcast unless a matching approval row exists AND its amount/destination still match — fails CLOSED on missing approval / mismatch / lookup error. Covers both callers (inline release + retry cron), so `status='pending'` alone can no longer move money. Legacy unguarded Polygon `send_usdt()` stubbed (it had no freeze guard; no callers). Migration added to `run_migrations()` + `/admin/force-migrate`. Separate table by design — a missing table can't break existing `Withdrawal` queries; guard just fails closed.
- **`/cron` Cloudflare-only lock ACTIVATED (config, not code — code was `fb088e816` last session).** Cloudflare Transform Rule sets request header `X-Origin-Verify` on all incoming requests; Railway `ORIGIN_VERIFY_SECRET` set to match. `daily-briefing-cron` confirmed calling `www.superadpro.com` (through Cloudflare) so the header is stamped. `CRON_SECRET` confirmed propagated to the cron service.

### Verified this session (tested against live raw origin)
- **`/cron` lock:** raw origin `/cron/*` → **403** (`{"error":"Forbidden"}`, the middleware, before the secret check). Through www → passes the lock (reaches the maintenance wall), proving Cloudflare stamps the header AND it matches Railway. Bypass dead.
- **Breach replay layers re-confirmed live:** `/docs`,`/openapi.json`,`/redoc` disabled at the FastAPI constructor (404 on reopen, currently maintenance-masked); dev/owner endpoints (`activate-owner`,`run-migrations`,`force-wipe`,`test-grid-fill`) → **404**; admin money endpoints (`adjust-balance` GET + POST API) → **403** raw origin / **302** CF-Access challenge via www.
- **Payment inbound can't be spoofed:** Stripe webhook verifies signature (`construct_event`); NOWPayments IPN verifies HMAC-SHA512 + only acts on pre-existing orders + guards status-downgrade; BSC scanner credits on real on-chain transfers only.
- **Treasury key clean:** used only at the two signing points, never logged/echoed; no endpoint dumps env. The 5 hardcoded `*_CONFIRM_TOKEN` strings are all behind `_require_admin` (secondary confirmations, not the gate).
- `SKIP_MIGRATIONS` confirmed **NOT set** → `withdrawal_approvals` self-creates on the `4e99c92` boot. `run_migrations()` applies each statement independently (per-statement commit, skip-on-error), so a missing/failing migration elsewhere doesn't block it.

### Currently watching / open (treasury-first ranking)
1. **#1 risk = treasury hot-wallet key lives on the server.** App locks protect the *app's* path to the key, not the key. Mitigation is OPERATIONAL not code: **sweep treasury to a cold wallet (key NOT on any server), keep only a thin payout float on the hot wallet.** Highest-value next move; free. Do before reopening withdrawals / before parking real money.
2. **Withdrawal approval lock NOT yet live-tested** (treasury frozen). At reopen: confirm `withdrawal_approvals` exists → enrol admin TOTP → create a real `awaiting_approval` row → release with code → confirm send + approval row written.
3. **Secret-in-URL admin endpoints (P2).** Defended by CF-Access + origin lock + rotated secret, but it's perimeter defense. Convert money-affecting ones to authenticated POST.
4. **Detection blind spot (the "smoke alarm").** `security-watch` watches new admins / balance adjustments / withdrawals — NOT the breach signature. Extend with **treasury-balance-drop**, **instant-activation-without-verified-payment**, **synthetic-payment** alerts. (This is the "audit log" reframed as detection; `withdrawal_approvals` is its first record type. Note: Steve is sole operator — accountability angle irrelevant; detection is the value.)
5. **`/api/videos` 500 diagnosed:** `explainer_videos` is a model but missing from `run_migrations()` (NOT a SKIP_MIGRATIONS issue). One-line fix (add CREATE TABLE), deferred.
6. **Rotate the GitHub PAT** — still in plaintext in project instructions; used this session.
7. Breach recovery now with **UK Action Fraud** (Steve filed; Tether freeze out of his hands). Attacker accounts 670/673/674 = evidence, **do not delete**.



Platform is **OFFLINE** (`MAINTENANCE_MODE` on) and **withdrawals FROZEN** (`WITHDRAWALS_ENABLED` unset). This session hardened the platform against the 3-Jun treasury breach and **verified the exact attack chain is closed**. HEAD = `fb088e816`.

### The breach (context)
3 Jun: attacker exploited a guessable hardcoded owner secret exposed via public `/docs`, used secret-gated admin GET endpoints to mint instantly-activated accounts + synthetic grid payments, and drained ~1,187 USDT from the **company** BSC treasury (`0xb2Ccdf9050A8d05A346F6879eC4fa633f9b2554D`). **Member ledger intact.** Funds laundered to `0x4cd00e387622c35bddb9b4c962c136462338bc31` (Tether freeze requested — time-sensitive). Attacker accounts = user ids **670 / 673 / 674** (`hackerpwn*`, `@test.com`, no sponsor, instant-activated). **PRESERVE as evidence — do not delete.** (671 `abd` / 672 `danny12` are real referred signups, not the attacker.)

### Commits (4 June)
| Hash | What |
|---|---|
| `2f7bcbed9` | 2FA-gated manual withdrawal release — new withdrawals queue as `awaiting_approval`; admin releases via TOTP at `/admin/withdrawals-queue`. **NOT yet end-to-end tested.** |
| `761e22d60` | P0 secret-log redaction — scrubs `secret=`/`token=`/`bearer` etc. from all logs. |
| `ed99f0903` | P3 Cloudflare Access **origin lock** on `/admin*` (+ bare-`/admin` maintenance allowlist fix). |
| `b1aaadb60` | Owner sign-in at **`/admin/signin`** (server-rendered, works during maintenance, behind Access; reuses password + TOTP + session). |
| `928965dc2` | Authenticated admins **bypass maintenance** entirely (React admin dashboard + APIs work during lockdown; everyone else stays offline). |
| `fb088e816` | P2: lock `/cron` to Cloudflare-only via stamped `X-Origin-Verify` header — **INERT** until `ORIGIN_VERIFY_SECRET` env is set (activation PENDING). |

### Verified — exact attack chain closed (tested against live origin)
1. Public API docs → **disabled** (`ENABLE_API_DOCS` unset → `docs_url=None`).
2. Hardcoded owner secret → **gone** from codebase.
3. Owner/dev endpoints (`activate-owner`, `force-wipe`, `test-grid-fill`, `run-migrations`) → **404** from internet (DevEndpointGuard).
4. Admin money endpoints (e.g. `adjust-balance`) → **403** from internet (Cloudflare Access + origin lock).
5. Treasury send → **frozen** (`WITHDRAWALS_ENABLED!=true`); 2FA-gated when re-enabled.
6. Leaked `ADMIN_SECRET` + `CRON_SECRET` → **rotated 4 Jun** (new values live in Railway); old values verified **dead** (403).

### Access architecture (new)
- **Cloudflare Access** (email-OTP, Steve only) on `www.superadpro.com/admin*`. Team domain `young-rice-7806.cloudflareaccess.com`; AUD `2cb5fbefff16c3acd009ce08593d5e93f6c68505a68417d623e170f4573998aa`. Railway env `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD` set & active.
- **Origin lock** validates the CF Access JWT at the app on `/admin*` — raw-Railway-origin `/admin*` → 403.
- **Owner sign-in** `www.superadpro.com/admin/signin` (password → TOTP → session) is the only way to obtain an app session during maintenance.

### PENDING — `/cron` Cloudflare-only lockdown (2-min job next session)
Code shipped & inert. To activate: (1) Cloudflare → Rules → Overview → **Create rule** (button is in the main panel top-right of the new dashboard; or search "Modify Request Header") → Transform Rule, **Set static** request header `X-Origin-Verify` = `<fresh secret>` on All incoming requests; (2) Railway main service env `ORIGIN_VERIFY_SECRET` = `<same secret>` (generate a FRESH value — don't reuse chat). **Caveat:** confirm `daily-briefing-cron` calls the **public www domain** (through Cloudflare) or it'll be blocked. Escape hatch: unset `ORIGIN_VERIFY_SECRET`.

### Watch / open
- Withdrawal-release 2FA gate not end-to-end tested (do once treasury funded + `WITHDRAWALS_ENABLED=true`).
- Solvency gap ~$531 (treasury ~$1.76 vs ~$533 owed-withdrawable). Tether freeze on `0x4cd00e...` time-sensitive.
- Confirm `daily-briefing-cron` got the new `CRON_SECRET` (else 06:00 UTC briefing fails) and calls the public domain.
- `SECURITY.md` not yet written; audit log (P0) not built; P1 auth primitives + P2 endpoint conversion pending.
- Reopen: website can return before withdrawals; withdrawals wait on gate test + solvency.

---

## Status as of 2026-06-03 (Tuesday) — PAGE-BUILDER TEMPLATE REBUILD + REAL THUMBNAILS

Long evening session. Continued the member-facing funnel-template rebuild, consolidated the three competing template sources behind one authoritative set, and gave both the Create-page picker and the Pages dashboard real scaled live thumbnails. All commits rebuilt the static bundle (hash changed) — no stale-bundle pushes. HEAD = `f3017dc89`.

### Commits (3 June)

| Hash | What |
|---|---|
| `951d278e7` | Rebuild **Book a Call** template (id `coaching`) — sage/green palette, real booking-card form capturing name/email/topic via `data-sp-submit`, DM Sans/Sora, dropped dead `testimonial` element type. |
| `c3256a74b` | **De-Labs visible UI** — admin sidebar "Labs: Page Builder" → "Page Builder (Beta)"; editor "Back to Labs" → "Back to Beta". Internal file/component/`.labs-chrome` names left untouched (invisible; renaming = pure risk). |
| `033ed6e7f` | Rebuild **Course Sales** template — premium violet, 2-col benefit headline + price/guarantee left, course-player card right, "Enrol now" CTA with member-set checkout link (`url:''`). Dropped Manrope/amber/stats clutter. |
| `38c65b852` | **Create-page consolidation** — `/pro/funnels/new` now serves the authoritative `LABS_TEMPLATES.filter(ready)` set via a `PICKER_TEMPLATES` adapter; selecting one creates the page client-side via `/api/funnels/save` (gjs_css = template content). Retires the old `template_builder.py` from-template path for the picker (left dormant, not deleted). Blank + AI "coming soon" banner + CampaignSetupModal binding all preserved. |
| `fe0c7ad79` | **Real template thumbnails** — new reusable `components/PagePreview.jsx` renders exported HTML in a scaled, ResizeObserver-sized `srcDoc` iframe (never hits `/p/`, so no analytics inflation; pointerEvents:none). Create-page tiles show the actual design; **Blank pinned to top-right** of the 3-col grid. |
| `f3017dc89` | **Dashboard page thumbnails** — `/pro/funnels` cards lead with a real scaled `PagePreview` of each page + status pill on the thumbnail, title/slug moved below; "No preview yet" empty state for blank pages. Backend adds `gjs_css` to the `/api/funnels` list dict; PagePreview gained IntersectionObserver lazy-mounting so a dashboard with many pages stays fast. |

(Lead Magnet was rebuilt `a285a21cc` in the prior session — it's the first `ready` template.)

### Template lineup (decided this session)

Final Create-page set = **8 full-design templates**: Lead Magnet ✓, Book a Call ✓, Course Sales ✓ (3 built/`ready`), then **Product Launch** (coral, folds in VSL's video option), **Webinar Registration** (midnight+gold), **Link in Bio** (indigo→teal), **Affiliate Funnel** (build — core to audience), **Business Opportunity** (build — core). Thank You → simple utility.

**Build-then-flip model:** only templates flagged `ready:true` in `labsTemplates.js` appear in the picker. Rebuild each → flag ready → it shows automatically. Members keep the current live set with zero disruption meanwhile.

### Brand-scope rule clarified (locked)

The house lock (cobalt/cyan/white + Sora/DM Sans) applies **only to SuperAdPro's own surfaces** (editor chrome, dashboard, marketing site, sidebar). It does **not** govern member-created content — page-builder TEMPLATES and anything a member designs on the canvas should span a varied, tasteful palette (green/coral/violet/gold/gradients) like Leadpages. The cobalt/cyan chrome just frames whatever colour the member's page is.

### Thumbnail separation (no cross-contamination)

Three separate buckets, no bleed: (1) **built-in templates** — code-defined in `labsTemplates.js`, shared, identical for everyone, thumbnails from the template's own content; (2) **member pages** — private per-account, thumbnails from their own `gjs_css`, shown only on their own `/pro/funnels`; (3) **personal custom templates** — a member's explicit "save as template", stored in their own browser localStorage (`labs_custom_templates`, 30 cap), shown only in their own in-editor gallery, shared only via a manual `SAP-XXXX-XXXX` code. A member's page never carries across into the shared template picker.

### NOT yet verified by Steve (first action next session)

- **Create→edit round-trip** — open `/pro/funnels/new`, click a template (e.g. Course Sales), confirm it opens in the editor as that design, publishes, and the form captures a test lead. Code contract verified end-to-end; the live click-through is not.
- **Dashboard thumbnails** — open `/pro/funnels`, confirm the Lead Capture Page shows a real thumbnail and the blank "Untitled Page" shows "No preview yet".

### Still open (page builder)

- **Block icons** — Steve shown a 3-option mockup (mono / per-type colour / tinted chips). Awaiting his pick to wire into `BlockPalette.jsx`. Recommendation: option 3 (tinted chips). Editor chrome is a house-palette surface, so colourful icons are a deliberate exception there.
- **Build remaining 5 templates** (Product Launch, Webinar, Link in Bio, Affiliate Funnel, Business Opportunity) using Course Sales / Book a Call as the build pattern.
- **Beta-gate mechanism** (is_admin + env-flag on the prod route) — isolation model approved but the gate itself is NOT built. Genuinely isolated today = only the localStorage sandbox.
- **De-Labs step 3** — clean `/labs/...` URLs → `/pro/...` with redirects (sidebar item still points to `/labs/pagebuilder`, so the address bar still shows "labs").
- **"Profit Grid (Labs)"** title (`LabsGridVisualiser.jsx:105`) — need Steve to say finished tool (drop "(Labs)") vs beta.
- **Cleanup once flow confirmed** — delete dormant `data/funnelTemplates.js` `TEMPLATES` + the `template_builder.py` from-template path.

### Environment note

The visualizer / inline-mockup MCP tool (`show_widget`) timed out this session ("local MCP server unresponsive"). Fell back to a standalone HTML mockup file. If inline visuals fail again next session, Steve may need to restart local MCP servers.

## Status as of 2026-06-02 (Monday) — LABS PAGE BUILDER CHROME CLEANUP (EMERGENCY HANDOVER)

Chat context filled mid-session before a handover doc could be produced. State below was reconstructed in a fresh recovery session by cloning `main` and inspecting the commit log — every claim here is verified against the repo, not memory. Work was confined entirely to the **Labs** sandbox (`frontend/src/pages/labs-superpages/`, all CSS scoped under `.labs-chrome`). The live editor members use (`pages/superpages/`) was not touched in either commit.

### Commits (2 June)

- **a441c415a** — Labs Page Builder: remove off-brand purple, unify on cobalt+cyan. `Browse templates` button purple gradient → deep cobalt; core accent token `--labs-accent-end #a855f7` → `#22d3ee`; multi-select / device-label purples → cyan; sandbox-list + templates-gallery chrome buttons recoloured; Save button green `#22c55e` → cobalt. Bundle rebuilt (`LabsChrome-B0cLI30l.css`).
- **a198a4cb3** — Labs Page Builder: neutralise blue workspace + lighten block tiles. `.labs-chrome` root `#f1f5fb` base + cobalt radial wash removed; `Canvas.jsx` + `SuperPagesEditor.jsx` canvas surrounds blue/pink radial → flat neutral `#f4f5f7`; `.pal-item` tiles lost dark-navy border + triple-cobalt fill → clean `1px #e8edf3`; tile icons now grey `#64748b` by default, cyan `#0ea5e9` on hover only. Bundle rebuilt (`LabsChrome-q1J6Jxbb.css`).

Both commits rebuilt the static bundle (hash changed), so neither shipped a stale bundle.

### The problem being solved

The Labs editor chrome read "cheap." Diagnosis evolved across the session: first chased off-brand purple (too subtle — Steve's verdict was "nothing changed"), then identified the real causes as (1) the whole workspace bathed in a pale cobalt-blue wash and (2) bright uniform sky-blue icons + chunky square tiles. `a198a4cb3` fixed the wash and de-saturated the icons.

### NOT yet verified by Steve

The chat died right as / just after `a198a4cb3` landed. Steve's last *seen* state was the purple-only commit (`a441c415a`), which is why he said nothing changed. **He has not hard-refreshed and reacted to the neutralised workspace.** First action next session: get him to open `/labs/pagebuilder`, hard-refresh, and react to the current build.

### Still open (design, Labs only)

- **Compact horizontal tile layout** (icon + label side-by-side) was mocked and tentatively liked but **not built**. Tiles remain square/vertical. This is the main remaining lever if the neutralised version still feels flat.
- **Save button green → cobalt** was a flagged decision in `a441c415a`. Steve has not confirmed whether he misses the green "commit" affordance. 30-second revert if he does.

## Status as of 2026-05-29 (Friday midday) — STRIPE RECONCILIATION CLEAN + TEAM PULSE ADAPTIVE

Short midday session after a long 4.7 session the previous night (see prior handover for the 17 commits that landed overnight: Lead Magnet template, Team Pulse card initial build, Purchases & Holdings page, Daniela billing case resolution, financial_sanity Stripe blind spot closed, activation-funnel diagnostic). This session: 1.5 hours, 3 commits, no regressions.

### Commits (29 May midday)

| Hash | What |
|---|---|
| `cb8681afd` | `/admin/api/stripe-reconciliation?days=N` — permanent diagnostic, cross-checks every StripeCharge in window vs fulfillment table per product type (campaign_tier→GridPosition, nexus_pack→CreditPackPurchase, etc.). Default 7 days, max 90. |
| `cc872338b` | Team Pulse adaptive card — new `team_pulse_actions` table, `POST /api/team-pulse/dismiss`, GET filter. **Initially wrong trigger** (dismissed on click, not send). |
| `2d3c586ea` | Team Pulse — dismissal trigger corrected to fire on actual `/api/team-messages/send` success in TeamMessenger when recipient matches URL-passed target. |

### Michell Gustavsson billing case — resolved

Member queried "$20 paid but Campaign Tier 1 didn't activate." First diagnosis (mine, wrong): Stripe webhook race left her without fulfillment. Real story after hitting `/admin/api/user-fulfillment?user_id=523`: she bought a Credit Nexus Starter Pack ($20, 100 credits — got them), then attempted Campaign Tier 1 separately and her card declined for insufficient funds (because the Nexus pack had just cleared $20 minutes earlier). She's been served correctly. Email draft ready for Steve to review and send.

**Repeat of the Daniela lesson from last night:** `lookup_user` only reads the payments table; GridPosition and CreditPackPurchase are invisible to it. `/admin/api/user-fulfillment` is the canonical "did the member get what they paid for" endpoint. Use it FIRST for any billing query.

### Stripe reconciliation result

`/admin/api/stripe-reconciliation?days=7` → **168 charges checked, 168 matched, 0 mismatched, 0 unknown.** Stripe rail is healthy for the audit period — the webhook race + advisory lock + double-fire guard fixes from late May are holding. The Michell case was genuinely an isolated user-flow misunderstanding, not a webhook bug pattern affecting others.

### Real bug found while investigating Michell — not yet fixed

Her membership Payment row #278 records `amount_usdt=20.0` (should be $15) and her membership_company commission #837 paid $10 (should be $5 — Founder math is sponsor $10 + company $5). $5 over-credit to company. Almost certainly affects all 4 founders converted during the 28 May spot-allocator bug window: williamnormanii, earnwithjason, earningcreator, michellg. Net company over-credit if pattern holds: ~$20 across the 4 accounts.

**Parked for next session:** audit each of the 4 via `/admin/api/user-fulfillment`, then one-shot SQL to fix the 4 Payment rows and reverse the $5 over-credits.

### Team Pulse card behaviour now

- Card shows up to 5 prompts: `just_joined` (24h), `just_activated` (24h), `unactivated_warm` (1-7d)
- Click Welcome / Say hi / Send nudge → land in TeamMessenger with contact pre-selected, template pre-filled, AND `kind` passed via URL
- Hit Send in TeamMessenger → dismissal fires server-side for `(sponsor, target, kind)`
- Next dashboard load → that prompt is gone, next queued prompt fills the slot
- If sponsor switches to a different contact in TeamMessenger and sends to them, no dismissal — the original prompt is correctly left on the card
- State transitions resurface members naturally (e.g. just_joined → unactivated_warm at day 2+ is a NEW kind, different dismissal scope)

### Still open

- $5-per-founder cleanup on the 4 spot-allocator-affected accounts (HIGH priority — small money but real)
- Templates Session 2: Video Sales Letter (still parked)
- Templates sessions 3-6: Webinar / Consultation / Link Hub / Earn
- Retire old 9 templates from picker
- Funnel page copy rewrite (waiting on Steve's words)
- Reach-out-to-recent-registrants admin tool (Steve hasn't ruled)
- Mobile "Wa..." title truncation on Watch page
- 7 stuck NOWPayments orders (cosmetic)
- i18n batch (19 locale files stale + 6 training locales)
- **DB backups still broken** (pg_dump missing — TOP PRIORITY, multiple sessions in a row)
- Wider Stripe reconciliation past 7 days (30/90-day sweep — not urgent, 7-day is clean)

---

Short morning session. Two real money bugs, both surfaced by Steve reading the dashboard and asking why numbers didn't reconcile. Both fixed.

### Commits (28 May)

| Hash | What |
|---|---|
| `1dc40d7` | Admin per-user commission trace endpoint `/admin/api/user-commissions/{username}` |
| `d952cfb` | Stripe webhook race fix — per-user advisory lock in both handlers + audit/reverse tooling |
| `5a0e637` | `/admin/api/sweep-double-pays` — browser-friendly batch cleanup (dry-run default, `?confirm=yes` to execute) |
| `9de748a` | Layer 2 commission idempotency — `Commission.source_event_id` + partial unique index |
| `1d6938e` | CRITICAL: founder allocator MAX-vs-COUNT bug fixed + `/admin/api/grant-founder/{username}` |

### Bug 1 — Duplicate sponsor commissions (Stripe webhook race)

Floyd (@ourfreedom) asked why his balance was $30 with only 2 referrals. The new commission-trace endpoint showed 3 `membership_sponsor` rows — two of them 350ms apart on the same signup (Dan / @dprose55420), one `stripe` and one `stripe-invoice-recovery`.

Root cause: `checkout.session.completed` and `invoice.paid` arrive within milliseconds, hit different Railway replicas, both read `is_active=False` before either commits, both activate + pay the sponsor. The 26 May guard (`if user.is_active: return`) was correct logic but not atomic.

Fix (three layers): per-user `pg_advisory_xact_lock` in both handlers + `db.refresh` recheck + DB partial unique index on `(from_user_id, to_user_id, commission_type, source_event_id)` keyed on `stripe_sub:<subscription_id>`. Race now impossible by construction.

Cleanup: audit found **8 duplicates platform-wide, $80 over-paid.** Reversed all 8. **$30 recovered** (cashflow, starthere, ourfreedom still had balance); **$50 absorbed** (earnwithdarius had already withdrawn 5 duplicates). Floyd messaged with the "plain & accountable" explanation. Verified zero duplicates created since the fix deployed.

### Bug 2 — Founder allocator closed the offer 9 spots early

Steve spotted "95 active members but 91 founders" on the dashboard. Investigation: the founder-spot allocator gated on `current_count < 100` AND `max_spot_taken < 100`, assigning `next_spot = MAX+1`. Demoted/cleaned-up accounts left gaps in spot numbering (62, 69, 73, 77, 81, 85, 88, 91, 96), so `MAX(founding_spot_number)` climbed to 100 while `COUNT(is_founding_member)` was only 91. The moment spot #100 was assigned (maxtein, 23:48), `max_spot_taken < 100` went false and the offer silently slammed shut — new signups fell through to $20 Partner pricing despite 9 real spots open.

4 members paid $20 Partner overnight while Founder spots were available: williamnormanii, earnwithjason, earningcreator, michellg.

Fix: cap gate uses COUNT only; spot number fills lowest unused gap ≤100 via `generate_series` LEFT JOIN (recycles vacated spots, collision-safe under the existing advisory lock). The 4 affected members retroactively converted to Founders @ $15 locked, silently, via new `/admin/api/grant-founder/{username}` — filled spots 62, 69, 73, 77. Per Steve: **$5 differences not refunded unless a member asks; no notification sent.**

Verified: `active_but_not_founding` now empty. 95 founders, 0 active Partners, 5 real spots remaining (#81, #85, #88, #91, #96). Status endpoint and allocator now agree.

### Decisions logged

- Test/admin accounts (incl. Master Affiliate user #1) holding ~6 founder spots are **deliberately left in place** — risk-for-no-reward to demote them.
- **Post-cap strategy:** once the last Founder spots fill, the focus is entirely **Partner acquisition at $20/month ($10 to the business)**. The Founder offer was a launch accelerant; Partner volume is the ongoing engine.

### Counts at session point

- **95/100 founders, 5 real spots left.** Likely fills today.
- Total users 362, 95 active, ~89 paid real money.
- Total revenue ~$2,668; commissions paid ~$1,757 (66% payout ratio).

### Still open

- Database backups still broken (pg_dump missing — TOP PRIORITY)
- Revenue display shows 3 decimals (cosmetic)
- BSC scanner monitoring alarm (unbuilt)
- Daily integrity-check cron (unbuilt — would have caught both of today's bugs within 24h; highest-leverage safety investment remaining)
- Stripe webhook delivery reliability (the not-arriving variant)
- Layer 3 idempotency for NOWPayments + WalletConnect rails (only Stripe done)
- Other commission insertion sites (lines 18099, 18173) not yet on idempotency path

---

## Status as of 2026-05-27 (evening) — FOUNDER DEADLINE LIVE + TEAM GIFTING BUILT + INFRA STABILISED

**Single-day push to set up the Founder offer closure on Friday 29 May 23:59 UTC.** Five commits across the afternoon and evening; multiple infrastructure issues caught and resolved mid-session; one customer-support incident handled. Email and Facebook announcement went out cleanly to drive activation against the deadline. Session length: ~10 hours.

### Shipped today (27 May 2026)

**Founder offer time-deadline (commit `6558518`):**
- Founder offer now closes on whichever comes first: 100 spots OR `app_config['founder_offer_close_at']` timestamp. Initial deadline seeded at `2026-05-29T23:59:00` UTC.
- Helper `_founder_offer_still_open(db)` in `app/main.py` is canonical. Fail-open on config parse errors (better to sell a spot we shouldn't than block one we should).
- Wired into 3 public activation rails: `_activate_membership` (Stripe / NOWPayments / WalletConnect), balance-rail activation, PIF gift-claim flow.
- Admin tools (`/admin/founder-promote-from-balance`, `/admin/stripe-recover-user`) intentionally NOT gated — admin can still promote case-by-case for edge cases.
- New admin endpoints: `GET /admin/api/founder-offer-status` (read state) and `POST /admin/api/founder-offer-deadline` (update at runtime).
- Idempotent app_config seed — won't clobber existing value if Steve changes the deadline via admin endpoint.

**Team gifting full build, feature-flagged OFF (commit `a3b2a23`):**
- Members can directly gift $20 memberships to inactive direct referrals; recipient gets in-platform notification + 7-day window to accept or decline.
- No refunds — declined/expired vouchers return to gifter for re-targeting or conversion to shareable link.
- Schema: `gift_vouchers` extended with `reserved_for_user_id` (FK users) + `reserved_until` (datetime). New statuses: reserved/declined/expired.
- Backend endpoints: `/api/pay-it-forward/giftable-team` (list candidates), `/create-team-gift` (creates), `/api/gift/team/{code}/preview` (recipient sees gifter + msg), `/accept`, `/decline`, `/api/pay-it-forward/retarget/{code}` (gifter re-target or convert).
- Lazy expiry — sweeps reserved vouchers past their 7-day window on every dashboard load instead of a separate cron.
- Frontend: new `/gift/team/:code` route placed BEFORE `/gift/:code` in App.jsx (React Router order matters). New page `TeamGiftAccept.jsx`. New card on `PayItForward.jsx` that only renders when `teamData.enabled === true`.
- Sponsor commission on accept: $10 via `gift_membership_sponsor` commission type. Founder allocation honours the deadline via the same `_founder_offer_still_open` helper.
- Feature flag `app_config.team_gifting_enabled = 'false'` by default. Enable post-Founder-close via `POST /admin/api/team-gifting-flag {"enabled": true}`. Disabled now because the 7-day acceptance window could straddle the Founder cap.

**Dashboard banner countdown (commit `c2acc6c`):**
- `FoundingPartnerBanner.jsx` extended with live 1s-tick countdown alongside the existing 60s API poll.
- Format adapts to time remaining: `2d 12h 30m` → `12h 30m 15s` → `30m 15s`.
- `/api/founding-members/status` extended to return `deadline_utc`, `closed_by` (`null` | `'count_cap'` | `'deadline'`), `now_utc`. `is_open` now reflects both caps.
- Banner copy updated: "Final Call · Founding Partner Circle", "{N} of 100 seats left · closes in {countdown}", final-call subline.

**Banner shows to all users with role-aware CTA (commit `7c57426`):**
- Steve's call: paying members should also see the deadline so they can push their downline. Removed the `if (user.is_active) return null` skip.
- Free members see: eyebrow "Final Call · Founding Partner Circle", CTA "Claim Your Seat →" → `/upgrade`, subline about locking in $15/month for life.
- Active members see: eyebrow "Final Call · Push your team before Friday", CTA "Push my team →" → `/my-team`, subline about $10 sponsor commissions on every Founder activation before deadline.
- Auto-hides for everyone when `status.is_open === false` (count filled OR deadline passed).

**Broadcast formatter fix (commit `3ccb6a1`):**
- Steve hit a wall-of-text problem preparing the announcement email — pasted plain text rendered as one block because HTML collapses whitespace.
- New helper `_normalise_broadcast_body(body)` in `app/main.py` detects already-HTML vs plain text via block-tag presence. Plain text path: escape HTML special chars, linkify bare URLs (cyan, underlined), split blank lines into `<p>` paragraphs, single newlines become `<br>`. HTML path: passes through unchanged. Both routes get wrapped in a typographic `<div>` with inline styles (Helvetica Neue, 15px, line-height 1.6, max-width 600px) for email-client compatibility.
- Frontend: `AdminEmailBroadcast.jsx` Compose tab label changed from "Body (HTML allowed)" to "Body". Placeholder + hint line updated to explain plain text is auto-formatted.
- 5 unit tests passing locally: plain Founder email → 8 paragraphs + linked URL + signature break preserved; already-HTML passes through; empty input handled; HTML special chars escaped in plain text; multiple URLs linkified.
- Steve verified: "That worked beautifully."

### Customer-support handled

**Floyd / Ray Toppin (user 482, Founder #84):**
- Signed up 12:00 UTC via referrer `joinus`. Created WalletConnect order at 12:11:20 UTC for $15.40. Paid $15.40 USDT from `0xF54Bc3E773dE149e757Eb6547f2D7aeF024fB093` to treasury at 12:11:32 UTC (BSC tx `0x0902154b050285f70d65c37baa32de290b5d54fd4b213072200c14d65145bd79`).
- The BSC scanner was stalled (see infrastructure below) and didn't process his transaction. Floyd waited ~27 minutes then paid via Stripe at 12:38:53 UTC; activated as Founder #84.
- Identity verification: when Steve asked "How do we know it was Floyd?", Claude initially inferred from amount + timing. Correct verification was Floyd's own tx hash from his wallet history — only the actual sender has that. Floyd produced it on email reply, confirmed identity.
- Steve manually refunded $15.40 USDT to Floyd's BSC wallet (refund-via-crypto chosen to avoid affecting Stripe's processor relationship via refund rate metric).

### Infrastructure issues caught and resolved this session

**BSC scanner silently stalled for ~6.5 hours.** Last successful scan at 06:18 UTC; discovered ~12:40 UTC during Floyd's diagnosis. Cause: orphaned Postgres advisory lock held by a dead/hung connection. Scanner thread kept running but `pg_try_advisory_lock` always returned false, producing "skipped: lock_busy" heartbeats with no actual scanning. Resolved by Railway service restart at ~13:47 UTC. **Follow-up needed:** monitoring alarm so this never happens silently again.

**Two Railway crons crashing on 401.** `daily-briefing-cron` (06:00 UTC) didn't fire; `stuck-lapsed-alert-cron` also crashing. Cause: `CRON_SECRET` rotated in the main API service but not propagated to the cron services (Railway env vars are per-service). Steve manually synced the secret across all three services. Crons will succeed on next scheduled run.

**Broadcast formatter dropping paragraph breaks** — fixed in `3ccb6a1` (see above).

**Creative Studio 502 from Evolink upstream** — identified as third-party issue, not platform bug. JSONDecodeError caught in current path but raw HTML exposed in error message. Logged as a follow-up; not fixed today (third-party 502s usually auto-recover and member can retry).

### Outbound communication today

- **Facebook community post** — "Plain heads-up" variant posted hours before the email.
- **Email broadcast** — subject "Founder pricing closes Friday — 23 spots left". Sent to free members only via `/admin/api/broadcast/send`. Used the new formatter — Steve confirmed it rendered cleanly.
- **Reply to Floyd** — "Plain & accountable" variant. Acknowledged duplicate, confirmed active status, promised crypto refund. Refund completed by Steve at session close.

### Counts at session end

- 77 of 100 Founder seats taken. 23 remaining.
- Founder offer deadline: 2026-05-29T23:59:00 UTC (~58 hours from session end).
- Total users: 315.
- New today: 45 new users in last 24h, 17 membership purchases today.
- 116 commissions paid today across all streams.

### Lessons added to docs

- **Schema-trust pattern (now hit twice in 24 hours)** — schema comments and field names are hints, not definitions. Grep for actual writes/reads/validators before describing what a field MEANS.
- **BSC scanner stall failure mode** — orphaned advisory lock requires service restart; in-process thread can't recover on its own. Needs monitoring.
- **Cron-secret-sync foot-gun** — Railway env vars are per-service; rotating in one doesn't propagate. Update all consumers in one pass.
- **Identity-via-token-not-inference** — when money is moving, require a token only the real party can produce (e.g. tx hash from the sender's wallet history). Amount + timing isn't enough.
- **Tone calibration on "I have no idea what you are talking about"** — that's a signal to stop, simplify, give actionable instruction. Not to defend the previous message.

Full lesson detail in `docs/WORKING_WITH_STEVE.md` (appended this session).

### Watch overnight / tomorrow

- Founder count from announcement landing. Expected: small bump tonight, bigger surge Thursday afternoon, possible cap-fill before Friday's deadline.
- Daily-briefing email tomorrow 06:00 UTC — first scheduled run after the secret sync. If it fires successfully, cron is verified.
- BSC scanner — still no monitoring alarm. If it stalls again, no one will notice until a customer surfaces.

### Open items not addressed today

- Stripe webhook delivery reliability (3 members affected in 24h via the `invoice.paid` self-healing path).
- Post-signup copy fix (cost Kelly her membership on 26 May).
- AI funnel generator at `/api/funnels/ai-generate` (needs Steve pre-decisions).
- My Marketing hub per `docs/my-marketing-plan.md`.
- `docs/commission-spec.md` describes 8×8/64 grid — current is 6×6/36 per `app/grid.py`.
- 28 orphan transfers (~$500 USDT) unmatched, manual reconciliation needed.
- BSC scanner monitoring alarm.
- Creative Studio video generator error handling on upstream 502.

### Late-evening continuation (after first handover commit 492c5a1)

Session ran another 5+ hours after the midway handover. Five more arcs:

**Annual billing went live (commits 6952a62 + 692bec7).** Steve created two new Stripe Prices ($150/yr Founder, $200/yr Partner), set env vars in Railway. I wired the code — backend resolver `get_price_id_for_tier(tier, billing)`, frontend passes `cadence` as `billing`, both webhook handlers read billing from metadata and pass through to `_activate_membership(billing="annual")`. Verified end-to-end: Stripe Checkout shows "$150.00 per year" + "Billed annually". Sponsor commission unchanged at $100 (10× monthly) per existing rule.

  First deploy of 6952a62 failed because it was bundled with a nixpacks change (`postgresql_17`) that broke Railway's build. Reverted just the nixpacks line in 692bec7 — kept annual code. **Lesson logged in WORKING_WITH_STEVE: don't bundle unrelated changes in one commit. Single-purpose commits are risk isolation, not bureaucracy.**

**Database backup investigation reached root cause but not fix (commits 4f28387 + 085f6b3 + e4ba662 + 692bec7).** The "Backup file too small" warning in Railway logs traced to `pg_dump` not being installed in the container. Diagnostic improvements shipped — proper `set -o pipefail`, capture pg_dump stderr to separate file, GET-variant trigger endpoint. Steve hit `/admin/api/backup/run` and got the definitive answer: `pg_dump: command not found (exit 127)`. **Backups have been failing for WEEKS, not days.** Tried adding `postgresql_17` to nixpacks; Railway build failed three times consecutively. Reverted. Code-side is ready; need correct package name (try `postgresql` plain, `postgresql_15`, or apt install via Dockerfile). **TOP PRIORITY post-deadline.** Updated to Open Issue #1 in PLATFORM_STATE.

**Broadcast formatter shipped before annual (commit 3ccb6a1 — captured in midway handover but the verification happened in this stretch).** Steve sent the Founder deadline announcement email after the fix. Confirmed: "That worked beautifully."

**Strategic exercise: ruthless competitor framing → Creative Studio v2 brief reveal (commit cba2cae).** Steve asked Claude to play smartest competitor and lay out a 12-month destroy-SuperAdPro plan. 6-defense breakdown produced; the ONE move identified as uncopyable in 12 months was a category-leading creative tool tied into SuperAdPro's ecosystem. Steve revealed he'd already been developing a brief along those lines (URL/PDF/doc/recording → polished AI-generated marketing videos, credit-based pay-as-you-go, brand memory via RAG). Brief saved to `docs/creative-studio-v2-brief.md` with 8 open foundational questions and explicit "do not build before scoping" markers. Listed as Open Product Decision #4 in PLATFORM_STATE. Decision point: post-Founder-cap-close, dedicated scoping session — not a build session.

**Counts at session end (~18:15 UTC):** **85/100 Founder seats taken (up from 77 at first handover, 72 at session start).** 15 remaining. Annual billing live. Team gifting ready to flip Saturday. Backup still broken. Creative Studio v2 brief parked for Saturday's scoping.

Final commit count: 12. Initially planned to ship 2 (deadline + team gifting); ended up shipping everything above plus the strategic clarity to make Creative Studio v2 the next 90 days.

---

## Status as of 2026-05-26 (evening) — VIDEO SALES PAGE + STRIPE WEBHOOK RECOVERY

**Long Tuesday-into-Wednesday session, ~21 hours of continuous work, 6 commits shipped tonight on top of the morning's grace-period work.** Three arcs: Video Sales Page production launch, Annemiek's stuck Stripe payment recovery, funnel-builder audit and broken-AI-button take-down.

### Shipped tonight (26 May 2026 evening)

**Video Sales Page — personalised sales page for every member (2 commits):**

- **`7141c1423` Video Sales Page — /ref/{username}/video + dashboard banner.** New React page (~900 lines, `frontend/src/pages/ReferralVideo.jsx`) at `/ref/:username/video`. Light cobalt/cyan brand (not dark public-page aesthetic). 22-min platform overview video from R2 (`superadpro-media/funnel-videos/SuperAdPro Overview1.mp4`). Custom video player — native HTML5 controls would overlay Steve's webcam in bottom-right of recording. 6×6 Profit Grid section with bespoke SVG (YOU node + gold L1 directs + cyan L2-L5 spillover + pulsing-gold seat #36 for completion bonus). Floating "+40% direct" and "+6.25% × 8 levels" tag badges. 5 toolkit value cards (blue/pink/green/amber/lavender). $20 vs $172/mo comparison. Clean centred Join CTA (no pricing-card box per Steve). All commission numbers verified against `app/grid.py`. Backend route `@app.get("/ref/{username}/video")` in `app/main.py` defined BEFORE generic `/ref/{username}` redirect — FastAPI route-segment matching needs more-specific path first. Dashboard banner inserted between welcome card and EXPLORE doors with NEW pill, "Your Video Sales Page is live" headline, URL + Copy + Preview buttons.
- **`9eb7442d5` Wire real R2 URL for hero background.** Steve uploaded the cyan growth-chart background to R2 (`marketing-bg/R9K1t.jpg`). Swapped placeholder URL for the real one. Verified HTTP 200, 113 KB JPEG.

**Bug fix from the video-page deploy (1 commit):**

- **`e41aefdf3` Fix orphan JSX comment leaking text onto dashboard.** My banner-insertion commit (7141c1423) chopped the opening of an existing JSX comment block. The body of the comment ("7 May 2026: dashboard simplified to action-only...") rendered as raw text above EXPLORE on the live dashboard. Steve caught it immediately on first refresh. Removed orphan comment body. Owned mistake: I shipped without previewing the live page first — exactly the "test before declaring done" failure mode.

**AI funnel builder take-down (1 commit):**

- **`af3971bf0` Disable broken AI page builder on /pro/funnels/new.** Member reported "Not Found" alert dialog when clicking Generate in the AI funnel wizard. Audit revealed `/api/funnels/ai-generate` was never built on the backend — only the frontend modal existed. Has been broken for every member who clicked the button since `/pro/funnels/new` shipped 18 May (10+ days). Replaced the active button with non-clickable "Coming soon" pill. Hero banner kept (Sparkles icon, Grok 4.1 label) so the AI direction is still signposted but honest about being roadmapped. Dead modal code left in place as scaffolding for the proper rebuild. The 8 niche template tiles + Blank Canvas continue to work — those routes are live.

### Customer recovery — Annemiek (user 354)

Paid Stripe $15 for Founder membership at 26 May 08:49 UTC. Sat inactive 9 hours because `checkout.session.completed` webhook never processed. Steve hit `/admin/stripe-recover-user/354?tier=founding&stripe_subscription_id=sub_1TbFjvBxEFGz0qoHDqAU8FpE&stripe_payment_intent_id=pi_3TbFj0BxEFGz0qoH11i4caZY&amount_cents=1500` while logged in as admin. Result: Founder spot #72/100, $15 price locked, sponsor `@blijdrage` paid $10 commission, full StripeCharge audit row written. Commission audit reports `overall_status: healthy` with zero flags.

### Data-integrity issues flagged (NOT yet investigated)

These all surfaced from `member_composition` tool output during tonight's investigation. Real issues, not blocking, need fresh-session investigation:

1. **16 of 70 "active" members have `membership_expires_at` in the past.** Renewal cron is not flipping them to inactive. Some show `expires_at` BEFORE `activated_at` by seconds (e.g. user 220 benzade: activated 10:34:49, expires 10:34:02). Race condition or stale lapsed-activation cleanup gap.
2. **2 active members have `membership_expires_at: null`** — `cryptobase26` (user 351, spot #54), `verokins` (user 325, spot #55). Will never expire under any cron logic.
3. **Stripe webhook silent-failure root cause unknown.** Annemiek's `checkout.session.completed` never processed. Three possibilities: not delivered by Stripe, signature verification failed, handler crashed AND alert email also failed. Needs Stripe Dashboard webhook delivery logs + Railway logs around 26 May 08:49 UTC.
4. **Dashboard "Active Members" count is misleading** — shows 70 but real active (excluding expired) is ~54.

### Funnel system cleanup — major deferred work

Steve's requirement: "one solid commercial-grade page builder system with a nice set of ready-made templates."

Current state has THREE template sources (`frontend/src/data/funnelTemplates.js`, `NICHE_TEMPLATES` in `app/main.py:19553`, `app/funnel_templates.py`) and one orphan launch-wizard endpoint (`/api/launch-wizard/generate-funnel` at line 6253) that writes to the same `FunnelPage` table but returns `edit_url: /funnels/visual/{id}` — a 404 frontend route. Also has fabricated fallback stats ("10,000+ Active Members" / "$2.5M+ Paid Out" / "4.9/5 Rating") that ship if Grok fails — never acceptable.

**Full cleanup plan in handover doc `/mnt/user-data/outputs/handover-2026-05-26.md`.** Estimated 2 fresh sessions, ~3-4 hours total: session 1 audit and consolidate, session 2 build `/api/funnels/ai-generate` properly with no fabricated fallbacks.

### What got better tonight

- Every active member now has a polished personalised sales page to share with their network — `/ref/{username}/video`
- One paying customer (Annemiek) unstuck after 9 hours
- One quietly-broken member-facing feature taken offline before more members hit the 404
- LAUNCH_LOG updated with tonight's commits + data-integrity issues flagged for tomorrow

### What needs to happen before next session

Steve to gather (when fresh, not tonight):
- Stripe Dashboard webhook delivery logs for 26 May 08:49 UTC
- Railway logs for "stripe" / "webhook" around that timestamp
- Decision on whether to proactively expire the 16 lapsed-but-active members or let the renewal-cron fix backfill them

---



**Long Monday-night-into-Tuesday-morning session, ~13 hours, 16 commits shipped.** Three major arcs: grid bonus pool fix + marketing badge, grace-period commission escrow system (the showpiece), and a same-session Stripe webhook double-pay caught-and-fixed via the daily-briefing audit.

### Shipped on 26 May 2026

**Grid bonus + marketing badge (2 commits):**

- **`91eff563` Grid bonus pool: pay full policy target.** Tier 1 grid paid $54 instead of $72 (bonus rate bumped 5%→10% mid-cycle). New rule: `_complete_grid` pays `max(actual_accrued, policy_target)`. Migration `migrate_grid_bonus_pools_one_shot()` runs 5 passes: bump active pools, top-up underpaid completed grids ($18 paid to Steve), backfill `grid_bonus_paid` badges, refresh icons + metadata, refresh notification icons (Pass 5 added later in `fd835bda`).
- **`32585672` Sequential tier purchase lock + purple ♛ badge.** Tier purchases must now follow 1→2→3→... order, enforced at 3 entry points (`process_tier_purchase`, NOWPayments, BSC). Plus new `Achievement.metadata_json` column so the grid bonus badge can display the actual $ amount + "Tier N Bonus" chip. Marketing showpiece, purple-gradient `.badge-card.earned.grid-bonus` styling.

**Grace-period commission escrow system (1 large commit):**

- **`5d7e2fd6` 3-day escrow + 4 notification channels.** When a downline upgrades to a tier their upline doesn't own, the 40% direct + 6.25% uni-level commissions are escrowed for 3 days instead of company-absorbed. If upline upgrades in time, commissions release. If not, expires to company.
  - New `PendingCommission` model + table with composite indexes
  - `_pay_direct_sponsor` and `_pay_unilevel_chain` escrow on unqualified upline
  - `_release_pending_for_user()` runs inside `process_tier_purchase` after success
  - 4 channels: in-app bell, instant email, dashboard amber countdown card (`PendingCommissionsCard.jsx`), T-24h reminder email
  - New `/cron/grace-period-cycle` (GET+POST, CRON_SECRET) handles expiry + reminders hourly — scheduled in cron-job.org
  - New `/api/pending-commissions` feeds dashboard

**Stripe webhook double-pay arc (4 commits, caught + fixed same session):**

- **`1844844b` Admin daily-briefing tooling.** `/admin/daily-briefing-status` + `/admin/trigger-daily-briefing` so we don't need to paste CRON_SECRET for diagnostics.
- **`4b73914` Admin double-pay scanner.** `/admin/double-pay-scan` classifies briefing audit findings as real duplicates vs legitimate sequences (e.g. signup commission + later upgrade commission for same pair).
- **`620ea97a` Root-cause fix.** When `earnwithdarius` signed up at 07:16:35 UTC, BOTH `_stripe_handle_checkout_completed` AND the `_stripe_handle_invoice_paid` self-healing branch (added 25 May for jerrygoff case) fired, both called `_activate_membership`, sponsor (`starthere`) got paid $10 TWICE (commissions 601 + 603, 500ms apart). Fix: primary guard in checkout handler (skip if user already active) + belt-and-braces guard inside `_activate_membership` itself (chokepoint backstop for any future caller).
- **`678c3810` Reverse-commission field-map fix.** My first reverse-commission endpoint debited wrong wallet fields for membership commissions (debited `campaign_balance` + `upline_earnings` instead of `balance`). Made it commission-type-aware. starthere wallet corrected via one-shot `/admin/fix-starthere-wallet`.

**Achievement toast on dashboard (4 commits):**

- **`9ba3fdbe` Slide-out toast when badges unlock.** Steve flagged the grid bonus badge wasn't visible — only on `/achievements` which has no nav link. Dashboard now polls `/api/achievements/unseen` on mount + every 60s. Purple-gradient toast renders top-right. Grid Bonus gets special variant with large $ amount + Tier chip.
- **`5ca31037` Debug-friendly replay endpoint.** `/admin/replay-my-badge-toast` flips ALL achievement notifs unread + returns full state inspection. Built mid-debug when title-LIKE matching wasn't reliable.
- **`fd835bda` Don't auto-mark-seen on appearance.** Toast was disappearing on refresh because mark-seen fired the instant the toast appeared. Now only marks seen on explicit dismiss (✕ click) or View Badges click. Plus Pass 5 migration refreshes notification icons 💎→♛ on boot.
- **`4755d352` View Badges link fix.** Was bouncing to dashboard because `/achievements` is a Jinja template, not a React route. onClick handler now uses `window.location.href` to force full-page navigation.

**Custom Domain promoted out of labs (6 commits earlier in session):**

- `d2339c3` PIF gift claim Founder spot allocation fix
- `1954fd4` `/help/custom-domain` step-by-step guide + Funnels link
- `8ec0771` Help page back link
- `6102c59` Help page diagrams + FAQ
- `d0706fb` Promoted `/labs/pagebuilder/custom-domain` → `/custom-domain` with 301 redirect
- `659c5c3` CustomDomain back link → `/funnels`

### Operational decisions confirmed this session

- **Both crypto rails are LIVE:** WalletConnect/BSC AND NOWPayments. CLAUDE.md saying NOWPayments is "retired" is wrong. Both paths must be considered when diagnosing payment issues.
- **Orphan wallet `0xa96be65…`** with ~$165 across 9 transactions is bot/scammer dust validation, not a real customer. Leave parked.
- **SuperPages V2 already shipped yesterday** — do not redo. Lesson for future sessions: ask "is this live yet?" before redesigning anything.

### Active watch items

- `daily-briefing-cron` and `stuck-lapsed-alert-cron` Railway worker containers report "deployment crashed" but the underlying endpoints are healthy and jobs DO complete (briefing #17 saved + emailed). Curl exit codes are non-zero for unknown reasons. Cosmetic alert, not a real failure. Worth investigating Railway logs at some point.
- `/achievements` is a Jinja server-render, not a React route. Long-term: build a proper React achievements page + sidebar nav link.
- No nav link to `/achievements` from anywhere — members can't easily find their badges. Toast partly addresses for newly-earned badges but a sidebar entry would let members revisit past badges.

---

## Status as of 2026-05-25 — PAGE BUILDER COMMERCIAL-GRADE PASS

**Long Sunday-into-Monday session, ~7 hours, 15 commits shipped.** Two major arcs: editor topbar reliability (4 iterations to a working overflow-detection design) and a full page builder typography rebuild that established the project's commercial-grade build doctrine.

### New project doctrine (now in CLAUDE.md top section)

Steve called this out mid-session and it's now permanent: **commercial-grade only. No trade-offs. No "for new content only" carve-outs. No quick-fix patches.** When a bug is found, the response is world-class engineering — root-cause analysis, full end-to-end fix, every affected surface considered.

Mental model: would Webflow / Leadpages / ConvertKit ship this? If no, neither do we.

Engineering instincts borrowed from other products must be tested against "what would a SuperAdPro member — an affiliate marketer, not a designer — actually expect."

### Shipped on 25 May 2026

**Topbar reliability arc (6 commits):**

- **`aa51c85d4` Open button distortion fix** — unicode ↗ replaced with lucide `ExternalLink` icon, `whiteSpace:nowrap`, `lineHeight:1`. Was wrapping on some font-stack/line-height combinations.
- **`19044b308` Topbar 3-cluster redesign** — uniform 36px pill height, pill style primitives (`pillM`, `pillM_accent`, `pillM_active`, `pillS`, `pillS_active`, `pillS_danger`, `pillS_accent`), three semantic clusters (LEFT: brand/back/dirty, CENTRE: zoom/device/undo-redo, RIGHT: tools/preview/publish/save/open). Feature on /explore button moved out of topbar to Funnels listing cards (new `icon` variant on `FeatureOnExploreButton.jsx`).
- **`d3f4c9f83` ResizeObserver v2** — switched from window-width thresholds to measuring bar's own clientWidth. Thresholds 960/780/640. FAILED on Steve's normal-width viewport because content needed ~1410px and his bar had ~1440px-ish — thresholds didn't trigger collapse even though content was clipping.
- **`89a47d57e` Overflow detection v3 (WORKING)** — replaced pre-computed breakpoints with actual `scrollWidth > clientWidth` measurement. Folds tier-by-tier until fit; un-folds with headroom check. Self-correcting, no width-guessing. Lesson: when a layout problem can be measured empirically, measure it.
- **`004d9878e` Dropdown freeze** — early-return in the overflow effect when `overflowOpen` is true. Fixes "topbar moves weirdly when clicking 3-dots" — was caused by sub-pixel layout shifts during dropdown mount triggering re-evaluation.
- **`cd952b775` Save-flow stability** — unsaved indicator always-mounted with `visibility: hidden` toggle (was conditional mount), Save button has min-width 92px to absorb "Save" → "Saving…" label change, removed `dirty` from overflow effect deps. Fixes "topbar moves weirdly when I click Save."

**WYSIWYG mobile + tablet preview (1 commit):**

- **`e122bf0b5` Real device rendering on canvas** — three render modes detected matching exportHTML.js exactly:
  - `absolute` (desktop OR any device with per-element overrides): elements positioned via absolute x/y
  - `scaled` (tablet, no overrides): canvas surface at CANVAS_WIDTH (1100), extra CSS scale transform of canvasW/1100 composed into outer scale wrapper
  - `stack` (mobile, no overrides): elements rendered as `position: relative` in vertical flow, full width with per-type max-widths via `:has()` selectors, font-clamp scaling
  - Scoped CSS injected into `.sp-canvas` via `<style>` block gated by `data-render-mode` attribute
  - Mirrors exportHTML.js responsive @media rules 1:1, single source of truth for responsive behaviour
  - Live walkthrough: Steve confirmed all three device modes work correctly

**Page builder typography (6 commits — full commercial-grade rebuild):**

- **`2ce764129` First-pass cascade fix** — removed `LabsChrome.css` `.labs-chrome p, .labs-chrome div, .labs-chrome span { font-family: Manrope }` blanket override that was force-cascading Manrope onto all canvas content. Stripped baked `fontSize: '15px'` from text element default.
- **`0a7922844` Full rebuild** — `_fontExplicit` and `_sizeExplicit` flag system set by Inspector. `migrateTypographyDefaults()` walks every element on page load, strips historical baked defaults (Sora/DM Sans) from elements without `_fontExplicit`. Page-level Body Font now applies via .sp-page CSS rules to text/button/announcement/badge/label/form/review/testimonial/stat/icontext/faq/progress/logostrip/separator (all non-explicit). Hardcoded Sora in stat value, icontext heading, FAQ question render strings replaced with `var(--page-font-heading)`. Six files touched end-to-end.
- **`7b9ad869d` Live updates** — CSS variables for typography moved from imperative `document.querySelector('.labs-chrome').style.setProperty` (inside useEffect) to React-controlled inline style on the `.labs-chrome` wrapper. Browsers were not reliably re-painting CSS variables on existing rendered nodes without React triggering a re-render. Fixed "requires re-selection to apply" symptom.
- **`0b358d4d9`, `cd952b775`, `caa299a6f` Tiptap-baked-span resolution** — Heading Font specifically wasn't applying. Three-step diagnosis:
  1. Confirmed via DevTools: `--page-font-heading: "Playfair Display"` correctly set on `.labs-chrome` but heading rendered in Manrope
  2. Root cause: Tiptap's FontFamily extension was baking `<span style="font-family: X">` into the heading's saved `el.txt` HTML during inline editing. The descendant span won via CSS specificity over the wrapper's `var(--page-font-heading)` declaration.
  3. Final fix: `migrateTypographyDefaults()` extended to strip `font-family` declarations from inline style attributes inside `el.txt` content (heading/text/label only) when `!_fontExplicit`. Plus Canvas renderInner now passes the heading font-family via direct React style merge (bypassing the inline-style string-parse roundtrip).

Steve confirmed working: delete a heading and place a new one → page-level Heading Font applies immediately. Existing heading (pre-fix corruption) cleaned automatically on next page load.

### Engineering lesson logged

When a fix works on new content but not existing content, the FIRST diagnostic should be "delete the existing element and re-add it." If new works and old doesn't, it's a data-state issue, not a code issue — and the next step is a migration. I spent two hours guessing at code paths before suggesting that test; Steve had to suggest it himself. Recorded so the next session defaults to that test first.

### What's still open

**Audit walkthrough — one item remaining:**
- Manual share-code round-trip test (XSS-1 sanitiser sanity check — paste a share code, verify legit content survives unchanged). ~5 min.

**Page builder feature gap (Steve flagged mid-audit):**
- Shadow/depth controls on Button + Banner + Box + Image + Review/Testimonial + FAQ. ~45-60 min. Extend existing Inspector shadow primitives across 8-10 element types.

**Polish:**
- COLOR-1: form input bg `#132044` → `#0f172a` at `ElementInspectorPanel.jsx:4566`. 1 min.

**Marketing project still paused** (from 24 May handover). Foundation pieces still awaiting coordinated launch — see status block below.

**i18n translation pass** still pending (19 frontend locales + 6 training content locales).

---

**Marketing-asset infrastructure live in production. Four marketing pages designed; three staged, one live.** Steve directed a deliberate pause on launching the wider My Marketing surface until all foundation pieces (4 pages + 3 videos + social proof + thumbnails + menu architecture) are ready as a coordinated launch.

### Shipped on 24 May 2026

- **`7695aab` Marketing assets foundation** — `marketing_assets` + `marketing_asset_visits` tables, `/m/<slug>/<username>` route serving HTML with placeholder substitution ({{ACTIVATION_URL}}, {{REFERRAL_URL}}, {{USERNAME}}, {{FIRST_NAME}}), standard `ref` cookie attribution, boot-seed pattern that reads `app/marketing_assets/<slug>.html` files and upserts on every deploy. PIF asset seeded.
- **`805aab1` Case-insensitive username lookup** — Steve hit lowercase `/m/pif/superadpro` → "Sponsor not found". Fixed with `func.lower(User.username) == username.lower()`. Substitutions use canonical-case sponsor.username.
- **`0bca183` Brand lockup on PIF page** — Steve caught that the PIF page had no SuperAdPro branding visible to a WhatsApp-share visitor. Added the canonical 32×32 rounded-square mark + "SuperAd**Pro**" wordmark top-left, matching the pattern at `frontend/src/pages/public/HomePage.jsx:69-76`. Mark links to https://www.superadpro.com — NOT to ref attribution.
- **`620141` Marketing project planning doc** — `docs/my-marketing-plan.md` captures locked decisions, outstanding workstreams, dashboard card swap spec.

### Designed and approved this session (NOT yet committed to production)

Sitting as preview files in `/mnt/user-data/outputs/`, awaiting the coordinated launch:

- **SAP sales page** (`sap-sales-preview.html`) — dark cobalt deep-space palette, balanced tools/income/freedom narrative, Grok-generated laptop-glow background, 9 feature cards including new Autoresponder + SuperSeller, 3 income streams (Course Academy removed per Steve), brave qualification disclosure.
- **Tools page** (`tools-sales-preview.html`) — lighter cobalt palette, 6-tool showcase (Creative Studio / LinkHub / SuperPages / Lead Finder / Brand Posters / Autoresponder), "Cancel Canva / Cancel Linktree" stack chips, optional comp plan mention linking to SAP, Grok-generated marketing-icons background.
- **Earn page** (`earn-sales-preview.html`) — cream + restrained emerald + champagne palette (Wise/Robinhood-coded, NOT MLM-coded), video advertising marketplace framing as headline, locked "100% to affiliates" claim panel, 8-tier ladder with completion bonus accruals, brave qualification disclosure (daily watch quota scales with tier 1→8, 5-day grace, $10 minimum withdrawal + $1 admin fee, all locked from code). Grok background pending Steve generation.
- **3 video scripts** (`video-scripts.md`) — Overall platform (~2:30) + Income opportunity (~2:30) + Tools (~2:30). First-person founder voice. Grounded in actual platform mechanics. Production notes per video + cross-cutting audio/visual guidance.
- **12-file brand logo SVG kit** (`brand-logo/`) — 3 variants (mark/wordmark/lockup) × 4 colourways (full colour/white/black/solid cobalt) + contact sheet. Vector, transparent background, ~15KB total. Convert text-to-paths in Figma/Illustrator before final production use.

### Factual errors caught by Steve this session

Three corrections, same root cause: Claude wrote from assumption rather than verifying against code. All fixed across all affected files (4 marketing pages + 3 video scripts):

1. **Daily video quota** — was written as "one per day for everyone." TRUTH: `DAILY_VIDEO_QUOTA = {1:1, 2:2, ..., 8:8}` at `app/main.py:12326`. Tier N requires N videos per day, 30-second minimum each.
2. **Minimum withdrawal** — was written as "no minimum threshold." TRUTH: $10 minimum per `app/main.py:1199`. The $1 admin fee was correct.
3. **Free user experience** — was written as "see the tools working" / "use the tools." TRUTH: Free users are gated out of all tool routes by `RequireTier` at `frontend/src/App.jsx:299`. Free users see only the dashboard + an upgrade prompt. Rewrite is "see what activation unlocks."

**Working rule for future sessions:** Before claiming any user-facing platform behaviour (minimums, quotas, what Free users see, percentages, fees), grep the code first. The spec doc covers commission rules but not experience flows. Code is the canonical source.

### Watch list — separate small commits needed

1. **`docs/commission-spec.md` line 183** — summary table row for Campaign Tiers still shows 95/5 split, contradicting line 75's "100% / we don't take a cent." Update to match the locked truth.
2. **`app/main.py:20013`** — AI context prompt references legacy Basic/Pro dual-tier model (purged 20 May 2026). Mentions "$20 Basic / $35 Pro." Rewrite to flat $20/mo Partner + Founding context.
3. **`app/main.py:23438`** — Same legacy reference in another AI prompt.
4. **PIF page CTAs** still point directly to `/register?ref=<username>`. Will rewire to flow through `/m/sap/<username>` (the new sales page) as part of the foundation-launch commit when SAP commits.

### Outstanding work to v1 launch of My Marketing

Per `docs/my-marketing-plan.md`, ~5 sessions ~10-12 hours:

- Steve generates Earn page Grok background (prompt in scripts doc — *"considered prosperity, NOT cash green, NOT gold coins"*)
- Steve records 3 explainer videos (2 already filmed, 1 to record)
- Steve contacts members for social proof — quotes + screenshot permission
- Capture miniature preview thumbnails of all 4 pages (for My Marketing hub cards)
- Build `/my-marketing` member hub page
- Build dashboard card swap (`affiliateShare` → `myMarketing`, spec in planning doc)
- Sidebar restructure: new top-level "Marketing" heading, sub-items My Marketing Hub / Affiliate Link / Marketing Decks (rename of existing slide-deck page) / Brand Posters (moves from Tools)
- Wire all 3 videos to their respective marketing pages
- Drop real social proof content into proof blocks
- Single coordinated launch: SAP/Tools/Earn commit, dashboard card swap, sidebar restructure, PIF rewire, platform PDF refresh

---

## Status as of 2026-05-23 — STRIPE LIVE

**Card payments are live in production.** Real customers can now pay by card for Membership signups, Campaign Tier purchases, and Credit Nexus packs. Crypto rails (USDT on BSC + NOWPayments) remain unchanged. `User.payment_method` ('crypto' or 'stripe') routes renewals.

Verified end-to-end with a real $15 Founder Membership payment from test1 → $10 sponsor commission settled into test30's wallet → admin shows test1 as active Founder. 3D Secure (Nationwide app) triggered correctly on UK cards.

### Shipped on 23 May 2026

- **`42722ba` Build break fix** — reverted repomix tooling commit that broke nixpacks Python detection. Kept LAUNCH_LOG strategic roadmap commits `c0dc8f0` and `8e11270` from concurrent mobile Claude session.
- **`52c38e0` Stripe backend re-integration** — schema (User extensions + StripeCharge audit table), `app/stripe_service.py` module, 6 webhook handlers, partial-refund math per product, chargeback handler, public Refund Policy + Terms of Service pages. Backend was verified working end-to-end via temporary admin test harness before frontend integration.
- **`8103751` `/api/stripe/status` unauth guard.**
- **`625cda5` `994c7a0` `f363970`** — three webhook bugs found and fixed during initial test: JSON-serialisation of Stripe SDK Event objects, dict-access on Stripe StripeObject (via `.to_dict_recursive()`), API version 2026-04-22.dahlia invoice schema changes (subscription moved to `parent.subscription_details.subscription`).
- **`25d07ac` `b7d20c4`** — frontend Pay with card rail on PartnerPayment.jsx + Manage Subscription card on Account.jsx (Stripe Customer Portal link).
- **`01a532d` `905bf65`** — Campaign Tier + Credit Nexus card payments. Backend endpoints + frontend buttons. Webhook handler dispatches to `process_tier_purchase` and `purchase_credit_pack` — same activation logic the crypto rail uses, so commission math is guaranteed identical.
- **`4120750`** — auth guards on new endpoints.
- **`5de19df` `259409f`** — each product redirects to its own destination page with activation banner (Membership→`/payment-success`, Campaign Tier→`/campaign-tiers?activated=tier_X`, Nexus→`/credit-nexus?activated=<pack>`).
- **`2df0eb0`** — cleanup: removed admin test harness, removed `course` and `creative_credits` from `REFUND_SHARES` (out of scope).
- **`195873f`** — Founder spot claim now sets `membership_tier='founding'` along with `is_founding_member=True`. Without this, admin showed PARTNER for fresh Founder signups (bug surfaced during live test1 payment).
- **Stripe Live cutover** — Live mode active, live keys + products + webhook configured, dead webhooks from old integration deleted, end-to-end verified.

### Locked policy (Steve, 23 May 2026)

- Currency USD on both rails ($15 Founder, $20 Partner)
- Founder 100-spot cap SHARED across crypto + Stripe (enforced under `FOUNDING_LOCK_KEY=7423957` Postgres advisory lock)
- Founder $15/month lock-in applies to card members too
- Refund policy: 7-day window, company portion only (50% Partner, 33% Founder, 5% Campaign Tier, 15% Nexus). Crypto payments final.
- Chargeback handler: immediate account suspension + subscription cancel + commission forfeiture flag
- Stripe Checkout (hosted) not Elements (embedded)

### Currently watching (updated 23 May 2026)

- **Webhook delivery success rate** — Stripe Dashboard → Event destinations. Should stay 100%. Below 95% needs immediate investigation.
- **First real customer signups via card** — spot-check the first few. Verify activation + sponsor commission + badges.
- **First chargeback** — handler is built but never tested in anger.
- **3D Secure abandonment rate** — UK cards trigger SCA (Nationwide / Barclays / etc.). Stripe Dashboard → Payments → Failed shows drop-offs. Worth tracking.

### Open items (priority order)

1. **Wallet Connect button placement** — currently in topbar on payment pages, far from the wallet payment option. Should be IN the payments modal. Affects `PartnerPayment.jsx`, `ActivateTier.jsx`, `CreditMatrix.jsx`. ~30 min fix, do first next session.
2. **Pay It Forward gifting** — Tier 1 highest-revenue mechanism per the roadmap. Gift-a-starter at $20.
3. **Public income calculator on `/earn`** — highest signup-conversion lever per the roadmap.
4. **Funnel Manager** — LeadsLeap parity, team-duplication accelerator.
5. **Custom Domain via Stripe** — $20 one-time, Railway customDomainCreate API. Deferred from earlier in the session.
6. **i18n translation pass** — 19 locales, 123 flat-pricing keys in `en.json` (commit `863ae66`). Plus 6 training-content locales against 18-lesson corpus (commit `c0d2643`).
7. **5-stage smoke test from `b17d541`** — still deferred.
8. **C-C-1 hover/count-up animations** for Stat + Review on published pages.
9. **BPG positioning decision.**

### Architectural notes for future-Claude

- `is_founding_member` and `membership_tier='founding'` are duplicated state for the same concept. The 23 May bug was caused by the spot-claim block setting one but not the other. Worth consolidating to a single source of truth in a future session.
- The startup tier normalisation block in `app/database.py:3300-3322` auto-corrects this inconsistent state on boot — that's what fixed test1 after the `195873f` deploy.
- Stripe webhook handler converts Stripe SDK Event objects to plain dicts at entry via `.to_dict_recursive()`. Don't undo this — Stripe StripeObject nested values subtly break `.get()` calls downstream.
- API version 2026-04-22.dahlia restructured invoice fields. `subscription` is now at `invoice.parent.subscription_details.subscription`. Reads both old and new paths in `_stripe_handle_invoice_paid` for forward/backward compat.

---



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

### Roadmap from open-source ecosystem session (23 May 2026)

Sequenced after research sessions reviewing GitHub for tools that move the needle on conversion, activation, retention, and member earnings, plus a LeadsLeap competitive analysis identifying real parity gaps. Cost target: £0 or minimal. All items vetted for licence (MIT/Apache only — no AGPL).

**Already shipped this session:**
- **Repomix presets** (`dd246ac0b`) — 7 LLM context bundles in `.repomix/`. Run `npm run pack:<preset>`. Diagnostic finding: `app/main.py` is 38,538 lines / 414K tokens, flagged as architectural debt worth a refactor pass.

#### Tier 1 — Required next-session work (highest ROI first)

**1. Public income calculator on `/earn`** — repurpose `GridCalculator.jsx` + `PassupVisualiser.jsx` for unauthenticated visitors. Inputs: estimated followers, expected referrals per week. Output: live projected monthly earnings using real commission spec, with signup CTA next to the personalised number. This is the single largest signup-conversion lever identified. ~1 day. £0.

**2. Pay It Forward gifting mechanism** — the missing revenue/viral engine. You already have the PIF poster template, pink branding, and `PayItForward.jsx` page; what's missing is the actual code-generation + redemption flow. Member buys "Gift a Starter Membership" for $20 (direct revenue NOW), system generates unique code via `voucher-code-generator-js` (MIT, Voucherify) like `SAPGIFT-X7K2-9PQR-A4N8`, shareable gift card PNG generated via satori (overlaps with #5), recipient hits `/redeem/<code>` and claims free membership, original gifter becomes sponsor of redeemed account → future commissions flow back. Three wins at once: direct revenue, lowered acquisition friction, hardwired sponsor attribution. **Flagged as highest-priority revenue mechanism** alongside #1. ~2 days. £0.

#### Tier 2 — Share Code system completion + LeadsLeap parity gaps

**Already shipped (19 May 2026):**
- Share Code commit 1 (`6054280`) — schema + generate endpoint + Share button for FunnelPages
- Share Code commit 2 (`daf0e85`) — import endpoint + ref-link rewriter + UI

**Outstanding work to close the LeadsLeap competitive gap:**

**3. Share Code marketplace (commit 3)** — the lightest outstanding commit: single admin-flip endpoint + browse page reading the existing `share_codes` table. Was deferred 19 May when Steve switched to mobile and GrapesJS editor was unreachable to verify imports. ~½ day. £0.

**4. Share Code for email sequences** — extend the existing Share Code system to MyLeads autoresponder sequences. Members can share entire email series with their downline, replacers swap in the downline's affiliate link. This is what made LeadsLeap's SendSteed sticky — team leaders share proven sequences and downlines duplicate in one click. Highest team-duplication accelerator after page sharing. ~1-2 days. £0.

**5. Funnel Manager** — group existing SuperPages + email sequence + popup into a named "funnel" that exports as a single share code. LeadsLeap's Funnel Manager is what lets a team leader say "import my whole funnel with one code" — landing page + thank-you + 15-email sequence — and the downline gets the entire system in one click. Builds on the share-code infrastructure that already exists. ~1-2 days. £0.

**6. LabsPageBuilder hero copy fix** — line 149 still says "ship a share-code system" as pending. Share Code for FunnelPages is shipped. One-line update. ~5 min.

**7. PopupXpert equivalent** — popup builder with Share Code support. You don't have a popup builder; LeadsLeap members get 10 popups on free tier. Lead-capture popups on SuperPages and LinkHub would lift conversion meaningfully. ~2 days. £0.

**8. Daily Active Bonus** — small daily reward (5p–25p) for hitting a Watch-to-Earn campaign threshold (e.g. 10 campaigns viewed). LeadsLeap pays $1/day for clicking 10 ads — pure engagement infrastructure that creates daily-return habit. Modifies existing campaign view logic. ~1 day.

**9. PDF Link Rebrander** — Pro feature. Member uploads PDF, system rewrites embedded links to route through their referral link. Small build, high perceived value, matches LeadsLeap Pro feature. ~1 day. £0.

#### Tier 3 — Ecosystem polish (visual + viral)

**10. `@imgly/background-removal` in Creative Studio** — browser-based AI background removal, MIT, runs client-side via WebAssembly. ~40MB model cached after first use, no server costs. Slot into Creative Studio upload flow so members can drop transparent selfies into BPG posters. ~½ day. £0.

**11. Satori OG image generator for LinkHub/SuperPages/PIF gift cards** — `@vercel/og` / `satori` (MIT) generates dynamic social-share preview cards from JSX. Every member's shared link becomes a branded billboard on Facebook/X/LinkedIn. Also the rendering engine for #2 gift card PNGs. Cache PNGs in R2. ~1 day. £0.

**12. QR-Code-Styling polish** — upgrade existing `QRGenerator.jsx` with logo embedding, gradients, custom corners via `qr-code-styling` (MIT). Also used on PIF gift cards (#2) for one-scan redemption. Members can print branded QR codes on cards/flyers linking to LinkHub. ~2-3hr. £0.

**13. canvas-confetti + react-confetti-explosion on success events** — MIT. Burst on commission earned, tier unlocked, first referral, first $100 withdrawn, gift redeemed. Emotional reinforcement → members share more → free upgrade trigger. ~1 hour. £0.

**14. simplyCountdown.js for real deadlines** — MIT, vanilla JS. Tied to real backend mechanics: end of monthly leaderboard, PIF gift expiry, Grid completion bonus deadline, tier-pricing lock-in. Server-side computed remaining time (browser clock not trusted). ~½ day. £0.

**15. Real-time activity ticker on public pages** — extend the live commission feed (already running on `/explore`) to `/`, `/earn`, `/tools`. Honest social proof using real data — "Sarah J. earned $47 from a Grid spillover • 23 seconds ago". ~½ day. £0.

**16. react-hot-toast on signup conversion** — MIT, tiny. When unauth visitor on `/earn` hits "Sign up to earn $X", slide-in toast with inline email field instead of full redirect. Reduces friction at conversion moment. ~1 hour. £0.

#### Tier 4 — Required infrastructure (separate session)

**17. GlitchTip error tracking** — Sentry SDK compatible, MIT. Hosted free tier (1,000 events/month) first; migrate to self-hosted on Railway (~£5-8/mo) when volume grows. Wire `sentry-sdk[fastapi]` + `@sentry/react`. ~30 min. Stops blind production failures.

**18. Driver.js onboarding tour** — MIT, ~5KB, layered on top of existing `OnboardingWizard.jsx`. 5-step spotlight tour for new members (Command Centre → Campaigns → Grid → Wallet → BPG). localStorage flag to never re-show. ~½ day. £0. Activation lift on existing signups.

**19. PostHog cloud free tier** — MIT, 1M events/month free. Track signup → first qualified referral → first commission → upgrade funnel. Stop guessing where members drop off. Skip self-hosting (Kafka + ClickHouse cluster is wrong shape). ~½ day. £0.

#### Tier 5 — Member tools to bolster ecosystem (lower priority)

**20. Disposable email blocker** — public github.com/disposable/disposable list, fetch + cache, integrate into signup + lead-capture endpoints. Keeps MyLeads clean and Brevo deliverability high. ~½ day. £0.

**21. PhotoSwipe gallery block for SuperPages** — MIT, pinch-zoom lightbox. New block type in SuperPages editor. ~½ day. £0.

**22. Excalidraw embed** — MIT, whiteboarding in Course Academy lessons and Team Messenger threads. ~½ day. £0.

**23. MeiliSearch on Course + Help** — MIT, typo-tolerant instant search. Reduces support load. ~½ day. ~£5/mo Railway.

**24. Cal.com integration** — open-source Calendly killer. Per-member booking pages embeddable in LinkHub. Self-host on Railway (~£15/mo) recouped within 30 paying users. ~2-3 days. **Very high differentiation** — members can cancel their Calendly subscriptions.

#### Sequencing principle

Tier 1 (income calculator + PIF gifting) are the two highest-revenue items and should ship first. Tier 2 closes the LeadsLeap competitive parity gap and builds on the share-code infrastructure that's already 2/3 shipped. Tier 3 is pure-frontend polish that compounds with Tiers 1–2. Tier 4 is observability before scaling marketing. Tier 5 is feature additions scoped as separate decisions.

#### LeadsLeap competitive context

LeadsLeap ($27/mo, 17 years old, ~all-in-one marketing toolkit) is the main competitor for the team-leader / network-marketer demographic. Their stickiness comes from: Share Code system (already replicating), free tier that's genuinely usable, daily active bonus loop, 17-year trust signal, founder visibility. **SuperAdPro's differentiation is structural** — AI-native (Creative Studio + BPG), real commission engine (Grid spillover + Credit Nexus matrix + Course pass-ups vs LeadsLeap's flat 25/50%), crypto payments, modern UX. Don't market as "LeadsLeap killer" — frame as "LeadsLeap is where you learn the tools; SuperAdPro is where the tools work for you while you sleep, and pay you in four income streams." Don't copy traffic exchange / credit-based ad-viewing — 2008 architecture, bot-like behaviour, low quality. Watch-to-Earn campaigns are the modern version.

**Token expiry reminder:** the platform GitHub token expires mid-September 2026. Renew at https://github.com/settings/tokens before then.

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
