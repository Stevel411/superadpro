import { useLocation, useNavigate } from 'react-router-dom';
import { MonitorPlay, TrendingUp, CircleDollarSign } from 'lucide-react';

var tabs = [
  { key: 'watch', label: 'Watch', icon: MonitorPlay, path: '/watch' },
  { key: 'earnings', label: 'Earnings', icon: TrendingUp, path: '/dashboard' },
  { key: 'wallet', label: 'Wallet', icon: CircleDollarSign, path: '/wallet' },
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
      borderTop: '1px solid rgba(255,255,255,0.1)',
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
              gap: 4, padding: '12px 0 10px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              position: 'relative',
            }}
          >
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 40, height: 3, borderRadius: '0 0 4px 4px',
                background: '#0ea5e9',
              }} />
            )}
            <Icon
              size={24}
              color={active ? '#0ea5e9' : 'rgba(255,255,255,0.35)'}
              strokeWidth={active ? 2 : 1.5}
            />
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? '#0ea5e9' : 'rgba(255,255,255,0.35)',
              letterSpacing: 0.5,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
