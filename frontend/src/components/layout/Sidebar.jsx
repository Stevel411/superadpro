import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import {
  Home, User, Wallet, Headphones, Eye, Zap, LayoutGrid, Link2,
  Globe, GraduationCap, Store, PenLine, Network, FileText, Users,
  Target, Mail, Trophy, Award, Bot, Megaphone, Film,
  LogOut, ChevronRight, Play, Lock, Sparkles, Shield
} from 'lucide-react';

function buildNav(t, isAdmin) {
  var items = [
    { type: 'standalone', label: t('nav.dashboard'), icon: Home, path: '/dashboard' },
    { type: 'divider' },
    { type: 'group', label: t('nav.account'), key: 'account', items: [
      { label: t('nav.myProfile'), icon: User, path: '/account' },
      { label: t('nav.wallet'), icon: Wallet, path: '/wallet' },
      { label: t('nav.support'), icon: Headphones, path: '/support' },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('nav.adHub'), key: 'adhub', items: [
      { label: t('nav.watchToEarn'), icon: Eye, path: '/watch' },
      { label: t('nav.campaignTiers'), icon: Zap, path: '/campaign-tiers' },
      { label: t('nav.adBoard'), icon: LayoutGrid, path: '/ad-board' },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('nav.creatorTools'), key: 'creator', items: [
      { label: t('nav.linkHub'), icon: Link2, path: '/linkhub' },
      { label: t('nav.linkTools'), icon: LayoutGrid, path: '/link-tools' },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('nav.superProducts'), key: 'super', items: [
      { label: t('nav.superPages'), icon: Globe, path: '/pro/funnels', pro: true },
      { label: t('nav.superSeller'), icon: Zap, path: '/superseller', pro: true },
      { label: t('nav.superMarket'), icon: Store, path: '/marketplace' },
      { label: t('nav.proSellerAi'), icon: Target, path: '/proseller', pro: true },
      { label: t('nav.myLeads'), icon: Mail, path: '/pro/leads', pro: true },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('nav.courses'), key: 'courses', items: [
      { label: t('nav.courseLibrary'), icon: GraduationCap, path: '/courses' },
      { label: t('nav.createCourse'), icon: PenLine, path: '/courses/create', pro: true },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('nav.affiliate'), key: 'affiliate', items: [
      { label: t('nav.myNetwork'), icon: Network, path: '/network' },
      { label: t('nav.compPlan'), icon: FileText, path: '/compensation-plan' },
      { label: t('nav.socialShare'), icon: Users, path: '/affiliate' },
      { label: t('nav.leaderboard'), icon: Trophy, path: '/leaderboard' },
      { label: t('nav.achievements'), icon: Award, path: '/achievements' },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('nav.marketingSuite'), key: 'marketing', items: [
      { label: t('nav.campaignStudio'), icon: Bot, path: '/campaign-studio' },
      { label: t('nav.nicheFinder'), icon: Target, path: '/niche-finder' },
      { label: t('nav.socialPosts'), icon: Megaphone, path: '/social-post-generator' },
      { label: t('nav.videoScripts'), icon: Film, path: '/video-script-generator' },
      { label: t('nav.emailSwipes'), icon: Mail, path: '/email-swipes' },
    ]},
  ];

  if (isAdmin) {
    items.push({ type: 'divider' });
    items.push({ type: 'group', label: 'ADMIN', key: 'admin', items: [
      { label: 'Admin Dashboard', icon: Shield, path: '/admin' },
    ]});
  }

  return items;
}

export default function Sidebar() {
  var auth = useAuth();
  var user = auth.user;
  var logout = auth.logout;
  var location = useLocation();
  var { t } = useTranslation();

  var NAV = buildNav(t, user && user.is_admin);
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
      var hasActive = false;
      NAV.forEach(function(item) {
        if (item.key === key && item.items) {
          hasActive = item.items.some(function(sub) { return location.pathname === sub.path; });
        }
      });
      // Determine current visual state
      var currentlyOpen = (key in prev) ? prev[key] : hasActive;
      // Toggle it
      next[key] = !currentlyOpen;
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
                className={'flex items-center gap-2.5 px-5 py-2.5 text-[13.5px] font-medium no-underline transition-all duration-150 ' +
                  (isActive(item.path) ? 'text-cyan font-bold bg-cyan/8' : 'text-white/55 hover:text-white/85 hover:bg-cyan/5')}>
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
                  className="w-full flex items-center justify-between px-5 py-2.5 text-[11px] font-bold text-cyan/70 uppercase tracking-wider cursor-pointer hover:bg-cyan/5 transition-all border-none bg-transparent">
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
                          className={'flex items-center gap-2.5 pl-6 pr-5 py-2 text-[13px] font-semibold no-underline transition-all duration-150 ' +
                            (isActive(sub.path) ? 'text-cyan font-bold bg-cyan/8' :
                             isPro ? 'text-white/30 hover:text-white/45 hover:bg-cyan/5' :
                             'text-white/55 hover:text-white/85 hover:bg-cyan/5')}>
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
          {t('common.signOut')}
        </button>
      </div>
    </aside>
  );
}
