import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Check } from 'lucide-react';
import { formatMoney } from '../utils/money';

var GRADIENTS = [
  { bg: 'linear-gradient(135deg,#064E3B,#059669)', shadow: '#032b20' },
  { bg: 'linear-gradient(135deg,#1E3A5F,#2563EB)', shadow: '#0f1d30' },
  { bg: 'linear-gradient(135deg,#134E4A,#0D9488)', shadow: '#0a2725' },
  { bg: 'linear-gradient(135deg,#78350F,#D97706)', shadow: '#3c1a08' },
  { bg: 'linear-gradient(135deg,#312E81,#7C3AED)', shadow: '#1a1841' },
  { bg: 'linear-gradient(135deg,#831843,#EC4899)', shadow: '#420c22' },
  { bg: 'linear-gradient(135deg,#7C2D12,#EA580C)', shadow: '#3e1609' },
  { bg: 'linear-gradient(135deg,#450A0A,#DC2626)', shadow: '#230505' },
];

var BONUSES = { 1:64, 2:160, 3:320, 4:640, 5:1280, 6:1920, 7:2560, 8:3200 };

export default function CampaignTiers() {
  var [tiers, setTiers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [calcTier, setCalcTier] = useState(3);

  useEffect(function() {
    apiGet('/api/campaign-tiers').then(function(d) {
      setTiers(d.tiers || []);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  if (loading) return (
    <AppLayout title="Campaign Tiers">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </AppLayout>
  );

  function calcEarnings(tierNum) {
    var t = tiers.find(function(x) { return x.tier === tierNum; });
    if (!t) return { total: 0, direct: 0, perMem: 0, bonus: 0 };
    var direct = t.price * 0.4;
    var perMem = t.price * 0.0625;
    var bonus = BONUSES[tierNum] || 0;
    var total = direct + (perMem * 64) + bonus;
    return { total: Math.round(total), direct: direct, perMem: perMem, bonus: bonus };
  }

  var calc = calcEarnings(calcTier);

  return (
    <AppLayout title="Campaign Tiers" subtitle="Activate tiers to advertise your videos and earn grid commissions">

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#0c4a6e,#0369a1,#0284c7)', borderRadius:18, padding:'28px 32px', marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:8 }}>Campaign Grid System</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#fff', marginBottom:8 }}>Activate Tiers. Earn Commissions. Grow Your Grid.</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.7, maxWidth:580, marginBottom:16 }}>
            Each tier delivers real video views through Watch & Earn. You earn commissions as your grid fills with members.
          </div>
          <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'#fff' }}><span style={{ width:8, height:8, borderRadius:'50%', background:'#38bdf8' }}/> 40% direct commission</span>
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'#fff' }}><span style={{ width:8, height:8, borderRadius:'50%', background:'#a78bfa' }}/> 6.25% per grid member</span>
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'#fff' }}><span style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80' }}/> Up to $3,200 completion bonus</span>
          </div>
        </div>
      </div>

      {/* Tier cards — 2x2 grids, 4 pages */}
      {[0, 2, 4, 6].map(function(start) {
        var pair = tiers.slice(start, start + 2);
        if (pair.length === 0) return null;
        return (
          <div key={start} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {pair.map(function(t) {
              var idx = t.tier - 1;
              var g = GRADIENTS[idx] || GRADIENTS[0];
              var active = t.is_active;
              var grid = t.grid;
              var isPopular = t.tier === 3;
              var isMax = t.tier === 8;

              return (
                <div key={t.tier} style={{ borderRadius:16, overflow:'hidden', color:'#fff', display:'flex', flexDirection:'column', position:'relative', background:g.bg }}>

                  {/* Popular / Max badge */}
                  {isPopular && <div style={{ textAlign:'center', fontSize:11, fontWeight:600, padding:'4px 0', background:'rgba(255,255,255,.2)', color:'#fff', letterSpacing:.5 }}>Most popular</div>}
                  {isMax && <div style={{ textAlign:'center', fontSize:11, fontWeight:600, padding:'4px 0', background:'rgba(255,255,255,.2)', color:'#fff', letterSpacing:.5 }}>Max earnings</div>}

                  {/* Active badge */}
                  {active && (
                    <div style={{ position:'absolute', top: isPopular || isMax ? 34 : 12, right:14, background:'rgba(255,255,255,.2)', fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:8, display:'flex', alignItems:'center', gap:4, color:'#fff', zIndex:2 }}>
                      <Check size={11}/> Active
                    </div>
                  )}

                  <div style={{ padding:'22px 24px', flex:1, display:'flex', flexDirection:'column', gap:12 }}>

                    {/* Row 1: Tier badge + Name + Price */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:10, fontWeight:600, letterSpacing:1, textTransform:'uppercase', padding:'3px 10px', borderRadius:16, background:'rgba(255,255,255,.18)', color:'rgba(255,255,255,.9)' }}>T{t.tier}</span>
                        <span style={{ fontSize:20, fontWeight:700, color:'#fff' }}>{t.name}</span>
                      </div>
                      <div style={{ fontSize:32, fontWeight:700, color:'#fff' }}>
                        ${t.price.toLocaleString()} <span style={{ fontSize:12, fontWeight:400, opacity:.55 }}>one-time</span>
                      </div>
                    </div>

                    {/* Grid progress (if active) */}
                    {active && grid && (
                      <div>
                        <div style={{ height:5, background:'rgba(255,255,255,.15)', borderRadius:3, marginBottom:4 }}>
                          <div style={{ height:'100%', width:grid.pct+'%', background:'rgba(255,255,255,.7)', borderRadius:3, transition:'width .5s' }}/>
                        </div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.55)' }}>{grid.filled}/64 members filled · Grid #{grid.advance}</div>
                      </div>
                    )}

                    {/* Feature tags */}
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:12, padding:'4px 12px', borderRadius:8, background:'rgba(255,255,255,.14)', color:'rgba(255,255,255,.9)' }}>{t.views_target.toLocaleString()} views</span>
                      <span style={{ fontSize:12, padding:'4px 12px', borderRadius:8, background:'rgba(255,255,255,.14)', color:'rgba(255,255,255,.9)' }}>{t.max_campaigns === 999 ? 'Unlimited' : t.max_campaigns} campaign{t.max_campaigns !== 1 ? 's' : ''}</span>
                      {t.tier >= 4 && <span style={{ fontSize:12, padding:'4px 12px', borderRadius:8, background:'rgba(255,255,255,.14)', color:'rgba(255,255,255,.9)' }}>Targeting</span>}
                      {t.tier >= 5 && <span style={{ fontSize:12, padding:'4px 12px', borderRadius:8, background:'rgba(255,255,255,.14)', color:'rgba(255,255,255,.9)' }}>Priority</span>}
                      {t.tier >= 6 && <span style={{ fontSize:12, padding:'4px 12px', borderRadius:8, background:'rgba(255,255,255,.14)', color:'rgba(255,255,255,.9)' }}>Featured</span>}
                      {t.tier >= 7 && <span style={{ fontSize:12, padding:'4px 12px', borderRadius:8, background:'rgba(255,255,255,.14)', color:'rgba(255,255,255,.9)' }}>Spotlight</span>}
                    </div>

                    {/* Earnings stats */}
                    <div style={{ display:'flex', gap:6 }}>
                      <div style={{ flex:1, textAlign:'center', padding:'10px 4px', borderRadius:10, background:'rgba(255,255,255,.12)' }}>
                        <div style={{ fontSize:18, fontWeight:600, color:'#fff' }}>${formatMoney(t.direct_commission)}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', marginTop:2 }}>Direct earn</div>
                      </div>
                      <div style={{ flex:1, textAlign:'center', padding:'10px 4px', borderRadius:10, background:'rgba(255,255,255,.12)' }}>
                        <div style={{ fontSize:18, fontWeight:600, color:'#fff' }}>${formatMoney(t.uni_level_per_member)}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', marginTop:2 }}>Per member</div>
                      </div>
                      <div style={{ flex:1, textAlign:'center', padding:'10px 4px', borderRadius:10, background:'rgba(255,255,255,.12)' }}>
                        <div style={{ fontSize:18, fontWeight:600, color:'#fff' }}>${t.completion_bonus.toLocaleString()}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', marginTop:2 }}>Grid bonus</div>
                      </div>
                    </div>

                    {/* Activate button */}
                    {!active ? (
                      <Link to={'/activate/' + t.tier} style={{
                        display:'block', textAlign:'center', padding:'13px', borderRadius:12, textDecoration:'none',
                        background:g.bg, boxShadow:'0 5px 0 ' + g.shadow + ', 0 6px 8px rgba(0,0,0,.2)',
                        marginTop:'auto', transition:'transform .1s',
                      }}>
                        <span style={{ color:'#ffffff', fontWeight:700, fontSize:15 }}>Activate {t.name}</span>
                      </Link>
                    ) : (
                      <div style={{
                        textAlign:'center', padding:'13px', borderRadius:12,
                        background:'rgba(255,255,255,.12)', marginTop:'auto',
                      }}>
                        <span style={{ color:'rgba(255,255,255,.6)', fontWeight:600, fontSize:14 }}>Active</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Earnings Calculator */}
      <div style={{ background:'#fff', border:'1px solid #e8ecf2', borderRadius:16, padding:'24px 28px', marginBottom:16, boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:800, color:'#0f172a', textAlign:'center', marginBottom:4 }}>Earnings calculator</div>
        <div style={{ fontSize:13, color:'#64748b', textAlign:'center', marginBottom:16 }}>How much could you earn when your grid fills with 64 members?</div>
        <div style={{ display:'flex', alignItems:'center', gap:12, maxWidth:440, margin:'0 auto' }}>
          <label style={{ fontSize:13, color:'#64748b', whiteSpace:'nowrap' }}>Select tier</label>
          <select value={calcTier} onChange={function(e) { setCalcTier(Number(e.target.value)); }}
            style={{ flex:1, padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', fontSize:14, fontFamily:'inherit', background:'#f8fafc', cursor:'pointer' }}>
            {tiers.map(function(t) {
              return <option key={t.tier} value={t.tier}>T{t.tier} {t.name} (${t.price.toLocaleString()})</option>;
            })}
          </select>
        </div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:36, fontWeight:800, color:'#0ea5e9', textAlign:'center', marginTop:16 }}>${calc.total.toLocaleString()}</div>
        <div style={{ fontSize:13, color:'#94a3b8', textAlign:'center', marginTop:4 }}>
          ${calc.direct} direct + ${calc.perMem.toFixed(2)} x 64 members + ${calc.bonus.toLocaleString()} bonus
        </div>
      </div>

      {/* Footer note */}
      <div style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginBottom:8 }}>
        All one-time USDT payments. 64 members per grid. 40% direct + 6.25% per member + completion bonus.
      </div>

    </AppLayout>
  );
}
