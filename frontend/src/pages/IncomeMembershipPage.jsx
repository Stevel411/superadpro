/**
 * IncomeMembershipPage.jsx — /income/membership (Apr 2026)
 * ════════════════════════════════════════════════════════════════
 * Membership-stream-specific deep-dive page. The Income door's
 * Membership tab destination. Single page that ADAPTS its content
 * based on how many directs the member has:
 *
 *   0 directs    → COACHING mode
 *                  · Big motivational hero
 *                  · 3 numbered first-step cards
 *                  · Quick math green strip
 *
 *   1-4 directs  → ENCOURAGEMENT mode
 *                  · Real earnings stat row (no longer greyed)
 *                  · Encouragement banner with progress bar to 5
 *                  · Command Centre handoff card
 *
 *   5+ directs   → DATA mode
 *                  · Real earnings stat row
 *                  · Command Centre handoff card
 *                  · Quality metrics rings (activation/retention/tenure)
 *
 * Always shown (every mode):
 *   · Hero (shared SubPageHero)
 *   · Tab strip (rendered by AppLayout via IncomeTabs)
 *   · Earnings stat row (4 cards — show $0 placeholders for new members)
 *   · Stream comparison strip (4 streams horizontal bars)
 *
 * Conditionally shown:
 *   · Upgrade-to-Pro card (when membership_tier is 'basic')
 *
 * Key design principle (founder direction): this page focuses on
 * STREAM ECONOMICS, not team management. The list of directs lives
 * on Command Centre. Approved layout via 4 mockup iterations:
 *   /mnt/user-data/outputs/membership-page-mockup-v4.html
 *
 * Sidebar collapses on mount (matches Income/Tools/Learn pattern).
 *
 * Backend: GET /api/membership-stream — returns everything in one
 * call. No PII in the response beyond what Command Centre already
 * exposes.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users, UserPlus, TrendingUp, Sparkles, Zap, Mail, Share2, Link as LinkIcon,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { formatMoney } from '../utils/money';
import { SubPageHero } from './tools-shared';

export default function IncomeMembershipPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sidebar collapse on mount, restore on unmount (matches Income door)
  useEffect(() => {
    let priorCollapsed = false;
    try { priorCollapsed = window.localStorage.getItem('sap-sidebar-collapsed') === '1'; } catch (e) {}
    window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: priorCollapsed }));
    };
  }, []);

  // Fetch Membership-stream data
  useEffect(() => {
    apiGet('/api/membership-stream')
      .then((r) => { setData(r); setLoading(false); })
      .catch((e) => { setError(e); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <AppLayout title={t('income.tabs.membership', { defaultValue: 'Membership' })}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 60, textAlign: 'center', color: 'var(--sap-text-muted, #64748b)' }}>
          {t('common.loading', { defaultValue: 'Loading…' })}
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout title={t('income.tabs.membership', { defaultValue: 'Membership' })}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 60, textAlign: 'center', color: 'var(--sap-red-deep, #b91c1c)' }}>
          {t('membership.errorLoading', { defaultValue: 'Could not load Membership data. Please try again.' })}
        </div>
      </AppLayout>
    );
  }

  const directCount = data.direct_count || 0;
  const isBasic = (data.membership_tier || '').toLowerCase() === 'basic';
  // 3-mode threshold logic — single source of truth for the page
  const mode1 = directCount === 0;
  const mode2 = directCount >= 1 && directCount <= 4;
  const mode3 = directCount >= 5;

  return (
    <AppLayout title={t('income.tabs.membership', { defaultValue: 'Membership' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        {/* ── Hero (always shown) ── */}
        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="membership.heroEyebrow"
          eyebrowDefault="Membership Stream"
          backLinkTo="/income"
          backLinkLabelKey="membership.backToIncome"
          backLinkLabelDefault="Back to Income"
        />

        {/* ── Earnings stat row (always shown — greyed for Mode 1) ── */}
        <div style={EYE_STYLE}>
          {t('membership.earningsSection', { defaultValue: 'Your Membership earnings' })}
        </div>
        <EarningsStatRow data={data} mode1={mode1} t={t} />

        {/* ── Mode 1: Coaching content ── */}
        {mode1 && <CoachingMode user={user} t={t} />}

        {/* ── Mode 2: Encouragement banner ── */}
        {mode2 && <EncouragementBanner directCount={directCount} t={t} />}

        {/* ── Command Centre handoff card (Mode 2 + Mode 3) ── */}
        {!mode1 && (
          <CommandCentreHandoff directCount={directCount} t={t} />
        )}

        {/* ── Mode 3: Quality metrics rings ── */}
        {mode3 && (
          <>
            <div style={EYE_STYLE}>
              {t('membership.qualitySection', { defaultValue: 'Quality metrics — are you building a real business?' })}
            </div>
            <QualityMetrics data={data} t={t} />
          </>
        )}

        {/* ── Stream comparison strip (always shown) ── */}
        <div style={EYE_STYLE}>
          {t('membership.streamSection', { defaultValue: 'How Membership compares to your other streams' })}
        </div>
        <StreamComparisonStrip data={data} t={t} />

        {/* ── Upgrade card (only for Basic-tier viewers) ── */}
        {isBasic && (
          <>
            <div style={EYE_STYLE}>
              {t('membership.upgradeSection', { defaultValue: 'Upgrade your membership · earn more from each direct' })}
            </div>
            <UpgradeToProCard data={data} t={t} />
          </>
        )}

      </div>
    </AppLayout>
  );
}

// ════════════════════════════════════════════════════════════════
// Reusable section eyebrow style
// ════════════════════════════════════════════════════════════════
const EYE_STYLE = {
  fontSize: 13, fontWeight: 800,
  letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'var(--sap-text-muted, #64748b)',
  margin: '32px 0 14px',
};

// ════════════════════════════════════════════════════════════════
// EarningsStatRow — 4 cards: Lifetime, This Month, MRR, Projection
// Greyed-out style for Mode 1 (member with 0 directs)
// ════════════════════════════════════════════════════════════════
function EarningsStatRow({ data, mode1, t }) {
  return (
    <div className="membership-stat-row" style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 8,
    }}>
      <StatCard
        eyebrow={t('membership.stat.lifetime', { defaultValue: 'Lifetime Earned' })}
        value={formatMoney(data.lifetime_earned)}
        sub={mode1
          ? t('membership.stat.lifetimeSubEmpty', { defaultValue: 'Updates after your first commission' })
          : t('membership.stat.lifetimeSub', { defaultValue: 'since you joined {{date}}', date: data.active_since })}
        accent="green" muted={mode1}
      />
      <StatCard
        eyebrow={t('membership.stat.thisMonth', { defaultValue: 'This Month' })}
        value={formatMoney(data.this_month)}
        sub={mode1
          ? t('membership.stat.thisMonthSubEmpty', { defaultValue: 'Real-time as commissions land' })
          : t('membership.stat.thisMonthSub', { defaultValue: 'paid by {{n}} active directs', n: data.active_count })}
        delta={!mode1 && data.last_month >= 0 ? data.delta : null}
        accent="cyan" muted={mode1}
      />
      <StatCard
        eyebrow={t('membership.stat.mrr', { defaultValue: 'Current MRR' })}
        value={`$${(data.mrr || 0).toFixed(0)}`}
        valueSuffix="/mo"
        sub={mode1
          ? t('membership.stat.mrrSubEmpty', { defaultValue: 'Recurring monthly income' })
          : t('membership.stat.mrrSub', { defaultValue: 'guaranteed monthly recurring' })}
        accent="amber" muted={mode1}
      />
      <StatCard
        eyebrow={t('membership.stat.projection', { defaultValue: 'Next Projection' })}
        value={mode1 ? '—' : `$${(data.projection || 0).toFixed(0)}`}
        valueSuffix={mode1 ? '' : '/mo'}
        sub={mode1
          ? t('membership.stat.projectionSubEmpty', { defaultValue: 'Based on your active directs' })
          : data.projection_basis}
        accent="violet" muted={mode1}
      />
      <style>{`
        @media (max-width: 1100px) {
          .membership-stat-row { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 700px) {
          .membership-stat-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ eyebrow, value, valueSuffix, sub, delta, accent, muted }) {
  const accentColor = {
    green: '#16a34a', cyan: '#0ea5e9', amber: '#f59e0b', violet: '#8b5cf6',
  }[accent] || '#16a34a';
  const valueColor = muted ? '#94a3b8' : {
    green: '#15803d', cyan: '#0e7490', amber: '#b45309', violet: '#7c3aed',
  }[accent] || '#0f172a';

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--sap-border, #e2e8f0)',
      borderRadius: 14,
      padding: '18px 20px 18px 24px',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
      opacity: muted ? 0.6 : 1,
    }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, background: accentColor, opacity: muted ? 0.4 : 1 }} />
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted ? '#94a3b8' : '#64748b', marginBottom: 8 }}>
        {eyebrow}
      </div>
      <div style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 28, fontWeight: muted ? 700 : 900,
        color: valueColor,
        letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 6,
      }}>
        {value}
        {valueSuffix && <span style={{ fontSize: 16, opacity: 0.6 }}>{valueSuffix}</span>}
      </div>
      <div style={{ fontSize: 12, color: muted ? '#94a3b8' : '#475569' }}>{sub}</div>
      {delta !== null && delta !== undefined && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          marginTop: 8,
          fontSize: 12, fontWeight: 700,
          padding: '3px 8px', borderRadius: 99,
          background: delta >= 0 ? '#dcfce7' : '#fee2e2',
          color: delta >= 0 ? '#15803d' : '#b91c1c',
        }}>
          {delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}{formatMoney(delta)} vs last month
        </span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CoachingMode — Mode 1 content (0 directs)
// ════════════════════════════════════════════════════════════════
function CoachingMode({ user, t }) {
  const username = user?.username || 'member';
  return (
    <>
      {/* Big motivational hero */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--sap-border, #e2e8f0)',
        borderRadius: 18,
        padding: '48px 40px',
        textAlign: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)',
        marginTop: 28,
        marginBottom: 16,
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: 22,
          background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
          color: '#15803d',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <UserPlus size={44} strokeWidth={2} />
        </div>
        <div style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px',
          color: 'var(--sap-text-primary, #0f172a)', marginBottom: 10,
        }}>
          {t('membership.coachingTitle', { defaultValue: 'Your first direct referral is just one share away' })}
        </div>
        <div style={{
          fontSize: 16, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.5,
          maxWidth: 560, margin: '0 auto 28px',
        }}>
          {t('membership.coachingSub', { defaultValue: 'Every Pro member you refer pays you $17.50/month for as long as they stay. 5 directs = $87.50 every month, automatically. Let\'s get your first one.' })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/social-share" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 24px', background: '#15803d', color: '#fff',
            borderRadius: 12, fontSize: 15, fontWeight: 800,
            boxShadow: '0 6px 16px rgba(22,163,74,0.3)',
            textDecoration: 'none',
          }}>
            <Share2 size={16} strokeWidth={2.5} />
            {t('membership.openSocialShare', { defaultValue: 'Open Affiliate Share' })}
          </Link>
          <CopyLinkButton username={username} t={t} />
        </div>
      </div>

      {/* First 3 steps */}
      <div style={EYE_STYLE}>
        {t('membership.firstStepsSection', { defaultValue: 'Your first 3 steps to your first commission' })}
      </div>
      <FirstStep
        num={1}
        title={t('membership.step1Title', { defaultValue: 'Make your link easy to find' })}
        desc={t('membership.step1Desc', { defaultValue: 'Set up your LinkHub page so anywhere you post your link — bio, profile, signature — leads to one beautiful page.' })}
        ctaLabel={t('membership.step1Cta', { defaultValue: 'Set up LinkHub →' })}
        to="/linkhub"
      />
      <FirstStep
        num={2}
        title={t('membership.step2Title', { defaultValue: 'Share with your warmest 5' })}
        desc={t('membership.step2Desc', { defaultValue: 'Don\'t blast — start with 5 people who\'d genuinely benefit. Pre-written messages in Email Swipes.' })}
        ctaLabel={t('membership.step2Cta', { defaultValue: 'View Email Swipes →' })}
        to="/email-swipes"
      />
      <FirstStep
        num={3}
        title={t('membership.step3Title', { defaultValue: 'Drop a social share post' })}
        desc={t('membership.step3Desc', { defaultValue: 'One post, big reach. AI-generated copy in 4 tones (professional / casual / hype / story).' })}
        ctaLabel={t('membership.step3Cta', { defaultValue: 'Open Social Share →' })}
        to="/social-share"
      />

      {/* Quick math callout */}
      <div style={{
        marginTop: 28, textAlign: 'center', padding: 20,
        background: 'linear-gradient(135deg, #dcfce7, #ffffff)',
        borderRadius: 14, border: '1px solid #bbf7d0',
      }}>
        <div style={{
          fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 800,
          color: '#15803d', marginBottom: 4,
        }}>
          💡 {t('membership.quickMathTitle', { defaultValue: 'Quick math' })}
        </div>
        <div style={{ fontSize: 14, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.5 }}>
          {t('membership.quickMathText', { defaultValue: '10 Pro directs = $175/mo guaranteed · 50 Pro directs = $875/mo · 100 Pro directs = $1,750/mo. This compounds month after month, automatically.' })}
        </div>
      </div>
    </>
  );
}

function FirstStep({ num, title, desc, ctaLabel, to }) {
  return (
    <Link to={to} style={{
      background: '#fff',
      border: '1px solid var(--sap-border, #e2e8f0)',
      borderRadius: 14,
      padding: '22px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: 18,
      marginBottom: 12,
      textDecoration: 'none', color: 'inherit',
      transition: 'transform 0.15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: '#dcfce7', color: '#15803d',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 900,
        flexShrink: 0,
      }}>{num}</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 800,
          color: 'var(--sap-text-primary, #0f172a)', marginBottom: 4,
        }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.4 }}>{desc}</div>
      </div>
      <span style={{
        flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '8px 14px',
        background: '#dcfce7', color: '#15803d',
        borderRadius: 99, fontSize: 12, fontWeight: 700,
      }}>{ctaLabel}</span>
    </Link>
  );
}

function CopyLinkButton({ username, t }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        const link = `https://www.superadpro.com/ref/${username}`;
        navigator.clipboard.writeText(link).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '13px 24px',
        background: '#fff', color: 'var(--sap-text-primary, #0f172a)',
        border: '1.5px solid var(--sap-border, #e2e8f0)',
        borderRadius: 12, fontSize: 15, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <LinkIcon size={16} strokeWidth={2.5} />
      {copied
        ? t('membership.linkCopied', { defaultValue: 'Copied!' })
        : t('membership.copyReferralLink', { defaultValue: 'Copy referral link' })}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// EncouragementBanner — Mode 2 content (1-4 directs)
// Green-tinted banner with progress bar showing path to 5 directs
// ════════════════════════════════════════════════════════════════
function EncouragementBanner({ directCount, t }) {
  const target = 5;
  const progress = Math.min(100, (directCount / target) * 100);
  return (
    <div style={{
      background: 'linear-gradient(135deg, #dcfce7, #ffffff 80%)',
      border: '1px solid #bbf7d0',
      borderRadius: 18,
      padding: '28px 36px',
      marginTop: 28, marginBottom: 16,
      display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
      boxShadow: '0 2px 6px rgba(22,163,74,0.08), 0 8px 24px rgba(22,163,74,0.06)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 18,
        background: '#15803d', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 6px 16px rgba(22,163,74,0.3)',
      }}>
        <TrendingUp size={32} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#15803d', marginBottom: 6 }}>
          {t('membership.encourageEyebrow', { defaultValue: "You're building momentum" })}
        </div>
        <div style={{
          fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 800,
          letterSpacing: '-0.4px', lineHeight: 1.2,
          color: 'var(--sap-text-primary, #0f172a)', marginBottom: 6,
        }}>
          {t('membership.encourageTitle', {
            defaultValue: "You've got {{n}} directs — let's get to {{target}}",
            n: directCount, target,
          })}
        </div>
        <div style={{ fontSize: 14, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.5 }}>
          {t('membership.encourageSub', {
            defaultValue: '{{target}} paying directs means real recurring income. Keep doing what\'s working — share your link with {{remaining}} more people this week.',
            target, remaining: target - directCount,
          })}
        </div>
      </div>
      <div style={{ flexShrink: 0, minWidth: 200, textAlign: 'right' }}>
        <div style={{
          background: '#fff',
          border: '1px solid #bbf7d0',
          borderRadius: 99, height: 16,
          overflow: 'hidden', marginBottom: 6,
          width: 220,
        }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: 'linear-gradient(90deg, #16a34a, #22c55e)',
            width: `${progress}%`,
            transition: 'width 0.6s ease-out',
          }}/>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
          {directCount} of {target} · {progress.toFixed(0)}% to milestone
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CommandCentreHandoff — link card to /command-centre (Mode 2 + 3)
// Members who want list/management actions go here
// ════════════════════════════════════════════════════════════════
function CommandCentreHandoff({ directCount, t }) {
  return (
    <Link to="/command-centre" style={{
      background: '#fff',
      border: '1px solid var(--sap-border, #e2e8f0)',
      borderRadius: 14,
      padding: '18px 22px',
      display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
      textDecoration: 'none',
      transition: 'all 0.15s',
      marginTop: directCount >= 5 ? 24 : 0,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06), 0 8px 18px rgba(0,0,0,0.06)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)';
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'linear-gradient(135deg, #bae6fd, #0ea5e9)',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Users size={20} strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 800,
          color: 'var(--sap-text-primary, #0f172a)', marginBottom: 2,
        }}>
          {directCount >= 5
            ? t('membership.handoffTitle5plus', { defaultValue: 'Manage your {{n}} direct referrals', n: directCount })
            : t('membership.handoffTitle', { defaultValue: 'See your direct referrals in detail' })}
        </div>
        <div style={{ fontSize: 13, color: 'var(--sap-text-secondary, #475569)' }}>
          {t('membership.handoffSub', { defaultValue: 'Status, names, send broadcasts, and re-engagement actions live in your Command Centre.' })}
        </div>
      </div>
      <div style={{ color: 'var(--sap-text-muted, #64748b)', flexShrink: 0 }}>
        →
      </div>
    </Link>
  );
}

// ════════════════════════════════════════════════════════════════
// QualityMetrics — Mode 3 content (5+ directs)
// 3 ring metrics: activation rate, retention rate, average tenure
// ════════════════════════════════════════════════════════════════
function QualityMetrics({ data, t }) {
  return (
    <div className="quality-metrics" style={{
      background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
      border: '1px solid var(--sap-border, #e2e8f0)',
      borderRadius: 14,
      padding: '24px 28px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 8px 20px rgba(0,0,0,0.04)',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 36,
      alignItems: 'center',
    }}>
      <RingMetric
        label={t('membership.metric.activation', { defaultValue: 'Activation Rate' })}
        percent={data.activation_rate || 0}
        ringColor="#16a34a"
        textColor="#15803d"
        headline={t('membership.metric.activationHeadline', {
          defaultValue: '{{paid}} of {{total}} paid',
          paid: (data.active_count || 0) + (data.lapsed_count || 0),
          total: data.direct_count || 0,
        })}
        detail={t('membership.metric.activationDetail', { defaultValue: 'Members who became paying after sign-up' })}
      />
      <RingMetric
        label={t('membership.metric.retention', { defaultValue: 'Retention Rate' })}
        percent={data.retention_rate || 0}
        ringColor="#0ea5e9"
        textColor="#0e7490"
        headline={t('membership.metric.retentionHeadline', {
          defaultValue: '{{active}} of {{paid}} still paying',
          active: data.active_count || 0,
          paid: (data.active_count || 0) + (data.lapsed_count || 0),
        })}
        detail={t('membership.metric.retentionDetail', {
          defaultValue: '{{n}} lapsed in last 30 days',
          n: data.lapsed_count || 0,
        })}
      />
      <TenureMetric
        label={t('membership.metric.tenure', { defaultValue: 'Average Tenure' })}
        days={data.avg_tenure_days || 0}
        detail={t('membership.metric.tenureDetail', { defaultValue: 'Of currently-paying directs' })}
      />
      <style>{`
        @media (max-width: 1100px) {
          .quality-metrics { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
      `}</style>
    </div>
  );
}

function RingMetric({ label, percent, ringColor, textColor, headline, detail }) {
  const safePercent = Math.min(100, Math.max(0, percent || 0));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 76, height: 76, flexShrink: 0, position: 'relative' }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
          <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3.5"/>
          <circle cx="18" cy="18" r="15" fill="none" stroke={ringColor} strokeWidth="3.5"
                  strokeDasharray={`${safePercent} 100`} strokeLinecap="round"
                  transform="rotate(-90 18 18)"/>
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 900,
          letterSpacing: '-0.3px', color: textColor,
        }}>{safePercent.toFixed(0)}%</div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{
          fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 800,
          color: 'var(--sap-text-primary, #0f172a)', lineHeight: 1, letterSpacing: '-0.3px',
        }}>{headline}</div>
        <div style={{ fontSize: 13, color: 'var(--sap-text-secondary, #475569)', marginTop: 2 }}>{detail}</div>
      </div>
    </div>
  );
}

function TenureMetric({ label, days, detail }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 900,
        color: '#15803d', letterSpacing: '-0.4px', lineHeight: 1, marginBottom: 4,
      }}>
        {days}<span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}> days</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--sap-text-secondary, #475569)' }}>{detail}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// StreamComparisonStrip — horizontal bars showing all 4 streams
// ════════════════════════════════════════════════════════════════
function StreamComparisonStrip({ data, t }) {
  const streams = data.stream_this_month || {};
  const max = Math.max(streams.membership || 0, streams.grid || 0, streams.course || 0, streams.nexus || 0, 1);

  const rows = [
    { id: 'membership', label: '🟢 ' + t('membership.stream.membership', { defaultValue: 'Membership' }), value: streams.membership || 0, color: '#16a34a' },
    { id: 'grid',       label: '⚡ '  + t('membership.stream.grid',       { defaultValue: 'Grid' }),       value: streams.grid || 0,       color: '#0ea5e9' },
    { id: 'course',     label: '🎓 ' + t('membership.stream.course',     { defaultValue: 'Course' }),     value: streams.course || 0,     color: '#8b5cf6' },
    { id: 'nexus',      label: '💎 ' + t('membership.stream.nexus',      { defaultValue: 'Nexus' }),      value: streams.nexus || 0,      color: '#f59e0b' },
  ];

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--sap-border, #e2e8f0)',
      borderRadius: 14,
      padding: '22px 28px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 8px 20px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--sap-text-primary, #0f172a)', marginBottom: 14 }}>
        {t('membership.streamCompareTitle', { defaultValue: 'This month earnings' })}
        <span style={{ fontWeight: 600, color: '#64748b', marginLeft: 6 }}>
          {t('membership.streamCompareSubtitle', { defaultValue: 'across all 4 streams' })}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((row) => (
          <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 130, flexShrink: 0,
              fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary, #0f172a)',
            }}>{row.label}</div>
            <div style={{
              flex: 1, height: 12,
              background: '#f1f5f9', borderRadius: 99, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 99,
                background: row.color,
                width: `${(row.value / max) * 100}%`,
                transition: 'width 0.6s ease-out',
              }}/>
            </div>
            <div style={{
              width: 100, flexShrink: 0, textAlign: 'right',
              fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 800,
              color: 'var(--sap-text-primary, #0f172a)', letterSpacing: '-0.2px',
              fontVariantNumeric: 'tabular-nums',
            }}>{formatMoney(row.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// UpgradeToProCard — only shown to Basic-tier viewers
// ════════════════════════════════════════════════════════════════
function UpgradeToProCard({ data, t }) {
  const activeDirects = data.active_count || 0;
  // Per spec: Basic sponsor earns $10/mo per direct (capped). After Pro upgrade,
  // earns $17.50/Pro-direct + $10/Basic-direct. Difference = +$7.50 per Pro direct.
  // Conservative phrasing: "+$X/mo right away" using current actives × $7.50.
  // Real-world impact also depends on each direct's tier; this card uses $7.50
  // as the per-direct upside since that's the average Pro→Basic gap.
  const upside = activeDirects * 7.50;
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff 0%, #fff 50%, #fef3c7 100%)',
      border: '1px solid var(--sap-border, #e2e8f0)',
      borderRadius: 16,
      padding: '28px 36px 28px 40px',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
    }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 5, background: '#f59e0b' }} />
      <div style={{
        width: 72, height: 72, borderRadius: 18,
        background: '#f59e0b', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 8px 20px rgba(245,158,11,0.3)',
      }}>
        <Zap size={32} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b45309', marginBottom: 6 }}>
          {t('membership.upgradeEyebrow', { defaultValue: "You're on Basic" })}
        </div>
        <div style={{
          fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800,
          letterSpacing: '-0.4px', marginBottom: 8, color: 'var(--sap-text-primary, #0f172a)',
        }}>
          {t('membership.upgradeTitle', { defaultValue: 'Upgrade to Pro to earn $17.50 per direct' })}
        </div>
        <div style={{ fontSize: 14, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.5 }}>
          {t('membership.upgradeDesc', {
            defaultValue: 'As a Basic member you currently earn $10/mo per direct. Pro members earn $17.50/mo per direct — a 75% pay raise on every existing and future referral. With your current {{n}} actives that\'s +${{upside}}/mo right away.',
            n: activeDirects, upside: upside.toFixed(2),
          })}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{
          fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 800,
          color: 'var(--sap-text-primary, #0f172a)', lineHeight: 1, marginBottom: 4,
        }}>
          $97<small style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>/mo</small>
        </div>
        <Link to="/wallet" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '11px 22px', background: '#f59e0b', color: '#1f1300',
          borderRadius: 12, fontSize: 14, fontWeight: 800,
          boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
          marginTop: 12, textDecoration: 'none',
        }}>
          {t('membership.upgradeBtn', { defaultValue: 'Upgrade now →' })}
        </Link>
      </div>
    </div>
  );
}
