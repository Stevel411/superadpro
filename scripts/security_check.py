#!/usr/bin/env python3
"""SuperAdPro pre-push security guardrail. See SECURITY.md.

Run before every push:   python3 scripts/security_check.py

HARD FAIL (exit 1): hardcoded secrets in source.
WARN (exit 0):      state-changing GET routes (tracked for the auth rebuild).
"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "app"

# Lines that legitimately reference secrets via env are fine.
ALLOW = re.compile(r"_get_required_secret|os\.getenv|os\.environ|getenv|environ\.get")

# A secret literal in source = hard fail.
SECRET_PATTERNS = [
    re.compile(r'secret\s*[!=]=\s*["\']'),                                   # secret != "literal"
    re.compile(r'-2026["\']'),                                               # name-word-2026 secret style
    re.compile(r'(api[_-]?key|password|passwd|token)\s*=\s*["\'][^"\']{8,}["\']', re.I),
]

# "Type this exact phrase to confirm" interlocks for one-off destructive ops.
# These sit BEHIND the admin secret, so they are defense-in-depth, not auth
# secrets — reported as a warning, not a hard fail.
INTERLOCK = re.compile(r'(CONFIRM|EXECUTE|BACKFILL|RESTORE|VOID|REVERSAL)[A-Z0-9_]*\s*=\s*["\']')

# Mutation signals inside a route body.
MUT = re.compile(r"\b(db\.commit|db\.add|db\.delete|session\.commit)\b|\b(INSERT|UPDATE|DELETE)\s", re.I)
DEC = re.compile(r'@app\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)')

hard, warn, interlocks = [], [], []

for path in sorted(APP.rglob("*.py")):
    rel = path.relative_to(ROOT)
    lines = path.read_text(errors="replace").splitlines()

    # 1) hardcoded secrets (hard fail)
    for i, ln in enumerate(lines, 1):
        if ALLOW.search(ln):
            continue
        if INTERLOCK.search(ln):
            interlocks.append(f"{rel}:{i}: {ln.strip()[:80]}")
            continue
        for pat in SECRET_PATTERNS:
            if pat.search(ln):
                hard.append(f"{rel}:{i}: {ln.strip()[:90]}")
                break

    # 2) state-changing GET routes (warn)
    cur = None
    body = []

    def flush(cur, body):
        if cur and cur[0] == "get" and MUT.search("\n".join(body)):
            warn.append(f'{rel}:{cur[2]}: @app.get("{cur[1]}") mutates state')

    for i, ln in enumerate(lines, 1):
        m = DEC.search(ln)
        if m:
            flush(cur, body)
            cur, body = (m.group(1), m.group(2), i), []
        elif cur is not None:
            body.append(ln)
    flush(cur, body)

print("=== SuperAdPro security check ===")
if warn:
    print(f"\nWARN — {len(warn)} state-changing GET route(s) (track for auth rebuild):")
    for w in warn[:15]:
        print(f"  {w}")
    if len(warn) > 15:
        print(f"  ... and {len(warn) - 15} more")

if interlocks:
    print(f"\nINFO — {len(interlocks)} confirm/execute interlock(s) (OK if behind admin auth):")
    for it in interlocks:
        print(f"  {it}")

if hard:
    print(f"\nFAIL — {len(hard)} hardcoded secret(s) in source:")
    for h in hard:
        print(f"  {h}")
    print("\nMove these to env vars (fail closed). See SECURITY.md rule 1.")
    sys.exit(1)

print("\nPASS — no hardcoded secrets found.")
sys.exit(0)
