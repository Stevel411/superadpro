import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Plus, Eye, Pencil, Trash2, Copy, ExternalLink, FileText, Sparkles } from 'lucide-react';

// ─── Browser-framed template preview components ─────────────────────────
// Each is a miniature mock-up of what the template looks like, rendered as
// inline HTML+SVG (no image assets). Wrapped in a light Chrome-style frame
// (traffic lights + URL bar) for that "this is a real web page" feel.

function BrowserFrame({ url, children, bg = 'linear-gradient(180deg,#f0f9ff,#fff)' }) {
  return (
    <div style={{background:'#fff',borderRadius:8,overflow:'hidden',border:'1px solid #e2e8f0',boxShadow:'0 1px 4px rgba(15,23,42,.05)'}}>
      <div style={{padding:'6px 10px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:7,background:'#f8fafc'}}>
        <div style={{display:'flex',gap:4}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#ef4444'}}/>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#f59e0b'}}/>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#10b981'}}/>
        </div>
        <div style={{flex:1,background:'#fff',borderRadius:3,padding:'2px 8px',fontSize:13,color:'#7a8899',border:'0.5px solid #e2e8f0',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{url}</div>
      </div>
      <div style={{background:bg,padding:'14px 14px 16px',minHeight:150}}>
        {children}
      </div>
    </div>
  );
}

// ─── ROI strip components ─────────────────────────────────────────
// Light-theme stat tiles for the "Last 30 days" headline strip — one
// per stage of the funnel (visitors → leads → conversions → earned).
// Dark navy numbers on white background for max contrast / readability.
// 'dim' fades the value (slate-300) for placeholders waiting on data;
// 'accent' renders the value in cobalt-cyan for the 'earned' metric.
function RoiStat({ value, label, dim = false, accent = false, first = false }) {
  let valueColor = '#0a1438';      // dark navy — primary number colour
  if (dim) valueColor = '#cbd5e1'; // slate-300 — "data coming soon"
  else if (accent) valueColor = '#0ea5e9';
  return (
    <div style={{
      padding: '0 18px',
      textAlign: 'center',
      minWidth: 88,
      borderLeft: first ? 'none' : '1px solid #f1f5f9',
    }}>
      <div style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 24,
        fontWeight: 800,
        color: valueColor,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: '#94a3b8',
        marginTop: 6,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {label}
      </div>
    </div>
  );
}

function RoiArrow() {
  return (
    <div style={{
      color: '#cbd5e1',
      fontSize: 14,
      fontWeight: 700,
      padding: '0 2px',
    }}>→</div>
  );
}

// ─── CardStat ─ compact stat tile used inside the My Pages cards ──
// One per metric. Icon optional. accentColor lights up the value when
// it crosses a meaningful threshold (e.g. hot leads > 0). 'dim' fades
// the whole tile when the value is N/A (e.g. open rate before any
// emails sent).
function CardStat({ icon: Icon, value, label, dim = false, accentColor = null }) {
  const valueColor = dim
    ? 'var(--sap-text-muted)'
    : (accentColor || 'var(--sap-text-primary)');
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
      }}>
        {Icon && <Icon size={10} color="var(--sap-text-muted)" />}
        <span style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 14,
          fontWeight: 800,
          color: valueColor,
          lineHeight: 1,
        }}>{value}</span>
      </div>
      <div style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: 'var(--sap-text-muted)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{label}</div>
    </div>
  );
}

function LeadCapturePreview() {
  const { t } = useTranslation();
  return (
    <BrowserFrame url="yoursite.com/free-guide" bg="linear-gradient(180deg,#f0f9ff,#fff)">
      <div style={{fontSize:13,fontWeight:700,color:'#0f172a',textAlign:'center',lineHeight:1.3,marginBottom:4}}>{t('superPages.previewLeadHeadline')}</div>
      <div style={{fontSize:8,color:'#475569',textAlign:'center',marginBottom:10}}>{t('superPages.previewLeadSubtext')}</div>
      <div style={{background:'#fff',border:'0.5px solid #cbd5e1',borderRadius:4,padding:'5px 8px',fontSize:8,color:'#7a8899',marginBottom:6}}>{t('superPages.previewLeadEmail')}</div>
      <div style={{background:'#0ea5e9',color:'#fff',padding:6,textAlign:'center',borderRadius:4,fontSize:13,fontWeight:600}}>{t('superPages.previewLeadCTA')} →</div>
    </BrowserFrame>
  );
}

function VideoSalesPreview() {
  const { t } = useTranslation();
  return (
    <BrowserFrame url="yoursite.com/watch" bg="#0f172a">
      <div style={{fontSize:13,fontWeight:700,color:'#fff',textAlign:'center',marginBottom:7}}>{t('superPages.previewVideoHeadline')}</div>
      <div style={{background:'#1e293b',borderRadius:4,padding:16,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:6,border:'0.5px solid #334155'}}>
        <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(255,255,255,.95)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{borderLeft:'7px solid #0f172a',borderTop:'4px solid transparent',borderBottom:'4px solid transparent',marginLeft:3}}/>
        </div>
      </div>
      <div style={{background:'#8b5cf6',color:'#fff',padding:5,textAlign:'center',borderRadius:4,fontSize:13,fontWeight:600}}>{t('superPages.previewVideoCTA')} →</div>
    </BrowserFrame>
  );
}

function ProductOfferPreview() {
  const { t } = useTranslation();
  return (
    <BrowserFrame url="yoursite.com/offer" bg="linear-gradient(180deg,#fef3c7,#fff)">
      <div style={{fontSize:13,fontWeight:700,color:'#0f172a',textAlign:'center',marginBottom:6}}>{t('superPages.previewProductHeadline')}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:6}}>
        <div style={{background:'#fff',border:'0.5px solid #e2e8f0',borderRadius:4,padding:6,textAlign:'center'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>$47</div>
          <div style={{fontSize:7,color:'#475569'}}>{t('superPages.previewProductStarter')}</div>
        </div>
        <div style={{background:'#fef3c7',border:'1px solid #f59e0b',borderRadius:4,padding:6,textAlign:'center'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#92400e'}}>$97</div>
          <div style={{fontSize:7,color:'#92400e',fontWeight:600}}>{t('superPages.previewProductPro')}</div>
        </div>
      </div>
      <div style={{background:'#dc2626',color:'#fff',padding:5,textAlign:'center',borderRadius:4,fontSize:13,fontWeight:600}}>{t('superPages.previewProductCTA')} →</div>
    </BrowserFrame>
  );
}

function CoachingPreview() {
  const { t } = useTranslation();
  return (
    <BrowserFrame url="yoursite.com/book" bg="linear-gradient(180deg,#fce7f3,#fff)">
      <div style={{fontSize:13,fontWeight:700,color:'#0f172a',textAlign:'center',marginBottom:7}}>{t('superPages.previewCoachingHeadline')}</div>
      <div style={{background:'#fff',border:'0.5px solid #fbcfe8',borderRadius:4,padding:7,marginBottom:6}}>
        <div style={{fontSize:7,color:'#9d174d',fontWeight:600,marginBottom:4,textAlign:'center'}}>{t('superPages.previewCoachingSelectDay')}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
          {[0,1,2,3,4,5,6].map(i=><div key={i} style={{background:i===3?'#ec4899':(i%2===0?'#fbcfe8':'#f9a8d4'),borderRadius:2,height:8}}/>)}
        </div>
      </div>
      <div style={{background:'#ec4899',color:'#fff',padding:5,textAlign:'center',borderRadius:4,fontSize:13,fontWeight:600}}>{t('superPages.previewCoachingCTA')} →</div>
    </BrowserFrame>
  );
}

function WebinarPreview() {
  const { t } = useTranslation();
  return (
    <BrowserFrame url="yoursite.com/webinar" bg="linear-gradient(180deg,#dcfce7,#fff)">
      <div style={{color:'#f59e0b',fontSize:8,textAlign:'center',marginBottom:3,letterSpacing:1}}>★★★★★</div>
      <div style={{fontSize:13,fontWeight:700,color:'#0f172a',textAlign:'center',marginBottom:5}}>{t('superPages.previewWebinarHeadline')}</div>
      <div style={{background:'#fff',border:'0.5px solid #bbf7d0',borderRadius:4,padding:6,marginBottom:6}}>
        <div style={{height:3,background:'#86efac',borderRadius:1,width:'90%',marginBottom:2}}/>
        <div style={{height:3,background:'#86efac',borderRadius:1,width:'75%',marginBottom:2}}/>
        <div style={{height:3,background:'#86efac',borderRadius:1,width:'60%'}}/>
      </div>
      <div style={{background:'#16a34a',color:'#fff',padding:5,textAlign:'center',borderRadius:4,fontSize:13,fontWeight:600}}>{t('superPages.previewWebinarCTA')} →</div>
    </BrowserFrame>
  );
}

// ─── Template definitions ────────────────────────────────────────────────
// Primary = shown on landing, 5 cards + Blank Canvas in a 3-col grid.
// Secondary = behind "View more templates" toggle.

const PRIMARY_TEMPLATES = [
  { key: 'lead-capture', titleKey: 'tplLeadCapture', descKey: 'tplLeadCaptureDesc', Preview: LeadCapturePreview },
  { key: 'video-sales', titleKey: 'tplVideoSales', descKey: 'tplVideoSalesDesc', Preview: VideoSalesPreview },
  { key: 'product-offer', titleKey: 'tplProductOffer', descKey: 'tplProductOfferDesc', Preview: ProductOfferPreview },
  { key: 'coaching-program', titleKey: 'tplCoaching', descKey: 'tplCoachingDesc', Preview: CoachingPreview },
  { key: 'webinar-registration', titleKey: 'tplWebinar', descKey: 'tplWebinarDesc', Preview: WebinarPreview },
];

const SECONDARY_TEMPLATES = [
  { key: 'network-opportunity', titleKey: 'tplBusinessOpp', descKey: 'tplBusinessOppDesc' },
  { key: 'digital-product', titleKey: 'tplDigitalProduct', descKey: 'tplDigitalProductDesc' },
  { key: 'affiliate-income', titleKey: 'tplAffiliate', descKey: 'tplAffiliateDesc' },
  { key: 'thank-you', titleKey: 'tplThankYou', descKey: 'tplThankYouDesc' },
];

export default function Funnels() {
  const { t } = useTranslation();
  const [pages, setPages] = useState([]);
  // 30-day rollup for the ROI strip — populated alongside `pages` from
  // /api/funnels. Stays null until the first load resolves so the strip
  // can render a skeleton until real numbers arrive.
  const [rollup30d, setRollup30d] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingKey, setCreatingKey] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAiWizard, setShowAiWizard] = useState(false);
  const [showMoreTemplates, setShowMoreTemplates] = useState(false);
  const [aiForm, setAiForm] = useState({ niche: '', audience: '', story: '', tone: 'professional' });
  const [aiGenerating, setAiGenerating] = useState(false);
  const navigate = useNavigate();

  const load = () => apiGet('/api/funnels').then(d => {
    setPages(d.funnels || d.pages || []);
    setRollup30d(d.rollup_30d || null);
    setLoading(false);
  }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const createFromTemplate = async (key) => {
    setCreating(true); setCreatingKey(key);
    try {
      if (key === 'blank') {
        const res = await apiPost('/api/funnels/save', { title: 'Untitled Page', status: 'draft' });
        if (res.id) window.location.href = `/pro/funnel/${res.id}/edit`;
      } else {
        const res = await apiPost('/api/funnels/from-template', { niche: key });
        if (res.id) { window.location.href = `/pro/funnel/${res.id}/edit`; }
        else if (res.edit_url) { const parts = res.edit_url.match(/\/(\d+)\//); if (parts) window.location.href = `/pro/funnel/${parts[1]}/edit`; }
      }
    } catch (e) { alert(e.message); }
    setCreating(false); setCreatingKey(null);
  };

  const deletePage = async (id) => {
    try { await apiPost(`/api/funnels/delete/${id}`, {}); setPages(p => p.filter(x => x.id !== id)); setConfirmDelete(null); }
    catch (e) { alert(e.message); }
  };

  const duplicatePage = async (id) => {
    try { const res = await apiPost(`/api/funnels/duplicate/${id}`, {}); if (res.id) window.location.href = `/pro/funnel/${res.id}/edit`; else load(); }
    catch (e) { alert(e.message); }
  };

  const generateAiFunnel = async () => {
    if (!aiForm.niche.trim()) { alert(t('superPages.nicheRequired')); return; }
    setAiGenerating(true);
    try {
      const res = await apiPost('/api/pro/generate-funnel', aiForm);
      const pageId = res.id || res.funnel_id;
      if (pageId) { window.location.href = `/pro/funnel/${pageId}/edit`; }
      else if (res.error) alert(res.error);
      else alert(t('superPages.generationFailed'));
    } catch (e) { alert(t('superPages.errorPrefix') + e.message); }
    setAiGenerating(false);
  };

  const totalViews = pages.reduce((a, p) => a + (p.views || 0), 0);
  const totalLeads = pages.reduce((a, p) => a + (p.leads_captured || 0), 0);
  const published = pages.filter(p => p.status === 'published').length;

  if (loading) return <AppLayout title={t('superPages.title')}><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;

  return (
    <AppLayout>
      {/* Header — logo + subtitle + My Pages button */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <svg width="40" height="40" viewBox="0 0 48 48" style={{flexShrink:0}}>
            <rect x="6" y="6" width="16" height="16" rx="4" fill="var(--sap-accent)" opacity=".9"/>
            <rect x="26" y="6" width="16" height="16" rx="4" fill="var(--sap-indigo)" opacity=".7"/>
            <rect x="6" y="26" width="16" height="16" rx="4" fill="var(--sap-indigo)" opacity=".5"/>
            <rect x="26" y="26" width="16" height="16" rx="4" fill="var(--sap-accent)" opacity=".3"/>
          </svg>
          <div>
            <h1 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:26,fontWeight:800,color:'var(--sap-text-primary)',lineHeight:1}}>
              Super<span style={{color:'var(--sap-accent)'}}>Pages</span>
            </h1>
            <p style={{margin:'4px 0 0',fontSize:12,color:'var(--sap-text-muted)'}}>{t('superPages.subtitleShort')}</p>
          </div>
        </div>
        {pages.length > 0 && (
          <button onClick={() => document.getElementById('your-pages')?.scrollIntoView({behavior:'smooth'})} style={{background:'#fff',color:'var(--sap-text-primary)',border:'1px solid #e2e8f0',padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
            {t('superPages.myPagesButton')} · {pages.length}
          </button>
        )}
      </div>

      {/* AI Hero — light theme banner */}
      <div style={{background:'linear-gradient(135deg,#eff6ff 0%,#e0e7ff 50%,#f3e8ff 100%)',border:'1px solid #c7d2fe',borderRadius:14,padding:'20px 24px',marginBottom:24,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:14,flex:1,minWidth:240}}>
          <div style={{width:46,height:46,borderRadius:12,background:'linear-gradient(135deg,#0ea5e9,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 6px 16px rgba(14,165,233,.25)'}}>
            <Sparkles size={22} color="#fff" strokeWidth={2.2}/>
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:'var(--sap-text-primary)',marginBottom:2,fontFamily:'Sora,sans-serif'}}>{t('superPages.heroHeadline')}</div>
            <div style={{fontSize:12,color:'#475569'}}>{t('superPages.heroSubtext')}</div>
          </div>
        </div>
        <button onClick={() => setShowAiWizard(true)} style={{background:'var(--sap-text-primary)',color:'#fff',border:'none',padding:'11px 20px',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Sora,sans-serif',whiteSpace:'nowrap',flexShrink:0}}>
          {t('superPages.heroButton')} →
        </button>
      </div>

      {/* ── ROI strip ─ Last 30 days at a glance ──
          Light card with high-contrast numbering. Cobalt eyebrow label
          identifies the timeframe; dark navy numbers sit on white so
          they pop. Each stat sits in its own tile divided by hairline
          rules. Conversions + earnings show '—' (in slate-300) until
          Commit B lands the lead-attribution layer that powers them. */}
      {pages.length > 0 && rollup30d && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '18px 24px',
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(15,23,42,.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 6,
              height: 36,
              borderRadius: 3,
              background: 'linear-gradient(180deg, #0ea5e9, #06b6d4)',
            }} />
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: '#0ea5e9',
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 2,
              }}>
                Last 30 days
              </div>
              <div style={{
                fontSize: 12,
                color: '#64748b',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Your funnel performance
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            flex: 1,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}>
            <RoiStat value={rollup30d.visitors} label="visitors" first />
            <RoiArrow />
            <RoiStat value={rollup30d.leads} label="leads" />
            <RoiArrow />
            <RoiStat
              value={rollup30d.conversions === null ? '—' : rollup30d.conversions}
              label="conversions"
              dim={rollup30d.conversions === null}
            />
            <RoiArrow />
            <RoiStat
              value={rollup30d.earnings === null ? '—' : `$${rollup30d.earnings}`}
              label="earned"
              dim={rollup30d.earnings === null}
              accent
            />
          </div>
        </div>
      )}

      {/* Section label */}
      <div style={{fontSize:13,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>
        {t('superPages.orStartFromTemplate')}
      </div>

      {/* 3-column template grid — 5 templates + Blank Canvas as 6th tile */}
      <div className="sp-template-grid" style={{gap:14,marginBottom:16}}>
        {PRIMARY_TEMPLATES.map(tpl => {
          const { Preview } = tpl;
          const isCreating = creating && creatingKey === tpl.key;
          return (
            <div key={tpl.key} className="tpl-card" onClick={() => !creating && createFromTemplate(tpl.key)} style={{background:'#fff',borderRadius:10,border:'1px solid #e2e8f0',overflow:'hidden',cursor:creating?'wait':'pointer',transition:'all .2s',display:'flex',flexDirection:'column'}}>
              <div style={{padding:'10px 10px 0'}}>
                <Preview/>
              </div>
              <div style={{padding:'12px 14px 14px',flex:1,display:'flex',flexDirection:'column'}}>
                <div style={{fontSize:14,fontWeight:700,color:'var(--sap-text-primary)',marginBottom:2,fontFamily:'Sora,sans-serif'}}>{t('superPages.' + tpl.titleKey)}</div>
                <div style={{fontSize:13,color:'var(--sap-text-muted)',marginBottom:10,flex:1}}>{t('superPages.' + tpl.descKey)}</div>
                <div style={{padding:'7px 12px',borderRadius:6,fontSize:13,fontWeight:600,background:isCreating?'#f1f5f9':'transparent',color:isCreating?'#475569':'#0284c7',border:`1px solid ${isCreating?'#e2e8f0':'#bae6fd'}`,textAlign:'center'}}>
                  {isCreating ? t('superPages.creatingEllipsis') : t('superPages.useThisTemplate') + ' →'}
                </div>
              </div>
            </div>
          );
        })}

        {/* Blank Canvas — 6th tile, dashed */}
        <div className="tpl-card" onClick={() => !creating && createFromTemplate('blank')} style={{background:'#fff',borderRadius:10,border:'1.5px dashed #cbd5e1',overflow:'hidden',cursor:creating?'wait':'pointer',transition:'all .2s',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 20px',minHeight:260}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
            <Plus size={20} color="#475569" strokeWidth={2}/>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--sap-text-primary)',marginBottom:3,fontFamily:'Sora,sans-serif'}}>{t('superPages.blankCanvasName')}</div>
          <div style={{fontSize:13,color:'var(--sap-text-muted)',textAlign:'center'}}>{t('superPages.blankCanvasTagline')}</div>
        </div>
      </div>

      {/* View more templates toggle */}
      {!showMoreTemplates && (
        <div style={{textAlign:'center',marginBottom:24}}>
          <button onClick={() => setShowMoreTemplates(true)} style={{background:'transparent',border:'none',color:'#0284c7',fontSize:12,fontWeight:600,cursor:'pointer',padding:'8px 16px',fontFamily:'inherit'}}>
            {t('superPages.viewMoreTemplates', {count: SECONDARY_TEMPLATES.length})} →
          </button>
        </div>
      )}

      {/* Expanded secondary templates */}
      {showMoreTemplates && (
        <div style={{marginBottom:24}}>
          <div className="sp-template-grid" style={{gap:14}}>
            {SECONDARY_TEMPLATES.map(tpl => {
              const isCreating = creating && creatingKey === tpl.key;
              return (
                <div key={tpl.key} className="tpl-card" onClick={() => !creating && createFromTemplate(tpl.key)} style={{background:'#fff',borderRadius:10,border:'1px solid #e2e8f0',overflow:'hidden',cursor:creating?'wait':'pointer',transition:'all .2s',padding:'20px 16px',display:'flex',flexDirection:'column',minHeight:160}}>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--sap-text-primary)',marginBottom:4,fontFamily:'Sora,sans-serif'}}>{t('superPages.' + tpl.titleKey)}</div>
                  <div style={{fontSize:12,color:'var(--sap-text-muted)',marginBottom:14,flex:1,lineHeight:1.5}}>{t('superPages.' + tpl.descKey)}</div>
                  <div style={{padding:'7px 12px',borderRadius:6,fontSize:13,fontWeight:600,background:isCreating?'#f1f5f9':'transparent',color:isCreating?'#475569':'#0284c7',border:`1px solid ${isCreating?'#e2e8f0':'#bae6fd'}`,textAlign:'center'}}>
                    {isCreating ? t('superPages.creatingEllipsis') : t('superPages.useThisTemplate') + ' →'}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{textAlign:'center',marginTop:12}}>
            <button onClick={() => setShowMoreTemplates(false)} style={{background:'transparent',border:'none',color:'#475569',fontSize:13,fontWeight:500,cursor:'pointer',padding:'4px 10px',fontFamily:'inherit'}}>
              {t('superPages.showLess')}
            </button>
          </div>
        </div>
      )}

      {/* Your Pages section (preserved from original) */}
      {pages.length > 0 && (
        <div id="your-pages" style={{marginTop:32}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16,maxWidth:480}}>
            {[{label:t('superPages.publishedLabel'),val:published,color:'var(--sap-green)'},{label:t('superPages.leadsLabel2'),val:totalLeads,color:'var(--sap-accent)'},{label:t('superPages.viewsLabel2'),val:totalViews,color:'var(--sap-purple)'}].map((s,i) => (
              <div key={i} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,padding:'12px 14px',borderLeft:`3px solid ${s.color}`}}>
                <div style={{fontSize:13,fontWeight:700,letterSpacing:.8,color:'var(--sap-text-muted)',textTransform:'uppercase'}}>{s.label}</div>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:900,color:'var(--sap-text-primary)',margin:'2px 0'}}>{s.val}</div>
              </div>
            ))}
          </div>

          <h2 style={{margin:'0 0 12px',fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'var(--sap-text-primary)'}}>{t('superPages.yourPages')}</h2>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
            {pages.map(p => {
              // Engagement fields from /api/funnels — undefined if the
              // page was just created or never had traffic. Fall back to
              // 0 so the layout doesn't break for fresh accounts.
              const views30 = p.views_30d ?? 0;
              const optins30 = p.optins_30d ?? 0;
              const convRate = p.conversion_rate_30d ?? 0;
              const leadsHot = p.leads_hot ?? 0;
              const leadsNew24h = p.leads_new_24h ?? 0;
              const openRate = p.sequence_open_rate ?? 0;
              const hasTraffic = views30 > 0 || (p.leads_total ?? 0) > 0;

              return (
              <div key={p.id} style={{background:'#fff',border:'1px solid #e8ecf2',borderRadius:10,overflow:'hidden'}}>
                <div style={{padding:'12px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:p.status==='published'?'#10b981':'#cbd5e1'}}/>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--sap-text-primary)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title||t('superPages.untitled')}</div>
                    {p.is_ai_generated && <span style={{fontSize:8,fontWeight:700,color:'var(--sap-indigo)',background:'rgba(99,102,241,.08)',padding:'2px 5px',borderRadius:4}}>AI</span>}
                  </div>
                  {p.slug && <div style={{fontSize:13,color:'var(--sap-text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>/{p.slug}</div>}
                </div>

                {/* ── Engagement panel (replaces the legacy views+leads row) ──
                    Two-line stats grid. Line 1: 30-day visitors / opt-ins /
                    conversion rate. Line 2: hot leads / new 24h / open rate.
                    All values fall back to 0 silently — fresh pages show
                    zeros, not blanks, so the user can see "yes the system
                    is tracking, just no data yet". */}
                <div style={{padding:'10px 14px',borderTop:'1px solid #f1f3f7',borderBottom:'1px solid #f1f3f7',background:'#fcfdfe'}}>
                  <div style={{display:'flex',gap:10,marginBottom:hasTraffic?6:0}}>
                    <CardStat icon={Eye} value={views30} label="30d views" />
                    <CardStat icon={FileText} value={optins30} label="opt-ins" />
                    <CardStat
                      value={views30 > 0 ? `${(convRate * 100).toFixed(1)}%` : '—'}
                      label="conv. rate"
                      dim={views30 === 0}
                    />
                  </div>
                  {hasTraffic && (
                    <div style={{display:'flex',gap:10}}>
                      <CardStat
                        value={leadsHot}
                        label="🔥 hot"
                        accentColor={leadsHot > 0 ? '#dc2626' : null}
                      />
                      <CardStat
                        value={leadsNew24h}
                        label="new 24h"
                        accentColor={leadsNew24h > 0 ? '#10b981' : null}
                      />
                      <CardStat
                        value={(p.leads_total ?? 0) > 0 && p.sequence_open_rate !== null
                          ? `${(openRate * 100).toFixed(0)}%`
                          : '—'}
                        label="open rate"
                        dim={(p.leads_total ?? 0) === 0}
                      />
                    </div>
                  )}
                </div>

                <div style={{padding:'8px 14px',display:'flex',gap:5}}>
                  {confirmDelete === p.id ? (
                    <>
                      <div style={{flex:1,fontSize:13,fontWeight:700,color:'var(--sap-red)',display:'flex',alignItems:'center'}}>{t('superPages.deletePrompt')}</div>
                      <button onClick={() => deletePage(p.id)} style={{padding:'7px 14px',borderRadius:6,border:'none',background:'var(--sap-red)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>{t('superPages.deleteYes')}</button>
                      <button onClick={() => setConfirmDelete(null)} style={{padding:'7px 14px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'var(--sap-text-muted)',fontSize:13,fontWeight:700,cursor:'pointer'}}>{t('superPages.deleteNo')}</button>
                    </>
                  ) : (
                    <>
                      <a href={`/pro/funnel/${p.id}/edit`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'7px 10px',borderRadius:6,fontSize:13,fontWeight:700,textDecoration:'none',background:'var(--sap-accent)',color:'#fff'}}><Pencil size={11}/> {t('superPages.editBtn2')}</a>
                      {p.status === 'published' && p.slug && (<a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'7px 10px',borderRadius:6,fontSize:13,fontWeight:700,textDecoration:'none',background:'var(--sap-bg-input)',color:'var(--sap-text-primary)',border:'1px solid #e8ecf2'}}><ExternalLink size={11}/> {t('superPages.viewBtn2')}</a>)}
                      <button onClick={() => duplicatePage(p.id)} title={t('superPages.duplicateTooltip')} style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 8px',borderRadius:6,border:'1px solid #e8ecf2',background:'var(--sap-bg-input)',cursor:'pointer'}}><Copy size={12} color="var(--sap-text-muted)"/></button>
                      <button onClick={() => setConfirmDelete(p.id)} title={t('superPages.deleteTooltip')} style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 8px',borderRadius:6,border:'1px solid #fecaca',background:'var(--sap-red-bg)',cursor:'pointer'}}><Trash2 size={12} color="var(--sap-red)"/></button>
                    </>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .sp-template-grid{display:grid;grid-template-columns:repeat(3,1fr)}
        @media(max-width:960px){.sp-template-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.sp-template-grid{grid-template-columns:1fr}}
        .tpl-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(15,23,42,.06),0 2px 8px rgba(15,23,42,.03)!important;border-color:#cbd5e1!important}
        .tpl-card:active{transform:scale(.99)!important}
      `}</style>

      {/* AI Funnel Wizard Modal (preserved from original) */}
      {showAiWizard && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)',padding:16}} onClick={() => !aiGenerating && setShowAiWizard(false)}>
          <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:16,padding:28,width:'100%',maxWidth:500,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <Sparkles size={20} color="var(--sap-accent)"/>
              <h3 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:800,color:'var(--sap-text-primary)'}}>{t('superPages.aiFunnelGenerator')}</h3>
            </div>
            <p style={{fontSize:13,color:'var(--sap-text-muted)',marginBottom:20}}>{t('superPages.aiWizardIntro')}</p>

            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',marginBottom:4}}>{t('superPages.nicheQuestionFull')}</label>
            <input value={aiForm.niche} onChange={e => setAiForm(p => ({...p, niche: e.target.value}))} placeholder={t('superPages.nichePlaceholderFull')}
              style={{width:'100%',padding:'10px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',marginBottom:14,boxSizing:'border-box'}}/>

            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',marginBottom:4}}>{t('superPages.audienceQuestionFull')}</label>
            <input value={aiForm.audience} onChange={e => setAiForm(p => ({...p, audience: e.target.value}))} placeholder={t('superPages.audiencePlaceholderFull')}
              style={{width:'100%',padding:'10px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',marginBottom:14,boxSizing:'border-box'}}/>

            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',marginBottom:4}}>{t('superPages.storyQuestion')}</label>
            <textarea value={aiForm.story} onChange={e => setAiForm(p => ({...p, story: e.target.value}))} placeholder={t('superPages.storyPlaceholder')}
              rows={3} style={{width:'100%',padding:'10px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',marginBottom:14,boxSizing:'border-box',resize:'vertical',fontFamily:'inherit'}}/>

            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--sap-text-secondary)',marginBottom:4}}>{t('superPages.toneQuestion')}</label>
            <div style={{display:'flex',gap:8,marginBottom:20}}>
              {['professional', 'casual', 'urgent', 'inspirational'].map(tone => (
                <button key={tone} onClick={() => setAiForm(p => ({...p, tone}))} style={{
                  flex:1, padding:'8px 0', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', textTransform:'capitalize',
                  border: aiForm.tone === tone ? '2px solid #0ea5e9' : '2px solid #e2e8f0',
                  background: aiForm.tone === tone ? 'rgba(14,165,233,.06)' : '#fff',
                  color: aiForm.tone === tone ? 'var(--sap-accent)' : 'var(--sap-text-muted)', fontFamily:'inherit',
                }}>{tone}</button>
              ))}
            </div>

            <div style={{display:'flex',gap:8}}>
              <button onClick={generateAiFunnel} disabled={aiGenerating} style={{
                flex:1, padding:'12px', borderRadius:10, border:'none', cursor:'pointer',
                background: aiGenerating ? 'var(--sap-text-muted)' : 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color:'#fff',
                fontFamily:'Sora,sans-serif', fontSize:13, fontWeight:700,
              }}>{aiGenerating ? t('superPages.generating') : t('superPages.generateMyPage')}</button>
              <button onClick={() => setShowAiWizard(false)} disabled={aiGenerating} style={{
                padding:'12px 20px', borderRadius:10, border:'1px solid #e2e8f0', cursor:'pointer',
                background:'#fff', color:'var(--sap-text-muted)', fontSize:13, fontWeight:600, fontFamily:'inherit',
              }}>{t('superPages.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
