"""
Phase 2 proof — matrix commission engine, run against a simulated tree.

Standalone: real models + real engine, on a throwaway in-memory SQLite DB.
    cd <repo> && python3 tests/al_matrix_commission_test.py
"""
import os, sys
from decimal import Decimal
os.environ["SKIP_MIGRATIONS"] = "true"
os.environ.setdefault("DATABASE_URL", "postgresql://u:p@localhost/none")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import (Base, User, MatrixPosition, MatrixCommission,
                          CampaignPack, PackPurchase)
import app.al_matrix as al_matrix
import app.al_matrix_engine as E

eng = create_engine("sqlite:///:memory:")
Base.metadata.create_all(bind=eng, tables=[
    User.__table__, MatrixPosition.__table__, MatrixCommission.__table__,
    CampaignPack.__table__, PackPurchase.__table__])
db = sessionmaker(bind=eng)()

fails = []
def check(label, cond):
    print(("  PASS  " if cond else "  FAIL  ") + label)
    if not cond:
        fails.append(label)

def D(x): return Decimal(str(x))
def add(name, sponsor=None):
    u = User(username=name, email=name + "@t.co", sponsor_id=(sponsor.id if sponsor else None))
    db.add(u); db.commit(); db.refresh(u); return u

def seed_pack(level, price):
    db.add(CampaignPack(name=f"T{level}", slug=f"t{level}", price=price, level=level, views_target=0))
    db.commit()

def purchase(user, tier, tx):
    p = PackPurchase(user_id=user.id, pack_level=tier, amount=D(E._tier_price(db, tier)),
                     status="active", tx_ref=tx)
    db.add(p); db.commit(); db.refresh(p); return p

def by_earner(rows):
    out = {}
    for r in rows:
        out[r.earner_id] = out.get(r.earner_id, D(0)) + D(r.amount)
    return out

seed_pack(3, 50)      # tier 3 = $50
seed_pack(5, 200)     # tier 5 = $200

# vertical chain in tier 3: R -> A -> B -> C -> D -> E, buyer Z under E
R = add("R"); A = add("A", R); B = add("B", A); C = add("C", B); Dd = add("D", C); Ee = add("E", Dd)
for u in (R, A, B, C, Dd, Ee):
    al_matrix.place(db, u.id, 3)
Z = add("Z", Ee)      # buyer; place() runs inside commit_matrix_sale
# Z's uplines: L1=E, L2=D, L3=C, L4=B, L5=A

print("\n── Scenario 1: all uplines qualified ($50, split 7.5/7.5/7.5/7.5/10) ──")
qA = {A.id, B.id, C.id, Dd.id, Ee.id}
r1 = E.commit_matrix_sale(db, purchase(Z, 3, "tx1"), is_qualified=lambda uid: uid in qA)
m1 = by_earner(r1)
check("E (L1) earns 7.50", m1.get(Ee.id) == D("7.5"))
check("D (L2) earns 7.50", m1.get(Dd.id) == D("7.5"))
check("C (L3) earns 7.50", m1.get(C.id) == D("7.5"))
check("B (L4) earns 7.50", m1.get(B.id) == D("7.5"))
check("A (L5) earns 10.00 (the depth reward)", m1.get(A.id) == D("10"))
check("company base = 10.00 (20% of 50)", m1.get(None) == D("10"))
check("rows sum to the full $50", sum(m1.values()) == D("50"))

print("\n── Scenario 2: L1 (E) unqualified → compression rolls up ──")
qB = {A.id, B.id, C.id, Dd.id}          # E not qualified
r2 = E.commit_matrix_sale(db, purchase(Z, 3, "tx2"), is_qualified=lambda uid: uid in qB)
m2 = by_earner(r2)
check("E earns nothing", m2.get(Ee.id) is None)
check("D absorbs L1 + earns L2 = 15.00", m2.get(Dd.id) == D("15"))
check("C/B/A unchanged (7.5/7.5/10)", m2.get(C.id) == D("7.5") and m2.get(B.id) == D("7.5") and m2.get(A.id) == D("10"))
check("company base still 10.00 (no fall-through)", m2.get(None) == D("10"))
check("compressed_from audit recorded on the rolled row",
      any(r.compressed_from == Ee.id for r in r2))

print("\n── Scenario 3: company fall-through (buyer near the top) ──")
M = add("M"); al_matrix.place(db, M.id, 5)   # root of tier-5 matrix
W = add("W", M)                              # W's only upline is M (L1); L2..L5 empty
qC = {M.id}
r3 = E.commit_matrix_sale(db, purchase(W, 5, "tx3"), is_qualified=lambda uid: uid in qC)
m3 = by_earner(r3)
check("M (L1) earns 30.00 (15% of 200)", m3.get(M.id) == D("30"))
check("L2..L5 (30+30+30+40) fall to company + base 40 = 170", m3.get(None) == D("170"))
check("rows sum to the full $200", sum(m3.values()) == D("200"))

print("\n── Idempotency (replayed confirmation writes nothing new) ──")
before = db.query(MatrixCommission).count()
r1b = E.commit_matrix_sale(db, db.query(PackPurchase).filter_by(tx_ref="tx1").first(),
                           is_qualified=lambda uid: uid in qA)
after = db.query(MatrixCommission).count()
check("re-committing tx1 adds no rows", before == after and len(r1b) == len(r1))

print("\n── Derived balances (summed from the ledger, never stored) ──")
# D earned: S1 L2 = 7.5, plus S2 (L1 rolled + L2) = 15  => 22.5
check("matrix_earned(D) == 22.50 across both sales", E.matrix_earned(db, Dd.id) == D("22.5"))
check("matrix_earned(E) == 7.50 (only S1)", E.matrix_earned(db, Ee.id) == D("7.5"))

print("\n── Reconciliation safeguard (rows must sum to price) ──")
for tx in ("tx1", "tx2", "tx3"):
    pid = db.query(PackPurchase).filter_by(tx_ref=tx).first().id
    check(f"purchase {tx} reconciles to price", E.purchase_reconciles(db, pid))

print("\n" + ("ALL PASS ✅" if not fails else f"{len(fails)} FAILED ❌: " + "; ".join(fails)))
sys.exit(1 if fails else 0)
