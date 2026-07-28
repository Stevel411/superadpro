# AdvantageLife — Commission Specification

**Status:** Locked ground truth for AdvantageLife. AI assistants MUST read this before making any claim about commission rates, tier prices, or payout mechanics. Do not fabricate numbers. If a rule isn't here or contradicts here, ask Steve.

**Last confirmed:** 28 Jul 2026.

> ⚠️ **SUPERSEDES the old SuperAdPro commission spec.** SuperAdPro is being shut down. Its model — Basic/Pro monthly membership, 4×4/8-level Profit Grid, Credit Nexus matrix, Course Academy, $10/month recurring referral commissions, $15/month Founding Partner — is **RETIRED and does NOT apply to AdvantageLife.** If you see those concepts in any email, notification, AI reply, or deck, they are WRONG and must be removed. The prior version of this file described that retired model; it has been replaced.

**Ground truth in code:** `app/passup_engine.py` (pure decision core), `app/al_engine.py` (DB layer), `app/al_settlement.py` (P2P flow). If code contradicts this file, raise it with Steve — do not silently "fix" either.

---

## 1. Membership (join the platform) ✅

- **$100 one-time lifetime** OR **$50 / year annual.** Paid to the **platform** (Stripe card or crypto).
- Unlocks all tools for the membership term. Builds the referral + 3/6/9 pass-up tree.
- **The sponsor earns NOTHING on a join.** Membership is not a commissionable event.
- No monthly subscription. No Basic/Pro tiers. No $20/$35. No $15/month founding partner.

Env: `AL_JOIN_PRICE_USD` (default 100), `AL_ANNUAL_PRICE_USD` (default 50).

---

## 2. The product — Watch-to-Earn campaign packs ✅

Nine pack tiers (seeded in `campaign_packs`, single source of truth):

| Price | Name | Views target |
|---|---|---|
| $10 | Launchpad | 1,000 |
| $20 | Starter | 2,000 |
| $50 | Builder | 4,000 |
| $100 | Pro | 8,000 |
| $200 | Advanced | 15,000 |
| $400 | Premium | 30,000 |
| $600 | Elite | 50,000 |
| $800 | Master | 80,000 |
| $1,000 | Champion | 120,000 |

`price` = the 100% commission that passes to a member. `views_target` = ad views delivered before the pack expires.

---

## 3. How commission works — 100% P2P ✅

- **Pack sales are 100% member-to-member.** The price of the pack IS the commission. The **buyer pays the seller directly** (wallet to wallet).
- **The company never holds or disburses pack funds** and takes **no cut** of a pack sale. The platform only RESOLVES who to pay and records proof.
- There is NO company percentage, NO platform retention, NO uni-level split on pack sales.

**Marketing-claim rule (solicitor-approved):** "100% commission" is true and may be stated **only** scoped to the campaign packs. Never state a bare platform-wide "we share 100%" — membership keeps a company share, so the platform-level claim is false. "Passive income" must always be framed as the result of building a real team, never guaranteed or automatic.

---

## 4. The 3/6/9 infinite pass-up ✅

`PASSUP_POSITIONS = {3, 6, 9}` (`app/passup_engine.py`).

- A member **keeps** the commission on their sales **1, 2, 4, 5, 7, 8, 10, 11, …**
- A member **passes up** their **3rd, 6th, and 9th** sale to the first qualified member up their pass-up chain.
  - 3rd sale → pass-up Chain 1, 6th → Chain 2, 9th → Chain 3.
- After the 9th, all further sales are kept (direct).
- The pass-up **climbs infinitely** up the chain until it reaches the first *qualified* upline (this is the "infinite pass-up"). If no-one in the entire chain qualifies, the commission goes to the **company**.

---

## 5. The earning gates — ALL required to receive a commission ✅

From `al_engine` / `passup_engine.qualified(m, pack_level)`:

1. **Own a pack at that level OR HIGHER** — AND that pack must have a **submitted, running video ad** (`campaign_id` not null). A gifted/owned pack still in `needs_ad` state does NOT qualify.
2. **Watch-qualified** — completed the daily watch (WatchQuota; e.g. the $100 pack needs 2/day), with a 48h grace window.
3. **Receiving method saved** — somewhere to be paid.

"Own that level" means level-or-higher: owning $100 qualifies a member to earn on every sale $10–$100. A $200+ sale needs a $200+ pack.

**Routing:** direct sale + unqualified sponsor → company (no climb). Pass-up → climbs to first qualified upline (infinite; company only if the whole chain fails). Counter increments on **confirm**, not intent.

---

## 6. Watch-to-Earn (load-bearing) ✅

Members must complete their daily watch to stay qualified to earn. This is also the withdrawal gate and what makes the packs a legitimate advertising product (real people watch = real ad views delivered). `daily_watch_required` is set per pack tier.

---

## What does NOT exist on AdvantageLife (do not reference)

❌ Profit Grid / 4×4 / 8-level uni-level / 6.25% per level
❌ Credit Nexus / 3×3×3 matrix / spillover
❌ Course Academy / 1+Up course pass-up
❌ $10/month recurring referral commission
❌ Basic/Pro membership / $20 / $35 / monthly subscription
❌ $15/month Founding Partner / locked founding pricing
❌ Any company percentage on pack sales

---

## Guidance for future AI sessions

1. Read this file before writing any commission number or earning claim.
2. If a number isn't here, don't guess — check the engine code, flag uncertainty, ask Steve.
3. If code contradicts this file, raise it with Steve; don't silently change either.
4. The old SuperAdPro model is retired. If you find its concepts in member-facing content, that's a bug to fix, not a source to copy.
