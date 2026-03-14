import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
export default function MyNetwork() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiGet('/api/network').then(r => { setD(r); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <AppLayout title="🌐 My Network & Earnings"><Spin/></AppLayout>;
  const data = d||{};
  return (
    <AppLayout title="🌐 My Network & Earnings" subtitle="Your referrals and commission history">
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {[{v:data.personal_referrals||0,l:'Direct Referrals',c:'#16a34a'},{v:data.total_team||0,l:'Total Network',c:'#0ea5e9'},{v:`$${(data.total_earned||0).toFixed(0)}`,l:'Lifetime Earned',c:'#6366f1'},{v:data.course_sales||0,l:'Course Sales',c:'#d97706'}].map((s,i) => (
          <div key={i} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:18,textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.12)'}}>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginTop:4}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <CCard title="Direct Referrals" dot="#16a34a">
          {(data.referrals||[]).length > 0 ? <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Name','Username','Status','Joined'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>
            {data.referrals.map((r,i)=><tr key={i}><td style={tdS}>{r.first_name} {r.last_name||''}</td><td style={{...tdS,fontFamily:'monospace',fontSize:12,color:'#64748b'}}>@{r.username}</td><td style={tdS}><span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:6,...(r.is_active?{background:'rgba(22,163,74,.09)',color:'#16a34a'}:{background:'rgba(245,158,11,.09)',color:'#d97706'})}}>{r.is_active?'Active':'Inactive'}</span></td><td style={{...tdS,fontSize:12,color:'#7b91a8'}}>{r.created_at?new Date(r.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td></tr>)}
          </tbody></table> : <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:13}}>No referrals yet</div>}
        </CCard>
        <CCard title="Commission History" dot="#0ea5e9">
          {(data.commissions||[]).length > 0 ? <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Type','Amount','Status','Date'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>
            {data.commissions.slice(0,15).map((c,i)=><tr key={i}><td style={{...tdS,fontSize:13}}>{(c.commission_type||'').replace(/_/g,' ')}</td><td style={{...tdS,fontWeight:800,color:'#16a34a'}}>+${(c.amount_usdt||c.amount||0).toFixed(2)}</td><td style={tdS}><span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:6,background:c.status==='paid'?'rgba(22,163,74,.09)':'rgba(245,158,11,.09)',color:c.status==='paid'?'#16a34a':'#d97706'}}>{c.status||'pending'}</span></td><td style={{...tdS,fontSize:12,color:'#7b91a8'}}>{c.created_at?new Date(c.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}):'—'}</td></tr>)}
          </tbody></table> : <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:13}}>No commissions yet</div>}
        </CCard>
      </div>
    </AppLayout>
  );
}
function CCard({title,dot,children}){return <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:16,boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)',overflow:'hidden'}}><div style={{padding:'15px 20px',borderBottom:'1px solid rgba(15,25,60,.07)',display:'flex',alignItems:'center',gap:8}}><div style={{width:7,height:7,borderRadius:'50%',background:dot}}/><span style={{fontSize:16,fontWeight:700,color:'#0f172a'}}>{title}</span></div><div style={{padding:0}}>{children}</div></div>}
const thS={fontSize:11,fontWeight:800,color:'#7b91a8',textTransform:'uppercase',letterSpacing:1,padding:'11px 14px',borderBottom:'1px solid rgba(15,25,60,.08)',textAlign:'left',background:'#f6f8fc'};
const tdS={padding:'12px 14px',borderBottom:'1px solid rgba(15,25,60,.05)',fontSize:14,color:'#0f172a'};
function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
