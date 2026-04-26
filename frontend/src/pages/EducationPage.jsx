/**
 * EducationPage.jsx — /learn/education
 * ════════════════════════════════════════════════════════════════
 * The Education sub-page of Door 4. 4 items in indigo theme:
 * Training Centre, Comp Plan Explainer, Platform Tour, Crypto Guide.
 *
 * No tier-gating — open to all members.
 *
 * Sidebar collapses on mount (matches Learn-family pattern).
 * Persistent LearnTabs strip rendered by AppLayout.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { getEducationItems, ItemGrid, SubPageHero } from './learn-shared';

export default function EducationPage() {
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

  const items = getEducationItems(t);

  return (
    <AppLayout title={t('learn.edu.pageTitle', { defaultValue: 'Education' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="learn.edu.heroEyebrow"
          eyebrowDefault="Education"
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
          {t('learn.edu.section', { defaultValue: 'Education · 4 ways to skill up' })}
        </div>

        <ItemGrid items={items} tone="indigo" columns={4} />

      </div>
    </AppLayout>
  );
}
