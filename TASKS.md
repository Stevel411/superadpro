# SuperAdPro — Build Plan & Task Tracker
Last updated: 2026-02-22

## What We Are Building
SuperAdPro — A video advertising platform with an 8×8 recurring grid affiliate engine.

## 3 Income Streams (FINAL, LOCKED)
- Stream 1: $10/month membership — 100% to direct sponsor. Gateway to Streams 2 & 3.
- Stream 2: Profit Engine Grid (8×8) — 25% direct sponsor + 70% uni-level (8.75% × 8 levels) + 5% platform
- Stream 3: Marketing Mastery Course — 100% commission + infinite pass-up (coming soon)

## Commission Constants (CORRECT VALUES)
- DIRECT_PCT    = 0.25   # 25% to direct sponsor instantly
- UNILEVEL_PCT  = 0.70   # 70% split across 8 uni-levels (8.75% each)
- PLATFORM_PCT  = 0.05   # 5% platform fee
- PER_LEVEL_PCT = 0.0875 # 8.75% per uni-level position

## Grid Structure
- 8 columns × 8 rows = 64 seats total
- Seat 0 = owner (YOU)
- Seats 1–63 = entrants
- Grid auto-resets on completion (recurring)

## IMMEDIATE FIXES NEEDED (Priority Order)

### [ ] 1. Backend constants — database.py
Update OWNER_PCT, UPLINE_PCT, LEVEL_PCT, COMPANY_PCT to correct values
Add DIRECT_PCT, UNILEVEL_PCT, PLATFORM_PCT, PER_LEVEL_PCT
GRID_TOTAL should be 63 (entrants), not 64

### [ ] 2. Grid engine — grid.py
Rewrite commission distribution to use correct percentages
Direct sponsor gets 25% if they personally referred the entrant
Each of 8 uni-level positions above entrant gets 8.75%
Platform gets 5%

### [ ] 3. Dashboard — verify live after backend fix
Check all variable references match context dict
Confirm template renders without errors

### [ ] 4. Login — verify dev-login works end to end

### [ ] 5. All pages — verify logo consistent (done 2026-02-22)

## COMPLETED TODAY
- [x] Homepage dark space theme with Dubai video
- [x] Grid visualiser — random direct/overspill, all levels, correct math
- [x] Compensation plan — 3-stream architecture written correctly
- [x] Logo standardised across all 26 templates
- [x] Dashboard — dark topbar, 3-stream layout, correct labels
- [x] Dev-login button added to login page

## KNOWN ISSUES
- Backend commission constants still use old percentages (root cause)
- sponsor_earnings mapped to level_earnings as workaround (temporary)
- Some routes reference old terminology (grid_owner, level_pool, upline)
