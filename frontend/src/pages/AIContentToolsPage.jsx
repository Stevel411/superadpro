/**
 * AIContentToolsPage.jsx — /tools/ai-content
 * ════════════════════════════════════════════════════════════════
 * The AI Content Tools section. Seven tools whose primary interaction
 * is "AI generates an asset for you":
 *   - Creative Studio (image, video, voice, music)
 *   - Content Creator (text/copy)
 *   - SuperDeck (slide decks)
 *   - Banner Creator
 *   - Meme Generator
 *   - QR Generator
 *   - Niche Finder
 *
 * Under flat-pricing (locked 15 May 2026), every active Partner or
 * Founding member sees the full grid. Free members see an upgrade card.
 *
 * Sidebar collapses on mount (matches Tools-family pattern).
 * Persistent ToolsTabs strip rendered by AppLayout.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { Sparkles } from 'lucide-react';
import { getAIContentTools, ToolGrid, SubPageHero } from './tools-shared';

export default function AIContentToolsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    let priorCollapsed = false;
    try { priorCollapsed = window.localStorage.getItem('sap-sidebar-collapsed') === '1'; } catch (e) {}
    window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: priorCollapsed }));
    };
  }, []);

  // Admin bypass: admins always see full tool access regardless of
  // activation state (handy for QA, content review, support).
  const isActive = !!user?.is_active || !!user?.is_admin;
  const tools = getAIContentTools(t);

  return (
    <AppLayout title={t('tools.ai.pageTitle', { defaultValue: 'AI Content Tools' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="tools.ai.heroEyebrow"
          eyebrowDefault="AI Content Tools"
          backLinkTo="/tools"
          backLinkLabelKey="tools.backToTools"
          backLinkLabelDefault="Back to Tools"
        />

        <div style={{
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 14,
        }}>
          {t('tools.section.ai', { defaultValue: 'AI Content Tools · generate assets, copy, ideas' })}
        </div>

        {isActive ? (
          <ToolGrid tools={tools} tone="cyan" />
        ) : (
          <UpgradeCard t={t} />
        )}

      </div>
    </AppLayout>
  );
}

// ──────────────────────────────────────────────────────────────────
// UpgradeCard — shown to free members. Single Partner upgrade CTA
// (no Pro/Basic split any more under flat-pricing).
// ──────────────────────────────────────────────────────────────────
function UpgradeCard({ t }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff 0%, #fff 60%, #cffafe 100%)',
      border: '1px solid var(--sap-border, #e2e8f0)',
      borderRadius: 16,
      padding: '32px 36px 32px 40px',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', gap: 32,
      flexWrap: 'wrap',
    }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 5, background: '#0ea5e9' }} />
      <div style={{
        width: 80, height: 80,
        borderRadius: 20,
        background: '#0ea5e9',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 8px 24px rgba(14,165,233,0.3)',
      }}>
        <Sparkles size={36} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: '#0e7490', marginBottom: 8,
        }}>
          {t('tools.ai.upgradeEyebrow', { defaultValue: 'Activate to unlock' })}
        </div>
        <div style={{
          fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 800,
          letterSpacing: '-0.4px', marginBottom: 10,
          color: 'var(--sap-text-primary, #0f172a)',
        }}>
          {t('tools.ai.upgradeTitle', { defaultValue: 'Unlock all 7 AI content tools' })}
        </div>
        <div style={{ fontSize: 14, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.6, marginBottom: 14 }}>
          {t('tools.ai.upgradeDesc', { defaultValue: 'Creative Studio, Content Creator, SuperDeck, plus quick-asset tools and Niche Finder. Generate posts, banners, videos, decks, niches — all included with your Partner membership.' })}
        </div>
      </div>
      <Link to="/upgrade" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '13px 28px',
        background: '#0ea5e9', color: '#fff',
        borderRadius: 12,
        fontSize: 15, fontWeight: 800,
        textDecoration: 'none',
        boxShadow: '0 6px 16px rgba(14,165,233,0.3)',
        flexShrink: 0,
      }}>
        {t('tools.ai.upgradeCta', { defaultValue: 'Activate Partner →' })}
      </Link>
    </div>
  );
}
