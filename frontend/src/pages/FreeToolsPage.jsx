/**
 * FreeToolsPage.jsx — /tools/free
 * ════════════════════════════════════════════════════════════════
 * The Free Tools section as a standalone page. Open to everyone,
 * no tier gating. Hero + tool grid.
 *
 * Sidebar collapses on mount (matches Tools-family pattern).
 * Persistent ToolsTabs strip rendered by AppLayout.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { getFreeTools, ToolGrid, SubPageHero } from './tools-shared';

export default function FreeToolsPage() {
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

  const tools = getFreeTools(t);

  return (
    <AppLayout title={t('tools.free.pageTitle', { defaultValue: 'Free Tools' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="tools.free.heroEyebrow"
          eyebrowDefault="Free Tools"
          glowColor="rgba(34,197,94,0.18)"
        />

        <div style={{
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 14,
        }}>
          {t('tools.section.free', { defaultValue: 'Free Tools · open to everyone' })}
        </div>

        <ToolGrid tools={tools} tone="green" />

      </div>
    </AppLayout>
  );
}
