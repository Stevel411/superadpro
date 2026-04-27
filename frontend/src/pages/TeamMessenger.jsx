import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Send, MessageCircle, User, Users, ArrowLeft, CheckCheck, Search } from 'lucide-react';

export default function TeamMessenger() {
  var { t } = useTranslation();
  var [contacts, setContacts] = useState([]);
  var [messages, setMessages] = useState([]);
  var [loading, setLoading] = useState(true);
  var [activeContact, setActiveContact] = useState(null);
  var [text, setText] = useState('');
  var [sending, setSending] = useState(false);
  var [unread, setUnread] = useState(0);
  var [search, setSearch] = useState('');
  var bottomRef = useRef(null);
  var inputRef = useRef(null);

  useEffect(function() { window.scrollTo(0, 0); }, []);

  function loadData() {
    apiGet('/api/team-messages').then(function(r) {
      setContacts(r.contacts || []);
      setMessages(r.messages || []);
      setUnread(r.unread_count || 0);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }

  useEffect(function() { loadData(); var iv = setInterval(loadData, 15000); return function() { clearInterval(iv); }; }, []);
  useEffect(function() { if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeContact]);
  useEffect(function() { if (activeContact && inputRef.current) inputRef.current.focus(); }, [activeContact]);

  function sendMessage() {
    if (!text.trim() || !activeContact || sending) return;
    setSending(true);
    apiPost('/api/team-messages/send', { to_user_id: activeContact.id, message: text.trim() })
      .then(function() { setText(''); setSending(false); loadData(); })
      .catch(function() { setSending(false); });
  }

  var convoMsgs = activeContact ? messages.filter(function(m) {
    return m.other_user && m.other_user.id === activeContact.id;
  }).reverse() : [];

  var groupedMsgs = [];
  var lastDate = '';
  convoMsgs.forEach(function(m) {
    var d = m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    if (d !== lastDate) { groupedMsgs.push({ type: 'date', date: d }); lastDate = d; }
    groupedMsgs.push({ type: 'msg', data: m });
  });

  var filteredContacts = contacts.filter(function(c) {
    if (!search.trim()) return true;
    return (c.name || '').toLowerCase().includes(search.toLowerCase());
  });

  function getLastMsg(cid) {
    var msgs = messages.filter(function(m) { return m.other_user && m.other_user.id === cid; });
    return msgs.length > 0 ? msgs[0] : null;
  }
  function getUnreadCount(cid) {
    return messages.filter(function(m) { return m.direction === 'received' && !m.is_read && m.other_user && m.other_user.id === cid; }).length;
  }
  function fmtTime(ds) {
    if (!ds) return '';
    var d = new Date(ds), now = new Date(), diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  function initials(n) { if (!n) return '?'; var p = n.trim().split(' '); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n[0].toUpperCase(); }

  if (loading) return <AppLayout title={t("teamMessenger.title")}><div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}><div style={{width:40,height:40,borderRadius:'50%',border:'3px solid #e2e8f0',borderTopColor:'#0ea5e9',animation:'spin 0.8s linear infinite'}}/><div style={{fontSize:13,fontWeight:600,color:'#7a8899'}}>{t('teamMessenger.loading')}</div></div><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;

  return (
    <AppLayout title={t("teamMessenger.title")} subtitle={t('teamMessenger.messageSubtitle')} fullHeight>
      <div style={{display:'flex',gap:0,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',height:'100%',minHeight:0,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>

        {/* ═══ LEFT: CONTACT LIST ═══ */}
        <div style={{width:300,borderRight:'1px solid #e2e8f0',display:'flex',flexDirection:'column',flexShrink:0,minHeight:0}}>
          {/* Header */}
          <div style={{padding:'16px 18px',borderBottom:'1px solid #f1f5f9'}}>
            <div style={{fontSize:15,fontWeight:800,color:'#0f172a',display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <Users size={16} color="#0ea5e9"/> {t('teamMessenger.contacts')}
              {unread > 0 && <span style={{fontSize:13,fontWeight:800,padding:'2px 7px',borderRadius:10,background:'#ef4444',color:'#fff',marginLeft:'auto'}}>{unread}</span>}
            </div>
            <div style={{position:'relative'}}>
              <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#7a8899'}}/>
              <input value={search} onChange={function(e){setSearch(e.target.value);}}
                placeholder={t("teamMessenger.searchContacts")}
                style={{width:'100%',padding:'8px 12px 8px 32px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',
                  fontSize:13,fontFamily:'inherit',outline:'none',color:'#0f172a',boxSizing:'border-box'}}/>
            </div>
          </div>

          {/* Contacts */}
          <div style={{flex:1,overflowY:'auto'}}>
            {filteredContacts.length === 0 ? (
              <div style={{padding:'60px 20px',textAlign:'center'}}>
                <Users size={32} color="#cbd5e1" style={{marginBottom:10}}/>
                <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>{contacts.length===0?t('analytics.noTeamYet',{defaultValue:'No team members yet'}):t('analytics.noResults',{defaultValue:'No results'})}</div>
                <div style={{fontSize:12,color:'#7a8899',marginTop:4}}>{contacts.length===0?t('analytics.recruitToMsg',{defaultValue:'Recruit members to start messaging'}):''}</div>
              </div>
            ) : filteredContacts.map(function(c) {
              var isActive = activeContact && activeContact.id === c.id;
              var last = getLastMsg(c.id);
              var ur = getUnreadCount(c.id);
              var isSponsor = c.relationship === 'sponsor';

              return (
                <div key={c.id} onClick={function(){setActiveContact(c);}}
                  style={{padding:'12px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,
                    background:isActive?'#f0f9ff':'transparent',borderLeft:isActive?'3px solid #0ea5e9':'3px solid transparent',
                    transition:'background .15s',borderBottom:'1px solid #f8fafc'}}>
                  <div style={{width:40,height:40,borderRadius:'50%',flexShrink:0,
                    background:isSponsor?'linear-gradient(135deg,#0369a1,#0ea5e9)':'linear-gradient(135deg,#1e40af,#3b82f6)',
                    display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                    {c.avatar?<img src={c.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:
                      <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>{initials(c.name)}</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:13,fontWeight:isActive||ur>0?700:500,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</span>
                      {last&&<span style={{fontSize:13,color:'#7a8899',flexShrink:0,marginLeft:6}}>{fmtTime(last.created_at)}</span>}
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:2}}>
                      <span style={{fontSize:12,color:'#7a8899',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                        {last?(last.direction==='sent'?'You: ':'')+((last.message||'').substring(0,35)+(last.message&&last.message.length>35?'...':''))
                          :<span style={{fontStyle:'italic',color:'#cbd5e1'}}>{t('teamMessenger.noMsgPreview')}</span>}
                      </span>
                      {ur>0&&<span style={{fontSize:13,fontWeight:800,padding:'2px 6px',borderRadius:10,background:'#0ea5e9',color:'#fff',flexShrink:0,marginLeft:6}}>{ur}</span>}
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:isSponsor?'#0ea5e9':'#3b82f6',marginTop:3}}>
                      {isSponsor?t('teamMessenger.sponsor',{defaultValue:'Sponsor'}):t('teamMessenger.referral',{defaultValue:'Referral'})} · {c.tier||'Basic'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ RIGHT: CHAT AREA ═══ */}
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,minHeight:0}}>
          {activeContact ? (<>
            {/* Chat header */}
            <div style={{padding:'14px 24px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:14,background:'#fff'}}>
              <button onClick={function(){setActiveContact(null);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',color:'#7a8899'}}>
                <ArrowLeft size={18}/>
              </button>
              <div style={{width:38,height:38,borderRadius:'50%',flexShrink:0,
                background:activeContact.relationship==='sponsor'?'linear-gradient(135deg,#0369a1,#0ea5e9)':'linear-gradient(135deg,#1e40af,#3b82f6)',
                display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                {activeContact.avatar?<img src={activeContact.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:
                  <span style={{fontSize:13,fontWeight:800,color:'#fff'}}>{initials(activeContact.name)}</span>}
              </div>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{activeContact.name}</div>
                <div style={{fontSize:13,color:'#7a8899'}}>{activeContact.relationship==='sponsor'?t('teamMessenger.yourSponsor',{defaultValue:'Your Sponsor'}):t('teamMessenger.yourReferral',{defaultValue:'Your Referral'})} · {activeContact.tier||'Basic'}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:'auto',padding:'20px 28px',background:'#f8fafc',display:'flex',flexDirection:'column',gap:6}}>
              {groupedMsgs.length === 0 && (
                <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10}}>
                  <MessageCircle size={36} color="#cbd5e1"/>
                  <div style={{fontSize:15,fontWeight:700,color:'#475569'}}>{t('teamMessenger.noMessagesYet')}</div>
                  <div style={{fontSize:13,color:'#7a8899'}}>{t('teamMessenger.sayHello')} {activeContact.name}!</div>
                </div>
              )}
              {groupedMsgs.map(function(item, idx) {
                if (item.type === 'date') return (
                  <div key={'d'+idx} style={{textAlign:'center',margin:'12px 0 6px'}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#7a8899',background:'#e2e8f0',padding:'3px 12px',borderRadius:12}}>{item.date}</span>
                  </div>
                );
                var m = item.data, mine = m.direction === 'sent';
                return (
                  <div key={m.id} style={{display:'flex',justifyContent:mine?'flex-end':'flex-start',marginBottom:2}}>
                    {!mine&&<div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,marginRight:8,marginTop:'auto',
                      background:activeContact.relationship==='sponsor'?'linear-gradient(135deg,#0369a1,#0ea5e9)':'linear-gradient(135deg,#1e40af,#3b82f6)',
                      display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <span style={{fontSize:13,fontWeight:800,color:'#fff'}}>{initials(activeContact.name)}</span>
                    </div>}
                    <div style={{maxWidth:'68%',padding:'10px 14px',
                      borderRadius:mine?'16px 16px 4px 16px':'16px 16px 16px 4px',
                      background:mine?'#0ea5e9':'#fff',
                      color:mine?'#fff':'#1e293b',fontSize:14,lineHeight:1.6,
                      boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
                      border:mine?'none':'1px solid #e2e8f0'}}>
                      <div>{m.message}</div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4,marginTop:3}}>
                        <span style={{fontSize:13,color:mine?'rgba(255,255,255,.55)':'#7a8899'}}>
                          {m.created_at?new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}
                        </span>
                        {mine&&<CheckCheck size={12} color={m.is_read?'#bbf7d0':'rgba(255,255,255,.35)'}/>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef}/>
            </div>

            {/* Input */}
            <div style={{padding:'14px 20px',borderTop:'1px solid #e2e8f0',background:'#fff',display:'flex',gap:10,alignItems:'center'}}>
              <input ref={inputRef} value={text} onChange={function(e){setText(e.target.value);}}
                onKeyDown={function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                placeholder={t("teamMessenger.messageUser") + " " + activeContact.name + "..."} maxLength={2000}
                style={{flex:1,padding:'11px 16px',borderRadius:24,border:'1.5px solid #e2e8f0',background:'#f8fafc',
                  fontSize:14,fontFamily:'inherit',outline:'none',color:'#0f172a',boxSizing:'border-box',transition:'border-color 0.2s'}}
                onFocus={function(e){e.target.style.borderColor='#0ea5e9';}}
                onBlur={function(e){e.target.style.borderColor='#e2e8f0';}}/>
              <button onClick={sendMessage} disabled={sending||!text.trim()}
                style={{width:42,height:42,borderRadius:'50%',border:'none',flexShrink:0,
                  background:text.trim()?'#0ea5e9':'#e2e8f0',
                  color:'#fff',cursor:text.trim()?'pointer':'default',
                  display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}}>
                <Send size={16} style={{marginLeft:1}}/>
              </button>
            </div>
          </>) : (
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#f8fafc'}}>
              <div style={{textAlign:'center'}}>
                <MessageCircle size={48} color="#cbd5e1" style={{marginBottom:14}}/>
                <div style={{fontSize:17,fontWeight:700,color:'#334155',marginBottom:4}}>{t('teamMessenger.selectConversation')}</div>
                <div style={{fontSize:13,color:'#7a8899'}}>{t('teamMessenger.chooseContact')}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
