import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import * as Chart from 'chart.js';

Chart.Chart.register(
  Chart.LineController, Chart.BarController, Chart.DoughnutController,
  Chart.LineElement, Chart.BarElement, Chart.ArcElement,
  Chart.PointElement, Chart.CategoryScale, Chart.LinearScale,
  Chart.Tooltip, Chart.Legend, Chart.Filler
);
Chart.Chart.defaults.font.family = "'Rethink Sans','DM Sans',sans-serif";
Chart.Chart.defaults.font.size = 12;

var STAT_CARDS = [
  { key:'balance', icon:'💰', label:'Available Balance', gradient:'linear-gradient(135deg,#0f766e 0%,#0d9488 50%,#14b8a6 100%)', glow:'rgba(20,184,166,0.25)' },
  { key:'total_earned', icon:'📈', label:'Total Earned', gradient:'linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#3b82f6 100%)', glow:'rgba(59,130,246,0.25)' },
  { key:'grid_earnings', icon:'🔲', label:'Grid Earnings', gradient:'linear-gradient(135deg,#4338ca 0%,#6366f1 50%,#818cf8 100%)', glow:'rgba(99,102,241,0.25)' },
  { key:'team_size', icon:'👥', label:'Team Size', gradient:'linear-gradient(135deg,#b45309 0%,#d97706 50%,#f59e0b 100%)', glow:'rgba(245,158,11,0.25)' },
];

var TL = { direct_sponsor:'Direct 40%', uni_level:'Uni-Level', grid_completion_bonus:'Grid Bonus', membership:'Membership', membership_renewal:'Renewal', course_direct_sale:'Course Sale', course_pass_up:'Course Pass-Up', nexus_sponsor:'Nexus Sponsor', nexus_level:'Nexus Level', nexus_completion:'Nexus Complete' };
var TC = { direct_sponsor:'#10b981', uni_level:'#0ea5e9', grid_completion_bonus:'#f59e0b', membership:'#8b5cf6', membership_renewal:'#a78bfa', course_direct_sale:'#f97316', course_pass_up:'#fb923c', nexus_sponsor:'#14b8a6', nexus_level:'#06b6d4', nexus_completion:'#22d3ee' };
var TIER_COLORS = ['#10b981','#0ea5e9','#6366f1','#8b5cf6','#f59e0b','#f97316','#ef4444','#ec4899'];

function useChart(cfg) {
  var ref = useRef(null), ch = useRef(null);
  useEffect(function(){ if(!ref.current||!cfg) return; if(ch.current) ch.current.destroy(); ch.current = new Chart.Chart(ref.current, cfg); return function(){ if(ch.current) ch.current.destroy(); }; }, [cfg]);
  return ref;
}

function GlassCard({ title, subtitle, children, style, glow }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.03)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:28,
      position:'relative', overflow:'hidden', ...style,
    }}>
      {glow && <div style={{ position:'absolute', top:-40, right:-40, width:120, height:120, borderRadius:'50%', background:glow, filter:'blur(50px)', opacity:0.4, pointerEvents:'none' }}/>}
      {title && <div style={{ fontFamily:"'Sora','Rethink Sans',sans-serif", fontSize:17, fontWeight:800, color:'#e2e8f0', marginBottom:subtitle?2:16, position:'relative', zIndex:1 }}>{title}</div>}
      {subtitle && <div style={{ fontSize:13, color:'rgba(148,163,184,0.8)', marginBottom:20, position:'relative', zIndex:1 }}>{subtitle}</div>}
      <div style={{ position:'relative', zIndex:1 }}>{children}</div>
    </div>
  );
}

var cTip = { backgroundColor:'rgba(15,23,42,0.95)', titleColor:'#e2e8f0', bodyColor:'#94a3b8', padding:14, cornerRadius:12, displayColors:false, borderColor:'rgba(255,255,255,0.08)', borderWidth:1, titleFont:{weight:700,size:13}, bodyFont:{size:12} };
var cGrid = { color:'rgba(148,163,184,0.08)' };
var cTick = { color:'rgba(148,163,184,0.6)', font:{size:11} };

export default function AnalyticsPage() {
  var { t } = useTranslation();
  var [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null);
  useEffect(function(){ fetch('/api/analytics',{credentials:'include'}).then(function(r){return r.json()}).then(function(d){if(d.error){setError(d.error)}else{setData(d)}setLoading(false)}).catch(function(e){setError(e.message);setLoading(false)}); }, []);

  var earningsRef = useChart(data ? {
    type:'line', data:{ labels:data.daily_earnings.map(function(d){var p=d.date.split('-');return p[1]+'/'+p[2]}),
    datasets:[{label:'Earnings',data:data.daily_earnings.map(function(d){return d.amount}),
      borderColor:'#22d3ee',backgroundColor:function(ctx){var g=ctx.chart.ctx.createLinearGradient(0,0,0,280);g.addColorStop(0,'rgba(34,211,238,0.15)');g.addColorStop(1,'rgba(34,211,238,0)');return g;},
      borderWidth:2.5,fill:true,tension:0.4,pointRadius:0,pointHoverRadius:7,pointHoverBackgroundColor:'#22d3ee',pointHoverBorderColor:'#0f172a',pointHoverBorderWidth:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...cTip,callbacks:{label:function(c){return '$'+c.parsed.y.toFixed(2)}}}},scales:{x:{grid:{display:false},ticks:{...cTick,maxTicksLimit:8}},y:{grid:cGrid,ticks:{...cTick,callback:function(v){return '$'+v}}}}}
  } : null);

  var breakdownRef = useChart(data ? (function(){
    var b=data.income_breakdown,tot=b.grid+b.membership+b.courses+b.supermarket;
    var cols=['#6366f1','#10b981','#f59e0b','#0ea5e9'];
    if(tot===0) return{type:'doughnut',data:{labels:['No data'],datasets:[{data:[1],backgroundColor:['rgba(148,163,184,0.15)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false}}}};
    return{type:'doughnut',data:{labels:['Grid','Membership','Courses','SuperMarket'],datasets:[{data:[b.grid,b.membership,b.courses,b.supermarket],backgroundColor:cols,borderWidth:0,hoverOffset:10,borderRadius:4}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',color:'rgba(148,163,184,0.8)',font:{size:12,weight:600}}},tooltip:{...cTip,callbacks:{label:function(c){return c.label+': $'+c.parsed.toFixed(2)}}}}}};
  })() : null);

  var gridRef = useChart(data && data.grid_progress.length>0 ? {
    type:'bar',data:{labels:data.grid_progress.map(function(g){return 'T'+g.tier+' $'+g.price}),
    datasets:[{label:'Filled',data:data.grid_progress.map(function(g){return g.filled}),backgroundColor:data.grid_progress.map(function(g){return TIER_COLORS[g.tier-1]}),borderRadius:8,barThickness:24},
      {label:'Remaining',data:data.grid_progress.map(function(g){return 64-g.filled}),backgroundColor:'rgba(148,163,184,0.08)',borderRadius:8,barThickness:24}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...cTip,callbacks:{label:function(c){return c.dataset.label+': '+c.parsed.x+'/64'}}}},scales:{x:{stacked:true,max:64,grid:cGrid,ticks:{...cTick,callback:function(v){return v+'/64'}}},y:{stacked:true,grid:{display:false},ticks:cTick}}}
  } : null);

  var campaignRef = useChart(data && data.campaigns.length>0 ? {
    type:'bar',data:{labels:data.campaigns.map(function(c){return 'Tier '+c.tier}),
    datasets:[{label:'Delivered',data:data.campaigns.map(function(c){return c.views_delivered}),backgroundColor:'#6366f1',borderRadius:8},
      {label:'Target',data:data.campaigns.map(function(c){return c.views_target}),backgroundColor:'rgba(99,102,241,0.12)',borderRadius:8}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',color:'rgba(148,163,184,0.8)',font:{size:12,weight:600}}},tooltip:{...cTip,callbacks:{label:function(c){return c.dataset.label+': '+c.parsed.y.toLocaleString()}}}},scales:{x:{grid:{display:false},ticks:cTick},y:{grid:cGrid,ticks:{...cTick,callback:function(v){return v>=1000?(v/1000)+'K':v}}}}}
  } : null);

  var teamRef = useChart(data ? {
    type:'bar',data:{labels:data.team_weekly.map(function(w){return 'W'+w.week}),datasets:[{label:'New Referrals',data:data.team_weekly.map(function(w){return w.count}),backgroundColor:'#10b981',borderRadius:8,barThickness:16}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:cTip},scales:{x:{grid:{display:false},ticks:cTick},y:{grid:cGrid,beginAtZero:true,ticks:cTick}}}
  } : null);

  var streamRef = useChart(data && data.monthly_streams.length>0 ? {
    type:'bar',data:{labels:data.monthly_streams.map(function(m){return m.month}),
    datasets:[{label:'Membership',data:data.monthly_streams.map(function(m){return m.membership}),backgroundColor:'#10b981',borderRadius:4},
      {label:'Grid',data:data.monthly_streams.map(function(m){return m.grid}),backgroundColor:'#6366f1',borderRadius:4},
      {label:'Courses',data:data.monthly_streams.map(function(m){return m.courses}),backgroundColor:'#f59e0b',borderRadius:4},
      {label:'SuperMarket',data:data.monthly_streams.map(function(m){return m.supermarket}),backgroundColor:'#0ea5e9',borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:12,usePointStyle:true,pointStyle:'circle',color:'rgba(148,163,184,0.8)',font:{size:11,weight:600}}},tooltip:{...cTip,callbacks:{label:function(c){return c.dataset.label+': $'+c.parsed.y.toFixed(2)}}}},scales:{x:{stacked:true,grid:{display:false},ticks:cTick},y:{stacked:true,grid:cGrid,ticks:{...cTick,callback:function(v){return '$'+v}}}}}
  } : null);

  if(loading) return <AppLayout title={t('campaignAnalytics.analyticsTitle')}><div style={{background:'linear-gradient(180deg,#0a0f1e 0%,#0d1425 100%)',minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}><div style={{width:48,height:48,borderRadius:'50%',border:'3px solid rgba(34,211,238,0.2)',borderTopColor:'#22d3ee',animation:'spin 0.8s linear infinite'}}/><div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:'rgba(148,163,184,0.6)'}}>{t('campaignAnalytics.loadingAnalytics')}</div></div><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;

  if(error) return <AppLayout title={t('campaignAnalytics.analyticsTitle')}><div style={{background:'linear-gradient(180deg,#0a0f1e 0%,#0d1425 100%)',minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,textAlign:'center'}}><div style={{width:56,height:56,borderRadius:16,background:'rgba(239,68,68,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>⚠️</div><div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:'#f87171'}}>{t('campaignAnalytics.errorLoading')}</div><div style={{fontSize:13,color:'rgba(148,163,184,0.6)',maxWidth:300}}>{error}</div><a href="/login" style={{marginTop:8,padding:'12px 28px',borderRadius:12,background:'linear-gradient(135deg,#0ea5e9,#22d3ee)',color:'#fff',textDecoration:'none',fontWeight:700,fontSize:14}}>{t('campaignAnalytics.signIn')}</a></div></div></AppLayout>;

  var totals = data.totals;
  var empty = function(msg){ return <div style={{height:280,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(148,163,184,0.5)',fontSize:14,fontWeight:600}}>{msg}</div>; };

  return (
    <AppLayout title={t('campaignAnalytics.analyticsTitle')}>
    <div style={{background:'linear-gradient(180deg,#0a0f1e 0%,#0d1425 50%,#0f172a 100%)',minHeight:'100vh'}}>
      <div style={{maxWidth:1140,margin:'0 auto',padding:'32px 24px 60px'}}>

        {/* Header */}
        <div style={{marginBottom:32}}>
          <div style={{fontFamily:"'Sora','Rethink Sans',sans-serif",fontSize:28,fontWeight:900,color:'#f1f5f9',letterSpacing:-0.5}}>{t('campaignAnalytics.analyticsTitle')}</div>
          <div style={{fontSize:14,color:'rgba(148,163,184,0.6)',marginTop:4}}>{t('campaignAnalytics.last30days')}</div>
        </div>

        {/* Stat cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:28}}>
          {STAT_CARDS.map(function(card,i){
            var val = card.key==='team_size' ? String(totals[card.key]) : '$'+(totals[card.key]||0).toFixed(2);
            var sub = card.key==='balance'?'Affiliate + Campaign':card.key==='total_earned'?'Lifetime earnings':card.key==='grid_earnings'?(data.grid_progress.length||0)+' active grids':'Direct referrals';
            return <div key={i} style={{background:card.gradient,borderRadius:18,padding:'24px 22px',position:'relative',overflow:'hidden',boxShadow:'0 8px 32px '+card.glow}}>
              <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.06)',pointerEvents:'none'}}/>
              <div style={{position:'absolute',bottom:-30,left:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.04)',pointerEvents:'none'}}/>
              <div style={{fontSize:28,marginBottom:12,filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'}}>{card.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:6}}>{card.label}</div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:30,fontWeight:900,color:'#fff',lineHeight:1.1}}>{val}</div>
              <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.5)',marginTop:8}}>{sub}</div>
            </div>;
          })}
        </div>

        {/* Row 1 */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
          <GlassCard title={t('campaignAnalytics.earningsTrend')} subtitle={t('campaignAnalytics.last30days')} glow="rgba(34,211,238,0.15)"><div style={{height:300}}><canvas ref={earningsRef}/></div></GlassCard>
          <GlassCard title={t('campaignAnalytics.incomeBreakdown')} subtitle={t('campaignAnalytics.incomeBreakdownDesc')} glow="rgba(99,102,241,0.15)"><div style={{height:300}}><canvas ref={breakdownRef}/></div></GlassCard>
        </div>

        {/* Row 2 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <GlassCard title={t('campaignAnalytics.gridProgress')} subtitle={t('campaignAnalytics.gridProgressDesc')} glow="rgba(99,102,241,0.1)">{data.grid_progress.length>0?<div style={{height:280}}><canvas ref={gridRef}/></div>:empty('No active grids yet')}</GlassCard>
          <GlassCard title={t('campaignAnalytics.campaignPerf')} subtitle={t('campaignAnalytics.campaignPerfDesc')} glow="rgba(34,211,238,0.1)">{data.campaigns.length>0?<div style={{height:280}}><canvas ref={campaignRef}/></div>:empty('No active campaigns')}</GlassCard>
        </div>

        {/* Row 3 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <GlassCard title={t('campaignAnalytics.teamGrowth')} subtitle={t('campaignAnalytics.teamGrowthDesc')} glow="rgba(16,185,129,0.1)"><div style={{height:280}}><canvas ref={teamRef}/></div></GlassCard>
          <GlassCard title={t('campaignAnalytics.earningsByStream')} subtitle={t('campaignAnalytics.earningsByStreamDesc')} glow="rgba(245,158,11,0.1)"><div style={{height:280}}><canvas ref={streamRef}/></div></GlassCard>
        </div>

        {/* Commission table */}
        <GlassCard title={t('campaignAnalytics.recentCommissions')} glow="rgba(34,211,238,0.08)">
          {data.recent_commissions.length>0 ? <div style={{overflowX:'auto',marginTop:12}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>
              {['Date','Type','From','Tier','Amount'].map(function(h,i){return<th key={i} style={{textAlign:i===4?'right':'left',padding:'12px 14px',fontSize:10,fontWeight:800,color:'rgba(148,163,184,0.5)',textTransform:'uppercase',letterSpacing:1.5,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>})}
            </tr></thead><tbody>
              {data.recent_commissions.map(function(c,i){var tl=TL[c.type]||c.type,tc=TC[c.type]||'#64748b';return<tr key={i} style={{transition:'background 0.15s'}} onMouseEnter={function(e){e.currentTarget.style.background='rgba(255,255,255,0.02)'}} onMouseLeave={function(e){e.currentTarget.style.background='transparent'}}>
                <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',color:'#94a3b8'}}>{c.date}</td>
                <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}><span style={{display:'inline-block',padding:'4px 12px',borderRadius:8,fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:0.5,background:tc+'18',color:tc,border:'1px solid '+tc+'30'}}>{tl}</span></td>
                <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',color:'#94a3b8'}}>{c.from}</td>
                <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',color:'#94a3b8'}}>{c.tier?'Tier '+c.tier:'—'}</td>
                <td style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',textAlign:'right',fontFamily:"'Sora',sans-serif",fontWeight:800,color:'#22d3ee',fontSize:14}}>${c.amount.toFixed(2)}</td>
              </tr>})}
            </tbody></table>
          </div> : <div style={{padding:'48px 0',textAlign:'center',color:'rgba(148,163,184,0.5)',fontSize:14,fontWeight:600}}>{t('campaignAnalytics.noCommissions')}</div>}
        </GlassCard>

      </div>
    </div>
    </AppLayout>
  );
}
