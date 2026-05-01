import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Bell, X, Menu } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost } from '../../utils/api';
import LanguageSelector from './LanguageSelector';

export default function Topbar({ title, subtitle, children, onMenuClick }) {
  var { t } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  function loadNotifs() {
    apiGet('/api/notifications')
      .then(data => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadNotifs();
    var interval = setInterval(loadNotifs, 30000);
    return function() { clearInterval(interval); };
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!showNotifs) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifs]);

  const toggleNotifs = async () => {
    if (!showNotifs && unreadCount > 0) {
      await apiPost('/api/notifications/read', {}).catch(() => {});
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
    setShowNotifs(!showNotifs);
  };

  const clearAll = async () => {
    await apiPost('/api/notifications/read', {}).catch(() => {});
    setNotifications([]);
    setUnreadCount(0);
  };

  const dismissOne = async (id) => {
    await apiPost('/api/notifications/read', { ids: [id] }).catch(() => {});
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <header className="flex items-center justify-between px-5 h-[72px] border-b border-white/5 sticky top-0 z-40 shrink-0" style={{background:'linear-gradient(90deg, #172554 0%, #1e3a8a 100%)'}}>
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={(e) => { e.stopPropagation(); onMenuClick(); }}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 transition-all border-none cursor-pointer flex-shrink-0"
          aria-label={t('nav.openMenu')}
        >
          <Menu className="w-5 h-5 text-white/70" />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-[22px] font-extrabold text-white truncate">{title}</h1>
          {subtitle && <p className="text-xs mt-0.5 truncate font-medium" style={{color:'rgba(255,255,255,0.5)'}}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden md:flex items-center gap-3">{children}</span>
        <span className="hidden md:block"><LanguageSelector /></span>
        <span className="md:hidden"><LanguageSelector compact={true} /></span>

        {/* Balance — clickable, links to wallet */}
        {user && <a href="/wallet" style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:10,
          background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)', textDecoration:'none', transition:'all .15s',
          cursor:'pointer' }}
          onMouseEnter={function(e){ e.currentTarget.style.background='rgba(255,255,255,.1)'; }}
          onMouseLeave={function(e){ e.currentTarget.style.background='rgba(255,255,255,.06)'; }}>
          <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.4)' }}>Balance</span>
          <span style={{ fontSize:14, fontWeight:800, color:'#4ade80', fontFamily:"'Sora',sans-serif" }}>${(user.balance || 0).toFixed(2)}</span>
        </a>}

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button onClick={toggleNotifs}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer border-none relative">
            <Bell className="w-4 h-4 text-white/60" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-[340px] bg-white rounded-xl border border-slate-200 overflow-hidden z-50"
              style={{boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-700">{t('nav.notifications')}</span>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button onClick={clearAll}
                      className="text-[10px] font-bold text-slate-400 hover:text-red-500 cursor-pointer border-none bg-transparent transition-colors px-1">
                      Clear all
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)}
                    className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center cursor-pointer border-none bg-transparent transition-all">
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Notification list */}
              <div className="max-h-[380px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <div className="text-2xl opacity-20 mb-2">🔔</div>
                    <div className="text-sm text-slate-400">{t('nav.noNotifications')}</div>
                    <div className="text-xs text-slate-300 mt-1">{t('nav.notificationsDesc')}</div>
                  </div>
                ) : notifications.map((n) => {
                  var catColors = { team: '#3b82f6', earnings: '#22c55e', commission: '#22c55e', milestone: '#f59e0b', system: '#94a3b8', referral: '#3b82f6' };
                  var catBg = { team: '#eff6ff', earnings: '#f0fdf4', commission: '#f0fdf4', milestone: '#fffbeb', system: '#f8fafc', referral: '#eff6ff' };
                  var accent = catColors[n.type] || '#94a3b8';
                  var bg = catBg[n.type] || '#f8fafc';
                  var timeAgo = '';
                  if (n.created_at) {
                    var diff = (Date.now() - new Date(n.created_at).getTime()) / 1000;
                    if (diff < 60) timeAgo = 'Just now';
                    else if (diff < 3600) timeAgo = Math.floor(diff / 60) + 'm ago';
                    else if (diff < 86400) timeAgo = Math.floor(diff / 3600) + 'h ago';
                    else if (diff < 604800) timeAgo = Math.floor(diff / 86400) + 'd ago';
                    else timeAgo = new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  }
                  return (
                  <div key={n.id} onClick={() => { if (n.link) window.location.href = n.link; }}
                    className={'group px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-all relative ' + (!n.is_read ? '' : '')}
                    style={{ cursor: n.link ? 'pointer' : 'default', borderLeft: !n.is_read ? '3px solid ' + accent : '3px solid transparent' }}>
                    <div className="flex items-start gap-2.5 pr-6">
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>{n.icon || '🔔'}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[13px] font-bold text-slate-900 truncate">{
                            // If notification has translation_key, render localised string;
                            // otherwise show the literal title (back-compat with old data).
                            n.translation_key ? t(n.translation_key + '_title', { defaultValue: n.title }) : n.title
                          }</div>
                          <div className="text-[9px] text-slate-300 whitespace-nowrap flex-shrink-0">{timeAgo}</div>
                        </div>
                        <div className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{
                          n.translation_key ? t(n.translation_key + '_message', { defaultValue: n.message }) : n.message
                        }</div>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); dismissOne(n.id); }}
                      className="absolute top-3 right-3 w-5 h-5 rounded-md hover:bg-red-50 flex items-center justify-center cursor-pointer border-none opacity-0 group-hover:opacity-100 transition-all"
                      style={{background:'transparent'}}>
                      <X className="w-3 h-3 text-slate-300" />
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
