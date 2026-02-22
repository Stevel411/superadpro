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

## COMPLETED (all done as of 2026-02-22)
- [x] Backend constants — database.py: DIRECT_PCT=0.25, UNILEVEL_PCT=0.70, PER_LEVEL_PCT=0.0875, PLATFORM_PCT=0.05
- [x] Grid engine — grid.py: correct commission distribution, direct sponsor + uni-level chain + platform fee
- [x] All 10 public pages — full conformity audit, light colours, banned terms, commission accuracy
- [x] All 9 member pages — light colour audit (121 replacements), dark theme consistent
- [x] admin.html — already clean
- [x] Logo standardised across all templates
- [x] Dev-login working end to end
- [x] Dead /for-advertisers links replaced with /how-it-works
- [x] Footer year 2025 → 2026

## NEXT UP (priority order)

### [ ] 1. Member page content audit
Pages are colour-clean but content hasn't been reviewed yet:
- dashboard.html — verify all template variables render correctly with live data
- income-grid.html — verify grid display logic, level labels, progress
- affiliate.html — verify referral link display, commission table
- wallet.html — verify commission history, withdrawal flow
- account.html — verify wallet save, profile fields

### [ ] 2. Payment flow end-to-end test
- /pay-membership → /verify-membership → dashboard?activated=true
- /activate-grid → /verify-grid-payment → income-grid?activated=tier
- /withdraw → /wallet?withdrawn=true
- Test via dev-login on Railway

### [ ] 3. /forgot-password route
- Route exists in templates (linked from login) but no handler in main.py
- Build: GET shows form, POST sends reset email, token-based reset

### [ ] 4. pay-subscription.html
- Template exists but no route in main.py (/pay-subscription not mapped)
- Decide: is this a duplicate of pay-membership? Remove or wire up.

### [ ] 5. for-advertisers.html audit
- Template exists, route exists (/for-advertisers)
- Content not yet audited (not in the recent public page sweep)

## KNOWN ISSUES (minor)
- sponsor_earnings in dashboard context maps to level_earnings (acceptable workaround)
- pay-subscription.html orphaned (no route)
