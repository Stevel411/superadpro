/**
 * MyMarketingTabs.jsx — Persistent navigation strip for the My Marketing door
 * ════════════════════════════════════════════════════════════════
 * Mirrors LearnTabs/ToolsTabs/IncomeTabs. Rendered by AppLayout on any
 * My-Marketing-family route between the topbar and the page content, so
 * members hop between their promotional pages with one click.
 *
 * One-family rule: every page listed here was REMOVED from the Learn /
 * Income strip families (and the Tools/Learn sidebar groups) so it has a
 * single home and only one strip ever renders on a given URL.
 *
 * Personal Sales Video (/ref/{username}/video — dynamic, public) and
 * Marketing Videos (not built yet) live on the hub landing only and are
 * intentionally not tabs here.
 */
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Megaphone, Share2, Gift, FileText, Sparkles, Image, Files, Mail,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

function buildTabs(t) {
  return [
    { id: 'hub', label: t('myMarketing.tabs.hub', { defaultValue: 'Hub' }),
      icon: Megaphone, tone: 'cobalt', path: '/my-marketing', match: ['/my-marketing'] },
    { id: 'link', label: t('myMarketing.tabs.link', { defaultValue: 'Affiliate Link' }),
      icon: Share2, tone: 'cyan', path: '/social-share', match: ['/social-share'] },
    { id: 'gift', label: t('myMarketing.tabs.gift', { defaultValue: 'Pay It Forward' }),
      icon: Gift, tone: 'pink', path: '/pay-it-forward', match: ['/pay-it-forward'] },
    { id: 'plan', label: t('myMarketing.tabs.plan', { defaultValue: 'Comp Plan' }),
      icon: FileText, tone: 'cobalt', path: '/compensation-plan', match: ['/compensation-plan'] },
    { id: 'story', label: t('myMarketing.tabs.story', { defaultValue: 'Share Your Story' }),
      icon: Sparkles, tone: 'cyan', path: '/share-story', match: ['/share-story'] },
    { id: 'posters', label: t('myMarketing.tabs.posters', { defaultValue: 'Brand Posters' }),
      icon: Image, tone: 'cobalt', path: '/brand-posters', match: ['/brand-posters'] },
    { id: 'decks', label: t('myMarketing.tabs.decks', { defaultValue: 'Marketing Decks' }),
      icon: Files, tone: 'cyan', path: '/marketing-materials', match: ['/marketing-materials'] },
    { id: 'email', label: t('myMarketing.tabs.email', { defaultValue: 'Email Swipes' }),
      icon: Mail, tone: 'cobalt', path: '/email-swipes', match: ['/email-swipes'] },
  ];
}

const TONE = {
  cobalt: { bg: '#e0e7ff', color: '#1e3a8a', activeBorder: '#1e3a8a', activeHalo: 'rgba(30,58,138,0.1)' },
  cyan:   { bg: '#e6f6fb', color: '#0891b2', activeBorder: '#0891b2', activeHalo: 'rgba(8,145,178,0.1)' },
  pink:   { bg: '#fce7f3', color: '#be185d', activeBorder: '#ec4899', activeHalo: 'rgba(236,72,153,0.1)' },
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
  var el = document.getElementById('mymarketing-tabs-scroll');
  if (el) el.scrollBy({ left: direction === 'left' ? -240 : 240, behavior: 'smooth' });
}

export default function MyMarketingTabs() {
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
          aria-label={t('myMarketing.scrollLeft', { defaultValue: 'Scroll left' })}
          style={{
            position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)',
            width: 30, height: 30, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)', color: '#475569',
          }}>
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>

        <div id="mymarketing-tabs-scroll" style={{
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
          aria-label={t('myMarketing.scrollRight', { defaultValue: 'Scroll right' })}
          style={{
            position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)',
            width: 30, height: 30, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)', color: '#475569',
          }}>
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>

      <style>{`#mymarketing-tabs-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

// Helper for AppLayout. Mirrors isLearnFamilyRoute / isToolsFamilyRoute.
// These paths were removed from the Learn and Income families so only the
// My Marketing strip renders on them.
export function isMyMarketingFamilyRoute(pathname) {
  const PATHS = [
    '/my-marketing',
    '/social-share',
    '/pay-it-forward',
    '/compensation-plan',
    '/share-story',
    '/brand-posters',
    '/marketing-materials',
    '/email-swipes',
  ];
  for (var i = 0; i < PATHS.length; i++) {
    var p = PATHS[i];
    if (pathname === p || pathname.indexOf(p + '/') === 0) return true;
  }
  return false;
}
