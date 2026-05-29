# SuperAdPro Commission Specification

**Status:** Locked ground truth — AI assistants must read this before making any claims about commission rates, tier prices, or payout mechanics. Do not fabricate numbers. If a rule is not documented here or contradicts here, ask Steve.

**Last confirmed:** 25 May 2026 (Steve cut Profit Grid from 8×8/64 seats to 6×6/36 seats with bonus at position 36. Visual redesign: gold direct + cyan spillover + purple completion seat.)

**Legend:**
- ✅ Confirmed by Steve in-session
- 🟡 Present in code but not explicitly confirmed by Steve this session — verify before using in customer-facing material
- ❌ Do not use (known wrong / rejected / historical)

---

## 1. Membership (Stream 01) ✅

### Tier model (locked 15 May 2026, vocabulary purge 20 May 2026)

Three tiers exist. **There is no Basic. There is no Pro.** Those strings appeared in the dual-tier model that was retired and should not appear in any new code, documentation, or customer-facing copy.

| Tier | Price | Who | Notes |
|---|---|---|---|
| `free` | $0 | Signups who haven't paid yet | Limited access. Can use signup features only. |
| `partner` | $20/mo or $200/yr | Standard paying members | 50/50 sponsor/company commission split |
| `founding` | $15/mo locked for life | First 100 paying members | $10 flat to sponsor, $5 to company. Spot is permanent for the member. |

**Founding inventory:** 100 spots total, atomically claimed. Once all 100 are gone, only `partner` can be activated for any further signup. See app/main.py `_activate_membership` and `admin_api_activate_paid_membership` for the atomic spot-claim logic guarded by `pg_advisory_xact_lock(7423957)`.

### Commission — sponsor receives $10 flat per direct, every month

| Direct's plan | Sponsor earns | Company keeps |
|---|---|---|
| Partner monthly ($20) | $10/mo | $10/mo |
| Partner annual ($200) | $100 upfront, then standard $10/mo on renewal | $100 + $10/mo |
| Founding monthly ($15) | $10/mo | $5/mo |

**No tier cap. No per-direct-tier rate split.** Every active direct pays the sponsor the same $10/mo regardless of which tier the direct is on, and regardless of which tier the sponsor is on. The sponsor's own tier does not change what they earn — Founding and Partner sponsors receive identical $10/mo per active direct.

**On Founder renewal:** Every monthly renewal of a Founding member's $15/mo subscription pays the sponsor $10 and the company $5, in perpetuity, for as long as the Founder stays active. The renewal cron (`payment.process_auto_renewals`) reads `membership_price_locked` on the user record (`$15.00` for Founding members) to charge the correct amount and routes the commission accordingly.

**On Partner renewal:** Every monthly renewal of a Partner's $20/mo subscription pays the sponsor $10 and the company $10. No cap.

### Founder's downline economics ✅

A Founding member's direct referrals are standard Partners at $20/mo with the standard $10/$10 split. **Founders do not change commission economics for their own downline.** Being a Founder means the Founder personally pays $15/mo locked; it does not give them preferential commission rates on the people they refer, nor does it pass the locked $15 price to their referrals.

### Customer-facing framing ✅

Lead with "AI marketing tools for $20/month" — the toolkit is the headline. The compensation plan is optional and not the primary positioning. Per Steve's "tools first" messaging discipline, do not lead with earnings claims.

If discussing the commission directly, use language like *"You earn $10 per active referral, every month they stay active."* Do not invoke the company share unless asked. Do not invoke tier caps or per-tier rate differences — those concepts no longer exist.

### Code references

- Activation: `app/main.py::_activate_membership` and `app/main.py::admin_api_activate_paid_membership`
- Renewal: `app/payment.py::process_auto_renewals`
- Founding spot claim lock key: `7423957` (must match across all four activation paths)
- Tier purge migration: `app/database.py` "Legacy 'basic'/'pro' tier purge" block — runs idempotently at boot to normalise legacy rows

### Historical (do not use) ❌

The dual-tier Basic/Pro model existed until 15 May 2026 and was fully purged from code and vocabulary 20 May 2026. The following are NOT current and should never appear in customer-facing material:

- "Basic" / "Pro" tier names
- $35/mo Pro pricing or $350/yr Pro annual pricing
- $17.50/mo sponsor commission (was Pro-tier rate)
- "Cap rule" / "tier cap" language (sponsors earned their own-tier rate max, excess to company)
- "Upgrade to Pro" CTAs

If you encounter any of these in code, copy, templates, or AI prompts, flag for cleanup. The legacy `app/main.py.backup` snapshot still contains them; that file is historical and is not loaded by FastAPI.

---

## 2. Campaign Grid (Stream 02) ✅

**Last updated:** 25 May 2026 — Steve cut the grid from 8×8 (64 seats) to 6×6 (36 seats). Bonus pool stays at 10%. Total lifetime $/year unchanged because uni-level still pays at every level (relationship-based, decoupled from grid shape) — but cycles now complete ~1.78× more often, delivering bonuses in tighter loops. Visual redesign: gold direct tiles, cyan spillover tiles, purple completion seat at position 36.

**Previous update (21 May 2026):** Steve reallocated the 5% platform share to double the completion bonus from 5% to 10%. **100% of every Grid commission flows to affiliates. Zero dedicated company share.** Marketing line: *"100% of Profit Grid commissions go to affiliates. We don't take a cent."*

### Tier ladder ✅

8 tiers (per `app/database.py` `GRID_PACKAGES` + `GRID_TIER_NAMES` — same price ladder as Nexus, distinct from Nexus by tier names):

| Tier | Name | Price |
|---|---|---|
| 1 | Starter | $20 |
| 2 | Builder | $50 |
| 3 | Pro | $100 |
| 4 | Advanced | $200 |
| 5 | Premium | $400 |
| 6 | Elite | $600 |
| 7 | Master | $800 |
| 8 | Champion | $1,000 |

Tier names are live in production UI (visualiser, /grid/activate page, member dashboards). Confirmed against `app/database.py::GRID_TIER_NAMES` 25 May 2026.

### Grid shape ✅

- **6 wide × 6 deep = 36 positions** per grid (was 8×8 = 64 pre-25-May-2026).
- Position 36 is the **completion-bonus seat** — filling it triggers the 10% bonus payout and opens a new grid for the owner.
- Uni-level depth **stays at 8 levels** — the grid is now a visualisation of a slice of uni-level activity, not the full chain. When the active grid completes at seat 36, the next two levels of uni-level activity populate the newly-opened grid.

**Why the change:** completion cadence is the dopamine event in any matrix plan. Faster cycles = more "I just earned a bonus" moments per member per year, which drives retention. Lifetime $/year is unchanged — same money, tighter loops.

### Per-entry payout at Tier N ✅

| Component | Rate | Notes |
|---|---|---|
| Direct (to sponsor) | 40% | Once per entry |
| Uni-level (up the chain) | 6.25% × 8 levels = 50% total | One payout per level up to 8 — **unchanged**, still pays full chain regardless of grid shape |
| Bonus pool | 10% | Accumulates toward completion bonus, pays at seat 36 |
| Platform | 0% | Reallocated to bonus pool 21 May 2026 |

**Total: 100% to affiliates.**

**Income stream framing:** Campaign Tiers contribute 100% to affiliates. The company makes its money on Membership ($10 flat per activation), not Grid.

### Completion bonuses ✅

Per-tier total accrued at full grid (36 seats × tier_price × 10%):

| Tier | Price | Bonus per grid cycle |
|---|---|---|
| 1 Starter | $20 | **$72** |
| 2 Builder | $50 | **$180** |
| 3 Pro | $100 | **$360** |
| 4 Advanced | $200 | **$720** |
| 5 Premium | $400 | **$1,440** |
| 6 Elite | $600 | **$2,160** |
| 7 Master | $800 | **$2,880** |
| 8 Champion | $1,000 | **$3,600** |

Previous values (pre-25-May-2026, 64-grid at 10%): $128 / $320 / $640 / $1,280 / $2,560 / $3,840 / $5,120 / $6,400. Earlier still (pre-21-May-2026, 64-grid at 5%): $64 / $160 / $320 / $640 / $1,280 / $1,920 / $2,560 / $3,200.

### Per-cycle economics ✅

Total earned by the grid owner per completed cycle (uni-level + completion bonus, excludes the 40% direct on their personal referrals):

| Tier | Uni-level (6.25% × 36) | Completion Bonus | **Total per Grid** |
|---|---|---|---|
| 1 Starter | $45 | $72 | **$117** |
| 2 Builder | $112.50 | $180 | **$292.50** |
| 3 Pro | $225 | $360 | **$585** |
| 4 Advanced | $450 | $720 | **$1,170** |
| 5 Premium | $900 | $1,440 | **$2,340** |
| 6 Elite | $1,350 | $2,160 | **$3,510** |
| 7 Master | $1,800 | $2,880 | **$4,680** |
| 8 Champion | $2,250 | $3,600 | **$5,850** |

Per-cycle is 43.75% smaller than the old 64-grid, but cycles fire ~1.78× more often. Total bonus pool generated per dollar of tier sales is unchanged — payouts simply land in tighter loops.

### Tier qualification rule ✅

Found in `app/grid.py::_user_is_qualified` — must have an **active (or in-grace) campaign at the same tier or above** to earn commissions. Unqualified sponsor → 40% direct absorbed by platform as recipient of last resort. Uni-level: each level checked independently.

**Customer-facing note on "100% to affiliates" claim:** the dedicated platform-fee line is $0. When chains are short or uplines are unqualified, those slots are absorbed by the platform as the qualifying recipient of last resort — this is qualification-gate behaviour, not a separate revenue line. Honest answer if asked: *"All Grid commissions are paid out to qualifying affiliates. The rate to qualifying members is unchanged."*

### Migration record (25 May 2026)

On deploy day, all in-flight grids (regardless of `positions_filled`) re-targeted to `GRID_TOTAL = 36`. Steve verified personally that he and all known active campaigners were below 36 fills at deploy time, so the migration produced zero surprise auto-completions. Forward from this deploy, every grid created or in-flight follows the 36-seat model. Historical completion bonuses paid before this date stay at their original $128–$6,400 values; no retroactive recalculation.

### Visual identity ✅

- **Gold gradient** (#b45309 → #fbbf24 → #fde047) = direct referral tile
- **Cyan gradient** (#0891b2 → #06b6d4 → #22d3ee) = spillover tile
- **Royal purple gradient** (#4c1d95 → #7c3aed → #c4b5fd) with pulsing animation = completion seat (position 36) and bonus card accent
- **Cobalt header gradient** (`#172554 → #1e3a8a`) = standard platform card header, matches the rest of the member surface

### Earning potential ❌

**The deck must NOT show fabricated ranges like "$560 — $28,000+".** Any earnings figures must be recalculated from the real tier ladder + new completion bonus schedule (above) and confirmed with Steve before publishing.

---

## 3. Credit Nexus (Stream 03) ✅

### Pack prices ✅

8 independent credit packs, each with its own 3×3 matrix:
$20 → $50 → $100 → $200 → $400 → $600 → $800 → $1,000

### Commission structure ✅

| Type | Rate | Trigger |
|---|---|---|
| Direct affiliates | **15%** | Buyer was personally referred by the matrix owner |
| Spillover | **10%** | Buyer was placed in the matrix via someone else |

**Completion bonus: SCRAPPED 29 May 2026 (Steve).** Previously 10% of total matrix value (3.9 × pack price on a 39/39 fill). It stacked on top of the up-to-35% running commission (15% direct at L1 + 10% spillover at L2 + 10% at L3) and, with the 50% AI-cost budget, pushed total payout past 100% of pack revenue at full credit consumption — the company could go underwater on a fully populated, fully consumed pack. Running commissions stay; they fit inside the 50% non-AI half (~15% company margin worst case). Matrices still complete and cycle to a new advance, no bonus payout. Code: `app/credit_matrix.py::complete_matrix`.

**Income stream framing:** Credit Nexus is 85% to affiliates, 15% to the company. ⚠️ REVISIT — this framing predates the bonus removal and the full cost model; reconcile with Steve before using publicly (see 29 May 2026 margin analysis).

### Tier ownership requirement ✅

**NONE.** A member earns on every pack purchased in their matrix regardless of what they own themselves. This is a deliberate design choice by Steve — explicitly different from Grid and Courses.

### Matrix mechanics ✅

- 3×3×3 = 39 positions per pack-tier matrix
- Each of the 8 pack tiers runs its own independent matrix (8 simultaneous matrices possible per member)
- On fill: matrix resets and a new advance starts (completion bonus scrapped 29 May 2026 — no payout)

### Important clarification ✅

The commission is **relationship-based, not level-based.** Earlier drafts of the deck said "L1 15% / L2 10% / L3 10%" — this is incorrect. Steve confirmed: 15% if direct, 10% if spillover, regardless of which level the buyer sits at in the matrix.

**Code reference:** `app/credit_matrix.py::pay_matrix_commissions` (relationship-based).

---

## 4. Course Academy (Stream 04) 🟡

### Status: UNCONFIRMED IN SESSION — needs full review with Steve

### What code currently says 🟡

- **Tier prices:** $100 Starter / $300 Advanced / $500 Elite (per `app/course_engine.py`)
- **Sale structure:** 1+Up pass-up. Sales 1, 3, 5, 7, 9+ → 100% to seller. Sales 2, 4, 6, 8 → 100% pass up to the seller's sponsor.
- **Tier ownership required:** ✅ Steve confirmed previously — must own the course tier to receive commissions on that tier. Pass-up skips unqualified recipients; if no-one qualifies in the entire chain, commission goes to the company.
- **"Upload your own":** not currently supported in the engine (resell-only from marketplace library).

**Income stream framing:** Courses contribute 100% to affiliates (no company cut).

### Open questions for Steve 🟡

1. Is "upload your own" a current feature or roadmap?
2. Is the odd/even 1+Up structure the intended design or a code implementation to be revised?
3. Are the tier prices ($100/$300/$500) correct, or is this wrong like the Grid tier prices were?
4. Confirm language around tier-ownership requirement for customer-facing use.

---

## 5. Withdrawals (Stream 05) ✅

Every withdrawal pays the company $1 (admin fee). The rest goes to the member's BSC wallet.

---

## 6. Income streams summary (locked truth, 5 May 2026, reconfirmed 20 May 2026)

| Stream | Affiliate share | Company share | Primary revenue? |
|---|---|---|---|
| Membership (Partner) | 50% ($10/mo) | 50% ($10/mo) | ✅ Yes — primary recurring |
| Membership (Founding) | $10/mo flat | $5/mo flat | ✅ Yes — first 100 only |
| Campaign Tiers | 95% | 5% (admin only) | ❌ No |
| Credit Nexus | 85% | 15% | ✅ Yes |
| Courses | 100% | 0% | ❌ No |
| Withdrawals | — | $1/withdrawal | ❌ No (offset only) |

---

## 7. Other cross-cutting rules

### Commission retention wording ✅

Per Steve's request: **do not publicly mention that capped/unqualified commissions revert to the company.** Use member-facing language that emphasises qualifying to earn, not what happens to the excess.

Under flat-pricing this is mostly a Grid/Course concern (unqualified upline → company keeps the 40%/100% pass-up). It does NOT apply to membership commissions any more, because there is no cap and no per-tier rate split.

### Tier qualification — general principle 🟡

Grid and Courses require tier ownership/qualification. Nexus does not. Member-facing material should make the distinction clear to avoid confusion.

---

## Guidance for future AI sessions

1. **Read this file before writing commission numbers anywhere.**
2. **If a number isn't in this file, don't guess.** Check code, flag uncertainty (🟡), and ask Steve.
3. **If code contradicts this file, this file wins** — raise the discrepancy with Steve rather than "fixing" code to match assumptions.
4. **When Steve confirms something, upgrade the flag from 🟡 to ✅ and update "Last confirmed" at the top.**
5. **If Steve rejects a previous understanding, mark it ❌ and note why** — don't silently delete wrong assumptions; future sessions need to see the history of corrections.
6. **Never use Basic/Pro vocabulary.** It was fully retired 20 May 2026 across code, copy, and docs. If you find it anywhere, flag for cleanup.
