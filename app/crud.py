from sqlalchemy.orm import Session
from .database import User
import bcrypt

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_user(db: Session, username: str, email: str, password: str, sponsor_id: int = None, first_name: str = None, last_name: str = None, wallet_address: str = None):
    hashed_password = get_password_hash(password)
    user = User(
        username=username,
        email=email,
        password=hashed_password,
        sponsor_id=sponsor_id,
        first_name=first_name,
        last_name=last_name,
        wallet_address=wallet_address
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
