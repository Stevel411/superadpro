import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AlShell from '../components/layout/AlShell';
import { useAuth } from '../hooks/useAuth';
import { Video, Globe, BarChart3, Zap, ChevronRight } from 'lucide-react';

export default function CreateCampaign() {
  var { t } = useTranslation();
  var { user } = useAuth();
  var [title, setTitle] = useState('');
  var [videoUrl, setVideoUrl] = useState('');
  var [category, setCategory] = useState('business');
  var [description, setDescription] = useState('');
  var [targetCountry, setTargetCountry] = useState('');
  var [targetInterests, setTargetInterests] = useState('');
  var [ctaUrl, setCtaUrl] = useState('');
  var [submitting, setSubmitting] = useState(false);
  var [result, setResult] = useState(null);
  var [error, setError] = useState(null);
  var [preview, setPreview] = useState(null);

  useEffect(function() { window.scrollTo(0, 0); }, []);

  var categories = [
    { value: 'business', label: t('createCampaign.catBusiness') },
    { value: 'marketing', label: t('createCampaign.catMarketing') },
    { value: 'crypto', label: t('createCampaign.catCrypto') },
    { value: 'health', label: t('createCampaign.catHealth') },
    { value: 'education', label: t('createCampaign.catEducation') },
    { value: 'tech', label: t('createCampaign.catTech') },
    { value: 'lifestyle', label: t('createCampaign.catLifestyle') },
    { value: 'ecommerce', label: t('createCampaign.catEcommerce') },
    { value: 'forex', label: t('createCampaign.catForex') },
    { value: 'general', label: t('createCampaign.catGeneral') },
  ];

  function parseVideoUrl(url) {
    if (!url) return null;
    var yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return { platform: 'youtube', id: yt[1], embed: 'https://www.youtube.com/embed/' + yt[1] };
    var vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return { platform: 'vimeo', id: vm[1], embed: 'https://player.vimeo.com/video/' + vm[1] };
    return null;
  }

  function handleUrlChange(url) { setVideoUrl(url); setPreview(parseVideoUrl(url)); }

  function handleSubmit() {
    if (!title.trim()) { setError(t('createCampaign.errTitle')); return; }
    if (!videoUrl.trim()) { setError(t('createCampaign.errUrl')); return; }
    if (!preview) { setError(t('createCampaign.errInvalidUrl')); return; }
    setSubmitting(true); setError(null);
    var formData = new URLSearchParams();
    formData.append('title', title.trim());
    formData.append('video_url', videoUrl.trim());
    formData.append('category', category);
    formData.append('description', description.trim());
    formData.append('target_country', targetCountry.trim());
    formData.append('target_interests', targetInterests.trim());
    var ctaTrimmed = ctaUrl.trim();
    if (ctaTrimmed) {
      if (!/^https?:\/\//i.test(ctaTrimmed)) {
        setSubmitting(false);
        setError(t('createCampaign.errCtaUrl', { defaultValue: 'CTA URL must start with http:// or https://' }));
        return;
      }
      formData.append('cta_url', ctaTrimmed);
    }
    fetch('/upload', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData.toString() })
      .then(function(r) { return r.json(); })
      .then(function(d) { setSubmitting(false); if (d.error) { setError(d.error); } else { setResult(d); setTitle(''); setVideoUrl(''); setDescription(''); setCtaUrl(''); setPreview(null); } })
      .catch(function(e) { setSubmitting(false); setError(e.message); });
  }

  var inputStyle = { width:'100%', padding:'12px 16px', borderRadius:12, border:'1.5px solid #e6ecf5', fontSize:14, fontFamily:'inherit', outline:'none', background:'#f8fafc', boxSizing:'border-box', transition:'border-color 0.2s', color:'#0a1f52' };
  var labelStyle = { display:'block', fontSize:12, fontWeight:700, color:'#475569', marginBottom:6, marginTop:18, textTransform:'uppercase', letterSpacing:0.5 };

  // Pack-locked screen — Create Campaign requires an owned VideoView pack.
  // That's the AL premise: buy a pack -> unlock campaign creation -> your
  // pack's views get delivered to the campaigns you make. Admins bypass;
  // everyone else gets a clean CTA to /packs rather than a form that fails
  // on submit. (highest_tier now resolves from PackPurchase, not the retired
  // Grid table — see get_user_highest_tier in app/main.py.)
  if (user && !user.is_admin && !(user.highest_tier && user.highest_tier > 0)) return (
    <AlShell active="campaigns" back={{ to: '/campaigns', label: 'Campaigns' }}>
      <div style={{maxWidth:520,margin:'60px auto',textAlign:'center',padding:'48px 32px',background:'#fff',borderRadius:20,border:'1px solid #e6ecf5',boxShadow:'0 10px 30px -18px rgba(10,31,82,.3)'}}>
        <div style={{width:64,height:64,borderRadius:18,margin:'0 auto 18px',background:'linear-gradient(120deg,#c8102e,#e8203f)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        </div>
        <h2 style={{fontFamily:'Inter,sans-serif',fontSize:23,fontWeight:900,marginBottom:12,color:'#0a1f52',letterSpacing:-.5}}>
          {t('createCampaign.lockedTitle', {defaultValue: 'Campaign creation is locked'})}
        </h2>
        <p style={{fontSize:14.5,color:'#5a6584',lineHeight:1.65,maxWidth:400,margin:'0 auto 28px',fontWeight:600}}>
          {t('createCampaign.lockedDesc', {defaultValue: 'Buy a VideoView pack to create your own video campaigns. Your pack\u2019s views are delivered to the campaigns you make \u2014 watched by real members for 30 seconds or more.'})}
        </p>
        <Link to="/packs" style={{
          display:'inline-flex',alignItems:'center',gap:8,padding:'14px 28px',borderRadius:12,
          background:'linear-gradient(120deg,#c8102e,#e8203f)',color:'#fff',
          fontWeight:900,fontSize:14,fontFamily:'inherit',
          textDecoration:'none',boxShadow:'0 14px 30px -12px rgba(200,16,46,.7)',
        }}>
          {t('createCampaign.lockedCta', {defaultValue: 'Buy a pack'})} →
        </Link>
      </div>
    </AlShell>
  );

  return (
    <AlShell active="campaigns" back={{ to: '/campaigns', label: 'Campaigns' }}>

      {/* Hero */}
      <div style={{ background:'#0a1f52', borderRadius:20, padding:'22px 26px', marginBottom:18, boxShadow:'0 24px 50px -28px rgba(10,31,82,.55)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:15 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(120deg,#c8102e,#e8203f)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Video size={26} color="#fff"/>
          </div>
          <div>
            <div style={{ fontWeight:900, fontSize:23, letterSpacing:-.6, color:'#fff' }}>{t('createCampaign.campaignDetails')}</div>
            <div style={{ fontSize:13.5, color:'#c9d6f7', fontWeight:600, marginTop:2 }}>{t('createCampaign.campaignDetailsDesc')}</div>
          </div>
        </div>
      </div>

      {/* 3 info cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { Icon:Video, title:t('createCampaign.pasteAndGo'), desc:t('createCampaign.pasteAndGoDesc'), gradient:'linear-gradient(135deg,#0f766e,#14b8a6)' },
          { Icon:Globe, title:t('createCampaign.realViews'), desc:t('createCampaign.realViewsDesc'), gradient:'linear-gradient(135deg,#1e40af,#3b82f6)' },
          { Icon:BarChart3, title:t('createCampaign.liveAnalytics'), desc:t('createCampaign.liveAnalyticsDesc'), gradient:'linear-gradient(135deg,#6d28d9,#9db0e0)' },
        ].map(function(card, i) {
          return <div key={i} style={{ background:'#fff', border:'1px solid #e6ecf5', borderRadius:14, padding:'20px', position:'relative', overflow:'hidden' }}>
            <div style={{ width:40, height:40, borderRadius:12, background:card.gradient, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
              <card.Icon size={20} color="#fff"/>
            </div>
            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:14, fontWeight:800, color:'#0a1f52', marginBottom:4 }}>{card.title}</div>
            <div style={{ fontSize:13, color:'#475569', lineHeight:1.6 }}>{card.desc}</div>
          </div>;
        })}
      </div>

      {/* Form */}
      <div style={{ background:'#fff', border:'1px solid #e6ecf5', borderRadius:16, padding:'28px 32px', marginBottom:20 }}>

        <label style={labelStyle}>{t('createCampaign.campaignTitle')}</label>
        <input style={inputStyle} value={title} onChange={function(e){setTitle(e.target.value);}} placeholder={t("createCampaign.campaignTitlePlaceholder")} maxLength={120}
          onFocus={function(e){e.target.style.borderColor='#c8102e';}} onBlur={function(e){e.target.style.borderColor='#e6ecf5';}}/>

        <label style={labelStyle}>{t('createCampaign.videoUrl')}</label>
        <input style={inputStyle} value={videoUrl} onChange={function(e){handleUrlChange(e.target.value);}} placeholder={t("createCampaign.videoUrlPlaceholder")}
          onFocus={function(e){e.target.style.borderColor='#c8102e';}} onBlur={function(e){e.target.style.borderColor='#e6ecf5';}}/>
        {videoUrl && !preview && <div style={{ fontSize:12, color:'#ef4444', marginTop:6, fontWeight:600 }}>{t('createCampaign.unsupportedUrl')}</div>}

        {/* Video preview */}
        {preview && (
          <div style={{ marginTop:16, borderRadius:14, overflow:'hidden', border:'1px solid #e6ecf5' }}>
            <iframe src={preview.embed} style={{ width:'100%', height:360, border:'none', background:'#000' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={t('createCampaign.previewLabel')}/>
            <div style={{ padding:'10px 16px', background:'#f8fafc', display:'flex', alignItems:'center', gap:8, borderTop:'1px solid #e6ecf5' }}>
              <span style={{ padding:'3px 10px', borderRadius:6, fontSize:13, fontWeight:800, textTransform:'uppercase',
                background:preview.platform==='youtube'?'rgba(239,68,68,0.08)':'rgba(200,16,46,0.08)',
                color:preview.platform==='youtube'?'#ef4444':'#c8102e' }}>{preview.platform}</span>
              <span style={{ fontSize:12, color:'#7a8899' }}>ID: {preview.id}</span>
            </div>
          </div>
        )}

        <label style={labelStyle}>{t('createCampaign.category')}</label>
        <select style={{...inputStyle, cursor:'pointer'}} value={category} onChange={function(e){setCategory(e.target.value);}}>
          {categories.map(function(c) { return <option key={c.value} value={c.value}>{c.label}</option>; })}
        </select>

        <label style={labelStyle}>{t('createCampaign.description')}</label>
        <textarea style={{...inputStyle, minHeight:90, resize:'vertical'}} value={description} onChange={function(e){setDescription(e.target.value);}} placeholder={t("createCampaign.descPlaceholder")} maxLength={500}
          onFocus={function(e){e.target.style.borderColor='#c8102e';}} onBlur={function(e){e.target.style.borderColor='#e6ecf5';}}/>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <label style={labelStyle}>{t('createCampaign.targetCountry')}</label>
            <input style={inputStyle} value={targetCountry} onChange={function(e){setTargetCountry(e.target.value);}} placeholder={t("createCampaign.targetCountryPlaceholder")} maxLength={200}
              onFocus={function(e){e.target.style.borderColor='#c8102e';}} onBlur={function(e){e.target.style.borderColor='#e6ecf5';}}/>
          </div>
          <div>
            <label style={labelStyle}>{t('createCampaign.targetInterests')}</label>
            <input style={inputStyle} value={targetInterests} onChange={function(e){setTargetInterests(e.target.value);}} placeholder={t("createCampaign.targetInterestsPlaceholder")} maxLength={200}
              onFocus={function(e){e.target.style.borderColor='#c8102e';}} onBlur={function(e){e.target.style.borderColor='#e6ecf5';}}/>
          </div>
        </div>

        <label style={labelStyle}>{t('createCampaign.ctaUrl', { defaultValue: 'Call-to-action URL (optional)' })}</label>
        <input style={inputStyle} value={ctaUrl} onChange={function(e){setCtaUrl(e.target.value);}}
          placeholder={t("createCampaign.ctaUrlPlaceholder", { defaultValue: 'https://your-website.com' })} maxLength={500} type="url"
          onFocus={function(e){e.target.style.borderColor='#c8102e';}} onBlur={function(e){e.target.style.borderColor='#e6ecf5';}}/>
        <div style={{ fontSize:13, color:'#475569', marginTop:6, lineHeight:1.4 }}>
          {t('createCampaign.ctaUrlHelp', { defaultValue: 'Optional. If set, a "Visit Website" button appears below your video once members have watched the full 30 seconds.' })}
        </div>

        {error && <div style={{ marginTop:16, padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)', color:'#ef4444', fontSize:14, fontWeight:600 }}>{error}</div>}
        {result && <div style={{ marginTop:16, padding:'16px 20px', borderRadius:10, background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.15)', color:'#15803d', fontSize:14, fontWeight:600 }}>
          {t('createCampaign.successCreated')} {result.status === 'pending' ? t('createCampaign.pendingReview') : t('createCampaign.nowLive')}
          <Link to="/video-library" style={{ color:'#15803d', fontWeight:800, marginLeft:8 }}>{t('createCampaign.viewMyCampaigns')} <ChevronRight size={14} style={{verticalAlign:'middle'}}/></Link>
        </div>}

        <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:24 }}>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ padding:'14px 36px', borderRadius:12, fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, border:'none', cursor:submitting?'not-allowed':'pointer',
              background:submitting?'#7a8899':'linear-gradient(135deg,#c8102e,#3b82f6)', color:'#fff', opacity:submitting?0.6:1, transition:'all 0.2s' }}>
            {submitting ? t('createCampaign.creating') : t('createCampaign.launchCampaign')}
          </button>
          <div style={{ fontSize:13, color:'#7a8899' }}>{t('createCampaign.tierNote')}</div>
        </div>
      </div>

    </AlShell>
  );
}
