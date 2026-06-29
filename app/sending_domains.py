"""
Sending Domain verification helpers — per-member email sending domains
verified inside our single Amazon SES account (29 Jun 2026).

Goal: a member sends marketing/autoresponder email from THEIR OWN domain
(e.g. mail.janesmith.com), so their subscribers see their brand, never
SuperAdPro — and their domain carries its own sending reputation, isolating
every member from every other member.

This mirrors the proven app/custom_domains.py pattern (which does the same
job for SuperPages page hosting via Railway), but the verification target is
Amazon SES instead of Railway:

    custom_domains.py            sending_domains.py
    ─────────────────            ──────────────────
    CNAME -> Railway host        3x DKIM CNAME -> amazonses.com (Easy DKIM)
    TXT ownership                + SPF TXT (include:amazonses.com)
    Railway GraphQL poll         + DMARC TXT
    verify_cname (dns.resolver)  SES GetIdentityDkimAttributes poll

IMPORTANT — credentials:
SES *SMTP* credentials (SES_SMTP_USER/PASS) are for SENDING and are NOT the
same as AWS *API* credentials. To call the SES API (VerifyDomainDkim,
GetIdentityVerificationAttributes) we need AWS IAM access keys:

    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
    AWS_SES_REGION         (must match the region of your SES SMTP creds /
                            verified sending identity, e.g. eu-west-1)

The IAM user needs an SES policy allowing:
    ses:VerifyDomainIdentity, ses:VerifyDomainDkim,
    ses:GetIdentityVerificationAttributes, ses:GetIdentityDkimAttributes,
    ses:DeleteIdentity

If these are absent this module degrades gracefully: is_configured() returns
False, provision/verify return a clear "SES API not configured" error rather
than crashing, and the UI can show a friendly "email sending isn't switched
on yet" state — exactly like custom_domains falls back when Railway creds are
missing.
"""
from __future__ import annotations

import os
import json
import logging
from datetime import datetime
from typing import Optional, Tuple, List, Dict, Any

log = logging.getLogger("sending_domains")

# Reuse the proven validation helpers from custom_domains so input handling
# is identical across both domain features (members copy URLs from browsers).
from .custom_domains import (
    normalize_domain,
    is_valid_domain_format,
    is_blocked_domain,
)

AWS_ACCESS_KEY_ID     = os.getenv("AWS_ACCESS_KEY_ID", "").strip()
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
# Region must match where the SES sending identity lives. Fall back to the
# region embedded in the SMTP host if AWS_SES_REGION isn't set explicitly,
# e.g. email-smtp.eu-west-1.amazonaws.com -> eu-west-1.
def _infer_region() -> str:
    explicit = os.getenv("AWS_SES_REGION", "").strip()
    if explicit:
        return explicit
    host = os.getenv("SES_SMTP_HOST", "").strip()
    # email-smtp.<region>.amazonaws.com
    parts = host.split(".")
    if len(parts) >= 3 and parts[0] == "email-smtp":
        return parts[1]
    return "eu-west-1"

AWS_SES_REGION = _infer_region()


def is_configured() -> bool:
    """True only if the AWS *API* credentials needed for SES identity calls
    are present. SMTP creds alone are NOT enough."""
    return bool(AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY)


def _ses_client():
    """Return a boto3 classic-SES client, or None if not configured.
    VerifyDomainDkim / GetIdentityDkimAttributes / GetIdentityVerificationAttributes
    are classic-SES operations."""
    if not is_configured():
        return None
    try:
        import boto3  # already in requirements.txt (used by r2_storage)
        return boto3.client(
            "ses",
            region_name=AWS_SES_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        )
    except Exception as e:
        log.error(f"[sending_domains] could not build SES client: {e}")
        return None


def is_valid_sending_domain(domain: str) -> Tuple[bool, Optional[str]]:
    """Validate a candidate sending domain. Returns (ok, error_message)."""
    if not domain:
        return False, "Please enter a domain."
    if not is_valid_domain_format(domain):
        return False, "That doesn't look like a valid domain. Example: mail.yourbrand.com"
    if is_blocked_domain(domain):
        return False, "That domain can't be used. Use a domain you own, e.g. mail.yourbrand.com"
    return True, None


def _build_dns_records(domain: str, dkim_tokens: List[str]) -> List[Dict[str, Any]]:
    """Construct the member-facing DNS record list from the SES DKIM tokens
    plus the standard SPF and DMARC records. Stored verbatim in
    SendingDomain.dns_records_json so the UI never re-queries SES per load.

    Easy DKIM = one CNAME per token (3 tokens -> 3 CNAMEs).
    """
    records: List[Dict[str, Any]] = []
    for i, token in enumerate(dkim_tokens or [], start=1):
        records.append({
            "kind": "DKIM",
            "label": f"Prove the domain is yours ({i} of 3)",
            "recordType": "CNAME",
            "name": f"{token}._domainkey.{domain}",
            "value": f"{token}.dkim.amazonses.com",
            "status": "PENDING",
        })
    # SPF — authorises SES to send for this domain.
    records.append({
        "kind": "SPF",
        "label": "Let us send for you",
        "recordType": "TXT",
        "name": domain,
        "value": "v=spf1 include:amazonses.com ~all",
        "status": "PENDING",
    })
    # DMARC — anti-spoofing. p=none is the safe starting policy (monitor only).
    records.append({
        "kind": "DMARC",
        "label": "Block fakers",
        "recordType": "TXT",
        "name": f"_dmarc.{domain}",
        "value": f"v=DMARC1; p=none; rua=mailto:dmarc@{domain}",
        "status": "PENDING",
    })
    return records


def provision_domain(domain_row, db_session) -> Tuple[bool, str]:
    """Register the member's domain with SES and generate their DNS records.

    Calls VerifyDomainDkim (Easy DKIM — returns 3 tokens) which also creates
    the domain identity. Stores tokens + the full member-facing record list on
    the row. Idempotent: re-calling for an existing identity just returns the
    current tokens.

    Returns (ok, message). On failure, message is member-safe and also stored
    in last_error.
    """
    client = _ses_client()
    if client is None:
        msg = ("Email sending isn't switched on yet (SES API credentials not "
               "configured). Add AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / "
               "AWS_SES_REGION in Railway.")
        domain_row.last_error = msg
        domain_row.status = "pending"
        db_session.commit()
        return False, msg

    domain = domain_row.domain
    try:
        # VerifyDomainDkim creates the identity (if new) and returns 3 DKIM
        # tokens for Easy DKIM. This is the modern, CNAME-only flow.
        dkim_resp = client.verify_domain_dkim(Domain=domain)
        tokens = dkim_resp.get("DkimTokens", []) or []
        if not tokens:
            msg = "SES returned no DKIM tokens — please try again."
            domain_row.last_error = msg
            db_session.commit()
            return False, msg

        records = _build_dns_records(domain, tokens)
        domain_row.dkim_tokens_json = json.dumps(tokens)
        domain_row.dns_records_json = json.dumps(records)
        domain_row.status = "pending"
        domain_row.identity_status = "Pending"
        domain_row.dkim_status = "Pending"
        domain_row.last_error = None
        domain_row.last_checked_at = datetime.utcnow()
        db_session.commit()
        log.info(f"[sending_domains] provisioned {domain} ({len(tokens)} DKIM tokens)")
        return True, "Records generated — add them at your domain provider."
    except Exception as e:
        msg = f"Could not set up {domain} with our mail service: {str(e)[:200]}"
        log.exception(f"[sending_domains] provision failed for {domain}")
        domain_row.last_error = msg
        db_session.commit()
        return False, msg


def verify_one(domain_row, db_session) -> bool:
    """Poll SES for this domain's identity + DKIM status and update the row.
    Returns True if the domain is now fully verified (member may send).

    Verified = DKIM status Success (Easy DKIM success means SES can sign mail
    from this domain, which is what branded sending needs). We also record the
    identity verification status for display.
    """
    client = _ses_client()
    if client is None:
        domain_row.last_error = "Email sending isn't switched on yet (SES API not configured)."
        domain_row.last_checked_at = datetime.utcnow()
        db_session.commit()
        return False

    domain = domain_row.domain
    try:
        dkim_attrs = client.get_identity_dkim_attributes(Identities=[domain])
        ident_attrs = client.get_identity_verification_attributes(Identities=[domain])

        d = (dkim_attrs.get("DkimAttributes", {}) or {}).get(domain, {}) or {}
        v = (ident_attrs.get("VerificationAttributes", {}) or {}).get(domain, {}) or {}

        dkim_status = d.get("DkimVerificationStatus", "NotStarted")
        ident_status = v.get("VerificationStatus", "NotStarted")

        domain_row.dkim_status = dkim_status
        domain_row.identity_status = ident_status
        domain_row.last_checked_at = datetime.utcnow()

        # Reflect per-record status into the surfaced record list (so the UI's
        # "verifying" checklist can tick DKIM/SPF/DMARC independently).
        try:
            records = json.loads(domain_row.dns_records_json or "[]")
            for rec in records:
                if rec.get("kind") == "DKIM":
                    rec["status"] = "VERIFIED" if dkim_status == "Success" else dkim_status.upper()
            domain_row.dns_records_json = json.dumps(records)
        except Exception:
            pass

        if dkim_status == "Success":
            if domain_row.status != "verified":
                domain_row.status = "verified"
                domain_row.verified_at = datetime.utcnow()
                domain_row.last_error = None
            db_session.commit()
            log.info(f"[sending_domains] {domain} verified")
            return True
        elif dkim_status in ("Failed", "TemporaryFailure"):
            domain_row.last_error = (
                "We couldn't verify your DKIM records. Double-check the 3 CNAME "
                "records match exactly, then check again. DNS can take up to an hour."
            )
            # Keep status 'pending' (not 'failed') so auto-checks continue —
            # most 'failures' here are just slow DNS propagation.
            db_session.commit()
            return False
        else:
            # Pending / NotStarted — records not detected yet. Normal early on.
            db_session.commit()
            return False
    except Exception as e:
        msg = f"Verification check failed: {str(e)[:200]}"
        log.exception(f"[sending_domains] verify failed for {domain}")
        domain_row.last_error = msg
        domain_row.last_checked_at = datetime.utcnow()
        db_session.commit()
        return False


def verify_all_pending(db_factory) -> dict:
    """Cron entry point — re-check every pending SendingDomain row.
    db_factory: a callable returning a fresh DB session (so we don't hold one
    open across the whole sweep). Mirrors custom_domains.verify_all_pending.
    """
    from .database import SendingDomain
    checked = 0
    verified = 0
    db = db_factory()
    try:
        rows = db.query(SendingDomain).filter(
            SendingDomain.status == "pending"
        ).all()
        for row in rows:
            checked += 1
            try:
                if verify_one(row, db):
                    verified += 1
            except Exception as e:
                log.exception(f"[sending_domains] verify_all: row {row.id} failed: {e}")
                db.rollback()
        return {"checked": checked, "verified": verified}
    finally:
        db.close()


def delete_domain(domain_row, db_session) -> Tuple[bool, str]:
    """Remove the SES identity when a member deletes their sending domain, so
    we don't leave orphaned identities consuming the account's identity quota.
    Best-effort: even if the SES call fails, we proceed with local deletion.
    """
    client = _ses_client()
    if client is not None:
        try:
            client.delete_identity(Identity=domain_row.domain)
        except Exception as e:
            log.warning(f"[sending_domains] SES delete_identity failed for {domain_row.domain}: {e}")
    return True, "Removed."
