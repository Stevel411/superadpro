# AdvantageLife — Session Handover
**Date:** 10 September 2026 (pm) · **Branch:** `advantagelife-passup` · **HEAD:** `46e632f7b`
**Live:** https://www.advantagelife.club (Railway, auto-deploys on push · repo `Stevel411/superadpro`)

---

## 1. HEADLINE
Both remaining launch gates are **closed**. #5 (payout rail) proven live with real USDT; #6 (test-data purge) built and executed — DB confirmed clean (`matched: 0`). Plus a new BSC-default matrix payout-wallet screen. **AdvantageLife is ready to open to the 611.**

---

## 2. WHAT SHIPPED THIS SESSION (commits, in order)
- `ba5ff3a9e` — Gate #6 purge tool v1 (dry-run/guarded/atomic).
- `b4e282926` — (superseded) BSC-only payout enforcement.
- `cf919257f` — **Matrix payout-wallet screen** `/matrix/payout-wallet`: USDT-only, **BSC default + "Recommended"**, ETH & Tron selectable, per-chain validation, writes `user.wallet_*`. Fixed a real gap — the old matrix-wallet UI (`Account.jsx saveWallet`) was never wired to a button, and the dashboard card pointed at the P2P page (`/payout-methods`) which doesn't set the field the batch reads. `validate_wallet` now handles `eth`.
- `6b77da557` — Purge v2: full FK cascade from ORM model graph.
- `46e632f7b` — **Purge v3 (final):** builds the cascade from the **LIVE FK graph** (`information_schema`) at runtime, not the ORM models — so it covers raw-SQL tables (e.g. `rotator_assignments`) the models don't know about. Children-first delete order, each table scoped by a subquery bottoming at the test-user id set; audit refs NULLed (`_PURGE_REF`); one atomic transaction; guards = never touch id 1, lifetime excluded unless `allow_lifetime=1`, tree-integrity block, `expect_users` echo.

## 3. #5 — PAYOUT RAIL: PROVEN LIVE
Ran the real flow end-to-end on the AdvantageLife Treasury MetaMask wallet (BNB Smart Chain): funded (USDT + BNB gas) → connected to disperse.app → selected token via BSC-USDT contract `0x55d398326f99059fF775485246999027B3197955` → **approve** (success) → **disperse** (success). Confirmed the "total exceeds balance" guard and the wrong-account gotcha (disperse reads MetaMask's active account). Monday flow = `/admin/al/payout` → check reconciliation green → per-chain Copy → disperse (BSC/ETH via disperse.app, Tron via a TRC-20 tool) → mark paid.

## 4. #6 — TEST-DATA PURGE: EXECUTED, DB CLEAN
Endpoint `GET /admin/api/al/purge-test-data` (dry-run default; `&apply=1&expect_users=N`, `&allow_lifetime=1`). Deleted **16 test accounts** (`stevelawsonmarketing+…` aliases, incl. 2 lifetime + 2 annual + 1 trial) and **264 child rows across 30 tables** in one transaction. Confirming dry-run after = `matched: 0`. Matrices empty, ledger zeroed. Two earlier applies failed **safe** (full rollback, zero rows) on FK dependencies I'd under-mapped — the fix was to read the live FK graph, which is now the design.

## 5. CHAIN POLICY (settled)
Pay-IN already BSC-default. Payout wallet = **BSC default, ETH + Tron optional** (Steve's call; members entering a wallet per system is acceptable). The weekly batch groups by chain; BSC = disperse.app, Tron = separate TRC-20 tool, ETH = disperse.app (higher gas). Most members will take the BSC default.

## 6. LAUNCH-READY CHECKLIST
- ✅ #1–#4 (prior sessions), #5 (payout), #6 (purge), matrix payout-wallet screen.
- ▶ **Ready to open to the 611.** Cutover = announce + members hit the claim/reset flow (passwords not migrated).

## 7. FOLLOW-UPS (non-blocking)
1. **Rotate the GitHub PAT** — in use a while; hygiene before launch.
2. Fix the stale "NOWPayments retired" line in `docs/advantagelife-transition-plan.md` (it's the live rail; LAUNCH_LOG is correct).
3. Legacy Tron withdrawal wallets on migrated members: new saves are 3-chain now; the claim flow will mostly sort it. Optional guarded admin sweep available if wanted.
4. `daily_watch_required` per pack — seeded (`DAILY_WATCH_BY_TIER` 1,1,2,2,3,3,4,4,5).

## 8. HOW TO WORK (next session)
Read `LAUNCH_LOG.md` + `docs/advantagelife-transition-plan.md` on the branch (ground truth). Build in-container, PAT, git author `Claude (via Steve) <claude@superadpro.dev>`, Railway auto-deploys ~150s, verify `/health`. Frontend edits need `npm run build` + commit `static/app/` (none this session — all backend). Money code: trace end-to-end; the comp model is settled.
