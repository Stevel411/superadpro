/**
 * LabsPageBuilder.jsx — Experimental page builder sandbox
 * ════════════════════════════════════════════════════════════
 * Lives at /labs/pagebuilder. Admin-only. This is the LAUNCH screen for
 * the Labs builder: it shows the roadmap (so the plan stays in front of
 * us each session) AND a picker so admins can open any of their existing
 * pages in the cloned Labs editor at /labs/pagebuilder/edit/{pageId}.
 *
 * The Labs editor SHARES the same backend (/api/funnels/*) as the live
 * editor for now — Phase 1 explicitly says we're cloning the working
 * builder and improving it incrementally, not building a new datastore.
 * That means edits made in Labs ARE saved to the same FunnelPage rows.
 * Since only admins reach Labs, only Steve's pages can be touched —
 * member pages are not at risk.
 *
 * If we later need true isolation (e.g. so members can A/B between live
 * and Labs versions of the same page), we add a labs_funnel_pages table
 * and a flag — but that's a Phase 3+ concern, not now.
 *
 * Gating: admin check happens here in the component. Non-admins are
 * redirected to the dashboard. Belt-and-braces — they shouldn't be
 * able to navigate here anyway (no public links), but defence-in-depth
 * matters for anything labelled "/labs".
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { Flame, CheckCircle2, Circle, ArrowRight, Beaker, Wrench, LayoutTemplate, Share2, Sparkles, FileText } from 'lucide-react';

// ────────────────────────────────────────────────────────────────
// The roadmap — single source of truth for what we agreed.
// Phase status: 'done' | 'next' | 'planned' | 'later'.
// Update this in-place as phases land so the page is a living
// project tracker rather than a static welcome screen.
// ────────────────────────────────────────────────────────────────
const ROADMAP = [
  {
    phase: 'Phase 0',
    title: 'Sandbox set up',
    status: 'done',
    icon: Beaker,
    summary: "Hidden admin-only route at /labs/pagebuilder.",
    detail: "Roadmap visible. Safe iteration space. Shipped 14 May.",
    sessions: '0.25',
  },
  {
    phase: 'Phase 1',
    title: 'Cloned working builder',
    status: 'done',
    icon: Wrench,
    summary: "Live builder cloned into /labs/pagebuilder/edit/{id}. Same blocks, same UX, separate codebase.",
    detail: "Improvements happen here without risking live pages. Editor chrome shows 🧪 LABS so we can never confuse the two.",
    sessions: '0.5',
  },
  {
    phase: 'Phase 2',
    title: 'Bug fixes + UX polish',
    status: 'next',
    icon: Sparkles,
    summary: "Make it fit for purpose. Iterate on the cloned builder until it's worth paying for.",
    detail: "Drag/resize smoothness, Tiptap edge cases, upload flows, mobile preview accuracy, form submission. Fix what we find as we use it — no upfront audit, real-world iteration.",
    sessions: 'ongoing',
  },
  {
    phase: 'Phase 3',
    title: 'Production-grade templates',
    status: 'planned',
    icon: LayoutTemplate,
    summary: "12-20 templates members can start from. Each one a real designed page, not a wireframe.",
    detail: "Affiliate intro, webinar signup, lead magnet, coming-soon, product launch, course sales, membership pitch, local business, coach/consultant, ecommerce single-product, app waitlist, event registration.",
    sessions: '2-3',
  },
  {
    phase: 'Phase 4',
    title: 'Shareable code system',
    status: 'planned',
    icon: Share2,
    summary: "Members save a page as SAP-XXXX-XXXX. Others paste to clone the whole page into their drafts.",
    detail: 'Encodes element JSON + canvas settings. Optional marketplace of public codes with attribution. Network effect — members exchange high-converting pages.',
    sessions: '1-2',
  },
];

const STATUS_META = {
  done:    { label: 'Done',         color: '#16a34a', bg: '#dcfce7', Icon: CheckCircle2 },
  next:    { label: 'Next up',      color: '#0284c7', bg: '#e0f2fe', Icon: Flame },
  planned: { label: 'Planned',      color: '#7c3aed', bg: '#ede9fe', Icon: Circle },
  later:   { label: 'Later',        color: '#64748b', bg: '#f1f5f9', Icon: Circle },
};

export default function LabsPageBuilder() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState(null);
  const [pagesError, setPagesError] = useState(null);

  // Admin gate — non-admins get bounced to dashboard. We don't show a
  // "permission denied" page because /labs/* shouldn't even appear to
  // non-admins; if they typed the URL directly, just route them away
  // without acknowledging the page exists.
  useEffect(() => {
    if (loading) return;
    if (!user || !user.is_admin) navigate('/dashboard');
  }, [user, loading, navigate]);

  // Once admin confirmed, load the picker. Same /api/funnels endpoint
  // the live editor uses — admins pass is_pro() so this works.
  useEffect(() => {
    if (loading || !user || !user.is_admin) return;
    apiGet('/api/funnels')
      .then(d => setPages(d.funnels || []))
      .catch(e => setPagesError(e.message || 'Failed to load pages'));
  }, [loading, user]);

  if (loading || !user || !user.is_admin) {
    return (
      <AppLayout title="Loading…">
        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Labs — Page Builder v2" subtitle="Experimental sandbox · admin only">
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 24px' }}>
        {/* Header / mission */}
        <div style={{
          background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)',
          borderRadius: 16,
          padding: '32px 28px',
          color: '#fff',
          marginBottom: 32,
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 12px', borderRadius: 99,
            background: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
            <Beaker size={12} /> Labs / Experimental
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px',
            fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}>
            The next-generation Page Builder
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.85, margin: 0, maxWidth: 640 }}>
            Cloned working builder. Iterate here safely. The mission:
            <strong style={{ color: '#fff', opacity: 1 }}> remove every bug, make it
            genuinely fit for purpose, build amazing templates, and ship a share-code
            system so members can exchange pages.</strong>
          </p>
        </div>

        {/* Page picker — open any of your pages in the Labs editor */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a',
          marginBottom: 4, fontFamily: "'Sora', sans-serif" }}>
          Open a page in Labs
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
          Loads in the cloned Labs editor (chrome shows 🧪 LABS). Same data as your live pages —
          edits here ARE saved. Use a test page until we're confident in Labs.
        </p>

        {/* Browse-templates portfolio CTA — read-only preview of all 6
            built-in templates. Doesn't touch any data. */}
        <Link
          to="/labs/pagebuilder/preview-templates"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 20px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(168,85,247,0.06))',
            border: '1px solid rgba(14,165,233,0.25)',
            color: '#0f172a',
            textDecoration: 'none',
            marginBottom: 16,
            transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(14,165,233,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.borderColor = 'rgba(14,165,233,0.25)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            width: 42, height: 42,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0ea5e9, #a855f7)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(14,165,233,0.3)',
          }}>✨</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: '-0.015em',
              marginBottom: 2,
            }}>Browse the template portfolio</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              See all 6 built-in templates rendered at full size · Read-only · Doesn't touch live data
            </div>
          </div>
          <ArrowRight size={18} style={{ color: '#0284c7', flexShrink: 0 }}/>
        </Link>

        <div style={{
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 12, padding: pages && pages.length ? 8 : 24, marginBottom: 32,
        }}>
          {pagesError && (
            <div style={{ color: '#dc2626', fontSize: 13, padding: 16 }}>
              Couldn't load pages: {pagesError}
            </div>
          )}
          {!pagesError && pages === null && (
            <div style={{ color: '#94a3b8', fontSize: 13, padding: 16 }}>Loading your pages…</div>
          )}
          {!pagesError && pages !== null && pages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: 12 }}>
              You don't have any pages yet.{' '}
              <Link to="/pro/funnels" style={{ color: '#0284c7', fontWeight: 600 }}>
                Create one in the live builder →
              </Link>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                Then come back here to open it in the Labs editor.
              </div>
            </div>
          )}
          {pages && pages.length > 0 && pages.map(p => (
            <Link
              key={p.id}
              to={'/labs/pagebuilder/edit/' + p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 8,
                color: '#0f172a', textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: '#e0f2fe', color: '#0284c7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FileText size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  {p.slug ? '/p/' + p.slug : '(no slug)'} · {p.status} · {p.views || 0} views
                </div>
              </div>
              <ArrowRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
            </Link>
          ))}
        </div>

        {/* Roadmap */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a',
          marginBottom: 16, fontFamily: "'Sora', sans-serif" }}>
          Roadmap
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {ROADMAP.map((p) => {
            const meta = STATUS_META[p.status];
            const PhaseIcon = p.icon;
            const StatusIcon = meta.Icon;
            const isNext = p.status === 'next';
            return (
              <div key={p.phase} style={{
                background: '#fff',
                border: '1px solid ' + (isNext ? meta.color : '#e2e8f0'),
                borderRadius: 12,
                padding: 20,
                boxShadow: isNext ? '0 4px 12px rgba(2,132,199,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                position: 'relative',
              }}>
                {/* Status pill */}
                <div style={{ position: 'absolute', top: 16, right: 16,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 99,
                  background: meta.bg, color: meta.color,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                }}>
                  <StatusIcon size={11} /> {meta.label}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingRight: 110 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: meta.bg, color: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <PhaseIcon size={20} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b',
                      letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                      {p.phase} · ~{p.sessions} session{p.sessions === '1' ? '' : 's'}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a',
                      marginBottom: 6, fontFamily: "'Sora', sans-serif" }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 8 }}>
                      {p.summary}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                      {p.detail}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 40 }}>
          <Link to="/pro/funnels" style={linkStyle}>
            View live page builder list <ArrowRight size={14} />
          </Link>
          <Link to="/admin" style={linkStyle}>
            Admin dashboard <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

const linkStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 16px',
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
  color: '#475569', textDecoration: 'none', fontSize: 13, fontWeight: 600,
  transition: 'all 0.15s',
};
