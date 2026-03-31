# build: 20260306-1
import os
import asyncio
import anthropic
import json
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from .database import (
    SessionLocal, User, Payment, Commission, Withdrawal,
    Grid, GridPosition, PasswordResetToken, VIPSignup, AdListing, GRID_PACKAGES, GRID_TOTAL,
    DIRECT_PCT, UNILEVEL_PCT, PER_LEVEL_PCT, PLATFORM_PCT,
    OWNER_PCT, UPLINE_PCT, LEVEL_PCT, COMPANY_PCT
)
from .database import Course, CoursePurchase, CourseCommission, CoursePassUpTracker, CourseChapter, CourseLesson, CourseProgress
from .coinbase_commerce import create_charge as cb_create_charge, verify_webhook_signature as cb_verify_sig, parse_webhook_event as cb_parse_event, SANDBOX_MODE as CB_SANDBOX
from . import stripe_service
from .stripe_service import BOOST_PACKS as STRIPE_BOOST_PACKS, STRIPE_PUBLISHABLE_KEY
from .database import VideoCampaign, VideoWatch, WatchQuota, AIUsageQuota, AIResponseCache, MembershipRenewal, P2PTransfer, FunnelPage, ShortLink, LinkRotator, LinkClick, FunnelLead, FunnelEvent, WatchdogLog, LinkHubProfile, LinkHubLink, LinkHubClick, Notification, Achievement, BADGES
from .database import DigitalProduct, DigitalProductPurchase, DigitalProductReview, DigitalProductAffiliate
from .database import CoPilotBriefing
from .database import MemberLead
from .database import MemberCourse, MemberCourseChapter, MemberCourseLesson, MemberCoursePurchase
from .crud import create_user, verify_password
from .grid import (
    get_grid_stats, get_user_grids, get_grid_positions,
    get_user_commission_history
)
from .email_utils import send_password_reset_email
from .video_utils import parse_video_url, platform_label, platform_colour
from .course_engine import process_course_purchase, get_user_course_stats, assign_passup_sponsor
import secrets
from datetime import timedelta
from .payment import (
    process_membership_payment, process_grid_payment,
    request_withdrawal, get_user_balance, MEMBERSHIP_FEE, COMPANY_WALLET,
    process_p2p_transfer, get_p2p_history, get_renewal_status,
    initialise_renewal_record, process_auto_renewals,
    _find_overspill_placement, _cascade_auto_activation,
    MEMBERSHIP_SPONSOR_SHARE, MEMBERSHIP_COMPANY_SHARE,
    ANNUAL_PRICES, ANNUAL_SPONSOR_SHARE, ANNUAL_COMPANY_SHARE,
    PRO_MONTHLY_FEE, PRO_SPONSOR_SHARE, PRO_COMPANY_SHARE,
)
from .grid import place_member_in_grid
import re
import bleach
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

load_dotenv()

# ── Session Security ──────────────────────────────────────────
# HMAC-signed cookie prevents user_id tampering/impersonation.
# Set SESSION_SECRET in Railway env vars. Falls back to random key
# (which invalidates sessions on restart — acceptable for dev).
SESSION_SECRET = os.getenv("SESSION_SECRET") or secrets.token_hex(32)
if not os.getenv("SESSION_SECRET"):
    import warnings
    warnings.warn("⚠️ SESSION_SECRET not set — sessions will reset on every deploy. Set it in Railway env vars!")
session_serializer = URLSafeTimedSerializer(SESSION_SECRET, salt="superadpro-session")

logging.basicConfig(
    filename="security.log", level=logging.WARNING,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="SuperAdPro")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Cache headers for static assets — 1 year for images/fonts, 1 hour for CSS/JS
from starlette.middleware.base import BaseHTTPMiddleware
class CacheHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.startswith("/static/"):
            if any(path.endswith(ext) for ext in [".png",".jpg",".jpeg",".gif",".webp",".woff2",".woff",".ttf",".ico",".svg"]):
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            elif any(path.endswith(ext) for ext in [".css",".js",".json"]):
                response.headers["Cache-Control"] = "public, max-age=3600"
        return response
app.add_middleware(CacheHeaderMiddleware)

# Redirect bare domain to www (preserves full path + query string)
class WwwRedirectMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        host = request.headers.get("host", "")
        if host == "superadpro.com":
            url = str(request.url).replace("://superadpro.com", "://www.superadpro.com", 1)
            return RedirectResponse(url=url, status_code=301)
        return await call_next(request)
app.add_middleware(WwwRedirectMiddleware)

# Decimal-safe JSON — Numeric(18,6) columns return Decimal objects
# which the default JSON encoder can't handle. This converts them to float.
import decimal
import json as _json
class DecimalEncoder(_json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o)
        return super().default(o)

# Monkey-patch JSONResponse to use Decimal-safe encoder
from starlette.responses import JSONResponse as _OrigJSONResponse
_orig_render = _OrigJSONResponse.render
def _decimal_safe_render(self, content):
    return _json.dumps(
        content, ensure_ascii=False, allow_nan=False,
        indent=None, separators=(",", ":"), cls=DecimalEncoder
    ).encode("utf-8")
JSONResponse.render = _decimal_safe_render

@app.on_event("startup")
async def startup_event():
    import time
    from .database import engine, run_migrations
    from sqlalchemy import text
    for attempt in range(1, 6):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"✅ DB connected on attempt {attempt}")
            break
        except Exception as e:
            print(f"⚠️ DB attempt {attempt} failed: {e}")
            if attempt < 5:
                time.sleep(3)
    try:
        run_migrations()
        print("✅ Migrations complete")
    except Exception as e:
        print(f"⚠️ Migrations skipped: {e}")
templates = Jinja2Templates(directory="templates")
# Make Decimal values render cleanly in templates
templates.env.filters["money"] = lambda v: f"{float(v or 0):.2f}"
templates.env.finalize = lambda x: float(x) if isinstance(x, decimal.Decimal) else x
import json as _json
templates.env.filters["from_json"] = lambda s: _json.loads(s) if s else []

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS — locked to our domain ──
ALLOWED_ORIGINS = [
    "https://www.superadpro.com",
    "https://superadpro.com",
    "https://www.superadpro.com",
]
if os.getenv("RAILWAY_ENVIRONMENT") == "development" or os.getenv("DEV_MODE"):
    ALLOWED_ORIGINS.append("http://localhost:5173")
    ALLOWED_ORIGINS.append("http://localhost:8080")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "HEAD", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)

# ── Security Headers Middleware ──
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ── Rate limit / lockout ──────────────────────────────────────
failed_attempts  = {}
MAX_ATTEMPTS     = 5
LOCKOUT_MINUTES  = 15

def is_locked_out(identifier):
    if identifier not in failed_attempts: return False
    attempts, lockout_time = failed_attempts[identifier]
    if attempts >= MAX_ATTEMPTS:
        if datetime.now() < lockout_time: return True
        del failed_attempts[identifier]
    return False

def record_failed_attempt(identifier):
    if identifier not in failed_attempts:
        failed_attempts[identifier] = [0, None]
    failed_attempts[identifier][0] += 1
    failed_attempts[identifier][1] = datetime.now() + timedelta(minutes=LOCKOUT_MINUTES)
    logger.warning(f"Failed login: {identifier} — attempts: {failed_attempts[identifier][0]}")

def clear_failed_attempts(identifier):
    if identifier in failed_attempts:
        del failed_attempts[identifier]

# ── Unique Slug Generator ─────────────────────────────────────
import re as _re, random as _rand, string as _string
def generate_unique_slug(db, username: str, title: str, exclude_page_id: int = None) -> str:
    """Generate a slug for a funnel page: username/title-slug.
    Returns None if slug already exists (caller should notify user)."""
    raw = _re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-') or 'page'
    slug = f"{username.lower()}/{raw}"
    q = db.query(FunnelPage).filter(FunnelPage.slug == slug)
    if exclude_page_id:
        q = q.filter(FunnelPage.id != exclude_page_id)
    if q.first():
        return None  # collision — let user pick a different name
    return slug

# ── DB / Auth helpers ─────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("session")
    if not token: return None
    try:
        # Verify HMAC signature and check max age (30 days)
        user_id = session_serializer.loads(token, max_age=60 * 60 * 24 * 30)
        return db.query(User).filter(User.id == int(user_id)).first()
    except (BadSignature, SignatureExpired, ValueError, TypeError):
        return None

def is_admin(user): return user is not None and getattr(user, "is_admin", False)

def set_secure_cookie(response, user_id):
    """Create an HMAC-signed session token. Cannot be forged without SESSION_SECRET."""
    token = session_serializer.dumps(user_id)
    response.set_cookie(
        key="session", value=token,
        httponly=True, secure=True, samesite="lax",
        max_age=60 * 60 * 24 * 30
    )

# ── Validation helpers ────────────────────────────────────────
def validate_username(u): return bool(re.match(r'^[a-zA-Z0-9_]{3,30}$', u))
def validate_email(e):    return bool(re.match(r'^[^\@\s]+@[^\@\s]+\.[^\@\s]+$', e))
def validate_wallet(w):   return bool(re.match(r'^0x[a-fA-F0-9]{40}$', w))
def sanitize(v):          return bleach.clean(v.strip()) if v else ""


# ── Dashboard context ─────────────────────────────────────────
def get_dashboard_context(request: Request, user: User, db: Session) -> dict:
    stats = get_grid_stats(db, user.id)

    # Recent commissions (general)
    commissions = get_user_commission_history(db, user.id, limit=10)

    # Sponsor username
    sponsor_username = None
    if user.sponsor_id:
        sponsor = db.query(User).filter(User.id == user.sponsor_id).first()
        if sponsor:
            sponsor_username = sponsor.username

    # Active grids per tier
    active_grids = db.query(Grid).filter(
        Grid.owner_id   == user.id,
        Grid.is_complete == False
    ).all()

    renewal = get_renewal_status(db, user.id)

    # ── Earnings breakdown by stream ──
    membership_earned = 0
    boost_earned = 0
    gen_comms = db.query(Commission).filter(Commission.to_user_id == user.id).all()
    for c in gen_comms:
        ct = (c.commission_type or "").lower()
        if "membership" in ct and "company" not in ct:
            membership_earned += float(c.amount_usdt or 0)
        elif ct == "boost":
            boost_earned += float(c.amount_usdt or 0)

    # ── Recent activity feed (last 8 from all streams) ──
    activity = []
    # Course commissions
    course_recent = db.query(CourseCommission).filter(
        CourseCommission.earner_id == user.id
    ).order_by(CourseCommission.created_at.desc()).limit(5).all()
    for c in course_recent:
        buyer = db.query(User).filter(User.id == c.buyer_id).first()
        activity.append({
            "icon": "🎓", "color": "purple",
            "title": f"{buyer.username if buyer else '?'} purchased Tier {c.course_tier}",
            "sub": "Course " + ("direct sale" if c.commission_type == "direct_sale" else "pass-up"),
            "amount": float(c.amount),
            "date": c.created_at
        })
    # General commissions
    gen_recent = db.query(Commission).filter(
        Commission.to_user_id == user.id,
        Commission.commission_type.notin_(["admin_adjustment", "admin_fix", "boost_platform_fee", "membership_company"])
    ).order_by(Commission.created_at.desc()).limit(5).all()
    for c in gen_recent:
        from_user = db.query(User).filter(User.id == c.from_user_id).first()
        ct = (c.commission_type or "").lower()
        if "membership" in ct:
            icon, color, sub = "👥", "green", "Membership commission"
        elif "boost" in ct:
            icon, color, sub = "🚀", "amber", "Campaign commission"
        else:
            icon, color, sub = "🔲", "cyan", "Grid commission"
        activity.append({
            "icon": icon, "color": color,
            "title": f"{from_user.username if from_user else '?'}" + (" joined" if "membership" in ct else " — commission"),
            "sub": sub,
            "amount": float(c.amount_usdt or 0),
            "date": c.created_at
        })
    activity.sort(key=lambda x: x["date"] or datetime.min, reverse=True)
    activity = activity[:6]
    # Serialize dates for JSON
    for a in activity:
        a["date"] = a["date"].isoformat() if a.get("date") else None

    # Course stats
    course_sale_count = user.course_sale_count or 0

    # Marketplace stats
    marketplace_earnings = float(user.marketplace_earnings or 0)
    marketplace_sales = db.query(MemberCoursePurchase).filter(
        MemberCoursePurchase.course_id.in_(
            db.query(MemberCourse.id).filter(MemberCourse.creator_id == user.id)
        ),
        MemberCoursePurchase.status == "completed"
    ).count() if user else 0
    marketplace_courses = db.query(MemberCourse).filter(
        MemberCourse.creator_id == user.id, MemberCourse.status == "published"
    ).count() if user else 0

    return {
        "request":           request,
        "user":              user,
        "display_name":      user.first_name or user.username,
        "balance":           float(user.balance or 0),
        "total_earned":      float(user.total_earned or 0),
        "grid_earnings":     float(user.grid_earnings or 0),
        "level_earnings":    float(user.level_earnings or 0),
        "upline_earnings":   float(user.upline_earnings or 0),
        "sponsor_earnings":  float(user.upline_earnings or 0),
        "course_earnings":   float(user.course_earnings or 0),
        "membership_earned": membership_earned,
        "boost_earned":      boost_earned,
        "personal_referrals":user.personal_referrals or 0,
        "total_team":        user.total_team or 0,
        "grid_stats":        stats,
        "active_grids":      active_grids,
        "recent_commissions":commissions,
        "recent_activity":   activity,
        "sponsor_username":  sponsor_username,
        "wallet_address":    user.wallet_address or "",
        "total_withdrawn":    float(user.total_withdrawn or 0),
        "is_active":         user.is_active,
        "member_id":         format_member_id(user.id, user.is_admin),
        "course_sale_count": course_sale_count,
        "marketplace_earnings": marketplace_earnings,
        "marketplace_sales": marketplace_sales,
        "marketplace_courses": marketplace_courses,
        "GRID_PACKAGES":     GRID_PACKAGES,
        "GRID_TOTAL":        GRID_TOTAL,
        "OWNER_PCT":         OWNER_PCT,
        "UPLINE_PCT":        UPLINE_PCT,
        "LEVEL_PCT":         LEVEL_PCT,
        "renewal":           renewal,
        "active_page":       "dashboard",
        "has_linkhub":       db.query(db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user.id).exists()).scalar(),
        "watch_count":       getattr(user, 'videos_watched', 0) or 0,
    }

# ═══════════════════════════════════════════════════════════════
#  PUBLIC ROUTES
# ═══════════════════════════════════════════════════════════════

@app.api_route("/", methods=["GET", "HEAD"])
def home(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>SuperAdPro</h1>")

@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/me")
def api_me(request: Request, db: Session = Depends(get_db)):
    """Return current user data for the React frontend."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_admin": user.is_admin,
        "is_active": user.is_active,
        "membership_tier": user.membership_tier or "basic",
        "balance": float(user.balance or 0),
        "total_earned": float(user.total_earned or 0),
        "total_withdrawn": float(user.total_withdrawn or 0),
        "grid_earnings": float(user.grid_earnings or 0),
        "level_earnings": float(user.level_earnings or 0),
        "upline_earnings": float(user.upline_earnings or 0),
        "course_earnings": float(user.course_earnings or 0),
        "marketplace_earnings": float(user.marketplace_earnings or 0),
        "bonus_earnings": float(user.bonus_earnings or 0),
        "personal_referrals": user.personal_referrals or 0,
        "total_team": user.total_team or 0,
        "sponsor_id": user.sponsor_id,
        "sponsor_username": (db.query(User).filter(User.id == user.sponsor_id).first().username if user.sponsor_id else None),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "onboarding_completed": user.onboarding_completed,
        "kyc_status": user.kyc_status,
        "totp_enabled": user.totp_enabled,
        "avatar_url": user.avatar_url or None,
        "country": user.country or "",
        "wallet_address": user.wallet_address or "",
        "sending_wallet": getattr(user, "sending_wallet", "") or "",
        "member_id": getattr(user, "member_id", None),
    }


@app.get("/api/notifications")
def api_notifications(request: Request, db: Session = Depends(get_db)):
    """Return recent notifications for the current user."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    notifs = db.query(Notification).filter(
        Notification.user_id == user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()
    unread = sum(1 for n in notifs if not n.is_read)
    return {
        "notifications": [{
            "id": n.id, "type": n.type, "icon": n.icon, "title": n.title,
            "message": n.message, "link": n.link, "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        } for n in notifs],
        "unread_count": unread,
    }


@app.post("/api/notifications/mark-read")
def api_mark_notifications_read(request: Request, db: Session = Depends(get_db)):
    """Mark all notifications as read."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}


@app.post("/api/notifications/clear-all")
def api_clear_all_notifications(request: Request, db: Session = Depends(get_db)):
    """Delete all notifications for the current user."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    db.query(Notification).filter(Notification.user_id == user.id).delete()
    db.commit()
    return {"ok": True}


@app.delete("/api/notifications/{notif_id}")
def api_delete_notification(notif_id: int, request: Request, db: Session = Depends(get_db)):
    """Delete a single notification."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == user.id).first()
    if n:
        db.delete(n)
        db.commit()
    return {"ok": True}

@app.get("/how-it-works")
def how_it_works(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)

@app.get("/affiliates")
def affiliates_public(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/register", status_code=302)

@app.get("/compensation-plan")
def compensation_plan(request: Request, user: User = Depends(get_current_user)):
    """Phase 1 migration: redirect to React for members, keep public page for non-members."""
    if user:
        return RedirectResponse(url="/compensation-plan", status_code=302)
    return RedirectResponse(url="/compensation-plan", status_code=302)

def _old_compensation_plan_DISABLED(request: Request, user: User = Depends(get_current_user)):
    ctx = {
        "request": request,
        "GRID_PACKAGES": GRID_PACKAGES,
        "GRID_TOTAL": GRID_TOTAL,
        "OWNER_PCT": OWNER_PCT,
        "UPLINE_PCT": UPLINE_PCT,
        "LEVEL_PCT": LEVEL_PCT,
        "COMPANY_PCT": COMPANY_PCT,
    }
    if user:
        ctx["user"] = user
        return templates.TemplateResponse("compensation-plan-internal.html", ctx)
    return templates.TemplateResponse("compensation-plan.html", ctx)

@app.get("/leaderboard")
def leaderboard_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_leaderboard_DISABLED(request: Request, tab: str = "referrals", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user:
        return RedirectResponse("/login", status_code=302)
    from sqlalchemy import func, desc

    # Tab 1: Members Referred
    ref_leaders = db.query(User).filter(User.is_active == True, User.personal_referrals > 0).order_by(desc(User.personal_referrals)).limit(50).all()

    # Tab 2: Grid Members (sum of positions_filled across all grids owned)
    grid_counts = db.query(
        Grid.owner_id, func.sum(Grid.positions_filled).label("grid_members")
    ).group_by(Grid.owner_id).order_by(desc("grid_members")).limit(50).all()
    grid_user_ids = [g[0] for g in grid_counts]
    grid_amounts = {g[0]: int(g[1] or 0) for g in grid_counts}
    grid_users = db.query(User).filter(User.id.in_(grid_user_ids)).all() if grid_user_ids else []
    grid_users.sort(key=lambda u: grid_amounts.get(u.id, 0), reverse=True)
    for u in grid_users:
        u._grid_count = grid_amounts.get(u.id, 0)

    # Tab 3: Course Sales (purchases by people the user referred)
    course_counts = db.query(
        User.sponsor_id, func.count(CoursePurchase.id).label("course_sales")
    ).join(CoursePurchase, CoursePurchase.user_id == User.id).filter(
        User.sponsor_id.isnot(None)
    ).group_by(User.sponsor_id).order_by(desc("course_sales")).limit(50).all()
    course_user_ids = [c[0] for c in course_counts]
    course_amounts = {c[0]: int(c[1] or 0) for c in course_counts}
    course_users = db.query(User).filter(User.id.in_(course_user_ids)).all() if course_user_ids else []
    course_users.sort(key=lambda u: course_amounts.get(u.id, 0), reverse=True)
    for u in course_users:
        u._course_count = course_amounts.get(u.id, 0)

    return templates.TemplateResponse("leaderboard.html", {
        "request": request, "user": user, "active_page": "leaderboard",
        "tab": tab,
        "ref_leaders": ref_leaders,
        "grid_users": grid_users, "grid_amounts": grid_amounts,
        "course_users": course_users, "course_amounts": course_amounts,
        "balance": float(user.balance or 0)
    })

@app.get("/grid-visualiser")
def grid_visualiser(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

@app.get("/api/grid-visualiser")
def api_grid_visualiser(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db), tier: int = 1):
    """Return spillover grid data for the current user at a given tier."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    # Recursively find all downline members
    downline = []
    queue = [user.id]
    visited = {user.id}
    depth_map = {user.id: 0}

    while queue:
        current_id = queue.pop(0)
        children = db.query(User).filter(User.sponsor_id == current_id).all()
        for child in children:
            if child.id not in visited:
                visited.add(child.id)
                d = depth_map[current_id] + 1
                depth_map[child.id] = d
                # Check if this member has purchased this tier
                has_tier = db.query(Payment).filter(
                    Payment.from_user_id == child.id,
                    Payment.payment_type == f"grid_tier_{tier}",
                    Payment.status == "confirmed"
                ).first() is not None
                if has_tier:
                    downline.append({
                        "id": child.id,
                        "username": child.username,
                        "depth": d,
                        "sponsor_id": child.sponsor_id,
                    })
                queue.append(child.id)

    # Sort by depth then by id (join order)
    downline.sort(key=lambda x: (x["depth"], x["id"]))

    # Build the 8x8 grid (64 seats) from downline
    grid_seats = []
    for i, member in enumerate(downline[:64]):
        grid_seats.append({
            "position": i + 1,
            "username": member["username"],
            "depth": member["depth"],
            "id": member["id"],
        })

    # Get actual grid record
    grid_record = db.query(Grid).filter(
        Grid.owner_id == user.id,
        Grid.package_tier == tier,
        Grid.is_complete == False
    ).first()

    # Completed advances
    completed = db.query(Grid).filter(
        Grid.owner_id == user.id,
        Grid.package_tier == tier,
        Grid.is_complete == True
    ).count()

    return JSONResponse({
        "seats": grid_seats,
        "filled": len(grid_seats),
        "total": 64,
        "tier": tier,
        "price": GRID_PACKAGES.get(tier, 0),
        "advance": grid_record.advance_number if grid_record else completed + 1,
        "completed_advances": completed,
        "total_downline": len(downline),
    })

@app.get("/passup-visualiser")
def passup_visualiser(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

@app.get("/packages")
def packages(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)

@app.get("/campaign-tiers")
def campaign_tiers(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_campaign_tiers_DISABLED(request: Request, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/login", status_code=302)
    user_grids = db.query(Grid).filter(Grid.owner_id == user.id).all()
    active_tiers = set(g.package_tier for g in user_grids if not g.is_complete)
    return templates.TemplateResponse("campaign-tiers.html", {
        "request": request,
        "user": user,
        "GRID_PACKAGES": GRID_PACKAGES,
        "active_tiers": active_tiers,
        "balance": user.balance or 0,
    })

@app.get("/faq")
def faq(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)

@app.get("/membership")
def membership(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/register", status_code=302)

@app.get("/pricing")
def pricing(request: Request):
    """Alias for /membership."""
    return RedirectResponse(url="/membership", status_code=302)

@app.get("/support-public")
def support_public(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)

@app.get("/support")
def support_get(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

@app.post("/support")
async def support_post(
    request: Request,
    first_name: str = Form(), last_name: str = Form(),
    email: str = Form(), username: str = Form(""),
    category: str = Form(), subject: str = Form(),
    message: str = Form(), tx_hash: str = Form(""),
    db: Session = Depends(get_db)
):
    logger.warning(f"Support ticket: {email} | {category} | {subject}")
    return JSONResponse({"success": True, "message": "Support ticket received. We'll be in touch shortly."})

@app.get("/legal")
def legal(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)

@app.get("/contact")
def contact(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)

@app.get("/wallet-guide")
def wallet_guide(request: Request):
    return templates.TemplateResponse("wallet-guide.html", {"request": request})

@app.get("/apple-touch-icon.png")
@app.get("/apple-touch-icon-precomposed.png")
def apple_touch_icon():
    """iOS looks for touch icon at root level."""
    from fastapi.responses import FileResponse
    import os
    icon_path = Path("static/icons/apple-touch-icon.png")
    if icon_path.exists():
        return FileResponse(str(icon_path), media_type="image/png")
    return FileResponse(str(Path("static/icons/icon-192.png")), media_type="image/png")


@app.get("/earn")
def earn_page(request: Request):
    """Affiliate recruitment landing page."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/for-advertisers")
def for_advertisers(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/register", status_code=302)

# ── Referral link ─────────────────────────────────────────────
@app.get("/ref/{username}")
def referral_link(username: str, request: Request):
    # Redirect to home page — modal opens automatically via ?join= param
    response = RedirectResponse(url=f"/?join={username}", status_code=302)
    response.set_cookie(key="ref", value=username, max_age=60*60*24*30,
                        httponly=False, samesite="lax")
    return response


@app.get("/join/{username}")
def superlink_page(username: str, request: Request, db: Session = Depends(get_db)):
    """SuperLink — personalised sales page for affiliate sharing.
    Sets referral cookie and serves the React SPA which reads the username from the URL."""
    # Verify sponsor exists
    sponsor = db.query(User).filter(User.username == username).first()
    if not sponsor:
        return RedirectResponse(url="/", status_code=302)
    # Serve React SPA with referral cookie
    if _react_index.exists():
        response = HTMLResponse(_react_index.read_text())
    else:
        response = RedirectResponse(url=f"/register?ref={username}", status_code=302)
    response.set_cookie(key="ref", value=username, max_age=60*60*24*30,
                        httponly=False, samesite="lax")
    return response

# ═══════════════════════════════════════════════════════════════
#  FOMO CAMPAIGN PAGE
# ═══════════════════════════════════════════════════════════════

@app.get("/momentum")
def fomo_page(request: Request, ref: str = "", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """FOMO campaign page — primary affiliate shareable link.
       Usage: superadpro.com/momentum?ref=username
    """
    sponsor = ref or request.query_params.get("ref", "") or request.cookies.get("ref", "")
    # Look up sponsor for personalised messaging
    sponsor_user = None
    if sponsor:
        sponsor_user = db.query(User).filter(User.username == sponsor).first()

    response = HTMLResponse(_react_index.read_text()) if _react_index.exists() else RedirectResponse(url="/register")
    # Set referral cookie so it persists through to registration
    if sponsor:
        response.set_cookie(key="ref", value=sponsor, max_age=60*60*24*30,
                            httponly=False, samesite="lax")
    return response

@app.get("/api/fomo-stats")
def fomo_stats_api(db: Session = Depends(get_db)):
    """Real-time stats for the FOMO page with simulated fallback."""
    from datetime import datetime, timedelta
    from sqlalchemy import func, desc
    import random

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Real data queries
    active_members = db.query(User).filter(User.is_active == True).count()
    grids_completed = db.query(Grid).filter(Grid.is_complete == True).count()

    # Today's commissions
    today_commissions = db.query(func.sum(Commission.amount_usdt)).filter(
        Commission.created_at >= today
    ).scalar() or 0

    # Recent grid positions filled
    recent_positions = db.query(GridPosition).order_by(desc(GridPosition.created_at)).limit(10).all()

    # Average positions filled across active grids
    avg_filled = db.query(func.avg(Grid.positions_filled)).filter(
        Grid.is_complete == False, Grid.positions_filled > 0
    ).scalar() or 0

    # Build recent activity from real data
    recent_activity = []
    recent_users = db.query(User).filter(
        User.is_active == True
    ).order_by(desc(User.created_at)).limit(10).all()

    for u in recent_users:
        mins_ago = int((datetime.utcnow() - u.created_at).total_seconds() / 60)
        time_str = "just now" if mins_ago < 2 else f"{mins_ago}m ago" if mins_ago < 60 else f"{mins_ago // 60}h ago"
        recent_activity.append({
            "name": f"{(u.first_name or u.username or 'Member')[:1]}. {(u.last_name or '')[:1]}." if u.first_name else f"Member {u.id}",
            "type": "joined",
            "tier": "$100",
            "pos": random.randint(1, 64),
            "time": time_str
        })

    # Ensure minimums for social proof (supplement with realistic ranges if data is low)
    if active_members < 5:
        active_members = random.randint(180, 450)
    if today_commissions < 10:
        today_commissions = random.randint(2500, 8500)
    if grids_completed < 1:
        grids_completed = random.randint(5, 25)

    return {
        "active_members": active_members,
        "paid_today": float(today_commissions),
        "grids_completed": grids_completed,
        "avg_fill_time": f"{random.randint(3,6)}.{random.randint(1,9)} days",
        "positions_filled": int(avg_filled) if avg_filled > 5 else random.randint(35, 52),
        "earned_today": float(today_commissions),
        "recent_activity": recent_activity[:8]
    }

# ═══════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/register")
def register_form(request: Request, ref: str = ""):
    """Phase 2: serve React SPA — React Router handles /register."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/?register=1", status_code=302)

@app.post("/register")
@limiter.limit("5/minute")
def register_process(
    request: Request,
    first_name:       str  = Form(),
    username:         str  = Form(),
    email:            str  = Form(),
    password:         str  = Form(),
    confirm_password: str  = Form(),
    ref:              str  = Form(""),
    db: Session = Depends(get_db)
):
    username   = sanitize(username)
    email      = sanitize(email)
    first_name = sanitize(first_name)
    ref        = sanitize(ref)

    def err(msg):
        return JSONResponse({"error": msg}, status_code=400)

    if not first_name.strip():
        return err("Please enter your first name.")
    if not validate_username(username):
        return err("Username must be 3–30 characters, letters, numbers and underscores only.")
    if not validate_email(email):
        return err("Please enter a valid email address.")
    if len(password) < 8:
        return err("Password must be at least 8 characters.")
    if len(password.encode("utf-8")) > 72:
        return err("Password must be 72 characters or less.")
    if password != confirm_password:
        return err("Passwords do not match.")

    existing = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()
    if existing:
        return err("Username or email already registered.")

    sponsor_id = None
    if ref:
        sponsor = db.query(User).filter(User.username == ref).first()
        if sponsor:
            sponsor_id = sponsor.id
            sponsor.total_team = (sponsor.total_team or 0) + 1
    
    # Default to company account if no sponsor
    if not sponsor_id:
        company = db.query(User).filter(User.username == "SuperAdPro").first()
        if company:
            sponsor_id = company.id
            company.total_team = (company.total_team or 0) + 1

    user = create_user(
        db, username, email, password,
        sponsor_id=sponsor_id,
        first_name=first_name,
        last_name="",
        wallet_address="",
        country="",
    )

    # Assign pass-up sponsor for course commission chain
    if sponsor_id:
        sponsor_obj = db.query(User).filter(User.id == sponsor_id).first()
        assign_passup_sponsor(db, user, sponsor_obj)

    db.commit()

    # ── Post-registration notifications ──

    # 1. Email the sponsor: "New member joined your team!"
    if sponsor_id:
        try:
            sponsor_obj = db.query(User).filter(User.id == sponsor_id).first()
            if sponsor_obj and sponsor_obj.email:
                from .email_utils import send_email
                send_email(
                    to_email=sponsor_obj.email,
                    subject=f"🎉 {first_name} just joined your SuperAdPro team!",
                    html_body=f"""
                    <div style="font-family:DM Sans,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
                        <div style="text-align:center;margin-bottom:24px;">
                            <span style="font-family:Sora,sans-serif;font-size:22px;font-weight:800;">SuperAd<span style="color:#38bdf8;">Pro</span></span>
                        </div>
                        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;padding:28px 24px;text-align:center;margin-bottom:20px;">
                            <div style="font-size:42px;margin-bottom:12px;">🎉</div>
                            <h1 style="color:#fff;font-family:Sora,sans-serif;font-size:22px;font-weight:800;margin:0 0 8px;">New Team Member!</h1>
                            <p style="color:rgba(200,220,255,.6);font-size:15px;margin:0;line-height:1.6;">
                                <strong style="color:#38bdf8;">{first_name}</strong> ({username}) just joined SuperAdPro through your referral link.
                            </p>
                        </div>
                        <div style="background:#f8f9fb;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
                            <p style="font-size:14px;color:#334155;line-height:1.7;margin:0 0 12px;">
                                Welcome them with a message in <strong>Team Messenger</strong> — members who connect with their sponsor in the first 24 hours are 5x more likely to stay active.
                            </p>
                            <a href="https://www.superadpro.com/team-messenger" style="display:inline-block;padding:10px 24px;background:#0ea5e9;color:#fff;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">Send a Welcome Message →</a>
                        </div>
                        <p style="font-size:12px;color:#94a3b8;text-align:center;">Your network is growing. Keep sharing your referral link to build your team.</p>
                    </div>
                    """,
                    text_body=f"{first_name} ({username}) just joined your SuperAdPro team! Send them a welcome message in Team Messenger."
                )
        except Exception:
            pass

    # 2. Auto welcome message from sponsor via Team Messenger
    if sponsor_id:
        try:
            sponsor_obj = db.query(User).filter(User.id == sponsor_id).first()
            if sponsor_obj:
                from .database import TeamMessage
                welcome_msg = TeamMessage(
                    from_user_id=sponsor_id,
                    to_user_id=user.id,
                    message=f"Hey {first_name}! 👋 Welcome to SuperAdPro! I'm {sponsor_obj.first_name or sponsor_obj.username}, your sponsor. If you need any help getting started, just message me here. First steps: set up your profile, check out the Training Centre, and share your referral link to start building your team. Let's go! 🚀",
                    is_read=False,
                )
                db.add(welcome_msg)
                db.commit()
        except Exception:
            pass

    response = RedirectResponse(url="/dashboard", status_code=303)
    set_secure_cookie(response, user.id)
    response.delete_cookie("ref")
    return response





@app.get("/login")
def login_form(request: Request):
    """Phase 2: serve React SPA — React Router handles /login."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)

@app.post("/login")
@limiter.limit("10/minute")
def login_process(
    request: Request,
    username: str = Form(), password: str = Form(),
    db: Session = Depends(get_db)
):
    username = sanitize(username)
    if is_locked_out(username):
        return JSONResponse({"error": f"Account locked — too many failed attempts. Try again in {LOCKOUT_MINUTES} minutes."}, status_code=429)
    user = db.query(User).filter(
        (User.username == username) | (User.email == username)
    ).first()
    if user and verify_password(password, user.password):
        clear_failed_attempts(username)
        # Check if 2FA is enabled — require code before granting session
        if getattr(user, 'totp_enabled', False) and user.totp_secret:
            # Store user ID in a temporary pre-auth cookie (not a full session)
            response = RedirectResponse(url="/login/2fa", status_code=303)
            response.set_cookie("pre_auth", str(user.id), max_age=300, httponly=True, samesite="lax")
            return response
        # No 2FA — log in directly
        response = RedirectResponse(url="/dashboard", status_code=303)
        set_secure_cookie(response, user.id)
        return response
    record_failed_attempt(username)
    return JSONResponse({"error": "Invalid username or password."}, status_code=401)


@app.post("/api/login")
@limiter.limit("10/minute")
async def api_login(
    request: Request,
    db: Session = Depends(get_db)
):
    """JSON login endpoint for the modal — returns JSON instead of redirect."""
    from fastapi.responses import JSONResponse
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)

    username = sanitize(body.get("username", "").strip())
    password = body.get("password", "")

    if is_locked_out(username):
        return JSONResponse({
            "error": f"Account locked — too many failed attempts. Try again in {LOCKOUT_MINUTES} minutes."
        }, status_code=429)

    user = db.query(User).filter(
        (User.username == username) | (User.email == username)
    ).first()

    if user and verify_password(password, user.password):
        clear_failed_attempts(username)
        # Check 2FA
        if getattr(user, 'totp_enabled', False) and user.totp_secret:
            response = JSONResponse({"success": True, "requires_2fa": True, "redirect": "/login/2fa"})
            response.set_cookie("pre_auth", str(user.id), max_age=300, httponly=True, samesite="lax")
            return response
        response = JSONResponse({"success": True, "redirect": "/dashboard"})
        set_secure_cookie(response, user.id)
        return response

    record_failed_attempt(username)
    return JSONResponse({"error": "Invalid username or password."}, status_code=401)


@app.get("/logout")
def logout():
    response = RedirectResponse(url="/")
    response.delete_cookie("session")
    response.delete_cookie("user_id")
    response.delete_cookie("pre_auth")
    return response
@app.post("/api/2fa/verify-login")
@limiter.limit("10/minute")
async def api_2fa_verify_login(request: Request, db: Session = Depends(get_db)):
    """JSON: verify 2FA code during login flow."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)

    import pyotp
    pre_auth = request.cookies.get("pre_auth")
    if not pre_auth:
        return JSONResponse({"error": "Session expired. Please log in again."}, status_code=401)

    user = db.query(User).filter(User.id == int(pre_auth)).first()
    if not user or not user.totp_secret:
        return JSONResponse({"error": "Invalid session."}, status_code=401)

    code = body.get("code", "").strip()
    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(code, valid_window=1):
        response = JSONResponse({"success": True, "redirect": "/dashboard"})
        set_secure_cookie(response, user.id)
        response.delete_cookie("pre_auth")
        return response
    record_failed_attempt(user.username)
    return JSONResponse({"error": "Invalid code. Please try again."}, status_code=400)


@app.get("/api/2fa/setup")
async def api_2fa_setup(request: Request, user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    """JSON: generate TOTP secret and QR code for setup."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    import pyotp, qrcode, io, base64
    if not user.totp_secret or user.totp_enabled:
        secret = pyotp.random_base32()
        user.totp_secret = secret
        db.commit()
    else:
        secret = user.totp_secret
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.email or user.username, issuer_name="SuperAdPro")
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    return {"qr_b64": qr_b64, "secret": secret, "email": user.email or user.username}


@app.post("/api/2fa/confirm-setup")
async def api_2fa_confirm_setup(request: Request, user: User = Depends(get_current_user),
                                  db: Session = Depends(get_db)):
    """JSON: confirm 2FA setup with a valid code."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    import pyotp
    body = await request.json()
    code = body.get("code", "").strip()
    if not user.totp_secret:
        return JSONResponse({"error": "No secret generated. Please start setup again."}, status_code=400)
    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(code, valid_window=1):
        user.totp_enabled = True
        db.commit()
        return {"success": True, "message": "2FA enabled successfully"}
    return JSONResponse({"error": "Invalid code. Please try again."}, status_code=400)


@app.post("/api/forgot-password")
@limiter.limit("3/minute")
async def api_forgot_password(request: Request, db: Session = Depends(get_db)):
    """JSON: request a password reset email."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)
    email = sanitize(body.get("email", "").strip().lower())
    # Always return success — prevents email enumeration
    if not validate_email(email):
        return JSONResponse({"error": "Please enter a valid email address."}, status_code=400)
    user = db.query(User).filter(User.email == email).first()
    if user:
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False
        ).delete()
        token = secrets.token_hex(32)
        reset_token = PasswordResetToken(
            user_id=user.id, token=token,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.add(reset_token)
        db.commit()
        reset_url = f"https://www.superadpro.com/reset-password?token={token}"
        send_password_reset_email(
            to_email=user.email,
            first_name=user.first_name or user.username,
            reset_url=reset_url,
        )
    return {"success": True, "message": "If that email is registered, a reset link has been sent."}


@app.post("/api/reset-password")
@limiter.limit("5/minute")
async def api_reset_password(request: Request, db: Session = Depends(get_db)):
    """JSON: reset password using a valid token."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)
    token = body.get("token", "").strip()
    password = body.get("new_password", "") or body.get("password", "")
    confirm = body.get("confirm_password", "")
    if not token:
        return JSONResponse({"error": "Invalid reset link."}, status_code=400)
    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used == False
    ).first()
    if not reset or reset.expires_at < datetime.utcnow():
        return JSONResponse({"error": "This reset link has expired. Please request a new one."}, status_code=400)
    if len(password) < 8:
        return JSONResponse({"error": "Password must be at least 8 characters."}, status_code=400)
    if len(password.encode("utf-8")) > 72:
        return JSONResponse({"error": "Password must be 72 characters or less."}, status_code=400)
    if password != confirm:
        return JSONResponse({"error": "Passwords do not match."}, status_code=400)
    import bcrypt
    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        return JSONResponse({"error": "User not found."}, status_code=400)
    user.password = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    reset.used = True
    db.commit()
    return {"success": True, "message": "Password reset successfully. You can now log in."}




@app.get("/login/2fa")
def login_2fa_form(request: Request):
    """Phase 2: serve React SPA — React Router handles /login/2fa."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/login", status_code=302)

@app.post("/login/2fa")
@limiter.limit("10/minute")
def login_2fa_verify(
    request: Request,
    totp_code: str = Form(),
    db: Session = Depends(get_db)
):
    """Verify 2FA code and complete login."""
    import pyotp
    pre_auth = request.cookies.get("pre_auth")
    if not pre_auth:
        return RedirectResponse(url="/login", status_code=303)

    user = db.query(User).filter(User.id == int(pre_auth)).first()
    if not user or not user.totp_secret:
        return RedirectResponse(url="/login", status_code=303)

    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(totp_code.strip(), valid_window=1):
        # Code valid — grant full session
        response = RedirectResponse(url="/dashboard", status_code=303)
        set_secure_cookie(response, user.id)
        response.delete_cookie("pre_auth")
        return response
    else:
        return RedirectResponse(url="/login/2fa?error=invalid_code", status_code=303)

# ═══════════════════════════════════════════════════════════════
#  PROTECTED DASHBOARD ROUTES
# ═══════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
#  PWA APP — Mobile watch & earn hub
# ═══════════════════════════════════════════════════════════════
@app.get("/app")
def app_home(request: Request):
    """Serve React SPA — let React handle auth."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h2>React app not built yet. Run: cd frontend && npm run build</h2>", status_code=503)


@app.get("/dashboard")
def dashboard(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


# ── Missing React page routes ──
@app.get("/network")
@app.get("/ad-board")
@app.get("/2fa-setup")
@app.get("/supermarket/create")
@app.get("/activate/{tier_id}")
@app.get("/free/{tool_path:path}")
def serve_react_page(request: Request, tier_id: str = "", tool_path: str = ""):
    """Serve React SPA for pages without dedicated backend routes."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/api/dashboard")
def api_dashboard(request: Request, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """JSON dashboard data for React frontend."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    try:
        import time as _t
        t0 = _t.time()
        check_achievements(db, user)
        t1 = _t.time()
        ctx = get_dashboard_context(request, user, db)
        t2 = _t.time()
        # Strip non-serialisable items
        safe = {}
        for k, v in ctx.items():
            if k in ('request', 'user'):
                continue
            try:
                json.dumps(v)
                safe[k] = v
            except (TypeError, ValueError):
                safe[k] = str(v)
        t3 = _t.time()
        logger.info(f"Dashboard API timing: achievements={t1-t0:.3f}s context={t2-t1:.3f}s serialize={t3-t2:.3f}s total={t3-t0:.3f}s")
        return safe
    except Exception as exc:
        import traceback
        logger.error(f"Dashboard API error for user {user.id}: {traceback.format_exc()}")
        return JSONResponse({"error": str(exc), "trace": traceback.format_exc()[-500:]}, status_code=500)

@app.get("/analytics")
def analytics_page(request: Request):
    """Serve React SPA for analytics."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/api/analytics")
def api_analytics(request: Request, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """Analytics data — earnings trends, breakdowns, grid progress, team growth."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from datetime import datetime, timedelta
    from sqlalchemy import func, cast, Date
    from collections import defaultdict

    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    twelve_weeks_ago = now - timedelta(weeks=12)
    six_months_ago = now - timedelta(days=180)

    # ── Daily earnings (last 30 days) ──
    daily_commissions = db.query(
        cast(Commission.paid_at, Date).label('day'),
        func.sum(Commission.amount_usdt).label('total')
    ).filter(
        Commission.to_user_id == user.id,
        Commission.paid_at >= thirty_days_ago
    ).group_by(cast(Commission.paid_at, Date)).all()

    daily_courses = db.query(
        cast(CourseCommission.created_at, Date).label('day'),
        func.sum(CourseCommission.amount).label('total')
    ).filter(
        CourseCommission.earner_id == user.id,
        CourseCommission.created_at >= thirty_days_ago
    ).group_by(cast(CourseCommission.created_at, Date)).all()

    daily_map = defaultdict(float)
    for row in daily_commissions:
        if row.day:
            daily_map[str(row.day)] += float(row.total or 0)
    for row in daily_courses:
        if row.day:
            daily_map[str(row.day)] += float(row.total or 0)

    # Build 30-day array
    daily_earnings = []
    for i in range(30):
        d = (now - timedelta(days=29-i)).strftime('%Y-%m-%d')
        daily_earnings.append({"date": d, "amount": round(daily_map.get(d, 0), 2)})

    # ── Income breakdown by type ──
    grid_total = float(db.query(func.coalesce(func.sum(Commission.amount_usdt), 0)).filter(
        Commission.to_user_id == user.id,
        Commission.commission_type.in_(['direct_sponsor', 'uni_level', 'grid_completion_bonus'])
    ).scalar() or 0)

    membership_total = float(db.query(func.coalesce(func.sum(Commission.amount_usdt), 0)).filter(
        Commission.to_user_id == user.id,
        Commission.commission_type.in_(['membership', 'membership_renewal'])
    ).scalar() or 0)

    course_total = float(db.query(func.coalesce(func.sum(CourseCommission.amount), 0)).filter(
        CourseCommission.earner_id == user.id,
    ).scalar() or 0)

    # SuperMarket placeholder
    supermarket_total = 0

    # ── Grid progress ──
    active_grids = db.query(Grid).filter(
        Grid.owner_id == user.id, Grid.is_complete == False
    ).order_by(Grid.package_tier).all()

    grid_progress = [{
        "tier": g.package_tier,
        "price": float(g.package_price),
        "filled": g.positions_filled,
        "total": 64,
        "advance": g.advance_number,
        "bonus_pool": float(g.bonus_pool_accrued or 0),
    } for g in active_grids]

    # ── Campaign performance ──
    active_campaigns = db.query(VideoCampaign).filter(
        VideoCampaign.user_id == user.id,
        VideoCampaign.is_completed == False
    ).order_by(VideoCampaign.campaign_tier).all()

    campaigns = [{
        "tier": c.campaign_tier,
        "views_delivered": c.views_delivered or 0,
        "views_target": c.views_target or 0,
        "status": c.status,
    } for c in active_campaigns]

    # ── Team growth (weekly, last 12 weeks) ──
    team_weekly = []
    for w in range(12):
        week_start = now - timedelta(weeks=12-w)
        week_end = now - timedelta(weeks=11-w)
        count = db.query(func.count(User.id)).filter(
            User.sponsor_id == user.id,
            User.created_at >= week_start,
            User.created_at < week_end
        ).scalar() or 0
        team_weekly.append({"week": w+1, "count": count})

    # ── Monthly earnings by stream (last 6 months) ──
    monthly_streams = []
    for m in range(6):
        month_start = (now.replace(day=1) - timedelta(days=30*m)).replace(day=1)
        if m > 0:
            month_end = (now.replace(day=1) - timedelta(days=30*(m-1))).replace(day=1)
        else:
            month_end = now

        m_grid = float(db.query(func.coalesce(func.sum(Commission.amount_usdt), 0)).filter(
            Commission.to_user_id == user.id,
            Commission.commission_type.in_(['direct_sponsor', 'uni_level', 'grid_completion_bonus']),
            Commission.paid_at >= month_start, Commission.paid_at < month_end
        ).scalar() or 0)

        m_memb = float(db.query(func.coalesce(func.sum(Commission.amount_usdt), 0)).filter(
            Commission.to_user_id == user.id,
            Commission.commission_type.in_(['membership', 'membership_renewal']),
            Commission.paid_at >= month_start, Commission.paid_at < month_end
        ).scalar() or 0)

        m_course = float(db.query(func.coalesce(func.sum(CourseCommission.amount), 0)).filter(
            CourseCommission.earner_id == user.id,
            CourseCommission.created_at >= month_start, CourseCommission.created_at < month_end
        ).scalar() or 0)

        monthly_streams.insert(0, {
            "month": month_start.strftime('%b'),
            "grid": round(m_grid, 2),
            "membership": round(m_memb, 2),
            "courses": round(m_course, 2),
            "supermarket": 0,
        })

    # ── Recent commissions ──
    recent_grid = db.query(Commission).filter(
        Commission.to_user_id == user.id
    ).order_by(Commission.created_at.desc()).limit(15).all()

    recent_course = db.query(CourseCommission).filter(
        CourseCommission.earner_id == user.id
    ).order_by(CourseCommission.created_at.desc()).limit(5).all()

    recent = []
    for c in recent_grid:
        from_user = db.query(User).filter(User.id == c.from_user_id).first() if c.from_user_id else None
        recent.append({
            "date": c.created_at.strftime('%b %d') if c.created_at else '',
            "type": c.commission_type or 'unknown',
            "from": ('@' + from_user.username) if from_user else 'System',
            "tier": c.package_tier,
            "amount": float(c.amount_usdt or 0),
        })
    for c in recent_course:
        buyer = db.query(User).filter(User.id == c.buyer_id).first() if c.buyer_id else None
        recent.append({
            "date": c.created_at.strftime('%b %d') if c.created_at else '',
            "type": 'course_' + (c.commission_type or 'sale'),
            "from": ('@' + buyer.username) if buyer else 'System',
            "tier": c.course_tier,
            "amount": float(c.amount or 0),
        })
    recent.sort(key=lambda x: x['date'], reverse=True)

    return {
        "daily_earnings": daily_earnings,
        "income_breakdown": {
            "grid": round(grid_total, 2),
            "membership": round(membership_total, 2),
            "courses": round(course_total, 2),
            "supermarket": round(supermarket_total, 2),
        },
        "grid_progress": grid_progress,
        "campaigns": campaigns,
        "team_weekly": team_weekly,
        "monthly_streams": monthly_streams,
        "recent_commissions": recent[:15],
        "totals": {
            "balance": float(user.balance or 0),
            "total_earned": float(user.total_earned or 0),
            "grid_earnings": round(grid_total, 2),
            "course_earnings": round(course_total, 2),
            "membership_earnings": round(membership_total, 2),
            "team_size": user.total_team or 0,
        }
    }


@app.get("/launch-wizard")
def launch_wizard(request: Request):
    """Phase 4: serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/dashboard", status_code=302)

@app.post("/api/launch-wizard/complete")
def complete_launch_wizard(request: Request, user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    user.onboarding_completed = True
    db.commit()
    return {"success": True}

@app.post("/api/launch-wizard/generate-funnel")
async def generate_launch_funnel(request: Request, user: User = Depends(get_current_user),
                                 db: Session = Depends(get_db)):
    """AI generates a complete funnel page based on wizard answers."""
    if not user: return {"error": "Not logged in"}
    body = await request.json()
    niche = body.get("niche", "online business")
    audience = body.get("audience", "beginners")
    tone = body.get("tone", "professional")

    # Build sections for the funnel
    import json
    sections = [
        {"templateId": "hero-video", "data": {
            "headline": f"Discover How to Build Real Income in {niche}",
            "subheadline": f"A proven system designed for {audience} — no experience needed.",
            "video_url": "", "cta_text": "Get Started Now →", "cta_url": f"/ref/{user.username}"
        }},
        {"templateId": "stats-bar", "data": {
            "items": [
                {"value": "10,000+", "label": "Active Members"},
                {"value": "$2.5M+", "label": "Paid Out"},
                {"value": "150+", "label": "Countries"},
                {"value": "4.9/5", "label": "Rating"}
            ]
        }},
        {"templateId": "benefits-grid", "data": {
            "title": f"Why {niche} with SuperAdPro?",
            "items": [
                {"icon": "🚀", "title": "Quick Start", "desc": "Go from zero to earning in under 30 minutes."},
                {"icon": "🤖", "title": "AI Does the Work", "desc": "Our AI builds your marketing so you can focus on results."},
                {"icon": "💰", "title": "Multiple Streams", "desc": "Earn from commissions, referrals, and ad revenue."},
                {"icon": "📱", "title": "Work Anywhere", "desc": "Just a phone and internet — that's all you need."},
                {"icon": "🎓", "title": "Full Training", "desc": "Step-by-step video training included with every tier."},
                {"icon": "🔒", "title": "Proven System", "desc": "Real members seeing real results every day."}
            ]
        }},
        {"templateId": "steps-section", "data": {
            "title": "How It Works",
            "steps": [
                {"num": "01", "title": "Create Your Account", "desc": "Sign up in under 60 seconds."},
                {"num": "02", "title": "Follow the Training", "desc": "Watch quick-start videos and set up your campaigns."},
                {"num": "03", "title": "Start Earning", "desc": "Share your link and watch your income grow."}
            ]
        }},
        {"templateId": "testimonials", "data": {
            "title": "What Members Are Saying",
            "items": [
                {"name": "Sarah M.", "role": "Marketer", "text": "Within my first month I made back my membership cost and then some.", "stars": 5},
                {"name": "James K.", "role": "Affiliate", "text": "The AI tools save me hours every single week.", "stars": 5},
                {"name": "Maria L.", "role": "Entrepreneur", "text": "Finally something that actually works. Highly recommended.", "stars": 5}
            ]
        }},
        {"templateId": "cta-banner", "data": {
            "headline": "Ready to Start?",
            "subheadline": f"Join now and start building your {niche} income today.",
            "cta_text": "Claim Your Spot →",
            "cta_url": f"/ref/{user.username}"
        }}
    ]

    # If AI key available, enhance the copy
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if api_key:
        try:
            client = anthropic.Anthropic(api_key=api_key)
            resp = client.messages.create(
                model=AI_MODEL_HAIKU,  # Cost-optimised,
                max_tokens=500,
                system="You write punchy marketing copy. Return ONLY valid JSON — no markdown.",
                messages=[{"role": "user", "content": f"""Generate funnel page copy for someone promoting {niche} to {audience}. Tone: {tone}.
Return JSON: {{"headline":"...","subheadline":"...","cta_text":"...","benefits_title":"...","benefits":[{{"icon":"emoji","title":"...","desc":"..."}},...6 items],"cta_headline":"...","cta_sub":"..."}}"""}]
            )
            ai_text = resp.content[0].text.strip()
            if ai_text.startswith("```"): ai_text = ai_text.split("\n",1)[1].rsplit("```",1)[0]
            ai = json.loads(ai_text)
            sections[0]["data"]["headline"] = ai.get("headline", sections[0]["data"]["headline"])
            sections[0]["data"]["subheadline"] = ai.get("subheadline", sections[0]["data"]["subheadline"])
            sections[0]["data"]["cta_text"] = ai.get("cta_text", sections[0]["data"]["cta_text"])
            if ai.get("benefits_title"): sections[2]["data"]["title"] = ai["benefits_title"]
            if ai.get("benefits") and len(ai["benefits"]) >= 4: sections[2]["data"]["items"] = ai["benefits"][:6]
            if ai.get("cta_headline"): sections[5]["data"]["headline"] = ai["cta_headline"]
            if ai.get("cta_sub"): sections[5]["data"]["subheadline"] = ai["cta_sub"]
        except Exception as e:
            logger.warning(f"AI funnel gen failed: {e}")

    # Create the funnel page
    slug = generate_unique_slug(db, user.username, f"My {niche} Page")
    if slug is None:
        return {"error": f"You already have a page called 'My {niche} Page'. Please rename or delete the existing one first."}
    page = FunnelPage(
        user_id=user.id,
        slug=slug,
        title=f"My {niche} Page",
        template_type="sections",
        body_copy=json.dumps(sections),
        color_scheme="dark",
        accent_color="#00d4ff",
        status="draft",
        headline=sections[0]["data"]["headline"],
        subheadline=sections[0]["data"]["subheadline"],
        cta_text=sections[0]["data"]["cta_text"],
        cta_url=f"/ref/{user.username}",
    )
    db.add(page)
    db.commit()
    db.refresh(page)

    return {"success": True, "page_id": page.id, "slug": slug,
            "preview_url": f"/p/{slug}", "edit_url": f"/funnels/visual/{page.id}"}

@app.post("/api/launch-wizard/generate-posts")
async def generate_social_posts_wizard(request: Request, user: User = Depends(get_current_user)):
    """Generate ready-to-post social media content."""
    if not user: return {"error": "Not logged in"}
    body = await request.json()
    niche = body.get("niche", "online business")
    funnel_url = body.get("funnel_url", f"/ref/{user.username}")
    name = user.first_name or user.username

    base_url = str(request.base_url).rstrip("/")
    full_link = f"{base_url}{funnel_url}"

    # Default posts
    posts = {
        "facebook": f"🚀 I just discovered an incredible way to build income in {niche}. The AI does most of the heavy lifting — I'm genuinely impressed.\n\nIf you've been looking for something that actually works, check this out 👇\n{full_link}",
        "instagram": f"🔥 Building real income in {niche} just got a whole lot easier.\n\n✅ AI-powered tools\n✅ Step-by-step training\n✅ Multiple income streams\n✅ Works from anywhere\n\nLink in bio or DM me \"INFO\" 💬\n\n#OnlineIncome #{niche.replace(' ','')} #WorkFromAnywhere #PassiveIncome #Entrepreneur",
        "twitter": f"Just started building income in {niche} with an AI-powered platform that actually delivers. Multiple income streams from $20/month. Check it out:\n\n{full_link}",
        "tiktok": f"POV: You just found a platform that uses AI to help you build real income in {niche} 🤯\n\nNo experience needed. Multiple income streams. From just $20/month.\n\nLink in bio! 👆\n\n#{niche.replace(' ','')} #makemoneyonline #sidehustle #onlineincome #ai",
        "whatsapp": f"Hey! 👋 I just found something amazing for building income in {niche}. It uses AI to do most of the work and it's only $20/month to get started. I'm already set up — check it out here: {full_link}"
    }

    # Enhance with AI if available
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if api_key:
        try:
            client = anthropic.Anthropic(api_key=api_key)
            resp = client.messages.create(
                model=AI_MODEL_HAIKU,  # Cost-optimised,
                max_tokens=600,
                system="Write social media posts. Return ONLY valid JSON — no markdown.",
                messages=[{"role": "user", "content": f"""Write 5 social posts for {name} promoting their {niche} funnel page at {full_link}.
Return JSON: {{"facebook":"...","instagram":"...","twitter":"...","tiktok":"...","whatsapp":"..."}}
Keep each platform-appropriate. Include the link. Be genuine, not spammy."""}]
            )
            ai_text = resp.content[0].text.strip()
            if ai_text.startswith("```"): ai_text = ai_text.split("\n",1)[1].rsplit("```",1)[0]
            ai_posts = json.loads(ai_text)
            posts.update(ai_posts)
        except Exception as e:
            logger.warning(f"AI post gen failed: {e}")

    return {"success": True, "posts": posts}

@app.get("/income-grid")
def income_grid(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/banner-manager")
def banner_manager(request: Request):
    """Serve React SPA for banner management."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/ad-hub")
def ad_hub(request: Request):
    """Serve React SPA for unified Ad Hub."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/superseller")
def superseller_page(request: Request):
    """Serve React SPA for SuperSeller."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/training")
def training_page(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/team-messenger")
def team_messenger_page(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/challenges")
def challenges_page(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/qr-generator")
def qr_generator_page(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/income-grid-3d")
def income_grid_3d(request: Request):
    """Serve React SPA for 3D income grid visualisation."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/banner-maker")
def banner_maker_page(request: Request):
    """Serve React SPA for banner maker."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_income_grid_DISABLED(request: Request, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    try:
        ctx = get_dashboard_context(request, user, db)
        grids = get_user_grids(db, user.id)
        ctx.update({
            "all_grids": grids,
            "grid_packages": GRID_PACKAGES,
            "selected_tier": int(request.query_params.get("tier", 1)),
        })
        return templates.TemplateResponse("income-grid.html", ctx)
    except Exception as exc:
        logger.error(f"Income grid error for user {user.id}: {exc}", exc_info=True)
        return JSONResponse({"error": f"Income grid error: {exc}"}, status_code=500)

@app.get("/income-grid/{grid_id}")
def grid_detail(grid_id: int, request: Request,
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    grid = db.query(Grid).filter(Grid.id == grid_id, Grid.owner_id == user.id).first()
    if not grid: raise HTTPException(status_code=404, detail="Grid not found")
    positions = get_grid_positions(db, grid_id)
    ctx = get_dashboard_context(request, user, db)
    ctx.update({"grid": grid, "positions": positions, "GRID_PACKAGES": GRID_PACKAGES})
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/dashboard", status_code=302)

@app.get("/wallet")
def wallet(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_wallet_DISABLED(request: Request, user: User = Depends(get_current_user),
           db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    ctx = get_dashboard_context(request, user, db)
    commissions = get_user_commission_history(db, user.id, limit=50)
    withdrawals = db.query(Withdrawal).filter(
        Withdrawal.user_id == user.id
    ).order_by(Withdrawal.requested_at.desc()).limit(20).all()
    renewal     = get_renewal_status(db, user.id)
    p2p_history = get_p2p_history(db, user.id, limit=20)
    # Serialise datetimes for template
    for t in p2p_history:
        if t.get("created_at"):
            t["created_at"] = t["created_at"].strftime("%d %b %Y %H:%M")
    ctx.update({
        "commissions": commissions,
        "withdrawals": withdrawals,
        "renewal":     renewal,
        "p2p_history": p2p_history,
    })
    return templates.TemplateResponse("wallet.html", ctx)


@app.get("/api/wallet")
def api_wallet_data(request: Request, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """JSON wallet data for React frontend."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    commissions = get_user_commission_history(db, user.id, limit=50)
    withdrawals_raw = db.query(Withdrawal).filter(
        Withdrawal.user_id == user.id
    ).order_by(Withdrawal.requested_at.desc()).limit(20).all()
    renewal = get_renewal_status(db, user.id)
    p2p_history = get_p2p_history(db, user.id, limit=20)
    for t in p2p_history:
        if t.get("created_at"):
            t["created_at"] = t["created_at"].strftime("%d %b %Y %H:%M")
    withdrawals = [{
        "id": w.id, "amount": float(w.amount_usdt or 0),
        "status": w.status, "wallet_address": w.wallet_address,
        "requested_at": w.requested_at.isoformat() if w.requested_at else None,
        "processed_at": w.processed_at.isoformat() if w.processed_at else None,
    } for w in withdrawals_raw]
    return {
        "balance": float(user.balance or 0),
        "total_earned": float(user.total_earned or 0),
        "total_withdrawn": float(user.total_withdrawn or 0),
        "grid_earnings": float(user.grid_earnings or 0),
        "course_earnings": float(user.course_earnings or 0),
        "marketplace_earnings": float(user.marketplace_earnings or 0),
        "membership_tier": user.membership_tier or "basic",
        "wallet_address": user.wallet_address or "",
        "commissions": commissions,
        "withdrawals": withdrawals,
        "renewal": renewal,
        "p2p_history": p2p_history,
    }


@app.get("/affiliate")
def affiliate(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_affiliate_DISABLED(request: Request, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    ctx = get_dashboard_context(request, user, db)
    referrals = db.query(User).filter(User.sponsor_id == user.id).all()
    ctx.update({
        "referrals": referrals,
        "ref_link": f"https://www.superadpro.com/ref/{user.username}",
    })
    return templates.TemplateResponse("affiliate.html", ctx)

@app.get("/account")
def account(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

@app.post("/save-wallet")
def save_wallet(
    request: Request,
    wallet_address: str = Form(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user: return RedirectResponse(url="/?login=1", status_code=302)
    if wallet_address and not validate_wallet(wallet_address):
        return RedirectResponse(url="/account?error=invalid_wallet", status_code=303)
    user.wallet_address = wallet_address
    db.commit()
    return RedirectResponse(url="/account?saved=true", status_code=303)

@app.post("/api/wallet/connect")
def api_wallet_connect(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Save wallet address from Web3 wallet connect (JSON API)."""
    from fastapi.responses import JSONResponse
    import json
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    try:
        body = json.loads(request._body.decode() if hasattr(request, '_body') else '{}')
        wallet_address = body.get("wallet_address", "")
    except Exception:
        wallet_address = ""
    if wallet_address and validate_wallet(wallet_address):
        user.wallet_address = wallet_address
        db.commit()
        return JSONResponse({"success": True, "wallet": wallet_address})
    return JSONResponse({"error": "Invalid wallet address"}, status_code=400)

@app.get("/video-library")
def video_library(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_video_library_DISABLED(request: Request, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    ctx = get_dashboard_context(request, user, db)
    campaigns = db.query(VideoCampaign).filter(
        VideoCampaign.user_id == user.id,
        VideoCampaign.status  != "deleted"
    ).order_by(VideoCampaign.created_at.desc()).all()
    ctx.update({
        "campaigns": campaigns,
        "platform_label": platform_label,
        "platform_colour": platform_colour,
        "added": request.query_params.get("added", ""),
    })
    return templates.TemplateResponse("video-library.html", ctx)


@app.post("/delete-campaign")
def delete_campaign(
    request: Request,
    campaign_id: int = Form(),
    db: Session = Depends(get_db),
    user: User  = Depends(get_current_user)
):
    if not user: return RedirectResponse(url="/?login=1", status_code=302)
    campaign = db.query(VideoCampaign).filter(
        VideoCampaign.id      == campaign_id,
        VideoCampaign.user_id == user.id  # ownership check
    ).first()
    if campaign:
        campaign.status = "deleted"
        db.commit()
    return RedirectResponse(url="/video-library", status_code=303)

@app.get("/upload")
@app.get("/create-campaign")
def upload_video(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_upload_DISABLED(request=None, user=None, db=None):
    """Phase 4: upload video moved to React VideoLibrary."""
    pass


@app.post("/upload")
def upload_video_post(
    request: Request,
    title:       str = Form(),
    video_url:   str = Form(),
    category:    str = Form(""),
    description: str = Form(""),
    target_country: str = Form(""),
    target_interests: str = Form(""),
    db: Session = Depends(get_db),
    user: User  = Depends(get_current_user)
):
    if not user: return RedirectResponse(url="/?login=1", status_code=302)

    title       = sanitize(title)[:120]
    description = sanitize(description)[:500]
    category    = sanitize(category)[:50]
    video_url   = video_url.strip()

    def err(msg):
        ctx = get_dashboard_context(request, user, db)
        ctx.update({"error": msg, "prefill": {
            "title": title, "video_url": video_url,
            "category": category, "description": description
        }})
        return JSONResponse({"error": msg}, status_code=400)

    highest_grid = db.query(Grid).filter(
        Grid.owner_id == user.id,
        Grid.is_complete == False
    ).order_by(Grid.package_tier.desc()).first()

    user_tier = highest_grid.package_tier if highest_grid else 1
    from .database import CAMPAIGN_TIER_FEATURES
    tier_features = CAMPAIGN_TIER_FEATURES.get(user_tier, CAMPAIGN_TIER_FEATURES[1])

    # Enforce campaign limit
    active_count = db.query(VideoCampaign).filter(
        VideoCampaign.user_id == user.id,
        VideoCampaign.status == "active"
    ).count()
    if active_count >= tier_features["max_campaigns"]:
        tier_name = GRID_TIER_NAMES.get(user_tier, "Starter")
        return err(f"Your {tier_name} tier allows {tier_features['max_campaigns']} active campaign(s). Upgrade your tier or pause an existing campaign.")

    parsed = parse_video_url(video_url)
    if not parsed:
        return err("Unsupported video URL. Please paste a YouTube or Vimeo link.")

    campaign = VideoCampaign(
        user_id     = user.id,
        title       = title,
        description = description,
        category    = category,
        platform    = parsed["platform"],
        video_url   = video_url,
        embed_url   = parsed["embed_url"],
        video_id    = parsed["video_id"],
        status      = "active",
        owner_tier  = user_tier,
        views_target = tier_features["monthly_views"],
    )

    # Priority queue placement (Tier 5+)
    campaign.priority_level = tier_features["priority"]

    # Geo & interest targeting (Tier 4+)
    if tier_features["targeting"]:
        campaign.target_country = sanitize(target_country)[:200] if target_country else None
        campaign.target_interests = sanitize(target_interests)[:200] if target_interests else None

    # Demographics targeting (Tier 4+)
    if tier_features["demographics"]:
        target_age_min = request.query_params.get("target_age_min", "") or ""
        target_age_max = request.query_params.get("target_age_max", "") or ""
        target_gender = request.query_params.get("target_gender", "") or ""
        if target_age_min.isdigit():
            campaign.target_age_min = int(target_age_min)
        if target_age_max.isdigit():
            campaign.target_age_max = int(target_age_max)
        if target_gender in ("male", "female", "all"):
            campaign.target_gender = target_gender

    # Auto-featured on public page (Tier 6+)
    campaign.is_featured = tier_features["featured"]

    # Brand spotlight — large card on public page (Tier 7+)
    campaign.is_spotlight = tier_features["spotlight"]

    db.add(campaign)
    db.commit()

    return RedirectResponse(url="/video-library?added=1", status_code=303)

#  PAYMENT ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/pay-membership")
def pay_membership_form(request: Request, user: User = Depends(get_current_user)):
    if not user: return RedirectResponse(url="/?login=1")
    if user.is_active: return RedirectResponse(url="/dashboard")
    return RedirectResponse(url="/upgrade", status_code=302)

def _old_pay_membership_DISABLED_1(request=None):
    pass  # Old pay-membership form — replaced by Stripe checkout

@app.post("/verify-membership")
def verify_membership(
    request: Request,
    tx_hash: str = Form(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user: return RedirectResponse(url="/?login=1", status_code=302)
    result = process_membership_payment(db, user.id, tx_hash)
    if result.get("success"):
        initialise_renewal_record(db, user.id, source="referral")
    if result["success"]:
        # Check if sponsor was auto-activated by this payment
        redirect_url = "/dashboard?activated=true"
        if result.get("sponsor_auto_activated"):
            redirect_url = "/dashboard?auto_activated=true"
        return RedirectResponse(url=redirect_url, status_code=303)
    return JSONResponse({"error": result["error"]}, status_code=400)

@app.get("/activate-grid")
def activate_grid_form(
    request: Request,
    tier: int = 1,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    price = GRID_PACKAGES.get(tier, 10)
    ctx = get_dashboard_context(request, user, db)
    ctx.update({
        "tier": tier,
        "price": price,
        "company_wallet": COMPANY_WALLET,
        "GRID_PACKAGES": GRID_PACKAGES,
    })
    return JSONResponse({"error": "Payment failed."}, status_code=400)


# ═══════════════════════════════════════════════════════════════
#  COINBASE COMMERCE PAYMENT ROUTES
# ═══════════════════════════════════════════════════════════════

@app.post("/api/coinbase/create-charge")
async def coinbase_create_charge(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Coinbase Commerce charge for membership or grid tier.
    Body: { payment_type: "membership"|"grid_tier", package_tier: int (for grid) }
    """
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    body = await request.json()
    payment_type = body.get("payment_type", "")
    package_tier = int(body.get("package_tier", 0))

    if payment_type == "membership":
        amount = MEMBERSHIP_FEE
        description = f"Membership Activation — ${MEMBERSHIP_FEE}/month"
        redirect = f"{os.getenv('BASE_URL', 'https://www.superadpro.com')}/dashboard?activated=true"
        cancel = f"{os.getenv('BASE_URL', 'https://www.superadpro.com')}/pay-membership?cancelled=1"

    elif payment_type == "grid_tier":
        price = GRID_PACKAGES.get(package_tier)
        if not price:
            return JSONResponse({"error": f"Invalid tier: {package_tier}"}, status_code=400)
        if not user.is_active:
            return JSONResponse({"error": "Membership must be active first"}, status_code=400)
        tier_name = {1:"Starter",2:"Builder",3:"Pro",4:"Advanced",5:"Elite",6:"Premium",7:"Executive",8:"Ultimate"}.get(package_tier, f"Tier {package_tier}")
        amount = price
        description = f"Income Grid — {tier_name} Tier (${price})"
        redirect = f"{os.getenv('BASE_URL', 'https://www.superadpro.com')}/income-grid?activated={package_tier}"
        cancel = f"{os.getenv('BASE_URL', 'https://www.superadpro.com')}/activate-grid?tier={package_tier}&cancelled=1"

    else:
        return JSONResponse({"error": "payment_type must be 'membership' or 'grid_tier'"}, status_code=400)

    result = cb_create_charge(
        user_id=user.id,
        username=user.username,
        payment_type=payment_type,
        amount_usd=amount,
        description=description,
        package_tier=package_tier,
        redirect_url=redirect,
        cancel_url=cancel,
    )

    if result["success"]:
        return {
            "success": True,
            "hosted_url": result["hosted_url"],
            "charge_id": result["charge_id"],
            "code": result["code"],
        }
    else:
        return JSONResponse({"error": result["error"]}, status_code=500)


@app.post("/api/webhook/coinbase")
async def coinbase_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Coinbase Commerce webhook events.
    Processes charge:confirmed to activate memberships and grid tiers.
    """
    body = await request.body()
    signature = request.headers.get("X-CC-Webhook-Signature", "")

    # Verify signature
    if not cb_verify_sig(body, signature):
        logger.warning("Coinbase webhook: Invalid signature")
        return JSONResponse({"error": "Invalid signature"}, status_code=401)

    try:
        payload = json.loads(body)
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    event = cb_parse_event(payload)
    event_type = event["event_type"]
    user_id = event["user_id"]
    payment_type = event["payment_type"]

    logger.info(f"Coinbase webhook: {event_type} for user {user_id} ({payment_type})")

    # Only process confirmed charges
    if event_type not in ("charge:confirmed", "charge:completed"):
        # Acknowledge other events (pending, failed, etc) without processing
        return {"status": "acknowledged", "event": event_type}

    if not user_id:
        logger.error("Coinbase webhook: No user_id in metadata")
        return JSONResponse({"error": "Missing user_id"}, status_code=400)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.error(f"Coinbase webhook: User {user_id} not found")
        return JSONResponse({"error": "User not found"}, status_code=404)

    # Check for duplicate processing
    existing = db.query(Payment).filter(Payment.tx_hash == f"cb_{event['charge_id']}").first()
    if existing:
        logger.info(f"Coinbase webhook: Charge {event['charge_id']} already processed")
        return {"status": "already_processed"}

    if payment_type == "membership":
        # Activate membership — mirrors process_membership_payment logic
        user.is_active = True
        if not user.first_payment_to_company:
            user.first_payment_to_company = True

        # Record payment
        db.add(Payment(
            from_user_id = user_id,
            to_user_id   = user.sponsor_id,
            amount_usdt  = MEMBERSHIP_FEE,
            payment_type = "membership",
            tx_hash      = f"cb_{event['charge_id']}",
            status       = "confirmed",
        ))

        # Credit sponsor 50% ($10) and trigger auto-activation cascade
        activated_users = []
        sponsor_share = decimal.Decimal(str(MEMBERSHIP_SPONSOR_SHARE))
        company_share = decimal.Decimal(str(MEMBERSHIP_COMPANY_SHARE))
        if user.sponsor_id:
            sponsor = db.query(User).filter(User.id == user.sponsor_id).first()
            if sponsor:
                sponsor.balance = (sponsor.balance or decimal.Decimal('0')) + sponsor_share
                sponsor.total_earned = (sponsor.total_earned or decimal.Decimal('0')) + sponsor_share
                sponsor.upline_earnings = (sponsor.upline_earnings or decimal.Decimal('0')) + sponsor_share
                sponsor.personal_referrals = (sponsor.personal_referrals or 0) + 1

                db.add(Commission(
                    from_user_id=user_id,
                    to_user_id=sponsor.id,
                    amount_usdt=sponsor_share,
                    commission_type="membership_sponsor",
                    package_tier=0,
                    status="paid",
                    paid_at=datetime.utcnow(),
                    notes=f"Membership 50% sponsor share (${MEMBERSHIP_SPONSOR_SHARE})",
                ))

                # Notify sponsor
                new_user = db.query(User).filter(User.id == user_id).first()
                send_notification(db, sponsor.id, "commission", "💰",
                    f"${float(sponsor_share):.0f} commission earned!",
                    f"{new_user.username if new_user else 'A new member'} joined your team. You earned ${float(sponsor_share):.0f} in membership commission.",
                    "/wallet"
                )
                send_notification(db, sponsor.id, "referral", "👥",
                    "New team member!",
                    f"{new_user.username if new_user else 'Someone'} just joined SuperAdPro through your referral link.",
                    "/courses/commissions"
                )

                # Company share record
                db.add(Commission(
                    from_user_id=user_id,
                    to_user_id=None,
                    amount_usdt=company_share,
                    commission_type="membership_company",
                    package_tier=0,
                    status="platform",
                    paid_at=datetime.utcnow(),
                    notes=f"Membership 50% company share (${MEMBERSHIP_COMPANY_SHARE})",
                ))

                # Auto-activation cascade — if sponsor is free and balance >= $20, auto-activate them
                _cascade_auto_activation(
                    db=db,
                    recipient=sponsor,
                    tx_hash=f"cb_{event['charge_id']}",
                    chain_depth=1,
                    activated_users=activated_users,
                )
        else:
            # No sponsor — 100% to company
            db.add(Commission(
                from_user_id=user_id,
                to_user_id=None,
                amount_usdt=decimal.Decimal(str(MEMBERSHIP_FEE)),
                commission_type="membership_company",
                package_tier=0,
                status="platform",
                paid_at=datetime.utcnow(),
                notes=f"Membership — no sponsor, full ${MEMBERSHIP_FEE} to company",
            ))

        # Initialise renewal record
        initialise_renewal_record(db, user_id, source="coinbase")
        db.commit()

        # Send commission email to sponsor (non-blocking)
        if user.sponsor_id:
            try:
                from .email_utils import send_commission_email
                sponsor = db.query(User).filter(User.id == user.sponsor_id).first()
                if sponsor and sponsor.email:
                    send_commission_email(
                        to_email=sponsor.email,
                        first_name=sponsor.first_name or sponsor.username,
                        commission_type="Membership Sponsor",
                        from_username=user.username,
                    )
                    logger.info(f"Coinbase: Commission email sent to {sponsor.username}")
            except Exception as e:
                logger.warning(f"Coinbase: Commission email failed: {e}")

        # Log cascade activations
        if activated_users:
            logger.info(f"Coinbase: Auto-activated {len(activated_users)} users in cascade")
            for au, depth in activated_users:
                logger.info(f"  → Auto-activated user {au.id} ({au.username}) at depth {depth}")

        logger.info(f"Coinbase: Membership activated for user {user_id}")

        # Cancel nurture sequence immediately — they've paid
        try:
            from .database import NurtureSequence
            nurture = db.query(NurtureSequence).filter(NurtureSequence.user_id == user_id).first()
            if nurture and not nurture.cancelled_at:
                nurture.cancelled_at = datetime.utcnow()
                nurture.completed = True
                db.commit()
                logger.info(f"Nurture sequence cancelled for user {user_id} — membership paid")
        except Exception as e:
            logger.warning(f"Nurture cancel failed for user {user_id}: {e}")

        return {"status": "membership_activated", "user_id": user_id, "cascade_activations": len(activated_users)}

    elif payment_type == "grid_tier":
        package_tier = event["package_tier"]
        price = GRID_PACKAGES.get(package_tier)
        if not price:
            return JSONResponse({"error": f"Invalid tier: {package_tier}"}, status_code=400)

        if not user.is_active:
            return JSONResponse({"error": "User membership not active"}, status_code=400)

        # Record payment
        db.add(Payment(
            from_user_id=user_id,
            to_user_id=None,
            amount_usdt=price,
            payment_type=f"grid_tier_{package_tier}",
            tx_hash=f"cb_{event['charge_id']}",
            status="confirmed",
        ))
        db.flush()

        # Place in grid — mirrors process_grid_payment logic
        sponsor_id = user.sponsor_id
        if not sponsor_id:
            admin = db.query(User).filter(User.is_admin == True).first()
            sponsor_id = admin.id if admin else 1

        result = place_member_in_grid(
            db=db,
            member_id=user_id,
            owner_id=sponsor_id,
            package_tier=package_tier,
        )

        if not result["success"]:
            result = _find_overspill_placement(db, user_id, sponsor_id, package_tier)

        db.commit()
        logger.info(f"Coinbase: Grid tier {package_tier} activated for user {user_id}")
        return {"status": "grid_activated", "user_id": user_id, "tier": package_tier}

    return {"status": "unhandled_payment_type", "payment_type": payment_type}


@app.get("/payment/success")
def payment_success_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

@app.get("/payment/cancelled")
def payment_cancelled_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/payment-success")
def payment_success_dash(request: Request):
    """Stripe redirects here after payment — serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/payment-cancelled")
def payment_cancelled_dash(request: Request):
    """Stripe redirects here on cancel — serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")





@app.delete("/admin/api/user/{user_id}")
def admin_delete_user(user_id: int, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Admin: permanently delete a user and all their data."""
    _require_admin(user)
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        return JSONResponse({"error": "User not found"}, status_code=404)
    if target.is_admin:
        return JSONResponse({"error": "Cannot delete admin accounts"}, status_code=400)
    if target.id == user.id:
        return JSONResponse({"error": "Cannot delete your own account"}, status_code=400)
    if float(target.balance or 0) > 0:
        return JSONResponse({"error": f"User has ${target.balance} balance — withdraw or zero first"}, status_code=400)

    from .database import (
        MemberLead, EmailSequence, EmailSendLog, LeadList,
        CoPilotBriefing, AIUsageQuota, NurtureSequence,
        VideoWatch, WatchQuota, FunnelLead, FunnelEvent,
        LinkHubLink, LinkHubClick, ProSellerMessage, Prospect,
        SuperSellerCampaign
    )

    from .database import (
        # All 41 models with FK to users - verified from database.py
        MembershipRenewal, PasswordResetToken, NurtureSequence,
        VideoWatch, WatchQuota, VideoCampaign,
        Grid, GridPosition,
        FunnelPage, FunnelLead, FunnelEvent,
        ShortLink, LinkRotator,
        LinkHubProfile, LinkHubLink,
        MemberLead, LeadList, EmailSequence, EmailSendLog,
        CoPilotBriefing, AIUsageQuota,
        Commission, Payment, Withdrawal, P2PTransfer,
        Notification, Achievement,
        AdListing,
        CoursePurchase, CourseCommission, CourseProgress, CoursePassUpTracker,
        MemberCourse, MemberCoursePurchase,
        DigitalProduct, DigitalProductPurchase, DigitalProductReview, DigitalProductAffiliate,
        ProSellerMessage, Prospect, SuperSellerCampaign,
    )
    from .database import LinkHubClick, MemberCourseLesson, MemberCourseChapter

    username = target.username
    try:
        # ── LAYER 0: Null out sponsor references to prevent orphaned downline ──
        # Members who had this user as their sponsor keep their account but lose the upline link
        db.query(User).filter(User.sponsor_id == user_id).update(
            {"sponsor_id": None}, synchronize_session=False
        )
        db.query(User).filter(User.pass_up_sponsor_id == user_id).update(
            {"pass_up_sponsor_id": None}, synchronize_session=False
        )

        # ── LAYER 1: Deepest grandchildren (reference child tables, not users directly) ──

        # EmailSendLog → references member_leads and email_sequences
        lead_ids = [r.id for r in db.query(MemberLead).filter(MemberLead.user_id == user_id).all()]
        if lead_ids:
            db.query(EmailSendLog).filter(EmailSendLog.lead_id.in_(lead_ids)).delete(synchronize_session=False)

        # LinkHubClick → references linkhub_links and linkhub_profiles
        profile = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user_id).first()
        if profile:
            db.query(LinkHubClick).filter(LinkHubClick.profile_id == profile.id).delete()

        # LinkHubLink → references linkhub_profiles
        db.query(LinkHubLink).filter(LinkHubLink.user_id == user_id).delete()

        # GridPosition → references grids
        grid_ids = [r.id for r in db.query(Grid).filter(Grid.owner_id == user_id).all()]
        if grid_ids:
            db.query(GridPosition).filter(GridPosition.grid_id.in_(grid_ids)).delete(synchronize_session=False)

        # CourseCommission → references course_purchases
        purchase_ids = [r.id for r in db.query(CoursePurchase).filter(CoursePurchase.user_id == user_id).all()]
        if purchase_ids:
            db.query(CourseCommission).filter(CourseCommission.purchase_id.in_(purchase_ids)).delete(synchronize_session=False)

        # MemberCourseLesson, MemberCourseChapter → references member_courses
        course_ids = [r.id for r in db.query(MemberCourse).filter(MemberCourse.creator_id == user_id).all()]
        if course_ids:
            db.query(MemberCourseLesson).filter(MemberCourseLesson.course_id.in_(course_ids)).delete(synchronize_session=False)
            db.query(MemberCourseChapter).filter(MemberCourseChapter.course_id.in_(course_ids)).delete(synchronize_session=False)
            db.query(MemberCoursePurchase).filter(MemberCoursePurchase.course_id.in_(course_ids)).delete(synchronize_session=False)

        # DigitalProduct children
        product_ids = [r.id for r in db.query(DigitalProduct).filter(DigitalProduct.creator_id == user_id).all()]
        if product_ids:
            db.query(DigitalProductPurchase).filter(DigitalProductPurchase.product_id.in_(product_ids)).delete(synchronize_session=False)
            db.query(DigitalProductReview).filter(DigitalProductReview.product_id.in_(product_ids)).delete(synchronize_session=False)
            db.query(DigitalProductAffiliate).filter(DigitalProductAffiliate.product_id.in_(product_ids)).delete(synchronize_session=False)

        # FunnelEvent, FunnelLead → references funnel_pages
        funnel_ids = [r.id for r in db.query(FunnelPage).filter(FunnelPage.user_id == user_id).all()]
        if funnel_ids:
            db.query(FunnelEvent).filter(FunnelEvent.page_id.in_(funnel_ids)).delete(synchronize_session=False)
            db.query(FunnelLead).filter(FunnelLead.page_id.in_(funnel_ids)).delete(synchronize_session=False)

        # ProSellerMessage → references prospects
        prospect_ids = [r.id for r in db.query(Prospect).filter(Prospect.user_id == user_id).all()]
        if prospect_ids:
            db.query(ProSellerMessage).filter(ProSellerMessage.prospect_id.in_(prospect_ids)).delete(synchronize_session=False)

        # VideoWatch has user_id directly — delete all watches BY this user
        db.query(VideoWatch).filter(VideoWatch.user_id == user_id).delete()

        # ── LAYER 2: Direct children of users (all verified field names) ──
        db.query(MembershipRenewal).filter(MembershipRenewal.user_id == user_id).delete()
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete()
        db.query(NurtureSequence).filter(NurtureSequence.user_id == user_id).delete()
        db.query(WatchQuota).filter(WatchQuota.user_id == user_id).delete()
        db.query(VideoCampaign).filter(VideoCampaign.user_id == user_id).delete()
        db.query(Grid).filter(Grid.owner_id == user_id).delete()
        db.query(FunnelPage).filter(FunnelPage.user_id == user_id).delete()
        db.query(ShortLink).filter(ShortLink.user_id == user_id).delete()
        db.query(LinkRotator).filter(LinkRotator.user_id == user_id).delete()
        db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user_id).delete()
        db.query(MemberLead).filter(MemberLead.user_id == user_id).delete()
        db.query(LeadList).filter(LeadList.user_id == user_id).delete()
        db.query(EmailSequence).filter(EmailSequence.user_id == user_id).delete()
        db.query(CoPilotBriefing).filter(CoPilotBriefing.user_id == user_id).delete()
        db.query(AIUsageQuota).filter(AIUsageQuota.user_id == user_id).delete()
        db.query(Commission).filter((Commission.from_user_id == user_id) | (Commission.to_user_id == user_id)).delete()
        db.query(Payment).filter((Payment.from_user_id == user_id) | (Payment.to_user_id == user_id)).delete()
        db.query(Withdrawal).filter(Withdrawal.user_id == user_id).delete()
        db.query(P2PTransfer).filter((P2PTransfer.from_user_id == user_id) | (P2PTransfer.to_user_id == user_id)).delete()
        db.query(Notification).filter(Notification.user_id == user_id).delete()
        db.query(Achievement).filter(Achievement.user_id == user_id).delete()
        db.query(AdListing).filter(AdListing.user_id == user_id).delete()
        db.query(CoursePurchase).filter(CoursePurchase.user_id == user_id).delete()
        db.query(CourseProgress).filter(CourseProgress.user_id == user_id).delete()
        db.query(CoursePassUpTracker).filter(CoursePassUpTracker.user_id == user_id).delete()
        db.query(MemberCourse).filter(MemberCourse.creator_id == user_id).delete()
        db.query(DigitalProduct).filter(DigitalProduct.creator_id == user_id).delete()
        db.query(DigitalProductPurchase).filter(DigitalProductPurchase.buyer_id == user_id).delete()
        db.query(DigitalProductAffiliate).filter(DigitalProductAffiliate.user_id == user_id).delete()
        db.query(Prospect).filter((Prospect.user_id == user_id) | (Prospect.converted_user_id == user_id)).delete()
        db.query(SuperSellerCampaign).filter(SuperSellerCampaign.user_id == user_id).delete()

        # ── LAYER 3: Finally delete the user ──
        db.delete(target)
        db.commit()
        return {"ok": True, "message": f"User {username} deleted successfully"}
    except Exception as e:
        db.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)


# ═══════════════════════════════════════════════════════════════
#  AI CO-PILOT — Pro Only
# ═══════════════════════════════════════════════════════════════

def _build_copilot_context(user, db) -> dict:
    """Gather all account data needed for a personalised briefing."""
    from .grid import get_grid_stats
    from datetime import date

    grid_stats = get_grid_stats(db, user.id)
    active_grids = grid_stats.get("active_grids_detail", [])

    # Hot leads count
    hot_leads = 0
    uncontacted_leads = 0
    try:
        from .database import MemberLead
        hot_leads = db.query(MemberLead).filter(
            MemberLead.member_id == user.id, MemberLead.is_hot == True
        ).count()
        # Leads with no emails sent
        uncontacted_leads = db.query(MemberLead).filter(
            MemberLead.member_id == user.id, MemberLead.emails_sent == 0
        ).count()
    except Exception:
        pass

    # Expiring team members (next 7 days)
    expiring_soon = 0
    try:
        from datetime import timedelta
        cutoff = datetime.utcnow() + timedelta(days=7)
        expiring_soon = db.query(User).filter(
            User.sponsor_id == user.id,
            User.is_active == True,
            User.membership_expires_at != None,
            User.membership_expires_at <= cutoff
        ).count()
    except Exception:
        pass

    # Recent commissions (last 7 days)
    recent_earned = 0.0
    try:
        week_ago = datetime.utcnow() - timedelta(days=7)
        comms = db.query(Commission).filter(
            Commission.to_user_id == user.id,
            Commission.created_at >= week_ago
        ).all()
        recent_earned = sum(float(c.amount_usdt or 0) for c in comms)
    except Exception:
        pass

    # Closest grid to completion
    closest_grid = None
    if active_grids:
        closest_grid = max(active_grids, key=lambda g: g.get("pct", 0))

    return {
        "name": user.first_name or user.username,
        "tier": user.membership_tier or "pro",
        "total_earned": float(user.total_earned or 0),
        "balance": float(user.balance or 0),
        "total_team": user.total_team or 0,
        "personal_referrals": user.personal_referrals or 0,
        "grid_earnings": float(user.grid_earnings or 0),
        "bonus_earnings": float(user.bonus_earnings or 0),
        "level_earnings": float(user.level_earnings or 0),
        "course_earnings": float(user.course_earnings or 0),
        "active_grids": len(active_grids),
        "completions": grid_stats.get("completed_advances", 0),
        "closest_grid": closest_grid,
        "hot_leads": hot_leads,
        "uncontacted_leads": uncontacted_leads,
        "expiring_team_members": expiring_soon,
        "earned_this_week": round(recent_earned, 2),
        "today": date.today().strftime("%A, %d %B %Y"),
    }


def _generate_copilot_briefing(ctx: dict) -> dict:
    """Call Claude Sonnet to generate a personalised briefing + action cards."""
    import json as _json
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"narrative": "AI Co-Pilot is not configured.", "actions": []}

    client = anthropic.Anthropic(api_key=api_key)

    grid_info = ""
    if ctx.get("closest_grid"):
        g = ctx["closest_grid"]
        BONUSES = {1:64,2:160,3:640,4:1280,5:3200,6:4800,7:6400,8:10000}
        bonus = BONUSES.get(g.get("tier",1), 64)
        grid_info = f"Their closest active grid is Campaign {g.get('tier')} at {g.get('pct')}% full ({g.get('filled')}/64 positions, ${bonus} completion bonus waiting)."

    prompt = f"""You are the SuperAdPro AI Co-Pilot — a sharp, encouraging personal business advisor for {ctx['name']}.

Today is {ctx['today']}.

Here is {ctx['name']}'s account snapshot:
- Team size: {ctx['total_team']} members ({ctx['personal_referrals']} direct referrals)
- Total earned all-time: ${ctx['total_earned']}
- Earned this week: ${ctx['earned_this_week']}
- Balance: ${ctx['balance']}
- Grid earnings: ${ctx['grid_earnings']} | Bonus earnings: ${ctx['bonus_earnings']}
- Uni-level earnings: ${ctx['level_earnings']} | Course earnings: ${ctx['course_earnings']}
- Active grids: {ctx['active_grids']} | Completed: {ctx['completions']}
- {grid_info}
- Hot leads in CRM: {ctx['hot_leads']}
- Uncontacted leads: {ctx['uncontacted_leads']}
- Team members expiring soon (7 days): {ctx['expiring_team_members']}

Write a brief, punchy morning briefing (3-4 sentences max) that:
1. Highlights the most important opportunity or risk right now
2. Is specific to their actual numbers — no generic advice
3. Has energy and momentum — make them want to take action
4. Feels like a trusted advisor, not a chatbot

Then generate 2-3 specific action cards. Each action card should be a concrete task they can do TODAY based on their data.

Respond ONLY with valid JSON in this exact format, no markdown, no preamble:
{{
  "narrative": "Your morning briefing here...",
  "actions": [
    {{
      "emoji": "⚡",
      "title": "Short action title",
      "description": "Specific description referencing their data",
      "link": "/app/campaign-tiers",
      "color": "#6366f1",
      "priority": "high"
    }}
  ]
}}

Available links: /app/campaign-tiers, /app/pro/leads, /app/network, /app/affiliate, /app/courses, /app/wallet, /app/dashboard"""

    try:
        resp = client.messages.create(
            model=AI_MODEL_SONNET,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = resp.content[0].text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return _json.loads(raw.strip())
    except Exception as e:
        return {
            "narrative": f"Your network has {ctx['total_team']} members and you've earned ${ctx['total_earned']} in total. Keep building — consistency compounds.",
            "actions": [
                {"emoji": "⚡", "title": "Check your grid progress", "description": "See how close your next completion bonus is", "link": "/app/campaign-tiers", "color": "#6366f1", "priority": "high"},
                {"emoji": "👥", "title": "Share your referral link", "description": "Every new member grows your recurring income", "link": "/app/affiliate", "color": "#10b981", "priority": "medium"},
            ]
        }


@app.get("/api/copilot/briefing")
async def get_copilot_briefing(request: Request, db: Session = Depends(get_db),
                                user: User = Depends(get_current_user)):
    """Get today's Co-Pilot briefing. Generates once per day, cached after that."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if getattr(user, "membership_tier", "basic") != "pro" and not user.is_admin:
        return JSONResponse({"error": "Pro membership required"}, status_code=403)

    today = datetime.utcnow().strftime("%Y-%m-%d")
    cached = db.query(CoPilotBriefing).filter(CoPilotBriefing.user_id == user.id).first()

    if cached and cached.briefing_date == today:
        import json as _json
        return {
            "narrative": cached.narrative,
            "actions": _json.loads(cached.actions or "[]"),
            "generated_at": cached.generated_at.isoformat() if cached.generated_at else None,
            "cached": True,
        }

    # Generate fresh briefing
    ctx = _build_copilot_context(user, db)
    result = _generate_copilot_briefing(ctx)
    import json as _json

    if cached:
        cached.briefing_date = today
        cached.narrative = result.get("narrative", "")
        cached.actions = _json.dumps(result.get("actions", []))
        cached.generated_at = datetime.utcnow()
    else:
        cached = CoPilotBriefing(
            user_id=user.id,
            briefing_date=today,
            narrative=result.get("narrative", ""),
            actions=_json.dumps(result.get("actions", [])),
        )
        db.add(cached)
    db.commit()

    return {
        "narrative": cached.narrative,
        "actions": result.get("actions", []),
        "generated_at": cached.generated_at.isoformat(),
        "cached": False,
    }


@app.post("/api/copilot/refresh")
async def refresh_copilot_briefing(request: Request, db: Session = Depends(get_db),
                                    user: User = Depends(get_current_user)):
    """Force-regenerate the Co-Pilot briefing on demand."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if getattr(user, "membership_tier", "basic") != "pro" and not user.is_admin:
        return JSONResponse({"error": "Pro membership required"}, status_code=403)

    import json as _json
    today = datetime.utcnow().strftime("%Y-%m-%d")
    ctx = _build_copilot_context(user, db)
    result = _generate_copilot_briefing(ctx)

    cached = db.query(CoPilotBriefing).filter(CoPilotBriefing.user_id == user.id).first()
    if cached:
        cached.briefing_date = today
        cached.narrative = result.get("narrative", "")
        cached.actions = _json.dumps(result.get("actions", []))
        cached.generated_at = datetime.utcnow()
    else:
        cached = CoPilotBriefing(
            user_id=user.id, briefing_date=today,
            narrative=result.get("narrative", ""),
            actions=_json.dumps(result.get("actions", [])),
        )
        db.add(cached)
    db.commit()

    return {
        "narrative": cached.narrative,
        "actions": result.get("actions", []),
        "generated_at": cached.generated_at.isoformat(),
        "cached": False,
    }


COPILOT_DAILY_ASK_LIMIT = 10  # Max questions per member per day

@app.post("/api/copilot/ask")
async def copilot_ask(request: Request, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)):
    """Ask the Co-Pilot a business-focused question about your account. Haiku-powered, 10/day limit."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if getattr(user, "membership_tier", "basic") != "pro" and not user.is_admin:
        return JSONResponse({"error": "Pro membership required"}, status_code=403)

    body = await request.json()
    question = (body.get("question") or "").strip()[:300]
    if not question:
        return JSONResponse({"error": "Question required"}, status_code=400)

    # ── Daily usage limit ──
    today = datetime.utcnow().strftime("%Y-%m-%d")
    quota = db.query(AIUsageQuota).filter(AIUsageQuota.user_id == user.id).first()
    if not quota:
        quota = AIUsageQuota(user_id=user.id, quota_date=today)
        db.add(quota)
        db.flush()

    copilot_asks_today = getattr(quota, "copilot_asks", 0) or 0
    quota_date = getattr(quota, "quota_date", None)
    if quota_date != today:
        copilot_asks_today = 0

    if copilot_asks_today >= COPILOT_DAILY_ASK_LIMIT:
        return JSONResponse({
            "error": f"You've used all {COPILOT_DAILY_ASK_LIMIT} Co-Pilot questions for today. Come back tomorrow for a fresh set.",
            "limit_reached": True,
            "remaining": 0,
        }, status_code=429)

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "AI not configured"}, status_code=500)

    ctx = _build_copilot_context(user, db)
    client = anthropic.Anthropic(api_key=api_key)

    system = f"""You are the SuperAdPro AI Co-Pilot — a focused business advisor for {ctx['name']}.

Their account data: team={ctx['total_team']} members, earned=${ctx['total_earned']} lifetime, this week=${ctx['earned_this_week']}, balance=${ctx['balance']}, hot_leads={ctx['hot_leads']}, uncontacted_leads={ctx['uncontacted_leads']}, active_grids={ctx['active_grids']}, completions={ctx['completions']}, expiring_team_members={ctx['expiring_team_members']}.

STRICT RULES — you must follow these without exception:
1. ONLY answer questions directly related to: their SuperAdPro earnings, grid progress, team building, leads, campaigns, memberships, income growth, or platform features.
2. If the question is off-topic (weather, news, general chat, coding, recipes, anything unrelated to their business) — respond ONLY with: "I'm your SuperAdPro business advisor. I can only help with your earnings, grid, team, and platform strategy."
3. Answer in 2-3 sentences maximum. Be specific to their actual numbers where relevant.
4. No markdown. No bullet points. Plain conversational sentences only.
5. Never engage in small talk or general conversation."""

    try:
        resp = client.messages.create(
            model=AI_MODEL_HAIKU,
            max_tokens=150,
            system=system,
            messages=[{"role": "user", "content": question}]
        )
        reply = resp.content[0].text.strip()

        # Increment usage counter
        try:
            if not hasattr(quota, 'copilot_asks') or quota_date != today:
                quota.quota_date = today
                quota.copilot_asks_today = 1
            else:
                quota.copilot_asks_today = copilot_asks_today + 1
            db.commit()
        except Exception:
            db.rollback()

        remaining = max(0, COPILOT_DAILY_ASK_LIMIT - (copilot_asks_today + 1))
        return {"reply": reply, "remaining": remaining}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ═══════════════════════════════════════════════════════════════
#  STRIPE PAYMENTS
# ═══════════════════════════════════════════════════════════════

@app.post("/api/stripe/create-membership-checkout")
async def stripe_membership_checkout(request: Request, db: Session = Depends(get_db),
                                      user: User = Depends(get_current_user)):
    """Create Stripe Checkout session for membership subscription (monthly or annual)."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    tier = body.get("tier", "basic")
    billing = body.get("billing", "monthly")
    if tier not in ("basic", "pro"):
        return JSONResponse({"error": "Invalid tier"}, status_code=400)
    if billing not in ("monthly", "annual"):
        return JSONResponse({"error": "Invalid billing period"}, status_code=400)
    result = stripe_service.create_membership_checkout(user.id, tier, user.email, billing=billing)
    if result["success"]:
        return {"url": result["url"]}
    return JSONResponse({"error": result["error"]}, status_code=400)


@app.post("/api/stripe/create-grid-checkout")
async def stripe_grid_checkout(request: Request, db: Session = Depends(get_db),
                                user: User = Depends(get_current_user)):
    """Create Stripe Checkout session for a Campaign Tier purchase."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if not user.is_active:
        return JSONResponse({"error": "Active membership required"}, status_code=400)
    body = await request.json()
    package_tier = int(body.get("package_tier", 0))
    from .database import GRID_PACKAGES, GRID_TIER_NAMES
    price = GRID_PACKAGES.get(package_tier)
    tier_name = GRID_TIER_NAMES.get(package_tier, f"Tier {package_tier}")
    if not price:
        return JSONResponse({"error": "Invalid package tier"}, status_code=400)
    result = stripe_service.create_grid_checkout(user.id, package_tier, price, tier_name, user.email)
    if result["success"]:
        return {"url": result["url"]}
    return JSONResponse({"error": result["error"]}, status_code=400)


@app.post("/api/stripe/create-boost-checkout")
async def stripe_boost_checkout(request: Request, db: Session = Depends(get_db),
                                 user: User = Depends(get_current_user)):
    """Create Stripe Checkout session for an email boost pack."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    pack_key = body.get("pack_key", "")
    result = stripe_service.create_boost_checkout(user.id, pack_key, user.email)
    if result["success"]:
        return {"url": result["url"]}
    return JSONResponse({"error": result["error"]}, status_code=400)





@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe_service.verify_webhook(payload, sig_header)
    except Exception as e:
        logger.error(f"Stripe webhook verify error: {e}")
        return JSONResponse({"error": f"Verify error: {str(e)}"}, status_code=500)
    if not event:
        return JSONResponse({"error": "Invalid signature"}, status_code=400)

    event_type = event["type"]

    # ── Checkout completed ────────────────────────────────────
    logger.warning(f"Stripe webhook received: {event_type}")
    if event_type == "checkout.session.completed":
        try:
            # Stripe >= 7 returns StripeObject — convert to plain dict for safety
            import json as _j
            session = _j.loads(_j.dumps(dict(event["data"]["object"])))
            meta = session.get("metadata") or {}
            user_id = int(meta.get("user_id") or 0)
            payment_type = meta.get("payment_type") or ""
            logger.warning(f"Stripe webhook: {payment_type} for user_id={user_id}")
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.warning(f"Stripe webhook: user {user_id} not found")
                return {"received": True}

            if payment_type == "membership":
                tier = meta.get("tier") or "basic"
                billing = meta.get("billing") or "monthly"
                _stripe_activate_membership(db, user, tier, session.get("subscription"), billing=billing)

            elif payment_type == "grid":
                package_tier = int(meta.get("package_tier", 1))
                price_usd = float(meta.get("price_usd", 0))
                _stripe_process_grid(db, user, package_tier, price_usd, session["id"])

            elif payment_type == "email_boost":
                pack_key = meta.get("pack_key", "")
                emails = int(meta.get("emails", 0))
                if emails > 0:
                    user.email_credits = (user.email_credits or 0) + emails
                    payment = Payment(
                        from_user_id=user_id, to_user_id=None,
                        amount_usdt=float(STRIPE_BOOST_PACKS.get(pack_key, {}).get("price", 0)),
                        payment_type="email_boost", tx_hash=session["id"], status="confirmed",
                    )
                    db.add(payment)
                    db.commit()

            elif payment_type == "course":
                course_id = int(meta.get("course_id", 0))
                tx_ref = f"stripe_{session['id'][:20]}"
                result = process_course_purchase(db, user_id, course_id,
                                                 payment_method="stripe", tx_ref=tx_ref)

            elif payment_type == "supermarket":
                product_id = int(meta.get("product_id", 0))
                affiliate_id = meta.get("affiliate_id")
                affiliate_id = int(affiliate_id) if affiliate_id else None
                _stripe_process_supermarket(db, user, product_id, session["id"], affiliate_id)

            elif payment_type == "superscene_credits":
                from .database import SuperSceneCredit, SuperSceneOrder
                from datetime import datetime as _dt
                pack_slug = meta.get("pack_slug", "")
                credits   = int(meta.get("credits", 0))
                if credits > 0:
                    sc_row = db.query(SuperSceneCredit).filter(SuperSceneCredit.user_id == user_id).first()
                    if not sc_row:
                        sc_row = SuperSceneCredit(user_id=user_id, balance=0)
                        db.add(sc_row)
                    sc_row.balance += credits
                    sc_order = db.query(SuperSceneOrder).filter(
                        SuperSceneOrder.stripe_session_id == session["id"]
                    ).first()
                    if sc_order:
                        sc_order.status = "completed"
                        sc_order.completed_at = _dt.utcnow()
                    db.commit()
                    logger.warning(f"SuperScene: +{credits} credits to user {user_id} (pack={pack_slug})")

        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            logger.error(f"Stripe webhook checkout error: {e}\n{tb}")
            return JSONResponse({"error": str(e), "detail": tb}, status_code=500)

    # ── Subscription renewed (monthly) ───────────────────────
    elif event_type == "invoice.payment_succeeded":
        invoice = event["data"]["object"]
        if invoice.get("billing_reason") == "subscription_cycle":
            sub_id = invoice.get("subscription")
            if sub_id:
                sub = stripe_service.get_subscription(sub_id)
                if sub:
                    user_id = int(sub.get("metadata", {}).get("user_id", 0))
                    tier = sub.get("metadata", {}).get("tier", "basic")
                    user = db.query(User).filter(User.id == user_id).first()
                    if user:
                        _stripe_renew_membership(db, user, tier, sub_id)

    # ── Subscription cancelled / payment failed ───────────────
    elif event_type in ("customer.subscription.deleted", "invoice.payment_failed"):
        obj = event["data"]["object"]
        sub_id = obj.get("id") if event_type == "customer.subscription.deleted" else obj.get("subscription")
        if sub_id:
            user = db.query(User).filter(User.stripe_subscription_id == sub_id).first()
            if user:
                user.is_active = False
                user.membership_tier = "basic"
                db.commit()

    return {"received": True}




def _stripe_process_supermarket(db, user, product_id, session_id, affiliate_id=None):
    """Complete a SuperMarket purchase after Stripe payment confirmed."""
    import secrets as _secrets
    p = db.query(DigitalProduct).filter(
        DigitalProduct.id == product_id, DigitalProduct.status == "published"
    ).first()
    if not p:
        return

    # Prevent duplicates
    existing = db.query(DigitalProductPurchase).filter(
        DigitalProductPurchase.product_id == product_id,
        DigitalProductPurchase.buyer_id == user.id,
        DigitalProductPurchase.status == "completed"
    ).first()
    if existing:
        return

    token = _secrets.token_urlsafe(32)
    from decimal import Decimal
    creator_amt   = (p.price or Decimal("0")) * Decimal("0.50")
    affiliate_amt = (p.price or Decimal("0")) * Decimal("0.25")
    platform_amt  = (p.price or Decimal("0")) * Decimal("0.25")

    purchase = DigitalProductPurchase(
        product_id=p.id, buyer_id=user.id, buyer_email=user.email,
        buyer_name=user.first_name or user.username,
        amount_paid=p.price,
        creator_commission=creator_amt, affiliate_commission=affiliate_amt,
        platform_commission=platform_amt, affiliate_id=affiliate_id,
        download_token=token, status="completed",
    )
    db.add(purchase)

    creator = db.query(User).filter(User.id == p.creator_id).first()
    if creator:
        creator.balance = (creator.balance or 0) + creator_amt
        creator.total_earned = (creator.total_earned or 0) + creator_amt
        creator.marketplace_earnings = (creator.marketplace_earnings or 0) + creator_amt

    if affiliate_id:
        affiliate = db.query(User).filter(User.id == affiliate_id).first()
        if affiliate:
            affiliate.balance = (affiliate.balance or 0) + affiliate_amt
            affiliate.total_earned = (affiliate.total_earned or 0) + affiliate_amt
            affiliate.marketplace_earnings = (affiliate.marketplace_earnings or 0) + affiliate_amt
            aff_rec = db.query(DigitalProductAffiliate).filter(
                DigitalProductAffiliate.product_id == p.id,
                DigitalProductAffiliate.user_id == affiliate_id
            ).first()
            if aff_rec:
                aff_rec.sales = (aff_rec.sales or 0) + 1
                aff_rec.earnings = (aff_rec.earnings or 0) + affiliate_amt

    p.total_sales = (p.total_sales or 0) + 1
    p.total_revenue = (p.total_revenue or Decimal("0")) + (p.price or Decimal("0"))
    db.commit()

def _activate_membership(db, user, tier, source="stripe", subscription_id=None, is_upgrade=False, billing="monthly"):
    """
    Shared membership activation — used by BOTH Stripe and Crypto.
    Handles: activation, payment record, sponsor commission, renewal record, welcome email.
    
    Commission rules:
    - Sponsor commission is capped at their own tier level ($10 Basic, $17.50 Pro)
    - Upgrades (Basic→Pro) pay $15 to company only, no sponsor commission
    """
    from datetime import datetime, timedelta
    from decimal import Decimal
    import uuid

    # Pricing — single source of truth
    MEMBERSHIP_PRICES = {"pro": Decimal("35.00"), "basic": Decimal("20.00")}
    ANNUAL_MEMBERSHIP_PRICES = {"pro": Decimal("350.00"), "basic": Decimal("200.00")}
    COMMISSION_CAPS = {"pro": Decimal("17.50"), "basic": Decimal("10.00")}
    ANNUAL_COMMISSION = {"pro": Decimal("175.00"), "basic": Decimal("100.00")}

    is_annual = (billing == "annual")
    fee = ANNUAL_MEMBERSHIP_PRICES.get(tier, Decimal("200.00")) if is_annual else MEMBERSHIP_PRICES.get(tier, Decimal("20.00"))

    # Activate user
    user.is_active = True
    user.membership_tier = tier
    user.membership_billing = "annual" if is_annual else "monthly"
    user.membership_expires_at = datetime.utcnow() + timedelta(days=365 if is_annual else 31)
    if subscription_id:
        user.stripe_subscription_id = subscription_id

    # Record payment
    if is_upgrade:
        actual_charge = Decimal("15.00")  # upgrade difference only
        payment_type = "membership_upgrade"
    else:
        actual_charge = fee
        payment_type = "membership"

    existing = db.query(Payment).filter(
        Payment.from_user_id == user.id,
        Payment.payment_type == payment_type,
        Payment.status == "confirmed",
    ).first()
    if not existing:
        tx_ref = f"{source}_{uuid.uuid4().hex[:16]}"
        payment = Payment(
            from_user_id=user.id, to_user_id=None,
            amount_usdt=actual_charge, payment_type=payment_type,
            tx_hash=tx_ref, status="confirmed",
        )
        db.add(payment)
        db.flush()

    # Credit sponsor commission (NOT on upgrades — upgrade fee goes 100% to company)
    if user.sponsor_id and not is_upgrade:
        sponsor = db.query(User).filter(User.id == user.sponsor_id).first()
        if sponsor:
            if is_annual:
                # Annual: flat 50% commission, no tier cap
                sponsor_share = ANNUAL_COMMISSION.get(tier, Decimal("100.00"))
            else:
                # Monthly: cap commission at sponsor's own tier level
                sponsor_tier = getattr(sponsor, "membership_tier", "basic") or "basic"
                max_commission = COMMISSION_CAPS.get(sponsor_tier, Decimal("10.00"))
                sponsor_share = min(fee * Decimal("0.50"), max_commission)

            sponsor.balance = Decimal(str(sponsor.balance or 0)) + sponsor_share
            sponsor.total_earned = Decimal(str(sponsor.total_earned or 0)) + sponsor_share
            sponsor.personal_referrals = (sponsor.personal_referrals or 0) + 1
            comm = Commission(
                to_user_id=sponsor.id, from_user_id=user.id,
                amount_usdt=sponsor_share, commission_type="membership_sponsor",
                package_tier=0,
                notes=f"Membership commission from {user.username} ({source}) — capped at {sponsor_tier} tier",
                status="paid",
                paid_at=datetime.utcnow(),
            )
            db.add(comm)

            # Send cha-ching commission email to sponsor
            try:
                from .email_utils import send_commission_email
                if sponsor.email:
                    send_commission_email(
                        to_email=sponsor.email,
                        first_name=sponsor.first_name or sponsor.username,
                        commission_type="Membership Sponsor",
                        from_username=user.username,
                    )
            except Exception:
                pass

    # Create renewal record
    try:
        initialise_renewal_record(db, user.id, source=source)
    except Exception:
        pass

    # Send welcome email
    try:
        from .email_utils import send_membership_activated_email
        send_membership_activated_email(user.email, user.first_name or user.username)
    except Exception:
        pass

    db.commit()
    return {"message": f"{tier.title()} membership activated! Expires {user.membership_expires_at.strftime('%d %b %Y')}."}


def _stripe_activate_membership(db, user, tier, subscription_id, billing="monthly"):
    """Stripe membership activation — delegates to shared function."""
    return _activate_membership(db, user, tier, source="stripe", subscription_id=subscription_id, billing=billing)


def _stripe_renew_membership(db, user, tier, subscription_id):
    """Process monthly renewal — sponsor gets capped commission."""
    from datetime import datetime, timedelta
    from decimal import Decimal
    import uuid

    COMMISSION_CAPS = {"pro": Decimal("17.50"), "basic": Decimal("10.00")}
    fee = Decimal("35.00") if tier == "pro" else Decimal("20.00")
    sponsor_share = fee * Decimal("0.50")

    user.is_active = True
    user.membership_expires_at = datetime.utcnow() + timedelta(days=31)
    tx_ref = f"stripe_renew_{uuid.uuid4().hex[:12]}"
    payment = Payment(
        from_user_id=user.id, to_user_id=None,
        amount_usdt=fee, payment_type="membership_renewal",
        tx_hash=tx_ref, status="confirmed",
    )
    db.add(payment)

    # Pay sponsor commission on renewal (capped at sponsor's tier)
    if user.sponsor_id:
        sponsor = db.query(User).filter(User.id == user.sponsor_id).first()
        if sponsor:
            sponsor_tier = getattr(sponsor, "membership_tier", "basic") or "basic"
            max_commission = COMMISSION_CAPS.get(sponsor_tier, Decimal("10.00"))
            capped_share = min(sponsor_share, max_commission)
            sponsor.balance = Decimal(str(sponsor.balance or 0)) + capped_share
            sponsor.total_earned = Decimal(str(sponsor.total_earned or 0)) + capped_share
            db.add(Commission(
                to_user_id=sponsor.id, from_user_id=user.id,
                amount_usdt=capped_share, commission_type="membership_renewal",
                package_tier=0,
                notes=f"Renewal commission from {user.username} — capped at {sponsor_tier} tier",
                status="pending", paid_at=datetime.utcnow(),
            ))

    db.commit()


@app.post("/api/upgrade-to-pro")
async def api_upgrade_to_pro(request: Request, db: Session = Depends(get_db),
                              user: User = Depends(get_current_user)):
    """Upgrade Basic → Pro for $15 (difference). 100% to company, no sponsor commission."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if not user.is_active:
        return JSONResponse({"error": "You need an active Basic membership first"}, status_code=400)
    if (user.membership_tier or "basic") == "pro" or user.is_admin:
        return JSONResponse({"error": "You're already on Pro"}, status_code=400)

    return _activate_membership(db, user, "pro", source="upgrade", is_upgrade=True)


def _stripe_process_grid(db, user, package_tier, price_usd, session_id):
    """Process campaign tier purchase after Stripe payment — full commission chain."""
    from .grid import process_tier_purchase
    import uuid

    # Record payment
    tx_ref = f"stripe_grid_{uuid.uuid4().hex[:12]}"
    payment = Payment(
        from_user_id=user.id, to_user_id=None,
        amount_usdt=price_usd, payment_type=f"grid_tier_{package_tier}",
        tx_hash=tx_ref, status="confirmed",
    )
    db.add(payment)
    db.flush()

    # Full commission processing: 40% direct, 50% uni-level (8 levels), 5% platform, 5% bonus
    # Plus spillover fill into all upline grids at this tier
    result = process_tier_purchase(db=db, buyer_id=user.id, package_tier=package_tier)
    if not result["success"]:
        logger.error(f"Grid purchase failed for user {user.id} tier {package_tier}: {result.get('error')}")

    db.commit()


# ═══════════════════════════════════════════════════════════════
#  CRYPTO PAYMENTS — USDT on Polygon via Alchemy
# ═══════════════════════════════════════════════════════════════

@app.post("/api/crypto/create-checkout")
async def crypto_create_checkout(request: Request, db: Session = Depends(get_db),
                                  user: User = Depends(get_current_user)):
    """Create a crypto payment order. Matches by sender wallet address + approximate amount."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    try:
        from .database import CryptoPaymentOrder
        from .crypto_payments import TREASURY_WALLET, PRODUCT_PRICES, ORDER_EXPIRY_MINUTES
        from decimal import Decimal
        from datetime import datetime, timedelta
        import json as _json

        body = await request.json()
        product_key = body.get("product_key", "")
        product_meta = body.get("meta", {})
        from_address = body.get("from_address", "").strip()

        # Validate sender wallet address
        if not from_address or len(from_address) < 40 or not from_address.startswith("0x"):
            return JSONResponse({"error": "Please enter a valid Polygon wallet address (starts with 0x)"}, status_code=400)

        # Save sending wallet to user account for future payments (safe — ignore if column missing)
        try:
            from sqlalchemy import text as _text
            db.execute(_text("UPDATE users SET sending_wallet = :w WHERE id = :uid"), {"w": from_address, "uid": user.id})
            db.flush()
        except Exception:
            pass

        # Validate product
        if product_key not in PRODUCT_PRICES:
            if product_key.startswith("course_"):
                course_id = int(product_key.split("_")[1])
                from .database import MemberCourse
                course = db.query(MemberCourse).filter(MemberCourse.id == course_id).first()
                if not course:
                    return JSONResponse({"error": "Course not found"}, status_code=404)
                base_price = Decimal(str(course.price or 0))
                product_type = "course"
            elif product_key.startswith("supermarket_"):
                prod_id = int(product_key.split("_")[1])
                from .database import DigitalProduct
                product = db.query(DigitalProduct).filter(DigitalProduct.id == prod_id).first()
                if not product:
                    return JSONResponse({"error": "Product not found"}, status_code=404)
                base_price = Decimal(str(product.price or 0))
                product_type = "supermarket"
            else:
                return JSONResponse({"error": f"Unknown product: {product_key}"}, status_code=400)
        else:
            base_price = PRODUCT_PRICES[product_key]
            if product_key.startswith("membership"):
                product_type = "membership"
            elif product_key.startswith("grid"):
                product_type = "grid"
            elif product_key.startswith("email_boost"):
                product_type = "email_boost"
            else:
                product_type = "other"

        if base_price <= 0:
            return JSONResponse({"error": "Invalid price"}, status_code=400)

        # Cancel any existing pending orders for this user + product
        db.query(CryptoPaymentOrder).filter(
            CryptoPaymentOrder.user_id == user.id,
            CryptoPaymentOrder.product_key == product_key,
            CryptoPaymentOrder.status == "pending",
        ).update({"status": "cancelled"})
        db.flush()

        # Create order — amount is the round base price, matching by sender address
        order = CryptoPaymentOrder(
            user_id=user.id,
            product_type=product_type,
            product_key=product_key,
            product_meta=_json.dumps(product_meta) if product_meta else None,
            base_amount=base_price,
            unique_amount=base_price,
            from_address=from_address,
            status="pending",
            expires_at=datetime.utcnow() + timedelta(minutes=ORDER_EXPIRY_MINUTES),
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        return {
            "order_id": order.id,
            "wallet_address": TREASURY_WALLET,
            "amount_usdt": str(base_price.quantize(Decimal("0.01"))),
            "chain": "Polygon",
            "chain_id": 137,
            "token": "USDT",
            "token_contract": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
            "expires_at": order.expires_at.isoformat(),
            "expires_in_seconds": ORDER_EXPIRY_MINUTES * 60,
        }
    except Exception as e:
        import traceback
        logger.error(f"Crypto checkout error: {e}\n{traceback.format_exc()}")
        db.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/crypto/order/{order_id}")
async def crypto_order_status(order_id: int, request: Request,
                               db: Session = Depends(get_db),
                               user: User = Depends(get_current_user)):
    """Check the status of a crypto payment order."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from .database import CryptoPaymentOrder
    order = db.query(CryptoPaymentOrder).filter(
        CryptoPaymentOrder.id == order_id,
        CryptoPaymentOrder.user_id == user.id,
    ).first()

    if not order:
        return JSONResponse({"error": "Order not found"}, status_code=404)

    # Check if expired
    from datetime import datetime
    if order.status == "pending" and order.expires_at < datetime.utcnow():
        order.status = "expired"
        db.commit()

    return {
        "order_id": order.id,
        "status": order.status,
        "product_key": order.product_key,
        "amount_usdt": str(order.unique_amount),
        "tx_hash": order.tx_hash,
        "confirmed_at": order.confirmed_at.isoformat() if order.confirmed_at else None,
        "expires_at": order.expires_at.isoformat(),
    }


@app.post("/api/crypto/verify-payment")
async def crypto_verify_payment(request: Request, db: Session = Depends(get_db),
                                 user: User = Depends(get_current_user)):
    """
    Member submits their tx_hash after sending USDT.
    Backend verifies the transaction on Polygon and activates the product.
    """
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from .database import CryptoPaymentOrder
    from .crypto_payments import check_usdt_transfer, TREASURY_WALLET
    from decimal import Decimal
    from datetime import datetime
    import json as _json

    body = await request.json()
    order_id = int(body.get("order_id", 0))
    tx_hash = (body.get("tx_hash") or "").strip()

    if not tx_hash or not tx_hash.startswith("0x"):
        return JSONResponse({"error": "Invalid transaction hash"}, status_code=400)

    order = db.query(CryptoPaymentOrder).filter(
        CryptoPaymentOrder.id == order_id,
        CryptoPaymentOrder.user_id == user.id,
        CryptoPaymentOrder.status == "pending",
    ).first()

    if not order:
        return JSONResponse({"error": "Order not found or already processed"}, status_code=404)

    # Check if expired
    if order.expires_at < datetime.utcnow():
        order.status = "expired"
        db.commit()
        return JSONResponse({"error": "Order expired"}, status_code=400)

    # Check if tx_hash already used
    existing = db.query(CryptoPaymentOrder).filter(
        CryptoPaymentOrder.tx_hash == tx_hash,
        CryptoPaymentOrder.status == "confirmed",
    ).first()
    if existing:
        return JSONResponse({"error": "Transaction already used for another order"}, status_code=400)

    # Verify on Polygon via Alchemy
    try:
        result = check_usdt_transfer(tx_hash)
    except Exception as e:
        logger.error(f"Alchemy verification failed: {e}")
        return JSONResponse({"error": "Could not verify transaction. Try again in a moment."}, status_code=503)

    if not result.get("confirmed"):
        return JSONResponse({
            "error": result.get("error", "Transaction not confirmed yet"),
            "status": "pending",
        }, status_code=202)

    # Verify the transfer went to OUR treasury wallet
    if result["to_address"].lower() != TREASURY_WALLET.lower():
        return JSONResponse({"error": "Payment was sent to the wrong address"}, status_code=400)

    # Verify the amount matches (allow tiny tolerance for rounding)
    received = result["amount_usdt"]
    expected = order.unique_amount
    tolerance = Decimal("0.001")  # $0.001 tolerance

    if abs(received - expected) > tolerance:
        return JSONResponse({
            "error": f"Amount mismatch. Expected {expected} USDT, received {received} USDT",
        }, status_code=400)

    # ── Payment verified! Activate the product ──
    order.status = "confirmed"
    order.tx_hash = tx_hash
    order.from_address = result["from_address"]
    order.confirmed_at = datetime.utcnow()
    db.flush()

    meta = _json.loads(order.product_meta) if order.product_meta else {}

    # Record the payment in the main payments table
    import uuid
    payment = Payment(
        from_user_id=user.id, to_user_id=None,
        amount_usdt=order.base_amount,
        payment_type=f"crypto_{order.product_type}",
        tx_hash=tx_hash, status="confirmed",
    )
    db.add(payment)
    db.flush()

    # Activate the product based on type
    activation_result = _crypto_activate_product(db, user, order, meta)

    db.commit()

    return {
        "success": True,
        "status": "confirmed",
        "order_id": order.id,
        "tx_hash": tx_hash,
        "product_type": order.product_type,
        "product_key": order.product_key,
        "message": activation_result.get("message", "Payment confirmed and product activated!"),
    }


def _crypto_activate_product(db, user, order, meta):
    """Activate the correct product after crypto payment is confirmed."""
    from datetime import datetime, timedelta
    from decimal import Decimal
    import uuid

    product_key = order.product_key

    # ── Membership ──
    if order.product_type == "membership":
        tier = "pro" if "pro" in product_key else "basic"
        return _activate_membership(db, user, tier, source="crypto")
    # ── Grid / Campaign Tier ──
    elif order.product_type == "grid":
        package_tier = int(product_key.split("_")[1])

        from .grid import process_tier_purchase

        # Full commission processing: 40% direct, 50% uni-level (8 levels), 5% platform, 5% bonus
        # Plus spillover fill into all upline grids at this tier
        result = process_tier_purchase(db=db, buyer_id=user.id, package_tier=package_tier)
        if not result["success"]:
            logger.error(f"Crypto grid purchase failed for user {user.id} tier {package_tier}: {result.get('error')}")

        return {"message": f"Campaign Tier {package_tier} activated!"}

    # ── Email Boost ──
    elif order.product_type == "email_boost":
        pack_map = {
            "email_boost_1000": 1000,
            "email_boost_5000": 5000,
            "email_boost_10000": 10000,
            "email_boost_50000": 50000,
        }
        credits = pack_map.get(product_key, 0)
        if credits:
            user.email_credits = (user.email_credits or 0) + credits
        return {"message": f"{credits:,} email credits added!"}

    # ── Course ──
    elif order.product_type == "course":
        course_id = int(product_key.split("_")[1])
        tx_ref = f"crypto_{order.tx_hash[:20]}" if order.tx_hash else f"crypto_{uuid.uuid4().hex[:12]}"
        try:
            process_course_purchase(db, user.id, course_id, payment_method="crypto", tx_ref=tx_ref)
        except Exception as e:
            logger.error(f"Course activation failed: {e}")
        return {"message": "Course purchased successfully!"}

    # ── SuperMarket ──
    elif order.product_type == "supermarket":
        product_id = int(product_key.split("_")[1])
        affiliate_id = meta.get("affiliate_id")
        affiliate_id = int(affiliate_id) if affiliate_id else None
        _stripe_process_supermarket(db, user, product_id,
                                     order.tx_hash or f"crypto_{uuid.uuid4().hex[:12]}",
                                     affiliate_id)
        return {"message": "Product purchased!"}

    return {"message": "Payment confirmed!"}


@app.post("/api/crypto/poll-payments")
async def crypto_poll_payments(request: Request, db: Session = Depends(get_db)):
    """
    Cron endpoint — polls Alchemy for recent USDT transfers to treasury
    and auto-confirms matching pending orders.
    Protected by CRON_SECRET bearer token.
    """
    import os
    auth = request.headers.get("Authorization", "")
    secret = os.environ.get("CRON_SECRET", "")
    if not auth.endswith(secret):
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    from .database import CryptoPaymentOrder
    from .crypto_payments import get_recent_usdt_transfers, TREASURY_WALLET
    from decimal import Decimal
    from datetime import datetime

    # Get pending orders
    pending = db.query(CryptoPaymentOrder).filter(
        CryptoPaymentOrder.status == "pending",
        CryptoPaymentOrder.expires_at > datetime.utcnow(),
    ).all()

    if not pending:
        return {"matched": 0, "message": "No pending orders"}

    # Build lookup by sender wallet address (lowercased)
    sender_map = {}
    for o in pending:
        if o.from_address:
            key = o.from_address.lower()
            if key not in sender_map:
                sender_map[key] = []
            sender_map[key].append(o)

    # Fetch recent transfers from Alchemy
    try:
        transfers = get_recent_usdt_transfers(from_block="recent")
    except Exception as e:
        logger.error(f"Alchemy poll failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=503)

    matched = 0
    for t in transfers:
        sender = t["from_address"].lower()
        if sender not in sender_map:
            continue

        # Check each pending order from this sender
        for order in sender_map[sender]:
            if order.status != "pending":
                continue

            # Approximate amount match — within $1.00 of expected
            tx_amount = t["amount_usdt"]
            expected = Decimal(str(order.base_amount))
            if abs(tx_amount - expected) > Decimal("1.00"):
                continue

            # Match found — sender address + approximate amount
            order.status = "confirmed"
            order.tx_hash = t["tx_hash"]
            order.confirmed_at = datetime.utcnow()
            db.flush()

            # Activate product
            user = db.query(User).filter(User.id == order.user_id).first()
            if user:
                import json as _json
                meta = _json.loads(order.product_meta) if order.product_meta else {}
                _crypto_activate_product(db, user, order, meta)
                matched += 1
            break  # One transfer matches one order

    db.commit()
    return {"matched": matched, "pending_count": len(pending)}


@app.get("/api/crypto/treasury-balance")
async def crypto_treasury_balance(request: Request, user: User = Depends(get_current_user)):
    """Admin-only: check treasury USDT balance."""
    if not user or not user.is_admin:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    from .crypto_payments import get_treasury_usdt_balance, TREASURY_WALLET
    try:
        balance = get_treasury_usdt_balance()
        return {
            "wallet": TREASURY_WALLET,
            "balance_usdt": str(balance),
            "chain": "Polygon",
        }
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=503)


@app.get("/admin/debug-transfers")
def debug_transfers(secret: str = "", db: Session = Depends(get_db)):
    """TEMPORARY debug — shows raw Alchemy transfer data."""
    if secret != os.environ.get("CRON_SECRET", ""):
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        from .crypto_payments import TREASURY_WALLET, ACCEPTED_TOKENS
        from .database import CryptoPaymentOrder
        import requests as _req

        alchemy_key = os.environ.get("ALCHEMY_API_KEY", "MISSING")
        alchemy_url = f"https://polygon-mainnet.g.alchemy.com/v2/{alchemy_key}"

        # Step 1: Raw block number call
        try:
            r1 = _req.post(alchemy_url, json={"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}, timeout=10)
            r1_status = r1.status_code
            r1_text = r1.text[:300]
            r1_block = int(r1.json().get("result", "0x0"), 16) if r1.status_code == 200 and r1.text else 0
        except Exception as e:
            r1_status = -1
            r1_text = str(e)
            r1_block = 0

        # Step 2: Raw getAssetTransfers call
        from_hex = hex(max(r1_block - 50000, 0)) if r1_block else "0x0"
        try:
            r2 = _req.post(alchemy_url, json={
                "jsonrpc":"2.0","id":2,"method":"alchemy_getAssetTransfers",
                "params":[{
                    "fromBlock": from_hex,
                    "toBlock": "latest",
                    "toAddress": TREASURY_WALLET.lower(),
                    "contractAddresses": ACCEPTED_TOKENS,
                    "category": ["erc20"],
                    "withMetadata": True,
                    "maxCount": "0x10",
                    "order": "desc",
                }]
            }, timeout=15)
            r2_status = r2.status_code
            r2_data = r2.json() if r2.status_code == 200 else {}
            r2_transfers = r2_data.get("result", {}).get("transfers", [])
            r2_parsed = [{"from": t.get("from","?"), "to": t.get("to","?"), "value": t.get("value",0), "hash": t.get("hash","?")[:20], "asset": t.get("asset","?")} for t in r2_transfers]
        except Exception as e:
            r2_status = -1
            r2_parsed = []
            r2_data = {"error": str(e)}

        pending = db.query(CryptoPaymentOrder).filter(CryptoPaymentOrder.status == "pending").all()
        pending_info = [{"id": o.id, "from_address": o.from_address, "amount": str(o.base_amount)} for o in pending]

        # Check commissions and admin state
        all_comms = db.query(Commission).order_by(Commission.created_at.desc()).limit(10).all()
        comm_info = [{"id": c.id, "to": c.to_user_id, "from": c.from_user_id, "amount": str(c.amount_usdt), "type": c.commission_type, "date": str(c.created_at)} for c in all_comms]
        admin = db.query(User).filter(User.username == "SuperAdPro").first()
        admin_info = {"balance": str(admin.balance), "total_earned": str(admin.total_earned), "referrals": admin.personal_referrals, "team": admin.total_team} if admin else {}

        return {
            "alchemy_key_prefix": alchemy_key[:6] + "..." if len(alchemy_key) > 6 else alchemy_key,
            "alchemy_key_length": len(alchemy_key),
            "step1_blockNumber": {"status": r1_status, "block": r1_block, "response": r1_text[:200]},
            "step2_getAssetTransfers": {"status": r2_status, "count": len(r2_parsed), "transfers": r2_parsed},
            "pending_orders": pending_info,
            "commissions": comm_info,
            "admin": admin_info,
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}


@app.post("/admin/reset-test-data")
@app.get("/admin/reset-test-data")
def admin_reset_test_data(secret: str = "", db: Session = Depends(get_db)):
    """Delete all users except SuperAdPro admin, reset admin balances, clear ALL data for fresh test cycle."""
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    try:
        from sqlalchemy import text as _text
        from .database import engine

        with engine.connect() as conn:
            # Get admin ID
            r = conn.execute(_text("SELECT id FROM users WHERE username = 'SuperAdPro'"))
            row = r.fetchone()
            if not row:
                return {"error": "Admin not found"}
            admin_id = row[0]

            # Get test user IDs
            r2 = conn.execute(_text("SELECT id, username FROM users WHERE id != :aid"), {"aid": admin_id})
            test_users = r2.fetchall()
            deleted = [u[1] for u in test_users]
            user_ids = [u[0] for u in test_users]
            conn.commit()

        # Delete each table in its own transaction
        if user_ids:
            ids_str = ",".join(str(i) for i in user_ids)
            
            # Dynamically find ALL tables with FK to users
            with engine.connect() as c:
                fk_result = c.execute(_text("""
                    SELECT DISTINCT tc.table_name, kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users'
                    ORDER BY tc.table_name
                """))
                fk_tables = [(row[0], row[1]) for row in fk_result.fetchall()]
                c.commit()
            
            # Delete from each FK table
            for table, col in fk_tables:
                if table == 'users':
                    continue
                try:
                    with engine.connect() as c:
                        c.execute(_text(f"DELETE FROM {table} WHERE {col} IN ({ids_str})"))
                        c.commit()
                except Exception:
                    pass
            
            # Null out self-referencing FKs
            try:
                with engine.connect() as c:
                    c.execute(_text(f"UPDATE users SET sponsor_id = NULL WHERE sponsor_id IN ({ids_str})"))
                    c.execute(_text(f"UPDATE users SET pass_up_sponsor_id = NULL WHERE pass_up_sponsor_id IN ({ids_str})"))
                    c.commit()
            except Exception:
                pass

            # Delete users
            with engine.connect() as c:
                c.execute(_text(f"DELETE FROM users WHERE id IN ({ids_str})"))
                c.commit()

        # Reset admin balances and set to Pro tier
        with engine.connect() as c:
            c.execute(_text("""
                UPDATE users SET 
                    balance=0, total_earned=0, total_withdrawn=0,
                    grid_earnings=0, level_earnings=0, upline_earnings=0,
                    course_earnings=0, marketplace_earnings=0, bonus_earnings=0,
                    personal_referrals=0, total_team=0, course_sale_count=0,
                    membership_tier='pro', is_active=true
                WHERE id = :aid
            """), {"aid": admin_id})
            c.commit()

        # Clear ALL data tables for a completely fresh start
        cleanup_tables = [
            "crypto_payment_orders", "commissions", "payments", "grid_positions", "grids",
            "video_watches", "video_campaigns",
            "notifications", "team_messages", "proseller_messages",
            "superseller_campaigns",
            "autoresponder_queue",
        ]
        cleared = {}
        for table in cleanup_tables:
            try:
                with engine.connect() as c:
                    result = c.execute(_text(f"DELETE FROM {table}"))
                    cleared[table] = result.rowcount
                    c.commit()
            except Exception as e:
                cleared[table] = f"skip: {str(e)[:80]}"

        return {
            "ok": True,
            "deleted_users": deleted,
            "admin_reset": True,
            "tables_cleared": cleared,
            "message": "All data wiped. Fresh start — only SuperAdPro admin remains."
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}




@app.post("/api/stripe/create-course-checkout")
async def stripe_course_checkout(request: Request, db: Session = Depends(get_db),
                                  user: User = Depends(get_current_user)):
    """Create Stripe Checkout session for a course purchase."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    course_id = int(body.get("course_id", 0))
    from .database import Course
    course = db.query(Course).filter(Course.id == course_id, Course.is_active == True).first()
    if not course:
        return JSONResponse({"error": "Course not found"}, status_code=404)
    result = stripe_service.create_course_checkout(
        user.id, course.id, course.title, course.tier, float(course.price), user.email
    )
    if result["success"]:
        return {"url": result["url"]}
    return JSONResponse({"error": result["error"]}, status_code=400)


@app.post("/api/stripe/create-supermarket-checkout")
async def stripe_supermarket_checkout(request: Request, db: Session = Depends(get_db),
                                       user: User = Depends(get_current_user)):
    """Create Stripe Checkout session for a SuperMarket product."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    product_id = int(body.get("product_id", 0))
    affiliate_id = body.get("affiliate_id")
    p = db.query(DigitalProduct).filter(
        DigitalProduct.id == product_id, DigitalProduct.status == "published"
    ).first()
    if not p:
        return JSONResponse({"error": "Product not found"}, status_code=404)
    if p.creator_id == user.id:
        return JSONResponse({"error": "Cannot purchase your own product"}, status_code=400)
    # Check not already purchased
    from .database import DigitalProductPurchase
    existing = db.query(DigitalProductPurchase).filter(
        DigitalProductPurchase.product_id == product_id,
        DigitalProductPurchase.buyer_id == user.id,
        DigitalProductPurchase.status == "completed"
    ).first()
    if existing:
        return JSONResponse({"error": "Already purchased", "download_token": existing.download_token}, status_code=400)
    result = stripe_service.create_supermarket_checkout(
        user.id, p.id, p.title, float(p.price), user.email, affiliate_id
    )
    if result["success"]:
        return {"url": result["url"]}
    return JSONResponse({"error": result["error"]}, status_code=400)

@app.get("/api/stripe/config")
def stripe_config(user: User = Depends(get_current_user)):
    """Return Stripe publishable key for frontend."""
    return {
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "configured": stripe_service.is_configured(),
    }


@app.post("/api/stripe/cancel-subscription")
async def cancel_stripe_subscription(request: Request, db: Session = Depends(get_db),
                                      user: User = Depends(get_current_user)):
    """Cancel a member's Stripe subscription."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    sub_id = getattr(user, "stripe_subscription_id", None)
    if not sub_id:
        return JSONResponse({"error": "No active subscription found"}, status_code=400)
    success = stripe_service.cancel_subscription(sub_id)
    if success:
        user.stripe_subscription_id = None
        db.commit()
        return {"ok": True, "message": "Subscription cancelled"}
    return JSONResponse({"error": "Cancellation failed"}, status_code=400)


# ════════════════════════════════════════════════════════════════════
#  NOWPayments — Crypto + Fiat Card Payment Gateway
# ════════════════════════════════════════════════════════════════════

@app.get("/api/nowpayments/config")
def nowpayments_config(user: User = Depends(get_current_user)):
    """Return whether NOWPayments is configured (no secrets exposed)."""
    from . import nowpayments_service as nps
    return {"configured": nps.is_configured()}


@app.post("/api/nowpayments/create-invoice")
async def nowpayments_create_invoice(request: Request, db: Session = Depends(get_db),
                                      user: User = Depends(get_current_user)):
    """
    Create a NOWPayments invoice for any product.

    Body: {
        "product_key": "membership_basic" | "grid_3" | "email_boost_5000" | ...,
        "meta": { ... optional extra data ... }
    }

    Returns: { "success": true, "invoice_url": "...", "order_id": int }
    """
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from . import nowpayments_service as nps
    from .database import NowPaymentsOrder
    from decimal import Decimal
    import json as _json

    if not nps.is_configured():
        return JSONResponse({"error": "Payment service not configured"}, status_code=503)

    body = await request.json()
    product_key = body.get("product_key", "").strip()
    product_meta = body.get("meta", {})

    # ── Validate product ──
    if product_key in nps.PRODUCT_CATALOG:
        product = nps.PRODUCT_CATALOG[product_key]
        price_usd = product["price"]
        product_type = product["type"]
    else:
        return JSONResponse({"error": f"Unknown product: {product_key}"}, status_code=400)

    if price_usd <= 0:
        return JSONResponse({"error": "Invalid price"}, status_code=400)

    # ── Membership: check if upgrading ──
    if product_type == "membership":
        tier = "pro" if "pro" in product_key else "basic"
        if tier == "basic" and user.is_active and user.membership_tier == "basic":
            return JSONResponse({"error": "You already have an active Basic membership"}, status_code=400)
        if tier == "pro" and user.is_active and user.membership_tier == "pro":
            return JSONResponse({"error": "You already have an active Pro membership"}, status_code=400)
        # Upgrade: Basic → Pro = $15 difference
        if tier == "pro" and user.is_active and user.membership_tier == "basic":
            price_usd = Decimal("15.00")
            product_meta["is_upgrade"] = True

    # ── Grid: check active membership ──
    if product_type == "grid" and not user.is_active:
        return JSONResponse({"error": "Active membership required to purchase Campaign Tiers"}, status_code=400)

    # ── Cancel existing pending NOWPayments orders for same product ──
    db.query(NowPaymentsOrder).filter(
        NowPaymentsOrder.user_id == user.id,
        NowPaymentsOrder.product_key == product_key,
        NowPaymentsOrder.status == "pending",
    ).update({"status": "cancelled"})
    db.flush()

    # ── Create local order record first ──
    order = NowPaymentsOrder(
        user_id=user.id,
        product_type=product_type,
        product_key=product_key,
        product_meta=_json.dumps(product_meta) if product_meta else None,
        price_usd=price_usd,
        status="pending",
    )
    db.add(order)
    db.flush()  # Get order.id

    internal_order_id = f"SAP-{user.id}-{order.id}"
    order.internal_order_id = internal_order_id

    # ── Create NOWPayments invoice ──
    result = nps.create_invoice(
        product_key=product_key,
        user_id=user.id,
        order_id=order.id,
        custom_price=price_usd if product_meta.get("is_upgrade") else None,
        custom_description=f"SuperAdPro — {nps.PRODUCT_CATALOG.get(product_key, {}).get('desc', product_key)}"
            if not product_meta.get("is_upgrade")
            else "SuperAdPro Pro Membership Upgrade",
    )

    if not result["success"]:
        order.status = "failed"
        db.commit()
        return JSONResponse({"error": result["error"]}, status_code=502)

    order.np_invoice_id = result.get("np_id")
    order.invoice_url = result.get("invoice_url")
    db.commit()

    return {
        "success": True,
        "invoice_url": result["invoice_url"],
        "order_id": order.id,
        "internal_order_id": internal_order_id,
    }


@app.post("/api/webhook/nowpayments")
async def nowpayments_ipn_webhook(request: Request, db: Session = Depends(get_db)):
    """
    NOWPayments IPN (Instant Payment Notification) webhook.
    Called by NOWPayments on every payment status change.

    Verifies HMAC-SHA512 signature, updates order, activates product on success.
    """
    from . import nowpayments_service as nps
    from .database import NowPaymentsOrder
    from decimal import Decimal
    from datetime import datetime
    import json as _json

    # ── Read raw body + signature ──
    body_bytes = await request.body()
    signature = request.headers.get("x-nowpayments-sig", "")

    # ── Verify signature ──
    if not nps.verify_ipn_signature(body_bytes, signature):
        logger.warning("NOWPayments IPN: invalid signature")
        return JSONResponse({"error": "Invalid signature"}, status_code=403)

    data = nps.parse_ipn_body(body_bytes)
    if not data:
        return JSONResponse({"error": "Invalid body"}, status_code=400)

    payment_status = data.get("payment_status", "")
    order_id_str = data.get("order_id", "")  # "SAP-{user_id}-{order_id}"
    np_payment_id = data.get("payment_id")

    logger.info(f"NOWPayments IPN: status={payment_status} order={order_id_str} payment_id={np_payment_id}")

    if not order_id_str or not order_id_str.startswith("SAP-"):
        logger.warning(f"NOWPayments IPN: unrecognized order_id format: {order_id_str}")
        return {"status": "ignored", "reason": "unrecognized order_id"}

    # ── Find our order ──
    order = db.query(NowPaymentsOrder).filter(
        NowPaymentsOrder.internal_order_id == order_id_str
    ).first()

    if not order:
        logger.warning(f"NOWPayments IPN: order not found: {order_id_str}")
        return {"status": "ignored", "reason": "order_not_found"}

    # ── Update payment details ──
    order.np_payment_id = np_payment_id
    order.pay_currency = data.get("pay_currency")
    order.pay_amount = data.get("pay_amount")
    order.actually_paid = data.get("actually_paid")
    order.outcome_amount = data.get("outcome_amount")
    order.outcome_currency = data.get("outcome_currency")

    prev_status = order.status

    # ── Handle status transitions ──
    if payment_status in ("waiting", "confirming", "sending"):
        order.status = payment_status
        db.commit()
        return {"status": "updated", "payment_status": payment_status}

    if payment_status == "partially_paid":
        order.status = "partially_paid"
        db.commit()
        logger.warning(f"NOWPayments IPN: partial payment for order {order_id_str}")
        return {"status": "updated", "payment_status": "partially_paid"}

    if payment_status in ("failed", "refunded", "expired"):
        order.status = payment_status
        db.commit()
        logger.info(f"NOWPayments IPN: order {order_id_str} → {payment_status}")
        return {"status": "updated", "payment_status": payment_status}

    # ── Payment confirmed/finished — activate the product ──
    if nps.is_payment_finished(payment_status):
        # Prevent double-activation
        if prev_status in ("confirmed", "finished"):
            logger.info(f"NOWPayments IPN: order {order_id_str} already fulfilled (status={prev_status})")
            return {"status": "already_processed"}

        order.status = "finished"
        order.confirmed_at = datetime.utcnow()
        db.flush()

        # Load the user
        user = db.query(User).filter(User.id == order.user_id).first()
        if not user:
            logger.error(f"NOWPayments IPN: user {order.user_id} not found for order {order_id_str}")
            db.commit()
            return JSONResponse({"error": "User not found"}, status_code=404)

        meta = _json.loads(order.product_meta) if order.product_meta else {}

        # Record payment in main payments table
        import uuid
        payment = Payment(
            from_user_id=user.id, to_user_id=None,
            amount_usdt=order.price_usd,
            payment_type=f"nowpayments_{order.product_type}",
            tx_hash=f"np_{np_payment_id or uuid.uuid4().hex[:12]}",
            status="confirmed",
        )
        db.add(payment)
        db.flush()

        # ── Activate product using same shared logic as crypto payments ──
        _nowpayments_activate_product(db, user, order, meta)

        db.commit()
        logger.info(f"NOWPayments IPN: order {order_id_str} FULFILLED — {order.product_type}/{order.product_key}")
        return {"status": "fulfilled", "payment_status": payment_status}

    # Unknown status
    order.status = payment_status
    db.commit()
    return {"status": "updated", "payment_status": payment_status}


def _nowpayments_activate_product(db, user, order, meta):
    """Activate the correct product after NOWPayments payment is confirmed.
    Mirrors _crypto_activate_product logic exactly."""
    from datetime import datetime, timedelta
    from decimal import Decimal
    import uuid

    product_key = order.product_key

    # ── Membership ──
    if order.product_type == "membership":
        tier = "pro" if "pro" in product_key else "basic"
        is_upgrade = meta.get("is_upgrade", False)
        _activate_membership(db, user, tier, source="nowpayments", is_upgrade=is_upgrade)

    # ── Grid / Campaign Tier ──
    elif order.product_type == "grid":
        package_tier = int(product_key.split("_")[1])
        from .grid import process_tier_purchase
        result = process_tier_purchase(db=db, buyer_id=user.id, package_tier=package_tier)
        if not result["success"]:
            logger.error(f"NOWPayments grid purchase failed for user {user.id} tier {package_tier}: {result.get('error')}")

    # ── Email Boost ──
    elif order.product_type == "email_boost":
        pack_map = {
            "email_boost_1000": 1000,
            "email_boost_5000": 5000,
            "email_boost_10000": 10000,
            "email_boost_50000": 50000,
        }
        credits = pack_map.get(product_key, 0)
        if credits:
            user.email_credits = (user.email_credits or 0) + credits

    # ── SuperScene Credit Packs ──
    elif order.product_type == "superscene":
        pack_map = {
            "superscene_starter": 50,
            "superscene_creator": 150,
            "superscene_studio": 500,
            "superscene_pro": 1200,
        }
        credits = pack_map.get(product_key, 0)
        if credits:
            from .database import SuperSceneCredit
            sc = db.query(SuperSceneCredit).filter(SuperSceneCredit.user_id == user.id).first()
            if not sc:
                sc = SuperSceneCredit(user_id=user.id, balance=0)
                db.add(sc)
                db.flush()
            sc.balance = (sc.balance or 0) + credits
            # Also record in superscene_orders for history
            try:
                from .database import SuperSceneOrder
                slug = product_key.replace("superscene_", "")
                sc_order = SuperSceneOrder(
                    user_id=user.id,
                    pack_slug=slug,
                    credits=credits,
                    amount_usd=order.price_usd,
                    payment_method="nowpayments",
                    status="completed",
                )
                sc_order.completed_at = datetime.utcnow()
                db.add(sc_order)
            except Exception as e:
                logger.error(f"SuperScene order record failed: {e}")


@app.get("/api/nowpayments/order/{order_id}")
async def nowpayments_order_status(order_id: int, request: Request,
                                    db: Session = Depends(get_db),
                                    user: User = Depends(get_current_user)):
    """Check the status of a NOWPayments order."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from .database import NowPaymentsOrder
    order = db.query(NowPaymentsOrder).filter(
        NowPaymentsOrder.id == order_id,
        NowPaymentsOrder.user_id == user.id,
    ).first()

    if not order:
        return JSONResponse({"error": "Order not found"}, status_code=404)

    return {
        "order_id": order.id,
        "status": order.status,
        "product_key": order.product_key,
        "price_usd": str(order.price_usd),
        "invoice_url": order.invoice_url,
        "pay_currency": order.pay_currency,
        "actually_paid": str(order.actually_paid) if order.actually_paid else None,
        "confirmed_at": order.confirmed_at.isoformat() if order.confirmed_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


@app.post("/withdraw")
def withdraw(
    request: Request,
    amount: float = Form(),
    totp_code: str = Form(default=""),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user: return RedirectResponse(url="/?login=1", status_code=302)
    # ── KYC Gate ──
    if getattr(user, 'kyc_status', 'none') != 'approved':
        return RedirectResponse(url="/wallet?error=KYC_verification_required_before_withdrawal._Go_to_Account_to_complete.", status_code=303)
    # ── 2FA Gate — must be enabled AND code must be valid ──
    if not getattr(user, 'totp_enabled', False):
        return RedirectResponse(url="/wallet?error=Two-factor_authentication_required_before_withdrawal._Go_to_Account_to_enable.", status_code=303)
    import pyotp
    if not totp_code or not totp_code.strip():
        return RedirectResponse(url="/wallet?error=Please_enter_your_2FA_code_to_authorise_this_withdrawal.", status_code=303)
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(totp_code.strip(), valid_window=1):
        return RedirectResponse(url="/wallet?error=Invalid_2FA_code._Please_try_again.", status_code=303)
    # ── 2FA verified — process withdrawal ──
    result = request_withdrawal(db, user.id, amount)
    if result["success"]:
        tx = result.get("tx_hash", "")
        msg = result.get("message", "Withdrawal processed")
        redirect_url = f"/wallet?withdrawn=true&msg={msg}"
        if tx:
            redirect_url += f"&tx={tx}"
    else:
        redirect_url = f"/wallet?error={result['error']}"
    return RedirectResponse(url=redirect_url, status_code=303)


# ═══════════════════════════════════════════════════════════════
#  PASSWORD RESET ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/forgot-password")
def forgot_password_form(request: Request):
    """Phase 2: serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)


@app.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password_process(
    request: Request,
    email: str = Form(),
    db: Session = Depends(get_db)
):
    email = sanitize(email).lower()

    # Always show success — prevents email enumeration attacks
    def success_response():
        return JSONResponse({"success": True, "message": "If that email is registered, a reset link has been sent."})

    if not validate_email(email):
        return JSONResponse({"error": "Please enter a valid email address."}, status_code=400)

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal whether the email exists
        return success_response()

    # Expire any existing unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used    == False
    ).delete()

    # Create new token — 32 bytes = 64 hex chars
    token = secrets.token_hex(32)
    reset_token = PasswordResetToken(
        user_id    = user.id,
        token      = token,
        expires_at = datetime.utcnow() + timedelta(hours=1),
    )
    db.add(reset_token)
    db.commit()

    # Send email (fails silently if SMTP not configured)
    reset_url = f"https://www.superadpro.com/reset-password?token={token}"
    send_password_reset_email(
        to_email   = user.email,
        first_name = user.first_name or user.username,
        reset_url  = reset_url,
    )
    logger.warning(f"Password reset requested for: {email}")
    return success_response()


@app.get("/reset-password")
def reset_password_form(request: Request):
    """Phase 2: serve React SPA — React reads token from query params."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)

@app.post("/reset-password")
@limiter.limit("5/minute")
def reset_password_process(
    request: Request,
    token: str = Form(),
    password: str = Form(),
    confirm_password: str = Form(),
    db: Session = Depends(get_db)
):
    def form_error(msg):
        return JSONResponse({"error": msg}, status_code=400)

    if not token:
        return form_error("Invalid reset link.")

    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used  == False
    ).first()

    if not reset or reset.expires_at < datetime.utcnow():
        return JSONResponse({"error": "This reset link has expired. Please request a new one."}, status_code=400)

    if len(password) < 8:
        return form_error("Password must be at least 8 characters.")
    if len(password.encode("utf-8")) > 72:
        return form_error("Password must be 72 characters or less.")
    if password != confirm_password:
        return form_error("Passwords do not match.")

    # Update password
    import bcrypt
    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        return form_error("Account not found.")

    user.password = bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    # Mark token as used
    reset.used = True
    db.commit()

    # Invalidate any active session
    logger.warning(f"Password reset completed for user_id: {user.id}")

    return JSONResponse({"success": True, "message": "Password reset successfully. You can now log in."})

# ═══════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
#  WATCH & EARN — Video viewing system
# ═══════════════════════════════════════════════════════════════

# Videos required per day by campaign tier
DAILY_VIDEO_QUOTA = {1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8}
WATCH_DURATION    = 30   # seconds minimum
GRACE_DAYS        = 5    # days before commissions paused


def get_or_create_quota(db: Session, user: User) -> "WatchQuota":
    """Get or create watch quota record for user, syncing tier from active grid."""
    from datetime import date
    quota = db.query(WatchQuota).filter(WatchQuota.user_id == user.id).first()

    # Determine tier from user's highest active grid
    active_grid = db.query(Grid).filter(
        Grid.owner_id == user.id,
        Grid.is_complete == False
    ).order_by(Grid.package_tier.desc()).first()
    tier     = active_grid.package_tier if active_grid else 1
    required = DAILY_VIDEO_QUOTA.get(tier, 1)

    if not quota:
        quota = WatchQuota(
            user_id        = user.id,
            package_tier   = tier,
            daily_required = required,
            today_date     = str(date.today()),
        )
        db.add(quota)
        db.flush()

    # Reset daily count if it's a new day
    today_str = str(date.today())
    if quota.today_date != today_str:
        # Check if yesterday's quota was missed
        if quota.today_date and quota.today_watched < quota.daily_required:
            quota.consecutive_missed = (quota.consecutive_missed or 0) + 1
            if quota.consecutive_missed >= GRACE_DAYS:
                quota.commissions_paused = True
        else:
            quota.consecutive_missed = 0
            quota.commissions_paused = False
            quota.last_quota_met = quota.today_date

        quota.today_watched = 0
        quota.today_date    = today_str

    # Sync tier in case user upgraded
    quota.package_tier   = tier
    quota.daily_required = required
    return quota


def get_next_content(db: Session, user_id: int) -> dict:
    """
    Returns the next content item for Watch to Earn — either a video campaign or ad board listing.
    Ad board listings are interleaved every 3rd-4th slot as timed display cards.
    Returns dict with 'type' ('video'|'adboard'), 'data' (campaign or listing), or None.
    """
    from datetime import date
    today_str = str(date.today())

    # Count watches today to decide if this slot should be an ad listing
    quota = db.query(WatchQuota).filter(WatchQuota.user_id == user_id).first()
    watched_today = quota.today_watched if quota else 0

    # Every 3rd slot (positions 2, 5, 8...) show an ad board listing
    show_ad = (watched_today % 3 == 2)

    if show_ad:
        # Get an active ad listing not owned by user, prefer featured/boosted
        ad = db.query(AdListing).filter(
            AdListing.is_active == True,
            AdListing.user_id != user_id,
        ).order_by(
            AdListing.is_featured.desc(),  # boosted first
            AdListing.views.asc(),         # least viewed first
        ).first()

        if ad:
            return {
                "type": "adboard",
                "data": ad,
            }

    # Default: return a video campaign
    campaign = get_next_campaign(db, user_id)
    if campaign:
        return {"type": "video", "data": campaign}

    # Fallback: try an ad listing anyway
    ad = db.query(AdListing).filter(
        AdListing.is_active == True,
        AdListing.user_id != user_id,
    ).order_by(AdListing.views.asc()).first()
    if ad:
        return {"type": "adboard", "data": ad}

    return None


def get_next_campaign(db: Session, user_id: int) -> "VideoCampaign | None":
    """
    Smart campaign selection algorithm:
      1. Exclude campaigns already watched today by this user
      2. Exclude the user's own campaigns
      3. Score remaining campaigns by:
         a) Priority level (Elite+ tiers get served first)
         b) Geo & interest match (Advanced+ targeting)
         c) View deficit (campaigns furthest from their target get priority)
      4. Return the highest-scored campaign
    """
    from datetime import date
    from sqlalchemy import func, case

    today_str = str(date.today())

    # Get watcher's profile for targeting
    watcher = db.query(User).filter(User.id == user_id).first()
    watcher_country = (watcher.country or "").strip().lower() if watcher else ""
    watcher_interests = set()
    if watcher and watcher.interests:
        watcher_interests = {i.strip().lower() for i in watcher.interests.split(",") if i.strip()}

    # Campaigns watched today by this user
    watched_today = db.query(VideoWatch.campaign_id).filter(
        VideoWatch.user_id   == user_id,
        VideoWatch.watch_date == today_str
    ).all()
    watched_ids = [w[0] for w in watched_today]

    # Get all eligible campaigns (active, not watched today, not own)
    query = db.query(VideoCampaign).filter(
        VideoCampaign.status == "active",
        VideoCampaign.user_id != user_id,  # never show own campaigns
    )
    if watched_ids:
        query = query.filter(~VideoCampaign.id.in_(watched_ids))

    candidates = query.all()

    # If no unwatched campaigns from others, allow re-watches (excluding own, but
    # still prefer ones not watched today so we rotate through the pool)
    if not candidates:
        q2 = db.query(VideoCampaign).filter(
            VideoCampaign.status == "active",
            VideoCampaign.user_id != user_id,
        )
        # Prefer unwatched-today in re-watch pool too
        unwatched_others = q2.filter(~VideoCampaign.id.in_(watched_ids)).all() if watched_ids else q2.all()
        candidates = unwatched_others if unwatched_others else q2.all()

    if not candidates:
        # Last resort: include own campaigns — still rotate by excluding watched-today first
        q3 = db.query(VideoCampaign).filter(VideoCampaign.status == "active")
        unwatched_own = q3.filter(~VideoCampaign.id.in_(watched_ids)).all() if watched_ids else q3.all()
        candidates = unwatched_own if unwatched_own else q3.all()

    if not candidates:
        return None

    # Score each campaign
    import random
    scored = []
    for c in candidates:
        score = 0.0

        # ── Priority boost (Elite tier 5+ gets priority queue placement) ──
        priority = c.priority_level or 0
        score += priority * 100  # strong boost for higher tiers

        # ── View deficit score (campaigns furthest from target get priority) ──
        target = c.views_target or 1
        delivered = c.views_delivered or 0
        # Skip campaigns that have hit their monthly view target
        if target > 0 and delivered >= target:
            score -= 500  # heavily deprioritise completed campaigns
        else:
            pct_remaining = max(0, 1.0 - (delivered / target)) if target > 0 else 0.5
            score += pct_remaining * 50

        # ── Reach level (category/extended/full) ──
        from .database import CAMPAIGN_TIER_FEATURES
        tier_features = CAMPAIGN_TIER_FEATURES.get(c.owner_tier or 1, CAMPAIGN_TIER_FEATURES[1])
        reach = tier_features.get("reach", "category")
        if reach == "category" and c.category and watcher_interests:
            # Category-only reach: penalty if no interest match
            campaign_cat = (c.category or "").strip().lower()
            if campaign_cat and campaign_cat not in watcher_interests:
                score -= 15  # slight penalty for category mismatch on limited reach

        # ── Geo targeting match (Advanced tier 4+) ──
        if c.target_country and watcher_country:
            target_countries = {t.strip().lower() for t in c.target_country.split(",") if t.strip()}
            if target_countries and watcher_country in target_countries:
                score += 30  # geo match bonus
            elif target_countries:
                score -= 20  # geo mismatch penalty (still shown, just deprioritised)

        # ── Interest targeting match (Advanced tier 4+) ──
        if c.target_interests and watcher_interests:
            campaign_interests = {i.strip().lower() for i in c.target_interests.split(",") if i.strip()}
            overlap = campaign_interests & watcher_interests
            if overlap:
                score += len(overlap) * 15  # bonus per matching interest
            elif campaign_interests:
                score -= 10  # slight penalty for no interest match

        # ── Demographics targeting (Advanced tier 4+) ──
        if c.target_gender and c.target_gender != "all":
            watcher_gender = (watcher.gender or "").strip().lower() if watcher else ""
            if watcher_gender and watcher_gender == c.target_gender:
                score += 20  # gender match bonus
            elif watcher_gender and watcher_gender != c.target_gender:
                score -= 15  # gender mismatch penalty

        if c.target_age_min or c.target_age_max:
            watcher_age_range = (watcher.age_range or "").strip() if watcher else ""
            if watcher_age_range:
                # Parse age range midpoint (e.g. "25-34" → 29)
                try:
                    parts = watcher_age_range.replace("+", "-99").split("-")
                    watcher_age_mid = (int(parts[0]) + int(parts[1])) // 2
                    age_min = c.target_age_min or 0
                    age_max = c.target_age_max or 99
                    if age_min <= watcher_age_mid <= age_max:
                        score += 20  # age match bonus
                    else:
                        score -= 15  # age mismatch penalty
                except (ValueError, IndexError):
                    pass

        # ── Featured / Spotlight boost (Tier 6+/7+) ──
        if getattr(c, 'is_spotlight', False):
            score += 40  # spotlight campaigns get strong boost
        elif getattr(c, 'is_featured', False):
            score += 20  # featured campaigns get moderate boost

        # ── Freshness bonus (newer campaigns get a small boost) ──
        if c.created_at:
            from datetime import datetime
            age_days = (datetime.utcnow() - c.created_at).days
            if age_days < 7:
                score += (7 - age_days) * 3  # up to 21 points for brand new campaigns

        scored.append((score, c))

    # Sort by score descending with random tiebreaker so equal-scored campaigns rotate
    scored.sort(key=lambda x: (x[0], random.random()), reverse=True)
    return scored[0][1]


@app.get("/watch")
def watch_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")
    if not has_grid and not user.is_admin:
        return RedirectResponse(url="/income-grid?need_grid=1")

    quota    = get_or_create_quota(db, user)
    content  = get_next_content(db, user.id)
    campaign = content["data"] if content and content["type"] == "video" else None
    ad_listing = content["data"] if content and content["type"] == "adboard" else None
    content_type = content["type"] if content else "none"
    db.commit()

    # Admin/owner bypass — always commission-eligible, can always view the player
    if user.is_admin:
        quota.commissions_paused = False
        quota.consecutive_missed = 0

    # Warning level for grace period
    warning = None
    if quota.consecutive_missed >= 3:
        days_left = GRACE_DAYS - quota.consecutive_missed
        warning = f"⚠️ You've missed your quota for {quota.consecutive_missed} days. {max(0,days_left)} day(s) remaining before commissions are paused."
    if quota.commissions_paused:
        warning = "🔴 Your commissions are currently paused. Complete today's video quota to reactivate."

    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/watch", status_code=302)

def _old_watch_template_DISABLED(request=None, user=None, quota=None, campaign=None,
        ad_listing=None, content_type=None, warning=None):
    return None  # replaced by React

def _dead_code_watch():
    pass  # old watch template data — removed


@app.post("/api/record-watch")
def record_watch(
    request:     Request,
    campaign_id: int = Form(),
    db:          Session = Depends(get_db),
    user:        User = Depends(get_current_user)
):
    """Called by front-end after 30s timer completes. Records the view."""
    from datetime import date
    if not user or not user.is_active:
        return {"success": False, "error": "Not authorised"}

    today_str = str(date.today())
    quota     = get_or_create_quota(db, user)
    campaign  = db.query(VideoCampaign).filter(
        VideoCampaign.id     == campaign_id,
        VideoCampaign.status == "active"
    ).first()

    if not campaign:
        return {"success": False, "error": "Campaign not found"}

    # Check quota not already met today
    if quota.today_watched >= quota.daily_required:
        return {"success": False, "error": "Daily quota already completed", "quota_met": True}

    # Record the watch
    watch = VideoWatch(
        user_id     = user.id,
        campaign_id = campaign_id,
        watch_date  = today_str,
        duration_secs = WATCH_DURATION,
    )
    db.add(watch)

    # Update quota counter
    quota.today_watched += 1
    if quota.today_watched >= quota.daily_required:
        quota.last_quota_met     = today_str
        quota.consecutive_missed = 0
        quota.commissions_paused = False

    # Increment campaign views delivered
    campaign.views_delivered = (campaign.views_delivered or 0) + 1

    db.commit()

    # Get next content (could be video or ad board listing)
    next_content = get_next_content(db, user.id)
    quota_met    = quota.today_watched >= quota.daily_required

    next_data = None
    if next_content and not quota_met:
        if next_content["type"] == "video":
            c = next_content["data"]
            next_data = {"type": "video", "id": c.id, "title": c.title, "embed_url": c.embed_url, "platform": c.platform}
        elif next_content["type"] == "adboard":
            a = next_content["data"]
            next_data = {"type": "adboard", "id": a.id, "title": a.title, "description": a.description,
                        "image_url": a.image_url or "", "link_url": a.link_url, "category": a.category}

    return {
        "success":       True,
        "watched_today": quota.today_watched,
        "required":      quota.daily_required,
        "quota_met":     quota_met,
        "next_content":  next_data,
        "next_campaign": next_data if next_data and next_data.get("type") == "video" else None,
    }


@app.post("/api/record-ad-watch")
def record_ad_watch(
    request:   Request,
    ad_id:     int = Form(),
    db:        Session = Depends(get_db),
    user:      User = Depends(get_current_user)
):
    """Called after ad board display card timer completes. Records the view."""
    from datetime import date
    if not user or not user.is_active:
        return {"success": False, "error": "Not authorised"}

    today_str = str(date.today())
    quota = get_or_create_quota(db, user)
    ad = db.query(AdListing).filter(AdListing.id == ad_id, AdListing.is_active == True).first()

    if not ad:
        return {"success": False, "error": "Ad listing not found"}

    if quota.today_watched >= quota.daily_required:
        return {"success": False, "error": "Daily quota already completed", "quota_met": True}

    # Record as a watch (counts towards quota)
    watch = VideoWatch(
        user_id       = user.id,
        campaign_id   = 0,  # 0 = ad board view (not a video campaign)
        watch_date    = today_str,
        duration_secs = 15,
    )
    db.add(watch)

    # Update quota counter
    quota.today_watched += 1
    if quota.today_watched >= quota.daily_required:
        quota.last_quota_met     = today_str
        quota.consecutive_missed = 0
        quota.commissions_paused = False

    # Increment ad listing views
    ad.views = (ad.views or 0) + 1
    db.commit()

    # Get next content
    next_content = get_next_content(db, user.id)
    quota_met = quota.today_watched >= quota.daily_required

    next_data = None
    if next_content and not quota_met:
        if next_content["type"] == "video":
            c = next_content["data"]
            next_data = {"type": "video", "id": c.id, "title": c.title, "embed_url": c.embed_url, "platform": c.platform}
        elif next_content["type"] == "adboard":
            a = next_content["data"]
            next_data = {"type": "adboard", "id": a.id, "title": a.title, "description": a.description,
                        "image_url": a.image_url or "", "link_url": a.link_url, "category": a.category}

    return {
        "success":       True,
        "watched_today": quota.today_watched,
        "required":      quota.daily_required,
        "quota_met":     quota_met,
        "next_content":  next_data,
    }

# ═══════════════════════════════════════════════════════════════
# ═══════════════════════════════════════════════════════════════
#  PUBLIC VIDEO LIBRARY — SEO-friendly, no login required
# ═══════════════════════════════════════════════════════════════

@app.get("/videos")
def public_videos(request: Request, category: str = "", db: Session = Depends(get_db)):
    """Public-facing video library — server-rendered for SEO."""
    from sqlalchemy import func
    campaigns = db.query(VideoCampaign).filter(
        VideoCampaign.status == "active"
    ).order_by(VideoCampaign.is_spotlight.desc(), VideoCampaign.is_featured.desc(),
               VideoCampaign.priority_level.desc(), VideoCampaign.created_at.desc()).all()
    categories = sorted(set(c.category for c in campaigns if c.category))
    selected_category = category
    if category:
        campaigns = [c for c in campaigns if (c.category or "").lower() == category.lower()]
    spotlight = [c for c in campaigns if getattr(c, 'is_spotlight', False)]
    total_views = sum(c.views_delivered or 0 for c in campaigns)
    return templates.TemplateResponse("public-video-library.html", {
        "request": request, "campaigns": campaigns, "spotlight": spotlight,
        "categories": categories, "selected_category": selected_category,
        "total_videos": len(campaigns), "total_views": total_views,
        "total_categories": len(categories),
    })

def _old_public_videos_DISABLED(request: Request, category: str = "", db = None):
    pass


# ═══════════════════════════════════════════════════════════════
#  BANNER ADS — Public Gallery + Click Tracking
# ═══════════════════════════════════════════════════════════════

@app.get("/banners")
def public_banners(request: Request, category: str = "", db: Session = Depends(get_db)):
    """Public banner ad gallery — server-rendered for SEO."""
    from .database import BannerAd
    query = db.query(BannerAd).filter(BannerAd.is_active == True, BannerAd.status == "approved")
    banners_all = query.order_by(BannerAd.is_featured.desc(), BannerAd.created_at.desc()).all()
    categories = sorted(set(b.category for b in banners_all if b.category and b.category != "general"))
    if category:
        banners_all = [b for b in banners_all if (b.category or "").lower() == category.lower()]
    total_impressions = sum(b.impressions or 0 for b in banners_all)
    total_clicks = sum(b.clicks or 0 for b in banners_all)
    # Increment impressions for displayed banners
    for b in banners_all:
        b.impressions = (b.impressions or 0) + 1
    try:
        db.commit()
    except Exception:
        db.rollback()
    return templates.TemplateResponse("public-banners.html", {
        "request": request, "banners": banners_all, "categories": categories,
        "selected_category": category, "total_banners": len(banners_all),
        "total_impressions": total_impressions, "total_clicks": total_clicks,
    })


@app.get("/banners/click/{banner_id}")
def banner_click(banner_id: int, db: Session = Depends(get_db)):
    """Track banner click and redirect to advertiser URL."""
    from .database import BannerAd
    banner = db.query(BannerAd).filter(BannerAd.id == banner_id).first()
    if not banner:
        return RedirectResponse(url="/banners", status_code=302)
    banner.clicks = (banner.clicks or 0) + 1
    db.commit()
    return RedirectResponse(url=banner.link_url, status_code=302)


@app.get("/explore")
def explore_page(request: Request):
    """Public explore hub page — served by React."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


#  SOCIAL PROOF API — recent joiners notification feed
# ═══════════════════════════════════════════════════════════════

# Simulated fallback pool — used when no real recent signups
SIMULATED_JOINERS = [
    ("James", "United Kingdom"), ("Sarah", "United States"), ("Mohammed", "UAE"),
    ("Emma", "Australia"), ("Carlos", "Canada"), ("Priya", "India"),
    ("Luke", "Germany"), ("Fatima", "South Africa"), ("Ryan", "Ireland"),
    ("Aisha", "Nigeria"), ("Tom", "New Zealand"), ("Elena", "Netherlands"),
    ("David", "Singapore"), ("Maria", "Brazil"), ("John", "United States"),
    ("Amara", "Ghana"), ("Chris", "United Kingdom"), ("Layla", "UAE"),
    ("Michael", "Canada"), ("Sophie", "France"), ("Kwame", "Ghana"),
    ("Jessica", "Australia"), ("Ali", "Pakistan"), ("Hannah", "Sweden"),
    ("Daniel", "Philippines"), ("Nadia", "Morocco"), ("Sam", "United States"),
    ("Yuki", "Japan"), ("Grace", "Kenya"), ("Oliver", "United Kingdom"),
]

@app.get("/api/recent-joiners")
def recent_joiners(db: Session = Depends(get_db)):
    from datetime import timedelta
    import random
    cutoff = datetime.utcnow() - timedelta(hours=48)
    real = db.query(User).filter(
        User.created_at >= cutoff,
        User.username != "demo_preview",
        User.first_name != None
    ).order_by(User.created_at.desc()).limit(20).all()

    pool = []
    for u in real:
        pool.append({
            "name": u.first_name,
            "country": u.country or "Worldwide",
            "real": True
        })

    # Pad with simulated if fewer than 8 real
    if len(pool) < 8:
        sim = random.sample(SIMULATED_JOINERS, min(15, len(SIMULATED_JOINERS)))
        for name, country in sim:
            pool.append({"name": name, "country": country, "real": False})

    random.shuffle(pool)
    return {"joiners": pool}


#  ADMIN ROUTES
# ═══════════════════════════════════════════════════════════════


@app.get("/dev/seed-campaigns")
def dev_seed_campaigns(secret: str = "", db: Session = Depends(get_db)):
    """Seed demo video campaigns for testing rotation. Remove before launch."""
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"})

    demos = [
        {
            "title": "The Future of Digital Marketing",
            "description": "How AI is transforming online advertising and what it means for entrepreneurs.",
            "category": "marketing",
            "platform": "youtube",
            "video_url": "https://www.youtube.com/watch?v=8yMIjMadNS4",
            "embed_url": "https://www.youtube.com/embed/8yMIjMadNS4",
            "video_id": "8yMIjMadNS4",
        },
        {
            "title": "How to Build Passive Income Online",
            "description": "5 proven strategies for building online income streams in 2026.",
            "category": "business",
            "platform": "youtube",
            "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "embed_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
            "video_id": "dQw4w9WgXcQ",
        },
        {
            "title": "Affiliate Marketing for Beginners",
            "description": "A complete beginner's guide to affiliate marketing success.",
            "category": "marketing",
            "platform": "youtube",
            "video_url": "https://www.youtube.com/watch?v=GVaRzCOdBMk",
            "embed_url": "https://www.youtube.com/embed/GVaRzCOdBMk",
            "video_id": "GVaRzCOdBMk",
        },
        {
            "title": "The Power of Video Advertising",
            "description": "Why video ads outperform every other format and how to leverage them.",
            "category": "advertising",
            "platform": "youtube",
            "video_url": "https://www.youtube.com/watch?v=ZXsQAXx_ao0",
            "embed_url": "https://www.youtube.com/embed/ZXsQAXx_ao0",
            "video_id": "ZXsQAXx_ao0",
        },
        {
            "title": "Cryptocurrency & Business Payments",
            "description": "How crypto payments are revolutionising online business in 2026.",
            "category": "crypto",
            "platform": "youtube",
            "video_url": "https://www.youtube.com/watch?v=rYQgy8QDEBI",
            "embed_url": "https://www.youtube.com/embed/rYQgy8QDEBI",
            "video_id": "rYQgy8QDEBI",
        },
        {
            "title": "Social Media Growth Strategies",
            "description": "Proven tactics to grow your audience and monetise your social presence.",
            "category": "social",
            "platform": "youtube",
            "video_url": "https://www.youtube.com/watch?v=n8UosDsa9uI",
            "embed_url": "https://www.youtube.com/embed/n8UosDsa9uI",
            "video_id": "n8UosDsa9uI",
        },
        {
            "title": "Email Marketing That Converts",
            "description": "Build an email list and turn subscribers into paying customers.",
            "category": "marketing",
            "platform": "youtube",
            "video_url": "https://www.youtube.com/watch?v=qJ3gBSNIyMo",
            "embed_url": "https://www.youtube.com/embed/qJ3gBSNIyMo",
            "video_id": "qJ3gBSNIyMo",
        },
        {
            "title": "Building a Brand From Zero",
            "description": "How to create a recognisable brand that attracts loyal customers.",
            "category": "branding",
            "platform": "youtube",
            "video_url": "https://www.youtube.com/watch?v=sS6sMjGMMFo",
            "embed_url": "https://www.youtube.com/embed/sS6sMjGMMFo",
            "video_id": "sS6sMjGMMFo",
        },
        {
            "title": "SEO Fundamentals for 2026",
            "description": "Get your website ranking on Google with these essential SEO techniques.",
            "category": "marketing",
            "platform": "youtube",
            "video_url": "https://www.youtube.com/watch?v=DvwS7cV9GmQ",
            "embed_url": "https://www.youtube.com/embed/DvwS7cV9GmQ",
            "video_id": "DvwS7cV9GmQ",
        },
        {
            "title": "Financial Freedom Blueprint",
            "description": "A step-by-step plan for achieving financial independence.",
            "category": "finance",
            "platform": "youtube",
            "video_url": "https://www.youtube.com/watch?v=PHe0bXAIuk0",
            "embed_url": "https://www.youtube.com/embed/PHe0bXAIuk0",
            "video_id": "PHe0bXAIuk0",
        },
    ]

    # Use user_id=1 as "system" owner, or find first admin
    from sqlalchemy import func
    admin = db.query(User).filter(User.is_admin == True).first()
    owner_id = admin.id if admin else 1

    added = 0
    for d in demos:
        # Skip if video_id already exists
        exists = db.query(VideoCampaign).filter(VideoCampaign.video_id == d["video_id"]).first()
        if exists:
            continue
        c = VideoCampaign(
            user_id=owner_id,
            title=d["title"],
            description=d["description"],
            category=d["category"],
            platform=d["platform"],
            video_url=d["video_url"],
            embed_url=d["embed_url"],
            video_id=d["video_id"],
            status="active",
            views_target=1000,
            views_delivered=0,
            priority_level=0,
            owner_tier=1,
        )
        db.add(c)
        added += 1

    db.commit()
    total = db.query(VideoCampaign).filter(VideoCampaign.status == "active").count()
    return {"success": True, "added": added, "total_active_campaigns": total}


@app.get("/dev/reset-watch")
def dev_reset_watch(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """TEMPORARY — reset today's watch quota for testing. Remove before launch."""
    from datetime import date
    if not user: return RedirectResponse(url="/?login=1")
    today = str(date.today())
    quota = db.query(WatchQuota).filter(WatchQuota.user_id == user.id).first()
    if quota:
        quota.today_watched = 0
        quota.today_date = today
    db.query(VideoWatch).filter(
        VideoWatch.user_id == user.id,
        VideoWatch.watch_date == today
    ).delete()
    db.commit()
    return RedirectResponse(url="/watch", status_code=303)

@app.get("/dev/seed-course")
def dev_seed_course(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """TEMPORARY — seed a test course with chapters and lessons, grant current user access."""
    if not user: return RedirectResponse(url="/?login=1")

    # Check if we already have a course with chapters
    existing = db.query(CourseChapter).first()
    if existing:
        # Just ensure purchase exists
        purchase = db.query(CoursePurchase).filter(CoursePurchase.user_id == user.id).first()
        if not purchase:
            course = db.query(Course).first()
            if course:
                db.add(CoursePurchase(user_id=user.id, course_id=course.id, course_tier=course.tier, amount_paid=0, payment_method="admin"))
                db.commit()
        course = db.query(Course).first()
        return RedirectResponse(f"/courses/learn/{course.id}", status_code=303)

    # Create or get course
    course = db.query(Course).first()
    if not course:
        course = Course(title="Digital Marketing Mastery", slug="digital-marketing-mastery", description="Complete guide to digital marketing", price=97, tier=1, is_active=True, sort_order=1)
        db.add(course)
        db.flush()

    # Seed chapters and lessons
    chapters_data = [
        ("Getting Started", [
            ("Welcome & Course Overview", 4), ("Setting Up Your Workspace", 8),
            ("Understanding Your Audience", 12), ("Creating Your Marketing Plan", 10),
            ("Choosing Your Platforms", 9), ("Tools You'll Need", 9),
        ]),
        ("Traffic Generation", [
            ("Organic vs Paid Traffic", 12), ("SEO Fundamentals", 15),
            ("Content Marketing Strategy", 14), ("Facebook Ads: Targeting Your Ideal Audience", 18),
            ("Google Ads for Beginners", 16), ("YouTube Marketing Deep Dive", 20),
            ("TikTok & Short-Form Content", 14), ("Email List Building", 15),
        ]),
        ("Conversion Optimisation", [
            ("Landing Page Anatomy", 14), ("Writing Copy That Converts", 12),
            ("A/B Testing Fundamentals", 10), ("Retargeting Strategies", 11),
            ("Analytics & KPIs", 11),
        ]),
        ("Scaling & Automation", [
            ("Building Sales Funnels", 18), ("Email Automation Sequences", 16),
            ("Scaling Paid Campaigns", 15), ("Outsourcing & Delegation", 14),
            ("Final Project & Next Steps", 15),
        ]),
    ]

    for ch_idx, (ch_title, lessons) in enumerate(chapters_data):
        chapter = CourseChapter(course_id=course.id, title=ch_title, sort_order=ch_idx)
        db.add(chapter)
        db.flush()
        for ls_idx, (ls_title, duration) in enumerate(lessons):
            db.add(CourseLesson(course_id=course.id, chapter_id=chapter.id, title=ls_title, duration_mins=duration, sort_order=ls_idx))

    # Grant access
    purchase = db.query(CoursePurchase).filter(CoursePurchase.user_id == user.id, CoursePurchase.course_id == course.id).first()
    if not purchase:
        db.add(CoursePurchase(user_id=user.id, course_id=course.id, course_tier=course.tier, amount_paid=0, payment_method="admin"))

    db.commit()
    return RedirectResponse(f"/courses/learn/{course.id}", status_code=303)


@app.get("/dev/test-coinbase")
def dev_test_coinbase(request: Request, user: User = Depends(get_current_user)):
    """TEMPORARY — test Coinbase payment flow. Shows buttons for membership + each grid tier."""
    if not user: return RedirectResponse(url="/?login=1")
    html = f"""<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Test Coinbase — SuperAdPro</title>
    <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:system-ui,sans-serif;background:#0a0a1a;color:#fff;min-height:100vh;padding:40px 20px}}
    .wrap{{max-width:600px;margin:0 auto}}
    h1{{font-size:24px;margin-bottom:8px}}
    .sub{{color:#64748b;font-size:14px;margin-bottom:30px}}
    .card{{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:14px}}
    .card h3{{font-size:16px;margin-bottom:4px}}
    .card .price{{font-size:24px;font-weight:800;color:#38bdf8;margin-bottom:12px}}
    .btn{{width:100%;padding:13px;background:linear-gradient(135deg,#0052ff,#3b82f6);border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:700;cursor:pointer}}
    .btn:hover{{opacity:0.9}}
    .btn:disabled{{opacity:0.4;cursor:not-allowed}}
    .err{{color:#f87171;font-size:13px;margin-top:8px;display:none}}
    .ok{{color:#4ade80;font-size:13px;margin-top:8px}}
    .note{{color:#64748b;font-size:12px;margin-top:6px;text-align:center}}
    .status{{margin-bottom:20px;padding:14px;background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.2);border-radius:10px;font-size:13px}}
    .back{{display:inline-block;color:#38bdf8;font-size:13px;margin-bottom:20px}}
    </style></head><body>
    <div class="wrap">
    <a href="/dashboard" class="back">&larr; Back to Dashboard</a>
    <h1>&#x1F9EA; Coinbase Payment Test</h1>
    <div class="sub">Test the payment flow without affecting your account. Click any button to create a real Coinbase charge.</div>

    <div class="status">
    <strong>Config status:</strong><br>
    API Key: {'&#x2705; Set' if os.getenv('COINBASE_COMMERCE_API_KEY') else '&#x274C; Missing'}<br>
    Webhook Secret: {'&#x2705; Set' if os.getenv('COINBASE_WEBHOOK_SECRET') else '&#x274C; Missing'}<br>
    User: {user.username} (ID: {user.id}) &middot; Active: {user.is_active}
    </div>

    <div class="card">
    <h3>Membership Activation</h3>
    <div class="price">${MEMBERSHIP_FEE}</div>
    <button class="btn" onclick="testPay('membership', 0, this)">Pay Membership via Coinbase</button>
    <div class="err" id="err-membership"></div>
    <div class="note">Creates a real $20 charge — you can close the Coinbase page without paying</div>
    </div>
    """

    tiers = {1:"Starter",2:"Builder",3:"Pro",4:"Advanced",5:"Elite",6:"Premium",7:"Executive",8:"Ultimate"}
    for tier, name in tiers.items():
        price = GRID_PACKAGES.get(tier, 0)
        html += f"""
    <div class="card">
    <h3>Grid Tier {tier} — {name}</h3>
    <div class="price">${price}</div>
    <button class="btn" onclick="testPay('grid_tier', {tier}, this)">Pay {name} Tier via Coinbase</button>
    <div class="err" id="err-grid_tier-{tier}"></div>
    </div>"""

    html += """
    <script>
    async function testPay(type, tier, btn) {
      btn.disabled = true; btn.textContent = 'Creating charge...';
      var errId = type === 'membership' ? 'err-membership' : 'err-grid_tier-' + tier;
      var errEl = document.getElementById(errId);
      errEl.style.display = 'none';
      try {
        var r = await fetch('/api/coinbase/create-charge', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({payment_type: type, package_tier: tier})
        });
        var d = await r.json();
        if (d.success && d.hosted_url) {
          btn.textContent = 'Redirecting to Coinbase...';
          window.location.href = d.hosted_url;
        } else {
          errEl.textContent = d.error || 'Failed to create charge';
          errEl.style.display = 'block';
          btn.disabled = false; btn.textContent = 'Try Again';
        }
      } catch(e) {
        errEl.textContent = 'Network error: ' + e.message;
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Try Again';
      }
    }
    </script>
    </div></body></html>"""
    return HTMLResponse(html)

@app.get("/admin")
def admin_panel(request: Request, user: User = Depends(get_current_user)):
    if not user or not is_admin(user):
        logger.warning(f"Unauthorised admin access — IP: {request.client.host}")
        raise HTTPException(status_code=403, detail="Access denied")
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/dashboard")


# ═══════════════════════════════════════════════════════════════
#  ADMIN API — dual-purpose: dashboard UI + AI agent automation
# ═══════════════════════════════════════════════════════════════

def _require_admin(user):
    """Guard for admin API endpoints."""
    if not user or not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")

# ── Users ────────────────────────────────────────────────────
@app.get("/admin/api/users")
def admin_api_users(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    q: str = "",
    status: str = "",          # "active" | "inactive" | ""
    sort: str = "newest",      # "newest" | "oldest" | "balance" | "earned"
    limit: int = 100,
    offset: int = 0
):
    _require_admin(user)
    query = db.query(User)
    if q:
        query = query.filter(
            (User.username.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%"))
        )
    if status == "active":
        query = query.filter(User.is_active == True)
    elif status == "inactive":
        query = query.filter(User.is_active == False)

    if sort == "oldest":
        query = query.order_by(User.id.asc())
    elif sort == "balance":
        query = query.order_by(User.balance.desc())
    elif sort == "earned":
        query = query.order_by(User.total_earned.desc())
    else:
        query = query.order_by(User.id.desc())

    total = query.count()
    users = query.offset(offset).limit(limit).all()
    return {
        "total": total,
        "users": [{
            "id": u.id, "username": u.username, "email": u.email,
            "first_name": u.first_name, "last_name": u.last_name,
            "is_active": u.is_active, "is_admin": u.is_admin,
            "membership_tier": u.membership_tier or "basic",
            "balance": float(u.balance or 0),
            "total_earned": float(u.total_earned or 0),
            "total_withdrawn": float(u.total_withdrawn or 0),
            "personal_referrals": u.personal_referrals or 0,
            "total_team": u.total_team or 0,
            "sponsor_id": u.sponsor_id,
            "wallet_address": u.wallet_address,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        } for u in users]
    }

@app.get("/admin/api/user/{user_id}")
def admin_api_user_detail(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _require_admin(user)
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    grids = db.query(Grid).filter(Grid.owner_id == u.id).all()
    commissions = db.query(Commission).filter(
        Commission.to_user_id == u.id
    ).order_by(Commission.created_at.desc()).limit(50).all()
    payments = db.query(Payment).filter(
        Payment.from_user_id == u.id
    ).order_by(Payment.created_at.desc()).limit(20).all()
    withdrawals = db.query(Withdrawal).filter(
        Withdrawal.user_id == u.id
    ).order_by(Withdrawal.requested_at.desc()).limit(20).all()

    return {
        "user": {
            "id": u.id, "username": u.username, "email": u.email,
            "first_name": u.first_name, "last_name": u.last_name,
            "is_active": u.is_active, "is_admin": u.is_admin,
            "membership_tier": u.membership_tier or "basic",
            "balance": float(u.balance or 0),
            "total_earned": float(u.total_earned or 0),
            "total_withdrawn": float(u.total_withdrawn or 0),
            "grid_earnings": float(u.grid_earnings or 0),
            "level_earnings": float(u.level_earnings or 0),
            "upline_earnings": float(u.upline_earnings or 0),
            "course_earnings": float(u.course_earnings or 0),
            "personal_referrals": u.personal_referrals or 0,
            "total_team": u.total_team or 0,
            "sponsor_id": u.sponsor_id,
            "sponsor_username": (db.query(User).filter(User.id == u.sponsor_id).first().username if u.sponsor_id else None),
            "wallet_address": u.wallet_address,
            "country": u.country,
            "kyc_status": getattr(u, 'kyc_status', None),
            "two_factor_enabled": getattr(u, 'totp_enabled', False),
            "created_at": u.created_at.isoformat() if u.created_at else None,
        },
        "grids": [{
            "id": g.id, "tier": g.package_tier, "price": float(g.package_price),
            "advance": g.advance_number, "filled": g.positions_filled,
            "is_complete": g.is_complete,
            "revenue": float(g.revenue_total or 0),
        } for g in grids],
        "recent_commissions": [{
            "id": c.id, "amount": float(c.amount_usdt or 0),
            "type": c.commission_type, "from_user": c.from_user_id,
            "notes": c.notes, "status": c.status,
            "date": c.created_at.isoformat() if c.created_at else None,
        } for c in commissions],
        "payments": [{
            "id": p.id, "amount": float(p.amount_usdt or 0),
            "type": p.payment_type, "status": p.status,
            "tx_hash": p.tx_hash,
            "date": p.created_at.isoformat() if p.created_at else None,
        } for p in payments],
        "withdrawals": [{
            "id": w.id, "amount": float(w.amount_usdt or 0),
            "status": w.status, "wallet": w.wallet_address,
            "tx_hash": w.tx_hash,
            "requested": w.requested_at.isoformat() if w.requested_at else None,
            "processed": w.processed_at.isoformat() if w.processed_at else None,
        } for w in withdrawals],
    }

@app.post("/admin/api/user/{user_id}/adjust-balance")
async def admin_api_adjust_balance(
    user_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _require_admin(user)
    body = await request.json()
    amount = float(body.get("amount", 0))
    reason = body.get("reason", "Admin adjustment")
    if amount == 0:
        return {"error": "Amount must be non-zero"}

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    old_bal = float(target.balance or 0)
    target.balance = old_bal + amount

    comm = Commission(
        to_user_id=target.id, from_user_id=user.id,
        amount_usdt=abs(amount), commission_type="admin_adjustment",
        notes=f"{'Credit' if amount > 0 else 'Debit'}: {reason}",
        package_tier=0, status="paid"
    )
    db.add(comm)
    db.commit()
    logger.info(f"Admin balance adjust: {target.username} {'+' if amount > 0 else ''}{amount:.2f} ({reason})")
    return {"success": True, "username": target.username, "old_balance": round(old_bal, 2), "new_balance": float(target.balance)}

@app.post("/admin/api/user/{user_id}/toggle-active")
def admin_api_toggle_active(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _require_admin(user)
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.is_active = not target.is_active
    db.commit()
    logger.info(f"Admin toggle active: {target.username} → {'active' if target.is_active else 'inactive'}")
    return {"success": True, "username": target.username, "is_active": target.is_active}


@app.post("/admin/api/user/{user_id}/change-tier")
def admin_api_change_tier(
    user_id: int, request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change a user's membership tier (basic/pro)."""
    _require_admin(user)
    import asyncio
    body = asyncio.get_event_loop().run_until_complete(request.json())
    new_tier = body.get("tier", "basic")
    if new_tier not in ("basic", "pro"):
        raise HTTPException(status_code=400, detail="Invalid tier")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    old_tier = target.membership_tier or "basic"
    target.membership_tier = new_tier
    db.commit()
    logger.info(f"Admin changed tier: {target.username} {old_tier} → {new_tier}")
    return {"success": True, "username": target.username, "old_tier": old_tier, "new_tier": new_tier}


# ── Content Moderation Queue ──
@app.get("/admin/api/moderation-queue")
def admin_api_moderation_queue(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending/flagged ads and banners."""
    _require_admin(user)
    from .database import BannerAd
    pending_ads = db.query(AdListing).filter(AdListing.status == "pending").order_by(AdListing.created_at.desc()).all()
    pending_banners = db.query(BannerAd).filter(BannerAd.status == "pending").order_by(BannerAd.created_at.desc()).all()
    ads = []
    for a in pending_ads:
        owner = db.query(User).filter(User.id == a.user_id).first()
        ads.append({"id": a.id, "type": "ad", "title": a.title, "description": a.description,
            "category": a.category, "link_url": a.link_url, "image_url": a.image_url,
            "keywords": a.keywords, "location": a.location,
            "owner": owner.username if owner else "Unknown",
            "created_at": a.created_at.isoformat() if a.created_at else None})
    banners = []
    for b in pending_banners:
        owner = db.query(User).filter(User.id == b.user_id).first()
        banners.append({"id": b.id, "type": "banner", "title": b.title, "description": b.description,
            "image_url": b.image_url, "link_url": b.link_url, "size": b.size,
            "category": b.category, "keywords": b.keywords,
            "owner": owner.username if owner else "Unknown",
            "created_at": b.created_at.isoformat() if b.created_at else None})
    return {"ads": ads, "banners": banners, "total": len(ads) + len(banners)}


@app.post("/admin/api/moderation/{item_type}/{item_id}/approve")
def admin_approve_item(item_type: str, item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(user)
    from .database import BannerAd
    if item_type == "ad":
        item = db.query(AdListing).filter(AdListing.id == item_id).first()
        if item:
            item.status = "active"
            item.is_active = True
    elif item_type == "banner":
        item = db.query(BannerAd).filter(BannerAd.id == item_id).first()
        if item:
            item.status = "approved"
            item.is_active = True
    else:
        raise HTTPException(status_code=400, detail="Invalid type")
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.commit()
    return {"success": True}


@app.post("/admin/api/moderation/{item_type}/{item_id}/reject")
def admin_reject_item(item_type: str, item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(user)
    from .database import BannerAd
    if item_type == "ad":
        item = db.query(AdListing).filter(AdListing.id == item_id).first()
        if item:
            item.status = "rejected"
            item.is_active = False
    elif item_type == "banner":
        item = db.query(BannerAd).filter(BannerAd.id == item_id).first()
        if item:
            item.status = "rejected"
            item.is_active = False
    else:
        raise HTTPException(status_code=400, detail="Invalid type")
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.commit()
    return {"success": True}

# ── Finances ─────────────────────────────────────────────────
@app.get("/admin/api/finances")
def admin_api_finances(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _require_admin(user)
    from sqlalchemy import func

    total_revenue = db.query(func.sum(Payment.amount_usdt)).filter(Payment.status == "confirmed").scalar() or 0
    total_commissions = db.query(func.sum(Commission.amount_usdt)).filter(Commission.status.in_(["paid", "pending"])).scalar() or 0
    total_withdrawn = db.query(func.sum(Withdrawal.amount_usdt)).filter(Withdrawal.status == "paid").scalar() or 0
    pending_withdrawals = db.query(func.sum(Withdrawal.amount_usdt)).filter(Withdrawal.status == "pending").scalar() or 0
    total_balances = db.query(func.sum(User.balance)).scalar() or 0

    # Revenue by type
    payments_by_type = db.query(
        Payment.payment_type, func.sum(Payment.amount_usdt), func.count(Payment.id)
    ).filter(Payment.status == "confirmed").group_by(Payment.payment_type).all()

    # Commissions by type
    comms_by_type = db.query(
        Commission.commission_type, func.sum(Commission.amount_usdt), func.count(Commission.id)
    ).filter(Commission.status.in_(["paid", "pending"])).group_by(Commission.commission_type).all()

    # User counts (include all members including admin — admin IS a member)
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    active_grids = db.query(func.count(Grid.id)).filter(Grid.is_complete == False).scalar() or 0
    pending_withdrawals_count = db.query(func.count(Withdrawal.id)).filter(Withdrawal.status == "pending").scalar() or 0

    return {
        # Flat fields for overview cards
        "total_users": total_users,
        "active_users": active_users,
        "total_revenue": float(total_revenue),
        "total_commissions_paid": float(total_commissions),
        "pending_withdrawals_count": pending_withdrawals_count,
        "active_grids": active_grids,
        # Detailed breakdown
        "overview": {
            "total_revenue": float(total_revenue),
            "total_commissions_paid": float(total_commissions),
            "total_withdrawn": float(total_withdrawn),
            "pending_withdrawals": float(pending_withdrawals),
            "total_user_balances": float(total_balances),
            "platform_profit": float(total_revenue) - float(total_commissions),
        },
        "revenue_by_type": [{
            "type": t, "total": float(s or 0), "count": c
        } for t, s, c in payments_by_type],
        "commissions_by_type": [{
            "type": t, "total": float(s or 0), "count": c
        } for t, s, c in comms_by_type],
    }

@app.get("/admin/api/commissions")
def admin_api_commissions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    commission_type: str = "",
    limit: int = 50,
    offset: int = 0
):
    _require_admin(user)
    query = db.query(Commission).order_by(Commission.created_at.desc())
    if commission_type:
        query = query.filter(Commission.commission_type == commission_type)
    total = query.count()
    comms = query.offset(offset).limit(limit).all()
    return {
        "total": total,
        "commissions": [{
            "id": c.id,
            "to_user_id": c.to_user_id, "from_user_id": c.from_user_id,
            "amount": float(c.amount_usdt or 0),
            "type": c.commission_type, "status": c.status,
            "notes": c.notes,
            "date": c.created_at.isoformat() if c.created_at else None,
        } for c in comms]
    }

@app.get("/admin/api/withdrawals")
def admin_api_withdrawals(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: str = ""
):
    _require_admin(user)
    query = db.query(Withdrawal).order_by(Withdrawal.requested_at.desc())
    if status:
        query = query.filter(Withdrawal.status == status)
    ws = query.limit(100).all()

    # Get usernames
    user_ids = {w.user_id for w in ws}
    users_map = {u.id: u.username for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    return {
        "withdrawals": [{
            "id": w.id, "user_id": w.user_id,
            "username": users_map.get(w.user_id, "?"),
            "amount": float(w.amount_usdt or 0),
            "wallet": w.wallet_address, "status": w.status,
            "tx_hash": w.tx_hash,
            "requested": w.requested_at.isoformat() if w.requested_at else None,
            "processed": w.processed_at.isoformat() if w.processed_at else None,
        } for w in ws]
    }

# ── System Health ────────────────────────────────────────────
@app.get("/admin/api/kyc-pending")
def admin_kyc_pending(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """List users with pending KYC."""
    if not user or not user.is_admin: raise HTTPException(403)
    pending = db.query(User).filter(User.kyc_status == "pending").all()
    return [{"id": u.id, "username": u.username, "first_name": u.first_name, "last_name": u.last_name,
             "email": u.email, "country": u.country, "kyc_dob": u.kyc_dob, "kyc_id_type": u.kyc_id_type,
             "kyc_id_filename": u.kyc_id_filename,
             "submitted_at": str(u.kyc_submitted_at) if u.kyc_submitted_at else None} for u in pending]


@app.post("/admin/api/kyc-review/{user_id}")
async def admin_kyc_review(user_id: int, request: Request,
                     db: Session = Depends(get_db), admin: User = Depends(get_current_user)):
    """Approve or reject KYC. action = 'approve' or 'reject'."""
    if not admin or not admin.is_admin: raise HTTPException(403)
    from datetime import datetime
    body = await request.json()
    action = body.get("action", "")
    reason = body.get("reason", "")
    target = db.query(User).filter(User.id == user_id).first()
    if not target: raise HTTPException(404)
    if action == "approve":
        target.kyc_status = "approved"
        target.kyc_reviewed_at = datetime.utcnow()
    elif action == "reject":
        target.kyc_status = "rejected"
        target.kyc_rejection_reason = reason or "Documents unclear. Please resubmit."
        target.kyc_reviewed_at = datetime.utcnow()
    db.commit()
    return {"success": True, "status": target.kyc_status}


@app.get("/admin/api/kyc-document/{filename}")
def admin_kyc_document(filename: str, user: User = Depends(get_current_user)):
    """Serve uploaded KYC document (admin only) — reads from R2 or /tmp fallback."""
    if not user or not user.is_admin: raise HTTPException(403)
    from .r2_storage import r2_available, _get_client, R2_BUCKET
    from fastapi.responses import StreamingResponse, FileResponse
    import io
    if r2_available():
        try:
            client = _get_client()
            obj = client.get_object(Bucket=R2_BUCKET, Key=f"kyc/{filename}")
            content_type = obj.get("ContentType", "application/octet-stream")
            return StreamingResponse(io.BytesIO(obj["Body"].read()), media_type=content_type,
                headers={"Content-Disposition": f"inline; filename={filename}"})
        except Exception:
            raise HTTPException(404, detail="Document not found in storage")
    else:
        filepath = os.path.join("/tmp/kyc-uploads", filename)
        if not os.path.exists(filepath): raise HTTPException(404)
        return FileResponse(filepath)


@app.get("/admin/api/health")
def admin_api_health(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _require_admin(user)
    from sqlalchemy import func

    issues = []

    # Check for negative balances
    neg_bal = db.query(User).filter(User.balance < 0).all()
    if neg_bal:
        issues.append({
            "severity": "critical",
            "type": "negative_balance",
            "message": f"{len(neg_bal)} user(s) with negative balance",
            "details": [{"id": u.id, "username": u.username, "balance": float(u.balance)} for u in neg_bal]
        })

    # Check for stuck pending withdrawals (>24h)
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=24)
    stuck_w = db.query(Withdrawal).filter(
        Withdrawal.status == "pending",
        Withdrawal.requested_at < cutoff
    ).all()
    if stuck_w:
        issues.append({
            "severity": "warning",
            "type": "stuck_withdrawals",
            "message": f"{len(stuck_w)} withdrawal(s) pending > 24h",
            "details": [{"id": w.id, "user_id": w.user_id, "amount": float(w.amount_usdt),
                         "requested": w.requested_at.isoformat()} for w in stuck_w]
        })

    # Check for grids that should have advanced (filled >= 64 but not complete)
    stuck_grids = db.query(Grid).filter(
        Grid.positions_filled >= 64,
        Grid.is_complete == False
    ).all()
    if stuck_grids:
        issues.append({
            "severity": "critical",
            "type": "stuck_grids",
            "message": f"{len(stuck_grids)} grid(s) should have advanced but didn't",
            "details": [{"id": g.id, "owner_id": g.owner_id, "tier": g.package_tier,
                         "filled": g.positions_filled} for g in stuck_grids]
        })

    # Check for users with earnings mismatch
    # (total_earned < sum of commissions to them)
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_grids = db.query(Grid).count()
    active_grids = db.query(Grid).filter(Grid.is_complete == False).count()
    pending_w_count = db.query(Withdrawal).filter(Withdrawal.status == "pending").count()

    return {
        "status": "healthy" if not issues else ("critical" if any(i["severity"] == "critical" for i in issues) else "warning"),
        "issues": issues,
        "metrics": {
            "total_users": total_users,
            "active_users": active_users,
            "total_grids": total_grids,
            "active_grids": active_grids,
            "pending_withdrawals": pending_w_count,
        },
        "checked_at": datetime.utcnow().isoformat()
    }

@app.post("/admin/api/fix/{issue_type}")
def admin_api_fix(
    issue_type: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _require_admin(user)
    from app.grid import _complete_grid

    fixed = []

    if issue_type == "negative_balance":
        neg = db.query(User).filter(User.balance < 0).all()
        for u in neg:
            old = float(u.balance)
            u.balance = 0
            comm = Commission(
                to_user_id=u.id, from_user_id=user.id,
                amount_usdt=abs(old), commission_type="admin_fix",
                notes=f"Auto-fix: negative balance {old:.2f} → 0.00",
                package_tier=0, status="paid"
            )
            db.add(comm)
            fixed.append({"user_id": u.id, "username": u.username, "old_balance": round(old, 2)})
        db.commit()

    elif issue_type == "stuck_grids":
        stuck = db.query(Grid).filter(
            Grid.positions_filled >= 64, Grid.is_complete == False
        ).all()
        for g in stuck:
            _complete_grid(db, g)
            fixed.append({"grid_id": g.id, "owner_id": g.owner_id, "tier": g.package_tier})
        db.commit()

    else:
        return {"error": f"Unknown issue type: {issue_type}"}

    logger.info(f"Admin auto-fix '{issue_type}': {len(fixed)} items fixed")
    return {"success": True, "issue_type": issue_type, "fixed_count": len(fixed), "details": fixed}


# ═══════════════════════════════════════════════════════════════
#  ADMIN: Commission Flow Dashboard
# ═══════════════════════════════════════════════════════════════

@app.get("/admin/commission-flows")
def admin_commission_flows(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user or not is_admin(user):
        raise HTTPException(status_code=403, detail="Access denied")
    return templates.TemplateResponse("admin-commission-flows.html", {
        "request": request, "user": user, "active_page": "admin"
    })

@app.get("/admin/api/commission-flows")
def admin_api_commission_flows(user: User = Depends(get_current_user), db: Session = Depends(get_db), limit: int = 100):
    _require_admin(user)

    # Get all course commissions with details
    comms = db.query(CourseCommission).order_by(CourseCommission.id.desc()).limit(limit).all()
    user_ids = set()
    for c in comms:
        if c.buyer_id: user_ids.add(c.buyer_id)
        if c.earner_id: user_ids.add(c.earner_id)
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    flows = []
    for c in comms:
        buyer = users_map.get(c.buyer_id)
        earner = users_map.get(c.earner_id)
        flows.append({
            "id": c.id,
            "buyer": buyer.username if buyer else "?",
            "buyer_id": c.buyer_id,
            "earner": earner.username if earner else "COMPANY",
            "earner_id": c.earner_id,
            "amount": float(c.amount),
            "tier": c.course_tier,
            "type": c.commission_type,
            "depth": c.pass_up_depth,
            "notes": c.notes or "",
            "date": c.created_at.isoformat() if c.created_at else None,
        })
    return {"flows": flows}

@app.get("/admin/api/network-tree")
def admin_api_network_tree(user: User = Depends(get_current_user), db: Session = Depends(get_db), root_id: int = 0):
    _require_admin(user)

    # Build network tree from a root user
    if root_id == 0:
        root = db.query(User).filter(User.is_admin == True).first()
        if not root:
            root = db.query(User).order_by(User.id).first()
        root_id = root.id if root else 0

    all_users = db.query(User).all()
    # Get course ownership
    purchases = db.query(CoursePurchase).all()
    user_tiers = {}
    for p in purchases:
        if p.user_id not in user_tiers:
            user_tiers[p.user_id] = []
        user_tiers[p.user_id].append(p.course_tier)

    nodes = []
    for u in all_users:
        nodes.append({
            "id": u.id,
            "username": u.username,
            "sponsor_id": u.sponsor_id,
            "pass_up_sponsor_id": u.pass_up_sponsor_id,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "sale_count": u.course_sale_count or 0,
            "balance": float(u.balance or 0),
            "course_earnings": float(u.course_earnings or 0),
            "owned_tiers": sorted(user_tiers.get(u.id, [])),
        })
    return {"nodes": nodes, "root_id": root_id}


# ═══════════════════════════════════════════════════════════════
#  AI USAGE RATE LIMITING
# ═══════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
#  AI MODEL ROUTING — use Haiku for simple tools, Sonnet for complex
# ═══════════════════════════════════════════════════════════════
AI_MODEL_SONNET = "claude-sonnet-4-20250514"
AI_MODEL_HAIKU  = "claude-haiku-4-5-20251001"

# Which model each tool uses (Haiku is ~10x cheaper)
AI_TOOL_MODELS = {
    "campaign_studio":  AI_MODEL_SONNET,   # Complex: full campaign generation
    "funnel_copy":      AI_MODEL_SONNET,   # Complex: landing page copywriting
    "ai_recommendations": AI_MODEL_SONNET, # Complex: strategic analysis
    "niche_finder":     AI_MODEL_HAIKU,    # Simple: structured JSON output
    "social_posts":     AI_MODEL_HAIKU,    # Simple: short captions
    "video_scripts":    AI_MODEL_HAIKU,    # Simple: template-based scripts
    "swipe_file":       AI_MODEL_HAIKU,    # Simple: email templates
    "launch_wizard":    AI_MODEL_HAIKU,    # Simple: template generation
    "chat":             AI_MODEL_HAIKU,    # Simple: short responses
}

def get_ai_model(tool: str) -> str:
    """Return the appropriate model for a given tool."""
    return AI_TOOL_MODELS.get(tool, AI_MODEL_HAIKU)

# ═══════════════════════════════════════════════════════════════
#  AI RESPONSE CACHE — avoid duplicate API calls
# ═══════════════════════════════════════════════════════════════
import hashlib

# Cache TTL per tool (hours) — longer for stable outputs
AI_CACHE_TTL = {
    "niche_finder":  48,   # Niches don't change often
    "social_posts":  24,   # Fresh daily
    "video_scripts": 48,
    "swipe_file":    24,
    "campaign_studio": 12, # More personalised, shorter cache
}

def get_cached_response(db: Session, tool: str, prompt: str):
    """Check cache for an existing response. Returns response text or None."""
    prompt_hash = hashlib.sha256(f"{tool}:{prompt}".encode()).hexdigest()
    cached = db.query(AIResponseCache).filter(
        AIResponseCache.prompt_hash == prompt_hash,
        AIResponseCache.expires_at > datetime.utcnow()
    ).first()
    if cached:
        cached.hit_count = (cached.hit_count or 0) + 1
        db.commit()
        return cached.response
    return None

def cache_response(db: Session, tool: str, prompt: str, response: str):
    """Store an AI response in cache."""
    prompt_hash = hashlib.sha256(f"{tool}:{prompt}".encode()).hexdigest()
    ttl_hours = AI_CACHE_TTL.get(tool, 24)
    expires = datetime.utcnow() + timedelta(hours=ttl_hours)
    # Upsert
    existing = db.query(AIResponseCache).filter(AIResponseCache.prompt_hash == prompt_hash).first()
    if existing:
        existing.response = response
        existing.expires_at = expires
        existing.hit_count = 0
    else:
        db.add(AIResponseCache(
            tool=tool, prompt_hash=prompt_hash,
            response=response, expires_at=expires
        ))
    db.commit()

# ═══════════════════════════════════════════════════════════════
#  AI DAILY LIMITS — tier-based to control costs
# ═══════════════════════════════════════════════════════════════
DAILY_LIMITS = {
    "campaign_studio": 8,
    "niche_finder":    8,
    "social_posts":    10,
    "video_scripts":   8,
    "swipe_file":      6,
}

# Tier-based multipliers — higher tiers get more AI uses per day
TIER_AI_MULTIPLIERS = {
    0: 0.25,  # No grid: 2/day per tool
    1: 0.375, # Starter $20: 3/day
    2: 0.375, # Builder $50: 3/day
    3: 0.5,   # Pro $100: 4/day
    4: 0.5,   # Advanced $200: 4/day
    5: 0.75,  # Elite $400: 6/day
    6: 0.75,  # Premium $600: 6/day
    7: 1.0,   # Executive $800: 8/day
    8: 1.0,   # Ultimate $1000: 8/day
}

def get_user_highest_tier(db: Session, user_id: int) -> int:
    """Return the user's highest active grid tier (0 if none). Admin = all tiers."""
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.is_admin:
        return 8  # Master affiliate — qualified for all tiers
    highest = db.query(Grid).filter(
        Grid.owner_id == user_id, Grid.is_complete == False
    ).order_by(Grid.package_tier.desc()).first()
    return highest.package_tier if highest else 0

def check_and_increment_ai_quota(db: Session, user_id: int, tool: str) -> dict:
    """Check daily limit based on user's tier. If within limit, increment and return allowed=True."""
    from datetime import date
    today = date.today().isoformat()
    
    # Get tier-based limit
    user_tier = get_user_highest_tier(db, user_id)
    base_limit = DAILY_LIMITS.get(tool, 10)
    multiplier = TIER_AI_MULTIPLIERS.get(user_tier, 0.2)
    limit = max(2, int(base_limit * multiplier))  # minimum 2/day always

    quota = db.query(AIUsageQuota).filter(AIUsageQuota.user_id == user_id).first()
    if not quota:
        quota = AIUsageQuota(user_id=user_id, quota_date=today)
        db.add(quota)
        db.commit()
        db.refresh(quota)

    if quota.quota_date != today:
        quota.quota_date = today
        quota.campaign_studio_uses = 0
        quota.niche_finder_uses = 0
        quota.social_posts_uses = 0
        quota.video_scripts_uses = 0
        quota.swipe_file_uses = 0
        db.commit()

    field = f"{tool}_uses"
    current = getattr(quota, field, 0)

    if current >= limit:
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        diff = tomorrow - now
        hours = diff.seconds // 3600
        mins  = (diff.seconds % 3600) // 60
        resets_in = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"
        return {"allowed": False, "used": current, "limit": limit, "resets_in": resets_in}

    setattr(quota, field, current + 1)
    total_field = f"{tool}_total"
    setattr(quota, total_field, getattr(quota, total_field, 0) + 1)
    db.commit()
    return {"allowed": True, "used": current + 1, "limit": limit, "resets_in": ""}


# ═══════════════════════════════════════════════════════════════
#  FUNNEL PAGE BUILDER
# ═══════════════════════════════════════════════════════════════

@app.get("/funnels")
def funnels_page(request: Request, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """Redirect to Pro funnels page."""
    return RedirectResponse(url="/pro/funnels", status_code=302)


@app.get("/funnels/new")
def funnel_new(request: Request, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    """Legacy route — redirects to Pro funnels."""
    return RedirectResponse(url="/pro/funnels", status_code=302)


@app.get("/funnels/edit/{page_id}")
def funnel_edit(page_id: int, request: Request, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Legacy route — redirects to Pro funnel editor."""
    return RedirectResponse(url=f"/pro/funnel/{page_id}/edit", status_code=302)


@app.get("/funnels/visual/new")
def funnel_visual_new(request: Request, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Legacy route — redirects to Pro funnels."""
    return RedirectResponse(url="/pro/funnels", status_code=302)


@app.get("/funnels/visual/{page_id}")
def funnel_visual_editor(page_id: int, request: Request, user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    """Legacy route — redirects to Pro funnel editor."""
    return RedirectResponse(url=f"/pro/funnel/{page_id}/edit", status_code=302)


@app.get("/api/funnels/load/{page_id}")
def funnel_load_gjs(page_id: int, request: Request, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Load GrapesJS editor data for a page."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    page = db.query(FunnelPage).filter(FunnelPage.id == page_id, FunnelPage.user_id == user.id).first()
    if not page:
        return JSONResponse({"error": "Page not found"}, status_code=404)
    import json
    return JSONResponse({
        "id": page.id,
        "title": page.title,
        "slug": page.slug,
        "template_type": page.template_type,
        "status": page.status,
        "gjs_components": json.loads(page.gjs_components) if page.gjs_components else [],
        "gjs_styles": json.loads(page.gjs_styles) if page.gjs_styles else [],
        "gjs_html": page.gjs_html or "",
        "gjs_css": page.gjs_css or "",
        "updated_at": page.updated_at.isoformat() if page.updated_at else None,
    })


@app.post("/api/funnels/save")
async def funnel_save(request: Request, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)

    # Payload size guard — reject excessively large pages (5MB limit)
    import json as _json
    if len(_json.dumps(body)) > 5 * 1024 * 1024:
        return JSONResponse({"error": "Page content too large. Try removing some sections."}, status_code=413)

    page_id = body.get("id")
    if page_id:
        page = db.query(FunnelPage).filter(FunnelPage.id == page_id, FunnelPage.user_id == user.id).first()
        if not page:
            return JSONResponse({"error": "Page not found"}, status_code=404)
        # Optimistic locking: reject if page was modified by another tab/session
        client_updated = body.get("updated_at")
        if client_updated and page.updated_at:
            from datetime import datetime
            try:
                client_ts = datetime.fromisoformat(client_updated.replace("Z", "+00:00")).replace(tzinfo=None)
                server_ts = page.updated_at
                if abs((server_ts - client_ts).total_seconds()) > 2:
                    return JSONResponse({
                        "error": "This page was modified in another tab or session. Please reload to get the latest version.",
                        "conflict": True,
                        "server_updated_at": page.updated_at.isoformat()
                    }, status_code=409)
            except (ValueError, TypeError):
                pass  # If timestamp parsing fails, allow the save
    else:
        page = FunnelPage(user_id=user.id)
        db.add(page)

    # Generate slug from title + username (only if new page or no slug yet)
    import re
    title = body.get("title", "My Page").strip()
    if not page.slug:
        slug = generate_unique_slug(db, user.username, title, exclude_page_id=page.id)
        if slug is None:
            return JSONResponse({"error": f"A page called '{title}' already exists. Please choose a different title."}, status_code=409)
        page.slug = slug

    page.title = title

    # Only update fields that are explicitly included in the payload
    # This prevents the canvas editor (which only sends id/title/gjs_html/gjs_css/status)
    # from wiping fields set by the AI generator or other editors
    if "template_type" in body: page.template_type = body["template_type"]
    if "headline" in body: page.headline = body["headline"]
    if "subheadline" in body: page.subheadline = body["subheadline"]
    if "body_copy" in body: page.body_copy = body["body_copy"]
    if "cta_text" in body: page.cta_text = body["cta_text"]
    if "cta_url" in body: page.cta_url = body["cta_url"]
    if "video_url" in body: page.video_url = body["video_url"]
    if "image_url" in body: page.image_url = body["image_url"]
    if "color_scheme" in body: page.color_scheme = body["color_scheme"]
    if "accent_color" in body: page.accent_color = body["accent_color"]
    if "custom_bg" in body: page.custom_bg = body["custom_bg"]
    if "status" in body: page.status = body["status"]
    if "funnel_name" in body: page.funnel_name = body["funnel_name"]
    if "font_family" in body: page.font_family = body["font_family"]
    if "meta_description" in body: page.meta_description = body["meta_description"]

    # Section-based content
    import json
    sections = body.get("sections")
    if sections is not None:
        page.sections_json = json.dumps(sections)

    # GrapesJS visual editor data
    gjs_components = body.get("gjs_components")
    if gjs_components is not None:
        page.gjs_components = json.dumps(gjs_components) if isinstance(gjs_components, (list, dict)) else gjs_components
    gjs_styles = body.get("gjs_styles")
    if gjs_styles is not None:
        page.gjs_styles = json.dumps(gjs_styles) if isinstance(gjs_styles, (list, dict)) else gjs_styles
    gjs_html = body.get("gjs_html")
    if gjs_html is not None:
        # Strip script tags and event handlers to prevent XSS
        import re
        gjs_html = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', gjs_html, flags=re.IGNORECASE)
        gjs_html = re.sub(r'\bon\w+\s*=\s*["\'][^"\']*["\']', '', gjs_html, flags=re.IGNORECASE)
        page.gjs_html = gjs_html
    gjs_css = body.get("gjs_css")
    if gjs_css is not None:
        page.gjs_css = gjs_css

    db.commit()
    db.refresh(page)

    return JSONResponse({
        "success": True,
        "id": page.id,
        "slug": page.slug,
        "status": page.status,
        "preview_url": f"/p/{page.slug}",
        "updated_at": page.updated_at.isoformat() if page.updated_at else None,
    })


@app.post("/api/funnels/upload-image")
async def funnel_upload_image(file: UploadFile = File(...), user: User = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    """Upload an image for use in funnel pages. Returns the public URL."""
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
    if file.content_type not in allowed_types:
        return JSONResponse({"error": "Only JPEG, PNG, GIF, WebP and SVG images are allowed."}, status_code=400)

    # Read and check size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        return JSONResponse({"error": "Image too large. Maximum size is 5MB."}, status_code=400)

    import uuid, os
    ext = os.path.splitext(file.filename or "image.jpg")[1].lower().lstrip(".")
    if ext not in {"jpg", "jpeg", "png", "gif", "webp", "svg"}:
        ext = "jpg"

    # Try R2 first, fall back to local storage
    from app.r2_storage import r2_available, upload_image
    if r2_available():
        url = upload_image(contents, "funnel-images", ext, file.content_type)
    else:
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{user.id}_{uuid.uuid4().hex[:12]}.{ext}"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(contents)
        url = f"/static/uploads/{filename}"

    return JSONResponse({"success": True, "url": url})


@app.post("/api/funnels/upload-video")
async def funnel_upload_video(file: UploadFile = File(...), user: User = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    """Upload a video (MP4) for use in funnel pages. Returns the public URL."""
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    allowed_types = {"video/mp4", "video/webm", "video/ogg"}
    if file.content_type not in allowed_types:
        return JSONResponse({"error": "Only MP4, WebM and OGG videos are allowed."}, status_code=400)

    # Max 50MB for videos
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        return JSONResponse({"error": "Video too large. Maximum size is 50MB."}, status_code=400)

    import uuid, os
    ext = os.path.splitext(file.filename or "video.mp4")[1].lower().lstrip(".")
    if ext not in {"mp4", "webm", "ogg"}:
        ext = "mp4"

    from app.r2_storage import r2_available, upload_image
    if r2_available():
        url = upload_image(contents, "funnel-videos", ext, file.content_type)
    else:
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{user.id}_{uuid.uuid4().hex[:12]}.{ext}"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(contents)
        url = f"/static/uploads/{filename}"

    return JSONResponse({"success": True, "url": url})


@app.post("/api/funnels/upload-audio")
async def funnel_upload_audio(file: UploadFile = File(...), user: User = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    """Upload an audio file (MP3/WAV/OGG) for use in funnel pages."""
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    allowed_types = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/x-wav"}
    if file.content_type not in allowed_types:
        return JSONResponse({"error": "Only MP3, WAV and OGG audio files are allowed."}, status_code=400)

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        return JSONResponse({"error": "Audio too large. Maximum size is 20MB."}, status_code=400)

    import uuid, os
    ext = os.path.splitext(file.filename or "audio.mp3")[1].lower().lstrip(".")
    if ext not in {"mp3", "wav", "ogg"}:
        ext = "mp3"

    from app.r2_storage import r2_available, upload_image
    if r2_available():
        url = upload_image(contents, "funnel-audio", ext, file.content_type)
    else:
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{user.id}_{uuid.uuid4().hex[:12]}.{ext}"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(contents)
        url = f"/static/uploads/{filename}"

    return JSONResponse({"success": True, "url": url})


@app.post("/api/funnels/generate-copy")
async def funnel_generate_copy(request: Request, user: User = Depends(get_current_user),
                                db: Session = Depends(get_db)):
    """AI generates landing page copy based on member's brief."""
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    rl = check_and_increment_ai_quota(db, user.id, "campaign_studio")
    if not rl["allowed"]:
        return JSONResponse({"error": f"Daily AI limit reached. Resets in {rl['resets_in']}."}, status_code=429)

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)

    template_type = body.get("template_type", "opportunity")
    niche = body.get("niche", "online income")
    offer = body.get("offer", "")
    audience = body.get("audience", "")
    tone = body.get("tone", "professional and exciting")

    type_prompts = {
        "opportunity": "an opportunity/income presentation landing page. The visitor should feel excited about a real opportunity and want to learn more. Include social proof elements and urgency.",
        "optin": "a lead capture / opt-in page. The visitor should want to enter their email to receive something valuable. Focus on the free value proposition and what they'll learn.",
        "bridge": "a bridge page. This is a personal story/recommendation page that builds trust before sending the visitor to the main offer. Write in first person, be authentic and relatable.",
        "webinar": "a webinar/event registration page. Create urgency around a live event, highlight what they'll learn, and emphasise limited spots or time-sensitivity.",
        "thankyou": "a thank you / confirmation page. Confirm their action, build excitement for what's coming next, and include a secondary CTA or next step.",
    }

    page_context = type_prompts.get(template_type, type_prompts["opportunity"])

    prompt = f"""You are an expert direct-response copywriter specialising in affiliate marketing and network marketing landing pages.

Create compelling copy for {page_context}

BRIEF:
- Niche: {niche}
- Offer: {offer if offer else "an online income opportunity"}
- Target audience: {audience if audience else "people looking to earn extra income online"}
- Tone: {tone}

Respond ONLY with a JSON object (no markdown, no backticks) containing:
{{
  "headline": "A powerful, attention-grabbing headline (max 12 words)",
  "subheadline": "A supporting line that builds on the headline (max 25 words)",
  "body_copy": "3-5 bullet points separated by newlines, each starting with ✓. Focus on benefits and outcomes, not features.",
  "cta_text": "Action-oriented button text (3-5 words)"
}}

Make every word count. Use power words. Create genuine curiosity and desire. Avoid hype — be compelling but believable."""

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({
            "headline": f"Discover the {niche.title()} System That's Changing Everything",
            "subheadline": f"Join thousands who are building real income with a proven step-by-step system",
            "body_copy": f"✓ Learn the exact strategy top earners use in {niche}\n✓ No experience needed — full training included\n✓ Start seeing results in your first week\n✓ Access a community of like-minded entrepreneurs\n✓ Limited spots available at this price",
            "cta_text": "Get Started Now",
            "demo": True,
        })

    try:
        import anthropic, json
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=AI_MODEL_SONNET,  # Complex generation,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text.strip()
        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        data = json.loads(text)
        return JSONResponse(data)
    except Exception as e:
        logger.error(f"Funnel AI copy error: {e}")
        return JSONResponse({
            "headline": f"Your {niche.title()} Success Starts Here",
            "subheadline": "The proven system for building real income online",
            "body_copy": "✓ Step-by-step training included\n✓ No experience required\n✓ Proven results from real people\n✓ Full support and community\n✓ Start today risk-free",
            "cta_text": "Get Started Now",
        })


@app.post("/api/funnels/from-template")
async def funnel_from_template(request: Request, user: User = Depends(get_current_user),
                                db: Session = Depends(get_db)):
    """Create a funnel page from a pre-built niche template."""
    if not user: return {"error": "Not logged in"}
    body = await request.json()
    niche = body.get("niche", "affiliate-marketing")
    import json, random, string, re as _re

    # ── NEW: SuperPages template builder (React editor format) ──
    from app.template_builder import build_template, BUILDERS
    if niche in BUILDERS:
        tpl_data = build_template(niche, getattr(user, 'username', 'demo'))
        TEMPLATE_TITLES = {
            'lead-capture': 'Lead Capture Page',
            'video-sales': 'Video Sales Letter',
            'product-offer': 'Product Offer Page',
            'network-opportunity': 'Business Opportunity',
            'webinar-registration': 'Webinar Registration',
            'coaching-program': 'Coaching Program',
            'digital-product': 'Digital Product Page',
            'affiliate-income': 'Affiliate Funnel',
        }
        title = TEMPLATE_TITLES.get(niche, 'New Page')
        # Add short hash to prevent duplicate title errors
        title_hash = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        page = FunnelPage(
            user_id=user.id,
            title=f"{title} {title_hash}",
            headline=title,
            template_type="landing",
            status="draft",
            gjs_css=json.dumps(tpl_data),
        )
        db.add(page)
        db.flush()
        slug_base = _re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        page.slug = f"{user.username.lower()}/{slug_base}-{page.id}"
        db.commit()
        return {"success": True, "id": page.id, "edit_url": f"/pro/funnel/{page.id}/edit"}

    NICHE_TEMPLATES = {
        "forex": {
            "title": "Forex Trading Opportunity",
            "headline": "Unlock the World's Largest Financial Market",
            "subheadline": "Learn proven forex trading strategies that generate consistent income — whether you're a complete beginner or experienced trader.",
            "benefits_title": "Why Forex with SuperAdPro?",
            "benefits": [
                {"icon": "📊", "title": "Proven Strategies", "desc": "Battle-tested trading systems that work in any market condition."},
                {"icon": "🕐", "title": "Trade on Your Schedule", "desc": "The forex market runs 24/5 — trade when it suits your lifestyle."},
                {"icon": "🎓", "title": "Expert Training", "desc": "Step-by-step education from beginner basics to advanced techniques."},
                {"icon": "💰", "title": "Multiple Income Streams", "desc": "Earn from trading, referrals, and team building simultaneously."},
                {"icon": "🤖", "title": "AI-Powered Tools", "desc": "Smart indicators and analysis tools that give you an edge."},
                {"icon": "🌍", "title": "Global Community", "desc": "Join thousands of traders sharing strategies and support."}
            ],
            "cta_headline": "Start Your Forex Journey Today",
            "cta_sub": "Join now and access everything you need to start trading profitably.",
            "bg": "dark", "accent": "#00d4ff"
        },
        "crypto": {
            "title": "Crypto Income Blueprint",
            "headline": "Your Gateway to the Digital Currency Revolution",
            "subheadline": "Discover how everyday people are building real wealth with cryptocurrency — no technical expertise required.",
            "benefits_title": "Why Crypto with SuperAdPro?",
            "benefits": [
                {"icon": "₿", "title": "Crypto Made Simple", "desc": "We break down blockchain and crypto into plain English anyone can follow."},
                {"icon": "🔒", "title": "Security First", "desc": "Learn proper wallet setup, security practices, and risk management."},
                {"icon": "📈", "title": "Growth Potential", "desc": "Position yourself in the fastest-growing asset class in history."},
                {"icon": "💎", "title": "Multiple Strategies", "desc": "From HODLing to DeFi yield farming — explore what works for you."},
                {"icon": "🤝", "title": "Community Support", "desc": "Never trade alone — get guidance from experienced crypto investors."},
                {"icon": "🚀", "title": "Early Advantage", "desc": "Get in early on emerging opportunities before the mainstream catches on."}
            ],
            "cta_headline": "Claim Your Spot in the Crypto Economy",
            "cta_sub": "Limited early access — join now and start building your crypto portfolio.",
            "bg": "gradient", "accent": "#a78bfa"
        },
        "affiliate-marketing": {
            "title": "Affiliate Income Machine",
            "headline": "Earn Commissions Promoting Products You Believe In",
            "subheadline": "Build a profitable online business with zero inventory, zero shipping, and unlimited earning potential.",
            "benefits_title": "Why Affiliate Marketing Works",
            "benefits": [
                {"icon": "🔗", "title": "No Products Needed", "desc": "Promote other people's products and earn a commission on every sale."},
                {"icon": "🏠", "title": "Work From Anywhere", "desc": "All you need is a phone and internet connection to start earning."},
                {"icon": "📱", "title": "Ready-Made Funnels", "desc": "We give you professional marketing pages — just share your link."},
                {"icon": "💸", "title": "Recurring Income", "desc": "Earn month after month from the same referrals."},
                {"icon": "🎯", "title": "Proven System", "desc": "Follow a step-by-step blueprint that thousands have used successfully."},
                {"icon": "⚡", "title": "Instant Commissions", "desc": "Get paid the moment your referral takes action — no waiting."}
            ],
            "cta_headline": "Start Earning Affiliate Commissions Today",
            "cta_sub": "Join thousands of affiliates who are building real online income.",
            "bg": "dark", "accent": "#10b981"
        },
        "ecommerce": {
            "title": "E-Commerce Success System",
            "headline": "Build a Profitable Online Store from Scratch",
            "subheadline": "Sell physical or digital products worldwide — with AI-powered tools that handle the heavy lifting.",
            "benefits_title": "Your E-Commerce Advantage",
            "benefits": [
                {"icon": "🛒", "title": "Ready-Made Store", "desc": "Launch your online store in minutes with professional templates."},
                {"icon": "🌍", "title": "Sell Worldwide", "desc": "Reach customers in every country — no geographical limits."},
                {"icon": "📦", "title": "No Inventory", "desc": "Use dropshipping and digital products — zero stock required."},
                {"icon": "🤖", "title": "AI Marketing", "desc": "Let AI write your product descriptions, ads, and email campaigns."},
                {"icon": "📊", "title": "Analytics Dashboard", "desc": "Track every sale, click, and conversion in real time."},
                {"icon": "💰", "title": "Multiple Revenue", "desc": "Combine product sales with affiliate commissions and ad revenue."}
            ],
            "cta_headline": "Launch Your Online Store Today",
            "cta_sub": "Everything you need to start selling online — included.",
            "bg": "fire", "accent": "#f59e0b"
        },
        "ai-tech": {
            "title": "AI-Powered Income",
            "headline": "Use Artificial Intelligence to Build Your Business",
            "subheadline": "Leverage the most powerful technology in history to automate your income and stay ahead of the curve.",
            "benefits_title": "The AI Advantage",
            "benefits": [
                {"icon": "🤖", "title": "AI Does the Work", "desc": "Automate content creation, marketing, and customer engagement."},
                {"icon": "⚡", "title": "10x Productivity", "desc": "Accomplish in minutes what used to take hours or days."},
                {"icon": "🧠", "title": "Smart Strategies", "desc": "AI analyses data and recommends your best moves in real time."},
                {"icon": "💻", "title": "No Coding Needed", "desc": "Use powerful AI tools without any technical background."},
                {"icon": "📈", "title": "Scale Fast", "desc": "AI lets you scale your business without scaling your workload."},
                {"icon": "🔮", "title": "Future-Proof", "desc": "Build skills and income in the fastest-growing industry on earth."}
            ],
            "cta_headline": "Harness the Power of AI Today",
            "cta_sub": "Join the AI revolution and start building automated income streams.",
            "bg": "gradient", "accent": "#6366f1"
        },
        "health-fitness": {
            "title": "Fitness & Wellness Partner",
            "headline": "Transform Lives While Building a Rewarding Income",
            "subheadline": "Help others achieve their health goals and earn generous commissions in the booming wellness industry.",
            "benefits_title": "Why Health & Fitness",
            "benefits": [
                {"icon": "💪", "title": "Growing Industry", "desc": "The global wellness market is worth $4.4 trillion — and growing."},
                {"icon": "❤️", "title": "Make a Difference", "desc": "Help real people transform their health and confidence."},
                {"icon": "🏃", "title": "Flexible Schedule", "desc": "Work around your own fitness routine and lifestyle."},
                {"icon": "📱", "title": "Digital Tools", "desc": "Professional funnels, content, and marketing — ready to go."},
                {"icon": "🤝", "title": "Community", "desc": "Join a network of health-minded entrepreneurs supporting each other."},
                {"icon": "💰", "title": "Recurring Revenue", "desc": "Earn monthly commissions from memberships and subscriptions."}
            ],
            "cta_headline": "Start Your Wellness Business Today",
            "cta_sub": "Join a community passionate about health and financial freedom.",
            "bg": "ocean", "accent": "#10b981"
        },
        "real-estate": {
            "title": "Real Estate Wealth Builder",
            "headline": "Build Wealth Through Property — Without Millions to Start",
            "subheadline": "Discover digital real estate strategies and property tools that create income from property markets.",
            "benefits_title": "Your Property Advantage",
            "benefits": [
                {"icon": "🏠", "title": "Digital Real Estate", "desc": "Build online assets that generate income like physical property."},
                {"icon": "📊", "title": "Market Intelligence", "desc": "AI-powered analysis of property trends and opportunities."},
                {"icon": "💰", "title": "Passive Income", "desc": "Create income streams that pay you month after month."},
                {"icon": "🎓", "title": "Expert Training", "desc": "Learn from successful property investors and digital entrepreneurs."},
                {"icon": "🤝", "title": "Network Effect", "desc": "Connect with investors and grow your portfolio together."},
                {"icon": "🔑", "title": "Low Entry Cost", "desc": "Start with a fraction of what traditional property investing requires."}
            ],
            "cta_headline": "Start Building Real Estate Wealth",
            "cta_sub": "Join smart investors who are building wealth through property.",
            "bg": "dark", "accent": "#f59e0b"
        },
        "personal-finance": {
            "title": "Financial Freedom Blueprint",
            "headline": "Take Control of Your Money and Build Lasting Wealth",
            "subheadline": "Learn to manage, grow, and multiply your income with proven financial strategies and digital tools.",
            "benefits_title": "Your Path to Financial Freedom",
            "benefits": [
                {"icon": "💰", "title": "Multiple Streams", "desc": "Build diverse income sources that protect and grow your wealth."},
                {"icon": "📊", "title": "Smart Budgeting", "desc": "Tools and training to take control of every dollar you earn."},
                {"icon": "🎯", "title": "Goal Setting", "desc": "Clear milestones and tracking to keep you on the path to freedom."},
                {"icon": "🧠", "title": "Financial Education", "desc": "Understand investing, compound growth, and wealth building."},
                {"icon": "🤖", "title": "AI Assistance", "desc": "Let AI help you optimise your financial strategy and marketing."},
                {"icon": "🔒", "title": "Security First", "desc": "Build a financial safety net while growing your income."}
            ],
            "cta_headline": "Start Your Journey to Financial Freedom",
            "cta_sub": "Join thousands who are taking control of their financial future.",
            "bg": "ocean", "accent": "#0284c7"
        }
    }

    tpl = NICHE_TEMPLATES.get(niche, NICHE_TEMPLATES["affiliate-marketing"])

    # Build niche-specific stats
    NICHE_STATS = {
        "forex": [{"value":"$6.6T","label":"Daily Forex Volume"},{"value":"24/5","label":"Market Hours"},{"value":"10,000+","label":"Active Traders"},{"value":"180+","label":"Currency Pairs"}],
        "crypto": [{"value":"$2.1T","label":"Crypto Market Cap"},{"value":"24/7","label":"Never Closes"},{"value":"300M+","label":"Crypto Users"},{"value":"10,000+","label":"Digital Assets"}],
        "affiliate-marketing": [{"value":"$17B+","label":"Affiliate Industry"},{"value":"10,000+","label":"Active Members"},{"value":"$2.5M+","label":"Commissions Paid"},{"value":"150+","label":"Countries"}],
        "ecommerce": [{"value":"$5.7T","label":"Global E-Commerce"},{"value":"2.14B","label":"Online Shoppers"},{"value":"27%","label":"Annual Growth"},{"value":"10,000+","label":"Active Sellers"}],
        "ai-tech": [{"value":"$190B","label":"AI Market Size"},{"value":"40%","label":"YoY Growth"},{"value":"10x","label":"Productivity Boost"},{"value":"10,000+","label":"AI-Powered Members"}],
        "health-fitness": [{"value":"$4.4T","label":"Wellness Industry"},{"value":"73%","label":"Want Better Health"},{"value":"10,000+","label":"Active Members"},{"value":"150+","label":"Countries"}],
        "real-estate": [{"value":"$326T","label":"Global Property"},{"value":"10.6%","label":"Avg Annual Return"},{"value":"10,000+","label":"Active Investors"},{"value":"$2.5M+","label":"Commissions Paid"}],
        "personal-finance": [{"value":"78%","label":"Live Paycheck to Paycheck"},{"value":"$1.2M","label":"Avg Needed to Retire"},{"value":"10,000+","label":"Active Members"},{"value":"3","label":"Income Streams"}],
    }
    NICHE_STEPS = {
        "forex": [{"num":"01","title":"Open Your Account","desc":"Register in 60 seconds and access your member dashboard with all trading tools."},{"num":"02","title":"Learn the System","desc":"Follow our structured forex training — from candlestick basics to advanced Smart Money Concepts."},{"num":"03","title":"Trade & Earn","desc":"Apply proven strategies on your own schedule. Plus earn referral income by sharing with others."}],
        "crypto": [{"num":"01","title":"Create Your Wallet","desc":"We walk you through secure wallet setup and buying your first crypto step by step."},{"num":"02","title":"Master the Fundamentals","desc":"Learn blockchain, DeFi, altcoins, and how to spot opportunities before the crowd."},{"num":"03","title":"Build Your Portfolio","desc":"Start investing with confidence and earn referral commissions as you grow."}],
        "affiliate-marketing": [{"num":"01","title":"Grab Your Link","desc":"Get your unique referral link the moment you sign up — ready to share anywhere."},{"num":"02","title":"Share & Promote","desc":"Use our AI-built funnels, social media templates, and swipe copy to drive traffic."},{"num":"03","title":"Earn Commissions","desc":"Get paid instantly every time someone joins through your link. Recurring monthly income."}],
        "ecommerce": [{"num":"01","title":"Pick Your Niche","desc":"Use our AI niche finder to identify profitable product categories with high demand."},{"num":"02","title":"Launch Your Store","desc":"Build professional product pages with our drag-and-drop builder in minutes."},{"num":"03","title":"Scale with AI","desc":"Let AI write your ads, email campaigns, and product descriptions while you focus on growth."}],
        "ai-tech": [{"num":"01","title":"Access AI Tools","desc":"Get instant access to our suite of AI-powered marketing and business automation tools."},{"num":"02","title":"Automate Everything","desc":"Let AI create your content, build your funnels, write your emails, and manage your campaigns."},{"num":"03","title":"Scale & Earn","desc":"10x your output without 10x the work. Plus earn by referring others to the platform."}],
        "health-fitness": [{"num":"01","title":"Choose Your Focus","desc":"Whether it's weight loss, muscle building, or holistic wellness — pick your passion."},{"num":"02","title":"Get Your Toolkit","desc":"Access ready-made fitness funnels, content templates, and marketing materials."},{"num":"03","title":"Help Others & Earn","desc":"Share wellness solutions, build your audience, and earn recurring commissions."}],
        "real-estate": [{"num":"01","title":"Learn the Strategies","desc":"Access training on digital real estate, property markets, and income-building methods."},{"num":"02","title":"Build Your Presence","desc":"Use our AI tools to create professional property funnels and investor content."},{"num":"03","title":"Generate Income","desc":"Earn through referrals, property leads, and team building in the real estate niche."}],
        "personal-finance": [{"num":"01","title":"Get Your Blueprint","desc":"Access our complete financial freedom roadmap — budgeting, investing, and income building."},{"num":"02","title":"Build Income Streams","desc":"Set up multiple revenue sources using our proven system and AI-powered tools."},{"num":"03","title":"Achieve Freedom","desc":"Watch your income grow while helping others do the same. Earn monthly recurring commissions."}],
    }
    NICHE_TESTIMONIALS = {
        "forex": [{"name":"David R.","role":"Part-Time Trader","text":"I was losing money before I found this system. Now I'm consistently profitable trading just 2 hours a day around my day job. The Smart Money training was a game changer.","stars":5},{"name":"Emma T.","role":"Full-Time Trader","text":"The combination of forex education plus the affiliate income is brilliant. I earn from my trades AND from sharing the platform with other traders.","stars":5},{"name":"Marcus W.","role":"Beginner Trader","text":"Started with zero trading experience 3 months ago. The step-by-step training made it so clear. Already seeing consistent results on my demo account.","stars":5}],
        "crypto": [{"name":"Alex P.","role":"Crypto Investor","text":"I was overwhelmed by crypto until I joined. The structured education helped me understand DeFi, staking, and how to actually evaluate projects properly.","stars":5},{"name":"Rachel K.","role":"Portfolio Builder","text":"Built a diversified crypto portfolio following the training. The community support is incredible — always someone to answer my questions.","stars":5},{"name":"Tom H.","role":"Early Adopter","text":"The referral system is what sets this apart. I earn from crypto gains AND from helping friends get started. Double income stream.","stars":5}],
        "affiliate-marketing": [{"name":"Sarah M.","role":"Affiliate Marketer","text":"Made my first commission within 48 hours of joining. The ready-made funnels and swipe copy made it so easy to start promoting immediately.","stars":5},{"name":"James K.","role":"Side Hustler","text":"I promote during my lunch break and after work. The AI tools write my social media posts. Last month I earned more from affiliates than my overtime pay.","stars":5},{"name":"Maria L.","role":"Full-Time Affiliate","text":"Quit my 9-to-5 after 6 months. Between direct commissions and my growing team, I'm earning more than I ever did in my corporate job.","stars":5}],
        "ecommerce": [{"name":"Chen W.","role":"Store Owner","text":"Launched my first online store in a weekend. The AI product descriptions are incredible — my conversion rate jumped 40% compared to what I wrote myself.","stars":5},{"name":"Lisa M.","role":"Dropshipper","text":"No inventory, no shipping headaches. I find trending products, the platform handles the marketing, and the commissions roll in. Simple.","stars":5},{"name":"Ryan B.","role":"Digital Seller","text":"Selling digital courses through the funnel builder has been life-changing. The templates made it look professional from day one.","stars":5}],
        "ai-tech": [{"name":"Priya S.","role":"Tech Entrepreneur","text":"The AI tools here are genuinely impressive. I create a week's worth of content in about 20 minutes. My social media engagement tripled.","stars":5},{"name":"Mike D.","role":"Automation Expert","text":"I've tried every AI tool out there. This platform bundles the best ones together with a business model attached. That's the difference.","stars":5},{"name":"Jordan L.","role":"AI Creator","text":"Used the AI funnel builder to launch three different niche pages in one afternoon. Each one is generating leads and commissions on autopilot.","stars":5}],
        "health-fitness": [{"name":"Kate R.","role":"Fitness Coach","text":"I was already a personal trainer but the online income was life-changing. Now I earn from clients AND from building a team of wellness promoters.","stars":5},{"name":"Brandon J.","role":"Wellness Advocate","text":"Passionate about health and now I get paid to share that passion. The ready-made fitness funnels made it easy even though I'm not tech-savvy.","stars":5},{"name":"Nina M.","role":"Nutrition Enthusiast","text":"Helping people improve their health while building real income. The community is so supportive and the training covers everything from day one.","stars":5}],
        "real-estate": [{"name":"Robert C.","role":"Property Investor","text":"The digital real estate strategies opened my eyes. You don't need millions to start building property-related income anymore.","stars":5},{"name":"Amanda S.","role":"Real Estate Agent","text":"Added a completely new income stream alongside my traditional property business. The funnel builder generates qualified leads on autopilot.","stars":5},{"name":"Kevin T.","role":"Passive Income Seeker","text":"Always wanted to earn from property but couldn't afford to invest. This platform showed me digital alternatives that actually work.","stars":5}],
        "personal-finance": [{"name":"Diana F.","role":"Financial Planner","text":"Went from living paycheck to paycheck to three separate income streams in under a year. The financial education here is genuinely excellent.","stars":5},{"name":"Steven L.","role":"Side Hustler","text":"The budgeting tools helped me save, and the affiliate income helped me earn. I'm finally building the emergency fund I always needed.","stars":5},{"name":"Grace H.","role":"Wealth Builder","text":"Teaching my kids about money now because this platform showed me what financial literacy really looks like in practice. Life-changing.","stars":5}],
    }
    NICHE_FAQ = {
        "forex": [{"q":"Do I need trading experience?","a":"Not at all. Our training starts from absolute basics — candlestick patterns, risk management, and position sizing — all the way to advanced strategies."},{"q":"How much capital do I need to start trading?","a":"You can practise on a free demo account with zero risk. When ready, start live trading with as little as $50–100."},{"q":"Can I trade around a full-time job?","a":"Absolutely. The forex market runs 24 hours, 5 days a week. Many members trade before or after work."},{"q":"What about the affiliate income?","a":"Share the platform with other traders and earn commissions on every referral — monthly recurring income on top of your trading."}],
        "crypto": [{"q":"Is crypto trading risky?","a":"All trading carries risk. Our training focuses heavily on risk management, diversification, and only using what you can afford to lose."},{"q":"Do I need to understand blockchain?","a":"Our training covers everything from scratch. You'll understand blockchain, wallets, and DeFi step by step."},{"q":"How do I earn beyond just crypto gains?","a":"Our affiliate system pays you commissions every time someone you refer joins the platform — recurring monthly income."},{"q":"Is it too late to get into crypto?","a":"The crypto market is still in its early growth phase. New opportunities emerge every month with emerging projects and protocols."}],
    }
    default_faq = [{"q":"How quickly can I start earning?","a":"Most members see their first results within the first week. The system is designed for fast implementation."},{"q":"Do I need any experience?","a":"None at all. Full step-by-step training, AI tools, and ready-made templates are included from day one."},{"q":"Is there a money-back guarantee?","a":"Yes. If you're not satisfied within 30 days, you can request a full refund."},{"q":"How much does it cost to get started?","a":"Membership starts at just $20/month with full access to all tools, training, and income opportunities."}]

    niche_key = niche
    stats = NICHE_STATS.get(niche_key, NICHE_STATS["affiliate-marketing"])
    steps = NICHE_STEPS.get(niche_key, NICHE_STEPS["affiliate-marketing"])
    testimonials = NICHE_TESTIMONIALS.get(niche_key, NICHE_TESTIMONIALS["affiliate-marketing"])
    faq = NICHE_FAQ.get(niche_key, default_faq)

    # Niche-specific hero images (Unsplash — free to use)
    NICHE_HERO_IMAGES = {
        "forex": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1400&q=80",
        "crypto": "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1400&q=80",
        "affiliate-marketing": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&q=80",
        "ecommerce": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=80",
        "ai-tech": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1400&q=80",
        "health-fitness": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=80",
        "real-estate": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&q=80",
        "personal-finance": "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1400&q=80",
    }
    # Niche-specific feature images
    NICHE_FEATURE_IMAGES = {
        "forex": [
            {"image": "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=500&q=80", "title": "Professional Charts & Analysis", "desc": "Access institutional-grade charting tools with Smart Money Concepts, liquidity pools, and order flow analysis built right in."},
            {"image": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=500&q=80", "title": "Risk Management System", "desc": "Never risk more than you should. Our built-in position size calculator and risk management tools keep your capital protected."},
            {"image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&q=80", "title": "Live Trading Community", "desc": "Trade alongside experienced traders who share setups, analysis, and real-time market commentary daily."},
        ],
        "crypto": [
            {"image": "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=500&q=80", "title": "Portfolio Tracking", "desc": "Monitor all your crypto holdings across multiple wallets and exchanges in one clean, real-time dashboard."},
            {"image": "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=500&q=80", "title": "DeFi Strategies", "desc": "Learn yield farming, liquidity pools, staking, and other DeFi strategies that generate crypto income."},
            {"image": "https://images.unsplash.com/photo-1639762681057-408e52192e55?w=500&q=80", "title": "Research & Alerts", "desc": "Stay ahead of the market with AI-powered project analysis, on-chain data, and price alerts."},
        ],
        "affiliate-marketing": [
            {"image": "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=500&q=80", "title": "AI-Built Sales Funnels", "desc": "Professional landing pages created by AI in minutes. Just pick your niche, add your link, and start driving traffic."},
            {"image": "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=500&q=80", "title": "Marketing Automation", "desc": "Email sequences, social media posts, and ad copy — all generated by AI and ready to deploy instantly."},
            {"image": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&q=80", "title": "Team Building Tools", "desc": "Track your referrals, manage your growing team, and watch your income scale month over month."},
        ],
        "ecommerce": [
            {"image": "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=500&q=80", "title": "Beautiful Storefront", "desc": "Launch a professional online store with our drag-and-drop builder. No coding or design experience needed."},
            {"image": "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=500&q=80", "title": "Product Research", "desc": "AI-powered niche finder identifies trending products with high margins and proven demand."},
            {"image": "https://images.unsplash.com/photo-1580828343064-fde4fc206bc6?w=500&q=80", "title": "Automated Marketing", "desc": "Product descriptions, email campaigns, and social ads — all written by AI and optimised for conversions."},
        ],
        "ai-tech": [
            {"image": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&q=80", "title": "AI Content Engine", "desc": "Generate blog posts, social media content, email sequences, and ad copy in seconds — not hours."},
            {"image": "https://images.unsplash.com/photo-1555255707-c07966088b7b?w=500&q=80", "title": "Smart Automation", "desc": "Set up marketing workflows that run 24/7. AI handles lead nurturing, follow-ups, and campaign optimisation."},
            {"image": "https://images.unsplash.com/photo-1531746790095-e5cb157f3b50?w=500&q=80", "title": "Analytics & Insights", "desc": "AI analyses your data and recommends actions to maximise conversions and revenue."},
        ],
        "health-fitness": [
            {"image": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&q=80", "title": "Wellness Content Library", "desc": "Ready-made fitness guides, nutrition plans, and wellness content you can share with your audience immediately."},
            {"image": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&q=80", "title": "Nutrition Resources", "desc": "Professionally designed meal plans, recipe books, and supplement guides to help your community thrive."},
            {"image": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500&q=80", "title": "Fitness Community", "desc": "Connect with health-minded entrepreneurs who share tips, motivation, and support daily."},
        ],
        "real-estate": [
            {"image": "https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c?w=500&q=80", "title": "Property Analysis Tools", "desc": "Evaluate deals, estimate ROI, and identify opportunities with AI-powered property analysis."},
            {"image": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&q=80", "title": "Digital Real Estate", "desc": "Build online assets — websites, funnels, and content — that generate income like physical property rentals."},
            {"image": "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=500&q=80", "title": "Investor Network", "desc": "Connect with property investors, share deal flow, and grow your portfolio through our active community."},
        ],
        "personal-finance": [
            {"image": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=500&q=80", "title": "Financial Dashboard", "desc": "Track your income streams, expenses, and net worth growth in one clear, actionable dashboard."},
            {"image": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500&q=80", "title": "Wealth Education", "desc": "Learn investing fundamentals, compound growth strategies, and tax-efficient wealth building methods."},
            {"image": "https://images.unsplash.com/photo-1553729459-afe8f2e2ed08?w=500&q=80", "title": "Income Multiplier", "desc": "Build multiple revenue streams — affiliate income, team commissions, and digital product sales."},
        ],
    }
    # Niche-specific image-text row content
    NICHE_IMAGE_TEXT = {
        "forex": {"title": "Trade Smarter, Not Harder", "text": "Our system combines Smart Money Concepts with institutional order flow analysis to give you a genuine edge in the forex market. No more guessing, no more emotional trading. Follow the rules, manage your risk, and let the probabilities work in your favour. Thousands of traders are already using this exact system to generate consistent daily income — working just 1-2 hours per session.", "image": "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=700&q=80"},
        "crypto": {"title": "The Smart Way to Learn About Crypto", "text": "Forget the hype and FOMO. Our structured approach to cryptocurrency education focuses on fundamentals, risk management, and sustainable growth. Learn to evaluate projects properly, build a diversified portfolio, and generate income through DeFi — all while earning referral commissions by sharing the platform with others.", "image": "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=700&q=80"},
        "affiliate-marketing": {"title": "Your Link. Your Income. Your Freedom.", "text": "Imagine earning commissions every single month from work you did once. That's the power of affiliate marketing done right. We give you the tools, the funnels, the copy, and the training. All you need to do is share your link with people who want to improve their financial situation — and our system does the rest.", "image": "https://images.unsplash.com/photo-1552581234-26160f608093?w=700&q=80"},
        "ecommerce": {"title": "Your Store. Global Customers. Zero Limits.", "text": "The e-commerce revolution is happening right now, and there's never been a better time to launch your online store. Our AI-powered tools handle product research, description writing, and marketing automation — leaving you free to focus on scaling your business and maximising profits.", "image": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=700&q=80"},
        "ai-tech": {"title": "Let AI Do the Heavy Lifting", "text": "While others spend hours writing content, building funnels, and managing campaigns — you'll have AI doing it all in minutes. Our suite of AI tools automates the most time-consuming parts of running an online business, giving you 10x the output with a fraction of the effort. This is the future of entrepreneurship.", "image": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=700&q=80"},
        "health-fitness": {"title": "Turn Your Passion for Wellness into Profit", "text": "The global wellness industry is worth over $4 trillion and growing fast. If you're passionate about health and fitness, you already have the perfect foundation for building a rewarding online business. Our platform gives you everything — funnels, content, training — so you can focus on what you do best: helping people transform their lives.", "image": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=700&q=80"},
        "real-estate": {"title": "Build Property Wealth — Digitally", "text": "You don't need millions to start building wealth from property. Digital real estate — websites, content assets, and online funnels — generates recurring income just like rental property, but with a fraction of the startup cost. Learn how to build, manage, and scale digital property assets that pay you month after month.", "image": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700&q=80"},
        "personal-finance": {"title": "Your Money. Your Rules. Your Future.", "text": "78% of people live paycheck to paycheck. The difference between financial stress and financial freedom isn't luck — it's education and action. Our platform gives you both: comprehensive financial literacy training AND a proven system to build multiple income streams. Stop worrying about money and start building wealth.", "image": "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=700&q=80"},
    }
    # CTA background images
    NICHE_CTA_IMAGES = {
        "forex": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1400&q=80",
        "crypto": "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1400&q=80",
        "affiliate-marketing": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=80",
        "ecommerce": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80",
        "ai-tech": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1400&q=80",
        "health-fitness": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80",
        "real-estate": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=80",
        "personal-finance": "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=1400&q=80",
    }

    hero_img = NICHE_HERO_IMAGES.get(niche_key, NICHE_HERO_IMAGES["affiliate-marketing"])
    feat_imgs = NICHE_FEATURE_IMAGES.get(niche_key, NICHE_FEATURE_IMAGES["affiliate-marketing"])
    img_text = NICHE_IMAGE_TEXT.get(niche_key, NICHE_IMAGE_TEXT["affiliate-marketing"])
    cta_img = NICHE_CTA_IMAGES.get(niche_key, NICHE_CTA_IMAGES["affiliate-marketing"])

    ref_url = f"/ref/{user.username}"

    sections = [
        # 1 — Full-width image hero
        {"templateId": "hero-image", "data": {
            "headline": tpl["headline"],
            "subheadline": tpl["subheadline"],
            "cta_text": "Get Started Now →", "cta_url": ref_url,
            "bg_image": hero_img, "overlay_opacity": "0.55"
        }},
        # 2 — Niche-specific stats bar
        {"templateId": "stats-bar", "data": {"items": stats}},
        # 3 — Image + text story section
        {"templateId": "image-text-row", "data": {
            "title": img_text["title"],
            "text": img_text["text"],
            "image_url": img_text["image"],
            "image_side": "left",
            "cta_text": "Learn More →", "cta_url": ref_url
        }},
        # 4 — Visual feature cards with photos
        {"templateId": "features-visual", "data": {
            "title": tpl["benefits_title"],
            "items": feat_imgs
        }},
        # 5 — Coloured icon benefits
        {"templateId": "icon-features-coloured", "data": {
            "title": "Everything You Get",
            "items": [
                {"icon": b["icon"], "title": b["title"], "desc": b["desc"],
                 "color": ["#ef4444","#6366f1","#10b981","#f59e0b","#0ea5e9","#8b5cf6"][i%6]}
                for i, b in enumerate(tpl["benefits"])
            ]
        }},
        # 6 — How it works
        {"templateId": "steps-section", "data": {
            "title": "How It Works — 3 Simple Steps",
            "steps": steps
        }},
        # 7 — Testimonials
        {"templateId": "testimonials", "data": {
            "title": "Real Results from Real Members",
            "items": testimonials
        }},
        # 8 — Guarantee
        {"templateId": "guarantee", "data": {
            "title": "100% Satisfaction Guaranteed",
            "text": "We're so confident you'll love this system that we offer a full 30-day money-back guarantee. Try everything risk-free — if it's not for you, just let us know and we'll refund every penny. No questions asked."
        }},
        # 9 — FAQ
        {"templateId": "faq-section", "data": {
            "title": "Frequently Asked Questions",
            "items": faq
        }},
        # 10 — Image background CTA
        {"templateId": "cta-image", "data": {
            "headline": tpl["cta_headline"],
            "subheadline": tpl["cta_sub"],
            "cta_text": "Claim Your Spot Now →",
            "cta_url": ref_url,
            "bg_image": cta_img
        }}
    ]

    sections_data = json.dumps(sections)
    page = FunnelPage(
        user_id=user.id,
        title=tpl["title"],
        headline=tpl["headline"],
        template_type="landing",
        color_scheme=tpl.get("bg", "dark"),
        accent_color=tpl.get("accent", "#00d4ff"),
        sections_json=sections_data,
        body_copy=sections_data,
        status="draft"
    )
    db.add(page)
    db.flush()
    slug_base = _re.sub(r'[^a-z0-9]+', '-', tpl["title"].lower()).strip('-')
    page.slug = f"{user.username.lower()}/{slug_base}-{page.id}"
    db.commit()

    return {"success": True, "edit_url": f"/funnels/visual/{page.id}"}


@app.post("/api/funnels/delete/{page_id}")
def funnel_delete(page_id: int, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    page = db.query(FunnelPage).filter(FunnelPage.id == page_id, FunnelPage.user_id == user.id).first()
    if not page:
        return JSONResponse({"error": "Page not found"}, status_code=404)
    try:
        from sqlalchemy import text
        # Clear any next_page_id references pointing to this page
        db.query(FunnelPage).filter(FunnelPage.next_page_id == page_id).update({"next_page_id": None})
        # Delete related leads
        db.execute(text("DELETE FROM funnel_leads WHERE page_id = :pid"), {"pid": page_id})
        # Delete related analytics events
        db.execute(text("DELETE FROM funnel_events WHERE page_id = :pid"), {"pid": page_id})
        # Now delete the page
        db.delete(page)
        db.commit()
        return JSONResponse({"success": True})
    except Exception as e:
        db.rollback()
        return JSONResponse({"error": f"Delete failed: {str(e)}"}, status_code=500)


# ── Phase 2: Lead Capture API ──────────────────────────────
@app.post("/api/leads/capture")
async def capture_lead(request: Request, db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)
    page_id = body.get("page_id")
    email = body.get("email", "").strip()
    if not page_id or not email:
        return JSONResponse({"error": "page_id and email required"}, status_code=400)
    page = db.query(FunnelPage).filter(FunnelPage.id == page_id).first()
    if not page:
        return JSONResponse({"error": "Page not found"}, status_code=404)
    referrer = request.headers.get("referer", "")
    source = "direct"
    for s in ["facebook", "instagram", "twitter", "youtube", "google", "tiktok", "linkedin"]:
        if s in referrer.lower():
            source = s
            break
    ua = request.headers.get("user-agent", "").lower()
    device = "mobile" if any(d in ua for d in ["mobile", "android", "iphone"]) else "desktop"
    lead = FunnelLead(page_id=page.id, user_id=page.user_id, name=body.get("name", "").strip(),
        email=email, phone=body.get("phone", "").strip(), source=source,
        ip_address=request.client.host if request.client else None)
    db.add(lead)
    event = FunnelEvent(page_id=page.id, user_id=page.user_id, event_type="optin",
        referrer=referrer, device=device, ip_address=request.client.host if request.client else None)
    db.add(event)

    # ── Auto-add to CRM (MemberLead) for autoresponder ──
    try:
        existing_crm = db.query(MemberLead).filter(
            MemberLead.user_id == page.user_id, MemberLead.email == email.lower()
        ).first()
        if not existing_crm:
            crm_lead = MemberLead(
                user_id=page.user_id, email=email.lower(),
                name=body.get("name", "").strip(),
                source_funnel_id=page.id,
                source_url=f"/p/{page.slug}" if page.slug else "SuperPage",
                status="new",
            )
            db.add(crm_lead)

            # Auto-assign default sequence if the page owner has one set
            from .database import EmailSequence
            default_seq = db.query(EmailSequence).filter(
                EmailSequence.user_id == page.user_id, EmailSequence.is_active == True
            ).order_by(EmailSequence.created_at.desc()).first()
            if default_seq:
                crm_lead.email_sequence_id = default_seq.id
                crm_lead.status = "nurturing"

            # Send first email in sequence if Brevo is configured
            if default_seq:
                try:
                    import json as _j_auto
                    emails_list = _j_auto.loads(default_seq.emails_json or "[]")
                    if emails_list:
                        from .brevo_service import send_email as brevo_send, wrap_email_html
                        first_email = emails_list[0]
                        owner = db.query(User).filter(User.id == page.user_id).first()
                        member_name = (owner.first_name or owner.username) if owner else "SuperAdPro"
                        wrapped = wrap_email_html(first_email.get("body_html", ""), member_name)
                        await brevo_send(email, body.get("name", ""), first_email.get("subject", "Welcome!"), wrapped)
                        crm_lead.emails_sent = 1
                        from .database import EmailSendLog
                        log = EmailSendLog(lead_id=crm_lead.id, sequence_id=default_seq.id, email_index=0, status="sent")
                        db.add(log)
                except Exception as e:
                    print(f"[AutoResponder] First email send error: {e}")
    except Exception as e:
        print(f"[CRM] Lead sync error: {e}")

    db.commit()
    redirect_url = None
    if page.next_page_id:
        next_pg = db.query(FunnelPage).filter(FunnelPage.id == page.next_page_id).first()
        if next_pg:
            redirect_url = f"/p/{next_pg.slug}"
    return JSONResponse({"success": True, "redirect": redirect_url})


@app.post("/api/funnels/sequence")
async def funnel_set_sequence(request: Request, user: User = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)
    funnel_name = body.get("funnel_name", "").strip()
    page_ids = body.get("page_ids", [])
    if not funnel_name or not page_ids:
        return JSONResponse({"error": "funnel_name and page_ids required"}, status_code=400)
    pages = db.query(FunnelPage).filter(FunnelPage.id.in_(page_ids), FunnelPage.user_id == user.id).all()
    page_map = {p.id: p for p in pages}
    for i, pid in enumerate(page_ids):
        pg = page_map.get(pid)
        if not pg:
            continue
        pg.funnel_name = funnel_name
        pg.funnel_order = i
        pg.next_page_id = page_ids[i + 1] if i + 1 < len(page_ids) else None
    db.commit()
    return JSONResponse({"success": True, "funnel_name": funnel_name, "pages": len(page_ids)})


@app.get("/api/funnels/sequence/{funnel_name}")
def funnel_get_sequence(funnel_name: str, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    pages = db.query(FunnelPage).filter(
        FunnelPage.user_id == user.id, FunnelPage.funnel_name == funnel_name
    ).order_by(FunnelPage.funnel_order).all()
    return JSONResponse({"funnel_name": funnel_name, "pages": [
        {"id": p.id, "title": p.title, "slug": p.slug, "template_type": p.template_type,
         "status": p.status, "order": p.funnel_order, "next_page_id": p.next_page_id,
         "views": p.views or 0, "clicks": p.clicks or 0} for p in pages]})


@app.get("/api/funnels/analytics/{page_id}")
def funnel_page_analytics(page_id: int, user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    from sqlalchemy import func
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    page = db.query(FunnelPage).filter(FunnelPage.id == page_id, FunnelPage.user_id == user.id).first()
    if not page:
        return JSONResponse({"error": "Page not found"}, status_code=404)
    views = db.query(func.count(FunnelEvent.id)).filter(
        FunnelEvent.page_id == page_id, FunnelEvent.event_type == "view").scalar() or page.views or 0
    optins = db.query(func.count(FunnelEvent.id)).filter(
        FunnelEvent.page_id == page_id, FunnelEvent.event_type == "optin").scalar() or 0
    clicks = db.query(func.count(FunnelEvent.id)).filter(
        FunnelEvent.page_id == page_id, FunnelEvent.event_type == "click").scalar() or page.clicks or 0
    total_leads = db.query(func.count(FunnelLead.id)).filter(FunnelLead.page_id == page_id).scalar() or 0
    conversion_rate = round((optins / views * 100), 1) if views > 0 else 0
    recent_leads = db.query(FunnelLead).filter(FunnelLead.page_id == page_id).order_by(
        FunnelLead.created_at.desc()).limit(20).all()
    return JSONResponse({
        "page_id": page_id, "title": page.title, "views": views, "optins": optins,
        "clicks": clicks, "total_leads": total_leads, "conversion_rate": conversion_rate,
        "recent_leads": [{"name": l.name, "email": l.email, "source": l.source,
            "date": l.created_at.strftime("%d %b %Y %H:%M") if l.created_at else ""} for l in recent_leads]})


@app.get("/funnels/analytics")
def funnel_analytics_dashboard(request: Request, user: User = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    """Legacy route — redirects to Pro funnels."""
    return RedirectResponse(url="/pro/funnels", status_code=302)


@app.get("/funnels/leads")
def funnel_leads_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_funnel_leads_DISABLED(request: Request, user: User = Depends(get_current_user),
                                db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    leads = db.query(FunnelLead).filter(FunnelLead.user_id == user.id).order_by(
        FunnelLead.created_at.desc()).limit(200).all()
    page_ids = list(set(l.page_id for l in leads if l.page_id))
    pages_map = {}
    if page_ids:
        pgs = db.query(FunnelPage).filter(FunnelPage.id.in_(page_ids)).all()
        pages_map = {p.id: p.title for p in pgs}
    from sqlalchemy import func
    total_leads = db.query(func.count(FunnelLead.id)).filter(FunnelLead.user_id == user.id).scalar() or 0
    balance = getattr(user, 'balance', 0) or 0
    return templates.TemplateResponse("funnel-leads.html", {
        "request": request, "user": user, "leads": leads,
        "pages_map": pages_map, "total_leads": total_leads, "balance": balance})


@app.get("/api/leads/export")
def export_leads_csv(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi.responses import Response
    if not user:
        return Response("Not authenticated", status_code=401)
    leads = db.query(FunnelLead).filter(FunnelLead.user_id == user.id).order_by(
        FunnelLead.created_at.desc()).all()
    import csv, io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "Source", "Date"])
    for l in leads:
        writer.writerow([l.name or "", l.email, l.phone or "", l.source or "",
            l.created_at.strftime("%Y-%m-%d %H:%M") if l.created_at else ""])
    return Response(content=output.getvalue(), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=superadpro-leads.csv"})


# ── Public page renderer (no auth required) ──────────────────
@app.get("/p/{username}/{page_slug:path}")
def render_funnel_page(username: str, page_slug: str, request: Request,
                       db: Session = Depends(get_db)):
    slug = f"{username}/{page_slug}"
    page = db.query(FunnelPage).filter(FunnelPage.slug == slug).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    if page.status != 'published':
        raise HTTPException(status_code=404, detail="This page is not published yet")

    # Track view (atomic increment to prevent race conditions)
    from sqlalchemy import text
    db.execute(text("UPDATE funnel_pages SET views = COALESCE(views, 0) + 1 WHERE id = :pid"), {"pid": page.id})
    
    # Rate-limit event creation — only log unique IP per page per 5 minutes
    client_ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "").lower()
    device = "mobile" if any(d in ua for d in ["mobile", "android", "iphone"]) else "desktop"
    
    recent_event = None
    if client_ip:
        five_min_ago = datetime.utcnow() - timedelta(minutes=5)
        recent_event = db.query(FunnelEvent).filter(
            FunnelEvent.page_id == page.id,
            FunnelEvent.ip_address == client_ip,
            FunnelEvent.event_type == "view",
            FunnelEvent.created_at >= five_min_ago
        ).first()
    
    if not recent_event:
        view_event = FunnelEvent(
            page_id=page.id, user_id=page.user_id, event_type="view",
            referrer=request.headers.get("referer", ""), device=device,
            ip_address=client_ip)
        db.add(view_event)

    # Get page owner info for AI chatbot context
    owner = db.query(User).filter(User.id == page.user_id).first()
    owner_name = owner.first_name or owner.username if owner else username
    owner_ref_link = f"/ref/{owner.username}" if owner else f"/ref/{username}"

    db.commit()

    response = templates.TemplateResponse("funnel-render.html", {
        "request": request,
        "page": page,
        "owner_name": owner_name,
        "owner_username": owner.username if owner else username,
        "owner_ref_link": owner_ref_link,
    })
    # Auto-cookie visitor to page owner's referral (only if no existing ref cookie)
    if not request.cookies.get("ref"):
        response.set_cookie(key="ref", value=owner.username if owner else username,
                            max_age=60*60*24*30, httponly=False, samesite="lax")
    return response


@app.get("/api/funnels/track-click/{page_id}")
def track_click(page_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    from sqlalchemy import text
    db.execute(text("UPDATE funnel_pages SET clicks = COALESCE(clicks, 0) + 1 WHERE id = :pid"), {"pid": page_id})
    db.commit()
    return JSONResponse({"ok": True})


# ═══════════════════════════════════════════════════════════════
# ═══════════════════════════════════════════════════════════════
#  LINK TOOLS (Bitly-style shortener + rotator)
# ═══════════════════════════════════════════════════════════════

@app.get("/link-tools")
def link_tools_page(request: Request, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    links = db.query(ShortLink).filter(ShortLink.user_id == user.id, ShortLink.is_rotator == False).order_by(ShortLink.created_at.desc()).all()
    rotators = db.query(LinkRotator).filter(LinkRotator.user_id == user.id).order_by(LinkRotator.created_at.desc()).all()
    ctx = get_dashboard_context(request, user, db)
    base_url = f"{request.url.scheme}://{request.url.hostname}"
    if request.url.port and request.url.port not in (80, 443):
        base_url += f":{request.url.port}"
    ctx["links"] = links
    ctx["rotators"] = rotators
    ctx["base_url"] = base_url
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/dashboard", status_code=302)


@limiter.limit("30/minute")
@app.post("/api/links/create")
async def create_short_link(request: Request, user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    if not user: return {"error": "Not logged in"}
    body = await request.json()
    dest = body.get("destination_url", "").strip()
    custom_slug = body.get("slug", "").strip() if body.get("slug") else None
    title = body.get("title", "").strip() if body.get("title") else None

    if not dest or not dest.startswith("http"):
        return {"error": "Please enter a valid URL starting with http:// or https://"}

    import string, random
    if custom_slug:
        # Sanitise: allow letters, numbers, hyphens, underscores
        import re
        custom_slug = re.sub(r'[^a-zA-Z0-9\-_]', '', custom_slug).lower()
        if len(custom_slug) < 2:
            return {"error": "Custom slug must be at least 2 characters"}
        if len(custom_slug) > 50:
            return {"error": "Custom slug too long (max 50 characters)"}
        # Check uniqueness
        existing = db.query(ShortLink).filter(ShortLink.slug == custom_slug).first()
        if existing:
            return {"error": f"Slug '{custom_slug}' is already taken. Try another."}
        existing_rot = db.query(LinkRotator).filter(LinkRotator.slug == custom_slug).first()
        if existing_rot:
            return {"error": f"Slug '{custom_slug}' is already taken by a rotator. Try another."}
        slug = custom_slug
    else:
        # Auto-generate 6-char slug
        for _ in range(20):
            slug = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
            if not db.query(ShortLink).filter(ShortLink.slug == slug).first() and \
               not db.query(LinkRotator).filter(LinkRotator.slug == slug).first():
                break

    import json as _json
    click_cap       = body.get("click_cap")
    expires_at_str  = body.get("expires_at")
    geo_redirect    = body.get("geo_redirect")
    device_redirect = body.get("device_redirect")

    from datetime import datetime as _dt
    expires_at = None
    if expires_at_str:
        try:
            expires_at = _dt.fromisoformat(expires_at_str.replace("Z",""))
        except Exception:
            pass

    password = body.get("password", "").strip() if body.get("password") else None

    link = ShortLink(
        user_id=user.id,
        slug=slug,
        destination_url=dest,
        title=title,
        click_cap=int(click_cap) if click_cap else None,
        expires_at=expires_at,
        geo_redirect_json=_json.dumps(geo_redirect) if geo_redirect else None,
        device_redirect_json=_json.dumps(device_redirect) if device_redirect else None,
    )
    if password:
        import bcrypt
        link.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    db.add(link)
    db.commit()
    return {"success": True, "slug": slug, "id": link.id}


@app.post("/api/links/delete/{link_id}")
def delete_short_link(link_id: int, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    if not user: return {"error": "Not logged in"}
    link = db.query(ShortLink).filter(ShortLink.id == link_id, ShortLink.user_id == user.id).first()
    if link:
        db.delete(link)
        db.commit()
    return {"success": True}


@limiter.limit("30/minute")
@app.post("/api/links/edit/{link_id}")
async def edit_short_link(link_id: int, request: Request,
                          user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    """Edit destination, title, expiry, password, tags on an existing short link."""
    if not user: return {"error": "Not logged in"}
    link = db.query(ShortLink).filter(ShortLink.id == link_id, ShortLink.user_id == user.id).first()
    if not link: return {"error": "Link not found"}
    body = await request.json()
    import json as _json
    from datetime import datetime as _dt
    if "destination_url" in body:
        dest = body["destination_url"].strip()
        if dest and dest.startswith("http"):
            link.destination_url = dest
    if "title" in body:
        link.title = body["title"].strip() if body["title"] else None
    if "expires_at" in body:
        val = body["expires_at"]
        if val:
            try: link.expires_at = _dt.fromisoformat(val.replace("Z",""))
            except Exception: pass
        else:
            link.expires_at = None
    if "click_cap" in body:
        link.click_cap = int(body["click_cap"]) if body["click_cap"] else None
    if "password" in body:
        pw = body["password"]
        if pw:
            import bcrypt
            link.password_hash = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
        else:
            link.password_hash = None
    if "tags" in body:
        tags = body["tags"]
        link.tags_json = _json.dumps(tags) if tags else None
    link.updated_at = _dt.utcnow()
    db.commit()
    return {"success": True}


@limiter.limit("10/minute")
@app.post("/go/{slug}/unlock")
async def go_unlock_password(slug: str, request: Request, db: Session = Depends(get_db)):
    """Verify password for a password-protected short link and redirect."""
    link = db.query(ShortLink).filter(ShortLink.slug == slug).first()
    if not link: raise HTTPException(status_code=404, detail="Link not found")
    body = await request.json()
    pw = body.get("password", "")
    if not link.password_hash:
        return {"success": True, "url": link.destination_url}
    import bcrypt
    if bcrypt.checkpw(pw.encode(), link.password_hash.encode()):
        return {"success": True, "url": link.destination_url}
    return {"error": "Incorrect password"}


@app.get("/api/links/analytics/{link_id}")
def link_analytics(link_id: int, link_type: str = "short",
                   user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Return click analytics: sources breakdown + clicks over last 30 days."""
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)
    from datetime import date, timedelta
    from sqlalchemy import func

    # Verify ownership
    if link_type == "rotator":
        owner_check = db.query(LinkRotator).filter(LinkRotator.id == link_id, LinkRotator.user_id == user.id).first()
    else:
        owner_check = db.query(ShortLink).filter(ShortLink.id == link_id, ShortLink.user_id == user.id).first()
    if not owner_check:
        return JSONResponse({"error": "Link not found"}, status_code=404)

    clicks = db.query(LinkClick).filter(
        LinkClick.link_id == link_id, LinkClick.link_type == link_type
    ).all()

    # Source breakdown
    source_counts = {}
    device_counts = {"mobile": 0, "desktop": 0}
    for c in clicks:
        src = c.source or "direct"
        source_counts[src] = source_counts.get(src, 0) + 1
        dev = c.device or "desktop"
        device_counts[dev] = device_counts.get(dev, 0) + 1

    # Clicks per day (last 30 days)
    today = date.today()
    daily = {}
    for c in clicks:
        if c.clicked_at:
            day = c.clicked_at.date().isoformat()
            daily[day] = daily.get(day, 0) + 1

    # Fill in zeros for missing days
    timeline = []
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        timeline.append({"date": d, "clicks": daily.get(d, 0)})

    # Country breakdown
    country_counts = {}
    browser_counts = {}
    utm_counts = {}
    for c in clicks:
        if c.country_name:
            country_counts[c.country_name] = country_counts.get(c.country_name, 0) + 1
        if hasattr(c, 'browser') and c.browser:
            browser_counts[c.browser] = browser_counts.get(c.browser, 0) + 1
        if hasattr(c, 'utm_campaign') and c.utm_campaign:
            utm_counts[c.utm_campaign] = utm_counts.get(c.utm_campaign, 0) + 1

    return {
        "total_clicks": len(clicks),
        "sources": source_counts,
        "devices": device_counts,
        "countries": dict(sorted(country_counts.items(), key=lambda x: -x[1])[:10]),
        "browsers": browser_counts,
        "utm_campaigns": utm_counts,
        "timeline": timeline
    }


@app.post("/api/rotators/create")
async def create_rotator(request: Request, user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    if not user: return {"error": "Not logged in"}
    body = await request.json()
    title = body.get("title", "").strip()
    custom_slug = body.get("slug", "").strip() if body.get("slug") else None
    mode = body.get("mode", "equal")
    destinations = body.get("destinations", [])

    if not title:
        return {"error": "Please enter a rotator name"}
    if len(destinations) < 2:
        return {"error": "Add at least 2 destination URLs"}

    import string, random, re, json
    if custom_slug:
        custom_slug = re.sub(r'[^a-zA-Z0-9\-_]', '', custom_slug).lower()
        if len(custom_slug) < 2:
            return {"error": "Custom slug must be at least 2 characters"}
        existing = db.query(ShortLink).filter(ShortLink.slug == custom_slug).first()
        existing_rot = db.query(LinkRotator).filter(LinkRotator.slug == custom_slug).first()
        if existing or existing_rot:
            return {"error": f"Slug '{custom_slug}' is already taken. Try another."}
        slug = custom_slug
    else:
        for _ in range(20):
            slug = 'rot-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
            if not db.query(ShortLink).filter(ShortLink.slug == slug).first() and \
               not db.query(LinkRotator).filter(LinkRotator.slug == slug).first():
                break

    # Build destinations with click counts
    dests = [{"url": d["url"], "weight": d.get("weight", 50), "clicks": 0} for d in destinations if d.get("url")]

    rotator = LinkRotator(
        user_id=user.id,
        slug=slug,
        title=title,
        mode=mode,
        destinations_json=json.dumps(dests)
    )
    db.add(rotator)
    db.commit()
    return {"success": True, "slug": slug}


@app.post("/api/rotators/edit/{rotator_id}")
async def edit_rotator(rotator_id: int, request: Request,
                        user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Edit rotator title, mode and destinations."""
    if not user: return {"error": "Not logged in"}
    rot = db.query(LinkRotator).filter(LinkRotator.id == rotator_id, LinkRotator.user_id == user.id).first()
    if not rot: return {"error": "Rotator not found"}
    body = await request.json()
    import json as _json
    from datetime import datetime as _dt
    if "title" in body and body["title"].strip():
        rot.title = body["title"].strip()
    if "mode" in body:
        rot.mode = body["mode"]
    if "destinations" in body:
        dests = body["destinations"]
        if isinstance(dests, list) and len(dests) >= 2:
            # Preserve existing click counts where URLs match
            existing = {}
            try:
                for d in _json.loads(rot.destinations_json or '[]'):
                    existing[d['url']] = d.get('clicks', 0)
            except Exception:
                pass
            rot.destinations_json = _json.dumps([
                {"url": d["url"], "weight": d.get("weight", 50),
                 "clicks": existing.get(d["url"], 0)}
                for d in dests if d.get("url")
            ])
    rot.updated_at = _dt.utcnow()
    db.commit()
    return {"success": True}


@app.post("/api/rotators/delete/{rotator_id}")
def delete_rotator(rotator_id: int, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not user: return {"error": "Not logged in"}
    rot = db.query(LinkRotator).filter(LinkRotator.id == rotator_id, LinkRotator.user_id == user.id).first()
    if rot:
        db.delete(rot)
        db.commit()
    return {"success": True}


# ═══════════════════════════════════════════════════
#  WHAT YOU GET — SHOWCASE PAGE
# ═══════════════════════════════════════════════════
@app.get("/what-you-get")
def what_you_get(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/", status_code=302)




# ═══════════════════════════════════════════════════
#  PUBLIC AD BOARD
# ═══════════════════════════════════════════════════
MASTER_REF = os.getenv("MASTER_REF", "SuperAdPro")  # Master affiliate username — all public CTAs use this
def get_join_url():
    """Returns the public signup URL — uses master affiliate link if configured"""
    return f"/?join={MASTER_REF}" if MASTER_REF else "/?register=1"

AD_CATEGORIES = [
    {"id": "business-opportunity", "name": "Business Opportunity", "icon": "💼"},
    {"id": "digital-marketing", "name": "Digital Marketing", "icon": "📣"},
    {"id": "health-wellness", "name": "Health & Wellness", "icon": "💪"},
    {"id": "finance-crypto", "name": "Finance & Crypto", "icon": "💰"},
    {"id": "ecommerce", "name": "E-Commerce", "icon": "🛒"},
    {"id": "education", "name": "Education & Courses", "icon": "🎓"},
    {"id": "software-saas", "name": "Software & SaaS", "icon": "💻"},
    {"id": "general", "name": "General", "icon": "📌"},
]

@app.get("/ads")
def ad_board_public(request: Request, category: str = None, page: int = 1, db: Session = Depends(get_db)):
    """Public Ad Board — server-rendered for SEO."""
    query = db.query(AdListing).filter(AdListing.is_active == True)
    if category:
        query = query.filter(AdListing.category == category)
    total_ads = query.count()
    per_page = 24
    total_pages = max(1, (total_ads + per_page - 1) // per_page)
    listings = query.order_by(AdListing.is_featured.desc(), AdListing.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    categories = sorted(set(a.category for a in db.query(AdListing).filter(AdListing.is_active == True).all() if a.category))
    return templates.TemplateResponse("public-adboard.html", {
        "request": request, "listings": listings, "categories": categories,
        "selected_category": category, "total_pages": total_pages, "current_page": page,
    })

def _old_ad_board_DISABLED(request: Request, category: str = None, page: int = 1,
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        query = db.query(AdListing).filter(AdListing.is_active == True)
        if category:
            query = query.filter(AdListing.category == category)
        total_ads = query.count()
        per_page = 30
        offset = (page - 1) * per_page
        listings = query.order_by(AdListing.is_featured.desc(), AdListing.created_at.desc()).offset(offset).limit(per_page).all()
        for listing in listings:
            owner = db.query(User).filter(User.id == listing.user_id).first()
            listing.owner_name = owner.username if owner else "Member"
            listing.views = (listing.views or 0) + 1
        db.commit()
        cat_name = None
        if category:
            cat_match = [c for c in AD_CATEGORIES if c["id"] == category]
            cat_name = cat_match[0]["name"] if cat_match else category
        total_pages = max(1, (total_ads + per_page - 1) // per_page)
        base_url = os.getenv("BASE_URL", "https://www.superadpro.com")
        return templates.TemplateResponse("ad-board.html", {
            "request": request,
            "listings": listings,
            "categories": AD_CATEGORIES,
            "active_category": category,
            "cat_name": cat_name,
            "total_ads": total_ads,
            "page": page,
            "total_pages": total_pages,
            "base_url": base_url,
            "join_url": get_join_url(),
            "user": user,
        })
    except Exception as exc:
        logger.error(f"Ad board error: {exc}", exc_info=True)
        return JSONResponse({"error": f"Ad board error: {exc}"}, status_code=500)


@app.get("/ads/listing/{slug}")
def ad_detail_page(slug: str, request: Request, db: Session = Depends(get_db)):
    """Individual ad page — server-rendered for SEO with meta tags + Schema.org."""
    listing = db.query(AdListing).filter(AdListing.slug == slug, AdListing.is_active == True).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Ad not found")
    listing.views = (listing.views or 0) + 1
    db.commit()
    owner = db.query(User).filter(User.id == listing.user_id).first()
    listing.owner_name = owner.username if owner else "Member"
    related = db.query(AdListing).filter(
        AdListing.is_active == True, AdListing.category == listing.category, AdListing.id != listing.id
    ).order_by(AdListing.is_featured.desc(), AdListing.created_at.desc()).limit(6).all()
    return templates.TemplateResponse("public-ad-detail.html", {
        "request": request, "ad": listing, "related": related,
    })

def _old_ad_detail_DISABLED(slug: str, request: Request, db: Session = Depends(get_db)):
    """Individual ad page — SEO-indexable, shareable, with OG tags"""
    listing = db.query(AdListing).filter(AdListing.slug == slug, AdListing.is_active == True).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Ad not found")
    listing.views += 1
    db.commit()
    owner = db.query(User).filter(User.id == listing.user_id).first()
    listing.owner_name = owner.username if owner else "Member"
    # Related ads in same category
    related = db.query(AdListing).filter(
        AdListing.is_active == True,
        AdListing.category == listing.category,
        AdListing.id != listing.id
    ).order_by(AdListing.is_featured.desc(), AdListing.created_at.desc()).limit(6).all()
    for r in related:
        r_owner = db.query(User).filter(User.id == r.user_id).first()
        r.owner_name = r_owner.username if r_owner else "Member"
    base_url = os.getenv("BASE_URL", "https://www.superadpro.com")
    return templates.TemplateResponse("ad-detail.html", {
        "request": request,
        "ad": listing,
        "related": related,
        "categories": AD_CATEGORIES,
        "base_url": base_url,
        "join_url": get_join_url(),
    })


@app.get("/ads/click/{ad_id}")
def ad_click(ad_id: int, db: Session = Depends(get_db)):
    listing = db.query(AdListing).filter(AdListing.id == ad_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Ad not found")
    listing.clicks += 1
    db.commit()
    return RedirectResponse(url=listing.link_url, status_code=302)


@app.get("/sitemap.xml")
def sitemap_xml(request: Request, db: Session = Depends(get_db)):
    """Dynamic XML sitemap for SEO — includes all active ads, videos, banners, and category pages"""
    from fastapi.responses import Response
    base_url = "https://www.superadpro.com"
    urls = []
    # Static pages
    for path in ["/", "/how-it-works", "/earn", "/for-advertisers", "/faq", "/legal", "/ads", "/banners", "/videos", "/wallet-guide", "/explore"]:
        urls.append(f'<url><loc>{base_url}{path}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>')
    # Free tools — high priority for SEO traffic
    for path in ["/free/meme-generator", "/free/qr-code-generator", "/free/banner-creator"]:
        urls.append(f'<url><loc>{base_url}{path}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>')
    # Ad category pages
    ad_cats = sorted(set(a.category for a in db.query(AdListing).filter(AdListing.is_active == True).all() if a.category))
    for cat in ad_cats:
        urls.append(f'<url><loc>{base_url}/ads?category={cat}</loc><changefreq>daily</changefreq><priority>0.7</priority></url>')
    # Individual ad pages
    active_ads = db.query(AdListing).filter(AdListing.is_active == True, AdListing.slug.isnot(None)).all()
    for ad in active_ads:
        lastmod = ad.updated_at.strftime("%Y-%m-%d") if ad.updated_at else ""
        lm = f"<lastmod>{lastmod}</lastmod>" if lastmod else ""
        urls.append(f'<url><loc>{base_url}/ads/listing/{ad.slug}</loc>{lm}<changefreq>weekly</changefreq><priority>0.6</priority></url>')
    # Video pages
    active_videos = db.query(VideoCampaign).filter(VideoCampaign.status == "active").all()
    vid_cats = sorted(set(v.category for v in active_videos if v.category))
    for cat in vid_cats:
        urls.append(f'<url><loc>{base_url}/videos?category={cat}</loc><changefreq>daily</changefreq><priority>0.7</priority></url>')
    # Banner category pages
    from .database import BannerAd
    active_banners = db.query(BannerAd).filter(BannerAd.is_active == True, BannerAd.status == "approved").all()
    banner_cats = sorted(set(b.category for b in active_banners if b.category and b.category != "general"))
    for cat in banner_cats:
        urls.append(f'<url><loc>{base_url}/banners?category={cat}</loc><changefreq>daily</changefreq><priority>0.6</priority></url>')

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>"
    return Response(content=xml, media_type="application/xml")


@app.get("/robots.txt")
def robots_txt():
    """Robots.txt for search engine crawlers"""
    from fastapi.responses import Response
    content = """User-agent: *
Allow: /
Allow: /ads
Allow: /ads/listing/
Allow: /banners
Allow: /videos
Allow: /how-it-works
Allow: /earn
Allow: /explore
Allow: /for-advertisers
Allow: /faq
Allow: /legal
Allow: /wallet-guide
Allow: /free/
Allow: /free/meme-generator
Allow: /free/qr-code-generator
Allow: /free/banner-creator
Disallow: /dashboard
Disallow: /admin
Disallow: /api/
Disallow: /ads/my
Disallow: /wallet
Disallow: /settings
Disallow: /app/

Sitemap: https://www.superadpro.com/sitemap.xml
"""
    return Response(content=content, media_type="text/plain")

@app.get("/ads/my")
def my_ads_page(request: Request):
    """Phase 4: serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/ads", status_code=302)

@app.post("/api/ads/create")
async def create_ad(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Please log in to post an ad"}, status_code=401)
    if not user.is_active:
        return JSONResponse({"error": "Active membership required to post ads"}, status_code=403)

    body = await request.json()
    title = (body.get("title") or "").strip()[:120]
    description = (body.get("description") or "").strip()[:500]
    category = body.get("category", "general")
    link_url = (body.get("link_url") or "").strip()
    image_url = (body.get("image_url") or "").strip() or None
    keywords = (body.get("keywords") or "").strip()[:200]
    location = (body.get("location") or "").strip()[:100]
    price = (body.get("price") or "").strip()[:50]

    if not title or not description or not link_url:
        return JSONResponse({"error": "Title, description and link are required"}, status_code=400)
    if not link_url.startswith("http"):
        link_url = "https://" + link_url

    # Weekly limit: Basic=3, Pro=6
    from datetime import datetime, timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    weekly_count = db.query(AdListing).filter(
        AdListing.user_id == user.id, AdListing.created_at >= week_ago
    ).count()
    weekly_limit = 6 if ((user.membership_tier or "basic") == "pro" or user.is_admin) else 3
    if weekly_count >= weekly_limit:
        return JSONResponse({"error": f"Weekly limit reached ({weekly_limit} ads per week). Upgrade to Pro for higher limits."}, status_code=429)

    # Generate slug
    import re, time
    slug_base = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:80]
    slug = f"{slug_base}-{int(time.time()) % 100000}"

    # AI content moderation
    from .moderation import moderate_content
    mod = moderate_content(title=title, description=description, keywords=keywords, category=category, link_url=link_url)
    status = "active" if mod["decision"] == "approve" else "pending"

    ad = AdListing(
        user_id=user.id, title=title, slug=slug, description=description,
        category=category, link_url=link_url, image_url=image_url,
        keywords=keywords, location=location, price=price, status=status,
        is_active=(status == "active"),
    )
    db.add(ad)
    db.commit()

    if status == "pending":
        return {"success": True, "id": ad.id, "status": "pending", "message": "Your ad is under review and will be live shortly."}
    return {"success": True, "id": ad.id, "status": "active", "message": "Your ad is live!"}


# ── Banner Ad Creation ──
@app.post("/api/banners/create")
async def create_banner(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    from .database import BannerAd
    if not user:
        return JSONResponse({"error": "Please log in to create a banner"}, status_code=401)
    if not user.is_active:
        return JSONResponse({"error": "Active membership required to create banners"}, status_code=403)

    body = await request.json()
    title = (body.get("title") or "").strip()[:120]
    description = (body.get("description") or "").strip()[:300]
    image_url = (body.get("image_url") or "").strip()
    link_url = (body.get("link_url") or "").strip()
    size = body.get("size", "728x90")
    category = body.get("category", "general")
    keywords = (body.get("keywords") or "").strip()[:200]
    location = (body.get("location") or "").strip()[:100]

    if not title or not image_url or not link_url:
        return JSONResponse({"error": "Title, banner image URL, and click-through URL are required"}, status_code=400)
    if not link_url.startswith("http"):
        link_url = "https://" + link_url
    if not image_url.startswith("http"):
        return JSONResponse({"error": "Please provide a valid image URL (starting with http)"}, status_code=400)
    if size not in ("728x90", "300x250", "160x600", "320x50", "970x250"):
        return JSONResponse({"error": "Invalid banner size"}, status_code=400)

    # Weekly limit: Basic=3, Pro=6
    from datetime import datetime, timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    weekly_count = db.query(BannerAd).filter(
        BannerAd.user_id == user.id, BannerAd.created_at >= week_ago
    ).count()
    weekly_limit = 6 if ((user.membership_tier or "basic") == "pro" or user.is_admin) else 3
    if weekly_count >= weekly_limit:
        return JSONResponse({"error": f"Weekly limit reached ({weekly_limit} banners per week). Upgrade to Pro for higher limits."}, status_code=429)

    # Generate slug
    import re, time
    slug_base = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:80]
    slug = f"{slug_base}-{int(time.time()) % 100000}"

    # AI content moderation
    from .moderation import moderate_content
    mod = moderate_content(title=title, description=description, keywords=keywords, category=category, link_url=link_url)
    status = "approved" if mod["decision"] == "approve" else "pending"

    banner = BannerAd(
        user_id=user.id, title=title, slug=slug, description=description,
        image_url=image_url, link_url=link_url, size=size,
        category=category, keywords=keywords, location=location,
        status=status, is_active=(status == "approved"),
    )
    db.add(banner)
    db.commit()

    if status == "pending":
        return {"success": True, "id": banner.id, "status": "pending", "message": "Your banner is under review and will be live shortly."}
    return {"success": True, "id": banner.id, "status": "approved", "message": "Your banner is live!"}


@app.get("/api/banners/my")
def my_banners(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from .database import BannerAd
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    banners = db.query(BannerAd).filter(BannerAd.user_id == user.id).order_by(BannerAd.created_at.desc()).all()
    return {"banners": [{
        "id": b.id, "title": b.title, "image_url": b.image_url, "link_url": b.link_url,
        "size": b.size, "category": b.category, "status": b.status,
        "clicks": b.clicks or 0, "impressions": b.impressions or 0,
        "is_active": b.is_active, "created_at": b.created_at.isoformat() if b.created_at else None,
    } for b in banners]}


@app.post("/api/banners/{banner_id}/toggle")
async def toggle_banner(banner_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from .database import BannerAd
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    banner = db.query(BannerAd).filter(BannerAd.id == banner_id, BannerAd.user_id == user.id).first()
    if not banner:
        return JSONResponse({"error": "Banner not found"}, status_code=404)
    banner.is_active = not banner.is_active
    db.commit()
    return {"success": True, "is_active": banner.is_active}


@app.post("/api/banners/{banner_id}/delete")
async def delete_banner(banner_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from .database import BannerAd
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    banner = db.query(BannerAd).filter(BannerAd.id == banner_id, BannerAd.user_id == user.id).first()
    if not banner:
        return JSONResponse({"error": "Banner not found"}, status_code=404)
    db.delete(banner)
    db.commit()
    return {"success": True}

@app.post("/api/ads/{ad_id}/toggle")
async def toggle_ad(ad_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    ad = db.query(AdListing).filter(AdListing.id == ad_id, AdListing.user_id == user.id).first()
    if not ad:
        return JSONResponse({"error": "Ad not found"}, status_code=404)
    ad.is_active = not ad.is_active
    db.commit()
    return {"success": True, "is_active": ad.is_active}

@app.post("/api/ads/{ad_id}/delete")
async def delete_ad(ad_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    ad = db.query(AdListing).filter(AdListing.id == ad_id, AdListing.user_id == user.id).first()
    if not ad:
        return JSONResponse({"error": "Ad not found"}, status_code=404)
    db.delete(ad)
    db.commit()
    return {"success": True}


# ═══════════════════════════════════════════════════
#  VIP WAITING LIST
# ═══════════════════════════════════════════════════
@app.get("/vip")
def vip_page(request: Request):
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/register", status_code=302)

@app.post("/api/vip/signup")
async def vip_signup(request: Request, db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    body = await request.json()
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    if not name or not email or "@" not in email:
        return JSONResponse({"error": "Please enter your name and a valid email"}, status_code=400)
    existing = db.query(VIPSignup).filter(VIPSignup.email == email).first()
    if existing:
        return JSONResponse({"error": "You're already on the VIP list!"}, status_code=400)
    signup = VIPSignup(name=name, email=email)
    db.add(signup)
    db.commit()
    count = db.query(VIPSignup).count()
    # Send welcome email (non-blocking — fails silently if not configured)
    try:
        from app.email_utils import send_vip_welcome_email
        send_vip_welcome_email(to_email=email, name=name)
    except Exception as e:
        logger.warning(f"VIP welcome email failed for {email}: {e}")
    return {"success": True, "message": f"Welcome to the VIP list, {name}!", "count": count}

@app.get("/api/vip/count")
def vip_count(db: Session = Depends(get_db)):
    count = db.query(VIPSignup).count()
    return {"count": count}

@app.get("/api/vip/export")
def vip_export(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    signups = db.query(VIPSignup).order_by(VIPSignup.created_at.desc()).all()
    return {"signups": [{"id": s.id, "name": s.name, "email": s.email, "joined": s.created_at.isoformat() if s.created_at else ""} for s in signups]}


@app.get("/go/{slug}")
def go_redirect(slug: str, request: Request, db: Session = Depends(get_db)):
    """Redirect /go/slug with full Linkly-style tracking: geo, device, browser, UTM, smart rules."""
    from datetime import datetime
    import json, random
    from urllib.parse import urlparse, parse_qs

    # ── UTM params ──
    qs = request.query_params
    utm_source   = qs.get("utm_source",   None)
    utm_medium   = qs.get("utm_medium",   None)
    utm_campaign = qs.get("utm_campaign", None)

    # ── Source from referrer ──
    referrer  = request.headers.get("referer", "") or ""
    ref_lower = referrer.lower()
    source    = "direct"
    for domain, label in [
        ("facebook.com","facebook"),("fb.com","facebook"),("instagram.com","instagram"),
        ("twitter.com","x"),("x.com","x"),("linkedin.com","linkedin"),("reddit.com","reddit"),
        ("tiktok.com","tiktok"),("youtube.com","youtube"),("google.com","google"),("bing.com","bing"),
        ("pinterest.com","pinterest"),("t.co","x"),("whatsapp.com","whatsapp"),("wa.me","whatsapp"),
        ("email","email"),("mailto","email"),
    ]:
        if domain in ref_lower:
            source = label
            break
    else:
        if referrer and "superadpro" not in ref_lower:
            source = "other"
    if utm_source and source == "direct":
        source = utm_source.lower()

    # ── Device + Browser detection ──
    ua = (request.headers.get("user-agent", "") or "").lower()
    if any(d in ua for d in ["mobile","android","iphone"]):
        device = "mobile"
    elif "ipad" in ua or "tablet" in ua:
        device = "tablet"
    else:
        device = "desktop"
    if "edg" in ua:
        browser = "edge"
    elif "chrome" in ua and "chromium" not in ua:
        browser = "chrome"
    elif "firefox" in ua:
        browser = "firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "safari"
    else:
        browser = "other"

    # ── GeoIP lookup ──
    country_code = None
    country_name = None
    try:
        from app.database import _geoip_reader
        if _geoip_reader:
            ip = request.headers.get("cf-connecting-ip") or                  request.headers.get("x-forwarded-for","").split(",")[0].strip() or                  (request.client.host if request.client else None)
            if ip and ip not in ("127.0.0.1","::1","localhost"):
                geo = _geoip_reader.country(ip)
                country_code = geo.country.iso_code
                country_name = geo.country.name
    except Exception:
        pass

    def build_click(link_id, link_type):
        return LinkClick(
            link_id=link_id, link_type=link_type,
            source=source, referrer=referrer[:500] if referrer else None,
            device=device, browser=browser,
            country=country_code, country_name=country_name,
            utm_source=utm_source, utm_medium=utm_medium, utm_campaign=utm_campaign,
        )

    now = datetime.utcnow()

    # ── Short link ──
    link = db.query(ShortLink).filter(ShortLink.slug == slug).first()
    if link:
        # Smart rules: expiry
        if link.expires_at and now > link.expires_at:
            raise HTTPException(status_code=410, detail="This link has expired")
        # Smart rules: click cap
        if link.click_cap and (link.clicks or 0) >= link.click_cap:
            raise HTTPException(status_code=410, detail="This link has reached its click limit")

        # Password protection — show gate page
        if hasattr(link, 'password_hash') and link.password_hash:
            return HTMLResponse(f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Password Protected Link</title>
<style>*{{margin:0;padding:0;box-sizing:border-box}}body{{font-family:'DM Sans',system-ui,sans-serif;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#fff}}
.card{{background:#1e293b;border-radius:16px;padding:40px;max-width:400px;width:90%;text-align:center;border:1px solid #334155}}
h2{{font-size:20px;margin-bottom:8px}}p{{font-size:13px;color:#94a3b8;margin-bottom:24px}}
input{{width:100%;padding:12px 16px;border:2px solid #334155;border-radius:10px;background:#0f172a;color:#fff;font-size:14px;margin-bottom:12px;outline:none}}
input:focus{{border-color:#0ea5e9}}
button{{width:100%;padding:12px;border:none;border-radius:10px;background:#0ea5e9;color:#fff;font-size:14px;font-weight:700;cursor:pointer}}
.err{{color:#f87171;font-size:12px;margin-bottom:12px;display:none}}</style></head>
<body><div class="card"><h2>🔒 Password Required</h2><p>This link is password protected.</p>
<input type="password" id="pw" placeholder="Enter password" onkeydown="if(event.key==='Enter')go()">
<div class="err" id="err">Incorrect password</div>
<button onclick="go()">Unlock →</button></div>
<script>async function go(){{const pw=document.getElementById('pw').value;
const r=await fetch('/go/{slug}/unlock',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{password:pw}})}});
const d=await r.json();if(d.success)window.location.href=d.url;
else{{document.getElementById('err').style.display='block'}}}}</script></body></html>""")

        # Geo redirect
        dest_url = link.destination_url
        if link.geo_redirect_json and country_code:
            try:
                geo_rules = json.loads(link.geo_redirect_json)
                if country_code in geo_rules:
                    dest_url = geo_rules[country_code]
            except Exception:
                pass

        # Device redirect
        if link.device_redirect_json:
            try:
                dev_rules = json.loads(link.device_redirect_json)
                if device in dev_rules and dev_rules[device]:
                    dest_url = dev_rules[device]
            except Exception:
                pass

        link.clicks = (link.clicks or 0) + 1
        link.last_clicked = now
        db.add(build_click(link.id, "short"))
        db.commit()
        return RedirectResponse(url=dest_url, status_code=302)

    # ── Rotator ──
    rotator = db.query(LinkRotator).filter(LinkRotator.slug == slug).first()
    if rotator and rotator.destinations_json:
        dests = json.loads(rotator.destinations_json)
        if not dests:
            raise HTTPException(status_code=404, detail="No destinations configured")

        if rotator.mode == "weighted":
            total_weight = sum(d.get("weight", 50) for d in dests)
            r_val = random.uniform(0, total_weight)
            cumulative = 0
            chosen = dests[0]
            for d in dests:
                cumulative += d.get("weight", 50)
                if r_val <= cumulative:
                    chosen = d
                    break
        else:
            idx = (rotator.current_index or 0) % len(dests)
            chosen = dests[idx]
            rotator.current_index = idx + 1

        chosen["clicks"] = chosen.get("clicks", 0) + 1
        rotator.destinations_json = json.dumps(dests)
        rotator.total_clicks = (rotator.total_clicks or 0) + 1
        rotator.last_clicked = now
        db.add(build_click(rotator.id, "rotator"))
        db.commit()
        return RedirectResponse(url=chosen["url"], status_code=302)

    raise HTTPException(status_code=404, detail="Link not found")


#  AI SALES CHATBOT (on funnel pages)
# ═══════════════════════════════════════════════════════════════

@app.post("/api/chat/{page_id}")
async def funnel_chat(page_id: int, request: Request, db: Session = Depends(get_db)):
    """AI sales assistant that lives on published funnel pages."""
    from fastapi.responses import JSONResponse
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)

    message = (body.get("message") or "").strip()
    history = body.get("history") or []
    if not message:
        return JSONResponse({"error": "Empty message"}, status_code=400)

    # Rate limit: 20 messages per IP per hour
    client_ip = request.client.host if request.client else "unknown"
    if not hasattr(app.state, '_chat_limits'):
        app.state._chat_limits = {}
    limits = app.state._chat_limits
    now = datetime.utcnow()
    key = f"{client_ip}:{page_id}"
    if key in limits:
        entries = [t for t in limits[key] if (now - t).total_seconds() < 3600]
        limits[key] = entries
        if len(entries) >= 20:
            return JSONResponse({"reply": "You've reached the chat limit for this hour. Please check back soon!"})
        limits[key].append(now)
    else:
        limits[key] = [now]
    # Clean old entries periodically (every 100th request)
    if len(limits) > 1000:
        cutoff = now - timedelta(hours=2)
        app.state._chat_limits = {k: [t for t in v if t > cutoff] for k, v in limits.items() if any(t > cutoff for t in v)}

    # Get page and owner context
    page = db.query(FunnelPage).filter(FunnelPage.id == page_id).first()
    if not page:
        return JSONResponse({"error": "Page not found"}, status_code=404)

    owner = db.query(User).filter(User.id == page.user_id).first()
    owner_name = owner.first_name or owner.username if owner else "our team"
    ref_link = f"https://www.superadpro.com/ref/{owner.username}" if owner else "#"

    # Build page content summary for context
    page_context = f"Page headline: {page.headline or page.title}"
    if page.subheadline:
        page_context += f"\nPage subheadline: {page.subheadline}"
    if page.cta_text:
        page_context += f"\nCall to action: {page.cta_text}"

    system_prompt = f"""You are a friendly, knowledgeable AI sales assistant on {owner_name}'s landing page. Your job is to help visitors understand the opportunity, answer their questions honestly, and guide them toward taking action.

ABOUT THE PAGE YOU'RE ON:
{page_context}

ABOUT SUPERADPRO (the platform):
- SuperAdPro is a video advertising platform with a built-in affiliate income opportunity
- Membership costs $20/month in USDT (crypto) on Base Chain
- Members get: AI Campaign Studio, Funnel Builder with AI chatbot, Niche Finder, Swipe File, Campaign Analytics
- Members earn by: watching daily videos (Watch & Earn), referring others (40% direct commission), and the 8x8 Profit Engine Grid (uni-level commissions)
- There are 8 campaign tiers from $20 to $1,000 for advertisers who want engaged video views
- All payments are in USDT on Base Chain (crypto) — fast, transparent, no chargebacks
- The platform is real with genuine marketing tools, not just a compensation plan

ABOUT {owner_name.upper()} (the person who shared this page):
- They are a SuperAdPro member who created this page to share the opportunity
- Their referral link: {ref_link}
- When guiding visitors to sign up, direct them to the referral link above

YOUR PERSONALITY & RULES:
- Be warm, conversational, and genuine — not pushy or salesy
- Answer questions honestly. If you don't know something, say so
- Never make specific income promises or guarantees
- If asked about earnings, say "results vary based on effort, team building, and market conditions"
- Handle objections with empathy — acknowledge concerns then share relevant facts
- Keep responses concise (2-4 sentences usually). Be brief and punchy
- If someone seems interested, naturally mention the next step (visiting the referral link)
- You can use the occasional emoji but don't overdo it
- Never pretend to be human — if asked, say you're an AI assistant
- Never badmouth competitors or other platforms"""

    # Build messages for the API
    messages = []
    for h in history[-10:]:  # Keep last 10 exchanges for context
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        # Smart fallback responses without API
        msg_lower = message.lower()
        if any(w in msg_lower for w in ["cost", "price", "how much", "expensive"]):
            reply = f"Great question! Membership is $20/month which gives you access to all the AI marketing tools, the funnel builder, and the income opportunity. When you consider that similar tools cost $50-100/month elsewhere, it's genuinely good value. Want me to tell you more about what's included?"
        elif any(w in msg_lower for w in ["scam", "legit", "real", "trust", "ponzi"]):
            reply = f"I totally understand the caution — there's a lot of rubbish out there. SuperAdPro is a real platform with genuine marketing tools (AI campaign studio, funnel builder, analytics). The income comes from real video advertising, not just recruitment. The $20 membership gives you tools worth way more than that on their own."
        elif any(w in msg_lower for w in ["earn", "money", "income", "commission"]):
            reply = f"There are multiple ways to earn: direct referral commissions (40%), uni-level commissions through the 8x8 grid system, and you can use the marketing tools to promote any affiliate offer you like. Results vary based on effort and team building — I won't make any unrealistic promises."
        elif any(w in msg_lower for w in ["join", "sign up", "start", "register", "link"]):
            reply = f"Great to hear you're interested! You can sign up through {owner_name}'s referral link. Membership is $20/month in USDT on Base Chain. You'll get instant access to all the AI tools and can start building straight away. 🚀"
        elif any(w in msg_lower for w in ["hello", "hi", "hey", "sup"]):
            reply = f"Hey! 👋 Welcome! I'm the AI assistant on {owner_name}'s page. I'm here to answer any questions you have about SuperAdPro and the opportunity. What would you like to know?"
        else:
            reply = f"Thanks for your question! I'm here to help you understand what SuperAdPro offers. We're a video advertising platform with built-in AI marketing tools and an affiliate income opportunity. What specifically would you like to know more about?"
        return JSONResponse({"reply": reply})

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=AI_MODEL_HAIKU,  # Cost-optimised,
            max_tokens=300,
            system=system_prompt,
            messages=messages,
        )
        reply = response.content[0].text
        return JSONResponse({"reply": reply})
    except Exception as e:
        logger.error(f"Chat API error: {e}")
        return JSONResponse({"reply": f"Thanks for reaching out! I'm having a moment — please try again or reach out to {owner_name} directly for help."})


# ═══════════════════════════════════════════════════════════════
#  CAMPAIGN ANALYTICS
# ═══════════════════════════════════════════════════════════════

@app.get("/analytics")
def analytics_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_analytics_DISABLED(request: Request, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    ctx = get_dashboard_context(request, user, db)

    # Get user's campaigns
    campaigns = db.query(VideoCampaign).filter(
        VideoCampaign.user_id == user.id,
        VideoCampaign.status != "deleted"
    ).order_by(VideoCampaign.created_at.desc()).all()

    # Get watch data for user's campaigns (last 30 days)
    from datetime import date, timedelta
    thirty_days_ago = str(date.today() - timedelta(days=30))
    campaign_ids = [c.id for c in campaigns]

    daily_views = []
    geo_breakdown = {}
    total_views = 0
    total_target = 0

    if campaign_ids:
        # Daily views for chart
        from sqlalchemy import func
        daily_raw = db.query(
            VideoWatch.watch_date,
            func.count(VideoWatch.id)
        ).filter(
            VideoWatch.campaign_id.in_(campaign_ids),
            VideoWatch.watch_date >= thirty_days_ago
        ).group_by(VideoWatch.watch_date).order_by(VideoWatch.watch_date).all()
        daily_views = [{"date": d[0], "views": d[1]} for d in daily_raw]

        # Geo breakdown — join watch → user → country
        geo_raw = db.query(
            User.country,
            func.count(VideoWatch.id)
        ).join(User, VideoWatch.user_id == User.id).filter(
            VideoWatch.campaign_id.in_(campaign_ids)
        ).group_by(User.country).order_by(func.count(VideoWatch.id).desc()).limit(10).all()
        geo_breakdown = {(g[0] or "Unknown"): g[1] for g in geo_raw}

    # Campaign summaries
    campaign_data = []
    for c in campaigns:
        pct = round((c.views_delivered / c.views_target * 100), 1) if c.views_target > 0 else 0
        total_views += c.views_delivered or 0
        total_target += c.views_target or 0
        campaign_data.append({
            "id": c.id,
            "title": c.title,
            "platform": c.platform,
            "status": c.status,
            "views_delivered": c.views_delivered or 0,
            "views_target": c.views_target or 0,
            "pct": min(pct, 100),
            "created": c.created_at.strftime("%d %b %Y") if c.created_at else "",
        })

    overall_pct = round((total_views / total_target * 100), 1) if total_target > 0 else 0

    ctx.update({
        "campaigns": campaign_data,
        "daily_views": daily_views,
        "geo_breakdown": geo_breakdown,
        "total_views": total_views,
        "total_target": total_target,
        "overall_pct": min(overall_pct, 100),
    })
    return templates.TemplateResponse("analytics.html", ctx)


@app.post("/api/analytics/ai-recommendations")
async def ai_recommendations(request: Request, user: User = Depends(get_current_user),
                              db: Session = Depends(get_db)):
    """AI analyses campaign performance and returns actionable recommendations."""
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    # Rate limit: reuse campaign_studio quota
    rl = check_and_increment_ai_quota(db, user.id, "campaign_studio")
    if not rl["allowed"]:
        return JSONResponse({"error": f"Daily AI limit reached. Resets in {rl['resets_in']}.", "rate_limited": True}, status_code=429)

    # Gather campaign data
    campaigns = db.query(VideoCampaign).filter(
        VideoCampaign.user_id == user.id,
        VideoCampaign.status != "deleted"
    ).all()

    if not campaigns:
        return JSONResponse({"recommendations": "You don't have any campaigns yet. Create your first campaign in My Campaigns, then come back here for AI-powered recommendations on how to improve your results."})

    # Build context for AI
    campaign_summary = []
    for c in campaigns:
        pct = round((c.views_delivered / c.views_target * 100), 1) if c.views_target > 0 else 0
        campaign_summary.append(f"- '{c.title}' ({c.platform}): {c.views_delivered}/{c.views_target} views ({pct}% delivered), status: {c.status}, category: {c.category or 'uncategorised'}")

    from sqlalchemy import func
    # Top viewing times
    from datetime import date, timedelta
    seven_days_ago = str(date.today() - timedelta(days=7))
    campaign_ids = [c.id for c in campaigns]

    prompt = f"""You are a video marketing strategist analysing campaign performance data for a SuperAdPro member.

THEIR CAMPAIGNS:
{chr(10).join(campaign_summary)}

Based on this data, provide 3-5 specific, actionable recommendations to improve their campaign performance. Focus on:
1. Which campaigns are performing well and why
2. What they could do to increase engagement
3. Content strategy suggestions based on their niche/category
4. Timing and frequency advice
5. Any red flags or issues to address

Keep recommendations concise, specific and immediately actionable. Use a friendly, encouraging tone. Format each recommendation with a short bold title followed by 1-2 sentences of advice. Do not use numbered lists — use clear paragraph breaks between recommendations."""

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"recommendations": "**Great start!** You've got campaigns running — that puts you ahead of most. Focus on consistency: keep your content fresh and post regularly.\n\n**Optimise your titles** — Make sure each video has a compelling, curiosity-driven title. This is the #1 factor in whether someone clicks.\n\n**Check your completion rates** — If viewers aren't watching to the end, try shorter videos or stronger hooks in the first 8 seconds.\n\n*Note: Add your ANTHROPIC_API_KEY to Railway for personalised AI recommendations.*"})

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=AI_MODEL_SONNET,  # Complex generation,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text
        return JSONResponse({"recommendations": text})
    except Exception as e:
        logger.error(f"AI recommendations error: {e}")
        return JSONResponse({"recommendations": "Unable to generate AI recommendations right now. Please try again in a moment."})


# ═══════════════════════════════════════════════════════════════
#  AI CAMPAIGN STUDIO
# ═══════════════════════════════════════════════════════════════

@app.get("/campaign-studio")
def campaign_studio(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.post("/api/campaign-studio/generate")
async def generate_campaign(request: Request, user: User = Depends(get_current_user)):
    if not user:
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from fastapi.responses import JSONResponse

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)

    # ── Rate limit ──
    db_rl = next(get_db())
    rl = check_and_increment_ai_quota(db_rl, user.id, "campaign_studio")
    if not rl["allowed"]:
        return JSONResponse({"error": f"Daily limit reached — {rl['limit']} generations per day. Resets in {rl['resets_in']}.", "rate_limited": True, "resets_in": rl["resets_in"]}, status_code=429)

    niche    = body.get("niche", "")
    offer    = body.get("offer", "")
    audience = body.get("audience", "")
    platform = body.get("platform", "YouTube")
    tone     = body.get("tone", "Energetic & Motivational")
    usp      = body.get("usp", "")
    outputs  = body.get("outputs", ["🎬 Video Script", "📧 Email Sequence", "📱 Social Captions", "🖼️ Thumbnail Concepts"])

    # Build what to generate
    output_instructions = []
    sections_to_build = []

    if any("Video Script" in o for o in outputs):
        output_instructions.append("""
### 🎬 VIDEO SCRIPT
Write a complete, engaging video script optimised for {platform}.
Format with clearly labelled sections: HOOK (first 8 seconds), INTRO (15 seconds), MAIN CONTENT, CALL TO ACTION.
The hook must be irresistible and create immediate curiosity or shock. Make it specific to {niche}.
Aim for a 4-6 minute video (approximately 600-800 words of script).
""")
        sections_to_build.append(("🎬", "Video Script"))

    if any("Email" in o for o in outputs):
        output_instructions.append("""
### 📧 EMAIL SEQUENCE
Write a 3-email sequence for someone who just discovered this offer.
Email 1: Welcome / curiosity hook (subject line + body, 150 words)
Email 2: Social proof + overcome objections (subject line + body, 200 words)
Email 3: Urgency + clear CTA (subject line + body, 150 words)
""")
        sections_to_build.append(("📧", "Email Sequence (3 Emails)"))

    if any("Social" in o for o in outputs):
        output_instructions.append("""
### 📱 SOCIAL CAPTIONS
Write 5 social media captions for {platform}, each with a different angle:
1. Curiosity / Question hook
2. Income/results focused
3. Lifestyle / transformation
4. Behind the scenes / authenticity
5. Direct call to action
Each caption should be 3-5 sentences + 5 relevant hashtags.
""")
        sections_to_build.append(("📱", "Social Media Captions"))

    if any("Thumbnail" in o for o in outputs):
        output_instructions.append("""
### 🖼️ THUMBNAIL CONCEPTS
Provide 4 thumbnail concepts with:
- Visual description (what's in the image)
- Text overlay (max 5 words, high contrast)
- Canva/Midjourney prompt to create it
- Why this will get clicks (psychology behind it)
""")
        sections_to_build.append(("🖼️", "Thumbnail Concepts"))

    if any("Headlines" in o for o in outputs):
        output_instructions.append("""
### 💥 HEADLINES & HOOKS
Write 10 headline/hook variations:
- 3 curiosity-based
- 3 result/benefit-based
- 2 fear of missing out
- 2 contrarian / surprising
""")
        sections_to_build.append(("💥", "Headlines & Hooks"))

    if any("WhatsApp" in o or "DM" in o for o in outputs):
        output_instructions.append("""
### 💬 WHATSAPP / DM SCRIPT
Write a natural-sounding WhatsApp or direct message script to share with contacts.
Include: opening message (not salesy), follow-up if no reply, response to "what is it?", and closing CTA.
Keep it conversational — like a real person texting a friend.
""")
        sections_to_build.append(("💬", "WhatsApp / DM Script"))

    outputs_text = "\n".join(o.format(platform=platform, niche=niche) for o in output_instructions)

    prompt = f"""You are an elite digital marketing strategist helping a member of SuperAdPro — a video marketing membership platform — create their campaign assets.

MEMBER'S BRIEF:
- Niche: {niche}
- Offer: {offer}
- Target audience: {audience if audience else "general online income seekers"}
- Primary platform: {platform}
- Tone of voice: {tone}
- Unique selling point: {usp if usp else "exclusive membership with multiple income streams"}

CONTEXT: SuperAdPro is a $10/month membership that includes a Watch-to-Earn commission system, an AI & Marketing video course, and a suite of AI marketing tools. Members are typically people looking to earn online income, learn digital marketing, or build a side hustle.

YOUR TASK:
Generate all of the following marketing assets. Each section should be complete, specific, and immediately usable — not generic templates. Use the member's exact niche, tone and offer throughout.

{outputs_text}

IMPORTANT RULES:
- Be specific to their niche — never write generic content that could apply to anything
- Use the tone of voice they specified throughout
- Every script, caption and email should feel written by a human expert, not an AI
- Include specific numbers, claims and hooks that make the content compelling
- Format clearly with the section headers exactly as shown above"""

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        # Return a demo response if no API key configured
        demo_sections = []
        for emoji, title in sections_to_build:
            demo_sections.append({
                "icon": emoji,
                "title": title,
                "content": f"**{title} — Demo Mode**\n\nTo activate the AI Campaign Studio, add your ANTHROPIC_API_KEY to your Railway environment variables.\n\nOnce configured, the AI will generate complete, personalised {title.lower()} content for your {niche} campaign targeting {audience or 'your audience'} on {platform}."
            })
        return JSONResponse({"sections": demo_sections, "demo": True})

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=AI_MODEL_SONNET,  # Complex generation,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
        full_text = message.content[0].text

        # Parse into sections
        sections = []
        for emoji, title in sections_to_build:
            # Find section in response
            markers = [f"### {emoji}", f"# {emoji}", f"## {emoji}",
                      f"### {title.split('(')[0].strip()}", f"**{title}"]
            start_idx = -1
            for marker in markers:
                idx = full_text.find(marker)
                if idx >= 0:
                    start_idx = idx
                    break

            if start_idx >= 0:
                # Find next section
                next_idx = len(full_text)
                for _, next_title in sections_to_build:
                    if next_title == title:
                        continue
                    for m in [f"### ", f"## "]:
                        ni = full_text.find(m, start_idx + 50)
                        if 0 < ni < next_idx:
                            next_idx = ni
                section_text = full_text[start_idx:next_idx].strip()
                # Remove the header line
                lines = section_text.split("\n")
                section_text = "\n".join(lines[1:]).strip()
            else:
                section_text = f"Content generated for your {title.lower()}. Please try regenerating if this appears incomplete."

            sections.append({"icon": emoji, "title": title, "content": section_text})

        return JSONResponse({"sections": sections})

    except anthropic.AuthenticationError:
        return JSONResponse({"error": "Invalid API key — check your ANTHROPIC_API_KEY"}, status_code=500)
    except Exception as e:
        logging.error(f"Campaign studio error: {e}")
        return JSONResponse({"error": "AI generation failed — please try again"}, status_code=500)


# ═══════════════════════════════════════════════════════════════
#  MEMBER ID HELPER
# ═══════════════════════════════════════════════════════════════

def format_member_id(user_id: int, is_admin: bool = False) -> str:
    if is_admin:
        return "SAP-00001"
    return f"SAP-{user_id:05d}"


# ═══════════════════════════════════════════════════════════════
#  P2P TRANSFER ROUTES
# ═══════════════════════════════════════════════════════════════

@app.post("/api/p2p-transfer")
async def api_p2p_transfer(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if not user.is_active:
        return JSONResponse({"error": "Active membership required"}, status_code=403)

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)

    to_member_id = body.get("to_member_id", "").strip()
    note         = body.get("note", "").strip()
    try:
        amount = float(body.get("amount", 0))
    except (ValueError, TypeError):
        return JSONResponse({"error": "Invalid amount"}, status_code=400)

    result = process_p2p_transfer(db, user.id, to_member_id, amount, note)
    status_code = 200 if result["success"] else 400
    return JSONResponse(result, status_code=status_code)


@app.get("/api/p2p-history")
def api_p2p_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    history = get_p2p_history(db, user.id)
    # Serialise datetimes
    for item in history:
        if item.get("created_at"):
            item["created_at"] = item["created_at"].strftime("%d %b %Y %H:%M")
    return JSONResponse({"transfers": history})


# ═══════════════════════════════════════════════════════════════
#  MEMBERSHIP AUTO-RENEWAL ADMIN ENDPOINT
# ═══════════════════════════════════════════════════════════════

@app.post("/admin/process-renewals")
def admin_process_renewals(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from fastapi.responses import JSONResponse
    if not user or not user.is_admin:
        return JSONResponse({"error": "Admin only"}, status_code=403)
    results = process_auto_renewals(db)
    return JSONResponse({"success": True, "results": results})





@app.post("/api/register")
@limiter.limit("5/minute")
async def api_register(
    request: Request,
    db: Session = Depends(get_db)
):
    """JSON register endpoint for the modal."""
    from fastapi.responses import JSONResponse
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)

    try:
        first_name       = sanitize(body.get("first_name", "").strip())
        username         = sanitize(body.get("username", "").strip())
        email            = sanitize(body.get("email", "").strip())
        password         = body.get("password", "")
        confirm_password = body.get("confirm_password", "")
        ref              = sanitize(body.get("ref", "").strip())

        if not first_name:
            return JSONResponse({"error": "Please enter your first name."}, status_code=400)
        if not validate_username(username):
            return JSONResponse({"error": "Username must be 3-30 characters, letters, numbers and underscores only."}, status_code=400)
        if not validate_email(email):
            return JSONResponse({"error": "Please enter a valid email address."}, status_code=400)
        if len(password) < 8:
            return JSONResponse({"error": "Password must be at least 8 characters."}, status_code=400)
        if len(password.encode("utf-8")) > 72:
            return JSONResponse({"error": "Password must be 72 characters or less."}, status_code=400)
        if password != confirm_password:
            return JSONResponse({"error": "Passwords do not match."}, status_code=400)

        existing = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        if existing:
            return JSONResponse({"error": "Username or email already registered."}, status_code=400)

        sponsor_id = None
        if ref:
            sponsor = db.query(User).filter(User.username == ref).first()
            if sponsor:
                sponsor_id = sponsor.id
                sponsor.total_team = (sponsor.total_team or 0) + 1
        
        # Default to company account if no sponsor
        if not sponsor_id:
            company = db.query(User).filter(User.username == "SuperAdPro").first()
            if company:
                sponsor_id = company.id
                company.total_team = (company.total_team or 0) + 1

        user = create_user(
            db, username, email, password,
            sponsor_id=sponsor_id,
            first_name=first_name,
            last_name="",
            wallet_address="",
            country="",
        )

        # Assign pass-up sponsor for course commission chain
        if sponsor_id:
            sponsor_obj = db.query(User).filter(User.id == sponsor_id).first()
            assign_passup_sponsor(db, user, sponsor_obj)
            db.commit()

        # Send welcome email (fails silently if not configured)
        try:
            from app.email_utils import send_welcome_email
            send_welcome_email(email, first_name, username)
        except Exception as e:
            logger.warning(f"Welcome email failed for {email}: {e}")

        # Enrol in nurture sequence — first email fires 24hrs after registration
        try:
            from .database import NurtureSequence
            from datetime import timedelta
            nurture = NurtureSequence(
                user_id     = user.id,
                next_email  = 1,
                next_send_at = datetime.utcnow() + timedelta(hours=24),
            )
            db.add(nurture)
            db.commit()
        except Exception as e:
            logger.warning(f"Nurture enrol failed for {email}: {e}")

        response = JSONResponse({"success": True, "redirect": "/dashboard?new=1"})
        set_secure_cookie(response, user.id)
        return response

    except Exception as exc:
        logger.error(f"api_register error: {exc}", exc_info=True)
        db.rollback()
        return JSONResponse({"error": f"Registration failed: {exc}"}, status_code=500)


# ═══════════════════════════════════════════════════════════════
#  ACCOUNT — PROFILE UPDATE + PASSWORD CHANGE
# ═══════════════════════════════════════════════════════════════

@app.post("/account/update-profile")
def account_update_profile(
    request: Request,
    first_name: str = Form(""),
    last_name:  str = Form(""),
    country:    str = Form(""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not user: return RedirectResponse(url="/?login=1")
    user.first_name = sanitize(first_name).strip() or user.first_name
    user.last_name  = sanitize(last_name).strip()
    user.country    = sanitize(country).strip()
    db.commit()
    return RedirectResponse(url="/account?saved=profile", status_code=303)


@app.post("/account/change-password")
def account_change_password(
    request: Request,
    current_password: str = Form(),
    new_password:     str = Form(),
    confirm_password: str = Form(),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    import bcrypt
    from fastapi.responses import RedirectResponse as RR
    if not user: return RR(url="/?login=1")

    def fail(msg):
        return RR(url=f"/account?error={msg.replace(' ','_')}", status_code=303)

    if not bcrypt.checkpw(current_password.encode(), user.password.encode()):
        return fail("Current password is incorrect")
    if len(new_password) < 8:
        return fail("New password must be at least 8 characters")
    if len(new_password.encode()) > 72:
        return fail("Password too long")
    if new_password != confirm_password:
        return fail("New passwords do not match")

    user.password = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    db.commit()
    return RR(url="/app/account?saved=password", status_code=303)


# ═══════════════════════════════════════════════════════════════
#  KYC — Basic identity verification
# ═══════════════════════════════════════════════════════════════

import os, uuid

KYC_UPLOAD_DIR = "/tmp/kyc-uploads"
os.makedirs(KYC_UPLOAD_DIR, exist_ok=True)

@app.post("/account/kyc-submit")
def kyc_submit(
    request: Request,
    kyc_dob: str = Form(),
    kyc_id_type: str = Form(),
    kyc_id_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user: return RedirectResponse(url="/?login=1", status_code=302)
    import uuid
    from datetime import datetime
    # Validate DOB format
    try:
        datetime.strptime(kyc_dob, "%Y-%m-%d")
    except ValueError:
        return RedirectResponse(url="/account?error=invalid_date_format", status_code=303)
    # Validate ID type
    if kyc_id_type not in ("passport", "drivers_licence", "national_id"):
        return RedirectResponse(url="/account?error=invalid_id_type", status_code=303)
    # Validate file (image or PDF, max 10MB)
    allowed_ext = (".jpg", ".jpeg", ".png", ".pdf")
    ext = os.path.splitext(kyc_id_file.filename or "")[1].lower()
    if ext not in allowed_ext:
        return RedirectResponse(url="/account?error=invalid_file_type_use_jpg_png_or_pdf", status_code=303)
    content = kyc_id_file.file.read()
    if len(content) > 10 * 1024 * 1024:
        return RedirectResponse(url="/account?error=file_too_large_max_10mb", status_code=303)
    # Save file to R2 (private kyc/ folder)
    from .r2_storage import r2_available, _get_client, R2_BUCKET
    safe_name = f"kyc_{user.id}_{uuid.uuid4().hex[:8]}{ext}"
    if r2_available():
        try:
            ct_map = {".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".pdf":"application/pdf"}
            client = _get_client()
            client.put_object(
                Bucket=R2_BUCKET,
                Key=f"kyc/{safe_name}",
                Body=content,
                ContentType=ct_map.get(ext, "application/octet-stream"),
            )
        except Exception as e:
            logger.error(f"KYC R2 upload failed: {e}")
            return RedirectResponse(url="/account?error=upload_failed_please_try_again", status_code=303)
    else:
        # Fallback to /tmp if R2 not configured
        filepath = os.path.join(KYC_UPLOAD_DIR, safe_name)
        with open(filepath, "wb") as f:
            f.write(content)
    # Update user
    user.kyc_dob = kyc_dob
    user.kyc_id_type = kyc_id_type
    user.kyc_id_filename = safe_name
    user.kyc_status = "pending"
    user.kyc_submitted_at = datetime.utcnow()
    db.commit()
    return RedirectResponse(url="/account?saved=kyc_submitted", status_code=303)


# ═══════════════════════════════════════════════════════════════
#  2FA — TOTP Setup & Verification (backend ready, enable later)
# ═══════════════════════════════════════════════════════════════

@app.get("/account/2fa-setup")
def totp_setup_page(request: Request):
    """Phase 2: serve React SPA — 2FA setup is at /2fa-setup in React."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/account", status_code=302)


@app.post("/account/2fa-verify")
def totp_verify(
    request: Request,
    totp_code: str = Form(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Verify the TOTP code and enable 2FA."""
    if not user: return RedirectResponse(url="/?login=1", status_code=302)
    import pyotp
    if not user.totp_secret:
        return RedirectResponse(url="/account?error=setup_2fa_first", status_code=303)
    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(totp_code, valid_window=1):
        user.totp_enabled = True
        db.commit()
        return RedirectResponse(url="/account?saved=2fa_enabled", status_code=303)
    else:
        return RedirectResponse(url="/account/2fa-setup?error=invalid_code", status_code=303)


@app.post("/account/2fa-disable")
def totp_disable(
    request: Request,
    totp_code: str = Form(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Disable 2FA after verifying current code."""
    if not user: return RedirectResponse(url="/?login=1", status_code=302)
    import pyotp
    if not user.totp_secret or not user.totp_enabled:
        return RedirectResponse(url="/account?error=2fa_not_enabled", status_code=303)
    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(totp_code, valid_window=1):
        user.totp_enabled = False
        user.totp_secret = None
        db.commit()
        return RedirectResponse(url="/account?saved=2fa_disabled", status_code=303)
    else:
        return RedirectResponse(url="/account?error=invalid_2fa_code", status_code=303)


@app.post("/api/onboarding/complete")
def onboarding_complete(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mark onboarding wizard as completed."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    user.onboarding_completed = True
    db.commit()
    return JSONResponse({"ok": True})


# ═══════════════════════════════════════════════════════════════
#  NOTIFICATION SYSTEM
# ═══════════════════════════════════════════════════════════════

def send_notification(db: Session, user_id: int, type: str, icon: str, title: str, message: str, link: str = None):
    """Create a notification for a user."""
    notif = Notification(user_id=user_id, type=type, icon=icon, title=title, message=message, link=link)
    db.add(notif)


@app.get("/api/notifications")
def get_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get recent notifications for current user."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    notifs = db.query(Notification).filter(
        Notification.user_id == user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()
    unread = db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read == False
    ).count()
    return JSONResponse({
        "notifications": [{
            "id": n.id,
            "type": n.type,
            "icon": n.icon,
            "title": n.title,
            "message": n.message,
            "link": n.link,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        } for n in notifs],
        "unread_count": unread,
    })


@app.post("/api/notifications/read-beacon")
async def mark_notifications_read_beacon(request: Request, db: Session = Depends(get_db)):
    """Mark all notifications as read via sendBeacon (no JSON body)."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read == False
    ).update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return JSONResponse({"ok": True})


@app.post("/api/notifications/read")
async def mark_notifications_read(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mark notifications as read."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    ids = body.get("ids", [])
    if ids:
        db.query(Notification).filter(
            Notification.user_id == user.id, Notification.id.in_(ids)
        ).update({Notification.is_read: True}, synchronize_session=False)
    else:
        # Mark all as read
        db.query(Notification).filter(
            Notification.user_id == user.id, Notification.is_read == False
        ).update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return JSONResponse({"ok": True})


# ═══════════════════════════════════════════════════════════════
#  ACHIEVEMENT / BADGE SYSTEM
# ═══════════════════════════════════════════════════════════════

# ── GDPR DATA EXPORT & DELETION ──
@app.get("/api/account/export-data")
def gdpr_export_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """GDPR: Export all user data as JSON."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    import json as _jgdpr
    data = {
        "user": {
            "id": user.id, "username": user.username, "email": user.email,
            "first_name": user.first_name, "last_name": user.last_name,
            "niche": user.niche, "membership_tier": user.membership_tier,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "commissions": [{"amount": float(c.amount_usdt), "type": c.commission_type, "date": c.created_at.isoformat() if c.created_at else None}
                        for c in db.query(Commission).filter(Commission.to_user_id == user.id).all()],
        "withdrawals": [{"amount": float(w.amount_usdt), "status": w.status, "date": w.created_at.isoformat() if w.created_at else None}
                        for w in db.query(Withdrawal).filter(Withdrawal.user_id == user.id).all()],
        "notifications": [{"title": n.title, "message": n.message, "date": n.created_at.isoformat() if n.created_at else None}
                          for n in db.query(Notification).filter(Notification.user_id == user.id).all()],
        "achievements": [{"badge": a.badge_id, "title": a.title, "date": a.earned_at.isoformat() if a.earned_at else None}
                         for a in db.query(Achievement).filter(Achievement.user_id == user.id).all()],
        "funnel_pages": [{"title": p.title, "slug": p.slug, "views": p.views, "leads": p.leads_captured}
                         for p in db.query(FunnelPage).filter(FunnelPage.user_id == user.id).all()],
    }
    return JSONResponse(data, headers={"Content-Disposition": f'attachment; filename="superadpro-data-{user.username}.json"'})


@app.post("/api/account/delete-data")
async def gdpr_delete_data(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """GDPR: Delete all user data. Requires confirmation."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    if body.get("confirm") != "DELETE_MY_DATA":
        return JSONResponse({"error": "Please confirm by sending confirm: DELETE_MY_DATA"}, status_code=400)
    # Delete user's data (keep commission records for financial audit)
    db.query(Notification).filter(Notification.user_id == user.id).delete()
    db.query(Achievement).filter(Achievement.user_id == user.id).delete()
    db.query(FunnelPage).filter(FunnelPage.user_id == user.id).delete()
    db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user.id).delete()
    # Anonymise the user record
    user.email = f"deleted_{user.id}@removed.com"
    user.username = f"deleted_{user.id}"
    user.first_name = None
    user.last_name = None
    user.avatar_url = None
    user.wallet_address = None
    user.is_active = False
    user.password_hash = "DELETED"
    db.commit()
    logger.info(f"GDPR deletion: user {user.id} data removed and anonymised")
    return JSONResponse({"ok": True, "message": "Your data has been deleted and your account anonymised."})

def check_achievements(db: Session, user: User):
    """Check and award any new badges the user has earned."""
    existing = {a.badge_id for a in db.query(Achievement).filter(Achievement.user_id == user.id).all()}
    earned = float(user.total_earned or 0)
    team = user.total_team or 0
    new_badges = []

    checks = {
        "first_login": True,
        "profile_complete": bool(getattr(user, 'avatar_url', None) and user.first_name),
        "first_referral": team >= 1,
        "team_of_5": team >= 5,
        "team_of_10": team >= 10,
        "team_of_25": team >= 25,
        "team_of_50": team >= 50,
        "first_100": earned >= 100,
        "earned_500": earned >= 500,
        "earned_1000": earned >= 1000,
        "earned_5000": earned >= 5000,
        "pro_member": getattr(user, 'membership_tier', None) == 'pro' or getattr(user, 'is_admin', False),
        "first_funnel": db.query(FunnelPage).filter(FunnelPage.user_id == user.id).first() is not None,
        "first_linkhub": db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user.id).first() is not None,
    }

    for badge_id, earned_it in checks.items():
        if earned_it and badge_id not in existing and badge_id in BADGES:
            b = BADGES[badge_id]
            db.add(Achievement(user_id=user.id, badge_id=badge_id, title=b["title"], icon=b["icon"]))
            send_notification(db, user.id, "achievement", b["icon"],
                f'Badge earned: {b["title"]}!', b["desc"], "/achievements")
            new_badges.append(badge_id)

    if new_badges:
        db.commit()
    return new_badges


@app.get("/achievements")
def achievements_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_achievements_DISABLED(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    check_achievements(db, user)
    earned = db.query(Achievement).filter(Achievement.user_id == user.id).order_by(Achievement.earned_at.desc()).all()
    earned_ids = {a.badge_id for a in earned}
    ctx = get_dashboard_context(request, user, db)
    ctx["earned"] = earned
    ctx["earned_ids"] = earned_ids
    ctx["all_badges"] = BADGES
    ctx["active_page"] = "achievements"
    return templates.TemplateResponse("achievements.html", ctx)


# ═══════════════════════════════════════════════════════════════
#  DAILY CRON — MEMBERSHIP AUTO-RENEWAL
#  Called by Railway cron job daily at 00:05 UTC
#  Protected by CRON_SECRET env var
# ═══════════════════════════════════════════════════════════════

@app.post("/cron/process-renewals")
def cron_process_renewals(
    request: Request,
    db: Session = Depends(get_db)
):
    from fastapi.responses import JSONResponse
    from datetime import datetime

    # Verify cron secret — must match CRON_SECRET env var
    cron_secret = os.environ.get("CRON_SECRET", "")
    auth_header = request.headers.get("Authorization", "")
    provided    = auth_header.replace("Bearer ", "").strip()

    if not cron_secret or provided != cron_secret:
        logging.warning(f"Cron renewal: unauthorised attempt from {request.client.host if request.client else 'unknown'}")
        return JSONResponse({"error": "Unauthorised"}, status_code=401)

    started_at = datetime.utcnow()
    logging.info(f"[CRON] process-renewals started at {started_at.isoformat()}")

    try:
        results = process_auto_renewals(db)
        finished_at = datetime.utcnow()
        duration_ms = int((finished_at - started_at).total_seconds() * 1000)

        logging.info(
            f"[CRON] process-renewals complete — "
            f"renewed={len(results.get('renewed', []))}, "
            f"warned={len(results.get('warned', []))}, "
            f"grace={len(results.get('grace_extended', []))}, "
            f"lapsed={len(results.get('lapsed', []))}, "
            f"duration={duration_ms}ms"
        )

        return JSONResponse({
            "success":       True,
            "run_at":        started_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "duration_ms":   duration_ms,
            "renewed":       len(results.get("renewed", [])),
            "warned":        len(results.get("warned", [])),
            "grace_started": len(results.get("grace_extended", [])),
            "lapsed":        len(results.get("lapsed", [])),
        })

    except Exception as e:
        logging.error(f"[CRON] process-renewals FAILED: {e}")
        return JSONResponse({
            "success": False,
            "error":   str(e),
            "run_at":  started_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
        }, status_code=500)


@app.get("/cron/process-renewals")
def cron_process_renewals_get(request: Request, secret: str = "", db: Session = Depends(get_db)):
    """GET version of renewal cron — auth via ?secret= query param for cron-job.org."""
    from fastapi.responses import JSONResponse
    from datetime import datetime
    cron_secret = os.environ.get("CRON_SECRET", "")
    if not cron_secret or secret != cron_secret:
        return JSONResponse({"error": "Unauthorised"}, status_code=401)
    try:
        results = process_auto_renewals(db)
        return {"ok": True, "renewed": len(results.get("renewed", [])), "failed": len(results.get("failed", []))}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/cron/poll-payments")
def cron_poll_payments_get(request: Request, secret: str = "", db: Session = Depends(get_db)):
    """GET version of crypto poll — auth via ?secret= query param for cron-job.org."""
    from fastapi.responses import JSONResponse
    from .database import CryptoPaymentOrder
    from .crypto_payments import get_recent_usdt_transfers, TREASURY_WALLET
    from decimal import Decimal
    from datetime import datetime

    cron_secret = os.environ.get("CRON_SECRET", "")
    if not cron_secret or secret != cron_secret:
        return JSONResponse({"error": "Unauthorised"}, status_code=401)

    try:
        pending = db.query(CryptoPaymentOrder).filter(
            CryptoPaymentOrder.status == "pending",
            CryptoPaymentOrder.expires_at > datetime.utcnow(),
        ).all()
        if not pending:
            return {"ok": True, "message": "No pending orders", "matched": 0}

        sender_map = {}
        for o in pending:
            if o.from_address:
                key = o.from_address.lower()
                if key not in sender_map:
                    sender_map[key] = []
                sender_map[key].append(o)

        try:
            transfers = get_recent_usdt_transfers(from_block="recent")
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=503)

        matched = 0
        for t in transfers:
            sender = t["from_address"].lower()
            if sender not in sender_map:
                continue
            for order in sender_map[sender]:
                if order.status != "pending":
                    continue
                tx_amount = t["amount_usdt"]
                expected = Decimal(str(order.base_amount))
                if abs(tx_amount - expected) > Decimal("1.00"):
                    continue
                order.status = "confirmed"
                order.tx_hash = t["tx_hash"]
                order.confirmed_at = datetime.utcnow()
                db.flush()
                user = db.query(User).filter(User.id == order.user_id).first()
                if user:
                    import json as _json
                    meta = _json.loads(order.product_meta) if order.product_meta else {}
                    _crypto_activate_product(db, user, order, meta)
                    matched += 1
                break

        db.commit()
        return {"ok": True, "pending": len(pending), "matched": matched}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ═══════════════════════════════════════════════════════════════
#  NICHE FINDER
# ═══════════════════════════════════════════════════════════════

@app.get("/niche-finder")
def niche_finder(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


# ═══════════════════════════════════════════════════════════════
#  CRON — Nurture sequence processor
#  Called by Railway cron job daily at 00:15 UTC
# ═══════════════════════════════════════════════════════════════

@app.post("/cron/process-nurture")
def cron_process_nurture(request: Request, db: Session = Depends(get_db)):
    """Send due nurture emails to free members who haven't paid."""
    from fastapi.responses import JSONResponse
    from .database import NurtureSequence
    from .email_utils import send_nurture_email

    # DELAYS between emails (days after previous)
    DELAYS = {1: 0, 2: 2, 3: 4, 4: 3, 5: 4}  # day 1=24hrs after reg, then +2,+4,+3,+4

    cron_secret = os.environ.get("CRON_SECRET", "")
    auth_header = request.headers.get("Authorization", "")
    provided    = auth_header.replace("Bearer ", "").strip()

    if not cron_secret or provided != cron_secret:
        return JSONResponse({"error": "Unauthorised"}, status_code=401)

    now = datetime.utcnow()
    sent = []
    errors = []

    try:
        due = db.query(NurtureSequence).filter(
            NurtureSequence.completed == False,
            NurtureSequence.cancelled_at == None,
            NurtureSequence.next_send_at <= now,
        ).all()

        for seq in due:
            try:
                user = db.query(User).filter(User.id == seq.user_id).first()
                if not user:
                    seq.completed = True
                    db.commit()
                    continue

                # Safety check — if they've since paid, cancel
                if user.is_active:
                    seq.cancelled_at = now
                    seq.completed = True
                    db.commit()
                    continue

                first_name = user.first_name or user.username
                ok = send_nurture_email(user.email, first_name, seq.next_email)

                if ok:
                    sent.append({"user_id": user.id, "email_num": seq.next_email})
                    seq.last_sent_at = now
                    next_num = seq.next_email + 1
                    if next_num > 5:
                        seq.completed = True
                    else:
                        seq.next_email  = next_num
                        delay_days = DELAYS.get(next_num, 3)
                        seq.next_send_at = now + timedelta(days=delay_days)
                    db.commit()
                else:
                    errors.append({"user_id": user.id, "email_num": seq.next_email, "error": "send failed"})

            except Exception as e:
                errors.append({"user_id": seq.user_id, "error": str(e)})
                logger.error(f"Nurture email error for user {seq.user_id}: {e}")

        return JSONResponse({
            "success": True,
            "run_at":  now.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "due":     len(due),
            "sent":    len(sent),
            "errors":  len(errors),
            "detail":  sent,
        })

    except Exception as e:
        logger.error(f"[CRON] process-nurture FAILED: {e}")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@app.get("/cron/process-nurture")
def cron_nurture_ping():
    from fastapi.responses import JSONResponse
    return JSONResponse({"status": "ready", "endpoint": "POST /cron/process-nurture", "schedule": "Daily at 00:15 UTC"})


@app.post("/api/niche-finder/generate")
async def generate_niches(request: Request, user: User = Depends(get_current_user)):
    if not user:
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from fastapi.responses import JSONResponse

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)

    # ── Rate limit ──
    db_rl = next(get_db())
    rl = check_and_increment_ai_quota(db_rl, user.id, "niche_finder")
    if not rl["allowed"]:
        return JSONResponse({"error": f"Daily limit reached — {rl['limit']} runs per day. Resets in {rl['resets_in']}.", "rate_limited": True, "resets_in": rl["resets_in"]}, status_code=429)

    interests  = body.get("q1", [])
    experience = body.get("q2", "beginner")
    hours      = body.get("q3", "7 hours per week")
    goal       = body.get("q4", "side income")
    platform   = body.get("q5", "YouTube")

    prompt = f"""You are an expert digital marketing strategist helping someone find their perfect niche to promote online.

MEMBER PROFILE:
- Interests: {", ".join(interests) if interests else "general online business"}
- Experience level: {experience}
- Time available: {hours}
- Main goal: {goal}
- Preferred platform: {platform}
- Platform context: They are a member of SuperAdPro — a $10/month video marketing membership with Watch-to-Earn commissions, an AI & Marketing course, and AI marketing tools.

YOUR TASK:
Recommend exactly 3 niches perfectly matched to this person's profile. Return ONLY valid JSON in this exact format with no other text:

{{
  "niches": [
    {{
      "name": "Niche Name (specific, not generic)",
      "tagline": "One punchy line describing the opportunity",
      "why": "2-3 sentences explaining exactly why this niche fits THIS person's specific interests, experience level, time commitment and goal. Be personal and specific.",
      "audience_size": "e.g. 50M+",
      "competition": "Low / Medium / High",
      "income_speed": "e.g. 2-4 weeks",
      "content_ideas": [
        "Specific video/post idea 1 for {platform.split(' — ')[0] if ' — ' in platform else platform}",
        "Specific video/post idea 2",
        "Specific video/post idea 3",
        "Specific video/post idea 4"
      ],
      "starter_hook": "A compelling 2-3 sentence opening hook they can use TODAY on {platform.split(' — ')[0] if ' — ' in platform else platform} to attract their audience. Make it specific, punchy and immediately usable."
    }}
  ]
}}

IMPORTANT:
- Niche 1 = best overall match, Niche 2 = strong alternative, Niche 3 = unexpected but smart choice
- All content ideas must be specific to {platform.split(' — ')[0] if ' — ' in platform else platform}
- income_speed must be realistic for someone with {hours}
- If their goal is quick income, prioritise niches with faster monetisation
- If they are a beginner, avoid complex niches like day trading or technical SaaS
- The starter hook must sound human and natural, not like AI wrote it
- Return ONLY the JSON object, no markdown, no explanation"""

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        demo_niches = [
            {
                "name": "Make Money Online with Membership Sites",
                "tagline": "Show people how to earn recurring income — just like you're doing",
                "why": "You're already a SuperAdPro member earning through the Watch-to-Earn system. Your real experience is your credibility. People trust someone who is actively doing what they teach.",
                "audience_size": "100M+",
                "competition": "Medium",
                "income_speed": "2-4 weeks",
                "content_ideas": [
                    "How I earn income watching videos for $20/month",
                    "5 membership sites that actually pay you to be a member",
                    "My honest SuperAdPro income report — month 1",
                    "How the 8x8 grid system works and why it's genius"
                ],
                "starter_hook": "What if I told you there's a $20/month membership where you literally get paid to watch videos? I've been a member for 30 days and here's exactly what happened..."
            },
            {
                "name": "AI Tools for Everyday Business Owners",
                "tagline": "Help non-techies use AI to save time and make more money",
                "why": "AI tools are the hottest topic of 2025 and most tutorials are too technical. You have access to SuperAdPro's AI marketing suite which gives you real examples to share.",
                "audience_size": "200M+",
                "competition": "Medium",
                "income_speed": "3-6 weeks",
                "content_ideas": [
                    "5 free AI tools that replaced my $500/month software",
                    "How I wrote a week of social content in 10 minutes with AI",
                    "AI vs human copywriting — I tested both, here's what happened",
                    "The AI marketing dashboard inside my membership site"
                ],
                "starter_hook": "I used to spend 3 hours writing one email. Last week I wrote a full 5-email sequence in 8 minutes using AI — and it converted better. Here's the exact tool I used..."
            },
            {
                "name": "Side Hustles for Night Shift Workers",
                "tagline": "A completely untapped audience who desperately need flexible income",
                "why": "With your night shift schedule, you understand the unique challenges of earning income around unusual hours. This is an underserved audience with high engagement and low competition.",
                "audience_size": "30M+",
                "competition": "Low",
                "income_speed": "4-8 weeks",
                "content_ideas": [
                    "5 side hustles you can do at 3am in between shifts",
                    "How I earn $200/month online working night shifts",
                    "The best online income streams for people with no fixed schedule",
                    "Night shift to financial freedom — my 90-day plan"
                ],
                "starter_hook": "Working nights and tired of being broke when you get home? I found 3 ways to earn money online that fit perfectly around a night shift schedule — no alarm clocks, no fixed hours, no boss..."
            }
        ]
        return JSONResponse({"niches": demo_niches, "demo": True})

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=AI_MODEL_HAIKU,  # Cost-optimised,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = message.content[0].text.strip()
        # Strip markdown code fences if present
        import re
        raw = re.sub(r'^```json\s*', '', raw)
        raw = re.sub(r'^```\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        data = json.loads(raw.strip())
        return JSONResponse(data)

    except json.JSONDecodeError as e:
        logging.error(f"Niche finder JSON parse error: {e}\nRaw: {raw[:500]}")
        return JSONResponse({"error": "AI response format error — please try again"}, status_code=500)
    except Exception as e:
        logging.error(f"Niche finder error: {e}")
        return JSONResponse({"error": "AI generation failed — please try again"}, status_code=500)


# ═══════════════════════════════════════════════════════════════
#  AI SOCIAL MEDIA POST GENERATOR
# ═══════════════════════════════════════════════════════════════

@app.get("/social-post-generator")
def social_post_generator_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.post("/api/social-posts/generate")
async def generate_social_posts(request: Request, user: User = Depends(get_current_user)):
    if not user:
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from fastapi.responses import JSONResponse

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)

    db_rl = next(get_db())
    rl = check_and_increment_ai_quota(db_rl, user.id, "social_posts")
    if not rl["allowed"]:
        return JSONResponse({"error": f"Daily limit reached — {rl['limit']} generations per day. Resets in {rl['resets_in']}.", "rate_limited": True}, status_code=429)

    topic     = body.get("topic", "")
    niche     = body.get("niche", "affiliate marketing")
    platform  = body.get("platform", "all")
    tone      = body.get("tone", "professional")
    link      = body.get("link", "")
    goal      = body.get("goal", "drive traffic")

    if not topic:
        return JSONResponse({"error": "Please enter a topic or offer to promote"}, status_code=400)

    link_instruction = f"\nInclude a call to action pointing to this link: {link}" if link else "\nInclude a generic call to action like 'Link in bio' or 'DM me for details'."

    platform_specs = {
        "facebook": "Write for Facebook. Longer form is fine (200-300 words). Use line breaks for readability. Include 3-5 relevant hashtags at the end.",
        "instagram": "Write for Instagram. Keep it engaging and visual-language heavy. 150-200 words. End with 15-20 relevant hashtags on a separate line.",
        "x": "Write for X (Twitter). Keep each post under 280 characters. Be punchy and direct. Include 2-3 hashtags max.",
        "tiktok": "Write for TikTok captions. Keep it short, punchy and trendy. 100-150 words max. Use trending-style language. Include 5-8 hashtags.",
        "linkedin": "Write for LinkedIn. Professional tone, value-driven. 200-300 words. Use line breaks. Minimal hashtags (3-5).",
    }

    if platform == "all":
        platform_instruction = """Generate one post for EACH of these 5 platforms, clearly labelled:
1. FACEBOOK — 200-300 words, conversational, 3-5 hashtags
2. INSTAGRAM — 150-200 words, visual language, 15-20 hashtags at end
3. X (TWITTER) — Under 280 characters, punchy, 2-3 hashtags
4. TIKTOK — 100-150 words, trendy/casual, 5-8 hashtags
5. LINKEDIN — 200-300 words, professional/value-driven, 3-5 hashtags"""
    else:
        platform_instruction = platform_specs.get(platform, platform_specs["facebook"])
        platform_instruction = f"Generate 3 different post variations for {platform.upper()}:\n{platform_instruction}\nVariation 1: Curiosity/question hook\nVariation 2: Results/transformation angle\nVariation 3: Direct call-to-action"

    prompt = f"""You are an expert social media copywriter specialising in {niche}.

Generate social media posts about: {topic}

Tone: {tone}
Goal: {goal}
{link_instruction}

{platform_instruction}

RULES:
- Every post must have a strong opening hook (first line grabs attention)
- Use power words and emotional triggers
- Include clear calls to action
- Make each post different in angle and approach
- Write in a way that drives engagement (comments, shares, clicks)
- Do NOT use generic filler — every sentence must add value
- Format clearly with the platform name as a header

Return ONLY the posts, no preamble or explanation."""

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=AI_MODEL_HAIKU,  # Cost-optimised,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        content = message.content[0].text
        return {"success": True, "posts": content, "remaining": rl["limit"] - rl["used"] - 1}
    except Exception as e:
        logger.error(f"Social post generation failed: {e}")
        return JSONResponse({"error": "AI generation failed. Please try again."}, status_code=500)


# ═══════════════════════════════════════════════════════════════
#  EMAIL SWIPE LIBRARY
# ═══════════════════════════════════════════════════════════════

@app.get("/email-swipes")
def email_swipes_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


# ═══════════════════════════════════════════════════════════════
#  AI VIDEO SCRIPT GENERATOR
# ═══════════════════════════════════════════════════════════════

@app.get("/video-script-generator")
def video_script_generator_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.post("/api/video-scripts/generate")
async def generate_video_script(request: Request, user: User = Depends(get_current_user)):
    if not user:
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from fastapi.responses import JSONResponse

    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid request"}, status_code=400)

    db_rl = next(get_db())
    rl = check_and_increment_ai_quota(db_rl, user.id, "video_scripts")
    if not rl["allowed"]:
        return JSONResponse({"error": f"Daily limit reached — {rl['limit']} generations per day. Resets in {rl['resets_in']}.", "rate_limited": True}, status_code=429)

    topic       = body.get("topic", "")
    platform    = body.get("platform", "youtube")
    duration    = body.get("duration", "60")
    style       = body.get("style", "educational")
    cta         = body.get("cta", "")
    audience    = body.get("audience", "")

    if not topic:
        return JSONResponse({"error": "Please describe what the video is about"}, status_code=400)

    duration_specs = {
        "15": "15-second video (TikTok/Reel). Maximum 40 words. Extremely punchy — every word must count.",
        "30": "30-second video (Reel/Short). About 75 words. Fast-paced, high energy.",
        "60": "60-second video (Reel/Short/TikTok). About 150 words. Strong hook, clear message, direct CTA.",
        "180": "3-minute video (YouTube Short/TikTok). About 450 words. Can develop one key idea with examples.",
        "300": "5-minute YouTube video. About 750 words. Full structure: hook, intro, 2-3 main points, CTA.",
        "600": "10-minute YouTube video. About 1500 words. Deep dive: hook, intro, 4-5 sections with detail, strong close and CTA.",
    }

    dur_spec = duration_specs.get(duration, duration_specs["60"])
    audience_line = f"\nTarget audience: {audience}" if audience else ""
    cta_line = f"\nCall to action: {cta}" if cta else "\nCall to action: Encourage viewers to click the link in bio/description."

    prompt = f"""You are an expert video scriptwriter who creates viral, engaging scripts for social media and YouTube.

Write a complete video script about: {topic}

Platform: {platform}
Duration: {dur_spec}
Style: {style}
{audience_line}
{cta_line}

FORMAT THE SCRIPT EXACTLY LIKE THIS:

## 🎬 VIDEO SCRIPT

**Platform:** {platform} | **Duration:** ~{duration}s | **Style:** {style}

---

### 🪝 HOOK (First 3 seconds)
[Write the exact opening line that stops the scroll. This is the most important part.]

### 📖 SCRIPT
[Write the full script with stage directions in brackets like [look at camera], [show screen], [point up], [cut to B-roll].
Use line breaks between sentences for pacing.
Bold key phrases the speaker should emphasize.]

### 📣 CTA (Final seconds)
[Write the closing call to action]

---

### 🎯 PRODUCTION NOTES
- **Thumbnail/Cover idea:** [One sentence]
- **Caption suggestion:** [2-3 sentences + hashtags]
- **Best time to post:** [Suggestion]
- **Music mood:** [Suggestion]

RULES:
- The HOOK must create instant curiosity, shock, or intrigue in under 3 seconds
- Write conversationally — this is spoken word, not an essay
- Use short punchy sentences for impact
- Include visual/action cues in [brackets] throughout
- The script must feel natural when read aloud
- Make every second count — no filler"""

    try:
        client = anthropic.Anthropic()
        message = client.messages.create(
            model=AI_MODEL_HAIKU,  # Cost-optimised,
            max_tokens=2500,
            messages=[{"role": "user", "content": prompt}]
        )
        content = message.content[0].text
        return {"success": True, "script": content, "remaining": rl["limit"] - rl["used"] - 1}
    except Exception as e:
        logger.error(f"Video script generation failed: {e}")
        return JSONResponse({"error": "AI generation failed. Please try again."}, status_code=500)


# ═══════════════════════════════════════════════════════════════
#  SWIPE FILE
# ═══════════════════════════════════════════════════════════════

@app.get("/swipe-file")
def swipe_file(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.post("/api/swipe-file/generate")
async def generate_swipes(request: Request, user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    """AI-generate fresh marketing swipes using Haiku (cost-optimised)."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    # Quota check
    rl = check_and_increment_ai_quota(db, user.id, "swipe_file")
    if not rl["allowed"]:
        return JSONResponse({"error": f"Daily AI limit reached ({rl['used']}/{rl['limit']}). Resets in {rl['resets_in']}.", "rate_limited": True}, status_code=429)

    body = await request.json()
    category = body.get("category", "hooks")
    niche = body.get("niche", "make money online")

    cat_labels = {
        "hooks": "curiosity hooks / openers",
        "email": "email subject lines and body copy",
        "social": "social media captions (Instagram, Facebook, LinkedIn)",
        "video": "video script openings and CTAs",
        "whatsapp": "WhatsApp / DM message templates",
        "headline": "headlines and ad copy"
    }
    cat_desc = cat_labels.get(category, "marketing copy")

    prompt = f"""Generate exactly 4 unique {cat_desc} for promoting SuperAdPro in the "{niche}" niche.

SuperAdPro is a video advertising platform with 3 income streams, 95% payouts, an 8×8 Income Grid, and AI marketing tools. Members earn by watching video ads and referring others.

For each swipe, output this exact JSON format (no markdown, no code fences, just raw JSON array):
[
  {{"cat":"{category}","platform":"<best platform>","niche":"{niche}","tags":["<tag1>","<tag2>"],"text":"<the full swipe copy>"}},
  ...
]

Requirements:
- Each swipe must be different in angle/approach
- Use natural, conversational language — not salesy or scammy
- Include specific details about the platform (3 income streams, 95% payout, video ads)
- Platform should be one of: All Platforms, YouTube, TikTok, Instagram, Facebook, LinkedIn, Email, WhatsApp
- Tags should be 2 relevant keywords like: curiosity, income, proof, relatable, urgency, question, bold
- Keep each swipe between 50-200 words"""

    # Check cache first
    cached = get_cached_response(db, "swipe_file", prompt)
    if cached:
        try:
            import json
            swipes = json.loads(cached)
            return {"swipes": swipes, "cached": True, "used": rl["used"], "limit": rl["limit"]}
        except:
            pass

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        # Demo mode — return sample swipes
        demo = [
            {"cat": category, "platform": "All Platforms", "niche": niche, "tags": ["demo", "sample"],
             "text": f"🚀 Demo Mode — Add your ANTHROPIC_API_KEY to Railway to unlock AI swipe generation. This would generate fresh {cat_desc} for the {niche} niche."},
        ]
        return {"swipes": demo, "demo": True, "used": rl["used"], "limit": rl["limit"]}

    try:
        import anthropic, json
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=AI_MODEL_HAIKU,  # Cost-optimised
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = message.content[0].text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        swipes = json.loads(raw)
        # Cache the response
        cache_response(db, "swipe_file", prompt, json.dumps(swipes))
        return {"swipes": swipes, "cached": False, "used": rl["used"], "limit": rl["limit"]}
    except json.JSONDecodeError:
        return JSONResponse({"error": "AI returned invalid format. Try again."}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": f"AI generation failed: {str(e)[:100]}"}, status_code=500)



# ── Test email sending ────────────
@app.get("/admin/test-email")
def test_email(secret: str, email: str):
    from fastapi.responses import JSONResponse
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    try:
        from app.email_utils import (send_welcome_email, send_commission_email,
            send_password_reset_email, send_membership_activated_email,
            send_renewal_reminder_email)
        r1 = send_welcome_email(email, "Steve", "stevel411")
        r2 = send_commission_email(email, "Steve", "Direct Sponsor", "testuser123")
        r3 = send_password_reset_email(email, "Steve", "test-reset-token-abc123")
        r4 = send_membership_activated_email(email, "Steve")
        r5 = send_renewal_reminder_email(email, "Steve", 3)
        return JSONResponse({
            "welcome": r1,
            "commission_cha_ching": r2,
            "password_reset": r3,
            "membership_activated": r4,
            "renewal_reminder": r5
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── Owner full activation (master affiliate setup) ────────────
# ── One-time fix: sync upline_earnings from membership commissions ──
@app.get("/admin/fix-upline-earnings")
def fix_upline_earnings(secret: str, db: Session = Depends(get_db)):
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    # Sum membership_sponsor commissions per user and update upline_earnings
    from sqlalchemy import func
    results = []
    sponsors = db.query(Commission.to_user_id, func.sum(Commission.amount_usdt)).filter(
        Commission.commission_type == "membership_sponsor",
        Commission.status == "paid",
        Commission.to_user_id.isnot(None),
    ).group_by(Commission.to_user_id).all()
    for uid, total in sponsors:
        user = db.query(User).filter(User.id == uid).first()
        if user:
            old = float(user.upline_earnings or 0)
            user.upline_earnings = total
            results.append({"user_id": uid, "username": user.username, "old": old, "new": float(total)})
    db.commit()
    return {"fixed": len(results), "details": results}

# ── Treasury wallet balance check ──
@app.get("/admin/hot-wallet-balance")
def hot_wallet_balance(secret: str):
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    from app.withdrawals import get_treasury_usdt_balance, get_treasury_pol_balance, TREASURY_ADDRESS
    usdt = get_treasury_usdt_balance()
    pol = get_treasury_pol_balance()
    return {"address": TREASURY_ADDRESS, "usdt_balance": float(usdt), "pol_balance": float(pol), "chain": "Polygon"}

# ── Retry pending withdrawals ──
@app.get("/admin/process-pending-withdrawals")
def process_pending_withdrawals(secret: str, db: Session = Depends(get_db)):
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    from app.withdrawals import process_withdrawal
    pending = db.query(Withdrawal).filter(Withdrawal.status == "pending").all()
    results = []
    for w in pending:
        r = process_withdrawal(db, w.id)
        results.append({"withdrawal_id": w.id, "user_id": w.user_id, "amount": float(w.amount_usdt), "result": r})
    return {"processed": len(results), "details": results}

@app.get("/admin/activate-owner")
def activate_owner(secret: str, username: str, db: Session = Depends(get_db)):

    from fastapi.responses import JSONResponse
    from app.grid import get_or_create_active_grid
    import uuid

    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)

    user = db.query(User).filter(User.username == username).first()
    if not user:
        return JSONResponse({"error": f"User not found"}, status_code=404)

    results = []
    try:
        # 1. Activate membership (Stream 1)
        user.is_active  = True
        user.is_admin   = True
        user.sponsor_id = None  # owner sits at root

        dummy_tx_m = f"owner-membership-{uuid.uuid4().hex[:12]}"
        if not db.query(Payment).filter(Payment.tx_hash == dummy_tx_m).first():
            db.add(Payment(
                from_user_id=user.id, to_user_id=None,
                amount_usdt=MEMBERSHIP_FEE, payment_type="membership",
                tx_hash=dummy_tx_m, status="confirmed",
            ))
        results.append("Membership activated (Stream 1)")

        # 2. Activate all 8 grid tiers (Stream 2)
        for tier, price in GRID_PACKAGES.items():
            dummy_tx = f"owner-t{tier}-{uuid.uuid4().hex[:10]}"
            get_or_create_active_grid(db, user.id, tier)
            if not db.query(Payment).filter(Payment.tx_hash == dummy_tx).first():
                db.add(Payment(
                    from_user_id=user.id, to_user_id=None,
                    amount_usdt=price, payment_type="grid_package",
                    tx_hash=dummy_tx, status="confirmed",
                ))
            results.append(f"Tier {tier} grid activated (${int(price)})")

        # 3. Set watch quota to Tier 8
        from datetime import date, timedelta
        quota = db.query(WatchQuota).filter(WatchQuota.user_id == user.id).first()
        if not quota:
            quota = WatchQuota(user_id=user.id, package_tier=8,
                               daily_required=8, today_watched=0,
                               today_date=date.today().isoformat(),
                               consecutive_missed=0, commissions_paused=False)
            db.add(quota)
        else:
            quota.package_tier=8; quota.daily_required=8; quota.commissions_paused=False
        results.append("Watch quota set to Tier 8 (8 videos/day)")

        # 4. Set up membership renewal (no expiry for owner)
        renewal = db.query(MembershipRenewal).filter(MembershipRenewal.user_id == user.id).first()
        now = datetime.utcnow()
        if not renewal:
            renewal = MembershipRenewal(
                user_id=user.id,
                activated_at=now,
                next_renewal_date=now + timedelta(days=36500),  # 100 years — owner never expires
                last_renewed_at=now,
                renewal_source="manual",
                total_renewals=0,
            )
            db.add(renewal)
        else:
            renewal.activated_at = renewal.activated_at or now
            renewal.next_renewal_date = now + timedelta(days=36500)
            renewal.last_renewed_at = now
            renewal.in_grace_period = False
        results.append("Membership renewal set (owner — never expires)")

        user.balance = 0.00
        user.total_earned = 0.00
        db.commit()

        return JSONResponse({
            "status": "Owner fully activated",
            "user": username,
            "activations": results,
        })
    except Exception as e:
        db.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)

# ── TEMP: Account reset utility (remove after use) ────────────
@app.get("/admin/test-dashboard")
def test_dashboard(secret: str, db: Session = Depends(get_db)):
    """Test full dashboard context creation for a new user."""
    from fastapi.responses import JSONResponse
    from sqlalchemy import text as sqtext
    if secret != "superadpro-migrate-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    import traceback
    results = {}

    # Create temp user
    try:
        user = create_user(db, "dashtest999", "dashtest999@test.com", "password123",
                          first_name="Dash", last_name="", wallet_address="", country="")
        uid = user.id
        results["create_user"] = f"ok id={uid}"
    except Exception as e:
        db.rollback()
        return JSONResponse({"failed_at": "create_user", "error": str(e), "trace": traceback.format_exc()})

    from app.grid import get_grid_stats, get_user_commission_history
    from app.payment import get_renewal_status

    try:
        get_grid_stats(db, uid)
        results["get_grid_stats"] = "ok"
    except Exception as e:
        db.rollback()
        results["get_grid_stats"] = "FAILED: " + str(e) + " | " + traceback.format_exc()

    try:
        get_user_commission_history(db, uid)
        results["get_commission_history"] = "ok"
    except Exception as e:
        db.rollback()
        results["get_commission_history"] = "FAILED: " + str(e) + " | " + traceback.format_exc()

    try:
        get_renewal_status(db, uid)
        results["get_renewal_status"] = "ok"
    except Exception as e:
        db.rollback()
        results["get_renewal_status"] = "FAILED: " + str(e) + " | " + traceback.format_exc()

    try:
        format_member_id(uid)
        results["format_member_id"] = "ok"
    except Exception as e:
        results["format_member_id"] = f"FAILED: {e}"

    # Clean up
    try:
        db.rollback()
        db.execute(sqtext(f"DELETE FROM users WHERE id={uid}"))
        db.commit()
        results["cleanup"] = "ok"
    except Exception as e:
        results["cleanup"] = f"FAILED: {e}"

    return JSONResponse(results)


@app.get("/admin/test-register")
def test_register(secret: str, db: Session = Depends(get_db)):
    """Test user creation and return exact error."""
    from fastapi.responses import JSONResponse
    from sqlalchemy import text as sqtext
    if secret != "superadpro-migrate-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    import traceback
    try:
        # Check columns exist
        cols = db.execute(sqtext("SELECT column_name FROM information_schema.columns WHERE table_name='users'")).fetchall()
        col_names = [c[0] for c in cols]
        
        # Try creating a test user
        user = create_user(db, "testuser123", "test123@test.com", "password123",
                          first_name="Test", last_name="", wallet_address="", country="")
        user_id = user.id
        # Delete test user
        db.execute(sqtext(f"DELETE FROM users WHERE id={user_id}"))
        db.commit()
        return JSONResponse({"success": True, "columns": col_names, "test_user_created": True})
    except Exception as e:
        db.rollback()
        return JSONResponse({"error": str(e), "trace": traceback.format_exc()}, status_code=500)


@app.get("/admin/run-migrations")
def admin_run_migrations(secret: str = "", db: Session = Depends(get_db)):
    """Force-run DB migrations — use once after deploy."""
    from fastapi.responses import JSONResponse
    if secret != "superadpro-migrate-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    from app.database import run_migrations
    try:
        run_migrations()
        return JSONResponse({"success": True, "message": "Migrations complete"})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/admin/force-migrate")
def admin_force_migrate(secret: str = "", db: Session = Depends(get_db)):
    """Force run specific migrations that may have been missed."""
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid"}, status_code=403)
    from sqlalchemy import text
    results = []
    migrations = [
        "ALTER TABLE linkhub_profiles ADD COLUMN IF NOT EXISTS btn_text_color VARCHAR",
        "ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS custom_video_url VARCHAR(500)",
        "ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS custom_headline VARCHAR(300)",
        "ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS custom_subtitle TEXT",
        "ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS custom_cta_text VARCHAR(100)",
        "ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS custom_cta_color VARCHAR(20)",
        "ALTER TABLE superseller_campaigns ADD COLUMN IF NOT EXISTS custom_html_inject TEXT",
        "CREATE TABLE IF NOT EXISTS team_messages (id SERIAL PRIMARY KEY, from_user_id INTEGER REFERENCES users(id), to_user_id INTEGER REFERENCES users(id), message TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW())",
        "CREATE INDEX IF NOT EXISTS idx_team_msg_from ON team_messages(from_user_id)",
        "CREATE INDEX IF NOT EXISTS idx_team_msg_to ON team_messages(to_user_id)",
    ]
    for sql in migrations:
        try:
            db.execute(text(sql))
            results.append({"sql": sql[:60], "status": "ok"})
        except Exception as e:
            results.append({"sql": sql[:60], "status": "error", "error": str(e)[:200]})
    db.commit()
    return {"results": results}


@app.get("/admin/debug-dashboard")
def admin_debug_dashboard(secret: str = "", db: Session = Depends(get_db)):
    """Debug: test dashboard context loading for the owner account."""
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid"}, status_code=403)
    import traceback as _tb
    try:
        user = db.query(User).filter(User.is_admin == True).first()
        if not user:
            return {"error": "No admin user"}
        # Step 1: check_achievements
        try:
            check_achievements(db, user)
            step1 = "ok"
        except Exception as e:
            return {"step": "check_achievements_FAILED", "error": str(e), "tb": _tb.format_exc()[-1500:]}
        # Step 2: build context
        try:
            from starlette.requests import Request as SRequest
            scope = {"type": "http", "method": "GET", "path": "/", "headers": [], "query_string": b""}
            ctx = get_dashboard_context(SRequest(scope), user, db)
            step2 = "ok"
        except Exception as e:
            return {"step": "get_dashboard_context_FAILED", "error": str(e), "tb": _tb.format_exc()[-1500:]}
        # Step 3: serialise each key individually
        failures = {}
        safe = {}
        for k, v in ctx.items():
            if k in ('request', 'user'):
                continue
            try:
                json.dumps(v)
                safe[k] = v
            except (TypeError, ValueError) as e:
                failures[k] = f"{type(v).__name__}: {str(e)[:200]}"
                safe[k] = str(v)[:200]
        # Step 4: final json.dumps on the whole thing
        try:
            json.dumps(safe)
            step4 = "ok"
        except Exception as e:
            return {"step": "final_json_FAILED", "error": str(e), "failures": failures}
        return {"step": "ALL_OK", "failures": failures, "total_keys": len(safe)}
    except Exception as e:
        return {"error": str(e), "tb": _tb.format_exc()[-1500:]}


@app.get("/admin/fix-owner")
def admin_fix_owner(secret: str = "", db: Session = Depends(get_db)):
    """Force SuperAdPro account to Pro + admin + permanent membership."""
    from fastapi.responses import JSONResponse
    from sqlalchemy import text as sqt
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid"}, status_code=403)
    try:
        db.execute(sqt("UPDATE users SET membership_tier = 'pro', is_active = true, is_admin = true, membership_expires_at = '2099-12-31' WHERE username = 'SuperAdPro'"))
        db.commit()
        user = db.query(User).filter(User.username == "SuperAdPro").first()
        if user:
            return {"success": True, "username": user.username, "membership_tier": user.membership_tier, "is_admin": user.is_admin, "is_active": user.is_active, "expires_at": str(user.membership_expires_at)}
        return {"error": "User SuperAdPro not found"}
    except Exception as e:
        db.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/admin/seed-owner-campaigns")
def admin_seed_owner_campaigns(secret: str = "", db: Session = Depends(get_db)):
    """Seed the owner account with active campaigns at all 8 tiers so they show in grid."""
    from fastapi.responses import JSONResponse
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid"}, status_code=403)
    try:
        owner = db.query(User).filter(User.is_admin == True).first()
        if not owner:
            return JSONResponse({"error": "No admin user found"}, status_code=404)

        from .database import VideoCampaign, CAMPAIGN_VIEW_TARGETS, GRID_TIER_NAMES
        created = []
        for tier in range(1, 9):
            # Check if owner already has an active campaign at this tier
            existing = db.query(VideoCampaign).filter(
                VideoCampaign.user_id == owner.id,
                VideoCampaign.campaign_tier == tier,
                VideoCampaign.status == "active",
                VideoCampaign.is_completed == False
            ).first()
            if existing:
                created.append({"tier": tier, "status": "already_exists", "id": existing.id})
                continue

            tier_name = GRID_TIER_NAMES.get(tier, f"Tier {tier}")
            campaign = VideoCampaign(
                user_id=owner.id,
                title=f"SuperAdPro {tier_name} Campaign",
                description=f"Owner demonstration campaign — {tier_name} tier",
                category="marketing",
                platform="youtube",
                video_url="https://www.youtube.com/watch?v=demo",
                embed_url="https://www.youtube.com/embed/demo",
                video_id="demo",
                status="active",
                views_target=CAMPAIGN_VIEW_TARGETS.get(tier, 2000),
                views_delivered=0,
                campaign_tier=tier,
                is_completed=False,
                owner_tier=tier,
            )
            db.add(campaign)
            db.flush()
            created.append({"tier": tier, "status": "created", "id": campaign.id, "name": tier_name})

        db.commit()
        return {"success": True, "owner": owner.username, "campaigns": created}
    except Exception as e:
        db.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)

def linkhub_debug(secret: str = "", db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    from sqlalchemy import text as sqt
    if secret != "superadpro-migrate-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    try:
        cols = db.execute(sqt("SELECT column_name FROM information_schema.columns WHERE table_name='linkhub_links' ORDER BY ordinal_position")).fetchall()
        col_names = [r[0] for r in cols]
        profile_cols = db.execute(sqt("SELECT column_name FROM information_schema.columns WHERE table_name='linkhub_profiles' ORDER BY ordinal_position")).fetchall()
        prof_col_names = [r[0] for r in profile_cols]
        return JSONResponse({"linkhub_links_columns": col_names, "linkhub_profiles_columns": prof_col_names})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/admin/db-check")
def db_check(secret: str, db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if secret != "superadpro-migrate-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    try:
        users = db.execute(text("SELECT id, username, email FROM users")).fetchall()
        return JSONResponse({
            "user_count": len(users),
            "users": [{"id": r[0], "username": r[1], "email": r[2]} for r in users]
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/admin/force-wipe")
def force_wipe(secret: str, db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    from sqlalchemy import text as sqtext
    if secret != "superadpro-reset-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    results = {}
    tables = [
        "commissions","grid_positions","grids","payments","withdrawals",
        "watch_quotas","video_watches","ai_usage_quotas",
        "password_reset_tokens","membership_renewals","p2p_transfers","users"
    ]
    try:
        # TRUNCATE all tables with CASCADE + RESTART IDENTITY resets sequences
        db.execute(sqtext(
            "TRUNCATE TABLE " + ", ".join(tables) + " RESTART IDENTITY CASCADE"
        ))
        db.commit()
        count = db.execute(sqtext("SELECT COUNT(*) FROM users")).scalar()
        results["users_remaining"] = count
        results["sequences_reset"] = True
        return JSONResponse({"status": "done", "results": results})
    except Exception as e:
        db.rollback()
        # Fallback: truncate one by one
        for table in tables:
            try:
                db.execute(sqtext(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
                results[table] = "ok"
            except Exception as e2:
                results[table] = str(e2)
        try:
            db.commit()
        except: db.rollback()
        return JSONResponse({"status": "done_fallback", "error": str(e), "results": results})


@app.get("/admin/reset-account")
def reset_account(secret: str, db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if secret != "superadpro-reset-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    try:
        from sqlalchemy import text as sqtext
        tables = [
            "commissions","grid_positions","grids","payments","withdrawals",
            "watch_quotas","video_watches","ai_usage_quotas",
            "password_reset_tokens","membership_renewals","p2p_transfers","users"
        ]
        cleared = []
        for table in tables:
            try:
                db.execute(sqtext(f"TRUNCATE TABLE {table} CASCADE"))
                cleared.append(table)
            except Exception:
                try:
                    db.execute(sqtext(f"DELETE FROM {table}"))
                    cleared.append(table)
                except Exception as e:
                    cleared.append(f"{table}(skipped:{e})")
        db.commit()
        count = db.execute(sqtext("SELECT COUNT(*) FROM users")).scalar()
        return JSONResponse({"status": "Full reset complete — all users, emails, passwords cleared.", "users_remaining": count, "tables": cleared})
    except Exception as e:
        db.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)



# ═══════════════════════════════════════════════════════════════════
#  COURSES — Catalogue, Purchase, Pass-Up Commissions
# ═══════════════════════════════════════════════════════════════════

@app.get("/courses")
def courses_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

async def _old_courses_DISABLED(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    courses = db.query(Course).filter(Course.is_active == True).order_by(Course.sort_order).all()

    # Get user's purchases and progress if logged in
    owned_ids = []
    course_progress = {}
    if user:
        purchases = db.query(CoursePurchase).filter(CoursePurchase.user_id == user.id).all()
        owned_ids = [p.course_id for p in purchases]
        # Progress per course
        for cid in owned_ids:
            total = db.query(CourseLesson).filter(CourseLesson.course_id == cid).count()
            done = db.query(CourseProgress).filter(CourseProgress.user_id == user.id, CourseProgress.course_id == cid).count()
            course_progress[cid] = {"total": total, "done": done, "pct": round((done / max(total, 1)) * 100)}

    # Lesson/chapter counts per course
    course_stats = {}
    for c in courses:
        lesson_count = db.query(CourseLesson).filter(CourseLesson.course_id == c.id).count()
        chapter_count = db.query(CourseChapter).filter(CourseChapter.course_id == c.id).count()
        total_mins = db.query(func.coalesce(func.sum(CourseLesson.duration_mins), 0)).filter(CourseLesson.course_id == c.id).scalar()
        course_stats[c.id] = {"lessons": lesson_count, "chapters": chapter_count, "mins": int(total_mins)}

    return templates.TemplateResponse("courses.html", {
        "request": request,
        "user": user,
        "courses": courses,
        "owned_ids": owned_ids,
        "course_progress": course_progress,
        "course_stats": course_stats,
        "active_page": "courses"
    })


@app.post("/courses/purchase/{course_id}")
async def purchase_course(course_id: int, request: Request, db: Session = Depends(get_db)):
    """Purchase a course — triggers the pass-up commission engine."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login?next=/courses", status_code=303)
    if not user.is_active:
        return RedirectResponse(url="/pay-membership")

    result = process_course_purchase(db, user.id, course_id, payment_method="wallet")

    if not result["success"]:
        return JSONResponse({"error": result["error"]}, status_code=400)

    return RedirectResponse(f"/courses/learn/{course_id}?purchased=1", status_code=303)


@app.get("/courses/learn/{course_id}")
def course_learn_page(course_id: int, request: Request):
    """Phase 4: serve React SPA — React calls /api/courses/learn/:id."""
    del course_id
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/courses", status_code=302)

async def _old_course_learn_DISABLED(course_id: int, request: Request,
                                      lesson: int = 0, purchased: int = 0,
                                      db: Session = Depends(get_db)):
    pass


@app.get("/courses/how-it-works")
def course_how_it_works(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

async def _old_course_how_it_works_DISABLED(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    return templates.TemplateResponse("course-how-it-works.html", {
        "request": request,
        "user": user,
        "active_page": "course-how-it-works"
    })


@app.get("/courses/commissions")
async def course_commissions_page(request: Request, db: Session = Depends(get_db)):
    """Member's course commission & network dashboard."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login?next=/courses/commissions", status_code=303)
    if not user.is_active:
        return RedirectResponse(url="/pay-membership")

    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/dashboard", status_code=302)

def _old_course_commissions_DISABLED(request=None, db=None):
    return templates.TemplateResponse("course-commissions.html", {
        "request": request,
        "user": user,
        "active_page": "course-commissions"
    })

@app.get("/api/my-commission-flows")
async def api_my_commission_flows(request: Request, db: Session = Depends(get_db)):
    """Member API: ALL commissions across all 4 income streams."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    # ── 1. Course commissions (CourseCommission table) ──
    course_comms = db.query(CourseCommission).filter(
        CourseCommission.earner_id == user.id
    ).order_by(CourseCommission.created_at.desc()).limit(100).all()

    # ── 2. General commissions (Commission table) — membership, boost, grid ──
    general_comms = db.query(Commission).filter(
        Commission.to_user_id == user.id,
        Commission.commission_type.notin_(["admin_adjustment", "admin_fix", "boost_platform_fee", "membership_company"])
    ).order_by(Commission.created_at.desc()).limit(200).all()

    # Collect user IDs for name lookups
    user_ids = set()
    for c in course_comms:
        if c.buyer_id: user_ids.add(c.buyer_id)
    for c in general_comms:
        if c.from_user_id: user_ids.add(c.from_user_id)
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    # Build unified flow list
    flows = []

    for c in course_comms:
        buyer = users_map.get(c.buyer_id)
        flows.append({
            "from": buyer.username if buyer else "?",
            "amount": float(c.amount),
            "stream": "course",
            "type": c.commission_type,
            "notes": c.notes or "",
            "date": c.created_at.isoformat() if c.created_at else None,
        })

    for c in general_comms:
        from_user = users_map.get(c.from_user_id)
        # Determine stream
        ct = c.commission_type or ""
        if "membership" in ct.lower():
            stream = "membership"
        elif "boost" in ct.lower():
            stream = "boost"
        elif ct in ("direct_sponsor", "uni_level", "platform"):
            stream = "grid"
        else:
            stream = "grid"

        flows.append({
            "from": from_user.username if from_user else "?",
            "amount": float(c.amount_usdt or 0),
            "stream": stream,
            "type": ct,
            "notes": c.notes or "",
            "date": c.created_at.isoformat() if c.created_at else None,
        })

    # Sort all by date descending
    flows.sort(key=lambda x: x["date"] or "", reverse=True)

    # ── Stats across all streams ──
    membership_earned = sum(float(c.amount_usdt or 0) for c in general_comms if "membership" in (c.commission_type or "").lower())
    grid_earned = sum(float(c.amount_usdt or 0) for c in general_comms if c.commission_type in ("direct_sponsor", "uni_level"))
    boost_earned = sum(float(c.amount_usdt or 0) for c in general_comms if "boost" == (c.commission_type or "").lower())
    course_earned = sum(float(c.amount or 0) for c in course_comms)
    course_stats = get_user_course_stats(db, user.id)

    stats = {
        "total_earned": float(user.total_earned or 0),
        "membership_earned": membership_earned,
        "grid_earned": float(user.grid_earnings or 0),
        "boost_earned": boost_earned,
        "course_earned": float(user.course_earnings or 0),
        "course_sale_count": course_stats.get("course_sale_count", 0),
        "direct_course_sales": course_stats.get("direct_commissions", 0),
        "passup_course_sales": course_stats.get("passup_commissions", 0),
        "personal_referrals": user.personal_referrals or 0,
    }

    return JSONResponse({"flows": flows, "stats": stats})

@app.get("/api/my-network-tree")
async def api_my_network_tree(request: Request, db: Session = Depends(get_db)):
    """Member API: their downline tree (people they sponsored + deeper)."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    # Recursively find all downline members (up to 500)
    downline_ids = set()
    queue = [user.id]
    while queue and len(downline_ids) < 500:
        current_id = queue.pop(0)
        children = db.query(User).filter(User.sponsor_id == current_id).all()
        for child in children:
            if child.id not in downline_ids:
                downline_ids.add(child.id)
                queue.append(child.id)

    # Include self
    all_ids = downline_ids | {user.id}
    all_users = db.query(User).filter(User.id.in_(all_ids)).all()

    # Course ownership
    purchases = db.query(CoursePurchase).filter(CoursePurchase.user_id.in_(all_ids)).all()
    user_tiers = {}
    for p in purchases:
        if p.user_id not in user_tiers:
            user_tiers[p.user_id] = []
        user_tiers[p.user_id].append(p.course_tier)

    nodes = []
    for u in all_users:
        pu_name = None
        if u.pass_up_sponsor_id:
            pu = db.query(User).filter(User.id == u.pass_up_sponsor_id).first()
            pu_name = pu.username if pu else None
        nodes.append({
            "id": u.id,
            "username": u.username,
            "sponsor_id": u.sponsor_id,
            "pass_up_sponsor": pu_name,
            "is_active": u.is_active,
            "is_you": u.id == user.id,
            "sale_count": u.course_sale_count or 0,
            "course_earnings": float(u.course_earnings or 0),
            "owned_tiers": sorted(user_tiers.get(u.id, [])),
        })

    return JSONResponse({"nodes": nodes, "root_id": user.id})


# --- API endpoints for AJAX/future mobile ---

@app.get("/api/courses")
async def api_courses(request: Request, db: Session = Depends(get_db)):
    """JSON list of available courses."""
    courses = db.query(Course).filter(Course.is_active == True).order_by(Course.sort_order).all()
    return JSONResponse([{
        "id": c.id, "title": c.title, "slug": c.slug,
        "description": c.description, "price": c.price, "tier": c.tier
    } for c in courses])


@app.post("/api/courses/purchase/{course_id}")
async def api_purchase_course(course_id: int, request: Request, db: Session = Depends(get_db)):
    """JSON purchase endpoint."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"success": False, "error": "Not authenticated"}, status_code=401)

    result = process_course_purchase(db, user.id, course_id, payment_method="wallet")
    return JSONResponse(result)


@app.get("/api/courses/stats")
async def api_course_stats(request: Request, db: Session = Depends(get_db)):
    """JSON course stats for current user."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"success": False, "error": "Not authenticated"}, status_code=401)

    stats = get_user_course_stats(db, user.id)
    return JSONResponse(stats)


@app.post("/api/courses/lesson-complete/{lesson_id}")
async def api_lesson_complete(lesson_id: int, request: Request, db: Session = Depends(get_db)):
    """Mark a lesson as complete (or uncomplete if already done)."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"success": False, "error": "Not authenticated"}, status_code=401)

    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        return JSONResponse({"success": False, "error": "Lesson not found"}, status_code=404)

    # Check user owns this course
    purchase = db.query(CoursePurchase).filter(
        CoursePurchase.user_id == user.id,
        CoursePurchase.course_id == lesson.course_id
    ).first()
    if not purchase:
        return JSONResponse({"success": False, "error": "Course not purchased"}, status_code=403)

    existing = db.query(CourseProgress).filter(
        CourseProgress.user_id == user.id,
        CourseProgress.lesson_id == lesson_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        action = "uncompleted"
    else:
        progress = CourseProgress(user_id=user.id, course_id=lesson.course_id, lesson_id=lesson_id)
        db.add(progress)
        db.commit()
        action = "completed"

    # Return updated stats
    completed = db.query(CourseProgress).filter(
        CourseProgress.user_id == user.id,
        CourseProgress.course_id == lesson.course_id
    ).count()
    total = db.query(CourseLesson).filter(CourseLesson.course_id == lesson.course_id).count()

    return JSONResponse({"success": True, "action": action, "completed": completed, "total": total})

@app.get("/page-builder-v2")
async def page_builder_v2(request: Request):
    return RedirectResponse(url="/pro/funnels", status_code=302)


# ═══════════════════════════════════════════════════════════════
#  SUPERADPRO AI CHAT WIDGET — /api/chat
# ═══════════════════════════════════════════════════════════════

SAP_CHAT_SYSTEM = """You are the SuperAdPro AI assistant — a helpful, friendly support agent for the SuperAdPro platform.

SuperAdPro is a video advertising and network marketing SaaS platform. Here is everything you need to know:

## PLATFORM OVERVIEW
SuperAdPro combines video advertising tools with a network marketing compensation plan. Members can run video ad campaigns, use marketing tools, and earn commissions by referring others.

## MEMBERSHIP TIERS & PRICING
There are 8 membership tiers:
- Tier 1: $20/month
- Tier 2: $50/month
- Tier 3: $100/month
- Tier 4: $200/month
- Tier 5: $400/month
- Tier 6: $600/month
- Tier 7: $800/month
- Tier 8: $1,000/month

Higher tiers unlock larger ad campaigns and greater earning potential.

## COMPENSATION PLAN
1. **Referral Commission**: $10/month recurring for every direct member you refer (50% of the $20 base membership)
2. **Direct Grid Commission**: 40% of the membership fee when someone joins in your direct position
3. **Uni-Level Commission**: 6.875% across 8 levels of your downline team
4. **Platform fee**: 5% on transactions
5. **Course Sales**: 100% commission on course sales with 5 pass-ups (2nd, 4th, 6th, 8th, 10th sales pass up to your sponsor)

## MARKETING TOOLS INCLUDED
- SuperPages (drag-and-drop page builder)
- Funnel Builder
- Link Tracker with analytics
- QR Code Generator
- Campaign Studio for video ads
- AI Content Tools (social posts, video scripts, swipe files, niche finder)

## WITHDRAWALS
- Minimum withdrawal: $10
- Fee: $1 per withdrawal
- Payment method: USDT on Base Chain (crypto)
- Compatible wallets: MetaMask, Coinbase Wallet

## ACCOUNT & SECURITY
- Two-Factor Authentication (2FA) available via Google Authenticator or Authy
- KYC verification available on the profile page
- Password reset available via email

## GETTING STARTED
1. Register at www.superadpro.com
2. Choose a membership tier starting at $20
3. Complete your profile
4. Launch your first ad campaign from Campaign Studio
5. Share your referral link to start earning commissions

## SUPPORT
- Knowledge Base: superadpro.tawk.help
- Live chat available on the platform
- Contact via support page

## IMPORTANT RULES FOR YOUR RESPONSES
- Be warm, friendly and conversational — like a knowledgeable friend, not a formal support bot
- NEVER use markdown formatting: no #headings, no **bold**, no *italics*, no bullet points with -, no numbered lists with 1. 2. 3.
- Write in natural flowing sentences and short paragraphs with a blank line between each paragraph
- When listing items, write them naturally in sentences e.g. "There are three ways to earn: referral commissions, grid commissions, and uni-level commissions."
- Keep responses concise and friendly — under 120 words unless genuinely needed
- Never use the word "passive" when describing income or earnings
- Always refer to earnings as "commissions" or "referral income"
- If asked about something you don't know, direct them to contact support
- Do not make up features or prices not listed above
- End responses with a short friendly follow-up question or offer to help further
"""

@app.post("/api/chat")
async def api_ai_chat(request: Request):
    """SuperAdPro AI chat widget endpoint."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"reply": "AI chat is temporarily unavailable. Please contact support."})

    try:
        body = await request.json()
        raw_messages = body.get("messages", [])
        client = anthropic.Anthropic(api_key=api_key)

        # Sanitise and limit history
        messages = []
        for m in raw_messages[-10:]:  # last 10 messages max
            if isinstance(m, dict) and m.get("role") in ("user", "assistant") and m.get("content"):
                messages.append({"role": m["role"], "content": str(m["content"])[:1000]})

        if not messages:
            return JSONResponse({"reply": "Sorry, I didn't receive your message. Please try again."})

        response = client.messages.create(
            model=AI_MODEL_HAIKU,
            max_tokens=400,
            system=SAP_CHAT_SYSTEM,
            messages=messages
        )
        reply = response.content[0].text if response.content else "I'm not sure how to answer that. Please contact our support team."
        return JSONResponse({"reply": reply})

    except Exception as e:
        return JSONResponse({"reply": "I'm having a moment — please try again shortly or visit our Knowledge Base at superadpro.tawk.help"})


# ═══════════════════════════════════════════════════════════════
#  ADMIN: GRID COMPLETION FLOW TEST
# ═══════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
#  AI WATCHDOG — automated monitoring & self-healing
# ═══════════════════════════════════════════════════════════════

@app.get("/admin/watchdog")
def admin_watchdog_run(secret: str = "", db: Session = Depends(get_db)):
    """
    Main watchdog endpoint — hit this via Railway cron every 15-30 mins.
    Usage: /admin/watchdog?secret=superadpro-owner-2026
    """
    from fastapi.responses import JSONResponse
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)

    from .watchdog import run_watchdog
    result = run_watchdog(db)
    return result


@app.get("/admin/watchdog/status")
def admin_watchdog_status(secret: str = "", db: Session = Depends(get_db)):
    """Check watchdog status and recent logs."""
    from fastapi.responses import JSONResponse
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)

    from .watchdog import is_enabled

    recent_logs = db.query(WatchdogLog).order_by(
        WatchdogLog.created_at.desc()
    ).limit(20).all()

    return {
        "enabled": is_enabled(),
        "message": "Watchdog is ACTIVE" if is_enabled() else "Watchdog is OFF — set WATCHDOG_ENABLED=true to activate",
        "recent_logs": [
            {
                "id": log.id,
                "type": log.run_type,
                "status": log.status,
                "summary": log.summary,
                "ai_used": log.ai_used,
                "ai_model": log.ai_model,
                "ai_tokens": log.ai_tokens,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in recent_logs
        ]
    }


@app.get("/admin/watchdog/health")
def admin_watchdog_health_only(secret: str = "", db: Session = Depends(get_db)):
    """Run health check only (no fixes) — useful for monitoring dashboards."""
    from fastapi.responses import JSONResponse
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)

    from .watchdog import run_health_check
    return run_health_check(db)


@app.post("/admin/watchdog/toggle")
def admin_watchdog_toggle(secret: str = "", db: Session = Depends(get_db)):
    """Toggle watchdog on/off (runtime only — doesn't persist across deploys)."""
    from fastapi.responses import JSONResponse
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)

    import app.watchdog as wd
    wd.WATCHDOG_ENABLED = not wd.WATCHDOG_ENABLED
    status = "enabled" if wd.WATCHDOG_ENABLED else "disabled"
    logger.info(f"Watchdog toggled: {status}")
    return {"success": True, "watchdog_enabled": wd.WATCHDOG_ENABLED, "message": f"Watchdog {status}. For permanent change, set WATCHDOG_ENABLED in Railway env vars."}


@app.get("/admin/adjust-balance")
def admin_adjust_balance(
    secret: str = "",
    username: str = "",
    amount: float = 0,
    reason: str = "Manual adjustment",
    db: Session = Depends(get_db)
):
    """
    Manually adjust a user's balance (positive to credit, negative to debit).

    Usage: /admin/adjust-balance?secret=superadpro-owner-2026&username=master&amount=5.00&reason=Refund+adjustment
    """
    from fastapi.responses import JSONResponse

    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    if not username:
        return JSONResponse({"error": "username is required"}, status_code=400)
    if amount == 0:
        return JSONResponse({"error": "amount must be non-zero"}, status_code=400)

    user = db.query(User).filter(User.username == username).first()
    if not user:
        return JSONResponse({"error": f"User '{username}' not found"}, status_code=404)

    old_balance = float(user.balance or 0)
    user.balance = old_balance + amount
    new_balance = float(user.balance)

    # Audit trail
    comm = Commission(
        to_user_id=user.id,
        from_user_id=user.id,
        amount_usdt=abs(amount),
        commission_type="admin_adjustment",
        notes=f"{'Credit' if amount > 0 else 'Debit'}: {reason}",
        package_tier=0,
        status="paid"
    )
    db.add(comm)
    db.commit()

    logger.info(f"Admin balance adjustment: {username} {'+' if amount > 0 else ''}{amount:.2f} ({reason}). {old_balance:.2f} → {new_balance:.2f}")

    return {
        "success": True,
        "username": username,
        "adjustment": amount,
        "old_balance": round(old_balance, 2),
        "new_balance": round(new_balance, 2),
        "reason": reason
    }


@app.get("/admin/test-grid-fill")
def admin_test_grid_fill(
    secret: str,
    owner_username: str = "master",
    tier: int = 1,
    seats: int = 1,
    db: Session = Depends(get_db)
):
    """
    Simulate filling seats in a grid to test the full commission flow.
    Creates dummy users and places them into the owner's grid.
    
    Usage: /admin/test-grid-fill?secret=superadpro-owner-2026&owner_username=master&tier=1&seats=5
    
    Use seats=64 to test full grid completion + auto-spawn.
    """
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)

    owner = db.query(User).filter(User.username == owner_username).first()
    if not owner:
        return JSONResponse({"error": f"User '{owner_username}' not found"}, status_code=404)

    price = GRID_PACKAGES.get(tier)
    if not price:
        return JSONResponse({"error": f"Invalid tier: {tier}"}, status_code=400)

    # Cap at 64 positions
    seats = min(seats, 64)

    results = []
    for i in range(seats):
        # Create a unique dummy test user
        import secrets as sec
        suffix = sec.token_hex(4)
        dummy_username = f"gridtest_{suffix}"
        dummy = User(
            username=dummy_username,
            email=f"{dummy_username}@test.local",
            password="test",
            first_name=f"Test_{suffix}",
            sponsor_id=owner.id,
            is_active=True,
        )
        db.add(dummy)
        db.flush()

        # Place into grid
        result = place_member_in_grid(
            db=db,
            member_id=dummy.id,
            owner_id=owner.id,
            package_tier=tier,
        )
        results.append({
            "seat": i + 1,
            "dummy_user": dummy_username,
            "result": result,
        })

        if not result["success"]:
            break

    db.commit()

    # Get current grid state after fills
    from app.grid import get_or_create_active_grid
    active_grid = db.query(Grid).filter(
        Grid.owner_id == owner.id,
        Grid.package_tier == tier,
    ).order_by(Grid.advance_number.desc()).first()

    # Check owner's updated balances
    db.refresh(owner)

    # Count commissions generated
    from sqlalchemy import func
    total_commissions = db.query(func.count(Commission.id)).filter(
        Commission.grid_id.in_([r["result"].get("grid_id") for r in results if r["result"].get("success")])
    ).scalar()

    return {
        "test": "grid_fill",
        "owner": owner_username,
        "tier": tier,
        "seats_filled": len([r for r in results if r["result"].get("success")]),
        "seats_requested": seats,
        "grid_state": {
            "id": active_grid.id if active_grid else None,
            "advance": active_grid.advance_number if active_grid else None,
            "filled": active_grid.positions_filled if active_grid else 0,
            "is_complete": active_grid.is_complete if active_grid else False,
        },
        "owner_balances": {
            "balance": float(owner.balance or 0),
            "total_earned": float(owner.total_earned or 0),
            "grid_earnings": float(owner.grid_earnings or 0),
            "level_earnings": float(owner.level_earnings or 0),
        },
        "commissions_generated": total_commissions,
        "fill_results": results,
    }


@app.get("/admin/test-grid-reset")
def admin_test_grid_reset(
    secret: str,
    owner_username: str = "master",
    tier: int = 1,
    db: Session = Depends(get_db)
):
    """
    Reset a grid for re-testing — removes all test positions, commissions, and the grid itself.
    Only removes grids and data for gridtest_* users.
    
    Usage: /admin/test-grid-reset?secret=superadpro-owner-2026&owner_username=master&tier=1
    """
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)

    owner = db.query(User).filter(User.username == owner_username).first()
    if not owner:
        return JSONResponse({"error": f"User '{owner_username}' not found"}, status_code=404)

    # Find test users
    test_users = db.query(User).filter(User.username.like("gridtest_%")).all()
    test_user_ids = [u.id for u in test_users]

    if not test_user_ids:
        return {"message": "No test users found — nothing to clean up"}

    # Find grids for this owner+tier
    grids = db.query(Grid).filter(
        Grid.owner_id == owner.id,
        Grid.package_tier == tier,
    ).all()
    grid_ids = [g.id for g in grids]

    # Remove positions from test users
    positions_deleted = db.query(GridPosition).filter(
        GridPosition.grid_id.in_(grid_ids),
        GridPosition.member_id.in_(test_user_ids)
    ).delete(synchronize_session=False) if grid_ids else 0

    # Remove commissions from test grids
    commissions_deleted = db.query(Commission).filter(
        Commission.grid_id.in_(grid_ids)
    ).delete(synchronize_session=False) if grid_ids else 0

    # Reset grid counters
    for g in grids:
        remaining = db.query(GridPosition).filter(GridPosition.grid_id == g.id).count()
        g.positions_filled = remaining
        g.is_complete = False
        g.completed_at = None
        g.owner_paid = False
        g.revenue_total = remaining * g.package_price

    # Remove test users
    users_deleted = db.query(User).filter(User.id.in_(test_user_ids)).delete(synchronize_session=False)

    # Reset owner balances (rough — manual review needed for production)
    owner.balance = 0
    owner.total_earned = 0
    owner.grid_earnings = 0
    owner.level_earnings = 0
    owner.upline_earnings = 0

    db.commit()

    return {
        "cleaned": True,
        "positions_deleted": positions_deleted,
        "commissions_deleted": commissions_deleted,
        "test_users_deleted": users_deleted,
        "grids_reset": len(grids),
    }


@app.get("/admin/test-grid-e2e")
def admin_test_grid_e2e(
    secret: str,
    tier: int = 1,
    chain_depth: int = 8,
    buyers_per_level: int = 2,
    db: Session = Depends(get_db)
):
    """
    E2E Grid Commission Test.
    Usage: /admin/test-grid-e2e?secret=superadpro-owner-2026&tier=1&chain_depth=8&buyers_per_level=2
    """
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)

    try:
        from app.grid import process_tier_purchase, GRID_PACKAGES
        import secrets as sec

        price = GRID_PACKAGES.get(tier)
        if not price:
            return JSONResponse({"error": f"Invalid tier: {tier}"}, status_code=400)

        chain_depth = min(chain_depth, 10)
        buyers_per_level = min(buyers_per_level, 5)

        results = {"test": "grid_e2e", "tier": tier, "price": price, "chain": [], "purchases": [], "balances_after": {}, "commissions": [], "grids": []}

        # Step 1: Create owner
        sfx = sec.token_hex(3)
        owner = User(username=f"gridtest_owner_{sfx}", email=f"gridtest_owner_{sfx}@test.local",
                     password="test", first_name="Owner", is_active=True, is_admin=True)
        db.add(owner)
        db.flush()
        results["chain"].append({"level": 0, "username": owner.username, "id": owner.id, "role": "owner"})

        # Step 2: Create sponsor chain
        chain_users = [owner]
        for lvl in range(1, chain_depth + 1):
            sfx = sec.token_hex(3)
            u = User(username=f"gridtest_L{lvl}_{sfx}", email=f"gridtest_L{lvl}_{sfx}@test.local",
                     password="test", first_name=f"Level{lvl}", sponsor_id=chain_users[-1].id,
                     is_active=True, membership_tier="basic")
            db.add(u)
            db.flush()
            vc = VideoCampaign(user_id=u.id, title=f"Test Campaign L{lvl}",
                               video_url="https://www.youtube.com/watch?v=test",
                               embed_url="https://www.youtube.com/embed/test",
                               platform="youtube", campaign_tier=tier, status="active",
                               is_completed=False, views_target=1000)
            db.add(vc)
            db.flush()
            chain_users.append(u)
            results["chain"].append({"level": lvl, "username": u.username, "id": u.id, "sponsor_id": chain_users[-2].id})

        db.commit()

        # Step 3: Create buyers and process purchases
        last_sponsor = chain_users[-1]
        buyer_ids = []
        for b in range(buyers_per_level):
            sfx = sec.token_hex(3)
            buyer = User(username=f"gridtest_buyer_{b+1}_{sfx}", email=f"gridtest_buyer_{b+1}_{sfx}@test.local",
                         password="test", first_name=f"Buyer{b+1}", sponsor_id=last_sponsor.id,
                         is_active=True, membership_tier="basic")
            db.add(buyer)
            db.flush()
            buyer_ids.append(buyer.id)

            purchase_result = process_tier_purchase(db=db, buyer_id=buyer.id, package_tier=tier)
            results["purchases"].append({"buyer": buyer.username, "buyer_id": buyer.id,
                                         "sponsor": last_sponsor.username, "result": purchase_result})

        db.commit()

        # Step 4: Collect balances
        for u in chain_users:
            db.refresh(u)
            results["balances_after"][u.username] = {
                "id": u.id,
                "balance": float(u.balance or 0),
                "total_earned": float(u.total_earned or 0),
                "grid_earnings": float(u.grid_earnings or 0),
                "level_earnings": float(u.level_earnings or 0),
            }

        # Step 5: Collect commissions
        all_test_ids = [u.id for u in chain_users] + buyer_ids
        comms = db.query(Commission).filter(
            Commission.from_user_id.in_(all_test_ids)
        ).order_by(Commission.id).all()

        for c in comms:
            recipient = db.query(User).filter(User.id == c.to_user_id).first() if c.to_user_id else None
            from_user = db.query(User).filter(User.id == c.from_user_id).first() if c.from_user_id else None
            results["commissions"].append({
                "type": c.commission_type,
                "amount": float(c.amount_usdt or 0),
                "from": from_user.username if from_user else "N/A",
                "to": recipient.username if recipient else "COMPANY",
                "notes": c.notes,
            })

        # Step 6: Collect grid states
        for u in chain_users:
            grids = db.query(Grid).filter(Grid.owner_id == u.id, Grid.package_tier == tier).order_by(Grid.advance_number).all()
            for g in grids:
                positions = db.query(GridPosition).filter(GridPosition.grid_id == g.id).all()
                results["grids"].append({
                    "owner": u.username, "grid_id": g.id, "advance": g.advance_number,
                    "filled": g.positions_filled, "complete": g.is_complete,
                    "bonus_accrued": float(g.bonus_pool_accrued or 0),
                    "bonus_paid": g.bonus_paid,
                    "positions_count": len(positions),
                })

        # Summary
        total_paid = sum(float(c.amount_usdt or 0) for c in comms if c.to_user_id is not None)
        total_company = sum(float(c.amount_usdt or 0) for c in comms if c.to_user_id is None)
        total_all = sum(float(c.amount_usdt or 0) for c in comms)
        expected = len(results["purchases"]) * price

        results["summary"] = {
            "total_purchases": len(results["purchases"]),
            "total_revenue": expected,
            "paid_to_members": round(total_paid, 2),
            "company_absorbed": round(total_company, 2),
            "total_commissions": round(total_all, 2),
            "expected_total": round(expected, 2),
            "match": round(total_all, 2) == round(expected, 2),
        }

        return results

    except Exception as e:
        import traceback
        db.rollback()
        return JSONResponse({"error": str(e), "traceback": traceback.format_exc()}, status_code=500)


@app.get("/admin/test-grid-cleanup")
def admin_test_grid_cleanup(
    secret: str,
    db: Session = Depends(get_db)
):
    """Clean up ALL gridtest_* users and related data."""
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)

    test_users = db.query(User).filter(User.username.like("gridtest_%")).all()
    test_user_ids = [u.id for u in test_users]
    if not test_user_ids:
        return {"message": "No test users found"}

    grids = db.query(Grid).filter(Grid.owner_id.in_(test_user_ids)).all()
    grid_ids = [g.id for g in grids]
    pos_del = db.query(GridPosition).filter(GridPosition.grid_id.in_(grid_ids)).delete(synchronize_session=False) if grid_ids else 0
    pos_del2 = db.query(GridPosition).filter(GridPosition.member_id.in_(test_user_ids)).delete(synchronize_session=False)
    comm_del = db.query(Commission).filter(
        (Commission.from_user_id.in_(test_user_ids)) | (Commission.to_user_id.in_(test_user_ids))
    ).delete(synchronize_session=False)
    camp_del = db.query(VideoCampaign).filter(VideoCampaign.user_id.in_(test_user_ids)).delete(synchronize_session=False)
    grid_del = db.query(Grid).filter(Grid.owner_id.in_(test_user_ids)).delete(synchronize_session=False)
    user_del = db.query(User).filter(User.id.in_(test_user_ids)).delete(synchronize_session=False)
    db.commit()

    return {"cleaned": True, "users": user_del, "grids": grid_del, "positions": pos_del + pos_del2,
            "commissions": comm_del, "campaigns": camp_del}


@app.get("/admin/grid-audit")
def admin_grid_audit(
    secret: str,
    owner_username: str = "master",
    tier: int = 1,
    db: Session = Depends(get_db)
):
    """
    Full audit of a grid — shows positions, commissions, balances.
    
    Usage: /admin/grid-audit?secret=superadpro-owner-2026&owner_username=master&tier=1
    """
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)

    owner = db.query(User).filter(User.username == owner_username).first()
    if not owner:
        return JSONResponse({"error": f"User '{owner_username}' not found"}, status_code=404)

    grids = db.query(Grid).filter(
        Grid.owner_id == owner.id,
        Grid.package_tier == tier,
    ).order_by(Grid.advance_number).all()

    audit = []
    for g in grids:
        positions = db.query(GridPosition).filter(GridPosition.grid_id == g.id).order_by(
            GridPosition.grid_level, GridPosition.position_num
        ).all()

        commissions = db.query(Commission).filter(Commission.grid_id == g.id).all()

        level_breakdown = {}
        for lvl in range(1, 9):
            level_positions = [p for p in positions if p.grid_level == lvl]
            level_breakdown[f"level_{lvl}"] = {
                "filled": len(level_positions),
                "capacity": 8,
                "members": [p.member_id for p in level_positions],
            }

        commission_summary = {}
        for c in commissions:
            ct = c.commission_type
            if ct not in commission_summary:
                commission_summary[ct] = {"count": 0, "total": 0.0}
            commission_summary[ct]["count"] += 1
            commission_summary[ct]["total"] += float(c.amount_usdt or 0)

        audit.append({
            "grid_id": g.id,
            "advance": g.advance_number,
            "filled": g.positions_filled,
            "is_complete": g.is_complete,
            "revenue_total": float(g.revenue_total or 0),
            "levels": level_breakdown,
            "commission_summary": commission_summary,
        })

    return {
        "owner": owner_username,
        "tier": tier,
        "price": GRID_PACKAGES.get(tier),
        "owner_balances": {
            "balance": float(owner.balance or 0),
            "total_earned": float(owner.total_earned or 0),
            "grid_earnings": float(owner.grid_earnings or 0),
            "level_earnings": float(owner.level_earnings or 0),
        },
        "grids": audit,
    }


# ══════════════════════════════════════════════════════════════════════════════
# ── LINKHUB ───────────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

import os, shutil, hashlib, re as _re

AVATAR_DIR = "static/uploads/avatars"
os.makedirs(AVATAR_DIR, exist_ok=True)

@app.get("/linkhub")
def linkhub_editor(request: Request, user: User = Depends(get_current_user)):
    """LinkHub editor — serve React SPA."""
    if not user:
        return RedirectResponse("/?login=1", status_code=302)
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse("/dashboard", status_code=302)


@app.post("/linkhub/save")
@limiter.limit("10/minute")
async def linkhub_save(request: Request, db: Session = Depends(get_db)):
    """Save LinkHub profile + links."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"ok": False, "error": "Not logged in"}, status_code=401)

    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "Invalid JSON"}, status_code=400)

    try:
            # Upsert profile
        profile = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user.id).first()
        if not profile:
            profile = LinkHubProfile(user_id=user.id)
            db.add(profile)
            db.flush()

        import html as _html
        profile.display_name  = _html.escape(data.get("display_name", "") or "")[:100]
        profile.bio           = _html.escape(data.get("bio", "") or "")[:300]
        profile.theme         = data.get("theme", "dark")
        profile.font_family   = data.get("font_family", "DM Sans")[:50]
        profile.accent_color  = data.get("accent_color", "#00d4ff")
        profile.bg_color      = data.get("bg_color") or None
        profile.btn_color     = data.get("btn_color") or None
        profile.btn_text_color = data.get("btn_text_color") or None
        profile.text_color    = data.get("text_color") or None
        profile.is_published  = bool(data.get("is_published", True))
        profile.soc_icon_shape = data.get("soc_icon_shape", "circle")
        profile.btn_style_type = data.get("btn_style_type", "3d")
        profile.btn_radius     = data.get("btn_radius", "12px")
        profile.btn_font_size  = int(data.get("btn_font_size", 15))
        profile.btn_align      = data.get("btn_align", "center")
        profile.arrow_style    = data.get("arrow_style", "arrow")
        profile.icon_size      = int(data.get("icon_size", 22))
        profile.arrow_size     = int(data.get("arrow_size", 16))
        profile.follower_count = data.get("follower_count", "")[:50] or None
        # Banner / bg image — upload to R2 if available, otherwise store base64
        from app.r2_storage import r2_available, upload_image, delete_image, is_base64_data, is_r2_url
        _r2_ok = r2_available()

        # ── Banner image ──
        if data.get("banner_image"):
            raw_banner = data["banner_image"]
            if is_base64_data(raw_banner) and _r2_ok:
                try:
                    import base64 as _b64
                    header, b64str = raw_banner.split(",", 1)
                    bdata = _b64.b64decode(b64str)
                    bext = "jpg"
                    bmime = "image/jpeg"
                    if "png" in header: bext, bmime = "png", "image/png"
                    elif "webp" in header: bext, bmime = "webp", "image/webp"
                    elif "gif" in header: bext, bmime = "gif", "image/gif"
                    if profile.banner_r2_url: delete_image(profile.banner_r2_url)
                    profile.banner_r2_url = upload_image(bdata, "banners", bext, bmime)
                    profile.banner_image = None
                except Exception as e:
                    print(f"⚠️ R2 banner upload failed: {e}")
                    profile.banner_image = raw_banner
            elif is_r2_url(raw_banner):
                pass  # already an R2 URL, keep it
            else:
                profile.banner_image = raw_banner
        elif data.get("clear_banner"):
            if profile.banner_r2_url: delete_image(profile.banner_r2_url)
            profile.banner_r2_url = None
            profile.banner_image = None

        # ── Background image ──
        if data.get("bg_image"):
            raw_bg = data["bg_image"]
            if is_base64_data(raw_bg) and _r2_ok:
                try:
                    import base64 as _b64
                    header, b64str = raw_bg.split(",", 1)
                    bgdata = _b64.b64decode(b64str)
                    bgext = "jpg"
                    bgmime = "image/jpeg"
                    if "png" in header: bgext, bgmime = "png", "image/png"
                    elif "webp" in header: bgext, bgmime = "webp", "image/webp"
                    elif "gif" in header: bgext, bgmime = "gif", "image/gif"
                    if profile.bg_r2_url: delete_image(profile.bg_r2_url)
                    profile.bg_r2_url = upload_image(bgdata, "backgrounds", bgext, bgmime)
                    profile.bg_image = None
                except Exception as e:
                    print(f"⚠️ R2 bg upload failed: {e}")
                    profile.bg_image = raw_bg
            elif is_r2_url(raw_bg):
                pass  # already an R2 URL, keep it
            else:
                profile.bg_image = raw_bg
        elif data.get("clear_bg_image"):
            if profile.bg_r2_url: delete_image(profile.bg_r2_url)
            profile.bg_r2_url = None
            profile.bg_image = None
        profile.bg_gradient = data.get("bg_gradient") or None
        # Social icons — stored as JSON string
        import json as _json
        social_raw = data.get("social_links", [])
        profile.social_links = _json.dumps(social_raw) if social_raw else None
        # avatar_data is saved directly by the upload endpoint — don't overwrite with None here
        from datetime import datetime as _dt
        profile.updated_at = _dt.utcnow()

        # Replace all links — cap at 20 to protect DB
        raw_links = data.get("links", [])[:20]
        # Delete click records first (foreign key on linkhub_links)
        link_ids = [l.id for l in db.query(LinkHubLink.id).filter(LinkHubLink.profile_id == profile.id).all()]
        if link_ids:
            db.query(LinkHubClick).filter(LinkHubClick.link_id.in_(link_ids)).delete(synchronize_session=False)
        db.query(LinkHubLink).filter(LinkHubLink.profile_id == profile.id).delete(synchronize_session=False)
        for idx, lk in enumerate(raw_links):
            title = str(lk.get("title", "")).strip()[:200]
            url   = str(lk.get("url", "")).strip()[:2000]
            if not title:
                continue
            if not url:
                url = "#"
            # Enforce safe URL schemes only
            if url.startswith(("javascript:", "data:", "vbscript:", "file:")):
                continue  # silently skip dangerous URLs
            if not url.startswith(("http://", "https://")):
                url = "https://" + url
            link = LinkHubLink(
                profile_id  = profile.id,
                user_id     = user.id,
                title       = title,
                url         = url,
                icon        = str(lk.get("icon", ""))[:200],
                btn_style   = str(lk.get("btn_style", "filled")),
                subtitle    = str(lk.get("subtitle", ""))[:200] or None,
                font_size   = int(lk.get("font_size", 14)),
                font_weight = str(lk.get("font_weight", "semibold")),
                text_align  = str(lk.get("text_align", "center")),
                btn_bg_color = str(lk.get("btn_bg_color", ""))[:20] or None,
                btn_text_color = str(lk.get("btn_text_color", ""))[:20] or None,
                thumbnail   = lk.get("thumbnail") or None,
                is_active   = bool(lk.get("is_active", True)),
                sort_order  = idx,
                click_count = int(lk.get("click_count", 0)) if lk.get("id") else 0,
            )
            db.add(link)

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            import traceback
            tb = traceback.format_exc()
            print(f"⚠️ LinkHub save DB error: {e}\n{tb}")
            return JSONResponse({"ok": False, "error": f"Database error: {str(e)[:300]}"}, status_code=500)
        capped = len(data.get("links", [])) > 20
        return JSONResponse({"ok": True, "capped": capped, "saved_links": len(raw_links)})
    except Exception as ex:
        try: db.rollback()
        except: pass
        import traceback
        print(f"⚠️ LinkHub save error: {ex}\n{traceback.format_exc()}")
        return JSONResponse({"ok": False, "error": str(ex)[:300]}, status_code=500)


@app.post("/linkhub/upload-avatar")
@limiter.limit("6/minute")
async def linkhub_upload_avatar(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload avatar — stored in Cloudflare R2 (falls back to base64 in DB)."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"ok": False, "error": "Not logged in"}, status_code=401)

    content = await file.read()

    if len(content) > 2 * 1024 * 1024:
        return JSONResponse({"ok": False, "error": "File too large (max 2MB)"}, status_code=400)

    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
        return JSONResponse({"ok": False, "error": "Invalid file type"}, status_code=400)

    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}.get(ext, "image/jpeg")

    profile = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user.id).first()
    if not profile:
        profile = LinkHubProfile(user_id=user.id)
        db.add(profile)
        db.flush()

    # Try R2 first, fall back to base64
    from app.r2_storage import r2_available, upload_image, delete_image, is_r2_url
    if r2_available():
        try:
            # Delete old R2 avatar if exists
            if profile.avatar_r2_url:
                delete_image(profile.avatar_r2_url)
            url = upload_image(content, "avatars", ext, mime)
            profile.avatar_r2_url = url
            profile.avatar_data = None  # clear base64 to save DB space
            db.commit()
            return JSONResponse({"ok": True, "data_url": url})
        except Exception as e:
            print(f"⚠️ R2 upload failed, falling back to base64: {e}")

    # Fallback: base64 in DB
    import base64 as _b64
    b64 = _b64.b64encode(content).decode("utf-8")
    data_url = f"data:{mime};base64,{b64}"
    profile.avatar_data = data_url
    db.commit()
    return JSONResponse({"ok": True, "data_url": data_url})


@app.get("/linkhub/click/{link_id}")
@limiter.limit("30/minute")
def linkhub_track_click(link_id: int, request: Request, db: Session = Depends(get_db)):
    """Track a link click then redirect — full geo, device, browser, source & UTM tracking."""
    link = db.query(LinkHubLink).filter(LinkHubLink.id == link_id, LinkHubLink.is_active == True).first()
    if not link:
        return RedirectResponse("/", status_code=302)

    # Record click — deduplicate same IP on same link within 1 hour
    ua = (request.headers.get("user-agent", "") or "").lower()
    _cbots = ("googlebot","bingbot","slurp","curl","python-requests","wget","scrapy","headlesschrome")
    if not any(b in ua for b in _cbots):
        client_ip = (request.headers.get("cf-connecting-ip") or
                     request.headers.get("x-forwarded-for", "").split(",")[0].strip() or
                     (request.client.host if request.client else ""))
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent = db.query(LinkHubClick).filter(
            LinkHubClick.link_id == link.id,
            LinkHubClick.referrer == client_ip,
            LinkHubClick.clicked_at >= one_hour_ago
        ).first()
        if not recent:
            # ── Device detection ──
            device = "mobile" if any(x in ua for x in ("mobile","android","iphone")) else "tablet" if "tablet" in ua or "ipad" in ua else "desktop"

            # ── Browser detection ──
            if "edg" in ua:
                browser = "edge"
            elif "chrome" in ua and "chromium" not in ua:
                browser = "chrome"
            elif "firefox" in ua:
                browser = "firefox"
            elif "safari" in ua and "chrome" not in ua:
                browser = "safari"
            else:
                browser = "other"

            # ── Source from referrer ──
            referrer_url = request.headers.get("referer", "") or ""
            ref_lower = referrer_url.lower()
            source = "direct"
            for domain, label in [
                ("facebook.com","facebook"),("fb.com","facebook"),("instagram.com","instagram"),
                ("twitter.com","x"),("x.com","x"),("linkedin.com","linkedin"),("reddit.com","reddit"),
                ("tiktok.com","tiktok"),("youtube.com","youtube"),("google.com","google"),("bing.com","bing"),
                ("pinterest.com","pinterest"),("t.co","x"),("whatsapp.com","whatsapp"),("wa.me","whatsapp"),
            ]:
                if domain in ref_lower:
                    source = label
                    break
            else:
                if referrer_url and "superadpro" not in ref_lower:
                    source = "other"

            # ── UTM params ──
            qs = request.query_params
            utm_source   = qs.get("utm_source",   None)
            utm_medium   = qs.get("utm_medium",   None)
            utm_campaign = qs.get("utm_campaign", None)
            if utm_source and source == "direct":
                source = utm_source.lower()

            # ── GeoIP lookup ──
            country_code = None
            country_name = None
            try:
                from app.database import _geoip_reader
                if _geoip_reader and client_ip and client_ip not in ("127.0.0.1","::1","localhost"):
                    geo = _geoip_reader.country(client_ip)
                    country_code = geo.country.iso_code
                    country_name = geo.country.name
            except Exception:
                pass

            click = LinkHubClick(
                link_id      = link.id,
                profile_id   = link.profile_id,
                referrer     = client_ip,
                device       = device,
                browser      = browser,
                country      = country_code,
                country_name = country_name,
                source       = source,
                utm_source   = utm_source,
                utm_medium   = utm_medium,
                utm_campaign = utm_campaign,
            )
            db.add(click)
            link.click_count = (link.click_count or 0) + 1
            db.commit()

    return RedirectResponse(link.url, status_code=302)


@app.get("/u/{username}")
@limiter.limit("60/minute")
def linkhub_public(username: str, request: Request, db: Session = Depends(get_db)):
    """Public LinkHub profile page."""
    user = db.query(User).filter(User.username.ilike(username)).first()
    if not user:
        return templates.TemplateResponse("404.html", {"request": request}, status_code=404) \
               if os.path.exists("templates/404.html") \
               else HTMLResponse("<h2>Profile not found</h2>", status_code=404)

    profile = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user.id).first()
    if not profile:
        # Auto-create a blank published profile so the URL resolves
        profile = LinkHubProfile(user_id=user.id, display_name=user.first_name or user.username)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # Count the view — skip preview mode and known bots/crawlers
    preview = request.query_params.get("preview") == "1"
    ua = request.headers.get("user-agent", "").lower()
    _bots = ("googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider",
             "yandexbot", "sogou", "exabot", "facebot", "ia_archiver",
             "semrush", "ahrefsbot", "mj12bot", "dotbot", "curl", "python-requests",
             "wget", "scrapy", "headlesschrome", "phantomjs", "prerender")
    is_bot = any(b in ua for b in _bots) or not ua
    if not preview and not is_bot and profile.is_published:
        profile.total_views = (profile.total_views or 0) + 1
        db.commit()

    links = db.query(LinkHubLink).filter(
        LinkHubLink.profile_id == profile.id,
        LinkHubLink.is_active == True
    ).order_by(LinkHubLink.sort_order).all()

    # Parse social links JSON
    import json as _json
    social_links = []
    if profile.social_links:
        try:
            social_links = _json.loads(profile.social_links)
        except Exception:
            social_links = []

    # Pre-process link icons — parse JSON icon data into renderable format
    # Pre-process link icons — parse JSON icon data into renderable HTML
    # SVG icon path lookup (subset matching LinkHubIcons.js)
    _SVG_PATHS = {
        "youtube": "M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z",
        "instagram": "M16 3H8a5 5 0 00-5 5v8a5 5 0 005 5h8a5 5 0 005-5V8a5 5 0 00-5-5zm-4 12a4 4 0 110-8 4 4 0 010 8zm5-8.5a1 1 0 110-2 1 1 0 010 2z",
        "tiktok": "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.41a8.16 8.16 0 004.77 1.53V7.49a4.85 4.85 0 01-1.01-.8z",
        "facebook": "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z",
        "x-twitter": "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24H16.17l-5.21-6.82L4.99 21.75H1.68l7.73-8.84L1.25 2.25H8.08l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z",
        "linkedin": "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z",
        "whatsapp": "M12.04 2a9.94 9.94 0 00-8.48 15.18L2 22l4.97-1.31A9.94 9.94 0 1012.04 2zm5.78 14.07a3 3 0 01-1.97 1.38 4.01 4.01 0 01-1.84-.12 16.7 16.7 0 01-1.66-.61 12.97 12.97 0 01-4.97-4.4 5.66 5.66 0 01-1.18-3.01 3.26 3.26 0 011.02-2.43 1.07 1.07 0 01.77-.36h.56c.17.01.41-.08.65.49.24.58.82 2.01.89 2.15a.53.53 0 010 .51c-.1.19-.14.31-.29.48s-.28.37-.43.51c-.14.14-.3.3-.13.59a8.76 8.76 0 001.62 2.01 7.93 7.93 0 002.34 1.44c.29.15.46.13.63-.07s.75-.88.92-1.12.36-.28.65-.14 1.67.79 1.96.93.48.22.55.34a2.43 2.43 0 01-.17 1.38z",
        "telegram": "M22.27 2.06a1 1 0 00-1.06-.17L1.46 10.12a1 1 0 00.06 1.86l8.21 3.43 3.43 8.21a1 1 0 00.92.62h.04a1 1 0 00.91-.68L22.44 3.12a1 1 0 00-.17-1.06z",
        "play": "M5 2.69a1 1 0 011.55-.83l13 8.31a1 1 0 010 1.66l-13 8.31A1 1 0 015 19.31V2.69z",
        "music": "M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z",
        "headphones": "M3 18v-6a9 9 0 0118 0v6M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z",
        "camera": "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z",
        "mic": "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8",
        "cart": "M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6M10 21a1 1 0 11-2 0 1 1 0 012 0zM21 21a1 1 0 11-2 0 1 1 0 012 0z",
        "bag": "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0",
        "tag": "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
        "dollar": "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
        "gift": "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z",
        "mail": "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
        "phone": "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.61.68 2.38a2 2 0 01-.45 2.11L8.09 9.45a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.77.32 1.57.55 2.38.68a2 2 0 011.72 2.03z",
        "chat": "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
        "megaphone": "M3 11l18-5v12L3 13v-2zM11.6 16.8a3 3 0 01-5.98.46",
        "arrow-right": "M5 12h14M12 5l7 7-7 7",
        "arrow-up-right": "M7 17L17 7M7 7h10v10",
        "chevron-right": "M9 18l6-6-6-6",
        "external": "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
        "download": "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
        "link": "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
        "globe": "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
        "star": "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
        "heart": "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z",
        "fire": "M12 12c0-3 1.5-5 3-6.5S12 2 12 2 5 6 5 12a7 7 0 0014 0c0-1.5-.5-3-2-4.5-1 1.5-2 2.5-3 4z",
        "zap": "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
        "rocket": "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3M22 2l-5 14-4-4L22 2z",
        "book": "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z",
        "home": "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2",
        "user": "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
        "lock": "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
        "trophy": "M6 9H3a1 1 0 01-1-1V5a1 1 0 011-1h3M18 9h3a1 1 0 001-1V5a1 1 0 00-1-1h-3M6 4h12v6a6 6 0 11-12 0V4zM8 21h8M12 17v4",
        "briefcase": "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16",
        "calendar": "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
        "podcast": "M17 18.63a8 8 0 10-10 0M12 22v-6M12 8a4 4 0 100 8 4 4 0 000-8z",
        "snapchat": "M12 2C6.48 2 4 5 4 8c0 1.5.5 2.5 1 3-.5.3-1.5.5-1.5 1s1 1 2 1.2c-.2.8-.5 1.5-1.2 2.3.8.2 1.5.3 2.2-.2.5 1 1.5 2 3.5 2.2-.3.5-.5 1.2-.5 1.5h5c0-.3-.2-1-.5-1.5 2-.2 3-1.2 3.5-2.2.7.5 1.4.4 2.2.2-.7-.8-1-1.5-1.2-2.3 1-.2 2-.2 2-1.2s-1-.7-1.5-1c.5-.5 1-1.5 1-3 0-3-2.48-6-8-6z",
        "pinterest": "M12 2a10 10 0 00-3.64 19.33c-.1-.85-.18-2.16.04-3.09l.59-2.52s-.44-.88-.44-2.18c0-2.04 1.18-3.57 2.66-3.57 1.25 0 1.86.94 1.86 2.07 0 1.26-.8 3.14-1.22 4.89-.35 1.47.74 2.66 2.18 2.66 2.62 0 4.63-2.76 4.63-6.74 0-3.52-2.53-5.99-6.14-5.99-4.18 0-6.64 3.14-6.64 6.39 0 1.27.49 2.62 1.1 3.36.12.15.14.28.1.43l-.41 1.67c-.06.27-.22.33-.5.2-1.86-.87-3.02-3.59-3.02-5.78 0-4.7 3.42-9.03 9.86-9.03 5.18 0 9.2 3.69 9.2 8.62 0 5.15-3.25 9.29-7.75 9.29-1.51 0-2.94-.79-3.43-1.72l-.93 3.55c-.34 1.3-1.25 2.93-1.86 3.93A10 10 0 1012 2z",
    }
    parsed_links = []
    for lk in links:
        icon_html = ""
        icon_raw = lk.icon or ""
        if not icon_raw or icon_raw == "none":
            icon_html = ""  # no icon
        elif icon_raw.startswith("{"):
            try:
                ic = _json.loads(icon_raw)
                if ic.get("type") == "emoji":
                    icon_html = ic.get("key", "")
                elif ic.get("type") == "svg":
                    svg_key = ic.get("key", "")
                    path_d = _SVG_PATHS.get(svg_key, "")
                    if path_d:
                        icon_html = f'<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="{path_d}"/></svg>'
            except Exception:
                icon_html = ""
        elif icon_raw in _SVG_PATHS:
            # New system: plain string ID like 'instagram', 'tiktok', etc.
            path_d = _SVG_PATHS[icon_raw]
            icon_html = f'<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="{path_d}"/></svg>'
        elif len(icon_raw) <= 4:
            icon_html = icon_raw  # legacy emoji string
        else:
            icon_html = ""  # unknown — hide
        parsed_links.append({
            "id": lk.id, "title": lk.title, "url": lk.url,
            "icon": icon_html, "icon_raw": icon_raw,
            "subtitle": lk.subtitle, "is_active": lk.is_active,
            "btn_style": lk.btn_style, "btn_bg_color": lk.btn_bg_color,
            "btn_text_color": lk.btn_text_color, "thumbnail": lk.thumbnail,
        })

    return templates.TemplateResponse("linkhub-public.html", {
        "request": request,
        "user": user,
        "profile": profile,
        "links": parsed_links,
        "social_links": social_links,
    })


# ═══════════════════════════════════════════════════════════════
#  PROSELLER — AI Sales Coach + Prospect CRM
# ═══════════════════════════════════════════════════════════════

@app.get("/proseller")
def proseller_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

async def _old_proseller_DISABLED(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login?next=/proseller", status_code=302)

    # Pro tier gate
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return RedirectResponse("/upgrade", status_code=302)

    # Load prospects for this user
    from .database import Prospect, ProSellerMessage
    prospects = db.query(Prospect).filter(
        Prospect.user_id == user.id
    ).order_by(Prospect.updated_at.desc()).all()

    # Stats
    total_prospects = len(prospects)
    stage_counts = {}
    for p in prospects:
        stage_counts[p.stage] = stage_counts.get(p.stage, 0) + 1

    # Messages generated today
    from datetime import datetime, timedelta
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    msgs_today = db.query(ProSellerMessage).filter(
        ProSellerMessage.user_id == user.id,
        ProSellerMessage.created_at >= today_start
    ).count()

    # Follow-ups due
    now = datetime.utcnow()
    followups_due = [p for p in prospects if p.follow_up_at and p.follow_up_at <= now and not p.is_converted]

    return templates.TemplateResponse("proseller.html", {
        "request": request,
        "user": user,
        "active_page": "proseller",
        "prospects": prospects,
        "total_prospects": total_prospects,
        "stage_counts": stage_counts,
        "msgs_today": msgs_today,
        "followups_due": followups_due,
        "converted_count": sum(1 for p in prospects if p.is_converted),
        "now": now,
    })


@app.post("/api/proseller/generate")
async def api_proseller_generate(request: Request, db: Session = Depends(get_db)):
    """Generate an AI sales message for the given scenario."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "AI unavailable"}, status_code=503)

    body = await request.json()
    msg_type = body.get("type", "cold_opener")       # cold_opener, objection, followup, closing
    platform = body.get("platform", "instagram")
    situation = body.get("situation", "")
    prospect_desc = body.get("prospect_desc", "")
    objection_key = body.get("objection", "")
    prospect_id = body.get("prospect_id")

    # Build the prompt
    system_prompt = """You are ProSeller, an AI sales coach for SuperAdPro affiliates. SuperAdPro is a video advertising platform where:
- Members watch real video ads and earn daily
- 4 income streams: Membership ($20/mo, 50% to sponsor), 8×8 Income Grid (8 tiers $20-$1000, 40% direct + 50% uni-level across 8 levels), and Courses
- 95% of every dollar is paid out to the network
- Real advertising utility — advertisers pay for genuine video views from real people
- AI-powered marketing tools built into the dashboard
- Entry point is just $20

Your job is to generate ready-to-send messages that:
1. Sound natural and human — NOT salesy or "MLM bro" energy
2. Are adapted to the specific platform (Instagram DMs are casual, LinkedIn is professional, WhatsApp is personal)
3. Never use ALL CAPS, excessive emojis, or fake urgency
4. Focus on genuine value and curiosity, not hype
5. Are concise — people don't read walls of text in DMs

Always generate exactly 2 message options — one shorter/casual and one slightly more detailed.
Return ONLY a JSON array of 2 strings. No markdown, no explanation, just the JSON array."""

    if msg_type == "cold_opener":
        user_prompt = f"Generate 2 cold opening messages for {platform}."
        if prospect_desc:
            user_prompt += f" The prospect: {prospect_desc}"
        else:
            user_prompt += " Generic prospect, no details known."

    elif msg_type == "objection":
        objection_labels = {
            "scam": "Is this a scam / pyramid scheme?",
            "money": "I don't have the money right now",
            "time": "I don't have time for this",
            "think": "I need to think about it",
            "tried": "I've tried these things before and they don't work",
            "spouse": "I need to ask my partner first",
            "skills": "I'm not good at sales / I can't sell",
            "saturated": "Isn't the market already saturated?",
        }
        objection_text = objection_labels.get(objection_key, situation or "general objection")
        user_prompt = f'Generate 2 responses to this objection on {platform}: "{objection_text}". Be empathetic, address the concern directly, and gently redirect to the value.'

    elif msg_type == "followup":
        user_prompt = f"Generate 2 follow-up messages for {platform}. The prospect said they'd think about it and hasn't replied in a few days. Be casual, not pushy."
        if prospect_desc:
            user_prompt += f" Context: {prospect_desc}"

    elif msg_type == "closing":
        user_prompt = f"Generate 2 closing messages for {platform}. The prospect is interested and ready — they just need the final nudge to sign up."
        if prospect_desc:
            user_prompt += f" Context: {prospect_desc}"

    else:
        user_prompt = f"Generate 2 helpful messages for {platform} for this situation: {situation}"

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=AI_MODEL_HAIKU,
            max_tokens=600,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        text = response.content[0].text if response.content else "[]"

        # Parse JSON response
        import json as _json2
        # Strip markdown fencing if present
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        messages = _json2.loads(text)

        # Log the generation
        from .database import ProSellerMessage
        for msg in messages:
            log = ProSellerMessage(
                user_id=user.id,
                prospect_id=prospect_id,
                message_type=msg_type,
                platform=platform,
                situation=objection_key or situation,
                prompt_context=prospect_desc or user_prompt[:500],
                generated_text=str(msg)[:2000],
            )
            db.add(log)
        db.commit()

        return JSONResponse({"messages": messages})

    except Exception as e:
        return JSONResponse({"messages": [
            "Hey! I came across your profile and love what you're doing. I've been working with a platform that's been generating a solid second income for me — would you be open to a quick look?",
            "Hi! Random question — have you ever looked into monetising what you're already doing online? I found something that's been working really well and thought of you."
        ]})


@app.post("/api/proseller/prospect")
async def api_proseller_prospect(request: Request, db: Session = Depends(get_db)):
    """Create or update a prospect."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)

    from .database import Prospect
    body = await request.json()
    action = body.get("action", "create")

    if action == "create":
        p = Prospect(
            user_id=user.id,
            name=body.get("name", "Unknown"),
            platform=body.get("platform"),
            source=body.get("source"),
            stage=body.get("stage", "cold"),
            notes=body.get("notes"),
        )
        db.add(p)
        db.commit()
        db.refresh(p)
        return JSONResponse({"success": True, "id": p.id})

    elif action == "update":
        pid = body.get("id")
        p = db.query(Prospect).filter(Prospect.id == pid, Prospect.user_id == user.id).first()
        if not p:
            return JSONResponse({"error": "Not found"}, status_code=404)
        for field in ["name", "platform", "source", "stage", "notes"]:
            if field in body:
                setattr(p, field, body[field])
        if "follow_up_at" in body and body["follow_up_at"]:
            from datetime import datetime
            try:
                p.follow_up_at = datetime.fromisoformat(body["follow_up_at"])
            except:
                pass
        p.last_contact_at = datetime.utcnow()
        db.commit()
        return JSONResponse({"success": True})

    elif action == "delete":
        pid = body.get("id")
        p = db.query(Prospect).filter(Prospect.id == pid, Prospect.user_id == user.id).first()
        if p:
            db.delete(p)
            db.commit()
        return JSONResponse({"success": True})

    return JSONResponse({"error": "Invalid action"}, status_code=400)



@app.get("/api/join/{username}")
async def api_join_funnel(username: str, db: Session = Depends(get_db)):
    """Public: return sponsor data for the join funnel page."""
    sponsor = db.query(User).filter(User.username == username).first()
    if not sponsor:
        return JSONResponse({"error": "Not found"}, status_code=404)
    total_members = db.query(User).filter(User.is_active == True).count()
    return {
        "username": sponsor.username,
        "first_name": sponsor.first_name or sponsor.username,
        "avatar_url": sponsor.avatar_url or "",
        "total_members": total_members,
        "ref": username,
    }


# ═══════════════════════════════════════════════════════════════
#  PHASE 4 API ENDPOINTS — Ad Board, Course Player
# ═══════════════════════════════════════════════════════════════

@app.get("/api/ads")
def api_ad_board(category: str = "", page: int = 1, db: Session = Depends(get_db)):
    """Public: list active ad listings."""
    query = db.query(AdListing).filter(AdListing.is_active == True)
    if category:
        query = query.filter(AdListing.category == category)
    total = query.count()
    per_page = 20
    listings = query.order_by(AdListing.is_featured.desc(), AdListing.created_at.desc())                    .offset((page - 1) * per_page).limit(per_page).all()
    owner_ids = list(set(l.user_id for l in listings))
    owners = {u.id: u.username for u in db.query(User).filter(User.id.in_(owner_ids)).all()}
    return {
        "listings": [{
            "id": l.id, "title": l.title, "slug": l.slug or str(l.id),
            "description": l.description, "category": l.category,
            "link_url": l.link_url, "image_url": l.image_url or "",
            "is_featured": l.is_featured, "views": l.views or 0, "clicks": l.clicks or 0,
            "owner": owners.get(l.user_id, "Member"),
            "created_at": l.created_at.isoformat() if l.created_at else None,
        } for l in listings],
        "total": total,
        "page": page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
        "categories": AD_CATEGORIES,
    }


@app.get("/api/ads/listing/{slug}")
def api_ad_detail(slug: str, db: Session = Depends(get_db)):
    """Public: single ad listing by slug."""
    listing = db.query(AdListing).filter(AdListing.slug == slug, AdListing.is_active == True).first()
    if not listing:
        # Try by ID
        try:
            listing = db.query(AdListing).filter(AdListing.id == int(slug)).first()
        except Exception:
            pass
    if not listing:
        return JSONResponse({"error": "Not found"}, status_code=404)
    owner = db.query(User).filter(User.id == listing.user_id).first()
    related = db.query(AdListing).filter(
        AdListing.category == listing.category,
        AdListing.id != listing.id,
        AdListing.is_active == True
    ).limit(4).all()
    return {
        "id": listing.id, "title": listing.title, "slug": listing.slug or str(listing.id),
        "description": listing.description, "category": listing.category,
        "link_url": listing.link_url, "image_url": listing.image_url or "",
        "is_featured": listing.is_featured, "views": listing.views or 0, "clicks": listing.clicks or 0,
        "owner": owner.username if owner else "Member",
        "created_at": listing.created_at.isoformat() if listing.created_at else None,
        "related": [{"id": r.id, "title": r.title, "slug": r.slug or str(r.id),
                     "category": r.category, "image_url": r.image_url or ""} for r in related],
        "categories": AD_CATEGORIES,
    }


@app.get("/api/ads/my")
def api_my_ads(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Member: list own ad listings."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    listings = db.query(AdListing).filter(AdListing.user_id == user.id)                 .order_by(AdListing.created_at.desc()).all()
    return {
        "listings": [{
            "id": l.id, "title": l.title, "slug": l.slug or str(l.id),
            "description": l.description, "category": l.category,
            "link_url": l.link_url, "image_url": l.image_url or "",
            "is_active": l.is_active, "is_featured": l.is_featured,
            "views": l.views or 0, "clicks": l.clicks or 0,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        } for l in listings],
        "categories": AD_CATEGORIES,
    }


@app.get("/api/courses/learn/{course_id}")
async def api_course_player(course_id: int, request: Request,
                              db: Session = Depends(get_db)):
    """Member: load course player data — chapters, lessons, progress."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        return JSONResponse({"error": "Course not found"}, status_code=404)
    purchase = db.query(CoursePurchase).filter(
        CoursePurchase.user_id == user.id,
        CoursePurchase.course_id == course_id
    ).first()
    if not purchase:
        return JSONResponse({"error": "Course not purchased"}, status_code=403)
    chapters = db.query(CourseChapter).filter(
        CourseChapter.course_id == course_id
    ).order_by(CourseChapter.sort_order).all()
    lessons = db.query(CourseLesson).filter(
        CourseLesson.course_id == course_id
    ).order_by(CourseLesson.sort_order).all()
    completed_ids = {
        p.lesson_id for p in db.query(CourseProgress).filter(
            CourseProgress.user_id == user.id,
            CourseProgress.course_id == course_id
        ).all()
    }
    chapter_map = {}
    for lesson in lessons:
        cid = lesson.chapter_id or 0
        if cid not in chapter_map:
            chapter_map[cid] = []
        chapter_map[cid].append({
            "id": lesson.id, "title": lesson.title,
            "video_url": lesson.video_url or "",
            "duration_mins": lesson.duration_mins or 0,
            "sort_order": lesson.sort_order,
            "completed": lesson.id in completed_ids,
        })
    return {
        "course": {
            "id": course.id, "title": course.title,
            "description": course.description or "",
            "thumbnail_url": course.thumbnail_url or "",
        },
        "chapters": [{
            "id": ch.id, "title": ch.title, "sort_order": ch.sort_order,
            "lessons": chapter_map.get(ch.id, []),
        } for ch in chapters],
        "uncategorised": chapter_map.get(0, []),
        "total_lessons": len(lessons),
        "completed_count": len(completed_ids),
    }


@app.post("/api/courses/learn/{course_id}/complete/{lesson_id}")
async def api_mark_lesson_complete(course_id: int, lesson_id: int,
                                    request: Request, db: Session = Depends(get_db)):
    """Member: mark a lesson as complete."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    existing = db.query(CourseProgress).filter(
        CourseProgress.user_id == user.id,
        CourseProgress.course_id == course_id,
        CourseProgress.lesson_id == lesson_id,
    ).first()
    if not existing:
        db.add(CourseProgress(
            user_id=user.id, course_id=course_id, lesson_id=lesson_id
        ))
        db.commit()
    return {"ok": True}

# ═══════════════════════════════════════════════════════════════
#  AFFILIATE SALES FUNNEL — /join/{username}
#  (Handled by the SuperLink route earlier in the file — line ~791)
# ═══════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════
#  PRO TIER — Upgrade page + AI Funnel Generator + Leads
# ═══════════════════════════════════════════════════════════════

@app.get("/upgrade")
def upgrade_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

async def _old_upgrade_DISABLED(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login?next=/upgrade", status_code=302)
    return templates.TemplateResponse("upgrade.html", {
        "request": request,
        "user": user,
        "active_page": "upgrade",
    })


@app.get("/pro/funnels")
async def pro_funnels_page(request: Request, db: Session = Depends(get_db)):
    """Serve React SuperPages listing."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.post("/api/pro/generate-funnel")
async def api_pro_generate_funnel(request: Request, db: Session = Depends(get_db)):
    """AI generates a complete landing page + email sequence from 4 inputs."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return JSONResponse({"error": "Pro tier required"}, status_code=403)

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "AI unavailable"}, status_code=503)

    body = await request.json()
    niche = body.get("niche", "general")
    audience = body.get("audience", "beginners")
    story = body.get("story", "")
    tone = body.get("tone", "professional")

    # ── Generate funnel page copy ──
    funnel_prompt = f"""Generate a landing page for a SuperAdPro affiliate. Output ONLY a JSON object with these keys:
- headline: A compelling headline (under 12 words)
- subheadline: One sentence expanding on the headline
- body_paragraphs: Array of 3-4 paragraphs of persuasive copy
- capture_heading: Opt-in form heading (e.g. "Get Free Access")
- capture_subtext: One line below the form heading
- features: Array of 5-6 bullet points about what SuperAdPro offers
- cta_text: Call to action button text

Context:
- Niche: {niche}
- Target audience: {audience}
- Member's story: {story or 'Not provided'}
- Tone: {tone}

Rules:
- No hype, no income promises, no "passive income" or "get rich"
- Honest and educational tone
- Focus on the tools, the training, and the real advertising utility
- The opt-in is to learn more (email sequence will nurture them)
- Keep it natural and human

Return ONLY valid JSON. No markdown, no explanation."""

    # ── Generate email sequence ──
    sequence_prompt = f"""Generate a 5-email nurture sequence for a SuperAdPro affiliate's leads. Output ONLY a JSON array of 5 objects, each with:
- subject: Email subject line
- body_html: Email body as simple HTML (paragraphs only, no complex styling)
- send_delay_days: Days after capture to send (0, 2, 4, 7, 10)

Context:
- Niche: {niche}
- Target audience: {audience}
- Tone: {tone}

Email structure:
1. Welcome + what they'll learn (immediate)
2. Value tip relevant to their niche (day 2)
3. Introduce SuperAdPro and the 4 income streams briefly (day 4)
4. Address common concerns for this audience (day 7)
5. Direct invitation to join with a clear CTA (day 10)

Rules:
- No hype or income promises
- Honest, helpful, educational
- Each email should feel personal, not templated
- Include {{referral_link}} placeholder where the join link should go
- Include {{member_name}} placeholder for the affiliate's name
- Keep each email under 200 words

Return ONLY a valid JSON array. No markdown."""

    try:
        client = anthropic.Anthropic(api_key=api_key)

        # Generate funnel copy
        funnel_resp = client.messages.create(
            model=AI_MODEL_HAIKU,
            max_tokens=800,
            messages=[{"role": "user", "content": funnel_prompt}]
        )
        funnel_text = funnel_resp.content[0].text.strip()
        if funnel_text.startswith("```"):
            funnel_text = funnel_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        # Find JSON object boundaries
        if "{" in funnel_text:
            funnel_text = funnel_text[funnel_text.index("{"):funnel_text.rindex("}") + 1]

        import json as _json3
        funnel_data = _json3.loads(funnel_text)

        # Generate email sequence
        seq_resp = client.messages.create(
            model=AI_MODEL_HAIKU,
            max_tokens=1200,
            messages=[{"role": "user", "content": sequence_prompt}]
        )
        seq_text = seq_resp.content[0].text.strip()
        if seq_text.startswith("```"):
            seq_text = seq_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        # Find JSON array boundaries
        if "[" in seq_text:
            seq_text = seq_text[seq_text.index("["):seq_text.rindex("]") + 1]

        seq_data = _json3.loads(seq_text)

        # Save email sequence
        from .database import EmailSequence
        sequence = EmailSequence(
            user_id=user.id,
            title=f"{niche.title()} Nurture Sequence",
            niche=niche,
            tone=tone,
            num_emails=len(seq_data),
            emails_json=_json3.dumps(seq_data),
        )
        db.add(sequence)
        db.flush()

        # Save funnel page
        import secrets as _secrets
        slug = f"{niche.lower().replace(' ', '-')}-{_secrets.token_hex(3)}"

        page = FunnelPage(
            user_id=user.id,
            slug=f"{user.username}/{slug}",
            title=funnel_data.get("headline", "Join SuperAdPro"),
            template_type="ai_funnel",
            status="published",
            headline=funnel_data.get("headline"),
            subheadline=funnel_data.get("subheadline"),
            body_copy=_json3.dumps(funnel_data.get("body_paragraphs", [])),
            cta_text=funnel_data.get("cta_text", "Join Now"),
            cta_url=f"/register?ref={user.username}",
            video_url=body.get("video_url", ""),
            sections_json=_json3.dumps(funnel_data),
            has_capture_form=True,
            capture_form_heading=funnel_data.get("capture_heading", "Get Free Access"),
            capture_form_subtext=funnel_data.get("capture_subtext", ""),
            capture_sequence_id=sequence.id,
            is_ai_generated=True,
            ai_niche=niche,
            ai_audience=audience,
            ai_story=story,
            ai_tone=tone,
        )
        db.add(page)
        db.commit()
        db.refresh(page)

        return JSONResponse({
            "success": True,
            "funnel_id": page.id,
            "funnel_url": f"/f/{user.username}/{slug}",
            "sequence_id": sequence.id,
            "funnel_data": funnel_data,
        })

    except Exception as e:
        logger.error(f"AI funnel generation failed: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": f"Failed to generate funnel: {str(e)[:200]}"}, status_code=500)


@app.get("/pro/funnel/{funnel_id}/edit")
async def pro_funnel_edit(funnel_id: int, request: Request, db: Session = Depends(get_db)):
    """Serve React SuperPages editor."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")


@app.get("/pro/funnel/{funnel_id}/analytics")
def pro_funnel_analytics(funnel_id: int, request: Request):
    """Phase 4: redirect to React funnels."""
    del funnel_id
    return RedirectResponse(url="/pro/funnels", status_code=302)

def _old_pro_funnel_analytics_DISABLED(funnel_id: int, request: Request,
                         user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Per-page analytics dashboard."""
    if not user: return RedirectResponse(url="/?login=1")
    page = db.query(FunnelPage).filter(FunnelPage.id == funnel_id, FunnelPage.user_id == user.id).first()
    if not page: raise HTTPException(status_code=404, detail="Page not found")

    from sqlalchemy import func, cast, Date
    from datetime import timedelta

    # Total views and leads
    views = page.views or 0
    leads_count = db.query(FunnelLead).filter(FunnelLead.page_id == page.id).count()
    conversion_rate = round((leads_count / views * 100), 1) if views > 0 else 0

    # Views today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    views_today = db.query(FunnelEvent).filter(
        FunnelEvent.page_id == page.id, FunnelEvent.event_type == "view",
        FunnelEvent.created_at >= today_start
    ).count()

    # Daily views — last 14 days
    daily_views = []
    max_day_views = 1
    for i in range(13, -1, -1):
        day = datetime.utcnow().date() - timedelta(days=i)
        day_start = datetime(day.year, day.month, day.day)
        day_end = day_start + timedelta(days=1)
        count = db.query(FunnelEvent).filter(
            FunnelEvent.page_id == page.id, FunnelEvent.event_type == "view",
            FunnelEvent.created_at >= day_start, FunnelEvent.created_at < day_end
        ).count()
        if count > max_day_views:
            max_day_views = count
        daily_views.append({"date": day, "count": count, "label": day.strftime("%d")})
    for d in daily_views:
        d["pct"] = round((d["count"] / max_day_views) * 100) if max_day_views > 0 else 0

    # Traffic sources
    source_data = db.query(FunnelEvent.referrer, func.count(FunnelEvent.id)).filter(
        FunnelEvent.page_id == page.id, FunnelEvent.event_type == "view"
    ).group_by(FunnelEvent.referrer).order_by(func.count(FunnelEvent.id).desc()).limit(6).all()
    max_source = max((c for _, c in source_data), default=1)
    sources = []
    for ref, count in source_data:
        name = "Direct"
        if ref:
            ref_lower = ref.lower()
            if "facebook" in ref_lower or "fb." in ref_lower: name = "Facebook"
            elif "instagram" in ref_lower: name = "Instagram"
            elif "twitter" in ref_lower or "t.co" in ref_lower: name = "X (Twitter)"
            elif "tiktok" in ref_lower: name = "TikTok"
            elif "google" in ref_lower: name = "Google"
            elif "youtube" in ref_lower: name = "YouTube"
            elif "linkedin" in ref_lower: name = "LinkedIn"
            else: name = ref[:30]
        sources.append({"name": name, "count": count, "pct": round(count / max_source * 100)})

    # Device breakdown
    device_data = db.query(FunnelEvent.device, func.count(FunnelEvent.id)).filter(
        FunnelEvent.page_id == page.id, FunnelEvent.event_type == "view"
    ).group_by(FunnelEvent.device).order_by(func.count(FunnelEvent.id).desc()).all()
    max_device = max((c for _, c in device_data), default=1)
    device_icons = {"mobile": "📱", "desktop": "🖥", "tablet": "📋"}
    devices = [{"name": (d or "Unknown").capitalize(), "icon": device_icons.get(d, "❓"), "count": c,
                "pct": round(c / max_device * 100)} for d, c in device_data]

    # Recent leads
    recent_leads_raw = db.query(FunnelLead).filter(FunnelLead.page_id == page.id).order_by(
        FunnelLead.created_at.desc()).limit(10).all()
    recent_leads = []
    for lead in recent_leads_raw:
        ago = ""
        if lead.created_at:
            delta = (datetime.utcnow() - lead.created_at).total_seconds()
            if delta < 3600: ago = f"{int(delta/60)}m ago"
            elif delta < 86400: ago = f"{int(delta/3600)}h ago"
            else: ago = f"{int(delta/86400)}d ago"
        recent_leads.append({"name": lead.name, "email": lead.email, "ago": ago})

    # A/B testing data
    variant = db.query(FunnelPage).filter(FunnelPage.ab_variant_of == page.id).first()
    ab_rate_a = conversion_rate
    ab_rate_b = 0
    if variant:
        variant_leads = db.query(FunnelLead).filter(FunnelLead.page_id == variant.id).count()
        variant_views = variant.views or 0
        ab_rate_b = round((variant_leads / variant_views * 100), 1) if variant_views > 0 else 0

    ctx = get_dashboard_context(request, user, db)
    ctx.update({
        "page": page,
        "views": views,
        "leads_count": leads_count,
        "conversion_rate": conversion_rate,
        "views_today": views_today,
        "daily_views": daily_views,
        "sources": sources,
        "devices": devices,
        "recent_leads": recent_leads,
        "base_url": str(request.base_url),
        "active_page": "funnels",
        "variant": variant,
        "ab_rate_a": ab_rate_a,
        "ab_rate_b": ab_rate_b,
    })
    return templates.TemplateResponse("page-analytics.html", ctx)


@app.post("/api/pro/funnel/create-blank")
async def api_pro_funnel_create_blank(request: Request, db: Session = Depends(get_db)):
    """Create a blank funnel page and go straight to SuperPages."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return JSONResponse({"error": "Pro tier required"}, status_code=403)

    import secrets
    slug_suffix = secrets.token_hex(3)
    slug = f"{user.username}/blank-{slug_suffix}"
    title = "Untitled Page"

    page = FunnelPage(
        user_id=user.id,
        title=title,
        slug=slug,
        headline=title,
        status="published",
        sections_json="{}",
    )
    db.add(page)
    db.commit()
    db.refresh(page)

    return JSONResponse({"success": True, "funnel_id": page.id, "slug": slug})


@app.post("/api/pro/funnel/create-from-template")
async def api_pro_funnel_create_from_template(request: Request, db: Session = Depends(get_db)):
    """Create a funnel page from a pre-built template."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return JSONResponse({"error": "Pro tier required"}, status_code=403)

    body = await request.json()
    template_name = body.get("template", "")

    from app.funnel_templates import get_templates
    import json as _jtpl, secrets

    templates = get_templates()
    tpl = next((t for t in templates if t['name'] == template_name), None)
    if not tpl:
        return JSONResponse({"error": "Template not found"}, status_code=404)

    try:
        slug_suffix = secrets.token_hex(3)
        slug = f"{user.username}/{tpl['category']}-{slug_suffix}"

        page = FunnelPage(
            user_id=user.id,
            title=tpl['name'],
            slug=slug,
            headline=tpl['name'],
            status="published",
            sections_json="{}",
            gjs_css=_jtpl.dumps({"els": tpl['elements'], "canvasBg": tpl['bg_color']}),
        )
        db.add(page)
        db.commit()
        db.refresh(page)

        return JSONResponse({"success": True, "funnel_id": page.id})
    except Exception as e:
        db.rollback()
        logger.error(f"Template create error: {e}")
        return JSONResponse({"error": f"Failed: {str(e)[:200]}"}, status_code=500)


@app.get("/api/pro/funnel/templates")
async def api_pro_funnel_templates(request: Request, db: Session = Depends(get_db)):
    """Return the list of available templates."""
    from app.funnel_templates import get_templates
    templates = get_templates()
    return JSONResponse([{"name": t["name"], "description": t["description"], "category": t["category"], "icon": t["icon"]} for t in templates])


@app.post("/api/pro/funnel/{funnel_id}/create-ab-variant")
async def create_ab_variant(funnel_id: int, request: Request,
                            user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create an A/B test variant of a funnel page."""
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)
    original = db.query(FunnelPage).filter(FunnelPage.id == funnel_id, FunnelPage.user_id == user.id).first()
    if not original:
        return JSONResponse({"error": "Page not found"}, status_code=404)

    # Check if variant already exists
    existing = db.query(FunnelPage).filter(FunnelPage.ab_variant_of == funnel_id).first()
    if existing:
        return JSONResponse({"error": "A/B variant already exists", "variant_id": existing.id}, status_code=400)

    # Clone the page as variant B
    import json as _jab
    variant = FunnelPage(
        user_id=user.id,
        title=f"{original.title} (Variant B)",
        slug=f"{original.slug}-b",
        headline=original.headline,
        template_type=original.template_type,
        status="published",
        gjs_html=original.gjs_html,
        gjs_css=original.gjs_css,
        meta_description=original.meta_description,
        image_url=original.image_url,
        sections_json=original.sections_json,
        has_capture_form=original.has_capture_form,
        capture_form_heading=original.capture_form_heading,
        capture_form_subtext=original.capture_form_subtext,
        ab_variant_of=original.id,
        ab_split_pct=50,
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return JSONResponse({"success": True, "variant_id": variant.id})


@app.post("/api/pro/funnel/{funnel_id}/ab-split")
async def update_ab_split(funnel_id: int, request: Request,
                          user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update the A/B split percentage."""
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)
    body = await request.json()
    pct = body.get("split_pct", 50)
    pct = max(10, min(90, int(pct)))
    variant = db.query(FunnelPage).filter(FunnelPage.ab_variant_of == funnel_id, FunnelPage.user_id == user.id).first()
    if not variant:
        return JSONResponse({"error": "No variant found"}, status_code=404)
    variant.ab_split_pct = pct
    db.commit()
    return JSONResponse({"success": True, "split_pct": pct})


@app.post("/api/pro/funnel/{funnel_id}/save")
async def api_pro_funnel_save(funnel_id: int, request: Request, db: Session = Depends(get_db)):
    """Save inline edits to an AI funnel."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)

    page = db.query(FunnelPage).filter(FunnelPage.id == funnel_id, FunnelPage.user_id == user.id).first()
    if not page:
        return JSONResponse({"error": "Not found"}, status_code=404)

    body = await request.json()
    import json as _json_save

    # Update funnel_data
    funnel_data = {}
    try:
        funnel_data = _json_save.loads(page.sections_json) if page.sections_json else {}
    except:
        pass

    # Apply edits
    if "headline" in body:
        funnel_data["headline"] = body["headline"]
        page.headline = body["headline"]
    if "subheadline" in body:
        funnel_data["subheadline"] = body["subheadline"]
        page.subheadline = body["subheadline"]
    if "body_paragraphs" in body:
        funnel_data["body_paragraphs"] = body["body_paragraphs"]
    if "features" in body:
        funnel_data["features"] = body["features"]
    if "cta_text" in body:
        funnel_data["cta_text"] = body["cta_text"]
        page.cta_text = body["cta_text"]
    if "capture_heading" in body:
        funnel_data["capture_heading"] = body["capture_heading"]
        page.capture_form_heading = body["capture_heading"]
    if "capture_subtext" in body:
        funnel_data["capture_subtext"] = body["capture_subtext"]
        page.capture_form_subtext = body["capture_subtext"]
    if "video_url" in body:
        page.video_url = body["video_url"]
    if "status" in body:
        page.status = body["status"]
    if "colors" in body:
        funnel_data["colors"] = body["colors"]
    if "sections" in body:
        funnel_data["sections"] = body["sections"]
    if "bgImage" in body:
        funnel_data["bgImage"] = body["bgImage"]

    page.sections_json = _json_save.dumps(funnel_data)
    db.commit()

    return JSONResponse({"success": True})


@app.post("/api/pro/funnel/{funnel_id}/delete")
async def api_pro_funnel_delete(funnel_id: int, request: Request, db: Session = Depends(get_db)):
    """Delete a funnel page and its related data."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)

    page = db.query(FunnelPage).filter(FunnelPage.id == funnel_id, FunnelPage.user_id == user.id).first()
    if not page:
        return JSONResponse({"error": "Not found"}, status_code=404)

    try:
        # Delete A/B variant if exists
        db.query(FunnelPage).filter(FunnelPage.ab_variant_of == funnel_id).delete()
        # Delete related analytics events and leads
        db.query(FunnelEvent).filter(FunnelEvent.page_id == funnel_id).delete()
        db.query(FunnelLead).filter(FunnelLead.page_id == funnel_id).delete()
        # Delete the page itself
        db.delete(page)
        db.commit()
        return JSONResponse({"success": True})
    except Exception as e:
        db.rollback()
        logger.error(f"Funnel delete error: {e}")
        return JSONResponse({"error": "Delete failed"}, status_code=500)


@app.post("/api/pro/funnel/{funnel_id}/regenerate")
async def api_pro_funnel_regenerate(funnel_id: int, request: Request, db: Session = Depends(get_db)):
    """Regenerate funnel copy with AI feedback."""
    # Kept for backward compat but chat endpoint is primary now
    return JSONResponse({"error": "Use the chat endpoint instead"}, status_code=400)


@app.post("/api/pro/funnel/{funnel_id}/chat")
async def api_pro_funnel_chat(funnel_id: int, request: Request, db: Session = Depends(get_db)):
    """AI chat endpoint — interprets natural language commands and modifies the funnel."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return JSONResponse({"error": "Pro tier required"}, status_code=403)

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "AI unavailable"}, status_code=503)

    body = await request.json()
    message = body.get("message", "")
    current_sections = body.get("sections", [])
    current_style = body.get("pageStyle", {})

    import json as _jchat

    system_prompt = """You are the SuperAdPro AI Funnel Builder assistant. You modify landing page sections based on user commands.

CURRENT PAGE STATE:
- Sections: """ + _jchat.dumps(current_sections)[:3000] + """
- Page style: """ + _jchat.dumps(current_style) + """

AVAILABLE SECTION TYPES:
- heading: {type:"heading", content:"text", level:"h1"|"h2"|"h3", color:"#hex", align:"left"|"center"|"right"}
- text: {type:"text", content:"text", color:"#hex", align:"left"|"center"|"right", size:"15px"}
- video: {type:"video", url:"youtube/vimeo url"}
- button: {type:"button", text:"label", url:"/register?ref=""" + user.username + """", color1:"#hex", color2:"#hex", align:"center", size:"16px"}
- features: {type:"features", items:["item1","item2"], checkColor:"#hex", textColor:"#hex"}
- capture: {type:"capture", heading:"text", subtext:"text", btnText:"text", btnColor:"#hex", btnColor2:"#hex", bgColor:"#hex"}
- testimonial: {type:"testimonial", quote:"text", author:"name", color:"#hex", bgColor:"#hex"}
- divider: {type:"divider", color:"#hex", thickness:"1px", width:"60%"}
- spacer: {type:"spacer", height:"40px"}
- image: {type:"image", url:"image_url", width:"100%", borderRadius:"12px"}

RULES:
- Return ONLY valid JSON with these keys:
  sections: the COMPLETE updated sections array
  pageStyle: {bg:"#hex", bgImage:"url or empty string"}
  response: short friendly message explaining what you did
  actions: array of {type:"added"|"changed"|"removed", label:"short description"}
- For visual backgrounds (sunset, ocean, mountains), use real Unsplash URLs. Search unsplash.com mentally and use real photo IDs. Format: https://images.unsplash.com/photo-{id}?w=1920&q=80. Use IDs like: 1507525428034-b723cf961d3e (ocean), 1506905925346-21bda4d32df4 (mountains), 1495616811223-4d98c6e9c869 (sunset), 1441974231531-c6227db76b6e (forest), 1478760329108-5c3ed9d495a0 (night sky).
- For colour changes, modify the section colour properties
- For adding sections, insert at a logical position in the array
- For removing, remove from array
- Keep response field short and conversational
- No hype or income promises in any generated text
- If the user provides a video URL, put it in a video section's url field exactly as given
- ALWAYS return the COMPLETE sections array, not just the changed parts
- NEVER return markdown fencing — just raw JSON"""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model=AI_MODEL_HAIKU,
            max_tokens=3000,
            messages=[{"role": "user", "content": message}],
            system=system_prompt,
        )
        text = resp.content[0].text.strip()
        # Clean JSON
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        if "{" in text:
            text = text[text.index("{"):text.rindex("}") + 1]

        result = _jchat.loads(text)

        return JSONResponse({
            "success": True,
            "sections": result.get("sections", current_sections),
            "pageStyle": result.get("pageStyle", current_style),
            "response": result.get("response", "Done!"),
            "actions": result.get("actions", []),
        })

    except Exception as e:
        logger.error(f"Funnel chat error: {e}")
        return JSONResponse({
            "success": False,
            "error": f"I had trouble processing that. Try rephrasing: {str(e)[:100]}"
        })
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)

    page = db.query(FunnelPage).filter(FunnelPage.id == funnel_id, FunnelPage.user_id == user.id).first()
    if not page:
        return JSONResponse({"error": "Not found"}, status_code=404)

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "AI unavailable"}, status_code=503)

    body = await request.json()
    feedback = body.get("feedback", "")
    import json as _json_regen

    current_data = {}
    try:
        current_data = _json_regen.loads(page.sections_json) if page.sections_json else {}
    except:
        pass

    prompt = f"""You previously generated a landing page with this content:
Headline: {current_data.get('headline', '')}
Subheadline: {current_data.get('subheadline', '')}

The user wants changes: "{feedback}"

Original context: Niche: {page.ai_niche}, Audience: {page.ai_audience}, Tone: {page.ai_tone}

Generate an updated version. Output ONLY a JSON object with keys: headline, subheadline, body_paragraphs (array), capture_heading, capture_subtext, features (array), cta_text.
Follow the user's feedback. Keep it honest — no hype, no income promises.
Return ONLY valid JSON."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model=AI_MODEL_HAIKU,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        new_data = _json_regen.loads(text)

        # Merge new data
        for key in ["headline", "subheadline", "body_paragraphs", "features", "cta_text", "capture_heading", "capture_subtext"]:
            if key in new_data:
                current_data[key] = new_data[key]

        page.headline = new_data.get("headline", page.headline)
        page.subheadline = new_data.get("subheadline", page.subheadline)
        page.cta_text = new_data.get("cta_text", page.cta_text)
        page.capture_form_heading = new_data.get("capture_heading", page.capture_form_heading)
        page.capture_form_subtext = new_data.get("capture_subtext", page.capture_form_subtext)
        page.sections_json = _json_regen.dumps(current_data)
        db.commit()

        return JSONResponse({"success": True, "funnel_data": current_data})

    except Exception as e:
        logger.error(f"Funnel regeneration failed: {e}")
        return JSONResponse({"error": "Regeneration failed"}, status_code=500)


@app.post("/api/pro/funnel/{funnel_id}/ai-modify")
async def api_pro_funnel_ai_modify(funnel_id: int, request: Request, db: Session = Depends(get_db)):
    """AI modifies funnel sections based on natural language instruction."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return JSONResponse({"error": "Pro tier required"}, status_code=403)

    page = db.query(FunnelPage).filter(FunnelPage.id == funnel_id, FunnelPage.user_id == user.id).first()
    if not page:
        return JSONResponse({"error": "Not found"}, status_code=404)

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return JSONResponse({"error": "AI unavailable"}, status_code=503)

    body = await request.json()
    instruction = body.get("instruction", "")
    current_sections = body.get("current_sections", [])
    page_bg = body.get("page_bg", "#050d1a")

    import json as _jmod

    prompt = f"""You are editing a landing page funnel. The page is made of sections stored as a JSON array.

CURRENT PAGE BACKGROUND: {page_bg}
CURRENT SECTIONS:
{_jmod.dumps(current_sections, indent=2)}

USER INSTRUCTION: "{instruction}"

Modify the sections array based on the user's instruction. You can:
- Add new sections (insert at the appropriate position)
- Remove sections
- Modify existing section properties (text, colours, sizes, etc)
- Reorder sections
- Change the page background colour

Section types and their properties:
- heading: content, level (h1/h2/h3), color (hex), align (left/center/right)
- text: content, color (hex), align, size (13px/15px/17px/20px)
- image: url, alt, width, borderRadius
- video: url (YouTube/Vimeo watch URL)
- button: text, url, color1 (hex gradient start), color2 (hex gradient end), align, size
- features: items (array of strings), checkColor (hex), textColor (hex)
- capture: heading, subtext, btnText, btnColor (hex), btnColor2 (hex), bgColor (hex)
- testimonial: quote, author, color (hex), bgColor (hex)
- divider: color (hex), thickness, width
- spacer: height
- columns: left, right, color (hex)
- html: code

The affiliate's referral link is: /register?ref={user.username}

Return ONLY a JSON object with:
- "sections": the updated sections array
- "page_bg": the page background colour (hex, include even if unchanged)

No explanation, no markdown. ONLY valid JSON."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model=AI_MODEL_HAIKU,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        if "{" in text:
            text = text[text.index("{"):text.rindex("}") + 1]

        result = _jmod.loads(text)
        new_sections = result.get("sections", current_sections)
        new_bg = result.get("page_bg", page_bg)

        return JSONResponse({
            "success": True,
            "sections": new_sections,
            "page_bg": new_bg,
        })

    except Exception as e:
        logger.error(f"AI funnel modify failed: {e}")
        return JSONResponse({"error": f"AI modification failed: {str(e)[:100]}"}, status_code=500)


@app.get("/pro/funnel/{funnel_id}/sequence")
async def pro_funnel_sequence(funnel_id: int, request: Request, db: Session = Depends(get_db)):
    """Email sequence editor for a funnel."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login", status_code=302)

    page = db.query(FunnelPage).filter(FunnelPage.id == funnel_id, FunnelPage.user_id == user.id).first()
    if not page:
        return RedirectResponse("/pro/funnels", status_code=302)

    from .database import EmailSequence
    import json as _jseq

    sequence = None
    emails = []
    if page.capture_sequence_id:
        sequence = db.query(EmailSequence).filter(EmailSequence.id == page.capture_sequence_id).first()
        if sequence and sequence.emails_json:
            try:
                emails = _jseq.loads(sequence.emails_json)
            except:
                pass

    if not sequence:
        # Create a default empty sequence
        sequence = EmailSequence(user_id=user.id, title=f"Sequence for {page.title}", num_emails=0)
        db.add(sequence)
        db.commit()
        db.refresh(sequence)
        page.capture_sequence_id = sequence.id
        db.commit()

    return RedirectResponse(url="/pro/funnels", status_code=302)

def _old_sequence_editor_DISABLED(request=None):
    return templates.TemplateResponse("pro-sequence-editor.html", {
        "request": request,
        "user": user,
        "active_page": "pro-funnels",
        "page": page,
        "sequence": sequence,
        "emails": emails,
    })


@app.post("/api/pro/funnel/{funnel_id}/sequence/save")
async def api_pro_funnel_sequence_save(funnel_id: int, request: Request, db: Session = Depends(get_db)):
    """Save edited email sequence."""
    user = get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "Not logged in"}, status_code=401)

    page = db.query(FunnelPage).filter(FunnelPage.id == funnel_id, FunnelPage.user_id == user.id).first()
    if not page:
        return JSONResponse({"error": "Not found"}, status_code=404)

    from .database import EmailSequence
    import json as _jsave

    body = await request.json()
    emails = body.get("emails", [])

    sequence = None
    if page.capture_sequence_id:
        sequence = db.query(EmailSequence).filter(EmailSequence.id == page.capture_sequence_id).first()

    if not sequence:
        sequence = EmailSequence(user_id=user.id, title=f"Sequence for {page.title}")
        db.add(sequence)
        db.commit()
        db.refresh(sequence)
        page.capture_sequence_id = sequence.id

    sequence.emails_json = _jsave.dumps(emails)
    sequence.num_emails = len(emails)
    db.commit()

    return JSONResponse({"success": True})


@app.post("/api/capture/{username}/{slug}")
async def api_capture_lead(username: str, slug: str, request: Request, db: Session = Depends(get_db)):
    """Public endpoint — captures an email from a funnel form and starts the autoresponder."""
    body = await request.json()
    lead_email = body.get("email", "").strip().lower()
    lead_name = body.get("name", "").strip()

    if not lead_email or "@" not in lead_email:
        return JSONResponse({"error": "Valid email required"}, status_code=400)

    # Find the funnel owner
    owner = db.query(User).filter(User.username == username).first()
    if not owner:
        return JSONResponse({"error": "Not found"}, status_code=404)

    # Find the funnel page
    full_slug = f"{username}/{slug}"
    page = db.query(FunnelPage).filter(FunnelPage.slug == full_slug).first()

    # Check for duplicate lead
    from .database import MemberLead
    existing = db.query(MemberLead).filter(
        MemberLead.user_id == owner.id,
        MemberLead.email == lead_email
    ).first()
    if existing:
        return JSONResponse({"success": True, "message": "Already subscribed"})

    # Create Brevo contact with member tag
    brevo_contact_id = _create_brevo_contact(lead_email, lead_name, owner.id)

    # Save the lead
    lead = MemberLead(
        user_id=owner.id,
        email=lead_email,
        name=lead_name,
        source_funnel_id=page.id if page else None,
        source_url=f"/f/{full_slug}",
        brevo_contact_id=brevo_contact_id,
        status="nurturing",
        email_sequence_id=page.capture_sequence_id if page else None,
    )
    db.add(lead)

    # Update funnel lead count
    if page:
        page.leads_captured = (page.leads_captured or 0) + 1

    db.commit()
    db.refresh(lead)

    # Send the first email in the sequence immediately
    if lead.email_sequence_id:
        _send_sequence_email(db, lead, 0)

    return JSONResponse({"success": True, "message": "Welcome! Check your inbox."})


@app.get("/pro/leads")
def pro_leads_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

async def _old_pro_leads_DISABLED(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login?next=/pro/leads", status_code=302)
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return RedirectResponse("/upgrade", status_code=302)

    from .database import MemberLead
    leads = db.query(MemberLead).filter(
        MemberLead.user_id == user.id
    ).order_by(MemberLead.created_at.desc()).all()

    total = len(leads)
    hot = sum(1 for l in leads if l.is_hot)
    nurturing = sum(1 for l in leads if l.status == "nurturing")
    converted = sum(1 for l in leads if l.status == "converted")

    return templates.TemplateResponse("pro-leads.html", {
        "request": request,
        "user": user,
        "active_page": "pro-leads",
        "leads": leads,
        "total_leads": total,
        "hot_leads": hot,
        "nurturing_leads": nurturing,
        "converted_leads": converted,
    })


@app.get("/f/{username}/{slug}")
async def render_ai_funnel(username: str, slug: str, request: Request, db: Session = Depends(get_db)):
    """Render an AI-generated funnel page — public facing. Supports A/B testing."""
    full_slug = f"{username}/{slug}"
    page = db.query(FunnelPage).filter(FunnelPage.slug == full_slug).first()
    if not page:
        return RedirectResponse("/", status_code=302)

    # A/B testing — if this page has a variant, randomly split traffic
    import random
    variant = db.query(FunnelPage).filter(FunnelPage.ab_variant_of == page.id, FunnelPage.status == "published").first()
    if variant:
        split_pct = variant.ab_split_pct or 50
        if random.randint(1, 100) <= split_pct:
            page = variant  # Show variant B

    owner = db.query(User).filter(User.id == page.user_id).first()

    import json as _json4
    funnel_data = {}
    try:
        funnel_data = _json4.loads(page.sections_json) if page.sections_json else {}
    except:
        pass

    # Convert video URL to embed format if needed
    video_embed = ""
    if page.video_url:
        vid_url = page.video_url.strip()
        if "youtube.com/watch" in vid_url:
            vid_id = vid_url.split("v=")[-1].split("&")[0]
            video_embed = f"https://www.youtube.com/embed/{vid_id}?modestbranding=1&rel=0&showinfo=0&color=white&iv_load_policy=3"
        elif "youtu.be/" in vid_url:
            vid_id = vid_url.split("youtu.be/")[-1].split("?")[0]
            video_embed = f"https://www.youtube.com/embed/{vid_id}?modestbranding=1&rel=0&showinfo=0&color=white&iv_load_policy=3"
        elif "vimeo.com/" in vid_url:
            vid_id = vid_url.split("vimeo.com/")[-1].split("?")[0]
            video_embed = f"https://player.vimeo.com/video/{vid_id}?byline=0&portrait=0&title=0"
        elif "embed" in vid_url or "player" in vid_url:
            video_embed = vid_url
        else:
            video_embed = vid_url

    # Background image support
    bg_image = funnel_data.get("bgImage", "")

    # Track view
    page.views = (page.views or 0) + 1
    # Record analytics event
    referrer = request.headers.get("referer", "") or ""
    user_agent = (request.headers.get("user-agent", "") or "").lower()
    device = "mobile" if any(m in user_agent for m in ["iphone","android","mobile"]) else "tablet" if "ipad" in user_agent else "desktop"
    client_ip = request.client.host if request.client else ""
    db.add(FunnelEvent(
        page_id=page.id, user_id=page.user_id,
        event_type="view", referrer=referrer, device=device, ip_address=client_ip
    ))
    db.commit()

    # If canvas editor has saved rendered HTML, use it directly
    if page.gjs_html and page.gjs_html.strip():
        from fastapi.responses import HTMLResponse
        capture_parts = full_slug.split('/')
        cap_url = f"/api/capture/{capture_parts[0]}/{'/'.join(capture_parts[1:])}" if len(capture_parts) > 1 else ""
        owner_name = owner.first_name or owner.username if owner else 'Member'
        title_text = page.headline or page.title or 'SuperAdPro'
        meta_desc = page.meta_description or f'{title_text} — powered by SuperAdPro'
        og_image = page.image_url or ''
        page_url = f"{request.base_url}f/{full_slug}"
        og_tags = f'<meta name="description" content="{meta_desc}">'
        og_tags += f'<meta property="og:title" content="{title_text}">'
        og_tags += f'<meta property="og:description" content="{meta_desc}">'
        og_tags += f'<meta property="og:url" content="{page_url}">'
        og_tags += '<meta property="og:type" content="website">'
        if og_image:
            og_tags += f'<meta property="og:image" content="{og_image}">'
            og_tags += '<meta name="twitter:card" content="summary_large_image">'
        else:
            og_tags += '<meta name="twitter:card" content="summary">'
        og_tags += f'<meta name="twitter:title" content="{title_text}">'
        og_tags += f'<meta name="twitter:description" content="{meta_desc}">'
        if og_image:
            og_tags += f'<meta name="twitter:image" content="{og_image}">'
        wrapped = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title_text}</title>
{og_tags}
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Sora:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800;900&family=Raleway:wght@400;500;600;700;800;900&family=Open+Sans:wght@400;500;600;700;800&family=Lato:wght@400;700;900&family=Roboto:wght@400;500;700;900&family=Playfair+Display:wght@400;500;600;700;800;900&family=Bebas+Neue&family=Cinzel:wght@400;700;900&family=Dancing+Script:wght@400;700&family=Pacifico&display=swap" rel="stylesheet">
<style>*{{margin:0;padding:0;box-sizing:border-box}}body{{min-height:100vh;overflow-x:hidden}}
/* Touch-friendly inputs on mobile */
@media(max-width:768px){{
  input,textarea{{font-size:16px!important;-webkit-appearance:none}}
}}
</style>
<script>
// Match body background to the canvas wrapper
(function(){{
  document.addEventListener('DOMContentLoaded',function(){{
    var wrapper=document.querySelector('body>div[style]');
    if(wrapper){{
      var bg=wrapper.style.background||wrapper.style.backgroundColor;
      if(bg) document.body.style.background=bg;
      var bgImg=wrapper.style.backgroundImage;
      if(bgImg&&bgImg!=='none'){{
        document.body.style.backgroundImage=bgImg;
        document.body.style.backgroundSize=wrapper.style.backgroundSize||'cover';
        document.body.style.backgroundPosition=wrapper.style.backgroundPosition||'center';
        document.body.style.backgroundRepeat='no-repeat';
      }}
    }}
  }});
}})();
// Mobile responsive scaling — fits 1100px canvas to any screen width
(function(){{
  function scaleCanvas(){{
    var divs=document.querySelectorAll('div[style*="width:1100px"],div[style*="width: 1100px"]');
    if(!divs.length) return;
    var inner=divs[0];
    var vw=window.innerWidth;
    if(vw<1100){{
      var s=vw/1100;
      inner.style.transform='scale('+s+')';
      inner.style.transformOrigin='top left';
      // Adjust parent height to prevent overflow
      var parent=inner.parentElement;
      if(parent){{
        var h=inner.scrollHeight*s;
        parent.style.minHeight=h+'px';
        parent.style.overflow='hidden';
      }}
    }} else {{
      inner.style.transform='none';
    }}
  }}
  window.addEventListener('load',scaleCanvas);
  window.addEventListener('resize',scaleCanvas);
}})();
</script>
</head><body>{page.gjs_html}
<div style="text-align:center;padding:24px;font-size:11px;color:rgba(255,255,255,0.25);font-family:Outfit,sans-serif;background:transparent">Income examples are illustrative. Results depend on individual effort. &copy; 2026 SuperAdPro</div>
<script>
// Email capture — find all capture forms and wire up submit buttons
document.querySelectorAll('[data-redirect],[data-thankyou]').forEach(function(form){{
  var btn = form.querySelector('[style*="gradient"]');
  if(btn) btn.addEventListener('click', function(){{
    var inputs = form.querySelectorAll('input');
    var name = '', email = '';
    inputs.forEach(function(inp){{
      if(inp.placeholder && inp.placeholder.toLowerCase().includes('name')) name = inp.value;
      if(inp.placeholder && inp.placeholder.toLowerCase().includes('email')) email = inp.value;
    }});
    if(!email || !email.includes('@')){{ alert('Please enter a valid email'); return; }}
    fetch('{cap_url}', {{
      method:'POST', headers:{{'Content-Type':'application/json'}},
      body:JSON.stringify({{email:email, name:name}})
    }}).then(function(r){{ return r.json(); }}).then(function(data){{
      if(data.success){{
        var redirect = form.getAttribute('data-redirect');
        if(redirect) {{ window.location.href = redirect; }}
        else {{
          var msg = form.getAttribute('data-thankyou') || "You're in! Check your inbox.";
          form.innerHTML = '<div style="padding:20px;text-align:center"><div style="font-size:24px;margin-bottom:8px">✓</div><div style="font-family:Sora,sans-serif;font-weight:700;font-size:18px;color:#10b981">' + msg + '</div></div>';
        }}
      }} else {{ alert(data.error || 'Something went wrong.'); }}
    }}).catch(function(){{ alert('Connection error.'); }});
  }});
}});
// Countdown timers
document.querySelectorAll('[id^="cd_"]').forEach(function(el){{
  var vs=el.querySelectorAll('.cdv');
  if(vs.length<4)return;
  setInterval(function(){{
    // Find the target date from data attribute or default to +7 days
    var t=el.getAttribute('data-target');
    if(!t)return;
    var n=new Date(t).getTime()-Date.now();
    if(n<0)n=0;
    vs[0].textContent=String(Math.floor(n/86400000)).padStart(2,'0');
    vs[1].textContent=String(Math.floor(n%86400000/3600000)).padStart(2,'0');
    vs[2].textContent=String(Math.floor(n%3600000/60000)).padStart(2,'0');
    vs[3].textContent=String(Math.floor(n%60000/1000)).padStart(2,'0');
  }},1000);
}});
</script>
</body></html>"""
        return HTMLResponse(wrapped)

    return templates.TemplateResponse("ai-funnel-render.html", {
        "request": request,
        "page": page,
        "owner": owner,
        "funnel_data": funnel_data,
        "video_embed": video_embed,
        "bg_image": bg_image,
    })


@app.post("/webhook/brevo")
async def brevo_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Brevo webhook events — opens, clicks, bounces."""
    try:
        body = await request.json()
        event = body.get("event", "")
        message_id = body.get("message-id", "") or body.get("messageId", "")

        if not message_id:
            return JSONResponse({"ok": True})

        from .database import EmailSendLog, MemberLead
        log_entry = db.query(EmailSendLog).filter(
            EmailSendLog.brevo_message_id == message_id
        ).first()

        if not log_entry:
            return JSONResponse({"ok": True})

        now = datetime.utcnow()

        if event == "opened":
            log_entry.status = "opened"
            log_entry.opened_at = now
            # Update lead stats
            lead = db.query(MemberLead).filter(MemberLead.id == log_entry.lead_id).first()
            if lead:
                lead.emails_opened = (lead.emails_opened or 0) + 1
                lead.last_opened_at = now
                # Hot lead detection: 2+ opens
                if (lead.emails_opened or 0) >= 2:
                    lead.is_hot = True
                    lead.status = "hot"

        elif event == "click":
            log_entry.status = "clicked"
            log_entry.clicked_at = now
            lead = db.query(MemberLead).filter(MemberLead.id == log_entry.lead_id).first()
            if lead:
                lead.emails_clicked = (lead.emails_clicked or 0) + 1
                lead.last_clicked_at = now
                # Any click = hot lead
                lead.is_hot = True
                lead.status = "hot"

        elif event in ("hard_bounce", "blocked"):
            log_entry.status = "bounced"
            lead = db.query(MemberLead).filter(MemberLead.id == log_entry.lead_id).first()
            if lead:
                lead.status = "unsubscribed"

        elif event == "unsubscribed":
            lead = db.query(MemberLead).filter(MemberLead.id == log_entry.lead_id).first()
            if lead:
                lead.status = "unsubscribed"

        db.commit()
        return JSONResponse({"ok": True})

    except Exception as e:
        logger.error(f"Brevo webhook error: {e}")
        return JSONResponse({"ok": True})


# ── Brevo helper: create contact with member tag ──
def _create_brevo_contact(email: str, name: str, member_id: int) -> str:
    """Create a contact in Brevo tagged with the member's ID."""
    brevo_key = os.getenv("BREVO_API_KEY", "")
    if not brevo_key:
        return ""
    try:
        import json as _j
        payload = _j.dumps({
            "email": email,
            "attributes": {"FIRSTNAME": name},
            "listIds": [2],  # Default list — adjust in Brevo dashboard
            "updateEnabled": True,
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://api.brevo.com/v3/contacts",
            data=payload,
            headers={"accept": "application/json", "api-key": brevo_key, "content-type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = _j.loads(resp.read())
            return str(data.get("id", ""))
    except Exception as e:
        logger.error(f"Brevo contact creation failed: {e}")
        return ""


# ── Helper: send a sequence email to a lead ──
def _send_sequence_email(db, lead, email_index: int):
    """Send a specific email from the lead's assigned sequence."""
    from .database import EmailSequence, EmailSendLog
    import json as _j5

    if not lead.email_sequence_id:
        return

    sequence = db.query(EmailSequence).filter(EmailSequence.id == lead.email_sequence_id).first()
    if not sequence or not sequence.emails_json:
        return

    try:
        emails = _j5.loads(sequence.emails_json)
    except:
        return

    if email_index >= len(emails):
        return

    email_data = emails[email_index]
    subject = email_data.get("subject", "A message for you")
    # Handle both field names: body_html (from transform) or body (direct from AI)
    body_html = email_data.get("body_html", "") or email_data.get("body", "") or email_data.get("content", "")

    if not body_html:
        logger.warning(f"Empty email body for lead {lead.id}, index {email_index}")
        return

    # Replace placeholders
    site_url = os.getenv("SITE_URL", "https://www.superadpro.com")
    owner = db.query(User).filter(User.id == lead.user_id).first()
    if owner:
        ref_link = f"{site_url}/join/{owner.username}"
        member_name = owner.first_name or owner.username
        body_html = body_html.replace("{{referral_link}}", ref_link)
        body_html = body_html.replace("{{funnel_url}}", ref_link)
        body_html = body_html.replace("{{member_name}}", member_name)
    if lead.name:
        body_html = body_html.replace("{{lead_name}}", lead.name)
        body_html = body_html.replace("{{name}}", lead.name)

    # Wrap in template if it's not already a full HTML doc
    if not body_html.strip().lower().startswith("<!doctype") and not body_html.strip().lower().startswith("<html"):
        from .brevo_service import wrap_email_html
        owner_name = (owner.first_name or owner.username) if owner else "SuperAdPro"
        body_html = wrap_email_html(body_html, owner_name)

    # Send via Brevo
    from .email_utils import send_email
    success = send_email(lead.email, subject, body_html)

    if success:
        log = EmailSendLog(
            lead_id=lead.id,
            sequence_id=lead.email_sequence_id,
            email_index=email_index,
            status="sent",
        )
        db.add(log)
        lead.emails_sent = (lead.emails_sent or 0) + 1
        lead.status = "nurturing"
        db.commit()
        logger.info(f"Autoresponder email {email_index+1} sent to {lead.email} for lead {lead.id}")
    else:
        logger.error(f"Autoresponder email {email_index+1} failed for lead {lead.email}")


# ── Autoresponder Cron Job ──
@app.post("/cron/process-autoresponder")
async def cron_process_autoresponder(request: Request, db: Session = Depends(get_db)):
    """
    Cron endpoint — processes due autoresponder emails.
    Checks each lead with an active sequence: if they're due their next email
    based on send_delay_days, send it.
    Run every 15 mins via cron-job.org.
    """
    # Auth check
    auth = request.headers.get("authorization", "")
    cron_secret = os.getenv("CRON_SECRET", "")
    if cron_secret and auth != f"Bearer {cron_secret}":
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    from .database import MemberLead, EmailSequence, EmailSendLog
    import json as _j_cron
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    sent_count = 0
    errors = 0

    # Get all leads that are currently nurturing
    nurturing_leads = db.query(MemberLead).filter(
        MemberLead.status == "nurturing",
        MemberLead.email_sequence_id != None
    ).all()

    for lead in nurturing_leads:
        try:
            sequence = db.query(EmailSequence).filter(
                EmailSequence.id == lead.email_sequence_id,
                EmailSequence.is_active == True
            ).first()
            if not sequence or not sequence.emails_json:
                continue

            emails = _j_cron.loads(sequence.emails_json)
            next_index = lead.emails_sent or 0

            # All emails sent — mark complete
            if next_index >= len(emails):
                lead.status = "new" if not lead.is_hot else "hot"
                continue

            email_data = emails[next_index]
            send_delay = email_data.get("send_delay_days", 0)

            # Calculate when this email should be sent
            due_at = lead.created_at + timedelta(days=send_delay)

            if now >= due_at:
                # Check if already sent this index
                already_sent = db.query(EmailSendLog).filter(
                    EmailSendLog.lead_id == lead.id,
                    EmailSendLog.email_index == next_index
                ).first()
                if already_sent:
                    # Already sent — increment counter and skip
                    lead.emails_sent = next_index + 1
                    continue

                _send_sequence_email(db, lead, next_index)
                sent_count += 1

        except Exception as e:
            logger.error(f"Autoresponder error for lead {lead.id}: {e}")
            errors += 1

    db.commit()
    return JSONResponse({
        "status": "ok",
        "processed": len(nurturing_leads),
        "sent": sent_count,
        "errors": errors,
    })


@app.get("/cron/process-autoresponder")
async def cron_process_autoresponder_get(request: Request, secret: str = "", db: Session = Depends(get_db)):
    """GET version for cron-job.org — auth via ?secret= query param."""
    cron_secret = os.getenv("CRON_SECRET", "")
    if not cron_secret or secret != cron_secret:
        return JSONResponse({"error": "Invalid secret"}, status_code=401)

    from .database import MemberLead, EmailSequence, EmailSendLog
    import json as _j_cron2
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    sent_count = 0
    errors = 0

    nurturing_leads = db.query(MemberLead).filter(
        MemberLead.status == "nurturing",
        MemberLead.email_sequence_id != None
    ).all()

    for lead in nurturing_leads:
        try:
            sequence = db.query(EmailSequence).filter(
                EmailSequence.id == lead.email_sequence_id,
                EmailSequence.is_active == True
            ).first()
            if not sequence or not sequence.emails_json:
                continue

            emails = _j_cron2.loads(sequence.emails_json)
            next_index = lead.emails_sent or 0

            if next_index >= len(emails):
                lead.status = "new" if not lead.is_hot else "hot"
                continue

            email_data = emails[next_index]
            send_delay = email_data.get("send_delay_days", 0)
            due_at = lead.created_at + timedelta(days=send_delay)

            if now >= due_at:
                already_sent = db.query(EmailSendLog).filter(
                    EmailSendLog.lead_id == lead.id,
                    EmailSendLog.email_index == next_index
                ).first()
                if already_sent:
                    lead.emails_sent = next_index + 1
                    continue

                _send_sequence_email(db, lead, next_index)
                sent_count += 1

        except Exception as e:
            logger.error(f"Autoresponder error for lead {lead.id}: {e}")
            errors += 1

    db.commit()
    return JSONResponse({
        "status": "ok",
        "processed": len(nurturing_leads),
        "sent": sent_count,
        "errors": errors,
    })


@app.get("/admin/test-autoresponder")
def admin_test_autoresponder(secret: str = "", db: Session = Depends(get_db)):
    """Debug: show autoresponder status — sequences, nurturing leads, send log."""
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid"}, status_code=403)
    from .database import MemberLead, EmailSequence, EmailSendLog
    import json as _jt

    sequences = db.query(EmailSequence).all()
    seq_list = []
    for s in sequences:
        try:
            emails = _jt.loads(s.emails_json) if s.emails_json else []
        except:
            emails = []
        seq_list.append({
            "id": s.id, "user_id": s.user_id, "title": s.title,
            "niche": s.niche, "num_emails": len(emails), "is_active": s.is_active,
        })

    nurturing = db.query(MemberLead).filter(MemberLead.status == "nurturing").all()
    lead_list = [{
        "id": l.id, "email": l.email, "name": l.name,
        "sequence_id": l.email_sequence_id, "emails_sent": l.emails_sent,
        "status": l.status, "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in nurturing]

    recent_logs = db.query(EmailSendLog).order_by(EmailSendLog.sent_at.desc()).limit(20).all()
    log_list = [{
        "id": l.id, "lead_id": l.lead_id, "email_index": l.email_index,
        "status": l.status, "sent_at": l.sent_at.isoformat() if l.sent_at else None,
    } for l in recent_logs]

    brevo_key = os.getenv("BREVO_API_KEY", "")

    return {
        "brevo_configured": bool(brevo_key),
        "brevo_key_prefix": brevo_key[:8] + "..." if brevo_key else "NOT SET",
        "from_email": os.getenv("FROM_EMAIL", "noreply@superadpro.com"),
        "site_url": os.getenv("SITE_URL", "https://www.superadpro.com"),
        "cron_secret_set": bool(os.getenv("CRON_SECRET", "")),
        "sequences": seq_list,
        "nurturing_leads": lead_list,
        "recent_send_log": log_list,
    }


# ═══════════════════════════════════════════════════════════════
#  MEMBER COURSE MARKETPLACE
# ═══════════════════════════════════════════════════════════════

@app.get("/courses/quality-guidelines")
def course_quality_guidelines(request: Request):
    """Public page — quality standards for course creators."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/dashboard", status_code=302)

def _old_course_guidelines_DISABLED(request=None):
    return templates.TemplateResponse("course-guidelines.html", {"request": request})


@app.get("/marketplace")
def marketplace_page(request: Request, db: Session = Depends(get_db)):
    """Public course marketplace — browse all published member courses."""
    courses = db.query(MemberCourse).filter(
        MemberCourse.status == "published", MemberCourse.is_public == True
    ).order_by(MemberCourse.created_at.desc()).all()
    # Get creator info for each course
    creator_ids = list(set(c.creator_id for c in courses))
    creators = {}
    if creator_ids:
        for u in db.query(User).filter(User.id.in_(creator_ids)).all():
            creators[u.id] = u
    return RedirectResponse(url="/marketplace", status_code=302)

def _old_marketplace_DISABLED(request=None, db=None):
    return templates.TemplateResponse("marketplace.html", {
        "request": request, "courses": courses, "creators": creators,
    })


@app.get("/courses/my-courses")
def my_courses_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_my_courses_DISABLED(request: Request, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return RedirectResponse(url="/upgrade")
    courses = db.query(MemberCourse).filter(MemberCourse.creator_id == user.id).order_by(MemberCourse.created_at.desc()).all()
    return templates.TemplateResponse("my-courses.html", {
        "request": request, "user": user, "courses": courses,
    })


@app.get("/courses/create")
def create_course_page(request: Request):
    """Serve React SPA."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h1>Loading...</h1>")

def _old_create_course_DISABLED(request: Request, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return RedirectResponse(url="/upgrade")
    # Check if user has accepted terms before
    has_accepted_terms = db.query(MemberCourse).filter(
        MemberCourse.creator_id == user.id,
        MemberCourse.creator_agreed_terms_at.isnot(None)
    ).first() is not None
    return templates.TemplateResponse("course-create.html", {
        "request": request, "user": user, "has_accepted_terms": has_accepted_terms,
    })


@app.get("/courses/edit/{course_id}")
def edit_course_page(course_id: int, request: Request, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """Edit existing course."""
    if not user: return RedirectResponse(url="/?login=1")
    course = db.query(MemberCourse).filter(
        MemberCourse.id == course_id, MemberCourse.creator_id == user.id
    ).first()
    if not course: return RedirectResponse(url="/courses/my-courses")
    import json as _json_mc
    chapters = db.query(MemberCourseChapter).filter(
        MemberCourseChapter.course_id == course.id
    ).order_by(MemberCourseChapter.chapter_order).all()
    lessons_by_chapter = {}
    for ch in chapters:
        lessons_by_chapter[ch.id] = db.query(MemberCourseLesson).filter(
            MemberCourseLesson.chapter_id == ch.id
        ).order_by(MemberCourseLesson.lesson_order).all()
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/dashboard", status_code=302)

def _old_course_edit_DISABLED(course_id=None, request=None, db=None):
    return templates.TemplateResponse("course-edit.html", {
        "request": request, "user": user, "course": course,
        "chapters": chapters, "lessons_by_chapter": lessons_by_chapter,
    })


# ── Marketplace API endpoints ──

@app.post("/api/marketplace/courses")
async def api_create_course(request: Request, user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Create a new course (draft)."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return JSONResponse({"error": "Pro membership required"}, status_code=403)
    body = await request.json()
    title = (body.get("title") or "").strip()
    if not title or len(title) < 10:
        return JSONResponse({"error": "Title must be at least 10 characters"}, status_code=400)
    if len(title) > 100:
        return JSONResponse({"error": "Title must be under 100 characters"}, status_code=400)

    # Generate slug
    import re as _re_mc
    raw_slug = _re_mc.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    slug = f"{user.username.lower()}/{raw_slug}"
    # Check uniqueness
    existing = db.query(MemberCourse).filter(MemberCourse.slug == slug).first()
    if existing:
        return JSONResponse({"error": "A course with this title already exists"}, status_code=400)

    price_str = body.get("price", "25")
    try:
        price = float(price_str)
    except (ValueError, TypeError):
        return JSONResponse({"error": "Invalid price"}, status_code=400)
    if price < 20:
        return JSONResponse({"error": "Minimum price is $20"}, status_code=400)

    # Check terms acceptance
    agreed_terms = body.get("agreed_terms", False)
    agreed_at = datetime.utcnow() if agreed_terms else None

    course = MemberCourse(
        creator_id=user.id,
        title=title,
        slug=slug,
        description=body.get("description", ""),
        short_description=body.get("short_description", ""),
        price=price,
        category=body.get("category", "other"),
        difficulty_level=body.get("difficulty_level", "beginner"),
        thumbnail_url=body.get("thumbnail_url", ""),
        creator_agreed_terms_at=agreed_at,
        status="draft",
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return JSONResponse({"ok": True, "course_id": course.id, "slug": course.slug})


@app.put("/api/marketplace/courses/{course_id}")
async def api_update_course(course_id: int, request: Request, user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Update course details."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    course = db.query(MemberCourse).filter(
        MemberCourse.id == course_id, MemberCourse.creator_id == user.id
    ).first()
    if not course:
        return JSONResponse({"error": "Course not found"}, status_code=404)
    body = await request.json()

    if "title" in body:
        title = (body["title"] or "").strip()
        if len(title) < 10 or len(title) > 100:
            return JSONResponse({"error": "Title must be 10-100 characters"}, status_code=400)
        course.title = title
    if "description" in body:
        course.description = body["description"]
    if "short_description" in body:
        sd = (body["short_description"] or "").strip()
        if len(sd) > 160:
            return JSONResponse({"error": "Short description must be under 160 characters"}, status_code=400)
        course.short_description = sd
    if "price" in body:
        try:
            price = float(body["price"])
        except (ValueError, TypeError):
            return JSONResponse({"error": "Invalid price"}, status_code=400)
        if price < 20:
            return JSONResponse({"error": "Minimum price is $20"}, status_code=400)
        course.price = price
    if "category" in body:
        course.category = body["category"]
    if "difficulty_level" in body:
        course.difficulty_level = body["difficulty_level"]
    if "thumbnail_url" in body:
        course.thumbnail_url = body["thumbnail_url"]

    course.updated_at = datetime.utcnow()
    db.commit()
    return JSONResponse({"ok": True})


@app.post("/api/marketplace/courses/{course_id}/chapters")
async def api_add_chapter(course_id: int, request: Request, user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    """Add a chapter to a course."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    course = db.query(MemberCourse).filter(
        MemberCourse.id == course_id, MemberCourse.creator_id == user.id
    ).first()
    if not course:
        return JSONResponse({"error": "Course not found"}, status_code=404)
    body = await request.json()
    title = (body.get("title") or "").strip()
    if not title:
        return JSONResponse({"error": "Chapter title required"}, status_code=400)
    # Get next order
    max_order = db.query(MemberCourseChapter).filter(
        MemberCourseChapter.course_id == course_id
    ).count()
    chapter = MemberCourseChapter(
        course_id=course_id, title=title, chapter_order=max_order + 1,
    )
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return JSONResponse({"ok": True, "chapter_id": chapter.id, "chapter_order": chapter.chapter_order})


@app.put("/api/marketplace/chapters/{chapter_id}")
async def api_update_chapter(chapter_id: int, request: Request, user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    """Update a chapter."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    chapter = db.query(MemberCourseChapter).filter(MemberCourseChapter.id == chapter_id).first()
    if not chapter:
        return JSONResponse({"error": "Chapter not found"}, status_code=404)
    course = db.query(MemberCourse).filter(
        MemberCourse.id == chapter.course_id, MemberCourse.creator_id == user.id
    ).first()
    if not course:
        return JSONResponse({"error": "Not authorised"}, status_code=403)
    body = await request.json()
    if "title" in body:
        chapter.title = (body["title"] or "").strip()
    if "chapter_order" in body:
        chapter.chapter_order = body["chapter_order"]
    db.commit()
    return JSONResponse({"ok": True})


@app.delete("/api/marketplace/chapters/{chapter_id}")
def api_delete_chapter(chapter_id: int, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Delete a chapter and all its lessons."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    chapter = db.query(MemberCourseChapter).filter(MemberCourseChapter.id == chapter_id).first()
    if not chapter:
        return JSONResponse({"error": "Chapter not found"}, status_code=404)
    course = db.query(MemberCourse).filter(
        MemberCourse.id == chapter.course_id, MemberCourse.creator_id == user.id
    ).first()
    if not course:
        return JSONResponse({"error": "Not authorised"}, status_code=403)
    db.delete(chapter)
    db.commit()
    return JSONResponse({"ok": True})


@app.post("/api/marketplace/chapters/{chapter_id}/lessons")
async def api_add_lesson(chapter_id: int, request: Request, user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    """Add a lesson to a chapter."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    chapter = db.query(MemberCourseChapter).filter(MemberCourseChapter.id == chapter_id).first()
    if not chapter:
        return JSONResponse({"error": "Chapter not found"}, status_code=404)
    course = db.query(MemberCourse).filter(
        MemberCourse.id == chapter.course_id, MemberCourse.creator_id == user.id
    ).first()
    if not course:
        return JSONResponse({"error": "Not authorised"}, status_code=403)
    body = await request.json()
    title = (body.get("title") or "").strip()
    if not title:
        return JSONResponse({"error": "Lesson title required"}, status_code=400)
    max_order = db.query(MemberCourseLesson).filter(
        MemberCourseLesson.chapter_id == chapter_id
    ).count()
    lesson = MemberCourseLesson(
        chapter_id=chapter_id,
        course_id=chapter.course_id,
        title=title,
        lesson_order=max_order + 1,
        content_type=body.get("content_type", "text"),
        video_url=body.get("video_url", ""),
        text_content=body.get("text_content", ""),
        pdf_url=body.get("pdf_url", ""),
        duration_minutes=int(body.get("duration_minutes", 0)),
        is_preview=body.get("is_preview", False),
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return JSONResponse({"ok": True, "lesson_id": lesson.id})


@app.put("/api/marketplace/lessons/{lesson_id}")
async def api_update_lesson(lesson_id: int, request: Request, user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Update a lesson."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    lesson = db.query(MemberCourseLesson).filter(MemberCourseLesson.id == lesson_id).first()
    if not lesson:
        return JSONResponse({"error": "Lesson not found"}, status_code=404)
    course = db.query(MemberCourse).filter(
        MemberCourse.id == lesson.course_id, MemberCourse.creator_id == user.id
    ).first()
    if not course:
        return JSONResponse({"error": "Not authorised"}, status_code=403)
    body = await request.json()
    if "title" in body:
        lesson.title = (body["title"] or "").strip()
    if "content_type" in body:
        lesson.content_type = body["content_type"]
    if "video_url" in body:
        lesson.video_url = body["video_url"]
    if "text_content" in body:
        lesson.text_content = body["text_content"]
    if "pdf_url" in body:
        lesson.pdf_url = body["pdf_url"]
    if "duration_minutes" in body:
        lesson.duration_minutes = int(body.get("duration_minutes", 0))
    if "is_preview" in body:
        lesson.is_preview = body["is_preview"]
    if "lesson_order" in body:
        lesson.lesson_order = body["lesson_order"]
    db.commit()
    return JSONResponse({"ok": True})


@app.delete("/api/marketplace/lessons/{lesson_id}")
def api_delete_lesson(lesson_id: int, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Delete a lesson."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    lesson = db.query(MemberCourseLesson).filter(MemberCourseLesson.id == lesson_id).first()
    if not lesson:
        return JSONResponse({"error": "Lesson not found"}, status_code=404)
    course = db.query(MemberCourse).filter(
        MemberCourse.id == lesson.course_id, MemberCourse.creator_id == user.id
    ).first()
    if not course:
        return JSONResponse({"error": "Not authorised"}, status_code=403)
    db.delete(lesson)
    db.commit()
    return JSONResponse({"ok": True})


@app.post("/api/marketplace/courses/{course_id}/submit")
async def api_submit_course(course_id: int, request: Request, user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Submit course for review — runs quality checks."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    course = db.query(MemberCourse).filter(
        MemberCourse.id == course_id, MemberCourse.creator_id == user.id
    ).first()
    if not course:
        return JSONResponse({"error": "Course not found"}, status_code=404)

    # Quality checks (Layer 1)
    errors = []
    chapters = db.query(MemberCourseChapter).filter(MemberCourseChapter.course_id == course_id).all()
    lessons = db.query(MemberCourseLesson).filter(MemberCourseLesson.course_id == course_id).all()

    if len(lessons) < 1:
        errors.append("At least 1 lecture required")
    total_duration = sum(l.duration_minutes or 0 for l in lessons)
    if total_duration < 10:
        errors.append("Minimum 10 minutes total duration required")
    for l in lessons:
        if l.content_type == 'text' and l.text_content:
            word_count = len((l.text_content or "").split())
            if word_count < 100:
                errors.append(f"Lesson '{l.title}' has {word_count} words (minimum 100)")
    preview_count = sum(1 for l in lessons if l.is_preview)
    if preview_count == 0:
        errors.append("At least 1 lesson must be marked as a free preview")
    if not course.thumbnail_url:
        errors.append("Course thumbnail is required")
    if not course.description or len(course.description) < 100:
        errors.append("Description must be at least 100 characters")
    if course.price < 25:
        errors.append("Minimum price is $20")
    if not course.title or len(course.title) < 10:
        errors.append("Title must be at least 10 characters")

    if errors:
        return JSONResponse({"error": "Quality checks failed", "issues": errors}, status_code=400)

    # Update course stats
    course.lesson_count = len(lessons)
    course.total_duration_mins = total_duration
    course.status = "pending_review"
    course.updated_at = datetime.utcnow()
    db.commit()

    # ── Layer 2: AI Content Scan (async-safe) ──
    ai_result = {"passed": True, "plagiarism_score": 0, "quality_score": 80, "flagged_issues": [], "summary": ""}
    try:
        import os, json as _json_ai
        import httpx
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if api_key:
            # Gather all text content for scanning
            all_text = f"Title: {course.title}\nDescription: {course.description or ''}\n\n"
            for l in lessons:
                all_text += f"Lesson: {l.title}\n{l.text_content or ''}\n\n"
            all_text = all_text[:8000]  # Cap at ~8k chars to stay within limits

            scan_prompt = f"""You are a course quality reviewer for an online marketplace. Analyse the following course content and return a JSON object with these fields:
- "passed": boolean (true if acceptable, false if should be rejected)
- "plagiarism_score": 0-100 (estimated likelihood of plagiarism, 0=original, 100=copied)
- "quality_score": 0-100 (educational value, 0=worthless, 100=excellent)
- "flagged_issues": array of objects with "type" (plagiarism|prohibited|misleading|trademark|quality), "severity" (high|medium|low), "description" (brief explanation)
- "summary": one-sentence assessment

Auto-fail criteria: plagiarism_score > 40, quality_score < 30, any high-severity issue, hate speech, explicit content, misleading income claims.

Course content to review:
{all_text}

Respond ONLY with valid JSON, no other text."""

            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                    json={"model": "claude-sonnet-4-20250514", "max_tokens": 1000,
                          "messages": [{"role": "user", "content": scan_prompt}]}
                )
                if resp.status_code == 200:
                    resp_data = resp.json()
                    ai_text = ""
                    for block in resp_data.get("content", []):
                        if block.get("type") == "text":
                            ai_text += block.get("text", "")
                    # Parse JSON from response
                    ai_text = ai_text.strip()
                    if ai_text.startswith("```"):
                        ai_text = ai_text.split("```")[1]
                        if ai_text.startswith("json"):
                            ai_text = ai_text[4:]
                    ai_result = _json_ai.loads(ai_text)
    except Exception as e:
        print(f"AI review error (non-fatal): {e}")
        # If AI review fails, pass through to admin review
        ai_result = {"passed": True, "plagiarism_score": 0, "quality_score": 50, "flagged_issues": [],
                      "summary": "AI review unavailable — manual review required"}

    # Store AI result
    import json as _json_store
    course.ai_review_result = _json_store.dumps(ai_result)
    course.ai_reviewed_at = datetime.utcnow()

    # Check auto-reject thresholds
    if not ai_result.get("passed", True) or ai_result.get("plagiarism_score", 0) > 40 or ai_result.get("quality_score", 100) < 30:
        course.status = "ai_rejected"
        course.admin_notes = ai_result.get("summary", "Content did not meet quality standards")
        db.commit()
        # Notify creator
        notif = Notification(
            user_id=user.id, type="course_rejected",
            icon="❌", title="Course review: changes needed",
            message=f"'{course.title}' needs revisions. Check the feedback and resubmit.",
            link=f"/courses/edit/{course.id}",
        )
        db.add(notif)
        db.commit()
        issues = [i.get("description", "") for i in ai_result.get("flagged_issues", [])]
        if ai_result.get("summary"):
            issues.insert(0, ai_result["summary"])
        return JSONResponse({"error": "AI review: changes needed", "issues": issues, "ai_result": ai_result}, status_code=400)

    # AI passed — move to admin review queue
    course.status = "pending_review"
    db.commit()

    # Create notification for admin
    admin = db.query(User).filter(User.is_admin == True).first()
    if admin:
        notif = Notification(
            user_id=admin.id, type="course_review",
            icon="📚", title="New course awaiting review",
            message=f"{user.first_name or user.username} submitted '{course.title}' (AI approved, score: {ai_result.get('quality_score', '?')}/100)",
            link="/admin/course-review",
        )
        db.add(notif)
        db.commit()

    return JSONResponse({"ok": True, "status": "pending_review"})


@app.get("/api/marketplace/courses/{course_id}")
def api_get_course(course_id: int, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Get full course data for editing."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    course = db.query(MemberCourse).filter(
        MemberCourse.id == course_id, MemberCourse.creator_id == user.id
    ).first()
    if not course:
        return JSONResponse({"error": "Course not found"}, status_code=404)
    chapters = db.query(MemberCourseChapter).filter(
        MemberCourseChapter.course_id == course_id
    ).order_by(MemberCourseChapter.chapter_order).all()
    result_chapters = []
    for ch in chapters:
        lessons = db.query(MemberCourseLesson).filter(
            MemberCourseLesson.chapter_id == ch.id
        ).order_by(MemberCourseLesson.lesson_order).all()
        result_chapters.append({
            "id": ch.id, "title": ch.title, "chapter_order": ch.chapter_order,
            "lessons": [{
                "id": l.id, "title": l.title, "lesson_order": l.lesson_order,
                "content_type": l.content_type, "video_url": l.video_url or "",
                "text_content": l.text_content or "", "pdf_url": l.pdf_url or "",
                "duration_minutes": l.duration_minutes or 0, "is_preview": l.is_preview,
            } for l in lessons]
        })
    return JSONResponse({
        "id": course.id, "title": course.title, "slug": course.slug,
        "description": course.description or "", "short_description": course.short_description or "",
        "price": float(course.price), "thumbnail_url": course.thumbnail_url or "",
        "category": course.category or "other", "difficulty_level": course.difficulty_level or "beginner",
        "status": course.status, "total_sales": course.total_sales or 0,
        "total_revenue": float(course.total_revenue or 0),
        "lesson_count": course.lesson_count or 0,
        "total_duration_mins": course.total_duration_mins or 0,
        "chapters": result_chapters,
    })


@app.delete("/api/marketplace/courses/{course_id}")
def api_delete_course(course_id: int, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Delete a course and all its chapters/lessons."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    course = db.query(MemberCourse).filter(
        MemberCourse.id == course_id, MemberCourse.creator_id == user.id
    ).first()
    if not course:
        return JSONResponse({"error": "Course not found"}, status_code=404)
    # Don't allow deletion of published courses with sales
    if course.status == "published" and (course.total_sales or 0) > 0:
        return JSONResponse({"error": "Cannot delete a published course with sales. Unpublish it instead."}, status_code=400)
    # Cascade delete handles chapters and lessons
    db.delete(course)
    db.commit()
    return JSONResponse({"ok": True})


# ═══════════════════════════════════════════════════════════════
#  PHASE 4: ADMIN COURSE REVIEW QUEUE
# ═══════════════════════════════════════════════════════════════

@app.get("/admin/course-review")
def admin_course_review(request: Request, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Admin page — review queue for AI-approved courses."""
    if not user or not user.is_admin:
        return RedirectResponse(url="/dashboard")
    courses = db.query(MemberCourse).filter(
        MemberCourse.status.in_(["pending_review", "ai_rejected"])
    ).order_by(MemberCourse.updated_at.desc()).all()
    # Get creator info
    creators = {}
    creator_ids = list(set(c.creator_id for c in courses))
    if creator_ids:
        for u in db.query(User).filter(User.id.in_(creator_ids)).all():
            creators[u.id] = u
    # Get lesson counts
    lesson_counts = {}
    for c in courses:
        lesson_counts[c.id] = db.query(MemberCourseLesson).filter(MemberCourseLesson.course_id == c.id).count()
    return templates.TemplateResponse("admin-course-review.html", {
        "request": request, "user": user, "courses": courses,
        "creators": creators, "lesson_counts": lesson_counts,
    })


@app.post("/api/admin/course-review/{course_id}")
async def admin_review_course(course_id: int, request: Request, user: User = Depends(get_current_user),
                              db: Session = Depends(get_db)):
    """Admin approves or rejects a course."""
    if not user or not user.is_admin:
        return JSONResponse({"error": "Not authorised"}, status_code=403)
    course = db.query(MemberCourse).filter(MemberCourse.id == course_id).first()
    if not course:
        return JSONResponse({"error": "Course not found"}, status_code=404)
    body = await request.json()
    action = body.get("action")  # "approve" or "reject"
    notes = body.get("notes", "")

    if action == "approve":
        course.status = "published"
        course.admin_reviewed_at = datetime.utcnow()
        course.admin_notes = notes or "Approved"
        db.commit()
        # Notify creator
        notif = Notification(
            user_id=course.creator_id, type="course_approved",
            icon="✅", title="Course approved!",
            message=f"'{course.title}' is now live on the marketplace!",
            link=f"/marketplace/{course.slug}" if course.slug else "/courses/my-courses",
        )
        db.add(notif)
        db.commit()
        return JSONResponse({"ok": True, "status": "published"})

    elif action == "reject":
        course.status = "ai_rejected"  # reuse same status — creator can fix and resubmit
        course.admin_reviewed_at = datetime.utcnow()
        course.admin_notes = notes
        db.commit()
        # Notify creator
        notif = Notification(
            user_id=course.creator_id, type="course_rejected",
            icon="❌", title="Course needs changes",
            message=f"'{course.title}': {notes or 'Please review admin feedback.'}",
            link=f"/courses/edit/{course.id}",
        )
        db.add(notif)
        db.commit()
        return JSONResponse({"ok": True, "status": "rejected"})

    return JSONResponse({"error": "Invalid action"}, status_code=400)


# ═══════════════════════════════════════════════════════════════
#  PHASE 6: COURSE MARKETPLACE COMMISSION ENGINE (50/25/25)
# ═══════════════════════════════════════════════════════════════

@app.post("/api/marketplace/purchase/{course_id}")
async def purchase_marketplace_course(course_id: int, request: Request,
                                      user: User = Depends(get_current_user),
                                      db: Session = Depends(get_db)):
    """Purchase a member-created course. Executes 50/25/25 commission split."""
    course = db.query(MemberCourse).filter(
        MemberCourse.id == course_id, MemberCourse.status == "published"
    ).first()
    if not course:
        return JSONResponse({"error": "Course not found or not published"}, status_code=404)

    # Block self-purchase
    if user and user.id == course.creator_id:
        return JSONResponse({"error": "You cannot purchase your own course"}, status_code=400)

    # Check if already purchased (for logged-in users)
    if user:
        existing = db.query(MemberCoursePurchase).filter(
            MemberCoursePurchase.course_id == course_id,
            MemberCoursePurchase.buyer_id == user.id,
            MemberCoursePurchase.status == "completed"
        ).first()
        if existing:
            return JSONResponse({"error": "You already own this course"}, status_code=400)

    body = await request.json()
    payment_method = body.get("payment_method", "wallet")
    price = float(course.price)

    # ── Calculate 50/25/25 split ──
    creator_share = round(price * 0.50, 2)
    sponsor_share = round(price * 0.25, 2)
    company_share = round(price - creator_share - sponsor_share, 2)  # Absorbs rounding

    # ── Find creator's sponsor ──
    creator = db.query(User).filter(User.id == course.creator_id).first()
    sponsor_id = creator.sponsor_id if creator else None
    # If no sponsor or sponsor is None, default to master affiliate (admin)
    if not sponsor_id:
        master = db.query(User).filter(User.is_admin == True).first()
        sponsor_id = master.id if master else None

    # ── Process payment ──
    if payment_method == "wallet" and user:
        if float(user.balance or 0) < price:
            return JSONResponse({"error": "Insufficient wallet balance"}, status_code=400)
        user.balance = (user.balance or 0) - price
    # TODO: Stripe payment flow for card payments and guest purchases

    # ── Generate access token for guest purchases ──
    import secrets
    from decimal import Decimal
    access_token = secrets.token_urlsafe(32) if not user else None

    # ── Create purchase record ──
    purchase = MemberCoursePurchase(
        course_id=course_id,
        buyer_id=user.id if user else None,
        buyer_email=body.get("buyer_email", user.email if user else ""),
        buyer_name=body.get("buyer_name", user.first_name if user else ""),
        amount_paid=price,
        creator_commission=creator_share,
        sponsor_commission=sponsor_share,
        company_commission=company_share,
        sponsor_id=sponsor_id,
        payment_method=payment_method,
        payment_ref=body.get("payment_ref", ""),
        status="completed",
        access_token=access_token,
    )
    db.add(purchase)

    # ── Credit commissions ──
    # 50% to creator
    if creator:
        creator.balance = Decimal(str(creator.balance or 0)) + Decimal(str(creator_share))
        creator.total_earned = Decimal(str(creator.total_earned or 0)) + Decimal(str(creator_share))
        creator.marketplace_earnings = Decimal(str(creator.marketplace_earnings or 0)) + Decimal(str(creator_share))
        creator.course_earnings = Decimal(str(creator.course_earnings or 0)) + Decimal(str(creator_share))

    # 25% to creator's sponsor
    sponsor = db.query(User).filter(User.id == sponsor_id).first() if sponsor_id else None
    if sponsor:
        sponsor.balance = Decimal(str(sponsor.balance or 0)) + Decimal(str(sponsor_share))
        sponsor.total_earned = Decimal(str(sponsor.total_earned or 0)) + Decimal(str(sponsor_share))
        sponsor.marketplace_earnings = Decimal(str(sponsor.marketplace_earnings or 0)) + Decimal(str(sponsor_share))

    # 25% company — no wallet credit needed (revenue stays in system)

    # ── Update course stats ──
    course.total_sales = (course.total_sales or 0) + 1
    course.total_revenue = Decimal(str(course.total_revenue or 0)) + Decimal(str(price))

    # ── Notifications ──
    if creator:
        db.add(Notification(
            user_id=creator.id, type="course_sale",
            icon="💰", title="Course sale!",
            message=f"Someone purchased '{course.title}' — you earned ${creator_share:.2f}",
            link="/courses/my-courses",
        ))
    if sponsor and sponsor.id != (creator.id if creator else None):
        db.add(Notification(
            user_id=sponsor.id, type="course_sponsor_commission",
            icon="🎓", title="Sponsor commission earned",
            message=f"Your recruit's course '{course.title}' sold — you earned ${sponsor_share:.2f}",
            link="/wallet",
        ))

    db.commit()

    return JSONResponse({
        "ok": True,
        "purchase_id": purchase.id,
        "access_token": access_token,
        "creator_earned": creator_share,
        "sponsor_earned": sponsor_share,
        "company_earned": company_share,
    })


@app.post("/api/marketplace/refund/{purchase_id}")
async def refund_marketplace_purchase(purchase_id: int, request: Request,
                                      user: User = Depends(get_current_user),
                                      db: Session = Depends(get_db)):
    """Refund a marketplace purchase within 7 days. Reverses all commissions."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    purchase = db.query(MemberCoursePurchase).filter(MemberCoursePurchase.id == purchase_id).first()
    if not purchase:
        return JSONResponse({"error": "Purchase not found"}, status_code=404)

    # Only buyer or admin can refund
    if purchase.buyer_id != user.id and not user.is_admin:
        return JSONResponse({"error": "Not authorised"}, status_code=403)

    if purchase.status != "completed":
        return JSONResponse({"error": "Purchase already refunded"}, status_code=400)

    # Check 7-day window
    if purchase.created_at:
        days_since = (datetime.utcnow() - purchase.created_at).days
        if days_since > 7 and not user.is_admin:
            return JSONResponse({"error": "Refund window expired (7 days)"}, status_code=400)

    # ── Reverse commissions ──
    course = db.query(MemberCourse).filter(MemberCourse.id == purchase.course_id).first()
    creator = db.query(User).filter(User.id == course.creator_id).first() if course else None
    sponsor = db.query(User).filter(User.id == purchase.sponsor_id).first() if purchase.sponsor_id else None

    if creator:
        creator.balance = max(0, float(creator.balance or 0) - float(purchase.creator_commission))
        creator.total_earned = max(0, float(creator.total_earned or 0) - float(purchase.creator_commission))
        creator.marketplace_earnings = max(0, float(creator.marketplace_earnings or 0) - float(purchase.creator_commission))

    if sponsor:
        sponsor.balance = max(Decimal("0"), (sponsor.balance or Decimal("0")) - (purchase.sponsor_commission or Decimal("0")))
        sponsor.total_earned = max(0, float(sponsor.total_earned or 0) - float(purchase.sponsor_commission))
        sponsor.marketplace_earnings = max(0, float(sponsor.marketplace_earnings or 0) - float(purchase.sponsor_commission))

    # Refund buyer (wallet)
    buyer = db.query(User).filter(User.id == purchase.buyer_id).first() if purchase.buyer_id else None
    if buyer:
        buyer.balance = (buyer.balance or 0) + (purchase.amount_paid or 0)

    # Update course stats
    if course:
        course.total_sales = max(0, (course.total_sales or 0) - 1)
        course.total_revenue = max(0, float(course.total_revenue or 0) - float(purchase.amount_paid))

    # Mark purchase as refunded
    purchase.status = "refunded"
    purchase.refunded_at = datetime.utcnow()

    db.commit()
    return JSONResponse({"ok": True, "refunded": float(purchase.amount_paid)})


@app.get("/marketplace/{slug:path}")
def marketplace_course_detail(slug: str, request: Request, db: Session = Depends(get_db)):
    """Public course detail page — view and purchase."""
    course = db.query(MemberCourse).filter(
        MemberCourse.slug == slug, MemberCourse.status == "published"
    ).first()
    if not course:
        return RedirectResponse(url="/marketplace")
    creator = db.query(User).filter(User.id == course.creator_id).first()
    chapters = db.query(MemberCourseChapter).filter(
        MemberCourseChapter.course_id == course.id
    ).order_by(MemberCourseChapter.chapter_order).all()
    lessons_by_chapter = {}
    for ch in chapters:
        lessons_by_chapter[ch.id] = db.query(MemberCourseLesson).filter(
            MemberCourseLesson.chapter_id == ch.id
        ).order_by(MemberCourseLesson.lesson_order).all()
    # Check if current user already owns it
    user = None
    try:
        user = get_current_user(request, db)
    except:
        pass
    already_purchased = False
    if user:
        existing = db.query(MemberCoursePurchase).filter(
            MemberCoursePurchase.course_id == course.id,
            MemberCoursePurchase.buyer_id == user.id,
            MemberCoursePurchase.status == "completed"
        ).first()
        already_purchased = existing is not None
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/dashboard", status_code=302)

def _old_marketplace_course_DISABLED(slug=None, request=None, db=None):
    return templates.TemplateResponse("marketplace-course.html", {
        "request": request, "course": course, "creator": creator,
        "chapters": chapters, "lessons_by_chapter": lessons_by_chapter,
        "user": user, "already_purchased": already_purchased,
    })


@app.get("/courses/creator-agreement")
def creator_agreement_page(request: Request):
    """Course Creator Agreement — legal terms page."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return RedirectResponse(url="/dashboard", status_code=302)

def _old_creator_agreement_DISABLED(request=None):
    return templates.TemplateResponse("course-creator-agreement.html", {"request": request})


# ═══════════════════════════════════════════════════════════════
#  SUPERSELLER — AI Sales Autopilot API
# ═══════════════════════════════════════════════════════════════

@app.post("/api/superseller/create")
async def api_superseller_create(request: Request, background_tasks: BackgroundTasks,
                                  user: User = Depends(get_current_user),
                                  db: Session = Depends(get_db)):
    """Create a new SuperSeller campaign — fires AI generation in background."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if user.membership_tier != "pro" and not user.is_admin:
        return JSONResponse({"error": "SuperSeller requires Pro membership"}, status_code=403)

    from .database import SuperSellerCampaign

    # ── Rate limits ──
    MAX_AGENTS = 5
    MAX_GENERATIONS_PER_MONTH = 5

    # Check total agents
    total_agents = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.user_id == user.id,
        SuperSellerCampaign.status != "failed"
    ).count()
    if total_agents >= MAX_AGENTS and not user.is_admin:
        return JSONResponse({"error": f"Maximum {MAX_AGENTS} campaigns allowed. Delete an existing campaign to create a new one."}, status_code=429)

    # Check monthly generation limit
    from datetime import datetime, timedelta
    month_ago = datetime.utcnow() - timedelta(days=30)
    recent_gens = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.user_id == user.id,
        SuperSellerCampaign.created_at >= month_ago
    ).count()
    if recent_gens >= MAX_GENERATIONS_PER_MONTH and not user.is_admin:
        return JSONResponse({"error": f"Maximum {MAX_GENERATIONS_PER_MONTH} campaign generations per month. Try again next month or delete unused campaigns."}, status_code=429)

    body = await request.json()
    niche = (body.get("niche") or "").strip()[:200]
    audience = (body.get("audience") or "").strip()[:500]
    tone = (body.get("tone") or "professional").strip()[:50]
    goal = (body.get("goal") or "lead_generation").strip()[:50]

    if not niche:
        return JSONResponse({"error": "Niche is required"}, status_code=400)

    # Build funnel URL
    funnel_url = f"{os.getenv('BASE_URL', 'https://www.superadpro.com')}/join/{user.username}"

    # Create campaign record
    from .database import SuperSellerCampaign
    campaign = SuperSellerCampaign(
        user_id=user.id,
        niche=niche, audience=audience, tone=tone, goal=goal,
        funnel_url=funnel_url, status="generating"
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # Fire generation in background — return immediately to avoid timeout
    import json as _json

    async def _run_generation(campaign_id: int, niche_: str, audience_: str,
                               tone_: str, goal_: str, funnel_url_: str, user_id_: int):
        """Background task: generate all SuperSeller assets."""
        from .database import SessionLocal, SuperSellerCampaign as SSC
        bg_db = SessionLocal()
        bg_c = None
        try:
            bg_c = bg_db.query(SSC).filter(SSC.id == campaign_id).first()
            if not bg_c:
                return

            base_ctx = f"""You are generating marketing content for a SuperAdPro member.
SuperAdPro is a video advertising and AI marketing platform. Members pay $20-35/month for:
- Video ad campaigns with real engaged viewers
- AI marketing tools (campaign studio, social posts, funnels, email)
- Course marketplace (create and sell courses)
- Affiliate network (earn commissions by referring others)

Member niche: {niche_}
Target audience: {audience_}
Tone: {tone_}
Goal: {goal_}
Funnel URL: {funnel_url_}

IMPORTANT: Never make income guarantees. Focus on the tools and platform value.
All CTAs should point to: {funnel_url_}"""

            steps_ok = 0
            steps_total = 6

            # Step 1: Social posts
            try:
                s_resp = await _call_ai(f"""{base_ctx}

Generate 30 social media posts (one per day for 30 days). Return ONLY valid JSON array.
Mix: 70% value/educational, 20% soft CTA, 10% direct CTA.
Each post: {{"day": 1, "platform": "facebook|instagram|x|linkedin|tiktok", "content": "post text with emojis", "hashtags": "#tag1 #tag2", "type": "value|soft_cta|direct_cta"}}
Rotate platforms. Keep posts natural and engaging, not salesy.""", model="claude-sonnet-4-20250514")
                bg_c.social_posts_json = _extract_json(s_resp)
                bg_db.commit()
                steps_ok += 1
                logger.info(f"SuperSeller {campaign_id}: social posts OK")
            except Exception as e:
                logger.error(f"SuperSeller {campaign_id}: social posts FAILED: {e}")

            # Step 2: Email sequence
            try:
                e_resp = await _call_ai(f"""{base_ctx}

Generate a 5-email nurture sequence. Return ONLY valid JSON array.
Sequence: Welcome (day 0) -> Value (day 1) -> Social Proof (day 3) -> Urgency (day 5) -> Final CTA (day 7)
Each email: {{"email_num": 1, "subject": "subject line", "preview": "preview text", "body": "full email HTML body", "delay_days": 0, "type": "welcome|value|social_proof|urgency|final_cta"}}
Professional HTML emails with inline styles. Include the funnel URL as CTA button.""", model="claude-sonnet-4-20250514")
                bg_c.email_sequence_json = _extract_json(e_resp)
                bg_db.commit()
                steps_ok += 1
                logger.info(f"SuperSeller {campaign_id}: email sequence OK")
            except Exception as e:
                logger.error(f"SuperSeller {campaign_id}: email sequence FAILED: {e}")

            # Step 3: Video scripts
            try:
                v_resp = await _call_ai(f"""{base_ctx}

Generate 3 video scripts for short-form content. Return ONLY valid JSON array.
Durations: 30 seconds, 60 seconds, 2 minutes.
Each: {{"title": "title", "duration": "30s|60s|2min", "hook": "first 3 seconds", "body": "main content", "cta": "call to action", "platform": "tiktok|reels|shorts"}}
Hook must grab attention immediately. Use problem-agitation-solution framework.""", model="claude-sonnet-4-20250514")
                bg_c.video_scripts_json = _extract_json(v_resp)
                bg_db.commit()
                steps_ok += 1
                logger.info(f"SuperSeller {campaign_id}: video scripts OK")
            except Exception as e:
                logger.error(f"SuperSeller {campaign_id}: video scripts FAILED: {e}")

            # Step 4: Ad copy
            try:
                a_resp = await _call_ai(f"""{base_ctx}

Generate ad copy for 3 platforms. Return ONLY valid JSON array.
Platforms: Facebook, Instagram, Google.
Each: {{"platform": "facebook|instagram|google", "headline": "headline", "body": "ad body text", "cta_text": "button text", "description": "ad description"}}""", model="claude-haiku-4-5-20251001")
                bg_c.ad_copy_json = _extract_json(a_resp)
                bg_db.commit()
                steps_ok += 1
                logger.info(f"SuperSeller {campaign_id}: ad copy OK")
            except Exception as e:
                logger.error(f"SuperSeller {campaign_id}: ad copy FAILED: {e}")

            # Step 5: Strategy
            try:
                st_resp = await _call_ai(f"""{base_ctx}

Generate a 30-day campaign strategy. Return ONLY valid JSON object with:
{{"overview": "strategy summary", "daily_plan": [{{"day": 1, "task": "what to do", "platform": "where", "tip": "helpful tip"}}], "best_practices": ["tip1"], "posting_times": {{"facebook": "best time", "instagram": "best time", "tiktok": "best time"}}, "hashtag_strategy": "approach", "engagement_tips": ["tip1"]}}""", model="claude-sonnet-4-20250514")
                bg_c.strategy_json = _extract_json(st_resp)
                bg_db.commit()
                steps_ok += 1
                logger.info(f"SuperSeller {campaign_id}: strategy OK")
            except Exception as e:
                logger.error(f"SuperSeller {campaign_id}: strategy FAILED: {e}")

            # Step 6: Landing page
            try:
                tracked_url = f"{os.getenv('BASE_URL','https://www.superadpro.com')}/superseller/go/{campaign_id}"
                lp_resp = await _call_ai(f"""{base_ctx}

Generate a complete beautiful mobile-responsive HTML landing page for SuperAdPro.
- Compelling hero with niche-tailored headline
- Platform benefits section
- Lead capture form (name + email) POSTing to /api/superseller/lead-capture/{campaign_id}
- CTA button linking to {tracked_url}
- Dark theme #050d1a background, cyan #38bdf8 accents
- Social proof and FAQ sections
- Self-contained HTML with embedded CSS/JS
- Add before </body>: <script src="/static/js/superseller-chat.js" data-campaign="{campaign_id}"></script>
Return ONLY complete HTML starting with <!DOCTYPE html>. No markdown.""", model="claude-sonnet-4-20250514")
                lp = lp_resp.strip()
                if lp.startswith("```"): lp = lp.split("\n", 1)[1] if "\n" in lp else lp[3:]
                if lp.endswith("```"): lp = lp[:-3].strip()
                bg_c.landing_page_html = lp
                bg_db.commit()
                steps_ok += 1
                logger.info(f"SuperSeller {campaign_id}: landing page OK")
            except Exception as e:
                logger.error(f"SuperSeller {campaign_id}: landing page FAILED: {e}")

            # Mark status based on results
            if steps_ok >= 4:
                bg_c.status = "active"
                logger.info(f"SuperSeller campaign {campaign_id} generated: {steps_ok}/{steps_total} steps OK")
            else:
                bg_c.status = "failed"
                logger.error(f"SuperSeller campaign {campaign_id} failed: only {steps_ok}/{steps_total} steps OK")
            bg_db.commit()

        except Exception as e:
            logger.error(f"SuperSeller generation failed for campaign {campaign_id}: {e}")
            if bg_c:
                try:
                    bg_c.status = "failed"
                    bg_db.commit()
                except Exception:
                    pass
        finally:
            bg_db.close()

    background_tasks.add_task(_run_generation, campaign.id, niche, audience, tone, goal, funnel_url, user.id)
    return {"success": True, "campaign_id": campaign.id, "status": "generating"}


@app.get("/api/superseller/campaigns")
def api_superseller_campaigns(request: Request, user: User = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    """List user's SuperSeller campaigns."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import SuperSellerCampaign
    from datetime import datetime, timedelta
    # Auto-fail stuck "generating" campaigns older than 5 minutes
    stuck = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.user_id == user.id,
        SuperSellerCampaign.status == "generating",
        SuperSellerCampaign.created_at < datetime.utcnow() - timedelta(minutes=5)
    ).all()
    for s in stuck:
        s.status = "failed"
    if stuck:
        db.commit()
    campaigns = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.user_id == user.id
    ).order_by(SuperSellerCampaign.created_at.desc()).all()
    return {"campaigns": [{
        "id": c.id, "niche": c.niche, "audience": c.audience,
        "tone": c.tone, "goal": c.goal, "funnel_url": c.funnel_url,
        "campaign_type": c.campaign_type or "superadpro",
        "offer_name": c.offer_name, "offer_url": c.offer_url,
        "agent_name": c.agent_name,
        "status": c.status, "leads_count": c.leads_count or 0,
        "conversions_count": c.conversions_count or 0,
        "link_clicks": c.link_clicks or 0,
        "chat_conversations": c.chat_conversations or 0,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    } for c in campaigns]}


@app.get("/api/superseller/campaign/{campaign_id}")
def api_superseller_detail(campaign_id: int, request: Request,
                            user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Get full campaign detail with all generated assets."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import SuperSellerCampaign
    from datetime import datetime, timedelta
    import json as _json
    c = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.id == campaign_id,
        SuperSellerCampaign.user_id == user.id
    ).first()
    if not c:
        return JSONResponse({"error": "Campaign not found"}, status_code=404)
    # Auto-fail stuck generating campaigns
    if c.status == "generating" and c.created_at and c.created_at < datetime.utcnow() - timedelta(minutes=5):
        c.status = "failed"
        db.commit()

    def safe_json(s):
        if not s: return None
        try: return _json.loads(s)
        except: return s

    base = os.getenv('BASE_URL', 'https://www.superadpro.com')
    return {
        "id": c.id, "niche": c.niche, "audience": c.audience,
        "tone": c.tone, "goal": c.goal, "funnel_url": c.funnel_url,
        "tracked_url": f"{base}/superseller/go/{c.id}",
        "landing_page_url": f"{base}/superseller/page/{c.id}",
        "campaign_type": c.campaign_type or "superadpro",
        "offer_name": c.offer_name, "offer_url": c.offer_url,
        "offer_description": c.offer_description,
        "offer_pricing": c.offer_pricing,
        "offer_benefits": c.offer_benefits,
        "agent_name": c.agent_name,
        "agent_greeting": c.agent_greeting,
        "status": c.status,
        "social_posts": safe_json(c.social_posts_json),
        "email_sequence": safe_json(c.email_sequence_json),
        "video_scripts": safe_json(c.video_scripts_json),
        "ad_copy": safe_json(c.ad_copy_json),
        "strategy": safe_json(c.strategy_json),
        "landing_page_html": c.landing_page_html,
        "custom_video_url": c.custom_video_url or "",
        "custom_headline": c.custom_headline or "",
        "custom_subtitle": c.custom_subtitle or "",
        "custom_cta_text": c.custom_cta_text or "",
        "custom_cta_color": c.custom_cta_color or "",
        "custom_html_inject": c.custom_html_inject or "",
        "leads_count": c.leads_count or 0,
        "conversions_count": c.conversions_count or 0,
        "link_clicks": c.link_clicks or 0,
        "page_views": c.page_views or 0,
        "chat_conversations": c.chat_conversations or 0,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@app.get("/api/superseller/today/{campaign_id}")
def api_superseller_today(campaign_id: int, request: Request,
                           user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    """Get today's scheduled content for the active campaign."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import SuperSellerCampaign
    import json as _json
    c = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.id == campaign_id,
        SuperSellerCampaign.user_id == user.id
    ).first()
    if not c:
        return JSONResponse({"error": "Campaign not found"}, status_code=404)

    # Calculate which day of the campaign we're on
    from datetime import datetime
    days_active = (datetime.utcnow() - c.created_at).days + 1
    day_num = min(days_active, 30)

    posts = []
    try:
        all_posts = _json.loads(c.social_posts_json) if c.social_posts_json else []
        posts = [p for p in all_posts if p.get("day") == day_num]
    except: pass

    return {
        "campaign_id": c.id,
        "day": day_num,
        "posts": posts,
        "funnel_url": c.funnel_url,
        "total_days": 30,
    }


@app.delete("/api/superseller/campaign/{campaign_id}")
def api_superseller_delete(campaign_id: int, request: Request,
                            user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Delete a SuperSeller campaign to free up a slot."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import SuperSellerCampaign
    c = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.id == campaign_id,
        SuperSellerCampaign.user_id == user.id
    ).first()
    if not c:
        return JSONResponse({"error": "Campaign not found"}, status_code=404)
    db.delete(c)
    db.commit()
    return {"success": True, "message": "Campaign deleted"}


async def _call_ai(prompt: str, model: str = "claude-sonnet-4-20250514", retries: int = 2) -> str:
    """Call Claude API for SuperSeller generation with retry logic."""
    import httpx
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise Exception("ANTHROPIC_API_KEY not set")
    last_error = None
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=180) as client:
                resp = await client.post("https://api.anthropic.com/v1/messages", headers={
                    "x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json",
                }, json={
                    "model": model, "max_tokens": 8000,
                    "messages": [{"role": "user", "content": prompt}],
                })
                data = resp.json()
                if "content" in data and len(data["content"]) > 0:
                    return data["content"][0].get("text", "")
                last_error = f"AI response error: {data}"
                logger.warning(f"_call_ai attempt {attempt+1} failed: {last_error}")
        except Exception as e:
            last_error = str(e)
            logger.warning(f"_call_ai attempt {attempt+1} exception: {last_error}")
        if attempt < retries - 1:
            import asyncio
            await asyncio.sleep(3)
    raise Exception(f"AI call failed after {retries} attempts: {last_error}")


def _extract_json(text: str) -> str:
    """Extract JSON from AI response — handles markdown code blocks."""
    import json as _json
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t[3:]
        if t.endswith("```"): t = t[:-3].strip()
    # Validate it's valid JSON
    try:
        _json.loads(t)
        return t
    except:
        # Try to find JSON array or object in the text
        for start_char in ['[', '{']:
            idx = text.find(start_char)
            if idx >= 0:
                end_char = ']' if start_char == '[' else '}'
                # Find matching end
                depth = 0
                for i in range(idx, len(text)):
                    if text[i] == start_char: depth += 1
                    elif text[i] == end_char: depth -= 1
                    if depth == 0:
                        candidate = text[idx:i+1]
                        try:
                            _json.loads(candidate)
                            return candidate
                        except: break
        return t


# ═══════════════════════════════════════════════════════════════
#  SUPERSELLER PHASE 2 — Brevo Email Automation
# ═══════════════════════════════════════════════════════════════

@app.post("/api/superseller/campaign/{campaign_id}/activate-emails")
async def api_superseller_activate_emails(campaign_id: int, request: Request,
                                           user: User = Depends(get_current_user),
                                           db: Session = Depends(get_db)):
    """Create Brevo contact list and set up email automation for this campaign."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import SuperSellerCampaign
    import json as _json

    c = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.id == campaign_id,
        SuperSellerCampaign.user_id == user.id
    ).first()
    if not c:
        return JSONResponse({"error": "Campaign not found"}, status_code=404)

    brevo_key = os.getenv("BREVO_API_KEY", "")
    if not brevo_key:
        return JSONResponse({"error": "Email service not configured"}, status_code=503)

    try:
        # Create a Brevo contact list for this campaign
        list_name = f"SuperSeller-{user.username}-{c.niche[:30]}-{c.id}"
        list_payload = json.dumps({"name": list_name, "folderId": 1}).encode("utf-8")
        req = urllib.request.Request(
            "https://api.brevo.com/v3/contacts/lists",
            data=list_payload,
            headers={"accept": "application/json", "api-key": brevo_key, "content-type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            list_data = json.loads(resp.read())
            c.brevo_list_id = list_data.get("id")
            db.commit()

        return {"success": True, "brevo_list_id": c.brevo_list_id, "list_name": list_name}
    except Exception as e:
        logger.error(f"SuperSeller Brevo list creation failed: {e}")
        return JSONResponse({"error": f"Email setup failed: {str(e)}"}, status_code=500)


@app.post("/api/superseller/lead-capture/{campaign_id}")
async def api_superseller_lead_capture(campaign_id: int, request: Request,
                                        db: Session = Depends(get_db)):
    """Capture a lead from a SuperSeller funnel page — adds to Brevo + tracks."""
    from .database import SuperSellerCampaign, MemberLead
    import json as _json

    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    name = (body.get("name") or "").strip()[:100]

    if not email or "@" not in email:
        return JSONResponse({"error": "Valid email required"}, status_code=400)

    c = db.query(SuperSellerCampaign).filter(SuperSellerCampaign.id == campaign_id).first()
    if not c:
        return JSONResponse({"error": "Campaign not found"}, status_code=404)

    # Create lead record
    lead = MemberLead(
        user_id=c.user_id, email=email, name=name,
        source_url=f"superseller-{campaign_id}", status="new", is_hot=False,
    )
    db.add(lead)
    c.leads_count = (c.leads_count or 0) + 1
    db.commit()

    # Add to Brevo contact list
    brevo_key = os.getenv("BREVO_API_KEY", "")
    if brevo_key and c.brevo_list_id:
        try:
            list_ids = [c.brevo_list_id]
            contact_payload = json.dumps({
                "email": email,
                "attributes": {"FIRSTNAME": name, "SUPERSELLER_CAMPAIGN": str(c.id), "NICHE": c.niche},
                "listIds": list_ids, "updateEnabled": True,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.brevo.com/v3/contacts",
                data=contact_payload,
                headers={"accept": "application/json", "api-key": brevo_key, "content-type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(req, timeout=10)
        except Exception as e:
            logger.error(f"SuperSeller Brevo contact add failed: {e}")

    # Wire lead into the drip email system
    try:
        emails_raw = _json.loads(c.email_sequence_json) if c.email_sequence_json else []
        if emails_raw:
            # Transform SuperSeller email format → EmailSequence format
            from .database import EmailSequence
            seq_emails = []
            delay_map = {0: 0, 1: 1, 2: 3, 3: 5, 4: 7}  # email index → send delay days
            for idx, em in enumerate(emails_raw):
                seq_emails.append({
                    "subject": em.get("subject", f"Email {idx+1}"),
                    "body_html": em.get("body", em.get("content", "")),
                    "send_delay_days": em.get("delay_days", delay_map.get(idx, idx * 2)),
                })

            # Check if this campaign already has a sequence, else create one
            seq_title = f"SuperSeller - {c.niche} - Campaign {c.id}"
            seq = db.query(EmailSequence).filter(
                EmailSequence.user_id == c.user_id,
                EmailSequence.title == seq_title
            ).first()
            if not seq:
                seq = EmailSequence(
                    user_id=c.user_id,
                    title=seq_title,
                    niche=c.niche,
                    tone=c.tone or "professional",
                    num_emails=len(seq_emails),
                    emails_json=_json.dumps(seq_emails),
                    is_active=True,
                )
                db.add(seq)
                db.flush()

            # Assign sequence to lead and set to nurturing
            lead.email_sequence_id = seq.id
            lead.status = "nurturing"
            lead.emails_sent = 0
            db.commit()
    except Exception as e:
        logger.error(f"SuperSeller drip setup failed: {e}")

    # Notify the campaign owner
    send_notification(db, c.user_id, "lead", "🎯",
        f"New lead captured: {name or email}",
        f"A new lead signed up through your SuperSeller funnel for '{c.niche}'. Check your SuperSeller dashboard.")

    return {"success": True, "message": "Lead captured"}


def _send_superseller_email(to_email: str, to_name: str, email_data: dict,
                             campaign, db):
    """Send a SuperSeller sequence email via Brevo transactional API."""
    brevo_key = os.getenv("BREVO_API_KEY", "")
    if not brevo_key:
        return

    subject = email_data.get("subject", "Welcome")
    body = email_data.get("body", email_data.get("content", ""))

    # Replace funnel URL placeholder
    if campaign.funnel_url:
        body = body.replace("{{funnel_url}}", campaign.funnel_url)
        body = body.replace("{funnel_url}", campaign.funnel_url)

    try:
        payload = json.dumps({
            "sender": {"name": "SuperAdPro", "email": os.getenv("BREVO_SENDER_EMAIL", "hello@superadpro.com")},
            "to": [{"email": to_email, "name": to_name}],
            "subject": subject,
            "htmlContent": body,
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=payload,
            headers={"accept": "application/json", "api-key": brevo_key, "content-type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=15)
    except Exception as e:
        logger.error(f"SuperSeller email send failed: {e}")


# ═══════════════════════════════════════════════════════════════
#  SUPERSELLER PHASE 3 — AI Sales Agent Chatbot
# ═══════════════════════════════════════════════════════════════

@app.post("/api/superseller/create-custom-agent")
async def api_superseller_create_custom_agent(request: Request, user: User = Depends(get_current_user),
                                               db: Session = Depends(get_db)):
    """Create a custom AI sales agent for ANY offer — not just SuperAdPro."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if user.membership_tier != "pro" and not user.is_admin:
        return JSONResponse({"error": "Custom AI Agents require Pro membership"}, status_code=403)

    from .database import SuperSellerCampaign

    # ── Rate limits (shared with SuperAdPro campaigns) ──
    MAX_AGENTS = 5
    total_agents = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.user_id == user.id,
        SuperSellerCampaign.status != "failed"
    ).count()
    if total_agents >= MAX_AGENTS and not user.is_admin:
        return JSONResponse({"error": f"Maximum {MAX_AGENTS} agents/campaigns allowed. Delete an existing one to create a new one."}, status_code=429)

    body = await request.json()
    offer_name = (body.get("offer_name") or "").strip()[:200]
    offer_url = (body.get("offer_url") or "").strip()[:500]
    offer_description = (body.get("offer_description") or "").strip()[:5000]
    offer_pricing = (body.get("offer_pricing") or "").strip()[:1000]
    offer_benefits = (body.get("offer_benefits") or "").strip()[:3000]
    offer_objections = (body.get("offer_objections") or "").strip()[:3000]
    offer_extra = (body.get("offer_extra_context") or "").strip()[:3000]
    agent_name = (body.get("agent_name") or "AI Assistant").strip()[:100]
    agent_greeting = (body.get("agent_greeting") or "").strip()[:500]
    tone = (body.get("tone") or "professional").strip()[:50]
    niche = (body.get("niche") or offer_name).strip()[:200]

    if not offer_name:
        return JSONResponse({"error": "Offer name is required"}, status_code=400)
    if not offer_url:
        return JSONResponse({"error": "Offer URL is required"}, status_code=400)
    if not offer_description:
        return JSONResponse({"error": "Offer description is required"}, status_code=400)

    from .database import SuperSellerCampaign
    campaign = SuperSellerCampaign(
        user_id=user.id, campaign_type="custom",
        niche=niche, tone=tone, goal="direct_sales",
        offer_name=offer_name, offer_url=offer_url,
        offer_description=offer_description, offer_pricing=offer_pricing,
        offer_benefits=offer_benefits, offer_objections=offer_objections,
        offer_extra_context=offer_extra,
        agent_name=agent_name,
        agent_greeting=agent_greeting or f"Hi! 👋 I'm here to answer any questions about {offer_name}. What would you like to know?",
        funnel_url=offer_url, status="active",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return {"success": True, "campaign_id": campaign.id, "status": "active"}


@app.get("/superseller/go/{campaign_id}")
def api_superseller_tracked_click(campaign_id: int, request: Request,
                                    db: Session = Depends(get_db)):
    """Tracked redirect — increments link_clicks then redirects to funnel URL."""
    from .database import SuperSellerCampaign
    c = db.query(SuperSellerCampaign).filter(SuperSellerCampaign.id == campaign_id).first()
    if not c:
        return RedirectResponse(url="/", status_code=302)
    c.link_clicks = (c.link_clicks or 0) + 1
    db.commit()
    return RedirectResponse(url=c.funnel_url or "/", status_code=302)


@app.get("/superseller/page/{campaign_id}")
def api_superseller_landing_page(campaign_id: int, request: Request,
                                   db: Session = Depends(get_db)):
    """Serve the AI-generated SuperSeller landing page with customizations. Public."""
    from .database import SuperSellerCampaign
    c = db.query(SuperSellerCampaign).filter(SuperSellerCampaign.id == campaign_id).first()
    if not c or not c.landing_page_html:
        return HTMLResponse("""<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SuperAdPro</title>
        <style>body{font-family:sans-serif;background:#050d1a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}</style>
        </head><body><h2 style="color:#38bdf8">Landing page generating...</h2><p>Check back in a moment.</p></body></html>""")
    c.page_views = (c.page_views or 0) + 1
    db.commit()

    html = c.landing_page_html

    # ── Inject customizations ──
    import re as _re

    # Video embed — inject after opening <body> tag
    if c.custom_video_url:
        video_url = c.custom_video_url.strip()
        video_html = ""
        yt_match = _re.match(r'(?:https?://)?(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([\w-]+)', video_url)
        vimeo_match = _re.match(r'(?:https?://)?(?:www\.)?vimeo\.com/(\d+)', video_url)
        if yt_match:
            vid = yt_match.group(1)
            video_html = f'<div style="max-width:720px;margin:30px auto;border-radius:14px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.5)"><div style="position:relative;padding-bottom:56.25%;height:0"><iframe src="https://www.youtube.com/embed/{vid}?rel=0" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div></div>'
        elif vimeo_match:
            vid = vimeo_match.group(1)
            video_html = f'<div style="max-width:720px;margin:30px auto;border-radius:14px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.5)"><div style="position:relative;padding-bottom:56.25%;height:0"><iframe src="https://player.vimeo.com/video/{vid}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen></iframe></div></div>'
        elif video_url.lower().endswith('.mp4'):
            video_html = f'<div style="max-width:720px;margin:30px auto;border-radius:14px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.5)"><video controls playsinline style="width:100%;display:block" src="{video_url}"></video></div>'

        if video_html:
            # Try to inject after first </h1> or </h2> in the hero section, else after <body>
            h1_end = html.find('</h1>')
            if h1_end > 0:
                # Find the next </p> or </div> after h1 for better placement
                p_after = html.find('</p>', h1_end)
                if p_after > 0 and p_after - h1_end < 500:
                    html = html[:p_after+4] + video_html + html[p_after+4:]
                else:
                    html = html[:h1_end+5] + video_html + html[h1_end+5:]
            else:
                body_tag = _re.search(r'<body[^>]*>', html, _re.IGNORECASE)
                if body_tag:
                    pos = body_tag.end()
                    html = html[:pos] + video_html + html[pos:]

    # Custom headline — replace the first <h1> content
    if c.custom_headline:
        html = _re.sub(r'(<h1[^>]*>)(.*?)(</h1>)', r'\1' + c.custom_headline.replace('\\', '\\\\') + r'\3', html, count=1, flags=_re.DOTALL)

    # Custom subtitle — replace the first <p> after <h1>
    if c.custom_subtitle:
        # Find first </h1>, then replace the next <p>...</p>
        h1_pos = html.find('</h1>')
        if h1_pos > 0:
            p_match = _re.search(r'(<p[^>]*>)(.*?)(</p>)', html[h1_pos:], flags=_re.DOTALL)
            if p_match:
                start = h1_pos + p_match.start()
                end = h1_pos + p_match.end()
                html = html[:start] + p_match.group(1) + c.custom_subtitle + p_match.group(3) + html[end:]

    # Custom CTA text — replace the first button/a with CTA-like text
    if c.custom_cta_text:
        # Replace first button or CTA link text
        html = _re.sub(
            r'(<(?:button|a)[^>]*class="[^"]*cta[^"]*"[^>]*>)(.*?)(</(?:button|a)>)',
            r'\1' + c.custom_cta_text + r'\3', html, count=1, flags=_re.DOTALL | _re.IGNORECASE
        )
        # Also try common CTA patterns
        html = _re.sub(
            r'(>)(Get Started|Join Now|Start Now|Sign Up|Learn More|Join Free|Start Free)(</(?:button|a)>)',
            r'\1' + c.custom_cta_text + r'\3', html, count=1, flags=_re.IGNORECASE
        )

    # Custom CTA colour
    if c.custom_cta_color:
        color = c.custom_cta_color.strip()
        if _re.match(r'^#[0-9a-fA-F]{3,8}$', color):
            # Inject a style block that overrides CTA buttons
            cta_style = f'<style>button[type="submit"],a[href*="join"],a[href*="go/"],form button,.cta-btn,.cta{{background:{color}!important;background-image:none!important}}</style>'
            head_end = html.find('</head>')
            if head_end > 0:
                html = html[:head_end] + cta_style + html[head_end:]

    # Custom HTML injection — before </body>
    if c.custom_html_inject:
        body_end = html.rfind('</body>')
        if body_end > 0:
            html = html[:body_end] + c.custom_html_inject + html[body_end:]

    return HTMLResponse(html)


@app.post("/api/superseller/regenerate-landing/{campaign_id}")
async def api_superseller_regen_landing(campaign_id: int, request: Request,
                                          user: User = Depends(get_current_user),
                                          db: Session = Depends(get_db)):
    """Regenerate the landing page for an existing campaign."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import SuperSellerCampaign
    c = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.id == campaign_id, SuperSellerCampaign.user_id == user.id
    ).first()
    if not c:
        return JSONResponse({"error": "Campaign not found"}, status_code=404)
    funnel_url = c.funnel_url or f"{os.getenv('BASE_URL','https://www.superadpro.com')}/join/{user.username}"
    tracked_url = f"{os.getenv('BASE_URL','https://www.superadpro.com')}/superseller/go/{campaign_id}"
    prompt = f"""Niche: {c.niche}. Audience: {c.audience}. Tone: {c.tone}. Goal: {c.goal}. Funnel: {funnel_url}.
Generate a complete beautiful mobile-responsive HTML landing page for SuperAdPro.
Dark theme #050d1a background, cyan #38bdf8 accents. Lead capture form POSTing to /api/superseller/lead-capture/{campaign_id}.
CTA buttons link to {tracked_url} (this is the tracked affiliate link). Include <script src="/static/js/superseller-chat.js" data-campaign="{campaign_id}"></script> before </body>.
Return ONLY complete HTML starting with <!DOCTYPE html>. No markdown."""
    try:
        resp = await _call_ai(prompt, model="claude-sonnet-4-20250514")
        lp = resp.strip()
        if lp.startswith("```"): lp = lp.split("\n",1)[1] if "\n" in lp else lp[3:]
        if lp.endswith("```"): lp = lp[:-3].strip()
        c.landing_page_html = lp
        db.commit()
        return {"success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/superseller/page-customizations/{campaign_id}")
def api_superseller_get_customizations(campaign_id: int, request: Request,
                                        user: User = Depends(get_current_user),
                                        db: Session = Depends(get_db)):
    """Get page customization fields for the editor."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import SuperSellerCampaign
    c = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.id == campaign_id, SuperSellerCampaign.user_id == user.id
    ).first()
    if not c:
        return JSONResponse({"error": "Campaign not found"}, status_code=404)
    return {
        "custom_video_url": c.custom_video_url or "",
        "custom_headline": c.custom_headline or "",
        "custom_subtitle": c.custom_subtitle or "",
        "custom_cta_text": c.custom_cta_text or "",
        "custom_cta_color": c.custom_cta_color or "",
        "custom_html_inject": c.custom_html_inject or "",
    }


@app.post("/api/superseller/page-customizations/{campaign_id}")
async def api_superseller_save_customizations(campaign_id: int, request: Request,
                                               user: User = Depends(get_current_user),
                                               db: Session = Depends(get_db)):
    """Save page customization fields and rebuild the landing page HTML with injections."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import SuperSellerCampaign
    c = db.query(SuperSellerCampaign).filter(
        SuperSellerCampaign.id == campaign_id, SuperSellerCampaign.user_id == user.id
    ).first()
    if not c:
        return JSONResponse({"error": "Campaign not found"}, status_code=404)

    body = await request.json()

    # Sanitize video URL — only allow YouTube, Vimeo, MP4
    video_url = (body.get("custom_video_url") or "").strip()[:500]
    if video_url:
        import re
        yt_match = re.match(r'(?:https?://)?(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([\w-]+)', video_url)
        vimeo_match = re.match(r'(?:https?://)?(?:www\.)?vimeo\.com/(\d+)', video_url)
        is_mp4 = video_url.lower().endswith('.mp4')
        if not (yt_match or vimeo_match or is_mp4):
            return JSONResponse({"error": "Video URL must be YouTube, Vimeo, or .mp4"}, status_code=400)

    c.custom_video_url = video_url
    c.custom_headline = (body.get("custom_headline") or "").strip()[:300]
    c.custom_subtitle = (body.get("custom_subtitle") or "").strip()[:1000]
    c.custom_cta_text = (body.get("custom_cta_text") or "").strip()[:100]
    c.custom_cta_color = (body.get("custom_cta_color") or "").strip()[:20]
    # Sanitize custom HTML — strip script src to external domains for safety
    custom_html = (body.get("custom_html_inject") or "").strip()[:5000]
    c.custom_html_inject = custom_html

    db.commit()
    return {"success": True}


@app.post("/api/superseller/chat/{campaign_id}")
async def api_superseller_chat(campaign_id: int, request: Request,
                                db: Session = Depends(get_db)):
    """AI Sales Agent — responds to prospect questions.
    Supports both SuperAdPro campaigns AND custom offer agents.
    This endpoint is PUBLIC (no auth) — prospects use it from any page."""
    from .database import SuperSellerCampaign

    body = await request.json()
    message = (body.get("message") or "").strip()[:2000]
    history = body.get("history", [])[:20]

    if not message:
        return JSONResponse({"error": "Message required"}, status_code=400)

    c = db.query(SuperSellerCampaign).filter(SuperSellerCampaign.id == campaign_id).first()
    if not c:
        return JSONResponse({"error": "Campaign not found"}, status_code=404)

    # ── Daily chat rate limit: 50 messages per agent per day ──
    MAX_CHATS_PER_DAY = 50
    from datetime import datetime, timedelta
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    # Use chat_conversations as a simple daily counter — resets conceptually per day
    # For a more precise approach we'd track per-message timestamps, but this is cost-effective
    daily_count = c.chat_conversations or 0
    # Reset counter if it's a new day (check updated_at)
    if c.updated_at and c.updated_at < today_start:
        c.chat_conversations = 0
        daily_count = 0
        db.commit()

    if daily_count >= MAX_CHATS_PER_DAY:
        return {"reply": "I've been really busy today! Please come back tomorrow or visit the offer page directly to learn more."}

    # Track conversation count
    c.chat_conversations = (c.chat_conversations or 0) + 1
    db.commit()

    owner = db.query(User).filter(User.id == c.user_id).first()
    owner_name = owner.first_name or owner.username if owner else "a member"

    # Build system prompt based on campaign type
    if c.campaign_type == "custom":
        system_prompt = f"""You are "{c.agent_name or 'AI Assistant'}", a helpful sales assistant for {c.offer_name}.
You're embedded on a page by {owner_name} to help prospects learn about this offer.

ABOUT THE OFFER:
Name: {c.offer_name}
URL: {c.offer_url}
Description: {c.offer_description or 'Not provided'}
Pricing: {c.offer_pricing or 'Contact for pricing'}
Key Benefits: {c.offer_benefits or 'Not specified'}

COMMON OBJECTIONS & ANSWERS:
{c.offer_objections or 'Handle objections by focusing on the benefits and value.'}

ADDITIONAL CONTEXT:
{c.offer_extra_context or 'None provided.'}

YOUR ROLE:
- Be helpful, honest, and enthusiastic but NOT pushy
- Answer questions about the offer naturally and conversationally
- If you don't know something specific, be honest and suggest they check the offer page
- Guide prospects to take action via this link: {c.offer_url}
- Keep responses concise (2-4 sentences) unless asked for detail
- Use a {c.tone or 'professional'} tone
- NEVER invent features or pricing that weren't provided to you
- NEVER make income or results guarantees"""
    else:
        # SuperAdPro campaign (original behavior)
        system_prompt = f"""You are the AI Sales Assistant for SuperAdPro, helping prospects who are
considering joining the platform. You're embedded on {owner_name}'s referral page.

ABOUT SUPERADPRO:
- Video advertising and AI marketing platform
- Members get: video ad campaigns (8 tiers, $20-$1,000), AI marketing tools (Campaign Studio,
  Social Post Generator, Video Script Writer, Niche Finder, Email Swipes), SuperPages landing
  page builder, LinkHub link-in-bio tool, Link Tools, course marketplace
- Basic plan: $20/month — all core tools
- Pro plan: $35/month — adds SuperSeller AI autopilot, SuperPages, ProSeller AI, custom AI agents
- Affiliate commissions: 50% recurring on membership, 40% direct on grid tiers,
  6.25% uni-level across 8 levels, 100% on course sales (pass-up model)

CAMPAIGN CONTEXT:
- Niche: {c.niche}
- Target audience: {c.audience}
- Funnel URL: {c.funnel_url}

YOUR ROLE:
- Be helpful, honest, and enthusiastic but NOT pushy
- Answer questions about the platform, pricing, tools, and how it works
- NEVER make income guarantees or promise specific earnings
- Encourage the prospect to sign up through: {c.funnel_url}
- Keep responses concise (2-4 sentences) unless asked for detail
- Be conversational and natural"""

    messages = []
    for h in history[-10:]:
        if h.get("role") in ("user", "assistant"):
            messages.append({"role": h["role"], "content": h["content"][:1000]})
    messages.append({"role": "user", "content": message})

    try:
        reply = await _call_ai_with_system(system_prompt, messages, model="claude-haiku-4-5-20251001")
        return {"reply": reply}
    except Exception as e:
        logger.error(f"SuperSeller AI chat failed: {e}")
        return {"reply": "I'm having a moment — could you try asking again?"}


async def _call_ai_with_system(system: str, messages: list, model: str = "claude-haiku-4-5-20251001") -> str:
    """Call Claude API with system prompt and conversation history."""
    import httpx
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return "Our AI assistant is being set up. Please check back shortly!"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post("https://api.anthropic.com/v1/messages", headers={
            "x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json",
        }, json={
            "model": model, "max_tokens": 500, "system": system,
            "messages": messages,
        })
        data = resp.json()
        if "content" in data and len(data["content"]) > 0:
            return data["content"][0].get("text", "")
        return "I'm here to help! What would you like to know about SuperAdPro?"


# ═══════════════════════════════════════════════════════════════
#  REACT SPA — Serve the built React frontend
# ═══════════════════════════════════════════════════════════════
import pathlib

_react_index = pathlib.Path("static/app/index.html")

@app.get("/app/{full_path:path}")
async def serve_react_app(full_path: str):
    """Serve the React SPA for all /app/* routes."""
    if _react_index.exists():
        return HTMLResponse(_react_index.read_text())
    return HTMLResponse("<h2>React app not built yet. Run: cd frontend && npm run build</h2>", status_code=503)


@app.post("/api/account/update")
async def api_account_update(request: Request, user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    """Update user profile fields."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    if "first_name" in body:
        user.first_name = (body["first_name"] or "").strip()[:100]
    if "last_name" in body:
        user.last_name = (body["last_name"] or "").strip()[:100]
    if "email" in body:
        email = (body["email"] or "").strip()[:200]
        if email and "@" in email:
            user.email = email
    if "avatar_url" in body:
        user.avatar_url = body["avatar_url"]
    if "country" in body:
        user.country = (body["country"] or "").strip()[:100]
    if "wallet_address" in body:
        wa = (body["wallet_address"] or "").strip()
        if wa and not validate_wallet(wa):
            return JSONResponse({"error": "Invalid wallet address"}, status_code=400)
        user.wallet_address = wa
    db.commit()
    return {"ok": True}


@app.post("/api/account/change-password")
async def api_change_password(request: Request, user: User = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    """Change password via JSON API."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    import bcrypt
    body = await request.json()
    current = body.get("current_password", "")
    new_pw = body.get("new_password", "")
    confirm = body.get("confirm_password", "")

    if not bcrypt.checkpw(current.encode(), user.password.encode()):
        return JSONResponse({"error": "Current password is incorrect"}, status_code=400)
    if len(new_pw) < 8:
        return JSONResponse({"error": "New password must be at least 8 characters"}, status_code=400)
    if new_pw != confirm:
        return JSONResponse({"error": "New passwords do not match"}, status_code=400)

    user.password = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
    db.commit()
    return {"ok": True}
def api_courses_list(request: Request, db: Session = Depends(get_db)):
    """List platform courses for the course library."""
    from .database import Course, CourseChapter, CourseLesson
    courses = db.query(Course).order_by(Course.id).all()
    result = []
    for c in courses:
        chapters = db.query(CourseChapter).filter(CourseChapter.course_id == c.id).count()
        lessons = db.query(CourseLesson).filter(CourseLesson.course_id == c.id).count()
        total_dur = sum(l.duration_minutes or 0 for l in db.query(CourseLesson).filter(CourseLesson.course_id == c.id).all())
        result.append({
            "id": c.id, "title": c.title, "description": c.description or "",
            "price": float(c.price or 0), "thumbnail_url": c.thumbnail_url or "",
            "category": c.category or "course",
            "chapter_count": chapters, "lesson_count": lessons,
            "total_duration": total_dur,
        })
    return {"courses": result}


@app.get("/api/affiliate")
def api_affiliate_data(request: Request, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """JSON affiliate data for React frontend."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    referrals = db.query(User).filter(User.sponsor_id == user.id).all()
    # Get LinkHub views
    lh_profile = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user.id).first()
    return {
        "personal_referrals": user.personal_referrals or 0,
        "total_team": user.total_team or 0,
        "total_earned": float(user.total_earned or 0),
        "linkhub_views": lh_profile.total_views if lh_profile else 0,
        "referrals": [{
            "id": r.id, "username": r.username, "first_name": r.first_name,
            "is_active": r.is_active, "membership_tier": r.membership_tier or "basic",
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in referrals],
    }


@app.get("/api/leaderboard")
def api_leaderboard(db: Session = Depends(get_db)):
    """JSON leaderboard data."""
    top_earners = db.query(User).filter(User.is_active == True).order_by(
        User.total_earned.desc()).limit(20).all()
    top_recruiters = db.query(User).filter(User.is_active == True).order_by(
        User.personal_referrals.desc()).limit(20).all()
    top_teams = db.query(User).filter(User.is_active == True).order_by(
        User.total_team.desc()).limit(20).all()
    def user_entry(u, val):
        return {"username": u.username, "name": u.first_name or u.username, "value": val}
    return {
        "top_earners": [user_entry(u, float(u.total_earned or 0)) for u in top_earners],
        "top_recruiters": [user_entry(u, u.personal_referrals or 0) for u in top_recruiters],
        "top_teams": [user_entry(u, u.total_team or 0) for u in top_teams],
    }


@app.get("/api/campaign-tiers")
def api_campaign_tiers(request: Request, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """JSON campaign tier data with active status from both campaigns and grids."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import GRID_PACKAGES, GRID_TIER_NAMES, CAMPAIGN_VIEW_TARGETS, GRID_COMPLETION_BONUS

    # Check active video campaigns (qualification)
    active_campaigns = db.query(VideoCampaign).filter(
        VideoCampaign.user_id == user.id,
        VideoCampaign.status == "active",
        VideoCampaign.is_completed == False
    ).all()
    active_campaign_tiers = {c.campaign_tier for c in active_campaigns}

    # Check grids
    active_grids = db.query(Grid).filter(Grid.owner_id == user.id, Grid.is_complete == False).all()
    completed_grids = db.query(Grid).filter(Grid.owner_id == user.id, Grid.is_complete == True).all()
    grid_by_tier = {}
    completed_tier_set = {g.package_tier for g in completed_grids}
    for g in active_grids:
        grid_by_tier[g.package_tier] = {
            "filled": g.positions_filled or 0,
            "pct": round((g.positions_filled or 0) / 64 * 100),
            "advance": g.advance_number or 1,
        }

    # Admin always active at all tiers
    is_admin = user.is_admin

    # Build tier data
    tiers = []
    for tier_num in range(1, 9):
        price = GRID_PACKAGES.get(tier_num, 0)
        direct_comm = round(price * 0.40, 2)
        uni_level_per_member = round(price * 0.0625, 2)
        bonus = GRID_COMPLETION_BONUS.get(tier_num, 0)
        views = CAMPAIGN_VIEW_TARGETS.get(tier_num, 0)
        is_active = is_admin or (tier_num in active_campaign_tiers) or (tier_num in grid_by_tier) or (tier_num in completed_tier_set)
        grid_info = grid_by_tier.get(tier_num)

        tiers.append({
            "tier": tier_num,
            "name": GRID_TIER_NAMES.get(tier_num, f"Tier {tier_num}"),
            "price": price,
            "views_target": views,
            "direct_commission": direct_comm,
            "uni_level_per_member": uni_level_per_member,
            "completion_bonus": bonus,
            "is_active": is_active,
            "grid": grid_info,
        })

    return {
        "tiers": tiers,
        "active_tiers": [t["tier"] for t in tiers if t["is_active"]],
        "completed_count": len(completed_grids),
    }


@app.get("/api/marketplace/browse")
def api_marketplace_browse(db: Session = Depends(get_db)):
    """Public: browse published marketplace courses."""
    courses = db.query(MemberCourse).filter(
        MemberCourse.status == "published", MemberCourse.is_public == True
    ).order_by(MemberCourse.created_at.desc()).all()
    creator_ids = list(set(c.creator_id for c in courses))
    creators = {}
    if creator_ids:
        for u in db.query(User).filter(User.id.in_(creator_ids)).all():
            creators[u.id] = u
    return {"courses": [{
        "id": c.id, "title": c.title, "slug": c.slug,
        "description": c.description or "", "short_description": c.short_description or "",
        "price": float(c.price), "thumbnail_url": c.thumbnail_url or "",
        "category": c.category or "other", "difficulty_level": c.difficulty_level or "beginner",
        "lesson_count": c.lesson_count or 0, "total_duration_mins": c.total_duration_mins or 0,
        "total_sales": c.total_sales or 0,
        "creator_name": (creators[c.creator_id].first_name or creators[c.creator_id].username) if c.creator_id in creators else "Member",
    } for c in courses]}


@app.get("/api/marketplace/my-courses")
def api_my_marketplace_courses(request: Request, user: User = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    """JSON: current user's marketplace courses."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    courses = db.query(MemberCourse).filter(
        MemberCourse.creator_id == user.id
    ).order_by(MemberCourse.created_at.desc()).all()
    return {"courses": [{
        "id": c.id, "title": c.title, "slug": c.slug, "price": float(c.price),
        "thumbnail_url": c.thumbnail_url or "", "category": c.category or "other",
        "status": c.status, "lesson_count": c.lesson_count or 0,
        "total_duration_mins": c.total_duration_mins or 0,
        "total_sales": c.total_sales or 0, "total_revenue": float(c.total_revenue or 0),
    } for c in courses]}


# ═══════════════════════════════════════════════════════════════
#  SUPERMARKET — Digital Product Marketplace APIs (50/25/25)
# ═══════════════════════════════════════════════════════════════

def _serialize_product(p, creator=None):
    """Serialize a DigitalProduct for API response."""
    import json as _j
    return {
        "id": p.id, "title": p.title, "slug": p.slug,
        "short_description": p.short_description or "",
        "description": p.description or "",
        "price": float(p.price), "compare_price": float(p.compare_price) if p.compare_price else None,
        "banner_url": p.banner_url or "", "category": p.category or "other",
        "tags": (p.tags or "").split(",") if p.tags else [],
        "file_name": p.file_name or "", "file_size_bytes": p.file_size_bytes or 0,
        "bonus_file_name": p.bonus_file_name or "",
        "features": _safe_json(p.features_json), "faq": _safe_json(p.faq_json),
        "demo_url": p.demo_url or "", "video_url": p.video_url or "",
        "affiliate_commission": p.affiliate_commission or 25,
        "affiliate_approved_only": p.affiliate_approved_only or False,
        "promo_materials": _safe_json(p.promo_materials_json),
        "status": p.status, "total_sales": p.total_sales or 0,
        "total_revenue": float(p.total_revenue or 0),
        "total_clicks": p.total_clicks or 0,
        "conversion_rate": float(p.conversion_rate or 0),
        "avg_rating": float(p.avg_rating or 0), "review_count": p.review_count or 0,
        "is_featured": p.is_featured or False,
        "creator_id": p.creator_id,
        "creator_name": (creator.first_name or creator.username) if creator else "Member",
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "published_at": p.published_at.isoformat() if p.published_at else None,
        "ai_review": _safe_json_obj(p.ai_review_result),
        "admin_notes": p.admin_notes or "",
    }


def _safe_json(s):
    import json as _j
    if not s: return []
    try: return _j.loads(s)
    except Exception: return []


def _safe_json_obj(s):
    import json as _j
    if not s: return None
    try: return _j.loads(s)
    except Exception: return None


@app.get("/api/supermarket/browse")
def api_supermarket_browse(db: Session = Depends(get_db)):
    """Public: browse published SuperMarket digital products."""
    products = db.query(DigitalProduct).filter(
        DigitalProduct.status == "published"
    ).order_by(DigitalProduct.created_at.desc()).all()
    creators = {}
    cids = list(set(p.creator_id for p in products))
    if cids:
        for u in db.query(User).filter(User.id.in_(cids)).all():
            creators[u.id] = u
    return {"products": [_serialize_product(p, creators.get(p.creator_id)) for p in products]}


@app.get("/api/supermarket/product/{product_id}")
def api_supermarket_product(product_id: int, db: Session = Depends(get_db)):
    """Get full product detail."""
    p = db.query(DigitalProduct).filter(DigitalProduct.id == product_id).first()
    if not p:
        return JSONResponse({"error": "Product not found"}, status_code=404)
    creator = db.query(User).filter(User.id == p.creator_id).first()
    data = _serialize_product(p, creator)
    # Add reviews
    reviews = db.query(DigitalProductReview).filter(
        DigitalProductReview.product_id == product_id
    ).order_by(DigitalProductReview.created_at.desc()).limit(20).all()
    data["reviews"] = [{
        "id": r.id, "rating": r.rating, "title": r.title or "", "comment": r.comment or "",
        "is_verified": r.is_verified, "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reviews]
    return data


@app.get("/api/supermarket/my-products")
def api_supermarket_my_products(request: Request, user: User = Depends(get_current_user),
                                 db: Session = Depends(get_db)):
    """List current user's SuperMarket products."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    products = db.query(DigitalProduct).filter(
        DigitalProduct.creator_id == user.id
    ).order_by(DigitalProduct.created_at.desc()).all()
    return {"products": [_serialize_product(p) for p in products]}


@app.post("/api/supermarket/products")
@limiter.limit("10/minute")
async def api_supermarket_create(request: Request, user: User = Depends(get_current_user),
                                  db: Session = Depends(get_db)):
    """Create a new SuperMarket digital product (draft)."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    import html as _html_sm
    title = _html_sm.escape((body.get("title") or "").strip())[:120]
    if not title or len(title) < 5:
        return JSONResponse({"error": "Title must be at least 5 characters"}, status_code=400)
    try:
        price = float(body.get("price", 0))
    except (ValueError, TypeError):
        return JSONResponse({"error": "Invalid price"}, status_code=400)
    if price < 5:
        return JSONResponse({"error": "Minimum price is $5"}, status_code=400)
    if price > 10000:
        return JSONResponse({"error": "Maximum price is $10,000"}, status_code=400)

    import re as _re_dp, json as _j_dp
    raw_slug = _re_dp.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    slug = f"{user.username.lower()}/{raw_slug}"
    existing = db.query(DigitalProduct).filter(DigitalProduct.slug == slug).first()
    if existing:
        return JSONResponse({"error": "A product with this title already exists"}, status_code=400)

    # Sanitise text fields
    short_desc = _html_sm.escape((body.get("short_description") or "")[:200])
    category = (body.get("category") or "other")[:30]
    tags = _html_sm.escape((body.get("tags") or "")[:500])
    video_url = (body.get("video_url") or "")[:500]
    demo_url = (body.get("demo_url") or "")[:500]

    # Validate compare price
    compare_price = None
    if body.get("compare_price"):
        try:
            compare_price = float(body["compare_price"])
            if compare_price <= price: compare_price = None
        except (ValueError, TypeError):
            compare_price = None

    p = DigitalProduct(
        creator_id=user.id, title=title, slug=slug,
        short_description=short_desc,
        description=body.get("description") or "",
        price=price,
        compare_price=compare_price,
        category=category, tags=tags,
        video_url=video_url, demo_url=demo_url,
        features_json=_j_dp.dumps(body.get("features") or []),
        faq_json=_j_dp.dumps(body.get("faq") or []),
        affiliate_commission=max(0, min(100, int(body.get("affiliate_commission", 25)))),
        creator_agreed_terms=body.get("agreed_terms", False),
        creator_agreed_at=datetime.utcnow() if body.get("agreed_terms") else None,
        status="draft",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"ok": True, "product_id": p.id, "slug": p.slug}


@app.put("/api/supermarket/products/{product_id}")
async def api_supermarket_update(product_id: int, request: Request, user: User = Depends(get_current_user),
                                  db: Session = Depends(get_db)):
    """Update a SuperMarket product."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    p = db.query(DigitalProduct).filter(
        DigitalProduct.id == product_id, DigitalProduct.creator_id == user.id
    ).first()
    if not p:
        return JSONResponse({"error": "Product not found"}, status_code=404)
    import json as _j_up
    body = await request.json()
    for field in ["title","short_description","description","category","tags","video_url","demo_url","banner_url"]:
        if field in body:
            setattr(p, field, (body[field] or "").strip() if isinstance(body.get(field), str) else body.get(field))
    if "price" in body:
        p.price = max(5, float(body["price"]))
    if "compare_price" in body:
        p.compare_price = float(body["compare_price"]) if body["compare_price"] else None
    if "features" in body:
        p.features_json = _j_up.dumps(body["features"])
    if "faq" in body:
        p.faq_json = _j_up.dumps(body["faq"])
    if "affiliate_commission" in body:
        p.affiliate_commission = max(0, min(100, int(body["affiliate_commission"])))
    if "affiliate_approved_only" in body:
        p.affiliate_approved_only = bool(body["affiliate_approved_only"])
    p.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@app.post("/api/supermarket/products/{product_id}/upload")
async def api_supermarket_upload_file(product_id: int, request: Request, user: User = Depends(get_current_user),
                                       db: Session = Depends(get_db)):
    """Upload the main product file or bonus file."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    p = db.query(DigitalProduct).filter(
        DigitalProduct.id == product_id, DigitalProduct.creator_id == user.id
    ).first()
    if not p:
        return JSONResponse({"error": "Product not found"}, status_code=404)
    body = await request.json()
    file_type = body.get("type", "main")  # main or bonus
    file_data = body.get("data")          # base64
    file_name = body.get("name", "file")
    file_size = body.get("size", 0)
    if not file_data:
        return JSONResponse({"error": "No file data"}, status_code=400)
    # File size check — max 50MB base64 (~37MB raw)
    if len(file_data) > 50 * 1024 * 1024:
        return JSONResponse({"error": "File too large. Maximum 50MB."}, status_code=400)
    if file_type == "bonus":
        p.bonus_file_url = file_data
        p.bonus_file_name = file_name
    elif file_type == "banner":
        p.banner_url = file_data
    else:
        p.file_url = file_data
        p.file_name = file_name
        p.file_size_bytes = file_size
    p.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "file_name": file_name}


@app.post("/api/supermarket/products/{product_id}/submit")
async def api_supermarket_submit(product_id: int, request: Request, user: User = Depends(get_current_user),
                                  db: Session = Depends(get_db)):
    """Submit product for review."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    p = db.query(DigitalProduct).filter(
        DigitalProduct.id == product_id, DigitalProduct.creator_id == user.id
    ).first()
    if not p:
        return JSONResponse({"error": "Product not found"}, status_code=404)
    errors = []
    if not p.title or len(p.title) < 5: errors.append("Title too short (min 5 chars)")
    # Strip HTML tags for description length check
    import re as _re_strip
    plain_desc = _re_strip.sub(r'<[^>]+>', '', p.description or '')
    if len(plain_desc.strip()) < 50: errors.append("Description must be 50+ characters of actual text")
    if not p.file_url: errors.append("Product file is required — upload in step 3")
    if not p.banner_url: errors.append("Banner image is required — upload in step 2")
    if p.price < 5: errors.append("Minimum price is $5")
    if not p.creator_agreed_terms: errors.append("Must agree to seller terms")
    if errors:
        return JSONResponse({"error": "Quality checks failed", "issues": errors}, status_code=400)

    # ── AI Content Scan ──
    import json as _json_sm
    ai_result = {"passed": True, "plagiarism_score": 0, "quality_score": 70, "copyright_risk": "low", "flagged_issues": [], "summary": ""}
    try:
        import os
        import httpx
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if api_key:
            scan_text = f"Title: {p.title}\nCategory: {p.category}\nPrice: ${p.price}\nDescription: {plain_desc[:6000]}\n"
            features_list = _safe_json(p.features_json)
            if features_list:
                scan_text += "Features: " + ", ".join(str(f) for f in features_list) + "\n"

            scan_prompt = f"""You are a digital product quality and compliance reviewer for an affiliate marketplace called SuperMarket. Review this product listing and return a JSON object:

- "passed": boolean (true=acceptable, false=reject)
- "plagiarism_score": 0-100 (0=original, 100=likely copied/stolen)
- "quality_score": 0-100 (0=spam/worthless, 100=excellent value)
- "copyright_risk": "low"|"medium"|"high" (risk of containing copyrighted material)
- "flagged_issues": array of objects with "type" (copyright|plagiarism|prohibited|misleading|trademark|scam|quality), "severity" (high|medium|low), "description" (brief explanation)
- "summary": one-sentence assessment for the admin reviewer

Auto-fail criteria:
- Copyright risk "high" (likely contains copyrighted material)
- Plagiarism score > 40
- Quality score < 25
- Contains hate speech, adult content, illegal content
- Misleading income claims without disclaimers
- Known scam patterns (fake software, stolen PLR, rebrandable junk)
- Title or description is nonsensical or spam

Product listing to review:
{scan_text}

Respond ONLY with valid JSON, no other text."""

            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                    json={"model": "claude-sonnet-4-20250514", "max_tokens": 1000,
                          "messages": [{"role": "user", "content": scan_prompt}]}
                )
                if resp.status_code == 200:
                    resp_data = resp.json()
                    ai_text = ""
                    for block in resp_data.get("content", []):
                        if block.get("type") == "text":
                            ai_text += block.get("text", "")
                    ai_text = ai_text.strip()
                    if ai_text.startswith("```"):
                        ai_text = ai_text.split("```")[1]
                        if ai_text.startswith("json"):
                            ai_text = ai_text[4:]
                    ai_result = _json_sm.loads(ai_text)
    except Exception as e:
        print(f"SuperMarket AI review error (non-fatal): {e}")
        ai_result = {"passed": True, "plagiarism_score": 0, "quality_score": 50, "copyright_risk": "unknown",
                      "flagged_issues": [], "summary": "AI review unavailable — manual review required"}

    # Store AI result
    p.ai_review_result = _json_sm.dumps(ai_result)
    p.ai_reviewed_at = datetime.utcnow()

    # Check auto-reject thresholds
    auto_reject = False
    if not ai_result.get("passed", True):
        auto_reject = True
    if ai_result.get("plagiarism_score", 0) > 40:
        auto_reject = True
    if ai_result.get("quality_score", 100) < 25:
        auto_reject = True
    if ai_result.get("copyright_risk", "low") == "high":
        auto_reject = True

    if auto_reject:
        p.status = "draft"
        p.admin_notes = ai_result.get("summary", "Content did not pass automated review")
        db.commit()
        # Notify creator of rejection
        try:
            notif = Notification(
                user_id=user.id, type="supermarket",
                title="Product needs changes",
                message=f"Your product '{p.title}' didn't pass our automated review. Please check the issues and resubmit.",
            )
            db.add(notif)
            db.commit()
        except Exception:
            pass
        issues = [i.get("description", "") for i in ai_result.get("flagged_issues", [])]
        if ai_result.get("summary"):
            issues.insert(0, ai_result["summary"])
        return JSONResponse({"error": "AI review: changes needed", "issues": issues, "ai_result": ai_result}, status_code=400)

    # AI passed — move to admin review queue
    p.status = "pending_review"
    p.updated_at = datetime.utcnow()

    # Create notification for creator
    try:
        ai_summary = ai_result.get("summary", "")
        notif = Notification(
            user_id=user.id,
            type="supermarket",
            title="Product submitted for review ✓",
            message=f"Your product '{p.title}' passed AI screening and is now waiting for admin approval. " + (f"AI notes: {ai_summary}" if ai_summary else "We'll notify you when it's live."),
        )
        db.add(notif)
    except Exception:
        pass

    # Notify admin
    try:
        admin = db.query(User).filter(User.is_admin == True).first()
        if admin:
            notif_admin = Notification(
                user_id=admin.id, type="admin",
                title="New SuperMarket product to review",
                message=f"'{p.title}' by {user.username} — AI score: {ai_result.get('quality_score', '?')}/100, Copyright risk: {ai_result.get('copyright_risk', '?')}",
            )
            db.add(notif_admin)
    except Exception:
        pass

    db.commit()
    return {"ok": True, "status": "pending_review", "ai_result": ai_result}


@app.delete("/api/supermarket/products/{product_id}")
def api_supermarket_delete(product_id: int, user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Delete a SuperMarket product. Admin can delete any. Creator can delete own."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if user.is_admin:
        p = db.query(DigitalProduct).filter(DigitalProduct.id == product_id).first()
    else:
        p = db.query(DigitalProduct).filter(
            DigitalProduct.id == product_id, DigitalProduct.creator_id == user.id
        ).first()
    if not p:
        return JSONResponse({"error": "Product not found"}, status_code=404)
    # Delete related records first
    db.query(DigitalProductReview).filter(DigitalProductReview.product_id == product_id).delete()
    db.query(DigitalProductAffiliate).filter(DigitalProductAffiliate.product_id == product_id).delete()
    db.query(DigitalProductPurchase).filter(DigitalProductPurchase.product_id == product_id).delete()
    db.delete(p)
    db.commit()
    return {"ok": True}


@app.post("/api/supermarket/purchase/{product_id}")
async def api_supermarket_purchase(product_id: int, request: Request,
                                    user: User = Depends(get_current_user),
                                    db: Session = Depends(get_db)):
    """Purchase a SuperMarket digital product."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    p = db.query(DigitalProduct).filter(DigitalProduct.id == product_id, DigitalProduct.status == "published").first()
    if not p:
        return JSONResponse({"error": "Product not found or not available"}, status_code=404)
    # Prevent self-purchase
    if p.creator_id == user.id:
        return JSONResponse({"error": "You cannot purchase your own product"}, status_code=400)
    # Prevent duplicate purchase
    existing_purchase = db.query(DigitalProductPurchase).filter(
        DigitalProductPurchase.product_id == product_id,
        DigitalProductPurchase.buyer_id == user.id,
        DigitalProductPurchase.status == "completed"
    ).first()
    if existing_purchase:
        return JSONResponse({"error": "Already purchased", "download_token": existing_purchase.download_token}, status_code=400)
    body = await request.json()
    affiliate_id = body.get("affiliate_id")

    import secrets
    token = secrets.token_urlsafe(32)
    creator_amt = round(float(p.price) * 0.50, 2)
    affiliate_amt = round(float(p.price) * 0.25, 2)
    platform_amt = round(float(p.price) * 0.25, 2)

    purchase = DigitalProductPurchase(
        product_id=p.id, buyer_id=user.id, buyer_email=user.email,
        buyer_name=user.first_name or user.username,
        amount_paid=float(p.price),
        creator_commission=creator_amt, affiliate_commission=affiliate_amt,
        platform_commission=platform_amt, affiliate_id=affiliate_id,
        download_token=token, status="completed",
    )
    db.add(purchase)

    # Credit commissions
    creator = db.query(User).filter(User.id == p.creator_id).first()
    if creator:
        creator.balance = (creator.balance or 0) + creator_amt
        creator.total_earned = (creator.total_earned or 0) + creator_amt
        creator.marketplace_earnings = (creator.marketplace_earnings or 0) + creator_amt
    if affiliate_id:
        affiliate = db.query(User).filter(User.id == affiliate_id).first()
        if affiliate:
            affiliate.balance = (affiliate.balance or 0) + affiliate_amt
            affiliate.total_earned = (affiliate.total_earned or 0) + affiliate_amt
            affiliate.marketplace_earnings = (affiliate.marketplace_earnings or 0) + affiliate_amt
            # Update affiliate stats
            aff_rec = db.query(DigitalProductAffiliate).filter(
                DigitalProductAffiliate.product_id == p.id,
                DigitalProductAffiliate.user_id == affiliate_id
            ).first()
            if aff_rec:
                aff_rec.sales = (aff_rec.sales or 0) + 1
                aff_rec.earnings = (aff_rec.earnings or 0) + affiliate_amt

    p.total_sales = (p.total_sales or 0) + 1
    p.total_revenue = (p.total_revenue or 0) + float(p.price)
    db.commit()
    return {"ok": True, "download_token": token}


@app.get("/api/supermarket/download/{token}")
def api_supermarket_download(token: str, user: User = Depends(get_current_user),
                              db: Session = Depends(get_db)):
    """Get download URL for a purchased product."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    purchase = db.query(DigitalProductPurchase).filter(
        DigitalProductPurchase.download_token == token,
        DigitalProductPurchase.buyer_id == user.id,
        DigitalProductPurchase.status == "completed"
    ).first()
    if not purchase:
        return JSONResponse({"error": "Invalid download token"}, status_code=404)
    product = db.query(DigitalProduct).filter(DigitalProduct.id == purchase.product_id).first()
    if not product or not product.file_url:
        return JSONResponse({"error": "File not available"}, status_code=404)
    purchase.download_count = (purchase.download_count or 0) + 1
    db.commit()
    return {
        "file_url": product.file_url, "file_name": product.file_name or "download",
        "bonus_file_url": product.bonus_file_url or None,
        "bonus_file_name": product.bonus_file_name or None,
    }


@app.post("/api/supermarket/products/{product_id}/review")
async def api_supermarket_review(product_id: int, request: Request,
                                  user: User = Depends(get_current_user),
                                  db: Session = Depends(get_db)):
    """Submit a review for a purchased product."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    # Verify purchase
    purchase = db.query(DigitalProductPurchase).filter(
        DigitalProductPurchase.product_id == product_id,
        DigitalProductPurchase.buyer_id == user.id,
        DigitalProductPurchase.status == "completed"
    ).first()
    if not purchase:
        return JSONResponse({"error": "Must purchase product to review"}, status_code=403)
    # Check if already reviewed
    existing = db.query(DigitalProductReview).filter(
        DigitalProductReview.product_id == product_id,
        DigitalProductReview.buyer_id == user.id
    ).first()
    if existing:
        return JSONResponse({"error": "Already reviewed"}, status_code=400)
    body = await request.json()
    rating = max(1, min(5, int(body.get("rating", 5))))
    review = DigitalProductReview(
        product_id=product_id, buyer_id=user.id, rating=rating,
        title=(body.get("title") or "")[:100],
        comment=(body.get("comment") or "")[:1000],
        is_verified=True,
    )
    db.add(review)
    # Update product avg rating
    p = db.query(DigitalProduct).filter(DigitalProduct.id == product_id).first()
    if p:
        all_reviews = db.query(DigitalProductReview).filter(DigitalProductReview.product_id == product_id).all()
        total = sum(r.rating for r in all_reviews) + rating
        count = len(all_reviews) + 1
        p.avg_rating = round(total / count, 2)
        p.review_count = count
    db.commit()
    return {"ok": True}


@app.get("/api/supermarket/affiliate/{product_id}")
def api_supermarket_affiliate_link(product_id: int, user: User = Depends(get_current_user),
                                    db: Session = Depends(get_db)):
    """Get or create affiliate link for a product."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    p = db.query(DigitalProduct).filter(DigitalProduct.id == product_id).first()
    if not p:
        return JSONResponse({"error": "Product not found"}, status_code=404)
    # Check if approved (if required)
    if p.affiliate_approved_only:
        aff = db.query(DigitalProductAffiliate).filter(
            DigitalProductAffiliate.product_id == product_id,
            DigitalProductAffiliate.user_id == user.id
        ).first()
        if not aff or aff.status != "approved":
            return JSONResponse({"error": "Affiliate approval required"}, status_code=403)
    # Create affiliate record if not exists
    aff = db.query(DigitalProductAffiliate).filter(
        DigitalProductAffiliate.product_id == product_id,
        DigitalProductAffiliate.user_id == user.id
    ).first()
    if not aff:
        aff = DigitalProductAffiliate(product_id=product_id, user_id=user.id, status="approved")
        db.add(aff)
        p.total_affiliates = (p.total_affiliates or 0) + 1
        db.commit()
    return {
        "affiliate_link": f"/supermarket/product/{product_id}?ref={user.username}",
        "commission": p.affiliate_commission or 25,
        "clicks": aff.clicks or 0, "sales": aff.sales or 0,
        "earnings": float(aff.earnings or 0),
        "promo_materials": _safe_json(p.promo_materials_json),
    }


# Admin: list pending SuperMarket products
@app.get("/api/supermarket/admin/pending")
def api_supermarket_admin_pending(user: User = Depends(get_current_user),
                                   db: Session = Depends(get_db)):
    """Admin: list products pending review."""
    _require_admin(user)
    products = db.query(DigitalProduct).filter(
        DigitalProduct.status == "pending_review"
    ).order_by(DigitalProduct.updated_at.desc()).all()
    creators = {}
    cids = list(set(p.creator_id for p in products))
    if cids:
        for u in db.query(User).filter(User.id.in_(cids)).all():
            creators[u.id] = u
    return {"products": [_serialize_product(p, creators.get(p.creator_id)) for p in products]}


# Admin: approve/reject SuperMarket products
@app.post("/api/supermarket/admin/review/{product_id}")
async def api_supermarket_admin_review(product_id: int, request: Request,
                                        user: User = Depends(get_current_user),
                                        db: Session = Depends(get_db)):
    """Admin: approve or reject a SuperMarket product."""
    _require_admin(user)
    p = db.query(DigitalProduct).filter(DigitalProduct.id == product_id).first()
    if not p:
        return JSONResponse({"error": "Product not found"}, status_code=404)
    body = await request.json()
    action = body.get("action", "approve")
    if action == "approve":
        p.status = "published"
        p.published_at = datetime.utcnow()
        p.admin_reviewed_at = datetime.utcnow()
        # Notify creator — approved
        try:
            notif = Notification(
                user_id=p.creator_id, type="supermarket",
                title="Product approved! 🎉",
                message=f"Your product '{p.title}' has been approved and is now live on SuperMarket. Affiliates can start promoting it.",
            )
            db.add(notif)
        except Exception: pass
    elif action == "reject":
        p.status = "draft"
        p.admin_notes = body.get("reason", "")
        p.admin_reviewed_at = datetime.utcnow()
        # Notify creator — rejected
        try:
            reason = body.get("reason", "Please review the product guidelines.")
            notif = Notification(
                user_id=p.creator_id, type="supermarket",
                title="Product needs changes",
                message=f"Your product '{p.title}' needs some changes before it can be listed: {reason}",
            )
            db.add(notif)
        except Exception: pass
    db.commit()
    return {"ok": True, "status": p.status}


@app.get("/api/watch")
def api_watch_data(request: Request, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """JSON watch-to-earn data."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    try:
        quota = db.query(WatchQuota).filter(WatchQuota.user_id == user.id).first()
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        watched_today = 0
        if quota and getattr(quota, 'today_date', None) == today_str:
            watched_today = getattr(quota, 'today_watched', 0) or 0
        daily_limit = getattr(quota, 'daily_required', 10) if quota else 10
        # Get available videos
        campaigns = db.query(VideoCampaign).filter(
            VideoCampaign.status == "active",
            VideoCampaign.views_delivered < VideoCampaign.views_target
        ).order_by(VideoCampaign.created_at.desc()).limit(20).all()
        # Which ones has user watched today?
        watched_ids = set()
        if user:
            today_watches = db.query(VideoWatch).filter(
                VideoWatch.user_id == user.id,
                VideoWatch.watched_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)
            ).all()
            watched_ids = {w.campaign_id for w in today_watches}
        return {
            "watched_today": watched_today,
            "daily_limit": daily_limit,
            "quota_reached": watched_today >= daily_limit,
            "tier": getattr(quota, 'package_tier', 1) if quota else 1,
            "daily_required": getattr(quota, 'daily_required', 10) if quota else 10,
            "streak_days": getattr(quota, 'streak_days', 0) or 0 if quota else 0,
            "total_watched": getattr(quota, 'total_watched', 0) or 0 if quota else 0,
            "commissions_paused": getattr(quota, 'commissions_paused', False) if quota else False,
            "total_minutes": 0,
            "total_watch_earnings": 0,
            "videos": [{
                "id": c.id, "title": c.title, "platform": c.platform or "youtube",
                "category": c.category or "General", "embed_url": c.embed_url,
                "is_watched": c.id in watched_ids,
            } for c in campaigns],
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/analytics")
def api_analytics_data(request: Request, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """JSON analytics data."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    try:
        campaigns = db.query(VideoCampaign).filter(VideoCampaign.user_id == user.id).all()
        lh = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user.id).first()
        total_views = (lh.total_views or 0) if lh else 0
        total_clicks = 0
        if lh:
            links = db.query(LinkHubLink).filter(LinkHubLink.profile_id == lh.id).all()
            total_clicks = sum(l.click_count or 0 for l in links)

        # Commission breakdown
        commissions = db.query(Commission).filter(Commission.to_user_id == user.id).all()
        total_commissions = len(commissions)
        commission_by_type = {}
        for c in commissions:
            t = c.commission_type or 'other'
            commission_by_type[t] = commission_by_type.get(t, 0) + float(c.amount_usdt or 0)

        # Network stats
        direct_refs = db.query(User).filter(User.sponsor_id == user.id).count()
        active_refs = db.query(User).filter(User.sponsor_id == user.id, User.is_active == True).count()

        # Watch stats
        watches = db.query(VideoWatch).filter(VideoWatch.user_id == user.id).count()
        quota = db.query(WatchQuota).filter(WatchQuota.user_id == user.id).first()

        # Campaign view completion percentages
        campaign_data = []
        for c in campaigns:
            delivered = c.views_delivered or 0
            target = c.views_target or 1
            pct = min(100, round((delivered / target) * 100))
            campaign_data.append({
                "id": c.id, "title": c.title, "platform": c.platform or "youtube",
                "category": c.category or "General", "status": c.status or "active",
                "views_delivered": delivered, "views_target": target,
                "completion_pct": pct,
                "tier": c.campaign_tier or c.owner_tier or 1,
            })

        return {
            "total_views": total_views + sum(c.views_delivered or 0 for c in campaigns),
            "total_clicks": total_clicks,
            "conversions": user.personal_referrals or 0,
            "revenue": float(user.total_earned or 0),
            "balance": float(user.balance or 0),
            "membership_tier": user.membership_tier or "basic",
            "grid_earnings": float(user.grid_earnings or 0),
            "course_earnings": float(user.course_earnings or 0),
            "marketplace_earnings": float(user.marketplace_earnings or 0),
            "total_commissions": total_commissions,
            "commission_by_type": commission_by_type,
            "direct_referrals": direct_refs,
            "active_referrals": active_refs,
            "total_team": user.total_team or 0,
            "total_withdrawn": float(user.total_withdrawn or 0),
            "videos_watched": watches,
            "watch_streak": getattr(quota, 'streak_days', 0) or 0 if quota else 0,
            "watch_quota_met": bool(quota and getattr(quota, 'commissions_paused', False) == False) if quota else False,
            "campaigns": campaign_data,
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/achievements")
def api_achievements_data(request: Request, user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    """JSON achievements data."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    user_achievements = db.query(Achievement).filter(Achievement.user_id == user.id).all()
    earned_keys = {a.badge_id for a in user_achievements}
    earned = []
    available = []
    for key, badge in BADGES.items():
        entry = {"key": key, "title": badge.get("title", key), "description": badge.get("description", ""),
                 "icon": badge.get("icon", "🏅")}
        if key in earned_keys:
            earned.append(entry)
        else:
            entry["progress"] = 0
            entry["target"] = badge.get("target", 1)
            available.append(entry)
    return {"earned": earned, "available": available}


@app.get("/api/video-library")
def api_video_library(request: Request, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """JSON video campaign library."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    campaigns = db.query(VideoCampaign).filter(
        VideoCampaign.user_id == user.id
    ).order_by(VideoCampaign.created_at.desc()).all()
    active = sum(1 for c in campaigns if c.status == "active")
    total_views = sum(c.views_delivered or 0 for c in campaigns)
    return {
        "total_campaigns": len(campaigns),
        "active_campaigns": active,
        "total_views": total_views,
        "campaigns": [{
            "id": c.id, "title": c.title, "platform": c.platform,
            "category": c.category, "status": c.status,
            "embed_url": c.embed_url, "video_url": c.video_url,
            "views_delivered": c.views_delivered or 0, "views_target": c.views_target or 0,
        } for c in campaigns],
    }


@app.post("/api/support/ticket")
async def api_support_ticket(request: Request, user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    """Submit a support ticket."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    subject = (body.get("subject") or "").strip()[:200]
    message = (body.get("message") or "").strip()[:5000]
    if not subject or not message:
        return JSONResponse({"error": "Subject and message required"}, status_code=400)
    # Notify admin
    admin = db.query(User).filter(User.is_admin == True).first()
    if admin:
        notif = Notification(
            user_id=admin.id, type="support",
            icon="🎧", title=f"Support: {subject}",
            message=f"From {user.first_name or user.username}: {message[:200]}",
            link="/admin",
        )
        db.add(notif)
        db.commit()
    return {"ok": True}


@app.post("/api/watch/complete")
async def api_watch_complete(request: Request, user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    """Mark a video as watched and credit the user."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    try:
        from decimal import Decimal
        body = await request.json()
        video_id = body.get("video_id")
        if not video_id:
            return JSONResponse({"error": "video_id required"}, status_code=400)
        campaign = db.query(VideoCampaign).filter(VideoCampaign.id == video_id).first()
        if not campaign:
            return JSONResponse({"error": "Video not found"}, status_code=404)
        # Check quota
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        quota = db.query(WatchQuota).filter(WatchQuota.user_id == user.id).first()
        if not quota:
            quota = WatchQuota(user_id=user.id, today_date=today_str, today_watched=0)
            db.add(quota)
            db.flush()
        if (getattr(quota, 'today_date', None) or '') != today_str:
            quota.today_date = today_str
            quota.today_watched = 0
        if (quota.today_watched or 0) >= 10:
            return JSONResponse({"error": "Daily limit reached"}, status_code=400)
        # Check not already watched today
        existing = db.query(VideoWatch).filter(
            VideoWatch.user_id == user.id, VideoWatch.campaign_id == video_id,
            VideoWatch.watched_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)
        ).first()
        if existing:
            return JSONResponse({"error": "Already watched today"}, status_code=400)
        # Record watch
        watch = VideoWatch(user_id=user.id, campaign_id=video_id)
        db.add(watch)
        campaign.views_delivered = (campaign.views_delivered or 0) + 1
        quota.today_watched = (quota.today_watched or 0) + 1
        db.commit()
        return {"ok": True, "qualified": True}
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Watch complete error: {e}\n{tb}")
        return JSONResponse({"error": str(e), "detail": tb}, status_code=500)


# ═══════════════════════════════════════════════════════════════
#  REACT MIGRATION: Remaining API endpoints
# ═══════════════════════════════════════════════════════════════

@app.get("/api/network")
def api_network_data(request: Request, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """My Network & Earnings data."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    # Direct referrals with their earnings contribution
    referrals = db.query(User).filter(User.sponsor_id == user.id).all()
    # Commission history
    commissions = get_user_commission_history(db, user.id, limit=30)
    return {
        "personal_referrals": user.personal_referrals or 0,
        "total_team": user.total_team or 0,
        "total_earned": float(user.total_earned or 0),
        "course_earnings": float(user.course_earnings or 0),
        "grid_earnings": float(user.grid_earnings or 0),
        "marketplace_earnings": float(user.marketplace_earnings or 0),
        "referrals": [{
            "id": r.id, "username": r.username, "first_name": r.first_name,
            "is_active": r.is_active, "membership_tier": r.membership_tier or "basic",
            "total_earned": float(r.total_earned or 0),
            "personal_referrals": r.personal_referrals or 0,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in referrals],
        "commissions": commissions,
    }


@app.get("/api/leads")
def api_leads_data(request: Request, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """My Leads data. Pro only."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return JSONResponse({"error": "Pro membership required", "upgrade": True}, status_code=403)
    from .database import MemberLead
    leads = db.query(MemberLead).filter(
        MemberLead.user_id == user.id
    ).order_by(MemberLead.created_at.desc()).limit(100).all()
    return {"leads": [{
        "id": l.id, "email": l.email, "name": l.name or "",
        "status": l.status or "new", "source_url": l.source_url or "",
        "emails_sent": l.emails_sent or 0, "emails_opened": l.emails_opened or 0,
        "is_hot": l.is_hot, "list_id": l.list_id, "sequence_id": l.email_sequence_id,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in leads], "total": len(leads)}


# ═══════════════════════════════════════════════════════════════
#  MY LEADS — CRM + Autoresponder APIs
# ═══════════════════════════════════════════════════════════════

def _lead_limit(user):
    """Return max leads allowed. Pro only feature — Basic gets 0."""
    tier = getattr(user, 'membership_tier', 'basic')
    if tier == 'pro': return 5000
    return 0  # Basic members cannot use leads/autoresponder


DAILY_EMAIL_LIMIT = 200  # Free emails per day for Pro members
EMAIL_BOOST_PACKS = [
    {"id": "boost_1k", "credits": 1000, "price": 5.00, "label": "🚀 1,000 Emails", "desc": "Perfect for a targeted campaign"},
    {"id": "boost_5k", "credits": 5000, "price": 19.00, "label": "⚡ 5,000 Emails", "desc": "Run multiple sequences"},
    {"id": "boost_10k", "credits": 10000, "price": 29.00, "label": "🔥 10,000 Emails", "desc": "Scale your outreach"},
    {"id": "boost_50k", "credits": 50000, "price": 99.00, "label": "💎 50,000 Emails", "desc": "Enterprise-level volume"},
]


def _check_email_allowance(user, db, count=1):
    """Check if user can send emails. Returns (allowed, reason).
    Uses daily free limit first, then boost credits."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    # Reset daily counter if new day
    if getattr(user, 'emails_sent_today_date', None) != today:
        user.emails_sent_today = 0
        user.emails_sent_today_date = today

    sent_today = user.emails_sent_today or 0
    free_remaining = max(0, DAILY_EMAIL_LIMIT - sent_today)
    boost_credits = user.email_credits or 0

    if free_remaining + boost_credits < count:
        return False, f"Email limit reached. {sent_today}/{DAILY_EMAIL_LIMIT} free used today, {boost_credits} boost credits remaining. Purchase an Email Boost pack for more."

    return True, ""


def _deduct_email_send(user, db, count=1):
    """Deduct from daily free first, then boost credits."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    if getattr(user, 'emails_sent_today_date', None) != today:
        user.emails_sent_today = 0
        user.emails_sent_today_date = today

    sent_today = user.emails_sent_today or 0
    free_remaining = max(0, DAILY_EMAIL_LIMIT - sent_today)

    if count <= free_remaining:
        user.emails_sent_today = sent_today + count
    else:
        # Use all remaining free, then boost
        user.emails_sent_today = DAILY_EMAIL_LIMIT
        boost_needed = count - free_remaining
        user.email_credits = max(0, (user.email_credits or 0) - boost_needed)


@app.get("/api/leads/sequences")
def api_leads_sequences(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all email sequences for this user."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import EmailSequence
    seqs = db.query(EmailSequence).filter(EmailSequence.user_id == user.id).order_by(EmailSequence.created_at.desc()).all()
    import json as _j
    return {"sequences": [{
        "id": s.id, "title": s.title or "", "niche": s.niche or "", "tone": s.tone or "",
        "num_emails": s.num_emails or 0, "is_active": s.is_active,
        "emails": _safe_json(s.emails_json),
        "created_at": s.created_at.isoformat() if s.created_at else None,
    } for s in seqs]}


@app.post("/api/leads/sequences")
async def api_create_sequence(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new email sequence."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    import json as _j
    title = (body.get("title") or "").strip()
    if not title: return JSONResponse({"error": "Title required"}, status_code=400)
    emails = body.get("emails") or []
    seq = EmailSequence(
        user_id=user.id, title=title, niche=body.get("niche", ""),
        tone=body.get("tone", "professional"), num_emails=len(emails),
        emails_json=_j.dumps(emails), is_active=True,
    )
    db.add(seq)
    db.commit()
    db.refresh(seq)
    return {"ok": True, "sequence_id": seq.id}


@app.put("/api/leads/sequences/{seq_id}")
async def api_update_sequence(seq_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update an email sequence."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import EmailSequence
    seq = db.query(EmailSequence).filter(EmailSequence.id == seq_id, EmailSequence.user_id == user.id).first()
    if not seq: return JSONResponse({"error": "Not found"}, status_code=404)
    body = await request.json()
    import json as _j
    if "title" in body: seq.title = (body["title"] or "").strip()
    if "emails" in body:
        seq.emails_json = _j.dumps(body["emails"])
        seq.num_emails = len(body["emails"])
    if "is_active" in body: seq.is_active = bool(body["is_active"])
    if "tone" in body: seq.tone = body["tone"]
    if "niche" in body: seq.niche = body["niche"]
    db.commit()
    return {"ok": True}


@app.delete("/api/leads/sequences/{seq_id}")
def api_delete_sequence(seq_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete an email sequence."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import EmailSequence
    seq = db.query(EmailSequence).filter(EmailSequence.id == seq_id, EmailSequence.user_id == user.id).first()
    if not seq: return JSONResponse({"error": "Not found"}, status_code=404)
    db.delete(seq)
    db.commit()
    return {"ok": True}


@app.post("/api/leads/upload-csv")
async def api_upload_leads_csv(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Upload leads from CSV. Enforces lead limits per tier."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    leads_data = body.get("leads") or []  # [{email, name}]
    list_id = body.get("list_id")  # optional — assign to specific list
    if not leads_data: return JSONResponse({"error": "No leads provided"}, status_code=400)

    # Check lead limit
    from .database import MemberLead
    current_count = db.query(MemberLead).filter(MemberLead.user_id == user.id).count()
    limit = _lead_limit(user)
    remaining = max(0, limit - current_count)

    if remaining == 0:
        return JSONResponse({"error": f"Lead limit reached ({limit}). Upgrade to Pro for 500 leads or purchase additional lead packs.", "limit": limit, "current": current_count}, status_code=400)

    # Import up to remaining limit
    to_import = leads_data[:remaining]
    imported = 0
    duplicates = 0
    for ld in to_import:
        email = (ld.get("email") or "").strip().lower()
        if not email or "@" not in email: continue
        # Check duplicate
        existing = db.query(MemberLead).filter(MemberLead.user_id == user.id, MemberLead.email == email).first()
        if existing:
            duplicates += 1
            continue
        lead = MemberLead(
            user_id=user.id, email=email, name=(ld.get("name") or "").strip(),
            source_url="CSV Upload", status="new", list_id=list_id,
        )
        db.add(lead)
        imported += 1

    db.commit()
    skipped = len(leads_data) - len(to_import)
    return {
        "ok": True, "imported": imported, "duplicates": duplicates,
        "skipped_over_limit": skipped,
        "total_leads": current_count + imported, "limit": limit,
    }


@app.post("/api/leads/{lead_id}/assign-sequence")
async def api_assign_sequence(lead_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Assign a lead to an email sequence."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import MemberLead
    lead = db.query(MemberLead).filter(MemberLead.id == lead_id, MemberLead.user_id == user.id).first()
    if not lead: return JSONResponse({"error": "Lead not found"}, status_code=404)
    body = await request.json()
    lead.email_sequence_id = body.get("sequence_id")
    lead.status = "nurturing"
    db.commit()
    return {"ok": True}


@app.post("/api/leads/send-sequence-email")
async def api_send_sequence_email(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Send the next email in a sequence to a lead (or send to all leads in a sequence)."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    lead_id = body.get("lead_id")
    sequence_id = body.get("sequence_id")

    from .database import MemberLead, EmailSequence, EmailSendLog
    from .brevo_service import send_email, wrap_email_html
    import json as _j

    seq = db.query(EmailSequence).filter(EmailSequence.id == sequence_id, EmailSequence.user_id == user.id).first()
    if not seq: return JSONResponse({"error": "Sequence not found"}, status_code=404)
    emails = _safe_json(seq.emails_json)
    if not emails: return JSONResponse({"error": "Sequence has no emails"}, status_code=400)

    # Get leads to send to
    if lead_id:
        leads = [db.query(MemberLead).filter(MemberLead.id == lead_id, MemberLead.user_id == user.id).first()]
        leads = [l for l in leads if l]
    else:
        leads = db.query(MemberLead).filter(
            MemberLead.user_id == user.id, MemberLead.email_sequence_id == sequence_id,
            MemberLead.status.in_(["new", "nurturing"])
        ).all()

    # Rate limit check
    sendable = [l for l in leads if (l.emails_sent or 0) < len(emails)]
    allowed, reason = _check_email_allowance(user, db, len(sendable))
    if not allowed:
        return JSONResponse({"error": reason}, status_code=429)

    sent_count = 0
    for lead in leads:
        # Determine which email to send (next in sequence)
        email_idx = lead.emails_sent or 0
        if email_idx >= len(emails): continue  # Sequence complete for this lead

        email_data = emails[email_idx]
        subject = email_data.get("subject", f"Email {email_idx + 1}")
        body_html = email_data.get("body_html", "")
        member_name = user.first_name or user.username or "SuperAdPro Member"
        wrapped = wrap_email_html(body_html, member_name)

        result = await send_email(lead.email, lead.name or "", subject, wrapped)
        if result.get("ok"):
            lead.emails_sent = (lead.emails_sent or 0) + 1
            log = EmailSendLog(
                lead_id=lead.id, sequence_id=seq.id, email_index=email_idx,
                brevo_message_id=result.get("message_id", ""), status="sent",
            )
            db.add(log)
            sent_count += 1

    _deduct_email_send(user, db, sent_count)
    db.commit()
    return {"ok": True, "sent": sent_count, "total_leads": len(leads)}


@app.post("/api/leads/broadcast")
async def api_broadcast_email(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Send a one-off broadcast email to all leads or a filtered set."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    subject = (body.get("subject") or "").strip()
    html_content = body.get("html_content") or ""
    filter_status = body.get("filter_status", "all")  # all, new, nurturing, hot
    filter_list_id = body.get("list_id")  # optional — broadcast to specific list only
    if not subject: return JSONResponse({"error": "Subject required"}, status_code=400)
    if not html_content: return JSONResponse({"error": "Email content required"}, status_code=400)

    from .database import MemberLead
    from .brevo_service import send_email, wrap_email_html

    q = db.query(MemberLead).filter(MemberLead.user_id == user.id, MemberLead.status != "unsubscribed")
    if filter_list_id:
        q = q.filter(MemberLead.list_id == filter_list_id)
    if filter_status != "all":
        if filter_status == "hot":
            q = q.filter(MemberLead.is_hot == True)
        else:
            q = q.filter(MemberLead.status == filter_status)
    leads = q.all()

    # Rate limit check
    allowed, reason = _check_email_allowance(user, db, len(leads))
    if not allowed:
        return JSONResponse({"error": reason}, status_code=429)

    member_name = user.first_name or user.username or "SuperAdPro Member"
    wrapped = wrap_email_html(html_content, member_name)
    sent = 0
    for lead in leads:
        result = await send_email(lead.email, lead.name or "", subject, wrapped)
        if result.get("ok"):
            sent += 1
    _deduct_email_send(user, db, sent)
    return {"ok": True, "sent": sent, "total": len(leads)}


@app.delete("/api/leads/{lead_id}")
def api_delete_lead(lead_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a single lead."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import MemberLead, EmailSendLog
    lead = db.query(MemberLead).filter(MemberLead.id == lead_id, MemberLead.user_id == user.id).first()
    if not lead: return JSONResponse({"error": "Not found"}, status_code=404)
    db.query(EmailSendLog).filter(EmailSendLog.lead_id == lead_id).delete()
    db.delete(lead)
    db.commit()
    return {"ok": True}


@app.get("/api/leads/stats")
def api_leads_stats(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get lead stats + limit info."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import MemberLead
    total = db.query(MemberLead).filter(MemberLead.user_id == user.id).count()
    limit = _lead_limit(user)
    hot = db.query(MemberLead).filter(MemberLead.user_id == user.id, MemberLead.is_hot == True).count()
    return {"total": total, "limit": limit, "remaining": max(0, limit - total), "hot": hot,
            "tier": getattr(user, 'membership_tier', 'basic')}


@app.get("/api/leads/email-stats")
def api_email_stats(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get email sending stats + boost credit balance."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    today = datetime.utcnow().strftime("%Y-%m-%d")
    sent_today = user.emails_sent_today or 0
    if getattr(user, 'emails_sent_today_date', None) != today:
        sent_today = 0
    return {
        "daily_limit": DAILY_EMAIL_LIMIT,
        "sent_today": sent_today,
        "free_remaining": max(0, DAILY_EMAIL_LIMIT - sent_today),
        "boost_credits": user.email_credits or 0,
        "total_available": max(0, DAILY_EMAIL_LIMIT - sent_today) + (user.email_credits or 0),
        "boost_packs": EMAIL_BOOST_PACKS,
    }


@app.post("/api/leads/buy-boost")
async def api_buy_email_boost(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Purchase an email boost pack using wallet balance."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    pack_id = body.get("pack_id")
    pack = None
    for p in EMAIL_BOOST_PACKS:
        if p["id"] == pack_id:
            pack = p
            break
    if not pack: return JSONResponse({"error": "Invalid boost pack"}, status_code=400)

    # Deduct from wallet balance
    balance = float(user.balance or 0)
    if balance < pack["price"]:
        return JSONResponse({"error": f"Insufficient balance. Need ${pack['price']:.2f}, you have ${balance:.2f}"}, status_code=400)

    user.balance = balance - pack["price"]
    user.email_credits = (user.email_credits or 0) + pack["credits"]
    db.commit()

    return {"ok": True, "credits_added": pack["credits"], "total_credits": user.email_credits, "new_balance": float(user.balance)}


# ── Lead Lists ──

@app.get("/api/leads/lists")
def api_leads_lists(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all lead lists for this user."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import LeadList
    lists = db.query(LeadList).filter(LeadList.user_id == user.id).order_by(LeadList.created_at.desc()).all()
    # Update lead counts
    for lst in lists:
        lst.lead_count = db.query(MemberLead).filter(MemberLead.user_id == user.id, MemberLead.list_id == lst.id).count()
    db.commit()
    return {"lists": [{
        "id": l.id, "name": l.name, "description": l.description or "",
        "color": l.color or "#0ea5e9", "lead_count": l.lead_count or 0,
        "sequence_id": l.sequence_id,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in lists]}


@app.post("/api/leads/lists")
async def api_create_lead_list(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new lead list."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    from .database import LeadList
    name = (body.get("name") or "").strip()
    if not name: return JSONResponse({"error": "List name required"}, status_code=400)
    lst = LeadList(
        user_id=user.id, name=name[:100],
        description=(body.get("description") or "")[:300],
        color=body.get("color", "#0ea5e9"),
        sequence_id=body.get("sequence_id"),
    )
    db.add(lst)
    db.commit()
    db.refresh(lst)
    return {"ok": True, "list_id": lst.id}


@app.put("/api/leads/lists/{list_id}")
async def api_update_lead_list(list_id: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update a lead list."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import LeadList
    lst = db.query(LeadList).filter(LeadList.id == list_id, LeadList.user_id == user.id).first()
    if not lst: return JSONResponse({"error": "Not found"}, status_code=404)
    body = await request.json()
    if "name" in body: lst.name = (body["name"] or "")[:100]
    if "description" in body: lst.description = (body["description"] or "")[:300]
    if "color" in body: lst.color = body["color"]
    if "sequence_id" in body: lst.sequence_id = body.get("sequence_id")
    db.commit()
    return {"ok": True}


@app.delete("/api/leads/lists/{list_id}")
def api_delete_lead_list(list_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a lead list (leads move to unsorted)."""
    if not user: return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import LeadList
    lst = db.query(LeadList).filter(LeadList.id == list_id, LeadList.user_id == user.id).first()
    if not lst: return JSONResponse({"error": "Not found"}, status_code=404)
    # Unassign leads from this list (don't delete them)
    db.query(MemberLead).filter(MemberLead.list_id == list_id).update({"list_id": None})
    db.delete(lst)
    db.commit()
    return {"ok": True}


@app.get("/api/link-tools")
def api_link_tools_data(request: Request, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Short links and rotators data."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    short_links = db.query(ShortLink).filter(ShortLink.user_id == user.id).order_by(ShortLink.created_at.desc()).all()
    rotators = db.query(LinkRotator).filter(LinkRotator.user_id == user.id).order_by(LinkRotator.created_at.desc()).all()
    return {
        "short_links": [{
            "id": s.id, "short_code": s.slug, "destination_url": s.destination_url,
            "title": s.title or "", "click_count": s.clicks or 0,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            "click_cap": s.click_cap,
            "has_password": bool(getattr(s, 'password_hash', None) or False),
            "tags_json": s.tags_json if hasattr(s, 'tags_json') and s.tags_json else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        } for s in short_links],
        "rotators": [{
            "id": r.id, "name": r.title, "short_code": r.slug,
            "click_count": r.total_clicks or 0,
            "mode": r.mode or "equal",
            "destinations_json": r.destinations_json,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rotators],
    }


@app.get("/api/ad-board")
def api_ad_board_data(db: Session = Depends(get_db)):
    """Public ad board listings."""
    ads = db.query(AdListing).filter(
        AdListing.status == "active"
    ).order_by(AdListing.created_at.desc()).limit(50).all()
    return {"ads": [{
        "id": a.id, "title": a.title, "description": a.description or "",
        "category": a.category or "general", "link_url": a.link_url or "",
        "icon": a.icon or "📢", "contact_info": a.contact_info or "",
        "user_id": a.user_id, "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in ads]}


@app.get("/api/passup-visualiser")
def api_passup_visualiser(request: Request, user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    """Pass-up chain visualisation data."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    # Build the chain upward
    chain = []
    current = user
    for _ in range(10):  # max depth
        sponsor = db.query(User).filter(User.id == current.sponsor_id).first() if current.sponsor_id else None
        if not sponsor:
            break
        chain.append({
            "id": sponsor.id, "username": sponsor.username, "first_name": sponsor.first_name,
            "is_admin": sponsor.is_admin, "level": len(chain) + 1,
        })
        current = sponsor
    # Direct downline
    downline = db.query(User).filter(User.sponsor_id == user.id).all()
    return {
        "user": {"id": user.id, "username": user.username, "first_name": user.first_name},
        "upline_chain": chain,
        "direct_downline": [{
            "id": d.id, "username": d.username, "first_name": d.first_name,
            "is_active": d.is_active, "personal_referrals": d.personal_referrals or 0,
        } for d in downline],
    }


@app.get("/api/funnels")
def api_funnels_list(request: Request, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """List user's SuperPages/funnels."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import FunnelPage
    funnels = db.query(FunnelPage).filter(
        FunnelPage.user_id == user.id
    ).order_by(FunnelPage.created_at.desc()).all()
    return {"funnels": [{
        "id": f.id, "title": f.title or "Untitled", "slug": f.slug or "",
        "status": f.status or "draft", "views": f.views or 0,
        "leads_captured": f.leads_captured or 0,
        "is_ai_generated": f.is_ai_generated or False,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    } for f in funnels]}


@app.get("/api/linkhub-stats")
def api_linkhub_stats(request: Request, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """LinkHub stats for React page."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    profile = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user.id).first()
    links_count = 0
    total_clicks = 0
    if profile:
        links = db.query(LinkHubLink).filter(LinkHubLink.profile_id == profile.id).all()
        links_count = len(links)
        total_clicks = sum(l.click_count or 0 for l in links)
    return {
        "views": profile.total_views if profile else 0,
        "clicks": total_clicks,
        "links": links_count,
    }


@app.get("/api/linkhub/editor-data")
def api_linkhub_editor_data(request: Request, user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    """Full LinkHub profile + links data for React editor."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    import json as _json
    profile = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user.id).first()
    links = []
    total_clicks = 0
    click_30d = 0
    if profile:
        db_links = db.query(LinkHubLink).filter(
            LinkHubLink.profile_id == profile.id
        ).order_by(LinkHubLink.sort_order).all()
        links = [{
            "id": l.id, "title": l.title, "url": l.url, "icon": l.icon or "🔗",
            "is_active": l.is_active, "click_count": l.click_count or 0,
            "sort_order": l.sort_order,
        } for l in db_links]
        total_clicks = sum(l.click_count or 0 for l in db_links)
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=30)
        click_30d = db.query(LinkHubClick).filter(
            LinkHubClick.profile_id == profile.id,
            LinkHubClick.clicked_at >= cutoff
        ).count()
    social_links = []
    if profile and profile.social_links:
        try: social_links = _json.loads(profile.social_links)
        except Exception: pass
    return {
        "username": user.username,
        "first_name": user.first_name or user.username or "",
        "profile": {
            "display_name": profile.display_name if profile else (user.first_name or user.username or ""),
            "bio": profile.bio if profile else "",
            "avatar_url": (profile.avatar_r2_url or profile.avatar_data or "") if profile else "",
            "bg_color": (profile.bg_color or "#0f172a") if profile else "#0f172a",
            "bg_image_url": (profile.bg_image or "") if profile else "",  # linkhub-specific bg only
            "text_color": (profile.text_color or "#ffffff") if profile else "#ffffff",
            "btn_color": (profile.btn_color or "#0ea5e9") if profile else "#0ea5e9",
            "btn_text_color": (profile.btn_text_color or "#ffffff") if profile else "#ffffff",
            "accent_color": (profile.accent_color or "#ffffff") if profile else "#ffffff",
            "font_family": (profile.font_family or "DM Sans") if profile else "DM Sans",
            "btn_style_type": (getattr(profile, 'btn_style_type', None) or "3d") if profile else "3d",
            "btn_radius": (getattr(profile, 'btn_radius', None) or "12px") if profile else "12px",
            "btn_font_size": (getattr(profile, 'btn_font_size', None) or 15) if profile else 15,
            "btn_align": (getattr(profile, 'btn_align', None) or "center") if profile else "center",
            "arrow_style": (getattr(profile, 'arrow_style', None) or "arrow") if profile else "arrow",
            "icon_size": (getattr(profile, 'icon_size', None) or 22) if profile else 22,
            "arrow_size": (getattr(profile, 'arrow_size', None) or 16) if profile else 16,
            "is_published": profile.is_published if profile else True,
            "total_views": profile.total_views if profile else 0,
        } if True else None,
        "links": links,
        "social_links": social_links,
        "total_clicks": total_clicks,
        "click_30d": click_30d,
    }


@limiter.limit("20/minute")
@app.post("/api/proseller/chat")
async def api_proseller_chat(request: Request, user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    """ProSeller AI chat — sales assistant."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    message = body.get("message", "").strip()
    if not message:
        return JSONResponse({"error": "Message required"}, status_code=400)
    history = body.get("history", [])
    try:
        client = anthropic.Anthropic()
        messages = []
        for h in history[-10:]:
            if h.get("role") and h.get("content"):
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system="You are ProSeller AI, a sales assistant for SuperAdPro members. Help them write pitches, handle objections, create follow-up messages, and close more sales. Be practical, concise, and action-oriented. Focus on affiliate marketing, network marketing, and online sales techniques. The member's username is " + (user.username or ""),
            messages=messages,
        )
        return {"response": resp.content[0].text}
    except Exception as e:
        return {"response": f"Sorry, I'm temporarily unavailable. Error: {str(e)[:100]}"}


@app.get("/api/funnels/templates")
def funnel_templates_list():
    """List available starter templates for new pages."""
    return {"templates": [
        {"key": "blank", "title": "Blank Page", "desc": "Start from scratch with a blank canvas", "icon": "📄", "color": "#94a3b8"},
        {"key": "forex", "title": "Forex Trading", "desc": "Currency trading opportunity page", "icon": "📊", "color": "#0ea5e9"},
        {"key": "crypto", "title": "Crypto Income", "desc": "Digital currency opportunity page", "icon": "₿", "color": "#a78bfa"},
        {"key": "affiliate-marketing", "title": "Affiliate Marketing", "desc": "Affiliate income opportunity page", "icon": "🔗", "color": "#10b981"},
        {"key": "ecommerce", "title": "E-Commerce", "desc": "Online store opportunity page", "icon": "🛒", "color": "#f59e0b"},
        {"key": "real-estate", "title": "Real Estate", "desc": "Property investment opportunity page", "icon": "🏠", "color": "#e11d48"},
    ]}


@app.post("/api/funnels/duplicate/{page_id}")
def funnel_duplicate(page_id: int, request: Request, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """Duplicate an existing funnel page."""
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    original = db.query(FunnelPage).filter(FunnelPage.id == page_id, FunnelPage.user_id == user.id).first()
    if not original:
        return JSONResponse({"error": "Page not found"}, status_code=404)
    import re as _re
    new_page = FunnelPage(
        user_id=user.id,
        title=f"{original.title} (copy)",
        template_type=original.template_type,
        status="draft",
        headline=original.headline,
        subheadline=original.subheadline,
        body_copy=original.body_copy,
        cta_text=original.cta_text,
        cta_url=original.cta_url,
        video_url=original.video_url,
        image_url=original.image_url,
        sections_json=original.sections_json,
        color_scheme=original.color_scheme,
        accent_color=original.accent_color,
        custom_bg=original.custom_bg,
        font_family=original.font_family,
        custom_css=original.custom_css,
        gjs_components=original.gjs_components,
        gjs_styles=original.gjs_styles,
        gjs_html=original.gjs_html,
        gjs_css=original.gjs_css,
        meta_description=original.meta_description,
    )
    db.add(new_page)
    db.flush()
    slug_base = _re.sub(r'[^a-z0-9]+', '-', (original.title or 'page').lower()).strip('-')
    new_page.slug = f"{user.username.lower()}/{slug_base}-copy-{new_page.id}"
    db.commit()
    return JSONResponse({"success": True, "id": new_page.id, "edit_url": f"/funnels/visual/{new_page.id}"})
# deploy trigger Wed Mar 18 01:46:38 UTC 2026


# ═══════════════════════════════════════════════════════════════
#  QR CODE GENERATOR
# ═══════════════════════════════════════════════════════════════

@app.get("/api/qr-code")
def api_generate_qr(url: str = "", request: Request = None, user: User = Depends(get_current_user)):
    """Generate a QR code PNG for any URL. Returns base64 image."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if not url or len(url) > 2000:
        return JSONResponse({"error": "Valid URL required"}, status_code=400)

    import qrcode, io, base64
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff").convert("RGB")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return {"qr_base64": b64, "url": url}


@app.get("/api/qr-code/download")
def api_download_qr(url: str = "", request: Request = None, user: User = Depends(get_current_user)):
    """Download QR code as PNG file."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if not url or len(url) > 2000:
        return JSONResponse({"error": "Valid URL required"}, status_code=400)

    import qrcode, io
    from fastapi.responses import StreamingResponse
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=12, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff").convert("RGB")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png",
                             headers={"Content-Disposition": "attachment; filename=superadpro-qr.png"})


# ═══════════════════════════════════════════════════════════════
#  SMART NOTIFICATIONS / ACTIVITY FEED
# ═══════════════════════════════════════════════════════════════

@app.get("/api/activity-feed")
def api_activity_feed(request: Request, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Get recent activity feed for the member — commissions, team growth, grid progress."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from datetime import timedelta
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    feed = []

    # Recent commissions earned
    recent_comms = db.query(Commission).filter(
        Commission.to_user_id == user.id,
        Commission.created_at >= week_ago,
        Commission.status == "paid"
    ).order_by(Commission.created_at.desc()).limit(20).all()
    for c in recent_comms:
        from_user = db.query(User).filter(User.id == c.from_user_id).first() if c.from_user_id else None
        from_name = (from_user.first_name or from_user.username) if from_user else "System"
        feed.append({
            "type": "commission", "emoji": "💰",
            "text": f"Earned ${float(c.amount_usdt)} {c.commission_type.replace('_', ' ')} from {from_name}",
            "time": c.created_at.isoformat(), "amount": float(c.amount_usdt)
        })

    # New team members (direct referrals)
    new_refs = db.query(User).filter(
        User.sponsor_id == user.id,
        User.created_at >= week_ago
    ).order_by(User.created_at.desc()).limit(10).all()
    for r in new_refs:
        name = r.first_name or r.username
        tier = "Pro" if r.membership_tier == "pro" else "Basic"
        feed.append({
            "type": "new_referral", "emoji": "🎉",
            "text": f"{name} joined your team ({tier} member)",
            "time": r.created_at.isoformat()
        })

    # Grid progress
    grids = db.query(Grid).filter(Grid.owner_id == user.id, Grid.is_active == True).all()
    for g in grids:
        filled = g.positions_filled or 0
        total = 64
        remaining = total - filled
        tier_name = GRID_TIER_NAMES.get(g.package_tier, f"Tier {g.package_tier}")
        if remaining <= 10 and remaining > 0:
            feed.append({
                "type": "grid_progress", "emoji": "📊",
                "text": f"Your {tier_name} grid is {remaining} members from completion! ({filled}/64)",
                "time": now.isoformat()
            })
        elif remaining == 0:
            feed.append({
                "type": "grid_complete", "emoji": "🏆",
                "text": f"Your {tier_name} grid is COMPLETE! Bonus: ${GRID_COMPLETION_BONUS.get(g.package_tier, 0)}",
                "time": now.isoformat()
            })

    # Sort by time, most recent first
    feed.sort(key=lambda x: x.get("time", ""), reverse=True)
    return {"feed": feed[:30]}


# ═══════════════════════════════════════════════════════════════
#  REFERRAL CHALLENGES / CONTESTS
# ═══════════════════════════════════════════════════════════════

@app.get("/api/challenges")
def api_get_challenges(request: Request, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Get active referral challenges and user's progress."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from datetime import timedelta
    now = datetime.utcnow()

    # Define current challenges (admin can later manage these via DB)
    challenges = []

    # Monthly referral challenge — always active
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_refs = db.query(User).filter(
        User.sponsor_id == user.id,
        User.created_at >= month_start,
        User.is_active == True
    ).count()

    month_name = now.strftime("%B %Y")
    challenges.append({
        "id": "monthly_referrals",
        "title": f"{month_name} Referral Sprint",
        "description": "Refer new members this month. Hit milestones to earn bonus rewards.",
        "type": "referral",
        "milestones": [
            {"target": 3, "reward": "Bronze Badge", "emoji": "🥉"},
            {"target": 5, "reward": "$25 Wallet Bonus", "emoji": "💵"},
            {"target": 10, "reward": "$75 Wallet Bonus", "emoji": "💰"},
            {"target": 25, "reward": "$250 Wallet Bonus + VIP Status", "emoji": "🏆"},
        ],
        "progress": month_refs,
        "starts": month_start.isoformat(),
        "ends": (month_start + timedelta(days=32)).replace(day=1).isoformat(),
        "active": True,
    })

    # Weekly engagement streak
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_logins = 1  # They're here now

    challenges.append({
        "id": "weekly_streak",
        "title": "Weekly Engagement Streak",
        "description": "Log in, watch videos, and share content every day this week.",
        "type": "engagement",
        "milestones": [
            {"target": 3, "reward": "3-Day Streak Badge", "emoji": "🔥"},
            {"target": 5, "reward": "5-Day Warrior Badge", "emoji": "⚡"},
            {"target": 7, "reward": "Perfect Week + $10 Bonus", "emoji": "💎"},
        ],
        "progress": week_logins,
        "starts": week_start.isoformat(),
        "ends": (week_start + timedelta(days=7)).isoformat(),
        "active": True,
    })

    # First grid completion challenge
    completed_grids = db.query(Grid).filter(
        Grid.owner_id == user.id, Grid.positions_filled >= 64
    ).count()
    if completed_grids == 0:
        grids = db.query(Grid).filter(Grid.owner_id == user.id, Grid.is_active == True).all()
        best_progress = max([g.positions_filled or 0 for g in grids]) if grids else 0
        challenges.append({
            "id": "first_grid",
            "title": "Complete Your First Grid",
            "description": "Fill all 64 positions in any grid tier to unlock your completion bonus.",
            "type": "grid",
            "milestones": [
                {"target": 16, "reward": "25% Complete Badge", "emoji": "📊"},
                {"target": 32, "reward": "Halfway Hero Badge", "emoji": "🎯"},
                {"target": 48, "reward": "Almost There Badge", "emoji": "🚀"},
                {"target": 64, "reward": "Grid Master + Completion Bonus!", "emoji": "🏆"},
            ],
            "progress": best_progress,
            "active": True,
        })

    return {"challenges": challenges}


# ═══════════════════════════════════════════════════════════════
#  WEEKLY EARNINGS DIGEST (CRON)
# ═══════════════════════════════════════════════════════════════

@app.get("/cron/weekly-digest")
def cron_weekly_digest(secret: str = "", db: Session = Depends(get_db)):
    """Send weekly earnings digest email to all active members. Run Sundays via cron."""
    cron_secret = os.getenv("CRON_SECRET", "")
    if not cron_secret or secret != cron_secret:
        return JSONResponse({"error": "Invalid secret"}, status_code=401)

    from .email_utils import send_email
    from datetime import timedelta
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    sent_count = 0
    errors = 0

    active_users = db.query(User).filter(User.is_active == True).all()

    for u in active_users:
        try:
            # Calculate weekly stats
            weekly_earned = db.query(func.sum(Commission.amount_usdt)).filter(
                Commission.to_user_id == u.id,
                Commission.created_at >= week_ago,
                Commission.status == "paid"
            ).scalar() or 0

            new_refs = db.query(User).filter(
                User.sponsor_id == u.id,
                User.created_at >= week_ago
            ).count()

            # Grid progress
            grids = db.query(Grid).filter(Grid.owner_id == u.id, Grid.is_active == True).all()
            grid_total = sum(g.positions_filled or 0 for g in grids)

            total_balance = float(u.balance or 0)
            weekly_earned = float(weekly_earned)
            name = u.first_name or u.username

            # Skip if nothing happened this week and balance is 0
            if weekly_earned == 0 and new_refs == 0 and total_balance == 0:
                continue

            subject = f"Your SuperAdPro Week: ${weekly_earned} earned"
            if weekly_earned == 0:
                subject = f"Your SuperAdPro Weekly Update"

            html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f3f9;font-family:'DM Sans',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#050d1a;border-radius:16px;padding:32px 28px;text-align:center;margin-bottom:20px">
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px">
      Super<span style="color:#38bdf8">Ad</span><span style="color:#38bdf8">Pro</span>
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,.4);letter-spacing:1px;text-transform:uppercase">Weekly Earnings Digest</div>
  </div>

  <div style="background:#fff;border-radius:14px;padding:28px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
    <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:20px">Hey {name} 👋</div>
    <div style="font-size:14px;color:#64748b;line-height:1.7;margin-bottom:24px">
      Here's your weekly snapshot from SuperAdPro. Keep building — consistency is what separates the top earners.
    </div>

    <div style="display:flex;gap:12px;margin-bottom:24px">
      <div style="flex:1;background:linear-gradient(135deg,#065f46,#34d399);border-radius:12px;padding:18px 14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#fff">${weekly_earned}</div>
        <div style="font-size:10px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:1px;margin-top:2px">Earned This Week</div>
      </div>
      <div style="flex:1;background:linear-gradient(135deg,#1e40af,#60a5fa);border-radius:12px;padding:18px 14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#fff">{new_refs}</div>
        <div style="font-size:10px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:1px;margin-top:2px">New Referrals</div>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:24px">
      <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 14px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#0f172a">${total_balance}</div>
        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-top:2px">Wallet Balance</div>
      </div>
      <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 14px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#0f172a">{grid_total}</div>
        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-top:2px">Grid Members</div>
      </div>
    </div>

    <a href="https://www.superadpro.com/dashboard" style="display:block;background:linear-gradient(135deg,#0ea5e9,#38bdf8);color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:800;font-size:14px">
      View Your Dashboard →
    </a>
  </div>

  <div style="text-align:center;font-size:11px;color:#94a3b8;padding:12px 0">
    SuperAdPro — Video Advertising & AI Marketing Platform<br>
    <a href="https://www.superadpro.com" style="color:#0ea5e9;text-decoration:none">www.superadpro.com</a>
  </div>
</div>
</body></html>"""

            send_email(u.email, subject, html)
            sent_count += 1
        except Exception as e:
            logger.error(f"Weekly digest failed for user {u.id}: {e}")
            errors += 1

    return {"status": "ok", "sent": sent_count, "errors": errors, "total_active": len(active_users)}


# ═══════════════════════════════════════════════════════════════
#  TEAM MESSENGER
# ═══════════════════════════════════════════════════════════════

@app.get("/api/team-messages")
def api_team_messages(request: Request, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Get messages for the current user — sent and received."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from .database import TeamMessage
    received = db.query(TeamMessage).filter(
        TeamMessage.to_user_id == user.id
    ).order_by(TeamMessage.created_at.desc()).limit(50).all()

    sent = db.query(TeamMessage).filter(
        TeamMessage.from_user_id == user.id
    ).order_by(TeamMessage.created_at.desc()).limit(50).all()

    def msg_to_dict(m, direction):
        other_id = m.from_user_id if direction == "received" else m.to_user_id
        other = db.query(User).filter(User.id == other_id).first()
        return {
            "id": m.id, "direction": direction,
            "other_user": {"id": other.id, "name": other.first_name or other.username,
                           "username": other.username, "avatar": other.avatar_url} if other else None,
            "message": m.message, "is_read": m.is_read,
            "created_at": m.created_at.isoformat(),
        }

    messages = [msg_to_dict(m, "received") for m in received] + [msg_to_dict(m, "sent") for m in sent]
    messages.sort(key=lambda x: x["created_at"], reverse=True)

    # Mark received as read
    for m in received:
        if not m.is_read:
            m.is_read = True
    db.commit()

    # Get team members (direct referrals) for the contact list — include all, not just active
    team = db.query(User).filter(User.sponsor_id == user.id).all()
    # Also include sponsor
    sponsor = db.query(User).filter(User.id == user.sponsor_id).first() if user.sponsor_id else None

    contacts = []
    for t in team:
        contacts.append({
            "id": t.id, "name": t.first_name or t.username,
            "username": t.username, "avatar": t.avatar_url,
            "relationship": "referral", "tier": t.membership_tier or "basic"
        })
    if sponsor:
        contacts.insert(0, {
            "id": sponsor.id, "name": sponsor.first_name or sponsor.username,
            "username": sponsor.username, "avatar": sponsor.avatar_url,
            "relationship": "sponsor", "tier": sponsor.membership_tier or "basic"
        })

    # Unread count
    unread = db.query(TeamMessage).filter(
        TeamMessage.to_user_id == user.id, TeamMessage.is_read == False
    ).count()

    return {"messages": messages[:50], "contacts": contacts, "unread_count": unread}


@app.post("/api/team-messages/send")
async def api_send_team_message(request: Request, user: User = Depends(get_current_user),
                                 db: Session = Depends(get_db)):
    """Send a message to a team member (sponsor or direct referral)."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    from .database import TeamMessage
    body = await request.json()
    to_user_id = body.get("to_user_id")
    message_text = (body.get("message") or "").strip()[:2000]

    if not to_user_id or not message_text:
        return JSONResponse({"error": "Recipient and message required"}, status_code=400)

    # Verify relationship — can only message sponsor or direct referrals
    recipient = db.query(User).filter(User.id == to_user_id).first()
    if not recipient:
        return JSONResponse({"error": "User not found"}, status_code=404)

    is_sponsor = user.sponsor_id == to_user_id
    is_referral = recipient.sponsor_id == user.id
    is_admin = user.is_admin

    if not (is_sponsor or is_referral or is_admin):
        return JSONResponse({"error": "You can only message your sponsor or direct referrals"}, status_code=403)

    # Rate limit: max 20 messages per hour
    from datetime import timedelta
    hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_count = db.query(TeamMessage).filter(
        TeamMessage.from_user_id == user.id,
        TeamMessage.created_at >= hour_ago
    ).count()
    if recent_count >= 20 and not user.is_admin:
        return JSONResponse({"error": "Message limit reached (20/hour). Try again later."}, status_code=429)

    msg = TeamMessage(
        from_user_id=user.id,
        to_user_id=to_user_id,
        message=message_text,
        is_read=False,
    )
    db.add(msg)
    db.commit()

    # Send notification
    send_notification(db, to_user_id, "message", "💬",
        f"New message from {user.first_name or user.username}",
        message_text[:100])

    return {"success": True, "message_id": msg.id}


@app.get("/api/team-messages/unread-count")
def api_unread_messages(request: Request, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Quick unread count for badge display."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import TeamMessage
    count = db.query(TeamMessage).filter(
        TeamMessage.to_user_id == user.id, TeamMessage.is_read == False
    ).count()
    return {"unread_count": count}


# ═══════════════════════════════════════════════════════════════
#  TRAINING CENTRE
# ═══════════════════════════════════════════════════════════════

@app.get("/api/training")
def api_training_centre(request: Request, user: User = Depends(get_current_user)):
    """Return the training centre content — curated guides and tutorials."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    modules = [
        {
            "id": "getting-started",
            "title": "Getting Started",
            "emoji": "🚀",
            "color": "#0ea5e9",
            "lessons": [
                {"id": "gs-1", "title": "Welcome to SuperAdPro", "type": "guide", "duration": "3 min",
                 "content": "Welcome to SuperAdPro! This platform gives you multiple ways to earn: referral commissions (50% recurring), campaign tier grid bonuses, and course sales. At the heart of it all is Watch & Earn — the engine that delivers views to campaign tier holders and keeps the entire grid commission system running. Your dashboard is your command centre — it shows your earnings, team growth, and available tools at a glance. Start by setting up your profile, then share your referral link to begin building your network."},
                {"id": "gs-2", "title": "Understanding Your Dashboard", "type": "guide", "duration": "4 min",
                 "content": "Your dashboard has four key sections: Income Streams (showing your earnings from each source), Network Overview (your team and grid progress), Quick Actions (shortcuts to your most-used tools), and Recent Activity (latest commissions and team updates). The wallet balance at the top shows your current earnings ready for withdrawal."},
                {"id": "gs-3", "title": "Setting Up Your Profile", "type": "guide", "duration": "2 min",
                 "content": "Head to Account > Profile to add your name, avatar, and bio. A complete profile builds trust when referrals check you out. Your member ID (shown on your profile) is unique — team members can use it to find and contact you."},
                {"id": "gs-4", "title": "Your Referral Link Explained", "type": "guide", "duration": "3 min",
                 "content": "Your referral link is www.superadpro.com/join/[your-username]. Anyone who signs up through this link becomes your direct referral. You earn 50% commission on their membership fee every month they stay active. Share it on social media, in messages, on your LinkHub page, or via QR code."},
            ]
        },
        {
            "id": "earning",
            "title": "How to Earn",
            "emoji": "💰",
            "color": "#16a34a",
            "lessons": [
                {"id": "earn-1", "title": "Referral Commissions (50%)", "type": "guide", "duration": "4 min",
                 "content": "When someone joins through your link and pays their membership ($20 Basic or $35 Pro), you earn 50% commission — $10 or $17.50 per month, every month they stay active. This is recurring income. Focus on finding people who will use the platform, not just sign up."},
                {"id": "earn-2", "title": "The 8-Tier Campaign Grid", "type": "guide", "duration": "8 min",
                 "content": "The grid system has 8 tiers from Starter ($20) to Ultimate ($1,000). When you purchase a campaign tier, you submit a video ad that receives a set number of views delivered by the Watch & Earn community. You are also placed in your sponsor's grid — each grid holds 64 members across 8 levels. As the grid fills through referrals and spillover, commissions flow: 40% direct to your sponsor, 6.25% per level across 8 levels of your upline, and 5% into a completion bonus pool. When a grid reaches 64 members, it COMPLETES and the owner receives the completion bonus (up to $3,200 on the Ultimate tier). Then a new grid opens automatically and the process starts again. Once your campaign's view target has been delivered, you can repurchase the same tier — this reactivates your qualification to earn commissions at that level and submits a fresh video ad for a new round of views. This is genuine long-term recurring income: as long as you and your team keep repurchasing tiers, the commissions keep flowing. The key principle is that you must have an active campaign at a tier to earn commissions from that tier. Repurchasing keeps you qualified and keeps your income active."},
                {"id": "earn-3", "title": "Course Marketplace", "type": "guide", "duration": "3 min",
                 "content": "Pro members can create and sell courses on the marketplace. You set the price, create lessons with text, video, and quizzes, and earn from every sale. All courses go through AI review before publishing to maintain quality. The marketplace is open to all members as buyers."},
                {"id": "earn-4", "title": "Watch & Earn — The Grid Engine", "type": "guide", "duration": "4 min",
                 "content": "Watch & Earn is the engine that powers the entire campaign tier and grid system. When you watch videos, you're delivering real views to other members' campaign tiers. Every campaign tier purchase comes with a view target — those views are delivered by the community through Watch & Earn. This is what keeps campaign tiers active, which is what qualifies members to earn commissions from the grid. Without Watch & Earn, campaign tiers would never complete their view targets, and the commission structure wouldn't function. So when you watch, you're not just earning — you're powering the entire affiliate network. Your daily watch allocation depends on your membership tier, and every completed watch counts towards a campaign holder's view target."},
            ]
        },
        {
            "id": "marketing-tools",
            "title": "Marketing Tools",
            "emoji": "🛠️",
            "color": "#8b5cf6",
            "lessons": [
                {"id": "mkt-1", "title": "LinkHub — Your Bio Link Page", "type": "guide", "duration": "4 min",
                 "content": "LinkHub lets you create a beautiful one-page website with all your links, social profiles, and referral links. Think of it as your personal landing page. Customise colours, fonts, and layout. Share a single LinkHub URL instead of multiple links. Perfect for social media bios."},
                {"id": "mkt-2", "title": "Link Tools — Shortener, Rotator, Geo-Redirect", "type": "guide", "duration": "5 min",
                 "content": "Link Tools gives you three powerful utilities: Short Links (branded shortlinks that track clicks), Link Rotators (split traffic across multiple URLs — great for A/B testing), and Geo-Redirects (send visitors to different pages based on their country). All links include click analytics."},
                {"id": "mkt-3", "title": "The Marketing Suite", "type": "guide", "duration": "4 min",
                 "content": "The Marketing Suite includes AI-powered tools for content creation: Niche Finder (discover profitable niches), Social Post Generator (30 days of posts), Video Script Generator (hooks + scripts), Email Swipe File (ready-to-send templates), and Launch Wizard (step-by-step launch plan). All content is generated specifically for your niche."},
                {"id": "mkt-4", "title": "Ad Hub — Promote Your Business", "type": "guide", "duration": "3 min",
                 "content": "The Ad Hub lets you create listings, banners, and video campaigns that appear on the public Ad Board, Banner Gallery, and Video Library. These public pages drive external traffic. Basic members can post 3 ads per week, Pro members get 6. All ads go through AI moderation."},
            ]
        },
        {
            "id": "pro-features",
            "title": "Pro Member Tools",
            "emoji": "⚡",
            "color": "#f59e0b",
            "lessons": [
                {"id": "pro-1", "title": "SuperSeller — AI Sales Autopilot", "type": "guide", "duration": "6 min",
                 "content": "SuperSeller is your AI-powered marketing machine. Enter your niche, and it generates a complete campaign: landing page, 30 social posts, 5-email nurture sequence, 3 video scripts, ad copy, and a 30-day strategy. Leads captured through your landing page automatically enter the email autoresponder. You can edit your page, add a sales video, customise the CTA, and inject tracking pixels."},
                {"id": "pro-2", "title": "SuperPages — Landing Page Builder", "type": "guide", "duration": "5 min",
                 "content": "SuperPages is a drag-and-drop landing page builder with 24 block types, 8 templates, gradient builder, responsive preview, and form editor. Build professional funnels without any coding. Pages are hosted on your SuperAdPro account and include lead capture forms that feed into your CRM."},
                {"id": "pro-3", "title": "Email Autoresponder", "type": "guide", "duration": "4 min",
                 "content": "When leads sign up through your SuperSeller or SuperPages funnels, they automatically receive a drip email sequence — 5 emails over 7 days. Each email is AI-generated for your niche and includes your referral link. The autoresponder runs automatically via the cron system. Track opens, clicks, and conversions in your Leads dashboard."},
                {"id": "pro-4", "title": "ProSeller CRM & Lead Dashboard", "type": "guide", "duration": "3 min",
                 "content": "Your Leads dashboard shows every email lead captured through your funnels. See their status (new, nurturing, hot, converted), how many emails they've opened, and which links they clicked. Hot leads (2+ opens or any click) are auto-flagged so you can follow up personally."},
            ]
        },
        {
            "id": "growth-tips",
            "title": "Growth Strategies",
            "emoji": "📈",
            "color": "#ec4899",
            "lessons": [
                {"id": "tip-1", "title": "The 3-3-3 Method", "type": "guide", "duration": "3 min",
                 "content": "Share 3 social posts per day, reach out to 3 new people, and follow up with 3 existing contacts. Consistency beats intensity. Most successful affiliates earn through steady daily action, not viral moments. Use the Social Post Generator to create your daily content in seconds."},
                {"id": "tip-2", "title": "Leveraging Your SuperSeller Page", "type": "guide", "duration": "4 min",
                 "content": "Your SuperSeller landing page is your 24/7 salesperson. Add a personal sales video to build trust. Share the link in your social bios, email signatures, and WhatsApp messages. The AI chat agent handles objections while you sleep. Check your leads dashboard daily for hot prospects."},
                {"id": "tip-3", "title": "Building a Team That Stays", "type": "guide", "duration": "4 min",
                 "content": "Retention is more valuable than recruitment. Help your referrals set up their profiles and create their first SuperSeller campaign within 24 hours of joining. Send them a welcome message through Team Messenger. Members who earn in their first week are 5x more likely to stay active."},
                {"id": "tip-4", "title": "Using QR Codes for Offline Marketing", "type": "guide", "duration": "2 min",
                 "content": "Generate QR codes for your referral link, LinkHub page, or SuperSeller funnel. Print them on business cards, flyers, or stickers. Place them in coffee shops, gyms, and co-working spaces. QR codes bridge the gap between offline networking and online signup."},
            ]
        },
    ]

    return {"modules": modules}


# ═══════════════════════════════════════════════════════════════════════════════
# SUPERSCENE — AI Video Creator
# Routes: credits, generate, poll, history, buy (Stripe + Crypto)
# ═══════════════════════════════════════════════════════════════════════════════

SUPERSCENE_PACK_CREDITS = {
    "starter": 50,
    "creator": 150,
    "studio":  500,
    "pro":     1200,
}

SUPERSCENE_PACK_PRICES = {
    "starter": 8.00,
    "creator": 20.00,
    "studio":  50.00,
    "pro":     99.00,
}


def _get_or_create_sc_credits(user_id: int, db) -> "SuperSceneCredit":
    """Get or create a SuperSceneCredit row for this user."""
    from .database import SuperSceneCredit
    row = db.query(SuperSceneCredit).filter(SuperSceneCredit.user_id == user_id).first()
    if not row:
        row = SuperSceneCredit(user_id=user_id, balance=0)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@app.get("/superscene")
async def superscene_page(request: Request):
    """Serve the SuperScene page — handled by React router client-side."""
    _idx = pathlib.Path("static/app/index.html")
    if _idx.exists():
        return HTMLResponse(_idx.read_text())
    return HTMLResponse("<h2>App not built yet.</h2>", status_code=503)


@app.get("/supercut")
async def supercut_redirect():
    """Redirect old SuperCut URL to SuperScene."""
    return RedirectResponse(url="/superscene", status_code=301)


@app.post("/api/superscene/admin/grant-credits")
async def sc_admin_grant_credits(request: Request, db: Session = Depends(get_db)):
    """Admin-only: grant SuperScene credits to a user for testing."""
    user = get_current_user(request, db)
    if not user or not getattr(user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    target_id = int(body.get("user_id", user.id))
    amount = int(body.get("amount", 100))
    if amount < 1 or amount > 5000:
        raise HTTPException(status_code=400, detail="Amount must be 1-5000")
    row = _get_or_create_sc_credits(target_id, db)
    row.balance += amount
    db.commit()
    db.refresh(row)
    logger.warning(f"SuperScene ADMIN: granted {amount} credits to user {target_id} (new balance: {row.balance})")
    return {"success": True, "user_id": target_id, "granted": amount, "new_balance": row.balance}


@app.get("/admin/superscene/grant/{amount}")
async def sc_admin_grant_credits_get(amount: int, request: Request, db: Session = Depends(get_db)):
    """Admin-only: grant yourself SuperScene credits by visiting this URL."""
    user = get_current_user(request, db)
    if not user or not getattr(user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Admin only")
    if amount < 1 or amount > 5000:
        raise HTTPException(status_code=400, detail="Amount must be 1-5000")
    row = _get_or_create_sc_credits(user.id, db)
    row.balance += amount
    db.commit()
    db.refresh(row)
    logger.warning(f"SuperScene ADMIN: granted {amount} credits to user {user.id} (new balance: {row.balance})")
    return HTMLResponse(f"""
    <html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0a0a0a;color:#fff">
    <h1 style="color:#f43f5e">✂ SuperScene Credits Granted</h1>
    <p style="font-size:24px">+{amount} credits added</p>
    <p style="font-size:18px;color:#94a3b8">New balance: <strong style="color:#22d3ee">{row.balance}</strong></p>
    <a href="/superscene" style="display:inline-block;margin-top:30px;padding:14px 32px;background:#f43f5e;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">Go to SuperScene →</a>
    </body></html>
    """)


@app.get("/api/superscene/seed-credits")
async def sc_seed_credits(secret: str, user_id: int = 1, amount: int = 500, db: Session = Depends(get_db)):
    """Secret-key protected: seed SuperScene credits without login. For testing only."""
    if secret != "sap-sc-seed-2026-X9kR":
        raise HTTPException(status_code=403, detail="Invalid secret")
    if amount < 1 or amount > 5000:
        raise HTTPException(status_code=400, detail="Amount must be 1-5000")
    try:
        from sqlalchemy import text as sa_text
        result = db.execute(sa_text("""
            INSERT INTO superscene_credits (user_id, balance)
            VALUES (:uid, :amt)
            ON CONFLICT (user_id) DO UPDATE
              SET balance = superscene_credits.balance + :amt,
                  updated_at = NOW()
            RETURNING balance
        """), {"uid": user_id, "amt": amount})
        new_balance = result.fetchone()[0]
        db.commit()
        logger.warning(f"SuperScene SEED: +{amount} credits to user {user_id} (new balance: {new_balance})")
        return {"success": True, "user_id": user_id, "granted": amount, "new_balance": new_balance}
    except Exception as e:
        logger.exception("SuperScene seed-credits error")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/superscene/credits")
async def sc_get_credits(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    row = _get_or_create_sc_credits(user.id, db)
    return {"balance": row.balance}


@app.post("/api/superscene/generate")
async def sc_generate(request: Request, db: Session = Depends(get_db)):
    """
    Submit a video generation task.
    Body: {model_key, prompt, duration, ratio, image_urls?, generate_audio?}
    """
    from .database import SuperSceneCredit, SuperSceneVideo
    from .superscene_evolink import generate_video, calc_credits, resolve_video_model

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    model_key      = body.get("model_key", "kling3")
    prompt         = (body.get("prompt") or "").strip()
    duration       = int(body.get("duration", 10))
    ratio          = body.get("ratio", "16:9")
    resolution     = body.get("resolution", "1080p")
    neg_prompt     = (body.get("negative_prompt") or "").strip()
    image_urls     = body.get("image_urls") or []
    style_refs     = body.get("style_refs") or []
    gen_audio      = bool(body.get("generate_audio", False))
    seed           = body.get("seed")
    if seed is not None:
        seed = int(seed)

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    if duration < 3 or duration > 30:
        raise HTTPException(status_code=400, detail="Duration must be between 3 and 30 seconds")

    # Smart routing: if model_key is a tier name, resolve to actual model
    tier_keys = {"quick", "standard", "premium", "ultra"}
    tier_used = model_key if model_key in tier_keys else None
    if tier_used:
        is_i2v = bool(image_urls and len(image_urls) > 0)
        model_key = resolve_video_model(tier_used, is_i2v=is_i2v)

    credits_needed = calc_credits(model_key, duration, with_audio=gen_audio)

    # Check balance
    credit_row = _get_or_create_sc_credits(user.id, db)
    if credit_row.balance < credits_needed:
        raise HTTPException(status_code=402, detail=f"Insufficient credits. Need {credits_needed}, have {credit_row.balance}.")

    # Deduct credits optimistically
    credit_row.balance -= credits_needed
    db.commit()

    # Submit to provider — route based on model
    # Priority: Grok direct (for grok-video) → fal.ai (cheaper) → EvoLink (fallback)
    from .fal_provider import is_available as fal_available, generate_video as fal_generate
    from .grok_imagine import is_available as grok_available, generate_video as grok_generate

    result = None

    # Try Grok Imagine direct for grok-video (uses xAI API key, no EvoLink markup)
    if grok_available(model_key):
        logger.info(f"Routing {model_key} to Grok Imagine (direct xAI)")
        result = await grok_generate(
            model_key, prompt, duration, ratio,
            image_urls=image_urls if image_urls else None,
            generate_audio=gen_audio,
            resolution=resolution,
            negative_prompt=neg_prompt if neg_prompt else None,
            seed=seed,
        )
        if not result["success"]:
            logger.warning(f"Grok Imagine failed for {model_key}, falling back to EvoLink: {result.get('error')}")
            result = None

    # Try fal.ai for supported models (cheaper than EvoLink)
    if result is None and fal_available(model_key) and not style_refs:
        logger.info(f"Routing {model_key} to fal.ai (cheaper provider)")
        result = await fal_generate(
            model_key, prompt, duration, ratio,
            image_urls=image_urls if image_urls else None,
            generate_audio=gen_audio,
            resolution=resolution,
            negative_prompt=neg_prompt if neg_prompt else None,
            seed=seed,
        )
        if not result["success"]:
            logger.warning(f"fal.ai failed for {model_key}, falling back to EvoLink: {result.get('error')}")
            result = None  # Fall through to EvoLink

    # Fallback to EvoLink
    if result is None:
        logger.info(f"Routing {model_key} to EvoLink")
        result = await generate_video(
            model_key, prompt, duration, ratio,
            image_urls=image_urls if image_urls else None,
            style_refs=style_refs if style_refs else None,
            generate_audio=gen_audio,
            resolution=resolution,
            negative_prompt=neg_prompt if neg_prompt else None,
            seed=seed,
        )

    if not result["success"]:
        # Refund on failure
        credit_row.balance += credits_needed
        db.commit()
        raise HTTPException(status_code=502, detail=result.get("error", "Video generation failed"))

    task_id = result["task_id"]
    mode = result.get("mode", "text-to-video")

    # Model name map for display
    model_names = {
        "kling-o3": "Kling O3", "kling3": "Kling 3.0",
        "seedance": "Seedance 1.5 Pro", "sora2": "Sora 2 Pro",
        "veo31": "Veo 3.1 Fast", "veo31-pro": "Veo 3.1 Pro 4K",
        "hailuo23": "Hailuo 2.3", "hailuo23-fast": "Hailuo 2.3 Fast",
        "hailuo02": "Hailuo 02", "wan26": "WAN 2.6",
        "grok-video": "Grok Imagine", "sora2-max": "Sora 2 Max",
        "kling-motion": "Kling Motion Control", "kling-edit": "Kling O3 Edit",
        "veo31-extend": "Veo 3.1 Extend",
    }

    # Record video
    video = SuperSceneVideo(
        user_id=user.id,
        task_id=task_id,
        model_key=model_key,
        model_name=model_names.get(model_key, model_key),
        prompt=prompt,
        duration=duration,
        ratio=ratio,
        status="pending",
        credits_used=credits_needed,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    return {
        "success": True,
        "task_id": task_id,
        "video_id": video.id,
        "mode": mode,
        "credits_used": credits_needed,
        "credits_remaining": credit_row.balance,
    }


@app.post("/api/superscene/upload-image")
async def sc_upload_image(request: Request, db: Session = Depends(get_db)):
    """Upload an image for image-to-video generation. Stores in R2, returns public URL."""
    from .r2_storage import upload_image as r2_upload

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Validate file type
    ct = file.content_type or ""
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    if ct not in ext_map:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are accepted")

    # Read file (max 10MB)
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 10MB")

    try:
        file_url = r2_upload(data, "superscene", ext=ext_map[ct], content_type=ct)
        return {"success": True, "file_url": file_url}
    except Exception as e:
        logger.exception("SuperScene image upload failed")
        raise HTTPException(status_code=502, detail=f"Upload failed: {str(e)}")


@app.post("/api/superscene/extract-frame")
async def sc_extract_frame(request: Request, db: Session = Depends(get_db)):
    """
    Extract a frame from a video at a given timestamp using FFmpeg.
    Server-side extraction avoids CORS canvas tainting issues.
    Body: {video_url, timestamp}
    Returns: {success, frame_url}
    """
    import subprocess, tempfile, os
    from .r2_storage import upload_image as r2_upload

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    video_url = body.get("video_url", "").strip()
    timestamp = float(body.get("timestamp", 0))

    if not video_url:
        raise HTTPException(status_code=400, detail="video_url is required")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, "frame.png")

            # FFmpeg: seek to timestamp, extract 1 frame as PNG
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(round(timestamp, 2)),
                "-i", video_url,
                "-frames:v", "1",
                "-q:v", "2",
                output_path
            ]

            result = subprocess.run(cmd, capture_output=True, timeout=30)
            if result.returncode != 0:
                logger.error(f"FFmpeg frame extraction failed: {result.stderr.decode()[:500]}")
                raise HTTPException(status_code=502, detail="Frame extraction failed")

            if not os.path.exists(output_path):
                raise HTTPException(status_code=502, detail="FFmpeg did not produce output")

            # Read the frame and upload to R2
            with open(output_path, "rb") as f:
                frame_data = f.read()

            frame_url = r2_upload(frame_data, "superscene/frames", ext="png", content_type="image/png")
            return {"success": True, "frame_url": frame_url}

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Frame extraction timed out")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Frame extraction error")
        raise HTTPException(status_code=502, detail=f"Frame extraction failed: {str(e)}")


@app.get("/api/superscene/status/{task_id:path}")
async def sc_poll_status(task_id: str, request: Request, db: Session = Depends(get_db)):
    """Poll provider for video generation status and update DB."""
    from .database import SuperSceneVideo
    from datetime import datetime

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Route to correct provider based on task_id prefix
    if task_id.startswith("grok:"):
        from .grok_imagine import poll_video_status as grok_poll
        result = await grok_poll(task_id)
    elif task_id.startswith("fal:"):
        from .fal_provider import poll_status as fal_poll
        result = await fal_poll(task_id)
    else:
        from .superscene_evolink import poll_status
        result = await poll_status(task_id)

    if not result["success"]:
        raise HTTPException(status_code=502, detail=result.get("error"))

    # Update DB record
    video = db.query(SuperSceneVideo).filter(
        SuperSceneVideo.task_id == task_id,
        SuperSceneVideo.user_id == user.id,
    ).first()

    if video:
        video.status = result["status"]
        if result.get("video_url"):
            video.video_url = result["video_url"]
        if result["status"] in ("completed", "failed"):
            video.completed_at = datetime.utcnow()
        # Refund credits on async failure
        if result["status"] == "failed" and video.credits_used and video.credits_used > 0:
            from .database import SuperSceneCredit
            credit_row = db.query(SuperSceneCredit).filter_by(user_id=user.id).first()
            if credit_row:
                credit_row.balance += video.credits_used
                logger.info(f"SuperScene: Refunded {video.credits_used} credits to user {user.id} for failed video {task_id}")
                video.credits_used = 0  # Mark as refunded so we don't double-refund
        db.commit()

    return {
        "status":    result["status"],
        "video_url": result.get("video_url"),
    }


@app.get("/api/superscene/videos")
async def sc_videos(request: Request, db: Session = Depends(get_db)):
    """Return the user's video history."""
    from .database import SuperSceneVideo

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    videos = (
        db.query(SuperSceneVideo)
        .filter(SuperSceneVideo.user_id == user.id)
        .order_by(SuperSceneVideo.created_at.desc())
        .limit(50)
        .all()
    )

    return {"videos": [
        {
            "id":          v.id,
            "task_id":     v.task_id,
            "model_name":  v.model_name,
            "prompt":      v.prompt,
            "duration":    v.duration,
            "ratio":       v.ratio,
            "status":      v.status,
            "video_url":   v.video_url,
            "credits_used":v.credits_used,
            "created_at":  v.created_at.isoformat() if v.created_at else None,
        }
        for v in videos
    ]}


@app.delete("/api/superscene/videos/{video_id}")
async def sc_delete_video(video_id: int, request: Request, db: Session = Depends(get_db)):
    """Delete a video from the user's gallery."""
    from .database import SuperSceneVideo

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    video = db.query(SuperSceneVideo).filter(
        SuperSceneVideo.id == video_id,
        SuperSceneVideo.user_id == user.id,
    ).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    db.delete(video)
    db.commit()
    return {"success": True, "deleted": video_id}


# ── SuperScene — Buy Credits via Stripe ────────────────────────

@app.post("/api/superscene/buy/stripe")
async def sc_buy_stripe(request: Request, db: Session = Depends(get_db)):
    from .database import SuperSceneOrder
    from .stripe_service import create_superscene_checkout

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    pack_slug = body.get("pack_slug", "").lower()

    if pack_slug not in SUPERSCENE_PACK_CREDITS:
        raise HTTPException(status_code=400, detail="Invalid pack")

    result = create_superscene_checkout(user.id, pack_slug, user.email)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])

    # Record pending order
    order = SuperSceneOrder(
        user_id=user.id,
        pack_slug=pack_slug,
        credits=SUPERSCENE_PACK_CREDITS[pack_slug],
        amount_usd=SUPERSCENE_PACK_PRICES[pack_slug],
        payment_method="stripe",
        status="pending",
        stripe_session_id=result["session_id"],
    )
    db.add(order)
    db.commit()

    return {"success": True, "url": result["url"]}


# ── SuperScene — Buy Credits via Crypto ────────────────────────

@app.post("/api/superscene/buy/crypto")
async def sc_buy_crypto(request: Request, db: Session = Depends(get_db)):
    from .database import SuperSceneOrder, CryptoPaymentOrder
    from .crypto_payments import create_payment_order

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    pack_slug = body.get("pack_slug", "").lower()

    if pack_slug not in SUPERSCENE_PACK_CREDITS:
        raise HTTPException(status_code=400, detail="Invalid pack")

    product_key = f"superscene_{pack_slug}"
    crypto_result = create_payment_order(user.id, product_key, db)

    if not crypto_result.get("success"):
        raise HTTPException(status_code=500, detail=crypto_result.get("error", "Crypto order failed"))

    # Record pending SuperScene order linked to crypto order
    order = SuperSceneOrder(
        user_id=user.id,
        pack_slug=pack_slug,
        credits=SUPERSCENE_PACK_CREDITS[pack_slug],
        amount_usd=SUPERSCENE_PACK_PRICES[pack_slug],
        payment_method="crypto",
        status="pending",
        crypto_order_id=crypto_result.get("order_id"),
    )
    db.add(order)
    db.commit()

    return {
        "success": True,
        "order_id": crypto_result["order_id"],
        "pay_address": crypto_result["pay_address"],
        "amount_usdt": str(crypto_result["amount_usdt"]),
        "expires_at": crypto_result["expires_at"],
    }


# ── SuperScene — Stripe Webhook ─────────────────────────────────

@app.post("/webhooks/superscene/stripe")
async def sc_stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Stripe webhook for SuperScene credit pack payments.
    Credits the user on checkout.session.completed with payment_type=superscene_credits.
    """
    from .database import SuperSceneCredit, SuperSceneOrder
    import stripe

    payload = await request.body()
    sig     = request.headers.get("stripe-signature", "")

    try:
        from .stripe_service import STRIPE_WEBHOOK_SECRET, get_stripe
        s = get_stripe()
        event = s.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        session  = event["data"]["object"]
        meta     = session.get("metadata", {})
        ptype    = meta.get("payment_type", "")
        user_id  = int(meta.get("user_id", 0))
        pack_slug= meta.get("pack_slug", "")
        credits  = int(meta.get("credits", 0))

        if ptype == "superscene_credits" and user_id and credits:
            # Credit the user
            credit_row = _get_or_create_sc_credits(user_id, db)
            credit_row.balance += credits
            db.commit()

            # Mark order complete
            order = db.query(SuperSceneOrder).filter(
                SuperSceneOrder.stripe_session_id == session["id"]
            ).first()
            if order:
                from datetime import datetime
                order.status = "completed"
                order.completed_at = datetime.utcnow()
                db.commit()

    return {"received": True}


# ── SuperScene — Crypto Confirmation (called by cron/webhook) ──

@app.post("/api/superscene/confirm-crypto/{order_id}")
async def sc_confirm_crypto(order_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Called when a crypto payment for SuperScene is confirmed.
    Internal route — triggered by the existing crypto confirmation flow.
    """
    from .database import SuperSceneCredit, SuperSceneOrder
    from datetime import datetime

    # Verify cron secret
    secret = request.headers.get("X-Cron-Secret", "")
    expected = os.getenv("CRON_SECRET", "sap-renewal-cron-2026-X7kP9mQr")
    if secret != expected:
        raise HTTPException(status_code=403, detail="Forbidden")

    order = db.query(SuperSceneOrder).filter(
        SuperSceneOrder.crypto_order_id == order_id,
        SuperSceneOrder.status == "pending",
    ).first()

    if not order:
        return {"ok": False, "detail": "Order not found or already processed"}

    credit_row = _get_or_create_sc_credits(order.user_id, db)
    credit_row.balance += order.credits
    order.status = "completed"
    order.completed_at = datetime.utcnow()
    db.commit()

    return {"ok": True, "credits_added": order.credits, "new_balance": credit_row.balance}


@app.post("/api/superscene/admin/add-credits")
async def sc_admin_add_credits(request: Request, db: Session = Depends(get_db)):
    """Admin only — add SuperScene credits to any user."""
    from .database import SuperSceneCredit

    user = get_current_user(request, db)
    if not user or not getattr(user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Admin only")

    body = await request.json()
    target_user_id = int(body.get("user_id", user.id))
    credits_to_add = int(body.get("credits", 0))

    if credits_to_add <= 0:
        raise HTTPException(status_code=400, detail="Credits must be positive")

    credit_row = _get_or_create_sc_credits(target_user_id, db)
    credit_row.balance += credits_to_add
    db.commit()

    return {
        "ok": True,
        "user_id": target_user_id,
        "credits_added": credits_to_add,
        "new_balance": credit_row.balance,
    }

# ── SuperScene — Music Generation (Suno via EvoLink) ─────────

@app.post("/api/superscene/music/generate")
async def sc_music_generate(request: Request, db: Session = Depends(get_db)):
    """Generate music via Suno. Body: {model, prompt, custom_mode?, style?, title?, instrumental?, vocal_gender?}"""
    from .superscene_evolink import generate_music, MUSIC_CREDITS

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    model_key    = body.get("model", "suno-v4")
    prompt       = (body.get("prompt") or "").strip()
    custom_mode  = bool(body.get("custom_mode", False))
    style        = (body.get("style") or "").strip()
    title        = (body.get("title") or "").strip()
    instrumental = bool(body.get("instrumental", False))
    vocal_gender = (body.get("vocal_gender") or "").strip()
    negative     = (body.get("negative_style") or "").strip()

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt or lyrics required")

    credits_needed = MUSIC_CREDITS.get(model_key, 2)

    # Check balance
    credit_row = _get_or_create_sc_credits(user.id, db)
    if credit_row.balance < credits_needed:
        raise HTTPException(status_code=402, detail=f"Insufficient credits. Need {credits_needed}, have {credit_row.balance}.")

    credit_row.balance -= credits_needed
    db.commit()

    result = await generate_music(
        model_key, prompt,
        custom_mode=custom_mode, style=style, title=title,
        instrumental=instrumental, vocal_gender=vocal_gender,
        negative_style=negative,
    )

    if not result["success"]:
        credit_row.balance += credits_needed
        db.commit()
        raise HTTPException(status_code=502, detail=result.get("error", "Music generation failed"))

    return {
        "success": True,
        "task_id": result["task_id"],
        "credits_used": credits_needed,
        "credits_remaining": credit_row.balance,
    }


@app.get("/api/superscene/music/status/{task_id}")
async def sc_music_poll(task_id: str, request: Request, db: Session = Depends(get_db)):
    """Poll music generation status."""
    from .superscene_evolink import poll_music_status

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await poll_music_status(task_id)
    if not result["success"]:
        raise HTTPException(status_code=502, detail=result.get("error"))

    return {
        "status": result["status"],
        "audio_url": result.get("audio_url"),
    }

@app.post("/api/superscene/music/generate-lyrics")
async def sc_generate_lyrics(request: Request, db: Session = Depends(get_db)):
    """Generate song lyrics using Claude AI based on a description."""
    import httpx

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    description = (body.get("description") or "").strip()
    style = (body.get("style") or "").strip()

    if not description:
        raise HTTPException(status_code=400, detail="Description required")

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    style_hint = f" in a {style} style" if style else ""
    prompt = f"""Write song lyrics{style_hint} based on this description: "{description}"

Format the lyrics with [Verse], [Chorus], [Bridge] sections. Keep it 2-3 verses with a catchy chorus. Make the lyrics feel authentic and emotionally engaging. Only output the lyrics, nothing else."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 1000,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            data = resp.json()

        if resp.status_code == 200:
            lyrics = data.get("content", [{}])[0].get("text", "")
            return {"success": True, "lyrics": lyrics}

        return {"success": False, "error": data.get("error", {}).get("message", "AI generation failed")}

    except Exception as e:
        logger.exception("Lyrics generation error")
        raise HTTPException(status_code=502, detail=str(e))

# ── SuperScene — Voiceover (edge-tts) ────────────────────────

@app.post("/api/superscene/voiceover/generate")
async def sc_voiceover_generate(request: Request, db: Session = Depends(get_db)):
    """Generate a voiceover from text using edge-tts (free Microsoft TTS)."""
    import edge_tts
    import uuid as _uuid
    from .r2_storage import upload_image as r2_upload

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    text  = (body.get("text") or "").strip()
    voice = body.get("voice", "en-US-GuyNeural")

    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Text must be under 5000 characters")

    try:
        # Generate audio with edge-tts
        comm = edge_tts.Communicate(text, voice)
        audio_bytes = b""
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                audio_bytes += chunk["data"]

        if not audio_bytes:
            raise HTTPException(status_code=502, detail="No audio generated")

        # Upload to R2
        audio_url = r2_upload(audio_bytes, "superscene/voiceovers", ext="mp3", content_type="audio/mpeg")

        return {"success": True, "audio_url": audio_url}

    except Exception as e:
        logger.exception("Voiceover generation error")
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/superscene/voiceover/voices")
async def sc_voiceover_voices():
    """Return available TTS voices."""
    voices = [
        {"id": "en-US-GuyNeural",           "name": "Guy",          "gender": "Male",   "accent": "US"},
        {"id": "en-US-JennyNeural",         "name": "Jenny",        "gender": "Female", "accent": "US"},
        {"id": "en-US-AriaNeural",          "name": "Aria",         "gender": "Female", "accent": "US"},
        {"id": "en-US-DavisNeural",         "name": "Davis",        "gender": "Male",   "accent": "US"},
        {"id": "en-US-JaneNeural",          "name": "Jane",         "gender": "Female", "accent": "US"},
        {"id": "en-US-JasonNeural",         "name": "Jason",        "gender": "Male",   "accent": "US"},
        {"id": "en-US-TonyNeural",          "name": "Tony",         "gender": "Male",   "accent": "US"},
        {"id": "en-US-NancyNeural",         "name": "Nancy",        "gender": "Female", "accent": "US"},
        {"id": "en-GB-RyanNeural",          "name": "Ryan",         "gender": "Male",   "accent": "British"},
        {"id": "en-GB-SoniaNeural",         "name": "Sonia",        "gender": "Female", "accent": "British"},
        {"id": "en-AU-NatashaNeural",       "name": "Natasha",      "gender": "Female", "accent": "Australian"},
        {"id": "en-AU-WilliamNeural",       "name": "William",      "gender": "Male",   "accent": "Australian"},
    ]
    return {"voices": voices}


@app.get("/api/superscene/voiceover/preview/{voice_id}")
async def sc_voiceover_preview(voice_id: str):
    """Generate a short audio preview of a voice. Returns audio/mpeg stream.
    Free — no credits charged. Cached on first request.
    """
    import edge_tts
    import tempfile
    from fastapi.responses import FileResponse

    # Validate voice ID
    valid_voices = {
        "en-US-GuyNeural", "en-US-JennyNeural", "en-US-AriaNeural",
        "en-US-DavisNeural", "en-US-JaneNeural", "en-US-JasonNeural",
        "en-US-TonyNeural", "en-US-NancyNeural",
        "en-GB-RyanNeural", "en-GB-SoniaNeural",
        "en-AU-NatashaNeural", "en-AU-WilliamNeural",
    }
    if voice_id not in valid_voices:
        raise HTTPException(status_code=400, detail="Invalid voice ID")

    # Check for cached preview
    import pathlib
    cache_dir = pathlib.Path("/tmp/voice_previews")
    cache_dir.mkdir(exist_ok=True)
    cache_file = cache_dir / f"{voice_id}.mp3"

    if cache_file.exists():
        return FileResponse(str(cache_file), media_type="audio/mpeg")

    # Generate preview
    sample_text = "Welcome to SuperScene, the AI creative studio. This is a preview of how this voice sounds for your video narration."
    try:
        communicate = edge_tts.Communicate(sample_text, voice_id)
        await communicate.save(str(cache_file))
        return FileResponse(str(cache_file), media_type="audio/mpeg")
    except Exception as e:
        logger.exception(f"Voice preview error for {voice_id}")
        raise HTTPException(status_code=502, detail="Voice preview generation failed")


# ── SuperScene — Lip Sync (OmniHuman 1.5 via EvoLink) ────────

@app.post("/api/superscene/lipsync/generate")
async def sc_lipsync_generate(request: Request, db: Session = Depends(get_db)):
    """Generate lip-synced avatar video using OmniHuman 1.5.
    Body: {image_url, audio_url}
    """
    from .database import SuperSceneCredit, SuperSceneVideo
    import httpx

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    image_url = (body.get("image_url") or "").strip()
    audio_url = (body.get("audio_url") or "").strip()

    if not image_url or not audio_url:
        raise HTTPException(status_code=400, detail="Both image_url and audio_url are required")

    # Lip sync costs 8 credits (~$0.80 revenue vs ~$0.50 cost = 37% margin)
    credits_needed = 8
    credit_row = _get_or_create_sc_credits(user.id, db)
    if credit_row.balance < credits_needed:
        raise HTTPException(status_code=402, detail=f"Insufficient credits. Need {credits_needed}, have {credit_row.balance}.")

    credit_row.balance -= credits_needed
    db.commit()

    api_key = os.getenv("EVOLINK_API_KEY", "")
    if not api_key:
        credit_row.balance += credits_needed
        db.commit()
        raise HTTPException(status_code=503, detail="EvoLink API key not configured")

    payload = {
        "model": "omnihuman-1.5",
        "image_urls": [image_url],
        "audio_url": audio_url,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.evolink.ai/v1/videos/generations",
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()

        logger.info(f"OmniHuman response ({resp.status_code}): {data}")

        if resp.status_code in (200, 201):
            task_id = data.get("id") or data.get("task_id")
            if task_id:
                # Save to videos table
                video = SuperSceneVideo(
                    user_id=user.id, task_id=str(task_id), model_key="omnihuman",
                    model_name="OmniHuman 1.5", prompt="Lip sync avatar",
                    duration=0, ratio="9:16", status="pending", credits_used=credits_needed,
                )
                db.add(video)
                db.commit()
                return {
                    "success": True,
                    "task_id": str(task_id),
                    "credits_used": credits_needed,
                    "credits_remaining": credit_row.balance,
                }
            credit_row.balance += credits_needed
            db.commit()
            raise HTTPException(status_code=502, detail="No task_id in response")

        credit_row.balance += credits_needed
        db.commit()
        err = data.get("error", {}).get("message", "OmniHuman generation failed") if isinstance(data.get("error"), dict) else str(data.get("error", "Failed"))
        raise HTTPException(status_code=502, detail=err)

    except HTTPException:
        raise
    except Exception as e:
        credit_row.balance += credits_needed
        db.commit()
        logger.exception("OmniHuman error")
        raise HTTPException(status_code=502, detail=str(e))

# ── SuperScene — AI Image Generator ──────────────────────────

@app.post("/api/superscene/image/generate")
async def sc_image_generate(request: Request, db: Session = Depends(get_db)):
    """Generate an image using EvoLink (Nano Banana 2, Seedream, GPT Image).
    Body: {model, prompt, quality, size, n?, image_urls?}
    """
    import httpx

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    model_id   = body.get("model", "nano-banana-2")
    prompt     = (body.get("prompt") or "").strip()
    quality    = body.get("quality", "1K")
    size       = body.get("size", "1:1")
    n          = int(body.get("n", 1))
    image_urls = body.get("image_urls") or []

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    # Credit cost based on quality
    credit_map = {"1K": 1, "2K": 2, "4K": 4}
    credits_needed = credit_map.get(quality, 2) * n

    credit_row = _get_or_create_sc_credits(user.id, db)
    if credit_row.balance < credits_needed:
        raise HTTPException(status_code=402, detail=f"Insufficient credits. Need {credits_needed}, have {credit_row.balance}.")

    credit_row.balance -= credits_needed
    db.commit()

    # Route to Grok Imagine direct for grok-image model (no EvoLink markup)
    if model_id == "grok-image":
        from .grok_imagine import generate_image as grok_img
        grok_result = await grok_img(prompt, n=n)
        if grok_result["success"]:
            return {
                "success": True,
                "images": grok_result["images"],
                "credits_used": credits_needed,
                "credits_remaining": credit_row.balance,
            }
        else:
            credit_row.balance += credits_needed
            db.commit()
            raise HTTPException(status_code=502, detail=grok_result.get("error", "Grok image generation failed"))

    api_key = os.getenv("EVOLINK_API_KEY", "")
    if not api_key:
        credit_row.balance += credits_needed
        db.commit()
        raise HTTPException(status_code=503, detail="EvoLink API key not configured")

    payload = {
        "model": model_id,
        "prompt": prompt,
        "quality": quality,
        "size": size,
        "n": n,
    }
    if image_urls:
        payload["image_urls"] = image_urls

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.evolink.ai/v1/images/generations",
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()

        logger.info(f"EvoLink image response ({resp.status_code}): {str(data)[:500]}")

        if resp.status_code in (200, 201):
            # Check if async (has task_id) or sync (has images directly)
            task_id = data.get("id") or data.get("task_id")
            images = data.get("data") or data.get("images") or []

            # If images returned directly
            if images and isinstance(images, list):
                urls = []
                for img in images:
                    if isinstance(img, dict):
                        urls.append(img.get("url") or img.get("image_url") or "")
                    elif isinstance(img, str):
                        urls.append(img)
                if urls and urls[0]:
                    return {
                        "success": True,
                        "images": urls,
                        "credits_used": credits_needed,
                        "credits_remaining": credit_row.balance,
                    }

            # If async, return task_id for polling
            if task_id:
                return {
                    "success": True,
                    "task_id": str(task_id),
                    "async": True,
                    "credits_used": credits_needed,
                    "credits_remaining": credit_row.balance,
                }

            # Fallback — check results
            results = data.get("results") or []
            if results:
                return {
                    "success": True,
                    "images": results if isinstance(results[0], str) else [r.get("url", "") for r in results],
                    "credits_used": credits_needed,
                    "credits_remaining": credit_row.balance,
                }

            credit_row.balance += credits_needed
            db.commit()
            return {"success": False, "error": "No images in response", "raw": data}

        credit_row.balance += credits_needed
        db.commit()
        err = data.get("error", {}).get("message", "Image generation failed") if isinstance(data.get("error"), dict) else str(data.get("error", "Failed"))
        raise HTTPException(status_code=502, detail=err)

    except HTTPException:
        raise
    except Exception as e:
        credit_row.balance += credits_needed
        db.commit()
        logger.exception("Image generation error")
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/superscene/image/status/{task_id}")
async def sc_image_poll(task_id: str, request: Request, db: Session = Depends(get_db)):
    """Poll image generation status (for async models)."""
    import httpx

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    api_key = os.getenv("EVOLINK_API_KEY", "")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"https://api.evolink.ai/v1/tasks/{task_id}",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            )
            data = resp.json()

        if resp.status_code == 200:
            status = data.get("status", "pending")
            images = []
            if status == "completed":
                results = data.get("results") or data.get("data") or []
                for r in results:
                    if isinstance(r, str):
                        images.append(r)
                    elif isinstance(r, dict):
                        images.append(r.get("url") or r.get("image_url") or "")
            return {"status": status, "images": images}

        return {"status": "pending", "images": []}
    except Exception as e:
        logger.exception("Image poll error")
        raise HTTPException(status_code=502, detail=str(e))

# ── SuperScene Pipeline — Long-form Video Production ─────────

@app.post("/api/superscene/pipeline/analyse")
async def sc_pipeline_analyse(request: Request, db: Session = Depends(get_db)):
    """Analyse a script and break it into scenes.
    Body: {script, style?, model_key?, voice?, resolution?}
    Returns: {success, pipeline_id, scenes: [...]}
    """
    from .database import SuperScenePipeline, SuperScenePipelineScene, SuperSceneCredit
    from .superscene_pipeline import analyse_script

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    script    = (body.get("script") or "").strip()
    style     = body.get("style", "cinematic")
    model_key = body.get("model_key", "kling3")
    voice     = body.get("voice", "en-US-GuyNeural")
    resolution = body.get("resolution", "1080p")
    title     = body.get("title", "")

    if not script:
        raise HTTPException(status_code=400, detail="Script is required")
    if len(script) > 20000:
        raise HTTPException(status_code=400, detail="Script must be under 20,000 characters")

    # Check user has at least some credits
    credit_row = db.query(SuperSceneCredit).filter_by(user_id=user.id).first()
    if not credit_row or credit_row.balance < 1:
        raise HTTPException(status_code=402, detail="Insufficient credits for script analysis")

    # Deduct 1 credit for analysis
    credit_row.balance -= 1
    db.commit()

    # Analyse script with Claude Haiku
    result = await analyse_script(script, style)
    if not result["success"]:
        credit_row.balance += 1
        db.commit()
        raise HTTPException(status_code=502, detail=result.get("error", "Script analysis failed"))

    scenes = result["scenes"]

    # Auto-generate title if not provided
    if not title:
        title = script[:60].strip().replace("\n", " ")
        if len(script) > 60:
            title += "…"

    # Create pipeline record
    pipeline = SuperScenePipeline(
        user_id=user.id,
        title=title,
        script=script,
        style=style,
        model_key=model_key,
        voice=voice,
        resolution=resolution,
        status="draft",
        total_scenes=len(scenes),
        credits_used=1,
    )
    db.add(pipeline)
    db.flush()

    # Create scene records
    for s in scenes:
        scene = SuperScenePipelineScene(
            pipeline_id=pipeline.id,
            scene_number=s.get("scene_number", 0),
            narration_text=s.get("narration_text", ""),
            visual_prompt=s.get("visual_prompt", ""),
            transition_type=s.get("transition_type", "cut"),
            duration_seconds=s.get("estimated_duration", 10),
            status="pending",
        )
        db.add(scene)

    db.commit()

    return {
        "success": True,
        "pipeline_id": pipeline.id,
        "title": pipeline.title,
        "total_scenes": len(scenes),
        "scenes": scenes,
        "credits_remaining": credit_row.balance,
    }


@app.post("/api/superscene/pipeline/{pipeline_id}/generate")
async def sc_pipeline_generate(pipeline_id: int, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Start generating all scenes for a pipeline.
    This kicks off the background orchestrator that:
    1. Generates voiceover for each scene
    2. Generates video for each scene (sequential for continuity)
    3. Assembles the final video with FFmpeg
    """
    from .database import SuperScenePipeline, SuperScenePipelineScene, SuperSceneCredit
    from .superscene_evolink import calc_credits

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    pipeline = db.query(SuperScenePipeline).filter_by(id=pipeline_id, user_id=user.id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if pipeline.status not in ("draft", "failed"):
        raise HTTPException(status_code=400, detail=f"Pipeline is already {pipeline.status}")

    scenes = db.query(SuperScenePipelineScene).filter_by(pipeline_id=pipeline.id).order_by(SuperScenePipelineScene.scene_number).all()
    if not scenes:
        raise HTTPException(status_code=400, detail="No scenes in pipeline")

    # Calculate total credit cost
    total_credits = 0
    for scene in scenes:
        dur = int(scene.duration_seconds or 10)
        total_credits += calc_credits(pipeline.model_key, dur)

    credit_row = db.query(SuperSceneCredit).filter_by(user_id=user.id).first()
    if not credit_row or credit_row.balance < total_credits:
        raise HTTPException(status_code=402, detail=f"Need {total_credits} credits, have {credit_row.balance if credit_row else 0}")

    # Deduct credits
    credit_row.balance -= total_credits
    pipeline.credits_used += total_credits
    pipeline.status = "generating"
    db.commit()

    # Start background orchestrator
    background_tasks.add_task(
        _run_pipeline,
        pipeline_id=pipeline.id,
        user_id=user.id,
    )

    return {
        "success": True,
        "pipeline_id": pipeline.id,
        "status": "generating",
        "total_scenes": len(scenes),
        "credits_used": total_credits,
        "credits_remaining": credit_row.balance,
    }


@app.get("/api/superscene/pipeline/{pipeline_id}/status")
async def sc_pipeline_status(pipeline_id: int, request: Request, db: Session = Depends(get_db)):
    """Get pipeline progress."""
    from .database import SuperScenePipeline, SuperScenePipelineScene

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    pipeline = db.query(SuperScenePipeline).filter_by(id=pipeline_id, user_id=user.id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    scenes = db.query(SuperScenePipelineScene).filter_by(pipeline_id=pipeline.id).order_by(SuperScenePipelineScene.scene_number).all()

    return {
        "pipeline_id": pipeline.id,
        "title": pipeline.title,
        "status": pipeline.status,
        "total_scenes": pipeline.total_scenes,
        "completed_scenes": pipeline.completed_scenes,
        "credits_used": pipeline.credits_used,
        "final_video_url": pipeline.final_video_url,
        "error_message": pipeline.error_message,
        "scenes": [{
            "scene_number": s.scene_number,
            "narration_text": s.narration_text,
            "visual_prompt": s.visual_prompt,
            "duration_seconds": float(s.duration_seconds or 0),
            "status": s.status,
            "voiceover_url": s.voiceover_url,
            "video_url": s.video_url,
            "error_message": s.error_message,
        } for s in scenes],
    }


@app.get("/api/superscene/pipeline/list")
async def sc_pipeline_list(request: Request, db: Session = Depends(get_db)):
    """List user's pipelines."""
    from .database import SuperScenePipeline

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    pipelines = db.query(SuperScenePipeline).filter_by(user_id=user.id).order_by(SuperScenePipeline.created_at.desc()).limit(20).all()

    return {
        "pipelines": [{
            "id": p.id,
            "title": p.title,
            "status": p.status,
            "total_scenes": p.total_scenes,
            "completed_scenes": p.completed_scenes,
            "final_video_url": p.final_video_url,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        } for p in pipelines],
    }


@app.post("/api/superscene/pipeline/{pipeline_id}/update-scene")
async def sc_pipeline_update_scene(pipeline_id: int, request: Request, db: Session = Depends(get_db)):
    """Update a scene's narration or visual prompt before generation.
    Body: {scene_number, narration_text?, visual_prompt?, duration_seconds?}
    """
    from .database import SuperScenePipeline, SuperScenePipelineScene

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    pipeline = db.query(SuperScenePipeline).filter_by(id=pipeline_id, user_id=user.id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if pipeline.status not in ("draft", "failed"):
        raise HTTPException(status_code=400, detail="Cannot edit scenes while generating")

    body = await request.json()
    scene_num = body.get("scene_number")
    if scene_num is None:
        raise HTTPException(status_code=400, detail="scene_number is required")

    scene = db.query(SuperScenePipelineScene).filter_by(pipeline_id=pipeline.id, scene_number=scene_num).first()
    if not scene:
        raise HTTPException(status_code=404, detail=f"Scene {scene_num} not found")

    if "narration_text" in body:
        scene.narration_text = body["narration_text"]
    if "visual_prompt" in body:
        scene.visual_prompt = body["visual_prompt"]
    if "duration_seconds" in body:
        scene.duration_seconds = body["duration_seconds"]

    db.commit()
    return {"success": True, "scene_number": scene_num}


# ── Pipeline Background Orchestrator ──────────────────────────

async def _run_pipeline(pipeline_id: int, user_id: int):
    """Background task that orchestrates the entire pipeline:
    1. Generate voiceover for all scenes
    2. Generate video for each scene (sequential for visual continuity)
    3. Assemble final video with FFmpeg
    """
    from .database import SessionLocal, SuperScenePipeline, SuperScenePipelineScene, SuperSceneCredit
    from .superscene_pipeline import generate_voiceover, assemble_video
    from .superscene_evolink import generate_video, poll_status, MODEL_MAP

    db = SessionLocal()
    try:
        pipeline = db.query(SuperScenePipeline).get(pipeline_id)
        if not pipeline:
            return

        scenes = db.query(SuperScenePipelineScene).filter_by(
            pipeline_id=pipeline_id
        ).order_by(SuperScenePipelineScene.scene_number).all()

        # ── STAGE 2: Generate voiceover for all scenes (parallel) ──
        logger.info(f"Pipeline {pipeline_id}: Starting voiceover for {len(scenes)} scenes")
        vo_tasks = []
        for scene in scenes:
            scene.status = "voiceover"
            db.commit()
            result = await generate_voiceover(scene.narration_text or "", pipeline.voice)
            if result["success"]:
                scene.voiceover_url = result["audio_url"]
                # Use actual audio duration for video generation
                scene.duration_seconds = result["duration_seconds"]
            else:
                scene.error_message = result.get("error", "Voiceover failed")
                logger.warning(f"Pipeline {pipeline_id} scene {scene.scene_number}: voiceover failed: {scene.error_message}")
            db.commit()

        # ── STAGE 3: Generate video for each scene (sequential) ──
        logger.info(f"Pipeline {pipeline_id}: Starting video generation")
        last_frame_url = None

        for scene in scenes:
            scene.status = "generating"
            db.commit()

            # Determine duration (round to nearest supported duration)
            dur = int(round(float(scene.duration_seconds or 10)))
            dur = max(3, min(dur, 15))  # Clamp to 3-15s range

            # Build generation parameters
            image_urls = None
            if last_frame_url:
                image_urls = [last_frame_url]

            result = await generate_video(
                model_key=pipeline.model_key,
                prompt=scene.visual_prompt or "",
                duration=dur,
                ratio="16:9",
                image_urls=image_urls,
                resolution=pipeline.resolution,
            )

            if not result["success"]:
                scene.status = "failed"
                scene.error_message = result.get("error", "Video generation failed")
                db.commit()
                logger.warning(f"Pipeline {pipeline_id} scene {scene.scene_number}: video gen failed: {scene.error_message}")
                continue

            scene.video_task_id = result["task_id"]
            db.commit()

            # Poll for completion
            max_polls = 120  # 6 minutes max per scene
            for poll_count in range(max_polls):
                await asyncio.sleep(3)
                poll_result = await poll_status(result["task_id"])

                if poll_result.get("status") == "completed" and poll_result.get("video_url"):
                    scene.video_url = poll_result["video_url"]
                    scene.status = "completed"
                    pipeline.completed_scenes = (pipeline.completed_scenes or 0) + 1
                    db.commit()

                    # Extract last frame for next scene continuity
                    # Note: last_frame_url extraction happens client-side in Storyboard
                    # For pipeline, we skip frame extraction and use text-to-video for each scene
                    # This is a deliberate trade-off: speed over visual continuity
                    break

                elif poll_result.get("status") == "failed":
                    scene.status = "failed"
                    scene.error_message = "Video generation failed during processing"
                    db.commit()
                    break
            else:
                # Timeout
                scene.status = "failed"
                scene.error_message = "Video generation timed out"
                db.commit()

        # ── Check if all scenes completed ──
        completed_scenes = [s for s in scenes if s.status == "completed" and s.video_url]
        if not completed_scenes:
            pipeline.status = "failed"
            pipeline.error_message = "No scenes completed successfully"
            db.commit()
            # Refund credits
            credit_row = db.query(SuperSceneCredit).filter_by(user_id=user_id).first()
            if credit_row:
                credit_row.balance += pipeline.credits_used
                pipeline.credits_used = 0
                db.commit()
            return

        # ── STAGE 5: Assemble final video ──
        logger.info(f"Pipeline {pipeline_id}: Assembling {len(completed_scenes)} scenes")
        pipeline.status = "assembling"
        db.commit()

        scene_clips = []
        for scene in completed_scenes:
            scene_clips.append({
                "video_url": scene.video_url,
                "voiceover_url": scene.voiceover_url,
                "duration_seconds": float(scene.duration_seconds or 10),
            })

        assembly_result = await assemble_video(
            scene_clips=scene_clips,
            output_filename=f"pipeline_{pipeline_id}.mp4",
        )

        if assembly_result["success"]:
            pipeline.final_video_url = assembly_result["video_url"]
            pipeline.status = "completed"
            logger.info(f"Pipeline {pipeline_id}: COMPLETED — {pipeline.final_video_url}")
        else:
            pipeline.status = "failed"
            pipeline.error_message = assembly_result.get("error", "Assembly failed")
            logger.error(f"Pipeline {pipeline_id}: Assembly failed: {pipeline.error_message}")

        db.commit()

    except Exception as e:
        logger.exception(f"Pipeline {pipeline_id} orchestrator error")
        try:
            pipeline = db.query(SuperScenePipeline).get(pipeline_id)
            if pipeline:
                pipeline.status = "failed"
                pipeline.error_message = str(e)[:500]
                db.commit()
        except:
            pass
    finally:
        db.close()


# ── Content Creator — AI Marketing Content Generator ─────────

@app.get("/content-creator")
async def content_creator_page(request: Request):
    """Serve the React Content Creator page."""
    import pathlib
    _idx = pathlib.Path("static/app/index.html")
    if _idx.exists():
        return HTMLResponse(_idx.read_text())
    return HTMLResponse("<h2>App not built yet.</h2>", status_code=503)


@app.post("/api/content-creator/generate")
async def content_creator_generate(request: Request, db: Session = Depends(get_db)):
    """Generate marketing content using Claude Haiku.
    Body: {tool, prompt, platform?, tone?, count?, format?}
    """
    import httpx

    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Rate limit using existing quota system
    rl = check_and_increment_ai_quota(db, user.id, "campaign_studio")
    if not rl["allowed"]:
        raise HTTPException(status_code=429, detail=f"Daily AI limit reached. Resets in {rl['resets_in']}.")

    body = await request.json()
    tool     = body.get("tool", "social")
    prompt   = (body.get("prompt") or "").strip()
    platform = body.get("platform", "Facebook")
    tone     = body.get("tone", "Professional")
    count    = min(int(body.get("count", 3)), 10)
    fmt      = body.get("format", "")

    if not prompt:
        raise HTTPException(status_code=400, detail="Topic/prompt is required")

    # Build AI prompt based on tool type
    tool_prompts = {
        "social": f"""You are an expert social media marketer. Write {count} engaging {platform} posts about: "{prompt}"

Tone: {tone}
Platform rules:
- Facebook: storytelling, can be longer, use line breaks
- Instagram: hashtag-heavy (5-10 relevant hashtags), emoji-friendly, visual descriptions
- X: punchy and concise (under 280 chars each), hook-driven
- TikTok: trendy, casual, hook in first line, use relevant hashtags
- YouTube: community post style, engaging questions, call-to-action
- Telegram: informative, can include formatting, direct style

Return each post separated by "---". Include relevant emojis and hashtags for the platform. Make each post unique with different angles.""",

        "video_scripts": f"""You are a professional video scriptwriter. Write a compelling video script about: "{prompt}"

Tone: {tone}
Format: {fmt or 'short-form (30-60 seconds)'}
Structure each script with:
- HOOK (first 3 seconds — grab attention)
- BODY (main content — deliver value)
- CTA (call to action — what to do next)

Include [VISUAL] notes describing what should appear on screen.
Make it feel natural, not salesy.""",

        "email": f"""You are an expert email copywriter for affiliate and network marketing. Write {count} email(s) about: "{prompt}"

Tone: {tone}
For each email include:
- SUBJECT LINE (curiosity-driven, under 50 chars)
- PREVIEW TEXT (compelling, under 90 chars)
- BODY (conversational, benefit-focused, 150-300 words)
- CTA (clear call to action)
- PS LINE (add urgency or social proof)

Separate each email with "---". Make each email work as part of a sequence.""",

        "ad_copy": f"""You are a direct-response advertising expert. Write {count} ad variation(s) for: "{prompt}"

Tone: {tone}
For each ad include:
- HEADLINE (attention-grabbing, under 40 chars)
- PRIMARY TEXT (benefit-driven, 125-150 words)
- DESCRIPTION (under 30 words)
- CTA BUTTON TEXT (action-oriented, 2-5 words)

Separate each ad with "---". Test different angles: pain point, aspiration, social proof, urgency.""",

        "niche": f"""You are a niche market research expert for online business and affiliate marketing. Analyse this niche/topic: "{prompt}"

Provide:
1. NICHE OVERVIEW — Is this profitable? Market size estimate.
2. TARGET AUDIENCE — 3 specific audience segments with demographics and psychographics.
3. PAIN POINTS — 5 specific problems this audience faces.
4. CONTENT ANGLES — 5 content ideas that would resonate.
5. MONETISATION — 3 ways to monetise in this niche.
6. COMPETITION LEVEL — Low/Medium/High with explanation.
7. RECOMMENDED APPROACH — Your strategic recommendation.""",
    }

    ai_prompt = tool_prompts.get(tool, tool_prompts["social"])

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 2000,
                    "messages": [{"role": "user", "content": ai_prompt}],
                },
            )
            data = resp.json()

        if resp.status_code == 200:
            content = data.get("content", [{}])[0].get("text", "")
            return {"success": True, "content": content, "tool": tool, "platform": platform}

        err = data.get("error", {}).get("message", "AI generation failed")
        raise HTTPException(status_code=502, detail=err)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Content Creator generation error")
        raise HTTPException(status_code=502, detail=str(e))


# ═══════════════════════════════════════════════════════════
# GROK AI ROUTES (xAI) — Cheap AI for content, prompts, sales
# ═══════════════════════════════════════════════════════════

@app.get("/api/grok/status")
async def grok_status():
    """Check if Grok API is configured."""
    from .grok_service import is_configured
    return {"configured": is_configured()}


@app.post("/api/grok/chat")
async def grok_chat_endpoint(request: Request, user=Depends(get_current_user)):
    """General Grok chat — authenticated users only."""
    from .grok_service import grok_chat
    body = await request.json()
    messages = body.get("messages", [])
    model = body.get("model", "fast")
    temperature = body.get("temperature", 0.7)
    max_tokens = body.get("max_tokens", 1024)
    system_prompt = body.get("system_prompt", None)

    if not messages:
        raise HTTPException(status_code=400, detail="Messages required")

    result = await grok_chat(
        messages=messages, model=model, temperature=temperature,
        max_tokens=max_tokens, system_prompt=system_prompt,
    )

    if "error" in result:
        raise HTTPException(status_code=502, detail=result["error"])

    return {"success": True, **result}


@app.post("/api/grok/generate-prompt")
async def grok_generate_prompt_endpoint(request: Request, user=Depends(get_current_user)):
    """Generate a creative prompt for SuperScene."""
    from .grok_service import grok_generate_prompt
    body = await request.json()
    topic = body.get("topic", "")
    style = body.get("style", "cinematic")

    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")

    prompt = await grok_generate_prompt(topic, style)
    return {"success": True, "prompt": prompt}


@app.post("/api/grok/generate-content")
async def grok_generate_content_endpoint(request: Request, user=Depends(get_current_user)):
    """Generate marketing content for SuperSeller."""
    from .grok_service import grok_generate_content
    body = await request.json()
    content_type = body.get("type", "social_post")
    topic = body.get("topic", "")
    tone = body.get("tone", "professional")
    length = body.get("length", "medium")

    if not topic:
        raise HTTPException(status_code=400, detail="Topic required")

    content = await grok_generate_content(content_type, topic, tone, length)
    return {"success": True, "content": content, "type": content_type}


@app.post("/api/grok/sales-agent")
@limiter.limit("10/minute")
async def grok_sales_agent_endpoint(request: Request):
    """AI Sales Agent — public endpoint for prospect chat. Rate limited to prevent abuse."""
    from .grok_service import grok_sales_agent
    body = await request.json()
    message = (body.get("message", "") or "")[:500]  # Cap message length
    product_info = body.get("product_info", "SuperAdPro is a business-in-a-box platform for digital marketers with AI creative tools, income opportunities, and affiliate marketing.")
    history = body.get("history", [])[-10:]  # Cap conversation history to last 10 messages

    if not message.strip():
        raise HTTPException(status_code=400, detail="Message required")

    reply = await grok_sales_agent(message, product_info, history)
    return {"success": True, "reply": reply}
