import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
export default function AdBoard() {
  const [ads, setAds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiGet('/api/ad-board').then(d => { setAds(d.ads||[]); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const filtered = ads.filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase()));
  if (loading) return <AppLayout title="📢 Ad Board"><Spin/></AppLayout>;
  return (
    <AppLayout title="📢 Ad Board" subtitle="Community marketplace — browse and share ads">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ads..." style={{width:'100%',padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,fontFamily:'inherit',background:'#f8f9fb',marginBottom:20,boxSizing:'border-box'}}/>
      {filtered.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
          {filtered.map((a,i) => (
            <a key={i} href={a.url||'#'} target="_blank" rel="noopener noreferrer" className="ad-card" style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:16,textDecoration:'none',boxShadow:'0 2px 8px rgba(0,0,0,.12)',transition:'all .15s',display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{fontSize:24}}>{a.emoji||'📢'}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>{a.category||'General'}</div>
                </div>
              </div>
              {a.description && <div style={{fontSize:12,color:'#475569',lineHeight:1.4}}>{a.description.slice(0,80)}</div>}
            </a>
          ))}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 20px'}}><div style={{fontSize:40,marginBottom:12,opacity:.5}}>📢</div><div style={{fontSize:16,fontWeight:700,marginBottom:4}}>No ads yet</div><div style={{fontSize:13,color:'#94a3b8'}}>Community ads will appear here as members post them.</div></div>
      )}
      <style>{`.ad-card:hover{box-shadow:0 6px 20px rgba(0,0,0,.18)!important;transform:translateY(-2px)}`}</style>
    </AppLayout>
  );
}
function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
