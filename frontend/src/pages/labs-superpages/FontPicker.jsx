/*
  FontPicker — popover dropdown for picking a Google Font.

  Built 22 May 2026 for the Typography section of the inspector.
  Steve's brief: full Google Fonts library (~1800 fonts), inline +
  popover picker (the standard pattern Figma/Notion/Webflow use).

  Behaviour:
  - Renders as a button showing the current selection
  - Click opens a popover anchored below the button
  - Inside: search field at top, optional category filter pills,
    then a scrollable list of fonts
  - Each list item renders the font name *in that font* (live
    preview) via lazy-loaded Google Fonts stylesheets — only
    fonts that are actually in the visible viewport request
    their CSS, so opening the picker doesn't slam Google with
    1800 simultaneous requests
  - Selecting a font calls onChange(name) and closes the popover
  - Esc or outside-click closes the popover

  Persistence: the picker only stores/exposes the font name as a
  string (e.g. "Playfair Display"). The font is loaded both in
  the editor preview (so the canvas reflects the choice
  immediately) and in the published page export (via
  <link href="fonts.googleapis.com/css2?family=...">).
*/
import { useState, useEffect, useRef, useMemo } from 'react';
import FONTS from './google-fonts.json';

// Track which fonts we've requested the stylesheet for, so we
// don't load the same font multiple times across pickers.
const LOADED_FONTS = new Set();

/**
 * Load a Google Font stylesheet so the browser can render text in it.
 * Idempotent — calling with the same name does nothing on the second
 * call. Uses the css2 endpoint which returns optimised modern font
 * formats (woff2).
 */
export function loadGoogleFont(name) {
  if (!name || LOADED_FONTS.has(name)) return;
  LOADED_FONTS.add(name);
  // Replace spaces with + for the URL. Family params with weights
  // omitted → Google returns the default weight (usually 400 + 700).
  const urlName = name.replace(/\s+/g, '+');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${urlName}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

// Categories presented in a friendlier order (most-likely first).
const CATEGORY_ORDER = ['Sans Serif', 'Serif', 'Display', 'Handwriting', 'Monospace'];
const CATEGORY_LABELS = {
  'Sans Serif': 'Sans',
  'Serif': 'Serif',
  'Display': 'Display',
  'Handwriting': 'Script',
  'Monospace': 'Mono',
};

// CSS family value with sensible fallback so when Google Fonts is
// blocked or slow the page still looks intentional.
export function fontStack(name, category) {
  if (!name) return 'inherit';
  const cat = (category || '').toLowerCase();
  let fallback = 'sans-serif';
  if (cat.includes('serif') && !cat.includes('sans')) fallback = 'Georgia, serif';
  else if (cat.includes('mono')) fallback = 'ui-monospace, monospace';
  else if (cat.includes('display')) fallback = 'sans-serif';
  else if (cat.includes('hand')) fallback = 'cursive';
  return `"${name}", ${fallback}`;
}

/**
 * IntersectionObserver wrapper that loads each font when its row
 * scrolls into view. One IO instance shared across all rows.
 */
function FontRow({ font, isActive, onPick, observer, observerRefs }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !observer) return;
    el.dataset.fontName = font.f;
    observerRefs.current.set(el, font.f);
    observer.observe(el);
    return () => {
      observer.unobserve(el);
      observerRefs.current.delete(el);
    };
  }, [font.f, observer, observerRefs]);

  return (
    <button
      ref={ref}
      onClick={() => onPick(font.f, font.c)}
      style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 8,
        padding: '9px 12px',
        background: isActive ? 'rgba(14,165,233,0.12)' : 'transparent',
        border: '1px solid ' + (isActive ? 'rgba(14,165,233,0.4)' : 'transparent'),
        borderRadius: 6,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#eef4fb'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{
        fontFamily: fontStack(font.f, font.c),
        fontSize: 16,
        color: isActive ? '#22d3ee' : '#0f172a',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flex: 1,
      }}>
        {font.f}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: 'rgba(15,23,42,0.45)',
        letterSpacing: '0.04em', textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {CATEGORY_LABELS[font.c] || font.c}
      </span>
    </button>
  );
}

export default function FontPicker({ value, onChange, label, defaultCategory }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const observerRefs = useRef(new Map());

  // Lazy-load font preview when row scrolls into viewport
  const observer = useMemo(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return null;
    return new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const name = observerRefs.current.get(entry.target);
          if (name) loadGoogleFont(name);
        }
      });
    }, { rootMargin: '100px 0px' });
  }, []);

  useEffect(() => () => { observer && observer.disconnect(); }, [observer]);

  // Close on click-outside / Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Focus search when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveCategory('all');
      setTimeout(() => searchInputRef.current && searchInputRef.current.focus(), 50);
    }
  }, [open]);

  // Preload the currently selected font so the trigger renders in it
  useEffect(() => {
    if (value) loadGoogleFont(value);
  }, [value]);

  // Filtered list. Search is case-insensitive substring.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FONTS.filter(f => {
      if (activeCategory !== 'all' && f.c !== activeCategory) return false;
      if (q && !f.f.toLowerCase().includes(q)) return false;
      return true;
    }).slice(0, 250); // cap to 250 results — search beyond that returns 'too broad'
  }, [query, activeCategory]);

  // The font's category, used in the trigger preview
  const currentCategory = useMemo(() => {
    if (!value) return null;
    const found = FONTS.find(f => f.f === value);
    return found ? found.c : null;
  }, [value]);

  const handlePick = (name, category) => {
    onChange && onChange(name, category);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <div style={{
          fontSize: 10, fontWeight: 800,
          color: '#4d648c',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: 6,
        }}>{label}</div>
      )}

      {/* Trigger button — shows current font in its own face */}
      <button
        onClick={() => setOpen(v => !v)} className="sp-tb-pill"
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
          padding: '8px 12px',
          background: '#ffffff',
          border: '1px solid #0a1438',
          borderRadius: 6,
          color: '#0f172a',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}>
        <span style={{
          fontFamily: fontStack(value, currentCategory),
          fontSize: 14,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {value || 'Pick a font…'}
        </span>
        <span style={{ color: '#64748b', fontSize: 11, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          minWidth: 260,
          background: '#ffffff',
          border: '1px solid #0a1438',
          borderRadius: 8,
          boxShadow: '0 12px 32px rgba(0,0,0,0.4), 0 4px 10px rgba(0,0,0,0.25)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 360,
          overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: 8, borderBottom: '1px solid #c5d7ef', flexShrink: 0 }}>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search fonts…"
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: 5,
                fontSize: 12,
                outline: 'none',
                color: '#0f172a',
                background: '#f8fafc',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />

            {/* Category pills */}
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { k: 'all', label: 'All' },
                ...CATEGORY_ORDER.map(c => ({ k: c, label: CATEGORY_LABELS[c] || c })),
              ].map(({ k, label }) => {
                const active = activeCategory === k;
                return (
                  <button
                    key={k}
                    onClick={() => setActiveCategory(k)}
                    style={{
                      padding: '3px 8px',
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                      border: '1px solid ' + (active ? '#0ea5e9' : '#e2e8f0'),
                      background: active ? 'rgba(14,165,233,0.1)' : '#ffffff',
                      color: active ? '#0284c7' : '#64748b',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable font list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px 12px', color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
                No fonts match — try a different search.
              </div>
            ) : (
              filtered.map(font => (
                <FontRow
                  key={font.f}
                  font={font}
                  isActive={font.f === value}
                  onPick={handlePick}
                  observer={observer}
                  observerRefs={observerRefs}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '6px 12px',
            borderTop: '1px solid #c5d7ef',
            fontSize: 10, color: '#94a3b8',
            flexShrink: 0,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>{filtered.length === 250 ? '250+ matches — refine search' : `${filtered.length} font${filtered.length === 1 ? '' : 's'}`}</span>
            <span>Powered by Google Fonts</span>
          </div>
        </div>
      )}
    </div>
  );
}
