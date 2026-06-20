# SuperAdPro — Platform Simplification Spec

**The Three-Door Dashboard**

Status: Approved direction — not yet built · Owner: Steve · Drafted 19 June 2026
Visual reference: [`dashboard-mockup.html`](./platform-assets/dashboard-mockup.html) (open in a browser — interactive)
Related specs: [`commission-spec.md`](./commission-spec.md) · [`ad-studio-spec.md`](./ad-studio-spec.md)

---

## 1. The problem we're solving

The platform is too complex for its audience. Members are **network and affiliate marketers who want to make money** — and they land in a product with:

- **~38 member-facing nav destinations** across four expandable groups (My Marketing 9, Income 9, Tools 10, Learn 5) plus Dashboard, Wallet, Account, FAQ, Support.
- **~90 page files** in `frontend/src/pages/`.

The result is confusion and near-zero conversion. The fix is not more features — it's one legible story and a dramatically smaller surface.

**The story, in one line:** *Watch daily → earn from the Grid → build with the tools.*

---

## 2. The principle

Collapse the entire member experience into **three doors on the dashboard, nothing else competing for attention.** Everything currently in the platform is either sorted into one of these doors, folded into something that is, or cut.

Two rules that govern the teardown:

1. **Nav-collapse and first-run come first.** Most of the felt simplicity comes from showing three doors and fixing what a new member sees in the first 30 seconds — *before* any code is deleted.
2. **Sunset gracefully.** Members paid for some of these surfaces. Cut routes get a redirect to the nearest kept surface — never a dead link. No hard deletes under a live paying member.

---

## 3. The three doors

### Door 1 — Watch to Earn *(the showcase — load-bearing)*

Watch-to-Earn is **not** an engagement feature. It is two load-bearing things at once and must be the most prominent element on the dashboard:

- **The withdrawal gate.** After buying a campaign tier, a member must watch a video **every day** to keep their wallet active and stay qualified to earn and withdraw from the Profit Grid.
- **What makes the campaign tier a legitimate product.** The purchase buys real advertising views; real people watch and those videos drive real sales. Effective advertising = a legitimate, justifiable product. *(Settled — do not re-litigate.)*

Because of this, the **campaign side is core product, not trim**: Create Campaign (`/create-campaign`), the video library (`/video-library`), and campaign views all stay. The job there is to tighten UX, not remove.

Dashboard treatment: full-width featured card, the brightest thing on the page. Pulsing "watch today" affordance (the daily heartbeat), streak, and active-wallet status.

### Door 2 — Income

The money the member is qualifying for. Contains the Profit Grid (the new comp plan), team, earnings, wallet/withdrawals, and **campaign-tier activation — the hinge** between Watch-to-Earn ("buy your ad views") and Income ("qualify for the Grid"), surfaced as a prominent action, never buried.

Dashboard treatment: deep cobalt "money" card — large earnings figure, Grid fill toward next bonus, team/milestone metrics, and a **prominent full-width "Open Profit Grid" button**.

### Door 3 — Tools *(exactly four)*

- **Page builder** — SuperPages (`/pro/funnels`)
- **Autoresponder** — SuperLeads (`/pro/leads`)
- **Content creator** — Creative Studio (`/creative-studio`)
- **Ad creator** — Ad Studio (see `ad-studio-spec.md`)

Dashboard treatment: clean white card, four tappable tiles with depth (border + resting shadow + corner chevron). Nothing more than the four.

---

## 4. Keep / Fold / Cut map

Grounded in the live `frontend/src/components/layout/Sidebar.jsx`.

### KEEP (sorted into a door)
| Surface | Route | Door |
|---|---|---|
| Watch-to-Earn | `/watch` | Watch |
| Create Campaign | `/create-campaign` | Watch |
| Video library | `/video-library` | Watch |
| Profit Grid | `/campaign-tiers` | Income |
| My Team | `/my-team` | Income |
| Wallet | `/wallet` | Income |
| Affiliate link | `/social-share` | Income (in hub) |
| SuperPages | `/pro/funnels` | Tools |
| Autoresponder | `/pro/leads` | Tools |
| Content creator | `/content-creator` `/creative-studio` | Tools |
| Ad creator | Ad Studio | Tools |

### FOLD (consolidate into a kept surface)
- **3 grid pages → 1:** `/campaign-tiers` + `/grid-visualiser` + `/grid-calculator` become a single Grid surface.
- **Content tools → 1:** `/creative-studio` + `/content-creator` + `/brand-posters` + `/tools/meme-generator` merge into one Content creator.
- **Ad tools → 1:** `/proseller` + `/tools/banner-creator` fold into Ad creator.
- **LinkHub + Link Tools → page-builder templates:** `/linkhub` + `/link-tools` (a link page is just a page type).
- **Email Swipes → Autoresponder** (`/email-swipes`).
- **Marketing Materials → a resources tab in Tools** (`/marketing-materials`).
- **Creator Credits → Wallet** (`/my-credits`).
- **Compensation Plan → Income hub** (`/compensation-plan`).

### CUT (remove, with redirects)
- **Lead Finder** (`/lead-finder`) — no clear job for this audience.
- **Campaign Analytics + the bulk of Analytics** (`/campaign-analytics`, `/analytics`) — vanity. Keep only a simple earnings scoreboard inside the Income door.
- **Blog** — do not launch.
- **Courses** — already retired; purge the ~17 file remnants.
- **Learn group demoted** from a pillar to a small tucked Help corner: Training, Crypto Guide, Tour, Leaderboard. Help stays reachable; it is not a top-level door.

### OPEN — Steve's taste calls (decide before build)
- **Pay It Forward** (`/pay-it-forward`) — keep or cut?
- **Share Your Story** (`/share-story`) — keep or cut?
- **Leaderboard** (`/leaderboard`) — keep (motivational, fold into Income) or cut?
- **ProSeller** (`/proseller`) — fold into Ad creator or cut?

---

## 5. Dashboard layout spec

Reference render: `platform-assets/dashboard-mockup.html` (interactive), `dashboard-desktop.png`, `dashboard-mobile.png`.

```
┌ top bar ───────────────────────────────────────────────┐
│ SuperAdPro                       [Tier]  [Wallet $]      │
├────────────────────────────────────────────────────────┤
│ Welcome back, {name}                                     │
│ Watch today's video to keep your wallet active…          │
├────────────────────────────────────────────────────────┤
│ ███████  WATCH TO EARN  (full-width featured)  ███████   │
│  ▶ pulse   Today's video is ready   [Watch now]  streak  │
├──────────────────────────────┬─────────────────────────┤
│ INCOME (deep cobalt)         │ TOOLS (white)           │
│  $earned this month          │  [Page builder] [Auto]  │
│  Grid 6/16 · team · milestone│  [Content]      [Ad]    │
│  [ Open Profit Grid ]  (btn) │  4 tiles w/ depth       │
└──────────────────────────────┴─────────────────────────┘
```

- **Desktop:** Watch full-width across the top; Income + Tools as a two-column row beneath.
- **Mobile:** single column, stack order Watch → Income → Tools (Watch always first/most prominent).
- Quality floor: responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected.

---

## 6. Visual standard (locked)

**Palette** — cobalt + cyan + white, no amber/gold.
`--ink #0a1438` · `--ink2 #15275f` · `--cobalt #1e3a8a` · `--cyan #06b6d4` · `--cyan-bright #22d3ee` · `--cyan-soft #67e8f9` · member bg light cobalt `#eaf0fa` · cards white.

**Typography** — Sora (display / headings / numbers), DM Sans (body), JetBrains Mono (labels / data). **Large type scale, generous spacing — built to be glanced at, not read.** This readability standard is part of the spec, not optional polish.

**Card hierarchy** — Watch brightest (cobalt→cyan gradient), Income deep cobalt, Tools clean white. Boldness spent in one place: the Watch door.

**Components**
- Real buttons with weight: white "Watch now" on the Watch card; full-width cyan-gradient "Open Profit Grid" on the Income card.
- Tool tiles read as buttons: 1px border (`#d4ddea`), resting shadow, corner chevron, hover lift + cyan border.
- Status chips (tier, wallet) in mono caps.

**Motion (restrained)** — load-in stagger on the three doors; the Watch pulse ring (signature — the daily heartbeat); earnings count-up; hover lift on cards/tiles. Nothing more; extra motion reads as generated.

---

## 7. Build sequencing

1. **Pull real per-feature usage data** — which surfaces members actually touch — to turn the cut list from judgement into evidence.
2. **Nav collapse + new dashboard + first-run** — three doors, the layout above, onboarding for a new member. Most of the felt simplicity, zero deletions.
3. **Folds** — consolidate the redundant surfaces into their kept homes (§4).
4. **Graceful sunsets** — redirect every cut route to its nearest kept surface. No dead links.
5. **Code cleanup last** — remove dead pages/files only after redirects are proven live.

Each backend route still needs its matching `@app.get` React-shell handler; redirects must cover deep links members may have bookmarked.

---

## 8. Decisions to lock before build

- **Entry tier:** $10 Launchpad vs $20 Starter as the front door (lean $10 for a cold restart).
- **Four taste calls** in §4 (Pay It Forward, Share Your Story, Leaderboard, ProSeller).
- **Comp-plan build decisions** that intersect the Income door (unilevel shape, what "activation" releases the locked wallet, whether step-up ships in build one) — see the Profit Grid comp plan.
- **Tools door:** four tiles only, or add a single "Open toolkit" action.
- **Watch door:** how much campaign/views data to surface on the dashboard vs inside the door.

---

*This document is the single source of truth for the simplification build. Update it here when a decision lands — do not let the spec drift from what gets built.*
