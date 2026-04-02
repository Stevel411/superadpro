import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Check, ChevronDown } from 'lucide-react';
import { formatMoney } from '../utils/money';

/* ─────────────────────────────────────────────
   DARK GLASS DESIGN — Campaign Tiers
   Dark navy bg, frosted glass cards, coloured
   SVG icons, 3D gradient buttons, 2×2 grid
   ───────────────────────────────────────────── */

var TIER_META = {
  1: {
    accent: '#10b981', accentRgb: '16,185,129',
    icon: function(sz) {
      return (<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>);
    },
  },
  2: {
    accent: '#3b82f6', accentRgb: '59,130,246',
    icon: function(sz) {
      return (<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>);
    },
  },
  3: {
    accent: '#8b5cf6', accentRgb: '139,92,246',
    icon: function(sz) {
      return (<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>);
    },
  },
  4: {
    accent: '#f59e0b', accentRgb: '245,158,11',
    icon: function(sz) {
      return (<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
    },
  },
  5: {
    accent: '#ec4899', accentRgb: '236,72,153',
    icon: function(sz) {
      return (<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>);
    },
  },
  6: {
    accent: '#06b6d4', accentRgb: '6,182,212',
    icon: function(sz) {
      return (<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>);
    },
  },
  7: {
    accent: '#f97316', accentRgb: '249,115,22',
    icon: function(sz) {
      return (<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>);
    },
  },
  8: {
    accent: '#ef4444', accentRgb: '239,68,68',
    icon: function(sz) {
      return (<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/><path d="M5 16H19L20 19H4L5 16z"/></svg>);
    },
  },
};

var FEATURES_BY_TIER = {
  1: ['1 campaign'],
  2: ['3 campaigns'],
  3: ['5 campaigns', 'Extended reach'],
  4: ['10 campaigns', 'Targeting'],
  5: ['20 campaigns', 'Priority queue'],
  6: ['30 campaigns', 'Featured'],
  7: ['50 campaigns', 'Spotlight'],
  8: ['Unlimited', 'All features'],
};

var BONUSES = { 1:64, 2:160, 3:320, 4:640, 5:1280, 6:1920, 7:2560, 8:3200 };

export default function CampaignTiers() {
  var [tiers, setTiers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [calcTier, setCalcTier] = useState(3);
  var [calcOpen, setCalcOpen] = useState(false);
  var [hoveredCard, setHoveredCard] = useState(null);

  useEffect(function() {
    apiGet('/api/campaign-tiers').then(function(d) {
      setTiers(d.tiers || []);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  /* Close calc dropdown on outside click */
  useEffect(function() {
    if (!calcOpen) return;
    function close(e) {
      if (!e.target.closest('.calc-dropdown')) setCalcOpen(false);
    }
    document.addEventListener('click', close);
    return function() { document.removeEventListener('click', close); };
  }, [calcOpen]);

  if (loading) return (
    <AppLayout title="Campaign Tiers" bgStyle={{ background: '#0c1222' }}>
      <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
        <div style={{ width:40, height:40, border:'3px solid rgba(255,255,255,0.1)', borderTopColor:'#0ea5e9', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
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
    <AppLayout title="Campaign Tiers" subtitle="Activate tiers to advertise your videos and earn grid commissions"
      bgStyle={{ background: '#0c1222' }}>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes glowPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .tier-card { transition: border-color .25s, box-shadow .25s; }
        .tier-card:hover { border-color: rgba(255,255,255,0.12) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important; }
        .activate-btn { transition: transform .15s, box-shadow .15s !important; }
        .activate-btn:hover { transform: translateY(-2px) !important; }
        .activate-btn:active { transform: translateY(1px) !important; }
        .calc-option { transition: background .1s; }
        .calc-option:hover { background: rgba(255,255,255,0.04) !important; }
        @media(max-width:767px) {
          .tiers-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Hero ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding:'28px 32px', marginBottom:20,
        position:'relative', overflow:'hidden',
        backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      }}>
        {/* Glow orb */}
        <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)', pointerEvents:'none', animation:'glowPulse 4s ease-in-out infinite' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:8 }}>Campaign Grid System</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#fff', marginBottom:8 }}>Activate Tiers. Earn Commissions. Grow Your Grid.</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)', lineHeight:1.7, maxWidth:580, marginBottom:16 }}>
            Each tier delivers real video views through Watch & Earn. You earn commissions as your grid fills with members.
          </div>
          <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>
            {[
              { dot:'#38bdf8', text:'40% direct commission' },
              { dot:'#a78bfa', text:'6.25% per grid member' },
              { dot:'#4ade80', text:'Up to $3,200 completion bonus' },
            ].map(function(item) {
              return (
                <span key={item.text} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.8)' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:item.dot, boxShadow:'0 0 6px ' + item.dot + '66' }}/>
                  {item.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tier Cards — 2×2 grid ── */}
      {[0, 2, 4, 6].map(function(start) {
        var pair = tiers.slice(start, start + 2);
        if (pair.length === 0) return null;
        return (
          <div key={start} className="tiers-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {pair.map(function(t) {
              var m = TIER_META[t.tier] || TIER_META[1];
              var active = t.is_active;
              var grid = t.grid;
              var feats = FEATURES_BY_TIER[t.tier] || [];
              var isPopular = t.tier === 3;
              var isMax = t.tier === 8;

              return (
                <div key={t.tier} className="tier-card" style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  display: 'flex', flexDirection: 'column',
                  position: 'relative', overflow: 'hidden',
                }}>

                  {/* Top accent glow line */}
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg, transparent, rgba(' + m.accentRgb + ',0.4), transparent)' }}/>

                  {/* Card body */}
                  <div style={{ padding:'20px 22px', flex:1, display:'flex', flexDirection:'column', gap:14 }}>

                    {/* Icon + Name + Price row */}
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:40, height:40, borderRadius:10,
                        background:'rgba(' + m.accentRgb + ',0.1)',
                        border:'1px solid rgba(' + m.accentRgb + ',0.2)',
                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                      }}>
                        {m.icon(20)}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#fff' }}>{t.name}</span>
                          {isPopular && <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'rgba(' + m.accentRgb + ',0.15)', color:m.accent, letterSpacing:0.5 }}>POPULAR</span>}
                          {isMax && <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'rgba(' + m.accentRgb + ',0.15)', color:m.accent, letterSpacing:0.5 }}>MAX</span>}
                        </div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600 }}>Tier {t.tier}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <span style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:'#fff' }}>${t.price.toLocaleString()}</span>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', fontWeight:600 }}>one-time USDT</div>
                      </div>
                    </div>

                    {/* Active badge */}
                    {active && (
                      <div style={{
                        display:'inline-flex', alignItems:'center', gap:5, alignSelf:'flex-start',
                        fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:8,
                        background:'rgba(' + m.accentRgb + ',0.12)',
                        border:'1px solid rgba(' + m.accentRgb + ',0.2)',
                        color:m.accent,
                      }}>
                        <Check size={12}/> Active
                      </div>
                    )}

                    {/* Grid progress */}
                    {active && grid && (
                      <div>
                        <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:3, marginBottom:5 }}>
                          <div style={{ height:'100%', width:grid.pct+'%', background:'linear-gradient(90deg, ' + m.accent + ', ' + m.accent + 'cc)', borderRadius:3, transition:'width .5s', boxShadow:'0 0 8px rgba(' + m.accentRgb + ',0.3)' }}/>
                        </div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{grid.filled}/64 members · Grid #{grid.advance}</div>
                      </div>
                    )}

                    {/* Feature tags */}
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <span style={{
                        fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:7,
                        background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)',
                        border:'1px solid rgba(255,255,255,0.06)',
                      }}>{t.views_target.toLocaleString()} views</span>
                      {feats.map(function(f) {
                        return (
                          <span key={f} style={{
                            fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:7,
                            background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)',
                            border:'1px solid rgba(255,255,255,0.06)',
                          }}>{f}</span>
                        );
                      })}
                    </div>

                    {/* Earnings stats — 3 columns with coloured values */}
                    <div style={{ display:'flex', gap:6 }}>
                      {[
                        { val:'$' + formatMoney(t.direct_commission), sub:'Direct earn' },
                        { val:'$' + formatMoney(t.uni_level_per_member), sub:'Per member' },
                        { val:'$' + t.completion_bonus.toLocaleString(), sub:'Grid bonus' },
                      ].map(function(s) {
                        return (
                          <div key={s.sub} style={{
                            flex:1, textAlign:'center', padding:'10px 4px', borderRadius:10,
                            background:'rgba(255,255,255,0.03)',
                            border:'1px solid rgba(255,255,255,0.05)',
                          }}>
                            <div style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:800, color:m.accent }}>{s.val}</div>
                            <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.35)', marginTop:2 }}>{s.sub}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Activate / Active button */}
                    {!active ? (
                      <Link to={'/activate/' + t.tier} className="activate-btn" style={{
                        display:'block', textAlign:'center', padding:'14px', borderRadius:12, textDecoration:'none',
                        background:'linear-gradient(135deg, rgba(' + m.accentRgb + ',0.8), rgba(' + m.accentRgb + ',0.5))',
                        boxShadow:'0 4px 0 rgba(' + m.accentRgb + ',0.3), 0 6px 16px rgba(0,0,0,.25)',
                        marginTop:'auto',
                        border:'1px solid rgba(' + m.accentRgb + ',0.3)',
                      }}>
                        <span style={{ color:'#fff', fontWeight:700, fontSize:15, textShadow:'0 1px 2px rgba(0,0,0,.3)' }}>Activate {t.name}</span>
                      </Link>
                    ) : (
                      <div style={{
                        textAlign:'center', padding:'14px', borderRadius:12,
                        background:'rgba(' + m.accentRgb + ',0.08)',
                        border:'1px solid rgba(' + m.accentRgb + ',0.15)',
                        marginTop:'auto',
                      }}>
                        <span style={{ color:m.accent, fontWeight:700, fontSize:14, opacity:0.8 }}>Active</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── Earnings Calculator ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding:'24px 28px', marginBottom:16,
        backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:800, color:'#fff', textAlign:'center', marginBottom:4 }}>Earnings Calculator</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', textAlign:'center', marginBottom:16 }}>How much could you earn when your grid fills with 64 members?</div>

        {/* Custom dropdown */}
        <div className="calc-dropdown" style={{ maxWidth:440, margin:'0 auto', position:'relative' }}>
          <div onClick={function(e) { e.stopPropagation(); setCalcOpen(!calcOpen); }}
            style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'12px 16px', borderRadius:12,
              background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.08)',
              cursor:'pointer',
            }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(' + (TIER_META[calcTier] || TIER_META[1]).accentRgb + ',0.12)',
                border:'1px solid rgba(' + (TIER_META[calcTier] || TIER_META[1]).accentRgb + ',0.2)',
              }}>
                {(TIER_META[calcTier] || TIER_META[1]).icon(16)}
              </div>
              <span style={{ fontSize:15, fontWeight:700, color:'#fff' }}>
                {(tiers.find(function(t) { return t.tier === calcTier; }) || {}).name || 'Pro'}
              </span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>
                ${((tiers.find(function(t) { return t.tier === calcTier; }) || {}).price || 100).toLocaleString()}
              </span>
            </div>
            <ChevronDown size={16} color="rgba(255,255,255,0.4)" style={{ transition:'transform .2s', transform: calcOpen ? 'rotate(180deg)' : 'rotate(0)' }}/>
          </div>

          {calcOpen && (
            <div style={{
              position:'absolute', top:'100%', left:0, right:0, marginTop:4,
              background:'#151d2e',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,.5)',
              zIndex:20, overflow:'hidden', maxHeight:360, overflowY:'auto',
            }}>
              {tiers.map(function(t) {
                var tm = TIER_META[t.tier] || TIER_META[1];
                var selected = t.tier === calcTier;
                return (
                  <div key={t.tier} className={selected ? '' : 'calc-option'}
                    onClick={function() { setCalcTier(t.tier); setCalcOpen(false); }}
                    style={{
                      display:'flex', alignItems:'center', gap:10, padding:'10px 16px',
                      cursor:'pointer',
                      background: selected ? 'rgba(' + tm.accentRgb + ',0.1)' : 'transparent',
                      borderLeft: selected ? '3px solid ' + tm.accent : '3px solid transparent',
                    }}>
                    <div style={{
                      width:28, height:28, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center',
                      background:'rgba(' + tm.accentRgb + ',0.1)', flexShrink:0,
                    }}>
                      {tm.icon(14)}
                    </div>
                    <span style={{ fontSize:14, fontWeight: selected ? 700 : 500, color: selected ? tm.accent : 'rgba(255,255,255,0.7)', flex:1 }}>{t.name}</span>
                    <span style={{ fontSize:13, fontWeight:600, color: selected ? tm.accent : 'rgba(255,255,255,0.35)' }}>${t.price.toLocaleString()}</span>
                    {selected && <Check size={14} color={tm.accent}/>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Total earnings display */}
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:40, fontWeight:800, textAlign:'center', marginTop:20, background:'linear-gradient(135deg, #0ea5e9, #8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          ${calc.total.toLocaleString()}
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', textAlign:'center', marginTop:4, marginBottom:4 }}>
          ${calc.direct} direct + ${calc.perMem.toFixed(2)} × 64 members + ${calc.bonus.toLocaleString()} bonus
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.25)', paddingBottom:8 }}>
        All one-time USDT payments. 64 members per grid. 40% direct + 6.25% per member + completion bonus.
      </div>

    </AppLayout>
  );
}
