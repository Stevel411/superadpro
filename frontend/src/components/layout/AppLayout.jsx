import { useState, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileTabBar from './MobileTabBar';
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

export default function AppLayout({ title, subtitle, topbarActions, children, bgStyle }) {
  var [sidebarOpen, setSidebarOpen] = useState(false);
  var closeSidebar = useCallback(function() { setSidebarOpen(false); }, []);
  var openSidebar = useCallback(function() { setSidebarOpen(true); }, []);
  var isMobile = useIsMobile();
  var location = useLocation();

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
    <div className="flex min-h-screen">

      {/* Mobile overlay — tap to close sidebar */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:40,backdropFilter:'blur(2px)'}}
        />
      )}

      {/* Sidebar — hidden on mobile, visible on desktop */}
      {!isMobile && <Sidebar open={sidebarOpen} onClose={closeSidebar}
                              collapsed={collapsed} onToggleCollapsed={function() { dismissFirstView(); toggleCollapsed(); }}
                              firstView={firstView} />}
      {isMobile && sidebarOpen && <Sidebar open={true} onClose={closeSidebar} collapsed={false} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0" style={{marginLeft:'var(--sidebar-offset,0)'}}>
        <Topbar title={title} subtitle={subtitle} onMenuClick={openSidebar}>
          {topbarActions}
        </Topbar>
        <main className="flex-1 overflow-y-auto" style={Object.assign(
          {background:'#f0f3f9', padding: isMobile ? '16px' : '24px'},
          isMobileTabPage ? {paddingBottom: 80} : {},
          bgStyle || {}
        )}>
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — only on the 3 key pages */}
      {isMobileTabPage && <MobileTabBar />}

      {/* CSS to handle sidebar offset on desktop only + MOBILE RESPONSIVE */}
      <style>{`
        @media(min-width:768px){
          :root { --sidebar-offset: ${desktopOffset}px; }
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

          /* ── Comp plan 8x8 grid stays small ── */
          div[style*="repeat(8"] { gap: 2px !important; }
          div[style*="repeat(8"] > div { padding: 2px !important; font-size: 8px !important; }
        }
      `}</style>
    </div>
  );
}
