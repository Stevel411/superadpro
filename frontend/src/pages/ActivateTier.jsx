import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { CreditCard, Coins } from 'lucide-react';
import CryptoCheckout from '../components/CryptoCheckout';

const TIERS = {
  1: { name:'Starter',     price:20,   views:'5,000',     monthly:'500',    bonus:64 },
  2: { name:'Builder',     price:50,   views:'15,000',    monthly:'1,500',  bonus:160 },
  3: { name:'Pro',         price:100,  views:'35,000',    monthly:'5,000',  bonus:320 },
  4: { name:'Advanced',    price:200,  views:'80,000',    monthly:'10,000', bonus:640 },
  5: { name:'Elite',       price:400,  views:'150,000',   monthly:'20,000', bonus:1280 },
  6: { name:'Premium',     price:600,  views:'250,000',   monthly:'30,000', bonus:1920 },
  7: { name:'Executive',   price:800,  views:'400,000',   monthly:'40,000', bonus:2560 },
  8: { name:'Ultimate',    price:1000, views:'600,000',   monthly:'50,000', bonus:3200 },
};

export default function ActivateTier() {
  const { tierId } = useParams();
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [cryptoCheckout, setCryptoCheckout] = useState(false);

  const n = parseInt(tierId);
  const t = TIERS[n];

  if (!t) return <AppLayout title="Campaign Tier"><div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>Invalid tier</div></AppLayout>;

  const handlePayment = async () => {
    if (paying) return;
    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/create-grid-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ package_tier: n }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
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

        {/* Tier hero — dark theme with animations */}
        <div style={{
          background:'linear-gradient(135deg, #0b1729 0%, #132240 50%, #0e1c30 100%)',
          borderRadius:8, padding:'32px 36px', marginBottom:20,
          position:'relative', overflow:'hidden',
          boxShadow:'0 2px 8px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15)',
        }}>
          <div className="anim-orb ao1"/><div className="anim-orb ao2"/><div className="anim-orb ao3"/>
          <div className="anim-line al1"/><div className="anim-line al2"/>
          <div className="anim-dot ad1"/><div className="anim-dot ad2"/><div className="anim-dot ad3"/><div className="anim-dot ad4"/>

          <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
            <div style={{fontSize:12,fontWeight:700,color:'rgba(56,189,248,0.5)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:8}}>Campaign Tier</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:900,color:'#fff',marginBottom:4}}>{t.name}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:48,fontWeight:900,color:'#4ade80',lineHeight:1,marginBottom:8}}>${t.price.toLocaleString()}</div>
            <div style={{fontSize:13,color:'rgba(200,220,255,0.4)'}}>One-time activation · Up to {t.views} views</div>
          </div>
        </div>

        {/* PAY BUTTON — right after the hero */}
        {error && (
          <div style={{padding:'12px 16px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,marginBottom:12,fontSize:13,fontWeight:600,color:'#dc2626'}}>{error}</div>
        )}

        <button onClick={handlePayment} disabled={paying} style={{
          display:'flex',alignItems:'center',justifyContent:'center',gap:10,
          width:'100%', padding:16, borderRadius:12,
          fontSize:16, fontWeight:800, border:'none', cursor:paying?'wait':'pointer',
          fontFamily:'inherit', marginBottom:10,
          background:paying?'#94a3b8':'linear-gradient(135deg, #0ea5e9, #38bdf8)',
          color:'#fff',
          boxShadow:paying?'none':'0 4px 16px rgba(14,165,233,0.3)',
          transition:'all 0.2s',
        }}>
          <CreditCard size={18} />
          {paying ? 'Creating payment...' : `Pay with Card — $${t.price.toLocaleString()}`}
        </button>

        <button onClick={function(){ setCryptoCheckout(true); }} style={{
          display:'flex',alignItems:'center',justifyContent:'center',gap:10,
          width:'100%', padding:16, borderRadius:12,
          fontSize:16, fontWeight:800, cursor:'pointer',
          fontFamily:'inherit', marginBottom:24,
          background:'#fff', color:'#1e293b',
          border:'2px solid #e2e8f0',
          transition:'all 0.2s',
        }}
          onMouseOver={function(e){ e.currentTarget.style.borderColor='#8b5cf6'; e.currentTarget.style.color='#7c3aed'; }}
          onMouseOut={function(e){ e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.color='#1e293b'; }}
        >
          <Coins size={18} />
          Pay with Crypto (USDT)
        </button>

        {cryptoCheckout && (
          <CryptoCheckout
            productKey={'grid_' + n}
            productLabel={t.name + ' Campaign — $' + t.price.toLocaleString()}
            onSuccess={function(){ setCryptoCheckout(false); window.location.href='/app/campaign-tiers'; }}
            onCancel={function(){ setCryptoCheckout(false); }}
          />
        )}

        {/* What you get */}
        <div style={{
          background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,
          boxShadow:'0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
          overflow:'hidden', marginBottom:20,
        }}>
          <div style={{background:'#1c223d',padding:'16px 24px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>What You Get</div>
          </div>
          <div style={{padding:'20px 24px'}}>
            {[
              { icon:'👁️', title:`Up to ${t.views} engaged video views`, desc:'Real people watching your video ads. Views are counted when a member watches for a minimum of 30 seconds.' },
              { icon:'⚡', title:'8×8 Income Grid position activated', desc:'Your grid has 64 positions. As your network grows and fills positions, you earn commissions on every level.' },
              { icon:'💰', title:'40% direct sponsor commission', desc:'When someone you personally refer activates this same tier, you earn 40% of the tier price instantly.' },
              { icon:'🌐', title:'50% uni-level commissions across 8 levels', desc:'Earn on your entire network — not just direct referrals. 8 levels deep, compounding as your team grows.' },
              { icon:'🏆', title:`$${t.bonus.toLocaleString()} grid completion bonus`, desc:`5% of every activation at this tier funds the bonus pool. Complete all 64 positions in your 8×8 grid to claim a $${t.bonus.toLocaleString()} bonus payout.` },
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
          background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,
          boxShadow:'0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
          overflow:'hidden', marginBottom:20,
        }}>
          <div style={{background:'#1c223d',padding:'16px 24px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>How Your Campaign Works</div>
          </div>
          <div style={{padding:'20px 24px'}}>
            {[
              { n:'1', bg:'rgba(14,165,233,0.1)', border:'rgba(14,165,233,0.2)', color:'#0ea5e9', title:'Your campaign goes live immediately', desc:`Members across the network start watching your video. Every qualified view is counted towards your ${t.views} target.` },
              { n:'2', bg:'rgba(16,185,129,0.1)', border:'rgba(16,185,129,0.2)', color:'#059669', title:'Campaign completes when views are reached', desc:`Once your campaign hits ${t.views} verified views, it's complete. Your grid position remains active and continues earning commissions.` },
              { n:'3', bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.2)', color:'#d97706', title:'Activate again to keep the momentum', desc:'When your campaign finishes, activate the same or a higher tier to launch a new campaign. Your network and commissions keep growing — the more you activate, the more you earn.' },
            ].map((s, i) => (
              <div key={i} style={{display:'flex',gap:16,marginBottom:i<2?16:0}}>
                <div style={{width:32,height:32,borderRadius:10,background:s.bg,border:`1px solid ${s.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:800,color:s.color,flexShrink:0}}>{s.n}</div>
                <div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{s.title}</div><div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>{s.desc}</div></div>
              </div>
            ))}
          </div>
        </div>

        {/* Commission breakdown */}
        <div style={{
          background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,
          boxShadow:'0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
          overflow:'hidden', marginBottom:24,
        }}>
          <div style={{background:'#1c223d',padding:'16px 24px'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Commission Breakdown</div>
          </div>
          <div style={{padding:'16px 24px'}}>
            {[
              { label:'Direct Sponsor', pct:'40%', amount:`$${(t.price * 0.4).toFixed(0)}`, desc:'Per referral who activates this tier' },
              { label:'Uni-Level (×8 levels)', pct:'50%', amount:`$${(t.price * 0.0625).toFixed(2)} each`, desc:'6.25% per level across 8 levels' },
              { label:'Bonus Pool', pct:'5%', amount:`$${t.bonus.toLocaleString()} payout`, desc:'Complete your 8×8 grid to claim' },
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

        <div style={{textAlign:'center'}}>
          <Link to="/campaign-tiers" style={{fontSize:13,color:'#94a3b8',textDecoration:'none'}}>← Back to Campaign Tiers</Link>
        </div>
      </div>

      <style>{`
        .anim-orb{position:absolute;border-radius:50%;pointer-events:none;z-index:0}
        .ao1{width:200px;height:200px;top:-50px;right:15%;background:radial-gradient(circle,rgba(14,165,233,.3),transparent 70%);animation:aoPulse 4s ease-in-out infinite}
        .ao2{width:140px;height:140px;bottom:-30px;right:35%;background:radial-gradient(circle,rgba(99,102,241,.25),transparent 70%);animation:aoPulse 5s ease-in-out 1s infinite}
        .ao3{width:120px;height:120px;top:10px;right:5%;background:radial-gradient(circle,rgba(16,185,129,.2),transparent 70%);animation:aoPulse 6s ease-in-out 2s infinite}
        .anim-line{position:absolute;height:1.5px;background:linear-gradient(90deg,transparent,rgba(14,165,233,.3),transparent);pointer-events:none;z-index:0}
        .al1{width:60%;top:25%;left:30%;animation:aoSlide 8s linear infinite}
        .al2{width:40%;top:65%;left:40%;animation:aoSlide 10s linear 2s infinite}
        .anim-dot{position:absolute;width:5px;height:5px;border-radius:50%;pointer-events:none;z-index:0}
        .ad1{background:rgba(14,165,233,.65);top:20%;right:20%;animation:aoDrift 5s ease-in-out infinite}
        .ad2{background:rgba(16,185,129,.55);top:60%;right:30%;animation:aoDrift 6s ease-in-out 1s infinite}
        .ad3{background:rgba(139,92,246,.55);top:40%;right:10%;animation:aoDrift 7s ease-in-out 2s infinite}
        .ad4{background:rgba(245,158,11,.5);top:70%;right:15%;animation:aoDrift 5.5s ease-in-out .5s infinite}
        @keyframes aoPulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.2);opacity:1}}
        @keyframes aoSlide{0%{transform:translateX(-100%);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateX(100%);opacity:0}}
        @keyframes aoDrift{0%,100%{transform:translate(0,0);opacity:.5}25%{transform:translate(-10px,6px);opacity:1}50%{transform:translate(5px,-7px);opacity:.7}75%{transform:translate(-4px,-4px);opacity:1}}
      `}</style>
    </AppLayout>
  );
}
