"""
lookup_user — full state of a specific user account.

Unlike the aggregate tools, this returns identifying information for one
user. Intended for admin diagnostics ("why is user @success stuck?")
not analytics. Steve is the only one consuming the MCP server, so PII
in results is acceptable here.

Built 15 May 2026 after Jason/@success incident where admin had to
manually screenshot admin panel to give Claude the user state. This
tool would have resolved it in 10 seconds.
"""
from datetime import datetime, timezone
from sqlalchemy import text
from .registry import register_tool


@register_tool(
    name="lookup_user",
    description=(
        "Look up a specific user's full account state by username (with or without @), "
        "numeric user_id, OR Ethereum/BSC wallet address (0x-prefixed). For wallet "
        "lookups, first checks users.wallet_address; if no match, falls back to the "
        "from_address on any prior WalletConnect order (so 'mystery wallet sending "
        "orphan transfers' can be identified). Returns: id, username, email, tier, "
        "is_active, founding membership status, balance, sponsor info, recent activity, "
        "last login. Use this when diagnosing an individual member's issue (e.g. "
        "'why is @success showing inactive?'). For aggregate metrics use platform_pulse instead."
    ),
    category="diagnostic",
    input_schema={
        "type": "object",
        "properties": {
            "identifier": {
                "type": "string",
                "description": "Username (e.g. 'success' or '@success'), numeric user ID (e.g. '264'), or wallet address (0x...)",
            },
        },
        "required": ["identifier"],
    },
)
def lookup_user(db, identifier: str = ""):
    if not identifier:
        return {"error": "identifier required (username, user_id, or wallet address)"}

    ident = identifier.strip().lstrip("@")

    # Try numeric ID first, then wallet-address, then username
    user_row = None
    lookup_method = None
    if ident.isdigit():
        user_row = db.execute(text("""
            SELECT id, username, email, is_active, is_admin, membership_tier,
                   is_founding_member, founding_spot_number, membership_price_locked,
                   balance, sponsor_id, activated_at, membership_expires_at,
                   created_at
            FROM users WHERE id = :id
        """), {"id": int(ident)}).fetchone()
        if user_row:
            lookup_method = "user_id"

    # Wallet address lookup (0x-prefixed hex). Case-insensitive — BSC/ETH
    # addresses are conventionally lowercased but users may have stored
    # them with mixed case at signup. Two-step: first check users.wallet_address
    # (the address the user told us about), then if still no match, check
    # walletconnect_payment_orders.from_address (the address they actually
    # paid from — captured by the BSC scanner). The second step catches the
    # case where a user pays from a wallet they never registered, which is
    # exactly the orphan-transfer scenario.
    if not user_row and ident.startswith("0x") and len(ident) >= 6:
        addr = ident.lower()
        user_row = db.execute(text("""
            SELECT id, username, email, is_active, is_admin, membership_tier,
                   is_founding_member, founding_spot_number, membership_price_locked,
                   balance, sponsor_id, activated_at, membership_expires_at,
                   created_at
            FROM users WHERE LOWER(wallet_address) = :addr
        """), {"addr": addr}).fetchone()
        if user_row:
            lookup_method = "users.wallet_address"
        else:
            # Fall back to from_address on prior WalletConnect orders
            wc_user_id = db.execute(text("""
                SELECT user_id FROM walletconnect_payment_orders
                WHERE LOWER(from_address) = :addr
                ORDER BY created_at DESC
                LIMIT 1
            """), {"addr": addr}).scalar()
            if wc_user_id:
                user_row = db.execute(text("""
                    SELECT id, username, email, is_active, is_admin, membership_tier,
                           is_founding_member, founding_spot_number, membership_price_locked,
                           balance, sponsor_id, activated_at, membership_expires_at,
                           created_at
                    FROM users WHERE id = :id
                """), {"id": wc_user_id}).fetchone()
                if user_row:
                    lookup_method = "walletconnect_orders.from_address"

    if not user_row:
        user_row = db.execute(text("""
            SELECT id, username, email, is_active, is_admin, membership_tier,
                   is_founding_member, founding_spot_number, membership_price_locked,
                   balance, sponsor_id, activated_at, membership_expires_at,
                   created_at
            FROM users WHERE LOWER(username) = LOWER(:u)
        """), {"u": ident}).fetchone()
        if user_row:
            lookup_method = "username"

    if not user_row:
        return {"error": f"User not found: {identifier}"}

    # Sponsor info
    sponsor = None
    if user_row.sponsor_id:
        sp = db.execute(text("""
            SELECT id, username, is_active, is_founding_member, founding_spot_number
            FROM users WHERE id = :id
        """), {"id": user_row.sponsor_id}).fetchone()
        if sp:
            sponsor = {
                "id": sp.id,
                "username": sp.username,
                "is_active": sp.is_active,
                "is_founding_member": bool(sp.is_founding_member),
                "founding_spot_number": sp.founding_spot_number,
            }

    # Recent pending/failed orders across all rails
    walletconnect_orders = db.execute(text("""
        SELECT id, product_type, product_key, unique_amount, status,
               created_at, expires_at, confirmed_at, tx_hash
        FROM walletconnect_payment_orders
        WHERE user_id = :id
        ORDER BY created_at DESC
        LIMIT 5
    """), {"id": user_row.id}).fetchall()

    nowpayments_orders = db.execute(text("""
        SELECT id, internal_order_id, product_type, product_key, price_usd,
               status, np_payment_id, created_at, confirmed_at
        FROM nowpayments_orders
        WHERE user_id = :id
        ORDER BY created_at DESC
        LIMIT 5
    """), {"id": user_row.id}).fetchall()

    # Recent payment rows
    recent_payments = db.execute(text("""
        SELECT id, payment_type, amount_usdt, tx_hash, status, created_at
        FROM payments
        WHERE from_user_id = :id
        ORDER BY created_at DESC
        LIMIT 5
    """), {"id": user_row.id}).fetchall()

    return {
        "lookup_method": lookup_method,
        "user": {
            "id": user_row.id,
            "username": user_row.username,
            "email": user_row.email,
            "is_active": user_row.is_active,
            "is_admin": bool(user_row.is_admin),
            "membership_tier": user_row.membership_tier,
            "is_founding_member": bool(user_row.is_founding_member),
            "founding_spot_number": user_row.founding_spot_number,
            "membership_price_locked": str(user_row.membership_price_locked) if user_row.membership_price_locked else None,
            "balance_usd": float(user_row.balance or 0),
            "activated_at": user_row.activated_at.isoformat() if user_row.activated_at else None,
            "membership_expires_at": user_row.membership_expires_at.isoformat() if user_row.membership_expires_at else None,
            "created_at": user_row.created_at.isoformat() if user_row.created_at else None,
        },
        "sponsor": sponsor,
        "recent_walletconnect_orders": [
            {
                "id": r.id,
                "product": f"{r.product_type}/{r.product_key}",
                "unique_amount": float(r.unique_amount or 0),
                "status": r.status,
                "tx_hash": r.tx_hash,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                "confirmed_at": r.confirmed_at.isoformat() if r.confirmed_at else None,
                "expired_now": r.expires_at < datetime.utcnow() if r.expires_at else None,
            }
            for r in walletconnect_orders
        ],
        "recent_nowpayments_orders": [
            {
                "id": r.id,
                "internal_order_id": r.internal_order_id,
                "product": f"{r.product_type}/{r.product_key}",
                "price_usd": float(r.price_usd or 0),
                "status": r.status,
                "np_payment_id": r.np_payment_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "confirmed_at": r.confirmed_at.isoformat() if r.confirmed_at else None,
            }
            for r in nowpayments_orders
        ],
        "recent_payments": [
            {
                "id": r.id,
                "type": r.payment_type,
                "amount_usdt": float(r.amount_usdt or 0),
                "tx_hash": r.tx_hash,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recent_payments
        ],
    }
