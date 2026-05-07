"""
Tool registry for MCP admin (write-capable) server.

Each tool module registers itself by importing TOOLS and appending.
Use register_tool(...) decorator for clarity.

Tool contract for THIS server (different from read-only mcp/):
  - Takes (db_session, dry_run: bool = True, **kwargs) as args
  - dry_run=True (default) MUST simulate the action and return the
    intended changes without committing. dry_run=False executes.
  - Every tool MUST log to mcp_admin_audit before commit.
  - Returns a plain dict with at minimum:
      { "dry_run": bool, "would_affect": int, "executed": bool, ... }
  - DOES mutate data — uses the mcp_admin DB role with INSERT/UPDATE/
    DELETE granted on specific tables only.
  - Should return in under 5 seconds.
  - SHOULD be idempotent where possible (e.g. cap by status check).
"""

TOOLS: dict[str, dict] = {}


def register_tool(name: str, description: str, category: str = "general", input_schema: dict = None):
    """Decorator to register a tool."""
    def decorator(func):
        # Auto-add dry_run to input schema if not specified
        schema = input_schema or {
            "type": "object",
            "properties": {},
            "required": [],
        }
        if "properties" not in schema:
            schema["properties"] = {}
        if "dry_run" not in schema["properties"]:
            schema["properties"]["dry_run"] = {
                "type": "boolean",
                "description": "If true (DEFAULT), simulate the action without committing. Must be explicitly set to false to execute.",
                "default": True,
            }
        TOOLS[name] = {
            "name": name,
            "description": description,
            "category": category,
            "func": func,
            "input_schema": schema,
        }
        return func
    return decorator


# Import all tool modules to register them
from . import resolve_orphan_transfer       # noqa: F401
from . import reconcile_stuck_payment       # noqa: F401
from . import cancel_stuck_withdrawal       # noqa: F401
from . import grant_credits                 # noqa: F401
from . import expire_pending_orders         # noqa: F401
