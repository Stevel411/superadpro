/**
 * PurchaseConsentModal — gates any money-in action.
 *
 * Usage pattern (from any purchase page):
 *
 *   import { PurchaseConsentModal, ensurePurchaseConsent } from '../components/PurchaseConsentModal';
 *
 *   function MyPurchaseButton() {
 *     const [showConsent, setShowConsent] = useState(false);
 *     const proceedRef = useRef(null);
 *
 *     async function handleBuy() {
 *       const ok = await ensurePurchaseConsent(setShowConsent, proceedRef);
 *       if (!ok) return;  // user cancelled the modal
 *       // ...do the actual purchase API call now
 *     }
 *
 *     return (
 *       <>
 *         <button onClick={handleBuy}>Buy Now</button>
 *         <PurchaseConsentModal show={showConsent} onClose={() => setShowConsent(false)} onAccepted={() => proceedRef.current?.()} />
 *       </>
 *     );
 *   }
 *
 * The modal:
 *   1. Fetches /api/purchase-consent on open (gets the latest disclaimer text + version + hash)
 *   2. Shows the disclaimer in a scrollable area
 *   3. User scrolls (must reach bottom to enable the checkbox — proves they at least saw all the text)
 *   4. User ticks the box, then clicks "I Agree & Proceed"
 *   5. Modal POSTs /api/purchase-consent/record with the version + hash it received
 *   6. On 200, modal closes and onAccepted() fires — caller proceeds with the purchase
 *   7. Server-side, /api/purchase-consent/record stores user_id, version, hash, ip, user-agent, timestamp
 *   8. Server-side, the actual purchase endpoint then calls require_fresh_consent which finds and consumes the record
 *
 * The text is intentionally rendered as plain text (not interpreted markdown)
 * so the user sees exactly the bytes that were hashed — no risk of formatter
 * differences making the displayed text mismatch the hashed text.
 */

import { useEffect, useState, useRef } from 'react';
import { apiGet, apiPost } from '../utils/api';

export function PurchaseConsentModal({ show, onClose, onAccepted }) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);  // { version, text_hash, text, enforced }
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(function() {
    if (!show) return;
    // Reset state every time the modal opens — so a previous open's
    // accepted state can't carry over and let someone skip reading.
    setScrolledToBottom(false);
    setAgreed(false);
    setError('');
    setLoading(true);
    apiGet('/api/purchase-consent').then(function(p) {
      setPayload(p);
      setLoading(false);
    }).catch(function() {
      setError('Could not load purchase terms. Please try again.');
      setLoading(false);
    });
  }, [show]);

  function handleScroll() {
    var el = scrollRef.current;
    if (!el) return;
    // "Reached the bottom" = within 16px of the bottom. Lenient enough
    // to handle browser rounding while still requiring meaningful scroll.
    if (el.scrollHeight - (el.scrollTop + el.clientHeight) < 16) {
      setScrolledToBottom(true);
    }
  }

  async function handleAccept() {
    if (submitting || !agreed || !scrolledToBottom || !payload) return;
    setSubmitting(true);
    setError('');
    try {
      var res = await apiPost('/api/purchase-consent/record', {
        version: payload.version,
        text_hash: payload.text_hash,
      });
      if (res && res.success) {
        // Modal closes; caller's onAccepted callback proceeds with purchase.
        if (onAccepted) onAccepted();
        if (onClose) onClose();
      } else {
        setError((res && res.error) || 'Could not record consent. Please refresh and try again.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    }
    setSubmitting(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-consent-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, backdropFilter: 'blur(4px)',
      }}
      onClick={function(e) {
        // Click-outside dismisses (but not while submitting — protects
        // against accidental closes during the network call).
        if (e.target === e.currentTarget && !submitting && onClose) onClose();
      }}
    >
      <div
        onClick={function(e) { e.stopPropagation(); }}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640,
          maxHeight: 'calc(100dvh - 32px)', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,.4)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div id="purchase-consent-title" style={{
            fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 800,
            color: 'var(--sap-text-primary)',
          }}>
            Before you buy — please read this
          </div>
          <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', marginTop: 4 }}>
            Required by UK consumer law. Tick the box and click Agree to continue.
          </div>
        </div>

        {/* Body — scrollable disclaimer text */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--sap-text-muted)' }}>
            Loading purchase terms…
          </div>
        ) : payload ? (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px',
              fontSize: 14, lineHeight: 1.7, color: 'var(--sap-text-primary)',
              whiteSpace: 'pre-wrap',  // preserve newlines exactly
              fontFamily: 'inherit',
              minHeight: 0,
            }}
          >
            {payload.text}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--sap-red)' }}>
            {error || 'Could not load terms.'}
          </div>
        )}

        {/* Hint when user hasn't yet scrolled */}
        {!loading && payload && !scrolledToBottom && (
          <div style={{
            padding: '8px 24px', background: '#fffbeb', borderTop: '1px solid #fde68a',
            fontSize: 13, color: '#854d0e', textAlign: 'center', flexShrink: 0,
          }}>
            ↓ Scroll to the end to enable the consent checkbox
          </div>
        )}

        {/* Footer — checkbox + buttons */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #e2e8f0', flexShrink: 0,
          background: '#f8fafc',
        }}>
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            cursor: scrolledToBottom ? 'pointer' : 'not-allowed',
            opacity: scrolledToBottom ? 1 : 0.5,
            fontSize: 14, color: 'var(--sap-text-primary)',
            marginBottom: 14, userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={agreed}
              disabled={!scrolledToBottom || submitting}
              onChange={function(e) { setAgreed(e.target.checked); }}
              className="allow-small-text"
              style={{ marginTop: 3, flexShrink: 0, width: 18, height: 18 }}
            />
            <span>
              I have read the purchase terms above. I expressly consent to
              immediate activation of this purchase and acknowledge that I
              will lose my right to cancel under the Consumer Contracts
              Regulations 2013.
            </span>
          </label>

          {error && (
            <div style={{
              padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, color: 'var(--sap-red)', fontSize: 13, marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '10px 18px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                color: 'var(--sap-text-primary)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={!agreed || !scrolledToBottom || submitting}
              style={{
                padding: '10px 22px', borderRadius: 8, border: 'none',
                background: (agreed && scrolledToBottom && !submitting)
                  ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
                  : 'var(--sap-text-ghost)',
                cursor: (agreed && scrolledToBottom && !submitting) ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff',
                boxShadow: (agreed && scrolledToBottom && !submitting)
                  ? '0 4px 0 #172554, 0 6px 16px rgba(30,58,138,.3)' : 'none',
              }}
            >
              {submitting ? 'Recording…' : 'I Agree & Proceed'}
            </button>
          </div>

          {payload && !payload.enforced && (
            <div style={{
              marginTop: 10, padding: '6px 10px', background: '#fef9c3',
              border: '1px solid #fde68a', borderRadius: 6, fontSize: 11,
              color: '#854d0e', textAlign: 'center',
            }}>
              ⚠ Pre-launch: consent is being captured for testing but is not
              yet enforced. Solicitor sign-off pending.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/**
 * useConsentGate — a one-shot hook for purchase pages.
 *
 * Returns:
 *   {
 *     ensureConsent: () => Promise<boolean>,  // call before any buy API hit
 *     consentModal:  JSX node to render somewhere in your tree,
 *   }
 *
 * Usage:
 *   function MyPurchasePage() {
 *     const { ensureConsent, consentModal } = useConsentGate();
 *     async function handleBuy() {
 *       const ok = await ensureConsent();
 *       if (!ok) return;
 *       // Proceed with the actual purchase API call...
 *     }
 *     return (<>
 *       <button onClick={handleBuy}>Buy</button>
 *       {consentModal}
 *     </>);
 *   }
 */
export function useConsentGate() {
  const [show, setShow] = useState(false);
  const resolverRef = useRef(null);

  function ensureConsent() {
    return new Promise(function(resolve) {
      resolverRef.current = resolve;
      setShow(true);
    });
  }

  function onAccepted() {
    if (resolverRef.current) resolverRef.current(true);
    resolverRef.current = null;
    setShow(false);
  }

  function onCancelled() {
    if (resolverRef.current) resolverRef.current(false);
    resolverRef.current = null;
    setShow(false);
  }

  return {
    ensureConsent: ensureConsent,
    consentModal: <PurchaseConsentModal show={show} onClose={onCancelled} onAccepted={onAccepted} />,
  };
}


/**
 * Lower-level helper kept for callers that want imperative control.
 * Returns a Promise resolving to true if accepted, false if cancelled.
 */
export function ensurePurchaseConsent(setShowConsent, proceedRef) {
  return new Promise(function(resolve) {
    proceedRef.current = function() { resolve(true); };
    setShowConsent(true);
    var originalProceed = proceedRef.current;
    proceedRef.cancel = function() {
      if (proceedRef.current === originalProceed) {
        proceedRef.current = null;
        resolve(false);
      }
    };
  });
}
