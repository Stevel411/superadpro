# AdvantageLife — Email & Notification Audit
_Systematic review of every member-facing email and notification. 28 Jul 2026._

## The three problem categories

1. **Branding** — "SuperAdPro" in subjects, bodies, footers
2. **Wrong domain** — `superadpro.com` links (referral, reset, from-address) → should be `advantagelife.club` / `brand_config.BASE_URL`
3. **WRONG COMPENSATION MODEL** ⚠️ — the old SuperAdPro plan baked into email content:
   - "$10/month for every Partner you refer" (recurring referral commission — **does not exist on AL**)
   - "8-level Profit Grid" (**retired**)
   - "Profit Nexus matrix", "Course Academy pass-ups" (**don't exist**)
   - "$15/month Founding Partner", "$15/month" pricing (**AL is $100 lifetime / $50 annual**)

Category 3 is the serious one — a new member gets told they earn via a plan that isn't yours.

---

## What AdvantageLife ACTUALLY is (the truth these emails must reflect)

- **Membership:** $100 one-time lifetime OR $50/year annual. One-time, not a $15/month subscription.
- **How you earn:** sell Watch-to-Earn campaign packs ($10–$1,000) **member-to-member (P2P)**. Price = 100% commission, buyer pays seller directly.
- **Pass-up:** 3/6/9 infinite pass-up. NOT a Profit Grid, NOT uni-level %, NOT recurring $10/month referrals.
- **No** recurring referral commission. **No** Profit Grid. **No** Nexus. **No** Course Academy.
- **Earning gates:** own a pack (with a submitted video ad) + daily watch + receiving method.

---

## INVENTORY — every member-facing email (in `app/email_utils.py` unless noted)

| # | Email | Live? | Branding | Domain | **Comp-model** | Severity |
|---|-------|-------|----------|--------|----------------|----------|
| 1 | `send_welcome_email` (paid) | ✅ 2x | ? | ? | ? | review |
| 2 | `send_welcome_free_email` (Image 2) | ✅ 4x | — | SITE_URL ok | ⚠️ "$10/month for every Partner" | **HIGH** |
| 3 | `send_commission_email` | ✅ 2x | ? | ? | ? | review |
| 4 | `send_password_reset_email` | ✅ 3x | ? | ⚠️ superadpro.com reset link | — | **HIGH** |
| 5 | `send_membership_activated_email` | ✅ 2x | ? | ? | ? | review |
| 6 | `send_renewal_reminder_email` | ❌ 0x (dead) | — | — | — | low |
| 7 | `send_nurture_email` | ✅ 3x | ⚠️ "SuperAdPro account" | ? | ⚠️ Profit Grid, $10/mo, Nexus, Academy | **HIGH** |
| 8 | `render_founder_offer_email` | ✅ 2x | — | — | ⚠️ "$15/month Founding Partner", 8-level grid | **HIGH** |
| 9 | `render_reengagement_email` | ✅ 2x | ? | ? | ⚠️ likely old model | **HIGH** |
| 10 | Team-joined email (main.py) | ✅ | ✅ FIXED | ✅ FIXED | — | done |
| 11 | Welcome notification (main.py) | ✅ | ✅ FIXED | — | — | done |

**From-addresses:** 9 uses of `steve@superadpro.com` / `noreply@superadpro.com` in email_utils.py → should be `brand_config.FROM_EMAIL` / a `@advantagelife.club` address.

---

## RECOMMENDED APPROACH

### Phase 1 — Mechanical (safe, no judgment needed) — I can do now
- Replace hardcoded `superadpro.com` → `brand_config.BASE_URL` in member-facing links (reset, referral, dashboard)
- Replace `steve@superadpro.com` / `noreply@superadpro.com` → `brand_config.FROM_EMAIL`
- Replace "SuperAdPro" brand strings → `brand_config.BRAND_NAME`
- **Leave** infrastructure refs (CORS origins, legacy-domain redirect handling) untouched

### Phase 2 — Content rewrite (needs your sign-off) — messaging about YOUR model
Every email describing "$10/month referrals / Profit Grid / Nexus / Academy / $15/month" must be rewritten to the real AL model:
- Welcome (free + paid): what you actually get + how you actually earn (P2P packs)
- Nurture sequence: rewrite the earning narrative
- Founder offer: this whole concept ($15/mo founding) may not even apply to AL — **decide: keep, rewrite, or retire?**
- Re-engagement: align to AL

**Phase 2 is where I need you** — it's your compensation messaging, and it must be accurate + claims-clean (no guaranteed income), same discipline as your video scripts.

---

## KEY DECISIONS FOR STEVE
1. **The "Founder offer" emails** ($15/mo founding partner, locked pricing) — does this concept exist on AL at all? If not, retire those emails entirely.
2. **The nurture sequence** — keep the multi-email drip, rewritten for AL? Or simplify?
3. **From-address** — confirm the AL sending address (e.g. `steve@advantagelife.club` for personal, `noreply@advantagelife.club` for system).
