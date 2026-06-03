# SuperAdPro — Security Invariants (non-negotiable)

These rules exist because of the **2026-06-03 breach**: ~40 admin GET
endpoints were gated only by a guessable hardcoded secret
(`superadpro-owner-2026`), and the FastAPI auto-docs (`/openapi.json`)
were public. An attacker mapped the endpoints, guessed the secret, made
themselves admin, and drained **1,187 USDT**. The root failure was not
the bug — it was that nothing *forced* the bug to be caught.

**Every engineering session MUST honour these. Run
`python3 scripts/security_check.py` before every push.**

## Access control
1. **No secret in source.** All secrets come from env vars and **fail
   closed** (no insecure default). Use `_get_required_secret(name)` with
   **no** fallback argument.
2. **Privileged / state-changing endpoints require an authenticated admin
   session (+2FA)** — never a `?secret=` query param. (Target state; until
   the auth rebuild lands, the interim is a strong env-only secret. Track
   the migration to session auth as an open item.)
3. **No state-changing operations over GET.** Mutations are POST with auth.
   **Never put secrets in query strings** — they leak into server logs,
   browser history, and CDN logs.
4. **Dev/test/seed/destructive endpoints are not reachable in production.**
   `activate-owner`, `test-grid-*`, `test-course-passup-*`, `force-wipe`,
   `run-migrations`, `force-migrate`, `reset-account`, `seed-*`, `fix-owner`,
   `test-*`. Guarded by `DEV_ENDPOINTS_ENABLED` (default OFF). Prefer
   deleting them outright. **Never set `DEV_ENDPOINTS_ENABLED=true` in prod.**
5. **API docs OFF in prod.** `/docs`, `/redoc`, `/openapi.json` are disabled
   unless `ENABLE_API_DOCS=true` (non-prod only).

## Money
6. **The server must never hold withdrawal-signing keys that can be drained
   on command.** Use a custodial processor (CoinPayments) and/or manual
   approval + per-payout thresholds.
7. **Withdrawals are frozen** unless `WITHDRAWALS_ENABLED=true`.
8. **Alert on privileged actions** — new admin, balance adjustment, payout
   over threshold → notify the owner in real time.

## Process
9. Run `scripts/security_check.py` pre-push (or wire it into CI). It fails
   on hardcoded secrets and warns on state-changing GET routes.
10. Secret scanning (gitleaks / trufflehog) in CI. Never commit tokens.
11. A **written** security audit before each relaunch — scoped, findings on
    paper, not a chat aside.
12. One independent external pass (pen-test / scanner) for a money platform —
    don't let a single reviewer be the only thing between you and a hole.

## Required env vars (fail closed if missing)
`ADMIN_SECRET`, `ADMIN_RESET_SECRET`, `ADMIN_MIGRATE_SECRET`, `BACKUP_SECRET`.
Operational flags: `MAINTENANCE_MODE` (default on while paused),
`WITHDRAWALS_ENABLED` (leave unset = frozen), `DEV_ENDPOINTS_ENABLED`
(leave unset = off), `ENABLE_API_DOCS` (leave unset = off).

## Hardening against automated / AI-assisted attacks
There is no such thing as "AI-proof." AI doesn't find new vuln *classes* — it
finds the existing ones faster, cheaper, and at scale. So the goal is to remove
what automated recon is best at finding and to throttle/detect the probing:
13. **No information leakage.** Error responses are generic
    (`{"error":"Internal server error"}`); full detail logged server-side only.
    No stack traces, DB errors, SQL fragments, or framework versions to clients.
    Debug mode off in prod.
14. **Throttle automated probing.** `ProbeThrottleMiddleware` temp-bans an IP
    that bursts 401/403/404 (brute-force / enumeration). Rate-limit key uses the
    real client IP (`CF-Connecting-IP`), not the Cloudflare edge IP.
15. **Enable Cloudflare WAF + rate-limiting + Bot Fight Mode at the edge.** The
    app-level throttle is a per-instance safety net; the durable anti-automation
    layer is the CDN, which stops probes before they reach the app.
16. **Scan dependencies for CVEs every release.** `pip-audit -r requirements.txt`.
    Known-CVE dependency versions are the #1 thing scanners cross-reference.
17. **No string-interpolated SQL.** Use ORM / parameterised queries only
    (verified clean 2026-06-03).


## Open follow-ups (tracked)
- `starlette 0.52.1` has PYSEC-2026-161; fix is 1.0.1 but it's coupled to
  `fastapi==0.129.0` — bump as a coordinated, watched fastapi+starlette deploy,
  not blind. (The other 16 dependency CVEs were patched 2026-06-03.)
- Enable Cloudflare WAF managed rules + a rate-limiting rule on `/admin/*` and
  auth routes + Bot Fight Mode — the strongest anti-automation layer.
- Add `pip-audit -r requirements.txt` to CI / the pre-release checklist.
- `CRON_SECRET`, `BACKUP_SECRET`, `REMOTION_RENDER_SECRET` still carry
  insecure source fallbacks via `_get_required_secret(name, fallback)`.
  Confirm each env var is set in Railway, then drop the fallback (strict).
- Replace remaining `?secret=` admin **diagnostics** with session + 2FA auth.
- `/admin/db-check` returns all user emails — restrict scope or remove.
- Grid-position pollution from the 2026-06-03 attacker accounts to be
  cleared during the rebuild.
