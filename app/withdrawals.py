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
  - Insufficient treasury balance -> queues for retry
"""

import os
import logging
from decimal import Decimal
from datetime import datetime, timedelta

logger = logging.getLogger("superadpro.withdrawals")

# -- Config --
# ── Polygon (legacy, dormant — retained for v2 reactivation) ──
TREASURY_ADDRESS = "0x71746f1634B0FBB3981B9B84EbE1A1a6f2430467"
USDT_CONTRACT    = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
POLYGON_CHAIN_ID = 137
USDT_DECIMALS    = 6
# Per-network USDT decimals. Critical: USDT on BSC uses 18 decimals
# (it's the Binance-Peg wrapped version), while USDT on Tron and
# Ethereum/Polygon uses 6. Mixing these up causes the on-chain transfer
# to send effectively zero (off by a factor of 10^12) — see incident
# 6 May 2026 where a $9 BSC withdrawal sent <0.00001 USDT on-chain.
USDT_DECIMALS_TRON = 6
USDT_DECIMALS_BSC  = 18

# ── BSC (BEP-20) — primary EVM withdrawal network from 6 May 2026 ──
# Treasury private key in env: TREASURY_PRIVATE_KEY_BSC
# RPC:                          BSC_RPC_URL (default: https://bsc-dataseed.binance.org/)
# USDT contract:                0x55d398326f99059fF775485246999027B3197955
# Chain ID:                     56
# Gas token:                    BNB
TREASURY_ADDRESS_BSC = os.environ.get("TREASURY_ADDRESS_BSC", "0xb2Ccdf9050A8d05A346F6879eC4fa633f9b2554D")
USDT_CONTRACT_BSC    = "0x55d398326f99059fF775485246999027B3197955"
BSC_CHAIN_ID         = 56
BSC_RPC_URL          = os.environ.get("BSC_RPC_URL", "https://bsc-dataseed.binance.org/")

# ── Multi-RPC fallback list (Layer 2, 17 May 2026) ────────────────────
# When the primary BSC_RPC_URL (typically Alchemy free tier) returns a
# rate-limit / 429 / "limit exceeded" error, the scanner and other RPC
# consumers try these public free endpoints in order. All are zero-cost
# public RPCs maintained by Binance / community providers, no API key
# required. Order matters — listed by historical reliability under load.
#
# Configurable via BSC_RPC_FALLBACKS env var (comma-separated). Empty
# string disables fallback (single-RPC mode, original behaviour).
_DEFAULT_BSC_FALLBACKS = ",".join([
    "https://bsc-dataseed1.binance.org/",
    "https://bsc-dataseed2.binance.org/",
    "https://bsc-dataseed3.binance.org/",
    "https://bsc-dataseed4.binance.org/",
    "https://bsc-dataseed1.defibit.io/",
    "https://bsc-dataseed1.ninicoin.io/",
    "https://binance.llamarpc.com/",
])
BSC_RPC_FALLBACKS = [
    u.strip() for u in
    os.environ.get("BSC_RPC_FALLBACKS", _DEFAULT_BSC_FALLBACKS).split(",")
    if u.strip()
]

# ── Tron (TRC-20) — primary alternative withdrawal network from 6 May 2026 ──
# Treasury private key in env: TREASURY_PRIVATE_KEY_TRON
# RPC:                          TRON_RPC_URL (default: https://api.trongrid.io)
# USDT contract:                TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
# Gas token:                    TRX (energy/bandwidth model differs from EVM)
TREASURY_ADDRESS_TRON = os.environ.get("TREASURY_ADDRESS_TRON", "TLET6kN1Ly59VEcr21zs8kptk7sC7Nbjdz")
USDT_CONTRACT_TRON    = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
TRON_RPC_URL          = os.environ.get("TRON_RPC_URL", "https://api.trongrid.io")
# Optional API key — without this, public TronGrid rate-limits at ~5 req/s
# and we will hit 429s under launch load. Configure TRON_API_KEY in Railway
# for production reliability. The free tier on trongrid.io is sufficient.
TRON_API_KEY          = os.environ.get("TRON_API_KEY", "")

WITHDRAWAL_FEE    = Decimal("1.00")
MIN_WITHDRAWAL    = Decimal("10.00")
DAILY_CAP_PER_USER = Decimal("500.00")

# ── Retry policy (used by /cron/process-pending-withdrawals) ──
# Exponential-ish backoff in MINUTES, indexed by previous attempts count.
#   attempts=0 → first retry 2 min after the original failed attempt
#   attempts=1 → next retry 10 min later
#   attempts=2 → 30 min
#   attempts=3 → 2 hr (120 min)
#   attempts=4 → 8 hr (480 min)
# After the 5th attempt fails the row is marked failed_permanent and
# (for grid-blocked campaign withdrawals) the balance is refunded.
RETRY_BACKOFF_MINUTES = [2, 10, 30, 120, 480]
MAX_WITHDRAWAL_ATTEMPTS = 5
CRON_BATCH_LIMIT = 50  # max rows processed per cron run

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
    r"""
    Run all security checks before allowing a withdrawal.
    These are the UNIVERSAL checks that apply to any wallet — min
    amount, wallet address present, KYC, 2FA, daily cap, fee math.

    Balance check is INTENTIONALLY NOT here — it belongs in the
    per-wallet-type validator (validate_affiliate_withdrawal /
    validate_campaign_withdrawal) so that a campaign withdrawal
    doesn't get rejected for insufficient AFFILIATE balance, which
    used to happen here pre-4-May-2026 and produced the user-facing
    bug of 'Insufficient balance. Available: $10' when trying to
    withdraw $29 from a campaign wallet that had $29.

    Returns {"valid": True} or {"valid": False, "error": "reason"}
    """
    amount = Decimal(str(amount))

    if amount < MIN_WITHDRAWAL:
        return {"valid": False, "error": f"Minimum withdrawal is ${MIN_WITHDRAWAL}"}

    # Wallet must be set AND network must be selected. The network field is
    # what the dispatcher uses to route the send (TRC-20 vs BEP-20). Without
    # it, we'd have to guess based on the address prefix, which silently
    # routing-on-wrong-chain risks burning funds. Cleaner to require explicit
    # selection at wallet entry time.
    if not user.wallet_address:
        return {"valid": False, "error": "No withdrawal wallet set. Add your USDT wallet address in Account settings."}

    network = (getattr(user, 'wallet_network', None) or "").lower()
    if network not in ("tron", "bsc"):
        return {"valid": False, "error": "Withdrawal network not selected. Go to Account → Wallet and choose TRC-20 (Tron) or BEP-20 (BSC)."}

    # Length sanity check — defence in depth. Frontend regex should have
    # already caught format errors but if a row got past that somehow,
    # this stops it from reaching the send function with malformed input.
    if network == "bsc" and len(user.wallet_address) != 42:
        return {"valid": False, "error": "BSC wallet address must be 42 characters starting with 0x. Re-enter in Account settings."}
    if network == "tron" and len(user.wallet_address) != 34:
        return {"valid": False, "error": "Tron wallet address must be 34 characters starting with T. Re-enter in Account settings."}

    # KYC check
    if getattr(user, 'kyc_status', 'none') != 'approved':
        return {"valid": False, "error": "Identity verification (KYC) required before withdrawals. Go to Account to submit your documents."}

    # 2FA check
    if not getattr(user, 'totp_enabled', False):
        return {"valid": False, "error": "Two-factor authentication required before withdrawals. Go to Account to enable 2FA."}

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


def validate_affiliate_withdrawal(db, user, amount):
    """
    Wallet-specific check for affiliate (membership / course / Pay It
    Forward / Creative Studio sponsor) withdrawals. Just verifies
    sufficient balance in the affiliate column.
    Returns {"valid": True} or {"valid": False, "error": "reason"}
    """
    amount = Decimal(str(amount))
    if Decimal(str(user.balance or 0)) < amount:
        return {"valid": False, "error": f"Insufficient affiliate balance. Available: ${float(user.balance or 0):.2f}"}
    return {"valid": True}


def validate_campaign_withdrawal(db, user, amount):
    """
    Additional checks for campaign wallet withdrawals — INITIAL request.
    Requires: sufficient campaign balance + active campaign tier +
              Watch-to-Earn quota compliance.
    Returns {"valid": True} or {"valid": False, "error": "reason"}

    For RETRIES, use validate_campaign_withdrawal_structural which skips
    the balance check (because the deduction has already succeeded —
    the money is in the withdrawal row, not the user's balance).
    """
    from .database import Grid, WatchQuota

    amount = Decimal(str(amount))

    # Check campaign_balance specifically
    if Decimal(str(user.campaign_balance or 0)) < amount:
        return {"valid": False, "error": f"Insufficient campaign balance. Available: ${float(user.campaign_balance or 0):.2f}"}

    return _validate_campaign_structural(db, user)


def validate_campaign_withdrawal_structural(db, user):
    """Retry-time check for campaign withdrawals. Verifies the user
    still meets the STRUCTURAL eligibility criteria — active tier and
    watch quota — but does NOT check balance.

    Why no balance check: by the time we're here, the original request
    has already passed validate_campaign_withdrawal (which DID check
    balance) and atomically deducted the amount via UPDATE...WHERE
    campaign_balance >= amount. The withdrawal row exists BECAUSE the
    deduction succeeded. The current user.campaign_balance no longer
    contains the funds — they're earmarked in the pending withdrawal.

    Pre-5-May-2026 the retry path called the full validator including
    the balance check, which always returned 'Insufficient campaign
    balance. Available: $0.00' on first retry. The path then refunded
    + marked failed_permanent, surfacing as 'Structurally blocked on
    retry: Insufficient campaign balance' to the user. This was the
    bug Steve hit when withdrawing $29: deduction succeeded, transfer
    queued, retry tripped the wrongful balance check, refund happened.

    Returns {"valid": True} or {"valid": False, "error": "reason"}
    """
    return _validate_campaign_structural(db, user)


def _validate_campaign_structural(db, user):
    """Shared structural checks: active tier + watch quota. No balance.
    Used by both the initial validator (after its balance check) and
    the retry validator (which skips balance entirely).
    """
    from .database import Grid, WatchQuota

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


# ═══════════════════════════════════════════════════════════════════════
#  MULTI-NETWORK SEND FUNCTIONS — added 6 May 2026
#  Replaces single-network Polygon path with TRC-20 + BEP-20 dispatch.
#  Each function returns the same shape as legacy send_usdt:
#     {"success": bool, "tx_hash": str, "error": str}
#  so the dispatcher and the cron retry loop can call them interchangeably.
# ═══════════════════════════════════════════════════════════════════════

def _get_tron_client():
    """Build a tronpy Tron client.

    Uses TRON_API_KEY if set (lifts the public rate limit). Without an
    API key, public TronGrid rate-limits at ~5 req/s and we will hit
    429s under launch load. For prod, configure TRON_API_KEY.
    """
    from tronpy import Tron
    from tronpy.providers import HTTPProvider

    if TRON_API_KEY:
        provider = HTTPProvider(TRON_RPC_URL, api_key=TRON_API_KEY)
    else:
        provider = HTTPProvider(TRON_RPC_URL)
    return Tron(provider)


def _get_tron_private_key():
    """Get Tron treasury private key from env. Hex string, 64 chars, no 0x prefix."""
    from tronpy.keys import PrivateKey

    key = os.environ.get("TREASURY_PRIVATE_KEY_TRON", "")
    if not key:
        raise ValueError("TREASURY_PRIVATE_KEY_TRON not set")
    # tronpy expects raw bytes; accept either with or without 0x prefix
    if key.startswith("0x") or key.startswith("0X"):
        key = key[2:]
    if len(key) != 64:
        raise ValueError(f"TREASURY_PRIVATE_KEY_TRON wrong length ({len(key)} chars, expected 64)")
    return PrivateKey(bytes.fromhex(key))


def get_treasury_tron_balances():
    """Return (usdt_balance, trx_balance) for the Tron treasury.

    USDT in human units (e.g. 200.50). TRX in human units (e.g. 30.4).
    Used by admin diagnostics and pre-flight check before sending.
    """
    try:
        client = _get_tron_client()
        contract = client.get_contract(USDT_CONTRACT_TRON)
        balance_raw = contract.functions.balanceOf(TREASURY_ADDRESS_TRON)
        usdt = Decimal(str(balance_raw)) / Decimal(10 ** USDT_DECIMALS_TRON)
        trx = Decimal(str(client.get_account_balance(TREASURY_ADDRESS_TRON)))
        return float(usdt), float(trx)
    except Exception as e:
        logger.error(f"Failed to read Tron treasury balances: {e}")
        return 0.0, 0.0


def send_usdt_tron(to_address, amount_usdt):
    """Send USDT-TRC-20 from treasury to a recipient address.

    Returns: {"success": bool, "tx_hash": str, "error": str}
            (same shape as legacy send_usdt — dispatcher-compatible)

    Tron differs from EVM in two operationally-important ways:

    1. **Gas model is energy + bandwidth, not gas-price**. A USDT transfer
       costs roughly 13.4 TRX (~$4.50) without staking. There's no
       "estimated gas" knob to tweak; the cost is fixed by the contract
       call's energy consumption. We just need enough TRX in the treasury
       to pay it.

    2. **Address format is base58check (T-prefix)**. tronpy handles the
       encoding internally — we pass strings, it converts. No checksum
       conversion needed like EVM's to_checksum_address.

    Behaviour mirrors the EVM send: pre-flight checks (balance,
    gas-token), sign locally, broadcast, return tx hash. On error returns
    the structured failure dict so the cron retry loop can decide whether
    to retry or mark permanent.
    """
    amount_usdt = Decimal(str(amount_usdt))

    try:
        client = _get_tron_client()
        priv_key = _get_tron_private_key()

        # Sanity check the destination address — catches obvious paste-error
        # bugs before we burn a transaction. The frontend regex should have
        # already validated, but defense-in-depth on a money-flow path.
        if not client.is_address(to_address):
            return {"success": False, "tx_hash": "", "error": f"Invalid Tron address: {to_address}"}

        # Convert USDT to raw units. Tron USDT uses 6 decimals
        # (native USDT, same as Ethereum). USDT_DECIMALS_TRON = 6 — do
        # NOT confuse with USDT_DECIMALS_BSC = 18.
        amount_raw = int(amount_usdt * Decimal(10 ** USDT_DECIMALS_TRON))
        if amount_raw <= 0:
            return {"success": False, "tx_hash": "", "error": "Invalid amount"}

        # Pre-flight: USDT balance check
        contract = client.get_contract(USDT_CONTRACT_TRON)
        balance_raw = contract.functions.balanceOf(TREASURY_ADDRESS_TRON)
        if balance_raw < amount_raw:
            wallet_balance = Decimal(str(balance_raw)) / Decimal(10 ** USDT_DECIMALS_TRON)
            logger.error(f"Insufficient Tron treasury USDT: {wallet_balance} < {amount_usdt}")
            return {"success": False, "tx_hash": "", "error": f"Insufficient treasury funds (${wallet_balance:.2f} available)"}

        # Pre-flight: TRX for energy/bandwidth.
        # ~13.4 TRX is the typical cost for a USDT transfer without staking.
        # Set a slightly lower threshold (10 TRX) as the "would-be-stuck" line —
        # below this, the transaction will fail mid-flight with cryptic errors.
        # Above this, we let it try and any actual fee shortfall surfaces
        # cleanly via the broadcast response.
        trx_balance = Decimal(str(client.get_account_balance(TREASURY_ADDRESS_TRON)))
        if trx_balance < Decimal("10"):
            return {"success": False, "tx_hash": "", "error": f"Treasury needs TRX for transaction fees ({trx_balance:.2f} TRX available, need 10+)"}

        # Build, sign, broadcast
        txn = (
            contract.functions.transfer(to_address, amount_raw)
            .with_owner(TREASURY_ADDRESS_TRON)
            .fee_limit(50_000_000)  # 50 TRX cap as a hard limit on energy cost
            .build()
            .sign(priv_key)
        )
        result = txn.broadcast()

        # tronpy's broadcast() returns a dict with "result" bool and "txid" string
        # if the network accepted the transaction. We log and return the txid.
        # Note: "accepted by network" != "confirmed on-chain". The cron loop
        # treats this as success and a downstream confirm-checker (TODO) can
        # validate inclusion in a block. For launch, broadcast acceptance is
        # the practical equivalent of EVM "transaction submitted".
        if not result or not result.get("result"):
            err_msg = result.get("message", "broadcast rejected") if result else "broadcast returned None"
            logger.error(f"Tron broadcast failed: {err_msg}")
            return {"success": False, "tx_hash": "", "error": f"Broadcast failed: {err_msg}"}

        tx_id = result.get("txid", "")
        logger.info(f"USDT-TRC-20 sent: {amount_usdt} USDT to {to_address} -- tx: {tx_id}")
        return {"success": True, "tx_hash": tx_id, "error": ""}

    except Exception as e:
        # Common Tron-specific failures:
        # - "validate signature error" → wrong private key
        # - "Account resource insufficient" → not enough TRX
        # - "Cannot find account" → recipient address never received TRX (rare)
        logger.error(f"USDT-TRC-20 send failed: {type(e).__name__}: {e}")
        return {"success": False, "tx_hash": "", "error": str(e)}


# ── BSC (BEP-20) send path ─────────────────────────────────────────────
# EVM-compatible — same web3.py library as Polygon, different RPC + contract.

def _build_web3_for_url(url):
    """Build a Web3 instance for a single RPC URL. Raises ConnectionError
    if the endpoint is unreachable or reports as disconnected.
    """
    from web3 import Web3
    w3 = Web3(Web3.HTTPProvider(url, request_kwargs={"timeout": 15}))
    if not w3.is_connected():
        raise ConnectionError(f"Cannot connect to BSC RPC at {url}")
    return w3


def _get_web3_bsc():
    """Build a Web3 instance connected to BSC, trying primary first then
    fallbacks in order. Returns the first working instance.

    Back-compat: callers that just need any working w3 keep working
    unchanged. The failover wraps the previous single-URL behaviour —
    if primary is up, returns it (same latency as before). If primary
    is unreachable, transparently falls through to public BSC dataseed
    endpoints (free, no API key needed).

    For per-call retry against fallback providers on errors that occur
    AFTER connection (e.g. eth_getLogs returns 429 because we exceeded
    a per-second cap), use call_bsc_rpc_with_failover() instead — this
    function only handles unreachable-RPC failover.
    """
    primary_err = None
    try:
        return _build_web3_for_url(BSC_RPC_URL)
    except Exception as e:
        primary_err = e
        logger.warning(f"BSC primary RPC unreachable ({BSC_RPC_URL}): {e}")

    for fallback in BSC_RPC_FALLBACKS:
        if fallback == BSC_RPC_URL:
            continue  # already tried as primary
        try:
            w3 = _build_web3_for_url(fallback)
            logger.info(f"BSC RPC failover succeeded on {fallback}")
            return w3
        except Exception as e:
            logger.warning(f"BSC fallback RPC {fallback} also unreachable: {e}")
            continue

    raise ConnectionError(
        f"All BSC RPC endpoints unreachable. Primary {BSC_RPC_URL} "
        f"failed ({primary_err}); tried {len(BSC_RPC_FALLBACKS)} fallback(s)."
    )


# Sentinel: exceptions whose stringified form indicates the upstream
# provider rate-limited us (rather than a real on-chain / data error).
# When we see one of these on an eth_getLogs / eth_blockNumber call, we
# retry against fallback providers instead of giving up.
_RATE_LIMIT_SIGNALS = (
    "429",
    "rate limit",
    "rate-limit",
    "ratelimit",
    "too many requests",
    "limit exceeded",
    "-32005",        # JSON-RPC code Alchemy uses
    "quota",
    "throttle",
)


def _looks_like_rate_limit(err: Exception) -> bool:
    msg = str(err).lower()
    return any(sig in msg for sig in _RATE_LIMIT_SIGNALS)


def call_bsc_rpc_with_failover(fn_name: str, *args, **kwargs):
    """Call a Web3.eth method by NAME against the primary BSC RPC, retrying
    against fallback RPCs on rate-limit / connection errors.

    fn_name: dotted path on the w3 instance (e.g. "eth.get_logs",
             "eth.block_number"). For attributes (block_number),
             pass with args=() / kwargs={}; the helper detects and
             returns the attribute value instead of calling.

    Args / kwargs are passed through to the underlying call.

    Non-rate-limit exceptions raise immediately — we only failover on
    errors that look like upstream throttling. Real bugs (bad request
    args, invalid block range > 10 etc) surface to the caller unchanged.

    Returns the result of the first successful provider. Raises the
    last exception if every provider fails.
    """
    # Build the candidate URL list: primary first, then fallbacks (skip
    # duplicates if primary is also in the fallback list).
    candidates = [BSC_RPC_URL] + [u for u in BSC_RPC_FALLBACKS if u != BSC_RPC_URL]
    last_err = None
    for i, url in enumerate(candidates):
        try:
            w3 = _build_web3_for_url(url)
            # Walk the dotted attribute chain
            target = w3
            for part in fn_name.split("."):
                target = getattr(target, part)
            # If it's callable, invoke; else return the attribute value
            if callable(target):
                result = target(*args, **kwargs)
            else:
                result = target
            if i > 0:
                logger.info(f"BSC RPC call {fn_name} succeeded on fallback #{i} ({url})")
            return result
        except Exception as e:
            last_err = e
            if _looks_like_rate_limit(e) or isinstance(e, ConnectionError):
                logger.warning(
                    f"BSC RPC {fn_name} on {url} failed (rate-limit/conn): {e}; "
                    f"trying next provider ({len(candidates) - i - 1} remaining)"
                )
                continue
            # Not a rate-limit error — fail fast
            raise
    raise ConnectionError(
        f"All {len(candidates)} BSC RPC endpoints failed for {fn_name}. "
        f"Last error: {last_err}"
    )


def _get_bsc_private_key():
    """Get BSC treasury private key from env. Hex string, with or without 0x prefix."""
    key = os.environ.get("TREASURY_PRIVATE_KEY_BSC", "")
    if not key:
        raise ValueError("TREASURY_PRIVATE_KEY_BSC not set")
    if not key.startswith("0x"):
        key = "0x" + key
    if len(key) != 66:  # 0x + 64 hex chars
        raise ValueError(f"TREASURY_PRIVATE_KEY_BSC wrong length ({len(key)} chars, expected 66 with 0x prefix)")
    return key


def get_treasury_bsc_balances():
    """Return (usdt_balance, bnb_balance) for the BSC treasury.

    USDT in human units (e.g. 134.96). BNB in human units (e.g. 0.0157).
    Used by admin diagnostics and pre-flight check before sending.
    """
    try:
        from web3 import Web3
        w3 = _get_web3_bsc()
        addr = Web3.to_checksum_address(TREASURY_ADDRESS_BSC)
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(USDT_CONTRACT_BSC),
            abi=ERC20_ABI,
        )
        balance_raw = contract.functions.balanceOf(addr).call()
        usdt = Decimal(str(balance_raw)) / Decimal(10 ** USDT_DECIMALS_BSC)
        bnb_raw = w3.eth.get_balance(addr)
        bnb = Decimal(str(bnb_raw)) / Decimal(10 ** 18)
        return float(usdt), float(bnb)
    except Exception as e:
        logger.error(f"Failed to read BSC treasury balances: {e}")
        return 0.0, 0.0


def send_usdt_bsc(to_address, amount_usdt):
    """Send USDT-BEP-20 from BSC treasury to a recipient address.

    Returns: {"success": bool, "tx_hash": str, "error": str}
            (same shape as send_usdt and send_usdt_tron — dispatcher-compatible)

    Mirrors the legacy Polygon send (which used the same web3.py) but
    against BSC. Differences from the Polygon version:
    - Different RPC URL (BSC public node, no API key needed for launch volume)
    - Different USDT contract address (0x55d398... not 0xc2132...)
    - Different chain ID (56 vs 137)
    - Gas token is BNB not POL (semantically same, just different name)
    """
    from web3 import Web3

    private_key = _get_bsc_private_key()
    amount_usdt = Decimal(str(amount_usdt))

    try:
        w3 = _get_web3_bsc()
        from_address = Web3.to_checksum_address(TREASURY_ADDRESS_BSC)

        # BSC accepts checksummed addresses; reject non-EVM upfront.
        # The 0x-format check happens at validation layer; here we just
        # let to_checksum_address raise for malformed addresses, which
        # bubbles to the except block as a clean error string.
        try:
            to_addr = Web3.to_checksum_address(to_address)
        except Exception:
            return {"success": False, "tx_hash": "", "error": f"Invalid BSC address: {to_address}"}

        # Convert USDT to raw units. CRITICAL: BSC USDT uses 18 decimals
        # (it's Binance-Peg wrapped USDT — different from native USDT on
        # Ethereum/Tron/Polygon which use 6). Using the wrong constant
        # causes the on-chain transfer to send dust — this exact bug
        # caused the 6 May 2026 incident where $9 sent on-chain as
        # 0.000000000009 USDT. Always USDT_DECIMALS_BSC here, not
        # USDT_DECIMALS.
        amount_raw = int(amount_usdt * Decimal(10 ** USDT_DECIMALS_BSC))
        if amount_raw <= 0:
            return {"success": False, "tx_hash": "", "error": "Invalid amount"}

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(USDT_CONTRACT_BSC),
            abi=ERC20_ABI,
        )

        # Pre-flight: USDT balance check
        balance_raw = contract.functions.balanceOf(from_address).call()
        if balance_raw < amount_raw:
            wallet_balance = Decimal(str(balance_raw)) / Decimal(10 ** USDT_DECIMALS_BSC)
            logger.error(f"Insufficient BSC treasury USDT: {wallet_balance} < {amount_usdt}")
            return {"success": False, "tx_hash": "", "error": f"Insufficient treasury funds (${wallet_balance:.2f} available)"}

        # Pre-flight: BNB for gas. BSC USDT transfers cost ~0.0003 BNB at typical
        # gas prices (3 gwei × 100k gas). 0.001 BNB is comfortable headroom for
        # ~3 transfers; below this we surface the error before burning a tx.
        bnb_balance = w3.eth.get_balance(from_address)
        if bnb_balance < w3.to_wei(0.001, 'ether'):
            return {"success": False, "tx_hash": "", "error": "Treasury needs BNB for gas fees"}

        # Build, sign, broadcast
        nonce = w3.eth.get_transaction_count(from_address)
        gas_price = w3.eth.gas_price

        tx = contract.functions.transfer(to_addr, amount_raw).build_transaction({
            "from": from_address,
            "nonce": nonce,
            "gas": 100000,
            "gasPrice": int(gas_price * 1.2),
            "chainId": BSC_CHAIN_ID,
        })

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hash_hex = tx_hash.hex()

        logger.info(f"USDT-BEP-20 sent: {amount_usdt} USDT to {to_address} -- tx: {tx_hash_hex}")
        return {"success": True, "tx_hash": tx_hash_hex, "error": ""}

    except Exception as e:
        logger.error(f"USDT-BEP-20 send failed: {type(e).__name__}: {e}")
        return {"success": False, "tx_hash": "", "error": str(e)}


# ── Network-aware dispatcher ───────────────────────────────────────────
# Single entry point that routes to the correct chain based on the
# withdrawal's network field. Used by request_withdrawal and the cron
# retry loop. Centralising the dispatch logic here means only ONE place
# needs updating if we add a third network later (e.g. Polygon revival,
# Solana, Arbitrum).

def send_usdt_dispatch(network, to_address, amount_usdt):
    """Route a USDT send to the right chain.

    network: 'tron' or 'bsc' (case-insensitive)
    Returns the same dict shape as the underlying send functions.

    For unknown/missing network values, returns a structured error rather
    than guessing — silently sending on the wrong chain is worse than a
    clean failure that surfaces in admin alerts.
    """
    net = (network or "").lower()
    if net == "tron":
        return send_usdt_tron(to_address, amount_usdt)
    if net == "bsc":
        return send_usdt_bsc(to_address, amount_usdt)
    return {
        "success": False,
        "tx_hash": "",
        "error": f"Unknown withdrawal network: {network!r}. Expected 'tron' or 'bsc'.",
    }


def _refund_withdrawal(db, withdrawal, reason):
    """Credit a withdrawal's amount back to the correct balance column and
    mark the row failed_permanent. Used when retries hit max OR a campaign
    withdrawal becomes structurally blocked (user lost their active tier
    between attempts) — without this the money would be trapped in
    withdrawal-purgatory and require admin intervention.

    Mirrors the column-targeting logic in payment.request_withdrawal so the
    refund lands on the same balance the deduction came from.
    """
    from sqlalchemy import text as sa_text
    from .database import User, Notification
    wallet_type = (withdrawal.wallet_type or "affiliate").lower()
    balance_col = "campaign_balance" if wallet_type == "campaign" else "balance"
    amount = float(Decimal(str(withdrawal.amount_usdt or 0)))

    # Atomic refund + decrement total_withdrawn (kept consistent with the
    # admin refund path in main.py — same SQL shape).
    db.execute(
        sa_text(
            f"UPDATE users SET {balance_col} = COALESCE({balance_col}, 0) + :amt, "
            f"total_withdrawn = GREATEST(COALESCE(total_withdrawn, 0) - :amt, 0) "
            f"WHERE id = :uid"
        ),
        {"amt": amount, "uid": withdrawal.user_id},
    )
    withdrawal.status = "failed_permanent"
    withdrawal.last_error = reason[:500] if reason else "refunded"
    withdrawal.processed_at = datetime.utcnow()
    existing = (withdrawal.notes or "").strip()
    stamp = f"[auto-refund {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {reason}"
    withdrawal.notes = (existing + " | " + stamp).strip(" |") if existing else stamp

    # Notify the member — best-effort.
    try:
        db.add(Notification(
            user_id=withdrawal.user_id,
            type="withdrawal",
            title="Withdrawal refunded",
            message=(
                f"Your ${amount:.2f} withdrawal couldn't be sent and has been "
                f"refunded to your {wallet_type} balance. You can try again "
                f"from the Wallet page."
            ),
            icon="💰",
        ))
        db.commit()
    except Exception as e:
        logger.warning(f"Refund notification failed for withdrawal #{withdrawal.id}: {e}")
        db.rollback()
        db.commit()  # ensure the refund itself sticks even if notification rolled back

    logger.info(
        f"Withdrawal #{withdrawal.id} auto-refunded ${amount} to user "
        f"{withdrawal.user_id} {wallet_type} balance — {reason}"
    )


def process_withdrawal(db, withdrawal_id):
    """
    Process a single pending withdrawal:
    1. Re-validate (catches structural blocks that appeared since request)
    2. Deduct $1 fee
    3. Send USDT on Polygon to member's wallet
    4. Update withdrawal record with tx_hash and status, OR
    5. Increment attempts and either re-queue (with backoff) or mark
       failed_permanent (with refund if structurally blocked).

    Re-validation matters specifically for campaign withdrawals: if the
    user's active tier completed between the request and a retry, they
    no longer qualify — retrying forever would be wrong. We refund and
    stop.
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

    # ── Structural revalidation for campaign withdrawals ────────────
    # If the user has lost their active tier (Grid.is_complete went True
    # between the request and this retry), don't keep trying — refund
    # and mark permanent. This is the "don't retry forever on
    # structurally-blocked withdrawals" case from the design doc.
    #
    # IMPORTANT: use validate_campaign_withdrawal_STRUCTURAL here, NOT
    # the full validator. The full validator includes a balance check,
    # which always fails on retry because the deduction succeeded on
    # the first attempt. The structural-only variant checks active
    # tier + watch quota and skips balance — which is what we
    # actually want for a retry. The pre-5-May-2026 code called the
    # full validator and falsely refunded successful-but-pending
    # withdrawals. See validate_campaign_withdrawal_structural docstring.
    wallet_type = (withdrawal.wallet_type or "affiliate").lower()
    if wallet_type == "campaign":
        cv = validate_campaign_withdrawal_structural(db, user)
        if not cv["valid"]:
            # Refund and stop. Note: we still credit campaign_balance back
            # — the original deduction came from there even though the
            # tier is now complete. The user can withdraw again after
            # activating a new tier.
            _refund_withdrawal(db, withdrawal, f"Structurally blocked on retry: {cv['error']}")
            return {"success": False, "error": cv["error"], "permanent": True}

    # Calculate net amount after fee
    gross_amount = Decimal(str(withdrawal.amount_usdt))
    net_amount = gross_amount - WITHDRAWAL_FEE

    if net_amount <= 0:
        # Should be impossible given MIN_WITHDRAWAL=$10 and fee=$1 but
        # defensive — also a permanent-failure case (no point retrying).
        withdrawal.status = "failed_permanent"
        withdrawal.last_error = (
            f"Amount ${gross_amount} minus ${WITHDRAWAL_FEE} fee leaves nothing to send"
        )
        withdrawal.processed_at = datetime.utcnow()
        db.commit()
        return {"success": False, "error": withdrawal.last_error, "permanent": True}

    # Mark as processing
    withdrawal.status = "processing"
    withdrawal.last_attempted_at = datetime.utcnow()
    db.commit()

    # Route to the right network. The Withdrawal row was stamped with the
    # network at request time (Step 1 schema migration), so the chain we
    # send on matches the chain the member's wallet is on. If a row predates
    # the migration (network IS NULL — legacy Polygon-era data), the
    # dispatcher returns a structured error rather than guessing.
    #
    # The legacy send_usdt() (Polygon) is intentionally NOT in the dispatch
    # table — Polygon is dormant. Any pending Polygon-era withdrawals would
    # need to be either manually refunded or manually retried via the
    # legacy function while we're transitioning. After 6 May 2026 launch
    # there should be no more Polygon-era pending rows.
    network = (withdrawal.network or "").lower()
    if not network:
        logger.error(f"Withdrawal #{withdrawal_id} has no network — cannot dispatch")
        withdrawal.status = "failed_permanent"
        withdrawal.last_error = "No network set on withdrawal — admin must refund manually"
        withdrawal.processed_at = datetime.utcnow()
        db.commit()
        return {"success": False, "error": withdrawal.last_error, "permanent": True}

    result = send_usdt_dispatch(network, withdrawal.wallet_address, net_amount)

    if result["success"]:
        withdrawal.status = "paid"
        withdrawal.tx_hash = result["tx_hash"]
        withdrawal.processed_at = datetime.utcnow()
        # On success we don't bump attempts — attempts only counts FAILED
        # attempts, otherwise a successful first try would already read
        # attempts=1 which makes retry-cron filter logic confusing.
        withdrawal.last_error = None
        db.commit()

        logger.info(f"Withdrawal #{withdrawal_id} paid: ${net_amount} USDT to {withdrawal.wallet_address}")

        # Send notification to member (best-effort — withdrawal already committed)
        try:
            from .database import Notification
            notif = Notification(
                user_id=user.id,
                type="withdrawal",
                title="Withdrawal Processed",
                message=f"${net_amount:.2f} USDT sent to your wallet. Tx: {result['tx_hash'][:16]}...",
                icon="💰",
            )
            db.add(notif)
            db.commit()
        except Exception as e:
            # Notification failure must not poison the session for downstream
            # callers — explicit rollback restores the session to a usable state.
            # The withdrawal itself is already committed above and is safe;
            # we only lose the convenience notification.
            logger.warning(f"Failed to create withdrawal notification for user {user.id}: {e}")
            db.rollback()

        return {
            "success": True,
            "tx_hash": result["tx_hash"],
            "net_amount": float(net_amount),
            "fee": float(WITHDRAWAL_FEE),
        }
    else:
        # ── Failure path: bump attempts, decide retry vs permanent ──
        withdrawal.attempts = (withdrawal.attempts or 0) + 1
        withdrawal.last_error = (result.get("error") or "")[:500]
        withdrawal.last_attempted_at = datetime.utcnow()

        if withdrawal.attempts >= MAX_WITHDRAWAL_ATTEMPTS:
            # Out of retries — refund and stop. This guarantees no money
            # gets stuck even when the failure is "treasury empty" or
            # similar non-structural cause. Admin can investigate the
            # row's last_error for the root cause.
            _refund_withdrawal(
                db, withdrawal,
                f"Max attempts ({MAX_WITHDRAWAL_ATTEMPTS}) reached: {withdrawal.last_error}",
            )
            logger.error(
                f"Withdrawal #{withdrawal_id} marked failed_permanent after "
                f"{withdrawal.attempts} attempts: {withdrawal.last_error}"
            )
            return {
                "success": False,
                "error": withdrawal.last_error,
                "permanent": True,
                "attempts": withdrawal.attempts,
            }

        # Re-queue for the next backoff window.
        withdrawal.status = "pending"
        db.commit()
        logger.warning(
            f"Withdrawal #{withdrawal_id} attempt {withdrawal.attempts}/"
            f"{MAX_WITHDRAWAL_ATTEMPTS} failed: {withdrawal.last_error}"
        )
        return {
            "success": False,
            "error": withdrawal.last_error,
            "permanent": False,
            "attempts": withdrawal.attempts,
        }


def process_pending_withdrawals_batch(db):
    """
    Sweep pending withdrawals that are due for a retry attempt.

    Eligible row = status='pending' AND
        (last_attempted_at IS NULL  -- never tried; new request that
                                       failed inline at request_withdrawal)
         OR last_attempted_at < (now - backoff(attempts)))

    LIMIT CRON_BATCH_LIMIT to keep cron-job.org runs fast (5min cadence).

    Returns a counts dict for cron-job.org logs / monitoring.
    """
    from .database import Withdrawal
    from sqlalchemy import or_

    now = datetime.utcnow()

    # Fetch a generous candidate pool then filter in Python — postgres
    # CASE-with-interval is fiddly and the row count here will be tiny
    # for the foreseeable future (13 users at launch). Cap at 200 in the
    # query so we don't accidentally drag a huge dataset into memory.
    candidates = (
        db.query(Withdrawal)
        .filter(Withdrawal.status == "pending")
        .filter(or_(
            Withdrawal.last_attempted_at.is_(None),
            Withdrawal.last_attempted_at < now,  # cheap pre-filter; precise check below
        ))
        .order_by(Withdrawal.last_attempted_at.asc().nullsfirst(), Withdrawal.id.asc())
        .limit(200)
        .all()
    )

    counts = {"considered": 0, "processed": 0, "succeeded": 0, "failed": 0,
              "permanent": 0, "skipped_backoff": 0, "errors": 0}

    for w in candidates:
        if counts["processed"] >= CRON_BATCH_LIMIT:
            break

        counts["considered"] += 1

        # Backoff check: rows that have a last_attempted_at need to wait
        # the full RETRY_BACKOFF_MINUTES[attempts-1] before being retried.
        # Eligibility is computed from last_attempted_at, NOT now.
        if w.last_attempted_at is not None and (w.attempts or 0) > 0:
            idx = max(0, min((w.attempts or 1) - 1, len(RETRY_BACKOFF_MINUTES) - 1))
            wait_minutes = RETRY_BACKOFF_MINUTES[idx]
            eligible_at = w.last_attempted_at + timedelta(minutes=wait_minutes)
            if now < eligible_at:
                counts["skipped_backoff"] += 1
                continue

        try:
            result = process_withdrawal(db, w.id)
            counts["processed"] += 1
            if result.get("success"):
                counts["succeeded"] += 1
            elif result.get("permanent"):
                counts["permanent"] += 1
            else:
                counts["failed"] += 1
        except Exception as e:
            # Defensive: don't let one bad row poison the whole batch.
            # Roll the session back so subsequent rows can still be processed.
            logger.error(f"Unhandled error processing withdrawal #{w.id}: {e}")
            counts["errors"] += 1
            try:
                db.rollback()
            except Exception:
                pass

    logger.info(f"Withdrawal cron batch: {counts}")
    return counts
