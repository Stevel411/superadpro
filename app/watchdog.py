"""
SuperAdPro AI Watchdog — Automated platform monitoring & self-healing.

Three layers:
  Layer 1 — Cron watchdog: routine checks, auto-fixes known issues
  Layer 2 — AI escalation: Claude Sonnet reasons about unknown issues
  Layer 3 — Alert: emails owner when human intervention needed

Kill switch: Set WATCHDOG_ENABLED=true in Railway env vars to activate.
Defaults to OFF — will not run until you go live.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text

from .database import (
    User, Grid, Payment, Commission, Withdrawal, WatchdogLog,
    GRID_TOTAL, get_db
)

logger = logging.getLogger("watchdog")

# ── Configuration ────────────────────────────────────────────────────────────
WATCHDOG_ENABLED = os.environ.get("WATCHDOG_ENABLED", "false").lower() == "true"
AI_MODEL = "claude-sonnet-4-5-20250929"
OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "")


def is_enabled() -> bool:
    """Check kill switch."""
    return WATCHDOG_ENABLED


def _log(db: Session, run_type: str, status: str, summary: str,
         details: dict = None, ai_used: bool = False, ai_model: str = None, ai_tokens: int = 0):
    """Write to watchdog_logs table."""
    entry = WatchdogLog(
        run_type=run_type,
        status=status,
        summary=summary,
        details=json.dumps(details) if details else None,
        ai_used=ai_used,
        ai_model=ai_model,
        ai_tokens=ai_tokens,
    )
    db.add(entry)
    db.commit()
    return entry


# ═══════════════════════════════════════════════════════════════════════════
#  LAYER 1 — Routine health checks & auto-fixes
# ═══════════════════════════════════════════════════════════════════════════

def run_health_check(db: Session) -> dict:
    """
    Comprehensive platform health scan.
    Returns a report dict with issues found and actions taken.
    """
    report = {
        "timestamp": datetime.utcnow().isoformat(),
        "checks": [],
        "issues": [],
        "auto_fixed": [],
        "needs_attention": [],
        "stats": {}
    }

    # ── 1. Negative balances ──
    neg_users = db.query(User).filter(User.balance < 0).all()
    if neg_users:
        report["issues"].append({
            "type": "negative_balances",
            "severity": "warning",
            "count": len(neg_users),
            "users": [{"id": u.id, "username": u.username, "balance": float(u.balance)} for u in neg_users]
        })
    report["checks"].append({"name": "Negative balances", "status": "warn" if neg_users else "ok",
                              "detail": f"{len(neg_users)} users" if neg_users else "All clear"})

    # ── 2. Stuck payments (pending > 1 hour) ──
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    stuck = db.query(Payment).filter(
        Payment.status == "pending",
        Payment.created_at < one_hour_ago
    ).all()
    if stuck:
        report["issues"].append({
            "type": "stuck_payments",
            "severity": "warning",
            "count": len(stuck),
            "payment_ids": [p.id for p in stuck]
        })
    report["checks"].append({"name": "Stuck payments (>1hr)", "status": "warn" if stuck else "ok",
                              "detail": f"{len(stuck)} stuck" if stuck else "All clear"})

    # ── 3. Grids that should have advanced ──
    overfilled = db.query(Grid).filter(
        Grid.is_complete == False,
        Grid.positions_filled >= GRID_TOTAL
    ).all()
    if overfilled:
        report["issues"].append({
            "type": "overfilled_grids",
            "severity": "error",
            "count": len(overfilled),
            "grid_ids": [g.id for g in overfilled]
        })
    report["checks"].append({"name": "Grid advance integrity", "status": "error" if overfilled else "ok",
                              "detail": f"{len(overfilled)} stuck" if overfilled else "All clear"})

    # ── 4. Pending withdrawals (> 24 hours) ──
    day_ago = datetime.utcnow() - timedelta(hours=24)
    old_withdrawals = db.query(Withdrawal).filter(
        Withdrawal.status == "pending",
        Withdrawal.created_at < day_ago
    ).all()
    if old_withdrawals:
        report["issues"].append({
            "type": "old_withdrawals",
            "severity": "warning",
            "count": len(old_withdrawals)
        })
    report["checks"].append({"name": "Stale withdrawals (>24hr)", "status": "warn" if old_withdrawals else "ok",
                              "detail": f"{len(old_withdrawals)} pending" if old_withdrawals else "All clear"})

    # ── 6. Commission integrity (users with negative total_earned) ──
    neg_earned = db.query(User).filter(User.total_earned < 0).all()
    if neg_earned:
        report["issues"].append({
            "type": "negative_earnings",
            "severity": "error",
            "count": len(neg_earned)
        })
    report["checks"].append({"name": "Earnings integrity", "status": "error" if neg_earned else "ok",
                              "detail": f"{len(neg_earned)} anomalies" if neg_earned else "All clear"})

    # ── 7. Platform stats ──
    report["stats"] = {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(User.is_active == True).count(),
        "active_grids": db.query(Grid).filter(Grid.is_complete == False).count(),
        "completed_grids": db.query(Grid).filter(Grid.is_complete == True).count(),
        "pending_withdrawals": db.query(Withdrawal).filter(Withdrawal.status == "pending").count(),
        "total_revenue": float(db.execute(
            text("SELECT COALESCE(SUM(amount_usdt),0) FROM payments WHERE status='confirmed'")
        ).scalar()),
    }

    return report


def auto_fix(db: Session, report: dict) -> dict:
    """
    Apply automatic fixes for known issue types.
    Returns what was fixed.
    """
    fixed = []

    for issue in report.get("issues", []):
        itype = issue["type"]

        # Fix negative balances → set to 0
        if itype == "negative_balances":
            count = db.query(User).filter(User.balance < 0).update(
                {User.balance: 0}, synchronize_session=False
            )
            db.commit()
            fixed.append({"type": itype, "action": f"Reset {count} negative balances to $0"})

        # Fix overfilled grids → force advance
        elif itype == "overfilled_grids":
            from .grid import _complete_grid
            for gid in issue.get("grid_ids", []):
                grid = db.query(Grid).filter(Grid.id == gid).first()
                if grid and not grid.is_complete:
                    _complete_grid(db, grid)
                    db.commit()
            fixed.append({"type": itype, "action": f"Force-advanced {len(issue.get('grid_ids', []))} stuck grids"})

        # Other issue types → escalate (don't auto-fix)
        else:
            report.setdefault("needs_attention", []).append(issue)

    return {"fixed": fixed, "escalated": report.get("needs_attention", [])}


# ═══════════════════════════════════════════════════════════════════════════
#  LAYER 2 — AI Escalation (Claude Sonnet)
# ═══════════════════════════════════════════════════════════════════════════

def ai_escalate(db: Session, issues: list, report: dict) -> dict:
    """
    Send unresolved issues to Claude Sonnet for analysis and recommended actions.
    Returns AI's assessment and recommendations.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"error": "No ANTHROPIC_API_KEY set", "recommendation": "Set API key in Railway env vars"}

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        system_prompt = """You are the AI operations manager for SuperAdPro, a video advertising SaaS platform.
You receive health check reports and must decide what action to take.

Available fix endpoints (call via POST to /admin/api/fix/{type}):
- stuck_payments: marks old pending payments as failed
- negative_balances: resets negative balances to 0
- orphan_grids: cleans up grids with no owner

Available admin endpoints:
- GET /admin/api/users — list/search users
- POST /admin/api/user/{id}/adjust-balance — credit/debit a user's balance
- POST /admin/api/user/{id}/toggle-active — activate/deactivate user
- GET /admin/api/health — full health check
- GET /admin/api/finances — financial overview

Respond in JSON format with:
{
    "severity": "low|medium|high|critical",
    "diagnosis": "what's wrong",
    "recommended_actions": ["list of specific actions to take"],
    "can_auto_fix": true/false,
    "fix_commands": [{"endpoint": "...", "method": "POST", "body": {...}}],
    "alert_owner": true/false,
    "alert_message": "message for owner if alert needed"
}"""

        user_msg = f"""Health check report at {report['timestamp']}:

Platform stats: {json.dumps(report['stats'], indent=2)}

Issues needing attention:
{json.dumps(issues, indent=2)}

Auto-fixes already applied:
{json.dumps(report.get('auto_fixed', []), indent=2)}

Analyse these issues and recommend actions."""

        response = client.messages.create(
            model=AI_MODEL,
            max_tokens=1000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_msg}]
        )

        ai_text = response.content[0].text
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        # Try to parse JSON from response
        try:
            # Strip markdown fences if present
            clean = ai_text.replace("```json", "").replace("```", "").strip()
            ai_result = json.loads(clean)
        except json.JSONDecodeError:
            ai_result = {"raw_response": ai_text, "parse_error": True}

        # Log the AI interaction
        _log(db, "ai_escalation", ai_result.get("severity", "unknown"),
             ai_result.get("diagnosis", "AI analysis complete"),
             details=ai_result, ai_used=True, ai_model=AI_MODEL, ai_tokens=tokens_used)

        return ai_result

    except Exception as e:
        logger.error(f"AI escalation failed: {e}")
        return {"error": str(e), "recommendation": "Check ANTHROPIC_API_KEY and network connectivity"}


# ═══════════════════════════════════════════════════════════════════════════
#  LAYER 3 — Alert owner
# ═══════════════════════════════════════════════════════════════════════════

def alert_owner(db: Session, message: str, details: dict = None):
    """Send alert email to platform owner."""
    from .email_service import send_email
    owner_email = OWNER_EMAIL or os.environ.get("MAIL_FROM", "")
    if not owner_email:
        logger.warning("No OWNER_EMAIL set, cannot send alert")
        _log(db, "alert", "error", f"Alert failed (no email): {message}", details=details)
        return

    try:
        html = f"""
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#f87171">🚨 SuperAdPro Watchdog Alert</h2>
            <p style="font-size:16px;color:#334155">{message}</p>
            <pre style="background:#f1f5f9;padding:16px;border-radius:8px;font-size:12px;overflow:auto">{json.dumps(details, indent=2) if details else 'No additional details'}</pre>
            <p style="font-size:13px;color:#94a3b8">Automated alert from SuperAdPro AI Watchdog · {datetime.utcnow().strftime('%d %b %Y %H:%M')} UTC</p>
        </div>
        """
        send_email(owner_email, "🚨 SuperAdPro Watchdog Alert", html)
        _log(db, "alert", "warning", f"Alert sent: {message}", details=details)
    except Exception as e:
        logger.error(f"Alert email failed: {e}")
        _log(db, "alert", "error", f"Alert email failed: {e}", details=details)


# ═══════════════════════════════════════════════════════════════════════════
#  MAIN WATCHDOG RUN — called by cron endpoint
# ═══════════════════════════════════════════════════════════════════════════

def run_watchdog(db: Session) -> dict:
    """
    Full watchdog cycle: check → fix → escalate → alert.
    Returns complete run report.
    """
    if not is_enabled():
        return {
            "status": "disabled",
            "message": "Watchdog is OFF. Set WATCHDOG_ENABLED=true in Railway env vars to activate."
        }

    logger.info("🐕 Watchdog run starting...")
    result = {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

    # Layer 1: Health check
    report = run_health_check(db)
    result["health"] = report

    if not report["issues"]:
        _log(db, "health_check", "ok", "All systems healthy", details=report["stats"])
        result["message"] = "All systems healthy — no issues found"
        logger.info("✅ Watchdog: all clear")
        return result

    # Layer 1b: Auto-fix known issues
    fix_result = auto_fix(db, report)
    result["auto_fixed"] = fix_result["fixed"]

    if fix_result["fixed"]:
        _log(db, "auto_fix", "fixed",
             f"Auto-fixed {len(fix_result['fixed'])} issues",
             details=fix_result["fixed"])
        logger.info(f"🔧 Watchdog auto-fixed: {len(fix_result['fixed'])} issues")

    # Layer 2: AI escalation for remaining issues
    if fix_result["escalated"]:
        logger.info(f"🤖 Escalating {len(fix_result['escalated'])} issues to AI...")
        ai_result = ai_escalate(db, fix_result["escalated"], report)
        result["ai_analysis"] = ai_result

        # Layer 3: Alert owner if AI says so
        if ai_result.get("alert_owner"):
            alert_owner(db, ai_result.get("alert_message", "Issues detected requiring attention"),
                        details={"ai_analysis": ai_result, "issues": fix_result["escalated"]})
            result["alert_sent"] = True

    result["message"] = f"Watchdog complete: {len(report['issues'])} issues found, {len(fix_result['fixed'])} auto-fixed, {len(fix_result['escalated'])} escalated"
    logger.info(f"🐕 Watchdog complete: {result['message']}")
    return result
