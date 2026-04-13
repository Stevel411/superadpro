import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Send, MessageCircle, User, Users, ChevronRight, ArrowLeft, Check, CheckCheck, Search } from 'lucide-react';

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

  useEffect(function() { loadData(); var interval = setInterval(loadData, 15000); return function() { clearInterval(interval); }; }, []);

  useEffect(function() {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContact]);

  useEffect(function() {
    if (activeContact && inputRef.current) inputRef.current.focus();
  }, [activeContact]);

  function sendMessage() {
    if (!text.trim() || !activeContact || sending) return;
    setSending(true);
    apiPost('/api/team-messages/send', { to_user_id: activeContact.id, message: text.trim() })
      .then(function() { setText(''); setSending(false); loadData(); })
      .catch(function() { setSending(false); });
  }

  var convoMsgs = activeContact ? messages.filter(function(m) {
    return (m.other_user && m.other_user.id === activeContact.id);
  }).reverse() : [];

  /* Group messages by date */
  var groupedMsgs = [];
  var lastDate = '';
  convoMsgs.forEach(function(m) {
    var d = m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    if (d !== lastDate) { groupedMsgs.push({ type: 'date', date: d }); lastDate = d; }
    groupedMsgs.push({ type: 'msg', data: m });
  });

  /* Filter contacts by search */
  var filteredContacts = contacts.filter(function(c) {
    if (!search.trim()) return true;
    return (c.name || '').toLowerCase().includes(search.toLowerCase());
  });

  /* Get last message for a contact */
  function getLastMsg(contactId) {
    var msgs = messages.filter(function(m) { return m.other_user && m.other_user.id === contactId; });
    if (msgs.length === 0) return null;
    return msgs[0]; // already sorted newest first from API
  }

  function getUnreadCount(contactId) {
    return messages.filter(function(m) {
      return m.direction === 'received' && !m.is_read && m.other_user && m.other_user.id === contactId;
    }).length;
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var now = new Date();
    var diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  }

  if (loading) return <AppLayout title={t("teamMessenger.title")}><div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}><div style={{width:44,height:44,borderRadius:'50%',border:'3px solid #e2e8f0',borderTopColor:'#8b5cf6',animation:'spin 0.8s linear infinite'}}/><div style={{fontSize:14,fontWeight:700,color:'#94a3b8'}}>Loading conversations...</div></div><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;

  return (
    <AppLayout title={t("teamMessenger.title")} subtitle={t('teamMessenger.messageSubtitle')}>
      <div style={{display:'grid',gridTemplateColumns:activeContact?'320px 1fr':'1fr',gap:0,background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,overflow:'hidden',minHeight:620,boxShadow:'0 4px 24px rgba(0,0,0,.08)'}}>

        {/* ═══ CONTACTS SIDEBAR ═══ */}
        <div style={{borderRight:activeContact?'1px solid #f1f5f9':'none',display:'flex',flexDirection:'column',background:'#fafbfd'}}>
          {/* Sidebar header */}
          <div style={{padding:'18px 20px',background:'linear-gradient(135deg,#4338ca,#6366f1)',borderRadius:'18px 0 0 0'}}>
            <div style={{fontSize:16,fontWeight:800,color:'#fff',display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <Users size={18}/> Conversations
              {unread > 0 && <span style={{fontSize:10,fontWeight:800,padding:'3px 8px',borderRadius:10,background:'#ef4444',color:'#fff',marginLeft:'auto'}}>{unread}</span>}
            </div>
            {/* Search */}
            <div style={{position:'relative'}}>
              <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.5)'}}/>
              <input value={search} onChange={function(e){setSearch(e.target.value);}}
                placeholder="Search contacts..."
                style={{width:'100%',padding:'9px 12px 9px 34px',borderRadius:10,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.1)',
                  fontSize:13,fontFamily:'inherit',outline:'none',color:'#fff',boxSizing:'border-box','::placeholder':{color:'rgba(255,255,255,0.4)'}}}/>
            </div>
          </div>

          {/* Contact list */}
          {filteredContacts.length === 0 ? (
            <div style={{padding:'50px 20px',textAlign:'center',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:64,height:64,borderRadius:'50%',background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
                <Users size={28} color="#cbd5e1"/>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:'#334155',marginBottom:4}}>{contacts.length === 0 ? 'No team members yet' : 'No results'}</div>
              <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.6}}>{contacts.length === 0 ? 'Recruit your first member to start messaging' : 'Try a different search'}</div>
            </div>
          ) : (
            <div style={{overflowY:'auto',flex:1}}>
              {filteredContacts.map(function(c) {
                var isActive = activeContact && activeContact.id === c.id;
                var lastMsg = getLastMsg(c.id);
                var unreadN = getUnreadCount(c.id);
                var isSponsor = c.relationship === 'sponsor';

                return (
                  <div key={c.id} onClick={function(){setActiveContact(c);}}
                    style={{padding:'14px 20px',cursor:'pointer',display:'flex',alignItems:'center',gap:14,
                      background:isActive?'#eef2ff':'transparent',
                      borderLeft:isActive?'3px solid #6366f1':'3px solid transparent',
                      transition:'all .15s'}}>
                    {/* Avatar */}
                    <div style={{position:'relative',flexShrink:0}}>
                      <div style={{width:44,height:44,borderRadius:'50%',
                        background:c.avatar?undefined:(isSponsor?'linear-gradient(135deg,#0ea5e9,#38bdf8)':'linear-gradient(135deg,#8b5cf6,#a78bfa)'),
                        display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',
                        border:isActive?'2px solid #6366f1':'2px solid transparent'}}>
                        {c.avatar ? <img src={c.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> :
                          <span style={{fontSize:15,fontWeight:800,color:'#fff'}}>{getInitials(c.name)}</span>}
                      </div>
                      {/* Online dot — simulate based on recent activity */}
                      <div style={{position:'absolute',bottom:0,right:0,width:12,height:12,borderRadius:'50%',
                        background:'#22c55e',border:'2px solid #fff'}}/>
                    </div>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                        <span style={{fontSize:14,fontWeight:isActive?800:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {c.name}
                        </span>
                        {lastMsg && <span style={{fontSize:10,color:'#94a3b8',flexShrink:0,marginLeft:8}}>{formatTime(lastMsg.created_at)}</span>}
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:12,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                          {lastMsg ? (lastMsg.direction === 'sent' ? 'You: ' : '') + (lastMsg.message || '').substring(0, 40) + (lastMsg.message && lastMsg.message.length > 40 ? '...' : '')
                            : <span style={{fontStyle:'italic'}}>No messages yet</span>}
                        </span>
                        {unreadN > 0 && <span style={{fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:10,background:'#6366f1',color:'#fff',flexShrink:0,marginLeft:8}}>{unreadN}</span>}
                      </div>
                      <div style={{fontSize:10,fontWeight:700,color:isSponsor?'#0ea5e9':'#8b5cf6',textTransform:'uppercase',letterSpacing:.5,marginTop:3}}>
                        {isSponsor ? 'Your Sponsor' : 'Your Referral'} · {c.tier || 'Basic'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ CHAT AREA ═══ */}
        {activeContact ? (
          <div style={{display:'flex',flexDirection:'column',height:620}}>
            {/* Chat header */}
            <div style={{padding:'14px 24px',background:'linear-gradient(135deg,#1e1b4b,#312e81)',display:'flex',alignItems:'center',gap:14}}>
              <button onClick={function(){setActiveContact(null);}} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',color:'rgba(255,255,255,0.6)'}}>
                <ArrowLeft size={20}/>
              </button>
              <div style={{width:40,height:40,borderRadius:'50%',
                background:activeContact.avatar?undefined:(activeContact.relationship==='sponsor'?'linear-gradient(135deg,#0ea5e9,#38bdf8)':'linear-gradient(135deg,#8b5cf6,#a78bfa)'),
                display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,border:'2px solid rgba(255,255,255,0.2)'}}>
                {activeContact.avatar ? <img src={activeContact.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> :
                  <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>{getInitials(activeContact.name)}</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>{activeContact.name}</div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80'}}/>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>
                    {activeContact.relationship === 'sponsor' ? 'Your Sponsor' : 'Your Referral'} · {activeContact.tier || 'Basic'}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:'auto',padding:'20px 24px',background:'#f8f9fb',display:'flex',flexDirection:'column',gap:4}}>
              {groupedMsgs.length === 0 && (
                <div style={{textAlign:'center',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
                  <div style={{width:72,height:72,borderRadius:'50%',background:'#eef2ff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <MessageCircle size={32} color="#a5b4fc"/>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:'#334155'}}>No messages yet</div>
                  <div style={{fontSize:13,color:'#94a3b8'}}>Say hello to {activeContact.name}!</div>
                </div>
              )}

              {groupedMsgs.map(function(item, idx) {
                if (item.type === 'date') {
                  return <div key={'d'+idx} style={{textAlign:'center',margin:'16px 0 8px'}}>
                    <span style={{fontSize:11,fontWeight:700,color:'#94a3b8',background:'#eef2ff',padding:'4px 14px',borderRadius:20}}>{item.date}</span>
                  </div>;
                }

                var m = item.data;
                var isMine = m.direction === 'sent';

                return (
                  <div key={m.id} style={{display:'flex',justifyContent:isMine?'flex-end':'flex-start',marginBottom:2}}>
                    {!isMine && <div style={{width:28,height:28,borderRadius:'50%',
                      background:activeContact.relationship==='sponsor'?'linear-gradient(135deg,#0ea5e9,#38bdf8)':'linear-gradient(135deg,#8b5cf6,#a78bfa)',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginRight:8,marginTop:'auto'}}>
                      <span style={{fontSize:10,fontWeight:800,color:'#fff'}}>{getInitials(activeContact.name)}</span>
                    </div>}
                    <div style={{maxWidth:'70%',padding:'12px 16px',
                      borderRadius:isMine?'18px 18px 4px 18px':'18px 18px 18px 4px',
                      background:isMine?'linear-gradient(135deg,#6366f1,#818cf8)':'#fff',
                      color:isMine?'#fff':'#1e293b',fontSize:14,lineHeight:1.6,
                      boxShadow:isMine?'0 2px 12px rgba(99,102,241,.25)':'0 1px 4px rgba(0,0,0,.06)',
                      border:isMine?'none':'1px solid #e8ecf2'}}>
                      <div>{m.message}</div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4,marginTop:4}}>
                        <span style={{fontSize:10,color:isMine?'rgba(255,255,255,.5)':'#94a3b8'}}>
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''}
                        </span>
                        {isMine && <CheckCheck size={12} color={m.is_read ? '#4ade80' : 'rgba(255,255,255,.4)'}/>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef}/>
            </div>

            {/* Input area */}
            <div style={{padding:'16px 20px',borderTop:'1px solid #e2e8f0',background:'#fff',display:'flex',gap:10,alignItems:'flex-end'}}>
              <div style={{flex:1,position:'relative'}}>
                <textarea ref={inputRef} value={text} onChange={function(e){setText(e.target.value);}}
                  onKeyDown={function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                  placeholder={"Message " + activeContact.name + "..."} maxLength={2000}
                  rows={1}
                  style={{width:'100%',padding:'12px 16px',borderRadius:14,border:'2px solid #e2e8f0',background:'#f8f9fb',
                    fontSize:14,fontFamily:'inherit',outline:'none',color:'#0f172a',resize:'none',boxSizing:'border-box',
                    minHeight:44,maxHeight:120,lineHeight:1.5,transition:'border-color 0.2s'}}
                  onFocus={function(e){e.target.style.borderColor='#6366f1';}}
                  onBlur={function(e){e.target.style.borderColor='#e2e8f0';}}/>
                {text.length > 0 && <span style={{position:'absolute',right:12,bottom:8,fontSize:10,color:'#94a3b8'}}>{text.length}/2000</span>}
              </div>
              <button onClick={sendMessage} disabled={sending || !text.trim()}
                style={{width:48,height:48,borderRadius:'50%',border:'none',flexShrink:0,
                  background:text.trim()?'linear-gradient(135deg,#6366f1,#818cf8)':'#e2e8f0',
                  color:'#fff',cursor:text.trim()?'pointer':'default',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  transition:'all .2s',transform:text.trim()?'scale(1)':'scale(0.95)',
                  boxShadow:text.trim()?'0 4px 12px rgba(99,102,241,.3)':'none'}}>
                <Send size={18} style={{marginLeft:2}}/>
              </button>
            </div>
          </div>
        ) : (
          !contacts.length ? null : (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:620,background:'#f8f9fb'}}>
              <div style={{textAlign:'center'}}>
                <div style={{width:80,height:80,borderRadius:'50%',background:'#eef2ff',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                  <MessageCircle size={36} color="#a5b4fc"/>
                </div>
                <div style={{fontSize:18,fontWeight:800,color:'#1e293b',marginBottom:6}}>Select a conversation</div>
                <div style={{fontSize:14,color:'#94a3b8'}}>Choose a team member from the left to start chatting</div>
              </div>
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}
