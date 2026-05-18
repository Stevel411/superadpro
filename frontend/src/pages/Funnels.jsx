import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Plus, Eye, Pencil, Trash2, Copy, ExternalLink, FileText, Sparkles, Flame, UserPlus, Send, DollarSign, ArrowRight } from 'lucide-react';
import CampaignSetupModal from '../components/CampaignSetupModal';

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
// Hero-scale stat tiles for the "Last 30 days" headline card — one per
// stage of the funnel (visitors → leads → conversions → earned). Big
// dark-navy numbers on white background for max contrast and impact.
// 'dim' fades the value (slate-300) for placeholders waiting on data;
// 'accent' renders the value in cobalt-cyan for the 'earned' metric.
function RoiStat({ value, label, dim = false, accent = false, first = false }) {
  let valueColor = '#0a1438';      // dark navy — primary number colour
  if (dim) valueColor = '#cbd5e1'; // slate-300 — "data coming soon"
  else if (accent) valueColor = '#0ea5e9';
  return (
    <div style={{
      padding: '0 28px',
      textAlign: 'center',
      borderLeft: first ? 'none' : '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 130,
    }}>
      <div style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 36,
        fontWeight: 800,
        color: valueColor,
        lineHeight: 1,
        letterSpacing: '-0.025em',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: '#94a3b8',
        marginTop: 8,
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

// ─── timeAgo ─ compact relative-time formatter for the activity feed ─
// Renders ISO timestamps as "12m ago", "3h ago", "2d ago" etc. Falls
// back to "—" for null/undefined so cards never show "NaN ago".
function timeAgo(iso) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (!then || isNaN(then)) return '—';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 5) return `${wks}w ago`;
  const mths = Math.floor(days / 30);
  return `${mths}mo ago`;
}

// ─── ActivityCard ─ one of the four cards in the Recent Activity feed ──
// Header: icon in accent colour + title + count pill. Body: 0-3 rows
// (passed as children). Footer: optional CTA link. Empty state hides
// the body and shows a muted single-line message instead.
function ActivityCard({ icon: Icon, accentColor, title, count, empty, emptyText, ctaText, ctaUrl, showCta, children }) {
  return (
    <div style={{
      background:'#fff',
      border:'1px solid #e8ecf2',
      borderRadius:10,
      padding:'12px 14px',
      display:'flex',
      flexDirection:'column',
      minHeight:140,
    }}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <div style={{
          width:26,
          height:26,
          borderRadius:7,
          background:`${accentColor}15`,
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          flexShrink:0,
        }}>
          {Icon && <Icon size={14} color={accentColor} strokeWidth={2.2}/>}
        </div>
        <span style={{
          fontFamily:'Sora,sans-serif',
          fontSize:13,
          fontWeight:700,
          color:'var(--sap-text-primary)',
          flex:1,
          letterSpacing:'-0.005em',
        }}>{title}</span>
        {count > 0 && (
          <span style={{
            background:`${accentColor}15`,
            color:accentColor,
            fontSize:11,
            fontWeight:800,
            padding:'2px 8px',
            borderRadius:999,
            fontFamily:'Sora,sans-serif',
          }}>{count}</span>
        )}
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
        {empty ? (
          <div style={{
            fontSize:12,
            color:'var(--sap-text-muted)',
            padding:'8px 0',
            fontStyle:'italic',
          }}>{emptyText}</div>
        ) : children}
      </div>
      {showCta && ctaUrl && (
        <a href={ctaUrl} style={{
          marginTop:10,
          fontSize:12,
          fontWeight:700,
          color:accentColor,
          textDecoration:'none',
          fontFamily:'Sora,sans-serif',
        }}>{ctaText}</a>
      )}
    </div>
  );
}

// ─── ActivityRow ─ one line inside an ActivityCard ──
// Primary text (name or $amount), secondary text (page or sequence),
// right-aligned meta (timeAgo or count). All three truncate to keep
// the row to one line even with long emails or page titles.
function ActivityRow({ primary, primaryAccent, secondary, meta }) {
  return (
    <div style={{
      display:'flex',
      alignItems:'baseline',
      gap:6,
      fontSize:12,
      minWidth:0,
    }}>
      <span style={{
        fontWeight:700,
        color:primaryAccent || 'var(--sap-text-primary)',
        whiteSpace:'nowrap',
        overflow:'hidden',
        textOverflow:'ellipsis',
        maxWidth:'40%',
      }}>{primary}</span>
      <span style={{
        color:'var(--sap-text-muted)',
        flex:1,
        whiteSpace:'nowrap',
        overflow:'hidden',
        textOverflow:'ellipsis',
        fontSize:11,
      }}>{secondary}</span>
      <span style={{
        color:'var(--sap-text-muted)',
        fontSize:10,
        fontFamily:"'JetBrains Mono', monospace",
        whiteSpace:'nowrap',
        flexShrink:0,
      }}>{meta}</span>
    </div>
  );
}

export default function Funnels() {
  const { t } = useTranslation();
  const [pages, setPages] = useState([]);
  // 30-day rollup for the ROI strip — populated alongside `pages` from
  // /api/funnels. Stays null until the first load resolves so the strip
  // can render a skeleton until real numbers arrive.
  const [rollup30d, setRollup30d] = useState(null);
  // Surface API errors to the user rather than swallowing them in a
  // silent catch. Renders a red banner at the top of the page when
  // /api/funnels fails. 18 May 2026.
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingKey, setCreatingKey] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  // Phase 2 (18 May 2026): templates + AI wizard moved to
  // /pro/funnels/new. showAiWizard, showMoreTemplates, aiForm,
  // aiGenerating state removed — they belong on the create page.
  // Commit C — Activity feed payload from /api/funnels/activity.
  // Stays null until first load resolves so the section can render
  // a skeleton row until real data lands. Loaded in parallel with the
  // main /api/funnels call but stored separately so a failure on one
  // doesn't blank the other.
  const [activity, setActivity] = useState(null);
  const [activityError, setActivityError] = useState(null);
  const navigate = useNavigate();

  const load = () => apiGet('/api/funnels').then(d => {
    setPages(d.funnels || d.pages || []);
    setRollup30d(d.rollup_30d || null);
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

  // Activity feed loads in parallel with the main pages call. Errors
  // surface to a per-section banner rather than blocking the page —
  // someone on a slow connection should still see their pages even if
  // the activity endpoint stalls.
  const loadActivity = () => apiGet('/api/funnels/activity').then(d => {
    setActivity(d || null);
  }).catch((err) => {
    console.error('Activity API load failed:', err);
    setActivityError(err.message || 'Failed to load activity feed.');
  });

  // Phase 1.5 — editing campaign wiring on an EXISTING page. Holds
  // the FunnelPage object (with default_list_id, capture_sequence_id,
  // and current names from /api/funnels). Modal opens in edit mode.
  const [editingWiring, setEditingWiring] = useState(null);

  useEffect(() => { load(); loadActivity(); }, []);

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

  if (loading) return <AppLayout title={t('superPages.title')}><div style={{display:'flex',justifyContent:'center',padding:80}}><div style={{width:40,height:40,border:'3px solid #e5e7eb',borderTopColor:'var(--sap-accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div></AppLayout>;

  return (
    <AppLayout>
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

      {/* Next-action banner — promoted from the activity section to
          the top of the page. Always renders once activity loads;
          shows a contextual prompt or "steady state" fallback. While
          loading, a skeleton placeholder of the same height holds the
          slot so the page doesn't jump. */}
      {activity?.next_action ? (
        <a
          href={activity.next_action.cta_url}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderRadius: 12,
            background: 'linear-gradient(135deg,#0a1438 0%,#1e3a8a 100%)',
            color: '#fff',
            textDecoration: 'none',
            marginBottom: 20,
            boxShadow: '0 4px 12px rgba(10,20,56,.15)',
          }}>
          <span style={{fontSize:22,lineHeight:1}}>{activity.next_action.emoji}</span>
          <span style={{flex:1,fontFamily:'Sora,sans-serif',fontSize:14,fontWeight:700,letterSpacing:'-0.01em'}}>
            {activity.next_action.label}
          </span>
          <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'#22d3ee',fontFamily:'Sora,sans-serif',whiteSpace:'nowrap'}}>
            {activity.next_action.cta_label}
          </span>
        </a>
      ) : (
        <div style={{height:52,background:'linear-gradient(135deg,#0a1438 0%,#1e3a8a 100%)',borderRadius:12,marginBottom:20,opacity:0.6}}/>
      )}

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


      {/* ── ROI strip ─ Last 30 days at a glance ──
          Mid-scale stat card balancing readability with proportion.
          Header is one centred line: cyan timeframe pill + Sora
          subtitle showing the page count. Stats cluster centred
          below. Conversions + earnings show '—' (in slate-300)
          until Commit B lands the lead-attribution layer. */}
      {pages.length > 0 && rollup30d && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '18px 24px',
          marginBottom: 24,
          maxWidth: 760,
          marginLeft: 'auto',
          marginRight: 'auto',
          boxShadow: '0 4px 12px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#0ea5e9',
              fontFamily: "'JetBrains Mono', monospace",
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(14,165,233,.10)',
              border: '1px solid rgba(14,165,233,.20)',
              whiteSpace: 'nowrap',
            }}>
              Last 30 days
            </span>
            <span style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#0a1438',
              fontFamily: "'Sora', sans-serif",
              letterSpacing: '-0.01em',
            }}>
              Performance across {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
            flexWrap: 'wrap',
            gap: 0,
          }} className="roi-stats-grid">
            <RoiStat value={rollup30d.visitors} label="visitors" first />
            <RoiStat value={rollup30d.leads} label="leads" />
            <RoiStat
              value={rollup30d.conversions === null ? '—' : rollup30d.conversions}
              label="conversions"
              dim={rollup30d.conversions === null}
            />
            <RoiStat
              value={rollup30d.earnings === null ? '—' : `$${rollup30d.earnings}`}
              label="earned"
              dim={rollup30d.earnings === null}
              accent
            />
          </div>
          <style>{`
            @media (max-width: 720px) {
              .roi-stats-grid { gap: 16px 0 !important; }
            }
          `}</style>
        </div>
      )}

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


      {/* ── Activity Feed ─ Commit C ──────────────────────────────
          Now sits ABOVE the My Pages grid (Steve, 18 May 2026) —
          puts the populated 4-card row at eye level instead of
          hiding under sparse page tiles. Always renders (even for
          users with zero pages) so the contextual next-action pill
          can prompt them. Four data cards in a responsive grid:

            🔥 Hot leads   👋 New 24h   📧 Seq. complete   💰 Recent comm.

          Data comes from /api/funnels/activity (Commit C backend). */}
      <div style={{marginTop:32}}>
        <h2 style={{margin:'0 0 12px',fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:800,color:'var(--sap-text-primary)'}}>Recent activity</h2>

        {/* Activity-load error banner — separate from the main load
            error so a failure here doesn't blank the rest of the page. */}
        {activityError && (
          <div style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#9a3412',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: 12,
            fontWeight: 600,
          }}>
            Activity feed unavailable: {activityError}
          </div>
        )}

        {/* Next-action pill promoted to top of page (above header) —
            see Phase 2 dashboard refactor. */}

        {/* Skeleton row while activity loads (preserves layout
            height so the page doesn't jump). */}
        {!activity && !activityError && (
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',
            gap:12,
          }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                background:'#f8fafc',
                border:'1px solid #e2e8f0',
                borderRadius:10,
                height:140,
              }}/>
            ))}
          </div>
        )}

        {/* Four data cards. Render after activity payload arrives. */}
        {activity && (
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',
            gap:12,
            alignItems:'stretch',
          }}>
            {/* 🔥 HOT LEADS */}
            <ActivityCard
              icon={Flame}
              accentColor="#dc2626"
              title="Hot leads"
              count={activity.hot_leads.length}
              empty={activity.hot_leads.length === 0}
              emptyText="No hot leads right now"
              ctaText="Call them →"
              ctaUrl="/pro/leads"
              showCta={activity.hot_leads.length > 0}>
              {activity.hot_leads.slice(0,3).map(l => (
                <ActivityRow
                  key={l.id}
                  primary={l.name}
                  secondary={l.source_funnel_title}
                  meta={timeAgo(l.last_engagement_at)}
                />
              ))}
            </ActivityCard>

            {/* 👋 NEW 24H */}
            <ActivityCard
              icon={UserPlus}
              accentColor="#10b981"
              title="New leads · 24h"
              count={activity.new_24h_count}
              empty={activity.new_24h_count === 0}
              emptyText="No new leads in 24h"
              ctaText="View all →"
              ctaUrl="/pro/leads"
              showCta={activity.new_24h_count > 0}>
              {activity.new_24h.slice(0,3).map(l => (
                <ActivityRow
                  key={l.id}
                  primary={l.name}
                  secondary={l.source_funnel_title}
                  meta={timeAgo(l.created_at)}
                />
              ))}
            </ActivityCard>

            {/* 📧 SEQUENCE COMPLETE */}
            <ActivityCard
              icon={Send}
              accentColor="#8b5cf6"
              title="Sequence done"
              count={activity.sequence_complete_count}
              empty={activity.sequence_complete_count === 0}
              emptyText="No sequence-complete leads"
              ctaText="Send broadcast →"
              ctaUrl="/pro/leads?tab=broadcast"
              showCta={activity.sequence_complete_count > 0}>
              {activity.sequence_complete.slice(0,3).map(l => (
                <ActivityRow
                  key={l.id}
                  primary={l.name}
                  secondary={l.sequence_title}
                  meta={`${l.emails_sent} emails`}
                />
              ))}
            </ActivityCard>

            {/* 💰 RECENT COMMISSIONS */}
            <ActivityCard
              icon={DollarSign}
              accentColor="#0ea5e9"
              title="Recent earnings"
              count={activity.recent_commissions.length}
              empty={activity.recent_commissions.length === 0}
              emptyText="No commissions yet"
              ctaText="See all →"
              ctaUrl="/pro/analytics"
              showCta={activity.recent_commissions.length > 0}>
              {activity.recent_commissions.slice(0,3).map((c, i) => (
                <ActivityRow
                  key={i}
                  primary={`$${c.amount_usdt.toFixed(2)}`}
                  primaryAccent="#0ea5e9"
                  secondary={`${c.type_label} · @${c.from_username}`}
                  meta={timeAgo(c.paid_at)}
                />
              ))}
            </ActivityCard>
          </div>
        )}
      </div>

      {/* Your Pages section (preserved from original) */}
      {pages.length > 0 && (
        <div id="your-pages" style={{marginTop:32}}>
          {/* Three small PUBLISHED/LEADS/VIEWS stat cards were removed
              18 May 2026 — they duplicated the data now in the ROI strip
              at the top of the page. Steve flagged the redundancy. */}

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
        .tpl-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(15,23,42,.06),0 2px 8px rgba(15,23,42,.03)!important;border-color:#cbd5e1!important}
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
    </AppLayout>
  );
}
