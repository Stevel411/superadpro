from sqlalchemy.orm import Session
from .database import User
import bcrypt

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_user(db: Session, username: str, email: str, password: str,
                sponsor_id: int = None, first_name: str = None,
                last_name: str = None, wallet_address: str = None,
                country: str = None):
    hashed = get_password_hash(password)
    user = User(
        username       = username,
        email          = email,
        password       = hashed,
        sponsor_id     = sponsor_id,
        first_name     = first_name,
        last_name      = last_name,
        wallet_address = wallet_address,
        country        = country,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_sponsor_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()
