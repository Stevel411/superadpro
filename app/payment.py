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
MEMBERSHIP_COMPANY_SHARE = 10.0   # 50% to company treasury at $20, 33% at $15

# Annual pricing — flat partner model 15 May 2026.
# Standard partner $200/yr. Founding partner $150/yr (10× monthly locked rate).
# Sponsor commission: flat $100 on annual (10× the monthly $10) regardless
# of buyer's price. Legacy 'basic'/'pro' keys retained but resolve identically
# to standard partner — there is no longer a Pro tier to charge differently for.
ANNUAL_PRICES = {
    "partner": 200.0,
    "basic":   200.0,  # legacy alias
    "pro":     200.0,  # legacy alias (no longer $350)
}
ANNUAL_SPONSOR_SHARE = {
    "partner": 100.0,
    "basic":   100.0,
    "pro":     100.0,  # flat — no longer tier-based
}
ANNUAL_COMPANY_SHARE = {
    "partner": 100.0,
    "basic":   100.0,
    "pro":     100.0,
}
# Legacy constants — retained as imports for callers that haven't migrated
# but now reflect flat partner economics. PRO_MONTHLY_FEE is the same as
# standard partner; PRO_SPONSOR_SHARE/COMPANY_SHARE are flat $10 each.
PRO_MONTHLY_FEE = 20.0      # was 35.0 pre-flat-pricing
PRO_SPONSOR_SHARE = 10.00   # was 17.50
PRO_COMPANY_SHARE = 10.00   # was 17.50


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
    """DISABLED 7 Jun 2026 — permanently returns False.

    This was a push-based verifier: a client submitted a tx_hash and we
    checked the receipt for a Transfer to the treasury. It had two fatal
    flaws:
      1. It never verified the EMITTING contract. process_receipt decodes
         ANY log with the Transfer signature, so a worthless token emitting
         Transfer(to=treasury, value=20e18) passed verification — minting
         real sponsor commission from a zero-cost fake deposit.
      2. It never verified the SENDER, so any genuine treasury-bound
         tx_hash could be claimed by a different account.
    Both are consistent with the 3 Jun 2026 synthetic-balance breach.

    All inbound USDT is now confirmed by the pull-based BSC scanner
    (app/walletconnect_payments.py): it reads logs filtered to the real
    USDT contract address, matches each payment to a specific order by a
    unique amount, is idempotent on tx_hash, and records the sender. The
    client-submitted push path is retired. This stub remains only so its
    (now dead) callers fail closed instead of minting value.
    """
    logger.warning(
        "verify_transaction() is permanently disabled; inbound payments are "
        "confirmed by the BSC scanner. Ignored tx=%s to=%s amount=%s",
        tx_hash, expected_to, expected_amount,
    )
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
            f"You've earned ${MEMBERSHIP_FEE} in commissions! Activate your "
            "Partner membership now using your earnings, or keep them in your "
            "wallet to withdraw later."
        ),
        link="/upgrade-from-balance",
        # i18n: frontend translates against the user's locale at render time
        translation_key="notifications.membershipOffer",
    )
    db.add(notif)


def pay_renewal_commission(db, member, *, period_key: str, rail: str):
    """Shared renewal-commission engine — the ONE place a membership renewal
    pays the sponsor and records the company share. Called by every rail that
    renews a membership (Stripe invoice.paid, wallet process_auto_renewals).

    Built 28 May 2026 to fix a rail-divergence bug: the Stripe invoice.paid
    handler extended the membership expiry but never paid the sponsor, while
    the wallet cron paid the sponsor but never recorded the company share to
    the ledger. Two rails, two different partial behaviours — the exact
    failure mode CLAUDE.md's engine-level-invariant rule warns against. This
    function is the single source of truth so the rails can never diverge
    again.

    Economics (confirmed by Steve 28 May 2026, matches docs/commission-spec.md
    flat-pricing model):
      - Founder ($15/mo locked)  → sponsor $10, company $5    — forever, every renewal
      - Partner ($20/mo)         → sponsor $10, company $10   — every renewal
    Flat $10 sponsor share regardless of buyer price; company keeps the
    remainder. Post-100-cap, all new members are $20 Partners on $10/$10.

    Idempotency: source_event_id = period_key, which the CALLER builds as
    'renewal:{user_id}:{YYYY-MM}'. The existing partial unique index
    uniq_commission_event on (from_user_id, to_user_id, commission_type,
    source_event_id) refuses a second row for the same member-month. Keying
    on the billing PERIOD rather than the rail means a member renewed on both
    rails in the same month (wallet cron + a stray Stripe invoice) still pays
    the sponsor exactly once — rail-keyed idempotency would miss that. Stripe's
    per-retry idempotency is covered too: same invoice → same member-month →
    same key → refused.

    Free-sponsor handling mirrors _activate_membership exactly (Steve's call,
    'keep it consistent'): credit the balance and fire the one-time
    membership-offer notification via _cascade_auto_activation. The sponsor
    keeps the earnings; nothing is auto-consumed.

    Transaction safety: the commission insert runs inside a nested savepoint
    (db.begin_nested) so an idempotency collision rolls back ONLY this one
    insert, not the caller's surrounding transaction. Critical for the wallet
    cron, which processes many members in one transaction — one duplicate must
    not poison the whole batch. Returns the sponsor_share actually paid (Decimal),
    or Decimal('0') if the renewal was a duplicate (already paid this period).

    Does NOT commit — the caller owns the transaction boundary.
    """
    from decimal import Decimal
    from datetime import datetime
    from sqlalchemy.exc import IntegrityError

    now = datetime.utcnow()

    # Fee honours the member's locked price (Founder $15) else standard $20.
    locked = getattr(member, "membership_price_locked", None)
    member_fee = Decimal(str(locked)) if locked is not None else Decimal(str(MEMBERSHIP_FEE))
    sponsor_share = Decimal(str(MEMBERSHIP_SPONSOR_SHARE))  # flat $10
    company_share = member_fee - sponsor_share

    sponsor = None
    if member.sponsor_id:
        sponsor = db.query(User).filter(User.id == member.sponsor_id).first()

    paid = Decimal("0")

    # ── Sponsor commission (idempotent, savepoint-isolated) ────────────────
    if sponsor:
        try:
            with db.begin_nested():
                comm = Commission(
                    to_user_id=sponsor.id,
                    from_user_id=member.id,
                    amount_usdt=sponsor_share,
                    commission_type="membership_renewal",
                    package_tier=0,
                    status="paid",
                    paid_at=now,
                    source_event_id=period_key,
                    notes=(
                        f"Membership renewal commission from {member.username} "
                        f"({rail}) — ${member_fee} paid "
                        f"(${sponsor_share} sponsor / ${company_share} company)"
                    ),
                )
                db.add(comm)
                db.flush()  # forces the unique-index check inside the savepoint
        except IntegrityError:
            # Duplicate for this member-month — another rail (or a Stripe
            # retry) already paid this renewal. The savepoint rolled back just
            # this insert; the caller's transaction is intact. Pay nothing.
            logger.warning(
                f"DUPLICATE RENEWAL COMMISSION BLOCKED ({period_key}): "
                f"member={member.id} ({member.username}) sponsor={sponsor.id} "
                f"rail={rail}. Idempotency working — already paid this period."
            )
            return Decimal("0")

        # Insert succeeded — credit the sponsor's running balances.
        sponsor.balance = Decimal(str(sponsor.balance or 0)) + sponsor_share
        sponsor.total_earned = Decimal(str(sponsor.total_earned or 0)) + sponsor_share
        paid = sponsor_share

        # Free sponsor: offer activation from balance (consistent w/ activation).
        if not sponsor.is_active:
            try:
                _cascade_auto_activation(
                    db=db, recipient=sponsor,
                    tx_hash=f"renew_{member.id}", chain_depth=1,
                    activated_users=[],
                )
            except Exception as exc:
                logger.warning(f"Renewal free-sponsor offer check failed for {sponsor.id}: {exc}")

        # Cha-ching email (best-effort, mirrors activation path).
        try:
            from .email_utils import send_commission_email
            if sponsor.email:
                send_commission_email(
                    to_email=sponsor.email,
                    first_name=sponsor.first_name or sponsor.username,
                    commission_type="Membership Renewal",
                    from_username=member.username,
                )
        except Exception as exc:
            logger.warning(f"Renewal commission email failed for sponsor {sponsor.id}: {exc}")

    # ── Company-share ledger row ───────────────────────────────────────────
    # Mirrors _activate_membership: without this row the company's retained
    # renewal revenue is invisible to financial_sanity / commission_audit.
    # Keyed on the same period so it's idempotent too (company_company is a
    # distinct commission_type, so it gets its own index slot per period).
    if company_share > 0:
        try:
            with db.begin_nested():
                db.add(Commission(
                    from_user_id=member.id,
                    to_user_id=None,
                    amount_usdt=company_share,
                    commission_type="membership_company",
                    package_tier=0,
                    status="platform",
                    paid_at=now,
                    source_event_id=period_key,
                    notes=(
                        f"Membership renewal company share (${company_share}) "
                        f"from {member.username} ({rail}) — member_fee=${member_fee}"
                    ),
                ))
                db.flush()
        except IntegrityError:
            logger.warning(
                f"Duplicate renewal company-share blocked ({period_key}): "
                f"member={member.id} rail={rail}."
            )

    return paid


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

def request_withdrawal(
    db: Session,
    user_id: int,
    amount: float,
    wallet_type: str = "affiliate",
    idempotency_key: str | None = None,
) -> dict:
    """User requests withdrawal — validates security, then auto-sends USDT on Polygon.

    wallet_type: 'affiliate' (default, always withdrawable) or 'campaign'
                 (requires active tier + watch quota).
    idempotency_key: client-supplied UUID per Withdraw button click. If a
                 withdrawal already exists with this key, return its
                 current state instead of creating a new one. This is the
                 double-spend guard against double-clicks, flaky 4G
                 silently retrying, and any other source of duplicate
                 submissions.
    """
    from decimal import Decimal as D
    from .withdrawals import (
        validate_withdrawal, validate_campaign_withdrawal,
        validate_affiliate_withdrawal, WITHDRAWAL_FEE,
    )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"success": False, "error": "User not found"}

    amount_d = D(str(amount))

    # ── Idempotency short-circuit ────────────────────────────────────
    # If we've already accepted a withdrawal with this key, return the
    # existing row's state without doing anything else. Don't validate,
    # don't deduct, don't process — the original attempt already did all
    # of that. This is the entire point of the unique index: client
    # retries see the same answer the first call returned.
    if idempotency_key:
        existing = (
            db.query(Withdrawal)
            .filter(Withdrawal.idempotency_key == idempotency_key)
            .first()
        )
        if existing:
            return _reply_for_existing_withdrawal(db, user, existing, wallet_type)

    # Run base security validation (KYC, 2FA, daily cap, wallet address,
    # min amount). NOT a balance check — see validate_withdrawal docstring;
    # balance check is per-wallet-type below.
    validation = validate_withdrawal(db, user, amount_d)
    if not validation["valid"]:
        return {"success": False, "error": validation["error"]}

    # Wallet-specific balance check. Was historically only done for
    # campaign — affiliate fell through the base 'user.balance' check
    # which broke campaign withdrawals when affiliate balance was
    # smaller than the campaign withdrawal amount.
    if wallet_type == "campaign":
        campaign_validation = validate_campaign_withdrawal(db, user, amount_d)
        if not campaign_validation["valid"]:
            return {"success": False, "error": campaign_validation["error"]}
    else:
        affiliate_validation = validate_affiliate_withdrawal(db, user, amount_d)
        if not affiliate_validation["valid"]:
            return {"success": False, "error": affiliate_validation["error"]}

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

    # Insert withdrawal row, stamping wallet_type and (optionally) the
    # idempotency_key. If two concurrent requests share the same key we'll
    # collide on the unique index — catch IntegrityError, undo the balance
    # deduction we just did, and return the winning row's state.
    #
    # network is stamped from the user's wallet_network so the dispatcher
    # in process_withdrawal knows which chain to send on. Stored at request
    # time (not lookup time) so a withdrawal doesn't switch networks if
    # the user updates their wallet between request and processing.
    from sqlalchemy.exc import IntegrityError
    withdrawal = Withdrawal(
        user_id        = user_id,
        amount_usdt    = amount_d,
        wallet_address = user.wallet_address,
        network        = (user.wallet_network or "").lower() or None,
        # SECURITY (4 Jun 2026): created in 'awaiting_approval', NOT 'pending'.
        # The retry cron (process_pending_withdrawals_batch) only sweeps
        # status='pending', so this row cannot auto-send. An admin must
        # release it with a live TOTP code via the approval endpoint, which
        # flips it to 'pending' and processes it once. This is the gate that
        # closes the 3-Jun-2026 incident: a compromised endpoint cannot move
        # money without the admin's authenticator code.
        status         = "awaiting_approval",
        wallet_type    = wallet_type,
        idempotency_key = idempotency_key,
    )
    db.add(withdrawal)
    try:
        db.commit()
        db.refresh(withdrawal)
    except IntegrityError:
        db.rollback()
        # Undo the balance deduction — the winning request's deduction
        # stands; ours was a duplicate submission that mustn't double-spend.
        db.execute(
            text(
                f"UPDATE users SET {balance_col} = {balance_col} + :amt, "
                f"total_withdrawn = GREATEST(COALESCE(total_withdrawn, 0) - :amt, 0) "
                f"WHERE id = :uid"
            ),
            {"amt": float(amount_d), "uid": user_id},
        )
        db.commit()

        # Return whatever state the winning row is in.
        if idempotency_key:
            winner = (
                db.query(Withdrawal)
                .filter(Withdrawal.idempotency_key == idempotency_key)
                .first()
            )
            if winner:
                return _reply_for_existing_withdrawal(db, user, winner, wallet_type)
        # Defensive fallback — shouldn't happen, but better than a 500.
        logger.error(
            f"Withdrawal idempotency collision for user {user_id} but winner not found "
            f"(key={idempotency_key})"
        )
        return {
            "success": False,
            "error": "Duplicate request detected. Please refresh your wallet and try again.",
        }

    # ── ADMIN-APPROVAL GATE (security rebuild, 4 Jun 2026) ──────────
    # Withdrawals NO LONGER auto-send on request. The balance is already
    # earmarked (atomic deduction above) and the row now sits in
    # 'awaiting_approval', invisible to the retry cron. Money leaves only
    # when an admin releases the row via the 2FA-gated approval endpoint
    # (/admin/api/withdrawals/{id}/approve), which verifies the admin's
    # live TOTP code, re-checks the per-tx cap and destination, flips the
    # row to 'pending' and calls process_withdrawal once.
    #
    # We do NOT call process_withdrawal here. The member gets a clear
    # "requested — pending review" reply built from the row state below.
    db.refresh(withdrawal)
    return _reply_for_existing_withdrawal(db, user, withdrawal, wallet_type, net_amount=net_amount)


def _reply_for_existing_withdrawal(db, user, withdrawal, requested_wallet_type, net_amount=None):
    """Build the API response for a withdrawal whose state we already know.

    Used by:
      - the idempotency short-circuit (client retried with same UUID)
      - the unique-index collision recovery path
      - the post-process_withdrawal return at the end of request_withdrawal

    Always pulls remaining balance from the row's actual wallet_type, not
    the parameter — the row is the source of truth in case of mismatch.
    """
    from .withdrawals import WITHDRAWAL_FEE, RETRY_BACKOFF_MINUTES
    from decimal import Decimal as D

    db.refresh(user)
    wallet_type = (withdrawal.wallet_type or requested_wallet_type or "affiliate").lower()
    remaining = float(user.campaign_balance or 0) if wallet_type == "campaign" else float(user.balance or 0)
    gross = D(str(withdrawal.amount_usdt or 0))
    net = net_amount if net_amount is not None else (gross - WITHDRAWAL_FEE)

    status = withdrawal.status

    # Network the withdrawal was sent on — frontend uses this to pick the
    # right block-explorer URL when rendering the tx link. Lower-cased for
    # consistency; legacy rows may have NULL (Polygon-era) which the
    # frontend handles by hiding the link.
    network = (withdrawal.network or "").lower()
    network_label_map = {
        "tron": "Tron (TRC-20)",
        "bsc":  "BNB Chain (BEP-20)",
    }
    network_label = network_label_map.get(network, "USDT")

    if status == "awaiting_approval":
        return {
            "success":     True,
            "queued":      True,
            "message":     "Withdrawal requested. It's awaiting review and will be released shortly — you'll be notified when it's sent.",
            "net_amount":  float(net),
            "fee":         float(WITHDRAWAL_FEE),
            "remaining":   remaining,
            "wallet_type": wallet_type,
            "status":      "awaiting_approval",
        }

    if status == "paid":
        return {
            "success":     True,
            "message":     f"${net:.2f} USDT sent to your wallet on {network_label} (${WITHDRAWAL_FEE} fee deducted)",
            "tx_hash":     withdrawal.tx_hash or "",
            "network":     network,
            "net_amount":  float(net),
            "fee":         float(WITHDRAWAL_FEE),
            "remaining":   remaining,
            "wallet_type": wallet_type,
        }

    if status == "pending":
        # Inline send didn't go through — first attempt failed, the cron
        # will retry. Be honest about what's happening: tell the user
        # roughly when the retry will run rather than the previous
        # generic "will retry automatically" handwave.
        attempts = withdrawal.attempts or 0
        if attempts > 0:
            idx = max(0, min(attempts - 1, len(RETRY_BACKOFF_MINUTES) - 1))
            wait_min = RETRY_BACKOFF_MINUTES[idx]
            wait_str = f"{wait_min} minutes" if wait_min < 60 else f"{wait_min // 60} hour" + ("s" if wait_min // 60 > 1 else "")
            msg = (
                f"Withdrawal of ${gross:.2f} queued. First attempt didn't go "
                f"through — we'll retry in about {wait_str}. "
                f"You'll get a notification when it's sent."
            )
        else:
            # attempts==0 means request_withdrawal couldn't even start
            # the inline attempt (e.g. exception caught above). Cron will
            # pick it up on its next run (≤5 min).
            msg = (
                f"Withdrawal of ${gross:.2f} queued. We'll process it within "
                f"the next few minutes and notify you when it's sent."
            )
        return {
            "success":     True,
            "message":     msg,
            "queued":      True,
            "attempts":    attempts,
            "remaining":   remaining,
            "wallet_type": wallet_type,
        }

    if status == "failed_permanent":
        # process_withdrawal hit a wall (structural block, max retries,
        # or net<=0) and refunded the balance. The deduction is reversed
        # and remaining reflects that — tell the user honestly.
        last_error = withdrawal.last_error or "Withdrawal could not be processed"
        return {
            "success":     False,
            "error":       (
                f"Withdrawal couldn't be processed: {last_error}. "
                f"Your ${gross:.2f} has been refunded to your {wallet_type} balance."
            ),
            "refunded":    True,
            "remaining":   remaining,
            "wallet_type": wallet_type,
        }

    if status == "failed_refunded":
        # Admin manually refunded — same shape as failed_permanent.
        return {
            "success":     False,
            "error":       f"This withdrawal was cancelled and refunded by an admin. ${gross:.2f} is back in your {wallet_type} balance.",
            "refunded":    True,
            "remaining":   remaining,
            "wallet_type": wallet_type,
        }

    # Catch-all: processing/failed/anything else — treat as queued.
    return {
        "success":     True,
        "message":     f"Withdrawal of ${gross:.2f} is being processed. You'll get a notification when it completes.",
        "queued":      True,
        "remaining":   remaining,
        "wallet_type": wallet_type,
    }




# ═══════════════════════════════════════════════════════════════
#  MEMBERSHIP AUTO-RENEWAL
# ═══════════════════════════════════════════════════════════════

def _attribute_lead_to_activation(db: Session, user_id: int) -> int:
    """When a user activates Partner membership, match their email to any
    pre-existing MemberLead rows and set attribution_user_id on them.

    This is the join that powers per-page commission attribution on
    /pro/funnels — "this lead came from your Lead Capture page → became
    a paying member → you earned $10". Without this attribution column
    set, the dashboard can't trace conversions back to the page that
    captured them.

    Idempotent: only updates rows where attribution_user_id IS NULL.
    Re-running on every renewal (via initialise_renewal_record) is
    therefore safe — once attribution is set, it stays set.

    Returns the number of MemberLead rows that were attributed (0 if
    the user wasn't anyone's captured lead, or if attribution already
    set on a prior renewal).
    """
    from .database import MemberLead
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.email:
        return 0

    # Case-insensitive email match — capture forms are case-insensitive
    # for the user experience, so we match the same way here.
    # Also exclude self-attribution: a user filling their own form on
    # their own page is testing, not a real conversion. Matches the
    # same guard in the admin backfill endpoint for consistency.
    email_lc = user.email.strip().lower()
    matches = db.query(MemberLead).filter(
        MemberLead.email.ilike(email_lc),
        MemberLead.attribution_user_id.is_(None),
        MemberLead.user_id != user.id,
    ).all()

    if not matches:
        return 0

    now = datetime.utcnow()
    for lead in matches:
        lead.attribution_user_id = user.id
        lead.attribution_set_at = now
        # Update lead status to 'converted' — a converted lead is one
        # whose email matches an active paying member. Useful filter
        # for the leads page ("show me leads who haven't yet activated").
        if lead.status not in ("converted", "unsubscribed"):
            lead.status = "converted"
    db.commit()
    logger.info(
        f"Attributed {len(matches)} MemberLead row(s) to user {user_id} "
        f"on activation (email match: {email_lc})"
    )
    return len(matches)


def initialise_renewal_record(db: Session, user_id: int, source: str = "referral") -> None:
    """Create or update MembershipRenewal when a member first activates.

    Also calls _attribute_lead_to_activation() to backfill the
    MemberLead.attribution_user_id column for any pre-existing leads
    matching this user's email. The attribution call is idempotent —
    safe to re-run on every renewal.
    """
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

    # Lead attribution — wire the new user to any pre-existing
    # MemberLead row matching their email. Runs after the
    # MembershipRenewal commit so any DB error here doesn't roll back
    # the renewal record itself. Idempotent.
    try:
        _attribute_lead_to_activation(db, user_id)
    except Exception as e:
        logger.warning(f"Lead attribution failed for user {user_id}: {e}")


def process_auto_renewals(db: Session) -> dict:
    """
    Called daily (via scheduler or admin endpoint).
    Deducts $20 from wallet for members due renewal.
    Issues 3-day warnings. Lapses after 5-day grace period.
    """
    from datetime import timedelta
    now       = datetime.utcnow()
    results   = {"renewed": [], "warned": [], "lapsed": [], "grace_extended": []}

    def _renewal_email(u, subject, html_body):
        """Best-effort email alongside the in-app notification. Crypto members
        who don't log in daily would otherwise never see a renewal reminder —
        and the manual-renewal crowd are exactly the ones who need warning.
        Never raises: an email failure must not break the renewal cron."""
        try:
            from app.email_utils import send_email
            if u and getattr(u, "email", None):
                send_email(to_email=u.email, subject=subject, html_body=html_body)
        except Exception as _ee:
            import logging
            logging.getLogger(__name__).warning(f"Renewal email to user {getattr(u,'id','?')} failed: {_ee}")

    def _wrap(inner):
        return (f'<div style="font-family:sans-serif;max-width:560px;margin:0 auto;'
                f'background:#0a1438;color:#e8f0fe;border-radius:12px;padding:32px">{inner}'
                f'<p style="color:#64748b;font-size:12px;margin-top:24px">SuperAdPro · '
                f'<a href="https://www.superadpro.com" style="color:#22d3ee">superadpro.com</a></p></div>')

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
            # Use the user's locked price if set (Founder $15), otherwise
            # the standard $20. Same fee logic as the renewal branch below.
            locked = getattr(user, 'membership_price_locked', None)
            user_fee_for_warning = Decimal(str(locked)) if locked is not None else Decimal(str(MEMBERSHIP_FEE))
            if Decimal(str(user.balance or 0)) < user_fee_for_warning and not user.low_balance_warned:
                user.low_balance_warned = True
                results["warned"].append(user.id)
                # Notify the user — best-effort, won't break the renewal cron
                try:
                    from .database import Notification
                    db.add(Notification(
                        user_id=user.id,
                        type="system",
                        icon="⏰",
                        title="Membership renewal in 3 days — top up your balance",
                        message=(f"Your membership renews on {renewal.next_renewal_date.strftime('%d %b')}. "
                                 f"Your wallet balance is below ${user_fee_for_warning:.0f} — top up or your "
                                 f"membership will enter a 5-day grace period."),
                        link="/wallet",
                    ))
                except Exception as exc:
                    import logging
                    logging.getLogger(__name__).warning(f"Renewal warning notification failed for user {user.id}: {exc}")
                _renewal_email(
                    user,
                    "⏰ Your SuperAdPro membership renews in 3 days",
                    _wrap(
                        f'<h2 style="color:#fff;margin:0 0 12px">Renewal in 3 days</h2>'
                        f'<p style="line-height:1.6">Your membership renews on '
                        f'<b>{renewal.next_renewal_date.strftime("%d %b")}</b>, but your wallet balance '
                        f'is below the <b>${user_fee_for_warning:.0f}</b> fee. Top up before then or your '
                        f'membership enters a 5-day grace period.</p>'
                        f'<p style="line-height:1.6">An active membership is required to earn commissions '
                        f'and make withdrawals.</p>'
                        f'<p><a href="https://www.superadpro.com/wallet" style="display:inline-block;'
                        f'background:#22d3ee;color:#0a1438;font-weight:700;text-decoration:none;'
                        f'padding:12px 22px;border-radius:8px;margin-top:8px">Top up your wallet →</a></p>'
                    ),
                )

        # ── Renewal due ─────────────────────────────────────────
        if now >= renewal.next_renewal_date and not renewal.in_grace_period:
            # Compute the actual fee for THIS user. Founders have
            # membership_price_locked = $15 (or whatever's set); Partners
            # have it NULL and pay the standard $20.
            # The sponsor cut stays a flat $10 regardless of buyer price —
            # this mirrors the rule already used in main.py's
            # process_membership_renewal handler (line 7344-7346).
            locked = getattr(user, 'membership_price_locked', None)
            user_fee = Decimal(str(locked)) if locked is not None else Decimal(str(MEMBERSHIP_FEE))
            sponsor_share = Decimal(str(MEMBERSHIP_SPONSOR_SHARE))  # flat $10

            # Respect opt-out: if the member has disabled auto-renewal from
            # balance (set in checkout or via account settings), skip the
            # deduction and go straight to grace period regardless of
            # balance. The grace period notification gives them 5 days to
            # manually renew.
            auto_renew_enabled = bool(getattr(renewal, 'auto_renew_from_balance', True))
            if auto_renew_enabled and Decimal(str(user.balance or 0)) >= user_fee:
                # Sufficient balance — auto-renew. Founder pays $15, Partner
                # pays $20; sponsor always gets flat $10 on renewal.
                # The member-side deduction stays here (rail-specific: this is
                # the wallet rail, so we debit the on-platform balance).
                user.balance      = Decimal(str(user.balance or 0)) - user_fee
                user.low_balance_warned = False

                # Sponsor commission + company-share row go through the shared
                # engine (28 May 2026) so this rail and the Stripe rail can't
                # diverge. period_key makes it idempotent per member-month
                # across both rails. The engine handles free-sponsor offer +
                # cha-ching email exactly like activation.
                period_key = f"renewal:{user.id}:{now.strftime('%Y-%m')}"
                pay_renewal_commission(db, user, period_key=period_key, rail="wallet")

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
                try:
                    from .database import Notification
                    db.add(Notification(
                        user_id=user.id,
                        type="system",
                        icon="⚠️",
                        title="Membership in grace period — 5 days to renew",
                        message=(f"Your membership renewal failed (insufficient wallet balance). "
                                 f"You have 5 days to top up before your account becomes inactive. "
                                 f"Active membership is required for commissions and withdrawals."),
                        link="/wallet",
                    ))
                except Exception as exc:
                    import logging
                    logging.getLogger(__name__).warning(f"Grace period notification failed for user {user.id}: {exc}")
                _renewal_email(
                    user,
                    "⚠️ Action needed — your SuperAdPro membership is in its grace period",
                    _wrap(
                        f'<h2 style="color:#fff;margin:0 0 12px">5 days to renew</h2>'
                        f'<p style="line-height:1.6">Your membership renewal didn\'t go through '
                        f'(not enough wallet balance). You have <b>5 days</b> to renew before your '
                        f'account becomes inactive — after which commissions and withdrawals are paused '
                        f'until you reactivate.</p>'
                        f'<p style="line-height:1.6">Top up your wallet to auto-renew, or renew now '
                        f'with USDT or card.</p>'
                        f'<p><a href="https://www.superadpro.com/upgrade" style="display:inline-block;'
                        f'background:#22d3ee;color:#0a1438;font-weight:700;text-decoration:none;'
                        f'padding:12px 22px;border-radius:8px;margin-top:8px">Renew now →</a></p>'
                    ),
                )

        # ── Grace period expired (5 days) ───────────────────────
        elif renewal.in_grace_period and renewal.grace_period_start:
            grace_expired = renewal.grace_period_start + timedelta(days=5)
            if now >= grace_expired:
                user.is_active          = False
                renewal.in_grace_period = False
                results["lapsed"].append(user.id)
                try:
                    from .database import Notification
                    db.add(Notification(
                        user_id=user.id,
                        type="system",
                        icon="🔒",
                        title="Membership lapsed",
                        message=("Your membership has lapsed because the grace period ended without renewal. "
                                 "Reactivate any time on /upgrade — your existing data is preserved."),
                        link="/upgrade",
                    ))
                except Exception as exc:
                    import logging
                    logging.getLogger(__name__).warning(f"Lapse notification failed for user {user.id}: {exc}")
                _renewal_email(
                    user,
                    "🔒 Your SuperAdPro membership has lapsed",
                    _wrap(
                        f'<h2 style="color:#fff;margin:0 0 12px">Membership lapsed</h2>'
                        f'<p style="line-height:1.6">Your grace period ended without a renewal, so your '
                        f'membership has lapsed. Commissions and withdrawals are paused until you '
                        f'reactivate — but <b>your data, team and earnings history are all preserved</b>.</p>'
                        f'<p style="line-height:1.6">Reactivate any time with USDT or card:</p>'
                        f'<p><a href="https://www.superadpro.com/upgrade" style="display:inline-block;'
                        f'background:#22d3ee;color:#0a1438;font-weight:700;text-decoration:none;'
                        f'padding:12px 22px;border-radius:8px;margin-top:8px">Reactivate →</a></p>'
                    ),
                )

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
