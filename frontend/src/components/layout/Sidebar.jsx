import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import {
  Home, User, Wallet, Headphones, Eye, Zap, LayoutGrid, Link2,
  Globe, GraduationCap, Store, PenLine, Network, FileText, Users,
  Target, Mail, Trophy, Award, Bot, Megaphone, Film, Paintbrush,
  LogOut, ChevronRight, Play, Lock, Sparkles, Shield, X,
  QrCode, MessageCircle, Flame, BookOpen
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
      { label: 'Ad Hub', icon: LayoutGrid, path: '/ad-hub' },
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
      { label: 'Team Messenger', icon: MessageCircle, path: '/team-messenger' },
      { label: t('nav.leaderboard'), icon: Trophy, path: '/leaderboard' },
      { label: t('nav.achievements'), icon: Award, path: '/achievements' },
      { label: 'Challenges', icon: Flame, path: '/challenges' },
    ]},
    { type: 'divider' },
    { type: 'group', label: t('nav.marketingSuite'), key: 'marketing', items: [
      { label: t('nav.campaignStudio'), icon: Bot, path: '/campaign-studio' },
      { label: t('nav.nicheFinder'), icon: Target, path: '/niche-finder' },
      { label: t('nav.socialPosts'), icon: Megaphone, path: '/social-post-generator' },
      { label: t('nav.videoScripts'), icon: Film, path: '/video-script-generator' },
      { label: t('nav.emailSwipes'), icon: Mail, path: '/email-swipes' },
      { label: 'QR Generator', icon: QrCode, path: '/qr-generator' },
    ]},
    { type: 'divider' },
    { type: 'group', label: 'LEARN', key: 'learn', items: [
      { label: 'Training Centre', icon: BookOpen, path: '/training' },
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
      {/* Sidebar panel */}
      <aside style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: 224,
        background: '#0f172a',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.05)',
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
              return <div key={i} style={{height:1,background:'rgba(255,255,255,0.05)',margin:'6px 12px'}}/>;
            }

            if (item.type === 'standalone') {
              var Icon = item.icon;
              var active = isActive(item.path);
              return (
                <Link key={i} to={item.path} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 20px', fontSize:13.5, fontWeight: active ? 700 : 500,
                  color: active ? '#38bdf8' : 'rgba(255,255,255,0.55)',
                  textDecoration:'none', transition:'all .15s',
                  background: active ? 'rgba(56,189,248,0.08)' : 'transparent',
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
                  <button onClick={function() { toggle(item.key); }} style={{
                    width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 20px', fontSize:11, fontWeight:700,
                    color:'rgba(56,189,248,0.7)', textTransform:'uppercase', letterSpacing:'0.07em',
                    cursor:'pointer', border:'none', background:'transparent', transition:'all .15s',
                    fontFamily:'inherit',
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
                          <Link key={j} to={sub.path} style={{
                            display:'flex', alignItems:'center', gap:10,
                            padding:'9px 20px 9px 24px', fontSize:13, fontWeight: subActive ? 700 : 600,
                            color: subActive ? '#38bdf8' : isPro ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)',
                            textDecoration:'none', transition:'all .15s',
                            background: subActive ? 'rgba(56,189,248,0.08)' : 'transparent',
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
