#!/usr/bin/env python3
"""Startup wrapper — catches import errors and logs them before uvicorn starts."""
import sys
import os
import traceback

print("=" * 60, flush=True)
print("STARTUP DIAGNOSTICS", flush=True)
print(f"Python: {sys.version}", flush=True)
print(f"CWD: {os.getcwd()}", flush=True)
print(f"PORT: {os.environ.get('PORT', 'NOT SET')}", flush=True)
print("=" * 60, flush=True)

try:
    print("Importing app.main...", flush=True)
    from app.main import app
    print("SUCCESS: app.main imported", flush=True)
except Exception as e:
    print(f"FATAL: Failed to import app.main: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)

print("Starting uvicorn...", flush=True)

import uvicorn
port = int(os.environ.get("PORT", 8080))
uvicorn.run(app, host="0.0.0.0", port=port, timeout_keep_alive=120)
