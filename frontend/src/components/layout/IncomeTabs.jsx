/**
 * IncomeTabs.jsx — Persistent navigation strip for the Income door
 * ════════════════════════════════════════════════════════════════
 * Rendered by AppLayout on any Income family route, between the topbar
 * and the page content. Mirrors the Platform Tour's pattern: the tabs
 * are always there, members can hop between Income sub-pages with a
 * single click, and the active tab highlights to show where they are.
 *
 * Active-tab logic:
 *   Each tab declares a `match` array of pathnames. The current
 *   location.pathname is checked against all tabs' match lists.
 *   First matching tab wins. Deep pages within a stream (e.g. /watch,
 *   /grid-calculator) light up the parent tab (Campaign Grid) so
 *   members always know which stream they're inside.
 *
 * Visual: pill-style cards with coloured icon boxes, scrollable
 * horizontally with chevron arrows on each end. Active tab gets
 * violet border + soft halo. Same styling as the original mockup.
 */
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Compass, Wallet, FileText, Users, Target, Layers, GraduationCap, Clock,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────
// The 8 visible tabs + their deep-page match lists
// ──────────────────────────────────────────────────────────────────
// Each tab's `match` array lists every pathname that should highlight
// this tab as active. Order matters — first match in the TABS array
// wins, so more specific tabs should come before generic catchalls.
function buildTabs(t) {
  return [
    {
      id: 'overview',
      label: t('income.tabs.overview', { defaultValue: 'Overview' }),
      icon: Compass, tone: 'violet',
      path: '/income',
      match: ['/income'],
    },
    {
      id: 'wallet',
      label: t('income.tabs.wallet', { defaultValue: 'Wallet' }),
      icon: Wallet, tone: 'green',
      path: '/wallet',
      match: ['/wallet'],
    },
    {
      id: 'comp-plan',
      label: t('income.tabs.compPlan', { defaultValue: 'Comp Plan' }),
      icon: FileText, tone: 'gray',
      path: '/compensation-plan',
      match: ['/compensation-plan'],
    },
    {
      id: 'membership',
      label: t('income.tabs.membership', { defaultValue: 'Membership' }),
      icon: Users, tone: 'green',
      path: '/income/membership',
      match: ['/income/membership'],
    },
    {
      id: 'grid',
      label: t('income.tabs.grid', { defaultValue: 'Campaign Grid' }),
      icon: Target, tone: 'cyan',
      path: '/campaign-tiers',
      // Grid is the busiest stream — its sub-features (Watch, Create
      // Campaign, My Videos, Analytics, Calculator, My Grid, Income
      // Chains) all light up this tab so members never feel lost.
      match: [
        '/campaign-tiers',
        '/watch',
        '/create-campaign',
        '/video-library',
        '/campaign-analytics',
        '/grid-calculator',
        '/grid-visualiser',
        '/income-chains',
        '/income-grid-3d',
      ],
    },
    {
      id: 'nexus',
      label: t('income.tabs.nexus', { defaultValue: 'Profit Nexus' }),
      icon: Layers, tone: 'violet',
      path: '/credit-nexus',
      match: ['/credit-nexus', '/nexus-visualiser'],
    },
    {
      id: 'courses',
      label: t('income.tabs.courses', { defaultValue: 'Course Academy' }),
      icon: GraduationCap, tone: 'amber',
      path: '/courses',
      // /courses/learn/:courseId is the actual course player — when
      // a member is taking a course they're conceptually inside the
      // Course Academy stream so light up this tab too.
      match: ['/courses', '/courses/commissions', '/courses/how-it-works', '/courses/learn'],
    },
    {
      id: 'history',
      label: t('income.tabs.history', { defaultValue: 'Earnings History' }),
      icon: Clock, tone: 'dark',
      path: '/wallet',
      match: [], // No exact match — Wallet tab handles /wallet, this is just a stand-in destination
    },
  ];
}

// Tone → color theme map for the tab's icon box
const TONE = {
  violet: { bg: '#ede9fe', color: '#7c3aed' },
  green:  { bg: '#dcfce7', color: '#16a34a' },
  gray:   { bg: '#f1f5f9', color: '#475569' },
  cyan:   { bg: '#cffafe', color: '#0891b2' },
  amber:  { bg: '#fef3c7', color: '#f59e0b' },
  dark:   { bg: '#f1f5f9', color: '#0f172a' },
};

// ──────────────────────────────────────────────────────────────────
// Derive which tab is active from the current pathname.
// Returns null if no tab matches (happens on deep pages we haven't mapped).
// ──────────────────────────────────────────────────────────────────
function findActiveTabId(pathname, tabs) {
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    for (var j = 0; j < tab.match.length; j++) {
      var pattern = tab.match[j];
      // Exact match OR pathname starts with pattern + "/" (covers nested
      // routes like /courses/learn/:id without false-positive matching
      // /coursesAlphaBeta).
      if (pathname === pattern || pathname.indexOf(pattern + '/') === 0) {
        return tab.id;
      }
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────
// Horizontal scroll handler — scrolls the tabs strip 240px per click.
// Used by the chevron arrows on each end.
// ──────────────────────────────────────────────────────────────────
function scrollTabsStrip(direction) {
  var el = document.getElementById('income-tabs-scroll');
  if (el) el.scrollBy({ left: direction === 'left' ? -240 : 240, behavior: 'smooth' });
}

export default function IncomeTabs() {
  const { t } = useTranslation();
  const location = useLocation();
  const tabs = buildTabs(t);
  const activeId = findActiveTabId(location.pathname, tabs);

  return (
    <div style={{
      // Sits inside the page content area, below the topbar.
      // Background matches the page background so the strip blends in.
      background: '#f0f3f9',
      padding: '16px 24px 0',
      position: 'relative',
    }}>
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
        {/* Left scroll arrow */}
        <button
          type="button"
          onClick={() => scrollTabsStrip('left')}
          aria-label={t('income.scrollLeft', { defaultValue: 'Scroll left' })}
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

        {/* Scrollable tabs container */}
        <div id="income-tabs-scroll" style={{
          display: 'flex', gap: 10,
          overflowX: 'auto', overflowY: 'hidden',
          scrollBehavior: 'smooth',
          padding: '4px 44px 4px 4px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const tone = TONE[tab.tone] || TONE.gray;
            const isActive = tab.id === activeId;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  flexShrink: 0,
                  padding: '10px 18px 10px 10px',
                  background: '#fff',
                  border: isActive ? '1.5px solid #7c3aed' : '1.5px solid #e2e8f0',
                  borderRadius: 14,
                  fontSize: 15, fontWeight: 700,
                  color: isActive ? '#7c3aed' : '#0f172a',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  boxShadow: isActive ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none',
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

        {/* Right scroll arrow */}
        <button
          type="button"
          onClick={() => scrollTabsStrip('right')}
          aria-label={t('income.scrollRight', { defaultValue: 'Scroll right' })}
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

      {/* Hide the webkit scrollbar — keep scrolling functional */}
      <style>{`#income-tabs-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Helper exported for AppLayout — checks if a pathname is part of the
// Income family. Single source of truth so future doors can mirror.
// ──────────────────────────────────────────────────────────────────
export function isIncomeFamilyRoute(pathname) {
  // Hard-coded list to match the tab destinations + their deep pages.
  // Kept as a separate function so we can extend later without touching
  // every call site.
  const INCOME_PATHS = [
    '/income',
    '/wallet',
    '/compensation-plan',
    '/campaign-tiers',
    '/credit-nexus',
    '/courses',
    '/grid-calculator',
    '/grid-visualiser',
    '/nexus-visualiser',
    '/income-chains',
    '/income-grid-3d',
    '/watch',
    '/create-campaign',
    '/video-library',
    '/campaign-analytics',
  ];
  for (var i = 0; i < INCOME_PATHS.length; i++) {
    var p = INCOME_PATHS[i];
    if (pathname === p || pathname.indexOf(p + '/') === 0) return true;
  }
  return false;
}
