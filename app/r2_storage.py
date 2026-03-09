"""
Cloudflare R2 storage helper — S3-compatible via boto3.
Handles upload, delete, and public URL generation for SuperAdPro media.
"""
import os
import uuid
import boto3
from botocore.config import Config

# ── Config from env ──────────────────────────────────────────────
R2_ACCOUNT_ID     = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID  = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_PUBLIC_URL     = os.getenv("R2_PUBLIC_URL", "").rstrip("/")   # e.g. https://pub-xxxxx.r2.dev
R2_BUCKET         = "superadpro-media"
R2_ENDPOINT       = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com" if R2_ACCOUNT_ID else ""

# Lazy client — only created when first needed
_client = None

def _get_client():
    """Return a cached boto3 S3 client pointed at R2."""
    global _client
    if _client is None:
        if not all([R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY]):
            raise RuntimeError("R2 credentials not configured — check Railway env vars")
        _client = boto3.client(
            "s3",
            endpoint_url=R2_ENDPOINT,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )
    return _client


def upload_image(data: bytes, folder: str, ext: str = "jpg", content_type: str = "image/jpeg") -> str:
    """
    Upload image bytes to R2 and return the public URL.

    Args:
        data: raw image bytes
        folder: subfolder in bucket (e.g. "avatars", "banners", "backgrounds")
        ext: file extension without dot
        content_type: MIME type

    Returns:
        Full public URL like https://pub-xxx.r2.dev/avatars/abc123.jpg
    """
    client = _get_client()
    filename = f"{uuid.uuid4().hex[:16]}.{ext}"
    key = f"{folder}/{filename}"

    client.put_object(
        Bucket=R2_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
    )

    return f"{R2_PUBLIC_URL}/{key}"


def delete_image(url: str) -> bool:
    """
    Delete an image from R2 given its public URL.
    Returns True if deleted, False if URL didn't match our bucket.
    """
    if not url or not R2_PUBLIC_URL or not url.startswith(R2_PUBLIC_URL):
        return False

    key = url.replace(R2_PUBLIC_URL + "/", "", 1)
    try:
        client = _get_client()
        client.delete_object(Bucket=R2_BUCKET, Key=key)
        return True
    except Exception:
        return False


def is_r2_url(value: str) -> bool:
    """Check if a value is already an R2 URL (vs base64 data)."""
    return bool(value and R2_PUBLIC_URL and value.startswith(R2_PUBLIC_URL))


def is_base64_data(value: str) -> bool:
    """Check if a value is a base64 data URL."""
    return bool(value and value.startswith("data:"))


def r2_available() -> bool:
    """Check if R2 is configured."""
    return bool(R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_PUBLIC_URL)
