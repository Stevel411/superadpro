import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';

var TIERS = [
  { t:1, name:'Starter', price:20, color:'#10b981', dark:'#064e3b', grad:'linear-gradient(135deg,#064e3b,#10b981)' },
  { t:2, name:'Builder', price:50, color:'#3b82f6', dark:'#1e3a5f', grad:'linear-gradient(135deg,#1e3a5f,#3b82f6)' },
  { t:3, name:'Pro', price:100, color:'#8b5cf6', dark:'#4c1d95', grad:'linear-gradient(135deg,#4c1d95,#8b5cf6)' },
  { t:4, name:'Advanced', price:200, color:'#ec4899', dark:'#831843', grad:'linear-gradient(135deg,#831843,#ec4899)' },
  { t:5, name:'Elite', price:400, color:'#14b8a6', dark:'#134e4a', grad:'linear-gradient(135deg,#134e4a,#14b8a6)' },
  { t:6, name:'Premium', price:600, color:'#f59e0b', dark:'#78350f', grad:'linear-gradient(135deg,#78350f,#f59e0b)' },
  { t:7, name:'Executive', price:800, color:'#6366f1', dark:'#312e81', grad:'linear-gradient(135deg,#312e81,#6366f1)' },
  { t:8, name:'Ultimate', price:1000, color:'#ef4444', dark:'#7f1d1d', grad:'linear-gradient(135deg,#7f1d1d,#ef4444)' },
];

var LEVEL_COLORS = ['#0ea5e9','#22c55e','#8b5cf6','#f59e0b','#ec4899','#14b8a6','#6366f1','#ef4444'];
var LEVEL_LABELS = ['L1','L2','L3','L4','L5','L6','L7','L8'];

// Generate random 3-letter names
var NAMES = [];
var consonants = 'BCDFGHJKLMNPRSTV';
var vowels = 'AEIOU';
for (var i = 0; i < 64; i++) {
  NAMES.push(consonants[Math.floor(Math.random()*consonants.length)] + vowels[Math.floor(Math.random()*vowels.length)] + consonants[Math.floor(Math.random()*consonants.length)]);
}

// Assign levels to positions (8 per level for 8×8)
function getLevel(idx) { return Math.floor(idx / 8); }

export default function GridCalculator() {
  var { t } = useTranslation();
  var [activeTier, setActiveTier] = useState(3);
  var [filled, setFilled] = useState(0);
  var [running, setRunning] = useState(false);
  var [speed, setSpeed] = useState(300);
  var [earnings, setEarnings] = useState({ direct: 0, uni: 0, bonus: 0 });
  var [feed, setFeed] = useState([]);
  var [latestIdx, setLatestIdx] = useState(-1);
  var timerRef = useRef(null);
  var filledRef = useRef(0);
  var earningsRef = useRef({ direct: 0, uni: 0, bonus: 0 });
  var feedRef = useRef([]);

  var tier = TIERS[activeTier - 1];
  var price = tier.price;
  var directRate = 0.40;
  var uniRate = 0.0625;
  var bonusTotal = price * 0.05 * 64;

  var startSim = useCallback(function() {
    if (running) return;
    // Reset if complete
    if (filledRef.current >= 64) {
      filledRef.current = 0;
      earningsRef.current = { direct: 0, uni: 0, bonus: 0 };
      feedRef.current = [];
      setFilled(0);
      setEarnings({ direct: 0, uni: 0, bonus: 0 });
      setFeed([]);
      setLatestIdx(-1);
    }
    setRunning(true);

    function tick() {
      var idx = filledRef.current;
      if (idx >= 64) {
        // Grid complete — add bonus
        var e = Object.assign({}, earningsRef.current);
        e.bonus = bonusTotal;
        earningsRef.current = e;
        setEarnings(e);
        feedRef.current = [{ type: 'bonus', amount: bonusTotal, text: 'Grid Complete! Bonus: $' + bonusTotal.toFixed(0) }].concat(feedRef.current).slice(0, 20);
        setFeed(feedRef.current.slice());
        setRunning(false);
        return;
      }

      var level = getLevel(idx);
      var isDirect = level === 0;
      var commAmount = isDirect ? price * directRate : price * uniRate;
      var commType = isDirect ? 'direct' : 'uni';
      var name = NAMES[idx];

      filledRef.current = idx + 1;
      setFilled(idx + 1);
      setLatestIdx(idx);

      var e = Object.assign({}, earningsRef.current);
      e[commType] += commAmount;
      earningsRef.current = e;
      setEarnings(Object.assign({}, e));

      var entry = {
        type: commType,
        name: name,
        level: level + 1,
        amount: commAmount,
        text: name + ' joined ' + LEVEL_LABELS[level] + ' — $' + commAmount.toFixed(2) + (isDirect ? ' direct' : ' uni-level')
      };
      feedRef.current = [entry].concat(feedRef.current).slice(0, 20);
      setFeed(feedRef.current.slice());

      timerRef.current = setTimeout(tick, speed);
    }

    tick();
  }, [running, speed, price, bonusTotal]);

  function resetSim() {
    clearTimeout(timerRef.current);
    setRunning(false);
    filledRef.current = 0;
    earningsRef.current = { direct: 0, uni: 0, bonus: 0 };
    feedRef.current = [];
    setFilled(0);
    setEarnings({ direct: 0, uni: 0, bonus: 0 });
    setFeed([]);
    setLatestIdx(-1);
  }

  var total = earnings.direct + earnings.uni + earnings.bonus;
  var pct = Math.round(filled / 64 * 100);
  var complete = filled >= 64;

  return (
    <AppLayout title="Profit Grid Calculator" subtitle="See how your 8×8 income grid fills and earns">
      <style>{`
        @keyframes popIn { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 8px rgba(74,222,128,.3)} 50%{box-shadow:0 0 20px rgba(74,222,128,.6)} }
        @keyframes slideIn { from{transform:translateX(-20px);opacity:0} to{transform:translateX(0);opacity:1} }
        .gc-seat{border-radius:8px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:all .2s;position:relative;font-family:'DM Sans',sans-serif}
        .gc-seat.empty{background:#f1f5f9;border:2px dashed #e2e8f0}
        .gc-seat.filled{border:2px solid;color:#fff;animation:popIn .3s ease}
        .gc-seat.latest{animation:popIn .3s ease, glowPulse 1s ease-in-out infinite}
        .gc-feed-item{animation:slideIn .3s ease}
        .gc-slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#172554,#1e3a8a);cursor:pointer;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.15)}
        .gc-slider::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#172554,#1e3a8a);cursor:pointer;border:2px solid #fff}
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Tier selector */}
        <div style={{ display:'flex', gap:6, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
          {TIERS.map(function(t) {
            var on = activeTier === t.t;
            return <button key={t.t} onClick={function() { if (!running) { setActiveTier(t.t); resetSim(); } }}
              style={{
                padding:'10px 16px', borderRadius:10, border: on ? 'none' : '1px solid #e2e8f0',
                background: on ? t.grad : '#fff', color: on ? '#fff' : '#64748b',
                fontSize:12, fontWeight:700, cursor: running ? 'default' : 'pointer',
                fontFamily:'inherit', whiteSpace:'nowrap', transition:'all .2s',
                opacity: running && !on ? 0.5 : 1,
              }}>
              T{t.t} {t.name} — ${t.price}
            </button>;
          })}
        </div>

        {/* Main layout */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>

          {/* LEFT — Grid + controls */}
          <div>
            {/* Controls bar */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, padding:'14px 18px', background:'#fff', borderRadius:14, border:'1px solid #e2e8f0' }}>
              <button onClick={startSim} disabled={running}
                style={{ padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:700, border:'none', cursor: running ? 'default' : 'pointer',
                  background: running ? '#94a3b8' : 'linear-gradient(135deg,#172554,#1e3a8a)', color:'#fff', fontFamily:'inherit',
                  opacity: running ? 0.6 : 1, transition:'all .2s', display:'flex', alignItems:'center', gap:6 }}>
                {filled === 0 ? '▶ Start Simulation' : running ? '⏳ Running...' : complete ? '▶ Replay' : '▶ Resume'}
              </button>
              {filled > 0 && !running && <button onClick={resetSim}
                style={{ padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:600, border:'1px solid #e2e8f0',
                  background:'#fff', color:'#64748b', cursor:'pointer', fontFamily:'inherit' }}>
                Reset
              </button>}
              <div style={{ flex:1 }}/>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8' }}>Speed:</span>
                <input type="range" className="gc-slider" min={50} max={800} value={800 - speed + 50}
                  onChange={function(e) { setSpeed(800 - parseInt(e.target.value) + 50); }}
                  style={{ width:80, height:4, borderRadius:2, appearance:'none', WebkitAppearance:'none', background:'linear-gradient(90deg,#172554 ' + ((800-speed)/750*100) + '%,#e2e8f0 ' + ((800-speed)/750*100) + '%)' }}/>
              </div>
            </div>

            {/* Grid card */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' }}>
              {/* Header */}
              <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, color:'#fff' }}>T{tier.t} {tier.name} — ${price}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginTop:2 }}>8×8 Income Grid · 64 positions</div>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,.7)' }}>{filled}/64 ({pct}%)</div>
              </div>

              {/* Progress bar */}
              <div style={{ height:6, background:'#f1f5f9' }}>
                <div style={{ height:'100%', width: pct + '%', background: complete ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,' + tier.dark + ',' + tier.color + ')', transition:'width .3s', borderRadius: pct >= 100 ? 0 : '0 3px 3px 0' }}/>
              </div>

              {/* 8×8 Grid */}
              <div style={{ padding:20 }}>
                {/* Level labels */}
                {Array.from({ length: 8 }).map(function(_, row) {
                  return <div key={row} style={{ display:'flex', gap:4, marginBottom: row < 7 ? 4 : 0, alignItems:'center' }}>
                    <div style={{ width:28, fontSize:9, fontWeight:800, color: LEVEL_COLORS[row], textAlign:'center', flexShrink:0 }}>{LEVEL_LABELS[row]}</div>
                    {Array.from({ length: 8 }).map(function(_, col) {
                      var idx = row * 8 + col;
                      var isFilled = idx < filled;
                      var isLatest = idx === latestIdx && running;
                      var levelColor = LEVEL_COLORS[row];
                      return <div key={col} className={'gc-seat ' + (isFilled ? 'filled' : 'empty') + (isLatest ? ' latest' : '')}
                        style={{
                          flex:1,
                          background: isFilled ? levelColor + '18' : '#f8fafc',
                          borderColor: isFilled ? levelColor : '#e2e8f0',
                          borderStyle: isFilled ? 'solid' : 'dashed',
                          boxShadow: isLatest ? '0 0 16px ' + levelColor + '60' : 'none',
                        }}>
                        {isFilled && <>
                          <div style={{ fontSize:9, fontWeight:800, color: levelColor, lineHeight:1 }}>{NAMES[idx]}</div>
                          <div style={{ fontSize:7, color: levelColor + '88', marginTop:1 }}>{row === 0 ? '40%' : '6.25%'}</div>
                        </>}
                      </div>;
                    })}
                  </div>;
                })}
              </div>

              {/* Completion banner */}
              {complete && <div style={{ margin:'0 20px 20px', padding:16, borderRadius:12,
                background:'linear-gradient(135deg,rgba(74,222,128,.08),rgba(14,165,233,.08))',
                border:'1px solid rgba(74,222,128,.15)', textAlign:'center' }}>
                <div style={{ fontSize:14, fontWeight:800, color:'#4ade80', marginBottom:8 }}>🎉 Grid Complete! Bonus Unlocked!</div>
                <div style={{ display:'flex', justifyContent:'center', gap:20 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#64748b' }}>DIRECT (40%)</div>
                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, color:'#f59e0b' }}>${earnings.direct.toFixed(0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#64748b' }}>UNI-LEVEL</div>
                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, color:'#6366f1' }}>${earnings.uni.toFixed(0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#64748b' }}>BONUS (5%)</div>
                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, color:'#10b981' }}>${earnings.bonus.toFixed(0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#64748b' }}>TOTAL</div>
                    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, color:'#4ade80' }}>${total.toFixed(0)}</div>
                  </div>
                </div>
              </div>}
            </div>
          </div>

          {/* RIGHT — Stats + Feed */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Total earnings hero */}
            <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:16, padding:24, textAlign:'center' }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:8 }}>Total Grid Earnings</div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:42, fontWeight:900, color:'#4ade80', lineHeight:1 }}>${total.toFixed(2)}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:8 }}>T{tier.t} {tier.name} — ${price}/position</div>
            </div>

            {/* Breakdown cards */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5 }}>Direct (40%)</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:'#f59e0b', marginTop:4 }}>${earnings.direct.toFixed(0)}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{Math.min(filled, 8)} × ${(price * directRate).toFixed(0)}</div>
              </div>
              <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5 }}>Uni-Level</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:'#6366f1', marginTop:4 }}>${earnings.uni.toFixed(0)}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{Math.max(0, filled - 8)} × ${(price * uniRate).toFixed(2)}</div>
              </div>
              <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5 }}>Bonus (5%)</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color: complete ? '#10b981' : '#cbd5e1', marginTop:4 }}>
                  {complete ? '$' + earnings.bonus.toFixed(0) : '🔒'}
                </div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{complete ? 'Unlocked!' : 'At 64/64'}</div>
              </div>
              <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #e2e8f0', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5 }}>Positions</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:'#0ea5e9', marginTop:4 }}>{filled}/64</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{64 - filled} remaining</div>
              </div>
            </div>

            {/* Commission feed */}
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden', flex:1, minHeight:200 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', fontSize:12, fontWeight:700, color:'#475569' }}>Live Commission Feed</div>
              <div style={{ maxHeight:280, overflowY:'auto', padding:'8px 12px' }}>
                {feed.length === 0 && <div style={{ textAlign:'center', padding:20, fontSize:13, color:'#94a3b8' }}>Press Start to begin simulation</div>}
                {feed.map(function(entry, i) {
                  var isBonus = entry.type === 'bonus';
                  return <div key={i} className="gc-feed-item" style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:8,
                    background: i === 0 ? (isBonus ? 'rgba(74,222,128,.06)' : 'rgba(14,165,233,.04)') : 'transparent', marginBottom:2 }}>
                    {isBonus ? (
                      <div style={{ width:24, height:24, borderRadius:6, background:'linear-gradient(135deg,#4ade80,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>🎉</div>
                    ) : (
                      <div style={{ width:24, height:24, borderRadius:6, background: LEVEL_COLORS[entry.level - 1] + '20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color: LEVEL_COLORS[entry.level - 1], flexShrink:0 }}>{LEVEL_LABELS[entry.level - 1]}</div>
                    )}
                    <div style={{ flex:1, fontSize:11, color:'#475569' }}>{entry.text}</div>
                    <div style={{ fontSize:12, fontWeight:800, color: isBonus ? '#4ade80' : entry.type === 'direct' ? '#f59e0b' : '#6366f1', flexShrink:0 }}>${entry.amount.toFixed(2)}</div>
                  </div>;
                })}
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ fontSize:10, color:'#94a3b8', textAlign:'center', lineHeight:1.5 }}>
              This is a simulator for illustration purposes only. Actual earnings depend on your referral activity and network growth. Income is not guaranteed.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
