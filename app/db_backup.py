"""
Database backup to Cloudflare R2 — daily pg_dump stored in R2 bucket.
Keeps last 3 backups, deletes older ones automatically.
"""
import os
import subprocess
import tempfile
from datetime import datetime, timezone
from .r2_storage import _get_client, R2_BUCKET, r2_available

BACKUP_PREFIX = "backups/"
MAX_BACKUPS = 3


def run_backup() -> dict:
    """Run pg_dump and upload to R2. Returns status dict.

    Diagnostic note (27 May 2026): the original implementation used a
    `pg_dump | gzip > file` shell pipeline. When pg_dump fails, gzip
    still receives empty stdin and writes a ~20-byte 'empty gzip' file,
    then exits 0. The pipeline's overall exit code reflected gzip's
    success, hiding pg_dump's real error. This version uses set -o
    pipefail so pg_dump failures propagate, captures pg_dump's stderr
    to a temp file, and includes that stderr in the error response so
    we can actually see WHY a backup failed.
    """
    if not r2_available():
        return {"error": "R2 not configured"}

    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return {"error": "DATABASE_URL not set"}

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"superadpro_{timestamp}.sql.gz"
    key = f"{BACKUP_PREFIX}{filename}"

    tmp_path = None
    stderr_path = None
    try:
        # Temp files for the gzipped dump and for pg_dump's stderr
        with tempfile.NamedTemporaryFile(suffix=".sql.gz", delete=False) as tmp:
            tmp_path = tmp.name
        with tempfile.NamedTemporaryFile(suffix=".stderr", delete=False) as tmperr:
            stderr_path = tmperr.name

        # pg_dump → gzip → file
        #   set -o pipefail makes the pipeline's exit code reflect the
        #     FIRST failure in the pipeline, not just the last command.
        #     Without this, gzip's success masks pg_dump's failure.
        #   pg_dump's stderr is redirected to a separate file so we can
        #     include the real error message in the response.
        #   bash explicit because some shells (dash, sh on Alpine) don't
        #     support pipefail.
        cmd = (
            f'set -o pipefail; '
            f'pg_dump "{db_url}" 2> "{stderr_path}" | gzip > "{tmp_path}"'
        )
        result = subprocess.run(
            cmd,
            shell=True,
            executable="/bin/bash",
            capture_output=True,
            text=True,
            timeout=300,  # 5 min timeout
        )

        # Read pg_dump's stderr (always present, even on success — it
        # logs "pg_dump: ..." progress lines; only treat as error if
        # the pipeline returncode was non-zero).
        pg_stderr = ""
        try:
            with open(stderr_path, "r") as f:
                pg_stderr = f.read()[:2000]  # cap to 2KB
        except Exception:
            pass

        if result.returncode != 0:
            # Now we have the REAL error from pg_dump
            return {
                "error": f"pg_dump failed (exit {result.returncode})",
                "pg_dump_stderr": pg_stderr.strip(),
                "shell_stderr": (result.stderr or "")[:500].strip(),
            }

        # Check file size (still a sanity check — if pipefail worked
        # correctly this shouldn't trigger any more)
        file_size = os.path.getsize(tmp_path)
        if file_size < 100:
            return {
                "error": "Backup file too small — pg_dump produced empty output",
                "pg_dump_stderr": pg_stderr.strip(),
                "file_size_bytes": file_size,
            }

        # Upload to R2
        client = _get_client()
        with open(tmp_path, "rb") as f:
            client.put_object(
                Bucket=R2_BUCKET,
                Key=key,
                Body=f,
                ContentType="application/gzip",
            )

        # Prune old backups — keep only MAX_BACKUPS
        _prune_old_backups(client)

        size_mb = round(file_size / 1024 / 1024, 2)
        return {
            "success": True,
            "file": filename,
            "size_mb": size_mb,
            "size_bytes": file_size,
            "timestamp": timestamp,
            "bucket": R2_BUCKET,
        }

    except Exception as e:
        return {"error": str(e), "exception_type": type(e).__name__}
    finally:
        # Always clean up temp files
        for p in (tmp_path, stderr_path):
            if p:
                try:
                    os.unlink(p)
                except Exception:
                    pass


def _prune_old_backups(client):
    """Delete oldest backups, keeping only MAX_BACKUPS."""
    try:
        response = client.list_objects_v2(
            Bucket=R2_BUCKET,
            Prefix=BACKUP_PREFIX,
        )
        objects = response.get("Contents", [])
        backup_files = [
            obj for obj in objects
            if obj["Key"].endswith(".sql.gz")
        ]

        # Sort by last modified, newest first
        backup_files.sort(key=lambda x: x["LastModified"], reverse=True)

        # Delete anything beyond MAX_BACKUPS
        for old in backup_files[MAX_BACKUPS:]:
            client.delete_object(Bucket=R2_BUCKET, Key=old["Key"])

    except Exception:
        pass  # Non-critical — don't fail backup if pruning fails


def list_backups() -> list:
    """List existing backups in R2."""
    if not r2_available():
        return []

    try:
        client = _get_client()
        response = client.list_objects_v2(
            Bucket=R2_BUCKET,
            Prefix=BACKUP_PREFIX,
        )
        objects = response.get("Contents", [])
        backups = []
        for obj in objects:
            if obj["Key"].endswith(".sql.gz"):
                backups.append({
                    "file": obj["Key"].replace(BACKUP_PREFIX, ""),
                    "size_mb": round(obj["Size"] / 1024 / 1024, 2),
                    "date": obj["LastModified"].isoformat(),
                })
        backups.sort(key=lambda x: x["date"], reverse=True)
        return backups
    except Exception:
        return []
