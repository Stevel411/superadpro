/**
 * BusinessHubTabs.jsx — Persistent navigation strip for the My Business door
 * ════════════════════════════════════════════════════════════════
 * Mirrors MyMarketingTabs/IncomeTabs. Rendered by AppLayout on any
 * Business-Hub-family route between the topbar and the page content, so
 * members hop between their business pages with one click.
 *
 * Precedence: this strip is checked FIRST in AppLayout, and the other
 * strips (My Marketing / Income / Tools / Learn) are guarded with
 * !isBusinessHubFamilyRoute, so a Business-family page shows only this
 * strip — never a second one. The Income family still references some of
 * these pages internally (Profit Grid, Analytics, Credits); resolving
 * that overlap is a separate IA pass (thin Income vs. Business). Until
 * then no page ever renders two strips — the guard guarantees that.
 *
 * Command-centre deep pages (/command-centre/directs/* and the BucketList
 * drill-downs) light up the Performance tab via prefix match.
 */
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Briefcase, Gauge, Users, Target, Layers, BarChart3, Zap, LayoutGrid, LineChart,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

function buildTabs(t) {
  return [
    { id: 'hub', label: t('businessHub.tabs.hub', { defaultValue: 'Hub' }),
      icon: Briefcase, tone: 'cobalt', path: '/business-hub', match: ['/business-hub'] },
    { id: 'performance', label: t('businessHub.tabs.performance', { defaultValue: 'Performance' }),
      icon: Gauge, tone: 'cyan', path: '/command-centre', match: ['/command-centre'] },
    { id: 'team', label: t('businessHub.tabs.team', { defaultValue: 'Team' }),
      icon: Users, tone: 'cobalt', path: '/my-team', match: ['/my-team'] },
    { id: 'analytics', label: t('businessHub.tabs.analytics', { defaultValue: 'Campaign Analytics' }),
      icon: BarChart3, tone: 'cyan', path: '/campaign-analytics', match: ['/campaign-analytics'] },
    { id: 'fullanalytics', label: t('businessHub.tabs.fullAnalytics', { defaultValue: 'Full Analytics' }),
      icon: LineChart, tone: 'cobalt', path: '/analytics', match: ['/analytics'] },
    { id: 'mygrid', label: t('businessHub.tabs.myGrid', { defaultValue: 'My Grid' }),
      icon: LayoutGrid, tone: 'cobalt', path: '/grid-visualiser', match: ['/grid-visualiser'] },
    { id: 'grid', label: t('businessHub.tabs.grid', { defaultValue: 'Profit Grid' }),
      icon: Target, tone: 'cyan', path: '/campaign-tiers', match: ['/campaign-tiers'] },
    { id: 'credits', label: t('businessHub.tabs.credits', { defaultValue: 'Creator Credits' }),
      icon: Layers, tone: 'cobalt', path: '/my-credits', match: ['/my-credits'] },
    { id: 'calc', label: t('businessHub.tabs.calc', { defaultValue: 'Grid Calculator' }),
      icon: Zap, tone: 'cyan', path: '/grid-calculator', match: ['/grid-calculator'] },
  ];
}

const TONE = {
  cobalt: { bg: '#e0e7ff', color: '#1e3a8a' },
  cyan:   { bg: '#e6f6fb', color: '#0891b2' },
};

function findActiveTabId(pathname, tabs) {
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    for (var j = 0; j < tab.match.length; j++) {
      var pattern = tab.match[j];
      if (pathname === pattern || pathname.indexOf(pattern + '/') === 0) {
        return tab.id;
      }
    }
  }
  return null;
}

function scrollTabsStrip(direction) {
  var el = document.getElementById('businesshub-tabs-scroll');
  if (el) el.scrollBy({ left: direction === 'left' ? -240 : 240, behavior: 'smooth' });
}

export default function BusinessHubTabs() {
  const { t } = useTranslation();
  const location = useLocation();
  const tabs = buildTabs(t);
  const activeId = findActiveTabId(location.pathname, tabs);

  return (
    <div style={{ background: '#f0f3f9', padding: '16px 24px 0', position: 'relative' }}>
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, bottom: 0, left: 0,
          width: 60, pointerEvents: 'none', zIndex: 1,
          background: 'linear-gradient(90deg, #f0f3f9 0%, #f0f3f9 35%, rgba(240,243,249,0) 100%)',
        }} />

        <button type="button" onClick={() => scrollTabsStrip('left')}
          aria-label={t('businessHub.scrollLeft', { defaultValue: 'Scroll left' })}
          style={{
            position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)',
            width: 30, height: 30, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)', color: '#475569',
          }}>
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>

        <div id="businesshub-tabs-scroll" style={{
          display: 'flex', gap: 8, overflowX: 'auto', overflowY: 'hidden',
          scrollBehavior: 'smooth', padding: '4px 44px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = tab.id === activeId;
            const tone = TONE[tab.tone] || TONE.cobalt;
            return (
              <Link key={tab.id} to={tab.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
                  padding: '6px 14px 6px 6px', background: '#fff',
                  border: isActive ? '1px solid var(--sap-cobalt-deep, #172554)' : '1px solid #e2e8f0',
                  borderRadius: 12, fontSize: 13, fontWeight: 700,
                  color: 'var(--sap-cobalt-deep, #172554)', transition: 'all 0.15s',
                  whiteSpace: 'nowrap', textDecoration: 'none',
                  boxShadow: isActive
                    ? '0 4px 12px rgba(15,23,42,0.12), 0 1px 3px rgba(15,23,42,0.08)'
                    : '0 2px 6px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 14px rgba(15,23,42,0.1), 0 2px 4px rgba(15,23,42,0.06)'; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)'; } }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 8, background: tone.bg, color: tone.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <TabIcon size={14} strokeWidth={2.2} />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, bottom: 0, right: 0,
          width: 60, pointerEvents: 'none', zIndex: 1,
          background: 'linear-gradient(270deg, #f0f3f9 0%, #f0f3f9 35%, rgba(240,243,249,0) 100%)',
        }} />

        <button type="button" onClick={() => scrollTabsStrip('right')}
          aria-label={t('businessHub.scrollRight', { defaultValue: 'Scroll right' })}
          style={{
            position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)',
            width: 30, height: 30, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)', color: '#475569',
          }}>
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>

      <style>{`#businesshub-tabs-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

// Helper for AppLayout. Mirrors isMyMarketingFamilyRoute / isIncomeFamilyRoute.
export function isBusinessHubFamilyRoute(pathname) {
  const PATHS = [
    '/business-hub',
    '/command-centre',
    '/my-team',
    '/campaign-tiers',
    '/grid-visualiser',
    '/my-credits',
    '/campaign-analytics',
    '/analytics',
    '/grid-calculator',
  ];
  for (var i = 0; i < PATHS.length; i++) {
    var p = PATHS[i];
    if (pathname === p || pathname.indexOf(p + '/') === 0) return true;
  }
  return false;
}
