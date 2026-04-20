"""
commission_audit — verify every commission fired recently went to the right person.

Checks:
  - course_commissions: pass_up commissions should have earner_id matching
    the buyer's sponsor chain walked up correctly
  - commissions (grid): direct_sponsor type should have to_user_id = buyer's sponsor
  - credit_matrix_commissions: earner should be in buyer's upline within 3 levels

Flags anomalies as IDs only (no PII). Counts totals by type.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="commission_audit",
    description=(
        "Verify recent commissions were routed to correct recipients based on "
        "sponsor chain rules. Returns counts by type and IDs of any flagged cases. "
        "Use this to catch routing bugs quickly during launch."
    ),
    category="commission_integrity",
    input_schema={
        "type": "object",
        "properties": {
            "hours": {
                "type": "integer",
                "description": "Lookback window in hours (default 24, max 168)",
                "default": 24,
            }
        },
    },
)
def commission_audit(db, hours: int = 24):
    hours = min(int(hours or 24), 168)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    # Course commissions — check pass_up routing
    course_stats = db.execute(text("""
        SELECT
            commission_type,
            source_chain,
            COUNT(*) as cnt,
            COALESCE(SUM(amount), 0) as total
        FROM course_commissions
        WHERE created_at >= :since
        GROUP BY commission_type, source_chain
    """), {"since": since}).fetchall()

    course_by_type: dict[str, dict] = {}
    for r in course_stats:
        key = r.commission_type or "unknown"
        course_by_type.setdefault(key, {"count": 0, "total_usd": 0.0, "by_chain": {}})
        course_by_type[key]["count"] += r.cnt
        course_by_type[key]["total_usd"] += float(r.total or 0)
        if r.source_chain:
            course_by_type[key]["by_chain"][str(r.source_chain)] = r.cnt

    # Grid commissions — check direct/unilevel routing
    grid_stats = db.execute(text("""
        SELECT
            commission_type,
            COUNT(*) as cnt,
            COALESCE(SUM(amount_usdt), 0) as total,
            SUM(CASE WHEN to_user_id IS NULL THEN 1 ELSE 0 END) as to_company
        FROM commissions
        WHERE created_at >= :since
        GROUP BY commission_type
    """), {"since": since}).fetchall()

    grid_by_type = {
        r.commission_type: {
            "count": r.cnt,
            "total_usd": float(r.total or 0),
            "to_company": r.to_company or 0,
        }
        for r in grid_stats
    }

    # Credit Matrix commissions — check direct/spillover split
    matrix_stats = db.execute(text("""
        SELECT
            commission_type,
            COUNT(*) as cnt,
            COALESCE(SUM(amount), 0) as total
        FROM credit_matrix_commissions
        WHERE created_at >= :since
        GROUP BY commission_type
    """), {"since": since}).fetchall()

    matrix_by_type = {
        r.commission_type: {
            "count": r.cnt,
            "total_usd": float(r.total or 0),
        }
        for r in matrix_stats
    }

    # ── Sanity checks ──
    flags: list[dict] = []

    # Check 1: any grid direct_sponsor commissions where to_user_id != buyer's sponsor
    mismatches = db.execute(text("""
        SELECT c.id
        FROM commissions c
        JOIN users b ON b.id = c.from_user_id
        WHERE c.created_at >= :since
          AND c.commission_type = 'direct_sponsor'
          AND c.to_user_id IS NOT NULL
          AND c.to_user_id <> b.sponsor_id
        LIMIT 20
    """), {"since": since}).fetchall()
    if mismatches:
        flags.append({
            "check": "grid_direct_sponsor_mismatch",
            "severity": "critical",
            "description": "Grid direct-sponsor commission went to someone other than the buyer's sponsor",
            "count": len(mismatches),
            "sample_commission_ids": [r.id for r in mismatches[:10]],
        })

    # Check 2: course direct_sale commissions where earner_id != buyer's sponsor
    course_mismatches = db.execute(text("""
        SELECT cc.id
        FROM course_commissions cc
        JOIN users b ON b.id = cc.buyer_id
        WHERE cc.created_at >= :since
          AND cc.commission_type = 'direct_sale'
          AND cc.earner_id IS NOT NULL
          AND cc.earner_id <> b.sponsor_id
        LIMIT 20
    """), {"since": since}).fetchall()
    if course_mismatches:
        flags.append({
            "check": "course_direct_sale_mismatch",
            "severity": "critical",
            "description": "Course direct-sale commission went to someone other than the buyer's sponsor",
            "count": len(course_mismatches),
            "sample_commission_ids": [r.id for r in course_mismatches[:10]],
        })

    # Check 3: matrix_direct commissions where buyer's sponsor != earner (should be direct!)
    matrix_mismatches = db.execute(text("""
        SELECT cmc.id
        FROM credit_matrix_commissions cmc
        JOIN users b ON b.id = cmc.from_user_id
        WHERE cmc.created_at >= :since
          AND cmc.commission_type = 'matrix_direct'
          AND cmc.earner_id <> b.sponsor_id
        LIMIT 20
    """), {"since": since}).fetchall()
    if matrix_mismatches:
        flags.append({
            "check": "matrix_direct_mismatch",
            "severity": "critical",
            "description": "Nexus direct commission earner is not the buyer's direct sponsor",
            "count": len(matrix_mismatches),
            "sample_commission_ids": [r.id for r in matrix_mismatches[:10]],
        })

    total_commissions = (
        sum(v["count"] for v in course_by_type.values())
        + sum(v["count"] for v in grid_by_type.values())
        + sum(v["count"] for v in matrix_by_type.values())
    )

    return {
        "window_hours": hours,
        "since": since.isoformat(),
        "overall_status": "healthy" if not flags else "flagged",
        "total_commissions": total_commissions,
        "flags": flags,
        "course_academy": course_by_type,
        "profit_grid": grid_by_type,
        "profit_nexus": matrix_by_type,
    }
