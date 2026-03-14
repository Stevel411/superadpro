import { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Palette, Type } from 'lucide-react';
import { FONTS, FONT_SIZES } from './elementDefaults';

export default function InlineToolbar({ visible, position, onCommand }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const colorRef = useRef(null);
  const bgRef = useRef(null);

  if (!visible) return null;

  const cmd = (command, value) => {
    document.execCommand(command, false, value);
    if (onCommand) onCommand();
  };

  const TB = ({children, onClick, title, active}) => (
    <button onClick={onClick} title={title} style={{
      width:30,height:30,border:'none',borderRadius:6,background:active?'rgba(14,165,233,.15)':'transparent',
      color:active?'#0ea5e9':'#5a6070',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'.12s',
    }}>{children}</button>
  );
  const Sep = () => <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 2px'}}/>;

  return (
    <div style={{
      position:'fixed', left:position.x, top:position.y, zIndex:300,
      background:'#fafbfd', border:'1px solid #e2e8f0', borderRadius:10,
      padding:'4px 6px', display:'flex', alignItems:'center', gap:2,
      boxShadow:'0 4px 20px rgba(0,0,0,.12),0 1px 4px rgba(0,0,0,.06)',
      whiteSpace:'nowrap', transform:'translateX(-50%)',
    }}>
      {/* Font family */}
      <select onChange={e => cmd('fontName', e.target.value)} defaultValue=""
        style={{height:28,border:'1px solid #e2e8f0',borderRadius:6,fontSize:10,fontWeight:600,color:'#475569',background:'#fff',padding:'0 4px',maxWidth:90,cursor:'pointer',outline:'none'}}>
        <option value="" disabled>Font</option>
        {FONTS.map(f => <option key={f.value} value={f.value} style={{fontFamily:f.value}}>{f.label}</option>)}
      </select>

      {/* Font size */}
      <select onChange={e => { const sz = e.target.value; cmd('fontSize', '7'); setTimeout(() => {
          document.querySelectorAll('font[size="7"]').forEach(el => { el.removeAttribute('size'); el.style.fontSize = sz; });
          if (onCommand) onCommand();
        }, 10); }} defaultValue=""
        style={{height:28,border:'1px solid #e2e8f0',borderRadius:6,fontSize:10,fontWeight:600,color:'#475569',background:'#fff',padding:'0 4px',width:52,cursor:'pointer',outline:'none'}}>
        <option value="" disabled>Size</option>
        {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <Sep/>

      <TB onClick={() => cmd('bold')} title="Bold"><Bold size={14}/></TB>
      <TB onClick={() => cmd('italic')} title="Italic"><Italic size={14}/></TB>
      <TB onClick={() => cmd('underline')} title="Underline"><Underline size={14}/></TB>
      <TB onClick={() => cmd('strikethrough')} title="Strikethrough"><Strikethrough size={14}/></TB>

      <Sep/>

      {/* Text colour */}
      <div style={{position:'relative'}}>
        <TB onClick={() => { setShowColorPicker(!showColorPicker); setShowBgPicker(false); }} title="Text Colour">
          <Type size={14}/>
          <div style={{position:'absolute',bottom:2,left:6,right:6,height:3,background:'#0ea5e9',borderRadius:1}}/>
        </TB>
        {showColorPicker && (
          <input ref={colorRef} type="color" defaultValue="#ffffff"
            onChange={e => cmd('foreColor', e.target.value)}
            onBlur={() => setShowColorPicker(false)}
            style={{position:'absolute',top:34,left:0,width:40,height:30,border:'none',padding:0,cursor:'pointer'}}
            autoFocus/>
        )}
      </div>

      {/* Highlight */}
      <div style={{position:'relative'}}>
        <TB onClick={() => { setShowBgPicker(!showBgPicker); setShowColorPicker(false); }} title="Highlight">
          <Palette size={14}/>
        </TB>
        {showBgPicker && (
          <input ref={bgRef} type="color" defaultValue="#fbbf24"
            onChange={e => cmd('hiliteColor', e.target.value)}
            onBlur={() => setShowBgPicker(false)}
            style={{position:'absolute',top:34,left:0,width:40,height:30,border:'none',padding:0,cursor:'pointer'}}
            autoFocus/>
        )}
      </div>

      <Sep/>

      <TB onClick={() => cmd('justifyLeft')} title="Align Left"><AlignLeft size={14}/></TB>
      <TB onClick={() => cmd('justifyCenter')} title="Align Centre"><AlignCenter size={14}/></TB>
      <TB onClick={() => cmd('justifyRight')} title="Align Right"><AlignRight size={14}/></TB>

      <Sep/>

      <TB onClick={() => cmd('removeFormat')} title="Clear Formatting">
        <span style={{fontSize:11,fontWeight:800,color:'#dc2626'}}>✕</span>
      </TB>
    </div>
  );
}
