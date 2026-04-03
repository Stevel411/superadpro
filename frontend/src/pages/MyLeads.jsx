import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/layout/AppLayout';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { Mail, UserPlus, Send, Upload, Trash2, Plus, Zap, Rocket, Search, Sparkles, HelpCircle } from 'lucide-react';
import MyLeadsHelp from './MyLeadsHelp';

var TABS = [
  { key:'leads', label:'Leads', icon:UserPlus },
  { key:'sequences', label:'Sequences', icon:Zap },
  { key:'broadcast', label:'Broadcast', icon:Send },
  { key:'import', label:'Import', icon:Upload },
  { key:'boost', label:'Boost', icon:Rocket },
];
var STATUS_STYLES = {
  new:{bg:'#ede9fe',color:'#7c3aed',label:'New'}, nurturing:{bg:'#f0fdf4',color:'#059669',label:'Nurturing'},
  hot:{bg:'#fce7f3',color:'#db2777',label:'Hot'}, converted:{bg:'#ecfeff',color:'#0891b2',label:'Converted'},
  unsubscribed:{bg:'#f1f5f9',color:'#94a3b8',label:'Unsubscribed'},
};
var TC = ['#6366f1','#0ea5e9','#16a34a','#f59e0b','#ef4444','#ec4899','#8b5cf6','#06b6d4'];

export default function MyLeads() {
  var [tab, setTab] = useState('leads');
  var [leads, setLeads] = useState([]);
  var [sequences, setSequences] = useState([]);
  var [lists, setLists] = useState([]);
  var [stats, setStats] = useState({});
  var [emailStats, setEmailStats] = useState({});
  var [loading, setLoading] = useState(true);
  var [msg, setMsg] = useState('');
  var [msgType, setMsgType] = useState('ok');
  var [showHelp, setShowHelp] = useState(false);

  function flash(t, ty) { setMsg(t); setMsgType(ty || 'ok'); setTimeout(function() { setMsg(''); }, 4000); }

  var refresh = useCallback(function() {
    Promise.all([apiGet('/api/leads'), apiGet('/api/leads/sequences'), apiGet('/api/leads/lists'), apiGet('/api/leads/stats'), apiGet('/api/leads/email-stats')])
      .then(function(r) { setLeads(r[0].leads || []); setSequences(r[1].sequences || []); setLists(r[2].lists || []); setStats(r[3] || {}); setEmailStats(r[4] || {}); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, []);

  useEffect(function() { refresh(); }, [refresh]);

  if (loading) return <AppLayout title="SuperLeads"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;
  if (showHelp) return <AppLayout title="SuperLeads"><MyLeadsHelp onBack={function(){setShowHelp(false);}}/></AppLayout>;

  return (
    <AppLayout title="SuperLeads" subtitle="CRM & Email Autoresponder">
      <style>{'@keyframes spin{to{transform:rotate(360deg)}} .sl-tab{transition:all .15s;cursor:pointer} .sl-tab:hover{background:#f1f5f9!important} .sl-row{transition:background .1s} .sl-row:hover{background:#f8fafc!important} @media(max-width:767px){.sl-stats{grid-template-columns:1fr 1fr!important}}'}</style>

      <div style={{background:'linear-gradient(135deg,#0c1222,#1c223d,#2d3561)',borderRadius:16,padding:'28px 32px',marginBottom:20,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:140,height:140,borderRadius:'50%',background:'rgba(255,255,255,.04)',pointerEvents:'none'}}/>
        <div style={{position:'relative',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'rgba(255,255,255,.35)',marginBottom:6}}>SuperLeads CRM</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#fff',marginBottom:4}}>Email Autoresponder</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,.5)'}}>Capture leads, nurture with sequences, broadcast to your audience.</div>
          </div>
          <button onClick={function(){setShowHelp(true);}} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 16px',borderRadius:8,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.05)',color:'rgba(255,255,255,.6)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}><HelpCircle size={14}/> Help</button>
        </div>
      </div>

      <div className="sl-stats" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
        {[{v:stats.total||0,l:'Total leads',c:'#6366f1'},{v:sequences.length,l:'Sequences',c:'#0ea5e9'},{v:emailStats.sent_today||0,l:'Sent today',c:'#16a34a'},{v:stats.hot||0,l:'Hot leads',c:'#f59e0b'}].map(function(s,i){return <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:16,textAlign:'center'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{s.l}</div></div>;})}
      </div>

      {msg && <div style={{padding:'10px 16px',borderRadius:10,marginBottom:16,fontSize:13,fontWeight:700,background:msgType==='ok'?'#f0fdf4':'#fef2f2',border:'1px solid '+(msgType==='ok'?'#bbf7d0':'#fecaca'),color:msgType==='ok'?'#059669':'#dc2626'}}>{msg}</div>}

      <div style={{display:'flex',gap:4,marginBottom:20,background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:4}}>
        {TABS.map(function(t){var a=tab===t.key;var I=t.icon;return <div key={t.key} className={a?'':'sl-tab'} onClick={function(){setTab(t.key);}} style={{flex:1,textAlign:'center',padding:'10px 8px',borderRadius:8,background:a?'#6366f1':'transparent',color:a?'#fff':'#64748b',fontSize:12,fontWeight:a?700:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><I size={14}/> {t.label}</div>;})}
      </div>

      {tab==='leads' && <LeadsTab leads={leads} lists={lists} sequences={sequences} refresh={refresh} flash={flash}/>}
      {tab==='sequences' && <SeqTab sequences={sequences} refresh={refresh} flash={flash}/>}
      {tab==='broadcast' && <BcastTab leads={leads} lists={lists} flash={flash}/>}
      {tab==='import' && <ImpTab stats={stats} lists={lists} refresh={refresh} flash={flash}/>}
      {tab==='boost' && <BoostTab emailStats={emailStats} refresh={refresh} flash={flash}/>}
    </AppLayout>
  );
}

function LeadsTab({leads,lists,sequences,refresh,flash}) {
  var [search,setSearch]=useState('');var [fS,setFS]=useState('all');var [fL,setFL]=useState('');
  var lm={}; lists.forEach(function(l){lm[l.id]=l;});
  var filtered=leads.filter(function(l){
    if(search&&!l.email.toLowerCase().includes(search.toLowerCase())&&!(l.name||'').toLowerCase().includes(search.toLowerCase()))return false;
    if(fS!=='all'){if(fS==='hot'){if(!l.is_hot)return false;}else if(l.status!==fS)return false;}
    if(fL&&l.list_id!==parseInt(fL))return false;return true;
  });
  function del(id){if(!window.confirm('Delete this lead?'))return;apiDelete('/api/leads/'+id).then(function(){flash('Lead deleted');refresh();}).catch(function(e){flash(e.message,'err');});}
  function assignSeq(lid,sid){apiPost('/api/leads/'+lid+'/assign-sequence',{sequence_id:sid?parseInt(sid):null}).then(function(){flash('Sequence assigned');refresh();}).catch(function(e){flash(e.message,'err');});}

  return <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
    <div style={{padding:'14px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <div style={{position:'relative'}}><Search size={14} color="#94a3b8" style={{position:'absolute',left:10,top:10}}/><input value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="Search leads..." style={{padding:'8px 8px 8px 30px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit',width:180}}/></div>
        <select value={fS} onChange={function(e){setFS(e.target.value);}} style={{padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit',color:'#64748b'}}><option value="all">All statuses</option><option value="new">New</option><option value="nurturing">Nurturing</option><option value="hot">Hot</option><option value="converted">Converted</option></select>
        <select value={fL} onChange={function(e){setFL(e.target.value);}} style={{padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit',color:'#64748b'}}><option value="">All lists</option>{lists.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>;})}</select>
      </div>
      <div style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>{filtered.length} leads</div>
    </div>
    {filtered.length>0?<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:600}}><thead><tr style={{background:'#f8fafc'}}>
      <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'#64748b',fontSize:11}}>Name</th>
      <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'#64748b',fontSize:11}}>Email</th>
      <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'#64748b',fontSize:11}}>Status</th>
      <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'#64748b',fontSize:11}}>List</th>
      <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'#64748b',fontSize:11}}>Emails</th>
      <th style={{textAlign:'left',padding:'10px 16px',fontWeight:700,color:'#64748b',fontSize:11}}>Sequence</th>
      <th style={{textAlign:'right',padding:'10px 16px'}}></th>
    </tr></thead><tbody>{filtered.map(function(l){var st=STATUS_STYLES[l.is_hot?'hot':l.status]||STATUS_STYLES.new;var li=lm[l.list_id];return <tr key={l.id} className="sl-row" style={{borderTop:'1px solid #f1f5f9'}}>
      <td style={{padding:'10px 16px',fontWeight:600,color:'#0f172a'}}>{l.name||'—'}</td>
      <td style={{padding:'10px 16px',color:'#64748b'}}>{l.email}</td>
      <td style={{padding:'10px 16px'}}><span style={{padding:'3px 8px',borderRadius:4,background:st.bg,color:st.color,fontSize:10,fontWeight:700}}>{st.label}</span></td>
      <td style={{padding:'10px 16px'}}>{li?<span style={{padding:'3px 8px',borderRadius:4,background:li.color+'18',color:li.color,fontSize:10,fontWeight:600}}>{li.name}</span>:<span style={{color:'#cbd5e1',fontSize:10}}>—</span>}</td>
      <td style={{padding:'10px 16px',color:'#64748b'}}>{l.emails_sent||0} sent</td>
      <td style={{padding:'10px 16px'}}><select value={l.sequence_id||''} onChange={function(e){assignSeq(l.id,e.target.value);}} style={{padding:'4px 8px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:10,fontFamily:'inherit',color:'#64748b',maxWidth:120}}><option value="">None</option>{sequences.map(function(s){return <option key={s.id} value={s.id}>{s.title}</option>;})}</select></td>
      <td style={{padding:'10px 16px',textAlign:'right'}}><button onClick={function(){del(l.id);}} style={{padding:'4px 8px',borderRadius:4,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}><Trash2 size={10}/></button></td>
    </tr>;})}</tbody></table></div>
    :<div style={{textAlign:'center',padding:'60px 20px'}}><UserPlus size={32} color="#cbd5e1" style={{marginBottom:8}}/><div style={{fontSize:14,fontWeight:700,color:'#94a3b8'}}>No leads yet</div><div style={{fontSize:12,color:'#cbd5e1',marginTop:4}}>Leads are captured from your SuperPages funnel forms</div></div>}
  </div>;
}

function SeqTab({sequences,refresh,flash}) {
  var [ed,setEd]=useState(null);var [t,setT]=useState('');var [em,setEm]=useState([]);var [gen,setGen]=useState(false);
  function startNew(){setEd('new');setT('');setEm([{subject:'Welcome!',body_html:'',send_delay_days:0},{subject:'Follow up — quick tip',body_html:'',send_delay_days:2},{subject:'Last chance to take action',body_html:'',send_delay_days:5}]);}
  function editEx(s){setEd(s.id);setT(s.title);setEm(s.emails||[]);}
  function save(){if(!t.trim()){flash('Title required','err');return;}var c=em.filter(function(e){return e.subject&&e.subject.trim();});if(!c.length){flash('At least one email required','err');return;}(ed==='new'?apiPost('/api/leads/sequences',{title:t,emails:c}):apiPut('/api/leads/sequences/'+ed,{title:t,emails:c})).then(function(){flash('Sequence saved');setEd(null);refresh();}).catch(function(e){flash(e.message,'err');});}
  function delSeq(id){if(!window.confirm('Delete?'))return;apiDelete('/api/leads/sequences/'+id).then(function(){flash('Deleted');refresh();}).catch(function(e){flash(e.message,'err');});}
  function genAI(){setGen(true);var n=window.prompt('What niche? (e.g. fitness, crypto, marketing)');if(!n){setGen(false);return;}apiPost('/api/leads/sequences',{title:n.charAt(0).toUpperCase()+n.slice(1)+' Welcome Series',niche:n,emails:[{subject:'Welcome — your journey starts here',body_html:'<p>Welcome! We are glad you are here.</p>',send_delay_days:0},{subject:'Quick tip to get started',body_html:'<p>Here is a valuable tip for your '+n+' journey.</p>',send_delay_days:1},{subject:'What others are saying',body_html:'<p>See what our community members have achieved.</p>',send_delay_days:3},{subject:"Don't miss out",body_html:'<p>Time is running out — take action today.</p>',send_delay_days:5},{subject:'Final call — are you in?',body_html:'<p>This is your last chance to join us.</p>',send_delay_days:7}]}).then(function(){flash('AI sequence created — edit to customise');setGen(false);refresh();}).catch(function(e){flash(e.message,'err');setGen(false);});}
  function sendNext(sid){apiPost('/api/leads/send-sequence-email',{sequence_id:sid}).then(function(r){flash('Sent '+(r.sent||0)+' emails');refresh();}).catch(function(e){flash(e.message,'err');});}

  if(ed!==null)return <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800}}>{ed==='new'?'Create':'Edit'} Sequence</div><button onClick={function(){setEd(null);}} style={{fontSize:12,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Cancel</button></div>
    <div style={{padding:'20px 24px'}}>
      <div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>Sequence name</label><input value={t} onChange={function(e){setT(e.target.value);}} placeholder="e.g. Fitness Welcome Series" style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      {em.map(function(e,i){var color=TC[i%TC.length];return <div key={i} style={{background:'#f8f9fb',borderRadius:12,padding:16,marginBottom:10,border:'1px solid #e8ecf2',borderLeft:'3px solid '+color}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontSize:12,fontWeight:800,color:color}}>Email {i+1}</span><div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{fontSize:10,color:'#94a3b8'}}>after</span><input type="number" min="0" value={e.send_delay_days} onChange={function(ev){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{send_delay_days:parseInt(ev.target.value)||0}):x;}));}} style={{width:45,padding:4,border:'1px solid #e2e8f0',borderRadius:5,fontSize:11,textAlign:'center'}}/><span style={{fontSize:10,color:'#94a3b8'}}>days</span>{em.length>1&&<button onClick={function(){setEm(em.filter(function(x,j){return j!==i;}));}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer',padding:2}}><Trash2 size={12}/></button>}</div></div>
        <input value={e.subject} onChange={function(ev){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{subject:ev.target.value}):x;}));}} placeholder="Subject line" style={{width:'100%',padding:'9px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:8,background:'#fff'}}/>
        <RichTextEditor content={e.body_html} onChange={function(h){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{body_html:h}):x;}));}} placeholder="Email body..."/>
      </div>;})}
      <button onClick={function(){setEm(em.concat([{subject:'',body_html:'',send_delay_days:(em.length>0?(em[em.length-1].send_delay_days||0)+2:0)}]));}} style={{display:'flex',alignItems:'center',gap:4,padding:'8px 14px',borderRadius:8,border:'1.5px solid #e8ecf2',background:'#fff',color:'#6366f1',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:20}}><Plus size={12}/> Add email</button>
      <button onClick={save} style={{padding:'12px 28px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>Save Sequence</button>
    </div></div>;

  return <div>
    <div style={{display:'flex',gap:10,marginBottom:16}}>
      <button onClick={startNew} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:14,borderRadius:10,border:'none',background:'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Plus size={16}/> Create sequence</button>
      <button onClick={genAI} disabled={gen} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:14,borderRadius:10,border:'none',background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:13,fontWeight:700,cursor:gen?'wait':'pointer',fontFamily:'inherit'}}><Sparkles size={16}/> {gen?'Generating...':'Generate with AI'}</button>
    </div>
    {sequences.length>0?sequences.map(function(sq){var se=sq.emails||[];return <div key={sq.id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',marginBottom:12}}>
      <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div><div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{sq.title}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{sq.num_emails} emails</div></div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <span style={{padding:'4px 10px',borderRadius:6,background:sq.is_active?'#f0fdf4':'#f1f5f9',color:sq.is_active?'#059669':'#94a3b8',fontSize:10,fontWeight:700}}>{sq.is_active?'Active':'Paused'}</span>
          <button onClick={function(){sendNext(sq.id);}} style={{padding:'4px 12px',borderRadius:6,border:'none',background:'#16a34a',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Send Next</button>
          <button onClick={function(){editEx(sq);}} style={{padding:'4px 12px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
          <button onClick={function(){delSeq(sq.id);}} style={{padding:'4px 12px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
        </div>
      </div>
      {se.length>0&&<div style={{padding:'18px 20px',display:'flex',alignItems:'center',overflowX:'auto'}}>{se.map(function(e,i){var c=TC[i%TC.length];var last=i===se.length-1;return <div key={i} style={{display:'flex',alignItems:'center',flex:last?'0 0 auto':1}}>
        <div style={{textAlign:'center',minWidth:80}}>
          <div style={{width:36,height:36,borderRadius:10,background:c,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px'}}><Mail size={16} color="#fff"/></div>
          <div style={{fontSize:11,fontWeight:700,color:'#0f172a',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.subject||'Email '+(i+1)}</div>
          <div style={{fontSize:10,color:'#94a3b8'}}>Day {e.send_delay_days||0}</div>
        </div>
        {!last&&<div style={{flex:1,height:2,background:'#e2e8f0',margin:'0 4px',marginBottom:24}}/>}
      </div>;})}</div>}
    </div>;}):<div style={{textAlign:'center',padding:'60px 20px',background:'#fff',borderRadius:14,border:'1px solid #e2e8f0'}}><Zap size={32} color="#cbd5e1" style={{marginBottom:8}}/><div style={{fontSize:14,fontWeight:700,color:'#94a3b8'}}>No sequences yet</div><div style={{fontSize:12,color:'#cbd5e1',marginTop:4}}>Create a sequence to start nurturing your leads automatically</div></div>}
  </div>;
}

function BcastTab({leads,lists,flash}) {
  var [sub,setSub]=useState('');var [html,setHtml]=useState('');var [fS,setFS]=useState('all');var [fL,setFL]=useState('');var [s,setS]=useState(false);var [sent,setSent]=useState(null);
  var ct=leads.filter(function(l){if(l.status==='unsubscribed')return false;if(fL&&l.list_id!==parseInt(fL))return false;if(fS!=='all'){if(fS==='hot')return l.is_hot;return l.status===fS;}return true;}).length;
  function send(){if(!sub.trim()){flash('Subject required','err');return;}setS(true);apiPost('/api/leads/broadcast',{subject:sub,html_content:html,filter_status:fS,list_id:fL?parseInt(fL):null}).then(function(r){setS(false);setSent(r.sent||0);flash('Broadcast sent to '+(r.sent||0)+' leads');}).catch(function(e){setS(false);flash(e.message,'err');});}

  return <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f5f9'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:4}}>Broadcast</div><div style={{fontSize:12,color:'#94a3b8'}}>Send a one-off email to your leads</div></div>
    <div style={{padding:'20px 24px'}}>
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>List</label><select value={fL} onChange={function(e){setFL(e.target.value);}} style={{width:'100%',padding:9,border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit'}}><option value="">All lists</option>{lists.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>;})}</select></div>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Status</label><select value={fS} onChange={function(e){setFS(e.target.value);}} style={{width:'100%',padding:9,border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit'}}><option value="all">All</option><option value="new">New</option><option value="nurturing">Nurturing</option><option value="hot">Hot</option></select></div>
        <div style={{display:'flex',alignItems:'flex-end',paddingBottom:2}}><span style={{fontSize:14,fontWeight:800,color:'#6366f1'}}>{ct} recipients</span></div>
      </div>
      <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Subject</label><input value={sub} onChange={function(e){setSub(e.target.value);}} style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Content</label><RichTextEditor content={html} onChange={setHtml} placeholder="Write your broadcast email..."/></div>
      <button onClick={send} disabled={s} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 24px',borderRadius:10,border:'none',background:s?'#cbd5e1':'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',fontSize:13,fontWeight:800,cursor:s?'default':'pointer',fontFamily:'Sora,sans-serif'}}><Send size={14}/>{s?'Sending...':'Send to '+ct}</button>
      {sent!==null&&<div style={{marginTop:10,fontSize:12,fontWeight:700,color:'#16a34a'}}>Sent to {sent} leads</div>}
    </div></div>;
}

function ImpTab({stats,lists,refresh,flash}) {
  var [csv,setCsv]=useState('');var [p,setP]=useState([]);var [lid,setLid]=useState('');var [u,setU]=useState(false);var [res,setRes]=useState(null);
  function parse(){var lines=csv.trim().split('\n');var out=[];for(var i=0;i<lines.length;i++){var pts=lines[i].trim().split(',');var e=(pts[0]||'').trim().toLowerCase();if(e&&e.includes('@'))out.push({email:e,name:(pts[1]||'').trim()});}setP(out);}
  function upload(){if(!p.length)return;setU(true);apiPost('/api/leads/upload-csv',{leads:p,list_id:lid?parseInt(lid):null}).then(function(r){setU(false);setRes(r);flash('+'+r.imported+' imported');refresh();}).catch(function(e){setU(false);flash(e.message,'err');});}

  return <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f5f9'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:4}}>Import Leads</div><div style={{fontSize:12,color:'#94a3b8'}}>Upload a CSV file with email addresses</div></div>
    <div style={{padding:'20px 24px'}}>
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <div style={{flex:1,background:'rgba(99,102,241,.04)',border:'1px solid rgba(99,102,241,.12)',borderRadius:10,padding:12}}><div style={{fontSize:10,fontWeight:700,color:'#6366f1'}}>Leads</div><div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#6366f1'}}>{stats.total||0}<span style={{fontSize:12,color:'#94a3b8'}}>/{stats.limit||5000}</span></div></div>
        <div style={{flex:2}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Import into list</label><select value={lid} onChange={function(e){setLid(e.target.value);}} style={{width:'100%',padding:10,border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit'}}><option value="">Unsorted</option>{lists.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>;})}</select></div>
      </div>
      <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:28,borderRadius:12,border:'2px dashed #d1d5db',cursor:'pointer',marginBottom:12,transition:'border-color .15s'}} onMouseEnter={function(e){e.currentTarget.style.borderColor='#6366f1';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';}}>
        <Upload size={24} color="#6366f1"/><span style={{fontSize:13,fontWeight:600,color:'#475569'}}>Upload CSV</span><input type="file" accept=".csv,.txt" onChange={function(e){var f=e.target.files[0];if(f){var rd=new FileReader();rd.onload=function(ev){setCsv(ev.target.result);};rd.readAsText(f);}}} style={{display:'none'}}/>
      </label>
      <textarea value={csv} onChange={function(e){setCsv(e.target.value);setP([]);setRes(null);}} rows={4} placeholder="email,name (one per line)" style={{width:'100%',padding:10,border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:12,fontFamily:'monospace',outline:'none',boxSizing:'border-box',resize:'vertical',marginBottom:10}}/>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <button onClick={parse} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',color:'#6366f1',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Preview</button>
        {p.length>0&&<span style={{fontSize:11,fontWeight:700,color:'#16a34a',display:'flex',alignItems:'center',gap:4}}>{p.length} valid leads</span>}
      </div>
      {res&&<div style={{padding:10,background:'#dcfce7',borderRadius:8,marginBottom:14,fontSize:11,color:'#16a34a',fontWeight:700}}>{res.imported} imported</div>}
      <button onClick={upload} disabled={u||!p.length} style={{display:'flex',alignItems:'center',gap:5,padding:'12px 24px',borderRadius:10,border:'none',background:(u||!p.length)?'#cbd5e1':'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:13,fontWeight:800,cursor:(u||!p.length)?'default':'pointer',fontFamily:'Sora,sans-serif'}}><Upload size={14}/>{u?'Importing...':'Import '+p.length+' leads'}</button>
    </div></div>;
}

function BoostTab({emailStats,refresh,flash}) {
  var [buying,setBuying]=useState('');
  var packs=emailStats.boost_packs||[{id:'boost_1k',credits:1000,price:5,label:'1,000 Emails',desc:'Perfect for a targeted campaign'},{id:'boost_5k',credits:5000,price:19,label:'5,000 Emails',desc:'Run multiple sequences'},{id:'boost_10k',credits:10000,price:29,label:'10,000 Emails',desc:'Scale your outreach'},{id:'boost_50k',credits:50000,price:99,label:'50,000 Emails',desc:'Enterprise-level volume'}];
  function buy(pid){setBuying(pid);apiPost('/api/leads/buy-boost',{pack_id:pid}).then(function(r){setBuying('');flash('+'+(r.credits_added||0)+' email credits added');refresh();}).catch(function(e){setBuying('');flash(e.message,'err');});}

  return <div>
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px',marginBottom:16}}>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:12}}>Email Credits</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}><div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginBottom:4}}>Free today</div><div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#16a34a'}}>{emailStats.free_remaining||0}</div><div style={{fontSize:10,color:'#cbd5e1'}}>of {emailStats.daily_limit||200}</div></div>
        <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}><div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginBottom:4}}>Boost credits</div><div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#8b5cf6'}}>{(emailStats.boost_credits||0).toLocaleString()}</div></div>
        <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}><div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginBottom:4}}>Total available</div><div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0ea5e9'}}>{(emailStats.total_available||0).toLocaleString()}</div></div>
      </div>
    </div>
    <div style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,marginBottom:12}}>Buy Email Boost Packs</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
      {packs.map(function(pk){var ib=buying===pk.id;return <div key={pk.id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'18px 20px',display:'flex',flexDirection:'column'}}>
        <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:2}}>{(pk.label||'').replace(/[^\w\s,]/g,'')}</div>
        <div style={{fontSize:11,color:'#94a3b8',marginBottom:12,flex:1}}>{pk.desc}</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a'}}>${pk.price}</div>
          <button onClick={function(){buy(pk.id);}} disabled={ib} style={{padding:'8px 16px',borderRadius:8,border:'none',background:ib?'#cbd5e1':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:11,fontWeight:700,cursor:ib?'wait':'pointer',fontFamily:'inherit'}}>{ib?'Buying...':'Buy'}</button>
        </div>
      </div>;})}
    </div>
    <div style={{fontSize:11,color:'#94a3b8',marginTop:12,textAlign:'center'}}>Boost credits are paid from your wallet balance. Credits never expire.</div>
  </div>;
}
