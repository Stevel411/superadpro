import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import CustomSelect from '../components/ui/CustomSelect';

var TIER_PRICES = [20, 50, 100, 200, 400, 600, 800, 1000];
var TIER_NAMES = ['Starter','Builder','Pro','Advanced','Elite','Premium','Executive','Ultimate'];
var TIER_CREDITS = [100, 250, 500, 1000, 2000, 3000, 4000, 5000];
var TIER_GRADS = [
  'linear-gradient(135deg,#064e3b,#10b981)', 'linear-gradient(135deg,#1e3a5f,#3b82f6)',
  'linear-gradient(135deg,#172554,#8b5cf6)', 'linear-gradient(135deg,#831843,#ec4899)',
  'linear-gradient(135deg,#134e4a,#2dd4bf)', 'linear-gradient(135deg,#6b7280,#d1d5db)',
  'linear-gradient(135deg,#78350f,#fbbf24)', 'linear-gradient(135deg,#450a0a,#ef4444)',
];

var PACK_OPTIONS = TIER_NAMES.map(function(n, i) {
  return { value: String(i), label: 'T' + (i+1) + ' ' + n + ' — $' + TIER_PRICES[i] + ' (' + TIER_CREDITS[i].toLocaleString() + ' credits)' };
});

export default function CompensationPlan() {
  var [matrixPack, setMatrixPack] = useState('2');
  var [matrixDirect, setMatrixDirect] = useState(3);
  var [matrixSpill, setMatrixSpill] = useState(36);

  var maxSpill = 39 - matrixDirect;
  if (matrixSpill > maxSpill) setMatrixSpill(maxSpill);

  var packIdx = parseInt(matrixPack);
  var mPrice = TIER_PRICES[packIdx];
  var mDirectEarn = matrixDirect * mPrice * 0.15;
  var mSpillEarn = matrixSpill * mPrice * 0.10;
  var mTotal = mDirectEarn + mSpillEarn;
  var mFilled = matrixDirect + matrixSpill;
  var mPct = Math.round(mFilled / 39 * 100);

  return (
    <AppLayout title="Compensation Plan" subtitle="4 income streams from one platform">
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:18, padding:'40px 40px 32px', marginBottom:24, textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-50, right:-50, width:200, height:200, borderRadius:'50%', background:'rgba(14,165,233,.08)', pointerEvents:'none' }}/>
          <div style={{ fontSize:12, letterSpacing:3, textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:12 }}>Compensation Plan</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:38, fontWeight:900, color:'#fff', marginBottom:10 }}>4 Ways to Earn</div>
          <div style={{ fontSize:16, color:'rgba(255,255,255,.55)', marginBottom:28, lineHeight:1.6 }}>Membership referrals, campaign grid, credit matrix, and course marketplace.</div>
          <div style={{ display:'flex', justifyContent:'center', gap:16, flexWrap:'wrap' }}>
            {[
              { icon:'👥', label:'Membership Referrals' },
              { icon:'⚡', label:'Campaign Grid' },
              { icon:'🧮', label:'Credit Matrix' },
              { icon:'🎓', label:'Course Marketplace' },
            ].map(function(s) {
              return <div key={s.label} style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, padding:'18px 28px', textAlign:'center', minWidth:170 }}>
                <div style={{ fontSize:28, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.45)' }}>{s.label}</div>
              </div>;
            })}
          </div>
        </div>

        {/* Stream 1: Membership */}
        <StreamCard num="1" icon="👥" title="Membership Referrals" subtitle="Earn 50% every time someone joins through your link"
          statVal="50%" statLabel="Commission" statColor="#16a34a" iconBg="rgba(34,197,94,.08)">
          <FlowArrow steps={[
            { title:'Referral joins', sub:'Basic $20 or Pro $35', bg:'rgba(99,102,241,.06)', border:'rgba(99,102,241,.15)', color:'#6366f1' },
            { title:'50% to you', sub:'$10 or $17.50/month', bg:'rgba(34,197,94,.06)', border:'rgba(34,197,94,.15)', color:'#16a34a' },
            { title:'Affiliate wallet', sub:'Withdraw anytime', bg:'rgba(14,165,233,.06)', border:'rgba(14,165,233,.15)', color:'#0ea5e9' },
          ]}/>
          <EarnTable headers={['Plan','Monthly','Annual','Your commission (monthly)','Your commission (annual)']} rows={[
            ['Basic','$20/mo','$200/yr','$10/mo','$100 upfront'],
            ['Pro','$35/mo','$350/yr','$17.50/mo','$175 upfront'],
          ]}/>
          <p style={{ fontSize:13, color:'#64748b', lineHeight:1.7, marginTop:14 }}>Paid instantly on every signup. Recurring monthly as long as your referral stays active. Annual referrals pay a big one-time commission. No tier required — earn from day one.</p>
        </StreamCard>

        {/* Stream 2: Campaign Grid */}
        <StreamCard num="2" icon="⚡" title="8×8 Campaign Grid" subtitle="Three commission types from your 64-position grid network"
          statVal="95%" statLabel="Total payout" statColor="#6366f1" iconBg="rgba(99,102,241,.08)">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:18 }}>
            <CommBox val="40%" label="Direct Sponsor" sub="Your referral buys a tier" color="#16a34a" bg="rgba(34,197,94,.06)" border="rgba(34,197,94,.15)"/>
            <CommBox val="6.25%" label="× 8 Levels Deep" sub="Earn from entire network" color="#6366f1" bg="rgba(99,102,241,.06)" border="rgba(99,102,241,.15)"/>
            <CommBox val="5%" label="Completion Bonus" sub="Grid fills 64 positions" color="#d97706" bg="rgba(245,158,11,.06)" border="rgba(245,158,11,.15)"/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:6, marginBottom:14 }}>
            {TIER_NAMES.map(function(n, i) {
              return <div key={i} style={{ background:TIER_GRADS[i], borderRadius:10, padding:'12px 6px', textAlign:'center', color:'#fff' }}>
                <div style={{ fontSize:10, fontWeight:600, opacity:.7 }}>{n}</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:800 }}>${TIER_PRICES[i]}</div>
              </div>;
            })}
          </div>
          <EarnTable headers={['Tier','Direct (40%)','Uni-level (6.25% × 8)','Completion Bonus (5%)']} rows={[
            ['T1 Starter $20','$8','$10 per level','$64'],
            ['T3 Pro $100','$40','$50 per level','$320'],
            ['T5 Elite $400','$160','$200 per level','$1,280'],
            ['T8 Ultimate $1,000','$400','$500 per level','$3,200'],
          ]} boldLast/>
          <p style={{ fontSize:13, color:'#64748b', lineHeight:1.7, marginTop:14 }}>
            Activate a campaign tier to unlock grid commissions. Your referrals and spillover fill your 8×8 grid. Earnings go to your Campaign Wallet (requires active tier + daily watch quota). <Link to="/grid-visualiser" style={{ color:'#2563eb', textDecoration:'none', fontWeight:700, fontSize:14 }}>View your Grid →</Link>
          </p>
        </StreamCard>

        {/* Stream 3: Credit Matrix */}
        <StreamCard num="3" icon="🧮" title="3×3 Credit Matrix" subtitle="8 separate matrices — one per credit pack. Direct referrals earn 15%, spillover earns 10%."
          statVal="35%" statLabel="Commission" statColor="#8b5cf6" iconBg="rgba(139,92,246,.08)">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
            <CommBox val="15%" label="Direct Referral" sub="You personally recruited them" color="#d97706" bg="rgba(245,158,11,.06)" border="rgba(245,158,11,.15)"/>
            <CommBox val="10%" label="Spillover" sub="Recruited by someone in your tree" color="#16a34a" bg="rgba(34,197,94,.06)" border="rgba(34,197,94,.15)"/>
          </div>
          {/* Mini tree */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 0', marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Your 3×3 Matrix (39 positions)</div>
            <div style={{ display:'flex', gap:8 }}><TreeNode type="you" label="You"/></div>
            <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Gold = Direct Referrals (15%)</div>
            <div style={{ display:'flex', gap:8 }}><TreeNode type="direct"/><TreeNode type="direct"/><TreeNode type="direct"/></div>
            <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Green = Spillover (10%)</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
              {Array.from({length:9}, function(_,i){ return <TreeNode key={i} type="spill"/>; })}
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', maxWidth:500 }}>
              {Array.from({length:9}, function(_,i){ return <TreeNode key={i} type="spill2"/>; })}
              {Array.from({length:18}, function(_,i){ return <TreeNode key={'e'+i} type="empty"/>; })}
            </div>
          </div>
          {/* 8 pack cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:6, marginBottom:14 }}>
            {TIER_NAMES.map(function(n, i) {
              return <div key={i} style={{ background:TIER_GRADS[i], borderRadius:10, padding:'12px 6px', textAlign:'center', color:'#fff' }}>
                <div style={{ fontSize:10, fontWeight:600, opacity:.7 }}>{n}</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:800 }}>${TIER_PRICES[i]}</div>
                <div style={{ fontSize:9, opacity:.5 }}>{TIER_CREDITS[i].toLocaleString()} cr</div>
              </div>;
            })}
          </div>
          {/* Per-position table */}
          <EarnTable headers={['Pack','Price','Credits','Earn per direct (15%)','Earn per spillover (10%)']} rows={
            TIER_NAMES.map(function(n, i) {
              return [n, '$'+TIER_PRICES[i], TIER_CREDITS[i].toLocaleString(), '$'+(TIER_PRICES[i]*0.15).toFixed(2), '$'+(TIER_PRICES[i]*0.10).toFixed(2)];
            })
          }/>
          <div style={{ fontSize:11, color:'#94a3b8', textAlign:'center', marginBottom:18 }}>Per-position earnings — you earn this amount each time a slot fills</div>
          {/* Calculator */}
          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:16, padding:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ width:48, height:48, borderRadius:12, background:'rgba(139,92,246,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🧮</div>
              <div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:800, color:'#0f172a' }}>Credit Matrix Calculator</div>
                <div style={{ fontSize:13, color:'#64748b' }}>See what you could earn based on your scenario</div>
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#475569', marginBottom:8 }}>Choose a credit pack</div>
              <CustomSelect value={matrixPack} onChange={function(v){ setMatrixPack(v); }} options={PACK_OPTIONS}/>
            </div>
            <SliderRow label="Your direct referrals" value={matrixDirect} min={0} max={39} display={matrixDirect} color="#d97706"
              onChange={function(v){ setMatrixDirect(v); if (matrixSpill > 39 - v) setMatrixSpill(39 - v); }}/>
            <SliderRow label="Spillover positions filled" value={matrixSpill} min={0} max={maxSpill} display={matrixSpill} color="#10b981"
              onChange={function(v){ setMatrixSpill(v); }}/>
            <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:14, padding:24, color:'#fff', marginTop:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>Total earnings from this matrix</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{mFilled}/39 filled ({mPct}%)</div>
              </div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:42, fontWeight:900, color:'#4ade80', textAlign:'center', marginBottom:16 }}>${mTotal.toFixed(2)}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={{ background:'rgba(255,255,255,.08)', borderRadius:10, padding:14, textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', fontWeight:700, letterSpacing:.5 }}>Direct Referrals (15%)</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#fbbf24', marginTop:4 }}>${mDirectEarn.toFixed(2)}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{matrixDirect} × ${mPrice} × 15%</div>
                </div>
                <div style={{ background:'rgba(255,255,255,.08)', borderRadius:10, padding:14, textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', fontWeight:700, letterSpacing:.5 }}>Spillover (10%)</div>
                  <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#4ade80', marginTop:4 }}>${mSpillEarn.toFixed(2)}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{matrixSpill} × ${mPrice} × 10%</div>
                </div>
              </div>
              <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'rgba(255,255,255,.35)' }}>This is for one matrix. Buy all 8 packs to have 8 matrices earning simultaneously.</div>
            </div>
          </div>
          <p style={{ fontSize:13, color:'#64748b', lineHeight:1.7, marginTop:14 }}>
            Each credit pack has its own independent 3×3 matrix (39 positions). Buy a pack → get AI credits + enter your sponsor's matrix. Your downline's purchases fill your matrix. <Link to="/matrix-visualiser" style={{ color:'#2563eb', textDecoration:'none', fontWeight:700, fontSize:14 }}>View your Matrices →</Link>
          </p>
        </StreamCard>

        {/* Stream 4: Courses */}
        <StreamCard num="4" icon="🎓" title="Course Marketplace" subtitle="100% commission with pass-up cascade to upline"
          badge="Coming Soon" iconBg="rgba(245,158,11,.08)">
          <p style={{ fontSize:13, color:'#64748b', lineHeight:1.7 }}>Create and sell courses on the marketplace. Keep 100% of your first sale. Subsequent sales pass up to your sponsor in a cascade — the deeper your network, the more pass-ups flow to you. Three course tiers: $100, $300, $500.</p>
        </StreamCard>

        {/* How it works */}
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #e2e8f0', marginBottom:20, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'28px 28px 0' }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'rgba(14,165,233,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>💡</div>
            <div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'#0f172a' }}>How it all works together</div>
              <div style={{ fontSize:14, color:'#64748b' }}>One platform, four income streams, two wallets</div>
            </div>
          </div>
          <div style={{ padding:'20px 28px 28px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
              <div style={{ background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.15)', borderRadius:12, padding:'18px 14px', textAlign:'center' }}>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#16a34a' }}>Affiliate Wallet</div>
                <div style={{ fontSize:13, color:'#64748b', marginTop:8 }}>Membership referrals + Credit Matrix commissions</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#16a34a', marginTop:8 }}>Always withdrawable</div>
              </div>
              <div style={{ background:'rgba(99,102,241,.06)', border:'1px solid rgba(99,102,241,.15)', borderRadius:12, padding:'18px 14px', textAlign:'center' }}>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#6366f1' }}>Campaign Wallet</div>
                <div style={{ fontSize:13, color:'#64748b', marginTop:8 }}>Grid commissions (direct + uni-level + bonus)</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#6366f1', marginTop:8 }}>Requires active tier + watch quota</div>
              </div>
            </div>
            <p style={{ fontSize:14, color:'#64748b', lineHeight:1.7, textAlign:'center' }}>
              <strong>Step 1:</strong> Join (Basic $20/mo or Pro $35/mo) → <strong>Step 2:</strong> Share your link and earn 50% on every referral → <strong>Step 3:</strong> Buy credit packs for AI tools and enter the Credit Matrix → <strong>Step 4:</strong> Activate Campaign Tiers for grid commissions → <strong>Step 5:</strong> Watch daily videos to keep your campaign wallet active
            </p>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

function StreamCard(props) {
  return (
    <div style={{ background:'#fff', borderRadius:18, border:'1px solid #e2e8f0', marginBottom:20, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'28px 28px 0' }}>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:11, fontWeight:800, color:'#fff', background:'linear-gradient(135deg,#172554,#1e3a8a)', width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{props.num}</div>
        <div style={{ width:52, height:52, borderRadius:14, background:props.iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{props.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'#0f172a' }}>{props.title}</div>
          <div style={{ fontSize:14, color:'#64748b', marginTop:2 }}>{props.subtitle}</div>
        </div>
        {props.badge ? (
          <div style={{ padding:'6px 16px', borderRadius:20, background:'rgba(245,158,11,.08)', fontSize:14, fontWeight:700, color:'#d97706' }}>{props.badge}</div>
        ) : props.statVal ? (
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:props.statColor }}>{props.statVal}</div>
            {props.statLabel && <div style={{ fontSize:12, color:'#64748b' }}>{props.statLabel}</div>}
          </div>
        ) : null}
      </div>
      <div style={{ padding:'20px 28px 28px' }}>{props.children}</div>
    </div>
  );
}

function FlowArrow(props) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr auto 1fr', alignItems:'center', gap:0, marginBottom:18 }}>
      {props.steps.map(function(s, i) {
        return <div key={i} style={{ display:'contents' }}>
          {i > 0 && <div style={{ textAlign:'center', fontSize:24, color:'#cbd5e1', padding:'0 4px' }}>→</div>}
          <div style={{ background:s.bg, border:'1px solid '+s.border, borderRadius:12, padding:'18px 14px', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:800, color:'#0f172a' }}>{s.title}</div>
            <div style={{ fontSize:13, marginTop:4, fontWeight:600, color:s.color }}>{s.sub}</div>
          </div>
        </div>;
      })}
    </div>
  );
}

function CommBox(props) {
  return (
    <div style={{ background:props.bg, border:'1px solid '+props.border, borderRadius:12, padding:'18px 14px', textAlign:'center' }}>
      <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:props.color, lineHeight:1 }}>{props.val}</div>
      <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginTop:6 }}>{props.label}</div>
      <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>{props.sub}</div>
    </div>
  );
}

function EarnTable(props) {
  return (
    <div style={{ overflowX:'auto', marginBottom:14 }}>
      <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:0 }}>
        <thead><tr>{props.headers.map(function(h, i) {
          return <th key={i} style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5, padding:'10px 14px', textAlign: i === props.headers.length-1 ? 'right' : 'left', borderBottom:'2px solid #f1f5f9' }}>{h}</th>;
        })}</tr></thead>
        <tbody>{props.rows.map(function(row, ri) {
          var isLast = ri === props.rows.length - 1;
          return <tr key={ri}>{row.map(function(cell, ci) {
            return <td key={ci} style={{ fontSize:14, padding:'12px 14px', borderBottom: isLast ? 'none' : '1px solid #f8fafc', textAlign: ci === row.length-1 ? 'right' : 'left', fontFamily: ci === row.length-1 ? 'Sora,sans-serif' : 'inherit', fontWeight: (ci === row.length-1 || (isLast && props.boldLast)) ? 700 : 400, color:'#0f172a' }}>{cell}</td>;
          })}</tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function TreeNode(props) {
  var styles = {
    you:    { background:'linear-gradient(135deg,#172554,#1e3a8a)', color:'#fff' },
    direct: { background:'linear-gradient(135deg,#78350f,#b45309,#fbbf24)', color:'#fff' },
    spill:  { background:'linear-gradient(135deg,#064e3b,#047857,#10b981)', color:'#fff' },
    spill2: { background:'linear-gradient(135deg,#064e3b,#047857,#10b981)', color:'#fff', opacity:.7 },
    empty:  { background:'#f1f5f9', border:'2px dashed #e2e8f0', color:'#cbd5e1' },
  };
  var s = styles[props.type] || styles.empty;
  var label = props.type === 'you' ? (props.label || 'You') : props.type === 'direct' ? '★' : props.type === 'empty' ? '' : '↓';
  return <div style={{ width:44, height:44, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, ...s }}>{label}</div>;
}

function SliderRow(props) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:14, fontWeight:600, color:'#475569' }}>{props.label}</span>
        <span style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:700, color:'#0f172a' }}>{props.display}</span>
      </div>
      <input type="range" min={props.min} max={props.max} value={props.value}
        onChange={function(e){ props.onChange(parseInt(e.target.value)); }}
        style={{ width:'100%', accentColor: props.color || '#6366f1' }}/>
    </div>
  );
}
