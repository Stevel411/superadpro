import { useState, useEffect, useRef } from 'react';
import * as Chart from 'chart.js';

Chart.Chart.register(
  Chart.LineController, Chart.BarController, Chart.DoughnutController,
  Chart.LineElement, Chart.BarElement, Chart.ArcElement,
  Chart.PointElement, Chart.CategoryScale, Chart.LinearScale,
  Chart.Tooltip, Chart.Legend, Chart.Filler
);
Chart.Chart.defaults.font.family = "'DM Sans',sans-serif";
Chart.Chart.defaults.font.size = 12;
Chart.Chart.defaults.color = '#94a3b8';

function CB({ title, subtitle, children, style }) {
  return <div style={{ background:'#fff', border:'1px solid #e8ecf2', borderRadius:14, padding:24, ...style }}>
    <div style={{ fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:2 }}>{title}</div>
    {subtitle && <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20 }}>{subtitle}</div>}
    {children}
  </div>;
}

function useChart(cfg) {
  var ref = useRef(null), ch = useRef(null);
  useEffect(function() { if (!ref.current||!cfg) return; if (ch.current) ch.current.destroy(); ch.current = new Chart.Chart(ref.current, cfg); return function() { if (ch.current) ch.current.destroy(); }; }, [cfg]);
  return ref;
}

var TL = { direct_sponsor:'Direct 40%', uni_level:'Uni-Level', grid_completion_bonus:'Grid Bonus', membership:'Membership', membership_renewal:'Renewal', course_direct_sale:'Course Sale', course_pass_up:'Course Pass-Up' };
var TC = { direct_sponsor:'#10b981', uni_level:'#0ea5e9', grid_completion_bonus:'#f59e0b', membership:'#8b5cf6', membership_renewal:'#a78bfa', course_direct_sale:'#fbbf24', course_pass_up:'#f97316' };
var TIER_COLORS = ['#10b981','#0ea5e9','#6366f1','#8b5cf6','#f59e0b','#f97316','#ef4444','#fbbf24'];

export default function AnalyticsPage() {
  var [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null);
  useEffect(function() { fetch('/api/analytics',{credentials:'include'}).then(function(r){return r.json()}).then(function(d){if(d.error){setError(d.error)}else{setData(d)}setLoading(false)}).catch(function(e){setError(e.message);setLoading(false)}); }, []);

  var earningsRef = useChart(data ? { type:'line', data:{ labels:data.daily_earnings.map(function(d){var p=d.date.split('-');return p[1]+'/'+p[2]}), datasets:[{label:'Earnings',data:data.daily_earnings.map(function(d){return d.amount}),borderColor:'#0ea5e9',backgroundColor:'rgba(14,165,233,0.08)',borderWidth:2.5,fill:true,tension:0.4,pointRadius:0,pointHoverRadius:6,pointHoverBackgroundColor:'#0ea5e9',pointHoverBorderColor:'#fff',pointHoverBorderWidth:3}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#0f172a',padding:12,cornerRadius:10,displayColors:false,callbacks:{label:function(c){return '$'+c.parsed.y.toFixed(2)}}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}},y:{grid:{color:'#f1f5f9'},ticks:{callback:function(v){return '$'+v}}}}} } : null);

  var breakdownRef = useChart(data ? (function(){var b=data.income_breakdown,tot=b.grid+b.membership+b.courses+b.supermarket;if(tot===0)return{type:'doughnut',data:{labels:['No data'],datasets:[{data:[1],backgroundColor:['#e2e8f0'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom'}}}};return{type:'doughnut',data:{labels:['Grid','Membership','Courses','SuperMarket'],datasets:[{data:[b.grid,b.membership,b.courses,b.supermarket],backgroundColor:['#6366f1','#10b981','#f59e0b','#0ea5e9'],borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',font:{size:12,weight:600}}},tooltip:{backgroundColor:'#0f172a',padding:12,cornerRadius:10,callbacks:{label:function(c){return c.label+': $'+c.parsed.toFixed(2)}}}}}}})():null);

  var gridRef = useChart(data && data.grid_progress.length>0 ? {type:'bar',data:{labels:data.grid_progress.map(function(g){return 'T'+g.tier+' $'+g.price}),datasets:[{label:'Filled',data:data.grid_progress.map(function(g){return g.filled}),backgroundColor:data.grid_progress.map(function(g){return TIER_COLORS[g.tier-1]}),borderRadius:8,barThickness:28},{label:'Remaining',data:data.grid_progress.map(function(g){return 64-g.filled}),backgroundColor:'rgba(0,0,0,0.04)',borderRadius:8,barThickness:28}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#0f172a',padding:12,cornerRadius:10,callbacks:{label:function(c){return c.dataset.label+': '+c.parsed.x+'/64'}}}},scales:{x:{stacked:true,max:64,grid:{color:'#f1f5f9'},ticks:{callback:function(v){return v+'/64'}}},y:{stacked:true,grid:{display:false}}}}} : null);

  var campaignRef = useChart(data && data.campaigns.length>0 ? {type:'bar',data:{labels:data.campaigns.map(function(c){return 'Tier '+c.tier}),datasets:[{label:'Delivered',data:data.campaigns.map(function(c){return c.views_delivered}),backgroundColor:'#6366f1',borderRadius:6},{label:'Target',data:data.campaigns.map(function(c){return c.views_target}),backgroundColor:'rgba(99,102,241,0.12)',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',font:{size:12,weight:600}}},tooltip:{backgroundColor:'#0f172a',padding:12,cornerRadius:10,callbacks:{label:function(c){return c.dataset.label+': '+c.parsed.y.toLocaleString()}}}},scales:{x:{grid:{display:false}},y:{grid:{color:'#f1f5f9'},ticks:{callback:function(v){return v>=1000?(v/1000)+'K':v}}}}}} : null);

  var teamRef = useChart(data ? {type:'bar',data:{labels:data.team_weekly.map(function(w){return 'W'+w.week}),datasets:[{label:'New Referrals',data:data.team_weekly.map(function(w){return w.count}),backgroundColor:'#10b981',borderRadius:8,barThickness:20}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#0f172a',padding:12,cornerRadius:10}},scales:{x:{grid:{display:false}},y:{grid:{color:'#f1f5f9'},beginAtZero:true}}}} : null);

  var streamRef = useChart(data && data.monthly_streams.length>0 ? {type:'bar',data:{labels:data.monthly_streams.map(function(m){return m.month}),datasets:[{label:'Membership',data:data.monthly_streams.map(function(m){return m.membership}),backgroundColor:'#10b981',borderRadius:4},{label:'Grid',data:data.monthly_streams.map(function(m){return m.grid}),backgroundColor:'#6366f1',borderRadius:4},{label:'Courses',data:data.monthly_streams.map(function(m){return m.courses}),backgroundColor:'#f59e0b',borderRadius:4},{label:'SuperMarket',data:data.monthly_streams.map(function(m){return m.supermarket}),backgroundColor:'#0ea5e9',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:12,usePointStyle:true,pointStyle:'circle',font:{size:11,weight:600}}},tooltip:{backgroundColor:'#0f172a',padding:12,cornerRadius:10,callbacks:{label:function(c){return c.dataset.label+': $'+c.parsed.y.toFixed(2)}}}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,grid:{color:'#f1f5f9'},ticks:{callback:function(v){return '$'+v}}}}}} : null);

  if (loading) return <div style={{minHeight:'100vh',background:'#f0f3f9',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:'#94a3b8'}}>Loading analytics...</div></div>;
  if (error) return <div style={{minHeight:'100vh',background:'#f0f3f9',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}><div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:'#ef4444'}}>Error loading analytics</div><div style={{fontSize:14,color:'#64748b'}}>{error}</div><a href="/login" style={{marginTop:8,padding:'10px 24px',borderRadius:10,background:'#0ea5e9',color:'#fff',textDecoration:'none',fontWeight:700,fontSize:14}}>Sign In</a></div>;

  var t = data.totals;
  var empty = function(msg) { return <div style={{height:280,display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',fontSize:14}}>{msg}</div>; };

  return (
    <div style={{background:'#f0f3f9',minHeight:'100vh'}}>
      <div style={{background:'#fff',borderBottom:'1px solid #e8ecf2',padding:'20px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><h1 style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:800,color:'#0f172a',margin:0}}>Analytics</h1><div style={{fontSize:13,color:'#94a3b8',marginTop:2}}>Your complete earnings overview</div></div>
        <a href="/dashboard" style={{padding:'8px 20px',borderRadius:10,background:'#f1f5f9',color:'#334155',textDecoration:'none',fontWeight:700,fontSize:13,border:'1px solid #e2e8f0'}}>← Dashboard</a>
      </div>
      <div style={{maxWidth:1100,margin:'24px auto',padding:'0 24px'}}>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
          {[{l:'Balance',v:'$'+t.balance.toFixed(2),s:'Available to withdraw',c:'#10b981',i:'💰'},{l:'Total Earned',v:'$'+t.total_earned.toFixed(2),s:'Lifetime earnings',c:'#0ea5e9',i:'📈'},{l:'Grid Earnings',v:'$'+t.grid_earnings.toFixed(2),s:(data.grid_progress.length||0)+' active grids',c:'#6366f1',i:'🔲'},{l:'Team Size',v:String(t.team_size),s:'Direct referrals',c:'#f59e0b',i:'👥'}].map(function(s,i){return<div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:24,position:'relative'}}><div style={{position:'absolute',top:16,right:16,width:44,height:44,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,background:s.c+'15'}}>{s.i}</div><div style={{fontSize:12,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>{s.l}</div><div style={{fontFamily:"'Sora',sans-serif",fontSize:32,fontWeight:900,color:'#0f172a'}}>{s.v}</div><div style={{fontSize:13,fontWeight:600,color:s.c,marginTop:6}}>↑ {s.s}</div></div>})}
        </div>
        {/* Row 1 */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:24}}>
          <CB title="Earnings Trend" subtitle="Last 30 days"><div style={{height:280}}><canvas ref={earningsRef}/></div></CB>
          <CB title="Income Breakdown" subtitle="Where your earnings come from"><div style={{height:280}}><canvas ref={breakdownRef}/></div></CB>
        </div>
        {/* Row 2 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
          <CB title="Grid Progress" subtitle="Positions filled per active tier">{data.grid_progress.length>0?<div style={{height:280}}><canvas ref={gridRef}/></div>:empty('No active grids yet')}</CB>
          <CB title="Campaign Performance" subtitle="Views delivered vs target">{data.campaigns.length>0?<div style={{height:280}}><canvas ref={campaignRef}/></div>:empty('No active campaigns')}</CB>
        </div>
        {/* Row 3 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
          <CB title="Team Growth" subtitle="New referrals per week — last 12 weeks"><div style={{height:280}}><canvas ref={teamRef}/></div></CB>
          <CB title="Earnings by Stream" subtitle="Monthly — last 6 months"><div style={{height:280}}><canvas ref={streamRef}/></div></CB>
        </div>
        {/* Commission table */}
        <CB title="Recent Commissions" style={{marginBottom:24}}>
          {data.recent_commissions.length>0 ? <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginTop:16}}><thead><tr>{['Date','Type','From','Tier','Amount'].map(function(h,i){return<th key={i} style={{textAlign:i===4?'right':'left',padding:'10px 12px',fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,borderBottom:'2px solid #f1f5f9'}}>{h}</th>})}</tr></thead><tbody>{data.recent_commissions.map(function(c,i){var tl=TL[c.type]||c.type,tc=TC[c.type]||'#64748b';return<tr key={i}><td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',color:'#334155'}}>{c.date}</td><td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9'}}><span style={{display:'inline-block',padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:800,textTransform:'uppercase',background:tc+'15',color:tc}}>{tl}</span></td><td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',color:'#334155'}}>{c.from}</td><td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',color:'#334155'}}>{c.tier?'Tier '+c.tier:'—'}</td><td style={{padding:'10px 12px',borderBottom:'1px solid #f1f5f9',textAlign:'right',fontFamily:"'Sora',sans-serif",fontWeight:800,color:'#0f172a'}}>${c.amount.toFixed(2)}</td></tr>})}</tbody></table> : <div style={{padding:'40px 0',textAlign:'center',color:'#94a3b8',fontSize:14}}>No commissions yet. Start sharing your SuperLink!</div>}
        </CB>
      </div>
    </div>
  );
}
