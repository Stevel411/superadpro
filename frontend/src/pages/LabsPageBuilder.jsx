/**
 * LabsPageBuilder.jsx — Experimental page builder sandbox
 * ════════════════════════════════════════════════════════════
 * Lives at /labs/pagebuilder. Admin-only. This is where we iterate
 * on the next-generation SuperPages experience without affecting
 * the live editor at /funnels/visual/{id}.
 *
 * Set up 14 May 2026 as a shell. The roadmap below is the actual
 * plan agreed with Steve in that session. Phase 1 work begins in
 * the next session — until then this page just shows the plan so
 * we can pick up cleanly.
 *
 * Gating: admin check happens here in the component. Non-admins are
 * redirected to the dashboard. Belt-and-braces — they shouldn't be
 * able to navigate here anyway (no public links), but defence-in-depth
 * matters for anything labelled "/labs".
 */
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { Flame, CheckCircle2, Circle, ArrowRight, Beaker, Wrench, LayoutTemplate, Share2, Sparkles } from 'lucide-react';

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
    summary: "Hidden admin-only route at /labs/pagebuilder. Safe iteration space.",
    detail: "This page. Stand-up so we can pick up cleanly next session without re-discussing scope.",
    sessions: '0.25',
  },
  {
    phase: 'Phase 1',
    title: 'Solidify the existing builder',
    status: 'next',
    icon: Wrench,
    summary: "Audit every code path. Fix every bug. Smooth every rough edge.",
    detail: "Drag/resize behaviour, Tiptap inline editing, element insertion, image/video/audio uploads, lead capture forms, A/B testing logic, mobile rendering. No new features — just make what's there genuinely robust.",
    sessions: '3-4',
  },
  {
    phase: 'Phase 2',
    title: 'Template library',
    status: 'planned',
    icon: LayoutTemplate,
    summary: "12-20 production-grade templates members can start from.",
    detail: "Affiliate intro, webinar signup, lead magnet, coming-soon, product launch, course sales, membership pitch, local business, coach/consultant, ecommerce single-product, app waitlist, event registration. Each one a real designed page — not a wireframe.",
    sessions: '2-3',
  },
  {
    phase: 'Phase 3',
    title: 'Shareable code system',
    status: 'planned',
    icon: Share2,
    summary: "Members can save a page as a short code, paste it to clone the whole page.",
    detail: 'Like Carrd "Use this site" or Framer templates. Code format: SAP-XXXX-XXXX. Encodes the element JSON + canvas settings. Optional marketplace of public codes with attribution.',
    sessions: '1-2',
  },
  {
    phase: 'Phase 4',
    title: 'Polish + advanced features',
    status: 'later',
    icon: Sparkles,
    summary: "Undo history visualisation, multi-page funnels, A/B testing UI, custom CSS per element.",
    detail: "None of these are launch blockers — they're upgrades that come after the foundation is solid and the templates are landing well.",
    sessions: 'TBD',
  },
];

const STATUS_META = {
  done:    { label: 'Done',         color: '#16a34a', bg: '#dcfce7', Icon: CheckCircle2 },
  next:    { label: 'Next session', color: '#0284c7', bg: '#e0f2fe', Icon: Flame },
  planned: { label: 'Planned',      color: '#7c3aed', bg: '#ede9fe', Icon: Circle },
  later:   { label: 'Later',        color: '#64748b', bg: '#f1f5f9', Icon: Circle },
};

export default function LabsPageBuilder() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Admin gate — non-admins get bounced to dashboard. We don't show a
  // "permission denied" page because /labs/* shouldn't even appear to
  // non-admins; if they typed the URL directly, just route them away
  // without acknowledging the page exists.
  useEffect(() => {
    if (loading) return;
    if (!user || !user.is_admin) navigate('/dashboard');
  }, [user, loading, navigate]);

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
            This is the sandbox. We iterate here, safely, without touching the live editor
            members use today. When a phase is ready, we promote it. The mission:
            <strong style={{ color: '#fff', opacity: 1 }}> a stand-out page builder
            with great templates, drag-and-drop creative freedom, and a shareable code
            system so members can pass work to each other.</strong>
          </p>
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

        {/* What this sandbox will become */}
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1',
          borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#475569',
            margin: '0 0 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            When you come back to this page next session
          </h3>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            This shell will be replaced with a working clone of the existing
            page builder, ready to modify safely. Every change you and Claude
            make here is invisible to members until we explicitly promote it.
            The live builder at <code style={{ background: '#fff', padding: '2px 6px',
            borderRadius: 4, fontSize: 12 }}>/funnels/visual/&#123;id&#125;</code>
            keeps working unaffected throughout.
          </p>
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 40 }}>
          <Link to="/funnels" style={linkStyle}>
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
