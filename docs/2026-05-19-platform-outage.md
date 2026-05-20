# Platform Outage — 19 May 2026

## TL;DR

**Railway-wide outage caused by Google Cloud blocking Railway's account.** Not caused by anything we shipped today. No action needed from Steve. When Railway recovers, SuperAdPro will come back on its own. No data loss expected.

---

## Timeline (all times UTC)

| Time | Event |
|------|-------|
| ~22:00 | Last successful Steve interaction with platform (Phase 2A deploys completed cleanly) |
| 22:29 | Railway acknowledges widespread outage: "no healthy upstream", login failures, dashboard inaccessible |
| 22:43 | Railway identifies cause: "Access to our upstream cloud provider has been restored, working on a fix" |
| 23:37 | Railway confirms: "Google Cloud has blocked our account. We have escalated this directly with Google." Partial restoration started. |
| 00:00 (20 May) | Steve reports "platform appears to be offline" — confirmed by every endpoint timing out |
| 00:05 | Railway status page flips to "Fully Operational" — but customer apps still in restoration queue |
| 00:46 | SuperAdPro still timing out on all endpoints |

## Root cause

Railway's hosting provider (Google Cloud) blocked Railway's account at the upstream level. All Railway-hosted apps went down simultaneously, including SuperAdPro. **Hundreds of other Railway-hosted services affected.** This is a Railway/Google-Cloud incident, not anything Steve & I did.

## What we did NOT cause

Despite the timing alignment with our last deploy (`fabffc8` — Phase 2A Inspector port), this outage is unrelated. Evidence:

- Phase 2A is pure frontend (React/JSX) — cannot crash a FastAPI process
- The only Python change today (`4d58c62` — slug repair) executes inside a request handler, not at startup; safely wrapped in try/except
- The platform was confirmed healthy by Steve as recently as commit `0f06102` (funnels gallery balance) about 30 minutes before the outage
- Railway's own status page acknowledged the outage as upstream cloud provider issue at 22:43 UTC

## What's safe

- **All code shipped today is intact.** Repo state at `fabffc8` is correct.
- **No data loss expected.** Railway Postgres uses persistent volumes that survive container restarts.
- **No rollback needed.** Nothing to revert.

## What to do when Steve is back

1. Check `https://www.superadpro.com/health` — if HTTP 200, recovery is complete
2. If still down: check Railway dashboard at https://railway.com/dashboard → SuperAdPro project → check status of each service
   - If services show "crashed" or "no deploys", trigger a redeploy via Railway dashboard (Settings → Redeploy)
   - If services show "active" but app still unresponsive, contact Railway support
3. After recovery, do a 60-second sanity check:
   - Login works
   - `/pro/funnels` loads (this tests the slug repair code from `4d58c62`)
   - `/labs/pagebuilder/sandbox` loads with three-panel layout (this tests Phase 2A)
   - Test a button + heading in the Inspector panel to confirm Phase 2A
4. **No further code changes needed** — we're at a clean stopping point

## Recovery monitoring

I've been pinging the platform every 60-180s while Steve traveled. Outage is ~2h 17m at time of writing. Railway's recent major outages have median resolution time of 90 minutes, so we're now in the longer-than-typical territory.

## Last known good state

```
Commit: fabffc8 (Phase 2A: port Heading, Text, Label to Inspector)
Author: Claude (via Steve) <claude@superadpro.dev>
Date:   Tue May 19 19:15:58 2026 +0000
```

All today's work shipped:

| Commit | Description |
|--------|-------------|
| `b343100` | momentumhub recovery + half-state guards |
| `87707d3` | Coinbase Commerce removed |
| `8cf24ef` | Admin banner colour fix |
| `db1b639` | stuck-payment-recovery skill |
| `e2a1f0c` | Pro/Basic tier purge |
| `5060e0e` | Customer-facing Basic/Pro copy fixes |
| `f7466f7` | Tools AI Content / Builder restructure |
| `863ae66` | en.json bulk i18n sweep |
| `c0d2643` | Training rewrite + master-affiliate lock fix |
| `17a6100` | Labs audit doc |
| `6b6cf41` | Button & banner blockers fixed |
| `c109884` | Modal preview honours typography |
| `b3cffe6` | Sticky preview + slider |
| `d893935` | **Phase 1**: Inspector panel launched |
| `d3950ed` | Stale-closure fix |
| `f1eb106` | Defensive style filter |
| `2e09249` | Threshold 900 → 1100 |
| `f709804` | Threshold 1100 → 600 for diagnosis |
| `4d58c62` | Slug auto-repair for published pages |
| `ec5fb43` | Suppress old modal trigger for Inspector types |
| `0f06102` | Funnels gallery action-row balance |
| `4aac741` | Audit doc Form section verified |
| `fabffc8` | **Phase 2A**: Heading/Text/Label Inspector ports |

22 commits shipped today. Substantial progress on the Page Builder audit.
