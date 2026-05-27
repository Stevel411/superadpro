# Creative Studio v2 — Product Brief (DRAFT)

> **Status:** Idea / starting point. NOT a committed spec. Saved 27 May 2026 evening to preserve thinking across sessions.
>
> **Context:** Emerged from a strategic exercise where the question was "what would a smart, ruthless competitor do to take SuperAdPro out in 12 months?" The conclusion was that the one move a competitor couldn't out-execute in 12 months is building a category-leading creative tool tied into the SuperAdPro ecosystem. Steve had already been thinking along these lines independently; this brief is the working draft of that direction.
>
> **What this is NOT:** a final spec, an agreed scope, a ship-tomorrow plan. It is a starting point for the Saturday/Sunday scoping conversation post-Founder-deadline.
>
> **Before this becomes real scope, see "Open questions" at the bottom.**

---

## Product overview

**Name:** SuperAdPro Video (working title)

**Tagline:** Turn any idea, doc, URL, or recording into polished marketing videos — instantly.

**Positioning:** The all-in-one AI video solution built for solo founders, creators, and independent businesses. No monthly fees. Pay only for what you use with credits.

**Core value:** One platform that writes scripts, builds storyboards, generates voiceovers, and creates branded videos — fully integrated with SuperAdPro's existing tools (Page Builder, Autoresponder, Ads, Analytics).

---

## Credit-based pricing (pay as you go)

No monthly subscriptions — users buy credits and use them as needed.

### Credit packages

| Pack | Credits | Price |
|---|---|---|
| Starter | 100 credits | $15 |
| Creator | 500 credits | $59 |
| Pro (Most Popular) | 1,200 credits | $129 |
| Enterprise | 3,000 credits | $299 |

### Credit usage examples

| Output | Credit cost |
|---|---|
| 30-sec social clip | 40–60 credits |
| 60–90 sec explainer | 80–120 credits |
| Premium 90–120 sec video | 130–180 credits |
| Full webinar edit | 200–300 credits |

### Rules

- Credits never expire
- Show exact credit cost before generation
- Volume discounts on larger packs

---

## How it works (4 steps)

1. **Upload content** — URL, PDF, doc, screen recording, or prompt
2. **AI strategy** — Grok analyzes and creates script + storyboard
3. **Review & customize** — Edit everything + apply brand kit
4. **Generate & export** — Get final video with voice, captions, music

---

## Technical architecture (draft)

| Layer | Tool | Purpose |
|---|---|---|
| Orchestrator | Grok + LangGraph / CrewAI | Main agent coordinator |
| Script & Storyboard | Grok | Creative + structured output |
| Voiceover | ElevenLabs / Cartesia | High-quality TTS |
| Visual Generation | Grok Image + Flux / Kling / Veo | Images & video clips |
| Final Assembly | FFmpeg + custom code | Editing, captions, export |
| Brand Memory | Database + RAG | Consistency |

---

## Grok prompt templates (starting points)

### Template 1: Input analysis & script generation

```
You are an expert marketing video strategist for SuperAdPro Video.
User Input: [INSERT USER CONTENT HERE]

Create a complete production brief including:
1. Core Message (1 sentence)
2. Target Audience & Pain Points
3. Full Video Script (60-120 seconds)
4. Recommended Tone of Voice
5. Strong Call-to-Action

Output as clean JSON.
```

### Template 2: Storyboard generation

```
Convert this script into a professional scene-by-scene storyboard.
Script: [PASTE SCRIPT]

For each scene provide:
- Scene number
- Duration (seconds)
- Visual description
- On-screen text / captions
- Voiceover line
- Transition suggestion

Output as a clean markdown table.
```

### Template 3: Master orchestrator (main agent)

```
You are SuperAdPro Video Director Agent.

User Request: [INSERT INPUT]
Brand Kit: [INSERT BRAND DETAILS]

Create a complete production plan with:
1. Project Summary
2. Optimized Script
3. Detailed Storyboard
4. Voiceover Direction
5. Visual Style Recommendations

Return structured JSON.
```

### Template 4: Scene execution

```
Generate assets for this scene:
Scene: [Description]
Voiceover: [Text]

Provide:
- Detailed image generation prompt
- On-screen caption
- Suggested music style
- Transition type
```

---

## Recommended next development steps (draft phases)

### Phase 1 (MVP)
- Upload interface
- Grok script + storyboard generation
- Storyboard review screen
- Basic video output

### Phase 2
- Credit system integration
- Brand kit support
- Voiceover + visual generation
- Export options

### Phase 3
- Advanced templates
- Analytics
- Deeper integration with other SuperAdPro tools

### Tech stack philosophy
Build an agentic workflow (not just one-shot generation). That's what makes the experience feel magical instead of mechanical.

---

## Where Claude pushed back (27 May 2026)

When Steve first shared this brief, Claude's response flagged six things:

### Strong as-written
- **Credit-based, no subscription.** Anti-fatigue, anti-predatory positioning.
- **Credits never expire.** Major trust signal.
- **Multi-modal input (URL/PDF/doc/recording/prompt).** Differentiator vs prompt-only competitors (Pika, Runway, HeyGen).
- **Brand kit + brand memory via RAG.** Closest thing in the brief to genuine asymmetric edge — uncopyable once it works.
- **Integrated with SuperAdPro tools.** Real defensibility. Runway can't connect to your Page Builder.

### Needs work before this is real spec
1. **Pricing math is off.** $15 Starter buys ~1.5 social clips OR ~1 explainer. That's a trial price, not a real plan. Volume discount from $15 → $299 only takes the per-credit price from $0.15 to $0.10 — modest. Power user buying $299 isn't getting enough delta to feel valued.
2. **Credit costs are opaque.** "40-60 credits" ranges will frustrate members. Make costs deterministic, OR commit to showing exact pre-generation estimate with confirm step.
3. **Tech stack is incomplete and operationally fragile.** Grok + LangGraph + ElevenLabs + Flux + Veo + FFmpeg is a LOT of upstream dependencies. Each is a failure point. Today's Creative Studio 502 from Evolink was tiny. A mid-generation failure on a multi-minute video render will make members furious. Need: how do you handle each upstream's outage? How do you refund credits cleanly? How do you partial-credit a half-completed render?
4. **"Credits never expire" is a real liability.** Members can buy credits, vanish for 18 months, come back and consume them. You carry that liability indefinitely. Your upstream AI providers don't give you the same window. Needs an accounting policy.
5. **Brief describes WHAT, not WHY.** "All-in-one" isn't positioning, it's a feature list. The real wedge is ONE of:
   - "The video tool that knows your business" (brand memory + URL ingestion)
   - "The video tool that lives where your funnel is" (Page Builder integration)
   - "The video tool affiliates use" (ref links baked in, attribution tracked)
   Pick one. Lead with it. Let "all-in-one" be the supporting story.
6. **Phases are sequences of nouns, not plans.** Each phase needs scope, success metric, decision point. "Phase 1 done when 10 members have generated a complete video they actually publish." Not "when upload interface ships."

---

## Open questions (must answer before this becomes scope)

1. **What's the ONE thing this does that NO competitor can copy in 12 months?** Not "better AI ad generator." Specifically — which of the four candidates is the asymmetric edge?
   - Affiliate-specific (ref link baked in)
   - Comp-plan-integrated (attribution flows)
   - Funnel-aware (reads existing SuperPages, matches identity)
   - Voice-locked (one sample → consistent output across hundreds of assets)

2. **What does "category-leading" mean in measurable terms?** What does a member say after using it? "Generated 30 ad variants in 12 minutes." "Replaced my agency." "Deleted my Canva subscription." Define the user outcome before defining the feature set.

3. **What does Steve stop doing for 90 days to make this happen?** Engineering bandwidth is finite. Current candidates for freeze/maintenance-only:
   - AI funnel generator (already deferred)
   - My Marketing hub (already deferred)
   - i18n translation pass (already deferred)
   - Custom domain v2 sessions 2-4 (already deferred)
   - Some Lead Finder / LinkHub depth?

4. **Build vs partner vs raise?**
   - **Build solo:** 90+ days, bootstrapped, slow ship, risk a funded competitor ships first
   - **Partner:** integrate deeply with FAL/Stability/Replicate, brand it, focus engineering on affiliate-specific layer. Faster, less defensible.
   - **Raise:** outside capital. Changes the company. Dilutes founder-led narrative the community responds to.

5. **What's the relationship to the existing Creative Studio?** Existing Creative Studio has paying users, credit balances, generation history. Is this v2 a:
   - Rebrand (existing users see new branding, credits carry over)
   - Replacement (existing Creative Studio sunsets — what happens to balances?)
   - Parallel product (two paid products coexist — confusing)
   - Upgrade path (Creative Studio Plus = new branded product, existing tier stays)

6. **Margin math.** At the credit prices above, what's the gross margin per pack after Veo / Kling / Flux / ElevenLabs upstream costs? If thin, scale hurts. If healthy, can be more aggressive on positioning and CAC.

7. **Member validation.** Before building anything new, talk to 5 members who actively use Creative Studio today. What do they use it for? What do they wish it did? Don't show them this brief. Their unprompted answers tell you whether the brief's direction is right.

8. **Why now?** Is this:
   - Post-Founder-cap announcement (drives Saturday momentum) — fast scope, simple v1
   - Q3 2026 product launch (real engineering project) — full scope, real timeline
   - Skunkworks prototype (test the agent stack first) — explore feasibility, no commitment

---

## Decision point

When the Founder offer closes (Friday 23:59 UTC or 100-spot cap, whichever first), the right next session is a Creative Studio v2 scoping session. Not a "build" session. A "decide" session.

Inputs needed for that session:
- Answers to the 8 open questions above
- Insights from 5 member conversations (run between now and Saturday)
- Usage data from the existing Creative Studio (most-used features, abandonment points, credit consumption patterns)
- A clear-eyed read of margin economics

Output of that session:
- ONE-paragraph positioning that distinguishes from Runway/Pika/HeyGen
- 90-day scope with success metric
- Resource decision (build/partner/raise)
- Relationship-to-existing-product decision
- Sunsetting/migration plan if applicable

Until that scoping session happens, this brief is parked. Do not build.
