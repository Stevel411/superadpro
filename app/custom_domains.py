"""
Custom Domain verification helpers for SuperPages (v2 — 25 May 2026).

v2 change: we now register member domains with Railway's public GraphQL
API. Railway then auto-issues Let's Encrypt certificates — the member
no longer needs Cloudflare or any external TLS setup. Member's only
job is: paste hostname → add CNAME + TXT records at their registrar.
That's it. HTTPS works automatically within ~1 hour of DNS propagation.

v1 (21 May) was DNS-only: we did dns.resolver.resolve(hostname, 'CNAME')
and trusted the member to handle HTTPS via Cloudflare. Worked, but
required the member to know what DNS and SSL were. Too much friction
for a premium feature.

Architecture comparison:
                          v1 (DNS-only)              v2 (Railway API)
  Backend verification:   dns.resolver lookup         GraphQL poll
  TLS termination:        Member-side (Cloudflare)    Railway (Let's Encrypt)
  Member's DNS task:      1 record (CNAME)            2 records (CNAME + TXT)
  Member needs Cloudflare? Yes                        No
  Steps for member:       5+                          2 (CNAME, paste hostname)

Required env config:
  RAILWAY_API_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_SERVICE_ID,
  RAILWAY_ENVIRONMENT_ID — set on Railway dashboard. See railway_api.py.

If Railway env vars are missing, this module falls back to v1 DNS-only
behaviour so the feature degrades gracefully (UI still renders, members
can still claim domains, but TLS becomes member's responsibility again).

Legacy compatibility:
  Existing v1-verified rows have railway_domain_id=NULL. On the next
  member action (edit/save) they get registered with Railway via the
  v2 create flow. The verification cron also picks them up — it sees
  the NULL railway_domain_id and attempts to register them automatically.
"""
from __future__ import annotations

import os
import re
import json
import logging
from datetime import datetime
from typing import Tuple, Optional, List, Dict, Any

import dns.resolver
import dns.exception

from .database import SessionLocal, CustomDomain
from . import railway_api

log = logging.getLogger(__name__)


# The hostname members should CNAME to (v1 fallback only). v2 uses
# the dynamic value Railway returns in the dnsRecords array — different
# for each domain. Kept for the v1-fallback path when Railway env vars
# aren't configured.
CNAME_TARGET = os.getenv(
    "CUSTOM_DOMAIN_CNAME_TARGET",
    "superadpro-production.up.railway.app",
).lower().rstrip(".")


# Max hours before a still-not-verified domain gets marked 'failed'.
# Most members configure DNS within minutes; 48h is generous for slow
# registrars or members who started the flow and forgot. After 'failed'
# they can manually re-trigger via "Check now" button.
MAX_VERIFICATION_HOURS = 48


_DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$"
)


def normalize_domain(raw: str) -> str:
    """Lowercase, strip protocol + paths + trailing dots. Members copy
    URLs from browsers all the time — be tolerant on input."""
    if not raw:
        return ""
    d = raw.strip().lower()
    if d.startswith("http://"):  d = d[7:]
    elif d.startswith("https://"): d = d[8:]
    if "/" in d:  d = d.split("/", 1)[0]
    if ":" in d:  d = d.split(":", 1)[0]
    return d.rstrip(".")


def is_valid_domain_format(domain: str) -> bool:
    """Cheap syntactic check. Real validation happens at Railway and DNS."""
    if not domain:
        return False
    return bool(_DOMAIN_RE.match(domain))


def is_blocked_domain(domain: str) -> bool:
    """Reject obvious hijack attempts — our own platform domains and
    common shared-hosting suffixes that members couldn't actually own."""
    blocked_exact = {
        "superadpro.com",
        "www.superadpro.com",
        "app.superadpro.com",
        "api.superadpro.com",
    }
    blocked_suffixes = (
        ".superadpro.com",
        ".railway.app",
        ".up.railway.app",
        ".vercel.app",
        ".netlify.app",
        ".herokuapp.com",
    )
    if domain in blocked_exact:
        return True
    return any(domain.endswith(s) for s in blocked_suffixes)


# ═════════════════════════════════════════════════════════════════════
# v2: Railway API path
# ═════════════════════════════════════════════════════════════════════

def register_with_railway(domain_row: CustomDomain, db_session) -> Tuple[bool, str]:
    """Register `domain_row.domain` with Railway via GraphQL.

    On success: writes railway_domain_id, tls_status, and dns_records_json
    onto the row (caller commits). Returns (True, "").

    On failure: writes last_error onto the row. Returns (False, err_msg).

    Idempotent at the Railway side — if the domain is already registered
    to our service, Railway returns an error like 'Domain already added',
    and we treat that as success by re-querying status and storing whatever
    Railway already has.
    """
    if not railway_api.is_configured():
        domain_row.last_error = (
            "Railway API not configured server-side. Falling back to "
            "v1 DNS-only verification — HTTPS requires Cloudflare."
        )
        return False, domain_row.last_error

    ok, result = railway_api.create_custom_domain(domain_row.domain)
    if not ok:
        err = str(result)
        # If Railway says it's already registered, try to fetch its
        # current state and treat that as success (idempotency).
        if "already" in err.lower() and "added" in err.lower():
            existing = _find_existing_railway_id(domain_row.domain)
            if existing:
                domain_row.railway_domain_id = existing.get("id")
                _apply_railway_status(domain_row, existing)
                domain_row.last_error = None
                return True, ""
        domain_row.last_error = f"Railway API: {err}"
        return False, domain_row.last_error

    # Happy path
    domain_row.railway_domain_id = result.get("id")
    _apply_railway_status(domain_row, result)
    domain_row.last_error = None
    return True, ""


def _find_existing_railway_id(domain: str) -> Optional[Dict[str, Any]]:
    """When customDomainCreate says 'already exists', look up the existing
    registration so we can adopt it."""
    ok, customs = railway_api.list_all_custom_domains()
    if not ok:
        return None
    for d in customs:
        if (d.get("domain") or "").lower() == domain.lower():
            # Need full record with dnsRecords — re-fetch with status
            ok2, full = railway_api.get_custom_domain_status(d["id"])
            if ok2:
                return full
            return d
    return None


def _apply_railway_status(domain_row: CustomDomain, railway_result: Dict[str, Any]) -> None:
    """Copy Railway's status fields onto our row (caller commits)."""
    status = railway_result.get("status") or {}
    tls = status.get("certificateStatus")
    dns_records = status.get("dnsRecords") or []

    domain_row.tls_status = tls
    domain_row.dns_records_json = json.dumps(dns_records)
    domain_row.last_checked_at = datetime.utcnow()

    # Map Railway's status into our 3-state model
    if tls == "CERTIFICATE_STATUS_TYPE_ISSUED":
        domain_row.verification_status = "verified"
        if not domain_row.verified_at:
            domain_row.verified_at = datetime.utcnow()
    elif tls == "CERTIFICATE_STATUS_TYPE_ERRORED":
        domain_row.verification_status = "failed"
    else:
        # PENDING, VALIDATING_OWNERSHIP, ISSUING, RENEWING — all "pending"
        # from member's perspective. We never time these out aggressively
        # because Railway's own retry logic handles propagation hiccups.
        domain_row.verification_status = "pending"


def verify_one(domain_row: CustomDomain, db_session) -> bool:
    """Re-verify a single CustomDomain row in place.

    v2 logic:
      - If no railway_domain_id yet, try register_with_railway first.
      - Otherwise poll Railway for current status and update row.

    Falls back to v1 DNS-only check if Railway API isn't configured.

    Caller is responsible for db.commit().
    """
    domain_row.last_checked_at = datetime.utcnow()

    # Path A: Railway not configured → v1 DNS-only fallback
    if not railway_api.is_configured():
        return _v1_verify_dns(domain_row)

    # Path B: Not yet registered with Railway → register now
    if not domain_row.railway_domain_id:
        ok, _ = register_with_railway(domain_row, db_session)
        return ok and domain_row.verification_status == "verified"

    # Path C: Already registered → poll status
    ok, result = railway_api.get_custom_domain_status(domain_row.railway_domain_id)
    if not ok:
        domain_row.last_error = f"Railway API: {result}"
        # If the row's been pending for ages with persistent failures, give up
        try:
            hours_since = (datetime.utcnow() - domain_row.created_at).total_seconds() / 3600
        except Exception:
            hours_since = 0
        if hours_since >= MAX_VERIFICATION_HOURS:
            domain_row.verification_status = "failed"
        return False

    _apply_railway_status(domain_row, result)
    domain_row.last_error = None
    return domain_row.verification_status == "verified"


# ═════════════════════════════════════════════════════════════════════
# v1: DNS-only fallback (kept for the case where Railway API is offline
# or env vars aren't configured)
# ═════════════════════════════════════════════════════════════════════

def _v1_verify_dns(domain_row: CustomDomain) -> bool:
    """Direct DNS CNAME lookup. Used only when Railway API is unavailable."""
    ok, err = verify_cname(domain_row.domain)
    if ok:
        domain_row.verification_status = "verified"
        domain_row.verified_at = datetime.utcnow()
        domain_row.last_error = None
        return True
    domain_row.last_error = err or "DNS lookup failed"
    try:
        hours_since = (datetime.utcnow() - domain_row.created_at).total_seconds() / 3600
    except Exception:
        hours_since = 0
    domain_row.verification_status = "failed" if hours_since >= MAX_VERIFICATION_HOURS else "pending"
    return False


def verify_cname(domain: str) -> Tuple[bool, Optional[str]]:
    """v1 helper — direct DNS CNAME lookup. Retained for fallback path
    and for diagnostic 'Check my DNS now' button in the UI (members can
    sanity-check their DNS independently of Railway's own verification)."""
    target = CNAME_TARGET.lower().rstrip(".")
    try:
        try:
            answers = dns.resolver.resolve(domain, "CNAME", lifetime=5.0)
            for rdata in answers:
                cname = str(rdata.target).rstrip(".").lower()
                if cname == target or cname in ("superadpro.com", "www.superadpro.com"):
                    return True, None
                return False, (
                    f"CNAME points to {cname} but should point to your Railway "
                    f"target. Update your DNS record at your domain provider."
                )
        except dns.resolver.NoAnswer:
            pass
        except dns.resolver.NXDOMAIN:
            return False, (
                f"Domain {domain} does not exist in DNS. "
                f"Check spelling and that you've added the CNAME at your registrar."
            )

        try:
            dns.resolver.resolve(domain, "A", lifetime=5.0)
            return False, (
                f"{domain} has an A record but no CNAME. "
                f"Custom domains require a CNAME — remove the A record and add the CNAME."
            )
        except dns.resolver.NoAnswer:
            return False, f"No DNS records found for {domain}. Add the CNAME at your registrar."
        except dns.resolver.NXDOMAIN:
            return False, f"Domain {domain} does not exist in DNS."

    except dns.exception.Timeout:
        return False, "DNS lookup timed out. Try again in a minute."
    except Exception as e:
        return False, f"DNS lookup failed: {type(e).__name__}: {e}"


# ═════════════════════════════════════════════════════════════════════
# Cron entry point
# ═════════════════════════════════════════════════════════════════════

def verify_all_pending() -> dict:
    """Re-verify every pending or failed CustomDomain row.

    Verified rows aren't re-checked here — Railway handles renewal
    internally and updates certificateStatus to RENEWING when needed.
    A separate slower cron could re-poll verified rows weekly to catch
    cert expiry drift, but v2 doesn't ship that yet.

    Returns summary dict for cron logger.
    """
    db = SessionLocal()
    try:
        pending = db.query(CustomDomain).filter(
            CustomDomain.verification_status.in_(["pending", "failed"])
        ).all()
        verified_now = 0
        still_pending = 0
        api_unavailable = not railway_api.is_configured()

        for row in pending:
            try:
                ok = verify_one(row, db)
                if ok:
                    verified_now += 1
                else:
                    still_pending += 1
            except Exception as e:
                log.exception(f"verify_one failed for domain {row.id} ({row.domain}): {e}")
                still_pending += 1

        db.commit()
        return {
            "scanned":            len(pending),
            "verified_now":       verified_now,
            "still_pending":      still_pending,
            "api_mode":           "v1-dns-fallback" if api_unavailable else "v2-railway-api",
            "target":             CNAME_TARGET,
        }
    finally:
        db.close()
