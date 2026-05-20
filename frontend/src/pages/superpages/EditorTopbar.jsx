import { useTranslation } from 'react-i18next';
import { Eye, Save, Undo2, Redo2, Settings, Trash2, ArrowLeft, Globe, GlobeLock, Smartphone, Monitor, Tablet, HelpCircle } from 'lucide-react';
import FeatureOnExploreButton from '../../components/FeatureOnExploreButton';

/*
  EditorTopbar — production page-builder topbar (full cobalt).
  Restyled from white to cobalt on 20 May 2026 to match the
  Labs editor and platform brand. Single cobalt top bar across
  the whole editor experience.
*/
export default function EditorTopbar({ title, slug, pageId, saving, dirty, status, onSave, onClear, onShowSettings, onUndo, onRedo, onBack, onTogglePublish, onTogglePreview, previewMode, deviceView, onSetDevice, onShowHelp }) {
  var { t } = useTranslation();
  const isPublished = status === 'published';
  return (
    <div className="sp-editor-subbar" style={{
      height: 56,
      background: 'linear-gradient(135deg, #0a1438, #1e3a8a)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8, flexShrink: 0, zIndex: 20,
    }}>
      <style>{`
        .sp-editor-subbar button:hover,
        .sp-editor-subbar button:active {
          transform: none !important;
          filter: none !important;
        }
      `}</style>
      {/* Back to My Pages */}
      <button onClick={onBack} style={{...btn, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.12)'}}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
        title={t('superPagesEditor.backToMyPages', { defaultValue: 'Back to My Pages' })}>
        <ArrowLeft size={13}/> <span>{t('superPagesEditor.backShort', { defaultValue: 'Back' })}</span>
      </button>

      <div style={{width:1, height:24, background:'rgba(255,255,255,0.15)'}}/>

      {/* Dirty indicator */}
      {dirty && (
        <div style={{display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#fbbf24', fontWeight:700}} title={t('superPagesEditor.unsavedChanges', { defaultValue: 'Unsaved changes' })}>
          <span style={{width:7, height:7, borderRadius:'50%', background:'#fbbf24', display:'inline-block'}}/>
          <span>{t('superPagesEditor.unsavedShort', { defaultValue: 'Unsaved' })}</span>
        </div>
      )}

      <div style={{flex:1}}/>

      {/* Device view toggles */}
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

      <button onClick={onShowSettings} style={ghost}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.color = '#22d3ee'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}>
        <Settings size={13}/> <span style={{marginLeft:3}}>{t('superPagesEditor.settings')}</span>
      </button>
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

      {/* Save — primary action, green */}
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

      {/* Live link */}
      {isPublished && slug && (
        <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer"
          style={{...btn, background: '#22d3ee', color: '#0a1438', border: '1px solid #06b6d4', textDecoration: 'none', boxShadow: '0 2px 6px rgba(34,211,238,0.35)', fontWeight: 800}}>
          {t('superPagesEditor.openLink', { defaultValue: 'Open ↗' })}
        </a>
      )}

      {/* Feature on /explore */}
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
