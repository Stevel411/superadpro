import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Float, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, index=True)
    password = Column(String)
    sponsor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    wallet_address = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    total_revenue = Column(Float, default=0.0)
    monthly_commission = Column(Float, default=0.0)
    matrix_earnings = Column(Float, default=0.0)
    personal_referrals = Column(Integer, default=0)
    overspill_referrals = Column(Integer, default=0)
    total_team = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class MatrixPosition(Base):
    __tablename__ = "matrix_positions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    matrix_level = Column(Integer)
    position = Column(Integer)
    parent_id = Column(Integer, ForeignKey("matrix_positions.id"), nullable=True)
    is_filled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id"))
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    amount_usdt = Column(Float)
    payment_type = Column(String)
    tx_hash = Column(String, unique=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class ReservePool(Base):
    __tablename__ = "reserve_pool"
    id = Column(Integer, primary_key=True, index=True)
    matrix_level = Column(Integer)
    matrix_position_level = Column(Integer)
    amount_usdt = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)
