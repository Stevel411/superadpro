import { useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// QuickProps — properties bar below the selected element
// ═══════════════════════════════════════════════════════════════
//
// Floating glass card that appears below a selected element. Surfaces
// the high-frequency style controls (opacity, background, text colour,
// border radius) without needing the deeper edit modal. Modeled on
// Figma's quick props panel.
//
// Layout: positioned absolute under the element so it stays anchored
// during drag/resize. Auto-clamps to canvas edges if the element is
// near the bottom (panel flips above instead).
//
// Props:
//   el           — the selected element object (we read x/y/w/h/s)
//   updateElement — to update styles
//   updateElementStyle — to update only the s sub-object
//   markDirty    — flag changes
//   canvasHeight — for edge-clamp decision (when to flip above)

export default function QuickProps({ el, updateElement, updateElementStyle, markDirty, canvasHeight }) {
  if (!el) return null;
  // Hide for blocks where this panel adds noise rather than value:
  //   - spacer/divider have no styling to set this way
  //   - action blocks (button, form, announcement) have their own
  //     deep-edit modal that covers everything in here plus typography
  //     and link — duplicating those controls here just clutters the
  //     canvas (audit B-4, 20 May 2026)
  //   - Inspector-ported text types (heading, text, label) — the
  //     Inspector panel on the left handles typography/colour/alignment
  //     properly, so the floating QuickProps just gets in the way
  //     (Phase 2A, 20 May 2026)
  const SKIP_TYPES = ['spacer', 'divider', 'button', 'form', 'announcement', 'heading', 'text', 'label', 'image', 'video', 'audio', 'review', 'testimonial', 'faq', 'stat', 'badge', 'progress', 'icontext', 'separator', 'logostrip', 'box', 'countdown', 'socialicons', 'embed'];
  if (SKIP_TYPES.includes(el.type)) return null;

  const fgRef = useRef(null);
  const bgRef = useRef(null);

  // Position decision: by default, below the element. If the element is
  // within 70px of the canvas bottom, flip above so the bar stays visible.
  const PANEL_HEIGHT = 42;
  const elBottom = el.y + el.h;
  const flipAbove = elBottom + PANEL_HEIGHT + 12 > canvasHeight;
  const top = flipAbove ? el.y - PANEL_HEIGHT - 8 : el.y + el.h + 8;
  // Centre horizontally on the element
  const left = el.x + el.w / 2;

  // Current values, with sensible defaults so the inputs always have
  // a value to show.
  const opacity = el.s?.opacity != null ? Number(el.s.opacity) : 1;
  const bg = el.s?.background || '';
  const colour = el.s?.color || '';
  const radius = parseInt(el.s?.borderRadius || '0', 10);

  const setStyle = (key, val) => {
    updateElementStyle(el.id, { [key]: val });
    markDirty();
  };

  // Extract a hex/rgb colour for the swatch input. If the bg is a
  // gradient or url() we show transparent — colour input doesn't
  // support those, so we just let the member click to override.
  const swatchColour = (val) => {
    if (!val) return '#ffffff';
    if (val.startsWith('linear-gradient') || val.startsWith('url')) return '#ffffff';
    return val;
  };

  return (
    <div
      className="sp-quick-props"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top, left,
        transform: 'translateX(-50%)',
        zIndex: 22,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        border: '1px solid rgba(200,16,46,0.2)',
        borderRadius: 10,
        boxShadow: '0 4px 14px rgba(200,16,46,0.1), 0 12px 32px rgba(18,56,143,0.12)',
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'Manrope, sans-serif',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Opacity slider — high-frequency control, biggest hitbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>α</span>
        <input
          type="range"
          min="0" max="1" step="0.05"
          value={opacity}
          onChange={(e) => setStyle('opacity', parseFloat(e.target.value))}
          style={{
            width: 76, height: 4,
            accentColor: '#c8102e',
            cursor: 'pointer',
          }}
          title={`Opacity ${Math.round(opacity * 100)}%`}
        />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', minWidth: 28, textAlign: 'right', fontFamily: 'monospace' }}>
          {Math.round(opacity * 100)}
        </span>
      </div>

      <div style={{ width: 1, height: 18, background: 'rgba(15,23,42,0.1)' }}/>

      {/* Background colour swatch */}
      <button
        onClick={() => bgRef.current?.click()}
        title="Background colour"
        style={{
          width: 28, height: 24, borderRadius: 6,
          border: '1px solid rgba(15,23,42,0.15)',
          cursor: 'pointer', padding: 0,
          position: 'relative',
          background: bg && !bg.startsWith('linear-gradient')
            ? bg
            : `repeating-conic-gradient(#e2e8f0 0 25%, #fff 0 50%) 50% / 8px 8px`,
          overflow: 'hidden',
        }}
      >
        {bg.startsWith('linear-gradient') && (
          <span style={{
            position: 'absolute', inset: 0,
            background: bg, opacity: 1,
          }}/>
        )}
      </button>
      <input
        ref={bgRef}
        type="color"
        value={swatchColour(bg)}
        onChange={(e) => setStyle('background', e.target.value)}
        style={{ display: 'none' }}
      />

      {/* Text colour swatch */}
      <button
        onClick={() => fgRef.current?.click()}
        title="Text colour"
        style={{
          width: 28, height: 24, borderRadius: 6,
          border: '1px solid rgba(15,23,42,0.15)',
          cursor: 'pointer', padding: 0,
          background: colour || '#0f172a',
          color: '#fff', fontSize: 11, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Sora,sans-serif',
        }}
      >A</button>
      <input
        ref={fgRef}
        type="color"
        value={swatchColour(colour)}
        onChange={(e) => setStyle('color', e.target.value)}
        style={{ display: 'none' }}
      />

      <div style={{ width: 1, height: 18, background: 'rgba(15,23,42,0.1)' }}/>

      {/* Border radius — number input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>R</span>
        <input
          type="number"
          min="0" max="200"
          value={radius}
          onChange={(e) => {
            const v = Math.max(0, Math.min(200, parseInt(e.target.value || '0', 10)));
            setStyle('borderRadius', v + 'px');
          }}
          style={{
            width: 44, padding: '3px 6px',
            border: '1px solid rgba(15,23,42,0.12)',
            borderRadius: 5,
            fontSize: 11, fontWeight: 700,
            color: '#0f172a', fontFamily: 'monospace',
            textAlign: 'center', outline: 'none',
          }}
          title="Border radius (px)"
        />
      </div>
    </div>
  );
}
