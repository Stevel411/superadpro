# AdvantageLife — Transition & Build Plan

**Strategy:** Option B — **fork-and-migrate.** Fork the SuperAdPro codebase (keeps every tool), deploy fresh on a new Railway project with a **fresh database** (sidesteps the breach entirely), new domain **AdvantageLife.club**. Migrate the members and referral genealogy across, derive the 3/6/9 pass-up tree, start sale counters fresh, then build the new model on top. The current SuperAdPro platform keeps running untouched until cutover — which *is* the rollback.

**Prime directive:** every money path is traced end-to-end and proven (simulation or test) before it ships. Gateway = truth. No path goes live on "the code compiles."

---

## 1. What carries / derives / resets

| Item | Treatment |
|---|---|
| **All tools** (SuperPages, autoresponder, LinkHub, Creative Studio, Lead Finder, Watch-to-Earn, Campaigns) | **Carry** — fork the code. Not rebuilt. |
| **Members** (accounts) | **Migrate** into fresh DB. |
| **Referral genealogy** (`sponsor_id`) | **Migrate 1:1** — everyone keeps their team. |
| **3/6/9 pass-up wiring** (`pass_up_sponsor_id`) | **Derive** — replay assignment across the tree in join order. |
| **Sale counters** (`pack_sale_count`) | **Reset to 0** — 3/6/9 applies going forward. |
| **Lifetime access (grandfather)** | **Stripe-verified 50 ∪ hand-picked allow-list** (see §3). |
| **Profit Grid, subscription billing, old commissions** | **Retired** — not migrated. |

---

## 2. New commercial model (the target)

- **$100 one-time lifetime join** → paid to the **platform** (Stripe/crypto). Unlocks all tools, builds referral + pass-up tree. Sponsor does **not** earn on the join.
- **Product = Watch-to-Earn campaign packs, $20 → $1,000** → **100% commission, member-to-member (P2P).**
- **3/6/9 infinite pass-up** at every level (same mechanic $20–$1,000; the pack price is the amount that flows).
- **Two-gate earning:** earner must **own that level-or-higher AND be watch-qualified.** Direct sale, sponsor unqualified → **company**. Pass-up → **climbs to first qualified upline** (company only if the whole chain fails).
- **No Profit Grid.**

---

## 3. Grandfather rule (locked)

```
access_level = lifetime  ⟺  (email ∈ Stripe active-subscriber list)  ∪  (user ∈ hand-picked allow-list)
everyone else            →  access_level = free  →  pays $100 to join
```
- **The 50** come from **Stripe live** (active subscriptions), matched **by email** → platform account. Gateway-verified — not the internal `member_composition` flags, which under/over-counted.
- **Allow-list** = specific usernames/emails Steve names. Applied regardless of payment status. Can be added right up to cutover.
- **Reconciliation step:** flag any Stripe email that doesn't match a platform account for manual review (different signup email, etc.).
- Lapsed / cancelled / free / comped → not gifted; they join at $100.

---

## 4. Schema (generalise the proven course engine's tables)

Reuse existing `User` fields: `sponsor_id`, `pass_up_sponsor_id`, `is_admin`, `balance`.
- **User:** add `access_level` (free / lifetime), `activated_at`; generalise `course_sale_count` → `pack_sale_count`.
- **CampaignPack** (from `Course`): id, level, name, price, is_active.
- **PackPurchase** (from `CoursePurchase`): user_id, pack_id, pack_level, amount, status, activated_at.
- **PackCommission** (from `CourseCommission`): purchase_id, buyer_id, earner_id, amount, pack_level, commission_type (direct / pass_up / company), pass_up_depth, source_chain, status, notes.
- **PayoutMethod:** user_id, type (crypto / paypal / bank / wise), details (JSON), is_default.
- **P2PIntent:** id, buyer_id, earner_id, pack_id, pack_level, amount, status (pending / proof_submitted / confirmed / disputed / expired), payee_snapshot (JSON), tx_ref, proof_url, timestamps, confirmed_by, commission_type, pass_up_depth, source_chain.

Migrations via one-shot admin GET endpoints (respect `SKIP_MIGRATIONS` on Railway — address that flag first if set).

---

## 5. Ordered build sequence

**Phase 0 — Foundation & fork**
Fork repo → AdvantageLife. Fresh Railway project + fresh Postgres. New domain + Cloudflare. Config layer (`BRAND_NAME`, `BASE_URL`, `--brand-accent`) + Freedom (red/white/blue) theme tokens. Disable/retire grid + subscription-billing surfaces behind flags.

**Phase 1 — Schema**
Add the models in §4. Ship migrations; verify tables exist in the fresh DB.

**Phase 2 — Data migration**
Export members + `sponsor_id` from old DB → import to fresh DB (1:1 genealogy). Derive `pass_up_sponsor_id` by replaying assignment in join order. Counters = 0. Apply grandfather flags (Stripe-50 ∪ allow-list). *Verify:* genealogy integrity (no orphans/cycles), pass-up-tree spot-checks on real legs, grandfather count = 50 + allow-list.

**Phase 3 — Engine wiring**
Bring `passup_engine` (branch `advantagelife-passup`, already proven) into the app; wire `resolve_payee` / `commit_sale` to the §4 models and to `is_watch_qualified()`. Re-run the simulation against a few **real migrated legs** before moving on.

**Phase 4 — $100 join checkout (platform-collected)**
Stripe + crypto one-time $100. On success: `access_level = lifetime`, unlock tools, assign sponsor + pass-up wiring, stamp `activated_at`. Prove the full join flow live.

**Phase 5 — P2P pack purchase + settlement**
Pay page `/pay/[intent]` → payee resolution (from engine) → proof upload (R2/S3) → earner back office → confirm/activate. **Crypto on-chain auto-verify** (removes the stranger-activation bottleneck). Watch-gate enforced. Admin oversight + dispute tools + full audit log. Prove each money path.

**Phase 6 — Watch-to-Earn improvements**
*(Open — Steve to specify what to improve. Build to spec once defined.)*

**Phase 7 — Re-skin finish & surfaces**
Freedom landing, `/plan` page (with animated explainer), dashboard, nav — all live in theme. Retire grid/subscription UI.

**Phase 8 — Pre-launch verification**
End-to-end money-path tests: join → pack buy (P2P) → pass-up routing → activation → watch-gate → payout-method display. Bundle-hash checks post-deploy. Compliance copy + disclaimers in place. **Pass-up structure: solicitor glance** before members transact (flagged once; Steve's call, doesn't block build).

**Phase 9 — Cutover / go-live**
Point DNS. Send the member announcement (§7). Sunset/redirect the old platform.

---

## 6. Rollback

Because the new platform is a **separate deploy on a fresh DB**, the old platform is never at risk — the ultimate rollback is simply *don't cut DNS / keep SuperAdPro running.* Per-phase: DB steps are re-runnable against the fresh DB (no destructive ops on live data); each phase ships behind verification so a failure halts before the next phase rather than corrupting a live money path.

---

## 7. Member communication

Lead with the gift, not the change: *"AdvantageLife is here — and as a thank-you for being with us, your access is now yours for life, free."* Goes to the grandfathered set at cutover. (Draft to be written alongside — offered.)

---

## 8. Open items still needed from Steve

1. **Hand-picked allow-list** — usernames/emails for the discretionary lifetime gifts (can come right up to cutover).
2. **Watch-to-Earn improvements** — *what* to improve (Phase 6 is a placeholder until specified).
3. **Repo/domain** — confirm new repo name + that AdvantageLife.club DNS is ready to point when we reach Phase 9.
4. **Micro-confirms already defaulted** (from the pass-up spec): counter ticks on confirm; "own that level" = level-or-higher. Both assumed yes.

---

## 9. Status of pieces already built
- **Pass-up engine** — written & proven, branch `advantagelife-passup`. ✅
- **Mockups** — Freedom landing, `/plan` page (animated), dashboard, all approved. ✅
- **P2P + pass-up spec** — written. ✅
- **Grandfather rule** — locked (§3). ✅
- **Config-layer scope** — scoped (~1,900 name strings, 614 accent hardcodes). ✅

**Next action on approval:** begin Phase 0.
