import { useState, useRef } from 'react';
import { PALETTE, BG_PRESETS } from './elementDefaults';
import { Type, AlignLeft, Tag, ImageIcon, Play, Music, RectangleHorizontal, FormInput, ArrowUpRight,
  MessageSquareQuote, Star, Quote, HelpCircle, BarChart3, Minus,
  Timer, Share2, FileText, SeparatorHorizontal, LayoutGrid, MoveVertical, Square, GripHorizontal, Code, Send } from 'lucide-react';

const BLOCK_ICONS = {
  heading: Type, text: AlignLeft, label: Tag,
  image: ImageIcon, video: Play, audio: Music,
  button: RectangleHorizontal, form: FormInput, cta: ArrowUpRight,
  review: MessageSquareQuote, badge: Star, testimonial: Quote, faq: HelpCircle, stat: BarChart3, progress: Minus,
  countdown: Timer, socialicons: Share2, icontext: FileText, separator: SeparatorHorizontal, logostrip: LayoutGrid, spacer: MoveVertical, box: Square, divider: GripHorizontal, embed: Code,
};

export default function BlockPalette({ canvasBg, canvasBgImage, setCanvasBg, setCanvasBgImage, markDirty, onAddElement, pageId, onAiMessage }) {
  const [bgType, setBgType] = useState(canvasBg?.startsWith('linear') ? 'gradient' : canvasBgImage ? 'image' : 'solid');
  const [grad1, setGrad1] = useState('#ffffff');
  const [grad2, setGrad2] = useState('#1a1a4e');
  const [gradDir, setGradDir] = useState('135deg');
  const [bgImageUrl, setBgImageUrl] = useState(canvasBgImage || '');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([{role:'ai',text:'Tell me what to change — "add a heading", "change background to navy", "write sales copy"'}]);
  const [chatSending, setChatSending] = useState(false);
  const chatRef = useRef(null);

  const applyBg = (bg) => { setCanvasBg(bg); markDirty(); };
  const applyBgImage = (url) => { setCanvasBgImage(url); setBgImageUrl(url); markDirty(); };

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

  return (
    <div style={{width:280,height:'calc(100vh - 50px)',background:'#161b30',borderLeft:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>

      {/* Header */}
      <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <h3 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:800,color:'#e2e8f0'}}>✦ Blocks</h3>
        <p style={{margin:'2px 0 0',fontSize:10,color:'rgba(255,255,255,0.35)'}}>Click or drag to add</p>
      </div>

      {/* Block list */}
      <div style={{flex:1,overflowY:'auto',padding:12,minHeight:0}}>
        {PALETTE.map((cat, ci) => (
          <div key={ci}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(255,255,255,0.35)',padding:'6px 0 4px',...(ci===0?{paddingTop:0}:{})}}>{cat.label}</div>
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
                      background:'linear-gradient(160deg,#2e3862 0%,#232952 50%,#1d2345 100%)',
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
                    <span style={{fontSize:9,fontWeight:700,letterSpacing:0.4,textTransform:'uppercase',color:'rgba(255,255,255,0.6)'}}>{item.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* BG Control */}
      <div style={{padding:'12px 16px',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0,display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:36,height:36,borderRadius:8,border:'2px solid rgba(255,255,255,0.1)',overflow:'hidden',position:'relative',cursor:'pointer',flexShrink:0,background:canvasBgImage?`url(${canvasBgImage}) center/cover`:canvasBg}}>
          <input type="color" value={canvasBg?.startsWith('#')?canvasBg:'#ffffff'} onChange={e => applyBg(e.target.value)}
            style={{position:'absolute',inset:-4,width:'calc(100% + 8px)',height:'calc(100% + 8px)',border:'none',cursor:'pointer',padding:0,...(canvasBgImage?{opacity:0}:{})}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:0.5}}>Background</div>
          <div style={{fontSize:11,fontFamily:'monospace',color:'rgba(255,255,255,0.35)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {canvasBgImage?'Image':canvasBg?.startsWith('linear')?'Gradient':canvasBg}
          </div>
        </div>
        {/* Presets */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3}}>
          {BG_PRESETS.slice(0,6).map((p,i) => (
            <div key={i} onClick={() => { if(p.startsWith('linear')){setBgType('gradient');applyBg(p)}else{setBgType('solid');applyBg(p)} }}
              style={{width:16,height:16,borderRadius:4,cursor:'pointer',background:p,border:'1px solid rgba(255,255,255,0.1)'}}/>
          ))}
        </div>
      </div>

      {/* AI Chat */}
      <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0,background:'#161b30',display:'flex',flexDirection:'column'}}>
        <div onClick={() => setChatOpen(!chatOpen)} style={{padding:'8px 14px',cursor:'pointer',userSelect:'none',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:9,fontWeight:800,letterSpacing:0.7,textTransform:'uppercase',color:'#0ea5e9'}}>✨ AI Assistant</span>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.35)',transition:'transform 0.2s',transform:chatOpen?'rotate(0)':'rotate(180deg)'}}>▼</span>
        </div>
        {chatOpen && (
          <div style={{display:'flex',flexDirection:'column',maxHeight:200,overflow:'hidden'}}>
            <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'6px 10px',display:'flex',flexDirection:'column',gap:4,background:'rgba(0,0,0,0.15)',minHeight:0}}>
              {chatHistory.map((m,i) => (
                <div key={i} style={{
                  maxWidth:'88%',padding:'6px 10px',borderRadius:10,fontSize:11,lineHeight:1.5,wordWrap:'break-word',
                  ...(m.role==='user'
                    ? {background:'#0ea5e9',color:'#fff',alignSelf:'flex-end',borderBottomRightRadius:2}
                    : {background:'rgba(255,255,255,0.06)',color:'#e2e8f0',alignSelf:'flex-start',border:'1px solid rgba(255,255,255,0.06)',borderBottomLeftRadius:2}),
                }}>{m.text}</div>
              ))}
            </div>
            <div style={{display:'flex',gap:5,padding:'6px 10px',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
              <textarea value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()} }}
                rows={1} placeholder="Ask AI..."
                style={{flex:1,padding:'7px 10px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,fontSize:11,fontFamily:'DM Sans,sans-serif',color:'#e2e8f0',resize:'none',background:'rgba(255,255,255,0.05)',outline:'none'}}/>
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
        .pal-item:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(14,165,233,.35),0 0 0 1px rgba(14,165,233,0.5),inset 0 1px 0 rgba(255,255,255,0.2)!important;border-color:rgba(14,165,233,0.5)!important;background:linear-gradient(160deg,#364070 0%,#2a3360 50%,#232952 100%)!important}
        .pal-item:active{transform:scale(0.94)!important}
      `}</style>
    </div>
  );
}
