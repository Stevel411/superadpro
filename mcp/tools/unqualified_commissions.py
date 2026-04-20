"""
unqualified_commissions — find commissions paid to members who shouldn't have qualified.

Checks:
  - Grid commissions paid to members with NO active campaign at that tier or above
    (excluding admins who auto-qualify)
  - Course commissions paid to non-admin members without the required tier
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="unqualified_commissions",
    description=(
        "Find commissions paid to members who shouldn't have qualified. E.g. grid "
        "commissions paid to someone without an active campaign, or course pass-up "
        "commissions to someone who doesn't own the tier. Flags overpayments."
    ),
    category="commission_integrity",
    input_schema={
        "type": "object",
        "properties": {
            "hours": {"type": "integer", "default": 24},
        },
    },
)
def unqualified_commissions(db, hours: int = 24):
    hours = min(int(hours or 24), 168)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    issues: list[dict] = []

    # Grid: direct_sponsor commissions where recipient has no active campaign at that tier
    # (campaign qualifies if tier >= package_tier, is_completed=False OR grace_expires_at > now)
    grid_unqual = db.execute(text("""
        SELECT c.id, c.to_user_id, c.package_tier, c.amount_usdt
        FROM commissions c
        JOIN users u ON u.id = c.to_user_id
        WHERE c.created_at >= :since
          AND c.commission_type IN ('direct_sponsor', 'uni_level')
          AND c.to_user_id IS NOT NULL
          AND u.is_admin = false
          AND NOT EXISTS (
            SELECT 1 FROM video_campaigns vc
            WHERE vc.user_id = c.to_user_id
              AND vc.campaign_tier >= c.package_tier
              AND vc.status = 'active'
              AND (
                vc.is_completed = false
                OR (vc.grace_expires_at IS NOT NULL AND vc.grace_expires_at > NOW())
              )
          )
        LIMIT 30
    """), {"since": since}).fetchall()
    if grid_unqual:
        total = sum(float(r.amount_usdt or 0) for r in grid_unqual)
        issues.append({
            "check": "grid_unqualified_recipient",
            "severity": "high",
            "count": len(grid_unqual),
            "total_overpaid_usd": round(total, 2),
            "description": "Grid commission paid to member without active campaign at required tier",
            "sample_commission_ids": [r.id for r in grid_unqual[:10]],
        })

    # Course: pass_up commissions where recipient isn't admin AND doesn't own the tier
    course_unqual = db.execute(text("""
        SELECT cc.id, cc.earner_id, cc.course_tier, cc.amount
        FROM course_commissions cc
        JOIN users u ON u.id = cc.earner_id
        JOIN courses c ON c.id = (
          SELECT course_id FROM course_purchases cp WHERE cp.id = cc.purchase_id LIMIT 1
        )
        WHERE cc.created_at >= :since
          AND cc.commission_type IN ('direct_sale', 'pass_up')
          AND cc.earner_id IS NOT NULL
          AND u.is_admin = false
          AND NOT EXISTS (
            SELECT 1 FROM course_purchases cp2
            JOIN courses c2 ON c2.id = cp2.course_id
            WHERE cp2.user_id = cc.earner_id
              AND c2.tier >= cc.course_tier
          )
        LIMIT 30
    """), {"since": since}).fetchall()
    if course_unqual:
        total = sum(float(r.amount or 0) for r in course_unqual)
        issues.append({
            "check": "course_unqualified_recipient",
            "severity": "high",
            "count": len(course_unqual),
            "total_overpaid_usd": round(total, 2),
            "description": "Course commission paid to member who doesn't own the required tier",
            "sample_commission_ids": [r.id for r in course_unqual[:10]],
        })

    return {
        "window_hours": hours,
        "since": since.isoformat(),
        "issue_count": len(issues),
        "overall_status": "healthy" if not issues else "overpayments_detected",
        "issues": issues,
    }
