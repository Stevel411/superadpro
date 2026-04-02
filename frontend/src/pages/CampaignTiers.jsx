import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Check, X } from 'lucide-react';
import { formatMoney } from '../utils/money';

/* ─────────────────────────────────────────────
   Campaign Tiers — Click-to-expand detail panel
   Compact 4-col cards → inline expand with full
   earnings breakdown + activate CTA
   ───────────────────────────────────────────── */

var TIER_ACCENTS = {
  1: { color:'#10b981', dark:'#059669', bg:'#f0fdf4', border:'#bbf7d0', grad:'linear-gradient(135deg,#059669,#10b981)' },
  2: { color:'#3b82f6', dark:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', grad:'linear-gradient(135deg,#2563eb,#3b82f6)' },
  3: { color:'#8b5cf6', dark:'#7c3aed', bg:'#ede9fe', border:'#c4b5fd', grad:'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
  4: { color:'#f59e0b', dark:'#d97706', bg:'#fef3c7', border:'#fde68a', grad:'linear-gradient(135deg,#d97706,#f59e0b)' },
  5: { color:'#ec4899', dark:'#db2777', bg:'#fce7f3', border:'#f9a8d4', grad:'linear-gradient(135deg,#db2777,#ec4899)' },
  6: { color:'#06b6d4', dark:'#0891b2', bg:'#ecfeff', border:'#a5f3fc', grad:'linear-gradient(135deg,#0891b2,#06b6d4)' },
  7: { color:'#f97316', dark:'#ea580c', bg:'#fff7ed', border:'#fed7aa', grad:'linear-gradient(135deg,#ea580c,#f97316)' },
  8: { color:'#ef4444', dark:'#dc2626', bg:'#fef2f2', border:'#fecaca', grad:'linear-gradient(135deg,#dc2626,#ef4444)' },
};

var FEATURES_BY_TIER = {
  1: ['1 campaign', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  2: ['3 campaigns', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  3: ['5 campaigns', 'Extended reach', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  4: ['10 campaigns', 'Targeting', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  5: ['20 campaigns', 'Priority queue', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  6: ['30 campaigns', 'Featured placement', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  7: ['50 campaigns', 'Spotlight', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
  8: ['Unlimited campaigns', 'All features', '8×8 grid (64 members)', '40% direct commission', '6.25% per grid member'],
};

var BONUSES = { 1:64, 2:160, 3:320, 4:640, 5:1280, 6:1920, 7:2560, 8:3200 };

export default function CampaignTiers() {
  var [tiers, setTiers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [selected, setSelected] = useState(null);

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

  function calcTotal(tierNum, price) {
    var direct = price * 0.4;
    var perMem = price * 0.0625;
    var bonus = BONUSES[tierNum] || 0;
    return Math.round(direct + (perMem * 64) + bonus);
  }

  function toggleTier(tierNum) {
    setSelected(selected === tierNum ? null : tierNum);
  }

  /* Work out which row (0-based) the selected tier sits in so we can insert the panel after that row */
  var selectedRow = selected !== null ? Math.floor((selected - 1) / 4) : -1;

  /* Build rows of 4 */
  var rows = [];
  for (var i = 0; i < tiers.length; i += 4) {
    rows.push(tiers.slice(i, i + 4));
  }

  return (
    <AppLayout title="Campaign Tiers" subtitle="Activate tiers to advertise your videos and earn grid commissions">

      <style>{[
        '@keyframes spin{to{transform:rotate(360deg)}}',
        '@keyframes expandIn{from{opacity:0;max-height:0;margin-top:0}to{opacity:1;max-height:600px;margin-top:12px}}',
        '.ct-card{transition:transform .15s,box-shadow .15s,border-color .15s;cursor:pointer}',
        '.ct-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)!important}',
        '.ct-btn{transition:transform .1s!important}',
        '.ct-btn:hover{transform:translateY(-1px)!important}',
        '.ct-btn:active{transform:translateY(1px)!important}',
        '.ct-expand{animation:expandIn .25s ease-out forwards;overflow:hidden}',
        '@media(max-width:767px){',
        '  .ct-grid{grid-template-columns:1fr 1fr!important}',
        '  .ct-detail-stats{grid-template-columns:1fr 1fr!important}',
        '}',
        '@media(max-width:480px){',
        '  .ct-grid{grid-template-columns:1fr!important}',
        '}',
      ].join('\n')}</style>

      {/* ── Header ── */}
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'#94a3b8', marginBottom:6 }}>Campaign Grid System</div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:8 }}>
          Activate Tiers. Earn Commissions. Grow Your Grid.
        </div>
        <div style={{ fontSize:13, color:'#64748b', lineHeight:1.7, maxWidth:520, margin:'0 auto' }}>
          Each tier delivers real video views through Watch & Earn. You earn commissions as your grid fills with 64 members. Select a tier to see full details.
        </div>
      </div>

      {/* ── Tier Cards + Expand Panels ── */}
      {rows.map(function(row, rowIdx) {
        return (
          <div key={rowIdx}>
            {/* Card row */}
            <div className="ct-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom: (selectedRow === rowIdx) ? 0 : 12 }}>
              {row.map(function(t) {
                var a = TIER_ACCENTS[t.tier] || TIER_ACCENTS[1];
                var active = t.is_active;
                var isSel = selected === t.tier;
                var isPopular = t.tier === 3;
                var isMax = t.tier === 8;

                return (
                  <div key={t.tier} className="ct-card" onClick={function() { toggleTier(t.tier); }}
                    style={{
                      background:'#fff',
                      border: isSel ? '2px solid ' + a.border : '1px solid #e2e8f0',
                      borderRadius:12, padding:18,
                      display:'flex', flexDirection:'column', gap:10,
                      borderTop:'3px solid ' + a.color, position:'relative',
                      boxShadow: isSel ? '0 4px 16px rgba(0,0,0,.08)' : '0 1px 3px rgba(0,0,0,.04)',
                      textAlign:'center',
                    }}>

                    {isSel && <span style={{ position:'absolute', top:-9, left:'50%', transform:'translateX(-50%)', fontSize:9, fontWeight:700, padding:'2px 10px', borderRadius:4, background:a.color, color:'#fff' }}>Selected</span>}
                    {!isSel && isPopular && <span style={{ position:'absolute', top:8, right:8, fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:4, background:a.bg, color:a.dark }}>Popular</span>}
                    {!isSel && isMax && <span style={{ position:'absolute', top:8, right:8, fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:4, background:a.bg, color:a.dark }}>Max</span>}

                    <div style={{ fontSize:15, fontWeight:800, color:'#0f172a' }}>{t.name}</div>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#0f172a' }}>${t.price.toLocaleString()}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{t.views_target.toLocaleString()} views</div>

                    {active ? (
                      <div style={{ padding:8, borderRadius:8, background:a.bg, border:'1px solid ' + a.border, marginTop:'auto' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, color:a.dark, fontSize:12, fontWeight:700 }}>
                          <Check size={12}/> Active
                        </span>
                      </div>
                    ) : (
                      <div style={{ padding:8, borderRadius:8, background: isSel ? a.bg : '#f8fafc', border:'1px solid ' + (isSel ? a.border : '#e2e8f0'), color: isSel ? a.dark : '#94a3b8', fontSize:12, fontWeight: isSel ? 700 : 600, marginTop:'auto' }}>
                        {isSel ? 'Viewing' : 'View details'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Expanded detail panel — appears after the row containing the selected tier */}
            {selectedRow === rowIdx && (function() {
              var t = tiers.find(function(x) { return x.tier === selected; });
              if (!t) return null;
              var a = TIER_ACCENTS[t.tier] || TIER_ACCENTS[1];
              var feats = FEATURES_BY_TIER[t.tier] || [];
              var total = calcTotal(t.tier, t.price);

              return (
                <div key={'detail-' + t.tier} className="ct-expand" style={{
                  background:'#fff', border:'2px solid ' + a.border, borderRadius:16,
                  padding:'28px 32px', marginTop:12, marginBottom:12,
                  boxShadow:'0 8px 32px rgba(0,0,0,.06)',
                }}>

                  {/* Header row */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                        <span style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#0f172a' }}>{t.name}</span>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:6, background:a.bg, color:a.dark }}>Tier {t.tier}</span>
                        {t.tier === 3 && <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:6, background:a.bg, color:a.dark }}>Popular</span>}
                        {t.tier === 8 && <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:6, background:a.bg, color:a.dark }}>Max earnings</span>}
                      </div>
                      <div style={{ fontSize:13, color:'#64748b' }}>
                        {t.views_target.toLocaleString()} video views across your campaigns
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'Sora,sans-serif', fontSize:32, fontWeight:800, color:'#0f172a' }}>${t.price.toLocaleString()}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>one-time USDT</div>
                      </div>
                      <div onClick={function(e) { e.stopPropagation(); setSelected(null); }}
                        style={{ width:28, height:28, borderRadius:8, border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, marginTop:4 }}>
                        <X size={14} color="#94a3b8"/>
                      </div>
                    </div>
                  </div>

                  {/* Earnings stats */}
                  <div className="ct-detail-stats" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                    <div style={{ textAlign:'center', padding:'14px 8px', borderRadius:10, background:'#f8fafc', border:'1px solid #f1f5f9' }}>
                      <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:a.dark }}>${formatMoney(t.direct_commission)}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Direct earn (40%)</div>
                    </div>
                    <div style={{ textAlign:'center', padding:'14px 8px', borderRadius:10, background:'#f8fafc', border:'1px solid #f1f5f9' }}>
                      <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:a.dark }}>${formatMoney(t.uni_level_per_member)}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Per member (6.25%)</div>
                    </div>
                    <div style={{ textAlign:'center', padding:'14px 8px', borderRadius:10, background:'#f8fafc', border:'1px solid #f1f5f9' }}>
                      <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:a.dark }}>${t.completion_bonus.toLocaleString()}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Grid bonus</div>
                    </div>
                    <div style={{ textAlign:'center', padding:'14px 8px', borderRadius:10, background:a.bg, border:'1px solid ' + a.border }}>
                      <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:a.dark }}>${total.toLocaleString()}</div>
                      <div style={{ fontSize:11, color:a.dark, marginTop:2, fontWeight:600 }}>Total potential</div>
                    </div>
                  </div>

                  {/* Feature tags */}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
                    {feats.map(function(f) {
                      return (
                        <span key={f} style={{ fontSize:12, fontWeight:600, padding:'5px 14px', borderRadius:8, background:'#f8fafc', border:'1px solid #e2e8f0', color:'#475569' }}>{f}</span>
                      );
                    })}
                  </div>

                  {/* Grid progress if active */}
                  {t.is_active && t.grid && (
                    <div style={{ marginBottom:20 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>Grid progress</span>
                        <span style={{ fontSize:12, color:'#64748b' }}>{t.grid.filled}/64 members · Grid #{t.grid.advance}</span>
                      </div>
                      <div style={{ height:6, background:'#f1f5f9', borderRadius:4 }}>
                        <div style={{ height:'100%', width:t.grid.pct+'%', background:a.grad, borderRadius:4, transition:'width .5s' }}/>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {t.is_active ? (
                    <div style={{
                      textAlign:'center', padding:14, borderRadius:10,
                      background:a.bg, border:'1px solid ' + a.border,
                    }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, color:a.dark, fontSize:14, fontWeight:700 }}>
                        <Check size={14}/> This tier is active
                      </span>
                    </div>
                  ) : (
                    <Link to={'/activate/' + t.tier} className="ct-btn" style={{
                      display:'block', textAlign:'center', padding:14, borderRadius:10,
                      background:a.grad, textDecoration:'none',
                    }}>
                      <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>Activate {t.name} — ${t.price.toLocaleString()} USDT</span>
                    </Link>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ textAlign:'center', fontSize:11, color:'#94a3b8', paddingTop:4, paddingBottom:8 }}>
        All one-time USDT payments. 64 members per grid. Per member amount paid on each of 64 positions filled.
      </div>

    </AppLayout>
  );
}
