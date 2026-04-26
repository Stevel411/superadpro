/**
 * LearnPage.jsx — Learn door overview page (Door 4)
 * ════════════════════════════════════════════════════════════════
 * /learn is overview-only: hero + three door cards.
 *
 *   Education          → /learn/education (indigo)
 *   Promotional Assets → /learn/assets    (pink)
 *   Community          → /learn/community (amber)
 *
 * Same architectural pattern as /tools — overview here, item grids
 * live on the sub-pages. Persistent LearnTabs strip handles
 * navigation between the four Learn-family pages.
 *
 * Sidebar collapses on mount (matches Income/Tools door pattern).
 *
 * Approved layout: /mnt/user-data/outputs/learn-page-mockup.html
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { GraduationCap, Megaphone, Users } from 'lucide-react';
import { SubPageHero } from './learn-shared';

export default function LearnPage() {
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

  return (
    <AppLayout title={t('learn.pageTitle', { defaultValue: 'Learn' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="learn.heroEyebrow"
          eyebrowDefault="Your Learning"
        />

        <div style={{
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 14,
        }}>
          {t('learn.categoriesSection', { defaultValue: 'Your learning categories' })}
        </div>

        <div className="learn-doors-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
        }}>
          <DoorCard
            tone="indigo"
            icon={GraduationCap}
            eyebrow={t('learn.door.education.eyebrow', { defaultValue: 'Skill up' })}
            title={t('learn.door.education.title', { defaultValue: 'Education' })}
            desc={t('learn.door.education.desc', { defaultValue: 'Training, comp plan explainer, platform tour, crypto guide. Master how the platform works.' })}
            count={t('learn.door.education.count', { defaultValue: '4 items' })}
            destination="/learn/education"
            navigate={navigate}
          />
          <DoorCard
            tone="pink"
            icon={Megaphone}
            eyebrow={t('learn.door.assets.eyebrow', { defaultValue: 'Share & promote' })}
            title={t('learn.door.assets.title', { defaultValue: 'Promotional Assets' })}
            desc={t('learn.door.assets.desc', { defaultValue: 'Marketing materials, email swipes, social share posts. Everything you need to grow your team.' })}
            count={t('learn.door.assets.count', { defaultValue: '3 items' })}
            destination="/learn/assets"
            navigate={navigate}
          />
          <DoorCard
            tone="amber"
            icon={Users}
            eyebrow={t('learn.door.community.eyebrow', { defaultValue: 'Connect & celebrate' })}
            title={t('learn.door.community.title', { defaultValue: 'Community' })}
            desc={t('learn.door.community.desc', { defaultValue: 'Leaderboard rankings and submit your own success story. Be seen, get inspired.' })}
            count={t('learn.door.community.count', { defaultValue: '2 items' })}
            destination="/learn/community"
            navigate={navigate}
          />
        </div>

      </div>

      <style>{`
        @media (max-width: 1100px) {
          .learn-doors-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AppLayout>
  );
}

// ════════════════════════════════════════════════════════════════
// DoorCard — one of the three big category cards
// ════════════════════════════════════════════════════════════════
function DoorCard({ tone, icon: Icon, eyebrow, title, desc, count, destination, navigate }) {
  const accent = { indigo: '#6366f1', pink: '#ec4899', amber: '#f59e0b' }[tone] || '#94a3b8';
  const pillStyle = {
    indigo: { bg: '#e0e7ff', color: '#4338ca' },
    pink:   { bg: '#fce7f3', color: '#be185d' },
    amber:  { bg: '#fef3c7', color: '#b45309' },
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
      {/* Left-edge accent stripe in tone colour */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, background: accent }} />

      <div style={{ width: 56, height: 56, borderRadius: 14, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Icon size={26} strokeWidth={2} />
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
          Open <span style={{ opacity: 0.65 }}>→</span>
        </span>
      </div>
    </button>
  );
}
