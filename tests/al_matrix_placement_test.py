"""
Phase 1 proof — matrix placement engine, run against a simulated sponsor tree.

Standalone: imports the real models + real al_matrix code, but runs everything on
a throwaway in-memory SQLite DB (never touches the live database).

    cd <repo> && python3 tests/al_matrix_placement_test.py
"""
import os, sys
os.environ["SKIP_MIGRATIONS"] = "true"                       # no live DB work at import
os.environ.setdefault("DATABASE_URL", "postgresql://u:p@localhost/none")  # lazy engine, never connects
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, User, MatrixPosition
import app.al_matrix as M

eng = create_engine("sqlite:///:memory:")
Base.metadata.create_all(bind=eng, tables=[User.__table__, MatrixPosition.__table__])
db = sessionmaker(bind=eng)()

fails = []
def check(label, cond):
    print(("  PASS  " if cond else "  FAIL  ") + label)
    if not cond:
        fails.append(label)

def add(name, sponsor=None):
    u = User(username=name, email=name + "@t.co", sponsor_id=(sponsor.id if sponsor else None))
    db.add(u); db.commit(); db.refresh(u)
    return u

T = 3   # tier under test

print("\n── Build tree in tier 3 ──")
A = add("A")                       # no sponsor -> will be a root
pA = M.place(db, A.id, T)
check("A is a root (parent None, depth 0)", pA.parent_id is None and pA.depth == 0)

B, C, D = add("B", A), add("C", A), add("D", A)
pB, pC, pD = (M.place(db, x.id, T) for x in (B, C, D))
check("B,C,D are A's L1 at slots 0,1,2",
      [pB.parent_id, pC.parent_id, pD.parent_id] == [pA.id]*3 and
      [pB.slot, pC.slot, pD.slot] == [0, 1, 2] and
      [pB.depth, pC.depth, pD.depth] == [1, 1, 1])

# A's front line full -> next A-sponsored members spill under B (left-to-right, top-down)
E, F, G, H = add("E", A), add("F", A), add("G", A), add("H", A)
pE, pF, pG, pH = (M.place(db, x.id, T) for x in (E, F, G, H))
check("E,F,G spill under B at slots 0,1,2 (depth 2)",
      [pE.parent_id, pF.parent_id, pG.parent_id] == [pB.id]*3 and
      [pE.slot, pF.slot, pG.slot] == [0, 1, 2] and
      all(p.depth == 2 for p in (pE, pF, pG)))
check("H spills under C at slot 0 (B full, C next)", pH.parent_id == pC.id and pH.slot == 0)

print("\n── Sponsor-link preservation ──")
X = add("X", C)                    # C is in the matrix and has room (H at slot 0)
pX = M.place(db, X.id, T)
check("X (sponsored by C) lands directly under C", pX.parent_id == pC.id and pX.slot == 1)

print("\n── Nearest matrix-upline (skip a non-matrix sponsor) ──")
P = add("P", A)                    # P is NOT placed in the matrix (simulate a P2P member)
Y = add("Y", P)                    # Y's sponsor P isn't in the matrix; P's sponsor A is
pY = M.place(db, Y.id, T)
check("P has no matrix position", M.get_position(db, P.id, T) is None)
check("Y anchors to A's tree (skips non-matrix P) and spills to C slot 2",
      pY.parent_id == pC.id and pY.slot == 2 and pY.depth == 2)

print("\n── Fresh roots (no matrix upline) ──")
Z = add("Z")                       # no sponsor at all
pZ = M.place(db, Z.id, T)
Q = add("Q"); R = add("R", Q)      # R's only upline Q is not in the matrix
pR = M.place(db, R.id, T)
check("Z is a second root", pZ.parent_id is None and pZ.depth == 0)
check("R is a root (its upline Q isn't in the matrix)", pR.parent_id is None and pR.depth == 0)

print("\n── Idempotency (repurchase must not move a member) ──")
before = db.query(MatrixPosition).filter(MatrixPosition.tier == T).count()
pB2 = M.place(db, B.id, T)
after = db.query(MatrixPosition).filter(MatrixPosition.tier == T).count()
check("re-placing B returns the same position, adds no row", pB2.id == pB.id and before == after)

print("\n── Per-tier independence ──")
pA5 = M.place(db, A.id, 5)
check("A takes a fresh root in tier 5", pA5.parent_id is None and pA5.tier == 5)
check("B is not in tier 5", M.get_position(db, B.id, 5) is None)

print("\n── Traversal helpers ──")
up = M.upline_chain(db, pE)        # E -> B -> A
check("upline_chain(E) = [B, A]", [p.user_id for _, p in up] == [B.id, A.id])
# A's tier-3 downline: B,C,D (L1) + E,F,G,H,X,Y (L2) = 9
check("downline_count(A, tier3) == 9", M.downline_count(db, pA, T) == 9)
lv = M.downline_by_level(db, pA, T)
check("A L1 = 3 (B,C,D), L2 = 6 (E,F,G,H,X,Y)", len(lv.get(1, [])) == 3 and len(lv.get(2, [])) == 6)

print("\n" + ("ALL PASS ✅" if not fails else f"{len(fails)} FAILED ❌: " + "; ".join(fails)))
sys.exit(1 if fails else 0)
