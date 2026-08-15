# AdvantageLife — Traffic Engine Roadmap

_Living document. Started 2026-08-14. This is the strategic roadmap for turning AdvantageLife into a **traffic solution for its members**, not just a toolset. Linked from `LAUNCH_LOG.md`. Update as engines ship._

---

## The thesis

Most affiliate and network-marketing platforms hand members a set of **tools** and leave them to go find their own traffic. That is the hard part, and it is where most members fail.

**AdvantageLife's differentiated promise: "We send you traffic."**

We already own the two hardest pieces required to deliver on that:

1. **A referral tree that attributes** — every visitor can be tied to a member.
2. **A fair rotation engine** (the Watch-to-Earn watch-equity model) — we already distribute *campaign views* fairly across members; a traffic solution is the same machinery applied to *inbound visitors* instead of views.

Everything below is those two capabilities applied to inbound traffic: **generate attention centrally, attribute it, rotate it fairly to members, let members amplify it, and show them the results.**

## The core principle (non-negotiable)

> **Every visitor the company generates must be _attributable_ and _distributable_ to a member.**

If a company-generated visitor can't be tied to a member and routed to one, that traffic is leaked. Every surface and campaign in this roadmap is judged against that rule.

## The substrate rule (applies to every public surface)

Every public page we own — a game, a member showcase, a blog post, a leaderboard, a shared video — must do two things or it is leaking traffic:

- **Convert:** a one-tap "start free under [member]" path.
- **Re-share:** a one-tap way back out to the visitor's own audience.

A visitor who can neither convert nor re-share is a dead end. No public surface ships without both.

---

## The four engines

### Engine 1 — Company-generated organic traffic, rotated to members
The compounding core. The company creates attention centrally; attribution + rotation hand it to members.

- **Showcase-page SEO.** Every member's public page is already a live URL. Make them properly indexable — unique titles/descriptions, real crawlable content, schema markup, sitemap. Thousands of long-tail pages ranking in Google, each funnelling signups to *that* member, forever. We already own the pages; this is largely a technical unlock, not new content.
- **The blog (flagship — the real long-tail SEO engine).** Publish what network marketers actually search for — "how to get leads without paying for ads," honest tool comparisons, practical how-tos. Each unique post is a page that CAN rank (unlike duplicate member pages) and carries a "start free" CTA that **rotates** the signup to a member. Write once, pull traffic for years. **Steve's steer (2026-08-14): the blog is a genuine winner, but ONLY if the editor is easy & usable for members — that's the make-or-break. Sequenced later; come back to it properly (data models + gating + media-first member-usable editor + themes).**
- **Programmatic / landing pages at scale** — later, and only if each page is genuinely useful. Thin/spam pages get penalised and burn trust; do not ship these to game the index.
- **PR / earned media.** "Free + Watch-to-Earn + skill games" is genuinely novel. One feature in a marketing/MLM outlet, podcast, or YouTube channel is a spike at zero ad cost, rotated to members.

### Engine 2 — Member-amplified traffic
Leverage the audiences members already have. Our members *are* network marketers with followings — that is our distribution network.

- **Games flywheel (LIVE — amplify next).** Every shared `/play/<game>/<username>` link is a free, member-attributed touch. Amplify with: an auto-generated **"I scored X — beat me" share card** (image with the member's link baked in, one-tap to social), themed/seasonal games, and network-wide challenges.
- **The content kit — "post this today."** The company produces ready-to-post assets (short videos, images, the games, swipe copy) so members create nothing. Highest-leverage move for our base: converts members' existing reach into attributed signups with near-zero member effort.
- **Personalised share assets** — each member's link auto-baked into images/videos so sharing is one tap, not a project.

### Engine 3 — Network-pooled traffic
Individually members are small; synchronised they are a channel.

- **Synchronised drops** — the whole network posts the same asset on the same day = a spike no single member could create.
- **Public leaderboards + winner spotlights + the live activity feed** — social proof that is itself shareable and indexable.

### Engine 4 — Owned audience (SES)
Our email list should not sit idle. Drive it into the games, challenges, blog, and drops — recirculating attention back through Engines 1–3.

---

## The product that makes it felt: the "Your Traffic" dashboard

The engines above are plumbing. The thing that makes the promise **tangible to a member** is a per-member view:

> **"This month AdvantageLife sent you _N_ visits, _P_ plays, and _S_ signups."**

Why it matters: it proves the "we send you traffic" promise, it is a powerful retention hook, and "look how much free traffic AL sent me" is itself a screenshot members share (feeding Engine 2). Built on the same attribution the whole system already runs on.

---

## Build sequence (by leverage-per-effort)

1. **Shareable game score-card** — ✅ SHIPPED 2026-08-14. Dynamic 1200×630 PNG (`GET /card/{game}/{username}?score=`) rendered per member/score/game; injected as og:image on `/play/{game}/{ref}`; member end-screen 'Share my score' native-shares the challenge link. Uses the member's PERSONAL link (never rotated).
2. **Showcase-page SEO** — ✅ FOUNDATION SHIPPED 2026-08-14 (Path B). Decided NOT to index ~600 near-duplicate member pages (Google clusters/drops duplicates, wastes crawl budget, risks site-wide helpful-content demotion — violates our own no-spam guardrail). Instead: Organization+WebSite JSON-LD + self-canonical on the server-rendered homepage & /plan; member /ref pages made properly-formed (name-personalised title, meta description, self-canonical) — clean & shareable, kept OUT of the sitemap; dropped /explore (302) from sitemap+robots. **The real long-tail engine is the BLOG (unique content), not member pages.**
3. **The content kit ("post this today")** — leverages audiences members already have; near-zero member effort.
4. **The blog** — flagship long-term organic engine (sequenced after the new-design cutover per existing plan).
5. **The rotation / attribution layer for inbound visitors** — the formal machinery that distributes company-generated traffic to members. This is the actual "traffic solution" engine; everything else feeds it.
6. **PR / earned media**, **programmatic pages**, and the **"Your Traffic" dashboard** on top.

Sequencing discipline: **do one engine well before starting the next.** Eight half-built engines generate less than one finished one.

---

## Attribution model (the spine — every engine plugs into this)

_Locked 2026-08-14. This is the foundation; build it correctly before any engine that produces company traffic ships._

### Two link types, decided by one rule

**Attribution is decided by whether a link carries a member or not.**

- **Personal link** (carries a username, e.g. `/play/<game>/<username>`, a member's showcase page): attributed 100% to that member, **always. Never rotated.** This is a member — including Steve — promoting as themselves. Steve's existing affiliate link (`user_id 1`, "AdvantageLife") is a personal link and is unchanged.
- **House link** (no username, e.g. `/go/<game>`, `/join`, blog/PR CTAs, company email): owned by a dedicated **house system account**. Because no member is attached, the **round-robin rotation engine** assigns each visitor to a member.

Link with a member → that member, no rotation, ever. Link without one → the house, rotated. Clean separation, nothing to remember.

### The house system account

A dedicated system user, **structurally distinct from Steve's personal affiliate account** (`user_id 1`). "AdvantageLife the company" and "Steve the affiliate" are now two different things in the data, not a convention.

- Owns all company/arbitrary-traffic links.
- Has no upline, does not earn, is not a normal member in the tree.
- **The house is a _router_, not a _beneficiary_.**

### The "house routes but never keeps" rule (critical)

When a company visitor lands on a house link and signs up:

1. The round-robin engine picks the **receiving member** (next member in fair rotation order).
2. The new member is placed **under that receiving member** in the tree — **not under the house.**
3. All resulting pass-ups flow to real members as normal.

The house **never** accumulates a downline. If it does, the "we distribute traffic to members" promise silently breaks. This is the single most important invariant in the whole traffic engine.

### Round-robin fairness (the rotation knob)

Signups from house traffic rotate **round-robin: every eligible member gets an equal turn, in order** — the fairest, most legible rule, matching the transparency of the watch-equity model.

- Persist a rotation cursor so turns are genuinely sequential across visits (not random each time).
- Eligibility for the rotation still respects the normal earning gates (a member must be in a state where they can legitimately receive/keep a signup); ineligible members are skipped, not given a dead turn.
- A member should be able to **see** that a signup came to them via house rotation (feeds the "Your Traffic" dashboard and keeps rotation legible).

### Original per-engine attribution summary

- **Direct member links** (`/play/<game>/<username>`, showcase pages): the referral tree, sponsor explicit.
- **Company-generated traffic** (blog, PR, programmatic, company email, arbitrary landings): house link → round-robin to a member, placed under that member.
- Rotation must be fair and legible — a member can see why they received a given visitor, mirroring watch-equity transparency.


---

## Current state (2026-08-14)

- **Engine 2 — games flywheel: LIVE.** Three skill games (Freedom Flight, Coast Run, Beach Bounce) hosted in-app, per-member `/play/<game>/<username>` share links, free "Claim my spot" signup under the sharer, monthly `$400`-pack leaderboards, admin verify/grant. This is the first shipped piece of the traffic engine. (See `LAUNCH_LOG.md` for commit trail.)
- **Engine 2 — score-card: LIVE (2026-08-14).** Server-rendered share cards match the approved split-card design (navy panel + gold score + taunt + $400 pill + per-game scene). Commit `1ccfcacd8`.
- **Your Traffic dashboard: LIVE (2026-08-14)** — `/my-traffic`, commit `ac42eefd9`, on live `traffic_events` data. Competitor-parity funnel view.
- Next: showcase-page SEO → content kit → blog → the house/round-robin rotation layer (which unlocks the 'traffic AL sent you' card).
- Everything else in this roadmap is proposed / not yet built.

## Competitor watch — W3M Amplify (added 2026-08-14)

**What they are:** a done-for-you social automation platform for an affiliate/MLM base (travel/hotel-savings vertical). Not a "share your link" tool — the member connects their social accounts once and the platform's AI **generates and auto-posts content on their behalf** (3 posts/platform/day across ~7 networks), tracking the full funnel back to a personalised affiliate URL.

**Their strengths (take seriously):**
- **Auto-posting** to FB/IG/LinkedIn/YouTube/Pinterest (full), X (partial). Member effort ≈ zero after connecting.
- **AI Content Hub** — platform generates the posts; members never create content.
- **Personalised affiliate landing pages** with unique URLs (their attribution layer).
- **Campaign selection** — pick an angle, AI configures pages + content + spokesperson.
- **Full funnel analytics** — page views → registrations → leads → purchases, plus traffic-by-source. This is exactly our "Your Traffic" dashboard concept, already shipped by them.
- **Network-wide optimisation** — "every post optimised on performance data across the whole network." Real compounding moat: more members → smarter content for everyone.

**Their weaknesses (where we win):**
- They generate **content (push/spam)**; we generate **demand (pull)**. 3 auto-posts/day/platform hits fatigue, throttling, and account-ban risk. A viral game doesn't.
- **Automation is fragile** — their own slides show X already broke to manual ("save the image, then post"). One platform policy change and "fully automated" collapses.
- **No novel hook** — no free-to-play skill games with a real prize. We have a live, differentiated acquisition mechanic they can't match.
- **Pure individual attribution** — no house/rotation model, so the *company* can't generate and fairly distribute traffic. We can (the spine).

### Strategic decision (locked with Steve 2026-08-14)
- **Compete on quality now, automation later.** Do NOT chase post-for-post auto-posting yet (fragile, risky, their game). Beat them on pull content: games, prizes, and a superior content kit. Revisit automation as a later engine once the pull side is winning.
- **Do NOT derail the games engine** to build the analytics dashboard now — but it IS table stakes, so it moves up right after the games/score-card work (not to the very end).

### Counter-features (sequenced)
1. **Better-than-AI-slop content** — the games flywheel + shareable score-cards + "post this today" kit give members *higher-engagement* things to post than auto-generated spam. Quality over their quantity. (In progress: score-card.)
2. **"Share to my socials" one-tap** on every game card and content drop — capture ~80% of their "connect once" convenience with **none** of the auto-posting ban risk. Member taps, native share sheet, done. (Cheap; fold into the score-card + content-kit builds.)
3. **"Your Traffic" funnel dashboard** — ✅ SHIPPED 2026-08-14. `/my-traffic` page: hero visits + 30d delta, visits→plays→signups funnel w/ conversion %, last-30-day snapshot, by-source breakdown, share CTA. Backed by `traffic_events` (bot-filtered visit/play/signup logging on shared links) + `/api/traffic/summary`. v1 shows the member's OWN generated traffic; the 'traffic AL SENT you' rotation card is added once the house/round-robin engine ships.
4. **Network-wide optimisation (later moat-match)** — once we have volume, surface which games/cards/drops convert best network-wide and steer members toward them. Their compounding moat; ours to match when data exists.
5. **Selective automation (much later)** — only if pull content is winning and platform risk is manageable. Never full-auto posting that risks members' accounts; assisted/scheduled at most.

**One-line positioning vs them:** *"They flood your feeds with AI posts nobody clicks. We give you games people actually play — and send you traffic on top."*

## Guardrails (so "free" traffic doesn't cost trust)

- **"Free" still costs content + engineering time.** There is no zero-cost traffic — only unpaid, compounding traffic. Budget the time and sequence honestly.
- **Stay clean.** No spammy SEO, no misleading claims, no manufactured scarcity. In this space a shortcut that dents trust costs more than any traffic it buys. Every claim stays truthful (no income promises; prizes are advertising packs, not cash).
- **Compliance already cleared for the games** (free-to-all skill prize). New mechanics get the same scrutiny before launch.

## Success metrics (define once Engine 5 exists)

- Company-generated visits attributed to members / month.
- Signups from company traffic / month (and per member).
- Re-share rate per public surface.
- Member-visible "traffic sent" (the dashboard number) — the retention proxy.

---

_Owner: Steve (product) + Claude (engineering). Update this doc as each engine ships; keep `LAUNCH_LOG.md`'s link pointing here._
