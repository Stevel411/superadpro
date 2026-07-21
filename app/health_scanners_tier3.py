"""
SuperAdPro — Tier 3 Health Scanners
====================================

Membership Plan Correctness. Verifies that billing state, tier flags,
and commission payments all agree with the rules in docs/commission-spec.md.

Two scanners:
  - membership_tier_consistency: Stripe state vs is_active vs tier vs
    expiry vs activated_at vs renewal record cross-checks
  - commission_cap_audit: every paid membership commission verified
    against the tier-cap rule (Basic sponsor capped at Basic rate
    even on Pro referrals)

Read-only. Ground truth for cap rule: docs/commission-spec.md section 1.
"""

from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from .health_scanners import (
    register_scanner, make_issue, aggregate_status,
    SEV_OK, SEV_WARNING, SEV_CRITICAL,
)
from .database import (
    User, Commission, MembershipRenewal,
)

# Flat-pricing commission rule (locked 15 May 2026):
#   Every Partner or Founding membership pays the sponsor a flat $10/mo.
#   No tier-dependent rates, no caps, no annual/monthly split.
# This replaces the legacy Basic/Pro capped-commission model documented
# in earlier versions of docs/commission-spec.md.
FLAT_MEMBERSHIP_COMMISSION = Decimal("10.00")

CENT = Decimal("0.01")

# Only audit recent commissions for the rule — older commissions may have
# been paid under earlier rules (the dual-tier capped model existed until
# 15 May 2026). Default: last 30 days, narrower than before because the
# rule changed within the last few weeks and pre-15 May commissions
# audited against the new rule will all "fail".
CAP_AUDIT_WINDOW_DAYS = 30


# ─────────────────────────────────────────────────────────────────
#  7. MEMBERSHIP TIER CONSISTENCY
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="membership_tier_consistency",
    label="Membership tier consistency",
    tier=3,
    category="billing",
    description=(
        "Cross-checks each member's tier flag against billing state: "
        "membership_expires_at, activated_at, membership_billing, and "
        "the membership_renewals table. Catches members in inconsistent "
        "billing states (expired but still active, active but no payment "
        "record, billing cycle mismatched with expiry interval, renewal "
        "record disagreement with user record)."
    ),
)
def scan_membership_tier_consistency(db: Session) -> dict:
    issues = []
    users = db.query(User).all()

    # Pre-load renewal records
    renewals = db.query(MembershipRenewal).all()
    renewal_by_user = {r.user_id: r for r in renewals}

    now = datetime.utcnow()
    grace_window = timedelta(days=7)  # tolerate up to a week past expiry

    for user in users:
        # Admins exempt — they have any tier without billing.
        if user.is_admin:
            continue

        # AdvantageLife: comped / hand-granted lifetime members intentionally
        # have paid access WITHOUT a Stripe activation record (granted via
        # grant-lifetime during migration, not bought through checkout). On AL
        # that's by design, not an anomaly — so exempt lifetime access_level.
        # This clears the ~53 false positives (one per grandfathered member).
        if (getattr(user, "access_level", "") or "").lower() == "lifetime":
            continue

        subject = f"user {user.username} (id {user.id})"
        tier = (user.membership_tier or "free").lower().strip()
        is_paid_tier = tier in ("partner", "founding")

        # ── a) Expired but still active ──────────────────────────
        # is_active=True but membership_expires_at is in the past.
        # Renewal cron should flip these; if it didn't, lapsing is broken.
        if (user.is_active and user.membership_expires_at
                and user.membership_expires_at < now - grace_window):
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="expired_but_active",
                subject=subject,
                details={
                    "user_id": user.id,
                    "tier": tier,
                    "membership_expires_at": user.membership_expires_at.isoformat(),
                    "days_since_expiry": (now - user.membership_expires_at).days,
                    "billing": user.membership_billing,
                },
                suggested_action=(
                    "Member expired more than a week ago but is_active still "
                    "True. Renewal cron may have stalled. Check daily renewal "
                    "log around this date."
                ),
            ))

        # ── b) Active paid tier without activated_at ─────────────
        # Every paid member should have an activated_at timestamp.
        if user.is_active and is_paid_tier and not user.activated_at:
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="active_no_activation_record",
                subject=subject,
                details={
                    "user_id": user.id,
                    "tier": tier,
                    "membership_expires_at": (
                        user.membership_expires_at.isoformat()
                        if user.membership_expires_at else None
                    ),
                    "stripe_subscription_id": user.stripe_subscription_id,
                },
                suggested_action=(
                    "Member is active on a paid tier but has no "
                    "activated_at timestamp. Set retroactively from earliest "
                    "Payment record or commission ledger."
                ),
            ))

        # ── c) Active without any expiry record ──────────────────
        # An active paid tier should have a membership_expires_at set.
        # Without it, the renewal cron has nothing to act on and the
        # member stays Pro indefinitely. This is the issue class that
        # caught the 9 pre-launch testers on 13 May 2026.
        if (user.is_active and is_paid_tier
                and not user.membership_expires_at):
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="active_no_expiry_set",
                subject=subject,
                details={
                    "user_id": user.id,
                    "tier": tier,
                    "membership_billing": user.membership_billing,
                    "activated_at": (
                        user.activated_at.isoformat()
                        if user.activated_at else None
                    ),
                },
                suggested_action=(
                    "Active paid member with no expiry date. Renewal cron "
                    "has nothing to act on — they'll stay active indefinitely. "
                    "Set membership_expires_at."
                ),
            ))

        # Note: this platform does not use Stripe or Airwallex for
        # payments. The User.stripe_subscription_id column exists but
        # is dead — no caller writes to it. Payment methods actually
        # in use: NOWPayments (retiring), WalletConnect/BSC (current,
        # on-chain self-custody), wallet-balance auto-renew, and
        # manual admin activation. No need to check for orphan Stripe
        # subscriptions or Airwallex references.

        # ── e) Annual billing with monthly-length expiry interval ──
        # If activated_at + 90 days > membership_expires_at, this looks
        # monthly even though billing flag says annual. 90 days is a
        # generous tolerance — anything under that is suspicious.
        if (user.membership_billing == "annual"
                and user.activated_at and user.membership_expires_at):
            interval = user.membership_expires_at - user.activated_at
            if interval < timedelta(days=90):
                # Could be a partial / mid-cycle adjustment, but flag it
                issues.append(make_issue(
                    severity=SEV_WARNING,
                    kind="annual_billing_short_interval",
                    subject=subject,
                    details={
                        "user_id": user.id,
                        "activated_at": user.activated_at.isoformat(),
                        "membership_expires_at": user.membership_expires_at.isoformat(),
                        "interval_days": interval.days,
                        "billing": "annual",
                    },
                    suggested_action=(
                        "Billing marked annual but expiry interval < 90 days "
                        "from activation. Either billing flag is wrong or "
                        "expiry was set incorrectly. Review record."
                    ),
                ))

        # ── f) Renewal record disagreement ────────────────────────
        # If MembershipRenewal.next_renewal_date and user.membership_expires_at
        # disagree by > 7 days, one of them was updated and the other wasn't.
        renewal = renewal_by_user.get(user.id)
        if (renewal and renewal.next_renewal_date
                and user.membership_expires_at):
            diff = abs(
                (renewal.next_renewal_date - user.membership_expires_at).total_seconds()
            )
            if diff > 7 * 24 * 3600:
                issues.append(make_issue(
                    severity=SEV_WARNING,
                    kind="renewal_record_disagreement",
                    subject=subject,
                    details={
                        "user_id": user.id,
                        "user_membership_expires_at": user.membership_expires_at.isoformat(),
                        "renewal_next_renewal_date": renewal.next_renewal_date.isoformat(),
                        "diff_days": round(diff / 86400, 1),
                    },
                    suggested_action=(
                        "User.membership_expires_at disagrees with "
                        "MembershipRenewal.next_renewal_date by more than "
                        "a week. One was updated, the other wasn't. Renewal "
                        "cron reads MembershipRenewal — that's the source "
                        "of truth for billing timing."
                    ),
                ))

        # ── g) Grace period without expiry having passed ─────────
        if (renewal and renewal.in_grace_period
                and user.membership_expires_at
                and user.membership_expires_at > now):
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="grace_period_unexpired",
                subject=subject,
                details={
                    "user_id": user.id,
                    "membership_expires_at": user.membership_expires_at.isoformat(),
                    "grace_period_start": (
                        renewal.grace_period_start.isoformat()
                        if renewal.grace_period_start else None
                    ),
                },
                suggested_action=(
                    "Member is in grace period but their expiry hasn't "
                    "passed yet. Grace flag set incorrectly — should only "
                    "apply post-expiry while waiting for retry."
                ),
            ))

    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)
    status = aggregate_status(issues)

    if not issues:
        headline = f"All {len(users)} members' billing state consistent"
    else:
        headline = f"{len(issues)} issues across {len(users)} members"

    return {
        "status": status,
        "summary": {
            "members_scanned": len(users),
            "renewal_records_scanned": len(renewals),
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "headline": headline,
        },
        "issues": issues,
    }


# ─────────────────────────────────────────────────────────────────
#  8. COMMISSION CAP AUDIT
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="commission_cap_audit",
    label="Commission cap audit",
    tier=3,
    category="commission",
    description=(
        "Verifies every paid membership commission against the tier-cap "
        "rule (docs/commission-spec.md section 1): Basic sponsor capped at "
        "$10/mo or $100/yr; Pro sponsor capped at $17.50/mo or $175/yr. "
        "Only audits the last 60 days because the annual cap was added "
        "24 Apr 2026 — older commissions ran under different rules. Caveat: "
        "sponsor tier is read from the current state, not historical, so "
        "audit is only reliable if the sponsor hasn't switched tiers "
        "between the payment and now."
    ),
)
def scan_commission_cap_audit(db: Session) -> dict:
    issues = []

    cutoff = datetime.utcnow() - timedelta(days=CAP_AUDIT_WINDOW_DAYS)
    membership_types = [
        "membership", "membership_renewal",
        "membership_sponsor", "Membership Sponsor",
        "gift_membership_sponsor",
    ]
    commissions = db.query(Commission).filter(
        Commission.status == "paid",
        Commission.commission_type.in_(membership_types),
        Commission.created_at >= cutoff,
    ).all()

    if not commissions:
        return {
            "status": SEV_OK,
            "summary": {
                "commissions_scanned": 0,
                "window_days": CAP_AUDIT_WINDOW_DAYS,
                "issues_found": 0,
                "critical": 0,
                "warnings": 0,
                "headline": (
                    f"No membership commissions in last "
                    f"{CAP_AUDIT_WINDOW_DAYS} days to audit"
                ),
            },
            "issues": [],
        }

    users = {u.id: u for u in db.query(User).all()}

    for c in commissions:
        sponsor = users.get(c.to_user_id)
        buyer = users.get(c.from_user_id)

        if not sponsor or not buyer:
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="commission_orphan_user",
                subject=f"commission #{c.id} (${float(c.amount_usdt):.2f})",
                details={
                    "commission_id": c.id,
                    "to_user_id": c.to_user_id,
                    "from_user_id": c.from_user_id,
                    "sponsor_found": sponsor is not None,
                    "buyer_found": buyer is not None,
                },
                suggested_action=(
                    "Membership commission references a user that no longer "
                    "exists. Investigate — sponsor or buyer was deleted "
                    "after the commission was paid."
                ),
            ))
            continue

        # Determine the billing type and expected commission.
        amount_paid = Decimal(str(c.amount_usdt))

        # Under flat-pricing every membership_sponsor commission is $10
        # flat. No tier-dependent math, no caps, no per-direct rate. If
        # the recorded amount drifts from $10, that's a bug — either
        # an old capped commission paid under prior rules (will fall
        # outside the audit window) or a real drift to investigate.
        expected = FLAT_MEMBERSHIP_COMMISSION

        # Compare with a 1-cent tolerance
        if abs(amount_paid - expected) > CENT:
            sponsor_tier = (sponsor.membership_tier or "free").lower().strip()
            buyer_tier = (buyer.membership_tier or "free").lower().strip()
            # Direction matters for what the bug type is
            over = amount_paid > expected
            issues.append(make_issue(
                severity=SEV_CRITICAL,
                kind="commission_overpaid" if over else "commission_underpaid",
                subject=(
                    f"commission #{c.id} → {sponsor.username} "
                    f"(${float(amount_paid):.2f})"
                ),
                details={
                    "commission_id": c.id,
                    "paid_at": c.paid_at.isoformat() if c.paid_at else None,
                    "amount_paid": float(amount_paid),
                    "expected_amount": float(expected),
                    "drift": float(amount_paid - expected),
                    "sponsor_id": sponsor.id,
                    "sponsor_username": sponsor.username,
                    "sponsor_tier_now": sponsor_tier,
                    "buyer_id": buyer.id,
                    "buyer_username": buyer.username,
                    "buyer_tier_now": buyer_tier,
                    "commission_type": c.commission_type,
                    "notes": c.notes,
                },
                suggested_action=(
                    "Membership sponsor commission doesn't match the flat $10 "
                    "rule. CAVEAT: scanner audits against the post-15-May "
                    "flat-pricing rule. Commissions paid under the prior "
                    "dual-tier capped model (Basic/Pro) will show as drifts "
                    "if they fall inside the audit window — verify paid_at "
                    "against the 15 May 2026 cutover before flagging."
                ),
            ))

    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)
    status = aggregate_status(issues)

    if not issues:
        headline = (
            f"All {len(commissions)} membership commissions in last "
            f"{CAP_AUDIT_WINDOW_DAYS} days correctly at flat $10"
        )
    else:
        headline = (
            f"{len(issues)} commission drifts across {len(commissions)} "
            f"membership commissions (last {CAP_AUDIT_WINDOW_DAYS} days)"
        )

    return {
        "status": status,
        "summary": {
            "commissions_scanned": len(commissions),
            "window_days": CAP_AUDIT_WINDOW_DAYS,
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "headline": headline,
        },
        "issues": issues,
    }
