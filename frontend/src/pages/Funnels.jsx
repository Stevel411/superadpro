import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Plus, Eye, Pencil, Trash2, Copy, ExternalLink, FileText, Sparkles, LayoutGrid, Zap, TrendingUp, Users, Target, DollarSign, BookOpen, Video, ShoppingBag, Megaphone, Award } from 'lucide-react';

const TEMPLATES = [
  {
    key: 'lead-capture', title: 'Lead Capture', desc: 'Email capture with headline, video, form and feature list',
    icon: Target, color: '#0ea5e9', gradient: 'linear-gradient(135deg,#0c1222,#1e3a5f)',
    preview: [
      { t:'h',y:8,w:80,h:6,c:'#fff' },{ t:'t',y:17,w:60,h:3,c:'#64748b' },
      { t:'b',y:24,w:70,h:22,c:'rgba(14,165,233,.15)',bc:'#0ea5e9' },
      { t:'r',y:50,w:40,h:4,c:'#0ea5e9' },{ t:'r',y:50,x:55,w:40,h:4,c:'#0ea5e9' },
      { t:'t',y:58,w:30,h:2.5,c:'#334155' },{ t:'t',y:58,x:36,w:30,h:2.5,c:'#334155' },
    ],
  },
  {
    key: 'video-sales', title: 'Video Sales Letter', desc: 'Video-led page with attention headline, VSL and social proof',
    icon: Video, color: '#8b5cf6', gradient: 'linear-gradient(135deg,#1a1a2e,#2d1b69)',
    preview: [
      { t:'t',y:5,w:20,h:2.5,c:'#fbbf24' },{ t:'h',y:10,w:85,h:7,c:'#fff' },
      { t:'v',y:21,w:80,h:35,c:'#0f0f1a',bc:'#8b5cf6' },
      { t:'r',y:60,w:50,h:5,c:'linear-gradient(135deg,#8b5cf6,#ec4899)' },
      { t:'s',y:70,w:30,h:3,c:'#fbbf24' },{ t:'t',y:76,w:70,h:6,c:'#475569' },
    ],
  },
  {
    key: 'product-offer', title: 'Product Offer', desc: 'Sales page with pricing, features, guarantee and CTA',
    icon: ShoppingBag, color: '#10b981', gradient: 'linear-gradient(135deg,#0f172a,#14532d)',
    preview: [
      { t:'t',y:4,w:22,h:2.5,c:'#10b981' },{ t:'h',y:9,w:75,h:6,c:'#fff' },
      { t:'t',y:18,w:60,h:3,c:'#64748b' },
      { t:'b',y:25,w:40,h:30,c:'rgba(16,185,129,.08)',bc:'#10b981' },
      { t:'h',y:28,x:15,w:20,h:8,c:'#10b981' },
      { t:'b',y:25,x:50,w:40,h:30,c:'rgba(255,255,255,.03)',bc:'#334155' },
      { t:'r',y:60,w:50,h:5,c:'#10b981' },
    ],
  },
  {
    key: 'network-opportunity', title: 'Business Opportunity', desc: 'Network marketing recruitment page with income potential',
    icon: Users, color: '#f59e0b', gradient: 'linear-gradient(135deg,#1a1a2e,#422006)',
    preview: [
      { t:'h',y:6,w:80,h:7,c:'#fff' },{ t:'t',y:16,w:65,h:3,c:'#94a3b8' },
      { t:'r',y:23,w:45,h:5,c:'linear-gradient(135deg,#f59e0b,#ef4444)' },
      { t:'b',y:32,w:28,h:18,c:'rgba(245,158,11,.08)',bc:'#f59e0b' },
      { t:'b',y:32,x:35,w:28,h:18,c:'rgba(245,158,11,.08)',bc:'#f59e0b' },
      { t:'b',y:32,x:68,w:28,h:18,c:'rgba(245,158,11,.08)',bc:'#f59e0b' },
      { t:'s',y:56,w:30,h:3,c:'#fbbf24' },{ t:'t',y:62,w:70,h:8,c:'#475569' },
    ],
  },
  {
    key: 'webinar-registration', title: 'Webinar Registration', desc: 'Event signup with countdown timer, speaker bio and urgency',
    icon: Megaphone, color: '#ec4899', gradient: 'linear-gradient(135deg,#1a1a2e,#4a0e2b)',
    preview: [
      { t:'t',y:4,w:30,h:2.5,c:'#ec4899' },{ t:'h',y:9,w:80,h:7,c:'#fff' },
      { t:'t',y:19,w:55,h:3,c:'#94a3b8' },
      { t:'b',y:26,w:15,h:10,c:'rgba(236,72,153,.1)',bc:'#ec4899' },
      { t:'b',y:26,x:22,w:15,h:10,c:'rgba(236,72,153,.1)',bc:'#ec4899' },
      { t:'b',y:26,x:44,w:15,h:10,c:'rgba(236,72,153,.1)',bc:'#ec4899' },
      { t:'b',y:26,x:66,w:15,h:10,c:'rgba(236,72,153,.1)',bc:'#ec4899' },
      { t:'r',y:42,w:50,h:5,c:'linear-gradient(135deg,#ec4899,#8b5cf6)' },
      { t:'b',y:52,w:80,h:20,c:'rgba(255,255,255,.03)',bc:'#334155' },
    ],
  },
  {
    key: 'coaching-program', title: 'Coaching Program', desc: 'Personal brand page with bio, testimonials and booking CTA',
    icon: Award, color: '#6366f1', gradient: 'linear-gradient(135deg,#0f172a,#1e1b4b)',
    preview: [
      { t:'b',y:5,x:5,w:25,h:35,c:'rgba(99,102,241,.1)',bc:'#6366f1' },
      { t:'h',y:8,x:38,w:55,h:6,c:'#fff' },{ t:'t',y:17,x:38,w:50,h:8,c:'#94a3b8' },
      { t:'r',y:28,x:38,w:35,h:5,c:'#6366f1' },
      { t:'b',y:45,w:28,h:22,c:'rgba(255,255,255,.03)',bc:'#334155' },
      { t:'b',y:45,x:35,w:28,h:22,c:'rgba(255,255,255,.03)',bc:'#334155' },
      { t:'b',y:45,x:68,w:28,h:22,c:'rgba(255,255,255,.03)',bc:'#334155' },
    ],
  },
  {
    key: 'digital-product', title: 'Digital Product', desc: 'Ebook, course or download page with feature stack and pricing',
    icon: BookOpen, color: '#14b8a6', gradient: 'linear-gradient(135deg,#0c1222,#0f3d3b)',
    preview: [
      { t:'h',y:6,w:75,h:6,c:'#fff' },{ t:'t',y:15,w:60,h:3,c:'#94a3b8' },
      { t:'b',y:22,x:5,w:40,h:35,c:'rgba(20,184,166,.08)',bc:'#14b8a6' },
      { t:'t',y:25,x:52,w:40,h:2,c:'#14b8a6' },
      { t:'t',y:30,x:52,w:38,h:2,c:'#475569' },{ t:'t',y:35,x:52,w:38,h:2,c:'#475569' },
      { t:'t',y:40,x:52,w:38,h:2,c:'#475569' },{ t:'t',y:45,x:52,w:38,h:2,c:'#475569' },
      { t:'r',y:52,x:52,w:35,h:5,c:'#14b8a6' },
    ],
  },
  {
    key: 'affiliate-income', title: 'Affiliate Funnel', desc: 'Commission income page with earnings calculator and signup',
    icon: DollarSign, color: '#ef4444', gradient: 'linear-gradient(135deg,#1a1a2e,#450a0a)',
    preview: [
      { t:'t',y:4,w:25,h:2.5,c:'#ef4444' },{ t:'h',y:9,w:80,h:7,c:'#fff' },
      { t:'t',y:19,w:60,h:3,c:'#94a3b8' },
      { t:'b',y:26,w:85,h:20,c:'rgba(239,68,68,.06)',bc:'#ef4444' },
      { t:'h',y:30,x:10,w:15,h:6,c:'#10b981' },{ t:'h',y:30,x:35,w:15,h:6,c:'#10b981' },
      { t:'h',y:30,x:62,w:15,h:6,c:'#10b981' },
      { t:'r',y:52,w:50,h:5,c:'linear-gradient(135deg,#ef4444,#f59e0b)' },
    ],
  },
];

function TemplatePreview({ items, gradient }) {
  return (
    <div style={{width:'100%',height:'100%',background:gradient,borderRadius:'10px 10px 0 0',position:'relative',overflow:'hidden'}}>
      {items.map((item,i) => {
        const x = item.x||((100-item.w)/2);
        const s = {position:'absolute',left:`${x}%`,top:`${item.y}%`,width:`${item.w}%`,height:`${item.h}%`};
        if(item.t==='h') return <div key={i} style={{...s,background:item.c,opacity:.9,borderRadius:2}}/>;
        if(item.t==='t') return <div key={i} style={{...s,background:item.c,opacity:.4,borderRadius:2}}/>;
        if(item.t==='r') return <div key={i} style={{...s,background:item.c,borderRadius:6}}/>;
        if(item.t==='b') return <div key={i} style={{...s,background:item.c,border:`1px solid ${item.bc||'transparent'}`,borderRadius:6}}/>;
        if(item.t==='v') return <div key={i} style={{...s,background:item.c,border:`1px solid ${item.bc||'transparent'}`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:0,height:0,borderLeft:'8px solid rgba(255,255,255,.3)',borderTop:'5px solid transparent',borderBottom:'5px solid transparent'}}/></div>;
        if(item.t==='s') return <div key={i} style={{...s,display:'flex',gap:2,alignItems:'center',justifyContent:'center'}}>{[0,1,2,3,4].map(j=><div key={j} style={{width:4,height:4,background:item.c,borderRadius:1}}/>)}</div>;
        return null;
      })}
    </div>
  );
}

export default function Funnels() {
  const [pages,setPages]=useState([]);
  const [loading,setLoading]=useState(true);
  const [creating,setCreating]=useState(false);
  const [creatingKey,setCreatingKey]=useState(null);
  const navigate=useNavigate();

  const load=()=>apiGet('/api/funnels').then(d=>{setPages(d.funnels||d.pages||[]);setLoading(false)}).catch(()=>setLoading(false));
  useEffect(()=>{load()},[]);

  const createFromTemplate=async(key)=>{
    setCreating(true);setCreatingKey(key);
    try{
      if(key==='blank'){
        const res=await apiPost('/api/funnels/save',{title:'Untitled Page',status:'draft'});
        if(res.id) window.location.href=`/pro/funnel/${res.id}/edit`;
      } else {
        const res=await apiPost('/api/funnels/from-template',{niche:key});
        if(res.edit_url){const newId=res.edit_url.split('/').pop();window.location.href=`/pro/funnel/${newId}/edit`;}
      }
    }catch(e){alert(e.message)}
    setCreating(false);setCreatingKey(null);
  };

  const deletePage=async(id,title)=>{
    if(!confirm(`Delete "${title}"? This cannot be undone.`))return;
    try{await apiPost(`/api/funnels/delete/${id}`,{});setPages(p=>p.filter(x=>x.id!==id))}catch(e){alert(e.message)}
  };

  const duplicatePage=async(id)=>{
    try{const res=await apiPost(`/api/funnels/duplicate/${id}`,{});if(res.id)window.location.href=`/pro/funnel/${res.id}/edit`;else load()}catch(e){alert(e.message)}
  };

  const totalViews=pages.reduce((a,p)=>a+(p.views||0),0);
  const totalLeads=pages.reduce((a,p)=>a+(p.leads_captured||0),0);
  const published=pages.filter(p=>p.status==='published').length;

  if(loading) return <AppLayout title="SuperPages"><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'#0ea5e9',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;

  return (
    <AppLayout>
      {/* Hero */}
      <div style={{marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
          <svg width="32" height="32" viewBox="0 0 48 48"><rect x="6" y="6" width="16" height="16" rx="4" fill="#0ea5e9" opacity=".9"/><rect x="26" y="6" width="16" height="16" rx="4" fill="#6366f1" opacity=".7"/><rect x="6" y="26" width="16" height="16" rx="4" fill="#6366f1" opacity=".5"/><rect x="26" y="26" width="16" height="16" rx="4" fill="#0ea5e9" opacity=".3"/></svg>
          <h1 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:'#0f172a'}}>Super<span style={{color:'#0ea5e9'}}>Pages</span></h1>
        </div>
        <p style={{margin:0,fontSize:13,color:'#94a3b8'}}>Build high-converting landing pages, funnels and sales pages</p>
      </div>

      {/* Hero cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
        <div style={{background:'linear-gradient(135deg,#0c1222,#1e3a5f)',borderRadius:16,padding:24,position:'relative',overflow:'hidden',border:'1px solid rgba(14,165,233,.15)'}}>
          <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,background:'radial-gradient(circle,rgba(14,165,233,.15),transparent 70%)',borderRadius:'50%'}}/>
          <Sparkles size={24} color="#0ea5e9" style={{marginBottom:10}}/>
          <h3 style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#fff',margin:'0 0 6px'}}>AI Funnel Generator</h3>
          <p style={{fontSize:12,color:'#94a3b8',lineHeight:1.6,marginBottom:16}}>Answer 4 questions and AI generates a complete landing page with email capture</p>
          <button onClick={()=>navigate('/pro/ai-funnel')} style={{padding:'10px 22px',borderRadius:10,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontFamily:'Sora,sans-serif',fontSize:12,fontWeight:700,boxShadow:'0 4px 14px rgba(14,165,233,.3)'}}>Create AI Funnel →</button>
        </div>
        <div style={{background:'#f8f9fb',borderRadius:16,padding:24,position:'relative',overflow:'hidden',border:'1px solid #e8ecf2'}}>
          <div style={{position:'absolute',top:10,right:10,width:70,height:70,border:'1px dashed #e2e8f0',borderRadius:12,opacity:.5}}/>
          <LayoutGrid size={24} color="#94a3b8" style={{marginBottom:10}}/>
          <h3 style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#0f172a',margin:'0 0 6px'}}>Blank Canvas</h3>
          <p style={{fontSize:12,color:'#94a3b8',lineHeight:1.6,marginBottom:16}}>Start from scratch with drag-and-drop — full creative freedom</p>
          <button onClick={()=>createFromTemplate('blank')} disabled={creating} style={{padding:'10px 22px',borderRadius:10,border:'1px solid #e2e8f0',cursor:'pointer',background:'#fff',color:'#0f172a',fontFamily:'Sora,sans-serif',fontSize:12,fontWeight:700}}><Plus size={13} style={{marginRight:4}}/> Open SuperPages</button>
        </div>
      </div>

      {/* Two-column layout: Templates left, Pages right */}
      <div style={{display:'grid',gridTemplateColumns:pages.length>0?'1fr 380px':'1fr',gap:24,alignItems:'start'}}>

        {/* LEFT — Templates */}
        <div>
          <div style={{marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            <h2 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a'}}>Start from a Template</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {TEMPLATES.map(t=>{
              const Icon=t.icon;const isCreating=creating&&creatingKey===t.key;
              return (
                <div key={t.key} className="tpl-card" onClick={()=>!creating&&createFromTemplate(t.key)} style={{background:'#fff',borderRadius:12,overflow:'hidden',border:'1px solid #e8ecf2',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,.03)',transition:'all .2s',display:'flex',flexDirection:'column'}}>
                  <div style={{height:130,position:'relative'}}>
                    <TemplatePreview items={t.preview} gradient={t.gradient}/>
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 40%,rgba(0,0,0,.45) 100%)',borderRadius:'10px 10px 0 0',display:'flex',alignItems:'flex-end',padding:10}}>
                      <div style={{width:26,height:26,borderRadius:6,background:`${t.color}22`,border:`1px solid ${t.color}44`,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={13} color={t.color}/></div>
                    </div>
                  </div>
                  <div style={{padding:'12px 14px',flex:1,display:'flex',flexDirection:'column'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#0f172a',marginBottom:3}}>{t.title}</div>
                    <div style={{fontSize:11,color:'#94a3b8',lineHeight:1.5,flex:1}}>{t.desc}</div>
                    <div style={{marginTop:10}}>
                      <div style={{padding:'7px 14px',borderRadius:7,fontSize:10,fontWeight:700,background:isCreating?'#f1f5f9':`${t.color}10`,color:isCreating?'#94a3b8':t.color,border:`1px solid ${isCreating?'#e2e8f0':t.color+'25'}`,textAlign:'center'}}>{isCreating?'Creating...':'Use Template →'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Your Pages */}
        {pages.length>0&&(
          <div>
            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
              {[{label:'PAGES',val:published,color:'#16a34a',icon:Zap},{label:'LEADS',val:totalLeads,color:'#0ea5e9',icon:Target},{label:'VIEWS',val:totalViews,color:'#8b5cf6',icon:TrendingUp}].map((s,i)=>(
                <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:'12px 14px',borderLeft:`3px solid ${s.color}`}}>
                  <div style={{fontSize:8,fontWeight:700,letterSpacing:.8,color:'#94a3b8',textTransform:'uppercase'}}>{s.label}</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:'#0f172a',margin:'2px 0'}}>{s.val}</div>
                </div>
              ))}
            </div>

            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <h2 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'#0f172a'}}>Your Pages</h2>
              <span style={{fontSize:11,color:'#94a3b8'}}>{pages.length} page{pages.length!==1?'s':''}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {pages.map(p=>(
                <div key={p.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.03)'}}>
                  <div style={{padding:'12px 14px',borderBottom:'1px solid #f1f3f7'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
                      <div style={{fontSize:13,fontWeight:800,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{p.title||'Untitled'}</div>
                      <span style={{fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:4,marginLeft:8,flexShrink:0,...(p.status==='published'?{background:'rgba(22,163,74,.08)',color:'#16a34a'}:{background:'#f8f9fb',color:'#94a3b8'})}}>{p.status==='published'?'● Live':'○ Draft'}</span>
                    </div>
                    {p.slug&&<div style={{fontSize:10,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>/{p.slug}</div>}
                  </div>
                  <div style={{padding:'8px 14px',display:'flex',gap:12,borderBottom:'1px solid #f1f3f7'}}>
                    <div style={{display:'flex',alignItems:'center',gap:4}}><Eye size={12} color="#94a3b8"/><span style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{p.views||0}</span><span style={{fontSize:10,color:'#94a3b8'}}>Views</span></div>
                    <div style={{display:'flex',alignItems:'center',gap:4}}><FileText size={12} color="#94a3b8"/><span style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{p.leads_captured||0}</span><span style={{fontSize:10,color:'#94a3b8'}}>Leads</span></div>
                    {p.is_ai_generated&&<span style={{fontSize:8,fontWeight:700,color:'#6366f1',background:'rgba(99,102,241,.08)',padding:'2px 5px',borderRadius:4,marginLeft:'auto'}}>AI</span>}
                  </div>
                  <div style={{padding:'8px 14px',display:'flex',gap:5}}>
                    <a href={`/pro/funnel/${p.id}/edit`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'7px 10px',borderRadius:6,fontSize:11,fontWeight:700,textDecoration:'none',background:'#0ea5e9',color:'#fff'}}><Pencil size={11}/> Edit</a>
                    {p.status==='published'&&p.slug&&(<a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'7px 10px',borderRadius:6,fontSize:11,fontWeight:700,textDecoration:'none',background:'#f8f9fb',color:'#0f172a',border:'1px solid #e8ecf2'}}><ExternalLink size={11}/> View</a>)}
                    <button onClick={()=>duplicatePage(p.id)} title="Duplicate" style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 8px',borderRadius:6,border:'1px solid #e8ecf2',background:'#f8f9fb',cursor:'pointer'}}><Copy size={12} color="#64748b"/></button>
                    <button onClick={()=>deletePage(p.id,p.title)} title="Delete" style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 8px',borderRadius:6,border:'1px solid #fecaca',background:'#fef2f2',cursor:'pointer'}}><Trash2 size={12} color="#dc2626"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .tpl-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.08),0 4px 12px rgba(0,0,0,.04)!important;border-color:#cbd5e1!important}
        .tpl-card:active{transform:scale(.98)!important}
      `}</style>
    </AppLayout>
  );
}
