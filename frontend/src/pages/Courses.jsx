import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';

export default function Courses() {
  var { t } = useTranslation();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/courses').then(d => { setCourses(d.courses || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title={t('courses.title')}><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;

  return (
    <AppLayout title="Course Academy" subtitle="Resell SuperAdPro courses and keep 100% commissions"
      topbarActions={<>
        <Link to="/courses/how-it-works" style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,fontSize:12,fontWeight:600,color:'rgba(200,220,255,0.55)',textDecoration:'none',border:'1px solid rgba(255,255,255,0.08)'}}>{t('courses.howCommissionsWork')}</Link>
        <Link to="/courses/commissions" style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,fontSize:12,fontWeight:600,color:'rgba(200,220,255,0.55)',textDecoration:'none',border:'1px solid rgba(255,255,255,0.08)'}}>{t('courses.myCommissions')}</Link>
      </>}
    >
      {/* Coming Soon Banner */}
      <div style={{maxWidth:680,margin:'40px auto 32px',textAlign:'center'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 16px',borderRadius:20,background:'linear-gradient(135deg,rgba(251,191,36,.1),rgba(251,191,36,.04))',border:'1px solid rgba(251,191,36,.15)',marginBottom:20}}>
          <span style={{fontSize:14}}>🚀</span>
          <span style={{fontSize:12,fontWeight:700,color:'#f59e0b',letterSpacing:1,textTransform:'uppercase'}}>Coming Soon</span>
        </div>
        <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:28,fontWeight:800,color:'#0f172a',margin:'0 0 12px'}}>Course Academy</h2>
        <p style={{fontSize:15,color:'#475569',lineHeight:1.7,maxWidth:520,margin:'0 auto 24px'}}>Resell professionally-built SuperAdPro courses to your audience. Keep 100% of your first sale, with a pass-up system that creates ongoing team income.</p>
        <div style={{display:'flex',justifyContent:'center',gap:24,flexWrap:'wrap'}}>
          {[['📚','Ready-made courses to resell'],['💰','100% first sale commission'],['⬆️','Infinite pass-up cascade']].map(function(item,i){
            return <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#475569',fontWeight:600}}>
              <span style={{fontSize:18}}>{item[0]}</span>{item[1]}
            </div>;
          })}
        </div>
      </div>

      {courses.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:24,alignItems:'stretch'}}>
          {courses.map(c => (
            <div key={c.id} className="course-card" style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.16),0 8px 24px rgba(0,0,0,0.12)',transition:'all 0.2s',display:'flex',flexDirection:'column'}}>
              {/* Thumbnail */}
              <div style={{width:'100%',aspectRatio:'16/9',background:'linear-gradient(135deg,#0b1729,#132240,#0e1c30)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={c.title}/>
                ) : (
                  <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(14,165,233,0.7)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 30px rgba(14,165,233,0.3)'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><polygon points="6 3 20 12 6 21"/></svg>
                  </div>
                )}
                <div style={{position:'absolute',top:14,right:14,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'5px 12px',fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#fff'}}>${Math.round(c.price)}</div>
                {c.owned && <div style={{position:'absolute',top:14,left:14,background:'rgba(22,163,74,0.9)',borderRadius:8,padding:'4px 12px',fontSize:13,fontWeight:700,color:'#fff',letterSpacing:0.5}}>{t('courses.owned')}</div>}
              </div>
              {/* Body */}
              <div style={{padding:20,flex:1,display:'flex',flexDirection:'column'}}>
                <div style={{fontSize:17,fontWeight:800,color:'#132044',marginBottom:6,letterSpacing:-0.2}}>{c.title}</div>
                <div style={{fontSize:13,color:'var(--sap-text-secondary)',lineHeight:1.6,marginBottom:16,flex:1}}>{c.description || 'Master the skills you need to succeed in digital marketing and online business.'}</div>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16,fontSize:12,color:'var(--sap-text-muted)'}}>
                  <span style={{display:'flex',alignItems:'center',gap:4}}>📖 {c.chapter_count || 0} chapters</span>
                  <span style={{display:'flex',alignItems:'center',gap:4}}>▶ {c.lesson_count || 0} lessons</span>
                  <span style={{display:'flex',alignItems:'center',gap:4}}>⏱ {c.total_duration || 0}m</span>
                </div>
                {c.owned && c.progress_pct !== undefined && (
                  <div style={{marginBottom:16}}>
                    <div style={{height:5,background:'#f1f3f7',borderRadius:99,overflow:'hidden',marginBottom:4}}>
                      <div style={{height:'100%',background:'linear-gradient(90deg,#0ea5e9,#38bdf8)',borderRadius:99,width:`${c.progress_pct}%`}}/>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--sap-accent)'}}>{c.progress_done || 0}/{c.progress_total || 0} complete ({c.progress_pct}%)</div>
                  </div>
                )}
                {c.owned ? (
                  <a href={`/courses/learn/${c.id}`} style={{display:'block',width:'100%',padding:12,border:'none',borderRadius:10,fontSize:14,fontWeight:700,textAlign:'center',textDecoration:'none',background:'var(--sap-accent)',color:'#fff',boxShadow:'0 2px 8px rgba(14,165,233,0.25)',boxSizing:'border-box'}}>{t('courses.continueLearning')}</a>
                ) : (
                  <form method="POST" action={`/courses/purchase/${c.id}`} onSubmit={e => { if(!confirm(`Purchase ${c.title} for $${Math.round(c.price)} from your wallet balance?`)) e.preventDefault(); }}>
                    <button type="submit" style={{display:'block',width:'100%',padding:12,border:'none',borderRadius:10,fontFamily:'inherit',fontSize:14,fontWeight:700,cursor:'pointer',textAlign:'center',background:'#132044',color:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.1)',boxSizing:'border-box'}}>Buy Course — ${Math.round(c.price)}</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'80px 20px'}}>
          <div style={{fontSize:48,marginBottom:16,opacity:0.5}}>📚</div>
          <div style={{fontSize:18,fontWeight:800,color:'#132044',marginBottom:6}}>{t('courses.noCourses')}</div>
          <div style={{fontSize:14,color:'var(--sap-text-muted)'}}>{t('courses.checkBackSoon')}</div>
        </div>
      )}

      <style>{`.course-card:hover{box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important;transform:translateY(-2px)}`}</style>
    </AppLayout>
  );
}
