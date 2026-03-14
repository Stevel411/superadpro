import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
const TITLES = {LinkHub:'🔗 LinkHub',LinkTools:'🔧 Link Tools',MyLeads:'📋 My Leads',PassupVisualiser:'🔀 Pass-Up Visualiser'};
const SUBS = {LinkHub:'Your link-in-bio page and click stats',LinkTools:'Short links and rotators with tracking',MyLeads:'Track and nurture your leads',PassupVisualiser:'See your upline chain and downline'};
const EPS = {LinkHub:'/api/linkhub-stats',LinkTools:'/api/link-tools',MyLeads:'/api/leads',PassupVisualiser:'/api/passup-visualiser'};
export default function LinkHub() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiGet(EPS['LinkHub']).then(r => { setD(r); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <AppLayout title={TITLES['LinkHub']}><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;
  return (
    <AppLayout title={TITLES['LinkHub']} subtitle={SUBS['LinkHub']}>
      <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,padding:24,boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)'}}>
        <pre style={{fontSize:13,color:'#475569',whiteSpace:'pre-wrap',fontFamily:'inherit',lineHeight:1.6}}>{d ? JSON.stringify(d, null, 2) : 'No data'}</pre>
      </div>
    </AppLayout>
  );
}
