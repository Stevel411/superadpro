/**
 * IncomePage.jsx — Income door landing page (Door 2)
 * ════════════════════════════════════════════════════════════════
 * Reached from the Income door card on /dashboard. This is the
 * gateway to the four income streams (Membership, Campaign Tier
 * Grid, Profit Nexus, Course Academy) plus the Wallet that holds
 * the earnings.
 *
 * Layout (approved mockup at /mnt/user-data/outputs/income.html):
 *   1. Identity hero — avatar, name, PRO badge, Active since,
 *      "Back to Dashboard" button on the right
 *   2. Section tabs — scrollable strip linking to all 8 sub-pages
 *      (Overview / Wallet / Comp Plan / Membership / Campaign Grid
 *      / Profit Nexus / Course Academy / Earnings History) with
 *      coloured icon boxes matching the stream cards below
 *   3. Earnings summary card — 4 cells (Available / This month /
 *      Next payout / All time) with violet top accent
 *   4. Four stream cards in 2×2 — adaptive status per stream
 *      (full numbers if active, single-line description if dormant)
 *      with sub-page action links per card
 *
 * Sidebar behaviour:
 *   On mount, dispatches `sap-sidebar-set-collapsed` to collapse
 *   the sidebar to its 72px icon-strip mode — the Income page
 *   becomes the focus, but cross-door navigation is preserved.
 *   On unmount, restores the previous state so navigating to
 *   non-category pages keeps the user's collapsed/expanded
 *   preference intact.
 *
 * Data sources:
 *   - /api/dashboard provides balance, directs_active, grid_team_count,
 *     earnings_this_month, plus per-stream earnings totals
 *   - All values fall back to placeholders when API hasn't loaded yet
 *
 * Tab destinations (commit 2 launch — some are stand-ins until
 * dedicated pages exist):
 *   Overview         → /income (this page)
 *   Wallet           → /wallet
 *   Comp Plan        → /compensation-plan
 *   Membership       → /compensation-plan#membership (anchor — stand-in
 *                      until /income/membership is built)
 *   Campaign Grid    → /campaign-tiers
 *   Profit Nexus     → /credit-nexus
 *   Course Academy   → /courses
 *   Earnings History → /wallet (stand-in until unified history exists)
 *
 * Translations: all visible strings via t('income.X'). Namespace seeded
 * with English defaults across all 20 locale files in this commit.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { formatMoney } from '../utils/money';
import {
  Users, Target, Layers, GraduationCap,
  DollarSign, TrendingUp, Calendar
} from 'lucide-react';
import { SubPageHero } from './tools-shared';

export default function IncomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);

  // ──────────────────────────────────────────────────────────────
  // Sidebar collapse trigger
  // ──────────────────────────────────────────────────────────────
  // AppLayout already exposes a window event for this — used by the
  // SuperPages editor to grab max canvas space. We reuse it here to
  // collapse the sidebar to its 72px icon-strip when entering the
  // Income door, and restore the prior state when leaving.
  useEffect(() => {
    let priorCollapsed = false;
    try {
      priorCollapsed = window.localStorage.getItem('sap-sidebar-collapsed') === '1';
    } catch (e) { /* localStorage unavailable */ }

    window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: true }));

    return () => {
      // Restore prior state on unmount so the user's preference outside
      // category pages is preserved.
      window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: priorCollapsed }));
    };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // Data fetch
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    apiGet('/api/dashboard')
      .then(setData)
      .catch(() => {});
  }, []);

  // ──────────────────────────────────────────────────────────────
  // Derived display values
  // ──────────────────────────────────────────────────────────────
  const balance = (user && typeof user.balance === 'number') ? user.balance : 0;
  const earningsMonth = data ? (data.earnings_this_month || 0) : 0;
  const earningsAllTime = data ? (
    (data.membership_earned || 0) +
    (data.grid_earned || 0) +
    (data.course_earned || 0) +
    (data.boost_earned || 0) +
    (data.creative_studio_earned || 0)
  ) : 0;

  // Per-stream activity flags — drives the adaptive status display.
  // A stream is "active" if it has either earnings or structure.
  const membershipActive = (data?.directs_active || 0) > 0 || (data?.membership_earned || 0) > 0;
  const gridActive = (data?.grid_team_count || 0) > 0 || (data?.grid_earned || 0) > 0;
  const nexusActive = (data?.nexus_team_count || 0) > 0;
  const coursesActive = (data?.course_earned || 0) > 0;

  // Format member-since date — used in the earnings summary card caption.
  // Hero displays its own active-since via SubPageHero; this local is kept
  // for the "since Mar 2026" lifetime-earnings caption further down.
  let activeSinceLabel = '';
  if (user?.created_at) {
    try {
      const d = new Date(user.created_at);
      activeSinceLabel = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    } catch (e) { /* ignore */ }
  }

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  return (
    <AppLayout title={t('income.pageTitle', { defaultValue: 'Income' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        {/* ── Identity hero (shared Dashboard-style component) ──
            Used to be a custom flat-navy block with an 80px gradient
            avatar and just a Back to Dashboard button on the right.
            Replaced 26 Apr 2026 with the shared SubPageHero so the
            Income door matches Dashboard, Tools, and Learn — single
            hero language across the platform. */}
        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="income.heroEyebrow"
          eyebrowDefault="Your Income"
        />

        {/* ── Earnings summary card ── */}
        <div style={{
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 14,
        }}>
          {t('income.earningsSection', { defaultValue: 'Your earnings' })}
        </div>
        <div style={{
          background: '#fff',
          border: '1px solid var(--sap-border, #e2e8f0)',
          borderRadius: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
          position: 'relative', overflow: 'hidden',
          marginBottom: 32,
        }}>
          {/* Violet top accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#8b5cf6' }} />
          <div className="income-summary-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          }}>
            {[
              { icon: DollarSign,  iconBg: '#8b5cf6',  numColor: '#8b5cf6',  label: t('income.summary.available', { defaultValue: 'Available' }),    value: formatMoney(balance),                         caption: t('income.summary.availableCaption', { defaultValue: 'in your wallet now' }) },
              { icon: TrendingUp,  iconBg: '#22c55e',  numColor: '#16a34a',  label: t('income.summary.thisMonth', { defaultValue: 'This month' }),    value: formatMoney(earningsMonth),                   caption: t('income.summary.thisMonthCaption', { defaultValue: 'commissions earned this month' }) },
              { icon: Calendar,    iconBg: '#0f172a',  numColor: '#0f172a',  label: t('income.summary.nextPayout', { defaultValue: 'Next payout' }),  value: t('income.summary.nextPayoutValue', { defaultValue: 'On request' }), caption: t('income.summary.nextPayoutCaption', { defaultValue: 'crypto withdrawal anytime' }), small: true },
              { icon: Layers,      iconBg: '#f59e0b',  numColor: '#f59e0b',  label: t('income.summary.allTime', { defaultValue: 'All time' }),         value: formatMoney(earningsAllTime),                  caption: activeSinceLabel ? t('income.summary.allTimeCaptionSince', { defaultValue: `since ${activeSinceLabel}`, since: activeSinceLabel }) : t('income.summary.allTimeCaption', { defaultValue: 'lifetime earnings' }) },
            ].map((cell, i, arr) => {
              const Icon = cell.icon;
              return (
                <div key={i} style={{
                  padding: '24px 28px',
                  borderRight: i < arr.length - 1 ? '1px solid var(--sap-border-light, #f1f5f9)' : 'none',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: cell.iconBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} strokeWidth={2} />
                    </div>
                    <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--sap-text-primary, #0f172a)' }}>{cell.label}</span>
                  </div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: cell.small ? 24 : 32, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px', color: cell.numColor }}>
                    {cell.value}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.5 }}>{cell.caption}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Four stream cards ── */}
        <div style={{
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 14,
        }}>
          {t('income.streamsSection', { defaultValue: 'Your four income streams' })}
        </div>
        <div className="income-streams-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18,
        }}>

          <StreamCard
            tone="green"
            icon={Users}
            title={t('income.stream.membership', { defaultValue: 'Membership Sponsor' })}
            subtitle={t('income.stream.membershipSub', { defaultValue: "25% on every direct's monthly fee" })}
            tag={membershipActive ? { label: t('income.tag.active', { defaultValue: 'Active' }), tone: 'active' } : { label: t('income.tag.available', { defaultValue: 'Available' }), tone: 'dormant' }}
            stats={membershipActive ? [
              { label: t('income.stat.directs', { defaultValue: 'Directs paying' }), value: data?.directs_active || 0 },
              { label: t('income.stat.earnedAllTime', { defaultValue: 'Earned all time' }), value: formatMoney(data?.membership_earned || 0) },
            ] : null}
            statusLine={!membershipActive ? t('income.stream.membershipDormant', { defaultValue: 'Share your link to activate the easiest stream — paid every month they stay.' }) : null}
            actions={[
              { label: t('income.action.myReferrals', { defaultValue: 'My referrals' }), to: '/command-centre' },
              { label: t('income.action.shareLink', { defaultValue: 'Get share link' }), to: '/social-share' },
              { label: t('income.action.compPlan', { defaultValue: 'Comp plan' }), to: '/compensation-plan' },
            ]}
          />

          <StreamCard
            tone="cyan"
            icon={Target}
            title={t('income.stream.grid', { defaultValue: 'Campaign Tier Grid' })}
            subtitle={t('income.stream.gridSub', { defaultValue: '8×8 forced matrix · advertise + earn' })}
            tag={gridActive ? { label: t('income.tag.tier', { defaultValue: 'Active' }), tone: 'tier' } : { label: t('income.tag.available', { defaultValue: 'Available' }), tone: 'dormant' }}
            stats={gridActive ? [
              { label: t('income.stat.team', { defaultValue: 'In your grid' }), value: data?.grid_team_count || 0 },
              { label: t('income.stat.earnedAllTime', { defaultValue: 'Earned all time' }), value: formatMoney(data?.grid_earned || 0) },
            ] : null}
            statusLine={!gridActive ? t('income.stream.gridDormant', { defaultValue: 'Buy a Grid tier to advertise AND earn from the 8×8 spillover matrix.' }) : null}
            actions={[
              { label: t('income.action.myGrid', { defaultValue: 'My Grid' }), to: '/grid-visualiser' },
              { label: t('income.action.watchAds', { defaultValue: 'Watch ads' }), to: '/watch' },
              { label: t('income.action.calculator', { defaultValue: 'Calculator' }), to: '/grid-calculator' },
              { label: t('income.action.upgradeTier', { defaultValue: 'Upgrade tier' }), to: '/campaign-tiers' },
            ]}
          />

          <StreamCard
            tone="violet"
            icon={Layers}
            title={t('income.stream.nexus', { defaultValue: 'Profit Nexus' })}
            subtitle={t('income.stream.nexusSub', { defaultValue: '3×3 credit matrix · cascading commissions' })}
            tag={nexusActive ? { label: t('income.tag.active', { defaultValue: 'Active' }), tone: 'active' } : { label: t('income.tag.available', { defaultValue: 'Available' }), tone: 'dormant' }}
            stats={nexusActive ? [
              { label: t('income.stat.team', { defaultValue: 'In your nexus' }), value: data?.nexus_team_count || 0 },
              { label: t('income.stat.earnedAllTime', { defaultValue: 'Earned all time' }), value: formatMoney(data?.creative_studio_earned || 0) },
            ] : null}
            statusLine={!nexusActive ? t('income.stream.nexusDormant', { defaultValue: 'Buy a credit pack to take your position in the 3×3 matrix.' }) : null}
            actions={[
              { label: t('income.action.buyCredits', { defaultValue: 'Buy credits' }), to: '/credit-nexus' },
              { label: t('income.action.myNexus', { defaultValue: 'My Nexus' }), to: '/nexus-visualiser' },
              { label: t('income.action.howItWorks', { defaultValue: 'How it works' }), to: '/credit-nexus' },
            ]}
          />

          <StreamCard
            tone="amber"
            icon={GraduationCap}
            title={t('income.stream.courses', { defaultValue: 'Course Academy' })}
            subtitle={t('income.stream.coursesSub', { defaultValue: 'Pass-up commissions · infinite depth' })}
            tag={coursesActive ? { label: t('income.tag.active', { defaultValue: 'Active' }), tone: 'active' } : { label: t('income.tag.available', { defaultValue: 'Available' }), tone: 'dormant' }}
            stats={coursesActive ? [
              { label: t('income.stat.earnedAllTime', { defaultValue: 'Earned all time' }), value: formatMoney(data?.course_earned || 0) },
            ] : null}
            statusLine={!coursesActive ? t('income.stream.coursesDormant', { defaultValue: 'Buy a course tier to qualify for upline pass-ups on every sale.' }) : null}
            actions={[
              { label: t('income.action.browseCourses', { defaultValue: 'Browse courses' }), to: '/courses' },
              { label: t('income.action.passUp', { defaultValue: 'How pass-up works' }), to: '/courses/how-it-works' },
            ]}
          />

        </div>

      </div>

      {/* Mobile-responsive overrides — match Command Centre's responsive behaviour */}
      <style>{`
        @media (max-width: 900px) {
          .income-summary-grid { grid-template-columns: 1fr 1fr !important; }
          .income-streams-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .income-summary-grid { grid-template-columns: 1fr !important; }
          .income-summary-grid > div { border-right: none !important; border-bottom: 1px solid var(--sap-border-light, #f1f5f9); }
          .income-summary-grid > div:last-child { border-bottom: none; }
        }
      `}</style>
    </AppLayout>
  );
}

// ════════════════════════════════════════════════════════════════
// StreamCard sub-component — shared layout for the four stream cards
// ════════════════════════════════════════════════════════════════
function StreamCard({ tone, icon: Icon, title, subtitle, tag, stats, statusLine, actions }) {
  const toneAccent = {
    green:  '#22c55e',
    cyan:   '#0ea5e9',
    violet: '#8b5cf6',
    amber:  '#f59e0b',
  }[tone] || '#94a3b8';

  const iconBg = {
    green:  '#22c55e',
    cyan:   '#0ea5e9',
    violet: '#8b5cf6',
    amber:  '#f59e0b',
  }[tone] || '#94a3b8';

  const tagStyle = tag.tone === 'active'
    ? { bg: '#dcfce7', color: '#15803d' }
    : tag.tone === 'tier'
      ? { bg: '#dbeafe', color: '#1d4ed8' }
      : { bg: '#f1f5f9', color: '#64748b' };

  // ──────────────────────────────────────────────────────────────
  // Pill style for the bottom action row
  // ──────────────────────────────────────────────────────────────
  // Each stream's pills inherit the stream's brand colour so the card
  // reads as a coloured "zone" — green pills inside the green
  // Membership card, cyan inside Grid, etc. Background uses the lightest
  // tint (50/100 weight), text uses the 700 weight for AA contrast.
  // Hover step is one tint stronger (200 weight) for tactile feedback.
  // Approved 26 Apr 2026 via /mnt/user-data/outputs/pill-links-mockup.html.
  const pillStyle = {
    green:  { bg: '#dcfce7', bgHover: '#bbf7d0', color: '#15803d' },
    cyan:   { bg: '#cffafe', bgHover: '#a5f3fc', color: '#0e7490' },
    violet: { bg: '#ede9fe', bgHover: '#ddd6fe', color: '#6d28d9' },
    amber:  { bg: '#fef3c7', bgHover: '#fde68a', color: '#b45309' },
  }[tone] || { bg: '#f1f5f9', bgHover: '#e2e8f0', color: '#475569' };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--sap-border, #e2e8f0)',
      borderRadius: 14,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
      padding: '22px 24px',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)';
    }}>
      {/* Top accent stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: toneAccent }} />

      {/* Head: icon + title + tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: iconBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--sap-text-primary, #0f172a)', lineHeight: 1.2, letterSpacing: '-0.3px' }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--sap-text-secondary, #475569)', marginTop: 2 }}>
            {subtitle}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 800,
          padding: '4px 10px',
          borderRadius: 99,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: tagStyle.bg, color: tagStyle.color,
          flexShrink: 0,
        }}>{tag.label}</span>
      </div>

      {/* Stats row OR status line (adaptive) */}
      {stats && stats.length > 0 ? (
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 18 }}>
          {stats.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-text-faint, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, lineHeight: 1, color: 'var(--sap-text-primary, #0f172a)', letterSpacing: '-0.5px' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.55, marginBottom: 16, fontStyle: 'italic' }}>
          {statusLine}
        </div>
      )}

      {/* Action links — coloured pills matching the stream's brand.
          Stronger affordance than text+arrow: members read these as
          tappable buttons rather than inline links. Arrow nudges right
          on hover for subtle interactive feedback. */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap',
        paddingTop: 14,
        borderTop: '1px solid var(--sap-border-light, #f1f5f9)',
        marginTop: 'auto',
      }}>
        {actions.map((a, i) => (
          <Link
            key={i}
            to={a.to}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '6px 12px',
              borderRadius: 99,
              fontSize: 13, fontWeight: 600,
              background: pillStyle.bg,
              color: pillStyle.color,
              textDecoration: 'none',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = pillStyle.bgHover;
              const arrow = e.currentTarget.querySelector('.pill-arrow');
              if (arrow) {
                arrow.style.transform = 'translateX(2px)';
                arrow.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = pillStyle.bg;
              const arrow = e.currentTarget.querySelector('.pill-arrow');
              if (arrow) {
                arrow.style.transform = 'translateX(0)';
                arrow.style.opacity = '0.65';
              }
            }}
          >
            {a.label}
            <span className="pill-arrow" style={{
              fontSize: 11, opacity: 0.65,
              transition: 'transform 0.12s, opacity 0.12s',
              display: 'inline-block',
            }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
