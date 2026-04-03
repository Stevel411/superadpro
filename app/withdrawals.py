"""
SuperAdPro — Automated USDT Withdrawal System
Sends USDT on Polygon PoS from treasury wallet to member wallets.

Treasury: 0x71746f1634B0FBB3981B9B84EbE1A1a6f2430467
USDT on Polygon: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
Chain: Polygon PoS Mainnet (chainId 137)
Gas token: POL (formerly MATIC)

Security guardrails:
  - KYC must be approved
  - 2FA must be enabled and verified
  - Minimum $10 withdrawal
  - $1 flat fee
  - Daily cap per user: $500
  - Account cooldown: 7 days after registration before first withdrawal
  - Insufficient treasury balance -> queues for retry
"""

import os
import logging
from decimal import Decimal
from datetime import datetime, timedelta

logger = logging.getLogger("superadpro.withdrawals")

# -- Config --
TREASURY_ADDRESS = "0x71746f1634B0FBB3981B9B84EbE1A1a6f2430467"
USDT_CONTRACT    = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
POLYGON_CHAIN_ID = 137
USDT_DECIMALS    = 6

WITHDRAWAL_FEE    = Decimal("1.00")
MIN_WITHDRAWAL    = Decimal("10.00")
DAILY_CAP_PER_USER = Decimal("500.00")
COOLDOWN_DAYS      = 7

# Minimal ERC-20 ABI for transfer + balanceOf
ERC20_ABI = [
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
]


def _get_web3():
    """Get a Web3 instance connected to Polygon via Alchemy."""
    from web3 import Web3
    alchemy_key = os.environ.get("ALCHEMY_API_KEY", "")
    if not alchemy_key:
        raise ValueError("ALCHEMY_API_KEY not set")
    rpc_url = f"https://polygon-mainnet.g.alchemy.com/v2/{alchemy_key}"
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        raise ConnectionError("Cannot connect to Polygon RPC")
    return w3


def _get_private_key():
    """Get treasury private key from environment."""
    key = os.environ.get("TREASURY_PRIVATE_KEY", "")
    if not key:
        raise ValueError("TREASURY_PRIVATE_KEY not set")
    if not key.startswith("0x"):
        key = "0x" + key
    return key


def get_treasury_usdt_balance():
    """Check USDT balance of the treasury wallet."""
    try:
        from web3 import Web3
        w3 = _get_web3()
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(USDT_CONTRACT),
            abi=ERC20_ABI
        )
        balance_raw = contract.functions.balanceOf(
            Web3.to_checksum_address(TREASURY_ADDRESS)
        ).call()
        return Decimal(str(balance_raw)) / Decimal(10 ** USDT_DECIMALS)
    except Exception as e:
        logger.error(f"Failed to check treasury USDT balance: {e}")
        return Decimal("0")


def get_treasury_pol_balance():
    """Check POL (gas token) balance of the treasury wallet."""
    try:
        from web3 import Web3
        w3 = _get_web3()
        balance_wei = w3.eth.get_balance(Web3.to_checksum_address(TREASURY_ADDRESS))
        return Decimal(str(w3.from_wei(balance_wei, 'ether')))
    except Exception as e:
        logger.error(f"Failed to check treasury POL balance: {e}")
        return Decimal("0")


def check_daily_withdrawal_total(db, user_id):
    """Get total withdrawals for a user today."""
    from .database import Withdrawal
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    withdrawals_today = db.query(Withdrawal).filter(
        Withdrawal.user_id == user_id,
        Withdrawal.status.in_(["pending", "processing", "paid"]),
        Withdrawal.requested_at >= today_start,
    ).all()
    return sum(Decimal(str(w.amount_usdt or 0)) for w in withdrawals_today)


def validate_withdrawal(db, user, amount):
    """
    Run all security checks before allowing a withdrawal.
    Returns {"valid": True} or {"valid": False, "error": "reason"}
    """
    amount = Decimal(str(amount))

    if amount < MIN_WITHDRAWAL:
        return {"valid": False, "error": f"Minimum withdrawal is ${MIN_WITHDRAWAL}"}

    if Decimal(str(user.balance or 0)) < amount:
        return {"valid": False, "error": f"Insufficient balance. Available: ${user.balance:.2f}"}

    if not user.wallet_address or len(user.wallet_address) < 40:
        return {"valid": False, "error": "No valid withdrawal wallet set. Add your Polygon wallet address in Account settings."}

    # KYC check
    if getattr(user, 'kyc_status', 'none') != 'approved':
        return {"valid": False, "error": "Identity verification (KYC) required before withdrawals. Go to Account to submit your documents."}

    # 2FA check
    if not getattr(user, 'totp_enabled', False):
        return {"valid": False, "error": "Two-factor authentication required before withdrawals. Go to Account to enable 2FA."}

    # Cooldown check
    if user.created_at:
        account_age = datetime.utcnow() - user.created_at
        if account_age < timedelta(days=COOLDOWN_DAYS):
            days_left = COOLDOWN_DAYS - account_age.days
            return {"valid": False, "error": f"New account cooldown: withdrawals available in {days_left} day{'s' if days_left != 1 else ''}"}

    # Daily cap check
    today_total = check_daily_withdrawal_total(db, user.id)
    if today_total + amount > DAILY_CAP_PER_USER:
        remaining = DAILY_CAP_PER_USER - today_total
        return {"valid": False, "error": f"Daily withdrawal limit reached. You can withdraw ${remaining:.2f} more today."}

    # Net amount check
    net_amount = amount - WITHDRAWAL_FEE
    if net_amount <= 0:
        return {"valid": False, "error": f"Amount after ${WITHDRAWAL_FEE} fee leaves nothing to send"}

    return {"valid": True}


def validate_campaign_withdrawal(db, user, amount):
    """
    Additional checks for campaign wallet withdrawals.
    Requires: active campaign tier + Watch-to-Earn quota compliance.
    Returns {"valid": True} or {"valid": False, "error": "reason"}
    """
    from .database import Grid, WatchQuota

    amount = Decimal(str(amount))

    # Check campaign_balance specifically
    if Decimal(str(user.campaign_balance or 0)) < amount:
        return {"valid": False, "error": f"Insufficient campaign balance. Available: ${float(user.campaign_balance or 0):.2f}"}

    # Must have at least one active (non-complete) grid
    active_grid = db.query(Grid).filter(
        Grid.owner_id == user.id,
        Grid.is_complete == False
    ).first()

    if not active_grid and not user.is_admin:
        return {"valid": False, "error": "You must have an active Campaign Tier to withdraw campaign earnings. Activate a tier in Campaign Tiers."}

    # Check Watch-to-Earn quota compliance
    quota = db.query(WatchQuota).filter(WatchQuota.user_id == user.id).first()

    if quota and quota.commissions_paused and not user.is_admin:
        return {"valid": False, "error": "Your campaign withdrawals are paused. Complete your daily Watch-to-Earn video quota to reactivate."}

    return {"valid": True}


def send_usdt(to_address, amount_usdt):
    """
    Send USDT on Polygon from treasury to a recipient address.
    Returns: {"success": bool, "tx_hash": str, "error": str}
    """
    from web3 import Web3

    private_key = _get_private_key()
    amount_usdt = Decimal(str(amount_usdt))

    try:
        w3 = _get_web3()
        from_address = Web3.to_checksum_address(TREASURY_ADDRESS)
        to_addr = Web3.to_checksum_address(to_address)

        # Convert USDT amount to raw units (6 decimals)
        amount_raw = int(amount_usdt * Decimal(10 ** USDT_DECIMALS))
        if amount_raw <= 0:
            return {"success": False, "tx_hash": "", "error": "Invalid amount"}

        # Check treasury has enough USDT
        contract = w3.eth.contract(address=Web3.to_checksum_address(USDT_CONTRACT), abi=ERC20_ABI)
        balance_raw = contract.functions.balanceOf(from_address).call()
        if balance_raw < amount_raw:
            wallet_balance = Decimal(str(balance_raw)) / Decimal(10 ** USDT_DECIMALS)
            logger.error(f"Insufficient treasury USDT: {wallet_balance} < {amount_usdt}")
            return {"success": False, "tx_hash": "", "error": f"Insufficient treasury funds (${wallet_balance:.2f} available)"}

        # Check POL for gas
        pol_balance = w3.eth.get_balance(from_address)
        if pol_balance < w3.to_wei(0.001, 'ether'):
            return {"success": False, "tx_hash": "", "error": "Treasury needs POL for gas fees"}

        # Build ERC-20 transfer transaction
        nonce = w3.eth.get_transaction_count(from_address)
        gas_price = w3.eth.gas_price

        tx = contract.functions.transfer(to_addr, amount_raw).build_transaction({
            "from": from_address,
            "nonce": nonce,
            "gas": 100000,
            "gasPrice": int(gas_price * 1.2),
            "chainId": POLYGON_CHAIN_ID,
        })

        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hash_hex = tx_hash.hex()

        logger.info(f"USDT withdrawal sent: {amount_usdt} USDT to {to_address} -- tx: {tx_hash_hex}")
        return {"success": True, "tx_hash": tx_hash_hex, "error": ""}

    except Exception as e:
        logger.error(f"USDT withdrawal failed: {e}")
        return {"success": False, "tx_hash": "", "error": str(e)}


def process_withdrawal(db, withdrawal_id):
    """
    Process a single pending withdrawal:
    1. Verify security checks
    2. Deduct $1 fee
    3. Send USDT on Polygon to member's wallet
    4. Update withdrawal record with tx_hash and status
    5. Send notification to member
    """
    from .database import Withdrawal, User

    withdrawal = db.query(Withdrawal).filter(Withdrawal.id == withdrawal_id).first()
    if not withdrawal:
        return {"success": False, "error": "Withdrawal not found"}

    if withdrawal.status != "pending":
        return {"success": False, "error": f"Withdrawal is {withdrawal.status}, not pending"}

    user = db.query(User).filter(User.id == withdrawal.user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}

    # Calculate net amount after fee
    gross_amount = Decimal(str(withdrawal.amount_usdt))
    net_amount = gross_amount - WITHDRAWAL_FEE

    if net_amount <= 0:
        withdrawal.status = "failed"
        withdrawal.processed_at = datetime.utcnow()
        db.commit()
        return {"success": False, "error": f"Amount ${gross_amount} minus ${WITHDRAWAL_FEE} fee leaves nothing to send"}

    # Mark as processing
    withdrawal.status = "processing"
    db.commit()

    # Send USDT on Polygon
    result = send_usdt(withdrawal.wallet_address, net_amount)

    if result["success"]:
        withdrawal.status = "paid"
        withdrawal.tx_hash = result["tx_hash"]
        withdrawal.processed_at = datetime.utcnow()
        db.commit()

        logger.info(f"Withdrawal #{withdrawal_id} paid: ${net_amount} USDT to {withdrawal.wallet_address}")

        # Send notification to member
        try:
            from .database import Notification
            notif = Notification(
                user_id=user.id,
                title="Withdrawal Processed",
                message=f"${net_amount:.2f} USDT sent to your wallet. Tx: {result['tx_hash'][:16]}...",
                icon="money_bag",
            )
            db.add(notif)
            db.commit()
        except Exception:
            pass

        return {
            "success": True,
            "tx_hash": result["tx_hash"],
            "net_amount": float(net_amount),
            "fee": float(WITHDRAWAL_FEE),
        }
    else:
        # Failed -- revert to pending so it can retry
        withdrawal.status = "pending"
        db.commit()
        logger.error(f"Withdrawal #{withdrawal_id} failed: {result['error']}")
        return {"success": False, "error": result["error"]}
