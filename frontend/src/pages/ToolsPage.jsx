/**
 * ToolsPage.jsx — Tools door overview page (Door 3)
 * ════════════════════════════════════════════════════════════════
 * /tools is now an OVERVIEW-ONLY page. Members land here and see
 * three door cards representing the three tool categories:
 *
 *   Free Tools   → /tools/free
 *   Basic Tools  → /tools/basic
 *   Pro Tools    → /tools/pro
 *
 * The actual tool grids live on those three sub-pages, NOT on this
 * overview page. This matches the Income door pattern: /income is
 * the overview, /wallet / /compensation-plan / /campaign-tiers etc.
 * are the destinations.
 *
 * The persistent ToolsTabs strip (rendered by AppLayout) handles
 * navigation between the four tools-family pages so members can hop
 * around without coming back here.
 *
 * Sidebar collapses on mount via the existing sap-sidebar-set-collapsed
 * event — same pattern as IncomePage.
 *
 * Approved layout: /mnt/user-data/outputs/tools-page-mockup.html
 * (refined per founder direction 26 Apr 2026 — overview-only, no
 * inline tool grids).
 */
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Lock, Plus, Wrench, Zap } from 'lucide-react';

export default function ToolsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sidebar collapse on mount, restore on unmount
  useEffect(() => {
    let priorCollapsed = false;
    try { priorCollapsed = window.localStorage.getItem('sap-sidebar-collapsed') === '1'; } catch (e) {}
    window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: priorCollapsed }));
    };
  }, []);

  // Tier detection
  const tier = (user?.membership_tier || '').toLowerCase();
  const isPro = tier === 'pro';
  const isBasic = tier === 'basic' || isPro;

  const tierLabel = isPro ? 'PRO' : (isBasic ? 'BASIC' : 'FREE');
  const tierClass = isPro ? 'pro' : (isBasic ? 'basic' : 'none');

  const username = user?.username || user?.email || 'Member';
  const initial = username.charAt(0).toUpperCase();

  let activeSinceLabel = '';
  if (user?.created_at) {
    try {
      const d = new Date(user.created_at);
      activeSinceLabel = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    } catch (e) { /* ignore */ }
  }

  return (
    <AppLayout title={t('tools.pageTitle', { defaultValue: 'Tools' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        {/* ── Identity hero ── */}
        <div style={{
          background: 'var(--sap-cobalt-deep, #172554)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 24,
          color: '#fff',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
          flexWrap: 'wrap',
        }}>
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%',
            background: 'radial-gradient(circle at 70% 50%, rgba(139,92,246,0.18), transparent 60%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Sora', sans-serif", fontSize: 30, fontWeight: 800, color: '#fff',
              flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.1)',
            }}>{initial}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                {t('tools.heroEyebrow', { defaultValue: 'Your Tools' })}
              </div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.5px', marginBottom: 8, wordBreak: 'break-word' }}>
                {username}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 6, letterSpacing: '0.06em',
                  background: tierClass === 'pro' ? '#f59e0b' : tierClass === 'basic' ? '#0ea5e9' : 'rgba(255,255,255,0.15)',
                  color: tierClass === 'pro' ? '#1f1300' : '#fff',
                }}>
                  {tierLabel}
                </span>
                {activeSinceLabel && (
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', marginRight: 8 }}>·</span>
                    {t('tools.activeSince', { defaultValue: 'Active since' })} {activeSinceLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link to="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 18px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10,
            color: '#fff',
            fontSize: 14, fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.15s',
            position: 'relative', zIndex: 1,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
            <ArrowLeft size={14} strokeWidth={2.5} />
            {t('tools.backToDashboard', { defaultValue: 'Back to Dashboard' })}
          </Link>
        </div>

        {/* ── Three door cards (the entire content of /tools) ── */}
        <div style={{
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 14,
        }}>
          {t('tools.categoriesSection', { defaultValue: 'Your tool categories' })}
        </div>
        <div className="tools-doors-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
        }}>
          <DoorCard
            tone="green"
            icon={Plus}
            eyebrow={t('tools.door.free.eyebrow', { defaultValue: 'Open to everyone' })}
            title={t('tools.door.free.title', { defaultValue: 'Free Tools' })}
            desc={t('tools.door.free.desc', { defaultValue: 'Banner Creator, Meme Generator, QR Generator. Lead-magnet tools you can use any time.' })}
            count={t('tools.door.free.count', { defaultValue: '3 tools' })}
            navigate={navigate}
            destination="/tools/free"
            locked={false}
            actionLabel={t('tools.door.open', { defaultValue: 'Open' })}
          />
          <DoorCard
            tone="cyan"
            icon={Wrench}
            eyebrow={isBasic ? t('tools.door.basic.eyebrowOpen', { defaultValue: 'Basic plan & up' }) : t('tools.door.basic.eyebrowLocked', { defaultValue: 'Upgrade to unlock' })}
            title={t('tools.door.basic.title', { defaultValue: 'Basic Membership Tools' })}
            desc={t('tools.door.basic.desc', { defaultValue: 'Creative Studio, Content Creator, LinkHub, Link Tools, SuperDeck. Everyday building tools.' })}
            count={isBasic ? t('tools.door.basic.count', { defaultValue: '5 tools' }) : t('tools.door.basic.countLocked', { defaultValue: '5 tools · locked' })}
            navigate={navigate}
            destination="/tools/basic"
            locked={!isBasic}
            actionLabel={isBasic ? t('tools.door.open', { defaultValue: 'Open' }) : t('tools.door.upgrade', { defaultValue: 'Upgrade' })}
          />
          <DoorCard
            tone="amber"
            icon={Zap}
            eyebrow={isPro ? t('tools.door.pro.eyebrowOpen', { defaultValue: 'Pro plan unlocked' }) : t('tools.door.pro.eyebrowLocked', { defaultValue: 'Upgrade to unlock' })}
            title={t('tools.door.pro.title', { defaultValue: 'Pro Membership Tools' })}
            desc={t('tools.door.pro.desc', { defaultValue: 'SuperPages, AutoResponder, Lead Finder, Niche Finder, ProSeller. Serious business growth tools.' })}
            count={isPro ? t('tools.door.pro.count', { defaultValue: '5 tools' }) : t('tools.door.pro.countLocked', { defaultValue: '5 tools · locked' })}
            navigate={navigate}
            destination="/tools/pro"
            locked={!isPro}
            actionLabel={isPro ? t('tools.door.open', { defaultValue: 'Open' }) : t('tools.door.upgrade', { defaultValue: 'Upgrade' })}
          />
        </div>

      </div>

      <style>{`
        @media (max-width: 1100px) {
          .tools-doors-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AppLayout>
  );
}

// ════════════════════════════════════════════════════════════════
// DoorCard — one of the three big category cards
// ════════════════════════════════════════════════════════════════
// Locked cards still navigate to the sub-page (which itself shows the
// upgrade card as its content). Member sees the full upgrade message
// on the destination page rather than being bounced to /upgrade.
function DoorCard({ tone, icon: Icon, eyebrow, title, desc, count, navigate, destination, locked, actionLabel }) {
  const accent = { green: '#22c55e', cyan: '#0ea5e9', amber: '#f59e0b' }[tone] || '#94a3b8';
  const iconBg = locked ? '#94a3b8' : accent;
  const pillStyle = {
    green: { bg: '#dcfce7', color: '#15803d' },
    cyan:  { bg: '#cffafe', color: '#0e7490' },
    amber: { bg: '#fef3c7', color: '#b45309' },
  }[tone] || { bg: '#f1f5f9', color: '#475569' };

  return (
    <button
      type="button"
      onClick={() => navigate(destination)}
      style={{
        background: '#fff',
        border: '1px solid var(--sap-border, #e2e8f0)',
        borderRadius: 16,
        padding: '28px 24px 24px 32px',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'all 0.18s',
        display: 'flex', flexDirection: 'column',
        minHeight: 260,
        textAlign: 'left',
        fontFamily: 'inherit',
        opacity: locked ? 0.85 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)';
      }}
    >
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, background: accent }} />

      <div style={{ width: 56, height: 56, borderRadius: 14, background: iconBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        {locked ? <Lock size={24} strokeWidth={2} /> : <Icon size={26} strokeWidth={2} />}
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sap-text-faint, #94a3b8)', marginBottom: 8 }}>
        {eyebrow}
      </div>
      <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--sap-text-primary, #0f172a)', lineHeight: 1.2, letterSpacing: '-0.5px', marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.5, flex: 1, marginBottom: 16 }}>
        {desc}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--sap-border-light, #f1f5f9)', fontSize: 13 }}>
        <span style={{ fontWeight: 700, color: 'var(--sap-text-faint, #94a3b8)' }}>{count}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '6px 12px',
          borderRadius: 99,
          fontSize: 12, fontWeight: 700,
          background: pillStyle.bg,
          color: pillStyle.color,
        }}>
          {actionLabel} <span style={{ opacity: 0.65 }}>→</span>
        </span>
      </div>
    </button>
  );
}
