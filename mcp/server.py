"""
SuperAdPro MCP Monitoring Server
=================================

FastAPI service implementing the MCP (Model Context Protocol) 2025-03-26
Streamable HTTP transport, exposing 10 read-only operational monitoring tools.

Runs as a separate Railway service. Never mutates data. All tools return aggregates.

Endpoints:
  GET  /             - Health check (service status, not MCP)
  POST /mcp          - MCP JSON-RPC 2.0 endpoint (Streamable HTTP transport)
  GET  /mcp          - Returns 405 (no SSE stream — all responses synchronous)
  DELETE /mcp        - Optional session termination
  GET  /tools        - Human-readable tool list (for debugging, not MCP)

Auth: If MCP_AUTH_TOKEN env var is set, requires `Authorization: Bearer <token>`.
      Not set → anonymous access allowed.
"""

import os
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
log = logging.getLogger("mcp")


# ─────────────────────────────────────────────────────────────
#  Environment
# ─────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL")
MCP_AUTH_TOKEN = os.environ.get("MCP_AUTH_TOKEN")

if not DATABASE_URL:
    log.warning("DATABASE_URL not set — server will start but tools will fail.")
if not MCP_AUTH_TOKEN:
    log.warning("MCP_AUTH_TOKEN not set — auth is DISABLED.")


# Protocol versions we support. Client (Claude) sends what it supports;
# server MUST respond with a version both sides support.
SUPPORTED_PROTOCOL_VERSIONS = ["2025-03-26", "2024-11-05"]


# ─────────────────────────────────────────────────────────────
#  Database
# ─────────────────────────────────────────────────────────────
engine = None
SessionLocal = None

if DATABASE_URL:
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
    if not SessionLocal:
        raise RuntimeError("DATABASE_URL not configured")
    return SessionLocal()


# ─────────────────────────────────────────────────────────────
#  Cache
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


# Ephemeral session tracking
_known_sessions: set[str] = set()


# ─────────────────────────────────────────────────────────────
#  FastAPI app
# ─────────────────────────────────────────────────────────────
app = FastAPI(title="SuperAdPro MCP Monitoring Server", version="0.2.0")

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
    if engine:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            db_ok = True
        except Exception as e:
            log.error(f"DB health check failed: {e}")
    return {
        "service": "superadpro-mcp",
        "version": "0.2.0",
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "tools_loaded": len(tool_registry.TOOLS),
        "auth_enabled": bool(MCP_AUTH_TOKEN),
        "mcp_protocol": "2025-03-26 (Streamable HTTP)",
    }


@app.get("/tools")
def list_tools_human():
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
    if not MCP_AUTH_TOKEN:
        return
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    if auth[7:] != MCP_AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")


def _negotiate_protocol_version(client_version: str) -> str:
    if client_version in SUPPORTED_PROTOCOL_VERSIONS:
        return client_version
    return SUPPORTED_PROTOCOL_VERSIONS[0]


@app.post("/mcp")
async def mcp_post(request: Request):
    _check_auth(request)

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if isinstance(body, list):
        body = body[0] if body else {}

    method = body.get("method")
    request_id = body.get("id")
    params = body.get("params", {}) or {}

    session_id = request.headers.get("mcp-session-id") or request.headers.get("Mcp-Session-Id")

    log.info(f"MCP request: method={method} session={session_id}")

    response_headers: dict[str, str] = {}

    # ── initialize ──
    if method == "initialize":
        client_proto = params.get("protocolVersion", "2025-03-26")
        negotiated = _negotiate_protocol_version(client_proto)

        new_session_id = f"sap-{uuid.uuid4().hex}"
        _known_sessions.add(new_session_id)
        response_headers["Mcp-Session-Id"] = new_session_id

        log.info(f"initialize: client_proto={client_proto} negotiated={negotiated} new_session={new_session_id}")

        return JSONResponse(content={
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": negotiated,
                "serverInfo": {"name": "superadpro-mcp", "version": "0.2.0"},
                "capabilities": {"tools": {"listChanged": False}},
            },
        }, headers=response_headers)

    # ── notifications ──
    if method in ("notifications/initialized", "initialized"):
        log.info("client initialized notification received")
        return Response(status_code=202)

    # ── ping ──
    if method == "ping":
        return JSONResponse(content={"jsonrpc": "2.0", "id": request_id, "result": {}})

    # ── tools/list ──
    if method == "tools/list":
        tools_out = []
        for t in tool_registry.TOOLS.values():
            tools_out.append({
                "name": t["name"],
                "description": t["description"],
                "inputSchema": t.get("input_schema", {
                    "type": "object",
                    "properties": {},
                    "required": [],
                }),
            })
        return JSONResponse(
            content={"jsonrpc": "2.0", "id": request_id, "result": {"tools": tools_out}},
        )

    # ── tools/call ──
    if method == "tools/call":
        tool_name = params.get("name")
        tool_args = params.get("arguments", {}) or {}

        if tool_name not in tool_registry.TOOLS:
            return JSONResponse(content={
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {"code": -32602, "message": f"Tool not found: {tool_name}"},
            })

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

            return JSONResponse(content={
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "content": [{
                        "type": "text",
                        "text": json.dumps(payload, default=str, indent=2),
                    }],
                    "isError": False,
                },
            })

        except Exception as e:
            log.exception(f"Tool {tool_name} failed")
            return JSONResponse(content={
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "content": [{
                        "type": "text",
                        "text": f"Tool error: {type(e).__name__}: {e}",
                    }],
                    "isError": True,
                },
            })

    return JSONResponse(content={
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    })


@app.get("/mcp")
async def mcp_get():
    """GET /mcp → 405. Tells client to use POST only (no passive SSE stream)."""
    return Response(status_code=405, headers={"Allow": "POST, DELETE"})


@app.delete("/mcp")
async def mcp_delete(request: Request):
    session_id = request.headers.get("mcp-session-id") or request.headers.get("Mcp-Session-Id")
    if session_id:
        _known_sessions.discard(session_id)
    return Response(status_code=204)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
