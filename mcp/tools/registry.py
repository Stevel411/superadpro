"""
Tool registry for MCP monitoring server.

Each tool module registers itself by importing TOOLS and appending.
Use register_tool(...) decorator for clarity.

Tool contract:
  - Takes (db_session, **kwargs) as args
  - Returns a plain dict (will be JSON-serialised)
  - Must NOT mutate data (read-only DB role enforces this anyway)
  - Should return in under 2 seconds
  - Should aggregate — no raw user records with PII
"""

TOOLS: dict[str, dict] = {}


def register_tool(name: str, description: str, category: str = "general", input_schema: dict = None):
    """Decorator to register a tool."""
    def decorator(func):
        TOOLS[name] = {
            "name": name,
            "description": description,
            "category": category,
            "func": func,
            "input_schema": input_schema or {
                "type": "object",
                "properties": {},
                "required": [],
            },
        }
        return func
    return decorator


# Import all tool modules to register them
from . import commission_audit          # noqa: F401
from . import commission_anomalies      # noqa: F401
from . import unqualified_commissions   # noqa: F401
from . import platform_pulse            # noqa: F401
from . import slowness_detector         # noqa: F401
from . import ai_provider_health        # noqa: F401
from . import user_impact               # noqa: F401
from . import stuck_users               # noqa: F401
from . import payment_integrity         # noqa: F401
from . import financial_sanity          # noqa: F401
