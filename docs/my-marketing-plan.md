# My Marketing — project planning doc

**Status**: Foundation laid (PIF + SAP designed and shipped/staged). Real
work has not started yet. Do not ship the member-facing `/my-marketing`
surface until this doc's prerequisites are met.

**Authored**: 24 May 2026, Steve + Claude (session ending mid-design).

**Why this doc exists**: Steve directed a pause on shipping the
`/my-marketing` member page until the marketing materials are
substantive enough to be worth opening. A thin v1 with one landing page
and a placeholder sales page would hurt member confidence. The remaining
sessions need a clear brief or they'll drift.

---

## Locked decisions

These have been made and shouldn't be re-litigated:

1. **Architecture: marketing_assets table is the single source of truth.**
   Sales pages, marketing landing pages, eventually videos and posters
   all live in the same table, differentiated by `asset_type`. URL
   pattern `/m/<slug>/<username>` already shipped for all of them.

2. **Sponsor attribution: standard `ref` cookie.** Identical to
   `/ref/<username>` and `/join/<username>`. No custom attribution
   layer. Already shipped.

3. **Each marketing page has a brand lockup top-left + single floating
   CTA top-right.** Common pattern across the library. Cobalt-themed
   variant for serious pages, pink-themed for emotional ones.

4. **Frosted-glass card pattern on a fixed full-page Grok background.**
   Each asset gets a bespoke Grok-generated image, not stock.

5. **Dashboard placement: replace `Affiliate Share` card with
   `My Marketing`.** Top-level quick action. `Affiliate Share` route
   `/social-share` remains live but is no longer a dashboard
   destination. It becomes an asset type inside My Marketing.

6. **First sales page exists.** `sap-sales-preview.html` in
   `/mnt/user-data/outputs/`. Approved 24 May 2026. Not yet committed
   to the platform; commits when the rest of the foundation is ready.

7. **`{{ACTIVATION_URL}}`, `{{REFERRAL_URL}}`, `{{USERNAME}}`,
   `{{FIRST_NAME}}` are the standard placeholders.** A new
   `{{SALES_URL}}` will be added when the funnel rewire happens so
   marketing pages can point at the canonical sales page.

---

## Outstanding workstreams

### 1. Marketing page library — at least 4 pages

**Built so far:**
- PIF — `/m/pif/<username>` — live in production as of 23 May 2026
- SAP sales page — `/m/sap/<username>` — designed, approved, staged. Not committed.

**Still to design (next 2-3 sessions):**
Candidate angles, to be locked with Steve before authoring begins:

- **Tools-only** — `/m/tools/<username>` — for prospects who only care
  about what the platform does, not the comp plan. Hero: "The AI
  marketing stack a one-person business actually needs." Lighter
  cyan/sky palette to differentiate from the cobalt SAP page.
- **Earn while you learn** — `/m/earn/<username>` — for affiliate-curious
  prospects. Leads with optional comp plan, four streams, locked
  truth, heavy legal disclaimers. Cobalt with green accents.
- **Side business angle** — `/m/side/<username>` — for the 9-5 escapee
  audience. Emotional, "build something on the side." Warmer palette.
- **Creative Studio feature-specific** — `/m/studio/<username>` — like
  PIF but for the AI Creative Studio. For members who lead with the
  AI tooling.
- **Free tier on-ramp** — `/m/free/<username>` — sells the free signup,
  no card required. Light tone, low pressure.

Steve to lock the final 3-4 angles. Authoring then proceeds 1-2 hours
per asset, matching the PIF/SAP pattern.

### 2. Video content

Steve has created some videos already. Needs inventory:
- What videos exist?
- Where are they hosted? (Internal `/static/videos/`? YouTube? Vimeo?)
- What's their length and tone?
- Which sales/marketing pages do they slot into?

Once inventoried, each marketing/sales page gets its video block wired
up. The SAP sales page already has a 16:9 placeholder ready for swap.

Likely-needed videos:
- SAP explainer (2 min, the canonical "what is SuperAdPro" pitch)
- PIF feature-specific explainer (60-90s, "how Pay It Forward works")
- Per-marketing-page hooks (30-60s, optional)

### 3. Social proof assets

The SAP page has a placeholder block `// Social proof content to be
added //`. Needs replacement with real content. Options:

- Real member quotes (2-3 short testimonials, attributed by first
  name + general role like "member since April 2026")
- Real numbers (cumulative platform stats — total signups, total
  commission paid, founding members claimed, etc — careful to avoid
  income-claim territory)
- Member screenshots (their LinkHub, their Brand Poster, their
  dashboard) showing the platform in real use

**Brand discipline reminder**: No income claims. No "Sarah made $X."
Stay on the right side of the income-disclaimer rule throughout.

### 4. Miniature preview images for each page

Critical for `/my-marketing` UX: when a member opens the page, they
need to see at a glance what each link looks like before sharing.
Pattern Steve named: similar to the Brand Poster gallery cards.

Approach:
- Render each marketing page at production scale
- Take a desktop screenshot (probably 1280×800 or 1440×900)
- Compress + optimise to ~50-100KB JPEG
- Save to `static/images/marketing/<slug>-preview.jpg`
- New column `thumbnail_path` already exists on the `marketing_assets`
  table, ready to receive these paths
- The `/my-marketing` member page renders the thumbnail as the card
  visual

Could be automated via a headless browser screenshotter, but for v1
just take the screenshots by hand. Faster, no Puppeteer dependency.

### 5. Menu / navigation review

The dashboard quick-action card change (Affiliate Share → My
Marketing) is the most visible part. But also:

**Existing surfaces that need rationalisation:**
- `/marketing-materials` — the slide-deck viewer in 21 languages. This
  is genuinely useful content but the name collides with what we're
  building. Options: (a) rename to something like
  `/marketing-decks` or `/presentation-decks` (b) merge into
  `/my-marketing` as an asset type, c) leave for now and decide later.
- `/social-share` — the standalone affiliate-link share page. Keep
  the route live but stop linking to it from the dashboard. Becomes
  an asset type inside My Marketing.
- Sidebar Tools section — currently lists tools FOR building. My
  Marketing is conceptually different (assets to share ABOUT the
  platform). Should NOT live under Tools.
- The Affiliate area — might be the right place for a sidebar entry
  too, but the primary entry point is the dashboard card.

**Recommendation to lock with Steve:**
- Dashboard quick action: My Marketing (replaces Affiliate Share)
- Sidebar: new entry `Marketing` under a new or existing top-level
  area, NOT under Tools
- `/marketing-materials` slide-deck: rename to `/marketing-decks`,
  link to it from inside My Marketing as one of the asset types
- `/social-share`: kept live, surfaced inside My Marketing as one
  of the asset types (raw affiliate link + share buttons)

### 6. Platform PDF update

The downloadable platform PDF needs:
- Screenshots of the new marketing pages
- Updated income-stream truth (Campaign Tiers 100% to affiliates, not
  the legacy 95/5)
- Reference to the new `My Marketing` surface
- Whatever else has changed since the last PDF was generated

To be done after the rest of the marketing library is finalised.
Otherwise we'll redo the PDF every time a marketing page lands.

---

## Dashboard card replacement — spec (ready to implement)

When the rest of the foundation is built, this is the change:

**File**: `frontend/src/pages/Dashboard.jsx`, line ~1032-1041
**Existing**:
```js
{
  id: 'affiliateShare',
  label: t('dashboard.affiliateShareLabel', { defaultValue: 'Grow your team' }),
  title: t('dashboard.affiliateShare', { defaultValue: 'Affiliate Share' }),
  desc: t('dashboard.affiliateShareDesc', { defaultValue: 'Share your link and story to bring more members onto your team.' }),
  cta: t('dashboard.affiliateShareCta', { defaultValue: 'Open share' }),
  colourVar: 'var(--sap-green)',
  icon: Share2,
  link: '/social-share',
}
```

**Replacement**:
```js
{
  id: 'myMarketing',
  label: t('dashboard.myMarketingLabel', { defaultValue: 'Promote your link' }),
  title: t('dashboard.myMarketing', { defaultValue: 'My Marketing' }),
  desc: t('dashboard.myMarketingDesc', { defaultValue: 'Pre-built sales pages, posters and explainer videos with your link baked in — ready to share.' }),
  cta: t('dashboard.myMarketingCta', { defaultValue: 'Open marketing' }),
  colourVar: 'var(--sap-green)',
  icon: Megaphone,
  link: '/my-marketing',
}
```

Plus import swap: `Share2` → `Megaphone` from lucide-react (already
available, no install needed).

Plus i18n key additions to `frontend/src/i18n/locales/en.json` —
`dashboard.myMarketing`, `dashboard.myMarketingLabel`,
`dashboard.myMarketingDesc`, `dashboard.myMarketingCta`. Other 19
locales get TODO entries falling back to English defaults.

---

## Next session — what to do

Session A (the planning + decision-making session) is partially
complete. To finish it Steve needs to:

1. **Lock the 3-4 marketing page angles** (from the candidate list
   above, or new ones from member feedback).
2. **Inventory existing video assets** (which files exist, where
   they live, what they cover).
3. **Decide social proof content** (quotes? screenshots? numbers? all?).
4. **Decide the fate of `/marketing-materials` slide-deck** (rename,
   merge, leave).
5. **Lock the sidebar entry point** (top-level item? under a
   reorganised Promote area?).

Once those decisions are made, subsequent sessions can build the
remaining marketing pages, the video integration, the
`/my-marketing` member page, and the dashboard card swap as a
single coordinated launch.

**Estimated total remaining work** to a v1 launch of My Marketing:
- 3 sessions to design + commit remaining marketing pages (~6-8 hours)
- 1 session for thumbnail screenshots, video wiring, social proof (~3 hours)
- 1 session for `/my-marketing` member page + dashboard card + sidebar (~3 hours)
- 1 session for testing, polish, deprecating old surfaces (~2 hours)

Total: ~14-16 hours over 5-6 sessions.

---

## Files / state at time of writing

- `/mnt/user-data/outputs/sap-sales-preview.html` — approved sales
  page, awaiting commit
- `app/marketing_assets/pif.html` — live PIF asset, in production
- `static/images/marketing/pif-bg.jpg` — live PIF background, in
  production
- `marketing_assets` and `marketing_asset_visits` tables — live in
  production DB, route `/m/<slug>/<username>` serving traffic
