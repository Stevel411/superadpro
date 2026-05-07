# SuperAdPro MCP Admin Server — Deployment Guide

Sister service to `superadpro-mcp` (read-only). This server is **write-capable** and
exposes admin tools for resolving stuck payments, cancelling withdrawals, etc.

## Why a separate service?

- Different DB role: this server uses `mcp_admin` (with INSERT/UPDATE/DELETE on
  specific tables only) instead of `mcp_readonly`.
- Different auth posture: this server REFUSES TO START without `MCP_AUTH_TOKEN`.
  The read-only one allows anonymous access for convenience; this one cannot.
- Different blast radius: if the read-only server is compromised, attacker reads
  data. If this one is compromised, attacker mutates data. They must be isolated.

## Tools

| Tool                       | Action                                                           |
| -------------------------- | ---------------------------------------------------------------- |
| `resolve_orphan_transfer`  | Mark an OnchainOrphanTransfer row as spam/manual/reconciled      |
| `reconcile_stuck_payment`  | Attach an orphan tx to a stuck WC order, mark order confirmed    |
| `cancel_stuck_withdrawal`  | Cancel a pending withdrawal, restore user's balance              |
| `grant_credits`            | Add Profit Nexus credits to a user (1..5000 cap, no commissions) |
| `expire_pending_orders`    | Bulk-expire stale pending payment orders (cap 500/call)          |

Every tool defaults to `dry_run=true`. Caller MUST pass `dry_run=false` to execute.
Every successful execution (and every dry-run preview) is logged to
`mcp_admin_audit`.

## Required Environment

```
DATABASE_URL=postgresql://mcp_admin:PASSWORD@HOST:PORT/DB
MCP_AUTH_TOKEN=<generate-a-strong-random-token>
PORT=8000  # set automatically by Railway
```

## Postgres Role Setup (run as superuser)

```sql
-- Create the scoped role
CREATE ROLE mcp_admin WITH LOGIN PASSWORD 'YOUR_STRONG_PASSWORD';

-- Allow connection
GRANT CONNECT ON DATABASE railway TO mcp_admin;
GRANT USAGE ON SCHEMA public TO mcp_admin;

-- Read access for SELECT operations the tools need
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_admin;

-- Write access ONLY on the tables tools actually mutate
GRANT INSERT, UPDATE ON
    onchain_orphan_transfers,
    walletconnect_payment_orders,
    nowpayments_orders,
    withdrawals,
    users
TO mcp_admin;

-- The audit table needs INSERT (its own log)
GRANT INSERT ON mcp_admin_audit TO mcp_admin;
GRANT USAGE, SELECT ON SEQUENCE mcp_admin_audit_id_seq TO mcp_admin;

-- Future-proofing: any new tables created later should NOT be writable by default.
-- (Don't issue a default-privilege GRANT on the schema.)
```

## Railway deployment

```
1. New Service → Deploy from Repo → Stevel411/superadpro
2. Settings → Source → Root Directory: mcp_admin
3. Variables:
     DATABASE_URL=postgresql://mcp_admin:...@...
     MCP_AUTH_TOKEN=<strong-random>
4. Domain: enable a public URL
5. Verify health: curl https://<service>.up.railway.app/health
```

## Connecting from Claude

Add as a custom MCP integration with the URL `https://<service>.up.railway.app/mcp`
and bearer token equal to `MCP_AUTH_TOKEN`.

## Sanity checklist before first non-dry-run

- [ ] DATABASE_URL points to `mcp_admin` role, not `postgres` superuser
- [ ] `mcp_admin` cannot DROP, TRUNCATE, or write outside the granted tables
      (test by trying: `DELETE FROM users` should fail with permission denied)
- [ ] `MCP_AUTH_TOKEN` is set to a strong random value, not "admin" or similar
- [ ] First real call is `resolve_orphan_transfer` with `dry_run=true` to confirm
      auth + connectivity work
- [ ] First non-dry-run call is on a low-stakes target (e.g. a $0 test order)
- [ ] Verify the row appears in `mcp_admin_audit` with `executed=true`
