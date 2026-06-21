import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Plus, Eye, Pencil, Trash2, Copy, ExternalLink, FileText, ArrowRight, Send, Share2, X, Check } from 'lucide-react';
import CampaignSetupModal from '../components/CampaignSetupModal';
import FeatureOnExploreButton from '../components/FeatureOnExploreButton';
import exportHTML from './labs-superpages/exportHTML';
import PagePreview from '../components/PagePreview';


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

export default function Funnels() {
  const { t } = useTranslation();
  const [pages, setPages] = useState([]);
  // Real page thumbnails: build each page's exported HTML once (cheap string
  // build), memoised on the page list. PagePreview then lazily mounts the
  // iframe only for cards scrolled into view, so the dashboard stays fast.
  const previews = useMemo(() => {
    const m = {};
    for (const p of (pages || [])) {
      try {
        if (!p.gjs_css) continue;
        const parsed = JSON.parse(p.gjs_css);
        const els = Array.isArray(parsed) ? parsed : (parsed.els || []);
        if (els.length) m[p.id] = exportHTML(els, parsed.canvasBg || '#ffffff', parsed.canvasBgImage || '');
      } catch { /* malformed gjs_css → no preview, falls back to empty state */ }
    }
    return m;
  }, [pages]);
  // Surface API errors to the user rather than swallowing them in a
  // silent catch. Renders a red banner at the top of the page when
  // /api/funnels fails. 18 May 2026.
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingKey, setCreatingKey] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  // 26 May 2026 — page redesigned as a pure page-gateway. Analytics
  // (ROI strip, activity feed, next-action banner) all removed.
  // Members have dedicated analytics surfaces elsewhere; this page
  // exists to store and access pages, not to be yet another dashboard.
  const navigate = useNavigate();

  const load = () => apiGet('/api/funnels').then(d => {
    setPages(d.funnels || d.pages || []);
    setLoading(false);
  }).catch((err) => {
    // Surface API failure rather than swallowing it — silent catch was
    // hiding a 500 from the backend when the attribution migration
    // hadn't run, leaving the user with a blank page and no signal
    // anything was wrong. Now we log and show a banner so the failure
    // is visible (and Steve can flag it without it being hidden under
    // an empty UI). 18 May 2026.
    console.error('Funnels API load failed:', err);
    setLoadError(err.message || 'Failed to load your pages. Please try again.');
    setLoading(false);
  });

  // Phase 1.5 — editing campaign wiring on an EXISTING page. Holds
  // the FunnelPage object (with default_list_id, capture_sequence_id,
  // and current names from /api/funnels). Modal opens in edit mode.
  const [editingWiring, setEditingWiring] = useState(null);

  // Share Code system (19 May 2026) — when a user clicks the Share
  // button on a page card we POST to /api/share-codes/generate and
  // show the returned SAP-XXXX-XXXX code in a modal with copy button.
  // shareModal holds {page, code, loading, error, copied} or null.
  const [shareModal, setShareModal] = useState(null);

  // Import-code modal — opened by the "Import code" button in the
  // header. Holds {value, loading, error, success} where success is
  // the import response payload (page_id, edit_url, ref_rewrites,
  // warnings) when import succeeds. The success state replaces the
  // input form so users get clear feedback before navigating away.
  const [importModal, setImportModal] = useState(null);

  useEffect(() => { load(); }, []);

  // Phase 1.5 — user confirmed edit-wiring modal. Updates an existing
  // page's binding via POST /api/funnels/{id}/wiring. On success we
  // update the local page object in-place so the card re-renders with
  // the new binding immediately (no full reload).
  const handleWiringConfirm = async (bindingPayload) => {
    const page = editingWiring;
    setEditingWiring(null);
    if (!page) return;
    try {
      const res = await apiPost(`/api/funnels/${page.id}/wiring`, bindingPayload);
      if (res?.success) {
        setPages(prev => prev.map(p => p.id === page.id ? {
          ...p,
          default_list_id: res.default_list_id,
          default_list_name: res.default_list_name,
          capture_sequence_id: res.capture_sequence_id,
          capture_sequence_title: res.capture_sequence_title,
          capture_sequence_num_emails: res.capture_sequence_num_emails,
        } : p));
      }
    } catch (e) {
      alert(`Couldn't update wiring: ${e.message || e}`);
    }
  };

  const handleWiringCancel = () => {
    setEditingWiring(null);
  };

  // Open the share modal for a page and immediately fire the generate
  // request. We show the modal in a loading state, then drop the code
  // in once the API returns. If generation fails, the modal stays open
  // with an error message and a Close button — no silent swallows.
  const openShareModal = async (page) => {
    setShareModal({ page, code: null, loading: true, error: null, copied: false });
    try {
      const res = await apiPost('/api/share-codes/generate', { page_id: page.id });
      if (res?.code) {
        setShareModal({ page, code: res.code, loading: false, error: null, copied: false });
      } else {
        setShareModal({ page, code: null, loading: false, error: res?.error || 'Could not generate share code', copied: false });
      }
    } catch (e) {
      setShareModal({ page, code: null, loading: false, error: e.message || String(e), copied: false });
    }
  };

  const copyShareCode = async () => {
    if (!shareModal?.code) return;
    try {
      await navigator.clipboard.writeText(shareModal.code);
      setShareModal(m => m ? { ...m, copied: true } : m);
      setTimeout(() => setShareModal(m => m ? { ...m, copied: false } : m), 2000);
    } catch (e) {
      // Clipboard API can fail on insecure contexts — fall back to a
      // visible prompt so the user can still grab the code manually.
      alert(`Copy failed. Code: ${shareModal.code}`);
    }
  };

  // Submit the import-code form. Accepts the code in any reasonable
  // shape (with/without dashes, with/without SAP- prefix) — the
  // backend normalises so we only need to send the raw value. On
  // success we swap the modal to the success state showing the
  // rewrite count and any warnings.
  const handleImportSubmit = async () => {
    const code = (importModal?.value || '').trim();
    if (!code) {
      setImportModal(m => m ? { ...m, error: 'Paste a code first.' } : m);
      return;
    }
    setImportModal(m => m ? { ...m, loading: true, error: null } : m);
    try {
      const res = await apiPost('/api/share-codes/import', { code });
      if (res?.success && res.page_id) {
        setImportModal({
          value: code,
          loading: false,
          error: null,
          success: {
            page_id: res.page_id,
            edit_url: res.edit_url,
            ref_rewrites: res.ref_rewrites || 0,
            warnings: res.warnings || [],
          },
        });
        // Refresh the page list in the background so the new draft
        // shows up immediately when the user closes the modal.
        load();
      } else {
        setImportModal(m => m ? { ...m, loading: false, error: res?.error || 'Import failed.' } : m);
      }
    } catch (e) {
      setImportModal(m => m ? { ...m, loading: false, error: e.message || String(e) } : m);
    }
  };

  const deletePage = async (id) => {
    try { await apiPost(`/api/funnels/delete/${id}`, {}); setPages(p => p.filter(x => x.id !== id)); setConfirmDelete(null); }
    catch (e) { alert(e.message); }
  };

  const duplicatePage = async (id) => {
    try { const res = await apiPost(`/api/funnels/duplicate/${id}`, {}); if (res.id) window.location.href = `/pro/funnel/${res.id}/edit`; else load(); }
    catch (e) { alert(e.message); }
  };

  // generateAiFunnel removed in Phase 2 dashboard split — moved to
  // FunnelsNew.jsx where the AI wizard now lives.

  // Removed totalViews/totalLeads/published computations on 18 May 2026 —
  // they fed the three small stat cards above 'Your Pages' which we deleted
  // (they duplicated the ROI strip data at the top of the page).

  if (loading) return <AppLayout categoryBack={{ to: '/toolkit', label: 'Tool Kit' }} title={t('superPages.title')}><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;

  return (
    <AppLayout categoryBack={{ to: '/toolkit', label: 'Tool Kit' }}>
      {/* Error banner — visible when /api/funnels fails so the user
          isn't left looking at an empty page wondering what's wrong.
          Replaces the previous silent .catch() pattern. */}
      {loadError && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 13,
          fontWeight: 600,
        }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <span style={{ flex: 1 }}>{loadError}</span>
          <button
            onClick={() => { setLoadError(null); setLoading(true); load(); }}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #991b1b',
              background: '#fff',
              color: '#991b1b',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Phase 2 (Dashboard split, 18 May 2026) ──
          The dashboard now opens with the cobalt next-action banner.
          Templates moved to /pro/funnels/new. AI hero moved with them.
          Banner at top anchors the dark colour at the page header
          rather than breaking the visual flow mid-page. */}


      {/* Header — title + subtitle + New page button */}
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
            <p style={{margin:'4px 0 0',fontSize:12,color:'var(--sap-text-muted)'}}>Your campaign pages, lists, and earnings — at a glance.</p>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <a
            href="/help/custom-domain"
            style={{
              background: '#fff',
              color: 'var(--sap-text-primary)',
              border: '1.5px solid #cbd5e1',
              padding: '9px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Sora,sans-serif',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="6-step guide to connect your own domain (e.g. pages.yourbrand.com)">
            <ExternalLink size={14}/> Custom domain setup
          </a>
          <button
            onClick={() => setImportModal({ value: '', loading: false, error: null, success: null })}
            style={{
              background: '#fff',
              color: 'var(--sap-text-primary)',
              border: '1.5px solid #cbd5e1',
              padding: '9px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Sora,sans-serif',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}>
            <Share2 size={14}/> Import code
          </button>
          <a
            href="/pro/funnels/new"
            style={{
              background: 'linear-gradient(135deg,#0a1438,#1e3a8a)',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Sora,sans-serif',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(10,20,56,.18)',
            }}>
            <Plus size={14}/> New page
          </a>
        </div>
      </div>



      {/* Templates moved to /pro/funnels/new — see "+ New page" button above */}

      {/* Empty state — shown when user has zero pages. Replaces the
          template grid that used to greet new users at the top of
          the dashboard. */}
      {!loading && pages.length === 0 && !loadError && (
        <div style={{
          background:'#fff',
          border:'1.5px dashed #cbd5e1',
          borderRadius:14,
          padding:'40px 24px',
          textAlign:'center',
          marginBottom:24,
        }}>
          <div style={{
            width:56,
            height:56,
            borderRadius:14,
            background:'linear-gradient(135deg,#0a1438,#1e3a8a)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            margin:'0 auto 14px',
          }}>
            <Plus size={24} color="#fff" strokeWidth={2}/>
          </div>
          <h3 style={{margin:'0 0 6px',fontFamily:'Sora,sans-serif',fontSize:18,fontWeight:700,color:'#0a1438'}}>
            Build your first SuperPage
          </h3>
          <p style={{margin:'0 0 16px',fontSize:13,color:'#64748b',maxWidth:380,marginLeft:'auto',marginRight:'auto'}}>
            Pick a template, generate one with AI, or start from blank.
            Leads land in your CRM automatically.
          </p>
          <a
            href="/pro/funnels/new"
            style={{
              display:'inline-flex',
              alignItems:'center',
              gap:6,
              padding:'10px 20px',
              borderRadius:10,
              background:'linear-gradient(135deg,#0a1438,#1e3a8a)',
              color:'#fff',
              fontSize:13,
              fontWeight:700,
              fontFamily:'Sora,sans-serif',
              textDecoration:'none',
              boxShadow:'0 4px 12px rgba(10,20,56,.18)',
            }}>
            Get started <ArrowRight size={14}/>
          </a>
        </div>
      )}



      {/* Your Pages section (preserved from original) */}
      {pages.length > 0 && (
        <div id="your-pages" style={{marginTop:32}}>
          {/* Three small PUBLISHED/LEADS/VIEWS stat cards were removed
              18 May 2026 — they duplicated the data now in the ROI strip
              at the top of the page. Steve flagged the redundancy. */}

          <h2 style={{margin:'0 0 12px',fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'var(--sap-text-primary)'}}>{t('superPages.yourPages')}</h2>

          <div className="sp-pages-grid">
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
              const previewHtml = previews[p.id] || '';

              return (
              <div
                key={p.id}
                className="page-card"
                style={{
                  background: '#fff',
                  border: '1px solid #eef1f5',
                  borderRadius: 14,
                  overflow: 'hidden',
                  // Two-layer cobalt-tinted shadow lifts the card
                  // off the page background without screaming for
                  // attention. The page-card:hover rule (in the
                  // style block at the bottom of this file) deepens
                  // the shadow and adds a 1px upward translate so
                  // the card feels live without becoming distracting.
                  boxShadow: '0 2px 4px rgba(10,20,56,.05), 0 1px 2px rgba(10,20,56,.06)',
                  transition: 'transform .15s, box-shadow .15s, border-color .15s',
                }}>
                {/* ── Real page thumbnail (3 Jun 2026) — replaces the cobalt
                    title-band. Renders the actual page scaled down via
                    PagePreview; status becomes a pill on the thumbnail; the
                    title + slug move into the body below. Empty/blank pages
                    show a clean "No preview yet" state. */}
                <div style={{ position:'relative', borderBottom:'1px solid #eef2f8' }}>
                  <div style={{
                    position:'absolute', top:10, left:10, zIndex:2,
                    display:'inline-flex', alignItems:'center', gap:6,
                    fontFamily:'DM Sans,sans-serif', fontSize:10.5, fontWeight:700,
                    padding:'4px 9px', borderRadius:999,
                    background:'rgba(255,255,255,.92)', boxShadow:'0 2px 8px rgba(10,20,56,.18)',
                    color: p.status==='published' ? '#047857' : '#64748b',
                  }}>
                    <span style={{width:7,height:7,borderRadius:'50%',background:p.status==='published'?'#10b981':'#94a3b8'}}/>
                    {p.status==='published' ? 'Published' : 'Draft'}
                  </div>
                  {p.is_ai_generated && <span style={{
                    position:'absolute', top:10, right:10, zIndex:2,
                    fontSize:10, fontWeight:800, color:'#0a1438',
                    background:'rgba(255,255,255,.92)', padding:'3px 8px',
                    borderRadius:5, letterSpacing:'.4px', boxShadow:'0 2px 8px rgba(10,20,56,.18)',
                  }}>AI</span>}
                  {previewHtml ? (
                    <PagePreview html={previewHtml} height={170}/>
                  ) : (
                    <div style={{ height:170, background:'#f8fafc', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:7, color:'#94a3b8' }}>
                      <FileText size={30} strokeWidth={1.5}/>
                      <span style={{fontSize:11.5,fontWeight:600,fontFamily:'DM Sans,sans-serif'}}>No preview yet</span>
                    </div>
                  )}
                </div>
                {/* Title + slug — moved below the thumbnail */}
                <div style={{ padding:'14px 18px 0' }}>
                  <div style={{
                    fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:800, color:'#0a1438',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', letterSpacing:'-0.01em',
                  }}>{p.title||t('superPages.untitled')}</div>
                  {p.slug && <div style={{
                    fontSize:11.5, color:'#8aa0c4', fontFamily:'JetBrains Mono,monospace', marginTop:3,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>/{p.slug}</div>}
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
                      {/* Primary actions group — Edit + View share the remaining
                          flex space equally so cards with View AND cards without
                          View both have a Edit button of the same visual weight.
                          Previously Edit was flex:1 and View was content-width,
                          so cards without View had a wide Edit and cards with
                          View had a narrow Edit — inconsistent across the gallery.
                          (20 May 2026 — Steve called out the inconsistency.) */}
                      <div style={{display:'flex',gap:8,flex:1,minWidth:0}}>
                        <a href={`/pro/funnel/${p.id}/edit`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px 14px',borderRadius:8,fontSize:14,fontWeight:700,textDecoration:'none',background:'var(--sap-accent)',color:'#fff'}}><Pencil size={14}/> {t('superPages.editBtn2')}</a>
                        {p.status === 'published' && p.slug && (<a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px 14px',borderRadius:8,fontSize:14,fontWeight:700,textDecoration:'none',background:'var(--sap-bg-input)',color:'var(--sap-text-primary)',border:'1px solid #e8ecf2'}}><ExternalLink size={14}/> {t('superPages.viewBtn2')}</a>)}
                      </div>
                      {/* Secondary actions group — utility icons (duplicate, share,
                          delete) cluster together on the right, visually separate
                          from the primary actions. Fixed width per icon so they
                          line up consistently across all cards regardless of
                          primary-action width.

                          25 May 2026: 'Feature on /explore' moved here from the
                          editor topbar (Steve flag — editor topbar was overcrowded).
                          Only shows for published pages, since unpublished pages
                          can't be featured. Placed first in the secondary group
                          because of the four utility actions it's the most
                          discoverable/positive — duplicate/share/delete are
                          maintenance, featuring is a growth action.

                          26 May 2026: icon buttons sized up from 32px to 38px
                          to match the larger primary buttons (Steve, F redesign). */}
                      <div style={{display:'flex',gap:6,flexShrink:0,alignItems:'center'}}>
                        {p.status === 'published' && (
                          <FeatureOnExploreButton
                            artifactType="landing-page"
                            artifactId={parseInt(p.id, 10)}
                            artifactTitle={p.title || ''}
                            variant="icon"
                          />
                        )}
                        <button onClick={() => duplicatePage(p.id)} title={t('superPages.duplicateTooltip')} style={{width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',padding:0,borderRadius:8,border:'1px solid #e8ecf2',background:'var(--sap-bg-input)',cursor:'pointer'}}><Copy size={16} color="var(--sap-text-muted)"/></button>
                        <button onClick={() => openShareModal(p)} title="Generate share code" style={{width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',padding:0,borderRadius:8,border:'1px solid #bae6fd',background:'#f0f9ff',cursor:'pointer'}}><Share2 size={16} color="#0284c7"/></button>
                        <button onClick={() => setConfirmDelete(p.id)} title={t('superPages.deleteTooltip')} style={{width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',padding:0,borderRadius:8,border:'1px solid #fecaca',background:'var(--sap-red-bg)',cursor:'pointer'}}><Trash2 size={16} color="var(--sap-red)"/></button>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Phase 1.5: campaign wiring footer ──
                    Shows current list + sequence binding on each card.
                    Clickable — opens the CampaignSetupModal in edit
                    mode pre-filled with the page's current bindings.
                    Distinct background tint so it reads as metadata,
                    not a primary action. */}
                <div
                  onClick={() => setEditingWiring(p)}
                  title="Edit campaign wiring"
                  style={{
                    padding:'8px 14px 10px',
                    borderTop:'1px dashed #e8ecf2',
                    background:'#f8fafc',
                    cursor:'pointer',
                    display:'flex',
                    alignItems:'center',
                    gap:6,
                    fontSize:11,
                    color:'var(--sap-text-muted)',
                    fontFamily:'Sora,sans-serif',
                    fontWeight:600,
                  }}>
                  <Send size={10} color="#0ea5e9" strokeWidth={2.2}/>
                  <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {p.default_list_name ? (
                      <>→ <span style={{color:'#0a1438'}}>{p.default_list_name}</span></>
                    ) : (
                      <span style={{color:'#dc2626'}}>⚠ No list bound</span>
                    )}
                    {p.capture_sequence_title && (
                      <> · <span style={{color:'#0a1438'}}>{p.capture_sequence_title}</span>{p.capture_sequence_num_emails ? ` (${p.capture_sequence_num_emails})` : ''}</>
                    )}
                  </span>
                  <span style={{color:'var(--sap-accent)',fontWeight:700}}>Edit →</span>
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
        /* My Pages grid — capped at 3 per row so each card has room
           for the 6 action buttons (Edit + View + Feature + Copy +
           Share + Trash) without cramping. 25 May 2026 (Steve flag):
           previously repeat(auto-fill,minmax(280px,1fr)) which gave
           4+ columns on wide screens and squashed View into icon-only.
           Breakpoints sit slightly above the template grid because
           page cards have more vertical content (stats + actions +
           wiring footer) and benefit from extra width per column. */
        .sp-pages-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        @media(max-width:1100px){.sp-pages-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:700px){.sp-pages-grid{grid-template-columns:1fr}}
        .tpl-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(15,23,42,.06),0 2px 8px rgba(15,23,42,.03)!important;border-color:#cbd5e1!important}
        .page-card:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(10,20,56,.08),0 2px 4px rgba(10,20,56,.06)!important;border-color:#dbe1eb!important}
        .tpl-card:active{transform:scale(.99)!important}
      `}</style>

      {/* AI wizard modal + create-mode CampaignSetupModal moved
          to /pro/funnels/new as part of Phase 2 dashboard split. */}

      {/* ── Edit Campaign Wiring Modal (Phase 1.5) ──
          Shown when user clicks the wiring footer on a My Pages card.
          Same modal in edit-mode — pre-filled with the page's current
          binding state. Confirm hits POST /api/funnels/{id}/wiring. */}
      {editingWiring && (
        <CampaignSetupModal
          suggestedListName={`${editingWiring.title || 'Untitled'} leads`}
          pageTypeLabel="page"
          editMode={true}
          editingPageTitle={editingWiring.title || 'Untitled page'}
          initialListId={editingWiring.default_list_id || null}
          initialSequenceId={editingWiring.capture_sequence_id || null}
          onConfirm={handleWiringConfirm}
          onCancel={handleWiringCancel}
        />
      )}

      {/* ── Share Code modal ──
          Renders when shareModal is non-null. Three visual states:
          loading (spinner-ish dots), success (code + copy button),
          error (red message + close). The Close button always works
          regardless of state — no way to trap the user inside. */}
      {shareModal && (
        <div
          onClick={() => setShareModal(null)}
          style={{
            position:'fixed', inset:0, background:'rgba(10,20,56,.55)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:1000, padding:20,
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background:'#fff', borderRadius:12, padding:'24px 24px 20px',
              maxWidth:440, width:'100%',
              boxShadow:'0 20px 50px rgba(10,20,56,.25)',
              fontFamily:'DM Sans, sans-serif',
            }}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
              <div style={{
                width:36, height:36, borderRadius:8, background:'#f0f9ff',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Share2 size={18} color="#0284c7" />
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Sora, sans-serif',fontWeight:700,fontSize:16,color:'#0a1438'}}>
                  Share this page
                </div>
                <div style={{fontSize:12,color:'#64748b',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {shareModal.page?.title || 'Untitled page'}
                </div>
              </div>
              <button
                onClick={() => setShareModal(null)}
                style={{
                  background:'none', border:'none', cursor:'pointer',
                  padding:6, borderRadius:6, color:'#94a3b8',
                }}>
                <X size={18} />
              </button>
            </div>

            <div style={{fontSize:13,color:'#475569',lineHeight:1.5,marginBottom:16}}>
              Anyone with this code can paste it into their account to clone this page into their drafts. Lists, sequences, and stats stay with you — they wire their own campaign on import.
            </div>

            {shareModal.loading && (
              <div style={{
                background:'#f8fafc', borderRadius:8, padding:'18px 16px',
                textAlign:'center', color:'#64748b', fontSize:13,
              }}>
                Generating code…
              </div>
            )}

            {shareModal.error && (
              <div style={{
                background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8,
                padding:'12px 14px', color:'#b91c1c', fontSize:13, lineHeight:1.4,
              }}>
                {shareModal.error}
              </div>
            )}

            {shareModal.code && (
              <>
                <div style={{
                  background:'linear-gradient(135deg, #f0f9ff 0%, #ecfeff 100%)',
                  border:'1px solid #bae6fd', borderRadius:10,
                  padding:'18px 16px', textAlign:'center', marginBottom:12,
                }}>
                  <div style={{
                    fontFamily:'JetBrains Mono, ui-monospace, monospace',
                    fontSize:22, fontWeight:700, color:'#0a1438',
                    letterSpacing:1.5,
                  }}>
                    {shareModal.code}
                  </div>
                </div>
                <button
                  onClick={copyShareCode}
                  style={{
                    width:'100%', padding:'11px 16px', borderRadius:8,
                    border:'none', cursor:'pointer',
                    background: shareModal.copied ? '#16a34a' : '#0ea5e9',
                    color:'#fff', fontWeight:700, fontSize:14,
                    fontFamily:'Sora, sans-serif',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    transition:'background .2s',
                  }}>
                  {shareModal.copied ? <><Check size={16}/> Copied</> : <><Copy size={16}/> Copy code</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Import Code modal ──
          Opens from the "Import code" button in the header. Two
          stages: input form (paste code + Import button) and success
          state (rewrite count, warnings, "Open page" link). Errors
          render inline above the input. Close button always works. */}
      {importModal && (
        <div
          onClick={() => setImportModal(null)}
          style={{
            position:'fixed', inset:0, background:'rgba(10,20,56,.55)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:1000, padding:20,
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background:'#fff', borderRadius:12, padding:'24px 24px 20px',
              maxWidth:460, width:'100%',
              boxShadow:'0 20px 50px rgba(10,20,56,.25)',
              fontFamily:'DM Sans, sans-serif',
            }}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
              <div style={{
                width:36, height:36, borderRadius:8, background:'#f0f9ff',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Share2 size={18} color="#0284c7" />
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Sora, sans-serif',fontWeight:700,fontSize:16,color:'#0a1438'}}>
                  {importModal.success ? 'Page imported' : 'Import a page'}
                </div>
                <div style={{fontSize:12,color:'#64748b',marginTop:2}}>
                  {importModal.success
                    ? 'Saved to your drafts. Review before publishing.'
                    : 'Paste a SAP code to clone the page into your drafts.'}
                </div>
              </div>
              <button
                onClick={() => setImportModal(null)}
                style={{background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:6, color:'#94a3b8'}}>
                <X size={18} />
              </button>
            </div>

            {!importModal.success && (
              <>
                {importModal.error && (
                  <div style={{
                    background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8,
                    padding:'10px 12px', color:'#b91c1c', fontSize:13, lineHeight:1.4,
                    marginTop:12, marginBottom:4,
                  }}>
                    {importModal.error}
                  </div>
                )}
                <input
                  type="text"
                  autoFocus
                  placeholder="SAP-XXXX-XXXX"
                  value={importModal.value}
                  onChange={(e) => setImportModal(m => m ? { ...m, value: e.target.value, error: null } : m)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !importModal.loading) handleImportSubmit(); }}
                  disabled={importModal.loading}
                  style={{
                    width:'100%', boxSizing:'border-box',
                    padding:'13px 14px', marginTop:12,
                    borderRadius:8, border:'1.5px solid #cbd5e1',
                    fontFamily:'JetBrains Mono, ui-monospace, monospace',
                    fontSize:16, fontWeight:600, letterSpacing:1,
                    color:'#0a1438', textAlign:'center',
                    textTransform:'uppercase',
                  }}
                />
                <button
                  onClick={handleImportSubmit}
                  disabled={importModal.loading || !importModal.value.trim()}
                  style={{
                    width:'100%', padding:'11px 16px', borderRadius:8,
                    border:'none', cursor: importModal.loading || !importModal.value.trim() ? 'not-allowed' : 'pointer',
                    background: importModal.loading || !importModal.value.trim() ? '#cbd5e1' : '#0ea5e9',
                    color:'#fff', fontWeight:700, fontSize:14,
                    fontFamily:'Sora, sans-serif', marginTop:12,
                  }}>
                  {importModal.loading ? 'Importing…' : 'Import page'}
                </button>
              </>
            )}

            {importModal.success && (
              <>
                <div style={{
                  background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10,
                  padding:'14px 16px', marginTop:12,
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <Check size={16} color="#16a34a"/>
                    <div style={{fontWeight:700,fontSize:14,color:'#0a1438'}}>Clone created as draft</div>
                  </div>
                  {importModal.success.ref_rewrites > 0 && (
                    <div style={{fontSize:13,color:'#475569',lineHeight:1.5}}>
                      Rewrote {importModal.success.ref_rewrites} referral link{importModal.success.ref_rewrites === 1 ? '' : 's'} to your username automatically.
                    </div>
                  )}
                  {importModal.success.ref_rewrites === 0 && (
                    <div style={{fontSize:13,color:'#475569',lineHeight:1.5}}>
                      No referral links found to rewrite.
                    </div>
                  )}
                </div>

                {importModal.success.warnings && importModal.success.warnings.length > 0 && (
                  <div style={{
                    background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10,
                    padding:'12px 14px', marginTop:10,
                  }}>
                    {importModal.success.warnings.map((w, i) => (
                      <div key={i} style={{fontSize:13,color:'#92400e',lineHeight:1.5}}>{w}</div>
                    ))}
                  </div>
                )}

                <a
                  href={importModal.success.edit_url}
                  style={{
                    display:'block', textAlign:'center',
                    width:'100%', boxSizing:'border-box',
                    padding:'11px 16px', borderRadius:8,
                    background:'#0ea5e9', color:'#fff',
                    fontWeight:700, fontSize:14, fontFamily:'Sora, sans-serif',
                    textDecoration:'none', marginTop:12,
                  }}>
                  Open page editor →
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
