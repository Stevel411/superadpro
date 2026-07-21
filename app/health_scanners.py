"""
SuperAdPro — Platform Health Scanner Framework
================================================

Read-only diagnostic scanners for matrix integrity, commission routing,
member state, referral graph, pack ownership, membership tiers, R2 storage,
and session anomalies.

Each scanner is a function that takes a Session and returns a ScanResult
dict (see ScanResult contract below).

Scanners are registered in SCANNER_REGISTRY and exposed via:
  GET  /admin/api/health/summary         — run all, return summary
  GET  /admin/api/health/scan/{name}     — run one, return full result
  GET  /admin/health                     — admin UI dashboard

Repair tools live separately in app/health_repair.py — they WRITE to the
DB and have a higher engineering bar (dry-run default, audit log, etc).

Design principles:
  1. Read-only. Scanners never mutate state.
  2. Live ledger is truth — when cached counters differ from sums, the
     sum wins and the cache is flagged for recompute.
  3. Cheap to run. Each scanner should complete in < 5 seconds for the
     current member count. If a scanner is slow, paginate or sample.
  4. Self-describing. Each issue includes severity, subject, details,
     and a suggested_action string that points at the repair tool.
  5. Single-issue actionability. Don't bundle 100 unrelated issues into
     one entry — one matrix per issue, one user per issue, etc.

Built 13 May 2026 in response to Steve's observation that the platform
needs proactive observability as member count grows.
"""

from __future__ import annotations
import time
import logging
from datetime import datetime, timezone
from typing import Callable

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
#  SEVERITY
# ─────────────────────────────────────────────────────────────────
SEV_OK = "ok"
SEV_WARNING = "warning"
SEV_CRITICAL = "critical"

# Issue "kinds" are short codes that group similar issues so the UI can
# offer a "Show only X" filter without parsing free-text. Each scanner
# declares its own kinds.


def make_issue(severity: str, kind: str, subject: str, details: dict,
               suggested_action: str = "") -> dict:
    """Build a single issue dict with the standard shape."""
    return {
        "severity": severity,
        "kind": kind,
        "subject": subject,
        "details": details or {},
        "suggested_action": suggested_action or "",
    }


def aggregate_status(issues: list[dict]) -> str:
    """Pick the worst severity across all issues, return 'ok' if empty."""
    if not issues:
        return SEV_OK
    severities = {i["severity"] for i in issues}
    if SEV_CRITICAL in severities:
        return SEV_CRITICAL
    if SEV_WARNING in severities:
        return SEV_WARNING
    return SEV_OK


def make_result(scan_name: str, status: str, summary: dict, issues: list[dict],
                duration_ms: int) -> dict:
    """Build a ScanResult dict with the standard shape."""
    return {
        "scan_name": scan_name,
        "status": status,
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        "summary": summary,
        "issues": issues,
    }


def run_scanner(scanner_fn: Callable, scan_name: str, db: Session) -> dict:
    """Wrap a scanner function with timing + error handling.

    If the scanner itself raises, we return a critical-status result
    describing the crash — better than a 500 from the admin UI.
    """
    started = time.time()
    try:
        result = scanner_fn(db)
        # Allow scanners to return a partial dict; fill in metadata here
        result.setdefault("scan_name", scan_name)
        result.setdefault("ran_at", datetime.now(timezone.utc).isoformat())
        result["duration_ms"] = int((time.time() - started) * 1000)
        # Auto-aggregate status from issues if scanner didn't set it
        if "status" not in result:
            result["status"] = aggregate_status(result.get("issues", []))
        return result
    except Exception as exc:
        logger.exception(f"Scanner {scan_name} crashed: {exc}")
        # A failed query (e.g. a missing table) leaves the Postgres transaction
        # in an ABORTED state. Without a rollback here, EVERY subsequent scanner
        # sharing this session fails with "current transaction is aborted"
        # (InternalError) — turning one real crash into a cascade of fake ones.
        # Roll back so the session is usable again for the next scanner.
        try:
            db.rollback()
        except Exception:
            logger.exception("Failed to roll back session after scanner crash")
        return make_result(
            scan_name=scan_name,
            status=SEV_CRITICAL,
            summary={
                "headline": f"Scanner crashed: {type(exc).__name__}",
                "error": str(exc)[:500],
            },
            issues=[make_issue(
                severity=SEV_CRITICAL,
                kind="scanner_crash",
                subject=f"Scanner '{scan_name}'",
                details={"error": str(exc)[:500], "error_type": type(exc).__name__},
                suggested_action="Check server logs for traceback",
            )],
            duration_ms=int((time.time() - started) * 1000),
        )


# ─────────────────────────────────────────────────────────────────
#  REGISTRY
# ─────────────────────────────────────────────────────────────────
# Populated by the scanner modules at import time. Each entry:
#   { name: str, label: str, tier: int, category: str, fn: Callable }
#
# Tiers loosely match the design doc:
#   1 — Matrix & Compensation Integrity
#   2 — Member State & Lifecycle
#   3 — Membership Plan Correctness
#   4 — Operational
SCANNER_REGISTRY: list[dict] = []


def register_scanner(name: str, label: str, tier: int, category: str,
                     description: str = "", requires_grid: bool = False):
    """Decorator to register a scanner function.

    requires_grid=True marks a scanner that audits the legacy Profit Grid /
    matrix system. AdvantageLife retired the grid (pure 3/6/9 pass-up), so on
    the AL deploy those tables don't exist and the scanner would crash. The
    runner skips grid scanners on AL and reports them as 'not applicable'.
    """
    def decorator(fn: Callable):
        SCANNER_REGISTRY.append({
            "name": name,
            "label": label,
            "tier": tier,
            "category": category,
            "description": description,
            "requires_grid": requires_grid,
            "fn": fn,
        })
        return fn
    return decorator


def list_scanners() -> list[dict]:
    """Return the registry with the function references stripped (JSON-safe)."""
    return [
        {"name": s["name"], "label": s["label"], "tier": s["tier"],
         "category": s["category"], "description": s["description"]}
        for s in SCANNER_REGISTRY
    ]


def get_scanner(name: str) -> dict | None:
    """Look up a registered scanner by name."""
    for s in SCANNER_REGISTRY:
        if s["name"] == name:
            return s
    return None
