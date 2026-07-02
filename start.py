#!/usr/bin/env python3
"""Load the app fully, THEN bind the port.

Railway's healthcheck (railway.toml: healthcheckPath=/health, timeout 600s)
keeps the PREVIOUS deployment serving traffic until this container answers
200 on /health — that is what gives us zero-downtime deploys.

Do NOT reintroduce a port-binding stub that answers before the app is ready.
The old stub here answered EVERY path with 200 {"status":"ok"} during the
multi-minute app import, which (a) made Railway cut traffic over to a
container that couldn't serve, giving members broken responses + a 502
handoff gap on every deploy, and (b) swallowed inbound webhooks (Stripe /
NOWPayments / SES-SNS) with a 200 during every boot window — the sender
marks them delivered and never retries, silently losing payment events.
If boot ever exceeds the healthcheck timeout, the correct fix is raising
healthcheckTimeout in railway.toml — the old deployment keeps serving
while this one loads, so slow boot costs nothing.
"""
import os
import sys
import traceback

print("[start.py] Loading app (previous deployment keeps serving until we pass healthcheck)...", flush=True)
try:
    from app.main import app
except Exception as e:
    print(f"[start.py] FATAL during app import: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)
print("[start.py] App loaded — starting uvicorn.", flush=True)

import uvicorn

uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), timeout_keep_alive=120)
