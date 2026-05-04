"""Purchase consent text + version management.

This module is the single source of truth for the disclaimer text
that members must accept before any money-in transaction.

When the solicitor signs off on docs/legal/PURCHASE-CONSENT-V1.md,
copy the final text into PURCHASE_CONSENT_TEXT below verbatim and
keep PURCHASE_CONSENT_VERSION in sync. The SHA-256 hash is computed
on import and stored against every consent record so we can prove
exactly which text version a user accepted, even after the text is
updated.

To bump the version after launch:
  1. Update PURCHASE_CONSENT_TEXT with the new wording.
  2. Update PURCHASE_CONSENT_VERSION to the next label (e.g. v1.0 -> v1.1).
  3. Deploy. Existing consent records keep their old hash so historical
     consents are still verifiable.

The two pieces of language that the solicitor will most scrutinise:

  (a) The express-consent waiver under Consumer Contracts Regulations
      2013 reg. 37 — disapplies the 14-day cooling-off period for
      digital services. The wording must explicitly request immediate
      performance AND acknowledge loss of cancellation right.
  (b) The commission-flow / immediate-irreversibility paragraph —
      the commercial justification for the no-refund policy. Must be
      a fair, unambiguous statement under CRA 2015 s.62.

The text below is a DRAFT pending solicitor review. Do not flip
PURCHASE_CONSENT_ENFORCED to True in Railway until sign-off.
"""

import hashlib
import os

# Version label — bump this whenever PURCHASE_CONSENT_TEXT changes
PURCHASE_CONSENT_VERSION = "v1.0-DRAFT"

# Validity window for a fresh consent — 5 minutes is long enough for
# a normal checkout flow, short enough that pre-consenting hours/days
# in advance can't authorise later purchases.
CONSENT_VALIDITY_SECONDS = 300

# When False, the consent rails are wired but the server doesn't
# actually block purchases. This is the default — we keep it False
# until the solicitor signs off the disclaimer text. When True, every
# money-in endpoint hard-rejects (HTTP 403) any purchase that doesn't
# have a fresh consent record.
def is_consent_enforced() -> bool:
    return os.environ.get("PURCHASE_CONSENT_ENFORCED", "false").lower() in ("1", "true", "yes")


# The text the user actually sees. Plain language for the audience
# (network marketers, not lawyers); the formal CCR 2013 reg. 37
# language is included verbatim in the express-consent paragraph.
#
# Triple-quoted; whitespace is significant for the hash. Don't reflow
# or auto-format this string without bumping the version.
PURCHASE_CONSENT_TEXT = """SuperAdPro — Purchase Terms & Refund Policy
Version v1.0 (DRAFT — pending solicitor review)

Before you complete your purchase, please read this carefully.

1. WHAT YOU ARE BUYING

SuperAdPro provides digital services — AI tools, training content, marketing automation, and (where applicable) entries into the optional Income Grid or Credit Nexus compensation plans. When you click "I Agree & Proceed" and your payment confirms, your purchase activates immediately. For Income Grid, Credit Nexus, and membership purchases that trigger affiliate commissions, the system immediately distributes a portion of your payment to your sponsor and their upline as compensation under the published plan, plus a portion to the SuperAdPro company treasury.

2. EXPRESS CONSENT TO IMMEDIATE ACTIVATION

By ticking the consent box on the purchase screen, I expressly request that SuperAdPro begin providing the digital service / activate my purchase immediately, before the end of any statutory 14-day cancellation period that would otherwise apply under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013.

I acknowledge that, by giving this consent, I will lose my right to cancel and obtain a refund under those Regulations once the service has been fully provided to me, which (because activation is instant) happens at the moment my payment is confirmed.

3. WHY WE CANNOT OFFER REFUNDS ON REQUEST

The moment your payment confirms, a portion goes to your sponsor's wallet as a direct commission, smaller portions go to multiple uplines' wallets through the uni-level structure, contributions feed the completion bonus pool which can pay out to a third party at any moment, and the remainder goes to the company treasury. Once those amounts are in third parties' wallets, we have no mechanism to take them back. The sponsor and uplines did nothing wrong — they earned those commissions under the plan you bought into. Purchases on SuperAdPro are therefore final.

4. WHEN WE WILL REFUND YOU

We will always refund in these situations: (a) platform fault — your payment confirmed but our system failed to activate the product; (b) duplicate purchase — you were charged twice for the same transaction; (c) fraudulent transaction — your account was compromised or your payment method was used without authorisation; (d) where the law requires it — for example, where a buyer is later determined to be a minor or legally incapable of consenting. Email support@superadpro.com with your username and transaction details. We respond within 5 working days.

5. CHARGEBACKS

If you initiate a chargeback through your card issuer, bank, or crypto exchange after consenting to these terms, we will submit our records of your consent and product delivery, cooperate with any investigation, and reserve the right to suspend your account pending the outcome and deduct any clawed-back amounts from any future earnings or balance. Where commissions have already paid out as a result of your purchase, related commissions may be deducted from recipients' accounts.

6. INCOME — NO GUARANTEES

SuperAdPro provides AI tools that members can use to build any business. The compensation plan is optional — members can use the tools without ever participating in it. We do not guarantee any level of income. Earnings depend on effort, sharing, downline size and activity, and factors outside our control. Past testimonials and example figures reflect specific members' results and are not a promise of what you will earn.

7. WHAT YOU ARE AGREEING TO WHEN YOU TICK THE BOX

By ticking the consent box and clicking "I Agree & Proceed": you confirm you have read this; you give express consent to immediate activation per section 2; you acknowledge you lose your right to cancel under CCR 2013; you accept the no-refund-on-request policy with the carve-outs in section 4; you understand commissions and treasury distributions are immediate and irreversible; you confirm you are not relying on any income guarantees.

End of Purchase Terms & Refund Policy v1.0-DRAFT.
"""


def _compute_text_hash(text: str) -> str:
    """SHA-256 of the disclaimer text. Used as evidence that a given
    consent record was recorded against this exact text — even if the
    text is later edited, old consents stay verifiable via their
    stored hash."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


PURCHASE_CONSENT_TEXT_HASH = _compute_text_hash(PURCHASE_CONSENT_TEXT)


def get_consent_payload() -> dict:
    """What the frontend renders. The hash is included so any future
    debugging can confirm the client and server saw the same text."""
    return {
        "version": PURCHASE_CONSENT_VERSION,
        "text_hash": PURCHASE_CONSENT_TEXT_HASH,
        "text": PURCHASE_CONSENT_TEXT,
        "enforced": is_consent_enforced(),
        "validity_seconds": CONSENT_VALIDITY_SECONDS,
    }
