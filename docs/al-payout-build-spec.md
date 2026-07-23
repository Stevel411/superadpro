# AdvantageLife — Member-Funded Pass-Up Payout Engine: Build Spec
**The "how to wire the 3/6/9 settlement and pack checkout so money passes up the chain" document.**
_Written 7 Jul 2026 against main @ `6aa639a8`. Model terms per the locked AdvantageLife spec (solicitor-reviewed comp plan — do not re-flag legality)._

---

## 0. OPERATIONAL FLAG — READ FIRST
`advantagelife-passup` **does not exist on the GitHub remote** as of this writing. Main contains the fork source (`app/course_engine.py`), the permanent chain column (`users.pass_up_sponsor_id` + migration, database.py:326/2299), and the fresh migration-export tooling (`f7c93112`–`6aa639a8`) — but NOT `passup_engine.py` / `al_engine.py` / `al_settlement.py`, NOT `PackPurchase`, NOT `campaign_packs`. If those engines exist in a session container: **push the branch before anything else.** If they're gone, §3 of this spec is their rebuild contract.

## 1. THE MODEL (locked — invariants every line of code must respect)
1. **$100 one-time lifetime join → the PLATFORM** (Stripe + crypto). Standard checkout, NOT P2P. Sponsor earns **nothing** on the join. Join activates the account and fixes the member's position: `sponsor_id` (who referred) and `pass_up_sponsor_id` (permanent pass-up chain parent, derived at join per 3/6/9 — see §5.6).
2. **Product = campaign packs, $10–$1,000** (9 seeded tiers; `price` = the 100% P2P commission; `views_target` = deliverable). Sold **member-to-member**. **The platform never holds pack money** — it resolves who to pay and records proof.
3. **3/6/9 infinite pass-up, per pack tier**: a seller keeps sales 1,2,4,5,7,8,10+ at that tier and passes up their **3rd, 6th and 9th** sale at that tier to the first *qualified* member up their `pass_up_sponsor` chain.
4. **Two earning gates, BOTH required to receive a sale**: (a) own that pack level **or higher** (confirmed purchases only), (b) **watch-qualified** — daily watch met, with a **48h grace window**.
5. **Routing rules**: kept sale + unqualified seller-sponsor → **COMPANY** (no climb). Passed-up sale → **climbs** the `pass_up_sponsor` chain to the first member passing BOTH gates; **COMPANY only if the entire chain fails**.
6. **Counter increments on CONFIRM, not intent.**
7. **Payee is LOCKED at intent** and their payout method snapshotted — the buyer pays exactly who they're credited to, no re-routing after money moves.

## 2. DATA CONTRACT
### 2.1 `campaign_packs` (seeded, single source of truth — never hardcode prices)
id · name · price (USD, = commission) · views_target · daily_watch_required (nullable — Steve owes the 9 numbers) · sort · active.
$10 Launchpad/1k · $20 Starter/2k · $50 Builder/4k · $100 Pro/8k · $200 Advanced/15k · $400 Premium/30k · $600 Elite/50k · $800 Master/80k · $1,000 Champion/120k.

### 2.2 `pack_purchases` (the settlement ledger — one row per intent)
- `id`, `buyer_id`, `pack_id`, `amount_usd` (copied from pack at intent — price changes never mutate open intents)
- `status`: `awaiting_payment` → `proof_submitted` → `confirmed` | `expired` | `cancelled` | `disputed`
- **Payee lock**: `payee_user_id` (nullable → company), `payee_is_company` bool, `routing` (`kept` | `passed_up` | `company_unqualified_sponsor` | `company_chain_failed`), `resolved_position` (the counter position this sale was resolved as), `resolution_note` (human-readable chain walk, for disputes)
- **Payout snapshot**: `payout_method` (`usdt_bsc` v1), `payout_address` (copied at intent — payee changing their wallet later must NOT move an open intent)
- **Proof**: `proof_tx_hash` (unique across table where not null), `proof_note`, `proof_submitted_at`
- Lifecycle: `created_at`, `expires_at` (intent + 48h), `confirmed_at`, `confirmed_by` (`payee` | `admin`), `dispute_note`
### 2.3 `pass_up_counters`
`(user_id, pack_id)` → `confirmed_sales` int. Positions {3,6,9} test against this counter **plus open-intent offset** (§5.1).
### 2.4 Member payout methods
`users.payout_usdt_bsc_address` (or a payout_methods table). **RULE: a member with no payout address on file FAILS qualification as a payee** — otherwise buyers get an intent they cannot pay. Treat exactly like a failed gate: skip / climb / company.
### 2.5 Watch qualification
Single source of truth: `al_engine.watch_qualified(user)` = daily quota met within the last 48h (grace). Every gate check calls this one function; the UI shows "earning-qualified until {t}".

## 3. ENGINE SURFACE (exists on the missing branch; rebuild contract if lost)
- `passup_engine.py` (pure, no DB): `qualified(owned_level, watch_ok, has_payout, need_level) -> bool`; `resolve_payee(seller_chain_states, position) -> (payee|COMPANY, routing, walk_log)` — positions {3,6,9} pass up, else kept; kept-but-unqualified-seller-sponsor → company **without climbing**; passed-up climbs to first doubly-qualified; company if chain exhausts.
- `al_engine.py` (DB layer): `owned_level(user)` from **confirmed** PackPurchase rows; `watch_qualified(user)` (48h grace); `resolve_payee(db, buyer, pack)`; `commit_sale(db, purchase)`.
- `al_settlement.py`: `create_intent(db, buyer, pack)` → resolve + **lock payee** + snapshot payout + expiry; `submit_proof(db, intent, tx_hash, note)`; `confirm(db, intent, actor)` → activate pack + `commit_sale` (counter++ at THIS moment) + mark commission settled (bookkeeping only — money moved off-platform).
**Rule of rules: the HTTP layer CALLS these. It never re-implements routing in a handler.**

## 4. HTTP LAYER (the build)
All member endpoints: authenticated JSON POST/GET under `/api/al/`. Admin endpoints: tappable GET, dry-run default, `&apply=1` (Steve is mobile-first).
1. **`GET /api/al/packs`** — tiers + buyer's `owned_level` + open-intent state. One open intent per buyer (409 otherwise).
2. **`POST /api/al/packs/{pack_id}/intent`** — guards (active lifetime member, no open intent, pack active) → `create_intent` → response: `{intent_id, pack:{name,price,views}, payee:{username,display,is_company}, payout:{method,address}, expires_at, why:"resolution_note"}`. Buyer-facing copy MUST name the payee: *"Your $X goes directly to @Y — AdvantageLife never holds it."*
3. **`POST /api/al/intents/{id}/proof`** — buyer only, status `awaiting_payment` → `{tx_hash, note}`; tx_hash unique-checked; → `proof_submitted`; notify payee + admin.
4. **`POST /api/al/intents/{id}/confirm`** — **payee only** (or company-intents: admin) → `al_settlement.confirm`. Idempotent (second call returns current state, never double-increments). This is the moment: pack activates, counter++, `owned_level` rises.
5. **`POST /api/al/intents/{id}/decline`** — payee: "not received" → `disputed`, freezes, admin queue.
6. **`POST /api/al/intents/{id}/cancel`** — buyer, pre-proof only.
7. **`GET /api/al/my-purchases` / `GET /api/al/my-sales`** — buyer view (state machine progress) / payee view (action queue: confirm or decline, aging timer).
8. **Expiry sweeper** — background loop (register via the `_spawn_bg` strong-ref registry — the asyncio weak-ref trap already bit us once): `awaiting_payment` past `expires_at` → `expired`. Counter untouched.
9. **Admin**: `GET /admin/api/al/settlements?status=` (aging, disputes, company-routed); `GET /admin/api/al/resolve-dispute?intent_id=&outcome=confirm|cancel&apply=1`; on-chain assist — feed `proof_tx_hash` through the existing BSC scanner to auto-annotate "verified: {amount} USDT to {payee_address}" (assist, not gate).

## 5. THE SHARP EDGES (decided here so no handler improvises)
1. **Concurrent-intent positions**: counter increments at confirm, payee locks at intent → two open intents could both resolve as position N+1. **Decision: position = `confirmed_sales` + count of OPEN intents (awaiting/proof) for that (seller, pack), ordered by intent creation.** Deterministic, no post-payment re-routing. If an earlier open intent expires, a later one keeps its resolved position — approximate 3/6/9 under concurrency is the accepted trade-off of the payee-lock guarantee (the lock is legally/UX non-negotiable; the position drift is invisible and self-correcting).
2. **Payee lapses after intent**: qualification is checked ONCE, at resolution. The lock survives — money may already be moving; no clawbacks off-platform. Stated in `resolution_note`.
3. **Company payments**: `payee_is_company=true` → payout address = platform treasury (env/config); confirm authority = admin.
4. **Level gate = confirmed only.** An unconfirmed higher-pack intent grants nothing.
5. **$100 join**: normal platform checkout (Stripe product — Steve to create + keys; crypto via existing rails). No pass-up. On activation: set `sponsor_id`, derive `pass_up_sponsor_id` **once, permanently** (= the sponsor, unless the joiner IS a pass-up placement — chain derivation already computed for the 611 migrated members; new joins extend it).
6. **No wallet credits anywhere in this flow.** Settlement rows are bookkeeping of off-platform money. The manual-renewal tool's principle applies: the ledger records reality, it does not mint balance.

## 6. PAY-PAGE UI (MOCKUP-FIRST — hard rule, both pages need Steve-approved mockups before code)
- **Buyer flow**: pack picker (tier cards, owned-level badge) → intent page: payee card (avatar, @username, "your payment goes directly to them"), USDT-BSC address + QR + copy, amount, countdown to expiry, "I've paid — submit proof" (tx hash field) → pending state ("@Y confirms receipt — usually < 24h") → confirmed celebration (pack active, views scheduled, level badge updates).
- **Payee flow**: "Incoming sale" card (buyer, pack, amount, proof hash + on-chain annotation if scanner matched) → **Confirm received** / **I didn't receive this** → confirmed: counter state ("that was your 2nd Starter sale — your 3rd passes up").
- Copy rules: buyer sees WHO they pay and the never-held-by-platform line; the payee sees plain counter/pass-up state; full mechanics live on the comp page, not the checkout.
- Brand: AdvantageLife identity (navy `#0a1f52`/`#12388f`, red `#c8102e` CTA, Inter 900/800) — NOT SuperAdPro cobalt/cyan.

## 7. NOTIFICATIONS
intent created → payee ("incoming sale — watch for {amount} USDT") · proof submitted → payee + admin · confirmed → buyer (pack live) + seller-of-record (counter state) · 12h-before-expiry → buyer · dispute → admin.

## 8. VERIFICATION = SHIPPED (trace the money, not the compile)
Scripted end-to-end on the AL deploy against the real migrated tree, minimum cases:
(1) qualified seller, sale #1 → kept, payee=seller · (2) sale #3 → passes to first doubly-qualified upline · (3) kept sale, seller unqualified → company, NO climb · (4) pass-up with whole chain unqualified → company · (5) payee lapses watch between intent and confirm → lock holds · (6) missing payout address → skipped as payee · (7) expiry releases the one-open-intent slot, counter untouched · (8) confirm idempotency (double-tap) · (9) duplicate tx_hash rejected · (10) dispute freeze + admin resolve both outcomes · (11) buyer's owned_level rises only at confirm; level-or-higher gate honours it · (12) counters correct at 3/6/9 boundaries under two concurrent intents.
Then, and only then: phase 8 lockdown (bootstrap endpoints + `MIGRATION_SECRET`, `SKIP_MIGRATIONS=true`) before cutover.

## 9. BUILD ORDER
1. Push/recover the engine branch (§0) — everything else assumes it
2. Schema deltas from §2 (one-shot admin GET migration endpoints, per platform rule)
3. Payout-address capture UI + gate wiring (§2.4) — payees must be payable before intents exist
4. Endpoints §4.1–4.8 (call the engines) + expiry sweeper
5. Mockups (§6) → Steve approval → pay pages
6. $100 join checkout (blocked on Steve's Stripe product + keys)
7. Admin surface §4.9 + notifications §7
8. Verification battery §8 → lockdown → cutover
