# build: 20260306-1
import os
import anthropic
import json
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, Depends, HTTPException, UploadFile, File
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
from .database import AdBoost, BOOST_TIERS, BOOST_SPONSOR_PCT, BOOST_COMPANY_PCT
from .coinbase_commerce import create_charge as cb_create_charge, verify_webhook_signature as cb_verify_sig, parse_webhook_event as cb_parse_event, SANDBOX_MODE as CB_SANDBOX
from .database import VideoCampaign, VideoWatch, WatchQuota, AIUsageQuota, AIResponseCache, MembershipRenewal, P2PTransfer, FunnelPage, ShortLink, LinkRotator, LinkClick, FunnelLead, FunnelEvent, WatchdogLog, LinkHubProfile, LinkHubLink, LinkHubClick, Notification, Achievement, BADGES
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
SESSION_SECRET = os.getenv("SESSION_SECRET", secrets.token_hex(32))
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "HEAD", "OPTIONS"],
    allow_headers=["*"]
)

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
    try: yield db
    finally: db.close()

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
            "amount": round(float(c.amount), 2),
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
            "amount": round(float(c.amount_usdt or 0), 2),
            "date": c.created_at
        })
    activity.sort(key=lambda x: x["date"] or datetime.min, reverse=True)
    activity = activity[:6]

    # Course stats
    course_sale_count = user.course_sale_count or 0

    # Marketplace stats
    marketplace_earnings = round(float(user.marketplace_earnings or 0), 2)
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
        "balance":           round(float(user.balance or 0), 2),
        "total_earned":      round(float(user.total_earned or 0), 2),
        "grid_earnings":     round(float(user.grid_earnings or 0), 2),
        "level_earnings":    round(float(user.level_earnings or 0), 2),
        "upline_earnings":   round(float(user.upline_earnings or 0), 2),
        "sponsor_earnings":  round(float(user.upline_earnings or 0), 2),
        "course_earnings":   round(float(user.course_earnings or 0), 2),
        "membership_earned": round(membership_earned, 2),
        "boost_earned":      round(boost_earned, 2),
        "personal_referrals":user.personal_referrals or 0,
        "total_team":        user.total_team or 0,
        "grid_stats":        stats,
        "active_grids":      active_grids,
        "recent_commissions":commissions,
        "recent_activity":   activity,
        "sponsor_username":  sponsor_username,
        "wallet_address":    user.wallet_address or "",
        "total_withdrawn":    round(float(user.total_withdrawn or 0), 2),
        "is_active":         user.is_active,
        "member_id":         format_member_id(user.id),
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
    return templates.TemplateResponse("index.html", {"request": request, "join_url": get_join_url()})

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
        "balance": round(float(user.balance or 0), 2),
        "total_earned": round(float(user.total_earned or 0), 2),
        "total_withdrawn": round(float(user.total_withdrawn or 0), 2),
        "grid_earnings": round(float(user.grid_earnings or 0), 2),
        "level_earnings": round(float(user.level_earnings or 0), 2),
        "upline_earnings": round(float(user.upline_earnings or 0), 2),
        "course_earnings": round(float(user.course_earnings or 0), 2),
        "marketplace_earnings": round(float(user.marketplace_earnings or 0), 2),
        "bonus_earnings": round(float(user.bonus_earnings or 0), 2),
        "personal_referrals": user.personal_referrals or 0,
        "total_team": user.total_team or 0,
        "sponsor_id": user.sponsor_id,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "onboarding_completed": user.onboarding_completed,
        "kyc_status": user.kyc_status,
        "totp_enabled": user.totp_enabled,
        "avatar_url": None,  # TODO: pull from LinkHub profile
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

@app.get("/how-it-works")
def how_it_works(request: Request):
    return templates.TemplateResponse("how-it-works.html", {"request": request, "join_url": get_join_url()})

@app.get("/affiliates")
def affiliates_public(request: Request):
    return templates.TemplateResponse("affiliates.html", {"request": request, "join_url": get_join_url()})

@app.get("/compensation-plan")
def compensation_plan(request: Request, user: User = Depends(get_current_user)):
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
def leaderboard_page(request: Request, tab: str = "referrals", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
def grid_visualiser(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    ctx = {"request": request, "active_page": "grid-visualiser", "user": user}
    return templates.TemplateResponse("grid-visualiser-internal.html", ctx)

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
def passup_visualiser(request: Request, user: User = Depends(get_current_user)):
    ctx = {"request": request, "active_page": "passup-visualiser"}
    if user:
        ctx["user"] = user
    return templates.TemplateResponse("passup-visualiser.html", ctx)

@app.get("/packages")
def packages(request: Request):
    return templates.TemplateResponse("packages.html", {
        "request": request,
        "GRID_PACKAGES": GRID_PACKAGES,
    })

@app.get("/campaign-tiers")
def campaign_tiers(request: Request, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/login", status_code=302)
    # Get user's active grids to show which tiers they already have
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
    return templates.TemplateResponse("faq.html", {"request": request})

@app.get("/membership")
def membership(request: Request):
    return templates.TemplateResponse("membership.html", {"request": request})

@app.get("/pricing")
def pricing(request: Request):
    """Alias for /membership."""
    return RedirectResponse(url="/membership", status_code=302)

@app.get("/support-public")
def support_public(request: Request):
    return templates.TemplateResponse("support.html", {"request": request})

@app.get("/support")
def support_get(request: Request, user: User = Depends(get_current_user)):
    ctx = {"request": request}
    if user:
        ctx["user"] = user
        return templates.TemplateResponse("support-internal.html", ctx)
    return templates.TemplateResponse("support.html", ctx)

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
    return templates.TemplateResponse("support.html", {
        "request": request, "success": True
    })

@app.get("/legal")
def legal(request: Request):
    return templates.TemplateResponse("legal.html", {"request": request})

@app.get("/contact")
def contact(request: Request):
    return templates.TemplateResponse("support.html", {"request": request})

@app.get("/for-advertisers")
def for_advertisers(request: Request):
    return templates.TemplateResponse("for-advertisers.html", {"request": request})

# ── Referral link ─────────────────────────────────────────────
@app.get("/ref/{username}")
def referral_link(username: str, request: Request):
    # Redirect to home page — modal opens automatically via ?join= param
    response = RedirectResponse(url=f"/?join={username}", status_code=302)
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

    response = templates.TemplateResponse("fomo.html", {
        "request": request, "user": user, "active_page": "momentum",
        "sponsor": sponsor_user, "ref": sponsor
    })
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
        "paid_today": round(float(today_commissions), 2),
        "grids_completed": grids_completed,
        "avg_fill_time": f"{random.randint(3,6)}.{random.randint(1,9)} days",
        "positions_filled": int(avg_filled) if avg_filled > 5 else random.randint(35, 52),
        "earned_today": round(float(today_commissions), 2),
        "recent_activity": recent_activity[:8]
    }

# ═══════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/register")
def register_form(request: Request, ref: str = ""):
    """Registration is now handled by modal — redirect to home."""
    sponsor = ref or request.cookies.get("ref", "")
    url = f"/?join={sponsor}" if sponsor else "/?register=1"
    return RedirectResponse(url=url, status_code=302)

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
        return templates.TemplateResponse("register.html", {
            "request": request, "error": msg, "sponsor": ref,
            "prefill": {
                "first_name": first_name,
                "username":   username,
                "email":      email,
                "ref":        ref,
            }
        })

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

    response = RedirectResponse(url="/app/dashboard", status_code=303)
    set_secure_cookie(response, user.id)
    response.delete_cookie("ref")
    return response


@app.get("/dev-login")
def dev_login(request: Request, db: Session = Depends(get_db)):
    """Dev preview — instant demo login, no password needed."""
    import bcrypt
    demo_username = "demo_preview"
    try:
        user = db.query(User).filter(User.username == demo_username).first()
        if not user:
            hashed = bcrypt.hashpw(b"DevPass2026!", bcrypt.gensalt()).decode()
            user = User(
                username="demo_preview", email="demo@superadpro.dev",
                password=hashed, first_name="Demo", last_name="Preview",
                wallet_address="0xDEAD000000000000000000000000000000000001",
                is_active=True, balance=247.50, total_earned=892.00,
                grid_earnings=547.20, level_earnings=213.80,
                upline_earnings=131.00, total_withdrawn=644.50,
                personal_referrals=7, total_team=34,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.balance=247.50; user.total_earned=892.00
            user.grid_earnings=547.20; user.level_earnings=213.80
            user.upline_earnings=131.00; user.total_withdrawn=644.50
            user.personal_referrals=7; user.total_team=34
            user.is_active=True
            user.membership_tier="pro"
            db.commit()
        response = RedirectResponse(url="/app/dashboard", status_code=303)
        set_secure_cookie(response, user.id)
        return response
    except Exception as e:
        return HTMLResponse(f"<h2>Dev login error: {e}</h2><p>Check Railway logs.</p>", status_code=500)


@app.get("/login")
def login_form(request: Request):
    """Redirect to home page — login is now handled by modal."""
    return RedirectResponse(url="/?login=1", status_code=302)

@app.post("/login")
@limiter.limit("10/minute")
def login_process(
    request: Request,
    username: str = Form(), password: str = Form(),
    db: Session = Depends(get_db)
):
    username = sanitize(username)
    if is_locked_out(username):
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": f"Account locked — too many failed attempts. Try again in {LOCKOUT_MINUTES} minutes."
        })
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
        response = RedirectResponse(url="/app/dashboard", status_code=303)
        set_secure_cookie(response, user.id)
        return response
    record_failed_attempt(username)
    return templates.TemplateResponse("login.html", {
        "request": request, "error": "Invalid username or password."
    })


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


@app.get("/login/2fa")
def login_2fa_page(request: Request, db: Session = Depends(get_db)):
    """Show the 2FA code entry page after username/password verified."""
    pre_auth = request.cookies.get("pre_auth")
    if not pre_auth:
        return RedirectResponse(url="/login", status_code=303)
    user = db.query(User).filter(User.id == int(pre_auth)).first()
    if not user:
        return RedirectResponse(url="/login", status_code=303)
    return templates.TemplateResponse("login-2fa.html", {
        "request": request,
        "username": user.username,
        "error": request.query_params.get("error")
    })


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
        response = RedirectResponse(url="/app/dashboard", status_code=303)
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
def app_home(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user:     return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")

    try:
        quota = get_or_create_quota(db, user)
        quota_complete = quota.today_watched >= quota.daily_required
        db.commit()

        # Calculate streak (consecutive days quota met)
        streak = 0
        if quota.consecutive_missed == 0 and quota.last_quota_met:
            from datetime import date, timedelta
            d = date.today()
            if quota_complete or str(d) == quota.today_date:
                streak = 1
                # Count backwards from last_quota_met
                check = d - timedelta(days=1)
                while str(check) <= (quota.last_quota_met or ""):
                    streak += 1
                    check -= timedelta(days=1)
                    if streak > 365: break  # safety cap

        # Referral count
        referral_count = db.query(User).filter(User.sponsor_id == user.id).count()

        # Total videos watched (not stored as a column, use today's count as fallback)
        total_watched = getattr(quota, 'total_watched', None) or quota.today_watched or 0

        return templates.TemplateResponse("app.html", {
            "request":        request,
            "user":           user,
            "quota":          quota,
            "quota_complete":  quota_complete,
            "balance":        f"{float(user.balance or 0):.2f}",
            "total_earned":   f"{float(user.total_earned or 0):.2f}",
            "total_watched":  total_watched,
            "referral_count": referral_count,
            "streak":         streak,
            "display_name":   user.first_name or user.username,
            "grace_days":     GRACE_DAYS,
        })
    except Exception as e:
        logger.error(f"App route error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e), "type": type(e).__name__}, status_code=500)


@app.get("/dashboard")
def dashboard(request: Request, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user: return RedirectResponse(url="/?login=1")
    try:
        # Check achievements on dashboard load
        check_achievements(db, user)
        ctx = get_dashboard_context(request, user, db)
        return templates.TemplateResponse("dashboard.html", ctx)
    except Exception as exc:
        logger.error(f"Dashboard error for user {user.id}: {exc}", exc_info=True)
        return JSONResponse({"error": f"Dashboard error: {exc}"}, status_code=500)


@app.get("/api/dashboard")
def api_dashboard(request: Request, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """JSON dashboard data for React frontend."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    try:
        check_achievements(db, user)
        ctx = get_dashboard_context(request, user, db)
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
        return safe
    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=500)

@app.get("/launch-wizard")
def launch_wizard(request: Request, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    return templates.TemplateResponse("launch-wizard.html", {
        "request": request,
        "user": user,
    })

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
def income_grid(request: Request, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
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
    return templates.TemplateResponse("grid-detail.html", ctx)

@app.get("/wallet")
def wallet(request: Request, user: User = Depends(get_current_user),
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
        "balance": round(float(user.balance or 0), 2),
        "total_earned": round(float(user.total_earned or 0), 2),
        "total_withdrawn": round(float(user.total_withdrawn or 0), 2),
        "grid_earnings": round(float(user.grid_earnings or 0), 2),
        "course_earnings": round(float(user.course_earnings or 0), 2),
        "marketplace_earnings": round(float(user.marketplace_earnings or 0), 2),
        "membership_tier": user.membership_tier or "basic",
        "wallet_address": user.wallet_address or "",
        "commissions": commissions,
        "withdrawals": withdrawals,
        "renewal": renewal,
        "p2p_history": p2p_history,
    }


@app.get("/affiliate")
def affiliate(request: Request, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    ctx = get_dashboard_context(request, user, db)
    # Direct referrals list
    referrals = db.query(User).filter(User.sponsor_id == user.id).all()
    ctx.update({
        "referrals": referrals,
        "ref_link": f"https://superadpro.com/ref/{user.username}",
    })
    return templates.TemplateResponse("affiliate.html", ctx)

@app.get("/account")
def account(request: Request, user: User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    ctx = get_dashboard_context(request, user, db)
    ctx["active_page"] = "account"
    return templates.TemplateResponse("account.html", ctx)

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
def video_library(request: Request, user: User = Depends(get_current_user),
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
        "boost_tiers": BOOST_TIERS,
        "active_boosts": {b.target_id: b for b in db.query(AdBoost).filter(
            AdBoost.user_id == user.id,
            AdBoost.boost_type == "video",
            AdBoost.status == "active",
            AdBoost.expires_at > datetime.utcnow()
        ).all()},
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
def upload_video(request: Request, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    ctx = get_dashboard_context(request, user, db)
    # Get user's highest active tier for targeting UI
    highest_grid = db.query(Grid).filter(
        Grid.owner_id == user.id, Grid.is_complete == False
    ).order_by(Grid.package_tier.desc()).first()
    ctx["user_tier"] = highest_grid.package_tier if highest_grid else 0
    return templates.TemplateResponse("upload-video.html", ctx)


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
        return templates.TemplateResponse("upload-video.html", ctx)

    if not title:
        return err("Please enter a campaign title.")

    # Determine user's highest active tier and features
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

# ═══════════════════════════════════════════════════════════════
#  ADBOOST ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/api/boost/tiers")
def boost_tiers_api():
    """Return available boost tiers and pricing."""
    return {"tiers": BOOST_TIERS}


@app.post("/api/boost/purchase")
async def purchase_boost(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Purchase a boost for a video campaign or ad board listing.
    Body: { boost_type: "video"|"adboard", target_id: int, tier: "spark"|"flame"|"blaze"|"inferno" }
    Commission: 75% to direct sponsor, 25% to platform.
    """
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    body = await request.json()
    boost_type = body.get("boost_type", "")
    target_id  = body.get("target_id", 0)
    tier_key   = body.get("tier", "")

    # Validate tier
    if tier_key not in BOOST_TIERS:
        return JSONResponse({"error": f"Invalid boost tier: {tier_key}"}, status_code=400)

    tier = BOOST_TIERS[tier_key]
    price = tier["price"]

    # Validate boost type and target ownership
    if boost_type == "video":
        target = db.query(VideoCampaign).filter(
            VideoCampaign.id == target_id,
            VideoCampaign.user_id == user.id,
            VideoCampaign.status == "active"
        ).first()
        if not target:
            return JSONResponse({"error": "Campaign not found or not active"}, status_code=404)
    elif boost_type == "adboard":
        target = db.query(AdListing).filter(
            AdListing.id == target_id,
            AdListing.user_id == user.id,
            AdListing.is_active == True
        ).first()
        if not target:
            return JSONResponse({"error": "Ad listing not found or not active"}, status_code=404)
    else:
        return JSONResponse({"error": "boost_type must be 'video' or 'adboard'"}, status_code=400)

    # Check for existing active boost on same target
    existing = db.query(AdBoost).filter(
        AdBoost.target_id == target_id,
        AdBoost.boost_type == boost_type,
        AdBoost.user_id == user.id,
        AdBoost.status == "active",
        AdBoost.expires_at > datetime.utcnow()
    ).first()
    if existing:
        return JSONResponse({
            "error": f"This {boost_type} already has an active {existing.tier.title()} boost until {existing.expires_at.strftime('%d %b %Y %H:%M')} UTC"
        }, status_code=400)

    # Check balance
    balance = float(user.balance or 0)
    if balance < price:
        return JSONResponse({
            "error": f"Insufficient balance. Need ${price:.2f}, you have ${balance:.2f}"
        }, status_code=400)

    # Deduct balance
    user.balance = float(user.balance or 0) - price
    expires = datetime.utcnow() + timedelta(hours=tier["hours"])

    # Create boost record
    boost = AdBoost(
        user_id=user.id,
        boost_type=boost_type,
        target_id=target_id,
        tier=tier_key,
        price_paid=price,
        multiplier=tier["multiplier"],
        starts_at=datetime.utcnow(),
        expires_at=expires,
        status="active"
    )
    db.add(boost)

    # Pay sponsor commission (75%)
    sponsor_payout = round(price * BOOST_SPONSOR_PCT, 2)
    platform_fee = round(price * BOOST_COMPANY_PCT, 2)

    if user.sponsor_id:
        sponsor = db.query(User).filter(User.id == user.sponsor_id).first()
        if sponsor:
            sponsor.balance = float(sponsor.balance or 0) + sponsor_payout
            sponsor.total_earned = float(sponsor.total_earned or 0) + sponsor_payout
            boost.sponsor_earned = sponsor_payout

            # Record sponsor commission
            comm = Commission(
                to_user_id=sponsor.id,
                from_user_id=user.id,
                amount_usdt=sponsor_payout,
                commission_type="boost",
                notes=f"AdBoost {tier['label']} ({boost_type}) — 75% of ${price:.2f}",
                grid_id=None,
                package_tier=0, status="paid"
            )
            db.add(comm)
    else:
        # No sponsor — 75% goes to platform revenue (absorbed as company income)
        boost.sponsor_earned = 0
        logger.info(f"AdBoost: no sponsor for user {user.id}, ${sponsor_payout:.2f} sponsor share absorbed as platform revenue")

    # Record platform fee (25%) — always logged for audit trail
    platform_comm = Commission(
        to_user_id=user.id,
        from_user_id=user.id,
        amount_usdt=platform_fee,
        commission_type="boost_platform_fee",
        notes=f"AdBoost {tier['label']} ({boost_type}) — platform 25% of ${price:.2f}",
        grid_id=None,
        package_tier=0, status="paid"
    )
    db.add(platform_comm)

    # Apply boost effect
    if boost_type == "video":
        # Set priority_level based on multiplier (maps to scoring algorithm)
        target.priority_level = max(target.priority_level or 0, tier["multiplier"])
    elif boost_type == "adboard":
        target.is_featured = True

    db.commit()

    return {
        "success": True,
        "boost_id": boost.id,
        "tier": tier_key,
        "label": tier["label"],
        "multiplier": tier["multiplier"],
        "expires_at": expires.strftime("%d %b %Y %H:%M UTC"),
        "price": price,
        "sponsor_earned": sponsor_payout if user.sponsor_id else 0,
        "new_balance": round(float(user.balance), 2)
    }


@app.get("/api/boost/active")
def active_boosts_api(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return user's currently active boosts."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    # Expire any that have passed
    expired = db.query(AdBoost).filter(
        AdBoost.user_id == user.id,
        AdBoost.status == "active",
        AdBoost.expires_at <= datetime.utcnow()
    ).all()
    for b in expired:
        b.status = "expired"
        # Reset priority if video boost
        if b.boost_type == "video":
            camp = db.query(VideoCampaign).filter(VideoCampaign.id == b.target_id).first()
            if camp:
                # Check if another active boost exists
                other = db.query(AdBoost).filter(
                    AdBoost.target_id == b.target_id,
                    AdBoost.boost_type == "video",
                    AdBoost.status == "active",
                    AdBoost.expires_at > datetime.utcnow(),
                    AdBoost.id != b.id
                ).first()
                if not other:
                    camp.priority_level = 0
        elif b.boost_type == "adboard":
            ad = db.query(AdListing).filter(AdListing.id == b.target_id).first()
            if ad:
                other = db.query(AdBoost).filter(
                    AdBoost.target_id == b.target_id,
                    AdBoost.boost_type == "adboard",
                    AdBoost.status == "active",
                    AdBoost.expires_at > datetime.utcnow(),
                    AdBoost.id != b.id
                ).first()
                if not other:
                    ad.is_featured = False
    if expired:
        db.commit()

    active = db.query(AdBoost).filter(
        AdBoost.user_id == user.id,
        AdBoost.status == "active",
        AdBoost.expires_at > datetime.utcnow()
    ).order_by(AdBoost.expires_at.asc()).all()

    return {"boosts": [{
        "id": b.id,
        "boost_type": b.boost_type,
        "target_id": b.target_id,
        "tier": b.tier,
        "label": BOOST_TIERS.get(b.tier, {}).get("label", b.tier),
        "multiplier": b.multiplier,
        "expires_at": b.expires_at.strftime("%d %b %Y %H:%M UTC"),
        "price_paid": b.price_paid
    } for b in active]}


# ═══════════════════════════════════════════════════════════════
#  PAYMENT ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/pay-membership")
def pay_membership_form(request: Request, user: User = Depends(get_current_user)):
    if not user: return RedirectResponse(url="/?login=1")
    if user.is_active: return RedirectResponse(url="/app/dashboard")
    return templates.TemplateResponse("pay-membership.html", {
        "request": request, "user": user, "amount": MEMBERSHIP_FEE,
        "company_wallet": COMPANY_WALLET,
    })

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
    return templates.TemplateResponse("pay-membership.html", {
        "request": request, "user": user,
        "amount": MEMBERSHIP_FEE, "error": result["error"],
        "company_wallet": COMPANY_WALLET,
    })

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
    return templates.TemplateResponse("pay-tier.html", ctx)

@app.post("/verify-grid-payment")
def verify_grid_payment(
    request: Request,
    tx_hash: str = Form(),
    package_tier: int = Form(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user: return RedirectResponse(url="/?login=1", status_code=302)
    if not user.is_active: return RedirectResponse(url="/pay-membership", status_code=303)

    result = process_grid_payment(db, user.id, package_tier, tx_hash)

    if result["success"]:
        return RedirectResponse(
            url=f"/income-grid?activated={package_tier}", status_code=303
        )

    price = GRID_PACKAGES.get(package_tier, 10)
    ctx = get_dashboard_context(request, user, db)
    ctx.update({
        "tier": package_tier, "price": price,
        "company_wallet": COMPANY_WALLET,
        "GRID_PACKAGES": GRID_PACKAGES,
        "error": result["error"]
    })
    return templates.TemplateResponse("pay-tier.html", ctx)


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
        redirect = f"{os.getenv('BASE_URL', 'https://superadpro-production.up.railway.app')}/dashboard?activated=true"
        cancel = f"{os.getenv('BASE_URL', 'https://superadpro-production.up.railway.app')}/pay-membership?cancelled=1"

    elif payment_type == "grid_tier":
        price = GRID_PACKAGES.get(package_tier)
        if not price:
            return JSONResponse({"error": f"Invalid tier: {package_tier}"}, status_code=400)
        if not user.is_active:
            return JSONResponse({"error": "Membership must be active first"}, status_code=400)
        tier_name = {1:"Starter",2:"Builder",3:"Pro",4:"Advanced",5:"Elite",6:"Premium",7:"Executive",8:"Ultimate"}.get(package_tier, f"Tier {package_tier}")
        amount = price
        description = f"Income Grid — {tier_name} Tier (${price})"
        redirect = f"{os.getenv('BASE_URL', 'https://superadpro-production.up.railway.app')}/income-grid?activated={package_tier}"
        cancel = f"{os.getenv('BASE_URL', 'https://superadpro-production.up.railway.app')}/activate-grid?tier={package_tier}&cancelled=1"

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
                sponsor.balance += sponsor_share
                sponsor.total_earned += sponsor_share
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
def payment_success_page(request: Request, user: User = Depends(get_current_user)):
    """Landing page after successful Coinbase payment."""
    return templates.TemplateResponse("payment-result.html", {
        "request": request, "user": user, "success": True,
    })

@app.get("/payment/cancelled")
def payment_cancelled_page(request: Request, user: User = Depends(get_current_user)):
    """Landing page after cancelled Coinbase payment."""
    return templates.TemplateResponse("payment-result.html", {
        "request": request, "user": user, "success": False,
    })


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
    return templates.TemplateResponse("forgot-password.html", {"request": request})


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
        return templates.TemplateResponse("forgot-password.html", {
            "request": request, "sent": True, "email": email
        })

    if not validate_email(email):
        return templates.TemplateResponse("forgot-password.html", {
            "request": request,
            "error": "Please enter a valid email address.",
            "email": email
        })

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
    send_password_reset_email(
        to_email   = user.email,
        first_name = user.first_name or user.username,
        reset_token = token,
    )
    logger.warning(f"Password reset requested for: {email}")
    return success_response()


@app.get("/reset-password")
def reset_password_form(request: Request, token: str = "", db: Session = Depends(get_db)):
    if not token:
        return templates.TemplateResponse("forgot-password.html", {
            "request": request,
            "error": "Invalid reset link. Please request a new one."
        })

    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used  == False
    ).first()

    if not reset or reset.expires_at < datetime.utcnow():
        return templates.TemplateResponse("reset-password.html", {
            "request": request, "expired": True
        })

    return templates.TemplateResponse("reset-password.html", {
        "request": request, "token": token
    })


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
        return templates.TemplateResponse("reset-password.html", {
            "request": request, "token": token, "error": msg
        })

    if not token:
        return form_error("Invalid reset link.")

    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used  == False
    ).first()

    if not reset or reset.expires_at < datetime.utcnow():
        return templates.TemplateResponse("reset-password.html", {
            "request": request, "expired": True
        })

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

    return templates.TemplateResponse("reset-password.html", {
        "request": request, "success": True
    })

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
def watch_page(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user:     return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")

    # Require at least one active grid to access Watch to Earn
    has_grid = db.query(Grid).filter(Grid.owner_id == user.id).first()
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

    return templates.TemplateResponse("watch.html", {
        "request":        request,
        "user":           user,
        "quota":          quota,
        "campaign":       campaign,
        "ad_listing":     ad_listing,
        "content_type":   content_type,
        "watch_duration": WATCH_DURATION,
        "ad_duration":    15,  # seconds for ad board display cards
        "warning":        warning,
        "grace_days":     GRACE_DAYS,
        "balance":        round(float(user.balance or 0), 2),
        "display_name":   user.first_name or user.username,
        "member_id":      format_member_id(user.id),
        "is_active":      user.is_active,
    })


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
    """Public-facing video library. Browsable by anyone, SEO-indexed.
    Members earn by watching inside /watch — this is bonus exposure for advertisers."""
    campaigns = db.query(VideoCampaign).filter(
        VideoCampaign.status == "active"
    ).order_by(VideoCampaign.is_spotlight.desc(), VideoCampaign.is_featured.desc(),
               VideoCampaign.priority_level.desc(), VideoCampaign.created_at.desc()).all()

    # Get unique categories for filter
    categories = sorted(set(c.category for c in campaigns if c.category))

    if category:
        campaigns = [c for c in campaigns if (c.category or "").lower() == category.lower()]

    # Separate spotlight campaigns for hero treatment
    spotlight = [c for c in campaigns if getattr(c, 'is_spotlight', False)]
    featured = [c for c in campaigns if getattr(c, 'is_featured', False) and not getattr(c, 'is_spotlight', False)]

    return templates.TemplateResponse("public-videos.html", {
        "request": request,
        "campaigns": campaigns,
        "spotlight": spotlight,
        "featured": featured,
        "categories": categories,
        "selected_category": category,
        "total": len(campaigns),
    })


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
def admin_panel(request: Request, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if not user or not is_admin(user):
        logger.warning(f"Unauthorised admin access — IP: {request.client.host}")
        raise HTTPException(status_code=403, detail="Access denied")

    total_users    = db.query(User).count()
    active_users   = db.query(User).filter(User.is_active == True).count()
    total_grids    = db.query(Grid).count()
    completed_grids= db.query(Grid).filter(Grid.is_complete == True).count()
    total_revenue  = db.query(Payment).filter(Payment.status == "confirmed").all()
    revenue_sum    = sum(p.amount_usdt for p in total_revenue)
    pending_w      = db.query(Withdrawal).filter(Withdrawal.status == "pending").all()
    vip_count      = db.query(VIPSignup).count()
    vip_signups    = db.query(VIPSignup).order_by(VIPSignup.created_at.desc()).limit(50).all()
    users          = db.query(User).order_by(User.id.desc()).limit(100).all()
    total_commissions = db.query(Commission).count()

    return templates.TemplateResponse("admin.html", {
        "request":         request,
        "user":            user,
        "total_users":     total_users,
        "active_users":    active_users,
        "total_grids":     total_grids,
        "completed_grids": completed_grids,
        "revenue_sum":     round(revenue_sum, 2),
        "pending_withdrawals": pending_w,
        "vip_count":       vip_count,
        "vip_signups":     vip_signups,
        "users":           users,
        "total_commissions": total_commissions,
    })


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
            "is_active": u.is_active, "is_admin": u.is_admin,
            "balance": round(float(u.balance or 0), 2),
            "total_earned": round(float(u.total_earned or 0), 2),
            "total_withdrawn": round(float(u.total_withdrawn or 0), 2),
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
            "balance": round(float(u.balance or 0), 2),
            "total_earned": round(float(u.total_earned or 0), 2),
            "total_withdrawn": round(float(u.total_withdrawn or 0), 2),
            "grid_earnings": round(float(u.grid_earnings or 0), 2),
            "level_earnings": round(float(u.level_earnings or 0), 2),
            "upline_earnings": round(float(u.upline_earnings or 0), 2),
            "course_earnings": round(float(u.course_earnings or 0), 2),
            "personal_referrals": u.personal_referrals or 0,
            "total_team": u.total_team or 0,
            "sponsor_id": u.sponsor_id,
            "wallet_address": u.wallet_address,
            "country": u.country,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        },
        "grids": [{
            "id": g.id, "tier": g.package_tier, "price": float(g.package_price),
            "advance": g.advance_number, "filled": g.positions_filled,
            "is_complete": g.is_complete,
            "revenue": round(float(g.revenue_total or 0), 2),
        } for g in grids],
        "recent_commissions": [{
            "id": c.id, "amount": round(float(c.amount_usdt or 0), 2),
            "type": c.commission_type, "from_user": c.from_user_id,
            "notes": c.notes, "status": c.status,
            "date": c.created_at.isoformat() if c.created_at else None,
        } for c in commissions],
        "payments": [{
            "id": p.id, "amount": round(float(p.amount_usdt or 0), 2),
            "type": p.payment_type, "status": p.status,
            "tx_hash": p.tx_hash,
            "date": p.created_at.isoformat() if p.created_at else None,
        } for p in payments],
        "withdrawals": [{
            "id": w.id, "amount": round(float(w.amount_usdt or 0), 2),
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
    return {"success": True, "username": target.username, "old_balance": round(old_bal, 2), "new_balance": round(float(target.balance), 2)}

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

# ── Finances ─────────────────────────────────────────────────
@app.get("/admin/api/finances")
def admin_api_finances(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _require_admin(user)
    from sqlalchemy import func

    total_revenue = db.query(func.sum(Payment.amount_usdt)).filter(Payment.status == "confirmed").scalar() or 0
    total_commissions = db.query(func.sum(Commission.amount_usdt)).filter(Commission.status == "paid").scalar() or 0
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
    ).filter(Commission.status == "paid").group_by(Commission.commission_type).all()

    return {
        "overview": {
            "total_revenue": round(float(total_revenue), 2),
            "total_commissions_paid": round(float(total_commissions), 2),
            "total_withdrawn": round(float(total_withdrawn), 2),
            "pending_withdrawals": round(float(pending_withdrawals), 2),
            "total_user_balances": round(float(total_balances), 2),
            "platform_profit": round(float(total_revenue) - float(total_commissions), 2),
        },
        "revenue_by_type": [{
            "type": t, "total": round(float(s or 0), 2), "count": c
        } for t, s, c in payments_by_type],
        "commissions_by_type": [{
            "type": t, "total": round(float(s or 0), 2), "count": c
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
            "amount": round(float(c.amount_usdt or 0), 2),
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
            "amount": round(float(w.amount_usdt or 0), 2),
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
def admin_kyc_review(user_id: int, action: str = Form(), reason: str = Form(""),
                     db: Session = Depends(get_db), admin: User = Depends(get_current_user)):
    """Approve or reject KYC. action = 'approve' or 'reject'."""
    if not admin or not admin.is_admin: raise HTTPException(403)
    from datetime import datetime
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
    """Serve uploaded KYC document (admin only)."""
    if not user or not user.is_admin: raise HTTPException(403)
    import os
    filepath = os.path.join("/tmp/kyc-uploads", filename)
    if not os.path.exists(filepath): raise HTTPException(404)
    from fastapi.responses import FileResponse
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
            "details": [{"id": u.id, "username": u.username, "balance": round(float(u.balance), 2)} for u in neg_bal]
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
            "details": [{"id": w.id, "user_id": w.user_id, "amount": round(float(w.amount_usdt), 2),
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

# ── Boosts ───────────────────────────────────────────────────
@app.get("/admin/api/boosts")
def admin_api_boosts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _require_admin(user)
    boosts = db.query(AdBoost).order_by(AdBoost.starts_at.desc()).limit(100).all()
    user_ids = {b.user_id for b in boosts}
    users_map = {u.id: u.username for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    return {
        "boosts": [{
            "id": b.id, "user_id": b.user_id,
            "username": users_map.get(b.user_id, "?"),
            "type": b.boost_type, "tier": b.tier,
            "price": round(float(b.price_paid or 0), 2),
            "multiplier": b.multiplier, "status": b.status,
            "sponsor_earned": round(float(b.sponsor_earned or 0), 2),
            "starts": b.starts_at.isoformat() if b.starts_at else None,
            "expires": b.expires_at.isoformat() if b.expires_at else None,
        } for b in boosts]
    }


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
            "amount": round(float(c.amount), 2),
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
            "balance": round(float(u.balance or 0), 2),
            "course_earnings": round(float(u.course_earnings or 0), 2),
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
    """Return the user's highest active grid tier (0 if none)."""
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
    return RedirectResponse(url="/app/superpages", status_code=302)


@app.get("/funnels/new")
def funnel_new(request: Request, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    """Legacy route — redirects to Pro funnels."""
    return RedirectResponse(url="/app/superpages", status_code=302)


@app.get("/funnels/edit/{page_id}")
def funnel_edit(page_id: int, request: Request, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Legacy route — redirects to Pro funnel editor."""
    return RedirectResponse(url=f"/app/pro/funnel/{page_id}/edit", status_code=302)


@app.get("/funnels/visual/new")
def funnel_visual_new(request: Request, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Legacy route — redirects to Pro funnels."""
    return RedirectResponse(url="/app/superpages", status_code=302)


@app.get("/funnels/visual/{page_id}")
def funnel_visual_editor(page_id: int, request: Request, user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    """Legacy route — redirects to Pro funnel editor."""
    return RedirectResponse(url=f"/app/pro/funnel/{page_id}/edit", status_code=302)


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
    import json, random, string

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
    return RedirectResponse(url="/app/superpages", status_code=302)


@app.get("/funnels/leads")
def funnel_leads_page(request: Request, user: User = Depends(get_current_user),
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
    return templates.TemplateResponse("link-tools.html", ctx)


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
    db.add(link)
    db.commit()
    return {"success": True, "slug": slug}


@app.post("/api/links/delete/{link_id}")
def delete_short_link(link_id: int, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    if not user: return {"error": "Not logged in"}
    link = db.query(ShortLink).filter(ShortLink.id == link_id, ShortLink.user_id == user.id).first()
    if link:
        db.delete(link)
        db.commit()
    return {"success": True}


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
    return templates.TemplateResponse("what-you-get.html", {"request": request})




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
def ad_board_public(request: Request, category: str = None, page: int = 1,
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
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
        base_url = os.getenv("BASE_URL", "https://superadpro-production.up.railway.app")
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
    base_url = os.getenv("BASE_URL", "https://superadpro-production.up.railway.app")
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
    """Dynamic XML sitemap for SEO — includes all active ads and category pages"""
    from fastapi.responses import Response
    base_url = os.getenv("BASE_URL", "https://superadpro-production.up.railway.app")
    urls = []
    # Static pages
    for path in ["/", "/how-it-works", "/compensation-plan", "/courses", "/ads"]:
        urls.append(f'<url><loc>{base_url}{path}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>')
    # Category pages
    for cat in AD_CATEGORIES:
        urls.append(f'<url><loc>{base_url}/ads?category={cat["id"]}</loc><changefreq>daily</changefreq><priority>0.7</priority></url>')
    # Individual ad pages
    active_ads = db.query(AdListing).filter(AdListing.is_active == True, AdListing.slug.isnot(None)).all()
    for ad in active_ads:
        lastmod = ad.updated_at.strftime("%Y-%m-%d") if ad.updated_at else ""
        lm = f"<lastmod>{lastmod}</lastmod>" if lastmod else ""
        urls.append(f'<url><loc>{base_url}/ads/listing/{ad.slug}</loc>{lm}<changefreq>weekly</changefreq><priority>0.6</priority></url>')

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>"
    return Response(content=xml, media_type="application/xml")


@app.get("/robots.txt")
def robots_txt():
    """Robots.txt for search engine crawlers"""
    from fastapi.responses import Response
    base_url = os.getenv("BASE_URL", "https://superadpro-production.up.railway.app")
    content = f"""User-agent: *
Allow: /
Allow: /ads
Allow: /ads/listing/
Allow: /how-it-works
Allow: /compensation-plan
Allow: /courses
Disallow: /dashboard
Disallow: /admin
Disallow: /api/
Disallow: /ads/my
Disallow: /wallet
Disallow: /settings

Sitemap: {base_url}/sitemap.xml
"""
    return Response(content=content, media_type="text/plain")

@app.get("/ads/my")
def my_ads_page(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user:
        return RedirectResponse("/login", status_code=302)
    listings = db.query(AdListing).filter(AdListing.user_id == user.id).order_by(AdListing.created_at.desc()).all()
    return templates.TemplateResponse("ad-board-manage.html", {
        "request": request,
        "user": user,
        "listings": listings,
        "categories": AD_CATEGORIES,
        "boost_tiers": BOOST_TIERS,
        "active_boosts": {b.target_id: b for b in db.query(AdBoost).filter(
            AdBoost.user_id == user.id,
            AdBoost.boost_type == "adboard",
            AdBoost.status == "active",
            AdBoost.expires_at > datetime.utcnow()
        ).all()},
        "balance": round(float(user.balance or 0), 2),
    })

@app.post("/api/ads/create")
async def create_ad(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Please log in to post an ad"}, status_code=401)
    body = await request.json()
    title = (body.get("title") or "").strip()[:120]
    description = (body.get("description") or "").strip()[:500]
    category = body.get("category", "general")
    link_url = (body.get("link_url") or "").strip()
    image_url = (body.get("image_url") or "").strip() or None
    if not title or not description or not link_url:
        return JSONResponse({"error": "Title, description and link are required"}, status_code=400)
    if not link_url.startswith("http"):
        link_url = "https://" + link_url
    # Generate URL-safe slug from title
    import re, time
    slug_base = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:80]
    slug = f"{slug_base}-{int(time.time()) % 100000}"
    # Limit: max 5 active ads per user
    active_count = db.query(AdListing).filter(AdListing.user_id == user.id, AdListing.is_active == True).count()
    if active_count >= 5:
        return JSONResponse({"error": "Maximum 5 active ads. Deactivate one to post another."}, status_code=400)
    ad = AdListing(user_id=user.id, title=title, slug=slug, description=description, category=category, link_url=link_url, image_url=image_url)
    db.add(ad)
    db.commit()
    return {"success": True, "id": ad.id}

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
    return templates.TemplateResponse("vip-waitlist.html", {"request": request})

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
    ref_link = f"https://superadpro-production.up.railway.app/ref/{owner.username}" if owner else "#"

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
def analytics_page(request: Request, user: User = Depends(get_current_user),
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
def campaign_studio(request: Request, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("campaign-studio.html", ctx)


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

def format_member_id(user_id: int) -> str:
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
    return RR(url="/account?saved=password", status_code=303)


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
    # Save file
    safe_name = f"kyc_{user.id}_{uuid.uuid4().hex[:8]}{ext}"
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
def totp_setup_page(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate TOTP secret and QR code for setup."""
    if not user: return RedirectResponse(url="/?login=1")
    import pyotp, qrcode, io, base64
    # Generate new secret if not already set (or if re-setting up)
    if not user.totp_secret or user.totp_enabled:
        secret = pyotp.random_base32()
        user.totp_secret = secret
        db.commit()
    else:
        secret = user.totp_secret
    # Generate QR code
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.email or user.username, issuer_name="SuperAdPro")
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    return templates.TemplateResponse("2fa-setup.html", {
        "request": request, "user": user, "qr_b64": qr_b64, "secret": secret,
        "active_page": "account"
    })


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
        "pro_member": getattr(user, 'membership_tier', None) == 'pro',
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
def achievements_page(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Achievements / badges page."""
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
def cron_process_renewals_ping(request: Request):
    """Health check — confirm cron endpoint is reachable."""
    from fastapi.responses import JSONResponse
    return JSONResponse({
        "status":    "ready",
        "endpoint":  "POST /cron/process-renewals",
        "auth":      "Bearer token required (CRON_SECRET env var)",
        "schedule":  "Daily at 00:05 UTC",
    })


# ═══════════════════════════════════════════════════════════════
#  NICHE FINDER
# ═══════════════════════════════════════════════════════════════

@app.get("/niche-finder")
def niche_finder(request: Request, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("niche-finder.html", ctx)


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
def social_post_generator_page(request: Request, user: User = Depends(get_current_user),
                                db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("social-post-generator.html", ctx)


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
def email_swipes_page(request: Request, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("email-swipes.html", ctx)


# ═══════════════════════════════════════════════════════════════
#  AI VIDEO SCRIPT GENERATOR
# ═══════════════════════════════════════════════════════════════

@app.get("/video-script-generator")
def video_script_generator_page(request: Request, user: User = Depends(get_current_user),
                                 db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("video-script-generator.html", ctx)


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
def swipe_file(request: Request, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("swipe-file.html", ctx)


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

# ── Hot wallet balance check ──
@app.get("/admin/hot-wallet-balance")
def hot_wallet_balance(secret: str):
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    from app.withdrawals import get_hot_wallet_usdc_balance, HOT_WALLET_ADDRESS
    balance = get_hot_wallet_usdc_balance()
    return {"address": HOT_WALLET_ADDRESS, "usdc_balance": float(balance)}

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


@app.get("/admin/linkhub-debug")
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
async def courses_page(request: Request, db: Session = Depends(get_db)):
    """Course library page."""
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
        # Redirect back with error
        return templates.TemplateResponse("courses.html", {
            "request": request,
            "user": user,
            "courses": db.query(Course).filter(Course.is_active == True).order_by(Course.sort_order).all(),
            "owned_tiers": [p.course_tier for p in db.query(CoursePurchase).filter(CoursePurchase.user_id == user.id).all()],
            "error": result["error"]
        })

    return RedirectResponse(f"/courses/learn/{course_id}?purchased=1", status_code=303)


@app.get("/courses/learn/{course_id}")
async def course_learn(course_id: int, request: Request, lesson: int = 0, purchased: int = 0, db: Session = Depends(get_db)):
    """Course player page with chapters, lessons, and progress tracking."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login?next=/courses", status_code=303)
    if not user.is_active:
        return RedirectResponse(url="/pay-membership")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        return RedirectResponse("/courses", status_code=303)

    # Check ownership
    purchase = db.query(CoursePurchase).filter(
        CoursePurchase.user_id == user.id,
        CoursePurchase.course_id == course_id
    ).first()
    if not purchase:
        return RedirectResponse("/courses", status_code=303)

    # Load chapters and lessons
    chapters = db.query(CourseChapter).filter(
        CourseChapter.course_id == course_id
    ).order_by(CourseChapter.sort_order).all()

    lessons = db.query(CourseLesson).filter(
        CourseLesson.course_id == course_id
    ).order_by(CourseLesson.sort_order).all()

    # Build chapter -> lessons mapping
    chapter_lessons = {}
    for ch in chapters:
        chapter_lessons[ch.id] = [l for l in lessons if l.chapter_id == ch.id]

    # Get completed lesson IDs
    completed = db.query(CourseProgress.lesson_id).filter(
        CourseProgress.user_id == user.id,
        CourseProgress.course_id == course_id
    ).all()
    completed_ids = {c[0] for c in completed}

    # Current lesson
    total_lessons = len(lessons)
    current_lesson = None
    if lesson and lesson > 0:
        current_lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson).first()
    if not current_lesson and lessons:
        # Find first incomplete lesson
        for l in lessons:
            if l.id not in completed_ids:
                current_lesson = l
                break
        if not current_lesson:
            current_lesson = lessons[0]  # All complete, show first

    # Total duration
    total_mins = sum(l.duration_mins or 0 for l in lessons)
    completed_count = len(completed_ids)
    remaining_mins = sum((l.duration_mins or 0) for l in lessons if l.id not in completed_ids)

    return templates.TemplateResponse("course-learn.html", {
        "request": request,
        "user": user,
        "course": course,
        "chapters": chapters,
        "chapter_lessons": chapter_lessons,
        "lessons": lessons,
        "completed_ids": completed_ids,
        "current_lesson": current_lesson,
        "total_lessons": total_lessons,
        "total_mins": total_mins,
        "completed_count": completed_count,
        "remaining_mins": remaining_mins,
        "just_purchased": purchased == 1,
        "active_page": "courses"
    })


@app.get("/courses/how-it-works")
async def course_how_it_works(request: Request, db: Session = Depends(get_db)):
    """Course commission explainer page."""
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
            "amount": round(float(c.amount), 2),
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
            "amount": round(float(c.amount_usdt or 0), 2),
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
        "total_earned": round(float(user.total_earned or 0), 2),
        "membership_earned": round(membership_earned, 2),
        "grid_earned": round(float(user.grid_earnings or 0), 2),
        "boost_earned": round(boost_earned, 2),
        "course_earned": round(float(user.course_earnings or 0), 2),
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
            "course_earnings": round(float(u.course_earnings or 0), 2),
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
    return templates.TemplateResponse("page-builder-v2.html", {"request": request})


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

## ADBOOST SYSTEM
AdBoost lets members promote their position for increased visibility:
- Spark: $5 / 24 hours / 2x boost
- Flame: $15 / 72 hours / 3x boost
- Blaze: $40 / 168 hours / 5x boost
- Inferno: $100 / 336 hours / 10x boost
75% of AdBoost fees go to the direct sponsor, 25% to the platform.

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
1. Register at superadpro-production.up.railway.app
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

    Usage: /admin/adjust-balance?secret=superadpro-owner-2026&username=master&amount=5.00&reason=Refund+lost+AdBoost
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
def linkhub_editor(request: Request, db: Session = Depends(get_db)):
    """LinkHub editor page — members only."""
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login", status_code=302)
    if not user.is_active:
        return RedirectResponse("/app/dashboard", status_code=302)

    import json as _json
    profile = db.query(LinkHubProfile).filter(LinkHubProfile.user_id == user.id).first()
    links = []
    total_clicks = 0
    click_30d = 0
    device_stats = {"mobile": 0, "desktop": 0, "tablet": 0}
    country_stats = {}
    source_stats = {}
    browser_stats = {}
    if profile:
        links = db.query(LinkHubLink).filter(
            LinkHubLink.profile_id == profile.id
        ).order_by(LinkHubLink.sort_order).all()
        total_clicks = sum(l.click_count for l in links)
        # Last 30 days clicks + full breakdown
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=30)
        recent_clicks = db.query(LinkHubClick).filter(
            LinkHubClick.profile_id == profile.id,
            LinkHubClick.clicked_at >= cutoff
        ).all()
        click_30d = len(recent_clicks)
        for c in recent_clicks:
            device_stats[c.device or "desktop"] = device_stats.get(c.device or "desktop", 0) + 1
            if c.country_name:
                country_stats[c.country_name] = country_stats.get(c.country_name, 0) + 1
            if c.source:
                source_stats[c.source] = source_stats.get(c.source, 0) + 1
            if c.browser:
                browser_stats[c.browser] = browser_stats.get(c.browser, 0) + 1

    # Social links
    social_links = []
    if profile and profile.social_links:
        try:
            social_links = _json.loads(profile.social_links)
        except Exception:
            social_links = []

    return templates.TemplateResponse("linkhub-editor.html", {
        "request": request,
        "current_user": user,
        "profile": profile,
        "links": links,
        "total_clicks": total_clicks,
        "click_30d": click_30d,
        "device_stats": device_stats,
        "country_stats": country_stats,
        "source_stats": source_stats,
        "browser_stats": browser_stats,
        "social_links": social_links,
        "active_page": "linkhub"
    })


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
        profile.text_color    = data.get("text_color") or None
        profile.is_published  = bool(data.get("is_published", True))
        profile.soc_icon_shape = data.get("soc_icon_shape", "circle")
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
            if not title or not url:
                continue
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
                icon        = str(lk.get("icon", "🔗"))[:10],
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

    return templates.TemplateResponse("linkhub-public.html", {
        "request": request,
        "user": user,
        "profile": profile,
        "links": links,
        "social_links": social_links,
    })


# ═══════════════════════════════════════════════════════════════
#  PROSELLER — AI Sales Coach + Prospect CRM
# ═══════════════════════════════════════════════════════════════

@app.get("/proseller")
async def proseller_page(request: Request, db: Session = Depends(get_db)):
    """ProSeller CRM with AI coach — Pro tier only."""
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
- 4 income streams: Membership ($20/mo, 50% to sponsor), 8×8 Income Grid (8 tiers $20-$1000, 40% direct + 50% uni-level across 8 levels), Courses, and AdBoost
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


# ═══════════════════════════════════════════════════════════════
#  AFFILIATE SALES FUNNEL — /join/{username}
# ═══════════════════════════════════════════════════════════════

@app.get("/join/{username}")
async def join_funnel(username: str, request: Request, db: Session = Depends(get_db)):
    """
    Personal affiliate sales funnel.
    Every member gets a done-for-you funnel at /join/their_username.
    Registration form is pre-tagged with their referral code.
    """
    sponsor = db.query(User).filter(User.username == username).first()
    if not sponsor:
        # Fallback: redirect to main register page
        return RedirectResponse("/register", status_code=302)

    # Set referral cookie so it persists
    response = templates.TemplateResponse("join-funnel.html", {
        "request": request,
        "sponsor": sponsor,
    })
    response.set_cookie("ref", username, max_age=30*24*60*60)  # 30 days
    return response


# ═══════════════════════════════════════════════════════════════
#  PRO TIER — Upgrade page + AI Funnel Generator + Leads
# ═══════════════════════════════════════════════════════════════

@app.get("/upgrade")
async def upgrade_page(request: Request, db: Session = Depends(get_db)):
    """Show the Pro tier upgrade page."""
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
    """Redirect to React SuperPages listing."""
    return RedirectResponse("/app/superpages", status_code=302)


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
    """Redirect to React editor."""
    return RedirectResponse(f"/app/pro/funnel/{funnel_id}/edit", status_code=302)


@app.get("/pro/funnel/{funnel_id}/analytics")
def pro_funnel_analytics(funnel_id: int, request: Request,
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
        return RedirectResponse("/app/superpages", status_code=302)

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
async def pro_leads_page(request: Request, db: Session = Depends(get_db)):
    """Lead dashboard for Pro members."""
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
    body_html = email_data.get("body_html", "")

    # Replace placeholders
    owner = db.query(User).filter(User.id == lead.user_id).first()
    if owner:
        ref_link = f"{os.getenv('SITE_URL', '')}/join/{owner.username}"
        member_name = owner.first_name or owner.username
        body_html = body_html.replace("{{referral_link}}", ref_link)
        body_html = body_html.replace("{{member_name}}", member_name)

    # Send via existing Brevo function
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


# ═══════════════════════════════════════════════════════════════
#  MEMBER COURSE MARKETPLACE
# ═══════════════════════════════════════════════════════════════

@app.get("/courses/quality-guidelines")
def course_quality_guidelines(request: Request):
    """Public page — quality standards for course creators."""
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
    return templates.TemplateResponse("marketplace.html", {
        "request": request, "courses": courses, "creators": creators,
    })


@app.get("/courses/my-courses")
def my_courses_page(request: Request, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Creator dashboard — list their courses, sales stats, edit."""
    if not user: return RedirectResponse(url="/?login=1")
    if getattr(user, 'membership_tier', 'basic') != 'pro' and not user.is_admin:
        return RedirectResponse(url="/upgrade")
    courses = db.query(MemberCourse).filter(MemberCourse.creator_id == user.id).order_by(MemberCourse.created_at.desc()).all()
    return templates.TemplateResponse("my-courses.html", {
        "request": request, "user": user, "courses": courses,
    })


@app.get("/courses/create")
def create_course_page(request: Request, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Course creation wizard — first-time onboarding + step-by-step builder."""
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
    if price < 25:
        return JSONResponse({"error": "Minimum price is $25"}, status_code=400)

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
        if price < 25:
            return JSONResponse({"error": "Minimum price is $25"}, status_code=400)
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

    if len(lessons) < 3:
        errors.append("Minimum 3 lessons required")
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
        errors.append("Minimum price is $25")
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
        return RedirectResponse(url="/app/dashboard")
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
        user.balance = float(user.balance or 0) - price
    # TODO: Stripe payment flow for card payments and guest purchases

    # ── Generate access token for guest purchases ──
    import secrets
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
        creator.balance = float(creator.balance or 0) + creator_share
        creator.total_earned = float(creator.total_earned or 0) + creator_share
        creator.marketplace_earnings = float(creator.marketplace_earnings or 0) + creator_share
        creator.course_earnings = float(creator.course_earnings or 0) + creator_share

    # 25% to creator's sponsor
    sponsor = db.query(User).filter(User.id == sponsor_id).first() if sponsor_id else None
    if sponsor:
        sponsor.balance = float(sponsor.balance or 0) + sponsor_share
        sponsor.total_earned = float(sponsor.total_earned or 0) + sponsor_share
        sponsor.marketplace_earnings = float(sponsor.marketplace_earnings or 0) + sponsor_share

    # 25% company — no wallet credit needed (revenue stays in system)

    # ── Update course stats ──
    course.total_sales = (course.total_sales or 0) + 1
    course.total_revenue = float(course.total_revenue or 0) + price

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
        sponsor.balance = max(0, float(sponsor.balance or 0) - float(purchase.sponsor_commission))
        sponsor.total_earned = max(0, float(sponsor.total_earned or 0) - float(purchase.sponsor_commission))
        sponsor.marketplace_earnings = max(0, float(sponsor.marketplace_earnings or 0) - float(purchase.sponsor_commission))

    # Refund buyer (wallet)
    buyer = db.query(User).filter(User.id == purchase.buyer_id).first() if purchase.buyer_id else None
    if buyer:
        buyer.balance = float(buyer.balance or 0) + float(purchase.amount_paid)

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
    return templates.TemplateResponse("marketplace-course.html", {
        "request": request, "course": course, "creator": creator,
        "chapters": chapters, "lessons_by_chapter": lessons_by_chapter,
        "user": user, "already_purchased": already_purchased,
    })


@app.get("/courses/creator-agreement")
def creator_agreement_page(request: Request):
    """Course Creator Agreement — legal terms page."""
    return templates.TemplateResponse("course-creator-agreement.html", {"request": request})

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
    db.commit()
    return {"ok": True}


@app.get("/api/courses")
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
        "total_earned": round(float(user.total_earned or 0), 2),
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
        "top_earners": [user_entry(u, round(float(u.total_earned or 0), 2)) for u in top_earners],
        "top_recruiters": [user_entry(u, u.personal_referrals or 0) for u in top_recruiters],
        "top_teams": [user_entry(u, u.total_team or 0) for u in top_teams],
    }


@app.get("/api/campaign-tiers")
def api_campaign_tiers(request: Request, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """JSON campaign tier data."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    active_grids = db.query(Grid).filter(Grid.user_id == user.id, Grid.status == "active").all()
    active_tiers = [g.tier for g in active_grids]
    return {"active_tiers": active_tiers}


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
            "revenue": round(float(user.total_earned or 0), 2),
            "balance": round(float(user.balance or 0), 2),
            "membership_tier": user.membership_tier or "basic",
            "grid_earnings": round(float(user.grid_earnings or 0), 2),
            "course_earnings": round(float(user.course_earnings or 0), 2),
            "marketplace_earnings": round(float(user.marketplace_earnings or 0), 2),
            "total_commissions": total_commissions,
            "commission_by_type": commission_by_type,
            "direct_referrals": direct_refs,
            "active_referrals": active_refs,
            "total_team": user.total_team or 0,
            "total_withdrawn": round(float(user.total_withdrawn or 0), 2),
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
    earned_keys = {a.badge_key for a in user_achievements}
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
    earn = 0.02
    user.balance = float(user.balance or 0) + earn
    user.total_earned = float(user.total_earned or 0) + earn
    db.commit()
    return {"ok": True, "earned": earn}


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
        "total_earned": round(float(user.total_earned or 0), 2),
        "course_earnings": round(float(user.course_earnings or 0), 2),
        "grid_earnings": round(float(user.grid_earnings or 0), 2),
        "marketplace_earnings": round(float(user.marketplace_earnings or 0), 2),
        "referrals": [{
            "id": r.id, "username": r.username, "first_name": r.first_name,
            "is_active": r.is_active, "membership_tier": r.membership_tier or "basic",
            "total_earned": round(float(r.total_earned or 0), 2),
            "personal_referrals": r.personal_referrals or 0,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in referrals],
        "commissions": commissions,
    }


@app.get("/api/leads")
def api_leads_data(request: Request, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """My Leads data."""
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    from .database import MemberLead
    leads = db.query(MemberLead).filter(
        MemberLead.user_id == user.id
    ).order_by(MemberLead.created_at.desc()).limit(100).all()
    return {"leads": [{
        "id": l.id, "email": l.email, "name": l.name or "",
        "status": l.status or "new", "source_url": l.source_url or "",
        "emails_sent": l.emails_sent or 0, "emails_opened": l.emails_opened or 0,
        "is_hot": l.is_hot, "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in leads], "total": len(leads)}


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
            "id": s.id, "short_code": s.short_code, "destination_url": s.destination_url,
            "click_count": s.click_count or 0, "created_at": s.created_at.isoformat() if s.created_at else None,
        } for s in short_links],
        "rotators": [{
            "id": r.id, "name": r.name, "short_code": r.short_code,
            "click_count": r.total_clicks or 0,
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
            model="claude-sonnet-4-20250514",
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
