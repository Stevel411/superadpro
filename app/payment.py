# ═══════════════════════════════════════════════════════════════
# SuperAdPro — Payment & Commission Processing
# Polygon PoS — USDT — All commission streams
# ═══════════════════════════════════════════════════════════════
import os
import logging
from web3 import Web3
from sqlalchemy.orm import Session
from .database import User, Payment, Commission, Withdrawal, GRID_PACKAGES, MembershipRenewal, P2PTransfer
from .grid import place_member_in_grid, get_or_create_active_grid
from datetime import datetime

logger = logging.getLogger("superadpro.payment")

# Legacy Base chain config — only used by old verify_transaction functions
# These will fail gracefully if env vars aren't set (which they aren't)
_BASE_RPC_URL = os.getenv("BASE_RPC_URL", "https://mainnet.base.org")
USDT_CONTRACT = os.getenv("USDT_CONTRACT", "0x0000000000000000000000000000000000000000")
COMPANY_WALLET = os.getenv("COMPANY_WALLET", "0x0000000000000000000000000000000000000000")

try:
    w3 = Web3(Web3.HTTPProvider(_BASE_RPC_URL))
except Exception:
    w3 = None

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
MEMBERSHIP_SPONSOR_SHARE = 10.0   # 50% to sponsor
MEMBERSHIP_COMPANY_SHARE = 10.0   # 50% to company treasury

# Annual pricing (17% discount vs monthly)
ANNUAL_PRICES = {
    "basic": 200.0,   # vs $240/year monthly ($20 × 12)
    "pro":   350.0,   # vs $420/year monthly ($35 × 12)
}
ANNUAL_SPONSOR_SHARE = {
    "basic": 100.0,   # 50% of $200
    "pro":   175.0,   # 50% of $350
}
ANNUAL_COMPANY_SHARE = {
    "basic": 100.0,   # 50% of $200
    "pro":   175.0,   # 50% of $350
}
PRO_MONTHLY_FEE = 35.0
PRO_SPONSOR_SHARE = 17.50
PRO_COMPANY_SHARE = 17.50


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
            chain_note = "someone you directly referred just paid their $20 membership"
        else:
            chain_note = f"a referral {position} levels down your network just paid their $20 membership"

        send_email(
            to_email  = user.email,
            subject   = "🎉 Your SuperAdPro membership just activated itself!",
            html_body = f"""
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a1a;color:#e8f0fe;border-radius:12px;padding:32px">
                <div style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px">SuperAdPro</div>
                <h2 style="color:#ffffff;margin-bottom:16px">Your membership just activated itself! 🚀</h2>
                <p style="color:rgba(200,220,255,0.8);line-height:1.7">
                    Hi {user.first_name or user.username},<br><br>
                    Great news — {chain_note}, and your $10 referral commission has
                    <strong style="color:#00d4ff">automatically activated your full SuperAdPro membership.</strong>
                </p>
                <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:10px;padding:20px;margin:24px 0">
                    <div style="font-size:13px;color:#94a3b8;margin-bottom:4px">What just happened</div>
                    <div style="color:#ffffff;line-height:1.8">
                        ✅ Referral commission credited to your wallet<br>
                        ✅ $20 auto-deducted to activate your membership<br>
                        ✅ You now have <strong style="color:#00d4ff">full access</strong> to all 3 income streams<br>
                        ✅ Your next referral earns you $10 straight to your wallet
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
    DEPRECATED BEHAVIOUR — was: recursive cascade that auto-activated every
    free member up the sponsor chain whose balance hit $20. That silently
    consumed members' first $20 of commission earnings to pay for a
    membership they hadn't explicitly chosen to buy. Compliance-adjacent
    bad pattern (members reasonably interpreted it as commission theft).

    NEW BEHAVIOUR (Apr 2026, Option B per Steve) — when a free member's
    balance reaches the membership threshold, send them a notification
    offering the choice. They KEEP their earnings unless they explicitly
    click Activate. Function signature preserved so callers in main.py
    don't need touching, but the cascade is now a single notification:

      - If recipient is already active → no-op
      - If balance < $20 → no-op
      - If a pending membership_offer notification already exists → no-op
        (we only want to nudge once until they act on it)
      - Otherwise → create one notification linking to /upgrade-from-balance

    No recursion. Each member makes their own choice independently.
    `tx_hash`, `chain_depth`, `activated_users`, `max_depth` are now
    ignored; kept for API compatibility with existing callers.
    """
    if recipient.is_active:
        return  # Already paid up, nothing to offer
    if (recipient.balance or 0) < MEMBERSHIP_FEE:
        return  # Not enough yet

    # Suppress duplicate offer if one is already pending. The notification
    # type 'membership_offer' is unique per user — we only want to nudge
    # them once until they act on it.
    from .database import Notification
    existing = (
        db.query(Notification)
        .filter(
            Notification.user_id == recipient.id,
            Notification.type == "membership_offer",
            Notification.is_read == False,
        )
        .first()
    )
    if existing:
        return  # Already nudged, don't spam

    notif = Notification(
        user_id=recipient.id,
        type="membership_offer",
        icon="🎉",
        title="Activate your membership for free",
        message=(
            f"You've earned ${MEMBERSHIP_FEE} in commissions! Activate Basic "
            "membership now using your earnings, or keep them in your wallet "
            "to withdraw later."
        ),
        link="/upgrade-from-balance",
        # i18n: frontend translates against the user's locale at render time
        translation_key="notifications.membershipOffer",
    )
    db.add(notif)


def process_membership_payment(db: Session, user_id: int, tx_hash: str) -> dict:
    """
    Activate/renew membership after $20 USDT payment on Base Chain.
    Split: $10 to company treasury, $10 to sponsor wallet.
    50/50 from day one — no first-month exceptions.
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

    # Payment goes to company wallet — contract/backend splits it
    verified = verify_transaction(tx_hash, COMPANY_WALLET, MEMBERSHIP_FEE)
    if not verified:
        return {"success": False, "error": "Transaction not verified on Base Chain"}

    try:
        # 1. Activate the paying user
        user.is_active = True
        if not user.first_payment_to_company:
            user.first_payment_to_company = True

        # 2. Record the membership payment
        db.add(Payment(
            from_user_id = user_id,
            to_user_id   = sponsor.id if sponsor else None,
            amount_usdt  = MEMBERSHIP_FEE,
            payment_type = "membership",
            tx_hash      = tx_hash,
            status       = "confirmed",
        ))

        # 3. Credit sponsor their 50% ($10) and trigger cascade
        activated_users = []
        if sponsor:
            sponsor.balance          += MEMBERSHIP_SPONSOR_SHARE
            sponsor.total_earned     += MEMBERSHIP_SPONSOR_SHARE
            sponsor.upline_earnings  = (sponsor.upline_earnings or 0) + MEMBERSHIP_SPONSOR_SHARE
            sponsor.personal_referrals += 1

            # Record sponsor commission
            db.add(Commission(
                from_user_id    = user_id,
                to_user_id      = sponsor.id,
                amount_usdt     = MEMBERSHIP_SPONSOR_SHARE,
                commission_type = "membership_sponsor",
                package_tier    = 0,
                status          = "paid",
                paid_at         = datetime.utcnow(),
                notes           = f"Membership 50% sponsor share (${MEMBERSHIP_SPONSOR_SHARE})",
            ))

            # Record company share
            db.add(Commission(
                from_user_id    = user_id,
                to_user_id      = None,
                amount_usdt     = MEMBERSHIP_COMPANY_SHARE,
                commission_type = "membership_company",
                package_tier    = 0,
                status          = "platform",
                paid_at         = datetime.utcnow(),
                notes           = f"Membership 50% company share (${MEMBERSHIP_COMPANY_SHARE})",
            ))

            # Kick off the recursive cascade (sponsor may auto-activate)
            _cascade_auto_activation(
                db          = db,
                recipient   = sponsor,
                tx_hash     = tx_hash,
                chain_depth = 1,
                activated_users = activated_users,
            )
        else:
            # No sponsor — 100% to company
            db.add(Commission(
                from_user_id    = user_id,
                to_user_id      = None,
                amount_usdt     = MEMBERSHIP_FEE,
                commission_type = "membership_company",
                package_tier    = 0,
                status          = "platform",
                paid_at         = datetime.utcnow(),
                notes           = f"Membership — no sponsor, full ${MEMBERSHIP_FEE} to company",
            ))

        # 4. Commit everything atomically
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

def request_withdrawal(db: Session, user_id: int, amount: float, wallet_type: str = "affiliate") -> dict:
    """User requests withdrawal — validates security, then auto-sends USDT on Polygon.
    wallet_type: 'affiliate' (default, always withdrawable) or 'campaign' (requires active tier + watch quota)
    """
    from decimal import Decimal as D
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}

    amount_d = D(str(amount))

    # Run base security validation (KYC, 2FA, cooldown, daily cap, wallet address)
    from .withdrawals import validate_withdrawal, validate_campaign_withdrawal, WITHDRAWAL_FEE
    validation = validate_withdrawal(db, user, amount_d)
    if not validation["valid"]:
        return {"success": False, "error": validation["error"]}

    # For campaign withdrawals, run additional tier + watch quota checks
    if wallet_type == "campaign":
        campaign_validation = validate_campaign_withdrawal(db, user, amount_d)
        if not campaign_validation["valid"]:
            return {"success": False, "error": campaign_validation["error"]}

    net_amount = amount_d - WITHDRAWAL_FEE

    # Determine which balance column to deduct from
    if wallet_type == "campaign":
        balance_col = "campaign_balance"
    else:
        balance_col = "balance"

    # Atomic balance deduction — prevents race condition double-spend
    from sqlalchemy import text
    result = db.execute(
        text(f"UPDATE users SET {balance_col} = {balance_col} - :amt, total_withdrawn = COALESCE(total_withdrawn, 0) + :amt WHERE id = :uid AND {balance_col} >= :amt"),
        {"amt": float(amount_d), "uid": user_id}
    )
    if result.rowcount == 0:
        return {"success": False, "error": f"Insufficient {wallet_type} balance (concurrent request detected)"}

    withdrawal = Withdrawal(
        user_id        = user_id,
        amount_usdt    = amount_d,
        wallet_address = user.wallet_address,
        status         = "pending",
    )
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)

    # Auto-process: send USDT on Polygon immediately
    try:
        from .withdrawals import process_withdrawal
        proc_result = process_withdrawal(db, withdrawal.id)
        if proc_result["success"]:
            db.refresh(user)
            remaining = float(user.campaign_balance or 0) if wallet_type == "campaign" else float(user.balance or 0)
            return {
                "success":    True,
                "message":    f"${net_amount:.2f} USDT sent to your wallet on Polygon (${WITHDRAWAL_FEE} fee deducted)",
                "tx_hash":    proc_result["tx_hash"],
                "net_amount": float(net_amount),
                "fee":        float(WITHDRAWAL_FEE),
                "remaining":  remaining,
                "wallet_type": wallet_type,
            }
        else:
            db.refresh(user)
            remaining = float(user.campaign_balance or 0) if wallet_type == "campaign" else float(user.balance or 0)
            return {
                "success": True,
                "message": f"Withdrawal of ${amount_d:.2f} queued — will retry automatically",
                "remaining": remaining,
            }
    except Exception as e:
        logger.warning(f"Auto-withdrawal failed for user {user_id}: {e}")
        db.refresh(user)
        remaining = float(user.campaign_balance or 0) if wallet_type == "campaign" else float(user.balance or 0)
        return {
            "success": True,
            "message": f"Withdrawal of ${amount_d:.2f} queued for processing",
            "remaining": remaining,
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

        # Admin/owner accounts never expire — skip renewal processing
        if user.is_admin:
            # Keep renewal date rolling forward so dashboard looks clean
            if now >= renewal.next_renewal_date:
                renewal.last_renewed_at = now
                renewal.next_renewal_date = now + timedelta(days=30)
                renewal.total_renewals = (renewal.total_renewals or 0) + 1
                renewal.in_grace_period = False
            continue

        # Annual members don't auto-renew monthly — they expire after 365 days
        # When their membership_expires_at passes, they lapse like anyone else
        if getattr(user, 'membership_billing', 'monthly') == 'annual':
            # Check if annual membership has expired
            if user.membership_expires_at and now < user.membership_expires_at:
                continue  # Still active, skip
            # If expired, fall through to lapse logic below

        # ── 3-day low balance warning ──────────────────────────
        warning_threshold = renewal.next_renewal_date - timedelta(days=3)
        if now >= warning_threshold and not renewal.in_grace_period:
            if user.balance < MEMBERSHIP_FEE and not user.low_balance_warned:
                user.low_balance_warned = True
                results["warned"].append(user.id)

        # ── Renewal due ─────────────────────────────────────────
        if now >= renewal.next_renewal_date and not renewal.in_grace_period:
            if user.balance >= MEMBERSHIP_FEE:
                # Sufficient balance — auto-renew with 50/50 split
                sponsor = db.query(User).filter(User.id == user.sponsor_id).first() if user.sponsor_id else None

                user.balance      = Decimal(str(user.balance or 0)) - Decimal(str(MEMBERSHIP_FEE))
                user.low_balance_warned = False

                if sponsor:
                    sponsor.balance      = Decimal(str(sponsor.balance or 0)) + Decimal(str(MEMBERSHIP_SPONSOR_SHARE))
                    sponsor.total_earned = Decimal(str(sponsor.total_earned or 0)) + Decimal(str(MEMBERSHIP_SPONSOR_SHARE))

                db.add(Commission(
                    from_user_id    = user.id,
                    to_user_id      = sponsor.id if sponsor else None,
                    amount_usdt     = MEMBERSHIP_SPONSOR_SHARE if sponsor else 0,
                    commission_type = "membership_renewal",
                    package_tier    = 0,
                    status          = "paid",
                    paid_at         = now,
                    notes           = f"Monthly renewal — ${MEMBERSHIP_SPONSOR_SHARE} sponsor / ${MEMBERSHIP_COMPANY_SHARE} company",
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

    def _dt(v):
        return v.isoformat() if v else None

    # Admin/owner accounts have permanent membership
    if user.is_admin:
        return {
            "has_renewal":        True,
            "next_renewal_date":  _dt(renewal.next_renewal_date),
            "days_remaining":     9999,
            "last_renewed_at":    _dt(renewal.last_renewed_at),
            "total_renewals":     renewal.total_renewals,
            "in_grace_period":    False,
            "status":             "owner",
            "can_afford":         True,
            "balance":            round(user.balance or 0, 2),
        }

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
        "next_renewal_date":  _dt(renewal.next_renewal_date),
        "days_remaining":     days_remaining,
        "last_renewed_at":    _dt(renewal.last_renewed_at),
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

    # Atomic balance deduction — prevents race condition double-spend
    from sqlalchemy import text as _text
    result = db.execute(
        _text("UPDATE users SET balance = balance - :amt WHERE id = :uid AND balance >= :amt"),
        {"amt": amount, "uid": from_user_id}
    )
    if result.rowcount == 0:
        return {"success": False, "error": "Insufficient balance (concurrent request detected)"}

    # Credit recipient
    db.execute(
        _text("UPDATE users SET balance = balance + :amt, total_earned = COALESCE(total_earned, 0) + :amt WHERE id = :rid"),
        {"amt": amount, "rid": recipient.id}
    )

    transfer = P2PTransfer(
        from_user_id = from_user_id,
        to_user_id   = recipient.id,
        amount_usdt  = amount,
        note         = note[:200] if note else None,
        status       = "completed",
    )
    db.add(transfer)
    db.commit()
    db.refresh(sender)

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
