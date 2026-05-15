/**
 * ProToolsPage.jsx — /tools/pro
 * ════════════════════════════════════════════════════════════════
 * The Pro Membership Tools section as a standalone page. Tier-gated:
 * Pro members see the 5 tool cards, Basic members and non-members
 * see an upgrade-to-Pro card as the page content.
 *
 * Sidebar collapses on mount (matches Tools-family pattern).
 * Persistent ToolsTabs strip rendered by AppLayout.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { Zap } from 'lucide-react';
import { getProTools, ToolGrid, UpgradeCard, SubPageHero } from './tools-shared';

export default function ProToolsPage() {
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

  // Tier check — under flat partner pricing (15 May 2026), every is_active
  // member has access to these tools (formerly Pro-only). Free users still
  // see the upgrade card directing them to become a partner.
  // Variable name kept as `isPro` to minimise diff; semantics are now
  // "is active paying partner" rather than the legacy Pro-tier check.
  const isPro = !!user?.is_active;

  const tools = getProTools(t);

  return (
    <AppLayout title={t('tools.pro.pageTitle', { defaultValue: 'Pro Tools' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="tools.pro.heroEyebrow"
          eyebrowDefault="Pro Membership Tools"
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
          {isPro
            ? t('tools.section.proUnlocked', { defaultValue: 'Partner Tools · all unlocked for members' })
            : t('tools.section.proLocked', { defaultValue: 'Partner Tools · become a partner to unlock' })
          }
        </div>

        {isPro ? (
          <ToolGrid tools={tools} tone="amber" />
        ) : (
          <UpgradeCard
            tone="pro"
            icon={Zap}
            eyebrow={t('tools.upgrade.pro.eyebrow', { defaultValue: 'Unlock the full toolkit' })}
            title={t('tools.upgrade.pro.title', { defaultValue: 'Become a Partner' })}
            desc={t('tools.upgrade.pro.desc', { defaultValue: 'Get the serious business-growth toolkit: hosted landing pages, email automation, lead-finding, niche analysis, AI sales coaching.' })}
            items={tools.map(tool => tool.name)}
            price="$20"
            period={t('tools.upgrade.perMonth', { defaultValue: '/mo' })}
            ctaLabel={t('tools.upgrade.cta', { defaultValue: 'Become a Partner' })}
          />
        )}

      </div>
    </AppLayout>
  );
}
