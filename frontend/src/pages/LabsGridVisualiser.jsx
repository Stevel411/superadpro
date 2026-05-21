import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';

// Tier ladder — mirrors the existing GridVisualiser. Updated 21 May 2026
// to reflect the comp plan reallocation (10% bonus, 0% platform). Bonus
// values doubled. Kept here client-side for the active-tab gradient.
var TIERS = [
  { t:1, name:'Starter',   price:20,   bonus:128,  grad:'linear-gradient(135deg,#064e3b,#047857,#10b981)' },
  { t:2, name:'Builder',   price:50,   bonus:320,  grad:'linear-gradient(135deg,#1e3a5f,#2563eb,#3b82f6)' },
  { t:3, name:'Pro',       price:100,  bonus:640,  grad:'linear-gradient(135deg,#172554,#4c1d95,#8b5cf6)' },
  { t:4, name:'Advanced',  price:200,  bonus:1280, grad:'linear-gradient(135deg,#831843,#be185d,#ec4899)' },
  { t:5, name:'Premium',   price:400,  bonus:2560, grad:'linear-gradient(135deg,#134e4a,#0d9488,#2dd4bf)' },
  { t:6, name:'Elite',     price:600,  bonus:3840, grad:'linear-gradient(135deg,#6b7280,#9ca3af,#d1d5db)' },
  { t:7, name:'Master',    price:800,  bonus:5120, grad:'linear-gradient(135deg,#78350f,#b45309,#fbbf24)' },
  { t:8, name:'Champion',  price:1000, bonus:6400, grad:'linear-gradient(135deg,#450a0a,#991b1b,#ef4444)' },
];

// Tile gradients. Direct = amber/gold (recognisable as "your direct
// referral"), spillover = green (recognisable as "auto-placed"). Empty
// uses a dashed border on a near-white background so empty seats
// visually recede.
var DIRECT_GRAD = 'linear-gradient(135deg,#b45309,#fbbf24)';
var SPILLOVER_GRAD = 'linear-gradient(135deg,#047857,#10b981)';

var css = `
  .lgv-tier-tab{padding:8px 16px;border-radius:8px;border:1px solid #cbd5e1;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .2s;color:#475569;background:#fff}
  .lgv-tier-tab:hover:not(.active){background:#f8fafc}
  .lgv-tier-tab.active{color:#fff;border-color:transparent}
  .lgv-tile{aspect-ratio:1;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;transition:transform .15s;overflow:hidden;padding:4px 3px;box-sizing:border-box}
  .lgv-tile:hover{transform:scale(1.06)}
  .lgv-tile.empty{background:#f8fafc;border:1.5px dashed #cbd5e1;padding:0}
  .lgv-tile .avatar{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.22);border:1.5px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-family:Sora,sans-serif;font-weight:800;color:#fff;font-size:12px;text-shadow:0 1px 2px rgba(0,0,0,0.25);margin-bottom:4px;flex-shrink:0}
  .lgv-tile .uname{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.25);line-height:1.1;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;padding:0 2px}
`;

export default function LabsGridVisualiser() {
  var [activeTier, setActiveTier] = useState(1);
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    setLoading(true);
    apiGet('/api/labs-grid-visualiser?tier=' + activeTier)
      .then(function(d) { setData(d); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, [activeTier]);

  var tier = TIERS[activeTier - 1];
  var filled = data ? data.filled : 0;
  var total = 64;
  var pct = Math.round(filled / total * 100);
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

  return (
    <AppLayout title="Income Grid (Labs)" subtitle="Redesign sandbox · /labs-grid-visualiser">
      <style>{css}</style>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>

        {/* Tier tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'nowrap', overflowX:'auto', paddingBottom:2 }}>
          {TIERS.map(function(t) {
            var isActive = activeTier === t.t;
            return (
              <button key={t.t} className={'lgv-tier-tab' + (isActive ? ' active' : '')}
                style={isActive ? { background:t.grad } : {}}
                onClick={function(){ setActiveTier(t.t); }}>
                T{t.t} {t.name} — ${t.price}
              </button>
            );
          })}
        </div>

        {/* Main two-column layout — 3fr (grid) / 2fr (right column).
            align-items: stretch makes both columns share the taller column's
            height. The grid card naturally renders tall at 1100px width
            (proper square tiles); the right column gets stretched to match.
            The four 2×2 stat tiles at the bottom absorb the extra space
            via flex: 1 so the column fills evenly without any void. */}
        <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:16, alignItems:'stretch' }}>

          {/* Grid card */}
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
            <div style={{ background:'linear-gradient(135deg,#0a1438,#1e3a8a)', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:700, color:'#fff' }}>T{tier.t} {tier.name} — ${tier.price}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', fontWeight:600 }}>{filled} of {total} ({pct}%)</div>
            </div>
            <div style={{ padding:'16px 18px' }}>
              {/* Progress bar */}
              <div style={{ height:6, background:'#f1f5f9', borderRadius:3, marginBottom:14, overflow:'hidden' }}>
                <div style={{ height:'100%', width:pct+'%', background:'linear-gradient(90deg,#047857,#10b981)', borderRadius:3, transition:'width .5s' }}/>
              </div>
              {/* Legend */}
              <div style={{ display:'flex', gap:18, justifyContent:'center', marginBottom:14, fontSize:11, color:'#64748b', fontWeight:600, flexWrap:'wrap' }}>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:12, height:12, borderRadius:3, background:DIRECT_GRAD }}/> Direct referral</span>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:12, height:12, borderRadius:3, background:SPILLOVER_GRAD }}/> Spillover</span>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:12, height:12, borderRadius:3, background:'#f8fafc', border:'1.5px dashed #94a3b8' }}/> Empty</span>
              </div>
              {/* 8×8 tile grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:6, opacity: loading ? 0.4 : 1, transition:'opacity .3s' }}>
                {Array.from({length:64}, function(_,i) {
                  var pos = i + 1;
                  var seat = seats.find(function(s){ return s.position === pos; });
                  // Position 64 gets the completion-bonus star treatment —
                  // it's the seat that triggers the bonus payout when
                  // filled, so we mark it visually so the user has a
                  // specific target to aim for. Empty: big amber star
                  // (matches the completion bonus card colour). Filled:
                  // avatar stays + small star badge in top-right corner
                  // to signal "this is the seat that just paid the bonus".
                  var isCompletionSeat = pos === 64;
                  if (seat) {
                    var grad = seat.is_direct ? DIRECT_GRAD : SPILLOVER_GRAD;
                    return (
                      <div key={i} className="lgv-tile" style={{ background:grad, position:'relative' }} title={seat.username + ' · ' + (seat.is_direct ? 'Direct' : 'Spillover') + ' · ' + seat.member_id + (isCompletionSeat ? ' · Completion seat' : '')}>
                        <div className="avatar">{seat.username.charAt(0).toUpperCase()}</div>
                        <div className="uname">{seat.username}</div>
                        {isCompletionSeat ? (
                          <div style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'#fbbf24', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'#78350f', boxShadow:'0 2px 4px rgba(0,0,0,0.15)' }}>★</div>
                        ) : null}
                      </div>
                    );
                  }
                  if (isCompletionSeat) {
                    return (
                      <div key={i} className="lgv-tile" style={{ background:'linear-gradient(135deg,#fef3c7,#fde68a)', border:'2px dashed #f59e0b', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }} title="Position 64 — fill this to unlock the completion bonus">
                        <div style={{ fontSize:'22px', color:'#b45309', lineHeight:1, textShadow:'0 1px 2px rgba(180,83,9,0.15)' }}>★</div>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="lgv-tile empty">
                      <div style={{ color:'#94a3b8', fontWeight:700, fontSize:12 }}>{pos}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column — income breakdown + bonus + 2x2 stats.
              height:100% claims the full stretched height from the parent
              grid. The 2x2 stat grid below uses flex:1 to absorb any
              leftover vertical space after the two cards above. */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, height:'100%' }}>

            {/* Commissions earned card */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
              <div style={{ height:4, background:'linear-gradient(90deg,#16a34a,#4ade80,#86efac)' }}/>
              <div style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <div style={{ fontSize:22 }}>💰</div>
                  <div>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:14, fontWeight:800, color:'#0f172a' }}>Commissions earned</div>
                    <div style={{ fontSize:10, color:'#64748b', fontWeight:600 }}>From this grid · paid to wallet</div>
                  </div>
                </div>

                {/* Direct referral row */}
                <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px', marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:10, height:10, borderRadius:3, background:DIRECT_GRAD }}/>
                      <span style={{ fontSize:11, fontWeight:700, color:'#475569' }}>Direct referral</span>
                    </div>
                    <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600 }}>40% per fill</div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:900, color:'#b45309', lineHeight:1 }}>${directEarned.toFixed(2)}</div>
                    <div style={{ fontSize:10, color:'#64748b', fontWeight:600 }}>{directFills} {directFills === 1 ? 'direct' : 'directs'} × ${directPerFill.toFixed(2)}</div>
                  </div>
                </div>

                {/* Uni-level row */}
                <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:10, height:10, borderRadius:3, background:SPILLOVER_GRAD }}/>
                      <span style={{ fontSize:11, fontWeight:700, color:'#475569' }}>Uni-level spillover</span>
                    </div>
                    <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600 }}>6.25% per fill</div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:900, color:'#047857', lineHeight:1 }}>${unilevelEarned.toFixed(2)}</div>
                    <div style={{ fontSize:10, color:'#64748b', fontWeight:600 }}>{unilevelFills} {unilevelFills === 1 ? 'spillover' : 'spillovers'} × ${unilevelPerFill.toFixed(2)}</div>
                  </div>
                </div>

                {/* Total */}
                <div style={{ borderTop:'1px solid #f1f5f9', marginTop:12, paddingTop:12, display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.4 }}>Total earned</span>
                  <span style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:900, color:'#16a34a' }}>${totalEarned.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Completion bonus card */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
              <div style={{ height:4, background:'linear-gradient(90deg,#f59e0b,#fbbf24,#fde68a)' }}/>
              <div style={{ padding:'14px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ fontSize:20 }}>🏆</div>
                    <div>
                      <div style={{ fontFamily:'Sora,sans-serif', fontSize:12, fontWeight:800, color:'#0f172a' }}>Completion bonus</div>
                      <div style={{ fontSize:9, color:'#64748b', fontWeight:600 }}>at 64/64 · pending</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:900, color:'#f59e0b', lineHeight:1 }}>${bonusAccrued.toFixed(2)}</div>
                    <div style={{ fontSize:9, color:'#64748b', fontWeight:600 }}>of ${bonusMax.toFixed(0)}</div>
                  </div>
                </div>
                <div style={{ height:5, background:'#fef3c7', borderRadius:3, overflow:'hidden', marginTop:10 }}>
                  <div style={{ height:'100%', width:bonusPct+'%', background:'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius:3, transition:'width .5s' }}/>
                </div>
                <div style={{ fontSize:9, color:'#92400e', fontWeight:700, marginTop:6, textAlign:'center' }}>🔒 {64 - filled} positions to unlock</div>
              </div>
            </div>

            {/* 2×2 stats grid — flex:1 absorbs the leftover vertical
                space after the income card and bonus card. Each stat
                tile uses flex column + space-between so the label
                anchors to the top and the number to the bottom when
                the tiles stretch. */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, flex:1 }}>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 16px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>📊 Positions</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:'#2563eb', lineHeight:1 }}>{filled}<span style={{ color:'#94a3b8', fontSize:14, fontWeight:600 }}>/64</span></div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 16px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>⭐ Tier</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:'#f59e0b', lineHeight:1 }}>T{tier.t}</div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 16px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>🎯 Advances</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:'#8b5cf6', lineHeight:1 }}>{completedAdvances}</div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 16px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>👥 Directs</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:'#06b6d4', lineHeight:1 }}>{directCount}</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
