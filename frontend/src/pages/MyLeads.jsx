import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { Mail, Flame, UserPlus, Send, Upload, Trash2, Plus, CheckCircle, AlertTriangle, X, Zap, FolderOpen, Tag, Edit3, HelpCircle, Rocket, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react';

var TABS = [{key:'leads',label:'Leads',icon:UserPlus},{key:'lists',label:'Lists',icon:FolderOpen},{key:'sequences',label:'Sequences',icon:Zap},{key:'broadcast',label:'Broadcast',icon:Send},{key:'upload',label:'Import',icon:Upload}];
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
  var [showHelp, setShowHelp] = useState(false);
  var [showBoost, setShowBoost] = useState(false);
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

  function buyBoost(packId){
    apiPost('/api/leads/buy-boost',{pack_id:packId}).then(function(r){
      if(r.ok){showToast(r.credits_added+' credits added!','ok');loadAll();setShowBoost(false);}
      else showToast(r.error||'Failed','err');
    }).catch(function(e){showToast(e.message||'Failed','err');});
  }

  if(loading) return <AppLayout title="SuperLeads" subtitle="CRM & Autoresponder"><Spin/></AppLayout>;

  var dailyUsed=emailStats.sent_today||0;
  var dailyLimit=emailStats.daily_limit||200;
  var boostCredits=emailStats.boost_credits||0;
  var dailyPct=Math.min(100,Math.round((dailyUsed/dailyLimit)*100));

  return(
    <AppLayout title="SuperLeads" subtitle="CRM & Autoresponder">
      {toast&&<div style={{padding:'10px 16px',borderRadius:10,marginBottom:14,fontSize:13,fontWeight:700,background:toast.t==='ok'?'#dcfce7':'#fef2f2',color:toast.t==='ok'?'#16a34a':'#dc2626',display:'flex',alignItems:'center',gap:6}}>{toast.t==='ok'?<CheckCircle size={14}/>:<AlertTriangle size={14}/>}{toast.m}</div>}

      {/* ═══ HERO ═══ */}
      <div style={{background:'linear-gradient(135deg,#042a36,#0a1929,#0c1e30)',borderRadius:18,padding:'36px 40px',marginBottom:24,position:'relative',overflow:'hidden',border:'1px solid rgba(14,165,233,.12)'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:280,height:280,borderRadius:'50%',background:'rgba(14,165,233,.04)'}}/>
        <div style={{position:'absolute',bottom:-40,left:'50%',width:200,height:200,borderRadius:'50%',background:'rgba(139,92,246,.03)'}}/>
        {/* Floating particles */}
        {['📧','💰','🚀','⚡','🔥','💎','📊','🎯'].map(function(e,i){return <div key={i} style={{position:'absolute',bottom:-20,left:(10+i*12)+'%',fontSize:14+Math.random()*8,opacity:.06,animation:'slFloat '+(5+i*0.7)+'s ease-in-out '+(i*0.4)+'s infinite',pointerEvents:'none'}}>{e}</div>;})}
        <style>{`@keyframes slFloat{0%{transform:translateY(0);opacity:0}10%{opacity:.08}90%{opacity:.08}100%{transform:translateY(-220px);opacity:0}}@keyframes slPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>

        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(14,165,233,.3)',animation:'slPulse 3s ease-in-out infinite'}}><Mail size={20} color="#fff"/></div>
                <span style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:900,letterSpacing:3,textTransform:'uppercase'}}><span style={{color:'#fff'}}>Super</span><span style={{color:'#38bdf8'}}>Leads</span></span>
              </div>
              <h2 style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:'#fff',margin:'0 0 8px',lineHeight:1.2}}>Your CRM & Autoresponder</h2>
              <p style={{fontSize:14,color:'rgba(255,255,255,.45)',margin:0,maxWidth:440,lineHeight:1.7}}>Capture leads, build lists, automate email sequences, and broadcast to your audience — all powered by Brevo.</p>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={function(){setShowHelp(!showHelp);}} style={{padding:'10px 16px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',color:'rgba(255,255,255,.6)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}><HelpCircle size={13}/>How It Works</button>
              <button onClick={function(){setShowBoost(!showBoost);}} style={{padding:'10px 16px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#f59e0b,#fbbf24)',color:'#78350f',fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4,boxShadow:'0 4px 14px rgba(245,158,11,.3)'}}><Rocket size={13}/>Email Boost</button>
            </div>
          </div>

          {/* Email usage bar */}
          <div style={{marginTop:20,background:'rgba(255,255,255,.04)',borderRadius:12,padding:'14px 18px',border:'1px solid rgba(255,255,255,.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.5)'}}>Today's Emails: {dailyUsed}/{dailyLimit} free</span>
              <span style={{fontSize:11,fontWeight:800,color:boostCredits>0?'#fbbf24':'rgba(255,255,255,.3)'}}>{boostCredits>0?'⚡ '+boostCredits+' boost credits':'No boost credits'}</span>
            </div>
            <div style={{height:6,borderRadius:3,background:'rgba(255,255,255,.08)',overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:3,background:dailyPct>80?'linear-gradient(90deg,#ef4444,#f87171)':dailyPct>50?'linear-gradient(90deg,#f59e0b,#fbbf24)':'linear-gradient(90deg,#0ea5e9,#38bdf8)',width:dailyPct+'%',transition:'width .5s'}}/>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BOOST PANEL ═══ */}
      {showBoost&&(
        <div style={{background:'linear-gradient(135deg,#fffbeb,#fef3c7)',border:'1px solid #fde68a',borderRadius:14,padding:'24px',marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div><div style={{fontSize:16,fontWeight:800,color:'#92400e'}}>⚡ Email Boost Packs</div><div style={{fontSize:12,color:'#a16207'}}>Buy credits from your wallet balance · Credits never expire</div></div>
            <button onClick={function(){setShowBoost(false);}} style={{background:'none',border:'none',cursor:'pointer',color:'#a16207'}}><X size={16}/></button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {(emailStats.boost_packs||[]).map(function(p){return(
              <div key={p.id} style={{background:'#fff',borderRadius:12,padding:'18px',textAlign:'center',border:'2px solid #fde68a',transition:'all .15s',cursor:'pointer'}}
                onMouseEnter={function(e){e.currentTarget.style.borderColor='#f59e0b';e.currentTarget.style.transform='translateY(-2px)';}}
                onMouseLeave={function(e){e.currentTarget.style.borderColor='#fde68a';e.currentTarget.style.transform='';}}>
                <div style={{fontSize:20,marginBottom:6}}>{p.label.split(' ')[0]}</div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:900,color:'#0f172a'}}>{p.credits.toLocaleString()}</div>
                <div style={{fontSize:10,color:'#94a3b8',marginBottom:8}}>emails</div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:'#f59e0b',marginBottom:8}}>${p.price}</div>
                <button onClick={function(){buyBoost(p.id);}} style={{width:'100%',padding:'8px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#f59e0b,#fbbf24)',color:'#78350f',fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>Buy Now</button>
              </div>);})}
          </div>
        </div>
      )}

      {/* ═══ HELP PANEL ═══ */}
      {showHelp&&(
        <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'24px',marginBottom:20,boxShadow:'0 8px 30px rgba(0,0,0,.04)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>How SuperLeads Works</div>
            <button onClick={function(){setShowHelp(false);}} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8'}}><X size={16}/></button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:16}}>
            {[
              {icon:'📥',title:'Capture Leads',items:['SuperPages forms auto-capture leads','Import from CSV files','Organize into named lists','Leads sync with Brevo CRM']},
              {icon:'⚡',title:'Automate Sequences',items:['Create multi-email drip sequences','Set delay between emails (days)','Auto-assign sequences to lists','Brevo sends via SMTP relay']},
              {icon:'📡',title:'Broadcast & Convert',items:['Send one-off broadcasts to any list','Filter by status: new/hot/nurturing','Track opens and clicks per lead','200 free emails/day + boost packs']},
            ].map(function(s,i){return(
              <div key={i} style={{background:'#f8f9fb',borderRadius:12,padding:'20px'}}>
                <div style={{fontSize:28,marginBottom:8}}>{s.icon}</div>
                <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:10}}>{s.title}</div>
                {s.items.map(function(item,j){return <div key={j} style={{display:'flex',gap:6,padding:'3px 0',fontSize:12,color:'#475569'}}><span style={{color:'#0ea5e9',fontWeight:800}}>•</span>{item}</div>;})}
              </div>);})}
          </div>
          <div style={{background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',borderRadius:10,padding:'14px 18px',border:'1px solid #bbf7d0'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#16a34a'}}>💡 Pro Tip</div>
            <div style={{fontSize:12,color:'#166534',lineHeight:1.7,marginTop:4}}>Create a list for each campaign (e.g. "Facebook Fitness Leads"), assign a welcome sequence, then import your CSV. New leads from SuperPages auto-flow into your default sequence and start receiving emails immediately.</div>
          </div>
        </div>
      )}

      {/* ═══ STATS CARDS ═══ */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        {[
          {v:stats.total||0,l:'Total Leads',c:'#0ea5e9',i:UserPlus,bg:'linear-gradient(135deg,#f0f9ff,#e0f2fe)',border:'#bae6fd'},
          {v:stats.hot||0,l:'Hot Leads',c:'#ef4444',i:Flame,bg:'linear-gradient(135deg,#fef2f2,#fee2e2)',border:'#fecaca'},
          {v:lists.length,l:'Lists',c:'#8b5cf6',i:FolderOpen,bg:'linear-gradient(135deg,#f5f3ff,#ede9fe)',border:'#ddd6fe'},
          {v:sequences.length,l:'Sequences',c:'#f59e0b',i:Zap,bg:'linear-gradient(135deg,#fffbeb,#fef3c7)',border:'#fde68a'},
          {v:(stats.remaining!=null?stats.remaining:'-'),l:'Slots Left',c:'#16a34a',i:CheckCircle,bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'#bbf7d0'},
        ].map(function(s,i){var I=s.i;return(
          <div key={i} style={{background:s.bg,border:'1px solid '+s.border,borderRadius:14,padding:'16px 18px',position:'relative',transition:'transform .15s'}}
            onMouseEnter={function(e){e.currentTarget.style.transform='translateY(-2px)';}}
            onMouseLeave={function(e){e.currentTarget.style.transform='';}}>
            <div style={{position:'absolute',top:12,right:12,width:30,height:30,borderRadius:8,background:s.c+'15',display:'flex',alignItems:'center',justifyContent:'center'}}><I size={15} color={s.c}/></div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:900,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,fontWeight:800,color:s.c+'99',marginTop:2,letterSpacing:.5}}>{s.l}</div>
          </div>);})}
      </div>

      {/* ═══ TABS ═══ */}
      <div style={{display:'flex',gap:4,marginBottom:20}}>
        {TABS.map(function(t){var on=tab===t.key;var I=t.icon;return(
          <button key={t.key} onClick={function(){setTab(t.key);}} style={{display:'flex',alignItems:'center',gap:5,padding:'10px 18px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:on?800:600,border:on?'2px solid #0ea5e9':'2px solid #e8ecf2',background:on?'rgba(14,165,233,.04)':'#fff',color:on?'#0ea5e9':'#64748b',transition:'all .15s'}}><I size={14}/>{t.label}</button>);})}
      </div>

      {tab==='leads'&&<LeadsTab leads={leads} lists={lists} sequences={sequences} onReload={loadAll} showToast={showToast}/>}
      {tab==='lists'&&<ListsTab lists={lists} sequences={sequences} onReload={loadAll} showToast={showToast}/>}
      {tab==='sequences'&&<SequencesTab sequences={sequences} onReload={loadAll} showToast={showToast}/>}
      {tab==='broadcast'&&<BroadcastTab leads={leads} lists={lists} showToast={showToast}/>}
      {tab==='upload'&&<UploadTab stats={stats} lists={lists} onReload={loadAll} showToast={showToast}/>}
    </AppLayout>
  );
}

// ═══════════════ LEADS TABLE ═══════════════
function LeadsTab({leads,lists,sequences,onReload,showToast}){
  var [fs,setFs]=useState('all');var [fl,setFl]=useState('all');
  var filtered=leads.filter(function(l){if(fs!=='all'){if(fs==='hot'){if(!l.is_hot)return false;}else{if(l.status!==fs)return false;}}if(fl!=='all'){if(fl==='unsorted'){if(l.list_id)return false;}else{if(l.list_id!==parseInt(fl))return false;}}return true;});
  var listMap={};lists.forEach(function(l){listMap[l.id]=l;});
  function del(id){apiDelete('/api/leads/'+id).then(onReload);}
  function assignSeq(lid,sid){apiPost('/api/leads/'+lid+'/assign-sequence',{sequence_id:sid||null}).then(function(){showToast('Updated','ok');onReload();});}

  return(
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
      <div style={{padding:'12px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
          {['all','new','nurturing','hot','converted'].map(function(f){var on=fs===f;return <button key={f} onClick={function(){setFs(f);}} style={{padding:'5px 10px',borderRadius:6,fontSize:10,fontWeight:on?800:600,fontFamily:'inherit',cursor:'pointer',border:on?'1.5px solid #0ea5e9':'1.5px solid #e8ecf2',background:on?'rgba(14,165,233,.06)':'transparent',color:on?'#0ea5e9':'#94a3b8',textTransform:'capitalize'}}>{f==='hot'?'🔥 Hot':f}</button>;})}
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <select value={fl} onChange={function(e){setFl(e.target.value);}} style={{padding:'5px 8px',borderRadius:6,fontSize:10,border:'1.5px solid #e8ecf2',fontFamily:'inherit',color:'#64748b'}}>
            <option value="all">All Lists</option><option value="unsorted">Unsorted</option>
            {lists.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>;})}
          </select>
          <span style={{fontSize:10,fontWeight:700,color:'#94a3b8'}}>{filtered.length}</span>
        </div>
      </div>
      {filtered.length>0?(<div style={{maxHeight:480,overflowY:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>
          {['Lead','List','Status','Emails','Sequence',''].map(function(h){return <th key={h} style={{fontSize:8,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.8,padding:'8px 12px',borderBottom:'2px solid #e8ecf2',textAlign:'left',background:'#f8f9fb'}}>{h}</th>;})}
        </tr></thead><tbody>
          {filtered.map(function(l){var lst=listMap[l.list_id];return(
            <tr key={l.id} style={{transition:'background .1s'}} onMouseEnter={function(e){e.currentTarget.style.background='#fafbfc';}} onMouseLeave={function(e){e.currentTarget.style.background='';}}>
              <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f6f8'}}><div style={{display:'flex',alignItems:'center',gap:5}}>{l.is_hot&&<Flame size={10} color="#ef4444"/>}<div><div style={{fontSize:12,fontWeight:600,color:'#0f172a'}}>{l.name||l.email}</div>{l.name&&<div style={{fontSize:9,color:'#94a3b8'}}>{l.email}</div>}</div></div></td>
              <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f6f8'}}>{lst?<span style={{fontSize:8,fontWeight:700,padding:'2px 5px',borderRadius:3,background:lst.color+'15',color:lst.color,whiteSpace:'nowrap'}}>{lst.name}</span>:<span style={{fontSize:8,color:'#cbd5e1'}}>—</span>}</td>
              <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f6f8'}}><span style={{fontSize:8,fontWeight:700,padding:'2px 5px',borderRadius:4,textTransform:'capitalize',background:l.is_hot?'#fef2f2':l.status==='nurturing'?'rgba(139,92,246,.08)':l.status==='converted'?'#dcfce7':'rgba(14,165,233,.08)',color:l.is_hot?'#ef4444':l.status==='nurturing'?'#8b5cf6':l.status==='converted'?'#16a34a':'#0ea5e9'}}>{l.is_hot?'hot':l.status||'new'}</span></td>
              <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f6f8',fontSize:10,color:'#64748b'}}>{l.emails_sent||0}↑ {l.emails_opened||0}👁</td>
              <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f6f8'}}><select value={l.sequence_id||''} onChange={function(e){assignSeq(l.id,e.target.value?parseInt(e.target.value):null);}} style={{fontSize:9,padding:'3px 4px',borderRadius:4,border:'1px solid #e8ecf2',fontFamily:'inherit',color:'#64748b',maxWidth:110}}><option value="">None</option>{sequences.map(function(s){return <option key={s.id} value={s.id}>{s.title}</option>;})}</select></td>
              <td style={{padding:'8px 12px',borderBottom:'1px solid #f5f6f8'}}><button onClick={function(){del(l.id);}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer',opacity:.4}} onMouseEnter={function(e){e.currentTarget.style.opacity=1;}} onMouseLeave={function(e){e.currentTarget.style.opacity=.4;}}><Trash2 size={11}/></button></td>
            </tr>);})}
        </tbody></table>
      </div>):(<div style={{textAlign:'center',padding:'50px'}}><div style={{fontSize:36,opacity:.15,marginBottom:6}}>📧</div><div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>No leads found</div><div style={{fontSize:11,color:'#94a3b8'}}>Capture from SuperPages or import CSV</div></div>)}
    </div>);
}

// ═══════════════ LISTS ═══════════════
function ListsTab({lists,sequences,onReload,showToast}){
  var [mode,setMode]=useState(null);var [id,setId]=useState(null);var [name,setName]=useState('');var [desc,setDesc]=useState('');var [color,setColor]=useState('#0ea5e9');var [seqId,setSeqId]=useState('');
  function startNew(){setMode('new');setId(null);setName('');setDesc('');setColor('#0ea5e9');setSeqId('');}
  function startEdit(l){setMode('edit');setId(l.id);setName(l.name);setDesc(l.description);setColor(l.color||'#0ea5e9');setSeqId(l.sequence_id||'');}
  function save(){if(!name.trim()){showToast('Name required','err');return;}var d={name:name.trim(),description:desc.trim(),color:color,sequence_id:seqId?parseInt(seqId):null};(mode==='new'?apiPost('/api/leads/lists',d):apiPut('/api/leads/lists/'+id,d)).then(function(){showToast('Saved','ok');setMode(null);onReload();}).catch(function(e){showToast(e.message||'Failed','err');});}
  function del(lid){if(!confirm('Delete list? Leads move to unsorted.'))return;apiDelete('/api/leads/lists/'+lid).then(onReload);}

  return(<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0,fontFamily:'Sora,sans-serif'}}>Lead Lists</h3><button onClick={startNew} style={{display:'flex',alignItems:'center',gap:4,padding:'9px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 10px rgba(139,92,246,.2)'}}><Plus size={14}/>New List</button></div>
    {mode&&(<div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'20px 24px',marginBottom:14,boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><span style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{mode==='new'?'New List':'Edit List'}</span><button onClick={function(){setMode(null);}} style={{fontSize:11,color:'#94a3b8',background:'none',border:'none',cursor:'pointer'}}>Cancel</button></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <div><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Name</label><input value={name} onChange={function(e){setName(e.target.value);}} placeholder="e.g. Facebook Fitness Leads" style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} onFocus={function(e){e.target.style.borderColor='#8b5cf6';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/></div>
        <div><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Description</label><input value={desc} onChange={function(e){setDesc(e.target.value);}} placeholder="Optional" style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      </div>
      <div style={{display:'flex',gap:12,alignItems:'end',marginBottom:14}}>
        <div><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Colour</label><div style={{display:'flex',gap:4}}>{LIST_COLORS.map(function(c){return <button key={c} onClick={function(){setColor(c);}} style={{width:26,height:26,borderRadius:7,background:c,border:color===c?'3px solid #0f172a':'3px solid transparent',cursor:'pointer',transition:'all .1s'}}/>;})}</div></div>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Default Sequence</label><select value={seqId} onChange={function(e){setSeqId(e.target.value);}} style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:12,fontFamily:'inherit',background:'#fff'}}><option value="">None</option>{sequences.map(function(s){return <option key={s.id} value={s.id}>{s.title}</option>;})}</select></div>
      </div>
      <button onClick={save} style={{padding:'10px 24px',borderRadius:8,border:'none',background:'#8b5cf6',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{mode==='new'?'Create List':'Save Changes'}</button>
    </div>)}
    {lists.length>0?(<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>{lists.map(function(l){return(
      <div key={l.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'20px',position:'relative',overflow:'hidden',transition:'transform .15s'}} onMouseEnter={function(e){e.currentTarget.style.transform='translateY(-2px)';}} onMouseLeave={function(e){e.currentTarget.style.transform='';}}>
        <div style={{width:5,height:'100%',borderRadius:'3px 0 0 3px',background:l.color||'#0ea5e9',position:'absolute',left:0,top:0}}/>
        <div style={{paddingLeft:10}}><div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:2}}>{l.name}</div>{l.description&&<div style={{fontSize:10,color:'#94a3b8',marginBottom:6}}>{l.description}</div>}<div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}><span style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:l.color||'#0ea5e9'}}>{l.lead_count}</span><span style={{fontSize:10,color:'#94a3b8'}}>leads</span></div><div style={{display:'flex',gap:4}}><button onClick={function(){startEdit(l);}} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:'#64748b',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Edit</button><button onClick={function(){del(l.id);}} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Delete</button></div></div>
      </div>);})}
    </div>):(<div style={{textAlign:'center',padding:'50px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}><div style={{fontSize:36,opacity:.15,marginBottom:6}}>📁</div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>No lists yet</div><div style={{fontSize:12,color:'#94a3b8'}}>Organize leads by campaign or source</div></div>)}
  </div>);
}

// ═══════════════ SEQUENCES ═══════════════
function SequencesTab({sequences,onReload,showToast}){
  var [ed,setEd]=useState(null);var [title,setTitle]=useState('');var [emails,setEmails]=useState([]);
  function startNew(){setEd('new');setTitle('');setEmails([{subject:'Welcome!',body_html:'',send_delay_days:0},{subject:'Follow up',body_html:'',send_delay_days:2},{subject:'Last chance',body_html:'',send_delay_days:5}]);}
  function startEdit(s){setEd(s.id);setTitle(s.title);setEmails(s.emails||[]);}
  function save(){if(!title.trim()){showToast('Title required','err');return;}var v=emails.filter(function(e){return e.subject.trim();});if(!v.length){showToast('Need 1+ email','err');return;}(ed==='new'?apiPost('/api/leads/sequences',{title:title,emails:v}):apiPut('/api/leads/sequences/'+ed,{title:title,emails:v})).then(function(){showToast('Saved','ok');setEd(null);onReload();}).catch(function(e){showToast(e.message,'err');});}
  function del(id){if(!confirm('Delete?'))return;apiDelete('/api/leads/sequences/'+id).then(onReload);}
  function sendNext(id){apiPost('/api/leads/send-sequence-email',{sequence_id:id}).then(function(r){showToast('Sent '+r.sent+' emails','ok');onReload();}).catch(function(e){showToast(e.message,'err');});}

  if(ed!==null) return(
    <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
      <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f3f7',display:'flex',justifyContent:'space-between'}}><h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:0}}>{ed==='new'?'Create Sequence':'Edit Sequence'}</h3><button onClick={function(){setEd(null);}} style={{fontSize:11,color:'#94a3b8',background:'none',border:'none',cursor:'pointer'}}>Cancel</button></div>
      <div style={{padding:'20px 24px'}}>
        <div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:700,color:'#334155',display:'block',marginBottom:6}}>Sequence Name</label><input value={title} onChange={function(e){setTitle(e.target.value);}} placeholder="e.g. Welcome Series" style={{width:'100%',padding:'11px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/></div>
        {emails.map(function(em,i){return(<div key={i} style={{background:'#f8f9fb',borderRadius:12,padding:'16px',marginBottom:10,border:'1px solid #e8ecf2'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:12,fontWeight:800,color:'#0ea5e9'}}>Email {i+1}</span><div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{fontSize:10,color:'#94a3b8'}}>after</span><input type="number" min="0" value={em.send_delay_days} onChange={function(e){setEmails(emails.map(function(x,j){return j===i?Object.assign({},x,{send_delay_days:parseInt(e.target.value)||0}):x;}));}} style={{width:45,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:5,fontSize:11,textAlign:'center',fontFamily:'inherit'}}/><span style={{fontSize:10,color:'#94a3b8'}}>days</span>{emails.length>1&&<button onClick={function(){setEmails(emails.filter(function(x,j){return j!==i;}));}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer'}}><Trash2 size={11}/></button>}</div></div>
          <input value={em.subject} onChange={function(e){setEmails(emails.map(function(x,j){return j===i?Object.assign({},x,{subject:e.target.value}):x;}));}} placeholder="Subject line" style={{width:'100%',padding:'9px 12px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:8,background:'#fff'}}/>
          <RichTextEditor content={em.body_html} onChange={function(html){setEmails(emails.map(function(x,j){return j===i?Object.assign({},x,{body_html:html}):x;}));}} placeholder="Email body..."/>
        </div>);})}
        <button onClick={function(){setEmails(emails.concat([{subject:'',body_html:'',send_delay_days:(emails[emails.length-1]||{}).send_delay_days+3||3}]));}} style={{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',borderRadius:8,border:'1.5px solid #e8ecf2',background:'#fff',color:'#0ea5e9',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:16}}><Plus size={11}/>Add Email</button>
        <button onClick={save} style={{padding:'11px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>Save Sequence</button>
      </div></div>);

  return(<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0,fontFamily:'Sora,sans-serif'}}>Email Sequences</h3><button onClick={startNew} style={{display:'flex',alignItems:'center',gap:4,padding:'9px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Plus size={14}/>Create Sequence</button></div>
    {sequences.length>0?sequences.map(function(s){return(<div key={s.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'16px 18px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between',transition:'transform .15s'}} onMouseEnter={function(e){e.currentTarget.style.transform='translateY(-1px)';}} onMouseLeave={function(e){e.currentTarget.style.transform='';}}>
      <div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{s.title}</div><div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{s.num_emails} emails · {s.is_active?'Active':'Paused'}</div></div>
      <div style={{display:'flex',gap:5}}><button onClick={function(){sendNext(s.id);}} style={{padding:'6px 12px',borderRadius:6,border:'none',background:'#16a34a',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Send size={10} style={{verticalAlign:'middle',marginRight:3}}/>Send</button><button onClick={function(){startEdit(s);}} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:'#64748b',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Edit</button><button onClick={function(){del(s.id);}} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Delete</button></div>
    </div>);}):(<div style={{textAlign:'center',padding:'50px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}><div style={{fontSize:36,opacity:.15,marginBottom:6}}>⚡</div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>No sequences yet</div></div>)}
  </div>);
}

// ═══════════════ BROADCAST ═══════════════
function BroadcastTab({leads,lists,showToast}){
  var [subj,setSubj]=useState('');var [html,setHtml]=useState('');var [fStatus,setFStatus]=useState('all');var [fList,setFList]=useState('');var [sending,setSending]=useState(false);var [sent,setSent]=useState(null);
  var count=leads.filter(function(l){if(l.status==='unsubscribed')return false;if(fList&&l.list_id!==parseInt(fList))return false;if(fStatus!=='all'){if(fStatus==='hot')return l.is_hot;return l.status===fStatus;}return true;}).length;
  function send(){if(!subj.trim()){showToast('Subject required','err');return;}if(!html||html.replace(/<[^>]+>/g,'').trim().length<10){showToast('Content required','err');return;}setSending(true);apiPost('/api/leads/broadcast',{subject:subj,html_content:html,filter_status:fStatus,list_id:fList?parseInt(fList):null}).then(function(r){setSending(false);setSent(r.sent||0);showToast('Sent to '+r.sent,'ok');}).catch(function(e){setSending(false);showToast(e.message,'err');});}
  return(<div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f3f7'}}><h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Send Broadcast</h3><p style={{fontSize:11,color:'#94a3b8',margin:0}}>One-off email to all or filtered leads</p></div>
    <div style={{padding:'20px 24px'}}>
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>List</label><select value={fList} onChange={function(e){setFList(e.target.value);}} style={{width:'100%',padding:'9px 12px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:12,fontFamily:'inherit',background:'#fff'}}><option value="">All Lists</option>{lists.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>;})}</select></div>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Status</label><select value={fStatus} onChange={function(e){setFStatus(e.target.value);}} style={{width:'100%',padding:'9px 12px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:12,fontFamily:'inherit',background:'#fff'}}><option value="all">All</option><option value="new">New</option><option value="nurturing">Nurturing</option><option value="hot">Hot</option></select></div>
        <div style={{display:'flex',alignItems:'end',paddingBottom:2}}><span style={{fontSize:14,fontWeight:800,color:'#0ea5e9'}}>{count}</span></div>
      </div>
      <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Subject</label><input value={subj} onChange={function(e){setSubj(e.target.value);}} placeholder="Subject line" style={{width:'100%',padding:'11px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} onFocus={function(e){e.target.style.borderColor='#0ea5e9';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/></div>
      <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Content</label><RichTextEditor content={html} onChange={setHtml} placeholder="Write your broadcast..."/></div>
      <button onClick={send} disabled={sending} style={{display:'flex',alignItems:'center',gap:6,padding:'11px 24px',borderRadius:10,border:'none',background:sending?'#cbd5e1':'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',fontSize:13,fontWeight:800,cursor:sending?'default':'pointer',fontFamily:'Sora,sans-serif'}}><Send size={13}/>{sending?'Sending...':'Send to '+count+' leads'}</button>
      {sent!==null&&<div style={{marginTop:10,fontSize:12,fontWeight:700,color:'#16a34a'}}>✓ Sent to {sent} leads</div>}
    </div></div>);
}

// ═══════════════ CSV UPLOAD ═══════════════
function UploadTab({stats,lists,onReload,showToast}){
  var [csv,setCsv]=useState('');var [parsed,setParsed]=useState([]);var [listId,setListId]=useState('');var [uploading,setUploading]=useState(false);var [result,setResult]=useState(null);
  function parse(){var lines=csv.trim().split('\n');var r=[];for(var i=0;i<lines.length;i++){var p=lines[i].trim().split(',');var e=(p[0]||'').trim().toLowerCase();if(e&&e.includes('@'))r.push({email:e,name:(p[1]||'').trim()});}setParsed(r);}
  function doUpload(){if(!parsed.length){showToast('No valid leads','err');return;}setUploading(true);apiPost('/api/leads/upload-csv',{leads:parsed,list_id:listId?parseInt(listId):null}).then(function(r){setUploading(false);setResult(r);onReload();showToast('Imported '+r.imported,'ok');}).catch(function(e){setUploading(false);showToast(e.message,'err');});}
  return(<div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f3f7'}}><h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Import Leads</h3><p style={{fontSize:11,color:'#94a3b8',margin:0}}>CSV format: email,name (one per line)</p></div>
    <div style={{padding:'20px 24px'}}>
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <div style={{flex:1,background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)',border:'1px solid #bae6fd',borderRadius:10,padding:'12px 14px'}}><div style={{fontSize:10,fontWeight:700,color:'#0ea5e9'}}>Leads ({stats.tier||'basic'})</div><div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0ea5e9'}}>{stats.total||0}/{stats.limit||0}</div></div>
        <div style={{flex:2}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Import into List</label><select value={listId} onChange={function(e){setListId(e.target.value);}} style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:12,fontFamily:'inherit',background:'#fff'}}><option value="">Unsorted</option>{lists.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>;})}</select></div>
      </div>
      <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'28px',borderRadius:12,border:'2px dashed #d1d5db',cursor:'pointer',marginBottom:12,transition:'all .15s'}} onMouseEnter={function(e){e.currentTarget.style.borderColor='#0ea5e9';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';}}><Upload size={24} color="#0ea5e9"/><div style={{fontSize:13,fontWeight:600,color:'#475569'}}>Click to upload CSV</div><input type="file" accept=".csv,.txt" onChange={function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){setCsv(ev.target.result);};r.readAsText(f);}} style={{display:'none'}}/></label>
      <textarea value={csv} onChange={function(e){setCsv(e.target.value);setParsed([]);setResult(null);}} rows={4} placeholder={"email,name\njohn@example.com,John\njane@example.com,Jane"} style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:12,fontFamily:'monospace',outline:'none',boxSizing:'border-box',resize:'vertical',marginBottom:10}}/>
      <div style={{display:'flex',gap:8,marginBottom:14}}><button onClick={parse} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e8ecf2',background:'#fff',color:'#0ea5e9',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Preview</button>{parsed.length>0&&<span style={{fontSize:11,fontWeight:700,color:'#16a34a',display:'flex',alignItems:'center',gap:4}}><CheckCircle size={12}/>{parsed.length} valid</span>}</div>
      {parsed.length>0&&<div style={{maxHeight:140,overflowY:'auto',background:'#f8f9fb',borderRadius:8,padding:'8px 12px',border:'1px solid #e8ecf2',marginBottom:14,fontSize:10,color:'#475569'}}>{parsed.slice(0,15).map(function(p,i){return <div key={i}>{p.email}{p.name?' — '+p.name:''}</div>;})}{parsed.length>15&&<div style={{color:'#94a3b8'}}>+{parsed.length-15} more</div>}</div>}
      {result&&<div style={{padding:'10px 14px',background:'#dcfce7',borderRadius:8,border:'1px solid #bbf7d0',marginBottom:14,fontSize:11,color:'#16a34a'}}>✓ Imported: {result.imported} · Dupes: {result.duplicates} · Over limit: {result.skipped_over_limit}</div>}
      <button onClick={doUpload} disabled={uploading||!parsed.length} style={{display:'flex',alignItems:'center',gap:5,padding:'11px 24px',borderRadius:10,border:'none',background:(uploading||!parsed.length)?'#cbd5e1':'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:13,fontWeight:800,cursor:(uploading||!parsed.length)?'default':'pointer',fontFamily:'Sora,sans-serif'}}><Upload size={13}/>{uploading?'Importing...':'Import '+parsed.length}</button>
    </div></div>);
}

function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;}
