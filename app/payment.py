# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Payment & Blockchain Verification
# Base Chain USDT — 8×8 Grid Commission Distribution
# ═══════════════════════════════════════════════════════════════
import os
from web3 import Web3
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from .database import User, Payment, Commission, Withdrawal, GRID_PACKAGES, MembershipRenewal, P2PTransfer
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

MEMBERSHIP_FEE = 20.0


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

def _send_auto_activation_email(user, position: int):
    """Send branded auto-activation email. position = chain depth (1=direct, 2=grandparent etc)"""
    try:
        from app.email_utils import send_email
        chain_note = ""
        if position == 1:
            chain_note = "someone you directly referred just paid their $10 membership fee"
        else:
            chain_note = f"a referral {position} levels down your network just paid their $10 membership fee"

        send_email(
            to_email  = user.email,
            subject   = "🎉 Your SuperAdPro membership just activated itself!",
            html_body = f"""
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a1a;color:#e8f0fe;border-radius:12px;padding:32px">
                <div style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px">SuperAdPro</div>
                <h2 style="color:#ffffff;margin-bottom:16px">Your membership just activated itself! 🚀</h2>
                <p style="color:rgba(200,220,255,0.8);line-height:1.7">
                    Hi {user.first_name or user.username},<br><br>
                    Great news — {chain_note}, and that $10 referral commission has
                    <strong style="color:#00d4ff">automatically activated your full SuperAdPro membership.</strong>
                </p>
                <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:10px;padding:20px;margin:24px 0">
                    <div style="font-size:13px;color:#94a3b8;margin-bottom:4px">What just happened</div>
                    <div style="color:#ffffff;line-height:1.8">
                        ✅ Referral commission credited to your wallet<br>
                        ✅ $10 auto-deducted to activate your membership<br>
                        ✅ You now have <strong style="color:#00d4ff">full access</strong> to all 3 income streams<br>
                        ✅ Your next referral commission goes straight to your wallet
                    </div>
                </div>
                <p style="color:rgba(200,220,255,0.8);line-height:1.7">
                    You can now activate your Profit Engine Grid and start earning from all income streams.
                    This is the power of the SuperAdPro network working for you.
                </p>
                <a href="https://superadpro.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#00b4d8,#6d28d9);color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;margin-top:8px">
                    Go to My Dashboard →
                </a>
            </div>
            """,
            text_body = f"Hi {user.first_name or user.username}, your SuperAdPro membership just activated automatically! A referral in your network triggered the cascade. Log in to access all income streams."
        )
    except Exception:
        pass  # Email failure must never block a transaction


def _cascade_auto_activation(
    db,
    recipient: "User",
    tx_hash: str,
    chain_depth: int,
    activated_users: list,
    max_depth: int = 50
):
    """
    Recursive cascade — travels up the sponsor chain activating every
    free member whose wallet reaches $10 from the incoming commission.

    recipient      — the user who just received a $10 commission
    tx_hash        — original tx hash (used to generate unique audit hashes)
    chain_depth    — how many levels up from the original payment (1 = direct sponsor)
    activated_users — list collecting every user auto-activated in this cascade
    max_depth      — safety cap to prevent infinite loops (default 50 levels)
    """
    if chain_depth > max_depth:
        return  # Safety cap

    if recipient.is_active:
        return  # Chain stops — this person is already active, they keep the $10

    # Free member with $10 — auto-activate
    if recipient.balance >= MEMBERSHIP_FEE:
        recipient.balance   -= MEMBERSHIP_FEE
        recipient.is_active  = True
        activated_users.append((recipient, chain_depth))

        # Find recipient's sponsor to receive the $10
        next_recipient = None
        if recipient.sponsor_id:
            next_recipient = db.query(User).filter(User.id == recipient.sponsor_id).first()

        # Credit the next person up the chain
        if next_recipient:
            next_recipient.balance          += MEMBERSHIP_FEE
            next_recipient.total_earned     += MEMBERSHIP_FEE
            next_recipient.personal_referrals += 1
        # No sponsor → $10 stays consumed (already deducted), company effectively absorbs it

        # Audit record for this hop in the cascade
        hop_payment = Payment(
            from_user_id = recipient.id,
            to_user_id   = next_recipient.id if next_recipient else None,
            amount_usdt  = MEMBERSHIP_FEE,
            payment_type = "membership_auto",
            tx_hash      = f"{tx_hash}_cascade_{chain_depth}",
            status       = "confirmed",
        )
        db.add(hop_payment)

        # Recurse — does the next person up also qualify?
        if next_recipient:
            _cascade_auto_activation(
                db, next_recipient, tx_hash,
                chain_depth + 1, activated_users, max_depth
            )


def process_membership_payment(db: Session, user_id: int, tx_hash: str) -> dict:
    """
    Activate membership after $10 USDT payment verified on Base Chain.
    Triggers recursive auto-activation cascade up the sponsor chain.
    """
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

    try:
        # 1. Activate the paying user
        user.is_active = True

        # 2. Record the primary membership payment
        db.add(Payment(
            from_user_id = user_id,
            to_user_id   = sponsor.id if sponsor else None,
            amount_usdt  = MEMBERSHIP_FEE,
            payment_type = "membership",
            tx_hash      = tx_hash,
            status       = "confirmed",
        ))

        # 3. Credit sponsor and trigger cascade
        activated_users = []  # Will collect everyone auto-activated
        if sponsor:
            sponsor.balance          += MEMBERSHIP_FEE
            sponsor.total_earned     += MEMBERSHIP_FEE
            sponsor.personal_referrals += 1

            # Kick off the recursive cascade
            _cascade_auto_activation(
                db          = db,
                recipient   = sponsor,
                tx_hash     = tx_hash,
                chain_depth = 1,
                activated_users = activated_users,
            )

        # 4. Commit everything atomically — all or nothing
        db.commit()

        # 5. Send activation emails AFTER commit (non-blocking)
        for activated_user, depth in activated_users:
            _send_auto_activation_email(activated_user, depth)

        return {
            "success": True,
            "message": "Membership activated successfully",
            "cascade_activations": len(activated_users),
            "sponsor_auto_activated": any(u.id == sponsor.id for u, _ in activated_users) if sponsor else False,
        }

    except Exception as e:
        db.rollback()
        return {"success": False, "error": f"Payment processing failed: {str(e)}"}


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
            "message":     f"Placed in Grid #{result['advance']} at Level {result['grid_level']}",
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




# ═══════════════════════════════════════════════════════════════
#  MEMBERSHIP AUTO-RENEWAL
# ═══════════════════════════════════════════════════════════════

def initialise_renewal_record(db: Session, user_id: int, source: str = "referral") -> None:
    """Create or update MembershipRenewal when a member first activates."""
    from datetime import timedelta
    existing = db.query(MembershipRenewal).filter(MembershipRenewal.user_id == user_id).first()
    now = datetime.utcnow()
    next_renewal = now + timedelta(days=30)

    if not existing:
        db.add(MembershipRenewal(
            user_id           = user_id,
            activated_at      = now,
            next_renewal_date = next_renewal,
            last_renewed_at   = now,
            renewal_source    = source,
            total_renewals    = 1,
        ))
    else:
        existing.activated_at      = existing.activated_at or now
        existing.last_renewed_at   = now
        existing.next_renewal_date = next_renewal
        existing.in_grace_period   = False
        existing.grace_period_start = None
        existing.total_renewals    = (existing.total_renewals or 0) + 1
    db.commit()


def process_auto_renewals(db: Session) -> dict:
    """
    Called daily (via scheduler or admin endpoint).
    Deducts $20 from wallet for members due renewal.
    Issues 3-day warnings. Lapses after 5-day grace period.
    """
    from datetime import timedelta
    now       = datetime.utcnow()
    results   = {"renewed": [], "warned": [], "lapsed": [], "grace_extended": []}

    renewals = db.query(MembershipRenewal).all()

    for renewal in renewals:
        user = db.query(User).filter(User.id == renewal.user_id).first()
        if not user or not user.is_active:
            continue

        # ── 3-day low balance warning ──────────────────────────
        warning_threshold = renewal.next_renewal_date - timedelta(days=3)
        if now >= warning_threshold and not renewal.in_grace_period:
            if user.balance < MEMBERSHIP_FEE and not user.low_balance_warned:
                user.low_balance_warned = True
                results["warned"].append(user.id)

        # ── Renewal due ─────────────────────────────────────────
        if now >= renewal.next_renewal_date and not renewal.in_grace_period:
            if user.balance >= MEMBERSHIP_FEE:
                # Sufficient balance — auto-renew
                sponsor = db.query(User).filter(User.id == user.sponsor_id).first() if user.sponsor_id else None

                user.balance      -= MEMBERSHIP_FEE
                user.low_balance_warned = False

                if sponsor:
                    sponsor.balance      += MEMBERSHIP_FEE
                    sponsor.total_earned += MEMBERSHIP_FEE

                db.add(Commission(
                    from_user_id    = user.id,
                    to_user_id      = sponsor.id if sponsor else None,
                    amount_usdt     = MEMBERSHIP_FEE,
                    commission_type = "membership_renewal",
                    package_tier    = 0,
                    status          = "paid",
                    paid_at         = now,
                    notes           = f"Monthly membership auto-renewal",
                ))

                renewal.last_renewed_at   = now
                renewal.next_renewal_date = now + timedelta(days=30)
                renewal.renewal_source    = "wallet"
                renewal.total_renewals    = (renewal.total_renewals or 0) + 1
                results["renewed"].append(user.id)

            else:
                # Insufficient — start grace period
                renewal.in_grace_period    = True
                renewal.grace_period_start = now
                results["grace_extended"].append(user.id)

        # ── Grace period expired (5 days) ───────────────────────
        elif renewal.in_grace_period and renewal.grace_period_start:
            grace_expired = renewal.grace_period_start + timedelta(days=5)
            if now >= grace_expired:
                user.is_active          = False
                renewal.in_grace_period = False
                results["lapsed"].append(user.id)

    db.commit()
    return results


def get_renewal_status(db: Session, user_id: int) -> dict:
    """Return membership renewal info for display in wallet/dashboard."""
    from datetime import timedelta
    renewal = db.query(MembershipRenewal).filter(MembershipRenewal.user_id == user_id).first()
    user    = db.query(User).filter(User.id == user_id).first()

    if not renewal or not user:
        return {"has_renewal": False}

    now  = datetime.utcnow()
    diff = (renewal.next_renewal_date - now).total_seconds() if renewal.next_renewal_date else 0
    days_remaining = max(0, int(diff / 86400))

    status = "active"
    if renewal.in_grace_period:
        grace_diff = (renewal.grace_period_start + timedelta(days=5) - now).total_seconds() if renewal.grace_period_start else 0
        grace_days = max(0, int(grace_diff / 86400))
        status = f"grace_{grace_days}d"
    elif days_remaining <= 3:
        status = "warning"

    return {
        "has_renewal":        True,
        "next_renewal_date":  renewal.next_renewal_date,
        "days_remaining":     days_remaining,
        "last_renewed_at":    renewal.last_renewed_at,
        "total_renewals":     renewal.total_renewals,
        "in_grace_period":    renewal.in_grace_period,
        "status":             status,
        "can_afford":         (user.balance or 0) >= MEMBERSHIP_FEE,
        "balance":            round(user.balance or 0, 2),
    }


# ═══════════════════════════════════════════════════════════════
#  PEER-TO-PEER TRANSFERS
# ═══════════════════════════════════════════════════════════════

MIN_P2P_AMOUNT  = 1.0
MAX_P2P_AMOUNT  = 500.0

def process_p2p_transfer(db: Session, from_user_id: int, to_member_id: str, amount: float, note: str = "") -> dict:
    """
    Transfer funds between members using member ID.
    to_member_id is the string member ID shown on their profile (e.g. 'SAP-00042').
    """
    if amount < MIN_P2P_AMOUNT:
        return {"success": False, "error": f"Minimum transfer is ${MIN_P2P_AMOUNT:.0f} USDT"}
    if amount > MAX_P2P_AMOUNT:
        return {"success": False, "error": f"Maximum single transfer is ${MAX_P2P_AMOUNT:.0f} USDT"}

    sender = db.query(User).filter(User.id == from_user_id).first()
    if not sender:
        return {"success": False, "error": "Sender not found"}
    if not sender.is_active:
        return {"success": False, "error": "Active membership required to transfer funds"}
    if (sender.balance or 0) < amount:
        return {"success": False, "error": f"Insufficient balance. Available: ${sender.balance:.2f}"}

    # Resolve recipient by member ID (format SAP-XXXXX or raw numeric id)
    recipient = None
    clean_id = to_member_id.strip().upper().replace("SAP-", "")
    if clean_id.isdigit():
        recipient = db.query(User).filter(User.id == int(clean_id)).first()
    if not recipient:
        # Try username search as fallback
        recipient = db.query(User).filter(User.username == to_member_id.strip()).first()

    if not recipient:
        return {"success": False, "error": f"Member '{to_member_id}' not found. Check the ID and try again."}
    if recipient.id == from_user_id:
        return {"success": False, "error": "You cannot transfer funds to yourself"}
    if not recipient.is_active:
        return {"success": False, "error": "Recipient does not have an active membership"}

    # Execute transfer
    sender.balance    = round((sender.balance or 0) - amount, 6)
    recipient.balance = round((recipient.balance or 0) + amount, 6)
    recipient.total_earned = round((recipient.total_earned or 0) + amount, 6)

    transfer = P2PTransfer(
        from_user_id = from_user_id,
        to_user_id   = recipient.id,
        amount_usdt  = amount,
        note         = note[:200] if note else None,
        status       = "completed",
    )
    db.add(transfer)
    db.commit()

    return {
        "success":          True,
        "message":          f"${amount:.2f} USDT sent to {recipient.first_name or recipient.username}",
        "recipient_name":   recipient.first_name or recipient.username,
        "recipient_id":     f"SAP-{recipient.id:05d}",
        "new_balance":      round(sender.balance, 2),
        "amount":           amount,
    }


def get_p2p_history(db: Session, user_id: int, limit: int = 20) -> list:
    """Return recent P2P transfers for a member (sent and received)."""
    transfers = db.query(P2PTransfer).filter(
        (P2PTransfer.from_user_id == user_id) | (P2PTransfer.to_user_id == user_id)
    ).order_by(P2PTransfer.created_at.desc()).limit(limit).all()

    result = []
    for t in transfers:
        sender    = db.query(User).filter(User.id == t.from_user_id).first()
        recipient = db.query(User).filter(User.id == t.to_user_id).first()
        result.append({
            "id":             t.id,
            "direction":      "sent" if t.from_user_id == user_id else "received",
            "amount":         t.amount_usdt,
            "note":           t.note,
            "status":         t.status,
            "created_at":     t.created_at,
            "other_party":    (recipient.first_name or recipient.username) if t.from_user_id == user_id else (sender.first_name or sender.username),
            "other_id":       f"SAP-{t.to_user_id:05d}" if t.from_user_id == user_id else f"SAP-{t.from_user_id:05d}",
        })
    return result


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
