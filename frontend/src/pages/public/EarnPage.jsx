import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { formatMoney } from '../../utils/money';

var IncomeGrid3D = lazy(function() { return import('../../components/IncomeGrid3D'); });

function Grid3DSection() {
  return (
    <Suspense fallback={<div style={{height:500,borderRadius:16,background:'var(--sap-cobalt-deep)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--sap-accent-light)',fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:700}}>{t('earnPage.loading3D')}</div>}>
      <IncomeGrid3D height={520} showControls autoPlay />
    </Suspense>
  );
}

var cyan = 'var(--sap-accent-light)';
var dark = 'var(--sap-cobalt-deep)';

var CSS = `
@keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
@keyframes hpFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes earnPulse { 0%,100%{opacity:.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
@keyframes earnSlide { 0%{transform:translateX(-100%);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translateX(200%);opacity:0} }
@keyframes countUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes twinkle { 0%,100%{opacity:.15} 50%{opacity:.7} }
.earn-fade1{opacity:0;animation:fadeUp .7s ease forwards .1s}
.earn-fade2{opacity:0;animation:fadeUp .7s ease forwards .2s}
.earn-fade3{opacity:0;animation:fadeUp .7s ease forwards .3s}
.earn-fade4{opacity:0;animation:fadeUp .7s ease forwards .4s}
.earn-fade5{opacity:0;animation:fadeUp .7s ease forwards .5s}
.earn-card{transition:transform .25s,box-shadow .25s}
.earn-card:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,.4)!important}
.earn-btn-p{font-weight:800;font-size:16px;color:#172554;background:linear-gradient(135deg,#38bdf8,#0ea5e9);padding:14px 36px;border-radius:10px;text-decoration:none;box-shadow:0 0 32px rgba(0,212,255,.35);transition:all .3s;cursor:pointer;border:none;font-family:inherit;display:inline-block}
.earn-btn-p:hover{box-shadow:0 0 50px rgba(0,212,255,.55);transform:translateY(-2px)}
.earn-btn-o{font-weight:600;font-size:15px;color:#fff;background:rgba(255,255,255,.06);padding:13px 32px;border-radius:10px;border:1px solid rgba(255,255,255,.15);text-decoration:none;transition:all .3s;display:inline-block}
.earn-btn-o:hover{border-color:#38bdf8;color:#38bdf8}
.stream-item{display:flex;align-items:flex-start;gap:16px;padding:20px 24px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;transition:all .25s;cursor:default}
.stream-item:hover{background:rgba(255,255,255,.05);border-color:rgba(56,189,248,.15);transform:translateX(4px)}
.step-num{width:40px;height:40px;border-radius:50%;background:rgba(56,189,248,.1);border:2px solid rgba(56,189,248,.3);display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-size:16px;font-weight:900;color:#38bdf8;flex-shrink:0}
@media(max-width:768px){
  .earn-two{grid-template-columns:1fr!important}
  .earn-three{grid-template-columns:1fr!important}
  .earn-four{grid-template-columns:1fr 1fr!important}
  .earn-hero-btns{flex-direction:column;align-items:center}
  .earn-nav{padding:0 16px!important}
}
`;

// Animated counter
function Counter({ target, prefix = '', suffix = '', duration = 1500 }) {
  var [val, setVal] = useState(0);
  var ref = useRef(null);
  var started = useRef(false);

  useEffect(function() {
    var observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        var start = 0;
        var step = target / (duration / 16);
        var timer = setInterval(function() {
          start = Math.min(start + step, target);
          setVal(Math.round(start));
          if (start >= target) clearInterval(timer);
        }, 16);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return function() { observer.disconnect(); };
  }, [target, duration]);

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

// Social proof toast
var JOINERS = [
  {name:'James O.',country:'Nigeria',flag:'🇳🇬'},{name:'Sarah K.',country:'UK',flag:'🇬🇧'},
  {name:'Maria L.',country:'Philippines',flag:'🇵🇭'},{name:'Ahmed R.',country:'UAE',flag:'🇦🇪'},
  {name:'Priya S.',country:'India',flag:'🇮🇳'},{name:'Carlos M.',country:'Brazil',flag:'🇧🇷'},
  {name:'Anna P.',country:'Germany',flag:'🇩🇪'},{name:'Chen W.',country:'Singapore',flag:'🇸🇬'},
];

function Toast() {
  var [visible, setVisible] = useState(false);
  var [joiner, setJoiner] = useState(null);
  var idx = useRef(0);
  useEffect(function() {
    var list = [...JOINERS].sort(function(){return Math.random()-.5;});
    function show() {
      setJoiner(list[idx.current % list.length]); idx.current++;
      setVisible(true);
      setTimeout(function(){setVisible(false);}, 4500);
    }
    var t = setTimeout(show, 6000);
    var iv = setInterval(show, 22000);
    return function(){clearTimeout(t);clearInterval(iv);};
  }, []);
  if (!joiner) return null;
  return (
    <div style={{position:'fixed',bottom:24,left:24,zIndex:9999,background:'rgba(10,10,26,.97)',border:'1px solid rgba(56,189,248,.2)',borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 8px 32px rgba(0,0,0,.5)',minWidth:240,maxWidth:300,transform:visible?'translateX(0)':'translateX(-120%)',transition:'transform .4s cubic-bezier(.34,1.56,.64,1)'}}>
      <div style={{fontSize:24}}>{joiner.flag}</div>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:1}}>{joiner.name} from {joiner.country}</div>
        <div style={{fontSize:11,color:'rgba(200,220,255,.55)'}}>{t('earnPage.justJoined')}</div>
      </div>
      <div style={{width:7,height:7,borderRadius:'50%',background:'var(--sap-green-bright)',boxShadow:'0 0 8px #22c55e',marginLeft:'auto',flexShrink:0}}/>
    </div>
  );
}

// Earnings Calculator / Simulator
function EarningsCalculator({ onJoin }) {
  // Membership calculator state
  var [memRefs, setMemRefs] = useState(5);
  var [memProRatio, setMemProRatio] = useState(30);

  // Grid calculator state
  var [gridTier, setGridTier] = useState(3);
  var [gridDirectRefs, setGridDirectRefs] = useState(5);
  var [gridL2Refs, setGridL2Refs] = useState(3);

  // Membership calculations
  var memProCount = Math.round(memRefs * memProRatio / 100);
  var memBasicCount = memRefs - memProCount;
  var memBasicEarn = memBasicCount * 10;
  var memProEarn = memProCount * 17.50;
  var memTotal = memBasicEarn + memProEarn;

  // Grid calculations
  var gridPrices = { 1: 20, 2: 50, 3: 100, 4: 200, 5: 400, 6: 600, 7: 800, 8: 1000 };
  var gridNames = { 1: 'Starter', 2: 'Builder', 3: 'Pro', 4: 'Advanced', 5: 'Elite', 6: 'Premium', 7: 'Executive', 8: 'Ultimate' };
  var gPrice = gridPrices[gridTier];
  var gDirect = gPrice * 0.40;
  var gUniLevel = gPrice * 0.0625;
  var gBonus = gPrice * 0.05 * 64;
  var gDirectTotal = gridDirectRefs * gDirect;
  var gL2Total = gridDirectRefs * gridL2Refs;
  var gUniTotal = gL2Total * gUniLevel;
  var gPerGrid = (gUniLevel * 64) + gBonus;

  var sliderTrack = function(val, max) {
    return { background: 'linear-gradient(90deg, #38bdf8 ' + (val/max*100) + '%, rgba(255,255,255,.1) ' + (val/max*100) + '%)' };
  };
  var ss = {width:'100%',height:6,borderRadius:3,appearance:'none',WebkitAppearance:'none',outline:'none',cursor:'pointer'};

  return (
    <div>
      <style>{`
        .ecalc-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#38bdf8);cursor:pointer;box-shadow:0 2px 10px rgba(14,165,233,.5);border:2px solid #fff}
        .ecalc-slider::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#38bdf8);cursor:pointer;box-shadow:0 2px 10px rgba(14,165,233,.5);border:2px solid #fff}
      `}</style>

      {/* ── MEMBERSHIP CALCULATOR ── */}
      <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(16,185,129,.15)',borderRadius:18,overflow:'hidden',marginBottom:24}}>
        <div style={{background:'linear-gradient(135deg,rgba(16,185,129,.12),rgba(16,185,129,.04))',padding:'16px 24px',borderBottom:'1px solid rgba(16,185,129,.1)'}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#34d399',marginBottom:4}}>{t('earnPage.monthlyRecurring')}</div>
          <div style={{fontSize:16,fontWeight:800,color:'#fff'}}>{t('earnPage.membershipCommissions')}</div>
          <div style={{fontSize:11,color:'rgba(200,220,255,.4)',marginTop:2}}>{t('earnPage.membershipDescBody')}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:220}}>
          {/* Controls */}
          <div style={{padding:'24px',borderRight:'1px solid rgba(255,255,255,.04)'}}>
            <div style={{marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:'rgba(200,220,255,.6)'}}>{t('earnPage.yourDirectReferrals')}</span>
                <span style={{fontSize:16,fontWeight:900,color:'#34d399'}}>{memRefs}</span>
              </div>
              <input type="range" min={1} max={100} value={memRefs} onChange={function(e){setMemRefs(parseInt(e.target.value));}}
                className="ecalc-slider" style={Object.assign({}, ss, sliderTrack(memRefs, 100))}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,.2)',marginTop:3}}>
                <span>1</span><span>100</span>
              </div>
            </div>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:'rgba(200,220,255,.6)'}}>{t('earnPage.proMembersPercent')}</span>
                <span style={{fontSize:16,fontWeight:900,color:'#34d399'}}>{memProRatio}%</span>
              </div>
              <input type="range" min={0} max={100} value={memProRatio} onChange={function(e){setMemProRatio(parseInt(e.target.value));}}
                className="ecalc-slider" style={Object.assign({}, ss, sliderTrack(memProRatio, 100))}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,.2)',marginTop:3}}>
                <span>0%</span><span>100%</span>
              </div>
            </div>
          </div>
          {/* Results */}
          <div style={{padding:'24px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,background:'rgba(16,185,129,.06)',border:'1px solid rgba(16,185,129,.1)',marginBottom:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#34d399'}}>Basic referrals ({memBasicCount})</div>
                <div style={{fontSize:10,color:'rgba(200,220,255,.35)'}}>{t('earnPage.basicCalc')}</div>
              </div>
              <div style={{fontSize:20,fontWeight:900,color:'#34d399'}}>${memBasicEarn}</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,background:'rgba(139,92,246,.06)',border:'1px solid rgba(139,92,246,.1)',marginBottom:12}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'var(--sap-purple-light)'}}>Pro referrals ({memProCount})</div>
                <div style={{fontSize:10,color:'rgba(200,220,255,.35)'}}>{t('earnPage.proCalc')}</div>
              </div>
              <div style={{fontSize:20,fontWeight:900,color:'var(--sap-purple-light)'}}>${memProEarn.toFixed(0)}</div>
            </div>
            <div style={{padding:'14px 16px',borderRadius:12,background:'linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05))',border:'1px solid rgba(16,185,129,.2)',textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#34d399'}}>{t('earnPage.monthlyRecurringIncome')}</div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:40,fontWeight:900,color:'#fff'}}>${memTotal.toFixed(0)}</div>
              <div style={{fontSize:10,color:'rgba(200,220,255,.35)'}}>{t('earnPage.perMonthRecurring')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GRID CALCULATOR ── */}
      <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(56,189,248,.12)',borderRadius:18,overflow:'hidden',marginBottom:24}}>
        <div style={{background:'linear-gradient(135deg,rgba(56,189,248,.12),rgba(56,189,248,.04))',padding:'16px 24px',borderBottom:'1px solid rgba(56,189,248,.1)'}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'var(--sap-accent-light)',marginBottom:4}}>{t('earnPage.perPurchase')}</div>
          <div style={{fontSize:16,fontWeight:800,color:'#fff'}}>{t('earnPage.gridCommissions')}</div>
          <div style={{fontSize:11,color:'rgba(200,220,255,.4)',marginTop:2}}>{t("earnPage.perPurchaseDesc")}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:320}}>
          {/* Controls */}
          <div style={{padding:'24px',borderRight:'1px solid rgba(255,255,255,.04)'}}>
            {/* Tier selector */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:700,color:'rgba(200,220,255,.6)',marginBottom:8}}>{t('earnPage.campaignTier')}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                {[1,2,3,4,5,6,7,8].map(function(t) {
                  var on = gridTier === t;
                  return (
                    <button key={t} onClick={function(){setGridTier(t);}}
                      style={{padding:'8px 4px',borderRadius:8,border:on?'1.5px solid #38bdf8':'1px solid rgba(255,255,255,.08)',
                        background:on?'rgba(56,189,248,.12)':'rgba(255,255,255,.03)',cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}>
                      <div style={{fontSize:11,fontWeight:800,color:on?'var(--sap-accent-light)':'rgba(200,220,255,.5)'}}>${gridPrices[t]}</div>
                      <div style={{fontSize:8,color:'rgba(200,220,255,.3)',fontWeight:600}}>{gridNames[t]}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Direct refs slider */}
            <div style={{marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:'rgba(200,220,255,.6)'}}>{t('earnPage.yourDirectReferrals')}</span>
                <span style={{fontSize:16,fontWeight:900,color:'var(--sap-accent-light)'}}>{gridDirectRefs}</span>
              </div>
              <input type="range" min={1} max={50} value={gridDirectRefs} onChange={function(e){setGridDirectRefs(parseInt(e.target.value));}}
                className="ecalc-slider" style={Object.assign({}, ss, sliderTrack(gridDirectRefs, 50))}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,.2)',marginTop:3}}>
                <span>1</span><span>50</span>
              </div>
            </div>
            {/* Each refers slider */}
            <div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:'rgba(200,220,255,.6)'}}>{t('earnPage.eachPersonRefers')}</span>
                <span style={{fontSize:16,fontWeight:900,color:'var(--sap-accent-light)'}}>{gridL2Refs}</span>
              </div>
              <input type="range" min={0} max={20} value={gridL2Refs} onChange={function(e){setGridL2Refs(parseInt(e.target.value));}}
                className="ecalc-slider" style={Object.assign({}, ss, sliderTrack(gridL2Refs, 20))}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,.2)',marginTop:3}}>
                <span>0</span><span>20</span>
              </div>
            </div>
          </div>
          {/* Results */}
          <div style={{padding:'24px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,background:'rgba(56,189,248,.06)',border:'1px solid rgba(56,189,248,.1)',marginBottom:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'var(--sap-accent-light)'}}>{t('earnPage.directSponsor')}</div>
                <div style={{fontSize:10,color:'rgba(200,220,255,.35)'}}>{gridDirectRefs} refs × ${gDirect.toFixed(0)} each</div>
              </div>
              <div style={{fontSize:20,fontWeight:900,color:'var(--sap-accent-light)'}}>${gDirectTotal.toFixed(0)}</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,background:'rgba(139,92,246,.06)',border:'1px solid rgba(139,92,246,.1)',marginBottom:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'var(--sap-purple-light)'}}>{t('earnPage.uniLevel')}</div>
                <div style={{fontSize:10,color:'rgba(200,220,255,.35)'}}>{gL2Total} level-2 members × ${formatMoney(gUniLevel)}</div>
              </div>
              <div style={{fontSize:20,fontWeight:900,color:'var(--sap-purple-light)'}}>${gUniTotal.toFixed(0)}</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.1)',marginBottom:12}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'var(--sap-amber-bright)'}}>{t('earnPage.gridCompletionBonus')}</div>
                <div style={{fontSize:10,color:'rgba(200,220,255,.35)'}}>5% × 64 members on {gridNames[gridTier]} tier</div>
              </div>
              <div style={{fontSize:20,fontWeight:900,color:'var(--sap-amber-bright)'}}>${gBonus.toFixed(0)}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              <div style={{padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',textAlign:'center'}}>
                <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>{gridDirectRefs + gL2Total}</div>
                <div style={{fontSize:9,color:'rgba(200,220,255,.3)',fontWeight:700,textTransform:'uppercase'}}>{t('earnPage.networkSize')}</div>
              </div>
              <div style={{padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',textAlign:'center'}}>
                <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>${gPerGrid.toLocaleString()}</div>
                <div style={{fontSize:9,color:'rgba(200,220,255,.3)',fontWeight:700,textTransform:'uppercase'}}>{t('earnPage.perGridComplete')}</div>
              </div>
            </div>
            <div style={{padding:'14px 16px',borderRadius:12,background:'linear-gradient(135deg,rgba(56,189,248,.15),rgba(56,189,248,.05))',border:'1px solid rgba(56,189,248,.2)',textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'var(--sap-accent-light)'}}>{t('earnPage.totalGridEarnings')}</div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:40,fontWeight:900,color:'#fff'}}>${(gDirectTotal + gUniTotal).toFixed(0)}</div>
              <div style={{fontSize:10,color:'rgba(200,220,255,.35)'}}>{t('earnPage.perPurchase')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{textAlign:'center'}}>
        <button onClick={onJoin} style={{padding:'14px 48px',borderRadius:12,fontSize:16,fontWeight:800,border:'none',cursor:'pointer',fontFamily:'inherit',
          background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',boxShadow:'0 4px 20px rgba(14,165,233,.4)',letterSpacing:.3}}>
          Start Building Your Network →
        </button>
        <div style={{fontSize:10,color:'rgba(200,220,255,.25)',marginTop:10,lineHeight:1.5}}>
          Income figures are illustrative only. Actual earnings depend on your effort, network activity, and member retention. Not a guarantee of income.
        </div>
      </div>
    </div>
  );
}


export default function EarnPage() {
  var { t } = useTranslation();
  var [regOpen, setRegOpen] = useState(false);

  // Simple inline register modal
  function openReg() { setRegOpen(true); }

  return (
    <div style={{background:dark,color:'#f0f2f8',fontFamily:"'DM Sans','Rethink Sans',sans-serif",overflowX:'hidden',minHeight:'100vh'}}>
      <style>{CSS}</style>

      {/* NAV */}
      <nav style={{position:'sticky',top:0,zIndex:100,background:'rgba(5,13,26,.95)',backdropFilter:'blur(18px)',borderBottom:'1px solid rgba(56,189,248,.1)',padding:'0 40px',height:68,display:'flex',alignItems:'center',justifyContent:'space-between'}} className="earn-nav">
        <Link to="/" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:8}}>
          <svg style={{width:26,height:26}} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="var(--sap-accent)"/><path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/></svg>
          <span style={{fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:18,color:'#fff'}}>SuperAd<span style={{color:cyan}}>{t('earnPage.pro')}</span></span>
        </Link>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link to="/login" style={{fontSize:14,fontWeight:600,color:'rgba(200,220,255,.6)',textDecoration:'none',padding:'7px 16px',border:'1px solid rgba(255,255,255,.1)',borderRadius:8}}>{t('earnPage.signIn')}</Link>
          <button onClick={openReg} style={{fontWeight:700,fontSize:14,color:'var(--sap-cobalt-deep)',background:'var(--sap-accent-light)',padding:'9px 22px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:'inherit'}}>{t('earnPage.joinFree')}</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{padding:'80px 40px 60px',maxWidth:1100,margin:'0 auto',textAlign:'center',position:'relative',overflow:'hidden'}}>
        {/* Background glow */}
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 70% 50% at 50% 0%,rgba(14,165,233,.15),transparent 70%)',pointerEvents:'none'}}/>
        {/* Stars */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none'}} id="earnStars"/>

        <div className="earn-fade1" style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:12,fontWeight:700,letterSpacing:2.5,textTransform:'uppercase',color:'var(--sap-accent-light)',border:'1px solid rgba(56,189,248,.25)',borderRadius:50,padding:'5px 18px',marginBottom:24}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'var(--sap-accent-light)',animation:'blink 2s infinite'}}/>
          Affiliate Programme — Now Open
        </div>

        <h1 className="earn-fade2" style={{fontFamily:"'DM Sans','Rethink Sans',sans-serif",fontSize:'clamp(32px,5vw,62px)',fontWeight:800,color:'#fff',lineHeight:1.05,marginBottom:20,letterSpacing:-1,position:'relative'}}>
          Get Paid Every Time<br/>
          <span style={{background:'linear-gradient(135deg,#38bdf8,#7dd3fc,#0ea5e9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{t('earnPage.someoneJoins')}</span>
        </h1>

        <p className="earn-fade3" style={{fontSize:'clamp(15px,1.8vw,18px)',color:'rgba(200,220,255,.6)',lineHeight:1.7,maxWidth:600,margin:'0 auto 36px',fontWeight:500,position:'relative'}}>
          SuperAdPro pays you recurring commissions every month — not just once. Refer members, build your grid, sell courses. Four income streams working for you around the clock.
        </p>

        <div className="earn-fade4 earn-hero-btns" style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',marginBottom:48,position:'relative'}}>
          <button onClick={openReg} className="earn-btn-p">{t('earnPage.startEarningFree')}</button>
          <Link to="/how-it-works" className="earn-btn-o">{t('earnPage.seeHowItWorks')}</Link>
        </div>

        {/* Live stats strip */}
        <div className="earn-fade5" style={{display:'flex',justifyContent:'center',gap:0,maxWidth:700,margin:'0 auto',border:'1px solid rgba(56,189,248,.12)',borderRadius:12,overflow:'hidden',background:'rgba(5,13,26,.7)',backdropFilter:'blur(10px)',position:'relative'}}>
          {[
            {val:50,suffix:'%',label:'Referral Commission'},
            {val:3200,prefix:'$',label:'Max Grid Bonus Payout'},
            {val:9,suffix:'+',label:'AI Marketing Tools'},
            {val:20,prefix:'$',label:'Monthly Membership'},
          ].map(function(s,i,arr){
            return (
              <div key={s.label} style={{flex:1,padding:'18px 12px',textAlign:'center',borderRight:i<arr.length-1?'1px solid rgba(56,189,248,.08)':'none'}}>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:900,color:'var(--sap-accent-light)',marginBottom:3}}>
                  <Counter target={s.val} prefix={s.prefix||''} suffix={s.suffix||''}/>
                </div>
                <div style={{fontSize:10,fontWeight:700,color:'rgba(200,220,255,.4)',textTransform:'uppercase',letterSpacing:1.5}}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* INCOME STREAMS */}
      <section style={{padding:'60px 40px',maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'var(--sap-accent-light)',marginBottom:12}}>{t('earnPage.heroTitle')}</div>
          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(24px,3.5vw,40px)',fontWeight:900,color:'#fff',marginBottom:12}}>{t("earnPage.heroSubtitle")}</h2>
          <p style={{fontSize:15,color:'rgba(200,220,255,.45)',maxWidth:560,margin:'0 auto'}}>{t("earnPage.heroDesc")}</p>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {[
            {
              icon:'💰', color:'#4ade80', bg:'rgba(22,163,74,.1)', border:'rgba(74,222,128,.15)',
              title:'Membership Commissions',
              value:'50% commission per referral',
              desc:'Earn 50% of every membership fee from people you refer — every single month they remain active. The more people you refer, the more you earn. It compounds as your network grows.',
              tag:'Recurring Monthly',
            },
            {
              icon:'⚡', color:'var(--sap-accent-light)', bg:'rgba(14,165,233,.1)', border:'rgba(56,189,248,.15)',
              title:'Campaign Grid Earnings',
              value:'Up to $3,200 in grid bonuses',
              desc:'Join a campaign tier and earn commissions as your network grows. The 8×8 grid model pays 40% direct commissions plus multi-level earnings flowing through your network — with total bonus potential up to $3,200.',
              tag:'40% Direct + Uni-Level',
            },
            {
              icon:'🎓', color:'#a5b4fc', bg:'rgba(99,102,241,.1)', border:'rgba(165,180,252,.15)',
              title:'Course Marketplace Sales',
              value:'100% commission on your courses',
              desc:'Create and sell courses through the SuperAdPro marketplace. You keep 100% of every sale from your own audience. Plus earn commissions when your referrals buy courses from other creators.',
              tag:'100% Commission',
            },
            {
              icon:'🤖', color:'var(--sap-amber-bright)', bg:'rgba(245,158,11,.1)', border:'rgba(251,191,36,.15)',
              title:'AI Marketing Suite',
              value:'9 tools included with Pro',
              desc:'Not a direct income stream — but the tools that power all the others. AI Campaign Studio, Social Post Generator, Video Script Writer, Niche Finder, SuperPages funnel builder, and more. Create marketing content in seconds.',
              tag:'Pro Feature',
            },
          ].map(function(s) {
            return (
              <div key={s.title} className="stream-item earn-card">
                <div style={{width:48,height:48,borderRadius:12,background:s.bg,border:'1px solid '+s.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{s.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,color:'#fff'}}>{s.title}</div>
                    <span style={{fontSize:10,fontWeight:800,padding:'3px 10px',borderRadius:20,background:s.bg,color:s.color,border:'1px solid '+s.border,letterSpacing:.5}}>{s.tag}</span>
                  </div>
                  <div style={{fontFamily:"'Sora',sans-serif",fontSize:20,fontWeight:900,color:s.color,marginBottom:8}}>{s.value}</div>
                  <div style={{fontSize:14,color:'rgba(200,220,255,.55)',lineHeight:1.7}}>{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3D INCOME GRID */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 40px'}}><div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(56,189,248,.15),transparent)'}}/></div>
      <section style={{padding:'60px 40px',maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'var(--sap-pink)',marginBottom:12}}>{t('earnPage.interactive3D')}</div>
          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(24px,3.5vw,40px)',fontWeight:900,color:'#fff',marginBottom:12}}>{t('earnPage.watch3DDesc')}</h2>
          <p style={{fontSize:15,color:'rgba(200,220,255,.4)',maxWidth:550,margin:'0 auto',lineHeight:1.6}}>{t('earnPage.selectTierDesc')}</p>
        </div>
        <Grid3DSection />
      </section>

      {/* HOW IT WORKS */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 40px'}}><div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(56,189,248,.15),transparent)'}}/></div>

      <section style={{padding:'60px 40px',maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'var(--sap-green-mid)',marginBottom:12}}>{t('earnPage.simpleToStart')}</div>
          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(24px,3.5vw,40px)',fontWeight:900,color:'#fff',marginBottom:12}}>{t('earnPage.upAndEarning')}</h2>
        </div>

        <div className="earn-three" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
          {[
            {num:'1',title:'Create Your Free Account',desc:'Sign up in 60 seconds. No credit card required. You get a personal referral link and access to the member dashboard immediately.',color:'var(--sap-accent-light)'},
            {num:'2',title:'Activate Your Membership',desc:'Choose Basic ($20/mo) or Pro ($35/mo) to unlock all four income streams, AI marketing tools, and your affiliate earnings.',color:'var(--sap-green-mid)'},
            {num:'3',title:'Share & Start Earning',desc:'Share your referral link anywhere. Every person who joins and activates earns you 50% commissionnth — recurring, every month they stay.',color:'#a5b4fc'},
          ].map(function(s) {
            return (
              <div key={s.num} className="earn-card" style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:16,padding:'28px 24px',textAlign:'center'}}>
                <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(56,189,248,.08)',border:'2px solid rgba(56,189,248,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontFamily:"'Sora',sans-serif",fontSize:20,fontWeight:900,color:s.color}}>{s.num}</div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,color:'#fff',marginBottom:10}}>{s.title}</div>
                <div style={{fontSize:14,color:'rgba(200,220,255,.55)',lineHeight:1.7}}>{s.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PROMO GRAPHIC SECTION */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 40px'}}><div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(56,189,248,.15),transparent)'}}/></div>

      <section style={{padding:'60px 40px',maxWidth:1100,margin:'0 auto'}}>
        <div className="earn-two" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>

          {/* Promo graphic preview */}
          <div style={{position:'relative'}}>
            <div style={{background:'rgba(5,13,26,.9)',border:'1.5px solid rgba(56,189,248,.25)',borderRadius:16,padding:'28px 24px',boxShadow:'0 0 60px rgba(14,165,233,.12),0 0 120px rgba(14,165,233,.06)',position:'relative',overflow:'hidden'}}>
              {/* Mini star field */}
              <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 50% at 50% 0%,rgba(14,165,233,.1),transparent 60%)',pointerEvents:'none'}}/>

              {/* Logo */}
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,position:'relative'}}>
                <svg style={{width:22,height:22}} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="var(--sap-accent)"/><path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/></svg>
                <span style={{fontFamily:"'Sora',sans-serif",fontWeight:900,fontSize:15,color:'#fff'}}>SuperAd<span style={{color:'var(--sap-accent-light)'}}>{t('earnPage.pro')}</span></span>
                <span style={{marginLeft:'auto',fontSize:9,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'var(--sap-accent-light)',border:'1px solid rgba(56,189,248,.25)',borderRadius:20,padding:'2px 8px'}}>{t('earnPage.nowOpen')}</span>
              </div>

              {/* Headline */}
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:20,fontWeight:900,color:'#fff',lineHeight:1.15,marginBottom:6,position:'relative'}}>
                Turn Your Network Into<br/><span style={{background:'linear-gradient(135deg,#38bdf8,#7dd3fc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{t('earnPage.recurringIncome')}</span>
              </div>
              <div style={{fontSize:11,color:'rgba(200,220,255,.5)',marginBottom:18,position:'relative'}}>{t("earnPage.recurringIncomeDesc")}</div>

              {/* Mini bullets */}
              {[
                {emoji:'💰',text:'50% commission per referral',color:'#4ade80'},
                {emoji:'⚡',text:'Unlimited Earning Potential',color:'var(--sap-accent-light)'},
                {emoji:'🎓',text:'100% course commissions',color:'#a5b4fc'},
                {emoji:'🤖',text:'9 AI marketing tools',color:'var(--sap-amber-bright)'},
              ].map(function(b) {
                return (
                  <div key={b.text} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',borderRadius:8,marginBottom:6,position:'relative'}}>
                    <span style={{fontSize:14}}>{b.emoji}</span>
                    <span style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:800,color:b.color}}>{b.text}</span>
                  </div>
                );
              })}

              {/* Stats */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,margin:'14px 0',position:'relative'}}>
                {[['$20','Basic/mo'],['50%','Referral'],['8','Grid tiers'],['4','Streams']].map(function([v,l]){
                  return (
                    <div key={l} style={{background:'rgba(56,189,248,.05)',border:'1px solid rgba(56,189,248,.1)',borderRadius:8,padding:'8px 4px',textAlign:'center'}}>
                      <div style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:900,color:'var(--sap-accent-light)'}}>{v}</div>
                      <div style={{fontSize:8,color:'rgba(200,220,255,.35)',textTransform:'uppercase',letterSpacing:1}}>{l}</div>
                    </div>
                  );
                })}
              </div>

              {/* CTA bar */}
              <div style={{background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:8,padding:'10px 16px',textAlign:'center',fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:800,color:'#fff',position:'relative'}}>
                Join Free — Start Earning Today →
              </div>

              {/* Corner marks */}
              <div style={{position:'absolute',top:0,left:0,width:20,height:20,borderTop:'2px solid rgba(56,189,248,.4)',borderLeft:'2px solid rgba(56,189,248,.4)',borderRadius:'4px 0 0 0'}}/>
              <div style={{position:'absolute',bottom:0,right:0,width:20,height:20,borderBottom:'2px solid rgba(56,189,248,.4)',borderRight:'2px solid rgba(56,189,248,.4)',borderRadius:'0 0 4px 0'}}/>
            </div>

            {/* Floating badge */}
            <div style={{position:'absolute',top:-12,right:-12,background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',borderRadius:10,padding:'8px 14px',fontSize:11,fontWeight:800,color:'#fff',boxShadow:'0 4px 20px rgba(14,165,233,.4)',animation:'hpFloat 3s ease-in-out infinite'}}>
              Share This!
            </div>
          </div>

          {/* Right side text */}
          <div>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'var(--sap-accent-light)',marginBottom:14}}>{t('earnPage.shareRecruit')}</div>
            <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(22px,3vw,34px)',fontWeight:900,color:'#fff',lineHeight:1.2,marginBottom:16}}>
              When You Join, You Get<br/>
              <span style={{background:'linear-gradient(135deg,#38bdf8,#10b981)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{t('earnPage.yourOwnMarketingKit')}</span>
            </h2>
            <p style={{fontSize:15,color:'rgba(200,220,255,.55)',lineHeight:1.75,marginBottom:24}}>
              Every member gets personalised promotional graphics, a unique referral link, and AI-generated social posts — ready to share on Facebook, Instagram, WhatsApp, or anywhere your audience lives.
            </p>
            {[
              ['🖼️','Personalised promo graphics — with your referral link embedded'],
              ['🤖','AI Social Post Generator — write posts for any platform in seconds'],
              ['🔗','Your unique link — www.superadpro.com/ref/yourname'],
              ['📧','Email swipe files — proven templates ready to send'],
              ['📊','Real-time dashboard — track clicks, signups and earnings'],
            ].map(function([icon,text]) {
              return (
                <div key={text} style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:12}}>
                  <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{icon}</span>
                  <span style={{fontSize:14,color:'rgba(200,220,255,.65)',lineHeight:1.6}}>{text}</span>
                </div>
              );
            })}
            <div style={{marginTop:28}}>
              <button onClick={openReg} className="earn-btn-p" style={{fontSize:14}}>{t('earnPage.getMyReferralLink')}</button>
            </div>
          </div>
        </div>
      </section>

      {/* EARNINGS CALCULATOR */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 40px'}}><div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(56,189,248,.15),transparent)'}}/></div>

      <section style={{padding:'60px 40px',maxWidth:900,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'var(--sap-accent-light)',marginBottom:12}}>{t('earnPage.earningsSimulator')}</div>
          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(24px,3.5vw,38px)',fontWeight:900,color:'#fff',marginBottom:12}}>{t('earnPage.seeWhatYouCouldEarn')}</h2>
          <p style={{fontSize:15,color:'rgba(200,220,255,.45)',maxWidth:520,margin:'0 auto'}}>{t('earnPage.twoCalcDescFull')}</p>
        </div>
        <EarningsCalculator onJoin={openReg}/>
      </section>

      {/* PRICING */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 40px'}}><div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(56,189,248,.15),transparent)'}}/></div>

      <section style={{padding:'60px 40px',maxWidth:900,margin:'0 auto',textAlign:'center'}}>
        <div style={{fontSize:11,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'#a5b4fc',marginBottom:12}}>{t('earnPage.simplePricing')}</div>
        <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(24px,3.5vw,38px)',fontWeight:900,color:'#fff',marginBottom:12}}>{t("earnPage.oneMembership")}</h2>
        <p style={{fontSize:15,color:'rgba(200,220,255,.45)',maxWidth:520,margin:'0 auto 40px'}}>{t("earnPage.pricingDesc")}</p>

        <div className="earn-two" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,maxWidth:700,margin:'0 auto 32px'}}>
          {[
            {name:'Basic',price:'$20',period:'/month',features:['Affiliate commissions','Income Grid access','Watch to Earn','Course marketplace','LinkHub page','Community Ad Board','Basic support'],highlight:false},
            {name:'Pro',price:'$35',period:'/month',features:['Everything in Basic','ProSeller AI assistant','AI Funnel Generator','SuperLeads CRM','Campaign Studio','Niche Finder AI','Social Post Generator','Video Script Generator','Priority support'],highlight:true},
          ].map(function(p) {
            return (
              <div key={p.name} className="earn-card" style={{background:p.highlight?'rgba(14,165,233,.06)':'rgba(255,255,255,.03)',border:p.highlight?'1.5px solid rgba(56,189,248,.25)':'1px solid rgba(255,255,255,.08)',borderRadius:16,padding:'28px 24px',position:'relative',textAlign:'left'}}>
                {p.highlight && <div style={{position:'absolute',top:14,right:14,fontSize:9,fontWeight:800,letterSpacing:1,textTransform:'uppercase',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',padding:'3px 10px',borderRadius:20}}>{t('earnPage.recommended')}</div>}
                <div style={{fontSize:11,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:p.highlight?'var(--sap-accent-light)':'rgba(200,220,255,.4)',marginBottom:8}}>{p.name}</div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:36,fontWeight:900,color:'#fff',lineHeight:1,marginBottom:4}}>{p.price}<span style={{fontSize:14,fontWeight:500,color:'rgba(200,220,255,.4)'}}>{p.period}</span></div>
                <div style={{fontSize:12,color:'rgba(200,220,255,.35)',marginBottom:20}}>{t("earnPage.perMemberPerMonth")}</div>
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:24}}>
                  {p.features.map(function(f){
                    return <div key={f} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'rgba(200,220,255,.65)'}}>
                      <span style={{color:p.highlight?'var(--sap-accent-light)':'var(--sap-green-mid)',fontWeight:800,fontSize:11}}>✓</span>{f}
                    </div>;
                  })}
                </div>
                <button onClick={openReg} style={{width:'100%',padding:'12px',borderRadius:10,border:'none',background:p.highlight?'linear-gradient(135deg,#0ea5e9,#38bdf8)':'rgba(255,255,255,.06)',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',border:p.highlight?'none':'1px solid rgba(255,255,255,.1)'}}>
                  Get Started →
                </button>
              </div>
            );
          })}
        </div>

        <div style={{fontSize:13,color:'rgba(200,220,255,.3)'}}>{t('earnPage.referTipFull')}</div>
      </section>

      {/* FINAL CTA */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 40px'}}><div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(56,189,248,.15),transparent)'}}/></div>

      <section style={{textAlign:'center',padding:'60px 40px 50px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 80% at 50% 100%,rgba(14,165,233,.08),transparent 60%)',pointerEvents:'none'}}/>
        <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:'clamp(26px,4vw,48px)',fontWeight:900,color:'#fff',marginBottom:12,position:'relative'}}>
          Ready to Start<br/>
          <span style={{background:'linear-gradient(135deg,#38bdf8,#10b981)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{t("earnPage.earningWithUs")}</span>
        </h2>
        <p style={{fontSize:16,color:'rgba(200,220,255,.55)',marginBottom:32,position:'relative'}}>{t("earnPage.ctaDesc")}</p>
        <div className="earn-hero-btns" style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',marginBottom:24,position:'relative'}}>
          <button onClick={openReg} className="earn-btn-p" style={{fontSize:16,padding:'15px 44px'}}>{t('earnPage.createFreeAccount')}</button>
          <Link to="/" className="earn-btn-o">{t('earnPage.backToHomepage')}</Link>
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:24,flexWrap:'wrap',position:'relative'}}>
          {['✓ Free to join','✓ Instant referral link','✓ Cancel anytime','✓ Pay out to your wallet'].map(function(t){
            return <div key={t} style={{fontSize:13,color:'rgba(200,220,255,.4)',fontWeight:600}}>{t}</div>;
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:'1px solid rgba(56,189,248,.1)',padding:'20px 40px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <Link to="/" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:8}}>
          <svg style={{width:20,height:20}} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="var(--sap-accent)"/><path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/></svg>
          <span style={{fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:15,color:'#fff'}}>SuperAd<span style={{color:cyan}}>{t('earnPage.pro')}</span></span>
        </Link>
        <div style={{display:'flex',gap:20}}>
          {[['How It Works','/how-it-works'],['FAQ','/faq'],['Legal','/legal'],['Support','/support']].map(function([l,h]){
            return <Link key={h} to={h} style={{fontSize:12,color:'rgba(200,220,255,.25)',textDecoration:'none'}}>{l}</Link>;
          })}
        </div>
        <div style={{fontSize:12,color:'rgba(200,220,255,.2)'}}>{t('earnPage.copyright')}</div>
      </footer>

      <Toast/>

      {/* Inline register modal */}
      {regOpen && (
        <div onClick={function(e){if(e.target===e.currentTarget)setRegOpen(false);}} style={{position:'fixed',inset:0,background:'rgba(2,6,18,.9)',backdropFilter:'blur(8px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#111827',border:'1px solid rgba(56,189,248,.2)',borderRadius:16,padding:'36px 40px',width:'100%',maxWidth:460,position:'relative',boxShadow:'0 32px 80px rgba(0,0,0,.8)'}}>
            <button onClick={function(){setRegOpen(false);}} style={{position:'absolute',top:14,right:16,background:'none',border:'none',color:'rgba(148,163,184,.6)',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>
            <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:4}}>{t('earnPage.createYourFreeAccount')}</div>
            <div style={{fontSize:14,color:'rgba(148,163,184,.7)',marginBottom:20}}>{t('earnPage.takes60sec')}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'rgba(148,163,184,.7)',marginBottom:6}}>{t('earnPage.firstName')}</label>
                <input style={{width:'100%',padding:'10px 13px',border:'1.5px solid rgba(56,189,248,.15)',borderRadius:8,background:'rgba(56,189,248,.04)',color:'var(--sap-bg-page)',fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} placeholder={t('earnPage.firstNamePlaceholder')}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'rgba(148,163,184,.7)',marginBottom:6}}>{t('earnPage.username')}</label>
                <input style={{width:'100%',padding:'10px 13px',border:'1.5px solid rgba(56,189,248,.15)',borderRadius:8,background:'rgba(56,189,248,.04)',color:'var(--sap-bg-page)',fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} placeholder={t('earnPage.usernamePlaceholder')}/>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'rgba(148,163,184,.7)',marginBottom:6}}>{t('earnPage.emailAddress')}</label>
              <input type="email" style={{width:'100%',padding:'10px 13px',border:'1.5px solid rgba(56,189,248,.15)',borderRadius:8,background:'rgba(56,189,248,.04)',color:'var(--sap-bg-page)',fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} placeholder={t('earnPage.emailPlaceholder')}/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'rgba(148,163,184,.7)',marginBottom:6}}>{t('earnPage.password')}</label>
              <input type="password" style={{width:'100%',padding:'10px 13px',border:'1.5px solid rgba(56,189,248,.15)',borderRadius:8,background:'rgba(56,189,248,.04)',color:'var(--sap-bg-page)',fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} placeholder={t('earnPage.passwordPlaceholder')}/>
            </div>
            <Link to="/register" onClick={function(){setRegOpen(false);}} style={{display:'block',width:'100%',padding:'13px',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',border:'none',borderRadius:10,color:'#fff',fontSize:15,fontWeight:800,fontFamily:'inherit',cursor:'pointer',textAlign:'center',textDecoration:'none',boxSizing:'border-box'}}>
              Create Account →
            </Link>
            <div style={{textAlign:'center',marginTop:12,fontSize:13,color:'rgba(148,163,184,.5)'}}>Already have an account? <Link to="/login" onClick={function(){setRegOpen(false);}} style={{color:'rgba(56,189,248,.8)',textDecoration:'none',fontWeight:600}}>{t('earnPage.signInLink')}</Link></div>
          </div>
        </div>
      )}

      {/* Star generator */}
      <script dangerouslySetInnerHTML={{__html:`
        var c=document.getElementById('earnStars');
        if(c){for(var i=0;i<50;i++){var s=document.createElement('div');var sz=Math.random()*1.5+.5;s.style.cssText='position:absolute;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:#fff;top:'+Math.random()*100+'%;left:'+Math.random()*100+'%;animation:twinkle '+(Math.random()*3+2)+'s ease-in-out '+-Math.random()*5+'s infinite';c.appendChild(s);}}
      `}}/>
    </div>
  );
}
