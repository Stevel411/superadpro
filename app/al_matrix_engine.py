"""
AdvantageLife — Matrix plan commission engine (Phase 2).

Given a CONFIRMED matrix-plan pack purchase, this places the buyer (Phase 1) and
accrues the level commissions up the buyer's 5-level window, writing them to the
append-only MatrixCommission ledger.

Split (locked): L1 15% · L2 15% · L3 15% · L4 15% · L5 20% — company 20% base.

Qualification (both required, per level):
  * owns an ACTIVE (non-expired) pack of that matrix's tier, AND
  * watch-qualified (reuses al_engine.watch_qualified, incl. the 48h grace).

Compression (within the 5-level window):
  For each level k (1..5) the payee is the level-k upline if qualified; if not,
  that level's share rolls UP to the nearest qualified upline still inside the
  window; if none is found, the share falls to the company. A qualified member
  therefore absorbs the shares of any unqualified members below them in the
  window — a direct incentive to stay qualified.

SAFEGUARDS (this is money):
  * Earnings are DERIVED — balances are computed by summing ledger rows; there is
    no writable matrix-wallet field to tamper with.
  * A commission can only be created here, from a real purchase record; amounts
    are computed from the canonical CampaignPack price, never from client input.
  * Idempotent per purchase — a replayed confirmation writes nothing new.
  * Every purchase's rows sum to the full pack price (5 level rows + 1 company
    base row), so the ledger reconciles exactly against money received.

Phase 2 is the engine only. Wiring it to a verified CoinPayments payment-in
(so the ONLY trigger is real money arriving) is Phase 5.
"""
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import User, PackPurchase, CampaignPack, MatrixCommission
import app.al_matrix as al_matrix

# L1..L5 shares of the pack price. Company keeps the remaining 20% (base) plus
# anything that falls through compression.
MATRIX_LEVEL_PCT = [Decimal("0.15"), Decimal("0.15"), Decimal("0.15"),
                    Decimal("0.15"), Decimal("0.20")]
COMPANY_BASE_PCT = Decimal("0.20")
EARN_DEPTH = 5

_CENT = Decimal("0.000001")   # Money is Numeric(18,6)


def _q(x) -> Decimal:
    return Decimal(str(x)).quantize(_CENT, rounding=ROUND_HALF_UP)


def _tier_price(db: Session, tier: int) -> Decimal:
    """Canonical price for a tier, read from campaign_packs (single source of
    truth — cannot drift, and never taken from client input)."""
    pack = (db.query(CampaignPack)
              .filter(CampaignPack.level == tier)
              .order_by(CampaignPack.id.asc())
              .first())
    if not pack:
        raise ValueError(f"_tier_price: no campaign pack at tier {tier}")
    return _q(pack.price)


def default_is_qualified(db: Session, user_id: int, tier: int) -> bool:
    """Real qualification gate: owns an active pack at this tier AND is
    watch-qualified. (Callers may inject their own predicate for testing.)"""
    owns = (db.query(PackPurchase)
              .filter(PackPurchase.user_id == user_id,
                      PackPurchase.pack_level == tier,
                      PackPurchase.status == "active")
              .first() is not None)
    if not owns:
        return False
    try:
        import app.al_engine as eng
        return bool(eng.watch_qualified(db, user_id))
    except Exception:
        return False


def _resolve_level_payee(level_user: dict, qualified_ids: set, k: int):
    """Payee for level k's share. Returns (earner_id_or_None, compressed_from).
    Rolls up within the window to the nearest qualified upline; None => company."""
    holder_k = level_user.get(k)
    for j in range(k, EARN_DEPTH + 1):
        uid = level_user.get(j)
        if uid is None:
            break                    # chain ended inside the window
        if uid in qualified_ids:
            return uid, (holder_k if j != k else None)
    return None, holder_k            # company; record the original holder for audit


def commit_matrix_sale(db: Session, purchase: PackPurchase,
                       is_qualified=None, commit: bool = True):
    """Place the buyer and accrue matrix commissions for a confirmed purchase.

    `is_qualified` is an optional predicate fn(user_id) -> bool (used in tests);
    it defaults to the real owns-tier + watch-qualified gate. Idempotent: if
    commissions already exist for this purchase, they are returned unchanged.
    """
    existing = (db.query(MatrixCommission)
                  .filter(MatrixCommission.purchase_id == purchase.id)
                  .all())
    if existing:
        return existing

    tier = purchase.pack_level
    price = _tier_price(db, tier)
    if is_qualified is None:
        def is_qualified(uid, _t=tier):
            return default_is_qualified(db, uid, _t)

    # place the buyer (idempotent) and read the 5-level upline window
    pos = al_matrix.place(db, purchase.user_id, tier, commit=False)
    chain = al_matrix.upline_chain(db, pos, depth=EARN_DEPTH)   # [(1, parent_pos), ...]
    level_user = {lvl: p.user_id for lvl, p in chain}
    qualified_ids = {uid for uid in level_user.values() if is_qualified(uid)}

    rows = []
    company_from_levels = Decimal("0")
    for k in range(1, EARN_DEPTH + 1):
        share = _q(price * MATRIX_LEVEL_PCT[k - 1])
        payee, comp_from = _resolve_level_payee(level_user, qualified_ids, k)
        if payee is None:
            company_from_levels += share
        rows.append(MatrixCommission(
            purchase_id=purchase.id, tier=tier, buyer_id=purchase.user_id,
            earner_id=payee, level=k, amount=share,
            is_company=(payee is None), compressed_from=comp_from,
            status="accrued", tx_ref=getattr(purchase, "tx_ref", None)))

    # company base 20% (kept regardless) — recorded so the ledger reconciles to price
    rows.append(MatrixCommission(
        purchase_id=purchase.id, tier=tier, buyer_id=purchase.user_id,
        earner_id=None, level=0, amount=_q(price * COMPANY_BASE_PCT),
        is_company=True, compressed_from=None, status="accrued",
        tx_ref=getattr(purchase, "tx_ref", None)))

    db.add_all(rows)
    if commit:
        db.commit()
    else:
        db.flush()
    return rows


# ── derived reads (never a stored balance) ─────────────────────────────────
def matrix_earned(db: Session, user_id: int,
                  statuses=("accrued", "payable", "paid")) -> Decimal:
    """A member's matrix earnings, computed live from the ledger."""
    v = (db.query(func.coalesce(func.sum(MatrixCommission.amount), 0))
           .filter(MatrixCommission.earner_id == user_id,
                   MatrixCommission.status.in_(statuses))
           .scalar())
    return _q(v or 0)


def company_take(db: Session, tier: int = None) -> Decimal:
    """Total company share (base + fall-through), optionally for one tier."""
    q = (db.query(func.coalesce(func.sum(MatrixCommission.amount), 0))
           .filter(MatrixCommission.earner_id.is_(None)))
    if tier is not None:
        q = q.filter(MatrixCommission.tier == tier)
    return _q(q.scalar() or 0)


def purchase_reconciles(db: Session, purchase_id: int) -> bool:
    """Reconciliation safeguard: a purchase's commission rows must sum to the
    full pack price. Any drift means fabricated or missing rows."""
    rows = (db.query(MatrixCommission)
              .filter(MatrixCommission.purchase_id == purchase_id).all())
    if not rows:
        return True
    tier = rows[0].tier
    total = sum((Decimal(str(r.amount)) for r in rows), Decimal("0"))
    return _q(total) == _tier_price(db, tier)


def activate_and_commit(db, order, is_qualified=None, commit=True):
    """On a COMPLETED CoinPayments order (the verified payment-in), activate the
    buyer's pack + ad and accrue matrix commissions. Idempotent — safe to call
    again on a retried IPN (returns the existing purchase, writes nothing new).

    This is the ONLY path that turns a matrix payment into commissions, and it
    only runs once an IPN has been HMAC-verified upstream.
    """
    from app.database import PackPurchase, CampaignPack, VideoCampaign
    try:
        from app.database import DAILY_WATCH_BY_TIER as _DWR
    except Exception:
        _DWR = {}

    if order.status == "complete" and order.purchase_id:
        return db.query(PackPurchase).filter(PackPurchase.id == order.purchase_id).first()

    tier = order.pack_level
    pack = (db.query(CampaignPack).filter(CampaignPack.level == tier)
              .order_by(CampaignPack.id.asc()).first())
    dwr = None
    try:
        dwr = _DWR.get(tier)
    except Exception:
        dwr = None

    # bring the buyer's pre-built ad live (pack-backed = legitimate to show)
    camp = (db.query(VideoCampaign)
              .filter(VideoCampaign.user_id == order.user_id,
                      VideoCampaign.status == "draft",
                      VideoCampaign.embed_url != "")
              .order_by(VideoCampaign.id.asc()).first())

    purchase = PackPurchase(
        user_id=order.user_id, pack_id=(pack.id if pack else None), pack_level=tier,
        amount=order.amount_usd, payment_method="coinpayments", status="active",
        tx_ref=(order.txn_id or order.internal_order_id),
        activated_at=datetime.utcnow(), created_at=datetime.utcnow(),
        source="purchase", daily_watch_required=dwr,
        campaign_id=(camp.id if camp else None))
    db.add(purchase)
    db.flush()

    if camp is not None and camp.status in ("draft", "pending"):
        camp.status = "active"
        if hasattr(camp, "share_approved"):
            camp.share_approved = True
        if getattr(camp, "share_approved_at", None) is None:
            try:
                camp.share_approved_at = datetime.utcnow()
            except Exception:
                pass

    # accrue matrix commissions off the confirmed purchase (idempotent per purchase)
    commit_matrix_sale(db, purchase, is_qualified=is_qualified, commit=False)

    order.purchase_id = purchase.id
    order.status = "complete"
    order.completed_at = datetime.utcnow()
    if commit:
        db.commit()
    else:
        db.flush()
    return purchase


# ── back-office matrix view data (reads real positions) ────────────────────
_TIER_NAMES = {1:"Launchpad",2:"Starter",3:"Builder",4:"Pro",5:"Advanced",
               6:"Premium",7:"Elite",8:"Master",9:"Champion"}
_TIER_PRICE = {1:10,2:20,3:50,4:100,5:200,6:400,7:600,8:800,9:1000}


def owned_tiers(db, user):
    """Tiers this member can view a matrix for: any with an active pack; admins see all."""
    from app.database import PackPurchase
    if getattr(user, "is_admin", False):
        return list(range(1, 10))
    rows = (db.query(PackPurchase.pack_level)
              .filter(PackPurchase.user_id == user.id, PackPurchase.status == "active")
              .distinct().all())
    tiers = sorted({int(r[0]) for r in rows})
    return tiers or []


def matrix_view_tree(db, user, tier, depth=EARN_DEPTH):
    """Nested tree of the member's matrix for `tier`, YOU at the root, down `depth`
    levels. Node: {name,kind,depth,kids} where kind = d(irect referral) | s(pillover);
    empty slots become {open:True}. Reads live matrix_positions."""
    from app.database import MatrixPosition, User as _U
    uname_cache = {}
    def uname(uid):
        if uid not in uname_cache:
            u = db.query(_U).filter(_U.id == uid).first()
            uname_cache[uid] = (u.username if u and u.username else "member")
        return uname_cache[uid]

    def children_of(pos_id):
        return (db.query(MatrixPosition)
                  .filter(MatrixPosition.tier == tier, MatrixPosition.parent_id == pos_id)
                  .order_by(MatrixPosition.slot.asc(), MatrixPosition.id.asc()).all())

    def build_kids(pos, d):
        if d >= depth:
            return []
        byslot = {int(c.slot): c for c in children_of(pos.id)}
        out = []
        for slot in range(3):
            c = byslot.get(slot)
            if c:
                kind = "d" if c.sponsor_id == user.id else "s"
                out.append({"name": uname(c.user_id), "kind": kind,
                            "depth": d + 1, "kids": build_kids(c, d + 1)})
            else:
                out.append({"open": True})
        return out

    pos = al_matrix.get_position(db, user.id, tier)
    kids = build_kids(pos, 0) if pos else [{"open": True}, {"open": True}, {"open": True}]
    return {"you": True, "kids": kids}


def matrix_view_stats(db, user, tier, tree):
    """Counts for the stat strip, computed from the tree + ledger."""
    filled = [0]; front = [0]; spill = [0]
    def walk(node, lvl):
        for k in node.get("kids", []):
            if k.get("open"):
                continue
            filled[0] += 1
            if lvl == 0:
                front[0] += 1
            if k.get("kind") == "s":
                spill[0] += 1
            walk(k, lvl + 1)
    walk(tree, 0)
    return {"filled": filled[0], "front": front[0], "spillover": spill[0],
            "earned": float(matrix_earned(db, user.id))}
