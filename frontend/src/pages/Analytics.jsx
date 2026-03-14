import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
export default function Analytics() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiGet('/api/analytics').then(r => { setD(r); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <AppLayout title="📊 Analytics"><Spin/></AppLayout>;
  const data = d || {};
  const stats = [
    {icon:'👁️',val:data.total_views||0,lbl:'Total Views',color:'#0ea5e9'},
    {icon:'🖱️',val:data.total_clicks||0,lbl:'Link Clicks',color:'#6366f1'},
    {icon:'🔄',val:data.total_conversions||0,lbl:'Conversions',color:'#16a34a'},
    {icon:'💰',val:`$${(data.total_revenue||0).toFixed(0)}`,lbl:'Revenue',color:'#d97706'},
  ];
  return (
    <AppLayout title="📊 Analytics" subtitle="Track your performance across all channels">
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
        {stats.map((s,i) => (
          <div key={i} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:22,boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:s.color}}/>
            <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:28,fontWeight:800,color:s.color}}>{s.val}</div>
            <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginTop:4}}>{s.lbl}</div>
          </div>
        ))}
      </div>
      {(data.campaigns||[]).length > 0 ? (
        <CCard title="Campaign Performance" dot="#0ea5e9">
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>{['Campaign','Views','Clicks','CTR','Status'].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{data.campaigns.map((c,i) => (
              <tr key={i}><td style={tdS}>{c.title}</td><td style={tdS}>{c.views||0}</td><td style={tdS}>{c.clicks||0}</td><td style={tdS}>{c.ctr||'0%'}</td>
              <td style={tdS}><span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:6,background:c.status==='active'?'rgba(22,163,74,.09)':'#f8f9fb',color:c.status==='active'?'#16a34a':'#94a3b8'}}>{c.status||'—'}</span></td></tr>
            ))}</tbody>
          </table>
        </CCard>
      ) : <CCard title="Campaign Performance" dot="#0ea5e9"><div style={{textAlign:'center',padding:32,color:'#94a3b8'}}>No campaign data yet. Activate a tier to start advertising.</div></CCard>}
    </AppLayout>
  );
}
function CCard({title,dot,children}){return <div style={{background:'#fff',border:'1px solid rgba(15,25,60,.08)',borderRadius:8,boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)',overflow:'hidden'}}><div style={{padding:'15px 20px',borderBottom:'1px solid rgba(15,25,60,.07)',display:'flex',alignItems:'center',gap:8}}><div style={{width:7,height:7,borderRadius:'50%',background:dot}}/><span style={{fontSize:16,fontWeight:700,color:'#0f172a'}}>{title}</span></div><div style={{padding:'18px 20px'}}>{children}</div></div>}
const thS={fontSize:11,fontWeight:800,color:'#7b91a8',textTransform:'uppercase',letterSpacing:1,padding:'11px 14px',borderBottom:'1px solid rgba(15,25,60,.08)',textAlign:'left',background:'#f6f8fc'};
const tdS={padding:'12px 14px',borderBottom:'1px solid rgba(15,25,60,.05)',fontSize:14,color:'#0f172a'};
function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
