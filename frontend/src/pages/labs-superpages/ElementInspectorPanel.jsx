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
          Phase 2B: Announcement Banner — own component with dismissible + sticky toggles (20 May 2026)
          Remaining 21 types fall back to the placeholder note pointing at the legacy modal. */}
      {el.type === 'button' ? (
        <ButtonProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : el.type === 'announcement' ? (
        <BannerProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : ['heading', 'text', 'label'].includes(el.type) ? (
        <TextTypeProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : (
        <UnsupportedTypeNote type={el.type} />
      )}
    </div>
  );
}
