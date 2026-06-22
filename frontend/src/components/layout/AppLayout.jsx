import { useState, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileTabBar from './MobileTabBar';
import IncomeTabs, { isIncomeFamilyRoute } from './IncomeTabs';
import ToolsTabs, { isToolsFamilyRoute } from './ToolsTabs';
import LearnTabs, { isLearnFamilyRoute } from './LearnTabs';
import MyMarketingTabs, { isMyMarketingFamilyRoute } from './MyMarketingTabs';
import BusinessHubTabs, { isBusinessHubFamilyRoute } from './BusinessHubTabs';
import CampaignVideosTabs, { isCampaignVideosFamilyRoute } from './CampaignVideosTabs';
import InstallPrompt from '../InstallPrompt';
import CategoryTopBar from '../CategoryTopBar';
import { useLocation } from 'react-router-dom';

function useIsMobile() {
  var check = function() { return typeof window !== 'undefined' && window.innerWidth < 768; };
  var [mobile, setMobile] = useState(check);
  useEffect(function() {
    function onResize() { setMobile(check()); }
    window.addEventListener('resize', onResize);
    return function() { window.removeEventListener('resize', onResize); };
  }, []);
  return mobile;
}

var MOBILE_TABS = ['/watch', '/dashboard', '/wallet', '/'];

export default function AppLayout({ title, subtitle, topbarActions, children, bgStyle, fullHeight, hideSidebar, hideTopbar, categoryBack }) {
  var [sidebarOpen, setSidebarOpen] = useState(false);
  var closeSidebar = useCallback(function() { setSidebarOpen(false); }, []);
  var openSidebar = useCallback(function() { setSidebarOpen(true); }, []);
  var isMobile = useIsMobile();
  var location = useLocation();
  // Sidebar RETIRED for members (22 Jun 2026): every non-admin page now
  // defaults to the no-sidebar CategoryTopBar chrome (logo -> dashboard, back
  // -> the categoryBack target, or Dashboard when none is given). This kills
  // the old sidebar + contextual tab strips + Topbar across the member app in
  // one move. Admin routes (/admin*) keep their existing layout (separate
  // track). Full-screen surfaces opt out via hideSidebar. A page's specific
  // categoryBack still sets its back-target when provided.
  var isAdminRoute = location.pathname.indexOf('/admin') === 0;
  var catMode = !isAdminRoute && !hideSidebar;
  var backTarget = categoryBack || { to: '/home-preview', label: 'Dashboard' };

  // Desktop collapse state — persisted in localStorage so the user's preference
  // survives reloads. Default is 'open' so new members see the full labels.
  var [collapsed, setCollapsed] = useState(function() {
    try {
      return window.localStorage.getItem('sap-sidebar-collapsed') === '1';
    } catch (e) { return false; }
  });
  var toggleCollapsed = useCallback(function() {
    setCollapsed(function(prev) {
      var next = !prev;
      try { window.localStorage.setItem('sap-sidebar-collapsed', next ? '1' : '0'); } catch (e) {}
      return next;
    });
  }, []);

  // Listen for external collapse requests — used by the SuperPages editor to
  // auto-collapse the sidebar when the editor opens, so the canvas gets max
  // working space. Any page can dispatch `sap-sidebar-set-collapsed` with a
  // boolean detail to request a state change without direct coupling.
  useEffect(function() {
    function onRequest(e) {
      var wanted = !!(e && e.detail);
      setCollapsed(function(prev) {
        if (prev === wanted) return prev;
        try { window.localStorage.setItem('sap-sidebar-collapsed', wanted ? '1' : '0'); } catch (err) {}
        return wanted;
      });
    }
    window.addEventListener('sap-sidebar-set-collapsed', onRequest);
    return function() { window.removeEventListener('sap-sidebar-set-collapsed', onRequest); };
  }, []);

  // First-view flag — controls the pulse animation on the toggle button.
  // Shown once per install; dismissed on first click OR automatically after 3s.
  var [firstView, setFirstView] = useState(function() {
    try {
      return window.localStorage.getItem('sap-sidebar-hint-seen') !== '1';
    } catch (e) { return false; }
  });
  // Auto-dismiss after 3 seconds
  useEffect(function() {
    if (!firstView) return undefined;
    var timer = setTimeout(function() {
      setFirstView(false);
      try { window.localStorage.setItem('sap-sidebar-hint-seen', '1'); } catch (e) {}
    }, 3000);
    return function() { clearTimeout(timer); };
  }, [firstView]);
  var dismissFirstView = useCallback(function() {
    if (firstView) {
      setFirstView(false);
      try { window.localStorage.setItem('sap-sidebar-hint-seen', '1'); } catch (e) {}
    }
  }, [firstView]);

  var isMobileTabPage = isMobile && MOBILE_TABS.indexOf(location.pathname) !== -1;

  // Compute the sidebar offset. Only applies on desktop; mobile always 0.
  var desktopOffset = collapsed ? 72 : 224;

  return (
    <div
      className={fullHeight ? 'flex' : 'flex min-h-screen'}
      // 100dvh (dynamic viewport height) handles iOS Safari's address-bar
      // show/hide gracefully — without it, content scrolled behind the bar
      // on browser-mode iOS. In standalone PWA mode there's no address bar
      // so 100dvh and 100vh are identical, so this is a no-op there.
      style={fullHeight ? { height: '100dvh', overflow: 'hidden' } : undefined}
    >

      {/* Mobile overlay — tap to close sidebar */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:40,backdropFilter:'blur(2px)'}}
        />
      )}

      {/* Sidebar — always mounted on both desktop and mobile.
          On desktop: always visible (CSS @media min-width:768px overrides transform).
          On mobile: visible only when sidebarOpen=true (CSS @media max-width:767px slides it in/out).
          Conditional mounting was breaking the slide-in animation AND made debugging
          harder when the menu didn't appear (10 May 2026 launch-day mobile bug).

          hideSidebar (20 May 2026): SuperPages editor in sandbox mode passes
          this to claim the full viewport for the three-panel layout
          (inspector / canvas / blocks). When hidden, --sidebar-offset is
          forced to 0 below so main content fills the screen edge-to-edge. */}
      {!hideSidebar && !catMode && (
        <Sidebar open={sidebarOpen} onClose={closeSidebar}
                 collapsed={!isMobile && collapsed}
                 onToggleCollapsed={!isMobile ? function() { dismissFirstView(); toggleCollapsed(); } : undefined}
                 firstView={!isMobile && firstView} />
      )}
      {/* Main content — in fullHeight mode, lock to parent's 100dvh so main's
          overflow:hidden is authoritative and child scroll containers own the scroll */}
      <div className="flex-1 flex flex-col min-w-0"
        style={Object.assign(
          { marginLeft: 'var(--sidebar-offset,0)' },
          fullHeight ? { height: '100dvh', minHeight: 0 } : {}
        )}>
        {catMode && (
          <div style={{ padding: isMobile ? '14px 16px' : '18px 24px', background: '#FFFFFF' }}>
            <CategoryTopBar backTo={backTarget.to} backLabel={backTarget.label} />
            {topbarActions && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>{topbarActions}</div>
            )}
          </div>
        )}
        {!hideTopbar && !catMode && (
          <Topbar title={title} subtitle={subtitle} onMenuClick={openSidebar}>
            {topbarActions}
          </Topbar>
        )}
        {/* Persistent My Marketing tabs strip — Steve 1 Jun 2026. Checked
            FIRST and the others are guarded against its routes, so a page
            that moved into My Marketing (social-share, comp-plan, brand-
            posters, marketing-materials, email-swipes, share-story, pay-it-
            forward) shows only this strip, never its old Learn/Income one. */}
        {/* Strip precedence (1 Jun 2026). Each family is mutually exclusive
            on a given URL via the guards below, so a page never renders two
            strips. Order: Business → Campaign Videos → My Marketing → Income
            → Tools → Learn. Campaign Videos claims /watch, /create-campaign,
            /video-library and /campaign-analytics (previously Income-family).
            /campaign-tiers stays in the Business family on purpose. */}
        {!catMode && isBusinessHubFamilyRoute(location.pathname) && <BusinessHubTabs />}
        {!catMode && !isBusinessHubFamilyRoute(location.pathname) && isCampaignVideosFamilyRoute(location.pathname) && <CampaignVideosTabs />}
        {!catMode && !isBusinessHubFamilyRoute(location.pathname) && !isCampaignVideosFamilyRoute(location.pathname) && isMyMarketingFamilyRoute(location.pathname) && <MyMarketingTabs />}
        {/* Persistent Income tabs strip — Wallet, Comp Plan, Membership etc. */}
        {!catMode && !isBusinessHubFamilyRoute(location.pathname) && !isCampaignVideosFamilyRoute(location.pathname) && !isMyMarketingFamilyRoute(location.pathname) && isIncomeFamilyRoute(location.pathname) && <IncomeTabs />}
        {/* Persistent Tools tabs strip. */}
        {!catMode && !isBusinessHubFamilyRoute(location.pathname) && !isCampaignVideosFamilyRoute(location.pathname) && !isMyMarketingFamilyRoute(location.pathname) && isToolsFamilyRoute(location.pathname) && <ToolsTabs />}
        {/* Persistent Learn tabs strip. */}
        {!catMode && !isBusinessHubFamilyRoute(location.pathname) && !isCampaignVideosFamilyRoute(location.pathname) && !isMyMarketingFamilyRoute(location.pathname) && isLearnFamilyRoute(location.pathname) && <LearnTabs />}
        <main className="flex-1 overflow-y-auto" style={Object.assign(
          {background: catMode ? '#FFFFFF' : '#f0f3f9', padding: isMobile ? '16px' : '24px'},
          // Tab-bar pages (Watch / Dashboard / Wallet / home): leave space
          // for the 60px tab bar at the bottom. The tab bar handles its
          // own iPhone home-indicator safe-area padding.
          isMobileTabPage ? {paddingBottom: 80} : {},
          // Non-tab-bar pages on mobile: ensure the last 16px of content
          // doesn't sit under the iPhone home indicator in standalone PWA.
          // env(safe-area-inset-bottom) is 0 in browser mode and ~34px on
          // iOS standalone Face ID phones, so the rule no-ops in browser
          // mode and adds the right amount of space in standalone.
          (isMobile && !isMobileTabPage) ? {paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'} : {},
          fullHeight ? { minHeight: 0 } : {},
          bgStyle || {}
        )}>
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — only on the 3 key pages */}
      {isMobileTabPage && <MobileTabBar />}

      {/* PWA install prompt — auto-hides if already installed or recently dismissed */}
      <InstallPrompt />

      {/* CSS to handle sidebar offset on desktop only + MOBILE RESPONSIVE */}
      <style>{`
        @media(min-width:768px){
          :root { --sidebar-offset: ${(hideSidebar || catMode) ? 0 : desktopOffset}px; }
        }
        @media(max-width:767px){
          :root { --sidebar-offset: 0px; }

          /* ── Dashboard grids ── */
          .grid-5-col { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .grid-2-col { grid-template-columns: 1fr !important; }
          .income-grid > div { min-width: 0 !important; }
          .actions-grid > div { min-width: 0 !important; }

          /* ── Generic grid overrides ── */
          *[class*="grid"] { max-width: 100% !important; }

          /* ── Hide scrollbars globally (still scrollable) ── */
          main::-webkit-scrollbar { display: none; }
          main { scrollbar-width: none; -ms-overflow-style: none; }

          /* ── Table horizontal scroll ── */
          table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }

          /* ── Admin tabs horizontal scroll ── */
          .admin-tabs { overflow-x: auto !important; flex-wrap: nowrap !important; -webkit-overflow-scrolling: touch; }
          .admin-tabs button { white-space: nowrap; flex-shrink: 0; padding-left: 10px !important; padding-right: 10px !important; font-size: 11px !important; }

          /* ── Force all wide containers to fit ── */
          main > div { max-width: 100% !important; overflow-x: hidden; }

          /* ── Hero/banner sections compact ── */
          div[style*="padding:48px"] { padding: 24px 16px !important; }
          div[style*="padding:60px"] { padding: 32px 16px !important; }

          /* ── Font scaling for huge text ── */
          div[style*="fontSize:48"], div[style*="fontSize:36"], div[style*="fontSize:32"] {
            font-size: 22px !important;
          }

          /* ── Comp plan 6×6 grid stays small ── */
          div[style*="repeat(6"] { gap: 2px !important; }
          div[style*="repeat(6"] > div { padding: 2px !important; font-size: 8px !important; }
        }
      `}</style>
    </div>
  );
}
