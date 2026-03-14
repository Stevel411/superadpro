import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';

const TIERS = [
  {n:1,name:'Starter',price:20,views:'5,000',monthly:'500',earn:'$8',color:'#0ea5e9',shadow:'1px 1px 0 #0284c7,2px 2px 0 #0369a1,3px 3px 0 #075985,4px 4px 8px rgba(14,165,233,0.25)',viewBg:'linear-gradient(135deg,#eff6ff,#e0f2fe)',viewBorder:'#bae6fd',grad:'linear-gradient(90deg,#0ea5e9,#38bdf8)'},
  {n:2,name:'Builder',price:50,views:'15,000',monthly:'1,500',earn:'$20',color:'#6366f1',shadow:'1px 1px 0 #4f46e5,2px 2px 0 #4338ca,3px 3px 0 #3730a3,4px 4px 8px rgba(99,102,241,0.25)',viewBg:'linear-gradient(135deg,#eef2ff,#e0e7ff)',viewBorder:'#c7d2fe',grad:'linear-gradient(90deg,#6366f1,#818cf8)'},
  {n:3,name:'Pro',price:100,views:'35,000',monthly:'5,000',earn:'$40',color:'#059669',shadow:'1px 1px 0 #047857,2px 2px 0 #065f46,3px 3px 0 #064e3b,4px 4px 8px rgba(5,150,105,0.25)',viewBg:'linear-gradient(135deg,#f0fdf4,#dcfce7)',viewBorder:'#bbf7d0',grad:'linear-gradient(90deg,#059669,#10b981)'},
  {n:4,name:'Advanced',price:200,views:'80,000',monthly:'10,000',earn:'$80',color:'#d97706',shadow:'1px 1px 0 #b45309,2px 2px 0 #92400e,3px 3px 0 #78350f,4px 4px 8px rgba(217,119,6,0.25)',viewBg:'linear-gradient(135deg,#fffbeb,#fef3c7)',viewBorder:'#fde68a',grad:'linear-gradient(90deg,#f59e0b,#fbbf24)',popular:true},
  {n:5,name:'Elite',price:400,views:'150,000',monthly:'20,000',earn:'$160',color:'#dc2626',shadow:'1px 1px 0 #b91c1c,2px 2px 0 #991b1b,3px 3px 0 #7f1d1d,4px 4px 8px rgba(220,38,38,0.25)',viewBg:'linear-gradient(135deg,#fff1f2,#ffe4e6)',viewBorder:'#fecdd3',grad:'linear-gradient(90deg,#ef4444,#f87171)'},
  {n:6,name:'Premium',price:600,views:'250,000',monthly:'30,000',earn:'$240',color:'#db2777',shadow:'1px 1px 0 #be185d,2px 2px 0 #9d174d,3px 3px 0 #831843,4px 4px 8px rgba(219,39,119,0.25)',viewBg:'linear-gradient(135deg,#fdf2f8,#fce7f3)',viewBorder:'#fbcfe8',grad:'linear-gradient(90deg,#ec4899,#f472b6)'},
  {n:7,name:'Executive',price:800,views:'400,000',monthly:'40,000',earn:'$320',color:'#7c3aed',shadow:'1px 1px 0 #6d28d9,2px 2px 0 #5b21b6,3px 3px 0 #4c1d95,4px 4px 8px rgba(124,58,237,0.25)',viewBg:'linear-gradient(135deg,#faf5ff,#f3e8ff)',viewBorder:'#e9d5ff',grad:'linear-gradient(90deg,#7c3aed,#a78bfa)'},
  {n:8,name:'Ultimate',price:1000,views:'600,000',monthly:'50,000+',earn:'$400',color:'#0284c7',shadow:'1px 1px 0 #0369a1,2px 2px 0 #075985,3px 3px 0 #0c4a6e,4px 4px 8px rgba(2,132,199,0.25)',viewBg:'linear-gradient(135deg,#eff6ff,#dbeafe)',viewBorder:'#bfdbfe',grad:'linear-gradient(90deg,#0284c7,#38bdf8)'},
];

export default function CampaignTiers() {
  const [activeTiers, setActiveTiers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/campaign-tiers').then(d => { setActiveTiers(d.active_tiers || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="📦 Campaign Tiers"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;

  const renderTierCard = (t) => {
    const isActive = activeTiers.includes(t.n);
    const features = [
      'Grid position activated',
      'Upload & promote videos',
      `${t.monthly} monthly ad views`,
      ...(t.n >= 4 ? ['Geo & interest targeting'] : []),
      ...(t.n >= 5 ? ['Priority delivery queue'] : []),
      ...(t.n >= 6 ? ['Featured placement'] : []),
      ...(t.n >= 7 ? ['Spotlight placement'] : []),
      '40% direct commission',
      '8-level uni-level commissions',
    ];
    return (
      <div key={t.n} className="tier-card" style={{
        background:'#fff',border:t.popular?'1px solid rgba(245,158,11,0.4)':'1px solid #d0d8e4',borderRadius:16,padding:22,
        position:'relative',overflow:'hidden',boxShadow:t.popular?'0 0 0 2px rgba(245,158,11,0.2),0 4px 20px rgba(245,158,11,0.1)':'0 2px 8px rgba(0,0,0,0.16),0 8px 24px rgba(0,0,0,0.12)',
        transition:'all 0.25s',display:'flex',flexDirection:'column',
      }}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:5,background:t.grad,borderRadius:'16px 16px 0 0'}}/>
        {t.popular && <div style={{position:'absolute',top:14,right:14,background:'linear-gradient(135deg,#f59e0b,#fbbf24)',color:'#fff',fontSize:9,fontWeight:900,letterSpacing:1,textTransform:'uppercase',padding:'4px 10px',borderRadius:20,boxShadow:'0 2px 8px rgba(245,158,11,0.4)'}}>★ Most Popular</div>}
        <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#7b91a8',marginBottom:10}}>{t.name}</div>
        <div style={{fontFamily:'Sora,sans-serif',fontSize:48,fontWeight:900,lineHeight:1,marginBottom:3,letterSpacing:-1,color:t.color,textShadow:t.shadow}}><sup style={{fontSize:22,fontWeight:700,verticalAlign:'super'}}>$</sup>{t.price.toLocaleString()}</div>
        <div style={{fontSize:12,color:'#7b91a8',marginBottom:16}}>${t.price}</div>
        <div style={{borderRadius:10,padding:13,textAlign:'center',marginBottom:12,background:t.viewBg,border:`1px solid ${t.viewBorder}`}}>
          <div style={{fontSize:9,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#7b91a8'}}>Up To</div>
          <div style={{fontSize:20,fontWeight:800,lineHeight:1.2,color:t.color}}>{t.views}</div>
          <div style={{fontSize:9,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#7b91a8'}}>Engaged Video Views</div>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'8px 12px',marginBottom:14}}>
          <span style={{fontSize:11,fontWeight:700,color:'#15803d'}}>Earn per referral</span>
          <span style={{fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:900,color:'#15803d'}}>{t.earn}</span>
        </div>
        <ul style={{listStyle:'none',marginBottom:18,flex:1,padding:0}}>
          {features.map((f,i) => (
            <li key={i} style={{fontSize:13,color:'#2d3b4e',padding:'5px 0',display:'flex',alignItems:'flex-start',gap:8,borderBottom:i<features.length-1?'1px solid rgba(15,25,60,.05)':'none'}}>
              <span style={{fontWeight:800,fontSize:12,flexShrink:0,marginTop:2,color:f.includes('targeting')||f.includes('Priority')||f.includes('Featured')?'#f59e0b':f.includes('Spotlight')?'#7c3aed':'#16a34a'}}>✓</span>
              {f}
            </li>
          ))}
        </ul>
        {isActive ? (
          <div style={{display:'block',width:'100%',padding:13,border:'none',borderRadius:12,fontSize:14,fontWeight:700,textAlign:'center',background:'linear-gradient(180deg,#dcfce7,#bbf7d0)',color:'#059669',boxShadow:'0 3px 0 #86efac'}}>✓ Active</div>
        ) : (
          <a href={`/activate-grid?tier=${t.n}`} style={{display:'block',width:'100%',padding:13,border:'none',borderRadius:12,fontFamily:'inherit',fontSize:14,fontWeight:700,textAlign:'center',textDecoration:'none',background:'linear-gradient(180deg,#38bdf8,#0ea5e9)',color:'#fff',boxShadow:'0 4px 0 #0284c7,0 6px 16px rgba(14,165,233,0.3)',textShadow:'0 1px 2px rgba(0,0,0,0.15)',cursor:'pointer',transition:'all 0.2s'}}>Activate — ${t.price.toLocaleString()}</a>
        )}
      </div>
    );
  };

  return (
    <AppLayout title="📦 Campaign Tiers" subtitle="Activate tiers to unlock advertising & earn commissions">
      {/* Hero */}
      <div style={{background:'#fff',borderBottom:'1px solid rgba(15,25,60,0.08)',padding:'32px 40px 28px',textAlign:'center',position:'relative',overflow:'hidden',marginBottom:0,borderRadius:'18px 18px 0 0',marginLeft:-24,marginRight:-24,marginTop:-18}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 80% at 50% 0%,rgba(14,165,233,0.06),transparent),radial-gradient(ellipse 30% 50% at 10% 100%,rgba(99,102,241,0.04),transparent),radial-gradient(ellipse 30% 50% at 90% 100%,rgba(16,185,129,0.04),transparent)'}}/>
        <div style={{position:'relative',zIndex:1,maxWidth:680,margin:'0 auto'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:11,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#0ea5e9',background:'rgba(14,165,233,0.08)',border:'1px solid rgba(14,165,233,0.2)',padding:'5px 14px',borderRadius:20,marginBottom:14}}>⚡ Income Grid · Campaign Tiers</div>
          <div style={{fontFamily:'Sora,sans-serif',fontSize:34,fontWeight:900,color:'#0f172a',lineHeight:1.15,marginBottom:10}}>Choose Your <span style={{background:'linear-gradient(135deg,#0ea5e9,#6366f1)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Power Level</span></div>
          <div style={{fontSize:14,color:'#5a6a7e',lineHeight:1.7,maxWidth:500,margin:'0 auto 22px'}}>Each tier activates an 8×8 grid position, unlocks video advertising and opens the door to commissions across 8 levels deep.</div>
          <div style={{display:'inline-flex',alignItems:'center',background:'#f6f8fc',border:'1px solid rgba(15,25,60,0.09)',borderRadius:14,overflow:'hidden'}}>
            {[{v:'40%',l:'Direct Commission',g:true},{v:'6.25%',l:'Uni-Level × 8',g:true},{v:'600K',l:'Max Views / Tier'},{v:'♾',l:'Recurring Grids'}].map((s,i,a) => (
              <div key={i} style={{display:'flex',alignItems:'center'}}>
                <div style={{textAlign:'center',padding:'14px 24px'}}>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:s.g?'#16a34a':'#0ea5e9'}}>{s.v}</div>
                  <div style={{fontSize:9,fontWeight:800,letterSpacing:1,textTransform:'uppercase',color:'#94a3b8',marginTop:3}}>{s.l}</div>
                </div>
                {i < a.length-1 && <div style={{width:1,background:'rgba(15,25,60,0.08)',alignSelf:'stretch'}}/>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tier Cards */}
      <div style={{marginTop:24}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#94a3b8',marginBottom:12}}>Entry & Mid Tiers</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20,alignItems:'stretch'}}>
          {TIERS.filter(t => t.n <= 4).map(renderTierCard)}
        </div>

        <div style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#94a3b8',marginBottom:12,marginTop:20}}>Power Tiers</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20,alignItems:'stretch'}}>
          {TIERS.filter(t => t.n >= 5).map(renderTierCard)}
        </div>
      </div>

      {/* How It Works */}
      <div style={{background:'#fff',border:'1px solid rgba(15,25,60,0.08)',borderRadius:18,overflow:'hidden',marginTop:4,boxShadow:'0 2px 8px rgba(0,0,0,0.16),0 8px 24px rgba(0,0,0,0.12)'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)'}}>
          {[
            {n:'1',bg:'rgba(14,165,233,0.03)',numBg:'#eff6ff',numBorder:'#bae6fd',numColor:'#0ea5e9',title:'Activate Your Tier',desc:<>Pay once. Your <span style={{color:'#0ea5e9',fontWeight:700}}>8×8 grid position</span> is immediately activated with 64 slots filling across your network.</>},
            {n:'2',bg:'rgba(99,102,241,0.03)',numBg:'#eef2ff',numBorder:'#c7d2fe',numColor:'#6366f1',title:'Earn on Every Level',desc:<><span style={{color:'#6366f1',fontWeight:700}}>40% direct commission</span> on every personal referral who activates the same tier. Plus <span style={{color:'#6366f1',fontWeight:700}}>6.25%</span> uni-level across 8 levels deep.</>},
            {n:'3',bg:'rgba(16,185,129,0.03)',numBg:'#f0fdf4',numBorder:'#bbf7d0',numColor:'#059669',title:'Compound Forever',desc:<>When a grid fills it <span style={{color:'#059669',fontWeight:700}}>auto-advances</span>. New grid starts immediately. Your income compounds as your network grows — no ceiling.</>,cta:true},
          ].map((s,i) => (
            <div key={i} style={{padding:'28px 30px',borderRight:i<2?'1px solid rgba(15,25,60,0.07)':'none',background:`linear-gradient(135deg,${s.bg},transparent)`}}>
              <div style={{width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:900,marginBottom:14,background:s.numBg,border:`1px solid ${s.numBorder}`,color:s.numColor}}>{s.n}</div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:8}}>{s.title}</div>
              <div style={{fontSize:13,color:'#5a6a7e',lineHeight:1.75}}>{s.desc}</div>
              {s.cta && <Link to="/income-grid" style={{display:'inline-flex',alignItems:'center',gap:8,marginTop:18,padding:'11px 22px',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontSize:13,fontWeight:700,borderRadius:10,textDecoration:'none',boxShadow:'0 4px 0 #0284c7,0 6px 16px rgba(14,165,233,0.25)'}}>⚡ View Your Grid →</Link>}
            </div>
          ))}
        </div>
      </div>

      <style>{`.tier-card:hover{transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,0.22),0 12px 40px rgba(0,0,0,0.16)!important}`}</style>
    </AppLayout>
  );
}
