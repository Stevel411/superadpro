# Stale SuperAdPro Page Removal — Register

_Opened 2026-08-21. Living document. Governed by `docs/ENGINEERING_STANDARDS.md`._

**Why this exists.** AL is the SuperAdPro codebase on a branch. Every SAP page came across live by default; a page stops being live only if someone deliberately removed, redirected, or brand-gated it. As of this audit: **155 client routes** in `App.jsx`, **194** `.jsx` files, **124** `IS_ADVANTAGELIFE` gates in an **83k-line** `main.py`. The job is to find surfaces that render the **retired** model (subscriptions, tiers, Profit Grid, Creative Studio/credits) and neutralise them — without breaking inbound links or live AL features.

## Methodology (every candidate gets all five checks — no shortcuts)

1. **What does it render?** — the exact `<Route>` element in `App.jsx` (real component vs `HardRedirect`/`Navigate`).
2. **Is it reachable?** — grepped for internal links in nav/sidebar/pages, and whether a backend `@app.get` shell exists (direct-URL reachable).
3. **Is the component shared?** — grep every reference; a component used by a live route is not removable.
4. **AL-model relevance** — does it belong to AL's locked model ($100 lifetime + P2P packs + 6/9/11-pass-up), or the retired one?
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

## Pass 2 — full route inventory (2026-08-21)

Audited all **156 routes** against live code (script: route→component→palette→nav→retired-content). Result buckets:

### A. Redirect stubs — **51 routes** → KEEP
Already `HardRedirect`/`Navigate` to live AL pages. Load-bearing for inbound links.

### B. Retired-model orphans — **DELETED** (`743995c`, verified live)
Verified with context (12 raw grep hits → 7 false positives). The genuine ones were then **traced for live reachability** — none were in the live `SideNav`; every inbound link came from dead/unrouted pages (`Dashboard.jsx` imported-but-never-routed, `TeamPage`/`BucketList`, and `BusinessHubTabs` which only renders on the `AppLayout` "🚧 migrating" stub, never a live route). So none were reachable by a member navigating AL. Steve's call: delete outright rather than leave landmines for future sessions.

| Route | Was | Now |
|---|---|---|
| `/onboarding` | "$10/month recurring" false income claim | route + import + shell + `OnboardingWizard.jsx` deleted → 404 |
| `/analytics` | retired income labels (Direct 30%/Grid/Membership/Nexus) | deleted (+ dead 2nd `Analytics` alias) → 404 |
| `/command-centre` (+4 sub-routes) | Creator Credits tile + nexus-team | routes + `CommandCentre.jsx`/`BucketList.jsx` deleted → 404 |
| `/payment-success` | superscene + credit-pack copy | `PaymentSuccess.jsx` deleted; backend → `IS_ADVANTAGELIFE` 302→/dashboard (former payment URL, money-safe, not a 404) |
| `/marketing-materials` | retired 3-stream deck | already 302→/my-marketing (no action) |

**Follow-up:** the `api_command_centre_*` endpoints (`_directs`, `_grid_team`, `_nexus_team`, `_nudge_lapsed`) are now uncalled — queued for a later API-cleanup pass (left in place to keep the deletion commit focused). Related orphans `TeamPage`(`/team`) and `BusinessHubTabs`/`AppLayout` stubs also surfaced — candidates for the next pass.

### C. True palette re-skin — **7 pages** (raw SAP hex, renders regardless of token remap) → RE-SKIN
`--sap-accent`/`--sap-cyan` **tokens are remapped to AL red** on AL (`design-tokens.css:168`), so token-using pages already render AL colours — the July log's "~31 markers" was inflated by those. Only these use raw hex: `payment-success` (4), `command-centre` (2), `my-site` (2), `custom-domain` (2), `explore` (1), `admin/collaborations` (1), `help/sending-domain` (1). Surgical — a badge/gradient each, not whole SAP pages.

### D. Stale gating semantics — non-urgent
`RequireTier tier="pro"/"basic"` gates persist (ProSeller, `/pro/*`, labs) — AL has no pro/basic subscription tiers. The tools are live; the gate *concept* is retired-model. Cleanup, not removal.

---

## Not yet audited (next passes)

The July log noted "~31 member-facing React routes still carry SuperAdPro markers." This register has cleared the highest-suspicion cluster (Creative Studio / credits / subscriptions / grid). Remaining passes, each done to the 5-check methodology above:
- Full `IS_ADVANTAGELIFE`-gate inventory vs the 155 routes — which routes have **no** AL gate and no rebrand.
- Palette/token sweep — routes still rendering SAP cyan/Sora (like `/wisdom`) → re-skin queue, distinct from removal.
- Backend `@app.get` shells with no live React route → orphaned server pages.

## Decisions log
- _2026-08-21_ — Register opened. Redirect stubs confirmed load-bearing → keep. `proseller`/`wisdom` confirmed live → keep.
- _2026-08-21_ — Steve approved both survivors. Shipped `ac8fb67`: `/studio`→/tools and `/upgrade/checkout`→/join (backend AL-gate added on the latter; both React routes → HardRedirect; StudioShell + UpgradeCheckout chunks no longer shipped; components kept as dead code for SAP `main`). Verified live: `/studio`→301→/tools; `/upgrade/checkout`→301→/join→/register(200). Two of two Finding-1 survivors closed.

- _2026-08-21_ — Deleted 4 orphaned retired-model pages (`743995c`): /onboarding, /analytics, /command-centre(+4 sub-routes) removed outright (→404); /payment-success content deleted, backend →302 /dashboard (money-safe). Verified live: deleted routes 404, payment-success redirects, /dashboard //my-team //campaign-analytics //packs all 200. Reachability was fully traced first — all four were orphans (no live SideNav path). Now-uncalled `api_command_centre_*` endpoints + TeamPage/BusinessHubTabs orphans queued for next pass.

## Pass 3 — orphan sweep (2026-08-21)

Cleared the follow-ups from Pass 2. All verified live.

**Frontend (`0dfbcea`):**
- `/team` + `TeamPage.jsx` — orphan (not in SideNav, no importers, no live links). Route + import + backend shell + component deleted → 404.
- `PlaceholderPage` (App.jsx "🚧 migrating" stub) — defined but never rendered. Deleted; its `AppLayout` import removed from App.jsx.
- `BusinessHubTabs.jsx` — never rendered (family routes `/command-centre`+`/analytics` deleted; `/my-team` isn't `AppLayout`-wrapped). Removed from `AppLayout` (import + inert render + 5 always-true `!isBusinessHubFamilyRoute` guards = provably-safe no-op) + file deleted.
- **`AppLayout` KEPT** — it is core, used by ~65 live pages. The Pass-2 note calling it "stub infra" was wrong (grepped App.jsx only); corrected here.

**Backend (`466fd4d`):**
- 4 dead `command_centre` API endpoints (`/directs`, `/grid-team`, `/nexus-team`, `/nudge-lapsed`, 193 lines, zero callers) + the now-uncalled `_direct_member_payload` helper (18 lines) + a stale comment. compileall clean, no behaviour change.

**Verified live:** `/team`→404, `/api/command-centre/directs`→404; all `AppLayout` pages (`/tools`, `/campaign-analytics`, `/support`, `/my-marketing`, `/learn`, `/account`) 200 — no regression from the `AppLayout` edit.

- _2026-08-21_ — Pass 3 orphan sweep complete (`0dfbcea` frontend, `466fd4d` backend). /team, PlaceholderPage, BusinessHubTabs, and 4 dead command_centre APIs + helper removed. AppLayout confirmed core and kept. All verified live, no regression.
