# SuperAdPro — Member Site & Blog Platform (FLAGSHIP spec)
_Last updated 23 Jun 2026. Bar = **best blog/site platform in the industry** (Ghost / Substack /
WordPress class), not an MVP. Full website platform: blog + pages + nav + capture + custom domains.
Goal: keep members building their whole web presence ON SuperAdPro. Video deferred until real users._

## 1. North star (LOCKED)
A **one-click, branded website + blog** for paid members — the hub where a member's whole online
presence lives, so leaving means rebuilding everywhere else.
- **Effortless** — one-click launch, autosave, mobile-first, publish in minutes.
- **A full site, not a feed** — posts + static pages + real nav menu, on the member's own domain.
- **Best-in-class blogging** — everything a serious blogger expects (see §6–§9), nothing parked
  "to keep it lean."
- **The toolkit, connected (don't rebuild):** Pages reuse **SuperPages** (`FunnelPage`) blocks;
  opt-in/newsletter feeds **SuperLeads** (`LeadList`/`MemberLead`); media (later) from Creative
  Studio. This bundle — blog + site + email automation in one membership — is how we BEAT rivals.
- **A growth engine** — non-removable "Powered by SuperAdPro" referral footer on every page;
  reader share buttons; easy custom domains.

## 2. Gating (LOCKED)
Eligible: Partner ($20) + Founder ($15) — `is_pro(user)` (main.py:1200). Excluded: Free + $10
Launchpad. Lapsed paid → site **unpublishes** (not deleted), restores on renewal.

## 3. Public access (LOCKED)
Member sites are **fully public** — any visitor reads freely, no account, no login. Auth is
checked ONLY on the build side (editor/dashboard). Readers signing up via the footer = the
optional growth loop, never a paywall on reading.

## 4. Themes + typography (LOCKED)
- Theme = layout + token set (`Blog.theme`); content-agnostic, instant switch; live preview in
  **Site → Appearance**. Footer + referral persist on every theme.
- Launch themes (5): Banner (default), Classic Sidebar, Journal, Bento, Cinematic. (Glass later.)
- Curated heading+body font pairings (`Blog.font`), ~6 to start, instant switch, live preview.

## 5. Reuses (in codebase)
`FunnelPage`/SuperPages (page blocks) · `LeadList`/`MemberLead` (capture target) ·
`CustomDomain` + verify cron (domains) · `/u/{username}` routing · sitemap/SEO · `is_pro()`.

## 6. The blog (best-in-class — LOCKED)
- **Post page** — own clean URL, cover image, rich body, theme-styled. **Post feed/index** —
  all posts newest-first, one nav item among others.
- **Rich editor** (dedicated, lightweight, media-first): headings, bold/italic, quotes, lists,
  links, dividers, code blocks, callouts, image galleries. Autosave drafts, Preview, Publish.
- **Images: full self-hosting** — drag/drop, paste, upload; cover image; auto-resized + lazy.
  **Clickable images** (link to URL/post/product), **lightbox** zoom, **captions + alt text**
  (alt = SEO + accessibility).
- **Tags** — label posts; each tag gets its own page listing its posts; tags shown + clickable on
  posts (reader navigation + extra indexed, internally-linked SEO pages).
- **Scheduled publishing** — write now, auto-publish at a set time (cron-driven).
- **AI assist** — "Write with AI" (Grok 4.1, `grok_service.ai_text_generate`) to draft/expand.
- **Comments** (LOCKED IN) — readers comment on posts; per-blog on/off; moderation queue +
  spam guard + admin kill-switch; member approves/deletes from dashboard.
- **Post analytics** (LOCKED IN) — views per post + totals, simple member-facing dashboard.

## 7. Pages + navigation (LOCKED)
Static **Pages** (About/Services/Contact…) via SuperPages-style blocks, alongside posts. A
**menu builder** (Site → Navigation): add/reorder items linking to a page, post, blog home, tag,
or external URL; renders in every theme header. The post feed is one menu item — site is not
post-only.

## 8. Social (LOCKED)
- **Member's own social links** (Instagram/X/YouTube/TikTok/LinkedIn) in header/footer — follow
  the member. Stored on `Blog`.
- **Reader share buttons** per post (X/Facebook/LinkedIn/copy-link) — free distribution; every
  share carries the referral footer.

## 9. Newsletter / opt-in → SuperLeads (LOCKED — the moat)
Opt-in forms on posts/pages/footer (inline/footer/popup). Submission → `MemberLead` in a chosen
`LeadList` → member's **SuperLeads** autoresponder for automated nurture. No rival bundles this.

## 10. SEO (best-in-class — LOCKED)
Per-post/page **SEO title + meta description** (separate from headline), **OG image + tags**
(rich social cards), **clean URLs**, **tag pages**, **per-site sitemap**, **RSS** (`/feed.xml`),
fast mobile-first themes (speed/mobile = ranking factors), image alt text. Subdomain isolates
member content from root authority; custom domain accrues SEO to the member's brand.

## 11. Custom domains (LOCKED)
`CustomDomain` + cron. Member types domain → one CNAME to copy (buttons + per-registrar how-to)
→ auto-verify + SSL → Pending→Live. `{slug}.superadpro.com` default until connected.

## 12. One-click provisioning
"Launch my site" → `Blog` created (subdomain from username, Banner/Classic-Serif, sample post +
sample About page + default nav, policy accepted) → live at once.

## 13. Brand safety / referral footer
Non-removable "Powered by SuperAdPro" footer (referral link) on every page/theme. Policy accept
at launch; admin kill-switch; publish + comment rate limits; reader report path; **income-claim
guard** (flag/hold earnings-claim posts) per marketing rules. White-label removal = future upsell.

## 14. Data model (new)
- **`Blog`** (one/member): `id, member_id (FK unique), title, tagline, subdomain_slug (unique),
  theme, font, custom_domain_id (FK null), social_links (JSON), comments_enabled, is_published,
  policy_accepted_at, created_at`.
- **`BlogPost`**: `id, blog_id (FK), slug, title, excerpt, body (rich), cover_image, status
  (draft|scheduled|published), scheduled_at, published_at, view_count, seo_title, seo_description,
  og_image, created_at, updated_at`. `(blog_id, slug)` unique.
- **`BlogPage`**: `id, blog_id, slug, title, body (blocks), status, show_in_nav, nav_order,
  seo_title, seo_description, created_at, updated_at`. `(blog_id, slug)` unique.
- **`BlogTag`**: `id, blog_id, name, slug`. **`blog_post_tags`** assoc: `(post_id, tag_id)`.
- **`BlogMenu`**: `id, blog_id, label, link_type (page|post|tag|home|external), target, position`.
- **`BlogOptinForm`**: `id, blog_id, title, button_label, success_message, lead_list_id (FK),
  placement (inline|footer|popup), is_active, created_at`.
- **`BlogComment`**: `id, post_id (FK), author_name, author_email, body, status
  (pending|approved|spam), created_at`.
- **`BlogMedia`**: `id, blog_id, kind (image), url, width, height, alt, created_at`.
- **`BlogPostView`** (or counter): per-post view tracking for analytics.

## 15. Video — deferred (DECISION 23 Jun)
Ship images-only; get real users; then Phase A = embeds (oEmbed: YouTube/Vimeo/Loom) + short
native clips; Phase B = full self-hosted video (storage+transcode+CDN+player) only if demand
justifies cost.

## 16. Out (even at flagship bar)
Video (for now), multi-author, white-label removal, Glass theme, custom font upload, theme
marketplace, A/B testing, e-commerce/checkout. (Everything a top blog platform has is IN.)

## 17. Build sequence (ship value fast)
1. **Foundation** — all models + migrations + `is_pro()` gating + one-click launch + rich
   media-first editor (images, clickable, lightbox, blocks, autosave) + post page + feed + tags +
   scheduling + 2–3 themes + SEO meta/sitemap + referral footer. *Member publishes a real blog.*
2. **Full site** — Pages + menu builder + social links + share buttons + all themes/fonts +
   Appearance picker + custom domains. *Their website, on their domain.*
3. **Moat + engagement** — opt-in → SuperLeads + RSS + comments (+ moderation) + post analytics.
4. **Polish** — admin moderation tooling, more themes, then video (A: embeds, B: hosting),
   Creative Studio media.
