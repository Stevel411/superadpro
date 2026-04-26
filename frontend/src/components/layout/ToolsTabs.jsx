/**
 * ToolsTabs.jsx — Persistent navigation strip for the Tools door
 * ════════════════════════════════════════════════════════════════
 * Mirrors IncomeTabs exactly. Rendered by AppLayout on any Tools-family
 * route (overview, sub-pages, individual tool pages) between the topbar
 * and the page content. Members can hop between Tools sub-pages with
 * one click, and the active tab highlights to show where they are.
 *
 * Active-tab logic:
 *   Each tab declares a `match` array of pathnames. The current
 *   location.pathname is checked against all tabs' match lists.
 *   First matching tab wins.
 *
 *   Examples:
 *     /tools             → Overview tab
 *     /tools/free, /free/banner-creator, etc. → Free Tools tab
 *     /tools/basic, /creative-studio, /linkhub, etc. → Basic Membership tab
 *     /tools/pro, /lead-finder, /pro/funnels, etc. → Pro Membership tab
 *
 * Tier-awareness:
 *   Locked tabs (Basic for non-members, Pro for non-Pros) still navigate.
 *   They go to the sub-page (/tools/basic or /tools/pro) which itself
 *   renders the upgrade card as page content. So tapping a locked tab
 *   takes the member to "see what they'd unlock", not to a hard wall.
 *   This matches the founder-approved UX from the mockup.
 *
 * Visual: pill-style cards with coloured icon boxes, scrollable
 * horizontally with chevron arrows on each end. Active tab gets violet
 * border + soft halo. Locked tabs use a Lock icon and grey muted styling.
 */
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import {
  Compass, Plus, Wrench, Zap, Lock,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────
// The 4 visible tabs + their deep-page match lists
// ──────────────────────────────────────────────────────────────────
// Each tab's `match` array lists every pathname that should highlight
// this tab as active. Order matters — first match wins, so more specific
// patterns should come first.
function buildTabs(t) {
  return [
    {
      id: 'overview',
      label: t('tools.tabs.overview', { defaultValue: 'Overview' }),
      icon: Compass, tone: 'violet',
      path: '/tools',
      match: ['/tools'],
      // Tier-gating: this tab never locks, members always see Overview
      requiresTier: null,
    },
    {
      id: 'free',
      label: t('tools.tabs.free', { defaultValue: 'Free Tools' }),
      icon: Plus, tone: 'green',
      path: '/tools/free',
      // Free is open to all, also matches the actual tool pages so when
      // a member is deep inside Banner Creator etc. the Free tab lights up.
      match: [
        '/tools/free',
        '/free/banner-creator',
        '/free/meme-generator',
        '/free/qr-code-generator',
      ],
      requiresTier: null, // Free tools open to everyone
    },
    {
      id: 'basic',
      label: t('tools.tabs.basic', { defaultValue: 'Basic Membership' }),
      icon: Wrench, tone: 'cyan',
      path: '/tools/basic',
      // Basic tier match: covers the sub-page + all 5 actual basic tool pages
      match: [
        '/tools/basic',
        '/creative-studio',
        '/content-creator',
        '/linkhub',
        '/link-tools',
        '/superdeck',
      ],
      requiresTier: 'basic', // Basic+ unlocks
    },
    {
      id: 'pro',
      label: t('tools.tabs.pro', { defaultValue: 'Pro Membership' }),
      icon: Zap, tone: 'amber',
      path: '/tools/pro',
      // Pro tier match: covers the sub-page + all 5 actual pro tool pages
      match: [
        '/tools/pro',
        '/pro/funnels',
        '/pro/leads',
        '/lead-finder',
        '/niche-finder',
        '/proseller',
      ],
      requiresTier: 'pro', // Only Pro unlocks
    },
  ];
}

// Tone → color theme map for the tab's icon box
const TONE = {
  violet: { bg: '#ede9fe', color: '#7c3aed' },
  green:  { bg: '#dcfce7', color: '#16a34a' },
  cyan:   { bg: '#cffafe', color: '#0891b2' },
  amber:  { bg: '#fef3c7', color: '#f59e0b' },
};
// Locked tab uses a muted grey treatment regardless of original tone.
const LOCKED_TONE = { bg: '#f1f5f9', color: '#64748b' };

// ──────────────────────────────────────────────────────────────────
// Find which tab is active for the current pathname.
// Returns null if no tab matches (deep page we haven't mapped).
// ──────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────
// Tier check — does the member meet the tab's required tier?
// `requiresTier=null` → always unlocked
// `requiresTier='basic'` → unlocked for Basic and Pro
// `requiresTier='pro'`   → only Pro unlocks
// ──────────────────────────────────────────────────────────────────
function isTabUnlocked(tab, memberTier) {
  if (!tab.requiresTier) return true;
  var tier = (memberTier || '').toLowerCase();
  if (tab.requiresTier === 'basic') return tier === 'basic' || tier === 'pro';
  if (tab.requiresTier === 'pro')   return tier === 'pro';
  return false;
}

// Horizontal scroll handler — used by chevron arrows on each end.
function scrollTabsStrip(direction) {
  var el = document.getElementById('tools-tabs-scroll');
  if (el) el.scrollBy({ left: direction === 'left' ? -240 : 240, behavior: 'smooth' });
}

export default function ToolsTabs() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const tabs = buildTabs(t);
  const activeId = findActiveTabId(location.pathname, tabs);
  const memberTier = user?.membership_tier;

  return (
    <div style={{
      // Sits inside the page content area, below the topbar.
      background: '#f0f3f9',
      padding: '16px 24px 0',
      position: 'relative',
    }}>
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
        {/* Left scroll arrow */}
        <button
          type="button"
          onClick={() => scrollTabsStrip('left')}
          aria-label={t('tools.scrollLeft', { defaultValue: 'Scroll left' })}
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
        <div id="tools-tabs-scroll" style={{
          display: 'flex', gap: 10,
          overflowX: 'auto', overflowY: 'hidden',
          scrollBehavior: 'smooth',
          padding: '4px 44px 4px 4px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = tab.id === activeId;
            const unlocked = isTabUnlocked(tab, memberTier);
            const tone = unlocked ? (TONE[tab.tone] || TONE.violet) : LOCKED_TONE;
            // Locked tabs still navigate — to the sub-page where the
            // upgrade card greets the member. No hard block here.
            const labelText = unlocked
              ? tab.label
              : tab.label + ' · ' + t('tools.locked', { defaultValue: 'Locked' });

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
                  color: isActive
                    ? '#7c3aed'
                    : (unlocked ? '#0f172a' : '#64748b'),
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
                  {unlocked
                    ? <TabIcon size={18} strokeWidth={2.2} />
                    : <Lock size={16} strokeWidth={2.2} />
                  }
                </span>
                {labelText}
              </Link>
            );
          })}
        </div>

        {/* Right scroll arrow */}
        <button
          type="button"
          onClick={() => scrollTabsStrip('right')}
          aria-label={t('tools.scrollRight', { defaultValue: 'Scroll right' })}
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
      <style>{`#tools-tabs-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Helper exported for AppLayout — checks if a pathname is part of the
// Tools family. Mirrors IncomeTabs.isIncomeFamilyRoute pattern.
// ──────────────────────────────────────────────────────────────────
export function isToolsFamilyRoute(pathname) {
  const TOOLS_PATHS = [
    // Overview + sub-pages
    '/tools',
    // Free tools (deep pages)
    '/free/banner-creator',
    '/free/meme-generator',
    '/free/qr-code-generator',
    // Basic tools (deep pages)
    '/creative-studio',
    '/content-creator',
    '/linkhub',
    '/link-tools',
    '/superdeck',
    // Pro tools (deep pages)
    '/pro/funnels',
    '/pro/leads',
    '/lead-finder',
    '/niche-finder',
    '/proseller',
  ];
  for (var i = 0; i < TOOLS_PATHS.length; i++) {
    var p = TOOLS_PATHS[i];
    if (pathname === p || pathname.indexOf(p + '/') === 0) return true;
  }
  return false;
}
