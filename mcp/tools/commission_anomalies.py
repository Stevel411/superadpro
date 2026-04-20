"""
commission_anomalies — math sanity on commissions.

Checks for:
  - Negative amounts (shouldn't happen)
  - Duplicate commissions for same source event
  - Self-referrals (earner == buyer)
  - Commission > source transaction (impossible)
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="commission_anomalies",
    description=(
        "Math sanity checks on commissions. Detects negative amounts, duplicate "
        "events, self-referrals, and commissions that exceed the source amount. "
        "Anything flagged here is a bug that needs immediate attention."
    ),
    category="commission_integrity",
    input_schema={
        "type": "object",
        "properties": {
            "hours": {"type": "integer", "default": 24},
        },
    },
)
def commission_anomalies(db, hours: int = 24):
    hours = min(int(hours or 24), 168)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    anomalies: list[dict] = []

    # 1. Negative amounts (course)
    neg_course = db.execute(text("""
        SELECT id, amount FROM course_commissions
        WHERE created_at >= :since AND amount < 0
        LIMIT 20
    """), {"since": since}).fetchall()
    if neg_course:
        anomalies.append({
            "type": "negative_course_commission",
            "severity": "critical",
            "count": len(neg_course),
            "ids": [r.id for r in neg_course],
        })

    # 2. Negative amounts (grid)
    neg_grid = db.execute(text("""
        SELECT id, amount_usdt FROM commissions
        WHERE created_at >= :since AND amount_usdt < 0
        LIMIT 20
    """), {"since": since}).fetchall()
    if neg_grid:
        anomalies.append({
            "type": "negative_grid_commission",
            "severity": "critical",
            "count": len(neg_grid),
            "ids": [r.id for r in neg_grid],
        })

    # 3. Negative amounts (matrix)
    neg_matrix = db.execute(text("""
        SELECT id, amount FROM credit_matrix_commissions
        WHERE created_at >= :since AND amount < 0
        LIMIT 20
    """), {"since": since}).fetchall()
    if neg_matrix:
        anomalies.append({
            "type": "negative_matrix_commission",
            "severity": "critical",
            "count": len(neg_matrix),
            "ids": [r.id for r in neg_matrix],
        })

    # 4. Self-referral: course commissions where earner == buyer
    self_course = db.execute(text("""
        SELECT id FROM course_commissions
        WHERE created_at >= :since AND earner_id = buyer_id AND earner_id IS NOT NULL
        LIMIT 20
    """), {"since": since}).fetchall()
    if self_course:
        anomalies.append({
            "type": "course_self_referral",
            "severity": "critical",
            "count": len(self_course),
            "ids": [r.id for r in self_course],
        })

    # 5. Self-referral: matrix commissions where earner == from_user
    self_matrix = db.execute(text("""
        SELECT id FROM credit_matrix_commissions
        WHERE created_at >= :since AND earner_id = from_user_id
        LIMIT 20
    """), {"since": since}).fetchall()
    if self_matrix:
        anomalies.append({
            "type": "matrix_self_referral",
            "severity": "critical",
            "count": len(self_matrix),
            "ids": [r.id for r in self_matrix],
        })

    # 6. Duplicate course commissions (same purchase fired commission twice)
    dup_course = db.execute(text("""
        SELECT purchase_id, COUNT(*) as cnt
        FROM course_commissions
        WHERE created_at >= :since
          AND commission_type IN ('direct_sale', 'pass_up', 'platform')
        GROUP BY purchase_id
        HAVING COUNT(*) > 1
        LIMIT 20
    """), {"since": since}).fetchall()
    if dup_course:
        anomalies.append({
            "type": "course_duplicate_commission",
            "severity": "critical",
            "count": len(dup_course),
            "purchase_ids": [r.purchase_id for r in dup_course],
        })

    # 7. Grid commission > package price (sanity: direct_sponsor is 40%, uni_level is 6.25%)
    oversized_grid = db.execute(text("""
        SELECT c.id, c.amount_usdt, c.package_tier, c.commission_type
        FROM commissions c
        WHERE c.created_at >= :since
          AND c.commission_type = 'direct_sponsor'
          AND c.amount_usdt > (
            CASE c.package_tier
              WHEN 1 THEN 20 * 0.40
              WHEN 2 THEN 40 * 0.40
              WHEN 3 THEN 100 * 0.40
              WHEN 4 THEN 200 * 0.40
              WHEN 5 THEN 400 * 0.40
              WHEN 6 THEN 700 * 0.40
              WHEN 7 THEN 1000 * 0.40
              WHEN 8 THEN 2000 * 0.40
              ELSE 2000 * 0.40
            END
          ) + 0.01
        LIMIT 20
    """), {"since": since}).fetchall()
    if oversized_grid:
        anomalies.append({
            "type": "grid_oversized_direct_commission",
            "severity": "critical",
            "count": len(oversized_grid),
            "ids": [r.id for r in oversized_grid],
            "note": "Commission exceeds 40% of package price — impossible under current math",
        })

    return {
        "window_hours": hours,
        "since": since.isoformat(),
        "anomaly_count": len(anomalies),
        "overall_status": "healthy" if not anomalies else "anomalies_detected",
        "anomalies": anomalies,
    }
