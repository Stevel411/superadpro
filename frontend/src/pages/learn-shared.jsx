/**
 * learn-shared.jsx — Item inventory + reusable cards for Learn door
 * ════════════════════════════════════════════════════════════════
 * Shared between LearnPage (overview), EducationPage, AssetsPage,
 * CommunityPage. Single source of truth for the 9 items + their
 * grouping into three categories.
 *
 *   EDUCATION (4)         — indigo theme
 *     Training, Comp Plan Explainer, Platform Tour, Crypto Guide
 *
 *   PROMOTIONAL ASSETS (3) — pink theme
 *     Marketing Materials, Email Swipes, Social Share
 *
 *   COMMUNITY (2)          — amber theme
 *     Leaderboard, Share Your Story
 *
 * Unlike Tools, Learn has NO tier-gating. Everything's open to all
 * members regardless of membership tier — so no UpgradeCard, no
 * tier checks, no locked tabs.
 *
 * Approved layout: /mnt/user-data/outputs/learn-page-mockup.html
 *
 * Note: SubPageHero is reused from tools-shared.jsx since the hero
 * pattern is identical across both doors. Re-exporting here for
 * clarity — pages can import from learn-shared without knowing it
 * actually lives in tools-shared.
 */
import { Link } from 'react-router-dom';
import {
  // Education icons
  BookOpen, FileText, Map, Shield,
  // Promotional Assets icons
  Download, Mail, Share2,
  // Community icons
  Trophy, Sparkles,
} from 'lucide-react';

// Re-export the shared hero so Learn pages have one import point
export { SubPageHero } from './tools-shared';

// ──────────────────────────────────────────────────────────────────
// Item inventory — three groups of items, each as a function taking
// the t() helper so translations resolve at call time.
// ──────────────────────────────────────────────────────────────────
export function getEducationItems(t) {
  return [
    { id: 'training', icon: BookOpen, name: t('learn.edu.training.name', { defaultValue: 'Training Centre' }),    desc: t('learn.edu.training.desc', { defaultValue: 'Step-by-step lessons covering everything from basics to advanced strategies.' }), to: '/training' },
    { id: 'comp',     icon: FileText, name: t('learn.edu.comp.name',     { defaultValue: 'Comp Plan Explainer' }), desc: t('learn.edu.comp.desc',     { defaultValue: 'Full breakdown of how the compensation plan works. Every commission, every tier.' }), to: '/compensation-plan' },
    { id: 'tour',     icon: Map,      name: t('learn.edu.tour.name',     { defaultValue: 'Platform Tour' }),       desc: t('learn.edu.tour.desc',     { defaultValue: 'Quick walkthrough of the entire platform. Find everything in 5 minutes.' }),       to: '/tour' },
    { id: 'crypto',   icon: Shield,   name: t('learn.edu.crypto.name',   { defaultValue: 'Crypto Guide' }),        desc: t('learn.edu.crypto.desc',   { defaultValue: 'How to set up a wallet, receive USDT payouts, and stay safe with crypto.' }),       to: '/crypto-guide' },
  ];
}

export function getAssetItems(t) {
  return [
    { id: 'materials', icon: Download, name: t('learn.assets.materials.name', { defaultValue: 'Marketing Materials' }), desc: t('learn.assets.materials.desc', { defaultValue: 'Banners, graphics, social posts ready to download and share.' }),                            to: '/marketing-materials' },
    { id: 'swipes',    icon: Mail,     name: t('learn.assets.swipes.name',    { defaultValue: 'Email Swipes' }),        desc: t('learn.assets.swipes.desc',    { defaultValue: 'AI-generated email templates for outreach campaigns. Copy-and-paste ready.' }),           to: '/email-swipes' },
    { id: 'social',    icon: Share2,   name: t('learn.assets.social.name',    { defaultValue: 'Social Share' }),        desc: t('learn.assets.social.desc',    { defaultValue: 'One-click share to Facebook, X, LinkedIn, WhatsApp with AI-generated post copy.' }), to: '/social-share' },
  ];
}

export function getCommunityItems(t) {
  return [
    { id: 'leaderboard', icon: Trophy,    name: t('learn.community.leaderboard.name', { defaultValue: 'Leaderboard' }),       desc: t('learn.community.leaderboard.desc', { defaultValue: 'Top earners and top recruiters across the platform. See where you rank.' }),       to: '/leaderboard' },
    { id: 'story',       icon: Sparkles,  name: t('learn.community.story.name',       { defaultValue: 'Share Your Story' }), desc: t('learn.community.story.desc',       { defaultValue: 'Submit your success milestone. Inspire others, get featured on the homepage.' }), to: '/share-story' },
  ];
}

// ──────────────────────────────────────────────────────────────────
// ItemGrid — generic 4-column item card grid used by all 3 sub-pages.
// `tone` is one of 'indigo' | 'pink' | 'amber' and drives the accent
// stripe on each card + the pill colour scheme.
// ──────────────────────────────────────────────────────────────────
export function ItemGrid({ items, tone, columns }) {
  const accent  = { indigo: '#6366f1', pink: '#ec4899', amber: '#f59e0b' }[tone] || '#94a3b8';
  const pill = {
    indigo: { bg: '#e0e7ff', bgHover: '#c7d2fe', color: '#4338ca' },
    pink:   { bg: '#fce7f3', bgHover: '#fbcfe8', color: '#be185d' },
    amber:  { bg: '#fef3c7', bgHover: '#fde68a', color: '#b45309' },
  }[tone] || { bg: '#f1f5f9', bgHover: '#e2e8f0', color: '#475569' };

  // columns prop lets sub-pages with fewer items use 3 or 2 columns
  // instead of squeezing into the default 4 (Community has 2 items so
  // 4-column rendering looks empty — better to use 2 directly).
  const cols = columns || 4;

  return (
    <div className="learn-items-grid" data-cols={cols} style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 14,
    }}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.id} to={item.to} style={{
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
            const p = e.currentTarget.querySelector('.learn-item-pill');
            if (p) p.style.background = pill.bgHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)';
            const p = e.currentTarget.querySelector('.learn-item-pill');
            if (p) p.style.background = pill.bg;
          }}>
            {/* Left-edge accent stripe in tone colour */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, background: accent }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} strokeWidth={2} />
              </div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 800, color: 'var(--sap-text-primary, #0f172a)', lineHeight: 1.2, letterSpacing: '-0.2px' }}>
                {item.name}
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--sap-text-secondary, #475569)', lineHeight: 1.4, flex: 1, marginBottom: 12 }}>
              {item.desc}
            </div>
            <span className="learn-item-pill" style={{
              alignSelf: 'flex-start',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px',
              borderRadius: 99,
              fontSize: 11, fontWeight: 700,
              background: pill.bg,
              color: pill.color,
              transition: 'background 0.12s',
            }}>
              Open <span style={{ opacity: 0.65 }}>→</span>
            </span>
          </Link>
        );
      })}
      <style>{`
        @media (max-width: 1100px) {
          .learn-items-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .learn-items-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
