import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';

var TIERS = [
  {t:1, name:'Starter', price:20, grad:'linear-gradient(135deg,#064e3b,#047857,#10b981)', color:'#10b981', dark:'#059669'},
  {t:2, name:'Builder', price:50, grad:'linear-gradient(135deg,#1e3a5f,#2563eb,#3b82f6)', color:'#3b82f6', dark:'#2563eb'},
  {t:3, name:'Pro', price:100, grad:'linear-gradient(135deg,#172554,#4c1d95,#8b5cf6)', color:'#8b5cf6', dark:'#7c3aed'},
  {t:4, name:'Advanced', price:200, grad:'linear-gradient(135deg,#831843,#be185d,#ec4899)', color:'#ec4899', dark:'#db2777'},
  {t:5, name:'Elite', price:400, grad:'linear-gradient(135deg,#134e4a,#0d9488,#2dd4bf)', color:'#14b8a6', dark:'#0d9488'},
  {t:6, name:'Premium', price:600, grad:'linear-gradient(135deg,#6b7280,#9ca3af,#d1d5db)', color:'#9ca3af', dark:'#6b7280'},
  {t:7, name:'Executive', price:800, grad:'linear-gradient(135deg,#78350f,#b45309,#fbbf24)', color:'#f59e0b', dark:'#b45309'},
  {t:8, name:'Ultimate', price:1000, grad:'linear-gradient(135deg,#450a0a,#991b1b,#ef4444)', color:'#ef4444', dark:'#dc2626'},
];

var BONUSES = [64,160,320,640,1280,1920,2560,3200];

var GOLD_GRAD = 'linear-gradient(135deg,#78350f,#b45309,#fbbf24)';
var GREEN_GRAD = 'linear-gradient(135deg,#064e3b,#047857,#10b981)';

var css = `
  .gv-tier-tab{padding:10px 18px;border-radius:10px;border:1px solid #e2e8f0;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .2s;color:#64748b;background:#fff}
  .gv-tier-tab:hover:not(.active){background:#f8fafc}
  .gv-tier-tab.active{color:#fff;border-color:transparent}
  .gv-seat{border-radius:10px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;transition:all .2s;position:relative;overflow:hidden}
  .gv-seat.empty{background:#f8fafc;border:2px dashed #e2e8f0}
  .gv-seat.filled{border:2px solid;color:#fff}
  .gv-seat .badge{position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;border:1.5px solid #fff;z-index:2}
  .gv-seat .badge.direct{background:#fbbf24;color:#78350f}
  .gv-seat .badge.spill{background:#10b981;color:#fff}
`;

export default function GridVisualiser() {
  var { user } = useAuth();
  var [activeTier, setActiveTier] = useState(1);
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    setLoading(true);
    apiGet('/api/grid-visualiser?tier=' + activeTier)
      .then(function(d) { setData(d); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, [activeTier]);

  var t = TIERS[activeTier - 1];
  var filled = data ? data.filled : 0;
  var total = 64;
  var pct = Math.round(filled / total * 100);
  var seats = data ? data.seats : [];
  var bonusMax = BONUSES[activeTier - 1];
  var bonusAccrued = data ? data.bonus_accrued : 0;
  var bonusPct = Math.round(bonusAccrued / bonusMax * 100);
  var isComplete = filled >= 64;

  return (
    <AppLayout title="Income Grid" subtitle="Watch your grid fill as your team grows">
      <style>{css}</style>
      <div style={{ maxWidth:1000, margin:'0 auto' }}>

        {/* Hero */}
        <div style={{ background:'linear-gradient(135deg,#0c1222,#172554,#2d3561)', borderRadius:18, padding:'32px 36px', marginBottom:24, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-50, right:-50, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:26, fontWeight:900, color:'#fff', marginBottom:6 }}>Income Grid</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.65)' }}>Your 8×8 grid fills as your team grows. Earn commissions on every position.</div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:16, marginBottom:24 }}>
          <div style={{ flex:1, background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#2563eb' }}>{filled}/{total}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Positions Filled</div>
          </div>
          <div style={{ flex:1, background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#16a34a' }}>${data ? data.bonus_accrued?.toFixed(2) : '0.00'}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Bonus Accrued</div>
          </div>
          <div style={{ flex:1, background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#f59e0b' }}>T{activeTier}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Current Tier</div>
          </div>
          <div style={{ flex:1, background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:900, color:'#8b5cf6' }}>{data ? data.completed_advances : 0}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Advances Complete</div>
          </div>
        </div>

        {/* Tier tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
          {TIERS.map(function(tier) {
            var isActive = activeTier === tier.t;
            return (
              <button key={tier.t} className={'gv-tier-tab' + (isActive ? ' active' : '')}
                style={isActive ? { background:tier.grad, color:'#fff', borderColor:'transparent' } : {}}
                onClick={function(){ setActiveTier(tier.t); }}>
                T{tier.t} {tier.name} — ${tier.price}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #e2e8f0', padding:28, marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#0f172a' }}>
              T{t.t} {t.name} — ${t.price}
            </div>
            <div style={{ fontSize:13, color:'#64748b', fontWeight:600 }}>
              {filled} of {total} filled ({pct}%)
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height:8, background:'#f1f5f9', borderRadius:4, marginBottom:16, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:4, width:pct+'%', background:'linear-gradient(90deg,'+t.dark+','+t.color+')', transition:'width .5s' }}/>
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:20, justifyContent:'center', marginBottom:16, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748b', fontWeight:600 }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:GOLD_GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'#78350f' }}>★</div> Direct Referral
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748b', fontWeight:600 }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:GREEN_GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'#fff' }}>↓</div> Spillover
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748b', fontWeight:600 }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:'#f1f5f9', border:'1px dashed #cbd5e1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#cbd5e1' }}>?</div> Empty
            </div>
          </div>

          {/* Seats grid */}
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading grid...</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:8 }}>
              {Array.from({length:64}, function(_,i) {
                var seat = seats.find(function(s){ return s.position === i+1; });
                if (seat) {
                  var isDirect = seat.is_direct;
                  var grad = isDirect ? GOLD_GRAD : GREEN_GRAD;
                  var border = isDirect ? '#f59e0b' : '#10b981';
                  return (
                    <div key={i} className="gv-seat filled" style={{ background:grad, borderColor:border }}>
                      <div className={'badge ' + (isDirect ? 'direct' : 'spill')}>{isDirect ? '★' : '↓'}</div>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,.2)', border:'2px solid rgba(255,255,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, marginBottom:3 }}>
                        {seat.username.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize:9, fontWeight:700, maxWidth:'90%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{seat.username}</div>
                      <div style={{ fontSize:8, opacity:.7 }}>{seat.member_id}</div>
                    </div>
                  );
                }
                return (
                  <div key={i} className="gv-seat empty">
                    <div style={{ color:'#cbd5e1', fontWeight:700, fontSize:14 }}>{i+1}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bonus Pool */}
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #e2e8f0', padding:'24px 28px', position:'relative', overflow:'hidden', marginBottom:24 }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background: isComplete ? 'linear-gradient(90deg,#16a34a,#4ade80,#86efac)' : 'linear-gradient(90deg,#f59e0b,#fbbf24,#fde68a)' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:24, justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:16, flex:1 }}>
              <div style={{ fontSize:40, flexShrink:0 }}>{isComplete ? '🎉' : '🏆'}</div>
              <div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:4 }}>Completion Bonus Pool</div>
                <div style={{ fontSize:13, color:'#64748b', lineHeight:1.5, maxWidth:320 }}>
                  {isComplete
                    ? 'Congratulations! Your grid is complete and the full bonus has been paid out.'
                    : '5% of every position accrues into your bonus pool. Complete all 64 positions to unlock $' + bonusMax.toFixed(2) + '!'}
                </div>
              </div>
            </div>
            <div style={{ textAlign:'right', minWidth:200 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5 }}>Accrued so far</div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:36, fontWeight:900, color: isComplete ? '#16a34a' : '#f59e0b', lineHeight:1.1, marginTop:2 }}>
                ${bonusAccrued.toFixed(2)}
              </div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:2, fontWeight:600 }}>of ${bonusMax.toFixed(2)} max</div>
              <div style={{ height:8, background:'#fef3c7', borderRadius:4, marginTop:10, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:4, width:bonusPct+'%', background:'linear-gradient(90deg,#f59e0b,#fbbf24)', transition:'width .5s' }}/>
              </div>
              <div style={{ fontSize:11, fontWeight:700, marginTop:6, color: isComplete ? '#16a34a' : '#92400e' }}>
                {isComplete ? '✅ UNLOCKED — paid to your wallet!' : '🔒 Unlocks at 64/64 (' + (64 - filled) + ' to go)'}
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
