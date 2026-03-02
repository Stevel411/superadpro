"""
Automated USDC withdrawal system on Base chain.
Sends USDC from the hot wallet to member wallet addresses.
"""

import os
import logging
from decimal import Decimal
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

logger = logging.getLogger("superadpro.withdrawals")

# ── Config ──
BASE_RPC_URL = os.getenv("BASE_RPC_URL", "https://mainnet.base.org")
HOT_WALLET_PRIVATE_KEY = os.getenv("HOT_WALLET_PRIVATE_KEY", "")
HOT_WALLET_ADDRESS = os.getenv("HOT_WALLET_ADDRESS", "")

# USDC on Base chain
USDC_CONTRACT_ADDRESS = Web3.to_checksum_address("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")
USDC_DECIMALS = 6

# Withdrawal settings
WITHDRAWAL_FEE = Decimal("1.00")    # $1 flat fee
MIN_WITHDRAWAL = Decimal("10.00")   # Minimum withdrawal amount

# Minimal ERC-20 ABI for transfer
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


def get_web3():
    """Get a Web3 instance connected to Base."""
    w3 = Web3(Web3.HTTPProvider(BASE_RPC_URL))
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    return w3


def get_hot_wallet_usdc_balance() -> Decimal:
    """Check USDC balance of the hot wallet."""
    try:
        w3 = get_web3()
        contract = w3.eth.contract(address=USDC_CONTRACT_ADDRESS, abi=ERC20_ABI)
        balance_raw = contract.functions.balanceOf(
            Web3.to_checksum_address(HOT_WALLET_ADDRESS)
        ).call()
        return Decimal(str(balance_raw)) / Decimal(10 ** USDC_DECIMALS)
    except Exception as e:
        logger.error(f"Failed to check hot wallet balance: {e}")
        return Decimal("0")


def send_usdc(to_address: str, amount_usdc: Decimal) -> dict:
    """
    Send USDC on Base chain from hot wallet to a recipient address.
    Returns: {"success": bool, "tx_hash": str, "error": str}
    """
    if not HOT_WALLET_PRIVATE_KEY or not HOT_WALLET_ADDRESS:
        return {"success": False, "tx_hash": "", "error": "Hot wallet not configured"}

    try:
        w3 = get_web3()

        if not w3.is_connected():
            return {"success": False, "tx_hash": "", "error": "Cannot connect to Base RPC"}

        # Validate addresses
        from_address = Web3.to_checksum_address(HOT_WALLET_ADDRESS)
        to_address = Web3.to_checksum_address(to_address)

        # Convert USDC amount to raw units (6 decimals)
        amount_raw = int(amount_usdc * Decimal(10 ** USDC_DECIMALS))

        if amount_raw <= 0:
            return {"success": False, "tx_hash": "", "error": "Invalid amount"}

        # Check hot wallet has enough USDC
        contract = w3.eth.contract(address=USDC_CONTRACT_ADDRESS, abi=ERC20_ABI)
        balance_raw = contract.functions.balanceOf(from_address).call()

        if balance_raw < amount_raw:
            wallet_balance = Decimal(str(balance_raw)) / Decimal(10 ** USDC_DECIMALS)
            logger.error(f"Insufficient hot wallet USDC: {wallet_balance} < {amount_usdc}")
            return {"success": False, "tx_hash": "", "error": f"Insufficient hot wallet funds (${wallet_balance:.2f} available)"}

        # Check ETH for gas
        eth_balance = w3.eth.get_balance(from_address)
        if eth_balance < w3.to_wei(0.0001, 'ether'):
            return {"success": False, "tx_hash": "", "error": "Hot wallet needs ETH for gas fees"}

        # Build the ERC-20 transfer transaction
        nonce = w3.eth.get_transaction_count(from_address)

        tx = contract.functions.transfer(to_address, amount_raw).build_transaction({
            "from": from_address,
            "nonce": nonce,
            "gas": 100000,
            "maxFeePerGas": w3.eth.gas_price * 2,
            "maxPriorityFeePerGas": w3.to_wei(0.001, "gwei"),
            "chainId": 8453,  # Base mainnet
        })

        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=HOT_WALLET_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hash_hex = tx_hash.hex()

        logger.info(f"USDC transfer sent: {amount_usdc} USDC to {to_address} — tx: {tx_hash_hex}")

        return {"success": True, "tx_hash": tx_hash_hex, "error": ""}

    except Exception as e:
        logger.error(f"USDC transfer failed: {e}")
        return {"success": False, "tx_hash": "", "error": str(e)}


def process_withdrawal(db, withdrawal_id: int) -> dict:
    """
    Process a single pending withdrawal:
    1. Deduct $1 fee
    2. Send USDC on Base to the member's wallet
    3. Update withdrawal record with tx_hash and status
    """
    from .database import Withdrawal, User
    from datetime import datetime

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

    # Send USDC on Base
    result = send_usdc(withdrawal.wallet_address, net_amount)

    if result["success"]:
        withdrawal.status = "paid"
        withdrawal.tx_hash = result["tx_hash"]
        withdrawal.processed_at = datetime.utcnow()
        db.commit()

        logger.info(f"Withdrawal #{withdrawal_id} paid: ${net_amount} USDC to {withdrawal.wallet_address}")
        return {
            "success": True,
            "tx_hash": result["tx_hash"],
            "net_amount": float(net_amount),
            "fee": float(WITHDRAWAL_FEE),
        }
    else:
        # Failed — revert to pending so it can retry
        withdrawal.status = "pending"
        db.commit()

        logger.error(f"Withdrawal #{withdrawal_id} failed: {result['error']}")
        return {"success": False, "error": result["error"]}
