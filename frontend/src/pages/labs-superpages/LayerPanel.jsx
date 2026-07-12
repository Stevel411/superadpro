import { useState } from 'react';
import { Type, AlignLeft, Tag, ImageIcon, Play, Music, RectangleHorizontal, FormInput, Bell,
  MessageSquareQuote, Star, Quote, HelpCircle, BarChart3, Minus,
  Timer, Share2, FileText, SeparatorHorizontal, LayoutGrid, MoveVertical, Square, GripHorizontal, Code,
  Lock, Unlock, ChevronUp, ChevronDown, X, Eye, EyeOff } from 'lucide-react';

// Map element type → icon for the layer-list row.
const ROW_ICONS = {
  heading: Type, text: AlignLeft, label: Tag,
  image: ImageIcon, video: Play, audio: Music,
  button: RectangleHorizontal, form: FormInput, announcement: Bell,
  review: MessageSquareQuote, badge: Star, testimonial: Quote, faq: HelpCircle, stat: BarChart3, progress: Minus,
  countdown: Timer, socialicons: Share2, icontext: FileText, separator: SeparatorHorizontal, logostrip: LayoutGrid, spacer: MoveVertical, box: Square, divider: GripHorizontal, embed: Code,
};

// Resolve a short, human-readable label for each element. Prefers the
// element's actual text content (first 28 chars) — falls back to the
// type when text is empty or HTML-only.
function rowLabel(el) {
  const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const text = stripHtml(el.txt);
  if (text) return text.length > 28 ? text.slice(0, 28) + '…' : text;
  const typeLabels = {
    heading: 'Heading', text: 'Text', label: 'Label',
    image: 'Image', video: 'Video', audio: 'Audio',
    button: 'Button', form: 'Opt-In form', announcement: 'Banner',
    review: 'Review', badge: 'Badge', testimonial: 'Testimonial', faq: 'FAQ',
    stat: 'Stat', progress: 'Progress',
    countdown: 'Countdown', socialicons: 'Social links', icontext: 'Icon + text',
    separator: 'Separator', logostrip: 'Logos', spacer: 'Spacer', box: 'Box',
    divider: 'Divider', embed: 'Embed',
  };
  return typeLabels[el.type] || el.type;
}

// ═══════════════════════════════════════════════════════════════
// LayerPanel — floating dockable list of all canvas elements
// ═══════════════════════════════════════════════════════════════
//
// Modeled on the Figma/Webflow layers panel but compacted to a
// floating window that members open from the topbar Layers button.
//
// Features (all wired to existing editor APIs):
//   - Click row to select
//   - Shift-click for multi-select (delegates to toggleSelectAdditive)
//   - ↑/↓ buttons reorder z-index (moveElementZ +1 / -1)
//   - 🔒/🔓 toggles locked state
//   - 👁 toggles hidden state (stored on el.hidden, exportHTML ignores)
//   - Element type icon + truncated text content for quick scanning
//
// Props:
//   open                    — bool, visibility
//   onClose                 — close handler
//   els                     — array of elements
//   selId / selIds          — current selection
//   selectElement / toggleSelectAdditive
//   updateElement           — to toggle locked/hidden
//   moveElementZ            — z-index reorder
//   markDirty               — flag changes for save

export default function LayerPanel({ open, onClose, els, selId, selIds, selectElement, toggleSelectAdditive, updateElement, moveElementZ, markDirty }) {
  if (!open) return null;

  // Show layers in TOP-OF-PAGE-FIRST order. els array stores draw order
  // (later = on top in z-index). The most-recently-added/topmost
  // elements should appear at the TOP of the layer list — Figma
  // convention — so we reverse here.
  const ordered = [...els].reverse();

  return (
    <div
      style={{
        position: 'absolute',
        top: 78,           // sits below the editor topbar
        left: 18,
        width: 268,
        maxHeight: 'calc(100vh - 220px)',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        border: '1px solid rgba(200,16,46,0.18)',
        borderRadius: 14,
        boxShadow:
          '0 4px 16px rgba(200,16,46,0.12), ' +
          '0 14px 36px rgba(18,56,143,0.14), ' +
          'inset 0 1px 0 rgba(255,255,255,1)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid rgba(15,23,42,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#94a3b8',
            marginBottom: 2,
          }}>Layers</div>
          <div style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 13,
            fontWeight: 900,
            color: '#0f172a',
            letterSpacing: '-0.01em',
          }}>{els.length} {els.length === 1 ? 'element' : 'elements'}</div>
        </div>
        <button onClick={onClose}
          aria-label="Close layers"
          style={{
            width: 26, height: 26, borderRadius: 7, border: 'none',
            background: 'rgba(15,23,42,0.05)',
            color: '#475569', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <X size={13}/>
        </button>
      </div>

      {/* Element list */}
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '6px 4px' }}>
        {ordered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
            No elements yet
          </div>
        )}
        {ordered.map((el, i) => {
          const Icon = ROW_ICONS[el.type] || Square;
          const isPrimary = el.id === selId;
          const isMulti = selIds && selIds.has(el.id) && !isPrimary;
          const isFirst = i === 0;                  // topmost in list = LAST in els (highest z)
          const isLast = i === ordered.length - 1;  // bottom of list = FIRST in els (lowest z)
          return (
            <div
              key={el.id}
              onClick={(e) => {
                if (e.shiftKey && toggleSelectAdditive) toggleSelectAdditive(el.id);
                else selectElement(el.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                margin: '2px 4px',
                borderRadius: 8,
                cursor: 'pointer',
                background: isPrimary
                  ? 'linear-gradient(135deg, rgba(200,16,46,0.12), rgba(200,16,46,0.06))'
                  : isMulti
                    ? 'rgba(18,56,143,0.08)'
                    : 'transparent',
                border: isPrimary
                  ? '1px solid rgba(200,16,46,0.3)'
                  : isMulti
                    ? '1px dashed rgba(18,56,143,0.35)'
                    : '1px solid transparent',
                opacity: el.hidden ? 0.5 : 1,
                transition: 'background 0.12s, border-color 0.12s',
              }}
              onMouseEnter={(e) => {
                if (!isPrimary && !isMulti) e.currentTarget.style.background = 'rgba(200,16,46,0.04)';
              }}
              onMouseLeave={(e) => {
                if (!isPrimary && !isMulti) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon size={13} strokeWidth={2.2} style={{
                color: isPrimary ? '#c8102e' : '#475569',
                flexShrink: 0,
              }}/>
              <span style={{
                flex: 1,
                fontSize: 12,
                fontWeight: 600,
                color: isPrimary ? '#0f172a' : '#334155',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: 'Manrope, sans-serif',
                letterSpacing: '-0.005em',
              }}>{rowLabel(el)}</span>

              {/* Action buttons — only show on hover or when selected */}
              <div style={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); updateElement(el.id, { hidden: !el.hidden }); markDirty(); }}
                  title={el.hidden ? 'Show' : 'Hide'}
                  style={{
                    width: 22, height: 22, borderRadius: 5,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: el.hidden ? '#12388f' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {el.hidden ? <EyeOff size={12}/> : <Eye size={12}/>}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }); markDirty(); }}
                  title={el.locked ? 'Unlock' : 'Lock'}
                  style={{
                    width: 22, height: 22, borderRadius: 5,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: el.locked ? '#12388f' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {el.locked ? <Lock size={11}/> : <Unlock size={11}/>}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isFirst) moveElementZ(el.id, 1); }}
                  disabled={isFirst}
                  title="Bring forward"
                  style={{
                    width: 18, height: 22, borderRadius: 5,
                    background: 'none', border: 'none',
                    cursor: isFirst ? 'not-allowed' : 'pointer',
                    color: isFirst ? '#e2e8f0' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <ChevronUp size={12}/>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isLast) moveElementZ(el.id, -1); }}
                  disabled={isLast}
                  title="Send back"
                  style={{
                    width: 18, height: 22, borderRadius: 5,
                    background: 'none', border: 'none',
                    cursor: isLast ? 'not-allowed' : 'pointer',
                    color: isLast ? '#e2e8f0' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <ChevronDown size={12}/>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
