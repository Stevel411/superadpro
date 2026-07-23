"""
AdvantageLife — P2P pack settlement flow.
=========================================
Ties the pass-up engine (al_engine) to the P2PIntent lifecycle. Pack sales are
100% member-to-member: the platform RESOLVES who to pay and records proof, it
never holds the funds.

  create_intent(db, buyer_id, pack_level)
      -> resolve + LOCK the payee (via al_engine), snapshot their payout method,
         write a P2PIntent(pending). The buyer is shown exactly who to pay.
  submit_proof(db, intent_id, tx_ref/proof_url)
      -> buyer records how they paid; status -> proof_submitted.
  confirm(db, intent_id, confirmed_by)
      -> honour the LOCKED payee (the buyer already paid them), commit the sale
         (seller counter++, buyer pass-up wired, PackCommission written), create
         the active PackPurchase, mark commission paid; status -> confirmed.

The payee is locked at intent so the person the buyer paid is exactly the person
credited, even though the seller's counter only advances on confirmation.
"""
import json
from datetime import datetime

from sqlalchemy.orm import Session

from . import passup_engine as pe
from . import al_engine

# Company-routed pack commissions (unqualified sponsor + no qualified upline)
# are assigned to the AdvantageLife house account (user 1). Steve's decision
# 11 Jul 2026: "if they don't have a pack the revenue goes to me at
# AdvantageLife." This gives company sales a real payee with a real /my-sales
# queue + payout wallet, so the buyer's pack always has a confirmation path
# (previously earner_id was set to NULL — a settlement dead-end that left the
# buyer waiting forever).
AL_HOUSE_USER_ID = 1
from .database import (User, CampaignPack, PackPurchase, PackCommission,
                       P2PIntent, PayoutMethod, VideoCampaign,
                       CAMPAIGN_GRACE_DAYS)


def _default_payout(db: Session, user_id):
    """The earner's default payout method (how the buyer pays them), as a dict.
    Kept for callers that only need the single default."""
    if user_id is None:
        return None
    pm = (db.query(PayoutMethod)
            .filter(PayoutMethod.user_id == user_id, PayoutMethod.is_default == True).first()
          or db.query(PayoutMethod).filter(PayoutMethod.user_id == user_id).first())
    if pm is None:
        return None
    return {"method_type": pm.method_type, "details": pm.details}


def _all_payouts(db: Session, user_id):
    """ALL of the earner's payout methods (Option A: the buyer picks which one
    to pay). Default first. Returns a list of dicts; empty if none on file."""
    if user_id is None:
        return []
    rows = (db.query(PayoutMethod)
              .filter(PayoutMethod.user_id == user_id)
              .order_by(PayoutMethod.is_default.desc(), PayoutMethod.id.asc()).all())
    return [{"method_type": r.method_type, "details": r.details,
             "is_default": bool(r.is_default)} for r in rows]


def create_intent(db: Session, buyer_user_id: int, pack_level: int, do_commit: bool = True):
    """Resolve + lock the payee for a buyer's pack purchase and open a P2PIntent."""
    buyer = db.query(User).filter(User.id == buyer_user_id).first()
    pack = db.query(CampaignPack).filter(
        CampaignPack.level == pack_level, CampaignPack.is_active == True).first()
    if buyer is None or pack is None:
        raise ValueError("buyer or pack not found")

    # Consumable-pack buy-block: a pack is a running campaign. You can't buy the
    # same level again while yours is still active — it must run its course (hit
    # its view target) and pass its grace window first. Admins are exempt (they
    # own everything via the sentinel and never hold blocking rows). Run the lazy
    # expiry first so a completed-and-past-grace pack doesn't wrongly block.
    if not buyer.is_admin:
        al_engine._expire_overdue_packs(db, buyer_user_id)
        active_same = (db.query(PackPurchase)
                         .filter(PackPurchase.user_id == buyer_user_id,
                                 PackPurchase.pack_level == pack_level,
                                 PackPurchase.status == "active").first())
        if active_same is not None:
            raise ValueError(
                f"You already have an active ${pack_level} campaign. It must finish "
                f"delivering its views before you can buy this level again.")

    seller = None
    if buyer.sponsor_id is not None:
        seller = db.query(User).filter(User.id == buyer.sponsor_id).first()

    if seller is None:
        res = {"earner_id": pe.COMPANY, "type": "direct_company",
               "sale_number": 0, "chain": None, "pass_up_depth": 0}
    else:
        res = al_engine.resolve_payee(db, seller.id, pack_level)

    earner_id = AL_HOUSE_USER_ID if res["earner_id"] == pe.COMPANY else res["earner_id"]
    payee_snapshot = _all_payouts(db, earner_id)   # Option A: lock ALL the seller's methods; buyer picks one

    intent = P2PIntent(
        buyer_id=buyer_user_id, earner_id=earner_id,
        pack_id=pack.id, pack_level=pack_level, amount=pack.price,
        status="pending",
        payee_snapshot=json.dumps(payee_snapshot) if payee_snapshot else None,
        commission_type=res["type"], pass_up_depth=res.get("pass_up_depth", 0),
        source_chain=res.get("chain"), notes=f"sale#{res.get('sale_number')}",
        created_at=datetime.utcnow(),
    )
    db.add(intent)
    if do_commit:
        db.commit()
    return intent


def submit_proof(db: Session, intent_id: int, tx_ref: str = None,
                 proof_url: str = None, do_commit: bool = True):
    """Buyer records how they paid; intent moves to proof_submitted."""
    intent = db.query(P2PIntent).filter(P2PIntent.id == intent_id).first()
    if intent is None or intent.status not in ("pending", "proof_submitted"):
        raise ValueError("intent not open for proof")

    # Build-spec §2.2: a proof reference must be unique across the table.
    # Without this a buyer can paste the SAME on-chain tx hash as proof for
    # several intents — one real payment, several packs — and a seller who
    # confirms without re-checking the chain hands over goods for free. The
    # seller's confirm step is the only other line of defence and the whole
    # model rests on it, so this is enforced here rather than assumed.
    # Application-level rather than a DB constraint: the table is live with
    # existing rows and a unique index would fail the deploy if any dupes
    # already exist. See §8 case (9).
    if tx_ref:
        ref = tx_ref.strip()
        if ref:
            clash = (db.query(P2PIntent.id)
                       .filter(P2PIntent.tx_ref == ref,
                               P2PIntent.id != intent_id)
                       .first())
            if clash:
                raise ValueError(
                    "That transaction reference has already been submitted for "
                    "another purchase. Each payment can only be used once."
                )
            tx_ref = ref

    intent.tx_ref = tx_ref
    intent.proof_url = proof_url
    intent.status = "proof_submitted"
    intent.submitted_at = datetime.utcnow()
    if do_commit:
        db.commit()
    return intent


def confirm(db: Session, intent_id: int, confirmed_by: int = None, do_commit: bool = True):
    """Payee (or admin) confirms receipt. Honours the locked payee, commits the
    sale through the engine, activates the pack, marks the commission paid."""
    intent = db.query(P2PIntent).filter(P2PIntent.id == intent_id).first()
    if intent is None or intent.status == "confirmed":
        raise ValueError("intent not confirmable")

    # activate the buyer's pack
    pack_row = db.query(CampaignPack).filter(CampaignPack.id == intent.pack_id).first()
    _dwr = (pack_row.daily_watch_required if pack_row and pack_row.daily_watch_required is not None else 1)
    # The buyer created their ad BEFORE payment (reorder): the campaign is parked
    # on the intent in status='pending'. On confirm it goes LIVE and moves onto
    # the new pack. If (legacy path) no pending campaign exists, campaign_id stays
    # NULL and the pack shows "needs ad".
    pending_campaign = None
    if intent.campaign_id:
        pending_campaign = db.query(VideoCampaign).filter(VideoCampaign.id == intent.campaign_id).first()
    purchase = PackPurchase(
        user_id=intent.buyer_id, pack_id=intent.pack_id, pack_level=intent.pack_level,
        amount=intent.amount, payment_method="p2p", status="active",
        tx_ref=intent.tx_ref, activated_at=datetime.utcnow(), created_at=datetime.utcnow(),
        source="purchase", daily_watch_required=_dwr,
        campaign_id=(pending_campaign.id if pending_campaign else None),
    )
    db.add(purchase)
    db.flush()  # need purchase.id

    # Flip the pre-created ad live so it enters the watch feed now that the sale
    # is confirmed.
    if pending_campaign is not None and pending_campaign.status == "pending":
        pending_campaign.status = "active"

    # honour the payee LOCKED at intent (the buyer already paid them)
    locked = {
        "earner_id": (intent.earner_id if intent.earner_id is not None else pe.COMPANY),
        "type": intent.commission_type, "sale_number": None,
        "chain": intent.source_chain, "pass_up_depth": intent.pass_up_depth or 0,
    }
    al_engine.commit_sale(db, intent.buyer_id, intent.pack_level, amount=intent.amount,
                          purchase_id=purchase.id, resolution=locked, do_commit=False)

    # mark the commission just written for this purchase as paid
    comm = (db.query(PackCommission)
              .filter(PackCommission.purchase_id == purchase.id)
              .order_by(PackCommission.id.desc()).first())
    if comm is not None:
        comm.status = "paid"

    intent.status = "confirmed"
    intent.confirmed_at = datetime.utcnow()
    intent.confirmed_by = confirmed_by
    if do_commit:
        db.commit()

    return {"intent_id": intent.id, "purchase_id": purchase.id,
            "earner_id": intent.earner_id, "commission_type": intent.commission_type,
            "amount": float(intent.amount)}
