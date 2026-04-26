/**
 * AssetsPage.jsx — /learn/assets
 * ════════════════════════════════════════════════════════════════
 * The Promotional Assets sub-page of Door 4. 3 items in pink theme:
 * Marketing Materials, Email Swipes, Social Share.
 *
 * Uses 3-column grid since the section has exactly 3 items - members
 * see them spread evenly across the row instead of squashed into 4
 * columns with an empty cell.
 *
 * Sidebar collapses on mount (matches Learn-family pattern).
 * Persistent LearnTabs strip rendered by AppLayout.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { getAssetItems, ItemGrid, SubPageHero } from './learn-shared';

export default function AssetsPage() {
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

  const items = getAssetItems(t);

  return (
    <AppLayout title={t('learn.assets.pageTitle', { defaultValue: 'Promotional Assets' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="learn.assets.heroEyebrow"
          eyebrowDefault="Promotional Assets"
          backLinkTo="/learn"
          backLinkLabelKey="learn.backToLearn"
          backLinkLabelDefault="Back to Learn"
        />

        <div style={{
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 14,
        }}>
          {t('learn.assets.section', { defaultValue: 'Promotional Assets · 3 ways to share & grow' })}
        </div>

        <ItemGrid items={items} tone="pink" columns={3} />

      </div>
    </AppLayout>
  );
}
