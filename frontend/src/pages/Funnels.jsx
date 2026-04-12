import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Plus, Eye, Pencil, Trash2, Copy, ExternalLink, FileText, Sparkles, LayoutGrid, Zap, TrendingUp, Users, Target, DollarSign, BookOpen, Video, ShoppingBag, Megaphone, Award } from 'lucide-react';

const TEMPLATES = [
  { key: 'lead-capture', title: 'Lead Capture', titleKey: 'superPages.tplLeadCapture', desc: 'Email capture with headline, video, form and feature list', descKey: 'superPages.tplLeadCaptureDesc', icon: Target, color: 'var(--sap-accent)', bg: '#0c1222', accent: 'var(--sap-accent)' },
  { key: 'video-sales', title: 'Video Sales Letter', titleKey: 'superPages.tplVideoSales', desc: 'Video-led page with attention headline, VSL and social proof', descKey: 'superPages.tplVideoSalesDesc', icon: Video, color: 'var(--sap-purple)', bg: '#132044', accent: 'var(--sap-purple)' },
  { key: 'product-offer', title: 'Product Offer', titleKey: 'superPages.tplProductOffer', desc: 'Sales page with pricing, features, guarantee and CTA', descKey: 'superPages.tplProductOfferDesc', icon: ShoppingBag, color: 'var(--sap-green-mid)', bg: 'var(--sap-text-primary)', accent: 'var(--sap-green-mid)' },
  { key: 'network-opportunity', title: 'Business Opportunity', titleKey: 'superPages.tplBusinessOpp', desc: 'Network marketing recruitment page with income potential', descKey: 'superPages.tplBusinessOppDesc', icon: Users, color: 'var(--sap-amber)', bg: '#132044', accent: 'var(--sap-amber)' },
  { key: 'webinar-registration', title: 'Webinar Registration', titleKey: 'superPages.tplWebinar', desc: 'Event signup with countdown timer, speaker bio and urgency', descKey: 'superPages.tplWebinarDesc', icon: Megaphone, color: 'var(--sap-pink)', bg: '#132044', accent: 'var(--sap-pink)' },
  { key: 'coaching-program', title: 'Coaching Program', titleKey: 'superPages.tplCoaching', desc: 'Personal brand page with bio, testimonials and booking CTA', descKey: 'superPages.tplCoachingDesc', icon: Award, color: 'var(--sap-indigo)', bg: 'var(--sap-text-primary)', accent: 'var(--sap-indigo)' },
  { key: 'digital-product', title: 'Digital Product', titleKey: 'superPages.tplDigitalProduct', desc: 'Ebook, course or download page with feature stack and pricing', descKey: 'superPages.tplDigitalProductDesc', icon: BookOpen, color: '#14b8a6', bg: '#0c1222', accent: '#14b8a6' },
  { key: 'affiliate-income', title: 'Affiliate Funnel', titleKey: 'superPages.tplAffiliate', desc: 'Commission income page with earnings calculator and signup', descKey: 'superPages.tplAffiliateDesc', icon: DollarSign, color: 'var(--sap-red-bright)', bg: '#132044', accent: 'var(--sap-red-bright)' },
  { key: 'thank-you', title: 'Thank You Page', titleKey: 'superPages.tplThankYou', desc: 'Post-signup confirmation with next steps and CTA button', descKey: 'superPages.tplThankYouDesc', icon: Award, color: 'var(--sap-green-mid)', bg: '#0a0a1a', accent: 'var(--sap-green-mid)' },
];

function TemplatePreview({ bg, accent, Icon }) {
  return (
    <div style={{width:'100%',height:'100%',background:bg,borderRadius:'10px 10px 0 0',position:'relative',overflow:'hidden'}}>
      {/* Large soft glow */}
      <div style={{position:'absolute',top:'-20%',right:'-10%',width:140,height:140,borderRadius:'50%',background:`radial-gradient(circle,${accent}25 0%,transparent 65%)`}}/>
      <div style={{position:'absolute',bottom:'-15%',left:'-5%',width:100,height:100,borderRadius:'50%',background:`radial-gradient(circle,${accent}18 0%,transparent 65%)`}}/>
      {/* Floating bubbles */}
      <div style={{position:'absolute',top:'18%',left:'20%',width:10,height:10,borderRadius:'50%',background:`${accent}40`,boxShadow:`0 0 12px ${accent}30`}}/>
      <div style={{position:'absolute',top:'35%',right:'22%',width:14,height:14,borderRadius:'50%',background:`${accent}30`,boxShadow:`0 0 16px ${accent}25`}}/>
      <div style={{position:'absolute',bottom:'30%',left:'35%',width:8,height:8,borderRadius:'50%',background:`${accent}35`,boxShadow:`0 0 10px ${accent}20`}}/>
      <div style={{position:'absolute',top:'55%',right:'40%',width:6,height:6,borderRadius:'50%',background:`${accent}45`,boxShadow:`0 0 8px ${accent}30`}}/>
      <div style={{position:'absolute',top:'25%',left:'55%',width:12,height:12,borderRadius:'50%',background:`${accent}25`,boxShadow:`0 0 14px ${accent}20`}}/>
      <div style={{position:'absolute',bottom:'20%',right:'15%',width:9,height:9,borderRadius:'50%',background:`${accent}35`,boxShadow:`0 0 10px ${accent}25`}}/>
      {/* Star sparkles */}
      <div style={{position:'absolute',top:'22%',right:'35%',fontSize:16,color:accent,opacity:.5,textShadow:`0 0 8px ${accent}`}}>✦</div>
      <div style={{position:'absolute',bottom:'35%',left:'18%',fontSize:12,color:accent,opacity:.4,textShadow:`0 0 6px ${accent}`}}>✦</div>
      <div style={{position:'absolute',top:'50%',left:'45%',fontSize:20,color:accent,opacity:.3,textShadow:`0 0 10px ${accent}`}}>✦</div>
      {/* Centre icon — large and prominent */}
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:52,height:52,borderRadius:14,background:`${accent}18`,border:`1px solid ${accent}35`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 8px 32px ${accent}20`}}>
        <Icon size={24} color={accent} strokeWidth={1.5}/>
      </div>
    </div>
  );
}

export default function Funnels() {
  var { t } = useTranslation();
  const [pages,setPages]=useState([]);
  const [loading,setLoading]=useState(true);
  const [creating,setCreating]=useState(false);
  const [creatingKey,setCreatingKey]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [showAiWizard,setShowAiWizard]=useState(false);
  const [aiForm,setAiForm]=useState({niche:'',audience:'',story:'',tone:'professional'});
  const [aiGenerating,setAiGenerating]=useState(false);
  const navigate=useNavigate();

  const load=()=>apiGet('/api/funnels').then(d=>{setPages(d.funnels||d.pages||[]);setLoading(false)}).catch(()=>setLoading(false));
  useEffect(()=>{load()},[]);

  const createFromTemplate=async(key)=>{
    setCreating(true);setCreatingKey(key);
    try{
      if(key==='blank'){
        const res=await apiPost('/api/funnels/save',{title:`Untitled Page ${Date.now().toString(36).slice(-4)}`,status:'draft'});
        if(res.id) window.location.href=`/pro/funnel/${res.id}/edit`;
      } else {
        const res=await apiPost('/api/funnels/from-template',{niche:key});
        if(res.id){window.location.href=`/pro/funnel/${res.id}/edit`;}
        else if(res.edit_url){const parts=res.edit_url.match(/\/(\d+)\//);if(parts)window.location.href=`/pro/funnel/${parts[1]}/edit`;}
      }
    }catch(e){alert(e.message)}
    setCreating(false);setCreatingKey(null);
  };

  const deletePage=async(id)=>{
    try{await apiPost(`/api/funnels/delete/${id}`,{});setPages(p=>p.filter(x=>x.id!==id));setConfirmDelete(null)}catch(e){alert(e.message)}
  };

  const generateAiFunnel=async()=>{
    if(!aiForm.niche.trim()){alert('Please enter your niche');return}
    setAiGenerating(true);
    try{
      const res=await apiPost('/api/pro/generate-funnel',aiForm);
      const pageId = res.id || res.funnel_id;
      if(pageId) { window.location.href=`/pro/funnel/${pageId}/edit`; }
      else if(res.error) alert(res.error);
      else alert(t('superPages.generationFailed'));
    }catch(e){alert(t('superPages.errorPrefix') + e.message)}
    setAiGenerating(false);
  };

  const duplicatePage=async(id)=>{
    try{const res=await apiPost(`/api/funnels/duplicate/${id}`,{});if(res.id)window.location.href=`/pro/funnel/${res.id}/edit`;else load()}catch(e){alert(e.message)}
  };

  const totalViews=pages.reduce((a,p)=>a+(p.views||0),0);
  const totalLeads=pages.reduce((a,p)=>a+(p.leads_captured||0),0);
  const published=pages.filter(p=>p.status==='published').length;

  if(loading) return <AppLayout title={t("superPages.title")}><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></AppLayout>;

  return (
    <AppLayout>
      {/* Hero */}
      <div style={{marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
          <svg width="32" height="32" viewBox="0 0 48 48"><rect x="6" y="6" width="16" height="16" rx="4" fill="var(--sap-accent)" opacity=".9"/><rect x="26" y="6" width="16" height="16" rx="4" fill="var(--sap-indigo)" opacity=".7"/><rect x="6" y="26" width="16" height="16" rx="4" fill="var(--sap-indigo)" opacity=".5"/><rect x="26" y="26" width="16" height="16" rx="4" fill="var(--sap-accent)" opacity=".3"/></svg>
          <h1 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:24,fontWeight:800,color:'var(--sap-text-primary)'}}>Super<span style={{color:'var(--sap-accent)'}}>{t('superPages.pagesLabel')}</span></h1>
        </div>
        <p style={{margin:0,fontSize:13,color:'var(--sap-text-muted)'}}>{t('superPages.subtitle')}</p>
      </div>

      {/* Hero cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
        <div style={{background:'linear-gradient(135deg,#0c1222,#1e3a5f)',borderRadius:16,padding:24,position:'relative',overflow:'hidden',border:'1px solid rgba(14,165,233,.15)'}}>
          <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,background:'radial-gradient(circle,rgba(14,165,233,.15),transparent 70%)',borderRadius:'50%'}}/>
          <Sparkles size={24} color="var(--sap-accent)" style={{marginBottom:10}}/>
          <h3 style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'#fff',margin:'0 0 6px'}}>{t('superPages.aiFunnelGenerator')}</h3>
          <p style={{fontSize:12,color:'var(--sap-text-muted)',lineHeight:1.6,marginBottom:16}}>{t('superPages.aiFunnelDesc')}</p>
          <button onClick={()=>setShowAiWizard(true)} style={{padding:'10px 22px',borderRadius:10,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',fontFamily:'Sora,sans-serif',fontSize:12,fontWeight:700,boxShadow:'0 4px 14px rgba(14,165,233,.3)'}}>{t('superPages.createAiFunnel')}</button>
        </div>
        <div style={{background:'linear-gradient(135deg,#e8e5fb,#d8d4f7)',borderRadius:16,padding:24,position:'relative',overflow:'hidden',border:'1px solid rgba(99,102,241,.15)'}}>
          <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,background:'radial-gradient(circle,rgba(99,102,241,.1),transparent 70%)',borderRadius:'50%'}}/>
          <div style={{position:'absolute',bottom:10,right:10,width:70,height:70,border:'1px dashed rgba(99,102,241,.15)',borderRadius:12,opacity:.5}}/>
          <LayoutGrid size={24} color="var(--sap-indigo)" style={{marginBottom:10}}/>
          <h3 style={{fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'var(--sap-cobalt-deep)',margin:'0 0 6px'}}>{t('superPages.blankCanvas')}</h3>
          <p style={{fontSize:12,color:'var(--sap-indigo)',lineHeight:1.6,marginBottom:16,opacity:.7}}>{t('superPages.blankCanvasDesc')}</p>
          <button onClick={()=>createFromTemplate('blank')} disabled={creating} style={{padding:'10px 22px',borderRadius:10,border:'none',cursor:'pointer',background:'var(--sap-indigo)',color:'#fff',fontFamily:'Sora,sans-serif',fontSize:12,fontWeight:700,boxShadow:'0 4px 14px rgba(99,102,241,.3)'}}>{t('superPages.openSuperPages')}</button>
        </div>
      </div>

      {/* Two-column layout: Templates left, Pages right */}
      <div style={{display:'grid',gridTemplateColumns:pages.length>0?'1fr 380px':'1fr',gap:24,alignItems:'start'}}>

        {/* LEFT — Templates */}
        <div>
          <div style={{marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            <h2 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'var(--sap-text-primary)'}}>{t('superPages.startFromTemplate')}</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
            {TEMPLATES.map(tpl=>{
              const Icon=tpl.icon;const isCreating=creating&&creatingKey===tpl.key;
              return (
                <div key={tpl.key} className="tpl-card" onClick={()=>!creating&&createFromTemplate(tpl.key)} style={{background:'#fff',borderRadius:12,overflow:'hidden',border:'1px solid #e8ecf2',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,.03)',transition:'all .2s',display:'flex',flexDirection:'column'}}>
                  <div style={{height:180,position:'relative'}}>
                    <TemplatePreview bg={tpl.bg} accent={tpl.accent} Icon={tpl.icon}/>
                  </div>
                  <div style={{padding:'12px 14px',flex:1,display:'flex',flexDirection:'column'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'var(--sap-text-primary)',marginBottom:3}}>{t(tpl.titleKey)}</div>
                    <div style={{fontSize:11,color:'var(--sap-text-muted)',lineHeight:1.5,flex:1}}>{t(tpl.descKey)}</div>
                    <div style={{marginTop:10}}>
                      <div style={{padding:'7px 14px',borderRadius:7,fontSize:10,fontWeight:700,background:isCreating?'var(--sap-bg-page)':`${tpl.color}10`,color:isCreating?'var(--sap-text-muted)':tpl.color,border:`1px solid ${isCreating?'var(--sap-border)':tpl.color+'25'}`,textAlign:'center'}}>{isCreating?t('superPages.creating'):t('superPages.useTemplate')}</div>
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
              {[{label:t('superPages.pages'),val:published,color:'var(--sap-green)',icon:Zap},{label:t('superPages.leads'),val:totalLeads,color:'var(--sap-accent)',icon:Target},{label:t('superPages.views'),val:totalViews,color:'var(--sap-purple)',icon:TrendingUp}].map((s,i)=>(
                <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:'12px 14px',borderLeft:`3px solid ${s.color}`}}>
                  <div style={{fontSize:8,fontWeight:700,letterSpacing:.8,color:'var(--sap-text-muted)',textTransform:'uppercase'}}>{s.label}</div>
                  <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:'var(--sap-text-primary)',margin:'2px 0'}}>{s.val}</div>
                </div>
              ))}
            </div>

            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <h2 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:15,fontWeight:800,color:'var(--sap-text-primary)'}}>{t('superPages.yourPages')}</h2>
              <span style={{fontSize:11,color:'var(--sap-text-muted)'}}>{pages.length} page{pages.length!==1?'s':''}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {pages.map(p=>(
                <div key={p.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.03)'}}>
                  <div style={{padding:'12px 14px',borderBottom:'1px solid #f1f3f7'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
                      <div style={{fontSize:13,fontWeight:800,color:'var(--sap-text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{p.title||'Untitled'}</div>
                      <span style={{fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:4,marginLeft:8,flexShrink:0,...(p.status==='published'?{background:'rgba(22,163,74,.08)',color:'var(--sap-green)'}:{background:'var(--sap-bg-input)',color:'var(--sap-text-muted)'})}}>{p.status==='published'?'● Live':'○ Draft'}</span>
                    </div>
                    {p.slug&&<div style={{fontSize:10,color:'var(--sap-text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>/{p.slug}</div>}
                  </div>
                  <div style={{padding:'8px 14px',display:'flex',gap:12,borderBottom:'1px solid #f1f3f7'}}>
                    <div style={{display:'flex',alignItems:'center',gap:4}}><Eye size={12} color="var(--sap-text-muted)"/><span style={{fontSize:12,fontWeight:700,color:'var(--sap-text-primary)'}}>{p.views||0}</span><span style={{fontSize:10,color:'var(--sap-text-muted)'}}>{t('superPages.viewsLabel')}</span></div>
                    <div style={{display:'flex',alignItems:'center',gap:4}}><FileText size={12} color="var(--sap-text-muted)"/><span style={{fontSize:12,fontWeight:700,color:'var(--sap-text-primary)'}}>{p.leads_captured||0}</span><span style={{fontSize:10,color:'var(--sap-text-muted)'}}>{t('superPages.leadsLabel')}</span></div>
                    {p.is_ai_generated&&<span style={{fontSize:8,fontWeight:700,color:'var(--sap-indigo)',background:'rgba(99,102,241,.08)',padding:'2px 5px',borderRadius:4,marginLeft:'auto'}}>AI</span>}
                  </div>
                  <div style={{padding:'8px 14px',display:'flex',gap:5}}>
                    {confirmDelete===p.id ? (
                      <>
                        <div style={{flex:1,fontSize:11,fontWeight:700,color:'var(--sap-red)',display:'flex',alignItems:'center'}}>{t('superPages.deletePageConfirm')}</div>
                        <button onClick={()=>deletePage(p.id)} style={{padding:'7px 14px',borderRadius:6,border:'none',background:'var(--sap-red)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>{t('superPages.yesDelete')}</button>
                        <button onClick={()=>setConfirmDelete(null)} style={{padding:'7px 14px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'var(--sap-text-muted)',fontSize:11,fontWeight:700,cursor:'pointer'}}>No</button>
                      </>
                    ) : (
                      <>
                        <a href={`/pro/funnel/${p.id}/edit`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'7px 10px',borderRadius:6,fontSize:11,fontWeight:700,textDecoration:'none',background:'var(--sap-accent)',color:'#fff'}}><Pencil size={11}/> Edit</a>
                        {p.status==='published'&&p.slug&&(<a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'7px 10px',borderRadius:6,fontSize:11,fontWeight:700,textDecoration:'none',background:'var(--sap-bg-input)',color:'var(--sap-text-primary)',border:'1px solid #e8ecf2'}}><ExternalLink size={11}/> View</a>)}
                        <button onClick={()=>duplicatePage(p.id)} title="Duplicate" style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 8px',borderRadius:6,border:'1px solid #e8ecf2',background:'var(--sap-bg-input)',cursor:'pointer'}}><Copy size={12} color="var(--sap-text-muted)"/></button>
                        <button onClick={()=>setConfirmDelete(p.id)} title="Delete" style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 8px',borderRadius:6,border:'1px solid #fecaca',background:'var(--sap-red-bg)',cursor:'pointer'}}><Trash2 size={12} color="var(--sap-red)"/></button>
                      </>
                    )}
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

      {/* AI Funnel Wizard Modal */}
      {showAiWizard && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={()=>!aiGenerating&&setShowAiWizard(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,padding:28,width:500,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <Sparkles size={20} color="var(--sap-accent)"/>
              <h3 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-text-primary)'}}>{t('superPages.aiFunnelGenerator')}</h3>
            </div>
            <p style={{fontSize:13,color:'var(--sap-text-muted)',marginBottom:20}}>{t("superPages.aiWizardIntro")}</p>

            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',marginBottom:4}}>1. What's your niche or industry?</label>
            <input value={aiForm.niche} onChange={e=>setAiForm(p=>({...p,niche:e.target.value}))} placeholder="e.g. Forex trading, fitness coaching, crypto..."
              style={{width:'100%',padding:'10px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',marginBottom:14,boxSizing:'border-box'}}/>

            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',marginBottom:4}}>2. Who's your target audience?</label>
            <input value={aiForm.audience} onChange={e=>setAiForm(p=>({...p,audience:e.target.value}))} placeholder="e.g. Beginners, working professionals, stay-at-home parents..."
              style={{width:'100%',padding:'10px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',marginBottom:14,boxSizing:'border-box'}}/>

            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',marginBottom:4}}>3. Your story or unique angle (optional)</label>
            <textarea value={aiForm.story} onChange={e=>setAiForm(p=>({...p,story:e.target.value}))} placeholder="e.g. I went from broke to earning $5K/month in 6 months..."
              rows={3} style={{width:'100%',padding:'10px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',marginBottom:14,boxSizing:'border-box',resize:'vertical',fontFamily:'inherit'}}/>

            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',marginBottom:4}}>4. Tone of voice</label>
            <div style={{display:'flex',gap:8,marginBottom:20}}>
              {['professional','casual','urgent','inspirational'].map(t=>(
                <button key={t} onClick={()=>setAiForm(p=>({...p,tone:t}))} style={{
                  flex:1,padding:'8px 0',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',textTransform:'capitalize',
                  border:aiForm.tone===t?'2px solid #0ea5e9':'2px solid #e2e8f0',
                  background:aiForm.tone===t?'rgba(14,165,233,.06)':'#fff',
                  color:aiForm.tone===t?'var(--sap-accent)':'var(--sap-text-muted)',fontFamily:'inherit',
                }}>{t}</button>
              ))}
            </div>

            <div style={{display:'flex',gap:8}}>
              <button onClick={generateAiFunnel} disabled={aiGenerating} style={{
                flex:1,padding:'12px',borderRadius:10,border:'none',cursor:'pointer',
                background:aiGenerating?'var(--sap-text-muted)':'linear-gradient(135deg,#0ea5e9,#38bdf8)',color:'#fff',
                fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:700,
              }}>{aiGenerating?t('superPages.generating'):t('superPages.generateMyPage')}</button>
              <button onClick={()=>setShowAiWizard(false)} disabled={aiGenerating} style={{
                padding:'12px 20px',borderRadius:10,border:'1px solid #e2e8f0',cursor:'pointer',
                background:'#fff',color:'var(--sap-text-muted)',fontSize:13,fontWeight:600,fontFamily:'inherit',
              }}>{t('superPages.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
// v2 inline delete
