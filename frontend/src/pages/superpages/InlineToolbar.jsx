import { useRef } from 'react';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Palette, Type } from 'lucide-react';
import { FONTS, FONT_SIZES } from './elementDefaults';

export default function InlineToolbar({ visible, position, onCommand }) {
  const colorRef = useRef(null);
  const bgRef = useRef(null);
  const savedRange = useRef(null);

  if (!visible) return null;

  const cmd = (command, value) => {
    document.execCommand(command, false, value);
    if (onCommand) onCommand();
  };

  // Save current text selection
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  // Restore saved text selection
  const restoreSelection = () => {
    if (savedRange.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  // Prevent mousedown from stealing focus/selection from contentEditable
  const noFocus = (e) => e.preventDefault();

  const TB = ({children, onClick, title, active, onMouseDown}) => (
    <button onMouseDown={onMouseDown || noFocus} onClick={onClick} title={title} style={{
      width:30,height:30,border:'none',borderRadius:6,background:active?'rgba(14,165,233,.15)':'transparent',
      color:active?'#0ea5e9':'#5a6070',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'.12s',position:'relative',
    }}>{children}</button>
  );
  const Sep = () => <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 2px'}}/>;

  // Open colour picker — save selection first, restore on change
  const openPicker = (ref) => {
    saveSelection();
    if (ref.current) ref.current.click();
  };

  // Apply colour with selection restoration
  const applyColor = (command, value) => {
    restoreSelection();
    cmd(command, value);
  };

  return (
    <div onMouseDown={noFocus} style={{
      position:'fixed', left:position.x, top:position.y, zIndex:300,
      background:'#fafbfd', border:'1px solid #e2e8f0', borderRadius:10,
      padding:'4px 6px', display:'flex', alignItems:'center', gap:2,
      boxShadow:'0 4px 20px rgba(0,0,0,.12),0 1px 4px rgba(0,0,0,.06)',
      whiteSpace:'nowrap', transform:'translateX(-50%)',
    }}>
      {/* Font family */}
      <select onMouseDown={e => e.stopPropagation()} onChange={e => cmd('fontName', e.target.value)} defaultValue=""
        style={{height:28,border:'1px solid #e2e8f0',borderRadius:6,fontSize:10,fontWeight:600,color:'#475569',background:'#fff',padding:'0 4px',maxWidth:90,cursor:'pointer',outline:'none'}}>
        <option value="" disabled>Font</option>
        {FONTS.map(f => <option key={f.value} value={f.value} style={{fontFamily:f.value}}>{f.label}</option>)}
      </select>

      {/* Font size */}
      <select onMouseDown={e => e.stopPropagation()} onChange={e => { const sz = e.target.value; cmd('fontSize', '7'); setTimeout(() => {
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
        <TB onClick={() => openPicker(colorRef)} title="Text Colour">
          <span style={{fontSize:10,fontWeight:800,color:'#475569'}}>A</span>
          <div style={{position:'absolute',bottom:3,left:7,right:7,height:3,background:'#ef4444',borderRadius:1}}/>
        </TB>
        <input ref={colorRef} type="color" defaultValue="#ffffff"
          onChange={e => applyColor('foreColor', e.target.value)}
          style={{position:'absolute',top:0,left:0,width:0,height:0,opacity:0,overflow:'hidden',border:'none',padding:0}}/>
      </div>

      {/* Background highlight */}
      <div style={{position:'relative'}}>
        <TB onClick={() => openPicker(bgRef)} title="Background Highlight">
          <span style={{fontSize:10,fontWeight:800,color:'#475569',background:'#fbbf24',padding:'1px 4px',borderRadius:3}}>A</span>
        </TB>
        <input ref={bgRef} type="color" defaultValue="#fbbf24"
          onChange={e => applyColor('hiliteColor', e.target.value)}
          style={{position:'absolute',top:0,left:0,width:0,height:0,opacity:0,overflow:'hidden',border:'none',padding:0}}/>
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
