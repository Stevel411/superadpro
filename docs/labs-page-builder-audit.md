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
- Edit affordances: text, link URL, background colour (solid + gradient), text colour, border radius, font size/weight, hover effects
- Visual hint in editor when button has no URL set ("this will not click through")
- Published page: renders as `<a href="…">` with `target="_blank"` and `rel="noopener noreferrer"` if external link
- Mobile: full-width with sensible side padding, large tap target

**Findings from code read (20 May 2026):**

| # | Severity | Issue |
|---|----------|-------|
| B-1 | 🔴 Blocker | Button has no link in canvas render (`Canvas.jsx:651-652`). User clicks the button in preview mode and nothing happens. They have to click `✎ LINK` to open `ButtonEditor` to set `el.url`, and even then the canvas preview doesn't navigate. Buttons currently feel decorative, not functional. |
| B-2 | 🟠 Serious | Canvas gives no visual cue that a button has no URL set. Two identical-looking buttons, one converts, one doesn't, no indication which is which. |
| B-3 | 🟠 Serious | The QuickProps panel (the always-visible right rail) doesn't expose URL — user must know to use the floating `✎ LINK` toolbar to find it. Link is the #1 thing you set on a button; it should be top-level. |
| B-4 | 🟠 Serious | Export at `exportHTML.js:71-72` produces `<a href="${el.url}" …>` with no validation. URL injection risk (XSS via `javascript:` URL scheme) and no `target="_blank"` / `rel="noopener noreferrer"` for external links. |
| B-5 | 🟡 Cosmetic | No hover-state styling in either canvas render or export. Member can't preview hover effect, can't customise it. |
| B-6 | 🟡 Cosmetic | Default button text "Join Now" — fine as default, but no inline editing hint. |

### 1.2 Opt-In Form

**Expected behaviour (commercial-grade):**
- Renders as a form with name + email inputs and a submit button
- Edit affordances: form title/subtitle, button label, success message, field labels, field add/remove (just email? name + email? phone too?), GDPR checkbox toggle, redirect URL on success
- Submission: writes to FunnelLead table (already exists in DB), sends to AutoResponder, fires confirmation email
- Visual hint in editor: shows the form will collect leads to the user's Lead dashboard
- Published page: real working form that captures into the FunnelLead table
- Mobile: stacks vertically, full-width inputs, large tap target on submit button

**Findings from code read (initial pass):**

| # | Severity | Issue |
|---|----------|-------|
| F-1 | 🔴 Blocker (suspected — needs verification) | Form default in `elementDefaults.js:17` is a giant string of inline HTML rendered via `dangerouslySetInnerHTML`. The "submit button" inside the form is just a styled `<div>`, not a `<button>`. Even if export tries to wire it up (need to read `exportHTML.js:94+`), the form submission flow needs to be traced end to end. |
| F-2 | TBD | Need to read full form export path and verify FunnelLead writes |
| F-3 | TBD | Need to check what fields are configurable per-form vs hardcoded |
| F-4 | TBD | Field-add UX — can user add a "phone" field, or are they stuck with name+email? |
| F-5 | TBD | Success state — does the form replace itself with a thank-you message, or redirect, or just clear? |

Live walkthrough with Steve needed to confirm what actually happens when a published form is submitted.

### 1.3 Announcement Banner

**Expected behaviour (commercial-grade):**
- Renders as a horizontal banner across the page, eye-catching colour
- Edit affordances: text, link URL (yes, banners should link too — they're CTAs), background colour, dismissible toggle
- Mobile: full-width, smaller font, still readable
- Published: optionally sticky to top of page

**Findings from code read:**

| # | Severity | Issue |
|---|----------|-------|
| A-1 | 🔴 Blocker | Same as B-1 — Announcement renders without link wrapper in canvas. |
| A-2 | 🔴 Blocker | `ButtonEditor` at `SuperPagesEditor.jsx:1370` conditionally shows the URL field **only for `type==='button'`, not `type==='announcement'`**. So even though export reads `el.url` for both, there's no way to set a URL on a banner. |
| A-3 | 🟠 Serious | No dismissible toggle. Banner is permanent. |
| A-4 | 🟠 Serious | No "sticky to top" toggle. Banner just sits at whatever Y position the user dragged it. |

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

