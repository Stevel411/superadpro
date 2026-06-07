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

        drops = _alert_on_drops(row_counts)

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
            "drops_flagged": drops,
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


# ── Drop detection (makes a future data loss LOUD, not silent) ──────────────
CRITICAL_TABLES = {
    "users", "commissions", "withdrawals", "grids", "grid_positions", "payments",
    "credit_matrices", "credit_matrix_positions", "credit_matrix_commissions",
    "membership_renewals", "video_campaigns", "course_purchases", "course_commissions",
    "pending_commissions", "withdrawal_approvals", "walletconnect_payment_orders",
    "nowpayments_orders", "onchain_orphan_transfers", "stripe_charges", "p2p_transfers",
}
_BASELINE_KEY = "last_backup_row_counts"


def _alert_on_drops(new_counts: dict) -> list:
    """Compare new row counts to the previous backup's baseline; email admin on
    a sharp or critical drop, then store the new baseline. Best-effort — never
    raises into the backup path. Returns the list of flagged drops."""
    import json as _json
    from .database import SessionLocal, AppConfig

    flags = []
    db = SessionLocal()
    try:
        row = db.query(AppConfig).filter(AppConfig.key == _BASELINE_KEY).first()
        prev = {}
        if row and row.value:
            try:
                prev = _json.loads(row.value)
            except Exception:
                prev = {}
        for t, n in new_counts.items():
            if n is None or n < 0:
                continue
            p = prev.get(t)
            if p is None or p < 0:
                continue
            if n < p:
                drop = p - n
                pct = round((drop / p * 100), 1) if p else 0.0
                critical = (t in CRITICAL_TABLES and drop >= 1)
                big = (drop >= 5 and pct >= 20)
                if critical or big:
                    flags.append({"table": t, "prev": p, "now": n, "drop": drop, "pct": pct})
        payload = _json.dumps(new_counts)
        if row:
            row.value = payload
        else:
            db.add(AppConfig(key=_BASELINE_KEY, value=payload))
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        db.close()

    if flags:
        try:
            from .email_utils import send_email
            admin_email = os.getenv("ADMIN_EMAIL", "stevelawsonmarketing@gmail.com")
            li = "".join(
                f"<li><b>{f['table']}</b>: {f['prev']} → {f['now']} "
                f"(−{f['drop']} rows, −{f['pct']}%)</li>" for f in flags
            )
            html = (
                "<h2>⚠️ SuperAdPro backup: row-count drop detected</h2>"
                "<p>The latest backup has fewer rows than the previous one in:</p>"
                f"<ul>{li}</ul>"
                "<p>If you did not intentionally delete this data, investigate now. "
                "The most recent backups are in R2 and are restorable via "
                "<code>/admin/restore-backup</code>.</p>"
            )
            send_email(admin_email, "⚠️ SuperAdPro: data drop detected in backup", html, "")
        except Exception:
            pass
    return flags


# ── Restore (insert-missing only — never overwrites or deletes) ─────────────
def _coerce_value(col, v):
    """Coerce a JSON-deserialised backup value back to the column's type."""
    if v is None:
        return None
    from datetime import datetime, date
    from decimal import Decimal
    tname = col.type.__class__.__name__.lower()
    try:
        if "datetime" in tname or "timestamp" in tname:
            return datetime.fromisoformat(v) if isinstance(v, str) else v
        if tname == "date":
            return date.fromisoformat(v) if isinstance(v, str) else v
        if "float" in tname:
            return float(v)
        if any(k in tname for k in ("numeric", "decimal", "money")):
            return Decimal(str(v)) if not isinstance(v, Decimal) else v
    except Exception:
        return v
    return v


def restore_table(file_or_key: str, table_name: str, do_apply: bool = False) -> dict:
    """Insert-missing restore for ONE table from a backup. Safe semantics: only
    rows whose primary key is absent from the live table are inserted
    (ON CONFLICT DO NOTHING). Surviving rows are never overwritten or deleted.

    Returns a dry-run report (backup rows, live rows, would-insert) and, when
    do_apply, the number actually inserted.
    """
    from sqlalchemy import text as _text
    from sqlalchemy.dialects.postgresql import insert as _pg_insert

    payload = load_backup(file_or_key)
    if "error" in payload:
        return payload
    tables = payload.get("tables", {})
    if table_name not in tables:
        return {"error": f"table '{table_name}' not present in this backup"}
    rows = tables[table_name]
    if isinstance(rows, dict) and "_error" in rows:
        return {"error": f"table '{table_name}' was not captured in this backup: {rows['_error']}"}

    table = next((t for t in Base.metadata.sorted_tables if t.name == table_name), None)
    if table is None:
        return {"error": f"table '{table_name}' not in current schema metadata"}

    pk_cols = [c.name for c in table.primary_key.columns]
    if not pk_cols:
        return {"error": f"table '{table_name}' has no primary key — refusing to restore"}

    colnames = {c.name for c in table.columns}

    def _pk_of(d):
        return tuple(d.get(c) for c in pk_cols)

    try:
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            live_pks = set()
            for m in conn.execute(_text(
                f'SELECT {", ".join(chr(34)+c+chr(34) for c in pk_cols)} FROM "{table_name}"'
            )).all():
                live_pks.add(tuple(m))
            backup_n = len(rows)
            missing = [r for r in rows if _pk_of(r) not in live_pks]

            report = {
                "table": table_name,
                "backup_file": file_or_key,
                "rows_in_backup": backup_n,
                "rows_live_now": len(live_pks),
                "would_insert": len(missing),
                "applied": False,
                "inserted": 0,
            }
            if not do_apply or not missing:
                return report

            clean = []
            for r in missing:
                clean.append({k: _coerce_value(table.columns[k], v)
                              for k, v in r.items() if k in colnames})
            inserted = 0
            CHUNK = 500
            for i in range(0, len(clean), CHUNK):
                batch = clean[i:i + CHUNK]
                stmt = _pg_insert(table).values(batch).on_conflict_do_nothing(
                    index_elements=pk_cols)
                res = conn.execute(stmt)
                inserted += (res.rowcount or 0)
            report["applied"] = True
            report["inserted"] = inserted
            return report
    except Exception as e:
        return {"error": str(e), "exception_type": type(e).__name__}
