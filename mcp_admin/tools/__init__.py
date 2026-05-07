"""SuperAdPro MCP admin (write) tools.

These are dangerous operations that mutate production state. Each tool:
  1. Defaults to dry_run=True — caller MUST opt in to mutation
  2. Logs every successful execution to mcp_admin_audit
  3. Uses the mcp_admin DB role with grants only on tables it needs
"""
from . import registry  # noqa: F401
