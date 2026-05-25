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
import FontPicker from './FontPicker';
import ScriptsPanel from './ScriptsPanel';

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
  // 25 May 2026: deliberate font picks flag _fontExplicit so the
  // renderer treats them as overrides. Page-level Heading/Body Font
  // changes pass over flagged elements.
  const commitFontFamily = (v) => {
    setFontFamily(v);
    updateElementStyle(el.id, { fontFamily: v, _fontExplicit: true });
    markDirty();
  };
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
        <FontPicker
          label="Font family"
          value={fontFamily.replace(/,\s*(sans-serif|serif|monospace|cursive)\s*$/i, '').replace(/^["']|["']$/g, '')}
          onChange={(name) => commitFontFamily(name)}
        />

        <div style={{ height: 8 }} />

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
  const commitFontFamily = (v) => {
    setFontFamily(v);
    // 25 May 2026: deliberate font picks flag _fontExplicit; page-level
    // typography passes over flagged elements.
    updateElementStyle(el.id, { fontFamily: v, _fontExplicit: true });
    markDirty();
  };
  const commitFontWeight = (v) => { setFontWeight(v); commitStyle('fontWeight', v); };
  const commitFontSize = (numPx) => {
    setFontSizeNum(numPx);
    // For text-type elements, an explicit Inspector-chosen size blocks
    // page-level Body Size overrides. Heading sizes always block (they're
    // their own size domain) so the flag's only consulted for text/label.
    updateElementStyle(el.id, { fontSize: numPx + 'px', _sizeExplicit: true });
    markDirty();
  };
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
        <FontPicker
          label="Font family"
          value={fontFamily.replace(/,\s*(sans-serif|serif|monospace|cursive)\s*$/i, '').replace(/^["']|["']$/g, '')}
          onChange={(name) => commitFontFamily(name)}
        />
        <div style={{ height: 8 }} />

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
function ContainerSection({ el, updateElementStyle, markDirty, includeAccentStripe = false, includeBorder = false, lastSection = false }) {
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

  // Border — opted-in via includeBorder prop. Same parse pattern as
  // BoxProperties. Added 20 May 2026 (Steve flag): the Form element
  // has a 1px cobalt outline baked into its default; when members
  // make the form background transparent the outline remained
  // visible because nothing exposed border editing. Now FormProperties
  // (and any future caller) can pass includeBorder=true and get
  // the same border control BoxProperties has.
  const borderRaw = el.s?.border || '';
  const borderMatch = borderRaw.match(/^(\d+)px\s+solid\s+(.+)$/);
  const [borderWidth, setBorderWidth] = useState(borderMatch ? parseInt(borderMatch[1], 10) : 0);
  const [borderColor, setBorderColor] = useState(borderMatch ? borderMatch[2] : 'rgba(14,165,233,0.15)');

  // Resync on selection change
  useEffect(() => {
    setBackground(el.s?.background || '#1e293b');
    setRadius(parseInt((el.s?.borderRadius || '12px'), 10) || 12);
    setPadding(parseInt((el.s?.padding || '24px'), 10) || 24);
    const m = (el.s?.borderLeft || '').match(/^(\d+)px\s+solid\s+(.+)$/);
    setStripeWidth(m ? parseInt(m[1], 10) : 0);
    setStripeColor(m ? m[2] : '#0ea5e9');
    const bm = (el.s?.border || '').match(/^(\d+)px\s+solid\s+(.+)$/);
    setBorderWidth(bm ? parseInt(bm[1], 10) : 0);
    setBorderColor(bm ? bm[2] : 'rgba(14,165,233,0.15)');
  }, [el.id]);

  // ── Background colour + opacity helpers ─────────────────────────
  // Background can be many shapes — hex (#rrggbb), rgba(), gradient,
  // CSS variable. These helpers normalise to (hex, alpha) for the
  // UI, and serialise back to whichever form keeps the value clean
  // (hex when fully opaque, rgba() when translucent).

  // True if the background is a gradient or CSS function we shouldn't
  // try to colour-pick or alpha-tweak. Disables the opacity slider.
  function bgIsGradient(v) {
    if (!v || typeof v !== 'string') return false;
    const s = v.trim().toLowerCase();
    return s.startsWith('linear-gradient(') ||
           s.startsWith('radial-gradient(') ||
           s.startsWith('conic-gradient(') ||
           s.startsWith('var(');
  }

  // Extract a #rrggbb hex equivalent of the current background for
  // the colour picker. rgba(r,g,b,a) → strip alpha and return hex.
  // hex → return as-is. Anything else (gradient, variable, named
  // colour) → fallback to a sensible cobalt so the picker shows
  // something readable rather than blank.
  function parseBgHex(v) {
    if (!v || typeof v !== 'string') return '#1e293b';
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    const m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) {
      const r = parseInt(m[1], 10).toString(16).padStart(2, '0');
      const g = parseInt(m[2], 10).toString(16).padStart(2, '0');
      const b = parseInt(m[3], 10).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return '#1e293b';
  }

  // Extract alpha (0..1) from the current background. Hex → 1.
  // rgba(...,a) → a. rgb(...) → 1. Gradient/variable → 1 (slider
  // disabled anyway). Anything else → 1.
  function parseBgAlpha(v) {
    if (!v || typeof v !== 'string') return 1;
    const m = v.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/i);
    if (m) {
      const a = parseFloat(m[1]);
      return isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
    }
    return 1;
  }

  // Convert hex → rgba components for serialising with an alpha.
  function hexToRgb(hex) {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    if (!m) return { r: 30, g: 41, b: 59 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  // Re-emit the background string given a hex and an alpha. If alpha
  // is effectively 1 we use the cleaner hex form; otherwise rgba()
  // so the value carries opacity through the export pipeline cleanly.
  function buildBg(hex, alpha) {
    const a = Math.max(0, Math.min(1, alpha));
    if (a >= 0.999) return hex;
    const { r, g, b } = hexToRgb(hex);
    // Round to 2 decimals to keep the string short and tidy.
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
  }

  // Commit helpers
  const commitBackground = (v) => {
    setBackground(v);
    updateElementStyle(el.id, { background: v });
    markDirty();
  };
  // From the colour picker — preserve the current alpha if we're
  // editing an existing rgba background.
  const commitBackgroundFromPicker = (hex) => {
    const currentAlpha = parseBgAlpha(background);
    commitBackground(buildBg(hex, currentAlpha));
  };
  // From the opacity slider — preserve the current hex, swap alpha.
  const commitBackgroundAlpha = (alpha) => {
    if (bgIsGradient(background)) return; // no-op on gradients
    const hex = parseBgHex(background);
    commitBackground(buildBg(hex, alpha));
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

  // Border: same shape as stripe. Width 0 → empty string so the
  // border is entirely removed (no 0px solid stub left behind).
  const commitBorder = (w, c) => {
    setBorderWidth(w);
    setBorderColor(c);
    const value = w > 0 ? `${w}px solid ${c}` : '';
    updateElementStyle(el.id, { border: value });
    markDirty();
  };

  // ── Render ───────────────────────────────────────────────────
  // Each row is a label + control. Background gets both a colour
  // picker (for hex) and a text input (for gradients / CSS vars).
  // Radius and padding are sliders with current-value readout.
  return (
    <div style={lastSection ? sectionStyleLast : sectionStyle}>
      <div style={labelStyle}>Container</div>

      {/* Background — colour picker + opacity slider + raw text.

          20 May 2026 (Steve flag): added opacity slider so members
          can make element backgrounds translucent. Works for solid
          colours (#hex and rgba); gradients and CSS variables get
          the slider disabled because applying opacity to a gradient
          requires rewriting every colour stop to rgba(), which is
          a follow-up if anyone asks for it.

          State model:
          - background string in el.s.background is the source of
            truth (e.g. 'rgba(15,23,41,0.4)' or '#1e293b' or
            'linear-gradient(...)').
          - The picker shows the hex equivalent for display.
          - The slider derives current alpha from rgba() if present,
            defaults to 100% for plain hex.
          - On any change we re-serialise: if alpha is 100% and the
            colour is a hex, emit hex; otherwise emit rgba(). Keeps
            the output clean for the export pipeline. */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginBottom: 4 }}>
          Background
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <input
            type="color"
            value={parseBgHex(background)}
            onChange={e => commitBackgroundFromPicker(e.target.value)}
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
            placeholder="#1e293b or rgba(…) or linear-gradient(…)"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        {/* Opacity slider — disabled when the background is a
            gradient or CSS variable. Hidden state info on hover. */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
          marginBottom: 4,
        }}>
          <span title={bgIsGradient(background) ? 'Opacity only available for solid colours' : 'Background opacity'}>Opacity</span>
          <span style={{ fontFamily: 'monospace' }}>
            {bgIsGradient(background) ? '—' : `${Math.round(parseBgAlpha(background) * 100)}%`}
          </span>
        </div>
        <input
          type="range" min={0} max={100} step={1}
          value={Math.round(parseBgAlpha(background) * 100)}
          onChange={e => commitBackgroundAlpha(parseInt(e.target.value, 10) / 100)}
          disabled={bgIsGradient(background)}
          style={{
            width: '100%',
            opacity: bgIsGradient(background) ? 0.4 : 1,
            cursor: bgIsGradient(background) ? 'not-allowed' : 'pointer',
          }}
        />
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

      {/* Border — opted-in via includeBorder. Drag the width slider
          to 0 to remove the border entirely (useful when the user
          has set the background opacity low and doesn't want the
          outline showing through transparency). */}
      {includeBorder && (
        <div style={{ marginTop: 10 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
            marginBottom: 4,
          }}>
            <span>Border</span>
            <span style={{ fontFamily: 'monospace' }}>{borderWidth}px</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="color"
              value={(/^#[0-9a-f]{6}$/i).test(borderColor) ? borderColor : '#e2e8f0'}
              onChange={e => commitBorder(borderWidth || 1, e.target.value)}
              style={{
                width: 32, height: 28, padding: 0,
                border: '1px solid var(--sap-border, #e2e8f0)',
                borderRadius: 5, cursor: 'pointer',
                background: 'transparent',
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
  // _labelColor (22 May 2026) — was hardcoded light-on-dark.
  const [labelColor, setLabelColor] = useState(el._labelColor || '#e2e8f0');

  useEffect(() => {
    setLabel(el._label || 'Progress');
    setPercent(parseInt(el._percent, 10) || 75);
    setColor(el._color || '#0ea5e9');
    setTrackColor(el._trackColor || 'rgba(255,255,255,0.08)');
    setLabelColor(el._labelColor || '#e2e8f0');
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
        <div style={labelStyle}>Label colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(labelColor) ? labelColor : '#e2e8f0'}
            onChange={e => { setLabelColor(e.target.value); commitField('_labelColor', e.target.value); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer',
              background: 'transparent',
            }}
          />
          <input
            type="text"
            value={labelColor}
            onChange={e => { setLabelColor(e.target.value); commitField('_labelColor', e.target.value); }}
            placeholder="#e2e8f0"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <div style={{
          marginTop: 6,
          fontSize: 10, color: 'var(--sap-text-muted, #94a3b8)',
          lineHeight: 1.4,
        }}>
          On white pages, try a dark slate like #334155
        </div>
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
// ── StatProperties — structured value/label/colour fields ───────
//
// Phase 3 inspector refactor (audit C-X-4, 21 May 2026). Stat used
// to route through CardLikeProperties which only let members edit
// the wrapping container colours + text via inline-double-click.
// To change the actual number ("95%" → "127k") a member had to
// either inline-edit (slow, fiddly with the rich-text editor) or
// open the HTML editor (intimidating).
//
// Now stat has three first-class structured fields:
//   _statValue  — the big number/text (e.g. "95%", "127k", "$2.1M")
//   _statLabel  — the small descriptor (e.g. "Paid out", "Active users")
//   _statColor  — accent colour for the big number
//
// Both Inspector and exportHTML read these directly. Legacy stats
// with content in el.txt fall back to the old render path until
// re-edited.
function StatProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // Initial read — prefer structured fields, but if a legacy stat
  // has only el.txt content we try a best-effort extraction so the
  // member sees something sensible in the form fields rather than
  // empty inputs. Heuristic: pull two text chunks from any inner
  // <div>...</div> spans; first is value, second is label.
  const fromLegacy = () => {
    if (!el.txt) return { v: '', l: '' };
    const matches = String(el.txt).match(/>([^<]+)</g) || [];
    const clean = matches.map(m => m.slice(1, -1).trim()).filter(Boolean);
    return { v: clean[0] || '', l: clean[1] || '' };
  };
  const legacy = fromLegacy();
  const [statValue, setStatValue] = useState(el._statValue !== undefined ? el._statValue : legacy.v);
  const [statLabel, setStatLabel] = useState(el._statLabel !== undefined ? el._statLabel : legacy.l);
  const [statColor, setStatColor] = useState(el._statColor || '#0ea5e9');
  const [statSize, setStatSize] = useState(el._statSize || 36);
  const [statLabelColor, setStatLabelColor] = useState(el._statLabelColor || '#64748b');
  const [statLabelSize, setStatLabelSize] = useState(el._statLabelSize || 12);

  useEffect(() => {
    const lg = fromLegacy();
    setStatValue(el._statValue !== undefined ? el._statValue : lg.v);
    setStatLabel(el._statLabel !== undefined ? el._statLabel : lg.l);
    setStatColor(el._statColor || '#0ea5e9');
    setStatSize(el._statSize || 36);
    setStatLabelColor(el._statLabelColor || '#64748b');
    setStatLabelSize(el._statLabelSize || 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.id]);

  // Commit pattern: update structured field, clear el.txt so the
  // render path takes the structured branch. We don't leave both
  // populated — that would let legacy and structured diverge.
  const commit = (patch) => {
    // Always write txt to empty string when committing structured
    // fields, so the render branch unambiguously picks the new path.
    updateElement(el.id, { ...patch, txt: '' });
    markDirty();
  };

  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Number / value</div>
        <input
          type="text"
          value={statValue}
          onChange={(e) => { setStatValue(e.target.value); commit({ _statValue: e.target.value }); }}
          placeholder="95%"
          style={inputStyle}
        />
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          The big headline — e.g. "95%", "127k", "$2.1M"
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Label</div>
        <input
          type="text"
          value={statLabel}
          onChange={(e) => { setStatLabel(e.target.value); commit({ _statLabel: e.target.value }); }}
          placeholder="Paid out"
          style={inputStyle}
        />
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Short descriptor below the number
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Number colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(statColor) ? statColor : '#0ea5e9'}
            onChange={(e) => { setStatColor(e.target.value); commit({ _statColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={statColor}
            onChange={(e) => { setStatColor(e.target.value); commit({ _statColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={labelStyle}>Number size</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--sap-text-muted, #64748b)' }}>{statSize}px</span>
        </div>
        <input
          type="range" min={16} max={96} step={1}
          value={statSize}
          onChange={(e) => { const n = parseInt(e.target.value, 10); setStatSize(n); commit({ _statSize: n }); }}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Label colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(statLabelColor) ? statLabelColor : '#64748b'}
            onChange={(e) => { setStatLabelColor(e.target.value); commit({ _statLabelColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={statLabelColor}
            onChange={(e) => { setStatLabelColor(e.target.value); commit({ _statLabelColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      <div style={sectionStyleLast}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={labelStyle}>Label size</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--sap-text-muted, #64748b)' }}>{statLabelSize}px</span>
        </div>
        <input
          type="range" min={9} max={24} step={1}
          value={statLabelSize}
          onChange={(e) => { const n = parseInt(e.target.value, 10); setStatLabelSize(n); commit({ _statLabelSize: n }); }}
          style={{ width: '100%' }}
        />
      </div>
    </>
  );
}

// ── SeparatorProperties — structured symbol + line colour ───────
//
// Phase 3 inspector refactor (audit C-X-4, 21 May 2026). Previously
// routed through HtmlTextProperties which made members edit the
// entire separator as raw HTML to change the centred symbol.
//
// Now two structured fields:
//   _separatorSymbol — the centred glyph or text (e.g. '★ ★ ★', '•',
//                      '◆', '— END OF SECTION —')
//   _separatorColor  — the colour of the lines either side
//
// Lines are pure decoration generated by the render path; member
// doesn't need to know about them.
function SeparatorProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // Legacy extraction: if a member opens a pre-Phase-3 separator,
  // pull the centred text from the inner <span>...</span>.
  const fromLegacy = () => {
    if (!el.txt) return '';
    const m = String(el.txt).match(/<span[^>]*>([^<]+)<\/span>/);
    return m ? m[1].trim() : '';
  };
  const [symbol, setSymbol] = useState(el._separatorSymbol !== undefined ? el._separatorSymbol : fromLegacy());
  const [color, setColor] = useState(el._separatorColor || 'rgba(255,255,255,0.1)');
  const [symbolSize, setSymbolSize] = useState(el._separatorSize || 12);
  const [symbolColor, setSymbolColor] = useState(el._separatorSymbolColor || '#64748b');

  useEffect(() => {
    setSymbol(el._separatorSymbol !== undefined ? el._separatorSymbol : fromLegacy());
    setColor(el._separatorColor || 'rgba(255,255,255,0.1)');
    setSymbolSize(el._separatorSize || 12);
    setSymbolColor(el._separatorSymbolColor || '#64748b');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.id]);

  // Same commit pattern as StatProperties: write structured field,
  // clear txt so render path takes the structured branch unambiguously.
  const commit = (patch) => {
    updateElement(el.id, { ...patch, txt: '' });
    markDirty();
  };

  // Quick-pick presets for common separator styles. One-tap to apply.
  const PRESETS = [
    '★ ★ ★', '◆ ◆ ◆', '• • •', '— • —', '~ ~ ~', 'END',
  ];

  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Centre symbol</div>
        <input
          type="text"
          value={symbol}
          onChange={(e) => { setSymbol(e.target.value); commit({ _separatorSymbol: e.target.value }); }}
          placeholder="★ ★ ★"
          style={inputStyle}
        />
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Symbol or text shown between the two lines
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => { setSymbol(p); commit({ _separatorSymbol: p }); }}
              style={{
                padding: '4px 8px',
                fontSize: 11,
                background: 'var(--sap-bg-elevated, #f8fafc)',
                border: '1px solid var(--sap-border, #e2e8f0)',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={labelStyle}>Symbol size</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--sap-text-muted, #64748b)' }}>{symbolSize}px</span>
        </div>
        <input
          type="range" min={10} max={64} step={1}
          value={symbolSize}
          onChange={(e) => { const n = parseInt(e.target.value, 10); setSymbolSize(n); commit({ _separatorSize: n }); }}
          style={{ width: '100%' }}
        />
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Try ~24px for decorative star rows like ★ ★ ★
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Symbol colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(symbolColor) ? symbolColor : '#64748b'}
            onChange={(e) => { setSymbolColor(e.target.value); commit({ _separatorSymbolColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={symbolColor}
            onChange={(e) => { setSymbolColor(e.target.value); commit({ _separatorSymbolColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      <div style={sectionStyleLast}>
        <div style={labelStyle}>Line colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={color.startsWith('#') ? color : '#1f2937'}
            onChange={(e) => { setColor(e.target.value); commit({ _separatorColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={color}
            onChange={(e) => { setColor(e.target.value); commit({ _separatorColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Accepts hex (#1f2937) or rgba (rgba(255,255,255,0.1))
        </div>
      </div>
    </>
  );
}

// ── IconTextProperties — structured icon + heading + description ───
//
// Phase 3 inspector refactor (audit C-X-4, 21 May 2026). icontext
// used to route through HtmlTextProperties which made members edit
// nested <div> tags to change the emoji, feature name, or description.
//
// Three structured fields now:
//   _icon            — the leading visual (emoji works best; any short
//                      string is allowed, ~1-2 chars typical)
//   _iconHeading     — the bold feature name
//   _iconDescription — the supporting paragraph
//
// The flex layout (icon left, text right) is generated by the render
// path; member never sees the HTML structure.
function IconTextProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // Best-effort legacy extraction. Pre-Phase-3 icontext stored:
  //   <div>...<div style="font-size:28px;...">🚀</div>
  //          <div><div style="...">Feature Heading</div>
  //               <div style="...">Description...</div></div></div>
  // We pull the three text chunks via regex; on first edit the
  // element converts to the new structured shape.
  const fromLegacy = () => {
    if (!el.txt) return { i: '', h: '', d: '' };
    const matches = String(el.txt).match(/>([^<]+)</g) || [];
    const clean = matches.map(m => m.slice(1, -1).trim()).filter(Boolean);
    return { i: clean[0] || '', h: clean[1] || '', d: clean[2] || '' };
  };
  const legacy = fromLegacy();
  const [icon, setIcon] = useState(el._icon !== undefined ? el._icon : legacy.i);
  const [heading, setHeading] = useState(el._iconHeading !== undefined ? el._iconHeading : legacy.h);
  const [description, setDescription] = useState(el._iconDescription !== undefined ? el._iconDescription : legacy.d);
  const [iconSize, setIconSize] = useState(el._iconSize || 28);
  const [hColor, setHColor] = useState(el._iconHeadingColor || '#fff');
  const [dColor, setDColor] = useState(el._iconDescColor || '#94a3b8');

  useEffect(() => {
    const lg = fromLegacy();
    setIcon(el._icon !== undefined ? el._icon : lg.i);
    setHeading(el._iconHeading !== undefined ? el._iconHeading : lg.h);
    setDescription(el._iconDescription !== undefined ? el._iconDescription : lg.d);
    setIconSize(el._iconSize || 28);
    setHColor(el._iconHeadingColor || '#fff');
    setDColor(el._iconDescColor || '#94a3b8');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.id]);

  // Commit pattern matches Stat/Separator: write structured field,
  // clear el.txt so render unambiguously picks the structured branch.
  const commit = (patch) => {
    updateElement(el.id, { ...patch, txt: '' });
    markDirty();
  };

  // Quick-pick emojis covering the most common landing-page features.
  // Any short string is allowed via the text input; these are just
  // one-tap shortcuts for the typical cases.
  const ICON_PRESETS = ['🚀', '⚡', '✅', '🎯', '💡', '🔒', '📈', '⭐', '🏆', '💎', '🛡️', '🎁'];

  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Icon</div>
        <input
          type="text"
          value={icon}
          onChange={(e) => { setIcon(e.target.value); commit({ _icon: e.target.value }); }}
          placeholder="🚀"
          maxLength={4}
          style={{ ...inputStyle, fontSize: 18, textAlign: 'center', width: 64 }}
        />
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          One emoji works best — short symbol also OK
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {ICON_PRESETS.map(p => (
            <button
              key={p}
              onClick={() => { setIcon(p); commit({ _icon: p }); }}
              style={{
                width: 32, height: 32,
                fontSize: 18,
                background: 'var(--sap-bg-elevated, #f8fafc)',
                border: '1px solid var(--sap-border, #e2e8f0)',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={labelStyle}>Icon size</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--sap-text-muted, #64748b)' }}>{iconSize}px</span>
        </div>
        <input
          type="range" min={14} max={72} step={1}
          value={iconSize}
          onChange={(e) => { const n = parseInt(e.target.value, 10); setIconSize(n); commit({ _iconSize: n }); }}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Heading</div>
        <input
          type="text"
          value={heading}
          onChange={(e) => { setHeading(e.target.value); commit({ _iconHeading: e.target.value }); }}
          placeholder="Feature Heading"
          style={inputStyle}
        />
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Heading colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(hColor) ? hColor : '#ffffff'}
            onChange={(e) => { setHColor(e.target.value); commit({ _iconHeadingColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={hColor}
            onChange={(e) => { setHColor(e.target.value); commit({ _iconHeadingColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Description</div>
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); commit({ _iconDescription: e.target.value }); }}
          placeholder="Describe the benefit or feature here."
          rows={3}
          style={{
            ...inputStyle,
            minHeight: 60,
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
        />
      </div>

      <div style={sectionStyleLast}>
        <div style={labelStyle}>Description colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(dColor) ? dColor : '#94a3b8'}
            onChange={(e) => { setDColor(e.target.value); commit({ _iconDescColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={dColor}
            onChange={(e) => { setDColor(e.target.value); commit({ _iconDescColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>
    </>
  );
}

// ── LogostripProperties — array of logo entries (text or image) ───
//
// Phase 3 inspector refactor (audit C-X-4 + C-L-2, 21 May 2026).
// Logostrip used to be a flat HTML blob with hardcoded text labels.
// Now structured:
//   _logoHeader — optional caption ("As seen in:")
//   _logos      — array of { text: string, img: string }
//
// Each entry can be either a text label (default) or an image (when
// img is set). Members can mix the two — useful when some partner
// logos are available as files and others aren't yet.
//
// Inspector lets members add/remove rows, upload an image per row,
// and edit the alt text. Uses the same /api/funnels/upload-image
// endpoint as the Image element — picks up the auto-WebP-optimise
// from audit C-M-1 for free.
function LogostripProperties({ el, updateElement, updateElementStyle, markDirty }) {
  const fromLegacy = () => {
    if (!el.txt) return { header: '', items: [] };
    // Pre-Phase-3 logostrip: first span is the header ("As seen in:"),
    // remaining spans are brand labels. Extract them all.
    const matches = String(el.txt).match(/<span[^>]*>([^<]+)<\/span>/g) || [];
    const texts = matches.map(m => {
      const inner = m.match(/>([^<]+)</);
      return inner ? inner[1].trim() : '';
    }).filter(Boolean);
    return {
      header: texts[0] || '',
      items: texts.slice(1).map(t => ({ text: t, img: '' })),
    };
  };
  const legacy = fromLegacy();
  const [header, setHeader] = useState(el._logoHeader !== undefined ? el._logoHeader : legacy.header);
  const [items, setItems] = useState(Array.isArray(el._logos) ? el._logos.map(l => ({ ...l })) : legacy.items);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  // 22 May 2026 — style controls. Mono is the universal "as seen in"
  // treatment (greyscale + 0.6 opacity); colour shows logos in full.
  const [logoStyle, setLogoStyle] = useState(el._logoStyle || 'mono');
  const [headerColor, setHeaderColor] = useState(el._logoHeaderColor || '#475569');
  const [textColor, setTextColor] = useState(el._logoTextColor || '#64748b');

  useEffect(() => {
    const lg = fromLegacy();
    setHeader(el._logoHeader !== undefined ? el._logoHeader : lg.header);
    setItems(Array.isArray(el._logos) ? el._logos.map(l => ({ ...l })) : lg.items);
    setLogoStyle(el._logoStyle || 'mono');
    setHeaderColor(el._logoHeaderColor || '#475569');
    setTextColor(el._logoTextColor || '#64748b');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.id]);

  // Single commit helper — writes both header and items so they stay
  // in sync, clears txt so render path picks the structured branch.
  const commit = (nextHeader, nextItems) => {
    updateElement(el.id, { _logoHeader: nextHeader, _logos: nextItems, txt: '' });
    markDirty();
  };
  // Style fields don't need the items/header bundle — they're independent.
  const commitStyle = (patch) => {
    updateElement(el.id, patch);
    markDirty();
  };

  const updateHeader = (v) => {
    setHeader(v);
    commit(v, items);
  };

  const updateItem = (i, patch) => {
    const next = items.map((item, idx) => idx === i ? { ...item, ...patch } : item);
    setItems(next);
    commit(header, next);
  };

  const addLogo = () => {
    if (items.length >= 8) return; // cap at 8 to avoid the strip overflowing
    const next = [...items, { text: 'New brand', img: '' }];
    setItems(next);
    commit(header, next);
  };

  const removeLogo = (i) => {
    const next = items.filter((_, idx) => idx !== i);
    setItems(next);
    commit(header, next);
  };

  const moveLogo = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    commit(header, next);
  };

  const uploadImage = async (idx, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(`Logo too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`);
      return;
    }
    setUploadingIdx(idx);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/funnels/upload-image', { method: 'POST', body: fd, credentials: 'include' });
      if (!r.ok) {
        alert(`Upload failed (${r.status}).`);
        return;
      }
      const d = await r.json();
      if (d.url) {
        updateItem(idx, { img: d.url });
      } else {
        alert('Upload failed: ' + (d.error || 'server returned no URL'));
      }
    } catch (err) {
      alert('Upload error: ' + (err.message || 'network failure'));
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Header label</div>
        <input
          type="text"
          value={header}
          onChange={(e) => updateHeader(e.target.value)}
          placeholder="As seen in:"
          style={inputStyle}
        />
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Optional — leave blank to hide
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Logo style</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['mono', 'colour'].map(opt => {
            const active = logoStyle === opt;
            return (
              <button
                key={opt}
                onClick={() => { setLogoStyle(opt); commitStyle({ _logoStyle: opt }); }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 600,
                  border: '1px solid ' + (active ? '#0ea5e9' : 'rgba(255,255,255,0.15)'),
                  background: active ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#22d3ee' : '#e2e8f0',
                  borderRadius: 5,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}>
                {opt === 'mono' ? 'Mono (faded)' : 'Full colour'}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Mono is the standard "as seen in" treatment (greyscale + faded).
          Full colour shows partner logos prominently.
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Header text colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(headerColor) ? headerColor : '#475569'}
            onChange={(e) => { setHeaderColor(e.target.value); commitStyle({ _logoHeaderColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={headerColor}
            onChange={(e) => { setHeaderColor(e.target.value); commitStyle({ _logoHeaderColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Text-logo colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(textColor) ? textColor : '#64748b'}
            onChange={(e) => { setTextColor(e.target.value); commitStyle({ _logoTextColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={textColor}
            onChange={(e) => { setTextColor(e.target.value); commitStyle({ _logoTextColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Colour for logos shown as text labels (not images)
        </div>
      </div>

      <div style={sectionStyleLast}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={labelStyle}>Logos ({items.length})</span>
          <button
            onClick={addLogo}
            disabled={items.length >= 8}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 700,
              background: items.length >= 8 ? '#e2e8f0' : 'var(--sap-accent, #0ea5e9)',
              color: items.length >= 8 ? '#94a3b8' : '#fff',
              border: 'none',
              borderRadius: 5,
              cursor: items.length >= 8 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}>
            + Add
          </button>
        </div>

        {items.length === 0 && (
          <div style={{
            padding: 16, textAlign: 'center',
            fontSize: 12, color: 'var(--sap-text-muted, #64748b)',
            border: '1px dashed var(--sap-border, #e2e8f0)', borderRadius: 6,
          }}>
            No logos yet. Click + Add to start.
          </div>
        )}

        {items.map((item, idx) => (
          <div key={idx} style={{
            padding: 10, marginBottom: 8,
            background: 'var(--sap-bg-elevated, #f8fafc)',
            border: '1px solid var(--sap-border, #e2e8f0)',
            borderRadius: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted, #64748b)' }}>#{idx + 1}</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => moveLogo(idx, -1)} disabled={idx === 0}
                style={{ padding: '2px 6px', fontSize: 11, cursor: idx === 0 ? 'not-allowed' : 'pointer', background: 'transparent', border: '1px solid var(--sap-border, #e2e8f0)', borderRadius: 3, opacity: idx === 0 ? 0.3 : 1 }}
                title="Move up">↑</button>
              <button onClick={() => moveLogo(idx, 1)} disabled={idx === items.length - 1}
                style={{ padding: '2px 6px', fontSize: 11, cursor: idx === items.length - 1 ? 'not-allowed' : 'pointer', background: 'transparent', border: '1px solid var(--sap-border, #e2e8f0)', borderRadius: 3, opacity: idx === items.length - 1 ? 0.3 : 1 }}
                title="Move down">↓</button>
              <button onClick={() => removeLogo(idx)}
                style={{ padding: '2px 6px', fontSize: 11, cursor: 'pointer', background: 'transparent', border: '1px solid var(--sap-border, #e2e8f0)', borderRadius: 3, color: '#dc2626' }}
                title="Remove">×</button>
            </div>

            <input
              type="text"
              value={item.text || ''}
              onChange={(e) => updateItem(idx, { text: e.target.value })}
              placeholder="Brand name / alt text"
              style={{ ...inputStyle, marginBottom: 6 }}
            />

            {item.img ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <img src={item.img} alt={item.text || 'Logo'} style={{ height: 24, maxWidth: 80, objectFit: 'contain', background: '#fff', borderRadius: 3, padding: 2 }} />
                <button onClick={() => updateItem(idx, { img: '' })}
                  style={{ fontSize: 11, padding: '4px 8px', background: 'transparent', border: '1px solid var(--sap-border, #e2e8f0)', borderRadius: 4, cursor: 'pointer' }}>
                  Remove image
                </button>
              </div>
            ) : (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '6px 10px', fontSize: 11, cursor: 'pointer',
                background: '#fff', border: '1px dashed var(--sap-border, #e2e8f0)',
                borderRadius: 4, fontWeight: 600,
                color: uploadingIdx === idx ? 'var(--sap-text-muted, #64748b)' : 'var(--sap-accent, #0ea5e9)',
              }}>
                {uploadingIdx === idx ? 'Uploading…' : '📎 Upload logo image'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  disabled={uploadingIdx === idx}
                  onChange={(e) => { uploadImage(idx, e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            )}
          </div>
        ))}

        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 6, lineHeight: 1.5 }}>
          Up to 8 entries. Mix text labels and images freely.
        </div>
      </div>
    </>
  );
}

// ── FaqProperties — structured question + answer ────────────────
//
// Phase 3 inspector refactor (audit C-X-4, 21 May 2026). FAQ used
// to route through CardLikeProperties which gave members container
// style controls but no first-class way to edit the actual Q and A
// (they had to inline-edit or open the HTML editor).
//
// Now two structured fields:
//   _faqQuestion — the bold heading row
//   _faqAnswer   — the supporting body text (multi-line)
//
// Class hooks (.sp-faq-item / .sp-faq-q / .sp-faq-a / .sp-faq-toggle)
// are still emitted in the published HTML so the click-to-expand JS
// shipped earlier (audit C-C-3) continues to work unchanged.
function FaqProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // Best-effort legacy extraction: first <span> is the question
  // (inside .sp-faq-q), the .sp-faq-a div content is the answer.
  const fromLegacy = () => {
    if (!el.txt) return { q: '', a: '' };
    const qm = String(el.txt).match(/class="sp-faq-q"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/);
    const am = String(el.txt).match(/class="sp-faq-a"[^>]*>([^<]+)</);
    return {
      q: qm ? qm[1].trim() : '',
      a: am ? am[1].trim() : '',
    };
  };
  const legacy = fromLegacy();
  const [question, setQuestion] = useState(el._faqQuestion !== undefined ? el._faqQuestion : legacy.q);
  const [answer, setAnswer] = useState(el._faqAnswer !== undefined ? el._faqAnswer : legacy.a);
  const [qColor, setQColor] = useState(el._faqQColor || '#fff');
  const [aColor, setAColor] = useState(el._faqAColor || '#94a3b8');
  const [cardStyle, setCardStyle] = useState(el._faqCardStyle || 'dark');

  useEffect(() => {
    const lg = fromLegacy();
    setQuestion(el._faqQuestion !== undefined ? el._faqQuestion : lg.q);
    setAnswer(el._faqAnswer !== undefined ? el._faqAnswer : lg.a);
    setQColor(el._faqQColor || '#fff');
    setAColor(el._faqAColor || '#94a3b8');
    setCardStyle(el._faqCardStyle || 'dark');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.id]);

  const commit = (patch) => {
    updateElement(el.id, { ...patch, txt: '' });
    markDirty();
  };

  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Question</div>
        <input
          type="text"
          value={question}
          onChange={(e) => { setQuestion(e.target.value); commit({ _faqQuestion: e.target.value }); }}
          placeholder="How does this work?"
          style={inputStyle}
        />
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Answer</div>
        <textarea
          value={answer}
          onChange={(e) => { setAnswer(e.target.value); commit({ _faqAnswer: e.target.value }); }}
          placeholder="The clear, concise answer that helps your visitor."
          rows={5}
          style={{
            ...inputStyle,
            minHeight: 100,
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
        />
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          On the published page this will be hidden until a visitor clicks the question.
          In the editor we always show it so you can edit it.
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Card style</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { k: 'dark', label: 'Dark' },
            { k: 'light', label: 'Light' },
            { k: 'minimal', label: 'Minimal' },
          ].map(opt => {
            const active = cardStyle === opt.k;
            return (
              <button
                key={opt.k}
                onClick={() => {
                  // Smart-default switch (22 May 2026 follow-up): if Q/A colours
                  // are still on the OLD style's default, also update them to
                  // the NEW style's contrast-safe default. If member has
                  // customised them, respect their choice and only change card.
                  // Defaults per style:
                  //   dark    → Q #fff,     A #94a3b8 (light text for cobalt card)
                  //   light   → Q #0f172a,  A #475569 (dark text for white card)
                  //   minimal → keep whatever was there (no card, contrast comes from page bg)
                  const DEFAULTS = {
                    dark:    { q: '#fff',    a: '#94a3b8' },
                    light:   { q: '#0f172a', a: '#475569' },
                    minimal: null,
                  };
                  const oldDef = DEFAULTS[cardStyle];
                  const newDef = DEFAULTS[opt.k];
                  const patch = { _faqCardStyle: opt.k };
                  if (newDef) {
                    // Compare case-insensitively + handle short hex (#fff vs #ffffff)
                    const norm = (c) => String(c || '').toLowerCase()
                      .replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, '#$1$1$2$2$3$3');
                    if (!oldDef || norm(qColor) === norm(oldDef.q)) {
                      setQColor(newDef.q);
                      patch._faqQColor = newDef.q;
                    }
                    if (!oldDef || norm(aColor) === norm(oldDef.a)) {
                      setAColor(newDef.a);
                      patch._faqAColor = newDef.a;
                    }
                  }
                  setCardStyle(opt.k);
                  commit(patch);
                }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 600,
                  border: '1px solid ' + (active ? '#0ea5e9' : 'rgba(255,255,255,0.15)'),
                  background: active ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#22d3ee' : '#e2e8f0',
                  borderRadius: 5,
                  cursor: 'pointer',
                }}>
                {opt.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Dark for cobalt pages, Light for white pages, Minimal for no card at all.
          Switching the style auto-updates colours unless you've customised them.
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Question colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(qColor) ? qColor : '#ffffff'}
            onChange={(e) => { setQColor(e.target.value); commit({ _faqQColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={qColor}
            onChange={(e) => { setQColor(e.target.value); commit({ _faqQColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      <div style={sectionStyleLast}>
        <div style={labelStyle}>Answer colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(aColor) ? aColor : '#94a3b8'}
            onChange={(e) => { setAColor(e.target.value); commit({ _faqAColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={aColor}
            onChange={(e) => { setAColor(e.target.value); commit({ _faqAColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>
    </>
  );
}

// ── ReviewProperties — structured rating + quote + author ───────
//
// Phase 3 inspector refactor (audit C-X-4 + C-C-1, 21 May 2026).
// The headline UX win of the whole refactor: members no longer
// type ★ characters by hand. Click to set 1-5 stars.
//
// Three structured fields:
//   _rating — integer 1..5
//   _quote  — the testimonial text (multi-line)
//   _author — name + optional title ("Sarah K, Founder")
//
// Handles both 'review' and 'testimonial' element types. Their
// visual differences (accent colour, padding) come from the
// container styles in el.s which are unchanged.
function ReviewProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // Legacy extraction. Pre-Phase-3 reviews stored:
  //   <div>...<span>★★★★★</span></div>
  //   <div>"quote text"</div>
  //   <div>— author</div>
  // Extract: count stars for rating, second chunk is quote (strip
  // surrounding quotes), third chunk is author (strip leading em-dash).
  const fromLegacy = () => {
    if (!el.txt) return { rating: 5, quote: '', author: '' };
    const starMatch = String(el.txt).match(/(★+)/);
    const rating = starMatch ? Math.min(5, starMatch[1].length) : 5;
    const chunks = (String(el.txt).match(/>([^<]+)</g) || [])
      .map(m => m.slice(1, -1).trim())
      .filter(Boolean);
    // First chunk is the star string, second is quote, third is author
    const rawQuote = chunks[1] || '';
    const rawAuthor = chunks[2] || '';
    return {
      rating,
      quote: rawQuote.replace(/^["\u201C]|["\u201D]$/g, '').trim(),
      author: rawAuthor.replace(/^[—\u2014]\s*/, '').trim(),
    };
  };
  const legacy = fromLegacy();
  const [rating, setRating] = useState(el._rating !== undefined ? el._rating : legacy.rating);
  const [quote, setQuote] = useState(el._quote !== undefined ? el._quote : legacy.quote);
  const [author, setAuthor] = useState(el._author !== undefined ? el._author : legacy.author);
  const [starColor, setStarColor] = useState(el._starColor || '#fbbf24');
  const [starSize, setStarSize] = useState(el._starSize || 16);
  const [quoteColor, setQuoteColor] = useState(el._quoteColor || '#e2e8f0');
  const [authorColor, setAuthorColor] = useState(el._authorColor || '#64748b');

  useEffect(() => {
    const lg = fromLegacy();
    setRating(el._rating !== undefined ? el._rating : lg.rating);
    setQuote(el._quote !== undefined ? el._quote : lg.quote);
    setAuthor(el._author !== undefined ? el._author : lg.author);
    setStarColor(el._starColor || '#fbbf24');
    setStarSize(el._starSize || 16);
    setQuoteColor(el._quoteColor || '#e2e8f0');
    setAuthorColor(el._authorColor || '#64748b');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.id]);

  const commit = (patch) => {
    updateElement(el.id, { ...patch, txt: '' });
    markDirty();
  };

  // Star picker — click any star to set rating to that value.
  // Hover-to-preview omitted to keep the interaction simple and
  // unambiguous on touch devices.
  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Rating</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => { setRating(n); commit({ _rating: n }); }}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              style={{
                padding: '4px 8px',
                fontSize: 22,
                lineHeight: 1,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: n <= rating ? starColor : '#cbd5e1',
                transition: 'color .15s',
              }}>
              {n <= rating ? '★' : '☆'}
            </button>
          ))}
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--sap-text-muted, #64748b)', fontFamily: 'monospace' }}>
            {rating}/5
          </span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Star colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(starColor) ? starColor : '#fbbf24'}
            onChange={(e) => { setStarColor(e.target.value); commit({ _starColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={starColor}
            onChange={(e) => { setStarColor(e.target.value); commit({ _starColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Default amber #fbbf24 is the universal review-star convention
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={labelStyle}>Star size</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--sap-text-muted, #64748b)' }}>{starSize}px</span>
        </div>
        <input
          type="range" min={12} max={36} step={1}
          value={starSize}
          onChange={(e) => { const n = parseInt(e.target.value, 10); setStarSize(n); commit({ _starSize: n }); }}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Quote</div>
        <textarea
          value={quote}
          onChange={(e) => { setQuote(e.target.value); commit({ _quote: e.target.value }); }}
          placeholder="This platform is amazing!"
          rows={4}
          style={{
            ...inputStyle,
            minHeight: 80,
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        />
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Don't include quote marks — we add them automatically
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Quote colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(quoteColor) ? quoteColor : '#e2e8f0'}
            onChange={(e) => { setQuoteColor(e.target.value); commit({ _quoteColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={quoteColor}
            onChange={(e) => { setQuoteColor(e.target.value); commit({ _quoteColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Author</div>
        <input
          type="text"
          value={author}
          onChange={(e) => { setAuthor(e.target.value); commit({ _author: e.target.value }); }}
          placeholder="Sarah K, Founder"
          style={inputStyle}
        />
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Name and optional title — em-dash added automatically
        </div>
      </div>

      <div style={sectionStyleLast}>
        <div style={labelStyle}>Author colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(authorColor) ? authorColor : '#64748b'}
            onChange={(e) => { setAuthorColor(e.target.value); commit({ _authorColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={authorColor}
            onChange={(e) => { setAuthorColor(e.target.value); commit({ _authorColor: e.target.value }); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      </div>
    </>
  );
}

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
        <FontPicker
          label="Font"
          value={fontFamily.replace(/,\s*(sans-serif|serif|monospace|cursive)\s*$/i, '').replace(/^["']|["']$/g, '')}
          onChange={(name) => { setFontFamily(name); commitStyle('fontFamily', name); }}
        />
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
  // Line style — defaults to 'solid' (current behaviour for any existing
  // divider). Stored as _dividerStyle on the element; export reads it
  // to switch from background-color (solid) to border-top (dashed/dotted).
  // Audit C-L-5 (21 May 2026).
  const [lineStyle, setLineStyle] = useState(el._dividerStyle || 'solid');

  useEffect(() => {
    setColor(el.s?.background || '#334155');
    setThickness(el.h || 2);
    setLineStyle(el._dividerStyle || 'solid');
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
  const commitLineStyle = (v) => {
    setLineStyle(v);
    updateElement(el.id, { _dividerStyle: v });
    markDirty();
  };

  const styleBtnStyle = (active) => ({
    flex: 1,
    padding: '6px 10px',
    fontSize: 12,
    fontFamily: "'Sora', sans-serif",
    fontWeight: 600,
    border: '1px solid ' + (active ? '#0ea5e9' : 'rgba(255,255,255,0.15)'),
    background: active ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.04)',
    color: active ? '#22d3ee' : '#e2e8f0',
    borderRadius: 5,
    cursor: 'pointer',
  });

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
      <div style={sectionStyle}>
        <div style={labelStyle}>Style</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => commitLineStyle('solid')} style={styleBtnStyle(lineStyle === 'solid')}>Solid</button>
          <button onClick={() => commitLineStyle('dashed')} style={styleBtnStyle(lineStyle === 'dashed')}>Dashed</button>
          <button onClick={() => commitLineStyle('dotted')} style={styleBtnStyle(lineStyle === 'dotted')}>Dotted</button>
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
  // 22 May 2026 — styling controls. Pre-change every countdown shipped
  // with hardcoded styles meant for dark pages; on white member pages
  // both the digits (#fff) and labels (#64748b) were invisible.
  const [digitColor, setDigitColor] = useState(el._cdDigitColor || '#fff');
  const [digitSize, setDigitSize] = useState(el._cdDigitSize || 28);
  const [labelColor, setLabelColor] = useState(el._cdLabelColor || '#64748b');
  // Canvas always rendered 13px labels; export shipped 10px. Default
  // here matches the canvas's pre-change look since that's what the
  // editor was always showing. Existing published pages preserved by
  // the export-side `!== undefined ? : 10` default.
  const [labelSize, setLabelSize] = useState(el._cdLabelSize !== undefined ? el._cdLabelSize : 13);
  const [cardStyle, setCardStyle] = useState(el._cdCardStyle || 'card');
  const [fontFamily, setFontFamily] = useState(el._cdFontFamily || 'Sora,sans-serif');

  useEffect(() => {
    setDate(el._targetDate || '');
    setDigitColor(el._cdDigitColor || '#fff');
    setDigitSize(el._cdDigitSize || 28);
    setLabelColor(el._cdLabelColor || '#64748b');
    setLabelSize(el._cdLabelSize !== undefined ? el._cdLabelSize : 13);
    setCardStyle(el._cdCardStyle || 'card');
    setFontFamily(el._cdFontFamily || 'Sora,sans-serif');
  }, [el.id]);

  const commitDate = (v) => {
    setDate(v);
    updateElement(el.id, { _targetDate: v });
    markDirty();
  };
  const commitField = (patch) => {
    updateElement(el.id, patch);
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

  // Common font family options — limited to the ones already loaded
  // by the funnel page template so members don't pick something that
  // silently falls back to system serif.
  const FONT_OPTIONS = [
    { value: 'Sora,sans-serif', label: 'Sora (default)' },
    { value: 'Inter,sans-serif', label: 'Inter' },
    { value: 'Georgia,serif', label: 'Georgia' },
    { value: 'monospace', label: 'Monospace' },
  ];

  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Target date &amp; time</div>
        <input
          type="datetime-local"
          value={date}
          onChange={e => commitDate(e.target.value)}
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

      <div style={sectionStyle}>
        <div style={labelStyle}>Card style</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { k: 'card', label: 'Card' },
            { k: 'minimal', label: 'Minimal' },
          ].map(opt => {
            const active = cardStyle === opt.k;
            return (
              <button
                key={opt.k}
                onClick={() => { setCardStyle(opt.k); commitField({ _cdCardStyle: opt.k }); }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 600,
                  border: '1px solid ' + (active ? '#0ea5e9' : 'rgba(255,255,255,0.15)'),
                  background: active ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#22d3ee' : '#e2e8f0',
                  borderRadius: 5,
                  cursor: 'pointer',
                }}>
                {opt.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Card adds a subtle background tile around each digit. Minimal strips it.
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Digit colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(digitColor) ? digitColor : '#ffffff'}
            onChange={e => { setDigitColor(e.target.value); commitField({ _cdDigitColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={digitColor}
            onChange={e => { setDigitColor(e.target.value); commitField({ _cdDigitColor: e.target.value }); }}
            placeholder="#ffffff"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          On white pages, try a dark slate like #0f172a
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={labelStyle}>Digit size</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--sap-text-muted, #64748b)' }}>{digitSize}px</span>
        </div>
        <input
          type="range" min={18} max={72} step={1}
          value={digitSize}
          onChange={e => { const n = parseInt(e.target.value, 10); setDigitSize(n); commitField({ _cdDigitSize: n }); }}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Label colour</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="color"
            value={(/^#[0-9a-f]{6}$/i).test(labelColor) ? labelColor : '#64748b'}
            onChange={e => { setLabelColor(e.target.value); commitField({ _cdLabelColor: e.target.value }); }}
            style={{
              width: 32, height: 28, padding: 0,
              border: '1px solid var(--sap-border, #e2e8f0)',
              borderRadius: 5, cursor: 'pointer', background: 'transparent',
            }}
          />
          <input
            type="text"
            value={labelColor}
            onChange={e => { setLabelColor(e.target.value); commitField({ _cdLabelColor: e.target.value }); }}
            placeholder="#64748b"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--sap-text-muted, #64748b)', marginTop: 4, lineHeight: 1.4 }}>
          Colour of "DAYS", "HRS", "MIN", "SEC" labels below the digits
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={labelStyle}>Label size</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--sap-text-muted, #64748b)' }}>{labelSize}px</span>
        </div>
        <input
          type="range" min={9} max={20} step={1}
          value={labelSize}
          onChange={e => { const n = parseInt(e.target.value, 10); setLabelSize(n); commitField({ _cdLabelSize: n }); }}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sectionStyle}>
        <FontPicker
          label="Font family"
          value={fontFamily.replace(/,\s*(sans-serif|serif|monospace|cursive)\s*$/i, '').replace(/^["']|["']$/g, '')}
          onChange={(name) => { setFontFamily(name); commitField({ _cdFontFamily: name }); }}
        />
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
  // _iconOpacity (22 May 2026) — was hardcoded 0.7 in canvas only.
  const [iconOpacity, setIconOpacity] = useState(el._iconOpacity !== undefined ? el._iconOpacity : 1.0);
  // _iconSize (22 May 2026 follow-up) — was hardcoded 22px so resizing
  // the element box did nothing visible. Now a slider.
  const [iconSize, setIconSize] = useState(el._iconSize || 22);

  useEffect(() => {
    setLinks(normalise(el._links));
    setIconColor(el._iconColor || '#94a3b8');
    setIconOpacity(el._iconOpacity !== undefined ? el._iconOpacity : 1.0);
    setIconSize(el._iconSize || 22);
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

  const commitOpacity = (v) => {
    setIconOpacity(v);
    updateElement(el.id, { _iconOpacity: v });
    markDirty();
  };

  const commitSize = (v) => {
    setIconSize(v);
    updateElement(el.id, { _iconSize: v });
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

      <div style={sectionStyle}>
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

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={labelStyle}>Icon size</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--sap-text-muted, #64748b)' }}>{iconSize}px</span>
        </div>
        <input
          type="range" min={16} max={48} step={1}
          value={iconSize}
          onChange={e => commitSize(parseInt(e.target.value, 10))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sectionStyleLast}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={labelStyle}>Icon opacity</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--sap-text-muted, #64748b)' }}>{Math.round(iconOpacity * 100)}%</span>
        </div>
        <input
          type="range" min={0.3} max={1} step={0.05}
          value={iconOpacity}
          onChange={e => commitOpacity(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{
          marginTop: 6,
          fontSize: 10, color: 'var(--sap-text-muted, #94a3b8)',
          lineHeight: 1.4,
        }}>
          100% = full strength brand colour. Lower values for subtle/faded looks.
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
  // 25 May 2026: deliberate font picks flag _fontExplicit so the
  // renderer treats them as overrides. Page-level Body Font changes
  // pass over flagged elements.
  const commitFontFamily = (v) => {
    setFontFamily(v);
    updateElementStyle(el.id, { fontFamily: v, _fontExplicit: true });
    markDirty();
  };
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
        <FontPicker
          label="Font family"
          value={fontFamily.replace(/,\s*(sans-serif|serif|monospace|cursive)\s*$/i, '').replace(/^["']|["']$/g, '')}
          onChange={(name) => commitFontFamily(name)}
        />
        <div style={{ height: 8 }} />

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
//   audio: el.txt = src URL (was el._audioUrl pre-21-May-2026; either
//          key is read for backward compatibility)
//          el.s.borderRadius = corner roundness
//
// Source detection for video:
//   - URL contains 'youtube' or 'vimeo' → iframe mode (no MP4 controls)
//   - URL ends in .mp4 / .webm / .ogg, or _isMP4 flag is set → MP4 mode
//   - Empty URL → both panels offered, fields disabled until source picked
function MediaProperties({ el, updateElement, updateElementStyle, markDirty }) {
  // ── Source URL state ─────────────────────────────────────────
  // All three media types (image, video, audio) store source URL in
  // el.txt. Older audio elements may have stored URL in el._audioUrl
  // before the 21 May 2026 normalisation (audit C-M-5); we read from
  // either but always write to el.txt going forward. _audioUrl is
  // no longer written; existing data passes through unchanged until
  // the member re-saves, at which point it converges to the new shape.
  const srcKey = 'txt';
  const initialSrc = el.type === 'audio' ? (el.txt || el._audioUrl || '') : (el.txt || '');
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

  // YouTube branding controls (20 May 2026 — Steve flag).
  // YouTube prohibits *fully* removing their branding from embeds in
  // their TOS, but they DO provide query-string flags that reduce
  // it significantly. We expose them as toggles:
  //   _ytModestBranding (default ON) — modestbranding=1, hides the
  //     YouTube watermark from the bottom-right of the player chrome.
  //   _ytHideRelated   (default ON) — rel=0, stops the wall of
  //     unrelated videos at the end.
  //   _ytHideControls  (default OFF) — controls=0, hides the whole
  //     player control bar. Aggressive; only useful for autoplay
  //     visuals where the user shouldn't pause/scrub.
  //   _ytFacade        (default OFF) — replaces the embed with a
  //     clean thumbnail + custom play button until clicked. Hides
  //     ALL YouTube branding until play. Massive perf win too
  //     (page doesn't load YouTube's ~600KB player until needed).
  // Defaults chosen so existing pages get the modest+rel=0 cleanup
  // automatically (a sensible polish bump) without changing
  // anything dramatic.
  const [ytModestBranding, setYtModestBranding] = useState(el._ytModestBranding !== false);
  const [ytHideRelated, setYtHideRelated] = useState(el._ytHideRelated !== false);
  const [ytHideControls, setYtHideControls] = useState(!!el._ytHideControls);
  const [ytFacade, setYtFacade] = useState(!!el._ytFacade);

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
    setSrc(el.type === 'audio' ? (el.txt || el._audioUrl || '') : (el.txt || ''));
    setImageAlt(el._imageAlt || '');
    setImageFit(el._imageFit || 'cover');
    setImageRadius(parseInt((el.s?.borderRadius || '12px'), 10) || 12);
    setVideoAutoplay(el._videoAutoplay !== false);
    setVideoLoop(el._videoLoop !== false);
    setVideoMuted(el._videoMuted !== false);
    setVideoControls(!!el._videoControls);
    setYtModestBranding(el._ytModestBranding !== false);
    setYtHideRelated(el._ytHideRelated !== false);
    setYtHideControls(!!el._ytHideControls);
    setYtFacade(!!el._ytFacade);
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
            <>
              {/* YouTube specifically — show real branding controls.
                  Vimeo has different query params and is less of a
                  branding-noise problem in practice, so we treat it
                  with the simpler hint below. */}
              {/youtube\.com|youtu\.be/i.test(src) ? (
                <>
                  <ToggleRow
                    label="Hide YouTube logo (modest branding)"
                    hint="Suppresses the YouTube watermark in the player chrome. YouTube still shows their logo on the play button — they prohibit full removal in their TOS."
                    value={ytModestBranding}
                    onChange={v => {
                      setYtModestBranding(v);
                      updateElement(el.id, { _ytModestBranding: v });
                      markDirty();
                    }}
                  />
                  <ToggleRow
                    label="Hide related videos at end"
                    hint="Stops the wall of suggested videos that normally appears when the video finishes."
                    value={ytHideRelated}
                    onChange={v => {
                      setYtHideRelated(v);
                      updateElement(el.id, { _ytHideRelated: v });
                      markDirty();
                    }}
                  />
                  <ToggleRow
                    label="Hide player controls"
                    hint="Removes the play/pause/scrub bar entirely. Use only with autoplay or as a background visual — viewers can't interact otherwise."
                    value={ytHideControls}
                    onChange={v => {
                      setYtHideControls(v);
                      updateElement(el.id, { _ytHideControls: v });
                      markDirty();
                    }}
                  />
                  <ToggleRow
                    label="Use clean thumbnail until clicked (facade)"
                    hint="Replace the embed with a custom thumbnail and play button. Visitors see no YouTube branding until they hit play. Loads ~600KB faster too."
                    value={ytFacade}
                    onChange={v => {
                      setYtFacade(v);
                      updateElement(el.id, { _ytFacade: v });
                      markDirty();
                    }}
                  />
                </>
              ) : (
                <div style={{
                  fontSize: 11, color: 'var(--sap-text-muted, #64748b)',
                  padding: '8px 10px',
                  background: 'var(--sap-bg-elevated, #f8fafc)',
                  border: '1px solid var(--sap-border-faint, #e2e8f0)',
                  borderRadius: 6, lineHeight: 1.4,
                }}>
                  Vimeo / other embed: playback controlled by the platform. Embed-side defaults are auto-tuned at export.
                </div>
              )}
            </>
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
      {/* Form container — background, padding, radius, border.
          Added 20 May 2026 (Steve flag): the form's outer wrapper
          had a hardcoded grey-translucent default
          (rgba(15,23,41,0.4) — see elementDefaults.js form entry)
          with a 1px cobalt border, and no UI control to change
          either. ContainerSection now exposes background+opacity
          and (with includeBorder=true) the 1px outline too, so
          members can make the form fully transparent without the
          ghost outline showing through. */}
      <ContainerSection
        el={el}
        updateElementStyle={updateElementStyle}
        markDirty={markDirty}
        includeAccentStripe={false}
        includeBorder={true}
        lastSection={false}
      />

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
export default function ElementInspectorPanel({ el, updateElement, updateElementStyle, markDirty, pageSettings, setPageSettings, pageStatus, setPageStatus, onPageHeadingFontChange, onPageBodyFontChange, onDuplicate, onDelete, onToggleLock }) {
  // No-selection state — show the full set of page-level settings.
  // Steve's call 22 May 2026: 'we have added those same setting
  // features in the new left side panel' → so consolidate the
  // Settings modal here and remove the modal entirely. The inspector
  // is now the definitive page-settings surface; the topbar Settings
  // button is gone.
  if (!el) {
    const ps = pageSettings || { title: '', metaDescription: '', slug: '', ogImage: '' };
    const update = (patch) => {
      if (setPageSettings) setPageSettings(p => ({ ...p, ...patch }));
      if (markDirty) markDirty();
    };
    const updateStatus = (next) => {
      if (setPageStatus) setPageStatus(next);
      if (markDirty) markDirty();
    };
    // Derive the current slug fragment that the member can edit
    // (the part after /p/username/). Matches the same logic the
    // old Settings modal used, so saved pages are unchanged.
    const slugFragment = ps.customSlug !== undefined
      ? ps.customSlug
      : (ps.slug ? ps.slug.split('/').pop() : '');
    const isPublished = pageStatus === 'published';

    const sectionLabelStyle = {
      fontSize: 10, fontWeight: 800,
      color: 'rgba(255,255,255,0.55)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      marginBottom: 6, marginTop: 14,
    };
    const psInputStyle = {
      width: '100%',
      padding: '7px 10px',
      border: '1px solid #0a1438',
      borderRadius: 6,
      fontSize: 12,
      color: '#0f172a',
      background: '#ffffff',
      outline: 'none',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
    };
    const comingSoonBtnStyle = {
      width: '100%',
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 6,
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12, fontWeight: 600,
      textAlign: 'left',
      cursor: 'not-allowed',
      fontFamily: 'inherit',
      marginBottom: 6,
      opacity: 0.65,
    };
    const comingSoonNote = (
      <span style={{
        marginLeft: 'auto',
        fontSize: 9, fontWeight: 700,
        color: '#22d3ee',
        background: 'rgba(34,211,238,0.12)',
        border: '1px solid rgba(34,211,238,0.3)',
        borderRadius: 4,
        padding: '1px 6px',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>Soon</span>
    );

    return (
      <div className="ins-cobalt" style={{
        padding: '14px 16px',
        height: '100%',
        overflowY: 'auto',
        fontFamily: 'inherit',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{
            fontSize: 10, fontWeight: 800,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 4,
          }}>Page settings</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            No element selected. Click any block on the canvas to edit it, or adjust page-wide settings below.
          </div>
        </div>

        {/* Status — draft / published */}
        <div style={sectionLabelStyle}>Status</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => updateStatus('draft')}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 6,
              fontSize: 11, fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              border: '1px solid ' + (!isPublished ? '#0ea5e9' : 'rgba(255,255,255,0.15)'),
              background: !isPublished ? 'rgba(14,165,233,0.16)' : 'rgba(255,255,255,0.04)',
              color: !isPublished ? '#22d3ee' : '#e2e8f0',
            }}>
            Draft
          </button>
          <button
            onClick={() => updateStatus('published')}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 6,
              fontSize: 11, fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              border: '1px solid ' + (isPublished ? '#10b981' : 'rgba(255,255,255,0.15)'),
              background: isPublished ? 'rgba(16,185,129,0.16)' : 'rgba(255,255,255,0.04)',
              color: isPublished ? '#34d399' : '#e2e8f0',
            }}>
            Published
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 6, lineHeight: 1.4 }}>
          {isPublished ? 'Live and visible to visitors.' : 'Only you can see this page until you publish.'}
        </div>

        {/* Page title */}
        <div style={sectionLabelStyle}>Page title</div>
        <input
          value={ps.title || ''}
          onChange={e => update({ title: e.target.value })}
          placeholder="My landing page"
          style={psInputStyle}
        />

        {/* URL slug */}
        <div style={sectionLabelStyle}>URL slug</div>
        <input
          value={slugFragment}
          onChange={e => update({ customSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-') })}
          placeholder="my-page"
          style={{ ...psInputStyle, fontFamily: 'monospace' }}
        />
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.4 }}>
          /p/your-username/{slugFragment || 'my-page'}
        </div>

        {/* SEO description */}
        <div style={sectionLabelStyle}>SEO description</div>
        <textarea
          value={ps.metaDescription || ''}
          onChange={e => update({ metaDescription: e.target.value })}
          placeholder="Short description for search engines and social previews"
          rows={3}
          style={{ ...psInputStyle, resize: 'vertical', minHeight: 56, fontFamily: 'inherit', lineHeight: 1.5 }}
        />

        {/* OG image — social share preview */}
        <div style={sectionLabelStyle}>Social share image</div>
        <input
          value={ps.ogImage || ''}
          onChange={e => update({ ogImage: e.target.value })}
          placeholder="https://..."
          style={psInputStyle}
        />
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.4 }}>
          Shown when your page is shared on Facebook, LinkedIn, etc.
        </div>

        {/* Typography — page-wide font choices. Stored on
            pageSettings.typography. The published-page export reads
            this and emits a <link rel=stylesheet> to Google Fonts
            plus CSS variables (--page-font-heading, --page-font-body,
            --page-font-base-size). Element types pick these up via
            their stylesheet defaults unless they have an explicit
            override (per-element font controls still win).
            Built 22 May 2026. */}
        <div style={sectionLabelStyle}>Typography</div>
        <div style={{
          padding: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
        }}>
          <FontPicker
            label="Heading font"
            value={(ps.typography && ps.typography.heading) || ''}
            onChange={(name) => {
              update({ typography: { ...(ps.typography || {}), heading: name } });
              // Notify parent so it can clear hardcoded fontFamily on
              // existing heading elements that were still on the
              // previous default (or previous typography choice).
              // Without this the picker silently does nothing on
              // existing headings.
              if (onPageHeadingFontChange) onPageHeadingFontChange(name);
            }}
          />
          <div style={{ height: 10 }} />
          <FontPicker
            label="Body font"
            value={(ps.typography && ps.typography.body) || ''}
            onChange={(name) => {
              update({ typography: { ...(ps.typography || {}), body: name } });
              if (onPageBodyFontChange) onPageBodyFontChange(name);
            }}
          />

          {/* Base size slider */}
          <div style={{
            fontSize: 10, fontWeight: 800,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginTop: 14, marginBottom: 6,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Body size</span>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>
              {((ps.typography && ps.typography.baseSize) || 16)}px
            </span>
          </div>
          <input
            type="range"
            min={14} max={20} step={1}
            value={(ps.typography && ps.typography.baseSize) || 16}
            onChange={e => update({ typography: { ...(ps.typography || {}), baseSize: parseInt(e.target.value, 10) } })}
            style={{ width: '100%' }}
          />

          {/* Heading scale */}
          <div style={{
            fontSize: 10, fontWeight: 800,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginTop: 14, marginBottom: 6,
          }}>Heading scale</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { k: 'compact', label: 'Compact' },
              { k: 'normal', label: 'Normal' },
              { k: 'large', label: 'Large' },
            ].map(opt => {
              const active = ((ps.typography && ps.typography.headingScale) || 'normal') === opt.k;
              return (
                <button
                  key={opt.k}
                  onClick={() => update({ typography: { ...(ps.typography || {}), headingScale: opt.k } })}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: 11, fontWeight: 700,
                    border: '1px solid ' + (active ? '#0ea5e9' : 'rgba(255,255,255,0.15)'),
                    background: active ? 'rgba(14,165,233,0.16)' : 'rgba(255,255,255,0.04)',
                    color: active ? '#22d3ee' : '#e2e8f0',
                    borderRadius: 5,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.4 }}>
            Bumps all heading sizes proportionally.
          </div>
        </div>

        {/* Analytics & tracking scripts — page-level pixel/analytics
            management. Page owners paste their provider ID once and
            the published page injects the right snippet in <head>.
            Built 22 May 2026.
            Storage: pageSettings.scripts = { ga4, metaPixel, gtm,
            tiktokPixel, clarity, customHead, customBody,
            advancedEnabled }. Backend reads this from the same
            gjs_css JSON blob the rest of pageSettings lives in. */}
        <div style={sectionLabelStyle}>Analytics & tracking</div>
        <ScriptsPanel
          scripts={ps.scripts || {}}
          onChange={(next) => update({ scripts: next })}
        />

        {/* Coming-soon advanced features — Custom domain only (Custom
            scripts moved out of this group above). */}
        <div style={sectionLabelStyle}>Advanced</div>
        <div style={comingSoonBtnStyle} title="Coming soon">
          <span style={{ color: '#22d3ee', fontSize: 14, display: 'inline-flex', alignItems: 'center' }}>↗</span>
          <span>Custom domain</span>
          {comingSoonNote}
        </div>

        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 12, lineHeight: 1.5 }}>
          Changes save when you click Save in the top bar.
        </div>
      </div>
    );
  }

  // Type label for the header
  const typeLabel = el.type.charAt(0).toUpperCase() + el.type.slice(1);

  return (
    <div className="ins-cobalt" style={{
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
      ) : el.type === 'stat' ? (
        // Phase 3 inspector refactor: stat now has its own dedicated
        // panel with structured _statValue / _statLabel / _statColor
        // fields. See StatProperties for the full reasoning. Audit C-X-4.
        <StatProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'faq' ? (
        // Phase 3 inspector refactor: FAQ has structured
        // _faqQuestion + _faqAnswer fields. Audit C-X-4.
        <FaqProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : ['review', 'testimonial'].includes(el.type) ? (
        // Phase 3 inspector refactor: review and testimonial share
        // the same ReviewProperties panel — structured rating, quote,
        // author fields. Audit C-X-4 + C-C-1.
        <ReviewProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'progress' ? (
        <ProgressProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'badge' ? (
        <BadgeProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'separator' ? (
        // Phase 3 inspector refactor: separator has structured
        // _separatorSymbol + _separatorColor fields. Audit C-X-4.
        <SeparatorProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'icontext' ? (
        // Phase 3 inspector refactor: icontext has structured
        // _icon + _iconHeading + _iconDescription fields. Audit C-X-4.
        <IconTextProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'logostrip' ? (
        // Phase 3 inspector refactor: logostrip has structured
        // _logoHeader + _logos[] fields with per-row image upload.
        // Audit C-X-4 + C-L-2.
        <LogostripProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
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
