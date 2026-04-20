# SuperAdPro MCP Monitoring Server

Launch-day operational monitoring for SuperAdPro. Exposes read-only aggregate data as MCP tools so Claude can answer "how's the platform doing?" in real time.

## Architecture

- Separate Railway service (does not share resources with main app)
- Read-only PostgreSQL role — cannot mutate data even in the event of compromise
- Returns aggregates only — no raw user records, emails, or PII in responses
- All tools respond in <2 seconds with 30-second per-tool caching

## Tools

Commission integrity (3):
- `commission_audit` — every commission fired vs expected recipient
- `commission_anomalies` — math sanity checks (negatives, duplicates)
- `unqualified_commissions` — recipients who shouldn't qualify

Performance (3):
- `platform_pulse` — 30-second health snapshot
- `slowness_detector` — endpoints vs baseline
- `ai_provider_health` — fal.ai/EvoLink/xAI success rates

User impact (2):
- `user_impact` — % users hitting errors
- `stuck_users` — counts by bad state (IDs only, no PII)

Financial (2):
- `payment_integrity` — stuck crypto, failed webhooks
- `financial_sanity` — does the day's money balance

## Setup (Railway)

1. Create new Railway service pointing at this subfolder
2. Set env vars:
   - `DATABASE_URL` — read-only Postgres role connection string
   - `MCP_AUTH_TOKEN` — shared secret for MCP client auth
3. Deploy

## Setup (local dev)

```bash
cd mcp
pip install -r requirements.txt
DATABASE_URL=... MCP_AUTH_TOKEN=... uvicorn server:app --reload --port 8001
```

## Security

- DB role has `GRANT SELECT` only, no write permissions
- All tools validate the auth token on every request
- Tool responses aggregate data — never return raw user rows
- Rate limited: 60 requests/min per token
