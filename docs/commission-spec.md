# SuperAdPro Commission Specification

**Status:** Locked ground truth — AI assistants must read this before making any claims about commission rates, tier prices, or payout mechanics. Do not fabricate numbers. If a rule is not documented here or contradicts here, ask Steve.

**Last confirmed:** 24 April 2026 (session with Steve).

**Legend:**
- ✅ Confirmed by Steve in-session
- 🟡 Present in code but not explicitly confirmed by Steve this session — verify before using in customer-facing material
- ❌ Do not use (known wrong / rejected)

---

## 1. Membership (Stream 01) ✅

### Pricing

| Tier | Monthly | Annual | Annual savings |
|---|---|---|---|
| Basic | $20/mo | $200/yr | $40 (≈ 2 months free) |
| Pro | $35/mo | $350/yr | $70 (≈ 2 months free) |

### Commission — 50% of whatever the referral pays

| Referral plan | Sponsor earns |
|---|---|
| Basic monthly ($20) | $10/mo |
| Pro monthly ($35) | $17.50/mo |
| Basic annual ($200) | $100 upfront |
| Pro annual ($350) | $175 upfront |

### Tier cap rule ✅

**Sponsor commission is capped at the sponsor's own tier, for BOTH monthly and annual.** Excess retained by the company.

| Sponsor tier | Referral | Sponsor earns |
|---|---|---|
| Basic | Basic monthly | $10 |
| Basic | Pro monthly | **$10** (capped — excess $7.50 → company) |
| Basic | Basic annual | $100 |
| Basic | Pro annual | **$100** (capped — excess $75 → company) |
| Pro | any | full 50% |

**Customer-facing framing (per Steve):** do NOT mention that excess reverts to the company. Use softer language: *"Commissions paid at your own tier — upgrade to earn the higher rate."*

**Code reference:** `app/main.py` — `_activate_membership()` around line 4776. Change shipped 24 Apr 2026 to cap annual same as monthly.

---

## 2. Campaign Grid (Stream 02)

### Tier ladder 🟡

8 tiers (per `app/database.py` `CREDIT_PACKS` constant — note same ladder as Nexus):
$20 → $50 → $100 → $200 → $400 → $600 → $800 → $1,000

*Steve has not explicitly confirmed these prices this session. Verify before customer-facing use.*

### Per-entry payout at Tier N 🟡

| Component | Rate | Notes |
|---|---|---|
| Direct (to sponsor) | 40% | Once per entry |
| Uni-level (up the chain) | 6.25% × 8 levels = 50% total | One payout per level up to 8 |
| Platform | 5% | Company retention |
| Bonus pool | 5% | Accumulates toward completion bonus |

### Completion bonuses 🟡

Hardcoded in code: $64 / $160 / $320 / $640 / $1,280 / $1,920 / $2,560 / $3,200 (by tier position 1→8).

### Tier qualification rule 🟡

Found in `app/grid.py::_user_is_qualified` — must have an **active (or in-grace) campaign at the same tier or above** to earn commissions. Unqualified sponsor → 40% direct goes to company, does NOT walk up. Uni-level: each level checked independently.

**Steve called this out ("did you mention that you have to own the same tiers to receive the commissions"). Treat as intent-confirmed but verify exact wording before publishing.**

### Earning potential ❌

**Deck currently shows "$560 — $28,000+" — this is fabricated. Recalculate from real tier ladder + completion bonus schedule before publishing, and confirm with Steve.**

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
| Completion bonus | **10%** | When all 39 matrix positions (3 + 9 + 27) fill |

### Tier ownership requirement ✅

**NONE.** A member earns on every pack purchased in their matrix regardless of what they own themselves. This is a deliberate design choice by Steve — explicitly different from Grid and Courses.

### Matrix mechanics ✅

- 3×3×3 = 39 positions per pack-tier matrix
- Each of the 8 pack tiers runs its own independent matrix (8 simultaneous matrices possible per member)
- On fill: completion bonus pays, matrix resets, cycle repeats

### Important clarification ✅

The commission is **relationship-based, not level-based.** Earlier drafts of the deck said "L1 15% / L2 10% / L3 10%" — this is incorrect. Steve confirmed: 15% if direct, 10% if spillover, regardless of which level the buyer sits at in the matrix.

**Code reference:** `app/credit_matrix.py::pay_matrix_commissions` (relationship-based). Stale comment at `app/database.py` line 2310 describes it level-based — that comment is wrong, the implementation is right.

---

## 4. Course Academy (Stream 04) 🟡

### Status: UNCONFIRMED IN SESSION — needs full review with Steve

Steve has not confirmed the following details this session. The deck currently carries the original site-deck language ("upload your own course", "100% of first sale", "infinite pass-up cascade") — which may or may not match current code/intent.

### What code currently says 🟡

- **Tier prices:** $100 Starter / $300 Advanced / $500 Elite (per `app/course_engine.py`)
- **Sale structure:** 1+Up pass-up. Sales 1, 3, 5, 7, 9+ → 100% to seller. Sales 2, 4, 6, 8 → 100% pass up to the seller's sponsor.
- **Tier ownership required:** ✅ Steve confirmed this session — must own the course tier to receive commissions on that tier. Pass-up skips unqualified recipients; if no-one qualifies in the entire chain, commission goes to the company.
- **"Upload your own":** not currently supported in the engine (resell-only from marketplace library).

### What deck currently says

- "Create your own courses on any topic OR resell from marketplace"
- "Keep 100% of your first sale"
- "Infinite pass-up cascade"
- Worked example: $97 mid-tier course

### Open questions for Steve 🟡

1. Is "upload your own" a current feature or roadmap?
2. Is the odd/even 1+Up structure the intended design or a code implementation to be revised?
3. Are the tier prices ($100/$300/$500) correct, or is this wrong like the Grid tier prices were?
4. Confirm language around tier-ownership requirement for customer-facing use.

---

## 5. Other cross-cutting rules

### Commission retention wording ✅

Per Steve's request: **do not publicly mention that capped/unqualified commissions revert to the company.** Use member-facing language that emphasises upgrading or qualifying to earn more, not what happens to the excess.

### Tier qualification — general principle 🟡

Both Grid and Courses require tier ownership/qualification. Nexus does not. Member-facing material should make the distinction clear to avoid confusion.

---

## Guidance for future AI sessions

1. **Read this file before writing commission numbers anywhere.**
2. **If a number isn't in this file, don't guess.** Check code, flag uncertainty (🟡), and ask Steve.
3. **If code contradicts this file, this file wins** — raise the discrepancy with Steve rather than "fixing" code to match assumptions.
4. **When Steve confirms something, upgrade the flag from 🟡 to ✅ and update "Last confirmed" at the top.**
5. **If Steve rejects a previous understanding, mark it ❌ and note why** — don't silently delete wrong assumptions; future sessions need to see the history of corrections.
