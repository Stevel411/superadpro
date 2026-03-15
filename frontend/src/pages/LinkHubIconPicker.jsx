import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { ICON_CATEGORIES, ICONS, ARROW_STYLES } from './LinkHubIcons';

// Renders an SVG icon from the library
export function LinkIcon({ iconKey, style, size, color, filled }) {
  if (!iconKey) return null;
  // Check if it's an emoji (not in our SVG library)
  var icon = ICONS.find(function(ic) { return ic.key === iconKey; });
  if (!icon) {
    // Might be an emoji
    return <span style={Object.assign({ fontSize: (size || 16) + 'px' }, style || {})}>{iconKey}</span>;
  }
  var d = filled ? icon.solid : icon.outline;
  var s = size || 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={filled ? (color || 'currentColor') : 'none'}
      stroke={filled ? 'none' : (color || 'currentColor')} strokeWidth={filled ? 0 : 2}
      strokeLinecap="round" strokeLinejoin="round" style={style || {}}>
      <path d={d}/>
    </svg>
  );
}

// Full icon picker modal/dropdown
export default function IconPicker({ value, onChange, onClose }) {
  var [search, setSearch] = useState('');
  var [cat, setCat] = useState('all');
  var [filled, setFilled] = useState(false);
  var [tab, setTab] = useState('icons'); // icons | emoji | none

  var q = search.toLowerCase().trim();

  var filteredIcons = ICONS.filter(function(ic) {
    if (cat !== 'all' && ic.cat !== cat) return false;
    if (q && !ic.label.toLowerCase().includes(q) && !ic.key.includes(q)) return false;
    return true;
  });

  var EMOJIS = ['🔗','🌐','📺','🎵','📱','💬','📧','🛒','💰','📚','🎯','🔥','⭐','💎','🚀','📸','🎮','🎤','📝','👤','💼','🏠','🎁','❤️','✅','🏆','👑','🎉','💡','🔔','📌','🎬','🎨','📊','🤝','💪','🌟','🍕','☕','✈️','🏋️','🧘','🎸','🎹','📖','💻','🖥️','📞'];

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div onClick={function(e) { e.stopPropagation(); }} style={{background:'#fff',borderRadius:16,width:480,maxWidth:'95vw',maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.3)',overflow:'hidden'}}>

        {/* Header */}
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f3f7',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:800,color:'#0f172a'}}>Choose Icon</h3>
          <button onClick={onClose} style={{width:30,height:30,border:'none',borderRadius:8,background:'#f1f5f9',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14} color="#64748b"/></button>
        </div>

        {/* Tabs: Icons | Emoji | None */}
        <div style={{display:'flex',gap:4,padding:'12px 20px 0',flexShrink:0}}>
          {[['icons','SVG Icons'],['emoji','Emoji'],['none','No Icon']].map(function(t) {
            return <button key={t[0]} onClick={function() { setTab(t[0]); if (t[0] === 'none') { onChange({ type: 'none' }); } }}
              style={{padding:'8px 16px',borderRadius:8,fontSize:12,fontWeight:700,border:'none',cursor:'pointer',fontFamily:'inherit',
                background:tab===t[0]?'#0ea5e9':'#f1f5f9',color:tab===t[0]?'#fff':'#64748b'}}>{t[1]}</button>;
          })}
        </div>

        {tab === 'icons' && (
          <>
            {/* Search + style toggle */}
            <div style={{padding:'12px 20px',display:'flex',gap:8,flexShrink:0}}>
              <div style={{flex:1,position:'relative'}}>
                <Search size={14} color="#94a3b8" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}/>
                <input value={search} onChange={function(e) { setSearch(e.target.value); }}
                  placeholder="Search icons..." style={{width:'100%',padding:'8px 8px 8px 32px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:12,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
              <div style={{display:'flex',border:'1.5px solid #e2e8f0',borderRadius:8,overflow:'hidden'}}>
                <button onClick={function() { setFilled(false); }} style={{padding:'6px 12px',fontSize:11,fontWeight:700,border:'none',cursor:'pointer',fontFamily:'inherit',background:!filled?'#0ea5e9':'#fff',color:!filled?'#fff':'#64748b'}}>Outline</button>
                <button onClick={function() { setFilled(true); }} style={{padding:'6px 12px',fontSize:11,fontWeight:700,border:'none',cursor:'pointer',fontFamily:'inherit',background:filled?'#0ea5e9':'#fff',color:filled?'#fff':'#64748b'}}>Solid</button>
              </div>
            </div>

            {/* Category pills */}
            <div style={{display:'flex',gap:4,padding:'0 20px 8px',flexWrap:'wrap',flexShrink:0}}>
              <button onClick={function() { setCat('all'); }} style={{padding:'4px 10px',borderRadius:12,fontSize:10,fontWeight:700,border:'none',cursor:'pointer',fontFamily:'inherit',background:cat==='all'?'#1e293b':'#f1f5f9',color:cat==='all'?'#fff':'#64748b'}}>All</button>
              {ICON_CATEGORIES.map(function(c) {
                return <button key={c.key} onClick={function() { setCat(c.key); }} style={{padding:'4px 10px',borderRadius:12,fontSize:10,fontWeight:700,border:'none',cursor:'pointer',fontFamily:'inherit',background:cat===c.key?c.color:'#f1f5f9',color:cat===c.key?'#fff':'#64748b'}}>{c.label}</button>;
              })}
            </div>

            {/* Icon grid */}
            <div style={{flex:1,overflowY:'auto',padding:'8px 20px 16px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:4}}>
                {filteredIcons.map(function(ic) {
                  var isSelected = value && value.type === 'svg' && value.key === ic.key;
                  return (
                    <button key={ic.key} title={ic.label} onClick={function() { onChange({ type: 'svg', key: ic.key, filled: filled }); }}
                      style={{width:'100%',aspectRatio:'1',border:isSelected?'2px solid #0ea5e9':'1.5px solid transparent',borderRadius:8,background:isSelected?'#dbeafe':'#f8f9fb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'.15s'}}>
                      <LinkIcon iconKey={ic.key} size={20} filled={filled} color="#1e293b"/>
                    </button>
                  );
                })}
              </div>
              {filteredIcons.length === 0 && (
                <div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>No icons match "{search}"</div>
              )}
            </div>
          </>
        )}

        {tab === 'emoji' && (
          <div style={{flex:1,overflowY:'auto',padding:'12px 20px 16px'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:4}}>
              {EMOJIS.map(function(emoji) {
                var isSelected = value && value.type === 'emoji' && value.key === emoji;
                return (
                  <button key={emoji} onClick={function() { onChange({ type: 'emoji', key: emoji }); }}
                    style={{width:'100%',aspectRatio:'1',border:isSelected?'2px solid #0ea5e9':'1.5px solid transparent',borderRadius:8,background:isSelected?'#dbeafe':'#f8f9fb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'none' && (
          <div style={{padding:40,textAlign:'center',color:'#64748b'}}>
            <div style={{fontSize:32,marginBottom:8,opacity:.3}}>⊘</div>
            <div style={{fontSize:13,fontWeight:600}}>No icon will be shown on this link</div>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>Click Save to apply</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Arrow style picker (inline, not modal)
export function ArrowPicker({ value, onChange }) {
  return (
    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
      {ARROW_STYLES.map(function(a) {
        var isSelected = value === a.key;
        return (
          <button key={a.key} onClick={function() { onChange(a.key); }}
            style={{width:36,height:36,border:isSelected?'2px solid #0ea5e9':'1.5px solid #e2e8f0',borderRadius:8,background:isSelected?'#dbeafe':'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:a.key==='none'?10:18,color:isSelected?'#0ea5e9':'#64748b',fontWeight:700,fontFamily:'inherit'}}>
            {a.key === 'none' ? '⊘' : a.char}
          </button>
        );
      })}
    </div>
  );
}
