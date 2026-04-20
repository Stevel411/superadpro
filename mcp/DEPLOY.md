# MCP Server — Railway Deployment Guide

## 1. Create the read-only Postgres role

Run this ONCE in your main Railway Postgres database (via Railway's query UI or `psql`):

```sql
-- Create a role that can ONLY read data — cannot UPDATE, INSERT, DELETE, DROP
CREATE ROLE mcp_readonly WITH LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';

-- Grant connect + usage on public schema
GRANT CONNECT ON DATABASE railway TO mcp_readonly;
GRANT USAGE ON SCHEMA public TO mcp_readonly;

-- Grant SELECT on all current tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;

-- Ensure future tables are also readable (for new migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mcp_readonly;
```

Note the connection string Railway shows for this role — you'll need it in step 3.

## 2. Create the new Railway service

In the Railway dashboard for the SuperAdPro project:

1. Click **+ New** → **GitHub Repo** → select `Stevel411/superadpro`
2. In the service's **Settings** tab:
   - **Root Directory**: `mcp`
   - **Watch Paths**: `mcp/**` (so only MCP subfolder changes trigger redeploys)
   - **Builder**: Nixpacks (default)
3. Name the service: `superadpro-mcp`

## 3. Set environment variables

Under the new service's **Variables** tab, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The read-only connection string from step 1 (uses `mcp_readonly` user) |
| `MCP_AUTH_TOKEN` | A strong random secret — generate with `openssl rand -hex 32` |
| `PORT` | `8080` (or whatever Railway assigns — this is auto-provided) |

## 4. Deploy & verify

After Railway deploys, the service will have a public URL like:

```
https://superadpro-mcp-production.up.railway.app
```

Test the health endpoint in a browser:

```
https://superadpro-mcp-production.up.railway.app/
```

Should return:
```json
{
  "service": "superadpro-mcp",
  "status": "ok",
  "database": "ok",
  "tools_loaded": 10,
  "auth_enabled": true
}
```

## 5. Connect Claude to the MCP server

In Claude's UI (chat settings or Connectors panel):

1. **Add custom MCP server**
2. **Name**: `SuperAdPro Monitoring`
3. **URL**: `https://superadpro-mcp-production.up.railway.app/mcp`
4. **Auth**: Bearer token → paste the `MCP_AUTH_TOKEN` from step 3

Once connected, the 10 tools appear in Claude's tool list and I can call them on demand.

## 6. First test call (from local machine)

```bash
curl -X POST https://superadpro-mcp-production.up.railway.app/mcp \
  -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"platform_pulse","arguments":{}}}'
```

You should get back a JSON response with the `platform_pulse` output.

## Future enhancements (not needed for launch)

- `slowness_detector` currently returns "not implemented" — to make it work, add a middleware in `app/main.py` that logs every request's response time to an `endpoint_metrics` table
- Consider adding IP allowlisting on Railway to restrict the MCP endpoint to your home IP + Anthropic's egress IPs
- Rotate `MCP_AUTH_TOKEN` monthly (update both Railway env var and Claude's connector config)
