/**
 * CommandCentre.jsx — Performance (business analytics) page
 *
 * Reached as "Performance" from the Business Hub (/business-hub) and at
 * /command-centre. A clear snapshot of how the member's business is
 * performing, plus drill-downs into their team.
 *
 * Layout (1 Jun 2026, Steve):
 *   1. Performance snapshot — one KPI row (This month w/ delta vs last
 *      month, Lifetime earned, Active network, Direct referrals) + a
 *      compact earnings-by-stream row.
 *   2. Your team — 4-up row: Active / Lapsed / Never paid / In your Grid.
 *   3. Manage your business — 3-up row: Creator Credits + Send broadcast
 *      + See leaderboard (balanced, no void). Full Analytics moved up to
 *      the Business Hub as its own card.
 *   De-ambered (amber accents → cobalt/cyan/green); red kept only for a
 *   genuinely negative month-on-month delta.
 *
 * Backend deps (in /api/dashboard via get_dashboard_context):
 *   directs_active, directs_lapsed, directs_never_paid,
 *   grid_team_count, nexus_team_count,
 *   earnings_this_month, earnings_last_month, total_earned,
 *   membership_earned, grid_earned, creative_studio_earned,
 *   course_earnings, direct_referrals_count, network_active,
 *   network_inactive, total_team
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
  TrendingUp, TrendingDown,
  MessageSquare, Award,
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

  // ── Earnings delta vs last month ──
  const thisMonth = d.earnings_this_month || 0;
  const lastMonth = d.earnings_last_month || 0;
  const deltaAbs = thisMonth - lastMonth;
  const deltaPct = lastMonth > 0 ? (deltaAbs / lastMonth) * 100 : null;
  const deltaPositive = deltaAbs > 0;
  const deltaNegative = deltaAbs < 0;
  const deltaZero = deltaAbs === 0 && lastMonth > 0;
  const deltaColor = deltaPositive ? 'var(--sap-green)' : (deltaNegative ? '#dc2626' : 'var(--sap-text-muted)');

  const networkActive = (d.network_active != null ? d.network_active : (d.total_team || 0));
  const kpis = [
    { label: t('commandCentre.earningsThisMonth', { defaultValue: 'Earned this month' }), value: '$' + formatMoney(thisMonth), accent: 'var(--sap-green)', money: true, delta: true },
    { label: t('dashboard.lifetimeEarned', { defaultValue: 'Lifetime earned' }), value: '$' + formatMoney(d.total_earned), accent: 'var(--sap-accent)', money: true },
    { label: t('dashboard.activeNetwork', { defaultValue: 'Active network' }), value: networkActive, accent: 'var(--sap-royal, #1e3a8a)', money: false,
      sub: (d.network_inactive != null && d.network_inactive > 0) ? t('dashboard.inactiveNetworkSub', { defaultValue: '+ {{n}} inactive', n: d.network_inactive }) : null },
    { label: t('dashboard.directReferrals', { defaultValue: 'Direct referrals' }), value: (d.direct_referrals_count || 0), accent: 'var(--sap-cyan, #06b6d4)', money: false },
  ];

  const streams = [
    { color: 'var(--sap-green)',          val: d.membership_earned,           name: t('dashboard.membership') },
    { color: 'var(--sap-royal, #1e3a8a)', val: d.grid_earned || 0,            name: t('dashboard.campaigns') },
    { color: 'var(--sap-cyan, #06b6d4)',  val: d.creative_studio_earned || 0, name: t('dashboard.creditNexus', { defaultValue: 'Creator Credits' }) },
    { color: 'var(--sap-accent)',         val: d.course_earnings || 0,        name: t('dashboard.courseIncome', { defaultValue: 'Courses' }) },
  ];

  // ── Direct + grid tiles (the 4-up team row) ──
  const directTiles = [
    {
      label: t('commandCentre.activeDirectsLabel'), sublabel: t('commandCentre.activeDirectsSublabel'),
      value: d.directs_active || 0, icon: UserCheck, color: 'var(--sap-green)',
      link: '/command-centre/directs/active',
      pillBg: '#dcfce7', pillBgHover: '#bbf7d0', pillColor: '#15803d',
      pillLabel: t('commandCentre.viewList', { defaultValue: 'View list' }),
    },
    {
      label: t('commandCentre.lapsedDirectsLabel'), sublabel: t('commandCentre.lapsedDirectsSublabel'),
      value: d.directs_lapsed || 0, icon: UserMinus, color: '#0891b2',
      link: '/command-centre/directs/lapsed',
      pillBg: '#ecfeff', pillBgHover: '#cffafe', pillColor: '#0e7490',
      pillLabel: t('commandCentre.viewList', { defaultValue: 'View list' }),
    },
    {
      label: t('commandCentre.neverPaidDirectsLabel'), sublabel: t('commandCentre.neverPaidDirectsSublabel'),
      value: d.directs_never_paid || 0, icon: UserX, color: '#94a3b8',
      link: '/command-centre/directs/never-paid',
      pillBg: '#f1f5f9', pillBgHover: '#e2e8f0', pillColor: '#475569',
      pillLabel: t('commandCentre.viewList', { defaultValue: 'View list' }),
    },
    {
      label: t('commandCentre.gridTeamLabel'), sublabel: t('commandCentre.gridTeamSublabel'),
      value: d.grid_team_count || 0, icon: LayoutGrid, color: 'var(--sap-accent)',
      link: '/command-centre/grid-team',
      pillBg: '#e0f2fe', pillBgHover: '#bae6fd', pillColor: '#0369a1',
      pillLabel: t('commandCentre.viewTeam', { defaultValue: 'View team' }),
    },
  ];

  // ── Creator Credits tile — moved into the Manage row to fill the void
  //    left by removing the Full Analytics card (now on the Business Hub). ──
  const creatorCreditsTile = {
    label: t('commandCentre.nexusTeamLabel'), sublabel: t('commandCentre.nexusTeamSublabel'),
    value: d.nexus_team_count || 0, icon: Star, color: 'var(--sap-royal, #1e3a8a)',
    link: '/command-centre/nexus-team',
    pillBg: '#e0e7ff', pillBgHover: '#c7d2fe', pillColor: '#1e3a8a',
    pillLabel: t('commandCentre.viewTeam', { defaultValue: 'View team' }),
  };

  // ── Manage actions (Full Analytics removed → Business Hub) ──
  const actions = [
    {
      title: t('commandCentre.sendBroadcastTitle'), desc: t('commandCentre.sendBroadcastDesc'),
      link: '/team-messenger', icon: MessageSquare, color: 'var(--sap-accent)',
      bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
      pillBg: '#e0f2fe', pillBgHover: '#bae6fd', pillColor: '#0369a1',
    },
    {
      title: t('commandCentre.leaderboardTitle'), desc: t('commandCentre.leaderboardDesc'),
      link: '/leaderboard', icon: Award, color: '#0891b2',
      bg: 'linear-gradient(135deg,#f0f9ff,#ecfeff)',
      pillBg: '#ecfeff', pillBgHover: '#cffafe', pillColor: '#0e7490',
    },
  ];

  const sectionLabel = { fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14, marginTop: 4 };
  const subLabel = { fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--sap-text-faint)', marginBottom: 10 };

  return (
    <AppLayout title={t('commandCentre.pageTitle')}>

      <SubPageHero
        user={user}
        t={t}
        eyebrowKey="commandCentre.eyebrow"
        eyebrowDefault="Your Performance"
      />

      {/* ═══ 1 · PERFORMANCE SNAPSHOT ═══ */}
      <div style={sectionLabel}>
        {t('commandCentre.performanceSnapshot', { defaultValue: 'Performance snapshot' })}
      </div>

      <div className="cc-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {kpis.map(function(k, i) { return (
          <div key={i} style={{ background: '#fff', border: '1px solid var(--sap-border)', borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: k.accent }} />
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px', color: k.money ? 'var(--sap-green)' : 'var(--sap-text-primary)' }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sap-text-muted)', marginTop: 4 }}>{k.label}</div>
            {k.sub && <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--sap-text-faint)', marginTop: 2 }}>{k.sub}</div>}
            {k.delta && (thisMonth > 0 || lastMonth > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, fontWeight: 700, color: deltaColor }}>
                {deltaPositive && <TrendingUp size={13} />}
                {deltaNegative && <TrendingDown size={13} />}
                <span>
                  {deltaZero
                    ? t('commandCentre.sameAsLastMonth')
                    : (deltaPositive ? '+' : '') + (deltaPct !== null ? deltaPct.toFixed(0) + '%' : '$' + formatMoney(Math.abs(deltaAbs)))}
                </span>
                {!deltaZero && <span style={{ color: 'var(--sap-text-faint)', fontWeight: 500 }}>{t('commandCentre.vsLastMonth')}</span>}
              </div>
            )}
          </div>
        ); })}
      </div>

      <div style={subLabel}>{t('dashboard.earningsStrip', { defaultValue: 'Your earnings by stream' })}</div>
      <div className="cc-earn" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {streams.map(function(s, i) { return (
          <div key={i} style={{ background: '#fff', border: '1px solid var(--sap-border)', borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: s.color }} />
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px', color: 'var(--sap-green)' }}>
              ${formatMoney(s.val)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-text-muted)', marginTop: 2 }}>{s.name}</div>
          </div>
        ); })}
      </div>

      {/* ═══ 2 · YOUR TEAM (4-up) ═══ */}
      <div style={sectionLabel}>{t('commandCentre.teamHeader', { defaultValue: 'Your team' })}</div>
      <div className="cc-team" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {directTiles.map(function(b, i) { return <TeamTile key={i} b={b} />; })}
      </div>

      {/* ═══ 3 · MANAGE (3-up: Creator Credits + Broadcast + Leaderboard) ═══ */}
      <div style={sectionLabel}>{t('commandCentre.manageHeader')}</div>
      <div className="cc-manage" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        <TeamTile b={creatorCreditsTile} />
        {actions.map(function(a, i) { return <ActionCard key={i} a={a} openLabel={t('commandCentre.open')} />; })}
      </div>

      <style>{`
        .cc-bucket:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(23,37,84,0.12); }
        .action-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(23,37,84,0.12); }
        @media(max-width: 767px) {
          .cc-kpi { grid-template-columns: repeat(2,1fr) !important; }
          .cc-earn { grid-template-columns: repeat(2,1fr) !important; }
          .cc-team { grid-template-columns: repeat(2,1fr) !important; }
          .cc-manage { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AppLayout>
  );
}

// ── A clickable team/structure tile (icon + label + big number + pill) ──
function TeamTile({ b }) {
  const Icon = b.icon;
  return (
    <Link to={b.link} className="cc-bucket" style={{
      background: '#fff', border: '1px solid var(--sap-border)', borderRadius: 14,
      padding: '18px 18px 16px 20px', textDecoration: 'none', color: 'inherit',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 4px 14px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
    onMouseEnter={(e) => { const p = e.currentTarget.querySelector('.cc-pill'); if (p) { p.style.background = b.pillBgHover; const a = p.querySelector('.cc-pill-arrow'); if (a) { a.style.transform = 'translateX(2px)'; a.style.opacity = '1'; } } }}
    onMouseLeave={(e) => { const p = e.currentTarget.querySelector('.cc-pill'); if (p) { p.style.background = b.pillBg; const a = p.querySelector('.cc-pill-arrow'); if (a) { a.style.transform = 'translateX(0)'; a.style.opacity = '0.65'; } } }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, background: b.color }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} color="#fff" />
        </div>
        <div style={{ ...TYPE.cardTitleBold, fontSize: 15 }}>{b.label}</div>
      </div>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 900, color: b.color, lineHeight: 1, marginBottom: 5 }}>
        {b.value}
      </div>
      <div style={{ ...TYPE.bodyMuted, fontSize: 13, marginBottom: 12, flex: 1 }}>{b.sublabel}</div>
      <span className="cc-pill" style={{
        alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 700,
        background: b.pillBg, color: b.pillColor, transition: 'background 0.12s',
      }}>
        {b.pillLabel}
        <span className="cc-pill-arrow" style={{ fontSize: 11, opacity: 0.65, transition: 'transform 0.12s, opacity 0.12s', display: 'inline-block' }}>→</span>
      </span>
    </Link>
  );
}

// ── An outbound action card (icon + title + description + Open pill) ──
function ActionCard({ a, openLabel }) {
  const Icon = a.icon;
  return (
    <Link to={a.link} className="action-card" style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
      padding: '20px 20px 18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 4px 14px rgba(0,0,0,0.05)',
      textDecoration: 'none', transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
      gap: 10, position: 'relative', overflow: 'hidden',
    }}
    onMouseEnter={(e) => { const p = e.currentTarget.querySelector('.cc-pill'); if (p) { p.style.background = a.pillBgHover; const ar = p.querySelector('.cc-pill-arrow'); if (ar) { ar.style.transform = 'translateX(2px)'; ar.style.opacity = '1'; } } }}
    onMouseLeave={(e) => { const p = e.currentTarget.querySelector('.cc-pill'); if (p) { p.style.background = a.pillBg; const ar = p.querySelector('.cc-pill-arrow'); if (ar) { ar.style.transform = 'translateX(0)'; ar.style.opacity = '0.65'; } } }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, background: a.color }} />
      <div style={{ width: 48, height: 48, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.bg }}>
        <Icon size={22} color={a.color} />
      </div>
      <div style={TYPE.cardTitleBold}>{a.title}</div>
      <div style={{ ...TYPE.body, color: '#475569', lineHeight: 1.5, flex: 1 }}>{a.desc}</div>
      <span className="cc-pill" style={{
        alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 700,
        background: a.pillBg, color: a.pillColor, transition: 'background 0.12s',
      }}>
        {openLabel}
        <span className="cc-pill-arrow" style={{ fontSize: 11, opacity: 0.65, transition: 'transform 0.12s, opacity 0.12s', display: 'inline-block' }}>→</span>
      </span>
    </Link>
  );
}
