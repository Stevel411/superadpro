/**
 * CommunityPage.jsx — /learn/community
 * ════════════════════════════════════════════════════════════════
 * The Community sub-page of Door 4. 2 items in amber theme:
 * Leaderboard, Share Your Story.
 *
 * Uses 2-column grid since the section has exactly 2 items - they
 * sit side by side filling the row cleanly.
 *
 * Sidebar collapses on mount (matches Learn-family pattern).
 * Persistent LearnTabs strip rendered by AppLayout.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { getCommunityItems, ItemGrid, SubPageHero } from './learn-shared';

export default function CommunityPage() {
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

  const items = getCommunityItems(t);

  return (
    <AppLayout title={t('learn.community.pageTitle', { defaultValue: 'Community' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="learn.community.heroEyebrow"
          eyebrowDefault="Community"
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
          {t('learn.community.section', { defaultValue: 'Community · be seen, get inspired' })}
        </div>

        <ItemGrid items={items} tone="amber" columns={2} />

      </div>
    </AppLayout>
  );
}
