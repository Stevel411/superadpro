import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/layout/AppLayout';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { Mail, UserPlus, Send, Upload, Trash2, Plus, Zap, Rocket, Search, Sparkles, HelpCircle } from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';
import MyLeadsHelp from './MyLeadsHelp';
import { TYPE } from '../styles/typography';

// Tab configuration — keys + icons only. Labels come from t() inside component.
var TAB_CONFIG = [
  { key:'leads',     icon:UserPlus, labelKey:'tabLeads' },
  { key:'sequences', icon:Zap,      labelKey:'tabSequences' },
  { key:'broadcast', icon:Send,     labelKey:'tabBroadcast' },
  { key:'import',    icon:Upload,   labelKey:'tabImport' },
  { key:'boost',     icon:Rocket,   labelKey:'tabBoost' },
];

// Status style palette — labels come from t() at render time.
// Structure kept here since colours are UI concern, not translation concern.
var STATUS_PALETTE = {
  new:          { bg:'var(--sap-purple-pale)',  color:'var(--sap-violet)',     labelKey:'statusNew' },
  nurturing:    { bg:'var(--sap-green-bg)',      color:'var(--sap-green-dark)', labelKey:'statusNurturing' },
  hot:          { bg:'#fce7f3',                  color:'#db2777',               labelKey:'statusHot' },
  converted:    { bg:'#ecfeff',                  color:'#0891b2',               labelKey:'statusConverted' },
  unsubscribed: { bg:'var(--sap-bg-page)',       color:'var(--sap-text-muted)', labelKey:'statusUnsubscribed' },
};

var TC = ['var(--sap-indigo)','var(--sap-accent)','var(--sap-green)','var(--sap-amber)','var(--sap-red-bright)','var(--sap-pink)','var(--sap-purple)','#06b6d4'];

export default function MyLeads() {
  var { t } = useTranslation();
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

  if (loading) return <AppLayout title={t('myLeads.superLeadsTitle')}><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-indigo)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;

  return (
    <AppLayout title={t('myLeads.superLeadsTitle')} subtitle={t('myLeads.crmSubtitle')}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .sl-tab{transition:all .15s;cursor:pointer}
        .sl-tab:hover{background:#eef2ff!important;color:#4f46e5!important}
        .sl-row{transition:background .1s}
        .sl-row:hover{background:#f8fafc!important}
        .sl-stat-card{transition:transform .2s,box-shadow .2s}
        .sl-stat-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(23,37,84,.1)!important}
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

      {/* ── Hero banner with cobalt gradient ── */}
      <div style={{background:'linear-gradient(135deg,#0b1e4c 0%,#1e3a8a 55%,#4338ca 100%)',borderRadius:16,padding:'26px 30px',marginBottom:22,position:'relative',overflow:'hidden',boxShadow:'0 8px 28px rgba(23,37,84,.22)'}}>
        {/* Decorative gradient blob */}
        <div style={{position:'absolute',top:-60,right:-60,width:220,height:220,borderRadius:'50%',
                     background:'radial-gradient(circle,rgba(139,92,246,0.25) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,.15)'}}>
                <Mail size={18} color="#a5b4fc"/>
              </div>
              <div style={{fontSize:12,fontWeight:800,letterSpacing:1.4,textTransform:'uppercase',color:'#a5b4fc'}}>{t('myLeads.autoresponderLabel')}</div>
            </div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:30,fontWeight:800,color:'#fff',marginBottom:6,letterSpacing:-.3}}>{t('myLeads.title')}</div>
            <div style={{fontSize:15,color:'rgba(255,255,255,.78)',maxWidth:620,lineHeight:1.5}}>{t('myLeads.subtitle')}</div>
          </div>
          <button onClick={function(){setShowHelp(true);}} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:10,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.08)',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0,backdropFilter:'blur(10px)',transition:'background .2s'}}
                  onMouseEnter={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,.15)'; }}
                  onMouseLeave={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}>
            <HelpCircle size={15}/> {t('myLeads.helpBtn')}
          </button>
        </div>
      </div>

      {/* ── Stat cards with coloured strips + matching icon tiles ── */}
      <div className="sl-stats" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        {[
          {v:stats.total||0,l:t('myLeads.totalLeadsStat'),c:'#6366f1',icon:UserPlus,bg:'rgba(99,102,241,.1)'},
          {v:sequences.length,l:t('myLeads.sequencesStat'),c:'#0ea5e9',icon:Zap,bg:'rgba(14,165,233,.1)'},
          {v:emailStats.sent_today||0,l:t('myLeads.sentTodayStat'),c:'#16a34a',icon:Send,bg:'rgba(22,163,74,.1)'},
          {v:stats.hot||0,l:t('myLeads.hotLeadsStat'),c:'#f59e0b',icon:Rocket,bg:'rgba(245,158,11,.1)'},
        ].map(function(s,i){
          var Ic = s.icon;
          return <div key={i} className="sl-stat-card" style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:'22px 20px',position:'relative',overflow:'hidden',boxShadow:'0 4px 14px rgba(23,37,84,.05)'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,'+s.c+','+s.c+'80)'}}/>
            <div style={{position:'absolute',top:16,right:16,width:36,height:36,borderRadius:10,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Ic size={17} color={s.c}/>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:'#64748b',marginBottom:10,letterSpacing:.3}}>{s.l}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:34,fontWeight:800,color:s.c,letterSpacing:-.5}}>{s.v}</div>
          </div>;
        })}
      </div>

      {msg && <div style={{padding:'12px 18px',borderRadius:10,marginBottom:16,fontSize:14,fontWeight:700,background:msgType==='ok'?'var(--sap-green-bg)':'var(--sap-red-bg)',border:'1px solid '+(msgType==='ok'?'#bbf7d0':'var(--sap-red-bg-mid)'),color:msgType==='ok'?'var(--sap-green-dark)':'var(--sap-red)'}}>{msg}</div>}

      {/* ── Tab bar: filled pill for active, subtle for inactive ── */}
      <div style={{display:'flex',gap:6,marginBottom:22,padding:6,background:'#fff',borderRadius:12,border:'1px solid #e8ecf2',boxShadow:'0 2px 8px rgba(23,37,84,.04)',flexWrap:'wrap'}}>
        {TAB_CONFIG.map(function(tb){
          var a = tab === tb.key;
          var I = tb.icon;
          return <div key={tb.key} className={a?'':'sl-tab'} onClick={function(){setTab(tb.key);}}
            style={{flex:'1 1 auto',minWidth:110,padding:'11px 18px',borderRadius:8,
                    background: a ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'transparent',
                    color: a ? '#fff' : '#64748b',
                    fontSize:14,fontWeight:a?700:600,cursor:'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:7,
                    boxShadow: a ? '0 4px 12px rgba(79,70,229,.3)' : 'none',
                    transition:'all .15s'}}>
            <I size={16}/> {t('myLeads.' + tb.labelKey)}
          </div>;
        })}
      </div>

      {tab==='leads' && <LeadsTab leads={leads} lists={lists} sequences={sequences} refresh={refresh} flash={flash}/>}
      {tab==='sequences' && <SeqTab sequences={sequences} refresh={refresh} flash={flash}/>}
      {tab==='broadcast' && <BcastTab leads={leads} lists={lists} flash={flash}/>}
      {tab==='import' && <ImpTab stats={stats} lists={lists} sequences={sequences} refresh={refresh} flash={flash}/>}
      {tab==='boost' && <BoostTab emailStats={emailStats} refresh={refresh} flash={flash}/>}

      {/* Help panel — slides in from the right as an overlay */}
      <MyLeadsHelp visible={showHelp} onClose={function(){setShowHelp(false);}}/>
    </AppLayout>
  );
}

function LeadsTab({leads,lists,sequences,refresh,flash}) {

  var { t } = useTranslation();
  var [search,setSearch]=useState('');var [fS,setFS]=useState('all');var [fL,setFL]=useState('');
  var lm={}; lists.forEach(function(l){lm[l.id]=l;});
  var filtered=leads.filter(function(l){
    if(search&&!l.email.toLowerCase().includes(search.toLowerCase())&&!(l.name||'').toLowerCase().includes(search.toLowerCase()))return false;
    if(fS!=='all'){if(fS==='hot'){if(!l.is_hot)return false;}else if(l.status!==fS)return false;}
    if(fL&&l.list_id!==parseInt(fL))return false;return true;
  });
  function del(id){if(!window.confirm(t('myLeads.deleteLeadConfirm')))return;apiDelete('/api/leads/'+id).then(function(){flash(t('myLeads.leadDeleted'));refresh();}).catch(function(e){flash(e.message,'err');});}
  function assignSeq(lid,sid){apiPost('/api/leads/'+lid+'/assign-sequence',{sequence_id:sid?parseInt(sid):null}).then(function(){flash('Sequence assigned');refresh();}).catch(function(e){flash(e.message,'err');});}
  function createList(){var name=window.prompt('Enter a name for your new list:');if(!name||!name.trim())return;apiPost('/api/leads/lists',{name:name.trim()}).then(function(){flash('List created');refresh();}).catch(function(e){flash(e.message,'err');});}

  return <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
    <div style={{padding:'14px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <CustomSelect value={fS} onChange={setFS} style={{width:170}} options={[
          {value:'all',label:t('myLeads.filterAllStatuses')},
          {value:'new',label:t('myLeads.statusNew')},
          {value:'nurturing',label:t('myLeads.statusNurturing')},
          {value:'hot',label:t('myLeads.statusHot')},
          {value:'converted',label:t('myLeads.statusConverted')},
        ]}/>
        <CustomSelect value={fL} onChange={setFL} style={{width:160}} options={[{value:'',label:t('myLeads.filterAllLists')}].concat(lists.map(function(l){return {value:String(l.id),label:l.name};}))} />
        <button onClick={createList} style={{padding:'9px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'var(--sap-indigo)',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}><Plus size={15}/> {t('myLeads.newListBtn')}</button>
        <div style={{position:'relative'}}><Search size={15} color="var(--sap-text-muted)" style={{position:'absolute',left:11,top:10}}/><input value={search} onChange={function(e){setSearch(e.target.value);}} placeholder={t('myLeads.searchLeadsPlaceholder')} style={{padding:'9px 10px 9px 32px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',width:200,outline:'none',transition:'border-color .15s'}}/></div>
      </div>
      <div style={{fontSize:14,color:'var(--sap-text-muted)',fontWeight:600}}>{filtered.length} {t('myLeads.contacts') || 'contacts'}</div>
    </div>
    {filtered.length>0?<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:14,minWidth:600}}><thead><tr>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'var(--sap-text-primary)',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.contact')}</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'var(--sap-text-primary)',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.email')}</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'var(--sap-text-primary)',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.status')}</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'var(--sap-text-primary)',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.list')}</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'var(--sap-text-primary)',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.emails')}</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:700,color:'var(--sap-text-primary)',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.sequence')}</th>
      <th style={{textAlign:'right',padding:'14px 18px',borderBottom:'1px solid #e2e8f0'}}></th>
    </tr></thead><tbody>{filtered.map(function(l){
      var statusKey = l.is_hot ? 'hot' : (l.status || 'new');
      var st = STATUS_PALETTE[statusKey] || STATUS_PALETTE.new;
      var li=lm[l.list_id];
      return <tr key={l.id} className="sl-row" style={{borderBottom:'1px solid #f1f5f9'}}>
      <td style={{padding:'14px 18px',fontWeight:600,color:'var(--sap-text-primary)',fontSize:15}}>{l.name||'—'}</td>
      <td style={{padding:'14px 18px',color:'var(--sap-text-secondary)',fontSize:15}}>{l.email}</td>
      <td style={{padding:'14px 18px'}}><span style={{padding:'4px 11px',borderRadius:6,background:st.bg,color:st.color,fontSize:13,fontWeight:600}}>{t('myLeads.' + st.labelKey)}</span></td>
      <td style={{padding:'14px 18px'}}>{li?<span style={{padding:'4px 11px',borderRadius:6,background:li.color+'18',color:li.color,fontSize:13,fontWeight:600}}>{li.name}</span>:<span style={{color:'var(--sap-text-muted)',fontSize:13}}>—</span>}</td>
      <td style={{padding:'14px 18px',color:'var(--sap-text-secondary)',fontSize:14}}>{l.emails_sent||0} {t('myLeads.sent') || 'sent'}</td>
      <td style={{padding:'14px 18px'}}><CustomSelect value={String(l.sequence_id||'')} onChange={function(v){assignSeq(l.id,v);}} small={true} style={{maxWidth:150}} options={[{value:'',label:t('myLeads.noneOption')||'None'}].concat(sequences.map(function(s){return {value:String(s.id),label:s.title};}))}/></td>
      <td style={{padding:'14px 18px',textAlign:'right'}}><button onClick={function(){del(l.id);}} style={{padding:'6px 11px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'var(--sap-red)',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}><Trash2 size={13}/></button></td>
    </tr>;})}</tbody></table></div>
    :<div style={{textAlign:'center',padding:'60px 20px'}}><UserPlus size={32} color="var(--sap-text-ghost)" style={{marginBottom:10}}/><div style={{fontSize:16,fontWeight:700,color:'var(--sap-text-muted)'}}>{t('myLeads.noLeadsYet')}</div><div style={{fontSize:14,color:'var(--sap-text-muted)',marginTop:6,lineHeight:1.5,maxWidth:420,margin:'6px auto 0'}}>{t('myLeads.noLeadsDesc')}</div></div>}
  </div>;
}

function SeqTab({sequences,refresh,flash}) {

  var { t } = useTranslation();
  var [ed,setEd]=useState(null);var [title,setTitle]=useState('');var [em,setEm]=useState([]);var [gen,setGen]=useState(false);
  function startNew(){setEd('new');setTitle('');setEm([{subject:'Welcome!',body_html:'',send_delay_days:0},{subject:'Follow up — quick tip',body_html:'',send_delay_days:2},{subject:'Last chance to take action',body_html:'',send_delay_days:5}]);}
  function editEx(s){setEd(s.id);setTitle(s.title);setEm(s.emails||[]);}
  function save(){if(!title.trim()){flash('Title required','err');return;}var c=em.filter(function(e){return e.subject&&e.subject.trim();});if(!c.length){flash('At least one email required','err');return;}(ed==='new'?apiPost('/api/leads/sequences',{title:title,emails:c}):apiPut('/api/leads/sequences/'+ed,{title:title,emails:c})).then(function(){flash('Sequence saved');setEd(null);refresh();}).catch(function(e){flash(e.message,'err');});}
  function delSeq(id){if(!window.confirm('Delete?'))return;apiDelete('/api/leads/sequences/'+id).then(function(){flash('Deleted');refresh();}).catch(function(e){flash(e.message,'err');});}
  function genAI(){setGen(true);var n=window.prompt('What niche? (e.g. fitness, crypto, marketing)');if(!n){setGen(false);return;}apiPost('/api/leads/sequences',{title:n.charAt(0).toUpperCase()+n.slice(1)+' Welcome Series',niche:n,emails:[{subject:'Welcome — your journey starts here',body_html:'<p>'+t('myLeads.welcomeDefault')+'</p>',send_delay_days:0},{subject:'Quick tip to get started',body_html:'<p>'+t('myLeads.tipDefault')+' '+n+'</p>',send_delay_days:1},{subject:'What others are saying',body_html:'<p>'+t('myLeads.achieveDefault')+'</p>',send_delay_days:3},{subject:"Don't miss out",body_html:'<p>'+t('myLeads.urgencySubject')+'</p>',send_delay_days:5},{subject:'Final call — are you in?',body_html:'<p>'+t('myLeads.lastChanceDefault')+'</p>',send_delay_days:7}]}).then(function(){flash('AI sequence created — edit to customise');setGen(false);refresh();}).catch(function(e){flash(e.message,'err');setGen(false);});}
  function sendNext(sid){apiPost('/api/leads/send-sequence-email',{sequence_id:sid}).then(function(r){flash('Sent '+(r.sent||0)+' emails');refresh();}).catch(function(e){flash(e.message,'err');});}

  if(ed!==null)return <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800}}>{ed==='new'?'Create':'Edit'} Sequence</div><button onClick={function(){setEd(null);}} style={{fontSize:12,color:'var(--sap-text-muted)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>{t('myLeads.cancel')}</button></div>
    <div style={{padding:'20px 24px'}}>
      <div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>{t('myLeads.sequenceName')}</label><input value={title} onChange={function(e){setTitle(e.target.value);}} placeholder={t("myLeads.sequenceNamePlaceholder")} style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      {em.map(function(e,i){var color=TC[i%TC.length];return <div key={i} style={{background:'var(--sap-bg-input)',borderRadius:12,padding:16,marginBottom:10,border:'1px solid #e8ecf2',borderLeft:'3px solid '+color}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontSize:12,fontWeight:800,color:color}}>Email {i+1}</span><div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{fontSize:10,color:'var(--sap-text-muted)'}}>{t('myLeads.after')}</span><input type="number" min="0" value={e.send_delay_days} onChange={function(ev){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{send_delay_days:parseInt(ev.target.value)||0}):x;}));}} style={{width:45,padding:4,border:'1px solid #e2e8f0',borderRadius:5,fontSize:11,textAlign:'center'}}/><span style={{fontSize:10,color:'var(--sap-text-muted)'}}>{t('myLeads.days')}</span>{em.length>1&&<button onClick={function(){setEm(em.filter(function(x,j){return j!==i;}));}} style={{color:'var(--sap-red)',background:'none',border:'none',cursor:'pointer',padding:2}}><Trash2 size={12}/></button>}</div></div>
        <input value={e.subject} onChange={function(ev){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{subject:ev.target.value}):x;}));}} placeholder={t("myLeads.subjectPlaceholder")} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:8,background:'#fff'}}/>
        <RichTextEditor content={e.body_html} onChange={function(h){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{body_html:h}):x;}));}} placeholder={t("myLeads.bodyPlaceholder")}/>
      </div>;})}
      <button onClick={function(){setEm(em.concat([{subject:'',body_html:'',send_delay_days:(em.length>0?(em[em.length-1].send_delay_days||0)+2:0)}]));}} style={{display:'flex',alignItems:'center',gap:4,padding:'8px 14px',borderRadius:8,border:'1.5px solid #e8ecf2',background:'#fff',color:'var(--sap-indigo)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:20}}><Plus size={12}/> {t('myLeads.addEmail')}</button>
      <button onClick={save} style={{padding:'12px 28px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>{t('myLeads.saveSequence')}</button>
    </div></div>;

  return <div>
    <div style={{display:'flex',gap:10,marginBottom:16}}>
      <button onClick={startNew} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:14,borderRadius:10,border:'none',background:'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Plus size={16}/> {t('myLeads.createSequenceBtn')}</button>
      <button onClick={genAI} disabled={gen} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:14,borderRadius:10,border:'none',background:'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:13,fontWeight:700,cursor:gen?'wait':'pointer',fontFamily:'inherit'}}><Sparkles size={16}/> {gen?'Generating...':'Generate with AI'}</button>
    </div>
    {sequences.length>0?sequences.map(function(sq){var se=sq.emails||[];return <div key={sq.id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',marginBottom:12}}>
      <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div><div style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)'}}>{sq.title}</div><div style={{fontSize:11,color:'var(--sap-text-muted)',marginTop:2}}>{sq.num_emails} emails</div></div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <span style={{padding:'4px 10px',borderRadius:6,background:sq.is_active?'var(--sap-green-bg)':'var(--sap-bg-page)',color:sq.is_active?'var(--sap-green-dark)':'var(--sap-text-muted)',fontSize:10,fontWeight:700}}>{sq.is_active?'Active':'Paused'}</span>
          <button onClick={function(){sendNext(sq.id);}} style={{padding:'4px 12px',borderRadius:6,border:'none',background:'var(--sap-green)',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('myLeads.sendNext')}</button>
          <button onClick={function(){editEx(sq);}} style={{padding:'4px 12px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'var(--sap-text-secondary)',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('myLeads.edit')}</button>
          <button onClick={function(){delSeq(sq.id);}} style={{padding:'4px 12px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'var(--sap-red)',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('myLeads.delete')}</button>
        </div>
      </div>
      {se.length>0&&<div style={{padding:'18px 20px',display:'flex',alignItems:'center',overflowX:'auto'}}>{se.map(function(e,i){var c=TC[i%TC.length];var last=i===se.length-1;return <div key={i} style={{display:'flex',alignItems:'center',flex:last?'0 0 auto':1}}>
        <div style={{textAlign:'center',minWidth:80}}>
          <div style={{width:36,height:36,borderRadius:10,background:c,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px'}}><Mail size={16} color="#fff"/></div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--sap-text-primary)',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.subject||'Email '+(i+1)}</div>
          <div style={{fontSize:10,color:'var(--sap-text-muted)'}}>Day {e.send_delay_days||0}</div>
        </div>
        {!last&&<div style={{flex:1,height:2,background:'var(--sap-border)',margin:'0 4px',marginBottom:24}}/>}
      </div>;})}</div>}
    </div>;}):<div style={{textAlign:'center',padding:'60px 20px',background:'#fff',borderRadius:14,border:'1px solid #e2e8f0'}}><Zap size={32} color="var(--sap-text-ghost)" style={{marginBottom:8}}/><div style={{fontSize:14,fontWeight:700,color:'var(--sap-text-muted)'}}>{t('myLeads.noSequences')}</div><div style={{fontSize:12,color:'var(--sap-text-muted)',marginTop:4}}>{t('myLeads.noSequencesDesc')}</div></div>}
  </div>;
}

function BcastTab({leads,lists,flash}) {

  var { t } = useTranslation();
  var [sub,setSub]=useState('');var [html,setHtml]=useState('');var [fS,setFS]=useState('all');var [fL,setFL]=useState('');var [s,setS]=useState(false);var [sent,setSent]=useState(null);
  var ct=leads.filter(function(l){if(l.status==='unsubscribed')return false;if(fL&&l.list_id!==parseInt(fL))return false;if(fS!=='all'){if(fS==='hot')return l.is_hot;return l.status===fS;}return true;}).length;
  function send(){if(!sub.trim()){flash('Subject required','err');return;}setS(true);apiPost('/api/leads/broadcast',{subject:sub,html_content:html,filter_status:fS,list_id:fL?parseInt(fL):null}).then(function(r){setS(false);setSent(r.sent||0);flash('Broadcast sent to '+(r.sent||0)+' leads');}).catch(function(e){setS(false);flash(e.message,'err');});}

  return <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f5f9'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:4}}>{t('myLeads.broadcastTitle')}</div><div style={{fontSize:12,color:'var(--sap-text-muted)'}}>{t('myLeads.broadcastDesc')}</div></div>
    <div style={{padding:'20px 24px'}}>
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('myLeads.listLabel')}</label><CustomSelect value={fL} onChange={setFL} options={[{value:'',label:'All lists'}].concat(lists.map(function(l){return {value:String(l.id),label:l.name};}))}/></div>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('myLeads.statusLabel')}</label><CustomSelect value={fS} onChange={setFS} options={[{value:'all',label:'All'},{value:'new',label:'New'},{value:'nurturing',label:'Nurturing'},{value:'hot',label:'Hot'}]}/></div>
        <div style={{display:'flex',alignItems:'flex-end',paddingBottom:2}}><span style={{fontSize:14,fontWeight:800,color:'var(--sap-indigo)'}}>{ct} recipients</span></div>
      </div>
      <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('myLeads.subjectLabel')}</label><input value={sub} onChange={function(e){setSub(e.target.value);}} style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('myLeads.contentLabel')}</label><RichTextEditor content={html} onChange={setHtml} placeholder={t("myLeads.broadcastBodyPlaceholder")}/></div>
      <button onClick={send} disabled={s} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 24px',borderRadius:10,border:'none',background:s?'var(--sap-text-ghost)':'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',fontSize:13,fontWeight:800,cursor:s?'default':'pointer',fontFamily:'Sora,sans-serif'}}><Send size={14}/>{s?'Sending...':'Send to '+ct}</button>
      {sent!==null&&<div style={{marginTop:10,fontSize:12,fontWeight:700,color:'var(--sap-green)'}}>{t('myLeads.sentToLeads')} {sent} {t('myLeads.leads')}</div>}
    </div></div>;
}

function ImpTab({stats,lists,sequences,refresh,flash}) {

  var { t } = useTranslation();
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
      <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,marginBottom:4}}>{t('myLeads.importLeads')}</div>
      <div style={{fontSize:13,color:'var(--sap-text-secondary)'}}>{t("myLeads.importDescFull")}</div>
    </div>
    <div style={{padding:'20px 24px'}}>
      {/* Lead count + capacity */}
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        <div style={{flex:1,background:'rgba(99,102,241,.04)',border:'1px solid rgba(99,102,241,.12)',borderRadius:10,padding:'14px 16px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--sap-indigo)'}}>{t('myLeads.currentLeads')}</div>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'var(--sap-indigo)'}}>{stats.total||0}<span style={{fontSize:13,color:'var(--sap-text-secondary)',fontWeight:500}}> / {stats.limit||5000}</span></div>
          <div style={{width:'100%',height:4,background:'var(--sap-border)',borderRadius:2,marginTop:8}}><div style={{height:4,background:'var(--sap-indigo)',borderRadius:2,width:Math.min(100,((stats.total||0)/(stats.limit||5000))*100)+'%'}}/></div>
        </div>
      </div>

      {/* Import settings */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
        <div><label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>{t('myLeads.assignToList')}</label><CustomSelect value={listId} onChange={setListId} options={[{value:'',label:'No list (unsorted)'}].concat(lists.map(function(l){return {value:String(l.id),label:l.name};}))}/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>{t('myLeads.autoAssignSequence')}</label><CustomSelect value={seqId} onChange={setSeqId} options={[{value:'',label:'No sequence'}].concat(sequences.map(function(s){return {value:String(s.id),label:s.title};}))}/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>{t('myLeads.importAsStatus')}</label><CustomSelect value={impStatus} onChange={setImpStatus} options={[{value:'new',label:'New'},{value:'hot',label:'Hot'},{value:'nurturing',label:'Nurturing'}]}/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>{t('myLeads.sourceLabel')}</label><input value={source} onChange={function(e){setSource(e.target.value);}} placeholder={t('myLeads.importPlaceholder')} style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      </div>

      {/* Upload area */}
      <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:32,borderRadius:12,border:'2px dashed #d1d5db',cursor:'pointer',marginBottom:12,transition:'border-color .15s,background .15s',background:'#fafbfc'}} onMouseEnter={function(e){e.currentTarget.style.borderColor='var(--sap-indigo)';e.currentTarget.style.background='#f5f3ff';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';e.currentTarget.style.background='#fafbfc';}}>
        <Upload size={28} color="var(--sap-indigo)"/>
        <span style={{fontSize:14,fontWeight:700,color:'var(--sap-text-primary)'}}>{t('myLeads.uploadCsv')}</span>
        <span style={{fontSize:12,color:'var(--sap-text-muted)'}}>{t('myLeads.orPasteBelow')}</span>
        <input type="file" accept=".csv,.txt,.tsv" onChange={function(e){var f=e.target.files[0];if(f){var rd=new FileReader();rd.onload=function(ev){setCsv(ev.target.result);setParsed([]);setResult(null);};rd.readAsText(f);}}} style={{display:'none'}}/>
      </label>

      <textarea value={csv} onChange={function(e){setCsv(e.target.value);setParsed([]);setResult(null);}} rows={5} placeholder={"email,name\njohn@example.com,John Smith\nsarah@example.com,Sarah Jones"} style={{width:'100%',padding:'12px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:12,fontFamily:'monospace',outline:'none',boxSizing:'border-box',resize:'vertical',marginBottom:12}}/>

      {/* Preview + Import buttons */}
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
        <button onClick={parse} style={{padding:'10px 20px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'#fff',color:'var(--sap-indigo)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('myLeads.previewValidate')}</button>
        {parsed.length>0 && <span style={{fontSize:12,fontWeight:700,color:'var(--sap-green)'}}>{parsed.length} valid emails found</span>}
      </div>

      {/* Preview table */}
      {parsed.length>0 && <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,border:'1px solid #e2e8f0',marginBottom:16,maxHeight:200,overflowY:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead><tr><th style={{textAlign:'left',padding:'8px 14px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:11,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.emailCol')}</th><th style={{textAlign:'left',padding:'8px 14px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:11,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.nameCol')}</th></tr></thead>
          <tbody>{parsed.slice(0,20).map(function(l,i){return <tr key={i} style={{borderTop:i>0?'1px solid #f1f5f9':'none'}}><td style={{padding:'6px 14px',color:'var(--sap-text-primary)'}}>{l.email}</td><td style={{padding:'6px 14px',color:'var(--sap-text-secondary)'}}>{l.name||'—'}</td></tr>;})}</tbody>
        </table>
        {parsed.length>20 && <div style={{padding:'8px 14px',fontSize:11,color:'var(--sap-text-muted)',borderTop:'1px solid #e2e8f0'}}>...and {parsed.length-20} more</div>}
      </div>}

      {/* Results */}
      {result && <div style={{padding:'14px 18px',background:'var(--sap-green-bg)',border:'1px solid #bbf7d0',borderRadius:10,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:'var(--sap-green-dark)',marginBottom:6}}>{result.imported} leads imported successfully</div>
        <div style={{fontSize:12,color:'var(--sap-text-secondary)',lineHeight:1.8}}>
          {result.duplicates>0 && <div>{result.duplicates} duplicates skipped</div>}
          {result.invalid_emails>0 && <div>{result.invalid_emails} invalid emails rejected</div>}
          {result.disposable_blocked>0 && <div>{result.disposable_blocked} disposable emails blocked</div>}
          {result.skipped_over_limit>0 && <div>{result.skipped_over_limit} skipped (over lead limit)</div>}
        </div>
      </div>}

      <button onClick={upload} disabled={uploading||!parsed.length}
        style={{display:'flex',alignItems:'center',gap:6,padding:'14px 28px',borderRadius:10,border:'none',background:(uploading||!parsed.length)?'var(--sap-text-ghost)':'linear-gradient(135deg,#6366f1,#818cf8)',color:'#fff',fontSize:14,fontWeight:800,cursor:(uploading||!parsed.length)?'default':'pointer',fontFamily:'Sora,sans-serif'}}>
        <Upload size={16}/>{uploading?'Importing...':'Import '+parsed.length+' leads'}
      </button>

      {/* Format help */}
      <div style={{marginTop:20,padding:'14px 18px',background:'var(--sap-bg-elevated)',borderRadius:10,border:'1px solid #f1f5f9'}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',marginBottom:6}}>{t('myLeads.acceptedFormats')}</div>
        <div style={{fontSize:12,color:'var(--sap-text-muted)',lineHeight:1.8}}>
          CSV from Mailchimp, AWeber, ConvertKit, ActiveCampaign, or any email platform. Format: <code style={{background:'var(--sap-border)',padding:'2px 6px',borderRadius:4,fontSize:11}}>{t('myLeads.csvFormat')}</code> (one per line). Comma, semicolon, and tab delimiters supported. Disposable email addresses are automatically filtered.
        </div>
      </div>
    </div></div>;
}

function BoostTab({emailStats,refresh,flash}) {

  var { t } = useTranslation();
  var [buying,setBuying]=useState('');
  var packs=emailStats.boost_packs||[{id:'boost_1k',credits:1000,price:5,label:'1,000 Emails',desc:'Perfect for a targeted campaign'},{id:'boost_5k',credits:5000,price:19,label:'5,000 Emails',desc:'Run multiple sequences'},{id:'boost_10k',credits:10000,price:29,label:'10,000 Emails',desc:'Scale your outreach'},{id:'boost_50k',credits:50000,price:99,label:'50,000 Emails',desc:'Enterprise-level volume'}];
  function buy(pid){setBuying(pid);apiPost('/api/leads/buy-boost',{pack_id:pid}).then(function(r){setBuying('');flash('+'+(r.credits_added||0)+' email credits added');refresh();}).catch(function(e){setBuying('');flash(e.message,'err');});}

  return <div>
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'20px 24px',marginBottom:16}}>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:12}}>{t('myLeads.emailCredits')}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}><div style={{fontSize:10,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>{t('myLeads.freeToday')}</div><div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'var(--sap-green)'}}>{emailStats.free_remaining||0}</div><div style={{fontSize:10,color:'var(--sap-text-muted)'}}>of {emailStats.daily_limit||200}</div></div>
        <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}><div style={{fontSize:10,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>{t('myLeads.boostCredits')}</div><div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'var(--sap-purple)'}}>{(emailStats.boost_credits||0).toLocaleString()}</div></div>
        <div style={{background:'var(--sap-bg-elevated)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}><div style={{fontSize:10,fontWeight:700,color:'var(--sap-text-muted)',marginBottom:4}}>{t('myLeads.totalAvailable')}</div><div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'var(--sap-accent)'}}>{(emailStats.total_available||0).toLocaleString()}</div></div>
      </div>
    </div>
    <div style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,marginBottom:12}}>{t('myLeads.buyBoostPacks')}</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
      {packs.map(function(pk){var ib=buying===pk.id;return <div key={pk.id} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'18px 20px',display:'flex',flexDirection:'column'}}>
        <div style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:2}}>{(pk.label||'').replace(/[^\w\s,]/g,'')}</div>
        <div style={{fontSize:11,color:'var(--sap-text-muted)',marginBottom:12,flex:1}}>{pk.desc}</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'var(--sap-text-primary)'}}>${pk.price}</div>
          <button onClick={function(){buy(pk.id);}} disabled={ib} style={{padding:'8px 16px',borderRadius:8,border:'none',background:ib?'var(--sap-text-ghost)':'linear-gradient(135deg,#8b5cf6,#a78bfa)',color:'#fff',fontSize:11,fontWeight:700,cursor:ib?'wait':'pointer',fontFamily:'inherit'}}>{ib?'Buying...':'Buy'}</button>
        </div>
      </div>;})}
    </div>
    <div style={{fontSize:11,color:'var(--sap-text-muted)',marginTop:12,textAlign:'center'}}>{t('myLeads.boostCreditsDesc')}</div>
  </div>;
}
