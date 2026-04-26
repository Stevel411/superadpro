/**
 * LearnTabs.jsx — Persistent navigation strip for the Learn door
 * ════════════════════════════════════════════════════════════════
 * Mirrors ToolsTabs/IncomeTabs exactly. Rendered by AppLayout on any
 * Learn-family route between the topbar and the page content. Members
 * hop between Learn sub-pages with one click; the active tab highlights
 * to show where they are.
 *
 * Active-tab logic:
 *   /learn             → Overview tab
 *   /learn/education and the actual education pages → Education tab
 *   /learn/assets and the asset pages → Promotional Assets tab
 *   /learn/community and the community pages → Community tab
 *
 * No tier-gating — Learn content is open to all members regardless of
 * membership_tier. So all tabs are unlocked, no Lock icons, no muted
 * styling.
 *
 * Routing-conflict note:
 *   /compensation-plan is currently in the IncomeTabs match list (it's
 *   also the comp plan explainer used inside Income). It also belongs
 *   in Learn → Education conceptually. Leaving it ONLY in IncomeTabs
 *   for now to avoid both strips trying to render on the same URL —
 *   isLearnFamilyRoute below excludes /compensation-plan so it stays
 *   in Income's family. If we want it dual-located later, the right
 *   move is to remove from Income and add to Learn (clean split).
 *
 *   /tour is only used here (Platform Tour), no conflict.
 */
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Compass, GraduationCap, Megaphone, Users,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────
// The 4 visible tabs + their match lists.
// Each tab.match lists every pathname that should highlight this tab
// as active. Deep item pages light up the parent tab so members always
// know which group they're inside.
// ──────────────────────────────────────────────────────────────────
function buildTabs(t) {
  return [
    {
      id: 'overview',
      label: t('learn.tabs.overview', { defaultValue: 'Overview' }),
      icon: Compass, tone: 'violet',
      path: '/learn',
      match: ['/learn'],
    },
    {
      id: 'education',
      label: t('learn.tabs.education', { defaultValue: 'Education' }),
      icon: GraduationCap, tone: 'indigo',
      path: '/learn/education',
      // Education-related deep pages light up this tab.
      // /compensation-plan deliberately omitted — see header comment.
      match: [
        '/learn/education',
        '/training',
        '/tour',
        '/crypto-guide',
      ],
    },
    {
      id: 'assets',
      label: t('learn.tabs.assets', { defaultValue: 'Promotional Assets' }),
      icon: Megaphone, tone: 'pink',
      path: '/learn/assets',
      match: [
        '/learn/assets',
        '/marketing-materials',
        '/email-swipes',
        '/social-share',
      ],
    },
    {
      id: 'community',
      label: t('learn.tabs.community', { defaultValue: 'Community' }),
      icon: Users, tone: 'amber',
      path: '/learn/community',
      match: [
        '/learn/community',
        '/leaderboard',
        '/share-story',
      ],
    },
  ];
}

// Tone → colour theme for tab icon backgrounds and active-state highlight
const TONE = {
  violet: { bg: '#ede9fe', color: '#7c3aed', activeBorder: '#7c3aed', activeHalo: 'rgba(124,58,237,0.1)' },
  indigo: { bg: '#e0e7ff', color: '#4338ca', activeBorder: '#6366f1', activeHalo: 'rgba(99,102,241,0.1)' },
  pink:   { bg: '#fce7f3', color: '#be185d', activeBorder: '#ec4899', activeHalo: 'rgba(236,72,153,0.1)' },
  amber:  { bg: '#fef3c7', color: '#b45309', activeBorder: '#f59e0b', activeHalo: 'rgba(245,158,11,0.1)' },
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
  var el = document.getElementById('learn-tabs-scroll');
  if (el) el.scrollBy({ left: direction === 'left' ? -240 : 240, behavior: 'smooth' });
}

export default function LearnTabs() {
  const { t } = useTranslation();
  const location = useLocation();
  const tabs = buildTabs(t);
  const activeId = findActiveTabId(location.pathname, tabs);
  const activeTab = tabs.find(tt => tt.id === activeId);
  // Pick active tab's tone colour so the active-state highlight matches
  // its section colour (Education tab lights up indigo, Assets pink, etc).
  // Falls back to the violet Overview tone if no active tab matches.
  const activeTone = activeTab ? TONE[activeTab.tone] : TONE.violet;

  return (
    <div style={{
      background: '#f0f3f9',
      padding: '16px 24px 0',
      position: 'relative',
    }}>
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => scrollTabsStrip('left')}
          aria-label={t('learn.scrollLeft', { defaultValue: 'Scroll left' })}
          style={{
            position: 'absolute', top: '50%', left: -8, transform: 'translateY(-50%)',
            width: 36, height: 36, borderRadius: '50%',
            background: '#fff', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            color: '#475569',
          }}
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>

        <div id="learn-tabs-scroll" style={{
          display: 'flex', gap: 10,
          overflowX: 'auto', overflowY: 'hidden',
          scrollBehavior: 'smooth',
          padding: '4px 44px 4px 4px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = tab.id === activeId;
            const tone = TONE[tab.tone] || TONE.violet;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  flexShrink: 0,
                  padding: '10px 18px 10px 10px',
                  background: '#fff',
                  border: isActive
                    ? '1.5px solid ' + activeTone.activeBorder
                    : '1.5px solid #e2e8f0',
                  borderRadius: 14,
                  fontSize: 15, fontWeight: 700,
                  color: isActive ? tone.color : '#0f172a',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  boxShadow: isActive ? '0 0 0 3px ' + activeTone.activeHalo : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#94a3b8';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: tone.bg, color: tone.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <TabIcon size={18} strokeWidth={2.2} />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollTabsStrip('right')}
          aria-label={t('learn.scrollRight', { defaultValue: 'Scroll right' })}
          style={{
            position: 'absolute', top: '50%', right: -8, transform: 'translateY(-50%)',
            width: 36, height: 36, borderRadius: '50%',
            background: '#fff', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            color: '#475569',
          }}
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>

      <style>{`#learn-tabs-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Helper exported for AppLayout. Mirrors isToolsFamilyRoute /
// isIncomeFamilyRoute pattern.
//
// Deliberately excludes /compensation-plan and /tour from the family
// detector even though they're tab-matched - because:
//   /compensation-plan also belongs to the Income family (kept there
//   to avoid both strips fighting on the same URL until we decide
//   to migrate it cleanly).
//   /tour is a leaf page that doesn't really need the tab strip - the
//   member is taking a tour, the tab strip would be visual noise.
// ──────────────────────────────────────────────────────────────────
export function isLearnFamilyRoute(pathname) {
  const LEARN_PATHS = [
    '/learn',
    '/training',
    '/crypto-guide',
    '/marketing-materials',
    '/email-swipes',
    '/social-share',
    '/leaderboard',
    '/share-story',
  ];
  for (var i = 0; i < LEARN_PATHS.length; i++) {
    var p = LEARN_PATHS[i];
    if (pathname === p || pathname.indexOf(p + '/') === 0) return true;
  }
  return false;
}
