/**
 * tools-shared.jsx — Tool inventory + reusable card components
 * ════════════════════════════════════════════════════════════════
 * Shared between ToolsPage (overview), AIContentToolsPage,
 * BuilderToolsPage. Single source of truth for the 13 tools + the
 * reusable ToolGrid and SubPageHero components.
 *
 * Tool categorisation (locked 20 May 2026):
 *   AI Content Tools (7) — tools whose primary interaction is "AI
 *     generates an asset for you": Creative Studio, Content Creator,
 *     SuperDeck, Banner Creator, Meme Generator, QR Generator,
 *     Niche Finder.
 *   Builder Tools (6) — tools whose primary interaction is "you build
 *     and distribute": SuperPages, LinkHub, Link Tools, AutoResponder,
 *     Lead Finder, ProSeller.
 *
 * Previous structure (Free / Basic / Pro) was an artefact of the
 * dual-tier Basic/Pro membership model retired 15 May 2026. Under
 * flat-pricing every active member gets all 13 tools — there's no
 * per-tool tier gate, just "are they active". The buckets above are
 * about user intent, not pricing.
 *
 * If we add a new tool, we add it here once and both pages pick it up.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  // AI Content tool icons
  Sparkles,
  // Builder tool icons
  Globe, Link2, LayoutGrid, Mail, Search, GraduationCap, Newspaper,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────
// Tool inventory
// ──────────────────────────────────────────────────────────────────
// Translation keys assume t() is passed in by the caller, so each tool
// is defined as a function that takes (t) and returns a fully-resolved
// tool object. The destination routes match what already exists on the
// platform — no new tool pages needed, just better navigation to them.

export function getAIContentTools(t) {
  return [
    { id: 'studio',  icon: Sparkles, name: t('tools.ai.studio.name', { defaultValue: 'Creative Studio' }), desc: t('tools.ai.studio.desc', { defaultValue: 'AI image, video, music, voiceover, lipsync, captions. Your creative powerhouse.' }), to: '/creative-studio' },
  ];
}

export function getBuilderTools(t) {
  return [
    { id: 'pages',     icon: Globe,         name: t('tools.builder.pages.name', { defaultValue: 'SuperPages' }), desc: t('tools.builder.pages.desc', { defaultValue: 'Drag-and-drop landing page builder. Hosted, mobile-ready, conversion-focused.' }), to: '/pro/funnels' },
    { id: 'linkhub',   icon: Link2,         name: t('tools.builder.linkhub.name', { defaultValue: 'LinkHub' }), desc: t('tools.builder.linkhub.desc', { defaultValue: 'Linktree-style page hosting all your links in one place.' }), to: '/linkhub' },
    { id: 'links',     icon: LayoutGrid,    name: t('tools.builder.links.name', { defaultValue: 'Link Tools' }), desc: t('tools.builder.links.desc', { defaultValue: 'Shorteners, cloakers, pixel-tracking, A/B redirect.' }), to: '/link-tools' },
    { id: 'auto',      icon: Mail,          name: t('tools.builder.auto.name', { defaultValue: 'AutoResponder' }), desc: t('tools.builder.auto.desc', { defaultValue: 'Email sequences, broadcasts, lead nurture. Powered by Brevo.' }), to: '/pro/leads' },
    { id: 'leads',     icon: Search,        name: t('tools.builder.leads.name', { defaultValue: 'Lead Finder' }), desc: t('tools.builder.leads.desc', { defaultValue: 'Outscraper-powered local business and web prospect finder.' }), to: '/lead-finder' },
    { id: 'proseller', icon: GraduationCap, name: t('tools.builder.seller.name', { defaultValue: 'ProSeller' }), desc: t('tools.builder.seller.desc', { defaultValue: 'Personal AI sales coach. Strategy, copy, objection handling.' }), to: '/proseller' },
    { id: 'mysite',    icon: Newspaper,     name: t('tools.builder.mysite.name', { defaultValue: 'My Blog' }), desc: t('tools.builder.mysite.desc', { defaultValue: 'Your own blog & website. Posts, pages, themes, custom domain.' }), to: '/my-site' },
  ];
}

// ──────────────────────────────────────────────────────────────────
// Legacy aliases — kept for any external code still importing them.
// Both now return the unified flat-pricing inventory (callers can
// migrate to getAIContentTools / getBuilderTools at leisure).
// ──────────────────────────────────────────────────────────────────
export function getFreeTools(t) {
  // Old "Free" bucket was Banner / Meme / QR — now lives in AI Content.
  return getAIContentTools(t).filter(function(tool) {
    return ['banner', 'meme', 'qr'].indexOf(tool.id) !== -1;
  });
}

export function getBasicTools(t) {
  // Old "Basic" bucket: Creative Studio, Content Creator, LinkHub,
  // Link Tools, SuperDeck. Map to current inventory.
  var ai = getAIContentTools(t);
  var builder = getBuilderTools(t);
  return [
    ai.find(function(x) { return x.id === 'studio'; }),
    ai.find(function(x) { return x.id === 'content'; }),
    builder.find(function(x) { return x.id === 'linkhub'; }),
    builder.find(function(x) { return x.id === 'links'; }),
    ai.find(function(x) { return x.id === 'deck'; }),
  ].filter(Boolean);
}

export function getProTools(t) {
  // Old "Pro" bucket: SuperPages, AutoResponder, Lead Finder,
  // Niche Finder, ProSeller. Map to current inventory.
  var ai = getAIContentTools(t);
  var builder = getBuilderTools(t);
  return [
    builder.find(function(x) { return x.id === 'pages'; }),
    builder.find(function(x) { return x.id === 'auto'; }),
    builder.find(function(x) { return x.id === 'leads'; }),
    builder.find(function(x) { return x.id === 'proseller'; }),
  ].filter(Boolean);
}

// ──────────────────────────────────────────────────────────────────
// Note: isToolsFamilyRoute lives in components/layout/ToolsTabs.jsx
// (the canonical location, since AppLayout imports it from there).
// Don't add it here — keeping a single source of truth prevents drift.
// ──────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────
// ToolGrid — 4-column grid of tool cards, used on the three sub-pages
// ──────────────────────────────────────────────────────────────────
export function ToolGrid({ tools, tone }) {
  const accent = { green: '#22c55e', cyan: '#0ea5e9', indigo: '#6366f1', amber: '#f59e0b' }[tone] || '#94a3b8';
  const pillStyle = {
    green:  { bg: '#dcfce7', bgHover: '#bbf7d0', color: '#15803d' },
    cyan:   { bg: '#cffafe', bgHover: '#a5f3fc', color: '#0e7490' },
    indigo: { bg: '#e0e7ff', bgHover: '#c7d2fe', color: '#4338ca' },
    amber:  { bg: '#fef3c7', bgHover: '#fde68a', color: '#b45309' },
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
        <Link to="/join" style={{
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
// SubPageHero — Dashboard-style identity hero used by all four
// Tools-family pages.
//
// Reuses the Dashboard welcome hero pattern exactly so we have one
// hero language across the platform — same cobalt gradient, same
// 72px avatar, same gold/silver tier badge inside neutral outline,
// same referral pill on the right.
//
// The only addition vs Dashboard: a small pill-button to the LEFT of
// the referral pill (e.g. "Back to Dashboard" on /tools, "Back to
// Tools" on /tools/free etc.). Sits adjacent to the referral pill on
// the right side of the hero — not stacked above it.
//
// Props:
//   user           — auth user object
//   t              — translation function
//   eyebrowKey     — i18n key for the small uppercase eyebrow above name
//   eyebrowDefault — fallback eyebrow text
//   backLinkTo     — destination for the small back pill (default /dashboard)
//   backLinkLabelKey/backLinkLabelDefault — label for the back pill
// ──────────────────────────────────────────────────────────────────
export function SubPageHero({ user, t, eyebrowKey, eyebrowDefault, backLinkTo, backLinkLabelKey, backLinkLabelDefault, hideBackLink }) {
  const [refCopied, setRefCopied] = useState(false);

  const copyRefLink = (link) => {
    try {
      navigator.clipboard.writeText(link);
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    } catch (e) { /* clipboard unavailable */ }
  };

  const username = user?.username || '';
  const displayName = user?.display_name || user?.first_name || username || '';
  const initial = (displayName || '?').charAt(0).toUpperCase();
  const tier = user?.membership_tier;

  // Active since label — formatted from user.created_at when available
  let activeSinceLabel = '';
  if (user?.created_at) {
    try {
      const d = new Date(user.created_at);
      activeSinceLabel = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    } catch (e) { /* ignore */ }
  }

  const back = {
    to: backLinkTo || '/dashboard',
    labelKey: backLinkLabelKey || 'tools.backToDashboard',
    labelDefault: backLinkLabelDefault || 'Back to Dashboard',
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--sap-cobalt-deep), var(--sap-cobalt-mid))',
      borderRadius: 18,
      padding: '22px 28px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 20,
      flexWrap: 'wrap',
      boxShadow: '0 8px 32px rgba(30,58,138,0.35)',
    }}>
      {/* Left — avatar + identity (same structure as Dashboard) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt=""
            style={{
              width: 72, height: 72, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.15)',
            }} />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--sap-accent-pale), var(--sap-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 900,
            color: '#fff', flexShrink: 0,
            border: '3px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 14px rgba(14,165,233,0.25)',
          }}>{initial}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 2,
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)',
            marginBottom: 4,
          }}>{t(eyebrowKey, { defaultValue: eyebrowDefault })}</div>
          <div style={{
            fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 900,
            color: '#fff', marginBottom: 6, lineHeight: 1.1,
            letterSpacing: '-0.3px',
          }}>{displayName}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: 'rgba(255,255,255,0.75)',
            flexWrap: 'wrap',
          }}>
            {/* Tier badge — same Partner-aware rendering as Dashboard.jsx.
                Three states under flat partner pricing (15 May 2026):
                  - free      → "Become a Partner →" inline CTA
                  - partner   → PARTNER badge (silver)
                  - founding  → FOUNDER badge (gold)
                Legacy 'basic'/'pro' values map to 'partner' defensively. */}
            {user && (function() {
              var t_lower = (tier || 'free').toLowerCase();
              // Use the dedicated is_founding_member boolean — tier
              // string is just 'partner'/'free' under flat-pricing.
              var isFounder = user.is_founding_member === true;
              var isPartner = !isFounder && (t_lower === 'partner' || t_lower === 'basic' || t_lower === 'pro');
              if (!isFounder && !isPartner) {
                return (
                  <Link to="/join" style={{
                    padding: '3px 11px', borderRadius: 6,
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(217,119,6,0.18) 100%)',
                    border: '1px solid rgba(251,191,36,0.4)',
                    fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
                    color: '#fcd34d',
                    textDecoration: 'none',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}>
                    {t('tools.becomePartner', { defaultValue: 'Become a Partner →' })}
                  </Link>
                );
              }
              var label = isFounder ? 'FOUNDER' : 'PARTNER';
              var color = isFounder ? '#ffd700' : '#d4dce8';
              var shadow = isFounder ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.3)';
              return (
                <span style={{
                  padding: '3px 11px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: 11, fontWeight: 900, letterSpacing: 1.4,
                  color: color,
                  textShadow: shadow,
                }}>{label}</span>
              );
            })()}
            {activeSinceLabel && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{t('tools.activeSince', { defaultValue: 'Active since' })} {activeSinceLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right — small back pill ADJACENT to (left of) the referral pill.
          Hidden when hideBackLink is set (e.g. Performance, where the
          sidebar Dashboard link + the tab strip already cover it). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        {!hideBackLink && (
        <Link to={back.to} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 10,
          color: '#fff',
          fontSize: 13, fontWeight: 600,
          textDecoration: 'none',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          {t(back.labelKey, { defaultValue: back.labelDefault })}
        </Link>
        )}

        {/* Referral pill — identical to Dashboard */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 12,
          padding: '10px 12px 10px 18px',
          minWidth: 280,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.3,
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
              marginBottom: 2,
            }}>{t('tools.yourReferralLink', { defaultValue: 'Your referral link' })}</div>
            <div style={{
              fontSize: 14, fontFamily: 'monospace', fontWeight: 600,
              color: '#fff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              advantagelife.club/ref/{username}
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyRefLink((typeof window !== 'undefined' ? window.location.origin : 'https://www.advantagelife.club') + '/ref/' + (username || ''))}
            style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: '#fff', color: 'var(--sap-cobalt-mid)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
            📋 {refCopied ? t('tools.copied', { defaultValue: 'Copied!' }) : t('tools.copy', { defaultValue: 'Copy' })}
          </button>
        </div>
      </div>
    </div>
  );
}
