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

from sqlalchemy import text

# Reuse BSC constants from the withdrawals module — single source of truth
# for treasury address, USDT contract, decimals, RPC URL.
from app.withdrawals import (
    TREASURY_ADDRESS_BSC,
    USDT_CONTRACT_BSC,
    USDT_DECIMALS_BSC,
    BSC_CHAIN_ID,
    BSC_RPC_URL,
    BSC_RPC_FALLBACKS,
    _get_web3_bsc,
    _build_web3_for_url,
    call_bsc_rpc_with_failover,
)

logger = logging.getLogger("superadpro.walletconnect")

# ── Configuration ─────────────────────────────────────────────────────
# Pending orders expire after 15 minutes (per Steve, 6 May 2026).
ORDER_EXPIRY_MINUTES = 60

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
    # Membership (Stream 01) — flat partner pricing 15 May 2026
    # Standard partner $20/mo or $200/yr. Founding partner uses the same
    # 'membership_partner' product_key — the locked price on the user
    # record overrides this default to charge $15/$150 instead. Legacy
    # 'basic'/'pro' keys retained for backward compatibility with cached
    # checkout pages but now resolve to the standard partner price.
    "membership_partner":         Decimal("20.00"),
    "membership_partner_annual":  Decimal("200.00"),
    # Monthly RENEWAL for an already-active member. Placeholder price only —
    # create_payment_intent overrides it with the member's locked price
    # (Founder $15) via membership_price_for_user, and the 'renew' in the key
    # routes the confirmation to the renewal engine (not activation). Monthly
    # only by design: annual pays the sponsor 10x up front at activation.
    "membership_renew":           Decimal("20.00"),
    # Legacy keys — both now resolve to standard partner price. They'll be
    # removed in a future cleanup sprint once no active flow references them.
    "membership_basic":           Decimal("20.00"),
    "membership_pro":             Decimal("20.00"),
    "membership_basic_annual":    Decimal("200.00"),
    "membership_pro_annual":      Decimal("200.00"),
    # Campaign Grid (Stream 02)
    # grid_0 = $10 Launchpad — the comp-plan entry rung. Purchasable by
    # FREE (non-member) users; tiers 1-8 still require active membership.
    # Confirmation tags the buyer membership_tier='launchpad' (can_earn
    # True, is_pro False) so they can refer/earn/withdraw without unlocking
    # tools or higher tiers. Split percentages live in grid.py, not here.
    "grid_0":   Decimal("10.00"),
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
    # Pay It Forward — fixed $20 voucher (Stream 01 sub-product)
    "pif_voucher":          Decimal("20.00"),
    # Pro upgrade — $15 difference between Basic ($20) and Pro ($35)
    "membership_pro_upgrade": Decimal("15.00"),
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

    # Pad treasury address to 32 bytes for the indexed topic match.
    # Transfer event signature is:
    #   Transfer(address indexed from, address indexed to, uint256 value)
    # so topic[0] = TRANSFER_EVENT_TOPIC, topic[2] = padded `to` address.
    treasury_padded = "0x" + TREASURY_ADDRESS_BSC[2:].lower().zfill(64)

    # Use the multi-RPC failover wrapper — eth_getLogs is the call most
    # likely to hit Alchemy free-tier rate limits, and historically the
    # one whose silent failures lost transfers (SAP-00205, 15 May 2026).
    # If primary 429s, the helper transparently retries against public
    # BSC dataseed endpoints.
    logs = call_bsc_rpc_with_failover(
        "eth.get_logs",
        {
            "fromBlock": from_block,
            "toBlock": to_block,
            "address": Web3.to_checksum_address(USDT_CONTRACT_BSC),
            "topics": [TRANSFER_EVENT_TOPIC, None, treasury_padded],
        },
    )

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
    `scan_floor_block` up to the latest block.

    Back-compat shim. Calls scan_treasury_transfers_with_cursor and
    returns only the transfers, discarding the safe-cursor value.
    New code should call scan_treasury_transfers_with_cursor directly.
    """
    transfers, _safe_cursor, _failed = scan_treasury_transfers_with_cursor(scan_floor_block)
    return transfers


def scan_treasury_transfers_with_cursor(scan_floor_block: int) -> tuple[list, int, list[tuple[int, int, str]]]:
    """Paginated scan of all treasury USDT Transfer events from
    `scan_floor_block` up to the latest block, in GETLOGS_WINDOW_BLOCKS
    chunks. Caps total range at MAX_SCAN_BLOCKS_PER_RUN.

    Returns: (transfers, safe_cursor, failed_chunks)
      transfers     — all successfully-fetched Transfer events. Each chunk
                      is queried against SCAN_REDUNDANCY providers in
                      parallel (default 3); transfers are unioned by
                      tx_hash so a single provider's index miss doesn't
                      lose a transfer (24 May 2026 fix — Matt incident).
      safe_cursor   — highest block we can safely advance the cursor to.
                      This is the last block of the LAST CONSECUTIVE
                      successful chunk from the floor. A chunk is
                      "successful" if AT LEAST ONE of the redundant
                      providers returned without error. If chunk N+1
                      fails on all providers, safe_cursor stops at the
                      end of chunk N regardless of how many chunks after
                      N+1 succeeded. Reason: cursor MUST NOT skip over a
                      failed chunk, or transfers in that range are
                      silently lost forever (this is the bug that lost
                      Christel's $14.54 at block 98459311 on 15 May 2026).
      failed_chunks — list of (from_block, to_block, error_msg) tuples
                      for chunks where ALL redundant providers errored.
                      Caller persists these to bsc_scan_failed_chunks
                      so they retry across cron lifetimes, not just within
                      one run.

    Caller (cron_scan_bsc_payments) persists safe_cursor as the new
    wc_scan_cursor — guaranteeing the next run re-scans any failed range.

    Bug-history-relevant constants:
      GETLOGS_WINDOW_BLOCKS = 10   (Alchemy free-tier eth_getLogs cap)
      MAX_SCAN_BLOCKS_PER_RUN = 1000 (catch-up cap after extended outages)
      SCAN_REDUNDANCY        = 3   (parallel providers per chunk, 24 May)
    """
    try:
        # Use failover wrapper — if Alchemy rate-limits the block_number
        # call, we fall through to public RPCs instead of bailing out
        # on the whole scan.
        latest = call_bsc_rpc_with_failover("eth.block_number")
    except Exception as e:
        logger.error(f"scan_treasury_transfers: cannot read latest block: {e}")
        # safe_cursor = -1 sentinel → caller must NOT advance the cursor
        return [], -1, []

    # Bound the floor to MAX_SCAN_BLOCKS_PER_RUN behind the head — protects
    # against cursor drift after extended outages.
    earliest_allowed = max(latest - MAX_SCAN_BLOCKS_PER_RUN, 0)
    floor = max(scan_floor_block, earliest_allowed)
    if floor > latest:
        # Nothing to scan — return floor-1 so caller leaves cursor where it is
        return [], floor - 1, []

    all_transfers: list = []
    failed_chunks: list[tuple[int, int, str]] = []  # (from, to, error_msg)
    # safe_cursor tracks the LAST CONSECUTIVE successful chunk's upper bound.
    # Initialised to floor-1 so a fully-failed first chunk leaves the cursor
    # exactly where it was (no advance), guaranteeing retry next run.
    safe_cursor = floor - 1
    first_failure_seen = False

    cursor = floor
    while cursor <= latest:
        chunk_to = min(cursor + GETLOGS_WINDOW_BLOCKS - 1, latest)
        # Use the redundant-provider scanner (24 May 2026) instead of the
        # single-provider failover. Critical difference: if ANY of N
        # providers has the transfer indexed, we see it — defends against
        # silent empty-result misses that lost Matt (user 374) on 24 May.
        chunk_transfers, providers_ok, last_err = get_treasury_transfers_in_range_redundant(
            cursor, chunk_to
        )
        if providers_ok > 0:
            all_transfers.extend(chunk_transfers)
            # Only advance safe_cursor through CONSECUTIVE successes.
            # After the first failure, later successes are still kept in
            # `all_transfers` (we process what we got), but safe_cursor
            # stays at the last pre-failure block so the failed range
            # is re-scanned next run.
            if not first_failure_seen:
                safe_cursor = chunk_to
        else:
            # All N providers failed for this chunk. Record for retry.
            err_msg = str(last_err) if last_err else "all providers returned empty/errored"
            logger.error(
                f"scan_treasury_transfers chunk {cursor}-{chunk_to} failed on all "
                f"{SCAN_REDUNDANCY} providers: {err_msg}"
            )
            failed_chunks.append((cursor, chunk_to, err_msg))
            first_failure_seen = True
            # Keep going with next chunk — partial results better than none.
            # safe_cursor frozen at the pre-failure boundary; next cron
            # run re-scans the failed range AND everything after it (cheap
            # because match/orphan inserts are idempotent on tx_hash).
        cursor = chunk_to + 1

    return all_transfers, safe_cursor, failed_chunks


def get_scan_cursor(db) -> int | None:
    """Return the last successfully scanned BSC block, or None if unset.

    The cursor is persisted in the app_config table under key
    'wc_scan_cursor'. On a fresh install the row doesn't exist yet —
    caller treats that as "scan from latest - GETLOGS_WINDOW_BLOCKS".
    """
    from .database import AppConfig
    row = db.query(AppConfig).filter(AppConfig.key == "wc_scan_cursor").first()
    if row is None or row.value is None:
        return None
    try:
        return int(row.value)
    except (TypeError, ValueError):
        logger.warning(f"get_scan_cursor: invalid value {row.value!r}, treating as unset")
        return None


def set_scan_cursor(db, block_number: int) -> None:
    """Persist the last successfully scanned BSC block.

    Idempotent upsert. Caller commits.
    """
    from .database import AppConfig
    row = db.query(AppConfig).filter(AppConfig.key == "wc_scan_cursor").first()
    if row is None:
        row = AppConfig(key="wc_scan_cursor", value=str(block_number))
        db.add(row)
    else:
        row.value = str(block_number)
        row.updated_at = datetime.utcnow()


def estimate_scan_floor_block(db, latest_block: int) -> int:
    """Compute the block from which the next watcher run should start.

    Strategy (changed 7 May 2026 — see bug history below):
      1. If we have a persisted cursor, resume from there. Cursor is
         updated AFTER each successful scan, so we never re-scan the
         same blocks twice (idempotency in match_incoming_transfer
         handles overlapping anyway, but skipping is faster).
      2. If no cursor (fresh install or first run), start from
         (latest - GETLOGS_WINDOW_BLOCKS) — i.e. recent only. Sets
         the cursor on the next successful scan.
      3. Cap how far back we go at MAX_SCAN_BLOCKS_PER_RUN to protect
         against extended outages causing a giant catch-up scan.
         Anything beyond the cap is genuine data loss territory and
         needs manual reconciliation, not an auto-replay.

    Bug history: Before 7 May 2026 this function recomputed the floor
    each cron run from "oldest still-pending order's age". When the
    oldest order expired (15 min cap at the time), it fell to a 10-block
    recent-only scan. Result: payments arriving after order expiry —
    e.g. user took >15 min to confirm in MetaMask — were invisible to
    the scanner because the recent-window had already moved past their
    block. They never landed in OnchainOrphanTransfer either, because
    the scanner literally never saw them.

    Caught in 7 May 2026 smoke test: $20.39 from test3 confirmed at
    block 96870933 but scanner never picked it up — order had expired.
    Cursor-based scanning fixes this: the cursor advances regardless
    of order state, so late-arriving payments still get captured (as
    orphans if no matching pending order exists).
    """
    cursor = get_scan_cursor(db)
    if cursor is None:
        # No cursor yet — scan recent only, set cursor on success.
        proposed_floor = max(latest_block - GETLOGS_WINDOW_BLOCKS, 0)
    else:
        # Resume from one past the last scanned block.
        proposed_floor = cursor + 1

    # Cap how far back we'll go in a single run.
    earliest_allowed = max(latest_block - MAX_SCAN_BLOCKS_PER_RUN, 0)
    return max(proposed_floor, earliest_allowed)


# ── Redundant-provider scanning (added 24 May 2026) ────────────────────
#
# Problem: a single eth_getLogs call against ONE BSC RPC can return an
# empty result successfully — the call exits without error, but the
# provider's log index didn't have the transfer indexed yet (lag) or
# was missing it entirely (provider bug). The scanner then advances
# its cursor past the block, never re-checks, and the transfer is lost.
#
# This is what happened to Matt (user 374) on 24 May 2026: block 100151692
# contained his $14.91 USDT transfer to the treasury, but the chunk
# containing it returned `[]` from whatever RPC the scanner happened to
# hit, even though `eth_getTransactionReceipt(matt_tx_hash)` worked fine
# on every provider when we tested after the fact. Single-provider trust
# is broken for log queries.
#
# Solution: query N providers concurrently and union the results. If any
# single provider has the transfer indexed, we see it. The cost is a
# small fan-out per chunk (3x) which is well within free-tier budgets
# since we're issuing 100 chunks per run at most.

# Number of providers to query in parallel per chunk. 3 chosen as a
# balance between coverage (any 1 of 3 catching is robust) and budget
# (3x more requests). Tune via env BSC_SCAN_REDUNDANCY if needed.
SCAN_REDUNDANCY = max(1, int(os.environ.get("BSC_SCAN_REDUNDANCY", "3")))


def _get_treasury_transfers_single_provider(url: str, from_block: int, to_block: int):
    """Single-provider eth_getLogs call. Used by the redundant fan-out.

    Returns the normalised list of transfer dicts, or raises on any error.
    Does NOT use failover — caller does that explicitly across providers.
    """
    from web3 import Web3
    treasury_padded = "0x" + TREASURY_ADDRESS_BSC[2:].lower().zfill(64)
    w3 = _build_web3_for_url(url)
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
            raw_amount = int(data_hex, 16)
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
            logger.warning(f"Skipping malformed log from {url}: {e}")
            continue
    return results


def get_treasury_transfers_in_range_redundant(from_block: int, to_block: int):
    """Query SCAN_REDUNDANCY providers concurrently for treasury transfers
    in [from_block, to_block]. Union the results by tx_hash.

    Returns (transfers, providers_succeeded, last_error). transfers is
    deduped by tx_hash. providers_succeeded counts how many of the N
    providers returned a non-error result (>=1 required for chunk success).
    last_error captures the most recent exception when ALL providers fail
    — used by callers to record into bsc_scan_failed_chunks.

    Why parallel: a single sequential failover takes up to N * timeout
    seconds in the worst case (all providers slow/down). Parallel fan-out
    bounds wall time at max(per-provider-timeout) ≈ 15s.

    Why union by tx_hash: if 2 of 3 providers return the same tx, dedup.
    If 1 of 3 has a transfer the others miss (the silent-index-miss case
    this exists to defend against), we still see it.
    """
    import concurrent.futures as cf

    # Build candidate URL list: primary first, then fallbacks in order
    # (most-reliable first per BSC_RPC_FALLBACKS ordering). Slice to
    # SCAN_REDUNDANCY to bound fan-out.
    candidates = [BSC_RPC_URL] + [u for u in BSC_RPC_FALLBACKS if u != BSC_RPC_URL]
    candidates = candidates[:SCAN_REDUNDANCY]

    if not candidates:
        # Defensive: no fallbacks configured at all, single-shot
        try:
            transfers = _get_treasury_transfers_single_provider(BSC_RPC_URL, from_block, to_block)
            return transfers, 1, None
        except Exception as e:
            return [], 0, e

    last_error = None
    succeeded = 0
    seen: dict[str, dict] = {}

    with cf.ThreadPoolExecutor(max_workers=len(candidates)) as pool:
        future_to_url = {
            pool.submit(_get_treasury_transfers_single_provider, url, from_block, to_block): url
            for url in candidates
        }
        for fut in cf.as_completed(future_to_url, timeout=30):
            url = future_to_url[fut]
            try:
                transfers = fut.result()
                succeeded += 1
                for tx in transfers:
                    tx_hash = tx.get("tx_hash")
                    if tx_hash and tx_hash not in seen:
                        seen[tx_hash] = tx
            except Exception as e:
                last_error = e
                logger.debug(f"Redundant scan: {url} failed for {from_block}-{to_block}: {e}")

    return list(seen.values()), succeeded, last_error


# ── Failed-chunk persistence (added 24 May 2026) ───────────────────────
#
# When a chunk fails (ALL redundant providers errored), persist it so
# subsequent cron runs retry it across runs — not just the current run.
# Without this, an outage spanning a single chunk's lifetime would lose
# the block range permanently once the cursor advanced past.

# Escalation threshold — after this many consecutive failures, fire an
# email alert. ~5 min of 30s-interval retries.
ESCALATE_AT_ATTEMPTS = 10

# Give-up threshold — after this many failures, stop retrying and mark
# the chunk 'abandoned'. ~50 min of retries. At this point human
# intervention is needed (paid RPC, or known long outage).
GIVE_UP_AT_ATTEMPTS = 100


def record_failed_chunk(db, from_block: int, to_block: int, error_msg: str) -> dict:
    """Upsert a failed-chunk record. On insert: attempt_count=1. On
    conflict: increment attempt_count and update last_error.

    Returns a dict summarising the upsert outcome:
      { 'attempt_count': int, 'status': str, 'should_alert': bool,
        'should_abandon': bool, 'first_seen_at': datetime }
    """
    # Use ON CONFLICT to handle the race between concurrent cron replicas.
    truncated_err = (error_msg or "")[:2000]  # bound text length
    now = datetime.utcnow()

    row = db.execute(text("""
        INSERT INTO bsc_scan_failed_chunks
            (from_block, to_block, attempt_count, last_error,
             status, first_seen_at, last_attempt_at)
        VALUES
            (:fb, :tb, 1, :err, 'pending', :now, :now)
        ON CONFLICT (from_block, to_block)
        DO UPDATE SET
            attempt_count = bsc_scan_failed_chunks.attempt_count + 1,
            last_error = EXCLUDED.last_error,
            last_attempt_at = EXCLUDED.last_attempt_at
        RETURNING attempt_count, status, first_seen_at, alerted_at
    """), {
        "fb": from_block, "tb": to_block,
        "err": truncated_err, "now": now,
    }).fetchone()

    if not row:
        return {"attempt_count": 0, "status": "unknown",
                "should_alert": False, "should_abandon": False,
                "first_seen_at": now}

    attempt_count = row.attempt_count
    status = row.status
    first_seen_at = row.first_seen_at
    alerted_at = row.alerted_at

    # Escalation decisions. should_alert is True only if we just CROSSED
    # the threshold this run AND haven't already alerted — prevents
    # alert spam on every subsequent failure.
    should_alert = (
        attempt_count >= ESCALATE_AT_ATTEMPTS
        and attempt_count < GIVE_UP_AT_ATTEMPTS
        and alerted_at is None
    )
    should_abandon = attempt_count >= GIVE_UP_AT_ATTEMPTS and status != "abandoned"

    return {
        "attempt_count": attempt_count,
        "status": status,
        "should_alert": should_alert,
        "should_abandon": should_abandon,
        "first_seen_at": first_seen_at,
    }


def mark_chunk_resolved(db, from_block: int, to_block: int) -> int:
    """Mark a failed chunk as resolved (succeeded on retry). Returns
    number of rows updated (0 or 1). Idempotent."""
    result = db.execute(text("""
        UPDATE bsc_scan_failed_chunks
        SET status = 'resolved', resolved_at = :now
        WHERE from_block = :fb AND to_block = :tb AND status = 'pending'
    """), {"fb": from_block, "tb": to_block, "now": datetime.utcnow()})
    return result.rowcount


def mark_chunk_abandoned(db, from_block: int, to_block: int) -> int:
    """Mark a failed chunk as abandoned. Returns rows updated."""
    result = db.execute(text("""
        UPDATE bsc_scan_failed_chunks
        SET status = 'abandoned', resolved_at = :now
        WHERE from_block = :fb AND to_block = :tb AND status = 'pending'
    """), {"fb": from_block, "tb": to_block, "now": datetime.utcnow()})
    return result.rowcount


def mark_chunk_alerted(db, from_block: int, to_block: int) -> int:
    """Mark that we've fired an alert for this chunk. Idempotent."""
    result = db.execute(text("""
        UPDATE bsc_scan_failed_chunks
        SET alerted_at = :now
        WHERE from_block = :fb AND to_block = :tb AND alerted_at IS NULL
    """), {"fb": from_block, "tb": to_block, "now": datetime.utcnow()})
    return result.rowcount


def get_pending_failed_chunks(db, limit: int = 200) -> list[tuple[int, int]]:
    """Return up to `limit` pending failed chunks for retry. Ordered
    oldest-first so long-stuck ranges get priority. Capped to keep cron
    run-time bounded."""
    rows = db.execute(text("""
        SELECT from_block, to_block FROM bsc_scan_failed_chunks
        WHERE status = 'pending'
        ORDER BY first_seen_at ASC
        LIMIT :lim
    """), {"lim": limit}).fetchall()
    return [(r.from_block, r.to_block) for r in rows]


def cleanup_failed_chunks(db, keep_days: int = 7, batch: int = 5000) -> int:
    """Delete resolved/abandoned failed-chunk rows older than keep_days.

    Retention fix (2 Jul 2026): rows were only ever transitioned
    pending → resolved/abandoned, never deleted, so the table grew to
    367k rows / 116 MB — 67% of the entire database — inflating every
    daily backup with it. Terminal-status rows have zero operational
    value after a short forensic window: 'resolved' means the range was
    successfully rescanned; 'abandoned' ranges are alert-covered and
    recoverable from chain at any time by block number.

    Bounded to `batch` rows per call so it can sit on the 30s scanner
    tick: drains a large backlog in minutes, then no-ops (index on
    status makes the empty case a cheap scan). Pending rows are NEVER
    touched. Returns rows deleted; caller commits.
    """
    cutoff = datetime.utcnow() - timedelta(days=keep_days)
    res = db.execute(text("""
        DELETE FROM bsc_scan_failed_chunks
        WHERE id IN (
            SELECT id FROM bsc_scan_failed_chunks
            WHERE status IN ('resolved', 'abandoned')
              AND COALESCE(resolved_at, last_attempt_at, first_seen_at) < :cutoff
            LIMIT :batch
        )
    """), {"cutoff": cutoff, "batch": batch})
    return res.rowcount or 0


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

    # ── Grid (Campaign Tier) gates ────────────────────────────────────────
    # The /api/onchain/create-intent endpoint historically had no
    # membership-active gate and no sequential tier check — both were
    # only enforced at NOWPayments / process_tier_purchase time.
    # That meant a brand-new free user could create a BSC grid intent
    # for any tier in any order. Closed both gates here 26 May 2026.
    if product_type == "grid":
        try:
            tier_num = int(product_key.split("_")[1])
        except (ValueError, IndexError):
            logger.warning(f"create_payment_intent: bad grid product_key={product_key}")
            return {"error": "unknown_product"}

        from app.database import User as _User, Grid as _Grid
        buyer = db.query(_User).filter(_User.id == user_id).first()
        if not buyer:
            return {"error": "unknown_product"}
        # Gate 1: active membership required — EXCEPT tier 0 (Launchpad).
        # The $10 Launchpad (grid_0) is the comp-plan entry rung, open to
        # free (non-member) users. Tiers 1-8 still require full membership.
        if tier_num != 0 and not buyer.is_active:
            logger.info(
                f"create_payment_intent: refused grid intent for user {user_id} — "
                f"inactive membership (tier {tier_num})"
            )
            return {"error": "membership_required"}
        # Gate 2: sequential tier (Tier N requires owning Tier N-1)
        if tier_num > 1:
            prerequisite = tier_num - 1
            owns_prereq = db.query(_Grid).filter(
                _Grid.owner_id == user_id,
                _Grid.package_tier == prerequisite,
            ).first()
            if not owns_prereq:
                logger.info(
                    f"create_payment_intent: refused tier {tier_num} intent for "
                    f"user {user_id} — prerequisite tier {prerequisite} not owned"
                )
                return {"error": "tier_sequence_violation",
                        "required_tier": prerequisite}

    base_price = PRODUCT_PRICES.get(product_key)
    if base_price is None:
        logger.warning(
            f"create_payment_intent: unknown product_key={product_key} "
            f"(user {user_id})"
        )
        return {"error": "unknown_product"}

    # ── Founding partner price quote (15 May 2026) ──────────────────────
    # If this is a NEW membership activation (user not yet active) AND
    # founding spots remain, quote the founding price ($15 monthly / $150
    # annual) instead of the standard $20/$200. The spot itself is claimed
    # atomically at activation time in _activate_membership — this only
    # affects the AMOUNT the user is asked to send.
    #
    # The "race" between quote time and confirmation time is tolerable: if
    # spots fill while the user is paying, they still pay $15 but the
    # atomic claim refuses to grant founding status (since count >= 100 at
    # confirmation). In that edge case they'd be a standard partner who
    # paid $15 — they get the locked $15 price permanently as a goodwill
    # gesture (the locked price is set during the claim attempt regardless).
    # In practice this is vanishingly rare (15-min order expiry, 85 spots
    # remaining at launch).
    if product_type == "membership" and "renew" in product_key:
        # ── Renewal price (locked-price source of truth) ────────────────────
        # An already-active member renewing pays their locked price (Founder
        # $15) — overriding the catalog placeholder. Monthly only; the 'renew'
        # key routes the confirmation to the renewal engine, not activation.
        try:
            from app.database import User as _User
            from app.payment import membership_price_for_user
            buyer = db.query(_User).filter(_User.id == user_id).first()
            base_price = membership_price_for_user(buyer, "monthly")
            logger.info(
                f"Renewal price ${base_price} quoted to user {user_id} ({product_key})"
            )
        except Exception as e:
            logger.error(
                f"Renewal price resolve failed for user {user_id}: {e} — "
                f"using catalog price ${base_price}"
            )
    elif product_type == "membership":
        try:
            from app.database import User as _User
            buyer = db.query(_User).filter(_User.id == user_id).first()
            if buyer and not buyer.is_active:
                founding_count = db.execute(text(
                    "SELECT COUNT(*) FROM users WHERE is_founding_member = TRUE"
                )).scalar() or 0
                if founding_count < 100:
                    is_annual_key = product_key.endswith("_annual")
                    base_price = Decimal("150.00") if is_annual_key else Decimal("15.00")
                    logger.info(
                        f"Founding price quoted to user {user_id}: ${base_price} "
                        f"(spot #{founding_count + 1} reservable, "
                        f"{100 - founding_count} remaining)"
                    )
        except Exception as e:
            # Defensive: if anything goes wrong with the founding-price
            # check, fall through to standard pricing. Better to charge
            # $20 than to fail the intent entirely.
            logger.error(
                f"Founding price check failed for user {user_id}: {e} — "
                f"using standard pricing"
            )

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


# ── Stuck-order reconciliation (added 24 May 2026) ─────────────────────
#
# Defensive backstop for pending orders that should have been matched by
# the main scan but weren't — typically because every redundant provider
# returned an empty result for the relevant chunk (the rare residual
# failure mode after we added redundant scanning).
#
# For each pending order older than RECONCILE_MIN_AGE_SECONDS, the
# reconciler scans a tight recent-block window with the redundant scanner
# and tries to match.

# Don't reconcile orders younger than 2 min — give the main scan time
# to catch them in its normal flow first.
RECONCILE_MIN_AGE_SECONDS = 120

# Look-back window for each pending order's reconciliation scan.
# Bounded so a single cron run doesn't fan out unboundedly if many
# pending orders accumulate. ~10 min of chain time covers typical
# wallet-confirmation latency comfortably.
RECONCILE_BLOCK_WINDOW = 200

# Maximum number of pending orders to reconcile per cron run. Bounds
# wall-clock time per run; remaining orders get picked up on subsequent
# cron ticks (30s interval).
RECONCILE_MAX_ORDERS_PER_RUN = 5


def reconcile_stuck_orders(db, latest_block: int) -> dict:
    """Scan recent blocks specifically for pending orders that the main
    scan didn't pick up. Returns a stats dict for logging.

    For each candidate order:
      1. Compute a scan range: [latest - RECONCILE_BLOCK_WINDOW, latest]
      2. Run a redundant scan against that range
      3. Filter results by unique_amount == order.unique_amount
      4. If found, hand off to match_incoming_transfer (same code path
         as the main loop) — guarantees one source of truth for matching

    Returns: {
        'orders_checked': int,    # how many pending orders we evaluated
        'transfers_found': int,   # how many matching transfers we returned
        'transfers': list,        # the transfers to be processed by caller
    }

    Why caller-processes: keeping match + Payment row + activate in one
    place (the cron handler) avoids the same transfer being processed
    twice if the main scan ALSO sees it. The cron handler's existing
    idempotency (tx_hash uniqueness in match_incoming_transfer + orphan
    table) handles dedup naturally.
    """
    from app.database import WalletConnectPaymentOrder

    stats = {"orders_checked": 0, "transfers_found": 0, "transfers": []}

    cutoff = datetime.utcnow() - timedelta(seconds=RECONCILE_MIN_AGE_SECONDS)
    candidates = db.query(WalletConnectPaymentOrder).filter(
        WalletConnectPaymentOrder.status == "pending",
        WalletConnectPaymentOrder.created_at < cutoff,
        WalletConnectPaymentOrder.expires_at > datetime.utcnow(),
    ).order_by(WalletConnectPaymentOrder.created_at.asc()).limit(RECONCILE_MAX_ORDERS_PER_RUN).all()

    stats["orders_checked"] = len(candidates)
    if not candidates:
        return stats

    # We share ONE scan window across all candidates this run — they're
    # all "recent enough to still be pending", so they live in roughly
    # the same window of chain time. No point fanning out one scan per
    # order.
    from_block = max(latest_block - RECONCILE_BLOCK_WINDOW, 0)
    to_block = latest_block

    # Redundant-scan the window in GETLOGS_WINDOW_BLOCKS chunks (Alchemy
    # free-tier 10-block cap). Each chunk uses parallel providers, so
    # transfers any single provider's index is missing get caught by the
    # other providers.
    all_transfers: list = []
    cursor = from_block
    while cursor <= to_block:
        chunk_to = min(cursor + GETLOGS_WINDOW_BLOCKS - 1, to_block)
        chunk_txs, providers_ok, _err = get_treasury_transfers_in_range_redundant(cursor, chunk_to)
        if providers_ok > 0:
            all_transfers.extend(chunk_txs)
        cursor = chunk_to + 1

    if not all_transfers:
        return stats

    # Index by unique_amount for fast matching. Decimal comparison at 6dp
    # (matches what match_incoming_transfer does).
    amount_index: dict = {}
    for tx in all_transfers:
        try:
            amt = Decimal(str(tx.get("amount_usdt"))).quantize(Decimal("0.000001"))
            amount_index.setdefault(amt, []).append(tx)
        except Exception:
            continue

    for order in candidates:
        try:
            expected = Decimal(str(order.unique_amount)).quantize(Decimal("0.000001"))
            matches = amount_index.get(expected, [])
            if matches:
                # Hand off the first match. If multiple transfers happen
                # to share the unique amount in this window (vanishingly
                # rare because of the partial unique index on pending
                # orders), the OLDEST is picked — same semantics as
                # match_incoming_transfer's order_by(created_at).
                tx = matches[0]
                logger.warning(
                    f"reconcile_stuck_orders: RECOVERED order {order.id} "
                    f"user={order.user_id} amount=${expected} "
                    f"tx={tx.get('tx_hash','?')[:12]}... — main scan missed it "
                    f"(age {(datetime.utcnow() - order.created_at).total_seconds():.0f}s)"
                )
                stats["transfers"].append(tx)
                stats["transfers_found"] += 1
        except Exception as e:
            logger.error(f"reconcile_stuck_orders: per-order check failed for order {order.id}: {e}")

    return stats


# ── Late-match against recently-expired orders (added 14 Jun 2026) ─────────
#
# ROOT-CAUSE FIX for the expiry race. A member sends the exact unique amount,
# but BSC confirmation + Alchemy-free-tier scan lag pushes the on-chain match
# past the order's expiry window. expire_stale_orders() flips the order to
# 'expired' BEFORE the scanner sees the transfer, so match_incoming_transfer
# (which is pending-only, expires_at > now) misses it and the payment orphans —
# the member is left uncredited and needs a manual recovery. There was no code
# path that credited a payment arriving after expiry; this adds one, safely.
#
# Safe-by-construction: it only ever confirms an EXPIRED order when EXACTLY ONE
# order has that exact unique_amount within a bounded grace window. On any
# ambiguity it declines and leaves the transfer to orphan/manual attribution —
# it never guesses between members.

# How long after expiry an order can still be auto-claimed by its matching
# transfer. Covers BSC confirmation + scan lag + reasonable member delay while
# keeping the unique_amount collision surface among expired orders small
# (cent-level uniqueness is only DB-enforced among PENDING orders).
LATE_MATCH_GRACE_SECONDS = 48 * 3600  # 48h


def late_match_enabled() -> bool:
    """Gate for the late-match auto-credit. Default OFF so the behaviour is
    reviewed via the dry-run preview before it credits real money (the
    'dry-run before every financial mutation' rule). Set WC_LATE_MATCH_ENABLED
    = 'true' in Railway to activate."""
    return os.getenv("WC_LATE_MATCH_ENABLED", "false").strip().lower() == "true"


def find_late_expired_candidate(db, amount):
    """Read-only: return the single recently-expired order that an inbound
    `amount` unambiguously belongs to, or None. Shared by the live matcher and
    the dry-run preview so they can never diverge.

    Returns the order on a unique match; None if zero candidates or if the
    amount is ambiguous across multiple recently-expired orders.
    """
    from app.database import WalletConnectPaymentOrder
    if amount is None:
        return None
    grace_floor = datetime.utcnow() - timedelta(seconds=LATE_MATCH_GRACE_SECONDS)
    candidates = db.query(WalletConnectPaymentOrder).filter(
        WalletConnectPaymentOrder.status == "expired",
        WalletConnectPaymentOrder.unique_amount == amount,
        WalletConnectPaymentOrder.expires_at >= grace_floor,
    ).order_by(WalletConnectPaymentOrder.created_at.asc()).all()
    if len(candidates) != 1:
        if len(candidates) > 1:
            logger.warning(
                f"find_late_expired_candidate: AMBIGUOUS — {len(candidates)} "
                f"recently-expired orders share unique_amount={amount} "
                f"(ids={[c.id for c in candidates]}); declining auto-credit"
            )
        return None
    return candidates[0]


def match_late_expired_transfer(db, transfer: dict):
    """Match a transfer to a recently-expired order and confirm it.

    Called by the scanner ONLY when match_incoming_transfer found no live
    pending order, and only when late_match_enabled() is true. Confirms the
    order exactly like match_incoming_transfer (status/tx_hash/from_address/
    block_number/confirmed_at) and returns it, so the caller's existing
    activation path credits + fulfils the member with no special-casing.
    Returns None when there is no unambiguous expired match.
    """
    from app.database import WalletConnectPaymentOrder

    tx_hash = transfer.get("tx_hash")
    if not tx_hash:
        return None

    # Idempotency — never double-process a tx_hash already on any order.
    if db.query(WalletConnectPaymentOrder).filter(
        WalletConnectPaymentOrder.tx_hash == tx_hash
    ).first():
        return None

    order = find_late_expired_candidate(db, transfer.get("amount_usdt"))
    if order is None:
        return None

    now = datetime.utcnow()
    order.status = "confirmed"
    order.tx_hash = tx_hash
    order.from_address = (transfer.get("from_address") or "").lower() or None
    order.block_number = transfer.get("block_number")
    order.confirmed_at = now
    db.flush()

    logger.warning(
        f"match_late_expired_transfer: LATE-MATCHED expired order {order.id} "
        f"user={order.user_id} {order.product_type}/{order.product_key} "
        f"amount=${transfer.get('amount_usdt')} tx={tx_hash[:10]}... — order "
        f"expired {((now - order.expires_at).total_seconds()/60):.0f} min before "
        f"the payment was scanned; auto-crediting (single unambiguous candidate)"
    )
    return order
