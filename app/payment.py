# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Payment & Blockchain Verification
# Base Chain USDT — 8×8 Grid Commission Distribution
# ═══════════════════════════════════════════════════════════════
import os
from web3 import Web3
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from .database import User, Payment, Commission, Withdrawal, GRID_PACKAGES
from .grid import place_member_in_grid, get_or_create_active_grid
from datetime import datetime

load_dotenv()

BASE_RPC_URL          = os.getenv("BASE_RPC_URL")
USDT_CONTRACT         = os.getenv("USDT_CONTRACT")
COMPANY_WALLET        = os.getenv("COMPANY_WALLET")

w3 = Web3(Web3.HTTPProvider(BASE_RPC_URL))

USDT_ABI = [
    {
        "name": "Transfer",
        "type": "event",
        "inputs": [
            {"name": "from",  "type": "address", "indexed": True},
            {"name": "to",    "type": "address", "indexed": True},
            {"name": "value", "type": "uint256", "indexed": False}
        ]
    },
    {
        "name": "transfer",
        "type": "function",
        "inputs": [
            {"name": "to",     "type": "address"},
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


def get_usdt_contract():
    return w3.eth.contract(
        address=Web3.to_checksum_address(USDT_CONTRACT),
        abi=USDT_ABI
    )

def usdt_to_wei(amount: float) -> int:
    return int(amount * 10**6)

def wei_to_usdt(amount: int) -> float:
    return amount / 10**6


# ── Blockchain verification ───────────────────────────────────

def verify_transaction(tx_hash: str, expected_to: str, expected_amount: float) -> bool:
    """Verify a USDT transfer on Base Chain."""
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        if not receipt or receipt.status != 1:
            return False
        contract = get_usdt_contract()
        logs = contract.events.Transfer().process_receipt(receipt)
        for log in logs:
            to_addr = log['args']['to'].lower()
            amount  = wei_to_usdt(log['args']['value'])
            if to_addr == expected_to.lower() and abs(amount - expected_amount) < 0.01:
                return True
        return False
    except Exception as e:
        print(f"TX verification error: {e}")
        return False


# ── Membership payment ────────────────────────────────────────

def process_membership_payment(db: Session, user_id: int, tx_hash: str) -> dict:
    """Activate membership after $10 USDT payment verified."""
    if db.query(Payment).filter(Payment.tx_hash == tx_hash).first():
        return {"success": False, "error": "Transaction already processed"}

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}

    sponsor = None
    if user.sponsor_id:
        sponsor = db.query(User).filter(User.id == user.sponsor_id).first()

    target_wallet = sponsor.wallet_address if sponsor and sponsor.wallet_address else COMPANY_WALLET
    verified = verify_transaction(tx_hash, target_wallet, MEMBERSHIP_FEE)

    if not verified:
        return {"success": False, "error": "Transaction not verified on Base Chain"}

    # Activate user
    user.is_active = True

    # Record payment
    payment = Payment(
        from_user_id = user_id,
        to_user_id   = sponsor.id if sponsor else None,
        amount_usdt  = MEMBERSHIP_FEE,
        payment_type = "membership",
        tx_hash      = tx_hash,
        status       = "confirmed",
    )
    db.add(payment)

    sponsor_was_auto_activated = False

    # Credit sponsor
    if sponsor:
        sponsor.balance       += MEMBERSHIP_FEE
        sponsor.total_earned  += MEMBERSHIP_FEE
        sponsor.personal_referrals += 1

        # ── Auto-activation: if sponsor is a free member and now has $10 ──
        # Their referral commission immediately pays for their own membership.
        # The $10 is deducted from their wallet and paid to their sponsor (or company).
        if not sponsor.is_active and sponsor.balance >= MEMBERSHIP_FEE:
            sponsor.balance  -= MEMBERSHIP_FEE
            sponsor.is_active = True

            # Find sponsor's sponsor to receive the auto-activation payment
            grandparent = None
            if sponsor.sponsor_id:
                grandparent = db.query(User).filter(User.id == sponsor.sponsor_id).first()

            # Credit grandparent (sponsor's sponsor)
            if grandparent:
                grandparent.balance      += MEMBERSHIP_FEE
                grandparent.total_earned += MEMBERSHIP_FEE
                grandparent.personal_referrals += 1

            sponsor_was_auto_activated = True

            # Record the auto-activation payment
            auto_payment = Payment(
                from_user_id = sponsor.id,
                to_user_id   = grandparent.id if grandparent else None,
                amount_usdt  = MEMBERSHIP_FEE,
                payment_type = "membership_auto",
                tx_hash      = tx_hash + "_auto",
                status       = "confirmed",
            )
            db.add(auto_payment)

            # Queue notification email for sponsor
            try:
                from app.email_utils import send_email
                send_email(
                    to_email  = sponsor.email,
                    subject   = "🎉 You've been automatically activated on SuperAdPro!",
                    html_body = f"""
                    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a1a;color:#e8f0fe;border-radius:12px;padding:32px">
                        <div style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px">SuperAdPro</div>
                        <h2 style="color:#ffffff;margin-bottom:16px">Your membership just activated itself! 🚀</h2>
                        <p style="color:rgba(200,220,255,0.8);line-height:1.7">
                            Hi {sponsor.first_name or sponsor.username},<br><br>
                            Great news — someone you referred just paid their $10 membership fee, 
                            and your $10 referral commission has <strong style="color:#00d4ff">automatically activated your full SuperAdPro membership.</strong>
                        </p>
                        <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:10px;padding:20px;margin:24px 0">
                            <div style="font-size:13px;color:#94a3b8;margin-bottom:4px">What just happened</div>
                            <div style="color:#ffffff;line-height:1.8">
                                ✅ Your referral paid $10 membership<br>
                                ✅ $10 commission credited to your wallet<br>
                                ✅ $10 auto-deducted to activate your membership<br>
                                ✅ You now have <strong style="color:#00d4ff">full access</strong> to all income streams
                            </div>
                        </div>
                        <p style="color:rgba(200,220,255,0.8);line-height:1.7">
                            You can now access the Profit Engine Grid and start earning from all 3 income streams. 
                            Your next referral commission goes straight to your wallet.
                        </p>
                        <a href="https://superadpro.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#00b4d8,#6d28d9);color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;margin-top:8px">
                            Go to My Dashboard →
                        </a>
                    </div>
                    """,
                    text_body = f"Hi {sponsor.first_name or sponsor.username}, your referral just activated your SuperAdPro membership automatically! Log in to access all income streams."
                )
            except Exception:
                pass  # Email failure should never block the transaction

    db.commit()
    return {
        "success": True,
        "message": "Membership activated successfully",
        "sponsor_auto_activated": sponsor_was_auto_activated
    }


# ── Grid package payment ──────────────────────────────────────

def process_grid_payment(
    db:           Session,
    user_id:      int,
    package_tier: int,
    tx_hash:      str
) -> dict:
    """
    Process a grid package purchase.
    Verifies tx, places member into sponsor's grid, triggers commissions.
    """
    if db.query(Payment).filter(Payment.tx_hash == tx_hash).first():
        return {"success": False, "error": "Transaction already processed"}

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}

    if not user.is_active:
        return {"success": False, "error": "Membership not active"}

    price = GRID_PACKAGES.get(package_tier)
    if not price:
        return {"success": False, "error": "Invalid package tier"}

    # Verify payment went to company wallet (platform collects, then distributes)
    verified = verify_transaction(tx_hash, COMPANY_WALLET, price)
    if not verified:
        return {"success": False, "error": f"Payment of ${price} USDT not verified on Base Chain"}

    # Record incoming payment
    payment = Payment(
        from_user_id = user_id,
        to_user_id   = None,
        amount_usdt  = price,
        payment_type = f"grid_tier_{package_tier}",
        tx_hash      = tx_hash,
        status       = "confirmed",
    )
    db.add(payment)
    db.flush()

    # Place member in their sponsor's grid
    sponsor_id = user.sponsor_id
    if not sponsor_id:
        # No sponsor — place in admin/platform grid
        admin = db.query(User).filter(User.is_admin == True).first()
        sponsor_id = admin.id if admin else 1

    result = place_member_in_grid(
        db           = db,
        member_id    = user_id,
        owner_id     = sponsor_id,
        package_tier = package_tier,
    )

    if not result["success"]:
        # Sponsor's grid is full — find next available via overspill
        result = _find_overspill_placement(db, user_id, sponsor_id, package_tier)

    db.commit()

    if result["success"]:
        return {
            "success":     True,
            "message":     f"Placed in Grid #{result['cycle']} at Level {result['grid_level']}",
            "grid_level":  result["grid_level"],
            "positions":   result["filled"],
            "complete":    result["complete"],
        }
    return {"success": False, "error": "Could not place in any grid"}


def _find_overspill_placement(
    db: Session, user_id: int, original_sponsor_id: int, package_tier: int
) -> dict:
    """
    Walk up the upline tree to find a grid with space.
    Overspill seeds into the first available upline grid.
    """
    current_id = original_sponsor_id
    visited    = set()

    while current_id and current_id not in visited:
        visited.add(current_id)
        result = place_member_in_grid(
            db=db, member_id=user_id, owner_id=current_id,
            package_tier=package_tier, is_overspill=True
        )
        if result["success"]:
            return result
        # Move up the tree
        upline = db.query(User).filter(User.id == current_id).first()
        current_id = upline.sponsor_id if upline else None

    return {"success": False, "error": "No available grid in upline"}


# ── Withdrawal request ────────────────────────────────────────

def request_withdrawal(db: Session, user_id: int, amount: float) -> dict:
    """User requests withdrawal of their available balance."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}

    if amount < 5.0:
        return {"success": False, "error": "Minimum withdrawal is $5 USDT"}

    if user.balance < amount:
        return {"success": False, "error": f"Insufficient balance. Available: ${user.balance:.2f}"}

    if not user.wallet_address:
        return {"success": False, "error": "No withdrawal wallet set"}

    # Deduct from balance
    user.balance -= amount
    user.total_withdrawn = (user.total_withdrawn or 0) + amount

    withdrawal = Withdrawal(
        user_id        = user_id,
        amount_usdt    = amount,
        wallet_address = user.wallet_address,
        status         = "pending",
    )
    db.add(withdrawal)
    db.commit()

    return {
        "success":   True,
        "message":   f"Withdrawal of ${amount:.2f} USDT queued for processing",
        "remaining": user.balance,
    }


# ── Balance helpers ───────────────────────────────────────────

def get_user_balance(db: Session, user_id: int) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {}
    return {
        "balance":          round(user.balance, 2),
        "total_earned":     round(user.total_earned, 2),
        "total_withdrawn":  round(user.total_withdrawn, 2),
        "grid_earnings":    round(user.grid_earnings, 2),
        "level_earnings":   round(user.level_earnings, 2),
        "upline_earnings":  round(user.upline_earnings, 2),
    }
