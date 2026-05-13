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

  if (loading) {
    return (
      <Suspense fallback={
        <AppLayout title={t("creditMatrix.title")} subtitle={t("creditMatrix.subtitle")}>
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Loader2 size={32} color="var(--sap-purple)" style={{ animation: 'spin 1s linear infinite' }} />
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        </AppLayout>
      }>
        <WalletConnectProvider onBeforeClick={async function() { return await ensureConsent(); }}>
          <AppLayout
            title={t("creditMatrix.title")}
            subtitle={t("creditMatrix.subtitle")}
            topbarActions={
              <Suspense fallback={null}>
                <WalletConnectGate variant="compact" />
              </Suspense>
            }
          >
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <Loader2 size={32} color="var(--sap-purple)" style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ marginTop: 12, color: 'var(--sap-text-muted)' }}>{t('creditMatrix.loadingNexus')}</div>
              <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
            </div>
          </AppLayout>
        </WalletConnectProvider>
      </Suspense>
    );
  }

  var matrixData = matrix && matrix.matrix;
  var treeNodes = matrix && matrix.tree ? matrix.tree : [];
  var matrixStats = matrix && matrix.stats;

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
      topbarActions={
        <Suspense fallback={null}>
          <WalletConnectGate variant="compact" />
        </Suspense>
      }
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
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={24} color="var(--sap-purple-light)" />
          </div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#fff' }}>{t("creditMatrix.earnCommissions")}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{t("creditMatrix.buyPacksDesc")}</div>
          </div>
        </div>

        {/* Stats cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: t('creditMatrix.nexusEarned'), value: '$' + (stats.total_earned || 0).toFixed(2), icon: DollarSign, color: 'var(--sap-green-bright)' },
              { label: t('creditMatrix.creditBalance'), value: (stats.credit_balance || 0).toLocaleString(), icon: Zap, color: 'var(--sap-amber)' },
              { label: t('creditMatrix.nexusFill'), value: (stats.active_matrix ? stats.active_matrix.fill_pct : 0) + '%', icon: Users, color: 'var(--sap-accent)' },
              { label: t('creditMatrix.nexusesComplete'), value: stats.completed_cycles || 0, icon: Award, color: 'var(--sap-purple)' },
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
          {/* Credit Packs — connect button now lives in the top header
              via topbarActions. PayLinks read connection state from the
              page-level WalletConnectProvider context. */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 12 }}>{t('creditMatrix.buyPacks')}</div>

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

          {/* Nexus Tree Visualisation */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 20 }}>

            {/* Pack selector — only shown if user owns 2+ active matrices.
                Lets them switch between which pack's Nexus they're viewing.
                Was non-deterministic before; visualiser would pick one
                arbitrarily and members had no way to switch. */}
            {ownedMatrices.length > 1 && (
              <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Viewing Nexus for pack:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ownedMatrices.map(function(om) {
                    var isActive = (matrixData && matrixData.pack_key === om.pack_key)
                                   || (matrixData == null && selectedPackKey === om.pack_key);
                    var ico = PACK_ICONS[om.pack_key] || {};
                    return (
                      <button key={om.pack_key}
                        onClick={function() { setSelectedPackKey(om.pack_key); }}
                        style={{
                          padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit',
                          border: '1px solid ' + (isActive ? 'transparent' : '#e2e8f0'),
                          background: isActive ? (ico.gradient || 'var(--sap-purple)') : '#fff',
                          color: isActive ? '#fff' : 'var(--sap-text-primary)',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                        <span>{ico.emoji || '📦'}</span>
                        {om.label}
                        <span style={{
                          fontSize: 10, fontWeight: 700, opacity: 0.85,
                          padding: '1px 6px', borderRadius: 4,
                          background: isActive ? 'rgba(255,255,255,.2)' : 'rgba(148,163,184,.15)',
                        }}>{om.positions_filled}/{om.max_positions}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 16 }}>{t('creditMatrix.yourNexusTitle')}
              {matrixData && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--sap-text-muted)', marginLeft: 8 }}>{matrixData.pack_label} pack · Nexus #{matrixData.advance_number} — {matrixData.positions_filled}/{matrixData.max_positions} filled</span>}
            </div>

            {/* Progress bar */}
            {matrixData && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--sap-text-muted)', marginBottom: 4 }}>
                  <span>{matrixData.fill_percentage}% complete</span>
                  <span>{matrixData.positions_filled} of {matrixData.max_positions} positions</span>
                </div>
                <div style={{ height: 8, background: 'var(--sap-border)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: matrixData.fill_percentage + '%', background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
              </div>
            )}

            {/* Nexus tree — 3 levels */}
            {matrixStats && (
              <div style={{ textAlign: 'center' }}>
                {/* YOU — Level 0 */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                    YOU
                  </div>
                </div>
                <div style={{ width: 2, height: 20, background: '#d1d5db', margin: '0 auto' }} />

                {/* Level 1 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 4 }}>
                  {[0, 1, 2].map(function(i) {
                    var node = treeNodes.find(function(n) { return n.level === 1 && n.position_index === i; });
                    return (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ width: 2, height: 16, background: '#d1d5db', margin: '0 auto' }} />
                        <div style={{ width: 72, padding: '8px 4px', borderRadius: 8,
                          background: node ? 'var(--sap-green-bg)' : 'var(--sap-bg-elevated)',
                          border: node ? '1.5px solid #86efac' : '1.5px dashed #d1d5db',
                          fontSize: 13, fontWeight: 600, color: node ? '#166534' : 'var(--sap-text-muted)' }}>
                          {node ? node.username.slice(0, 8) : t('creditMatrix.emptySlot')}
                          {node && <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', marginTop: 2 }}>{(PACK_ICONS[node.pack_key] || {}).emoji || ''} ${node.pack_price}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 13, color: 'var(--sap-purple)', fontWeight: 600, marginBottom: 4 }}>Top row — {matrixStats.l1_filled}/{matrixStats.l1_max} positions filled</div>

                {/* Level 2 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(function(i) {
                    var node = treeNodes.filter(function(n) { return n.level === 2; })[i];
                    return (
                      <div key={i} style={{ width: 64, padding: '6px 3px', borderRadius: 6,
                        background: node ? '#eff6ff' : 'var(--sap-bg-elevated)',
                        border: node ? '1px solid #93c5fd' : '1px dashed #e2e8f0',
                        fontSize: 13, fontWeight: 600, color: node ? '#1e40af' : 'var(--sap-text-faint)', textAlign: 'center' }}>
                        {node ? node.username.slice(0, 7) : '—'}
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 13, color: 'var(--sap-accent)', fontWeight: 600, marginBottom: 4 }}>Middle row — {matrixStats.l2_filled}/{matrixStats.l2_max} positions filled</div>

                {/* Level 3 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                  {Array.from({ length: 27 }, function(_, i) {
                    var node = treeNodes.filter(function(n) { return n.level === 3; })[i];
                    return (
                      <div key={i} style={{ width: 28, height: 28, borderRadius: 4,
                        background: node ? 'var(--sap-amber-bg)' : 'var(--sap-bg-elevated)',
                        border: node ? '1px solid #fcd34d' : '1px dashed #e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 600, color: node ? '#92400e' : 'var(--sap-text-faint)' }}>
                        {node ? node.username.slice(0, 2).toUpperCase() : ''}
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 13, color: 'var(--sap-amber)', fontWeight: 600 }}>Bottom row — {matrixStats.l3_filled}/{matrixStats.l3_max} positions filled</div>

                {/* Commission breakdown — RELATIONSHIP-based, per
                    docs/commission-spec.md section 3. NOT level-based.
                    Previous version showed fabricated "L1 25% / L2 15%
                    / L3 10%" rates which contradict spec. */}
                <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--sap-bg-elevated)', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sap-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, textAlign: 'left' }}>
                    Commission earnings this Nexus
                  </div>

                  {/* Direct */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)' }}>
                        Direct referrals
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,.12)', color: '#15803d', marginLeft: 6, verticalAlign: 'middle', textTransform: 'uppercase' }}>15%</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--sap-text-muted)', marginTop: 2 }}>
                        {matrixStats.direct_filled || 0} of {matrixStats.direct_max || 3} people you personally referred
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--sap-green-bright)' }}>
                      ${(matrixStats.earnings_direct || 0).toFixed(2)}
                    </div>
                  </div>

                  {/* Spillover */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)' }}>
                        Spillover placements
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(14,165,233,.12)', color: '#0369a1', marginLeft: 6, verticalAlign: 'middle', textTransform: 'uppercase' }}>10%</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--sap-text-muted)', marginTop: 2 }}>
                        {matrixStats.spillover_filled || 0} of {matrixStats.spillover_max || 36} placed by others' overflow
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--sap-green-bright)' }}>
                      ${(matrixStats.earnings_spillover || 0).toFixed(2)}
                    </div>
                  </div>

                  {/* Completion */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 0' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)' }}>
                        Completion bonus
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,.12)', color: '#92400e', marginLeft: 6, verticalAlign: 'middle', textTransform: 'uppercase' }}>10%</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--sap-text-muted)', marginTop: 2 }}>
                        Pays when all 39 positions fill
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: (matrixStats.earnings_completion || 0) > 0 ? 'var(--sap-green-bright)' : 'var(--sap-text-faint)' }}>
                      ${(matrixStats.earnings_completion || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!matrixStats && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sap-text-muted)' }}>
                <Users size={40} color="var(--sap-border)" />
                <div style={{ marginTop: 8, fontSize: 14 }}>{t("creditMatrix.buyFirstPack")}</div>
              </div>
            )}
          </div>

          {/* Commission History */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px' }}>
            <div onClick={function() { setShowCommissions(!showCommissions); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text-primary)' }}>{t('creditMatrix.commissionHistory')}
                {commissions && commissions.summary && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--sap-green-bright)', marginLeft: 8 }}>${commissions.summary.total_earned.toFixed(2)} total</span>}
              </div>
              {showCommissions ? <ChevronUp size={18} color="var(--sap-text-muted)" /> : <ChevronDown size={18} color="var(--sap-text-muted)" />}
            </div>

            {showCommissions && commissions && commissions.commissions && (
              <div style={{ marginTop: 12 }}>

                {/* Pack filter — only relevant when user owns 2+ active matrices.
                    Otherwise there's nothing to filter between, just show everything. */}
                {ownedMatrices.length > 1 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 4, alignSelf: 'center' }}>Show:</span>
                    <button onClick={function() { setCommissionPackFilter(null); }}
                      style={{
                        padding: '4px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        border: '1px solid ' + (commissionPackFilter === null ? 'var(--sap-purple)' : '#e2e8f0'),
                        background: commissionPackFilter === null ? 'var(--sap-purple)' : '#fff',
                        color: commissionPackFilter === null ? '#fff' : 'var(--sap-text-muted)',
                      }}>All packs</button>
                    {ownedMatrices.map(function(om) {
                      var isActive = commissionPackFilter === om.pack_key;
                      var ico = PACK_ICONS[om.pack_key] || {};
                      return (
                        <button key={om.pack_key}
                          onClick={function() { setCommissionPackFilter(om.pack_key); }}
                          style={{
                            padding: '4px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit',
                            border: '1px solid ' + (isActive ? 'transparent' : '#e2e8f0'),
                            background: isActive ? (ico.gradient || 'var(--sap-purple)') : '#fff',
                            color: isActive ? '#fff' : 'var(--sap-text-muted)',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                          <span>{ico.emoji || '📦'}</span>
                          {om.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {commissions.commissions.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', padding: '20px 0', textAlign: 'center' }}>{t("creditMatrix.noCommissionsYet")}</div>
                )}
                {commissions.commissions.map(function(c, i) {
                  // Pack tier chip — small label showing which matrix this
                  // commission came from. Only shown if user owns multiple
                  // active matrices (otherwise it's just noise — everything
                  // came from the one matrix they own).
                  var ico = c.matrix_pack_key ? (PACK_ICONS[c.matrix_pack_key] || {}) : {};
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0',
                      borderBottom: i < commissions.commissions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text-primary)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{c.type === 'matrix_completion' ? t('creditMatrix.matrixCompleteBonusLabel') : 'L' + c.level + ' from ' + c.from_user}</span>
                          {ownedMatrices.length > 1 && c.matrix_pack_label && (
                            <span style={{
                              fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 3,
                              background: ico.gradient || 'rgba(148,163,184,.15)',
                              color: ico.gradient ? '#fff' : 'var(--sap-text-muted)',
                              textTransform: 'uppercase', letterSpacing: 0.3,
                            }}>{c.matrix_pack_label}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--sap-text-muted)' }}>
                          {c.type === 'matrix_level' ? (c.rate * 100).toFixed(0) + '% of $' + c.pack_price.toFixed(0) + ' pack' : t('creditMatrix.matrixCompletionReward')}
                          {' · '}{new Date(c.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-green-bright)', marginLeft: 12, flexShrink: 0 }}>+${c.amount.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          {/* How it works */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 12 }}>{t('creditMatrix.howItWorksTitle')}</div>
            {[
              { step: '1', text: t('creditMatrix.step1Text') },
              { step: '2', text: t('creditMatrix.step2Text') },
              { step: '3', text: t('creditMatrix.step3Text') },
              { step: '4', text: t('creditMatrix.step4Text') },
              { step: '5', text: t('creditMatrix.step5Text') },
            ].map(function(item, i) {
              return (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'var(--sap-purple)', flexShrink: 0 }}>{item.step}</div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>{item.text}</div>
                </div>
              );
            })}
          </div>

          {/* Earnings potential — RELATIONSHIP-based, computed live
              from the current pack's price. Previous version showed
              hardcoded fabricated numbers ($693.75/$1,248.75/$2,497.50
              totalling $4,690) which had no basis in the spec. */}
          {matrixData && matrixStats && (
            <div style={{ background: 'linear-gradient(135deg, #f3f0ff, #ede9fe)', borderRadius: 14, border: '1px solid #ddd6fe', padding: '20px', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#4c1d95', marginBottom: 4 }}>{t('creditMatrix.earningsPotential')}</div>
              <div style={{ fontSize: 12, color: '#6d28d9', marginBottom: 12 }}>
                If your <strong>{matrixData.pack_label}</strong> (${matrixData.pack_price}) Nexus fills completely:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--sap-violet)' }}>3 direct × 15%</span>
                <span style={{ fontWeight: 700, color: '#4c1d95' }}>${(matrixStats.max_direct_per_cycle || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--sap-violet)' }}>36 spillover × 10%</span>
                <span style={{ fontWeight: 700, color: '#4c1d95' }}>${(matrixStats.max_spillover_per_cycle || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--sap-violet)' }}>Completion bonus (39 × 10%)</span>
                <span style={{ fontWeight: 700, color: '#4c1d95' }}>${(matrixStats.max_completion_per_cycle || 0).toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid #c4b5fd', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}>
                <span style={{ color: '#4c1d95' }}>Max per full Nexus cycle</span>
                <span style={{ color: '#4c1d95' }}>${(matrixStats.max_total_per_cycle || 0).toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 10, opacity: 0.8, lineHeight: 1.4 }}>
                Direct = people you personally refer. Spillover = members placed in your matrix from others' overflow. Both pay when they buy this pack tier.
              </div>
            </div>
          )}

          {/* Team activity feed */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 12 }}>{t('creditMatrix.teamActivity')}</div>
            {activity.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', textAlign: 'center', padding: '20px 0' }}>{t('creditMatrix.noTeamPurchases')}</div>
            )}
            {activity.slice(0, 8).map(function(a, i) {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                  borderBottom: i < Math.min(activity.length, 8) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'var(--sap-purple)' }}>{a.username.slice(0, 1).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text-primary)' }}>{a.username}</div>
                    <div style={{ fontSize: 13, color: 'var(--sap-text-muted)' }}>bought {a.pack} pack</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-green-bright)' }}>${a.price}</div>
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
