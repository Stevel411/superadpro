# Archived Pages

Pages in this directory are NOT imported by App.jsx and are NOT part of the
active route table. They are kept as `.jsx.bak` files so that:

1. We can resurrect the code if we ever change our minds about retirement
2. Anyone reading the repo can see what was there before and understand the
   rationale for what replaced it
3. We can grep across history without git archeology

## Retirement log

### MyNetwork.jsx.bak — Apr 2026

Was the original "MyNetwork" page at `/network`. 423 lines. Showed:
- Referral link banner
- Earnings broken out by stream (Membership / Grid / Course / Nexus)
- Recent commissions table (last 15)
- Team stat cards (directs / total / active)
- Direct referrals list

Retired because every block now has a better dedicated home:
- Referral link banner → SubPageHero on every Income page
- Streams breakdown → `/income` (Income door overview)
- Recent commissions → `/wallet`
- Team stats + direct list → `/command-centre` + `/team-messenger`

`/network` now 301-redirects to `/income`.
`/courses/commissions` now 301-redirects to `/wallet`.

The backend `/api/network` endpoint is kept for now in case we ever resurrect
this; it can be removed in a later cleanup once we're confident nothing else
calls it.
