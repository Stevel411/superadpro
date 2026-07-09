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
from .database import (User, CampaignPack, PackPurchase, PackCommission,
                       P2PIntent, PayoutMethod)


def _default_payout(db: Session, user_id):
    """The earner's default payout method (how the buyer pays them), as a dict."""
    if user_id is None:
        return None
    pm = (db.query(PayoutMethod)
            .filter(PayoutMethod.user_id == user_id, PayoutMethod.is_default == True).first()
          or db.query(PayoutMethod).filter(PayoutMethod.user_id == user_id).first())
    if pm is None:
        return None
    return {"method_type": pm.method_type, "details": pm.details}


def create_intent(db: Session, buyer_user_id: int, pack_level: int, do_commit: bool = True):
    """Resolve + lock the payee for a buyer's pack purchase and open a P2PIntent."""
    buyer = db.query(User).filter(User.id == buyer_user_id).first()
    pack = db.query(CampaignPack).filter(
        CampaignPack.level == pack_level, CampaignPack.is_active == True).first()
    if buyer is None or pack is None:
        raise ValueError("buyer or pack not found")

    seller = None
    if buyer.sponsor_id is not None:
        seller = db.query(User).filter(User.id == buyer.sponsor_id).first()

    if seller is None:
        res = {"earner_id": pe.COMPANY, "type": "direct_company",
               "sale_number": 0, "chain": None, "pass_up_depth": 0}
    else:
        res = al_engine.resolve_payee(db, seller.id, pack_level)

    earner_id = None if res["earner_id"] == pe.COMPANY else res["earner_id"]
    payee_snapshot = _default_payout(db, earner_id)

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
    purchase = PackPurchase(
        user_id=intent.buyer_id, pack_id=intent.pack_id, pack_level=intent.pack_level,
        amount=intent.amount, payment_method="p2p", status="active",
        tx_ref=intent.tx_ref, activated_at=datetime.utcnow(), created_at=datetime.utcnow(),
    )
    db.add(purchase)
    db.flush()  # need purchase.id

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
