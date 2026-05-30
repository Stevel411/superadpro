import { useTranslation } from 'react-i18next';
import { useState, useEffect, lazy, Suspense } from 'react';
import AppLayout from '../components/layout/AppLayout';
import ProductExplainer from '../components/ProductExplainer';
import BpgNexusShowcase from '../components/BpgNexusShowcase';
import { apiGet, apiPost } from '../utils/api';
import { Sparkles, TrendingUp, Users, DollarSign, Gift, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle, Zap, Award, Layers } from 'lucide-react';
import { useConsentGate } from '../components/PurchaseConsentModal';

// Lazy-load self-custody payment components — Reown/wagmi adds heavy
// crypto deps to the bundle. Loaded only when this page renders.
//
// React.lazy supports default exports only, so we wrap each named export
// in a default-export shim. All three resolve the same module under the
// hood (single chunk fetch).
var _wcModule = null;
function _loadWC() { if (!_wcModule) _wcModule = import('../components/WalletConnect'); return _wcModule; }
var WalletConnectProvider = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectProvider }; }); });
var WalletConnectGate = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectGate }; }); });
var WalletPayLink = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletPayLink }; }); });

var PACK_ICONS = {
  starter:   { emoji: '🚀', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', cardGrad: 'linear-gradient(135deg, #312e81, #4338ca, #6366f1)' },
  builder:   { emoji: '🔨', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', cardGrad: 'linear-gradient(135deg, #0c4a6e, #0369a1, #0ea5e9)' },
  pro:       { emoji: '⚡', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', cardGrad: 'linear-gradient(135deg, #4c1d95, #6d28d9, #8b5cf6)' },
  advanced:  { emoji: '🚀', gradient: 'linear-gradient(135deg, #ec4899, #f472b6)', cardGrad: 'linear-gradient(135deg, #831843, #be185d, #ec4899)' },
  elite:     { emoji: '💎', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', cardGrad: 'linear-gradient(135deg, #78350f, #b45309, #f59e0b)' },
  premium:   { emoji: '🚀', gradient: 'linear-gradient(135deg, #14b8a6, #2dd4bf)', cardGrad: 'linear-gradient(135deg, #134e4a, #0d9488, #14b8a6)' },
  executive: { emoji: '🚀', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)', cardGrad: 'linear-gradient(135deg, #1e3a5f, #1d4ed8, #3b82f6)' },
  ultimate:  { emoji: '👑', gradient: 'linear-gradient(135deg, #ef4444, #f97316)', cardGrad: 'linear-gradient(135deg, #7f1d1d, #dc2626, #f97316)' },
};

export default function CreditMatrix() {
  return <CreditMatrixContent />;
}

export function CreditMatrixContent() {
  var { t } = useTranslation();
  var [packs, setPacks] = useState([]);
  var [matrix, setMatrix] = useState(null);
  var [stats, setStats] = useState(null);
  var [commissions, setCommissions] = useState(null);
  var [activity, setActivity] = useState([]);
  var [loading, setLoading] = useState(true);
  var [purchasing, setPurchasing] = useState(null);
  var [message, setMessage] = useState(null);
  // 23 May 2026: Stripe availability — drives whether the 'Card' button
  // shows on each pack. Reads /api/stripe/status on mount.
  var [stripeReady, setStripeReady] = useState(false);

  // Pack selector — when a user owns >1 active matrix, they need a way
  // to switch between them. selectedPackKey null = default (highest tier).
  // commissionPackFilter applies to the Commission History pane only:
  // null = all commissions across all packs; otherwise filter to that pack.
  var [ownedMatrices, setOwnedMatrices] = useState([]);    // active matrices the user owns
  var [selectedPackKey, setSelectedPackKey] = useState(null);
  var [commissionPackFilter, setCommissionPackFilter] = useState(null);

  // Purchase consent gate — see app/purchase_consent.py
  var { ensureConsent, consentModal } = useConsentGate();
  var [showCommissions, setShowCommissions] = useState(false);

  function loadAll(packKey) {
    // packKey arg overrides selectedPackKey state for this load.
    // Used during initial mount where state isn't yet committed.
    var pk = packKey !== undefined ? packKey : selectedPackKey;
    var myMatrixUrl = pk ? ('/api/credit-matrix/my-matrix?pack_key=' + encodeURIComponent(pk))
                         : '/api/credit-matrix/my-matrix';
    var commissionsUrl = commissionPackFilter
      ? ('/api/credit-matrix/commissions?pack_key=' + encodeURIComponent(commissionPackFilter))
      : '/api/credit-matrix/commissions';

    Promise.all([
      apiGet('/api/credit-matrix/packs'),
      apiGet(myMatrixUrl),
      apiGet('/api/credit-matrix/stats'),
      apiGet(commissionsUrl),
      apiGet('/api/credit-matrix/team-activity'),
      apiGet('/api/credit-matrix/all-matrices'),
    ]).then(function(results) {
      if (results[0].success) setPacks(results[0].packs || []);
      if (results[1].success) setMatrix(results[1]);
      if (results[2].success) setStats(results[2].stats || null);
      if (results[3].success) setCommissions(results[3]);
      if (results[4].success) setActivity(results[4].activity || []);
      if (results[5].success) {
        // Filter to active matrices only — the pack selector is only
        // useful when there's >1 to switch between. Completed cycles
        // aren't shown in the selector (they live in the history view).
        var active = (results[5].purchased || []).filter(function(p) {
          return p.has_matrix && p.status === 'active';
        });
        setOwnedMatrices(active);
      }
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }

  useEffect(function() { loadAll(); }, []);

  // 23 May 2026: read ?activated=<pack_key> from URL and show success banner.
  // Set by Stripe Checkout success_path after a successful Nexus pack purchase.
  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    var activated = (params.get('activated') || '').toLowerCase();
    if (activated && ['starter','builder','pro','advanced','elite','premium','executive','ultimate'].indexOf(activated) >= 0) {
      var label = activated.charAt(0).toUpperCase() + activated.slice(1);
      setMessage({ type: 'success', text: label + ' pack activated — credits awarded and your matrix has been updated.' });
      // Clean URL so banner doesn't reappear on refresh
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) { /* ignore */ }
    }
  }, []);

  // Refetch matrix-specific data when the selected pack changes
  useEffect(function() {
    if (selectedPackKey === null) return;   // initial load handled above
    var url = '/api/credit-matrix/my-matrix?pack_key=' + encodeURIComponent(selectedPackKey);
    apiGet(url).then(function(d) { if (d.success) setMatrix(d); }).catch(function(){});
  }, [selectedPackKey]);

  // Refetch commissions when the commission-pack filter changes
  useEffect(function() {
    var url = commissionPackFilter
      ? ('/api/credit-matrix/commissions?pack_key=' + encodeURIComponent(commissionPackFilter))
      : '/api/credit-matrix/commissions';
    apiGet(url).then(function(d) { if (d.success) setCommissions(d); }).catch(function(){});
  }, [commissionPackFilter]);

  async function buyPack(packKey) {
    // Purchase consent FIRST. Credit-matrix purchases trigger
    // immediate matrix-level commissions to upline + completion-bonus
    // pool contributions. If user cancels, abort silently.
    var consented = await ensureConsent();
    if (!consented) return;

    setPurchasing(packKey);
    setMessage(null);
    apiPost('/api/credit-matrix/purchase', { pack_key: packKey, payment_method: 'crypto' })
      .then(function(r) {
        setPurchasing(null);
        if (r.success && r.action === 'crypto_checkout' && r.invoice_url) {
          // Open NOWPayments checkout in new tab
          window.open(r.invoice_url, '_blank');
          setMessage({
            type: 'success',
            text: 'Payment window opened — complete your USDT payment to receive ' + r.credits + ' credits. Your nexus will update automatically once payment is confirmed.',
          });
        } else if (r.success && !r.action) {
          // Wallet payment succeeded directly
          var earned = (r.matrix_placement && r.matrix_placement.commissions_paid) || [];
          var totalEarned = earned.reduce(function(s, c) { return s + c.amount; }, 0);
          setMessage({
            type: 'success',
            text: r.credits_awarded + ' credits awarded!' + (totalEarned > 0 ? ' $' + totalEarned.toFixed(2) + ' in commissions paid to your upline.' : ''),
          });
          loadAll();
        } else {
          setMessage({ type: 'error', text: r.error || 'Purchase failed' });
        }
      })
      .catch(function(e) {
        setPurchasing(null);
        setMessage({ type: 'error', text: e.message || 'Purchase failed' });
      });
  }

  // 23 May 2026: card-based purchase via Stripe Checkout — one-time payment.
  async function buyPackWithCard(packKey) {
    var consented = await ensureConsent();
    if (!consented) return;
    setPurchasing(packKey);
    setMessage(null);
    apiPost('/api/stripe/checkout/nexus-pack', { pack_key: packKey })
      .then(function(r) {
        setPurchasing(null);
        if (r.checkout_url) {
          window.location.href = r.checkout_url;
        } else {
          setMessage({ type: 'error', text: r.error || 'Card checkout unavailable. Please try crypto.' });
        }
      })
      .catch(function(e) {
        setPurchasing(null);
        setMessage({ type: 'error', text: e.message || 'Card checkout failed' });
      });
  }

  // 23 May 2026: Stripe availability check.
  useEffect(function() {
    apiGet('/api/stripe/status')
      .then(function(d) { if (d && d.configured === true) setStripeReady(true); })
      .catch(function() { /* leave card button hidden */ });
  }, []);

  if (loading) {
    return (
      <Suspense fallback={
        <AppLayout title={t("creditMatrix.title")} subtitle={t("creditMatrix.subtitle")}>
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Loader2 size={32} color="#06b6d4" style={{ animation: 'spin 1s linear infinite' }} />
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        </AppLayout>
      }>
        <WalletConnectProvider onBeforeClick={async function() { return await ensureConsent(); }}>
          <AppLayout
            title={t("creditMatrix.title")}
            subtitle={t("creditMatrix.subtitle")}
          >
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <Loader2 size={32} color="#06b6d4" style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ marginTop: 12, color: 'var(--sap-text-muted)' }}>{t('creditMatrix.loadingNexus')}</div>
              <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
            </div>
          </AppLayout>
        </WalletConnectProvider>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={
      <AppLayout title={t("creditMatrix.title")} subtitle={t("creditMatrix.subtitle")}>
        <div />
      </AppLayout>
    }>
    <WalletConnectProvider onBeforeClick={async function() { return await ensureConsent(); }}>
    <AppLayout
      title={t("creditMatrix.title")}
      subtitle={t("creditMatrix.subtitle")}
    >
    <>

      {/* Cobalt blue header */}
      <div style={{ background: 'linear-gradient(180deg, #172554, #1e3a8a)', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
        <a href="/creative-studio" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 14, transition: 'color .15s' }}
          onMouseEnter={function(e) { e.target.style.color = '#fff'; }} onMouseLeave={function(e) { e.target.style.color = 'rgba(255,255,255,0.5)'; }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          {t('creditMatrix.backToCreativeStudio')}
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={24} color="#22d3ee" />
          </div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#fff' }}>{t("creditMatrix.earnCommissions")}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{t("creditMatrix.buyPacksDesc")}</div>
          </div>
        </div>

        {/* Stats cards — flat-20% ledger (matrix retired 30 May 2026) */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: t('creditMatrix.creditBalance'), value: (stats.credit_balance || 0).toLocaleString(), icon: Zap, color: '#06b6d4' },
              { label: t('creditMatrix.referralEarnings'), value: '$' + (stats.referral_earnings || 0).toFixed(2), icon: DollarSign, color: '#0ea5e9' },
              { label: t('creditMatrix.payingReferrals'), value: stats.paying_referrals || 0, icon: Users, color: '#22d3ee' },
              { label: t('creditMatrix.creditsBought'), value: (stats.credits_bought || 0).toLocaleString(), icon: TrendingUp, color: '#1e3a8a' },
            ].map(function(card, i) {
              return (
                <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <card.icon size={16} color={card.color} />
                    <div style={{ fontSize: 13, color: 'var(--sap-text-muted)' }}>{card.label}</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sap-text-primary)' }}>{card.value}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div style={{ padding: '14px 18px', borderRadius: 10, marginBottom: 16,
          background: message.type === 'success' ? 'var(--sap-green-bg)' : 'var(--sap-red-bg)',
          border: '1px solid ' + (message.type === 'success' ? '#bbf7d0' : 'var(--sap-red-bg-mid)'),
          display: 'flex', alignItems: 'center', gap: 8 }}>
          {message.type === 'success' ? <CheckCircle size={18} color="var(--sap-green-bright)" /> : <AlertCircle size={18} color="var(--sap-red-bright)" />}
          <span style={{ fontSize: 14, color: message.type === 'success' ? '#166534' : '#991b1b' }}>{message.text}</span>
        </div>
      )}

      {/* Product explainer — "What am I actually buying?" */}
      <ProductExplainer t={t} tNamespace="nexusStream" variant="nexus" defaultOpen={false} />

      {/* BPG Sales Showcase — positions Brand Poster Generator as the
          concrete tool members unlock with any Nexus pack. Strategically
          placed BEFORE the pack pricing grid so members see what they
          unlock before they see how much it costs. The component
          fetches its own data and silently renders nothing if no
          preview images are seeded yet. Added 12 May 2026. */}
      <BpgNexusShowcase />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        <div>
          {/* Credit Packs — single Connect button above the pack grid
              when disconnected; once wallet is connected, each pack
              card's WalletPayLink lights up. 24 May 2026: moved out of
              topbar (members couldn't find it) into a banner above the
              grid. One Gate for all four packs avoids the 4-button
              clutter the WalletConnect refactor was designed to prevent. */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 12 }}>{t('creditMatrix.buyPacks')}</div>

            <Suspense fallback={null}>
              <WalletConnectGate
                hideWhenConnected
                label="Connect Wallet to enable direct BSC payment"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10,
                  border: 'none', fontSize: 14, fontWeight: 800, color: '#fff',
                  background: 'linear-gradient(135deg,#ea580c,#f97316)',
                  boxShadow: '0 4px 14px rgba(249,115,22,.35)',
                  fontFamily: 'Sora, sans-serif', marginBottom: 12,
                }}
              />
            </Suspense>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {packs.map(function(pack) {
                var icon = PACK_ICONS[pack.key] || PACK_ICONS.starter;
                var isbuying = purchasing === pack.key;
                return (
                  <div key={pack.key}
                    onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={function(e) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
                    style={{ background: icon.cardGrad || icon.gradient, borderRadius: 14, padding: '20px 16px', textAlign: 'center',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'all 0.2s ease', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }}/>
                    <div style={{ position: 'absolute', bottom: -20, left: -20, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }}/>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', margin: '0 auto 10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, position: 'relative' }}>{icon.emoji}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', position: 'relative' }}>{pack.label}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: '#fff', margin: '6px 0', position: 'relative' }}>${pack.price}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4, position: 'relative' }}>{pack.credits.toLocaleString()} {t('creditMatrix.credits')}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12, position: 'relative' }}>${pack.cost_per_credit}/{t('creditMatrix.perCredit')}</div>
                    {/* 23 May 2026: Card via Stripe — positioned first as
                        most familiar option. Only renders when Stripe is
                        configured server-side. */}
                    {stripeReady && (
                      <button onClick={function() { if (!isbuying) buyPackWithCard(pack.key); }}
                        disabled={isbuying}
                        style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.4)', fontFamily: 'inherit',
                          background: isbuying ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 13, fontWeight: 800,
                          cursor: isbuying ? 'default' : 'pointer', backdropFilter: 'blur(4px)', transition: 'background 0.2s', marginBottom: 8 }}>
                        {isbuying ? t('creditMatrix.processing') : '💳 Card'}
                      </button>
                    )}
                    <button onClick={function() { if (!isbuying) buyPack(pack.key); }}
                      disabled={isbuying}
                      style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)', fontFamily: 'inherit',
                        background: isbuying ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, fontWeight: 700,
                        cursor: isbuying ? 'default' : 'pointer', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }}>
                      {isbuying ? t('creditMatrix.processing') : 'NOWPayments'}
                    </button>
                    {/* Self-custody BSC pay link — only renders when wallet
                        is connected (handled by PayLink internally via context). */}
                    <div style={{ marginTop: 8, position: 'relative' }}>
                      <Suspense fallback={null}>
                        <WalletPayLink
                          productType="credit_matrix"
                          productKey={'credit_matrix_' + pack.key}
                          label={'Pay $' + pack.price + ' from wallet'}
                          style={{
                            padding: '8px 0',
                            border: '1px solid rgba(255,255,255,0.3)',
                            background: 'rgba(255,255,255,0.12)',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 8,
                          }}
                        />
                      </Suspense>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Referral commission ledger — flat 20% (matrix retired 30 May 2026) */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text-primary)' }}>{t('creditMatrix.referralCommissions')}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: 'rgba(6,182,212,0.10)', padding: '4px 10px', borderRadius: 999 }}>{t('creditMatrix.flatRateBadge')}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', marginBottom: 16 }}>{t('creditMatrix.referralCommissionsDesc')}</div>

            {activity.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--sap-text-muted)' }}>
                <Users size={40} color="var(--sap-border)" />
                <div style={{ marginTop: 8, fontSize: 14 }}>{t('creditMatrix.noReferralCommissionsYet')}</div>
              </div>
            )}

            {activity.length > 0 && (
              <div>
                {activity.map(function(a, i) {
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0',
                      borderBottom: i < activity.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: '#0369a1', flexShrink: 0 }}>{(a.username || '?').slice(0, 1).toUpperCase()}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-text-primary)' }}>{a.username}</div>
                          <div style={{ fontSize: 12, color: 'var(--sap-text-muted)' }}>
                            {a.pack}{a.pack_price ? ' · $' + a.pack_price.toFixed(0) : ''}
                            {a.created_at ? ' · ' + new Date(a.created_at).toLocaleDateString() : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0ea5e9', marginLeft: 12, flexShrink: 0 }}>+${(a.earned || 0).toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Your purchases (buyer side) */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{t('creditMatrix.yourPurchases')}</div>
            <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', marginBottom: 14 }}>{t('creditMatrix.yourPurchasesDesc')}</div>
            {(!stats || !stats.purchases || stats.purchases.length === 0) && (
              <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', padding: '20px 0', textAlign: 'center' }}>{t('creditMatrix.noPurchasesYet')}</div>
            )}
            {stats && stats.purchases && stats.purchases.map(function(p, i) {
              var ico = PACK_ICONS[p.pack_key] || {};
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0',
                  borderBottom: i < stats.purchases.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{ico.emoji || '📦'}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-text-primary)' }}>{p.pack_label || p.pack_key}</div>
                      <div style={{ fontSize: 12, color: 'var(--sap-text-muted)' }}>
                        {(p.credits_awarded || 0).toLocaleString()} {t('creditMatrix.credits')}
                        {p.created_at ? ' · ' + new Date(p.created_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text-primary)', flexShrink: 0 }}>${(p.pack_price || 0).toFixed(0)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          {/* How it works — flat 20% model */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 12 }}>{t('creditMatrix.howItWorksTitle')}</div>
            {[
              { step: '1', text: t('creditMatrix.flatStep1') },
              { step: '2', text: t('creditMatrix.flatStep2') },
              { step: '3', text: t('creditMatrix.flatStep3') },
            ].map(function(item, i) {
              return (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#0369a1', flexShrink: 0 }}>{item.step}</div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>{item.text}</div>
                </div>
              );
            })}
          </div>

          {/* Earnings explainer — flat 20%, cobalt */}
          <div style={{ background: 'linear-gradient(135deg, #0a1438, #1e3a8a)', borderRadius: 14, padding: '20px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{t('creditMatrix.earningsPotential')}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginBottom: 12 }}>{t('creditMatrix.flatEarningsDesc')}</div>
            {[
              { pack: 'Starter', price: 20, earn: 4 },
              { pack: 'Pro', price: 100, earn: 20 },
              { pack: 'Elite', price: 400, earn: 80 },
            ].map(function(row, i) {
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
                  <span style={{ color: 'rgba(255,255,255,0.65)' }}>{row.pack} (${row.price})</span>
                  <span style={{ fontWeight: 700, color: '#22d3ee' }}>+${row.earn.toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          {/* Recent referral earnings feed */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 12 }}>{t('creditMatrix.recentReferralEarnings')}</div>
            {activity.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', textAlign: 'center', padding: '20px 0' }}>{t('creditMatrix.noReferralCommissionsYet')}</div>
            )}
            {activity.slice(0, 8).map(function(a, i) {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                  borderBottom: i < Math.min(activity.length, 8) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#0369a1' }}>{(a.username || '?').slice(0, 1).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text-primary)' }}>{a.username}</div>
                    <div style={{ fontSize: 13, color: 'var(--sap-text-muted)' }}>{t('creditMatrix.boughtPrefix')} {a.pack}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0ea5e9' }}>+${(a.earned || 0).toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      {consentModal}
    </>
    </AppLayout>
    </WalletConnectProvider>
    </Suspense>
  );
}
