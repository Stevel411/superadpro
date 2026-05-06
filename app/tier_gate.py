"""
Tier-based API access gate.

Single source of truth for which API endpoints require which membership tier.
Runs as middleware so we don't have to add `if not user.is_active` to 80
endpoint handlers individually.

Three tiers:
  - free:   anyone authenticated (or unauthenticated, for some paths)
  - basic:  must have user.is_active = True (i.e. paying $20/mo or $200/yr)
  - pro:    must have membership_tier = 'pro' (i.e. paying $35/mo or $350/yr)

Pricing per docs/commission-spec.md (locked ground truth, 1 May 2026).

Admins bypass all tier checks.

The mapping below uses path-prefix matching. The longest matching prefix wins.
This means /api/lead-finder/anything is gated as 'pro' even if a more general
/api/ rule existed (which it doesn't — there is no catch-all rule).

Routes NOT in either list are unrestricted (free tier or unauthenticated access).
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


# Endpoints that require Basic membership ($20/mo) or above.
# Admins bypass. is_active=True is the gate.
BASIC_REQUIRED_PREFIXES = (
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
    "/api/purchase-consent",
    "/api/record-ad-watch",
    "/api/record-watch",
    "/api/rotators",
    "/api/superdeck",
    "/api/superscene",
    "/api/team-messages",
    "/api/upgrade-to-pro",
    "/api/video-creator",
    "/api/vip",
    "/api/wallet",
    "/api/watch",
)

# Endpoints that require Pro membership ($35/mo).
# Admins bypass. membership_tier = 'pro' is the gate (and is_active must be True).
PRO_REQUIRED_PREFIXES = (
    "/api/copilot",
    "/api/funnels",
    "/api/lead-finder",
    "/api/leads",
    "/api/niche-finder",
    "/api/proseller",
    "/api/social-posts",
    "/api/superseller",
    "/api/swipe-file",
    "/api/video-scripts",
)


def _required_tier(path: str):
    """Return 'basic', 'pro', or None if path requires no tier gate.
    Pro check first because it's more specific in case of overlap."""
    for prefix in PRO_REQUIRED_PREFIXES:
        if path.startswith(prefix):
            return "pro"
    for prefix in BASIC_REQUIRED_PREFIXES:
        if path.startswith(prefix):
            return "basic"
    return None


def _build_403(required_tier: str, redirect_url: str):
    """Return a JSON 403 response that the React frontend can detect and
    redirect on. The 'redirect' field is a hint for client-side handling;
    backend doesn't actually issue the redirect."""
    return JSONResponse(
        {
            "error": (
                f"This feature requires {required_tier.title()} membership."
            ),
            "tier_required": required_tier,
            "redirect": redirect_url,
            "upgrade_required": True,
        },
        status_code=403,
    )


class TierGateMiddleware(BaseHTTPMiddleware):
    """Gates API endpoints by membership tier.

    For non-API paths, falls through to the route handler (React route guards
    handle page-level redirects; this middleware only protects API data).
    """

    async def dispatch(self, request, call_next):
        path = request.url.path

        # Only API endpoints are gated here. Page navigation is handled
        # by React route guards. (Direct URL navigation to a React-served
        # path still loads the React app, which then route-guards.)
        if not path.startswith("/api/"):
            return await call_next(request)

        required = _required_tier(path)
        if required is None:
            return await call_next(request)

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

        # Basic tier gate: is_active must be True
        if required == "basic":
            if not getattr(user, "is_active", False):
                return _build_403("basic", "/upgrade")
            return await call_next(request)

        # Pro tier gate: is_active=True AND membership_tier='pro'
        if required == "pro":
            tier = (getattr(user, "membership_tier", "basic") or "basic").lower()
            if not getattr(user, "is_active", False):
                # They need to become Basic first, then upgrade to Pro
                return _build_403("basic", "/upgrade")
            if tier != "pro":
                return _build_403("pro", "/upgrade")
            return await call_next(request)

        # Unknown required level — fail safe
        return await call_next(request)
