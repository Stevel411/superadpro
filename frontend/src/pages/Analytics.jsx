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
Chart.Chart.defaults.font.family = "'DM Sans',sans-serif";
Chart.Chart.defaults.font.size = 12;
Chart.Chart.defaults.color = 'var(--sap-text-muted)';

function CB({ title, subtitle, children, style }) {
  return <div style={{ background:'#fff', border:'1px solid #e8ecf2', borderRadius:14, padding:24, ...style }}>
    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:800, color:'var(--sap-text-primary)', marginBottom:2 }}>{title}</div>
    {subtitle && <div style={{ fontSize:13, color:'var(--sap-text-muted)', marginBottom:20 }}>{subtitle}</div>}
    {children}
  </div>;
}

function useChart(cfg) {
  var ref = useRef(null), ch = useRef(null);
  useEffect(function() { if (!ref.current||!cfg) return; if (ch.current) ch.current.destroy(); ch.current = new Chart.Chart(ref.current, cfg); return function() { if (ch.current) ch.current.destroy(); }; }, [cfg]);
  return ref;
}

var TL = { direct_sponsor:'Direct 40%', uni_level:'Uni-Level', grid_completion_bonus:'Grid Bonus', membership:'Membership', membership_renewal:'Renewal', course_direct_sale:'Course Sale', course_pass_up:'Course Pass-Up' };
var TC = { direct_sponsor:'var(--sap-green-mid)', uni_level:'var(--sap-accent)', grid_completion_bonus:'var(--sap-amber)', membership:'var(--sap-purple)', membership_renewal:'var(--sap-purple-light)', course_direct_sale:'var(--sap-amber-bright)', course_pass_up:'#f97316' };
var TIER_COLORS = ['var(--sap-green-mid)','var(--sap-accent)','var(--sap-indigo)','var(--sap-purple)','var(--sap-amber)','#f97316','var(--sap-red-bright)','var(--sap-amber-bright)'];

export default function AnalyticsPage() {
  var { t } = useTranslation();
  var [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null);
  useEffect(function() { fetch('/api/analytics',{credentials:'include'}).then(function(r){return r.json()}).then(function(d){if(d.error){setError(d.error)}else{setData(d)}setLoading(false)}).catch(function(e){setError(e.message);setLoading(false)}); }, []);

  var earningsRef = useChart(data ? { type:'line', data:{ labels:data.daily_earnings.map(function(d){var p=d.date.split('-');return p[1]+'/'+p[2]}), datasets:[{label:'Earnings',data:data.daily_earnings.map(function(d){return d.amount}),borderColor:'var(--sap-accent)',backgroundColor:'rgba(14,165,233,0.08)',borderWidth:2.5,fill:true,tension:0.4,pointRadius:0,pointHoverRadius:6,pointHoverBackgroundColor:'var(--sap-accent)',pointHoverBorderColor:'#fff',pointHoverBorderWidth:3}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'var(--sap-text-primary)',padding:12,cornerRadius:10,displayColors:false,callbacks:{label:function(c){return '$'+c.parsed.y.toFixed(2)}}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}},y:{grid:{color:'var(--sap-bg-page)'},ticks:{callback:function(v){return '$'+v}}}}} } : null);

  var breakdownRef = useChart(data ? (function(){var b=data.income_breakdown,tot=b.grid+b.membership+b.courses+b.supermarket;if(tot===0)return{type:'doughnut',data:{labels:['No data'],datasets:[{data:[1],backgroundColor:['var(--sap-border)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom'}}}};return{type:'doughnut',data:{labels:['Grid','Membership','Courses','SuperMarket'],datasets:[{data:[b.grid,b.membership,b.courses,b.supermarket],backgroundColor:['var(--sap-indigo)','var(--sap-green-mid)','var(--sap-amber)','var(--sap-accent)'],borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',font:{size:12,weight:600}}},tooltip:{backgroundColor:'var(--sap-text-primary)',padding:12,cornerRadius:10,callbacks:{label:function(c){return c.label+': $'+c.parsed.toFixed(2)}}}}}}})():null);

  var gridRef = useChart(data && data.grid_progress.length>0 ? {type:'bar',data:{labels:data.grid_progress.map(function(g){return 'T'+g.tier+' $'+g.price}),datasets:[{label:'Filled',data:data.grid_progress.map(function(g){return g.filled}),backgroundColor:data.grid_progress.map(function(g){return TIER_COLORS[g.tier-1]}),borderRadius:8,barThickness:28},{label:'Remaining',data:data.grid_progress.map(function(g){return 64-g.filled}),backgroundColor:'rgba(0,0,0,0.04)',borderRadius:8,barThickness:28}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'var(--sap-text-primary)',padding:12,cornerRadius:10,callbacks:{label:function(c){return c.dataset.label+': '+c.parsed.x+'/64'}}}},scales:{x:{stacked:true,max:64,grid:{color:'var(--sap-bg-page)'},ticks:{callback:function(v){return v+'/64'}}},y:{stacked:true,grid:{display:false}}}}} : null);

  var campaignRef = useChart(data && data.campaigns.length>0 ? {type:'bar',data:{labels:data.campaigns.map(function(c){return 'Tier '+c.tier}),datasets:[{label:'Delivered',data:data.campaigns.map(function(c){return c.views_delivered}),backgroundColor:'var(--sap-indigo)',borderRadius:6},{label:'Target',data:data.campaigns.map(function(c){return c.views_target}),backgroundColor:'rgba(99,102,241,0.12)',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',font:{size:12,weight:600}}},tooltip:{backgroundColor:'var(--sap-text-primary)',padding:12,cornerRadius:10,callbacks:{label:function(c){return c.dataset.label+': '+c.parsed.y.toLocaleString()}}}},scales:{x:{grid:{display:false}},y:{grid:{color:'var(--sap-bg-page)'},ticks:{callback:function(v){return v>=1000?(v/1000)+'K':v}}}}}} : null);

  var teamRef = useChart(data ? {type:'bar',data:{labels:data.team_weekly.map(function(w){return 'W'+w.week}),datasets:[{label:'New Referrals',data:data.team_weekly.map(function(w){return w.count}),backgroundColor:'var(--sap-green-mid)',borderRadius:8,barThickness:20}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'var(--sap-text-primary)',padding:12,cornerRadius:10}},scales:{x:{grid:{display:false}},y:{grid:{color:'var(--sap-bg-page)'},beginAtZero:true}}}} : null);

  var streamRef = useChart(data && data.monthly_streams.length>0 ? {type:'bar',data:{labels:data.monthly_streams.map(function(m){return m.month}),datasets:[{label:'Membership',data:data.monthly_streams.map(function(m){return m.membership}),backgroundColor:'var(--sap-green-mid)',borderRadius:4},{label:'Grid',data:data.monthly_streams.map(function(m){return m.grid}),backgroundColor:'var(--sap-indigo)',borderRadius:4},{label:'Courses',data:data.monthly_streams.map(function(m){return m.courses}),backgroundColor:'var(--sap-amber)',borderRadius:4},{label:'SuperMarket',data:data.monthly_streams.map(function(m){return m.supermarket}),backgroundColor:'var(--sap-accent)',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:12,usePointStyle:true,pointStyle:'circle',font:{size:11,weight:600}}},tooltip:{backgroundColor:'var(--sap-text-primary)',padding:12,cornerRadius:10,callbacks:{label:function(c){return c.dataset.label+': $'+c.parsed.y.toFixed(2)}}}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,grid:{color:'var(--sap-bg-page)'},ticks:{callback:function(v){return '$'+v}}}}}} : null);

  if (loading) return <AppLayout title={t('campaignAnalytics.title')}><div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:80}}><div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:'var(--sap-text-muted)'}}>{t('campaignAnalytics.loadingAnalytics')}</div></div></AppLayout>;
  if (error) return <AppLayout title={t('campaignAnalytics.title')}><div style={{display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:80}}><div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:'var(--sap-red-bright)'}}>{t('campaignAnalytics.errorLoading')}</div><div style={{fontSize:14,color:'var(--sap-text-muted)'}}>{error}</div><a href="/login" style={{marginTop:8,padding:'10px 24px',borderRadius:10,background:'var(--sap-accent)',color:'#fff',textDecoration:'none',fontWeight:700,fontSize:14}}>{t('campaignAnalytics.signIn')}</a></div></AppLayout>;

  var totals = data.totals;
  var empty = function(msg) { return <div style={{height:280,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--sap-text-muted)',fontSize:14}}>{msg}</div>; };

  return (
    <AppLayout title={t('campaignAnalytics.title')}>
    <div style={{background:'#f0f3f9'}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'24px 24px'}}>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
          {[{l:'Balance',v:'$'+totals.balance.toFixed(2),s:'Available to withdraw',c:'var(--sap-green-mid)',i:'💰'},{l:'Total Earned',v:'$'+totals.total_earned.toFixed(2),s:'Lifetime earnings',c:'var(--sap-accent)',i:'📈'},{l:'Grid Earnings',v:'$'+totals.grid_earnings.toFixed(2),s:(data.grid_progress.length||0)+' active grids',c:'var(--sap-indigo)',i:'🔲'},{l:'Team Size',v:String(totals.team_size),s:'Direct referrals',c:'var(--sap-amber)',i:'👥'}].map(function(s,i){return<div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:24,position:'relative'}}><div style={{position:'absolute',top:16,right:16,width:44,height:44,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,background:s.c+'15'}}>{s.i}</div><div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>{s.l}</div><div style={{fontFamily:"'Sora',sans-serif",fontSize:32,fontWeight:900,color:'var(--sap-text-primary)'}}>{s.v}</div><div style={{fontSize:13,fontWeight:600,color:s.c,marginTop:6}}>↑ {s.s}</div></div>})}
        </div>
        {/* Row 1 */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:24}}>
          <CB title={t('campaignAnalytics.earningsTrend')} subtitle={t('campaignAnalytics.last30days')}><div style={{height:280}}><canvas ref={earningsRef}/></div></CB>
          <CB title={t('campaignAnalytics.incomeBreakdown')} subtitle={t('campaignAnalytics.incomeBreakdownDesc')}><div style={{height:280}}><canvas ref={breakdownRef}/></div></CB>
        </div>
        {/* Row 2 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
          <CB title={t('campaignAnalytics.gridProgress')} subtitle={t('campaignAnalytics.gridProgressDesc')}>{data.grid_progress.length>0?<div style={{height:280}}><canvas ref={gridRef}/></div>:empty('No active grids yet')}</CB>
          <CB title={t('campaignAnalytics.campaignPerf')} subtitle={t('campaignAnalytics.campaignPerfDesc')}>{data.campaigns.length>0?<div style={{height:280}}><canvas ref={campaignRef}/></div>:empty('No active campaigns')}</CB>
        </div>
        {/* Row 3 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
          <CB title={t('campaignAnalytics.teamGrowth')} subtitle={t('campaignAnalytics.teamGrowthDesc')}><div style={{height:280}}><canvas ref={teamRef}/></div></CB>
          <CB title={t('campaignAnalytics.earningsByStream')} subtitle={t('campaignAnalytics.earningsByStreamDesc')}><div style={{height:280}}><canvas ref={streamRef}/></div></CB>
        </div>
        {/* Commission table */}
        <CB title={t('campaignAnalytics.recentCommissions')} style={{marginBottom:24}}>
          {data.recent_commissions.length>0 ? <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginTop:16}}><thead><tr>{['Date','Type','From','Tier','Amount'].map(function(h,i){return<th key={i} style={{textAlign:i===4?'right':'left',padding:'10px 12px',fontSize:11,fontWeight:700,color:'var(--sap-text-muted)',textTransform:'uppercase',letterSpacing:1,borderBottom:'2px solid #f1f5f9'}}>{h}</th>})}</tr></thead><tbody>{data.recent_commissions.map(function(c,i){var tl=TL[c.type]||c.type,tc=TC[c.type]||'var(--sap-text-muted)';return<tr key={i}><td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',color:'#334155'}}>{c.date}</td><td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9'}}><span style={{display:'inline-block',padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:800,textTransform:'uppercase',background:tc+'15',color:tc}}>{tl}</span></td><td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',color:'#334155'}}>{c.from}</td><td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',color:'#334155'}}>{c.tier?'Tier '+c.tier:'—'}</td><td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',textAlign:'right',fontFamily:"'Sora',sans-serif",fontWeight:800,color:'var(--sap-text-primary)'}}>${c.amount.toFixed(2)}</td></tr>})}</tbody></table> : <div style={{padding:'40px 0',textAlign:'center',color:'var(--sap-text-muted)',fontSize:14}}>{t('campaignAnalytics.noCommissions')}</div>}
        </CB>
      </div>
    </div>
    </AppLayout>
  );
}
