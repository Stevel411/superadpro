import { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout({ title, subtitle, topbarActions, children, bgStyle }) {
  var [sidebarOpen, setSidebarOpen] = useState(false);
  var closeSidebar = useCallback(function() { setSidebarOpen(false); }, []);
  var openSidebar = useCallback(function() { setSidebarOpen(true); }, []);

  return (
    <div className="flex min-h-screen">

      {/* Mobile overlay — tap to close sidebar */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:40,backdropFilter:'blur(2px)'}}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      {/* Main content — full width on mobile, offset on desktop */}
      <div className="flex-1 flex flex-col min-w-0" style={{marginLeft:'var(--sidebar-offset,0)'}}>
        <Topbar title={title} subtitle={subtitle} onMenuClick={openSidebar}>
          {topbarActions}
        </Topbar>
        <main className="flex-1 overflow-y-auto" style={Object.assign({background:'#f0f3f9', padding:'24px'}, bgStyle || {})}>
          {children}
        </main>
      </div>

      {/* CSS to handle sidebar offset on desktop only */}
      <style>{`
        @media(min-width:768px){
          :root { --sidebar-offset: 224px; }
        }
        @media(max-width:767px){
          :root { --sidebar-offset: 0px; }
          main { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
