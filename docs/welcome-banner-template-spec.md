# Welcome Banner Template — Spec (DRAFT)

> **Status:** Member request captured 27 May 2026 evening. NOT yet scoped or built. For Saturday's session.
>
> **Source:** Members are asking for the ability to generate personalised "Welcome to SuperAdPro" banners for their new team members — to share via WhatsApp, social, etc. as a welcome gesture and viral surface.
>
> **Existing system:** SuperAdPro already has a Brand Poster Generator (`poster_templates`, `poster_generations`, `poster_template_shares` tables; routes `/brand-posters/result/:generationId` and `/brand-posters/history`). This new template should slot INTO that system as a new template — NOT a parallel tool.

---

## The reference aesthetic

Two reference images saved in this directory for the Saturday session:
- A two-person night/cobalt version (rejected — too dark, hard to template two faces)
- **A single-person sunset version (PREFERRED) — Sayeam Ahmed banner**

The preferred aesthetic:
- Miami sunset palette (warm sky, cobalt water, neon-blue accents)
- Foreground: red Ferrari + white luxury yacht
- Background: palm trees, skyline, water reflections
- Right third: cutout zone for the team member's photo (no background)
- Left side: "WELCOME TO" header, SuperAdPro logo + "WHERE REAL PEOPLE EARN REAL INCOME TOGETHER" tagline, glowing script "We're so glad you're here!" with custom name underneath
- Bottom: "REAL PEOPLE · REAL SUPPORT · REAL INCOME · REAL TOGETHER" footer bar with icons
- Closing tagline: "ONE TEAM. | ONE FAMILY. | TOGETHER WE CREATE. TOGETHER WE ACHIEVE."

---

## The working AI prompt (provided by Steve)

```
Create a luxury SuperAdPro welcome banner in a dark neon blue and sunset
theme. Use a glowing city skyline at dusk with palm trees, water
reflections, a luxury yacht, and a red Ferrari in the foreground. Add
bright blue neon lighting effects and a modern glossy style.

Place a large bold heading at the top saying:
"WELCOME TO SuperAdPro"

Add glowing script text:
"We're so glad you're here!"

Use the uploaded portrait photo of [NAME] as the main subject on the
right side of the banner. Keep his facial features realistic and natural.

Add his name in elegant glowing script:
"[NAME]"

Include motivational text:
"REAL PEOPLE. REAL SUPPORT. REAL INCOME. REAL TOGETHER."

At the bottom add glowing blue icon sections with:
• Real People
• Real Support
• Real Income
• Real Together

Make the overall design premium, modern, cinematic, and social-media
ready with a lighter vibrant background and luxury lifestyle atmosphere.
```

Variables: `[NAME]` becomes the team member's first + last name (or display name from User row).

---

## Implementation options to weigh Saturday

### Option A — Templated overlay (recommended for v1)

1. Generate ONE high-resolution background scene WITHOUT a person, using the AI prompt above (modified to omit "Use the uploaded portrait" and leave the right third empty with a clean photo-cutout zone).
2. Store this background as a fixed asset (R2 bucket).
3. At generation time:
   - Member uploads a photo of their team member
   - Backend background-removes the photo (fal.ai bria-rmbg or similar)
   - Composite: background asset + cutout photo on the right + member's name overlaid in script font
   - Output as PNG/JPEG to R2, return generation ID via existing `poster_generations` table

**Pros:** consistent output, zero AI cost per generation, ships in ~2-3 days
**Cons:** every output looks structurally identical (only photo + name differ)

### Option B — Hybrid AI compositing

1. AI generates a new scene per request using the prompt, with the member's uploaded photo as a reference
2. Brand overlays (logo, tagline, footer icons) applied as fixed layers on top of the AI scene

**Pros:** more variety, more "wow" per generation
**Cons:** unpredictable outputs (uncanny faces, lighting mismatches, hand artefacts), ~$0.10-0.40 per generation, slower

### Option C — Full AI generation (Creative Studio v2 territory)

Defer to the broader Creative Studio v2 build. Don't ship as a standalone feature.

**Steve's lean (27 May 2026 evening conversation):** **Option A.** Ship fast, ship consistent, members get what they're asking for. Option B/C is Creative Studio v2 work — not this week.

---

## Aspect ratios needed

Members will share on multiple platforms. Minimum coverage:
- **3:2 landscape** (the reference image format) — desktop sharing, email
- **16:9 landscape** — Facebook, X
- **1:1 square** — Instagram feed
- **9:16 portrait** — Stories, Reels, TikTok

Each ratio needs its own base background and layout positioning. Same brand identity, different crops/positioning.

For v1, ship 1:1 and 9:16 first (those are the highest-traffic shareable formats). Add the others in v1.1.

---

## Customization fields

For v1, keep it tight:

| Field | Required | Source |
|---|---|---|
| Team member's first + last name | Yes | Free-text input |
| Team member's photo | Yes | Upload (auto-background-removed) |
| Sponsor's name (optional caption) | No | Default to current member's name |

For v1.1 or later:
- Custom tagline override
- Multiple aesthetic variants (sunset, night, day)
- Animated MP4 version for Reels/TikTok

---

## Where it lives in the platform

New template inside the existing Brand Poster Generator at `/brand-posters`.

Tile title: "Welcome a Team Member"
Tile description: "Generate a personalised welcome banner with your team member's photo. Share on WhatsApp, Instagram, or social to make them feel welcomed."

NOT a new tool surface. Members already know `/brand-posters` exists. Adding a featured template is lower-friction than a new menu item.

---

## Open questions for Saturday's scoping

1. **Background removal — which provider?** fal.ai bria-rmbg is cheapest and good quality. Browser-side libraries like @imgly/background-removal exist but quality varies. Server-side is more reliable. Verify cost per generation against existing Brand Poster Generator credit model.

2. **Photo upload constraints:**
   - Max file size?
   - Min resolution? (Low-res photos look bad once enlarged into the banner)
   - Format restrictions (JPEG/PNG/HEIC)?

3. **What's the per-generation cost in member credits?** The existing Brand Poster Generator has a credit cost — needs to be consistent.

4. **Moderation:**
   - Members can upload ANY photo. What's the policy if they upload an inappropriate image?
   - The current Brand Poster Generator likely has some moderation; reuse that pipeline.

5. **Caching/regeneration:** if a member's name has special characters or the photo fails to background-remove cleanly, do we let them retry without burning another credit?

6. **First-name display logic:** "Sayeam Ahmed" in the example shows full name. Members might want "First Name only" for a more casual feel, or "First + Last" for formality. Single setting, or member's choice?

---

## Saturday session output

The right Saturday output is:
- A clean base background asset (no person) generated via the prompt
- Decision on aspect ratio scope for v1 (recommend 1:1 + 9:16)
- Decision on background-removal provider
- Wired into the existing Brand Poster Generator as a new template
- Test generation with a real member's photo

Estimated build time after design decisions: 1-2 days of engineering. Could ship by Monday.
