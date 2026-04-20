"""
slowness_detector — monitors endpoint response times vs baseline.

NOTE: This tool requires baseline response time data. Since the main app doesn't
yet log endpoint response times to the DB, this tool currently returns a stub
response indicating the monitoring infrastructure needs to be added.

TODO (future): Add middleware in app/main.py that logs every request's response time
to a table like `endpoint_metrics(path, response_time_ms, timestamp)`. Once that's
in place, this tool queries that table vs. a 7-day rolling baseline.
"""
from datetime import datetime, timezone
from .registry import register_tool


@register_tool(
    name="slowness_detector",
    description=(
        "Measures response times of key endpoints vs baseline. Flags endpoints "
        "running >3x their normal speed. NOTE: Currently returns a not-yet-implemented "
        "status — requires response time logging middleware to be added to the main app."
    ),
    category="performance",
    input_schema={"type": "object", "properties": {}},
)
def slowness_detector(db):
    return {
        "status": "not_implemented",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": (
            "Response time logging middleware not yet deployed in main app. "
            "Add a request-timing middleware that logs to an endpoint_metrics table, "
            "then this tool will compare live response times to a 7-day rolling baseline."
        ),
        "required_infrastructure": [
            "Middleware in app/main.py that times every request",
            "endpoint_metrics table: id, path, response_time_ms, status_code, timestamp",
            "7-day baseline calculation (p50, p95, p99 per endpoint)",
        ],
    }
