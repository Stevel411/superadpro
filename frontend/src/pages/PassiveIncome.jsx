import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatMoney } from '../utils/money';

// ── Animated counter ──────────────────────────────────────
function CountUp({ target, prefix = '', suffix = '', duration = 1800, isMoney = false, decimals = 0 }) {
  var [val, setVal] = useState(0);
  var rafRef = useRef(null);
  useEffect(function() {
    if (!target) return;
    var start = Date.now();
    var step = function() {
      var elapsed = Date.now() - start;
      var progress = Math.min(elapsed / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      setVal(target * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);
  var display = isMoney ? formatMoney(val) : decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();
  return <>{prefix}{display}{suffix}</>;
}

// ── Grid progress ring ────────────────────────────────────
function Ring({ pct, color, size = 90 }) {
  var r = (size / 2) - 10;
  var circ = 2 * Math.PI * r;
  var offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.4s ease-out' }}/>
    </svg>
  );
}

// ── Horizontal progress bar ───────────────────────────────
function Bar({ pct, gradient, height = 8 }) {
  var [width, setWidth] = useState(0);
  useEffect(function() { setTimeout(function() { setWidth(pct); }, 200); }, [pct]);
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${width}%`, background: gradient, borderRadius: 99, transition: 'width 1.2s ease-out' }}/>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function PassiveIncome({ d }) {
  var gridStats = (d?.grid_stats && typeof d.grid_stats === 'object' && !Array.isArray(d.grid_stats)) ? d.grid_stats : {};
  var activeGrids = Array.isArray(gridStats.active_grids_detail) ? gridStats.active_grids_detail : [];
  var totalBonus = d?.bonus_earnings || 0;
  var gridEarnings = d?.grid_earnings || 0;
  var membershipEarned = d?.membership_earned || 0;
  var levelEarnings = d?.level_earnings || 0;
  var courseEarnings = d?.course_earnings || 0;
  var marketEarnings = d?.marketplace_earnings || 0;
  var totalEarned = d?.total_earned || 0;
  var totalTeam = d?.total_team || 0;
  var completions = gridStats.completed_advances || 0;
  var personalReferrals = d?.personal_referrals || 0;

  // Passive score (0-100)
  var passiveScore = Math.min(100, Math.round(
    (totalTeam > 0 ? Math.min(40, totalTeam * 1.2) : 0) +
    (completions > 0 ? Math.min(30, completions * 4) : 0) +
    (personalReferrals > 0 ? Math.min(20, personalReferrals * 2) : 0) +
    (totalEarned > 0 ? 10 : 0)
  ));

  var passiveLevel = passiveScore >= 80 ? { label: 'Diamond', color: '#38bdf8', emoji: '💎' }
    : passiveScore >= 60 ? { label: 'Gold', color: '#fbbf24', emoji: '🥇' }
    : passiveScore >= 40 ? { label: 'Silver', color: '#94a3b8', emoji: '🥈' }
    : passiveScore >= 20 ? { label: 'Bronze', color: '#f97316', emoji: '🥉' }
    : { label: 'Starter', color: '#6366f1', emoji: '🚀' };

  var streams = [
    { name: 'Grid Bonuses',  val: gridEarnings,     color: '#6366f1', grad: 'linear-gradient(90deg,#6366f1,#818cf8)', emoji: '⚡', tag: 'Completion bonuses' },
    { name: 'Memberships',   val: membershipEarned,  color: '#10b981', grad: 'linear-gradient(90deg,#10b981,#34d399)', emoji: '👥', tag: 'Renewal commissions' },
    { name: 'Uni-Level',     val: levelEarnings,     color: '#f59e0b', grad: 'linear-gradient(90deg,#f59e0b,#fbbf24)', emoji: '🔗', tag: '8-level network' },
    { name: 'Courses',       val: courseEarnings,    color: '#8b5cf6', grad: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', emoji: '🎓', tag: 'Pass-up royalties' },
    { name: 'SuperMarket',   val: marketEarnings,    color: '#0ea5e9', grad: 'linear-gradient(90deg,#0ea5e9,#38bdf8)', emoji: '🛒', tag: 'Digital products' },
  ];

  var maxStream = Math.max(1, ...streams.map(function(s) { return Number(s.val) || 0; }));

  // Activity from recent_activity
  var activity = Array.isArray(d?.recent_activity) ? d.recent_activity.slice(0, 5) : [];

  var S = {
    page: { position: 'relative', minHeight: 600 },

    // Stars
    starField: { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 16 },

    // Hero
    hero: {
      background: 'linear-gradient(135deg, #0c1a3a 0%, #1a1050 50%, #0c1a3a 100%)',
      borderRadius: 20, padding: '40px 36px 32px', marginBottom: 20,
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    },
    heroBadge: {
      display: 'inline-flex', alignItems: 'center', gap: 7,
      background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)',
      borderRadius: 99, padding: '5px 14px', marginBottom: 16,
      fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#a5b4fc',
    },
    heroTitle: {
      fontFamily: 'Sora,sans-serif', fontSize: 32, fontWeight: 900, color: '#fff',
      lineHeight: 1.1, marginBottom: 8,
    },
    heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 28, maxWidth: 420 },

    // Total
    totalRow: { display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
    totalAmount: {
      fontFamily: 'Sora,sans-serif', fontSize: 56, fontWeight: 900, lineHeight: 1,
      background: 'linear-gradient(135deg,#fbbf24,#fde68a,#f59e0b)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    },
    totalStats: { display: 'flex', gap: 24, flexWrap: 'wrap' },
    totalStat: { textAlign: 'center' },
    totalStatVal: { fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 900, color: '#fff' },
    totalStatLbl: { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },

    // Streams row
    streamsRow: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 },
    streamCard: {
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: '24px 18px', textAlign: 'center', transition: 'all .2s', cursor: 'default',
    },

    // Next completion
    nextCard: {
      background: 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(16,185,129,0.03))',
      border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20, padding: '24px 28px',
      marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
    },

    // Bottom grid
    bottomGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
    darkCard: {
      background: 'linear-gradient(135deg,#0f1729,#0c1a3a)',
      border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '32px',
    },

    // Activity
    activityCard: {
      background: 'linear-gradient(135deg,#0f1729,#0c1a3a)',
      border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '32px',
    },

    sectionTitle: { fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 },
    sectionSub: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24 },
  };

  // Find closest grid to completion
  var closestGrid = activeGrids.length > 0
    ? activeGrids.reduce(function(best, g) { return g.pct > (best?.pct||0) ? g : best; }, null)
    : null;

  var TIER_BONUSES = { 1:64, 2:160, 3:640, 4:1280, 5:3200, 6:4800, 7:6400, 8:10000 };

  return (
    <div style={S.page}>

      {/* ── Floating particles ── */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', borderRadius:16, overflow:'hidden' }}>
        {[...Array(12)].map(function(_,i) {
          return <div key={i} style={{
            position:'absolute', borderRadius:'50%',
            width:[4,6,3,8,5,3,6,4,5,3,7,4][i], height:[4,6,3,8,5,3,6,4,5,3,7,4][i],
            background:['#6366f1','#10b981','#fbbf24','#8b5cf6','#0ea5e9','#f59e0b',
                        '#6366f1','#10b981','#fbbf24','#8b5cf6','#0ea5e9','#f59e0b'][i],
            opacity:0.12, left:`${[5,15,28,42,55,68,78,88,20,50,70,38][i]}%`,
            top:`${[15,65,35,10,55,25,70,40,85,90,10,50][i]}%`,
            animation:`sapFloat ${3+i*0.5}s ease-in-out infinite`,
            animationDelay:`${i*0.35}s`,
          }}/>;
        })}
      </div>

      <style>{`
        @keyframes sapFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes sapPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.7}}
        @keyframes sapSlide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .sap-stream:hover{transform:translateY(-3px)!important;border-color:rgba(255,255,255,0.15)!important;background:rgba(255,255,255,0.06)!important;}
        .sap-activity:hover{background:rgba(255,255,255,0.03)!important;}
      `}</style>

      {/* ── Hero ── */}
      <div style={S.hero}>
        {/* Grid lines overlay */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)', backgroundSize:'50px 50px', borderRadius:20 }}/>

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={S.heroBadge}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', animation:'sapPulse 2s ease-in-out infinite' }}/>
            Recurring Income Engine
          </div>
          <div style={S.heroTitle}>
            Your Money Works<br/>
            <span style={{ background:'linear-gradient(135deg,#fbbf24,#fde68a,#f59e0b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              While You Sleep ✨
            </span>
          </div>
          <div style={S.heroSub}>Every commission, every grid completion, every renewal — tracked in real time.</div>

          <div style={S.totalRow}>
            <div>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:4 }}>Total Earned — All Time</div>
              <div style={S.totalAmount}>
                $<CountUp target={totalEarned} duration={2000} isMoney/>
              </div>
            </div>
            <div style={{ width:1, height:64, background:'rgba(255,255,255,0.08)', flexShrink:0 }}/>
            <div style={S.totalStats}>
              {[
                { val: totalTeam, lbl: 'Team Members' },
                { val: completions, lbl: 'Completions' },
                { val: personalReferrals, lbl: 'Direct Referrals' },
              ].map(function(s,i) {
                return (
                  <div key={i} style={S.totalStat}>
                    <div style={S.totalStatVal}>{s.prefix || ''}<CountUp target={s.val} duration={1600+i*200}/></div>
                    <div style={S.totalStatLbl}>{s.lbl}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Income Streams ── */}
      <div style={S.streamsRow}>
        {streams.map(function(s,i) {
          return (
            <div key={i} className="sap-stream" style={{ ...S.streamCard, animationDelay:`${i*0.1}s` }}>
              <div style={{ fontSize:42, marginBottom:12 }}>{s.emoji}</div>
              <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.35)', marginBottom:8 }}>{s.name}</div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:26, fontWeight:900, color:s.color, marginBottom:10 }}>
                $<CountUp target={s.val} duration={1600} isMoney/>
              </div>
              <Bar pct={maxStream > 0 ? (s.val/maxStream)*100 : 0} gradient={s.grad} height={8}/>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:8 }}>{s.tag}</div>
            </div>
          );
        })}
      </div>

      {/* ── Next Completion Banner ── */}
      {closestGrid ? (
        <div style={S.nextCard}>
          <div style={{ width:56, height:56, borderRadius:16, background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0, animation:'sapFloat 3s ease-in-out infinite' }}>⚡</div>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#fff', marginBottom:4 }}>
              Campaign {closestGrid.tier} — Next Completion Incoming
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginBottom:12 }}>
              {closestGrid.filled} of 64 positions filled — your team is {closestGrid.pct}% of the way there
            </div>
            <Bar pct={closestGrid.pct} gradient="linear-gradient(90deg,#10b981,#34d399,#6ee7b7)" height={10}/>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:5 }}>
              <span style={{ color:'#34d399', fontWeight:700 }}>{closestGrid.filled} filled</span>
              <span>64 needed</span>
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:36, fontWeight:900, color:'#34d399' }}>
              ${(TIER_BONUSES[closestGrid.tier] || 0).toLocaleString()}
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>Completion bonus</div>
          </div>
        </div>
      ) : null}

      {/* ── Bottom row ── */}
      <div style={S.bottomGrid}>

        {/* Passive Score */}
        <div style={S.darkCard}>
          <div style={S.sectionTitle}>Recurring Income Score</div>
          <div style={S.sectionSub}>How automated your earnings are</div>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <Ring pct={passiveScore} color={passiveLevel.color} size={150}/>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:38, fontWeight:900, color:'#fff', lineHeight:1 }}>{passiveScore}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:1, marginTop:4 }}>Score</div>
              </div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ fontSize:32 }}>{passiveLevel.emoji}</span>
                <div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:passiveLevel.color }}>{passiveLevel.label} Level</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:3 }}>{passiveScore}% of your income is recurring</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[
                  { name:'Grid completions', done: completions > 0, color:'#6366f1' },
                  { name:'Renewal commissions', done: membershipEarned > 0, color:'#10b981' },
                  { name:'Uni-level earnings', done: levelEarnings > 0, color:'#f59e0b' },
                  { name:'Course royalties', done: courseEarnings > 0, color:'#8b5cf6' },
                ].map(function(item,i) {
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:22, height:22, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', background: item.done ? item.color+'20' : 'rgba(255,255,255,0.05)', border:`1px solid ${item.done ? item.color+'50' : 'rgba(255,255,255,0.08)'}`, fontSize:12, color: item.done ? item.color : 'rgba(255,255,255,0.2)', fontWeight:800, flexShrink:0 }}>
                        {item.done ? '✓' : '·'}
                      </div>
                      <span style={{ fontSize:14, color: item.done ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)' }}>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div style={S.darkCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
            <div>
              <div style={S.sectionTitle}>Earnings Breakdown</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>Your actual earnings by income stream</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:48, fontWeight:900, color:'#10b981', lineHeight:1 }}>
                $<CountUp target={totalEarned} duration={1800} isMoney/>
              </div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:4 }}>total earned</div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {streams.map(function(s,i) {
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ fontSize:18 }}>{s.emoji}</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', width:100, flexShrink:0 }}>{s.name}</div>
                  <div style={{ flex:1 }}>
                    <Bar pct={maxStream > 0 ? (s.val/maxStream)*100 : 0} gradient={s.grad} height={10}/>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#fff', width:60, textAlign:'right', flexShrink:0 }}>
                    ${formatMoney(Number(s.val))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Activity Feed ── */}
      <div style={S.activityCard}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <div style={S.sectionTitle}>💸 Earnings While You Were Away</div>
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:16 }}>Commissions your network generated without you lifting a finger</div>

        {activity.length > 0 ? (
          <div>
            {activity.map(function(item, i) {
              var colors = { green:'#10b981', cyan:'#0ea5e9', purple:'#8b5cf6', amber:'#f59e0b' };
              var c = colors[item.color] || '#6366f1';
              return (
                <div key={i} className="sap-activity" style={{ display:'flex', alignItems:'center', gap:14, padding:'11px 8px', borderBottom: i < activity.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none', borderRadius:8, transition:'background .15s' }}>
                  <div style={{ width:46, height:46, borderRadius:13, background:`${c}18`, border:`1px solid ${c}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:600, color:'#fff', marginBottom:3 }}>{item.title}</div>
                    <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)' }}>{item.sub}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:c }}>+${formatMoney(item.amount || 0)}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:2 }}>
                      {item.date ? new Date(item.date).toLocaleDateString('en-GB', {day:'numeric',month:'short'}) : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:'32px 0', color:'rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>💤</div>
            <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>No recurring earnings yet</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>Build your team and activate a campaign tier to start earning on autopilot</div>
          </div>
        )}
      </div>

    </div>
  );
}
