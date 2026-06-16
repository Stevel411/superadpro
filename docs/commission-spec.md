# SuperAdPro Commission Specification

**Status:** Locked ground truth — AI assistants must read this before making any claims about commission rates, tier prices, or payout mechanics. Do not fabricate numbers. If a rule is not documented here or contradicts here, ask Steve.

**Last confirmed:** 14 Jun 2026 (Steve: the legacy 6×6 36-seat grids have all completed and cycled out — **the only live grid model is the new 4×4 16-seat grid** @ 30% direct / 50% uni-level / 20% bonus / 0% platform = 100% to affiliates. Grid section rebuilt to this. Verified against `app/database.py` constants + `app/grid.py`. Membership and Creator-Credits sections were already current.)

**Prior confirmation:** 30 May 2026 (Creator Credits confirmed live as flat 20% direct, matrix retired — verified against credit_matrix.py FLAT_REFERRAL_RATE.)

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

**Last updated:** 14 Jun 2026 — **the legacy 6×6 36-seat grids have all completed and cycled out. The ONLY live grid model is the new 4×4 16-seat grid.** Going forward, only the 16-seat setup matters.

Changes that led here:
- **8 Jun 2026:** direct commission cut **40% → 30%**; the freed 10% moved into the completion-bonus pool (**10% → 20%**). Company share stays 0%.
- **12 Jun 2026:** new **4×4 = 16-seat** grid geometry went live (`NEW_GRID_SEATS=16`). The old 36-seat grids were grandfathered to finish on their original rules; **they have since all cycled out.** `database.py::bonus_pct_for` still exists as a per-grid safety guard, but with no 36-seat grids remaining it always returns the 20% rate in practice.
- **16 Jun 2026:** documented the **$10 Launchpad (grid tier 0)** — the paid on-ramp that switches on the comp plan for free users (see *Launchpad — Grid Tier 0* below). $3 direct / $32 tier-0 completion bonus, derived from the standard split at the $10 tier-0 price.

**Current live split: 30% direct / 50% uni-level (6.25%×8) / 20% completion bonus / 0% platform = 100% to affiliates.**

**Earlier (25 May 2026):** grid cut from 8×8 (64) to 6×6 (36). **Earlier (21 May 2026):** the 5% platform share was reallocated into the completion bonus. **100% of every Grid commission flows to affiliates. Zero company share.** Marketing line: *"100% of Profit Grid commissions go to affiliates. We don't take a cent."* — accurate, since all live grids are 16-seat.

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

### Launchpad — Grid Tier 0 ✅

**Added 16 Jun 2026.** The Launchpad is a one-time **$10** entry that sits *below* Starter as **grid tier 0** (`GRID_PACKAGES[0] = 10.0`, `GRID_TIER_NAMES[0] = "Launchpad"`). It is the paid on-ramp for free users: a single $10 buy-in switches on the comp plan without granting full membership.

**Access ladder:** Free → **$10 Launchpad** → Full Member.

| State | `can_earn()` | `is_active` | `is_pro()` | Gets |
|---|---|---|---|---|
| Free signup | ❌ | ❌ | ❌ | Browse only |
| **$10 Launchpad** | ✅ | ❌ | ❌ | Refer, build a team, earn, withdraw, tier-0 grid |
| Full member ($20 Partner / $15 Founding) | ✅ | ✅ | ✅ | Above + tools + grid tiers 1–8 |

Launchpad flips `can_earn()` true while leaving `is_active` / `is_pro()` false, so the tools (SuperPages, Creative Studio, Lead Finder) and grid tiers 1–8 stay locked until the member upgrades to full membership.

**Commission — standard grid split applied at tier 0 (price $10).** Launchpad purchases run through `process_tier_purchase(package_tier=0)`, the same engine as tiers 1–8:

| Component | Rate | On a $10 Launchpad |
|---|---|---|
| Direct (to sponsor) | 30% | **$3** per Launchpad referral |
| Uni-level (× 8) | 6.25% × 8 | $0.625 / level |
| Completion bonus | 20% | tier-0 grid = `16 × $10 × 0.20` = **$32** |
| Platform | 0% | — |

The **$3** and **$32** figures are exact for the $10 tier-0 price under the live 30% / 20% split (consistent with *Per-entry payout* and *Completion bonuses* below).

**Customer-facing framing:** *"Start earning for just $10 — the Launchpad turns on the comp plan (refer, earn, withdraw) plus a tier-0 grid. Tools and tiers 1–8 unlock at full membership."* Live on the marketing deck and the `/compensation-plan` page (16 Jun 2026).

**Code references:**
- `app/database.py` — `GRID_PACKAGES[0] = 10.0`, `GRID_TIER_NAMES[0] = "Launchpad"`
- `app/main.py` — `can_earn()` (Launchpad earns; ~line 1195), Stripe checkout (~21055), tier-0 activation (~21672)
- `app/grid.py::process_tier_purchase(package_tier=0)` — standard 30 / 6.25×8 / 20 / 0 split

### Grid shape ✅

**Live model — the only one that matters going forward:**

| Model | Shape | Seats | Completion seat | Bonus pool |
|---|---|---|---|---|
| **16-seat (live)** | 4×4 | **16** | seat 16 | **20%** |

- Each grid is stamped with its seat count at creation (`Grid.total_seats`); `database.py::bonus_pct_for(total_seats)` returns 20% for 16-seat grids. The seat-aware design is retained as a safety guard, but no other seat counts are live.
- Filling seat 16 triggers the completion-bonus payout and opens a new grid for the owner.
- Uni-level depth **stays at 8 levels** — the grid visualises a slice of uni-level activity, not the full chain. Uni-level math (`PER_LEVEL_PCT × 8 = 50%`) is unchanged.

**Historical (retired, do not use for live figures):** 6×6 36-seat grids @ 10% bonus (12 Jun cut-off, now all cycled out); 8×8 64-seat grids (pre-25-May).

### Per-entry payout at Tier N ✅

| Component | Rate | Notes |
|---|---|---|
| Direct (to sponsor) | **30%** | Once per entry. Cut from 40% on 8 Jun 2026; `DIRECT_PCT = 0.30`. |
| Uni-level (up the chain) | 6.25% × 8 levels = 50% total | One payout per level up to 8 — **unchanged**, still pays full chain regardless of grid shape. `PER_LEVEL_PCT = 0.0625`. |
| Bonus pool | **20%** | `BONUS_POOL_PCT = 0.20`. Accumulates toward the completion bonus, pays at seat 16. (`bonus_pct_for` returns 20% for the live 16-seat grids.) |
| Platform | 0% | Reallocated to bonus pool 21 May 2026; `PLATFORM_PCT = 0.00`. |

**Total: 100% to affiliates.** All live grids are 16-seat: 30% direct + 50% uni-level + 20% completion bonus + 0% platform = 100%. `DIRECT_PCT`, `PER_LEVEL_PCT`, and `PLATFORM_PCT` are global; the bonus pool is seat-aware but only the 16-seat (20%) path is live now that the 36-seat grids have cycled out. The public *"100% of Profit Grid commissions go to affiliates"* claim is exact.

**Income stream framing:** Campaign Tiers contribute 100% to affiliates. The company makes its money on Membership ($10 flat per activation), not Grid.

### Completion bonuses ✅

Completion bonus = `seats × tier_price × bonus_rate` (exact — this is how `bonus_pct_for` + the payout work).

**Live — 4×4 16-seat grids @ 20%** (completion bonus = `16 × tier_price × 0.20`):

| Tier | Price | Bonus per grid cycle |
|---|---|---|
| 1 Starter | $20 | **$64** |
| 2 Builder | $50 | **$160** |
| 3 Pro | $100 | **$320** |
| 4 Advanced | $200 | **$640** |
| 5 Premium | $400 | **$1,280** |
| 6 Elite | $600 | **$1,920** |
| 7 Master | $800 | **$2,560** |
| 8 Champion | $1,000 | **$3,200** |

**Historical only (retired — all cycled out, do NOT use for live figures):**
- 6×6 36-seat @ 10% (12 Jun cut-off): $72 / $180 / $360 / $720 / $1,440 / $2,160 / $2,880 / $3,600.
- 6×6 36-seat @ pre-8-Jun rates and 8×8 64-seat (pre-25-May @ 10%): $128 / $320 / $640 / $1,280 / $2,560 / $3,840 / $5,120 / $6,400.

### Per-cycle economics 🟡

Illustrative owner earnings per completed cycle for the **new 16-seat model**, using the doc's per-seat uni-level approximation (uni-level = `seats × tier_price × 6.25%`; for 16 seats that equals one tier price exactly). Realised uni-level depends on the member's actual downline depth, so treat the uni-level column as a model estimate, not a guarantee — confirm with Steve before any customer-facing use.

| Tier | Uni-level (6.25% × 16) | Completion Bonus (20%) | **Total per Grid** |
|---|---|---|---|
| 1 Starter | $20 | $64 | **$84** |
| 2 Builder | $50 | $160 | **$210** |
| 3 Pro | $100 | $320 | **$420** |
| 4 Advanced | $200 | $640 | **$840** |
| 5 Premium | $400 | $1,280 | **$1,680** |
| 6 Elite | $600 | $1,920 | **$2,520** |
| 7 Master | $800 | $2,560 | **$3,360** |
| 8 Champion | $1,000 | $3,200 | **$4,200** |

Smaller per cycle than the 36-seat model, but cycles complete faster. Total bonus generated per dollar of tier sales is governed by the pool rate, not the grid size.

### Tier qualification rule ✅

Found in `app/grid.py::_user_is_qualified` — must have an **active (or in-grace) campaign at the same tier or above** to earn commissions. Unqualified sponsor → 30% direct absorbed by platform as recipient of last resort. Uni-level: each level checked independently.

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

## 3. Creator Credits (Stream 03) ✅

**Renamed from "Credit Nexus" and re-architected to a flat rate. The 3×3 matrix is RETIRED.** Live as of 30 May 2026, confirmed against code (`app/credit_matrix.py` line ~285–290, `FLAT_REFERRAL_RATE`). See history note below.

### Pack prices ✅

8 credit packs (unchanged):
$20 → $50 → $100 → $200 → $400 → $600 → $800 → $1,000

### Commission structure ✅ (LIVE)

| Type | Rate | Trigger |
|---|---|---|
| Flat referral | **20%** | Paid to the buyer's DIRECT sponsor on every credit-pack purchase — first one and every repurchase |

- **No matrix, no levels, no spillover, no completion bonus.** One flat 20% to the direct sponsor only.
- Sponsor is always set: a real member, or the company account (user id 1) for no-referrer signups, in which case the 20% accrues to the company.
- **Code reference:** `app/credit_matrix.py` — `FLAT_REFERRAL_RATE = Decimal("0.20")`, paid in the credit-pack purchase flow (around line 548). This is the ONLY live commission path for credit packs.

### Tier ownership requirement ✅

**NONE.** A member earns 20% on every credit pack their direct referrals buy, regardless of what they own themselves. Deliberate design choice by Steve — explicitly different from Grid and Courses.

### ⚠️ DEAD CODE WARNING (for future sessions)

`app/credit_matrix.py` STILL CONTAINS the retired matrix functions and constants:
`pay_matrix_commissions`, `place_in_matrix`, `complete_matrix`, `DIRECT_RATE = 0.15`,
`SPILLOVER_RATE = 0.10`, `COMPLETION_BONUS_RATE`, the 39-position (3×3×3) logic.
**These are NOT called from any live flow.** Do not read these constants and conclude
the live rate is 15%/10% — it is not, it is a flat 20%. (This exact mistake was made
30 May 2026.) These should be deleted; until then, treat them as dead.

### History (do not delete — per spec rule 5) ❌→✅

- **❌ OLD (pre-30 May 2026): "Credit Nexus" 3×3 matrix.** 39 positions per pack-tier matrix, 8 independent matrices per member, relationship-based rates 15% direct / 10% spillover, plus a 10%-of-matrix-value completion bonus on a 39/39 fill.
- **❌ Completion bonus scrapped 29 May 2026** (margin: bonus + up-to-35% running commission + 50% AI-cost budget could push payout past 100% of pack revenue).
- **✅ Matrix fully retired ~29–30 May 2026, replaced with flat 20% direct (above).** The "85% affiliates / 15% company" framing from the matrix era is obsolete — under flat 20%, the affiliate share is 20% of pack price to the direct sponsor.

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
| Campaign Tiers | 100% | 0% (platform share reallocated to bonus pool) | ❌ No |
| Creator Credits | flat 20% to direct sponsor | 80% (or 100% if no referrer) | ✅ Yes (no tier needed) |
| Courses | 100% | 0% | ❌ No |
| Withdrawals | — | $1/withdrawal | ❌ No (offset only) |

---

## 7. Other cross-cutting rules

### Commission retention wording ✅

Per Steve's request: **do not publicly mention that capped/unqualified commissions revert to the company.** Use member-facing language that emphasises qualifying to earn, not what happens to the excess.

Under flat-pricing this is mostly a Grid/Course concern (unqualified upline → company keeps the 30%/100% pass-up). It does NOT apply to membership commissions any more, because there is no cap and no per-tier rate split.

### Tier qualification — general principle 🟡

Grid and Courses require tier ownership/qualification. Creator Credits does not. Member-facing material should make the distinction clear to avoid confusion.

---

## Guidance for future AI sessions

1. **Read this file before writing commission numbers anywhere.**
2. **If a number isn't in this file, don't guess.** Check code, flag uncertainty (🟡), and ask Steve.
3. **If code contradicts this file, this file wins** — raise the discrepancy with Steve rather than "fixing" code to match assumptions.
4. **When Steve confirms something, upgrade the flag from 🟡 to ✅ and update "Last confirmed" at the top.**
5. **If Steve rejects a previous understanding, mark it ❌ and note why** — don't silently delete wrong assumptions; future sessions need to see the history of corrections.
6. **Never use Basic/Pro vocabulary.** It was fully retired 20 May 2026 across code, copy, and docs. If you find it anywhere, flag for cleanup.
