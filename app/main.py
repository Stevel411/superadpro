import os
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, Depends, HTTPException, Cookie
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from .database import SessionLocal, User, Payment
from .crud import create_user, verify_password
import re
import bleach

load_dotenv()

logging.basicConfig(filename="security.log", level=logging.WARNING, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="SuperAdPro")
templates = Jinja2Templates(directory="templates")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://superadpro.com", "https://superadpro-production.up.railway.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)

# ── Lockout tracking ──────────────────────────────────────────
failed_attempts = {}
MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

def is_locked_out(identifier):
    if identifier not in failed_attempts:
        return False
    attempts, lockout_time = failed_attempts[identifier]
    if attempts >= MAX_ATTEMPTS:
        if datetime.now() < lockout_time:
            return True
        else:
            del failed_attempts[identifier]
            return False
    return False

def record_failed_attempt(identifier):
    if identifier not in failed_attempts:
        failed_attempts[identifier] = [0, None]
    failed_attempts[identifier][0] += 1
    failed_attempts[identifier][1] = datetime.now() + timedelta(minutes=LOCKOUT_MINUTES)
    logger.warning(f"Failed login: {identifier} attempts: {failed_attempts[identifier][0]}")

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
    if not user_id:
        return None
    try:
        return db.query(User).filter(User.id == int(user_id)).first()
    except:
        return None

def is_admin(user):
    return user is not None and getattr(user, "is_admin", False)

def set_secure_cookie(response, user_id):
    response.set_cookie(
        key="user_id", value=str(user_id),
        httponly=True, secure=False, samesite="lax",
        max_age=60 * 60 * 24 * 30
    )

# ── Validation helpers ────────────────────────────────────────
def validate_username(u): return bool(re.match(r'^[a-zA-Z0-9_]{3,30}$', u))
def validate_email(e): return bool(re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', e))
def validate_wallet(w): return bool(re.match(r'^0x[a-fA-F0-9]{40}$', w))
def sanitize(v): return bleach.clean(v.strip()) if v else ""

BETA_CODE = os.getenv("BETA_CODE")

# ── Dashboard data helper ─────────────────────────────────────
def get_dashboard_context(request: Request, user: User, db: Session) -> dict:
    """Build full context dict for dashboard template."""
    # Recent transactions
    payments = db.query(Payment).filter(
        (Payment.to_user_id == user.id) | (Payment.from_user_id == user.id)
    ).order_by(Payment.created_at.desc()).limit(10).all()

    # Matrix referrals count
    from .database import MatrixPosition
    matrix_positions = db.query(MatrixPosition).filter(
        MatrixPosition.user_id == user.id
    ).count()

    # Sponsor username
    sponsor_username = None
    if user.sponsor_id:
        sponsor = db.query(User).filter(User.id == user.sponsor_id).first()
        if sponsor:
            sponsor_username = sponsor.username

    display_name = user.first_name or user.username

    return {
        "request": request,
        "user": user,
        "display_name": display_name,
        "total_earned": round(user.total_revenue or 0, 2),
        "matrix_earnings": round(user.matrix_earnings or 0, 2),
        "monthly_commission": round(user.monthly_commission or 0, 2),
        "personal_referrals": user.personal_referrals or 0,
        "total_team": user.total_team or 0,
        "matrix_positions": matrix_positions,
        "recent_payments": payments,
        "sponsor_username": sponsor_username,
        "wallet_address": user.wallet_address or "",
        "is_active": user.is_active,
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
    return templates.TemplateResponse("compensation-plan.html", {"request": request})

@app.get("/packages")
def packages(request: Request):
    return templates.TemplateResponse("packages.html", {"request": request})

@app.get("/faq")
def faq(request: Request):
    return templates.TemplateResponse("faq.html", {"request": request})

@app.get("/support")
def support_get(request: Request):
    return templates.TemplateResponse("support.html", {"request": request})

@app.post("/support")
async def support_post(
    request: Request,
    first_name: str = Form(),
    last_name: str = Form(),
    email: str = Form(),
    username: str = Form(""),
    category: str = Form(),
    subject: str = Form(),
    message: str = Form(),
    tx_hash: str = Form(""),
    db: Session = Depends(get_db)
):
    # For now log and return success — email integration can be added later
    logger.warning(f"Support ticket from {email} | {category} | {subject}")
    return templates.TemplateResponse("support.html", {
        "request": request,
        "success": True
    })

@app.get("/legal")
def legal(request: Request):
    return templates.TemplateResponse("legal.html", {"request": request})

@app.get("/contact")
def contact(request: Request):
    return templates.TemplateResponse("support.html", {"request": request})

# ── Referral link handler ─────────────────────────────────────
@app.get("/ref/{username}")
def referral_link(username: str, request: Request):
    """Sets sponsor cookie and redirects to register."""
    response = RedirectResponse(url=f"/register?ref={username}", status_code=302)
    response.set_cookie(key="ref", value=username, max_age=60 * 60 * 24 * 30, httponly=False, samesite="lax")
    return response

# ═══════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/register")
def register_form(request: Request, ref: str = ""):
    # Pre-fill sponsor from query param or cookie
    sponsor = ref or request.cookies.get("ref", "")
    return templates.TemplateResponse("register.html", {"request": request, "sponsor": sponsor})

@app.post("/register")
@limiter.limit("5/minute")
def register_process(
    request: Request,
    first_name: str = Form(),
    last_name: str = Form(),
    username: str = Form(),
    email: str = Form(),
    password: str = Form(),
    confirm_password: str = Form(),
    wallet_address: str = Form(),
    ref: str = Form(""),
    beta_code: str = Form(),
    db: Session = Depends(get_db)
):
    # Sanitise
    username = sanitize(username)
    email = sanitize(email)
    first_name = sanitize(first_name)
    last_name = sanitize(last_name)
    wallet_address = sanitize(wallet_address)
    ref = sanitize(ref)

    def err(msg):
        return templates.TemplateResponse("register.html", {
            "request": request, "error": msg,
            "sponsor": ref,
            "prefill": {"first_name": first_name, "last_name": last_name,
                        "username": username, "email": email,
                        "wallet_address": wallet_address, "ref": ref}
        })

    # Validate beta code
    if BETA_CODE and beta_code != BETA_CODE:
        return err("Invalid beta access code.")

    # Validate fields
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

    # Check duplicates
    existing = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()
    if existing:
        return err("Username or email already registered.")

    # Resolve sponsor
    sponsor_id = None
    if ref:
        sponsor = db.query(User).filter(User.username == ref).first()
        if sponsor:
            sponsor_id = sponsor.id
            sponsor.personal_referrals = (sponsor.personal_referrals or 0) + 1
            sponsor.total_team = (sponsor.total_team or 0) + 1

    # Create user
    user = create_user(
        db, username, email, password,
        sponsor_id=sponsor_id,
        first_name=first_name,
        last_name=last_name,
        wallet_address=wallet_address
    )

    # Clear ref cookie, set session
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
    username: str = Form(),
    password: str = Form(),
    db: Session = Depends(get_db)
):
    username = sanitize(username)
    if is_locked_out(username):
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": f"Account locked due to too many failed attempts. Try again in {LOCKOUT_MINUTES} minutes."
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
        "request": request,
        "error": "Invalid username or password."
    })

@app.get("/logout")
def logout():
    response = RedirectResponse(url="/")
    response.delete_cookie("user_id")
    return response

# ═══════════════════════════════════════════════════════════════
#  PROTECTED ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/dashboard")
def dashboard(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user:
        return RedirectResponse(url="/login")
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("dashboard.html", ctx)

@app.get("/account")
def account(request: Request, user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("account.html", {"request": request, "user": user})

@app.post("/save-wallet")
def save_wallet(
    request: Request,
    wallet_address: str = Form(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user:
        return RedirectResponse(url="/login", status_code=303)
    if wallet_address and not validate_wallet(wallet_address):
        return RedirectResponse(url="/dashboard?error=invalid_wallet", status_code=303)
    user.wallet_address = wallet_address
    db.commit()
    return RedirectResponse(url="/dashboard", status_code=303)

@app.get("/video-library")
def video_library(request: Request, user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("video-library.html", {"request": request, "user": user})

@app.get("/upload-video")
def upload_video(request: Request, user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("upload-video.html", {"request": request, "user": user})

@app.get("/activate-tiers")
def activate_tiers(request: Request, user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("activate-tiers.html", {"request": request, "user": user})

@app.get("/pay-tier")
def pay_tier(request: Request, tier: str, user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("pay-tier.html", {"request": request, "tier": tier, "user": user})

# ═══════════════════════════════════════════════════════════════
#  ADMIN
# ═══════════════════════════════════════════════════════════════

@app.get("/admin")
def admin_panel(request: Request, user: User = Depends(get_current_user)):
    if not user or not is_admin(user):
        logger.warning(f"Unauthorised admin access - IP: {request.client.host}")
        raise HTTPException(status_code=403, detail="Access denied")
    return templates.TemplateResponse("admin.html", {"request": request, "user": user})

# ═══════════════════════════════════════════════════════════════
#  PAYMENT ROUTES
# ═══════════════════════════════════════════════════════════════
from .payment import (
    verify_transaction, process_membership_payment,
    calculate_matrix_distribution, record_payment,
    add_to_reserve, MATRIX_PRICES, MEMBERSHIP_FEE, COMPANY_WALLET
)
from .matrix import place_in_matrix, get_upline_members
from .database import MatrixPosition

@app.get("/pay-membership")
def pay_membership_form(request: Request, user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login")
    if user.is_active:
        return RedirectResponse(url="/dashboard")
    return templates.TemplateResponse("pay-membership.html", {
        "request": request, "user": user, "amount": MEMBERSHIP_FEE
    })

@app.post("/verify-membership")
def verify_membership(
    request: Request,
    tx_hash: str = Form(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user:
        return RedirectResponse(url="/login", status_code=303)
    result = process_membership_payment(db, user.id, tx_hash)
    if result["success"]:
        return RedirectResponse(url="/dashboard?activated=true", status_code=303)
    return templates.TemplateResponse("pay-membership.html", {
        "request": request, "user": user,
        "amount": MEMBERSHIP_FEE, "error": result["error"]
    })

@app.post("/verify-matrix-payment")
def verify_matrix_payment(
    request: Request,
    tx_hash: str = Form(),
    matrix_level: int = Form(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user:
        return RedirectResponse(url="/login", status_code=303)
    if not user.is_active:
        return RedirectResponse(url="/pay-membership", status_code=303)
    if not user.wallet_address:
        return templates.TemplateResponse("pay-tier.html", {
            "request": request, "user": user, "tier": matrix_level,
            "error": "You must save a wallet address before purchasing a matrix position."
        })

    existing_payment = db.query(Payment).filter(Payment.tx_hash == tx_hash).first()
    if existing_payment:
        return templates.TemplateResponse("pay-tier.html", {
            "request": request, "user": user, "tier": matrix_level,
            "error": "Transaction already processed."
        })

    price = MATRIX_PRICES.get(matrix_level)
    if not price:
        return templates.TemplateResponse("pay-tier.html", {
            "request": request, "user": user, "tier": matrix_level,
            "error": "Invalid matrix level."
        })

    sponsor = None
    if user.sponsor_id:
        sponsor = db.query(User).filter(User.id == user.sponsor_id).first()
    sponsor_wallet = sponsor.wallet_address if sponsor and sponsor.wallet_address else None

    verified = verify_transaction(tx_hash, sponsor_wallet or COMPANY_WALLET, price)
    if not verified:
        return templates.TemplateResponse("pay-tier.html", {
            "request": request, "user": user, "tier": matrix_level,
            "error": "Transaction not verified. Please check your transaction hash and try again."
        })

    matrix_result = place_in_matrix(db, user.id, matrix_level, user.sponsor_id or 0)
    if not matrix_result["success"]:
        return templates.TemplateResponse("pay-tier.html", {
            "request": request, "user": user, "tier": matrix_level,
            "error": f"Matrix placement failed: {matrix_result['error']}"
        })

    position = matrix_result["position"]
    upline = get_upline_members(db, position, matrix_level)
    distribution = calculate_matrix_distribution(matrix_level, sponsor_wallet, upline)

    company_amount = distribution["company"][1]
    sponsor_amount = distribution["sponsor"][1]

    record_payment(db, user.id, None, company_amount, f"matrix_{matrix_level}_company_fee", tx_hash + "_company")
    if sponsor:
        sponsor.total_revenue += sponsor_amount
        sponsor.matrix_earnings += sponsor_amount
        sponsor.monthly_commission += sponsor_amount
        record_payment(db, user.id, sponsor.id, sponsor_amount, f"matrix_{matrix_level}_sponsor", tx_hash + "_sponsor")

    for level_num, level_data in distribution["levels"].items():
        if level_data["members"]:
            per_person = level_data["per_person"]
            for wallet in level_data["members"]:
                member = db.query(User).filter(User.wallet_address == wallet).first()
                if member:
                    member.total_revenue += per_person
                    member.matrix_earnings += per_person
                    record_payment(db, user.id, member.id, per_person, f"matrix_{matrix_level}_level_{level_num}", tx_hash + f"_level_{level_num}_{wallet}")
        else:
            add_to_reserve(db, matrix_level, level_num, level_data["total"])

    user.total_revenue += price
    db.commit()

    return RedirectResponse(url="/dashboard?matrix_activated=true", status_code=303)
