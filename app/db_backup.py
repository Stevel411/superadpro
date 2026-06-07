"""
Database backup to Cloudflare R2 — pure-Python logical dump.

History: the original implementation shelled out to `pg_dump | gzip`. pg_dump
is NOT installed in the Railway runtime container, so every run failed at
"command not found" and the platform had no working backups — which is exactly
what turned a one-time commission/grid detail loss into an unrecoverable one.

This version removes the system-binary dependency entirely: it reads every
table through the existing SQLAlchemy engine, serialises to JSON (with proper
handling of datetime/Decimal/bytes/UUID), gzips, and uploads to the same R2
bucket the old path used. It is version-agnostic (no pg_dump/server version
match required) and the JSON format is fully restorable. The backup payload
also carries a per-table row-count manifest so a sudden drop is detectable.
"""
import os
import json
import gzip
import uuid as _uuid
from decimal import Decimal
from datetime import datetime, date, timezone

from .r2_storage import _get_client, R2_BUCKET, r2_available
from .database import engine, Base
from sqlalchemy import text

BACKUP_PREFIX = "backups/"
MAX_BACKUPS = 7  # keep a week of daily backups
BACKUP_FORMAT = "superadpro-logical-json-v1"


def _json_default(o):
    """Serialise types the stdlib json encoder can't handle."""
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    if isinstance(o, Decimal):
        return str(o)
    if isinstance(o, (bytes, bytearray)):
        return o.decode("utf-8", "replace")
    if isinstance(o, _uuid.UUID):
        return str(o)
    return str(o)


def run_backup() -> dict:
    """Logical-dump every table to JSON, gzip, upload to R2. Returns status dict.

    No external binaries. Reads through the live SQLAlchemy engine in FK-sorted
    order (restore-friendly). Captures a row-count manifest in meta.
    """
    if not r2_available():
        return {"error": "R2 not configured — set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY"}

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"superadpro_{timestamp}.json.gz"
    key = f"{BACKUP_PREFIX}{filename}"

    try:
        tables_data = {}
        row_counts = {}
        total_rows = 0

        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            for table in Base.metadata.sorted_tables:
                name = table.name
                try:
                    result = conn.execute(text(f'SELECT * FROM "{name}"'))
                    rows = [dict(m) for m in result.mappings()]
                except Exception as te:
                    # AUTOCOMMIT means a failed SELECT (e.g. a metadata table
                    # not yet migrated) can't poison subsequent reads. Defensive
                    # rollback in case the driver still needs it.
                    try:
                        conn.rollback()
                    except Exception:
                        pass
                    tables_data[name] = {"_error": str(te)[:300]}
                    row_counts[name] = -1
                    continue
                tables_data[name] = rows
                row_counts[name] = len(rows)
                total_rows += len(rows)

        payload = {
            "meta": {
                "timestamp": timestamp,
                "format": BACKUP_FORMAT,
                "table_count": len(tables_data),
                "total_rows": total_rows,
                "row_counts": row_counts,
            },
            "tables": tables_data,
        }

        raw = json.dumps(payload, default=_json_default, separators=(",", ":")).encode("utf-8")
        blob = gzip.compress(raw, compresslevel=9)

        client = _get_client()
        client.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=blob,
            ContentType="application/gzip",
        )

        _prune_old_backups(client)

        return {
            "success": True,
            "file": filename,
            "format": BACKUP_FORMAT,
            "size_mb": round(len(blob) / 1024 / 1024, 3),
            "size_bytes": len(blob),
            "timestamp": timestamp,
            "bucket": R2_BUCKET,
            "table_count": len(tables_data),
            "total_rows": total_rows,
            "row_counts": row_counts,
        }

    except Exception as e:
        return {"error": str(e), "exception_type": type(e).__name__}


def _prune_old_backups(client):
    """Delete oldest backups, keeping only MAX_BACKUPS (matches .json.gz and legacy .sql.gz)."""
    try:
        response = client.list_objects_v2(Bucket=R2_BUCKET, Prefix=BACKUP_PREFIX)
        objects = response.get("Contents", [])
        backup_files = [o for o in objects if o["Key"].endswith((".json.gz", ".sql.gz"))]
        backup_files.sort(key=lambda x: x["LastModified"], reverse=True)
        for old in backup_files[MAX_BACKUPS:]:
            client.delete_object(Bucket=R2_BUCKET, Key=old["Key"])
    except Exception:
        pass  # non-critical


def list_backups() -> list:
    """List existing backups in R2 (newest first)."""
    if not r2_available():
        return []
    try:
        client = _get_client()
        response = client.list_objects_v2(Bucket=R2_BUCKET, Prefix=BACKUP_PREFIX)
        objects = response.get("Contents", [])
        backups = []
        for obj in objects:
            if obj["Key"].endswith((".json.gz", ".sql.gz")):
                backups.append({
                    "file": obj["Key"].replace(BACKUP_PREFIX, ""),
                    "size_mb": round(obj["Size"] / 1024 / 1024, 3),
                    "date": obj["LastModified"].isoformat(),
                })
        backups.sort(key=lambda x: x["date"], reverse=True)
        return backups
    except Exception:
        return []


def load_backup(key_or_file: str) -> dict:
    """Fetch + decompress a backup payload from R2 for inspection or restore.

    Accepts either a bare filename ('superadpro_...json.gz') or full key.
    Returns the parsed payload dict, or {'error': ...}.
    """
    if not r2_available():
        return {"error": "R2 not configured"}
    key = key_or_file if key_or_file.startswith(BACKUP_PREFIX) else f"{BACKUP_PREFIX}{key_or_file}"
    try:
        client = _get_client()
        obj = client.get_object(Bucket=R2_BUCKET, Key=key)
        blob = obj["Body"].read()
        raw = gzip.decompress(blob)
        return json.loads(raw)
    except Exception as e:
        return {"error": str(e), "exception_type": type(e).__name__}
