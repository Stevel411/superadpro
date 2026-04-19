import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import { PALETTE, BG_PRESETS } from './elementDefaults';
import { Type, AlignLeft, Tag, ImageIcon, Play, Music, RectangleHorizontal, FormInput, Bell,
  MessageSquareQuote, Star, Quote, HelpCircle, BarChart3, Minus,
  Timer, Share2, FileText, SeparatorHorizontal, LayoutGrid, MoveVertical, Square, GripHorizontal, Code, Send } from 'lucide-react';

const BLOCK_ICONS = {
  heading: Type, text: AlignLeft, label: Tag,
  image: ImageIcon, video: Play, audio: Music,
  button: RectangleHorizontal, form: FormInput, announcement: Bell,
  review: MessageSquareQuote, badge: Star, testimonial: Quote, faq: HelpCircle, stat: BarChart3, progress: Minus,
  countdown: Timer, socialicons: Share2, icontext: FileText, separator: SeparatorHorizontal, logostrip: LayoutGrid, spacer: MoveVertical, box: Square, divider: GripHorizontal, embed: Code,
};

// Convert a hex colour like '#0ea5e9' into an 'r,g,b' triple used by rgba() in inline styles.
// Falls back to sky-blue if anything looks off so we never end up with a broken tile.
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length !== 7) return '14,165,233';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if ([r, g, b].some(v => isNaN(v))) return '14,165,233';
  return `${r},${g},${b}`;
}

// Produce a soft tinted "glass" background for a palette tile. Layers a subtle
// top-down sheen (suggesting light catching the glass surface) over a very
// faint wash of the category colour — so tiles feel tinted, not flat.
function tileBackground(rgb) {
  return `linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0) 100%), linear-gradient(160deg, rgba(${rgb},0.08) 0%, #ffffff 100%)`;
}

// Icon-bubble background (resting state) — the icon sits on a tinted chip that
// echoes the tile's category colour so the two pieces feel unified.
function iconBubbleBg(rgb) {
  return `linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 60%), rgba(${rgb},0.14)`;
}

// Resolve a translated label for a palette item. The i18n key pattern is
// 'superPagesEditor.blk<Suffix>' where <Suffix> is the element's type with a
// handful of aliases (form→OptIn, announcement→Banner, etc) and the first
// letter capitalised. If the key isn't present we fall through to the
// English name from the PALETTE data, which is never missing.
function blockLabel(t, item) {
  const type = item.type;
  const aliases = { form: 'OptIn', announcement: 'Banner', socialicons: 'Socials', icontext: 'IconText', faq: 'FAQ' };
  const suffix = aliases[type] || (type.charAt(0).toUpperCase() + type.slice(1));
  return t('superPagesEditor.blk' + suffix, { defaultValue: item.name });
}

export default function BlockPalette({ canvasBg, canvasBgImage, setCanvasBg, setCanvasBgImage, markDirty, onAddElement, pageId, onAiMessage }) {
  var { t } = useTranslation();
  const [bgType, setBgType] = useState(canvasBg?.startsWith('linear') ? 'gradient' : canvasBgImage ? 'image' : 'solid');
  const [grad1, setGrad1] = useState(() => {
    if (canvasBg?.startsWith('linear')) { const m = canvasBg.match(/#[a-fA-F0-9]{6}/g); return m?.[0] || '#0ea5e9'; }
    return '#0ea5e9';
  });
  const [grad2, setGrad2] = useState(() => {
    if (canvasBg?.startsWith('linear')) { const m = canvasBg.match(/#[a-fA-F0-9]{6}/g); return m?.[1] || '#6366f1'; }
    return '#6366f1';
  });
  const [gradDir, setGradDir] = useState('135deg');
  const [bgImageUrl, setBgImageUrl] = useState(canvasBgImage || '');
  const [bgOpen, setBgOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([{role:'ai',text:t('superPagesEditor.aiGreeting', { defaultValue: 'Tell me what to change — "add a heading", "change background to navy", "write sales copy"' })}]);
  const [chatSending, setChatSending] = useState(false);
  const chatRef = useRef(null);

  const applyBg = (bg) => { setCanvasBg(bg); markDirty(); };
  const applyBgImage = (url) => { setCanvasBgImage(url); setBgImageUrl(url); markDirty(); };
  const applyGradient = (c1, c2, dir) => { applyBg(`linear-gradient(${dir},${c1},${c2})`); };

  const sendChat = async () => {
    if (!chatMsg.trim() || chatSending) return;
    const msg = chatMsg.trim();
    setChatMsg('');
    setChatHistory(h => [...h, {role:'user',text:msg}]);
    setChatSending(true);
    try {
      const res = await fetch(`/api/pro/funnel/${pageId}/chat`, {
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({message:msg, sections:[], pageStyle:{bg:canvasBg}})
      });
      const data = await res.json();
      setChatHistory(h => [...h, {role:'ai',text:data.response||data.error||t('superPagesEditor.aiDone', { defaultValue: 'Done!' })}]);
      if (data.pageStyle?.bg) applyBg(data.pageStyle.bg);
      if (onAiMessage) onAiMessage(data);
    } catch(e) { setChatHistory(h => [...h, {role:'ai',text:t('superPagesEditor.aiConnError', { defaultValue: 'Connection error.' })}]); }
    setChatSending(false);
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 100);
  };

  // Light-theme gradient presets — curated to look good on landing pages.
  const GRAD_PRESETS = [
    ['#0ea5e9','#6366f1'], ['#8b5cf6','#ec4899'], ['#10b981','#059669'],
    ['#f59e0b','#ef4444'], ['#0f172a','#1e3a5f'], ['#132044','#16213e'],
    ['#667eea','#764ba2'], ['#f093fb','#f5576c'], ['#4facfe','#00f2fe'],
  ];

  return (
    <div style={{
      width: 284, flexShrink: 0,
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      borderLeft: '1px solid #e2e8f0',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{padding:'14px 16px',borderBottom:'1px solid #e8ecf2',flexShrink:0}}>
        <h3 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:800,color:'#0f172a'}}>{t('superPagesEditor.blocks')}</h3>
        <p style={{margin:'2px 0 0',fontSize:10,color:'#64748b'}}>{t('superPagesEditor.clickOrDragToAdd')}</p>
      </div>

      {/* Background Controls — collapsible */}
      <div style={{borderBottom:'1px solid #e8ecf2',flexShrink:0}}>
        <div onClick={() => setBgOpen(!bgOpen)} style={{padding:'10px 16px',cursor:'pointer',userSelect:'none',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:24,height:24,borderRadius:6,border:'1px solid #e2e8f0',flexShrink:0,background:canvasBgImage?`url(${canvasBgImage}) center/cover`:canvasBg||'#ffffff',boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.5)'}}/>
            <div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:0.5,textTransform:'uppercase',color:'#475569'}}>{t('superPagesEditor.pageBackground')}</div>
              <div style={{fontSize:9,color:'#64748b',marginTop:1}}>
                {canvasBgImage ? t('superPagesEditor.bgImage', { defaultValue: 'Image' })
                  : canvasBg?.startsWith('linear') ? t('superPagesEditor.bgGradient', { defaultValue: 'Gradient' })
                  : canvasBg || t('superPagesEditor.bgSolid', { defaultValue: 'Solid' })}
              </div>
            </div>
          </div>
          <span style={{fontSize:12,color:'#94a3b8',transition:'transform 0.2s',transform:bgOpen?'rotate(0)':'rotate(-90deg)'}}>▼</span>
        </div>

        {bgOpen && (
          <div style={{padding:'0 16px 14px'}}>
            {/* Type tabs */}
            <div style={{display:'flex',gap:4,marginBottom:10}}>
              {[
                ['solid', t('superPagesEditor.bgSolid', { defaultValue: 'Solid' })],
                ['gradient', t('superPagesEditor.bgGradient', { defaultValue: 'Gradient' })],
                ['image', t('superPagesEditor.bgImage', { defaultValue: 'Image' })],
              ].map(([key,label]) => (
                <button key={key} onClick={() => setBgType(key)} style={{
                  flex:1,padding:'6px 0',border:bgType===key?'1px solid rgba(14,165,233,0.3)':'1px solid #e2e8f0',borderRadius:6,fontSize:9,fontWeight:700,letterSpacing:0.3,textTransform:'uppercase',cursor:'pointer',
                  background:bgType===key?'rgba(14,165,233,0.08)':'#ffffff',
                  color:bgType===key?'#0284c7':'#64748b',
                  transition:'all .15s',
                }}>{label}</button>
              ))}
            </div>

            {/* Solid colour */}
            {bgType === 'solid' && (
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <div style={{position:'relative',width:36,height:36,borderRadius:8,border:'1px solid #e2e8f0',overflow:'hidden',flexShrink:0,background:canvasBg?.startsWith('#')?canvasBg:'#ffffff'}}>
                    <input type="color" value={canvasBg?.startsWith('#')?canvasBg:'#ffffff'} onChange={e => applyBg(e.target.value)}
                      style={{position:'absolute',inset:-4,width:'calc(100% + 8px)',height:'calc(100% + 8px)',border:'none',cursor:'pointer',padding:0}}/>
                  </div>
                  <div style={{fontSize:11,fontFamily:'monospace',color:'#475569'}}>{canvasBg?.startsWith('#')?canvasBg:'#ffffff'}</div>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                  {['#ffffff','#f8fafc','#f1f5f9','#e2e8f0','#0f172a','#132044','#1e293b','#0ea5e9','#6366f1','#8b5cf6','#16a34a','#f59e0b','#ec4899','#dc2626'].map(c => (
                    <div key={c} onClick={() => applyBg(c)} style={{
                      width:22,height:22,borderRadius:5,background:c,cursor:'pointer',
                      border:canvasBg===c?'2px solid #0ea5e9':'1px solid #e2e8f0',
                      boxShadow: canvasBg===c ? '0 0 0 2px rgba(14,165,233,0.25)' : 'none',
                    }}/>
                  ))}
                </div>
              </div>
            )}

            {/* Gradient */}
            {bgType === 'gradient' && (
              <div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                  <input type="color" value={grad1.startsWith('#')?grad1:'#0ea5e9'} onChange={e => { setGrad1(e.target.value); applyGradient(e.target.value, grad2, gradDir); }}
                    style={{width:34,height:30,borderRadius:6,border:'1px solid #e2e8f0',cursor:'pointer',padding:0}}/>
                  <span style={{fontSize:14,color:'#94a3b8'}}>→</span>
                  <input type="color" value={grad2.startsWith('#')?grad2:'#6366f1'} onChange={e => { setGrad2(e.target.value); applyGradient(grad1, e.target.value, gradDir); }}
                    style={{width:34,height:30,borderRadius:6,border:'1px solid #e2e8f0',cursor:'pointer',padding:0}}/>
                  <select value={gradDir} onChange={e => { setGradDir(e.target.value); applyGradient(grad1, grad2, e.target.value); }}
                    style={{padding:'5px 8px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:10,background:'#ffffff',color:'#475569',cursor:'pointer'}}>
                    <option value="135deg">↘</option><option value="180deg">↓</option><option value="90deg">→</option><option value="45deg">↗</option>
                  </select>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                  {GRAD_PRESETS.map(([c1,c2],i) => (
                    <div key={i} onClick={() => { setGrad1(c1); setGrad2(c2); applyGradient(c1, c2, gradDir); }} style={{
                      width:28,height:20,borderRadius:5,cursor:'pointer',
                      background:`linear-gradient(135deg,${c1},${c2})`,
                      border:'1px solid #e2e8f0',
                    }}/>
                  ))}
                </div>
              </div>
            )}

            {/* Image */}
            {bgType === 'image' && (
              <div>
                <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'12px',borderRadius:8,border:'1px dashed #cbd5e1',cursor:'pointer',background:'#f8fafc',marginBottom:8}}>
                  <span style={{fontSize:11,color:'#475569',fontWeight:600}}>{t('superPagesEditor.uploadBgImage')}</span>
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const fd = new FormData(); fd.append('file', f);
                    try {
                      const r = await fetch('/api/funnels/upload-image', {method:'POST', body:fd, credentials:'include'});
                      const d = await r.json();
                      if (d.url) { applyBgImage(d.url); setBgType('image'); }
                    } catch(err) { console.error(err); }
                  }} />
                </label>
                {canvasBgImage && (
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:40,height:28,borderRadius:4,background:`url(${canvasBgImage}) center/cover`,border:'1px solid #e2e8f0'}}/>
                    <div style={{flex:1,fontSize:9,color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t('superPagesEditor.backgroundSet')}</div>
                    <button onClick={() => { setCanvasBgImage(''); setBgImageUrl(''); markDirty(); }}
                      style={{width:22,height:22,borderRadius:4,background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.25)',cursor:'pointer',fontSize:9,color:'#dc2626',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Block list — glass tiles */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 10px',minHeight:0}}>
        {PALETTE.map((cat, ci) => {
          // Category-level colour: inherit from the first item's .color so each
          // section has a matching dot + tint across all tiles.
          const catColor = cat.items?.[0]?.color || '#0ea5e9';
          const catRgb = hexToRgb(catColor);
          return (
            <div key={ci} style={{marginBottom: 8}}>
              {/* Section head with coloured dot */}
              <div style={{display:'flex',alignItems:'center',gap:7,padding:'12px 4px 8px',...(ci===0?{paddingTop:4}:{})}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:catColor,flexShrink:0,boxShadow:`0 0 0 3px rgba(${catRgb},0.12)`}}/>
                <span style={{fontSize:10,fontWeight:800,letterSpacing:1.4,textTransform:'uppercase',color:'#64748b'}}>
                  {t('superPagesEditor.cat'+cat.label, { defaultValue: cat.label })}
                </span>
              </div>

              {/* Glass tile grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7}}>
                {cat.items.map((item, ii) => {
                  const Icon = BLOCK_ICONS[item.type] || Square;
                  const rgb = hexToRgb(item.color);
                  return (
                    <div key={ii}
                      onClick={() => onAddElement(item.type)}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('text/plain', item.type)}
                      className="pal-item"
                      style={{
                        '--pal-rgb': rgb,
                        '--pal-color': item.color,
                        background: tileBackground(rgb),
                        border: '1px solid rgba(255,255,255,0.8)',
                        borderRadius: 11,
                        padding: '12px 4px 10px',
                        textAlign: 'center', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        userSelect: 'none', position: 'relative', overflow: 'hidden',
                        boxShadow: `0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.03), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(${rgb},0.06)`,
                        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s cubic-bezier(0.4,0,0.2,1), border-color 0.22s cubic-bezier(0.4,0,0.2,1)',
                        isolation: 'isolate',
                      }}
                    >
                      <div className="pal-icon" style={{
                        width: 34, height: 34, borderRadius: 9,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: iconBubbleBg(rgb),
                        color: item.color,
                        boxShadow: `0 1px 2px rgba(15,23,42,0.04), 0 2px 6px rgba(${rgb},0.14), inset 0 1px 0 rgba(255,255,255,0.85)`,
                        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                        position: 'relative', zIndex: 2,
                      }}>
                        <Icon size={18} strokeWidth={2.2}/>
                      </div>
                      <span className="pal-label" style={{fontSize:9,fontWeight:700,letterSpacing:0.3,textTransform:'uppercase',color:'#334155',position:'relative',zIndex:2,transition:'color 0.22s'}}>{blockLabel(t, item)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Chat — light theme */}
      <div style={{borderTop:'1px solid #e8ecf2',flexShrink:0,background:'#ffffff',display:'flex',flexDirection:'column'}}>
        <div onClick={() => setChatOpen(!chatOpen)} style={{padding:'10px 14px',cursor:'pointer',userSelect:'none',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:0.7,textTransform:'uppercase',color:'#0284c7'}}>{t('superPagesEditor.aiAssistant')}</span>
          <span style={{fontSize:12,color:'#94a3b8',transition:'transform 0.2s',transform:chatOpen?'rotate(0)':'rotate(180deg)'}}>▼</span>
        </div>
        {chatOpen && (
          <div style={{display:'flex',flexDirection:'column',maxHeight:220,overflow:'hidden'}}>
            <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'8px 12px',display:'flex',flexDirection:'column',gap:5,background:'#f8fafc',minHeight:0}}>
              {chatHistory.map((m,i) => (
                <div key={i} style={{
                  maxWidth:'88%',padding:'7px 11px',borderRadius:10,fontSize:11,lineHeight:1.5,wordWrap:'break-word',
                  ...(m.role==='user'
                    ? {background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',alignSelf:'flex-end',borderBottomRightRadius:2,boxShadow:'0 2px 6px rgba(14,165,233,0.25)'}
                    : {background:'#ffffff',color:'#334155',alignSelf:'flex-start',border:'1px solid #e2e8f0',borderBottomLeftRadius:2}),
                }}>{m.text}</div>
              ))}
            </div>
            <div style={{display:'flex',gap:5,padding:'8px 12px',borderTop:'1px solid #e8ecf2',flexShrink:0,background:'#ffffff'}}>
              <textarea value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()} }}
                rows={1} placeholder={t("superPagesEditor.askAiPlaceholder")}
                style={{flex:1,padding:'8px 11px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:11,fontFamily:'DM Sans,sans-serif',color:'#0f172a',resize:'none',background:'#ffffff',outline:'none'}}/>
              <button onClick={sendChat} disabled={chatSending}
                style={{width:34,height:34,border:'none',borderRadius:8,background:'linear-gradient(135deg,#0ea5e9,#6366f1)',color:'#fff',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:chatSending?0.5:1,boxShadow:'0 2px 6px rgba(14,165,233,0.3)'}}>
                <Send size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {/*
        The glass effect is built from layered pseudo-elements so the tile body
        stays clean and the rendered SVG icons are never overlapped by overlay
        fills. ::before = top specular highlight (the curved arc of reflected
        light), ::after = faint under-glow tinted by the category colour.
        On hover the tile lifts 3 px, the shadow deepens with the category hue,
        and the icon bubble shifts from tinted glass to solid gradient fill.
      */}
      <style>{`
        .pal-item::before {
          content: ''; position: absolute;
          top: 0; left: 12%; right: 12%; height: 40%;
          background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%);
          border-radius: 50% 50% 0 0 / 80% 80% 0 0;
          pointer-events: none; z-index: 1;
        }
        .pal-item::after {
          content: ''; position: absolute; inset: 0;
          border-radius: 11px; pointer-events: none; z-index: 0;
          background: linear-gradient(180deg, transparent 60%, rgba(var(--pal-rgb), 0.05) 100%);
        }
        .pal-item:hover {
          transform: translateY(-3px);
          border-color: rgba(var(--pal-rgb), 0.3) !important;
          box-shadow:
            0 2px 4px rgba(15,23,42,0.04),
            0 12px 28px rgba(var(--pal-rgb), 0.18),
            0 18px 40px rgba(var(--pal-rgb), 0.1),
            inset 0 1px 0 rgba(255,255,255,0.9) !important;
        }
        .pal-item:hover .pal-icon {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 60%),
            linear-gradient(135deg, var(--pal-color), color-mix(in srgb, var(--pal-color) 70%, #fff)) !important;
          color: #fff !important;
          transform: scale(1.1);
          box-shadow:
            0 4px 10px rgba(var(--pal-rgb), 0.4),
            0 2px 4px rgba(var(--pal-rgb), 0.2),
            inset 0 1px 0 rgba(255,255,255,0.4) !important;
        }
        .pal-item:hover .pal-label {
          color: var(--pal-color) !important;
        }
        .pal-item:active {
          transform: translateY(-1px);
          transition: transform 0.08s;
        }
      `}</style>
    </div>
  );
}
