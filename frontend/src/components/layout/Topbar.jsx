import { useAuth } from '../../hooks/useAuth';
import { Bell, X, Menu } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, apiDelete } from '../../utils/api';
import LanguageSelector from './LanguageSelector';

export default function Topbar({ title, subtitle, children, onMenuClick }) {
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

  useEffect(() => { loadNotifs(); }, []);

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
      await apiPost('/api/notifications/mark-read', {}).catch(() => {});
      setUnreadCount(0);
    }
    setShowNotifs(!showNotifs);
  };

  const clearAll = async () => {
    await apiPost('/api/notifications/clear-all', {}).catch(() => {});
    setNotifications([]);
    setUnreadCount(0);
  };

  const dismissOne = async (id) => {
    await apiDelete('/api/notifications/' + id).catch(() => {});
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <header className="flex items-center justify-between px-5 h-[72px] bg-navy border-b border-cyan/10 sticky top-0 z-40 shadow-topbar shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 transition-all border-none cursor-pointer flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-white/70" />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-[18px] font-extrabold text-white truncate">{title}</h1>
          {subtitle && <p className="text-xs text-cyan/60 mt-0.5 truncate font-medium">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {children}
        <LanguageSelector />

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
                <span className="font-bold text-sm text-slate-700">Notifications</span>
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
                    <div className="text-sm text-slate-400">No notifications</div>
                  </div>
                ) : notifications.map((n) => (
                  <div key={n.id} className={'group px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-all relative ' + (!n.is_read ? 'bg-blue-50/50' : '')}>
                    <div className="flex items-start gap-2.5 pr-6">
                      <span className="text-base shrink-0 mt-0.5">{n.icon || '🔔'}</span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-slate-900">{n.title}</div>
                        <div className="text-[12px] text-slate-600 mt-0.5 leading-relaxed">{n.message}</div>
                        {n.created_at && (
                          <div className="text-[9px] text-slate-300 mt-1">{new Date(n.created_at).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                    {/* Dismiss X — appears on hover */}
                    <button onClick={(e) => { e.stopPropagation(); dismissOne(n.id); }}
                      className="absolute top-3 right-3 w-5 h-5 rounded-md hover:bg-red-50 flex items-center justify-center cursor-pointer border-none opacity-0 group-hover:opacity-100 transition-all"
                      style={{background:'transparent'}}>
                      <X className="w-3 h-3 text-slate-300" style={{}} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="w-9 h-9 rounded-full bg-cyan/20 flex items-center justify-center text-xs font-bold text-cyan overflow-hidden" style={{flexShrink:0}}>
          {user?.avatar_url
            ? <img src={user.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={function(e){e.target.style.display='none';}}/>
            : (user?.first_name || user?.username || '?')[0].toUpperCase()
          }
        </div>
      </div>
    </header>
  );
}
