# Consumable Campaign Packs — design spec (for approval before build)

**Status:** MAP ONLY. No code written. Awaiting Steve's sign-off on the open decisions in §5.
**Date:** 2026-07-18
**Trigger:** Steve spotted that owned/active packs on `/packs` can be re-bought endlessly, with no view-delivery or expiry.

---

## 1. The model Steve wants

A campaign pack is a **consumable**, not a durable rank:

1. A member buys a pack (e.g. $200 / 15k views).
2. The pack runs — real members watch the ad, delivering views toward the target.
3. When **views delivered ≥ the pack's view target**, the pack **expires** (its run is complete).
4. While a pack at that level is **active** (still delivering), the member **cannot re-buy that level**.
5. Once expired, it's the member's choice whether to **re-buy** for another run.
6. **Master/admin (Steve)** is exempt — always active at every level, so he can generate revenue as owner. (This already works: `owned_level` returns the admin sentinel.)

---

## 2. What exists today (traced, not assumed)

| Piece | State |
|---|---|
| `PackPurchase` (the "owned" record) | status is only `pending → active`. **Nothing ever sets it to completed/expired.** No view fields. |
| `owned_level` (earning qualification) | reads `max(PackPurchase.pack_level WHERE status='active')`. Admin returns sentinel `_ADMIN_LEVEL`. |
| `commit_sale` (settlement) | wires commission + pass-up + sale counter. **Does NOT create a campaign or start view tracking.** |
| `create_intent` (buy) | **No guard** — will create a new intent for a level you already actively own. This is the reported bug. |
| `video_campaigns` table | HAS the lifecycle fields (`views_target`, `views_delivered`, `is_completed`, `completed_at`, `grace_expires_at`) — but it's **SuperAdPro-era and NOT wired to AL `PackPurchase`.** |
| View delivery for AL packs | **Does not exist.** Buying an AL pack creates no viewable campaign; nothing accumulates views toward a target. `WatchQuota` is the *earner's* daily-watch gate, not the *buyer's* view delivery. |

**Bottom line:** the consumable model needs THREE things connected that currently aren't. The reported "re-buy" bug is the visible tip; the missing view-delivery + expiry pipeline is the iceberg.

---

## 3. The three pieces to build

### Piece A — Buy blocks while active (the reported bug)
Guard in `create_intent`: if the buyer has an `active` `PackPurchase` at this level, refuse with a clear message ("Your $200 campaign is still running — X of 15k views delivered. You can buy another once it completes."). Admin exempt.
**Small, safe, but MUST NOT ship alone** — without Piece C, a bought pack never leaves `active` and becomes permanently unbuyable.

### Piece B — A pack creates a delivering campaign
On activation, a `PackPurchase` must start a real, view-accumulating campaign with the pack's `views_target`. Options:
- **B1:** wire AL packs to the existing `video_campaigns` table (reuse its counting).
- **B2:** add view fields directly to `PackPurchase` (`views_target`, `views_delivered`, `completed_at`) and track on it.
Recommendation: **B2** — keeps the AL model self-contained on its own table, avoids dragging in SuperAdPro campaign machinery. But it needs the member to supply *what ad* is shown (a video/link), which raises a product question (see §5.3).

### Piece C — Completion flips active → expired
When `views_delivered ≥ views_target`, set the pack `status = 'expired'`, stamp `completed_at`. Two ways to trigger:
- **C1:** checked each time a view is recorded (cheap, immediate).
- **C2:** a periodic sweep job.
Recommendation: **C1** at the point views increment, with C2 as a safety net.

**The dependency chain:** A needs C (or packs jam active forever). C needs B (something must accumulate views). B needs a view-delivery mechanism for AL. So this is a real feature, not a one-line guard.

---

## 4. The load-bearing consequence: earning qualification

`owned_level` — the earn gate — reads `PackPurchase.status == 'active'`. So the moment a pack expires:

- **Member:** loses earning qualification at that level until they re-buy. This matches Watch-to-Earn doctrine (no live campaign = not delivering ads = not earning) and Steve's "it's up to the users if they wish to repurchase." **Assumed intended — confirm in §5.1.**
- **Admin/Steve:** unaffected — `owned_level` returns the sentinel regardless of any `PackPurchase` row. Always qualified. ✓ (already true, no work.)

Knock-on: a member mid-way up a pass-up chain who lets their pack expire would be *skipped* on new sales at that level (the two-gate rule) until they re-buy. That's consistent with the model but worth stating plainly to members in the UI.

---

## 4b. THE MODEL — CLARIFIED (Steve, 18 Jul)

**What gets watched (was §5.3): the buyer's own video ad.** The full participation loop:

To **buy a pack and receive funds**, a member must:
1. **Create a video advertisement** — the creative that enters the watch feed / showcase. It's what other members watch, and what accumulates the pack's views.
2. **Share the video showcase page** — an active-participation requirement.
3. **Watch a set number of videos per day** — the daily watch quota (bigger pack → more required; `campaign_packs.daily_watch_required`, currently null — the "9 numbers").

**It must be visibly clear the member is actively participating** — not passively earning. Both a compliance point (real product, real effort, real deliverable) and a UX one.

The loop end-to-end:
```
buy pack ($200 / 15k views)
  -> member creates a video ad   -- enters the watch feed/showcase
  -> other members watch daily    -- delivers views to the ad
  -> member also: watches N/day + shares showcase  -- stays participating/qualified
  -> ad reaches 15k views         -- pack EXPIRES (run complete)
  -> member chooses to re-buy     -- for another run
```

### What already EXISTS (traced) vs needs WIRING TO AL
| Capability | Exists? | AL-wired? |
|---|---|---|
| Video creation (Creative Studio) | yes | partial |
| Video library / watch feed (`/video-library`, `/watch`) | yes (SuperAdPro-era) | NO — tied to Campaign Tier / GridPosition, not AL packs |
| Member showcase page (`MemberShowcase`) | yes | NO — not the AL pack loop |
| Watch quota (`WatchQuota`) | yes, in AL `al_engine` | YES — the earner gate works |
| `campaign_packs.views_target` per pack | column exists | needs reading into the loop |
| `campaign_packs.daily_watch_required` | column exists | NO — **null; Steve owes the 9 numbers** |
| Pack -> campaign link + view accumulation | NO | NO — **the core missing wiring** |
| Pack expiry at view target | NO | NO — **missing** |
| Buy-block while active | NO | NO — **missing (the reported bug)** |

**Good news:** the *infrastructure* (video creation, feed, showcase, quota, both columns) largely exists. The work is **wiring it to the AL `PackPurchase` lifecycle** and adding the missing expiry/block pieces — not building a video platform from scratch.

## 4c. DECISIONS LOCKED (Steve, 18 Jul)

- **Existing active packs:** all SuperAdPro active packages will be **DELETED**. No grandfather, no backfill. Clean slate — the migration is a wipe of existing active `PackPurchase`/campaign rows, not a conversion. (Answers old §5.5.)
- **Grace period: 7 days** after a pack hits its view target before earning qualification drops at that level. (Answers old §5.2. Note: the code comment near `CAMPAIGN_VIEW_TARGETS` says 14 days — Steve's decision of 7 wins; will set accordingly.)
- **View targets:** use the existing `CAMPAIGN_VIEW_TARGETS` (already correct: 1000 / 2000 / 4000 / 8000 / 15000 / 30000 / 50000 / 80000 / 120000 for $10→$1,000). These map 1:1 to the AL packs. No change needed.
- **Daily-watch numbers — FINDING:** the "previous packages" did **not** have 9 distinct daily-watch numbers. The old system used a **flat 1 watch/day** (`watch_quotas.daily_required` defaults to 1, no per-tier ramp). The per-tier scaling that exists is the *view target* (delivery duration), not the daily watch. So "take them from the previous packages" yields **1/day across all tiers**. If a per-tier ramp is wanted (bigger pack → more daily watches), those numbers need to be set fresh — see §5.1. Defaulting to flat 1/day is valid and matches old behaviour.
- **Gift packs (NEW requirement):** before launch, Steve will award selected loyal members **multiple free packages** as a transition gift. Needs an **admin grant-pack tool** (see §5.4).

## 5. Remaining open items (need Steve before/at build)

**5.1 — Daily-watch ramp per pack?** Default from the old system is **flat 1 watch/day** for every tier. If you want bigger packs to require more daily watches (e.g. $10=1, $100=3, $1,000=9), give me the 9 numbers. Otherwise I build flat 1/day (valid, matches old behaviour). *The view target already scales per tier — that's the delivery-duration ramp.*

**5.2 — One active campaign per level, or one total?** Confirmed: block re-buy of an *active* level. Assumed a member can run different levels at once (a $200 AND a $400), just not two $200s. Confirm, or restrict to one active campaign total.

**5.3 — Gift packs: do they require the video ad + participation like bought packs?** A gifted $200 pack — does the member still have to create a video ad and hit the view target for it to run/expire, and do the daily watch to earn? (Assumed YES — a gift is still a real campaign; it just skips payment. The commission/pass-up does NOT fire on a gift, since no P2P sale happened.) Confirm.

**5.4 — The admin grant-pack tool (gift packs).** New build item. A mobile-tappable admin endpoint to grant free pack(s) to selected members before launch. Needs: which members, which pack level(s), how many. Assumed it creates the same active `PackPurchase` a purchase would, flagged `source='gift'` (no commission fired). Confirm the shape and I'll build it alongside the consumable loop.


## 6. Recommended build order (once decisions land)

1. Lock §5 decisions (esp. 5.3 — what gets watched).
2. **Piece B** — pack activation starts a tracked campaign with the view target (+ any creative-submission flow from 5.3).
3. **Piece C** — completion flips active → expired at the view target (+ grace from 5.2).
4. **Piece A** — the buy guard (now safe, because C can release the lock).
5. UI: `/packs` shows live campaign progress on an active pack (real bar, "X of Nk views"), disables its buy, and re-enables once expired. (The green bars in the screenshot are currently decorative — they'd become real.)
6. Migration for 5.5.
7. End-to-end test on a member account: buy → deliver views → expire → re-buy unlocks.

**Estimate:** this is a multi-commit feature, not a patch. Piece A alone is ~20 lines but is unsafe without B+C. The real weight is 5.3 (the ad/creative pipeline) and B.

---

## 7. What I recommend

The reported bug (endless re-buy) is real, but the clean fix is the **whole consumable loop**, and its size hinges on **5.3 — what members actually watch.** My recommendation:

- **Decide 5.3 first.** Everything else is downstream of it.
- If there's already a creative/video the member supplies per campaign, this is very buildable.
- If "what gets watched" is undefined, that's a product design task that comes before any code — and it's the real reason this can't be a quick guard.

I did **not** ship the one-line buy-block on its own, because without completion it would make every pack permanently unbuyable after first purchase — worse than the current bug.

---

## 8. Gift push — HELD (18 Jul 2026)

The one-push gift is built, tested, and dry-run verified:
- Endpoint: `/admin/api/gift-packs-to-lifetime?up_to_level=100&exclude=test64,test65&dry_run=0&secret=…`
- Dry run confirmed: **53 targeted members** (56 lifetime − admin AdvantageLife − test64/test65), 4 packs each ($10/$20/$50/$100), **212 gift packs**. Idempotent, no commission.

**DECISION: hold the actual push (dry_run=0) until the member-facing "create your ad" UI exists.** Steve's call — gifting 212 active "needs-an-ad" packs before members can act on them would leave them with packs and no call to action. Push at/after the ad-submission UI lands (Increment 3/4), ideally alongside the launch announcement.

Also confirmed this session: Steve's own account (id 1) holds **0 real PackPurchase rows** — it shows all levels OWNED via the `is_admin` sentinel in `owned_level`, not via real packs. This is correct/by-design; no action needed.

---

## 9. Weekly showcase share → package pause/resume (Steve, 18 Jul 2026)

The third participation leg. Steve rejected a withdrawal-gate (would impede P2P
and put people off) in favour of a POSITIVE mechanism tied to package activity.

**Mechanism (confirmed):**
- A weekly "Share showcase" button. Sharing records the share (uses existing
  `share_links.last_shared_at`).
- Share status is PER-MEMBER: share-qualified = shared within the last 7 days
  (ROLLING, not calendar week).
- share-qualified → the member's running packs stay ACTIVE.
- NOT share-qualified → the member's running packs PAUSE.
- **PAUSE = reversible, no loss.** A paused pack stops delivering views and the
  member stops being earn-qualified at that level, but views-delivered is
  preserved and it RESUMES exactly where it left off the moment they share.
  Never destroys/consumes the pack.
- While paused: no view delivery, so the completion clock naturally doesn't
  advance (fair — nothing lost).
- Completed/in-grace packs are NOT affected — only running ones pause.
- **NO grace for new packs:** a freshly bought/gifted pack follows the member's
  current share status immediately. Implication: for a brand-new member, sharing
  is part of INITIAL setup (create ad + share to get running) — it's not "a free
  first week". This ties into the setup wizard's "share your showcase" step,
  which becomes a real activation step, not just informational.

**Coherence:** this REPLACES the withdrawal-gate idea. Daily watch still does its
two jobs (earn qualification + view-delivery supply); the weekly share governs
package activity. Leaves the P2P payment flow completely untouched.

**Build note:** mostly wiring existing signals — `share_links.last_shared_at`,
the share button, and a `share_qualified(user, within=7d)` check folded into
whether a pack counts as running/earning. Pause is a status the pack toggles
between running and paused based on that check (evaluated lazily, like the
expiry sweep).

## 10. STILL OPEN — the buy-flow reorder (create ad before payment)

Raised but NOT yet confirmed (Steve pivoted to the weekly-share topic). The idea:
buyer must create their video ad BEFORE they're shown who/how to pay, so ad
creation gates the payment step. Campaign created 'pending', goes live only on
payment confirm. Return to this before building the buy-flow UI.
