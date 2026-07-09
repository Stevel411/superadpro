"""
AdvantageLife — DB integration layer for the 3/6/9 pass-up engine.
=================================================================
Bridges the PURE decision core (app/passup_engine.py) to the live SQLAlchemy
models, so the proven money logic stays framework-free and testable:

  owned pack level   <-  PackPurchase (status='active')  — highest level held
  watch-qualified    <-  WatchQuota   (today's watch met, not paused)
  pass-up tree       <-  User.sponsor_id / User.pass_up_sponsor_id
  sale counter       <-  User.pack_sale_count
  audit trail        ->  PackCommission

Two entry points mirror the pure core:
  resolve_payee(db, seller_user_id, pack_level)      -> who WOULD earn (pre-pay)
  commit_sale(db, buyer_user_id, pack_level, amount) -> settle on confirmation

`seller_user_id` is the buyer's sponsor — the member whose sale this is.
COMPANY (pe.COMPANY sentinel) means the commission falls to the platform.
"""
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import passup_engine as pe
from .database import User, PackPurchase, PackCommission, WatchQuota

_ADMIN_LEVEL = 10 ** 9  # admin/master owns every level


# ── Gate inputs (DB-backed) ────────────────────────────────────────────
def owned_level(db: Session, user_id: int) -> int:
    """Highest ACTIVE pack level the user owns ($). Admin owns everything."""
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        return 0
    if u.is_admin:
        return _ADMIN_LEVEL
    top = db.query(func.max(PackPurchase.pack_level)).filter(
        PackPurchase.user_id == user_id,
        PackPurchase.status == "active",
    ).scalar()
    return int(top or 0)


def watch_qualified(db: Session, user_id: int) -> bool:
    """Watch-to-Earn gate: today's watch quota met and commissions not paused.
    Admin bypasses. Mirrors the daily-watch rule tracked in WatchQuota."""
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        return False
    if u.is_admin:
        return True
    q = db.query(WatchQuota).filter(WatchQuota.user_id == user_id).first()
    if q is None:
        return False
    today = datetime.utcnow().strftime("%Y-%m-%d")
    return (not q.commissions_paused) and q.today_date == today \
        and (q.today_watched or 0) >= (q.daily_required or 1)


# ── Build a pure-engine Member view from a real user row ───────────────
def _member(db: Session, user_id, cache: dict):
    if user_id in cache:
        return cache[user_id]
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        cache[user_id] = None
        return None
    m = pe.Member(
        id=u.id,
        sponsor_id=u.sponsor_id,
        pass_up_sponsor_id=u.pass_up_sponsor_id,
        pack_sale_count=u.pack_sale_count or 0,
        owned_level=owned_level(db, user_id),
        watch_qualified=watch_qualified(db, user_id),
    )
    cache[user_id] = m
    return m


# ── Resolution (pre-payment): who WOULD earn this sale ─────────────────
def resolve_payee(db: Session, seller_user_id: int, pack_level: int) -> dict:
    """Build the seller + their pass-up chain as engine Members, then defer to
    the pure core. `earner_id` comes back as a real user_id or pe.COMPANY."""
    cache: dict = {}
    seller = _member(db, seller_user_id, cache)
    if seller is None:
        return {"earner_id": pe.COMPANY, "type": "direct_company",
                "sale_number": 1, "chain": None, "pass_up_depth": 0}
    # materialise the pass-up chain so the pure core's members.get() resolves
    node, depth = seller.pass_up_sponsor_id, 0
    while node is not None and depth < pe.MAX_CASCADE_DEPTH:
        mv = _member(db, node, cache)
        if mv is None:
            break
        node = mv.pass_up_sponsor_id
        depth += 1
    members = {uid: m for uid, m in cache.items() if m is not None}
    return pe.resolve_payee(members, seller_user_id, pack_level)


# ── Commit (on confirmation): wire, count, write audit row ─────────────
def commit_sale(db: Session, buyer_user_id: int, pack_level: int,
                amount=None, purchase_id: int = None, do_commit: bool = True) -> dict:
    """Settle a confirmed pack sale:
      1. resolve the payee (seller = buyer's sponsor),
      2. wire the buyer's pass-up target SET-ONCE (migrated members keep theirs),
      3. increment the seller's sale counter,
      4. write a PackCommission audit row.
    Returns the resolution dict."""
    buyer = db.query(User).filter(User.id == buyer_user_id).first()
    seller = None
    if buyer is not None and buyer.sponsor_id is not None:
        seller = db.query(User).filter(User.id == buyer.sponsor_id).first()

    if seller is None:
        res = {"earner_id": pe.COMPANY, "type": "direct_company",
               "sale_number": 0, "chain": None, "pass_up_depth": 0}
        _write_commission(db, purchase_id, buyer_user_id, res, pack_level, amount)
        if do_commit:
            db.commit()
        return res

    res = resolve_payee(db, seller.id, pack_level)

    # wire the buyer's pass-up target once (do not re-wire on repeat purchases,
    # and never overwrite a migrated member's derived target)
    if buyer.pass_up_sponsor_id is None:
        slot = (seller.pack_sale_count or 0) + 1
        buyer.pass_up_sponsor_id = (seller.pass_up_sponsor_id
                                    if slot in pe.PASSUP_POSITIONS else seller.id)

    seller.pack_sale_count = (seller.pack_sale_count or 0) + 1
    _write_commission(db, purchase_id, buyer_user_id, res, pack_level, amount)
    if do_commit:
        db.commit()
    return res


def _write_commission(db, purchase_id, buyer_id, res, pack_level, amount):
    earner = None if res["earner_id"] == pe.COMPANY else res["earner_id"]
    db.add(PackCommission(
        purchase_id=purchase_id,
        buyer_id=buyer_id,
        earner_id=earner,
        amount=amount,
        pack_level=pack_level,
        commission_type=res["type"],
        pass_up_depth=res.get("pass_up_depth", 0),
        source_chain=res.get("chain"),
        status="pending",
        notes=f"sale#{res.get('sale_number')}",
    ))
