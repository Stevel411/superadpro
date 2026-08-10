"""
AdvantageLife Club — 3/6/9 Infinite Pass-Up Commission Engine
=============================================================
Forked from app/course_engine.py (the "Infinite Pass-Up System" we wrote for
courses, never activated). Repointed to the AdvantageLife model:

  * Pass-up positions 3, 6, 9  (was 2/4/6/8)  -> then all sales direct.
  * Product = campaign packs ($20 .. $1000), single sale counter per member.
  * 100% commission, member-to-member (P2P).  Engine RESOLVES the payee;
    money moves P2P off-platform (pay page -> proof -> confirm/auto-verify).
  * Two-part earning gate (CONFIRMED with Steve):
       (1) earner OWNS that pack level OR HIGHER  ("skin in the game")
       (2) earner is WATCH-QUALIFIED (watched the campaigns)
  * Direct sale, sponsor unqualified  -> COMPANY (no climb).   [Steve confirmed]
  * Pass-up sale                      -> climbs the pass-up chain to the first
       member who passes BOTH gates; COMPANY only if nobody up the chain does.
       This climb is the "infinite pass-up".

This module is the PURE decision core: no DB, no framework. The live wiring
(SQLAlchemy models CampaignPack / PackPurchase / PackCommission / P2PIntent,
plus is_watch_qualified()) plugs into resolve_payee() / commit_sale() at the
integration layer. Keeping the money logic pure is what lets us simulate and
prove it before anything ships.
"""

from dataclasses import dataclass, field

# ── Per-package pass-up cycle (AdvantageLife operational model) ─────────────
# The cycle runs ONCE per package the member activates — it does NOT wrap.
# Within a member's current package cycle, their first CYCLE_LENGTH (11) sales
# follow the pattern:
#   position 3        -> the COMPANY   (operational fee — always, no climb)
#   positions 6/9/11  -> pass up to the first qualified upline
#   every other       -> the seller keeps it
# So one cycle = company 1, upline 3, seller 7. From sale 12 on, the seller
# keeps 100% of every further sale. The counter (cycle_sale_count) is reset to
# 0 whenever the member activates a new package (a renewal or upgrade), which
# starts a fresh cycle — so every package purchased re-arms one 11-sale cycle.
# The counter driving this is the member's PER-CYCLE count, not a lifetime one.
CYCLE_LENGTH            = 11
COMPANY_POSITION        = 3                 # 3rd of each cycle -> company fee
UPLINE_PASSUP_POSITIONS = {6, 9, 11}        # climb to the first qualified upline
# Positions where the sale LEAVES the seller (drives pass-up tree wiring):
LEAVE_SELLER_POSITIONS  = {COMPANY_POSITION} | UPLINE_PASSUP_POSITIONS  # {3,6,9,11}
CHAIN_OF                = {6: 1, 9: 2, 11: 3}  # display label for upline pass-ups
MAX_CASCADE_DEPTH       = 500               # safety bound on the infinite climb
COMPANY = "COMPANY"                         # sentinel: commission falls to the platform

# Back-compat alias — some call sites still import this name.
PASSUP_POSITIONS = LEAVE_SELLER_POSITIONS


def cycle_position(cycle_sale_count: int) -> int:
    """1-based position (1..CYCLE_LENGTH) of the seller's NEXT sale within their
    CURRENT package cycle. The cycle does NOT wrap: once the seller has made
    CYCLE_LENGTH sales in this cycle, every further sale is a plain direct sale
    (seller keeps 100%) until they activate a new package, which resets the
    counter to 0. Returns 0 once the cycle is complete (sale 12+)."""
    if cycle_sale_count >= CYCLE_LENGTH:
        return 0
    return cycle_sale_count + 1


def leaves_seller(cycle_sale_count: int) -> bool:
    """True if the seller's NEXT sale leaves them (company fee or upline pass-up)."""
    return cycle_position(cycle_sale_count) in LEAVE_SELLER_POSITIONS


@dataclass
class Member:
    id: str
    sponsor_id: str | None            # who referred them (placement tree)
    pass_up_sponsor_id: str | None = None  # where THEIR pass-ups flow (set at join)
    cycle_sale_count: int = 0          # confirmed sales they've made (all levels)
    owned_level: int = 0              # highest pack level they own ($). 0 = none
    watch_qualified: bool = False     # met the Watch-to-Earn requirement


# ---------------------------------------------------------------------------
# Qualification: BOTH gates.
# ---------------------------------------------------------------------------
def qualified(m: Member, pack_level: int) -> bool:
    """Earn on a `pack_level` sale only if you own that level-or-higher AND you're
    watch-qualified. This is the two-gate rule Steve confirmed."""
    return m is not None and m.owned_level >= pack_level and m.watch_qualified


# ---------------------------------------------------------------------------
# Pass-up wiring, set once at the moment a buyer is placed under a sponsor.
# If the buyer lands on the sponsor's 3rd/6th/9th slot, the buyer's OWN future
# pass-ups inherit the sponsor's pass-up target (this is what re-wires members
# upward and makes the cascade infinite). Otherwise they flow to the sponsor.
# ---------------------------------------------------------------------------
def assign_pass_up_sponsor(members: dict, sponsor: Member, buyer: Member) -> None:
    # A sale that LEAVES the seller (company fee or upline pass-up) re-wires the
    # buyer upward, building the infinite cascade; a kept sale flows to the seller.
    if cycle_position(sponsor.cycle_sale_count) in LEAVE_SELLER_POSITIONS:
        buyer.pass_up_sponsor_id = sponsor.pass_up_sponsor_id  # inherit upward
    else:
        buyer.pass_up_sponsor_id = sponsor.id                  # flow to sponsor


# ---------------------------------------------------------------------------
# Climb the pass-up chain to the first member who passes BOTH gates.
# ---------------------------------------------------------------------------
def _first_qualified_upline(members: dict, start_id: str | None, pack_level: int):
    node_id, depth = start_id, 0
    while node_id is not None and depth < MAX_CASCADE_DEPTH:
        m = members.get(node_id)
        if m is None:
            break
        if qualified(m, pack_level):
            return m.id, depth
        node_id = m.pass_up_sponsor_id
        depth += 1
    return COMPANY, depth


# ---------------------------------------------------------------------------
# PAYEE RESOLUTION  (called BEFORE payment, so the pay page shows the right
# person). Uses the PROSPECTIVE sale number (count + 1). The counter is only
# committed on confirmation, so nobody can game their 3/6/9 slots.
# Returns a dict describing exactly who gets paid and why.
# ---------------------------------------------------------------------------
def resolve_payee(members: dict, buyer_sponsor_id: str, pack_level: int) -> dict:
    sponsor = members[buyer_sponsor_id]
    pos = cycle_position(sponsor.cycle_sale_count)   # 1..CYCLE_LENGTH
    sale_number = sponsor.cycle_sale_count + 1        # position in the current cycle (for the audit note)

    # Position 3 of EVERY cycle -> the company operational fee. Always the
    # company, no climb — nobody sits above the company.
    if pos == COMPANY_POSITION:
        return {"earner_id": COMPANY, "type": "operational_fee",
                "sale_number": sale_number, "cycle_position": pos,
                "chain": None, "pass_up_depth": 0}

    # Positions 6/9/11 -> pass up to the first qualified upline (company only if
    # the whole chain is unqualified).
    if pos in UPLINE_PASSUP_POSITIONS:
        earner_id, depth = _first_qualified_upline(
            members, sponsor.pass_up_sponsor_id, pack_level)
        return {
            "earner_id": earner_id,
            "type": "pass_up" if earner_id != COMPANY else "pass_up_company",
            "sale_number": sale_number,
            "cycle_position": pos,
            "chain": CHAIN_OF.get(pos),
            "pass_up_depth": depth,
        }

    # kept position -> direct sale. Unqualified sponsor -> COMPANY (no climb).
    if qualified(sponsor, pack_level):
        return {"earner_id": sponsor.id, "type": "direct",
                "sale_number": sale_number, "cycle_position": pos,
                "chain": None, "pass_up_depth": 0}
    return {"earner_id": COMPANY, "type": "direct_company",
            "sale_number": sale_number, "cycle_position": pos,
            "chain": None, "pass_up_depth": 0}


# ---------------------------------------------------------------------------
# COMMIT  (called on payment confirmation / on-chain verify). Increments the
# sponsor's counter and wires the buyer's pass-up target. Returns the final
# commission record to persist.
# ---------------------------------------------------------------------------
def commit_sale(members: dict, buyer: Member, pack_level: int) -> dict:
    sponsor = members[buyer.sponsor_id]
    resolution = resolve_payee(members, sponsor.id, pack_level)  # uses count + 1
    assign_pass_up_sponsor(members, sponsor, buyer)              # wire buyer (slot = count + 1)
    sponsor.cycle_sale_count += 1                                 # commit the sale
    return {"buyer": buyer.id, "pack_level": pack_level, **resolution}


# ===========================================================================
# SIMULATION / PROOF  — run:  python3 passup_engine.py
# Builds a small team, sells packs, and prints who earns each commission so the
# 3/6/9 rule, the infinite climb, and both gates can be verified by eye.
# ===========================================================================
if __name__ == "__main__":
    L = 1000  # we'll test at the $1000 pack level to exercise the gates hard

    # Tom is the original sponsor at the top of the leg; owns top pack, active.
    tom   = Member("Tom",   sponsor_id=None, pass_up_sponsor_id=None,
                   owned_level=1000, watch_qualified=True)
    # Maria is Tom's recruit, fully qualified.
    maria = Member("Maria", sponsor_id="Tom", pass_up_sponsor_id="Tom",
                   owned_level=1000, watch_qualified=True)
    members = {"Tom": tom, "Maria": maria}

    print(f"Maria sells fifteen $%d packs in ONE package cycle:\n" % L)
    print(f"{'Sale#':<6}{'Buyer':<8}{'-> earns':<10}{'type':<18}{'chain':<7}{'depth'}")
    print("-" * 54)
    for i in range(1, 16):
        buyer = Member(f"b{i}", sponsor_id="Maria")
        members[buyer.id] = buyer
        rec = commit_sale(members, buyer, L)
        chain = rec["chain"] if rec["chain"] else "-"
        print(f"{rec['sale_number']:<6}{buyer.id:<8}{rec['earner_id']:<10}"
              f"{rec['type']:<18}{str(chain):<7}{rec['pass_up_depth']}")

    print("\nExpected: 1,2,4,5,7,8,10 -> Maria (direct); 3 -> COMPANY (operational_fee);")
    print("          6,9,11 -> Tom (pass_up, chains 1/2/3); 12,13,14,15 -> Maria (direct, kept 100%).\n")

    # ---- Renewal test: package expires, Maria renews -> cycle resets to 0 ----
    print("Renewal — Maria's package expires and she renews (cycle_sale_count -> 0):")
    print(f"  Before renewal: cycle_sale_count = {maria.cycle_sale_count} (past the cycle, all direct)")
    maria.cycle_sale_count = 0   # what a package activation does in the live engine
    r = resolve_payee(members, "Maria", L)  # her NEXT sale after renewal
    print(f"  First sale of the NEW cycle -> position {r['cycle_position']}, type {r['type']} "
          f"(-> {r['earner_id']}). {'PASS' if r['cycle_position']==1 and r['type']=='direct' else 'FAIL'}\n")

    # ---- Gate test A: pass-up climbs PAST an unqualified upline ----
    print("Gate A — pass-up climbs past an unqualified upline:")
    #  Chain: buyer -> Kim(sponsor) -> Sue(not watch-qual) -> Ann(owns $1000, active)
    ann = Member("Ann", sponsor_id=None, pass_up_sponsor_id=None, owned_level=1000, watch_qualified=True)
    sue = Member("Sue", sponsor_id="Ann", pass_up_sponsor_id="Ann", owned_level=1000, watch_qualified=False)  # inactive
    kim = Member("Kim", sponsor_id="Sue", pass_up_sponsor_id="Sue", owned_level=1000, watch_qualified=True, cycle_sale_count=5)  # next sale = 6th (pass-up)
    g = {"Ann": ann, "Sue": sue, "Kim": kim}
    r = resolve_payee(g, "Kim", L)
    print(f"  Kim's 6th sale ($1000) -> {r['earner_id']} (type {r['type']}, depth {r['pass_up_depth']}) "
          f"— skipped Sue (not watch-qualified), landed on Ann. {'PASS' if r['earner_id']=='Ann' else 'FAIL'}\n")

    # ---- Gate test B: direct sale, sponsor doesn't own the level -> COMPANY ----
    print("Gate B — direct sale, sponsor lacks the level -> company:")
    low = Member("Low", sponsor_id="Ann", pass_up_sponsor_id="Ann", owned_level=100, watch_qualified=True)  # owns only $100
    g2 = {"Ann": ann, "Low": low}
    r = resolve_payee(g2, "Low", L)   # Low's 1st sale (direct), $1000 pack
    print(f"  Low's 1st $1000 sale -> {r['earner_id']} (type {r['type']}) "
          f"— Low owns only $100, so it goes to the company. {'PASS' if r['earner_id']=='COMPANY' else 'FAIL'}\n")

    # ---- Gate test C: level-matching lets a lower sale through ----
    print("Gate C — same sponsor, lower pack they DO own -> they keep it:")
    r = resolve_payee(g2, "Low", 100) # Low sells a $100 pack (owns $100)
    print(f"  Low's 1st $100 sale -> {r['earner_id']} (type {r['type']}) "
          f"— Low owns $100, so keeps it. {'PASS' if r['earner_id']=='Low' else 'FAIL'}")
