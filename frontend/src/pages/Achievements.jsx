import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';

export default function Achievements() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiGet('/api/achievements').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading) return <AppLayout title="🏅 Achievements"><Spin/></AppLayout>;

  const d = data || {};
  const earned = d.earned || [];
  const available = d.available || [];

  return (
    <AppLayout title="🏅 Achievements" subtitle="Track your milestones and unlock badges">
      {/* Earned */}
      {earned.length > 0 && (<>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#16a34a',marginBottom:12}}>✓ Earned</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14,marginBottom:28}}>
          {earned.map((b,i) => (
            <div key={i} style={{background:'#fff',border:'1px solid #bbf7d0',borderRadius:14,padding:20,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.12)',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#16a34a,#22c55e)'}}/>
              <div style={{fontSize:36,marginBottom:8}}>{b.icon || '🏆'}</div>
              <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>{b.name}</div>
              <div style={{fontSize:11,color:'#7b91a8'}}>{b.description}</div>
              <div style={{marginTop:8,fontSize:10,fontWeight:700,color:'#16a34a'}}>✓ Unlocked</div>
            </div>
          ))}
        </div>
      </>)}

      {/* Available */}
      <div style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#94a3b8',marginBottom:12}}>🔒 Available</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}}>
        {(available.length > 0 ? available : [
          {icon:'👥',name:'First Referral',description:'Refer your first member',progress:0},
          {icon:'⚡',name:'Grid Starter',description:'Activate your first grid tier',progress:0},
          {icon:'🎓',name:'Course Creator',description:'Publish a course on the marketplace',progress:0},
          {icon:'💰',name:'$100 Earned',description:'Reach $100 in total earnings',progress:0},
          {icon:'🔥',name:'5 Referrals',description:'Build a team of 5 direct referrals',progress:0},
          {icon:'🏪',name:'First Sale',description:'Make your first marketplace sale',progress:0},
        ]).map((b,i) => (
          <div key={i} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:20,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.12)',opacity:0.7}}>
            <div style={{fontSize:36,marginBottom:8,filter:'grayscale(0.5)'}}>{b.icon || '🔒'}</div>
            <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4}}>{b.name}</div>
            <div style={{fontSize:11,color:'#7b91a8',marginBottom:8}}>{b.description}</div>
            {b.progress !== undefined && b.progress > 0 && (
              <div style={{height:4,background:'#eef1f8',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',background:'linear-gradient(90deg,#0ea5e9,#38bdf8)',borderRadius:99,width:`${Math.min(100,b.progress)}%`}}/>
              </div>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>; }
