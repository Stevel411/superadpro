# Stale SuperAdPro Page Removal — Register

_Opened 2026-08-21. Living document. Governed by `docs/ENGINEERING_STANDARDS.md`._

**Why this exists.** AL is the SuperAdPro codebase on a branch. Every SAP page came across live by default; a page stops being live only if someone deliberately removed, redirected, or brand-gated it. As of this audit: **155 client routes** in `App.jsx`, **194** `.jsx` files, **124** `IS_ADVANTAGELIFE` gates in an **83k-line** `main.py`. The job is to find surfaces that render the **retired** model (subscriptions, tiers, Profit Grid, Creative Studio/credits) and neutralise them — without breaking inbound links or live AL features.

## Methodology (every candidate gets all five checks — no shortcuts)

1. **What does it render?** — the exact `<Route>` element in `App.jsx` (real component vs `HardRedirect`/`Navigate`).
2. **Is it reachable?** — grepped for internal links in nav/sidebar/pages, and whether a backend `@app.get` shell exists (direct-URL reachable).
3. **Is the component shared?** — grep every reference; a component used by a live route is not removable.
4. **AL-model relevance** — does it belong to AL's locked model ($100 lifetime + P2P packs + 3/6/9), or the retired one?
5. **Inbound-link risk** — could old emails/bookmarks/shares hit this URL? If yes, **redirect, never delete.**

Status values: `KEEP` · `REDIRECT (recommended)` · `DECISION NEEDED (Steve)` · `DONE`.

---

## Finding 0 — the load-bearing redirect stubs (do NOT delete)

These suspect-looking routes are **already** `HardRedirect`/`Navigate` stubs pointing at live AL pages. They are **load-bearing** for old inbound links — deleting the route turns a graceful redirect into a 404. **KEEP them.** This corrects the naive "remove old routes" instinct.

| Route | Redirects to | Status |
|---|---|---|
| `/creative-studio` | `/tools` | KEEP (stub) |
| `/my-credits` | `/tools` | KEEP (stub) |
| `/credit-nexus` | `/tools` | KEEP (stub) |
| `/compensation` | `/plan` | KEEP (stub) |
| `/upgrade` | `/join` | KEEP (stub) |
| `/membership` | `/explore` | KEEP (stub) |
| `/brand-posters` | `/my-marketing` | KEEP (stub) |
| `/home-preview` | `/dashboard` | KEEP (stub) |
| `/video-library` | `/campaigns` | KEEP (stub) |
| `/campaign-videos` | `/campaigns` | KEEP (stub) |
| `/superdeck` | `/tools` | KEEP (stub) |
| `/vip` | `/register` | KEEP (stub) |
| `/affiliate` | `/social-share` | KEEP (stub) |

## Finding 1 — genuine survivors (still render retired-model content)

### `/studio` → `StudioShell` — **DONE** (`ac8fb67`, verified live 301→/tools)
Retired Creative Studio's surviving shell. Renders `StudioShell` behind a `RequireTier tier="basic"` gate, in **SuperAdPro cyan** (`#2ad4ee`) / DM Sans — SAP branding on a retired product.
- **Not linked** anywhere in nav/source. Only reachable by direct URL (backend shell exists at `main.py:61370`).
- `StudioShell` is referenced **only** by this route (lazy import + route line) — **not shared.** Safe to drop.
- Its siblings (`/creative-studio`, `/my-credits`, `/credit-nexus`) already redirect to `/tools`. This one was missed — exactly the "logged as removed but survived" pattern.
- **Recommendation:** convert to `HardRedirect to="/tools"`, drop the lazy import, drop the backend shell. Pattern-consistent, reversible, zero inbound-link loss.
- **Note:** the Creative Studio *backend* (SuperScene tables/routes) stays — it holds credit balances Steve is refunding. This is a **route/page** removal only.

### `/upgrade/checkout` → `UpgradeCheckout` — **DONE** (`ac8fb67`, verified live 301→/join→/register)
Retired subscription-upgrade checkout. AL has no subscription; SAP subs were all cancelled weeks ago (per the decommission).
- **Not linked** anywhere; direct-URL only (backend shell at `main.py:49795`).
- Carries a **deliberate** comment in `App.jsx:366`: _"/upgrade/checkout still routes to legacy UpgradeCheckout for any in-flight"_ — someone kept it on purpose for in-flight upgrades.
- Since SAP subs are cancelled and AL has no subscription, "in-flight upgrades" should now be **zero** — but this is a **money page**, so it's Steve's explicit go before I touch it.
- **Recommendation (pending Steve):** redirect to `/join` and drop the shell/import, same as `/studio`.

## Finding 2 — look suspect, are actually LIVE AL (do NOT remove)

- **`/proseller` → `ProSeller`** — active in-nav AI tool. Linked from `ToolsTabs`, `Sidebar`, `tools-shared`, `AIToolsHub`. **KEEP.** Open question (minor, non-blocking): it's gated `RequireTier tier="pro"` — AL has no "pro" subscription tier, so the gate semantics may be stale even though the tool is live. Flag for a gating-semantics review, not removal.
- **`/wisdom` → `Wisdom`** — active dashboard feature ("Daily Wisdom"), linked from `SideNav` and `NewDashboard`. **KEEP.** Still carries SAP palette markers → flag for **re-skin**, not removal.

---

## Not yet audited (next passes)

The July log noted "~31 member-facing React routes still carry SuperAdPro markers." This register has cleared the highest-suspicion cluster (Creative Studio / credits / subscriptions / grid). Remaining passes, each done to the 5-check methodology above:
- Full `IS_ADVANTAGELIFE`-gate inventory vs the 155 routes — which routes have **no** AL gate and no rebrand.
- Palette/token sweep — routes still rendering SAP cyan/Sora (like `/wisdom`) → re-skin queue, distinct from removal.
- Backend `@app.get` shells with no live React route → orphaned server pages.

## Decisions log
- _2026-08-21_ — Register opened. Redirect stubs confirmed load-bearing → keep. `proseller`/`wisdom` confirmed live → keep.
- _2026-08-21_ — Steve approved both survivors. Shipped `ac8fb67`: `/studio`→/tools and `/upgrade/checkout`→/join (backend AL-gate added on the latter; both React routes → HardRedirect; StudioShell + UpgradeCheckout chunks no longer shipped; components kept as dead code for SAP `main`). Verified live: `/studio`→301→/tools; `/upgrade/checkout`→301→/join→/register(200). Two of two Finding-1 survivors closed.
