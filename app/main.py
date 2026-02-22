import os
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
    Grid, GridPosition, GRID_PACKAGES, GRID_TOTAL,
    OWNER_PCT, UPLINE_PCT, LEVEL_PCT, COMPANY_PCT
)
from .crud import create_user, verify_password
from .grid import (
    get_grid_stats, get_user_grids, get_grid_positions,
    get_user_commission_history
)
from .payment import (
    process_membership_payment, process_grid_payment,
    request_withdrawal, get_user_balance, MEMBERSHIP_FEE, COMPANY_WALLET
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

    return {
        "request":           request,
        "user":              user,
        "display_name":      user.first_name or user.username,
        "balance":           round(user.balance or 0, 2),
        "total_earned":      round(user.total_earned or 0, 2),
        "grid_earnings":     round(user.grid_earnings or 0, 2),
        "level_earnings":    round(user.level_earnings or 0, 2),
        "upline_earnings":   round(user.upline_earnings or 0, 2),
        "personal_referrals":user.personal_referrals or 0,
        "total_team":        user.total_team or 0,
        "grid_stats":        stats,
        "active_grids":      active_grids,
        "recent_commissions":commissions,
        "sponsor_username":  sponsor_username,
        "wallet_address":    user.wallet_address or "",
        "is_active":         user.is_active,
        "GRID_PACKAGES":     GRID_PACKAGES,
        "GRID_TOTAL":        GRID_TOTAL,
        "OWNER_PCT":         OWNER_PCT,
        "UPLINE_PCT":        UPLINE_PCT,
        "LEVEL_PCT":         LEVEL_PCT,
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
    response = RedirectResponse(url=f"/register?ref={username}", status_code=302)
    response.set_cookie(key="ref", value=username, max_age=60*60*24*30,
                        httponly=False, samesite="lax")
    return response

# ═══════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/register")
def register_form(request: Request, ref: str = ""):
    sponsor = ref or request.cookies.get("ref", "")
    return templates.TemplateResponse("register.html", {
        "request": request, "sponsor": sponsor
    })

@app.post("/register")
@limiter.limit("5/minute")
def register_process(
    request: Request,
    first_name: str = Form(), last_name: str = Form(),
    username: str = Form(), email: str = Form(),
    password: str = Form(), confirm_password: str = Form(),
    wallet_address: str = Form(), ref: str = Form(""),
    beta_code: str = Form(),
    db: Session = Depends(get_db)
):
    username       = sanitize(username)
    email          = sanitize(email)
    first_name     = sanitize(first_name)
    last_name      = sanitize(last_name)
    wallet_address = sanitize(wallet_address)
    ref            = sanitize(ref)

    def err(msg):
        return templates.TemplateResponse("register.html", {
            "request": request, "error": msg, "sponsor": ref,
            "prefill": {
                "first_name": first_name, "last_name": last_name,
                "username": username, "email": email,
                "wallet_address": wallet_address, "ref": ref
            }
        })

    if BETA_CODE and beta_code != BETA_CODE:
        return err("Invalid beta access code.")
    if not first_name or not last_name:
        return err("Please enter your first and last name.")
    if not validate_username(username):
        return err("Username must be 3–30 characters, letters, numbers and underscores only.")
    if not validate_email(email):
        return err("Please enter a valid email address.")
    if len(password) < 8:
        return err("Password must be at least 8 characters.")
    if len(password.encode('utf-8')) > 72:
        return err("Password must be 72 characters or less.")
    if password != confirm_password:
        return err("Passwords do not match.")
    if not validate_wallet(wallet_address):
        return err("Please enter a valid Base Chain wallet address (0x...).")

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
            sponsor.personal_referrals = (sponsor.personal_referrals or 0) + 1
            sponsor.total_team = (sponsor.total_team or 0) + 1

    user = create_user(
        db, username, email, password,
        sponsor_id=sponsor_id, first_name=first_name,
        last_name=last_name, wallet_address=wallet_address
    )

    response = RedirectResponse(url="/dashboard", status_code=303)
    set_secure_cookie(response, user.id)
    response.delete_cookie("ref")
    return response


@app.get("/login")
def login_form(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

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
    if not user: return RedirectResponse(url="/login")
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("dashboard.html", ctx)

@app.get("/income-grid")
def income_grid(request: Request, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/login")
    ctx = get_dashboard_context(request, user, db)
    grids = get_user_grids(db, user.id)
    ctx.update({
        "all_grids": grids,
        "grid_packages": GRID_PACKAGES,
    })
    return templates.TemplateResponse("income-grid.html", ctx)

@app.get("/income-grid/{grid_id}")
def grid_detail(grid_id: int, request: Request,
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/login")
    grid = db.query(Grid).filter(Grid.id == grid_id, Grid.owner_id == user.id).first()
    if not grid: raise HTTPException(status_code=404, detail="Grid not found")
    positions = get_grid_positions(db, grid_id)
    ctx = get_dashboard_context(request, user, db)
    ctx.update({"grid": grid, "positions": positions, "GRID_PACKAGES": GRID_PACKAGES})
    return templates.TemplateResponse("grid-detail.html", ctx)

@app.get("/wallet")
def wallet(request: Request, user: User = Depends(get_current_user),
           db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/login")
    ctx = get_dashboard_context(request, user, db)
    commissions = get_user_commission_history(db, user.id, limit=50)
    withdrawals = db.query(Withdrawal).filter(
        Withdrawal.user_id == user.id
    ).order_by(Withdrawal.requested_at.desc()).limit(20).all()
    ctx.update({
        "commissions": commissions,
        "withdrawals": withdrawals,
    })
    return templates.TemplateResponse("wallet.html", ctx)

@app.get("/affiliate")
def affiliate(request: Request, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/login")
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
    if not user: return RedirectResponse(url="/login")
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("account.html", ctx)

@app.post("/save-wallet")
def save_wallet(
    request: Request,
    wallet_address: str = Form(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user: return RedirectResponse(url="/login", status_code=303)
    if wallet_address and not validate_wallet(wallet_address):
        return RedirectResponse(url="/account?error=invalid_wallet", status_code=303)
    user.wallet_address = wallet_address
    db.commit()
    return RedirectResponse(url="/account?saved=true", status_code=303)

@app.get("/video-library")
def video_library(request: Request, user: User = Depends(get_current_user)):
    if not user: return RedirectResponse(url="/login")
    return templates.TemplateResponse("video-library.html", {"request": request, "user": user})

@app.get("/upload")
def upload_video(request: Request, user: User = Depends(get_current_user)):
    if not user: return RedirectResponse(url="/login")
    return templates.TemplateResponse("upload-video.html", {"request": request, "user": user})

# ═══════════════════════════════════════════════════════════════
#  PAYMENT ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/pay-membership")
def pay_membership_form(request: Request, user: User = Depends(get_current_user)):
    if not user: return RedirectResponse(url="/login")
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
    if not user: return RedirectResponse(url="/login", status_code=303)
    result = process_membership_payment(db, user.id, tx_hash)
    if result["success"]:
        return RedirectResponse(url="/dashboard?activated=true", status_code=303)
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
    if not user: return RedirectResponse(url="/login")
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
    if not user: return RedirectResponse(url="/login", status_code=303)
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
    if not user: return RedirectResponse(url="/login", status_code=303)
    result = request_withdrawal(db, user.id, amount)
    redirect_url = "/wallet?withdrawn=true" if result["success"] else f"/wallet?error={result['error']}"
    return RedirectResponse(url=redirect_url, status_code=303)

# ═══════════════════════════════════════════════════════════════
#  ADMIN ROUTES
# ═══════════════════════════════════════════════════════════════

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
