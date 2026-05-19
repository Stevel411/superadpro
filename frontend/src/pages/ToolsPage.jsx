/**
 * ToolsPage.jsx — Tools overview page
 * ════════════════════════════════════════════════════════════════
 * /tools is an OVERVIEW-ONLY page. Members land here and see two
 * door cards representing the two tool categories:
 *
 *   AI Content Tools  → /tools/ai-content
 *   Builder Tools     → /tools/builder
 *
 * The actual tool grids live on those two sub-pages. The persistent
 * ToolsTabs strip (rendered by AppLayout) handles navigation between
 * the three tools-family pages so members can hop around without
 * coming back here.
 *
 * Locked legacy structure (Free / Basic / Pro) was retired 20 May 2026
 * along with the dual-tier membership purge. Under flat-pricing every
 * active member gets all 13 tools — the categorisation here is about
 * user intent (creating creative vs building/distributing), not pricing.
 *
 * Locked card state still shows for free members (is_active=false),
 * with a CTA to activate Partner membership.
 *
 * Sidebar collapses on mount via the existing sap-sidebar-set-collapsed
 * event — same pattern as IncomePage.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { Lock, Sparkles, Wrench } from 'lucide-react';
import { SubPageHero } from './tools-shared';

export default function ToolsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let priorCollapsed = false;
    try { priorCollapsed = window.localStorage.getItem('sap-sidebar-collapsed') === '1'; } catch (e) {}
    window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: priorCollapsed }));
    };
  }, []);

  // Under flat-pricing (locked 15 May 2026), every is_active member has
  // full tool access. Free members see locked cards with an upgrade CTA.
  const isActive = !!user?.is_active;

  return (
    <AppLayout title={t('tools.pageTitle', { defaultValue: 'Tools' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="tools.heroEyebrow"
          eyebrowDefault="Your Tools"
        />

        <div style={{
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 14,
        }}>
          {t('tools.categoriesSection', { defaultValue: 'Your tool categories' })}
        </div>
        <div className="tools-doors-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16,
        }}>
          <DoorCard
            tone="cyan"
            icon={Sparkles}
            eyebrow={isActive
              ? t('tools.door.ai.eyebrowOpen', { defaultValue: 'Included with your membership' })
              : t('tools.door.ai.eyebrowLocked', { defaultValue: 'Activate to unlock' })}
            title={t('tools.door.ai.title', { defaultValue: 'AI Content Tools' })}
            desc={t('tools.door.ai.desc', { defaultValue: 'Creative Studio, Content Creator, SuperDeck, Banner Creator, Meme Generator, QR Generator, Niche Finder. Generate assets, copy, and ideas with AI.' })}
            count={isActive
              ? t('tools.door.ai.count', { defaultValue: '7 tools' })
              : t('tools.door.ai.countLocked', { defaultValue: '7 tools · locked' })}
            navigate={navigate}
            destination="/tools/ai-content"
            locked={!isActive}
            actionLabel={isActive ? t('tools.door.open', { defaultValue: 'Open' }) : t('tools.door.activate', { defaultValue: 'Activate' })}
          />
          <DoorCard
            tone="indigo"
            icon={Wrench}
            eyebrow={isActive
              ? t('tools.door.builder.eyebrowOpen', { defaultValue: 'Included with your membership' })
              : t('tools.door.builder.eyebrowLocked', { defaultValue: 'Activate to unlock' })}
            title={t('tools.door.builder.title', { defaultValue: 'Builder Tools' })}
            desc={t('tools.door.builder.desc', { defaultValue: 'SuperPages, LinkHub, Link Tools, AutoResponder, Lead Finder, ProSeller. Build pages, capture leads, distribute campaigns.' })}
            count={isActive
              ? t('tools.door.builder.count', { defaultValue: '6 tools' })
              : t('tools.door.builder.countLocked', { defaultValue: '6 tools · locked' })}
            navigate={navigate}
            destination="/tools/builder"
            locked={!isActive}
            actionLabel={isActive ? t('tools.door.open', { defaultValue: 'Open' }) : t('tools.door.activate', { defaultValue: 'Activate' })}
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
// DoorCard — one of the two big category cards
// ════════════════════════════════════════════════════════════════
// Locked cards still navigate to the sub-page (which itself shows the
// upgrade card as its content). Member sees the full upgrade message
// on the destination page rather than being bounced to /upgrade.
function DoorCard({ tone, icon: Icon, eyebrow, title, desc, count, navigate, destination, locked, actionLabel }) {
  const accent = { cyan: '#0ea5e9', indigo: '#6366f1' }[tone] || '#94a3b8';
  const iconBg = locked ? '#94a3b8' : accent;
  const pillStyle = {
    cyan:   { bg: '#cffafe', color: '#0e7490' },
    indigo: { bg: '#e0e7ff', color: '#4338ca' },
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
