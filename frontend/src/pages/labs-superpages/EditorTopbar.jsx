import { useTranslation } from 'react-i18next';
import { Eye, Save, Undo2, Redo2, Settings, Trash2, ArrowLeft, Globe, GlobeLock, Smartphone, Monitor, Tablet, HelpCircle, LayoutTemplate, Layers, Grid3x3, Link2 } from 'lucide-react';
import FeatureOnExploreButton from '../../components/FeatureOnExploreButton';

/*
  EditorTopbar — the editor's sub-toolbar that sits directly below the AppLayout
  cobalt topbar. Rendered in light theme so the navigation chrome (cobalt) is
  visually separate from the editor tools (white), and the canvas below feels
  like the workspace centrepiece.
*/
export default function EditorTopbar({ title, slug, pageId, saving, dirty, status, onSave, onClear, onShowSettings, onShowWiring, onUndo, onRedo, onBack, onTogglePublish, onTogglePreview, previewMode, deviceView, onSetDevice, onShowHelp, onShowTemplates, onToggleLayers, layersOpen, onToggleGrid, gridOn, currentListName, isSandbox }) {
  var { t } = useTranslation();
  const isPublished = status === 'published';
  return (
    <div className="sp-editor-subbar sp-editor-topbar" style={{
      height: 56,
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: '1px solid rgba(15,23,42,0.06)',
      display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8, flexShrink: 0, zIndex: 20,
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
      `}</style>
      {/* Back to My Pages */}
      <button onClick={onBack} style={{...btn, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0'}}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
        title={t('superPagesEditor.backToMyPages', { defaultValue: 'Back to My Pages' })}>
        <ArrowLeft size={13}/> <span>{t('superPagesEditor.backShort', { defaultValue: 'Back' })}</span>
      </button>

      <div style={{width:1, height:24, background:'#e2e8f0'}}/>

      {/* Dirty indicator — small amber dot when there are unsaved changes */}
      {dirty && (
        <div style={{display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#f59e0b', fontWeight:700}} title={t('superPagesEditor.unsavedChanges', { defaultValue: 'Unsaved changes' })}>
          <span style={{width:7, height:7, borderRadius:'50%', background:'#f59e0b', display:'inline-block'}}/>
          <span>{t('superPagesEditor.unsavedShort', { defaultValue: 'Unsaved' })}</span>
        </div>
      )}

      <div style={{flex:1}}/>

      {/* Device view toggles — grouped pill */}
      <div style={{display:'inline-flex', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:8, padding:3, gap:0}}>
        <button onClick={() => onSetDevice('desktop')} style={{...grpBtn, ...(deviceView==='desktop' ? grpBtnActive : {})}} title={t('superPagesEditor.desktopPreview')}><Monitor size={13}/></button>
        <button onClick={() => onSetDevice('tablet')} style={{...grpBtn, ...(deviceView==='tablet' ? grpBtnActive : {})}} title={t('superPagesEditor.tabletPreview')}><Tablet size={13}/></button>
        <button onClick={() => onSetDevice('mobile')} style={{...grpBtn, ...(deviceView==='mobile' ? grpBtnActive : {})}} title={t('superPagesEditor.mobilePreview')}><Smartphone size={13}/></button>
      </div>

      <div style={{width:1, height:24, background:'#e2e8f0'}}/>

      <button onClick={onUndo} style={ghost} title={t('superPagesEditor.undoLabel')}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}>
        <Undo2 size={13}/>
      </button>
      <button onClick={onRedo} style={ghost} title={t('superPagesEditor.redoLabel')}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}>
        <Redo2 size={13}/>
      </button>

      <div style={{width:1, height:24, background:'#e2e8f0'}}/>

      <div style={{width:1, height:24, background:'#e2e8f0'}}/>

      {/* Templates — gradient-accented button so members notice it.
          Click opens the LabsTemplatesGallery modal. */}
      <button onClick={onShowTemplates} style={{
        ...btn,
        background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(168,85,247,0.1))',
        color: '#7c3aed',
        border: '1px solid rgba(168,85,247,0.3)',
        fontWeight: 800,
      }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(14,165,233,0.18), rgba(168,85,247,0.18))';
          e.currentTarget.style.borderColor = 'rgba(168,85,247,0.5)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(168,85,247,0.1))';
          e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)';
        }}
        title={t('superPagesEditor.templatesLabel', { defaultValue: 'Browse templates' })}>
        <LayoutTemplate size={13}/> <span style={{marginLeft:3}}>{t('superPagesEditor.templates', { defaultValue: 'Templates' })}</span>
      </button>

      {/* Layers — toggle the floating layer panel */}
      <button onClick={onToggleLayers} style={{
        ...ghost,
        background: layersOpen ? 'rgba(14,165,233,0.1)' : '#ffffff',
        borderColor: layersOpen ? 'rgba(14,165,233,0.35)' : '#e2e8f0',
        color: layersOpen ? '#0284c7' : '#475569',
      }}
        onMouseEnter={e => { if (!layersOpen) { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; } }}
        onMouseLeave={e => { if (!layersOpen) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; } }}
        title={t('superPagesEditor.layersLabel', { defaultValue: 'Layers' })}>
        <Layers size={13}/> <span style={{marginLeft:3}}>{t('superPagesEditor.layers', { defaultValue: 'Layers' })}</span>
      </button>

      {/* Grid — toggle the 8px snap grid overlay */}
      <button onClick={onToggleGrid} style={{
        ...ghost,
        background: gridOn ? 'rgba(168,85,247,0.1)' : '#ffffff',
        borderColor: gridOn ? 'rgba(168,85,247,0.35)' : '#e2e8f0',
        color: gridOn ? '#7c3aed' : '#475569',
      }}
        onMouseEnter={e => { if (!gridOn) { e.currentTarget.style.borderColor = '#a855f7'; e.currentTarget.style.color = '#a855f7'; } }}
        onMouseLeave={e => { if (!gridOn) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; } }}
        title="Toggle 8px grid + snap (⌘')">
        <Grid3x3 size={13}/>
      </button>

      <button onClick={onShowSettings} style={ghost}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}>
        <Settings size={13}/> <span style={{marginLeft:3}}>{t('superPagesEditor.settings')}</span>
      </button>

      {/* Campaign wiring — change the lead-capture list / sequence
          mid-edit. Added 20 May 2026 after Steve flagged that the
          original "pick list before you start editing" modal was a
          one-way door — if you changed your mind, you had to leave the
          editor. Now any DB-backed page exposes this button so the
          wiring is changeable without losing context.
          Sandbox pages don't have wiring (they're localStorage-only,
          only graduate to a real list on publish), so the button is
          hidden for them. */}
      {!isSandbox && onShowWiring && (
        <button onClick={onShowWiring} style={{
          ...ghost,
          background: currentListName ? 'rgba(14,165,233,0.06)' : '#ffffff',
          borderColor: currentListName ? 'rgba(14,165,233,0.3)' : '#e2e8f0',
          color: currentListName ? '#0284c7' : '#475569',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = currentListName ? 'rgba(14,165,233,0.3)' : '#e2e8f0';
            e.currentTarget.style.color = currentListName ? '#0284c7' : '#475569';
          }}
          title={currentListName ? `Leads go to: ${currentListName}` : 'Choose where leads from this page are sent'}>
          <Link2 size={13}/>
          <span style={{marginLeft:3, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
            {currentListName ? currentListName : 'Campaign'}
          </span>
        </button>
      )}
      <button onClick={onShowHelp} style={{...ghost, color: '#0ea5e9'}}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.background = 'rgba(14,165,233,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}>
        <HelpCircle size={13}/> <span style={{marginLeft:3}}>{t('superPagesEditor.helpLabel', { defaultValue: 'Help' })}</span>
      </button>
      <button onClick={onClear} style={{...ghost, color: '#dc2626'}}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
        title={t('superPagesEditor.clearCanvasLabel', { defaultValue: 'Clear canvas' })}>
        <Trash2 size={13}/>
      </button>

      <div style={{width:1, height:24, background:'#e2e8f0'}}/>

      {/* Preview toggle */}
      <button onClick={onTogglePreview} style={{
        ...btn,
        background: previewMode ? '#6366f1' : 'rgba(99,102,241,0.1)',
        color: previewMode ? '#fff' : '#6366f1',
        border: '1px solid ' + (previewMode ? '#6366f1' : 'rgba(99,102,241,0.25)'),
      }}>
        <Eye size={13}/> {previewMode ? t('superPagesEditor.editLabel', { defaultValue: 'Edit' }) : t('superPagesEditor.previewLabel', { defaultValue: 'Preview' })}
      </button>

      {/* Publish toggle */}
      <button onClick={onTogglePublish} style={{
        ...btn,
        background: isPublished ? 'rgba(22,163,74,0.08)' : 'rgba(14,165,233,0.08)',
        color: isPublished ? '#16a34a' : '#0284c7',
        border: '1px solid ' + (isPublished ? 'rgba(22,163,74,0.25)' : 'rgba(14,165,233,0.25)'),
      }}>
        {isPublished ? <><Globe size={13}/> {t('superPagesEditor.publishedLabel')}</> : <><GlobeLock size={13}/> {t('superPagesEditor.publishBtn')}</>}
      </button>

      {/* Save — primary action, green */}
      <button onClick={onSave} disabled={saving} style={{
        ...btn,
        background: saving ? '#7a8899' : '#22c55e',
        color: '#fff', border: '1px solid ' + (saving ? '#7a8899' : '#16a34a'),
        boxShadow: saving ? 'none' : '0 2px 6px rgba(34,197,94,0.25)',
        cursor: saving ? 'not-allowed' : 'pointer',
      }}>
        <Save size={13}/> {saving ? t('superPagesEditor.savingLabel', { defaultValue: 'Saving…' }) : t('superPagesEditor.saveLabel', { defaultValue: 'Save' })}
      </button>

      {/* Live link — only when published */}
      {isPublished && slug && (
        <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer"
          style={{...btn, background: '#0ea5e9', color: '#fff', border: '1px solid #0284c7', textDecoration: 'none', boxShadow: '0 2px 6px rgba(14,165,233,0.25)'}}>
          {t('superPagesEditor.openLink', { defaultValue: 'Open ↗' })}
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
  background: '#ffffff',
  color: '#475569',
  border: '1px solid #e2e8f0',
};
const grpBtn = {
  padding: '5px 9px', border: 'none', borderRadius: 6, cursor: 'pointer',
  background: 'transparent', color: '#475569',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'DM Sans,sans-serif', transition: 'all .12s',
};
const grpBtnActive = {
  background: '#ffffff',
  color: '#0ea5e9',
  boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
};
