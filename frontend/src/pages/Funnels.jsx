import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
export default function Funnels() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiGet('/api/funnels').then(d => { setPages(d.pages||[]); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <AppLayout title="🚀 SuperPages"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;
  return (
    <AppLayout title="🚀 SuperPages" subtitle="Your landing pages and funnels">
      {pages.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
          {pages.map(p => (
            <div key={p.id} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,.12)'}}>
              <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:4}}>{p.title||'Untitled'}</div>
              <div style={{fontSize:12,color:'#94a3b8',marginBottom:12}}>{p.views||0} views</div>
              <div style={{display:'flex',gap:8}}>
                <Link to={`/pro/funnel/${p.id}/edit`} style={{flex:1,padding:10,borderRadius:10,fontSize:13,fontWeight:700,textAlign:'center',textDecoration:'none',background:'#0ea5e9',color:'#fff'}}>Edit</Link>
                <a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{flex:1,padding:10,borderRadius:10,fontSize:13,fontWeight:700,textAlign:'center',textDecoration:'none',background:'#f8f9fb',color:'#0f172a',border:'1px solid #e5e7eb'}}>View</a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 20px'}}><div style={{fontSize:40,marginBottom:12,opacity:.5}}>🚀</div><div style={{fontSize:16,fontWeight:700,marginBottom:4}}>No pages yet</div><div style={{fontSize:13,color:'#94a3b8'}}>Create your first landing page.</div></div>
      )}
    </AppLayout>
  );
}
