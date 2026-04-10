import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import CustomSelect from '../components/ui/CustomSelect';
import { Users, Zap, Layers, GraduationCap, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

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

var STREAMS = [
  { id:'membership', num:'1', title:'Membership Referrals', shortTitle:'Membership', Icon:Users, color:'#16a34a', bg:'#dcfce7', link:'/affiliate', linkLabel:'View Referrals' },
  { id:'grid', num:'2', title:'8×8 Campaign Grid', shortTitle:'Campaign Grid', Icon:Zap, color:'#6366f1', bg:'#eef2ff', link:'/grid-visualiser', linkLabel:'View Your Grid' },
  { id:'matrix', num:'3', title:'3×3 Credit Matrix', shortTitle:'Credit Matrix', Icon:Layers, color:'#8b5cf6', bg:'#ede9fe', link:'/matrix-visualiser', linkLabel:'View Your Matrices' },
  { id:'courses', num:'4', title:'Course Marketplace', shortTitle:'Courses', Icon:GraduationCap, color:'#f59e0b', bg:'#fef3c7', link:'/courses', linkLabel:'Coming Soon', comingSoon:true },
];


export default function CompensationPlan() {
  var [activeIdx, setActiveIdx] = useState(0);
  var [matrixPack, setMatrixPack] = useState('2');
  var [matrixDirect, setMatrixDirect] = useState(3);
  var [matrixSpill, setMatrixSpill] = useState(36);

  var maxSpill = 39 - matrixDirect;
  if (matrixSpill > maxSpill) setMatrixSpill(maxSpill);

  var s = STREAMS[activeIdx];

  return (
    <AppLayout title="Compensation Plan" subtitle="4 income streams from one platform">

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:18, padding:'36px 36px 28px', marginBottom:20, textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-50, right:-50, width:200, height:200, borderRadius:'50%', background:'rgba(14,165,233,.08)', pointerEvents:'none' }}/>
        <div style={{ fontSize:12, letterSpacing:3, textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:10 }}>Compensation Plan</div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:34, fontWeight:900, color:'#fff', marginBottom:8 }}>4 Ways to Earn</div>
        <div style={{ fontSize:15, color:'rgba(255,255,255,.5)', marginBottom:24, lineHeight:1.6 }}>Click any income stream below to explore how it works</div>

        {/* Clickable cards */}
        <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
          {STREAMS.map(function(st, i) {
            var isActive = i === activeIdx;
            return <button key={st.id} onClick={function(){ setActiveIdx(i); }}
              style={{
                background: isActive ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)',
                border: isActive ? '2px solid rgba(255,255,255,.4)' : '1px solid rgba(255,255,255,.1)',
                borderRadius:14, padding:'18px 24px', textAlign:'center', minWidth:160,
                cursor:'pointer', transition:'all .2s', fontFamily:'inherit',
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
              }}>
              <div style={{ fontSize:28, marginBottom:4 }}>{st.id === 'membership' ? '👥' : st.id === 'grid' ? '⚡' : st.id === 'matrix' ? '🧮' : '🎓'}</div>
              <div style={{ fontSize:12, color: isActive ? '#fff' : 'rgba(255,255,255,.45)', fontWeight: isActive ? 700 : 500 }}>{st.shortTitle}</div>
            </button>;
          })}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, overflowX:'auto', marginBottom:20, paddingBottom:4 }}>
        {STREAMS.map(function(st, i) {
          var isActive = i === activeIdx;
          return <button key={st.id} onClick={function(){ setActiveIdx(i); }}
            style={{
              display:'flex', alignItems:'center', gap:6, padding:'10px 14px', borderRadius:10,
              border: isActive ? '1.5px solid '+st.color : '1px solid #e2e8f0',
              background: isActive ? st.bg : '#fff',
              cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight: isActive ? 700 : 500,
              color: isActive ? st.color : '#64748b', whiteSpace:'nowrap', flexShrink:0,
              transition:'all .15s',
            }}>
            <div style={{ width:22, height:22, borderRadius:6, background: isActive ? st.color : st.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <st.Icon size={12} color={isActive ? '#fff' : st.color}/>
            </div>
            {st.shortTitle}
          </button>;
        })}
      </div>

      {/* Content */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'24px 28px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <s.Icon size={26} color={s.color}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#0f172a' }}>{s.title}</div>
            <div style={{ fontSize:14, color:'#94a3b8', marginTop:2 }}>Income Stream {s.num} of 4</div>
          </div>
          {s.comingSoon && <div style={{ padding:'6px 16px', borderRadius:20, background:'rgba(245,158,11,.08)', fontSize:14, fontWeight:700, color:'#d97706' }}>Coming Soon</div>}
        </div>

        {/* Stream content */}
        <div style={{ padding:'24px 28px' }}>
          {activeIdx === 0 && <MembershipContent />}
          {activeIdx === 1 && <GridContent />}
          {activeIdx === 2 && <MatrixContent matrixPack={matrixPack} setMatrixPack={setMatrixPack} matrixDirect={matrixDirect} setMatrixDirect={setMatrixDirect} matrixSpill={matrixSpill} setMatrixSpill={setMatrixSpill} maxSpill={maxSpill}/>}
          {activeIdx === 3 && <CoursesContent />}
        </div>

        {/* Navigation */}
        <div style={{ padding:'20px 28px 24px', borderTop:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', gap:8 }}>
            {activeIdx > 0 && (
              <button onClick={function(){ setActiveIdx(activeIdx - 1); }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:600, color:'#64748b' }}>
                <ChevronLeft size={16}/> Previous
              </button>
            )}
            {activeIdx < STREAMS.length - 1 && (
              <button onClick={function(){ setActiveIdx(activeIdx + 1); }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:600, color:'#64748b' }}>
                Next <ChevronRight size={16}/>
              </button>
            )}
          </div>
          {!s.comingSoon && (
            <Link to={s.link} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10, textDecoration:'none', background:s.color, color:'#fff', fontSize:14, fontWeight:700 }}>
              {s.linkLabel} <ArrowRight size={16}/>
            </Link>
          )}
        </div>
      </div>

      {/* Two Wallets section */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:'24px 28px', marginTop:20 }}>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#0f172a', marginBottom:16 }}>Two Wallets — How Earnings Are Paid</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
          <div style={{ background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.15)', borderRadius:12, padding:'18px 14px', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'#16a34a' }}>Affiliate Wallet</div>
            <div style={{ fontSize:13, color:'#64748b', marginTop:8 }}>Membership referrals + Credit Matrix commissions</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#16a34a', marginTop:8 }}>Always withdrawable</div>
          </div>
          <div style={{ background:'rgba(99,102,241,.06)', border:'1px solid rgba(99,102,241,.15)', borderRadius:12, padding:'18px 14px', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'#6366f1' }}>Campaign Wallet</div>
            <div style={{ fontSize:13, color:'#64748b', marginTop:8 }}>Grid commissions (direct + uni-level + bonus)</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#6366f1', marginTop:8 }}>Requires active tier + watch quota</div>
          </div>
        </div>
      </div>

    </AppLayout>
  );
}


/* ═══════════════════════════════════════════════════
   STREAM 1: MEMBERSHIP REFERRALS
   ═══════════════════════════════════════════════════ */
function MembershipContent() {
  return <>
    <FlowArrow steps={[
      { title:'Referral joins', sub:'Basic $20 or Pro $35', bg:'rgba(99,102,241,.06)', border:'rgba(99,102,241,.15)', color:'#6366f1' },
      { title:'50% to you', sub:'$10 or $17.50/month', bg:'rgba(34,197,94,.06)', border:'rgba(34,197,94,.15)', color:'#16a34a' },
      { title:'Affiliate wallet', sub:'Withdraw anytime', bg:'rgba(14,165,233,.06)', border:'rgba(14,165,233,.15)', color:'#0ea5e9' },
    ]}/>

    <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Commission Breakdown</div>
    <EarnTable headers={['Plan','Monthly','Annual','Your commission (monthly)','Your commission (annual)']} rows={[
      ['Basic','$20/mo','$200/yr','$10/mo','$100 upfront'],
      ['Pro','$35/mo','$350/yr','$17.50/mo','$175 upfront'],
    ]}/>

    <InfoBox items={[
      'Paid instantly on every signup — no minimum requirements',
      'Recurring monthly as long as your referral stays active',
      'Annual referrals pay a big one-time commission upfront',
      'No campaign tier required — earn from day one',
      'Commissions go to your Affiliate Wallet — withdraw anytime',
    ]} color="#16a34a"/>
    <div style={{ textAlign:'center', marginTop:12 }}><Link to="/income-disclaimer" style={{ fontSize:13, color:'#94a3b8', textDecoration:'none' }}>Income Disclaimer →</Link></div>
  </>;
}


/* ═══════════════════════════════════════════════════
   STREAM 2: CAMPAIGN GRID
   ═══════════════════════════════════════════════════ */
function GridContent() {
  return <>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
      <CommBox val="40%" label="Direct Sponsor" sub="Your referral buys a tier" color="#16a34a" bg="rgba(34,197,94,.06)" border="rgba(34,197,94,.15)"/>
      <CommBox val="6.25%" label="× 8 Levels Deep" sub="Earn from entire network" color="#6366f1" bg="rgba(99,102,241,.06)" border="rgba(99,102,241,.15)"/>
      <CommBox val="5%" label="Completion Bonus" sub="Grid fills 64 positions" color="#d97706" bg="rgba(245,158,11,.06)" border="rgba(245,158,11,.15)"/>
    </div>

    <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:12 }}>8 Campaign Tiers</div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:6, marginBottom:20 }}>
      {TIER_NAMES.map(function(n, i) {
        return <div key={i} style={{ background:TIER_GRADS[i], borderRadius:10, padding:'12px 6px', textAlign:'center', color:'#fff' }}>
          <div style={{ fontSize:10, fontWeight:600, opacity:.7 }}>{n}</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:800 }}>${TIER_PRICES[i]}</div>
        </div>;
      })}
    </div>

    <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Earnings Per Tier</div>
    <EarnTable headers={['Tier','Direct (40%)','Uni-level (6.25% × 8)','Completion Bonus (5%)']} rows={[
      ['T1 Starter $20','$8','$10 per level','$64'],
      ['T2 Builder $50','$20','$25 per level','$160'],
      ['T3 Pro $100','$40','$50 per level','$320'],
      ['T4 Advanced $200','$80','$100 per level','$640'],
      ['T5 Elite $400','$160','$200 per level','$1,280'],
      ['T6 Premium $600','$240','$300 per level','$1,920'],
      ['T7 Executive $800','$320','$400 per level','$2,560'],
      ['T8 Ultimate $1,000','$400','$500 per level','$3,200'],
    ]} boldLast/>

    <InfoBox items={[
      'Activate a Campaign Tier to enter the 8×8 Income Grid (64 positions)',
      'Your referrals and their spillover fill your grid positions',
      'When all 64 positions fill, you earn the completion bonus and a new grid starts (advance)',
      'Higher tiers unlock more daily campaign views and bigger bonuses',
      'Grid earnings go to your Campaign Wallet — requires active tier + daily watch quota',
      '5% of each tier purchase goes to the company — 95% is paid to members',
    ]} color="#6366f1"/>
    <div style={{ textAlign:'center', marginTop:12 }}><Link to="/income-disclaimer" style={{ fontSize:13, color:'#94a3b8', textDecoration:'none' }}>Income Disclaimer →</Link></div>
  </>;
}


/* ═══════════════════════════════════════════════════
   STREAM 3: CREDIT MATRIX
   ═══════════════════════════════════════════════════ */
function MatrixContent(props) {
  var packIdx = parseInt(props.matrixPack);
  var mPrice = TIER_PRICES[packIdx];
  var mDirectEarn = props.matrixDirect * mPrice * 0.15;
  var mSpillEarn = props.matrixSpill * mPrice * 0.10;
  var mFilled = props.matrixDirect + props.matrixSpill;
  var mPct = Math.round(mFilled / 39 * 100);
  var mComplete = mFilled >= 39;
  var mCompletionBonus = mComplete ? 39 * mPrice * 0.10 : 0;
  var mTotal = mDirectEarn + mSpillEarn + mCompletionBonus;

  return <>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
      <CommBox val="15%" label="Direct Referral" sub="You personally recruited them" color="#d97706" bg="rgba(245,158,11,.06)" border="rgba(245,158,11,.15)"/>
      <CommBox val="10%" label="Spillover" sub="Recruited by someone in your tree" color="#16a34a" bg="rgba(34,197,94,.06)" border="rgba(34,197,94,.15)"/>
      <CommBox val="10%" label="Completion Bonus" sub="Matrix fills all 39 positions" color="#8b5cf6" bg="rgba(139,92,246,.06)" border="rgba(139,92,246,.15)"/>
    </div>

    {/* Cost breakdown */}
    <div style={{ background:'#f8fafc', borderRadius:12, padding:'16px 20px', marginBottom:20, fontSize:13, color:'#64748b', lineHeight:1.7 }}>
      <strong style={{ color:'#0f172a' }}>Where does the money go?</strong> 50% covers AI service costs (video, image, music, voice generation), 15% covers platform management, and 35% is paid out as member commissions (15% direct + 10% spillover + 10% completion bonus). <Link to="/income-disclaimer" style={{ color:'#2563eb', textDecoration:'none', fontWeight:700 }}>View full disclaimer →</Link>
    </div>

    {/* Mini tree */}
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 0', marginBottom:20 }}>
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

    <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:12 }}>8 Credit Packs</div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:6, marginBottom:20 }}>
      {TIER_NAMES.map(function(n, i) {
        return <div key={i} style={{ background:TIER_GRADS[i], borderRadius:10, padding:'12px 6px', textAlign:'center', color:'#fff' }}>
          <div style={{ fontSize:10, fontWeight:600, opacity:.7 }}>{n}</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:800 }}>${TIER_PRICES[i]}</div>
          <div style={{ fontSize:9, opacity:.5 }}>{TIER_CREDITS[i].toLocaleString()} cr</div>
        </div>;
      })}
    </div>

    <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Per-Position Earnings</div>
    <EarnTable headers={['Pack','Price','Credits','Earn per direct (15%)','Earn per spillover (10%)']} rows={
      TIER_NAMES.map(function(n, i) {
        return [n, '$'+TIER_PRICES[i], TIER_CREDITS[i].toLocaleString(), '$'+(TIER_PRICES[i]*0.15).toFixed(2), '$'+(TIER_PRICES[i]*0.10).toFixed(2)];
      })
    }/>
    <div style={{ fontSize:11, color:'#94a3b8', textAlign:'center', marginBottom:20 }}>Per-position earnings — you earn this amount each time a slot fills</div>

    {/* Calculator */}
    <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:16, padding:28, marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <div style={{ width:48, height:48, borderRadius:12, background:'rgba(139,92,246,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🧮</div>
        <div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:800, color:'#0f172a' }}>Credit Matrix Calculator</div>
          <div style={{ fontSize:13, color:'#64748b' }}>See what you could earn based on your scenario</div>
        </div>
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#475569', marginBottom:8 }}>Choose a credit pack</div>
        <CustomSelect value={props.matrixPack} onChange={function(v){ props.setMatrixPack(v); }} options={PACK_OPTIONS}/>
      </div>

      <SliderRow label="Your direct referrals" value={props.matrixDirect} min={0} max={39} display={props.matrixDirect} color="#d97706"
        onChange={function(v){ props.setMatrixDirect(v); if (props.matrixSpill > 39 - v) props.setMatrixSpill(39 - v); }}/>
      <SliderRow label="Spillover positions filled" value={props.matrixSpill} min={0} max={props.maxSpill} display={props.matrixSpill} color="#10b981"
        onChange={function(v){ props.setMatrixSpill(v); }}/>

      <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:14, padding:24, color:'#fff', marginTop:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>Total earnings from this matrix</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{mFilled}/39 filled ({mPct}%)</div>
        </div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:42, fontWeight:900, color:'#4ade80', textAlign:'center', marginBottom:16 }}>${mTotal.toFixed(2)}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          <div style={{ background:'rgba(255,255,255,.08)', borderRadius:10, padding:14, textAlign:'center' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', fontWeight:700, letterSpacing:.5 }}>Direct (15%)</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#fbbf24', marginTop:4 }}>${mDirectEarn.toFixed(2)}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{props.matrixDirect} × ${mPrice} × 15%</div>
          </div>
          <div style={{ background:'rgba(255,255,255,.08)', borderRadius:10, padding:14, textAlign:'center' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', fontWeight:700, letterSpacing:.5 }}>Spillover (10%)</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#4ade80', marginTop:4 }}>${mSpillEarn.toFixed(2)}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{props.matrixSpill} × ${mPrice} × 10%</div>
          </div>
          <div style={{ background: mComplete ? 'rgba(139,92,246,.2)' : 'rgba(255,255,255,.05)', borderRadius:10, padding:14, textAlign:'center', border: mComplete ? '1px solid rgba(139,92,246,.3)' : '1px solid transparent' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', fontWeight:700, letterSpacing:.5 }}>Bonus (10%)</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color: mComplete ? '#c084fc' : 'rgba(255,255,255,.2)', marginTop:4 }}>{mComplete ? '$'+mCompletionBonus.toFixed(2) : '🔒'}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{mComplete ? '39 × $'+mPrice+' × 10%' : 'Unlocks at 39/39'}</div>
          </div>
        </div>
        <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'rgba(255,255,255,.35)' }}>This is for one matrix. Buy all 8 packs to have 8 matrices earning simultaneously.</div>
      </div>
    </div>

    <InfoBox items={[
      'Each credit pack has its own independent 3×3 matrix (39 positions)',
      'Buy a pack → get AI credits + enter your sponsor\'s matrix',
      'Your downline\'s purchases fill your matrix via BFS spillover',
      'Commission = 15% if you recruited them, 10% if spillover',
      'When all 39 positions fill, you earn a 10% completion bonus and a new matrix starts',
      '65% of credit pack cost covers AI services and platform management',
      'Commissions go to your Affiliate Wallet — always withdrawable',
    ]} color="#8b5cf6"/>
    <div style={{ textAlign:'center', marginTop:12 }}><Link to="/income-disclaimer" style={{ fontSize:13, color:'#94a3b8', textDecoration:'none' }}>Income Disclaimer →</Link></div>
  </>;
}


/* ═══════════════════════════════════════════════════
   STREAM 4: COURSES
   ═══════════════════════════════════════════════════ */
function CoursesContent() {
  return <>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
      <CommBox val="100%" label="First Sale" sub="Keep every penny" color="#16a34a" bg="rgba(34,197,94,.06)" border="rgba(34,197,94,.15)"/>
      <CommBox val="Pass-up" label="Cascade System" sub="Subsequent sales flow upline" color="#f59e0b" bg="rgba(245,158,11,.06)" border="rgba(245,158,11,.15)"/>
      <CommBox val="3 Tiers" label="$100 / $300 / $500" sub="Course price points" color="#8b5cf6" bg="rgba(139,92,246,.06)" border="rgba(139,92,246,.15)"/>
    </div>

    <InfoBox items={[
      'Create and sell digital courses on the SuperAdPro marketplace',
      'Keep 100% of your first sale — no platform cut',
      'Subsequent sales pass up to your sponsor in a cascade system',
      'The deeper your network, the more pass-ups flow to you',
      'Three course tiers: $100, $300, and $500',
      'This feature is coming soon — stay tuned for the launch',
    ]} color="#f59e0b"/>
  </>;
}


/* ── Shared Components ── */

function FlowArrow(props) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr auto 1fr', alignItems:'center', gap:0, marginBottom:20 }}>
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

function InfoBox(props) {
  return (
    <div style={{ background:'#f8fafc', borderRadius:12, padding:'18px 22px', marginTop:16 }}>
      <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:10 }}>Key things to know</div>
      {props.items.map(function(item, i) {
        return <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom: i < props.items.length - 1 ? 10 : 0 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:props.color, marginTop:8, flexShrink:0 }}/>
          <div style={{ fontSize:15, color:'#475569', lineHeight:1.7 }}>{item}</div>
        </div>;
      })}
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
