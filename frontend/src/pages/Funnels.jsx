import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Plus, Eye, Pencil, Trash2, Copy, ExternalLink, FileText } from 'lucide-react';

export default function Funnels() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const navigate = useNavigate();

  const load = () => apiGet('/api/funnels').then(d => { setPages(d.funnels||d.pages||[]); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openTemplates = async () => {
    setShowTemplates(true);
    if (templates.length === 0) {
      try { const d = await apiGet('/api/funnels/templates'); setTemplates(d.templates || []); } catch(e) {}
    }
  };

  const createFromTemplate = async (key) => {
    setCreating(true);
    setShowTemplates(false);
    try {
      if (key === 'blank') {
        const res = await apiPost('/api/funnels/save', { title: 'Untitled Page', status: 'draft' });
        if (res.id) navigate(`/pro/funnel/${res.id}/edit`);
      } else {
        const res = await apiPost('/api/funnels/from-template', { niche: key });
        if (res.edit_url) {
          const newId = res.edit_url.split('/').pop();
          navigate(`/pro/funnel/${newId}/edit`);
        }
      }
    } catch (e) { alert(e.message); }
    setCreating(false);
  };

  const createNew = async () => {
    setCreating(true);
    try {
      const res = await apiPost('/api/funnels/save', { title: 'Untitled Page', status: 'draft' });
      if (res.id) navigate(`/pro/funnel/${res.id}/edit`);
      else setCreating(false);
    } catch (e) { alert(e.message); setCreating(false); }
  };

  const deletePage = async (id, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await apiPost(`/api/funnels/delete/${id}`, {});
      setPages(p => p.filter(x => x.id !== id));
    } catch (e) { alert(e.message); }
  };

  const duplicatePage = async (id) => {
    try {
      const res = await apiPost('/api/funnels/from-template', { source_page_id: id });
      if (res.edit_url) {
        const newId = res.edit_url.split('/').pop();
        navigate(`/pro/funnel/${newId}/edit`);
      } else load();
    } catch (e) { alert(e.message); }
  };

  if (loading) return <AppLayout title="SuperPages"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;

  return (
    <AppLayout title="SuperPages" subtitle="Your landing pages and funnels">
      {/* Create button */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontSize:12,color:'#94a3b8'}}>{pages.length} page{pages.length !== 1 ? 's' : ''}</div>
        <button onClick={openTemplates} disabled={creating} style={{
          display:'flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:700,
          border:'none',cursor:'pointer',fontFamily:'inherit',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',
          boxShadow:'0 4px 14px rgba(14,165,233,.3)',
        }}><Plus size={16}/> {creating ? 'Creating...' : 'Create New Page'}</button>
      </div>

      {pages.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
          {pages.map(p => (
            <div key={p.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)',display:'flex',flexDirection:'column'}}>
              {/* Card header */}
              <div style={{padding:'14px 16px',borderBottom:'1px solid #f1f3f7'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                  <div style={{fontSize:15,fontWeight:800,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{p.title || 'Untitled'}</div>
                  <span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:4,marginLeft:8,flexShrink:0,
                    ...(p.status === 'published' ? {background:'rgba(22,163,74,.08)',color:'#16a34a'} : {background:'#f8f9fb',color:'#94a3b8'}),
                  }}>{p.status === 'published' ? '● Live' : '○ Draft'}</span>
                </div>
                {p.slug && <div style={{fontSize:11,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>/{p.slug}</div>}
              </div>

              {/* Stats row */}
              <div style={{padding:'10px 16px',display:'flex',gap:16,borderBottom:'1px solid #f1f3f7'}}>
                {[
                  {Icon:Eye,val:p.views||0,lbl:'Views'},
                  {Icon:FileText,val:p.leads_captured||0,lbl:'Leads'},
                ].map((s,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                    <s.Icon size={14} color="#94a3b8" strokeWidth={2}/>
                    <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{s.val}</span>
                    <span style={{fontSize:11,color:'#94a3b8'}}>{s.lbl}</span>
                  </div>
                ))}
                {p.is_ai_generated && <span style={{fontSize:9,fontWeight:700,color:'#6366f1',background:'rgba(99,102,241,.08)',padding:'2px 6px',borderRadius:4,marginLeft:'auto'}}>AI Generated</span>}
              </div>

              {/* Actions */}
              <div style={{padding:'10px 16px',display:'flex',gap:6,marginTop:'auto'}}>
                <Link to={`/pro/funnel/${p.id}/edit`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px 12px',borderRadius:6,fontSize:12,fontWeight:700,textDecoration:'none',background:'#0ea5e9',color:'#fff'}}>
                  <Pencil size={13}/> Edit
                </Link>
                {p.status === 'published' && p.slug && (
                  <a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px 12px',borderRadius:6,fontSize:12,fontWeight:700,textDecoration:'none',background:'#f8f9fb',color:'#0f172a',border:'1px solid #e8ecf2'}}>
                    <ExternalLink size={13}/> View
                  </a>
                )}
                <button onClick={() => duplicatePage(p.id)} title="Duplicate" style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'8px 10px',borderRadius:6,border:'1px solid #e8ecf2',background:'#f8f9fb',cursor:'pointer'}}>
                  <Copy size={14} color="#64748b"/>
                </button>
                <button onClick={() => deletePage(p.id, p.title)} title="Delete" style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'8px 10px',borderRadius:6,border:'1px solid #fecaca',background:'#fef2f2',cursor:'pointer'}}>
                  <Trash2 size={14} color="#dc2626"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 20px',background:'#fff',border:'1px solid #e8ecf2',borderRadius:8}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(14,165,233,.08)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><FileText size={28} color="#0ea5e9"/></div>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:6}}>No pages yet</div>
          <div style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>Create your first landing page to start capturing leads and driving conversions.</div>
          <button onClick={openTemplates} disabled={creating} style={{
            display:'inline-flex',alignItems:'center',gap:6,padding:'12px 28px',borderRadius:8,fontSize:14,fontWeight:700,
            border:'none',cursor:'pointer',fontFamily:'inherit',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',
          }}><Plus size={16}/> Create Your First Page</button>
        </div>
      )}
      {/* Template Picker Modal */}
      {showTemplates && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={() => setShowTemplates(false)}>
          <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:12,padding:24,width:600,maxHeight:'80vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:4}}>Choose a Template</div>
            <div style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>Start with a pre-built page or a blank canvas.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              {templates.map(t => (
                <button key={t.key} onClick={() => createFromTemplate(t.key)} disabled={creating} style={{
                  background:'#f8f9fb',border:'1px solid #e8ecf2',borderRadius:8,padding:'20px 14px',cursor:'pointer',
                  textAlign:'center',transition:'all .15s',fontFamily:'inherit',
                }}>
                  <div style={{fontSize:28,marginBottom:8}}>{t.icon}</div>
                  <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:2}}>{t.title}</div>
                  <div style={{fontSize:11,color:'#94a3b8',lineHeight:1.4}}>{t.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTemplates(false)} style={{marginTop:16,width:'100%',padding:10,borderRadius:8,border:'1px solid #e8ecf2',background:'#fff',fontSize:13,fontWeight:600,color:'#64748b',cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
