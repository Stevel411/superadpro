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
    Grid, GridPosition, PasswordResetToken, VIPSignup, AdListing, GRID_PACKAGES, GRID_TOTAL,
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
from .database import VideoCampaign, VideoWatch, WatchQuota, AIUsageQuota, MembershipRenewal, P2PTransfer, FunnelPage, ShortLink, LinkRotator
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
import json as _json
templates.env.filters["from_json"] = lambda s: _json.loads(s) if s else []

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

@app.get("/grid-visualiser")
def grid_visualiser(request: Request, user: User = Depends(get_current_user)):
    ctx = {"request": request}
    if user:
        ctx["user"] = user
        return templates.TemplateResponse("grid-visualiser-internal.html", ctx)
    return templates.TemplateResponse("grid-visualiser.html", ctx)

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
    # Redirect new users to launch wizard
    if not user.onboarding_completed:
        return RedirectResponse(url="/launch-wizard", status_code=302)
    try:
        ctx = get_dashboard_context(request, user, db)
        return templates.TemplateResponse("dashboard.html", ctx)
    except Exception as exc:
        logger.error(f"Dashboard error for user {user.id}: {exc}", exc_info=True)
        return JSONResponse({"error": f"Dashboard error: {exc}"}, status_code=500)

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
                {"name": "Sarah M.", "role": "Marketer", "text": "Within my first month I made back my investment and then some.", "stars": 5},
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
                model="claude-sonnet-4-20250514",
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
    slug = f"{user.username}/my-{niche.lower().replace(' ', '-')}-page"
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
            "preview_url": f"/p/{slug}", "edit_url": f"/funnels/edit/{page.id}"}

@app.post("/api/launch-wizard/generate-posts")
async def generate_social_posts(request: Request, user: User = Depends(get_current_user)):
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
        "tiktok": f"POV: You just found a platform that uses AI to help you build real income in {niche} 🤯\n\nNo experience needed. Multiple income streams. From just $20/month.\n\nLink in bio! 👆\n\n#{niche.replace(' ','')} #makemoneyonline #sidehustle #passiveincome #ai",
        "whatsapp": f"Hey! 👋 I just found something amazing for building income in {niche}. It uses AI to do most of the work and it's only $20/month to get started. I'm already set up — check it out here: {full_link}"
    }

    # Enhance with AI if available
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if api_key:
        try:
            client = anthropic.Anthropic(api_key=api_key)
            resp = client.messages.create(
                model="claude-sonnet-4-20250514",
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
def upload_video(request: Request, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
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

    # Set targeting fields based on user's highest active tier
    highest_grid = db.query(Grid).filter(
        Grid.owner_id == user.id,
        Grid.is_complete == False
    ).order_by(Grid.package_tier.desc()).first()

    if highest_grid:
        campaign.owner_tier = highest_grid.package_tier
        # Priority queue: tiers 5-8 (Elite+) get priority levels 1-4
        if highest_grid.package_tier >= 5:
            campaign.priority_level = highest_grid.package_tier - 4
        # Geo & interest targeting: tier 4+ (Advanced+)
        if highest_grid.package_tier >= 4:
            campaign.target_country = sanitize(target_country)[:200] if target_country else None
            campaign.target_interests = sanitize(target_interests)[:200] if target_interests else None
    
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

    # If no unwatched campaigns, allow re-watches (excluding own)
    if not candidates:
        candidates = db.query(VideoCampaign).filter(
            VideoCampaign.status == "active",
            VideoCampaign.user_id != user_id,
        ).all()

    if not candidates:
        # Last resort: include own campaigns if nothing else exists
        candidates = db.query(VideoCampaign).filter(
            VideoCampaign.status == "active"
        ).all()

    if not candidates:
        return None

    # Score each campaign
    scored = []
    for c in candidates:
        score = 0.0

        # ── Priority boost (Elite tier 5+ gets priority queue placement) ──
        # priority_level: 0=normal (tiers 1-4), 1=Elite, 2=Premium, 3=Executive, 4=Ultimate
        priority = c.priority_level or 0
        score += priority * 100  # strong boost for higher tiers

        # ── View deficit score (campaigns furthest from target get priority) ──
        target = c.views_target or 1
        delivered = c.views_delivered or 0
        pct_remaining = max(0, 1.0 - (delivered / target))
        score += pct_remaining * 50  # up to 50 points for campaigns with 0% delivered

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

        # ── Freshness bonus (newer campaigns get a small boost) ──
        if c.created_at:
            from datetime import datetime
            age_days = (datetime.utcnow() - c.created_at).days
            if age_days < 7:
                score += (7 - age_days) * 3  # up to 21 points for brand new campaigns

        scored.append((score, c))

    # Sort by score descending, pick the best
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


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
#  AI USAGE RATE LIMITING
# ═══════════════════════════════════════════════════════════════

DAILY_LIMITS = {
    "campaign_studio": 10,
    "niche_finder":    10,
    "social_posts":    15,
    "video_scripts":   10,
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
        quota.social_posts_uses = 0
        quota.video_scripts_uses = 0
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
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    ctx = get_dashboard_context(request, user, db)
    pages = db.query(FunnelPage).filter(FunnelPage.user_id == user.id).order_by(FunnelPage.created_at.desc()).all()
    ctx["pages"] = pages
    return templates.TemplateResponse("funnels.html", ctx)


@app.get("/funnels/new")
def funnel_new(request: Request, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    if not user.is_active: return RedirectResponse(url="/pay-membership")
    ctx = get_dashboard_context(request, user, db)
    ctx["page"] = None  # new page
    ctx["edit_mode"] = True
    ctx["page_sections"] = []
    return templates.TemplateResponse("funnel-editor.html", ctx)


@app.get("/funnels/edit/{page_id}")
def funnel_edit(page_id: int, request: Request, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
    page = db.query(FunnelPage).filter(FunnelPage.id == page_id, FunnelPage.user_id == user.id).first()
    if not page: raise HTTPException(status_code=404, detail="Page not found")
    ctx = get_dashboard_context(request, user, db)
    ctx["page"] = page
    ctx["edit_mode"] = True
    import json
    ctx["page_sections"] = json.loads(page.sections_json) if page.sections_json else []
    return templates.TemplateResponse("funnel-editor.html", ctx)


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

    page_id = body.get("id")
    if page_id:
        page = db.query(FunnelPage).filter(FunnelPage.id == page_id, FunnelPage.user_id == user.id).first()
        if not page:
            return JSONResponse({"error": "Page not found"}, status_code=404)
    else:
        page = FunnelPage(user_id=user.id)
        db.add(page)

    # Generate slug from title + username
    import re
    title = body.get("title", "My Page").strip()
    raw_slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    slug = f"{user.username.lower()}/{raw_slug}"

    # Ensure unique slug
    existing = db.query(FunnelPage).filter(FunnelPage.slug == slug, FunnelPage.id != (page.id if page.id else -1)).first()
    if existing:
        slug = f"{slug}-{page.id or 'new'}"

    page.title = title
    page.slug = slug
    page.template_type = body.get("template_type", "opportunity")
    page.headline = body.get("headline", "")
    page.subheadline = body.get("subheadline", "")
    page.body_copy = body.get("body_copy", "")
    page.cta_text = body.get("cta_text", "Get Started Now")
    page.cta_url = body.get("cta_url", "")
    page.video_url = body.get("video_url", "")
    page.image_url = body.get("image_url", "")
    page.color_scheme = body.get("color_scheme", "dark")
    page.accent_color = body.get("accent_color", "#00d4ff")
    page.custom_bg = body.get("custom_bg", "")
    page.status = body.get("status", "draft")
    page.funnel_name = body.get("funnel_name", "")
    page.font_family = body.get("font_family", "Rethink Sans")
    page.meta_description = body.get("meta_description", "")

    # Section-based content
    import json
    sections = body.get("sections")
    if sections is not None:
        page.sections_json = json.dumps(sections)

    db.commit()
    db.refresh(page)

    return JSONResponse({
        "success": True,
        "id": page.id,
        "slug": page.slug,
        "status": page.status,
        "preview_url": f"/p/{page.slug}",
    })


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
            model="claude-sonnet-4-20250514",
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
            "cta_sub": "Join thousands of affiliates who are building real passive income.",
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
            "subheadline": "Discover digital real estate strategies and investment tools that create passive income from property markets.",
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
        "real-estate": [{"num":"01","title":"Learn the Strategies","desc":"Access training on digital real estate, property investment, and passive income methods."},{"num":"02","title":"Build Your Presence","desc":"Use our AI tools to create professional property funnels and investor content."},{"num":"03","title":"Generate Income","desc":"Earn through referrals, property leads, and team building in the real estate niche."}],
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
        "crypto": [{"q":"Is crypto investing risky?","a":"All investing carries risk. Our training focuses heavily on risk management, diversification, and only investing what you can afford to lose."},{"q":"Do I need to understand blockchain?","a":"Our training covers everything from scratch. You'll understand blockchain, wallets, and DeFi step by step."},{"q":"How do I earn beyond just crypto gains?","a":"Our affiliate system pays you commissions every time someone you refer joins the platform — recurring monthly income."},{"q":"Is it too late to invest in crypto?","a":"The crypto market is still in its early growth phase. New opportunities emerge every month with emerging projects and protocols."}],
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
            {"image": "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=500&q=80", "title": "DeFi Strategies", "desc": "Learn yield farming, liquidity pools, staking, and other DeFi strategies that generate passive crypto income."},
            {"image": "https://images.unsplash.com/photo-1639762681057-408e52192e55?w=500&q=80", "title": "Research & Alerts", "desc": "Stay ahead of the market with AI-powered project analysis, on-chain data, and price alerts."},
        ],
        "affiliate-marketing": [
            {"image": "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=500&q=80", "title": "AI-Built Sales Funnels", "desc": "Professional landing pages created by AI in minutes. Just pick your niche, add your link, and start driving traffic."},
            {"image": "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=500&q=80", "title": "Marketing Automation", "desc": "Email sequences, social media posts, and ad copy — all generated by AI and ready to deploy instantly."},
            {"image": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&q=80", "title": "Team Building Tools", "desc": "Track your referrals, manage your growing team, and watch your passive income scale month over month."},
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
            {"image": "https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c?w=500&q=80", "title": "Property Analysis Tools", "desc": "Evaluate deals, estimate ROI, and identify investment opportunities with AI-powered property analysis."},
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
        "crypto": {"title": "The Smart Way to Invest in Crypto", "text": "Forget the hype and FOMO. Our structured approach to cryptocurrency investing focuses on fundamentals, risk management, and sustainable growth. Learn to evaluate projects properly, build a diversified portfolio, and generate passive income through DeFi — all while earning referral commissions by sharing the platform with others.", "image": "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=700&q=80"},
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

    slug_base = niche.lower().replace(' ', '-').replace('&', 'and')
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    slug = f"{user.username}/{slug_base}-{rand}"

    sections_data = json.dumps(sections)
    page = FunnelPage(
        user_id=user.id,
        slug=slug,
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
    db.commit()
    db.refresh(page)

    return {"success": True, "edit_url": f"/funnels/edit/{page.id}"}


@app.post("/api/funnels/delete/{page_id}")
def funnel_delete(page_id: int, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    page = db.query(FunnelPage).filter(FunnelPage.id == page_id, FunnelPage.user_id == user.id).first()
    if not page:
        return JSONResponse({"error": "Page not found"}, status_code=404)
    db.delete(page)
    db.commit()
    return JSONResponse({"success": True})


# ── Public page renderer (no auth required) ──────────────────
@app.get("/p/{username}/{page_slug:path}")
def render_funnel_page(username: str, page_slug: str, request: Request,
                       db: Session = Depends(get_db)):
    slug = f"{username}/{page_slug}"
    page = db.query(FunnelPage).filter(FunnelPage.slug == slug).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Track view
    page.views = (page.views or 0) + 1

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
    page = db.query(FunnelPage).filter(FunnelPage.id == page_id).first()
    if page:
        page.clicks = (page.clicks or 0) + 1
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

    link = ShortLink(
        user_id=user.id,
        slug=slug,
        destination_url=dest,
        title=title
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
def ad_board_public(request: Request, category: str = None, db: Session = Depends(get_db)):
    query = db.query(AdListing).filter(AdListing.is_active == True)
    if category:
        query = query.filter(AdListing.category == category)
    # Featured first, then newest
    listings = query.order_by(AdListing.is_featured.desc(), AdListing.created_at.desc()).limit(60).all()
    # Attach owner usernames
    for listing in listings:
        owner = db.query(User).filter(User.id == listing.user_id).first()
        listing.owner_name = owner.username if owner else "Member"
    return templates.TemplateResponse("ad-board.html", {
        "request": request,
        "listings": listings,
        "categories": AD_CATEGORIES,
        "active_category": category,
        "total_ads": db.query(AdListing).filter(AdListing.is_active == True).count(),
    })

@app.get("/ads/click/{ad_id}")
def ad_click(ad_id: int, db: Session = Depends(get_db)):
    listing = db.query(AdListing).filter(AdListing.id == ad_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Ad not found")
    listing.clicks += 1
    db.commit()
    return RedirectResponse(url=listing.link_url, status_code=302)

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
    # Limit: max 5 active ads per user
    active_count = db.query(AdListing).filter(AdListing.user_id == user.id, AdListing.is_active == True).count()
    if active_count >= 5:
        return JSONResponse({"error": "Maximum 5 active ads. Deactivate one to post another."}, status_code=400)
    ad = AdListing(user_id=user.id, title=title, description=description, category=category, link_url=link_url, image_url=image_url)
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
def go_redirect(slug: str, db: Session = Depends(get_db)):
    """Redirect /go/slug to destination URL with click tracking."""
    from datetime import datetime
    import json, random

    # Check short links first
    link = db.query(ShortLink).filter(ShortLink.slug == slug).first()
    if link:
        link.clicks = (link.clicks or 0) + 1
        link.last_clicked = datetime.utcnow()
        db.commit()
        return RedirectResponse(url=link.destination_url, status_code=302)

    # Check rotators
    rotator = db.query(LinkRotator).filter(LinkRotator.slug == slug).first()
    if rotator and rotator.destinations_json:
        dests = json.loads(rotator.destinations_json)
        if not dests:
            raise HTTPException(status_code=404, detail="No destinations configured")

        if rotator.mode == "weighted":
            # Weighted random selection
            total_weight = sum(d.get("weight", 50) for d in dests)
            r = random.uniform(0, total_weight)
            cumulative = 0
            chosen = dests[0]
            for d in dests:
                cumulative += d.get("weight", 50)
                if r <= cumulative:
                    chosen = d
                    break
        else:
            # Equal round-robin
            idx = (rotator.current_index or 0) % len(dests)
            chosen = dests[idx]
            rotator.current_index = idx + 1

        # Track clicks
        chosen["clicks"] = chosen.get("clicks", 0) + 1
        rotator.destinations_json = json.dumps(dests)
        rotator.total_clicks = (rotator.total_clicks or 0) + 1
        rotator.last_clicked = datetime.utcnow()
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
- Members earn by: watching daily videos (Watch & Earn), referring others (25% direct commission), and the 8x8 Profit Engine Grid (uni-level commissions)
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
            reply = f"There are multiple ways to earn: direct referral commissions (25%), uni-level commissions through the 8x8 grid system, and you can use the marketing tools to promote any affiliate offer you like. Results vary based on effort and team building — I won't make any unrealistic promises."
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
            model="claude-sonnet-4-20250514",
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
            model="claude-sonnet-4-20250514",
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

        # Send welcome email (fails silently if not configured)
        try:
            from app.email_utils import send_welcome_email
            send_welcome_email(email, first_name, username)
        except Exception as e:
            logger.warning(f"Welcome email failed for {email}: {e}")

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
#  AI SOCIAL MEDIA POST GENERATOR
# ═══════════════════════════════════════════════════════════════

@app.get("/social-post-generator")
def social_post_generator_page(request: Request, user: User = Depends(get_current_user),
                                db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
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
            model="claude-sonnet-4-20250514",
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
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("email-swipes.html", ctx)


# ═══════════════════════════════════════════════════════════════
#  AI VIDEO SCRIPT GENERATOR
# ═══════════════════════════════════════════════════════════════

@app.get("/video-script-generator")
def video_script_generator_page(request: Request, user: User = Depends(get_current_user),
                                 db: Session = Depends(get_db)):
    if not user: return RedirectResponse(url="/?login=1")
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
            model="claude-sonnet-4-20250514",
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
    ctx = get_dashboard_context(request, user, db)
    return templates.TemplateResponse("swipe-file.html", ctx)



# ── Test email sending ────────────
@app.get("/admin/test-email")
def test_email(secret: str, email: str):
    from fastapi.responses import JSONResponse
    if secret != "superadpro-owner-2026":
        return JSONResponse({"error": "Invalid secret"}, status_code=403)
    try:
        from app.email_utils import send_commission_email, send_welcome_email
        r1 = send_welcome_email(email, "Steve", "SuperAdPro")
        r2 = send_commission_email(email, "Steve", "Direct Sponsor", "testuser123")
        return JSONResponse({"welcome_sent": r1, "commission_sent": r2})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


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

