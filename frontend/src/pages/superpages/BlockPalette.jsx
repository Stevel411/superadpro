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

export default function BlockPalette({ canvasBg, canvasBgImage, setCanvasBg, setCanvasBgImage, markDirty, onAddElement, pageId, onAiMessage }) {
  var { t } = useTranslation();
  const [bgType, setBgType] = useState(canvasBg?.startsWith('linear') ? 'gradient' : canvasBgImage ? 'image' : 'solid');
  const [grad1, setGrad1] = useState(() => {
    if (canvasBg?.startsWith('linear')) { const m = canvasBg.match(/#[a-fA-F0-9]{6}/g); return m?.[0] || 'var(--sap-accent)'; }
    return 'var(--sap-accent)';
  });
  const [grad2, setGrad2] = useState(() => {
    if (canvasBg?.startsWith('linear')) { const m = canvasBg.match(/#[a-fA-F0-9]{6}/g); return m?.[1] || 'var(--sap-indigo)'; }
    return 'var(--sap-indigo)';
  });
  const [gradDir, setGradDir] = useState('135deg');
  const [bgImageUrl, setBgImageUrl] = useState(canvasBgImage || '');
  const [bgOpen, setBgOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([{role:'ai',text:'Tell me what to change — "add a heading", "change background to navy", "write sales copy"'}]);
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
      setChatHistory(h => [...h, {role:'ai',text:data.response||data.error||'Done!'}]);
      if (data.pageStyle?.bg) applyBg(data.pageStyle.bg);
      if (onAiMessage) onAiMessage(data);
    } catch(e) { setChatHistory(h => [...h, {role:'ai',text:'Connection error.'}]); }
    setChatSending(false);
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 100);
  };

  const GRAD_PRESETS = [
    ['var(--sap-accent)','var(--sap-indigo)'], ['var(--sap-purple)','var(--sap-pink)'], ['var(--sap-green-mid)','var(--sap-green-dark)'],
    ['var(--sap-amber)','var(--sap-red-bright)'], ['var(--sap-text-primary)','#1e3a5f'], ['#132044','#16213e'],
    ['#667eea','#764ba2'], ['#f093fb','#f5576c'], ['#4facfe','#00f2fe'],
  ];

  return (
    <div style={{width:280,height:'calc(100vh - 60px)',background:'var(--sap-cobalt-deep)',borderLeft:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>

      {/* Header */}
      <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <h3 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:800,color:'var(--sap-border)'}}>✦ Blocks</h3>
        <p style={{margin:'2px 0 0',fontSize:10,color:'rgba(255,255,255,0.7)'}}>{t('superPagesEditor.clickOrDragToAdd')}</p>
      </div>

      {/* Background Controls — collapsible */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <div onClick={() => setBgOpen(!bgOpen)} style={{padding:'10px 16px',cursor:'pointer',userSelect:'none',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:24,height:24,borderRadius:6,border:'2px solid rgba(255,255,255,0.15)',flexShrink:0,background:canvasBgImage?`url(${canvasBgImage}) center/cover`:canvasBg}}/>
            <div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:0.5,textTransform:'uppercase',color:'rgba(255,255,255,0.85)'}}>{t('superPagesEditor.pageBackground')}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.65)',marginTop:1}}>
                {canvasBgImage?'Image':canvasBg?.startsWith('linear')?'Gradient':canvasBg||'Solid'}
              </div>
            </div>
          </div>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.65)',transition:'transform 0.2s',transform:bgOpen?'rotate(0)':'rotate(-90deg)'}}>▼</span>
        </div>

        {bgOpen && (
          <div style={{padding:'0 16px 14px'}}>
            {/* Type tabs */}
            <div style={{display:'flex',gap:4,marginBottom:10}}>
              {[['solid','Solid'],['gradient','Gradient'],['image','Image']].map(([key,label]) => (
                <button key={key} onClick={() => setBgType(key)} style={{
                  flex:1,padding:'6px 0',border:'none',borderRadius:6,fontSize:9,fontWeight:700,letterSpacing:0.3,textTransform:'uppercase',cursor:'pointer',
                  background:bgType===key?'rgba(14,165,233,.2)':'rgba(255,255,255,.04)',
                  color:bgType===key?'var(--sap-accent-light)':'rgba(255,255,255,.35)',
                  transition:'all .15s',
                }}>{label}</button>
              ))}
            </div>

            {/* Solid colour */}
            {bgType === 'solid' && (
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <div style={{position:'relative',width:36,height:36,borderRadius:8,border:'2px solid rgba(255,255,255,0.15)',overflow:'hidden',flexShrink:0,background:canvasBg?.startsWith('#')?canvasBg:'#ffffff'}}>
                    <input type="color" value={canvasBg?.startsWith('#')?canvasBg:'#ffffff'} onChange={e => applyBg(e.target.value)}
                      style={{position:'absolute',inset:-4,width:'calc(100% + 8px)',height:'calc(100% + 8px)',border:'none',cursor:'pointer',padding:0}}/>
                  </div>
                  <div style={{fontSize:11,fontFamily:'monospace',color:'rgba(255,255,255,.75)'}}>{canvasBg?.startsWith('#')?canvasBg:'#ffffff'}</div>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                  {['var(--sap-cobalt-deep)','var(--sap-text-primary)','var(--sap-text-primary)','#ffffff','var(--sap-bg-elevated)','var(--sap-amber-bg)','#132044','#0c1222','var(--sap-cobalt-deep)','#7f1d1d','#14532d','#1e3a5f'].map(c => (
                    <div key={c} onClick={() => applyBg(c)} style={{
                      width:22,height:22,borderRadius:5,background:c,cursor:'pointer',
                      border:canvasBg===c?'2px solid #0ea5e9':'1px solid rgba(255,255,255,.12)',
                      transition:'transform .1s',
                    }}/>
                  ))}
                </div>
              </div>
            )}

            {/* Gradient */}
            {bgType === 'gradient' && (
              <div>
                {/* Preview bar */}
                <div style={{height:28,borderRadius:8,marginBottom:10,background:`linear-gradient(${gradDir},${grad1},${grad2})`,border:'1px solid rgba(255,255,255,.1)'}}/>
                {/* Colour pickers */}
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                  <div style={{flex:1,display:'flex',alignItems:'center',gap:6}}>
                    <div style={{position:'relative',width:30,height:30,borderRadius:6,border:'2px solid rgba(255,255,255,0.15)',overflow:'hidden',background:grad1}}>
                      <input type="color" value={grad1} onChange={e => { setGrad1(e.target.value); applyGradient(e.target.value, grad2, gradDir); }}
                        style={{position:'absolute',inset:-4,width:'calc(100% + 8px)',height:'calc(100% + 8px)',border:'none',cursor:'pointer',padding:0}}/>
                    </div>
                    <div style={{fontSize:9,color:'rgba(255,255,255,.7)'}}>{t('superPagesEditor.gradientStart')}</div>
                  </div>
                  <div style={{fontSize:14,color:'rgba(255,255,255,.5)'}}>→</div>
                  <div style={{flex:1,display:'flex',alignItems:'center',gap:6}}>
                    <div style={{position:'relative',width:30,height:30,borderRadius:6,border:'2px solid rgba(255,255,255,0.15)',overflow:'hidden',background:grad2}}>
                      <input type="color" value={grad2} onChange={e => { setGrad2(e.target.value); applyGradient(grad1, e.target.value, gradDir); }}
                        style={{position:'absolute',inset:-4,width:'calc(100% + 8px)',height:'calc(100% + 8px)',border:'none',cursor:'pointer',padding:0}}/>
                    </div>
                    <div style={{fontSize:9,color:'rgba(255,255,255,.7)'}}>{t('superPagesEditor.gradientEnd')}</div>
                  </div>
                </div>
                {/* Direction */}
                <div style={{display:'flex',gap:3,marginBottom:10}}>
                  {[['135deg','↘'],['180deg','↓'],['90deg','→'],['45deg','↗'],['225deg','↙'],['270deg','←'],['315deg','↖'],['0deg','↑']].map(([deg,arrow]) => (
                    <button key={deg} onClick={() => { setGradDir(deg); applyGradient(grad1, grad2, deg); }} style={{
                      flex:1,padding:'4px 0',border:'none',borderRadius:4,fontSize:11,cursor:'pointer',
                      background:gradDir===deg?'rgba(14,165,233,.2)':'rgba(255,255,255,.04)',
                      color:gradDir===deg?'var(--sap-accent-light)':'rgba(255,255,255,.3)',
                    }}>{arrow}</button>
                  ))}
                </div>
                {/* Presets */}
                <div style={{fontSize:8,fontWeight:700,letterSpacing:0.5,textTransform:'uppercase',color:'rgba(255,255,255,.65)',marginBottom:4}}>{t('superPagesEditor.presets')}</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                  {GRAD_PRESETS.map(([c1,c2],i) => (
                    <div key={i} onClick={() => { setGrad1(c1); setGrad2(c2); applyGradient(c1, c2, gradDir); }} style={{
                      width:28,height:20,borderRadius:5,cursor:'pointer',
                      background:`linear-gradient(135deg,${c1},${c2})`,
                      border:'1px solid rgba(255,255,255,.12)',
                    }}/>
                  ))}
                </div>
              </div>
            )}

            {/* Image */}
            {bgType === 'image' && (
              <div>
                <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'12px',borderRadius:8,border:'1px dashed rgba(255,255,255,.15)',cursor:'pointer',background:'rgba(255,255,255,.03)',marginBottom:8}}>
                  <span style={{fontSize:11,color:'rgba(255,255,255,.75)',fontWeight:600}}>📷 Upload Background Image</span>
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
                    <div style={{width:40,height:28,borderRadius:4,background:`url(${canvasBgImage}) center/cover`,border:'1px solid rgba(255,255,255,.1)'}}/>
                    <div style={{flex:1,fontSize:9,color:'rgba(255,255,255,.65)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t('superPagesEditor.backgroundSet')}</div>
                    <button onClick={() => { setCanvasBgImage(''); setBgImageUrl(''); markDirty(); }}
                      style={{width:22,height:22,borderRadius:4,background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',cursor:'pointer',fontSize:9,color:'var(--sap-red)',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Block list */}
      <div style={{flex:1,overflowY:'auto',padding:12,minHeight:0}}>
        {PALETTE.map((cat, ci) => (
          <div key={ci}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(255,255,255,0.85)',padding:'6px 0 4px',...(ci===0?{paddingTop:0}:{})}}>{cat.label}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:4}}>
              {cat.items.map((item, ii) => {
                const Icon = BLOCK_ICONS[item.type] || Square;
                return (
                  <div key={ii}
                    onClick={() => onAddElement(item.type)}
                    draggable
                    onDragStart={e => e.dataTransfer.setData('text/plain', item.type)}
                    className="pal-item"
                    style={{
                      background:'linear-gradient(160deg,#1e3a6a 0%,#172a54 50%,#132044 100%)',
                      border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,
                      padding:'16px 6px 11px',textAlign:'center',cursor:'pointer',
                      display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                      userSelect:'none',position:'relative',overflow:'hidden',
                      boxShadow:'0 4px 12px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.15),inset 0 -1px 0 rgba(0,0,0,0.2)',
                      transition:'all 0.2s',
                    }}
                  >
                    <div style={{width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Icon size={22} color={item.color} strokeWidth={1.8} style={{filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.3))'}}/>
                    </div>
                    <span style={{fontSize:9,fontWeight:700,letterSpacing:0.4,textTransform:'uppercase',color:'rgba(255,255,255,0.85)'}}>{item.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* AI Chat */}
      <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0,background:'var(--sap-cobalt-deep)',display:'flex',flexDirection:'column'}}>
        <div onClick={() => setChatOpen(!chatOpen)} style={{padding:'8px 14px',cursor:'pointer',userSelect:'none',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:9,fontWeight:800,letterSpacing:0.7,textTransform:'uppercase',color:'var(--sap-accent)'}}>✨ AI Assistant</span>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.7)',transition:'transform 0.2s',transform:chatOpen?'rotate(0)':'rotate(180deg)'}}>▼</span>
        </div>
        {chatOpen && (
          <div style={{display:'flex',flexDirection:'column',maxHeight:200,overflow:'hidden'}}>
            <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'6px 10px',display:'flex',flexDirection:'column',gap:4,background:'rgba(0,0,0,0.15)',minHeight:0}}>
              {chatHistory.map((m,i) => (
                <div key={i} style={{
                  maxWidth:'88%',padding:'6px 10px',borderRadius:10,fontSize:11,lineHeight:1.5,wordWrap:'break-word',
                  ...(m.role==='user'
                    ? {background:'var(--sap-accent)',color:'#fff',alignSelf:'flex-end',borderBottomRightRadius:2}
                    : {background:'rgba(255,255,255,0.06)',color:'var(--sap-border)',alignSelf:'flex-start',border:'1px solid rgba(255,255,255,0.06)',borderBottomLeftRadius:2}),
                }}>{m.text}</div>
              ))}
            </div>
            <div style={{display:'flex',gap:5,padding:'6px 10px',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
              <textarea value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()} }}
                rows={1} placeholder={t("superPagesEditor.askAiPlaceholder")}
                style={{flex:1,padding:'7px 10px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,fontSize:11,fontFamily:'DM Sans,sans-serif',color:'var(--sap-border)',resize:'none',background:'rgba(255,255,255,0.05)',outline:'none'}}/>
              <button onClick={sendChat} disabled={chatSending}
                style={{width:32,height:32,border:'none',borderRadius:8,background:'linear-gradient(135deg,#0ea5e9,#6366f1)',color:'#fff',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:chatSending?0.5:1}}>
                <Send size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .pal-item::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:60%;background:linear-gradient(180deg,rgba(255,255,255,0.08) 0%,transparent 100%);border-radius:50%;pointer-events:none}
        .pal-item:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(14,165,233,.35),0 0 0 1px rgba(14,165,233,0.5),inset 0 1px 0 rgba(255,255,255,0.2)!important;border-color:rgba(14,165,233,0.5)!important;background:linear-gradient(160deg,#1e4080 0%,#1a3060 50%,#172a54 100%)!important}
        .pal-item:active{transform:scale(0.94)!important}
      `}</style>
    </div>
  );
}
