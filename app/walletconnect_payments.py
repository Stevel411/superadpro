"""
SuperAdPro — WalletConnect / Self-Custody Payment Service
USDT-BEP-20 on BSC, signed directly by the member from their own wallet.

Architecture:
  1. Member clicks "Pay with Wallet" on a checkout page → backend creates
     a WalletConnectPaymentOrder with a unique cent-level amount (e.g. $19.97
     instead of $20.00) and 15-min expiry
  2. Frontend opens Reown AppKit (WalletConnect v2), member approves the
     USDT-BEP-20 transfer to the treasury wallet from their own wallet
  3. Cron runner /cron/scan-bsc-payments (30s interval) reads recent USDT
     Transfer events to the treasury via eth_getLogs and matches by amount
  4. On match: status → 'confirmed', activation handler runs (membership /
     grid / nexus / course) — same handlers used by the existing crypto rail

Why a separate module from crypto_payments.py:
  - Different chain (BSC vs Polygon), different USDT contract, different
    decimals (18 vs 6), different RPC pattern (web3.py + BSC_RPC_URL via
    Alchemy vs direct alchemy_getAssetTransfers — Alchemy doesn't expose
    enhanced APIs on BSC, only standard JSON-RPC, so we use eth_getLogs)
  - Different uniqueness scheme: cent-level amounts (1 cent granularity
    per Steve's spec, 5 May 2026) rather than micro-cent suffixes
  - Different operational lifecycle: parallel-runs alongside NOWPayments
    for 2 weeks before the legacy rails are retired

RPC plan limits (Alchemy free tier, May 2026):
  - eth_getLogs is capped at a 10-block range per request
  - We compensate with a paginated scan: each cron run walks the chain in
    10-block chunks from a self-derived "floor" (oldest still-pending
    order's created_at → block estimate) up to the latest block. No
    persisted cursor needed — DB pending state is the cursor.

Constants are imported from withdrawals.py wherever possible to keep a
single source of truth for treasury address / USDT contract / decimals.
"""

import os
import json
import logging
import hashlib
import time
from decimal import Decimal, ROUND_DOWN
from datetime import datetime, timedelta

# Reuse BSC constants from the withdrawals module — single source of truth
# for treasury address, USDT contract, decimals, RPC URL.
from app.withdrawals import (
    TREASURY_ADDRESS_BSC,
    USDT_CONTRACT_BSC,
    USDT_DECIMALS_BSC,
    BSC_CHAIN_ID,
    BSC_RPC_URL,
    _get_web3_bsc,
)

logger = logging.getLogger("superadpro.walletconnect")

# ── Configuration ─────────────────────────────────────────────────────
# Pending orders expire after 15 minutes (per Steve, 6 May 2026).
ORDER_EXPIRY_MINUTES = 15

# Cent-level uniqueness: 1 cent granularity, ±50 cents around the base
# price, giving ~100 unique amounts per tier. Sufficient for ~10
# concurrent orders per tier in any 15-min window with comfortable
# headroom (per Steve, peak load estimate 5–10 concurrent).
UNIQUE_RANGE_CENTS = 50

# ERC-20 Transfer event topic — keccak256("Transfer(address,address,uint256)")
TRANSFER_EVENT_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

# eth_getLogs window per request. Alchemy free tier caps at 10 blocks per
# call; we paginate when scanning a wider range. BSC mints a block every
# ~3 seconds → 10 blocks ≈ 30 seconds of chain time, which exactly matches
# the cron cadence. In steady state each cron run does one getLogs call.
GETLOGS_WINDOW_BLOCKS = 10

# Maximum total chain history scanned per cron run, across all paginated
# calls. Cap exists to bound API usage if the cursor falls badly behind
# (e.g. extended outage). At 10 blocks per call and 100 calls per scan
# that's 1000 blocks ≈ 50 minutes of chain history. Wider than the order
# expiry window, so we'll never miss a still-valid order.
MAX_SCAN_BLOCKS_PER_RUN = 1000

# BSC averages ~3 second blocks. Used to estimate "blocks since X minutes
# ago" for deriving the scan floor from pending order timestamps.
BSC_AVG_BLOCK_SECONDS = 3

# Products and base prices — kept in sync with crypto_payments.PRODUCT_PRICES.
# These are the sticker prices in USD; the cent-level unique offset is
# applied in generate_unique_amount(). DO NOT add commission rates or
# split percentages here — those live in the activation handlers and in
# docs/commission-spec.md.
PRODUCT_PRICES = {
    # Membership (Stream 01) — 50/50 split per docs/commission-spec.md
    "membership_basic":         Decimal("20.00"),
    "membership_pro":           Decimal("35.00"),
    "membership_basic_annual":  Decimal("200.00"),
    "membership_pro_annual":    Decimal("350.00"),
    # Campaign Grid (Stream 02) — 95/5 split
    "grid_1":   Decimal("20.00"),
    "grid_2":   Decimal("50.00"),
    "grid_3":   Decimal("100.00"),
    "grid_4":   Decimal("200.00"),
    "grid_5":   Decimal("400.00"),
    "grid_6":   Decimal("600.00"),
    "grid_7":   Decimal("800.00"),
    "grid_8":   Decimal("1000.00"),
    # Credit Nexus / Credit Matrix (Stream 03) — 85/15 split
    # Pack keys MUST match those used by NOWPayments IPN
    # (app/main.py:7682) and credit_matrix.purchase_credit_pack —
    # which expect "credit_matrix_{starter|builder|pro|advanced|
    # elite|premium|executive|ultimate}". Using these keys means the
    # canonical activation handler handles WalletConnect orders without
    # a code-path fork. Prices match the published pricing card (see
    # Credit Matrix purchase page screenshot, 6 May 2026).
    "credit_matrix_starter":    Decimal("20.00"),    # 100 credits
    "credit_matrix_builder":    Decimal("50.00"),    # 250 credits
    "credit_matrix_pro":        Decimal("100.00"),   # 500 credits
    "credit_matrix_advanced":   Decimal("200.00"),   # 1,000 credits
    "credit_matrix_elite":      Decimal("400.00"),   # 2,000 credits
    "credit_matrix_premium":    Decimal("600.00"),   # 3,000 credits
    "credit_matrix_executive":  Decimal("800.00"),   # 4,000 credits
    "credit_matrix_ultimate":   Decimal("1000.00"),  # 5,000 credits
    # Course Academy (Stream 04) — 100% to affiliates
    "course_starter":   Decimal("100.00"),
    "course_advanced":  Decimal("300.00"),
    "course_elite":     Decimal("500.00"),
    # Email boosts — carried over from crypto_payments.py
    "email_boost_1000":   Decimal("5.00"),
    "email_boost_5000":   Decimal("19.00"),
    "email_boost_10000":  Decimal("29.00"),
    "email_boost_50000":  Decimal("99.00"),
    # Creative Studio packs — carried over
    "superscene_starter":   Decimal("11.00"),
    "superscene_creator":   Decimal("33.00"),
    "superscene_studio":    Decimal("110.00"),
    "superscene_pro":       Decimal("264.00"),
}


# ── Amount helpers ────────────────────────────────────────────────────

def usdt_bsc_to_raw(amount: Decimal) -> int:
    """Convert a human USDT amount to BSC raw integer (18 decimals).

    CRITICAL: BSC USDT is 18 decimals, NOT 6 like Polygon/Tron USDT.
    Mixing this up sends effectively zero on-chain (off by 10^12) — see
    incident referenced in withdrawals.py near line 469.

    Example: Decimal("19.97") → 19_970_000_000_000_000_000
    """
    return int((amount * Decimal(10 ** USDT_DECIMALS_BSC)).quantize(Decimal("1"), rounding=ROUND_DOWN))


def raw_to_usdt_bsc(raw: int) -> Decimal:
    """Convert BSC raw integer (18 decimals) to a human USDT Decimal.

    Returned Decimals are quantized to 6 decimal places to match the
    Numeric(18,6) DB column.
    """
    return (Decimal(raw) / Decimal(10 ** USDT_DECIMALS_BSC)).quantize(
        Decimal("0.000001"), rounding=ROUND_DOWN
    )


def generate_unique_amount(base_price: Decimal, user_id: int, order_id: int) -> Decimal:
    """Generate a cent-unique amount near base price for collision-free matching.

    Strategy: hash (user_id, order_id, timestamp) into the range
    [-UNIQUE_RANGE_CENTS, +UNIQUE_RANGE_CENTS] cents and add to base_price.

    Example: base $20.00 → may return $19.73, $20.41, etc.

    Caller is responsible for ensuring uniqueness within the pending
    set for a tier (re-roll on collision in create_payment_intent).
    """
    seed = f"{user_id}:{order_id}:{int(time.time() * 1000)}"
    hash_val = int(hashlib.sha256(seed.encode()).hexdigest()[:8], 16)
    offset_cents = (hash_val % (UNIQUE_RANGE_CENTS * 2 + 1)) - UNIQUE_RANGE_CENTS
    offset_decimal = Decimal(offset_cents) / Decimal(100)
    unique_amount = base_price + offset_decimal
    return unique_amount.quantize(Decimal("0.01"), rounding=ROUND_DOWN)


# ── Connection / health ───────────────────────────────────────────────

def health_check() -> dict:
    """Verify BSC RPC connectivity and treasury readability.

    Returns a dict with: rpc_url_host, connected, latest_block,
    treasury_address, treasury_usdt, treasury_bnb, error.

    Used by the standalone connection test (run before first deploy)
    and the admin /admin/walletconnect-health diagnostic endpoint.
    """
    result = {
        "rpc_url_host": _redact_rpc_url(BSC_RPC_URL),
        "connected": False,
        "latest_block": None,
        "treasury_address": TREASURY_ADDRESS_BSC,
        "treasury_usdt": None,
        "treasury_bnb": None,
        "error": None,
    }
    try:
        from web3 import Web3
        w3 = _get_web3_bsc()
        result["connected"] = True
        result["latest_block"] = w3.eth.block_number
        erc20_abi = [
            {"constant": True, "inputs": [{"name": "_owner", "type": "address"}],
             "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}],
             "type": "function"},
        ]
        addr = Web3.to_checksum_address(TREASURY_ADDRESS_BSC)
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(USDT_CONTRACT_BSC),
            abi=erc20_abi,
        )
        usdt_raw = contract.functions.balanceOf(addr).call()
        result["treasury_usdt"] = float(raw_to_usdt_bsc(usdt_raw))
        result["treasury_bnb"] = float(
            Decimal(str(w3.eth.get_balance(addr))) / Decimal(10 ** 18)
        )
    except Exception as e:
        result["error"] = str(e)
        logger.error(f"WalletConnect health check failed: {e}")
    return result


def _redact_rpc_url(url: str) -> str:
    """Strip the API key from an RPC URL for safe logging."""
    try:
        from urllib.parse import urlparse
        return urlparse(url or "").hostname or "unknown"
    except Exception:
        return "unknown"


# ── Watcher: paginated scan within free-tier 10-block window ──────────

def get_treasury_transfers_in_range(from_block: int, to_block: int) -> list:
    """Fetch USDT-BEP-20 Transfer events to the treasury between two blocks
    via eth_getLogs.

    The caller MUST ensure to_block - from_block < GETLOGS_WINDOW_BLOCKS
    or the request will fail under Alchemy free-tier limits. Use
    scan_treasury_transfers() for paginated scanning over wider ranges.

    Returns a list of dicts:
        {"tx_hash":..., "from_address":..., "to_address":...,
         "amount_usdt":..., "block_number":...}
    """
    from web3 import Web3
    w3 = _get_web3_bsc()

    # Pad treasury address to 32 bytes for the indexed topic match.
    # Transfer event signature is:
    #   Transfer(address indexed from, address indexed to, uint256 value)
    # so topic[0] = TRANSFER_EVENT_TOPIC, topic[2] = padded `to` address.
    treasury_padded = "0x" + TREASURY_ADDRESS_BSC[2:].lower().zfill(64)

    logs = w3.eth.get_logs({
        "fromBlock": from_block,
        "toBlock": to_block,
        "address": Web3.to_checksum_address(USDT_CONTRACT_BSC),
        "topics": [TRANSFER_EVENT_TOPIC, None, treasury_padded],
    })

    results = []
    for log in logs:
        try:
            topics = log.get("topics", [])
            if len(topics) < 3:
                continue
            from_topic = topics[1].hex() if hasattr(topics[1], "hex") else str(topics[1])
            from_addr = "0x" + from_topic[-40:].lower()
            data = log.get("data", "0x0")
            data_hex = data.hex() if hasattr(data, "hex") else str(data)
            raw_amount = int(data_hex, 16) if data_hex.startswith("0x") else int(data_hex, 16)
            tx_hash = log.get("transactionHash")
            tx_hash_str = tx_hash.hex() if hasattr(tx_hash, "hex") else str(tx_hash)
            if not tx_hash_str.startswith("0x"):
                tx_hash_str = "0x" + tx_hash_str
            results.append({
                "tx_hash":      tx_hash_str,
                "from_address": from_addr,
                "to_address":   TREASURY_ADDRESS_BSC,
                "amount_usdt":  raw_to_usdt_bsc(raw_amount),
                "block_number": log.get("blockNumber"),
            })
        except Exception as e:
            logger.warning(f"Skipping malformed log: {e}")
            continue
    return results


def scan_treasury_transfers(scan_floor_block: int) -> list:
    """Paginated scan of all treasury USDT Transfer events from
    `scan_floor_block` up to the latest block, in GETLOGS_WINDOW_BLOCKS
    chunks. Caps total range at MAX_SCAN_BLOCKS_PER_RUN.

    The watcher cron handler computes scan_floor_block by:
      - Querying the oldest still-pending WalletConnectPaymentOrder
      - Estimating its block via (now - created_at).total_seconds() / 3
      - Passing that block as scan_floor_block

    With no pending orders, caller passes (latest - GETLOGS_WINDOW_BLOCKS)
    so we still do a minimal scan in case of late-arriving payments.
    """
    try:
        w3 = _get_web3_bsc()
        latest = w3.eth.block_number
    except Exception as e:
        logger.error(f"scan_treasury_transfers: cannot read latest block: {e}")
        return []

    # Bound the floor to MAX_SCAN_BLOCKS_PER_RUN behind the head — protects
    # against cursor drift after extended outages.
    earliest_allowed = max(latest - MAX_SCAN_BLOCKS_PER_RUN, 0)
    floor = max(scan_floor_block, earliest_allowed)
    if floor > latest:
        return []

    all_transfers = []
    cursor = floor
    while cursor <= latest:
        chunk_to = min(cursor + GETLOGS_WINDOW_BLOCKS - 1, latest)
        try:
            chunk_transfers = get_treasury_transfers_in_range(cursor, chunk_to)
            all_transfers.extend(chunk_transfers)
        except Exception as e:
            logger.error(f"scan_treasury_transfers chunk {cursor}-{chunk_to} failed: {e}")
            # Keep going with next chunk — partial results better than none
        cursor = chunk_to + 1
    return all_transfers


def estimate_scan_floor_block(latest_block: int, oldest_pending_age_seconds: int | None) -> int:
    """Compute the block from which the next watcher run should start.

    If there's a pending order older than X seconds, scan back far enough
    to cover X seconds of chain history, plus a small safety margin.

    With no pending orders, scan only the most recent GETLOGS_WINDOW_BLOCKS
    — handles the edge case of payment arriving between order expiry and
    a new order creation.
    """
    if oldest_pending_age_seconds is None:
        return max(latest_block - GETLOGS_WINDOW_BLOCKS, 0)
    safety_seconds = oldest_pending_age_seconds + 30  # +1 cron interval safety
    blocks_back = int(safety_seconds / BSC_AVG_BLOCK_SECONDS) + 5  # +5 block buffer
    return max(latest_block - blocks_back, 0)


# ── Order matching ────────────────────────────────────────────────────

# Maximum re-rolls when generate_unique_amount produces a colliding amount.
# At 50 concurrent pending orders on the same tier (50/101 ≈ 50% slot
# fill), 5 re-rolls leaves residual collision probability ≈ 3%; member
# sees a "try again" message and retries. At realistic load (≤10
# concurrent) collisions are <1% even on the first roll. See session
# notes 6 May 2026.
MAX_COLLISION_REROLLS = 5


def create_payment_intent(db, user_id: int, product_type: str, product_key: str,
                          product_meta: dict | None = None):
    """Create a pending WalletConnectPaymentOrder for `product_key`.

    Returns the persisted order on success, or a dict with `error` key on
    a known failure mode:
      - {"error": "unknown_product"} — product_key not in PRODUCT_PRICES
      - {"error": "collision"} — re-roll limit hit, member should retry
      - {"error": "course_not_ready"} — course rail awaiting Uthena MRR
        content (per memory: "Course pages: awaiting Uthena MRR courses")

    Caller is responsible for HTTP-shaping the error.

    Lifecycle:
      1. Look up base price (strict — no silent fallback)
      2. Insert pending row with placeholder unique_amount, flush to get id
      3. Compute unique_amount from (user_id, order.id, ts) hash
      4. Attempt to set unique_amount; on IntegrityError (partial unique
         index collision in DB), rollback and re-roll. Up to 5 attempts.
      5. Commit and return the order
    """
    from sqlalchemy.exc import IntegrityError
    from app.database import WalletConnectPaymentOrder
    import json as _json

    # ── Refuse course activation until Uthena MRR rail lands ──
    # The price list has course_starter / course_advanced / course_elite
    # but no activation handler exists yet — accepting payment without
    # activation would take real money for nothing. Better to refuse
    # the intent than to fulfil into a void.
    if product_type == "course":
        logger.warning(
            f"create_payment_intent: refused course intent (user {user_id}, "
            f"key {product_key}) — course activation not yet implemented"
        )
        return {"error": "course_not_ready"}

    base_price = PRODUCT_PRICES.get(product_key)
    if base_price is None:
        logger.warning(
            f"create_payment_intent: unknown product_key={product_key} "
            f"(user {user_id})"
        )
        return {"error": "unknown_product"}

    meta_json = _json.dumps(product_meta) if product_meta else None
    expires_at = datetime.utcnow() + timedelta(minutes=ORDER_EXPIRY_MINUTES)

    # Insert with placeholder unique_amount (= base_price) so we have an
    # id to seed the hash. We'll update unique_amount in-place below
    # before commit, with the partial unique index enforcing uniqueness
    # at the DB level. Until that update, status='pending' but the row
    # is uncommitted so it doesn't conflict with anything.
    order = WalletConnectPaymentOrder(
        user_id=user_id,
        product_type=product_type,
        product_key=product_key,
        product_meta=meta_json,
        base_amount=base_price,
        unique_amount=base_price,  # placeholder, replaced below
        status="pending",
        expires_at=expires_at,
    )
    db.add(order)
    db.flush()  # get order.id

    for attempt in range(MAX_COLLISION_REROLLS):
        candidate = generate_unique_amount(base_price, user_id, order.id)
        order.unique_amount = candidate
        try:
            db.flush()
            # Success — partial unique index accepted the value
            db.commit()
            logger.info(
                f"create_payment_intent: order {order.id} "
                f"user={user_id} {product_type}/{product_key} "
                f"amount=${candidate} expires={expires_at.isoformat()}"
            )
            return order
        except IntegrityError as e:
            # Partial unique index rejected — another pending order
            # already holds this exact amount. Re-roll.
            db.rollback()
            # The rollback also rolled back our INSERT, so re-add the
            # order for the next attempt. SQLAlchemy detached the
            # instance on rollback; re-attach.
            db.add(order)
            db.flush()
            logger.info(
                f"create_payment_intent: collision attempt {attempt+1}/"
                f"{MAX_COLLISION_REROLLS} on amount {candidate} "
                f"(user {user_id}, order {order.id})"
            )
            # tiny sleep to nudge the time-based hash seed
            time.sleep(0.001)

    # All re-rolls collided. This means many concurrent pending orders
    # on the same tier — return a clean error so the member sees
    # "please try again in a moment" and retries.
    db.rollback()
    logger.warning(
        f"create_payment_intent: collision limit ({MAX_COLLISION_REROLLS}) "
        f"hit for user {user_id} on {product_key} — high concurrency"
    )
    return {"error": "collision"}


def expire_stale_orders(db) -> int:
    """Sweep pending orders past expires_at → status='expired'.

    Run inline by the cron handler. Returns count of orders expired.
    Important: this MUST run before scanning, so an arriving payment
    that lands after expiry doesn't match against a still-pending row.
    """
    from app.database import WalletConnectPaymentOrder
    now = datetime.utcnow()
    stale = db.query(WalletConnectPaymentOrder).filter(
        WalletConnectPaymentOrder.status == "pending",
        WalletConnectPaymentOrder.expires_at <= now,
    ).all()
    for o in stale:
        o.status = "expired"
    if stale:
        db.commit()
        logger.info(f"expire_stale_orders: marked {len(stale)} orders expired")
    return len(stale)


def match_incoming_transfer(db, transfer: dict):
    """Try to match a recent on-chain Transfer to a pending order.

    Returns the matched + confirmed WalletConnectPaymentOrder, or None
    if no match (orphan — caller persists to OnchainOrphanTransfer).

    Match strategy: pending order with status='pending', expires_at >
    now, unique_amount == transfer['amount_usdt'] (Decimal exact equality
    at 6dp). Single match expected because of the partial unique index;
    if multiple ever surface (shouldn't be possible) we pick the oldest
    and log a warning.

    Idempotency: if any row already has this tx_hash, return None
    immediately. This handles the case where the cron sees a payment,
    processes it, then sees it again on the next overlapping scan.

    Caller (cron handler) is responsible for the post-match work:
    inserting the Payment row and calling _nowpayments_activate_product.
    Mirrors the NOWPayments IPN pattern — keeps activation logic in
    main.py with the rest of the activation handlers.
    """
    from app.database import WalletConnectPaymentOrder

    tx_hash = transfer.get("tx_hash")
    if not tx_hash:
        logger.warning(f"match_incoming_transfer: transfer missing tx_hash: {transfer}")
        return None

    # Idempotency check — has this tx_hash been processed already?
    existing = db.query(WalletConnectPaymentOrder).filter(
        WalletConnectPaymentOrder.tx_hash == tx_hash
    ).first()
    if existing:
        # Already handled — silent no-op. Normal during overlapping scans.
        return None

    amount = transfer.get("amount_usdt")
    if amount is None:
        logger.warning(f"match_incoming_transfer: transfer missing amount: {transfer}")
        return None

    # Find a pending, unexpired order with this exact unique_amount.
    # Numeric(18,6) comparison — Decimal exact equality.
    now = datetime.utcnow()
    candidates = db.query(WalletConnectPaymentOrder).filter(
        WalletConnectPaymentOrder.status == "pending",
        WalletConnectPaymentOrder.unique_amount == amount,
        WalletConnectPaymentOrder.expires_at > now,
    ).order_by(WalletConnectPaymentOrder.created_at.asc()).all()

    if not candidates:
        # No match — caller will persist as orphan
        return None

    if len(candidates) > 1:
        # Should be impossible due to partial unique index, but log loudly
        # so we know if it ever happens (e.g. index dropped accidentally)
        logger.error(
            f"match_incoming_transfer: {len(candidates)} pending orders "
            f"share unique_amount={amount} — DB partial index missing? "
            f"Picking oldest: order ids={[c.id for c in candidates]}"
        )

    order = candidates[0]
    order.status = "confirmed"
    order.tx_hash = tx_hash
    order.from_address = (transfer.get("from_address") or "").lower() or None
    order.block_number = transfer.get("block_number")
    order.confirmed_at = now
    db.flush()

    logger.info(
        f"match_incoming_transfer: MATCHED order {order.id} "
        f"user={order.user_id} {order.product_type}/{order.product_key} "
        f"amount=${amount} tx={tx_hash[:10]}..."
    )
    return order


def is_likely_rounded_amount(amount) -> bool:
    """Flag transfer amounts that match a known base price exactly.

    A transfer for $20.00 (vs the unique $19.97 we asked for) almost
    always means the member rounded manually or pasted the sticker
    price. Flagging these makes admin orphan triage instant.
    """
    try:
        amt = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
    except Exception:
        return False
    return any(amt == base.quantize(Decimal("0.01")) for base in PRODUCT_PRICES.values())
