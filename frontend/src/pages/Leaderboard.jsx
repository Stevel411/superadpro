import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { Crown, Info, Lock, TrendingUp } from 'lucide-react';

// Redesigned leaderboard (members-only via ProtectedRoute). ONE board with a
// metric toggle — Income / Downline / Sign-ups — all served live from
// /api/leaderboard's `members` payload (paid-ledger income, recursive
// descendant count, direct referrals). Income is always rendered in money
// green; downline + sign-ups are neutral counts.

const TIER_LABELS = { founder: 'Founder', partner: 'Partner', pro: 'Partner', launchpad: 'Launchpad', free: 'Free' };

function metricValue(m, key) {
  if (key === 'income') return m.income || 0;
  if (key === 'downline') return m.downline || 0;
  return m.signups || 0;
}
function fmtValue(m, key) {
  if (key === 'income') return '$' + Math.round(m.income || 0).toLocaleString();
  return metricValue(m, key).toLocaleString();
}

function Spin() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--sap-border)', borderTopColor: 'var(--sap-accent)', borderRadius: '50%', animation: 'sapSpin 0.8s linear infinite' }} />
      <style>{`@keyframes sapSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Avatar({ m, size, ring }) {
  const initial = (m.first_name || m.username || 'U')[0].toUpperCase();
  return (
    <div style={{
      position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: 'var(--sap-bg-hover)', color: 'var(--sap-text-secondary)',
      fontFamily: 'var(--sap-font-heading)', fontWeight: 700, fontSize: Math.round(size * 0.4),
      boxShadow: ring ? '0 0 0 2px var(--sap-bg-card), 0 0 0 4px var(--sap-accent)' : 'none',
    }}>
      {initial}
      {m.avatar_url && (
        <img src={m.avatar_url} alt="" loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );
}

function YouTag() {
  return <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--sap-accent)', color: '#fff', padding: '1px 7px', borderRadius: 6 }}>You</span>;
}

function TierBadge({ tier }) {
  const label = TIER_LABELS[tier] || (tier ? tier[0].toUpperCase() + tier.slice(1) : 'Free');
  const paid = tier === 'founder' || tier === 'partner' || tier === 'pro';
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 6,
      color: paid ? 'var(--sap-accent)' : 'var(--sap-text-secondary)',
      background: paid ? 'var(--sap-accent-bg, #e8f6fe)' : 'var(--sap-bg-elevated)',
    }}>{label}</span>
  );
}

function PodiumCard({ m, place, metric, isYou }) {
  const isWin = place === 1;
  const moneyColor = metric === 'income' ? 'var(--sap-green)' : 'var(--sap-text-primary)';
  return (
    <div style={{
      background: 'var(--sap-bg-card)', borderRadius: 'var(--sap-radius-lg)', padding: '16px 14px', textAlign: 'center', position: 'relative',
      border: isWin ? '2px solid var(--sap-accent)' : '1px solid var(--sap-border-light)',
      boxShadow: isWin ? '0 6px 22px rgba(14,165,233,0.16)' : 'var(--sap-shadow-sm)',
    }}>
      <div style={{
        position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--sap-font-heading)', fontWeight: 700, fontSize: 11, color: '#fff',
        background: isWin ? 'var(--sap-accent)' : 'var(--sap-cobalt-mid)', border: '2px solid var(--sap-bg-card)',
      }}>{place}</div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 10px' }}>
        <Avatar m={m} size={52} ring={isYou} />
      </div>
      <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 600, fontSize: 15, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
        {m.first_name || m.username}
        {isWin && <Crown size={15} style={{ color: 'var(--sap-accent)' }} />}
        {isYou && <YouTag />}
      </div>
      <div style={{ fontSize: 11, color: 'var(--sap-text-faint)', marginBottom: 8 }}>#{place} · {TIER_LABELS[m.membership_tier] || 'Free'}</div>
      <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: moneyColor }}>{fmtValue(m, metric)}</div>
      <div style={{ fontSize: 11, color: 'var(--sap-text-secondary)', marginTop: 3 }}>{m.downline.toLocaleString()} downline · {m.signups} sign-ups</div>
    </div>
  );
}

function thStyle(align) {
  return { fontSize: 11, fontWeight: 600, color: 'var(--sap-text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: align, padding: '8px 14px', borderBottom: '1px solid var(--sap-border-light)' };
}
function tdStyle(align) {
  return { padding: '12px 14px', borderBottom: '1px solid var(--sap-border-light)', fontSize: 14, textAlign: align, fontVariantNumeric: 'tabular-nums' };
}

export default function Leaderboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('income');

  useEffect(() => {
    apiGet('/api/leaderboard').then((d) => { setData(d); setLoading(false); }).catch(() => { setLoading(false); });
  }, []);

  const METRICS = [
    { key: 'income', label: t('leaderboard.income', { defaultValue: 'Income' }) },
    { key: 'downline', label: t('leaderboard.downline', { defaultValue: 'Downline' }) },
    { key: 'signups', label: t('leaderboard.signupsLabel', { defaultValue: 'Sign-ups' }) },
  ];

  const title = t('leaderboard.title', { defaultValue: 'Leaderboard' });
  const subtitle = t('leaderboard.subtitle', { defaultValue: 'Top performers across the SuperAdPro network' });

  if (loading) return <AppLayout categoryBack={{ to: '/team', label: 'Team' }} title={title}><Spin /></AppLayout>;

  const members = ((data && data.members) || []).slice();
  members.sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
  const top3 = members.slice(0, 3);
  const meId = user && user.id;
  const myRank = members.findIndex((m) => m.id === meId);
  const activeMetric = METRICS.find((x) => x.key === metric) || METRICS[0];

  return (
    <AppLayout categoryBack={{ to: '/team', label: 'Team' }} title={title} subtitle={subtitle}>
      <style>{`@media(max-width:600px){.lb-su{display:none!important;}.lb-handle{display:none!important;}}`}</style>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--sap-font-mono)', fontSize: 11, color: 'var(--sap-text-secondary)', background: 'var(--sap-bg-card)', border: '1px solid var(--sap-border-light)', padding: '6px 11px', borderRadius: 'var(--sap-radius-full)' }}>
            <Lock size={13} style={{ color: 'var(--sap-accent)' }} /> {t('leaderboard.membersOnly', { defaultValue: 'Members only' })}
          </span>
        </div>

        <div style={{ background: 'var(--sap-bg-card)', border: '1px solid var(--sap-border-light)', borderRadius: 'var(--sap-radius-2xl)', boxShadow: 'var(--sap-shadow-md)', overflow: 'hidden' }}>

          <div style={{ padding: '20px 24px 18px', borderBottom: '1px solid var(--sap-border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em', color: 'var(--sap-text-primary)' }}>{t('leaderboard.heading', { defaultValue: 'Affiliate leaderboard' })}</div>
                <div style={{ fontSize: 13, color: 'var(--sap-text-secondary)', marginTop: 2 }}>{subtitle}</div>
              </div>
              {myRank >= 0 && (
                <div style={{ textAlign: 'right', background: 'var(--sap-bg-elevated)', border: '1px solid var(--sap-border-light)', borderRadius: 'var(--sap-radius-md)', padding: '8px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--sap-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('leaderboard.yourRank', { defaultValue: 'Your rank' })}</div>
                  <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 800, fontSize: 18, color: 'var(--sap-text-primary)' }}>
                    <span style={{ color: 'var(--sap-accent)' }}>#{myRank + 1}</span> {t('leaderboard.ofCount', { defaultValue: 'of' })} {members.length}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'inline-flex', background: 'var(--sap-bg-elevated)', border: '1px solid var(--sap-border-light)', borderRadius: 'var(--sap-radius-full)', padding: 4, marginTop: 16, gap: 2 }}>
              {METRICS.map((mx) => (
                <button key={mx.key} onClick={() => setMetric(mx.key)} style={{
                  fontFamily: 'var(--sap-font-body)', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none',
                  padding: '8px 16px', borderRadius: 'var(--sap-radius-full)',
                  background: metric === mx.key ? 'var(--sap-accent)' : 'transparent',
                  color: metric === mx.key ? '#fff' : 'var(--sap-text-secondary)',
                  boxShadow: metric === mx.key ? '0 2px 8px rgba(14,165,233,0.35)' : 'none',
                }}>{mx.label}</button>
              ))}
            </div>
          </div>

          {members.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--sap-text-secondary)' }}>
              {t('leaderboard.empty', { defaultValue: 'No ranked members yet — be the first to climb the board.' })}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))', gap: 12, padding: '20px 24px' }}>
                {top3.map((m, i) => (
                  <PodiumCard key={m.id} m={m} place={i + 1} metric={metric} isYou={m.id === meId} />
                ))}
              </div>

              <div style={{ padding: '0 14px 6px' }}>
                <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 600, fontSize: 13, color: 'var(--sap-text-secondary)', padding: '4px 10px 8px', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <TrendingUp size={15} style={{ color: 'var(--sap-accent)' }} /> {t('leaderboard.fullRankings', { defaultValue: 'Full rankings' })} · <span style={{ color: 'var(--sap-accent)' }}>{t('leaderboard.byMetric', { defaultValue: 'by' })} {activeMetric.label.toLowerCase()}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th colSpan={2} style={thStyle('left')}>{t('leaderboard.member', { defaultValue: 'Member' })}</th>
                        <th className="lb-su" style={thStyle('right')}>{t('leaderboard.signupsLabel', { defaultValue: 'Sign-ups' })}</th>
                        <th style={thStyle('right')}>{t('leaderboard.downline', { defaultValue: 'Downline' })}</th>
                        <th style={thStyle('right')}>{t('leaderboard.income', { defaultValue: 'Income' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m, i) => {
                        const isYou = m.id === meId;
                        return (
                          <tr key={m.id} style={{ background: isYou ? 'var(--sap-accent-bg, #e8f6fe)' : 'transparent' }}>
                            <td style={{ ...tdStyle('center'), width: 42, boxShadow: isYou ? 'inset 3px 0 0 var(--sap-accent)' : 'none' }}>
                              <span style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 700, color: isYou ? 'var(--sap-accent)' : (i < 3 ? 'var(--sap-cobalt-mid)' : 'var(--sap-text-faint)') }}>{i + 1}</span>
                            </td>
                            <td style={tdStyle('left')}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                <Avatar m={m} size={34} ring={isYou} />
                                <div>
                                  <div style={{ fontFamily: 'var(--sap-font-heading)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {m.first_name || m.username}{isYou && <YouTag />}<TierBadge tier={m.membership_tier} />
                                  </div>
                                  <div className="lb-handle" style={{ fontFamily: 'var(--sap-font-mono)', fontSize: 11, color: 'var(--sap-text-faint)' }}>@{m.username}</div>
                                </div>
                              </div>
                            </td>
                            <td className="lb-su" style={{ ...tdStyle('right'), color: metric === 'signups' ? 'var(--sap-accent)' : 'var(--sap-text-primary)' }}>{m.signups.toLocaleString()}</td>
                            <td style={{ ...tdStyle('right'), color: metric === 'downline' ? 'var(--sap-accent)' : 'var(--sap-text-primary)' }}>{m.downline.toLocaleString()}</td>
                            <td style={{ ...tdStyle('right'), fontFamily: 'var(--sap-font-heading)', fontWeight: 700, color: 'var(--sap-green)' }}>${Math.round(m.income).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '16px 24px 22px', background: 'var(--sap-bg-elevated)', borderTop: '1px solid var(--sap-border-light)' }}>
            <Info size={16} style={{ color: 'var(--sap-text-faint)', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--sap-text-secondary)', margin: 0 }}>
              {t('leaderboard.disclaimer', { defaultValue: 'Earnings shown are real and individual. What each member earns depends on the time, effort and skill they put into building their business. Results vary and are not guaranteed.' })}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
