import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';

const TIERS = [
  { n:1, name:'Campaign 1', price:20, color:'#16a34a' },
  { n:2, name:'Campaign 2', price:50, color:'#0ea5e9' },
  { n:3, name:'Campaign 3', price:100, color:'#0284c7' },
  { n:4, name:'Campaign 4', price:200, color:'#d97706' },
  { n:5, name:'Campaign 5', price:300, color:'#dc2626' },
  { n:6, name:'Campaign 6', price:500, color:'#0ea5e9' },
  { n:7, name:'Campaign 7', price:750, color:'#7c3aed' },
  { n:8, name:'Campaign 8', price:1000, color:'#059669' },
];

export default function CampaignTiers() {
  const [activeTiers, setActiveTiers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/campaign-tiers').then(d => { setActiveTiers(d.active_tiers || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Campaign Tiers"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;

  return (
    <AppLayout title="Campaign Tiers" subtitle="Activate tiers to unlock advertising & earn commissions">
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:14}}>
        {TIERS.slice(0,4).map(t => <TierCard key={t.n} tier={t} active={activeTiers.includes(t.n)} />)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {TIERS.slice(4).map(t => <TierCard key={t.n} tier={t} active={activeTiers.includes(t.n)} />)}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { left: -60%; }
          100% { left: 100%; }
        }
        .tier-card-clean { position: relative; overflow: hidden; }
        .tier-card-clean::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            var(--shimmer-color, rgba(14,165,233,0.08)),
            transparent
          );
          animation: shimmer 3s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
        }
        .tier-card-clean:hover::before {
          background: linear-gradient(
            90deg,
            transparent,
            var(--shimmer-color-strong, rgba(14,165,233,0.15)),
            transparent
          );
        }
        .tier-card-clean:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06) !important;
        }
      `}</style>
    </AppLayout>
  );
}

function TierCard({ tier, active }) {
  const t = tier;
  const iconBg = `${t.color}12`;
  const iconBorder = `${t.color}25`;

  return (
    <div className="tier-card-clean" style={{
      background: '#fff',
      border: '1px solid #e8ecf2',
      borderRadius: 18,
      padding: '20px 22px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
      transition: 'all 0.3s ease',
      cursor: 'default',
      '--shimmer-color': `${t.color}15`,
      '--shimmer-color-strong': `${t.color}25`,
    }}>
      {/* Lock icon */}
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: iconBg,
        border: `1px solid ${iconBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12, position: 'relative', zIndex: 1,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      {/* Campaign name */}
      <div style={{
        fontSize: 16, fontWeight: 800, color: '#1a1a2e',
        marginBottom: 4, position: 'relative', zIndex: 1,
      }}>{t.name}</div>

      {/* Price */}
      <div style={{
        fontFamily: 'Sora, sans-serif',
        fontSize: 38, fontWeight: 900, color: t.color,
        lineHeight: 1, marginBottom: 16,
        position: 'relative', zIndex: 1,
      }}>${t.price.toLocaleString()}</div>

      {/* Specs */}
      <div style={{ width: '100%', marginBottom: 16, position: 'relative', zIndex: 1 }}>
        {[
          { label: 'Direct', value: '40%' },
          { label: 'Uni-level', value: '50%' },
          { label: 'Bonus Pool', value: '5%' },
          { label: 'Grid Size', value: '8×8 (64)' },
        ].map((s, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '5px 0',
            borderBottom: i < 3 ? '1px solid #f1f3f7' : 'none',
          }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Button */}
      {active ? (
        <div style={{
          width: '100%', padding: 12, borderRadius: 10,
          fontSize: 14, fontWeight: 700, textAlign: 'center',
          background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
          color: '#059669', position: 'relative', zIndex: 1,
        }}>✓ Active</div>
      ) : (
        <a href={`/activate-grid?tier=${t.n}`} style={{
          display: 'block', width: '100%', padding: 12, borderRadius: 10,
          fontSize: 14, fontWeight: 700, textAlign: 'center', textDecoration: 'none',
          background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
          color: '#fff', position: 'relative', zIndex: 1,
          boxShadow: '0 4px 14px rgba(14,165,233,0.25)',
          transition: 'all 0.2s',
          boxSizing: 'border-box',
        }}>Activate</a>
      )}
    </div>
  );
}
