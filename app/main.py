from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from datetime import datetime, timedelta

app = FastAPI(title="SuperAdPro")
templates = Jinja2Templates(directory="templates")

# Database
engine = create_engine("sqlite:///./superadpro.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    email = Column(String)
    hashed_password = Column(String)
    sponsor_id = Column(Integer, ForeignKey("users.id"), nullable=True)

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    expiry_date = Column(DateTime)

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
BETA_CODE = "SUPERTEST2026"

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@app.get("/")
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/how-it-works")
def how_it_works(request: Request):
    return templates.TemplateResponse("how-it-works.html", {"request": request})

@app.post("/register")
def register(username: str = Form(), email: str = Form(), password: str = Form(), beta_code: str = Form(), ref: str = Form(None), db: Session = Depends(get_db)):
    if beta_code != BETA_CODE:
        raise HTTPException(status_code=403, detail="Invalid beta code")
    user = User(username=username, email=email, hashed_password=pwd_context.hash(password))
    db.add(user)
    db.commit()
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": user})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
