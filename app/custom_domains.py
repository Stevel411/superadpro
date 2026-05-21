"""
Custom Domain verification helpers for SuperPages (21 May 2026).

Members CNAME their domain (e.g. pages.theirbrand.com) at our Railway
host. This module verifies that they did it correctly, and is called
both from the live "Check now" button on the labs UI and from the
hourly cron that re-verifies pending domains.

Architecture: per-user CNAME (Level 2 of the architecture decision —
member knows DNS). The member's DNS provider handles TLS via Cloudflare
Free; we just need their CNAME to resolve to us.

Env config:
  CUSTOM_DOMAIN_CNAME_TARGET — the hostname members should CNAME to.
                                Set on Railway. Default fallback below
                                is the production Railway URL.
"""
from __future__ import annotations

import os
import re
from datetime import datetime
from typing import Tuple, Optional

import dns.resolver
import dns.exception

from .database import SessionLocal, CustomDomain


# The hostname members should CNAME to. Configurable so we can change
# Railway hosts or move to a different infrastructure provider without
# code changes — just update the env var and the verification cron
# starts accepting the new target. Default fallback is the current
# Railway production host.
CNAME_TARGET = os.getenv(
    "CUSTOM_DOMAIN_CNAME_TARGET",
    "superadpro-production.up.railway.app",
).lower().rstrip(".")


# Maximum retries before a domain is marked 'failed'. Verification cron
# re-tries every hour, so 24 = roughly one day of retries before giving
# up. Member can re-trigger manually by clicking "Check now" in the UI.
MAX_VERIFICATION_RETRIES = 24


# Strict-ish domain regex. Accepts subdomains and root domains, rejects
# obvious garbage. Doesn't try to be perfectly RFC-compliant — false
# positives just fail at the DNS lookup step, which is also fine.
_DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$"
)


def normalize_domain(raw: str) -> str:
    """Lowercase, strip protocol + paths + trailing dots. Members copy
    URLs from browsers all the time — be tolerant on input."""
    if not raw:
        return ""
    d = raw.strip().lower()
    # Strip protocol
    if d.startswith("http://"):
        d = d[7:]
    elif d.startswith("https://"):
        d = d[8:]
    # Strip path
    if "/" in d:
        d = d.split("/", 1)[0]
    # Strip port
    if ":" in d:
        d = d.split(":", 1)[0]
    # Strip trailing dot (DNS uses trailing dots, members don't)
    d = d.rstrip(".")
    return d


def is_valid_domain_format(domain: str) -> bool:
    """Cheap syntactic check. DNS lookup is the real validator but this
    catches obvious mistakes before we make a network call."""
    if not domain:
        return False
    return bool(_DOMAIN_RE.match(domain))


def is_blocked_domain(domain: str) -> bool:
    """Some domains we never want to accept as custom — our own platform
    domains, common SaaS provider domains, etc. Prevents trivially
    obvious hijacking attempts where someone tries to CNAME
    `superadpro.com` itself to take over the platform domain."""
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


def verify_cname(domain: str) -> Tuple[bool, Optional[str]]:
    """Look up the CNAME chain for `domain` and confirm it terminates at
    CNAME_TARGET. Returns (ok, error_message).

    On success: (True, None).
    On failure: (False, "human-readable explanation").

    The cron will store the error message on the row so the member can
    see it in the labs UI without calling support.
    """
    target = CNAME_TARGET.lower().rstrip(".")
    try:
        # Try direct CNAME lookup first
        try:
            answers = dns.resolver.resolve(domain, "CNAME", lifetime=5.0)
            for rdata in answers:
                cname = str(rdata.target).rstrip(".").lower()
                if cname == target:
                    return True, None
                # Members sometimes CNAME to www.superadpro.com or
                # superadpro.com — accept those too since both ultimately
                # land at the same Railway service
                if cname in ("superadpro.com", "www.superadpro.com"):
                    return True, None
                return False, (
                    f"CNAME points to {cname} but should point to {target}. "
                    f"Update your DNS record."
                )
        except dns.resolver.NoAnswer:
            pass  # No CNAME, try A-record fallback below
        except dns.resolver.NXDOMAIN:
            return False, (
                f"Domain {domain} does not exist in DNS. "
                f"Check the spelling, and make sure you've added the CNAME record at your domain provider."
            )

        # A-record fallback: member may have followed bad advice and made
        # an A record instead of a CNAME. We don't accept this (it'll break
        # if Railway IPs change) but we explain the problem clearly.
        try:
            dns.resolver.resolve(domain, "A", lifetime=5.0)
            return False, (
                f"{domain} has an A record but no CNAME. "
                f"Custom domains must use a CNAME pointing at {target}. "
                f"Remove the A record and add the CNAME."
            )
        except dns.resolver.NoAnswer:
            return False, (
                f"No DNS records found for {domain}. "
                f"Add a CNAME pointing at {target}."
            )
        except dns.resolver.NXDOMAIN:
            return False, f"Domain {domain} does not exist in DNS."

    except dns.exception.Timeout:
        return False, (
            "DNS lookup timed out. Try again in a minute, or check your domain at your DNS provider."
        )
    except Exception as e:
        return False, f"DNS lookup failed: {type(e).__name__}: {e}"


def verify_one(domain_row: CustomDomain, db_session) -> bool:
    """Verify a single CustomDomain row and update its status in place.
    Returns True if the verification succeeded.

    Caller is responsible for db.commit().
    """
    domain_row.last_checked_at = datetime.utcnow()
    ok, err = verify_cname(domain_row.domain)
    if ok:
        domain_row.verification_status = "verified"
        domain_row.verified_at = datetime.utcnow()
        domain_row.last_error = None
    else:
        domain_row.last_error = err or "Unknown error"
        # Only mark 'failed' if we've been retrying long enough — give
        # DNS propagation time to settle (it can take up to 48h for
        # some providers, though usually under 1h).
        # We use a coarse retry count based on hours_since_created.
        try:
            hours_since = (datetime.utcnow() - domain_row.created_at).total_seconds() / 3600
        except Exception:
            hours_since = 0
        if hours_since >= MAX_VERIFICATION_RETRIES:
            domain_row.verification_status = "failed"
        else:
            domain_row.verification_status = "pending"
    return ok


def verify_all_pending() -> dict:
    """Cron entry point. Re-verifies every pending domain row.
    Verified rows aren't re-checked (the cron is for unconfirmed
    domains; verified ones stay verified until manually removed).
    Returns a summary dict for the cron logger."""
    db = SessionLocal()
    try:
        pending = db.query(CustomDomain).filter(
            CustomDomain.verification_status.in_(["pending", "failed"])
        ).all()
        verified_count = 0
        still_pending = 0
        for row in pending:
            ok = verify_one(row, db)
            if ok:
                verified_count += 1
            else:
                still_pending += 1
        db.commit()
        return {
            "scanned": len(pending),
            "verified_now": verified_count,
            "still_pending": still_pending,
            "target": CNAME_TARGET,
        }
    finally:
        db.close()
