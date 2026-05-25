import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { Eye, Save, Undo2, Redo2, Trash2, ArrowLeft, Globe, GlobeLock, Smartphone, Monitor, Tablet, HelpCircle, LayoutTemplate, Layers, Grid3x3, Link2, MoreHorizontal, ExternalLink } from 'lucide-react';
import FeatureOnExploreButton from '../../components/FeatureOnExploreButton';

/*
  EditorTopbar — the editor's single cobalt top bar. Restyled from a
  white sub-bar to full cobalt on 20 May 2026 (Steve flag).

  Pre-restyle: this was a translucent-white sub-bar that sat under
  the AppLayout cobalt topbar in DB-backed mode. Sandbox mode hides
  AppLayout, leaving the editor floating on white with no brand
  anchor. Steve's call: there should be only ONE top bar, and it
  should be cobalt.

  Result: this bar is now the platform's brand topbar inside the
  editor. AppLayout's cobalt topbar is still hidden in sandbox; in
  DB-backed mode it's also hidden via SuperPagesEditor (this bar
  takes over the role).

  22 May 2026 — Steve flag: topbar buttons disappear off the right
  edge when window is narrowed. Added a responsive overflow menu:
  at viewport widths below the threshold, secondary buttons
  (Templates, Layers, Grid, Campaign, Help, Clear) collapse into a
  '⋯' menu. Primary actions (Save, Publish, Preview, Undo/Redo,
  Device toggles, Back) stay always visible.

  Same date — Settings button removed entirely. All page-level
  settings (title, slug, SEO, OG image, draft/published status)
  now live in the left inspector when nothing is selected.
*/
export default function EditorTopbar({ title, slug, pageId, saving, dirty, status, onSave, onClear, onShowWiring, onUndo, onRedo, onBack, onTogglePublish, onTogglePreview, previewMode, deviceView, onSetDevice, onShowHelp, onShowTemplates, onToggleLayers, layersOpen, onToggleGrid, gridOn, currentListName, isSandbox, canvasScale = 1 }) {
  var { t } = useTranslation();
  const isPublished = status === 'published';
  // Overflow menu open state — controls the '⋯' dropdown.
  const [overflowOpen, setOverflowOpen] = useState(false);
  // Track whether we should be in compact (overflow) mode.
  // Threshold picked so buttons fit comfortably on a 13" laptop
  // (1280px wide) but collapse before they scroll off-screen.
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1280);
  const overflowRef = useRef(null);

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 1280);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
  return (
    <div className="sp-editor-subbar sp-editor-topbar" style={{
      // 20 May 2026 v3: Steve flag — match platform standard topbar.
      // Was 56px gradient(135deg, #0a1438, #1e3a8a). Now 72px flat
      // #1e3a8a to match the panel chrome and platform-standard
      // height (Topbar.jsx uses 72px). Gives the topbar room to
      // breathe at the platform's expected dimensions.
      height: 72,
      background: '#1e3a8a',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', padding: '0 22px', gap: 8,
      flexShrink: 0, zIndex: 20,
      // 20 May 2026 v4 (Steve flag — topbar disappearing on narrow
      // windows). min-width:0 lets the bar itself shrink with the
      // viewport; overflow-x:auto lets buttons scroll horizontally
      // INSIDE the bar when there are more buttons than width.
      // Without this, the row's intrinsic min-content width would
      // try to push the bar wider than its parent and disappear.
      minWidth: 0,
      overflowX: 'auto',
      overflowY: 'hidden',
    }}>
      <style>{`
        /* Neutralise the global 'button lifts 1 px on hover' rule inside the
           editor sub-bar. We have explicit border/color hover handlers already;
           the extra translateY stacked on top makes buttons feel wobbly. */
        .sp-editor-subbar button:hover,
        .sp-editor-subbar button:active {
          transform: none !important;
          filter: none !important;
        }
        /* Hide scrollbar on the topbar (20 May 2026). The bar has
           overflow-x:auto so buttons scroll horizontally when the
           viewport is narrower than their intrinsic total width —
           but a visible scrollbar under the buttons would look
           broken. Hidden across browsers; scroll still works via
           trackpad swipe / shift+wheel. */
        .sp-editor-subbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .sp-editor-subbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
        /* SuperPages brand logo + wordmark — cobalt-bar version (20 May 2026).
           Wordmark is white on cobalt, 'Pages' accent stays cyan. Same 4-tile
           SVG as before. */
        .sp-brand {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 10px 6px 4px;
          text-decoration: none;
          border-radius: 6px;
          transition: background 120ms ease;
          cursor: pointer;
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
      `}</style>

      {/* SuperPages brand — clickable, returns to My Pages.
          The same destination as the Back button but with a clear brand
          anchor at the left edge so the tool feels rooted in SuperAdPro
          rather than floating without identity. */}
      <a
        href="#"
        className="sp-brand"
        onClick={e => { e.preventDefault(); onBack && onBack(); }}
        title={t('superPagesEditor.backToMyPages', { defaultValue: 'Back to My Pages' })}>
        <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true" style={{flexShrink:0}}>
          <rect x="6" y="6" width="16" height="16" rx="4" fill="#22d3ee" opacity="0.95"/>
          <rect x="26" y="6" width="16" height="16" rx="4" fill="#0ea5e9" opacity="0.85"/>
          <rect x="6" y="26" width="16" height="16" rx="4" fill="#0ea5e9" opacity="0.6"/>
          <rect x="26" y="26" width="16" height="16" rx="4" fill="#22d3ee" opacity="0.4"/>
        </svg>
        <span className="sp-brand-wm">Super<span>Pages</span></span>
      </a>

      <div style={{width:1, height:24, background:'rgba(255,255,255,0.15)'}}/>

      {/* Back to My Pages */}
      <button onClick={onBack} style={{...btn, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.12)'}}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
        title={t('superPagesEditor.backToMyPages', { defaultValue: 'Back to My Pages' })}>
        <ArrowLeft size={13}/> <span>{t('superPagesEditor.backShort', { defaultValue: 'Back' })}</span>
      </button>

      <div style={{width:1, height:24, background:'rgba(255,255,255,0.15)'}}/>

      {/* Dirty indicator — small amber dot when there are unsaved changes */}
      {dirty && (
        <div style={{display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#fbbf24', fontWeight:700}} title={t('superPagesEditor.unsavedChanges', { defaultValue: 'Unsaved changes' })}>
          <span style={{width:7, height:7, borderRadius:'50%', background:'#fbbf24', display:'inline-block'}}/>
          <span>{t('superPagesEditor.unsavedShort', { defaultValue: 'Unsaved' })}</span>
        </div>
      )}

      <div style={{flex:1}}/>

      {/* Zoom indicator — shown only when canvas is auto-scaled below
          100%. Tells the user 'this is a zoom-to-fit display; the
          published page still renders at full width on visitor
          screens'. Hidden at 100% to avoid chrome bloat when the
          workspace has room. */}
      {canvasScale < 0.995 && (
        <div
          title="Canvas auto-scaled to fit the workspace. Published page renders at full width."
          style={{
            display:'inline-flex', alignItems:'center', gap:5,
            padding:'5px 10px', borderRadius:6,
            background:'rgba(34,211,238,0.14)', border:'1px solid rgba(34,211,238,0.4)',
            color:'#22d3ee', fontSize:12, fontWeight:700,
            fontFamily:'JetBrains Mono, ui-monospace, monospace',
          }}>
          {Math.round(canvasScale * 100)}%
        </div>
      )}

      {/* Device view toggles — grouped pill */}
      <div style={{display:'inline-flex', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:3, gap:0}}>
        <button onClick={() => onSetDevice('desktop')} style={{...grpBtn, ...(deviceView==='desktop' ? grpBtnActive : {})}} title={t('superPagesEditor.desktopPreview')}><Monitor size={13}/></button>
        <button onClick={() => onSetDevice('tablet')} style={{...grpBtn, ...(deviceView==='tablet' ? grpBtnActive : {})}} title={t('superPagesEditor.tabletPreview')}><Tablet size={13}/></button>
        <button onClick={() => onSetDevice('mobile')} style={{...grpBtn, ...(deviceView==='mobile' ? grpBtnActive : {})}} title={t('superPagesEditor.mobilePreview')}><Smartphone size={13}/></button>
      </div>

      <div style={{width:1, height:24, background:'rgba(255,255,255,0.15)'}}/>

      <button onClick={onUndo} style={ghost} title={t('superPagesEditor.undoLabel')}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}>
        <Undo2 size={13}/>
      </button>
      <button onClick={onRedo} style={ghost} title={t('superPagesEditor.redoLabel')}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}>
        <Redo2 size={13}/>
      </button>

      <div style={{width:1, height:24, background:'rgba(255,255,255,0.15)'}}/>

      {/* Secondary actions block — Templates / Layers / Grid /
          Campaign / Help / Clear.
          22 May 2026: at viewport widths below 1280px these collapse
          into a '⋯' overflow menu so the primary action buttons
          (Preview / Publish / Save) never scroll off-screen on narrow
          windows. The Settings button was removed entirely on the
          same date — all page-level settings now live in the left
          inspector when nothing is selected. */}
      {!compact && (
        <>
          {/* Templates — cyan accent on cobalt. Now reads as a clear
              highlight without fighting the brand palette. */}
          <button onClick={onShowTemplates} style={{
            ...btn,
            background: 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(14,165,233,0.18))',
            color: '#22d3ee',
            border: '1px solid rgba(34,211,238,0.45)',
            fontWeight: 800,
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,211,238,0.28), rgba(14,165,233,0.28))';
              e.currentTarget.style.borderColor = 'rgba(34,211,238,0.7)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(14,165,233,0.18))';
              e.currentTarget.style.borderColor = 'rgba(34,211,238,0.45)';
            }}
            title={t('superPagesEditor.templatesLabel', { defaultValue: 'Browse templates' })}>
            <LayoutTemplate size={13}/> <span style={{marginLeft:3}}>{t('superPagesEditor.templates', { defaultValue: 'Templates' })}</span>
          </button>

          {/* Layers — toggle the floating layer panel */}
          <button onClick={onToggleLayers} style={{
            ...ghost,
            background: layersOpen ? 'rgba(34,211,238,0.16)' : 'rgba(255,255,255,0.06)',
            borderColor: layersOpen ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.12)',
            color: layersOpen ? '#22d3ee' : 'rgba(255,255,255,0.85)',
          }}
            onMouseEnter={e => { if (!layersOpen) { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; } }}
            onMouseLeave={e => { if (!layersOpen) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; } }}
            title={t('superPagesEditor.layersLabel', { defaultValue: 'Layers' })}>
            <Layers size={13}/> <span style={{marginLeft:3}}>{t('superPagesEditor.layers', { defaultValue: 'Layers' })}</span>
          </button>

          {/* Grid — toggle the 8px snap grid overlay.
              Kept on cyan accent (not the original purple) to stay brand-aligned. */}
          <button onClick={onToggleGrid} style={{
            ...ghost,
            background: gridOn ? 'rgba(34,211,238,0.16)' : 'rgba(255,255,255,0.06)',
            borderColor: gridOn ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.12)',
            color: gridOn ? '#22d3ee' : 'rgba(255,255,255,0.85)',
          }}
            onMouseEnter={e => { if (!gridOn) { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; } }}
            onMouseLeave={e => { if (!gridOn) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; } }}
            title="Toggle 8px grid + snap (⌘')">
            <Grid3x3 size={13}/>
          </button>

          {/* Campaign wiring — change the lead-capture list / sequence
              mid-edit. Button label is ALWAYS "Campaign" — the wired list
              name shows on hover via the tooltip and is reflected by the
              cyan-tinted active state. Steve's call 20 May 2026: 'the
              Campaign tab is not displaying as Campaign' — the previous
              version showed the list name as the button text which broke
              the navigation pattern. */}
          {onShowWiring && (
            <button onClick={onShowWiring} style={{
              ...ghost,
              background: currentListName ? 'rgba(34,211,238,0.14)' : 'rgba(255,255,255,0.06)',
              borderColor: currentListName ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.12)',
              color: currentListName ? '#22d3ee' : 'rgba(255,255,255,0.85)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = currentListName ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = currentListName ? '#22d3ee' : 'rgba(255,255,255,0.85)';
              }}
              title={currentListName ? `Campaign · leads go to: ${currentListName}` : 'Campaign · choose where leads from this page are sent'}>
              <Link2 size={13}/>
              <span style={{marginLeft:3}}>Campaign</span>
            </button>
          )}
          <button onClick={onShowHelp} style={{...ghost, color: '#22d3ee'}}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.background = 'rgba(34,211,238,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
            <HelpCircle size={13}/> <span style={{marginLeft:3}}>{t('superPagesEditor.helpLabel', { defaultValue: 'Help' })}</span>
          </button>
          <button onClick={onClear} style={{...ghost, color: '#fca5a5'}}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fca5a5'; }}
            title={t('superPagesEditor.clearCanvasLabel', { defaultValue: 'Clear canvas' })}>
            <Trash2 size={13}/>
          </button>
        </>
      )}

      {compact && (
        <div ref={overflowRef} style={{position:'relative', display:'inline-block'}}>
          <button
            onClick={() => setOverflowOpen(v => !v)}
            style={{
              ...ghost,
              background: overflowOpen ? 'rgba(34,211,238,0.16)' : 'rgba(255,255,255,0.06)',
              borderColor: overflowOpen ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.12)',
              color: overflowOpen ? '#22d3ee' : 'rgba(255,255,255,0.85)',
            }}
            title="More tools"
            aria-label="More tools">
            <MoreHorizontal size={14}/>
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
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              {[
                {key:'templates', label:t('superPagesEditor.templates', { defaultValue:'Templates' }), Icon:LayoutTemplate, click:onShowTemplates, accent:'#22d3ee'},
                {key:'layers', label:t('superPagesEditor.layers', { defaultValue:'Layers' }), Icon:Layers, click:onToggleLayers, active:layersOpen},
                {key:'grid', label:'Grid', Icon:Grid3x3, click:onToggleGrid, active:gridOn},
                ...(onShowWiring ? [{key:'campaign', label:'Campaign', Icon:Link2, click:onShowWiring, active:!!currentListName}] : []),
                {key:'help', label:t('superPagesEditor.helpLabel', { defaultValue:'Help' }), Icon:HelpCircle, click:onShowHelp, accent:'#22d3ee'},
                {key:'clear', label:t('superPagesEditor.clearCanvasLabel', { defaultValue:'Clear canvas' }), Icon:Trash2, click:onClear, danger:true},
              ].map(item => (
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

      <div style={{width:1, height:24, background:'rgba(255,255,255,0.15)'}}/>

      {/* Preview toggle */}
      <button onClick={onTogglePreview} style={{
        ...btn,
        background: previewMode ? '#22d3ee' : 'rgba(34,211,238,0.18)',
        color: previewMode ? '#0a1438' : '#22d3ee',
        border: '1px solid ' + (previewMode ? '#22d3ee' : 'rgba(34,211,238,0.4)'),
      }}>
        <Eye size={13}/> {previewMode ? t('superPagesEditor.editLabel', { defaultValue: 'Edit' }) : t('superPagesEditor.previewLabel', { defaultValue: 'Preview' })}
      </button>

      {/* Publish toggle */}
      <button onClick={onTogglePublish} style={{
        ...btn,
        background: isPublished ? 'rgba(34,197,94,0.2)' : 'rgba(34,211,238,0.18)',
        color: isPublished ? '#86efac' : '#22d3ee',
        border: '1px solid ' + (isPublished ? 'rgba(34,197,94,0.5)' : 'rgba(34,211,238,0.4)'),
      }}>
        {isPublished ? <><Globe size={13}/> {t('superPagesEditor.publishedLabel')}</> : <><GlobeLock size={13}/> {t('superPagesEditor.publishBtn')}</>}
      </button>

      {/* Save — primary action, green. Stays green on cobalt for clear
          'this is the commit action' signal — green works on cobalt
          and members already associate it with saving from the rest
          of the platform. */}
      <button onClick={onSave} disabled={saving} style={{
        ...btn,
        background: saving ? 'rgba(255,255,255,0.15)' : '#22c55e',
        color: saving ? 'rgba(255,255,255,0.55)' : '#ffffff',
        border: '1px solid ' + (saving ? 'rgba(255,255,255,0.2)' : '#16a34a'),
        boxShadow: saving ? 'none' : '0 2px 6px rgba(34,197,94,0.35)',
        cursor: saving ? 'not-allowed' : 'pointer',
      }}>
        <Save size={13}/> {saving ? t('superPagesEditor.savingLabel', { defaultValue: 'Saving…' }) : t('superPagesEditor.saveLabel', { defaultValue: 'Save' })}
      </button>

      {/* Live link — only when published. Styled to match the other
          topbar pills (same height, same border-radius, same padding)
          rather than as a CTA — it's a utility action, not a primary
          conversion. Cyan accent makes it findable; nowrap + SVG icon
          (not unicode ↗) keeps it on one line regardless of font
          fallbacks. Reported by Steve 25 May 2026 as "distorted" —
          previously used unicode arrow which wrapped to a second line
          on some font-stack/line-height combinations. */}
      {isPublished && slug && (
        <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer"
          style={{
            ...btn,
            background: 'rgba(34,211,238,0.16)',
            color: '#22d3ee',
            border: '1px solid rgba(34,211,238,0.4)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.28)';
            e.currentTarget.style.borderColor = '#22d3ee';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.16)';
            e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)';
          }}
          title={t('superPagesEditor.openLinkTitle', { defaultValue: 'Open the live page in a new tab' })}>
          <ExternalLink size={13}/>
          <span>{t('superPagesEditor.openLink', { defaultValue: 'Open' })}</span>
        </a>
      )}

      {/* Feature on /explore — only when published */}
      {isPublished && pageId && (
        <FeatureOnExploreButton
          artifactType="landing-page"
          artifactId={parseInt(pageId, 10)}
          artifactTitle={title || ''}
          variant="secondary"
        />
      )}
    </div>
  );
}

const btn = {
  padding: '7px 12px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
  fontFamily: 'DM Sans,sans-serif', transition: 'all .12s',
};
const ghost = {
  ...btn,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(255,255,255,0.12)',
};
const grpBtn = {
  padding: '5px 9px', border: 'none', borderRadius: 6, cursor: 'pointer',
  background: 'transparent', color: 'rgba(255,255,255,0.7)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'DM Sans,sans-serif', transition: 'all .12s',
};
const grpBtnActive = {
  background: 'rgba(34,211,238,0.22)',
  color: '#22d3ee',
  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
};
