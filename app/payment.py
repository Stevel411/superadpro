import os
from web3 import Web3
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from .database import User, Payment, ReservePool
from datetime import datetime

load_dotenv()

BASE_RPC_URL = os.getenv("BASE_RPC_URL")
USDT_CONTRACT = os.getenv("USDT_CONTRACT")
COMPANY_WALLET = os.getenv("COMPANY_WALLET")
MASTER_AFFILIATE_WALLET = os.getenv("MASTER_AFFILIATE_WALLET")

w3 = Web3(Web3.HTTPProvider(BASE_RPC_URL))

USDT_ABI = [
    {
        "name": "Transfer",
        "type": "event",
        "inputs": [
            {"name": "from", "type": "address", "indexed": True},
            {"name": "to", "type": "address", "indexed": True},
            {"name": "value", "type": "uint256", "indexed": False}
        ]
    },
    {
        "name": "transfer",
        "type": "function",
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "outputs": [{"name": "", "type": "bool"}]
    },
    {
        "name": "balanceOf",
        "type": "function",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}]
    }
]

MEMBERSHIP_FEE = 10.0
MATRIX_PRICES = {
    1: 10.0,
    2: 25.0,
    3: 50.0,
    4: 100.0,
    5: 250.0,
    6: 500.0,
    7: 750.0,
    8: 1000.0
}

LEVEL_WEIGHTS = {
    1: 0.04,
    2: 0.05,
    3: 0.06,
    4: 0.07,
    5: 0.08,
    6: 0.09,
    7: 0.10,
    8: 0.11,
    9: 0.15,
    10: 0.25
}

def get_usdt_contract():
    return w3.eth.contract(
        address=Web3.to_checksum_address(USDT_CONTRACT),
        abi=USDT_ABI
    )

def usdt_to_wei(amount: float) -> int:
    return int(amount * 10**6)

def wei_to_usdt(amount: int) -> float:
    return amount / 10**6

def verify_transaction(tx_hash: str, expected_to: str, expected_amount: float) -> bool:
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        if not receipt or receipt.status != 1:
            return False
        contract = get_usdt_contract()
        logs = contract.events.Transfer().process_receipt(receipt)
        for log in logs:
            to_addr = log['args']['to'].lower()
            amount = wei_to_usdt(log['args']['value'])
            if to_addr == expected_to.lower() and abs(amount - expected_amount) < 0.01:
                return True
        return False
    except Exception as e:
        print(f"Transaction verification error: {e}")
        return False

def calculate_membership_distribution(sponsor_wallet: str) -> dict:
    if sponsor_wallet:
        return {"sponsor": (sponsor_wallet, MEMBERSHIP_FEE)}
    else:
        return {"company": (COMPANY_WALLET, MEMBERSHIP_FEE)}

def calculate_matrix_distribution(matrix_level: int, sponsor_wallet: str, level_members: dict) -> dict:
    price = MATRIX_PRICES[matrix_level]
    company_fee = round(price * 0.05, 6)
    remaining = round(price * 0.95, 6)
    sponsor_direct = round(remaining * 0.20, 6)
    sponsor_matching = round(remaining * 0.08, 6)
    sponsor_total = round(sponsor_direct + sponsor_matching, 6)
    distribution_pot = round(remaining * 0.72, 6)

    distributions = {
        "company": (COMPANY_WALLET, company_fee),
        "sponsor": (sponsor_wallet or COMPANY_WALLET, sponsor_total),
        "levels": {}
    }

    for level_num, weight in LEVEL_WEIGHTS.items():
        level_amount = round(distribution_pot * weight, 6)
        members = level_members.get(level_num, [])
        if members:
            per_person = round(level_amount / len(members), 6)
            distributions["levels"][level_num] = {
                "members": members,
                "per_person": per_person,
                "total": level_amount
            }
        else:
            distributions["levels"][level_num] = {
                "members": [],
                "per_person": 0,
                "total": level_amount,
                "reserve": level_amount
            }

    return distributions

def record_payment(db: Session, from_user_id: int, to_user_id: int, amount: float, payment_type: str, tx_hash: str):
    payment = Payment(
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        amount_usdt=amount,
        payment_type=payment_type,
        tx_hash=tx_hash,
        status="confirmed",
        created_at=datetime.utcnow()
    )
    db.add(payment)
    db.commit()
    return payment

def add_to_reserve(db: Session, matrix_level: int, position_level: int, amount: float):
    reserve = db.query(ReservePool).filter(
        ReservePool.matrix_level == matrix_level,
        ReservePool.matrix_position_level == position_level
    ).first()
    if reserve:
        reserve.amount_usdt += amount
        reserve.updated_at = datetime.utcnow()
    else:
        reserve = ReservePool(
            matrix_level=matrix_level,
            matrix_position_level=position_level,
            amount_usdt=amount
        )
        db.add(reserve)
    db.commit()

def process_membership_payment(db: Session, user_id: int, tx_hash: str) -> dict:
    if db.query(Payment).filter(Payment.tx_hash == tx_hash).first():
        return {"success": False, "error": "Transaction already processed"}

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}

    sponsor = None
    if user.sponsor_id:
        sponsor = db.query(User).filter(User.id == user.sponsor_id).first()

    sponsor_wallet = sponsor.wallet_address if sponsor and sponsor.wallet_address else None
    verified = verify_transaction(tx_hash, sponsor_wallet or COMPANY_WALLET, MEMBERSHIP_FEE)

    if not verified:
        return {"success": False, "error": "Transaction not verified"}

    user.is_active = True
    if sponsor:
        sponsor.total_revenue += MEMBERSHIP_FEE
        sponsor.monthly_commission += MEMBERSHIP_FEE
        sponsor.personal_referrals += 1
        record_payment(db, user_id, sponsor.id, MEMBERSHIP_FEE, "membership", tx_hash)
    else:
        record_payment(db, user_id, None, MEMBERSHIP_FEE, "membership_unsponsored", tx_hash)

    db.commit()
    return {"success": True, "message": "Membership activated"}
