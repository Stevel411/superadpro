import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { Mail, Flame, UserPlus, MailOpen, Send, Filter, Upload, Trash2, Plus, Play, ChevronDown, ChevronRight, CheckCircle, AlertTriangle, X, Zap, FileText } from 'lucide-react';

var TABS = [{key:'leads',label:'My Leads',icon:UserPlus},{key:'sequences',label:'Sequences',icon:Zap},{key:'broadcast',label:'Broadcast',icon:Send},{key:'upload',label:'Import CSV',icon:Upload}];

export default function MyLeads() {
  var [tab, setTab] = useState('leads');
  var [leads, setLeads] = useState([]);
  var [sequences, setSequences] = useState([]);
  var [stats, setStats] = useState({});
  var [loading, setLoading] = useState(true);
  var [toast, setToast] = useState(null);

  function showToast(m,t){setToast({m,t});setTimeout(function(){setToast(null);},3000);}

  function loadAll(){
    Promise.all([
      apiGet('/api/leads').catch(function(){return {leads:[]};}),
      apiGet('/api/leads/sequences').catch(function(){return {sequences:[]};}),
      apiGet('/api/leads/stats').catch(function(){return {};})
    ]).then(function(r){
      setLeads(r[0].leads||[]);setSequences(r[1].sequences||[]);setStats(r[2]);setLoading(false);
    });
  }
  useEffect(loadAll,[]);

  if(loading) return <AppLayout title="My Leads" subtitle="CRM & Autoresponder"><Spin/></AppLayout>;

  return(
    <AppLayout title="My Leads" subtitle="CRM & Autoresponder — capture, nurture, convert">
      {toast&&<div style={{padding:'10px 16px',borderRadius:10,marginBottom:14,fontSize:13,fontWeight:700,background:toast.t==='ok'?'#dcfce7':'#fef2f2',color:toast.t==='ok'?'#16a34a':'#dc2626'}}>{toast.m}</div>}

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        {[
          {v:stats.total||0,l:'Total Leads',c:'#0ea5e9',icon:UserPlus},
          {v:stats.hot||0,l:'Hot Leads',c:'#ef4444',icon:Flame},
          {v:stats.limit||100,l:'Lead Limit',c:'#8b5cf6',icon:Mail},
          {v:stats.remaining||0,l:'Remaining',c:'#16a34a',icon:CheckCircle},
          {v:sequences.length,l:'Sequences',c:'#f59e0b',icon:Zap},
        ].map(function(s,i){var I=s.icon;return(
          <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'16px',position:'relative'}}>
            <div style={{position:'absolute',top:12,right:12,width:28,height:28,borderRadius:7,background:s.c+'10',display:'flex',alignItems:'center',justifyContent:'center'}}><I size={14} color={s.c}/></div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginTop:2}}>{s.l}</div>
          </div>);
        })}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:20}}>
        {TABS.map(function(t){var on=tab===t.key;var I=t.icon;return(
          <button key={t.key} onClick={function(){setTab(t.key);}} style={{display:'flex',alignItems:'center',gap:5,padding:'10px 18px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:on?800:600,border:on?'2px solid #0ea5e9':'2px solid #e8ecf2',background:on?'rgba(14,165,233,.04)':'#fff',color:on?'#0ea5e9':'#64748b',transition:'all .15s'}}>
            <I size={14}/>{t.label}
          </button>);
        })}
      </div>

      {tab==='leads'&&<LeadsTab leads={leads} sequences={sequences} onReload={loadAll} showToast={showToast}/>}
      {tab==='sequences'&&<SequencesTab sequences={sequences} onReload={loadAll} showToast={showToast}/>}
      {tab==='broadcast'&&<BroadcastTab leads={leads} showToast={showToast}/>}
      {tab==='upload'&&<UploadTab stats={stats} onReload={loadAll} showToast={showToast}/>}
    </AppLayout>
  );
}

// ═══════════════ LEADS TABLE ═══════════════
function LeadsTab({leads,sequences,onReload,showToast}){
  var [filter,setFilter]=useState('all');
  var [deleting,setDeleting]=useState('');
  var filtered=filter==='all'?leads:filter==='hot'?leads.filter(function(l){return l.is_hot;}):leads.filter(function(l){return l.status===filter;});

  function deleteLead(id){
    setDeleting(id);apiDelete('/api/leads/'+id).then(function(){onReload();setDeleting('');}).catch(function(){setDeleting('');});
  }

  function assignSeq(leadId,seqId){
    apiPost('/api/leads/'+leadId+'/assign-sequence',{sequence_id:seqId}).then(function(){showToast('Sequence assigned','ok');onReload();}).catch(function(){showToast('Failed','err');});
  }

  return(
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
      <div style={{display:'flex',gap:4,padding:'12px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:4}}>
          {['all','new','nurturing','hot','converted'].map(function(f){var on=filter===f;return(
            <button key={f} onClick={function(){setFilter(f);}} style={{padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:700,fontFamily:'inherit',cursor:'pointer',border:on?'1px solid #0ea5e9':'1px solid #e8ecf2',background:on?'rgba(14,165,233,.06)':'transparent',color:on?'#0ea5e9':'#94a3b8',textTransform:'capitalize'}}>{f==='hot'?'🔥 Hot':f}</button>);
          })}
        </div>
        <span style={{fontSize:11,color:'#94a3b8'}}>{filtered.length} leads</span>
      </div>

      {filtered.length>0?(
        <div style={{maxHeight:500,overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>
              {['Lead','Status','Emails','Sequence','Source','Actions'].map(function(h){return <th key={h} style={{fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,padding:'10px 14px',borderBottom:'2px solid #e8ecf2',textAlign:'left',background:'#f8f9fb'}}>{h}</th>;})}
            </tr></thead>
            <tbody>
              {filtered.map(function(l){return(
                <tr key={l.id}>
                  <td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      {l.is_hot&&<Flame size={12} color="#ef4444"/>}
                      <div><div style={{fontSize:13,fontWeight:600,color:'#0f172a'}}>{l.name||l.email}</div>{l.name&&<div style={{fontSize:10,color:'#94a3b8'}}>{l.email}</div>}</div>
                    </div>
                  </td>
                  <td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8'}}>
                    <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,textTransform:'capitalize',background:l.status==='hot'||l.is_hot?'#fef2f2':l.status==='nurturing'?'rgba(139,92,246,.08)':l.status==='converted'?'#dcfce7':'rgba(14,165,233,.08)',color:l.status==='hot'||l.is_hot?'#ef4444':l.status==='nurturing'?'#8b5cf6':l.status==='converted'?'#16a34a':'#0ea5e9'}}>{l.is_hot?'hot':l.status||'new'}</span>
                  </td>
                  <td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8',fontSize:11,color:'#64748b'}}>{l.emails_sent||0} sent · {l.emails_opened||0} opened</td>
                  <td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8'}}>
                    <select value={l.sequence_id||''} onChange={function(e){if(e.target.value)assignSeq(l.id,parseInt(e.target.value));}}
                      style={{fontSize:10,padding:'4px 6px',borderRadius:4,border:'1px solid #e8ecf2',fontFamily:'inherit',color:'#64748b',background:'#fff'}}>
                      <option value="">None</option>
                      {sequences.map(function(s){return <option key={s.id} value={s.id}>{s.title}</option>;})}
                    </select>
                  </td>
                  <td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8',fontSize:10,color:'#94a3b8',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.source_url||'—'}</td>
                  <td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8'}}>
                    <button onClick={function(){deleteLead(l.id);}} disabled={deleting===l.id} style={{fontSize:10,color:'#dc2626',background:'none',border:'none',cursor:'pointer',opacity:deleting===l.id?.5:1}}><Trash2 size={12}/></button>
                  </td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      ):(
        <div style={{textAlign:'center',padding:'60px 20px'}}><div style={{fontSize:40,opacity:.2,marginBottom:8}}>📧</div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>No leads yet</div><div style={{fontSize:12,color:'#94a3b8'}}>Capture leads from SuperPages or import via CSV</div></div>
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
    var validEmails=emails.filter(function(e){return e.subject.trim();});
    if(validEmails.length===0){showToast('At least 1 email required','err');return;}
    var promise=editing==='new'?apiPost('/api/leads/sequences',{title:title,emails:validEmails}):apiPut('/api/leads/sequences/'+editing,{title:title,emails:validEmails});
    promise.then(function(){showToast('Sequence saved','ok');setEditing(null);onReload();}).catch(function(e){showToast(e.message||'Failed','err');});
  }

  function deleteSeq(id){if(!confirm('Delete this sequence?'))return;apiDelete('/api/leads/sequences/'+id).then(function(){onReload();}).catch(function(){});}

  function sendSeqEmails(seqId){
    apiPost('/api/leads/send-sequence-email',{sequence_id:seqId}).then(function(r){showToast('Sent '+r.sent+' emails','ok');onReload();}).catch(function(e){showToast(e.message||'Failed','err');});
  }

  if(editing!==null) return(
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
      <div style={{padding:'20px 24px',borderBottom:'1px solid #f1f3f7',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>{editing==='new'?'Create Sequence':'Edit Sequence'}</h3>
        <button onClick={function(){setEditing(null);}} style={{fontSize:12,color:'#94a3b8',background:'none',border:'none',cursor:'pointer'}}>Cancel</button>
      </div>
      <div style={{padding:'24px'}}>
        <div style={{marginBottom:20}}><label style={{fontSize:13,fontWeight:700,color:'#334155',display:'block',marginBottom:6}}>Sequence Name</label><input value={title} onChange={function(e){setTitle(e.target.value);}} placeholder="e.g. Welcome Series" style={{width:'100%',padding:'12px 16px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/></div>

        {emails.map(function(em,i){return(
          <div key={i} style={{background:'#f8f9fb',borderRadius:12,padding:'18px',marginBottom:12,border:'1px solid #e8ecf2'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:800,color:'#0ea5e9'}}>Email {i+1}</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:10,color:'#94a3b8'}}>Send after</span>
                <input type="number" min="0" value={em.send_delay_days} onChange={function(e){setEmails(emails.map(function(x,j){return j===i?Object.assign({},x,{send_delay_days:parseInt(e.target.value)||0}):x;}));}} style={{width:50,padding:'4px 8px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,textAlign:'center',fontFamily:'inherit'}}/>
                <span style={{fontSize:10,color:'#94a3b8'}}>days</span>
                {emails.length>1&&<button onClick={function(){setEmails(emails.filter(function(x,j){return j!==i;}));}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer'}}><Trash2 size={12}/></button>}
              </div>
            </div>
            <input value={em.subject} onChange={function(e){setEmails(emails.map(function(x,j){return j===i?Object.assign({},x,{subject:e.target.value}):x;}));}} placeholder="Email subject line" style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:10,background:'#fff'}}/>
            <RichTextEditor content={em.body_html} onChange={function(html){setEmails(emails.map(function(x,j){return j===i?Object.assign({},x,{body_html:html}):x;}));}} placeholder="Write your email content here..."/>
          </div>
        );})}

        <button onClick={function(){setEmails(emails.concat([{subject:'',body_html:'',send_delay_days:(emails[emails.length-1]||{}).send_delay_days+3||3}]));}} style={{display:'flex',alignItems:'center',gap:4,padding:'8px 16px',borderRadius:8,border:'1.5px solid #e8ecf2',background:'#fff',color:'#0ea5e9',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:20}}><Plus size={12}/> Add Email</button>

        <button onClick={saveSequence} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 28px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif',boxShadow:'0 4px 14px rgba(14,165,233,.25)'}}>
          <CheckCircle size={14}/> Save Sequence
        </button>
      </div>
    </div>
  );

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>Email Sequences</h3>
        <button onClick={startNew} style={{display:'flex',alignItems:'center',gap:4,padding:'9px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Plus size={14}/>Create Sequence</button>
      </div>
      {sequences.length>0?sequences.map(function(s){return(
        <div key={s.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'18px 20px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{s.title}</div>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{s.num_emails} emails · {s.is_active?'Active':'Paused'}</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={function(){sendSeqEmails(s.id);}} style={{padding:'6px 14px',borderRadius:6,border:'none',background:'#16a34a',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Send size={10}/> Send Next</button>
            <button onClick={function(){startEdit(s);}} style={{padding:'6px 14px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:'#64748b',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
            <button onClick={function(){deleteSeq(s.id);}} style={{padding:'6px 14px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Delete</button>
          </div>
        </div>);
      }):(
        <div style={{textAlign:'center',padding:'60px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}><div style={{fontSize:40,opacity:.2,marginBottom:8}}>⚡</div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>No sequences yet</div><div style={{fontSize:12,color:'#94a3b8',marginBottom:16}}>Create an email sequence to nurture your leads automatically</div></div>
      )}
    </div>
  );
}

// ═══════════════ BROADCAST ═══════════════
function BroadcastTab({leads,showToast}){
  var [subject,setSubject]=useState('');
  var [html,setHtml]=useState('');
  var [filterStatus,setFilterStatus]=useState('all');
  var [sending,setSending]=useState(false);
  var [sent,setSent]=useState(null);

  var count=filterStatus==='all'?leads.length:filterStatus==='hot'?leads.filter(function(l){return l.is_hot;}).length:leads.filter(function(l){return l.status===filterStatus;}).length;

  function sendBroadcast(){
    if(!subject.trim()){showToast('Subject required','err');return;}
    if(!html||html.replace(/<[^>]+>/g,'').trim().length<10){showToast('Email content required','err');return;}
    setSending(true);
    apiPost('/api/leads/broadcast',{subject:subject,html_content:html,filter_status:filterStatus}).then(function(r){
      setSending(false);setSent(r.sent||0);showToast('Broadcast sent to '+r.sent+' leads','ok');
    }).catch(function(e){setSending(false);showToast(e.message||'Failed','err');});
  }

  return(
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
      <div style={{padding:'20px 24px',borderBottom:'1px solid #f1f3f7'}}>
        <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Send Broadcast</h3>
        <p style={{fontSize:12,color:'#94a3b8',margin:0}}>One-off email to all or filtered leads</p>
      </div>
      <div style={{padding:'24px'}}>
        <div style={{display:'flex',gap:10,marginBottom:18,alignItems:'end'}}>
          <div style={{flex:1}}><label style={{fontSize:12,fontWeight:700,color:'#334155',display:'block',marginBottom:6}}>Send to</label>
            <select value={filterStatus} onChange={function(e){setFilterStatus(e.target.value);}} style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:13,fontFamily:'inherit',background:'#fff'}}>
              <option value="all">All Leads ({leads.length})</option>
              <option value="new">New Only</option>
              <option value="nurturing">Nurturing</option>
              <option value="hot">Hot Leads Only</option>
            </select>
          </div>
          <div style={{fontSize:13,fontWeight:800,color:'#0ea5e9',padding:'10px 0'}}>{count} recipients</div>
        </div>
        <div style={{marginBottom:18}}><label style={{fontSize:12,fontWeight:700,color:'#334155',display:'block',marginBottom:6}}>Subject Line</label><input value={subject} onChange={function(e){setSubject(e.target.value);}} placeholder="Your email subject" style={{width:'100%',padding:'12px 16px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/></div>
        <div style={{marginBottom:18}}><label style={{fontSize:12,fontWeight:700,color:'#334155',display:'block',marginBottom:6}}>Email Content</label><RichTextEditor content={html} onChange={setHtml} placeholder="Write your broadcast email..."/></div>
        <button onClick={sendBroadcast} disabled={sending} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 28px',borderRadius:10,border:'none',background:sending?'#cbd5e1':'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',fontSize:14,fontWeight:800,cursor:sending?'default':'pointer',fontFamily:'Sora,sans-serif',boxShadow:sending?'none':'0 4px 14px rgba(22,163,74,.25)'}}>
          <Send size={14}/>{sending?'Sending...':'Send Broadcast to '+count+' leads'}
        </button>
        {sent!==null&&<div style={{marginTop:12,fontSize:13,fontWeight:700,color:'#16a34a'}}>✓ Sent to {sent} leads</div>}
      </div>
    </div>
  );
}

// ═══════════════ CSV UPLOAD ═══════════════
function UploadTab({stats,onReload,showToast}){
  var [csvText,setCsvText]=useState('');
  var [parsed,setParsed]=useState([]);
  var [uploading,setUploading]=useState(false);
  var [result,setResult]=useState(null);

  function parseCSV(){
    var lines=csvText.trim().split('\n');
    var results=[];
    for(var i=0;i<lines.length;i++){
      var line=lines[i].trim();if(!line)continue;
      var parts=line.split(',');
      var email=(parts[0]||'').trim().toLowerCase();
      var name=(parts[1]||'').trim();
      if(email&&email.includes('@'))results.push({email:email,name:name});
    }
    setParsed(results);
  }

  function handleFileUpload(e){
    var f=e.target.files[0];if(!f)return;
    var r=new FileReader();r.onload=function(ev){setCsvText(ev.target.result);};r.readAsText(f);
  }

  function doUpload(){
    if(parsed.length===0){showToast('No valid leads to import','err');return;}
    setUploading(true);
    apiPost('/api/leads/upload-csv',{leads:parsed}).then(function(r){
      setUploading(false);setResult(r);onReload();
      showToast('Imported '+r.imported+' leads','ok');
    }).catch(function(e){setUploading(false);showToast(e.message||'Failed','err');});
  }

  return(
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
      <div style={{padding:'20px 24px',borderBottom:'1px solid #f1f3f7'}}>
        <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Import Leads from CSV</h3>
        <p style={{fontSize:12,color:'#94a3b8',margin:0}}>Upload a CSV file with email addresses. Format: email,name (one per line)</p>
      </div>
      <div style={{padding:'24px'}}>
        {/* Limit info */}
        <div style={{display:'flex',gap:12,marginBottom:20}}>
          <div style={{flex:1,background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:'12px 16px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#0ea5e9'}}>Lead Limit ({stats.tier||'basic'})</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0ea5e9'}}>{stats.total||0} / {stats.limit||100}</div>
            <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{stats.remaining||0} remaining</div>
          </div>
          <div style={{flex:1,background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'12px 16px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#8b5cf6'}}>Upgrade for More</div>
            <div style={{fontSize:12,color:'#475569',marginTop:4}}>Basic: 100 leads · Pro: 500 leads</div>
          </div>
        </div>

        {/* Upload zone */}
        <div style={{marginBottom:16}}>
          <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'32px',borderRadius:12,border:'2px dashed #d1d5db',cursor:'pointer'}} onMouseEnter={function(e){e.currentTarget.style.borderColor='#0ea5e9';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';}}>
            <Upload size={28} color="#0ea5e9"/>
            <div style={{fontSize:14,fontWeight:600,color:'#475569'}}>Click to upload CSV file</div>
            <div style={{fontSize:11,color:'#94a3b8'}}>Or paste CSV text below</div>
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{display:'none'}}/>
          </label>
        </div>

        <textarea value={csvText} onChange={function(e){setCsvText(e.target.value);setParsed([]);setResult(null);}} rows={6} placeholder={"email,name\njohn@example.com,John Smith\njane@example.com,Jane Doe"} style={{width:'100%',padding:'12px 16px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:13,fontFamily:'monospace',outline:'none',boxSizing:'border-box',resize:'vertical',marginBottom:12}} onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/>

        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <button onClick={parseCSV} style={{padding:'8px 18px',borderRadius:8,border:'1px solid #e8ecf2',background:'#fff',color:'#0ea5e9',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Preview ({csvText.split('\n').filter(function(l){return l.trim();}).length} lines)</button>
          {parsed.length>0&&<div style={{fontSize:12,fontWeight:700,color:'#16a34a',display:'flex',alignItems:'center',gap:4}}><CheckCircle size={14}/>{parsed.length} valid emails found</div>}
        </div>

        {parsed.length>0&&(
          <div style={{marginBottom:16,maxHeight:200,overflowY:'auto',background:'#f8f9fb',borderRadius:8,padding:'10px 14px',border:'1px solid #e8ecf2'}}>
            {parsed.slice(0,20).map(function(p,i){return <div key={i} style={{fontSize:11,color:'#475569',padding:'2px 0'}}>{p.email}{p.name?' — '+p.name:''}</div>;})}
            {parsed.length>20&&<div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>...and {parsed.length-20} more</div>}
          </div>
        )}

        {result&&(
          <div style={{padding:'12px 16px',background:'#dcfce7',borderRadius:8,border:'1px solid #bbf7d0',marginBottom:16,fontSize:12,color:'#16a34a'}}>
            ✓ Imported: {result.imported} · Duplicates: {result.duplicates} · Over limit: {result.skipped_over_limit} · Total now: {result.total_leads}/{result.limit}
          </div>
        )}

        <button onClick={doUpload} disabled={uploading||parsed.length===0} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 28px',borderRadius:10,border:'none',background:(uploading||parsed.length===0)?'#cbd5e1':'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:14,fontWeight:800,cursor:(uploading||parsed.length===0)?'default':'pointer',fontFamily:'Sora,sans-serif'}}>
          <Upload size={14}/>{uploading?'Importing...':'Import '+parsed.length+' Leads'}
        </button>
      </div>
    </div>
  );
}

function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;}
