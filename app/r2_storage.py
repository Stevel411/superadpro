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


def upload_file(path: str, folder: str, ext: str = "bin", content_type: str = "application/octet-stream") -> str:
    """Upload a file from disk to R2 (streamed/multipart) and return its public URL."""
    client = _get_client()
    filename = f"{uuid.uuid4().hex[:16]}.{ext}"
    key = f"{folder}/{filename}"
    client.upload_file(path, R2_BUCKET, key, ExtraArgs={"ContentType": content_type})
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


# ── Ad Studio asset persistence (Step 2) ─────────────────────────
# Provider result URLs (EvoLink / fal / etc.) are TEMPORARY — they expire within
# hours. The 30-day gallery, re-download, QR and HTML5 export all depend on us
# copying the finished asset into our own bucket on completion. This is the spine.

_EXT_TO_CTYPE = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "webp": "image/webp", "gif": "image/gif",
    "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
    "mp3": "audio/mpeg", "m4a": "audio/mp4", "wav": "audio/wav",
}
_CTYPE_TO_EXT = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
    "image/webp": "webp", "image/gif": "gif",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
    "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/wav": "wav",
}


def _ext_and_ctype(ctype: str, url: str):
    """Resolve (ext, content_type) from a response content-type, falling back to
    the URL path extension, then to a safe binary default."""
    ctype = (ctype or "").split(";")[0].strip().lower()
    if ctype in _CTYPE_TO_EXT:
        ext = _CTYPE_TO_EXT[ctype]
        return ext, ctype
    # fall back to the URL's file extension
    from urllib.parse import urlparse
    import os as _os
    path = urlparse(url).path
    ext = _os.path.splitext(path)[1].lstrip(".").lower()
    if ext == "jpeg":
        ext = "jpg"
    if ext in _EXT_TO_CTYPE:
        return ext, (ctype or _EXT_TO_CTYPE[ext])
    return "bin", (ctype or "application/octet-stream")


def persist_remote_asset_to_r2(url: str, folder: str = "ad-assets",
                               max_bytes: int = 60 * 1024 * 1024,
                               timeout: float = 60.0) -> dict:
    """Download a remote asset (a provider's temporary result URL) and store a
    permanent copy in R2. Returns {url, content_type, bytes, ext}.

    SYNC (httpx + boto3). Call from async handlers via
    ``await asyncio.to_thread(persist_remote_asset_to_r2, url)`` so it never
    blocks the event loop.

    Raises on failure — callers MUST handle it so a persist failure never
    silently loses a member's asset (leave the row pending / flag and retry).
    """
    import httpx

    if not url:
        raise ValueError("persist_remote_asset_to_r2: empty url")
    if not r2_available():
        raise RuntimeError("R2 not configured — cannot persist asset")

    total = 0
    chunks = []
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        with client.stream("GET", url) as resp:
            resp.raise_for_status()
            resp_ctype = resp.headers.get("content-type", "")
            for chunk in resp.iter_bytes():
                total += len(chunk)
                if total > max_bytes:
                    raise ValueError(f"asset exceeds max size ({max_bytes} bytes)")
                chunks.append(chunk)

    data = b"".join(chunks)
    if not data:
        raise ValueError("downloaded asset was empty")

    ext, ctype = _ext_and_ctype(resp_ctype, url)
    r2_url = upload_image(data, folder, ext=ext, content_type=ctype)
    return {"url": r2_url, "content_type": ctype, "bytes": total, "ext": ext}
