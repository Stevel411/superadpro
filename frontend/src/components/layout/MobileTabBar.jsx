import { useLocation, useNavigate } from 'react-router-dom';
import { Play, BarChart3, Wallet } from 'lucide-react';

var tabs = [
  { key: 'watch', label: 'Watch', icon: Play, path: '/watch' },
  { key: 'earnings', label: 'Earnings', icon: BarChart3, path: '/dashboard' },
  { key: 'wallet', label: 'Wallet', icon: Wallet, path: '/wallet' },
];

export default function MobileTabBar() {
  var location = useLocation();
  var navigate = useNavigate();

  function isActive(tab) {
    if (tab.key === 'earnings') return location.pathname === '/dashboard' || location.pathname === '/';
    return location.pathname === tab.path;
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: '#0f172a',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(function(tab) {
        var active = isActive(tab);
        var Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={function() { navigate(tab.path); }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '10px 0 8px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              position: 'relative',
              transition: 'all 0.15s',
            }}
          >
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 32, height: 3, borderRadius: '0 0 3px 3px',
                background: '#0ea5e9',
              }} />
            )}
            <Icon
              size={22}
              color={active ? '#0ea5e9' : 'rgba(255,255,255,0.4)'}
              fill={active && tab.key === 'watch' ? '#0ea5e9' : 'none'}
              strokeWidth={active ? 2.5 : 2}
            />
            <span style={{
              fontSize: 10, fontWeight: active ? 800 : 600,
              color: active ? '#0ea5e9' : 'rgba(255,255,255,0.4)',
              letterSpacing: 0.3,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
