# Labs Page Builder — Commercial-Grade Audit

**Status:** In progress (started 20 May 2026)
**Goal:** Every block type works as a commercial-grade funnel builder element. No half-implementations, no phantom code paths, no UX dead-ends.
**Method:** Per-block deep audit → live walkthrough with Steve → fix in priority order → ship per-block commits.

**Severity legend:**
- 🔴 **Blocker** — element is fundamentally broken, conversion-impacting
- 🟠 **Serious** — feature gap or bad UX that hurts trust
- 🟡 **Cosmetic** — polish, ship in batched pass at end

---

## Category 1: Actions (CTA + Form)

These elements are what convert visitors into leads/members. Highest stakes.

### 1.1 Button

**Expected behaviour (commercial-grade):**
- Renders as a clickable element with bold styling, hover state
- Edit affordances: text, **link URL**, **font family**, **font size/weight**, background colour (solid + gradient), text colour, border radius, hover effects
- Visual hint in editor when button has no URL set
- Published page: renders as `<a href="…">` with `target="_blank"` and `rel="noopener noreferrer"` if external link
- Mobile: full-width with sensible side padding, large tap target
- Member can preview a published page from inside the editor — one click, opens the live URL

**Findings (confirmed via live walkthrough 20 May 2026):**

| # | Severity | Issue |
|---|----------|-------|
| B-1 | 🔴 Blocker | **Button edit modal is missing typography controls.** Member can change bg colour + text colour + text content + URL, but cannot change font family, font size, or font weight. A CTA button can't match the visual hierarchy of the page above it. |
| B-2 | 🔴 Blocker | **Preview mode doesn't navigate when button clicked.** The iframe should render the exported HTML with working `<a href>` wrappers, but per Steve clicking the button in Preview mode does nothing. Need to verify whether `el.url` is actually being saved through the modal Apply button. |
| B-3 | 🔴 Blocker | **Publish flow from sandbox has no preview path.** Clicking Publish in a sandbox page exports the page into `/pro/funnels` as a draft (silently — the toast says "Published"). Member then has to navigate manually to `/pro/funnels`, find the page, and publish for real. No link is provided from the editor to view the live URL. |
| B-4 | 🟠 Serious | **QuickProps bar (the floating glass card below selected element) is bloated and confusing.** Shows opacity slider + bg colour swatch + text colour swatch + radius. Steve described as "external window with transparency and size editor that doesn't work". For a Button specifically, none of these are commercial-grade priorities — bg/text colour duplicates the deep-edit modal, opacity is rarely used on a button, radius is fine but should probably live in the modal too. Recommendation: hide QuickProps for Action-category blocks (button, form, banner), since they have their own deep editor. |
| B-5 | 🟠 Serious | QuickProps text-colour swatch doesn't render reliably when colour is a CSS variable (e.g. `var(--sap-accent)`) — `swatchColour()` returns `#ffffff` fallback. Cosmetic but feels broken. |
| B-6 | 🟠 Serious | Canvas gives no visual cue that a button has no URL set. Two identical-looking buttons, one converts, one doesn't, no indication which is which. |
| B-7 | 🟠 Serious | Export at `exportHTML.js:71-72` produces `<a href="${el.url}">` with no validation. URL injection risk (XSS via `javascript:` URL scheme) and no `target="_blank"` / `rel="noopener noreferrer"` for external links. |
| B-8 | 🟡 Cosmetic | No hover-state styling in either canvas render or export. |

### 1.2 Opt-In Form

**Expected behaviour (commercial-grade):**
- Renders as a form with name + email inputs and a submit button
- Edit affordances: form title/subtitle, button label, success message, field labels, field add/remove (just email? name + email? phone too?), GDPR checkbox toggle, redirect URL on success
- Submission: writes to FunnelLead table (already exists in DB), sends to AutoResponder, fires confirmation email
- Published page: real working form that captures into the FunnelLead table
- Mobile: stacks vertically, full-width inputs, large tap target on submit button

**Findings:** Live walkthrough pending — Steve to test next. Code-read flagged:

| # | Severity | Issue |
|---|----------|-------|
| F-1 | TBD | Form default is one giant string of inline HTML rendered via `dangerouslySetInnerHTML`. Submit "button" inside is a styled `<div>`, not a `<button>`. Need full export-path trace. |

### 1.3 Announcement Banner

**Findings (code-read, awaiting live confirmation):**

| # | Severity | Issue |
|---|----------|-------|
| A-1 | 🔴 Blocker | Banner can't have a URL set — `ButtonEditor` URL field is conditionally gated to `type==='button'` only, so the editor never shows the URL input for banners. Export reads `el.url` but it's always undefined. |
| A-2 | 🟠 Serious | Same typography gap as B-1 — no font family / size / weight controls. |
| A-3 | 🟠 Serious | No dismissible toggle. |
| A-4 | 🟠 Serious | No "sticky to top" toggle. |

---

## Category 2: Text (heading, text, label)

*To be populated after live walkthrough*

## Category 3: Media (image, video, audio)

*To be populated after live walkthrough*

## Category 4: Content / Social Proof (review, badge, testimonial, faq, stat, progress)

*To be populated after live walkthrough*

## Category 5: Layout / Decoration (countdown, socials, icon+text, separator, logos, spacer, box, divider, embed)

*To be populated after live walkthrough*

---

## Cross-cutting concerns (audit after per-block sweep)

- Undo/redo across all operations
- Multi-select + group operations
- Keyboard shortcuts (Delete, Cmd+D, Cmd+Z, arrow-key nudge)
- Copy/paste between pages
- Mobile responsive behaviour (DEVICE_WIDTHS cascade)
- Performance on 50+ element pages
- Autosave reliability (30s interval per `AUTO_SAVE_INTERVAL`)
- Manual save + dirty-state tracking
- HTML export correctness (does editor render match published render?)
- Publish flow end-to-end
- Template gallery + sandbox list correctness
- Lock/hide via Layer Panel
- Background image upload + canvas background presets
- Page settings (title, meta, OG image, slug) round-trip correctly

---

## Audit log

**20 May 2026** — Audit started. Category 1 (Actions) findings drafted from code read. Live walkthrough with Steve pending.

