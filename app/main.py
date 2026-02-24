import os
import anthropic
import json
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from .database import (
    SessionLocal, User, Payment, Commission, Withdrawal,
    Grid, GridPosition, PasswordResetToken, GRID_PACKAGES, GRID_TOTAL,
    DIRECT_PCT, UNILEVEL_PCT, PER_LEVEL_PCT, PLATFORM_PCT,
    OWNER_PCT, UPLINE_PCT, LEVEL_PCT, COMPANY_PCT
)
from .crud import create_user, verify_password
from .grid import (
    get_grid_stats, get_user_grids, get_grid_positions,
    get_user_commission_history
)
from .email_utils import send_password_reset_email
from .video_utils import parse_video_url, platform_label, platform_colour
from .database import VideoCampaign, VideoWatch, WatchQuota, AIUsageQuota, MembershipRenewal, P2PTransfer
from .database import PasswordResetToken
import secrets
from datetime import timedelta
from .payment import (
    process_membership_payment, process_grid_payment,
    request_withdrawal, get_user_balance, MEMBERSHIP_FEE, COMPANY_WALLET,
    process_p2p_transfer, get_p2p_history, get_renewal_status,
    initialise_renewal_record, process_auto_renewals
)
import re
import bleach

load_dotenv()

logging.basicConfig(
    filename="security.log", level=logging.WARNING,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="SuperAdPro")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    from .database import run_migrations
    run_migrations()
templates = Jinja2Templates(directory="templates")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://superadpro.com",
        "https://superadpro-production.up.railway.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
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

# ── DB / Auth helpers ─────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_current_user(request: Request, db: Session = Depends(get_db)):
    user_id = request.cookies.get("user_id")
    if not user_id: return None
    try: return db.query(User).filter(User.id == int(user_id)).first()
    except: return None

def is_admin(user): return user is not None and getattr(user, "is_admin", False)

def set_secure_cookie(response, user_id):
    response.set_cookie(
        key="user_id", value=str(user_id),
        httponly=True, secure=False, samesite="lax",
        max_age=60 * 60 * 24 * 30
    )

# ── Validation helpers ────────────────────────────────────────
def validate_username(u): return bool(re.match(r'^[a-zA-Z0-9_]{3,30}$', u))
def validate_email(e):    return bool(re.match(r'^[^\@\s]+@[^\@\s]+\.[^\@\s]+$', e))
def validate_wallet(w):   return bool(re.match(r'^0x[a-fA-F0-9]{40}$', w))
def sanitize(v):          return bleach.clean(v.strip()) if v else ""

BETA_CODE = os.getenv("BETA_CODE")

# ── Dashboard context ─────────────────────────────────────────
def get_dashboard_context(request: Request, user: User, db: Session) -> dict:
    stats = get_grid_stats(db, user.id)

    # Recent commissions
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

    return {
        "request":           request,
        "user":              user,
        "display_name":      user.first_name or user.username,
        "balance":           round(user.balance or 0, 2),
        "total_earned":      round(user.total_earned or 0, 2),
        "grid_earnings":     round(user.grid_earnings or 0, 2),
        "level_earnings":    round(user.level_earnings or 0, 2),
        "upline_earnings":   round(user.upline_earnings or 0, 2),
        "sponsor_earnings":  round(user.level_earnings or 0, 2),
        "personal_referrals":user.personal_referrals or 0,
        "total_team":        user.total_team or 0,
        "grid_stats":        stats,
        "active_grids":      active_grids,
        "recent_commissions":commissions,
        "sponsor_username":  sponsor_username,
        "wallet_address":    user.wallet_address or "",
        "total_withdrawn":    round(user.total_withdrawn or 0, 2),
        "is_active":         user.is_active,
        "member_id":         format_member_id(user.id),
        "GRID_PACKAGES":     GRID_PACKAGES,
        "GRID_TOTAL":        GRID_TOTAL,
        "OWNER_PCT":         OWNER_PCT,
        "UPLINE_PCT":        UPLINE_PCT,
        "LEVEL_PCT":         LEVEL_PCT,
        "renewal":           renewal,
    }

# ═══════════════════════════════════════════════════════════════
#  PUBLIC ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/")
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/how-it-works")
def how_it_works(request: Request):
    return templates.TemplateResponse("how-it-works.html", {"request": request})

@app.get("/compensation-plan")
def compensation_plan(request: Request):
    return templates.TemplateResponse("compensation-plan.html", {
        "request": request,
        "GRID_PACKAGES": GRID_PACKAGES,
        "GRID_TOTAL": GRID_TOTAL,
        "OWNER_PCT": OWNER_PCT,
        "UPLINE_PCT": UPLINE_PCT,
        "LEVEL_PCT": LEVEL_PCT,
        "COMPANY_PCT": COMPANY_PCT,
    })

@app.get("/grid-visualiser")
def grid_visualiser(request: Request):
    return templates.TemplateResponse("grid-visualiser.html", {"request": request})

@app.get("/packages")
def packages(request: Request):
    return templates.TemplateResponse("packages.html", {
        "request": request,
        "GRID_PACKAGES": GRID_PACKAGES,
    })

@app.get("/faq")
def faq(request: Request):
    return templates.TemplateResponse("faq.html", {"request": request})

@app.get("/support")
def support_get(request: Request):
    return templates.TemplateResponse("support.html", {"request": request})

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
    beta_code:        str  = Form(""),
    db: Session = Depends(get_db)
):
    username   = sanitize(username)
    email      = sanitize(email)
    first_name = sanitize(first_name)
    ref        = sanitize(ref)

    def err(msg):
        return templates.TemplateResponse("register.html", {
            "request": request, "error": msg, "sponsor": ref,
            "beta_required": bool(BETA_CODE),
            "prefill": {
                "first_name": first_name,
                "username":   username,
                "email":      email,
                "ref":        ref,
            }
        })

    if BETA_CODE and beta_code != BETA_CODE:
        return err("Invalid beta access code.")
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

    response = RedirectResponse(url="/dashboard", status_code=303)
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
            db.commit()
        response = RedirectResponse(url="/dashboard", status_code=303)
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
        response = RedirectResponse(url="/dashboard", status_code=303)
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
        response = JSONResponse({"success": True, "redirect": "/dashboard"})
        set_secure_cookie(response, user.id)
        return response

    record_failed_attempt(username)
    return JSONResponse({"error": "Invalid username or password."}, status_code=401)


@app.get("/logout")
def logout():
    response = RedirectResponse(url="/")
    response.delete_cookie("user_id")
    return response

# ═══════════════════════════════════════════════════════════════
#  PROTECTED DASHBOARD ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/dashboard")
def dashboard(request: Request, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user: return RedirectResponse(url="/?login=1")
    try:
        ctx = get_dashboard_context(request, user, db)
        return templates.TemplateResponse("dashboard.html", ctx)
    except Exception as exc:
        logger.error(f"Dashboard error for user {user.id}: {exc}", exc_info=True)
        return JSONResponse({"error": f"Dashboard error: {exc}"}, status_code=500)

@app.get("/income-grid")
def income_grid(request: Request, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    ctx = get_dashboard_context(request, user, db)
    grids = get_user_grids(db, user.id)
    ctx.update({
        "all_grids": grids,
        "grid_packages": GRID_PACKAGES,
        "selected_tier": int(request.query_params.get("tier", 1)),
    })
    return templates.TemplateResponse("income-grid.html", ctx)

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

@app.get("/video-library")
def video_library(request: Request, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
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
def upload_video(request: Request, user: User = Depends(get_current_user)):
    if not user: return RedirectResponse(url="/?login=1")
    ctx = get_dashboard_context(request, user, db=next(get_db()))
    return templates.TemplateResponse("upload-video.html", ctx)


@app.post("/upload")
def upload_video_post(
    request: Request,
    title:       str = Form(),
    video_url:   str = Form(),
    category:    str = Form(""),
    description: str = Form(""),
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

    parsed = parse_video_url(video_url)
    if not parsed:
        return err("Unsupported video URL. Please paste a YouTube, Rumble, or Vimeo link.")

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
    )
    db.add(campaign)
    db.commit()

    return RedirectResponse(url="/video-library?added=1", status_code=303)

# ═══════════════════════════════════════════════════════════════
#  PAYMENT ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/pay-membership")
def pay_membership_form(request: Request, user: User = Depends(get_current_user)):
    if not user: return RedirectResponse(url="/?login=1")
    if user.is_active: return RedirectResponse(url="/dashboard")
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

@app.post("/withdraw")
def withdraw(
    request: Request,
    amount: float = Form(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user: return RedirectResponse(url="/?login=1", status_code=302)
    result = request_withdrawal(db, user.id, amount)
    redirect_url = "/wallet?withdrawn=true" if result["success"] else f"/wallet?error={result['error']}"
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


def get_next_campaign(db: Session, user_id: int) -> "VideoCampaign | None":
    """Pick next unwatched active campaign for user today, rotating fairly."""
    from datetime import date
    today_str = str(date.today())

    # Campaigns watched today by this user
    watched_today = db.query(VideoWatch.campaign_id).filter(
        VideoWatch.user_id   == user_id,
        VideoWatch.watch_date == today_str
    ).all()
    watched_ids = [w[0] for w in watched_today]

    # Try to find an unwatched active campaign
    campaign = db.query(VideoCampaign).filter(
        VideoCampaign.status == "active",
        ~VideoCampaign.id.in_(watched_ids) if watched_ids else True
    ).order_by(VideoCampaign.views_delivered.asc()).first()

    # If all campaigns watched today, loop back from least viewed
    if not campaign:
        campaign = db.query(VideoCampaign).filter(
            VideoCampaign.status == "active"
        ).order_by(VideoCampaign.views_delivered.asc()).first()

    return campaign


@app.get("/watch")
def watch_page(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user:     return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")

    quota    = get_or_create_quota(db, user)
    campaign = get_next_campaign(db, user.id)
    db.commit()

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
        "watch_duration": WATCH_DURATION,
        "warning":        warning,
        "grace_days":     GRACE_DAYS,
        "balance":        round(user.balance or 0, 2),
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

    # Get next campaign
    next_campaign = get_next_campaign(db, user.id)
    quota_met     = quota.today_watched >= quota.daily_required

    return {
        "success":       True,
        "watched_today": quota.today_watched,
        "required":      quota.daily_required,
        "quota_met":     quota_met,
        "next_campaign": {
            "id":        next_campaign.id,
            "title":     next_campaign.title,
            "embed_url": next_campaign.embed_url,
            "platform":  next_campaign.platform,
        } if next_campaign and not quota_met else None,
    }

# ═══════════════════════════════════════════════════════════════
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

    return templates.TemplateResponse("admin.html", {
        "request":         request,
        "user":            user,
        "total_users":     total_users,
        "active_users":    active_users,
        "total_grids":     total_grids,
        "completed_grids": completed_grids,
        "revenue_sum":     round(revenue_sum, 2),
        "pending_withdrawals": pending_w,
    })


# ═══════════════════════════════════════════════════════════════
#  AI USAGE RATE LIMITING
# ═══════════════════════════════════════════════════════════════

DAILY_LIMITS = {
    "campaign_studio": 10,
    "niche_finder":    10,
}

def check_and_increment_ai_quota(db: Session, user_id: int, tool: str) -> dict:
    """Check daily limit. If within limit, increment and return allowed=True."""
    from datetime import date
    today = date.today().isoformat()
    limit = DAILY_LIMITS.get(tool, 10)

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
#  AI CAMPAIGN STUDIO
# ═══════════════════════════════════════════════════════════════

@app.get("/campaign-studio")
def campaign_studio(request: Request, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
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
            model="claude-sonnet-4-20250514",
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
        beta_code        = body.get("beta_code", "").strip()

        if BETA_CODE and beta_code != BETA_CODE:
            return JSONResponse({"error": "Invalid beta access code."}, status_code=400)
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
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("niche-finder.html", ctx)


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
                    "How I earn passive income watching videos for $20/month",
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
                    "The best passive income streams for people with no fixed schedule",
                    "Night shift to financial freedom — my 90-day plan"
                ],
                "starter_hook": "Working nights and tired of being broke when you get home? I found 3 ways to earn money online that fit perfectly around a night shift schedule — no alarm clocks, no fixed hours, no boss..."
            }
        ]
        return JSONResponse({"niches": demo_niches, "demo": True})

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
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
#  SWIPE FILE
# ═══════════════════════════════════════════════════════════════

@app.get("/swipe-file")
def swipe_file(request: Request, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("swipe-file.html", ctx)



# ── Owner full activation (master affiliate setup) ────────────
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
        from datetime import date
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

