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
- **The blog (flagship).** Publish what network marketers actually search for — "how to get leads without paying for ads," honest tool comparisons, practical how-tos. Each post carries a "start free" CTA that **rotates** the signup to a member. Write once, pull traffic for years.
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

1. **Shareable game score-card** — smallest lift, builds directly on what's already live. Auto-generated result image with the member's link, one-tap share.
2. **Showcase-page SEO** — we own the pages; compounds forever. Indexability, schema, sitemap, unique metadata.
3. **The content kit ("post this today")** — leverages audiences members already have; near-zero member effort.
4. **The blog** — flagship long-term organic engine (sequenced after the new-design cutover per existing plan).
5. **The rotation / attribution layer for inbound visitors** — the formal machinery that distributes company-generated traffic to members. This is the actual "traffic solution" engine; everything else feeds it.
6. **PR / earned media**, **programmatic pages**, and the **"Your Traffic" dashboard** on top.

Sequencing discipline: **do one engine well before starting the next.** Eight half-built engines generate less than one finished one.

---

## Attribution model (how a visitor becomes a member's signup)

- **Direct member links** (e.g. `/play/<game>/<username>`, showcase pages): attributed to that member via the existing referral tree — sponsor is explicit.
- **Company-generated traffic** (blog, PR, programmatic, company email): no explicit sponsor, so it is **rotated** to a member using the same fair-equity logic that drives watch rotation. This is the piece to formalise (sequence item 5).
- Rotation must be **fair and legible** — a member should be able to see why they received a given visitor, mirroring the transparency of the watch-equity model.

---

## Current state (2026-08-14)

- **Engine 2 — games flywheel: LIVE.** Three skill games (Freedom Flight, Coast Run, Beach Bounce) hosted in-app, per-member `/play/<game>/<username>` share links, free "Claim my spot" signup under the sharer, monthly `$400`-pack leaderboards, admin verify/grant. This is the first shipped piece of the traffic engine. (See `LAUNCH_LOG.md` for commit trail.)
- Everything else in this roadmap is proposed / not yet built.

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
