import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
export default function VideoLibrary() {
  const [vids, setVids] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiGet('/api/video-library').then(d => { setVids(d.campaigns||[]); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <AppLayout title="🎬 Video Library"><Spin/></AppLayout>;
  return (
    <AppLayout title="🎬 Video Library" subtitle="Your video campaigns and their performance">
      {vids.length > 0 ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:20}}>
          {vids.map(v => (
            <div key={v.id} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.16),0 8px 24px rgba(0,0,0,.12)'}}>
              <div style={{aspectRatio:'16/9',background:'#000',position:'relative'}}>
                {v.embed_url ? <iframe src={v.embed_url} style={{width:'100%',height:'100%',border:'none'}} allowFullScreen/> : <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#475569'}}>No preview</div>}
              </div>
              <div style={{padding:18}}>
                <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:6}}>{v.title}</div>
                <div style={{display:'flex',gap:16,fontSize:12,color:'#94a3b8',marginBottom:12}}>
                  <span>👁️ {v.views||0} views</span><span>⏱ {v.duration||0}s</span>
                </div>
                <div style={{height:6,background:'#eef1f8',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',background:'linear-gradient(90deg,#0ea5e9,#22c55e)',borderRadius:99,width:`${Math.min(100,((v.views||0)/(v.target_views||1))*100)}%`}}/>
                </div>
                <div style={{fontSize:11,color:'#7b91a8',marginTop:4}}>{v.views||0} / {v.target_views||0} target views</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 20px'}}><div style={{fontSize:40,marginBottom:12,opacity:.5}}>🎬</div><div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:4}}>No video campaigns yet</div><div style={{fontSize:13,color:'#94a3b8'}}>Activate a campaign tier to start promoting videos.</div></div>
      )}
    </AppLayout>
  );
}
function Spin(){return <div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
