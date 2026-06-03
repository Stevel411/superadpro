# CLAUDE.md — SuperAdPro Project Instructions

> **🔒 SECURITY: `SECURITY.md` — non-negotiable invariants.**
>
> Read it before touching auth, admin endpoints, secrets, or payments. No secrets in source (env, fail-closed); no `?secret=` auth on privileged routes; no state-changing GETs; dev/test/seed endpoints off in prod; API docs off in prod; server never holds drainable payout keys. **Run `python3 scripts/security_check.py` before every push.** These rules exist because of the 2026-06-03 breach.

> **⚠️ READ FIRST: `docs/PLATFORM_STATE.md`**
>
> That file is the snapshot of CURRENT TRUTH about each part of the platform. It is updated every session and is more recent than anything in this file. If `PLATFORM_STATE.md` contradicts `CLAUDE.md` or `LAUNCH_LOG.md`, **`PLATFORM_STATE.md` wins**.
>
> Use this file (`CLAUDE.md`) for operating doctrine and historical session notes. Use `LAUNCH_LOG.md` for "what happened recently." Use `PLATFORM_STATE.md` for "what is true right now."

## 🏗️ Build Spec — Commercial-Grade Only

**25 May 2026, Steve called this out and it's now project doctrine:**

SuperAdPro is sold to members who pay hard-earned money. Build quality must match. **Trade-offs, "for new content only" carve-outs, and quick-fix patches are NOT acceptable.** When a bug or issue is found, the response is world-class engineering — root-cause analysis, full end-to-end fix, every affected surface considered.

Default mental model: "Would Webflow / Leadpages / ConvertKit ship this?" If no, neither do we.

**Examples of patches to NEVER propose:**
- "Body Size only affects new content" → no, migrate existing elements too
- "Member can do it per-element instead" → no, fix the page-level control properly
- "We'll defer this to a later session" (when the user is in mid-test) → no, fix it now if it's blocking
- "Acceptable to have asterisks on page settings" → no, settings work or they're not shipped

Steve will call out any patch-shaped suggestion. Engineering instincts borrowed from other products (e.g. Webflow's "component overrides survive theme changes") must be tested against "what would a SuperAdPro member — an affiliate marketer, not a designer — actually expect."

## 🎯 Most Recent Session (24 May 2026) — Matt recovery + BSC scanner Layers 4-6 + Stripe gap fix

Sunday session, ~5 hours. Started with a stuck-payment customer recovery (Matt, user 374), turned into a deep dive on the BSC scanner's residual failure mode that the May 17 reliability work didn't cover. Shipped three commits, all live, all verified end-to-end on production.

### Customer support case closed — @matt (user 374) Founder #42

- Matt registered 11:53 UTC under sponsor @tbillion (Founder #5), created a WalletConnect order at 11:55:30 (`unique_amount = $14.91`, founding price), sent 14.91 USDT from wallet `0xa71cb9...` to treasury at 11:55:53 UTC (block 100151692). Tx success on-chain.
- Scanner missed it. No match, no orphan record. Order sat pending.
- Diagnosis: `eth_getLogs` for the chunk containing his block returned an empty result successfully from whichever public RPC the scanner happened to hit. The Layer 1 self-healing cursor (May 17 fix) only protects against chunks that RAISE errors. Chunks that succeed-with-empty-result advance the cursor past the block, transfer permanently lost.
- Recovery: shipped new admin endpoint, hit it, Matt activated as Founder #42 (spot allocation is `current_count + 1` at activation time, independent of `product_key` — verified the founding-claim logic in `_activate_membership`). Sponsor @tbillion received the $10 flat commission. Membership expires 24 June 2026.

### Three commits shipped this session

**`e7e9fbd11` — Manual-confirm endpoint (the recovery tool)**

New `POST/GET /admin/api/manual-confirm-walletconnect-order?order_id=X&tx_hash=0x...`. Admin-session-gated.

- Pulls tx receipt via `eth_getTransactionReceipt` (single-tx lookup, NOT `eth_getLogs`). Critical: different RPC code path that doesn't suffer the bulk-scanner failure mode — receipt fetches were 100% reliable on the same providers that were silently failing on getLogs for Matt's chunk.
- Validates: receipt status==1, recipient is USDT contract, log topic[0] is ERC20 Transfer signature, log topic[2] is treasury address, log data amount == `order.unique_amount` exactly at 6dp, order is `pending`, tx_hash not already attached to another order.
- On valid: confirms order, writes Payment row idempotently (tx_ref = `wc_<txhash>`), calls `_nowpayments_activate_product` (same handoff as cron). Founder spot claim happens inside `_activate_membership` via `pg_advisory_xact_lock(7423957)`. Returns JSON activation summary.

**Recovery procedure for future "user paid, scanner missed it" cases:** hit the URL above with the order_id (from `lookup_user <username>.recent_walletconnect_orders[].id`) and tx_hash. ~5 seconds. Replaces the `/admin/api/trigger-bsc-scan?from_block=X` recovery in `CLAUDE.md` line 70 for the silent-empty-result class of misses — that older procedure only works when the scanner's getLogs is currently healthy.

**`9c99cf92c` — Stripe "Pay with card" button on /grid/activate**

Customer reported "I don't see the new card payment button on Campaign Tiers". Investigation: button shipped in commit `01a532d48` for `/activate/:tierId` (ActivateTier.jsx), but NOT for `/grid/activate` (GridActivatePage.jsx) — same product, different page, half-shipped feature.

Added `stripeReady` state + `/api/stripe/status` fetch on mount + `handleStripeCard` handler posting `tier_id: 1` to `/api/stripe/checkout/campaign-tier`. Button positioned above WalletConnect block with "or pay with crypto" divider, gated on `stripeReady` so both vanish cleanly when Stripe isn't configured. Backend unchanged — endpoint already handled tier_id=1.

Verified the deployed bundle contains the Stripe code via `grep "api/stripe/status" static/app/assets/GridActivatePage-*.js`.

**`9c843b7cd` — BSC scanner Layers 4-6 (silent-empty-result + cross-run retry + reconciler)**

The big one. Three-layer fix for the failure mode that lost Matt — the residual gap left after the May 17 work. Detailed below.

### BSC scanner Layers 4-6 — what's now in place

The May 17 fix (Layers 1-3: self-healing cursor + multi-RPC failover + in-process scheduler) was correct architecture for chunks that RAISE errors. It does not protect against chunks that succeed-with-empty-result. This commit adds three more layers that close that gap.

**Layer 4 — Redundant-provider scanning per chunk.** Each chunk's `eth_getLogs` call fans out to `SCAN_REDUNDANCY=3` providers in parallel via `concurrent.futures.ThreadPoolExecutor`, unions results by tx_hash. If ANY single provider has the transfer indexed, we see it. New `get_treasury_transfers_in_range_redundant()` in `app/walletconnect_payments.py`. Bounded wall-time at max(per-provider-timeout) ≈ 15s rather than N × timeout. Configurable via `BSC_SCAN_REDUNDANCY` env var. A chunk is now successful when ≥1 provider returns; only when ALL fail is it marked failed.

**Layer 5 — Cross-run failed-chunk persistence.** New `bsc_scan_failed_chunks` table — UNIQUE(from_block, to_block), upsert increments `attempt_count`. Helper functions `record_failed_chunk` / `mark_chunk_resolved` / `mark_chunk_abandoned` / `mark_chunk_alerted` / `get_pending_failed_chunks`. Cron retries all pending failed chunks at step 2a, BEFORE the main scan each tick. Resolved chunks merge their transfers into the normal match flow. Persistently-failing chunks attempt-count up to:
- `ESCALATE_AT_ATTEMPTS = 10` (~5 min of 30s ticks) → fires ONE email alert to `stevelawsonmarketing@gmail.com` via `_send_bsc_scan_failure_alert()`. `alerted_at` gate prevents alert spam.
- `GIVE_UP_AT_ATTEMPTS = 100` (~50 min) → status='abandoned', stops eating scan budget. Inspect via `SELECT * FROM bsc_scan_failed_chunks WHERE status='abandoned'`.

**Layer 6 — Stuck-order reconciliation pass.** New `reconcile_stuck_orders()` runs as step 3a in cron after the main scan. For each pending WalletConnectPaymentOrder older than `RECONCILE_MIN_AGE_SECONDS=120s` and not yet expired (max 5 per run, ordered oldest-first), independently scans the last `RECONCILE_BLOCK_WINDOW=200` blocks (~10 min of chain time) with the redundant scanner and matches by amount equality. Last line of defence: if all 3 providers happen to return empty for the relevant chunk AND the main scan misses, the reconciler catches it on the next cron tick once the order is >2 min old. Matches feed back through `match_incoming_transfer` so the idempotency-by-tx_hash guarantee is preserved.

**All three callers updated consistently:** `/cron/scan-bsc-payments` (HTTP cron), `_run_inproc_bsc_scan` (in-process daemon, the production driver), `/admin/api/trigger-bsc-scan` (admin manual override). No caller left with the old 2-tuple `failed_chunks` shape.

**New stats keys in cron JSON response:** `retry_chunks_seen`, `retry_chunks_resolved`, `retry_chunks_abandoned`, `alerts_fired`, `reconcile_orders_checked`, `reconcile_transfers_found`. `failed_chunks` shape is now `[[from, to, error_msg], ...]` (3-tuple).

**Verified live on production:** triggered `/cron/scan-bsc-payments` post-deploy. Returned `reconcile_orders_checked: 1` (one pending order checked, none recovered — it's a stale order from earlier), all new fields populated, no errors. End-to-end pipeline executes cleanly.

### Recovery procedure decision tree (use this in future)

If a user reports paying but no activation:

1. **First:** `lookup_payment_by_txid <tx_hash>` — tells you if scanner saw it.
2. **If `found_in: []`:** check tx on-chain via `eth_getTransactionByHash` to confirm it actually exists, recipient is treasury, amount matches a pending order.
3. **If on-chain is real but scanner missed:** new `/admin/api/manual-confirm-walletconnect-order?order_id=X&tx_hash=0x...`. Activates immediately.
4. **If you need to scan a missing block range:** `/admin/api/trigger-bsc-scan?from_block=X` — now also uses the redundant scanner.
5. **Email alert fires automatically** after 10 consecutive failed attempts on the same chunk — you'll know before customers ping you.

### Alchemy upgrade decision (24 May 2026)

Steve received an Alchemy email suggesting upgrade to Pay-As-You-Go. Decision: **activate PAYG with $15-25/month usage cap**. Rationale:
- SuperAdPro's current BSC scanner load is ~22-35M CUs/month (back-of-envelope), right at the edge of the 30M free tier.
- PAYG has no monthly minimum — $0.45/M CUs above the free 30M, $0 if you stay under.
- Usage cap (set in Alchemy Billing Settings) means no surprise bills.
- The redundant scan code already routes 2/3 of getLogs traffic to public BSC RPCs; Alchemy is just one of the 3 providers. So PAYG load on Alchemy is bounded.
- If cap is hit, public RPCs continue to serve — no outage, just no Alchemy-specific reliability boost on excess traffic.

**No code change needed** — `BSC_RPC_URL` in Railway env already points to Alchemy. PAYG just unlocks the free-tier throttle.

### Behavioural note (factual-error pattern)

Mid-session, raised a "Founder/Partner product_key mismatch bug" looking at Matt's order. **Retracted on closer reading of `_activate_membership` and `_nowpayments_activate_product`.** Every membership purchase uses `product_key = membership_partner` by design — there is no `membership_founder` key in the system. Founder distinction is owned by the user record (`is_founding_member` + `membership_price_locked` + `founding_spot_number`), claimed atomically inside `_activate_membership` when `activation_type == "fresh"` AND spots remain. Pricing differs at quote time (`base_amount` set to $15 if spots remain). product_key stays the same in both cases.

**Rule reinforced (from 23 May session lessons):** for any claim about platform mechanics, read the canonical source before speaking. Sounds-right is not verification.

### Key commits (chronological)

`e7e9fbd11` manual-confirm endpoint · `9c99cf92c` Stripe button on /grid/activate · `9c843b7cd` BSC scanner Layers 4-6

### Outstanding from this session (queued for next)

- **Stripe coverage audit** — check every purchase page (PartnerPayment, ActivateTier, GridActivatePage, Credit Nexus, Creative Studio, Brand Posters, PIF, anywhere else) has the card button. Matt's case wasn't the only ship-half-done — Stripe was missing on /grid/activate too. Need a systematic sweep.
- **Marketing materials project** — picks back up from this morning's handover. PIF live, SAP/Tools/Earn pages staged in /mnt/user-data/outputs/. Three watch-list items still pending: `commission-spec.md` line 183 (95/5 → 100/0), `app/main.py:20013` legacy Basic/Pro AI prompt, `app/main.py:23438` same. Steve generating Earn page background + recording remaining video before launch.

---

## 🎯 Previous Session (19 May 2026 late) — Page Builder Phase 1 + 2A + Railway outage

Long, productive day session. Continued from morning's flat-pricing purge work into the Labs Page Builder commercial-grade audit. Shipped the new left-rail Inspector panel architecture and ported 4 of 26 element types to it. Session ended when Railway had a major outage (Google Cloud suspended Railway's account). Used the outage as a forcing function to decide on infra strategy.

### Page Builder Phase 1 + 2A — what shipped

**The architectural pivot (decision):**
Steve identified mid-session that the modal-based per-element editing was fundamentally broken — modal blocks the canvas, can't see edits in context, multiple competing editors (floating action chip + QuickProps + modal) on one element. Proposed a left-rail persistent properties panel like Figma/Webflow/Framer. We confirmed direction via two design mockups, then built it.

**The new layout (sandbox mode only):**
- Cobalt app sidebar HIDDEN in sandbox mode (full viewport for editor)
- Three-panel: Inspector (260px left) | Canvas (centre) | Block palette (280px right)
- Both panels symmetrically framed
- Inspector lives in `frontend/src/pages/labs-superpages/ElementInspectorPanel.jsx` (new file, ~600 lines after Phase 2A)
- Production pages at `/labs/pagebuilder/edit/{pageId}` still use old layout — sandbox flag gates the new UX so we can keep iterating safely

**Phase 1 (Button) — `d893935`:**
- `AppLayout` got `hideSidebar` + `hideTopbar` props (zeroes `--sidebar-offset` when sidebar is hidden)
- `ButtonProperties` sub-component with Content / Typography / Background / Text colour sections
- Live editing — every control commits on change, no Apply button
- 24 fonts, size slider 8-120px, weight Regular→Black, 12-swatch background grid (solids + gradients), 5-swatch text colour + custom picker
- Useeffect resyncs local state when `el.id` changes

**Phase 2A (Heading / Text / Label) — `fabffc8`:**
- One shared `TextTypeProperties` component for all three Tiptap text types
- Text content stays inline-edited via double-click (Tiptap unchanged); panel handles BLOCK-level style only
- Sections: Typography / Alignment (3-way toggle) / Line height slider / Colour (8-swatch + custom)
- Type-specific defaults: heading 48px Extra Bold, label 14px Bold, text 18px Regular
- "💡 Double-click to edit text" tip banner at the top so members learn the inline pattern

### Critical bugs found and fixed during Phase 1

1. **Stale-closure style overwrites (`d3950ed`):** `commitStyle` was reading `el.s` from React closure for the merge, so rapid commits (background → colour → font) overwrote each other based on stale state. Canvas looked right (reads latest) but saved data was corrupt. Fix: switched to `updateElementStyle` (in `useEditorState.js`) which merges INSIDE the setter, reading the latest `e.s`. Apply this pattern to all future Phase 2 ports.

2. **Defensive null/undefined style filter (`f1eb106`):** if any commit ever writes a null style value, the serialised string becomes `"background:undefined"` which breaks the entire `style=""` attribute parse and the element renders with NO inline styles. Added `.filter(([k,v]) => v !== null && v !== undefined && v !== '')` to exportHTML's style serialiser. Defence in depth.

3. **Dual-editor bug (`ec5fb43`):** clicking a button opened BOTH the new Inspector panel AND the old modal (floating `✎ LINK` chip on canvas still triggered it). Fixed via new `INSPECTOR_TYPES` constant in `Canvas.jsx` — currently `['button', 'heading', 'text', 'label']`. When a type is in this list, the chip is hidden, QuickProps is hidden, right-click `✎ Edit` is hidden. As Phase 2 adds more types to this constant, the old modal triggers auto-disappear.

4. **Narrow-viewport guard (`f709804`):** threshold dropped 900 → 600 for diagnostic phase. The new 3-panel layout actually needs ~1100px but blocking that aggressively is hostile to dev workflow when DevTools is docked. Phase 3 work: replace the splash with collapse-to-overlay behaviour at <1100px.

### Adjacent fixes from same session

- **Funnels gallery slug repair (`4d58c62`):** legacy pages with empty slugs were missing the View button on `/pro/funnels` even when published. Added auto-repair loop on `/api/funnels` list endpoint — scans for missing slugs, generates them via `generate_unique_slug`, commits in-place. Self-healing on next gallery load.
- **Funnels gallery action-row balance (`0f06102`):** Edit + View buttons now share equal flex space inside a `display:flex flex:1` container. Icon group (duplicate / share / delete) sits as separate fixed 32x32 squares on the right. Consistent row across cards regardless of View presence.
- **Sandbox publish UX (`6b6cf41`):** Publish in sandbox now sets `status:'published'` AND opens the live URL in a new tab AND navigates current tab to `/pro/funnels`. Was previously silently exporting as draft with no preview path.
- **URL sanitisation in exportHTML (`6b6cf41`):** blocks `javascript:`, `data:`, `vbscript:` schemes; auto-adds `target="_blank" rel="noopener noreferrer"` for absolute http(s) URLs on buttons/banners.

### Audit doc

`docs/labs-page-builder-audit.md` (commit `17a6100`, updated through session) is the canonical defect tracker. Per-category severity-tagged. Updated `F-1/F-2/F-3` to ✅ RESOLVED after `conversation_search` confirmed Form capture flow was verified working end-to-end on 18 May 2026 (lead landed in MemberLead with proper attribution, surfaced on /pro/funnels card).

### Phase progress

| Phase | Types | Status | Notes |
|---|---|---|---|
| 1 | Button (+ Banner via shared path) | ✅ | `d893935` |
| 2A | Heading, Text, Label | ✅ | `fabffc8` |
| 2B | Image, Video, Audio | Queued | Next session |
| 2C | Form (proper port + field add/remove) | Queued | Form FUNCTIONALLY works; just needs UI port |
| 2D | Review, Testimonial, FAQ, Badge, Stat, Progress | Queued | |
| 2E | Countdown, Socials, IconText, Separator, Logos, Spacer, Box, Divider, Embed | Queued | Layout/decoration |

**4 of 26 types ported.** Pattern is now well-established. Each subsequent batch can copy ButtonProperties or TextTypeProperties shape and adapt.

### Tonight's commits (chronological)

```
17a6100  Start Labs Page Builder commercial-grade audit
6b6cf41  Labs Page Builder audit: Button & Banner blockers fixed (5 of 8)
c109884  Labs Page Builder: ButtonEditor modal preview now reflects live typography state
b3cffe6  Labs Page Builder ButtonEditor: preview pinned to top + font size slider
d893935  Labs Page Builder Phase 1: left-rail Element Inspector panel for Button
d3950ed  Labs Inspector: fix stale-closure bug that wiped button styles on preview
f1eb106  Labs exportHTML: defensive style filter + diagnostic for preview bug
2e09249  Labs editor: viewport guard threshold 900 → 1100
f709804  Labs editor: narrow-viewport threshold 900 → 600 for diagnostic phase
4d58c62  Funnels list: auto-repair missing slugs so View button appears for published pages
ec5fb43  Labs canvas: hide old modal trigger for Inspector-ported types
0f06102  Funnels gallery: balance card action row sizing — primary group + icon group
4aac741  Audit doc: mark Form (F-1 through F-3) as verified working end-to-end
fabffc8  Phase 2A: port Heading, Text, Label to Inspector (TextTypeProperties)
```

---

## 🛡 Infrastructure Resilience Plan (decided 19 May 2026 during Railway outage)

**Context:** Railway suffered a major outage 22:21-23:37+ UTC on 19 May 2026 — Google Cloud suspended Railway's account, every Railway-hosted service worldwide went down. SuperAdPro included. Discussed migration options live.

### Decision: Stay on Railway, build resilience instead of migrating

**Reasoning:**
- Today's outage was caused by Google Cloud, not Railway's competence. Render runs on AWS — has its own bad days.
- No host is bulletproof. Migrating to escape one outage just queues you for someone else's.
- Migration time (4-6h for Render: rewrite nixpacks.toml → render.yaml, pg_dump/restore, env var migration) is high-cost right now. That time is better spent on Phase 2 of the page builder which directly drives membership conversions.
- Railway's dev experience is genuinely excellent for solo-builder velocity.

### Trigger points for migration (defined in advance, NOT reactive):

Move to **Render** (AWS-based, predictable flat pricing, HA Postgres, same git-push workflow) when ANY of these is true:

1. **3+ Railway outages in 90 days** each lasting >30 minutes
2. **500+ paid members reached** (i.e. $5k+ MRR) — reputational cost of next outage now exceeds 6h migration cost
3. **Railway pricing 2x's at scale** above projected per-member cost

Until then, **keep building**. This is the trader's discipline: define the stop-loss in advance, don't panic-exit on one bad day.

### Resilience work to do REGARDLESS of host (priority order):

1. **Daily Postgres backups to external storage** (S3 or Backblaze B2)
   - ~2 hours of work: script + cron on separate cheap VM (or Cloudflare Worker / AWS Lambda)
   - Single biggest resilience win without changing hosts
   - If Railway disappears tomorrow, we have our data
   - **Queue this for the next quiet session**

2. **Outage comms playbook**
   - Twitter/X post template ("aware of an issue, investigating, ETA…")
   - Email template for paying members
   - In-app banner mechanism (toggle from admin or DB flag)
   - Pre-written so we can respond in minutes, not hours
   - **Draft alongside the backup work**

3. **Status page** (optional / later)
   - Simple `/status` endpoint reading platform_pulse + last known migration state
   - Public version showing "all systems operational" / "investigating" / "resolved"
   - Worth doing once member count > 100

### Alternatives evaluated, ranked

1. **Render** — best fit if we migrate (AWS not GCP, flat pricing, HA Postgres, same workflow). Cost: ~$25-50/month.
2. **Fly.io** — strong technically but wrong fit (global edge we don't need, "pricing requires a spreadsheet", more infra work). Pass.
3. **AWS / GCP directly** — not at scale yet. Revisit at 10k+ members.

**Key insight Steve articulated:** the right move is structural (backups + comms), not reactive (panic migration). Apply forex discipline to infra decisions.

---

## 🎯 Previous Session (19 May 2026 night) — Share Code system commits 1 + 2

Short, clean session. Two commits shipped + live-verified. Started with a spec conversation, locked the scope, built it.

**Spec locked in conversation (saved direction A):**
- **Unit: FunnelPage only.** Not "campaigns in a box" — just pages. Lists, sequences, and stats stay with the original owner; importers wire their own campaign on import via the existing Phase 1 modal flow.
- **Two share lanes, one system:** private (Alice DMs a code to Bob) and marketplace (admin-curated, v1). Same `share_codes` table; marketplace is a filtered listing UI on top.
- **No attribution shown anywhere.** Not on imported pages, not on marketplace cards. Network marketers don't want "Template by Alice" on a page they're trying to look like the authority on — Steve's call, and correct. The `owner_user_id` column exists for admin/abuse tracking only; never exposed in any response to the importer.
- **Marketplace v1: admin-curated only.** Users can submit, Steve approves. v2 can open up later if quality holds.
- **Asset handling: deliberately deferred.** R2 URLs are public and stable so imported pages just reference the original assets. Network marketers typically swap imagery to their own brand anyway; copy-on-import was overkill for v1. Flagged for revisit if abuse or breakage shows up.

**Shipped:**

- **Commit 1 (`6054280`) — schema + generate + Share button.**
  - `ShareCode` model (`share_codes` table: code, owner_user_id, source_page_id, payload_json, is_public, uses_count, expires_at) + CREATE TABLE + 3 indexes in `run_migrations()`.
  - `_build_share_payload(page)` snapshots a FunnelPage into a `{"v": 1, "page": {...}}` dict. `SHARE_CODE_V1_FIELDS` whitelists only visual/content columns (24 fields) — ownership, slug, stats, bindings, A/B pointers, attribution metadata all excluded.
  - `_generate_unique_share_code()` — SAP-XXXX-XXXX with unambiguous alphabet (no 0/O/1/I) so codes are safe to read aloud. 32^8 keyspace, collision-checked.
  - `POST /api/share-codes/generate` (Pro-gated) + `GET /api/share-codes/my` (placeholder for future "my shared pages" UI).
  - Frontend: sky-blue Share2 button in the page-card action row, between Duplicate and Delete. Share modal with three states (loading / success-with-code / error). Click-outside or X to close. Copy-to-clipboard with Check feedback on success.
  - **Live-verified:** Steve generated `SAP-7B3T-KJLH` from his Lead Capture Page, modal rendered clean, code copied to clipboard.

- **Commit 2 (`daf0e85`) — import + ref-link rewriter + Import UI.**
  - `POST /api/share-codes/import` (Pro-gated) — normalises codes (accepts with/without dashes and SAP- prefix), validates v1 payload, builds fresh draft FunnelPage owned by importer.
  - `_rewrite_referral_links(text, new_username)` — regex sub of `/r/USERNAME` and `?ref=USERNAME` / `&ref=USERNAME` patterns. Returns (rewritten_text, count). Runs on raw strings so JSON-encoded blobs (sections_json, gjs_components) stay valid. Applied across 14 text-bearing fields in the snapshot.
  - Heuristic warning: if no rewrites happened but the CTA contains `/r/`, `ref=`, or `affiliate`, flag it in the response so the importer reviews before publishing. Cheap; better to over-flag than miss a stranger's monetised link.
  - Imported page forced to `status='draft'`, stats zeroed, bindings cleared (`default_list_id`, `capture_sequence_id`), AI flags removed. Importer wires their campaign on first publish via Phase 1 modal.
  - `uses_count` incremented per successful import.
  - **Owner identity NEVER exposed** in the response.
  - Frontend: outlined-cobalt "Import code" button next to "+ New page" in header. Import modal with monospace uppercase letter-spaced input. Inline errors, submit on Enter. Success state shows rewrite count, any warnings (amber), and "Open page editor →" CTA. `load()` refires in background so the new card is on the dashboard when modal closes.
  - **Live-verified:** Steve imported his own code, page count went 6→7, success modal showed "No referral links found to rewrite", green clone-created-as-draft panel rendered correctly.

**Stopped before commit 3 (marketplace):** Steve switched to mobile after commit 2 verification. Mobile UI worked but desktop editor was unreachable on mobile to truly verify the imported page. Marketplace deprioritised on 20 May session — refocused on Page Builder audit instead per Steve's call. Spec stays locked for whenever we come back to it.

**Share Code commits:**
```
6054280  Share Code commit 1: schema + generate endpoint + Share button
daf0e85  Share Code commit 2: import endpoint + ref-link rewriter + UI
```

**Mobile editor gap noted but not actioned:** GrapesJS visual editor is desktop-only by design. Imported pages can't be reviewed on mobile. Worth flagging if we add a "view-only" mobile preview later — would close the import-on-mobile loop.

---

Short, clean session. Two commits shipped + live-verified. Started with a spec conversation, locked the scope, built it.

**Spec locked in conversation (saved direction A):**
- **Unit: FunnelPage only.** Not "campaigns in a box" — just pages. Lists, sequences, and stats stay with the original owner; importers wire their own campaign on import via the existing Phase 1 modal flow.
- **Two share lanes, one system:** private (Alice DMs a code to Bob) and marketplace (admin-curated, v1). Same `share_codes` table; marketplace is a filtered listing UI on top.
- **No attribution shown anywhere.** Not on imported pages, not on marketplace cards. Network marketers don't want "Template by Alice" on a page they're trying to look like the authority on — Steve's call, and correct. The `owner_user_id` column exists for admin/abuse tracking only; never exposed in any response to the importer.
- **Marketplace v1: admin-curated only.** Users can submit, Steve approves. v2 can open up later if quality holds.
- **Asset handling: deliberately deferred.** R2 URLs are public and stable so imported pages just reference the original assets. Network marketers typically swap imagery to their own brand anyway; copy-on-import was overkill for v1. Flagged for revisit if abuse or breakage shows up.

**Shipped:**

- **Commit 1 (`6054280`) — schema + generate + Share button.**
  - `ShareCode` model (`share_codes` table: code, owner_user_id, source_page_id, payload_json, is_public, uses_count, expires_at) + CREATE TABLE + 3 indexes in `run_migrations()`.
  - `_build_share_payload(page)` snapshots a FunnelPage into a `{"v": 1, "page": {...}}` dict. `SHARE_CODE_V1_FIELDS` whitelists only visual/content columns (24 fields) — ownership, slug, stats, bindings, A/B pointers, attribution metadata all excluded.
  - `_generate_unique_share_code()` — SAP-XXXX-XXXX with unambiguous alphabet (no 0/O/1/I) so codes are safe to read aloud. 32^8 keyspace, collision-checked.
  - `POST /api/share-codes/generate` (Pro-gated) + `GET /api/share-codes/my` (placeholder for future "my shared pages" UI).
  - Frontend: sky-blue Share2 button in the page-card action row, between Duplicate and Delete. Share modal with three states (loading / success-with-code / error). Click-outside or X to close. Copy-to-clipboard with Check feedback on success.
  - **Live-verified:** Steve generated `SAP-7B3T-KJLH` from his Lead Capture Page, modal rendered clean, code copied to clipboard.

- **Commit 2 (`daf0e85`) — import + ref-link rewriter + Import UI.**
  - `POST /api/share-codes/import` (Pro-gated) — normalises codes (accepts with/without dashes and SAP- prefix), validates v1 payload, builds fresh draft FunnelPage owned by importer.
  - `_rewrite_referral_links(text, new_username)` — regex sub of `/r/USERNAME` and `?ref=USERNAME` / `&ref=USERNAME` patterns. Returns (rewritten_text, count). Runs on raw strings so JSON-encoded blobs (sections_json, gjs_components) stay valid. Applied across 14 text-bearing fields in the snapshot.
  - Heuristic warning: if no rewrites happened but the CTA contains `/r/`, `ref=`, or `affiliate`, flag it in the response so the importer reviews before publishing. Cheap; better to over-flag than miss a stranger's monetised link.
  - Imported page forced to `status='draft'`, stats zeroed, bindings cleared (`default_list_id`, `capture_sequence_id`), AI flags removed. Importer wires their campaign on first publish via Phase 1 modal.
  - `uses_count` incremented per successful import.
  - **Owner identity NEVER exposed** in the response.
  - Frontend: outlined-cobalt "Import code" button next to "+ New page" in header. Import modal with monospace uppercase letter-spaced input. Inline errors, submit on Enter. Success state shows rewrite count, any warnings (amber), and "Open page editor →" CTA. `load()` refires in background so the new card is on the dashboard when modal closes.
  - **Live-verified:** Steve imported his own code, page count went 6→7, success modal showed "No referral links found to rewrite", green clone-created-as-draft panel rendered correctly.

**Stopped before commit 3 (marketplace):** Steve switched to mobile after commit 2 verification. Mobile UI worked but desktop editor was unreachable on mobile to truly verify the imported page. Agreed to ship marketplace at desktop next session. Marketplace is the lightest of the three commits — a single admin-flip endpoint + a browse page reading the same `share_codes` table.

**Tonight's commits:**
```
6054280  Share Code commit 1: schema + generate endpoint + Share button
daf0e85  Share Code commit 2: import endpoint + ref-link rewriter + UI
```

**Mobile editor gap noted but not actioned:** GrapesJS visual editor is desktop-only by design. Imported pages can't be reviewed on mobile. Worth flagging if we add a "view-only" mobile preview later — would close the import-on-mobile loop.

---

## 🎯 Previous Session (18 May 2026 evening) — Phase 1 + 1.5 + 2: Campaign Hub foundation + Dashboard rebuild

Long evening session, 13 commits on top of the morning's Activity-Feed commits. Architectural shift from "three disconnected tools (SuperPages + SuperLeads + Sequences)" to "campaigns implicit in the data model — every page binds to a list at create time, captures auto-land in the right list." Direction A (no new Campaign table — wire the existing three tables tighter).

**Sparked by:** Steve flagged that `/pro/funnels` was visually disjointed and product-fragmented. Discussion led to competitive research on AWeber + GetResponse via web_search — both ask "which list does this page feed?" at page-create time; SuperAdPro didn't. The gap was the rebuild target.

**Six-phase plan locked (Direction A):**
1. List-per-page binding foundation ✅
2. Edit Campaign Wiring on existing pages ✅
3. Dashboard split into `/pro/funnels` + `/pro/funnels/new` ✅
4. CRM hygiene (source badges, move-between-lists) ⏳
5. Cross-navigation between Pages/Lists/Sequences ⏳
6. AI campaign setup + polish ⏳

**Three major builds shipped tonight:**

- **Phase 1 (Campaign Hub foundation, commits `cc05a436`+`55deb025`+`2b7e529c`):** New `funnel_pages.default_list_id` nullable FK + index, migration runs on deploy. Existing `capture_sequence_id` column repurposed as the default-sequence binding. Two new admin endpoints — `/admin/api/campaign-binding-status` (read-only state report) and `/admin/api/backfill-campaign-binding?dry_run=true|false` (idempotent backfill: creates `<page.title> leads` list for every page with captured leads but no binding, assigns historical MemberLeads). Steve ran dry-run first, eyeballed plan, then executed live — 2 lists created, 2 historical leads adopted, 22 of 22 leads now have list_id populated. Capture endpoints (both modern `/api/leads/capture` and legacy `/f/{slug}`) now write `MemberLead.list_id = page.default_list_id` automatically. New shared `_apply_campaign_binding(db, user, page, body)` helper called from all three creation paths (save, modern template_builder, legacy NICHE_TEMPLATES). New `CampaignSetupModal` component (required at page-create, no bypass — locked product spec) with two sections (List + Sequence), three radio options each (Skip / Auto-create / Use existing), both defaulting to "Skip" to force conscious decision. New `/api/funnels/setup-options` endpoint feeding the modal dropdowns. **Live-verified by Steve: created an opt-in page through the modal, picked a list, published, submitted form with test email, lead landed in chosen list. End-to-end working.**

- **Phase 1.5 (Edit Campaign Wiring, commit `f7909e13`):** Each My Pages card grows a clickable wiring footer showing current binding state — green-cobalt `→ Fitness Leads · Welcome series (5)` for bound pages, red `⚠ No list bound · Fix →` for unbound. Click opens the same CampaignSetupModal in edit-mode (pre-filled with current bindings, "Save changes" button, subtitle clarifies change applies to FUTURE captures only — existing leads untouched). New `POST /api/funnels/{id}/wiring` endpoint shares the same `_apply_campaign_binding` helper. `/api/funnels` response gained `default_list_id/default_list_name/capture_sequence_id/capture_sequence_title/capture_sequence_num_emails` via batched joins (no N+1).

- **Phase 2 (Dashboard split, commit `58aea227` + 5 visual tweak commits):** `/pro/funnels` becomes pure dashboard — cobalt next-action banner anchoring the TOP (always renders, skeleton placeholder while loading), header + cobalt "+ New page" button, ROI strip, Recent Activity row (moved ABOVE My Pages on Steve's flag — `14b30615`), Your Pages grid with subtle two-layer cobalt-tinted shadows that lift cards off the background (`e08b56d8`), no templates, no AI hero, no AI wizard modal. `/pro/funnels/new` is the new create page — back button next to title (promoted from tiny breadcrumb after Steve flagged it was missable, `d2c75124`) + bottom-of-page back button duplicate, big cobalt-to-teal "Build me a page" AI hero powered by Grok 4.1, 3×3 template grid with 9 tiles (Lead Capture / Video Sales / Blank Canvas top-right slot 3 `3b2c067c` / Product Offer / Webinar / Business Opp / Digital Product / Affiliate / Thank You — Coaching dropped). Each gradient tile uses unique cobalt-spectrum colours (cobalt #0a1438, royal #1e3a8a, sky #0ea5e9, cyan #06b6d4, electric #22d3ee, teal #0e7490) — no amber, no purple, no red. Blank Canvas tile has dashed border + centered text (`fee64474` — gradient tiles stay left-aligned because their icon-on-gradient cover anchors the eye). New shared `frontend/src/data/funnelTemplates.js` — single source of truth for the 9 templates. New backend handler `@app.get("/pro/funnels/new")` so direct URL access doesn't 404.

**Mockup-driven iteration:** before any code landed for Phase 2, I rendered the dashboard + create page in the Visualizer with the Claude design MD constraints. Steve eyeballed the mockup, locked the design (banner-at-top + always-visible + 9-tile 3×3 grid with unique gradients), then I built it. The mockup → lock → build → small-tweaks-from-Steve cycle ran cleanly across 5 follow-up commits.

**One workflow lesson:** the JSX block reorder in `14b30615` (Activity-above-Pages) used a Python script when str_replace would have been brittle on 100+ line blocks. Earlier in the session I'd wrestled str_replace through a similar cleanup and ended up with duplicated dead code that needed `sed` to clean up. Lesson: for moves bigger than ~30 lines or when content has fuzzy boundaries, reach for Python/sed earlier rather than fighting str_replace.

**Live DB state at session end:**
- 11 pages total · 2 currently bound (the 2 backfilled) + 1+ created via modal during testing
- 5 LeadLists + 1+ created via modal
- 22 MemberLeads · all 22 have `list_id` populated
- 9 unbound pages remaining (pre-Phase-1 pages) — Steve can fix via the dashboard wiring footers when convenient

**Labs editor parity gap flagged (commit `360d3e82`):** the new CampaignSetupModal + wiring footer live on production `/pro/funnels` only. Backend bindings ARE universal (Labs editor calls the same `/api/funnels/save` that uses `_apply_campaign_binding`), but Labs at `/labs/pagebuilder` (`LabsPageBuilder.jsx`) has its own template browser and doesn't trigger the modal. Deferred to pre-cutover audit because Labs is admin-only — no real user friction yet.

---

## 🎯 Previous Session (18 May 2026 morning) — Unified Campaign Hub + Lead Attribution + 7 latent bug fixes

Long session, 18 commits. Three major builds shipped, six latent bugs surfaced and fixed properly (not papered over), end-to-end attribution test executed and verified with real $15.31 USDT on-chain transaction.

**Three major builds shipped:**

- **Unified Campaign Hub (Commit A — `f62ac80` and 6 polish iterations):** Enriched `/api/funnels` with per-page engagement joins (views_30d, optins_30d, conversion_rate_30d, leads_total, leads_hot, leads_new_24h, sequence_open_rate, last_lead_at) + top-level `rollup_30d` (visitors, leads, hot_leads, conversions, earnings). All metrics computed via grouped SQL — no N+1. On `/pro/funnels`: ROI strip rendered between AI hero and template grid as 760px-max-width white card with inline `[LAST 30 DAYS]` cyan pill + dynamic "Performance across {N} page(s)" subtitle, 36px Sora navy stat numbers (visitors → leads → conversions → earned). Per-page cards enriched with two-line stats (30d views · opt-ins · conv rate / 🔥 hot · new 24h · open rate). 7 design iterations to reach the polished final state: cobalt-on-cobalt → light-card → hero-48px → Goldilocks-36px → centred → inline-pill-header → max-width-constrained.

- **Lead Attribution Layer (Commit B — `83c1deb` + `d898a86`):** New `member_leads.attribution_user_id` FK column + `attribution_set_at` timestamp + boot-time `ALTER TABLE...IF NOT EXISTS` migration with index. New `_attribute_lead_to_activation(db, user_id)` helper in `payment.py` — case-insensitive email-match on MemberLead rows where `attribution_user_id IS NULL` AND `user_id != activating_user.id` (self-attribution guard). Hooked into `initialise_renewal_record` — the unified post-activation hook called from all 4 activation paths (balance redemption, WalletConnect, NOWPayments, Stripe legacy). Idempotent — re-running on every renewal is a no-op. New admin backfill endpoint `/admin/api/backfill-lead-attribution`. `/api/funnels` extended with conversions_30d + earnings_30d via `MemberLead JOIN Commission` (on `Commission.from_user_id = MemberLead.attribution_user_id`, `Commission.to_user_id = page.user_id`, types `membership_sponsor/membership_renewal_sponsor/gift_membership_sponsor`, status='paid', within 30d cutoff). **Conversions only count where the page owner actually got paid** — funnel captured them via wrong sponsor link = $0 = not credited. Avoids misleading "X conversions but $0 earned" UI.

- **End-to-end attribution test verified (commit chain → real $15.31 USDT tx `0x771f9512...d6ad`):** Real test executed: Steve built a fresh capture page `/p/SuperAdPro/test`, submitted form with `stevelawsonmarketing+attribtest1@gmail.com`, redirect to ref link confirmed, signed up `test30` via referral (sponsor_id=1 ✓), paid $15.31 USDT WalletConnect from personal wallet → Founder spot #31 claimed → activation hook fired → MemberLead.attribution_user_id set → Commission row created paying Steve $10 → `/pro/funnels` ROI strip flipped: `8 visitors → 2 leads → 1 conversion → $10 earned`, per-page card showed `1 30D view · 1 opt-in · 100% conv rate · 1 new 24h`. Founder economics ($10 sponsor + $5 company, locked-for-life) live-verified for the first time on production.

**Six latent pre-existing bugs surfaced and fixed (not introduced today, just exposed by today's work):**

1. **`_safe_json` undefined NameError** — function defined in `main.py.backup` line 16751 but **missing from current `main.py`**. Two call sites (api_leads_sequences line 28671, send_sequence_email line 28856) threw `NameError` on every call. `/api/leads/sequences` 500'd, killing the `Promise.all` batch in `MyLeads.jsx` — `.catch()` swallowed it, `/pro/leads` rendered as completely empty with 0 leads despite 14 in DB. Restored helper in `main.py` near line 728 (commit `3e71737`).

2. **`brevo_message_id` column missing on live DB** — added to `EmailSendLog` model + CREATE TABLE in commit `029bf94` (this morning's Brevo webhook fix) but no `ALTER TABLE` migration. Pre-existing tables didn't have the column. INSERTs failed → transaction poisoning → InFailedSqlTransaction errors → capture endpoint silently failed → form button stuck on "Submitting...". Fixed: ALTER added (`5aa97d9`) + two-phase commit in capture_lead (lead saved before CRM block, rollback on inner failures, lead re-saved without email log if Brevo errors).

3. **`SKIP_MIGRATIONS=true` blocking all new column adds** — env var set May 15 launch night, never cleared. Every new column shipped since then (attribution_user_id, brevo_message_id, etc.) wasn't reaching production DB. Resolved when Steve deleted the variable on Railway dashboard; all queued migrations ran cleanly on next deploy. **This is the root cause of bugs #2-4. Lesson: when this flag is on, FIRST move is clearing it, not shipping more schema-dependent features.**

4. **Form placeholder `{t('...')}` literal saved as HTML** — `buildHTML()` in both `superpages/SuperPagesEditor.jsx` (line 869) and `labs-superpages/SuperPagesEditor.jsx` (line 1429) embedded i18n template syntax inside JS template literals, which don't evaluate `t()`. Literal Handlebars-style text saved as the form input's `placeholder` attribute. Affected every form block created via either editor. Fix: resolve `t()` into local vars BEFORE the template literal. Also shipped admin cleanup endpoint `/admin/api/fix-broken-form-placeholders` that regex-replaces broken patterns with English fallbacks in `gjs_html/gjs_components/gjs_styles/sections_json` columns (NOTE: NOT `content_json/html_export` — those don't exist). Commits `8a92a53` + `abd58cb`.

5. **Form button text-allowlist regex** — `exportHTML.js` in both editors used hardcoded text matching (`Get Access|Submit|Sign Up|Join|...`) to convert styled `<div>` to `<button type="submit">`. Custom button labels ("Start Free Trial", "Yes! Count me in →") never matched → forms had NO submit button → form never fires. Also lost trailing characters via greedy `[^<]*` + `$4` backreference (Get Access → → just "Get Access"). Fix: `buildHTML()` emits real `<button data-sp-submit="1">` with exact user text; `exportHTML.js` uses two-pass strategy (new attribute-based + legacy text-allowlist fallback for pre-existing pages). Commit `93b4e9a`. Both editors in lockstep.

6. **Frontend silent `.catch(() => ...)` everywhere** — `Funnels.jsx` and `MyLeads.jsx` (and probably more) used `.catch(() => setLoading(false))` to handle Promise rejections. Any API failure swallowed silently, leaving the page rendering as if got zeros. Funnels.jsx fixed in `2dd8a66` (proper error banner + Retry button). MyLeads.jsx still has the pattern but the underlying _safe_json bug is fixed so it's no longer triggering. **Anti-pattern audit queued for next session — grep ALL frontend files and surface or remove every silent catch.**

**New admin tooling shipped:**

- `GET/POST /admin/api/diag-member-leads` — DB state inspection + probes all 5 endpoints that `MyLeads.jsx` calls. Returns total rows globally, total for caller, last 20 of each, plus `endpoint_probes` dict showing which calls succeed/fail. Built specifically to diagnose the funnels-shows-1-leads-shows-0 contradiction; will be reused for future debugging.
- `GET/POST /admin/api/backfill-lead-attribution` — one-shot historical email-match between active users and pre-existing MemberLead rows. Idempotent. Returns `{users_scanned, leads_attributed, errors}`.
- `GET/POST /admin/api/fix-broken-form-placeholders` — regex-cleanup of literal `{t('...')}` strings in FunnelPage HTML columns.
- All converted from POST-only to GET+POST (commit `b62d51b`) so Steve can run them from the browser URL bar — DevTools paste is blocked in his Chrome.

**SKIP_MIGRATIONS now OFF on Railway** — Steve deleted the variable mid-session. All pending migrations ran cleanly on next deploy: attribution_user_id, attribution_set_at, brevo_message_id, lead_lists.list_id (if not already). `/pro/leads` now shows 14 MemberLead rows correctly.

**Key commits (chronological — 18 today):**
`f62ac80` Campaign Hub Commit A initial · `1273108` ROI light-card redesign · `076be73` ROI hero-scale · `eb250a0` Goldilocks 36px + dynamic page count + drop dup stat cards · `2938e6e` ROI centred stats reduced height · `39ad054` inline centred pill header · `d3aa555` 760px max-width centred · `83c1deb` Campaign Hub Commit B attribution · `d898a86` self-attribution guard parity · `2dd8a66` Funnels error banner replaces silent catch · `8a92a53` placeholder bug fix · `5aa97d9` form submit freeze fix + two-phase commit · `93b4e9a` button conversion robust + Labs parity · `064fef8` leads_captured counter increment · `7b8bcbf` diag-member-leads endpoint · `5932590` diag probes for all 5 MyLeads endpoints · `3e71737` _safe_json restored · `b62d51b` admin endpoints GET+POST · `abd58cb` cleanup endpoint correct column names

**Open items queued for next session:**

- **Commit C — Recent Activity Feed** (the third and final commit in the Campaign Hub series). Below My Pages: hot leads to call (top 3 most engaged unconverted), new leads last 24h, sequence-complete broadcast opportunities, recent commissions list, contextual "next action" prompt based on user state.
- **Subdomain feature** (`{username}.superadpro.com` free for active Partners, ~3-4 days).
- **Custom CNAME domain $5/mo service fee** (~2-3 weeks). Architecture locked: separate `custom_domain_monthly` product following `email_boost` pattern. Three new User columns (`custom_domain`, `custom_domain_paid_until`, `custom_domain_verified_at`). NO Commission rows — service fee, 100% company revenue. Activation slots into `_nowpayments_activate_product` next to email_boost branch.
- **Share Code system** — pack FunnelPage + EmailSequence + LeadList as portable JSON.
- **Creative Studio → Page Builder embed** ("Use in funnel" button + "Pick from my assets" dropdown).
- **Labs Phase 2 polish + pre-cutover audit** — both editors are in code parity (form bugs, placeholder bugs, button conversion). Before cutover: parity test (same funnel page in both editors, compare what reaches MemberLead), grep both for shared dependencies, sweep ALL silent-catch patterns site-wide.
- **Campaign Setup Modal — Labs parity** (Phase 1 carryover, flagged 18 May 2026). Production `/pro/funnels` now opens the CampaignSetupModal before every page-create (required, no bypass) and surfaces a wiring footer on every My Pages card. The Labs entry point `/labs/pagebuilder` (LabsPageBuilder.jsx) does NOT yet have the modal — pages created via Labs land unbound and rely on the user later editing wiring from `/pro/funnels`. Backend wiring (default_list_id column, /api/leads/capture binding logic, /api/funnels/{id}/wiring endpoint, _apply_campaign_binding helper) IS universal — both editors share it. Deferred because Labs is currently admin-only; will be mirrored as a single dedicated commit before Labs becomes the default editor.
- **Silent-catch anti-pattern sweep** — search frontend for `.catch(()` and surface or remove every silent swallow.
- **CompensationPlan.jsx / PassupVisualiser.jsx** still show old Basic/Pro economics — need rewrite to reflect Partner+Founder current state.
- **Translations** — ~40 new English strings need translating into 19 other languages.
- **Audit other places that surface raw xAI URLs** (Steve flagged earlier).

**Lower-priority follow-ups:**

- 11 unresolved orphans on `0xa96be652a08d9905f15b7fbe2255708709becd09` totalling ~$190 USDT spanning 14-17 May (orphan IDs 14, 16, 18-26, 31). No user record. Needs Steve's call: spam-mark / investigate / refund.
- 5 dust orphans (#28, #27, #17, #15, #13, #12) — address-poisoning, safe to mark resolved as spam. Steve confirmed "keep orphans queued".
- 3 NOWPayments orders SAP-151-101 (richard1980), SAP-187-99 (mvucic14), SAP-224-98 (chrisbrown) — already auto-marked `abandoned` by cron, no action needed.
- Tier 2 admin MCP tools (activate_user_manually, mark_order_expired, etc.).

**Operating lesson from today (worth keeping):**
When `SKIP_MIGRATIONS=true` is set, that's the FIRST thing to address before shipping schema-dependent features. Today's work shipped Commit B without that check, leading to ~2 hours of follow-on firefighting that should have been one clean ship. Pattern: I built features that depended on columns that didn't exist on the live DB, the live DB silently rejected the related INSERTs, the SQLAlchemy session got poisoned, and downstream UI showed empty states with no signal anything was wrong. The defensive try/except patches I added are belt-and-braces — the real fix was clearing the flag. **Next time: flag the env-var state on first turn before any schema-related work.**

---

## 🎯 Previous Session (17 May 2026 evening) — Fast Start Grid activation flow

Built and shipped the Fast Start activation funnel for Grid Tier 1 ($20 `grid_1` product) — Steve's brainstorm from earlier in the day. Verified end-to-end with two real iteration rounds on the explainer page layout.

**Two new surfaces:**

- **Dashboard FastStartHero** (`FastStartHero.jsx`) at the top of `/dashboard` for active Partners without a T1 grid. Cobalt card with a red 160px ignition button (pulsing rings, the ONLY non-cobalt accent in the brand), Sora headline "Your Grid is waiting / Activate Your Grid for $20", three live stats (next available SAP-#####, activated last 24h, activated last hour). Degrades to a one-line "Continue activation →" card with × dismiss after first click. Renders null after activation OR dismissal. Three states tracked server-side via two new nullable timestamps `users.fast_start_pressed_at` and `users.fast_start_hidden_at`.

- **`/grid/activate` explainer page** (`GridActivatePage.jsx`) — dark cobalt page, white-card mini-Grid (6 columns × 4 rows = 24 cells) showing 3 sample seats in positions 1-2-3 (gold direct + two green auto-place, matching the live visualiser's encoding so the visual story is continuous). Mini-grid header reads "T1 Starter — $20 / 3 of 24 (illustrative)" with a 12.5% progress bar. CTA section hooks BOTH active payment systems: WalletConnect self-custody primary, NOWPayments fallback — both wired to `grid_1` and resolve to the same `process_tier_purchase` activation. Success state (triggered by `?activated=1` or server-confirmed `has_grid_position`): "You're in" headline, position card with SAP-#####/tier/sponsor/status, "Create your first campaign →" next CTA.

**Backend wiring:**

- Three API endpoints: `GET /api/fast-start/state` (returns state + stats + 401 if unauth), `POST /api/fast-start/press` (records click, idempotent), `POST /api/fast-start/hide` (× dismiss, idempotent). All gated by `if not user: return 401`.
- `_nowpayments_activate_product` (the canonical activation handler used by both WC and NOWPayments paths) sets `fast_start_hidden_at` when ANY grid tier activates, so the hero never reappears after the user buys in.
- Predicate gating: hero ONLY renders for `is_active=True` users (paid Partners) who don't yet own a T1 grid. Free users never see it — they should hit the Founding Partner banner / hero carousel for membership conversion first. Belt-and-braces: also force-hidden if user already has a `Grid` row at `package_tier=1`, protecting against stale columns on users who activated before this feature shipped.
- New columns added under SKIP_MIGRATIONS-gated path AND an un-gated `IF NOT EXISTS` path (same precedent as commit `ff77dc5`) so the columns land on the next deploy regardless of the kill-switch.

**Live test verification:**

- test12 (SAP-00293, Founder #18) — hero correctly hides because they already own a T1 grid from 16 May. Belt-and-braces predicate confirmed working.
- Steve's free-tier account — hero correctly hides after the `is_active=True` gating fix.
- Steve's real activation click (when account was free) — bounced to Partner upgrade via `RequireTier` route guard, the correct funnel behaviour.

**Iteration rounds:**

1. Initial ship: 4×4 grid with sample seats stacked vertically in left column (positions 1, 5, 9) — felt cramped, CTA below fold.
2. Tightened layout, spread seats diagonally (positions 2, 7, 12) — still too tall on desktop.
3. Final: wider 6×4 grid (24 cells), seats in positions 1-2-3 reading as a sequential row of three filled — semantically accurate (real T1 fills sequentially from pos 1) AND visually fits with CTA above fold. Steve approved.

**Brand note (flagged):**
Mini-grid keeps gold/green seat encoding even though the brand palette says "no amber/gold." This is a functional encoding tied to the comp plan's Direct vs Auto-Place distinction in the live visualiser — changing it on the mini-grid would break the visual continuity between this page and `/grid-visualiser`. Steve has the call to revisit if needed.

**Key commits (chronological):**
`48c1082` Fast Start flow shipped (hero + page + endpoints + columns) · `4ac0f59` 401 guards on endpoints (sanity check caught NoneType crash) · `14a7fcc` gate to active Partners only · `4d68b7c` tighter grid + diagonal seats · `695fc61` final 6×4 wide grid with seats 1-2-3

---

## 🎯 Previous Session (17 May 2026 PM) — BSC scanner reliability solved

Mid-Sunday session, ~3 hours focused on production reliability. All commits live, all verified end-to-end.

**Customer support case closed (SAP-00205 Christel @chrissxx):**
- She reported 3 payments for 2 positions. Traced all three on-chain: $14.54 (orphan), $15.39 (Ardy's payment that activated him as Founder #16, NOT a duplicate), $15.09 (her own Founder #17 activation).
- Real issue: the $14.54 hit treasury at block 98459311 during the launch-night BSC-scanner outage and was never filed as an orphan, never visible to admin tooling. Sat in treasury invisible for 2 days.
- Steve refunded $14.54 from treasury → her wallet (tx `0xe088cbab...1422`). Books reconciled via one-shot migration that filed the original orphan retroactively with the refund txid in the resolution note (commit `6da0724` + `ff77dc5`).
- Filed reusable admin endpoint `/admin/api/orphans/file-missed` for any future scanner-miss cases (commit `b9a9743`).

**BSC scanner reliability — 3-layer structural fix, all free, all shipped:**

Root cause: the cron previously advanced its scan cursor to `latest_block` regardless of whether individual 10-block chunks inside the scan loop failed. Chunk-level failures (typically Alchemy free-tier rate-limits) only logged warnings; cursor silently skipped over failed ranges. Transfers in those blocks were lost forever. That's how Christel's $14.54 went missing.

- **Layer 1 — self-healing cursor (`6f54548`).** New `scan_treasury_transfers_with_cursor()` returns `(transfers, safe_cursor, failed_chunks)`. `safe_cursor` is the highest block in an unbroken chain of successful chunks from the floor. Failed chunk → cursor stays at the pre-failure boundary → next run automatically re-scans. Match logic is already idempotent on `tx_hash`, so retries are cheap and safe. Verified with 6-scenario logic test including exact Christel reproduction.

- **Layer 2 — multi-RPC failover (`f6c110c`).** New `call_bsc_rpc_with_failover(method_name, *args)` in `app/withdrawals.py`. Tries primary RPC, transparently retries against 7 free public BSC dataseed + LlamaRPC endpoints on rate-limit / connection errors. Detects rate-limits via signal strings (`429`, `-32005`, `limit exceeded`, `rate limit`, `quota`, etc). Real bugs (`ValueError` on bad args) propagate immediately — failover only triggers on throttling. Used for both `eth_getLogs` and `eth_blockNumber` in the scanner. `_get_web3_bsc()` itself also failovers on connection. Verified with 7-scenario logic test. Configurable via `BSC_RPC_FALLBACKS` env var (defaults to the 7-URL list).

- **Layer 3 — in-process scheduler with advisory lock (`f8f91e8`).** Daemon thread spawned in `startup_event()`, runs every 30s (configurable via `BSC_INPROC_SCHEDULER_INTERVAL_SECONDS`). Before each scan acquires `pg_try_advisory_lock(1885347291)` — non-blocking. Multi-replica safe: only one replica scans per tick, others skip silently with `{"skipped": "lock_busy"}`. Lock auto-releases on session close. Loop is loss-proof — any exception is caught, traceback logged, sleeps and retries. Disable with `BSC_INPROC_SCHEDULER_ENABLED=false`. Pattern matches the existing daily-backup daemon thread.

**Verification — end-to-end live test on production:**
- Steve's first test ($1) accidentally went to old retired Polygon wallet `0x7174...` — bookmark trap.
- Second test (tx `0x1387e02e...c44`, $1 → treasury, block 98827412) picked up by in-proc scanner within ~60 seconds, filed as orphan #30. Real proof Layer 3 works.
- External cron-job.org trigger ("SuperAdPro WalletConnect watcher") disabled by Steve. In-process scheduler is now the sole driver of BSC scans. Original cron stays paused (not deleted) as one-click revert.

**Cleanup (`52ed3ab`, `ba4765a`):**
- Verbose heartbeat logging from burn-in (`711b882`) quieted to: always log transfers/matches/orphans/errors/failed chunks; otherwise only every 60th tick (~30 min) prints a "(heartbeat)" line so logs prove liveness without spamming.
- Test orphan #30 marked resolved with full audit note.

**Key commits (chronological):**
`b9a9743` admin orphan file-missed endpoint · `6da0724` retroactive file Christel orphan · `ff77dc5` un-gate from SKIP_MIGRATIONS · `6f54548` Layer 1 self-healing cursor · `f6c110c` Layer 2 multi-RPC failover · `f8f91e8` Layer 3 in-process scheduler · `711b882` burn-in heartbeat · `52ed3ab` quiet heartbeat + resolve test orphan · `ba4765a` cosmetic SyntaxWarning fix

**What to look for in Railway logs (steady state):**
- Boot: `✅ In-process BSC scanner scheduled (interval 30s, lock_id 1885347291)` × N replicas, then `✅ In-process BSC scanner started (interval 30s)` × N replicas
- Real activity: `[bsc-scan tick N] floor=... latest=... transfers=1 matched=1 orphans=0 ...`
- Lock skip on extra replicas: occasional `[bsc-scan tick N] skipped: lock_busy (heartbeat)`
- Liveness: `[bsc-scan tick N] ... (heartbeat)` every ~30 min on idle
- Layer 1 in action: `cron_scan_bsc_payments: cursor → 98xxxxxxx (held back from 98yyyyyyy due to N failed chunk(s) — retry next run)`
- Layer 2 in action: `BSC RPC call eth.get_logs succeeded on fallback #1 (https://bsc-dataseed1.binance.org/)`

---

## 🎯 Previous Session (16-17 May 2026 AM) — what shipped

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

**HIGHEST PRIORITY (carried over from 19 May late session):**

1. **Page Builder Phase 2B — Media types (Image / Video / Audio).** Next batch in the systematic port. Pattern is established — copy `TextTypeProperties` shape, adapt for media-specific controls (source URL, alt text, object-fit, autoplay flags for video/audio, captions). Add types to `INSPECTOR_TYPES` in Canvas.jsx + dispatcher in ElementInspectorPanel.jsx. Realistic: one focused session.

2. **Page Builder Phase 2C — Form (proper port).** Form is functionally working (verified 18 May, leads land in MemberLead with attribution); just needs UI port to the Inspector + field add/remove UX (currently hardcoded to name+email). One session.

3. **Page Builder Phase 2D — Content/Social Proof batch (Review, Testimonial, FAQ, Badge, Stat, Progress).** Similar shape across these — can probably batch in one or two sessions.

4. **Page Builder Phase 2E — Layout/Decoration batch (Countdown, Socials, IconText, Separator, Logos, Spacer, Box, Divider, Embed).** Nine types, simplest of the lot. Probably one session.

5. **Once all 26 types ported: delete the old modal system.** Strip `ButtonEditor` from SuperPagesEditor.jsx (~1500 lines), remove the floating `✎ EDIT` chip code, remove QuickProps entirely. Major cleanup.

6. **Production rollout of the new editor layout.** Currently gated to `isSandbox` mode. Flip the flag and remove the `hideSidebar`/`hideTopbar` conditional gating so `/labs/pagebuilder/edit/{pageId}` (DB-backed pages) gets the new UX too. Also: replace the narrow-viewport splash with collapse-to-overlay behaviour (panels become drawers at <1100px instead of blocking the editor).

**INFRA RESILIENCE (decided this session, do in a quiet window):**

7. **Daily Postgres backups to external storage** (S3 or B2). ~2 hours. Single biggest resilience improvement we can make without switching hosts. See `🛡 Infrastructure Resilience Plan` section above for full context.

8. **Outage comms playbook** — Twitter/X template, email template, in-app banner mechanism. Draft alongside #7.

**STILL VALID FROM EARLIER SESSIONS:**

9. **Member-facing rotator opt-out toggle.** Currently Founders email support to be removed from the rotator. Build a toggle in their account settings page that flips `users.rotator_opted_in`. Estimated 20-30 min.

10. **Rotator dashboard widget for Founders.** Show each opted-in Founder their current queue position + last-assigned timestamp, so they have visibility into when the next signup will come their way. 30-45 min.

11. **Latent `u.sponsor.username` bug in founder_offer broadcast endpoint.** Same pattern that crashed re-engagement dry-run before it was fixed. Won't fire until admin runs `founder_offer` dry-run. 5-min fix.

12. **Live count polling on `/start`.** Re-fetch `/api/start/stats` every 30s while visitor is on page; animate the founding-spots-remaining number down if it changed. Powerful scarcity signal. 10 min.

13. **Share Code marketplace (commit 3).** Spec locked from previous session; admin moderation panel + `/pro/funnels/templates` browse page. Deprioritised on 20 May in favour of Page Builder audit but spec stays intact for whenever we resume.

14. **i18n translation batch** for 19 non-English locales — `frontend/src/i18n/locales/*.json` flat-pricing keys still carry Basic/Pro/$35/$17.50; `app/training_content/` only has en.json (de/es/fr/hi/it/pt deleted, backend falls back to English).

15. **AI Trading Hub concept** (parked from April) — Pro feature, plain-English strategy → AI bot → backtest → live deploy. Phase 1: Strategy Builder + Backtester. ~3-4 sessions of work. Discuss in chat session first before starting engineering.

16. **BPG strategic positioning flywheel** (parked from 12 May) — BPG showcase on `/credit-nexus`, featured tile on `/creative-studio`, harden non-pack-owner upsell on `/brand-posters`. ~1.5-2 hours focused work.

17. **Command Centre dashboard + menu redesign** — Steve had mockups (`hub-dashboard.html`, `command-centre-desktop.html`, `recruiting-hq-mockup.html`). On hold until launch-incident follow-ups clear.

---

## 🎯 Immediate Next Task (17 May 2026 update)

**Platform launched 15 May 2026 with incident.** Test12 verified working as Founding Partner #18 on real on-chain payment. Two days later: BSC scanner reliability is now structurally solved (3 layers, all free, all live — see 17 May session log above). External cron-job.org trigger disabled. SAP-00205 Christel's $14.54 refunded and books reconciled.

**Remaining items, ordered by impact:**

1. **`SKIP_MIGRATIONS=true` is still set in Railway env vars** — bypasses migrations on every deploy. Safe for now but needs careful unsetting during a quiet window. The proper fix is to move migrations off import-time (eliminates the two-container contention root cause that caused the launch-night outage).

2. **3 stuck NOWPayments orders** (SAP-151-101, SAP-187-99, SAP-224-98) need marking expired. Pure data hygiene.

3. **Jason's orphan transfer** (orphan id 16, 20.83 USDT from `0xa96be...`) needs marking resolved/refunded.

4. **BPG audit + backfill** — run `/admin/api/bpg/audit-and-backfill` (audit only, GET), then `?backfill=true` for anything still salvageable. Endpoint shipped earlier.

5. **Translations** — Sprint 1/2/2c added ~40 new English strings (founding partner copy, badge labels, expired-poster banner) not yet translated into the 19 other languages. Spanish/French/German/etc users see English fallback for those strings.

6. **Audit other places that surface raw xAI URLs to the browser.** Creative Studio gallery, posters history page — same proxy pattern as `/api/posters/generation/{id}/candidate/{idx}/image` needs applying everywhere xAI URLs leak to `<img src>`.

7. **Tier 2 admin MCP tools** to build: `activate_user_manually`, `mark_order_expired`, `reconcile_orphan_transfer`, `grant_founding_spot`. All with dry-run mode + audit log. Removes the need for browser-session admin triggers entirely.

8. **CompensationPlan.jsx, PassupVisualiser.jsx, CompensationHubPage.jsx, IncomeMembershipPage, IncomePage** still show old Basic/Pro commission economics in places. Public templates (membership.html, upgrade.html) still reference $35/Pro. Comp plan PDFs in 20 languages outdated.

9. **Member email broadcast** to 15 grandfathered founders + 108 free members announcing Partner Programme.

10. **Command Centre redesign** (the previous "next task" before the launch). Steve had ideas for dashboard + menu restructure — see earlier mockups (`hub-dashboard.html`, `command-centre-desktop.html`, `command-centre-mockup.html`, `recruiting-hq-mockup.html`). Picks up once the launch-incident follow-ups are clear.

**Resolved 17 May 2026 (no longer on the list):**
- ~~BSC scanner cron not firing on schedule~~ — Layer 3 in-process scheduler replaces external trigger.
- ~~Alchemy RPC rate-limiting on free tier~~ — Layer 2 multi-RPC failover.
- ~~Christel's $14.54 refund + reconciliation~~ — refunded + orphan #29 resolved via one-shot migration.

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
- **Stream 02 Grid (gold/cyan/purple):** 6×6 grid (36 seats), 40% direct + 6.25% × 8 levels uni-level + 10% completion bonus at seat 36. Requires active campaign at tier or above to earn. Code: `app/grid.py`.
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

### Stream 2: 6×6 Profit Grid (Campaign Tiers)
**Structure:** 6 levels × 6 positions per level = 36 positions per visualised grid. The grid is a visualisation of uni-level activity; uni-level commission depth is still 8 (decoupled from grid shape).

**Changed 25 May 2026:** Grid cut from 8×8/64 to 6×6/36. Bonus pool stays at 10%. Lifetime $/year unchanged — same total dollars delivered in tighter cycles (~1.78× more completions/year). Migration was global on deploy; all in-flight grids re-targeted to 36 (Steve verified all live grids were below 36 fills at deploy time).

**Tier prices:**
| Tier | Name | Price |
|------|------|-------|
| 1 | Starter | $20 |
| 2 | Builder | $50 |
| 3 | Pro | $100 |
| 4 | Advanced | $200 |
| 5 | Premium | $400 |
| 6 | Elite | $600 |
| 7 | Master | $800 |
| 8 | Champion | $1,000 |

**Commission split per purchase (paid immediately when someone buys a tier):**
- **40% → Direct sponsor** — the person who personally referred the buyer. ONE person gets this.
- **50% → Uni-level pool** — 6.25% × 8 levels up the buyer's SPONSOR CHAIN (UNILEVEL_DEPTH=8, decoupled from grid visual). If the chain is shorter than 8, remaining levels are absorbed by the platform as recipient of last resort.
- **10% → Grid completion bonus pool** — accrues per seat fill, paid to grid owner when grid reaches 36/36
- **0% → Platform** — reallocated to bonus pool 21 May 2026. **100% of every Grid commission now goes to affiliates.**

**CRITICAL: Uni-level commissions and grid visualisation are decoupled.**
The grid shows 36 seats (6×6). Uni-level still pays 6.25% × 8 levels on every tier purchase up the sponsor chain — the 8-level commission depth is unchanged. The grid is a visualisation of a slice of that activity; when seat 36 fills (completing the visualised grid), the next two levels of uni-level activity "fill" the newly-opened second grid for that owner. From the grid owner's perspective each of the 36 seats in their grid pays them 6.25% × tier_price via uni-level, plus the 10% bonus when seat 36 fills.

**What a completed grid earns the grid owner (uni-level + bonus only, excludes direct referral commissions):**
| Tier | Price | Uni-level (6.25% × 36) | Completion Bonus (10% × 36) | Total per Grid |
|------|-------|----------------------|-----------------|---------------|
| 1 Starter | $20 | $45 | $72 | **$117** |
| 2 Builder | $50 | $112.50 | $180 | **$292.50** |
| 3 Pro | $100 | $225 | $360 | **$585** |
| 4 Advanced | $200 | $450 | $720 | **$1,170** |
| 5 Premium | $400 | $900 | $1,440 | **$2,340** |
| 6 Elite | $600 | $1,350 | $2,160 | **$3,510** |
| 7 Master | $800 | $1,800 | $2,880 | **$4,680** |
| 8 Champion | $1,000 | $2,250 | $3,600 | **$5,850** |

Per-cycle is 43.75% smaller than the previous 64-grid, but cycles fire ~1.78× more often. Total $/year potential is unchanged.

**Visual identity (locked 25 May 2026):**
- Gold gradient (#b45309 → #fbbf24 → #fde047) = direct referral tile
- Cyan gradient (#0891b2 → #06b6d4 → #22d3ee) = spillover tile
- Royal purple gradient (#4c1d95 → #7c3aed → #c4b5fd) pulsing = completion seat (position 36) and bonus card accent
- Cobalt header (`linear-gradient(135deg,#172554,#1e3a8a)`) = standard platform card header

Grids auto-renew after completion — a new grid opens immediately and the cycle repeats.

**Spillover model:** When a member purchases a tier, they fill ONE seat in EVERY upline grid at that tier (walking up the full sponsor chain). One person, one seat per grid advance.

**Qualification rule:** To earn commissions at a tier, you must have an active (or in-grace) video campaign at that SAME tier or higher. 14-day grace period after campaign views are fully delivered. If unqualified, commission is absorbed by the platform (does NOT walk up).

**Grid auto-renewal:** When a grid completes (36/36), a new grid opens automatically. If the owner didn't have an active campaign at completion, the bonus rolls over into the next grid's pool.

**Source:** `app/grid.py`, `app/database.py` lines 95-170

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
4. Campaign Grid · Opportunity (40%/6.25%/10%, 6×6 visual)
5. Grid · Math (tier ladder + per-cycle totals — $117 to $5,850)
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
