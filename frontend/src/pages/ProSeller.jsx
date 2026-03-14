import { useState, useRef, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiPost } from '../utils/api';
export default function ProSeller() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);
  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, {role:'user',content:userMsg}]);
    setLoading(true);
    try {
      const res = await apiPost('/api/proseller/chat', {message:userMsg,history:messages});
      setMessages(m => [...m, {role:'assistant',content:res.reply||res.message||'Let me help you with that.'}]);
    } catch { setMessages(m => [...m, {role:'assistant',content:'Sorry, please try again.'}]); }
    setLoading(false);
  };
  const prompts = ['How do I get my first referral?','Write a social media post','Explain the Income Grid','Best growth strategies'];
  return (
    <AppLayout title="🤖 ProSeller AI" subtitle="Your AI-powered sales assistant">
      <div style={{maxWidth:800,margin:'0 auto',display:'flex',flexDirection:'column',height:'calc(100vh - 200px)'}}>
        <div style={{flex:1,overflowY:'auto',background:'#f8f9fb',borderRadius:'8px 8px 0 0',border:'1px solid #e5e7eb',borderBottom:'none',padding:20}}>
          {messages.length === 0 && (
            <div style={{textAlign:'center',padding:'40px 0'}}>
              <div style={{fontSize:40,marginBottom:12}}>🤖</div>
              <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:8}}>ProSeller AI</div>
              <div style={{fontSize:13,color:'#94a3b8',marginBottom:24}}>Ask me anything about SuperAdPro or marketing.</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center'}}>
                {prompts.map((p,i) => <button key={i} onClick={()=>setInput(p)} style={{padding:'8px 14px',borderRadius:10,fontSize:12,fontWeight:600,border:'1px solid #e5e7eb',background:'#fff',color:'#475569',cursor:'pointer',fontFamily:'inherit'}}>{p}</button>)}
              </div>
            </div>
          )}
          {messages.map((m,i) => (
            <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',marginBottom:12}}>
              <div style={{maxWidth:'75%',padding:'12px 16px',borderRadius:14,fontSize:14,lineHeight:1.6,whiteSpace:'pre-wrap',
                ...(m.role==='user'?{background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',borderBottomRightRadius:4}:{background:'#fff',border:'1px solid #e5e7eb',color:'#0f172a',borderBottomLeftRadius:4})
              }}>{m.content}</div>
            </div>
          ))}
          {loading && <div style={{display:'flex',marginBottom:12}}><div style={{padding:'12px 16px',borderRadius:14,background:'#fff',border:'1px solid #e5e7eb',color:'#94a3b8'}}>Thinking...</div></div>}
          <div ref={scrollRef}/>
        </div>
        <div style={{display:'flex',gap:10,padding:16,background:'#fff',borderRadius:'0 0 8px 8px',border:'1px solid #e5e7eb',borderTop:'none'}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send()}} placeholder="Ask ProSeller AI..." style={{flex:1,padding:'12px 16px',border:'1px solid #e5e7eb',borderRadius:12,fontSize:14,fontFamily:'inherit',background:'#f8f9fb',boxSizing:'border-box'}}/>
          <button onClick={send} disabled={loading||!input.trim()} style={{padding:'12px 24px',borderRadius:12,fontSize:14,fontWeight:700,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontFamily:'inherit'}}>Send</button>
        </div>
      </div>
    </AppLayout>
  );
}
