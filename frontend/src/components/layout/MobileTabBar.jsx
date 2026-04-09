import { useLocation, useNavigate } from 'react-router-dom';
import { MonitorPlay, TrendingUp, CircleDollarSign, Share2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

var tabs = [
  { key: 'watch', label: 'Watch', icon: MonitorPlay, path: '/watch' },
  { key: 'share', label: 'Share', icon: Share2, path: '__share__' },
  { key: 'earnings', label: 'Earnings', icon: TrendingUp, path: '/dashboard' },
  { key: 'wallet', label: 'Wallet', icon: CircleDollarSign, path: '/wallet' },
];

export default function MobileTabBar() {
  var location = useLocation();
  var navigate = useNavigate();
  var { user } = useAuth();

  var refLink = 'https://www.superadpro.com/ref/' + (user?.username || '');
  var shareText = 'Join me on SuperAdPro and start earning! Watch ads, refer others, and build passive income.\n\n' + refLink;

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: 'Join SuperAdPro',
        text: 'Watch ads, refer others, and build passive income.',
        url: refLink,
      }).catch(function() {});
    } else {
      navigator.clipboard.writeText(refLink).then(function() {
        alert('Referral link copied!\n\n' + refLink);
      }).catch(function() {
        prompt('Copy your referral link:', refLink);
      });
    }
  }

  function isActive(tab) {
    if (tab.key === 'earnings') return location.pathname === '/dashboard' || location.pathname === '/';
    if (tab.key === 'share') return false;
    return location.pathname === tab.path;
  }

  function handleClick(tab) {
    if (tab.key === 'share') {
      handleShare();
    } else {
      navigate(tab.path);
    }
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: '#172554',
      borderTop: '1px solid rgba(0,212,255,0.08)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(function(tab) {
        var active = isActive(tab);
        var Icon = tab.icon;
        var isShareBtn = tab.key === 'share';
        return (
          <button
            key={tab.key}
            onClick={function() { handleClick(tab); }}
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
            {isShareBtn ? (
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg,#10b981,#059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: -16, boxShadow: '0 4px 12px rgba(16,185,129,.4)',
                border: '3px solid #0f172a',
              }}>
                <Icon size={20} color="#fff" strokeWidth={2} />
              </div>
            ) : (
              <Icon
                size={24}
                color={active ? '#0ea5e9' : 'rgba(255,255,255,0.35)'}
                strokeWidth={active ? 2 : 1.5}
              />
            )}
            <span style={{
              fontSize: 10, fontWeight: isShareBtn ? 700 : active ? 700 : 500,
              color: isShareBtn ? '#10b981' : active ? '#0ea5e9' : 'rgba(255,255,255,0.35)',
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
