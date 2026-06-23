# SuperAdPro — Member Site & Blog System (FLAGSHIP spec)
_Last updated 23 Jun 2026. Scope upgraded from "blog" to full **website platform** per Steve.
Goal: keep members building their whole web presence ON SuperAdPro. Gating, themes, typography
locked. Video deferred until real users are on the platform._

## 1. Goal & north star (LOCKED)
A **one-click, branded website + blog** for full paid members — the hub where a member's whole
online presence lives, so leaving means rebuilding everywhere else. Commercial-grade
(Webflow / Ghost / WordPress class):
- **Effortless.** One-click launch, autosave, sensible defaults, mobile-first. A good-looking
  post or page published within minutes.
- **A full site, not just a feed.** Blog posts **and** static pages **and** a real nav menu.
- **The toolkit, connected.** The site is the hub that ties the existing products together —
  it does not rebuild them:
  - **Pages** lean on **SuperPages** (`FunnelPage`) block/editor patterns.
  - **Opt-in forms feed SuperLeads** (`LeadList` / `MemberLead`) — blog → email list → nurture.
  - **Media (later)** leans on **Creative Studio** for AI image/video.
- **A growth engine.** Non-removable "Powered by SuperAdPro" referral footer on every public page;
  easy custom domains; quality themes. Every member site spreads SuperAdPro.

## 2. Who gets it (gating — LOCKED)
- **Eligible:** Partner ($20/mo) + Founder ($15/mo) — `is_pro(user) == True` (main.py:1200).
- **Excluded:** Free + $10 Launchpad (`is_pro()=False`). Single permission check.
- Lapsed paid member → site **unpublishes** (not deleted), restores on renewal.

## 3. Theme system (LOCKED)
- Theme = layout template + design-token set, via `Blog.theme`. Content-agnostic, instant switch.
- Chosen under **Site → Appearance**: gallery of theme cards w/ live preview, one-click apply.
- "Powered by SuperAdPro" footer + referral link persist on every theme.
- **Launch set (5):** Banner (default), Classic Sidebar, Journal · Bento, Cinematic.
  Deferred: Glass.

## 3a. Typography (LOCKED)
- Curated heading+body pairings via `Blog.font`, in Appearance. Live preview, instant switch.
- Opening set (~6): Classic Serif (default), Editorial, Modern, Literary, Friendly, Technical.

## 4. What it reuses (already in the codebase)
- `FunnelPage` / SuperPages — block/editor patterns + rendering (for Pages).
- `LeadList` / `MemberLead` — SuperLeads target for opt-in capture.
- `CustomDomain` + `cron/verify-custom-domains` — easy custom domains.
- `/u/{username}` username-scoped public routing (LinkHub).
- `sitemap.xml` + SEO scaffolding. `is_pro()` gating.

## 5. Data model (new)
**`Blog`** (one per member): `id, member_id (FK unique), title, tagline, subdomain_slug (unique),
theme (default 'banner'), font (default 'classic-serif'), custom_domain_id (FK nullable),
is_published, policy_accepted_at, created_at`.

**`BlogPost`**: `id, blog_id (FK), slug, title, excerpt, body (rich text + image embeds),
cover_image, status (draft|published), published_at, seo_title, seo_description, og_image,
created_at, updated_at`. `(blog_id, slug)` unique.

**`BlogPage`** (NEW — static pages: About, Services, Contact…): `id, blog_id (FK), slug, title,
body (rich, SuperPages-style blocks), status (draft|published), show_in_nav, nav_order,
seo_title, seo_description, created_at, updated_at`. `(blog_id, slug)` unique.

**`BlogMenu`** (NEW — nav items, ordered): `id, blog_id (FK), label, link_type
(page|post|external|home), target (page/post slug or URL), position, created_at`.

**`BlogOptinForm`** (NEW — email capture → SuperLeads): `id, blog_id (FK), title, button_label,
success_message, lead_list_id (FK → LeadList), placement (inline|footer|popup), is_active,
created_at`. Submissions create a `MemberLead` in the member's `LeadList`.

**`BlogMedia`** (uploads): `id, blog_id (FK), kind (image), url, width, height, created_at`.
_(kind currently image-only; 'video' added when video ships.)_

## 6. Editor (LOCKED: dedicated, lightweight, media-first)
Focused writing editor (not the heavy SuperPages builder): title, formatting toolbar, autosave,
Preview, Publish.
- **Images: full self-hosting** — drag-and-drop / paste / click-to-upload; cover image;
  auto-resized + lazy-loaded.
- **Video: DEFERRED** (see §13). No video in Phase 1.
- **AI assist:** "Write with AI" (Grok 4.1, `grok_service.ai_text_generate`).
- Right-hand panel: status, slug, excerpt, SEO title/desc, cover.
- **Pages** use the same editor with SuperPages-style block layout for richer static pages.

## 7. Pages + navigation (NEW — the "it's a real site" layer)
- Members create static **Pages** (About/Services/Contact/etc.) alongside posts.
- A simple **menu builder** (Site → Navigation): add/reorder items, each linking to a page, a
  post, the blog home, or an external URL. Menu renders in every theme's header.
- Blog index (the post feed) is one menu item among others — the site is no longer post-only.

## 8. Opt-in forms → SuperLeads (NEW — the moat)
- Members add **opt-in forms** to posts/pages/footer (inline, footer, or popup).
- A submission creates a `MemberLead` in a chosen `LeadList` → flows into the member's existing
  **SuperLeads** autoresponder for automated nurture. Double opt-in optional later.
- This is the differentiator: blog content → email list → automation, all in one membership.

## 9. RSS (NEW — pulled into core)
- Auto-generated `/feed.xml` (or `/rss`) per blog from published posts. Cheap, high value for
  subscribers + syndication. Standard RSS 2.0.

## 10. One-click provisioning
Tap **"Launch my site"** → `Blog` row created (subdomain from username, theme=Banner,
font=Classic Serif, a sample starter post + a sample About page, default nav, policy accepted)
→ live at once.

## 11. Branding footer (referral loop — CONFIRMED)
Non-removable "Powered by SuperAdPro" on every public page/theme, linking through the member's
**referral code** (readers who click sign up under that member). White-label removal = future
higher-tier upsell.

## 12. Custom domains (flagship requirement)
Existing `CustomDomain` + verify cron. Member types domain → we show **one CNAME to copy** (copy
buttons + per-registrar how-to) → auto-verify + SSL in background → Pending→Live. Subdomain
`{slug}.superadpro.com` is the default until a custom domain is connected.

## 13. SEO / brand safety
- Subdomain isolates member content from root authority. Per-post/page title/meta/OG; per-blog
  sitemap; RSS.
- Policy acceptance at launch; admin kill-switch (unpublish); publish rate limits; reader report
  path; footer disclaimer; **income-claim guard** (flag/hold earnings-claim posts).

## 14. Video — deferred (DECISION 23 Jun 2026)
Ship the platform images-only and get real users first. Then:
- **Phase A (after real users):** video **embeds** — paste YouTube/Vimeo/Loom link → oEmbed,
  responsive. Cheap. + short native clips.
- **Phase B (deliberate investment):** full self-hosted long-form video (storage + transcoding
  + CDN + player) — only if demand justifies the ongoing cost.

## 15. Explicitly OUT of Phase 1
Video (any), comments, multi-author, full tag/category taxonomy, analytics dashboards,
white-label removal, Glass theme, custom font upload, theme marketplace, popup A/B testing.

## 16. Build sequence (phased — ship value fast)
1. **Foundation** — models + migrations + `is_pro()` gating + one-click launch + media-first
   editor (images) + 2–3 themes + public routes + referral footer. *Member can publish a blog.*
2. **It becomes a site** — static Pages + menu/nav builder + remaining themes & font pairings +
   Appearance picker + custom domains. *Now it's their website, on their domain.*
3. **The moat** — opt-in forms → SuperLeads + RSS. *Content → email list → automation.*
4. **Flagship polish** — moderation/kill-switch, per-post analytics, more themes.
Later: video (Phase A embeds, Phase B hosting), Creative Studio media, comments, taxonomy.
