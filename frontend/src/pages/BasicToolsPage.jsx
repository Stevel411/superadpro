/**
 * BasicToolsPage.jsx — /tools/basic
 * ════════════════════════════════════════════════════════════════
 * The Basic Membership Tools section as a standalone page. Tier-gated:
 * Basic+ members see the 5 tool cards, non-members see an
 * upgrade-to-Basic card as the page content.
 *
 * Sidebar collapses on mount (matches Tools-family pattern).
 * Persistent ToolsTabs strip rendered by AppLayout.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { Wrench } from 'lucide-react';
import { getBasicTools, ToolGrid, UpgradeCard, SubPageHero } from './tools-shared';

export default function BasicToolsPage() {
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

  // Tier check — Basic+ members get the tools, non-members get the upgrade card
  const tier = (user?.membership_tier || '').toLowerCase();
  const isBasic = tier === 'basic' || tier === 'pro';

  const tools = getBasicTools(t);

  return (
    <AppLayout title={t('tools.basic.pageTitle', { defaultValue: 'Basic Tools' })}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        <SubPageHero
          user={user}
          t={t}
          eyebrowKey="tools.basic.heroEyebrow"
          eyebrowDefault="Basic Membership Tools"
          glowColor="rgba(14,165,233,0.18)"
        />

        <div style={{
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 14,
        }}>
          {isBasic
            ? t('tools.section.basicUnlocked', { defaultValue: 'Basic Membership Tools · 5 tools unlocked at $20/mo' })
            : t('tools.section.basicLocked', { defaultValue: 'Basic Membership Tools · upgrade to unlock' })
          }
        </div>

        {isBasic ? (
          <ToolGrid tools={tools} tone="cyan" />
        ) : (
          <UpgradeCard
            tone="basic"
            icon={Wrench}
            eyebrow={t('tools.upgrade.basic.eyebrow', { defaultValue: 'Unlock 5 building tools' })}
            title={t('tools.upgrade.basic.title', { defaultValue: 'Upgrade to Basic Membership' })}
            desc={t('tools.upgrade.basic.desc', { defaultValue: 'Everything you need to create content for your business: AI image and video, written content, link management, presentations.' })}
            items={tools.map(tool => tool.name)}
            price="$20"
            period={t('tools.upgrade.perMonth', { defaultValue: '/mo' })}
            ctaLabel={t('tools.upgrade.cta', { defaultValue: 'Upgrade now' })}
          />
        )}

      </div>
    </AppLayout>
  );
}
