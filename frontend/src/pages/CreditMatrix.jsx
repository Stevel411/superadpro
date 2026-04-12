import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Sparkles, TrendingUp, Users, DollarSign, Gift, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle, Zap, Award, Layers } from 'lucide-react';

var PACK_ICONS = {
  starter: { emoji: '🚀', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
  builder: { emoji: '🔨', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
  pro: { emoji: '⚡', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
  elite: { emoji: '💎', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  ultimate: { emoji: '👑', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
};

export default function CreditMatrix() {
  var { t } = useTranslation();
  return (
    <AppLayout title={t("creditMatrix.title")} subtitle={t("creditMatrix.subtitle")}>
      <CreditMatrixContent />
    </AppLayout>
  );
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
  var [showCommissions, setShowCommissions] = useState(false);

  function loadAll() {
    Promise.all([
      apiGet('/api/credit-matrix/packs'),
      apiGet('/api/credit-matrix/my-matrix'),
      apiGet('/api/credit-matrix/stats'),
      apiGet('/api/credit-matrix/commissions'),
      apiGet('/api/credit-matrix/team-activity'),
    ]).then(function(results) {
      if (results[0].success) setPacks(results[0].packs || []);
      if (results[1].success) setMatrix(results[1]);
      if (results[2].success) setStats(results[2].stats || null);
      if (results[3].success) setCommissions(results[3]);
      if (results[4].success) setActivity(results[4].activity || []);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }

  useEffect(function() { loadAll(); }, []);

  function buyPack(packKey) {
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
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Loader2 size={32} color="var(--sap-purple)" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: 12, color: 'var(--sap-text-muted)' }}>{t('creditMatrix.loadingNexus')}</div>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    );
  }

  var matrixData = matrix && matrix.matrix;
  var treeNodes = matrix && matrix.tree ? matrix.tree : [];
  var matrixStats = matrix && matrix.stats;

  return (
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
                    <div style={{ fontSize: 11, color: 'var(--sap-text-muted)' }}>{card.label}</div>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        <div>
          {/* Credit Packs */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 12 }}>{t('creditMatrix.buyPacks')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {packs.map(function(pack) {
                var icon = PACK_ICONS[pack.key] || PACK_ICONS.starter;
                var isbuying = purchasing === pack.key;
                return (
                  <div key={pack.key}
                    onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={function(e) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
                    style={{ background: '#fff', borderRadius: 12, padding: '16px 14px', border: '1px solid #e2e8f0', textAlign: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'all 0.2s ease', cursor: 'pointer' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: icon.gradient, margin: '0 auto 10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon.emoji}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text-primary)' }}>{pack.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--sap-purple)', margin: '6px 0' }}>${pack.price}</div>
                    <div style={{ fontSize: 12, color: 'var(--sap-text-muted)', marginBottom: 4 }}>{pack.credits.toLocaleString()} credits</div>
                    <div style={{ fontSize: 11, color: 'var(--sap-text-muted)', marginBottom: 10 }}>${pack.cost_per_credit}/credit</div>
                    <button onClick={function() { if (!isbuying) buyPack(pack.key); }}
                      disabled={isbuying}
                      style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', fontFamily: 'inherit',
                        background: isbuying ? 'var(--sap-text-muted)' : icon.gradient, color: '#fff', fontSize: 13, fontWeight: 700,
                        cursor: isbuying ? 'default' : 'pointer' }}>
                      {isbuying ? t('creditMatrix.processing') : t('creditMatrix.payWithCrypto')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nexus Tree Visualisation */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 16 }}>{t('creditMatrix.yourNexusTitle')}
              {matrixData && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--sap-text-muted)', marginLeft: 8 }}>Nexus #{matrixData.cycle_number} — {matrixData.positions_filled}/{matrixData.max_positions} filled</span>}
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
                          fontSize: 11, fontWeight: 600, color: node ? '#166534' : 'var(--sap-text-muted)' }}>
                          {node ? node.username.slice(0, 8) : t('creditMatrix.emptySlot')}
                          {node && <div style={{ fontSize: 9, color: 'var(--sap-text-muted)', marginTop: 2 }}>{(PACK_ICONS[node.pack_key] || {}).emoji || ''} ${node.pack_price}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--sap-purple)', fontWeight: 600, marginBottom: 4 }}>Level 1 — 25% — {matrixStats.l1_filled}/{matrixStats.l1_max} filled — ${matrixStats.earnings_l1.toFixed(2)} earned</div>

                {/* Level 2 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(function(i) {
                    var node = treeNodes.filter(function(n) { return n.level === 2; })[i];
                    return (
                      <div key={i} style={{ width: 64, padding: '6px 3px', borderRadius: 6,
                        background: node ? '#eff6ff' : 'var(--sap-bg-elevated)',
                        border: node ? '1px solid #93c5fd' : '1px dashed #e2e8f0',
                        fontSize: 10, fontWeight: 600, color: node ? '#1e40af' : 'var(--sap-text-faint)', textAlign: 'center' }}>
                        {node ? node.username.slice(0, 7) : '—'}
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--sap-accent)', fontWeight: 600, marginBottom: 4 }}>Level 2 — 15% — {matrixStats.l2_filled}/{matrixStats.l2_max} filled — ${matrixStats.earnings_l2.toFixed(2)} earned</div>

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
                <div style={{ fontSize: 11, color: 'var(--sap-amber)', fontWeight: 600 }}>Level 3 — 10% — {matrixStats.l3_filled}/{matrixStats.l3_max} filled — ${matrixStats.earnings_l3.toFixed(2)} earned</div>
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
                {commissions.commissions.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', padding: '20px 0', textAlign: 'center' }}>{t("creditMatrix.noCommissionsYet")}</div>
                )}
                {commissions.commissions.map(function(c, i) {
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0',
                      borderBottom: i < commissions.commissions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text-primary)' }}>
                          {c.type === 'matrix_completion' ? t('creditMatrix.matrixCompleteBonusLabel') : 'L' + c.level + ' from ' + c.from_user}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--sap-text-muted)' }}>
                          {c.type === 'matrix_level' ? (c.rate * 100).toFixed(0) + '% of $' + c.pack_price.toFixed(0) + ' pack' : t('creditMatrix.matrixCompletionReward')}
                          {' · '}{new Date(c.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-green-bright)' }}>+${c.amount.toFixed(2)}</div>
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

          {/* Earnings potential */}
          <div style={{ background: 'linear-gradient(135deg, #f3f0ff, #ede9fe)', borderRadius: 14, border: '1px solid #ddd6fe', padding: '20px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#4c1d95', marginBottom: 10 }}>{t('creditMatrix.earningsPotential')}</div>
            <div style={{ fontSize: 13, color: '#6d28d9', marginBottom: 12 }}>{t("creditMatrix.fullNexusDesc")}</div>
            {[
              { label: t('creditMatrix.l1Label'), amount: '$693.75' },
              { label: t('creditMatrix.l2Label'), amount: '$1,248.75' },
              { label: t('creditMatrix.l3Label'), amount: '$2,497.50' },
              { label: t('creditMatrix.completionBonusLabel'), amount: '$250.00' },
            ].map(function(row, i) {
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: 'var(--sap-violet)' }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: '#4c1d95' }}>{row.amount}</span>
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid #c4b5fd', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}>
              <span style={{ color: '#4c1d95' }}>{t('creditMatrix.totalPerNexus')}</span>
              <span style={{ color: '#4c1d95' }}>$4,690.00</span>
            </div>
          </div>

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
                    <div style={{ fontSize: 11, color: 'var(--sap-text-muted)' }}>bought {a.pack} pack</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-green-bright)' }}>${a.price}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </>
  );
}
