#!/usr/bin/env python3
"""Bind to PORT immediately, then load the app."""
import sys, os, gc, socket, threading, time, traceback

port = int(os.environ.get("PORT", 8080))
print(f"[start.py] Binding port {port}...", flush=True)

def health_responder():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("0.0.0.0", port))
    s.listen(5)
    s.settimeout(1.0)
    print(f"[start.py] Health responder ready on :{port}", flush=True)
    while not getattr(health_responder, 'stop', False):
        try:
            conn, _ = s.accept()
            conn.sendall(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 15\r\n\r\n{\"status\":\"ok\"}")
            conn.close()
        except socket.timeout:
            continue
        except:
            break
    s.close()

t = threading.Thread(target=health_responder, daemon=True)
t.start()

print("[start.py] Loading app...", flush=True)
gc.collect()
try:
    from app.main import app
    gc.collect()
    print("[start.py] App loaded!", flush=True)
except Exception as e:
    print(f"[start.py] FATAL: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)

health_responder.stop = True
t.join(timeout=2)
time.sleep(0.5)

print("[start.py] Starting uvicorn...", flush=True)
import uvicorn
uvicorn.run(app, host="0.0.0.0", port=port, timeout_keep_alive=120)
