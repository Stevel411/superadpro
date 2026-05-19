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
  Compass, Sparkles, Wrench, Lock,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────
// The 3 visible tabs + their deep-page match lists
// ──────────────────────────────────────────────────────────────────
// Each tab's `match` array lists every pathname that should highlight
// this tab as active. Order matters — first match wins, so more specific
// patterns should come first.
//
// Two-category structure locked 20 May 2026, replacing the legacy
// Free/Basic/Pro three-bucket layout. Under flat-pricing every active
// member sees all tools — the bucket is about user intent, not pricing.
function buildTabs(t) {
  return [
    {
      id: 'overview',
      label: t('tools.tabs.overview', { defaultValue: 'Overview' }),
      icon: Compass, tone: 'violet',
      path: '/tools',
      match: ['/tools'],
      requiresTier: null,
    },
    {
      id: 'ai-content',
      label: t('tools.tabs.aiContent', { defaultValue: 'AI Content' }),
      icon: Sparkles, tone: 'cyan',
      path: '/tools/ai-content',
      // Match the sub-page + the seven AI-content tool pages so that
      // when a member is deep inside Creative Studio etc. the right
      // tab lights up.
      match: [
        '/tools/ai-content',
        '/creative-studio',
        '/content-creator',
        '/superdeck',
        '/tools/banner-creator',
        '/tools/meme-generator',
        '/tools/qr-code-generator',
        '/niche-finder',
        // Legacy paths kept here so deep-pages still highlight correctly
        // until the legacy redirects clear out of cache.
        '/tools/free',
        '/tools/basic',
        '/free/banner-creator',
        '/free/meme-generator',
        '/free/qr-code-generator',
      ],
      requiresTier: 'paid',
    },
    {
      id: 'builder',
      label: t('tools.tabs.builder', { defaultValue: 'Builder' }),
      icon: Wrench, tone: 'indigo',
      path: '/tools/builder',
      match: [
        '/tools/builder',
        '/pro/funnels',
        '/linkhub',
        '/link-tools',
        '/pro/leads',
        '/lead-finder',
        '/proseller',
        // Legacy /tools/pro maps here under the new structure.
        '/tools/pro',
      ],
      requiresTier: 'paid',
    },
  ];
}

// Tone → color theme map for the tab's icon box
const TONE = {
  violet: { bg: '#ede9fe', color: '#7c3aed' },
  cyan:   { bg: '#cffafe', color: '#0891b2' },
  indigo: { bg: '#e0e7ff', color: '#4338ca' },
  // Legacy tones retained for any external consumer; safe to remove
  // once we're sure nothing else imports them.
  green:  { bg: '#dcfce7', color: '#16a34a' },
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
// Under flat partner pricing (15 May 2026), every is_active member has
// full platform access. The legacy 'basic' vs 'pro' distinction in
// requiresTier values no longer differentiates — both collapse to a
// simple is_active check. requiresTier values still drive UI labelling
// elsewhere but no longer gate access.
// ──────────────────────────────────────────────────────────────────
function isTabUnlocked(tab, memberTier, isActive) {
  if (!tab.requiresTier) return true;
  // Flat-pricing accepts 'paid' as the canonical value, 'basic'/'pro'
  // as legacy aliases. All three collapse to a simple is_active check.
  if (tab.requiresTier === 'paid' || tab.requiresTier === 'basic' || tab.requiresTier === 'pro') return !!isActive;
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
  const isActive = !!user?.is_active;

  return (
    <div style={{
      // Sits inside the page content area, below the topbar.
      background: '#f0f3f9',
      padding: '16px 24px 0',
      position: 'relative',
    }}>
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto' }}>
        {/* Left fade mask — see IncomeTabs for full explanation. */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, bottom: 0, left: 0,
          width: 60, pointerEvents: 'none', zIndex: 1,
          background: 'linear-gradient(90deg, #f0f3f9 0%, #f0f3f9 35%, rgba(240,243,249,0) 100%)',
        }} />

        {/* Left scroll arrow */}
        <button
          type="button"
          onClick={() => scrollTabsStrip('left')}
          aria-label={t('tools.scrollLeft', { defaultValue: 'Scroll left' })}
          style={{
            position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)',
            width: 30, height: 30, borderRadius: '50%',
            background: '#fff', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            color: '#475569',
          }}
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>

        {/* Scrollable tabs container — symmetric 44px side padding so
            the first/last pill never sits beneath the chevrons. */}
        <div id="tools-tabs-scroll" style={{
          display: 'flex', gap: 8,
          overflowX: 'auto', overflowY: 'hidden',
          scrollBehavior: 'smooth',
          padding: '4px 44px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = tab.id === activeId;
            const unlocked = isTabUnlocked(tab, memberTier, isActive);
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
                  display: 'flex', alignItems: 'center', gap: 10,
                  flexShrink: 0,
                  padding: '6px 14px 6px 6px',
                  background: '#fff',
                  border: isActive ? '1px solid var(--sap-cobalt-deep, #172554)' : '1px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: 13, fontWeight: 700,
                  color: unlocked ? 'var(--sap-cobalt-deep, #172554)' : '#94a3b8',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  boxShadow: isActive
                    ? '0 4px 12px rgba(15,23,42,0.12), 0 1px 3px rgba(15,23,42,0.08)'
                    : '0 2px 6px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 14px rgba(15,23,42,0.1), 0 2px 4px rgba(15,23,42,0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)';
                  }
                }}
              >
                <span style={{
                  width: 26, height: 26, borderRadius: 8,
                  background: tone.bg, color: tone.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {unlocked
                    ? <TabIcon size={14} strokeWidth={2.2} />
                    : <Lock size={12} strokeWidth={2.2} />
                  }
                </span>
                {labelText}
              </Link>
            );
          })}
        </div>

        {/* Right fade mask. */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, bottom: 0, right: 0,
          width: 60, pointerEvents: 'none', zIndex: 1,
          background: 'linear-gradient(270deg, #f0f3f9 0%, #f0f3f9 35%, rgba(240,243,249,0) 100%)',
        }} />

        {/* Right scroll arrow */}
        <button
          type="button"
          onClick={() => scrollTabsStrip('right')}
          aria-label={t('tools.scrollRight', { defaultValue: 'Scroll right' })}
          style={{
            position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)',
            width: 30, height: 30, borderRadius: '50%',
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
    // Overview + sub-pages — /tools prefix catches /tools/ai-content
    // and /tools/builder via the matching loop below.
    '/tools',
    // AI Content tools (deep pages)
    '/creative-studio',
    '/content-creator',
    '/superdeck',
    '/niche-finder',
    // Builder tools (deep pages)
    '/linkhub',
    '/link-tools',
    '/pro/funnels',
    '/pro/leads',
    '/lead-finder',
    '/proseller',
    // Legacy quick-tool routes — kept until the /free/* paths are
    // confirmed retired or redirected.
    '/free/banner-creator',
    '/free/meme-generator',
    '/free/qr-code-generator',
  ];
  for (var i = 0; i < TOOLS_PATHS.length; i++) {
    var p = TOOLS_PATHS[i];
    if (pathname === p || pathname.indexOf(p + '/') === 0) return true;
  }
  return false;
}
