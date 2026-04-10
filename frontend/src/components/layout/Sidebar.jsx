import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import {
  Home, User, Wallet, Headphones, Eye, Zap, LayoutGrid, Link2,
  Globe, GraduationCap, PenLine, Network, FileText, Users,
  Target, Mail, Trophy, Bot, Film, Flame,
  LogOut, ChevronRight, Play, Lock, Sparkles, Shield, X,
  BookOpen, PlusCircle, Scissors, Clock, UserCircle, Tv,
  Wrench, Share2, Megaphone, Heart, Monitor, Map, Layers, DollarSign, BarChart3
} from 'lucide-react';

function buildNav(t, isAdmin) {
  var items = [
    { type: 'standalone', label: t('nav.dashboard'), icon: Home, path: '/dashboard' },
    { type: 'standalone', label: 'Platform Tour', icon: Map, path: '/tour' },
    { type: 'divider' },
    { type: 'group', label: t('nav.account'), key: 'account', icon: UserCircle, items: [
      { label: t('nav.myProfile'), icon: User, path: '/account' },
      { label: t('nav.wallet'), icon: Wallet, path: '/wallet' },
      { label: 'Crypto Guide', icon: Shield, path: '/crypto-guide' },
      { label: t('nav.support'), icon: Headphones, path: '/support' },
    ]},
    { type: 'divider' },
    { type: 'group', label: 'Watch To Earn', key: 'earn', icon: Tv, items: [
      { label: 'Watch', icon: Eye, path: '/watch' },
      { label: 'Campaign Tiers', icon: Layers, path: '/campaign-tiers' },
      { label: 'Create Campaign', icon: PlusCircle, path: '/create-campaign' },
      { label: 'My Campaigns', icon: Film, path: '/video-library' },
      { label: 'Campaign Analytics', icon: BarChart3, path: '/campaign-analytics' },
    ]},
    { type: 'divider' },
    { type: 'group', label: 'Basic Tools', key: 'basic-tools', icon: Wrench, items: [
      { label: t('nav.linkHub'), icon: Link2, path: '/linkhub' },
      { label: t('nav.linkTools'), icon: LayoutGrid, path: '/link-tools' },
      { label: 'Content Creator', icon: Bot, path: '/content-creator' },
      { label: 'Creative Studio', icon: Sparkles, path: '/creative-studio' },
    ]},
    { type: 'divider' },
    { type: 'group', label: 'Pro Tools', key: 'pro-tools', icon: Zap, items: [
      { label: t('nav.superPages'), icon: Globe, path: '/pro/funnels', pro: true },
      { label: 'SuperDeck', icon: Monitor, path: '/superdeck', pro: true },
      { label: 'AutoResponder', icon: Mail, path: '/pro/leads', pro: true },
    ]},
    { type: 'divider' },
    { type: 'group', label: 'Income Streams', key: 'income', icon: DollarSign, items: [
      { label: t('nav.compPlan'), icon: FileText, path: '/compensation-plan' },
      { label: 'Membership Referrals', icon: Users, path: '/affiliate' },
      { label: 'My Grid', icon: Zap, path: '/grid-visualiser' },
      { label: 'Credit Matrix', icon: Layers, path: '/credit-matrix' },
      { label: 'My Matrix', icon: Network, path: '/matrix-visualiser' },
      { label: 'Course Marketplace', icon: GraduationCap, path: '/courses', comingSoon: true },
    ]},
    { type: 'divider' },
    { type: 'group', label: 'Affiliate Hub', key: 'affiliate', icon: Share2, items: [
      { label: t('nav.myNetwork'), icon: Network, path: '/network' },
      { label: t('nav.leaderboard'), icon: Trophy, path: '/leaderboard' },
      { label: '30-Day Challenge', icon: Flame, path: '/challenge' },
      { label: 'Affiliate Guide', icon: BookOpen, path: '/training' },
      { label: 'Pay It Forward', icon: Heart, path: '/pay-it-forward' },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('nav.courses') + ' (Coming Soon)', key: 'courses', icon: GraduationCap, items: [
      { label: t('nav.courseLibrary'), icon: GraduationCap, path: '/courses', comingSoon: true },
      { label: t('nav.createCourse'), icon: PenLine, path: '/courses/create', pro: true, comingSoon: true },
    ]},
  ];

  if (isAdmin) {
    items.push({ type: 'divider' });
    items.push({ type: 'group', label: 'ADMIN', key: 'admin', icon: Shield, items: [
      { label: 'Admin Dashboard', icon: Shield, path: '/admin' },
    ]});
  }

  return items;
}

export default function Sidebar({ open, onClose }) {
  var auth = useAuth();
  var user = auth.user;
  var logout = auth.logout;
  var location = useLocation();
  var { t } = useTranslation();
  var NAV = buildNav(t, user && user.is_admin);
  var [manualOpen, setManualOpen] = useState({});

  // Close sidebar on route change (mobile)
  useEffect(function() {
    setManualOpen({});
    if (onClose) onClose();
  }, [location.pathname]);

  var isActive = function(path) { return location.pathname === path; };

  var toggle = function(key) {
    setManualOpen(function(prev) {
      var next = Object.assign({}, prev);
      var hasActive = false;
      NAV.forEach(function(item) {
        if (item.key === key && item.items) {
          hasActive = item.items.some(function(sub) { return location.pathname === sub.path; });
        }
      });
      var currentlyOpen = (key in prev) ? prev[key] : hasActive;
      next[key] = !currentlyOpen;
      return next;
    });
  };

  return (
    <>
      {/* Sidebar hover styles */}
      <style>{`
        .sb-item:hover { background: rgba(255,255,255,0.06) !important; color: #fff !important; }
        .sb-item:active { background: rgba(255,255,255,0.1) !important; }
        .sb-item.sb-active:hover { background: rgba(56,189,248,0.12) !important; }
        .sb-group-hdr:hover { background: rgba(0,200,255,0.08) !important; color: #38bdf8 !important; }
      `}</style>
      {/* Sidebar panel */}
      <aside style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: 224,
        background: 'linear-gradient(180deg, #172554 0%, #172554 72px, #1e3a8a 100%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(0,212,255,0.08)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        // On mobile: slide in/out. On desktop: always visible.
        transform: undefined,
        willChange: 'transform',
      }}
        className={open ? 'sidebar-open' : 'sidebar-closed'}
      >
        {/* Logo + mobile close button */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:72,padding:'0 20px',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
          <Link to="/dashboard" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:'#0ea5e9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Play style={{width:12,height:12,color:'#fff',fill:'#fff',marginLeft:2}}/>
            </div>
            <span style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,color:'#fff',lineHeight:1}}>
              SuperAd<span style={{color:'#38bdf8'}}>Pro</span>
            </span>
          </Link>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',padding:4,borderRadius:6,display:'none'}}
          >
            <X style={{width:20,height:20}}/>
          </button>
        </div>

        {/* Navigation */}
        <nav style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
          {NAV.map(function(item, i) {
            if (item.type === 'divider') {
              return <div key={i} style={{height:1,background:'rgba(0,200,255,0.07)',margin:'6px 16px'}}/>;
            }

            if (item.type === 'standalone') {
              var Icon = item.icon;
              var active = isActive(item.path);
              return (
                <Link key={i} to={item.path} className={'sb-item' + (active ? ' sb-active' : '')} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 20px', fontSize:13.5, fontWeight: active ? 700 : 600,
                  color: '#fff',
                  textDecoration:'none', transition:'all .15s',
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  borderRadius: 8, margin: '1px 8px',
                }}>
                  <Icon style={{width:16,height:16,flexShrink:0}}/>
                  {item.label}
                </Link>
              );
            }

            if (item.type === 'group') {
              var hasActiveChild = item.items.some(function(sub) { return isActive(sub.path); });
              var isOpen = (item.key in manualOpen) ? manualOpen[item.key] : (hasActiveChild || false);
              return (
                <div key={i}>
                  <button onClick={function() { toggle(item.key); }} className="sb-group-hdr" style={{
                    width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 20px', fontSize:11, fontWeight:700,
                    color:'rgba(255,255,255,0.9)', textTransform:'uppercase', letterSpacing:'0.07em',
                    cursor:'pointer', border:'none', background:'transparent', transition:'all .15s',
                    fontFamily:'inherit', borderRadius: 8, margin: '1px 0',
                  }}>
                    <span>{item.label}</span>
                    <ChevronRight style={{width:14,height:14,color:'rgba(255,255,255,0.2)',transform:isOpen?'rotate(90deg)':'none',transition:'transform .2s'}}/>
                  </button>
                  {isOpen && (
                    <div style={{paddingBottom:4}}>
                      {item.items.map(function(sub, j) {
                        var SubIcon = sub.icon;
                        var isPro = sub.pro && !(user && user.is_admin) && (user?.membership_tier || 'basic') !== 'pro';
                        var subActive = isActive(sub.path);
                        return (
                          <Link key={j} to={sub.path} className={'sb-item' + (subActive ? ' sb-active' : '')} style={{
                            display:'flex', alignItems:'center', gap:10,
                            padding:'9px 16px 9px 24px', fontSize:13, fontWeight: subActive ? 700 : 600,
                            color: subActive ? '#38bdf8' : isPro ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)',
                            textDecoration:'none', transition:'all .15s',
                            background: subActive ? 'rgba(56,189,248,0.08)' : 'transparent',
                            borderRadius: 8, margin: '1px 8px',
                          }}>
                            <SubIcon style={{width:15,height:15,flexShrink:0}}/>
                            <span style={{flex:1}}>{sub.label}</span>
                            {isPro && <Lock style={{width:11,height:11,color:'rgba(255,255,255,0.2)',flexShrink:0}}/>}
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
        <div style={{marginTop:'auto',padding:'12px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
          <button onClick={logout} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10,
            padding:'8px 12px', fontSize:13, fontWeight:500,
            color:'rgba(248,113,113,0.6)', cursor:'pointer',
            border:'none', background:'transparent', borderRadius:8,
            fontFamily:'inherit', transition:'all .15s',
          }}>
            <LogOut style={{width:15,height:15}}/>
            {t('common.signOut')}
          </button>
        </div>
      </aside>

      {/* Responsive CSS */}
      <style>{`
        @media(min-width:768px){
          .sidebar-open, .sidebar-closed { transform: translateX(0) !important; }
          .sidebar-close-btn { display: none !important; }
        }
        @media(max-width:767px){
          .sidebar-open { transform: translateX(0) !important; }
          .sidebar-closed { transform: translateX(-100%) !important; }
          .sidebar-close-btn { display: flex !important; align-items: center; justify-content: center; }
        }
      `}</style>
    </>
  );
}
