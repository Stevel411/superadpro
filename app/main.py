import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from .database import SessionLocal, User
from .crud import create_user, verify_password
import re

load_dotenv()

app = FastAPI(title="SuperAdPro")
templates = Jinja2Templates(directory="templates")

# ====================== RATE LIMITING ======================
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ====================== CORS ======================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://superadpro.com"],  # Replace with your domain
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ====================== HTTPS (enable in production) ======================
# Uncomment this line when deployed with HTTPS
# app.add_middleware(HTTPSRedirectMiddleware)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_current_user(request: Request, db: Session = Depends(get_db)):
    user_id = request.cookies.get("user_id")
    if not user_id:
        return None
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except (ValueError, Exception):
        return None

# ====================== INPUT VALIDATION ======================
def validate_username(username: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9_]{3,30}$', username))

def validate_email(email: str) -> bool:
    return bool(re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email))

def validate_wallet(wallet: str) -> bool:
    return bool(re.match(r'^0x[a-fA-F0-9]{40}$', wallet))

def set_secure_cookie(response, user_id: int):
    response.set_cookie(
        key="user_id",
        value=str(user_id),
        httponly=True,
        secure=False,   # Change to True in production with HTTPS
        samesite="lax",
        max_age=60*60*24*30
    )

BETA_CODE = os.getenv("BETA_CODE")

# ====================== WALLET SAVE ======================
@app.post("/save-wallet")
def save_wallet(request: Request, wallet_address: str = Form(), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login", status_code=303)
    if wallet_address and not validate_wallet(wallet_address):
        return RedirectResponse(url="/dashboard?error=invalid_wallet", status_code=303)
    user.wallet_address = wallet_address
    db.commit()
    return RedirectResponse(url="/dashboard", status_code=303)

# ====================== ALL PAGES ======================
@app.get("/")
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/learn")
def learn(request: Request):
    return templates.TemplateResponse("learn.html", {"request": request})

@app.get("/earn")
def earn(request: Request):
    return templates.TemplateResponse("earn.html", {"request": request})

@app.get("/support")
def support(request: Request):
    return templates.TemplateResponse("support.html", {"request": request})

@app.get("/faq")
def faq(request: Request):
    return templates.TemplateResponse("faq.html", {"request": request})

@app.get("/contact")
def contact(request: Request):
    return templates.TemplateResponse("contact.html", {"request": request})

@app.get("/legal")
def legal(request: Request):
    return templates.TemplateResponse("legal.html", {"request": request})

@app.get("/how-it-works")
def how_it_works(request: Request):
    return templates.TemplateResponse("how-it-works.html", {"request": request})

@app.get("/compensation-plan")
def compensation_plan(request: Request):
    return templates.TemplateResponse("compensation-plan.html", {"request": request})

@app.get("/matrix-mechanics")
def matrix_mechanics(request: Request):
    return templates.TemplateResponse("matrix-mechanics.html", {"request": request})

@app.get("/daily-qualification")
def daily_qualification(request: Request):
    return templates.TemplateResponse("daily-qualification.html", {"request": request})

@app.get("/activate-tiers")
def activate_tiers(request: Request, user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("activate-tiers.html", {"request": request, "user": user})

@app.get("/dashboard")
def dashboard(request: Request, user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": user})

@app.get("/for-advertisers")
def for_advertisers(request: Request):
    return templates.TemplateResponse("for-advertisers.html", {"request": request})

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

@app.get("/account")
def account(request: Request, user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("account.html", {"request": request, "user": user})

@app.get("/pay-tier")
def pay_tier(request: Request, tier: str, user: User = Depends(get_current_user)):
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("pay-tier.html", {"request": request, "tier": tier, "user": user})

# ====================== AUTH ======================
@app.get("/register")
def register_form(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.post("/register")
@limiter.limit("5/minute")
def register_process(request: Request, username: str = Form(), email: str = Form(), password: str = Form(), beta_code: str = Form(), ref: str = Form(None), db: Session = Depends(get_db)):
    if beta_code != BETA_CODE:
        return templates.TemplateResponse("register.html", {"request": request, "error": "Invalid beta code."})

    if not validate_username(username):
        return templates.TemplateResponse("register.html", {"request": request, "error": "Username must be 3-30 characters, letters, numbers and underscores only."})

    if not validate_email(email):
        return templates.TemplateResponse("register.html", {"request": request, "error": "Please enter a valid email address."})

    if len(password) < 8:
        return templates.TemplateResponse("register.html", {"request": request, "error": "Password must be at least 8 characters."})

    if len(password.encode('utf-8')) > 72:
        return templates.TemplateResponse("register.html", {"request": request, "error": "Password must be 72 characters or less."})

    existing = db.query(User).filter((User.username == username) | (User.email == email)).first()
    if existing:
        return templates.TemplateResponse("register.html", {"request": request, "error": "Username or email already exists."})

    sponsor_id = None
    if ref:
        sponsor = db.query(User).filter(User.username == ref).first()
        if sponsor:
            sponsor_id = sponsor.id

    user = create_user(db, username, email, password, sponsor_id)

    response = RedirectResponse(url="/dashboard", status_code=303)
    set_secure_cookie(response, user.id)
    return response

@app.get("/login")
def login_form(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
@limiter.limit("10/minute")
def login_process(request: Request, username: str = Form(), password: str = Form(), db: Session = Depends(get_db)):
    user = db.query(User).filter((User.username == username) | (User.email == username)).first()
    if user and verify_password(password, user.password):
        response = RedirectResponse(url="/dashboard", status_code=303)
        set_secure_cookie(response, user.id)
        return response
    return templates.TemplateResponse("login.html", {"request": request, "error": "Invalid username or password"})

@app.get("/logout")
def logout():
    response = RedirectResponse(url="/")
    response.delete_cookie("user_id")
    return response
