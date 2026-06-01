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
 * team-messenger (for full team list and messaging). Layer 2 will add
 * proper drill-down lists, Layer 3 will add per-member actions (message,
 * re-activation email). The old /network page was retired Apr 2026 once
 * Command Centre + Income door + Wallet covered everything it showed.
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
import { SubPageHero } from './tools-shared';
import {
  UserCheck, UserMinus, UserX,
  LayoutGrid, Star,
  DollarSign, TrendingUp, TrendingDown,
  MessageSquare, Award, BarChart3,
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
      color: 'var(--sap-accent)',
      link: '/command-centre/grid-team',
      pillBg: '#e0f2fe', pillBgHover: '#bae6fd', pillColor: '#0369a1',
      pillLabel: t('commandCentre.viewTeam', { defaultValue: 'View team' }),
    },
    {
      label: t('commandCentre.nexusTeamLabel'),
      sublabel: t('commandCentre.nexusTeamSublabel'),
      value: d.nexus_team_count || 0,
      icon: Star,
      color: 'var(--sap-royal, #1e3a8a)',
      link: '/command-centre/nexus-team',
      pillBg: '#ecfeff', pillBgHover: '#a5f3fc', pillColor: '#0e7490',
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
      title: t('commandCentre.fullAnalyticsTitle'),
      desc: t('commandCentre.fullAnalyticsDesc'),
      link: '/analytics',
      icon: BarChart3,
      color: 'var(--sap-royal, #1e3a8a)',
      accentPale: '#a5f3fc',
      bg: 'linear-gradient(135deg,#f0f9ff,#ecfeff)',
      pillBg: '#ecfeff', pillBgHover: '#a5f3fc', pillColor: '#0e7490',
    },
    {
      title: t('commandCentre.sendBroadcastTitle'),
      desc: t('commandCentre.sendBroadcastDesc'),
      link: '/team-messenger',
      icon: MessageSquare,
      color: 'var(--sap-accent)',
      accentPale: '#bae6fd',
      bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
      pillBg: '#e0f2fe', pillBgHover: '#bae6fd', pillColor: '#0369a1',
    },
    {
      title: t('commandCentre.leaderboardTitle'),
      desc: t('commandCentre.leaderboardDesc'),
      link: '/leaderboard',
      icon: Award,
      color: 'var(--sap-amber-dark)',
      accentPale: '#fed7aa',
      bg: 'linear-gradient(135deg,#fff7ed,#fed7aa)',
      pillBg: '#fef3c7', pillBgHover: '#fde68a', pillColor: '#b45309',
    },
  ];

  return (
    <AppLayout title={t('commandCentre.pageTitle')}>

      {/* ── HERO (shared Dashboard-style component) ──────────
          Was an inline custom hero very close to but not identical
          to the shared SubPageHero. Swapped 26 Apr 2026 so Command
          Centre matches Dashboard, Income, Tools, and Learn — single
          hero language across the platform, including the small
          Back to Dashboard pill adjacent to the referral link pill. */}
      <SubPageHero
        user={user}
        t={t}
        eyebrowKey="commandCentre.eyebrow"
        eyebrowDefault="Your Performance"
      />

      {/* ── PERFORMANCE SNAPSHOT — Earnings + Network strips ─────
          Moved from Dashboard 7 May 2026 (Steve's IA call). Dashboard
          became action-only (8 cards: EXPLORE + QUICK ACTIONS) so
          analytics belong here, where members come to ask "how am I
          performing?". Two strips: earnings by stream, then team
          metrics. Same data binding as before — both pull from
          /api/dashboard which Command Centre already loads. */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14, marginTop: 4 }}>
        {t('commandCentre.performanceSnapshot', { defaultValue: 'Performance Snapshot' })}
      </div>

      {/* Sub-label: earnings */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--sap-text-faint)', marginBottom: 10 }}>
        {t('dashboard.earningsStrip', { defaultValue: 'Your earnings this month' })}
      </div>
      <div className="cc-earnings-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { color: 'var(--sap-green)',       val: d.membership_earned,            name: t('dashboard.membership') },
          { color: 'var(--sap-amber-dark)',  val: d.grid_earned || 0,             name: t('dashboard.campaigns') },
          { color: 'var(--sap-cyan, #06b6d4)',      val: d.creative_studio_earned || 0,  name: t('dashboard.creditNexus', { defaultValue: 'Creator Credits' }) },
          { color: 'var(--sap-accent)',      val: d.course_earnings || 0,         name: t('dashboard.courseIncome', { defaultValue: 'Courses' }) },
        ].map(function(s, i) { return (
          <div key={i} style={{
            background: '#fff',
            border: '1px solid var(--sap-border)',
            borderRadius: 10,
            padding: '14px 16px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: s.color }} />
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px', color: 'var(--sap-green)' }}>
              ${formatMoney(s.val)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-text-muted)', marginTop: 2 }}>
              {s.name}
            </div>
          </div>
        ); })}
      </div>

      {/* Sub-label: network */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--sap-text-faint)', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{t('dashboard.yourNetwork')}</span>
        <Link to="/courses/commissions" style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-accent)', textDecoration: 'none', textTransform: 'none', letterSpacing: 0 }}>
          {t('dashboard.fullNetwork')} →
        </Link>
      </div>
      <div className="cc-network-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { color: 'var(--sap-green)',      val: d.direct_referrals_count || 0,                    name: t('dashboard.directReferrals'),                                          isMoney: false, sub: null },
          { color: 'var(--sap-accent)',     val: (d.network_active != null ? d.network_active : (d.total_team || 0)),
            name: t('dashboard.activeNetwork', { defaultValue: 'Active Network' }),
            isMoney: false,
            sub: (d.network_inactive != null && d.network_inactive > 0)
              ? t('dashboard.inactiveNetworkSub', { defaultValue: '+ {{n}} inactive', n: d.network_inactive })
              : null
          },
          { color: 'var(--sap-amber-dark)', val: '$' + formatMoney(d.total_earned),                name: t('dashboard.lifetimeEarned'),                                           isMoney: true,  sub: null },
          { color: 'var(--sap-cyan, #06b6d4)',     val: '$' + formatMoney(d.earnings_this_month || 0),    name: t('dashboard.monthlyEarned', { defaultValue: 'This Month' }),            isMoney: true,  sub: null },
        ].map(function(s, i) { return (
          <div key={i} style={{
            background: '#fff',
            border: '1px solid var(--sap-border)',
            borderRadius: 10,
            padding: '14px 16px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: s.color }} />
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px', color: s.isMoney ? 'var(--sap-green)' : 'var(--sap-text-primary)' }}>
              {s.val}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-text-muted)', marginTop: 2 }}>
              {s.name}
            </div>
            {s.sub && (
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--sap-text-faint)', marginTop: 2 }}>
                {s.sub}
              </div>
            )}
          </div>
        ); })}
      </div>

      {/* ── DIRECT REFERRALS PANEL — 3 columns ───────────────
          Three buckets in one panel because they answer the same
          conceptual question ("how is my direct line composed?").
          Each column is clickable; Layer 1 navigates to team-messenger,
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
        {/* No parent top stripe — each column carries its own left-edge accent
            below, which reads as "this is the active lane / lapsed lane / never
            paid lane" rather than a horizontal decorative band. */}
        {directBuckets.map(function(b, i) {
          const Icon = b.icon;
          const isLast = i === directBuckets.length - 1;
          return (
            <Link key={i} to={b.link} className="cc-bucket" style={{
              padding: '24px 24px 20px 28px',
              borderRight: isLast ? 'none' : '1px solid var(--sap-border-light)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'background 0.15s',
              display: 'flex', flexDirection: 'column',
              position: 'relative',
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
              {/* Left-edge accent stripe — column reads as a coloured "lane" */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, left: 0, width: 4,
                background: b.color,
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="#fff" />
                </div>
                <div style={{...TYPE.cardTitleBold, fontSize: 18}}>{b.label}</div>
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
        {/* No parent top stripe — each column carries its own left-edge accent. */}
        {structureBuckets.map(function(b, i) {
          const Icon = b.icon;
          const isLast = i === structureBuckets.length - 1;
          return (
            <Link key={i} to={b.link} className="cc-bucket" style={{
              padding: '24px 24px 20px 28px',
              borderRight: isLast ? 'none' : '1px solid var(--sap-border-light)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'background 0.15s',
              display: 'flex', flexDirection: 'column',
              position: 'relative',
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
              {/* Left-edge accent stripe */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, left: 0, width: 4,
                background: b.color,
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="#fff" />
                </div>
                <div style={{...TYPE.cardTitleBold, fontSize: 18}}>{b.label}</div>
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
        padding: '24px 24px 24px 28px',
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
        {/* Left-edge accent stripe in the Performance card's amber brand colour */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: 4,
          background: 'var(--sap-amber-dark)',
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
              padding: '24px 24px 24px 28px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
              textDecoration: 'none',
              transition: 'all 0.15s',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              const pill = e.currentTarget.querySelector('.cc-pill');
              if (pill) {
                pill.style.background = a.pillBgHover;
                const arrow = pill.querySelector('.cc-pill-arrow');
                if (arrow) { arrow.style.transform = 'translateX(2px)'; arrow.style.opacity = '1'; }
              }
            }}
            onMouseLeave={(e) => {
              const pill = e.currentTarget.querySelector('.cc-pill');
              if (pill) {
                pill.style.background = a.pillBg;
                const arrow = pill.querySelector('.cc-pill-arrow');
                if (arrow) { arrow.style.transform = 'translateX(0)'; arrow.style.opacity = '0.65'; }
              }
            }}>
              {/* Left-edge accent in card brand colour */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0, left: 0, width: 4,
                background: a.color,
              }} />
              <div style={{ width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.bg }}>
                <Icon size={24} color={a.color} />
              </div>
              <div style={TYPE.cardTitleBold}>{a.title}</div>
              <div style={{...TYPE.body, color: '#475569', lineHeight: 1.5, flex: 1}}>{a.desc}</div>
              <div style={{ paddingTop: 14, borderTop: '1px solid var(--sap-border-light)' }}>
                <span className="cc-pill" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px',
                  borderRadius: 99,
                  fontSize: 12, fontWeight: 700,
                  background: a.pillBg,
                  color: a.pillColor,
                  transition: 'background 0.12s',
                }}>
                  {t('commandCentre.open')}
                  <span className="cc-pill-arrow" style={{
                    fontSize: 11, opacity: 0.65,
                    transition: 'transform 0.12s, opacity 0.12s',
                    display: 'inline-block',
                  }}>→</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

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
