"""
AdvantageLife — Matrix plan placement engine (Phase 1).

One forced 3-wide tree PER TIER (pack level 1..9). A member takes a position in
a tier's matrix when they activate a pack of that tier on the Matrix plan.

Placement rules (spec §5):
  * Walk the member's real sponsor chain (users.sponsor_id) up to the nearest
    ancestor who already holds a position in THIS tier's matrix — the anchor.
  * Place the new member in the first open slot in the anchor's subtree,
    filling forced 3-wide, top-down, left-to-right (BFS). This is spillover:
    if the anchor's own 3 slots are full, the member drops deeper, benefiting
    one of the anchor's existing downline.
  * If no ancestor is in this matrix yet, the member opens a new ROOT position
    (a tier's matrix is a forest of sponsor-anchored trees).

Earning (Phase 2) reads the 5 levels directly below a position. The tree itself
is unbounded in depth; 5 is only the earning window.

This module is PURE PLACEMENT — no money. It is idempotent: a member already
placed in a tier keeps their position (a repurchase never moves them).
"""
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import User, MatrixPosition

WIDTH = 3          # 3-wide forced matrix
EARN_DEPTH = 5     # a member earns from the 5 levels directly below them


# ── reads ────────────────────────────────────────────────────────────────
def get_position(db: Session, user_id: int, tier: int):
    """The member's position in `tier`'s matrix, or None."""
    return (db.query(MatrixPosition)
              .filter(MatrixPosition.tier == tier,
                      MatrixPosition.user_id == user_id)
              .first())


def _children(db: Session, position_id: int, tier: int):
    """Direct matrix children of a position, ordered left-to-right by slot."""
    return (db.query(MatrixPosition)
              .filter(MatrixPosition.tier == tier,
                      MatrixPosition.parent_id == position_id)
              .order_by(MatrixPosition.slot.asc(), MatrixPosition.id.asc())
              .all())


def _nearest_matrix_upline(db: Session, user: User, tier: int):
    """Walk sponsor_id upward to the nearest ancestor holding a position in
    `tier`'s matrix. Returns that MatrixPosition, or None if none exists.
    Guards against cycles in the sponsor chain."""
    seen = set()
    sid = user.sponsor_id
    while sid and sid not in seen:
        seen.add(sid)
        pos = get_position(db, sid, tier)
        if pos:
            return pos
        sp = db.query(User).filter(User.id == sid).first()
        if not sp:
            break
        sid = sp.sponsor_id
    return None


def _first_open_slot(db: Session, anchor: MatrixPosition, tier: int):
    """BFS from `anchor`; return (parent_position, slot_index) for the
    shallowest, left-most open slot in the anchor's subtree. Because the tree is
    unbounded in depth there is always a slot, so this always returns a node."""
    queue = [anchor]
    while queue:
        node = queue.pop(0)
        kids = _children(db, node.id, tier)
        if len(kids) < WIDTH:
            return node, len(kids)
        queue.extend(kids)   # FIFO + slot-ordered children => proper left-to-right BFS
    return None, None        # unreachable for an unbounded tree


# ── placement ──────────────────────────────────────────────────────────────
def place(db: Session, user_id: int, tier: int, commit: bool = True) -> MatrixPosition:
    """Idempotently place a user into `tier`'s matrix and return the position.

    If the user already holds a position in this tier, it is returned unchanged
    (repurchase does not move an existing member)."""
    existing = get_position(db, user_id, tier)
    if existing:
        return existing

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"place: no such user {user_id}")

    anchor = _nearest_matrix_upline(db, user, tier)
    if anchor is None:
        pos = MatrixPosition(tier=tier, user_id=user_id, parent_id=None,
                             slot=0, depth=0, sponsor_id=user.sponsor_id)
    else:
        parent, slot = _first_open_slot(db, anchor, tier)
        pos = MatrixPosition(tier=tier, user_id=user_id, parent_id=parent.id,
                             slot=slot, depth=parent.depth + 1,
                             sponsor_id=user.sponsor_id)
    db.add(pos)
    if commit:
        db.commit()
        db.refresh(pos)
    else:
        db.flush()
    return pos


# ── traversal helpers (used by Phase 2 earning + stats/tests) ──────────────
def upline_chain(db: Session, position: MatrixPosition, depth: int = EARN_DEPTH):
    """The up-to-`depth` matrix ancestors above `position`.
    Returns [(level, MatrixPosition), ...] with level 1 = direct parent."""
    out = []
    cur = position
    lvl = 1
    while cur.parent_id and lvl <= depth:
        parent = db.query(MatrixPosition).filter(MatrixPosition.id == cur.parent_id).first()
        if not parent:
            break
        out.append((lvl, parent))
        cur = parent
        lvl += 1
    return out


def downline_by_level(db: Session, position: MatrixPosition, tier: int,
                      depth: int = EARN_DEPTH):
    """Filled positions in the `depth`-level window below `position`, grouped by
    level. Returns {1: [pos,...], ... depth: [...]}. Level 1 = direct children."""
    levels = {}
    frontier = [position]
    for d in range(1, depth + 1):
        nxt = []
        for node in frontier:
            nxt.extend(_children(db, node.id, tier))
        levels[d] = nxt
        frontier = nxt
        if not frontier:
            break
    return levels


def downline_count(db: Session, position: MatrixPosition, tier: int,
                   depth: int = EARN_DEPTH) -> int:
    """Total filled positions in the `depth`-level window below `position`."""
    return sum(len(v) for v in downline_by_level(db, position, tier, depth).values())
