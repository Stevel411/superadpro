import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Check } from 'lucide-react';
import { formatMoney } from '../utils/money';

var TIER_COLORS = {
  1: { strip:'#059669', badge:'#064E3B', tagBg:'#E1F5EE', tagText:'#085041', statBg:'#E1F5EE', statText:'#064E3B', statSub:'#0F6E56', btnBg:'linear-gradient(135deg,#064E3B,#059669)', btnShadow:'#032b20' },
  2: { strip:'#2563EB', badge:'#1E3A5F', tagBg:'#E6F1FB', tagText:'#0C447C', statBg:'#E6F1FB', statText:'#0C447C', statSub:'#185FA5', btnBg:'linear-gradient(135deg,#1E3A5F,#2563EB)', btnShadow:'#0f1d30' },
  3: { strip:'#0D9488', badge:'#134E4A', tagBg:'#E1F5EE', tagText:'#085041', statBg:'#E1F5EE', statText:'#085041', statSub:'#0F6E56', btnBg:'linear-gradient(135deg,#134E4A,#0D9488)', btnShadow:'#0a2725' },
  4: { strip:'#D97706', badge:'#78350F', tagBg:'#FAEEDA', tagText:'#633806', statBg:'#FAEEDA', statText:'#633806', statSub:'#854F0B', btnBg:'linear-gradient(135deg,#78350F,#D97706)', btnShadow:'#3c1a08' },
  5: { strip:'#7C3AED', badge:'#312E81', tagBg:'#EEEDFE', tagText:'#3C3489', statBg:'#EEEDFE', statText:'#3C3489', statSub:'#534AB7', btnBg:'linear-gradient(135deg,#312E81,#7C3AED)', btnShadow:'#1a1841' },
  6: { strip:'#EC4899', badge:'#831843', tagBg:'#FBEAF0', tagText:'#72243E', statBg:'#FBEAF0', statText:'#72243E', statSub:'#993556', btnBg:'linear-gradient(135deg,#831843,#EC4899)', btnShadow:'#420c22' },
  7: { strip:'#EA580C', badge:'#7C2D12', tagBg:'#FAECE7', tagText:'#712B13', statBg:'#FAECE7', statText:'#712B13', statSub:'#993C1D', btnBg:'linear-gradient(135deg,#7C2D12,#EA580C)', btnShadow:'#3e1609' },
  8: { strip:'#DC2626', badge:'#450A0A', tagBg:'#FCEBEB', tagText:'#791F1F', statBg:'#FCEBEB', statText:'#791F1F', statSub:'#A32D2D', btnBg:'linear-gradient(135deg,#450A0A,#DC2626)', btnShadow:'#230505' },
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

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#0c4a6e,#0369a1,#0284c7)', borderRadius:18, padding:'28px 32px', marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:8 }}>Campaign Grid System</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#fff', marginBottom:8 }}>Activate Tiers. Earn Commissions. Grow Your Grid.</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.7, maxWidth:580, marginBottom:16 }}>
            Each tier delivers real video views through Watch & Earn. You earn commissions as your grid fills with members.
          </div>
          <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'#fff' }}><span style={{ width:8, height:8, borderRadius:'50%', background:'#38bdf8' }}/> 40% direct commission</span>
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'#fff' }}><span style={{ width:8, height:8, borderRadius:'50%', background:'#a78bfa' }}/> 6.25% per grid member</span>
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'#fff' }}><span style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80' }}/> Up to $3,200 completion bonus</span>
          </div>
        </div>
      </div>

      {/* Tier cards — 2x2 layout */}
      {[0, 2, 4, 6].map(function(start) {
        var pair = tiers.slice(start, start + 2);
        if (pair.length === 0) return null;
        return (
          <div key={start} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {pair.map(function(t) {
              var c = TIER_COLORS[t.tier] || TIER_COLORS[1];
              var active = t.is_active;
              var grid = t.grid;
              var feats = FEATURES_BY_TIER[t.tier] || [];
              var isPopular = t.tier === 3;
              var isMax = t.tier === 8;

              return (
                <div key={t.tier} style={{ borderRadius:14, overflow:'hidden', border:'1px solid #e8ecf2', background:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,.06)', display:'flex', flexDirection:'column', position:'relative' }}>

                  {/* Colour strip */}
                  <div style={{ height:5, background:c.strip }}/>

                  {/* Body */}
                  <div style={{ padding:'18px 22px', flex:1, display:'flex', flexDirection:'column', gap:12 }}>

                    {/* Row 1: Badge + Name + Price */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase', padding:'3px 10px', borderRadius:14, background:c.strip, color:'#fff' }}>T{t.tier}</span>
                        <span style={{ fontSize:20, fontWeight:800, color:'#0f172a' }}>{t.name}</span>
                        {isPopular && <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:8, background:c.tagBg, color:c.tagText }}>Popular</span>}
                        {isMax && <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:8, background:c.tagBg, color:c.tagText }}>Max earnings</span>}
                      </div>
                      <div>
                        <span style={{ fontSize:32, fontWeight:800, color:'#0f172a' }}>${t.price.toLocaleString()}</span>
                        <span style={{ fontSize:12, color:'#94a3b8', marginLeft:4 }}>one-time</span>
                      </div>
                    </div>

                    {/* Active badge */}
                    {active && (
                      <div style={{ display:'inline-flex', alignItems:'center', gap:4, alignSelf:'flex-start', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:8, background:c.tagBg, color:c.tagText }}>
                        <Check size={11}/> Active
                      </div>
                    )}

                    {/* Grid progress (if active) */}
                    {active && grid && (
                      <div>
                        <div style={{ height:5, background:'#f1f5f9', borderRadius:3, marginBottom:4 }}>
                          <div style={{ height:'100%', width:grid.pct+'%', background:c.strip, borderRadius:3, transition:'width .5s' }}/>
                        </div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{grid.filled}/64 members · Grid #{grid.advance}</div>
                      </div>
                    )}

                    {/* Feature tags */}
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:8, background:c.tagBg, color:c.tagText }}>{t.views_target.toLocaleString()} views</span>
                      {feats.map(function(f) {
                        return <span key={f} style={{ fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:8, background:c.tagBg, color:c.tagText }}>{f}</span>;
                      })}
                    </div>

                    {/* Earnings stats */}
                    <div style={{ display:'flex', gap:6 }}>
                      <div style={{ flex:1, textAlign:'center', padding:'10px 6px', borderRadius:10, background:c.statBg }}>
                        <div style={{ fontSize:18, fontWeight:800, color:c.statText }}>${formatMoney(t.direct_commission)}</div>
                        <div style={{ fontSize:10, fontWeight:600, color:c.statSub, marginTop:2 }}>Direct earn</div>
                      </div>
                      <div style={{ flex:1, textAlign:'center', padding:'10px 6px', borderRadius:10, background:c.statBg }}>
                        <div style={{ fontSize:18, fontWeight:800, color:c.statText }}>${formatMoney(t.uni_level_per_member)}</div>
                        <div style={{ fontSize:10, fontWeight:600, color:c.statSub, marginTop:2 }}>Per member</div>
                      </div>
                      <div style={{ flex:1, textAlign:'center', padding:'10px 6px', borderRadius:10, background:c.statBg }}>
                        <div style={{ fontSize:18, fontWeight:800, color:c.statText }}>${t.completion_bonus.toLocaleString()}</div>
                        <div style={{ fontSize:10, fontWeight:600, color:c.statSub, marginTop:2 }}>Grid bonus</div>
                      </div>
                    </div>

                    {/* Activate button */}
                    {!active ? (
                      <Link to={'/activate/' + t.tier} style={{
                        display:'block', textAlign:'center', padding:'14px', borderRadius:12, textDecoration:'none',
                        background:c.btnBg, boxShadow:'0 5px 0 ' + c.btnShadow + ', 0 6px 8px rgba(0,0,0,.15)',
                        marginTop:'auto',
                      }}>
                        <span style={{ color:'#ffffff', fontWeight:700, fontSize:15 }}>Activate {t.name}</span>
                      </Link>
                    ) : (
                      <div style={{
                        textAlign:'center', padding:'14px', borderRadius:12,
                        background:c.tagBg, border:'1px solid ' + c.strip + '33',
                        marginTop:'auto',
                      }}>
                        <span style={{ color:c.statSub, fontWeight:700, fontSize:14 }}>Active</span>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Earnings Calculator */}
      <div style={{ background:'#fff', border:'1px solid #e8ecf2', borderRadius:16, padding:'24px 28px', marginBottom:16, boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:800, color:'#0f172a', textAlign:'center', marginBottom:4 }}>Earnings calculator</div>
        <div style={{ fontSize:13, color:'#64748b', textAlign:'center', marginBottom:16 }}>How much could you earn when your grid fills with 64 members?</div>

        {/* Custom dropdown */}
        <div style={{ maxWidth:440, margin:'0 auto', position:'relative' }}>
          <div onClick={function() { setCalcOpen(!calcOpen); }}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:12, border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', transition:'border-color .15s' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase', padding:'3px 10px', borderRadius:14, background:(TIER_COLORS[calcTier] || TIER_COLORS[1]).strip, color:'#fff' }}>T{calcTier}</span>
              <span style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>
                {(tiers.find(function(t) { return t.tier === calcTier; }) || {}).name || 'Pro'}
              </span>
              <span style={{ fontSize:13, color:'#64748b' }}>
                ${((tiers.find(function(t) { return t.tier === calcTier; }) || {}).price || 100).toLocaleString()}
              </span>
            </div>
            <span style={{ fontSize:12, color:'#94a3b8', transition:'transform .2s', transform: calcOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
          </div>

          {calcOpen && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:20, overflow:'hidden', maxHeight:320, overflowY:'auto' }}>
              {tiers.map(function(t) {
                var c = TIER_COLORS[t.tier] || TIER_COLORS[1];
                var selected = t.tier === calcTier;
                return (
                  <div key={t.tier} onClick={function() { setCalcTier(t.tier); setCalcOpen(false); }}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', cursor:'pointer', background: selected ? c.tagBg : 'transparent', borderLeft: selected ? '3px solid ' + c.strip : '3px solid transparent', transition:'background .1s' }}
                    onMouseEnter={function(e) { if (!selected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={function(e) { if (!selected) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:1, textTransform:'uppercase', padding:'2px 8px', borderRadius:12, background:c.strip, color:'#fff', flexShrink:0 }}>T{t.tier}</span>
                    <span style={{ fontSize:14, fontWeight: selected ? 700 : 500, color: selected ? c.statText : '#0f172a', flex:1 }}>{t.name}</span>
                    <span style={{ fontSize:13, fontWeight:600, color: selected ? c.statText : '#64748b' }}>${t.price.toLocaleString()}</span>
                    {selected && <Check size={14} color={c.strip}/>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ fontFamily:'Sora,sans-serif', fontSize:36, fontWeight:800, color:'#0ea5e9', textAlign:'center', marginTop:16 }}>${calc.total.toLocaleString()}</div>
        <div style={{ fontSize:13, color:'#94a3b8', textAlign:'center', marginTop:4 }}>
          ${calc.direct} direct + ${calc.perMem.toFixed(2)} x 64 members + ${calc.bonus.toLocaleString()} bonus
        </div>
      </div>

      <div style={{ textAlign:'center', fontSize:12, color:'#94a3b8' }}>
        All one-time USDT payments. 64 members per grid. 40% direct + 6.25% per member + completion bonus.
      </div>

    </AppLayout>
  );
}
