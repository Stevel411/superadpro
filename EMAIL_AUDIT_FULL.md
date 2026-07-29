# AdvantageLife — Complete Email Audit
_Full inventory of every email the platform can send. 29 Jul 2026._

Purpose: know the exact set of emails AL sends, which are correct, which are disabled, and what's missing — before launch. Two categories that matter: **system emails** (AL sends to members) and **member-product emails** (members send to THEIR leads via the autoresponder — a separate product, not audited for our branding).

---

## A. TRANSACTIONAL — fire on a member action (must be correct & live)

| Email | Trigger | AL status | Content | Action |
|---|---|---|---|---|
| **Welcome (free signup)** | Registers a free account | ✅ Live | ✅ Correct — $100/$50, /join, real tools | none |
| **Welcome (paid/activated)** | — (see note) | ⚠️ see note | mixed | verify path |
| **Membership activated (AL)** | Pays $100/$50 → `_al_activate_*` | ✅ Live | ✅ Correct — in-app notif "Welcome to AdvantageLife" | none |
| **Password reset** | Requests reset | ✅ Live | ✅ Uses BRAND_NAME + reset_url | none |
| **Team-joined ("X joined your team")** | Referral signs up | ✅ Live | ✅ Fixed yesterday — brand_config link + footer | none |

**Note on "Welcome (paid)" + "commission email" + old "membership activated ($15/Profit Grid)":**
These live inside the **old `_activate_membership`** function — which is **NEVER reached on AL** (AL routes to `_al_activate_lifetime`/`_al_activate_annual`). So the wrong-model versions ($15/month, Profit Grid) **cannot fire to AL members.** Confirmed, not assumed. They're dormant SuperAdPro code.

---

## B. LIFECYCLE / SCHEDULED — fire on a cron/timer

| Email | Trigger | AL status | Notes |
|---|---|---|---|
| **Daily briefing (to Steve)** | `AL - daily briefing` cron | 🔴 DISABLED (cron off 29 Jul) | Was SuperAdPro-branded + triggered renewals |
| **$15 renewal reminder** | was: same daily-briefing cron → `process_auto_renewals` | 🔴 KILLED (gated off for AL, commit 696b681) | SuperAdPro monthly model — never fires on AL now |
| **Re-engagement notifications** | `reengagement-notifications` cron | ✅ Live, in-app only (no email) | harmless |
| **Weekly share nudge** | `weekly-share-nudge` cron | ✅ Live | AL feature, correct |
| **Stuck-lapsed / security-watch (to Steve)** | crons | ⚠️ admin ops alerts | still say "SuperAdPro" in subject — see C |

---

## C. MARKETING / DRIP — outreach to members (all currently OFF)

| Email | AL status | Content | Action needed |
|---|---|---|---|
| **Nurture sequence (5 emails)** | 🔴 GATED (NURTURE_ENABLED off) | ✅ Rewritten to AL model yesterday | flip on when ready to launch |
| **Launch broadcast (loyal + free)** | ✅ Built, AL-correct | ✅ correct | loyal SENT; free pending |
| **Founder offer broadcast** | 🔴 BLOCKED on AL (410) | old model | leave blocked (concept retired) |
| **Re-engagement broadcast (old May one)** | 🔴 BLOCKED on AL (410) | old model | leave blocked |

---

## D. ADMIN OPS ALERTS (to Steve only — low priority)

Still carry "SuperAdPro" in subject lines, but they only go to you, so cosmetic:
- Daily briefing (now disabled)
- Stuck-lapsed alert
- Security watch
- Support ticket notifications

**Action:** optional — rebrand subjects to "AdvantageLife" for tidiness, or leave (they're internal).

---

## E. MEMBER-PRODUCT EMAILS (the autoresponder — NOT our branding)

These are emails **members send to their own captured leads** via the AL email-marketing tool (double opt-in confirmations, broadcasts, drip sequences). They carry the *member's* branding, not AL's — this is the product working as intended. Not part of this audit except to confirm the sending rail is healthy.

---

## THE VERDICT — what actually needs doing

**Already correct / handled (no action):**
- Free welcome, paid activation, password reset, team-joined — all AL-correct
- Wrong-model emails ($15 renewal, Profit Grid activation, old founder/re-engagement) — all either killed, gated, or unreachable on AL
- Nurture sequence — rewritten, waiting on the `NURTURE_ENABLED` switch

**Genuinely outstanding:**
1. **Paid-welcome path — RESOLVED (no action):** a $100/$50 payer gets an **in-app notification only** ("Lifetime/Annual membership active" — correctly AL-branded), **no email**. The old paid-welcome email with $15/Profit Grid is never triggered on AL. Clean.
2. **(Optional) Rebrand admin ops-alert subjects** SuperAdPro→AdvantageLife — cosmetic, internal only.
3. **(Missing, future build) A real AL annual-renewal reminder** — "your $50 annual renews next month." Doesn't exist yet; the old $15 one is correctly killed. Only needed once annual members approach year one.

**Bottom line:** the member-facing transactional set is clean and correct. The wrong-model emails are all neutralised. The only genuine item is (3) — eventually building an AL-correct annual-renewal notice — plus optional cosmetic tidying of internal alert subjects.
