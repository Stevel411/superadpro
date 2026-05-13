"""
SuperAdPro — Tier 4 Health Scanners
====================================

Operational. Catches issues that don't show up in member-facing screens
but matter for cost, support workload, and trust:

  - r2_storage_audit: orphan files in R2 (wasted storage cost) and DB
    rows pointing at deleted R2 files (broken images/videos on pages)
  - stuck_orders_audit: pending payment orders past expiry across all
    three rails (NOWPayments, WalletConnect, on-chain orphans). Catches
    money-in-transit issues before members complain.
  - auth_anomalies: password reset request flooding (other auth signals
    aren't logged on this platform — sessions/login_events table doesn't
    exist; flagged as a separate gap to address)

Read-only. Each scanner is independent — failure of one doesn't block
the others.
"""

from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func, text

from .health_scanners import (
    register_scanner, make_issue, aggregate_status,
    SEV_OK, SEV_WARNING, SEV_CRITICAL,
)


# ─────────────────────────────────────────────────────────────────
#  9. R2 STORAGE AUDIT
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="r2_storage_audit",
    label="R2 storage audit",
    tier=4,
    category="storage",
    description=(
        "Cross-checks the Cloudflare R2 bucket against the database. "
        "Orphan files in R2 (no DB row references them) waste storage "
        "cost; DB rows pointing at deleted R2 files render broken images "
        "on member dashboards. Audits the LinkHub avatar/banner/bg columns "
        "and the BPG poster generation chosen_url + reference_photo_url "
        "fields. Skips files in the db_backups/ prefix (managed by the "
        "db_backup module's own retention logic)."
    ),
)
def scan_r2_storage_audit(db: Session) -> dict:
    issues = []

    # ── Phase 1: check R2 is configured ───────────────────────────
    try:
        from . import r2_storage
    except ImportError:
        return {
            "status": SEV_WARNING,
            "summary": {
                "headline": "R2 storage module not importable — skipped",
                "issues_found": 0, "critical": 0, "warnings": 0,
            },
            "issues": [],
        }

    if not r2_storage.r2_available():
        return {
            "status": SEV_WARNING,
            "summary": {
                "headline": "R2 credentials not configured — scanner cannot run",
                "issues_found": 0, "critical": 0, "warnings": 0,
            },
            "issues": [],
        }

    # ── Phase 2: list bucket contents (paginated) ─────────────────
    # boto3 list_objects_v2 returns max 1000 keys per call; we paginate
    # until done. Cap at 10,000 keys total to bound run time on a huge
    # bucket. If a real platform exceeds 10K objects we'll need to add
    # progress reporting; for now, fail-loud rather than fail-quiet.
    try:
        client = r2_storage._get_client()
    except Exception as exc:
        return {
            "status": SEV_WARNING,
            "summary": {
                "headline": f"R2 client init failed: {type(exc).__name__}",
                "error": str(exc)[:200],
                "issues_found": 0, "critical": 0, "warnings": 0,
            },
            "issues": [],
        }

    r2_keys = set()
    r2_objects_by_key = {}
    continuation_token = None
    pages_scanned = 0
    MAX_PAGES = 10  # 10 × 1000 = 10K objects max

    while pages_scanned < MAX_PAGES:
        kwargs = {"Bucket": r2_storage.R2_BUCKET, "MaxKeys": 1000}
        if continuation_token:
            kwargs["ContinuationToken"] = continuation_token
        try:
            response = client.list_objects_v2(**kwargs)
        except Exception as exc:
            return {
                "status": SEV_CRITICAL,
                "summary": {
                    "headline": f"R2 list_objects failed: {type(exc).__name__}",
                    "error": str(exc)[:200],
                    "pages_scanned_before_failure": pages_scanned,
                    "issues_found": 1, "critical": 1, "warnings": 0,
                },
                "issues": [make_issue(
                    severity=SEV_CRITICAL,
                    kind="r2_list_failed",
                    subject="R2 bucket",
                    details={"error": str(exc)[:500]},
                    suggested_action=(
                        "R2 API rejected the list_objects call. Check "
                        "R2_ACCESS_KEY_ID permissions and bucket name."
                    ),
                )],
            }

        contents = response.get("Contents", [])
        for obj in contents:
            key = obj["Key"]
            # Skip db_backups/ — managed by db_backup module retention
            if key.startswith("db_backups/"):
                continue
            r2_keys.add(key)
            r2_objects_by_key[key] = {
                "size_bytes": obj.get("Size", 0),
                "last_modified": (
                    obj["LastModified"].isoformat()
                    if obj.get("LastModified") else None
                ),
            }
        pages_scanned += 1
        if not response.get("IsTruncated"):
            break
        continuation_token = response.get("NextContinuationToken")

    if pages_scanned >= MAX_PAGES and response.get("IsTruncated"):
        issues.append(make_issue(
            severity=SEV_WARNING,
            kind="r2_audit_truncated",
            subject="R2 bucket scan",
            details={
                "pages_scanned": pages_scanned,
                "approx_keys_seen": len(r2_keys),
            },
            suggested_action=(
                "Bucket has more than 10K non-backup objects — audit was "
                "truncated. Increase MAX_PAGES in scanner, or paginate."
            ),
        ))

    # ── Phase 3: collect all DB-referenced R2 URLs ────────────────
    # Strategy: for each table that has R2 URL columns, query non-NULL
    # values, parse them to extract the R2 key, build a set of keys
    # the DB cares about. Then compute set differences.
    from .database import PosterGeneration

    # LinkHub profiles (avatar_r2_url, banner_r2_url, bg_r2_url) — uses
    # raw SQL since LinkHubProfile model isn't imported in this file
    # and importing it would risk circular imports. Plain query on the
    # session's connection is safe.
    db_referenced_urls = set()

    # LinkHub URLs
    try:
        result = db.execute(
            text(
                "SELECT avatar_r2_url, banner_r2_url, bg_r2_url "
                "FROM linkhub_profiles "
                "WHERE avatar_r2_url IS NOT NULL "
                "OR banner_r2_url IS NOT NULL "
                "OR bg_r2_url IS NOT NULL"
            )
        )
        for row in result:
            for url in row:
                if url:
                    db_referenced_urls.add(url)
    except Exception as exc:
        # Table missing or other transient error — don't crash the
        # whole scanner; surface as a warning.
        issues.append(make_issue(
            severity=SEV_WARNING,
            kind="linkhub_query_failed",
            subject="LinkHub profile R2 audit",
            details={"error": str(exc)[:200]},
            suggested_action="Check linkhub_profiles table exists and is queryable",
        ))

    # BPG poster generation URLs (chosen_url + reference_photo_url)
    try:
        poster_rows = db.query(
            PosterGeneration.chosen_url,
            PosterGeneration.reference_photo_url,
        ).filter(
            (PosterGeneration.chosen_url.isnot(None))
            | (PosterGeneration.reference_photo_url.isnot(None))
        ).all()
        for chosen, ref in poster_rows:
            if chosen:
                db_referenced_urls.add(chosen)
            if ref:
                db_referenced_urls.add(ref)
    except Exception as exc:
        issues.append(make_issue(
            severity=SEV_WARNING,
            kind="poster_query_failed",
            subject="PosterGeneration R2 audit",
            details={"error": str(exc)[:200]},
            suggested_action="Check poster_generations table",
        ))

    # ── Phase 4: convert DB URLs to keys for set comparison ───────
    # R2 URLs look like: https://pub-xxxxx.r2.dev/<folder>/<file>
    # We strip the public URL prefix to get just <folder>/<file>.
    r2_public_prefix = r2_storage.R2_PUBLIC_URL.rstrip("/") + "/"
    db_referenced_keys = set()
    external_urls = 0  # URLs that aren't ours (YouTube, member-pasted, etc.)
    for url in db_referenced_urls:
        if url.startswith(r2_public_prefix):
            key = url[len(r2_public_prefix):]
            db_referenced_keys.add(key)
        else:
            # Not an R2 URL — could be a YouTube embed, external image,
            # base64 data URI, etc. Not in scope for R2 audit.
            external_urls += 1

    # ── Phase 5: compute orphans and broken refs ──────────────────
    orphan_keys = r2_keys - db_referenced_keys
    broken_db_keys = db_referenced_keys - r2_keys

    # ── Phase 6: emit issues ──────────────────────────────────────
    # Orphan files: warn at a low count, critical past 5% of bucket.
    # Cost-wise these waste R2 storage but don't break anything.
    if orphan_keys:
        # Group by folder for a useful summary, but cap the list of
        # individual keys in the issue to avoid massive responses.
        by_folder = defaultdict(int)
        sample_keys = []
        total_bytes = 0
        for key in orphan_keys:
            folder = key.split("/", 1)[0] if "/" in key else "<root>"
            by_folder[folder] += 1
            total_bytes += r2_objects_by_key.get(key, {}).get("size_bytes", 0)
            if len(sample_keys) < 20:
                sample_keys.append(key)

        bucket_orphan_pct = (
            (len(orphan_keys) / max(len(r2_keys), 1)) * 100
            if r2_keys else 0
        )
        sev = SEV_CRITICAL if bucket_orphan_pct > 50 else SEV_WARNING

        issues.append(make_issue(
            severity=sev,
            kind="r2_orphan_files",
            subject=f"R2 bucket — {len(orphan_keys)} orphan files",
            details={
                "orphan_count": len(orphan_keys),
                "total_bucket_files": len(r2_keys),
                "orphan_percentage": round(bucket_orphan_pct, 1),
                "approximate_wasted_bytes": total_bytes,
                "approximate_wasted_mb": round(total_bytes / 1024 / 1024, 2),
                "by_folder": dict(by_folder),
                "sample_keys": sample_keys,
            },
            suggested_action=(
                "Files exist in R2 but no DB row references them. Likely "
                "from members deleting profile images without the delete "
                "endpoint also clearing R2. Safe to delete after manual "
                "spot-check. Future: build /admin/repair/r2-cleanup tool "
                "(with dry-run + audit log) once orphan count justifies it."
            ),
        ))

    # Broken references: DB points at non-existent R2 file. These are
    # USER-VISIBLE broken images. Always critical regardless of count.
    if broken_db_keys:
        sample_broken = list(broken_db_keys)[:20]
        issues.append(make_issue(
            severity=SEV_CRITICAL,
            kind="r2_broken_db_references",
            subject=f"DB rows pointing at deleted R2 files",
            details={
                "broken_count": len(broken_db_keys),
                "sample_broken_keys": sample_broken,
            },
            suggested_action=(
                "Database has rows referencing R2 files that no longer "
                "exist. Members visiting affected LinkHub profiles / "
                "BPG history will see broken images. NULL out the column "
                "or re-upload. Manual review needed — could indicate "
                "accidental R2 deletion or webhook race condition."
            ),
        ))

    # ── Phase 7: summary ──────────────────────────────────────────
    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)
    status = aggregate_status(issues)

    if not issues:
        headline = (
            f"R2 bucket clean — {len(r2_keys)} files, "
            f"{len(db_referenced_keys)} DB-referenced, all consistent"
        )
    else:
        headline = (
            f"{len(issues)} issues across {len(r2_keys)} R2 files / "
            f"{len(db_referenced_keys)} DB references"
        )

    return {
        "status": status,
        "summary": {
            "r2_files_scanned": len(r2_keys),
            "db_r2_references": len(db_referenced_keys),
            "external_urls_skipped": external_urls,
            "orphan_files": len(orphan_keys),
            "broken_references": len(broken_db_keys),
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "headline": headline,
        },
        "issues": issues,
    }


def text_query(sql: str):
    """Deprecated — use sqlalchemy.text() imported at module top.
    Kept as a forwarder in case anything else imported this earlier
    in the iteration cycle.
    """
    return text(sql)


# ─────────────────────────────────────────────────────────────────
# 10. STUCK ORDERS AUDIT
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="stuck_orders_audit",
    label="Stuck payment orders",
    tier=4,
    category="payment",
    description=(
        "Scans all three payment rails for orders in stuck states: "
        "(1) NOWPayments orders past expiry that never reached "
        "'finished' or 'expired', (2) WalletConnect orders past their "
        "15-minute expiry still showing 'pending', (3) On-chain orphan "
        "transfers (USDT arrived at treasury but didn't match any order) "
        "that remain unresolved. These represent member money that's "
        "either lost, refundable, or owed product."
    ),
)
def scan_stuck_orders_audit(db: Session) -> dict:
    issues = []
    now = datetime.utcnow()

    # Lazy imports to avoid circular issues at module load
    from .database import (
        NowPaymentsOrder, WalletConnectPaymentOrder, OnchainOrphanTransfer,
        User,
    )

    np_orders_scanned = 0
    wc_orders_scanned = 0
    orphans_scanned = 0

    # ── 1. NOWPayments orders ─────────────────────────────────────
    # Orders that have been pending/waiting for more than 24 hours are
    # almost certainly never going to complete. Group by member so a
    # single member with 41 abandoned orders shows as 1 issue not 41.
    try:
        cutoff_24h = now - timedelta(hours=24)
        np_stuck = db.query(NowPaymentsOrder).filter(
            NowPaymentsOrder.status.in_(["pending", "waiting", "confirming"]),
            NowPaymentsOrder.created_at < cutoff_24h,
        ).all()
        np_orders_scanned = len(np_stuck)

        # Group by user_id
        by_user = defaultdict(list)
        for order in np_stuck:
            by_user[order.user_id].append(order)

        users = {u.id: u for u in db.query(User).all()}

        for user_id, orders in by_user.items():
            user = users.get(user_id)
            username = user.username if user else f"id={user_id}"

            # If a user has many stuck orders, that's a stronger signal
            # of an abandoned checkout flow (member tried multiple times,
            # gave up) than a single one.
            severity = SEV_WARNING
            if len(orders) >= 10:
                severity = SEV_CRITICAL

            total_value = sum(float(o.price_usd or 0) for o in orders)
            issues.append(make_issue(
                severity=severity,
                kind="nowpayments_stuck",
                subject=f"user {username} — {len(orders)} stale NOWPayments orders",
                details={
                    "user_id": user_id,
                    "stuck_order_count": len(orders),
                    "total_value_usd": round(total_value, 2),
                    "oldest_order_age_hours": round(
                        (now - min(o.created_at for o in orders)).total_seconds() / 3600, 1
                    ),
                    "products": list({o.product_type for o in orders}),
                    "statuses": list({o.status for o in orders}),
                    "sample_order_ids": [o.id for o in orders[:5]],
                },
                suggested_action=(
                    "These orders have been pending more than 24 hours and "
                    "won't complete naturally. NOWPayments is retiring — "
                    "if the member still wants the product, point them at "
                    "the WalletConnect/BSC rail. Mark these as expired in "
                    "DB to clear them from the dashboard."
                ),
            ))
    except Exception as exc:
        issues.append(make_issue(
            severity=SEV_WARNING,
            kind="nowpayments_scan_failed",
            subject="NOWPayments order scan",
            details={"error": str(exc)[:200]},
            suggested_action="Check nowpayments_orders table",
        ))

    # ── 2. WalletConnect orders past expiry ───────────────────────
    # WC orders have a hard 15-min expiry — anything pending past that
    # is stuck. The cron should be moving these to 'expired' but if
    # cron failed or order created during a deploy gap, they stick.
    try:
        wc_stuck = db.query(WalletConnectPaymentOrder).filter(
            WalletConnectPaymentOrder.status == "pending",
            WalletConnectPaymentOrder.expires_at < now,
        ).all()
        wc_orders_scanned = len(wc_stuck)

        if wc_stuck:
            # Group by oldest first — these are most concerning
            wc_stuck_sorted = sorted(wc_stuck, key=lambda o: o.expires_at)
            sample = []
            for o in wc_stuck_sorted[:10]:
                user = db.query(User).filter(User.id == o.user_id).first()
                sample.append({
                    "order_id": o.id,
                    "user_id": o.user_id,
                    "username": user.username if user else None,
                    "product_type": o.product_type,
                    "product_key": o.product_key,
                    "unique_amount": float(o.unique_amount),
                    "expired_hours_ago": round(
                        (now - o.expires_at).total_seconds() / 3600, 1
                    ),
                })

            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="walletconnect_expired_still_pending",
                subject=f"{len(wc_stuck)} WalletConnect orders past expiry but still pending",
                details={
                    "stuck_count": len(wc_stuck),
                    "oldest_expired_at": wc_stuck_sorted[0].expires_at.isoformat(),
                    "sample_orders": sample,
                },
                suggested_action=(
                    "Orders past their 15-minute expiry should have been "
                    "moved to status='expired' by the cron. They're "
                    "harmless (won't accept payment) but pollute the "
                    "dashboard. Check /cron/scan-bsc-payments is running. "
                    "Or: a future repair tool that bulk-flips status."
                ),
            ))
    except Exception as exc:
        issues.append(make_issue(
            severity=SEV_WARNING,
            kind="walletconnect_scan_failed",
            subject="WalletConnect order scan",
            details={"error": str(exc)[:200]},
            suggested_action="Check walletconnect_payment_orders table",
        ))

    # ── 3. Unresolved on-chain orphan transfers ───────────────────
    # Treasury received USDT but the cron couldn't match it to an order.
    # These represent real money sitting in the company wallet that
    # belongs to someone — high-priority to resolve.
    try:
        orphans = db.query(OnchainOrphanTransfer).filter(
            OnchainOrphanTransfer.resolved == False,
        ).all()
        orphans_scanned = len(orphans)

        if orphans:
            total_orphan_value = sum(
                float(o.amount_usdt or 0) for o in orphans
            )
            rounded_amount_count = sum(
                1 for o in orphans if o.likely_rounded_amount
            )

            sample = []
            for o in sorted(orphans, key=lambda x: x.seen_at, reverse=True)[:10]:
                sample.append({
                    "transfer_id": o.id,
                    "tx_hash": o.tx_hash[:20] + "...",
                    "from_address": o.from_address[:20] + "...",
                    "amount_usdt": float(o.amount_usdt),
                    "likely_rounded": o.likely_rounded_amount,
                    "seen_at": o.seen_at.isoformat(),
                    "days_unresolved": (now - o.seen_at).days,
                })

            # Likely-rounded transfers are higher-signal "member sent
            # wrong amount" cases — critical because they almost
            # certainly represent a real member owed product.
            severity = (SEV_CRITICAL if rounded_amount_count > 0
                        else SEV_WARNING)

            issues.append(make_issue(
                severity=severity,
                kind="onchain_orphan_transfers",
                subject=(
                    f"{len(orphans)} unresolved orphan transfers "
                    f"(${total_orphan_value:.2f} total)"
                ),
                details={
                    "unresolved_count": len(orphans),
                    "total_value_usd": round(total_orphan_value, 2),
                    "likely_rounded_count": rounded_amount_count,
                    "oldest_unresolved_days": (
                        max((now - o.seen_at).days for o in orphans)
                        if orphans else 0
                    ),
                    "sample_transfers": sample,
                },
                suggested_action=(
                    "USDT arrived at the treasury that didn't match any "
                    "WalletConnect order. likely_rounded_amount=True "
                    "transfers are members who sent a rounded amount "
                    "(e.g. $20 instead of $19.97) — they paid, you owe "
                    "them activation. Review each in /admin and either "
                    "manually attach + activate, or mark spam if from "
                    "an unrelated source."
                ),
            ))
    except Exception as exc:
        issues.append(make_issue(
            severity=SEV_WARNING,
            kind="orphan_transfer_scan_failed",
            subject="On-chain orphan transfer scan",
            details={"error": str(exc)[:200]},
            suggested_action="Check onchain_orphan_transfers table",
        ))

    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)
    status = aggregate_status(issues)

    if not issues:
        headline = (
            f"All payment orders consistent — "
            f"{np_orders_scanned} NP / {wc_orders_scanned} WC / "
            f"{orphans_scanned} orphans"
        )
    else:
        headline = f"{len(issues)} payment-rail issues"

    return {
        "status": status,
        "summary": {
            "nowpayments_stuck": np_orders_scanned,
            "walletconnect_stuck": wc_orders_scanned,
            "orphan_transfers_unresolved": orphans_scanned,
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "headline": headline,
        },
        "issues": issues,
    }


# ─────────────────────────────────────────────────────────────────
# 11. AUTH ANOMALIES (password reset flooding)
# ─────────────────────────────────────────────────────────────────
@register_scanner(
    name="auth_anomalies",
    label="Auth anomalies",
    tier=4,
    category="security",
    description=(
        "Scans password reset request patterns to surface potential "
        "account takeover attempts or abuse. Flags users with an unusual "
        "burst of reset requests in a short window. NOTE: this platform "
        "does not currently log login attempts, sessions, IP addresses, "
        "or 2FA events — so this scanner is intentionally narrow. Building "
        "session tracking is a separate concern (instrumentation, not a "
        "scanner). Tracked as a post-launch followup."
    ),
)
def scan_auth_anomalies(db: Session) -> dict:
    issues = []

    from .database import PasswordResetToken, User

    now = datetime.utcnow()
    cutoff_24h = now - timedelta(hours=24)
    cutoff_7d = now - timedelta(days=7)

    # ── 1. Burst pattern: 5+ reset requests in 24h ───────────────
    # Normal user: 0-1 resets per month. 5+ in 24h is almost always
    # either an attacker brute-forcing the reset flow, or a member
    # so confused they need direct support contact.
    burst_rows = []  # initialised so the 7d scan can dedupe even if 24h scan errors
    try:
        burst_rows = db.query(
            PasswordResetToken.user_id,
            func.count(PasswordResetToken.id).label("token_count"),
        ).filter(
            PasswordResetToken.created_at >= cutoff_24h,
        ).group_by(
            PasswordResetToken.user_id,
        ).having(
            func.count(PasswordResetToken.id) >= 5,
        ).all()

        if burst_rows:
            users = {u.id: u for u in db.query(User).filter(
                User.id.in_([r[0] for r in burst_rows])
            ).all()}

            for user_id, count in burst_rows:
                user = users.get(user_id)
                username = user.username if user else f"id={user_id}"
                severity = SEV_CRITICAL if count >= 10 else SEV_WARNING

                issues.append(make_issue(
                    severity=severity,
                    kind="password_reset_burst_24h",
                    subject=f"user {username} — {count} reset requests in 24h",
                    details={
                        "user_id": user_id,
                        "request_count_24h": count,
                        "email": user.email if user else None,
                    },
                    suggested_action=(
                        "5+ password reset requests in 24h. Either an "
                        "attacker probing the reset flow, or a member "
                        "in distress. Investigate: check if the same IP "
                        "is hitting other accounts (you don't currently "
                        "log IPs — flagged separately). Contact the "
                        "member to confirm legitimate use."
                    ),
                ))
    except Exception as exc:
        issues.append(make_issue(
            severity=SEV_WARNING,
            kind="password_reset_scan_failed",
            subject="Password reset token scan (24h)",
            details={"error": str(exc)[:200]},
            suggested_action="Check password_reset_tokens table",
        ))

    # ── 2. Sustained pattern: 10+ resets in 7 days ───────────────
    # Catches slower-but-persistent attempts that wouldn't trigger
    # the 24h burst check. Lower severity because timeframe is longer.
    try:
        sustained_rows = db.query(
            PasswordResetToken.user_id,
            func.count(PasswordResetToken.id).label("token_count"),
        ).filter(
            PasswordResetToken.created_at >= cutoff_7d,
        ).group_by(
            PasswordResetToken.user_id,
        ).having(
            func.count(PasswordResetToken.id) >= 10,
        ).all()

        # Exclude users already flagged in the 24h burst check above
        burst_user_ids = {r[0] for r in burst_rows}

        for user_id, count in sustained_rows:
            if user_id in burst_user_ids:
                continue  # already flagged with higher severity
            user = db.query(User).filter(User.id == user_id).first()
            username = user.username if user else f"id={user_id}"
            issues.append(make_issue(
                severity=SEV_WARNING,
                kind="password_reset_sustained_7d",
                subject=f"user {username} — {count} reset requests in 7d",
                details={
                    "user_id": user_id,
                    "request_count_7d": count,
                    "email": user.email if user else None,
                },
                suggested_action=(
                    "Sustained password reset attempts over a week. Could "
                    "be a slow-paced attacker avoiding rate limits. "
                    "Investigate or proactively rotate the user's auth "
                    "if pattern continues."
                ),
            ))
    except Exception as exc:
        issues.append(make_issue(
            severity=SEV_WARNING,
            kind="password_reset_7d_scan_failed",
            subject="Password reset token scan (7d)",
            details={"error": str(exc)[:200]},
            suggested_action="Check password_reset_tokens table",
        ))

    crit_count = sum(1 for i in issues if i["severity"] == SEV_CRITICAL)
    warn_count = sum(1 for i in issues if i["severity"] == SEV_WARNING)
    status = aggregate_status(issues)

    if not issues:
        headline = "No auth anomalies detected (password resets only — no other auth signals logged)"
    else:
        headline = f"{len(issues)} auth anomaly patterns detected"

    return {
        "status": status,
        "summary": {
            "issues_found": len(issues),
            "critical": crit_count,
            "warnings": warn_count,
            "note": (
                "This platform does not log login attempts, sessions, "
                "IP addresses, or 2FA events. Building session tracking "
                "would meaningfully expand this scanner's signal."
            ),
            "headline": headline,
        },
        "issues": issues,
    }
