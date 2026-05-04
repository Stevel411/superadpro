# Solicitor Brief — Purchase Consent System

**Date:** 2 May 2026
**Platform:** SuperAdPro (https://www.superadpro.com)
**Operator:** UK-based; Steve Lawson, sole director.
**Soft launch:** 6–7 May 2026; full launch 10 May 2026.
**Reviewer:** [solicitor name] — friend of operator, asked to sign off
before launch.

---

## What the platform does (brief)

SuperAdPro is a subscription-based platform that bundles AI marketing
tools (text/video/image generation, lead-finding, autoresponders,
funnel-builder, etc.) with an optional affiliate compensation plan.
Members can pay for:

1. **Membership** — $20/month Basic or $35/month Pro digital
   subscription. Activates instantly on payment.
2. **Income Grid entries** — pay-to-play matrix slots ($20-$100+
   tiers). On purchase, commissions are paid out **immediately** to
   the buyer's sponsor and uplines per the published plan.
3. **Credit Nexus / matrix packs** — similar to grid entries, separate
   matrix structure.
4. **Course purchases** — instant digital course access.
5. **AI tool credits** — instant top-up to Creative Studio credits.
6. **Lead-boost / email-boost services** — instant service activation.

**Critical commercial fact**: For purchases (2)–(6) and renewals of
(1), the moment payment confirms, the system irreversibly distributes
funds: a portion to the company treasury, and substantial portions to
the buyer's sponsor and upline as commissions. **Once the commission
flow has run, those funds are in third parties' wallets and cannot be
clawed back without disrupting innocent recipients.**

This commercial reality is the reason for a strict no-refund policy
on impulse buyer's remorse, while still refunding for platform-fault
or fraud. The system below captures express consent to those terms.

## What we have built

A consent capture system on the platform that:

1. **Before any money-in transaction**, presents the user with a
   modal containing the disclaimer text (`docs/legal/PURCHASE-CONSENT-V1.md`
   in this repo) and requires them to:
   - Tick a box confirming they have read and understand the terms
   - Click a separate "I Agree & Proceed" button

2. **Records the consent in a database table** (`purchase_consents`),
   storing:
   - User ID
   - Consent version label (e.g. `v1.0`)
   - SHA-256 hash of the exact text accepted
   - User's IP address
   - User's browser user-agent
   - Timestamp of consent
   - Timestamp when the consent was used to authorise an actual purchase
   - The product/transaction the consent ultimately authorised

3. **Validates consent at every money-in API endpoint**:
   - Membership purchase / activation
   - Grid / Campaign Tier entry
   - Credit Matrix / Nexus purchase
   - Course purchase
   - AI credit top-ups
   - Email / lead boost purchases
   - All NOWPayments crypto invoices

4. **Enforces freshness**: a consent is valid for 5 minutes from
   creation. After 5 minutes the user must re-consent. This prevents
   one-time consent at signup being used to authorise unlimited later
   purchases without seeing the disclaimer again.

5. **Single-use**: each consent record can only authorise one purchase
   (`consumed_at` is stamped on use). A second simultaneous purchase
   requires a second consent.

6. **Feature flag**: `PURCHASE_CONSENT_ENFORCED` env var. Set to
   `false` until your sign-off, at which point we flip it to `true`
   and the system goes live. While `false`, the modal still displays
   and consents are recorded, but the server doesn't yet block
   purchases without consent — so the rails can be tested end-to-end
   in production safely before enforcement.

## What we need from you

**1. Review the disclaimer text** at
`docs/legal/PURCHASE-CONSENT-V1.md`.

The two pieces of language that most need your professional eye:

(a) The **express-consent waiver** under Consumer Contracts
Regulations 2013 reg. 37 — does the wording satisfy the "express
consent + acknowledgment of loss of cancellation right" requirement
sufficient to disapply the 14-day cooling-off period for digital
content / services?

(b) The **commission-flow / immediate-irreversibility paragraph** —
does the explanation of why refunds are commercially impossible
constitute a fair, unambiguous statement of terms (relevant to
Consumer Rights Act 2015 s.62 fairness test for consumer contracts)?

**2. Identify carve-outs we should explicitly preserve.** We will
always honour:
- Refunds for platform faults (failed activation, double-charging,
  duplicate orders our idempotency layer caught)
- Refunds for fraudulent transactions (stolen card, compromised
  account)
- Refunds where required by law (underage buyer, statutory cooling-off
  cases not covered by the express-consent waiver, etc.)

Are these sufficient? Is anything missing?

**3. Income / earnings claims**. The platform has a compensation plan
that pays real commissions but the operator is conscious not to
make income guarantees. We have an income disclaimer in the
disclaimer text. Does it meet the bar for an MLM-adjacent product
under UK ASA / CMA guidelines?

**4. MLM-specific concerns**. Are we exposed to any pyramid-scheme
adjacency under the Consumer Protection from Unfair Trading
Regulations 2008? The operator's commercial intent is clear: members
buy access to AI tools they would use regardless of whether they
recruit others, and the compensation plan is optional. The disclaimer
states this explicitly. Does the wording defend that distinction
adequately?

**5. Anything else** that a UK-qualified solicitor reviewing a
money-touching MLM-adjacent SaaS platform's terms would flag.

## Practical reviewing notes

- The text is intentionally plain-English. Steve's audience is
  network marketers, not lawyers. Where the law requires specific
  formal language (e.g. the express-consent waiver clause), it is
  used verbatim; everywhere else, plain language is preferred. If
  any clause needs to be more formal to be enforceable, please flag.

- The text is **versioned**. Once you sign off, we lock the version
  to `v1.0` and any future change creates `v1.1` etc., with each
  version's hash stored against the consents that accepted it. So
  if the text is updated post-launch, we can prove who consented to
  which version.

- The full TOS / Privacy Policy / Cookie Policy are out of scope of
  this brief. This brief covers only the **per-transaction
  no-refund consent**. Steve will want a separate engagement with you
  for the full TOS suite if you're available.

## How sign-off works

After your review:

1. Reply with any required wording changes to
   `docs/legal/PURCHASE-CONSENT-V1.md`.
2. We update the file, increment the version (e.g. v1.0 → v1.1) if
   anything material changed.
3. You confirm in writing (email is fine) that the final text is fit
   for the express-consent purpose.
4. We flip `PURCHASE_CONSENT_ENFORCED=true` in production. From that
   moment, no purchase can complete without a fresh consent record.

## Contact

Steve Lawson — [contact details here]

Thank you for reviewing.
