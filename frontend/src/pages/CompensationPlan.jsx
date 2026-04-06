import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { formatMoney } from '../utils/money';
import { Users, Zap, GraduationCap, Layers, DollarSign, HelpCircle } from 'lucide-react';

var TIER_PRICES = [0, 20, 50, 100, 200, 400, 600, 800, 1000];
var TIER_NAMES = ['', 'Starter', 'Builder', 'Pro', 'Advanced', 'Elite', 'Premium', 'Executive', 'Ultimate'];
var TIER_GRADS = [
  '', 'linear-gradient(135deg,#064e3b,#10b981)', 'linear-gradient(135deg,#1e3a5f,#3b82f6)',
  'linear-gradient(135deg,#1e1b4b,#8b5cf6)', 'linear-gradient(135deg,#831843,#ec4899)',
  'linear-gradient(135deg,#134e4a,#2dd4bf)', 'linear-gradient(135deg,#374151,#d1d5db)',
  'linear-gradient(135deg,#78350f,#fbbf24)', 'linear-gradient(135deg,#450a0a,#ef4444)',
];
var TIER_BONUSES = [0, 64, 160, 320, 640, 1280, 1920, 2560, 3200];

export default function CompensationPlan() {
  var [showHelp, setShowHelp] = useState(false);
  var [refs, setRefs] = useState(5);
  var [tier, setTier] = useState(3);
  var [team, setTeam] = useState(10);
  var [proPct, setProPct] = useState(30);

  if (showHelp) return <AppLayout title="Compensation Plan"><CompPlanHelp onBack={function() { setShowHelp(false); }}/></AppLayout>;

  var basicRefs = Math.round(refs * (1 - proPct / 100));
  var proRefs = refs - basicRefs;
  var memMonthly = (basicRefs * 10) + (proRefs * 17.50);
  var tierPrice = TIER_PRICES[tier] || 0;
  var directComm = refs * tierPrice * 0.40;
  var uniLevel = team * tierPrice * 0.0625;
  var gridTotal = directComm + uniLevel;
  var ssCredits = refs * 15;
  var ssEarnings = ssCredits * 0.025;
  var total = memMonthly + gridTotal + ssEarnings;

  return (
    <AppLayout title="Compensation Plan" subtitle="5 income streams — 95% paid to members"
      topbarActions={
        <button onClick={function() { setShowHelp(true); }} style={{ padding:'7px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600, color:'#64748b', display:'flex', alignItems:'center', gap:4 }}><HelpCircle size={14}/> Help</button>
      }>

      {/* Hero Banner */}
      <div style={{
        background:'linear-gradient(135deg,#1a103d,#2d1b69,#4338ca)', borderRadius:18,
        padding:'32px 34px 26px', marginBottom:20, textAlign:'center',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:140, height:140, borderRadius:'50%', background:'rgba(139,92,246,.12)' }}/>
        <div style={{ position:'absolute', bottom:-20, left:-20, width:100, height:100, borderRadius:'50%', background:'rgba(59,130,246,.1)' }}/>
        <div style={{ fontSize:13, letterSpacing:3, textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:10 }}>Compensation plan</div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:36, fontWeight:800, color:'#fff', marginBottom:8 }}>5 income streams</div>
        <div style={{ fontSize:16, color:'rgba(255,255,255,.55)', marginBottom:24 }}>95% of all revenue paid to members — only 5% retained by the platform</div>
        <div style={{ display:'flex', justifyContent:'center', gap:16, flexWrap:'wrap' }}>
          {[
            { val:'$10–$17.50', label:'Per referral', color:'#4ade80' },
            { val:'8 levels', label:'Uni-level depth', color:'#60a5fa' },
            { val:'$64–$3,200', label:'Grid completion bonus', color:'#c084fc' },
          ].map(function(s, i) {
            return <div key={i} style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, padding:'16px 28px', textAlign:'center', minWidth:160 }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginTop:4 }}>{s.label}</div>
            </div>;
          })}
        </div>
      </div>

      {/* Stream 1: Membership Referrals */}
      <StreamCard num="1" title="Membership referrals" subtitle="Earn every time someone joins through your link"
        Icon={Users} statVal="50%" statLabel="Commission" statColor="#16a34a"
        iconBg="rgba(34,197,94,.09)" iconColor="#16a34a">
        <FlowArrow steps={[
          { title:'Referral joins', sub:'Basic $20 / Pro $35', bg:'rgba(99,102,241,.06)', border:'rgba(99,102,241,.15)', color:'#6366f1' },
          { title:'50% to you', sub:'$10 or $17.50', bg:'rgba(34,197,94,.06)', border:'rgba(34,197,94,.15)', color:'#16a34a' },
          { title:'Affiliate wallet', sub:'Withdraw anytime', bg:'rgba(14,165,233,.06)', border:'rgba(14,165,233,.15)', color:'#0ea5e9' },
        ]}/>
        <div style={{ fontSize:15, color:'#475569', lineHeight:1.7 }}>Paid instantly on every new signup. Recurring monthly as long as your referral stays active. No tier required — earn from day one.</div>
      </StreamCard>

      {/* Stream 2: Campaign Grid */}
      <StreamCard num="2" title="8×8 campaign grid" subtitle="Three commission types from your grid network"
        Icon={Zap} statVal="95%" statLabel="Total payout" statColor="#6366f1"
        iconBg="rgba(99,102,241,.09)" iconColor="#6366f1">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, margin:'0 0 18px' }}>
          {[
            { val:'40%', label:'Direct sponsor', sub:'Your referral buys a tier', bg:'rgba(34,197,94,.06)', border:'rgba(34,197,94,.15)', color:'#16a34a' },
            { val:'6.25%', label:'× 8 levels deep', sub:'Earn from entire network', bg:'rgba(99,102,241,.06)', border:'rgba(99,102,241,.15)', color:'#6366f1' },
            { val:'5%', label:'Completion bonus', sub:'Grid fills 64 positions', bg:'rgba(245,158,11,.06)', border:'rgba(245,158,11,.15)', color:'#d97706' },
          ].map(function(c, i) {
            return <div key={i} style={{ background:c.bg, border:'1px solid '+c.border, borderRadius:12, padding:'20px 14px', textAlign:'center' }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:c.color }}>{c.val}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginTop:6 }}>{c.label}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:3 }}>{c.sub}</div>
            </div>;
          })}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:6, marginBottom:14 }}>
          {[1,2,3,4,5,6,7,8].map(function(t) {
            return <div key={t} style={{ background:TIER_GRADS[t], borderRadius:10, padding:'12px 8px', textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.7)' }}>T{t}</div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#fff' }}>${TIER_PRICES[t]}</div>
            </div>;
          })}
        </div>
        <div style={{ fontSize:15, color:'#475569', lineHeight:1.7 }}>Activate a campaign tier to unlock grid commissions. Your referrals and their referrals fill your 8×8 grid. Earnings go to your campaign wallet (requires active tier + daily watch quota).</div>
      </StreamCard>

      {/* Stream 3: SuperScene */}
      <StreamCard num="3" title="SuperScene sponsor earnings" subtitle="Earn when your referrals create AI videos, images, and music"
        Icon={Zap} statVal="$0.025" statLabel="Per credit" statColor="#ec4899"
        iconBg="rgba(236,72,153,.09)" iconColor="#ec4899">
        <FlowArrow steps={[
          { title:'Referral uses credits', sub:'Video, image, music', bg:'rgba(99,102,241,.06)', border:'rgba(99,102,241,.15)', color:'#6366f1' },
          { title:'$0.025 per credit', sub:'Auto micro-payment', bg:'rgba(236,72,153,.06)', border:'rgba(236,72,153,.15)', color:'#ec4899' },
          { title:'Affiliate wallet', sub:'Passive recurring income', bg:'rgba(14,165,233,.06)', border:'rgba(14,165,233,.15)', color:'#0ea5e9' },
        ]}/>
        <div style={{ fontSize:15, color:'#475569', lineHeight:1.7 }}>Every time your referrals use SuperScene AI tools, you earn. With active users generating content regularly, this becomes a steady passive income stream.</div>
      </StreamCard>

      {/* Stream 4: Courses */}
      <StreamCard num="4" title="Course marketplace" subtitle="100% commission on first sale, pass-up cascade to upline"
        Icon={GraduationCap} statVal="" statLabel="" statColor="#f59e0b"
        iconBg="rgba(245,158,11,.09)" iconColor="#f59e0b" badge="Coming soon">
        <div style={{ fontSize:15, color:'#475569', lineHeight:1.7 }}>Create and sell courses on the marketplace. Keep 100% of your first sale. Subsequent sales pass up to your sponsor in a cascade — the deeper your network, the more pass-ups flow to you.</div>
      </StreamCard>

      {/* Stream 5: Credit Matrix */}
      <StreamCard num="5" title="3×3 Credit Matrix" subtitle="Earn commissions every time your team buys credit packs"
        Icon={Layers} statVal="18%" statLabel="Total payout" statColor="#8b5cf6"
        iconBg="rgba(139,92,246,.09)" iconColor="#8b5cf6">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, margin:'0 0 18px' }}>
          {[
            { val:'10%', label:'Level 1', sub:'3 direct positions', bg:'rgba(139,92,246,.06)', border:'rgba(139,92,246,.15)', color:'#8b5cf6' },
            { val:'5%', label:'Level 2', sub:'9 spillover positions', bg:'rgba(14,165,233,.06)', border:'rgba(14,165,233,.15)', color:'#0ea5e9' },
            { val:'3%', label:'Level 3', sub:'27 spillover positions', bg:'rgba(245,158,11,.06)', border:'rgba(245,158,11,.15)', color:'#d97706' },
          ].map(function(c, i) {
            return <div key={i} style={{ background:c.bg, border:'1px solid '+c.border, borderRadius:12, padding:'20px 14px', textAlign:'center' }}>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:28, fontWeight:800, color:c.color }}>{c.val}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginTop:6 }}>{c.label}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:3 }}>{c.sub}</div>
            </div>;
          })}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:14 }}>
          {[
            { name:'Starter', price:'$25', credits:'150' },
            { name:'Builder', price:'$50', credits:'350' },
            { name:'Pro', price:'$100', credits:'800' },
            { name:'Elite', price:'$250', credits:'2,200' },
            { name:'Ultimate', price:'$500', credits:'5,000' },
          ].map(function(p, i) {
            return <div key={i} style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:10, padding:'12px 8px', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.6)' }}>{p.name}</div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#fff' }}>{p.price}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.45)' }}>{p.credits} credits</div>
            </div>;
          })}
        </div>
        <div style={{ fontSize:15, color:'#475569', lineHeight:1.7 }}>Buy credit packs for AI videos, images, and music. Your purchase enters your sponsor's 3×3 matrix. Just refer 3 people — spillover from your upline fills the rest. When all 39 positions fill, earn a completion bonus and the matrix resets automatically. Full matrix with all 5 packs = $1,693.</div>
        <Link to="/credit-matrix" style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:12, fontSize:14, fontWeight:700, color:'#8b5cf6', textDecoration:'none' }}>View your Credit Matrix →</Link>
      </StreamCard>

      {/* ── TWO CALCULATORS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:18 }}>

        {/* Membership Earnings Calculator */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:'rgba(34,197,94,.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Users size={24} color="#16a34a"/>
            </div>
            <div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:800 }}>Membership calculator</div>
              <div style={{ fontSize:13, color:'#64748b' }}>Monthly recurring income from referrals</div>
            </div>
          </div>

          <SliderRow label="Personal referrals" value={refs} min={0} max={50} display={String(refs)} onChange={function(v) { setRefs(v); }}/>
          <SliderRow label="% on Pro ($35/mo)" value={proPct} min={0} max={100} step={5} display={proPct + '%'} onChange={function(v) { setProPct(v); }}/>

          <div style={{ background:'#f0fdf4', borderRadius:12, padding:'18px', marginTop:8 }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:'#059669', marginBottom:6 }}>Monthly recurring</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:36, fontWeight:800, color:'#059669', marginBottom:14 }}>${Math.round(memMonthly).toLocaleString()}/mo</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14 }}>
                <span style={{ color:'#475569' }}>Basic referrals ({basicRefs})</span>
                <span style={{ fontWeight:700, color:'#0f172a' }}>${Math.round(basicRefs * 10).toLocaleString()}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14 }}>
                <span style={{ color:'#475569' }}>Pro referrals ({proRefs})</span>
                <span style={{ fontWeight:700, color:'#0f172a' }}>${Math.round(proRefs * 17.50).toLocaleString()}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, borderTop:'1px solid #bbf7d0', paddingTop:8 }}>
                <span style={{ color:'#475569' }}>Annual projection</span>
                <span style={{ fontFamily:'Sora,sans-serif', fontWeight:800, color:'#059669' }}>${Math.round(memMonthly * 12).toLocaleString()}/yr</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:10, textAlign:'center' }}>Paid to Affiliate Wallet — withdraw anytime</div>
        </div>

        {/* Campaign Tier Earnings Calculator */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:'rgba(99,102,241,.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Zap size={24} color="#6366f1"/>
            </div>
            <div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:800 }}>Campaign tier calculator</div>
              <div style={{ fontSize:13, color:'#64748b' }}>Grid commissions from tier activations</div>
            </div>
          </div>

          <SliderRow label="Campaign tier" value={tier} min={1} max={8} display={'T' + tier + ' ($' + TIER_PRICES[tier] + ')'} onChange={function(v) { setTier(v); }}/>
          <SliderRow label="Your personal referrals buying this tier" value={refs} min={0} max={20} display={String(refs)} onChange={function(v) { setRefs(v); }}/>
          <SliderRow label="Network members buying this tier" value={team} min={0} max={60} display={String(team)} onChange={function(v) { setTeam(v); }}/>

          <div style={{ background:'#eef2ff', borderRadius:12, padding:'18px', marginTop:8 }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:'#4338ca', marginBottom:6 }}>Grid earnings</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:36, fontWeight:800, color:'#4338ca', marginBottom:14 }}>${Math.round(gridTotal).toLocaleString()}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14 }}>
                <span style={{ color:'#475569' }}>Direct sponsor (40%)</span>
                <span style={{ fontWeight:700, color:'#0f172a' }}>${Math.round(directComm).toLocaleString()}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14 }}>
                <span style={{ color:'#475569' }}>Uni-level (6.25% × {team})</span>
                <span style={{ fontWeight:700, color:'#0f172a' }}>${Math.round(uniLevel).toLocaleString()}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, borderTop:'1px solid #c7d2fe', paddingTop:8 }}>
                <span style={{ color:'#475569' }}>Completion bonus</span>
                <span style={{ fontFamily:'Sora,sans-serif', fontWeight:800, color:'#4338ca' }}>${TIER_BONUSES[tier].toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:10, textAlign:'center' }}>Paid to Campaign Wallet — requires active tier + daily watch quota</div>
        </div>
      </div>

    </AppLayout>
  );
}

function StreamCard(props) {
  var Icon = props.Icon;
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'24px 28px', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
        <div style={{ width:52, height:52, borderRadius:12, background:props.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={26} color={props.iconColor}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'#0f172a' }}>{props.title}</div>
          <div style={{ fontSize:14, color:'#64748b' }}>{props.subtitle}</div>
        </div>
        {props.badge ? (
          <div style={{ padding:'6px 16px', borderRadius:20, background:'rgba(245,158,11,.08)', fontSize:14, fontWeight:700, color:'#d97706' }}>{props.badge}</div>
        ) : props.statVal ? (
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:26, fontWeight:800, color:props.statColor }}>{props.statVal}</div>
            {props.statLabel && <div style={{ fontSize:13, color:'#64748b' }}>{props.statLabel}</div>}
          </div>
        ) : null}
      </div>
      {props.children}
    </div>
  );
}

function FlowArrow(props) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr auto 1fr', alignItems:'center', gap:0, margin:'0 0 18px' }}>
      {props.steps.map(function(s, i) {
        return <div key={i} style={{ display:'contents' }}>
          {i > 0 && <div style={{ textAlign:'center', fontSize:24, color:'#cbd5e1', padding:'0 4px' }}>→</div>}
          <div style={{ background:s.bg || '#f8fafc', border:'1px solid '+(s.border || '#f1f5f9'), borderRadius:12, padding:'20px 14px', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0f172a' }}>{s.title}</div>
            <div style={{ fontSize:14, color:s.color || '#64748b', marginTop:5, fontWeight:600 }}>{s.sub}</div>
          </div>
        </div>;
      })}
    </div>
  );
}

function SliderRow(props) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:14, fontWeight:600, color:'#475569', marginBottom:8 }}>{props.label}</div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <input type="range" min={props.min} max={props.max} step={props.step || 1} value={props.value}
          onChange={function(e) { props.onChange(parseInt(e.target.value)); }}
          style={{ flex:1, accentColor:'#6366f1' }}/>
        <span style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:700, minWidth:36, textAlign:'right', color:'#0f172a' }}>{props.display}</span>
      </div>
    </div>
  );
}

function CalcRow(props) {
  var pct = props.total > 0 ? (props.value / props.total * 100) : 0;
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <span style={{ fontSize:14, color:'#64748b' }}>{props.label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:70, height:5, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
          <div style={{ width:Math.min(100, pct) + '%', height:5, background:props.color, borderRadius:3 }}/>
        </div>
        <span style={{ fontFamily:'Sora,sans-serif', fontSize:15, fontWeight:700, minWidth:52, textAlign:'right', color:'#0f172a' }}>${Math.round(props.value).toLocaleString()}</span>
      </div>
    </div>
  );
}

function CompPlanHelp(props) {
  var [open, setOpen] = useState(null);
  var sections = [
    { title:'How do I earn from memberships?', desc:'When someone joins SuperAdPro through your referral link, you earn 50% of their membership fee. Basic ($20/mo) pays you $10, Pro ($35/mo) pays you $17.50. This is recurring — you earn every month they stay active. No campaign tier required.' },
    { title:'How does the 8×8 grid work?', desc:'When you activate a Campaign Tier, you get an 8×8 grid (64 positions). Your personal referrals and their referrals (spillover) fill the grid. You earn 40% direct sponsor commission, 6.25% uni-level from 8 levels deep, and a 5% completion bonus when the grid fills all 64 positions.' },
    { title:'What is the difference between wallets?', desc:'Your Affiliate Wallet holds membership and SuperScene commissions — always withdrawable. Your Campaign Wallet holds grid commissions — requires an active tier and daily Watch-to-Earn quota to withdraw.' },
    { title:'How do SuperScene earnings work?', desc:'Every time someone you referred uses SuperScene AI tools (video, images, music), you earn $0.025 per credit they consume. This accumulates automatically as passive income in your Affiliate Wallet.' },
    { title:'What are Campaign Tiers?', desc:'Campaign Tiers (T1-T8, $20-$1,000) activate your participation in the 8×8 Income Grid. Higher tiers unlock more daily campaign video views and larger grid completion bonuses. You must also watch your daily video quota to keep campaign earnings active.' },
    { title:'How does Pay It Forward work?', desc:'Pay $20 from your wallet to gift someone a Basic membership. You become their sponsor and earn referral commissions on everything they do. When they earn $20+, they are prompted to pay it forward too — creating a chain of organic growth.' },
    { title:'What is the course marketplace?', desc:'Coming soon. Create and sell courses on the marketplace. Keep 100% of your first sale. Subsequent sales pass up to your sponsor in a cascade. The deeper your network, the more pass-ups flow to you.' },
  ];
  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, margin:0 }}>Compensation plan FAQ</h2>
          <p style={{ margin:'2px 0 0', fontSize:13, color:'#64748b' }}>Understanding how you earn with SuperAdPro</p>
        </div>
        <button onClick={props.onBack} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontSize:12, fontWeight:600, color:'#64748b', fontFamily:'inherit' }}>← Back</button>
      </div>
      {sections.map(function(s, i) {
        var isOpen = open === i;
        return <div key={i} style={{ marginBottom:8 }}>
          <div onClick={function() { setOpen(isOpen ? null : i); }}
            style={{ padding:'14px 18px', background:'#fff', border:'1px solid #e2e8f0', borderRadius: isOpen ? '12px 12px 0 0' : 12, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>{s.title}</span>
            <span style={{ color:'#94a3b8', transform: isOpen ? 'rotate(90deg)' : 'none', transition:'transform .2s', fontSize:14 }}>▸</span>
          </div>
          {isOpen && <div style={{ padding:'0 18px 14px', background:'#fff', border:'1px solid #e2e8f0', borderTop:'none', borderRadius:'0 0 12px 12px', fontSize:13, color:'#475569', lineHeight:1.8 }}>{s.desc}</div>}
        </div>;
      })}
    </div>
  );
}
