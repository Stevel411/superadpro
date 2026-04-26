/**
 * CommandCentre.jsx — Business management cockpit (Layer 1)
 *
 * Reached from the Command Centre door on /dashboard. Purpose:
 * give members a clear, motivating snapshot of their business.
 *
 * Layout (Layer 1, Apr 2026):
 *   1. Compact cobalt hero (avatar, name, tier, "Your Command Centre")
 *   2. "Your direct referrals" panel — Active / Lapsed / Never paid
 *      (3 stat columns inside one card)
 *   3. "Your income structures" panel — Grid team / Nexus team
 *      (2 stat columns inside one card)
 *   4. "This month earned" outcome card — value + delta vs last month
 *   5. "Manage your business" — 3 outbound action cards
 *      (View team, Send broadcast, Leaderboard)
 *   6. "Performance" — single full-analytics CTA card
 *
 * Layer 1 is read-only — clicking a stat card today navigates to the
 * existing /network page. Layer 2 will add proper drill-down lists,
 * Layer 3 will add per-member actions (message, re-activation email).
 *
 * Translations: all visible strings via t('commandCentre.X'). Namespace
 * exists in all 20 locale files.
 *
 * Backend deps (in /api/dashboard via get_dashboard_context):
 *   directs_active, directs_lapsed, directs_never_paid,
 *   grid_team_count, nexus_team_count,
 *   earnings_this_month, earnings_last_month
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { formatMoney } from '../utils/money';
import { TYPE } from '../styles/typography';
import {
  Users, UserCheck, UserMinus, UserX,
  LayoutGrid, Star,
  DollarSign, TrendingUp, TrendingDown,
  MessageSquare, Award, BarChart3,
  ArrowRight,
} from 'lucide-react';

export default function CommandCentre() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    apiGet('/api/dashboard')
      .then(function(r) { setData(r); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, []);

  if (loading) {
    return (
      <AppLayout title={t('commandCentre.pageTitle')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: 'var(--sap-accent)', animation: 'spin 0.8s linear infinite' }} />
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      </AppLayout>
    );
  }

  const d = data || {};
  const displayName = d.display_name || (user && user.username) || '';

  // ── Three direct-referral buckets ──
  // Layer 1: navigate-only on click. Layer 2 will replace these
  // hrefs with proper drill-down routes per bucket.
  // ─────────────────────────────────────────────────────────────
  // Three direct-referral buckets · adds visible pill affordance
  // ─────────────────────────────────────────────────────────────
  // Each bucket is a clickable column. Until 26 Apr 2026 the click
  // affordance was invisible — the whole column was a Link but nothing
  // told the member they could tap it. Added small coloured pills at
  // the bottom of each column matching the column's brand colour, so
  // members read each column as "this is interactive."
  const directBuckets = [
    {
      label: t('commandCentre.activeDirectsLabel'),
      sublabel: t('commandCentre.activeDirectsSublabel'),
      value: d.directs_active || 0,
      icon: UserCheck,
      color: 'var(--sap-green)',
      link: '/command-centre/directs/active',
      pillBg: '#dcfce7', pillBgHover: '#bbf7d0', pillColor: '#15803d',
      pillLabel: t('commandCentre.viewList', { defaultValue: 'View list' }),
    },
    {
      label: t('commandCentre.lapsedDirectsLabel'),
      sublabel: t('commandCentre.lapsedDirectsSublabel'),
      value: d.directs_lapsed || 0,
      icon: UserMinus,
      color: 'var(--sap-amber-dark)',
      link: '/command-centre/directs/lapsed',
      pillBg: '#fef3c7', pillBgHover: '#fde68a', pillColor: '#b45309',
      pillLabel: t('commandCentre.viewList', { defaultValue: 'View list' }),
    },
    {
      label: t('commandCentre.neverPaidDirectsLabel'),
      sublabel: t('commandCentre.neverPaidDirectsSublabel'),
      value: d.directs_never_paid || 0,
      icon: UserX,
      color: 'var(--sap-text-muted)',
      link: '/command-centre/directs/never-paid',
      pillBg: '#f1f5f9', pillBgHover: '#e2e8f0', pillColor: '#475569',
      pillLabel: t('commandCentre.viewList', { defaultValue: 'View list' }),
    },
  ];

  // ── Two income-structure buckets ──
  const structureBuckets = [
    {
      label: t('commandCentre.gridTeamLabel'),
      sublabel: t('commandCentre.gridTeamSublabel'),
      value: d.grid_team_count || 0,
      icon: LayoutGrid,
      color: 'var(--sap-violet)',
      link: '/command-centre/grid-team',
      pillBg: '#ede9fe', pillBgHover: '#ddd6fe', pillColor: '#6d28d9',
      pillLabel: t('commandCentre.viewTeam', { defaultValue: 'View team' }),
    },
    {
      label: t('commandCentre.nexusTeamLabel'),
      sublabel: t('commandCentre.nexusTeamSublabel'),
      value: d.nexus_team_count || 0,
      icon: Star,
      color: 'var(--sap-indigo)',
      link: '/command-centre/nexus-team',
      pillBg: '#e0e7ff', pillBgHover: '#c7d2fe', pillColor: '#4338ca',
      pillLabel: t('commandCentre.viewTeam', { defaultValue: 'View team' }),
    },
  ];

  // ── Earnings delta computation ──
  const thisMonth = d.earnings_this_month || 0;
  const lastMonth = d.earnings_last_month || 0;
  const deltaAbs = thisMonth - lastMonth;
  // Don't compute percentage if last month was 0 — division by zero
  // produces Infinity which renders as a confusing label.
  const deltaPct = lastMonth > 0 ? (deltaAbs / lastMonth) * 100 : null;
  const deltaPositive = deltaAbs > 0;
  const deltaNegative = deltaAbs < 0;
  const deltaZero = deltaAbs === 0 && lastMonth > 0;
  const deltaColor = deltaPositive ? 'var(--sap-green)' : (deltaNegative ? '#dc2626' : 'var(--sap-text-muted)');

  // ── Outbound action cards (existing pages) ──
  const actions = [
    {
      title: t('commandCentre.viewFullTeamTitle'),
      desc: t('commandCentre.viewFullTeamDesc'),
      link: '/network',
      icon: Users,
      color: 'var(--sap-accent)',
      accentPale: '#cffafe',
      bg: 'linear-gradient(135deg,#ecfeff,#cffafe)',
    },
    {
      title: t('commandCentre.sendBroadcastTitle'),
      desc: t('commandCentre.sendBroadcastDesc'),
      link: '/team-messenger',
      icon: MessageSquare,
      color: 'var(--sap-violet)',
      accentPale: '#ddd6fe',
      bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
    },
    {
      title: t('commandCentre.leaderboardTitle'),
      desc: t('commandCentre.leaderboardDesc'),
      link: '/leaderboard',
      icon: Award,
      color: 'var(--sap-amber-dark)',
      accentPale: '#fed7aa',
      bg: 'linear-gradient(135deg,#fff7ed,#fed7aa)',
    },
  ];

  return (
    <AppLayout title={t('commandCentre.pageTitle')}>

      {/* ── HERO ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--sap-cobalt-deep), var(--sap-cobalt-mid))',
        borderRadius: 18,
        padding: '22px 28px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
        boxShadow: '0 8px 32px rgba(30,58,138,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
          {user && user.avatar_url ? (
            <img src={user.avatar_url} alt=""
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid rgba(255,255,255,0.15)' }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--sap-accent-pale), var(--sap-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 900,
              color: '#fff', flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 14px rgba(14,165,233,0.25)',
            }}>{(displayName || '?').charAt(0).toUpperCase()}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>
              {t('commandCentre.eyebrow')}
            </div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 6, lineHeight: 1.1, letterSpacing: '-0.3px' }}>
              {displayName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.75)', flexWrap: 'wrap' }}>
              {user && user.membership_tier && (
                <span style={{
                  padding: '3px 11px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: 11, fontWeight: 900, letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  color: user.membership_tier === 'pro' ? '#ffd700' : '#d4dce8',
                  textShadow: user.membership_tier === 'pro' ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.3)',
                }}>{user.membership_tier}</span>
              )}
              {d.active_since && (<>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{t('dashboard.activeSince', { defaultValue: 'Active since' })} {d.active_since}</span>
              </>)}
            </div>
          </div>
        </div>
        <Link to="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', textDecoration: 'none',
          fontSize: 13, fontWeight: 700,
        }}>← {t('commandCentre.backToDashboard')}</Link>
      </div>

      {/* ── DIRECT REFERRALS PANEL — 3 columns ───────────────
          Three buckets in one panel because they answer the same
          conceptual question ("how is my direct line composed?").
          Each column is clickable; Layer 1 navigates to /network,
          Layer 2 will route to bucket-filtered drill-downs. */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>
        {t('commandCentre.directsHeader')}
      </div>
      <div className="cc-directs-panel" style={{
        background: 'var(--sap-bg-card)',
        border: '1px solid var(--sap-border)',
        borderRadius: 14,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
      }}>
        {/* Top accent — three-stop gradient blending the bucket colours */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, var(--sap-green), var(--sap-amber-dark), var(--sap-text-muted))',
          borderRadius: '14px 14px 0 0',
        }} />
        {directBuckets.map(function(b, i) {
          const Icon = b.icon;
          const isLast = i === directBuckets.length - 1;
          return (
            <Link key={i} to={b.link} className="cc-bucket" style={{
              padding: '24px 24px 20px',
              borderRight: isLast ? 'none' : '1px solid var(--sap-border-light)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'background 0.15s',
              display: 'flex', flexDirection: 'column',
            }}
            onMouseEnter={(e) => {
              const pill = e.currentTarget.querySelector('.cc-pill');
              if (pill) {
                pill.style.background = b.pillBgHover;
                const arrow = pill.querySelector('.cc-pill-arrow');
                if (arrow) { arrow.style.transform = 'translateX(2px)'; arrow.style.opacity = '1'; }
              }
            }}
            onMouseLeave={(e) => {
              const pill = e.currentTarget.querySelector('.cc-pill');
              if (pill) {
                pill.style.background = b.pillBg;
                const arrow = pill.querySelector('.cc-pill-arrow');
                if (arrow) { arrow.style.transform = 'translateX(0)'; arrow.style.opacity = '0.65'; }
              }
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="#fff" />
                </div>
                <div style={{...TYPE.cardTitleBold, fontSize: 14}}>{b.label}</div>
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 900, color: b.color, lineHeight: 1, marginBottom: 6 }}>
                {b.value}
              </div>
              <div style={{...TYPE.bodyMuted, marginBottom: 14, flex: 1}}>{b.sublabel}</div>
              {/* Pill — visible click affordance with hover transition */}
              <span className="cc-pill" style={{
                alignSelf: 'flex-start',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '6px 12px',
                borderRadius: 99,
                fontSize: 12, fontWeight: 700,
                background: b.pillBg,
                color: b.pillColor,
                transition: 'background 0.12s',
              }}>
                {b.pillLabel}
                <span className="cc-pill-arrow" style={{
                  fontSize: 11, opacity: 0.65,
                  transition: 'transform 0.12s, opacity 0.12s',
                  display: 'inline-block',
                }}>→</span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* ── INCOME STRUCTURES PANEL — 2 columns ───────────── */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>
        {t('commandCentre.structuresHeader')}
      </div>
      <div className="cc-structures-panel" style={{
        background: 'var(--sap-bg-card)',
        border: '1px solid var(--sap-border)',
        borderRadius: 14,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, var(--sap-violet), var(--sap-indigo))',
          borderRadius: '14px 14px 0 0',
        }} />
        {structureBuckets.map(function(b, i) {
          const Icon = b.icon;
          const isLast = i === structureBuckets.length - 1;
          return (
            <Link key={i} to={b.link} className="cc-bucket" style={{
              padding: '24px 24px 20px',
              borderRight: isLast ? 'none' : '1px solid var(--sap-border-light)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'background 0.15s',
              display: 'flex', flexDirection: 'column',
            }}
            onMouseEnter={(e) => {
              const pill = e.currentTarget.querySelector('.cc-pill');
              if (pill) {
                pill.style.background = b.pillBgHover;
                const arrow = pill.querySelector('.cc-pill-arrow');
                if (arrow) { arrow.style.transform = 'translateX(2px)'; arrow.style.opacity = '1'; }
              }
            }}
            onMouseLeave={(e) => {
              const pill = e.currentTarget.querySelector('.cc-pill');
              if (pill) {
                pill.style.background = b.pillBg;
                const arrow = pill.querySelector('.cc-pill-arrow');
                if (arrow) { arrow.style.transform = 'translateX(0)'; arrow.style.opacity = '0.65'; }
              }
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="#fff" />
                </div>
                <div style={{...TYPE.cardTitleBold, fontSize: 14}}>{b.label}</div>
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 900, color: b.color, lineHeight: 1, marginBottom: 6 }}>
                {b.value}
              </div>
              <div style={{...TYPE.bodyMuted, marginBottom: 14, flex: 1}}>{b.sublabel}</div>
              <span className="cc-pill" style={{
                alignSelf: 'flex-start',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '6px 12px',
                borderRadius: 99,
                fontSize: 12, fontWeight: 700,
                background: b.pillBg,
                color: b.pillColor,
                transition: 'background 0.12s',
              }}>
                {b.pillLabel}
                <span className="cc-pill-arrow" style={{
                  fontSize: 11, opacity: 0.65,
                  transition: 'transform 0.12s, opacity 0.12s',
                  display: 'inline-block',
                }}>→</span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* ── EARNINGS THIS MONTH WITH DELTA ───────────────────
          Single full-width card. Big number on the left, delta vs
          last month on the right with up/down arrow + colour. The
          delta is the real "is my business growing?" answer. */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>
        {t('commandCentre.performanceHeader')}
      </div>
      <div className="stream-card" style={{
        background: 'var(--sap-bg-card)',
        border: '1px solid var(--sap-border)',
        borderRadius: 14,
        padding: 24,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, var(--sap-amber-dark), #fed7aa)',
          borderRadius: '14px 14px 0 0',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--sap-amber-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={24} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{...TYPE.cardTitleBold, fontSize: 14, marginBottom: 4}}>{t('commandCentre.earningsThisMonth')}</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 36, fontWeight: 900, color: 'var(--sap-amber-dark)', lineHeight: 1, marginBottom: 4 }}>
              ${formatMoney(thisMonth)}
            </div>
            <div style={TYPE.bodyMuted}>{t('commandCentre.earningsThisMonthSublabel')}</div>
          </div>
        </div>
        {/* Delta badge — only show meaningful delta (not when both months are 0) */}
        {(thisMonth > 0 || lastMonth > 0) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 18px', borderRadius: 12,
            background: deltaPositive ? 'rgba(22,163,74,0.08)' : (deltaNegative ? 'rgba(220,38,38,0.08)' : 'rgba(122,136,153,0.08)'),
            border: '1px solid ' + (deltaPositive ? 'rgba(22,163,74,0.2)' : (deltaNegative ? 'rgba(220,38,38,0.2)' : 'rgba(122,136,153,0.2)')),
          }}>
            {deltaPositive && <TrendingUp size={20} color={deltaColor} />}
            {deltaNegative && <TrendingDown size={20} color={deltaColor} />}
            <div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 900, color: deltaColor, lineHeight: 1.1 }}>
                {deltaZero
                  ? t('commandCentre.sameAsLastMonth')
                  : (deltaPositive ? '+' : '') + (deltaPct !== null ? deltaPct.toFixed(0) + '%' : '$' + formatMoney(Math.abs(deltaAbs)))}
              </div>
              {!deltaZero && (
                <div style={{...TYPE.bodyMuted, fontSize: 12, marginTop: 2}}>
                  {t('commandCentre.vsLastMonth')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MANAGE BUSINESS — 3 outbound action cards ────── */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>
        {t('commandCentre.manageHeader')}
      </div>
      <div className="cc-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {actions.map(function(a, i) {
          const Icon = a.icon;
          return (
            <Link key={i} to={a.link} className="action-card" style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: 24,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
              textDecoration: 'none',
              transition: 'all 0.15s',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                background: 'linear-gradient(90deg, ' + a.color + ', ' + a.accentPale + ')',
                borderRadius: '14px 14px 0 0',
              }} />
              <div style={{ width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.bg }}>
                <Icon size={24} color={a.color} />
              </div>
              <div style={TYPE.cardTitleBold}>{a.title}</div>
              <div style={{...TYPE.body, color: '#475569', lineHeight: 1.5, flex: 1}}>{a.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: a.color, fontSize: 13, fontWeight: 700, paddingTop: 6, borderTop: '1px solid var(--sap-border-light)' }}>
                {t('commandCentre.open')} <ArrowRight size={14} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── FULL ANALYTICS LINK ─────────────────────────── */}
      <Link to="/analytics" className="action-card" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        background: '#fff',
        border: '1px solid var(--sap-border)',
        borderRadius: 14,
        padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        textDecoration: 'none',
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, var(--sap-indigo), #c7d2fe)',
          borderRadius: '14px 14px 0 0',
        }} />
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BarChart3 size={24} color="var(--sap-indigo)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={TYPE.cardTitleBold}>{t('commandCentre.fullAnalyticsTitle')}</div>
          <div style={{...TYPE.bodyMuted, marginTop: 4}}>{t('commandCentre.fullAnalyticsDesc')}</div>
        </div>
        <div style={{ color: 'var(--sap-indigo)', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {t('commandCentre.view')} <ArrowRight size={14} />
        </div>
      </Link>

      {/* ── RESPONSIVE ─────────────────────────────────────
          Same 767px breakpoint as the rest of the platform.
          Directs panel: 3 cols → 1 col on mobile.
          Structures panel: 2 cols → 1 col on mobile.
          Actions grid: 3 cols → 1 col on mobile. */}
      <style>{`
        .cc-bucket:hover { background: var(--sap-bg-hover, #f8fafc); }
        @media(max-width: 767px) {
          .cc-directs-panel { grid-template-columns: 1fr !important; }
          .cc-structures-panel { grid-template-columns: 1fr !important; }
          .cc-actions-grid { grid-template-columns: 1fr !important; }
        }
        @media(max-width: 767px) {
          .cc-directs-panel > a,
          .cc-structures-panel > a {
            border-right: none !important;
            border-bottom: 1px solid var(--sap-border-light);
          }
          .cc-directs-panel > a:last-child,
          .cc-structures-panel > a:last-child {
            border-bottom: none;
          }
        }
      `}</style>
    </AppLayout>
  );
}
