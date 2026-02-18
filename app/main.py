from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from .database import SessionLocal, User
from .crud import create_user

app = FastAPI(title="SuperAdPro")
templates = Jinja2Templates(directory="templates")

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

BETA_CODE = "SUPERTEST2026"

@app.get("/")
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/how-it-works")
def how_it_works(request: Request):
    return templates.TemplateResponse("how-it-works.html", {"request": request})

@app.post("/register")
def register(request: Request, username: str = Form(), email: str = Form(), password: str = Form(), beta_code: str = Form(), ref: str = Form(None), db: Session = Depends(get_db)):
    if beta_code != BETA_CODE:
        raise HTTPException(status_code=403, detail="Invalid beta code")
    sponsor_id = None
    if ref:
        sponsor = db.query(User).filter(User.username == ref).first()
        if sponsor: sponsor_id = sponsor.id
    user = create_user(db, username, email, password, sponsor_id)
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": user})
