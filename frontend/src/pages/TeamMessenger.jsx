import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Send, MessageCircle, User, Users, ChevronRight, ArrowLeft } from 'lucide-react';

export default function TeamMessenger() {
  var { t } = useTranslation();
  var [contacts, setContacts] = useState([]);
  var [messages, setMessages] = useState([]);
  var [loading, setLoading] = useState(true);
  var [activeContact, setActiveContact] = useState(null);
  var [text, setText] = useState('');
  var [sending, setSending] = useState(false);
  var [unread, setUnread] = useState(0);
  var bottomRef = useRef(null);

  function loadData() {
    apiGet('/api/team-messages').then(function(r) {
      setContacts(r.contacts || []);
      setMessages(r.messages || []);
      setUnread(r.unread_count || 0);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }

  useEffect(function() { loadData(); }, []);

  useEffect(function() {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContact]);

  function sendMessage() {
    if (!text.trim() || !activeContact || sending) return;
    setSending(true);
    apiPost('/api/team-messages/send', { to_user_id: activeContact.id, message: text.trim() })
      .then(function() {
        setText('');
        setSending(false);
        loadData();
      }).catch(function() { setSending(false); });
  }

  // Filter messages for the active conversation
  var convoMsgs = activeContact ? messages.filter(function(m) {
    return (m.other_user && m.other_user.id === activeContact.id);
  }).reverse() : [];

  if (loading) return <AppLayout title={t("teamMessenger.title")}><div style={{padding:40,textAlign:'center',color:'var(--sap-text-muted)'}}>Loading...</div></AppLayout>;

  return (
    <AppLayout title={t("teamMessenger.title")} subtitle="Message your sponsor and team members">
      <div style={{display:'grid',gridTemplateColumns:activeContact?'280px 1fr':'1fr',gap:0,background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',minHeight:550,boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
        {/* Contacts sidebar */}
        <div style={{borderRight:activeContact?'1px solid #f1f5f9':'none',display:activeContact?undefined:'block'}}>
          <div style={{padding:'16px 18px',borderBottom:'1px solid #f1f5f9',background:'#fafbfd'}}>
            <div style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)',display:'flex',alignItems:'center',gap:8}}>
              <Users size={16} color="var(--sap-purple)"/> Contacts
              {unread > 0 && <span style={{fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:10,background:'var(--sap-red-bright)',color:'#fff'}}>{unread}</span>}
            </div>
          </div>

          {contacts.length === 0 ? (
            <div style={{padding:'40px 20px',textAlign:'center'}}>
              <Users size={32} color="var(--sap-border)" style={{marginBottom:8}}/>
              <div style={{fontSize:13,color:'var(--sap-text-muted)',lineHeight:1.6}}>No team contacts yet. Refer members to start messaging.</div>
            </div>
          ) : (
            <div style={{overflowY:'auto',maxHeight:500}}>
              {contacts.map(function(c) {
                var isActive = activeContact && activeContact.id === c.id;
                var hasUnread = messages.some(function(m) { return m.direction === 'received' && !m.is_read && m.other_user && m.other_user.id === c.id; });
                return (
                  <div key={c.id} onClick={function(){setActiveContact(c);}}
                    style={{padding:'14px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,
                      borderBottom:'1px solid #f8f9fb',background:isActive?'rgba(139,92,246,.06)':'#fff',
                      borderLeft:isActive?'3px solid #8b5cf6':'3px solid transparent',transition:'all .15s'}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:c.avatar?undefined:'linear-gradient(135deg,#8b5cf6,#a78bfa)',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                      {c.avatar ? <img src={c.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> :
                        <User size={16} color="#fff"/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {c.name}
                        {hasUnread && <span style={{width:7,height:7,borderRadius:'50%',background:'var(--sap-red-bright)',display:'inline-block',marginLeft:6}}/>}
                      </div>
                      <div style={{fontSize:10,color:c.relationship==='sponsor'?'var(--sap-accent)':'var(--sap-text-muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>
                        {c.relationship === 'sponsor' ? '↑ Your Sponsor' : '↓ Your Referral'} · {c.tier}
                      </div>
                    </div>
                    <ChevronRight size={14} color="var(--sap-text-faint)"/>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat area */}
        {activeContact ? (
          <div style={{display:'flex',flexDirection:'column',height:550}}>
            {/* Chat header */}
            <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',background:'#fafbfd',display:'flex',alignItems:'center',gap:12}}>
              <button onClick={function(){setActiveContact(null);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex'}}>
                <ArrowLeft size={18} color="var(--sap-text-muted)"/>
              </button>
              <div style={{width:32,height:32,borderRadius:'50%',background:activeContact.avatar?undefined:'linear-gradient(135deg,#8b5cf6,#a78bfa)',
                display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
                {activeContact.avatar ? <img src={activeContact.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> :
                  <User size={14} color="#fff"/>}
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)'}}>{activeContact.name}</div>
                <div style={{fontSize:10,color:'var(--sap-text-muted)',fontWeight:600}}>{activeContact.relationship === 'sponsor' ? 'Your Sponsor' : 'Your Referral'}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:'auto',padding:'16px 20px',background:'var(--sap-bg-elevated)',display:'flex',flexDirection:'column',gap:8}}>
              {convoMsgs.length === 0 && (
                <div style={{textAlign:'center',padding:'40px 0',color:'var(--sap-text-muted)',fontSize:13}}>
                  <MessageCircle size={28} color="var(--sap-border)" style={{marginBottom:8}}/>
                  <div>No messages yet. Say hello!</div>
                </div>
              )}
              {convoMsgs.map(function(m) {
                var isMine = m.direction === 'sent';
                return (
                  <div key={m.id} style={{display:'flex',justifyContent:isMine?'flex-end':'flex-start'}}>
                    <div style={{maxWidth:'75%',padding:'10px 14px',borderRadius:isMine?'14px 14px 4px 14px':'14px 14px 14px 4px',
                      background:isMine?'linear-gradient(135deg,#8b5cf6,#a78bfa)':'#fff',
                      color:isMine?'#fff':'#334155',fontSize:13,lineHeight:1.6,
                      boxShadow:isMine?'0 2px 8px rgba(139,92,246,.2)':'0 1px 4px rgba(0,0,0,.06)',
                      border:isMine?'none':'1px solid #e8ecf2'}}>
                      <div>{m.message}</div>
                      <div style={{fontSize:9,color:isMine?'rgba(255,255,255,.5)':'var(--sap-text-faint)',marginTop:4,textAlign:'right'}}>
                        {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef}/>
            </div>

            {/* Input */}
            <div style={{padding:'12px 16px',borderTop:'1px solid #f1f5f9',background:'#fff',display:'flex',gap:8}}>
              <input value={text} onChange={function(e){setText(e.target.value);}}
                onKeyDown={function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                placeholder="Type a message..." maxLength={2000}
                style={{flex:1,padding:'10px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',background:'var(--sap-bg-elevated)',
                  fontSize:13,fontFamily:'inherit',outline:'none',color:'var(--sap-text-primary)'}}/>
              <button onClick={sendMessage} disabled={sending || !text.trim()}
                style={{padding:'10px 18px',borderRadius:10,border:'none',background:text.trim()?'linear-gradient(135deg,#8b5cf6,#a78bfa)':'var(--sap-border)',
                  color:'#fff',cursor:text.trim()?'pointer':'default',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5,
                  fontSize:12,fontWeight:700,transition:'all .2s'}}>
                <Send size={14}/> Send
              </button>
            </div>
          </div>
        ) : (
          !contacts.length ? null : (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:550,color:'var(--sap-text-muted)',fontSize:14}}>
              <div style={{textAlign:'center'}}>
                <MessageCircle size={40} color="var(--sap-border)" style={{marginBottom:12}}/>
                <div style={{fontWeight:700}}>Select a contact to start chatting</div>
              </div>
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}
