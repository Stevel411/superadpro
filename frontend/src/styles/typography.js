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
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  // Platform anchor: card titles across Dashboard, stream cards, panel
  // headers, and data cards all share this size. Set to 18px on 23 Apr 2026
  // after desktop review showed 16px felt underweighted. Full platform cascade
  // for other sizes anchors off this value.
  cardTitleBold: {
    fontSize: 18,
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.3,
  },

  // Body text — primary reading content
  // e.g. item descriptions, help text, explainer paragraphs
  // 16px aligns with 2026 SaaS standard (Notion, Vercel reading views)
  body: {
    fontSize: 16,
    fontWeight: 500,
    color: '#334155',
    lineHeight: 1.6,
  },

  // Body text in muted colour (secondary content)
  // e.g. card subtitles, meta rows, caption blocks
  bodyMuted: {
    fontSize: 16,
    fontWeight: 500,
    color: '#475569',
    lineHeight: 1.6,
  },

  // Larger body for marquee sections where body should have more presence
  // (Platform Tour section descriptions, Dashboard banner bodies).
  // Kept at 17px — one step up from the 16px baseline.
  bodyLarge: {
    fontSize: 17,
    fontWeight: 500,
    color: '#334155',
    lineHeight: 1.65,
  },
  bodyLargeMuted: {
    fontSize: 17,
    fontWeight: 500,
    color: '#475569',
    lineHeight: 1.65,
  },

  // Dense body — for data-dense contexts where 16px is too roomy
  // e.g. Wallet transaction tables, MyLeads cards, Analytics stat rows.
  // Use SPARINGLY — default should always be TYPE.body. If you reach for
  // bodyDense more than 2-3 times on a page, the layout is the problem,
  // not the type size. Added 23 Apr 2026.
  bodyDense: {
    fontSize: 15,
    fontWeight: 500,
    color: '#334155',
    lineHeight: 1.55,
  },
  bodyDenseMuted: {
    fontSize: 15,
    fontWeight: 500,
    color: '#475569',
    lineHeight: 1.55,
  },

  // Sub text — slightly smaller than body but still comfortably readable
  // e.g. form field helpers, table cell metadata, secondary descriptions
  sub: {
    fontSize: 14,
    fontWeight: 500,
    color: '#475569',
    lineHeight: 1.55,
  },
  subDark: {
    fontSize: 14,
    fontWeight: 500,
    color: '#475569',
    lineHeight: 1.55,
  },

  // Caption — smallest acceptable text for readable content
  // e.g. date stamps, fine print, form field helpers, table metadata.
  // 14px floor established 23 Apr 2026 — nothing readable goes below this.
  caption: {
    fontSize: 14,
    fontWeight: 500,
    color: '#7a8899',
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
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Table cells
  td: {
    fontSize: 14,
    color: '#0f172a',
  },
  tdMuted: {
    fontSize: 14,
    color: '#475569',
  },
};

/**
 * Semantic colour tokens — for use with TYPE constants
 * These match the CSS variables already used in the app.
 */
export const COLOR = {
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#475569',    // was #64748b — darkened 23 Apr 2026 for WCAG AA on page bg
  textFaint: '#7a8899',    // was #94a3b8 — darkened 23 Apr 2026 for WCAG AA Large
  textGhost: '#cbd5e1',    // structural accent only — never readable text

  accent: '#0ea5e9',
  indigo: '#6366f1',
  green: '#16a34a',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  red: '#ef4444',

  borderLight: '#e8ecf2',
  borderMid: '#cbd5e1',
};
