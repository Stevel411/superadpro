"""
Membership access gate for API endpoints.

Single source of truth for which API endpoints require a paid membership.
Runs as middleware so we don't have to add `if not user.is_active` to 80
endpoint handlers individually.

Two tiers exist under flat-pricing (locked 15 May 2026):
  - free:   anyone authenticated (or unauthenticated, for some paths)
  - paid:   user.is_active = True (Partner $20/mo OR Founding $15/mo locked)

The 'paid' bucket is what used to be Basic+Pro under the dual-tier model.
There is no second 'pro-only' bucket any more — all features that were
formerly Pro-only are now available to any is_active member. Single gate.

Admins bypass all gate checks.

Path-prefix matching: longest matching prefix wins. Routes NOT in the
list are unrestricted (free tier or unauthenticated access).
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


# Endpoints that require an ACTIVE PAID membership (Partner or Founding).
# Admins bypass. is_active=True is the gate — there's no separate Pro
# bucket any more under flat-pricing.
PAID_REQUIRED_PREFIXES = (
    "/api/achievements",
    "/api/activity-feed",
    "/api/affiliate",
    "/api/analytics",
    "/api/campaign-analytics",
    "/api/campaign-studio",
    "/api/campaign-tiers",
    "/api/campaigns",
    "/api/capture",
    "/api/content-creator",
    "/api/courses",
    "/api/credit-matrix",
    "/api/crypto",
    "/api/fomo-stats",
    "/api/grid-visualiser",
    "/api/grok",
    "/api/income-chains",
    "/api/linkhub",
    "/api/linkhub-stats",
    "/api/links",
    "/api/link-tools",
    "/api/membership-stream",
    "/api/my-commission-flows",
    "/api/my-network-tree",
    "/api/network",
    "/api/p2p-transfer",
    "/api/passup-visualiser",
    "/api/pay-it-forward",
    # NOTE: /api/purchase-consent is intentionally NOT in this list.
    # It's the consent-gathering endpoint that runs BEFORE every paid
    # action (including the very first one — buying membership itself).
    # Free members about to buy MUST be able to load and record consent.
    # All actual money-flow endpoints (campaign-tiers, credit-matrix,
    # courses, etc.) remain gated and call purchase-consent first.
    "/api/record-ad-watch",
    "/api/record-watch",
    "/api/rotators",
    "/api/superdeck",
    "/api/superscene",
    "/api/team-messages",
    "/api/upgrade-to-pro",  # legacy path, kept gated so it 403s cleanly
    "/api/video-creator",
    "/api/vip",
    "/api/wallet",
    "/api/watch",
    # ── Tools that were guarded on the frontend (RequireTier route guard)
    #    but missing from this server-side gate, leaving direct API calls
    #    (outside the UI) ungated. Added 28 Jun 2026. Visitor-facing
    #    sub-paths are exempted in GATE_EXEMPT_PREFIXES below. ──
    "/api/funnels",
    "/api/leads",
    "/api/niche-finder",
    "/api/posters",
    "/api/pro/",
    "/api/proseller",
    "/api/social-posts",
    "/api/superseller",
    "/api/swipe-file",
    "/api/video-scripts",
)


# Visitor-facing / portability sub-paths under gated prefixes that MUST stay
# reachable. Published-page interactions are hit by logged-OUT visitors —
# gating them would 401 real visitors and break members' live pages. Data
# export stays open for portability (a lapsed member can take their own leads).
# Checked BEFORE the gate so a more-specific exempt prefix wins.
GATE_EXEMPT_PREFIXES = (
    "/api/funnels/track-click",       # visitor click tracking on published pages
    "/api/leads/capture",             # visitor lead-form submit
    "/api/leads/export",              # data portability (kept open intentionally)
    "/api/superseller/lead-capture",  # visitor lead capture
    "/api/superseller/chat",          # visitor chat on published SuperSeller pages
    "/api/posters/generation",        # public poster RESULT view/serve/download
)


def _requires_paid_membership(path: str) -> bool:
    """True if the path requires a paid (is_active) member. Exempt prefixes
    (visitor-facing + data export) win over the gate."""
    for ex in GATE_EXEMPT_PREFIXES:
        if path.startswith(ex):
            return False
    for prefix in PAID_REQUIRED_PREFIXES:
        if path.startswith(prefix):
            return True
    return False


def _build_403_paid(redirect_url: str = "/upgrade"):
    """JSON 403 the React frontend can detect and act on. The 'redirect'
    field is a hint for client-side handling; backend doesn't actually
    issue the redirect."""
    return JSONResponse(
        {
            "error": "This feature requires an active Partner membership.",
            "tier_required": "paid",
            "redirect": redirect_url,
            "upgrade_required": True,
        },
        status_code=403,
    )


class TierGateMiddleware(BaseHTTPMiddleware):
    """Gates API endpoints by paid membership.

    For non-API paths, falls through to the route handler (React route
    guards handle page-level redirects; this middleware only protects
    API data endpoints).
    """

    async def dispatch(self, request, call_next):
        path = request.url.path

        # Only API endpoints are gated here. Page navigation is handled
        # by React route guards. (Direct URL navigation to a React-served
        # path still loads the React app, which then route-guards.)
        if not path.startswith("/api/"):
            return await call_next(request)

        if not _requires_paid_membership(path):
            return await call_next(request)

        # TEMP 502 diagnostic: mark that the generate request reached the top of
        # the tier-gate, BEFORE the synchronous DB user-lookup below. Keyed to a
        # fixed sentinel (-1) since the user isn't resolved yet. If this fires
        # but 'tiergate_pass' (after the lookup) does not, the request dies IN the
        # tier-gate's DB user-lookup.
        if path == "/api/superscene/generate":
            try:
                from .main import _gen_crumb
                _gen_crumb(-1, "tiergate_enter", path)
            except Exception:
                pass

        # We need the user. Manually look up the session cookie like
        # get_current_user does, but without FastAPI's Depends machinery.
        # We can't import get_current_user at module-import time without
        # circular import, so do the lookup directly.
        from .main import session_serializer
        from .database import SessionLocal, User
        from itsdangerous import BadSignature, SignatureExpired

        token = request.cookies.get("session")
        user = None
        if token:
            try:
                user_id = session_serializer.loads(token, max_age=60 * 60 * 24 * 30)
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.id == int(user_id)).first()
                finally:
                    db.close()
            except (BadSignature, SignatureExpired, ValueError, TypeError):
                user = None

        # TEMP 502 diagnostic: record that the request passed the tier-gate
        # (resolved the user, about to hand off to the handler). If this crumb
        # is the furthest one, the request dies in get_db / get_current_user /
        # the handler entry — not in the gate itself.
        if path == "/api/superscene/generate":
            try:
                from .main import _gen_crumb
                _gen_crumb(user.id if user else 0, "tiergate_pass",
                           f"admin={bool(user and getattr(user,'is_admin',False))}")
            except Exception:
                pass

        # Admin bypass — full access regardless of tier
        if user and getattr(user, "is_admin", False):
            return await call_next(request)

        # No user / not authenticated — 401 not 403 so the frontend can
        # show login redirect rather than upgrade prompt
        if not user:
            return JSONResponse(
                {"error": "Authentication required"},
                status_code=401,
            )

        # Paid gate: is_active must be True
        if not getattr(user, "is_active", False):
            return _build_403_paid("/upgrade")

        return await call_next(request)
