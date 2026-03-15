import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Link2, Shuffle, Plus, Trash2, Copy, BarChart3, ExternalLink, Clock, Globe, MousePointer, ChevronDown, ChevronRight, X } from 'lucide-react';

export default function LinkTools() {
  const [links, setLinks] = useState([]);
  const [rotators, setRotators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('links');
  const [showCreate, setShowCreate] = useState(false);
  const [showRotatorCreate, setShowRotatorCreate] = useState(false);
  const [analyticsId, setAnalyticsId] = useState(null);
  const [analyticsType, setAnalyticsType] = useState('short');
  const [analytics, setAnalytics] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState('');

  // Create link form
  const [newUrl, setNewUrl] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Create rotator form
  const [rotName, setRotName] = useState('');
  const [rotSlug, setRotSlug] = useState('');
  const [rotMode, setRotMode] = useState('equal');
  const [rotDests, setRotDests] = useState([{url:'',weight:50},{url:'',weight:50}]);
  const [rotCreating, setRotCreating] = useState(false);

  const BASE = window.location.origin;

  const load = () => apiGet('/api/link-tools').then(d => {
    setLinks(d.short_links || []);
    setRotators(d.rotators || []);
    setLoading(false);
  }).catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const copyToClip = (text) => { navigator.clipboard.writeText(text); showToast('✓ Copied to clipboard'); };

  const createLink = async () => {
    if (!newUrl.trim()) return;
    setCreating(true);
    try {
      const res = await apiPost('/api/links/create', { destination_url: newUrl, slug: newSlug || undefined, title: newTitle || undefined });
      if (res.success) { showToast('✓ Link created'); setNewUrl(''); setNewSlug(''); setNewTitle(''); setShowCreate(false); load(); }
      else showToast(res.error || 'Failed');
    } catch(e) { showToast(e.message); }
    setCreating(false);
  };

  const createRotator = async () => {
    if (!rotName.trim()) return;
    const dests = rotDests.filter(d => d.url.trim());
    if (dests.length < 2) { showToast('Add at least 2 URLs'); return; }
    setRotCreating(true);
    try {
      const res = await apiPost('/api/rotators/create', { title: rotName, slug: rotSlug || undefined, mode: rotMode, destinations: dests });
      if (res.success) { showToast('✓ Rotator created'); setRotName(''); setRotSlug(''); setRotDests([{url:'',weight:50},{url:'',weight:50}]); setShowRotatorCreate(false); load(); }
      else showToast(res.error || 'Failed');
    } catch(e) { showToast(e.message); }
    setRotCreating(false);
  };

  const deleteItem = async (id, type) => {
    try {
      await apiPost(type === 'rotator' ? `/api/rotators/delete/${id}` : `/api/links/delete/${id}`, {});
      showToast('✓ Deleted');
      setConfirmDelete(null);
      load();
    } catch(e) { showToast(e.message); }
  };

  const openAnalytics = async (id, type) => {
    setAnalyticsId(id); setAnalyticsType(type); setAnalytics(null);
    try {
      const d = await apiGet(`/api/links/analytics/${id}?link_type=${type}`);
      setAnalytics(d);
    } catch(e) { setAnalytics({error: e.message}); }
  };

  const totalClicks = links.reduce((a,l) => a + (l.click_count||0), 0) + rotators.reduce((a,r) => a + (r.click_count||0), 0);

  if (loading) return <AppLayout title="Link Tools"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;

  return (
    <AppLayout title="Link Tools" subtitle="Short links and rotators with click tracking">

      {/* Stats row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24}}>
        {[
          {label:'SHORT LINKS',val:links.length,color:'#0ea5e9',icon:Link2},
          {label:'ROTATORS',val:rotators.length,color:'#8b5cf6',icon:Shuffle},
          {label:'TOTAL CLICKS',val:totalClicks,color:'#10b981',icon:MousePointer},
        ].map((s,i) => (
          <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,overflow:'hidden'}}>
            <div style={{padding:'10px 14px',background:'#1c223d',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:1,color:'#fff',textTransform:'uppercase',opacity:.7}}>{s.label}</span>
              <s.icon size={14} color={s.color}/>
            </div>
            <div style={{padding:'12px 14px'}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:'#0f172a'}}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',gap:4,marginBottom:16}}>
        {[['links','Short Links',Link2],['rotators','Rotators',Shuffle]].map(([key,label,Icon]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            display:'flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:700,
            border:'none',cursor:'pointer',fontFamily:'inherit',
            background:tab===key?'#0ea5e9':'#f1f5f9',color:tab===key?'#fff':'#64748b',
          }}><Icon size={14}/> {label}</button>
        ))}
        <div style={{flex:1}}/>
        <button onClick={() => tab==='links'?setShowCreate(true):setShowRotatorCreate(true)} style={{
          display:'flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:700,
          border:'none',cursor:'pointer',fontFamily:'inherit',
          background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',
        }}><Plus size={14}/> {tab==='links'?'New Short Link':'New Rotator'}</button>
      </div>

      {/* SHORT LINKS TAB */}
      {tab === 'links' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {links.length === 0 && (
            <div style={{textAlign:'center',padding:'40px 20px',background:'#fff',border:'1px solid #e8ecf2',borderRadius:10}}>
              <Link2 size={32} color="#cbd5e1" style={{marginBottom:8}}/>
              <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>No short links yet</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>Create your first short link to start tracking clicks</div>
            </div>
          )}
          {links.map(l => (
            <div key={l.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,overflow:'hidden'}}>
              <div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:36,height:36,borderRadius:8,background:'rgba(14,165,233,.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Link2 size={16} color="#0ea5e9"/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#0ea5e9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{BASE}/s/{l.short_code}</div>
                  <div style={{fontSize:11,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.destination_url}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                  <div style={{textAlign:'center',padding:'4px 10px',background:'#f1f5f9',borderRadius:6}}>
                    <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{l.click_count||0}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>CLICKS</div>
                  </div>
                </div>
              </div>
              <div style={{padding:'8px 16px',borderTop:'1px solid #f1f3f7',display:'flex',gap:6}}>
                <button onClick={() => copyToClip(`${BASE}/s/${l.short_code}`)} style={smallBtn}><Copy size={12}/> Copy</button>
                <button onClick={() => openAnalytics(l.id, 'short')} style={smallBtn}><BarChart3 size={12}/> Analytics</button>
                <a href={`/s/${l.short_code}`} target="_blank" rel="noopener noreferrer" style={{...smallBtn,textDecoration:'none'}}><ExternalLink size={12}/> Open</a>
                <div style={{flex:1}}/>
                {confirmDelete === `link-${l.id}` ? (
                  <>
                    <span style={{fontSize:11,fontWeight:600,color:'#dc2626',display:'flex',alignItems:'center'}}>Delete?</span>
                    <button onClick={() => deleteItem(l.id,'short')} style={{...smallBtn,background:'#dc2626',color:'#fff',border:'none'}}>Yes</button>
                    <button onClick={() => setConfirmDelete(null)} style={smallBtn}>No</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDelete(`link-${l.id}`)} style={{...smallBtn,color:'#dc2626',borderColor:'#fecaca'}}><Trash2 size={12}/></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ROTATORS TAB */}
      {tab === 'rotators' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {rotators.length === 0 && (
            <div style={{textAlign:'center',padding:'40px 20px',background:'#fff',border:'1px solid #e8ecf2',borderRadius:10}}>
              <Shuffle size={32} color="#cbd5e1" style={{marginBottom:8}}/>
              <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:4}}>No rotators yet</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>Create a rotator to split traffic across multiple URLs</div>
            </div>
          )}
          {rotators.map(r => (
            <div key={r.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,overflow:'hidden'}}>
              <div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:36,height:36,borderRadius:8,background:'rgba(139,92,246,.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Shuffle size={16} color="#8b5cf6"/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{r.name}</div>
                  <div style={{fontSize:12,color:'#8b5cf6',fontWeight:600}}>{BASE}/s/{r.short_code}</div>
                </div>
                <div style={{textAlign:'center',padding:'4px 10px',background:'#f1f5f9',borderRadius:6}}>
                  <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{r.click_count||0}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:600}}>CLICKS</div>
                </div>
              </div>
              <div style={{padding:'8px 16px',borderTop:'1px solid #f1f3f7',display:'flex',gap:6}}>
                <button onClick={() => copyToClip(`${BASE}/s/${r.short_code}`)} style={smallBtn}><Copy size={12}/> Copy</button>
                <button onClick={() => openAnalytics(r.id, 'rotator')} style={smallBtn}><BarChart3 size={12}/> Analytics</button>
                <div style={{flex:1}}/>
                {confirmDelete === `rot-${r.id}` ? (
                  <>
                    <span style={{fontSize:11,fontWeight:600,color:'#dc2626',display:'flex',alignItems:'center'}}>Delete?</span>
                    <button onClick={() => deleteItem(r.id,'rotator')} style={{...smallBtn,background:'#dc2626',color:'#fff',border:'none'}}>Yes</button>
                    <button onClick={() => setConfirmDelete(null)} style={smallBtn}>No</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDelete(`rot-${r.id}`)} style={{...smallBtn,color:'#dc2626',borderColor:'#fecaca'}}><Trash2 size={12}/></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE SHORT LINK MODAL */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Create Short Link" icon={<Link2 size={18} color="#0ea5e9"/>}>
          <Label>Destination URL</Label>
          <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://your-long-url.com/page"/>
          <Label>Custom Slug (optional)</Label>
          <Input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="my-link"/>
          {newSlug && <div style={{fontSize:11,color:'#64748b',marginTop:-6,marginBottom:10}}>Preview: {BASE}/s/{newSlug || '...'}</div>}
          <Label>Title (optional)</Label>
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Campaign name or description"/>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={createLink} disabled={creating} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:'#0ea5e9',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{creating?'Creating...':'Create Link →'}</button>
            <button onClick={() => setShowCreate(false)} style={{padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* CREATE ROTATOR MODAL */}
      {showRotatorCreate && (
        <Modal onClose={() => setShowRotatorCreate(false)} title="Create Link Rotator" icon={<Shuffle size={18} color="#8b5cf6"/>}>
          <Label>Rotator Name</Label>
          <Input value={rotName} onChange={e => setRotName(e.target.value)} placeholder="e.g. Facebook Traffic Split"/>
          <Label>Custom Slug (optional)</Label>
          <Input value={rotSlug} onChange={e => setRotSlug(e.target.value)} placeholder="my-rotator"/>
          <Label>Rotation Mode</Label>
          <div style={{display:'flex',gap:6,marginBottom:14}}>
            {[['equal','Equal Split'],['weighted','Weighted'],['sequential','Sequential']].map(([k,l]) => (
              <button key={k} onClick={() => setRotMode(k)} style={{
                flex:1,padding:'8px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
                border:rotMode===k?'2px solid #8b5cf6':'2px solid #e2e8f0',
                background:rotMode===k?'rgba(139,92,246,.06)':'#fff',color:rotMode===k?'#8b5cf6':'#94a3b8',
              }}>{l}</button>
            ))}
          </div>
          <Label>Destination URLs</Label>
          {rotDests.map((d,i) => (
            <div key={i} style={{display:'flex',gap:6,marginBottom:8}}>
              <Input value={d.url} onChange={e => { const n=[...rotDests]; n[i].url=e.target.value; setRotDests(n); }} placeholder={`URL ${i+1}`} style={{flex:1,marginBottom:0}}/>
              {rotMode==='weighted' && (
                <input type="number" value={d.weight} onChange={e => { const n=[...rotDests]; n[i].weight=parseInt(e.target.value)||0; setRotDests(n); }}
                  style={{width:60,padding:'8px',border:'1px solid #e5e7eb',borderRadius:8,fontSize:12,textAlign:'center'}} min={0} max={100}/>
              )}
              {rotDests.length > 2 && (
                <button onClick={() => setRotDests(rotDests.filter((_,j) => j!==i))} style={{width:32,height:38,border:'1px solid #fecaca',borderRadius:8,background:'#fef2f2',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <X size={12} color="#dc2626"/>
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setRotDests([...rotDests,{url:'',weight:50}])} style={{fontSize:11,fontWeight:600,color:'#0ea5e9',background:'none',border:'none',cursor:'pointer',padding:'4px 0',marginBottom:12}}>+ Add another URL</button>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={createRotator} disabled={rotCreating} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:'#8b5cf6',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{rotCreating?'Creating...':'Create Rotator →'}</button>
            <button onClick={() => setShowRotatorCreate(false)} style={{padding:'11px 20px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ANALYTICS MODAL */}
      {analyticsId !== null && (
        <Modal onClose={() => setAnalyticsId(null)} title="Click Analytics" icon={<BarChart3 size={18} color="#10b981"/>} wide>
          {!analytics ? (
            <div style={{textAlign:'center',padding:30,color:'#94a3b8'}}>Loading analytics...</div>
          ) : analytics.error ? (
            <div style={{textAlign:'center',padding:30,color:'#dc2626'}}>{analytics.error}</div>
          ) : (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
                <StatBox label="Total Clicks" val={analytics.total_clicks} color="#10b981"/>
                <StatBox label="Mobile" val={analytics.devices?.mobile||0} color="#0ea5e9"/>
                <StatBox label="Desktop" val={analytics.devices?.desktop||0} color="#8b5cf6"/>
              </div>

              {/* Timeline */}
              {analytics.timeline && analytics.timeline.length > 0 && (
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Clicks — Last 30 Days</div>
                  <div style={{display:'flex',alignItems:'flex-end',gap:2,height:80,background:'#f8f9fb',borderRadius:8,padding:'8px 4px'}}>
                    {analytics.timeline.map((d,i) => {
                      const max = Math.max(...analytics.timeline.map(t => t.clicks), 1);
                      const h = Math.max(2, (d.clicks/max)*60);
                      return <div key={i} title={`${d.date}: ${d.clicks} clicks`} style={{flex:1,height:h,background:d.clicks>0?'#0ea5e9':'#e2e8f0',borderRadius:2,minWidth:1}}/>;
                    })}
                  </div>
                </div>
              )}

              {/* Sources */}
              {analytics.sources && Object.keys(analytics.sources).length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Traffic Sources</div>
                  {Object.entries(analytics.sources).sort((a,b) => b[1]-a[1]).map(([src,count]) => (
                    <div key={src} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f5f6f8'}}>
                      <span style={{fontSize:12,color:'#0f172a',fontWeight:600}}>{src}</span>
                      <span style={{fontSize:12,color:'#64748b',fontWeight:700}}>{count}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Countries */}
              {analytics.countries && Object.keys(analytics.countries).length > 0 && (
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Top Countries</div>
                  {Object.entries(analytics.countries).map(([country,count]) => (
                    <div key={country} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f5f6f8'}}>
                      <span style={{fontSize:12,color:'#0f172a',fontWeight:600}}>{country}</span>
                      <span style={{fontSize:12,color:'#64748b',fontWeight:700}}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:toast.includes('✓')?'#10b981':'#ef4444',color:'#fff',padding:'10px 24px',borderRadius:12,fontSize:13,fontWeight:700,boxShadow:'0 4px 20px rgba(0,0,0,.2)',zIndex:300}}>{toast}</div>
      )}
    </AppLayout>
  );
}

// ── Reusable components ──
function Modal({ onClose, title, icon, wide, children }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:wide?600:480,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f3f7',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {icon}
            <h3 style={{margin:0,fontSize:16,fontWeight:800,color:'#0f172a'}}>{title}</h3>
          </div>
          <button onClick={onClose} style={{width:30,height:30,border:'none',borderRadius:8,background:'#f1f5f9',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14} color="#64748b"/></button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}

function StatBox({ label, val, color }) {
  return (
    <div style={{background:'#f8f9fb',borderRadius:8,padding:'12px',borderLeft:`3px solid ${color}`}}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:.5,color:'#94a3b8',textTransform:'uppercase'}}>{label}</div>
      <div style={{fontSize:22,fontWeight:900,color:'#0f172a',fontFamily:'Sora,sans-serif'}}>{val}</div>
    </div>
  );
}

function Label({ children }) { return <label style={{display:'block',fontSize:12,fontWeight:700,color:'#475569',marginBottom:4}}>{children}</label>; }
function Input(props) { return <input {...props} style={{width:'100%',padding:'10px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',marginBottom:12,boxSizing:'border-box',fontFamily:'inherit',...(props.style||{})}}/>; }

const smallBtn = {
  display:'inline-flex',alignItems:'center',gap:4,padding:'6px 10px',borderRadius:6,
  fontSize:11,fontWeight:600,border:'1px solid #e8ecf2',background:'#f8f9fb',
  color:'#475569',cursor:'pointer',fontFamily:'inherit',
};
