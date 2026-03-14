import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
export default function CourseCreate() {
  return (
    <AppLayout title="🏗️ Create Course" subtitle="Build and sell courses on the marketplace">
      <div style={{maxWidth:700,margin:'0 auto',textAlign:'center'}}>
        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:18,padding:'48px 32px',boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)'}}>
          <div style={{fontSize:48,marginBottom:16}}>🎓</div>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#0f172a',marginBottom:8}}>Course Creation Wizard</div>
          <div style={{fontSize:14,color:'#475569',lineHeight:1.7,marginBottom:24,maxWidth:400,margin:'0 auto 24px'}}>Create your course in 3 easy steps: set up details, add chapters and lessons, then publish to the marketplace.</div>
          <a href="/courses/create" style={{display:'inline-block',padding:'14px 32px',borderRadius:12,fontSize:15,fontWeight:700,textDecoration:'none',background:'linear-gradient(180deg,#38bdf8,#0ea5e9)',color:'#fff',boxShadow:'0 4px 0 #0284c7'}}>Start Creating →</a>
        </div>
      </div>
    </AppLayout>
  );
}
