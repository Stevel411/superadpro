"""
AdvantageLife — multi-chain USDT join verification (10 Jul 2026).

Verifies that a submitted transaction hash is a successful USDT transfer of
EXACTLY the join price to the company treasury address on the selected
network. Four networks; three are EVM (one generic verifier, per-chain
constants), TRON is its own path via the public TronGrid API.

Design rules:
- Raw JSON-RPC over `requests` with public-endpoint fallbacks — no web3
  object dependence, identical parsing everywhere (topics/data arrive as
  hex strings).
- Decimals differ per chain and MUST come from the table: BSC USDT = 18,
  Ethereum/Polygon/TRON USDT = 6. A hardcoded 18 would reject every valid
  Ethereum payment.
- Returns (ok: bool, error: str|None, retryable: bool). `retryable=True`
  means "chain hasn't caught up yet — ask the buyer to retry", never a
  terminal rejection.
"""
import os
import json
import requests

TRANSFER_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

NETWORKS = {
    "bsc": {
        "label": "USDT · BNB Smart Chain (BEP-20)",
        "kind": "evm",
        "env": "AL_COMPANY_USDT_ADDRESS",          # kept for back-compat (pack company routing reads it)
        "contract": "0x55d398326f99059ff775485246999027b3197955",
        "decimals": 18,
        "min_conf": 5,                              # ~15s
        "hash_re": r"^0x[a-fA-F0-9]{64}$",
        "warning": 'BNB SMART CHAIN ONLY — USDT sent on any other network is lost. Addresses start with "0x".',
        "rpcs": [],                                 # BSC_RPC_URL prepended at runtime
        "public_rpcs": [
            "https://bsc-dataseed.binance.org",
            "https://bsc-dataseed1.defibit.io",
            "https://rpc.ankr.com/bsc",
        ],
    },
    "eth": {
        "label": "USDT · Ethereum (ERC-20)",
        "kind": "evm",
        "env": "AL_TREASURY_USDT_ETH",
        "contract": "0xdac17f958d2ee523a2206206994597c13d831ec7",
        "decimals": 6,
        "min_conf": 3,                              # ~36s
        "hash_re": r"^0x[a-fA-F0-9]{64}$",
        "warning": 'ETHEREUM MAINNET ONLY — USDT sent on any other network is lost. Note: Ethereum gas fees apply.',
        "rpcs": [],
        "public_rpcs": [
            "https://ethereum-rpc.publicnode.com",
            "https://eth.llamarpc.com",
            "https://rpc.ankr.com/eth",
        ],
    },
    "polygon": {
        "label": "USDT · Polygon",
        "kind": "evm",
        "env": "AL_TREASURY_USDT_POLYGON",
        "contract": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
        "decimals": 6,
        "min_conf": 30,                             # ~1 min; Polygon reorgs
        "hash_re": r"^0x[a-fA-F0-9]{64}$",
        "warning": 'POLYGON ONLY — USDT sent on any other network is lost. Addresses start with "0x".',
        "rpcs": [],
        "public_rpcs": [
            "https://polygon-rpc.com",
            "https://polygon-bor-rpc.publicnode.com",
            "https://rpc.ankr.com/polygon",
        ],
    },
    "tron": {
        "label": "USDT · TRON (TRC-20)",
        "kind": "tron",
        "env": "AL_TREASURY_USDT_TRON",
        "contract_hex": "a614f803b6fd780986a42c78ec9c7f77e6ded13c",  # TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
        "decimals": 6,
        "min_conf": 20,                             # ~60s
        "hash_re": r"^(0x)?[a-fA-F0-9]{64}$",
        "warning": 'TRON ONLY — USDT sent on any other network is lost. TRON addresses start with "T".',
        "api": "https://api.trongrid.io",
    },
}

_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def _base58_to_evm_hex(addr: str):
    """TRON base58check (T...) -> 20-byte hex payload (no 41 prefix)."""
    n = 0
    for ch in addr:
        n = n * 58 + _B58.index(ch)
    raw = n.to_bytes(25, "big")     # 0x41 + 20 bytes + 4 checksum
    if raw[0] != 0x41:
        raise ValueError("not a TRON address")
    return raw[1:21].hex()


def _rpc(urls, method, params, timeout=8):
    last = None
    for u in urls:
        try:
            r = requests.post(u, json={"jsonrpc": "2.0", "method": method,
                                       "params": params, "id": 1}, timeout=timeout)
            j = r.json()
            if "result" in j:
                return j["result"]
            last = j.get("error")
        except Exception as e:
            last = str(e)
    raise RuntimeError(f"all RPCs failed: {last}")


def _verify_evm(net: dict, tx_hash: str, treasury: str, expected: float):
    urls = list(net["rpcs"]) + list(net["public_rpcs"])
    try:
        receipt = _rpc(urls, "eth_getTransactionReceipt", [tx_hash])
    except Exception:
        return False, "Couldn't reach the blockchain — try again in a minute", True
    if receipt is None:
        return False, "Transaction not found yet — give it a moment and try again", True
    if int(receipt.get("status", "0x0"), 16) != 1:
        return False, "That transaction failed on-chain", False
    if (receipt.get("to") or "").lower() != net["contract"]:
        return False, "That transaction isn't a USDT transfer on this network", False
    paid = None
    for log in receipt.get("logs", []):
        topics = log.get("topics") or []
        if len(topics) < 3 or topics[0].lower() != TRANSFER_SIG:
            continue
        if (log.get("address") or "").lower() != net["contract"]:
            continue
        recipient = "0x" + topics[2][-40:].lower()
        if recipient != treasury.lower():
            continue
        paid = int(log.get("data", "0x0"), 16) / 10 ** net["decimals"]
        break
    if paid is None:
        return False, "That transaction doesn't pay the AdvantageLife treasury address", False
    if abs(paid - expected) > 0.01:
        return False, f"Amount mismatch — the transfer is ${paid:.2f}, the membership is ${expected:.2f} exactly", False
    try:
        latest = int(_rpc(urls, "eth_blockNumber", []), 16)
        confs = latest - int(receipt.get("blockNumber", "0x0"), 16)
        if confs < net["min_conf"]:
            return False, "Confirming on-chain — a few more seconds", True
    except Exception:
        pass  # confirmation check is best-effort; the receipt itself is authoritative
    return True, None, False


def _verify_tron(net: dict, tx_hash: str, treasury: str, expected: float):
    txid = tx_hash[2:] if tx_hash.startswith("0x") else tx_hash
    try:
        treasury_hex = _base58_to_evm_hex(treasury)
    except Exception:
        return False, "Treasury TRON address is misconfigured", False
    try:
        r = requests.post(f"{net['api']}/wallet/gettransactioninfobyid",
                          json={"value": txid}, timeout=10)
        info = r.json()
    except Exception:
        return False, "Couldn't reach the TRON network — try again in a minute", True
    if not info or "id" not in info:
        return False, "Transaction not found yet — give it a moment and try again", True
    if (info.get("receipt") or {}).get("result") not in (None, "SUCCESS"):
        return False, "That transaction failed on-chain", False
    paid = None
    for log in info.get("log", []):
        topics = log.get("topics") or []
        if len(topics) < 3:
            continue
        t0 = topics[0] if topics[0].startswith("0x") else "0x" + topics[0]
        if t0.lower() != TRANSFER_SIG:
            continue
        if (log.get("address") or "").lower().lstrip("0x") not in (net["contract_hex"],):
            continue
        recipient = topics[2][-40:].lower()
        if recipient != treasury_hex:
            continue
        paid = int(log.get("data", "0"), 16) / 10 ** net["decimals"]
        break
    if paid is None:
        return False, "That transaction doesn't pay the AdvantageLife treasury address", False
    if abs(paid - expected) > 0.01:
        return False, f"Amount mismatch — the transfer is ${paid:.2f}, the membership is ${expected:.2f} exactly", False
    try:
        now = requests.post(f"{net['api']}/wallet/getnowblock", json={}, timeout=8).json()
        latest = ((now.get("block_header") or {}).get("raw_data") or {}).get("number", 0)
        confs = latest - info.get("blockNumber", latest)
        if confs < net["min_conf"]:
            return False, "Confirming on-chain — a few more seconds", True
    except Exception:
        pass
    return True, None, False


def available_networks():
    """Networks with a treasury address configured, page-ready."""
    out = []
    for key, net in NETWORKS.items():
        addr = os.environ.get(net["env"], "").strip()
        if addr:
            out.append({"key": key, "label": net["label"], "address": addr,
                        "warning": net["warning"]})
    return out


def verify_join_tx(network: str, tx_hash: str, expected_usd: float):
    """(ok, error, retryable) for a join payment on the given network."""
    net = NETWORKS.get(network)
    if not net:
        return False, "Unknown network", False
    treasury = os.environ.get(net["env"], "").strip()
    if not treasury:
        return False, "That network isn't available yet", False
    import re as _re
    if not _re.match(net["hash_re"], tx_hash or ""):
        return False, "That doesn't look like a valid transaction hash for this network", False
    if net["kind"] == "evm":
        rpcs = []
        if network == "bsc":
            try:
                from .withdrawals import BSC_RPC_URL
                if BSC_RPC_URL:
                    rpcs.append(BSC_RPC_URL)
            except Exception:
                pass
        net = dict(net, rpcs=rpcs)
        return _verify_evm(net, tx_hash, treasury, expected_usd)
    return _verify_tron(net, tx_hash, treasury, expected_usd)
