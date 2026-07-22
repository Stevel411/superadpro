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

# ── Legal / trader identity ───────────────────────────────────────────
# UK e-commerce and consumer regulations require the trading party and a
# geographic address for service to be identifiable on the site. These are
# rendered into the Terms, Privacy Policy and Refund Policy.
#
# Deliberately blank by default: the templates omit the identity block
# entirely rather than assert something untrue. SuperAdPro Ltd was dissolved
# (Jul 2026) and the business now trades as a sole trader, so the previous
# "trading name of SuperAdPro Ltd" line is false and must not be reinstated.
#
# Set in Railway (no deploy needed):
#   TRADER_NAME     e.g. "Steve <Surname>"
#   TRADER_ADDRESS  e.g. "12 Example St, Taunton, TA1 1AA, United Kingdom"
#   TRADER_STATUS   defaults to "a sole trader based in the United Kingdom"
TRADER_NAME    = _env("TRADER_NAME", "")
TRADER_ADDRESS = _env("TRADER_ADDRESS", "")
TRADER_STATUS  = _env("TRADER_STATUS", "a sole trader based in the United Kingdom")


def trader_identity() -> dict:
    """Identity block for legal templates. `complete` is False until the
    operator's name and address are configured — templates use it to decide
    whether to render the identity paragraph at all."""
    return {
        "name": TRADER_NAME,
        "address": TRADER_ADDRESS,
        "status": TRADER_STATUS,
        "support_email": SUPPORT_EMAIL,
        "brand": BRAND_NAME,
        "complete": bool(TRADER_NAME and TRADER_ADDRESS),
    }


# ── Theme (for server-rendered templates; the React app has its own) ──
BRAND_ACCENT = _env("BRAND_ACCENT", "#06b6d4")
