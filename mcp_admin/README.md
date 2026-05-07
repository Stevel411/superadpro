# superadpro-mcp-admin

Write-capable MCP server for SuperAdPro admin operations. See `DEPLOY.md` for
setup instructions.

**Sister service** to `mcp/` (read-only monitoring). They share zero code on
purpose — different blast radius, different auth posture, different DB role.

## Quick start (local dev)

```bash
cd mcp_admin
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql://mcp_admin:PASS@localhost:5432/superadpro"
export MCP_AUTH_TOKEN="$(openssl rand -hex 32)"
uvicorn server:app --reload --port 8001
curl http://localhost:8001/health  # should report mode=WRITE
```

## Adding a tool

1. Create `tools/your_tool.py` with `@register_tool(...)` decorator
2. Implement `def your_tool(db, dry_run=True, _caller_token=None, **kwargs)`
3. Default `dry_run=True`. Audit log every commit using `_audit.log_audit`.
4. Register in `tools/registry.py` import block at the bottom
5. Restart the server, check `/tools` to verify it loaded
