import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
export default function HowCommissionsWork() {
  return (
    <AppLayout title="💡 How Commissions Work" subtitle="Understand the SuperAdPro earnings system">
      <div style={{maxWidth:800,margin:'0 auto'}}>
        {[{n:'1',title:'Membership Referral',desc:'Earn $10 for every person you refer who pays $20/month. This is recurring — you earn every month they stay active.',color:'#16a34a',icon:'🔑'},{n:'2',title:'Grid Direct Sponsor (40%)',desc:'When your direct referral activates a campaign tier, you earn 40% of that tier price immediately.',color:'#0ea5e9',icon:'⚡'},{n:'3',title:'Uni-Level (8 Levels Deep)',desc:'Earn 6.25% on every grid activation across 8 levels of your network. This is where the real compounding happens.',color:'#6366f1',icon:'🌐'},{n:'4',title:'Course Marketplace',desc:'Create and sell courses — earn 50% of every sale. Your affiliates earn 25%, and 25% passes up to your sponsor.',color:'#d97706',icon:'🎓'}].map((s,i) => (
          <div key={i} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,padding:24,marginBottom:16,boxShadow:'0 2px 8px rgba(0,0,0,.12)',display:'flex',gap:16,alignItems:'flex-start'}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${s.color}15`,border:`1px solid ${s.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{s.icon}</div>
            <div><div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:4}}>Step {s.n}: {s.title}</div><div style={{fontSize:14,color:'#475569',lineHeight:1.7}}>{s.desc}</div></div>
          </div>
        ))}
        <div style={{textAlign:'center',marginTop:24}}><Link to="/compensation-plan" style={{display:'inline-block',padding:'12px 28px',borderRadius:10,fontSize:14,fontWeight:700,textDecoration:'none',background:'#0ea5e9',color:'#fff'}}>View Full Compensation Plan →</Link></div>
      </div>
    </AppLayout>
  );
}
