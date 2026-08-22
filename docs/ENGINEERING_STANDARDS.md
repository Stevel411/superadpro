# AdvantageLife — Engineering Standards

_The non-negotiable way we build. Locked with Steve, 2026-08-21. Applies to every change on `advantagelife-passup`._

This is not aspirational. It is the bar. If a change does not clear it, it does not ship. Steve reads commits and spots corner-cutting; the platform is **live with paying members and real money flows**, so a broken deploy is a broken business, not a broken build.

---

## 1. The bar: commercial-grade, from first principles

Members pay hard-earned money. Every surface competes with Webflow, Leadpages, ConvertKit. Before shipping anything member-facing, the test is: **would one of those products ship this?** If no, neither do we.

- No vibe coding. No "good enough for now." No quick-fix patches over a root cause.
- No "new content only" carve-outs or trade-offs that leave a worse experience behind.
- Every affected surface is considered, not just the one in front of you.

## 2. Check the code first. Never assume.

**Ground truth is the live code and the running platform — not memory, not a handover, not this doc, not `LAUNCH_LOG.md`.** Every one of those can be stale or wrong, and this repo has a *documented history* of features logged as "removed" that were still live.

- **"Done" anywhere is a claim to verify, not a fact.** Grep the canonical source before asserting any behaviour, number, route, or state.
- Before you classify, delete, or change a page: read what it actually renders, whether it's reachable, whether its component is shared, and whether the backend still serves it. Assumptions about any of these have each been wrong here before.
- AL numbers come from the engines + `/api/al/packs` — **never** from `docs/commission-spec.md` (that is SuperAdPro's spec, actively wrong for AL).

## 3. Root cause before code

When a bug appears, trace it to its origin before touching anything. Build a diagnostic endpoint to confirm server-side state if needed. Symptom-patching is not a fix — it hides the next failure.

## 4. Trace the complete money flow end-to-end

For anything touching packs, commissions, pass-up, join, or payout: the test is not "does it run" — it's **"does the money reach the right person."** If pass-up/settlement logic already exists in a module (`passup_engine`, `al_engine`, `al_settlement`), **call it** — never reimplement it in a handler.

## 5. Never break the live platform

The deploy is instant and unattended (~160s auto-deploy on push). A bad push is live before anyone looks. So:

- **Pre-push checklist is mandatory, every push:**
  1. `python3 -m compileall -q app/` — no syntax errors ship.
  2. **Any `frontend/src/*` edit** → `cd frontend && npm install --legacy-peer-deps && npm run build`, then commit `static/app/`. Railway compiles Python only; a source-only push ships a **stale bundle silently**.
  3. Re-view a file after every `str_replace` (earlier view output is stale).
  4. **Never** blind global find-replace on `main.py` — it over-reaches (this bit us). Assert `s.count(old) == 1`, or edit by an anchored, unique segment / exact line index.
- **Redirect, don't hard-delete, anything with possible inbound links.** Old emails, bookmarks, and member share links point at retired URLs. A live redirect is graceful; a deleted route 404s. Deleting a redirect stub is a regression, not a cleanup.
- **Additive, reversible, one concern per commit.** Especially for schema and money paths. `SKIP_MIGRATIONS=true` means once a table exists nothing adds a column to it again — new model fields silently 500 until `schema-check --columns` backfills them.

## 6. "Shipped" means verified live

Not "it compiled." Not "it should work." Push → wait for deploy → curl the live URL / hit the admin GET endpoint / verify the bundle hash matches local `static/app/index.html`. Only then is it done. No silent `.catch` swallowing errors.

## 7. Product calls vs technical calls

- **Technical call** (does this break, what's the tradeoff, which approach): surface the tradeoff, recommend one, proceed. Don't re-ask a settled "do it."
- **Product/brand/strategy call** (should this surface exist, what does AL want members to see): Steve's call. Ask when it's genuinely ambiguous — one clean checkpoint before mutating a live money-adjacent surface is discipline, not narration.
- Push back when technical reality contradicts the ask or a spec would cost money/trust. Explain concretely, recommend the better path, build what Steve picks.

## 8. Own mistakes plainly

"I shipped a bug, here's the root cause, here's the fix." No corporate hedging, no burying it. Honesty is what earns the latitude to move fast.

## 9. Mockup-first

Any member-facing or public page needs an approved mockup **before** code. No exceptions.

---

_When this doc and live code disagree, live code wins — and this doc gets corrected in the same session._

---

## Canonical comp model — engine-verified (added 2026-08-21 after an assumption error)

**Money/comp facts come from the engine (`app/passup_engine.py`, `app/al_engine.py`) — never from these docs, the project instructions, memory, or a page's existing copy.** This bit us hard: the docs and project instructions say "3/6/9", so I "corrected" a live legal page's pass-up to 3/6/9 — which was WRONG. The engine is the source of truth for where money goes.

**The pass-up (per `passup_engine.py`, `CYCLE_LENGTH = 11`):**
- **3rd sale → the COMPANY** — operational fee, always, no climb (`COMPANY_POSITION = 3`).
- **6th, 9th, 11th → pass up** to the first qualified upline (`UPLINE_PASSUP_POSITIONS = {6, 9, 11}`); COMPANY only if the whole chain fails.
- **Keep 1, 2, 4, 5, 7, 8, 10**, and **100% of every sale from the 12th on**, until the package delivers its views / a renewal resets the cycle.
- One cycle = company 1, upline 3, seller 7.
- Direct sale + unqualified sponsor → COMPANY (no climb).

**"3/6/9" anywhere (docs, project instructions, FAQ, swipes, comments) is STALE shorthand** — the model moved to 6/9/11 + 3rd-fee and the docs were never updated. Fix the content to the engine, not the engine to the content. Before writing ANY comp-plan or commission claim, read the engine constants first.

## AdvantageLife membership is FREE (Aug 2026) — no fees, no paid tiers

**AL charges nothing for access.** `_al_membership_active(user)` returns `user is not None` — every logged-in member has full access. Members register (free) at `/register` and become a **free member**. There are **no membership fees and no paid tiers.**

The old `$50 annual` / `$100 lifetime` paid model is **fully retired and its code excised** (Aug 2026): the paid-join page body, the `_AL_JOIN_PAGE` template, `_al_activate_lifetime` / `_al_activate_annual`, and the Stripe/NOWPayments `al_lifetime`/`al_annual` webhook branches are all gone. `/join` now just redirects (logged-in → `/dashboard`, anon → `/register`).

Any `al_annual` / `al_lifetime` / `membership` / `onchain_membership` **Payment records are stale/test data — NOT revenue.** Do not surface "membership income" anywhere.

**AL revenue = P2P pack sales only.** The platform never holds funds; buyers pay sellers wallet-to-wallet. Company income = pack-commission fees (operational_fee on the 3rd sale; direct_company / pass_up_company absorb) plus the admin/company account's own direct affiliate sales.

**The shared codebase carries SuperAdPro concepts (membership tiers, Profit Grid, credits/SuperScene, Creative Studio, blog, trials) that DO NOT apply to AL. Always check the live AL gate/engine — never assume SAP behaviour transfers.**
