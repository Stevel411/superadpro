"""
image_optimise.py — server-side image processing for upload endpoints
═══════════════════════════════════════════════════════════════════════

Members upload large raw photos (3-8 MB from a phone). Without
optimisation those land on their SuperPages unchanged, which kills
mobile load times and conversion. This module sits in front of the
storage write and produces a leaner version.

Three transforms in order:
  1. Resize anything wider than MAX_WIDTH (1920px) — keep aspect ratio
  2. Convert to WebP with quality 82 — saves 25-35% over JPEG at same
     visual quality. Members get smaller files automatically without
     having to know about WebP.
  3. Strip EXIF metadata — removes camera identifiers, GPS coords, etc
     (privacy improvement) and saves a few KB.

Edge cases:
  - SVG: skip — vector format, resizing doesn't help, and PIL doesn't
         handle SVG natively anyway
  - GIF: skip — animated GIFs become broken single-frame WebPs if
         naively converted. Could properly convert to animated WebP
         in future but not today.
  - Already small + already WebP: pass through, just strip EXIF
  - Pillow not available: pass through with a warning, never break
                          the upload flow
  - Optimisation failure on any image: pass through original, log
                          the error. We never reject an upload because
                          the optimiser couldn't run.

Audit ref: C-M-1 (21 May 2026 element audit).
"""
from __future__ import annotations

import io
import logging
from typing import Tuple

log = logging.getLogger(__name__)


# Anything wider than this gets resized. 1920 is HD desktop width; serving
# anything larger on a landing page is wasteful — even 4K screens display
# at CSS-pixel widths that effectively cap around 1920.
MAX_WIDTH = 1920

# WebP quality. 82 is the sweet spot — visually indistinguishable from
# 100 for most photographic content, ~40-50% smaller than JPEG-90.
WEBP_QUALITY = 82

# Formats we skip optimising. SVG is vector. GIF needs animated-WebP
# handling we don't do yet.
SKIP_FORMATS = {"svg", "gif"}


def optimise_image(contents: bytes, source_format: str) -> Tuple[bytes, str, str]:
    """Optimise a raw image upload.

    Args:
        contents: raw bytes from the upload
        source_format: original file extension (lowercased, no dot), e.g. "jpg"

    Returns:
        (optimised_bytes, new_extension, new_content_type)

    If optimisation can't run (Pillow missing, format skipped, processing
    error), returns the original bytes with the original format/type —
    upload always succeeds, optimisation is best-effort.
    """
    src_fmt = (source_format or "").lower().lstrip(".")

    # Map source format to original content type for fallback returns
    fallback_content_type = {
        "jpg":  "image/jpeg",
        "jpeg": "image/jpeg",
        "png":  "image/png",
        "gif":  "image/gif",
        "webp": "image/webp",
        "svg":  "image/svg+xml",
    }.get(src_fmt, "image/jpeg")
    fallback = (contents, src_fmt or "jpg", fallback_content_type)

    # Skip formats we shouldn't touch
    if src_fmt in SKIP_FORMATS:
        return fallback

    # Try Pillow — if it's not available we just pass through
    try:
        from PIL import Image
    except ImportError:
        log.warning("Pillow not available — skipping image optimisation")
        return fallback

    try:
        # Open from bytes
        img = Image.open(io.BytesIO(contents))

        # Animated images (multi-frame GIF/WebP) — we don't have animated-
        # WebP write support cleanly across all Pillow versions, so pass
        # through unchanged. The SKIP_FORMATS check catches GIF already
        # but a stray multi-frame WebP could land here.
        if getattr(img, "is_animated", False):
            return fallback

        # PNGs with transparency need their alpha preserved. Pillow's
        # WebP encoder supports alpha natively, so this works for both
        # opaque (JPEG-like) and transparent (PNG-like) sources.
        # Convert palette images (P mode) to RGBA so they round-trip
        # cleanly through WebP.
        if img.mode == "P":
            # Some palette PNGs have transparency; preserve it if so
            if "transparency" in img.info:
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")
        elif img.mode == "CMYK":
            # CMYK isn't natively supported by WebP — convert to RGB
            img = img.convert("RGB")

        # Resize if wider than MAX_WIDTH (keep aspect ratio)
        if img.width > MAX_WIDTH:
            ratio = MAX_WIDTH / img.width
            new_height = int(img.height * ratio)
            # LANCZOS gives the best downscale quality; modern Pillow
            # exposes it as Image.Resampling.LANCZOS
            try:
                resample = Image.Resampling.LANCZOS
            except AttributeError:
                resample = Image.LANCZOS  # older Pillow
            img = img.resize((MAX_WIDTH, new_height), resample)

        # Encode as WebP. We strip EXIF naturally because we're writing
        # fresh — only the data we set on the new file ships. method=6
        # is the slowest/best-compression encoder setting; on the kind
        # of images members upload this is fast enough (~50-100ms) and
        # produces meaningfully smaller files than the default method=4.
        out = io.BytesIO()
        img.save(
            out,
            format="WebP",
            quality=WEBP_QUALITY,
            method=6,
            # Don't ship metadata
            exif=b"",
        )
        out_bytes = out.getvalue()

        # Sanity check — if the optimised file ended up LARGER than the
        # original (rare but possible with already-WebP inputs or very
        # small originals), keep the original instead.
        if len(out_bytes) >= len(contents):
            return fallback

        return (out_bytes, "webp", "image/webp")

    except Exception as e:
        # Never break an upload because optimisation failed
        log.warning(f"Image optimisation failed ({type(e).__name__}: {e}) — passing through original")
        return fallback
