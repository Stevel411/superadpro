import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
  Home, User, Wallet, Headphones, Eye, Zap, LayoutGrid, Link2,
  Globe, GraduationCap, PenLine, Network, FileText, Users,
  Target, Mail, Trophy, Bot, Film, Gauge,
  LogOut, ChevronRight, Play, Lock, Sparkles, Shield, X,
  BookOpen, PlusCircle, Scissors, Clock, UserCircle, Tv,
  Wrench, Share2, Megaphone, Heart, Monitor, Map, Layers, DollarSign, BarChart3, MessageCircle, Download, Search, HelpCircle
} from 'lucide-react';

function buildNav(t, isAdmin) {
  // ════════════════════════════════════════════════════════════════
  // FOUR-DOOR NAVIGATION TAXONOMY
  // ════════════════════════════════════════════════════════════════
  // Sidebar reorganised 26 Apr 2026 to align with Dashboard's four
  // door cards: Command Centre / Income / Tools / Learn. Each
  // sidebar group corresponds to one door so members hold ONE
  // mental model, not two.
  //
  // Removed from sidebar (intentional):
  //   - Team Messenger     → lives inside Command Centre
  //   - Pay It Forward     → reachable from Dashboard
  //   - Watch to Earn group → Watch folded into INCOME's grid section
  //   - Affiliate Hub group → items distributed across other groups
  //
  // FAQ + Support sit together at the bottom as the "help cluster".
  // ════════════════════════════════════════════════════════════════
  var items = [
    // ── Top standalones ────────────────────────────────────────
    { type: 'standalone', label: t('nav.dashboard'), shortLabel: t('navShort.dashboard', { defaultValue: 'Home' }), icon: Home, path: '/dashboard' },
    { type: 'standalone', label: t('nav.commandCentre', { defaultValue: 'Command Centre' }), shortLabel: t('navShort.commandCentre', { defaultValue: 'Centre' }), icon: Gauge, path: '/command-centre' },

    { type: 'divider' },

    // ── INCOME ── 4 streams + wallet + grid sub-features ──────
    // Order: Wallet first (most-used), then the four streams in canonical
    // order (Membership/Grid/Nexus/Courses). Grid is the busiest stream
    // so its sub-features (Watch, Create, Videos, Analytics, Calculator,
    // My Grid) sit immediately after the Grid entry as a flat block.
    { type: 'group', label: t('nav.income', { defaultValue: 'INCOME' }), shortLabel: t('navShort.income', { defaultValue: 'Income' }), key: 'income', icon: DollarSign, items: [
      { label: t('nav.wallet'), shortLabel: t('navShort.wallet', { defaultValue: 'Wallet' }), icon: Wallet, path: '/wallet' },
      { label: t('nav.profitGrid'), shortLabel: t('navShort.profitGrid', { defaultValue: 'Grid' }), icon: Target, path: '/campaign-tiers' },
      { label: t('nav.watch'), shortLabel: t('navShort.watch', { defaultValue: 'Watch' }), icon: Eye, path: '/watch' },
      { label: t('nav.createCampaign'), shortLabel: t('navShort.createCampaign', { defaultValue: 'Create' }), icon: PlusCircle, path: '/create-campaign' },
      { label: t('nav.myCampaigns'), shortLabel: t('navShort.myCampaigns', { defaultValue: 'Videos' }), icon: Film, path: '/video-library' },
      { label: t('nav.campaignAnalytics'), shortLabel: t('navShort.campaignAnalytics', { defaultValue: 'Stats' }), icon: BarChart3, path: '/campaign-analytics' },
      { label: t('nav.gridCalculator'), shortLabel: t('navShort.gridCalculator', { defaultValue: 'Calc' }), icon: Zap, path: '/grid-calculator' },
      { label: t('nav.myGrid'), shortLabel: t('navShort.myGrid', { defaultValue: 'My Grid' }), icon: LayoutGrid, path: '/grid-visualiser' },
      { label: t('nav.profitNexus'), shortLabel: t('navShort.profitNexus', { defaultValue: 'Nexus' }), icon: Layers, path: '/credit-nexus' },
      { label: t('nav.myNexus'), shortLabel: t('navShort.myNexus', { defaultValue: 'My Nexus' }), icon: Network, path: '/nexus-visualiser' },
      { label: t('nav.courseAcademy'), shortLabel: t('navShort.courseAcademy', { defaultValue: 'Courses' }), icon: GraduationCap, path: '/courses', comingSoon: true },
      { label: t('nav.incomeChains'), shortLabel: t('navShort.incomeChains', { defaultValue: 'Chains' }), icon: Link2, path: '/income-chains' },
    ]},

    { type: 'divider' },

    // ── TOOLS ── Basic creators first, then PRO items ─────────
    // Pro items are flagged with `pro: true` which renders them locked
    // for free members (existing pattern). Quick Tools (banner/meme/QR)
    // are lightweight one-off creators kept inline rather than nested.
    { type: 'group', label: t('nav.tools', { defaultValue: 'TOOLS' }), shortLabel: t('navShort.tools', { defaultValue: 'Tools' }), key: 'tools', icon: Wrench, items: [
      { label: t('nav.creativeStudio'), shortLabel: t('navShort.creativeStudio', { defaultValue: 'Studio' }), icon: Sparkles, path: '/creative-studio' },
      { label: t('nav.contentCreator'), shortLabel: t('navShort.contentCreator', { defaultValue: 'Content' }), icon: Bot, path: '/content-creator' },
      { label: t('nav.linkHub'), shortLabel: t('navShort.linkHub', { defaultValue: 'Links' }), icon: Link2, path: '/linkhub' },
      { label: t('nav.linkTools'), shortLabel: t('navShort.linkTools', { defaultValue: 'Tools' }), icon: LayoutGrid, path: '/link-tools' },
      { label: t('nav.superDeck'), shortLabel: t('navShort.superDeck', { defaultValue: 'Deck' }), icon: Monitor, path: '/superdeck' },
      { label: t('nav.bannerCreator', { defaultValue: 'Banner Creator' }), shortLabel: t('navShort.bannerCreator', { defaultValue: 'Banner' }), icon: PenLine, path: '/free/banner-creator' },
      { label: t('nav.memeGenerator', { defaultValue: 'Meme Generator' }), shortLabel: t('navShort.memeGenerator', { defaultValue: 'Meme' }), icon: Sparkles, path: '/free/meme-generator' },
      { label: t('nav.qrGenerator', { defaultValue: 'QR Generator' }), shortLabel: t('navShort.qrGenerator', { defaultValue: 'QR' }), icon: Globe, path: '/free/qr-code-generator' },
      { label: t('nav.superPages'), shortLabel: t('navShort.superPages', { defaultValue: 'Pages' }), icon: Globe, path: '/pro/funnels', pro: true },
      { label: t('nav.autoResponder'), shortLabel: t('navShort.autoResponder', { defaultValue: 'Email' }), icon: Mail, path: '/pro/leads', pro: true },
      { label: t('nav.leadFinder', { defaultValue: 'Lead Finder' }), shortLabel: t('navShort.leadFinder', { defaultValue: 'Leads' }), icon: Search, path: '/lead-finder', pro: true },
      { label: t('nav.nicheFinder', { defaultValue: 'Niche Finder' }), shortLabel: t('navShort.nicheFinder', { defaultValue: 'Niche' }), icon: Search, path: '/niche-finder', pro: true },
      { label: t('nav.proSeller', { defaultValue: 'ProSeller' }), shortLabel: t('navShort.proSeller', { defaultValue: 'Seller' }), icon: Megaphone, path: '/proseller', pro: true },
    ]},

    { type: 'divider' },

    // ── LEARN ── Education + promotional asset library ────────
    // Marketing materials live here (per founder direction) because
    // they're paired with how-to-promote education, not deployed alone.
    { type: 'group', label: t('nav.learn', { defaultValue: 'LEARN' }), shortLabel: t('navShort.learn', { defaultValue: 'Learn' }), key: 'learn', icon: GraduationCap, items: [
      { label: t('nav.training', { defaultValue: 'Training' }), shortLabel: t('navShort.training', { defaultValue: 'Training' }), icon: BookOpen, path: '/training' },
      { label: t('nav.compPlan'), shortLabel: t('navShort.compPlan', { defaultValue: 'Plan' }), icon: FileText, path: '/compensation-plan' },
      { label: t('nav.platformTour'), shortLabel: t('navShort.platformTour', { defaultValue: 'Tour' }), icon: Map, path: '/tour' },
      { label: t('nav.marketingMaterials'), shortLabel: t('navShort.marketingMaterials', { defaultValue: 'Media' }), icon: Download, path: '/marketing-materials' },
      { label: t('nav.emailSwipes', { defaultValue: 'Email Swipes' }), shortLabel: t('navShort.emailSwipes', { defaultValue: 'Swipes' }), icon: Mail, path: '/email-swipes' },
      { label: t('nav.socialShare'), shortLabel: t('navShort.socialShare', { defaultValue: 'Share' }), icon: Share2, path: '/social-share' },
      { label: t('nav.cryptoGuide'), shortLabel: t('navShort.cryptoGuide', { defaultValue: 'Crypto' }), icon: Shield, path: '/crypto-guide' },
      { label: t('nav.shareStory', { defaultValue: 'Share Your Story' }), shortLabel: t('navShort.shareStory', { defaultValue: 'My Story' }), icon: Sparkles, path: '/share-story' },
      { label: t('nav.leaderboard'), shortLabel: t('navShort.leaderboard', { defaultValue: 'Ranks' }), icon: Trophy, path: '/leaderboard' },
    ]},

    { type: 'divider' },

    // ── ACCOUNT ── Member's own profile (intentionally small) ─
    // Wallet moved to Income, Crypto Guide moved to Learn,
    // Support promoted to standalone in the help cluster.
    // Only Profile remains here.
    { type: 'group', label: t('nav.account'), shortLabel: t('navShort.account', { defaultValue: 'Acct' }), key: 'account', icon: UserCircle, items: [
      { label: t('nav.myProfile'), shortLabel: t('navShort.myProfile', { defaultValue: 'Profile' }), icon: User, path: '/account' },
    ]},

    { type: 'divider' },

    // ── Help cluster at the bottom ─────────────────────────────
    // FAQ + Support paired together because "I need help" is a single
    // intent for members. Standalones rather than a group so they're
    // always one click from anywhere.
    { type: 'standalone', label: t('nav.faq'), shortLabel: t('navShort.faq', { defaultValue: 'FAQ' }), icon: HelpCircle, path: '/account/faq' },
    { type: 'standalone', label: t('nav.support'), shortLabel: t('navShort.support', { defaultValue: 'Help' }), icon: Headphones, path: '/support' },
  ];

  if (isAdmin) {
    items.push({ type: 'divider' });
    items.push({ type: 'group', label: t('nav.admin'), shortLabel: t('navShort.admin', { defaultValue: 'Admin' }), key: 'admin', icon: Shield, items: [
      { label: t('nav.adminDashboard'), shortLabel: t('navShort.adminDashboard', { defaultValue: 'Admin' }), icon: Shield, path: '/admin' },
      { label: t('nav.adminStories', { defaultValue: 'Story Moderation' }), shortLabel: t('navShort.adminStories', { defaultValue: 'Stories' }), icon: Sparkles, path: '/admin/stories' },
      { label: t('nav.adminShowcase', { defaultValue: 'Showcase Moderation' }), shortLabel: t('navShort.adminShowcase', { defaultValue: 'Showcase' }), icon: LayoutGrid, path: '/admin/showcase' },
    ]});
  }

  return items;
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapsed, firstView }) {
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
      {/* Sidebar styles — including collapsed-mode specific styles + toggle button pulse */}
      <style>{`
        .sb-item:hover { background: rgba(255,255,255,0.06) !important; color: #fff !important; }
        .sb-item:active { background: rgba(255,255,255,0.1) !important; }
        .sb-item.sb-active:hover { background: rgba(56,189,248,0.12) !important; }
        .sb-group-hdr:hover { background: rgba(0,200,255,0.08) !important; color: #38bdf8 !important; }
        .sidebar-nav::-webkit-scrollbar { width: 0; height: 0; display: none; }

        /* Toggle button — the thing that collapses/expands the sidebar */
        .sb-toggle-btn {
          position: absolute;
          top: 62px;
          right: -16px;
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #0ea5e9, #38bdf8);
          border: 2px solid #172554;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          z-index: 60;
          color: #fff;
          box-shadow: 0 3px 12px rgba(14,165,233,0.45), 0 0 0 3px rgba(14,165,233,0.1);
          transition: all .18s;
          padding: 0;
        }
        .sb-toggle-btn:hover {
          background: linear-gradient(135deg, #38bdf8, #0ea5e9);
          transform: scale(1.08);
          box-shadow: 0 4px 16px rgba(14,165,233,0.6), 0 0 0 6px rgba(14,165,233,0.15);
        }
        .sb-toggle-btn svg { width: 14px; height: 14px; transition: transform .22s cubic-bezier(0.4,0,0.2,1); }
        .sb-toggle-btn.is-collapsed svg { transform: rotate(180deg); }

        /* First-view pulse animation — draws the eye to the toggle button on the user's first visit */
        .sb-toggle-btn.pulse::before {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          background: #38bdf8;
          opacity: 0.4;
          animation: sbTogglePulse 1.4s ease-out infinite;
          z-index: -1;
          pointer-events: none;
        }
        @keyframes sbTogglePulse {
          0% { transform: scale(1); opacity: 0.4; }
          80% { transform: scale(1.7); opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }

        /* Hint label for first-view */
        .sb-toggle-hint {
          position: absolute;
          top: 67px;
          left: calc(100% + 20px);
          background: #172554;
          color: #fff;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12px; font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(56,189,248,0.3);
          pointer-events: none;
          z-index: 59;
          animation: sbHintFade 3s ease-out forwards;
        }
        .sb-toggle-hint::before {
          content: '';
          position: absolute;
          left: -6px; top: 50%;
          transform: translateY(-50%);
          border: 6px solid transparent;
          border-right-color: #172554;
        }
        @keyframes sbHintFade {
          0% { opacity: 0; transform: translateX(-6px); }
          12% { opacity: 1; transform: translateX(0); }
          80% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-6px); }
        }

        /* Tooltip for collapsed items — shown on hover */
        .sb-item-collapsed {
          position: relative;
        }
        .sb-item-collapsed:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          left: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%);
          background: #172554;
          color: #fff;
          padding: 6px 11px;
          border-radius: 6px;
          font-size: 12px; font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 70;
          pointer-events: none;
        }
        .sb-item-collapsed:hover::before {
          content: '';
          position: absolute;
          left: calc(100% + 6px);
          top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent;
          border-right-color: #172554;
          z-index: 70;
          pointer-events: none;
        }
      `}</style>
      {/* Sidebar panel */}
      <aside style={{
        position: 'fixed',
        top: 0, left: 0,
        // Use 100dvh (dynamic viewport height) instead of bottom:0 so the sidebar
        // doesn't flicker on mobile portrait when browser chrome (address bar /
        // PWA install banner) is visible. dvh updates smoothly as chrome
        // shows/hides; bottom:0 caused a one-frame repaint mid-mount-animation.
        height: '100dvh',
        width: collapsed ? 72 : 224,
        background: 'linear-gradient(180deg, #172554 0%, #172554 72px, #1e3a8a 100%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(0,212,255,0.08)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1), width 0.22s cubic-bezier(0.4,0,0.2,1)',
        transform: undefined,
        willChange: 'transform, width',
      }}
        className={open ? 'sidebar-open' : 'sidebar-closed'}
      >
        {/* Toggle button — desktop only, hidden on mobile. Floats on sidebar's right edge. */}
        {onToggleCollapsed && (
          <>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className={'sb-toggle-btn' + (collapsed ? ' is-collapsed' : '') + (firstView ? ' pulse' : '')}
              title={collapsed ? t('sidebar.expand', { defaultValue: 'Expand sidebar' }) : t('sidebar.collapse', { defaultValue: 'Collapse sidebar' })}
              aria-label={collapsed ? t('sidebar.expand', { defaultValue: 'Expand sidebar' }) : t('sidebar.collapse', { defaultValue: 'Collapse sidebar' })}
            >
              <ChevronRight style={{ transform: collapsed ? 'none' : 'rotate(180deg)' }}/>
            </button>
            {firstView && (
              <div className="sb-toggle-hint">
                ← {t('sidebar.hintCollapse', { defaultValue: 'Click to collapse' })}
              </div>
            )}
          </>
        )}

        {/* Logo + mobile close button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 72, padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
        }}>
          <Link to="/dashboard" style={{textDecoration:'none',display:'flex',alignItems:'center',gap: collapsed ? 0 : 10}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:'#0ea5e9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Play style={{width:12,height:12,color:'#fff',fill:'#fff',marginLeft:2}}/>
            </div>
            {!collapsed && (
              <span style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,color:'#fff',lineHeight:1}}>
                SuperAd<span style={{color:'#38bdf8'}}>{t('common.pro')}</span>
              </span>
            )}
          </Link>
          {/* Close button — mobile only */}
          {!collapsed && (
            <button
              onClick={onClose}
              className="sidebar-close-btn"
              style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',padding:4,borderRadius:6,display:'none'}}
            >
              <X style={{width:20,height:20}}/>
            </button>
          )}
        </div>

        {/* Navigation — renders one of two layouts based on collapsed state */}
        <nav className="sidebar-nav" style={{flex:1,overflowY:'auto',padding:'8px 0',scrollbarWidth:'none',msOverflowStyle:'none'}}>
          {NAV.map(function(item, i) {
            if (item.type === 'divider') {
              return <div key={i} style={{
                height:1,
                background:'rgba(0,200,255,0.07)',
                margin: collapsed ? '6px 10px' : '6px 16px',
              }}/>;
            }

            if (item.type === 'standalone') {
              var Icon = item.icon;
              var active = isActive(item.path);
              var tooltipLabel = item.label;
              if (collapsed) {
                return (
                  <Link key={i} to={item.path}
                    data-tooltip={tooltipLabel}
                    className={'sb-item sb-item-collapsed' + (active ? ' sb-active' : '')}
                    style={{
                      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      padding:'9px 2px', fontSize: 9, fontWeight: active ? 700 : 600,
                      color: active ? '#38bdf8' : 'rgba(255,255,255,0.85)',
                      textDecoration:'none', transition:'all .15s',
                      background: active ? 'rgba(56,189,248,0.12)' : 'transparent',
                      borderRadius: 10, margin: '1px 6px', textAlign: 'center',
                      letterSpacing: 0.1,
                    }}
                  >
                    <Icon style={{width:18,height:18,flexShrink:0}}/>
                    <span style={{lineHeight:1.1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>
                      {item.shortLabel || item.label}
                    </span>
                  </Link>
                );
              }
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

              // In collapsed mode, groups flatten — we show each sub-item as its own icon tile,
              // preceded by a small coloured divider to hint at the group boundary.
              // This is the "Discord-style" vertical nav pattern.
              if (collapsed) {
                return (
                  <div key={i}>
                    {/* Subtle group divider — just a small dot + shortLabel as header */}
                    <div style={{
                      padding: '8px 2px 4px', textAlign: 'center',
                      fontSize: 8, fontWeight: 800, letterSpacing: 0.8,
                      color: 'rgba(56,189,248,0.6)', textTransform: 'uppercase',
                    }}>
                      {item.shortLabel || item.label}
                    </div>
                    {item.items.map(function(sub, j) {
                      var SubIcon = sub.icon;
                      var isPro = sub.pro && !(user && user.is_admin) && (user?.membership_tier || 'basic') !== 'pro';
                      var subActive = isActive(sub.path);
                      return (
                        <Link key={j} to={sub.path}
                          data-tooltip={sub.label + (isPro ? ' 🔒' : '')}
                          className={'sb-item sb-item-collapsed' + (subActive ? ' sb-active' : '')}
                          style={{
                            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                            padding:'9px 2px', fontSize:9, fontWeight: subActive ? 700 : 600,
                            color: subActive ? '#38bdf8' : (isPro ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)'),
                            textDecoration:'none', transition:'all .15s',
                            background: subActive ? 'rgba(56,189,248,0.12)' : 'transparent',
                            borderRadius: 10, margin: '1px 6px', textAlign:'center',
                            letterSpacing: 0.1, position: 'relative',
                          }}
                        >
                          <SubIcon style={{width:18,height:18,flexShrink:0}}/>
                          <span style={{lineHeight:1.1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>
                            {sub.shortLabel || sub.label}
                          </span>
                          {isPro && <Lock style={{width:8,height:8,color:'rgba(255,255,255,0.35)',position:'absolute',top:4,right:4}}/>}
                        </Link>
                      );
                    })}
                  </div>
                );
              }

              // Expanded (default) group layout — group headers render at the same
              // visual weight as Dashboard and Command Centre standalones above.
              // The four doors (INCOME/TOOLS/LEARN/ACCOUNT) are gateways to the
              // business and deserve equal prominence in the nav. Drop-down chevron
              // on the right preserves the expand-to-see-children affordance for
              // power users — clicking the row toggles the group, the chevron
              // signals that's what's about to happen.
              var GroupIcon = item.icon;
              return (
                <div key={i}>
                  <button onClick={function() { toggle(item.key); }} className={'sb-group-hdr' + (hasActiveChild ? ' sb-active' : '')} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 20px', fontSize:13.5, fontWeight: hasActiveChild ? 700 : 600,
                    color:'#fff',
                    cursor:'pointer', border:'none',
                    background: hasActiveChild ? 'rgba(255,255,255,0.08)' : 'transparent',
                    transition:'all .15s',
                    fontFamily:'inherit', borderRadius: 8, margin: '1px 8px',
                    width: 'calc(100% - 16px)',
                  }}>
                    <span style={{display:'flex',alignItems:'center',gap:10}}>
                      {GroupIcon && <GroupIcon style={{width:16,height:16,flexShrink:0}}/>}
                      <span>{item.label}</span>
                    </span>
                    <ChevronRight style={{width:14,height:14,color:'rgba(255,255,255,0.4)',transform:isOpen?'rotate(90deg)':'none',transition:'transform .2s'}}/>
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

        {/* Footer — active status + sign out. Footer hidden in collapsed mode to save space */}
        {!collapsed && (
          <div style={{marginTop:'auto',padding:'12px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
            {user && <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'8px 12px', marginBottom:4,
            }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background: user.is_active ? '#4ade80' : '#f59e0b', flexShrink:0 }}/>
              <span style={{ fontSize:13, fontWeight:500, color: user.is_active ? 'rgba(74,222,128,0.6)' : 'rgba(245,158,11,0.6)' }}>
                {user.is_active ? t('dashboard.activeMember') : t('dashboard.inactive')}
              </span>
            </div>}
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
        )}
        {/* Compact footer for collapsed mode — just a sign-out icon */}
        {collapsed && (
          <div style={{marginTop:'auto',padding:'10px 0',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',justifyContent:'center'}}>
            <button onClick={logout}
              data-tooltip={t('common.signOut')}
              className="sb-item-collapsed"
              style={{
                width: 40, height: 40, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: 'rgba(248,113,113,0.6)', transition: 'all .15s',
              }}
              onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
              title={t('common.signOut')}
            >
              <LogOut style={{width:16,height:16}}/>
            </button>
          </div>
        )}
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
          /* Hide toggle button on mobile — mobile uses hamburger instead */
          .sb-toggle-btn, .sb-toggle-hint { display: none !important; }
        }
      `}</style>
    </>
  );
}
