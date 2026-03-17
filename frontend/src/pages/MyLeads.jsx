import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { Mail, Flame, UserPlus, Send, Upload, Trash2, Plus, CheckCircle, AlertTriangle, X, Zap, FolderOpen, Tag, Edit3, Rocket } from 'lucide-react';

var TABS = [{key:'leads',label:'Leads',icon:UserPlus},{key:'lists',label:'Lists',icon:FolderOpen},{key:'sequences',label:'Sequences',icon:Zap},{key:'broadcast',label:'Broadcast',icon:Send},{key:'upload',label:'Import',icon:Upload},{key:'boost',label:'Email Boost',icon:Rocket}];
var LIST_COLORS = ['#0ea5e9','#8b5cf6','#ef4444','#16a34a','#f59e0b','#ec4899','#06b6d4','#6366f1'];

export default function MyLeads() {
  var [tab, setTab] = useState('leads');
  var [leads, setLeads] = useState([]);
  var [lists, setLists] = useState([]);
  var [sequences, setSequences] = useState([]);
  var [stats, setStats] = useState({});
  var [emailStats, setEmailStats] = useState({});
  var [loading, setLoading] = useState(true);
  var [toast, setToast] = useState(null);
  function showToast(m,t){setToast({m,t});setTimeout(function(){setToast(null);},3000);}

  function loadAll(){
    Promise.all([
      apiGet('/api/leads').catch(function(){return {leads:[]};}),
      apiGet('/api/leads/lists').catch(function(){return {lists:[]};}),
      apiGet('/api/leads/sequences').catch(function(){return {sequences:[]};}),
      apiGet('/api/leads/stats').catch(function(){return {};}),
      apiGet('/api/leads/email-stats').catch(function(){return {};})
    ]).then(function(r){setLeads(r[0].leads||[]);setLists(r[1].lists||[]);setSequences(r[2].sequences||[]);setStats(r[3]);setEmailStats(r[4]);setLoading(false);});
  }
  useEffect(loadAll,[]);

  if(loading) return <AppLayout title="My Leads" subtitle="CRM & Autoresponder"><Spin/></AppLayout>;

  var dailyPct = emailStats.daily_limit ? Math.min(100, Math.round(((emailStats.sent_today||0) / emailStats.daily_limit) * 100)) : 0;

  return(
    <AppLayout title="My Leads" subtitle="CRM & Autoresponder">
      {toast&&<div style={{padding:'10px 16px',borderRadius:10,marginBottom:14,fontSize:13,fontWeight:700,background:toast.t==='ok'?'#dcfce7':'#fef2f2',color:toast.t==='ok'?'#16a34a':'#dc2626',display:'flex',alignItems:'center',gap:6}}>{toast.t==='ok'?<CheckCircle size={14}/>:<AlertTriangle size={14}/>}{toast.m}</div>}

      {/* Email usage bar */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'14px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:20}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <span style={{fontSize:11,fontWeight:700,color:'#334155'}}>Daily Emails: {emailStats.sent_today||0} / {emailStats.daily_limit||200}</span>
            <span style={{fontSize:10,color:'#94a3b8'}}>{emailStats.free_remaining||0} free remaining today</span>
          </div>
          <div style={{height:6,borderRadius:3,background:'#e8ecf2',overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:3,background:dailyPct>80?'#ef4444':dailyPct>50?'#f59e0b':'#0ea5e9',width:dailyPct+'%',transition:'width .3s'}}/>
          </div>
        </div>
        <div style={{borderLeft:'1px solid #e8ecf2',paddingLeft:20,textAlign:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#8b5cf6'}}>{emailStats.boost_credits||0}</div>
          <div style={{fontSize:9,fontWeight:700,color:'#94a3b8'}}>Boost Credits</div>
        </div>
        <button onClick={function(){setTab('boost');}} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 10px rgba(139,92,246,.2)',whiteSpace:'nowrap'}}>
          <Rocket size={12} style={{verticalAlign:'middle',marginRight:4}}/>Buy Boost
        </button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        {[{v:stats.total||0,l:'Total Leads',c:'#0ea5e9',i:UserPlus},{v:stats.hot||0,l:'Hot Leads',c:'#ef4444',i:Flame},{v:lists.length,l:'Lists',c:'#8b5cf6',i:FolderOpen},{v:sequences.length,l:'Sequences',c:'#f59e0b',i:Zap},{v:(stats.remaining||0)+'/'+(stats.limit||100),l:'Remaining',c:'#16a34a',i:CheckCircle}].map(function(s,i){var I=s.i;return(
          <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'14px 16px',position:'relative'}}>
            <div style={{position:'absolute',top:10,right:10,width:26,height:26,borderRadius:6,background:s.c+'10',display:'flex',alignItems:'center',justifyContent:'center'}}><I size={13} color={s.c}/></div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginTop:2}}>{s.l}</div>
          </div>);})}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:20}}>
        {TABS.map(function(t){var on=tab===t.key;var I=t.icon;return(
          <button key={t.key} onClick={function(){setTab(t.key);}} style={{display:'flex',alignItems:'center',gap:5,padding:'9px 16px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:on?800:600,border:on?'2px solid #0ea5e9':'2px solid #e8ecf2',background:on?'rgba(14,165,233,.04)':'#fff',color:on?'#0ea5e9':'#64748b'}}><I size={13}/>{t.label}</button>);})}
      </div>

      {tab==='leads'&&<LeadsTab leads={leads} lists={lists} sequences={sequences} onReload={loadAll} showToast={showToast}/>}
      {tab==='lists'&&<ListsTab lists={lists} sequences={sequences} onReload={loadAll} showToast={showToast}/>}
      {tab==='sequences'&&<SequencesTab sequences={sequences} onReload={loadAll} showToast={showToast}/>}
      {tab==='broadcast'&&<BroadcastTab leads={leads} lists={lists} showToast={showToast}/>}
      {tab==='upload'&&<UploadTab stats={stats} lists={lists} onReload={loadAll} showToast={showToast}/>}
      {tab==='boost'&&<BoostTab emailStats={emailStats} onReload={loadAll} showToast={showToast}/>}
    </AppLayout>
  );
}

// ═══════════════ LEADS TABLE ═══════════════
function LeadsTab({leads,lists,sequences,onReload,showToast}){
  var [filterStatus,setFilterStatus]=useState('all');
  var [filterList,setFilterList]=useState('all');

  var filtered=leads.filter(function(l){
    if(filterStatus!=='all'){if(filterStatus==='hot'){if(!l.is_hot)return false;}else{if(l.status!==filterStatus)return false;}}
    if(filterList!=='all'){if(filterList==='unsorted'){if(l.list_id)return false;}else{if(l.list_id!==parseInt(filterList))return false;}}
    return true;
  });

  function deleteLead(id){apiDelete('/api/leads/'+id).then(function(){onReload();});}
  function assignSeq(leadId,seqId){apiPost('/api/leads/'+leadId+'/assign-sequence',{sequence_id:seqId||null}).then(function(){showToast('Updated','ok');onReload();});}

  var listMap={};lists.forEach(function(l){listMap[l.id]=l;});

  return(
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
      {/* Filters */}
      <div style={{padding:'12px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {['all','new','nurturing','hot','converted'].map(function(f){var on=filterStatus===f;return(
            <button key={f} onClick={function(){setFilterStatus(f);}} style={{padding:'5px 10px',borderRadius:6,fontSize:10,fontWeight:700,fontFamily:'inherit',cursor:'pointer',border:on?'1px solid #0ea5e9':'1px solid #e8ecf2',background:on?'rgba(14,165,233,.06)':'transparent',color:on?'#0ea5e9':'#94a3b8',textTransform:'capitalize'}}>{f==='hot'?'🔥 Hot':f}</button>);})}
        </div>
        <select value={filterList} onChange={function(e){setFilterList(e.target.value);}} style={{padding:'5px 10px',borderRadius:6,fontSize:11,border:'1px solid #e8ecf2',fontFamily:'inherit',color:'#64748b',background:'#fff'}}>
          <option value="all">All Lists</option>
          <option value="unsorted">Unsorted</option>
          {lists.map(function(l){return <option key={l.id} value={l.id}>{l.name} ({l.lead_count})</option>;})}
        </select>
      </div>

      <div style={{padding:'6px 18px',borderBottom:'1px solid #f1f5f9',fontSize:11,color:'#94a3b8'}}>{filtered.length} leads</div>

      {filtered.length>0?(
        <div style={{maxHeight:480,overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>
              {['Lead','List','Status','Emails','Sequence','Actions'].map(function(h){return <th key={h} style={{fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.8,padding:'9px 12px',borderBottom:'2px solid #e8ecf2',textAlign:'left',background:'#f8f9fb'}}>{h}</th>;})}
            </tr></thead>
            <tbody>
              {filtered.map(function(l){
                var lst=listMap[l.list_id];
                return(
                <tr key={l.id} style={{transition:'background .1s'}} onMouseEnter={function(e){e.currentTarget.style.background='#fafbfc';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';}}>
                  <td style={{padding:'9px 12px',borderBottom:'1px solid #f5f6f8'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>{l.is_hot&&<Flame size={11} color="#ef4444"/>}<div><div style={{fontSize:12,fontWeight:600,color:'#0f172a'}}>{l.name||l.email}</div>{l.name&&<div style={{fontSize:9,color:'#94a3b8'}}>{l.email}</div>}</div></div>
                  </td>
                  <td style={{padding:'9px 12px',borderBottom:'1px solid #f5f6f8'}}>
                    {lst?<span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:lst.color+'15',color:lst.color,whiteSpace:'nowrap'}}>{lst.name}</span>:<span style={{fontSize:9,color:'#cbd5e1'}}>—</span>}
                  </td>
                  <td style={{padding:'9px 12px',borderBottom:'1px solid #f5f6f8'}}>
                    <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:5,textTransform:'capitalize',background:l.is_hot?'#fef2f2':l.status==='nurturing'?'rgba(139,92,246,.08)':l.status==='converted'?'#dcfce7':'rgba(14,165,233,.08)',color:l.is_hot?'#ef4444':l.status==='nurturing'?'#8b5cf6':l.status==='converted'?'#16a34a':'#0ea5e9'}}>{l.is_hot?'hot':l.status||'new'}</span>
                  </td>
                  <td style={{padding:'9px 12px',borderBottom:'1px solid #f5f6f8',fontSize:10,color:'#64748b'}}>{l.emails_sent||0}↑ {l.emails_opened||0}👁</td>
                  <td style={{padding:'9px 12px',borderBottom:'1px solid #f5f6f8'}}>
                    <select value={l.sequence_id||''} onChange={function(e){assignSeq(l.id,e.target.value?parseInt(e.target.value):null);}} style={{fontSize:9,padding:'3px 5px',borderRadius:4,border:'1px solid #e8ecf2',fontFamily:'inherit',color:'#64748b',background:'#fff',maxWidth:120}}>
                      <option value="">None</option>
                      {sequences.map(function(s){return <option key={s.id} value={s.id}>{s.title}</option>;})}
                    </select>
                  </td>
                  <td style={{padding:'9px 12px',borderBottom:'1px solid #f5f6f8'}}><button onClick={function(){deleteLead(l.id);}} style={{fontSize:9,color:'#dc2626',background:'none',border:'none',cursor:'pointer',opacity:.5}} onMouseEnter={function(e){e.currentTarget.style.opacity=1;}} onMouseLeave={function(e){e.currentTarget.style.opacity=.5;}}><Trash2 size={11}/></button></td>
                </tr>);})}
            </tbody>
          </table>
        </div>
      ):(
        <div style={{textAlign:'center',padding:'50px 20px'}}><div style={{fontSize:36,opacity:.2,marginBottom:6}}>📧</div><div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>No leads found</div><div style={{fontSize:11,color:'#94a3b8'}}>Capture from SuperPages or import CSV</div></div>
      )}
    </div>
  );
}

// ═══════════════ LISTS ═══════════════
function ListsTab({lists,sequences,onReload,showToast}){
  var [creating,setCreating]=useState(false);
  var [editing,setEditing]=useState(null);
  var [name,setName]=useState('');
  var [desc,setDesc]=useState('');
  var [color,setColor]=useState('#0ea5e9');
  var [seqId,setSeqId]=useState('');

  function startCreate(){setCreating(true);setEditing(null);setName('');setDesc('');setColor('#0ea5e9');setSeqId('');}
  function startEdit(l){setEditing(l.id);setCreating(false);setName(l.name);setDesc(l.description);setColor(l.color||'#0ea5e9');setSeqId(l.sequence_id||'');}
  function cancel(){setCreating(false);setEditing(null);}

  function save(){
    if(!name.trim()){showToast('List name required','err');return;}
    var data={name:name.trim(),description:desc.trim(),color:color,sequence_id:seqId?parseInt(seqId):null};
    var promise=editing?apiPut('/api/leads/lists/'+editing,data):apiPost('/api/leads/lists',data);
    promise.then(function(){showToast(editing?'List updated':'List created','ok');cancel();onReload();}).catch(function(e){showToast(e.message||'Failed','err');});
  }
  function deleteList(id){if(!confirm('Delete this list? Leads will move to unsorted.'))return;apiDelete('/api/leads/lists/'+id).then(function(){onReload();});}

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>Lead Lists</h3>
        <button onClick={startCreate} style={{display:'flex',alignItems:'center',gap:4,padding:'9px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Plus size={14}/>New List</button>
      </div>

      {/* Create/Edit form */}
      {(creating||editing)&&(
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'20px 24px',marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <span style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{editing?'Edit List':'New List'}</span>
            <button onClick={cancel} style={{fontSize:11,color:'#94a3b8',background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>List Name</label><input value={name} onChange={function(e){setName(e.target.value);}} placeholder="e.g. Facebook Fitness Leads" style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} onFocus={function(e){e.target.style.borderColor='#8b5cf6';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/></div>
            <div><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Description</label><input value={desc} onChange={function(e){setDesc(e.target.value);}} placeholder="Optional description" style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'end',marginBottom:14}}>
            <div><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Colour</label>
              <div style={{display:'flex',gap:4}}>{LIST_COLORS.map(function(c){return <button key={c} onClick={function(){setColor(c);}} style={{width:24,height:24,borderRadius:6,background:c,border:color===c?'2px solid #0f172a':'2px solid transparent',cursor:'pointer'}}/>;})}</div>
            </div>
            <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Default Sequence</label>
              <select value={seqId} onChange={function(e){setSeqId(e.target.value);}} style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:12,fontFamily:'inherit',background:'#fff'}}>
                <option value="">None</option>
                {sequences.map(function(s){return <option key={s.id} value={s.id}>{s.title}</option>;})}
              </select>
            </div>
          </div>
          <button onClick={save} style={{padding:'10px 24px',borderRadius:8,border:'none',background:'#8b5cf6',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{editing?'Save Changes':'Create List'}</button>
        </div>
      )}

      {/* Lists grid */}
      {lists.length>0?(
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {lists.map(function(l){return(
            <div key={l.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'18px',position:'relative'}}>
              <div style={{width:6,height:'100%',borderRadius:'3px 0 0 3px',background:l.color||'#0ea5e9',position:'absolute',left:0,top:0}}/>
              <div style={{paddingLeft:8}}>
                <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:2}}>{l.name}</div>
                {l.description&&<div style={{fontSize:11,color:'#94a3b8',marginBottom:6}}>{l.description}</div>}
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
                  <span style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:l.color||'#0ea5e9'}}>{l.lead_count}</span>
                  <span style={{fontSize:10,color:'#94a3b8'}}>leads</span>
                </div>
                <div style={{display:'flex',gap:4}}>
                  <button onClick={function(){startEdit(l);}} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:'#64748b',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Edit3 size={10}/> Edit</button>
                  <button onClick={function(){deleteList(l.id);}} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Trash2 size={10}/> Delete</button>
                </div>
              </div>
            </div>);})}
        </div>
      ):(
        <div style={{textAlign:'center',padding:'50px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}><div style={{fontSize:36,opacity:.2,marginBottom:6}}>📁</div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>No lists yet</div><div style={{fontSize:12,color:'#94a3b8'}}>Create lists to organize leads by campaign or source</div></div>
      )}
    </div>
  );
}

// ═══════════════ SEQUENCES ═══════════════
function SequencesTab({sequences,onReload,showToast}){
  var [editing,setEditing]=useState(null);
  var [title,setTitle]=useState('');
  var [emails,setEmails]=useState([{subject:'',body_html:'',send_delay_days:0}]);

  function startNew(){setEditing('new');setTitle('');setEmails([{subject:'Welcome!',body_html:'',send_delay_days:0},{subject:'Follow up',body_html:'',send_delay_days:2},{subject:'Last chance',body_html:'',send_delay_days:5}]);}
  function startEdit(s){setEditing(s.id);setTitle(s.title);setEmails(s.emails||[{subject:'',body_html:'',send_delay_days:0}]);}

  function saveSequence(){
    if(!title.trim()){showToast('Title required','err');return;}
    var valid=emails.filter(function(e){return e.subject.trim();});
    if(!valid.length){showToast('At least 1 email required','err');return;}
    (editing==='new'?apiPost('/api/leads/sequences',{title:title,emails:valid}):apiPut('/api/leads/sequences/'+editing,{title:title,emails:valid})).then(function(){showToast('Saved','ok');setEditing(null);onReload();}).catch(function(e){showToast(e.message||'Failed','err');});
  }
  function deleteSeq(id){if(!confirm('Delete?'))return;apiDelete('/api/leads/sequences/'+id).then(onReload);}
  function sendNext(id){apiPost('/api/leads/send-sequence-email',{sequence_id:id}).then(function(r){showToast('Sent '+r.sent+' emails','ok');onReload();}).catch(function(e){showToast(e.message||'Failed','err');});}

  if(editing!==null) return(
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
      <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f3f7',display:'flex',justifyContent:'space-between',alignItems:'center'}}><h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:0}}>{editing==='new'?'Create Sequence':'Edit Sequence'}</h3><button onClick={function(){setEditing(null);}} style={{fontSize:11,color:'#94a3b8',background:'none',border:'none',cursor:'pointer'}}>Cancel</button></div>
      <div style={{padding:'20px 24px'}}>
        <div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:700,color:'#334155',display:'block',marginBottom:6}}>Sequence Name</label><input value={title} onChange={function(e){setTitle(e.target.value);}} placeholder="e.g. Welcome Series" style={{width:'100%',padding:'11px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/></div>

        {emails.map(function(em,i){return(
          <div key={i} style={{background:'#f8f9fb',borderRadius:12,padding:'16px',marginBottom:10,border:'1px solid #e8ecf2'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:800,color:'#0ea5e9'}}>Email {i+1}</span>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:10,color:'#94a3b8'}}>after</span>
                <input type="number" min="0" value={em.send_delay_days} onChange={function(e){setEmails(emails.map(function(x,j){return j===i?Object.assign({},x,{send_delay_days:parseInt(e.target.value)||0}):x;}));}} style={{width:45,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:5,fontSize:11,textAlign:'center',fontFamily:'inherit'}}/>
                <span style={{fontSize:10,color:'#94a3b8'}}>days</span>
                {emails.length>1&&<button onClick={function(){setEmails(emails.filter(function(x,j){return j!==i;}));}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer'}}><Trash2 size={11}/></button>}
              </div>
            </div>
            <input value={em.subject} onChange={function(e){setEmails(emails.map(function(x,j){return j===i?Object.assign({},x,{subject:e.target.value}):x;}));}} placeholder="Subject line" style={{width:'100%',padding:'9px 12px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:8,background:'#fff'}}/>
            <RichTextEditor content={em.body_html} onChange={function(html){setEmails(emails.map(function(x,j){return j===i?Object.assign({},x,{body_html:html}):x;}));}} placeholder="Email body..."/>
          </div>);})}

        <button onClick={function(){setEmails(emails.concat([{subject:'',body_html:'',send_delay_days:(emails[emails.length-1]||{}).send_delay_days+3||3}]));}} style={{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',borderRadius:8,border:'1.5px solid #e8ecf2',background:'#fff',color:'#0ea5e9',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:16}}><Plus size={11}/>Add Email</button>
        <button onClick={saveSequence} style={{padding:'11px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif'}}><CheckCircle size={13} style={{verticalAlign:'middle',marginRight:4}}/>Save Sequence</button>
      </div>
    </div>);

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>Email Sequences</h3><button onClick={startNew} style={{display:'flex',alignItems:'center',gap:4,padding:'9px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Plus size={14}/>Create Sequence</button></div>
      {sequences.length>0?sequences.map(function(s){return(
        <div key={s.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'16px 18px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{s.title}</div><div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{s.num_emails} emails · {s.is_active?'Active':'Paused'}</div></div>
          <div style={{display:'flex',gap:5}}>
            <button onClick={function(){sendNext(s.id);}} style={{padding:'5px 12px',borderRadius:6,border:'none',background:'#16a34a',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Send Next</button>
            <button onClick={function(){startEdit(s);}} style={{padding:'5px 12px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:'#64748b',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
            <button onClick={function(){deleteSeq(s.id);}} style={{padding:'5px 12px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
          </div>
        </div>);}):(
        <div style={{textAlign:'center',padding:'50px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}><div style={{fontSize:36,opacity:.2,marginBottom:6}}>⚡</div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>No sequences yet</div><div style={{fontSize:12,color:'#94a3b8'}}>Create a sequence to auto-nurture your leads</div></div>)}
    </div>);
}

// ═══════════════ BROADCAST ═══════════════
function BroadcastTab({leads,lists,showToast}){
  var [subject,setSubject]=useState('');
  var [html,setHtml]=useState('');
  var [filterStatus,setFilterStatus]=useState('all');
  var [filterListId,setFilterListId]=useState('');
  var [sending,setSending]=useState(false);
  var [sent,setSent]=useState(null);

  var count=leads.filter(function(l){
    if(l.status==='unsubscribed')return false;
    if(filterListId&&l.list_id!==parseInt(filterListId))return false;
    if(filterStatus!=='all'){if(filterStatus==='hot')return l.is_hot;return l.status===filterStatus;}
    return true;
  }).length;

  function send(){
    if(!subject.trim()){showToast('Subject required','err');return;}
    if(!html||html.replace(/<[^>]+>/g,'').trim().length<10){showToast('Email content required','err');return;}
    setSending(true);
    apiPost('/api/leads/broadcast',{subject:subject,html_content:html,filter_status:filterStatus,list_id:filterListId?parseInt(filterListId):null}).then(function(r){setSending(false);setSent(r.sent||0);showToast('Sent to '+r.sent+' leads','ok');}).catch(function(e){setSending(false);showToast(e.message||'Failed','err');});
  }

  return(
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
      <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f3f7'}}><h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Send Broadcast</h3><p style={{fontSize:11,color:'#94a3b8',margin:0}}>One-off email to all or filtered leads</p></div>
      <div style={{padding:'20px 24px'}}>
        <div style={{display:'flex',gap:10,marginBottom:16}}>
          <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>List</label>
            <select value={filterListId} onChange={function(e){setFilterListId(e.target.value);}} style={{width:'100%',padding:'9px 12px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:12,fontFamily:'inherit',background:'#fff'}}>
              <option value="">All Lists</option>
              {lists.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>;})}
            </select>
          </div>
          <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Status</label>
            <select value={filterStatus} onChange={function(e){setFilterStatus(e.target.value);}} style={{width:'100%',padding:'9px 12px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:12,fontFamily:'inherit',background:'#fff'}}>
              <option value="all">All</option><option value="new">New</option><option value="nurturing">Nurturing</option><option value="hot">Hot</option>
            </select>
          </div>
          <div style={{display:'flex',alignItems:'end',paddingBottom:2}}><span style={{fontSize:13,fontWeight:800,color:'#0ea5e9'}}>{count} recipients</span></div>
        </div>
        <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Subject</label><input value={subject} onChange={function(e){setSubject(e.target.value);}} placeholder="Your email subject" style={{width:'100%',padding:'11px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/></div>
        <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Content</label><RichTextEditor content={html} onChange={setHtml} placeholder="Write your broadcast email..."/></div>
        <button onClick={send} disabled={sending} style={{display:'flex',alignItems:'center',gap:6,padding:'11px 24px',borderRadius:10,border:'none',background:sending?'#cbd5e1':'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',fontSize:13,fontWeight:800,cursor:sending?'default':'pointer',fontFamily:'Sora,sans-serif'}}><Send size={13}/>{sending?'Sending...':'Send to '+count+' leads'}</button>
        {sent!==null&&<div style={{marginTop:10,fontSize:12,fontWeight:700,color:'#16a34a'}}>✓ Sent to {sent} leads</div>}
      </div>
    </div>);
}

// ═══════════════ CSV UPLOAD ═══════════════
function UploadTab({stats,lists,onReload,showToast}){
  var [csvText,setCsvText]=useState('');
  var [parsed,setParsed]=useState([]);
  var [listId,setListId]=useState('');
  var [uploading,setUploading]=useState(false);
  var [result,setResult]=useState(null);

  function parseCSV(){var lines=csvText.trim().split('\n');var res=[];for(var i=0;i<lines.length;i++){var p=lines[i].trim().split(',');var e=(p[0]||'').trim().toLowerCase();if(e&&e.includes('@'))res.push({email:e,name:(p[1]||'').trim()});}setParsed(res);}
  function handleFile(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){setCsvText(ev.target.result);};r.readAsText(f);}

  function doUpload(){
    if(!parsed.length){showToast('No valid leads','err');return;}
    setUploading(true);
    apiPost('/api/leads/upload-csv',{leads:parsed,list_id:listId?parseInt(listId):null}).then(function(r){setUploading(false);setResult(r);onReload();showToast('Imported '+r.imported+' leads','ok');}).catch(function(e){setUploading(false);showToast(e.message||'Failed','err');});
  }

  return(
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
      <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f3f7'}}><h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Import Leads from CSV</h3><p style={{fontSize:11,color:'#94a3b8',margin:0}}>Format: email,name (one per line). Select a list to import into.</p></div>
      <div style={{padding:'20px 24px'}}>
        {/* Limit + List selector */}
        <div style={{display:'flex',gap:12,marginBottom:16}}>
          <div style={{flex:1,background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:'12px 14px'}}><div style={{fontSize:10,fontWeight:700,color:'#0ea5e9'}}>Leads ({stats.tier||'basic'})</div><div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0ea5e9'}}>{stats.total||0}/{stats.limit||100}</div></div>
          <div style={{flex:2}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Import into List</label>
            <select value={listId} onChange={function(e){setListId(e.target.value);}} style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:12,fontFamily:'inherit',background:'#fff'}}>
              <option value="">Unsorted (no list)</option>
              {lists.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>;})}
            </select>
          </div>
        </div>

        <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'28px',borderRadius:12,border:'2px dashed #d1d5db',cursor:'pointer',marginBottom:12}} onMouseEnter={function(e){e.currentTarget.style.borderColor='#0ea5e9';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';}}>
          <Upload size={24} color="#0ea5e9"/><div style={{fontSize:13,fontWeight:600,color:'#475569'}}>Click to upload CSV</div>
          <input type="file" accept=".csv,.txt" onChange={handleFile} style={{display:'none'}}/>
        </label>

        <textarea value={csvText} onChange={function(e){setCsvText(e.target.value);setParsed([]);setResult(null);}} rows={5} placeholder={"email,name\njohn@example.com,John Smith\njane@example.com,Jane Doe"} style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:12,fontFamily:'monospace',outline:'none',boxSizing:'border-box',resize:'vertical',marginBottom:10}}/>

        <div style={{display:'flex',gap:8,marginBottom:14}}>
          <button onClick={parseCSV} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e8ecf2',background:'#fff',color:'#0ea5e9',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Preview</button>
          {parsed.length>0&&<span style={{fontSize:11,fontWeight:700,color:'#16a34a',display:'flex',alignItems:'center',gap:4}}><CheckCircle size={12}/>{parsed.length} valid emails</span>}
        </div>

        {parsed.length>0&&<div style={{maxHeight:160,overflowY:'auto',background:'#f8f9fb',borderRadius:8,padding:'8px 12px',border:'1px solid #e8ecf2',marginBottom:14,fontSize:10,color:'#475569'}}>{parsed.slice(0,20).map(function(p,i){return <div key={i}>{p.email}{p.name?' — '+p.name:''}</div>;})}{parsed.length>20&&<div style={{color:'#94a3b8'}}>...+{parsed.length-20} more</div>}</div>}

        {result&&<div style={{padding:'10px 14px',background:'#dcfce7',borderRadius:8,border:'1px solid #bbf7d0',marginBottom:14,fontSize:11,color:'#16a34a'}}>✓ Imported: {result.imported} · Duplicates: {result.duplicates} · Over limit: {result.skipped_over_limit} · Total: {result.total_leads}/{result.limit}</div>}

        <button onClick={doUpload} disabled={uploading||!parsed.length} style={{display:'flex',alignItems:'center',gap:5,padding:'11px 24px',borderRadius:10,border:'none',background:(uploading||!parsed.length)?'#cbd5e1':'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:13,fontWeight:800,cursor:(uploading||!parsed.length)?'default':'pointer',fontFamily:'Sora,sans-serif'}}><Upload size={13}/>{uploading?'Importing...':'Import '+parsed.length+' Leads'}</button>
      </div>
    </div>);
}

// ═══════════════ EMAIL BOOST ═══════════════
function BoostTab({emailStats,onReload,showToast}){
  var [buying,setBuying]=useState('');
  var packs=emailStats.boost_packs||[];

  function buyPack(packId){
    setBuying(packId);
    apiPost('/api/leads/buy-boost',{pack_id:packId}).then(function(r){
      setBuying('');
      if(r.ok){showToast('Added '+r.credits_added+' email credits! New balance: $'+r.new_balance.toFixed(2),'ok');onReload();}
      else{showToast(r.error||'Failed','err');}
    }).catch(function(e){setBuying('');showToast(e.message||'Failed','err');});
  }

  var dailyPct=emailStats.daily_limit?Math.min(100,Math.round(((emailStats.sent_today||0)/emailStats.daily_limit)*100)):0;

  return(
    <div>
      {/* Current usage card */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',marginBottom:20}}>
        <div style={{background:'linear-gradient(135deg,#1a103d,#2d1b69)',padding:'28px 32px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><Rocket size={20} color="#a78bfa"/><span style={{fontSize:12,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#a78bfa'}}>Email Boost</span></div>
          <h3 style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:900,color:'#fff',margin:'0 0 6px'}}>Supercharge Your Email Outreach</h3>
          <p style={{fontSize:14,color:'rgba(255,255,255,.5)',margin:0}}>200 free emails/day included. Need more? Purchase boost credits.</p>
        </div>
        <div style={{padding:'24px 32px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
            <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:12,padding:'18px',textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:'#0ea5e9'}}>{emailStats.sent_today||0}</div>
              <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginTop:2}}>Sent Today</div>
              <div style={{height:4,borderRadius:2,background:'#e0f2fe',marginTop:8,overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:dailyPct>80?'#ef4444':'#0ea5e9',width:dailyPct+'%'}}/></div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>{emailStats.free_remaining||0} free remaining</div>
            </div>
            <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:12,padding:'18px',textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:'#8b5cf6'}}>{emailStats.boost_credits||0}</div>
              <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginTop:2}}>Boost Credits</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:8}}>Never expire</div>
            </div>
            <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'18px',textAlign:'center'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:'#16a34a'}}>{emailStats.total_available||0}</div>
              <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginTop:2}}>Total Available</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:8}}>Free + boost combined</div>
            </div>
          </div>
        </div>
      </div>

      {/* Boost packs */}
      <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:'0 0 14px'}}>Purchase Email Boost Packs</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {packs.map(function(p){
          var isBuying=buying===p.id;
          return(
            <div key={p.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',transition:'all .2s',cursor:'pointer'}}
              onMouseEnter={function(e){e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,.1)';}}
              onMouseLeave={function(e){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='none';}}>
              <div style={{background:'linear-gradient(135deg,#1a103d,#2d1b69)',padding:'20px',textAlign:'center'}}>
                <div style={{fontSize:28,marginBottom:6}}>{p.label.split(' ')[0]}</div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:900,color:'#fff'}}>{p.credits.toLocaleString()}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>email credits</div>
              </div>
              <div style={{padding:'18px',textAlign:'center'}}>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:'#0f172a',marginBottom:2}}>${p.price}</div>
                <div style={{fontSize:10,color:'#94a3b8',marginBottom:4}}>${(p.price/p.credits*1000).toFixed(2)} per 1,000 emails</div>
                <div style={{fontSize:11,color:'#64748b',marginBottom:12}}>{p.desc}</div>
                <button onClick={function(){buyPack(p.id);}} disabled={isBuying}
                  style={{width:'100%',padding:'11px',borderRadius:10,border:'none',
                    background:isBuying?'#cbd5e1':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',
                    fontSize:13,fontWeight:800,cursor:isBuying?'default':'pointer',fontFamily:'Sora,sans-serif',
                    boxShadow:isBuying?'none':'0 4px 14px rgba(139,92,246,.25)'}}>
                  {isBuying?'Processing...':'Buy with Wallet'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div style={{marginTop:20,background:'#f8f9fb',border:'1px solid #e8ecf2',borderRadius:12,padding:'16px 20px'}}>
        <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:6}}>How Email Boost Works</div>
        <div style={{fontSize:11,color:'#64748b',lineHeight:1.8}}>
          <div>• You get <strong>200 free emails per day</strong> included with Pro</div>
          <div>• Free emails reset at midnight UTC each day</div>
          <div>• When free emails run out, <strong>boost credits</strong> are used automatically</div>
          <div>• Boost credits <strong>never expire</strong> — use them at your own pace</div>
          <div>• Credits are purchased from your <strong>wallet balance</strong></div>
          <div>• Applies to both sequence sends and broadcasts</div>
        </div>
      </div>
    </div>
  );
}

function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;}
