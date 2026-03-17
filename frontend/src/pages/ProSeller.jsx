import { useState, useRef, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiPost } from '../utils/api';
import { Send, Bot, User, Sparkles, Target, TrendingUp, MessageSquare, Zap, Copy, Check, RefreshCw } from 'lucide-react';

var PROMPT_CATEGORIES = [
  {title:'Get Started',icon:Sparkles,color:'#8b5cf6',prompts:[
    'How do I get my first referral?',
    'What should I do in my first week on SuperAdPro?',
    'Explain how the compensation plan works simply',
  ]},
  {title:'Content & Marketing',icon:MessageSquare,color:'#0ea5e9',prompts:[
    'Write a Facebook post promoting SuperAdPro',
    'Create an Instagram story script about passive income',
    'Write 5 headlines for a YouTube video about affiliate marketing',
  ]},
  {title:'Sales & Objections',icon:Target,color:'#ef4444',prompts:[
    'Someone says "Is this a pyramid scheme?" — how do I respond?',
    'My prospect says "$20/month is too expensive" — help me overcome this',
    'Write a DM script for reaching out to potential recruits',
  ]},
  {title:'Growth Strategies',icon:TrendingUp,color:'#16a34a',prompts:[
    'What are the best free traffic strategies for affiliate marketing?',
    'How do I build a team of 10 active members in 30 days?',
    'Create a 7-day launch plan for a new SuperAdPro member',
  ]},
];

export default function ProSeller() {
  var [messages, setMessages] = useState([]);
  var [input, setInput] = useState('');
  var [loading, setLoading] = useState(false);
  var [copied, setCopied] = useState(null);
  var scrollRef = useRef(null);
  var inputRef = useRef(null);

  useEffect(function() { if(scrollRef.current) scrollRef.current.scrollIntoView({behavior:'smooth'}); }, [messages]);

  function send(text) {
    var msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(function(m) { return m.concat([{role:'user',content:msg}]); });
    setLoading(true);
    apiPost('/api/proseller/chat', {message:msg,history:messages}).then(function(res) {
      setMessages(function(m) { return m.concat([{role:'assistant',content:res.reply||res.message||'Let me help you with that.'}]); });
      setLoading(false);
    }).catch(function() {
      setMessages(function(m) { return m.concat([{role:'assistant',content:'Sorry, something went wrong. Please try again.'}]); });
      setLoading(false);
    });
  }

  function copyMessage(text, idx) {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(function() { setCopied(null); }, 2000);
  }

  function clearChat() {
    setMessages([]);
  }

  var hasMessages = messages.length > 0;

  return (
    <AppLayout title="ProSeller AI" subtitle="Your AI sales assistant">
      <div style={{maxWidth:860,margin:'0 auto',display:'flex',flexDirection:'column',height:'calc(100vh - 180px)'}}>

        {/* Chat area */}
        <div style={{flex:1,overflowY:'auto',borderRadius:'16px 16px 0 0',border:'1px solid #e8ecf2',borderBottom:'none',background:'linear-gradient(180deg,#f8f9fb 0%,#fff 100%)'}}>

          {/* Empty state — prompt grid */}
          {!hasMessages && (
            <div style={{padding:'40px 32px'}}>
              <div style={{textAlign:'center',marginBottom:36}}>
                <div style={{width:64,height:64,borderRadius:16,background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 8px 24px rgba(139,92,246,.25)'}}>
                  <Bot size={32} color="#fff"/>
                </div>
                <h2 style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:900,color:'#0f172a',margin:'0 0 8px'}}>ProSeller AI</h2>
                <p style={{fontSize:14,color:'#94a3b8',margin:0,maxWidth:420,marginLeft:'auto',marginRight:'auto',lineHeight:1.7}}>Your personal AI sales coach. Ask about marketing strategies, handle objections, write content, and grow your SuperAdPro business.</p>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                {PROMPT_CATEGORIES.map(function(cat,ci) {
                  var Icon = cat.icon;
                  return (
                    <div key={ci} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
                      <div style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid #f1f3f7'}}>
                        <div style={{width:28,height:28,borderRadius:7,background:cat.color+'12',display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={14} color={cat.color}/></div>
                        <span style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{cat.title}</span>
                      </div>
                      <div style={{padding:'10px 14px'}}>
                        {cat.prompts.map(function(p,pi) {
                          return (
                            <button key={pi} onClick={function(){send(p);}}
                              style={{display:'block',width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:8,border:'none',background:'transparent',cursor:'pointer',fontFamily:'inherit',fontSize:12,color:'#475569',lineHeight:1.5,transition:'all .1s'}}
                              onMouseEnter={function(e){e.currentTarget.style.background='#f8f9fb';e.currentTarget.style.color='#0f172a';}}
                              onMouseLeave={function(e){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#475569';}}>
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          {hasMessages && (
            <div style={{padding:'24px 0'}}>
              {messages.map(function(m, i) {
                var isUser = m.role === 'user';
                return (
                  <div key={i} style={{padding:'12px 32px',display:'flex',gap:14,alignItems:'flex-start',
                    background:isUser?'transparent':'rgba(139,92,246,.02)'}}>
                    {/* Avatar */}
                    <div style={{width:32,height:32,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                      background:isUser?'linear-gradient(135deg,#0ea5e9,#38bdf8)':'linear-gradient(135deg,#8b5cf6,#a78bfa)'}}>
                      {isUser ? <User size={16} color="#fff"/> : <Bot size={16} color="#fff"/>}
                    </div>
                    {/* Content */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:isUser?'#0ea5e9':'#8b5cf6',marginBottom:4}}>{isUser?'You':'ProSeller AI'}</div>
                      <div style={{fontSize:14,color:'#1e293b',lineHeight:1.8,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{m.content}</div>
                      {/* Copy button for AI responses */}
                      {!isUser && (
                        <button onClick={function(){copyMessage(m.content, i);}}
                          style={{display:'flex',alignItems:'center',gap:4,marginTop:8,padding:'4px 10px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:copied===i?'#16a34a':'#94a3b8',fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}
                          onMouseEnter={function(e){if(copied!==i)e.currentTarget.style.borderColor='#8b5cf6';}}
                          onMouseLeave={function(e){e.currentTarget.style.borderColor='#e8ecf2';}}>
                          {copied===i ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <div style={{padding:'12px 32px',display:'flex',gap:14,alignItems:'flex-start',background:'rgba(139,92,246,.02)'}}>
                  <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',display:'flex',alignItems:'center',justifyContent:'center'}}><Bot size={16} color="#fff"/></div>
                  <div style={{paddingTop:8}}>
                    <div style={{display:'flex',gap:4}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:'#a78bfa',animation:'blink 1.4s infinite',animationDelay:'0s'}}/>
                      <div style={{width:8,height:8,borderRadius:'50%',background:'#a78bfa',animation:'blink 1.4s infinite',animationDelay:'0.2s'}}/>
                      <div style={{width:8,height:8,borderRadius:'50%',background:'#a78bfa',animation:'blink 1.4s infinite',animationDelay:'0.4s'}}/>
                    </div>
                    <style>{`@keyframes blink{0%,60%,100%{opacity:.2}30%{opacity:1}}`}</style>
                  </div>
                </div>
              )}
              <div ref={scrollRef}/>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{background:'#fff',borderRadius:'0 0 16px 16px',border:'1px solid #e8ecf2',borderTop:'none',padding:'14px 20px'}}>
          {hasMessages && (
            <div style={{display:'flex',justifyContent:'center',marginBottom:10}}>
              <button onClick={clearChat} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 12px',borderRadius:6,border:'1px solid #e8ecf2',background:'transparent',color:'#94a3b8',fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}
                onMouseEnter={function(e){e.currentTarget.style.color='#ef4444';e.currentTarget.style.borderColor='#fecaca';}}
                onMouseLeave={function(e){e.currentTarget.style.color='#94a3b8';e.currentTarget.style.borderColor='#e8ecf2';}}>
                <RefreshCw size={10}/> New conversation
              </button>
            </div>
          )}
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <div style={{flex:1,position:'relative'}}>
              <input ref={inputRef} value={input} onChange={function(e){setInput(e.target.value);}}
                onKeyDown={function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
                placeholder="Ask ProSeller AI anything..."
                style={{width:'100%',padding:'14px 18px',border:'2px solid #e8ecf2',borderRadius:12,fontSize:14,fontFamily:'inherit',background:'#f8f9fb',outline:'none',boxSizing:'border-box',transition:'border .2s'}}
                onFocus={function(e){e.target.style.borderColor='#8b5cf6';e.target.style.background='#fff';}}
                onBlur={function(e){e.target.style.borderColor='#e8ecf2';e.target.style.background='#f8f9fb';}}/>
            </div>
            <button onClick={function(){send();}} disabled={loading||!input.trim()}
              style={{width:48,height:48,borderRadius:12,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:(loading||!input.trim())?'default':'pointer',
                background:(loading||!input.trim())?'#e8ecf2':'linear-gradient(135deg,#8b5cf6,#a78bfa)',
                boxShadow:(loading||!input.trim())?'none':'0 4px 14px rgba(139,92,246,.25)',transition:'all .2s'}}>
              <Send size={18} color={(loading||!input.trim())?'#94a3b8':'#fff'}/>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
