import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/layout/AppLayout';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { Mail, UserPlus, Send, Upload, Trash2, Plus, Zap, Rocket, Search, Sparkles, HelpCircle } from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';
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
  unsubscribed:{bg:'#f1f5f9',color:'#64748b',label:'Unsubscribed'},
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
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .sl-tab{transition:all .15s;cursor:pointer}
        .sl-tab:hover{background:#f1f5f9!important}
        .sl-row{transition:background .1s}
        .sl-row:hover{background:#f8fafc!important}
        @media(max-width:767px){.sl-stats{grid-template-columns:1fr 1fr!important}}
        .sl-select{
          width:100%;padding:10px 36px 10px 14px;border-radius:10px;
          border:1.5px solid #e2e8f0;background:#fff;color:#0f172a;
          font-size:13px;font-family:inherit;font-weight:500;cursor:pointer;
          appearance:none;-webkit-appearance:none;-moz-appearance:none;
          background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2364748b%27 stroke-width=%272.5%27%3E%3Cpath d=%27M6 9l6 6 6-6%27/%3E%3C/svg%3E");
          background-repeat:no-repeat;background-position:right 12px center;
          transition:border-color .15s,box-shadow .15s;outline:none;
        }
        .sl-select:hover{border-color:#a5b4fc}
        .sl-select:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1)}
        .sl-select option{background:#fff;color:#0f172a;padding:8px}
      `}</style>

      <div style={{background:'#fff',borderRadius:14,padding:'24px 28px',marginBottom:20,border:'1px solid #e2e8f0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:800,color:'#0f172a',marginBottom:4}}>Contacts</div>
            <div style={{fontSize:14,color:'#64748b'}}>Manage your leads, email sequences, and broadcasts</div>
          </div>
          <button onClick={function(){setShowHelp(true);}} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 16px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}><HelpCircle size={14}/> Help</button>
        </div>
      </div>

      <div className="sl-stats" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[{v:stats.total||0,l:'Total leads',c:'#6366f1'},{v:sequences.length,l:'Sequences',c:'#0ea5e9'},{v:emailStats.sent_today||0,l:'Sent today',c:'#16a34a'},{v:stats.hot||0,l:'Hot leads',c:'#f59e0b'}].map(function(s,i){return <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'20px 16px'}}><div style={{fontSize:12,fontWeight:600,color:'#64748b',marginBottom:8}}>{s.l}</div><div style={{fontFamily:'Sora,sans-serif',fontSize:32,fontWeight:800,color:s.c}}>{s.v}</div></div>;})}
      </div>

      {msg && <div style={{padding:'10px 16px',borderRadius:10,marginBottom:16,fontSize:13,fontWeight:700,background:msgType==='ok'?'#f0fdf4':'#fef2f2',border:'1px solid '+(msgType==='ok'?'#bbf7d0':'#fecaca'),color:msgType==='ok'?'#059669':'#dc2626'}}>{msg}</div>}

      <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'2px solid #e2e8f0'}}>
        {TABS.map(function(t){var a=tab===t.key;var I=t.icon;return <div key={t.key} className={a?'':'sl-tab'} onClick={function(){setTab(t.key);}} style={{padding:'12px 20px',color:a?'#6366f1':'#64748b',fontSize:14,fontWeight:a?700:500,cursor:'pointer',display:'flex',alignItems:'center',gap:6,borderBottom:a?'2px solid #6366f1':'2px solid transparent',marginBottom:'-2px'}}><I size={16}/> {t.label}</div>;})}
      </div>

      {tab==='leads' && <LeadsTab leads={leads} lists={lists} sequences={sequences} refresh={refresh} flash={flash}/>}
      {tab==='sequences' && <SeqTab sequences={sequences} refresh={refresh} flash={flash}/>}
      {tab==='broadcast' && <BcastTab leads={leads} lists={lists} flash={flash}/>}
      {tab==='import' && <ImpTab stats={stats} lists={lists} sequences={sequences} refresh={refresh} flash={flash}/>}
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
        <CustomSelect value={fS} onChange={setFS} style={{width:160}} options={[{value:'all',label:'All statuses'},{value:'new',label:'New'},{value:'nurturing',label:'Nurturing'},{value:'hot',label:'Hot'},{value:'converted',label:'Converted'}]}/>
        <CustomSelect value={fL} onChange={setFL} style={{width:150}} options={[{value:'',label:'All lists'}].concat(lists.map(function(l){return {value:String(l.id),label:l.name};}))} />
        <div style={{position:'relative'}}><Search size={14} color="#94a3b8" style={{position:'absolute',left:10,top:10}}/><input value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="Search leads..." style={{padding:'8px 8px 8px 30px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',width:180,outline:'none',transition:'border-color .15s'}}/></div>
      </div>
      <div style={{fontSize:12,color:'#64748b',fontWeight:600}}>{filtered.length} leads</div>
    </div>
    {filtered.length>0?<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:600}}><thead><tr>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'#0f172a',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>CONTACT</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'#0f172a',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>EMAIL</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'#0f172a',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>STATUS</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'#0f172a',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>LIST</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'#0f172a',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>EMAILS</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'#0f172a',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>SEQUENCE</th>
      <th style={{textAlign:'right',padding:'14px 18px',borderBottom:'1px solid #e2e8f0'}}></th>
    </tr></thead><tbody>{filtered.map(function(l){var st=STATUS_STYLES[l.is_hot?'hot':l.status]||STATUS_STYLES.new;var li=lm[l.list_id];return <tr key={l.id} className="sl-row" style={{borderBottom:'1px solid #f1f5f9'}}>
      <td style={{padding:'14px 18px',fontWeight:600,color:'#0f172a',fontSize:14}}>{l.name||'—'}</td>
      <td style={{padding:'14px 18px',color:'#475569',fontSize:14}}>{l.email}</td>
      <td style={{padding:'14px 18px'}}><span style={{padding:'4px 10px',borderRadius:6,background:st.bg,color:st.color,fontSize:12,fontWeight:600}}>{st.label}</span></td>
      <td style={{padding:'14px 18px'}}>{li?<span style={{padding:'4px 10px',borderRadius:6,background:li.color+'18',color:li.color,fontSize:12,fontWeight:600}}>{li.name}</span>:<span style={{color:'#94a3b8',fontSize:12}}>—</span>}</td>
      <td style={{padding:'14px 18px',color:'#475569',fontSize:14}}>{l.emails_sent||0} sent</td>
      <td style={{padding:'14px 18px'}}><CustomSelect value={String(l.sequence_id||'')} onChange={function(v){assignSeq(l.id,v);}} small={true} style={{maxWidth:140}} options={[{value:'',label:'None'}].concat(sequences.map(function(s){return {value:String(s.id),label:s.title};}))}/></td>
      <td style={{padding:'14px 18px',textAlign:'right'}}><button onClick={function(){del(l.id);}} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}><Trash2 size={12}/></button></td>
    </tr>;})}</tbody></table></div>
    :<div style={{textAlign:'center',padding:'60px 20px'}}><UserPlus size={32} color="#cbd5e1" style={{marginBottom:8}}/><div style={{fontSize:14,fontWeight:700,color:'#64748b'}}>No leads yet</div><div style={{fontSize:12,color:'#94a3b8',marginTop:4}}>Leads are captured from your SuperPages funnel forms</div></div>}
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
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800}}>{ed==='new'?'Create':'Edit'} Sequence</div><button onClick={function(){setEd(null);}} style={{fontSize:12,color:'#64748b',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Cancel</button></div>
    <div style={{padding:'20px 24px'}}>
      <div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Sequence name</label><input value={t} onChange={function(e){setT(e.target.value);}} placeholder="e.g. Fitness Welcome Series" style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      {em.map(function(e,i){var color=TC[i%TC.length];return <div key={i} style={{background:'#f8f9fb',borderRadius:12,padding:16,marginBottom:10,border:'1px solid #e8ecf2',borderLeft:'3px solid '+color}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontSize:12,fontWeight:800,color:color}}>Email {i+1}</span><div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{fontSize:10,color:'#64748b'}}>after</span><input type="number" min="0" value={e.send_delay_days} onChange={function(ev){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{send_delay_days:parseInt(ev.target.value)||0}):x;}));}} style={{width:45,padding:4,border:'1px solid #e2e8f0',borderRadius:5,fontSize:11,textAlign:'center'}}/><span style={{fontSize:10,color:'#64748b'}}>days</span>{em.length>1&&<button onClick={function(){setEm(em.filter(function(x,j){return j!==i;}));}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer',padding:2}}><Trash2 size={12}/></button>}</div></div>
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
        <div><div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{sq.title}</div><div style={{fontSize:11,color:'#64748b',marginTop:2}}>{sq.num_emails} emails</div></div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <span style={{padding:'4px 10px',borderRadius:6,background:sq.is_active?'#f0fdf4':'#f1f5f9',color:sq.is_active?'#059669':'#94a3b8',fontSize:10,fontWeight:700}}>{sq.is_active?'Active':'Paused'}</span>
          <button onClick={function(){sendNext(sq.id);}} style={{padding:'4px 12px',borderRadius:6,border:'none',background:'#16a34a',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Send Next</button>
          <button onClick={function(){editEx(sq);}} style={{padding:'4px 12px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
          <button onClick={function(){delSeq(sq.id);}} style={{padding:'4px 12px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
        </div>
      </div>
      {se.length>0&&<div style={{padding:'18px 20px',display:'flex',alignItems:'center',overflowX:'auto'}}>{se.map(function(e,i){var c=TC[i%TC.length];var last=i===se.length-1;return <div key={i} style={{display:'flex',alignItems:'center',flex:last?'0 0 auto':1}}>
        <div style={{textAlign:'center',minWidth:80}}>
          <div style={{width:36,height:36,borderRadius:10,background:c,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px'}}><Mail size={16} color="#fff"/></div>
          <div style={{fontSize:11,fontWeight:700,color:'#0f172a',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.subject||'Email '+(i+1)}</div>
          <div style={{fontSize:10,color:'#64748b'}}>Day {e.send_delay_days||0}</div>
        </div>
        {!last&&<div style={{flex:1,height:2,background:'#e2e8f0',margin:'0 4px',marginBottom:24}}/>}
      </div>;})}</div>}
    </div>;}):<div style={{textAlign:'center',padding:'60px 20px',background:'#fff',borderRadius:14,border:'1px solid #e2e8f0'}}><Zap size={32} color="#cbd5e1" style={{marginBottom:8}}/><div style={{fontSize:14,fontWeight:700,color:'#64748b'}}>No sequences yet</div><div style={{fontSize:12,color:'#94a3b8',marginTop:4}}>Create a sequence to start nurturing your leads automatically</div></div>}
  </div>;
}

function BcastTab({leads,lists,flash}) {
  var [sub,setSub]=useState('');var [html,setHtml]=useState('');var [fS,setFS]=useState('all');var [fL,setFL]=useState('');var [s,setS]=useState(false);var [sent,setSent]=useState(null);
  var ct=leads.filter(function(l){if(l.status==='unsubscribed')return false;if(fL&&l.list_id!==parseInt(fL))return false;if(fS!=='all'){if(fS==='hot')return l.is_hot;return l.status===fS;}return true;}).length;
  function send(){if(!sub.trim()){flash('Subject required','err');return;}setS(true);apiPost('/api/leads/broadcast',{subject:sub,html_content:html,filter_status:fS,list_id:fL?parseInt(fL):null}).then(function(r){setS(false);setSent(r.sent||0);flash('Broadcast sent to '+(r.sent||0)+' leads');}).catch(function(e){setS(false);flash(e.message,'err');});}

  return <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f5f9'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:4}}>Broadcast</div><div style={{fontSize:12,color:'#64748b'}}>Send a one-off email to your leads</div></div>
    <div style={{padding:'20px 24px'}}>
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:4}}>List</label><CustomSelect value={fL} onChange={setFL} options={[{value:'',label:'All lists'}].concat(lists.map(function(l){return {value:String(l.id),label:l.name};}))}/></div>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:4}}>Status</label><CustomSelect value={fS} onChange={setFS} options={[{value:'all',label:'All'},{value:'new',label:'New'},{value:'nurturing',label:'Nurturing'},{value:'hot',label:'Hot'}]}/></div>
        <div style={{display:'flex',alignItems:'flex-end',paddingBottom:2}}><span style={{fontSize:14,fontWeight:800,color:'#6366f1'}}>{ct} recipients</span></div>
      </div>
      <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:4}}>Subject</label><input value={sub} onChange={function(e){setSub(e.target.value);}} style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:4}}>Content</label><RichTextEditor content={html} onChange={setHtml} placeholder="Write your broadcast email..."/></div>
      <button onClick={send} disabled={s} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 24px',borderRadius:10,border:'none',background:s?'#cbd5e1':'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',fontSize:13,fontWeight:800,cursor:s?'default':'pointer',fontFamily:'Sora,sans-serif'}}><Send size={14}/>{s?'Sending...':'Send to '+ct}</button>
      {sent!==null&&<div style={{marginTop:10,fontSize:12,fontWeight:700,color:'#16a34a'}}>Sent to {sent} leads</div>}
    </div></div>;
}

function ImpTab({stats,lists,sequences,refresh,flash}) {
  var [csv,setCsv]=useState('');var [parsed,setParsed]=useState([]);var [uploading,setUploading]=useState(false);var [result,setResult]=useState(null);
  var [listId,setListId]=useState('');var [seqId,setSeqId]=useState('');var [impStatus,setImpStatus]=useState('new');var [source,setSource]=useState('');

  function parse() {
    var lines = csv.trim().split('\n');
    var out = [];
    var emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      // Handle comma, semicolon, or tab delimited
      var parts = line.split(/[,;\t]/);
      var email = (parts[0] || '').trim().toLowerCase();
      if (email && emailRegex.test(email)) {
        out.push({ email: email, name: (parts[1] || '').trim() });
      }
    }
    setParsed(out);
  }

  function upload() {
    if (!parsed.length) return;
    setUploading(true);
    apiPost('/api/leads/upload-csv', {
      leads: parsed,
      list_id: listId ? parseInt(listId) : null,
      sequence_id: seqId ? parseInt(seqId) : null,
      status: impStatus,
      source: source.trim() || 'CSV Import',
    }).then(function(r) {
      setUploading(false); setResult(r);
      flash('+' + r.imported + ' imported' + (r.duplicates ? ', ' + r.duplicates + ' duplicates skipped' : ''));
      refresh();
    }).catch(function(e) { setUploading(false); flash(e.message, 'err'); });
  }

  return <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
    <div style={{padding:'20px 24px',borderBottom:'1px solid #f1f5f9'}}>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,marginBottom:4}}>Import Leads</div>
      <div style={{fontSize:13,color:'#475569'}}>Upload leads from CSV, another autoresponder, or paste manually. Supports comma, semicolon, and tab delimited formats.</div>
    </div>
    <div style={{padding:'20px 24px'}}>
      {/* Lead count + capacity */}
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        <div style={{flex:1,background:'rgba(99,102,241,.04)',border:'1px solid rgba(99,102,241,.12)',borderRadius:10,padding:'14px 16px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#6366f1'}}>Current leads</div>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#6366f1'}}>{stats.total||0}<span style={{fontSize:13,color:'#475569',fontWeight:500}}> / {stats.limit||5000}</span></div>
          <div style={{width:'100%',height:4,background:'#e2e8f0',borderRadius:2,marginTop:8}}><div style={{height:4,background:'#6366f1',borderRadius:2,width:Math.min(100,((stats.total||0)/(stats.limit||5000))*100)+'%'}}/></div>
        </div>
      </div>

      {/* Import settings */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
        <div><label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Assign to list</label><CustomSelect value={listId} onChange={setListId} options={[{value:'',label:'No list (unsorted)'}].concat(lists.map(function(l){return {value:String(l.id),label:l.name};}))}/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Auto-assign sequence</label><CustomSelect value={seqId} onChange={setSeqId} options={[{value:'',label:'No sequence'}].concat(sequences.map(function(s){return {value:String(s.id),label:s.title};}))}/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Import as status</label><CustomSelect value={impStatus} onChange={setImpStatus} options={[{value:'new',label:'New'},{value:'hot',label:'Hot'},{value:'nurturing',label:'Nurturing'}]}/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>Source label</label><input value={source} onChange={function(e){setSource(e.target.value);}} placeholder="e.g. Mailchimp export, Facebook ads" style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      </div>

      {/* Upload area */}
      <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:32,borderRadius:12,border:'2px dashed #d1d5db',cursor:'pointer',marginBottom:12,transition:'border-color .15s,background .15s',background:'#fafbfc'}} onMouseEnter={function(e){e.currentTarget.style.borderColor='#6366f1';e.currentTarget.style.background='#f5f3ff';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';e.currentTarget.style.background='#fafbfc';}}>
        <Upload size={28} color="#6366f1"/>
        <span style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>Upload CSV file</span>
        <span style={{fontSize:12,color:'#64748b'}}>or paste email addresses below</span>
        <input type="file" accept=".csv,.txt,.tsv" onChange={function(e){var f=e.target.files[0];if(f){var rd=new FileReader();rd.onload=function(ev){setCsv(ev.target.result);setParsed([]);setResult(null);};rd.readAsText(f);}}} style={{display:'none'}}/>
      </label>

      <textarea value={csv} onChange={function(e){setCsv(e.target.value);setParsed([]);setResult(null);}} rows={5} placeholder={"email,name\njohn@example.com,John Smith\nsarah@example.com,Sarah Jones"} style={{width:'100%',padding:'12px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:12,fontFamily:'monospace',outline:'none',boxSizing:'border-box',resize:'vertical',marginBottom:12}}/>

      {/* Preview + Import buttons */}
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
        <button onClick={parse} style={{padding:'10px 20px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'#fff',color:'#6366f1',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Preview & Validate</button>
        {parsed.length>0 && <span style={{fontSize:12,fontWeight:700,color:'#16a34a'}}>{parsed.length} valid emails found</span>}
      </div>

      {/* Preview table */}
      {parsed.length>0 && <div style={{background:'#f8fafc',borderRadius:10,border:'1px solid #e2e8f0',marginBottom:16,maxHeight:200,overflowY:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead><tr><th style={{textAlign:'left',padding:'8px 14px',fontWeight:700,color:'#475569',fontSize:11,borderBottom:'1px solid #e2e8f0'}}>Email</th><th style={{textAlign:'left',padding:'8px 14px',fontWeight:700,color:'#475569',fontSize:11,borderBottom:'1px solid #e2e8f0'}}>Name</th></tr></thead>
          <tbody>{parsed.slice(0,20).map(function(l,i){return <tr key={i} style={{borderTop:i>0?'1px solid #f1f5f9':'none'}}><td style={{padding:'6px 14px',color:'#0f172a'}}>{l.email}</td><td style={{padding:'6px 14px',color:'#475569'}}>{l.name||'—'}</td></tr>;})}</tbody>
        </table>
        {parsed.length>20 && <div style={{padding:'8px 14px',fontSize:11,color:'#64748b',borderTop:'1px solid #e2e8f0'}}>...and {parsed.length-20} more</div>}
      </div>}

      {/* Results */}
      {result && <div style={{padding:'14px 18px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:'#059669',marginBottom:6}}>{result.imported} leads imported successfully</div>
        <div style={{fontSize:12,color:'#475569',lineHeight:1.8}}>
          {result.duplicates>0 && <div>{result.duplicates} duplicates skipped</div>}
          {result.invalid_emails>0 && <div>{result.invalid_emails} invalid emails rejected</div>}
          {result.disposable_blocked>0 && <div>{result.disposable_blocked} disposable emails blocked</div>}
          {result.skipped_over_limit>0 && <div>{result.skipped_over_limit} skipped (over lead limit)</div>}
        </div>
      </div>}

      <button onClick={upload} disabled={uploading||!parsed.length}
        style={{display:'flex',alignItems:'center',gap:6,padding:'14px 28px',borderRadius:10,border:'none',background:(uploading||!parsed.length)?'#cbd5e1':'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:14,fontWeight:800,cursor:(uploading||!parsed.length)?'default':'pointer',fontFamily:'Sora,sans-serif'}}>
        <Upload size={16}/>{uploading?'Importing...':'Import '+parsed.length+' leads'}
      </button>

      {/* Format help */}
      <div style={{marginTop:20,padding:'14px 18px',background:'#f8fafc',borderRadius:10,border:'1px solid #f1f5f9'}}>
        <div style={{fontSize:12,fontWeight:700,color:'#475569',marginBottom:6}}>Accepted formats</div>
        <div style={{fontSize:12,color:'#64748b',lineHeight:1.8}}>
          CSV from Mailchimp, AWeber, ConvertKit, ActiveCampaign, or any email platform. Format: <code style={{background:'#e2e8f0',padding:'2px 6px',borderRadius:4,fontSize:11}}>email,name</code> (one per line). Comma, semicolon, and tab delimiters supported. Disposable email addresses are automatically filtered.
        </div>
      </div>
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
        <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}><div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Free today</div><div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#16a34a'}}>{emailStats.free_remaining||0}</div><div style={{fontSize:10,color:'#94a3b8'}}>of {emailStats.daily_limit||200}</div></div>
        <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}><div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Boost credits</div><div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#8b5cf6'}}>{(emailStats.boost_credits||0).toLocaleString()}</div></div>
        <div style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px',textAlign:'center'}}><div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4}}>Total available</div><div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0ea5e9'}}>{(emailStats.total_available||0).toLocaleString()}</div></div>
      </div>
    </div>
    <div style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,marginBottom:12}}>Buy Email Boost Packs</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
      {packs.map(function(pk){var ib=buying===pk.id;return <div key={pk.id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'18px 20px',display:'flex',flexDirection:'column'}}>
        <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:2}}>{(pk.label||'').replace(/[^\w\s,]/g,'')}</div>
        <div style={{fontSize:11,color:'#64748b',marginBottom:12,flex:1}}>{pk.desc}</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a'}}>${pk.price}</div>
          <button onClick={function(){buy(pk.id);}} disabled={ib} style={{padding:'8px 16px',borderRadius:8,border:'none',background:ib?'#cbd5e1':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:11,fontWeight:700,cursor:ib?'wait':'pointer',fontFamily:'inherit'}}>{ib?'Buying...':'Buy'}</button>
        </div>
      </div>;})}
    </div>
    <div style={{fontSize:11,color:'#64748b',marginTop:12,textAlign:'center'}}>Boost credits are paid from your wallet balance. Credits never expire.</div>
  </div>;
}
