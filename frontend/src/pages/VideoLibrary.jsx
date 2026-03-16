import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Film, Eye, Play, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function VideoLibrary() {
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    apiGet('/api/video-library').then(function(r) { setData(r); setLoading(false); }).catch(function() { setLoading(false); });
  }, []);

  if (loading) return <AppLayout title="My Campaigns"><Spin/></AppLayout>;

  var d = data || {};
  var campaigns = d.campaigns || [];

  var statusIcon = function(s) {
    if (s === 'active') return <CheckCircle size={12} color="#16a34a"/>;
    if (s === 'pending') return <Clock size={12} color="#f59e0b"/>;
    return <AlertCircle size={12} color="#94a3b8"/>;
  };

  var statusColor = function(s) {
    if (s === 'active') return {bg:'rgba(22,163,74,.08)',color:'#16a34a',border:'rgba(22,163,74,.15)'};
    if (s === 'pending') return {bg:'rgba(245,158,11,.08)',color:'#f59e0b',border:'rgba(245,158,11,.15)'};
    return {bg:'#f8f9fb',color:'#94a3b8',border:'#e8ecf2'};
  };

  return (
    <AppLayout title="My Campaigns" subtitle="Your video advertising campaigns">
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24}}>
        {[
          {value:d.total_campaigns||0,label:'Total Campaigns',color:'#0ea5e9',bg:'#f0f9ff',border:'#bae6fd',icon:Film},
          {value:d.active_campaigns||0,label:'Active',color:'#16a34a',bg:'#f0fdf4',border:'#dcfce7',icon:Play},
          {value:(d.total_views||0).toLocaleString(),label:'Total Views Delivered',color:'#6366f1',bg:'#f5f3ff',border:'#e9d5ff',icon:Eye},
        ].map(function(s, i) {
          var Icon = s.icon;
          return (
            <div key={i} style={{background:s.bg,border:'1px solid '+s.border,borderRadius:14,padding:20,position:'relative'}}>
              <div style={{position:'absolute',top:12,right:12,width:32,height:32,borderRadius:8,background:s.color+'12',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon size={16} color={s.color}/>
              </div>
              <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginTop:4}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Campaign list */}
      <div style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.06)'}}>
        <div style={{background:'#1c223d',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Film size={16} color="#38bdf8"/>
            <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Your Campaigns</div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)'}}>{campaigns.length} campaigns</div>
        </div>
        {campaigns.length > 0 ? (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['Campaign','Platform','Status','Views','Progress'].map(function(h) {
                  return <th key={h} style={{fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,padding:'12px 16px',borderBottom:'2px solid #e8ecf2',textAlign:'left',background:'#f8f9fb'}}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(function(c, i) {
                var sc = statusColor(c.status);
                var pct = c.views_target > 0 ? Math.min(100, Math.round((c.views_delivered / c.views_target) * 100)) : 0;
                return (
                  <tr key={c.id || i}>
                    <td style={{padding:'14px 16px',borderBottom:'1px solid #f5f6f8'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{c.title || 'Untitled'}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>{c.category || '—'}</div>
                    </td>
                    <td style={{padding:'14px 16px',borderBottom:'1px solid #f5f6f8',fontSize:12,color:'#64748b'}}>{c.platform || '—'}</td>
                    <td style={{padding:'14px 16px',borderBottom:'1px solid #f5f6f8'}}>
                      <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,
                        background:sc.bg,color:sc.color,border:'1px solid '+sc.border,textTransform:'capitalize'}}>
                        {statusIcon(c.status)} {c.status}
                      </span>
                    </td>
                    <td style={{padding:'14px 16px',borderBottom:'1px solid #f5f6f8',fontSize:13,fontWeight:700,color:'#0ea5e9'}}>
                      {(c.views_delivered||0).toLocaleString()} <span style={{fontSize:10,color:'#94a3b8',fontWeight:500}}>/ {(c.views_target||0).toLocaleString()}</span>
                    </td>
                    <td style={{padding:'14px 16px',borderBottom:'1px solid #f5f6f8'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1,height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:3,background:pct>=100?'#16a34a':'#0ea5e9',width:pct+'%',transition:'width .3s'}}/>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:pct>=100?'#16a34a':'#0ea5e9',minWidth:30}}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:40,marginBottom:12,opacity:.3}}>🎬</div>
            <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:4}}>No campaigns yet</div>
            <div style={{fontSize:13,color:'#94a3b8'}}>Activate a campaign tier to start advertising</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Spin() { return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>; }
