"""
SuperAdPro — email suppression list.

A single authoritative gate that prevents sending to addresses that have
hard-bounced, filed a spam complaint, unsubscribed, or been manually
suppressed. Consulted by every send path (transactional + marketing) through
the two provider entry points (app.email_utils.send_email and
app.brevo_service.send_email / send_batch_emails).

Category rules:
  - bounce / complaint / manual  -> block ALL mail, including transactional.
    You must never keep mailing a hard-bounced or complained address; doing so
    is exactly what gets an SES account rate-limited or suspended.
  - unsubscribe                  -> block MARKETING only. An unsubscribed
    member still receives password resets, receipts, and security mail.

Callers pass category="marketing" for broadcasts / nurture / member sends;
everything else defaults to "transactional".

The suppression set is small (hundreds–low thousands) so it is cached in memory
for 60s and consulted with no DB hit on the hot send path. suppress() and
unsuppress() invalidate the cache immediately, so a fresh bounce/complaint takes
effect on the very next send.

Keyed by lowercased email so it covers BOTH members (users) and member-captured
leads — a bounce or complaint can come from either and must stop all future
sends to that address.
"""
import time
import logging
import threading

logger = logging.getLogger(__name__)

# Reasons that block every category of mail, including transactional.
_BLOCK_ALL = frozenset({"bounce", "complaint", "manual"})
_VALID_REASONS = _BLOCK_ALL | {"unsubscribe"}

_TTL = 60.0
_lock = threading.Lock()
_cache = {"at": 0.0, "map": {}}   # email -> set(reasons)


def normalize(email: str) -> str:
    return (email or "").strip().lower()


def _refresh(force: bool = False):
    now = time.time()
    if not force and _cache["at"] > 0 and (now - _cache["at"]) < _TTL:
        return
    try:
        from .database import SessionLocal, EmailSuppression
        db = SessionLocal()
        try:
            m = {}
            for email, reason in db.query(
                EmailSuppression.email, EmailSuppression.reason
            ).all():
                m.setdefault(email, set()).add(reason)
            with _lock:
                _cache["map"] = m
                _cache["at"] = now
        finally:
            db.close()
    except Exception as e:
        # Fail OPEN on infra error: do not block ALL mail because the DB
        # hiccuped. The broadcast path's own User.email_opt_out pre-filter
        # still applies regardless. Log loudly so it is visible.
        logger.error(f"[suppression] refresh failed, allowing sends this cycle: {e}")


def is_suppressed(email: str, category: str = "transactional") -> bool:
    """True if this address must not receive mail of the given category."""
    e = normalize(email)
    if not e:
        return False
    _refresh()
    reasons = _cache["map"].get(e)
    if not reasons:
        return False
    if reasons & _BLOCK_ALL:
        return True
    if category == "marketing" and "unsubscribe" in reasons:
        return True
    return False


def suppressed_set(category: str = "marketing") -> set:
    """Return the set of lowercased emails blocked for the given category.

    Used by recipient-resolution code to exclude suppressed addresses up front
    (accurate counts, no wasted send attempt) rather than relying only on the
    per-send gate.
    """
    _refresh()
    out = set()
    for email, reasons in _cache["map"].items():
        if reasons & _BLOCK_ALL or (category == "marketing" and "unsubscribe" in reasons):
            out.add(email)
    return out


def suppress(email: str, reason: str, source: str = None, detail: str = None) -> bool:
    """Add (or escalate) a suppression row for an address. Idempotent.

    Escalates unsubscribe -> bounce/complaint/manual; never downgrades a
    block-all reason back to unsubscribe.
    """
    e = normalize(email)
    if not e:
        return False
    reason = (reason or "manual").strip().lower()
    if reason not in _VALID_REASONS:
        reason = "manual"
    try:
        from .database import SessionLocal, EmailSuppression
        from datetime import datetime
        db = SessionLocal()
        try:
            row = db.query(EmailSuppression).filter(EmailSuppression.email == e).first()
            if row is None:
                db.add(EmailSuppression(
                    email=e, reason=reason,
                    source=(source or "")[:64] or None,
                    detail=(detail or "")[:1000] or None,
                    created_at=datetime.utcnow(),
                ))
            elif row.reason == "unsubscribe" and reason in _BLOCK_ALL:
                row.reason = reason
                row.source = ((source or row.source) or "")[:64] or None
                row.detail = ((detail or row.detail) or "")[:1000] or None
            db.commit()
            with _lock:
                _cache["at"] = 0.0   # force refresh on next read
            return True
        finally:
            db.close()
    except Exception as ex:
        logger.error(f"[suppression] suppress({e}, {reason}) failed: {ex}")
        return False


def unsuppress(email: str) -> bool:
    """Remove all suppression rows for an address (admin re-enable)."""
    e = normalize(email)
    if not e:
        return False
    try:
        from .database import SessionLocal, EmailSuppression
        db = SessionLocal()
        try:
            db.query(EmailSuppression).filter(EmailSuppression.email == e).delete()
            db.commit()
            with _lock:
                _cache["at"] = 0.0
            return True
        finally:
            db.close()
    except Exception as ex:
        logger.error(f"[suppression] unsuppress({e}) failed: {ex}")
        return False
