import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';

var TIERS = [
  { t:1, name:'Starter', price:20, grad:'linear-gradient(135deg,#064e3b,#10b981)' },
  { t:2, name:'Builder', price:50, grad:'linear-gradient(135deg,#1e3a5f,#3b82f6)' },
  { t:3, name:'Pro', price:100, grad:'linear-gradient(135deg,#4c1d95,#8b5cf6)' },
  { t:4, name:'Advanced', price:200, grad:'linear-gradient(135deg,#831843,#ec4899)' },
  { t:5, name:'Elite', price:400, grad:'linear-gradient(135deg,#134e4a,#14b8a6)' },
  { t:6, name:'Premium', price:600, grad:'linear-gradient(135deg,#78350f,#f59e0b)' },
  { t:7, name:'Executive', price:800, grad:'linear-gradient(135deg,#312e81,#6366f1)' },
  { t:8, name:'Ultimate', price:1000, grad:'linear-gradient(135deg,#7f1d1d,#ef4444)' },
];

var GOLD_GRAD = 'linear-gradient(135deg,#78350f,#b45309,#fbbf24)';
var GREEN_GRAD = 'linear-gradient(135deg,#064e3b,#047857,#10b981)';

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
  var bonusTotal = price * 0.05 * 64;
  var spillCount = 64 - personalCount;

  var startSim = useCallback(function() {
    if (running) return;
    if (filledRef.current >= 64) {
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
      for (var i = 0; i < 64; i++) {
        seatList.push({ name: makeName(), isPersonal: i < personalCount });
      }
      seatsRef.current = seatList;
      setSeats(seatList.slice());
    }

    setRunning(true);

    function tick() {
      var idx = filledRef.current;
      if (idx >= 64) {
        var e = Object.assign({}, earningsRef.current);
        e.bonus = bonusTotal;
        earningsRef.current = e;
        setEarnings(e);
        feedRef.current = [{ type: 'bonus', amount: bonusTotal, text: '🎉 Grid Complete! Bonus: $' + bonusTotal.toFixed(0) }].concat(feedRef.current).slice(0, 30);
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
  var pct = Math.round(filled / 64 * 100);
  var complete = filled >= 64;

  return (
    <AppLayout title="Profit Grid Calculator" subtitle="See how your 8×8 income grid fills and earns">
      <style>{`
        @keyframes popIn{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes glowGold{0%,100%{box-shadow:0 0 10px rgba(251,191,36,.3)}50%{box-shadow:0 0 22px rgba(251,191,36,.6)}}
        @keyframes glowGreen{0%,100%{box-shadow:0 0 10px rgba(16,185,129,.3)}50%{box-shadow:0 0 22px rgba(16,185,129,.6)}}
        @keyframes slideIn{from{transform:translateX(-16px);opacity:0}to{transform:translateX(0);opacity:1}}
        .gc-seat{border-radius:10px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:all .25s;position:relative}
        .gc-seat.empty{background:#f1f5f9;border:2px dashed #d1d5db}
        .gc-seat.filled{border:none;color:#fff;animation:popIn .35s ease}
        .gc-seat.latest-gold{animation:popIn .35s ease,glowGold 1.2s ease-in-out infinite}
        .gc-seat.latest-green{animation:popIn .35s ease,glowGreen 1.2s ease-in-out infinite}
        .gc-feed-item{animation:slideIn .25s ease}
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
                background: on ? ti.grad : '#fff', color: on ? '#fff' : '#64748b',
                fontSize:12, fontWeight:700, cursor: running ? 'default' : 'pointer',
                fontFamily:'inherit', whiteSpace:'nowrap', transition:'all .2s',
                opacity: running && !on ? 0.5 : 1 }}>
              T{ti.t} {ti.name} — ${ti.price}
            </button>;
          })}
        </div>

        {/* Personal/Spillover slider */}
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:14, height:14, borderRadius:4, background:GOLD_GRAD, flexShrink:0 }}/>
            <span style={{ fontSize:12, fontWeight:700, color:'#78350f', whiteSpace:'nowrap' }}>Personal: {personalCount}</span>
          </div>
          <input type="range" className="gc-slider" min={1} max={64} value={personalCount} disabled={running}
            onChange={function(e) { setPersonalCount(parseInt(e.target.value)); resetSim(); }}
            style={{ flex:1, height:6, borderRadius:3, appearance:'none', WebkitAppearance:'none',
              background:'linear-gradient(90deg, #fbbf24 ' + (personalCount/64*100) + '%, #10b981 ' + (personalCount/64*100) + '%)',
              opacity: running ? 0.5 : 1 }}/>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:14, height:14, borderRadius:4, background:GREEN_GRAD, flexShrink:0 }}/>
            <span style={{ fontSize:12, fontWeight:700, color:'#047857', whiteSpace:'nowrap' }}>Spillover: {spillCount}</span>
          </div>
        </div>

        {/* Main layout */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>
          {/* LEFT */}
          <div>
            {/* Controls */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, padding:'14px 18px', background:'#fff', borderRadius:14, border:'1px solid #e2e8f0' }}>
              <button onClick={startSim} disabled={running}
                style={{ padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:700, border:'none', cursor: running ? 'default' : 'pointer',
                  background: running ? '#94a3b8' : 'linear-gradient(135deg,#172554,#1e3a8a)', color:'#fff', fontFamily:'inherit',
                  opacity: running ? 0.6 : 1, transition:'all .2s', display:'flex', alignItems:'center', gap:6 }}>
                {filled === 0 ? '▶ Start Simulation' : running ? '⏳ Running...' : complete ? '▶ Replay' : '▶ Resume'}
              </button>
              {filled > 0 && !running && <button onClick={resetSim}
                style={{ padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:600, border:'1px solid #e2e8f0',
                  background:'#fff', color:'#64748b', cursor:'pointer', fontFamily:'inherit' }}>Reset</button>}
              <div style={{ flex:1 }}/>
              <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8' }}>Speed:</span>
              <input type="range" className="gc-slider" min={50} max={800} value={800 - speed + 50}
                onChange={function(e) { setSpeed(800 - parseInt(e.target.value) + 50); }}
                style={{ width:80, height:4, borderRadius:2, appearance:'none', WebkitAppearance:'none', background:'linear-gradient(90deg,#172554 ' + ((800-speed)/750*100) + '%,#e2e8f0 ' + ((800-speed)/750*100) + '%)' }}/>
            </div>

            {/* Grid card */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' }}>
              <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, color:'#fff' }}>T{tier.t} {tier.name} — ${price}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginTop:2 }}>8×8 Income Grid · 64 positions</div>
                </div>
                <div style={{ display:'flex', gap:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:GOLD_GRAD }}/>
                    <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.6)' }}>Personal ({personalCount})</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:GREEN_GRAD }}/>
                    <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.6)' }}>Spillover ({spillCount})</span>
                  </div>
                </div>
              </div>

              <div style={{ height:6, background:'#f1f5f9' }}>
                <div style={{ height:'100%', width:pct+'%', background: complete ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,#b45309,#fbbf24,#10b981)', transition:'width .3s', borderRadius: pct >= 100 ? 0 : '0 3px 3px 0' }}/>
              </div>

              <div style={{ padding:16 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:5 }}>
                  {Array.from({ length:64 }).map(function(_, idx) {
                    var isFilled = idx < filled;
                    var isLatest = idx === latestIdx && (running || (complete && idx === 63));
                    var seat = seats[idx];
                    var isPersonal = seat ? seat.isPersonal : idx < personalCount;
                    var grad = isPersonal ? GOLD_GRAD : GREEN_GRAD;
                    var glowClass = isLatest ? (isPersonal ? ' latest-gold' : ' latest-green') : '';
                    return <div key={idx} className={'gc-seat ' + (isFilled ? 'filled' + glowClass : 'empty')}
                      style={isFilled ? { background:grad } : {}}>
                      {isFilled && <>
                        <div style={{ fontSize:10, fontWeight:800, color:'#fff', lineHeight:1, textShadow:'0 1px 3px rgba(0,0,0,.3)' }}>{seat ? seat.name : ''}</div>
                        <div style={{ fontSize:7, fontWeight:700, color:'rgba(255,255,255,.7)', marginTop:2 }}>{isPersonal ? '40%' : '6.25%'}</div>
                      </>}
                      {!isFilled && <div style={{ fontSize:8, fontWeight:700, color:'#cbd5e1' }}>{idx + 1}</div>}
                    </div>;
                  })}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'#f1f5f9' }}>
                {[
                  { label:'Filled', val:filled+'/64', color:'#0f172a' },
                  { label:'Personal', val:Math.min(filled,personalCount)+'/'+personalCount, color:'#b45309' },
                  { label:'Spillover', val:Math.max(0,filled-personalCount)+'/'+spillCount, color:'#047857' },
                  { label:'Progress', val:pct+'%', color: complete ? '#4ade80' : '#0ea5e9' },
                ].map(function(s, i) {
                  return <div key={i} style={{ background:'#fff', padding:'14px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5 }}>{s.label}</div>
                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:s.color }}>{s.val}</div>
                  </div>;
                })}
              </div>

              {complete && <div style={{ margin:'16px', padding:18, borderRadius:14,
                background:'linear-gradient(135deg,rgba(74,222,128,.06),rgba(251,191,36,.06))',
                border:'1px solid rgba(74,222,128,.15)', textAlign:'center' }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#4ade80', marginBottom:10 }}>🎉 Grid Complete! Bonus Unlocked!</div>
                <div style={{ display:'flex', justifyContent:'center', gap:24 }}>
                  {[
                    { label:'DIRECT (40%)', val:'$'+earnings.direct.toFixed(0), color:'#b45309' },
                    { label:'UNI-LEVEL (6.25%)', val:'$'+earnings.uni.toFixed(0), color:'#047857' },
                    { label:'BONUS (5%)', val:'$'+earnings.bonus.toFixed(0), color:'#6366f1' },
                    { label:'TOTAL', val:'$'+total.toFixed(0), color:'#4ade80' },
                  ].map(function(s, i) {
                    return <div key={i}>
                      <div style={{ fontSize:10, fontWeight:700, color:s.color }}>{s.label}</div>
                      <div style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:800, color:s.color }}>{s.val}</div>
                    </div>;
                  })}
                </div>
              </div>}
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:16, padding:24, textAlign:'center', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.03)' }}/>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:8 }}>Total Grid Earnings</div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:44, fontWeight:900, color:'#4ade80', lineHeight:1 }}>${total.toFixed(2)}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:8 }}>T{tier.t} {tier.name} — ${price}/position</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'linear-gradient(135deg,rgba(251,191,36,.06),rgba(180,131,9,.04))', borderRadius:12, padding:16, border:'1px solid rgba(251,191,36,.15)', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#b45309', textTransform:'uppercase', letterSpacing:.5 }}>Direct (40%)</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:800, color:'#b45309', marginTop:4 }}>${earnings.direct.toFixed(0)}</div>
                <div style={{ fontSize:10, color:'#b4530988', marginTop:2 }}>{Math.min(filled,personalCount)} × ${(price*directRate).toFixed(0)}</div>
              </div>
              <div style={{ background:'linear-gradient(135deg,rgba(16,185,129,.06),rgba(4,120,87,.04))', borderRadius:12, padding:16, border:'1px solid rgba(16,185,129,.15)', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#047857', textTransform:'uppercase', letterSpacing:.5 }}>Uni-Level (6.25%)</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:800, color:'#047857', marginTop:4 }}>${earnings.uni.toFixed(0)}</div>
                <div style={{ fontSize:10, color:'#04785788', marginTop:2 }}>{Math.max(0,filled-personalCount)} × ${(price*uniRate).toFixed(2)}</div>
              </div>
              <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5 }}>Bonus (5%)</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:800, color: complete ? '#6366f1' : '#cbd5e1', marginTop:4 }}>{complete ? '$'+earnings.bonus.toFixed(0) : '🔒'}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{complete ? 'Unlocked!' : 'Fills at 64/64'}</div>
              </div>
              <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5 }}>Positions</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:800, color:'#0f172a', marginTop:4 }}>{filled}/64</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{64-filled} remaining</div>
              </div>
            </div>

            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden', flex:1, minHeight:200 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', fontSize:12, fontWeight:700, color:'#475569' }}>Live Commission Feed</div>
              <div style={{ maxHeight:300, overflowY:'auto', padding:'6px 10px' }}>
                {feed.length === 0 && <div style={{ textAlign:'center', padding:24, fontSize:13, color:'#94a3b8' }}>Press Start to begin simulation</div>}
                {feed.map(function(entry, i) {
                  var isBonus = entry.type === 'bonus';
                  var isPersonal = entry.isPersonal;
                  return <div key={i} className="gc-feed-item" style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:8,
                    background: i === 0 ? (isBonus ? 'rgba(74,222,128,.06)' : isPersonal ? 'rgba(251,191,36,.05)' : 'rgba(16,185,129,.05)') : 'transparent', marginBottom:1 }}>
                    {isBonus ? (
                      <div style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,#4ade80,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0 }}>🎉</div>
                    ) : (
                      <div style={{ width:22, height:22, borderRadius:6, background: isPersonal ? GOLD_GRAD : GREEN_GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'#fff', flexShrink:0 }}>
                        {isPersonal ? '★' : '↓'}
                      </div>
                    )}
                    <div style={{ flex:1, fontSize:11, color:'#475569', lineHeight:1.3 }}>{entry.text}</div>
                    <div style={{ fontSize:12, fontWeight:800, color: isBonus ? '#4ade80' : isPersonal ? '#b45309' : '#047857', flexShrink:0 }}>${entry.amount.toFixed(2)}</div>
                  </div>;
                })}
              </div>
            </div>

            <div style={{ fontSize:10, color:'#94a3b8', textAlign:'center', lineHeight:1.5 }}>
              This is a simulator for illustration purposes only. Actual earnings depend on your referral activity and network growth. Income is not guaranteed.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
