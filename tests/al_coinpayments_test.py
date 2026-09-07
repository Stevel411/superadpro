"""
Phase 5 proof — CoinPayments verified-trigger.

Proves (1) the IPN HMAC trust boundary and (2) that a completed payment
activates the pack and accrues matrix commissions, idempotently.

    cd <repo> && python3 tests/al_coinpayments_test.py
"""
import os, sys, hmac, hashlib, base64
from decimal import Decimal
os.environ["SKIP_MIGRATIONS"] = "true"
os.environ.setdefault("DATABASE_URL", "postgresql://u:p@localhost/none")
os.environ["COINPAYMENTS_CLIENT_ID"] = "client-abc"
os.environ["COINPAYMENTS_CLIENT_SECRET"] = "secret-xyz"
os.environ["COINPAYMENTS_WEBHOOK_URL"] = "https://www.advantagelife.club/api/webhook/coinpayments"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import (Base, User, MatrixPosition, MatrixCommission, CampaignPack,
                          PackPurchase, VideoCampaign, CoinPaymentsOrder)
import app.al_matrix as al_matrix
import app.al_matrix_engine as E
import app.coinpayments_service as cps

fails = []
def check(label, cond):
    print(("  PASS  " if cond else "  FAIL  ") + label)
    if not cond:
        fails.append(label)
def D(x): return Decimal(str(x))

print("\n── Webhook HMAC trust boundary (v2) ──")
WURL = "https://www.advantagelife.club/api/webhook/coinpayments"
wbody = b'{"invoice":{"invoiceId":"ALM-1-1","status":"Completed"}}'
ts = "2026-09-07T09:00:00"
def sign(bb, timestamp):
    msg = "\ufeff" + "POST" + WURL + "client-abc" + timestamp + bb.decode("utf-8")
    return base64.b64encode(hmac.new(b"secret-xyz", msg.encode("utf-8"), hashlib.sha256).digest()).decode()
good = sign(wbody, ts)
check("valid webhook signature accepted", cps.verify_webhook(wbody, "client-abc", ts, good) is True)
check("tampered signature rejected", cps.verify_webhook(wbody, "client-abc", ts, "AAAA" + good[4:]) is False)
check("wrong client id rejected", cps.verify_webhook(wbody, "someone-else", ts, good) is False)
check("empty signature rejected", cps.verify_webhook(wbody, "client-abc", ts, "") is False)
oid, status = cps.extract_invoice(cps.parse_webhook(wbody))
check("extract pulls our invoice id + status", oid == "ALM-1-1" and cps.status_is_complete(status))
check("failed status detected", cps.status_is_failed("Cancelled") and not cps.status_is_failed("Completed"))

print("\n── Verified payment → activate + accrue ──")
eng = create_engine("sqlite:///:memory:")
Base.metadata.create_all(bind=eng, tables=[
    User.__table__, MatrixPosition.__table__, MatrixCommission.__table__,
    CampaignPack.__table__, PackPurchase.__table__, VideoCampaign.__table__,
    CoinPaymentsOrder.__table__])
db = sessionmaker(bind=eng)()

def add(name, sponsor=None):
    u = User(username=name, email=name + "@t.co", plan="matrix",
             sponsor_id=(sponsor.id if sponsor else None))
    db.add(u); db.commit(); db.refresh(u); return u

db.add(CampaignPack(name="Builder", slug="builder", price=50, level=3, views_target=4000)); db.commit()

# vertical chain in tier 3, buyer Z at the bottom
R = add("R"); A = add("A", R); B = add("B", A); C = add("C", B); Dd = add("D", C); Ee = add("E", Dd)
for u in (R, A, B, C, Dd, Ee):
    al_matrix.place(db, u.id, 3)
Z = add("Z", Ee)

order = CoinPaymentsOrder(user_id=Z.id, pack_level=3, amount_usd=D("50"),
                         pay_network="trc20", status="pending",
                         internal_order_id="ALM-%d-1" % Z.id, txn_id="cptxn1")
db.add(order); db.commit(); db.refresh(order)

qual = {A.id, B.id, C.id, Dd.id, Ee.id}
purchase = E.activate_and_commit(db, order, is_qualified=lambda uid: uid in qual)

check("pack purchase created ACTIVE at tier 3",
      purchase is not None and purchase.status == "active" and purchase.pack_level == 3)
check("order marked complete + linked to purchase",
      order.status == "complete" and order.purchase_id == purchase.id)
rows = db.query(MatrixCommission).filter(MatrixCommission.purchase_id == purchase.id).all()
total = sum((D(r.amount) for r in rows), D(0))
check("commissions accrued and reconcile to $50", total == D("50"))
earned_E = sum((D(r.amount) for r in rows if r.earner_id == Ee.id), D(0))
earned_A = sum((D(r.amount) for r in rows if r.earner_id == A.id), D(0))
check("E (L1) earned 7.50, A (L5) earned 10.00", earned_E == D("7.5") and earned_A == D("10"))
check("buyer Z now holds a matrix position", al_matrix.get_position(db, Z.id, 3) is not None)

print("\n── Idempotency (retried IPN must not double-pay) ──")
n_before = db.query(MatrixCommission).count()
p_before = db.query(PackPurchase).count()
again = E.activate_and_commit(db, order, is_qualified=lambda uid: uid in qual)
check("replay returns same purchase, no new rows",
      again.id == purchase.id and db.query(MatrixCommission).count() == n_before
      and db.query(PackPurchase).count() == p_before)

print("\n" + ("ALL PASS ✅" if not fails else f"{len(fails)} FAILED ❌: " + "; ".join(fails)))
sys.exit(1 if fails else 0)
