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
          Phase 1 supports Button only; other types show the placeholder.
          Phase 2 (next session) ports each type to its own ButtonProperties-style component. */}
      {el.type === 'button' ? (
        <ButtonProperties el={el} updateElement={updateElement} updateElementStyle={updateElementStyle} markDirty={markDirty} />
      ) : (
        <UnsupportedTypeNote type={el.type} />
      )}
    </div>
  );
}
