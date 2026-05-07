"""
One-off rollback script for the free-upgrade bug (fixed in f097795b).

Bug: /api/upgrade-to-pro called _activate_membership directly without
charging the $15 fee. Any Basic member who hit the endpoint got Pro
for free. Live for 7 weeks. 13 users total at time of fix.

This script reverses the state changes for ONE specific user account
that Steve confirmed got the free upgrade during 6 May testing.

Run via:
  python scripts/rollback_free_upgrade.py --username TARGET_USERNAME
  python scripts/rollback_free_upgrade.py --username TARGET_USERNAME --dry-run

Dry-run mode is the default. --commit must be passed explicitly to
actually mutate. Always run dry-run first to see what would change.

Idempotent: re-running after success is a no-op (no rows match).
"""
import argparse
import os
import sys
from datetime import datetime
from decimal import Decimal

# Add parent dir so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


def main():
    parser = argparse.ArgumentParser(description="Rollback a free-upgrade Pro account to Basic.")
    parser.add_argument("--username", required=True, help="Username to roll back")
    parser.add_argument("--commit", action="store_true", help="Actually commit changes (default: dry-run)")
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set in environment.", file=sys.stderr)
        sys.exit(1)

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(db_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    db = Session()

    print(f"\n{'='*60}")
    print(f"FREE-UPGRADE ROLLBACK")
    print(f"Target username: {args.username}")
    print(f"Mode: {'COMMIT (will mutate)' if args.commit else 'DRY-RUN (no changes)'}")
    print(f"{'='*60}\n")

    try:
        # ── Step 1: identify user ──────────────────────────────────
        user_row = db.execute(
            text("SELECT id, username, email, membership_tier, is_active, "
                 "       membership_expires_at, balance "
                 "FROM users WHERE username = :u"),
            {"u": args.username}
        ).fetchone()

        if not user_row:
            print(f"[ABORT] User '{args.username}' not found.")
            sys.exit(2)

        user_id = user_row[0]
        current_tier = user_row[3]

        print(f"[FOUND] user_id={user_id}")
        print(f"        username={user_row[1]!r}")
        print(f"        email={user_row[2]!r}")
        print(f"        membership_tier={current_tier!r}")
        print(f"        is_active={user_row[4]}")
        print(f"        membership_expires_at={user_row[5]}")
        print(f"        balance={user_row[6]}")
        print()

        if current_tier != "pro":
            print(f"[SKIP] User is not on Pro (tier={current_tier!r}). Nothing to roll back.")
            db.close()
            sys.exit(0)

        # ── Step 2: identify the bogus payment row ─────────────────
        payment_rows = db.execute(
            text("SELECT id, amount_usdt, tx_hash, status, created_at "
                 "FROM payments "
                 "WHERE from_user_id = :uid "
                 "  AND payment_type = 'membership_upgrade' "
                 "  AND status = 'confirmed' "
                 "  AND tx_hash LIKE 'upgrade_%' "
                 "ORDER BY created_at DESC"),
            {"uid": user_id}
        ).fetchall()

        if not payment_rows:
            print(f"[WARN] User is on Pro but no matching membership_upgrade payment found.")
            print(f"       This might mean the upgrade came from somewhere else (Stripe, NOWPayments).")
            print(f"       Aborting to avoid data loss. Investigate manually before proceeding.")
            db.close()
            sys.exit(3)

        print(f"[FOUND] {len(payment_rows)} bogus 'membership_upgrade' payment row(s):")
        for row in payment_rows:
            print(f"        payment_id={row[0]} amount=${row[1]} tx_hash={row[2]!r} created_at={row[4]}")
        print()

        # ── Step 3: plan the writes ────────────────────────────────
        print("[PLAN] Will execute:")
        print(f"  1. UPDATE users SET membership_tier = 'basic' WHERE id = {user_id}")
        print(f"  2. DELETE FROM payments WHERE id IN ({', '.join(str(r[0]) for r in payment_rows)})")
        print(f"  (membership_expires_at left untouched — see script docstring for rationale)")
        print()

        if not args.commit:
            print("[DRY-RUN] No changes made. Re-run with --commit to apply.")
            db.close()
            sys.exit(0)

        # ── Step 4: execute ────────────────────────────────────────
        print("[EXEC] Applying changes...")

        result1 = db.execute(
            text("UPDATE users SET membership_tier = 'basic' "
                 "WHERE id = :uid AND membership_tier = 'pro'"),
            {"uid": user_id}
        )
        print(f"        users updated: {result1.rowcount}")

        result2 = db.execute(
            text("DELETE FROM payments WHERE id = ANY(:ids)"),
            {"ids": [r[0] for r in payment_rows]}
        )
        print(f"        payments deleted: {result2.rowcount}")

        db.commit()
        print("[DONE] Committed.")

        # ── Step 5: verify ─────────────────────────────────────────
        verify = db.execute(
            text("SELECT membership_tier FROM users WHERE id = :uid"),
            {"uid": user_id}
        ).fetchone()
        verify_payments = db.execute(
            text("SELECT COUNT(*) FROM payments "
                 "WHERE from_user_id = :uid AND payment_type = 'membership_upgrade'"),
            {"uid": user_id}
        ).fetchone()

        print()
        print("[VERIFY] Post-rollback state:")
        print(f"         membership_tier={verify[0]!r} (expected 'basic')")
        print(f"         membership_upgrade payments={verify_payments[0]} (expected 0)")

        if verify[0] == "basic" and verify_payments[0] == 0:
            print("\n[SUCCESS] Rollback verified clean.")
        else:
            print("\n[WARN] Verification didn't match expected state. Inspect manually.")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] {e}", file=sys.stderr)
        sys.exit(99)
    finally:
        db.close()


if __name__ == "__main__":
    main()
