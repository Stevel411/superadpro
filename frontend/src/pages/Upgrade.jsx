import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';

export default function Upgrade() {
  const { user } = useAuth();
  const isPro = user?.membership_tier === 'pro';

  const plans = [
    { name: 'Basic', price: '$20/mo', features: ['Affiliate commissions', 'Income Grid access', 'Watch to Earn', 'Course marketplace', 'LinkHub page', 'Community Ad Board', 'Basic support'], current: !isPro },
    { name: 'Pro', price: '$30/mo', features: ['Everything in Basic', 'ProSeller AI assistant', 'AI Funnel Generator', 'Campaign Studio', 'Niche Finder AI', 'Social Post Generator', 'Video Script Generator', 'Email Swipes', 'Lead dashboard', 'Priority support'], current: isPro, highlight: true },
  ];

  return (
    <AppLayout title="⚡ Upgrade" subtitle="Compare plans and unlock Pro features">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,maxWidth:900,margin:'0 auto'}}>
        {plans.map((p,i) => (
          <div key={i} style={{background:'#fff',border:p.highlight?'2px solid #0ea5e9':'1px solid #e5e7eb',borderRadius:18,padding:32,boxShadow:p.highlight?'0 0 0 4px rgba(14,165,233,.1),0 4px 20px rgba(14,165,233,.12)':'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column'}}>
            {p.highlight && <div style={{position:'absolute',top:14,right:14,background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:9,fontWeight:800,letterSpacing:1,textTransform:'uppercase',padding:'4px 12px',borderRadius:20}}>★ Recommended</div>}
            <div style={{fontSize:12,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#94a3b8',marginBottom:8}}>{p.name}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:36,fontWeight:900,color:'#0f172a',marginBottom:4}}>{p.price}</div>
            <div style={{fontSize:12,color:'#7b91a8',marginBottom:20}}>per member per month</div>
            <ul style={{listStyle:'none',padding:0,margin:0,marginBottom:24,flex:1}}>
              {p.features.map((f,j) => (
                <li key={j} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'6px 0',fontSize:13,color:'#2d3b4e',borderBottom:'1px solid rgba(15,25,60,.04)'}}>
                  <span style={{color:p.highlight?'#0ea5e9':'#16a34a',fontWeight:800,fontSize:12,marginTop:2}}>✓</span>{f}
                </li>
              ))}
            </ul>
            {p.current ? (
              <div style={{padding:13,borderRadius:12,fontSize:14,fontWeight:700,textAlign:'center',background:'linear-gradient(180deg,#dcfce7,#bbf7d0)',color:'#059669',boxShadow:'0 3px 0 #86efac'}}>✓ Current Plan</div>
            ) : (
              <a href="/pay-upgrade" style={{display:'block',padding:13,borderRadius:12,fontSize:14,fontWeight:700,textAlign:'center',textDecoration:'none',background:'linear-gradient(180deg,#38bdf8,#0ea5e9)',color:'#fff',boxShadow:'0 4px 0 #0284c7,0 6px 16px rgba(14,165,233,.3)'}}>Upgrade to Pro — $30/mo</a>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
