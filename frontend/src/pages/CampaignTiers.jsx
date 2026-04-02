import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Check } from 'lucide-react';
import { formatMoney } from '../utils/money';

/* ─────────────────────────────────────────────
   Campaign Tiers — Light theme, clean layout
   Calculator top → 4-col tier cards → earnings table
   ───────────────────────────────────────────── */

var TIER_ACCENTS = {
  1: { color:'#10b981', colorDark:'#059669', bg:'#f0fdf4', border:'#bbf7d0', grad:'linear-gradient(135deg,#059669,#10b981)' },
  2: { color:'#3b82f6', colorDark:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', grad:'linear-gradient(135deg,#2563eb,#3b82f6)' },
  3: { color:'#8b5cf6', colorDark:'#7c3aed', bg:'#ede9fe', border:'#c4b5fd', grad:'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
  4: { color:'#f59e0b', colorDark:'#d97706', bg:'#fef3c7', border:'#fde68a', grad:'linear-gradient(135deg,#d97706,#f59e0b)' },
  5: { color:'#ec4899', colorDark:'#db2777', bg:'#fce7f3', border:'#f9a8d4', grad:'linear-gradient(135deg,#db2777,#ec4899)' },
  6: { color:'#06b6d4', colorDark:'#0891b2', bg:'#ecfeff', border:'#a5f3fc', grad:'linear-gradient(135deg,#0891b2,#06b6d4)' },
  7: { color:'#f97316', colorDark:'#ea580c', bg:'#fff7ed', border:'#fed7aa', grad:'linear-gradient(135deg,#ea580c,#f97316)' },
  8: { color:'#ef4444', colorDark:'#dc2626', bg:'#fef2f2', border:'#fecaca', grad:'linear-gradient(135deg,#dc2626,#ef4444)' },
};

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
      <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
        <div style={{ width:40, height:40, border:'3px solid #e5e7eb', borderTopColor:'#0ea5e9', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </AppLayout>
  );

  function calcEarnings(tierNum) {
    var t = tiers.find(function(x) { return x.tier === tierNum; });
    if (!t) return { total:0, direct:0, perMem:0, bonus:0 };
    var direct = t.price * 0.4;
    var perMem = t.price * 0.0625;
    var bonus = BONUSES[tierNum] || 0;
    return { total:Math.round(direct + (perMem * 64) + bonus), direct:direct, perMem:perMem, bonus:bonus };
  }

  var calc = calcEarnings(calcTier);

  return (
    <AppLayout title="Campaign Tiers" subtitle="Activate tiers to advertise your videos and earn grid commissions">

      <style>{[
        '@keyframes spin{to{transform:rotate(360deg)}}',
        '.ct-card{transition:transform .15s,box-shadow .15s}',
        '.ct-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)!important}',
        '.ct-btn{transition:transform .1s!important}',
        '.ct-btn:hover{transform:translateY(-1px)!important}',
        '.ct-btn:active{transform:translateY(1px)!important}',
        '.ct-pill{transition:background .1s,border-color .1s}',
        '.ct-pill:hover{background:#f1f5f9!important}',
        '.ct-trow{transition:background .1s}',
        '.ct-trow:hover{background:#f8fafc!important}',
        '@media(max-width:767px){',
        '  .ct-grid{grid-template-columns:1fr 1fr!important}',
        '  .ct-calc-inner{flex-direction:column!important}',
        '  .ct-calc-result{border-left:none!important;border-top:1px solid #e2e8f0!important;padding-left:0!important;padding-top:16px!important}',
        '}',
        '@media(max-width:480px){',
        '  .ct-grid{grid-template-columns:1fr!important}',
        '}',
      ].join('\n')}</style>

      {/* ── Header ── */}
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#94a3b8', marginBottom:6 }}>Campaign Grid System</div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:6 }}>Activate Tiers. Earn Commissions.</div>
        <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>40% direct commission + 6.25% per grid member + completion bonus on every tier.</div>
      </div>

      {/* ── Calculator ── */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:24, marginBottom:24 }}>
        <div className="ct-calc-inner" style={{ display:'flex', alignItems:'center', gap:24 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#64748b', marginBottom:12 }}>Earnings calculator — select a tier</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {tiers.map(function(t) {
                var a = TIER_ACCENTS[t.tier] || TIER_ACCENTS[1];
                var selected = t.tier === calcTier;
                return (
                  <div key={t.tier} className={selected ? '' : 'ct-pill'}
                    onClick={function() { setCalcTier(t.tier); }}
                    style={{
                      padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight: selected ? 700 : 400,
                      background: selected ? a.bg : '#f8fafc',
                      border: '1px solid ' + (selected ? a.border : '#e2e8f0'),
                      color: selected ? a.colorDark : '#94a3b8',
                    }}>
                    T{t.tier} ${t.price >= 1000 ? (t.price/1000) + 'k' : t.price}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="ct-calc-result" style={{ textAlign:'center', paddingLeft:24, borderLeft:'1px solid #e2e8f0', minWidth:140 }}>
            <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>Potential earnings</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:36, fontWeight:800, color:'#0ea5e9' }}>
              ${calc.total.toLocaleString()}
            </div>
            <div style={{ fontSize:11, color:'#b0b8c4', marginTop:4 }}>with 64 grid members</div>
          </div>
        </div>
      </div>

      {/* ── Tier Cards — 4-column grid ── */}
      {[0, 4].map(function(start) {
        var row = tiers.slice(start, start + 4);
        if (row.length === 0) return null;
        return (
          <div key={start} className="ct-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
            {row.map(function(t) {
              var a = TIER_ACCENTS[t.tier] || TIER_ACCENTS[1];
              var active = t.is_active;
              var isPopular = t.tier === 3;
              var isMax = t.tier === 8;

              return (
                <div key={t.tier} className="ct-card" style={{
                  background:'#fff', border:'1px solid #e2e8f0', borderRadius:12,
                  padding:18, display:'flex', flexDirection:'column', gap:12,
                  borderTop:'3px solid ' + a.color, position:'relative',
                  boxShadow:'0 1px 3px rgba(0,0,0,.04)',
                }}>
                  {isPopular && <span style={{ position:'absolute', top:10, right:10, fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:4, background:a.bg, color:a.colorDark }}>Popular</span>}
                  {isMax && <span style={{ position:'absolute', top:10, right:10, fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:4, background:a.bg, color:a.colorDark }}>Max</span>}

                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{t.views_target.toLocaleString()} views</div>
                  </div>

                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:26, fontWeight:800, color:'#0f172a' }}>
                    ${t.price.toLocaleString()}
                  </div>

                  {active && t.grid && (
                    <div>
                      <div style={{ height:4, background:'#f1f5f9', borderRadius:3, marginBottom:4 }}>
                        <div style={{ height:'100%', width:t.grid.pct+'%', background:a.color, borderRadius:3, transition:'width .5s' }}/>
                      </div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{t.grid.filled}/64 members</div>
                    </div>
                  )}

                  {active ? (
                    <div style={{
                      textAlign:'center', padding:11, borderRadius:8,
                      background:a.bg, border:'1px solid ' + a.border,
                      marginTop:'auto',
                    }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, color:a.colorDark, fontSize:13, fontWeight:700 }}>
                        <Check size={13}/> Active
                      </span>
                    </div>
                  ) : (
                    <Link to={'/activate/' + t.tier} className="ct-btn" style={{
                      display:'block', textAlign:'center', padding:11, borderRadius:8,
                      background:a.grad, textDecoration:'none', marginTop:'auto',
                    }}>
                      <span style={{ color:'#fff', fontWeight:700, fontSize:13 }}>Activate</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── Earnings Breakdown Table ── */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', marginTop:12, marginBottom:16 }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #e2e8f0' }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a' }}>Earnings Breakdown</div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>What you earn when your 8×8 grid fills with 64 members</div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:560 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Tier','Price','Direct (40%)','Per member','Grid bonus','Total potential'].map(function(h) {
                  return (
                    <th key={h} style={{
                      textAlign: h === 'Tier' ? 'left' : 'right',
                      padding:'12px 16px', fontWeight:700, color:'#64748b',
                      fontSize:11, textTransform:'uppercase', letterSpacing:0.5,
                    }}>{h}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {tiers.map(function(t) {
                var a = TIER_ACCENTS[t.tier] || TIER_ACCENTS[1];
                var e = calcEarnings(t.tier);
                var isSelected = t.tier === calcTier;
                return (
                  <tr key={t.tier} className="ct-trow"
                    onClick={function() { setCalcTier(t.tier); }}
                    style={{
                      borderTop:'1px solid #f1f5f9', cursor:'pointer',
                      background: isSelected ? a.bg : 'transparent',
                    }}>
                    <td style={{ padding:'11px 16px', fontWeight:700, color:'#0f172a' }}>
                      <span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:a.color, marginRight:8, verticalAlign:'middle' }}/>
                      {t.name}
                    </td>
                    <td style={{ textAlign:'right', padding:'11px 16px', color:'#0f172a' }}>${t.price.toLocaleString()}</td>
                    <td style={{ textAlign:'right', padding:'11px 16px', color:a.colorDark, fontWeight:600 }}>${formatMoney(t.direct_commission)}</td>
                    <td style={{ textAlign:'right', padding:'11px 16px', color:'#64748b' }}>${formatMoney(t.uni_level_per_member)}</td>
                    <td style={{ textAlign:'right', padding:'11px 16px', color:'#64748b' }}>${t.completion_bonus.toLocaleString()}</td>
                    <td style={{ textAlign:'right', padding:'11px 16px', color:'#0f172a', fontWeight:800 }}>${e.total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ textAlign:'center', fontSize:11, color:'#94a3b8', paddingBottom:8 }}>
        All one-time USDT payments. 64 members per grid. Per member amount paid on each of 64 positions filled.
      </div>

    </AppLayout>
  );
}
