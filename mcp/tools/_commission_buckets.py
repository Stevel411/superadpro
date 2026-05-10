"""
Canonical mapping from `commissions.commission_type` (the catch-all table) to
human-meaningful buckets, so MCP tools report accurate categories instead of
labelling every row in the `commissions` table as "profit_grid".

The `commissions` table holds events from multiple income streams:
  - 8x8 Profit Grid cycle events (direct_sponsor, uni_level, grid_completion_bonus, platform)
  - Membership recurring revenue (membership_sponsor, membership_company, membership_renewal)
  - Pay It Forward gift redemptions (gift_membership_sponsor)
  - Manual admin entries (admin_adjustment, admin_fix)

Other income streams have their own tables and are NOT bucketed here:
  - Course Academy:   course_commissions table
  - Credit Nexus:     credit_matrix_commissions table

Add new commission_type values to GRID_TYPES / MEMBERSHIP_TYPES / ADMIN_TYPES
as they are introduced in app/grid.py, app/payment.py, app/main.py etc.
Anything not listed falls into "other" so it surfaces in monitoring instead of
being silently miscounted.
"""

# 8x8 Profit Grid events
GRID_TYPES = frozenset({
    "direct_sponsor",          # buyer -> sponsor on tier purchase
    "uni_level",               # spillover/unilevel grid commission
    "grid_completion_bonus",   # cycle completion bonus to grid owner
    "platform",                # company retention on grid (no sponsor active)
})

# Membership recurring revenue (the dependable income stream)
# NOTE: legacy capitalised "Membership Sponsor" exists in app/main.py:5506 + 6586
# (data hygiene bug) — we accept it here for now so it counts correctly.
MEMBERSHIP_TYPES = frozenset({
    "membership_sponsor",          # 50% to sponsor on initial $20 membership
    "membership_company",          # 50% to company on initial $20 membership
    "membership_renewal",          # recurring sponsor commission on monthly renewal
    "membership",                  # legacy/aggregate membership commission
    "gift_membership_sponsor",     # Pay It Forward gift redemption sponsor cut
    "Membership Sponsor",          # legacy capitalised value (TODO: fix at write site)
})

# Manual admin entries (not auto-fired by any engine)
ADMIN_TYPES = frozenset({
    "admin_adjustment",
    "admin_fix",
})


def bucket_for(commission_type: str | None) -> str:
    """
    Return one of: "profit_grid" | "membership" | "admin" | "other".
    Tools should use this single source of truth so categorisation never drifts.
    """
    if not commission_type:
        return "other"
    if commission_type in GRID_TYPES:
        return "profit_grid"
    if commission_type in MEMBERSHIP_TYPES:
        return "membership"
    if commission_type in ADMIN_TYPES:
        return "admin"
    return "other"
