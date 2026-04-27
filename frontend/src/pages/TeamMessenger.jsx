import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Send, MessageCircle, User, Users, ArrowLeft, CheckCheck, Search, Megaphone, Bold, Italic, Link as LinkIcon, X } from 'lucide-react';

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
  // Broadcast composer state — modal opens from header button, message text
  // sent to /api/team-messages/broadcast which fans out to all directs.
  var [broadcastOpen, setBroadcastOpen] = useState(false);
  var [broadcastText, setBroadcastText] = useState('');
  var [broadcastSending, setBroadcastSending] = useState(false);
  var [broadcastResult, setBroadcastResult] = useState(null);  // { sent_count } | { error }
  var bottomRef = useRef(null);
  var inputRef = useRef(null);
  var broadcastTextareaRef = useRef(null);

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

  function sendBroadcast() {
    if (!broadcastText.trim() || broadcastSending) return;
    setBroadcastSending(true);
    setBroadcastResult(null);
    apiPost('/api/team-messages/broadcast', { message: broadcastText.trim() })
      .then(function(r) {
        setBroadcastSending(false);
        setBroadcastResult({ sent_count: r.sent_count });
        loadData();
        // Auto-close after 2.5s on success so the user sees confirmation then returns to inbox
        setTimeout(function() {
          setBroadcastOpen(false);
          setBroadcastText('');
          setBroadcastResult(null);
        }, 2500);
      })
      .catch(function(err) {
        setBroadcastSending(false);
        setBroadcastResult({ error: (err && err.message) || 'Broadcast failed' });
      });
  }

  // Insert markdown formatting at the cursor position in the broadcast textarea.
  // wrap='**' for bold, '*' for italic, or null for link (which is handled
  // specially by inserting [text](url) syntax).
  function insertMarkdown(wrap) {
    var ta = broadcastTextareaRef.current;
    if (!ta) return;
    var start = ta.selectionStart, end = ta.selectionEnd;
    var before = broadcastText.slice(0, start);
    var selected = broadcastText.slice(start, end);
    var after = broadcastText.slice(end);
    var inserted, newCursor;
    if (wrap === 'link') {
      var label = selected || 'link text';
      inserted = '[' + label + '](https://)';
      newCursor = start + inserted.length - 1;  // place cursor at end so user finishes the URL
    } else {
      inserted = wrap + (selected || (wrap === '**' ? 'bold' : 'italic')) + wrap;
      newCursor = start + inserted.length;
    }
    setBroadcastText(before + inserted + after);
    setTimeout(function() {
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    }, 0);
  }

  // Safe markdown -> HTML renderer. Escapes ALL input first then applies
  // a tiny set of regex transforms for bold/italic/links/linebreaks. Cannot
  // be exploited because raw < > & " ' are escaped before any markdown
  // transformation runs - any HTML tags a sender types appear as literal
  // text. Existing plain-text messages render unchanged (no markdown
  // syntax in them, so the regexes match nothing).
  function renderMarkdown(raw) {
    if (!raw) return '';
    var escaped = String(raw)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    // Links: [text](url) — only http/https URLs allowed, javascript: et al rejected
    escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function(_m, label, url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">' + label + '</a>';
    });
    // Bold: **text**
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic: *text* (after bold to avoid the ** patterns matching here)
    escaped = escaped.replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1<em>$2</em>$3');
    // Linebreaks: preserve them as <br/>
    escaped = escaped.replace(/\n/g, '<br/>');
    return escaped;
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
            {/* Broadcast button — top of the contacts panel so it's the visual
                focal point. Disabled when there are no recipients. Uses
                amber/orange styling so it stands apart from the cobalt 1-on-1
                send button further down. */}
            <button
              type="button"
              onClick={function(){ setBroadcastOpen(true); setBroadcastResult(null); }}
              disabled={contacts.filter(function(c){return c.relationship==='referral';}).length === 0}
              style={{
                width:'100%', padding:'10px 14px', borderRadius:10,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color:'#1f1300', border:'none', cursor:'pointer',
                fontSize:13, fontWeight:800, fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                marginBottom:14,
                boxShadow:'0 2px 6px rgba(245,158,11,0.25)',
                opacity: contacts.filter(function(c){return c.relationship==='referral';}).length === 0 ? 0.4 : 1,
              }}>
              <Megaphone size={15} strokeWidth={2.5}/>
              {t('teamMessenger.broadcastBtn', { defaultValue: 'Broadcast to all' })}
            </button>
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
                      {m.is_broadcast && (
                        <div style={{
                          display:'inline-flex', alignItems:'center', gap:5,
                          padding:'2px 8px', marginBottom:6,
                          background:mine?'rgba(255,255,255,0.18)':'#fef3c7',
                          color:mine?'rgba(255,255,255,0.9)':'#b45309',
                          borderRadius:99, fontSize:11, fontWeight:700,
                          letterSpacing:'0.04em',
                        }}>
                          <Megaphone size={11} strokeWidth={2.5}/>
                          {t('teamMessenger.broadcastTag', { defaultValue: 'Broadcast' })}
                        </div>
                      )}
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.message) }}/>
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

      {/* ═══ BROADCAST COMPOSER MODAL ═══ */}
      {broadcastOpen && (
        <div
          onClick={function(e){ if (e.target === e.currentTarget) setBroadcastOpen(false); }}
          style={{
            position:'fixed', inset:0, zIndex:1000,
            background:'rgba(15,23,42,0.6)', backdropFilter:'blur(3px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:24,
          }}>
          <div style={{
            background:'#fff', borderRadius:18,
            width:'100%', maxWidth:580,
            maxHeight:'90vh', display:'flex', flexDirection:'column',
            boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
            overflow:'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              padding:'20px 24px', borderBottom:'1px solid #f1f5f9',
              display:'flex', alignItems:'center', gap:12,
            }}>
              <div style={{
                width:40, height:40, borderRadius:12,
                background:'linear-gradient(135deg, #f59e0b, #d97706)',
                color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Megaphone size={20} strokeWidth={2}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Sora', sans-serif", fontSize:18, fontWeight:800, color:'#0f172a', lineHeight:1.2}}>
                  {t('teamMessenger.broadcastTitle', { defaultValue: 'Broadcast to your team' })}
                </div>
                <div style={{fontSize:13, color:'#64748b', marginTop:2}}>
                  {t('teamMessenger.broadcastSubtitle', {
                    defaultValue: '{{n}} direct referrals will receive this message',
                    n: contacts.filter(function(c){return c.relationship==='referral';}).length,
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={function(){ setBroadcastOpen(false); }}
                style={{background:'none', border:'none', cursor:'pointer', padding:6, color:'#64748b', display:'flex'}}>
                <X size={20}/>
              </button>
            </div>

            {/* Modal body */}
            <div style={{padding:'20px 24px', overflowY:'auto', flex:1}}>
              {broadcastResult && broadcastResult.sent_count !== undefined ? (
                /* Success state */
                <div style={{textAlign:'center', padding:'30px 20px'}}>
                  <div style={{
                    width:64, height:64, borderRadius:'50%',
                    background:'#dcfce7', color:'#15803d',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    marginBottom:16,
                  }}>
                    <CheckCheck size={32} strokeWidth={2.5}/>
                  </div>
                  <div style={{fontFamily:"'Sora', sans-serif", fontSize:18, fontWeight:800, color:'#0f172a', marginBottom:6}}>
                    {t('teamMessenger.broadcastSent', { defaultValue: 'Broadcast sent!' })}
                  </div>
                  <div style={{fontSize:14, color:'#475569'}}>
                    {t('teamMessenger.broadcastSentDetail', {
                      defaultValue: 'Delivered to {{n}} team members.',
                      n: broadcastResult.sent_count,
                    })}
                  </div>
                </div>
              ) : (
                /* Composer */
                <>
                  {/* Formatting toolbar */}
                  <div style={{display:'flex', gap:6, marginBottom:10}}>
                    <button type="button" onClick={function(){ insertMarkdown('**'); }}
                      title={t('teamMessenger.bold', { defaultValue: 'Bold' })}
                      style={toolbarBtnStyle}>
                      <Bold size={15} strokeWidth={2.5}/>
                    </button>
                    <button type="button" onClick={function(){ insertMarkdown('*'); }}
                      title={t('teamMessenger.italic', { defaultValue: 'Italic' })}
                      style={toolbarBtnStyle}>
                      <Italic size={15} strokeWidth={2.5}/>
                    </button>
                    <button type="button" onClick={function(){ insertMarkdown('link'); }}
                      title={t('teamMessenger.link', { defaultValue: 'Link' })}
                      style={toolbarBtnStyle}>
                      <LinkIcon size={15} strokeWidth={2.5}/>
                    </button>
                    <div style={{flex:1}}/>
                    <span style={{fontSize:11, color:'#94a3b8', alignSelf:'center'}}>
                      {broadcastText.length}/2000
                    </span>
                  </div>
                  <textarea
                    ref={broadcastTextareaRef}
                    value={broadcastText}
                    onChange={function(e){ setBroadcastText(e.target.value.slice(0, 2000)); }}
                    placeholder={t('teamMessenger.broadcastPlaceholder', {
                      defaultValue: "Write your broadcast message…",
                    })}
                    style={{
                      width:'100%', minHeight:160, padding:14,
                      borderRadius:10, border:'1.5px solid #e2e8f0',
                      background:'#f8fafc', fontSize:14, fontFamily:'inherit',
                      lineHeight:1.5, resize:'vertical', outline:'none',
                      color:'#0f172a', boxSizing:'border-box',
                    }}/>

                  {/* Live preview */}
                  {broadcastText.trim() && (
                    <div style={{marginTop:14}}>
                      <div style={{fontSize:11, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#64748b', marginBottom:6}}>
                        {t('teamMessenger.broadcastPreview', { defaultValue: 'Preview' })}
                      </div>
                      <div style={{
                        background:'#fff', border:'1px solid #e2e8f0',
                        borderRadius:12, padding:'12px 14px',
                        fontSize:14, lineHeight:1.6, color:'#1e293b',
                      }}>
                        <div style={{
                          display:'inline-flex', alignItems:'center', gap:5,
                          padding:'2px 8px', marginBottom:6,
                          background:'#fef3c7', color:'#b45309',
                          borderRadius:99, fontSize:11, fontWeight:700,
                        }}>
                          <Megaphone size={11} strokeWidth={2.5}/>
                          {t('teamMessenger.broadcastTag', { defaultValue: 'Broadcast' })}
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(broadcastText) }}/>
                      </div>
                    </div>
                  )}

                  {broadcastResult && broadcastResult.error && (
                    <div style={{
                      marginTop:12, padding:'10px 14px',
                      background:'#fee2e2', border:'1px solid #fecaca',
                      borderRadius:10, color:'#b91c1c', fontSize:13, fontWeight:600,
                    }}>
                      {broadcastResult.error}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal footer */}
            {!(broadcastResult && broadcastResult.sent_count !== undefined) && (
              <div style={{
                padding:'16px 24px', borderTop:'1px solid #f1f5f9',
                display:'flex', justifyContent:'flex-end', gap:10,
              }}>
                <button
                  type="button"
                  onClick={function(){ setBroadcastOpen(false); }}
                  style={{
                    padding:'10px 20px', borderRadius:10,
                    background:'#fff', color:'#475569',
                    border:'1.5px solid #e2e8f0',
                    fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  }}>
                  {t('teamMessenger.cancel', { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="button"
                  onClick={sendBroadcast}
                  disabled={!broadcastText.trim() || broadcastSending}
                  style={{
                    padding:'10px 20px', borderRadius:10,
                    background:'linear-gradient(135deg, #f59e0b, #d97706)',
                    color:'#1f1300', border:'none',
                    fontSize:14, fontWeight:800,
                    cursor:(!broadcastText.trim() || broadcastSending)?'not-allowed':'pointer',
                    fontFamily:'inherit',
                    opacity:(!broadcastText.trim() || broadcastSending)?0.5:1,
                    boxShadow:'0 4px 12px rgba(245,158,11,0.3)',
                    display:'inline-flex', alignItems:'center', gap:8,
                  }}>
                  <Megaphone size={15} strokeWidth={2.5}/>
                  {broadcastSending
                    ? t('teamMessenger.sending', { defaultValue: 'Sending…' })
                    : t('teamMessenger.broadcastSend', {
                        defaultValue: 'Send to {{n}}',
                        n: contacts.filter(function(c){return c.relationship==='referral';}).length,
                      })}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const toolbarBtnStyle = {
  padding:'7px 10px', borderRadius:8,
  background:'#f8fafc', border:'1px solid #e2e8f0',
  cursor:'pointer', color:'#475569',
  display:'flex', alignItems:'center', justifyContent:'center',
};
