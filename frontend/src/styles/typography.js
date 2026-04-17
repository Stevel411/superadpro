/**
 * SuperAdPro Typography Scale
 *
 * Single source of truth for all text sizing across the platform.
 * Matches industry-standard dashboard apps (X/Twitter body: 15px,
 * Facebook captions: 13-14px, etc.)
 *
 * Usage:
 *   import { TYPE } from '../styles/typography';
 *   <div style={TYPE.body}>...</div>
 *   <div style={{...TYPE.body, color: 'red'}}>...</div>
 *
 * Never use: inline fontSize values in new code.
 * Exceptions: Hero headlines, big stat numbers, and Sora display
 * fonts are NOT in this scale — those remain bespoke per-component.
 */

export const TYPE = {
  // Labels — small uppercase tracked labels at the top of cards/sections
  // e.g. "YOUR REFERRAL LINK", "LIFETIME EARNED"
  label: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Card titles — the main heading inside a bordered card
  // e.g. "Direct Course Sales", "Recent Commissions"
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  cardTitleBold: {
    fontSize: 16,
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.35,
  },

  // Body text — primary reading content
  // e.g. item descriptions, help text, explainer paragraphs
  body: {
    fontSize: 15,
    fontWeight: 500,
    color: '#334155',
    lineHeight: 1.6,
  },

  // Body text in muted colour (secondary content)
  // e.g. card subtitles, meta rows, caption blocks
  bodyMuted: {
    fontSize: 15,
    fontWeight: 500,
    color: '#64748b',
    lineHeight: 1.6,
  },

  // Sub text — slightly smaller than body but still comfortably readable
  // e.g. form field helpers, table cell metadata, secondary descriptions
  sub: {
    fontSize: 14,
    fontWeight: 500,
    color: '#64748b',
    lineHeight: 1.55,
  },
  subDark: {
    fontSize: 14,
    fontWeight: 500,
    color: '#475569',
    lineHeight: 1.55,
  },

  // Caption — smallest acceptable text for metadata only
  // e.g. date stamps, fine print. Do NOT use for content members need to read.
  caption: {
    fontSize: 13,
    fontWeight: 500,
    color: '#94a3b8',
    lineHeight: 1.45,
  },

  // Button text
  btn: {
    fontSize: 14,
    fontWeight: 700,
  },
  btnSmall: {
    fontSize: 13,
    fontWeight: 700,
  },

  // Table headers
  th: {
    fontSize: 12,
    fontWeight: 800,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Table cells
  td: {
    fontSize: 14,
    color: '#0f172a',
  },
  tdMuted: {
    fontSize: 13,
    color: '#64748b',
  },
};

/**
 * Semantic colour tokens — for use with TYPE constants
 * These match the CSS variables already used in the app.
 */
export const COLOR = {
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  textGhost: '#cbd5e1',

  accent: '#0ea5e9',
  indigo: '#6366f1',
  green: '#16a34a',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  red: '#ef4444',

  borderLight: '#e8ecf2',
  borderMid: '#cbd5e1',
};
