"""
Railway Public API client — GraphQL helpers (25 May 2026).

Used by Custom Domains v2 to programmatically register member-owned
hostnames with Railway, which then auto-provisions Let's Encrypt
certificates. Member never touches Cloudflare; Railway handles all
TLS termination.

Why we need this: Railway only issues TLS certs for hostnames that
are explicitly registered with the Railway service via their API.
A bare CNAME from member.com → our-service.up.railway.app is NOT
enough — without the API registration, Railway serves the platform's
default *.up.railway.app cert and the member's browser shows an
SSL warning.

So the flow becomes:
  1. Member submits "pages.theirbrand.com" via our UI
  2. We POST customDomainCreate to Railway GraphQL
  3. Railway returns two DNS records the member must configure
     (a routing CNAME, and a _railway-verify TXT for ownership)
  4. We surface those to the member in our UI
  5. Member configures DNS at their registrar
  6. Our cron polls Railway's customDomain query for status
  7. When certificateStatus = CERTIFICATE_STATUS_TYPE_ISSUED, we
     mark our row verified and the domain is live with HTTPS

Env config (set on Railway dashboard):
  RAILWAY_API_TOKEN       — account/workspace token from Railway settings
  RAILWAY_PROJECT_ID      — UUID of the SuperAdPro project
  RAILWAY_SERVICE_ID      — UUID of the main service
  RAILWAY_ENVIRONMENT_ID  — UUID of the production environment

Get those UUIDs via Cmd+K in Railway dashboard → "Copy <thing> ID".

The token needs project-write permission (it'll be making customDomain
mutations). Use an account-level token; workspace-scoped works too if
the workspace owns the project.

Failure modes handled:
  - Network errors → return (False, error message) tuple, caller logs
  - 401 → log + return error (suggests token is stale)
  - 429 rate limit → exponential backoff up to 3 retries
  - GraphQL errors in response body → return (False, errors[].message)
"""
from __future__ import annotations

import os
import time
import json
import logging
from typing import Optional, Tuple, List, Dict, Any

import requests

log = logging.getLogger(__name__)

# Railway GraphQL endpoint — same one their dashboard uses
RAILWAY_GRAPHQL_URL = "https://backboard.railway.com/graphql/v2"

# Env config — read at call time, NOT at module load, so the lack of
# env vars doesn't crash the app on boot in environments where this
# feature isn't enabled (e.g. local dev without a Railway token).
def _config() -> Dict[str, Optional[str]]:
    return {
        "token":          os.getenv("RAILWAY_API_TOKEN"),
        "project_id":     os.getenv("RAILWAY_PROJECT_ID"),
        "service_id":     os.getenv("RAILWAY_SERVICE_ID"),
        "environment_id": os.getenv("RAILWAY_ENVIRONMENT_ID"),
    }


def is_configured() -> bool:
    """True only when ALL required env vars are present. Used by the
    custom_domains feature to decide whether to use v2 (Railway API)
    or fall back to v1 (CNAME-only DNS check)."""
    cfg = _config()
    return all(cfg.values())


def _post(query: str, variables: Dict[str, Any], _retry: int = 0) -> Tuple[bool, Any]:
    """POST a GraphQL operation. Returns (ok, data_or_error).

    On success: (True, response['data'])
    On failure: (False, "human-readable error message")

    Retries on 429 with exponential backoff up to 3 times (1s, 2s, 4s).
    """
    cfg = _config()
    if not cfg["token"]:
        return False, "RAILWAY_API_TOKEN not configured"

    headers = {
        "Authorization": f"Bearer {cfg['token']}",
        "Content-Type":  "application/json",
    }
    body = {"query": query, "variables": variables}

    try:
        resp = requests.post(RAILWAY_GRAPHQL_URL, json=body, headers=headers, timeout=15.0)
    except requests.RequestException as e:
        return False, f"Network error talking to Railway API: {type(e).__name__}: {e}"

    if resp.status_code == 401:
        return False, "Railway API rejected token (401). Check RAILWAY_API_TOKEN."
    if resp.status_code == 429:
        if _retry < 3:
            wait = 2 ** _retry  # 1s, 2s, 4s
            log.warning(f"Railway API rate-limited, retrying in {wait}s (attempt {_retry+1}/3)")
            time.sleep(wait)
            return _post(query, variables, _retry=_retry + 1)
        return False, "Railway API rate-limited (429) after 3 retries"
    if resp.status_code >= 500:
        return False, f"Railway API server error ({resp.status_code}). Try again later."
    if resp.status_code != 200:
        return False, f"Railway API unexpected status {resp.status_code}: {resp.text[:200]}"

    try:
        payload = resp.json()
    except ValueError:
        return False, f"Railway API returned non-JSON: {resp.text[:200]}"

    if payload.get("errors"):
        # GraphQL-level error — surface the first message for the caller.
        # Common ones: "Domain already added to this service", "Invalid
        # domain format", "Domain belongs to another project".
        errs = payload["errors"]
        msg = errs[0].get("message", "Unknown GraphQL error") if errs else "Unknown GraphQL error"
        return False, msg

    return True, payload.get("data", {})


# ─── Mutations ─────────────────────────────────────────────────────────

def create_custom_domain(domain: str) -> Tuple[bool, Any]:
    """Register `domain` with Railway. Returns (ok, response_dict).

    Success response shape:
      {
        "id": "<railway-domain-uuid>",
        "domain": "pages.theirbrand.com",
        "status": {
          "dnsRecords": [
            {"recordType": "CNAME", "hostlabel": "pages",
             "requiredValue": "abc123.up.railway.app",
             "currentValue": null, "status": "PROPAGATING"},
            {"recordType": "TXT", "hostlabel": "_railway-verify.pages",
             "requiredValue": "railway-verify=...", ...}
          ],
          "certificateStatus": "CERTIFICATE_STATUS_TYPE_PENDING"
        }
      }

    Failure: (False, "error message").
    """
    cfg = _config()
    if not is_configured():
        return False, "Railway API not fully configured (check env vars)"

    query = """
        mutation customDomainCreate($input: CustomDomainCreateInput!) {
          customDomainCreate(input: $input) {
            id
            domain
            status {
              dnsRecords {
                recordType
                hostlabel
                requiredValue
                currentValue
                status
                zone
              }
              certificateStatus
            }
          }
        }
    """
    variables = {
        "input": {
            "projectId":     cfg["project_id"],
            "environmentId": cfg["environment_id"],
            "serviceId":     cfg["service_id"],
            "domain":        domain,
        }
    }
    ok, data = _post(query, variables)
    if not ok:
        return False, data
    return True, data.get("customDomainCreate", {})


def delete_custom_domain(railway_domain_id: str) -> Tuple[bool, Any]:
    """Delete a custom domain from Railway. Idempotent — deleting an
    already-deleted domain is a no-op (Railway returns success)."""
    if not is_configured():
        return False, "Railway API not fully configured"
    query = """
        mutation customDomainDelete($id: String!) {
          customDomainDelete(id: $id)
        }
    """
    return _post(query, {"id": railway_domain_id})


# ─── Queries ───────────────────────────────────────────────────────────

def get_custom_domain_status(railway_domain_id: str) -> Tuple[bool, Any]:
    """Poll Railway for the current DNS + TLS status of a domain.

    Used by our verification cron. Returns the status object directly
    on success (the same shape that customDomainCreate returns under
    .status), so callers can store/inspect dnsRecords + certificateStatus.

    certificateStatus values we care about (from production observation):
      CERTIFICATE_STATUS_TYPE_PENDING            — just registered, waiting
      CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP — checking DNS
      CERTIFICATE_STATUS_TYPE_ISSUING            — DNS valid, issuing cert
      CERTIFICATE_STATUS_TYPE_ISSUED             — done, HTTPS live
      CERTIFICATE_STATUS_TYPE_RENEWING           — auto-renewal in progress
      CERTIFICATE_STATUS_TYPE_ERRORED            — something went wrong
    """
    if not is_configured():
        return False, "Railway API not fully configured"

    cfg = _config()
    # Use the `domains` query at the service level — single-domain
    # lookup isn't directly exposed; we query all domains for the
    # service and filter client-side. Service has at most ~hundreds
    # of custom domains so this is fine.
    query = """
        query serviceDomains($environmentId: String!, $projectId: String!, $serviceId: String!) {
          domains(environmentId: $environmentId, projectId: $projectId, serviceId: $serviceId) {
            customDomains {
              id
              domain
              status {
                dnsRecords {
                  recordType
                  hostlabel
                  requiredValue
                  currentValue
                  status
                  zone
                }
                certificateStatus
              }
            }
          }
        }
    """
    variables = {
        "environmentId": cfg["environment_id"],
        "projectId":     cfg["project_id"],
        "serviceId":     cfg["service_id"],
    }
    ok, data = _post(query, variables)
    if not ok:
        return False, data
    customs = (data.get("domains") or {}).get("customDomains") or []
    for d in customs:
        if d.get("id") == railway_domain_id:
            return True, d
    return False, f"Domain id {railway_domain_id} not found in Railway service"


def list_all_custom_domains() -> Tuple[bool, List[Dict[str, Any]]]:
    """Return the full list of custom domains registered with our
    Railway service. Used by admin tooling and the migration script."""
    if not is_configured():
        return False, "Railway API not fully configured"
    cfg = _config()
    query = """
        query serviceDomains($environmentId: String!, $projectId: String!, $serviceId: String!) {
          domains(environmentId: $environmentId, projectId: $projectId, serviceId: $serviceId) {
            customDomains {
              id
              domain
              status {
                certificateStatus
              }
            }
          }
        }
    """
    variables = {
        "environmentId": cfg["environment_id"],
        "projectId":     cfg["project_id"],
        "serviceId":     cfg["service_id"],
    }
    ok, data = _post(query, variables)
    if not ok:
        return False, data
    return True, (data.get("domains") or {}).get("customDomains") or []
