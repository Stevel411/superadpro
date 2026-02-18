from sqlalchemy.orm import Session
from passlib.context import CryptContext
from .database import User, Subscription
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password): return pwd_context.hash(password)

def create_user(db: Session, username: str, email: str, password: str, sponsor_id=None):
    user = User(username=username, email=email, hashed_password=get_password_hash(password), sponsor_id=sponsor_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def create_subscription(db: Session, user_id: int, tx_hash: str):
    sub = Subscription(user_id=user_id, expiry_date=datetime.utcnow() + timedelta(days=30), tx_hash=tx_hash)
    db.add(sub)
    db.commit()
    return sub
