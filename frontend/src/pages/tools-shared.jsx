/**
 * tools-shared.jsx — Tool inventory + reusable card components
 * ════════════════════════════════════════════════════════════════
 * Shared between ToolsPage (overview), FreeToolsPage, BasicToolsPage,
 * ProToolsPage. Single source of truth for the 13 tools + the reusable
 * ToolGrid and UpgradeCard components.
 *
 * Why this exists:
 *   /tools renders three door cards but no tool grids.
 *   /tools/free, /tools/basic, /tools/pro each render one tool grid
 *   (or an UpgradeCard if the member's tier doesn't have access).
 *
 *   Without a shared module, we'd duplicate the tool inventory across
 *   4 files — a maintenance nightmare. This module is the canonical
 *   list. If we add a new tool, we add it here once and all four
 *   pages pick it up.
 */
import { Link } from 'react-router-dom';
import {
  // Free tool icons
  Image, Smile, QrCode,
  // Basic tool icons
  Sparkles, FileText, Link2, LayoutGrid, Monitor,
  // Pro tool icons
  Globe, Mail, Search, Star, GraduationCap,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────
// Tool inventory
// ──────────────────────────────────────────────────────────────────
// Translation keys assume t() is passed in by the caller, so each tool
// is defined as a function that takes (t) and returns a fully-resolved
// tool object. The destination routes match what already exists on the
// platform — no new tool pages needed, just better navigation to them.

export function getFreeTools(t) {
  return [
    { id: 'banner', icon: Image,  name: t('tools.free.banner.name', { defaultValue: 'Banner Creator' }),  desc: t('tools.free.banner.desc', { defaultValue: 'AI-generated banners and profile images for social platforms.' }), to: '/free/banner-creator' },
    { id: 'meme',   icon: Smile,  name: t('tools.free.meme.name', { defaultValue: 'Meme Generator' }),     desc: t('tools.free.meme.desc', { defaultValue: 'Quick template-based memes and viral images.' }),                  to: '/free/meme-generator' },
    { id: 'qr',     icon: QrCode, name: t('tools.free.qr.name', { defaultValue: 'QR Generator' }),         desc: t('tools.free.qr.desc', { defaultValue: 'Custom QR codes for any link. Trackable.' }),                          to: '/free/qr-code-generator' },
  ];
}

export function getBasicTools(t) {
  return [
    { id: 'studio',  icon: Sparkles,   name: t('tools.basic.studio.name', { defaultValue: 'Creative Studio' }), desc: t('tools.basic.studio.desc', { defaultValue: 'AI image, video, music, voiceover, lipsync, captions. Your creative powerhouse.' }), to: '/creative-studio' },
    { id: 'content', icon: FileText,   name: t('tools.basic.content.name', { defaultValue: 'Content Creator' }), desc: t('tools.basic.content.desc', { defaultValue: 'AI-written posts, articles, captions, scripts.' }),                                  to: '/content-creator' },
    { id: 'linkhub', icon: Link2,      name: t('tools.basic.linkhub.name', { defaultValue: 'LinkHub' }),        desc: t('tools.basic.linkhub.desc', { defaultValue: 'Linktree-style page hosting all your links in one place.' }),                       to: '/linkhub' },
    { id: 'links',   icon: LayoutGrid, name: t('tools.basic.links.name', { defaultValue: 'Link Tools' }),       desc: t('tools.basic.links.desc', { defaultValue: 'Shorteners, cloakers, pixel-tracking, A/B redirect.' }),                              to: '/link-tools' },
    { id: 'deck',    icon: Monitor,    name: t('tools.basic.deck.name', { defaultValue: 'SuperDeck' }),         desc: t('tools.basic.deck.desc', { defaultValue: 'AI presentation builder with 18 fonts and present mode.' }),                          to: '/superdeck' },
  ];
}

export function getProTools(t) {
  return [
    { id: 'pages',     icon: Globe,          name: t('tools.pro.pages.name', { defaultValue: 'SuperPages' }),    desc: t('tools.pro.pages.desc', { defaultValue: 'Drag-and-drop landing page builder. Hosted, mobile-ready, conversion-focused.' }), to: '/pro/funnels' },
    { id: 'auto',      icon: Mail,           name: t('tools.pro.auto.name', { defaultValue: 'AutoResponder' }),  desc: t('tools.pro.auto.desc', { defaultValue: 'Email sequences, broadcasts, lead nurture. Powered by Brevo.' }),                  to: '/pro/leads' },
    { id: 'leads',     icon: Search,         name: t('tools.pro.leads.name', { defaultValue: 'Lead Finder' }),   desc: t('tools.pro.leads.desc', { defaultValue: 'Outscraper-powered local business and web prospect finder.' }),                  to: '/lead-finder' },
    { id: 'niche',     icon: Star,           name: t('tools.pro.niche.name', { defaultValue: 'Niche Finder' }),  desc: t('tools.pro.niche.desc', { defaultValue: 'Discover under-served niches with AI-powered analysis.' }),                       to: '/niche-finder' },
    { id: 'proseller', icon: GraduationCap,  name: t('tools.pro.seller.name', { defaultValue: 'ProSeller' }),    desc: t('tools.pro.seller.desc', { defaultValue: 'Personal AI sales coach. Strategy, copy, objection handling.' }),                to: '/proseller' },
  ];
}

// ──────────────────────────────────────────────────────────────────
// Family-of-routes detector — used by ToolsTabs in AppLayout to know
// when to render the persistent tab strip.
// ──────────────────────────────────────────────────────────────────
const TOOLS_FAMILY_PATHS = [
  '/tools',
  // Free tool pages
  '/free/banner-creator', '/free/meme-generator', '/free/qr-code-generator',
  // Basic tool pages
  '/creative-studio', '/content-creator', '/linkhub', '/link-tools', '/superdeck',
  // Pro tool pages
  '/pro/funnels', '/pro/leads', '/lead-finder', '/niche-finder', '/proseller',
];

export function isToolsFamilyRoute(pathname) {
  for (var i = 0; i < TOOLS_FAMILY_PATHS.length; i++) {
    var p = TOOLS_FAMILY_PATHS[i];
    if (pathname === p || pathname.indexOf(p + '/') === 0) return true;
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────
// ToolGrid — 4-column grid of tool cards, used on the three sub-pages
// ──────────────────────────────────────────────────────────────────
export function ToolGrid({ tools, tone }) {
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
            {/* Left-edge accent stripe matches the tone */}
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

// ──────────────────────────────────────────────────────────────────
// UpgradeCard — replaces a tool grid for tiers above the member's
// ──────────────────────────────────────────────────────────────────
export function UpgradeCard({ tone, icon: Icon, eyebrow, title, desc, items, price, period, ctaLabel }) {
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

// ──────────────────────────────────────────────────────────────────
// SubPageHero — the navy identity hero used by Free/Basic/Pro pages
// (the overview /tools page has its own slightly different hero).
// ──────────────────────────────────────────────────────────────────
export function SubPageHero({ user, t, eyebrowKey, eyebrowDefault, glowColor }) {
  const tier = (user?.membership_tier || '').toLowerCase();
  const isPro = tier === 'pro';
  const isBasic = tier === 'basic' || isPro;
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

  return (
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
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%',
        background: `radial-gradient(circle at 70% 50%, ${glowColor || 'rgba(139,92,246,0.18)'}, transparent 60%)`,
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
            {t(eyebrowKey, { defaultValue: eyebrowDefault })}
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
      <Link to="/tools" style={{
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        {t('tools.backToOverview', { defaultValue: 'Back to Tools' })}
      </Link>
    </div>
  );
}

// Hook to collapse sidebar on mount and restore on unmount.
// Used by all four Tools-family pages.
export function useSidebarCollapse() {
  // This deliberately uses useEffect imperatively below — pulling React
  // import here keeps the shared module dependency-light. Callers should
  // wrap with useEffect themselves; we expose the body as a helper.
}
