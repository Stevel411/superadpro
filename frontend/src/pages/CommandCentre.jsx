/**
 * CommandCentre.jsx — Business management cockpit
 *
 * The destination behind the "Command Centre" door on the Dashboard.
 * Purpose: cockpit view of your business — team summary, performance
 * snapshot, and quick links to deeper management pages.
 *
 * Layout (from agreed spec):
 *   1. Compact hero (mirrors Dashboard hero, eyebrow says "Your Command Centre")
 *   2. Team summary — 4 stat cards
 *   3. Quick actions — 3 cards linking out to /network, /team-messenger, /leaderboard
 *   4. Performance preview — link out to /analytics
 *
 * Backend deps: /api/dashboard now returns active_team_members and
 * earnings_this_month (added in main.py get_dashboard_context).
 *
 * Reuses platform CSS variables only (design-tokens.css) — no new colours.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { formatMoney } from '../utils/money';
import { TYPE } from '../styles/typography';
import { Users, UserCheck, DollarSign, TrendingUp, MessageSquare, Award, BarChart3, ArrowRight } from 'lucide-react';

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
      <AppLayout title="Command Centre">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: 'var(--sap-accent)', animation: 'spin 0.8s linear infinite' }} />
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      </AppLayout>
    );
  }

  const d = data || {};

  // ── Stat card config — 4 cards, identical pattern to Dashboard income streams ──
  const stats = [
    {
      label: 'Personal referrals',
      value: d.personal_referrals || 0,
      icon: Users,
      color: 'var(--sap-accent)',
      accentPale: '#cffafe',
      sublabel: 'people you signed up directly',
    },
    {
      label: 'Active members',
      value: d.active_team_members || 0,
      icon: UserCheck,
      color: 'var(--sap-green)',
      accentPale: '#bbf7d0',
      sublabel: 'currently paying members',
    },
    {
      label: 'Total team',
      value: d.total_team || 0,
      icon: TrendingUp,
      color: 'var(--sap-violet)',
      accentPale: '#ddd6fe',
      sublabel: 'across your whole network',
    },
    {
      label: 'This month earned',
      value: '$' + formatMoney(d.earnings_this_month || 0),
      icon: DollarSign,
      color: 'var(--sap-amber-dark)',
      accentPale: '#fed7aa',
      sublabel: 'commissions this calendar month',
      isCurrency: true,
    },
  ];

  // ── Quick action links — link OUT to existing pages ──
  const actions = [
    {
      title: 'View full team',
      desc: 'See everyone in your network with status, signup dates, and commissions earned.',
      link: '/network',
      icon: Users,
      color: 'var(--sap-accent)',
      accentPale: '#cffafe',
      bg: 'linear-gradient(135deg,#ecfeff,#cffafe)',
    },
    {
      title: 'Send a broadcast',
      desc: 'Message your whole team at once — announcements, motivation, training updates.',
      link: '/team-messenger',
      icon: MessageSquare,
      color: 'var(--sap-violet)',
      accentPale: '#ddd6fe',
      bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
    },
    {
      title: 'See leaderboard',
      desc: 'Ranking across the whole platform by referrals, grid completions, and course sales.',
      link: '/leaderboard',
      icon: Award,
      color: 'var(--sap-amber-dark)',
      accentPale: '#fed7aa',
      bg: 'linear-gradient(135deg,#fff7ed,#fed7aa)',
    },
  ];

  const displayName = d.display_name || (user && user.username) || '';

  return (
    <AppLayout title="Command Centre">

      {/* ── HERO ────────────────────────────────────────────
          Compact cobalt hero, same pattern as Dashboard. Eyebrow
          identifies WHICH room we're in ("Your Command Centre"). */}
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
          {/* Avatar — uploaded image or initial */}
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
              Your Command Centre
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
                <span>Active since {d.active_since}</span>
              </>)}
            </div>
          </div>
        </div>
        {/* Right side — back to Dashboard link */}
        <Link to="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', textDecoration: 'none',
          fontSize: 13, fontWeight: 700,
        }}>← Back to Dashboard</Link>
      </div>

      {/* ── TEAM SUMMARY STATS ─────────────────────────────
          4 stat cards in a row. Pattern matches Dashboard
          income-stream cards: 4px coloured top accent bar,
          icon tile, value (Sora 900), label, sublabel. */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>
        Your business at a glance
      </div>
      <div className="cc-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {stats.map(function(s, i) {
          const Icon = s.icon;
          return (
            <div key={i} className="stream-card" style={{
              background: 'var(--sap-bg-card)',
              border: '1px solid var(--sap-border)',
              borderRadius: 14,
              padding: 20,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.15s',
            }}>
              {/* 4px top accent bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                background: 'linear-gradient(90deg, ' + s.color + ', ' + s.accentPale + ')',
                borderRadius: '14px 14px 0 0',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color="#fff" />
                </div>
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 6 }}>
                {s.value}
              </div>
              <div style={{...TYPE.cardTitleBold, marginBottom: 3}}>{s.label}</div>
              <div style={TYPE.bodyMuted}>{s.sublabel}</div>
            </div>
          );
        })}
      </div>

      {/* ── QUICK ACTIONS — 3 outbound cards ────────────── */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>
        Manage your business
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
              {/* 4px top accent bar */}
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
                Open <ArrowRight size={14} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── PERFORMANCE PREVIEW LINK ─────────────────────
          Single CTA to the full Analytics page. v1 keeps this
          simple (a link out) rather than embedding charts —
          can upgrade to inline charts later if usage shows
          members want to see them here. */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--sap-text-muted)', marginBottom: 14 }}>
        Performance & insights
      </div>
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
          <div style={TYPE.cardTitleBold}>Full analytics dashboard</div>
          <div style={{...TYPE.bodyMuted, marginTop: 4}}>Charts, breakdowns, link performance, withdrawal history, team growth over time.</div>
        </div>
        <div style={{ color: 'var(--sap-indigo)', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          View <ArrowRight size={14} />
        </div>
      </Link>

      {/* ── RESPONSIVE ─── matches Dashboard pattern ─── */}
      <style>{`
        @media(max-width:767px) {
          .cc-stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .cc-actions-grid{grid-template-columns:1fr!important}
        }
      `}</style>
    </AppLayout>
  );
}
