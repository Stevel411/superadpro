import { Eye, Save, Undo2, Redo2, Settings, Trash2, ArrowLeft, Globe, GlobeLock, Smartphone, Monitor, Tablet, HelpCircle } from 'lucide-react';

export default function EditorTopbar({ title, slug, saving, dirty, status, onSave, onClear, onShowSettings, onUndo, onRedo, onBack, onTogglePublish, onTogglePreview, previewMode, deviceView, onSetDevice, onShowHelp }) {
  const isPublished = status === 'published';
  return (
    <div style={{
      height: 60, background: '#1c223d', borderBottom: '1px solid #1f2440',
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0, zIndex: 50,
    }}>
      {/* SuperPages Logo — Concept B */}
      <div onClick={onBack} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        <svg width="28" height="28" viewBox="0 0 48 48">
          <rect x="6" y="6" width="16" height="16" rx="4" fill="#0ea5e9" opacity=".9"/>
          <rect x="26" y="6" width="16" height="16" rx="4" fill="#6366f1" opacity=".7"/>
          <rect x="6" y="26" width="16" height="16" rx="4" fill="#6366f1" opacity=".5"/>
          <rect x="26" y="26" width="16" height="16" rx="4" fill="#0ea5e9" opacity=".3"/>
        </svg>
        <div style={{fontFamily:'Sora,sans-serif',fontWeight:800,fontSize:15,color:'#fff',lineHeight:1}}>
          Super<span style={{color:'#0ea5e9'}}>Pages</span>
        </div>
      </div>

      <div style={{width:1,height:28,background:'rgba(255,255,255,0.06)'}}/>

      <div style={{fontSize:12,color:'#5a6080',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        {title || 'Untitled Page'}
        {dirty && <span style={{color:'#f59e0b',marginLeft:6}}>●</span>}
      </div>

      {/* Device view toggles */}
      <button onClick={() => onSetDevice('desktop')} style={{...gh,background:deviceView==='desktop'?'rgba(14,165,233,.15)':'rgba(255,255,255,.05)',color:deviceView==='desktop'?'#38bdf8':'#6a7090'}} title="Desktop (1100px)">
        <Monitor size={14}/>
      </button>
      <button onClick={() => onSetDevice('tablet')} style={{...gh,background:deviceView==='tablet'?'rgba(14,165,233,.15)':'rgba(255,255,255,.05)',color:deviceView==='tablet'?'#38bdf8':'#6a7090'}} title="Tablet (768px)">
        <Tablet size={14}/>
      </button>
      <button onClick={() => onSetDevice('mobile')} style={{...gh,background:deviceView==='mobile'?'rgba(14,165,233,.15)':'rgba(255,255,255,.05)',color:deviceView==='mobile'?'#38bdf8':'#6a7090'}} title="Mobile (390px)">
        <Smartphone size={14}/>
      </button>

      <div style={{width:1,height:22,background:'rgba(255,255,255,0.06)'}}/>

      <button onClick={onUndo} style={gh} title="Undo (Ctrl+Z)"><Undo2 size={14}/></button>
      <button onClick={onRedo} style={gh} title="Redo (Ctrl+Y)"><Redo2 size={14}/></button>

      <div style={{width:1,height:22,background:'rgba(255,255,255,0.06)'}}/>

      <button onClick={onShowSettings} style={gh}><Settings size={13}/> <span style={{marginLeft:2}}>Settings</span></button>
      <button onClick={onShowHelp} style={{...gh,color:'#38bdf8'}}><HelpCircle size={13}/> <span style={{marginLeft:2}}>Help</span></button>
      <button onClick={onClear} style={{...gh,color:'#dc2626'}}><Trash2 size={13}/></button>

      <div style={{width:1,height:22,background:'rgba(255,255,255,0.06)'}}/>

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
