import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout';
import WorldMap from 'react-svg-worldmap';
import * as Chart from 'chart.js';

Chart.Chart.register(Chart.LineController,Chart.BarController,Chart.DoughnutController,Chart.LineElement,Chart.BarElement,Chart.ArcElement,Chart.PointElement,Chart.CategoryScale,Chart.LinearScale,Chart.Tooltip,Chart.Legend,Chart.Filler);
Chart.Chart.defaults.font.family="'Rethink Sans','DM Sans',sans-serif";
Chart.Chart.defaults.font.size=12;
Chart.Chart.defaults.color='#64748b';

var TL={direct_sponsor:'Direct 40%',uni_level:'Uni-Level',grid_completion_bonus:'Grid Bonus',membership:'Membership',membership_renewal:'Renewal',membership_sponsor:'Membership',course_direct_sale:'Course Sale',course_pass_up:'Course Pass-Up','Membership Sponsor':'Membership',nexus_sponsor:'Nexus',nexus_level:'Nexus Level',nexus_completion:'Nexus Complete',matrix_level:'Nexus Level',matrix_completion:'Nexus Complete'};
var TC={direct_sponsor:'#059669',uni_level:'#0284c7',grid_completion_bonus:'#d97706',membership:'#15803d',membership_renewal:'#16a34a',membership_sponsor:'#15803d',course_direct_sale:'#ea580c',course_pass_up:'#f97316','Membership Sponsor':'#15803d',nexus_sponsor:'#7c3aed',nexus_level:'#6d28d9',nexus_completion:'#7e22ce',matrix_level:'#6d28d9',matrix_completion:'#7e22ce'};

function useChart(cfg){var ref=useRef(null),ch=useRef(null);useEffect(function(){if(!ref.current||!cfg)return;if(ch.current)ch.current.destroy();ch.current=new Chart.Chart(ref.current,cfg);return function(){if(ch.current)ch.current.destroy()};},[cfg]);return ref;}

/* Gradient stat card */
function GC({gradient,label,value,sub,children}){
  return <div style={{background:gradient,borderRadius:14,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
    <div style={{position:'absolute',top:-25,right:-25,width:70,height:70,borderRadius:'50%',background:'rgba(255,255,255,0.08)',pointerEvents:'none'}}/>
    <div style={{position:'absolute',bottom:-18,left:-18,width:55,height:55,borderRadius:'50%',background:'rgba(255,255,255,0.05)',pointerEvents:'none'}}/>
    <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',fontWeight:600,marginBottom:4}}>{label}</div>
    <div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:900,color:'#fff'}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:3}}>{sub}</div>}
    {children}
  </div>;
}

/* White card */
function WC({title,subtitle,children,style}){
  return <div style={{background:'#fff',borderRadius:14,padding:'20px 22px',border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',position:'relative',overflow:'hidden',...style}}>
    {title&&<div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:subtitle?2:14}}>{title}</div>}
    {subtitle&&<div style={{fontSize:12,color:'#94a3b8',marginBottom:16}}>{subtitle}</div>}
    {children}
  </div>;
}

/* Sparkline mini bars */
function Spark({data,color}){
  var max=Math.max(...data,1);
  return <div style={{display:'flex',gap:2,alignItems:'flex-end',height:18}}>
    {data.map(function(v,i){return <div key={i} style={{width:3,height:Math.max(3,v/max*18),background:v>0?'rgba(255,255,255,'+(0.3+0.5*v/max)+')':'rgba(255,255,255,0.15)',borderRadius:1}}/>;})}
  </div>;
}

var cTip={backgroundColor:'#0f172a',titleColor:'#f1f5f9',bodyColor:'#cbd5e1',padding:14,cornerRadius:12,displayColors:false,borderColor:'rgba(0,0,0,0.1)',borderWidth:1};
var cGrid={color:'#f1f5f9'};
var cTick={color:'#94a3b8',font:{size:11}};

export default function AnalyticsPage(){
  var {t}=useTranslation();
  var [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(null);
  useEffect(function(){fetch('/api/analytics',{credentials:'include'}).then(function(r){return r.json()}).then(function(d){if(d.error){setError(d.error)}else{setData(d)}setLoading(false)}).catch(function(e){setError(e.message);setLoading(false)});},[]);

  /* Charts */
  var earningsRef=useChart(data?{type:'line',data:{labels:data.daily_earnings.map(function(d){var p=d.date.split('-');return p[1]+'/'+p[2]}),datasets:[{label:'Earnings',data:data.daily_earnings.map(function(d){return d.amount}),borderColor:'#0ea5e9',backgroundColor:function(ctx){var g=ctx.chart.ctx.createLinearGradient(0,0,0,280);g.addColorStop(0,'rgba(14,165,233,0.12)');g.addColorStop(1,'rgba(14,165,233,0)');return g},borderWidth:2.5,fill:true,tension:0.4,pointRadius:0,pointHoverRadius:7,pointHoverBackgroundColor:'#0ea5e9',pointHoverBorderColor:'#fff',pointHoverBorderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...cTip,callbacks:{label:function(c){return '$'+c.parsed.y.toFixed(2)}}}},scales:{x:{grid:{display:false},ticks:{...cTick,maxTicksLimit:8}},y:{grid:cGrid,ticks:{...cTick,callback:function(v){return '$'+v}}}}}}:null);

  var breakdownRef=useChart(data?(function(){var b=data.income_breakdown,tot=b.grid+b.membership+b.courses+(b.nexus||0);var cols=['#22c55e','#f59e0b','#a78bfa','#38bdf8'];if(tot===0)return{type:'doughnut',data:{labels:['No data'],datasets:[{data:[1],backgroundColor:['#e2e8f0'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false}}}};return{type:'doughnut',data:{labels:['Membership','Grid','Credit Nexus','Courses'],datasets:[{data:[b.membership,b.grid,b.nexus||0,b.courses],backgroundColor:cols,borderWidth:0,hoverOffset:10,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{position:'bottom',labels:{padding:14,usePointStyle:true,pointStyle:'circle',color:'#64748b',font:{size:11,weight:600}}},tooltip:{...cTip,callbacks:{label:function(c){return c.label+': $'+c.parsed.toFixed(2)}}}}}};})():null);

  var gridRef=useChart(data&&data.grid_progress.length>0?{type:'bar',data:{labels:data.grid_progress.map(function(g){return 'T'+g.tier}),datasets:[{label:'Filled',data:data.grid_progress.map(function(g){return g.filled}),backgroundColor:['#22c55e','#0ea5e9','#6366f1','#8b5cf6','#f59e0b','#f97316','#ef4444','#ec4899'],borderRadius:6,barThickness:20},{label:'Remaining',data:data.grid_progress.map(function(g){return 64-g.filled}),backgroundColor:'#f1f5f9',borderRadius:6,barThickness:20}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...cTip,callbacks:{label:function(c){return c.dataset.label+': '+c.parsed.x+'/64'}}}},scales:{x:{stacked:true,max:64,grid:cGrid,ticks:{...cTick,callback:function(v){return v}}},y:{stacked:true,grid:{display:false},ticks:cTick}}}}:null);

  var teamRef=useChart(data?{type:'bar',data:{labels:data.team_weekly.map(function(w){return 'W'+w.week}),datasets:[{label:'New',data:data.team_weekly.map(function(w){return w.count}),backgroundColor:'#22c55e',borderRadius:6,barThickness:14}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:cTip},scales:{x:{grid:{display:false},ticks:cTick},y:{grid:cGrid,beginAtZero:true,ticks:cTick}}}}:null);

  var streamRef=useChart(data&&data.monthly_streams.length>0?{type:'bar',data:{labels:data.monthly_streams.map(function(m){return m.month}),datasets:[{label:'Membership',data:data.monthly_streams.map(function(m){return m.membership}),backgroundColor:'#22c55e',borderRadius:4},{label:'Grid',data:data.monthly_streams.map(function(m){return m.grid}),backgroundColor:'#f59e0b',borderRadius:4},{label:'Nexus',data:data.monthly_streams.map(function(m){return m.nexus||0}),backgroundColor:'#a78bfa',borderRadius:4},{label:'Courses',data:data.monthly_streams.map(function(m){return m.courses}),backgroundColor:'#38bdf8',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:12,usePointStyle:true,pointStyle:'circle',color:'#64748b',font:{size:11,weight:600}}},tooltip:{...cTip,callbacks:{label:function(c){return c.dataset.label+': $'+c.parsed.y.toFixed(2)}}}},scales:{x:{stacked:true,grid:{display:false},ticks:cTick},y:{stacked:true,grid:cGrid,ticks:{...cTick,callback:function(v){return '$'+v}}}}}}:null);

  var watchRef=useChart(data&&data.daily_watches?{type:'bar',data:{labels:data.daily_watches.map(function(d){var p=d.date.split('-');return p[1]+'/'+p[2]}),datasets:[{label:'Watched',data:data.daily_watches.map(function(d){return d.count}),backgroundColor:'#a78bfa',borderRadius:4,barThickness:8}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{...cTip,callbacks:{label:function(c){return c.parsed.y+' videos'}}}},scales:{x:{grid:{display:false},ticks:{...cTick,maxTicksLimit:10}},y:{grid:cGrid,beginAtZero:true,ticks:{...cTick,stepSize:1}}}}}:null);

  if(loading)return<AppLayout title={t('campaignAnalytics.analyticsTitle')}><div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:80,minHeight:'60vh'}}><div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}><div style={{width:44,height:44,borderRadius:'50%',border:'3px solid #e2e8f0',borderTopColor:'#0ea5e9',animation:'spin 0.8s linear infinite'}}/><div style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,color:'#94a3b8'}}>{t('campaignAnalytics.loadingAnalytics')}</div></div><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;
  if(error)return<AppLayout title={t('campaignAnalytics.analyticsTitle')}><div style={{display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:80,minHeight:'60vh'}}><div style={{fontSize:16,fontWeight:700,color:'#ef4444'}}>{error}</div><a href="/login" style={{padding:'11px 26px',borderRadius:11,background:'#0ea5e9',color:'#fff',textDecoration:'none',fontWeight:700,fontSize:14}}>{t('campaignAnalytics.signIn')}</a></div></AppLayout>;

  var tot=data.totals;
  var ls=data.link_stats||{};
  var ws=data.withdrawal_stats||{};
  var ai=data.ai_usage||{};
  var nc=data.network_countries||[];
  var empty=function(msg){return<div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',fontSize:13,fontWeight:600}}>{msg}</div>};

  /* Build sparkline data from monthly streams */
  var mSpark=function(key){return(data.monthly_streams||[]).map(function(m){return m[key]||0})};

  return(
    <AppLayout title={t('campaignAnalytics.analyticsTitle')}>
    <div style={{background:'#f0f3f9',minHeight:'100vh'}}>
    <div style={{maxWidth:1140,margin:'0 auto',padding:'28px 24px 60px'}}>

      {/* ═══ ROW 1: Summary cards ═══ */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:12}}>
        <GC gradient="linear-gradient(135deg,#0f766e,#14b8a6)" label="Available Balance" value={'$'+(tot.balance||0).toFixed(2)} sub="Affiliate + Campaign"/>
        <GC gradient="linear-gradient(135deg,#1e40af,#3b82f6)" label="Total Earned" value={'$'+(tot.total_earned||0).toFixed(2)} sub="Lifetime all streams"/>
        <GC gradient="linear-gradient(135deg,#7e22ce,#a855f7)" label="Team Size" value={String(tot.team_size||0)} sub="Direct referrals"/>
      </div>

      {/* ═══ ROW 2: 4 Income Streams ═══ */}
      <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',color:'#94a3b8',margin:'16px 0 8px'}}>Your 4 Income Streams</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        <GC gradient="linear-gradient(135deg,#15803d,#22c55e)" label="Membership" value={'$'+(tot.membership_earnings||0).toFixed(2)} sub="50% recurring">
          <div style={{position:'absolute',top:14,right:14}}><Spark data={mSpark('membership')} color="#fff"/></div>
        </GC>
        <GC gradient="linear-gradient(135deg,#b45309,#f59e0b)" label="Campaign Grid" value={'$'+(tot.grid_earnings||0).toFixed(2)} sub="8×8 grid commissions">
          <div style={{position:'absolute',top:14,right:14}}><Spark data={mSpark('grid')} color="#fff"/></div>
        </GC>
        <GC gradient="linear-gradient(135deg,#6d28d9,#a78bfa)" label="Credit Nexus" value={'$'+(tot.nexus_earnings||0).toFixed(2)} sub="3×3 nexus commissions">
          <div style={{position:'absolute',top:14,right:14}}><Spark data={mSpark('nexus')} color="#fff"/></div>
        </GC>
        <GC gradient="linear-gradient(135deg,#0369a1,#38bdf8)" label="Courses" value={'$'+(tot.course_earnings||0).toFixed(2)} sub="Sales + pass-ups">
          <div style={{position:'absolute',top:14,right:14}}><Spark data={mSpark('courses')} color="#fff"/></div>
        </GC>
      </div>

      {/* ═══ ROW 3: Network Map + Breakdown + Team Growth ═══ */}
      <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:12,marginBottom:12}}>
        <WC title="Network by Country" subtitle="Where your team members are based">
          <div style={{borderRadius:10,overflow:'hidden',background:'#eef2ff',border:'1px solid #e2e8f0',padding:4}}>
            <WorldMap
              color="#2563eb"
              valueSuffix="members"
              size="responsive"
              data={nc.length>0?nc.map(function(c){return{country:(c.code||'').toLowerCase(),value:c.count}}):[]}
              backgroundColor="transparent"
              richInteraction
              tooltipTextFunction={function(ctx){return ctx.countryName+': '+ctx.countryValue+' member'+(ctx.countryValue!==1?'s':'')}}
              styleFunction={function(ctx){
                var hasValue=ctx.countryValue!==undefined&&ctx.countryValue>0;
                return{
                  fill:hasValue?'#2563eb':'#cbd5e1',
                  fillOpacity:hasValue?0.85:0.35,
                  stroke:'#94a3b8',
                  strokeWidth:hasValue?1.5:0.5,
                  strokeOpacity:hasValue?0.8:0.4,
                  cursor:hasValue?'pointer':'default',
                };
              }}
            />
          </div>
          {nc.length>0&&<div style={{display:'flex',gap:12,marginTop:12,flexWrap:'wrap'}}>
            {nc.map(function(c,i){return<div key={i} style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:10,height:10,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#3b82f6)'}}/><span style={{fontSize:12,fontWeight:600,color:'#334155'}}>{c.code}</span><span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'#f1f5f9',color:'#64748b'}}>{c.count}</span></div>})}
          </div>}
          {nc.length===0&&<div style={{textAlign:'center',padding:'12px 0',color:'#94a3b8',fontSize:12}}>Members will appear on the map as your team grows</div>}
        </WC>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <WC title="Income Breakdown" subtitle="By stream" style={{flex:1}}><div style={{height:200}}><canvas ref={breakdownRef}/></div></WC>
          <WC title="Team Growth" subtitle="Last 12 weeks"><div style={{height:130}}><canvas ref={teamRef}/></div></WC>
        </div>
      </div>

      {/* ═══ ROW 4: Link Clicks + Withdrawals + AI Usage ═══ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
        <WC title="Link Performance" subtitle="Your referral & short links">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div style={{background:'#f0fdf4',borderRadius:10,padding:'12px 14px'}}><div style={{fontSize:10,fontWeight:700,color:'#15803d',textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>Total Clicks</div><div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:900,color:'#166534'}}>{ls.total_clicks||0}</div></div>
            <div style={{background:'#eff6ff',borderRadius:10,padding:'12px 14px'}}><div style={{fontSize:10,fontWeight:700,color:'#1d4ed8',textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>Last 7 Days</div><div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:900,color:'#1e3a8a'}}>{ls.clicks_7d||0}</div></div>
          </div>
          {ls.devices&&(ls.devices.mobile||ls.devices.desktop)?<div style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:700,color:'#94a3b8',marginBottom:6}}>DEVICE SPLIT</div><div style={{display:'flex',height:8,borderRadius:4,overflow:'hidden',background:'#f1f5f9'}}>{ls.devices.mobile&&<div style={{width:(ls.devices.mobile/(ls.total_clicks||1)*100)+'%',background:'#22c55e',borderRadius:4}}/>}{ls.devices.desktop&&<div style={{width:(ls.devices.desktop/(ls.total_clicks||1)*100)+'%',background:'#3b82f6',borderRadius:4}}/>}</div><div style={{display:'flex',gap:12,marginTop:6}}>{ls.devices.mobile&&<span style={{fontSize:11,color:'#64748b'}}>📱 Mobile: {ls.devices.mobile}</span>}{ls.devices.desktop&&<span style={{fontSize:11,color:'#64748b'}}>🖥 Desktop: {ls.devices.desktop}</span>}</div></div>:null}
          {(ls.top_countries||[]).length>0&&<div><div style={{fontSize:11,fontWeight:700,color:'#94a3b8',marginBottom:6}}>TOP COUNTRIES</div>{ls.top_countries.map(function(c,i){return<div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0'}}><span style={{fontSize:12,color:'#334155'}}>{c.country}</span><span style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{c.clicks}</span></div>})}</div>}
          {!ls.total_clicks&&<div style={{textAlign:'center',padding:'16px 0',color:'#94a3b8',fontSize:12}}>Share your referral link to see click data</div>}
        </WC>

        <WC title="Withdrawals" subtitle="USDT on Polygon">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div style={{background:'#faf5ff',borderRadius:10,padding:'12px 14px'}}><div style={{fontSize:10,fontWeight:700,color:'#7c3aed',textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>Total Withdrawn</div><div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:900,color:'#5b21b6'}}>${ws.total_withdrawn||'0.00'}</div></div>
            <div style={{background:'#fffbeb',borderRadius:10,padding:'12px 14px'}}><div style={{fontSize:10,fontWeight:700,color:'#b45309',textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>Pending</div><div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:900,color:'#92400e'}}>${ws.pending||'0.00'}</div></div>
          </div>
          {ws.last_date?<div style={{background:'#f8fafc',borderRadius:10,padding:'12px 14px'}}><div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>Last withdrawal</div><div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>${ws.last_amount}</span><span style={{fontSize:12,color:'#64748b'}}>{ws.last_date}</span></div></div>:<div style={{textAlign:'center',padding:'16px 0',color:'#94a3b8',fontSize:12}}>No withdrawals yet</div>}
        </WC>

        <WC title="AI Tools Usage" subtitle="Lifetime content generated">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[{label:'Campaign Studio',val:ai.campaign_studio||0,bg:'#eff6ff',color:'#1d4ed8'},{label:'Social Posts',val:ai.social_posts||0,bg:'#f0fdf4',color:'#15803d'},{label:'Video Scripts',val:ai.video_scripts||0,bg:'#faf5ff',color:'#7c3aed'},{label:'Niche Finder',val:ai.niche_finder||0,bg:'#fffbeb',color:'#b45309'}].map(function(a,i){return<div key={i} style={{background:a.bg,borderRadius:10,padding:'12px 14px'}}><div style={{fontSize:10,fontWeight:700,color:a.color,textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>{a.label}</div><div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:900,color:a.color}}>{a.val}</div></div>})}
          </div>
          <div style={{marginTop:12,background:'linear-gradient(135deg,#f0f9ff,#eff6ff)',borderRadius:10,padding:'12px 14px',textAlign:'center'}}><span style={{fontSize:12,fontWeight:700,color:'#1e40af'}}>{ai.total||0} total AI generations</span></div>
        </WC>
      </div>

      {/* ═══ ROW 5: Earnings Trend + Monthly Streams ═══ */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,marginBottom:12}}>
        <WC title={t('campaignAnalytics.earningsTrend')} subtitle={t('campaignAnalytics.last30days')}><div style={{height:260}}><canvas ref={earningsRef}/></div></WC>
        <WC title={t('campaignAnalytics.earningsByStream')} subtitle="Monthly — last 6 months"><div style={{height:260}}><canvas ref={streamRef}/></div></WC>
      </div>

      {/* ═══ ROW 6: Grid + Campaigns ═══ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <WC title={t('campaignAnalytics.gridProgress')} subtitle={t('campaignAnalytics.gridProgressDesc')}>{data.grid_progress.length>0?<div style={{height:220}}><canvas ref={gridRef}/></div>:empty('No active grids yet')}</WC>
        <WC title={t('campaignAnalytics.campaignPerf')} subtitle={t('campaignAnalytics.campaignPerfDesc')}>{data.campaigns.length>0?<div style={{height:220}}>
          {data.campaigns.map(function(c,i){var pct=c.views_target?Math.round(c.views_delivered/c.views_target*100):0;return<div key={i} style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span style={{fontWeight:700,color:'#0f172a'}}>Tier {c.tier}</span><span style={{color:'#64748b'}}>{c.views_delivered.toLocaleString()} / {c.views_target.toLocaleString()}</span></div><div style={{height:10,borderRadius:5,background:'#f1f5f9',overflow:'hidden'}}><div style={{height:'100%',width:pct+'%',background:'linear-gradient(90deg,#6366f1,#818cf8)',borderRadius:5}}/></div></div>})}
        </div>:empty('No active campaigns')}</WC>
      </div>

      {/* ═══ ROW 7: Campaign Qualification ═══ */}
      {data.watch_stats&&<>
        <div style={{margin:'16px 0 8px'}}><div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800,color:'#0f172a'}}>Campaign Qualification</div><div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>Your daily watch requirement to qualify for Campaign Wallet withdrawals. This is not an income stream — it is your accountability check-in.</div></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12,marginBottom:12}}>
          <WC title="Watch Status" subtitle="Daily quota compliance">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[{l:'Lifetime Views',v:String(data.watch_stats.total_watched),c:'#7c3aed'},{l:'Streak',v:data.watch_stats.streak_days+' days',c:'#b45309'},{l:"Today's Quota",v:data.watch_stats.today_watched+' / '+data.watch_stats.daily_required,c:data.watch_stats.today_watched>=data.watch_stats.daily_required?'#15803d':'#94a3b8'},{l:'Status',v:data.watch_stats.commissions_paused?'Paused':'Qualified',c:data.watch_stats.commissions_paused?'#dc2626':'#15803d'}].map(function(s,i){return<div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'12px 14px',border:'1px solid #f1f5f9'}}><div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>{s.l}</div><div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:900,color:s.c}}>{s.v}</div></div>})}
            </div>
            {data.watch_stats.commissions_paused&&<div style={{marginTop:10,padding:'10px 14px',borderRadius:10,background:'#fef2f2',border:'1px solid #fecaca',fontSize:12,fontWeight:600,color:'#dc2626'}}>Campaign withdrawals paused — resume watching to requalify</div>}
            {!data.watch_stats.commissions_paused&&data.watch_stats.consecutive_missed>0&&<div style={{marginTop:10,padding:'10px 14px',borderRadius:10,background:'#fffbeb',border:'1px solid #fde68a',fontSize:12,fontWeight:600,color:'#b45309'}}>{data.watch_stats.consecutive_missed} day{data.watch_stats.consecutive_missed>1?'s':''} missed — watch today to maintain qualification</div>}
            {!data.watch_stats.commissions_paused&&data.watch_stats.consecutive_missed===0&&data.watch_stats.today_watched>=data.watch_stats.daily_required&&<div style={{marginTop:10,padding:'10px 14px',borderRadius:10,background:'#f0fdf4',border:'1px solid #bbf7d0',fontSize:12,fontWeight:600,color:'#15803d'}}>Quota met today — withdrawals qualified</div>}
          </WC>
          <WC title="Daily Watch Log" subtitle="Videos watched per day — last 30 days"><div style={{height:180}}><canvas ref={watchRef}/></div></WC>
        </div>
      </>}

      {/* ═══ ROW 8: Commission Table ═══ */}
      <WC title={t('campaignAnalytics.recentCommissions')}>
        {data.recent_commissions.length>0?<div style={{overflowX:'auto',marginTop:8}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>
            {['Date','Type','From','Tier','Amount'].map(function(h,i){return<th key={i} style={{textAlign:i===4?'right':'left',padding:'10px 12px',fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1.5,borderBottom:'2px solid #f1f5f9'}}>{h}</th>})}
          </tr></thead><tbody>
            {data.recent_commissions.map(function(c,i){var tl=TL[c.type]||c.type,tc=TC[c.type]||'#64748b';return<tr key={i} style={{transition:'background 0.15s'}} onMouseEnter={function(e){e.currentTarget.style.background='#f8fafc'}} onMouseLeave={function(e){e.currentTarget.style.background='transparent'}}>
              <td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',color:'#475569'}}>{c.date}</td>
              <td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9'}}><span style={{display:'inline-block',padding:'3px 10px',borderRadius:8,fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:0.5,background:tc+'15',color:tc}}>{tl}</span></td>
              <td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',color:'#475569'}}>{c.from}</td>
              <td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',color:'#475569'}}>{c.tier?'Tier '+c.tier:'—'}</td>
              <td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',textAlign:'right',fontFamily:"'Sora',sans-serif",fontWeight:800,color:'#0f172a',fontSize:14}}>${c.amount.toFixed(2)}</td>
            </tr>})}
          </tbody></table>
        </div>:<div style={{padding:'40px 0',textAlign:'center',color:'#94a3b8',fontSize:13,fontWeight:600}}>{t('campaignAnalytics.noCommissions')}</div>}
      </WC>

    </div>
    </div>
    <style>{`@media(max-width:767px){.analytics-responsive{grid-template-columns:1fr!important}}`}</style>
    </AppLayout>
  );
}
