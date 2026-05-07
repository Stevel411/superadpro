"""
SuperAdPro MCP Admin Server (WRITE-CAPABLE)
============================================

Sister service to the read-only superadpro-mcp server. Exposes write-
capable admin tools via the same MCP 2025-03-26 Streamable HTTP protocol.

CRITICAL: This server is dangerous. It mutates production data. Therefore:

  1. Authentication is REQUIRED. MCP_AUTH_TOKEN env var MUST be set.
     Server refuses to start without it.

  2. Database role MUST be `mcp_admin` with INSERT/UPDATE/DELETE granted
     on specific tables only (never full superuser). The DATABASE_URL
     should reference this scoped role.

  3. Every tool defaults to dry_run=true. Caller must explicitly pass
     dry_run=false to execute.

  4. Every successful execution is logged to mcp_admin_audit (which is
     also where dry-run previews are logged for forensic completeness).

Endpoints:
  GET  /             - Health check
  POST /mcp          - MCP JSON-RPC 2.0 endpoint
  GET  /mcp          - 405 (no SSE)
  GET  /tools        - Human-readable tool list

Deploy as a separate Railway service from superadpro-mcp.
"""

import os
import sys
import json
import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
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
log = logging.getLogger("mcp_admin")


# ─────────────────────────────────────────────────────────────
#  Environment
# ─────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL")
MCP_AUTH_TOKEN = os.environ.get("MCP_AUTH_TOKEN")

if not DATABASE_URL:
    log.error("DATABASE_URL not set — refusing to start a write-capable server with no DB.")
    sys.exit(1)

# UNLIKE the read-only server, MCP_AUTH_TOKEN is REQUIRED here. A write-
# capable server with no auth is a vulnerability disclosure waiting to
# happen. Better to crash on boot than silently expose mutations.
if not MCP_AUTH_TOKEN:
    log.error("MCP_AUTH_TOKEN not set — refusing to start a write-capable server without auth.")
    sys.exit(1)


SUPPORTED_PROTOCOL_VERSIONS = ["2025-03-26", "2024-11-05"]


# ─────────────────────────────────────────────────────────────
#  Database
# ─────────────────────────────────────────────────────────────
db_url = DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    db_url,
    pool_size=2,
    max_overflow=3,
    pool_recycle=300,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    return SessionLocal()


def _ensure_schema():
    """Create mcp_admin_audit table if it doesn't exist. Idempotent."""
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS mcp_admin_audit (
                id              SERIAL PRIMARY KEY,
                tool_name       TEXT NOT NULL,
                caller_token    TEXT,
                target_type     TEXT NOT NULL,
                target_id       TEXT NOT NULL,
                action          TEXT NOT NULL,
                payload         JSONB,
                executed        BOOLEAN NOT NULL,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS mcp_admin_audit_tool_idx
            ON mcp_admin_audit (tool_name, created_at DESC)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS mcp_admin_audit_target_idx
            ON mcp_admin_audit (target_type, target_id)
        """))


try:
    _ensure_schema()
    log.info("mcp_admin_audit schema verified")
except Exception as e:
    log.warning(f"Could not bootstrap audit schema (will retry on first call): {e}")


# ─────────────────────────────────────────────────────────────
#  FastAPI app
# ─────────────────────────────────────────────────────────────
app = FastAPI(title="SuperAdPro MCP Admin Server", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://claude.ai",
        "https://claude.com",
        "https://www.anthropic.com",
        "https://api.anthropic.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Mcp-Session-Id"],
)


@app.get("/")
@app.get("/health")
def health():
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        log.error(f"DB health check failed: {e}")
    return {
        "service": "superadpro-mcp-admin",
        "version": "0.1.0",
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "tools_loaded": len(tool_registry.TOOLS),
        "auth_required": True,
        "mcp_protocol": "2025-03-26 (Streamable HTTP)",
        "mode": "WRITE",
    }


@app.get("/tools")
def list_tools_human():
    return {
        "tools": [
            {
                "name": t["name"],
                "description": t["description"],
                "category": t.get("category", "general"),
                "input_schema": t.get("input_schema"),
            }
            for t in tool_registry.TOOLS.values()
        ]
    }


def _check_auth(request: Request) -> str:
    """Returns the bearer token (so tools can audit-log who called them)."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    token = auth[7:]
    if token != MCP_AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")
    return token


def _negotiate_protocol_version(client_version: str) -> str:
    if client_version in SUPPORTED_PROTOCOL_VERSIONS:
        return client_version
    return SUPPORTED_PROTOCOL_VERSIONS[0]


@app.post("/mcp")
async def mcp_post(request: Request):
    caller_token = _check_auth(request)

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if isinstance(body, list):
        body = body[0] if body else {}

    method = body.get("method")
    request_id = body.get("id")
    params = body.get("params") or {}

    headers = {}
    session_id = request.headers.get("mcp-session-id")
    if not session_id:
        session_id = str(uuid.uuid4())
        headers["Mcp-Session-Id"] = session_id

    log.info(f"MCP method={method} id={request_id} session={session_id[:8]}")

    # Per spec, "notifications/*" are notifications (no response expected)
    if method and method.startswith("notifications/"):
        return Response(status_code=202, headers=headers)

    # ── initialize ──
    if method == "initialize":
        client_version = params.get("protocolVersion", "")
        protocol_version = _negotiate_protocol_version(client_version)
        return JSONResponse(
            {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "protocolVersion": protocol_version,
                    "capabilities": {"tools": {}},
                    "serverInfo": {
                        "name": "superadpro-mcp-admin",
                        "version": "0.1.0",
                    },
                },
            },
            headers=headers,
        )

    # ── tools/list ──
    if method == "tools/list":
        tools_list = [
            {
                "name": t["name"],
                "description": t["description"],
                "inputSchema": t.get("input_schema") or {
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
            }
            for t in tool_registry.TOOLS.values()
        ]
        return JSONResponse(
            {"jsonrpc": "2.0", "id": request_id, "result": {"tools": tools_list}},
            headers=headers,
        )

    # ── tools/call ──
    if method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments") or {}

        tool = tool_registry.TOOLS.get(tool_name)
        if not tool:
            return JSONResponse(
                {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {"code": -32601, "message": f"Tool not found: {tool_name}"},
                },
                headers=headers,
            )

        # Inject the caller token so tools can audit who called them.
        arguments["_caller_token"] = caller_token

        db = get_db()
        try:
            t0 = time.time()
            result = tool["func"](db, **arguments)
            elapsed_ms = int((time.time() - t0) * 1000)
            log.info(f"tool={tool_name} elapsed={elapsed_ms}ms dry_run={arguments.get('dry_run', True)}")
        except Exception as e:
            db.rollback()
            log.exception(f"Tool {tool_name} crashed")
            return JSONResponse(
                {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {"code": -32603, "message": f"Tool error: {type(e).__name__}: {e}"},
                },
                headers=headers,
            )
        finally:
            db.close()

        return JSONResponse(
            {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "content": [
                        {"type": "text", "text": json.dumps(result, default=str, indent=2)}
                    ],
                    "isError": False,
                },
            },
            headers=headers,
        )

    # Unknown method
    return JSONResponse(
        {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": -32601, "message": f"Method not found: {method}"},
        },
        headers=headers,
    )


@app.get("/mcp")
def mcp_get():
    # No SSE — all responses are synchronous
    raise HTTPException(status_code=405, detail="GET /mcp not supported (no SSE stream)")


@app.delete("/mcp")
def mcp_delete(request: Request):
    _check_auth(request)
    return Response(status_code=204)
