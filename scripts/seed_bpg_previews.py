#!/usr/bin/env python3
"""
SuperAdPro Brand Poster Generator — Preview Image Seeder
=========================================================

Generates one preview image per template by calling xAI Grok Imagine
with the master prompts from app/poster_templates.py. Used once per
template to seed the BPG gallery before real member output fills in.

USAGE
-----
    # From the superadpro repo root:
    export XAI_API_KEY="xai-..."         # your existing xAI key
    python3 scripts/seed_bpg_previews.py

    # Or to regenerate just one template:
    python3 scripts/seed_bpg_previews.py one-income-risky

WHAT IT DOES
------------
For each template:
    1. Calls xAI Grok Imagine with the master prompt and sensible
       default inputs (the same defaults the form would show a member)
    2. Downloads the resulting image
    3. Saves it to static/preview-images/{slug}.jpg
    4. Prints an UPDATE SQL line for that template

You then:
    5. Inspect the 6 saved images. Reject any that disappoint and re-run
       the script for just those templates (pass the slug as an argument)
    6. Commit static/preview-images/ to git
    7. Run the SQL block on the production DB to point templates at
       these local URLs (or include in a migration block)

COST
----
~$0.07 per image × 6 templates = ~$0.42 total. xAI returns 1 image per
call by default (n=1). We're not asking for 4 candidates here because
we want ONE definitive preview, not a member-style choose-from-4 flow.

SAFETY
------
- No DB writes. This script only generates images and prints SQL.
- No R2 uploads. Files saved locally so you can inspect before commit.
- Idempotent. Running it again overwrites the images cleanly.
- Skips templates that already have a saved image unless --force given.
"""

import os
import sys
import time
import json
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# ── Locate the master prompt file ─────────────────────────────────────────
# We import directly from the BPG branch's poster_templates.py. Run this
# script from the brand-poster-generator branch checked out, or copy that
# file into your local app/ directory first.
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

try:
    from app.poster_templates import POSTER_TEMPLATES, render_prompt
except ImportError as exc:
    print(f"❌ Could not import poster_templates: {exc}")
    print(f"   Check you are running this from the repo root and that")
    print(f"   app/poster_templates.py exists on the current branch.")
    print(f"   Run: git checkout brand-poster-generator")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────
XAI_API_KEY = os.getenv("XAI_API_KEY", "").strip()
OUTPUT_DIR = REPO_ROOT / "static" / "preview-images"
MODEL = "grok-imagine-image-quality"
ENDPOINT = "https://api.x.ai/v1/images/generations"

# xAI accepts a specific set of aspect ratios. Our templates use 3:4
# (portrait poster) which is supported directly. Mapping kept here in
# case we add other aspect ratios later — must mirror the production
# wrapper in app/grok_imagine_service.py.
XAI_ASPECT_MAP = {
    "1:1": "1:1", "3:4": "3:4", "4:3": "4:3", "4:5": "3:4",
    "9:16": "9:16", "16:9": "16:9", "2:3": "2:3", "3:2": "3:2",
}


def fail(msg):
    """Print error and exit."""
    print(f"❌ {msg}")
    sys.exit(1)


def info(msg):
    print(f"   {msg}")


def heading(msg):
    print(f"\n━━━ {msg} ━━━")


# ── Validate environment ──────────────────────────────────────────────────
if not XAI_API_KEY:
    fail("XAI_API_KEY not set. Export it before running:\n"
         "      export XAI_API_KEY='xai-...'")

if not XAI_API_KEY.startswith("xai-"):
    print(f"⚠️  XAI_API_KEY does not start with 'xai-'. Hope you know what")
    print(f"   you are doing. Continuing in 2 seconds...")
    time.sleep(2)


# ── Build default inputs from a template's input_fields ──────────────────
def default_inputs_for_template(template):
    """Return a dict of {field_key: default_value} for one template.

    We use the default values defined in app/poster_templates.py for
    each input field. These are the same defaults that would auto-fill
    the form when a member arrives at the template page, so the
    preview is representative of what a no-edits member would get.
    """
    inputs = {}
    for field in template.get("input_fields", []):
        inputs[field["key"]] = field.get("default", "")
    return inputs


# ── Call xAI Grok Imagine ─────────────────────────────────────────────────
def generate_image(prompt, aspect_ratio):
    """Hit Grok Imagine. Returns the image URL on success, None on failure."""
    import urllib.request

    aspect = XAI_ASPECT_MAP.get(aspect_ratio, "3:4")

    body = {
        "model": MODEL,
        "prompt": prompt,
        "n": 1,
        "aspect_ratio": aspect,
    }

    headers = {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json",
    }

    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urlopen(req, timeout=180) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")[:500]
        info(f"xAI HTTP {exc.code}: {body_text}")
        return None
    except URLError as exc:
        info(f"xAI network error: {exc}")
        return None

    images = payload.get("data") or []
    if not images:
        info(f"xAI returned no images. Full response: {payload}")
        return None

    return images[0].get("url")


# ── Download an image URL to disk ─────────────────────────────────────────
def download(url, dest_path):
    """Download `url` to `dest_path`. Returns True on success."""
    try:
        req = Request(url, headers={"User-Agent": "SuperAdPro/1.0"})
        with urlopen(req, timeout=60) as resp:
            data = resp.read()
        dest_path.write_bytes(data)
        return True
    except (HTTPError, URLError) as exc:
        info(f"Download failed: {exc}")
        return False


# ── Main loop ─────────────────────────────────────────────────────────────
def main():
    # Optional filter — generate just one template if a slug is passed
    only_slug = sys.argv[1] if len(sys.argv) > 1 else None
    force = "--force" in sys.argv

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    templates = POSTER_TEMPLATES
    if only_slug:
        templates = [t for t in templates if t["slug"] == only_slug]
        if not templates:
            fail(f"No template found with slug '{only_slug}'. Known slugs: "
                 + ", ".join(t["slug"] for t in POSTER_TEMPLATES))

    print(f"🎨 SuperAdPro BPG Preview Seeder")
    print(f"   Templates to process: {len(templates)}")
    print(f"   Output directory:     {OUTPUT_DIR}")
    print(f"   Model:                {MODEL}")
    print(f"   Estimated cost:       ${0.07 * len(templates):.2f}")

    results = []
    failures = []

    for idx, template in enumerate(templates, start=1):
        slug = template["slug"]
        name = template["name"]
        dest = OUTPUT_DIR / f"{slug}.jpg"

        heading(f"[{idx}/{len(templates)}] {name}")

        if dest.exists() and not force:
            info(f"Already exists at {dest.name} — skipping (use --force to regenerate)")
            results.append((slug, dest, True))
            continue

        # Build prompt from master + defaults
        inputs = default_inputs_for_template(template)
        try:
            rendered = render_prompt(template, inputs)
        except ValueError as exc:
            info(f"Prompt render failed: {exc}")
            failures.append(slug)
            continue

        info(f"Prompt: {rendered[:120]}...")
        info(f"Aspect: {template['aspect_ratio']}")
        info(f"Calling xAI Grok Imagine...")

        url = generate_image(rendered, template["aspect_ratio"])
        if not url:
            info(f"Generation failed.")
            failures.append(slug)
            continue

        info(f"Got image URL. Downloading...")
        if not download(url, dest):
            failures.append(slug)
            continue

        size_kb = dest.stat().st_size // 1024
        info(f"✅ Saved to {dest.name} ({size_kb} KB)")
        results.append((slug, dest, False))

        # Small breather between calls so we do not hammer xAI
        if idx < len(templates):
            time.sleep(2)

    # ── Summary ─────────────────────────────────────────────────────────
    heading("Summary")
    print(f"   Generated: {len([r for r in results if not r[2]])}")
    print(f"   Skipped:   {len([r for r in results if r[2]])}")
    print(f"   Failed:    {len(failures)}")

    if failures:
        print(f"\n   Failed slugs (re-run with these as arguments to retry):")
        for slug in failures:
            print(f"     python3 scripts/seed_bpg_previews.py {slug}")

    # ── SQL output for seeding the database ──────────────────────────────
    if results:
        heading("SQL to update poster_templates.preview_image_url")
        print("   Run this against your production database AFTER the BPG")
        print("   schema migration has run (i.e. after first deploy of the")
        print("   brand-poster-generator branch).\n")
        for slug, dest, _skipped in results:
            url_path = f"/static/preview-images/{dest.name}"
            print(f"   UPDATE poster_templates SET preview_image_url = '{url_path}' WHERE slug = '{slug}';")

    # ── Next steps reminder ──────────────────────────────────────────────
    heading("Next steps")
    print("   1. Inspect the generated images:")
    print(f"        open {OUTPUT_DIR}")
    print("   2. Reject any disappointing ones and regenerate:")
    print("        python3 scripts/seed_bpg_previews.py {slug} --force")
    print("   3. Commit the images to git:")
    print("        git add static/preview-images/")
    print("        git commit -m 'BPG: seed preview images for gallery'")
    print("   4. Merge brand-poster-generator to main and push to Railway")
    print("   5. Run the SQL above on production to point templates at")
    print("      these URLs")


if __name__ == "__main__":
    main()
