// ─── FunnelsNew ─ The "Start a new page" creation flow ────────────────
// Lives at /pro/funnels/new. Separated from the main dashboard
// (/pro/funnels) on 18 May 2026 to clean up the dashboard's visual
// hierarchy — the dashboard now does one job (show business state)
// and this page does another (start new things).
//
// Layout:
//   1. Breadcrumb back to /pro/funnels
//   2. Page header
//   3. AI generator hero (cobalt-to-teal gradient banner)
//   4. 3×3 template grid: 8 niche templates + Blank Canvas
//      Each tile has a unique cobalt-spectrum gradient cover for
//      visual distinction (still on-brand — no amber/red/purple).
//
// Click handler: same campaign-setup modal flow as the old inline
// version. Pick a template → modal opens → user picks list +
// sequence → /api/funnels/from-template (or /api/funnels/save for
// blank) → editor opens.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';
import { apiPost } from '../utils/api';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { TEMPLATES, BLANK_CANVAS } from '../data/funnelTemplates';
import CampaignSetupModal from '../components/CampaignSetupModal';

export default function FunnelsNew() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [creatingKey, setCreatingKey] = useState(null);
  // Phase 1 — pending template = which tile the user clicked. Holds
  // the template object so the modal can pre-fill the suggested list
  // name. Cleared when the user confirms or cancels.
  const [pendingTemplate, setPendingTemplate] = useState(null);
  // AI wizard modal toggle (carries over from old Funnels.jsx).
  const [showAiWizard, setShowAiWizard] = useState(false);
  const [aiForm, setAiForm] = useState({ niche: '', audience: '', story: '', tone: 'professional' });
  const [aiGenerating, setAiGenerating] = useState(false);

  // Step 1 — user clicks a tile. Open the campaign-setup modal.
  const handleTemplateClick = (tpl) => {
    if (creating) return;
    setPendingTemplate(tpl);
  };

  // Step 2 — modal confirmed. Make the page-create API call with
  // the binding payload merged in. On success, navigate to editor.
  const handleCampaignConfirm = async (bindingPayload) => {
    const tpl = pendingTemplate;
    setPendingTemplate(null);
    setCreating(true);
    setCreatingKey(tpl.key);
    try {
      if (tpl.key === 'blank') {
        const res = await apiPost('/api/funnels/save', {
          title: 'Untitled Page', status: 'draft', ...bindingPayload,
        });
        if (res.id) navigate(`/pro/funnel/${res.id}/edit`);
      } else {
        const res = await apiPost('/api/funnels/from-template', {
          niche: tpl.key, ...bindingPayload,
        });
        if (res.id) {
          navigate(`/pro/funnel/${res.id}/edit`);
        } else if (res.edit_url) {
          const parts = res.edit_url.match(/\/(\d+)\//);
          if (parts) navigate(`/pro/funnel/${parts[1]}/edit`);
        }
      }
    } catch (e) {
      alert(`Couldn't create page: ${e.message}`);
    }
    setCreating(false);
    setCreatingKey(null);
  };

  const handleCampaignCancel = () => setPendingTemplate(null);

  // AI generator — preserved from old Funnels.jsx for now. Same
  // flow: open modal, collect niche/audience/story/tone, call
  // /api/funnels/ai-generate, navigate to editor.
  const generateAiFunnel = async () => {
    if (!aiForm.niche.trim()) { alert('Please enter a niche'); return; }
    setAiGenerating(true);
    try {
      const res = await apiPost('/api/funnels/ai-generate', aiForm);
      if (res.id) {
        navigate(`/pro/funnel/${res.id}/edit`);
      } else if (res.error) {
        alert(res.error);
      }
    } catch (e) { alert(e.message); }
    setAiGenerating(false);
  };

  return (
    <AppLayout>
      {/* Breadcrumb back */}
      <div style={{marginBottom:20,fontSize:12}}>
        <Link to="/pro/funnels" style={{color:'#0ea5e9',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4}}>
          <ArrowLeft size={12}/> Back to SuperPages
        </Link>
      </div>

      {/* Page header */}
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:22,fontWeight:800,color:'#0a1438',letterSpacing:'-0.01em'}}>
          Start a new page
        </h1>
        <div style={{marginTop:4,fontSize:13,color:'#64748b'}}>
          Generate one with AI, pick a template, or start from blank.
        </div>
      </div>

      {/* AI hero — cobalt-to-teal gradient, full-width */}
      <div style={{
        background: 'linear-gradient(135deg,#0a1438 0%,#1e3a8a 60%,#0e7490 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 28,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flexWrap: 'wrap',
      }}>
        <div style={{flex:1,minWidth:240}}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 999,
            background: 'rgba(34,211,238,.18)',
            color: '#67e8f9',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.02em',
            marginBottom: 10,
          }}>
            <Sparkles size={12}/> Powered by Grok 4.1
          </div>
          <h2 style={{
            margin: '0 0 6px',
            fontFamily: 'Sora,sans-serif',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}>Build me a page</h2>
          <div style={{fontSize:13,color:'#cbd5e1',lineHeight:1.5}}>
            Tell our AI your niche and audience — get a fully-written
            landing page in under a minute.
          </div>
        </div>
        <button
          onClick={() => setShowAiWizard(true)}
          disabled={creating}
          style={{
            padding: '12px 20px',
            borderRadius: 10,
            border: 'none',
            background: '#22d3ee',
            color: '#0a1438',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Sora,sans-serif',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}>
          Generate with AI <ArrowRight size={14}/>
        </button>
      </div>

      {/* Section header */}
      <h2 style={{margin:'0 0 4px',fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:700,color:'#0a1438'}}>
        Or pick a template
      </h2>
      <div style={{marginBottom:14,fontSize:12,color:'#64748b'}}>
        Nine pre-built starting points for the most common use cases.
      </div>

      {/* 3×3 template grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
      }}>
        {TEMPLATES.map(tpl => {
          const Icon = tpl.icon;
          const isLoading = creating && creatingKey === tpl.key;
          return (
            <div
              key={tpl.key}
              onClick={() => handleTemplateClick(tpl)}
              style={{
                background: '#fff',
                border: '1px solid #e8ecf2',
                borderRadius: 12,
                overflow: 'hidden',
                cursor: creating ? 'wait' : 'pointer',
                opacity: creating && !isLoading ? 0.6 : 1,
                transition: 'transform .15s, box-shadow .15s',
              }}
              onMouseEnter={e => {
                if (creating) return;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(10,20,56,.10)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}>
              <div style={{
                height: 100,
                background: tpl.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}>
                <Icon size={36} strokeWidth={1.8}/>
              </div>
              <div style={{padding:'12px 14px'}}>
                <div style={{fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:700,color:'#0a1438',marginBottom:2}}>
                  {tpl.title}
                  {isLoading && <span style={{marginLeft:6,color:'#0ea5e9',fontWeight:600,fontSize:11}}>building…</span>}
                </div>
                <div style={{fontSize:11,color:'#64748b',lineHeight:1.4}}>{tpl.desc}</div>
              </div>
            </div>
          );
        })}

        {/* Blank Canvas — 9th tile, dashed border, no gradient */}
        <div
          onClick={() => handleTemplateClick(BLANK_CANVAS)}
          style={{
            background: '#fff',
            border: '2px dashed #cbd5e1',
            borderRadius: 12,
            overflow: 'hidden',
            cursor: creating ? 'wait' : 'pointer',
            opacity: creating && creatingKey !== 'blank' ? 0.6 : 1,
            transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={e => {
            if (creating) return;
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#0ea5e9';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}>
          <div style={{
            height: 100,
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
          }}>
            <BLANK_CANVAS.icon size={36} strokeWidth={1.8}/>
          </div>
          <div style={{padding:'12px 14px'}}>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:13,fontWeight:700,color:'#0a1438',marginBottom:2}}>
              {BLANK_CANVAS.title}
              {creating && creatingKey === 'blank' && <span style={{marginLeft:6,color:'#0ea5e9',fontWeight:600,fontSize:11}}>building…</span>}
            </div>
            <div style={{fontSize:11,color:'#64748b',lineHeight:1.4}}>{BLANK_CANVAS.desc}</div>
          </div>
        </div>
      </div>

      {/* Campaign Setup Modal — opens when a tile is clicked */}
      {pendingTemplate && (
        <CampaignSetupModal
          suggestedListName={pendingTemplate.listName}
          pageTypeLabel="page"
          onConfirm={handleCampaignConfirm}
          onCancel={handleCampaignCancel}
        />
      )}

      {/* AI wizard modal — preserved from old Funnels.jsx */}
      {showAiWizard && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10,20,56,.55)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          padding: 16,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 540,
            padding: '24px 28px',
            boxShadow: '0 24px 60px rgba(10,20,56,.35)',
          }}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <Sparkles size={20} color="#22d3ee"/>
              <h2 style={{margin:0,fontFamily:'Sora,sans-serif',fontSize:17,fontWeight:800,color:'#0a1438'}}>
                Generate a page with AI
              </h2>
            </div>
            <p style={{margin:'0 0 18px',fontSize:13,color:'#64748b'}}>
              Tell Grok what your page is about. We'll write the headline,
              copy, and CTA for you.
            </p>

            <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:18}}>
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#0a1438',marginBottom:4,fontFamily:'Sora,sans-serif'}}>
                  Niche / industry
                </label>
                <input
                  type="text"
                  value={aiForm.niche}
                  onChange={e => setAiForm({...aiForm, niche: e.target.value})}
                  placeholder="e.g. fitness coaching, forex trading"
                  style={{width:'100%',padding:'9px 12px',border:'1px solid #cbd5e1',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#0a1438',marginBottom:4,fontFamily:'Sora,sans-serif'}}>
                  Target audience (optional)
                </label>
                <input
                  type="text"
                  value={aiForm.audience}
                  onChange={e => setAiForm({...aiForm, audience: e.target.value})}
                  placeholder="e.g. busy professionals, new traders"
                  style={{width:'100%',padding:'9px 12px',border:'1px solid #cbd5e1',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#0a1438',marginBottom:4,fontFamily:'Sora,sans-serif'}}>
                  Your story / angle (optional)
                </label>
                <textarea
                  value={aiForm.story}
                  onChange={e => setAiForm({...aiForm, story: e.target.value})}
                  placeholder="What makes your offer different?"
                  rows={3}
                  style={{width:'100%',padding:'9px 12px',border:'1px solid #cbd5e1',borderRadius:8,fontSize:13,fontFamily:'inherit',boxSizing:'border-box',resize:'vertical'}}/>
              </div>
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button
                onClick={() => setShowAiWizard(false)}
                disabled={aiGenerating}
                style={{
                  padding:'10px 18px',
                  borderRadius:8,
                  border:'1px solid #cbd5e1',
                  background:'#fff',
                  color:'#475569',
                  fontSize:13,
                  fontWeight:600,
                  cursor:'pointer',
                  fontFamily:'inherit',
                }}>Cancel</button>
              <button
                onClick={generateAiFunnel}
                disabled={aiGenerating || !aiForm.niche.trim()}
                style={{
                  padding:'10px 18px',
                  borderRadius:8,
                  border:'none',
                  background: aiGenerating ? '#cbd5e1' : 'linear-gradient(135deg,#0a1438,#1e3a8a)',
                  color:'#fff',
                  fontSize:13,
                  fontWeight:700,
                  cursor: aiGenerating ? 'wait' : 'pointer',
                  fontFamily:'Sora,sans-serif',
                  display:'flex',
                  alignItems:'center',
                  gap:6,
                }}>
                {aiGenerating ? 'Generating…' : 'Generate page →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
