# Ad Studio — Phase-1 Build Plan

*Repositioning of Creative Studio into a marketer-specific ad engine. For approval before any code is cut.*

---

## 0. What this is

Turn the (currently broken, low-uptake) general Creative Studio into **Ad Studio**: pick a proven ad style → add an angle → get a batch of ready-to-post ads with the member's **lead-capture page baked into every CTA**, a **QR code**, and a **tracked link** — opt-ins landing straight in SuperLeads and firing their autoresponder. Plus a **30-day "My Ads" gallery**.

The moat: every generic AI ad tool starts from a blank prompt or a random product URL. We start from the member's own offer + capture page + referral identity, on rails we already own.

---

## 1. Scope — LOCKED (defaults approved 2026-06-17)

**In Phase 1**
- Image ads only (6 styles), built sharp. Video = Phase 2.
- Destination selector: **Direct signup** + **Lead capture page** + **Custom URL** at launch (LinkHub right behind).
- QR toggle (any image) → capture page.
- Per-ad tracking tag (`?ad=…`).
- 30-day My Ads gallery + auto-cleanup.
- HTML5 clickable-banner export.
- Name: **Ad Studio** — the new front door. Posters become the **Ad Posters** tab on that page (nothing lost).

**Deferred to Phase 2+**
- Video ads (UGC avatar, hook+captions, reel, founder-to-cam).
- LinkHub + SuperPage-picker destinations beyond the basic capture page.
- "Send to Campaign" deep integration.

> Generation still runs on the existing **credit** model (USDT pay-per-use credits via the Credit Matrix). QR + HTML5 + tracking are free add-ons — they cost us nothing at the provider, so no extra charge. (Your separate note that pay-per-use itself may be an uptake barrier is a *pricing* decision, out of scope here — flagging, not solving.)

---

## 2. Reuse, don't rebuild — verified rails

These already exist and work; Phase 1 wires into them rather than duplicating:

| Need | Existing rail (verified in code) |
|---|---|
| Lead capture → CRM | `POST /api/capture/{username}/{slug}` → creates `MemberLead` |
| Autoresponder trigger | capture handler sets `lead.email_sequence_id = page.capture_sequence_id`, then calls `_send_sequence_email(db, lead, 0)` immediately |
| Capture pages | `funnel_pages` (SuperPages) carry `capture_sequence_id` |
| Sequences | `EmailSequence` (AI autoresponders, per member) + Brevo contact via `_create_brevo_contact` |
| Image generation | `_route_generate_video` / image-generation provider chain (Grok → fal → EvoLink) |
| Asset storage | `r2_storage.upload_image()` → returns R2 public URL |
| Paid-feature gating | `TierGateMiddleware` already gates `/api/superscene*` to active members |
| Scheduled jobs | existing daily-cron service pattern (`daily-briefing-cron`) |

**Nothing in the lead/autoresponder pipeline needs building.** Ad Studio just points CTAs at a capture page and lets that pipeline do its job.

---

## 3. The one real piece of new infrastructure: asset persistence

Providers return **temporary** asset URLs that expire (often within hours). A 30-day gallery, re-download, re-post, and QR/HTML5 all depend on the asset still existing. So on generation success we must:

1. Download the finished asset from the provider URL.
2. Re-upload to our R2 bucket via `r2_storage` (new `ad-assets/` prefix).
3. Store **our** R2 URL on the asset row, with `expires_at = created_at + 30 days`.

This is the load-bearing change. Everything else hangs off it. Cost is negligible (R2 storage is pennies; 30-day TTL caps total footprint).

---

## 4. Data model (proposed new table)

`AdAsset` — one row per generated/saved ad (image now, video later):

```
id              PK
user_id         FK users
kind            'image' | 'video'
style           'dm' | 'hero' | 'before_after' | 'testimonial' | 'problem_solution' | 'bold'
asset_url       our R2 URL (NOT the provider's)
thumb_url       R2 thumb
destination_type 'signup' | 'capture' | 'linkhub' | 'custom'
destination_url  resolved URL incl. ?ad= tracking tag
capture_page_id  FK funnel_pages (nullable; set when destination_type='capture')
ad_tag          'dm-03' etc. (the tracking slug)
has_qr           bool
html5_export_url R2 URL of the clickable-banner zip/page (nullable)
client_token     idempotency (reuse existing SuperScene idempotency pattern)
status           'pending' | 'ready' | 'failed'
created_at
expires_at       created_at + 30d
```

Decision point: extend `SuperSceneVideo` vs. a clean `AdAsset` table. **Recommend `AdAsset`** — image ads aren't videos, and a clean table avoids overloading the existing one. Migration via the established one-shot admin GET endpoint pattern (prod runs `SKIP_MIGRATIONS=true`).

---

## 5. QR + tracking + HTML5 export

- **Tracking tag:** on batch generate, each variant gets `?ad={style}-{NN}` appended to `destination_url`. Stored on the row so the gallery and any future analytics can attribute opt-ins. (Capture endpoint can log the `ad` param against the `MemberLead` for "which ad converted" later — Phase 2 analytics, but stamp it now so the data exists.)
- **QR:** generated server-side from `destination_url` (Python `segno`/`qrcode`), composited onto the creative at export. Free, deterministic, no provider call.
- **HTML5 clickable banner:** template that wraps the rendered image in `<a href="{destination_url}">` at the ad's dimensions; packaged as a self-contained file the member can drop on a site, email, or display network. This is the genuinely-clickable path (social posts can't be — covered in the design notes).

---

## 6. The 30-day gallery + cleanup

- **Gallery:** `GET /api/ad-studio/my-ads` → the member's non-expired `AdAsset` rows, newest first, with `expires_at` for the countdown UI. Per-ad actions: download, re-post (copies link), delete.
- **Cleanup:** extend the daily cron — one sweep deletes R2 objects + rows where `expires_at < now()`. Idempotent per UTC day, same pattern as `daily-briefing-cron`.
- **Winner-loss mitigation (the flag I raised):** downloaded files are the member's forever; gallery shows a countdown; the `< 3 days` state turns red as a nudge. Default clock starts at generation. (Override available: 30 days from last download/use — say the word.)

---

## 7. Surface & routing

- New React page `AdStudio.jsx` (replaces the Creative Studio front door; posters become a tab).
- **Matching `@app.get("/ad-studio")`** shell handler in `main.py` (every React route needs one or direct URLs 404).
- Sidebar entry under **Create**.
- Already covered by `TierGateMiddleware` if endpoints sit under a gated prefix — keep them under `/api/superscene*` or add `/api/ad-studio` to the paid-required list.
- Full sidebar CSS included in the template (per the standing rule).

---

## 8. Build sequence

1. `AdAsset` model + one-shot migration endpoint.
2. Asset-persist-on-completion (download → R2) — the spine.
3. Generate endpoint: batch image gen → persist → tracking tag → row per variant.
4. Destination resolver (signup / capture page / custom) + capture-page picker (reads member's `funnel_pages`).
5. QR compositing + HTML5 export.
6. Gallery endpoint + UI + countdown.
7. Cleanup cron.
8. Frontend `AdStudio.jsx` + route shell + sidebar + bundle build.
9. End-to-end verification: generate → capture-page CTA → submit a test lead → confirm `MemberLead` created + first sequence email fired.

Each step is independently shippable; dry-run/verify before anything touches member-visible surfaces.

---

## 9. Decisions — LOCKED (2026-06-17)

1. **Scope:** defaults approved. Ad Studio is the new front door; **Ad Posters** is a tab on that page; image ads first (video Phase 2); destinations = signup / lead-capture page / custom (LinkHub next).
2. **`AdAsset` new table** — approved (not extending `SuperSceneVideo`).
3. **Expiry clock** — from generation.
4. **Credits** — unchanged for generation; QR / HTML5 / tracking are free add-ons.

## 10. Build status

- [x] Step 1 — `AdAsset` model + `GET /admin/api/apply-ad-studio-schema` one-shot migration.
- [x] Step 2 — `persist_remote_asset_to_r2()` (download → R2). Verified on prod 2026-06-17: round-trip returns a public R2 URL that serves 200/image-jpeg, byte-exact.
- [ ] Steps 3–9 per §8.

> Engine note: the live image/video generate path is currently failing ("Network error", nothing generated since 31 Mar). Diagnostic shipped (`d7ba6d9`). That path becomes Ad Studio's engine, so it must be fixed before Step 3 is end-to-end testable.
