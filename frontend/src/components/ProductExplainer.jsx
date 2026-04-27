import { useState } from 'react';

/**
 * ProductExplainer — collapsible "What am I actually buying?" card.
 *
 * Used on internal pages where members are about to buy a tier or pack
 * (CampaignTiers, CreditMatrix) and on the comp plan page (CompensationPlan).
 *
 * Reads all copy from i18n keys at `<tNamespace>.explainer.*` so the same
 * component is used for both Grid (gridStream.explainer.*) and Nexus
 * (nexusStream.explainer.*). Open by default — first-time visitors see the
 * answer immediately; click chevron to collapse.
 *
 * Variants:
 *   variant="grid"  → cyan accent (matches Grid theme)
 *   variant="nexus" → violet accent (matches Nexus theme)
 *
 * Props:
 *   t:          i18next t function from useTranslation
 *   tNamespace: 'gridStream' or 'nexusStream'
 *   variant:    'grid' or 'nexus' (controls colour scheme)
 *   defaultOpen: boolean (default true)
 *   compact:    boolean — tighter padding for use inside a card (e.g. CompPlan)
 */
export default function ProductExplainer({
  t,
  tNamespace,
  variant = 'grid',
  defaultOpen = true,
  compact = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Variant-specific palette. Keep both schemes in this file so all
  // colours live in one place — easier to tweak later.
  const palette = variant === 'nexus'
    ? {
        // Violet for Nexus
        iconBg: '#ede9fe',
        iconColor: '#6d28d9',
        subtitleColor: '#6d28d9',
        accentBoxBg: '#f5f3ff',
        accentBoxBorder: '#c4b5fd',
        accentBoxLabelColor: '#6d28d9',
      }
    : {
        // Cyan for Grid
        iconBg: '#e0f2fe',
        iconColor: '#0284c7',
        subtitleColor: '#0284c7',
        accentBoxBg: '#f0f9ff',
        accentBoxBorder: '#7dd3fc',
        accentBoxLabelColor: '#0369a1',
      };

  // Amber callout for tier-stacking — same on both variants since it's
  // a "watch out" message, not brand-specific.
  const tiersCallout = {
    bg: '#fffbeb',
    border: '#fde68a',
    labelColor: '#b45309',
    textColor: '#422006',
  };

  const containerPadding = compact ? '14px 18px' : '18px 22px';
  const bodyPadding = compact ? '0 18px 18px' : '0 22px 22px';

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--sap-border, #e2e8f0)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
      marginBottom: 24,
    }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: containerPadding,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          color: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          <div style={{
            width: compact ? 36 : 42,
            height: compact ? 36 : 42,
            borderRadius: '50%',
            background: palette.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 800,
              fontSize: compact ? 17 : 20,
              color: palette.iconColor,
            }}>?</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: compact ? 15 : 17,
              fontWeight: 700,
              color: 'var(--sap-text, #0f172a)',
              letterSpacing: '-0.005em',
              lineHeight: 1.3,
            }}>{t(`${tNamespace}.explainer.headline`)}</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: palette.subtitleColor,
              marginTop: 4,
            }}>{t(`${tNamespace}.explainer.subtitle`)}</div>
          </div>
        </div>
        <div style={{
          fontSize: 16,
          color: open ? palette.iconColor : 'var(--sap-text-muted, #64748b)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s, color 0.2s',
          flexShrink: 0,
        }}>▾</div>
      </button>

      {open && (
        <div style={{
          padding: bodyPadding,
          borderTop: '1px solid var(--sap-border, #e2e8f0)',
        }}>
          <p style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--sap-text, #0f172a)',
            margin: '14px 0 0',
          }}>
            {t(`${tNamespace}.explainer.p1Pre`)}
            <strong style={{ color: palette.iconColor, fontWeight: 600 }}>
              {t(`${tNamespace}.explainer.p1Bold`)}
            </strong>
            {t(`${tNamespace}.explainer.p1Post`)}
          </p>
          <p style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--sap-text, #0f172a)',
            margin: '12px 0 0',
          }}>{t(`${tNamespace}.explainer.p2`)}</p>

          <div style={{
            marginTop: 16,
            padding: '12px 14px',
            background: palette.accentBoxBg,
            border: `1px solid ${palette.accentBoxBorder}`,
            borderLeft: `3px solid ${palette.iconColor}`,
            borderRadius: 8,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: palette.accentBoxLabelColor,
              marginBottom: 4,
            }}>{t(`${tNamespace}.explainer.buyingLabel`)}</div>
            <div style={{
              fontSize: 13,
              color: 'var(--sap-text, #0f172a)',
              lineHeight: 1.6,
            }}>{t(`${tNamespace}.explainer.buyingText`)}</div>
          </div>

          <div style={{
            marginTop: 12,
            padding: '12px 14px',
            background: tiersCallout.bg,
            border: `1px solid ${tiersCallout.border}`,
            borderLeft: `3px solid #f59e0b`,
            borderRadius: 8,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: tiersCallout.labelColor,
              marginBottom: 4,
            }}>⚡ {t(`${tNamespace}.explainer.tiersLabel`)}</div>
            <div style={{
              fontSize: 13,
              color: tiersCallout.textColor,
              lineHeight: 1.6,
            }}>{t(`${tNamespace}.explainer.tiersText`)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
