# SuperAdPro — Member Blog System (Phase 1 spec)
_Last updated 17 Jun 2026. Gating, themes, typography locked. Positioned as a flagship product._

## 1. Goal
A **one-click, branded blog** for full paid members — dead simple to use, rich with images
and video, and a growth engine for SuperAdPro. Member clicks once → a live blog is provisioned
→ they write, drop in media, and publish. Every public page carries a subtle "Powered by
SuperAdPro" footer linking through the member's referral code.

## 1a. Product north star (LOCKED)
This is a **flagship product**, held to commercial-grade standard (Webflow / Ghost / Substack):
- **Effortless to use.** One-click launch, minimal configuration, autosave, sensible defaults.
  A member should be able to publish a good-looking post within minutes, on mobile.
- **Media-first.** Adding images and video must be trivial — drag-and-drop, paste-a-link, upload.
- **A growth engine.** The referral footer + custom domains + quality themes turn every member
  blog into a channel that spreads SuperAdPro.
- **Easy custom domains.** Connecting a member's own domain must be as frictionless as possible.

## 2. Who gets it (gating — LOCKED)
- **Eligible:** Partner ($20/mo) and Founder ($15/mo) — i.e. `is_pro() == True`.
- **Excluded automatically:** Free and $10 Launchpad (both `is_pro()=False`).
- Single permission check; no change to the Launchpad spec or the live deck/comp page.
- Lapsed paid member → blog unpublishes (not deleted), restores on renewal.

## 3. Theme system (LOCKED)
- A **theme = layout template + design-token set**, selected via `Blog.theme`.
- **Content-agnostic:** the same posts render through whichever theme is active — switching is
  instant and lossless.
- Chosen in the dashboard under **Blog → Appearance**: a gallery of theme cards with live
  previews, one-click apply, current theme badged.
- The **"Powered by SuperAdPro" footer + referral link persist on every theme**.

### Launch set (LOCKED — 5 themes)
Banner (**default**), Classic Sidebar, Journal (traditional) · Bento, Cinematic (modern).
Deferred: **Glass** (frosted/mesh — needs cross-device hardening).

## 3a. Typography (LOCKED)
- Members pick from a **curated set of font pairings** (heading + body together) in the same
  **Appearance** tab, stored as `Blog.font`. Live previews; content-agnostic; instant switch.
- **Curated, not unlimited** — every option is hand-picked to look great, so member blogs can't
  end up looking broken under the SuperAdPro footer. Each theme has a sensible default pairing.
- Opening set (~6): Classic Serif (default, Merriweather), Editorial (Fraunces/Inter),
  Modern (Space Grotesk/DM Sans), Literary (Spectral/Inter), Friendly (Outfit), Technical
  (Sora/JetBrains Mono). All stay fast + mobile-friendly.

## 4. What it reuses (already in the codebase)
- `FunnelPage` / SuperPages page-builder — block/editor patterns and rendering.
- `CustomDomain` + verify flow + `cron/verify-custom-domains` — basis for easy custom domains.
- `/u/{username}` username-scoped public routing pattern (LinkHub).
- `MemberCourse` author→publish precedent.
- `sitemap.xml` + existing SEO scaffolding.
- Creative Studio (USDT credits) — image/video generation that can feed blog media later.

## 5. Data model (new)
**`Blog`** — one per member:
`id, member_id (FK, unique), title, tagline, subdomain_slug (unique), theme (default 'banner'),
font (default 'classic-serif'), custom_domain_id (FK nullable), is_published, policy_accepted_at,
created_at`

**`BlogPost`**:
`id, blog_id (FK), slug, title, excerpt, body (rich; stores text + image/video embeds),
cover_image, status (draft|published), published_at, seo_title, seo_description, og_image,
created_at, updated_at`  (`(blog_id, slug)` unique.)

**`BlogMedia`** (uploads): `id, blog_id (FK), kind (image|video), url, width, height, created_at`.

## 6. Editor (LOCKED direction: dedicated, lightweight, media-first)
A focused writing editor (not the heavy SuperPages builder): title, formatting toolbar,
autosave drafts, Preview, Publish. Plus:
- **Images:** drag-and-drop or paste directly into the body; click-to-upload; cover image.
  Auto-resized/optimised on upload; lazy-loaded on the public page.
- **Video:** **paste a link** (YouTube, Vimeo, Loom, etc.) → auto-embeds via oEmbed; plus native
  short uploads. Embeds are responsive by default.
- **AI assist:** "Write with AI" (Grok 4.1, `grok_service.ai_text_generate`) to draft/expand.
- Right-hand settings panel: status, slug, category, tags, excerpt, SEO title/desc, cover.

## 7. One-click provisioning
Tap **"Launch my blog"** → `Blog` row created (subdomain from username, theme=Banner,
font=Classic Serif, sample starter post, policy accepted) → redirect to dashboard. Live at once.

## 8. Branding footer (the referral loop — CONFIRMED)
Subtle **"Powered by SuperAdPro"** on every public page, every theme, linking through the
member's **referral code** — blog readers who click sign up under that member. Non-removable in
Phase 1 (white-label removal = future higher-tier upsell).

## 9. Custom domains (easy onboarding — flagship requirement)
Leverages the existing `CustomDomain` model + verify cron. The member experience must be
**as frictionless as possible**:
1. Member types their domain (e.g. `blog.alexmonroe.com`) in **Blog → Settings → Domain**.
2. We show **one DNS record to copy** (a single CNAME), with copy buttons and a "how to" per
   popular registrar.
3. **Auto-verify** in the background (cron) + SSL provisioning; status shows Pending → Live.
No code, no support ticket. Subdomain (`{slug}.superadpro.com`) is the default until/unless a
custom domain is connected.

## 10. SEO / brand isolation
Default subdomain isolates member content from root-domain authority. Per-post title/meta/OG;
posts in a per-blog sitemap.

## 11. Moderation / brand safety (Phase 1 minimum)
Policy acceptance at launch; admin kill-switch to unpublish; publish rate limits; reader report
path; footer disclaimer; **income-claim guard** (flag/hold earnings-claim posts) per marketing rules.

## 12. Brand styling
Dashboard chrome (editor, Appearance, settings) = house lock (cobalt/cyan/white, Sora/DM Sans).
Blog content/themes/fonts span a tasteful varied range — house lock applies only to the chrome
and the footer mark, not member content.

## 13. Explicitly OUT of Phase 1
Comments, RSS, multi-author, full tag/category taxonomy, analytics dashboards, white-label
removal, Glass theme, unlimited/custom font upload, theme marketplace.

## 14. Decisions
**Resolved:** gating (`is_pro()`); themes + 5-theme launch set; Banner default; typography
(curated pairings); footer referral link; editor = dedicated lightweight + media-first
(images drag/drop, video paste-link, AI assist); default URL = subdomain; easy custom-domain flow.
**Open:** none blocking — ready to scope the Phase-1 build when green-lit.

## 15. Effort shape
Phase 1 = models + gating + media-first editor + 5 themes + typography + Appearance picker +
one-click provisioning + public routes + footer/referral + custom-domain onboarding + kill-switch.
Phase 2 = per-post analytics + AI media (Creative Studio) + more themes/fonts.
Phase 3 = moderation tooling + tags/RSS/comments + Glass theme.
