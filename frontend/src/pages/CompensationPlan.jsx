import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import CustomSelect from '../components/ui/CustomSelect';
import { Users, Zap, Layers, GraduationCap, ChevronLeft, ChevronRight, ArrowRight, ChevronDown, Check } from 'lucide-react';

var TIER_PRICES = [20, 50, 100, 200, 400, 600, 800, 1000];
var TIER_NAMES = ['Starter','Builder','Pro','Advanced','Elite','Premium','Executive','Ultimate'];
var TIER_CREDITS = [100, 250, 500, 1000, 2000, 3000, 4000, 5000];
var TIER_GRADS = [
  'linear-gradient(135deg,#064e3b,#10b981)', 'linear-gradient(135deg,#1e3a5f,#3b82f6)',
  'linear-gradient(135deg,#172554,#8b5cf6)', 'linear-gradient(135deg,#831843,#ec4899)',
  'linear-gradient(135deg,#134e4a,#2dd4bf)', 'linear-gradient(135deg,#6b7280,#d1d5db)',
  'linear-gradient(135deg,#78350f,#fbbf24)', 'linear-gradient(135deg,#450a0a,#ef4444)',
];

var PACK_EMOJIS = ['🚀','🔨','⚡','🚀','💎','🚀','🚀','👑'];
var PACK_GRADIENTS = [
  'linear-gradient(135deg,#312e81,#6366f1)','linear-gradient(135deg,#0c4a6e,#0ea5e9)',
  'linear-gradient(135deg,#4c1d95,#8b5cf6)','linear-gradient(135deg,#831843,#ec4899)',
  'linear-gradient(135deg,#78350f,#f59e0b)','linear-gradient(135deg,#134e4a,#14b8a6)',
  'linear-gradient(135deg,#1e3a5f,#3b82f6)','linear-gradient(135deg,#7f1d1d,#ef4444)',
];
var PACK_OPTIONS = TIER_NAMES.map(function(n, i) {
  return { value: String(i), label: n, price: TIER_PRICES[i], credits: TIER_CREDITS[i], emoji: PACK_EMOJIS[i], gradient: PACK_GRADIENTS[i] };
});

var STREAMS_BASE = [
  { id:'membership', num:'1', Icon:Users, color:'var(--sap-green)', bg:'var(--sap-green-bg-mid)', link:'/network' },
  { id:'grid', num:'2', Icon:Zap, color:'var(--sap-indigo)', bg:'#eef2ff', link:'/grid-visualiser' },
  { id:'matrix', num:'3', Icon:Layers, color:'var(--sap-purple)', bg:'var(--sap-purple-pale)', link:'/nexus-visualiser' },
  { id:'courses', num:'4', Icon:GraduationCap, color:'var(--sap-amber)', bg:'var(--sap-amber-bg)', link:'/courses', comingSoon:true },
];


export default function CompensationPlan() {
  var { t } = useTranslation();
  var [activeIdx, setActiveIdx] = useState(0);

  useEffect(function() { window.scrollTo(0, 0); }, []);

  var STREAMS = STREAMS_BASE.map(function(s) {
    var titles = {
      membership: { title: t('compPlan.membershipReferrals'), shortTitle: t('compPlan.membership'), linkLabel: t('compPlan.viewReferrals') },
      grid: { title: t('compPlan.campaignGrid'), shortTitle: t('compPlan.campaignGridShort'), linkLabel: t('compPlan.viewYourGrid') },
      matrix: { title: t('compPlan.profitNexus'), shortTitle: t('compPlan.profitNexus'), linkLabel: t('compPlan.viewYourNexus') },
      courses: { title: t('compPlan.courseMarketplace'), shortTitle: t('compPlan.courses'), linkLabel: t('compPlan.comingSoon') },
    };
    return Object.assign({}, s, titles[s.id]);
  });
  var [matrixPack, setMatrixPack] = useState('2');
  var [matrixDirect, setMatrixDirect] = useState(3);
  var [matrixSpill, setMatrixSpill] = useState(36);

  var maxSpill = 39 - matrixDirect;
  if (matrixSpill > maxSpill) setMatrixSpill(maxSpill);

  var s = STREAMS[activeIdx];

  return (
    <AppLayout title={t("compPlan.title")} subtitle={t("compPlan.subtitle")}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:18, padding:'36px 36px 28px', marginBottom:20, textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-50, right:-50, width:200, height:200, borderRadius:'50%', background:'rgba(14,165,233,.08)', pointerEvents:'none' }}/>
        <div style={{ fontSize:12, letterSpacing:3, textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:10 }}>{t('compPlan.heroLabel')}</div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:34, fontWeight:900, color:'#fff', marginBottom:8 }}>{t('compPlan.heroTitle')}</div>
        <div style={{ fontSize:15, color:'rgba(255,255,255,.5)', marginBottom:24, lineHeight:1.6 }}>{t('compPlan.heroDesc')}</div>

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
      <div style={{ display:'flex', gap:4, overflowX:'auto', marginBottom:20, paddingBottom:4, scrollbarWidth:'none', msOverflowStyle:'none' }}>
        {STREAMS.map(function(st, i) {
          var isActive = i === activeIdx;
          return <button key={st.id} onClick={function(){ setActiveIdx(i); }}
            style={{
              display:'flex', alignItems:'center', gap:6, padding:'10px 14px', borderRadius:10,
              border: isActive ? '1.5px solid '+st.color : '1px solid #e2e8f0',
              background: isActive ? st.bg : '#fff',
              cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight: isActive ? 700 : 500,
              color: isActive ? st.color : 'var(--sap-text-muted)', whiteSpace:'nowrap', flexShrink:0,
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
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'var(--sap-text-primary)' }}>{s.title}</div>
            <div style={{ fontSize:14, color:'var(--sap-text-muted)', marginTop:2 }}>{t('compPlan.incomeStream', {num: s.num})}</div>
          </div>
          {s.comingSoon && <div style={{ padding:'6px 16px', borderRadius:20, background:'rgba(245,158,11,.08)', fontSize:14, fontWeight:700, color:'var(--sap-amber-dark)' }}>{t('compPlan.comingSoon')}</div>}
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
                style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:600, color:'var(--sap-text-muted)' }}>
                <ChevronLeft size={16}/> {t('compPlan.previous')}
              </button>
            )}
            {activeIdx < STREAMS.length - 1 && (
              <button onClick={function(){ setActiveIdx(activeIdx + 1); }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:600, color:'var(--sap-text-muted)' }}>
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

      {/* Repurchase Engine — only shown on Grid and Nexus tabs */}
      {(activeIdx === 1 || activeIdx === 2) && <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden', marginTop:20 }}>
        <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', padding:'24px 28px', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ fontSize:32 }}>🔄</div>
          <div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'#fff' }}>{t('compPlan.repurchaseEngine')}</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,.55)', marginTop:2 }}>{t('compPlan.repurchaseSubtitle')}</div>
          </div>
        </div>
        <div style={{ padding:'24px 28px' }}>
          <div style={{ fontSize:15, color:'var(--sap-text-secondary)', lineHeight:1.8, marginBottom:20 }}>
            {t('compPlan.repurchaseDesc')}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
            <div style={{ background:'rgba(99,102,241,.06)', border:'1px solid rgba(99,102,241,.15)', borderRadius:14, padding:'20px' }}>
              <div style={{ fontSize:20, marginBottom:8 }}>⚡</div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:6 }}>{t('compPlan.campaignTiersLabel')}</div>
              <div style={{ fontSize:14, color:'var(--sap-text-secondary)', lineHeight:1.7 }}>{t('compPlan.campaignTiersRepDesc')}</div>
            </div>
            <div style={{ background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.15)', borderRadius:14, padding:'20px' }}>
              <div style={{ fontSize:20, marginBottom:8 }}>🧮</div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:6 }}>{t('compPlan.creditPacksLabel')}</div>
              <div style={{ fontSize:14, color:'var(--sap-text-secondary)', lineHeight:1.7 }}>{t('compPlan.creditPacksRepDesc')}</div>
            </div>
          </div>

          <div style={{ background:'var(--sap-bg-elevated)', borderRadius:12, padding:'18px 22px' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--sap-text-primary)', marginBottom:10 }}>{t('compPlan.howItWorksPractice')}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                t('compPlan.repStep1'),
                t('compPlan.repStep2'),
                t('compPlan.repStep3'),
                t('compPlan.repStep4'),
                t('compPlan.repStep5'),
                t('compPlan.repStep6'),
              ].map(function(item, i) {
                return <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#2563eb', marginTop:8, flexShrink:0 }}/>
                  <div style={{ fontSize:15, color:'var(--sap-text-secondary)', lineHeight:1.7 }}>{item}</div>
                </div>;
              })}
            </div>
          </div>
        </div>
      </div>}

      {/* Two Wallets section */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:'24px 28px', marginTop:20 }}>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:16 }}>{t('compPlan.twoWallets')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
          <div style={{ background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'1px solid #bbf7d0', borderRadius:14, padding:'22px 18px', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'#15803d' }}>{t('compPlan.affiliateWalletTitle')}</div>
            <div style={{ fontSize:13, color:'#166534', marginTop:10, lineHeight:1.6 }}>{t('compPlan.membershipComm')}</div>
            <div style={{ fontSize:13, color:'#166534' }}>{t('compPlan.nexusComm')}</div>
            <div style={{ fontSize:13, color:'#166534' }}>{t('compPlan.courseComm')}</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#15803d', marginTop:10, padding:'6px 14px', background:'rgba(255,255,255,0.6)', borderRadius:8, display:'inline-block' }}>{t('compPlan.alwaysWithdrawable')}</div>
          </div>
          <div style={{ background:'linear-gradient(135deg,#eef2ff,#e0e7ff)', border:'1px solid #c7d2fe', borderRadius:14, padding:'22px 18px', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'#4338ca' }}>{t('compPlan.campaignWalletTitle')}</div>
            <div style={{ fontSize:13, color:'#4338ca', marginTop:10, lineHeight:1.6 }}>{t('compPlan.directSponsor40')}</div>
            <div style={{ fontSize:13, color:'#4338ca' }}>{t('compPlan.uniLevel625')}</div>
            <div style={{ fontSize:13, color:'#4338ca' }}>{t('compPlan.completionBonus5')}</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#4338ca', marginTop:10, padding:'6px 14px', background:'rgba(255,255,255,0.6)', borderRadius:8, display:'inline-block' }}>{t('compPlan.requiresActiveTier')}</div>
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
  var { t } = useTranslation();
  return <>
    <FlowArrow steps={[
      { title:t('compPlan.referralJoins'), sub:t('compPlan.basicOrPro'), bg:'rgba(99,102,241,.06)', border:'rgba(99,102,241,.15)', color:'var(--sap-indigo)' },
      { title:t('compPlan.fiftyToYou'), sub:t('compPlan.tenOrSeventeen'), bg:'rgba(34,197,94,.06)', border:'rgba(34,197,94,.15)', color:'var(--sap-green)' },
      { title:t('compPlan.affiliateWallet'), sub:t('compPlan.withdrawAnytime'), bg:'rgba(14,165,233,.06)', border:'rgba(14,165,233,.15)', color:'var(--sap-accent)' },
    ]}/>

    <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:12 }}>{t('compPlan.commissionBreakdown')}</div>
    <EarnTable headers={[t('compPlan.plan'),t('compPlan.monthly'),t('compPlan.annual'),t('compPlan.yourCommMonthly'),t('compPlan.yourCommAnnual')]} rows={[
      ['Basic','$20/mo','$200/yr','$10/mo','$100 '+t('compPlan.upfront')],
      ['Pro','$35/mo','$350/yr','$17.50/mo','$175 '+t('compPlan.upfront')],
    ]}/>

    <InfoBox items={[
      t('compPlan.memKey1'),
      t('compPlan.memKey2'),
      t('compPlan.memKey3'),
      t('compPlan.memKey4'),
      t('compPlan.memKey5'),
    ]} color="var(--sap-green)"/>
    <div style={{ textAlign:'center', marginTop:12 }}><Link to="/income-disclaimer" style={{ fontSize:13, color:'var(--sap-text-muted)', textDecoration:'none' }}>{t('compPlan.incomeDisclaimer')}</Link></div>
  </>;
}


/* ═══════════════════════════════════════════════════
   STREAM 2: CAMPAIGN GRID
   ═══════════════════════════════════════════════════ */
function GridContent() {
  var { t } = useTranslation();
  return <>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
      <CommBox val="40%" label={t('compPlan.directSponsor')} sub={t('compPlan.yourReferralBuysTier')} gradient="linear-gradient(135deg,#15803d,#22c55e)" color="var(--sap-green)" bg="rgba(34,197,94,.06)" border="rgba(34,197,94,.15)"/>
      <CommBox val="6.25%" label={t('compPlan.eightLevelsDeep')} sub={t('compPlan.earnEntireNetwork')} gradient="linear-gradient(135deg,#1e40af,#3b82f6)" color="var(--sap-indigo)" bg="rgba(99,102,241,.06)" border="rgba(99,102,241,.15)"/>
      <CommBox val="5%" label={t('compPlan.completionBonus')} sub={t('compPlan.gridFills64')} gradient="linear-gradient(135deg,#b45309,#f59e0b)" color="var(--sap-amber-dark)" bg="rgba(245,158,11,.06)" border="rgba(245,158,11,.15)"/>
    </div>

    <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:4 }}>{t('compPlan.eightCampaignTiers')}</div>
    <div style={{ fontSize:12, color:'var(--sap-text-muted)', marginBottom:14 }}>{t('compPlan.clickTierEarnings')}</div>
    <GridTierCards />

    <InfoBox items={[
      t('compPlan.gridKey1'),
      t('compPlan.gridKey2'),
      t('compPlan.gridKey3'),
      t('compPlan.gridKey4'),
      t('compPlan.gridKey5'),
      t('compPlan.gridKey6'),
      t('compPlan.gridKey7'),
    ]} color="var(--sap-indigo)"/>
    <div style={{ textAlign:'center', marginTop:12 }}><Link to="/income-disclaimer" style={{ fontSize:13, color:'var(--sap-text-muted)', textDecoration:'none' }}>{t('compPlan.incomeDisclaimer')}</Link></div>
  </>;
}


/* ═══════════════════════════════════════════════════
   STREAM 3: CREDIT MATRIX
   ═══════════════════════════════════════════════════ */
function MatrixContent(props) {
  var { t } = useTranslation();
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
      <CommBox val="15%" label={t('compPlan.directReferral')} sub={t('compPlan.youRecruited')} gradient="linear-gradient(135deg,#b45309,#f59e0b)" color="var(--sap-amber-dark)" bg="rgba(245,158,11,.06)" border="rgba(245,158,11,.15)"/>
      <CommBox val="10%" label={t('compPlan.autoPlace')} sub={t('compPlan.placedByNetwork')} gradient="linear-gradient(135deg,#15803d,#22c55e)" color="var(--sap-green)" bg="rgba(34,197,94,.06)" border="rgba(34,197,94,.15)"/>
      <CommBox val="10%" label={t('compPlan.completionBonus')} sub={t('compPlan.nexusFills39')} gradient="linear-gradient(135deg,#6d28d9,#a78bfa)" color="var(--sap-purple)" bg="rgba(139,92,246,.06)" border="rgba(139,92,246,.15)"/>
    </div>

    {/* Mini tree */}
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 0', marginBottom:20 }}>
      <div style={{ fontSize:10, color:'var(--sap-text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{t('compPlan.yourNexus39')}</div>
      <div style={{ display:'flex', gap:8 }}><TreeNode type="you" label={t('compPlan.you')}/></div>
      <div style={{ fontSize:10, color:'var(--sap-text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{t('compPlan.goldDirect')}</div>
      <div style={{ display:'flex', gap:8 }}><TreeNode type="direct"/><TreeNode type="direct"/><TreeNode type="direct"/></div>
      <div style={{ fontSize:10, color:'var(--sap-text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{t('compPlan.greenAutoPlace')}</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
        {Array.from({length:9}, function(_,i){ return <TreeNode key={i} type="spill"/>; })}
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', maxWidth:500 }}>
        {Array.from({length:9}, function(_,i){ return <TreeNode key={i} type="spill2"/>; })}
        {Array.from({length:18}, function(_,i){ return <TreeNode key={'e'+i} type="empty"/>; })}
      </div>
    </div>

    <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:4 }}>{t('compPlan.eightCreditPacks')}</div>
    <div style={{ fontSize:12, color:'var(--sap-text-muted)', marginBottom:14 }}>{t('compPlan.clickPackEarnings')}</div>
    <NexusPackCards />

    {/* Calculator */}
    <div style={{ background:'var(--sap-bg-elevated)', border:'1px solid #e2e8f0', borderRadius:16, padding:28, marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <div style={{ width:48, height:48, borderRadius:12, background:'rgba(139,92,246,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🧮</div>
        <div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:17, fontWeight:800, color:'var(--sap-text-primary)' }}>{t('compPlan.nexusCalculator')}</div>
          <div style={{ fontSize:13, color:'var(--sap-text-muted)' }}>{t('compPlan.calcDesc')}</div>
        </div>
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'var(--sap-text-secondary)', marginBottom:8 }}>{t('compPlan.choosePack')}</div>
        <PackSelector value={props.matrixPack} onChange={function(v){ props.setMatrixPack(v); }} options={PACK_OPTIONS}/>
      </div>

      <SliderRow label={t('compPlan.yourDirectReferrals')} value={props.matrixDirect} min={0} max={39} display={props.matrixDirect} color="var(--sap-amber-dark)"
        onChange={function(v){ props.setMatrixDirect(v); if (props.matrixSpill > 39 - v) props.setMatrixSpill(39 - v); }}/>
      <SliderRow label={t('compPlan.autoPlaceFilled')} value={props.matrixSpill} min={0} max={props.maxSpill} display={props.matrixSpill} color="var(--sap-green-mid)"
        onChange={function(v){ props.setMatrixSpill(v); }}/>

      <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:14, padding:24, color:'#fff', marginTop:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>{t('compPlan.totalEarningsNexus')}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{mFilled}/39 filled ({mPct}%)</div>
        </div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:42, fontWeight:900, color:'#4ade80', textAlign:'center', marginBottom:16 }}>${mTotal.toFixed(2)}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          <div style={{ background:'rgba(255,255,255,.08)', borderRadius:10, padding:14, textAlign:'center' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', fontWeight:700, letterSpacing:.5 }}>{t('compPlan.directPercent')}</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'var(--sap-amber-bright)', marginTop:4 }}>${mDirectEarn.toFixed(2)}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{props.matrixDirect} × ${mPrice} × 15%</div>
          </div>
          <div style={{ background:'rgba(255,255,255,.08)', borderRadius:10, padding:14, textAlign:'center' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', fontWeight:700, letterSpacing:.5 }}>{t('compPlan.autoPlacePercent')}</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#4ade80', marginTop:4 }}>${mSpillEarn.toFixed(2)}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{props.matrixSpill} × ${mPrice} × 10%</div>
          </div>
          <div style={{ background: mComplete ? 'rgba(139,92,246,.2)' : 'rgba(255,255,255,.05)', borderRadius:10, padding:14, textAlign:'center', border: mComplete ? '1px solid rgba(139,92,246,.3)' : '1px solid transparent' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', fontWeight:700, letterSpacing:.5 }}>{t('compPlan.bonusPercent')}</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color: mComplete ? '#c084fc' : 'rgba(255,255,255,.2)', marginTop:4 }}>{mComplete ? '$'+mCompletionBonus.toFixed(2) : '🔒'}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>{mComplete ? '39 × $'+mPrice+' × 10%' : t('compPlan.unlocksAt')}</div>
          </div>
        </div>
        <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'rgba(255,255,255,.35)' }}>{t('compPlan.buyAll8')}</div>
      </div>
    </div>

    <InfoBox items={[
      t('compPlan.nexusKey1'),
      t('compPlan.nexusKey2'),
      t('compPlan.nexusKey3'),
      t('compPlan.nexusKey4'),
      t('compPlan.nexusKey5'),
      t('compPlan.nexusKey6'),
      t('compPlan.nexusKey7'),
    ]} color="var(--sap-purple)"/>
    <div style={{ textAlign:'center', marginTop:12 }}><Link to="/income-disclaimer" style={{ fontSize:13, color:'var(--sap-text-muted)', textDecoration:'none' }}>{t('compPlan.incomeDisclaimer')}</Link></div>
  </>;
}


/* ═══════════════════════════════════════════════════
   STREAM 4: COURSES
   ═══════════════════════════════════════════════════ */
function CoursesContent() {
  var { t } = useTranslation();
  return <>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
      <CommBox val="100%" label={t('compPlan.firstSale')} sub={t('compPlan.keepEveryPenny')} gradient="linear-gradient(135deg,#15803d,#22c55e)" color="var(--sap-green)" bg="rgba(34,197,94,.06)" border="rgba(34,197,94,.15)"/>
      <CommBox val="Pass-up" label={t('compPlan.cascadeSystem')} sub={t('compPlan.subsequentSales')} gradient="linear-gradient(135deg,#b45309,#f59e0b)" color="var(--sap-amber)" bg="rgba(245,158,11,.06)" border="rgba(245,158,11,.15)"/>
      <CommBox val="3 Tiers" label="$100 / $300 / $500" sub="Course price points" gradient="linear-gradient(135deg,#6d28d9,#a78bfa)" color="var(--sap-purple)" bg="rgba(139,92,246,.06)" border="rgba(139,92,246,.15)"/>
    </div>

    <InfoBox items={[
      t('compPlan.courseKey1'),
      t('compPlan.courseKey2'),
      t('compPlan.courseKey3'),
      t('compPlan.courseKey4'),
      t('compPlan.courseKey5'),
      t('compPlan.courseKey6'),
    ]} color="var(--sap-amber)"/>
  </>;
}


/* ── Grid Clickable Tier Cards ── */
function GridTierCards() {
  var { t } = useTranslation();
  var [selected, setSelected] = useState(null);

  return <>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
      {TIER_NAMES.map(function(n, i) {
        var isActive = selected === i;
        var price = TIER_PRICES[i];
        var direct40 = (price * 0.40).toFixed(2);
        var uniLevel = (price * 0.0625).toFixed(2);
        var uniTotal = (price * 0.0625 * 8).toFixed(2);
        var bonus5 = (price * 0.05 * 64).toFixed(2);
        var totalGrid = (price * 0.40 + price * 0.0625 * 8 * 64 + price * 0.05 * 64).toFixed(2);

        return <div key={i}>
          <div onClick={function(){ setSelected(isActive ? null : i); }}
            style={{
              background: TIER_GRADS[i], borderRadius:14, padding:'16px 12px', textAlign:'center', color:'#fff',
              cursor:'pointer', transition:'all 0.2s', position:'relative', overflow:'hidden',
              transform: isActive ? 'scale(1.03)' : 'scale(1)',
              boxShadow: isActive ? '0 8px 24px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.1)',
              border: isActive ? '2px solid rgba(255,255,255,0.4)' : '2px solid transparent',
            }}>
            <div style={{position:'absolute',top:-15,right:-15,width:50,height:50,borderRadius:'50%',background:'rgba(255,255,255,0.08)',pointerEvents:'none'}}/>
            <div style={{ fontSize:11, fontWeight:600, opacity:.75 }}>{n}</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:900, margin:'4px 0' }}>${price}</div>
            <div style={{ fontSize:9, opacity:.5, marginTop:2 }}>{isActive ? '▲ tap to close' : '▼ tap for earnings'}</div>
          </div>

          {isActive && <div style={{
            background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px', marginTop:8,
            boxShadow:'0 4px 16px rgba(0,0,0,0.08)', animation:'fadeIn 0.2s ease-out',
          }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
              <div style={{ background:'rgba(34,197,94,.06)', borderRadius:10, padding:'10px', textAlign:'center' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'var(--sap-green)', textTransform:'uppercase', letterSpacing:1 }}>Direct 40%</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:900, color:'var(--sap-green)', marginTop:4 }}>${direct40}</div>
              </div>
              <div style={{ background:'rgba(99,102,241,.06)', borderRadius:10, padding:'10px', textAlign:'center' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'var(--sap-indigo)', textTransform:'uppercase', letterSpacing:1 }}>Uni-Level 6.25%</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:900, color:'var(--sap-indigo)', marginTop:4 }}>${uniLevel}</div>
                <div style={{ fontSize:9, color:'var(--sap-text-muted)' }}>× 8 levels</div>
              </div>
              <div style={{ background:'rgba(245,158,11,.06)', borderRadius:10, padding:'10px', textAlign:'center' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'var(--sap-amber-dark)', textTransform:'uppercase', letterSpacing:1 }}>Bonus 5%</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:900, color:'var(--sap-amber-dark)', marginTop:4 }}>${bonus5}</div>
                <div style={{ fontSize:9, color:'var(--sap-text-muted)' }}>64 positions</div>
              </div>
            </div>
          </div>}
        </div>;
      })}
    </div>
  </>;
}


/* ── Nexus Clickable Pack Cards ── */
function PackSelector({ value, onChange, options }) {
  var [open, setOpen] = useState(false);
  var ref = useRef(null);
  useEffect(function() {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return function() { document.removeEventListener('mousedown', h); };
  }, []);
  var sel = options.find(function(o) { return o.value === value; });
  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      <div onClick={function(){ setOpen(!open); }}
        style={{ padding:'12px 16px', borderRadius:12, border: open?'2px solid #6366f1':'2px solid #e2e8f0',
          background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:12,
          boxShadow: open?'0 0 0 3px rgba(99,102,241,.1)':'none', transition:'all .15s' }}>
        {sel && <div style={{ width:36, height:36, borderRadius:10, background:sel.gradient, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{sel.emoji}</div>}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>{sel ? sel.label : 'Select a pack...'}</div>
          {sel && <div style={{ fontSize:12, color:'#64748b' }}>${sel.price} · {sel.credits.toLocaleString()} credits</div>}
        </div>
        <ChevronDown size={16} color="#64748b" style={{ flexShrink:0, transition:'transform .2s', transform: open?'rotate(180deg)':'none' }}/>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'#fff', border:'1.5px solid #e2e8f0',
          borderRadius:12, boxShadow:'0 12px 32px rgba(0,0,0,.12)', zIndex:999, maxHeight:360, overflowY:'auto',
          animation:'slDropIn .15s ease-out' }}>
          <style>{'@keyframes slDropIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}'}</style>
          {options.map(function(o) {
            var isSel = o.value === value;
            return (
              <div key={o.value} onClick={function(){ onChange(o.value); setOpen(false); }}
                onMouseEnter={function(e){ if(!isSel) e.currentTarget.style.background='#f8fafc'; }}
                onMouseLeave={function(e){ if(!isSel) e.currentTarget.style.background=isSel?'#eef2ff':'transparent'; }}
                style={{ padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:12,
                  background: isSel?'#eef2ff':'transparent', borderBottom:'1px solid #f1f5f9', transition:'background .1s' }}>
                <div style={{ width:34, height:34, borderRadius:9, background:o.gradient, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{o.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:isSel?700:500, color:isSel?'#4f46e5':'#0f172a' }}>{o.label}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>${o.price} · {o.credits.toLocaleString()} credits</div>
                </div>
                {isSel && <Check size={16} color="#6366f1"/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NexusPackCards() {
  var { t } = useTranslation();
  var [selected, setSelected] = useState(null);

  return <>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
      {TIER_NAMES.map(function(n, i) {
        var isActive = selected === i;
        var price = TIER_PRICES[i];
        var credits = TIER_CREDITS[i];
        var directEarn = (price * 0.15).toFixed(2);
        var autoEarn = (price * 0.10).toFixed(2);
        var totalIf39 = (3 * price * 0.15 + 36 * price * 0.10 + 39 * price * 0.10).toFixed(2);

        return <div key={i}>
          <div onClick={function(){ setSelected(isActive ? null : i); }}
            style={{
              background: TIER_GRADS[i], borderRadius:14, padding:'16px 12px', textAlign:'center', color:'#fff',
              cursor:'pointer', transition:'all 0.2s', position:'relative', overflow:'hidden',
              transform: isActive ? 'scale(1.03)' : 'scale(1)',
              boxShadow: isActive ? '0 8px 24px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.1)',
              border: isActive ? '2px solid rgba(255,255,255,0.4)' : '2px solid transparent',
            }}>
            <div style={{position:'absolute',top:-15,right:-15,width:50,height:50,borderRadius:'50%',background:'rgba(255,255,255,0.08)',pointerEvents:'none'}}/>
            <div style={{ fontSize:11, fontWeight:600, opacity:.75 }}>{n}</div>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:900, margin:'4px 0' }}>${price}</div>
            <div style={{ fontSize:10, opacity:.55 }}>{credits.toLocaleString()} credits</div>
            <div style={{ fontSize:9, opacity:.5, marginTop:4 }}>{isActive ? '▲ tap to close' : '▼ tap for earnings'}</div>
          </div>

          {isActive && <div style={{
            background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px', marginTop:8,
            boxShadow:'0 4px 16px rgba(0,0,0,0.08)', animation:'fadeIn 0.2s ease-out',
          }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
              <div style={{ background:'rgba(245,158,11,.06)', borderRadius:10, padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--sap-amber-dark)', textTransform:'uppercase', letterSpacing:1 }}>Direct (15%)</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:900, color:'var(--sap-amber-dark)', marginTop:4 }}>${directEarn}</div>
                <div style={{ fontSize:10, color:'var(--sap-text-muted)', marginTop:2 }}>per referral</div>
              </div>
              <div style={{ background:'rgba(34,197,94,.06)', borderRadius:10, padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--sap-green)', textTransform:'uppercase', letterSpacing:1 }}>Auto-place (10%)</div>
                <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:900, color:'var(--sap-green)', marginTop:4 }}>${autoEarn}</div>
                <div style={{ fontSize:10, color:'var(--sap-text-muted)', marginTop:2 }}>per position</div>
              </div>
            </div>
            <div style={{ background:'linear-gradient(135deg,#172554,#1e3a8a)', borderRadius:10, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:1 }}>Full nexus (39 positions)</div>
              <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:900, color:'#4ade80', marginTop:4 }}>${totalIf39}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginTop:2 }}>3 direct + 36 auto-place + completion</div>
            </div>
          </div>}
        </div>;
      })}
    </div>
    <style>{'@keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}'}</style>
  </>;
}


/* ── Shared Components ── */

function FlowArrow(props) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr auto 1fr', alignItems:'center', gap:0, marginBottom:20 }}>
      {props.steps.map(function(s, i) {
        return <div key={i} style={{ display:'contents' }}>
          {i > 0 && <div style={{ textAlign:'center', padding:'0 6px', color:'var(--sap-text-faint)' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
          <div style={{ background:s.bg, border:'1px solid '+s.border, borderRadius:14, padding:'20px 16px', textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'var(--sap-text-primary)' }}>{s.title}</div>
            <div style={{ fontSize:13, marginTop:6, fontWeight:700, color:s.color }}>{s.sub}</div>
          </div>
        </div>;
      })}
    </div>
  );
}

function CommBox(props) {
  var grad = props.gradient || props.bg;
  var isGrad = grad && grad.includes('gradient');
  return (
    <div style={{ background:isGrad?grad:props.bg, border:isGrad?'none':'1px solid '+props.border, borderRadius:14, padding:'20px 16px', textAlign:'center', position:'relative', overflow:'hidden' }}>
      {isGrad && <div style={{position:'absolute',top:-20,right:-20,width:60,height:60,borderRadius:'50%',background:'rgba(255,255,255,0.1)',pointerEvents:'none'}}/>}
      <div style={{ fontFamily:'Sora,sans-serif', fontSize:30, fontWeight:900, color:isGrad?'#fff':props.color, lineHeight:1 }}>{props.val}</div>
      <div style={{ fontSize:13, fontWeight:700, color:isGrad?'rgba(255,255,255,0.9)':'var(--sap-text-primary)', marginTop:8 }}>{props.label}</div>
      <div style={{ fontSize:11, color:isGrad?'rgba(255,255,255,0.6)':'var(--sap-text-muted)', marginTop:3 }}>{props.sub}</div>
    </div>
  );
}

function EarnTable(props) {
  return (
    <div style={{ marginBottom:14, borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr style={{background:'#f8fafc'}}>{props.headers.map(function(h, i) {
          return <th key={i} style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:1, padding:'12px 16px', textAlign: i === props.headers.length-1 ? 'right' : 'left', borderBottom:'1px solid #e2e8f0' }}>{h}</th>;
        })}</tr></thead>
        <tbody>{props.rows.map(function(row, ri) {
          var isLast = ri === props.rows.length - 1;
          return <tr key={ri} style={{background: ri%2===0?'#fff':'#fafbfd', transition:'background 0.15s'}} onMouseEnter={function(e){e.currentTarget.style.background='#f0f9ff'}} onMouseLeave={function(e){e.currentTarget.style.background=ri%2===0?'#fff':'#fafbfd'}}>{row.map(function(cell, ci) {
            return <td key={ci} style={{ fontSize:14, padding:'13px 16px', borderBottom: isLast ? 'none' : '1px solid #f1f5f9', textAlign: ci === row.length-1 ? 'right' : 'left', fontFamily: ci === row.length-1 ? 'Sora,sans-serif' : 'inherit', fontWeight: (ci === row.length-1 || (isLast && props.boldLast)) ? 800 : ci===0?600:400, color: ci === row.length-1 ? '#0f172a' : 'var(--sap-text-primary)' }}>{cell}</td>;
          })}</tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function InfoBox(props) {
  var { t } = useTranslation();
  return (
    <div style={{ background:'var(--sap-bg-elevated)', borderRadius:12, padding:'18px 22px', marginTop:16 }}>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--sap-text-primary)', marginBottom:10 }}>{t('compPlan.keyThings')}</div>
      {props.items.map(function(item, i) {
        return <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom: i < props.items.length - 1 ? 10 : 0 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:props.color, marginTop:8, flexShrink:0 }}/>
          <div style={{ fontSize:15, color:'var(--sap-text-secondary)', lineHeight:1.7 }}>{item}</div>
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
    empty:  { background:'var(--sap-bg-page)', border:'2px dashed #e2e8f0', color:'var(--sap-text-faint)' },
  };
  var s = styles[props.type] || styles.empty;
  var label = props.type === 'you' ? (props.label || 'You') : props.type === 'direct' ? '★' : props.type === 'empty' ? '' : '↓';
  return <div style={{ width:44, height:44, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, ...s }}>{label}</div>;
}

function SliderRow(props) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:14, fontWeight:600, color:'var(--sap-text-secondary)' }}>{props.label}</span>
        <span style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:700, color:'var(--sap-text-primary)' }}>{props.display}</span>
      </div>
      <input type="range" min={props.min} max={props.max} value={props.value}
        onChange={function(e){ props.onChange(parseInt(e.target.value)); }}
        style={{ width:'100%', accentColor: props.color || 'var(--sap-indigo)' }}/>
    </div>
  );
}
