/**
 * SuperPages Labs — Light Glass design tokens (FINAL)
 * ════════════════════════════════════════════════════════════
 * Locked: 14 May 2026.
 *
 * Aesthetic: Light Glass chrome (Mockup Style 07 from Round 2).
 * Block design: Hybrid — glass on engagement blocks (form, testimonial,
 * FAQ, review, audio, video, icon+text, embed), solid on info blocks
 * (banner, heading, text, button, stats, countdown, badge, label,
 * progress, socials, image, logos, separator, divider, spacer, box).
 *
 * Typography pass: Sora 900 across all major titles with tighter tracking
 * for confident editorial weight. Icons at stroke-width 2.5 with rounded
 * caps/joins for a more crafted feel.
 *
 * Tile lift: three-layer cool-tinted shadow stack (inner highlight + tight
 * cobalt ambient + broader violet ground) produces a pronounced "cards
 * floating off the panel" effect. Hover lifts 3px and deepens shadows.
 *
 * These tokens are the source of truth — labsChrome.css references them
 * via CSS variables defined on the .labs-chrome wrapper.
 */

export const LABS_TOKENS = {
  font: {
    display: "'Manrope', 'Inter', sans-serif",
    body:    "'Manrope', 'Inter', sans-serif",
    sora:    "'Sora', sans-serif",           // for major headings, group labels, logo
    mono:    "'JetBrains Mono', monospace",
  },

  weight: {
    body:    500,
    medium:  600,
    bold:    700,
    heavy:   800,
    max:     900,
  },

  color: {
    pageBase: '#f8fafc',
    glowCobalt: 'rgba(14,165,233,0.12)',
    glowViolet: 'rgba(168,85,247,0.10)',

    glassSurface: 'rgba(255,255,255,0.55)',
    glassSurfaceStrong: 'rgba(255,255,255,0.7)',
    glassBorder: 'rgba(15,23,42,0.06)',

    tileBase: '#ffffff',
    tileBorder: 'rgba(15,23,42,0.04)',
    tileBorderHover: 'rgba(168,85,247,0.25)',

    accentStart: '#0ea5e9',
    accentEnd:   '#a855f7',
    accentGradient: 'linear-gradient(135deg, #0ea5e9, #a855f7)',
    accentGradientSoft: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(168,85,247,0.1))',
    accentShadow: '0 4px 12px rgba(14,165,233,0.3)',

    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    textFaint: '#94a3b8',
  },

  radius: {
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '12px',
    pill: '99px',
  },

  shadow: {
    // Three-layer tile lift stack — see LabsChrome.css for actual cascade
    // Stored here as documentation; the CSS uses literal shadow strings.
    tileRest: '0 4px 12px rgba(14,165,233,0.10), 0 8px 20px rgba(168,85,247,0.08)',
    tileHover: '0 8px 20px rgba(14,165,233,0.20), 0 14px 36px rgba(168,85,247,0.20)',
  },

  blur: {
    surface: 'saturate(180%) blur(20px)',
    tile: 'blur(8px)',
  },

  space: {
    topbar: '56px',
    paletteWidth: '280px',
    settingsWidth: '300px',
  },

  // The atmospheric glow applied to the page wash via the .labs-chrome::before
  pageGlow: 'radial-gradient(ellipse at 15% 25%, rgba(14,165,233,0.12), transparent 45%), radial-gradient(ellipse at 85% 75%, rgba(168,85,247,0.10), transparent 45%)',
};
