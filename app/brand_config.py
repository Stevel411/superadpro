"""
Brand Configuration — single source of truth for per-deployment identity.
========================================================================
Lets the same codebase run as SuperAdPro *or* AdvantageLife purely via
environment variables. Defaults preserve current SuperAdPro behaviour when the
vars are unset, so importing/using this module changes nothing until the
AdvantageLife deployment sets the vars on Railway.

Railway env vars (per deployment):
  BRAND_NAME          e.g. "AdvantageLife"
  BASE_URL            e.g. "https://www.advantagelife.club"
  SITE_URL            defaults to BASE_URL
  FROM_EMAIL          e.g. "noreply@advantagelife.club"
  BRAND_SENDER_NAME   defaults to BRAND_NAME
  SUPPORT_EMAIL       e.g. "support@advantagelife.club"
  MASTER_REF          master affiliate username for public CTAs
  BRAND_ACCENT        primary accent hex for server-rendered templates
"""
import os


def _env(name: str, default: str) -> str:
    v = os.getenv(name)
    return v.strip() if v and v.strip() else default


# ── Identity ──────────────────────────────────────────────────────────
BRAND_NAME = _env("BRAND_NAME", "SuperAdPro")
BASE_URL   = _env("BASE_URL", "https://www.superadpro.com").rstrip("/")
SITE_URL   = _env("SITE_URL", BASE_URL).rstrip("/")

# True on the AdvantageLife deploy (drives AL-only gating of shared routes).
# Detected from the brand name or domain so it needs no extra env var.
IS_ADVANTAGELIFE = ("advantagelife" in BRAND_NAME.lower()) or ("advantagelife" in BASE_URL.lower())

# ── Email ─────────────────────────────────────────────────────────────
FROM_EMAIL    = _env("FROM_EMAIL", "noreply@superadpro.com")
SENDER_NAME   = _env("BRAND_SENDER_NAME", _env("BREVO_SENDER_NAME", BRAND_NAME))
SUPPORT_EMAIL = _env("SUPPORT_EMAIL", "support@superadpro.com")

# ── Affiliate / public CTAs ───────────────────────────────────────────
MASTER_REF = _env("MASTER_REF", "SuperAdPro")

# ── Theme (for server-rendered templates; the React app has its own) ──
BRAND_ACCENT = _env("BRAND_ACCENT", "#06b6d4")
