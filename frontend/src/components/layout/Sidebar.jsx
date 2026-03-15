import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Home, User, Wallet, Headphones, Eye, Zap, LayoutGrid, Link2,
  Globe, GraduationCap, Store, PenLine, Network, FileText, Users,
  Target, Mail, Trophy, Award, Bot, Megaphone, Film,
  LogOut, ChevronRight, Play, Lock
} from 'lucide-react';

var NAV = [
  { type: 'standalone', label: 'Dashboard', icon: Home, path: '/dashboard' },
  { type: 'divider' },

  { type: 'group', label: 'Account', key: 'account', items: [
    { label: 'My Profile', icon: User, path: '/account' },
    { label: 'Wallet', icon: Wallet, path: '/wallet' },
    { label: 'Support', icon: Headphones, path: '/support' },
  ]},
  { type: 'divider' },

  { type: 'group', label: 'Earn', key: 'earn', items: [
    { label: 'Watch to Earn', icon: Eye, path: '/watch' },
    { label: 'Campaign Tiers', icon: Zap, path: '/campaign-tiers' },
    { label: 'Ad Board', icon: LayoutGrid, path: '/ad-board' },
  ]},
  { type: 'divider' },

  { type: 'group', label: 'Creator Tools', key: 'creator', items: [
    { label: 'LinkHub', icon: LayoutGrid, path: '/linkhub' },
    { label: 'Link Tools', icon: Link2, path: '/link-tools' },
    { label: 'SuperPages', icon: Globe, path: '/pro/funnels', pro: true },
  ]},
  { type: 'divider' },

  { type: 'group', label: 'Courses', key: 'courses', items: [
    { label: 'Course Library', icon: GraduationCap, path: '/courses' },
    { label: 'Marketplace', icon: Store, path: '/marketplace' },
    { label: 'Create Course', icon: PenLine, path: '/courses/create', pro: true },
  ]},
  { type: 'divider' },

  { type: 'group', label: 'Affiliate', key: 'affiliate', items: [
    { label: 'My Network', icon: Network, path: '/network' },
    { label: 'Comp Plan', icon: FileText, path: '/compensation-plan' },
    { label: 'Social Share', icon: Users, path: '/affiliate' },
    { label: 'ProSeller AI', icon: Target, path: '/proseller', pro: true },
    { label: 'My Leads', icon: Mail, path: '/pro/leads', pro: true },
    { label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
    { label: 'Achievements', icon: Award, path: '/achievements' },
  ]},
  { type: 'divider' },

  { type: 'group', label: 'Marketing Suite', key: 'marketing', items: [
    { label: 'Campaign Studio', icon: Bot, path: '/campaign-studio' },
    { label: 'Niche Finder', icon: Target, path: '/niche-finder' },
    { label: 'Social Posts', icon: Megaphone, path: '/social-post-generator' },
    { label: 'Video Scripts', icon: Film, path: '/video-script-generator' },
    { label: 'Email Swipes', icon: Mail, path: '/email-swipes' },
  ]},
];

export default function Sidebar() {
  var auth = useAuth();
  var user = auth.user;
  var logout = auth.logout;
  var location = useLocation();
  var [manualOpen, setManualOpen] = useState({});

  // Reset manual open state on navigation — groups auto-close
  useEffect(function() {
    setManualOpen({});
  }, [location.pathname]);

  var isActive = function(path) {
    return location.pathname === path;
  };

  var toggle = function(key) {
    setManualOpen(function(prev) {
      var next = Object.assign({}, prev);
      // If explicitly set, toggle it. If not set yet, close it (since it was auto-opened)
      if (key in next) {
        next[key] = !next[key];
      } else {
        next[key] = false;
      }
      return next;
    });
  };

  return (
    <aside className="w-56 h-screen bg-navy fixed top-0 left-0 z-50 flex flex-col border-r border-white/5 shrink-0">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-2.5 px-5 min-h-[72px] h-[72px] border-b border-white/5 no-underline shrink-0">
        <div className="w-7 h-7 rounded-full bg-cyan flex items-center justify-center shrink-0">
          <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
        </div>
        <span className="font-display text-[17px] font-extrabold text-white leading-tight">
          SuperAd<span className="text-cyan">Pro</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {NAV.map(function(item, i) {
          if (item.type === 'divider') return <div key={i} className="h-px bg-white/5 mx-3 my-1.5" />;

          if (item.type === 'standalone') {
            var Icon = item.icon;
            return (
              <Link key={i} to={item.path}
                className={'flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium no-underline transition-all duration-150 ' +
                  (isActive(item.path) ? 'text-cyan font-bold bg-cyan/8' : 'text-white/40 hover:text-white/70 hover:bg-cyan/5')}>
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          }

          if (item.type === 'group') {
            var hasActiveChild = item.items.some(function(sub) { return isActive(sub.path); });
            var isOpen = (item.key in manualOpen) ? manualOpen[item.key] : (hasActiveChild || false);

            return (
              <div key={i}>
                <button onClick={function() { toggle(item.key); }}
                  className="w-full flex items-center justify-between px-5 py-2.5 text-[11.5px] font-bold text-cyan uppercase tracking-wider cursor-pointer hover:bg-cyan/5 transition-all border-none bg-transparent">
                  <span>{item.label}</span>
                  <ChevronRight className={'w-3.5 h-3.5 text-white/20 transition-transform duration-200 ' + (isOpen ? 'rotate-90' : '')} />
                </button>
                {isOpen && (
                  <div className="pb-1">
                    {item.items.map(function(sub, j) {
                      var SubIcon = sub.icon;
                      var isPro = sub.pro;
                      return (
                        <Link key={j} to={sub.path}
                          className={'flex items-center gap-2.5 pl-6 pr-5 py-2 text-[13px] font-medium no-underline transition-all duration-150 ' +
                            (isActive(sub.path) ? 'text-cyan font-bold bg-cyan/8' :
                             isPro ? 'text-white/25 hover:text-white/40 hover:bg-cyan/5' :
                             'text-white/40 hover:text-white/70 hover:bg-cyan/5')}>
                          <SubIcon className="w-4 h-4 shrink-0" />
                          <span className="flex-1">{sub.label}</span>
                          {isPro && <Lock className="w-3 h-3 text-white/20 shrink-0" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-3 py-3 border-t border-white/5">
        <button onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all cursor-pointer border-none bg-transparent">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
