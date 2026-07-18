import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useConsentGate } from '../components/PurchaseConsentModal';

// AL palette — navy structure, red action. Packs are one product in graded
// sizes, so they share one navy treatment.
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
  var [selected, setSelected] = useState(null);      // pack_key
  var [method, setMethod] = useState('card');         // 'card' | 'usdt'
  var [stripeReady, setStripeReady] = useState(false);
  var [busy, setBusy] = useState(false);
  var [message, setMessage] = useState(null);
  // direct-USDT state
  var [nets, setNets] = useState([]);
  var [curNet, setCurNet] = useState(null);
  var [amount, setAmount] = useState(null);
  var [txHash, setTxHash] = useState('');
  var [verifying, setVerifying] = useState(false);
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

  // Stripe Checkout returns here after a card purchase (?activated={pack_key}).
  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('activated')) {
      setMessage({ type: 'success', text: t('creditMatrix.cardSuccess', { defaultValue: 'Payment received — your credits have been added to your balance.' }) });
      window.history.replaceState({}, '', window.location.pathname);
      loadAll();
    }
  }, []);

  // Card availability (one-time payments gate).
  useEffect(function() {
    apiGet('/api/stripe/status')
      .then(function(d) { if (d && (d.configured_for_payments === true || d.configured === true)) setStripeReady(true); })
      .catch(function() {});
  }, []);

  // When USDT is chosen (or the pack changes while on USDT), load the networks
  // + this pack's amount from the direct-info endpoint.
  useEffect(function() {
    if (method !== 'usdt' || !selected) return;
    setNets([]); setCurNet(null); setAmount(null); setTxHash('');
    apiGet('/api/credit-matrix/direct-info?pack_key=' + encodeURIComponent(selected))
      .then(function(d) {
        if (d && d.networks && d.networks.length) {
          setNets(d.networks); setCurNet(d.networks[0]); setAmount(d.amount);
        } else {
          setMessage({ type: 'error', text: t('creditMatrix.cryptoUnavail', { defaultValue: 'Direct USDT is being set up — please use card for now.' }) });
        }
      })
      .catch(function() { setMessage({ type: 'error', text: t('creditMatrix.cryptoUnavail', { defaultValue: 'Direct USDT is being set up — please use card for now.' }) }); });
  }, [method, selected]);

  async function payByCard() {
    if (!selected) return;
    var consented = await ensureConsent();
    if (!consented) return;
    setBusy(true); setMessage(null);
    apiPost('/api/stripe/checkout/nexus-pack', { pack_key: selected })
      .then(function(r) {
        setBusy(false);
        if (r.checkout_url) { window.location.href = r.checkout_url; }
        else { setMessage({ type: 'error', text: r.error || t('creditMatrix.cardUnavailable', { defaultValue: 'Card checkout unavailable — try USDT.' }) }); }
      })
      .catch(function(e) { setBusy(false); setMessage({ type: 'error', text: e.message || t('creditMatrix.cardFailed', { defaultValue: 'Card checkout failed' }) }); });
  }

  async function verifyUsdt() {
    if (!selected || !curNet) return;
    var tx = (txHash || '').trim();
    if (!tx) { setMessage({ type: 'error', text: t('creditMatrix.needTx', { defaultValue: 'Paste your transaction hash first.' }) }); return; }
    var consented = await ensureConsent();
    if (!consented) return;
    setVerifying(true); setMessage(null);
    apiPost('/api/credit-matrix/direct', { pack_key: selected, network: curNet.key, tx_ref: tx })
      .then(function(r) {
        if (r.ok && r.credited) {
          setVerifying(false);
          setMessage({ type: 'success', text: (r.credits_awarded || 0).toLocaleString() + ' ' + t('creditMatrix.creditsAwarded', { defaultValue: 'credits added to your balance.' }) });
          setTxHash('');
          loadAll();
        } else if (r.retryable) {
          // on-chain not settled yet — keep the spinner and retry
          setMessage({ type: 'success', text: t('creditMatrix.confirming', { defaultValue: 'Confirming on-chain…' }) + ' (' + (r.error || '') + ')' });
          setTimeout(verifyUsdt, 6000);
        } else {
          setVerifying(false);
          setMessage({ type: 'error', text: r.error || t('creditMatrix.verifyFailed', { defaultValue: 'Could not verify that transaction.' }) });
        }
      })
      .catch(function(e) { setVerifying(false); setMessage({ type: 'error', text: e.message || t('creditMatrix.verifyFailed', { defaultValue: 'Verification failed' }) }); });
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
    .cx .packs{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px;}
    .cx .pk{position:relative;border-radius:15px;padding:18px 16px;text-align:center;cursor:pointer;background:linear-gradient(150deg,${C.navy},${C.navy2});color:#fff;border:2px solid transparent;box-shadow:0 12px 30px -16px rgba(10,31,82,.55);transition:transform .14s,box-shadow .14s,border-color .14s;}
    .cx .pk:hover{transform:translateY(-3px);box-shadow:0 20px 44px -18px rgba(10,31,82,.7);}
    .cx .pk.sel{border-color:${C.red};box-shadow:0 20px 46px -14px rgba(200,16,46,.7);}
    .cx .pk .nm{font-size:13px;font-weight:800;color:#a9bbf0;letter-spacing:.02em;}
    .cx .pk .pr{font-family:${C.mono};font-weight:700;font-size:26px;letter-spacing:-1.5px;margin:6px 0 3px;}
    .cx .pk .cr{font-size:12px;font-weight:700;color:#c3d0f0;}
    .cx .checkout{border:1.5px solid ${C.line};border-radius:16px;padding:22px 24px;margin-bottom:26px;box-shadow:0 10px 30px -22px rgba(10,31,82,.4);}
    .cx .selbar{background:linear-gradient(150deg,${C.navy},${C.navy2});border-radius:14px;padding:16px 20px;color:#fff;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
    .cx .selbar .nm{font-size:11px;font-weight:800;color:#a9bbf0;letter-spacing:.05em;text-transform:uppercase;}
    .cx .selbar .crd{font-size:13px;font-weight:700;color:#c3d0f0;margin-top:2px;}
    .cx .selbar .pr{font-family:${C.mono};font-weight:700;font-size:26px;letter-spacing:-1.5px;}
    .cx .methods{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;}
    .cx .m{border:2px solid ${C.line};border-radius:14px;padding:15px;text-align:center;cursor:pointer;transition:.14s;background:#fff;}
    .cx .m.on{border-color:${C.red};background:#fdf2f4;}
    .cx .m .mic{width:36px;height:36px;border-radius:10px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:17px;color:#fff;}
    .cx .m.card .mic{background:linear-gradient(135deg,${C.navy2},${C.navy});}
    .cx .m.usdt .mic{background:linear-gradient(135deg,#0b7a3e,#0a6836);}
    .cx .m .mt{font-weight:800;font-size:14px;}
    .cx .m .md{font-size:11px;color:${C.dim};font-weight:600;margin-top:2px;}
    .cx .btn{width:100%;border:0;border-radius:12px;padding:15px;font-family:'Inter',sans-serif;font-weight:800;font-size:15px;cursor:pointer;color:#fff;}
    .cx .btn.red{background:linear-gradient(135deg,${C.red},#e8203f);box-shadow:0 12px 26px -12px rgba(200,16,46,.7);}
    .cx .btn:disabled{opacity:.6;cursor:wait;}
    .cx .netchips{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
    .cx .chip{padding:9px 14px;border:2px solid ${C.line};border-radius:10px;font-weight:800;font-size:12.5px;cursor:pointer;background:#fff;color:${C.navy};}
    .cx .chip.on{border-color:${C.red};background:${C.red};color:#fff;}
    .cx .amt{display:flex;align-items:baseline;gap:8px;margin-bottom:12px;}
    .cx .amt .ak{font-size:13px;color:${C.dim};font-weight:700;}
    .cx .amt .av{font-family:${C.mono};font-weight:700;font-size:20px;color:${C.navy};}
    .cx .addr{background:#f6f8fc;border:1.5px solid ${C.line};border-radius:11px;padding:13px 15px;margin-bottom:10px;}
    .cx .addr .ak{font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:${C.dim};margin-bottom:5px;}
    .cx .addr .av{font-family:${C.mono};font-size:12px;color:${C.navy};word-break:break-all;font-weight:700;}
    .cx .cwarn{font-size:11px;font-weight:700;color:#7a5a10;background:#fff8e9;border:1px solid #f2dfae;border-radius:9px;padding:9px 11px;line-height:1.5;margin-bottom:12px;}
    .cx .cstep{font-size:12.5px;color:${C.dim};font-weight:600;line-height:1.55;margin-bottom:12px;}
    .cx .cstep b{color:${C.ink};}
    .cx input.tx{width:100%;border:2px solid ${C.line};border-radius:11px;padding:13px;font-family:${C.mono};font-size:12px;margin-bottom:12px;outline:none;}
    .cx input.tx:focus{border-color:${C.red};}
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
  var selPack = packs.find(function(p) { return p.key === selected; });

  return (
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

        <div className="packs">
          {packs.map(function(pack) {
            return (
              <div key={pack.key}
                className={'pk' + (selected === pack.key ? ' sel' : '')}
                onClick={function() { setSelected(pack.key); }}>
                <div className="nm">{pack.label}</div>
                <div className="pr">${pack.price}</div>
                <div className="cr">{(pack.credits || 0).toLocaleString()} {t('creditMatrix.credits', { defaultValue: 'credits' })}</div>
              </div>
            );
          })}
        </div>

        {selPack && (
          <div className="checkout">
            <div className="selbar">
              <div>
                <div className="nm">{selPack.label} {t('creditMatrix.pack', { defaultValue: 'pack' })}</div>
                <div className="crd">{(selPack.credits || 0).toLocaleString()} {t('creditMatrix.credits', { defaultValue: 'credits' })}</div>
              </div>
              <div className="pr">${selPack.price}</div>
            </div>

            <div className="methods">
              <div className={'m card' + (method === 'card' ? ' on' : '')} onClick={function() { setMethod('card'); }}>
                <div className="mic">💳</div>
                <div className="mt">{t('creditMatrix.payCard', { defaultValue: 'Pay by card' })}</div>
                <div className="md">{t('creditMatrix.viaStripe', { defaultValue: 'Instant, via Stripe' })}</div>
              </div>
              <div className={'m usdt' + (method === 'usdt' ? ' on' : '')} onClick={function() { setMethod('usdt'); }}>
                <div className="mic">₮</div>
                <div className="mt">{t('creditMatrix.directUsdt', { defaultValue: 'Direct USDT' })}</div>
                <div className="md">{t('creditMatrix.toOurWallet', { defaultValue: 'To our wallet' })}</div>
              </div>
            </div>

            {method === 'card' && (
              <button className="btn red" disabled={busy || !stripeReady} onClick={payByCard}>
                {!stripeReady
                  ? t('creditMatrix.cardSetup', { defaultValue: 'Card payments are being set up — use USDT' })
                  : busy
                    ? t('creditMatrix.opening', { defaultValue: 'Opening secure checkout…' })
                    : t('creditMatrix.payAmountCard', { amount: selPack.price, defaultValue: 'Pay $' + selPack.price + ' by card →' })}
              </button>
            )}

            {method === 'usdt' && (
              <div>
                <div className="netchips">
                  {nets.map(function(n) {
                    return (
                      <div key={n.key} className={'chip' + (curNet && curNet.key === n.key ? ' on' : '')}
                        onClick={function() { setCurNet(n); }}>{n.label}</div>
                    );
                  })}
                  {nets.length === 0 && <div style={{ fontSize: 12.5, color: C.dim, fontWeight: 600 }}>{t('creditMatrix.loadingNets', { defaultValue: 'Loading networks…' })}</div>}
                </div>
                {curNet && (
                  <>
                    <div className="amt">
                      <span className="ak">{t('creditMatrix.sendExactly', { defaultValue: 'Send exactly' })}</span>
                      <span className="av">{amount != null ? Number(amount).toFixed(2) : selPack.price + '.00'} USDT</span>
                    </div>
                    <div className="addr">
                      <div className="ak">{t('creditMatrix.toAddress', { defaultValue: 'To this address' })} ({curNet.label})</div>
                      <div className="av">{curNet.address}</div>
                    </div>
                    <div className="cwarn">⚠ {t('creditMatrix.netWarn', { network: curNet.label, defaultValue: 'Send USDT on the ' + curNet.label + ' network only. Sending on the wrong network or a different coin will lose the funds.' })}</div>
                    <div className="cstep"><b>1.</b> {t('creditMatrix.step1', { defaultValue: 'Send the exact amount from Binance (or any wallet) to the address above.' })} <b>2.</b> {t('creditMatrix.step2', { defaultValue: "Paste your transaction hash below and we'll verify it on-chain and credit you instantly." })}</div>
                    <input className="tx" value={txHash} onChange={function(e) { setTxHash(e.target.value); }}
                      placeholder={t('creditMatrix.txPlaceholder', { defaultValue: 'Paste your transaction hash (0x…)' })} />
                    <button className="btn red" disabled={verifying} onClick={verifyUsdt}>
                      {verifying ? t('creditMatrix.verifyingBtn', { defaultValue: 'Verifying on-chain…' }) : t('creditMatrix.verifyBtn', { defaultValue: "I've paid — verify & add credits →" })}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

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
  );
}
