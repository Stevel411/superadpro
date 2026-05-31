import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';

/*
 * Profit Grid Visualiser — 6×6 / 36-seat model (25 May 2026).
 *
 * Steve cut the grid from 8×8/64 to 6×6/36. Uni-level commission depth
 * stays at 8 (unchanged) — the grid is now a visualisation of a slice
 * of uni-level activity. Completion bonus pays at position 36 (10% of
 * 36 × tier_price). Same total $/year delivered in tighter cycles.
 *
 * Visual treatment:
 *   - Direct referrals  → gold gradient tiles
 *   - Spillover         → cyan gradient tiles
 *   - Completion seat   → royal purple, pulsing, position 36
 *   - Headers           → platform-canonical cobalt (#172554 → #1e3a8a)
 *
 * Spec: docs/commission-spec.md §2. Final mockup approved 25 May 2026.
 */

var TIERS = [
  { t:1, name:'Starter',   price:20,   bonus:72   },
  { t:2, name:'Builder',   price:50,   bonus:180  },
  { t:3, name:'Pro',       price:100,  bonus:360  },
  { t:4, name:'Advanced',  price:200,  bonus:720  },
  { t:5, name:'Premium',   price:400,  bonus:1440 },
  { t:6, name:'Elite',     price:600,  bonus:2160 },
  { t:7, name:'Master',    price:800,  bonus:2880 },
  { t:8, name:'Champion',  price:1000, bonus:3600 },
];

var TOTAL_SEATS = 36;

var DIRECT_GRAD = 'linear-gradient(135deg,#b45309 0%,#d97706 30%,#fbbf24 65%,#fde047 100%)';
var SPILLOVER_GRAD = 'linear-gradient(135deg,#0891b2 0%,#06b6d4 50%,#22d3ee 100%)';
var BONUS_GRAD = 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#c4b5fd 100%)';
var COBALT_HEADER = 'linear-gradient(135deg,#172554 0%,#1e3a8a 100%)';
var CYAN_PROGRESS = 'linear-gradient(90deg,#0891b2,#06b6d4,#22d3ee)';
var TIER_ACTIVE_GRAD = 'linear-gradient(135deg,#1e3a8a,#0891b2)';

var css = `
  @keyframes lgv-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
  @keyframes lgv-pulse {
    0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.5),0 4px 20px rgba(124,58,237,0.3)}
    50%{box-shadow:0 0 0 9px rgba(124,58,237,0),0 8px 30px rgba(124,58,237,0.45)}
  }
  .lgv-tier-tab{padding:9px 16px;border-radius:8px;border:1px solid #cbd5e1;font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .2s;color:#475569;background:#fff;letter-spacing:0.2px}
  .lgv-tier-tab:hover:not(.active){background:#f8fafc;border-color:#94a3b8}
  .lgv-tier-tab.active{color:#fff;border-color:transparent;box-shadow:0 4px 14px rgba(8,145,178,0.25)}
  .lgv-tile{aspect-ratio:1;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;padding:8px 6px;color:#fff;overflow:hidden;transition:transform .18s ease, box-shadow .18s ease;cursor:default}
  .lgv-tile::before{content:'';position:absolute;top:0;left:0;right:0;height:42%;background:linear-gradient(180deg,rgba(255,255,255,0.22),transparent);pointer-events:none}
  .lgv-tile:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 10px 24px rgba(10,20,56,0.16)}
  .lgv-tile.direct{box-shadow:0 4px 14px rgba(217,119,6,0.25)}
  .lgv-tile.direct .lgv-avatar{color:#7c2d12;text-shadow:none;background:rgba(255,255,255,0.32);border-color:rgba(255,255,255,0.55)}
  .lgv-tile.direct .lgv-uname{color:#7c2d12;text-shadow:0 1px 1px rgba(255,255,255,0.3)}
  .lgv-tile.direct .lgv-pos{color:rgba(124,45,18,0.55)}
  .lgv-tile.spillover{box-shadow:0 4px 14px rgba(8,145,178,0.22)}
  .lgv-tile.empty{background:#fafbff;border:2px dashed #cbd5e1;color:#94a3b8;box-shadow:inset 0 1px 3px rgba(10,20,56,0.03)}
  .lgv-tile.empty::before{display:none}
  .lgv-tile.empty:hover{border-color:#22d3ee;background:#f0fdff;transform:none;box-shadow:0 0 0 3px rgba(34,211,238,0.12)}
  .lgv-tile.completion-empty{border:3px dashed #ddd6fe;color:#f5f3ff;animation:lgv-pulse 2.5s ease-in-out infinite}
  .lgv-tile.completion-empty::before{display:none}
  .lgv-tile.completion-filled{box-shadow:0 6px 24px rgba(124,58,237,0.35)}
  .lgv-avatar{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.45);display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-weight:800;font-size:15px;color:#fff;margin-bottom:5px;text-shadow:0 1px 2px rgba(0,0,0,0.2);position:relative;z-index:1;flex-shrink:0}
  .lgv-uname{font-family:'DM Sans',sans-serif;font-size:10.5px;font-weight:700;line-height:1.1;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,0.25);position:relative;z-index:1;padding:0 3px}
  .lgv-money{font-family:'Sora',sans-serif;font-weight:700;font-size:11px;color:#4ade80;background:rgba(0,0,0,0.30);border-radius:6px;padding:1px 7px;margin-top:4px;position:relative;z-index:1;text-shadow:none;letter-spacing:0.2px}
  .lgv-tile.empty .lgv-money{background:transparent;color:#16a34a;font-weight:600;font-size:10px;padding:0;margin-top:3px;opacity:0.85}
  .lgv-pos{position:absolute;top:6px;left:8px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;color:rgba(255,255,255,0.55);z-index:1;letter-spacing:0.3px}
  .lgv-tile.empty .lgv-pos{color:#94a3b8;font-size:13px;position:static;font-weight:700}
  .lgv-direct-badge{position:absolute;top:6px;right:6px;width:18px;height:18px;border-radius:50%;background:#7c3aed;border:2px solid #fff;z-index:2;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#fff;box-shadow:0 2px 6px rgba(124,58,237,0.4)}
  .lgv-progress-fill{position:relative;overflow:hidden}
  .lgv-progress-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent);animation:lgv-shimmer 2.4s infinite}
`;

export default function GridVisualiser() {
  var [activeTier, setActiveTier] = useState(1);
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    setLoading(true);
    apiGet('/api/grid-visualiser?tier=' + activeTier)
      .then(function(d) { setData(d); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, [activeTier]);

  var tier = TIERS[activeTier - 1];
  var filled = data ? data.filled : 0;
  var pct = Math.round(filled / TOTAL_SEATS * 100);
  var seats = data ? data.seats : [];
  var bonusAccrued = data ? data.bonus_accrued : 0;
  var bonusMax = data ? data.bonus_max : tier.bonus;
  var bonusPct = Math.round(bonusAccrued / bonusMax * 100);
  var directEarned = data ? data.direct_earned : 0;
  var unilevelEarned = data ? data.unilevel_earned : 0;
  var totalEarned = data ? data.total_earned : 0;
  var directFills = data ? data.direct_fills : 0;
  var unilevelFills = data ? data.unilevel_fills : 0;
  var directPerFill = data ? data.direct_per_fill : tier.price * 0.40;
  var unilevelPerFill = data ? data.unilevel_per_fill : tier.price * 0.0625;
  var directCount = data ? data.direct_count : 0;
  var completedAdvances = data ? data.completed_advances : 0;
  var seatsToUnlock = Math.max(0, TOTAL_SEATS - filled);

  return (
    <AppLayout title="Profit Grid" subtitle="Your 6×6 spillover grid — bonus at seat 36">
      <style>{css}</style>
      <div style={{ maxWidth:1180, margin:'0 auto' }}>

        {/* Tier tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>
          {TIERS.map(function(t) {
            var isActive = activeTier === t.t;
            return (
              <button key={t.t} className={'lgv-tier-tab' + (isActive ? ' active' : '')}
                style={isActive ? { background:TIER_ACTIVE_GRAD } : {}}
                onClick={function(){ setActiveTier(t.t); }}>
                T{t.t} {t.name} — ${t.price}
              </button>
            );
          })}
        </div>

        {/* Main two-column layout — 3fr (grid) / 2fr (right column).
            align-items: stretch ensures the right column stretches to
            match the taller grid card. The 2×2 stat grid below uses
            flex:1 to absorb leftover vertical space. */}
        <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:16, alignItems:'stretch' }}>

          {/* Grid card */}
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', boxShadow:'0 4px 20px rgba(10,20,56,0.04)' }}>
            <div style={{ background:COBALT_HEADER, padding:'16px 22px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:700, color:'#fff', letterSpacing:'-0.3px', position:'relative', zIndex:1 }}>T{tier.t} {tier.name} — ${tier.price}</div>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.85)', fontWeight:600, fontFamily:'JetBrains Mono,monospace', position:'relative', zIndex:1 }}>{filled} of {TOTAL_SEATS} · {pct}%</div>
              <div style={{ position:'absolute', top:'-50%', right:'-10%', width:280, height:'200%', background:'radial-gradient(circle,rgba(56,189,248,0.15),transparent 65%)', pointerEvents:'none' }}/>
            </div>
            <div style={{ padding:'18px 22px' }}>
              {/* Progress row with countdown */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, fontSize:11.5 }}>
                <div style={{ color:'#64748b', fontWeight:600 }}>Progress to bonus</div>
                <div style={{ color:'#0891b2', fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{seatsToUnlock} seats to ♛</div>
              </div>
              <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden', marginBottom:18 }}>
                <div className="lgv-progress-fill" style={{ height:'100%', width:pct+'%', background:CYAN_PROGRESS, borderRadius:4, transition:'width .6s ease' }}/>
              </div>
              {/* Legend */}
              <div style={{ display:'flex', gap:18, justifyContent:'center', marginBottom:18, fontSize:11.5, color:'#64748b', fontWeight:600, flexWrap:'wrap' }}>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:14, height:14, borderRadius:4, background:DIRECT_GRAD }}/> Direct referral</span>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:14, height:14, borderRadius:4, background:SPILLOVER_GRAD }}/> Spillover</span>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:14, height:14, borderRadius:4, background:BONUS_GRAD }}/> Bonus seat</span>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:14, height:14, borderRadius:4, background:'#fafbff', border:'2px dashed #cbd5e1' }}/> Empty</span>
              </div>
              {/* 6×6 tile grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, opacity: loading ? 0.4 : 1, transition:'opacity .3s' }}>
                {Array.from({length:TOTAL_SEATS}, function(_,i) {
                  var pos = i + 1;
                  var seat = seats.find(function(s){ return s.position === pos; });
                  var isCompletionSeat = pos === TOTAL_SEATS;
                  if (seat) {
                    var isDirect = seat.is_direct;
                    var bg = isCompletionSeat ? BONUS_GRAD : (isDirect ? DIRECT_GRAD : SPILLOVER_GRAD);
                    var tileClass = 'lgv-tile ' + (isCompletionSeat ? 'completion-filled' : (isDirect ? 'direct' : 'spillover'));
                    var seatMoney = isCompletionSeat ? bonusMax : (isDirect ? directPerFill : unilevelPerFill);
                    return (
                      <div key={i} className={tileClass} style={{ background:bg }}
                           title={seat.username + ' · ' + (isDirect ? 'Direct' : 'Spillover') + ' · ' + seat.member_id + (isCompletionSeat ? ' · Completion seat' : '')}>
                        <div className="lgv-pos">{pos}</div>
                        {isDirect && !isCompletionSeat ? <div className="lgv-direct-badge">★</div> : null}
                        <div className="lgv-avatar">{seat.username.charAt(0).toUpperCase()}</div>
                        <div className="lgv-uname">{seat.username}</div>
                        <div className="lgv-money">+${seatMoney.toFixed(2)}</div>
                      </div>
                    );
                  }
                  if (isCompletionSeat) {
                    return (
                      <div key={i} className="lgv-tile completion-empty" style={{ background:BONUS_GRAD }}
                           title={'Position ' + TOTAL_SEATS + ' — fill this to unlock the completion bonus'}>
                        <div className="lgv-pos" style={{ color:'rgba(255,255,255,0.7)', fontWeight:800 }}>{pos}</div>
                        <div style={{ fontSize:30, lineHeight:1, color:'#fff', textShadow:'0 2px 6px rgba(76,29,149,0.4)', marginBottom:4 }}>♛</div>
                        <div style={{ fontFamily:'Sora,sans-serif', fontSize:9, fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', lineHeight:1.2, textShadow:'0 1px 2px rgba(76,29,149,0.3)' }}>Bonus<br/>seat</div>
                        <div className="lgv-money">+${bonusMax.toFixed(2)}</div>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="lgv-tile empty">
                      <div className="lgv-pos">{pos}</div>
                      <div className="lgv-money">+${unilevelPerFill.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column — commissions earned + bonus + 2×2 stats */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, height:'100%' }}>

            {/* Commissions earned card */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'11px 16px', background:COBALT_HEADER, fontFamily:'Sora,sans-serif', fontSize:12, fontWeight:700, color:'#fff', letterSpacing:'0.5px', textTransform:'uppercase', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:14, color:'#38bdf8' }}>◆</span>Commissions earned
              </div>
              <div style={{ padding:'14px 16px' }}>
                {/* Direct row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize:11.5, color:'#64748b', fontWeight:600 }}>Direct referrals</div>
                    <div style={{ color:'#94a3b8', fontSize:10, fontWeight:500, marginTop:2 }}>{directFills} × ${directPerFill.toFixed(2)} (40%)</div>
                  </div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, letterSpacing:'-0.3px', background:DIRECT_GRAD, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' }}>
                    ${directEarned.toFixed(2)}
                  </div>
                </div>
                {/* Uni-level row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize:11.5, color:'#64748b', fontWeight:600 }}>Uni-level fills</div>
                    <div style={{ color:'#94a3b8', fontSize:10, fontWeight:500, marginTop:2 }}>{unilevelFills} × ${unilevelPerFill.toFixed(2)} (6.25%)</div>
                  </div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0891b2', letterSpacing:'-0.3px' }}>
                    ${unilevelEarned.toFixed(2)}
                  </div>
                </div>
                {/* Total */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0' }}>
                  <div style={{ fontSize:11.5, color:'#64748b', fontWeight:600 }}>Total earned this grid</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0a1438', letterSpacing:'-0.3px' }}>
                    ${totalEarned.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Completion bonus card — white with purple accents */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden', position:'relative', borderLeft:'4px solid #7c3aed' }}>
              <div style={{ position:'absolute', top:'-30%', right:'-20%', width:240, height:'200%', background:'radial-gradient(circle,rgba(196,181,253,0.18),transparent 65%)', pointerEvents:'none' }}/>
              <div style={{ padding:'16px 18px', position:'relative' }}>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:10.5, fontWeight:800, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14, color:'#7c3aed' }}>♛</span>Completion bonus
                </div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:32, fontWeight:800, background:BONUS_GRAD, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent', letterSpacing:'-1px', lineHeight:1, marginBottom:4 }}>
                  ${bonusMax.toFixed(2)}
                </div>
                <div style={{ fontSize:11.5, color:'#64748b', fontWeight:600, marginBottom:10 }}>
                  10% × {TOTAL_SEATS} seats × ${tier.price} tier
                </div>
                <div style={{ display:'inline-block', background:'linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)', color:'#fff', fontSize:10.5, fontWeight:800, padding:'5px 12px', borderRadius:99, marginTop:4, fontFamily:'JetBrains Mono,monospace', letterSpacing:'0.4px', boxShadow:'0 3px 10px rgba(124,58,237,0.3)' }}>
                  {seatsToUnlock} seats to unlock
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, paddingTop:12, borderTop:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>Accrued</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11.5, color:'#7c3aed', fontWeight:800, background:'#f5f3ff', padding:'3px 9px', borderRadius:6, border:'1px solid #e9d5ff', letterSpacing:'0.5px' }}>
                    ${bonusAccrued.toFixed(2)} / ${bonusMax.toFixed(0)} ({bonusPct}%)
                  </div>
                </div>
              </div>
            </div>

            {/* 2×2 stats grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, flex:1 }}>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, color:'#0891b2', fontWeight:700, marginBottom:4, letterSpacing:'0.5px', textTransform:'uppercase' }}>Positions</div>
                <div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#0a1438', lineHeight:1, letterSpacing:'-0.5px' }}>
                    {filled}<span style={{ fontSize:13, color:'#94a3b8', fontWeight:600 }}>/{TOTAL_SEATS}</span>
                  </div>
                  <div style={{ fontSize:10.5, color:'#64748b', fontWeight:600, marginTop:4 }}>{pct}% to bonus</div>
                </div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, color:'#0891b2', fontWeight:700, marginBottom:4, letterSpacing:'0.5px', textTransform:'uppercase' }}>Tier</div>
                <div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#0a1438', lineHeight:1, letterSpacing:'-0.5px' }}>T{tier.t}</div>
                  <div style={{ fontSize:10.5, color:'#64748b', fontWeight:600, marginTop:4 }}>{tier.name} — ${tier.price}</div>
                </div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, color:'#0891b2', fontWeight:700, marginBottom:4, letterSpacing:'0.5px', textTransform:'uppercase' }}>Advances</div>
                <div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#0a1438', lineHeight:1, letterSpacing:'-0.5px' }}>{completedAdvances}</div>
                  <div style={{ fontSize:10.5, color:'#64748b', fontWeight:600, marginTop:4 }}>Bonuses paid prior</div>
                </div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, color:'#0891b2', fontWeight:700, marginBottom:4, letterSpacing:'0.5px', textTransform:'uppercase' }}>Directs</div>
                <div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#0a1438', lineHeight:1, letterSpacing:'-0.5px' }}>{directCount}</div>
                  <div style={{ fontSize:10.5, color:'#64748b', fontWeight:600, marginTop:4 }}>Personal referrals</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
