import { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Loader2, Wallet, ArrowRight, AlertTriangle } from 'lucide-react';

export default function CryptoCheckout({ productKey, productLabel, meta, onSuccess, onCancel }) {
  const [step, setStep] = useState(1);
  const [fromAddress, setFromAddress] = useState('');
  const [savedWallet, setSavedWallet] = useState('');
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);

  // Check if user has a saved sending wallet
  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d.sending_wallet) {
        setSavedWallet(d.sending_wallet);
        setFromAddress(d.sending_wallet);
      }
    }).catch(() => {});
  }, []);

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleContinue = async () => {
    const addr = fromAddress.trim();
    if (!addr || addr.length < 40 || !addr.startsWith('0x')) {
      setError('Please enter a valid wallet address starting with 0x');
      return;
    }
    setError('');
    setStatus('creating');

    try {
      const res = await fetch('/api/crypto/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_key: productKey, meta: meta || {}, from_address: addr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      setOrder(data);
      setStep(2);
      setStatus('waiting');
      startPolling(data.order_id);
    } catch (e) {
      setError(e.message);
      setStatus('idle');
    }
  };

  const startPolling = (orderId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/crypto/order/${orderId}`);
        const d = await r.json();
        if (d.status === 'confirmed') {
          clearInterval(pollRef.current);
          setStatus('confirmed');
          setTimeout(() => onSuccess && onSuccess(), 2000);
        } else if (d.status === 'expired') {
          clearInterval(pollRef.current);
          setStatus('expired');
        }
      } catch (e) {}
    }, 15000);
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleVerifyManually = async () => {
    if (!order) return;
    const txHash = prompt('Paste your transaction hash:');
    if (!txHash || txHash.length < 60) return;
    setStatus('verifying');
    try {
      const r = await fetch('/api/crypto/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.order_id, tx_hash: txHash }),
      });
      const d = await r.json();
      if (d.status === 'confirmed') {
        setStatus('confirmed');
        setTimeout(() => onSuccess && onSuccess(), 2000);
      } else {
        setError(d.error || 'Verification failed — please wait for auto-detection');
        setStatus('waiting');
      }
    } catch (e) {
      setError(e.message);
      setStatus('waiting');
    }
  };

  if (status === 'confirmed') {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={28} color="#22c55e" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Payment Confirmed!</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Your product is being activated...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8ecf2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748b' }}>Pay with crypto</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{productLabel || productKey}</div>
          </div>
          <div onClick={onCancel} style={{ cursor: 'pointer', padding: 4 }}><X size={18} color="#94a3b8" /></div>
        </div>

        {/* Network badge */}
        <div style={{ padding: '10px 20px 0', display: 'flex', gap: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}></span>
            Polygon Network
          </div>
        </div>

        <div style={{ padding: '16px 20px 20px' }}>

          {/* STEP 1: Enter wallet address */}
          {step === 1 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>1</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Enter your sending wallet address</div>
              </div>

              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 14 }}>
                Paste the wallet address you'll send USDT from. This is how we identify your payment.
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Your sending wallet address</div>
                <input
                  ref={inputRef}
                  type="text"
                  value={fromAddress}
                  onChange={e => setFromAddress(e.target.value)}
                  placeholder="0x..."
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#06b6d4'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {savedWallet && (
                <div style={{ fontSize: 11, color: '#06b6d4', marginBottom: 10, cursor: 'pointer' }}
                  onClick={() => setFromAddress(savedWallet)}>
                  Use saved wallet: {savedWallet.slice(0, 8)}...{savedWallet.slice(-6)}
                </div>
              )}

              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16, lineHeight: 1.5 }}>
                Supported: MetaMask, Trust Wallet, Coinbase Wallet, or any Polygon-compatible wallet.
              </div>

              {error && (
                <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 12, fontSize: 12, fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button onClick={handleContinue} disabled={status === 'creating'}
                style={{ width: '100%', padding: 12, fontSize: 14, fontWeight: 700, color: '#fff', background: status === 'creating' ? '#94a3b8' : '#06b6d4', border: 'none', borderRadius: 10, cursor: status === 'creating' ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                {status === 'creating' ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating order...</> : <>Continue <ArrowRight size={16} /></>}
              </button>
            </>
          )}

          {/* STEP 2: Send payment */}
          {step === 2 && order && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>2</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Send payment</div>
              </div>

              {/* Sending from badge */}
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '6px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <Wallet size={12} color="#06b6d4" />
                <span style={{ color: '#64748b' }}>Sending from:</span>
                <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>{fromAddress.slice(0, 8)}...{fromAddress.slice(-6)}</span>
                <span style={{ color: '#06b6d4', cursor: 'pointer', marginLeft: 'auto' }} onClick={() => { setStep(1); setStatus('idle'); }}>change</span>
              </div>

              {/* Amount */}
              <div style={{ textAlign: 'center', padding: '12px 0 16px', background: '#f0fdfa', borderRadius: 10, border: '1px solid #ccfbf1', marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#0e7490', marginBottom: 6 }}>Send exactly</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 800, color: '#0c4a6e' }}>
                  {order.amount_usdt} <span style={{ fontSize: 16, color: '#06b6d4', fontWeight: 700 }}>USDT / USDC</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => copyText(order.amount_usdt, 'amount')}
                    style={{ fontSize: 11, fontWeight: 600, color: copied === 'amount' ? '#22c55e' : '#06b6d4', background: 'none', border: '1px solid ' + (copied === 'amount' ? '#22c55e' : '#06b6d4'), borderRadius: 6, padding: '4px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                    {copied === 'amount' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Amount</>}
                  </button>
                </div>
              </div>

              {/* Wallet address */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>To this wallet address</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e8ecf2', borderRadius: 8, padding: '10px 12px' }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#0f172a', wordBreak: 'break-all', flex: 1 }}>{order.wallet_address}</span>
                  <button onClick={() => copyText(order.wallet_address, 'wallet')}
                    style={{ fontSize: 10, fontWeight: 600, color: copied === 'wallet' ? '#22c55e' : '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                    {copied === 'wallet' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Warnings */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
                  <strong style={{ display: 'block', marginBottom: 2 }}>Important</strong>
                  Send from the wallet address you entered above.
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#166534', lineHeight: 1.5 }}>
                  <strong style={{ display: 'block', marginBottom: 2 }}>Network</strong>
                  Send USDT or USDC on <strong>Polygon</strong> only. Other networks = lost funds.
                </div>
              </div>

              {/* No refunds */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 11, color: '#991b1b', lineHeight: 1.5, textAlign: 'center' }}>
                <strong>All sales are final.</strong> Crypto transactions are irreversible. No refunds.
              </div>

              {/* Waiting spinner */}
              {status === 'waiting' && (
                <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 20px' }}>
                    <Loader2 size={16} color="#0ea5e9" style={{ animation: 'spin 1.5s linear infinite' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0369a1' }}>Waiting for your payment...</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>We'll detect it automatically once you send from the wallet above.</div>
                  <div style={{ marginTop: 10 }}>
                    <span onClick={handleVerifyManually} style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'underline', cursor: 'pointer' }}>
                      Payment not detected? Verify manually
                    </span>
                  </div>
                </div>
              )}

              {status === 'verifying' && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#0369a1' }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verifying transaction...
                  </div>
                </div>
              )}

              {status === 'expired' && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Order expired</div>
                  <button onClick={() => { setStep(1); setStatus('idle'); setOrder(null); }}
                    style={{ fontSize: 13, fontWeight: 600, color: '#06b6d4', background: 'none', border: '1px solid #06b6d4', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Try again
                  </button>
                </div>
              )}

              {error && (
                <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginTop: 10, fontSize: 12, color: '#dc2626', textAlign: 'center' }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};

const modalStyle = {
  background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440,
  maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,.15)',
};
