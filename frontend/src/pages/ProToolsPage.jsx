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

  // Tier check — only Pro members get the tools
  const tier = (user?.membership_tier || '').toLowerCase();
  const isPro = tier === 'pro';

  const tools = getProTools(t);

  return (
    <AppLayout title={t('tools.pro.pageTitle', { defaultValue: 'Pro Tools' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="tools.pro.heroEyebrow"
          eyebrowDefault="Pro Membership Tools"
          glowColor="rgba(245,158,11,0.18)"
        />

        <div style={{
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 14,
        }}>
          {isPro
            ? t('tools.section.proUnlocked', { defaultValue: 'Pro Membership Tools · 5 tools unlocked at $97/mo' })
            : t('tools.section.proLocked', { defaultValue: 'Pro Membership Tools · upgrade to unlock' })
          }
        </div>

        {isPro ? (
          <ToolGrid tools={tools} tone="amber" />
        ) : (
          <UpgradeCard
            tone="pro"
            icon={Zap}
            eyebrow={t('tools.upgrade.pro.eyebrow', { defaultValue: 'Unlock 5 more pro tools' })}
            title={t('tools.upgrade.pro.title', { defaultValue: 'Upgrade to Pro Membership' })}
            desc={t('tools.upgrade.pro.desc', { defaultValue: 'Get the serious business-growth toolkit: hosted landing pages, email automation, lead-finding, niche analysis, AI sales coaching.' })}
            items={tools.map(tool => tool.name)}
            price="$97"
            period={t('tools.upgrade.perMonth', { defaultValue: '/mo' })}
            ctaLabel={t('tools.upgrade.cta', { defaultValue: 'Upgrade now' })}
          />
        )}

      </div>
    </AppLayout>
  );
}
