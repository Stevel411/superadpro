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
Chart.Chart.defaults.color = '#64748b';

var STAT_CARDS = [
  { key:'balance', icon:'💰', label:'Available Balance', gradient:'linear-gradient(135deg,#0f766e 0%,#14b8a6 100%)', glow:'rgba(20,184,166,0.18)' },
  { key:'total_earned', icon:'📈', label:'Total Earned', gradient:'linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)', glow:'rgba(59,130,246,0.18)' },
  { key:'grid_earnings', icon:'🔲', label:'Grid Earnings', gradient:'linear-gradient(135deg,#4338ca 0%,#818cf8 100%)', glow:'rgba(99,102,241,0.18)' },
  { key:'team_size', icon:'👥', label:'Team Size', gradient:'linear-gradient(135deg,#b45309 0%,#f59e0b 100%)', glow:'rgba(245,158,11,0.18)' },
];

var TL = { direct_sponsor:'Direct 40%', uni_level:'Uni-Level', grid_completion_bonus:'Grid Bonus', membership:'Membership', membership_renewal:'Renewal', course_direct_sale:'Course Sale', course_pass_up:'Course Pass-Up', nexus_sponsor:'Nexus Sponsor', nexus_level:'Nexus Level', nexus_completion:'Nexus Complete' };
var TC = { direct_sponsor:'#059669', uni_level:'#0284c7', grid_completion_bonus:'#d97706', membership:'#7c3aed', membership_renewal:'#8b5cf6', course_direct_sale:'#ea580c', course_pass_up:'#f97316', nexus_sponsor:'#0d9488', nexus_level:'#0891b2', nexus_completion:'#06b6d4' };
var TIER_COLORS = ['#10b981','#0ea5e9','#6366f1','#8b5cf6','#f59e0b','#f97316','#ef4444','#ec4899'];

function useChart(cfg) {
  var ref = useRef(null), ch = useRef(null);
  useEffect(function(){ if(!ref.current||!cfg) return; if(ch.current) ch.current.destroy(); ch.current = new Chart.Chart(ref.current, cfg); return function(){ if(ch.current) ch.current.destroy(); }; }, [cfg]);
  return ref;
}

function Card({ title, subtitle, children, style }) {
  return (
    <div style={{
      background:'#fff', borderRadius:16, padding:26,
      border:'1px solid #e2e8f0',
      boxShadow:'0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
      position:'relative', overflow:'hidden', ...style,
    }}>
      {title && <div style={{ fontFamily:"'Sora','Rethink Sans',sans-serif", fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:subtitle?2:16 }}>{title}</div>}
      {subtitle && <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

var cTip = { backgroundColor:'#0f172a', titleColor:'#f1f5f9', bodyColor:'#cbd5e1', padding:14, cornerRadius:12, displayColors:false, borderColor:'rgba(0,0,0,0.1)', borderWidth:1, titleFont:{weight:700,size:13}, bodyFont:{size:12} };
var cGrid = { color:'#f1f5f9' };
var cTick = { color:'#94a3b8', font:{size:11} };

export default function AnalyticsPage() {
  var { t } = useTranslation();
  var [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null);
  useEffect(function(){ fetch('/api/analytics',{credentials:'include'}).then(function(r){return r.json()}).then(function(d){if(d.error){setError(d.error)}else{setData(d)}setLoading(false)}).catch(function(e){setError(e.message);setLoading(false)}); }, []);

  var earningsRef = useChart(data ? {
    type:'line', data:{ labels:data.daily_earnings.map(function(d){var p=d.date.split('-');return p[1]+'/'+p[2]}),
    datasets:[{label:'Earnings',data:data.daily_earnings.map(function(d){return d.amount}),
      borderColor:'#0ea5e9',backgroundColor:function(ctx){var g=ctx.chart.ctx.createLinearGradient(0,0,0,280);g.addColorStop(0,'rgba(14,165,233,0.12)');g.addColorStop(1,'rgba(14,165,233,0)');return g;},
      borderWidth:2.5,fill:true,tension:0.4,pointRadius:0,pointHoverRadius:7,pointHoverBackgroundColor:'#0ea5e9',pointHoverBorderColor:'#fff',pointHoverBorderWidth:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...cTip,callbacks:{label:function(c){return '$'+c.parsed.y.toFixed(2)}}}},scales:{x:{grid:{display:false},ticks:{...cTick,maxTicksLimit:8}},y:{grid:cGrid,ticks:{...cTick,callback:function(v){return '$'+v}}}}}
  } : null);

  var breakdownRef = useChart(data ? (function(){
    var b=data.income_breakdown,tot=b.grid+b.membership+b.courses+(b.nexus||0);
    var cols=['#6366f1','#10b981','#f59e0b','#0ea5e9'];
    if(tot===0) return{type:'doughnut',data:{labels:['No data'],datasets:[{data:[1],backgroundColor:['#e2e8f0'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false}}}};
    return{type:'doughnut',data:{labels:['Grid','Membership','Courses','Credit Nexus'],datasets:[{data:[b.grid,b.membership,b.courses,b.nexus||0],backgroundColor:['#6366f1','#10b981','#f59e0b','#06b6d4'],borderWidth:0,hoverOffset:10,borderRadius:4}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',color:'#64748b',font:{size:12,weight:600}}},tooltip:{...cTip,callbacks:{label:function(c){return c.label+': $'+c.parsed.toFixed(2)}}}}}};
  })() : null);

  var gridRef = useChart(data && data.grid_progress.length>0 ? {
    type:'bar',data:{labels:data.grid_progress.map(function(g){return 'T'+g.tier+' $'+g.price}),
    datasets:[{label:'Filled',data:data.grid_progress.map(function(g){return g.filled}),backgroundColor:data.grid_progress.map(function(g){return TIER_COLORS[g.tier-1]}),borderRadius:8,barThickness:24},
      {label:'Remaining',data:data.grid_progress.map(function(g){return 64-g.filled}),backgroundColor:'#f1f5f9',borderRadius:8,barThickness:24}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...cTip,callbacks:{label:function(c){return c.dataset.label+': '+c.parsed.x+'/64'}}}},scales:{x:{stacked:true,max:64,grid:cGrid,ticks:{...cTick,callback:function(v){return v+'/64'}}},y:{stacked:true,grid:{display:false},ticks:cTick}}}
  } : null);

  var campaignRef = useChart(data && data.campaigns.length>0 ? {
    type:'bar',data:{labels:data.campaigns.map(function(c){return 'Tier '+c.tier}),
    datasets:[{label:'Delivered',data:data.campaigns.map(function(c){return c.views_delivered}),backgroundColor:'#6366f1',borderRadius:8},
      {label:'Target',data:data.campaigns.map(function(c){return c.views_target}),backgroundColor:'#e0e7ff',borderRadius:8}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',color:'#64748b',font:{size:12,weight:600}}},tooltip:{...cTip,callbacks:{label:function(c){return c.dataset.label+': '+c.parsed.y.toLocaleString()}}}},scales:{x:{grid:{display:false},ticks:cTick},y:{grid:cGrid,ticks:{...cTick,callback:function(v){return v>=1000?(v/1000)+'K':v}}}}}
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
      {label:'Credit Nexus',data:data.monthly_streams.map(function(m){return m.nexus||0}),backgroundColor:'#06b6d4',borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:12,usePointStyle:true,pointStyle:'circle',color:'#64748b',font:{size:11,weight:600}}},tooltip:{...cTip,callbacks:{label:function(c){return c.dataset.label+': $'+c.parsed.y.toFixed(2)}}}},scales:{x:{stacked:true,grid:{display:false},ticks:cTick},y:{stacked:true,grid:cGrid,ticks:{...cTick,callback:function(v){return '$'+v}}}}}
  } : null);

  var watchRef = useChart(data && data.daily_watches ? {
    type:'bar',data:{labels:data.daily_watches.map(function(d){var p=d.date.split('-');return p[1]+'/'+p[2]}),
    datasets:[{label:'Videos Watched',data:data.daily_watches.map(function(d){return d.count}),backgroundColor:'#8b5cf6',borderRadius:6,barThickness:10}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...cTip,callbacks:{label:function(c){return c.parsed.y+' videos'}}}},scales:{x:{grid:{display:false},ticks:{...cTick,maxTicksLimit:10}},y:{grid:cGrid,beginAtZero:true,ticks:{...cTick,stepSize:1}}}}
  } : null);

  if(loading) return <AppLayout title={t('campaignAnalytics.analyticsTitle')}><div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:80,minHeight:'60vh'}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}><div style={{width:44,height:44,borderRadius:'50%',border:'3px solid #e2e8f0',borderTopColor:'#0ea5e9',animation:'spin 0.8s linear infinite'}}/><div style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,color:'#94a3b8'}}>{t('campaignAnalytics.loadingAnalytics')}</div></div><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;

  if(error) return <AppLayout title={t('campaignAnalytics.analyticsTitle')}><div style={{display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:80,minHeight:'60vh'}}><div style={{width:52,height:52,borderRadius:14,background:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⚠️</div><div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:'#ef4444'}}>{t('campaignAnalytics.errorLoading')}</div><div style={{fontSize:13,color:'#94a3b8',maxWidth:300,textAlign:'center'}}>{error}</div><a href="/login" style={{marginTop:8,padding:'11px 26px',borderRadius:11,background:'linear-gradient(135deg,#0ea5e9,#06b6d4)',color:'#fff',textDecoration:'none',fontWeight:700,fontSize:14}}>{t('campaignAnalytics.signIn')}</a></div></AppLayout>;

  var totals = data.totals;
  var empty = function(msg){ return <div style={{height:280,display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',fontSize:14,fontWeight:600}}>{msg}</div>; };

  return (
    <AppLayout title={t('campaignAnalytics.analyticsTitle')}>
    <div style={{background:'#f0f3f9',minHeight:'100vh'}}>
      <div style={{maxWidth:1140,margin:'0 auto',padding:'28px 24px 60px'}}>

        {/* Stat cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
          {STAT_CARDS.map(function(card,i){
            var val = card.key==='team_size' ? String(totals[card.key]) : '$'+(totals[card.key]||0).toFixed(2);
            var sub = card.key==='balance'?'Affiliate + Campaign':card.key==='total_earned'?'Lifetime earnings':card.key==='grid_earnings'?(data.grid_progress.length||0)+' active grids':'Direct referrals';
            return <div key={i} style={{background:card.gradient,borderRadius:16,padding:'22px 20px',position:'relative',overflow:'hidden',boxShadow:'0 6px 24px '+card.glow+', 0 1px 3px rgba(0,0,0,0.08)'}}>
              <div style={{position:'absolute',top:-20,right:-20,width:90,height:90,borderRadius:'50%',background:'rgba(255,255,255,0.08)',pointerEvents:'none'}}/>
              <div style={{position:'absolute',bottom:-25,left:-15,width:70,height:70,borderRadius:'50%',background:'rgba(255,255,255,0.05)',pointerEvents:'none'}}/>
              <div style={{fontSize:26,marginBottom:10,filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'}}>{card.icon}</div>
              <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.65)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:5}}>{card.label}</div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:28,fontWeight:900,color:'#fff',lineHeight:1.1}}>{val}</div>
              <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.5)',marginTop:6}}>{sub}</div>
            </div>;
          })}
        </div>

        {/* Row 1 */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
          <Card title={t('campaignAnalytics.earningsTrend')} subtitle={t('campaignAnalytics.last30days')}><div style={{height:300}}><canvas ref={earningsRef}/></div></Card>
          <Card title={t('campaignAnalytics.incomeBreakdown')} subtitle={t('campaignAnalytics.incomeBreakdownDesc')}><div style={{height:300}}><canvas ref={breakdownRef}/></div></Card>
        </div>

        {/* Row 2 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <Card title={t('campaignAnalytics.gridProgress')} subtitle={t('campaignAnalytics.gridProgressDesc')}>{data.grid_progress.length>0?<div style={{height:280}}><canvas ref={gridRef}/></div>:empty('No active grids yet')}</Card>
          <Card title={t('campaignAnalytics.campaignPerf')} subtitle={t('campaignAnalytics.campaignPerfDesc')}>{data.campaigns.length>0?<div style={{height:280}}><canvas ref={campaignRef}/></div>:empty('No active campaigns')}</Card>
        </div>

        {/* Row 3 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <Card title={t('campaignAnalytics.teamGrowth')} subtitle={t('campaignAnalytics.teamGrowthDesc')}><div style={{height:280}}><canvas ref={teamRef}/></div></Card>
          <Card title={t('campaignAnalytics.earningsByStream')} subtitle={t('campaignAnalytics.earningsByStreamDesc')}><div style={{height:280}}><canvas ref={streamRef}/></div></Card>
        </div>

        {/* Row 4: Watch to Earn */}
        {data.watch_stats && <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:16,marginBottom:16}}>
          <Card title="Watch to Earn" subtitle="Your daily watch activity">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:4}}>
              {[
                {label:'Total Watched',value:String(data.watch_stats.total_watched),color:'#8b5cf6',icon:'🎬'},
                {label:'Watch Streak',value:data.watch_stats.streak_days+' days',color:'#f59e0b',icon:'🔥'},
                {label:'Today',value:data.watch_stats.today_watched+'/'+data.watch_stats.daily_required,color:data.watch_stats.today_watched>=data.watch_stats.daily_required?'#10b981':'#94a3b8',icon:'📺'},
                {label:'Status',value:data.watch_stats.commissions_paused?'Paused':'Active',color:data.watch_stats.commissions_paused?'#ef4444':'#10b981',icon:data.watch_stats.commissions_paused?'⏸️':'✅'},
              ].map(function(s,i){return <div key={i} style={{background:'#f8fafc',borderRadius:12,padding:'14px 16px',border:'1px solid #f1f5f9'}}>
                <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
                <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1.2,marginBottom:4}}>{s.label}</div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:20,fontWeight:900,color:s.color}}>{s.value}</div>
              </div>})}
            </div>
            {data.watch_stats.consecutive_missed>0 && <div style={{marginTop:14,padding:'10px 14px',borderRadius:10,background:'#fef2f2',border:'1px solid #fecaca',fontSize:12,fontWeight:600,color:'#dc2626'}}>⚠️ {data.watch_stats.consecutive_missed} day{data.watch_stats.consecutive_missed>1?'s':''} missed — {data.watch_stats.commissions_paused?'campaign withdrawals paused':'watch today to keep your streak'}</div>}
          </Card>
          <Card title="Daily Watch History" subtitle="Videos watched per day — last 30 days">
            <div style={{height:240}}><canvas ref={watchRef}/></div>
          </Card>
        </div>}

        {/* Commission table */}
        <Card title={t('campaignAnalytics.recentCommissions')}>
          {data.recent_commissions.length>0 ? <div style={{overflowX:'auto',marginTop:12}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>
              {['Date','Type','From','Tier','Amount'].map(function(h,i){return<th key={i} style={{textAlign:i===4?'right':'left',padding:'12px 14px',fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1.5,borderBottom:'2px solid #f1f5f9'}}>{h}</th>})}
            </tr></thead><tbody>
              {data.recent_commissions.map(function(c,i){var tl=TL[c.type]||c.type,tc=TC[c.type]||'#64748b';return<tr key={i} style={{transition:'background 0.15s'}} onMouseEnter={function(e){e.currentTarget.style.background='#f8fafc'}} onMouseLeave={function(e){e.currentTarget.style.background='transparent'}}>
                <td style={{padding:'12px 14px',borderBottom:'1px solid #f1f5f9',color:'#475569'}}>{c.date}</td>
                <td style={{padding:'12px 14px',borderBottom:'1px solid #f1f5f9'}}><span style={{display:'inline-block',padding:'4px 12px',borderRadius:8,fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:0.5,background:tc+'15',color:tc}}>{tl}</span></td>
                <td style={{padding:'12px 14px',borderBottom:'1px solid #f1f5f9',color:'#475569'}}>{c.from}</td>
                <td style={{padding:'12px 14px',borderBottom:'1px solid #f1f5f9',color:'#475569'}}>{c.tier?'Tier '+c.tier:'—'}</td>
                <td style={{padding:'12px 14px',borderBottom:'1px solid #f1f5f9',textAlign:'right',fontFamily:"'Sora',sans-serif",fontWeight:800,color:'#0f172a',fontSize:14}}>${c.amount.toFixed(2)}</td>
              </tr>})}
            </tbody></table>
          </div> : <div style={{padding:'48px 0',textAlign:'center',color:'#94a3b8',fontSize:14,fontWeight:600}}>{t('campaignAnalytics.noCommissions')}</div>}
        </Card>

      </div>
    </div>
    </AppLayout>
  );
}
