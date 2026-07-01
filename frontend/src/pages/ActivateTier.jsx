import { useTranslation } from 'react-i18next';
import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { Globe } from 'lucide-react';
import { useConsentGate } from '../components/PurchaseConsentModal';

// Lazy-load self-custody payment components (~1MB gz Reown/wagmi chunk)
var _wcModule = null;
function _loadWC() { if (!_wcModule) _wcModule = import('../components/WalletConnect'); return _wcModule; }
var WalletConnectProvider = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectProvider }; }); });
var WalletConnectGate = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectGate }; }); });
var WalletPayLink = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletPayLink }; }); });

const TIERS = {
  1: { name:'Starter',     price:20,   views:'2,000',     monthly:'500',    bonus:64,   grad:'linear-gradient(135deg,#064e3b,#047857,#10b981)' },
  2: { name:'Builder',     price:50,   views:'4,000',     monthly:'1,500',  bonus:160,  grad:'linear-gradient(135deg,#1e3a5f,#2563eb,#3b82f6)' },
  3: { name:'Pro',         price:100,  views:'8,000',     monthly:'5,000',  bonus:320,  grad:'linear-gradient(135deg,#172554,#4c1d95,#8b5cf6)' },
  4: { name:'Advanced',    price:200,  views:'15,000',    monthly:'10,000', bonus:640,  grad:'linear-gradient(135deg,#831843,#be185d,#ec4899)' },
  5: { name:'Premium',     price:400,  views:'30,000',    monthly:'20,000', bonus:1280, grad:'linear-gradient(135deg,#134e4a,#0d9488,#2dd4bf)' },
  6: { name:'Elite',       price:600,  views:'50,000',    monthly:'30,000', bonus:1920, grad:'linear-gradient(135deg,#6b7280,#9ca3af,#d1d5db)' },
  7: { name:'Master',      price:800,  views:'80,000',    monthly:'40,000', bonus:2560, grad:'linear-gradient(135deg,#78350f,#b45309,#fbbf24)' },
  8: { name:'Champion',    price:1000, views:'120,000',   monthly:'50,000', bonus:3200, grad:'linear-gradient(135deg,#450a0a,#991b1b,#ef4444)' },
};

// Illustrative 16-seat fill for the summary grid (cyan = direct, amber = team).
const SEATS = ['d','i','i','d','i','d','i','i','i','i','d','i','d','i','i','i'];

// Shared style for the WalletConnect rail buttons so they sit as equal-weight
// outline siblings next to the card + NOWPayments options. restShadow/
// hoverShadow are passed to the Gate so its hover doesn't flip to the
// component-default orange (added as optional props, orange stays default
// for every other page).
const WALLET_BTN_STYLE = {
  width: '100%', minHeight: 64, padding: '14px 22px', borderRadius: 14,
  background: '#fff', color: '#0a1438', border: '1.5px solid #e2e8f0',
  fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 14,
  textAlign: 'left',
  boxShadow: '0 8px 20px -14px rgba(12,26,56,.3)', marginBottom: 11,
};

// Matches the .at-btn card/crypto layout: 38x38 icon box + stacked title/subtitle,
// left-aligned. Passed as the JSX `label` to the wallet buttons so all four
// payment options line up identically. (.at-btn .ic/.tx CSS is scoped to
// .at-btn, so the styles are inlined here to apply on the wallet buttons.)
function _walletBtnLabel(icon, title, sub) {
  return (
    <>
      <div style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', flex: 'none', fontSize: 19, background: '#eef4ff' }}>{icon}</div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, textAlign: 'left' }}>
        <b style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 16 }}>{title}</b>
        <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', marginTop: 2, opacity: .6 }}>{sub}</span>
      </div>
    </>
  );
}

const AT_CSS = `
.at-wrap{max-width:680px;margin:0 auto;font-family:'DM Sans',sans-serif}
.at-card{background:#fff;border:1px solid rgba(12,26,56,.09);border-radius:24px;box-shadow:0 18px 44px -22px rgba(12,26,56,.3);position:relative;overflow:hidden}
.at-card::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,#1e3a8a,#0ea5e9,#22d3ee)}
.at-sum{padding:30px 32px 26px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}
.at-eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#0ea5e9;font-weight:600}
.at-name{font-family:'Sora',sans-serif;font-weight:700;font-size:23px;color:#0a1438;margin-top:6px}
.at-price{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(40px,7vw,52px);color:#0a1438;line-height:1;margin-top:4px}
.at-sub{font-size:13.5px;color:#64748b;margin-top:8px;font-weight:500}
.at-facts{display:flex;gap:22px;margin-top:16px;flex-wrap:wrap}
.at-fact .l{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8;font-weight:600}
.at-fact .v{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;color:#1e3a8a;margin-top:2px}
.at-viz{display:flex;flex-direction:column;align-items:center;gap:9px}
.at-seats{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;width:120px}
.at-seat{aspect-ratio:1;border-radius:5px}
.at-seat.d{background:linear-gradient(135deg,#0ea5e9,#22d3ee);box-shadow:0 5px 14px -7px rgba(34,211,238,.85)}
.at-seat.i{background:linear-gradient(135deg,#f59e0b,#fbbf24);box-shadow:0 5px 14px -7px rgba(245,158,11,.55)}
.at-viz-cap{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:#94a3b8;letter-spacing:.04em;text-align:center;line-height:1.5}
.at-pay{padding:26px 32px 30px}
.at-pay-h{font-family:'Sora',sans-serif;font-weight:700;font-size:16px;color:#0a1438;margin-bottom:16px}
.at-btn{display:flex;align-items:center;gap:14px;width:100%;min-height:64px;padding:14px 22px;border-radius:14px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;text-align:left;transition:transform .15s,box-shadow .15s;margin-bottom:11px}
.at-btn:hover{transform:translateY(-2px)}
.at-btn:disabled{cursor:wait;opacity:.85}
.at-btn.busy{justify-content:center}
.at-btn .ic{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;flex:none;font-size:19px}
.at-btn .tx{display:flex;flex-direction:column;line-height:1.25}
.at-btn .tx b{font-family:'Sora',sans-serif;font-weight:700;font-size:16px}
.at-btn .tx span{font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-top:2px;opacity:.8}
.at-btn-card{background:linear-gradient(92deg,#1e3a8a,#0ea5e9);color:#fff;box-shadow:0 18px 40px -20px rgba(14,165,233,.65)}
.at-btn-card .ic{background:rgba(255,255,255,.18)}
.at-btn-card .at-spin{border-color:rgba(255,255,255,.4);border-top-color:#fff}
.at-btn-crypto{background:#fff;color:#0a1438;border:1.5px solid #e2e8f0;box-shadow:0 8px 20px -14px rgba(12,26,56,.3)}
.at-btn-crypto:hover{border-color:#22d3ee;box-shadow:0 12px 26px -14px rgba(34,211,238,.45)}
.at-btn-crypto .ic{background:#ecfeff;color:#0891b2}
.at-btn-crypto .tx span{color:#64748b}
.at-divider{display:flex;align-items:center;gap:12px;margin:16px 0 14px}
.at-divider::before,.at-divider::after{content:"";flex:1;height:1px;background:#e2e8f0}
.at-divider span{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;font-weight:600}
.at-trust{text-align:center;font-size:12.5px;color:#64748b;line-height:1.7;margin-top:14px}
.at-err{padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;margin-bottom:14px;font-size:13px;font-weight:600;color:#b91c1c;text-align:center}
.at-refund{padding:11px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin:18px 0 16px;font-size:12px;color:#92400e;line-height:1.55;text-align:center}
.at-refund a{color:#92400e}
.at-back{text-align:center;display:block;margin-bottom:16px}
.at-back a{font-size:13px;color:#64748b;text-decoration:none}
.at-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:34px;color:#64748b;font-size:14px}
.at-spin{display:inline-block;width:18px;height:18px;border:2.5px solid rgba(12,26,56,.15);border-top-color:#0ea5e9;border-radius:50%;animation:at-spin .8s linear infinite;flex:none}
.at-inflight{padding:26px 32px 28px}
.at-if-eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#0ea5e9;font-weight:600;margin-bottom:8px}
.at-if-h{font-family:'Sora',sans-serif;font-weight:800;font-size:18px;color:#0a1438;margin-bottom:14px;line-height:1.3}
.at-if-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px;font-size:13px;color:#475569;font-weight:600}
.at-if-pct{font-family:'Sora',sans-serif;font-weight:800;font-size:15px;color:#0ea5e9}
.at-if-bar{height:8px;background:#e8eef7;border-radius:99px;overflow:hidden}
.at-if-bar>div{height:100%;background:linear-gradient(90deg,#0ea5e9,#22d3ee);border-radius:99px;transition:width .5s}
.at-if-note{font-size:13px;color:#64748b;line-height:1.6;margin-top:14px}
.at-if-link{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:54px;border-radius:14px;font-family:'Sora',sans-serif;font-size:14px;font-weight:700;text-decoration:none;background:linear-gradient(92deg,#1e3a8a,#0ea5e9);color:#fff;margin-top:16px;box-shadow:0 18px 40px -20px rgba(14,165,233,.6)}
@keyframes at-spin{to{transform:rotate(360deg)}}
@media(max-width:560px){.at-sum{grid-template-columns:1fr}.at-viz{order:-1;flex-direction:row;justify-content:flex-start}}
`;

export default function ActivateTier() {
  var { t } = useTranslation();
  const { tierId } = useParams();
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  // 23 May 2026: Stripe availability — drives whether the 'Pay with card'
  // button shows on this tier purchase screen. Reads /api/stripe/status
  // on mount.
  const [stripeReady, setStripeReady] = useState(false);
  // inFlight: { views_delivered, views_target } if user has an active
  // campaign at this tier whose views haven't been fully delivered yet.
  // null = no in-flight campaign, can purchase. Loaded on mount.
  const [inFlight, setInFlight] = useState(null);
  const [stateLoaded, setStateLoaded] = useState(false);

  // Purchase consent gate — see app/purchase_consent.py.
  // Activating a tier triggers immediate, irreversible commission
  // payouts to sponsor + uplines + completion bonus pool, so this is
  // the most important place the gate must run.
  const { ensureConsent, consentModal } = useConsentGate();

  const n = parseInt(tierId);
  const tier = TIERS[n];

  useEffect(function() {
    var cancelled = false;
    fetch('/api/campaign-tiers', { credentials: 'include' })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (cancelled || !data || !data.tiers) {
          if (!cancelled) setStateLoaded(true);
          return;
        }
        var entry = data.tiers.find(function(t) { return t.tier === n; });
        if (entry && entry.campaign_progress) {
          var p = entry.campaign_progress;
          // Only treat as in-flight if there's actually a target and not all delivered
          if (p.views_target > 0 && p.views_delivered < p.views_target) {
            setInFlight(p);
          }
        }
        setStateLoaded(true);
      })
      .catch(function() { if (!cancelled) setStateLoaded(true); });
    return function() { cancelled = true; };
  }, [n]);

  // 23 May 2026: check Stripe availability for the 'Pay with card' button.
  useEffect(function() {
    fetch('/api/stripe/status', { credentials: 'include' })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) { if (d && d.configured === true) setStripeReady(true); })
      .catch(function() { /* leave card button hidden on failure */ });
  }, []);

  if (!t) return <AppLayout title={t('campaignTiers.campaignTierTitle')}><div style={{textAlign:'center',padding:80,color:'var(--sap-text-muted)'}}>{t('campaignTiers.invalidTier')}</div></AppLayout>;

  const handleStripeCard = async () => {
    if (paying) return;
    // Same consent gate as the crypto rail — tier activation triggers
    // immediate commission payouts.
    const consented = await ensureConsent();
    if (!consented) return;

    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/checkout/campaign-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier_id: n }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.error || 'Card checkout unavailable. Please try crypto.');
        setPaying(false);
      }
    } catch (e) {
      setError('Connection error. Please try again.');
      setPaying(false);
    }
  };

  const handleNowPayments = async () => {
    if (paying) return;

    // Consent gate FIRST. Tier activation triggers immediate
    // commission payouts that cannot be reversed once on-chain — this
    // is exactly the irreversibility scenario the no-refund terms
    // exist for. If user cancels, abort silently.
    const consented = await ensureConsent();
    if (!consented) return;

    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/nowpayments/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product_key: 'grid_' + n }),
      });
      const data = await res.json();
      if (data.invoice_url) {
        window.location.href = data.invoice_url;
      } else {
        setError(data.error || 'Payment service unavailable. Please try again.');
        setPaying(false);
      }
    } catch (e) {
      setError('Connection error. Please try again.');
      setPaying(false);
    }
  };

  // Launchpad (tier 0) — and any tier not in the hardcoded TIERS map — lands
  // here. The activate screen + NOWPayments/crypto rails were only ever wired
  // for tiers 1-8; rendering tier.name on an undefined tier white-screened the
  // page ("Cannot read properties of undefined (reading 'name')"). Fail safe
  // with a graceful message until the tier is fully wired end-to-end.
  if (!tier) {
    return (
      <AppLayout title="Activate Campaign Tier" subtitle="">
        <div style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', padding: '32px 24px', background: '#fff', border: '1px solid rgba(12,26,56,.1)', borderRadius: 16 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 8 }}>This tier isn&apos;t available to activate yet</div>
          <div style={{ fontSize: 14, color: 'var(--sap-text-secondary)', marginBottom: 20 }}>Please choose another campaign tier.</div>
          <Link to="/campaign-tiers" style={{ display: 'inline-block', fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14, color: '#fff', background: 'linear-gradient(92deg,#1e3a8a,#0ea5e9)', padding: '12px 22px', borderRadius: 10, textDecoration: 'none' }}>Back to tiers</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <Suspense fallback={
      <AppLayout title={`Activate ${tier.name}`} subtitle={t('campaignTiers.reviewTier')}>
        <div />
      </AppLayout>
    }>
    <WalletConnectProvider onBeforeClick={async function() { return await ensureConsent(); }}>
    <AppLayout
      title={`Activate ${tier.name}`}
      subtitle={t('campaignTiers.reviewTier')}
    >
      <style>{AT_CSS}</style>
      <div className="at-wrap">

        {/* ── Tier summary ── */}
        <div className="at-card" style={{ marginBottom: 18 }}>
          <div className="at-sum">
            <div>
              <div className="at-eyebrow">{t('campaignTiers.campaignTierLabel')}</div>
              <div className="at-name">{tier.name}</div>
              <div className="at-price">${tier.price.toLocaleString()}</div>
              <div className="at-sub">One-time activation · up to {tier.views} views</div>
              <div className="at-facts">
                <div className="at-fact"><div className="l">Completion bonus</div><div className="v">${tier.bonus.toLocaleString()}</div></div>
                <div className="at-fact"><div className="l">Monthly views</div><div className="v">{tier.monthly}</div></div>
                <div className="at-fact"><div className="l">Grid</div><div className="v">16 seats</div></div>
              </div>
            </div>
            <div className="at-viz">
              <div className="at-seats">{SEATS.map(function (s, i) { return <div key={i} className={'at-seat ' + s}></div>; })}</div>
              <div className="at-viz-cap">YOUR GRID<br />cyan direct · amber team</div>
            </div>
          </div>
        </div>

        {error && <div className="at-err">{error}</div>}

        {!stateLoaded ? (
          <div className="at-card">
            <div className="at-loading"><span className="at-spin" /> Checking your campaign status…</div>
          </div>
        ) : inFlight ? (
          <div className="at-card">
            <div className="at-inflight">
              <div className="at-if-eyebrow">Already active · Tier {n}</div>
              <div className="at-if-h">Your {tier.name} campaign is delivering views</div>
              <div className="at-if-row">
                <span>{(inFlight.views_delivered || 0).toLocaleString()} / {(inFlight.views_target || 0).toLocaleString()} views delivered</span>
                <span className="at-if-pct">{Math.round((inFlight.views_delivered / inFlight.views_target) * 100)}%</span>
              </div>
              <div className="at-if-bar"><div style={{ width: Math.min(100, Math.round((inFlight.views_delivered / inFlight.views_target) * 100)) + '%' }} /></div>
              <div className="at-if-note">Once your campaign delivers all {(inFlight.views_target || 0).toLocaleString()} views, you'll be able to purchase Tier {n} again.</div>
              <Link to="/video-library" className="at-if-link">View My Campaigns →</Link>
            </div>
          </div>
        ) : (
          <div className="at-card">
            <div className="at-pay">
              <div className="at-pay-h">Choose how to pay</div>

              {stripeReady && (
                <button className={'at-btn at-btn-card' + (paying ? ' busy' : '')} onClick={handleStripeCard} disabled={paying}>
                  {paying ? (
                    <><span className="at-spin" /><span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700 }}>Redirecting to secure checkout…</span></>
                  ) : (
                    <><div className="ic">💳</div><div className="tx"><b>{`Pay $${tier.price.toLocaleString()}`}</b><span>Debit or credit card</span></div></>
                  )}
                </button>
              )}

              {stripeReady && <div className="at-divider"><span>or pay with crypto</span></div>}

              <Suspense fallback={null}>
                <WalletConnectGate
                  hideWhenConnected
                  label={(
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, textAlign: 'left' }}>
                      <b style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 16 }}>{`Connect wallet — $${tier.price.toLocaleString()}`}</b>
                      <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', marginTop: 2, opacity: .6 }}>Pay direct · BSC</span>
                    </div>
                  )}
                  restShadow="0 8px 20px -14px rgba(12,26,56,.3)"
                  hoverShadow="0 12px 26px -14px rgba(34,211,238,.45)"
                  style={WALLET_BTN_STYLE}
                />
                <WalletPayLink
                  productType="grid"
                  productKey={'grid_' + n}
                  label={_walletBtnLabel('👛', `Pay $${tier.price.toLocaleString()} from your wallet`, 'Direct · USDT on BSC')}
                  style={WALLET_BTN_STYLE}
                />
              </Suspense>

              <button className={'at-btn at-btn-crypto' + (paying ? ' busy' : '')} onClick={handleNowPayments} disabled={paying}>
                {paying ? (
                  <><span className="at-spin" /><span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700 }}>Creating your secure invoice…</span></>
                ) : (
                  <><div className="ic"><Globe size={19} /></div><div className="tx"><b>{`Pay $${tier.price.toLocaleString()} with crypto`}</b><span>350+ coins · USDT, BTC, ETH</span></div></>
                )}
              </button>

              <div className="at-trust">🔒 Secure checkout · instant activation once payment confirms</div>
            </div>
          </div>
        )}

        <div className="at-refund">
          <strong>Refunds:</strong> Commissions are paid instantly to other members on purchase. Card payments can be partially refunded within 7 days (the 5% company portion only). Crypto payments are final. See <a href="/refund-policy" target="_blank" rel="noreferrer">refund policy</a> for details.
        </div>

        <div className="at-back">
          <Link to="/campaign-tiers">{t('campaignTiers.backToTiers')}</Link>
        </div>
      </div>
      {consentModal}
    </AppLayout>
    </WalletConnectProvider>
    </Suspense>
  );
}
