import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiPost } from '../utils/api';
import { Send, Bot, User, Sparkles, Target, TrendingUp, MessageSquare, Copy, Check, RefreshCw } from 'lucide-react';

var PROMPT_CATEGORIES = [
  {title:'Get Started',icon:Sparkles,color:'var(--sap-purple-light)',gradient:'linear-gradient(135deg,#7c3aed,#8b5cf6)',prompts:['How do I get my first referral?','What should I do in my first week?','Explain the compensation plan simply']},
  {title:'Content & Marketing',icon:MessageSquare,color:'var(--sap-accent-light)',gradient:'linear-gradient(135deg,#0284c7,#0ea5e9)',prompts:['Write a Facebook post promoting SuperAdPro','Create an Instagram story script about passive income','Write 5 YouTube video headlines for affiliate marketing']},
  {title:'Sales & Objections',icon:Target,color:'#f87171',gradient:'linear-gradient(135deg,#dc2626,#ef4444)',prompts:['"Is this a pyramid scheme?" — how do I respond?','My prospect says "$20/month is too expensive"','Write a DM script for reaching out to prospects']},
  {title:'Growth Strategies',icon:TrendingUp,color:'#34d399',gradient:'linear-gradient(135deg,#059669,#10b981)',prompts:['Best free traffic strategies for affiliate marketing','Build a team of 10 active members in 30 days','Create a 7-day launch plan for new members']},
];

export default function ProSeller() {
  var { t } = useTranslation();
  var [messages, setMessages] = useState([]);
  var [input, setInput] = useState('');
  var [loading, setLoading] = useState(false);
  var [copied, setCopied] = useState(null);
  var scrollRef = useRef(null);

  useEffect(function(){if(scrollRef.current)scrollRef.current.scrollIntoView({behavior:'smooth'});}, [messages]);

  function send(text){
    var msg=text||input.trim();if(!msg||loading)return;setInput('');
    setMessages(function(m){return m.concat([{role:'user',content:msg}]);});
    setLoading(true);
    apiPost('/api/proseller/chat',{message:msg,history:messages}).then(function(res){
      setMessages(function(m){return m.concat([{role:'assistant',content:res.reply||res.message||'Let me help you with that.'}]);});setLoading(false);
    }).catch(function(){setMessages(function(m){return m.concat([{role:'assistant',content:'Sorry, something went wrong. Please try again.'}]);});setLoading(false);});
  }

  function copyMsg(text,idx){navigator.clipboard.writeText(text);setCopied(idx);setTimeout(function(){setCopied(null);},2000);}

  var hasMessages=messages.length>0;

  return(
    <AppLayout title="ProSeller AI" subtitle="Your AI sales assistant">
      <div style={{maxWidth:900,margin:'0 auto',display:'flex',flexDirection:'column',height:'calc(100vh - 180px)'}}>

        {/* Chat area */}
        <div style={{flex:1,overflowY:'auto',borderRadius:'16px 16px 0 0',border:'1px solid #e8ecf2',borderBottom:'none',background:'#fff'}}>

          {/* Empty state — Hero + Prompts */}
          {!hasMessages&&(
            <div>
              {/* Dark hero */}
              <div style={{background:'linear-gradient(135deg,#172554,#172554,#172554)',padding:'48px 40px 40px',textAlign:'center',position:'relative',overflow:'hidden'}}>
                {/* Floating particles */}
                {[{l:'15%',t:'20%',s:4,o:.15,d:6},{l:'75%',t:'15%',s:6,o:.1,d:8},{l:'85%',t:'60%',s:3,o:.2,d:5},{l:'25%',t:'70%',s:5,o:.12,d:7},{l:'50%',t:'40%',s:4,o:.08,d:9},{l:'65%',t:'80%',s:3,o:.15,d:6.5}].map(function(p,i){
                  return <div key={i} style={{position:'absolute',left:p.l,top:p.t,width:p.s,height:p.s,borderRadius:'50%',background:'var(--sap-purple)',opacity:p.o,animation:'pulse '+p.d+'s ease-in-out infinite',pointerEvents:'none'}}/>;
                })}
                <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:.1}50%{transform:scale(2.5);opacity:.25}}`}</style>

                <div style={{width:72,height:72,borderRadius:18,background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 12px 40px rgba(139,92,246,.4)',position:'relative',zIndex:1}}>
                  <Bot size={36} color="#fff"/>
                </div>
                <h2 style={{fontFamily:'Sora,sans-serif',fontSize:32,fontWeight:900,color:'#fff',margin:'0 0 10px',position:'relative',zIndex:1}}>{t('proSeller.proSellerAI')}</h2>
                <p style={{fontSize:15,color:'rgba(255,255,255,.45)',margin:'0 auto',maxWidth:460,lineHeight:1.8,position:'relative',zIndex:1}}>{t("proSeller.proSellerDesc")}</p>

                {/* Quick stat pills */}
                <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:20,position:'relative',zIndex:1}}>
                  {['Content Writer','Objection Handler','Strategy Coach','Growth Planner'].map(function(s){
                    return <span key={s} style={{padding:'5px 14px',borderRadius:20,background:'rgba(139,92,246,.12)',border:'1px solid rgba(139,92,246,.2)',fontSize:11,fontWeight:700,color:'var(--sap-purple-light)'}}>{s}</span>;
                  })}
                </div>
              </div>

              {/* Prompt grid */}
              <div style={{padding:'28px 32px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {PROMPT_CATEGORIES.map(function(cat,ci){
                  var Icon=cat.icon;
                  return(
                    <div key={ci} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',transition:'all .2s'}}
                      onMouseEnter={function(e){e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.06)';}}
                      onMouseLeave={function(e){e.currentTarget.style.boxShadow='none';}}>
                      <div style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid #f1f3f7'}}>
                        <div style={{width:32,height:32,borderRadius:8,background:cat.gradient,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px '+cat.color+'30'}}><Icon size={16} color="#fff"/></div>
                        <span style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)'}}>{cat.title}</span>
                      </div>
                      <div style={{padding:'8px 10px'}}>
                        {cat.prompts.map(function(p,pi){
                          return <button key={pi} onClick={function(){send(p);}} style={{display:'block',width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:8,border:'none',background:'transparent',cursor:'pointer',fontFamily:'inherit',fontSize:13,color:'var(--sap-text-secondary)',lineHeight:1.5,transition:'all .1s'}} onMouseEnter={function(e){e.currentTarget.style.background='var(--sap-bg-input)';e.currentTarget.style.color=cat.color;}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--sap-text-secondary)';}}>{p}</button>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          {hasMessages&&(
            <div style={{padding:'20px 0'}}>
              {messages.map(function(m,i){
                var isUser=m.role==='user';
                return(
                  <div key={i} style={{padding:'14px 32px',display:'flex',gap:14,alignItems:'flex-start',background:isUser?'transparent':'#faf8ff',borderBottom:'1px solid '+(isUser?'transparent':'#f5f0ff')}}>
                    <div style={{width:36,height:36,borderRadius:10,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:isUser?'linear-gradient(135deg,#0ea5e9,#38bdf8)':'linear-gradient(135deg,#8b5cf6,#a78bfa)',boxShadow:'0 4px 12px '+(isUser?'rgba(14,165,233,.2)':'rgba(139,92,246,.2)')}}>
                      {isUser?<User size={17} color="#fff"/>:<Bot size={17} color="#fff"/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:800,color:isUser?'var(--sap-accent)':'var(--sap-purple)',marginBottom:5,textTransform:'uppercase',letterSpacing:.5}}>{isUser?'You':'ProSeller AI'}</div>
                      <div style={{fontSize:14,color:'var(--sap-text-primary)',lineHeight:1.9,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{m.content}</div>
                      {!isUser&&(
                        <button onClick={function(){copyMsg(m.content,i);}} style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:10,padding:'5px 12px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:copied===i?'var(--sap-green)':'var(--sap-text-muted)',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                          {copied===i?<><Check size={10}/>{t('proSeller.copiedResponse')}</>:<><Copy size={10}/>{t('proSeller.copyResponse')}</>}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading&&(
                <div style={{padding:'14px 32px',display:'flex',gap:14,alignItems:'flex-start',background:'#faf8ff'}}>
                  <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',display:'flex',alignItems:'center',justifyContent:'center'}}><Bot size={17} color="#fff"/></div>
                  <div style={{paddingTop:10,display:'flex',gap:5}}>
                    {[0,1,2].map(function(d){return <div key={d} style={{width:9,height:9,borderRadius:'50%',background:'var(--sap-purple-light)',animation:'dot 1.4s infinite',animationDelay:(d*0.2)+'s'}}/>;})}<style>{`@keyframes dot{0%,60%,100%{opacity:.15;transform:scale(.8)}30%{opacity:1;transform:scale(1.2)}}`}</style>
                  </div>
                </div>
              )}
              <div ref={scrollRef}/>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{background:'#fff',borderRadius:'0 0 16px 16px',border:'1px solid #e8ecf2',borderTop:'none',padding:'16px 20px'}}>
          {hasMessages&&<div style={{textAlign:'center',marginBottom:10}}><button onClick={function(){setMessages([]);}} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'5px 14px',borderRadius:6,border:'1px solid #e8ecf2',background:'transparent',color:'var(--sap-text-muted)',fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}} onMouseEnter={function(e){e.currentTarget.style.color='var(--sap-red-bright)';e.currentTarget.style.borderColor='var(--sap-red-bg-mid)';}} onMouseLeave={function(e){e.currentTarget.style.color='var(--sap-text-muted)';e.currentTarget.style.borderColor='var(--sap-border-light)';}}><RefreshCw size={10}/>{t('proSeller.newConversation')}</button></div>}
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <input value={input} onChange={function(e){setInput(e.target.value);}} onKeyDown={function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder={t("proSeller.askPlaceholder")} style={{flex:1,padding:'15px 20px',border:'2px solid #e8ecf2',borderRadius:14,fontSize:15,fontFamily:'inherit',background:'var(--sap-bg-input)',outline:'none',transition:'all .2s'}} onFocus={function(e){e.target.style.borderColor='var(--sap-purple)';e.target.style.background='#fff';e.target.style.boxShadow='0 0 0 4px rgba(139,92,246,.08)';}} onBlur={function(e){e.target.style.borderColor='var(--sap-border-light)';e.target.style.background='var(--sap-bg-input)';e.target.style.boxShadow='none';}}/>
            <button onClick={function(){send();}} disabled={loading||!input.trim()} style={{width:52,height:52,borderRadius:14,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:(loading||!input.trim())?'default':'pointer',background:(loading||!input.trim())?'var(--sap-border-light)':'linear-gradient(135deg,#8b5cf6,#a78bfa)',boxShadow:(loading||!input.trim())?'none':'0 6px 20px rgba(139,92,246,.3)',transition:'all .2s'}}>
              <Send size={20} color={(loading||!input.trim())?'var(--sap-text-muted)':'#fff'}/>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
