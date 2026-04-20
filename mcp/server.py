"""
SuperAdPro MCP Monitoring Server
=================================

FastAPI service implementing the MCP (Model Context Protocol) streamable HTTP
transport, exposing 10 read-only operational monitoring tools.

Runs as a separate Railway service. Never mutates data. All tools return aggregates.

Endpoints:
  GET  /            - Health check
  POST /mcp         - MCP JSON-RPC 2.0 endpoint (streamable HTTP transport)
  GET  /tools       - Human-readable tool list (for debugging)

Auth: MCP_AUTH_TOKEN env var sent as `Authorization: Bearer <token>`

Response shape for all tools:
  {"status": "...", "data": {...}, "meta": {"generated_at": "iso", "cached": bool}}
"""

import os
import json
import time
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from tools import registry as tool_registry

# ─────────────────────────────────────────────────────────────
#  Logging
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("mcp")


# ─────────────────────────────────────────────────────────────
#  Environment
# ─────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL")
MCP_AUTH_TOKEN = os.environ.get("MCP_AUTH_TOKEN")

if not DATABASE_URL:
    log.warning("DATABASE_URL not set — server will start but tools will fail.")
if not MCP_AUTH_TOKEN:
    log.warning("MCP_AUTH_TOKEN not set — auth is DISABLED (dev only).")


# ─────────────────────────────────────────────────────────────
#  Database (read-only)
# ─────────────────────────────────────────────────────────────
engine = None
SessionLocal = None

if DATABASE_URL:
    # Railway postgres URLs sometimes come through as postgres:// which SQLAlchemy
    # doesn't accept — normalise to postgresql://
    db_url = DATABASE_URL
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(
        db_url,
        pool_size=2,
        max_overflow=3,
        pool_recycle=300,
        pool_pre_ping=True,
        connect_args={"options": "-c default_transaction_read_only=on"} if "postgresql" in db_url else {},
    )
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    """Yields a read-only DB session. Caller must close."""
    if not SessionLocal:
        raise RuntimeError("DATABASE_URL not configured")
    return SessionLocal()


# ─────────────────────────────────────────────────────────────
#  Simple in-memory cache (30-second TTL per tool)
# ─────────────────────────────────────────────────────────────
_cache: dict[str, tuple[float, Any]] = {}
CACHE_TTL_SECONDS = 30


def cached_call(tool_name: str, func, *args, **kwargs):
    key = f"{tool_name}:{json.dumps(kwargs, default=str, sort_keys=True)}"
    now = time.time()
    if key in _cache:
        ts, value = _cache[key]
        if now - ts < CACHE_TTL_SECONDS:
            return value, True
    value = func(*args, **kwargs)
    _cache[key] = (now, value)
    return value, False


# ─────────────────────────────────────────────────────────────
#  FastAPI app
# ─────────────────────────────────────────────────────────────
app = FastAPI(title="SuperAdPro MCP Monitoring Server", version="0.1.0")


@app.get("/")
def health():
    """Health check endpoint."""
    db_ok = False
    if engine:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            db_ok = True
        except Exception as e:
            log.error(f"DB health check failed: {e}")
    return {
        "service": "superadpro-mcp",
        "version": "0.1.0",
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "tools_loaded": len(tool_registry.TOOLS),
        "auth_enabled": bool(MCP_AUTH_TOKEN),
    }


@app.get("/tools")
def list_tools_human():
    """Human-readable tool list for debugging."""
    return {
        "tools": [
            {
                "name": t["name"],
                "description": t["description"],
                "category": t.get("category", "general"),
            }
            for t in tool_registry.TOOLS.values()
        ]
    }


def _check_auth(request: Request):
    """Reject request if Authorization header missing or wrong.
    In dev (no MCP_AUTH_TOKEN set), auth is skipped with a warning."""
    if not MCP_AUTH_TOKEN:
        return  # dev mode
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    token = auth[7:]
    if token != MCP_AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.post("/mcp")
async def mcp_endpoint(request: Request):
    """
    MCP JSON-RPC 2.0 over HTTP.

    Supports methods:
      - initialize
      - tools/list
      - tools/call
    """
    _check_auth(request)

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    method = body.get("method")
    request_id = body.get("id")
    params = body.get("params", {})

    log.info(f"MCP request: {method}")

    # ── initialize handshake ──
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "serverInfo": {
                    "name": "superadpro-mcp",
                    "version": "0.1.0",
                },
                "capabilities": {
                    "tools": {"listChanged": False},
                },
            },
        }

    # ── notifications/initialized — no response needed ──
    if method == "notifications/initialized":
        return JSONResponse(content={}, status_code=204)

    # ── tools/list ──
    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": [
                    {
                        "name": t["name"],
                        "description": t["description"],
                        "inputSchema": t.get("input_schema", {
                            "type": "object",
                            "properties": {},
                            "required": [],
                        }),
                    }
                    for t in tool_registry.TOOLS.values()
                ]
            },
        }

    # ── tools/call ──
    if method == "tools/call":
        tool_name = params.get("name")
        tool_args = params.get("arguments", {}) or {}

        if tool_name not in tool_registry.TOOLS:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Tool not found: {tool_name}",
                },
            }

        tool_def = tool_registry.TOOLS[tool_name]
        tool_func = tool_def["func"]

        try:
            db = get_db()
            try:
                result, was_cached = cached_call(tool_name, tool_func, db, **tool_args)
            finally:
                db.close()

            payload = {
                "status": "ok",
                "data": result,
                "meta": {
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "cached": was_cached,
                    "tool": tool_name,
                },
            }

            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(payload, default=str, indent=2),
                        }
                    ],
                },
            }
        except Exception as e:
            log.exception(f"Tool {tool_name} failed")
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32000,
                    "message": f"Tool error: {type(e).__name__}: {e}",
                },
            }

    # Unknown method
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {
            "code": -32601,
            "message": f"Method not found: {method}",
        },
    }


# ─────────────────────────────────────────────────────────────
#  Entrypoint (used by `python server.py` for local dev)
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
