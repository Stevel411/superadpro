/**
 * ToolsPage.jsx — Tools door landing page (Door 3)
 * ════════════════════════════════════════════════════════════════
 * Reached from the Tools door card on /dashboard. Gateway to the
 * 13 tools spread across three membership tiers:
 *
 *   FREE TOOLS (3)        — open to everyone, no membership needed
 *     Banner Creator, Meme Generator, QR Generator
 *
 *   BASIC MEMBERSHIP (5)  — unlocked at Basic ($20/mo)
 *     Creative Studio, Content Creator, LinkHub, Link Tools, SuperDeck
 *
 *   PRO MEMBERSHIP (5)    — unlocked at Pro ($97/mo)
 *     SuperPages, AutoResponder, Lead Finder, Niche Finder, ProSeller
 *
 * Tier-aware visibility (per member's directive):
 *   - Pro member: sees all three sections fully unlocked
 *   - Basic member: sees Free + Basic unlocked, Pro section becomes a
 *     single upgrade-to-Pro card
 *   - Non-member: sees Free unlocked, Basic + Pro sections each become
 *     upgrade prompts
 *
 * Locked tabs in the strip remain tappable — they scroll-anchor to the
 * upgrade card so members at least see what they would be unlocking.
 *
 * Sidebar collapses on mount via the existing sap-sidebar-set-collapsed
 * event (same pattern as Income page).
 *
 * Data sources: just user object (membership_tier, username, etc.) — no
 * API call needed since this page is structural navigation, not stats.
 *
 * Approved via mockup at /mnt/user-data/outputs/tools-page-mockup.html.
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft, Lock,
  // Free tool icons
  Image, Smile, QrCode,
  // Basic tool icons
  Sparkles, FileText, Link2, LayoutGrid, Monitor,
  // Pro tool icons
  Globe, Mail, Search, Star, GraduationCap,
  // Door icons
  Plus, Wrench, Zap,
} from 'lucide-react';

export default function ToolsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // ──────────────────────────────────────────────────────────────
  // Sidebar collapse on mount, restore on unmount
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let priorCollapsed = false;
    try {
      priorCollapsed = window.localStorage.getItem('sap-sidebar-collapsed') === '1';
    } catch (e) { /* localStorage unavailable */ }
    window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('sap-sidebar-set-collapsed', { detail: priorCollapsed }));
    };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // Tier detection
  // ──────────────────────────────────────────────────────────────
  const tier = (user?.membership_tier || '').toLowerCase();
  const isPro = tier === 'pro';
  const isBasic = tier === 'basic' || isPro; // Pro includes basic
  const isMember = isBasic; // Has any active membership

  const tierLabel = isPro ? 'PRO' : (isBasic ? 'BASIC' : 'FREE');
  const tierClass = isPro ? 'pro' : (isBasic ? 'basic' : 'none');

  const username = user?.username || user?.email || 'Member';
  const initial = username.charAt(0).toUpperCase();

  let activeSinceLabel = '';
  if (user?.created_at) {
    try {
      const d = new Date(user.created_at);
      activeSinceLabel = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    } catch (e) { /* ignore */ }
  }

  // ──────────────────────────────────────────────────────────────
  // Tool definitions
  // ──────────────────────────────────────────────────────────────
  const FREE_TOOLS = [
    { id: 'banner', icon: Image,  name: t('tools.free.banner.name', { defaultValue: 'Banner Creator' }),  desc: t('tools.free.banner.desc', { defaultValue: 'AI-generated banners and profile images for social platforms.' }), to: '/free/banner-creator' },
    { id: 'meme',   icon: Smile,  name: t('tools.free.meme.name', { defaultValue: 'Meme Generator' }),     desc: t('tools.free.meme.desc', { defaultValue: 'Quick template-based memes and viral images.' }),                  to: '/free/meme-generator' },
    { id: 'qr',     icon: QrCode, name: t('tools.free.qr.name', { defaultValue: 'QR Generator' }),         desc: t('tools.free.qr.desc', { defaultValue: 'Custom QR codes for any link. Trackable.' }),                          to: '/free/qr-code-generator' },
  ];

  const BASIC_TOOLS = [
    { id: 'studio',  icon: Sparkles,   name: t('tools.basic.studio.name', { defaultValue: 'Creative Studio' }), desc: t('tools.basic.studio.desc', { defaultValue: 'AI image, video, music, voiceover, lipsync, captions. Your creative powerhouse.' }), to: '/creative-studio' },
    { id: 'content', icon: FileText,   name: t('tools.basic.content.name', { defaultValue: 'Content Creator' }), desc: t('tools.basic.content.desc', { defaultValue: 'AI-written posts, articles, captions, scripts.' }),                                  to: '/content-creator' },
    { id: 'linkhub', icon: Link2,      name: t('tools.basic.linkhub.name', { defaultValue: 'LinkHub' }),        desc: t('tools.basic.linkhub.desc', { defaultValue: 'Linktree-style page hosting all your links in one place.' }),                       to: '/linkhub' },
    { id: 'links',   icon: LayoutGrid, name: t('tools.basic.links.name', { defaultValue: 'Link Tools' }),       desc: t('tools.basic.links.desc', { defaultValue: 'Shorteners, cloakers, pixel-tracking, A/B redirect.' }),                              to: '/link-tools' },
    { id: 'deck',    icon: Monitor,    name: t('tools.basic.deck.name', { defaultValue: 'SuperDeck' }),         desc: t('tools.basic.deck.desc', { defaultValue: 'AI presentation builder with 18 fonts and present mode.' }),                          to: '/superdeck' },
  ];

  const PRO_TOOLS = [
    { id: 'pages',     icon: Globe,          name: t('tools.pro.pages.name', { defaultValue: 'SuperPages' }),    desc: t('tools.pro.pages.desc', { defaultValue: 'Drag-and-drop landing page builder. Hosted, mobile-ready, conversion-focused.' }), to: '/pro/funnels' },
    { id: 'auto',      icon: Mail,           name: t('tools.pro.auto.name', { defaultValue: 'AutoResponder' }),  desc: t('tools.pro.auto.desc', { defaultValue: 'Email sequences, broadcasts, lead nurture. Powered by Brevo.' }),                  to: '/pro/leads' },
    { id: 'leads',     icon: Search,         name: t('tools.pro.leads.name', { defaultValue: 'Lead Finder' }),   desc: t('tools.pro.leads.desc', { defaultValue: 'Outscraper-powered local business and web prospect finder.' }),                  to: '/lead-finder' },
    { id: 'niche',     icon: Star,           name: t('tools.pro.niche.name', { defaultValue: 'Niche Finder' }),  desc: t('tools.pro.niche.desc', { defaultValue: 'Discover under-served niches with AI-powered analysis.' }),                       to: '/niche-finder' },
    { id: 'proseller', icon: GraduationCap,  name: t('tools.pro.seller.name', { defaultValue: 'ProSeller' }),    desc: t('tools.pro.seller.desc', { defaultValue: 'Personal AI sales coach. Strategy, copy, objection handling.' }),                to: '/proseller' },
  ];

  // ──────────────────────────────────────────────────────────────
  // Tab strip config — locked tabs scroll-anchor to upgrade prompts
  // ──────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'overview', label: t('tools.tabs.overview', { defaultValue: 'Overview' }), tone: 'violet', anchor: 'tools-top',     locked: false,      active: true },
    { id: 'free',     label: t('tools.tabs.free',     { defaultValue: 'Free Tools' }), tone: 'green',  anchor: 'tools-free',   locked: false },
    { id: 'basic',    label: t('tools.tabs.basic',    { defaultValue: 'Basic Membership' }), tone: 'cyan', anchor: 'tools-basic', locked: !isBasic },
    { id: 'pro',      label: t('tools.tabs.pro',      { defaultValue: 'Pro Membership' }),   tone: 'amber', anchor: 'tools-pro',   locked: !isPro },
  ];

  function scrollTabs(direction) {
    const el = document.getElementById('tools-tabs-scroll');
    if (el) el.scrollBy({ left: direction === 'left' ? -240 : 240, behavior: 'smooth' });
  }

  function scrollToAnchor(anchor) {
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  return (
    <AppLayout title={t('tools.pageTitle', { defaultValue: 'Tools' })}>
      <div id="tools-top" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>

        {/* ── Identity hero ── */}
        <div style={{
          background: 'var(--sap-cobalt-deep, #172554)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 24,
          color: '#fff',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
          flexWrap: 'wrap',
        }}>
          {/* Violet glow on the right side, matching the Tools accent */}
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%',
            background: 'radial-gradient(circle at 70% 50%, rgba(139,92,246,0.18), transparent 60%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Sora', sans-serif", fontSize: 30, fontWeight: 800, color: '#fff',
              flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.1)',
            }}>{initial}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                {t('tools.heroEyebrow', { defaultValue: 'Your Tools' })}
              </div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.5px', marginBottom: 8, wordBreak: 'break-word' }}>
                {username}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 6, letterSpacing: '0.06em',
                  background: tierClass === 'pro' ? '#f59e0b' : tierClass === 'basic' ? '#0ea5e9' : 'rgba(255,255,255,0.15)',
                  color: tierClass === 'pro' ? '#1f1300' : '#fff',
                }}>
                  {tierLabel}
                </span>
                {activeSinceLabel && (
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', marginRight: 8 }}>·</span>
                    {t('tools.activeSince', { defaultValue: 'Active since' })} {activeSinceLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link to="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 18px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10,
            color: '#fff',
            fontSize: 14, fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.15s',
            position: 'relative', zIndex: 1,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
            <ArrowLeft size={14} strokeWidth={2.5} />
            {t('tools.backToDashboard', { defaultValue: 'Back to Dashboard' })}
          </Link>
        </div>

        {/* ── Scrolling tab strip ── */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            aria-label={t('tools.scrollLeft', { defaultValue: 'Scroll left' })}
            style={{
              position: 'absolute', top: '50%', left: -8, transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%',
              background: '#fff', border: '1px solid var(--sap-border, #e2e8f0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              color: 'var(--sap-text-secondary, #475569)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>

          <div id="tools-tabs-scroll" style={{
            display: 'flex', gap: 10,
            overflowX: 'auto', overflowY: 'hidden',
            scrollBehavior: 'smooth',
            padding: '4px 44px 4px 4px',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
          }}>
            {TABS.map((tab) => {
              const toneStyle = {
                violet: { bg: '#ede9fe', color: '#7c3aed' },
                green:  { bg: '#dcfce7', color: '#16a34a' },
                cyan:   { bg: '#cffafe', color: '#0891b2' },
                amber:  { bg: '#fef3c7', color: '#f59e0b' },
              }[tab.tone] || { bg: '#f1f5f9', color: '#475569' };

              const isLocked = tab.locked;
              const isActiveTab = tab.active;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => scrollToAnchor(tab.anchor)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    flexShrink: 0,
                    padding: '10px 18px 10px 10px',
                    background: '#fff',
                    border: isActiveTab ? '1.5px solid #7c3aed' : '1.5px solid var(--sap-border, #e2e8f0)',
                    borderRadius: 14,
                    fontSize: 15, fontWeight: 700,
                    color: isActiveTab ? '#7c3aed' : (isLocked ? 'var(--sap-text-muted, #64748b)' : 'var(--sap-text-primary, #0f172a)'),
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    boxShadow: isActiveTab ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: isLocked ? '#f1f5f9' : toneStyle.bg,
                    color: isLocked ? '#64748b' : toneStyle.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isLocked ? <Lock size={16} strokeWidth={2.2} /> : <ToolTabIcon tone={tab.tone} />}
                  </span>
                  {tab.label}{isLocked ? ' · ' + t('tools.locked', { defaultValue: 'Locked' }) : ''}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollTabs('right')}
            aria-label={t('tools.scrollRight', { defaultValue: 'Scroll right' })}
            style={{
              position: 'absolute', top: '50%', right: -8, transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%',
              background: '#fff', border: '1px solid var(--sap-border, #e2e8f0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              color: 'var(--sap-text-secondary, #475569)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* ── Three door cards (overview) ── */}
        <div style={{
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 14,
        }}>
          {t('tools.categoriesSection', { defaultValue: 'Your tool categories' })}
        </div>
        <div className="tools-doors-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 8,
        }}>
          <DoorCard
            tone="green"
            icon={Plus}
            eyebrow={t('tools.door.free.eyebrow', { defaultValue: 'Open to everyone' })}
            title={t('tools.door.free.title', { defaultValue: 'Free Tools' })}
            desc={t('tools.door.free.desc', { defaultValue: 'Banner Creator, Meme Generator, QR Generator. Lead-magnet tools you can use any time.' })}
            count={t('tools.door.free.count', { defaultValue: '3 tools' })}
            anchor="tools-free"
            scrollTo={scrollToAnchor}
            locked={false}
          />
          <DoorCard
            tone="cyan"
            icon={Wrench}
            eyebrow={isBasic ? t('tools.door.basic.eyebrowOpen', { defaultValue: 'Basic plan & up' }) : t('tools.door.basic.eyebrowLocked', { defaultValue: 'Upgrade to unlock' })}
            title={t('tools.door.basic.title', { defaultValue: 'Basic Membership Tools' })}
            desc={t('tools.door.basic.desc', { defaultValue: 'Creative Studio, Content Creator, LinkHub, Link Tools, SuperDeck. Everyday building tools.' })}
            count={isBasic ? t('tools.door.basic.count', { defaultValue: '5 tools' }) : t('tools.door.basic.countLocked', { defaultValue: '5 tools · locked' })}
            anchor="tools-basic"
            scrollTo={scrollToAnchor}
            locked={!isBasic}
          />
          <DoorCard
            tone="amber"
            icon={Zap}
            eyebrow={isPro ? t('tools.door.pro.eyebrowOpen', { defaultValue: 'Pro plan unlocked' }) : t('tools.door.pro.eyebrowLocked', { defaultValue: 'Upgrade to unlock' })}
            title={t('tools.door.pro.title', { defaultValue: 'Pro Membership Tools' })}
            desc={t('tools.door.pro.desc', { defaultValue: 'SuperPages, AutoResponder, Lead Finder, Niche Finder, ProSeller. Serious business growth tools.' })}
            count={isPro ? t('tools.door.pro.count', { defaultValue: '5 tools' }) : t('tools.door.pro.countLocked', { defaultValue: '5 tools · locked' })}
            anchor="tools-pro"
            scrollTo={scrollToAnchor}
            locked={!isPro}
          />
        </div>

        {/* ── Free Tools section ── */}
        <div id="tools-free" style={{ scrollMarginTop: 24 }}>
          <div style={{
            fontSize: 13, fontWeight: 800,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--sap-text-muted, #64748b)',
            margin: '32px 0 14px',
          }}>
            {t('tools.section.free', { defaultValue: 'Free Tools · open to everyone' })}
          </div>
          <ToolGrid tools={FREE_TOOLS} tone="green" />
        </div>

        {/* ── Basic Membership Tools section ── */}
        <div id="tools-basic" style={{ scrollMarginTop: 24 }}>
          <div style={{
            fontSize: 13, fontWeight: 800,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--sap-text-muted, #64748b)',
            margin: '32px 0 14px',
          }}>
            {isBasic
              ? t('tools.section.basicUnlocked', { defaultValue: 'Basic Membership Tools · 5 tools unlocked at $20/mo' })
              : t('tools.section.basicLocked', { defaultValue: 'Basic Membership Tools · upgrade to unlock' })
            }
          </div>
          {isBasic
            ? <ToolGrid tools={BASIC_TOOLS} tone="cyan" />
            : <UpgradeCard
                tone="basic"
                icon={Wrench}
                eyebrow={t('tools.upgrade.basic.eyebrow', { defaultValue: 'Unlock 5 building tools' })}
                title={t('tools.upgrade.basic.title', { defaultValue: 'Upgrade to Basic Membership' })}
                desc={t('tools.upgrade.basic.desc', { defaultValue: 'Everything you need to create content for your business: AI image and video, written content, link management, presentations.' })}
                items={BASIC_TOOLS.map(t => t.name)}
                price="$20"
                period={t('tools.upgrade.perMonth', { defaultValue: '/mo' })}
                ctaLabel={t('tools.upgrade.cta', { defaultValue: 'Upgrade now' })}
              />
          }
        </div>

        {/* ── Pro Membership Tools section ── */}
        <div id="tools-pro" style={{ scrollMarginTop: 24 }}>
          <div style={{
            fontSize: 13, fontWeight: 800,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--sap-text-muted, #64748b)',
            margin: '32px 0 14px',
          }}>
            {isPro
              ? t('tools.section.proUnlocked', { defaultValue: 'Pro Membership Tools · 5 tools unlocked at $97/mo' })
              : t('tools.section.proLocked', { defaultValue: 'Pro Membership Tools · upgrade to unlock' })
            }
          </div>
          {isPro
            ? <ToolGrid tools={PRO_TOOLS} tone="amber" />
            : <UpgradeCard
                tone="pro"
                icon={Zap}
                eyebrow={t('tools.upgrade.pro.eyebrow', { defaultValue: 'Unlock 5 more pro tools' })}
                title={t('tools.upgrade.pro.title', { defaultValue: 'Upgrade to Pro Membership' })}
                desc={t('tools.upgrade.pro.desc', { defaultValue: 'Get the serious business-growth toolkit: hosted landing pages, email automation, lead-finding, niche analysis, AI sales coaching.' })}
                items={PRO_TOOLS.map(t => t.name)}
                price="$97"
                period={t('tools.upgrade.perMonth', { defaultValue: '/mo' })}
                ctaLabel={t('tools.upgrade.cta', { defaultValue: 'Upgrade now' })}
              />
          }
        </div>

      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 1100px) {
          .tools-doors-grid { grid-template-columns: 1fr !important; }
        }
        #tools-tabs-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </AppLayout>
  );
}

// ════════════════════════════════════════════════════════════════
// ToolTabIcon — small per-tone icon shown inside the tab strip
// ════════════════════════════════════════════════════════════════
function ToolTabIcon({ tone }) {
  if (tone === 'violet') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>;
  if (tone === 'green')  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>;
  if (tone === 'cyan')   return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>;
  if (tone === 'amber')  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
  return null;
}

// ════════════════════════════════════════════════════════════════
// DoorCard — one of the three big category cards in the overview
// ════════════════════════════════════════════════════════════════
function DoorCard({ tone, icon: Icon, eyebrow, title, desc, count, anchor, scrollTo, locked }) {
  const accent = { green: '#22c55e', cyan: '#0ea5e9', amber: '#f59e0b' }[tone] || '#94a3b8';
  const iconBg = locked ? '#94a3b8' : accent;
  const pillStyle = {
    green: { bg: '#dcfce7', color: '#15803d' },
    cyan:  { bg: '#cffafe', color: '#0e7490' },
    amber: { bg: '#fef3c7', color: '#b45309' },
  }[tone] || { bg: '#f1f5f9', color: '#475569' };

  return (
    <button
      type="button"
      onClick={() => scrollTo(anchor)}
      style={{
        background: '#fff',
        border: '1px solid var(--sap-border, #e2e8f0)',
        borderRadius: 16,
        padding: '28px 24px 24px 32px',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'all 0.18s',
        display: 'flex', flexDirection: 'column',
        minHeight: 240,
        textAlign: 'left',
        fontFamily: 'inherit',
        opacity: locked ? 0.85 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)';
      }}
    >
      {/* Left-edge accent stripe */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, background: accent }} />

      <div style={{ width: 52, height: 52, borderRadius: 14, background: iconBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        {locked ? <Lock size={22} strokeWidth={2} /> : <Icon size={24} strokeWidth={2} />}
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sap-text-faint, #94a3b8)', marginBottom: 6 }}>
        {eyebrow}
      </div>
      <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--sap-text-primary, #0f172a)', lineHeight: 1.2, letterSpacing: '-0.4px', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.5, flex: 1, marginBottom: 14 }}>
        {desc}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--sap-border-light, #f1f5f9)', fontSize: 13 }}>
        <span style={{ fontWeight: 700, color: 'var(--sap-text-faint, #94a3b8)' }}>{count}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '6px 12px',
          borderRadius: 99,
          fontSize: 12, fontWeight: 700,
          background: pillStyle.bg,
          color: pillStyle.color,
        }}>
          {locked ? 'Upgrade' : 'Open'} <span style={{ opacity: 0.65 }}>→</span>
        </span>
      </div>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// ToolGrid — 4-column tool grid for an unlocked section
// ════════════════════════════════════════════════════════════════
function ToolGrid({ tools, tone }) {
  const accent = { green: '#22c55e', cyan: '#0ea5e9', amber: '#f59e0b' }[tone] || '#94a3b8';
  const pillStyle = {
    green: { bg: '#dcfce7', bgHover: '#bbf7d0', color: '#15803d' },
    cyan:  { bg: '#cffafe', bgHover: '#a5f3fc', color: '#0e7490' },
    amber: { bg: '#fef3c7', bgHover: '#fde68a', color: '#b45309' },
  }[tone] || { bg: '#f1f5f9', bgHover: '#e2e8f0', color: '#475569' };

  return (
    <div className="tools-grid" style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
    }}>
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link key={tool.id} to={tool.to} style={{
            background: '#fff',
            border: '1px solid var(--sap-border, #e2e8f0)',
            borderRadius: 14,
            padding: '20px 20px 16px 24px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
            transition: 'all 0.15s',
            display: 'flex', flexDirection: 'column',
            minHeight: 170,
            textDecoration: 'none',
            color: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06), 0 8px 18px rgba(0,0,0,0.06)';
            const pill = e.currentTarget.querySelector('.tool-pill');
            if (pill) pill.style.background = pillStyle.bgHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)';
            const pill = e.currentTarget.querySelector('.tool-pill');
            if (pill) pill.style.background = pillStyle.bg;
          }}>
            {/* Left-edge accent stripe */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, background: accent }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} strokeWidth={2} />
              </div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 800, color: 'var(--sap-text-primary, #0f172a)', lineHeight: 1.2, letterSpacing: '-0.2px' }}>
                {tool.name}
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.4, flex: 1, marginBottom: 12 }}>
              {tool.desc}
            </div>
            <span className="tool-pill" style={{
              alignSelf: 'flex-start',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px',
              borderRadius: 99,
              fontSize: 11, fontWeight: 700,
              background: pillStyle.bg,
              color: pillStyle.color,
              transition: 'background 0.12s',
            }}>
              Open <span style={{ opacity: 0.65 }}>→</span>
            </span>
          </Link>
        );
      })}
      <style>{`
        @media (max-width: 1100px) { .tools-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 600px)  { .tools-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// UpgradeCard — replaces a tool grid for tiers above the member's
// ════════════════════════════════════════════════════════════════
function UpgradeCard({ tone, icon: Icon, eyebrow, title, desc, items, price, period, ctaLabel }) {
  const accent = tone === 'pro' ? '#f59e0b' : '#0ea5e9';
  const accentTint = tone === 'pro' ? '#fef3c7' : '#cffafe';
  const ctaTextColor = tone === 'pro' ? '#1f1300' : '#fff';
  const shadow = tone === 'pro' ? 'rgba(245,158,11,0.3)' : 'rgba(14,165,233,0.3)';

  return (
    <div className="upgrade-card" style={{
      background: `linear-gradient(135deg, #fff 0%, #fff 60%, ${accentTint} 100%)`,
      border: '1px solid var(--sap-border, #e2e8f0)',
      borderRadius: 16,
      padding: '32px 36px 32px 40px',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', gap: 32,
      flexWrap: 'wrap',
    }}>
      {/* Left-edge accent */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 5, background: accent }} />

      <div style={{
        width: 80, height: 80,
        borderRadius: 20,
        background: accent,
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 8px 24px ${shadow}`,
      }}>
        <Icon size={36} strokeWidth={2} />
      </div>

      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent, marginBottom: 6 }}>
          {eyebrow}
        </div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8, color: 'var(--sap-text-primary, #0f172a)' }}>
          {title}
        </div>
        <div style={{ fontSize: 15, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.5, marginBottom: 16 }}>
          {desc}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {items.map((label, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center',
              background: '#fff',
              border: '1px solid var(--sap-border, #e2e8f0)',
              padding: '5px 10px',
              borderRadius: 99,
              fontSize: 12, fontWeight: 600,
              color: 'var(--sap-text-secondary, #475569)',
            }}>{label}</span>
          ))}
        </div>
      </div>

      <div className="upgrade-cta" style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--sap-text-primary, #0f172a)', lineHeight: 1, marginBottom: 4 }}>
          {price}<small style={{ fontSize: 14, color: 'var(--sap-text-muted, #64748b)', fontWeight: 500 }}>{period}</small>
        </div>
        <Link to="/upgrade" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '12px 22px',
          background: accent,
          color: ctaTextColor,
          borderRadius: 12,
          fontSize: 15, fontWeight: 800,
          textDecoration: 'none',
          boxShadow: `0 4px 12px ${shadow}`,
          marginTop: 12,
        }}>
          {ctaLabel} <span style={{ opacity: 0.85 }}>→</span>
        </Link>
      </div>

      <style>{`
        @media (max-width: 800px) {
          .upgrade-card { flex-direction: column; align-items: flex-start; text-align: left; }
          .upgrade-cta { text-align: left !important; }
        }
      `}</style>
    </div>
  );
}
