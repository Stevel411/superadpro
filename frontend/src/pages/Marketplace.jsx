import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';

export default function Marketplace() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => { apiGet('/api/marketplace/browse').then(d => { setCourses(d.courses || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const filtered = courses.filter(c => {
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'all' && c.category !== category) return false;
    return true;
  });
  const categories = ['all', ...new Set(courses.map(c => c.category).filter(Boolean))];

  if (loading) return <AppLayout title="🏪 Course Marketplace"><Spin/></AppLayout>;

  return (
    <AppLayout title="🏪 Course Marketplace" subtitle="Community courses · 50% creator / 25% affiliate / 25% pass-up">
      {/* Search + Filter */}
      <div style={{display:'flex',gap:12,marginBottom:24,flexWrap:'wrap'}}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..." style={{flex:1,minWidth:200,padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,fontFamily:'inherit',background:'#f8f9fb'}}/>
        <select value={category} onChange={e => setCategory(e.target.value)} style={{padding:'10px 14px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:14,fontFamily:'inherit',background:'#f8f9fb',color:'#0f172a'}}>
          {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
      </div>

      {filtered.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:20,alignItems:'stretch'}}>
          {filtered.map(c => (
            <div key={c.id} className="mp-card" style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)',transition:'all .2s',display:'flex',flexDirection:'column'}}>
              <div style={{aspectRatio:'16/9',background:'linear-gradient(135deg,#0b1729,#132240)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                {c.thumbnail_url ? <img src={c.thumbnail_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : <div style={{fontSize:32}}>📚</div>}
                <div style={{position:'absolute',top:12,right:12,background:'rgba(0,0,0,.6)',backdropFilter:'blur(8px)',borderRadius:8,padding:'4px 10px',fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:'#fff'}}>${Math.round(c.price || 0)}</div>
                <div style={{position:'absolute',bottom:12,left:12,display:'flex',gap:4}}>
                  <span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:6,background:'rgba(22,163,74,.8)',color:'#fff'}}>50%</span>
                  <span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:6,background:'rgba(14,165,233,.8)',color:'#fff'}}>25%</span>
                  <span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:6,background:'rgba(139,92,246,.8)',color:'#fff'}}>25%</span>
                </div>
              </div>
              <div style={{padding:18,flex:1,display:'flex',flexDirection:'column'}}>
                <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:4}}>{c.title}</div>
                <div style={{fontSize:12,color:'#7b91a8',marginBottom:4}}>by {c.creator_name || 'Creator'}</div>
                <div style={{fontSize:12,color:'#475569',lineHeight:1.5,marginBottom:12,flex:1}}>{c.description?.slice(0,100) || 'A community-created course.'}</div>
                {c.category && <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,background:'#f1f5f9',color:'#64748b',alignSelf:'flex-start',marginBottom:12}}>{c.category}</span>}
                <a href={`/marketplace/course/${c.id}`} style={{display:'block',width:'100%',padding:11,borderRadius:10,fontSize:13,fontWeight:700,textAlign:'center',textDecoration:'none',background:'#1a1a2e',color:'#fff',boxSizing:'border-box'}}>View Course</a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 20px'}}>
          <div style={{fontSize:40,marginBottom:12,opacity:.5}}>🏪</div>
          <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:4}}>No courses found</div>
          <div style={{fontSize:13,color:'#94a3b8'}}>Try different search terms or check back later.</div>
        </div>
      )}
      <style>{`.mp-card:hover{box-shadow:0 6px 20px rgba(0,0,0,.22),0 12px 40px rgba(0,0,0,.16)!important;transform:translateY(-2px)}`}</style>
    </AppLayout>
  );
}
function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>; }
