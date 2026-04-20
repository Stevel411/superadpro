"""
ai_provider_health — success rate per AI provider for video generations.

Reads superscene_videos table to see recent generation outcomes per provider.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="ai_provider_health",
    description=(
        "Success rate of external AI providers (fal.ai, EvoLink, xAI, etc.) for "
        "Creative Studio generations over the last hour and 24 hours. Critical for "
        "diagnosing Creative Studio errors during launch."
    ),
    category="performance",
    input_schema={"type": "object", "properties": {}},
)
def ai_provider_health(db):
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)
    one_day_ago = now - timedelta(hours=24)

    # Check if superscene_videos table exists (graceful degradation)
    try:
        db.execute(text("SELECT 1 FROM superscene_videos LIMIT 1"))
    except Exception:
        return {
            "status": "unavailable",
            "timestamp": now.isoformat(),
            "message": "superscene_videos table not yet populated or accessible",
        }

    # Group by model_key (which implies provider via routing in superscene_evolink.py)
    rows_1h = db.execute(text("""
        SELECT
            model_key,
            status,
            COUNT(*) as cnt
        FROM superscene_videos
        WHERE created_at >= :t
        GROUP BY model_key, status
    """), {"t": one_hour_ago}).fetchall()

    rows_24h = db.execute(text("""
        SELECT
            model_key,
            status,
            COUNT(*) as cnt
        FROM superscene_videos
        WHERE created_at >= :t
        GROUP BY model_key, status
    """), {"t": one_day_ago}).fetchall()

    def group(rows):
        by_model: dict[str, dict[str, int]] = {}
        for r in rows:
            model = r.model_key or "unknown"
            by_model.setdefault(model, {"total": 0, "completed": 0, "failed": 0, "pending": 0, "processing": 0})
            by_model[model][r.status] = r.cnt
            by_model[model]["total"] += r.cnt
        result = []
        for model, stats in by_model.items():
            total = stats["total"]
            completed = stats.get("completed", 0)
            failed = stats.get("failed", 0)
            success_rate = (completed / total * 100) if total > 0 else None
            result.append({
                "model": model,
                "total": total,
                "completed": completed,
                "failed": failed,
                "pending": stats.get("pending", 0),
                "processing": stats.get("processing", 0),
                "success_rate_pct": round(success_rate, 1) if success_rate is not None else None,
            })
        return sorted(result, key=lambda x: -x["total"])

    hourly = group(rows_1h)
    daily = group(rows_24h)

    # Flag any model with <90% success rate in last hour (and >5 generations)
    flags = []
    for m in hourly:
        if m["total"] >= 5 and m["success_rate_pct"] is not None and m["success_rate_pct"] < 90:
            flags.append({
                "model": m["model"],
                "severity": "high" if m["success_rate_pct"] < 70 else "medium",
                "success_rate_pct": m["success_rate_pct"],
                "failures_last_hour": m["failed"],
            })

    status = "healthy" if not flags else ("degraded" if all(f["severity"] != "high" for f in flags) else "critical")

    return {
        "status": status,
        "timestamp": now.isoformat(),
        "flags": flags,
        "last_hour": hourly,
        "last_24_hours": daily,
    }
