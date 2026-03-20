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

  var isMobileTabPage = isMobile && MOBILE_TABS.indexOf(location.pathname) !== -1;

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
      {!isMobile && <Sidebar open={sidebarOpen} onClose={closeSidebar} />}
      {isMobile && sidebarOpen && <Sidebar open={true} onClose={closeSidebar} />}

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

      {/* CSS to handle sidebar offset on desktop only */}
      <style>{`
        @media(min-width:768px){
          :root { --sidebar-offset: 224px; }
        }
        @media(max-width:767px){
          :root { --sidebar-offset: 0px; }
        }
      `}</style>
    </div>
  );
}
