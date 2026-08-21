# Filipino (Tagalog) i18n Rollout — Tracker

_Opened 2026-08-21. Filipino first (big community incoming), then all 20 languages. AI-quality (Claude) translation per Steve, not machine. Governed by `docs/ENGINEERING_STANDARDS.md`._

## System (how the platform's i18n works)
- react-i18next, 20 locales in `frontend/src/i18n/locales/*.json`. `en.json` eager (bundled in index); non-EN lazy-loaded chunks. Persist to localStorage, EN fallback. Config: `frontend/src/i18n/index.js`.
- **Two kinds of work per page:** (a) *wired* pages already call `t()` → just fill Tagalog in `tl.json`; (b) *hardcoded* pages have literal English → must be wired to `t()` first (add `useTranslation`, replace literals with `t('ns.key')`, add keys to en+tl), then translated.
- **Register:** natural Taglish — keep tech nouns Filipinos read in English (Dashboard, Banner, Team, Traffic, Performance, wallet, link, projection); translate the rest. (Steve to confirm/adjust.)
- Server-rendered pages (`/packs`, `_AL_*_PAGE` in main.py) use a **separate backend i18n mechanism** — TBD, own pass.
- **Admin pages are OUT of scope** (Steve-only): AdminDashboard, AdminAL, AdminVideos, AdminWisdom, AdminEmailBroadcast, AdminCollaborations, AcademyAdmin, etc.

## Scope (member-facing, 2026-08-21 audit)
- **~1,872** rendered keys total (of 4,045 defined; 2,173 orphaned — skip).
- **~40 pages already wired** → translate-only.
- **~15–20 member-facing pages hardcoded** → wire + translate.
- **248** keys use inline English `defaultValue` (not in locale files) → extract to en.json to be translatable (separate sub-task).

## Priority order (what the incoming community hits first)
1. Sidebar nav ✅
2. Dashboard (landing) — in progress
3. Watch / Daily Watch (load-bearing earning action) — wired, translate-only
4. Packs + buy/earn flow (server-rendered — needs backend approach)
5. My Team, Confirm-a-Sale, Payout methods
6. Campaigns / Campaign Analytics (wired), My Marketing, Academy
7. Long tail of wired pages
8. Then repeat per-language for the other 18

## Progress
- ✅ **Language selector surfaced** to members (sidebar footer) — `d95a9b7`
- ✅ **Sidebar nav** wired + Filipino (22 nav keys; 14 translated, 4 kept Taglish) — `0a06d58`, header-blank bug fixed `1d345f4`
- 🟡 **Dashboard hero** wired + Filipino (7 static strings: earnings/badges/affiliate/copy) — `23e45b4`. **Remaining on NewDashboard:** dynamic concatenated strings (Welcome-back line, cycle pill — need interpolation), left-column cards (banner card, Verified views, Game Links), notifications menu, quote area, section headers (~30 more strings).
- ✅ **Watch** (wired) — Tagalog mostly pre-existed and was decent; fixed 8 machine-era errors (progressSaved 'nakakatipid'→'naka-save', dismiss 'Pagsahin'→'I-dismiss', stale checkBackSoon/noActiveCampaigns messages, etc.). **Follow-up:** 17 Watch keys use inline English `defaultValue` (not in locale files) → render English until extracted to en.json.
- ⬜ Everything else per priority order

## Notes / gotchas
- Adding keys: use `object_pairs_hook=OrderedDict` + `json.dump(indent=2, ensure_ascii=False)` — keeps file order and readable Tagalog, small diff.
- `t(undefined, {defaultValue})` renders BLANK, not the default — guard any t() where the key could be undefined (bit us on the sidebar group headers, `1d345f4`).
- When reusing an existing key, check its current value doesn't already differ from what you intend (e.g. `dashboard.copied` pre-existed as "Copied!" not "Copied ✓").

## Progress log (batches)
- Gap sized 2026-08-21: Filipino **~78% done** (1,471/1,882 used keys already translated). Real gap **~392** keys (39 missing + 353 tl==en), minus ~14 orphaned `membershipStream` → **~378** to fill.
- Batch: sidebar nav (22) ✅ · dashboard hero (7) ✅ · Watch error-fixes (8) ✅ · high-traffic member batch (39: wallet withdrawal flow, campaign analytics, create-campaign locked state, contentCreator tool blurbs, nav/learn extras) ✅ — `pending commit`.
- **~330 keys remaining** across: publicPages(35), linkTools(25), superPagesEditor(24), qrTool(17), videoCreator(17), memeTool(15), incomeDisclaimer(14), tools(12), editor(12), myLeads(10), linkHub(9), etc.

## ⚠️ Retired-model strings — DE-STALE, do NOT translate (Steve decision)
These render retired-model concepts; translating them entrenches the wrong model in 20 languages. Fix the English (or remove) first, then translate:
- `wallet.gridBonus` (Grid Bonus), `wallet.incomeGrid` (Income Grid), `wallet.uniLevel` (Uni-Level) — retired commission types (AL is 3/6/9 pass-up). If shown as historical commission labels, decide replacement wording.
- `wallet.creativeStudioComm` (Creative Studio) — retired product.
- `compHub.streams.gridName/gridTag/gridNum` (The Grid / Recurring Income), `compHub.streams.membershipName/membershipNum` (Membership) — retired 2-stream comp model.
- `membershipStream.*` (14) — lives in the un-routed `MembershipStreamPage` orphan → skip entirely.


## Re-baseline 2026-08-21 (live-pages-only, after token-waste correction)
**Rule (Steve): translate ONLY pages that render live on AdvantageLife. Verify reachability before translating.**
- **Corrected method:** a key is translatable only if used by a page reachable from the live SideNav (BFS over `to=`/`to:`/`href`/`path:` links + auth/public funnel roots). "Referenced by t() in code" is NOT enough — orphaned/AL-redirected components (e.g. `Wallet.jsx` via `WalletRoute`→/payout-methods) count as used but never render.
- **Reverted 27 dead-page keys** I wrongly translated (all `wallet.*`, contentCreator tool blurbs, tools-nav extras, explore/learn nav) — they never render on AL.
- **Verified live gap: 69 keys** on nav-reachable pages. Of those, ~57 are tech terms/placeholders/numbers correctly kept English (QR, UTM, Base URL, px sizes, https://…, 2FA, Sponsor). **11 genuine phrases translated** (myLeads lists, support getting-started, videoLibrary gate, linkHub colour labels).
- **58 keys NOT yet proven reachable** (publicPages, incomeDisclaimer, cryptoGuide, platformTour, socialShare, superLink, training, learn) — do NOT translate until each page is individually confirmed to render on AL.

**Net:** Filipino on the confirmed-live member pages is essentially complete (the bulk was already translated; the rest is correctly-English tech terms). Remaining real work is small and gated on per-page reachability checks + the de-stale decisions on retired-model strings.
