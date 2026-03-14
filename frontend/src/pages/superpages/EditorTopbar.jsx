import { Eye, Save, Undo2, Redo2, Settings, Trash2, ArrowLeft, Globe, GlobeLock, Smartphone, Monitor } from 'lucide-react';

export default function EditorTopbar({ title, slug, saving, dirty, status, onSave, onClear, onShowSettings, onUndo, onRedo, onBack, onTogglePublish, onTogglePreview, previewMode, onToggleMobile, mobileView }) {
  const isPublished = status === 'published';
  return (
    <div style={{
      height: 50, background: '#141829', borderBottom: '1px solid #1f2440',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, flexShrink: 0, zIndex: 50,
    }}>
      <div onClick={onBack} style={{fontFamily:'Sora,sans-serif',fontWeight:800,fontSize:15,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
        <ArrowLeft size={14} color="#5a6080"/>
        SuperAd<em style={{color:'#0ea5e9',fontStyle:'normal'}}>Pro</em>
      </div>
      <div style={{width:1,height:22,background:'#1f2440'}}/>
      <div style={{fontSize:12,color:'#5a6080',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        {title || 'Untitled Page'}
        {dirty && <span style={{color:'#f59e0b',marginLeft:6}}>●</span>}
      </div>

      {/* Device toggle */}
      <button onClick={onToggleMobile} style={{...gh,background:mobileView?'rgba(14,165,233,.15)':'rgba(255,255,255,.05)',color:mobileView?'#38bdf8':'#6a7090'}} title={mobileView?'Desktop view':'Mobile view'}>
        {mobileView ? <Monitor size={14}/> : <Smartphone size={14}/>}
      </button>

      <div style={{width:1,height:22,background:'#1f2440'}}/>

      <button onClick={onUndo} style={gh} title="Undo (Ctrl+Z)"><Undo2 size={14}/></button>
      <button onClick={onRedo} style={gh} title="Redo (Ctrl+Y)"><Redo2 size={14}/></button>

      <div style={{width:1,height:22,background:'#1f2440'}}/>

      <button onClick={onShowSettings} style={gh}><Settings size={13}/> <span style={{marginLeft:2}}>Settings</span></button>
      <button onClick={onClear} style={{...gh,color:'#dc2626'}}><Trash2 size={13}/></button>

      <div style={{width:1,height:22,background:'#1f2440'}}/>

      {/* Preview */}
      <button onClick={onTogglePreview} style={{...btn,background:previewMode?'#6366f1':'rgba(99,102,241,.15)',color:previewMode?'#fff':'#818cf8'}}>
        <Eye size={13}/> {previewMode ? 'Edit' : 'Preview'}
      </button>

      {/* Save */}
      <button onClick={onSave} disabled={saving} style={{...btn,background:saving?'#64748b':'#10b981',color:'#fff'}}>
        <Save size={13}/> {saving ? 'Saving...' : 'Save'}
      </button>

      {/* Publish toggle */}
      <button onClick={onTogglePublish} style={{...btn,background:isPublished?'rgba(22,163,74,.12)':'rgba(14,165,233,.12)',color:isPublished?'#16a34a':'#38bdf8',border:`1px solid ${isPublished?'rgba(22,163,74,.2)':'rgba(14,165,233,.2)'}`}}>
        {isPublished ? <><Globe size={13}/> Published</> : <><GlobeLock size={13}/> Publish</>}
      </button>

      {/* Live link */}
      {isPublished && slug && (
        <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer"
          style={{...btn,background:'#0ea5e9',color:'#fff',textDecoration:'none'}}>
          Open ↗
        </a>
      )}
    </div>
  );
}

const btn = {
  padding:'7px 12px',border:'none',borderRadius:7,fontSize:11,fontWeight:700,
  cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4,fontFamily:'DM Sans,sans-serif',
};
const gh = {
  ...btn,background:'rgba(255,255,255,0.05)',color:'#6a7090',border:'1px solid #1f2440',
};
