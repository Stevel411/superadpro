"""
SuperAdPro — Crypto Payment Service
USDT on Polygon PoS via Alchemy

Architecture:
  1. Member clicks "Pay with Crypto" → backend creates a CryptoPaymentOrder
     with a unique micro-amount (e.g. $20.0042) to avoid collisions
  2. Member sends exact USDT amount to the SAP treasury wallet on Polygon
  3. Alchemy webhook (or polling cron) detects incoming USDT transfer
  4. Backend matches the amount to a pending order, activates the product
  5. Commissions are handled by the existing internal wallet system

Treasury wallet: 0x71746f1634B0FBB3981B9B84EbE1A1a6f2430467
USDT on Polygon: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
Chain: Polygon PoS Mainnet (chainId 137)
"""

import os
import logging
import hashlib
import time
import requests
from decimal import Decimal, ROUND_DOWN
from datetime import datetime, timedelta

logger = logging.getLogger("superadpro.crypto")

# ── Constants ────────────────────────────────────────────────
TREASURY_WALLET = "0x71746f1634B0FBB3981B9B84EbE1A1a6f2430467"
USDT_CONTRACT   = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
USDC_CONTRACT   = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"  # Native USDC on Polygon
ACCEPTED_TOKENS = [USDT_CONTRACT, USDC_CONTRACT]
POLYGON_CHAIN_ID = 137
STABLECOIN_DECIMALS = 6  # Both USDT and USDC on Polygon use 6 decimals

# Payment order expires after 30 minutes
ORDER_EXPIRY_MINUTES = 30

# Products and their base prices
PRODUCT_PRICES = {
    "membership_basic":   Decimal("20.00"),
    "membership_pro":     Decimal("35.00"),
    "grid_1":   Decimal("20.00"),
    "grid_2":   Decimal("50.00"),
    "grid_3":   Decimal("100.00"),
    "grid_4":   Decimal("200.00"),
    "grid_5":   Decimal("400.00"),
    "grid_6":   Decimal("600.00"),
    "grid_7":   Decimal("800.00"),
    "grid_8":   Decimal("1000.00"),
    "email_boost_1000":   Decimal("5.00"),
    "email_boost_5000":   Decimal("19.00"),
    "email_boost_10000":  Decimal("29.00"),
    "email_boost_50000":  Decimal("99.00"),
}


def get_alchemy_url():
    """Get Alchemy RPC URL from environment."""
    key = os.environ.get("ALCHEMY_API_KEY", "")
    if not key:
        raise ValueError("ALCHEMY_API_KEY not set in environment")
    return f"https://polygon-mainnet.g.alchemy.com/v2/{key}"


def generate_unique_amount(base_price: Decimal, user_id: int, order_id: int) -> Decimal:
    """
    Generate a unique micro-amount to avoid payment collisions.
    
    E.g. $20.00 becomes $20.0042 — the last 4 digits are a hash of
    user_id + order_id + timestamp, making each payment uniquely identifiable.
    
    USDT has 6 decimal places, so we use positions 3-6 for uniqueness.
    This gives us 10,000 unique amounts per base price (0001-9999).
    """
    # Create a deterministic but unique suffix
    seed = f"{user_id}:{order_id}:{int(time.time())}"
    hash_val = int(hashlib.sha256(seed.encode()).hexdigest()[:8], 16)
    suffix = (hash_val % 9999) + 1  # 0001 to 9999
    
    # Add as micro-cents: e.g. 20.00 + 0.0042 = 20.0042
    micro = Decimal(suffix) / Decimal("1000000")  # 6 decimal places
    unique_amount = base_price + micro
    
    return unique_amount.quantize(Decimal("0.000001"), rounding=ROUND_DOWN)


def usdt_to_raw(amount: Decimal) -> int:
    """Convert USDT amount to raw integer (6 decimals). E.g. 20.004200 → 20004200"""
    return int(amount * Decimal("1000000"))


def raw_to_usdt(raw: int) -> Decimal:
    """Convert raw integer to USDT amount. E.g. 20004200 → 20.004200"""
    return Decimal(raw) / Decimal("1000000")


def check_usdt_transfer(tx_hash: str) -> dict:
    """
    Verify a USDT transfer on Polygon via Alchemy.
    Returns dict with: confirmed, from_address, to_address, amount_usdt, block_number
    """
    url = get_alchemy_url()
    
    # Get transaction receipt
    resp = requests.post(url, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_getTransactionReceipt",
        "params": [tx_hash]
    }, timeout=10)
    
    data = resp.json()
    receipt = data.get("result")
    
    if not receipt:
        return {"confirmed": False, "error": "Transaction not found or pending"}
    
    if receipt.get("status") != "0x1":
        return {"confirmed": False, "error": "Transaction failed"}
    
    # Parse Transfer event from logs — accept both USDT and USDC
    # Transfer(address,address,uint256) event signature
    transfer_topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    accepted = {c.lower() for c in ACCEPTED_TOKENS}
    
    for log in receipt.get("logs", []):
        log_contract = log.get("address", "").lower()
        if (log_contract in accepted and
            len(log.get("topics", [])) >= 3 and
            log["topics"][0] == transfer_topic):
            
            from_addr = "0x" + log["topics"][1][-40:]
            to_addr   = "0x" + log["topics"][2][-40:]
            raw_amount = int(log["data"], 16)
            amount_usdt = raw_to_usdt(raw_amount)
            token = "USDC" if log_contract == USDC_CONTRACT.lower() else "USDT"
            
            return {
                "confirmed": True,
                "from_address": from_addr,
                "to_address": to_addr,
                "amount_usdt": amount_usdt,
                "block_number": int(receipt["blockNumber"], 16),
                "tx_hash": tx_hash,
                "token": token,
            }
    
    return {"confirmed": False, "error": "No USDT/USDC transfer found in transaction"}


def get_recent_usdt_transfers(from_block: str = "recent", page_size: int = 100) -> list:
    """
    Get recent USDT and USDC transfers TO the treasury wallet using eth_getLogs.
    Uses the standard ERC-20 Transfer event — works on ALL Alchemy tiers.
    
    Returns list of transfers with: tx_hash, from_address, amount_usdt, block_number, token
    """
    url = get_alchemy_url()
    
    # Get current block number, then look back ~5000 blocks (~30 min on Polygon)
    if from_block == "recent":
        try:
            block_resp = requests.post(url, json={
                "jsonrpc": "2.0", "id": 0, "method": "eth_blockNumber", "params": []
            }, timeout=10)
            current_block = int(block_resp.json().get("result", "0x0"), 16)
            from_block_hex = hex(max(current_block - 100000, 0))
        except Exception:
            from_block_hex = "0x0"
    elif from_block == "earliest":
        from_block_hex = "0x0"
    else:
        from_block_hex = from_block
    
    # ERC-20 Transfer(address from, address to, uint256 value) event signature
    transfer_topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    
    # Treasury address padded to 32 bytes for topic filter (the "to" field = topic[2])
    treasury_padded = "0x" + TREASURY_WALLET[2:].lower().zfill(64)
    
    # Query logs from both USDT and USDC contracts where "to" = treasury
    resp = requests.post(url, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_getLogs",
        "params": [{
            "fromBlock": from_block_hex,
            "toBlock": "latest",
            "address": ACCEPTED_TOKENS,
            "topics": [
                transfer_topic,   # topic[0] = Transfer event
                None,              # topic[1] = from address (any)
                treasury_padded,   # topic[2] = to address (our treasury)
            ]
        }]
    }, timeout=15)
    
    if resp.status_code != 200:
        logger.error(f"eth_getLogs returned status {resp.status_code}: {resp.text[:200]}")
        return []
    
    try:
        data = resp.json()
    except Exception:
        logger.error(f"eth_getLogs returned non-JSON: {resp.text[:200]}")
        return []
    
    if "error" in data:
        logger.error(f"eth_getLogs error: {data['error']}")
        return []
    
    logs = data.get("result", [])
    
    results = []
    for log in logs:
        contract_addr = log.get("address", "").lower()
        topics = log.get("topics", [])
        if len(topics) < 3:
            continue
        
        from_addr = "0x" + topics[1][-40:]
        raw_amount = int(log.get("data", "0x0"), 16)
        amount = Decimal(str(raw_amount)) / Decimal("1000000")  # 6 decimals
        token = "USDC" if contract_addr == USDC_CONTRACT.lower() else "USDT"
        
        results.append({
            "tx_hash": log.get("transactionHash"),
            "from_address": from_addr,
            "amount_usdt": amount,
            "block_number": int(log.get("blockNumber", "0x0"), 16),
            "timestamp": None,
            "token": token,
        })
    
    return results


def get_treasury_usdt_balance() -> Decimal:
    """Get USDT balance of the treasury wallet."""
    url = get_alchemy_url()
    
    # ERC-20 balanceOf(address) call
    # Function selector: 0x70a08231
    padded_address = TREASURY_WALLET[2:].lower().zfill(64)
    call_data = f"0x70a08231{padded_address}"
    
    resp = requests.post(url, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_call",
        "params": [{
            "to": USDT_CONTRACT,
            "data": call_data,
        }, "latest"]
    }, timeout=10)
    
    data = resp.json()
    raw = int(data.get("result", "0x0"), 16)
    return raw_to_usdt(raw)
