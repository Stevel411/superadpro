import { useTranslation } from 'react-i18next';
import { useState, useEffect, lazy, Suspense } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useConsentGate } from '../components/PurchaseConsentModal';

// Lazy-load self-custody payment components — Reown/wagmi adds heavy crypto
// deps. Loaded only when this page renders. React.lazy wants default exports,
// so each named export is wrapped in a shim (all one module / one chunk).
var _wcModule = null;
function _loadWC() { if (!_wcModule) _wcModule = import('../components/WalletConnect'); return _wcModule; }
var WalletConnectProvider = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectProvider }; }); });
var WalletConnectGate = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectGate }; }); });
var WalletPayLink = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletPayLink }; }); });

// AL palette — navy structure, red action. Packs are one product in graded
// sizes, so they share one navy treatment (no per-pack colour circus).
var C = {
  navy: '#0a1f52', navy2: '#12388f', red: '#c8102e', redLt: '#ff5a70',
  ink: '#0d1230', dim: '#5a6584', line: '#e3e8f4', grn: '#0b7a3e',
  mono: "'JetBrains Mono',monospace",
};

export default function CreditMatrix() {
  return <CreditMatrixContent />;
}

export function CreditMatrixContent() {
  var { t } = useTranslation();
  var [packs, setPacks] = useState([]);
  var [stats, setStats] = useState(null);
  var [loading, setLoading] = useState(true);
  var [purchasing, setPurchasing] = useState(null);
  var [selected, setSelected] = useState(null);
  var [message, setMessage] = useState(null);
  var [stripeReady, setStripeReady] = useState(false);
  var { ensureConsent, consentModal } = useConsentGate();

  function loadAll() {
    Promise.all([
      apiGet('/api/credit-matrix/packs'),
      apiGet('/api/credit-matrix/stats'),
    ]).then(function(results) {
      if (results[0] && results[0].success) {
        var pk = results[0].packs || [];
        setPacks(pk);
        setSelected(function(prev) { return prev != null ? prev : (pk.length ? pk[Math.min(2, pk.length - 1)].key : null); });
      }
      if (results[1] && results[1].success) setStats(results[1].stats || null);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }

  useEffect(function() { loadAll(); }, []);

  // Stripe Checkout returns here after a card purchase. The backend redirects
  // to /my-credits?activated={pack_key} on success, /my-credits on cancel.
  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('activated')) {
      setMessage({ type: 'success', text: t('creditMatrix.cardSuccess', { defaultValue: 'Payment received — your credits have been added to your balance.' }) });
      window.history.replaceState({}, '', window.location.pathname);
      loadAll();
    }
  }, []);

  // Is Stripe available for one-time card payments? Credit packs are one-time
  // (ad-hoc amount), so we check configured_for_payments, not the subscription
  // gate. Drives whether the 'Pay by card' button shows.
  useEffect(function() {
    apiGet('/api/stripe/status')
      .then(function(d) { if (d && (d.configured_for_payments === true || d.configured === true)) setStripeReady(true); })
      .catch(function() { /* leave card hidden */ });
  }, []);

  async function buyPack(packKey) {
    var consented = await ensureConsent();
    if (!consented) return;
    setPurchasing(packKey);
    setMessage(null);
    apiPost('/api/credit-matrix/purchase', { pack_key: packKey, payment_method: 'crypto' })
      .then(function(r) {
        setPurchasing(null);
        if (r.success && r.action === 'crypto_checkout' && r.invoice_url) {
          window.open(r.invoice_url, '_blank');
          setMessage({ type: 'success', text: t('creditMatrix.cryptoOpened', { credits: r.credits, defaultValue: 'Payment window opened — complete your USDT payment to receive ' + r.credits + ' credits. They land in your balance automatically once payment confirms.' }) });
        } else if (r.success && !r.action) {
          setMessage({ type: 'success', text: (r.credits_awarded || 0).toLocaleString() + ' ' + t('creditMatrix.creditsAwarded', { defaultValue: 'credits added to your balance.' }) });
          loadAll();
        } else {
          setMessage({ type: 'error', text: r.error || t('creditMatrix.purchaseFailed', { defaultValue: 'Purchase failed' }) });
        }
      })
      .catch(function(e) {
        setPurchasing(null);
        setMessage({ type: 'error', text: e.message || t('creditMatrix.purchaseFailed', { defaultValue: 'Purchase failed' }) });
      });
  }

  async function buyPackWithCard(packKey) {
    var consented = await ensureConsent();
    if (!consented) return;
    setPurchasing(packKey);
    setMessage(null);
    apiPost('/api/stripe/checkout/nexus-pack', { pack_key: packKey })
      .then(function(r) {
        setPurchasing(null);
        if (r.checkout_url) { window.location.href = r.checkout_url; }
        else { setMessage({ type: 'error', text: r.error || t('creditMatrix.cardUnavailable', { defaultValue: 'Card checkout unavailable. Please try crypto.' }) }); }
      })
      .catch(function(e) {
        setPurchasing(null);
        setMessage({ type: 'error', text: e.message || t('creditMatrix.cardFailed', { defaultValue: 'Card checkout failed' }) });
      });
  }

  var CSS = `
    .cx{font-family:'Inter',system-ui,sans-serif;color:${C.ink};max-width:1080px;margin:0 auto;}
    .cx *{box-sizing:border-box;}
    .cx .hero{position:relative;background:linear-gradient(150deg,${C.navy},${C.navy2});border-radius:20px;padding:28px 32px;color:#fff;overflow:hidden;box-shadow:0 24px 60px -30px rgba(10,31,82,.7);margin-bottom:22px;display:flex;align-items:center;gap:20px;}
    .cx .hero:after{content:"";position:absolute;top:-40px;right:-20px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(200,16,46,.26),transparent 68%);}
    .cx .hero .hi{position:relative;width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,${C.red},#e8203f);display:flex;align-items:center;justify-content:center;font-size:24px;flex:0 0 auto;box-shadow:0 8px 20px -6px rgba(200,16,46,.7);}
    .cx .hero .ht{position:relative;}
    .cx .hero h1{font-weight:900;font-size:28px;letter-spacing:-.7px;line-height:1.05;}
    .cx .hero h1 .r{color:${C.redLt};}
    .cx .hero p{font-size:14px;color:#a9bbf0;font-weight:600;margin-top:7px;max-width:60ch;line-height:1.5;}
    .cx .bal{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fbfcfe;border:1.5px solid ${C.line};border-radius:16px;padding:20px 24px;margin-bottom:24px;box-shadow:0 10px 30px -22px rgba(10,31,82,.4);}
    .cx .bal .k{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:${C.dim};margin-bottom:5px;}
    .cx .bal .v{font-family:${C.mono};font-weight:700;font-size:34px;letter-spacing:-1.5px;color:${C.navy};line-height:1;}
    .cx .bal .v span{font-size:15px;color:${C.dim};font-weight:700;}
    .cx .bal .note{font-size:12.5px;color:${C.dim};font-weight:600;text-align:right;max-width:34ch;line-height:1.5;}
    .cx .bal .note b{color:${C.ink};}
    .cx h2{font-weight:900;font-size:20px;letter-spacing:-.4px;margin-bottom:4px;}
    .cx h2 .r{color:${C.red};}
    .cx .sub{font-size:13.5px;color:${C.dim};font-weight:600;margin-bottom:16px;}
    .cx .explain{background:#fbfcfe;border:1.5px solid ${C.line};border-radius:14px;padding:18px 20px;margin-bottom:24px;display:flex;gap:14px;align-items:flex-start;}
    .cx .explain .q{width:40px;height:40px;border-radius:11px;background:#eef2fb;color:${C.navy2};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;flex:0 0 auto;}
    .cx .explain b{font-weight:900;font-size:14.5px;}
    .cx .explain p{font-size:13px;color:${C.dim};font-weight:600;line-height:1.55;margin-top:4px;}
    .cx .packs{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px;}
    .cx .pk{position:relative;border-radius:15px;padding:20px 16px;text-align:center;cursor:pointer;background:linear-gradient(150deg,${C.navy},${C.navy2});color:#fff;border:2px solid transparent;box-shadow:0 12px 30px -16px rgba(10,31,82,.55);transition:transform .14s,box-shadow .14s,border-color .14s;}
    .cx .pk:hover{transform:translateY(-3px);box-shadow:0 20px 44px -18px rgba(10,31,82,.7);}
    .cx .pk.sel{border-color:${C.red};box-shadow:0 20px 46px -14px rgba(200,16,46,.7);}
    .cx .pk .nm{font-size:13px;font-weight:800;color:#a9bbf0;letter-spacing:.02em;}
    .cx .pk .pr{font-family:${C.mono};font-weight:700;font-size:28px;letter-spacing:-1.5px;margin:6px 0 3px;}
    .cx .pk .cr{font-size:12.5px;font-weight:700;color:#c3d0f0;}
    .cx .pk .btns{margin-top:13px;display:flex;flex-direction:column;gap:7px;}
    .cx .pk .buy{background:${C.red};color:#fff;border:0;border-radius:10px;padding:10px;width:100%;font-family:'Inter',sans-serif;font-weight:800;font-size:13px;cursor:pointer;}
    .cx .pk .buy:disabled{opacity:.6;cursor:wait;}
    .cx .pk .card{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:9px;width:100%;font-family:'Inter',sans-serif;font-weight:700;font-size:12px;cursor:pointer;}
    .cx .pk .card:disabled{opacity:.6;cursor:wait;}
    .cx .pay{background:#fbfcfe;border:1.5px solid ${C.line};border-radius:12px;padding:13px 16px;font-size:12.5px;font-weight:600;color:${C.dim};margin-bottom:26px;display:flex;align-items:center;gap:10px;}
    .cx .pay b{color:${C.ink};}
    .cx .pay .ic{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,${C.navy2},${C.navy});display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;flex:0 0 auto;}
    .cx .card2{background:#fff;border:1.5px solid ${C.line};border-radius:16px;padding:24px;box-shadow:0 10px 30px -22px rgba(10,31,82,.4);}
    .cx .empty{padding:30px;text-align:center;color:#94a3b8;font-size:13.5px;font-weight:600;}
    .cx .hrow{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid #f1f5f9;}
    .cx .hrow:last-child{border-bottom:none;}
    .cx .hrow .hp{font-weight:800;font-size:14px;}
    .cx .hrow .hd{font-size:12px;color:${C.dim};font-weight:600;margin-top:2px;}
    .cx .hrow .ha{font-family:${C.mono};font-weight:700;font-size:15px;color:${C.navy};}
    .cx .msg{padding:14px 18px;border-radius:11px;margin-bottom:18px;display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:600;}
    .cx .msg.ok{background:#e4f7ee;color:#166534;border:1.5px solid #a7f3d0;}
    .cx .msg.err{background:#fdecec;color:#991b1b;border:1.5px solid #f5c2c2;}
    .cx .wgate{margin-bottom:14px;}
    @media(max-width:820px){.cx .packs{grid-template-columns:repeat(2,1fr);}.cx .hero{flex-direction:column;align-items:flex-start;}.cx .bal{flex-direction:column;align-items:flex-start;}.cx .bal .note{text-align:left;}}
    @keyframes spin{to{transform:rotate(360deg)}}
  `;

  if (loading) {
    return (
      <AppLayout categoryBack={{ to: '/creative-studio', label: 'Creative Studio' }} hideTopbar>
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Loader2 size={32} color={C.navy2} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      </AppLayout>
    );
  }

  var balance = stats ? (stats.credit_balance || 0) : 0;
  var purchases = (stats && stats.purchases) || [];

  return (
    <Suspense fallback={<AppLayout categoryBack={{ to: '/creative-studio', label: 'Creative Studio' }} hideTopbar><div /></AppLayout>}>
      <WalletConnectProvider onBeforeClick={async function() { return await ensureConsent(); }}>
        <AppLayout categoryBack={{ to: '/creative-studio', label: 'Creative Studio' }} hideTopbar>
          <style>{CSS}</style>
          <div className="cx">

            <div className="hero">
              <div className="hi">⚡</div>
              <div className="ht">
                <h1>{t('creditMatrix.heroA', { defaultValue: 'Credits power your' })} <span className="r">{t('creditMatrix.heroB', { defaultValue: 'AI tools' })}</span></h1>
                <p>{t('creditMatrix.heroSub', { defaultValue: 'Buy credits to generate AI videos, images, music and voiceovers in Creative Studio. Credits never expire — top up whenever you need them.' })}</p>
              </div>
            </div>

            <div className="bal">
              <div className="l">
                <div className="k">{t('creditMatrix.yourBalance', { defaultValue: 'Your credit balance' })}</div>
                <div className="v">{balance.toLocaleString()} <span>{t('creditMatrix.credits', { defaultValue: 'credits' })}</span></div>
              </div>
              <div className="note"><b>$0.20</b> {t('creditMatrix.perCreditNote', { defaultValue: 'per credit. Credits are spent as you generate — top up whenever you run low.' })}</div>
            </div>

            {message && (
              <div className={'msg ' + (message.type === 'success' ? 'ok' : 'err')}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span>{message.text}</span>
              </div>
            )}

            <div className="explain">
              <div className="q">?</div>
              <div>
                <b>{t('creditMatrix.whatBuying', { defaultValue: 'What am I actually buying?' })}</b>
                <p>{t('creditMatrix.whatBuyingBody', { defaultValue: 'Credits are the in-app currency for Creative Studio. Each generation — a video clip, an image, a music track, a voiceover — spends credits based on what it costs to produce. One straightforward purchase, no subscription.' })}</p>
              </div>
            </div>

            <h2>{t('creditMatrix.buyPacksA', { defaultValue: 'Buy' })} <span className="r">{t('creditMatrix.buyPacksB', { defaultValue: 'credit packs' })}</span></h2>
            <div className="sub">{t('creditMatrix.buyPacksSub', { defaultValue: 'Pick the size that suits you — credits never expire, so a bigger pack just means fewer top-ups.' })}</div>

            <div className="wgate">
              <Suspense fallback={null}>
                <WalletConnectGate
                  hideWhenConnected
                  label={t('creditMatrix.connectWallet', { defaultValue: 'Connect wallet to pay directly with USDT (BSC)' })}
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: 12,
                    border: 'none', fontSize: 14, fontWeight: 800, color: '#fff',
                    background: 'linear-gradient(135deg,' + C.navy2 + ',' + C.navy + ')',
                    fontFamily: "'Inter',sans-serif", cursor: 'pointer',
                  }}
                />
              </Suspense>
            </div>

            <div className="packs">
              {packs.map(function(pack) {
                var isbuying = purchasing === pack.key;
                var isSel = selected === pack.key;
                return (
                  <div key={pack.key}
                    className={'pk' + (isSel ? ' sel' : '')}
                    onClick={function() { setSelected(pack.key); }}>
                    <div className="nm">{pack.label}</div>
                    <div className="pr">${pack.price}</div>
                    <div className="cr">{(pack.credits || 0).toLocaleString()} {t('creditMatrix.credits', { defaultValue: 'credits' })}</div>
                    <div className="btns" onClick={function(e) { e.stopPropagation(); }}>
                      {/* Self-custody BSC pay link — renders its own button; only
                          active once a wallet is connected (context-driven). */}
                      <Suspense fallback={<button className="buy" disabled>…</button>}>
                        <WalletPayLink
                          productType="credit_matrix"
                          productKey={'credit_matrix_' + pack.key}
                          label={t('creditMatrix.buyPack', { defaultValue: 'Buy pack' })}
                          style={{
                            width: '100%', padding: '10px', border: 'none', borderRadius: 10,
                            background: C.red, color: '#fff', fontSize: 13, fontWeight: 800,
                            fontFamily: "'Inter',sans-serif", cursor: 'pointer',
                          }}
                        />
                      </Suspense>
                      {/* NOWPayments (USDT invoice) fallback — always available. */}
                      <button className="card" disabled={isbuying}
                        onClick={function() { buyPack(pack.key); }}>
                        {isbuying ? t('creditMatrix.processing', { defaultValue: 'Processing…' }) : t('creditMatrix.payCrypto', { defaultValue: 'Pay with USDT' })}
                      </button>
                      {stripeReady && (
                        <button className="card" disabled={isbuying}
                          onClick={function() { buyPackWithCard(pack.key); }}>
                          {t('creditMatrix.payCard', { defaultValue: 'Pay by card' })}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pay">
              <div className="ic">₿</div>
              <div>{t('creditMatrix.payNoteA', { defaultValue: 'Pay by card or crypto (USDT on BSC).' })} <b>{t('creditMatrix.payNoteB', { defaultValue: 'Credits land in your balance instantly once payment confirms.' })}</b></div>
            </div>

            <h2>{t('creditMatrix.yourA', { defaultValue: 'Your' })} <span className="r">{t('creditMatrix.yourB', { defaultValue: 'purchases' })}</span></h2>
            <div className="sub">{t('creditMatrix.yourSub', { defaultValue: "Credit packs you've bought." })}</div>
            <div className="card2">
              {purchases.length === 0 && (
                <div className="empty">{t('creditMatrix.noPurchases', { defaultValue: 'No purchases yet — buy a pack above to start creating.' })}</div>
              )}
              {purchases.map(function(p, i) {
                return (
                  <div key={i} className="hrow">
                    <div>
                      <div className="hp">{p.pack_label || p.pack || p.label}</div>
                      <div className="hd">{p.date ? new Date(p.date).toLocaleDateString() : ''}{p.credits ? ' · ' + Number(p.credits).toLocaleString() + ' ' + t('creditMatrix.credits', { defaultValue: 'credits' }) : ''}</div>
                    </div>
                    <div className="ha">${Number(p.price || p.amount || 0).toFixed(0)}</div>
                  </div>
                );
              })}
            </div>

          </div>
          {consentModal}
        </AppLayout>
      </WalletConnectProvider>
    </Suspense>
  );
}
