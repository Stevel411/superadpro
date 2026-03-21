import { useState, useEffect, useRef } from 'react';
import { apiPost, apiGet } from '../utils/api';
import { Copy, Check, Clock, ExternalLink, Shield, Loader2, QrCode, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * CryptoCheckout — modal/inline component for USDT payments on Polygon.
 *
 * Props:
 *   productKey   — e.g. "membership_basic", "membership_pro", "grid_3"
 *   productLabel — display name, e.g. "Pro Membership"
 *   meta         — optional extra data (e.g. { affiliate_id: 42 })
 *   onSuccess    — callback when payment confirmed
 *   onCancel     — callback to close/cancel
 */
export default function CryptoCheckout({ productKey, productLabel, meta, onSuccess, onCancel }) {
  var [step, setStep] = useState('loading'); // loading, pay, verifying, confirmed, error, expired
  var [order, setOrder] = useState(null);
  var [copied, setCopied] = useState('');
  var [txHash, setTxHash] = useState('');
  var [error, setError] = useState('');
  var [countdown, setCountdown] = useState(0);
  var [pollCount, setPollCount] = useState(0);
  var [showManual, setShowManual] = useState(false);
  var intervalRef = useRef(null);
  var pollRef = useRef(null);

  // Create the payment order on mount
  useEffect(function () {
    apiPost('/api/crypto/create-checkout', { product_key: productKey, meta: meta || {} })
      .then(function (d) {
        if (d.error) { setError(d.error); setStep('error'); return; }
        setOrder(d);
        setCountdown(d.expires_in_seconds || 1800);
        setStep('pay');
      })
      .catch(function (e) { setError(e.message || 'Failed to create payment order'); setStep('error'); });
  }, []);

  // Countdown timer
  useEffect(function () {
    if (step !== 'pay' && step !== 'verifying') return;
    intervalRef.current = setInterval(function () {
      setCountdown(function (prev) {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setStep('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return function () { clearInterval(intervalRef.current); };
  }, [step]);

  // Auto-poll order status every 15s while on pay screen
  useEffect(function () {
    if (step !== 'pay' || !order) return;
    pollRef.current = setInterval(function () {
      apiGet('/api/crypto/order/' + order.order_id)
        .then(function (d) {
          if (d.status === 'confirmed') {
            clearInterval(pollRef.current);
            setStep('confirmed');
          } else if (d.status === 'expired') {
            clearInterval(pollRef.current);
            setStep('expired');
          }
        })
        .catch(function () {});
      setPollCount(function (p) { return p + 1; });
    }, 15000);
    return function () { clearInterval(pollRef.current); };
  }, [step, order]);

  function copyText(text, label) {
    navigator.clipboard.writeText(text).then(function () {
      setCopied(label);
      setTimeout(function () { setCopied(''); }, 2000);
    });
  }

  function submitTxHash() {
    if (!txHash || !txHash.startsWith('0x')) {
      setError('Enter a valid transaction hash starting with 0x');
      return;
    }
    setStep('verifying');
    setError('');
    apiPost('/api/crypto/verify-payment', { order_id: order.order_id, tx_hash: txHash })
      .then(function (d) {
        if (d.success) {
          setStep('confirmed');
        } else if (d.status === 'pending') {
          setError('Transaction not confirmed yet — it may still be processing. Wait a moment and try again.');
          setStep('pay');
        } else {
          setError(d.error || 'Verification failed');
          setStep('pay');
        }
      })
      .catch(function (e) {
        setError(e.message || 'Verification failed');
        setStep('pay');
      });
  }

  function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  // ── Styles ──
  var overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(5,13,26,0.7)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: 20,
  };

  var modal = {
    background: '#fff', borderRadius: 16, maxWidth: 480, width: '100%',
    boxShadow: '0 24px 80px rgba(0,0,0,.25)', overflow: 'hidden',
    fontFamily: 'DM Sans, sans-serif',
  };

  var header = {
    background: 'linear-gradient(135deg, #0b1729 0%, #132240 50%, #0e1c30 100%)',
    padding: '24px 28px', color: '#fff', position: 'relative',
  };

  var body = { padding: '24px 28px' };

  var cyan = '#0ea5e9';

  // ── Loading ──
  if (step === 'loading') {
    return (
      <div style={overlay}>
        <div style={modal}>
          <div style={header}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Preparing Payment...</div>
          </div>
          <div style={{ ...body, textAlign: 'center', padding: '60px 28px' }}>
            <Loader2 size={36} color={cyan} style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: 16, color: '#64748b', fontSize: 14 }}>Creating your payment order</div>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // ── Error ──
  if (step === 'error' && !order) {
    return (
      <div style={overlay}>
        <div style={modal}>
          <div style={header}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Payment Error</div>
          </div>
          <div style={{ ...body, textAlign: 'center', padding: '40px 28px' }}>
            <AlertTriangle size={40} color="#f59e0b" />
            <div style={{ marginTop: 16, color: '#dc2626', fontSize: 14, fontWeight: 600 }}>{error}</div>
            <button onClick={onCancel} style={{ marginTop: 24, padding: '12px 32px', borderRadius: 10, border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Expired ──
  if (step === 'expired') {
    return (
      <div style={overlay}>
        <div style={modal}>
          <div style={header}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Payment Expired</div>
          </div>
          <div style={{ ...body, textAlign: 'center', padding: '40px 28px' }}>
            <Clock size={40} color="#94a3b8" />
            <div style={{ marginTop: 16, color: '#64748b', fontSize: 14 }}>This payment order has expired. Please try again.</div>
            <button onClick={onCancel} style={{ marginTop: 24, padding: '12px 32px', borderRadius: 10, border: 'none', background: cyan, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmed ──
  if (step === 'confirmed') {
    return (
      <div style={overlay}>
        <div style={modal}>
          <div style={{ ...header, background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Payment Confirmed!</div>
          </div>
          <div style={{ ...body, textAlign: 'center', padding: '40px 28px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <CheckCircle2 size={36} color="#059669" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{productLabel} Activated</div>
            <div style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>Your payment has been verified on the Polygon blockchain.</div>
            {order && order.tx_hash && (
              <a href={'https://polygonscan.com/tx/' + (txHash || order.tx_hash)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: cyan, textDecoration: 'none', marginBottom: 24 }}>
                View on PolygonScan <ExternalLink size={12} />
              </a>
            )}
            <button onClick={function () { if (onSuccess) onSuccess(); }} style={{ display: 'block', width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pay / Verifying ──
  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <button onClick={onCancel} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff', lineHeight: 0 }}><X size={18} /></button>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>Pay with Crypto</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{productLabel}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(14,165,233,.15)', border: '1px solid rgba(14,165,233,.3)', borderRadius: 20, padding: '4px 12px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>Polygon Network</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: countdown < 300 ? '#f87171' : 'rgba(255,255,255,.5)' }}>
              <Clock size={12} /> {formatTime(countdown)}
            </div>
          </div>
        </div>

        <div style={body}>
          {/* Amount */}
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Send Exactly</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', fontFamily: 'Sora, DM Sans, sans-serif' }}>{order ? order.amount_usdt : '—'}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0ea5e9' }}>USDT</span>
            </div>
            <button onClick={function () { copyText(order.amount_usdt, 'amount'); }} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
              {copied === 'amount' ? <><Check size={12} color="#059669" /> Copied</> : <><Copy size={12} /> Copy Amount</>}
            </button>
          </div>

          {/* Wallet address */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>To This Wallet Address</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
              <code style={{ flex: 1, fontSize: 12, wordBreak: 'break-all', color: '#1e293b', fontWeight: 600 }}>{order ? order.wallet_address : '...'}</code>
              <button onClick={function () { copyText(order.wallet_address, 'address'); }} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', lineHeight: 0 }}>
                {copied === 'address' ? <Check size={14} color="#059669" /> : <Copy size={14} color="#64748b" />}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
              <strong style={{ display: 'block', marginBottom: 2 }}>⚠️ Important</strong>
              Send the <strong>exact amount</strong> shown above. A different amount will not be matched to your order.
            </div>
            <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#166534', lineHeight: 1.5 }}>
              <strong style={{ display: 'block', marginBottom: 2 }}>✅ Network</strong>
              Send USDT on the <strong>Polygon</strong> network only. Other networks will result in lost funds.
            </div>
          </div>

          {/* No refund notice */}
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 20, fontSize: 11, color: '#991b1b', lineHeight: 1.5, textAlign: 'center' }}>
            <strong>All sales are final.</strong> Crypto transactions are irreversible. No refunds are offered on any purchases.
          </div>

          {/* Waiting for payment */}
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 20px', marginBottom: 12 }}>
              <Loader2 size={16} color="#0ea5e9" style={{ animation: 'spin 1.5s linear infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0369a1' }}>Waiting for your payment...</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Once you send the USDT, your payment will be detected automatically.</div>
          </div>

          {/* Error message */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#dc2626', marginTop: 12 }}>
              {error}
            </div>
          )}

          {/* Collapsed manual verify */}
          <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            {!showManual ? (
              <button onClick={function () { setShowManual(true); }} style={{ background: 'none', border: 'none', fontSize: 11, color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                Payment not detected? Verify manually
              </button>
            ) : (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Paste Your Transaction Hash</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={txHash}
                    onChange={function (e) { setTxHash(e.target.value.trim()); }}
                    placeholder="0x..."
                    disabled={step === 'verifying'}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12, fontFamily: 'monospace', outline: 'none', background: step === 'verifying' ? '#f1f5f9' : '#fff' }}
                  />
                  <button
                    onClick={submitTxHash}
                    disabled={step === 'verifying' || !txHash}
                    style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: step === 'verifying' ? '#94a3b8' : cyan, color: '#fff', fontWeight: 700, fontSize: 12, cursor: step === 'verifying' ? 'wait' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {step === 'verifying' ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Checking...</> : <><Shield size={12} /> Verify</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
