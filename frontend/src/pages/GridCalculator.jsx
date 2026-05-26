import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';

var TIERS = [
  { t:1, name:'Starter', price:20, grad:'linear-gradient(135deg,#064e3b,#10b981)' },
  { t:2, name:'Builder', price:50, grad:'linear-gradient(135deg,#1e3a5f,#3b82f6)' },
  { t:3, name:'Pro', price:100, grad:'linear-gradient(135deg,#4c1d95,#8b5cf6)' },
  { t:4, name:'Advanced', price:200, grad:'linear-gradient(135deg,#831843,#ec4899)' },
  { t:5, name:'Premium', price:400, grad:'linear-gradient(135deg,#134e4a,#14b8a6)' },
  { t:6, name:'Elite', price:600, grad:'linear-gradient(135deg,#78350f,#f59e0b)' },
  { t:7, name:'Master', price:800, grad:'linear-gradient(135deg,#312e81,#6366f1)' },
  { t:8, name:'Champion', price:1000, grad:'linear-gradient(135deg,#7f1d1d,#ef4444)' },
];

// Mirror production GridVisualiser exactly (frontend/src/pages/GridVisualiser.jsx
// lines 35-40). When a member uses the calculator, they should see the same
// visual story they'll get on their real grid — gold tiles for direct
// referrals, cyan tiles for spillover, purple bonus seat at position 36.
var DIRECT_GRAD    = 'linear-gradient(135deg,#b45309 0%,#d97706 30%,#fbbf24 65%,#fde047 100%)';
var SPILLOVER_GRAD = 'linear-gradient(135deg,#0891b2 0%,#06b6d4 50%,#22d3ee 100%)';
var BONUS_GRAD     = 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#c4b5fd 100%)';
var COBALT_HEADER  = 'linear-gradient(135deg,#172554 0%,#1e3a8a 100%)';
var CYAN_PROGRESS  = 'linear-gradient(90deg,#0891b2,#06b6d4,#22d3ee)';

// 25 May 2026 — grid reshaped from 8×8/64 to 6×6/36; bonus stays at 10%.
// Position 36 is the BONUS SEAT — purple gradient, unlocks the completion
// bonus when filled. Matches production grid layout 1:1.
var TOTAL_SEATS = 36;
var BONUS_SEAT_INDEX = 35;  // 0-indexed (position 36)
var BONUS_PCT = 0.10;

var consonants = 'BCDFGHJKLMNPRSTV';
var vowels = 'AEIOU';
function makeName() {
  return consonants[Math.floor(Math.random()*consonants.length)] + vowels[Math.floor(Math.random()*vowels.length)] + consonants[Math.floor(Math.random()*consonants.length)];
}

export default function GridCalculator() {
  var { t } = useTranslation();
  var [activeTier, setActiveTier] = useState(3);
  var [personalCount, setPersonalCount] = useState(8);
  var [filled, setFilled] = useState(0);
  var [running, setRunning] = useState(false);
  var [speed, setSpeed] = useState(300);
  var [earnings, setEarnings] = useState({ direct: 0, uni: 0, bonus: 0 });
  var [feed, setFeed] = useState([]);
  var [latestIdx, setLatestIdx] = useState(-1);
  var [seats, setSeats] = useState([]);
  var timerRef = useRef(null);
  var filledRef = useRef(0);
  var earningsRef = useRef({ direct: 0, uni: 0, bonus: 0 });
  var feedRef = useRef([]);
  var seatsRef = useRef([]);

  var tier = TIERS[activeTier - 1];
  var price = tier.price;
  var directRate = 0.40;
  var uniRate = 0.0625;
  var bonusTotal = price * BONUS_PCT * TOTAL_SEATS;
  var spillCount = TOTAL_SEATS - personalCount;

  var startSim = useCallback(function() {
    if (running) return;
    if (filledRef.current >= TOTAL_SEATS) {
      filledRef.current = 0;
      earningsRef.current = { direct: 0, uni: 0, bonus: 0 };
      feedRef.current = [];
      seatsRef.current = [];
      setFilled(0);
      setEarnings({ direct: 0, uni: 0, bonus: 0 });
      setFeed([]);
      setSeats([]);
      setLatestIdx(-1);
    }

    if (seatsRef.current.length === 0) {
      var seatList = [];
      for (var i = 0; i < TOTAL_SEATS; i++) {
        seatList.push({ name: makeName(), isPersonal: i < personalCount });
      }
      seatsRef.current = seatList;
      setSeats(seatList.slice());
    }

    setRunning(true);

    function tick() {
      var idx = filledRef.current;
      if (idx >= TOTAL_SEATS) {
        var e = Object.assign({}, earningsRef.current);
        e.bonus = bonusTotal;
        earningsRef.current = e;
        setEarnings(e);
        feedRef.current = [{ type: 'bonus', amount: bonusTotal, text: '♛ Grid Complete! Bonus: $' + bonusTotal.toFixed(0) }].concat(feedRef.current).slice(0, 30);
        setFeed(feedRef.current.slice());
        setRunning(false);
        return;
      }

      var seat = seatsRef.current[idx];
      var commAmount = seat.isPersonal ? price * directRate : price * uniRate;
      var commType = seat.isPersonal ? 'direct' : 'uni';

      filledRef.current = idx + 1;
      setFilled(idx + 1);
      setLatestIdx(idx);

      var e = Object.assign({}, earningsRef.current);
      e[commType] += commAmount;
      earningsRef.current = e;
      setEarnings(Object.assign({}, e));

      var entry = {
        type: commType, name: seat.name, isPersonal: seat.isPersonal, amount: commAmount,
        text: seat.name + (seat.isPersonal ? ' (Personal) — $' + commAmount.toFixed(2) + ' direct 40%' : ' (Spillover) — $' + commAmount.toFixed(2) + ' uni-level 6.25%')
      };
      feedRef.current = [entry].concat(feedRef.current).slice(0, 30);
      setFeed(feedRef.current.slice());
      timerRef.current = setTimeout(tick, speed);
    }
    tick();
  }, [running, speed, price, bonusTotal, personalCount]);

  function stopSim() {
    // Pause the simulation but KEEP all state — filled count, earnings,
    // feed, seats remain so the user can resume with the existing
    // momentum. Distinct from resetSim() which wipes everything back to
    // zero so a different scenario can be tried.
    clearTimeout(timerRef.current);
    setRunning(false);
  }

  function resetSim() {
    clearTimeout(timerRef.current);
    setRunning(false);
    filledRef.current = 0;
    earningsRef.current = { direct: 0, uni: 0, bonus: 0 };
    feedRef.current = [];
    seatsRef.current = [];
    setFilled(0);
    setEarnings({ direct: 0, uni: 0, bonus: 0 });
    setFeed([]);
    setSeats([]);
    setLatestIdx(-1);
  }

  var total = earnings.direct + earnings.uni + earnings.bonus;
  var pct = Math.round(filled / TOTAL_SEATS * 100);
  var complete = filled >= TOTAL_SEATS;

  return (
    <AppLayout title={t('gridCalc.pageTitle')} subtitle="See how your 6×6 profit grid fills and earns">
      <style>{`
        @keyframes gc-popIn { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        @keyframes gc-glowGold { 0%,100%{box-shadow:0 4px 14px rgba(217,119,6,0.4), 0 0 0 0 rgba(251,191,36,0.45)} 50%{box-shadow:0 6px 20px rgba(217,119,6,0.55), 0 0 0 6px rgba(251,191,36,0)} }
        @keyframes gc-glowCyan { 0%,100%{box-shadow:0 4px 14px rgba(8,145,178,0.35), 0 0 0 0 rgba(34,211,238,0.45)} 50%{box-shadow:0 6px 20px rgba(8,145,178,0.5), 0 0 0 6px rgba(34,211,238,0)} }
        @keyframes gc-glowPurple { 0%,100%{box-shadow:0 6px 24px rgba(124,58,237,0.4), 0 0 0 0 rgba(167,139,250,0.5)} 50%{box-shadow:0 10px 32px rgba(124,58,237,0.6), 0 0 0 10px rgba(167,139,250,0)} }
        @keyframes gc-bonusPulse {
          0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.5),0 4px 20px rgba(124,58,237,0.3)}
          50%{box-shadow:0 0 0 9px rgba(124,58,237,0),0 8px 30px rgba(124,58,237,0.45)}
        }
        @keyframes gc-slideIn { from{transform:translateX(-16px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes gc-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

        /* Tile shell — mirrors .lgv-tile in production GridVisualiser */
        .gc-tile{aspect-ratio:1;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;padding:8px 6px;color:#fff;overflow:hidden;transition:transform .18s ease, box-shadow .18s ease;cursor:default}
        .gc-tile::before{content:'';position:absolute;top:0;left:0;right:0;height:42%;background:linear-gradient(180deg,rgba(255,255,255,0.22),transparent);pointer-events:none}
        .gc-tile:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 10px 24px rgba(10,20,56,0.16)}
        .gc-tile.direct{box-shadow:0 4px 14px rgba(217,119,6,0.25)}
        .gc-tile.spillover{box-shadow:0 4px 14px rgba(8,145,178,0.22)}
        .gc-tile.completion-filled{box-shadow:0 6px 24px rgba(124,58,237,0.35)}
        .gc-tile.empty{background:#fafbff;border:2px dashed #cbd5e1;color:#94a3b8;box-shadow:inset 0 1px 3px rgba(10,20,56,0.03)}
        .gc-tile.empty::before{display:none}
        .gc-tile.empty:hover{border-color:#22d3ee;background:#f0fdff;transform:none;box-shadow:0 0 0 3px rgba(34,211,238,0.12)}
        .gc-tile.completion-empty{background:linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#c4b5fd 100%);border:3px dashed #ddd6fe;color:#f5f3ff;animation:gc-bonusPulse 2.5s ease-in-out infinite}
        .gc-tile.completion-empty::before{display:none}

        /* Latest-placed tile glow — gold/cyan/purple variants matching the seat type */
        .gc-tile.just-direct{animation:gc-popIn .35s ease, gc-glowGold 1.2s ease-in-out infinite}
        .gc-tile.just-spillover{animation:gc-popIn .35s ease, gc-glowCyan 1.2s ease-in-out infinite}
        .gc-tile.just-bonus{animation:gc-popIn .35s ease, gc-glowPurple 1.4s ease-in-out infinite}
        .gc-tile.just-placed{animation:gc-popIn .35s ease}

        /* Inner elements — mirror .lgv-avatar, .lgv-uname, .lgv-pos */
        .gc-avatar{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.22);border:2px solid rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-weight:800;font-size:13px;color:#fff;margin-bottom:4px;text-shadow:0 1px 2px rgba(0,0,0,0.2);position:relative;z-index:1;flex-shrink:0}
        .gc-tile.direct .gc-avatar{color:#7c2d12;text-shadow:none;background:rgba(255,255,255,0.32);border-color:rgba(255,255,255,0.55)}
        .gc-uname{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:700;line-height:1.1;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,0.25);position:relative;z-index:1;padding:0 3px}
        .gc-tile.direct .gc-uname{color:#7c2d12;text-shadow:0 1px 1px rgba(255,255,255,0.3)}
        .gc-pos{position:absolute;top:6px;left:8px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;color:rgba(255,255,255,0.55);z-index:1;letter-spacing:0.3px}
        .gc-tile.direct .gc-pos{color:rgba(124,45,18,0.55)}
        .gc-tile.empty .gc-pos{color:#94a3b8;font-size:13px;position:static;font-weight:700}
        .gc-direct-badge{position:absolute;top:6px;right:6px;width:18px;height:18px;border-radius:50%;background:#7c3aed;border:2px solid #fff;z-index:2;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#fff;box-shadow:0 2px 6px rgba(124,58,237,0.4)}

        .gc-progress-fill{position:relative;overflow:hidden}
        .gc-progress-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent);animation:gc-shimmer 2.4s infinite}

        .gc-feed-item{animation:gc-slideIn .25s ease}
        .gc-slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#172554,#1e3a8a);cursor:pointer;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.15)}
        .gc-slider::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#172554,#1e3a8a);cursor:pointer;border:2px solid #fff}
      `}</style>

      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        {/* Tier selector */}
        <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
          {TIERS.map(function(ti) {
            var on = activeTier === ti.t;
            return <button key={ti.t} onClick={function() { if (!running) { setActiveTier(ti.t); resetSim(); } }}
              style={{ padding:'10px 16px', borderRadius:10, border: on ? 'none' : '1px solid #e2e8f0',
                background: on ? ti.grad : '#fff', color: on ? '#fff' : '#475569',
                fontSize:12, fontWeight:700, cursor: running ? 'default' : 'pointer',
                fontFamily:'inherit', whiteSpace:'nowrap', transition:'all .2s',
                opacity: running && !on ? 0.5 : 1 }}>
              T{ti.t} {ti.name} — ${ti.price}
            </button>;
          })}
        </div>

        {/* Personal/Spillover slider — mirrors the Direct/Spillover legend on the real grid */}
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:14, height:14, borderRadius:4, background:DIRECT_GRAD, flexShrink:0 }}/>
            <span style={{ fontSize:12, fontWeight:700, color:'#7c2d12', whiteSpace:'nowrap' }}>Personal: {personalCount}</span>
          </div>
          <input type="range" className="gc-slider" min={1} max={TOTAL_SEATS} value={personalCount} disabled={running}
            onChange={function(e) { setPersonalCount(parseInt(e.target.value)); resetSim(); }}
            style={{ flex:1, height:6, borderRadius:3, appearance:'none', WebkitAppearance:'none',
              background:'linear-gradient(90deg, #fbbf24 ' + (personalCount/TOTAL_SEATS*100) + '%, #06b6d4 ' + (personalCount/TOTAL_SEATS*100) + '%)',
              opacity: running ? 0.5 : 1 }}/>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:14, height:14, borderRadius:4, background:SPILLOVER_GRAD, flexShrink:0 }}/>
            <span style={{ fontSize:12, fontWeight:700, color:'#0e7490', whiteSpace:'nowrap' }}>Spillover: {spillCount}</span>
          </div>
        </div>

        {/* Main layout */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>
          {/* LEFT */}
          <div>
            {/* Controls — Start / Stop / Reset / Speed
                · Start    : shown when filled === 0 (no run in progress)
                · Resume   : shown when filled > 0 && !running && !complete
                · Replay   : shown when complete && !running
                · Stop     : shown only while running — pauses without losing state
                · Reset    : always shown when filled > 0, regardless of running state
                            so the user can wipe and start over mid-run if they want
            */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, padding:'14px 18px', background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', flexWrap:'wrap' }}>
              {!running && <button onClick={startSim}
                style={{ padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:700, border:'none', cursor:'pointer',
                  background:'linear-gradient(135deg,#172554,#1e3a8a)', color:'#fff', fontFamily:'inherit',
                  transition:'all .2s', display:'flex', alignItems:'center', gap:6 }}>
                {filled === 0 ? '▶ Start Simulation' : complete ? '▶ Replay' : '▶ Resume'}
              </button>}
              {running && <button onClick={stopSim}
                style={{ padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:700, border:'none', cursor:'pointer',
                  background:'linear-gradient(135deg,#7f1d1d,#dc2626)', color:'#fff', fontFamily:'inherit',
                  transition:'all .2s', display:'flex', alignItems:'center', gap:6 }}>
                ⏸ Stop
              </button>}
              {filled > 0 && <button onClick={resetSim}
                style={{ padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:600, border:'1px solid #e2e8f0',
                  background:'#fff', color:'#475569', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                ↺ Reset Grid Calculator
              </button>}
              <div style={{ flex:1 }}/>
              <span style={{ fontSize:13, fontWeight:700, color:'#7a8899' }}>Speed:</span>
              <input type="range" className="gc-slider" min={50} max={800} value={800 - speed + 50}
                onChange={function(e) { setSpeed(800 - parseInt(e.target.value) + 50); }}
                style={{ width:80, height:4, borderRadius:2, appearance:'none', WebkitAppearance:'none', background:'linear-gradient(90deg,#172554 ' + ((800-speed)/750*100) + '%,#e2e8f0 ' + ((800-speed)/750*100) + '%)' }}/>
            </div>

            {/* Grid card — mirrors GridVisualiser layout 1:1 */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' }}>
              <div style={{ background:COBALT_HEADER, padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
                <div>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, color:'#fff' }}>T{tier.t} {tier.name} — ${price}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginTop:2 }}>6×6 Profit Grid · 36 positions · bonus at seat 36</div>
                </div>
                {/* Legend — same gold/cyan/purple/dashed swatches the real grid uses */}
                <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:12, height:12, borderRadius:3, background:DIRECT_GRAD }}/>
                    <span style={{ fontSize:11.5, fontWeight:700, color:'rgba(255,255,255,.7)' }}>Direct ({personalCount})</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:12, height:12, borderRadius:3, background:SPILLOVER_GRAD }}/>
                    <span style={{ fontSize:11.5, fontWeight:700, color:'rgba(255,255,255,.7)' }}>Spillover ({spillCount})</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:12, height:12, borderRadius:3, background:BONUS_GRAD }}/>
                    <span style={{ fontSize:11.5, fontWeight:700, color:'rgba(255,255,255,.7)' }}>Bonus seat</span>
                  </div>
                </div>
              </div>

              {/* Shimmering cyan progress bar — mirrors .lgv-progress-fill */}
              <div style={{ height:8, background:'#f1f5f9' }}>
                <div className="gc-progress-fill" style={{ height:'100%', width:pct+'%', background: complete ? BONUS_GRAD : CYAN_PROGRESS, transition:'width .6s ease' }}/>
              </div>

              <div style={{ padding:18 }}>
                {/* 6×6 layout matching production GridVisualiser exactly */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
                  {Array.from({ length:TOTAL_SEATS }).map(function(_, idx) {
                    var pos = idx + 1;
                    var isBonusSeat = idx === BONUS_SEAT_INDEX;
                    var isFilled = idx < filled;
                    var isLatest = idx === latestIdx && running;
                    var seat = seats[idx];
                    var isPersonal = seat ? seat.isPersonal : idx < personalCount;

                    // BONUS SEAT — position 36
                    if (isBonusSeat) {
                      if (!isFilled) {
                        // Empty bonus seat: purple gradient with pulse + ♛
                        return (
                          <div key={idx} className="gc-tile completion-empty">
                            <div className="gc-pos" style={{ color:'rgba(255,255,255,0.7)', fontWeight:800 }}>{pos}</div>
                            <div style={{ fontSize:28, lineHeight:1, color:'#fff', textShadow:'0 2px 6px rgba(76,29,149,0.4)', marginBottom:4 }}>♛</div>
                            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:9, fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', lineHeight:1.2, textShadow:'0 1px 2px rgba(76,29,149,0.3)' }}>Bonus<br/>seat</div>
                          </div>
                        );
                      }
                      // Filled bonus seat: purple gradient + tile pattern + glow if just placed
                      var bonusGlow = isLatest ? ' just-bonus' : ' just-placed';
                      return (
                        <div key={idx} className={'gc-tile completion-filled' + bonusGlow} style={{ background:BONUS_GRAD }}>
                          <div className="gc-pos">{pos}</div>
                          <div className="gc-avatar">{seat ? seat.name.charAt(0) : '♛'}</div>
                          <div className="gc-uname">{seat ? seat.name : 'Bonus'}</div>
                        </div>
                      );
                    }

                    // EMPTY (non-bonus) seat
                    if (!isFilled) {
                      return (
                        <div key={idx} className="gc-tile empty">
                          <div className="gc-pos">{pos}</div>
                        </div>
                      );
                    }

                    // FILLED seat — gold (direct) or cyan (spillover)
                    var grad = isPersonal ? DIRECT_GRAD : SPILLOVER_GRAD;
                    var typeClass = isPersonal ? 'direct' : 'spillover';
                    var glowClass = isLatest ? (isPersonal ? ' just-direct' : ' just-spillover') : ' just-placed';
                    return (
                      <div key={idx} className={'gc-tile ' + typeClass + glowClass} style={{ background:grad }}>
                        <div className="gc-pos">{pos}</div>
                        {isPersonal ? <div className="gc-direct-badge">★</div> : null}
                        <div className="gc-avatar">{seat ? seat.name.charAt(0) : ''}</div>
                        <div className="gc-uname">{seat ? seat.name : ''}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'#f1f5f9' }}>
                {[
                  { label:'Filled', val:filled+'/'+TOTAL_SEATS, color:'#0f172a' },
                  { label:'Direct', val:Math.min(filled,personalCount)+'/'+personalCount, color:'#b45309' },
                  { label:t('gridCalc.spilloverLabel'), val:Math.max(0,filled-personalCount)+'/'+spillCount, color:'#0e7490' },
                  { label:'Progress', val:pct+'%', color: complete ? '#7c3aed' : '#0891b2' },
                ].map(function(s, i) {
                  return <div key={i} style={{ background:'#fff', padding:'14px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#7a8899', textTransform:'uppercase', letterSpacing:.5 }}>{s.label}</div>
                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:s.color }}>{s.val}</div>
                  </div>;
                })}
              </div>

              {complete && <div style={{ margin:'16px', padding:18, borderRadius:14,
                background:'linear-gradient(135deg,rgba(34,211,238,.06),rgba(124,58,237,.06))',
                border:'1px solid rgba(124,58,237,.18)', textAlign:'center' }}>
                <div style={{ fontSize:15, fontWeight:800, background:BONUS_GRAD, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent', marginBottom:10 }}>♛ Grid Complete! Bonus Unlocked!</div>
                <div style={{ display:'flex', justifyContent:'center', gap:24, flexWrap:'wrap' }}>
                  {[
                    { label:'DIRECT (40%)', val:'$'+earnings.direct.toFixed(0), color:'#b45309' },
                    { label:'UNI-LEVEL (6.25%)', val:'$'+earnings.uni.toFixed(0), color:'#0e7490' },
                    { label:'BONUS (10%)', val:'$'+earnings.bonus.toFixed(0), color:'#7c3aed' },
                    { label:'TOTAL', val:'$'+total.toFixed(0), color:'#0a1438' },
                  ].map(function(s, i) {
                    return <div key={i}>
                      <div style={{ fontSize:13, fontWeight:700, color:s.color }}>{s.label}</div>
                      <div style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:800, color:s.color }}>{s.val}</div>
                    </div>;
                  })}
                </div>
              </div>}
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Total earnings hero — cyan total to match production accent */}
            <div style={{ background:COBALT_HEADER, borderRadius:16, padding:24, textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.03)' }}/>
              <div style={{ fontSize:13, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:8 }}>{t('gridCalc.totalEarnings')}</div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:44, fontWeight:900, background:CYAN_PROGRESS, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent', lineHeight:1 }}>${total.toFixed(2)}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.35)', marginTop:8 }}>T{tier.t} {tier.name} — ${price}/position</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {/* Direct — gold */}
              <div style={{ background:'linear-gradient(135deg,rgba(251,191,36,.06),rgba(180,131,9,.04))', borderRadius:12, padding:16, border:'1px solid rgba(251,191,36,.15)', textAlign:'center' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#b45309', textTransform:'uppercase', letterSpacing:.5 }}>Direct (40%)</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:800, color:'#b45309', marginTop:4 }}>${earnings.direct.toFixed(0)}</div>
                <div style={{ fontSize:13, color:'#b4530988', marginTop:2 }}>{Math.min(filled,personalCount)} × ${(price*directRate).toFixed(0)}</div>
              </div>
              {/* Uni-Level — cyan to match production spillover identity */}
              <div style={{ background:'linear-gradient(135deg,rgba(34,211,238,.07),rgba(8,145,178,.04))', borderRadius:12, padding:16, border:'1px solid rgba(8,145,178,.18)', textAlign:'center' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0e7490', textTransform:'uppercase', letterSpacing:.5 }}>Uni-Level (6.25%)</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:800, color:'#0e7490', marginTop:4 }}>${earnings.uni.toFixed(0)}</div>
                <div style={{ fontSize:13, color:'#0e749088', marginTop:2 }}>{Math.max(0,filled-personalCount)} × ${(price*uniRate).toFixed(2)}</div>
              </div>
              {/* Bonus — purple (matches the ♛ bonus seat) */}
              <div style={{ background: complete ? 'linear-gradient(135deg,rgba(167,139,250,.08),rgba(124,58,237,.05))' : '#fff', borderRadius:12, padding:16, border: complete ? '1px solid rgba(124,58,237,.2)' : '1px solid #e2e8f0', textAlign:'center' }}>
                <div style={{ fontSize:13, fontWeight:700, color: complete ? '#7c3aed' : '#7a8899', textTransform:'uppercase', letterSpacing:.5 }}>Bonus (10%)</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:800, color: complete ? '#7c3aed' : '#cbd5e1', marginTop:4 }}>{complete ? '$'+earnings.bonus.toFixed(0) : '♛'}</div>
                <div style={{ fontSize:13, color: complete ? '#7c3aed99' : '#7a8899', marginTop:2 }}>{complete ? 'Unlocked!' : 'Fills at '+TOTAL_SEATS+'/'+TOTAL_SEATS}</div>
              </div>
              <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0', textAlign:'center' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#7a8899', textTransform:'uppercase', letterSpacing:.5 }}>{t('gridCalc.positions')}</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:800, color:'#0f172a', marginTop:4 }}>{filled}/{TOTAL_SEATS}</div>
                <div style={{ fontSize:13, color:'#7a8899', marginTop:2 }}>{TOTAL_SEATS-filled} remaining</div>
              </div>
            </div>

            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden', flex:1, minHeight:200 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', fontSize:12, fontWeight:700, color:'#475569' }}>{t('gridCalc.liveCommissionFeed')}</div>
              <div style={{ maxHeight:300, overflowY:'auto', padding:'6px 10px' }}>
                {feed.length === 0 && <div style={{ textAlign:'center', padding:24, fontSize:13, color:'#7a8899' }}>{t('gridCalc.pressStart')}</div>}
                {feed.map(function(entry, i) {
                  var isBonus = entry.type === 'bonus';
                  var isPersonal = entry.isPersonal;
                  return <div key={i} className="gc-feed-item" style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:8,
                    background: i === 0 ? (isBonus ? 'rgba(124,58,237,.06)' : isPersonal ? 'rgba(251,191,36,.05)' : 'rgba(8,145,178,.05)') : 'transparent', marginBottom:1 }}>
                    {isBonus ? (
                      <div style={{ width:22, height:22, borderRadius:6, background:BONUS_GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#fff', flexShrink:0 }}>♛</div>
                    ) : (
                      <div style={{ width:22, height:22, borderRadius:6, background: isPersonal ? DIRECT_GRAD : SPILLOVER_GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'#fff', flexShrink:0 }}>
                        {isPersonal ? '★' : '↓'}
                      </div>
                    )}
                    <div style={{ flex:1, fontSize:13, color:'#475569', lineHeight:1.3 }}>{entry.text}</div>
                    <div style={{ fontSize:12, fontWeight:800, color: isBonus ? '#7c3aed' : isPersonal ? '#b45309' : '#0e7490', flexShrink:0 }}>${entry.amount.toFixed(2)}</div>
                  </div>;
                })}
              </div>
            </div>

            <div style={{ fontSize:13, color:'#7a8899', textAlign:'center', lineHeight:1.5 }}>
              This is a simulator for illustration purposes only. Actual earnings depend on your referral activity and network growth. Income is not guaranteed.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
