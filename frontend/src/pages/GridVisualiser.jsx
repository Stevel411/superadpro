import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';

/*
 * Profit Grid Visualiser — 4×4 / 16-seat model (12 Jun 2026).
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
  { t:1, name:'Starter',   price:20,   bonus:64   },
  { t:2, name:'Builder',   price:50,   bonus:160  },
  { t:3, name:'Pro',       price:100,  bonus:320  },
  { t:4, name:'Advanced',  price:200,  bonus:640  },
  { t:5, name:'Premium',   price:400,  bonus:1280 },
  { t:6, name:'Elite',     price:600,  bonus:1920 },
  { t:7, name:'Master',    price:800,  bonus:2560 },
  { t:8, name:'Champion',  price:1000, bonus:3200 },
];

var DEFAULT_SEATS = 16;

var DIRECT_GRAD = 'linear-gradient(135deg,#b45309 0%,#d97706 30%,#fbbf24 65%,#fde047 100%)';
var SPILLOVER_GRAD = 'linear-gradient(135deg,#0891b2 0%,#06b6d4 50%,#22d3ee 100%)';
var BONUS_GRAD = 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#c4b5fd 100%)';
var BONUS_GRAD_V2 = 'linear-gradient(135deg,#7c3aed,#6d28d9)';
var VIOLET = '#7c3aed';
var VIOLET_B = '#8b5cf6';
var COBALT_HEADER = 'linear-gradient(135deg,#172554 0%,#1e3a8a 100%)';
var CYAN_PROGRESS = 'linear-gradient(90deg,#0891b2,#06b6d4,#22d3ee)';
var TIER_ACTIVE_GRAD = 'linear-gradient(135deg,#1e3a8a,#0891b2)';

// Per-tier card gradients — all within the locked cobalt/royal/sky/cyan/
// electric palette (no amber/purple/red). Champion is the deepest cobalt→
// electric sweep to read as the premium top tier while staying in-palette.
var TIER_GRADS = {
  1: 'linear-gradient(150deg,#0ea5e9,#22d3ee)',
  2: 'linear-gradient(150deg,#0891b2,#06b6d4)',
  3: 'linear-gradient(150deg,#1e3a8a,#3b82f6)',
  4: 'linear-gradient(150deg,#0e7490,#06b6d4)',
  5: 'linear-gradient(150deg,#1d4ed8,#38bdf8)',
  6: 'linear-gradient(150deg,#155e75,#22d3ee)',
  7: 'linear-gradient(150deg,#0a1438,#1e3a8a)',
  8: 'linear-gradient(150deg,#0a1438,#0891b2 60%,#22d3ee)',
};

var css = `
  @keyframes lgv-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
  @keyframes lgv-pulse {
    0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.5),0 4px 20px rgba(124,58,237,0.3)}
    50%{box-shadow:0 0 0 9px rgba(124,58,237,0),0 8px 30px rgba(124,58,237,0.45)}
  }
  .lgv-tier-tab{padding:9px 16px;border-radius:8px;border:1px solid #cbd5e1;font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .2s;color:#475569;background:#fff;letter-spacing:0.2px}
  .lgv-tier-tab:hover:not(.active){background:#f8fafc;border-color:#94a3b8}
  .lgv-tier-tab.active{color:#fff;border-color:transparent;box-shadow:0 4px 14px rgba(8,145,178,0.25)}
  .lgv-hero{text-align:center;margin-bottom:16px}
  .lgv-hero h2{font-family:'Sora',sans-serif;font-weight:800;font-size:23px;color:#0a1438;margin:0 0 5px;letter-spacing:-0.4px}
  .lgv-hero p{font-size:15px;color:#475569;margin:0;font-weight:500;line-height:1.5}
  .lgv-hero .amt{color:#0891b2;font-weight:800}
  .lgv-claim{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;background:linear-gradient(135deg,#0a1438,#1e3a8a);border-radius:12px;padding:13px 20px;margin-bottom:18px;text-align:center}
  .lgv-claim .big{font-family:'Sora',sans-serif;font-weight:800;font-size:16px;color:#fff;letter-spacing:-0.2px}
  .lgv-claim .big b{color:#34d399}
  .lgv-claim .split{font-size:12.5px;color:#9fb4d8;font-weight:600}
  .lgv-tiers-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-bottom:11px}
  .lgv-tcard{position:relative;border-radius:14px;padding:14px 13px 13px;cursor:pointer;border:2px solid transparent;transition:transform .15s ease, box-shadow .15s ease;overflow:hidden;text-align:left;color:#fff;font-family:'DM Sans',sans-serif}
  .lgv-tcard::before{content:'';position:absolute;top:0;left:0;right:0;height:38%;background:linear-gradient(180deg,rgba(255,255,255,0.20),transparent);pointer-events:none}
  .lgv-tcard:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(10,20,56,0.22)}
  .lgv-tcard .tt{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;letter-spacing:0.2px;position:relative;z-index:1}
  .lgv-tcard .tp{font-size:12px;color:rgba(255,255,255,0.85);font-weight:600;margin-top:1px;position:relative;z-index:1}
  .lgv-tcard .tpay{margin-top:10px;background:rgba(255,255,255,0.92);border-radius:8px;padding:7px 9px;position:relative;z-index:1}
  .lgv-tcard .tpay .r{display:flex;justify-content:space-between;align-items:baseline;gap:6px;font-size:11.5px;line-height:1.7}
  .lgv-tcard .tpay .r .lbl{color:#475569;font-weight:600}
  .lgv-tcard .tpay .r .g{color:#15803d;font-weight:700;font-family:'Sora',sans-serif}
  .lgv-tcard.active{border-color:#fff;box-shadow:0 8px 22px rgba(10,20,56,0.30)}
  .lgv-tcard.active .badge{position:absolute;top:11px;right:12px;font-family:'Sora',sans-serif;font-size:8.5px;font-weight:800;letter-spacing:0.9px;color:#fff;background:rgba(0,0,0,0.30);padding:2px 7px;border-radius:5px;z-index:2}
  .lgv-disclaimer{font-size:11px;color:#94a3b8;text-align:center;margin:0 0 18px;font-weight:500;line-height:1.5;max-width:760px;margin-left:auto;margin-right:auto}
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
  .lgv-money{font-family:'Sora',sans-serif;font-weight:700;font-size:11px;color:#15803d;background:rgba(255,255,255,0.82);border-radius:6px;padding:1px 7px;margin-top:4px;position:relative;z-index:1;text-shadow:none;letter-spacing:0.2px}
  .lgv-star{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:5px;position:relative;z-index:1;flex-shrink:0;overflow:hidden}
  .lgv-star::before{content:'';position:absolute;top:3px;left:6px;right:6px;height:38%;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,0.55),transparent);pointer-events:none;z-index:2}
  .lgv-star-ico{position:relative;z-index:1;font-size:20px;line-height:1}
  .lgv-star.gold{background:radial-gradient(circle at 50% 32%,#fff4c2 0%,#ffd63d 34%,#f5b210 66%,#b9760a 100%);border:1.5px solid #ffe9a3;box-shadow:0 2px 8px rgba(180,116,10,0.5),inset 0 -2px 5px rgba(140,80,0,0.45),inset 0 2px 4px rgba(255,255,255,0.6)}
  .lgv-star.gold .lgv-star-ico{color:#7a4906;text-shadow:0 1px 1px rgba(255,255,255,0.45)}
  .lgv-star.cyan{background:radial-gradient(circle at 50% 32%,#d6fbff 0%,#5fe3f5 34%,#16b6d4 66%,#0a7f9c 100%);border:1.5px solid #aef3ff;box-shadow:0 2px 8px rgba(8,127,156,0.5),inset 0 -2px 5px rgba(6,90,110,0.45),inset 0 2px 4px rgba(255,255,255,0.6)}
  .lgv-star.cyan .lgv-star-ico{color:#06596b;text-shadow:0 1px 1px rgba(255,255,255,0.45)}
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
  var [viewAdvance, setViewAdvance] = useState(null); // null = current filling grid; else a completed advance #
  var previewV2 = (typeof window !== 'undefined') && /[?&]preview_v2=1/.test(window.location.search);

  useEffect(function() {
    setLoading(true);
    apiGet('/api/grid-visualiser?tier=' + activeTier + (previewV2 ? '&preview_v2=1' : ''))
      .then(function(d) { setData(d); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, [activeTier]);

  // When tier changes, snap the board view back to the current grid.
  useEffect(function() { setViewAdvance(null); }, [activeTier]);

  var tier = TIERS[activeTier - 1];
  var liveSeats = (data && data.total) ? data.total : DEFAULT_SEATS;
  var filled = data ? data.filled : 0;
  var pct = Math.round(filled / liveSeats * 100);
  var seats = data ? data.seats : [];
  var bonusAccrued = data ? data.bonus_accrued : 0;
  var bonusMax = data ? data.bonus_max : tier.bonus;
  var bonusPct = Math.round(bonusAccrued / bonusMax * 100);
  var directEarned = data ? data.direct_earned : 0;
  var unilevelEarned = data ? data.unilevel_earned : 0;
  var totalEarned = data ? data.total_earned : 0;
  var directFills = data ? data.direct_fills : 0;
  var unilevelFills = data ? data.unilevel_fills : 0;
  var directPerFill = data ? data.direct_per_fill : tier.price * 0.30;
  var unilevelPerFill = data ? data.unilevel_per_fill : tier.price * 0.0625;
  var directCount = data ? data.direct_count : 0;
  var completedAdvances = data ? data.completed_advances : 0;
  var seatsToUnlock = Math.max(0, liveSeats - filled);
  var completedGrids = data && data.completed_grids ? data.completed_grids : [];
  var completionBonusPaid = data ? (data.completion_bonus_paid || 0) : 0;
  var completionBonusCount = data ? (data.completion_bonus_count || 0) : 0;

  // ── Plan-aware (v1 live / v2 New Profit Grid) ──
  var planV2 = data ? (data.plan_version === 2) : false;
  var welcomePerFill   = data ? (data.welcome_per_fill || 0) : 0;
  var bonusPerPosition = data ? (data.bonus_per_position != null ? data.bonus_per_position : bonusMax) : bonusMax;
  var bonusCashPerPos  = data ? (data.bonus_cash_per_position || 0) : 0;
  var bonusStepupPerPos= data ? (data.bonus_stepup_per_position || 0) : 0;
  var bonusPoolTotal   = data ? (data.bonus_pool_total || bonusMax) : bonusMax;
  var stepUpBalance    = data ? (data.step_up_balance || 0) : 0;
  var unilevelLevels   = data ? (data.unilevel_levels || 8) : 8;
  var bonusCashEarned  = data ? (data.bonus_cash_earned || 0) : 0;
  var bonusStepupEarned= data ? (data.bonus_stepup_earned || 0) : 0;
  var gridBonusEarned  = planV2 ? (bonusCashEarned + bonusStepupEarned) : completionBonusPaid;

  // Board the member is viewing: the live filling grid (default) or a completed
  // advance they tapped. Only the LEFT board card swaps; right-hand stats stay live.
  var viewedCompleted = viewAdvance !== null ? completedGrids.find(function(g){ return g.advance === viewAdvance; }) : null;
  var boardSeats = viewedCompleted ? viewedCompleted.seats : seats;
  var boardTotal = viewedCompleted ? ((viewedCompleted.total_seats || viewedCompleted.filled) || liveSeats) : liveSeats;
  var boardCols = Math.max(1, Math.round(Math.sqrt(boardTotal)));
  var boardBonus = viewedCompleted ? (viewedCompleted.bonus_paid || bonusMax) : bonusMax;
  var boardFilled = viewedCompleted ? (viewedCompleted.filled || boardTotal) : filled;
  var boardPct = Math.round(boardFilled / boardTotal * 100);
  var boardSeatsToUnlock = Math.max(0, boardTotal - boardFilled);
  var currentAdvanceNum = data ? data.advance : (completedAdvances + 1);
  // v2 grids pay at every 4th seat; v1 (and legacy 36-seat boards) pay once at the end.
  var boardBonusPositions = (planV2 && boardTotal === 16) ? [4, 8, 12, 16] : [boardTotal];
  // next unfilled bonus seat (for the "next bonus" card + progress countdown)
  var nextBonusSeat = boardBonusPositions.filter(function(p){ return p > boardFilled; })[0] || boardTotal;
  var seatsToNextBonus = Math.max(0, nextBonusSeat - boardFilled);

  return (
    <AppLayout categoryBack={{ to: '/home-preview', label: 'Dashboard' }} title="Profit Grid" subtitle={planV2 ? 'Your 4×4 grid — bonuses at seats 4, 8, 12 & 16' : ('Your ' + Math.round(Math.sqrt(liveSeats)) + '×' + Math.round(Math.sqrt(liveSeats)) + ' spillover grid — bonus at seat ' + liveSeats)}>
      <style>{css}</style>
      <div style={{ maxWidth:1180, margin:'0 auto' }}>

        {/* Enlarged tier cards — two rows of four, each showing all three ways
            the tier pays. Replaces the small text tabs. Lead the page (21 Jun:
            revenue-share banner moved below the grid). */}
        <div className="lgv-tiers-grid">
          {TIERS.map(function(t) {
            var isActive = activeTier === t.t;
            var direct = t.price * (planV2 ? 0.40 : 0.30);
            var spill = t.price * (planV2 ? 0.05 : 0.0625);
            return (
              <div key={t.t} className={'lgv-tcard' + (isActive ? ' active' : '')}
                   style={{ background: TIER_GRADS[t.t] }}
                   onClick={function(){ setActiveTier(t.t); }}
                   title={'T' + t.t + ' ' + t.name + ' — $' + t.price}>
                {isActive ? <span className="badge">ACTIVE</span> : null}
                <div className="tt">T{t.t} {t.name}</div>
                <div className="tp">${t.price} entry</div>
                <div className="tpay">
                  <div className="r"><span className="lbl">Direct seat</span><span className="g">+${direct.toFixed(2)}</span></div>
                  <div className="r"><span className="lbl">Spillover seat</span><span className="g">+${spill.toFixed(2)}</span></div>
                  <div className="r"><span className="lbl">{planV2 ? 'Bonus seat ×4' : 'Completion bonus'}</span><span className="g">+${planV2 ? t.price.toFixed(2) : t.bonus.toLocaleString()}</span></div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="lgv-disclaimer">Figures show the commission each seat pays under the Campaign Tier compensation plan, not a prediction of earnings. What you actually earn depends on your own activity and referrals. See the income disclaimer for details.</p>

        {/* Main two-column layout — 3fr (grid) / 2fr (right column).
            align-items: stretch ensures the right column stretches to
            match the taller grid card. The 2×2 stat grid below uses
            flex:1 to absorb leftover vertical space. */}
        <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:16, alignItems:'stretch' }}>

          {/* Grid card */}
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', boxShadow:'0 4px 20px rgba(10,20,56,0.04)' }}>
            <div style={{ background:COBALT_HEADER, padding:'16px 22px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:700, color:'#fff', letterSpacing:'-0.3px', position:'relative', zIndex:1 }}>T{tier.t} {tier.name} — ${tier.price}{viewedCompleted ? <span style={{ fontSize:12, fontWeight:700, color:'#a7f3d0', marginLeft:8 }}>· Grid {viewedCompleted.advance} ✓ complete</span> : null}</div>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.85)', fontWeight:600, fontFamily:'JetBrains Mono,monospace', position:'relative', zIndex:1 }}>{boardFilled} of {boardTotal} · {boardPct}%</div>
              <div style={{ position:'absolute', top:'-50%', right:'-10%', width:280, height:'200%', background:'radial-gradient(circle,rgba(56,189,248,0.15),transparent 65%)', pointerEvents:'none' }}/>
            </div>
            <div style={{ padding:'18px 22px' }}>
              {/* Grid selector — appears once the member has completed grids, so a
                  fresh advance doesn't look like an empty/lost board. Tap a chip to
                  view that completed grid's full 36 seats; "now" returns to live. */}
              {completedGrids.length > 0 ? (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                  {completedGrids.map(function(cg) {
                    var active = viewAdvance === cg.advance;
                    return (
                      <button key={'cg'+cg.advance} onClick={function(){ setViewAdvance(cg.advance); }}
                        style={{ cursor:'pointer', border:'1px solid '+(active?'#10b981':'#cbd5e1'), background:active?'#ecfdf5':'#fff', color:active?'#047857':'#475569', borderRadius:8, padding:'6px 12px', fontFamily:'DM Sans,sans-serif', fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ color:'#10b981' }}>✓</span> Grid {cg.advance} · {cg.total_seats}/{cg.total_seats}{cg.bonus_paid ? ' · $'+cg.bonus_paid.toFixed(0) : ''}
                      </button>
                    );
                  })}
                  <button onClick={function(){ setViewAdvance(null); }}
                    style={{ cursor:'pointer', border:'1px solid '+(viewAdvance===null?'#0891b2':'#cbd5e1'), background:viewAdvance===null?'#ecfeff':'#fff', color:viewAdvance===null?'#0e7490':'#475569', borderRadius:8, padding:'6px 12px', fontFamily:'DM Sans,sans-serif', fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'#0891b2', display:'inline-block' }}/> Grid {currentAdvanceNum} · now ({filled}/{liveSeats})
                  </button>
                </div>
              ) : null}
              {/* Progress row with countdown */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, fontSize:14 }}>
                <div style={{ color:'#475569', fontWeight:700 }}>{planV2 ? 'Progress to next bonus' : 'Progress to bonus'}</div>
                <div style={{ color: viewedCompleted ? '#10b981' : (planV2 ? VIOLET : '#0891b2'), fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{viewedCompleted ? 'Complete ✓' : (planV2 ? (seatsToNextBonus + ' seats to seat ' + nextBonusSeat + ' ★') : (boardSeatsToUnlock + ' seats to ♛'))}</div>
              </div>
              <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden', marginBottom:18 }}>
                <div className="lgv-progress-fill" style={{ height:'100%', width:boardPct+'%', background:CYAN_PROGRESS, borderRadius:4, transition:'width .6s ease' }}/>
              </div>
              {/* Legend */}
              <div style={{ display:'flex', gap:18, justifyContent:'center', marginBottom:18, fontSize:13, color:'#475569', fontWeight:600, flexWrap:'wrap' }}>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:15, height:15, borderRadius:4, background:DIRECT_GRAD }}/> Direct referral</span>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:15, height:15, borderRadius:4, background:SPILLOVER_GRAD }}/> Spillover</span>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:15, height:15, borderRadius:4, background: planV2 ? BONUS_GRAD_V2 : BONUS_GRAD }}/> {planV2 ? ('Bonus seat — $' + bonusPerPosition.toFixed(0)) : 'Bonus seat'}</span>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:15, height:15, borderRadius:4, background:'#fafbff', border:'2px dashed #cbd5e1' }}/> Empty</span>
              </div>
              {/* 6×6 tile grid — or, for a completed grid whose seat records were
                  lost in the 3 June reset (0 surviving rows), an explanatory state
                  instead of a misleading empty board under a "complete" header. */}
              {viewedCompleted && boardSeats.length === 0 ? (
                <div style={{ background:'#ecfdf5', border:'1px solid #a7f3d0', borderRadius:12, padding:'28px 24px', textAlign:'center' }}>
                  <div style={{ fontSize:34, lineHeight:1, marginBottom:10, color:'#10b981' }}>✓</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#047857', marginBottom:8 }}>Grid {viewedCompleted.advance} completed — all {viewedCompleted.total_seats} seats filled</div>
                  <div style={{ fontSize:13.5, color:'#475569', fontWeight:600, lineHeight:1.5, maxWidth:460, margin:'0 auto' }}>
                    This grid completed and {viewedCompleted.bonus_paid ? ('its $' + viewedCompleted.bonus_paid.toFixed(0) + ' completion bonus was paid') : 'its completion bonus was processed'}. The individual seat records for this advance predate the 3 June reset and aren&rsquo;t available to display — the completion and bonus remain intact in your earnings.
                  </div>
                </div>
              ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(' + boardCols + ',1fr)', gap:10, opacity: loading ? 0.4 : 1, transition:'opacity .3s' }}>
                {Array.from({length:boardTotal}, function(_,i) {
                  var pos = i + 1;
                  var seat = boardSeats.find(function(s){ return s.position === pos; });
                  var isBonusSeat = boardBonusPositions.indexOf(pos) !== -1;
                  if (seat) {
                    var isDirect = seat.is_direct;
                    var bg = isBonusSeat ? (planV2 ? BONUS_GRAD_V2 : BONUS_GRAD) : (isDirect ? DIRECT_GRAD : SPILLOVER_GRAD);
                    var tileClass = 'lgv-tile ' + (isBonusSeat ? 'completion-filled' : (isDirect ? 'direct' : 'spillover'));
                    var seatMoney = isBonusSeat ? bonusPerPosition : (isDirect ? directPerFill : unilevelPerFill);
                    return (
                      <div key={i} className={tileClass} style={{ background:bg }}
                           title={seat.username + ' · ' + (isBonusSeat ? 'Bonus' : (isDirect ? 'Direct' : 'Spillover')) + ' · ' + seat.member_id}>
                        <div className="lgv-pos">{pos}</div>
                        {isBonusSeat
                          ? <div style={{ position:'absolute', top:7, right:9, color:'#fff', fontSize:14 }}>★</div>
                          : <div className={'lgv-star ' + (isDirect ? 'gold' : 'cyan')}><span className="lgv-star-ico">★</span></div>}
                        <div className="lgv-uname">{seat.username}</div>
                        <div className="lgv-money">+${seatMoney.toFixed(2)}</div>
                        {isBonusSeat && planV2 ? <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:8.5, color:'rgba(255,255,255,0.85)', marginTop:2 }}>${bonusCashPerPos.toFixed(0)} cash · ${bonusStepupPerPos.toFixed(0)} step-up</div> : null}
                      </div>
                    );
                  }
                  if (isBonusSeat) {
                    if (planV2) {
                      return (
                        <div key={i} className="lgv-tile" style={{ border:'2px dashed '+VIOLET_B, background:'rgba(124,58,237,0.07)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
                             title={'Seat ' + pos + ' — bonus seat, pays one tier-price split cash/step-up'}>
                          <div className="lgv-pos" style={{ color:VIOLET, fontWeight:800 }}>{pos}</div>
                          <div style={{ fontSize:18, lineHeight:1, color:VIOLET, margin:'2px 0' }}>★</div>
                          <div style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:800, color:VIOLET }}>${bonusPerPosition.toFixed(0)}</div>
                          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:9, fontWeight:700, color:VIOLET, marginTop:3 }}>SEAT {pos} · BONUS</div>
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="lgv-tile completion-empty" style={{ background:BONUS_GRAD }}
                           title={'Position ' + boardTotal + ' — fill this to unlock the completion bonus'}>
                        <div className="lgv-pos" style={{ color:'rgba(255,255,255,0.7)', fontWeight:800 }}>{pos}</div>
                        <div style={{ fontSize:30, lineHeight:1, color:'#fff', textShadow:'0 2px 6px rgba(76,29,149,0.4)', marginBottom:4 }}>♛</div>
                        <div style={{ fontFamily:'Sora,sans-serif', fontSize:9, fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', lineHeight:1.2, textShadow:'0 1px 2px rgba(76,29,149,0.3)' }}>Bonus<br/>seat</div>
                        <div className="lgv-money">+${boardBonus.toFixed(2)}</div>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="lgv-tile empty">
                      <div className="lgv-pos">{pos}</div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          </div>

          {/* Right column — commissions earned + bonus + 2×2 stats */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, height:'100%' }}>

            {/* Commissions earned card */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'13px 18px', background:COBALT_HEADER, fontFamily:'Sora,sans-serif', fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'0.5px', textTransform:'uppercase', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16, color:'#38bdf8' }}>◆</span>Commissions earned
              </div>
              <div style={{ padding:'14px 16px' }}>
                {/* Direct row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize:15, color:'#0f172a', fontWeight:700 }}>Direct referrals</div>
                    <div style={{ display:'inline-block', marginTop:5, fontSize:12, fontWeight:600, color:'#1e3a8a', background:'#eef4ff', border:'1px solid #dbe6ff', borderRadius:6, padding:'2px 8px', fontFamily:'JetBrains Mono,monospace' }}>{planV2 ? '40% direct sponsor' : '30% direct sponsor'}</div>
                  </div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, letterSpacing:'-0.4px', background:DIRECT_GRAD, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' }}>
                    ${directEarned.toFixed(2)}
                  </div>
                </div>
                {/* Uni-level row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 0', borderBottom:'1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize:15, color:'#0f172a', fontWeight:700 }}>Uni-level fills</div>
                    <div style={{ display:'inline-block', marginTop:5, fontSize:12, fontWeight:600, color:'#1e3a8a', background:'#eef4ff', border:'1px solid #dbe6ff', borderRadius:6, padding:'2px 8px', fontFamily:'JetBrains Mono,monospace' }}>{planV2 ? '5% × 4 levels' : '6.25% × 8 levels'}</div>
                  </div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'#0891b2', letterSpacing:'-0.4px' }}>
                    ${unilevelEarned.toFixed(2)}
                  </div>
                </div>
                {/* Completion bonuses paid — the third stream, previously missing
                    entirely from this card so members had no record of bonuses earned */}
                {/* Bonus stream — v2: Grid bonuses (25%, every 4 seats) with the
                    cash/step-up split; v1: Completion bonuses (only when paid). */}
                {planV2 ? (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'13px 0', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, color:'#0f172a', fontWeight:700 }}>Grid bonuses</div>
                      <div style={{ display:'inline-block', marginTop:5, fontSize:12, fontWeight:600, color:'#6d28d9', background:'#f5f3ff', border:'1px solid #e9d5ff', borderRadius:6, padding:'2px 8px', fontFamily:'JetBrains Mono,monospace' }}>25% · every 4 seats</div>
                      <div style={{ display:'flex', gap:7, marginTop:8 }}>
                        <div style={{ flex:1, border:'1px solid #ddd6fe', background:'#faf5ff', borderRadius:9, padding:'7px 10px' }}>
                          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, fontWeight:700, color:VIOLET }}>CASH</div>
                          <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:15, color:'#0a1438' }}>${bonusCashEarned.toFixed(2)}</div>
                          <div style={{ fontSize:10.5, color:'#64748b' }}>withdrawable</div>
                        </div>
                        <div style={{ flex:1, border:'1px solid #ddd6fe', background:'#faf5ff', borderRadius:9, padding:'7px 10px' }}>
                          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, fontWeight:700, color:VIOLET }}>STEP-UP</div>
                          <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:15, color:'#0a1438' }}>${bonusStepupEarned.toFixed(2)}</div>
                          <div style={{ fontSize:10.5, color:'#64748b' }}>toward next tier</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, background:BONUS_GRAD_V2, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent', letterSpacing:'-0.4px', marginLeft:12 }}>
                      ${gridBonusEarned.toFixed(2)}
                    </div>
                  </div>
                ) : (completionBonusPaid > 0 ? (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 0', borderBottom:'1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize:15, color:'#0f172a', fontWeight:700 }}>Completion bonuses</div>
                      <div style={{ display:'inline-block', marginTop:5, fontSize:12, fontWeight:600, color:'#6d28d9', background:'#f5f3ff', border:'1px solid #e9d5ff', borderRadius:6, padding:'2px 8px', fontFamily:'JetBrains Mono,monospace' }}>{completionBonusCount} grid{completionBonusCount===1?'':'s'} · 20% bonus</div>
                    </div>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, background:BONUS_GRAD, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent', letterSpacing:'-0.4px' }}>
                      ${completionBonusPaid.toFixed(2)}
                    </div>
                  </div>
                ) : null)}
                {/* Total */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 0' }}>
                  <div style={{ fontSize:15, color:'#0f172a', fontWeight:700 }}>Total earned · all grids</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'#0a1438', letterSpacing:'-0.4px' }}>
                    ${totalEarned.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bonus card — v2: next bonus seat (every 4 seats); v1: completion bonus */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden', position:'relative', borderLeft:'4px solid #7c3aed' }}>
              <div style={{ position:'absolute', top:'-30%', right:'-20%', width:240, height:'200%', background:'radial-gradient(circle,rgba(196,181,253,0.18),transparent 65%)', pointerEvents:'none' }}/>
              <div style={{ padding:'16px 18px', position:'relative' }}>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:12, fontWeight:800, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:15, color:'#7c3aed' }}>♛</span>{planV2 ? 'Next bonus seat' : 'Completion bonus'}
                </div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:32, fontWeight:800, background:(planV2?BONUS_GRAD_V2:BONUS_GRAD), WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent', letterSpacing:'-1px', lineHeight:1, marginBottom:5 }}>
                  ${(planV2 ? bonusPerPosition : bonusMax).toFixed(2)}
                </div>
                <div style={{ fontSize:13, color:'#475569', fontWeight:600, marginBottom:11 }}>
                  {planV2
                    ? ('Seat ' + nextBonusSeat + ' · $' + bonusCashPerPos.toFixed(0) + ' cash + $' + bonusStepupPerPos.toFixed(0) + ' step-up')
                    : ('20% × ' + liveSeats + ' seats × $' + tier.price + ' tier')}
                </div>
                <div style={{ display:'inline-block', background:'linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)', color:'#fff', fontSize:12, fontWeight:800, padding:'6px 14px', borderRadius:99, marginTop:4, fontFamily:'JetBrains Mono,monospace', letterSpacing:'0.4px', boxShadow:'0 3px 10px rgba(124,58,237,0.3)' }}>
                  {(planV2 ? seatsToNextBonus : seatsToUnlock)} seats to unlock
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:13, paddingTop:13, borderTop:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:13, color:'#475569', fontWeight:700 }}>{planV2 ? 'Accrued this grid' : 'Accrued'}</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12.5, color:'#7c3aed', fontWeight:800, background:'#f5f3ff', padding:'4px 10px', borderRadius:6, border:'1px solid #e9d5ff', letterSpacing:'0.5px' }}>
                    ${bonusAccrued.toFixed(2)} / ${(planV2 ? bonusPoolTotal : bonusMax).toFixed(0)} ({planV2 ? 25 : bonusPct}%)
                  </div>
                </div>
              </div>
            </div>

            {/* v2 — welcome bonus + step-up wallet */}
            {planV2 ? (
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'space-between', border:'1px solid #e2e8f0', borderRadius:12, padding:'13px 15px', background:'#fbfcfe' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:32, height:32, borderRadius:9, background:'#eef2ff', color:'#4f46e5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🔒</span>
                    <div>
                      <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:13 }}>Welcome bonus</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>15% · on activation</div>
                    </div>
                  </div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:16, color:'#0a1438' }}>${welcomePerFill.toFixed(2)}</div>
                </div>
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'space-between', border:'1px solid #ddd6fe', borderRadius:12, padding:'13px 15px', background:'#faf5ff' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ width:32, height:32, borderRadius:9, background:'#ede9fe', color:VIOLET, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>↗</span>
                    <div>
                      <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:13 }}>Step-up wallet</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>climbs you up</div>
                    </div>
                  </div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:16, color:VIOLET }}>${stepUpBalance.toFixed(2)}</div>
                </div>
              </div>
            ) : null}

            {/* 2×2 stats grid — icon-led cards, larger captions */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, flex:1 }}>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'13px 15px', display:'flex', gap:11, alignItems:'flex-start' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'#e6f6fb', color:'#0891b2', display:'flex', alignItems:'center', justifyContent:'center', flex:'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                </div>
                <div>
                  <div style={{ fontSize:12.5, color:'#0891b2', fontWeight:700, letterSpacing:'0.4px', textTransform:'uppercase', marginBottom:6 }}>Positions</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:25, fontWeight:800, color:'#0a1438', lineHeight:1, letterSpacing:'-0.5px' }}>
                    {filled}<span style={{ fontSize:14, color:'#94a3b8', fontWeight:600 }}>/{liveSeats}</span>
                  </div>
                  <div style={{ fontSize:12.5, color:'#475569', fontWeight:600, marginTop:5 }}>{pct}% to bonus</div>
                </div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'13px 15px', display:'flex', gap:11, alignItems:'flex-start' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'#e6f6fb', color:'#0891b2', display:'flex', alignItems:'center', justifyContent:'center', flex:'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 11 4-4-4-4"/><path d="M21 7H9a4 4 0 0 0-4 4v10"/><path d="m7 17-4 4"/></svg>
                </div>
                <div>
                  <div style={{ fontSize:12.5, color:'#0891b2', fontWeight:700, letterSpacing:'0.4px', textTransform:'uppercase', marginBottom:6 }}>Tier</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:25, fontWeight:800, color:'#0a1438', lineHeight:1, letterSpacing:'-0.5px' }}>T{tier.t}</div>
                  <div style={{ fontSize:12.5, color:'#475569', fontWeight:600, marginTop:5 }}>{tier.name} — ${tier.price}</div>
                </div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'13px 15px', display:'flex', gap:11, alignItems:'flex-start' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'#e6f6fb', color:'#0891b2', display:'flex', alignItems:'center', justifyContent:'center', flex:'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                </div>
                <div>
                  <div style={{ fontSize:12.5, color:'#0891b2', fontWeight:700, letterSpacing:'0.4px', textTransform:'uppercase', marginBottom:6 }}>Advances</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:25, fontWeight:800, color:'#0a1438', lineHeight:1, letterSpacing:'-0.5px' }}>{completedAdvances}</div>
                  <div style={{ fontSize:12.5, color:'#475569', fontWeight:600, marginTop:5 }}>Bonuses paid prior</div>
                </div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'13px 15px', display:'flex', gap:11, alignItems:'flex-start' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'#e6f6fb', color:'#0891b2', display:'flex', alignItems:'center', justifyContent:'center', flex:'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <div style={{ fontSize:12.5, color:'#0891b2', fontWeight:700, letterSpacing:'0.4px', textTransform:'uppercase', marginBottom:6 }}>Directs</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:25, fontWeight:800, color:'#0a1438', lineHeight:1, letterSpacing:'-0.5px' }}>{directCount}</div>
                  <div style={{ fontSize:12.5, color:'#475569', fontWeight:600, marginTop:5 }}>Personal referrals</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 100% revenue-share claim — moved below the grid (21 Jun) so the tier
            cards lead the page. Accurate now company share is 0%; scoped to
            Campaign Tiers / Profit Grid with the proof breakdown. */}
        <div className="lgv-claim" style={{ marginTop:18 }}>
          <span className="big">SuperAdPro shares <b>100% of Campaign Tier revenue</b> back to the community</span>
          <span className="split">{planV2
            ? '100% of Profit Grid commissions go to affiliates — 40% direct · 20% across 4 uni-levels · 15% welcome bonus · 25% bonus pool · 0% to the company'
            : '100% of Profit Grid commissions go to affiliates — 30% direct · 50% across the 8-level uni-level · 20% completion bonus · 0% to the company'}</span>
        </div>
      </div>
    </AppLayout>
  );
}
