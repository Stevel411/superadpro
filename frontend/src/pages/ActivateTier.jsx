import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';

const TIERS = {
  1: { name:'Starter',     price:20,   views:'5,000',     monthly:'500',    color:'#16a34a' },
  2: { name:'Builder',     price:50,   views:'15,000',    monthly:'1,500',  color:'#0ea5e9' },
  3: { name:'Accelerator', price:100,  views:'35,000',    monthly:'5,000',  color:'#0284c7' },
  4: { name:'Advanced',    price:200,  views:'80,000',    monthly:'10,000', color:'#d97706' },
  5: { name:'Elite',       price:300,  views:'150,000',   monthly:'20,000', color:'#dc2626' },
  6: { name:'Premium',     price:500,  views:'250,000',   monthly:'30,000', color:'#2563eb' },
  7: { name:'Executive',   price:750,  views:'400,000',   monthly:'40,000', color:'#7c3aed' },
  8: { name:'Ultimate',    price:1000, views:'600,000',   monthly:'50,000', color:'#059669' },
};

export default function ActivateTier() {
  const { tierId } = useParams();
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const n = parseInt(tierId);
  const t = TIERS[n];

  if (!t) return <AppLayout title="Campaign Tier"><div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>Invalid tier</div></AppLayout>;

  const handlePayment = async () => {
    if (paying) return;
    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/coinbase/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ payment_type: 'grid_tier', package_tier: n }),
      });
      const data = await res.json();
      if (data.hosted_url) {
        window.location.href = data.hosted_url;
      } else {
        setError(data.error || 'Payment service unavailable. Please try again.');
        setPaying(false);
      }
    } catch (e) {
      setError('Connection error. Please try again.');
      setPaying(false);
    }
  };

  return (
    <AppLayout title={`Activate ${t.name}`} subtitle="Review your campaign tier before purchase">
      <div style={{maxWidth:700,margin:'0 auto'}}>

        {/* Tier summary card — dark theme */}
        <div style={{
          background:'linear-gradient(135deg, #0b1729 0%, #132240 50%, #0e1c30 100%)',
          borderRadius:18, padding:'32px 36px', marginBottom:20,
          position:'relative', overflow:'hidden',
          boxShadow:'0 2px 8px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15)',
        }}>
          {/* Orbs */}
          <div style={{position:'absolute',width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,rgba(14,165,233,0.2),transparent 70%)',top:-30,right:-20,pointerEvents:'none',animation:'orbP 4s ease-in-out infinite'}}/>
          <div style={{position:'absolute',width:80,height:80,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.15),transparent 70%)',bottom:-20,left:40,pointerEvents:'none',animation:'orbP 5s ease-in-out 1s infinite'}}/>

          <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
            <div style={{fontSize:12,fontWeight:700,color:'rgba(56,189,248,0.5)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:8}}>Campaign Tier</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:'#fff',marginBottom:4}}>{t.name}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:48,fontWeight:900,color:'#4ade80',lineHeight:1,marginBottom:8}}>${t.price.toLocaleString()}</div>
            <div style={{fontSize:13,color:'rgba(200,220,255,0.4)'}}>One-time activation fee</div>
          </div>
        </div>

        {/* What you get */}
        <div style={{
          background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,
          boxShadow:'0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
          overflow:'hidden', marginBottom:20,
        }}>
          <div style={{padding:'16px 24px',borderBottom:'1px solid #f1f3f7'}}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>What You Get</div>
          </div>
          <div style={{padding:'20px 24px'}}>
            {[
              { icon:'👁️', title:`Up to ${t.views} engaged video views`, desc:'Real people watching your video ads. Views are counted when a member watches for a minimum of 30 seconds.' },
              { icon:'⚡', title:'8×8 Income Grid position activated', desc:'Your grid has 64 positions. As your network grows and fills positions, you earn commissions on every level.' },
              { icon:'💰', title:'40% direct sponsor commission', desc:'When someone you personally refer activates this same tier, you earn 40% of the tier price instantly.' },
              { icon:'🌐', title:'50% uni-level commissions across 8 levels', desc:'Earn on your entire network — not just direct referrals. 8 levels deep, compounding as your team grows.' },
              { icon:'🏆', title:'5% bonus pool contribution', desc:'A portion funds the grid completion bonus pool, rewarding members who fill their grids.' },
            ].map((item, i) => (
              <div key={i} style={{display:'flex',gap:14,alignItems:'flex-start',padding:'12px 0',borderBottom:i<4?'1px solid #f5f6f8':'none'}}>
                <div style={{fontSize:20,flexShrink:0,marginTop:2}}>{item.icon}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:2}}>{item.title}</div>
                  <div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How the campaign works */}
        <div style={{
          background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,
          boxShadow:'0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
          overflow:'hidden', marginBottom:20,
        }}>
          <div style={{padding:'16px 24px',borderBottom:'1px solid #f1f3f7'}}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>How Your Campaign Works</div>
          </div>
          <div style={{padding:'20px 24px'}}>
            <div style={{display:'flex',gap:16,marginBottom:16}}>
              <div style={{width:32,height:32,borderRadius:10,background:'rgba(14,165,233,0.1)',border:'1px solid rgba(14,165,233,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:'#0ea5e9',flexShrink:0}}>1</div>
              <div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>Your campaign goes live immediately</div><div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>Members across the network start watching your video. Every qualified view is counted towards your {t.views} target.</div></div>
            </div>
            <div style={{display:'flex',gap:16,marginBottom:16}}>
              <div style={{width:32,height:32,borderRadius:10,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:'#059669',flexShrink:0}}>2</div>
              <div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>Campaign completes when views are reached</div><div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>Once your campaign hits {t.views} verified views, it's complete. Your grid position remains active and continues earning commissions.</div></div>
            </div>
            <div style={{display:'flex',gap:16}}>
              <div style={{width:32,height:32,borderRadius:10,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:'#d97706',flexShrink:0}}>3</div>
              <div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>Activate again to keep the momentum</div><div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>When your campaign finishes, activate the same or a higher tier to launch a new campaign. Your network and commissions keep growing — the more you activate, the more you earn.</div></div>
            </div>
          </div>
        </div>

        {/* Commission breakdown */}
        <div style={{
          background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,
          boxShadow:'0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
          overflow:'hidden', marginBottom:24,
        }}>
          <div style={{padding:'16px 24px',borderBottom:'1px solid #f1f3f7'}}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>Commission Breakdown</div>
          </div>
          <div style={{padding:'16px 24px'}}>
            {[
              { label:'Direct Sponsor', pct:'40%', amount:`$${(t.price * 0.4).toFixed(0)}`, desc:'Per referral who activates this tier' },
              { label:'Uni-Level (×8 levels)', pct:'50%', amount:`$${(t.price * 0.0625).toFixed(2)} each`, desc:'6.25% per level across 8 levels' },
              { label:'Bonus Pool', pct:'5%', amount:`$${(t.price * 0.05).toFixed(2)}`, desc:'Grid completion bonus fund' },
              { label:'Platform', pct:'5%', amount:`$${(t.price * 0.05).toFixed(2)}`, desc:'Operations & development' },
            ].map((r, i) => (
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:i<3?'1px solid #f5f6f8':'none'}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{r.label}</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>{r.desc}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:15,fontWeight:800,color:'#16a34a'}}>{r.pct}</div>
                  <div style={{fontSize:12,color:'#64748b'}}>{r.amount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pay button */}
        {error && (
          <div style={{padding:'12px 16px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,marginBottom:16,fontSize:13,fontWeight:600,color:'#dc2626'}}>{error}</div>
        )}

        <button onClick={handlePayment} disabled={paying} style={{
          display:'flex',alignItems:'center',justifyContent:'center',gap:10,
          width:'100%', padding:16, borderRadius:12,
          fontSize:16, fontWeight:800, border:'none', cursor:paying?'wait':'pointer',
          fontFamily:'inherit',
          background:paying?'#94a3b8':'linear-gradient(135deg, #0ea5e9, #38bdf8)',
          color:'#fff',
          boxShadow:paying?'none':'0 4px 16px rgba(14,165,233,0.3)',
          transition:'all 0.2s',
        }}>
          {paying ? 'Creating payment...' : `Pay $${t.price.toLocaleString()} — Activate ${t.name}`}
        </button>

        <div style={{textAlign:'center',marginTop:12}}>
          <Link to="/campaign-tiers" style={{fontSize:13,color:'#94a3b8',textDecoration:'none'}}>← Back to Campaign Tiers</Link>
        </div>
      </div>

      <style>{`
        @keyframes orbP { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.2);opacity:1} }
      `}</style>
    </AppLayout>
  );
}
