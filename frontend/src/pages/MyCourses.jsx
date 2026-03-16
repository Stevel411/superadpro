import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { GraduationCap, BookOpen, CheckCircle, Clock } from 'lucide-react';

export default function MyCourses() {
  var [stats, setStats] = useState(null);
  var [courses, setCourses] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    Promise.all([
      apiGet('/api/courses/stats').catch(function() { return {}; }),
      apiGet('/api/courses').catch(function() { return []; }),
    ]).then(function(results) {
      setStats(results[0]);
      setCourses(results[1] || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <AppLayout title="My Courses"><Spin/></AppLayout>;

  var st = stats || {};
  var owned = st.owned_tiers || [];

  return (
    <AppLayout title="My Courses" subtitle="Your purchased courses and learning progress">
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {[
          {value:owned.length,label:'Courses Owned',color:'#8b5cf6',bg:'#f5f3ff',border:'#e9d5ff'},
          {value:st.course_sale_count||0,label:'Course Sales',color:'#16a34a',bg:'#f0fdf4',border:'#dcfce7'},
          {value:'$'+(st.total_earned||0).toFixed(0),label:'Course Earnings',color:'#0ea5e9',bg:'#f0f9ff',border:'#bae6fd'},
          {value:(st.direct_commissions||0)+(st.passup_commissions||0),label:'Total Commissions',color:'#f59e0b',bg:'#fffbeb',border:'#fef3c7'},
        ].map(function(s, i) {
          return (
            <div key={i} style={{background:s.bg,border:'1px solid '+s.border,borderRadius:14,padding:20}}>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginTop:4}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Course list */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
        <div style={{background:'#1c223d',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <GraduationCap size={16} color="#a78bfa"/>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Available Courses</div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)'}}>{courses.length} courses</div>
        </div>
        <div style={{padding:'20px'}}>
          {courses.length > 0 ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
              {courses.map(function(c, i) {
                var isOwned = owned.indexOf(c.tier) >= 0;
                var tierColors = {1:'#16a34a',2:'#0ea5e9',3:'#8b5cf6'};
                var tierNames = {1:'Starter',2:'Advanced',3:'Elite'};
                var color = tierColors[c.tier] || '#64748b';
                return (
                  <div key={c.id || i} style={{borderRadius:12,border:'1px solid #e8ecf2',overflow:'hidden',position:'relative'}}>
                    <div style={{background:color,padding:'18px 16px',textAlign:'center'}}>
                      <div style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,.6)',letterSpacing:1,textTransform:'uppercase'}}>Tier {c.tier} — {tierNames[c.tier] || 'Course'}</div>
                      <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:'#fff',margin:'6px 0'}}>${c.price}</div>
                    </div>
                    <div style={{padding:'16px'}}>
                      <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>{c.title}</div>
                      <div style={{fontSize:12,color:'#64748b',lineHeight:1.6,marginBottom:12}}>{c.description}</div>
                      {isOwned ? (
                        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'#16a34a'}}>
                          <CheckCircle size={14}/> Purchased
                        </div>
                      ) : (
                        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'#94a3b8'}}>
                          <Clock size={14}/> Not purchased
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12,opacity:.3}}>📚</div>
              <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:4}}>No courses available yet</div>
              <div style={{fontSize:13,color:'#94a3b8'}}>Courses will appear here as they are published</div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>; }
