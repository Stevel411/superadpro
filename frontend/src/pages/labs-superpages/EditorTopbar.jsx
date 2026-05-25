import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { Eye, Save, Undo2, Redo2, Trash2, ArrowLeft, Globe, GlobeLock, Smartphone, Monitor, Tablet, HelpCircle, LayoutTemplate, Layers, Grid3x3, Link2, MoreHorizontal, ExternalLink } from 'lucide-react';

/*
  EditorTopbar — the editor's single cobalt top bar.

  History note (the path to the current design — read this if changing
  layout, don't repeat what didn't work):

  - 18 May 2026: separate white sub-bar under AppLayout. Two bars
    competing for attention. Removed.
  - 20 May 2026: consolidated to one cobalt bar, 72px tall, full
    AppLayout-replacement role in the editor. Settings button removed,
    page settings moved to left inspector when nothing selected.
  - 22 May 2026: 'buttons disappear off the right' fix attempt #1 —
    set overflow-x:auto on the bar so buttons could horizontally scroll
    inside the bar instead of disappearing off-screen. Worked
    accidentally; the scroll was the bug, not the fix.
  - 25 May 2026 (this rewrite): Steve's verdict was 'looks overcrowded
    and buttons disappear when scrolling the canvas'. Root cause of
    the disappearance: overflow-x:auto + intrinsic content width
    wider than viewport meant buttons sat in a horizontally scrollable
    region that could be scrolled away by trackpad pan or by the
    canvas-pan handler accidentally consuming the same gesture. Root
    cause of the overcrowding: 16 controls competing at full width
    with no visual hierarchy and mixed pill sizes.

    Fix shipped here:
    - Three explicit clusters with clear semantic role:
        LEFT  = page context (brand, back, dirty indicator)
        CENTRE = editing tools (zoom, device toggle, undo/redo)
        RIGHT  = page actions (templates, layers, grid, campaign,
                  help, clear, preview, publish, save, open)
    - One pill height (36px). One pill border radius (8px). One pill
      padding (0 12px). Controls choose between pillM (icon+label)
      and pillS (icon only, 36×36) — no third size.
    - SAVE is the only exception (32px-equivalent but with a green
      solid background, the one CTA). All others use the cobalt
      ghost/tint pattern.
    - NO overflow-x. The bar uses flex-wrap:nowrap and the centre
      cluster has flex:1 so it shrinks (and collapses to overflow
      menu) before either left or right cluster gets pushed.
    - Two-stage overflow: at < 1180px the SECONDARY right cluster
      (Help, Clear, Campaign) folds into a '⋯' menu; at < 980px
      the CENTRE cluster's undo/redo also fold in. Save / Publish /
      Preview / Open / Templates / Layers stay visible to the
      tightest reasonable viewport (~750px) because they're the
      primary-task buttons.
    - position: sticky + top:0 + z-index:50 so the bar floats above
      canvas pan and never scrolls out of reach.
    - Feature on /explore REMOVED — moved to the Funnels page card
      actions (where members are thinking about discovery, not
      while they're heads-down inside the editor).
*/
export default function EditorTopbar({ title, slug, pageId, saving, dirty, status, onSave, onClear, onShowWiring, onUndo, onRedo, onBack, onTogglePublish, onTogglePreview, previewMode, deviceView, onSetDevice, onShowHelp, onShowTemplates, onToggleLayers, layersOpen, onToggleGrid, gridOn, currentListName, isSandbox, canvasScale = 1 }) {
  var { t } = useTranslation();
  const isPublished = status === 'published';
  const [overflowOpen, setOverflowOpen] = useState(false);

  // 25 May 2026 v3: switched from pre-computed breakpoints to actual
  // overflow detection. Two prior attempts failed:
  //
  //   v1 (window-width thresholds 1180/980): didn't account for side
  //       panels stealing width.
  //   v2 (ResizeObserver on bar with 960/780/640 thresholds): I
  //       miscounted button widths. The bar content is ~1410px wide
  //       at its full state; my breakpoints didn't trigger until
  //       <960px so on Steve's normal-width viewport the content
  //       overflowed and got clipped on the right.
  //
  // The lesson: pre-computed breakpoints are brittle when I can't
  // perfectly predict every button's rendered width. Instead, MEASURE
  // overflow directly via scrollWidth > clientWidth, then progressively
  // fold tiers until overflow goes away. Self-correcting — no width
  // magic numbers to maintain.
  //
  // Tier order (most-collapsible first, since I always want the
  // least-essential controls to fold first):
  //   tier 1: Grid + Campaign + Help + Clear → overflow menu
  //   tier 2: Undo + Redo → overflow menu (uncommon — these matter
  //           for editing flow, only fold if truly needed)
  //   tier 3: Templates → overflow menu (rare — narrow viewport
  //           with panels open AND a published page showing
  //           Open button)
  //
  // Always-visible essentials at every tier: Brand, Back, Dirty
  // indicator, Device toggle, Layers, ⋯ menu (when populated),
  // Preview, Publish status, Save, Open.
  const topbarRef = useRef(null);
  const [compactSecondary, setCompactSecondary] = useState(false);
  const [compactPrimary, setCompactPrimary]     = useState(false);
  const [compactTertiary, setCompactTertiary]   = useState(false);
  const overflowRef = useRef(null);

  // Overflow-detecting collapse. After every render, check if the bar's
  // intrinsic content exceeds its available width. If so, fold the
  // next tier and re-render; the new render will re-check. Settles
  // within at most 3 re-renders (one per tier).
  //
  // Edge case (25 May 2026 — Steve flag): when the ⋯ menu is OPEN, do
  // NOT re-evaluate the collapse state. Reason: opening the menu can
  // trigger sub-pixel layout shifts (button hover/active state, the
  // dropdown's mount animation) which the ResizeObserver picks up and
  // re-measures. If the measurement crosses the overflow threshold by
  // even 1px, a tier folds (or unfolds), the topbar re-renders mid-
  // dropdown-display, and items appear/disappear visibly. Freezing
  // the collapse state while the dropdown is open keeps the topbar
  // visually stable.
  useEffect(() => {
    if (overflowOpen) return;
    const el = topbarRef.current;
    if (!el) return;

    const check = () => {
      // scrollWidth = how wide the content WANTS to be
      // clientWidth = how wide the bar IS
      // If content > bar, we're overflowing — fold the next tier.
      const overflows = el.scrollWidth > el.clientWidth + 2;  // 2px tolerance for sub-pixel rounding
      if (overflows) {
        if (!compactSecondary) {
          setCompactSecondary(true);
          return;
        }
        if (!compactPrimary) {
          setCompactPrimary(true);
          return;
        }
        if (!compactTertiary) {
          setCompactTertiary(true);
          return;
        }
        // All tiers collapsed and STILL overflowing — nothing more we
        // can do. The bar will visually clip its remaining essentials
        // (Open is the only one we'd rather sacrifice; tier 4 could
        // fold it but it's the most useful when published). Accept
        // the clip rather than hide a critical control.
        return;
      }

      // Not overflowing — try to un-collapse tiers, BUT only if the
      // resulting state would still fit. We can't naively un-collapse
      // because that's how oscillation bugs are born (un-collapse →
      // overflow → re-collapse → un-collapse → ...). Instead, only
      // un-collapse a tier if there's HEADROOM equal to that tier's
      // typical width:
      //   tier 1 (Grid+Campaign+Help+Clear): ~280px
      //   tier 2 (Undo+Redo):                  ~80px
      //   tier 3 (Templates):                 ~115px
      const headroom = el.clientWidth - el.scrollWidth;
      if (compactTertiary && headroom > 130) {
        setCompactTertiary(false);
        return;
      }
      if (compactPrimary && headroom > 95) {
        setCompactPrimary(false);
        return;
      }
      if (compactSecondary && headroom > 300) {
        setCompactSecondary(false);
        return;
      }
    };

    // Initial check, plus observe future size changes.
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compactSecondary, compactPrimary, compactTertiary, isPublished, dirty, canvasScale, currentListName, overflowOpen]);
  // ^ deps: anything that materially changes the bar's content width
  //   needs to be in here so the check fires after that re-render
  //   (e.g. publishing the page adds the Open button, dirty state
  //   adds the unsaved indicator, etc).

  // Close the overflow menu when clicking outside it.
  useEffect(() => {
    if (!overflowOpen) return;
    const onDocClick = (e) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [overflowOpen]);

  // Compose the overflow menu items dynamically based on which tier
  // of responsive collapse we're in. Order is fixed (templates first,
  // then undo/redo, then secondary tools) regardless of which tiers
  // are active — keeps muscle memory predictable.
  const overflowItems = [];
  if (compactTertiary) {
    overflowItems.push(
      {key:'templates', label:t('superPagesEditor.templates', { defaultValue:'Templates' }), Icon:LayoutTemplate, click:onShowTemplates, accent:'#22d3ee'},
    );
  }
  if (compactPrimary) {
    overflowItems.push(
      {key:'undo', label:t('superPagesEditor.undoLabel', { defaultValue:'Undo' }), Icon:Undo2, click:onUndo},
      {key:'redo', label:t('superPagesEditor.redoLabel', { defaultValue:'Redo' }), Icon:Redo2, click:onRedo},
    );
  }
  if (compactSecondary) {
    overflowItems.push(
      {key:'grid', label:'Snap grid', Icon:Grid3x3, click:onToggleGrid, active:gridOn},
      ...(onShowWiring ? [{key:'campaign', label:'Campaign', Icon:Link2, click:onShowWiring, active:!!currentListName}] : []),
      {key:'help', label:t('superPagesEditor.helpLabel', { defaultValue:'Help' }), Icon:HelpCircle, click:onShowHelp, accent:'#22d3ee'},
      {key:'clear', label:t('superPagesEditor.clearCanvasLabel', { defaultValue:'Clear canvas' }), Icon:Trash2, click:onClear, danger:true},
    );
  }

  return (
    <div ref={topbarRef} className="sp-editor-subbar sp-editor-topbar" style={{
      // Single full-platform-standard topbar height. 64px — slightly
      // tighter than the previous 72 to give the canvas a touch more
      // vertical room without sacrificing comfort.
      height: 64,
      background: '#1e3a8a',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10,
      flexShrink: 0,
      // Sticky positioning: floats above canvas pan.
      position: 'sticky',
      top: 0,
      zIndex: 50,
      // NO overflow-x:auto. The bar must never scroll horizontally.
      // Content fits via collapse, never via clipping.
      flexWrap: 'nowrap',
      minWidth: 0,
      // Defence in depth: if anything still escapes the layout (e.g.
      // a tooltip or absolute child), hide it rather than letting it
      // visually push content off-screen.
      overflowX: 'hidden',
    }}>
      <style>{`
        .sp-editor-subbar button:hover,
        .sp-editor-subbar button:active {
          transform: none !important;
          filter: none !important;
        }
        .sp-brand {
          display: flex; align-items: center; gap: 9px;
          padding: 6px 10px 6px 4px;
          text-decoration: none;
          border-radius: 6px;
          transition: background 120ms ease;
          cursor: pointer;
          flex-shrink: 0;
        }
        .sp-brand:hover { background: rgba(255,255,255,0.08); }
        .sp-brand-wm {
          font-family: Sora, system-ui, sans-serif;
          font-weight: 800; font-size: 15px;
          color: #ffffff;
          letter-spacing: -0.3px;
          line-height: 1;
        }
        .sp-brand-wm span { color: #22d3ee; }
        .sp-cluster-divider {
          width: 1px; height: 22px;
          background: rgba(255,255,255,0.12);
          flex-shrink: 0;
        }
      `}</style>

      {/* ─────────────────────────────────────────────────────────────
          LEFT CLUSTER — page context
          Brand, Back, Dirty indicator. Never collapses.
          ───────────────────────────────────────────────────────────── */}
      <a
        href="#"
        className="sp-brand"
        onClick={e => { e.preventDefault(); onBack && onBack(); }}
        title={t('superPagesEditor.backToMyPages', { defaultValue: 'Back to My Pages' })}>
        <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true" style={{flexShrink:0}}>
          <rect x="6" y="6" width="16" height="16" rx="4" fill="#22d3ee" opacity="0.95"/>
          <rect x="26" y="6" width="16" height="16" rx="4" fill="#0ea5e9" opacity="0.85"/>
          <rect x="6" y="26" width="16" height="16" rx="4" fill="#0ea5e9" opacity="0.6"/>
          <rect x="26" y="26" width="16" height="16" rx="4" fill="#22d3ee" opacity="0.4"/>
        </svg>
        <span className="sp-brand-wm">Super<span>Pages</span></span>
      </a>

      <div className="sp-cluster-divider"/>

      <button onClick={onBack} style={pillM}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
        title={t('superPagesEditor.backToMyPages', { defaultValue: 'Back to My Pages' })}>
        <ArrowLeft size={14}/>
        <span>{t('superPagesEditor.backShort', { defaultValue: 'Back' })}</span>
      </button>

      {dirty && (
        <div style={{
          display:'flex', alignItems:'center', gap:6,
          fontSize:13, color:'#fbbf24', fontWeight:700,
          flexShrink: 0,
        }} title={t('superPagesEditor.unsavedChanges', { defaultValue: 'Unsaved changes' })}>
          <span style={{width:7, height:7, borderRadius:'50%', background:'#fbbf24', display:'inline-block'}}/>
          <span>{t('superPagesEditor.unsavedShort', { defaultValue: 'Unsaved' })}</span>
        </div>
      )}

      {/* Flexible spacer pushes left cluster to the left, centre cluster
          to the middle, right cluster to the right. */}
      <div style={{flex:1, minWidth:8}}/>

      {/* ─────────────────────────────────────────────────────────────
          CENTRE CLUSTER — editing tools
          Zoom indicator (when <100%), Device toggle, Undo/Redo.
          Undo/Redo collapses to overflow menu at <980px.
          ───────────────────────────────────────────────────────────── */}
      {canvasScale < 0.995 && (
        <div
          title="Canvas auto-scaled to fit the workspace. Published page renders at full width."
          style={{
            display:'inline-flex', alignItems:'center', gap:5,
            padding:'5px 10px', borderRadius:6,
            background:'rgba(34,211,238,0.14)', border:'1px solid rgba(34,211,238,0.4)',
            color:'#22d3ee', fontSize:12, fontWeight:700,
            fontFamily:'JetBrains Mono, ui-monospace, monospace',
            flexShrink: 0,
          }}>
          {Math.round(canvasScale * 100)}%
        </div>
      )}

      <div style={{
        display:'inline-flex', background:'rgba(255,255,255,0.06)',
        border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:3, gap:0,
        flexShrink: 0,
      }}>
        <button onClick={() => onSetDevice('desktop')} style={{...grpBtn, ...(deviceView==='desktop' ? grpBtnActive : {})}} title={t('superPagesEditor.desktopPreview')}><Monitor size={13}/></button>
        <button onClick={() => onSetDevice('tablet')}  style={{...grpBtn, ...(deviceView==='tablet'  ? grpBtnActive : {})}} title={t('superPagesEditor.tabletPreview')}><Tablet size={13}/></button>
        <button onClick={() => onSetDevice('mobile')}  style={{...grpBtn, ...(deviceView==='mobile'  ? grpBtnActive : {})}} title={t('superPagesEditor.mobilePreview')}><Smartphone size={13}/></button>
      </div>

      {!compactPrimary && (
        <>
          <button onClick={onUndo} style={pillS} title={t('superPagesEditor.undoLabel')}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}>
            <Undo2 size={14}/>
          </button>
          <button onClick={onRedo} style={pillS} title={t('superPagesEditor.redoLabel')}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}>
            <Redo2 size={14}/>
          </button>
        </>
      )}

      <div style={{flex:1, minWidth:8}}/>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT CLUSTER — page actions
          Templates, Layers (always visible, primary editing surfaces)
          + Grid, Campaign, Help, Clear (collapse to overflow at <1180px)
          + Preview, Publish-status, Save, Open (always visible)
          ───────────────────────────────────────────────────────────── */}
      {!compactTertiary && (
        <button onClick={onShowTemplates} style={pillM_accent}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.26)';
            e.currentTarget.style.borderColor = '#22d3ee';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.16)';
            e.currentTarget.style.borderColor = 'rgba(34,211,238,0.45)';
          }}
          title={t('superPagesEditor.templatesLabel', { defaultValue: 'Browse templates' })}>
          <LayoutTemplate size={14}/>
          <span>{t('superPagesEditor.templates', { defaultValue: 'Templates' })}</span>
        </button>
      )}

      <button onClick={onToggleLayers} style={layersOpen ? pillM_active : pillM}
        onMouseEnter={e => { if (!layersOpen) { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; } }}
        onMouseLeave={e => { if (!layersOpen) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; } }}
        title={t('superPagesEditor.layersLabel', { defaultValue: 'Layers' })}>
        <Layers size={14}/>
        <span>{t('superPagesEditor.layers', { defaultValue: 'Layers' })}</span>
      </button>

      {!compactSecondary && (
        <>
          <button onClick={onToggleGrid} style={gridOn ? pillS_active : pillS}
            onMouseEnter={e => { if (!gridOn) { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; } }}
            onMouseLeave={e => { if (!gridOn) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; } }}
            title="Toggle 8px grid + snap (⌘')">
            <Grid3x3 size={14}/>
          </button>

          {onShowWiring && (
            <button onClick={onShowWiring} style={currentListName ? pillM_active : pillM}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = currentListName ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = currentListName ? '#22d3ee' : 'rgba(255,255,255,0.85)';
              }}
              title={currentListName ? `Campaign · leads go to: ${currentListName}` : 'Campaign · choose where leads from this page are sent'}>
              <Link2 size={14}/>
              <span>Campaign</span>
            </button>
          )}

          <button onClick={onShowHelp} style={pillS_accent}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,211,238,0.22)'; e.currentTarget.style.borderColor = '#22d3ee'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            title={t('superPagesEditor.helpLabel', { defaultValue: 'Help' })}>
            <HelpCircle size={14}/>
          </button>

          <button onClick={onClear} style={pillS_danger}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fca5a5'; }}
            title={t('superPagesEditor.clearCanvasLabel', { defaultValue: 'Clear canvas' })}>
            <Trash2 size={14}/>
          </button>
        </>
      )}

      {overflowItems.length > 0 && (
        <div ref={overflowRef} style={{position:'relative', display:'inline-flex', flexShrink:0}}>
          <button
            onClick={() => setOverflowOpen(v => !v)}
            style={overflowOpen ? pillS_active : pillS}
            title="More tools"
            aria-label="More tools">
            <MoreHorizontal size={15}/>
          </button>
          {overflowOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              minWidth: 180,
              background: '#0a1438',
              border: '1px solid rgba(34,211,238,0.3)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3)',
              padding: 4,
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              {overflowItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => { setOverflowOpen(false); item.click && item.click(); }}
                  style={{
                    display:'flex', alignItems:'center', gap:8,
                    padding:'8px 10px',
                    background: item.active ? 'rgba(34,211,238,0.12)' : 'transparent',
                    border:'1px solid ' + (item.active ? 'rgba(34,211,238,0.3)' : 'transparent'),
                    borderRadius:6,
                    color: item.danger ? '#fca5a5' : (item.active ? '#22d3ee' : (item.accent || 'rgba(255,255,255,0.85)')),
                    fontSize:13, fontWeight:600,
                    fontFamily:'DM Sans,sans-serif',
                    cursor:'pointer',
                    textAlign:'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.18)' : 'rgba(34,211,238,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = item.active ? 'rgba(34,211,238,0.12)' : 'transparent'; }}>
                  <item.Icon size={14}/>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="sp-cluster-divider"/>

      <button onClick={onTogglePreview} style={previewMode ? pillM_previewActive : pillM_accent}
        onMouseEnter={e => {
          if (previewMode) return;
          e.currentTarget.style.background = 'rgba(34,211,238,0.26)';
          e.currentTarget.style.borderColor = '#22d3ee';
        }}
        onMouseLeave={e => {
          if (previewMode) return;
          e.currentTarget.style.background = 'rgba(34,211,238,0.16)';
          e.currentTarget.style.borderColor = 'rgba(34,211,238,0.45)';
        }}>
        <Eye size={14}/>
        <span>{previewMode ? t('superPagesEditor.editLabel', { defaultValue: 'Edit' }) : t('superPagesEditor.previewLabel', { defaultValue: 'Preview' })}</span>
      </button>

      <button onClick={onTogglePublish} style={isPublished ? pillM_publishedActive : pillM_accent}
        onMouseEnter={e => {
          if (isPublished) return;
          e.currentTarget.style.background = 'rgba(34,211,238,0.26)';
          e.currentTarget.style.borderColor = '#22d3ee';
        }}
        onMouseLeave={e => {
          if (isPublished) return;
          e.currentTarget.style.background = 'rgba(34,211,238,0.16)';
          e.currentTarget.style.borderColor = 'rgba(34,211,238,0.45)';
        }}
        title={isPublished ? 'Currently published — click to unpublish' : 'Currently draft — click to publish'}>
        {isPublished ? <Globe size={14}/> : <GlobeLock size={14}/>}
        <span>{isPublished ? t('superPagesEditor.publishedLabel') : t('superPagesEditor.publishBtn')}</span>
      </button>

      <button onClick={onSave} disabled={saving} style={{
        ...pillM,
        background: saving ? 'rgba(255,255,255,0.15)' : '#22c55e',
        color: saving ? 'rgba(255,255,255,0.55)' : '#ffffff',
        border: '1px solid ' + (saving ? 'rgba(255,255,255,0.2)' : '#16a34a'),
        boxShadow: saving ? 'none' : '0 1px 3px rgba(0,0,0,0.2)',
        cursor: saving ? 'not-allowed' : 'pointer',
        fontWeight: 800,
      }}>
        <Save size={14}/>
        <span>{saving ? t('superPagesEditor.savingLabel', { defaultValue: 'Saving…' }) : t('superPagesEditor.saveLabel', { defaultValue: 'Save' })}</span>
      </button>

      {isPublished && slug && (
        <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer"
          style={pillM_accent}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.26)';
            e.currentTarget.style.borderColor = '#22d3ee';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.16)';
            e.currentTarget.style.borderColor = 'rgba(34,211,238,0.45)';
          }}
          title={t('superPagesEditor.openLinkTitle', { defaultValue: 'Open the live page in a new tab' })}>
          <ExternalLink size={14}/>
          <span>{t('superPagesEditor.openLink', { defaultValue: 'Open' })}</span>
        </a>
      )}

      {/* Note: 'Feature on /explore' button removed from topbar
          25 May 2026 (Steve flag — overcrowding). Moved to the
          Funnels listing card actions where members think about
          page discovery, not while heads-down inside the editor. */}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Pill style primitives
//
// One height (36px), one border radius (8px), one padding (0 12px).
// Variants change colour/background only. Keeps the topbar visually
// rhythmic — every control sits on the same baseline at the same
// height. The previous implementation had ~5 distinct sizes shipping
// alongside each other; this collapses to two (M and S) plus the
// device-toggle pill group.
// ─────────────────────────────────────────────────────────────────────

const PILL_HEIGHT = 36;

const pillBase = {
  height: PILL_HEIGHT,
  padding: '0 12px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'DM Sans, sans-serif',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
  lineHeight: 1,
  transition: 'all 120ms ease',
  flexShrink: 0,
};

// Default ghost pill — most controls use this. Subtle white tint, cobalt-friendly.
const pillM = {
  ...pillBase,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(255,255,255,0.12)',
};

// Cyan-accent pill — Templates, Preview, Publish (draft), Open. Findable.
const pillM_accent = {
  ...pillBase,
  background: 'rgba(34,211,238,0.16)',
  color: '#22d3ee',
  border: '1px solid rgba(34,211,238,0.45)',
};

// Active state for toggles that ARE on (Layers panel open, Campaign wired).
const pillM_active = {
  ...pillBase,
  background: 'rgba(34,211,238,0.14)',
  color: '#22d3ee',
  border: '1px solid rgba(34,211,238,0.5)',
};

// Preview mode active — full cyan fill to signal "you're in preview, click to exit".
const pillM_previewActive = {
  ...pillBase,
  background: '#22d3ee',
  color: '#0a1438',
  border: '1px solid #22d3ee',
  fontWeight: 800,
};

// Published status indicator — green tint when the page is live.
const pillM_publishedActive = {
  ...pillBase,
  background: 'rgba(34,197,94,0.18)',
  color: '#86efac',
  border: '1px solid rgba(34,197,94,0.5)',
};

// Icon-only square pill. 36×36 — same height as the M pills, square.
const pillS = {
  ...pillBase,
  width: PILL_HEIGHT,
  padding: 0,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(255,255,255,0.12)',
};

// Square pill, accent colour — Help icon.
const pillS_accent = {
  ...pillS,
  background: 'transparent',
  color: '#22d3ee',
  border: '1px solid rgba(255,255,255,0.12)',
};

// Square pill, active toggle state — Grid on, overflow menu open.
const pillS_active = {
  ...pillS,
  background: 'rgba(34,211,238,0.16)',
  color: '#22d3ee',
  border: '1px solid rgba(34,211,238,0.5)',
};

// Square pill, danger colour — Clear canvas (destructive action).
const pillS_danger = {
  ...pillS,
  color: '#fca5a5',
};

// Device-toggle child button — sits inside the device-toggle group pill.
// Smaller than pillS because it's already inside a bordered container.
const grpBtn = {
  height: 28,
  width: 28,
  padding: 0,
  border: 'none',
  borderRadius: 5,
  cursor: 'pointer',
  background: 'transparent',
  color: 'rgba(255,255,255,0.7)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'DM Sans, sans-serif',
  transition: 'all 120ms ease',
};
const grpBtnActive = {
  background: 'rgba(34,211,238,0.22)',
  color: '#22d3ee',
  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
};
