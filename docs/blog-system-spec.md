# SuperAdPro — Member Blog System (Phase 1 spec)
_Last updated 17 Jun 2026. Gating + theme launch set locked._

## 1. Goal
A **one-click branded blog** for full paid members. Member clicks once → a live blog is
provisioned with sensible defaults → they write posts. Every public page carries a subtle
"Powered by SuperAdPro" footer that links through the member's referral code. Members pick
their look from a **theme gallery** in their dashboard.

## 2. Who gets it (gating — LOCKED)
- **Eligible:** Partner ($20/mo) and Founder ($15/mo) — i.e. `is_pro() == True`.
- **Excluded automatically:** Free and $10 Launchpad (both `is_pro()=False`).
- Single permission check; no change to the Launchpad spec or the live deck/comp page.
- If a paid member lapses, the blog flips to unpublished (not deleted) and restores on renewal.

## 3. Theme system (LOCKED)
- A **theme = layout template + design-token set**, selected via `Blog.theme`.
- **Content-agnostic:** the same posts render through whichever theme is active — switching
  is instant and lossless. Members never re-do content to change their look.
- Members choose in the dashboard under **Blog → Appearance**: a gallery of theme cards with
  live previews, one-click apply, current theme badged as active.
- The **"Powered by SuperAdPro" footer + member referral link persist on every theme** — the
  branding/growth loop is theme-independent.
- Adding themes later is additive (new template + tokens), no data migration.

### Launch set (LOCKED — 5 themes)
| Theme | Style | Notes |
|---|---|---|
| **Banner** | Traditional | **Default.** Masthead + category nav + sidebar. |
| Classic Sidebar | Traditional | Familiar blog layout with sidebar widgets. |
| Journal | Traditional | Minimal single column, distraction-free. |
| Bento | Modern | Modular tile grid (featured / inbox / topics). |
| Cinematic | Modern | Dark, premium, glowing gradient hero. |

_Deferred:_ **Glass** (gradient-mesh/frosted) — held for a later batch; backdrop-blur needs
the most cross-device hardening before it ships.

## 4. What it reuses (already in the codebase)
- `FunnelPage` / SuperPages page-builder — block/editor patterns and rendering.
- `CustomDomain` + verify flow + `cron/verify-custom-domains` — custom-domain support ~free.
- `/u/{username}` username-scoped public routing pattern (LinkHub).
- `MemberCourse` author→publish precedent (member content already exists).
- `sitemap.xml` + existing SEO scaffolding.

## 5. Data model (new)
**`Blog`** — one per member:
`id, member_id (FK, unique), title, tagline, subdomain_slug (unique), theme (default 'banner'),
custom_domain_id (FK nullable), is_published, policy_accepted_at, created_at`

**`BlogPost`**:
`id, blog_id (FK), slug, title, excerpt, body, cover_image, status (draft|published),
published_at, seo_title, seo_description, og_image, created_at, updated_at`
(`(blog_id, slug)` unique.)

Phase 2: `BlogPostView` (analytics), tags/categories.

## 6. Routing
**Authed (editor):** `/blog` (post list), `/blog/new`, `/blog/edit/{post_id}`,
`/blog/appearance` (theme gallery), `/blog/settings`.
**Public:** `/u/{username}/blog` (index) and `/u/{username}/blog/{post-slug}` (post),
plus the default subdomain and optional custom domain.
> Each new React route needs a matching `@app.get` shell handler in `app/main.py`, or direct URLs 404.

## 7. One-click provisioning
1. Eligible member taps **"Launch my blog."**
2. Backend creates the `Blog` row: default `subdomain_slug` from username, **theme = Banner**,
   empty-state with a sample starter post, content-policy accepted.
3. Redirect to the blog dashboard — live immediately, customise later.
No configuration required to go live. Custom domain stays optional (existing infra).

## 8. Branding footer (the referral loop — CONFIRMED)
- Every public blog page shows a subtle **"Powered by SuperAdPro"** footer, on every theme.
- The footer links through the member's **referral code** — a blog reader who clicks signs up
  *under that member*. Branding doubles as a growth engine.
- Non-removable in Phase 1. (White-label removal = candidate future higher-tier upsell.)

## 9. SEO / brand isolation
- **Default to a subdomain** (`{slug}.superadpro.com`) rather than a path on the root —
  isolates member content from root-domain authority. Custom domain optional on top.
- Per-post `<title>`/meta/OG. Posts added to a per-blog sitemap.

## 10. Moderation / brand safety (Phase 1 minimum)
- Content-policy acceptance at launch.
- Admin kill-switch to unpublish any blog/post (GET-accessible admin route).
- Publish rate limits + a reader "report" path.
- Standard disclaimer in the footer; **income-claim guard** — flag/auto-hold posts making
  earnings claims, consistent with marketing-discipline rules.
- Heavier moderation tooling (queues, automated scanning) = Phase 2/3.

## 11. Brand styling
- **Dashboard chrome** (editor, Appearance gallery, settings) = house lock: cobalt/cyan/white,
  Sora/DM Sans.
- **Blog content/themes** span a tasteful varied palette (per member-template guidance) — the
  house lock is NOT applied to member content, only to the dashboard chrome and the footer mark.

## 12. Explicitly OUT of Phase 1
Comments, RSS, multi-author, full tag/category taxonomy, analytics dashboards,
white-label/branding removal, Glass theme, theme marketplace.

## 13. Open product decisions (remaining)
1. **Default URL:** subdomain (recommended, SEO-safe) vs path on root.
2. **Editor:** dedicated lightweight rich-text/markdown editor (recommended — better UX for
   blogging) vs reuse the full SuperPages block builder. Grok 4.1 powers AI-assisted drafting either way.

_Resolved:_ gating (`is_pro()`), theme system + 5-theme launch set, Banner default,
footer referral link.

## 14. Effort shape
Phased. Phase 1 = models + gating + editor + provisioning + 5 themes + Appearance picker +
public routes + footer/referral + kill-switch. Phase 2 = custom-domain wiring + per-post SEO/OG
+ AI drafting + analytics. Phase 3 = moderation tooling + tags/RSS/comments + Glass theme.
