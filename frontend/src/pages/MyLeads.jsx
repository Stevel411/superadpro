import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { Mail, Flame, UserPlus, Send, Upload, Trash2, Plus, CheckCircle, AlertTriangle, Zap, FolderOpen, Edit3, HelpCircle, ChevronDown, ChevronRight, Rocket, X } from 'lucide-react';

var TABS = [{key:'leads',label:'Leads',icon:UserPlus},{key:'lists',label:'Lists',icon:FolderOpen},{key:'sequences',label:'Sequences',icon:Zap},{key:'broadcast',label:'Broadcast',icon:Send},{key:'upload',label:'Import',icon:Upload}];
var LIST_COLORS = ['#6366f1','#0ea5e9','#8b5cf6','#ef4444','#16a34a','#f59e0b','#ec4899','#06b6d4'];

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

  if(loading) return <AppLayout title="SuperLeads" subtitle="CRM & Autoresponder"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;

  var du=emailStats.sent_today||0,dl=emailStats.daily_limit||200,bc=emailStats.boost_credits||0,dp=Math.min(100,Math.round((du/dl)*100));

  return(
    <AppLayout title="SuperLeads" subtitle="CRM & Autoresponder">
      {toast&&<div style={{padding:'10px 16px',borderRadius:10,marginBottom:14,fontSize:13,fontWeight:700,background:toast.t==='ok'?'#dcfce7':'#fef2f2',color:toast.t==='ok'?'#16a34a':'#dc2626',display:'flex',alignItems:'center',gap:6}}>{toast.t==='ok'?<CheckCircle size={14}/>:<AlertTriangle size={14}/>}{toast.m}</div>}

      {/* HERO */}
      <div style={{background:'linear-gradient(135deg,#0c1631,#162044,#1a1040)',borderRadius:18,padding:'36px 40px',marginBottom:24,position:'relative',overflow:'hidden',border:'1px solid rgba(99,102,241,.12)'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:260,height:260,borderRadius:'50%',background:'rgba(99,102,241,.06)'}}/>
        <div style={{position:'absolute',bottom:-40,left:'30%',width:180,height:180,borderRadius:'50%',background:'rgba(14,165,233,.04)'}}/>
        {['📧','🎯','🔥','⚡','💰','📊','🚀','💎'].map(function(e,i){return <div key={i} style={{position:'absolute',bottom:-20,left:(10+i*11)+'%',fontSize:14+Math.random()*8,opacity:.06,animation:'slF '+(5.5+i*.7)+'s ease-in-out '+i*.5+'s infinite',pointerEvents:'none'}}>{e}</div>;})}
        <style>{'@keyframes slF{0%{transform:translateY(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(-220px);opacity:0}}'}</style>
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <div style={{width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(99,102,241,.4)'}}><Mail size={20} color="#fff"/></div>
              <span style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:900,letterSpacing:2.5,textTransform:'uppercase'}}><span style={{color:'#fff'}}>Super</span><span style={{color:'#818cf8'}}>Leads</span></span>
            </div>
            <h2 style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:'#fff',margin:'0 0 8px',lineHeight:1.2}}>Your CRM & Autoresponder</h2>
            <p style={{fontSize:14,color:'rgba(255,255,255,.45)',margin:0,maxWidth:440,lineHeight:1.7}}>Capture, organise, nurture, and convert your leads — all from one powerful dashboard.</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:'18px 22px',minWidth:200}}>
              <div style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Daily Emails</div>
              <div style={{display:'flex',alignItems:'baseline',gap:4}}><span style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:'#818cf8'}}>{du}</span><span style={{fontSize:14,color:'rgba(255,255,255,.3)'}}>/ {dl}</span></div>
              <div style={{width:'100%',height:4,borderRadius:2,background:'rgba(255,255,255,.08)',marginTop:8,overflow:'hidden'}}><div style={{width:dp+'%',height:'100%',borderRadius:2,background:dp>80?'#ef4444':dp>50?'#f59e0b':'#818cf8',transition:'width .5s'}}/></div>
              {bc>0&&<div style={{fontSize:10,color:'#818cf8',fontWeight:700,marginTop:6}}>+{bc.toLocaleString()} boost</div>}
            </div>
            <button onClick={function(){setShowHelp(!showHelp);}} style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,.4)',alignSelf:'start'}}><HelpCircle size={18}/></button>
          </div>
        </div>
      </div>

      {/* HELP */}
      {showHelp&&<div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:16,padding:'24px 28px',marginBottom:20,position:'relative',boxShadow:'0 8px 30px rgba(0,0,0,.06)'}}>
        <button onClick={function(){setShowHelp(false);}} style={{position:'absolute',top:14,right:14,background:'none',border:'none',cursor:'pointer',color:'#94a3b8'}}><X size={18}/></button>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}><HelpCircle size={18} color="#6366f1"/><span style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>How SuperLeads Works</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
          {[{i:'📥',t:'Capture',d:'Leads auto-flow from SuperPages or import CSV files.'},{i:'📁',t:'Organise',d:'Create colour-coded lists for different campaigns.'},{i:'⚡',t:'Automate',d:'Build multi-email sequences with delays between sends.'},{i:'📨',t:'Send',d:'Drip sequences or broadcast to any list. 200 free/day.'}].map(function(h,i){return <div key={i} style={{background:'#f8f9fb',borderRadius:12,padding:'18px'}}><div style={{fontSize:28,marginBottom:8}}>{h.i}</div><div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:4}}>{h.t}</div><div style={{fontSize:11,color:'#64748b',lineHeight:1.7}}>{h.d}</div></div>;})}
        </div>
        <div style={{marginTop:14,padding:'14px 18px',background:'rgba(99,102,241,.03)',borderRadius:10,border:'1px solid rgba(99,102,241,.1)'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#6366f1',marginBottom:4}}>⚡ Email Boost Packs</div>
          <div style={{fontSize:11,color:'#475569',lineHeight:1.7}}>200 free emails/day. Need more? Buy boost packs: 1K/$5 · 5K/$19 · 10K/$29 · 50K/$99. Credits never expire.</div>
        </div>
      </div>}

      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        {[{v:stats.total||0,l:'Total Leads',c:'#6366f1',i:UserPlus},{v:stats.hot||0,l:'Hot Leads',c:'#ef4444',i:Flame},{v:lists.length,l:'Lists',c:'#8b5cf6',i:FolderOpen},{v:sequences.length,l:'Sequences',c:'#f59e0b',i:Zap},{v:(stats.remaining>=0?stats.remaining:'—')+'/'+(stats.limit||0),l:'Capacity',c:'#16a34a',i:CheckCircle}].map(function(s,i){var I=s.i;return <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'18px 20px',position:'relative',transition:'transform .2s,box-shadow .2s'}} onMouseEnter={function(e){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,.1)';}} onMouseLeave={function(e){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='none';}}><div style={{position:'absolute',top:14,right:14,width:32,height:32,borderRadius:8,background:s.c+'10',display:'flex',alignItems:'center',justifyContent:'center'}}><I size={15} color={s.c}/></div><div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginTop:3,textTransform:'uppercase',letterSpacing:.5}}>{s.l}</div></div>;})}
      </div>

      {/* BOOST BAR */}
      <BoostBar es={emailStats} onReload={loadAll} showToast={showToast}/>

      {/* TABS */}
      <div style={{display:'flex',gap:4,marginBottom:20}}>
        {TABS.map(function(t){var on=tab===t.key;var I=t.icon;return <button key={t.key} onClick={function(){setTab(t.key);}} style={{display:'flex',alignItems:'center',gap:5,padding:'10px 18px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:on?800:600,border:on?'2px solid #6366f1':'2px solid #e8ecf2',background:on?'rgba(99,102,241,.04)':'#fff',color:on?'#6366f1':'#64748b'}}><I size={13}/>{t.label}</button>;})}
      </div>

      {tab==='leads'&&<LeadsTab leads={leads} lists={lists} sequences={sequences} onReload={loadAll} showToast={showToast}/>}
      {tab==='lists'&&<ListsTab lists={lists} sequences={sequences} onReload={loadAll} showToast={showToast}/>}
      {tab==='sequences'&&<SequencesTab sequences={sequences} onReload={loadAll} showToast={showToast}/>}
      {tab==='broadcast'&&<BroadcastTab leads={leads} lists={lists} showToast={showToast}/>}
      {tab==='upload'&&<UploadTab stats={stats} lists={lists} onReload={loadAll} showToast={showToast}/>}
    </AppLayout>
  );
}

function BoostBar({es,onReload,showToast}){
  var [show,setShow]=useState(false);var [buying,setBuying]=useState('');
  var packs=es.boost_packs||[];var cr=es.boost_credits||0;var fr=es.free_remaining||0;
  function buy(id){setBuying(id);apiPost('/api/leads/buy-boost',{pack_id:id}).then(function(r){if(r.ok)showToast('+'+r.credits_added.toLocaleString()+' credits!','ok');else showToast(r.error,'err');setBuying('');onReload();}).catch(function(e){showToast(e.message,'err');setBuying('');});}
  return <div style={{marginBottom:20}}><div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}><Zap size={15} color="#6366f1"/><span style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>Email Allowance</span><span style={{fontSize:11,color:'#64748b'}}>{fr} free today</span>{cr>0&&<span style={{fontSize:11,fontWeight:700,color:'#6366f1',background:'rgba(99,102,241,.06)',padding:'2px 8px',borderRadius:5}}>+{cr.toLocaleString()} boost</span>}</div>
      <button onClick={function(){setShow(!show);}} style={{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 10px rgba(99,102,241,.25)'}}><Rocket size={13}/>{show?'Hide':'Get More Emails'}</button>
    </div>
    {show&&<div style={{padding:'0 20px 18px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
      {packs.map(function(p){return <div key={p.id} style={{background:'linear-gradient(135deg,#f8f7ff,#f0efff)',border:'1px solid rgba(99,102,241,.12)',borderRadius:12,padding:'16px',textAlign:'center',transition:'transform .15s'}} onMouseEnter={function(e){e.currentTarget.style.transform='translateY(-2px)';}} onMouseLeave={function(e){e.currentTarget.style.transform='';}}>
        <div style={{fontSize:24,marginBottom:4}}>{p.label.split(' ')[0]}</div>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:900,color:'#0f172a'}}>{p.credits.toLocaleString()}</div>
        <div style={{fontSize:10,color:'#94a3b8',marginBottom:8}}>emails</div>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:900,color:'#6366f1',marginBottom:8}}>${p.price}</div>
        <div style={{fontSize:9,color:'#94a3b8',marginBottom:10}}>{p.desc}</div>
        <button onClick={function(){buy(p.id);}} disabled={buying===p.id} style={{width:'100%',padding:'8px',borderRadius:8,border:'none',background:buying===p.id?'#cbd5e1':'#6366f1',color:'#fff',fontSize:11,fontWeight:800,cursor:buying===p.id?'default':'pointer',fontFamily:'inherit'}}>{buying===p.id?'...':'Buy'}</button>
      </div>;})}
    </div>}
  </div></div>;
}

function LeadsTab({leads,lists,sequences,onReload,showToast}){
  var [fs,setFs]=useState('all');var [fl,setFl]=useState('all');
  var f=leads.filter(function(l){if(fs!=='all'){if(fs==='hot'){if(!l.is_hot)return false;}else if(l.status!==fs)return false;}if(fl!=='all'){if(fl==='unsorted'){if(l.list_id)return false;}else if(l.list_id!==parseInt(fl))return false;}return true;});
  var lm={};lists.forEach(function(l){lm[l.id]=l;});
  return <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
    <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
      <div style={{display:'flex',gap:3}}>{['all','new','nurturing','hot','converted'].map(function(x){var on=fs===x;return <button key={x} onClick={function(){setFs(x);}} style={{padding:'5px 10px',borderRadius:6,fontSize:10,fontWeight:700,fontFamily:'inherit',cursor:'pointer',border:on?'1.5px solid #6366f1':'1.5px solid #e8ecf2',background:on?'rgba(99,102,241,.05)':'transparent',color:on?'#6366f1':'#94a3b8',textTransform:'capitalize'}}>{x==='hot'?'🔥 Hot':x}</button>;})}</div>
      <div style={{display:'flex',alignItems:'center',gap:8}}><select value={fl} onChange={function(e){setFl(e.target.value);}} style={{padding:'5px 10px',borderRadius:6,fontSize:10,border:'1px solid #e8ecf2',fontFamily:'inherit',color:'#64748b'}}><option value="all">All Lists</option><option value="unsorted">Unsorted</option>{lists.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>;})}</select><span style={{fontSize:11,fontWeight:700,color:'#6366f1'}}>{f.length}</span></div>
    </div>
    {f.length>0?<div style={{maxHeight:480,overflowY:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Lead','List','Status','Emails','Sequence',''].map(function(h){return <th key={h} style={{fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.8,padding:'9px 14px',borderBottom:'2px solid #e8ecf2',textAlign:'left',background:'#fafbfc'}}>{h}</th>;})}</tr></thead><tbody>
    {f.map(function(l){var lst=lm[l.list_id];return <tr key={l.id} onMouseEnter={function(e){e.currentTarget.style.background='#fafbfc';}} onMouseLeave={function(e){e.currentTarget.style.background='';}}><td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8'}}><div style={{display:'flex',alignItems:'center',gap:5}}>{l.is_hot&&<Flame size={11} color="#ef4444"/>}<div><div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{l.name||l.email}</div>{l.name&&<div style={{fontSize:9,color:'#94a3b8'}}>{l.email}</div>}</div></div></td><td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8'}}>{lst?<span style={{fontSize:8,fontWeight:800,padding:'2px 6px',borderRadius:4,background:lst.color+'15',color:lst.color}}>{lst.name}</span>:<span style={{fontSize:8,color:'#cbd5e1'}}>—</span>}</td><td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8'}}><span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:5,textTransform:'capitalize',background:l.is_hot?'#fef2f2':l.status==='nurturing'?'rgba(139,92,246,.06)':l.status==='converted'?'#dcfce7':'rgba(99,102,241,.06)',color:l.is_hot?'#ef4444':l.status==='nurturing'?'#8b5cf6':l.status==='converted'?'#16a34a':'#6366f1'}}>{l.is_hot?'hot':l.status||'new'}</span></td><td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8',fontSize:10,color:'#64748b'}}>{l.emails_sent||0}↑ {l.emails_opened||0}👁</td><td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8'}}><select value={l.sequence_id||''} onChange={function(e){apiPost('/api/leads/'+l.id+'/assign-sequence',{sequence_id:e.target.value?parseInt(e.target.value):null}).then(function(){showToast('Updated','ok');onReload();});}} style={{fontSize:9,padding:'3px 5px',borderRadius:4,border:'1px solid #e8ecf2',fontFamily:'inherit',color:'#64748b',maxWidth:110}}><option value="">None</option>{sequences.map(function(s){return <option key={s.id} value={s.id}>{s.title}</option>;})}</select></td><td style={{padding:'10px 14px',borderBottom:'1px solid #f5f6f8'}}><button onClick={function(){apiDelete('/api/leads/'+l.id).then(onReload);}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer',opacity:.4}} onMouseEnter={function(e){e.currentTarget.style.opacity=1;}} onMouseLeave={function(e){e.currentTarget.style.opacity=.4;}}><Trash2 size={11}/></button></td></tr>;})}
    </tbody></table></div>:<div style={{textAlign:'center',padding:'60px 20px'}}><div style={{fontSize:40,opacity:.15,marginBottom:8}}>📧</div><div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>No leads found</div><div style={{fontSize:12,color:'#94a3b8'}}>Capture from SuperPages or import CSV</div></div>}
  </div>;
}

function ListsTab({lists,sequences,onReload,showToast}){var [ed,setEd]=useState(null);var [nm,setNm]=useState('');var [dc,setDc]=useState('');var [cl,setCl]=useState('#6366f1');var [sq,setSq]=useState('');
  function sn(){setEd('new');setNm('');setDc('');setCl('#6366f1');setSq('');}function se(l){setEd(l.id);setNm(l.name);setDc(l.description);setCl(l.color||'#6366f1');setSq(l.sequence_id||'');}
  function sv(){if(!nm.trim()){showToast('Name required','err');return;}(ed==='new'?apiPost('/api/leads/lists',{name:nm.trim(),description:dc.trim(),color:cl,sequence_id:sq?parseInt(sq):null}):apiPut('/api/leads/lists/'+ed,{name:nm.trim(),description:dc.trim(),color:cl,sequence_id:sq?parseInt(sq):null})).then(function(){showToast('Saved','ok');setEd(null);onReload();}).catch(function(e){showToast(e.message,'err');});}
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0,fontFamily:'Sora,sans-serif'}}>Lead Lists</h3><button onClick={sn} style={{display:'flex',alignItems:'center',gap:4,padding:'9px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 10px rgba(99,102,241,.2)'}}><Plus size={14}/>New List</button></div>
    {ed!==null&&<div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'22px 26px',marginBottom:14,boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><span style={{fontSize:14,fontWeight:800}}>{ed==='new'?'New List':'Edit List'}</span><button onClick={function(){setEd(null);}} style={{fontSize:11,color:'#94a3b8',background:'none',border:'none',cursor:'pointer'}}>Cancel</button></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}><div><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Name</label><input value={nm} onChange={function(e){setNm(e.target.value);}} placeholder="e.g. Facebook Fitness" style={{width:'100%',padding:'11px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} onFocus={function(e){e.target.style.borderColor='#6366f1';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/></div><div><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Description</label><input value={dc} onChange={function(e){setDc(e.target.value);}} style={{width:'100%',padding:'11px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div></div>
      <div style={{display:'flex',gap:12,alignItems:'end',marginBottom:14}}><div><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Colour</label><div style={{display:'flex',gap:4}}>{LIST_COLORS.map(function(c){return <button key={c} onClick={function(){setCl(c);}} style={{width:26,height:26,borderRadius:7,background:c,border:cl===c?'3px solid #0f172a':'3px solid transparent',cursor:'pointer'}}/>;})}</div></div><div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Default Sequence</label><select value={sq} onChange={function(e){setSq(e.target.value);}} style={{width:'100%',padding:'11px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:12,fontFamily:'inherit',background:'#fff'}}><option value="">None</option>{sequences.map(function(s){return <option key={s.id} value={s.id}>{s.title}</option>;})}</select></div></div>
      <button onClick={sv} style={{padding:'10px 24px',borderRadius:10,border:'none',background:'#6366f1',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{ed==='new'?'Create':'Save'}</button>
    </div>}
    {lists.length>0?<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>{lists.map(function(l){return <div key={l.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'20px',position:'relative',transition:'transform .2s,box-shadow .2s'}} onMouseEnter={function(e){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,.1)';}} onMouseLeave={function(e){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='none';}}>
      <div style={{width:6,height:'100%',borderRadius:'3px 0 0 3px',background:l.color||'#6366f1',position:'absolute',left:0,top:0}}/><div style={{paddingLeft:8}}><div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:2}}>{l.name}</div>{l.description&&<div style={{fontSize:10,color:'#94a3b8',marginBottom:6}}>{l.description}</div>}<div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:10}}><span style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:l.color||'#6366f1'}}>{l.lead_count}</span><span style={{fontSize:10,color:'#94a3b8'}}>leads</span></div>
      <div style={{display:'flex',gap:4}}><button onClick={function(){se(l);}} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:'#64748b',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Edit</button><button onClick={function(){if(confirm('Delete?'))apiDelete('/api/leads/lists/'+l.id).then(onReload);}} style={{padding:'5px 10px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Delete</button></div></div>
    </div>;})}</div>:<div style={{textAlign:'center',padding:'60px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}><div style={{fontSize:40,opacity:.15,marginBottom:8}}>📁</div><div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>No lists yet</div><div style={{fontSize:12,color:'#94a3b8'}}>Organize leads by campaign</div></div>}
  </div>;
}

function SequencesTab({sequences,onReload,showToast}){var [ed,setEd]=useState(null);var [ti,setTi]=useState('');var [em,setEm]=useState([]);
  function sn(){setEd('new');setTi('');setEm([{subject:'Welcome!',body_html:'',send_delay_days:0},{subject:'Follow up',body_html:'',send_delay_days:2},{subject:'Last chance',body_html:'',send_delay_days:5}]);}
  function se(s){setEd(s.id);setTi(s.title);setEm(s.emails||[]);}
  function sv(){if(!ti.trim()){showToast('Title required','err');return;}var v=em.filter(function(e){return e.subject.trim();});if(!v.length){showToast('1+ email required','err');return;}(ed==='new'?apiPost('/api/leads/sequences',{title:ti,emails:v}):apiPut('/api/leads/sequences/'+ed,{title:ti,emails:v})).then(function(){showToast('Saved','ok');setEd(null);onReload();}).catch(function(e){showToast(e.message,'err');});}

  if(ed!==null) return <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f3f7',display:'flex',justifyContent:'space-between'}}><h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:0}}>{ed==='new'?'Create Sequence':'Edit Sequence'}</h3><button onClick={function(){setEd(null);}} style={{fontSize:11,color:'#94a3b8',background:'none',border:'none',cursor:'pointer'}}>Cancel</button></div>
    <div style={{padding:'22px 24px'}}>
      <div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:700,color:'#334155',display:'block',marginBottom:6}}>Sequence Name</label><input value={ti} onChange={function(e){setTi(e.target.value);}} placeholder="e.g. Welcome Series" style={{width:'100%',padding:'11px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} onFocus={function(e){e.target.style.borderColor='#6366f1';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/></div>
      {em.map(function(e,i){return <div key={i} style={{background:'#f8f9fb',borderRadius:12,padding:'16px',marginBottom:10,border:'1px solid #e8ecf2'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:12,fontWeight:800,color:'#6366f1'}}>Email {i+1}</span><div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{fontSize:10,color:'#94a3b8'}}>after</span><input type="number" min="0" value={e.send_delay_days} onChange={function(ev){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{send_delay_days:parseInt(ev.target.value)||0}):x;}));}} style={{width:45,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:5,fontSize:11,textAlign:'center',fontFamily:'inherit'}}/><span style={{fontSize:10,color:'#94a3b8'}}>days</span>{em.length>1&&<button onClick={function(){setEm(em.filter(function(x,j){return j!==i;}));}} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer'}}><Trash2 size={11}/></button>}</div></div>
        <input value={e.subject} onChange={function(ev){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{subject:ev.target.value}):x;}));}} placeholder="Subject" style={{width:'100%',padding:'9px 12px',border:'2px solid #e8ecf2',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:8,background:'#fff'}}/>
        <RichTextEditor content={e.body_html} onChange={function(h){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{body_html:h}):x;}));}} placeholder="Email body..."/>
      </div>;})}
      <button onClick={function(){setEm(em.concat([{subject:'',body_html:'',send_delay_days:(em[em.length-1]||{}).send_delay_days+3||3}]));}} style={{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',borderRadius:8,border:'1.5px solid #e8ecf2',background:'#fff',color:'#6366f1',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:16}}><Plus size={11}/>Add Email</button>
      <button onClick={sv} style={{padding:'11px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif',boxShadow:'0 4px 14px rgba(99,102,241,.25)'}}>Save Sequence</button>
    </div></div>;

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0,fontFamily:'Sora,sans-serif'}}>Email Sequences</h3><button onClick={sn} style={{display:'flex',alignItems:'center',gap:4,padding:'9px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 10px rgba(99,102,241,.2)'}}><Plus size={14}/>Create</button></div>
    {sequences.length>0?sequences.map(function(s){return <div key={s.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:12,padding:'16px 20px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between',transition:'transform .15s'}} onMouseEnter={function(e){e.currentTarget.style.transform='translateY(-1px)';}} onMouseLeave={function(e){e.currentTarget.style.transform='';}}><div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{s.title}</div><div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{s.num_emails} emails</div></div>
      <div style={{display:'flex',gap:5}}><button onClick={function(){apiPost('/api/leads/send-sequence-email',{sequence_id:s.id}).then(function(r){showToast('Sent '+r.sent,'ok');onReload();}).catch(function(e){showToast(e.message,'err');});}} style={{padding:'6px 12px',borderRadius:6,border:'none',background:'#16a34a',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Send</button><button onClick={function(){se(s);}} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #e8ecf2',background:'#fff',color:'#64748b',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Edit</button><button onClick={function(){if(confirm('Delete?'))apiDelete('/api/leads/sequences/'+s.id).then(onReload);}} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Del</button></div>
    </div>;}):(<div style={{textAlign:'center',padding:'60px',background:'#fff',borderRadius:14,border:'1px solid #e8ecf2'}}><div style={{fontSize:40,opacity:.15,marginBottom:8}}>⚡</div><div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>No sequences yet</div></div>)}
  </div>;
}

function BroadcastTab({leads,lists,showToast}){var [su,setSu]=useState('');var [ht,setHt]=useState('');var [fs,setFs]=useState('all');var [fl,setFl]=useState('');var [se,setSe]=useState(false);var [st,setSt]=useState(null);
  var c=leads.filter(function(l){if(l.status==='unsubscribed')return false;if(fl&&l.list_id!==parseInt(fl))return false;if(fs!=='all'){if(fs==='hot')return l.is_hot;return l.status===fs;}return true;}).length;
  function sd(){if(!su.trim()){showToast('Subject required','err');return;}setSe(true);apiPost('/api/leads/broadcast',{subject:su,html_content:ht,filter_status:fs,list_id:fl?parseInt(fl):null}).then(function(r){setSe(false);setSt(r.sent||0);showToast('Sent to '+r.sent,'ok');}).catch(function(e){setSe(false);showToast(e.message,'err');});}
  return <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f3f7'}}><h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Broadcast</h3></div>
    <div style={{padding:'22px 24px'}}>
      <div style={{display:'flex',gap:10,marginBottom:16}}><div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>List</label><select value={fl} onChange={function(e){setFl(e.target.value);}} style={{width:'100%',padding:'10px 12px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:12,fontFamily:'inherit',background:'#fff'}}><option value="">All</option>{lists.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>;})}</select></div><div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Status</label><select value={fs} onChange={function(e){setFs(e.target.value);}} style={{width:'100%',padding:'10px 12px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:12,fontFamily:'inherit',background:'#fff'}}><option value="all">All</option><option value="new">New</option><option value="nurturing">Nurturing</option><option value="hot">Hot</option></select></div><div style={{display:'flex',alignItems:'end',paddingBottom:4}}><span style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:900,color:'#6366f1'}}>{c}</span></div></div>
      <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Subject</label><input value={su} onChange={function(e){setSu(e.target.value);}} placeholder="Subject" style={{width:'100%',padding:'11px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} onFocus={function(e){e.target.style.borderColor='#6366f1';}} onBlur={function(e){e.target.style.borderColor='#e8ecf2';}}/></div>
      <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Content</label><RichTextEditor content={ht} onChange={setHt} placeholder="Your broadcast..."/></div>
      <button onClick={sd} disabled={se} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 28px',borderRadius:10,border:'none',background:se?'#cbd5e1':'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',fontSize:14,fontWeight:800,cursor:se?'default':'pointer',fontFamily:'Sora,sans-serif'}}><Send size={14}/>{se?'Sending...':'Send to '+c}</button>
      {st!==null&&<div style={{marginTop:10,fontSize:12,fontWeight:700,color:'#16a34a'}}>✓ Sent to {st}</div>}
    </div></div>;
}

function UploadTab({stats,lists,onReload,showToast}){var [cv,setCv]=useState('');var [pa,setPa]=useState([]);var [li,setLi]=useState('');var [up,setUp]=useState(false);var [re,setRe]=useState(null);
  function pr(){var l=cv.trim().split('\n');var r=[];for(var i=0;i<l.length;i++){var p=l[i].trim().split(',');var e=(p[0]||'').trim().toLowerCase();if(e&&e.includes('@'))r.push({email:e,name:(p[1]||'').trim()});}setPa(r);}
  function hf(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){setCv(ev.target.result);};r.readAsText(f);}
  function du(){if(!pa.length)return;setUp(true);apiPost('/api/leads/upload-csv',{leads:pa,list_id:li?parseInt(li):null}).then(function(r){setUp(false);setRe(r);onReload();showToast('Imported '+r.imported,'ok');}).catch(function(e){setUp(false);showToast(e.message,'err');});}
  return <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f3f7'}}><h3 style={{fontSize:15,fontWeight:800,color:'#0f172a',margin:'0 0 4px'}}>Import CSV</h3><p style={{fontSize:11,color:'#94a3b8',margin:0}}>email,name per line</p></div>
    <div style={{padding:'22px 24px'}}>
      <div style={{display:'flex',gap:12,marginBottom:16}}><div style={{flex:1,background:'rgba(99,102,241,.04)',border:'1px solid rgba(99,102,241,.1)',borderRadius:10,padding:'12px 14px'}}><div style={{fontSize:10,fontWeight:700,color:'#6366f1'}}>Capacity</div><div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:900,color:'#6366f1'}}>{stats.total||0}/{stats.limit||0}</div></div><div style={{flex:2}}><label style={{fontSize:11,fontWeight:700,color:'#94a3b8',display:'block',marginBottom:4}}>Import into</label><select value={li} onChange={function(e){setLi(e.target.value);}} style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:12,fontFamily:'inherit',background:'#fff'}}><option value="">Unsorted</option>{lists.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>;})}</select></div></div>
      <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'28px',borderRadius:12,border:'2px dashed #d1d5db',cursor:'pointer',marginBottom:12}} onMouseEnter={function(e){e.currentTarget.style.borderColor='#6366f1';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';}}><Upload size={24} color="#6366f1"/><span style={{fontSize:13,fontWeight:600,color:'#475569'}}>Upload CSV</span><input type="file" accept=".csv,.txt" onChange={hf} style={{display:'none'}}/></label>
      <textarea value={cv} onChange={function(e){setCv(e.target.value);setPa([]);setRe(null);}} rows={4} placeholder={"email,name\njohn@example.com,John"} style={{width:'100%',padding:'10px 14px',border:'2px solid #e8ecf2',borderRadius:10,fontSize:12,fontFamily:'monospace',outline:'none',boxSizing:'border-box',resize:'vertical',marginBottom:10}}/>
      <div style={{display:'flex',gap:8,marginBottom:14}}><button onClick={pr} style={{padding:'7px 14px',borderRadius:8,border:'1px solid #e8ecf2',background:'#fff',color:'#6366f1',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Preview</button>{pa.length>0&&<span style={{fontSize:11,fontWeight:700,color:'#16a34a',display:'flex',alignItems:'center',gap:4}}><CheckCircle size={12}/>{pa.length} valid</span>}</div>
      {pa.length>0&&<div style={{maxHeight:140,overflowY:'auto',background:'#f8f9fb',borderRadius:8,padding:'8px 12px',border:'1px solid #e8ecf2',marginBottom:14,fontSize:10,color:'#475569'}}>{pa.slice(0,15).map(function(p,i){return <div key={i}>{p.email}{p.name?' — '+p.name:''}</div>;})}{pa.length>15&&<div style={{color:'#94a3b8'}}>+{pa.length-15} more</div>}</div>}
      {re&&<div style={{padding:'10px 14px',background:'#dcfce7',borderRadius:8,border:'1px solid #bbf7d0',marginBottom:14,fontSize:11,color:'#16a34a'}}>✓ {re.imported} imported · {re.duplicates} dups · {re.skipped_over_limit} over limit</div>}
      <button onClick={du} disabled={up||!pa.length} style={{display:'flex',alignItems:'center',gap:5,padding:'11px 24px',borderRadius:10,border:'none',background:(up||!pa.length)?'#cbd5e1':'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:13,fontWeight:800,cursor:(up||!pa.length)?'default':'pointer',fontFamily:'Sora,sans-serif'}}><Upload size={13}/>{up?'...':'Import '+pa.length}</button>
    </div></div>;
}
