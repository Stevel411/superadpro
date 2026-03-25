import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Zap, Check } from 'lucide-react';
import { formatMoney } from '../utils/money';

var COLORS = [
  { bg: '#085041', light: '#E1F5EE', mid: '#5DCAA5', text: '#9FE1CB', accent: '#0F6E56', dark: '#04342C' },
  { bg: '#185FA5', light: '#E6F1FB', mid: '#85B7EB', text: '#B5D4F4', accent: '#185FA5', dark: '#0C447C' },
  { bg: '#534AB7', light: '#EEEDFE', mid: '#AFA9EC', text: '#CECBF6', accent: '#534AB7', dark: '#3C3489' },
  { bg: '#D85A30', light: '#FAECE7', mid: '#F0997B', text: '#F5C4B3', accent: '#D85A30', dark: '#993C1D' },
  { bg: '#D4537E', light: '#FBEAF0', mid: '#ED93B1', text: '#F4C0D1', accent: '#D4537E', dark: '#993556' },
  { bg: '#BA7517', light: '#FAEEDA', mid: '#FAC775', text: '#FAC775', accent: '#BA7517', dark: '#854F0B' },
  { bg: '#A32D2D', light: '#FCEBEB', mid: '#F09595', text: '#F7C1C1', accent: '#A32D2D', dark: '#791F1F' },
  { bg: 'linear-gradient(135deg,#26215C,#3C3489)', light: '#EEEDFE', mid: '#AFA9EC', text: '#CECBF6', accent: '#534AB7', dark: '#3C3489', isGrad: true },
];

export default function CampaignTiers() {
  var [tiers, setTiers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [completedCount, setCompletedCount] = useState(0);

  useEffect(function() {
    apiGet('/api/campaign-tiers').then(function(d) {
      setTiers(d.tiers || []);
      setCompletedCount(d.completed_count || 0);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  if (loading) return (
    <AppLayout title="Campaign Tiers">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="Campaign Tiers" subtitle="Activate tiers to advertise your videos and earn grid commissions">

      {/* Hero banner — matches Dashboard style */}
      <div style={{ background:'linear-gradient(135deg,#0c4a6e,#0369a1,#0284c7)', borderRadius:18, padding:'30px 34px', marginBottom:20, position:'relative', overflow:'hidden', boxShadow:'0 8px 32px rgba(3,105,161,0.35)' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-30, left:-20, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.03)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:10 }}>Campaign Grid System</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:26, fontWeight:900, color:'#fff', marginBottom:10 }}>Activate Tiers. Earn Commissions. Grow Your Grid.</div>
          <div style={{ fontSize:15, color:'rgba(255,255,255,0.65)', lineHeight:1.7, maxWidth:600, marginBottom:18 }}>
            Each tier delivers real video views through Watch & Earn. You earn commissions as your grid fills with members. When views are delivered, repurchase to stay qualified and keep earning.
          </div>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
            <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:700, color:'#fff' }}><span style={{ width:10, height:10, borderRadius:'50%', background:'#38bdf8', flexShrink:0 }}/> 40% direct commission</span>
            <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:700, color:'#fff' }}><span style={{ width:10, height:10, borderRadius:'50%', background:'#a78bfa', flexShrink:0 }}/> 6.25% per grid member</span>
            <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:700, color:'#fff' }}><span style={{ width:10, height:10, borderRadius:'50%', background:'#4ade80', flexShrink:0 }}/> Up to $3,200 completion bonus</span>
          </div>
        </div>
      </div>

      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        {tiers.slice(0, 4).map(function(t, i) {
          return <Card key={t.tier} tier={t} col={COLORS[i]} isLast={false} />;
        })}
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {tiers.slice(4).map(function(t, i) {
          return <Card key={t.tier} tier={t} col={COLORS[i + 4]} isLast={i === 3} />;
        })}
      </div>

      {/* Earning example */}
      <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: '18px 24px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Earning example: Tier 3 Pro ($100)</div>
        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
          When someone in your network purchases this tier, the direct sponsor earns $40. Each of the 8 upline levels earns $6.25 per member. With a full grid of 64 members, that is $6.25 × 64 = $400 in uni-level commissions across the grid, plus a $320 completion bonus when the grid fills. Repurchase to reactivate and repeat.
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>How it works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[
            { num: '1', title: 'Activate a tier', desc: 'Purchase a tier and submit your video ad for views.', color: COLORS[0].bg },
            { num: '2', title: 'Views are delivered', desc: 'The community watches your ad through Watch & Earn.', color: COLORS[1].bg },
            { num: '3', title: 'Earn commissions', desc: '40% direct to sponsor. 6.25% per level for each of 8 upline members.', color: COLORS[2].bg },
            { num: '4', title: 'Repurchase and repeat', desc: 'Repurchase to stay qualified. Grid reactivates on completion with bonus.', color: COLORS[5].bg },
          ].map(function(s) {
            return (
              <div key={s.num}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 10 }}>{s.num}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

function Card({ tier, col, isLast }) {
  var t = tier;
  var c = col;
  var active = t.is_active;
  var grid = t.grid;

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      border: active ? '2px solid ' + c.mid : '1px solid #e8ecf2',
      boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      cursor: 'default', position: 'relative',
      transition: 'transform .3s ease, box-shadow .3s ease',
    }}
    onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,.18)'; }}
    onMouseLeave={function(e) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ background: c.isGrad ? c.bg : c.bg, padding: '18px 18px 14px', position: 'relative' }}>
        {active && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: c.mid, color: c.dark, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Check size={11} /> Active
          </div>
        )}
        {isLast && !active && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: c.mid, color: c.dark, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6 }}>Top tier</div>
        )}
        <div style={{ fontSize: 11, color: c.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Tier {t.tier}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: c.light, marginBottom: 2 }}>{t.name}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>${t.price.toLocaleString()}</div>
      </div>

      <div style={{ background: '#fff', padding: '16px 18px' }}>
        {active && grid && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, marginBottom: 5 }}>
              <div style={{ height: '100%', width: grid.pct + '%', background: c.mid, borderRadius: 3, transition: 'width .5s' }} />
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>{grid.filled}/64 members · Grid #{grid.advance}</div>
          </div>
        )}

        <div style={{ fontSize: 15, color: '#64748b', lineHeight: 2.4 }}>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>{t.views_target.toLocaleString()} views target</div>
          <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 16 }}>${formatMoney(t.direct_commission)} direct (40%)</div>
          <div style={{ color: c.accent, fontWeight: 800, fontSize: 16 }}>${formatMoney(t.uni_level_per_member)} per grid member</div>
          <div style={{ color: c.dark, fontWeight: 800, fontSize: 16 }}>${t.completion_bonus.toLocaleString()} completion bonus</div>
        </div>

        {!active && (
          <Link to={'/activate/' + t.tier} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: c.bg, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', marginTop: 12, boxSizing: 'border-box' }}>
            <Zap size={13} /> Activate Tier
          </Link>
        )}
      </div>
    </div>
  );
}
