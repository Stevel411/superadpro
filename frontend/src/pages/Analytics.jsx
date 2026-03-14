import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Eye, MousePointer, Users, DollarSign, TrendingUp, Target, Tv, Award, Wallet, BarChart3, PieChart, Activity } from 'lucide-react';

export default function Analytics() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiGet('/api/analytics').then(r => { setD(r); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading) return <AppLayout title="Analytics"><Spin/></AppLayout>;
  const data = d || {};

  const convRate = data.total_views > 0 ? ((data.conversions / data.total_views) * 100).toFixed(1) : '0.0';
  const ctr = data.total_views > 0 ? ((data.total_clicks / data.total_views) * 100).toFixed(1) : '0.0';

  return (
    <AppLayout title="Analytics" subtitle="Track your performance across all channels">

      {/* Top stats — 4 primary metrics */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {Icon:Eye,val:data.total_views||0,lbl:'Total Views',color:'#0ea5e9',bg:'#e0f2fe'},
          {Icon:MousePointer,val:data.total_clicks||0,lbl:'Link Clicks',color:'#6366f1',bg:'#ede9fe',sub:`${ctr}% CTR`},
          {Icon:Users,val:data.conversions||0,lbl:'Referrals',color:'#16a34a',bg:'#dcfce7',sub:`${convRate}% conv rate`},
          {Icon:DollarSign,val:`$${(data.revenue||0).toFixed(0)}`,lbl:'Total Revenue',color:'#d97706',bg:'#fef3c7'},
        ].map((s,i) => (
          <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,padding:'16px 18px',boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:s.color}}/>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div style={{width:36,height:36,borderRadius:8,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><s.Icon size={18} color={s.color} strokeWidth={2}/></div>
              {s.sub && <span style={{fontSize:10,fontWeight:700,color:s.color,background:s.bg,padding:'2px 8px',borderRadius:4}}>{s.sub}</span>}
            </div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:800,color:s.color}}>{s.val}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{s.lbl}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        {/* Revenue Breakdown */}
        <Card title="Revenue Breakdown" Icon={PieChart} color="#d97706">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              {lbl:'Grid Earnings',val:`$${(data.grid_earnings||0).toFixed(0)}`,color:'#0ea5e9',pct:data.revenue>0?Math.round((data.grid_earnings||0)/data.revenue*100):0},
              {lbl:'Course Sales',val:`$${(data.course_earnings||0).toFixed(0)}`,color:'#6366f1',pct:data.revenue>0?Math.round((data.course_earnings||0)/data.revenue*100):0},
              {lbl:'Marketplace',val:`$${(data.marketplace_earnings||0).toFixed(0)}`,color:'#e11d48',pct:data.revenue>0?Math.round((data.marketplace_earnings||0)/data.revenue*100):0},
              {lbl:'Balance',val:`$${(data.balance||0).toFixed(2)}`,color:'#16a34a',pct:null},
            ].map((r,i) => (
              <div key={i} style={{background:'#f8f9fb',borderRadius:8,padding:'12px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5}}>{r.lbl}</span>
                  {r.pct !== null && <span style={{fontSize:9,fontWeight:700,color:r.color}}>{r.pct}%</span>}
                </div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:20,fontWeight:800,color:r.color}}>{r.val}</div>
                {r.pct !== null && <div style={{height:3,background:'#e5e7eb',borderRadius:2,marginTop:6}}><div style={{height:'100%',background:r.color,borderRadius:2,width:`${r.pct}%`,transition:'width .5s'}}/></div>}
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,padding:'10px 0',borderTop:'1px solid #f1f3f7'}}>
            <span style={{fontSize:11,fontWeight:700,color:'#94a3b8'}}>Total Withdrawn</span>
            <span style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a'}}>${(data.total_withdrawn||0).toFixed(2)}</span>
          </div>
        </Card>

        {/* Network Performance */}
        <Card title="Network Performance" Icon={TrendingUp} color="#16a34a">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
            {[
              {val:data.direct_referrals||0,lbl:'Direct Referrals',color:'#0ea5e9'},
              {val:data.active_referrals||0,lbl:'Active Members',color:'#16a34a'},
              {val:data.total_team||0,lbl:'Total Network',color:'#6366f1'},
            ].map((s,i) => (
              <div key={i} style={{background:'#f8f9fb',borderRadius:8,padding:'14px 12px',textAlign:'center'}}>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:s.color}}>{s.val}</div>
                <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,marginTop:3}}>{s.lbl}</div>
              </div>
            ))}
          </div>
          {/* Referral conversion rate */}
          <div style={{background:'#f8f9fb',borderRadius:8,padding:'12px 14px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>Referral Activity Rate</span>
              <span style={{fontSize:12,fontWeight:800,color:'#16a34a'}}>{data.direct_referrals>0?Math.round((data.active_referrals||0)/(data.direct_referrals)*100):0}%</span>
            </div>
            <div style={{height:6,background:'#e5e7eb',borderRadius:3}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#0ea5e9,#16a34a)',borderRadius:3,width:`${data.direct_referrals>0?Math.round((data.active_referrals||0)/(data.direct_referrals)*100):0}%`,transition:'width .5s'}}/>
            </div>
          </div>
          {/* Commission count */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderTop:'1px solid #f1f3f7'}}>
            <span style={{fontSize:11,fontWeight:700,color:'#94a3b8'}}>Total Commissions Received</span>
            <span style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0ea5e9'}}>{data.total_commissions||0}</span>
          </div>
        </Card>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        {/* Watch & Engagement */}
        <Card title="Watch & Engagement" Icon={Activity} color="#0ea5e9">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {[
              {val:data.videos_watched||0,lbl:'Videos Watched',color:'#0ea5e9',Icon:Tv},
              {val:data.watch_streak||0,lbl:'Day Streak',color:'#d97706',Icon:Award},
              {val:data.watch_quota_met?'Active':'Paused',lbl:'Commission Status',color:data.watch_quota_met?'#16a34a':'#ef4444',Icon:Activity},
            ].map((s,i) => (
              <div key={i} style={{background:'#f8f9fb',borderRadius:8,padding:'14px 12px',textAlign:'center'}}>
                <div style={{width:32,height:32,borderRadius:8,background:'#fff',border:'1px solid #e8ecf2',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}><s.Icon size={16} color={s.color} strokeWidth={2}/></div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:s.color}}>{s.val}</div>
                <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.3,marginTop:3}}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Account Overview */}
        <Card title="Account Overview" Icon={Wallet} color="#6366f1">
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              {lbl:'Membership Tier',val:(data.membership_tier||'basic').charAt(0).toUpperCase()+(data.membership_tier||'basic').slice(1),color:'#0ea5e9'},
              {lbl:'Available Balance',val:`$${(data.balance||0).toFixed(2)}`,color:'#16a34a'},
              {lbl:'Total Withdrawn',val:`$${(data.total_withdrawn||0).toFixed(2)}`,color:'#d97706'},
              {lbl:'Lifetime Revenue',val:`$${(data.revenue||0).toFixed(2)}`,color:'#6366f1'},
            ].map((r,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#f8f9fb',borderRadius:8}}>
                <span style={{fontSize:12,fontWeight:600,color:'#64748b'}}>{r.lbl}</span>
                <span style={{fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:r.color}}>{r.val}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <Card title="Campaign Performance" Icon={BarChart3} color="#0ea5e9">
        {(data.campaigns||[]).length > 0 ? (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>{['Campaign','Platform','Tier','Views','Target','Progress','Status'].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{data.campaigns.map((c,i) => (
                <tr key={i} style={{borderBottom:'1px solid #f5f6f8'}}>
                  <td style={tdS}><span style={{fontWeight:700}}>{c.title}</span></td>
                  <td style={tdS}><span style={{fontSize:11,color:'#64748b'}}>{c.platform}</span></td>
                  <td style={tdS}><span style={{fontSize:11,fontWeight:700,color:'#0ea5e9',background:'rgba(14,165,233,.06)',padding:'2px 8px',borderRadius:4}}>Tier {c.tier}</span></td>
                  <td style={tdS}>{c.views_delivered.toLocaleString()}</td>
                  <td style={tdS}>{c.views_target.toLocaleString()}</td>
                  <td style={{...tdS,minWidth:120}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{flex:1,height:6,background:'#eef1f8',borderRadius:3}}>
                        <div style={{height:'100%',background:c.completion_pct>=100?'#16a34a':'linear-gradient(90deg,#0ea5e9,#38bdf8)',borderRadius:3,width:`${c.completion_pct}%`,transition:'width .5s'}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:c.completion_pct>=100?'#16a34a':'#0ea5e9',minWidth:32}}>{c.completion_pct}%</span>
                    </div>
                  </td>
                  <td style={tdS}><span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:6,
                    ...(c.status==='active'?{background:'rgba(22,163,74,.08)',color:'#16a34a'}:c.status==='completed'?{background:'rgba(14,165,233,.08)',color:'#0ea5e9'}:{background:'#f8f9fb',color:'#94a3b8'}),
                  }}>{c.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div style={{textAlign:'center',padding:'32px 20px'}}>
            <Target size={36} color="#cbd5e1" strokeWidth={1.5} style={{marginBottom:10}}/>
            <div style={{fontSize:14,fontWeight:700,color:'#94a3b8',marginBottom:4}}>No campaigns yet</div>
            <div style={{fontSize:12,color:'#b8c4d0'}}>Activate a Campaign Tier to start advertising and tracking performance.</div>
          </div>
        )}
      </Card>
    </AppLayout>
  );
}

function Card({title,Icon,color,children}){
  return <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:8,boxShadow:'0 2px 8px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.03)',overflow:'hidden'}}>
    <div style={{padding:'10px 14px',borderBottom:'1px solid #f1f3f7',display:'flex',alignItems:'center',gap:8}}>
      <div style={{width:24,height:24,borderRadius:6,background:`${color}10`,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={14} color={color} strokeWidth={2}/></div>
      <span style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{title}</span>
    </div>
    <div style={{padding:'14px'}}>{children}</div>
  </div>;
}

const thS={fontSize:10,fontWeight:800,color:'#7b91a8',textTransform:'uppercase',letterSpacing:.8,padding:'10px 14px',borderBottom:'1px solid #f1f3f7',textAlign:'left',background:'#f8f9fb'};
const tdS={padding:'10px 14px',fontSize:13,color:'#0f172a'};
function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
