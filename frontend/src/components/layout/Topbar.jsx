import { useAuth } from '../../hooks/useAuth';
import { Bell, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../utils/api';

export default function Topbar({ title, subtitle, children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    apiGet('/api/notifications')
      .then(data => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      })
      .catch(() => {});
  }, []);

  const markRead = async () => {
    if (unreadCount > 0) {
      await apiPost('/api/notifications/mark-read', {}).catch(() => {});
      setUnreadCount(0);
    }
    setShowNotifs(!showNotifs);
  };

  return (
    <header className="flex items-center justify-between px-7 h-[72px] bg-navy border-b border-cyan/10 sticky top-0 z-40 shadow-topbar shrink-0">
      <div className="min-w-0">
        <h1 className="font-display text-[17px] font-extrabold text-white truncate">{title}</h1>
        {subtitle && <p className="text-xs text-cyan/40 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {/* Notification Bell */}
        <div className="relative">
          <button onClick={markRead}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer border-none relative">
            <Bell className="w-4 h-4 text-white/50" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-700">Notifications</div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications</div>
                ) : notifications.map((n, i) => (
                  <div key={i} className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-all ${!n.is_read ? 'bg-cyan/5' : ''}`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 mt-0.5">{n.icon || '🔔'}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{n.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-cyan/20 flex items-center justify-center text-xs font-bold text-cyan">
          {(user?.first_name || user?.username || '?')[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
