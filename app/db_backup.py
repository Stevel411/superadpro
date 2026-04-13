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
    """Run pg_dump and upload to R2. Returns status dict."""
    if not r2_available():
        return {"error": "R2 not configured"}

    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return {"error": "DATABASE_URL not set"}

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"superadpro_{timestamp}.sql.gz"
    key = f"{BACKUP_PREFIX}{filename}"

    try:
        # Run pg_dump and gzip in one pipeline
        with tempfile.NamedTemporaryFile(suffix=".sql.gz", delete=False) as tmp:
            tmp_path = tmp.name

        # pg_dump → gzip → file
        result = subprocess.run(
            f'pg_dump "{db_url}" | gzip > "{tmp_path}"',
            shell=True,
            capture_output=True,
            text=True,
            timeout=300,  # 5 min timeout
        )

        if result.returncode != 0:
            return {"error": f"pg_dump failed: {result.stderr[:200]}"}

        # Check file size
        file_size = os.path.getsize(tmp_path)
        if file_size < 100:
            return {"error": "Backup file too small — likely empty database or auth error"}

        # Upload to R2
        client = _get_client()
        with open(tmp_path, "rb") as f:
            client.put_object(
                Bucket=R2_BUCKET,
                Key=key,
                Body=f,
                ContentType="application/gzip",
            )

        # Clean up temp file
        os.unlink(tmp_path)

        # Prune old backups — keep only MAX_BACKUPS
        _prune_old_backups(client)

        size_mb = round(file_size / 1024 / 1024, 2)
        return {
            "success": True,
            "file": filename,
            "size_mb": size_mb,
            "timestamp": timestamp,
            "bucket": R2_BUCKET,
        }

    except Exception as e:
        # Clean up temp file on error
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        return {"error": str(e)}


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
