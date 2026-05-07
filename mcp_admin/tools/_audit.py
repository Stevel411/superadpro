"""
Audit log helper. Every successful write MUST insert a row into
mcp_admin_audit before committing. This is the only forensic trail we
have for these mutations — Railway logs are ephemeral.

Schema (created idempotently on server boot, see server.py _ensure_schema):

  CREATE TABLE mcp_admin_audit (
      id              SERIAL PRIMARY KEY,
      tool_name       TEXT NOT NULL,
      caller_token    TEXT,                    -- last 8 chars of bearer token
      target_type     TEXT NOT NULL,           -- 'order', 'withdrawal', 'user', etc.
      target_id       TEXT NOT NULL,           -- string so it works for non-int IDs
      action          TEXT NOT NULL,           -- 'reconcile', 'cancel', 'grant', etc.
      payload         JSONB,                   -- input args + before/after
      executed        BOOLEAN NOT NULL,        -- false for dry_run
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX mcp_admin_audit_tool_idx ON mcp_admin_audit (tool_name, created_at DESC);
  CREATE INDEX mcp_admin_audit_target_idx ON mcp_admin_audit (target_type, target_id);
"""
import json
from sqlalchemy import text


def log_audit(db, tool_name: str, target_type: str, target_id: str,
              action: str, payload: dict, executed: bool, caller_token: str = None):
    """Insert an audit row. Caller must commit afterwards (we don't commit here
    so the audit row is rolled back if the actual mutation fails)."""
    db.execute(text("""
        INSERT INTO mcp_admin_audit
            (tool_name, caller_token, target_type, target_id, action, payload, executed)
        VALUES
            (:tool_name, :caller_token, :target_type, :target_id, :action, CAST(:payload AS JSONB), :executed)
    """), {
        "tool_name": tool_name,
        "caller_token": (caller_token or "")[-8:] if caller_token else None,
        "target_type": target_type,
        "target_id": str(target_id),
        "action": action,
        "payload": json.dumps(payload, default=str),
        "executed": executed,
    })
