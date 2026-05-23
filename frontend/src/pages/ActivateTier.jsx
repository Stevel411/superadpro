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
      <div style={{maxWidth:700,margin:'0 auto'}}>

        {/* Tier hero — dark theme with animations */}
        <div style={{
          background:tier.grad,
          borderRadius:8, padding:'32px 36px', marginBottom:20,
          position:'relative', overflow:'hidden',
          boxShadow:'0 2px 8px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15)',
        }}>
          <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,.08)',pointerEvents:'none'}}/>

          <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
            <div style={{fontSize:12,fontWeight:700,color:n===6?'rgba(0,0,0,0.4)':'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:8}}>{t('campaignTiers.campaignTierLabel')}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:n===6?'#1f2937':'#fff',marginBottom:4}}>{tier.name}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:48,fontWeight:900,color:n===6?'#1f2937':'#fff',lineHeight:1,marginBottom:8}}>${tier.price.toLocaleString()}</div>
            <div style={{fontSize:13,color:n===6?'rgba(0,0,0,0.4)':'rgba(255,255,255,0.5)'}}>One-time activation · Up to {t.views} views</div>
          </div>
        </div>

        {/* PAY BUTTONS */}
        {error && (
          <div style={{padding:'12px 16px',background:'var(--sap-red-bg)',border:'1px solid #fecaca',borderRadius:10,marginBottom:12,fontSize:13,fontWeight:600,color:'var(--sap-red)'}}>{error}</div>
        )}

        {!stateLoaded ? (
          // Brief loading skeleton while we check campaign state. Avoids flash
          // of the buy button before we know whether the user already has an
          // in-flight campaign at this tier.
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:30, marginBottom:20, color:'var(--sap-text-muted)', fontSize:14 }}>
            <span style={{ display:'inline-block', width:18, height:18, border:'2.5px solid rgba(0,0,0,.15)', borderTopColor:'var(--sap-accent)', borderRadius:'50%', animation:'sap-spin 0.8s linear infinite', marginRight:10 }}/>
            Checking your campaign status…
            <style>{'@keyframes sap-spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        ) : inFlight ? (
          // ── In-flight campaign at this tier — repurchase blocked ──
          // The member already paid for this tier and views are still being
          // delivered. Showing them progress (rather than a flat refusal)
          // gives them a clear sense of how close they are to being able to
          // purchase again.
          <div style={{ marginBottom:20 }}>
            <div style={{
              padding:'24px 24px 22px',
              background:'linear-gradient(135deg, var(--sap-cobalt-deep), var(--sap-cobalt-mid))',
              borderRadius:14,
              color:'#fff',
              boxShadow:'0 8px 32px rgba(30,58,138,0.35)',
              marginBottom:14,
            }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:6 }}>
                Already Active · Tier {n}
              </div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#fff', marginBottom:12, lineHeight:1.3 }}>
                Your {tier.name} campaign is delivering views
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,0.85)', fontWeight:600 }}>
                    {(inFlight.views_delivered || 0).toLocaleString()} / {(inFlight.views_target || 0).toLocaleString()} views delivered
                  </span>
                  <span style={{ fontSize:14, fontWeight:800, color:'var(--sap-amber-bright)' }}>
                    {Math.round((inFlight.views_delivered / inFlight.views_target) * 100)}%
                  </span>
                </div>
                <div style={{ height:8, background:'rgba(255,255,255,0.12)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{
                    height:'100%',
                    width: Math.min(100, Math.round((inFlight.views_delivered / inFlight.views_target) * 100)) + '%',
                    background:'linear-gradient(90deg, var(--sap-amber-bright), #fbbf24)',
                    transition:'width 0.4s ease',
                  }}/>
                </div>
              </div>

              <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.6, marginTop:14 }}>
                Once your campaign delivers all {(inFlight.views_target || 0).toLocaleString()} views, you'll be able to purchase Tier {n} again.
              </div>
            </div>

            <Link to="/video-library" style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              width:'100%', padding:'14px 18px', borderRadius:12,
              fontSize:14, fontWeight:700, textDecoration:'none',
              background:'#fff', color:'var(--sap-accent)',
              border:'1.5px solid #e2e8f0',
              transition:'all 0.2s',
            }}
              onMouseOver={function(e){ e.currentTarget.style.borderColor='var(--sap-accent)'; }}
              onMouseOut={function(e){ e.currentTarget.style.borderColor='#e2e8f0'; }}
            >
              View My Campaigns →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {/* 23 May 2026: Pay with card — Stripe Checkout. Positioned
                first because it's the most familiar option for prospects.
                Hidden when Stripe isn't configured. */}
            {stripeReady && (
              <button onClick={handleStripeCard} disabled={paying} style={{
                display:'flex',alignItems:'center',justifyContent:'center',gap:12,
                width:'100%', padding:'22px 20px', borderRadius:14,
                fontSize:18, fontWeight:800, border:'none', cursor:paying?'wait':'pointer',
                fontFamily:'inherit',
                background: paying
                  ? 'linear-gradient(135deg,#7dd3fc,#38bdf8,#0ea5e9)'
                  : 'linear-gradient(135deg,#38bdf8,#0ea5e9,#0284c7)',
                color:'#fff',
                boxShadow: paying ? '0 4px 0 #075985,0 6px 20px rgba(14,165,233,.2)' : '0 4px 0 #075985,0 6px 24px rgba(14,165,233,.4)',
                letterSpacing:0.3, transition:'all 0.2s',
                opacity: paying ? 0.85 : 1,
              }}>
                {paying ? (
                  <>
                    <span style={{ display:'inline-block', width:18, height:18, border:'2.5px solid rgba(255,255,255,.5)', borderTopColor:'#fff', borderRadius:'50%', animation:'sap-spin 0.8s linear infinite' }}/>
                    <span>Redirecting to secure checkout…</span>
                  </>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{fontSize:22}}>💳</span>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', lineHeight:1.2 }}>
                      <span>{`Pay $${tier.price.toLocaleString()}`}</span>
                      <span style={{ fontSize:11, fontWeight:600, opacity:0.85, letterSpacing:0.5, textTransform:'uppercase', marginTop:2 }}>with debit or credit card</span>
                    </div>
                  </div>
                )}
              </button>
            )}

            {stripeReady && (
              <div style={{ position:'relative', margin:'8px 0', textAlign:'center' }}>
                <div style={{ height:1, background:'#e2e8f0', position:'absolute', left:0, right:0, top:'50%' }}/>
                <span style={{ position:'relative', background:'#fff', padding:'0 12px', fontSize:11, color:'var(--sap-text-muted)', textTransform:'uppercase', letterSpacing:.5, fontWeight:600 }}>or pay with crypto</span>
              </div>
            )}

            {/* Self-custody BSC pay rail.
                Two components, mutually exclusive:
                  - WalletConnectGate (hideWhenConnected): orange Connect
                    button when disconnected, returns null when connected.
                  - WalletPayLink: null when disconnected, Pay button
                    when connected.
                Pattern matches PartnerPayment / PayItForward / GridActivate
                so the wallet rail is self-contained in every payment page
                (topbar Connect button removed 24 May 2026 — members were
                missing it). */}
            <Suspense fallback={null}>
              <WalletConnectGate
                hideWhenConnected
                label={`Connect Wallet — $${tier.price.toLocaleString()}`}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10,
                  border: 'none', fontSize: 14, fontWeight: 800, color: '#fff',
                  background: 'linear-gradient(135deg,#ea580c,#f97316)',
                  boxShadow: '0 4px 14px rgba(249,115,22,.35)',
                  fontFamily: 'Sora, sans-serif',
                }}
              />
              <WalletPayLink
                productType="grid"
                productKey={'grid_' + n}
                label={'Pay $' + tier.price + ' from wallet'}
                style={{ padding: '12px 16px', fontSize: 14, borderRadius: 10 }}
              />
            </Suspense>

            {/* "or" divider */}
            <div style={{ position:'relative', margin:'8px 0', textAlign:'center' }}>
              <div style={{ height:1, background:'#e2e8f0', position:'absolute', left:0, right:0, top:'50%' }}/>
              <span style={{ position:'relative', background:'#fff', padding:'0 12px', fontSize:11, color:'var(--sap-text-muted)', textTransform:'uppercase', letterSpacing:.5, fontWeight:600 }}>or</span>
            </div>

            {/* NOWPayments primary — accepts 350+ cryptos including USDT-TRC20, easiest for new users */}
            <button onClick={handleNowPayments} disabled={paying} style={{
              display:'flex',alignItems:'center',justifyContent:'center',gap:12,
              width:'100%', padding:'22px 20px', borderRadius:14,
              fontSize:18, fontWeight:800, border:'none', cursor:paying?'wait':'pointer',
              fontFamily:'inherit',
              background: paying
                ? 'linear-gradient(135deg,#a78bfa,#8b5cf6,#7c3aed)'
                : 'linear-gradient(135deg,#8b5cf6,#7c3aed,#6d28d9)',
              color:'#fff',
              boxShadow: paying ? '0 4px 0 #5b21b6,0 6px 20px rgba(124,58,237,.2)' : '0 4px 0 #5b21b6,0 6px 24px rgba(124,58,237,.4)',
              letterSpacing:0.3, transition:'all 0.2s',
              opacity: paying ? 0.85 : 1,
            }}>
              {paying ? (
                <>
                  <span style={{ display:'inline-block', width:18, height:18, border:'2.5px solid rgba(255,255,255,.5)', borderTopColor:'#fff', borderRadius:'50%', animation:'sap-spin 0.8s linear infinite' }}/>
                  <span>Creating your secure invoice…</span>
                </>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <Globe size={22} />
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', lineHeight:1.2 }}>
                    <span>{`Pay $${tier.price.toLocaleString()}`}</span>
                    <span style={{ fontSize:11, fontWeight:600, opacity:0.8, letterSpacing:0.5, textTransform:'uppercase', marginTop:2 }}>via NOWPayments</span>
                  </div>
                </div>
              )}
            </button>
            <style>{'@keyframes sap-spin{to{transform:rotate(360deg)}}'}</style>

            <div style={{textAlign:'center',fontSize:13,color:'var(--sap-text-muted)',lineHeight:1.6}}>
              {"\uD83D\uDD12"} Secure checkout · 350+ cryptos accepted (USDT, BTC, ETH, more)
              <br/>
              {"\u26A1"} Instant activation once payment confirms
            </div>
          </div>
        )}

        <div style={{padding:'10px 14px',background:'var(--sap-amber-bg, #fef3c7)',border:'1px solid #fde68a',borderRadius:10,marginBottom:24,fontSize:12,color:'#92400e',lineHeight:1.5,textAlign:'center'}}>
          <strong>Refunds:</strong> Commissions are paid instantly to other members on purchase. Card payments can be partially refunded within 7 days (the 5% company portion only). Crypto payments are final. See <a href="/refund-policy" target="_blank" style={{color:'#92400e',textDecoration:'underline'}}>refund policy</a> for details.
        </div>

        <div style={{textAlign:'center',marginBottom:16}}>
          <Link to="/campaign-tiers" style={{fontSize:13,color:'var(--sap-text-muted)',textDecoration:'none'}}>{t('campaignTiers.backToTiers')}</Link>
        </div>
      </div>
      {consentModal}
    </AppLayout>
    </WalletConnectProvider>
    </Suspense>
  );
}
