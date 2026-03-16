import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';

const TIERS = [
  { n:1, name:'Starter',     price:20,   color:'#4ade80' },
  { n:2, name:'Builder',     price:50,   color:'#4ade80' },
  { n:3, name:'Accelerator', price:100,  color:'#4ade80' },
  { n:4, name:'Advanced',    price:200,  color:'#4ade80' },
  { n:5, name:'Elite',       price:300,  color:'#4ade80' },
  { n:6, name:'Premium',     price:500,  color:'#4ade80' },
  { n:7, name:'Executive',   price:750,  color:'#4ade80' },
  { n:8, name:'Ultimate',    price:1000, color:'#4ade80' },
];

export default function CampaignTiers() {
  var { t } = useTranslation();
  const [activeTiers, setActiveTiers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/campaign-tiers').then(d => { setActiveTiers(d.active_tiers || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title={t("nav.campaignTiers")}><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;

  return (
    <AppLayout title={t("nav.campaignTiers")} subtitle="Activate tiers to unlock advertising & earn commissions">
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:14}}>
        {TIERS.slice(0,4).map((t,i) => <TierCard key={t.n} tier={t} active={activeTiers.includes(t.n)} delay={i * 0.5} />)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {TIERS.slice(4).map((t,i) => <TierCard key={t.n} tier={t} active={activeTiers.includes(t.n)} delay={(i + 4) * 0.5} />)}
      </div>

      <style>{`
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.25); opacity: 1; }
        }
        @keyframes orbDrift {
          0%, 100% { transform: translate(0, 0); opacity: 0.4; }
          25% { transform: translate(-6px, 4px); opacity: 0.8; }
          50% { transform: translate(4px, -5px); opacity: 0.6; }
          75% { transform: translate(-3px, -3px); opacity: 0.9; }
        }
        @keyframes lineSlide {
          0% { transform: translateX(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        .dark-tier:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 16px 40px rgba(0,0,0,0.35), 0 0 20px rgba(14,165,233,0.15) !important;
        }
      `}</style>
    </AppLayout>
  );
}

function TierCard({ tier, active, delay }) {
  const t = tier;

  return (
    <div className="dark-tier" style={{
      background: 'linear-gradient(135deg, #0b1729 0%, #132240 50%, #0e1c30 100%)',
      borderRadius: 8,
      padding: '22px 20px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease',
      cursor: 'default',
    }}>
      {/* Animated orbs */}
      <div style={{
        position:'absolute', width:100, height:100, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(14,165,233,0.25), transparent 70%)',
        top:-20, right:-10, pointerEvents:'none',
        animation: `orbPulse ${3 + (delay * 0.3)}s ease-in-out ${delay}s infinite`,
      }}/>
      <div style={{
        position:'absolute', width:70, height:70, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)',
        bottom:-15, left:-10, pointerEvents:'none',
        animation: `orbPulse ${4 + (delay * 0.2)}s ease-in-out ${delay + 1}s infinite`,
      }}/>
      <div style={{
        position:'absolute', width:50, height:50, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)',
        top:'40%', right:'20%', pointerEvents:'none',
        animation: `orbDrift ${5 + (delay * 0.2)}s ease-in-out ${delay + 0.5}s infinite`,
      }}/>

      {/* Light streak */}
      <div style={{
        position:'absolute', height:1, width:'50%',
        background:'linear-gradient(90deg, transparent, rgba(14,165,233,0.3), transparent)',
        top:'30%', left:0, pointerEvents:'none',
        animation: `lineSlide ${7 + delay}s linear ${delay}s infinite`,
      }}/>

      {/* Floating dots */}
      <div style={{
        position:'absolute', width:4, height:4, borderRadius:'50%',
        background:'rgba(14,165,233,0.6)', top:'20%', right:'25%', pointerEvents:'none',
        animation: `orbDrift ${4}s ease-in-out ${delay}s infinite`,
      }}/>
      <div style={{
        position:'absolute', width:3, height:3, borderRadius:'50%',
        background:'rgba(16,185,129,0.5)', bottom:'30%', left:'20%', pointerEvents:'none',
        animation: `orbDrift ${5}s ease-in-out ${delay + 1.5}s infinite`,
      }}/>

      {/* Lock icon */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(14,165,233,0.12)',
        border: '1px solid rgba(14,165,233,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10, position: 'relative', zIndex: 1,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(56,189,248,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      {/* Name */}
      <div style={{
        fontSize: 15, fontWeight: 800, color: '#fff',
        marginBottom: 4, position: 'relative', zIndex: 1,
        letterSpacing: 0.3,
      }}>{t.name}</div>

      {/* Price */}
      <div style={{
        fontFamily: 'Sora, sans-serif',
        fontSize: 36, fontWeight: 900, color: t.color,
        lineHeight: 1, marginBottom: 14,
        position: 'relative', zIndex: 1,
      }}>${t.price.toLocaleString()}</div>

      {/* Specs */}
      <div style={{ width: '100%', marginBottom: 14, position: 'relative', zIndex: 1 }}>
        {[
          { label: 'Direct', value: '40%' },
          { label: 'Uni-level', value: '50%' },
          { label: 'Bonus Pool', value: '5%' },
          { label: 'Grid Size', value: '8×8 (64)' },
        ].map((s, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 0',
            borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <span style={{ fontSize: 13, color: 'rgba(200,220,255,0.45)', fontWeight: 500 }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Button */}
      {active ? (
        <div style={{
          width: '100%', padding: 11, borderRadius: 10,
          fontSize: 14, fontWeight: 700, textAlign: 'center',
          background: 'rgba(74,222,128,0.15)',
          border: '1px solid rgba(74,222,128,0.25)',
          color: '#4ade80', position: 'relative', zIndex: 1,
        }}>✓ Active</div>
      ) : (
        <Link to={`/activate/${t.n}`} style={{
          display: 'block', width: '100%', padding: 11, borderRadius: 10,
          fontSize: 14, fontWeight: 700, textAlign: 'center', textDecoration: 'none',
          background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
          color: '#fff', position: 'relative', zIndex: 1,
          boxShadow: '0 4px 14px rgba(14,165,233,0.3)',
          boxSizing: 'border-box',
        }}>Activate</Link>
      )}
    </div>
  );
}
