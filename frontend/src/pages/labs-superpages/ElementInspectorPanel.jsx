// ═══════════════════════════════════════════════════════════════
// ElementInspectorPanel — left-rail properties panel
// ═══════════════════════════════════════════════════════════════
//
// Phase 1 of the Labs Page Builder refactor (20 May 2026, Steve & Claude).
// Replaces the modal-based ButtonEditor with a persistent left-side
// panel that edits the selected element LIVE — no Apply button, no
// modal blocking the canvas. Pattern modelled on Figma / Webflow /
// Framer property panels.
//
// Phase 1 scope: BUTTON only. Other element types fall back to the
// existing modal system in SuperPagesEditor.jsx — that fallback is
// what lets us A/B the pattern without a full migration.
//
// When this proves out on Button (Steve approves the feel), Phase 2
// ports the remaining 25 block types to per-type property sections.
//
// Props:
//   el                — the selected element object
//   updateElement     — updateElement(elId, partial) — applies a partial
//                       merge into the element. We call this on every
//                       control change so edits go live as you adjust.
//   markDirty         — call after any change to track unsaved state
//   onDeselect        — call to clear the selection (panel slides out)
//   onDuplicate       — duplicate the current element
//   onDelete          — delete the current element
//   onToggleLock      — flip element.locked
//
// Editing model:
//   - Every control's onChange dispatches updateElement + markDirty.
//   - No Apply button — changes commit live. Undo via Ctrl+Z.
//   - Local React state mirrors the el props so inputs feel responsive
//     even before the next render cycle propagates the canvas update.

import { useEffect, useState } from 'react';
import { FONTS } from './elementDefaults';

// ── Shared styles for the panel ────────────────────────────────
const labelStyle = {
  display: 'block',
  fontSize: 10, fontWeight: 800,
  color: 'var(--sap-text-muted, #64748b)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid var(--sap-border, #e2e8f0)',
  borderRadius: 6,
  fontSize: 12,
  color: 'var(--sap-text-primary, #0f172a)',
  background: 'var(--sap-bg-elevated, #f8fafc)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const sectionStyle = {
  marginBottom: 16,
  paddingBottom: 16,
  borderBottom: '1px solid var(--sap-border-faint, #f1f5f9)',
};

const sectionStyleLast = {
  marginBottom: 0,
};

// ── Button-specific property section ───────────────────────────
//
// All controls write through updateElement/updateElementStyle on
// every change. The element on the canvas re-renders immediately
// because Canvas.jsx reads from el.txt / el.url / el.s on every
// render.
//
// Style commits MUST go through updateElementStyle (not updateElement
// with a spread `s` object) — updateElementStyle does the merge
// inside the setter, reading the LATEST e.s. Closure-spread merges
// from useState are stale, so quick successive style changes
// overwrite each other. Bug fixed 20 May 2026 after the first
// preview test showed buttons rendering without their background.
function ButtonProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // Local state mirrors el props so input feel is snappy. We sync
  // back to props on every change (live edit).
  const [txt, setTxt] = useState(el.txt || 'Join Now');
  const [url, setUrl] = useState(el.url || '');
  const [bgColor, setBgColor] = useState(el.s?.background || 'linear-gradient(135deg,#0ea5e9,#6366f1)');
  const [txtColor, setTxtColor] = useState(el.s?.color || '#fff');
  const [fontFamily, setFontFamily] = useState(el.s?.fontFamily || 'Sora,sans-serif');
  const [fontWeight, setFontWeight] = useState(el.s?.fontWeight || '700');
  const fontSizeRaw = el.s?.fontSize || '18px';
  const [fontSizeNum, setFontSizeNum] = useState(parseInt(String(fontSizeRaw).replace(/px$/, ''), 10) || 18);

  // When the selected element changes (different button selected, or
  // canvas reset), resync local state from the new el's props.
  useEffect(() => {
    setTxt(el.txt || 'Join Now');
    setUrl(el.url || '');
    setBgColor(el.s?.background || 'linear-gradient(135deg,#0ea5e9,#6366f1)');
    setTxtColor(el.s?.color || '#fff');
    setFontFamily(el.s?.fontFamily || 'Sora,sans-serif');
    setFontWeight(el.s?.fontWeight || '700');
    const fs = el.s?.fontSize || '18px';
    setFontSizeNum(parseInt(String(fs).replace(/px$/, ''), 10) || 18);
  }, [el.id]);

  // ── Live-edit helpers ───────────────────────────────────────
  const commitTxt = (v) => {
    setTxt(v);
    updateElement(el.id, { txt: v });
    markDirty();
  };
  const commitUrl = (v) => {
    setUrl(v);
    updateElement(el.id, { url: v });
    markDirty();
  };
  // Style commits go through updateElementStyle so each merge reads
  // the latest e.s — no stale-closure overwrite when commits happen
  // in rapid succession (the bug that made buttons lose their
  // background after a typography change).
  const commitStyle = (key, value) => {
    updateElementStyle(el.id, { [key]: value });
    markDirty();
  };
  const commitBg = (v) => { setBgColor(v); commitStyle('background', v); };
  const commitFg = (v) => { setTxtColor(v); commitStyle('color', v); };
  const commitFontFamily = (v) => { setFontFamily(v); commitStyle('fontFamily', v); };
  const commitFontWeight = (v) => { setFontWeight(v); commitStyle('fontWeight', v); };
  const commitFontSize = (numPx) => {
    setFontSizeNum(numPx);
    commitStyle('fontSize', numPx + 'px');
  };

  const COLOUR_PRESETS = [
    { bg: 'var(--sap-accent)', label: 'Cyan', fill: '#0ea5e9' },
    { bg: 'var(--sap-green-mid)', label: 'Green', fill: '#10b981' },
    { bg: 'var(--sap-indigo)', label: 'Indigo', fill: '#6366f1' },
    { bg: 'var(--sap-red-bright)', label: 'Red', fill: '#ef4444' },
    { bg: 'linear-gradient(135deg,#0ea5e9,#6366f1)', label: 'Cyan→Indigo', fill: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
    { bg: 'linear-gradient(135deg,#8b5cf6,#ec4899)', label: 'Purple→Pink', fill: 'linear-gradient(135deg,#8b5cf6,#ec4899)' },
    { bg: 'linear-gradient(135deg,#ef4444,#f59e0b)', label: 'Red→Amber', fill: 'linear-gradient(135deg,#ef4444,#f59e0b)' },
    { bg: 'linear-gradient(135deg,#10b981,#0ea5e9)', label: 'Green→Cyan', fill: 'linear-gradient(135deg,#10b981,#0ea5e9)' },
    { bg: 'var(--sap-amber)', label: 'Amber', fill: '#f59e0b' },
    { bg: 'var(--sap-pink)', label: 'Pink', fill: '#ec4899' },
    { bg: '#0f172a', label: 'Slate', fill: '#0f172a' },
    { bg: '#ffffff', label: 'White', fill: '#ffffff' },
  ];

  const TEXT_COLOURS = [
    '#ffffff', '#000000', '#0f172a', '#0ea5e9', '#fbbf24',
  ];

  return (
    <>
      {/* Content */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Content</label>
        <input
          type="text"
          value={txt}
          onChange={e => commitTxt(e.target.value)}
          placeholder="Button text"
          style={{ ...inputStyle, marginBottom: 6 }}
        />
        <input
          type="text"
          value={url}
          onChange={e => commitUrl(e.target.value)}
          placeholder="https://…"
          style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11, color: url ? 'var(--sap-accent, #0284c7)' : 'var(--sap-text-muted, #64748b)' }}
        />
      </div>

      {/* Typography */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Typography</label>
        <select
          value={fontFamily}
          onChange={e => commitFontFamily(e.target.value)}
          style={{ ...inputStyle, marginBottom: 8, fontFamily }}
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
          ))}
        </select>

        {/* Size slider with px readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 800,
            color: 'var(--sap-text-muted, #64748b)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            minWidth: 26,
          }}>Size</span>
          <input
            type="range"
            min="8" max="120" step="1"
            value={fontSizeNum}
            onChange={e => commitFontSize(parseInt(e.target.value, 10))}
            style={{ flex: 1, accentColor: 'var(--sap-accent, #0ea5e9)', cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            color: 'var(--sap-text-primary, #0f172a)',
            minWidth: 38, textAlign: 'right',
            background: 'var(--sap-bg-elevated, #f1f5f9)',
            padding: '3px 6px', borderRadius: 4,
          }}>{fontSizeNum}px</span>
        </div>

        <select
          value={fontWeight}
          onChange={e => commitFontWeight(e.target.value)}
          style={inputStyle}
        >
          <option value="400">Regular</option>
          <option value="500">Medium</option>
          <option value="600">Semibold</option>
          <option value="700">Bold</option>
          <option value="800">Extra Bold</option>
          <option value="900">Black</option>
        </select>
      </div>

      {/* Background colour */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Background</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
          {COLOUR_PRESETS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => commitBg(p.bg)}
              title={p.label}
              aria-label={p.label}
              style={{
                aspectRatio: '1',
                borderRadius: 5,
                background: p.fill,
                cursor: 'pointer',
                border: bgColor === p.bg ? '2px solid var(--sap-text-primary, #0f172a)' : '1px solid var(--sap-border, #e2e8f0)',
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Text colour */}
      <div style={sectionStyleLast}>
        <label style={labelStyle}>Text colour</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {TEXT_COLOURS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => commitFg(c)}
              aria-label={`Text colour ${c}`}
              style={{
                width: 24, height: 24,
                borderRadius: 5,
                background: c,
                cursor: 'pointer',
                border: txtColor === c ? '2px solid var(--sap-accent, #0ea5e9)' : '1px solid var(--sap-border, #e2e8f0)',
                padding: 0,
              }}
            />
          ))}
          {/* Custom colour swatch */}
          <label style={{
            width: 24, height: 24, borderRadius: 5,
            background: txtColor,
            border: '1px dashed var(--sap-border, #e2e8f0)',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }} title="Custom colour">
            <input type="color" value={txtColor.startsWith('#') ? txtColor : '#ffffff'}
              onChange={e => commitFg(e.target.value)}
              style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', padding: 0, cursor: 'pointer' }}
            />
          </label>
        </div>
      </div>
    </>
  );
}

// ── Text-types property section (heading / text / label) ────────
//
// Heading, Text, and Label share the same shape: rich-text content
// edited INLINE via Tiptap (double-click to edit), styled via this
// Inspector panel. Different from Button — the Inspector here only
// handles styling, NOT content, because content lives in the inline
// editor's output.
//
// Tiptap manages inline marks (bold/italic/link inside the text) at
// the character level. This panel manages BLOCK-level style — font
// family, size, weight, colour, alignment, line height. Those apply
// to the whole element via el.s.
//
// Added 20 May 2026 (Phase 2A).
function TextTypeProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // Local state mirrors el.s for snappy input feel. The actual data
  // lives in el.s — these are just UI-side mirrors.
  const [fontFamily, setFontFamily] = useState(el.s?.fontFamily || 'Sora,sans-serif');
  const [fontWeight, setFontWeight] = useState(el.s?.fontWeight || (el.type === 'heading' ? '800' : '400'));
  const fontSizeRaw = el.s?.fontSize || (el.type === 'heading' ? '48px' : el.type === 'label' ? '14px' : '18px');
  const [fontSizeNum, setFontSizeNum] = useState(parseInt(String(fontSizeRaw).replace(/px$/, ''), 10) || 18);
  const [textColor, setTextColor] = useState(el.s?.color || (el.type === 'heading' ? '#0f172a' : 'var(--sap-text-primary)'));
  const [textAlign, setTextAlign] = useState(el.s?.textAlign || 'left');
  const lineHeightRaw = el.s?.lineHeight || '1.4';
  const [lineHeightNum, setLineHeightNum] = useState(parseFloat(String(lineHeightRaw)) || 1.4);

  // Resync when selection changes (different element selected)
  useEffect(() => {
    setFontFamily(el.s?.fontFamily || 'Sora,sans-serif');
    setFontWeight(el.s?.fontWeight || (el.type === 'heading' ? '800' : '400'));
    const fs = el.s?.fontSize || (el.type === 'heading' ? '48px' : el.type === 'label' ? '14px' : '18px');
    setFontSizeNum(parseInt(String(fs).replace(/px$/, ''), 10) || 18);
    setTextColor(el.s?.color || '#0f172a');
    setTextAlign(el.s?.textAlign || 'left');
    setLineHeightNum(parseFloat(String(el.s?.lineHeight || '1.4')) || 1.4);
  }, [el.id]);

  // ── Live-edit helpers ─────────────────────────────────────
  const commitStyle = (key, value) => {
    updateElementStyle(el.id, { [key]: value });
    markDirty();
  };
  const commitFontFamily = (v) => { setFontFamily(v); commitStyle('fontFamily', v); };
  const commitFontWeight = (v) => { setFontWeight(v); commitStyle('fontWeight', v); };
  const commitFontSize = (numPx) => { setFontSizeNum(numPx); commitStyle('fontSize', numPx + 'px'); };
  const commitColor = (v) => { setTextColor(v); commitStyle('color', v); };
  const commitAlign = (v) => { setTextAlign(v); commitStyle('textAlign', v); };
  const commitLineHeight = (n) => {
    setLineHeightNum(n);
    commitStyle('lineHeight', String(n));
  };

  // Text-type colour palette — leans toward readable dark/medium tones
  // since most page text is on a light background. Three quick swatches
  // plus a custom colour input.
  const TEXT_COLOURS = [
    { value: '#0f172a', label: 'Slate-900' },
    { value: '#334155', label: 'Slate-700' },
    { value: '#64748b', label: 'Slate-500' },
    { value: '#ffffff', label: 'White' },
    { value: '#0ea5e9', label: 'Cyan' },
    { value: '#6366f1', label: 'Indigo' },
    { value: '#ef4444', label: 'Red' },
    { value: '#f59e0b', label: 'Amber' },
  ];

  return (
    <>
      {/* Content guidance — text is edited INLINE not here */}
      <div style={{
        ...sectionStyle,
        padding: 10,
        background: 'var(--sap-bg-elevated, #f8fafc)',
        border: '1px dashed var(--sap-border-faint, #e2e8f0)',
        borderRadius: 6,
        fontSize: 11,
        color: 'var(--sap-text-muted, #64748b)',
        lineHeight: 1.5,
      }}>
        💡 <strong style={{ color: 'var(--sap-text-primary, #0f172a)' }}>Double-click the {el.type}</strong> on the canvas to edit its text directly. Use this panel to style it.
      </div>

      {/* Typography */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Typography</label>
        <select
          value={fontFamily}
          onChange={e => commitFontFamily(e.target.value)}
          style={{ ...inputStyle, marginBottom: 8, fontFamily }}
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
          ))}
        </select>

        {/* Size slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 800,
            color: 'var(--sap-text-muted, #64748b)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            minWidth: 26,
          }}>Size</span>
          <input
            type="range"
            min="8" max="128" step="1"
            value={fontSizeNum}
            onChange={e => commitFontSize(parseInt(e.target.value, 10))}
            style={{ flex: 1, accentColor: 'var(--sap-accent, #0ea5e9)', cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            color: 'var(--sap-text-primary, #0f172a)',
            minWidth: 38, textAlign: 'right',
            background: 'var(--sap-bg-elevated, #f1f5f9)',
            padding: '3px 6px', borderRadius: 4,
          }}>{fontSizeNum}px</span>
        </div>

        <select
          value={fontWeight}
          onChange={e => commitFontWeight(e.target.value)}
          style={inputStyle}
        >
          <option value="400">Regular</option>
          <option value="500">Medium</option>
          <option value="600">Semibold</option>
          <option value="700">Bold</option>
          <option value="800">Extra Bold</option>
          <option value="900">Black</option>
        </select>
      </div>

      {/* Alignment */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Alignment</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {[
            { value: 'left', label: '← Left', icon: '⇤' },
            { value: 'center', label: 'Centre', icon: '⇔' },
            { value: 'right', label: 'Right →', icon: '⇥' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => commitAlign(opt.value)}
              style={{
                padding: '8px 6px',
                borderRadius: 6,
                border: textAlign === opt.value
                  ? '2px solid var(--sap-accent, #0ea5e9)'
                  : '1px solid var(--sap-border, #e2e8f0)',
                background: textAlign === opt.value
                  ? 'var(--sap-accent-bg, rgba(14,165,233,0.08))'
                  : 'var(--sap-bg-elevated, #f8fafc)',
                color: textAlign === opt.value
                  ? 'var(--sap-accent, #0ea5e9)'
                  : 'var(--sap-text-primary, #0f172a)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Line height — affects how text wraps and spacing */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Line height</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min="1" max="3" step="0.05"
            value={lineHeightNum}
            onChange={e => commitLineHeight(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--sap-accent, #0ea5e9)', cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            color: 'var(--sap-text-primary, #0f172a)',
            minWidth: 36, textAlign: 'right',
            background: 'var(--sap-bg-elevated, #f1f5f9)',
            padding: '3px 6px', borderRadius: 4,
          }}>{lineHeightNum.toFixed(2)}</span>
        </div>
      </div>

      {/* Colour */}
      <div style={sectionStyleLast}>
        <label style={labelStyle}>Colour</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 8 }}>
          {TEXT_COLOURS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => commitColor(c.value)}
              title={c.label}
              aria-label={c.label}
              style={{
                aspectRatio: '1',
                borderRadius: 5,
                background: c.value,
                cursor: 'pointer',
                border: textColor === c.value
                  ? '2px solid var(--sap-accent, #0ea5e9)'
                  : '1px solid var(--sap-border, #e2e8f0)',
                padding: 0,
              }}
            />
          ))}
        </div>
        {/* Custom colour picker */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px',
          background: 'var(--sap-bg-elevated, #f8fafc)',
          border: '1px solid var(--sap-border, #e2e8f0)',
          borderRadius: 6,
          cursor: 'pointer',
        }} title="Custom colour">
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            background: textColor.startsWith('#') ? textColor : '#0f172a',
            border: '1px solid var(--sap-border-faint, #e2e8f0)',
            position: 'relative', overflow: 'hidden',
          }}>
            <input
              type="color"
              value={textColor.startsWith('#') ? textColor : '#0f172a'}
              onChange={e => commitColor(e.target.value)}
              style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', padding: 0, cursor: 'pointer' }}
            />
          </div>
          <span style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', fontWeight: 600 }}>
            Custom colour
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--sap-text-faint, #94a3b8)' }}>
            {textColor.startsWith('#') ? textColor.toUpperCase() : ''}
          </span>
        </label>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Phase 2D — Card-like containers + Progress + Badge
// ═══════════════════════════════════════════════════════════════
//
// Six element types added in Phase 2D (20 May 2026):
//   - review        ← content inline-edited via contenteditable;
//                     Inspector handles container styling only
//   - testimonial   ← same as review
//   - faq           ← same as review
//   - stat          ← same as review + text alignment
//   - badge         ← typography + container (via TextTypeProperties)
//   - progress      ← structured config: label + percent + colours
//
// Approach: card-likes share enough (background, padding, radius,
// accent stripe) that a single ContainerSection helper handles them.
// CardLikeProperties routes through that helper with type-specific
// extras (stat gets text alignment, review/testimonial get the
// accent stripe by default since their defaults already have one).
//
// Progress is its own component because its model is purely
// structural fields (no styling on the element itself — colours and
// label are passed through to the rendered bar via _percent etc).
//
// Badge falls under TextTypeProperties extended with a Container
// subsection — Badge IS a Label with a pill background, structurally
// — and is added to TIPTAP_TYPES so it inline-edits like Label.

// ── ContainerSection — reusable card-styling controls ──────────
//
// Drop-in subcomponent. Handles three core styling properties common
// to card-like elements: background, corner radius, padding. Optional
// accent-stripe (left border) for review/testimonial.
//
// All controls write through updateElementStyle on every change. No
// Apply button. Local state mirrors el.s for snappy input feel and
// resyncs when el.id changes.
function ContainerSection({ el, updateElementStyle, markDirty, includeAccentStripe = false, lastSection = false }) {
  // ── Local state mirrors el.s ─────────────────────────────────
  // Background can be 'transparent', a hex, a linear-gradient(),
  // or a CSS variable. For the colour picker we extract the first
  // hex if any; otherwise leave the picker neutral and rely on the
  // raw text input for gradients.
  const [background, setBackground] = useState(el.s?.background || '#1e293b');
  const [radius, setRadius] = useState(parseInt((el.s?.borderRadius || '12px'), 10) || 12);
  // Padding can be '24px' (uniform) or '24px 18px' (vertical/horizontal).
  // We treat it as uniform here for simplicity — members who need
  // asymmetric padding can use the raw CSS edit feature later.
  const [padding, setPadding] = useState(parseInt((el.s?.padding || '24px'), 10) || 24);

  // Accent stripe — only meaningful for review/testimonial which use
  // it as a left-bar visual divider. Parse from `borderLeft` which
  // is typically '4px solid #0ea5e9'.
  const stripeRaw = el.s?.borderLeft || '';
  const stripeMatch = stripeRaw.match(/^(\d+)px\s+solid\s+(.+)$/);
  const [stripeWidth, setStripeWidth] = useState(stripeMatch ? parseInt(stripeMatch[1], 10) : 0);
  const [stripeColor, setStripeColor] = useState(stripeMatch ? stripeMatch[2] : '#0ea5e9');

  // Resync on selection change
  useEffect(() => {
    setBackground(el.s?.background || '#1e293b');
    setRadius(parseInt((el.s?.borderRadius || '12px'), 10) || 12);
    setPadding(parseInt((el.s?.padding || '24px'), 10) || 24);
    const m = (el.s?.borderLeft || '').match(/^(\d+)px\s+solid\s+(.+)$/);
    setStripeWidth(m ? parseInt(m[1], 10) : 0);
    setStripeColor(m ? m[2] : '#0ea5e9');
  }, [el.id]);

  // Commit helpers
  const commitBackground = (v) => {
    setBackground(v);
    updateElementStyle(el.id, { background: v });
    markDirty();
  };
  const commitRadius = (n) => {
    setRadius(n);
    updateElementStyle(el.id, { borderRadius: `${n}px` });
    markDirty();
  };
  const commitPadding = (n) => {
    setPadding(n);
    updateElementStyle(el.id, { padding: `${n}px` });
    markDirty();
  };
  // Stripe: width 0 means no stripe — commit borderLeft as empty
  // string so the style serialiser drops it entirely. Width > 0
  // emits the standard '4px solid #COLOR' shape.
  const commitStripe = (w, c) => {
    setStripeWidth(w);
    setStripeColor(c);
    const value = w > 0 ? `${w}px solid ${c}` : '';
    updateElementStyle(el.id, { borderLeft: value });
    markDirty();
  };

  // ── Render ───────────────────────────────────────────────────
  // Each row is a label + control. Background gets both a colour
  // picker (for hex) and a text input (for gradients / CSS vars).
  // Radius and padding are sliders with current-value readout.
  return (
    <div style={lastSection ? sectionStyleLast : sectionStyle}>
      <div style={labelStyle}>Container</div>

      {/* Background — colour picker + raw text */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginBottom: 4 }}>
          Background
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* The colour picker only works for hex values. For
              gradients / variables it shows the current swatch
              as a fallback colour but pinning it to the gradient
              start. */}
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(background) ? background : '#1e293b'}
            onChange={e => commitBackground(e.target.value)}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer',
              background: 'transparent',
            }}
          />
          <input
            type="text"
            value={background}
            onChange={e => commitBackground(e.target.value)}
            placeholder="#1e293b or linear-gradient(…)"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      {/* Corner radius slider */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>
          <span>Corners</span>
          <span style={{ fontFamily: 'monospace' }}>{radius}px</span>
        </div>
        <input
          type="range" min={0} max={48} step={1}
          value={radius}
          onChange={e => commitRadius(parseInt(e.target.value, 10))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Padding slider */}
      <div style={{ marginBottom: includeAccentStripe ? 10 : 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>
          <span>Padding</span>
          <span style={{ fontFamily: 'monospace' }}>{padding}px</span>
        </div>
        <input
          type="range" min={0} max={64} step={2}
          value={padding}
          onChange={e => commitPadding(parseInt(e.target.value, 10))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Accent stripe — only for review/testimonial where the
          design language calls for a coloured left bar */}
      {includeAccentStripe && (
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
            marginBottom: 4,
          }}>
            <span>Accent stripe</span>
            <span style={{ fontFamily: 'monospace' }}>{stripeWidth}px</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="color"
              value={(/^#[0-9a-f]{6}$/i).test(stripeColor) ? stripeColor : '#0ea5e9'}
              onChange={e => commitStripe(stripeWidth || 4, e.target.value)}
              style={{
                width: 32, height: 28, padding: 0,
                border: '1px solid var(--sap-border, #e2e8f0)',
                borderRadius: 5, cursor: 'pointer',
                background: 'transparent',
              }}
            />
            <input
              type="range" min={0} max={12} step={1}
              value={stripeWidth}
              onChange={e => commitStripe(parseInt(e.target.value, 10), stripeColor)}
              style={{ flex: 1 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── CardLikeProperties — Review / Testimonial / FAQ / Stat ─────
//
// All four types share the same model: HTML content in el.txt
// edited inline via contenteditable (NOT TipTap), and styled via
// container properties. The Inspector handles ONLY the container
// — content edits happen on the canvas. We make this explicit with
// a small note at the top so members know where to click.
//
// Stat additionally gets a text-alignment row because its default
// is centred but members sometimes want left/right for sidebar use.
function CardLikeProperties({ el, updateElement, updateElementStyle, markDirty }) {
  const [textAlign, setTextAlign] = useState(el.s?.textAlign || 'center');

  // ── Title + body text colour state (added 20 May 2026) ─────
  // Steve reported: 'I feel like there is possibly some kind of
  // layering over the text in some of these elements as the text
  // colour and boldness is not showing clearly'. Root cause: the
  // element's HTML content (el.txt) has inline `color:#XXX` styles
  // baked into the markup — defaults assume a dark page so the text
  // is white / slate-200. Changing the container background to a
  // light colour leaves the text colour unchanged, producing low
  // contrast.
  //
  // Fix: surface explicit title + body colour controls. On commit,
  // we regex-replace the `color:#XXX` declarations inside el.txt
  // surgically. Title is the first colour pattern in document
  // order; body is the second. This holds for every card-like
  // default we ship (FAQ, Review, Testimonial, Stat) and for any
  // inline-edited variants where the member added text but didn't
  // rebuild the colour structure.
  //
  // Stars (Review/Testimonial use #fbbf24 amber stars) are NOT
  // touched by these controls — that colour is intentional accent
  // styling distinct from content text colour, and lives at a
  // different position in the HTML that we deliberately don't
  // match.

  // Per-type default colours — used to seed local state when the
  // element has no explicit _titleColor / _bodyColor yet.
  const DEFAULTS = {
    faq: { title: '#ffffff', body: '#94a3b8' },
    review: { title: '#e2e8f0', body: '#64748b' },
    testimonial: { title: '#e2e8f0', body: '#64748b' },
    stat: { title: '#0ea5e9', body: '#64748b' },
  };

  // Seed colour values from el.txt by parsing existing inline
  // `color:#XXX` declarations. Stars are skipped — they're the
  // first color match in Review/Testimonial defaults, but
  // we want title = quote text (second match) and body = attribution
  // (third match). So we have a per-type "skip stars" rule.
  const parseColors = (el) => {
    const txt = el.txt || '';
    // Capture all color values; skip the amber star colour for
    // Review/Testimonial since it's a fixed accent, not a content
    // colour. (We allow any colour in that slot — the heuristic
    // matches what the defaults emit.)
    const matches = [...txt.matchAll(/color\s*:\s*([^;'"]+)/gi)].map(m => m[1].trim());
    const defaults = DEFAULTS[el.type] || { title: '#0f172a', body: '#475569' };
    if (el.type === 'review' || el.type === 'testimonial') {
      // matches[0] = stars (#fbbf24 by default), matches[1] = quote, matches[2] = attribution
      return {
        title: el._titleColor || matches[1] || defaults.title,
        body: el._bodyColor || matches[2] || defaults.body,
      };
    }
    // FAQ + Stat: matches[0] = title, matches[1] = body
    return {
      title: el._titleColor || matches[0] || defaults.title,
      body: el._bodyColor || matches[1] || defaults.body,
    };
  };

  const initial = parseColors(el);
  const [titleColor, setTitleColor] = useState(initial.title);
  const [bodyColor, setBodyColor] = useState(initial.body);

  useEffect(() => {
    setTextAlign(el.s?.textAlign || 'center');
    const c = parseColors(el);
    setTitleColor(c.title);
    setBodyColor(c.body);
  }, [el.id]);

  const commitAlign = (v) => {
    setTextAlign(v);
    updateElementStyle(el.id, { textAlign: v });
    markDirty();
  };

  // Rewrite the Nth color declaration in el.txt with `newColor`.
  // `nthMatch` is 0-indexed across all `color:` declarations in
  // document order (stars are 0 for review/testimonial, so title
  // is 1 and body is 2 for those; for FAQ/Stat title is 0, body
  // is 1).
  const replaceNthColor = (html, nthMatch, newColor) => {
    let i = 0;
    return html.replace(/(color\s*:\s*)([^;'"]+)/gi, (full, prefix) => {
      const out = (i === nthMatch) ? `${prefix}${newColor}` : full;
      i++;
      return out;
    });
  };

  const commitTitleColor = (v) => {
    setTitleColor(v);
    const isReviewType = el.type === 'review' || el.type === 'testimonial';
    // Skip-stars offset: stars are first color in Review/Testimonial,
    // so title is the second match (index 1). FAQ/Stat have no
    // accent colour, so title is the first match (index 0).
    const nth = isReviewType ? 1 : 0;
    const newTxt = replaceNthColor(el.txt || '', nth, v);
    // Also store on the element so future selections re-seed from
    // the explicit value rather than re-parsing the HTML each time
    // (which would lose the change if the HTML was edited inline
    // and the colour pattern shifted position).
    updateElement(el.id, { txt: newTxt, _titleColor: v });
    markDirty();
  };

  const commitBodyColor = (v) => {
    setBodyColor(v);
    const isReviewType = el.type === 'review' || el.type === 'testimonial';
    const nth = isReviewType ? 2 : 1;
    const newTxt = replaceNthColor(el.txt || '', nth, v);
    updateElement(el.id, { txt: newTxt, _bodyColor: v });
    markDirty();
  };

  // Accent stripe makes sense for review/testimonial (their defaults
  // ship with one — review uses cyan, testimonial uses amber). FAQ
  // and Stat don't, so we hide that control for them.
  const showStripe = el.type === 'review' || el.type === 'testimonial';

  // Type-specific label hints for the colour controls — what 'title'
  // and 'body' actually mean for each element type so members aren't
  // guessing.
  const titleLabel = el.type === 'faq' ? 'Question colour'
    : el.type === 'stat' ? 'Number colour'
    : 'Quote colour';
  const bodyLabel = el.type === 'faq' ? 'Answer colour'
    : el.type === 'stat' ? 'Label colour'
    : 'Attribution colour';

  return (
    <>
      {/* Inline-edit hint — most users won't immediately know that
          double-clicking the element on the canvas activates the
          inline editor. Surface that here so the inspector doesn't
          feel like it's missing the content controls. */}
      <div style={{
        ...sectionStyle,
        background: 'var(--sap-bg-elevated, #f8fafc)',
        border: '1px dashed var(--sap-border, #e2e8f0)',
        borderBottom: 'none',
        padding: '10px 12px',
        borderRadius: 6,
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>
          Content
        </div>
        <div style={{
          fontSize: 11, color: 'var(--sap-text-secondary, #475569)',
          lineHeight: 1.5,
        }}>
          Double-click the element on the canvas to edit text inline.
        </div>
      </div>

      {/* Stat gets a text-alignment selector — useful for putting
          stats in a sidebar or grid where left-alignment looks better. */}
      {el.type === 'stat' && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Text alignment</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { v: 'left', l: 'Left' },
              { v: 'center', l: 'Center' },
              { v: 'right', l: 'Right' },
            ].map(opt => (
              <button
                key={opt.v}
                onClick={() => commitAlign(opt.v)}
                style={{
                  flex: 1, padding: '6px 8px',
                  background: textAlign === opt.v ? 'var(--sap-accent, #0ea5e9)' : 'var(--sap-bg-elevated, #f8fafc)',
                  color: textAlign === opt.v ? '#fff' : 'var(--sap-text-primary, #0f172a)',
                  border: '1px solid ' + (textAlign === opt.v ? 'var(--sap-accent, #0ea5e9)' : 'var(--sap-border, #e2e8f0)'),
                  borderRadius: 5,
                  fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Title colour — first prominent piece of text in the element.
          For FAQ = the question header, for Stat = the big number,
          for Review/Testimonial = the quote. Label adjusts per type. */}
      <div style={sectionStyle}>
        <div style={labelStyle}>{titleLabel}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(titleColor) ? titleColor : '#0f172a'}
            onChange={e => commitTitleColor(e.target.value)}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer',
              background: 'transparent',
            }}
          />
          <input
            type="text"
            value={titleColor}
            onChange={e => commitTitleColor(e.target.value)}
            placeholder="#ffffff"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      {/* Body colour — secondary text. For FAQ = the answer paragraph,
          for Stat = the label below the number, for Review/Testimonial
          = the attribution line. */}
      <div style={sectionStyle}>
        <div style={labelStyle}>{bodyLabel}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(bodyColor) ? bodyColor : '#475569'}
            onChange={e => commitBodyColor(e.target.value)}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer',
              background: 'transparent',
            }}
          />
          <input
            type="text"
            value={bodyColor}
            onChange={e => commitBodyColor(e.target.value)}
            placeholder="#94a3b8"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      {/* Container styling — background, radius, padding, optional stripe */}
      <ContainerSection
        el={el}
        updateElementStyle={updateElementStyle}
        markDirty={markDirty}
        includeAccentStripe={showStripe}
        lastSection={true}
      />
    </>
  );
}

// ── ProgressProperties — Progress bar config ───────────────────
//
// Progress is a structured element: three fields drive everything.
//   _label    — text shown above the bar (e.g. "Progress")
//   _percent  — 0-100 fill percentage
//   _color    — bar fill colour
//
// We also expose track colour (the empty bar background) as
// _trackColor — added Phase 2D to support light-theme pages where
// the historical hardcoded rgba(255,255,255,0.08) was invisible.
// Default preserves old behaviour for pre-2D progress elements.
function ProgressProperties({ el, updateElement, updateElementStyle, markDirty }) {
  const [label, setLabel] = useState(el._label || 'Progress');
  const [percent, setPercent] = useState(parseInt(el._percent, 10) || 75);
  const [color, setColor] = useState(el._color || '#0ea5e9');
  const [trackColor, setTrackColor] = useState(el._trackColor || 'rgba(255,255,255,0.08)');

  useEffect(() => {
    setLabel(el._label || 'Progress');
    setPercent(parseInt(el._percent, 10) || 75);
    setColor(el._color || '#0ea5e9');
    setTrackColor(el._trackColor || 'rgba(255,255,255,0.08)');
  }, [el.id]);

  const commitField = (key, value) => {
    updateElement(el.id, { [key]: value });
    markDirty();
  };

  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Label</div>
        <input
          type="text"
          value={label}
          onChange={e => { setLabel(e.target.value); commitField('_label', e.target.value); }}
          placeholder="Progress"
          style={inputStyle}
        />
      </div>

      <div style={sectionStyle}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>
          <span style={labelStyle}>Percent</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{percent}%</span>
        </div>
        <input
          type="range" min={0} max={100} step={1}
          value={percent}
          onChange={e => {
            const v = parseInt(e.target.value, 10);
            setPercent(v); commitField('_percent', v);
          }}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Bar colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(color) ? color : '#0ea5e9'}
            onChange={e => { setColor(e.target.value); commitField('_color', e.target.value); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer',
              background: 'transparent',
            }}
          />
          <input
            type="text"
            value={color}
            onChange={e => { setColor(e.target.value); commitField('_color', e.target.value); }}
            placeholder="#0ea5e9"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      <div style={sectionStyleLast}>
        <div style={labelStyle}>Track colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(trackColor) ? trackColor : '#e2e8f0'}
            onChange={e => { setTrackColor(e.target.value); commitField('_trackColor', e.target.value); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer',
              background: 'transparent',
            }}
          />
          <input
            type="text"
            value={trackColor}
            onChange={e => { setTrackColor(e.target.value); commitField('_trackColor', e.target.value); }}
            placeholder="rgba(255,255,255,0.08)"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <div style={{
          marginTop: 6,
          fontSize: 10, color: 'var(--sap-text-muted, #94a3b8)',
          lineHeight: 1.4,
        }}>
          Light pages: try a darker track like #e2e8f0
        </div>
      </div>
    </>
  );
}

// ── BadgeProperties — Badge text + typography + container ──────
//
// Badge is structurally a Label with a pill background. Members
// historically had no way to inline-edit it (Badge wasn't in
// EDITABLE_TYPES) so they had to use the legacy modal. Phase 2D
// fixes both: adds Badge to TIPTAP_TYPES so it inline-edits like
// Label, AND gives it its own Inspector panel with typography +
// container controls.
//
// The text input here is a fallback for cases where members
// haven't discovered the inline edit. Edits via the input commit
// straight to el.txt; edits via inline contenteditable do the
// same. Both end up in the same place.
function BadgeProperties({ el, updateElement, updateElementStyle, markDirty }) {
  const [txt, setTxt] = useState(el.txt || '⭐ PREMIUM');
  const [fontFamily, setFontFamily] = useState(el.s?.fontFamily || 'DM Sans,sans-serif');
  const [fontWeight, setFontWeight] = useState(el.s?.fontWeight || '700');
  const fontSizeRaw = el.s?.fontSize || '12px';
  const [fontSizeNum, setFontSizeNum] = useState(parseInt(String(fontSizeRaw).replace(/px$/, ''), 10) || 12);
  const [color, setColor] = useState(el.s?.color || '#fbbf24');

  useEffect(() => {
    setTxt(el.txt || '⭐ PREMIUM');
    setFontFamily(el.s?.fontFamily || 'DM Sans,sans-serif');
    setFontWeight(el.s?.fontWeight || '700');
    const fs = el.s?.fontSize || '12px';
    setFontSizeNum(parseInt(String(fs).replace(/px$/, ''), 10) || 12);
    setColor(el.s?.color || '#fbbf24');
  }, [el.id]);

  const commitStyle = (key, value) => {
    updateElementStyle(el.id, { [key]: value });
    markDirty();
  };
  const commitText = (v) => {
    setTxt(v);
    updateElement(el.id, { txt: v });
    markDirty();
  };

  return (
    <>
      {/* Content — text input. Inline contenteditable also works. */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Text</div>
        <input
          type="text"
          value={txt}
          onChange={e => commitText(e.target.value)}
          placeholder="⭐ PREMIUM"
          style={inputStyle}
        />
        <div style={{
          marginTop: 6,
          fontSize: 10, color: 'var(--sap-text-muted, #94a3b8)',
          lineHeight: 1.4,
        }}>
          Or double-click the badge on the canvas to edit inline.
        </div>
      </div>

      {/* Typography */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Font</div>
        <select
          value={fontFamily}
          onChange={e => { setFontFamily(e.target.value); commitStyle('fontFamily', e.target.value); }}
          style={{ ...inputStyle, cursor: 'pointer' }}>
          {FONTS.map(f => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Size</div>
            <input
              type="number" min={8} max={48} step={1}
              value={fontSizeNum}
              onChange={e => {
                const v = parseInt(e.target.value, 10) || 12;
                setFontSizeNum(v); commitStyle('fontSize', `${v}px`);
              }}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Weight</div>
            <select
              value={fontWeight}
              onChange={e => { setFontWeight(e.target.value); commitStyle('fontWeight', e.target.value); }}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="400">Regular</option>
              <option value="500">Medium</option>
              <option value="600">Semi-bold</option>
              <option value="700">Bold</option>
              <option value="800">Extra-bold</option>
              <option value="900">Black</option>
            </select>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Text colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(color) ? color : '#fbbf24'}
            onChange={e => { setColor(e.target.value); commitStyle('color', e.target.value); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer',
              background: 'transparent',
            }}
          />
          <input
            type="text"
            value={color}
            onChange={e => { setColor(e.target.value); commitStyle('color', e.target.value); }}
            placeholder="#fbbf24"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      {/* Container styling — badges are pill-shaped containers
          so members may want to change the bg + radius regularly */}
      <ContainerSection
        el={el}
        updateElementStyle={updateElementStyle}
        markDirty={markDirty}
        includeAccentStripe={false}
        lastSection={true}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Phase 2E — Final 11 types: structural + utility + structured config
// ═══════════════════════════════════════════════════════════════
//
// Completes the Inspector port (20 May 2026, 26 of 26 types covered).
// Three sub-groups by Inspector shape:
//
//   1. HTML-content with text colours (IconText, Separator, Logostrip)
//      → Inline-edit hint + title/body colour pickers
//        (same surgical-regex-replace pattern as CardLikeProperties)
//
//   2. Layout primitives (Spacer, Box, Divider)
//      → ContainerSection (already built) for Box; per-type micro
//        controls for Spacer (size hint only) and Divider (bg + height)
//
//   3. Structured config (Countdown, Socials, Embed)
//      → Dedicated mini-components per type
//        Countdown: datetime-local input
//        Socials: 6 platform URL inputs + icon colour
//        Embed: textarea for raw HTML

// ── HtmlTextProperties — IconText, Separator, Logostrip ────────
//
// All three are HTML-in-el.txt edited inline. The Inspector handles
// just the colour story: title (the prominent text) and body (the
// supporting text). Uses the same regex-replace mechanism as
// CardLikeProperties but with per-type position mapping.
//
// Defaults table:
//   icontext     0 = emoji not styled, 1 = heading colour, 2 = body colour
//                Actually the emoji has no color attribute, so:
//                positions = [heading, body] (matches 0, 1)
//   separator    0 = divider line bg (kept), 1 = star colour, 2 = line bg
//                Tricky — separator HTML has 'background:rgba()' for
//                the lines, not 'color:'. So matches[] only catches
//                'color:#XXX' on the star span. We expose just one
//                control (centre symbol colour) and let line colour
//                be a separate field if needed later.
//   logostrip    'As seen in:' label and 4 brand labels — multiple
//                colour spans. We expose title (label) + body (brands).
//
// Each control rewrites the Nth color in el.txt.
function HtmlTextProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // Per-type position maps + default fallbacks. Position numbers are
  // indexes into [...el.txt.matchAll(/color:.../)].
  const TYPE_CONFIG = {
    icontext: {
      title: { pos: 0, def: '#ffffff', label: 'Heading colour' },
      body:  { pos: 1, def: '#94a3b8', label: 'Description colour' },
    },
    separator: {
      // Separator only has one color decl (the star span). Use the
      // same field for the title; we hide the body picker for this type.
      title: { pos: 0, def: '#64748b', label: 'Centre symbol colour' },
      body:  null,
    },
    logostrip: {
      title: { pos: 0, def: '#475569', label: '"As seen in" colour' },
      body:  { pos: 1, def: '#64748b', label: 'Brand label colour' },
    },
  };
  const cfg = TYPE_CONFIG[el.type] || TYPE_CONFIG.icontext;

  // Parse colours from current el.txt for initial display
  const parseColors = (el) => {
    const matches = [...(el.txt || '').matchAll(/color\s*:\s*([^;'"]+)/gi)].map(m => m[1].trim());
    return {
      title: el._titleColor || matches[cfg.title.pos] || cfg.title.def,
      body: cfg.body ? (el._bodyColor || matches[cfg.body.pos] || cfg.body.def) : null,
    };
  };

  const initial = parseColors(el);
  const [titleColor, setTitleColor] = useState(initial.title);
  const [bodyColor, setBodyColor] = useState(initial.body);

  useEffect(() => {
    const c = parseColors(el);
    setTitleColor(c.title);
    setBodyColor(c.body);
  }, [el.id]);

  // Same regex-replace utility as CardLikeProperties.
  const replaceNthColor = (html, nthMatch, newColor) => {
    let i = 0;
    return html.replace(/(color\s*:\s*)([^;'"]+)/gi, (full, prefix) => {
      const out = (i === nthMatch) ? `${prefix}${newColor}` : full;
      i++;
      return out;
    });
  };

  const commitTitle = (v) => {
    setTitleColor(v);
    const newTxt = replaceNthColor(el.txt || '', cfg.title.pos, v);
    updateElement(el.id, { txt: newTxt, _titleColor: v });
    markDirty();
  };
  const commitBody = (v) => {
    if (!cfg.body) return;
    setBodyColor(v);
    const newTxt = replaceNthColor(el.txt || '', cfg.body.pos, v);
    updateElement(el.id, { txt: newTxt, _bodyColor: v });
    markDirty();
  };

  return (
    <>
      {/* Inline-edit hint */}
      <div style={{
        ...sectionStyle,
        background: 'var(--sap-bg-elevated, #f8fafc)',
        border: '1px dashed var(--sap-border, #e2e8f0)',
        borderBottom: 'none',
        padding: '10px 12px',
        borderRadius: 6,
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>Content</div>
        <div style={{
          fontSize: 11, color: 'var(--sap-text-secondary, #475569)',
          lineHeight: 1.5,
        }}>
          Double-click the element on the canvas to edit text inline.
        </div>
      </div>

      {/* Title colour */}
      <div style={cfg.body ? sectionStyle : sectionStyleLast}>
        <div style={labelStyle}>{cfg.title.label}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(titleColor) ? titleColor : '#0f172a'}
            onChange={e => commitTitle(e.target.value)}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={titleColor}
            onChange={e => commitTitle(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      {/* Body colour — hidden for Separator (only one color slot) */}
      {cfg.body && (
        <div style={sectionStyleLast}>
          <div style={labelStyle}>{cfg.body.label}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="color"
              value={(/^#[0-9a-f]{6}$/i).test(bodyColor) ? bodyColor : '#475569'}
              onChange={e => commitBody(e.target.value)}
              style={{
                width: 32, height: 28, padding: 0,
                border: '1px solid var(--sap-border, #e2e8f0)',
                borderRadius: 5, cursor: 'pointer', background: 'transparent',
              }}
            />
            <input
              type="text"
              value={bodyColor}
              onChange={e => commitBody(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ── BoxProperties — Box layout primitive ───────────────────────
//
// Empty container element used as a visual frame around other
// elements. Pure container styling — ContainerSection handles
// background, padding, radius. Box also has a border by default
// so we expose border colour as an extra control.
function BoxProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // Parse border colour from `s.border` if it's in the form
  // '1px solid #XXX'. Hidden if border is unset or non-trivial.
  const borderRaw = el.s?.border || '';
  const borderMatch = borderRaw.match(/^(\d+)px\s+solid\s+(.+)$/);
  const [borderWidth, setBorderWidth] = useState(borderMatch ? parseInt(borderMatch[1], 10) : 1);
  const [borderColor, setBorderColor] = useState(borderMatch ? borderMatch[2] : 'rgba(255,255,255,0.08)');

  useEffect(() => {
    const m = (el.s?.border || '').match(/^(\d+)px\s+solid\s+(.+)$/);
    setBorderWidth(m ? parseInt(m[1], 10) : 1);
    setBorderColor(m ? m[2] : 'rgba(255,255,255,0.08)');
  }, [el.id]);

  const commitBorder = (w, c) => {
    setBorderWidth(w);
    setBorderColor(c);
    const value = w > 0 ? `${w}px solid ${c}` : '';
    updateElementStyle(el.id, { border: value });
    markDirty();
  };

  return (
    <>
      {/* Container styling — bg, padding, radius. No accent stripe. */}
      <ContainerSection
        el={el}
        updateElementStyle={updateElementStyle}
        markDirty={markDirty}
        includeAccentStripe={false}
        lastSection={false}
      />

      {/* Border — Box defaults to a subtle 1px line; expose width + colour */}
      <div style={sectionStyleLast}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>
          <span style={labelStyle}>Border</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{borderWidth}px</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(borderColor) ? borderColor : '#e2e8f0'}
            onChange={e => commitBorder(borderWidth || 1, e.target.value)}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="range" min={0} max={6} step={1}
            value={borderWidth}
            onChange={e => commitBorder(parseInt(e.target.value, 10), borderColor)}
            style={{ flex: 1 }}
          />
        </div>
      </div>
    </>
  );
}

// ── DividerProperties — Thin horizontal rule ───────────────────
//
// A 2px-tall coloured bar. Members customise colour + thickness.
// Uses el.s.background (the bar fill) and el.h (thickness; resized
// directly via the canvas handle but also surfaceable here as a
// micro slider for precision).
function DividerProperties({ el, updateElement, updateElementStyle, markDirty }) {
  const [color, setColor] = useState(el.s?.background || '#334155');
  const [thickness, setThickness] = useState(el.h || 2);

  useEffect(() => {
    setColor(el.s?.background || '#334155');
    setThickness(el.h || 2);
  }, [el.id]);

  const commitColor = (v) => {
    setColor(v);
    updateElementStyle(el.id, { background: v });
    markDirty();
  };
  const commitThickness = (n) => {
    setThickness(n);
    // height is stored on el.h (not el.s.height) because resize
    // handles write to el.h directly. We mirror that here so the
    // canvas handle and the inspector slider stay consistent.
    updateElement(el.id, { h: n });
    markDirty();
  };

  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(color) ? color : '#334155'}
            onChange={e => commitColor(e.target.value)}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={color}
            onChange={e => commitColor(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>
      <div style={sectionStyleLast}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>
          <span style={labelStyle}>Thickness</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{thickness}px</span>
        </div>
        <input
          type="range" min={1} max={20} step={1}
          value={thickness}
          onChange={e => commitThickness(parseInt(e.target.value, 10))}
          style={{ width: '100%' }}
        />
      </div>
    </>
  );
}

// ── SpacerProperties — Layout spacer ───────────────────────────
//
// A transparent block used only to push other elements apart.
// No visible styling — only height matters. The canvas resize
// handles already cover this so the Inspector just shows a
// gentle hint message + a numeric height field for precision.
function SpacerProperties({ el, updateElement, markDirty }) {
  const [height, setHeight] = useState(el.h || 40);
  useEffect(() => { setHeight(el.h || 40); }, [el.id]);
  const commitHeight = (n) => {
    setHeight(n);
    updateElement(el.id, { h: n });
    markDirty();
  };

  return (
    <>
      <div style={{
        ...sectionStyle,
        background: 'var(--sap-bg-elevated, #f8fafc)',
        border: '1px dashed var(--sap-border, #e2e8f0)',
        borderBottom: 'none',
        padding: '10px 12px',
        borderRadius: 6,
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>About</div>
        <div style={{
          fontSize: 11, color: 'var(--sap-text-secondary, #475569)',
          lineHeight: 1.5,
        }}>
          Spacers are invisible — they push other elements apart vertically. Drag the bottom handle on the canvas to resize, or use the slider below for precision.
        </div>
      </div>

      <div style={sectionStyleLast}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>
          <span style={labelStyle}>Height</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{height}px</span>
        </div>
        <input
          type="range" min={8} max={200} step={4}
          value={height}
          onChange={e => commitHeight(parseInt(e.target.value, 10))}
          style={{ width: '100%' }}
        />
      </div>
    </>
  );
}

// ── CountdownProperties — Target datetime ──────────────────────
//
// Countdown is driven by _targetDate (an ISO string parsed by the
// page-render script that updates the visible HH:MM:SS digits).
// Inspector exposes the datetime picker plus a brief explanation
// of how the countdown behaves at zero.
function CountdownProperties({ el, updateElement, markDirty }) {
  const [date, setDate] = useState(el._targetDate || '');
  useEffect(() => { setDate(el._targetDate || ''); }, [el.id]);
  const commit = (v) => {
    setDate(v);
    updateElement(el.id, { _targetDate: v });
    markDirty();
  };

  // Format a friendly representation of how long until the target.
  // Used as a status line beneath the picker so members can sanity-
  // check what they entered.
  const friendly = (() => {
    if (!date) return null;
    try {
      const target = new Date(date).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff < 0) return { txt: 'Target is in the past — countdown will show all zeroes.', tone: 'warn' };
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      return { txt: `Counts down ${days}d ${hours}h from now.`, tone: 'ok' };
    } catch {
      return null;
    }
  })();

  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Target date &amp; time</div>
        <input
          type="datetime-local"
          value={date}
          onChange={e => commit(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        />
        {friendly && (
          <div style={{
            marginTop: 8,
            fontSize: 11, lineHeight: 1.5,
            color: friendly.tone === 'warn' ? 'var(--sap-amber-dark, #92400e)' : 'var(--sap-text-muted, #64748b)',
            background: friendly.tone === 'warn' ? 'rgba(245,158,11,0.08)' : 'transparent',
            padding: friendly.tone === 'warn' ? '6px 8px' : 0,
            borderRadius: 5,
          }}>
            {friendly.txt}
          </div>
        )}
      </div>

      <div style={sectionStyleLast}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>Behaviour</div>
        <div style={{
          fontSize: 11, color: 'var(--sap-text-secondary, #475569)',
          lineHeight: 1.5,
        }}>
          The countdown ticks live on the published page. When the target time passes the digits stay at zero — there's no auto-redirect or other action. Use a Banner or Form to handle what happens after expiry.
        </div>
      </div>
    </>
  );
}

// ── SocialsProperties — Six platform URL inputs ────────────────
//
// Socials renders a row of platform icons; each one becomes a link
// when its URL is set, otherwise renders as a non-clickable
// placeholder. _links is a flat object: { youtube, instagram,
// tiktok, facebook, x, linkedin }.
//
// We also expose icon colour — the default '#94a3b8' (slate-400)
// blends into dark backgrounds but is hard to see on light pages.
// Stored at el._iconColor; exportHTML + canvas render both read it.
function SocialsProperties({ el, updateElement, updateElementStyle, markDirty }) {
  const PLATFORMS = [
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@…' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
    { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@…' },
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…' },
    { key: 'x', label: 'X / Twitter', placeholder: 'https://x.com/…' },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/…' },
  ];

  // Normalise: legacy '#' values (from older versions) treated as empty.
  const normalise = (raw) => {
    const out = {};
    PLATFORMS.forEach(p => {
      const v = raw?.[p.key];
      out[p.key] = (v && v !== '#') ? v : '';
    });
    return out;
  };

  const [links, setLinks] = useState(normalise(el._links));
  const [iconColor, setIconColor] = useState(el._iconColor || '#94a3b8');

  useEffect(() => {
    setLinks(normalise(el._links));
    setIconColor(el._iconColor || '#94a3b8');
  }, [el.id]);

  const commitLink = (key, value) => {
    const next = { ...links, [key]: value };
    setLinks(next);
    updateElement(el.id, { _links: next });
    markDirty();
  };

  const commitIconColor = (v) => {
    setIconColor(v);
    updateElement(el.id, { _iconColor: v });
    markDirty();
  };

  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Platform URLs</div>
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #94a3b8)', marginBottom: 8, lineHeight: 1.4 }}>
          Platforms with a URL become clickable on the published page. Empty ones render as non-clickable placeholders so the row stays evenly spaced.
        </div>
        {PLATFORMS.map(p => (
          <div key={p.key} style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: 'var(--sap-text-secondary, #475569)',
              marginBottom: 3,
            }}>
              {p.label}
            </div>
            <input
              type="text"
              value={links[p.key] || ''}
              onChange={e => commitLink(p.key, e.target.value)}
              placeholder={p.placeholder}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      <div style={sectionStyleLast}>
        <div style={labelStyle}>Icon colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(iconColor) ? iconColor : '#94a3b8'}
            onChange={e => commitIconColor(e.target.value)}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={iconColor}
            onChange={e => commitIconColor(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <div style={{
          marginTop: 6,
          fontSize: 10, color: 'var(--sap-text-muted, #94a3b8)',
          lineHeight: 1.4,
        }}>
          Light pages: try #475569 or your brand colour
        </div>
      </div>
    </>
  );
}

// ── EmbedProperties — Raw HTML embed code ──────────────────────
//
// Members paste an <iframe>, <script>, or any third-party widget
// HTML here. The editor doesn't validate the content — it's
// trusted as-is and rendered via dangerouslySetInnerHTML on the
// canvas (and as raw output via exportHTML).
//
// Security note: raw HTML embeds are a member-trust feature.
// Members can only embed code on their OWN pages, and pages are
// served from /p/{username}/{slug}. There's no cross-member XSS
// risk because they can't inject into someone else's page. But
// the visitor experience can break if the embed is malformed —
// hence the help text below the textarea.
function EmbedProperties({ el, updateElement, markDirty }) {
  const [code, setCode] = useState(el._embedCode || '');
  useEffect(() => { setCode(el._embedCode || ''); }, [el.id]);
  const commit = (v) => {
    setCode(v);
    updateElement(el.id, { _embedCode: v });
    markDirty();
  };

  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Embed code</div>
        <textarea
          value={code}
          onChange={e => commit(e.target.value)}
          rows={8}
          placeholder='<iframe src="..."></iframe>'
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid var(--sap-border, #e2e8f0)',
            borderRadius: 6,
            fontSize: 11,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            background: 'var(--sap-bg-elevated, #f8fafc)',
            color: 'var(--sap-text-primary, #0f172a)',
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      </div>

      <div style={sectionStyleLast}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>Tips</div>
        <div style={{
          fontSize: 11, color: 'var(--sap-text-secondary, #475569)',
          lineHeight: 1.5,
        }}>
          Most embeds need <code style={{ background: 'var(--sap-bg-elevated)', padding: '0 4px', borderRadius: 3 }}>{'<iframe>'}</code>. Use the element's resize handles on the canvas to fit the embed inside. Calendly, YouTube playlists, custom widgets, etc. all work here.
        </div>
      </div>
    </>
  );
}

// ── Banner-specific property section ───────────────────────────
//
// Announcement banner — close cousin of Button (same canvas render
// path, same export path, same Tiptap-less text content), but with
// two banner-specific behaviours:
//   - dismissible: shows an [x] in the corner of the live banner;
//     clicking it hides the banner via localStorage so it doesn't
//     pester repeat visitors
//   - sticky: pins the banner to the top of the viewport on scroll,
//     useful for promo/announcement scenarios
//
// Both default to false so existing banners don't change behaviour.
//
// Banner default width is 1100px (full canvas width) at h=44px, so
// it doesn't need size/typography defaults that fit a button shape.
// Default font is DM Sans 14px 700; we keep those as starting values.
//
// Phase 2B port, 20 May 2026.
function BannerProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // Local state mirrors el props for snappy feel
  const [txt, setTxt] = useState(el.txt || '🔥 LIMITED TIME OFFER — Join Now and Save 50%!');
  const [url, setUrl] = useState(el.url || '');
  const [bgColor, setBgColor] = useState(el.s?.background || 'linear-gradient(135deg,#ef4444,#f59e0b)');
  const [txtColor, setTxtColor] = useState(el.s?.color || '#fff');
  const [fontFamily, setFontFamily] = useState(el.s?.fontFamily || 'DM Sans,sans-serif');
  const [fontWeight, setFontWeight] = useState(el.s?.fontWeight || '700');
  const fontSizeRaw = el.s?.fontSize || '14px';
  const [fontSizeNum, setFontSizeNum] = useState(parseInt(String(fontSizeRaw).replace(/px$/, ''), 10) || 14);
  const [dismissible, setDismissible] = useState(!!el.dismissible);
  const [sticky, setSticky] = useState(!!el.sticky);

  // Resync when selection changes
  useEffect(() => {
    setTxt(el.txt || '🔥 LIMITED TIME OFFER — Join Now and Save 50%!');
    setUrl(el.url || '');
    setBgColor(el.s?.background || 'linear-gradient(135deg,#ef4444,#f59e0b)');
    setTxtColor(el.s?.color || '#fff');
    setFontFamily(el.s?.fontFamily || 'DM Sans,sans-serif');
    setFontWeight(el.s?.fontWeight || '700');
    const fs = el.s?.fontSize || '14px';
    setFontSizeNum(parseInt(String(fs).replace(/px$/, ''), 10) || 14);
    setDismissible(!!el.dismissible);
    setSticky(!!el.sticky);
  }, [el.id]);

  // ── Live-edit helpers ────────────────────────────────────────
  const commitTxt = (v) => {
    setTxt(v);
    updateElement(el.id, { txt: v });
    markDirty();
  };
  const commitUrl = (v) => {
    setUrl(v);
    updateElement(el.id, { url: v });
    markDirty();
  };
  // Style commits via updateElementStyle to avoid the stale-closure
  // merge bug Steve caught on Phase 1 (commit d3950ed).
  const commitStyle = (key, value) => {
    updateElementStyle(el.id, { [key]: value });
    markDirty();
  };
  const commitBg = (v) => { setBgColor(v); commitStyle('background', v); };
  const commitFg = (v) => { setTxtColor(v); commitStyle('color', v); };
  const commitFontFamily = (v) => { setFontFamily(v); commitStyle('fontFamily', v); };
  const commitFontWeight = (v) => { setFontWeight(v); commitStyle('fontWeight', v); };
  const commitFontSize = (numPx) => {
    setFontSizeNum(numPx);
    commitStyle('fontSize', numPx + 'px');
  };
  // Banner-specific top-level props — these aren't style, they're
  // behavioural flags that the exporter reads when generating the
  // published-page markup.
  const commitDismissible = (v) => {
    setDismissible(v);
    updateElement(el.id, { dismissible: v });
    markDirty();
  };
  const commitSticky = (v) => {
    setSticky(v);
    updateElement(el.id, { sticky: v });
    markDirty();
  };

  // Banner colour presets — leans toward eye-catching attention
  // colours (red, amber, magenta gradients) since banners are usually
  // promo/alert UI rather than primary CTAs.
  const COLOUR_PRESETS = [
    { bg: 'linear-gradient(135deg,#ef4444,#f59e0b)', label: 'Red→Amber (default)' },
    { bg: 'linear-gradient(135deg,#0ea5e9,#6366f1)', label: 'Cyan→Indigo' },
    { bg: 'linear-gradient(135deg,#10b981,#0ea5e9)', label: 'Green→Cyan' },
    { bg: 'linear-gradient(135deg,#8b5cf6,#ec4899)', label: 'Purple→Pink' },
    { bg: 'var(--sap-red-bright, #ef4444)', label: 'Solid Red' },
    { bg: 'var(--sap-amber, #f59e0b)', label: 'Solid Amber' },
    { bg: 'var(--sap-indigo, #6366f1)', label: 'Solid Indigo' },
    { bg: '#0f172a', label: 'Solid Slate' },
  ];

  const TEXT_COLOURS = ['#ffffff', '#000000', '#fbbf24', '#0ea5e9'];

  return (
    <>
      {/* Content */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Banner Text</label>
        <input
          type="text"
          value={txt}
          onChange={e => commitTxt(e.target.value)}
          placeholder="🔥 Special offer text"
          style={{ ...inputStyle, marginBottom: 6 }}
        />
        <input
          type="text"
          value={url}
          onChange={e => commitUrl(e.target.value)}
          placeholder="https://… (optional — banner becomes clickable)"
          style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11, color: url ? 'var(--sap-accent, #0284c7)' : 'var(--sap-text-muted, #64748b)' }}
        />
      </div>

      {/* Behaviour — the two banner-specific toggles */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Behaviour</label>
        <ToggleRow
          label="Dismissible"
          hint="Show an × button. Once dismissed, won't appear again for the visitor."
          value={dismissible}
          onChange={commitDismissible}
        />
        <ToggleRow
          label="Sticky to top"
          hint="Pin the banner to the top of the page as the visitor scrolls."
          value={sticky}
          onChange={commitSticky}
        />
      </div>

      {/* Typography */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Typography</label>
        <select
          value={fontFamily}
          onChange={e => commitFontFamily(e.target.value)}
          style={{ ...inputStyle, marginBottom: 8, fontFamily }}
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 800,
            color: 'var(--sap-text-muted, #64748b)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            minWidth: 26,
          }}>Size</span>
          <input
            type="range"
            min="10" max="48" step="1"
            value={fontSizeNum}
            onChange={e => commitFontSize(parseInt(e.target.value, 10))}
            style={{ flex: 1, accentColor: 'var(--sap-accent, #0ea5e9)', cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            color: 'var(--sap-text-primary, #0f172a)',
            minWidth: 38, textAlign: 'right',
            background: 'var(--sap-bg-elevated, #f1f5f9)',
            padding: '3px 6px', borderRadius: 4,
          }}>{fontSizeNum}px</span>
        </div>

        <select
          value={fontWeight}
          onChange={e => commitFontWeight(e.target.value)}
          style={inputStyle}
        >
          <option value="400">Regular</option>
          <option value="500">Medium</option>
          <option value="600">Semibold</option>
          <option value="700">Bold</option>
          <option value="800">Extra Bold</option>
          <option value="900">Black</option>
        </select>
      </div>

      {/* Background */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Background</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
          {COLOUR_PRESETS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => commitBg(p.bg)}
              title={p.label}
              aria-label={p.label}
              style={{
                aspectRatio: '1',
                borderRadius: 5,
                background: p.bg,
                cursor: 'pointer',
                border: bgColor === p.bg ? '2px solid var(--sap-text-primary, #0f172a)' : '1px solid var(--sap-border, #e2e8f0)',
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Text colour */}
      <div style={sectionStyleLast}>
        <label style={labelStyle}>Text colour</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {TEXT_COLOURS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => commitFg(c)}
              aria-label={`Text colour ${c}`}
              style={{
                width: 24, height: 24,
                borderRadius: 5,
                background: c,
                cursor: 'pointer',
                border: txtColor === c ? '2px solid var(--sap-accent, #0ea5e9)' : '1px solid var(--sap-border, #e2e8f0)',
                padding: 0,
              }}
            />
          ))}
          <label style={{
            width: 24, height: 24, borderRadius: 5,
            background: txtColor,
            border: '1px dashed var(--sap-border, #e2e8f0)',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }} title="Custom colour">
            <input type="color" value={txtColor.startsWith('#') ? txtColor : '#ffffff'}
              onChange={e => commitFg(e.target.value)}
              style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', padding: 0, cursor: 'pointer' }}
            />
          </label>
        </div>
      </div>
    </>
  );
}

// ── Toggle row helper ──────────────────────────────────────────
//
// Reusable on/off control with a label and an explanatory hint.
// Phase 2B introduces toggles for banner dismissible/sticky; this
// abstracts the pattern for future use (form-field "required", form
// "GDPR opt-in", etc.).
// ── MediaProperties — Image / Video / Audio shared component ────
//
// Phase 2C of the Inspector port (20 May 2026, Steve & Claude).
// Single component handling all three media types — they share enough
// (source URL OR file upload + preview) that a branched component is
// clearer than three near-duplicate ones.
//
// Storage shape recap:
//   image: el.txt = src URL,         el.s.borderRadius = corner roundness
//                                    el._imageAlt = accessibility text (new)
//                                    el._imageFit = object-fit value (new, default 'cover')
//   video: el.txt = src URL (MP4 OR youtube/vimeo URL)
//          el._isMP4 = flag (set when uploaded), else auto-detected by extension
//          For MP4: el._videoAutoplay / _videoLoop / _videoMuted / _videoControls (new)
//          For iframe: no extra controls — YT/Vimeo params auto-applied at export
//   audio: el._audioUrl = src URL (note: NOT el.txt — historical quirk)
//          el.s.borderRadius = corner roundness
//
// Source detection for video:
//   - URL contains 'youtube' or 'vimeo' → iframe mode (no MP4 controls)
//   - URL ends in .mp4 / .webm / .ogg, or _isMP4 flag is set → MP4 mode
//   - Empty URL → both panels offered, fields disabled until source picked
function MediaProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // ── Source URL state ─────────────────────────────────────────
  // For image + video the source lives on el.txt. For audio it lives
  // on el._audioUrl (legacy quirk, retained for backward compatibility
  // with already-published audio elements). We unify here so the rest
  // of the component reads one variable, then write back to the
  // correct field on commit.
  const srcKey = el.type === 'audio' ? '_audioUrl' : 'txt';
  const initialSrc = el.type === 'audio' ? (el._audioUrl || '') : (el.txt || '');
  const [src, setSrc] = useState(initialSrc);

  // Image-specific state
  const [imageAlt, setImageAlt] = useState(el._imageAlt || '');
  const [imageFit, setImageFit] = useState(el._imageFit || 'cover');
  const [imageRadius, setImageRadius] = useState(
    parseInt((el.s?.borderRadius || '12px'), 10) || 12
  );

  // Video-specific state. _isMP4 is the explicit flag set on file
  // upload; we also auto-detect from URL extension below. The four
  // playback toggles default to the historical hardcoded behaviour
  // (autoplay muted loop, no controls) so existing pages render
  // identically until the member touches a control.
  const [videoAutoplay, setVideoAutoplay] = useState(el._videoAutoplay !== false);
  const [videoLoop, setVideoLoop] = useState(el._videoLoop !== false);
  const [videoMuted, setVideoMuted] = useState(el._videoMuted !== false);
  const [videoControls, setVideoControls] = useState(!!el._videoControls);

  // Audio uses the same radius mechanism as image since the UA's
  // built-in audio player has a visible pill background we may want
  // to round.
  const [audioRadius, setAudioRadius] = useState(
    parseInt((el.s?.borderRadius || '12px'), 10) || 12
  );

  // Upload UI state — shared. We don't track per-type since only one
  // upload can be in-flight on the selected element at a time.
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Resync on selection change. Same pattern as the other Properties
  // components — when the user clicks a different element of the same
  // type, refresh local state from the new el.
  useEffect(() => {
    setSrc(el.type === 'audio' ? (el._audioUrl || '') : (el.txt || ''));
    setImageAlt(el._imageAlt || '');
    setImageFit(el._imageFit || 'cover');
    setImageRadius(parseInt((el.s?.borderRadius || '12px'), 10) || 12);
    setVideoAutoplay(el._videoAutoplay !== false);
    setVideoLoop(el._videoLoop !== false);
    setVideoMuted(el._videoMuted !== false);
    setVideoControls(!!el._videoControls);
    setAudioRadius(parseInt((el.s?.borderRadius || '12px'), 10) || 12);
    setUploadError('');
  }, [el.id]);

  // ── Source detection (video only) ────────────────────────────
  // Returns 'iframe' (YouTube / Vimeo embed), 'mp4' (HTML5 video),
  // or 'empty' (no source yet).
  const videoMode = (() => {
    if (!src) return 'empty';
    if (/youtube\.com|youtu\.be|vimeo\.com/i.test(src)) return 'iframe';
    if (el._isMP4 || /\.(mp4|webm|ogg)(\?|$)/i.test(src) || src.includes('funnel-videos')) return 'mp4';
    return 'iframe'; // default to iframe for unknown URLs (YouTube paste in progress, etc.)
  })();

  // ── Helpers ──────────────────────────────────────────────────
  // commitSource writes the source URL through to el.txt (or
  // _audioUrl). For video pasted as YouTube/Vimeo watch URL we
  // convert to the embed URL inline — same auto-convert behaviour
  // the legacy modal had, so members can paste any YouTube link.
  const commitSource = (newSrc) => {
    let v = newSrc;
    if (el.type === 'video' && v) {
      const yt = v.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (yt) v = `https://www.youtube.com/embed/${yt[1]}`;
      const vm = v.match(/vimeo\.com\/(\d+)/);
      if (vm && !v.includes('player.vimeo.com')) v = `https://player.vimeo.com/video/${vm[1]}`;
    }
    setSrc(v);
    updateElement(el.id, { [srcKey]: v });
    markDirty();
  };

  // upload handles the file-input → /api/funnels/upload-* roundtrip.
  // Endpoints match what the legacy modal used. On success we write
  // the returned URL into the source and (for video) flag _isMP4 so
  // the canvas renderer + export both pick the HTML5 path.
  const upload = async (file, kind) => {
    if (!file) return;
    setUploadError('');
    // Type validation — bounce wrong file types early with a
    // human-readable message rather than letting the server reject.
    const typeOk = (
      (kind === 'image' && file.type.startsWith('image/')) ||
      (kind === 'video' && file.type.startsWith('video/')) ||
      (kind === 'audio' && (file.type.startsWith('audio/') || file.type === 'audio/mpeg'))
    );
    if (!typeOk) {
      setUploadError(`Wrong file type — expected ${kind}.`);
      return;
    }
    // Size caps mirror the legacy modal: 10MB images, 100MB videos.
    // Audio kept at 25MB — enough for a few minutes of MP3 (handy
    // for podcast clips / welcome messages) without being abusable.
    const cap = kind === 'image' ? 10 : kind === 'video' ? 100 : 25;
    if (file.size > cap * 1024 * 1024) {
      setUploadError(`Too big (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${cap}MB.`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`/api/funnels/upload-${kind}`, {
        method: 'POST', body: fd, credentials: 'include',
      });
      if (!r.ok) {
        setUploadError(`Upload failed (${r.status}).`);
        return;
      }
      const d = await r.json();
      if (!d.url) {
        setUploadError(d.error || 'Server returned no URL.');
        return;
      }
      // Write URL + (video only) the _isMP4 marker so the renderer
      // picks the right branch even if the URL doesn't have a video
      // extension (CDN paths often don't).
      //
      // Also set _videoControls: true for new MP4 uploads (20 May 2026,
      // Steve flagged: 'the video plays but there is nowhere I can see
      // to unmute the video once it's been published'). Without the
      // native controls bar the visitor has no play/pause/volume UI at
      // all — autoplay+muted+loop is fine for backgroundy hero videos
      // but useless for content videos where the visitor needs to start
      // playback or unmute audio.
      //
      // We only flip this on UPLOAD, not on every video selection, so
      // existing pre-2C pages that deliberately omit controls (silent
      // background loops) keep their original look on re-save. New
      // uploads get controls by default, and the toggle is still there
      // to turn them off if the member wants the silent-loop pattern.
      const patch = { [srcKey]: d.url };
      if (kind === 'video') {
        patch._isMP4 = true;
        patch._videoControls = true;
      }
      updateElement(el.id, patch);
      setSrc(d.url);
      // Mirror the controls default into local state so the toggle UI
      // reflects the change immediately rather than after the next
      // selection-resync useEffect fires.
      if (kind === 'video') setVideoControls(true);
      markDirty();
    } catch (err) {
      setUploadError('Network error.');
    } finally {
      setUploading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* Source section — URL + upload, common to all three types */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Source</div>

        {/* URL input. The placeholder hints at what works for this type. */}
        <input
          type="text"
          value={src}
          onChange={e => commitSource(e.target.value)}
          placeholder={
            el.type === 'image' ? 'https://… or upload below'
            : el.type === 'video' ? 'YouTube / Vimeo URL, or upload MP4'
            : 'https://…/audio.mp3 or upload below'
          }
          style={inputStyle}
        />

        {/* Upload row. We use a visible labeled button (rather than the
            default file-input chrome which is OS-dependent and ugly) by
            hiding the actual <input> off-screen and triggering it via
            the label's `for=` reference. */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label
            htmlFor={`media-upload-${el.id}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px',
              background: uploading ? 'var(--sap-bg-elevated, #f8fafc)' : 'var(--sap-accent, #0ea5e9)',
              color: uploading ? 'var(--sap-text-muted, #94a3b8)' : '#fff',
              border: 'none', borderRadius: 6,
              fontSize: 11, fontWeight: 700,
              cursor: uploading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}>
            {uploading ? 'Uploading…' : '↑ Upload'}
          </label>
          <input
            id={`media-upload-${el.id}`}
            type="file"
            accept={
              el.type === 'image' ? 'image/*'
              : el.type === 'video' ? 'video/mp4,video/webm,video/ogg'
              : 'audio/mpeg,audio/wav,audio/ogg,audio/mp3'
            }
            disabled={uploading}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) upload(f, el.type);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
          {/* Hint about size limits — sits next to the button so members
              know the cap before they try a 500MB file. */}
          <span style={{ fontSize: 10, color: 'var(--sap-text-muted, #94a3b8)' }}>
            Max {el.type === 'image' ? '10MB' : el.type === 'video' ? '100MB' : '25MB'}
          </span>
        </div>

        {/* Upload error — only shown when something went wrong. Cleared
            on next selection change. */}
        {uploadError && (
          <div style={{
            marginTop: 8,
            fontSize: 11,
            color: 'var(--sap-red, #ef4444)',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 6,
            padding: '6px 10px',
          }}>
            {uploadError}
          </div>
        )}

        {/* Live preview — type-specific. Shows the current source as it
            will appear after publish. For empty source we show a hint
            tile so the inspector doesn't look broken. */}
        {src ? (
          <div style={{ marginTop: 10 }}>
            {el.type === 'image' && (
              <img src={src} alt={imageAlt} style={{
                maxWidth: '100%', maxHeight: 120,
                borderRadius: `${imageRadius}px`,
                display: 'block', margin: '0 auto',
                objectFit: imageFit,
              }} />
            )}
            {el.type === 'video' && videoMode === 'iframe' && (
              <div style={{
                fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
                background: 'var(--sap-bg-elevated, #f8fafc)',
                border: '1px solid var(--sap-border-faint, #e2e8f0)',
                borderRadius: 6, padding: '8px 10px',
                wordBreak: 'break-all',
              }}>
                <strong>Embed:</strong> {src}
              </div>
            )}
            {el.type === 'video' && videoMode === 'mp4' && (
              <video src={src} style={{
                maxWidth: '100%', maxHeight: 120,
                display: 'block', margin: '0 auto',
                borderRadius: 6,
              }} muted />
            )}
            {el.type === 'audio' && (
              <audio src={src} controls style={{ width: '100%', marginTop: 4 }} />
            )}
          </div>
        ) : (
          <div style={{
            marginTop: 10,
            fontSize: 11, color: 'var(--sap-text-muted, #94a3b8)',
            textAlign: 'center',
            padding: '14px',
            background: 'var(--sap-bg-elevated, #f8fafc)',
            border: '1px dashed var(--sap-border, #e2e8f0)',
            borderRadius: 6,
          }}>
            {el.type === 'image' ? '🖼' : el.type === 'video' ? '🎬' : '🔊'} Paste a URL or upload a file
          </div>
        )}
      </div>

      {/* ── Image-specific section ────────────────────────────────
          - Alt text: accessibility — was missing entirely in the
            legacy modal. Captured here so screen readers describe
            the image and SEO crawlers index it.
          - Fit: how the image scales inside its bounding box.
          - Corner radius: the existing borderRadius style, exposed
            as a slider. */}
      {el.type === 'image' && (
        <>
          <div style={sectionStyle}>
            <div style={labelStyle}>Alt text</div>
            <input
              type="text"
              value={imageAlt}
              onChange={e => {
                setImageAlt(e.target.value);
                updateElement(el.id, { _imageAlt: e.target.value });
                markDirty();
              }}
              placeholder="Describe the image for screen readers + SEO"
              style={inputStyle}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>Fit</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { v: 'cover', l: 'Cover', hint: 'Fill, crop edges' },
                { v: 'contain', l: 'Contain', hint: 'Fit fully, may show bg' },
                { v: 'fill', l: 'Fill', hint: 'Stretch to box' },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => {
                    setImageFit(opt.v);
                    updateElement(el.id, { _imageFit: opt.v });
                    markDirty();
                  }}
                  title={opt.hint}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    background: imageFit === opt.v ? 'var(--sap-accent, #0ea5e9)' : 'var(--sap-bg-elevated, #f8fafc)',
                    color: imageFit === opt.v ? '#fff' : 'var(--sap-text-primary, #0f172a)',
                    border: '1px solid ' + (imageFit === opt.v ? 'var(--sap-accent, #0ea5e9)' : 'var(--sap-border, #e2e8f0)'),
                    borderRadius: 5,
                    fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div style={sectionStyleLast}>
            <div style={labelStyle}>Corners</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="range"
                min={0} max={48} step={1}
                value={imageRadius}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setImageRadius(v);
                  updateElementStyle(el.id, { borderRadius: `${v}px` });
                  markDirty();
                }}
                style={{ flex: 1 }}
              />
              <span style={{
                fontSize: 11, fontFamily: 'monospace',
                color: 'var(--sap-text-muted, #64748b)',
                minWidth: 36, textAlign: 'right',
              }}>{imageRadius}px</span>
            </div>
          </div>
        </>
      )}

      {/* ── Video-specific section ───────────────────────────────
          Only relevant for MP4 mode — YouTube/Vimeo iframes don't
          honour these (the embed URL params control them and we
          already set sensible ones at export). For iframe mode we
          show a one-line note instead of the toggles, so members
          aren't confused by switches that do nothing. */}
      {el.type === 'video' && (
        <div style={sectionStyleLast}>
          <div style={labelStyle}>Playback</div>
          {videoMode === 'iframe' && (
            <div style={{
              fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
              padding: '8px 10px',
              background: 'var(--sap-bg-elevated, #f8fafc)',
              border: '1px solid var(--sap-border-faint, #e2e8f0)',
              borderRadius: 6, lineHeight: 1.4,
            }}>
              YouTube / Vimeo: playback is controlled by the platform. Embed-side controls (autoplay, captions, branding) are auto-tuned at export.
            </div>
          )}
          {videoMode === 'mp4' && (
            <>
              <ToggleRow
                label="Autoplay"
                hint="Start playing as soon as the page loads. Most browsers require muted+autoplay together."
                value={videoAutoplay}
                onChange={v => {
                  setVideoAutoplay(v);
                  updateElement(el.id, { _videoAutoplay: v });
                  markDirty();
                }}
              />
              <ToggleRow
                label="Loop"
                hint="Restart from the beginning when the video ends."
                value={videoLoop}
                onChange={v => {
                  setVideoLoop(v);
                  updateElement(el.id, { _videoLoop: v });
                  markDirty();
                }}
              />
              <ToggleRow
                label="Muted"
                hint="Start with no sound. Required by most browsers for autoplay."
                value={videoMuted}
                onChange={v => {
                  setVideoMuted(v);
                  updateElement(el.id, { _videoMuted: v });
                  markDirty();
                }}
              />
              <ToggleRow
                label="Show controls"
                hint="Display the play / pause / volume bar."
                value={videoControls}
                onChange={v => {
                  setVideoControls(v);
                  updateElement(el.id, { _videoControls: v });
                  markDirty();
                }}
              />
            </>
          )}
          {videoMode === 'empty' && (
            <div style={{
              fontSize: 11, color: 'var(--sap-text-muted, #94a3b8)',
              padding: '8px 10px', fontStyle: 'italic',
            }}>
              Set a source above to configure playback.
            </div>
          )}
        </div>
      )}

      {/* ── Audio-specific section ───────────────────────────────
          Only a corner-radius slider. The native audio element is
          a pill-shaped player; radius lets members soften or
          square the corners to match their page aesthetic. */}
      {el.type === 'audio' && (
        <div style={sectionStyleLast}>
          <div style={labelStyle}>Corners</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range"
              min={0} max={48} step={1}
              value={audioRadius}
              onChange={e => {
                const v = parseInt(e.target.value, 10);
                setAudioRadius(v);
                updateElementStyle(el.id, { borderRadius: `${v}px` });
                markDirty();
              }}
              style={{ flex: 1 }}
            />
            <span style={{
              fontSize: 11, fontFamily: 'monospace',
              color: 'var(--sap-text-muted, #64748b)',
              minWidth: 36, textAlign: 'right',
            }}>{audioRadius}px</span>
          </div>
        </div>
      )}
    </>
  );
}

function ToggleRow({ label, hint, value, onChange }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '8px 10px',
      borderRadius: 6,
      background: 'var(--sap-bg-elevated, #f8fafc)',
      border: '1px solid var(--sap-border-faint, #e2e8f0)',
      cursor: 'pointer',
      marginBottom: 6,
    }}>
      {/* The actual checkbox — visually compact, accent-coloured */}
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        style={{
          marginTop: 2,
          width: 16,
          height: 16,
          accentColor: 'var(--sap-accent, #0ea5e9)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--sap-text-primary, #0f172a)',
          marginBottom: 2,
        }}>{label}</div>
        {hint && <div style={{
          fontSize: 10,
          color: 'var(--sap-text-muted, #64748b)',
          lineHeight: 1.4,
        }}>{hint}</div>}
      </div>
    </label>
  );
}

// ── Form (Opt-In) property section ─────────────────────────────
//
// The Opt-In form is the highest-stakes element on the platform — it's
// the lead-capture engine that feeds AutoResponder. Capture flow itself
// (POST /api/leads/capture → MemberLead + FunnelLead + FunnelEvent) is
// already verified working as of 18 May 2026 (see audit doc F-1/F-2).
//
// What's new here (Phase 2B port, 20 May 2026):
//   - Ports the structured-config editor from the SuperPagesEditor modal
//     to the live Inspector panel
//   - Adds GDPR consent toggle (F-4 from audit)
//   - Adds success behaviour control — redirect URL OR inline thank-you
//     message
//   - Live preview tile inside the panel updates as you edit
//
// Storage model (unchanged — Inspector edits the existing schema):
//   el.txt              — rendered HTML, regenerated on every change
//                         via buildFormHTML(). Source of truth for the
//                         exporter regex-replacement layer in exportHTML.js
//   el._formHeading     — top heading text ('Get Free Access')
//   el._formSubtitle    — subtitle text ('Enter your details below')
//   el._formShowName    — boolean, name field on/off (default on)
//   el._formShowPhone   — boolean, phone field on/off (default off)
//   el._formGdpr        — boolean, GDPR consent checkbox (NEW, default off)
//   el._formGdprText    — GDPR consent text (NEW)
//   el._formBtnText     — submit button text ('Get Access →')
//   el._formBtnColor    — submit button background colour
//   el._formRedirect    — redirect URL on submit (optional)
//   el._formSuccessMsg  — inline thank-you message (NEW, fallback when
//                         no redirect set)
//
// Email field is always on — every opt-in form must capture email.
function FormProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // Content state
  const [heading, setHeading] = useState(el._formHeading || 'Get Free Access');
  const [subtitle, setSubtitle] = useState(el._formSubtitle || 'Enter your details below');
  const [showName, setShowName] = useState(el._formShowName !== false);
  const [showPhone, setShowPhone] = useState(!!el._formShowPhone);
  const [gdpr, setGdpr] = useState(!!el._formGdpr);
  const [gdprText, setGdprText] = useState(el._formGdprText || 'I agree to receive marketing emails and accept the privacy policy.');
  const [btnText, setBtnText] = useState(el._formBtnText || 'Get Access →');
  const [btnColor, setBtnColor] = useState(el._formBtnColor || 'var(--sap-accent)');
  const [redirectUrl, setRedirectUrl] = useState(el._formRedirect || '');
  const [successMsg, setSuccessMsg] = useState(el._formSuccessMsg || 'Thanks! Check your email for next steps.');

  // Typography state — added 20 May 2026 (audit response).
  // Previously these were hardcoded in buildFormHTML, which meant
  // members had no way to adjust the inner text size, weight, or
  // colour. Each field reads from el._form* with a sensible default
  // matching the historical hardcoded value (so existing forms
  // render identically until the member touches a control).
  const [headingFont, setHeadingFont] = useState(el._formHeadingFont || 'Sora,sans-serif');
  const [headingSize, setHeadingSize] = useState(parseInt(el._formHeadingSize, 10) || 20);
  const [headingWeight, setHeadingWeight] = useState(el._formHeadingWeight || '800');
  const [headingColor, setHeadingColor] = useState(el._formHeadingColor || '#ffffff');
  const [subtitleSize, setSubtitleSize] = useState(parseInt(el._formSubtitleSize, 10) || 13);
  const [subtitleColor, setSubtitleColor] = useState(el._formSubtitleColor || '#94a3b8');
  const [fieldSize, setFieldSize] = useState(parseInt(el._formFieldSize, 10) || 13);
  const [btnFontSize, setBtnFontSize] = useState(parseInt(el._formBtnFontSize, 10) || 14);
  const [btnWeight, setBtnWeight] = useState(el._formBtnWeight || '700');

  // Button shape state — added 20 May 2026.
  // The earlier typography slider only changed the button's text size,
  // not the button block itself. Steve flagged this — the button looked
  // 'fixed size within the form' because padding/width/radius were
  // hardcoded. Now exposed as live controls.
  //
  //   btnPadding — vertical padding inside button (8-24px). Effective
  //                button height = padding × 2 + text size.
  //   btnWidth   — 'full' (100% form width) or 'auto' (hugs text).
  //   btnRadius  — corner roundness (0-32px).
  const [btnPadding, setBtnPadding] = useState(parseInt(el._formBtnPadding, 10) || 12);
  const [btnWidth, setBtnWidth] = useState(el._formBtnWidth || 'full');
  const [btnRadius, setBtnRadius] = useState(parseInt(el._formBtnRadius, 10) || 10);

  // Resync when selection changes
  useEffect(() => {
    setHeading(el._formHeading || 'Get Free Access');
    setSubtitle(el._formSubtitle || 'Enter your details below');
    setShowName(el._formShowName !== false);
    setShowPhone(!!el._formShowPhone);
    setGdpr(!!el._formGdpr);
    setGdprText(el._formGdprText || 'I agree to receive marketing emails and accept the privacy policy.');
    setBtnText(el._formBtnText || 'Get Access →');
    setBtnColor(el._formBtnColor || 'var(--sap-accent)');
    setRedirectUrl(el._formRedirect || '');
    setSuccessMsg(el._formSuccessMsg || 'Thanks! Check your email for next steps.');
    setHeadingFont(el._formHeadingFont || 'Sora,sans-serif');
    setHeadingSize(parseInt(el._formHeadingSize, 10) || 20);
    setHeadingWeight(el._formHeadingWeight || '800');
    setHeadingColor(el._formHeadingColor || '#ffffff');
    setSubtitleSize(parseInt(el._formSubtitleSize, 10) || 13);
    setSubtitleColor(el._formSubtitleColor || '#94a3b8');
    setFieldSize(parseInt(el._formFieldSize, 10) || 13);
    setBtnFontSize(parseInt(el._formBtnFontSize, 10) || 14);
    setBtnWeight(el._formBtnWeight || '700');
    setBtnPadding(parseInt(el._formBtnPadding, 10) || 12);
    setBtnWidth(el._formBtnWidth || 'full');
    setBtnRadius(parseInt(el._formBtnRadius, 10) || 10);
  }, [el.id]);

  // ── HTML regeneration ─────────────────────────────────────────
  //
  // Identical shape to the modal's buildHTML in SuperPagesEditor.jsx
  // — preserves the exact markup contract that exportHTML.js expects
  // (data-sp-submit="1" hook, placeholder text patterns for name
  // mapping, etc.). The submission flow has been verified working
  // end-to-end (18 May 2026); don't break it.
  //
  // GDPR checkbox added in Phase 2B — emitted as a <label> with a
  // required checkbox so form submission is blocked until ticked.
  // Placed between fields and submit button so it's visible.
  //
  // Typography fields (headingFont, headingSize, ...) added 20 May
  // 2026 — were previously hardcoded. Defaults match the historical
  // values so existing forms render identically.
  const buildFormHTML = (cfg) => {
    // Field input style — fieldSize controls placeholder/text size.
    const fieldStyle = `width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#ffffff;color:#132044;font-size:${cfg.fieldSize}px;margin-bottom:8px;box-sizing:border-box`;

    let fields = '';
    if (cfg.showName) {
      fields += `<input placeholder="Your first name" style="${fieldStyle}">`;
    }
    fields += `<input placeholder="Your email" type="email" style="${fieldStyle}">`;
    if (cfg.showPhone) {
      fields += `<input placeholder="Your phone" type="tel" style="${fieldStyle}">`;
    }
    let gdprBlock = '';
    if (cfg.gdpr) {
      gdprBlock = `<label style="display:flex;align-items:flex-start;gap:8px;margin:8px 0 12px;text-align:left;font-size:11px;color:rgba(255,255,255,0.7);line-height:1.4;cursor:pointer"><input type="checkbox" required style="margin-top:2px;flex-shrink:0;accent-color:#0ea5e9;cursor:pointer"><span>${cfg.gdprText}</span></label>`;
    }
    // Heading + subtitle + button styles now driven by cfg.
    const headingStyle = `font-family:${cfg.headingFont};font-weight:${cfg.headingWeight};font-size:${cfg.headingSize}px;color:${cfg.headingColor};margin-bottom:6px`;
    const subtitleStyle = `font-size:${cfg.subtitleSize}px;color:${cfg.subtitleColor};margin-bottom:16px`;
    // Button shape — width 'full' fills the form, 'auto' hugs the
    // text (and centres via inline-block wrapper). Padding controls
    // effective height; radius controls roundness.
    const btnWidthStyle = cfg.btnWidth === 'auto' ? 'width:auto;display:inline-block' : 'width:100%;display:block';
    const btnStyle = `${btnWidthStyle};padding:${cfg.btnPadding}px ${Math.max(cfg.btnPadding * 2, 20)}px;border-radius:${cfg.btnRadius}px;background:${cfg.btnColor};color:#fff;font-weight:${cfg.btnWeight};font-size:${cfg.btnFontSize}px;text-align:center;box-sizing:border-box;cursor:pointer;border:none;font-family:inherit`;
    // For 'auto' width buttons we wrap in a flex container so the
    // button is horizontally centered within the form.
    const btnHtml = `<button data-sp-submit="1" style="${btnStyle}">${cfg.btnText}</button>`;
    const btnWrapped = cfg.btnWidth === 'auto'
      ? `<div style="text-align:center">${btnHtml}</div>`
      : btnHtml;
    return `<div style="text-align:center;padding:4px"><div style="${headingStyle}">${cfg.heading}</div><div style="${subtitleStyle}">${cfg.subtitle}</div>${fields}${gdprBlock}${btnWrapped}</div>`;
  };

  // ── Live-edit helper ──────────────────────────────────────────
  //
  // Form has many fields that interact (changing showName regenerates
  // el.txt). To avoid stale-closure bugs, we accept overrides and
  // merge them into the current state snapshot — that way the regen
  // always uses the latest values.
  const commitFormChange = (overrides) => {
    const cfg = {
      heading, subtitle, showName, showPhone, gdpr, gdprText,
      btnText, btnColor,
      // Typography
      headingFont, headingSize, headingWeight, headingColor,
      subtitleSize, subtitleColor,
      fieldSize,
      btnFontSize, btnWeight,
      // Button shape
      btnPadding, btnWidth, btnRadius,
      ...overrides,
    };
    // Update local React state for whichever fields the caller
    // passed in overrides — keeps inputs snappy.
    if ('heading' in overrides) setHeading(overrides.heading);
    if ('subtitle' in overrides) setSubtitle(overrides.subtitle);
    if ('showName' in overrides) setShowName(overrides.showName);
    if ('showPhone' in overrides) setShowPhone(overrides.showPhone);
    if ('gdpr' in overrides) setGdpr(overrides.gdpr);
    if ('gdprText' in overrides) setGdprText(overrides.gdprText);
    if ('btnText' in overrides) setBtnText(overrides.btnText);
    if ('btnColor' in overrides) setBtnColor(overrides.btnColor);
    if ('headingFont' in overrides) setHeadingFont(overrides.headingFont);
    if ('headingSize' in overrides) setHeadingSize(overrides.headingSize);
    if ('headingWeight' in overrides) setHeadingWeight(overrides.headingWeight);
    if ('headingColor' in overrides) setHeadingColor(overrides.headingColor);
    if ('subtitleSize' in overrides) setSubtitleSize(overrides.subtitleSize);
    if ('subtitleColor' in overrides) setSubtitleColor(overrides.subtitleColor);
    if ('fieldSize' in overrides) setFieldSize(overrides.fieldSize);
    if ('btnFontSize' in overrides) setBtnFontSize(overrides.btnFontSize);
    if ('btnWeight' in overrides) setBtnWeight(overrides.btnWeight);
    if ('btnPadding' in overrides) setBtnPadding(overrides.btnPadding);
    if ('btnWidth' in overrides) setBtnWidth(overrides.btnWidth);
    if ('btnRadius' in overrides) setBtnRadius(overrides.btnRadius);

    // Regenerate HTML from the merged config and write the whole
    // form state back in one updateElement call (atomic).
    updateElement(el.id, {
      txt: buildFormHTML(cfg),
      _formHeading: cfg.heading,
      _formSubtitle: cfg.subtitle,
      _formShowName: cfg.showName,
      _formShowPhone: cfg.showPhone,
      _formGdpr: cfg.gdpr,
      _formGdprText: cfg.gdprText,
      _formBtnText: cfg.btnText,
      _formBtnColor: cfg.btnColor,
      _formHeadingFont: cfg.headingFont,
      _formHeadingSize: cfg.headingSize,
      _formHeadingWeight: cfg.headingWeight,
      _formHeadingColor: cfg.headingColor,
      _formSubtitleSize: cfg.subtitleSize,
      _formSubtitleColor: cfg.subtitleColor,
      _formFieldSize: cfg.fieldSize,
      _formBtnFontSize: cfg.btnFontSize,
      _formBtnWeight: cfg.btnWeight,
      _formBtnPadding: cfg.btnPadding,
      _formBtnWidth: cfg.btnWidth,
      _formBtnRadius: cfg.btnRadius,
    });
    markDirty();
  };

  // Redirect URL and success message are simpler — they don't need
  // HTML regeneration, just stored on the element for the exporter
  // and submission JS to read.
  const commitRedirect = (v) => {
    setRedirectUrl(v);
    updateElement(el.id, { _formRedirect: v });
    markDirty();
  };
  const commitSuccessMsg = (v) => {
    setSuccessMsg(v);
    updateElement(el.id, { _formSuccessMsg: v });
    markDirty();
  };

  const BTN_COLOURS = [
    'var(--sap-accent)', 'var(--sap-green-mid)', 'var(--sap-indigo)',
    'var(--sap-red-bright)', 'var(--sap-amber)', 'var(--sap-pink)',
  ];

  return (
    <>
      {/* Heading — text + typography */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Heading</label>
        <input
          type="text"
          value={heading}
          onChange={e => commitFormChange({ heading: e.target.value })}
          placeholder="Get Free Access"
          style={{ ...inputStyle, marginBottom: 8 }}
        />
        {/* Font family */}
        <select
          value={headingFont}
          onChange={e => commitFormChange({ headingFont: e.target.value })}
          style={{ ...inputStyle, marginBottom: 8, fontFamily: headingFont }}
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
          ))}
        </select>
        {/* Size slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 800,
            color: 'var(--sap-text-muted, #64748b)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            minWidth: 26,
          }}>Size</span>
          <input
            type="range"
            min="12" max="48" step="1"
            value={headingSize}
            onChange={e => commitFormChange({ headingSize: parseInt(e.target.value, 10) })}
            style={{ flex: 1, accentColor: 'var(--sap-accent, #0ea5e9)', cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            color: 'var(--sap-text-primary, #0f172a)',
            minWidth: 38, textAlign: 'right',
            background: 'var(--sap-bg-elevated, #f1f5f9)',
            padding: '3px 6px', borderRadius: 4,
          }}>{headingSize}px</span>
        </div>
        {/* Weight + Colour on one row */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={headingWeight}
            onChange={e => commitFormChange({ headingWeight: e.target.value })}
            style={{ ...inputStyle, flex: 1 }}
          >
            <option value="400">Regular</option>
            <option value="500">Medium</option>
            <option value="600">Semibold</option>
            <option value="700">Bold</option>
            <option value="800">Extra Bold</option>
            <option value="900">Black</option>
          </select>
          <label style={{
            width: 32, height: 32, borderRadius: 6,
            background: headingColor,
            border: '1px solid var(--sap-border, #e2e8f0)',
            cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
            flexShrink: 0,
          }} title="Heading colour">
            <input
              type="color"
              value={headingColor.startsWith('#') ? headingColor : '#ffffff'}
              onChange={e => commitFormChange({ headingColor: e.target.value })}
              style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', padding: 0, cursor: 'pointer' }}
            />
          </label>
        </div>
      </div>

      {/* Subtitle — text + size/colour */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Subtitle</label>
        <input
          type="text"
          value={subtitle}
          onChange={e => commitFormChange({ subtitle: e.target.value })}
          placeholder="Enter your details below"
          style={{ ...inputStyle, marginBottom: 8 }}
        />
        {/* Size slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 9, fontWeight: 800,
            color: 'var(--sap-text-muted, #64748b)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            minWidth: 26,
          }}>Size</span>
          <input
            type="range"
            min="10" max="24" step="1"
            value={subtitleSize}
            onChange={e => commitFormChange({ subtitleSize: parseInt(e.target.value, 10) })}
            style={{ flex: 1, accentColor: 'var(--sap-accent, #0ea5e9)', cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            color: 'var(--sap-text-primary, #0f172a)',
            minWidth: 38, textAlign: 'right',
            background: 'var(--sap-bg-elevated, #f1f5f9)',
            padding: '3px 6px', borderRadius: 4,
          }}>{subtitleSize}px</span>
        </div>
        {/* Subtitle colour as a single picker tile + hex readout */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px',
          background: 'var(--sap-bg-elevated, #f8fafc)',
          border: '1px solid var(--sap-border, #e2e8f0)',
          borderRadius: 6,
          cursor: 'pointer',
        }} title="Subtitle colour">
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            background: subtitleColor,
            border: '1px solid var(--sap-border-faint, #e2e8f0)',
            position: 'relative', overflow: 'hidden',
          }}>
            <input
              type="color"
              value={subtitleColor.startsWith('#') ? subtitleColor : '#94a3b8'}
              onChange={e => commitFormChange({ subtitleColor: e.target.value })}
              style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', border: 'none', padding: 0, cursor: 'pointer' }}
            />
          </div>
          <span style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', fontWeight: 600 }}>
            Subtitle colour
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--sap-text-faint, #94a3b8)' }}>
            {subtitleColor.startsWith('#') ? subtitleColor.toUpperCase() : ''}
          </span>
        </label>
      </div>

      {/* Fields toggles */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Fields</label>
        <ToggleRow
          label="First name"
          hint="Captures the lead's first name (recommended for personalisation)."
          value={showName}
          onChange={v => commitFormChange({ showName: v })}
        />
        <div style={{
          padding: '8px 10px', marginBottom: 6,
          borderRadius: 6,
          background: 'var(--sap-bg-elevated, #f8fafc)',
          border: '1px solid var(--sap-border-faint, #e2e8f0)',
          fontSize: 11,
          color: 'var(--sap-text-muted, #64748b)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 12 }}>✓</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--sap-text-primary, #0f172a)', fontSize: 12 }}>Email <span style={{ fontWeight: 400, color: 'var(--sap-text-muted, #64748b)', fontSize: 10 }}>(always on)</span></div>
            <div style={{ fontSize: 10, marginTop: 2 }}>Every opt-in form captures email.</div>
          </div>
        </div>
        <ToggleRow
          label="Phone number"
          hint="Adds a phone field — useful for SMS sequences or call-back follow-up."
          value={showPhone}
          onChange={v => commitFormChange({ showPhone: v })}
        />
        {/* Field text size — controls placeholder/typed text size in
            the input boxes. Affects all fields uniformly. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 800,
            color: 'var(--sap-text-muted, #64748b)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            minWidth: 56,
          }}>Field text</span>
          <input
            type="range"
            min="11" max="20" step="1"
            value={fieldSize}
            onChange={e => commitFormChange({ fieldSize: parseInt(e.target.value, 10) })}
            style={{ flex: 1, accentColor: 'var(--sap-accent, #0ea5e9)', cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            color: 'var(--sap-text-primary, #0f172a)',
            minWidth: 38, textAlign: 'right',
            background: 'var(--sap-bg-elevated, #f1f5f9)',
            padding: '3px 6px', borderRadius: 4,
          }}>{fieldSize}px</span>
        </div>
      </div>

      {/* GDPR consent */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Consent</label>
        <ToggleRow
          label="GDPR consent checkbox"
          hint="Required for EU/UK visitors — adds a checkbox the visitor must tick before submitting."
          value={gdpr}
          onChange={v => commitFormChange({ gdpr: v })}
        />
        {gdpr && (
          <textarea
            value={gdprText}
            onChange={e => commitFormChange({ gdprText: e.target.value })}
            rows={2}
            placeholder="I agree to receive marketing emails and accept the privacy policy."
            style={{ ...inputStyle, marginTop: 6, fontSize: 11, lineHeight: 1.4, resize: 'vertical', minHeight: 50 }}
          />
        )}
      </div>

      {/* Submit button */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Submit button</label>
        <input
          type="text"
          value={btnText}
          onChange={e => commitFormChange({ btnText: e.target.value })}
          placeholder="Get Access →"
          style={{ ...inputStyle, marginBottom: 8 }}
        />
        {/* Button typography — size + weight, no font family (button
            inherits from page for visual consistency with the rest of
            the form). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 800,
            color: 'var(--sap-text-muted, #64748b)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            minWidth: 26,
          }}>Size</span>
          <input
            type="range"
            min="11" max="24" step="1"
            value={btnFontSize}
            onChange={e => commitFormChange({ btnFontSize: parseInt(e.target.value, 10) })}
            style={{ flex: 1, accentColor: 'var(--sap-accent, #0ea5e9)', cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            color: 'var(--sap-text-primary, #0f172a)',
            minWidth: 38, textAlign: 'right',
            background: 'var(--sap-bg-elevated, #f1f5f9)',
            padding: '3px 6px', borderRadius: 4,
          }}>{btnFontSize}px</span>
        </div>
        <select
          value={btnWeight}
          onChange={e => commitFormChange({ btnWeight: e.target.value })}
          style={{ ...inputStyle, marginBottom: 8 }}
        >
          <option value="500">Medium</option>
          <option value="600">Semibold</option>
          <option value="700">Bold</option>
          <option value="800">Extra Bold</option>
        </select>

        {/* Button height (via padding) — controls how tall the button
            is. Effective height ≈ padding × 2 + text size. Horizontal
            padding scales proportionally (max of 2× vertical or 20px)
            so the button stays visually balanced. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 800,
            color: 'var(--sap-text-muted, #64748b)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            minWidth: 50,
          }}>Height</span>
          <input
            type="range"
            min="6" max="28" step="1"
            value={btnPadding}
            onChange={e => commitFormChange({ btnPadding: parseInt(e.target.value, 10) })}
            style={{ flex: 1, accentColor: 'var(--sap-accent, #0ea5e9)', cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            color: 'var(--sap-text-primary, #0f172a)',
            minWidth: 38, textAlign: 'right',
            background: 'var(--sap-bg-elevated, #f1f5f9)',
            padding: '3px 6px', borderRadius: 4,
          }}>{btnPadding}px</span>
        </div>

        {/* Button corner radius — 0 = sharp square, 32 = pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 800,
            color: 'var(--sap-text-muted, #64748b)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            minWidth: 50,
          }}>Corners</span>
          <input
            type="range"
            min="0" max="32" step="1"
            value={btnRadius}
            onChange={e => commitFormChange({ btnRadius: parseInt(e.target.value, 10) })}
            style={{ flex: 1, accentColor: 'var(--sap-accent, #0ea5e9)', cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            color: 'var(--sap-text-primary, #0f172a)',
            minWidth: 38, textAlign: 'right',
            background: 'var(--sap-bg-elevated, #f1f5f9)',
            padding: '3px 6px', borderRadius: 4,
          }}>{btnRadius}px</span>
        </div>

        {/* Button width — Full = fills form, Auto = hugs text */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginBottom: 8 }}>
          {[
            { value: 'full', label: 'Full width' },
            { value: 'auto', label: 'Hug text' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => commitFormChange({ btnWidth: opt.value })}
              style={{
                padding: '8px 6px',
                borderRadius: 6,
                border: btnWidth === opt.value
                  ? '2px solid var(--sap-accent, #0ea5e9)'
                  : '1px solid var(--sap-border, #e2e8f0)',
                background: btnWidth === opt.value
                  ? 'var(--sap-accent-bg, rgba(14,165,233,0.08))'
                  : 'var(--sap-bg-elevated, #f8fafc)',
                color: btnWidth === opt.value
                  ? 'var(--sap-accent, #0ea5e9)'
                  : 'var(--sap-text-primary, #0f172a)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >{opt.label}</button>
          ))}
        </div>

        <label style={{ ...labelStyle, marginTop: 4 }}>Button colour</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
          {BTN_COLOURS.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => commitFormChange({ btnColor: c })}
              title={c}
              aria-label={`Button colour ${c}`}
              style={{
                aspectRatio: '1',
                borderRadius: 5,
                background: c,
                cursor: 'pointer',
                border: btnColor === c ? '2px solid var(--sap-text-primary, #0f172a)' : '1px solid var(--sap-border, #e2e8f0)',
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Success behaviour */}
      <div style={sectionStyleLast}>
        <label style={labelStyle}>After submit</label>
        <input
          type="text"
          value={redirectUrl}
          onChange={e => commitRedirect(e.target.value)}
          placeholder="https://…/thank-you (optional)"
          style={{ ...inputStyle, marginBottom: 6, fontFamily: 'monospace', fontSize: 11, color: redirectUrl ? 'var(--sap-accent, #0284c7)' : 'var(--sap-text-muted, #64748b)' }}
        />
        {!redirectUrl && (
          <>
            <label style={{ ...labelStyle, marginTop: 4 }}>Or inline message</label>
            <input
              type="text"
              value={successMsg}
              onChange={e => commitSuccessMsg(e.target.value)}
              placeholder="Thanks! Check your email…"
              style={inputStyle}
            />
            <div style={{
              fontSize: 10,
              color: 'var(--sap-text-muted, #64748b)',
              marginTop: 6, lineHeight: 1.4,
            }}>
              Shown in place of the form when the visitor submits successfully. Used only if no redirect URL is set.
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Placeholder for unsupported types ──────────────────────────
//
// Until Phase 2 ports the other 25 element types, we show a friendly
// note when an element is selected that doesn't yet have a panel.
// Member can still use the old modal via the ✎ EDIT button on the
// floating canvas toolbar.
function UnsupportedTypeNote({ type }) {
  return (
    <div style={{
      padding: 20,
      background: 'var(--sap-bg-elevated, #f8fafc)',
      borderRadius: 8,
      border: '1px dashed var(--sap-border, #e2e8f0)',
      fontSize: 12,
      color: 'var(--sap-text-muted, #64748b)',
      lineHeight: 1.5,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--sap-text-primary, #0f172a)', marginBottom: 6 }}>
        {type.charAt(0).toUpperCase() + type.slice(1)} editor
      </div>
      <div>The new property panel is rolling out per block type. For now, use the <strong>✎ EDIT</strong> button on the canvas toolbar to open the existing editor for this element.</div>
    </div>
  );
}

// ── Main panel component ───────────────────────────────────────
//
// Renders one of three states:
//   1. No selection — show a tip (panel is otherwise blank space)
//   2. Selection of a supported type — render that type's properties
//   3. Selection of an unsupported type — show the placeholder note
//
// Header is constant across all states: shows element type + the
// quick actions (duplicate / lock / delete).
export default function ElementInspectorPanel({ el, updateElement, updateElementStyle, markDirty, onDuplicate, onDelete, onToggleLock }) {
  // No-selection state
  if (!el) {
    return (
      <div style={{
        padding: '20px 16px',
        fontSize: 12,
        color: 'var(--sap-text-muted, #64748b)',
        lineHeight: 1.6,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 800,
          color: 'var(--sap-text-faint, #94a3b8)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>Editing</div>
        <div style={{
          padding: 16,
          background: 'var(--sap-bg-elevated, #f8fafc)',
          border: '1px dashed var(--sap-border, #e2e8f0)',
          borderRadius: 8,
          textAlign: 'center',
          color: 'var(--sap-text-muted, #64748b)',
        }}>
          <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.4 }}>✎</div>
          <div>Select an element on the canvas to edit its properties here.</div>
        </div>
      </div>
    );
  }

  // Type label for the header
  const typeLabel = el.type.charAt(0).toUpperCase() + el.type.slice(1);

  return (
    <div style={{
      padding: '14px 16px',
      height: '100%',
      overflowY: 'auto',
      fontFamily: 'inherit',
    }}>
      {/* Header — element type + quick actions */}
      <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--sap-border-faint, #f1f5f9)' }}>
        <div style={{
          fontSize: 10, fontWeight: 800,
          color: 'var(--sap-text-faint, #94a3b8)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 6,
        }}>Editing</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, background: 'var(--sap-accent, #0ea5e9)', borderRadius: '50%' }} />
          <span style={{
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--sap-text-primary, #0f172a)',
          }}>{typeLabel}</span>
          <div style={{ flex: 1 }} />
          {/* Quick actions — duplicate / lock / delete */}
          <button onClick={onDuplicate} title="Duplicate" aria-label="Duplicate"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--sap-text-muted, #94a3b8)', fontSize: 14 }}>⧉</button>
          <button onClick={onToggleLock} title={el.locked ? 'Unlock' : 'Lock'} aria-label={el.locked ? 'Unlock' : 'Lock'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: el.locked ? '#a855f7' : 'var(--sap-text-muted, #94a3b8)', fontSize: 14 }}>{el.locked ? '🔒' : '🔓'}</button>
          <button onClick={onDelete} title="Delete" aria-label="Delete"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--sap-red, #ef4444)', fontSize: 13 }}>✕</button>
        </div>
      </div>

      {/* Type-specific properties.
          Phase 1: Button (commit d893935)
          Phase 2A: Heading, Text, Label — same TextTypeProperties since they share a Tiptap inline-edit model (commit fabffc8)
          Phase 2B: Announcement Banner — own component with dismissible + sticky toggles (commit 1cf83e0)
          Phase 2B continued: Form (Opt-In) — own component, field config + GDPR + success behaviour (this commit)
          Remaining 20 types fall back to the placeholder note pointing at the legacy modal. */}
      {el.type === 'button' ? (
        <ButtonProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'announcement' ? (
        <BannerProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'form' ? (
        <FormProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : ['heading', 'text', 'label'].includes(el.type) ? (
        <TextTypeProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : ['image', 'video', 'audio'].includes(el.type) ? (
        <MediaProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : ['review', 'testimonial', 'faq', 'stat'].includes(el.type) ? (
        <CardLikeProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'progress' ? (
        <ProgressProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'badge' ? (
        <BadgeProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : ['icontext', 'separator', 'logostrip'].includes(el.type) ? (
        <HtmlTextProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'box' ? (
        <BoxProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'divider' ? (
        <DividerProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'spacer' ? (
        <SpacerProperties el={el} updateElement={updateElement} markDirty={markDirty} />
      ) : el.type === 'countdown' ? (
        <CountdownProperties el={el} updateElement={updateElement} markDirty={markDirty} />
      ) : el.type === 'socialicons' ? (
        <SocialsProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'embed' ? (
        <EmbedProperties el={el} updateElement={updateElement} markDirty={markDirty} />
      ) : (
        <UnsupportedTypeNote type={el.type} />
      )}
    </div>
  );
}
