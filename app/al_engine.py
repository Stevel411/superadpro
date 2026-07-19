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
from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import passup_engine as pe
from .database import User, PackPurchase, PackCommission, WatchQuota, PayoutMethod, P2PIntent, ShareLink

_ADMIN_LEVEL = 10 ** 9  # admin/master owns every level


# ── Gate inputs (DB-backed) ────────────────────────────────────────────
SHARE_WINDOW_DAYS = 7  # a member must share their showcase within this rolling
                       # window to keep their packs ACTIVE (Steve, 18 Jul 2026)


def share_qualified(db: Session, user_id: int) -> bool:
    """True if the member has shared their showcase within the rolling 7-day
    window (or is admin). Drives package pause/resume — NOT a withdrawal gate."""
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        return False
    if u.is_admin:
        return True
    link = db.query(ShareLink).filter(ShareLink.user_id == user_id).first()
    if link is None or link.last_shared_at is None:
        return False
    return link.last_shared_at >= (datetime.utcnow() - timedelta(days=SHARE_WINDOW_DAYS))


def _apply_share_pause(db: Session, user_id: int) -> None:
    """Pause/resume the member's RUNNING packs based on share status. Pause is
    reversible: a paused pack stops delivering + earning, but views_delivered is
    preserved and it resumes the instant they share. Only affects packs that
    are running (active, have an ad, not completed/in-grace). Evaluated lazily
    from owned_level so it's always current without a scheduler."""
    u = db.query(User).filter(User.id == user_id).first()
    if u is None or u.is_admin:
        return
    qualified = share_qualified(db, user_id)
    rows = (db.query(PackPurchase)
              .filter(PackPurchase.user_id == user_id,
                      PackPurchase.status.in_(("active", "paused")),
                      PackPurchase.campaign_id.isnot(None),        # has an ad (running)
                      PackPurchase.completed_at.is_(None))         # not completed/in-grace
              .all())
    changed = False
    for r in rows:
        camp = None
        if r.campaign_id:
            from .database import VideoCampaign
            camp = db.query(VideoCampaign).filter(VideoCampaign.id == r.campaign_id).first()
        if not qualified and r.status == "active":
            r.status = "paused"
            # Pause the ad too so it leaves the watch feed and stops accruing
            # views. views_delivered is preserved — it resumes where it left off.
            if camp is not None and camp.status == "active":
                camp.status = "paused"
            changed = True
        elif qualified and r.status == "paused":
            r.status = "active"
            if camp is not None and camp.status == "paused":
                camp.status = "active"
            changed = True
    if changed:
        db.commit()


def owned_level(db: Session, user_id: int) -> int:
    """Highest ACTIVE pack level the user owns ($). Admin owns everything."""
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        return 0
    if u.is_admin:
        return _ADMIN_LEVEL
    # Lazily expire past-grace packs and apply the weekly-share pause/resume, so
    # the earn gate always reflects current reality without a scheduler.
    _expire_overdue_packs(db, user_id)
    _apply_share_pause(db, user_id)
    top = db.query(func.max(PackPurchase.pack_level)).filter(
        PackPurchase.user_id == user_id,
        PackPurchase.status == "active",
    ).scalar()
    return int(top or 0)


def _expire_overdue_packs(db: Session, user_id: int = None) -> int:
    """Flip active packs to 'expired' once their post-completion grace window has
    passed. Called lazily from the earn gate (owned_level) and the buy gate
    (create_intent) so expiry is evaluated exactly when it's consulted — no
    background scheduler needed. Admin packs are never auto-expired (admins own
    everything via the sentinel anyway, but be safe). Returns count expired."""
    now = datetime.utcnow()
    q = (db.query(PackPurchase)
           .filter(PackPurchase.status == "active",
                   PackPurchase.grace_expires_at.isnot(None),
                   PackPurchase.grace_expires_at < now))
    if user_id is not None:
        q = q.filter(PackPurchase.user_id == user_id)
    rows = q.all()
    n = 0
    for r in rows:
        u = db.query(User).filter(User.id == r.user_id).first()
        if u is not None and u.is_admin:
            continue
        r.status = "expired"
        r.expired_at = now
        n += 1
    if n:
        db.commit()
    return n


WATCH_GRACE_HOURS = 48  # a member stays watch-qualified for 48h after meeting quota
                        # — fixes the time-zone unfairness (a sale can't skip you just
                        # because you hadn't done today's watch YET). Steve, 9 Jul 2026.


def watch_qualified(db: Session, user_id: int) -> bool:
    """Watch-to-Earn gate WITH the 48h grace window. Qualified if EITHER today's
    quota is met OR the member met quota within the last ~48h. Admin bypasses.
    Commissions-paused always fails."""
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        return False
    if u.is_admin:
        return True
    q = db.query(WatchQuota).filter(WatchQuota.user_id == user_id).first()
    if q is None or q.commissions_paused:
        return False
    today = datetime.utcnow().strftime("%Y-%m-%d")
    # today's quota met outright
    if q.today_date == today and (q.today_watched or 0) >= (q.daily_required or 1):
        return True
    # 48h grace: met quota recently enough (day-granularity window)
    if q.last_quota_met:
        try:
            last = datetime.strptime(str(q.last_quota_met)[:10], "%Y-%m-%d").date()
            if last >= (datetime.utcnow() - timedelta(hours=WATCH_GRACE_HOURS)).date():
                return True
        except Exception:
            pass
    return False


def payable(db: Session, user_id: int) -> bool:
    """A member can only RECEIVE a sale if the buyer has something to pay —
    i.e. at least one payout method on file. Without this, create_intent
    would lock a buyer onto a payee with no address (payee_snapshot=None)
    and the purchase would strand. Treated exactly like a failed gate:
    skip / climb / company. (Build-spec §2.4, 7 Jul 2026.)"""
    return db.query(PayoutMethod.id).filter(
        PayoutMethod.user_id == user_id).first() is not None


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
        # "watch_qualified" carries the full CAN-RECEIVE gate into the pure
        # core: watch gate AND payability. Semantically "eligible earner".
        watch_qualified=watch_qualified(db, user_id) and payable(db, user_id),
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
    # Open-intent offset (build-spec §5.1): positions are decided at INTENT
    # and locked, but the counter only advances at CONFIRM — so in-flight
    # intents must occupy their positions now, or concurrent buyers all
    # resolve as the same sale number. Count the seller's open intents
    # (their downline buyers, any level — counter is global) and shift.
    open_intents = (db.query(P2PIntent)
                      .join(User, User.id == P2PIntent.buyer_id)
                      .filter(User.sponsor_id == seller_user_id,
                              P2PIntent.status.in_(("pending", "proof_submitted")))
                      .count())
    if open_intents:
        seller = pe.Member(
            id=seller.id, sponsor_id=seller.sponsor_id,
            pass_up_sponsor_id=seller.pass_up_sponsor_id,
            pack_sale_count=(seller.pack_sale_count or 0) + open_intents,
            owned_level=seller.owned_level, watch_qualified=seller.watch_qualified,
        )
        cache[seller_user_id] = seller
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
                amount=None, purchase_id: int = None, resolution: dict = None,
                do_commit: bool = True) -> dict:
    """Settle a confirmed pack sale:
      1. use the payee resolved (and LOCKED) at intent time if `resolution` is
         given — the buyer already paid that person — else resolve fresh,
      2. wire the buyer's pass-up target SET-ONCE (migrated members keep theirs),
      3. increment the seller's sale counter,
      4. write a PackCommission audit row.
    Returns the resolution dict."""
    buyer = db.query(User).filter(User.id == buyer_user_id).first()
    seller = None
    if buyer is not None and buyer.sponsor_id is not None:
        seller = db.query(User).filter(User.id == buyer.sponsor_id).first()

    if seller is None:
        res = resolution or {"earner_id": pe.COMPANY, "type": "direct_company",
                             "sale_number": 0, "chain": None, "pass_up_depth": 0}
        _write_commission(db, purchase_id, buyer_user_id, res, pack_level, amount)
        if do_commit:
            db.commit()
        return res

    res = resolution or resolve_payee(db, seller.id, pack_level)

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
