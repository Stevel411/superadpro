// v2 chunk-hash bump
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import AlShell from '../components/layout/AlShell';
import RichTextEditor from '../components/editor/RichTextEditor';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { Mail, UserPlus, Send, Upload, Trash2, Plus, Zap, Rocket, Search, Sparkles, HelpCircle, Info, X, Wallet, CreditCard, Coins, Magnet, Megaphone, Shield, CheckCircle2, Clock } from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';
import MyLeadsHelp from './MyLeadsHelp';
import { TYPE } from '../styles/typography';
import { useConsentGate } from '../components/PurchaseConsentModal';

// Self-custody (BSC) rail components are heavy (wagmi/viem ~150kB) — lazy-load
// them so they're only fetched if a member actually picks the wallet rail.
var _wcModule = null;
function _loadWC() { if (!_wcModule) _wcModule = import('../components/WalletConnect'); return _wcModule; }
var WalletConnectProvider = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectProvider }; }); });
var WalletConnectGate = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletConnectGate }; }); });
var WalletPayLink = lazy(function() { return _loadWC().then(function(m) { return { default: m.WalletPayLink }; }); });

// Tab configuration — keys + icons only. Labels come from t() inside component.
var TAB_CONFIG = [
  { key:'leads',     icon:UserPlus, labelKey:'tabLeads' },
  { key:'sequences', icon:Zap,      labelKey:'tabSequences' },
  { key:'broadcast', icon:Send,     labelKey:'tabBroadcast' },
  { key:'import',    icon:Upload,   labelKey:'tabImport' },
  { key:'how',       icon:Shield,   labelKey:'tabHow' },
];

// Status style palette — labels come from t() at render time.
// Structure kept here since colours are UI concern, not translation concern.
var STATUS_PALETTE = {
  new:          { bg:'var(--sap-purple-pale)',  color:'var(--sap-violet)',     labelKey:'statusNew' },
  nurturing:    { bg:'var(--sap-green-bg)',      color:'var(--sap-green-dark)', labelKey:'statusNurturing' },
  hot:          { bg:'#fce7f3',                  color:'#db2777',               labelKey:'statusHot' },
  converted:    { bg:'#f3f5fb',                  color:'#0891b2',               labelKey:'statusConverted' },
  unsubscribed: { bg:'var(--sap-bg-page)',       color:'var(--sap-text-muted)', labelKey:'statusUnsubscribed' },
};

var TC = ['var(--sap-indigo)','var(--sap-accent)','var(--sap-green)','var(--sap-amber)','var(--sap-red-bright)','var(--sap-pink)','var(--sap-purple)','#e8203f'];

export default function MyLeads() {
  var { t } = useTranslation();
  // Read ?tab= from URL on mount so /pro/leads?tab=broadcast lands
  // directly on the Broadcast composer. Used by the Funnels activity
  // feed's "Send broadcast" CTA. Falls back to 'leads' for anything
  // not in the tab list. Added 18 May 2026 (Campaign Hub Commit C).
  var INITIAL_TAB = (function(){
    try {
      var qp = new URLSearchParams(window.location.search).get('tab') || '';
      var valid = TAB_CONFIG.map(function(t){ return t.key; });
      return valid.indexOf(qp) >= 0 ? qp : 'leads';
    } catch(e) { return 'leads'; }
  })();
  var [tab, setTab] = useState(INITIAL_TAB);
  var [leads, setLeads] = useState([]);
  var [sequences, setSequences] = useState([]);
  var [lists, setLists] = useState([]);
  var [stats, setStats] = useState({});
  var [emailStats, setEmailStats] = useState({});
  var [loading, setLoading] = useState(true);
  var [msg, setMsg] = useState('');
  var [msgType, setMsgType] = useState('ok');
  var [showHelp, setShowHelp] = useState(false);
  var [showBuy, setShowBuy] = useState(false);
  var [sendDomains, setSendDomains] = useState([]);
  var [leadsStatusJump, setLeadsStatusJump] = useState(null); // hot-chip -> Leads tab pre-filtered

  function flash(t, ty) { setMsg(t); setMsgType(ty || 'ok'); setTimeout(function() { setMsg(''); }, 4000); }

  var refresh = useCallback(function() {
    Promise.all([apiGet('/api/leads'), apiGet('/api/leads/sequences'), apiGet('/api/leads/lists'), apiGet('/api/leads/stats'), apiGet('/api/leads/email-stats'), apiGet('/api/sending-domains').catch(function(){return {};})])
      .then(function(r) { setLeads(r[0].leads || []); setSequences(r[1].sequences || []); setLists(r[2].lists || []); setStats(r[3] || {}); setEmailStats(r[4] || {}); setSendDomains((r[5] && r[5].domains) || []); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, []);

  useEffect(function() { refresh(); }, [refresh]);

  var helpBtn = <button onClick={function(){setShowHelp(true);}} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:9,border:'1.5px solid #cbd5e1',background:'#fff',color:'#1e293b',fontSize:13.5,fontWeight:800,boxShadow:'0 2px 8px rgba(23,37,84,.08)',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}><HelpCircle size={15}/> {t('myLeads.helpBtn')}</button>;

  if (loading) return <AlShell active="ai-tools" back={{ to: '/ai-tools', label: 'AI Tools' }}><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#c8102e',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AlShell>;

  var verifiedDomain = null;
  for (var di = 0; di < sendDomains.length; di++) { if (sendDomains[di].status === 'verified') { verifiedDomain = sendDomains[di]; break; } }

  return (
    <AlShell active="ai-tools" back={{ to: '/ai-tools', label: 'AI Tools' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .sl-tab{transition:all .15s;cursor:pointer}
        .sl-tab:hover{background:#e0e7ff!important;color:#0a1f52!important;box-shadow:0 3px 10px rgba(10,31,82,.18);transform:translateY(-1px)}
        .sl-row{transition:background .1s}
        .sl-row:hover{background:#f8fafc!important}
        .sl-stat-card{transition:transform .2s,box-shadow .2s}
        .sl-stat-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(23,37,84,.1)!important}
        @media(max-width:767px){.sl-stats{grid-template-columns:1fr 1fr!important}}
        .sl-select{
          width:100%;padding:10px 36px 10px 14px;border-radius:10px;
          border:1.5px solid #cbd5e1;background:#fff;color:#1e293b;box-shadow:0 2px 6px rgba(23,37,84,.05);
          font-size:14px;font-family:inherit;font-weight:700;cursor:pointer;
          appearance:none;-webkit-appearance:none;-moz-appearance:none;
          background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2364748b%27 stroke-width=%272.5%27%3E%3Cpath d=%27M6 9l6 6 6-6%27/%3E%3C/svg%3E");
          background-repeat:no-repeat;background-position:right 12px center;
          transition:border-color .15s,box-shadow .15s;outline:none;
        }
        .sl-select:hover{border-color:#9db0e0}
        .sl-select:focus{border-color:#12388f;box-shadow:0 0 0 3px rgba(200,16,46,.1)}
        .sl-select option{background:#fff;color:#0f172a;padding:8px}
        .sl-hero{background:#fff;border:1.5px solid #dfe6f0;border-radius:14px;padding:26px 24px 24px;margin-bottom:12px;text-align:center;box-shadow:0 4px 16px rgba(23,37,84,.09),0 1px 3px rgba(23,37,84,.05)}
        .sl-chip{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:#12388f;background:#eef4ff;border:1.5px solid #dbe6fb;border-radius:20px;padding:8px 16px;white-space:nowrap;box-shadow:0 2px 6px rgba(30,58,138,.08)}
        .sl-hero-hl-m{display:none}
        @media(max-width:900px){.sl-hero-hl-m{display:block}}
        @media(max-width:520px){.sl-hero{padding:22px 16px 18px}}
        .sl-ctrl{display:flex;gap:12px;align-items:stretch;flex-wrap:wrap}
        .sl-tabsbox{display:flex;gap:5px;padding:5px;background:#fff;border:1.5px solid #dfe6f0;border-radius:12px;box-shadow:0 4px 16px rgba(23,37,84,.09),0 1px 3px rgba(23,37,84,.05);flex:0 1 auto}
        .sl-strip{flex:1;min-width:300px;display:flex;align-items:center;gap:12px;background:#fff;border:1.5px solid #dfe6f0;border-radius:12px;padding:8px 16px;box-shadow:0 4px 16px rgba(23,37,84,.09),0 1px 3px rgba(23,37,84,.05)}
        .sl-search{flex:0 1 300px;min-width:180px}
                .sl-empty-acts{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:520px;margin:0 auto}
        @media(max-width:767px){
          .sl-ctrl{flex-direction:column}
          .sl-tabsbox{width:100%}
          .sl-strip{min-width:0}
          .sl-search{flex:1 1 100%;min-width:100%}
          .sl-md{display:none}
          .sl-empty-acts{grid-template-columns:1fr}
        }
      `}</style>

      {/* ── Email Marketing hero (AL rebrand 12 Jul): navy band + purpose
             line + job chips. Replaces the lost page title (categoryBack
             chrome renders no title) with tool-level branding. Slim card,
             not the old 130px gradient banner. ── */}
      <div style={{background:'#0a1f52',borderRadius:22,color:'#fff',padding:'24px 28px',boxShadow:'0 24px 50px -28px rgba(10,31,82,.55)',marginBottom:16,display:'flex',alignItems:'center',gap:16}}>
        <div style={{width:54,height:54,borderRadius:15,background:'linear-gradient(120deg,#c8102e,#e8203f)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Mail size={26} color="#fff"/></div>
        <div>
          <div style={{fontWeight:900,fontSize:24,letterSpacing:-.7}}>Email Marketing</div>
          <div style={{fontSize:14,color:'#c9d6f7',fontWeight:600,marginTop:3}}>Collect leads, build your list, and send email that lands.</div>
        </div>
      </div>

      {/* ── Control row: tabs (with live counts) + slim status strip.
             Replaced the hero banner (title already lives in the topbar), the
             four stat cards (counts moved onto the tabs — the number now
             navigates), and the full-height AllowanceBar (compressed into the
             strip, Buy affordance retained). 2 Jul 2026, mockup-approved. ── */}
      <div className="sl-ctrl">
        <div className="sl-tabsbox">
          {TAB_CONFIG.map(function(tb){
            var a = tab === tb.key;
            var I = tb.icon;
            var count = tb.key === 'leads' ? (stats.total||0) : (tb.key === 'sequences' ? sequences.length : null);
            return <div key={tb.key} className={a?'':'sl-tab'} onClick={function(){setTab(tb.key);}}
              style={{padding:'12px 20px',borderRadius:8,
                      background: a ? 'linear-gradient(135deg,#0e2a6e,#12388f)' : 'transparent',
                      color: a ? '#fff' : '#1e293b',
                      fontSize:15,fontWeight:800,cursor:'pointer',whiteSpace:'nowrap',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:7,
                      boxShadow: a ? '0 4px 12px rgba(10,31,82,.3)' : 'none',
                      transition:'all .15s',flex:'1 1 auto'}}>
              <I size={15}/> {t('myLeads.' + tb.labelKey)}
              {count !== null && <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:11.5,fontWeight:700,borderRadius:20,padding:'2px 8px',background: a ? 'rgba(255,255,255,.22)' : '#eef2f8', color: a ? '#fff' : '#1e293b'}}>{count}</span>}
            </div>;
          })}
        </div>
        <SlimStatus emailStats={emailStats} hot={stats.hot||0}
          onBuy={function(){setShowBuy(true);}}
          onHot={function(){ setLeadsStatusJump({v:'hot'}); setTab('leads'); }}
          extra={helpBtn}/>
      </div>

      {/* Send-from-your-own-brand — state-aware: verified members get the
          slim confirmation line, everyone else gets the guided CTA. */}
      {verifiedDomain ? (
        <Link to="/sending-domains" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:9,background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'10px 16px',marginTop:12,fontSize:14,fontWeight:700,color:'#1e293b'}}>
          <span style={{color:'#16a34a',fontWeight:800}}>&#10003;</span>
          Sending as{verifiedDomain.from_name ? <strong style={{color:'#0f172a'}}>&nbsp;{verifiedDomain.from_name}</strong> : null}
          <code style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:12,color:'#0f172a',fontWeight:700}}>&lt;{verifiedDomain.from_address}&gt;</code>
          <span style={{marginLeft:'auto',color:'#c8102e',fontWeight:800,fontSize:12.5,whiteSpace:'nowrap'}}>change &rarr;</span>
        </Link>
      ) : (
        <Link to="/sending-domains" style={{textDecoration:'none',display:'block',marginTop:12}}>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'13px 18px',borderRadius:12,
                       background:'linear-gradient(135deg,var(--sap-cobalt-mid,#12388f),#2b4bb5)',
                       boxShadow:'0 6px 18px rgba(30,58,138,.16)'}}>
            <div style={{width:38,height:38,borderRadius:10,background:'rgba(245,184,194,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Mail size={19} color="#f5b8c2"/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'Sora,sans-serif',fontWeight:800,fontSize:14,color:'#fff',marginBottom:2}}>
                Send from your own brand
              </div>
              <div style={{fontSize:12.5,color:'#dbe6fb',lineHeight:1.5}}>
                Verify your own domain so emails come from <strong style={{color:'#f5b8c2'}}>you</strong>, not AdvantageLife. ~5 min, fully guided.
              </div>
            </div>
            <div style={{fontFamily:'Sora,sans-serif',fontWeight:700,fontSize:13,color:'#f5b8c2',whiteSpace:'nowrap',flexShrink:0}}>
              Set up &rarr;
            </div>
          </div>
        </Link>
      )}

      {msg && <div style={{padding:'12px 18px',borderRadius:10,margin:'12px 0 0',fontSize:14,fontWeight:700,background:msgType==='ok'?'var(--sap-green-bg)':'var(--sap-red-bg)',border:'1px solid '+(msgType==='ok'?'#bbf7d0':'var(--sap-red-bg-mid)'),color:msgType==='ok'?'var(--sap-green-dark)':'var(--sap-red)'}}>{msg}</div>}

      <div style={{height:12}}/>

      {tab==='leads' && <LeadsTab leads={leads} lists={lists} sequences={sequences} refresh={refresh} flash={flash} statusJump={leadsStatusJump} goImport={function(){setTab('import');}}/>}
      {tab==='sequences' && <SeqTab sequences={sequences} refresh={refresh} flash={flash}/>}
      {tab==='broadcast' && <BcastTab leads={leads} lists={lists} flash={flash} refresh={refresh}/>}
      {tab==='import' && <ImpTab stats={stats} lists={lists} sequences={sequences} refresh={refresh} flash={flash}/>}
      {tab==='how' && <HowTab emailStats={emailStats}/>}

      <BuyCreditsModal show={showBuy} onClose={function(){setShowBuy(false);}} emailStats={emailStats} refresh={refresh} flash={flash}/>

      {/* Help panel — slides in from the right as an overlay */}
      <MyLeadsHelp visible={showHelp} onClose={function(){setShowHelp(false);}}/>
    </AlShell>
  );
}

function LeadsTab({leads,lists,sequences,refresh,flash,statusJump,goImport}) {

  var { t } = useTranslation();
  var [search,setSearch]=useState('');var [fS,setFS]=useState('all');var [fL,setFL]=useState('');
  var [newListName,setNewListName]=useState('');var [newListOpen,setNewListOpen]=useState(false);
  // Hot-chip jump: parent bumps statusJump ({v:'hot'}) -> pre-filter this tab.
  useEffect(function(){ if(statusJump && statusJump.v){ setFS(statusJump.v); } }, [statusJump]);
  var lm={}; lists.forEach(function(l){lm[l.id]=l;});
  var filtered=leads.filter(function(l){
    if(search&&!l.email.toLowerCase().includes(search.toLowerCase())&&!(l.name||'').toLowerCase().includes(search.toLowerCase()))return false;
    if(fS!=='all'){if(fS==='hot'){if(!l.is_hot)return false;}else if(l.status!==fS)return false;}
    if(fL&&l.list_id!==parseInt(fL))return false;return true;
  });
  function del(id){if(!window.confirm(t('myLeads.deleteLeadConfirm')))return;apiDelete('/api/leads/'+id).then(function(){flash(t('myLeads.leadDeleted'));refresh();}).catch(function(e){flash(e.message,'err');});}
  function assignSeq(lid,sid){apiPost('/api/leads/'+lid+'/assign-sequence',{sequence_id:sid?parseInt(sid):null}).then(function(){flash('Sequence assigned');refresh();}).catch(function(e){flash(e.message,'err');});}
  function createList(){var name=newListName.trim();if(!name)return;apiPost('/api/leads/lists',{name:name}).then(function(){setNewListName('');setNewListOpen(false);flash('List created');refresh();}).catch(function(e){flash(e.message,'err');});}

  return <div style={{background:'#fff',border:'1.5px solid #dfe6f0',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 16px rgba(23,37,84,.09),0 1px 3px rgba(23,37,84,.05)'}}>
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
        {!newListOpen ? (
          <button onClick={function(){setNewListOpen(true);}} style={{padding:'10px 16px',borderRadius:10,border:'1.5px solid #c7d2fe',background:'#fff',color:'var(--sap-indigo)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5,boxShadow:'0 2px 6px rgba(10,31,82,.08)'}}><Plus size={15}/> {t('myLeads.newListBtn')}</button>
        ) : (
          <span style={{display:'inline-flex',gap:6,alignItems:'center'}}>
            <input autoFocus value={newListName} onChange={function(e){setNewListName(e.target.value);}} onKeyDown={function(e){if(e.key==='Enter')createList();if(e.key==='Escape'){setNewListOpen(false);setNewListName('');}}} placeholder="New list name…" style={{width:170,padding:'10px 12px',border:'1.5px dashed #9db0e0',borderRadius:10,fontSize:13.5,fontFamily:'inherit',outline:'none',boxSizing:'border-box',color:'#1e293b',fontWeight:600}}/>
            <button onClick={createList} disabled={!newListName.trim()} style={{background:'#0e2a6e',color:'#fff',border:'none',borderRadius:9,fontWeight:800,fontSize:12.5,padding:'10px 14px',fontFamily:'inherit',cursor:'pointer',opacity:newListName.trim()?1:0.5,boxShadow:'0 3px 10px rgba(10,31,82,.28)'}}>Add</button>
            <button onClick={function(){setNewListOpen(false);setNewListName('');}} style={{background:'none',border:'none',color:'#64748b',fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',padding:'0 2px'}}>Cancel</button>
          </span>
        )}
        <div className="sl-search" style={{position:'relative'}}><Search size={15} color="#64748b" style={{position:'absolute',left:11,top:10}}/><input value={search} onChange={function(e){setSearch(e.target.value);}} placeholder={t('myLeads.searchLeadsPlaceholder')} style={{padding:'9px 10px 9px 32px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:15,fontFamily:'inherit',width:'100%',outline:'none',transition:'border-color .15s',boxSizing:'border-box',color:'#1e293b',fontWeight:600,boxShadow:'0 2px 6px rgba(23,37,84,.05)'}}/></div>
      </div>
      <div style={{fontSize:14,color:'#1e293b',fontWeight:800}}>{filtered.length} {t('myLeads.contacts') || 'contacts'}</div>
    </div>
    {filtered.length>0?<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:15}}><thead><tr>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:800,color:'#0f172a',fontSize:13.5,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.contact')}</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:800,color:'#0f172a',fontSize:13.5,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.email')}</th>
      <th style={{textAlign:'left',padding:'14px 18px',fontWeight:800,color:'#0f172a',fontSize:13.5,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.status')}</th>
      <th className="sl-md" style={{textAlign:'left',padding:'14px 18px',fontWeight:800,color:'#0f172a',fontSize:13.5,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.list')}</th>
      <th className="sl-md" style={{textAlign:'left',padding:'14px 18px',fontWeight:800,color:'#0f172a',fontSize:13.5,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.emails')}</th>
      <th className="sl-md" style={{textAlign:'left',padding:'14px 18px',fontWeight:800,color:'#0f172a',fontSize:13.5,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.sequence')}</th>
      <th style={{textAlign:'right',padding:'14px 18px',borderBottom:'1px solid #e2e8f0'}}></th>
    </tr></thead><tbody>{filtered.map(function(l){
      var statusKey = l.is_hot ? 'hot' : (l.status || 'new');
      var st = STATUS_PALETTE[statusKey] || STATUS_PALETTE.new;
      var li=lm[l.list_id];
      return <tr key={l.id} className="sl-row" style={{borderBottom:'1px solid #f1f5f9'}}>
      <td style={{padding:'14px 18px',fontWeight:800,color:'#0f172a',fontSize:15.5}}>{l.name||'—'}</td>
      <td style={{padding:'14px 18px',color:'#334155',fontWeight:600,fontSize:14.5}}>{l.email}</td>
      <td style={{padding:'14px 18px'}}><span style={{padding:'4px 11px',borderRadius:6,background:st.bg,color:st.color,fontSize:13,fontWeight:800}}>{t('myLeads.' + st.labelKey)}</span></td>
      <td className="sl-md" style={{padding:'14px 18px'}}>{li?<span style={{padding:'4px 11px',borderRadius:6,background:li.color+'18',color:li.color,fontSize:13,fontWeight:600}}>{li.name}</span>:<span style={{color:'var(--sap-text-muted)',fontSize:13}}>—</span>}</td>
      <td className="sl-md" style={{padding:'14px 18px',color:'var(--sap-text-secondary)',fontSize:14}}>{l.emails_sent||0} {t('myLeads.sent') || 'sent'}</td>
      <td className="sl-md" style={{padding:'14px 18px'}}><CustomSelect value={String(l.sequence_id||'')} onChange={function(v){assignSeq(l.id,v);}} small={true} style={{maxWidth:150}} options={[{value:'',label:t('myLeads.noneOption')||'None'}].concat(sequences.map(function(s){return {value:String(s.id),label:s.title};}))}/></td>
      <td style={{padding:'14px 18px',textAlign:'right'}}><button onClick={function(){del(l.id);}} style={{padding:'6px 11px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'var(--sap-red)',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}><Trash2 size={13}/></button></td>
    </tr>;})}</tbody></table></div>
    : leads.length===0 ? <div style={{textAlign:'center',padding:'44px 22px'}}>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:19,fontWeight:800,color:'#0f172a',marginBottom:6}}>Get your first leads in</div>
        <div style={{fontSize:13.5,color:'#334155',fontWeight:500,marginBottom:20,lineHeight:1.5}}>Two ways to fill this page &mdash; pick whichever fits you:</div>
        <div className="sl-empty-acts">
          <div onClick={function(){if(goImport)goImport();}} style={{border:'1.5px solid #dfe6f0',borderRadius:13,padding:'20px 16px',textAlign:'center',background:'#fff',cursor:'pointer',boxShadow:'0 2px 8px rgba(23,37,84,.07)'}}>
            <div style={{width:42,height:42,borderRadius:11,margin:'0 auto 10px',display:'flex',alignItems:'center',justifyContent:'center',background:'#eef2ff'}}><Upload size={19} color="#0e2a6e"/></div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>Import contacts</div>
            <div style={{fontSize:12.5,color:'#334155',fontWeight:500,lineHeight:1.5}}>Upload a CSV of people you already know</div>
          </div>
          <Link to="/funnels" style={{textDecoration:'none',border:'1.5px solid #dfe6f0',borderRadius:13,padding:'20px 16px',textAlign:'center',background:'#fff',display:'block',boxShadow:'0 2px 8px rgba(23,37,84,.07)'}}>
            <div style={{width:42,height:42,borderRadius:11,margin:'0 auto 10px',display:'flex',alignItems:'center',justifyContent:'center',background:'#f3f5fb'}}><Sparkles size={19} color="#0891b2"/></div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>Capture from your pages</div>
            <div style={{fontSize:12.5,color:'#334155',fontWeight:500,lineHeight:1.5}}>Every SuperPages opt-in lands here automatically</div>
          </Link>
        </div>
      </div>
    : <div style={{textAlign:'center',padding:'46px 20px'}}><Search size={26} color="var(--sap-text-ghost)" style={{marginBottom:8}}/><div style={{fontSize:14.5,fontWeight:700,color:'#334155'}}>No leads match your search or filters.</div></div>}
  </div>;
}

function SeqTab({sequences,refresh,flash}) {

  var { t } = useTranslation();
  var [ed,setEd]=useState(null);var [title,setTitle]=useState('');var [em,setEm]=useState([]);var [gen,setGen]=useState(false);
  function startNew(){setEd('new');setTitle('');setEm([{subject:'Welcome!',body_html:'',send_delay_days:0},{subject:'Follow up — quick tip',body_html:'',send_delay_days:2},{subject:'Last chance to take action',body_html:'',send_delay_days:5}]);}
  function editEx(s){setEd(s.id);setTitle(s.title);setEm(s.emails||[]);}
  function save(){if(!title.trim()){flash('Title required','err');return;}var c=em.filter(function(e){return e.subject&&e.subject.trim();});if(!c.length){flash('At least one email required','err');return;}(ed==='new'?apiPost('/api/leads/sequences',{title:title,emails:c}):apiPut('/api/leads/sequences/'+ed,{title:title,emails:c})).then(function(){flash('Sequence saved');setEd(null);refresh();}).catch(function(e){flash(e.message,'err');});}
  function delSeq(id){if(!window.confirm('Delete?'))return;apiDelete('/api/leads/sequences/'+id).then(function(){flash('Deleted');refresh();}).catch(function(e){flash(e.message,'err');});}
  var [nicheOpen,setNicheOpen]=useState(false);var [niche,setNiche]=useState('');
  function genAI(){var n=niche.trim();if(!n){setNicheOpen(true);return;}setGen(true);setNicheOpen(false);apiPost('/api/leads/sequences',{title:n.charAt(0).toUpperCase()+n.slice(1)+' Welcome Series',niche:n,emails:[{subject:'Welcome — your journey starts here',body_html:'<p>'+t('myLeads.welcomeDefault')+'</p>',send_delay_days:0},{subject:'Quick tip to get started',body_html:'<p>'+t('myLeads.tipDefault')+' '+n+'</p>',send_delay_days:1},{subject:'What others are saying',body_html:'<p>'+t('myLeads.achieveDefault')+'</p>',send_delay_days:3},{subject:"Don't miss out",body_html:'<p>'+t('myLeads.urgencySubject')+'</p>',send_delay_days:5},{subject:'Final call — are you in?',body_html:'<p>'+t('myLeads.lastChanceDefault')+'</p>',send_delay_days:7}]}).then(function(){flash('AI sequence created — edit to customise');setGen(false);setNiche('');refresh();}).catch(function(e){flash(e.message,'err');setGen(false);});}
  function sendNext(sid){apiPost('/api/leads/send-sequence-email',{sequence_id:sid}).then(function(r){flash('Sent '+(r.sent||0)+' emails');refresh();}).catch(function(e){flash(e.message,'err');});}

  if(ed!==null)return <div style={{background:'#fff',border:'1.5px solid #dfe6f0',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 16px rgba(23,37,84,.09),0 1px 3px rgba(23,37,84,.05)'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800}}>{ed==='new'?'Create':'Edit'} Sequence</div><button onClick={function(){setEd(null);}} style={{fontSize:12,color:'var(--sap-text-muted)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>{t('myLeads.cancel')}</button></div>
    <div style={{padding:'20px 24px'}}>
      <div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>{t('myLeads.sequenceName')}</label><input value={title} onChange={function(e){setTitle(e.target.value);}} placeholder={t("myLeads.sequenceNamePlaceholder")} style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      {em.map(function(e,i){var color=TC[i%TC.length];return <div key={i} style={{background:'var(--sap-bg-input)',borderRadius:12,padding:16,marginBottom:10,border:'1px solid #e8ecf2',borderLeft:'3px solid '+color}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontSize:12,fontWeight:800,color:color}}>Email {i+1}</span><div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{fontSize:13,color:'var(--sap-text-muted)'}}>{t('myLeads.after')}</span><input type="number" min="0" value={e.send_delay_days} onChange={function(ev){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{send_delay_days:parseInt(ev.target.value)||0}):x;}));}} style={{width:45,padding:4,border:'1px solid #e2e8f0',borderRadius:5,fontSize:13,textAlign:'center'}}/><span style={{fontSize:13,color:'var(--sap-text-muted)'}}>{t('myLeads.days')}</span>{em.length>1&&<button onClick={function(){setEm(em.filter(function(x,j){return j!==i;}));}} style={{color:'var(--sap-red)',background:'none',border:'none',cursor:'pointer',padding:2}}><Trash2 size={12}/></button>}</div></div>
        <input value={e.subject} onChange={function(ev){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{subject:ev.target.value}):x;}));}} placeholder={t("myLeads.subjectPlaceholder")} style={{width:'100%',padding:'9px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',marginBottom:8,background:'#fff'}}/>
        <RichTextEditor content={e.body_html} onChange={function(h){setEm(em.map(function(x,j){return j===i?Object.assign({},x,{body_html:h}):x;}));}} placeholder={t("myLeads.bodyPlaceholder")}/>
      </div>;})}
      <button onClick={function(){setEm(em.concat([{subject:'',body_html:'',send_delay_days:(em.length>0?(em[em.length-1].send_delay_days||0)+2:0)}]));}} style={{display:'flex',alignItems:'center',gap:4,padding:'8px 14px',borderRadius:8,border:'1.5px solid #e8ecf2',background:'#fff',color:'var(--sap-indigo)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:20}}><Plus size={12}/> {t('myLeads.addEmail')}</button>
      <button onClick={save} style={{padding:'12px 28px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#12388f,#818cf8)',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif'}}>{t('myLeads.saveSequence')}</button>
    </div></div>;

  return <div>
    <div style={{display:'flex',gap:10,marginBottom:16}}>
      <button onClick={startNew} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:14,borderRadius:10,border:'none',background:'linear-gradient(135deg,#12388f,#818cf8)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Plus size={16}/> {t('myLeads.createSequenceBtn')}</button>
      <button onClick={genAI} disabled={gen} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:14,borderRadius:10,border:'none',background:'linear-gradient(135deg,#12388f,#9db0e0)',color:'#fff',fontSize:13,fontWeight:700,cursor:gen?'wait':'pointer',fontFamily:'inherit'}}><Sparkles size={16}/> {gen?'Generating...':'Generate with AI'}</button>
    </div>
    {nicheOpen && <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center',background:'#fff',border:'1.5px dashed #9db0e0',borderRadius:12,padding:'10px 12px',flexWrap:'wrap'}}>
      <div style={{fontSize:12.5,fontWeight:700,color:'#334155'}}>What niche?</div>
      <input autoFocus value={niche} onChange={function(e){setNiche(e.target.value);}} onKeyDown={function(e){if(e.key==='Enter')genAI();}} placeholder="e.g. fitness, crypto, marketing" style={{flex:1,minWidth:160,padding:'9px 12px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontFamily:'inherit',outline:'none',color:'#1e293b',fontWeight:500}}/>
      <button onClick={genAI} disabled={!niche.trim()||gen} style={{background:'#12388f',color:'#fff',border:'none',borderRadius:9,fontWeight:700,fontSize:12.5,padding:'9px 16px',fontFamily:'inherit',cursor:'pointer',opacity:(!niche.trim()||gen)?0.5:1}}>{gen?'Generating…':'Create'}</button>
      <button onClick={function(){setNicheOpen(false);setNiche('');}} style={{background:'none',border:'none',color:'#64748b',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
    </div>}
    {sequences.length>0?sequences.map(function(sq){var se=sq.emails||[];return <div key={sq.id} style={{background:'#fff',border:'1.5px solid #dfe6f0',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 16px rgba(23,37,84,.09),0 1px 3px rgba(23,37,84,.05)',marginBottom:12}}>
      <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div><div style={{fontSize:14,fontWeight:800,color:'var(--sap-text-primary)'}}>{sq.title}</div><div style={{fontSize:13,color:'var(--sap-text-muted)',marginTop:2}}>{sq.num_emails} emails</div></div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <span style={{padding:'4px 10px',borderRadius:6,background:sq.is_active?'var(--sap-green-bg)':'var(--sap-bg-page)',color:sq.is_active?'var(--sap-green-dark)':'var(--sap-text-muted)',fontSize:13,fontWeight:700}}>{sq.is_active?'Active':'Paused'}</span>
          <button onClick={function(){sendNext(sq.id);}} style={{padding:'4px 12px',borderRadius:6,border:'none',background:'var(--sap-green)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('myLeads.sendNext')}</button>
          <button onClick={function(){editEx(sq);}} style={{padding:'4px 12px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'var(--sap-text-secondary)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('myLeads.edit')}</button>
          <button onClick={function(){delSeq(sq.id);}} style={{padding:'4px 12px',borderRadius:6,border:'1px solid #fecaca',background:'#fff',color:'var(--sap-red)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('myLeads.delete')}</button>
        </div>
      </div>
      {se.length>0&&<div style={{padding:'18px 20px',display:'flex',alignItems:'center',overflowX:'auto'}}>{se.map(function(e,i){var c=TC[i%TC.length];var last=i===se.length-1;return <div key={i} style={{display:'flex',alignItems:'center',flex:last?'0 0 auto':1}}>
        <div style={{textAlign:'center',minWidth:80}}>
          <div style={{width:36,height:36,borderRadius:10,background:c,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px'}}><Mail size={16} color="#fff"/></div>
          <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-primary)',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.subject||'Email '+(i+1)}</div>
          <div style={{fontSize:13,color:'var(--sap-text-muted)'}}>Day {e.send_delay_days||0}</div>
        </div>
        {!last&&<div style={{flex:1,height:2,background:'var(--sap-border)',margin:'0 4px',marginBottom:24}}/>}
      </div>;})}</div>}
    </div>;}):<div style={{textAlign:'center',padding:'60px 20px',background:'#fff',borderRadius:14,border:'1px solid #e2e8f0'}}><Zap size={32} color="var(--sap-text-ghost)" style={{marginBottom:8}}/><div style={{fontSize:14,fontWeight:700,color:'var(--sap-text-muted)'}}>{t('myLeads.noSequences')}</div><div style={{fontSize:12,color:'var(--sap-text-muted)',marginTop:4}}>{t('myLeads.noSequencesDesc')}</div></div>}
  </div>;
}

function SlimStatus({emailStats, hot, onBuy, onHot, extra}) {
  var es = emailStats || {};
  var monthlyLimit = (es.monthly_limit != null) ? es.monthly_limit : 5000;
  var sentMonth = es.sent_month || 0;
  var credits = es.boost_credits || 0;
  var usedPct = monthlyLimit > 0 ? Math.min(100, Math.round((sentMonth / monthlyLimit) * 100)) : 0;
  var d = es.daily || null;
  var dayHot = d && d.cap > 0 && (d.sent_today / d.cap) >= 0.8;
  return <div className="sl-strip">
    <div style={{flex:1,minWidth:150}}>
      <div style={{fontSize:12,fontWeight:800,color:'#1e293b',display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span>Sent this month</span><span style={{fontFamily:'ui-monospace,Menlo,monospace'}}>{sentMonth.toLocaleString()} / {monthlyLimit.toLocaleString()}</span>
      </div>
      <div style={{height:6,borderRadius:6,background:'#eef2f8',overflow:'hidden'}}>
        <div style={{display:'block',height:'100%',width:usedPct+'%',background:'linear-gradient(90deg,#c8102e,#e8203f)',transition:'width .3s'}}/>
      </div>
    </div>
    {d && <span title={"Daily protection ('" + d.tier + "' tier) — resets at midnight UTC. Grows with your sending history."} style={{fontSize:12.5,fontWeight:800,borderRadius:20,padding:'7px 13px',background:dayHot?'#fef3c7':'#f3f5fb',color:dayHot?'#b45309':'#12388f',whiteSpace:'nowrap'}}>Today {d.sent_today.toLocaleString()} / {d.cap.toLocaleString()}</span>}
    {credits > 0 && <span title="Purchased credits — never expire" style={{fontSize:13,fontWeight:800,borderRadius:20,padding:'7px 13px',background:'#eaf0fb',color:'#12388f',whiteSpace:'nowrap'}}>&#9889; {credits.toLocaleString()}</span>}
    {hot > 0 && <button onClick={function(){if(onHot)onHot();}} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:13.5,fontWeight:800,borderRadius:20,padding:'7px 14px',background:'#fce7f3',color:'#db2777',border:'none',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>&#128293; {hot} hot &rarr;</button>}
    <button onClick={function(){if(onBuy)onBuy();}} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'10px 18px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#12388f,#2b4bb5)',color:'#fff',fontSize:13.5,fontWeight:800,cursor:'pointer',fontFamily:'Sora,sans-serif',whiteSpace:'nowrap',flexShrink:0,boxShadow:'0 4px 12px rgba(30,58,138,.3)'}}><Rocket size={13}/> Buy</button>
    {extra}
  </div>;
}
function BcastTab({leads,lists,flash,refresh}) {

  var { t } = useTranslation();
  var [sub,setSub]=useState('');var [html,setHtml]=useState('');var [fS,setFS]=useState('all');var [fL,setFL]=useState('');var [s,setS]=useState(false);var [sent,setSent]=useState(null);var [prog,setProg]=useState(null);
  var ct=leads.filter(function(l){if(l.status==='unsubscribed')return false;if(fL&&l.list_id!==parseInt(fL))return false;if(fS!=='all'){if(fS==='hot')return l.is_hot;return l.status===fS;}return true;}).length;
  function send(){
    if(!sub.trim()){flash('Subject required','err');return;}
    setS(true);setSent(null);setProg(null);
    apiPost('/api/leads/broadcast',{subject:sub,html_content:html,filter_status:fS,list_id:fL?parseInt(fL):null}).then(function(r){
      if(!r||!r.job_id){setS(false);flash((r&&r.error)||'Could not start broadcast','err');return;}
      if(r.already_running)flash('A broadcast is already sending — showing its progress','ok');
      setProg({sent:r.sent||0,total:r.total||0,failed:r.failed||0,status:r.status||'queued'});
      pollBroadcast(r.job_id,0);
    }).catch(function(e){setS(false);flash(e.message,'err');});
  }
  function pollBroadcast(jobId,fails){
    fails=fails||0;
    apiGet('/api/leads/broadcast-status?job_id='+encodeURIComponent(jobId)).then(function(j){
      setProg({sent:j.sent||0,total:j.total||0,failed:j.failed||0,status:j.status});
      if(j.status==='done'||j.status==='error'||j.status==='paused_daily_cap'){
        setS(false);setProg(null);
        if(j.status==='error'){flash(j.error||'Broadcast failed','err');return;}
        var sentN=j.sent||0,totalN=j.total||0,failedN=j.failed||0;
        setSent(sentN);
        if(j.status==='paused_daily_cap'){
          var remainN=j.remaining_after_cap||0;
          flash('Sent '+sentN+' today — daily sending protection reached. '+remainN+' remaining will send automatically after midnight UTC. Nothing else to do — already-sent contacts are never emailed twice.','ok');
          if(refresh)refresh();return;
        }
        var skipped=j.skipped_prior||0;
        var msg='Sent to '+sentN+' of '+totalN+' leads';
        if(skipped>0)msg=msg+' ('+skipped+' already received this broadcast — skipped)';
        if(failedN>0){var reasons=j.failure_summary||{};var parts=[];Object.keys(reasons).forEach(function(k){parts.push(reasons[k]+' '+k);});if(parts.length)msg=msg+' ('+parts.join(', ')+')';}
        flash(msg,sentN>0?'ok':'err');if(refresh)refresh();return;
      }
      setTimeout(function(){pollBroadcast(jobId,0);},2000);
    }).catch(function(){
      // Transient blip — retry a few times before giving up so a momentary
      // network hiccup doesn't abandon a send that's still running server-side.
      if(fails>=4){setS(false);setProg(null);flash('Lost track of the broadcast — it may still be sending. Check back shortly.','err');return;}
      setTimeout(function(){pollBroadcast(jobId,fails+1);},3000);
    });
  }

  return <div style={{background:'#fff',border:'1.5px solid #dfe6f0',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 16px rgba(23,37,84,.09),0 1px 3px rgba(23,37,84,.05)'}}>
    <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f5f9'}}><div style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,marginBottom:4}}>{t('myLeads.broadcastTitle')}</div><div style={{fontSize:12,color:'var(--sap-text-muted)'}}>{t('myLeads.broadcastDesc')}</div></div>
    <div style={{padding:'20px 24px'}}>
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <div style={{flex:1}}><label style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('myLeads.listLabel')}</label><CustomSelect value={fL} onChange={setFL} options={[{value:'',label:t('myLeads.allLists')}].concat(lists.map(function(l){return {value:String(l.id),label:l.name};}))}/></div>
        <div style={{flex:1}}><label style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('myLeads.statusLabel')}</label><CustomSelect value={fS} onChange={setFS} options={[{value:'all',label:'All'},{value:'new',label:'New'},{value:'nurturing',label:t('myLeads.nurturing')},{value:'hot',label:'Hot'}]}/></div>
        <div style={{display:'flex',alignItems:'flex-end',paddingBottom:2}}><span style={{fontSize:14,fontWeight:800,color:'var(--sap-indigo)'}}>{ct} recipients</span></div>
      </div>
      <div style={{marginBottom:16}}><label style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('myLeads.subjectLabel')}</label><input value={sub} onChange={function(e){setSub(e.target.value);}} style={{width:'100%',padding:'11px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      <div style={{marginBottom:16}}><label style={{fontSize:13,fontWeight:700,color:'var(--sap-text-muted)',display:'block',marginBottom:4}}>{t('myLeads.contentLabel')}</label><RichTextEditor content={html} onChange={setHtml} placeholder={t("myLeads.broadcastBodyPlaceholder")}/></div>
      <button onClick={send} disabled={s} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 24px',borderRadius:10,border:'none',background:s?'var(--sap-text-ghost)':'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',fontSize:13,fontWeight:800,cursor:s?'default':'pointer',fontFamily:'Sora,sans-serif'}}><Send size={14}/>{s?(prog&&prog.total?('Sending '+prog.sent+'/'+prog.total):'Starting…'):'Send to '+ct}</button>
      {s&&<div style={{marginTop:10,fontSize:12,fontWeight:700,color:'var(--sap-text-muted)'}}>{prog&&prog.total?('Sending in the background — '+prog.sent+' of '+prog.total+' sent'+(prog.failed?(' · '+prog.failed+' failed'):'')+'. You can leave this page.'):'Starting broadcast…'}</div>}
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

  return <div style={{background:'#fff',border:'1.5px solid #dfe6f0',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 16px rgba(23,37,84,.09),0 1px 3px rgba(23,37,84,.05)'}}>
    <div style={{padding:'20px 24px',borderBottom:'1px solid #f1f5f9'}}>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,marginBottom:4}}>{t('myLeads.importLeads')}</div>
      <div style={{fontSize:13,color:'var(--sap-text-secondary)'}}>{t("myLeads.importDescFull")}</div>
    </div>
    <div style={{padding:'20px 24px'}}>
      {/* Lead count + capacity */}
      <div style={{display:'flex',gap:12,marginBottom:20}}>
        <div style={{flex:1,background:'rgba(200,16,46,.04)',border:'1px solid rgba(200,16,46,.12)',borderRadius:10,padding:'14px 16px'}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--sap-indigo)'}}>{t('myLeads.currentLeads')}</div>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'var(--sap-indigo)'}}>{stats.total||0}<span style={{fontSize:13,color:'var(--sap-text-secondary)',fontWeight:500}}> / {stats.limit||5000}</span></div>
          <div style={{width:'100%',height:4,background:'var(--sap-border)',borderRadius:2,marginTop:8}}><div style={{height:4,background:'var(--sap-indigo)',borderRadius:2,width:Math.min(100,((stats.total||0)/(stats.limit||5000))*100)+'%'}}/></div>
        </div>
      </div>

      {/* Import settings */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
        <div><label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>{t('myLeads.assignToList')}</label><CustomSelect value={listId} onChange={setListId} options={[{value:'',label:'No list (unsorted)'}].concat(lists.map(function(l){return {value:String(l.id),label:l.name};}))}/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>{t('myLeads.autoAssignSequence')}</label><CustomSelect value={seqId} onChange={setSeqId} options={[{value:'',label:t('myLeads.noSequence')}].concat(sequences.map(function(s){return {value:String(s.id),label:s.title};}))}/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>{t('myLeads.importAsStatus')}</label><CustomSelect value={impStatus} onChange={setImpStatus} options={[{value:'new',label:'New'},{value:'hot',label:'Hot'},{value:'nurturing',label:t('myLeads.chartNurturing')}]}/></div>
        <div><label style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',display:'block',marginBottom:6}}>{t('myLeads.sourceLabel')}</label><input value={source} onChange={function(e){setSource(e.target.value);}} placeholder={t('myLeads.importPlaceholder')} style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/></div>
      </div>

      {/* Upload area */}
      <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:32,borderRadius:12,border:'2px dashed #d1d5db',cursor:'pointer',marginBottom:12,transition:'border-color .15s,background .15s',background:'#fafbfc'}} onMouseEnter={function(e){e.currentTarget.style.borderColor='var(--sap-indigo)';e.currentTarget.style.background='#f3f5fb';}} onMouseLeave={function(e){e.currentTarget.style.borderColor='#d1d5db';e.currentTarget.style.background='#fafbfc';}}>
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
          <thead><tr><th style={{textAlign:'left',padding:'8px 14px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.emailCol')}</th><th style={{textAlign:'left',padding:'8px 14px',fontWeight:700,color:'var(--sap-text-secondary)',fontSize:13,borderBottom:'1px solid #e2e8f0'}}>{t('myLeads.nameCol')}</th></tr></thead>
          <tbody>{parsed.slice(0,20).map(function(l,i){return <tr key={i} style={{borderTop:i>0?'1px solid #f1f5f9':'none'}}><td style={{padding:'6px 14px',color:'var(--sap-text-primary)'}}>{l.email}</td><td style={{padding:'6px 14px',color:'var(--sap-text-secondary)'}}>{l.name||'—'}</td></tr>;})}</tbody>
        </table>
        {parsed.length>20 && <div style={{padding:'8px 14px',fontSize:13,color:'var(--sap-text-muted)',borderTop:'1px solid #e2e8f0'}}>...and {parsed.length-20} more</div>}
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
        style={{display:'flex',alignItems:'center',gap:6,padding:'14px 28px',borderRadius:10,border:'none',background:(uploading||!parsed.length)?'var(--sap-text-ghost)':'linear-gradient(135deg,#12388f,#818cf8)',color:'#fff',fontSize:14,fontWeight:800,cursor:(uploading||!parsed.length)?'default':'pointer',fontFamily:'Sora,sans-serif'}}>
        <Upload size={16}/>{uploading?'Importing...':'Import '+parsed.length+' leads'}
      </button>

      {/* Format help */}
      <div style={{marginTop:20,padding:'14px 18px',background:'var(--sap-bg-elevated)',borderRadius:10,border:'1px solid #f1f5f9'}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',marginBottom:6}}>{t('myLeads.acceptedFormats')}</div>
        <div style={{fontSize:12,color:'var(--sap-text-muted)',lineHeight:1.8}}>
          CSV from Mailchimp, AWeber, ConvertKit, ActiveCampaign, or any email platform. Format: <code style={{background:'var(--sap-border)',padding:'2px 6px',borderRadius:4,fontSize:13}}>{t('myLeads.csvFormat')}</code> (one per line). Comma, semicolon, and tab delimiters supported. Disposable email addresses are automatically filtered.
        </div>
      </div>
    </div></div>;
}

function HowTab({emailStats}) {
  /* Member-facing explainer for the sending-protection system (3 Jul 2026,
     Steve). Written to reassure: these limits exist to keep every member's
     email landing in inboxes, not spam folders. */
  var es = emailStats || {};
  var d = es.daily || {};
  var tiers = es.ramp_tiers || [];
  var card = {background:'#fff',border:'1.5px solid #dfe6f0',borderRadius:14,boxShadow:'0 4px 16px rgba(23,37,84,.09),0 1px 3px rgba(23,37,84,.05)',padding:'22px 24px',marginBottom:14};
  var h = {fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:8,display:'flex',alignItems:'center',gap:8};
  var body = {fontSize:14,color:'#334155',fontWeight:500,lineHeight:1.65,margin:0};
  return <div>
    <div style={{...card,textAlign:'center',padding:'26px 24px'}}>
      <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:6}}>Built to keep your emails landing</div>
      <p style={{...body,maxWidth:640,margin:'0 auto'}}>
        Big email platforms don&rsquo;t let anyone blast at full volume from day one &mdash; and neither do we.
        These protections are why mail sent through AdvantageLife reaches inboxes instead of spam folders,
        and why one careless sender can never damage <strong>your</strong> deliverability.
      </p>
    </div>

    <div style={card}>
      <div style={h}><Shield size={17} color="#c8102e"/> Your daily sending limit grows with you</div>
      <p style={body}>
        Every account has a daily sending ceiling that rises automatically as your clean sending
        history builds &mdash; the same &ldquo;warm-up&rdquo; system professional email providers use.
        Mailbox providers like Gmail trust senders who ramp up gradually; sudden blasts from new
        senders are the #1 trigger for spam filtering.
      </p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',margin:'14px 0 4px'}}>
        {tiers.map(function(tr,i){
          var active = d.tier===tr.label;
          return <div key={i} style={{flex:'1 1 160px',border:'1.5px solid '+(active?'#c8102e':'#dfe6f0'),borderRadius:12,padding:'14px 16px',background:active?'#f3f5fb':'#fff',position:'relative'}}>
            {active && <div style={{position:'absolute',top:-9,right:12,background:'#c8102e',color:'#fff',fontSize:10,fontWeight:800,borderRadius:10,padding:'2px 9px'}}>YOU ARE HERE</div>}
            <div style={{fontFamily:'Sora,sans-serif',fontWeight:800,fontSize:14,color:'#0f172a'}}>{tr.label}</div>
            <div style={{fontSize:12.5,color:'#334155',fontWeight:600,marginTop:2}}>{tr.below?('Under '+tr.below.toLocaleString()+' lifetime sends'):'10,000+ lifetime sends'}</div>
            <div style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:16,fontWeight:600,color:'#12388f',marginTop:6}}>{tr.cap.toLocaleString()} / day</div>
          </div>;
        })}
      </div>
      <p style={{...body,fontSize:12.5,color:'#64748b'}}>
        You&rsquo;ve sent {(d.lifetime_sends||0).toLocaleString()} emails so far
        {d.next_tier_at?(' — '+(d.next_tier_at-(d.lifetime_sends||0)).toLocaleString()+' more unlocks the next tier.'):' — you\u2019re at the top tier.'} The counter resets at midnight UTC.
      </p>
    </div>

    <div style={card}>
      <div style={h}><Clock size={17} color="#c8102e"/> Big broadcasts are paced, never blasted</div>
      <p style={body}>
        When you hit Send on a broadcast, it delivers steadily in the background at a controlled
        rate rather than all at once &mdash; you can close the page and it keeps going. If a large list
        meets your daily ceiling, delivery pauses and <strong>resumes automatically after midnight UTC</strong> &mdash;
        nothing for you to do, and it continues precisely where it stopped.
        <strong> Anyone who already received it is skipped automatically</strong>, so nobody is ever double-emailed
        &mdash; even if the platform restarts mid-send.
      </p>
    </div>

    <div style={card}>
      <div style={h}><CheckCircle2 size={17} color="#16a34a"/> Reputation protection, for everyone</div>
      <p style={body}>
        If a recipient marks a member&rsquo;s email as spam, that account&rsquo;s sending is paused
        automatically for review. It sounds strict &mdash; it&rsquo;s the reason the platform&rsquo;s sending
        reputation stays clean, which is what keeps <strong>your</strong> emails out of spam folders.
        Verifying your own sending domain (the &ldquo;Sending as&rdquo; line above) adds another layer:
        your mail carries your brand&rsquo;s signature and builds <em>your</em> reputation with every send.
      </p>
    </div>

    <div style={{...card,background:'linear-gradient(135deg,var(--sap-cobalt-mid,#12388f),#2b4bb5)',border:'none'}}>
      <div style={{...h,color:'#fff'}}><Mail size={17} color="#f5b8c2"/> The short version</div>
      <p style={{...body,color:'#dbe6fb'}}>
        Credits decide <strong style={{color:'#f5b8c2'}}>how many</strong> emails you can send.
        The warm-up ramp decides <strong style={{color:'#f5b8c2'}}>how fast</strong>.
        Clean sending decides <strong style={{color:'#f5b8c2'}}>how far they reach</strong>.
        Play the long game and all three grow together.
      </p>
    </div>
  </div>;
}

function BuyCreditsModal({show, onClose, emailStats, refresh, flash}) {
  var { ensureConsent, consentModal } = useConsentGate();
  var packs = (emailStats && emailStats.boost_packs) || [
    {id:'boost_1k',credits:1000,price:5},
    {id:'boost_5k',credits:5000,price:19},
    {id:'boost_10k',credits:10000,price:29},
    {id:'boost_50k',credits:50000,price:99},
  ];
  var [sel,setSel]=useState('boost_5k');
  var [busy,setBusy]=useState('');
  var [err,setErr]=useState('');
  var [showWallet,setShowWallet]=useState(false);
  useEffect(function(){ if(!show){ setShowWallet(false); setErr(''); } },[show]);
  if(!show) return null;
  var balance=(emailStats&&emailStats.wallet_balance)||0;
  var pack=packs.filter(function(p){return p.id===sel;})[0]||packs[0];
  var price=pack?pack.price:0;
  var credits=pack?pack.credits:0;
  var insufficient=balance<price;

  async function payWallet(){
    setErr(''); var ok=await ensureConsent(); if(!ok) return;
    setBusy('wallet');
    apiPost('/api/leads/buy-boost',{pack_id:sel}).then(function(r){
      setBusy('');
      flash('+'+(r.credits_added||0).toLocaleString()+' credits added — you now have '+(r.total_credits||0).toLocaleString()+' credits');
      if(refresh)refresh();
      if(onClose)onClose();
    }).catch(function(e){setBusy('');setErr(e.message||'Could not complete the purchase.');});
  }
  async function payCard(){
    setErr(''); var ok=await ensureConsent(); if(!ok) return;
    setBusy('card');
    apiPost('/api/stripe/checkout/email-boost',{pack_id:sel}).then(function(d){
      if(d&&d.checkout_url){window.location.href=d.checkout_url;}
      else{setBusy('');setErr((d&&d.error)||'Could not start card checkout.');}
    }).catch(function(e){setBusy('');setErr(e.message||'Card checkout failed.');});
  }
  async function payCrypto(){
    setErr(''); var ok=await ensureConsent(); if(!ok) return;
    setBusy('crypto');
    apiPost('/api/nowpayments/create-invoice',{product_key:'email_boost_'+credits}).then(function(d){
      if(d&&d.invoice_url){window.location.href=d.invoice_url;}
      else{setBusy('');setErr((d&&d.error)||'Could not start crypto checkout.');}
    }).catch(function(e){setBusy('');setErr(e.message||'Crypto checkout failed.');});
  }
  function onWalletPaid(){
    flash('+'+credits.toLocaleString()+' credits added — payment confirmed on-chain');
    if(refresh)refresh();
    if(onClose)onClose();
  }

  return <>
    <div onClick={function(e){if(e.target===e.currentTarget&&!busy&&onClose)onClose();}} style={{position:'fixed',inset:0,zIndex:900,background:'rgba(15,23,42,.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
    <div style={{width:'100%',maxWidth:440,background:'#fff',borderRadius:16,border:'1px solid #e8ecf2',padding:'22px 22px 24px',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(15,23,42,.3)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}><Rocket size={18} color="#12388f"/><span style={{fontFamily:'Sora,sans-serif',fontSize:17,fontWeight:800,color:'#0f172a'}}>Buy email credits</span></div>
        <button onClick={function(){if(!busy&&onClose)onClose();}} disabled={!!busy} style={{background:'none',border:'none',cursor:busy?'default':'pointer',color:'#94a3b8',padding:4,display:'flex'}}><X size={18}/></button>
      </div>
      <div style={{fontSize:12,color:'#64748b',marginBottom:16}}>Credits never expire</div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:18}}>
        {packs.map(function(p){var on=p.id===sel;return <div key={p.id} onClick={function(){if(!busy)setSel(p.id);}} style={{cursor:busy?'default':'pointer',border:on?'2px solid #2563eb':'1px solid #e2e8f0',background:on?'#eff6ff':'#fff',borderRadius:10,padding:'10px 14px'}}>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:on?'#12388f':'#0f172a'}}>{(p.credits||0).toLocaleString()}</div>
          <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>emails</div>
          <div style={{fontSize:14,fontWeight:700,color:on?'#12388f':'#2563eb'}}>${p.price}</div>
        </div>;})}
      </div>

      <div style={{borderTop:'1px solid #f1f5f9',paddingTop:14}}>
        <div style={{fontSize:12,color:'#64748b',marginBottom:10}}>Pay ${price} for {credits.toLocaleString()} credits with</div>
        {err && <div style={{fontSize:12,fontWeight:700,color:'#dc2626',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px',marginBottom:10}}>{err}</div>}

        <button onClick={payWallet} disabled={!!busy||insufficient} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'12px 14px',borderRadius:10,border:'none',background:(busy||insufficient)?'#cbd5e1':'linear-gradient(135deg,#12388f,#2563eb)',color:'#fff',fontSize:14,fontWeight:700,cursor:(busy||insufficient)?'default':'pointer',fontFamily:'inherit',marginBottom:8}}>
          <span style={{display:'flex',alignItems:'center',gap:8}}><Wallet size={16}/> {busy==='wallet'?'Processing...':'Pay from wallet balance'}</span>
          <span style={{fontSize:11,opacity:.85}}>{insufficient?'Low balance':('$'+balance.toFixed(2))}</span>
        </button>

        <button onClick={payCard} disabled={!!busy} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'12px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',background:'#fff',color:'#0f172a',fontSize:14,fontWeight:700,cursor:busy?'default':'pointer',fontFamily:'inherit',marginBottom:8}}>
          <CreditCard size={16}/> {busy==='card'?'Redirecting...':'Pay by card'}<span style={{marginLeft:'auto',fontSize:11,color:'#94a3b8'}}>via Stripe</span>
        </button>

        <button onClick={payCrypto} disabled={!!busy} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'12px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',background:'#fff',color:'#0f172a',fontSize:14,fontWeight:700,cursor:busy?'default':'pointer',fontFamily:'inherit'}}>
          <Coins size={16}/> {busy==='crypto'?'Redirecting...':'Pay with crypto'}<span style={{marginLeft:'auto',fontSize:11,color:'#94a3b8'}}>hosted checkout</span>
        </button>

        {!showWallet ? (
          <button onClick={function(){if(!busy){setErr('');setShowWallet(true);}}} disabled={!!busy} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'12px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',background:'#fff',color:'#0f172a',fontSize:14,fontWeight:700,cursor:busy?'default':'pointer',fontFamily:'inherit',marginTop:8}}>
            <Wallet size={16}/> Pay direct from your wallet<span style={{marginLeft:'auto',fontSize:11,color:'#94a3b8'}}>BSC &middot; self-custody</span>
          </button>
        ) : (
          <div style={{marginTop:8,border:'1.5px solid #e2e8f0',borderRadius:10,padding:'12px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:12,color:'#64748b'}}>USDT on BNB Chain &mdash; keep the fee savings</span>
              <button onClick={function(){setShowWallet(false);}} style={{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:11,fontWeight:700}}>Cancel</button>
            </div>
            <Suspense fallback={<div style={{fontSize:12,color:'#94a3b8',textAlign:'center',padding:'10px 0'}}>Loading wallet&hellip;</div>}>
              <WalletConnectProvider onBeforeClick={ensureConsent}>
                <WalletConnectGate hideWhenConnected label={'Connect wallet to pay $'+price} style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'none',fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#ea580c,#f97316)',fontFamily:'inherit',cursor:'pointer'}}/>
                <WalletPayLink productType="email_boost" productKey={'email_boost_'+credits} onSuccess={onWalletPaid} label={'Pay $'+price+' with wallet'} style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'none',fontSize:14,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#12388f,#2563eb)',fontFamily:'inherit',cursor:'pointer',marginTop:8}}/>
              </WalletConnectProvider>
            </Suspense>
          </div>
        )}

        {insufficient && <div style={{fontSize:11,color:'#b45309',marginTop:10,textAlign:'center'}}>Wallet balance is below ${price} — pay by card or crypto instead.</div>}
        <div style={{fontSize:11,color:'#94a3b8',marginTop:12,textAlign:'center'}}>Card &amp; crypto open a secure checkout &middot; wallet is instant</div>
      </div>
    </div>
    </div>
    {consentModal}
  </>;
}
