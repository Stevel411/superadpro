import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
export default function MyCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiGet('/api/marketplace/my-courses').then(d => { setCourses(d.courses||[]); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <AppLayout title="📚 My Courses"><Spin/></AppLayout>;
  return (
    <AppLayout title="📚 My Courses" subtitle="Courses you've created on the marketplace">
      {courses.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:20}}>
          {courses.map(c => (
            <div key={c.id} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>{c.title}</div>
                <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:6,background:c.status==='published'?'rgba(22,163,74,.09)':'rgba(245,158,11,.09)',color:c.status==='published'?'#16a34a':'#d97706'}}>{c.status||'draft'}</span>
              </div>
              <div style={{fontSize:12,color:'#7b91a8',marginBottom:12}}>${c.price||0} · {c.sales||0} sales · ${(c.earnings||0).toFixed(2)} earned</div>
              <div style={{display:'flex',gap:8}}>
                <a href={`/courses/create/${c.id}`} style={{flex:1,padding:10,borderRadius:10,fontSize:13,fontWeight:700,textAlign:'center',textDecoration:'none',background:'#0ea5e9',color:'#fff'}}>Edit</a>
                <a href={`/marketplace/course/${c.id}`} style={{flex:1,padding:10,borderRadius:10,fontSize:13,fontWeight:700,textAlign:'center',textDecoration:'none',background:'#f8f9fb',color:'#0f172a',border:'1px solid #e5e7eb'}}>Preview</a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 20px'}}><div style={{fontSize:40,marginBottom:12,opacity:.5}}>📚</div><div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:4}}>No courses created yet</div><div style={{fontSize:13,color:'#94a3b8',marginBottom:16}}>Create your first course and earn 50% on every sale.</div><Link to="/courses/create" style={{display:'inline-block',padding:'12px 24px',borderRadius:10,fontSize:14,fontWeight:700,textDecoration:'none',background:'#0ea5e9',color:'#fff'}}>Create Course</Link></div>
      )}
    </AppLayout>
  );
}
function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
