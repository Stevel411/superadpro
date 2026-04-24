/**
 * NewLanding.jsx — 4-door landing page (Phase 1 prototype)
 *
 * Test page at /new/landing. Renders the 4-door navigation model inside
 * the existing AppLayout (sidebar + topbar). No member-facing navigation
 * points here yet; this route exists for design review only.
 *
 * See docs/redesign/ for the full design spec and route audit.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { formatMoney } from '../utils/money';
import AppLayout from '../components/layout/AppLayout';
import { TYPE } from '../styles/typography';
import {
  Gauge, TrendingUp, Wrench, BookOpen,
  Rocket, Flame, Copy, Check, ArrowRight,
  Users, LayoutGrid, Star, GraduationCap,
} from 'lucide-react';

// ── Door configuration ─────────────────────────────────────
// Each door = one section of the platform. Colour is fixed per the design
// spec (see SuperAdPro-4-Door-Redesign-Spec.docx §3).
const DOORS = [
  {
    id: 'command-centre',
    label: 'Your cockpit',
    title: 'Command Centre',
    desc: "Daily briefing, team pulse, today's play. Your operations room for running the business.",
    count: '9 items',
    colour: '#0ea5e9',        // sap-accent (matches platform primary CTA)
    colourDark: '#172554',
    icon: Gauge,
    href: '/dashboard',        // temporary — points to current dashboard
  },
  {
    id: 'income',
    label: 'Where you earn',
    title: 'Income',
    desc: 'Earnings, wallet, and the 4 streams that pay you. See where your money comes from.',
    count: '7 items',
    colour: '#16a34a',        // green
    colourDark: '#15803d',
    icon: TrendingUp,
    href: '/wallet',           // temporary
  },
  {
    id: 'tools',
    label: 'Build your business',
    title: 'Tools',
    desc: 'Creative Studio, Lead Finder, funnels, outreach. Everything you need to create and capture.',
    count: '14 tools',
    colour: '#7c3aed',        // purple
    colourDark: '#6d28d9',
    icon: Wrench,
    href: '/marketing-materials', // temporary
  },
  {
    id: 'learn',
    label: 'Skill up',
    title: 'Learn',
    desc: 'Fast Start, comp plan, traffic guide, community. Understand how it all works.',
    count: '8 items',
    colour: '#d97706',        // amber
    colourDark: '#b45309',
    icon: BookOpen,
    href: '/training',         // temporary
  },
];

// ── Stream configuration — for the bottom strip ────────────
const STREAMS = [
  { id: 'membership',  name: 'Membership',    colour: '#2755d6', light: '#93c5fd', payModel: '50% recurring', icon: Users },
  { id: 'grid',        name: 'Campaign Grid', colour: '#16a34a', light: '#86efac', payModel: '8 tiers',       icon: LayoutGrid },
  { id: 'nexus',       name: 'Credit Nexus',  colour: '#7c3aed', light: '#c4b5fd', payModel: '3×3 matrix',    icon: Star },
  { id: 'courses',     name: 'Courses',       colour: '#d97706', light: '#fdba74', payModel: '100% resale',   icon: GraduationCap },
];

export default function NewLanding() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [refCopied, setRefCopied] = useState(false);

  // Fetch dashboard data to populate hero + stream strip with real numbers.
  // Uses the existing /api/dashboard endpoint — no new backend work needed.
  useEffect(() => {
    let cancelled = false;
    apiGet('/api/dashboard')
      .then((data) => { if (!cancelled) setDash(data); })
      .catch(() => { /* non-fatal; page still renders with placeholder zeros */ });
    return () => { cancelled = true; };
  }, []);

  // Referral link — use the same shape as Dashboard.jsx for consistency.
  const referralLink = user && user.username
    ? `${window.location.origin}/join/${user.username}`
    : '';

  function copyRef() {
    if (!referralLink) return;
    try {
      navigator.clipboard.writeText(referralLink);
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    } catch (e) { /* clipboard API unavailable — ignore */ }
  }

  // Streak count (fallback 0) + display name.
  const streakDays = (dash && dash.streak_days) || 0;
  const displayName = (user && (user.display_name || user.username)) || 'there';
  const tierName = (user && user.tier_name) || 'Free';

  // Placeholder stream values — Phase 1 uses whatever is in /api/dashboard.
  // Later phases will wire each stream to its dedicated endpoint.
  function streamValue(id) {
    if (!dash) return 0;
    if (id === 'membership') return dash.membership_earnings_month || 0;
    if (id === 'grid')       return dash.grid_earnings_month || 0;
    if (id === 'nexus')      return dash.nexus_earnings_month || 0;
    if (id === 'courses')    return dash.courses_earnings_month || 0;
    return 0;
  }

  return (
    <AppLayout title="New Landing (Preview)">
      {/* Fluid container — fills available width. No max-width so the page
          adapts to any viewport. 8px inner breathing room matches the
          rest of the platform. */}
      <div style={{ width: '100%' }}>

        {/* ── HERO ──────────────────────────────────────────── */}
        {/* Gradient matches the platform Topbar (#172554 → #1e3a8a) so the
            hero reads as a continuation of the chrome, not a foreign element. */}
        <section style={{
          background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)',
          color: '#fff',
          borderRadius: 14,
          padding: '22px 28px',
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 600,
            }}>{displayName.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{
                fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 500,
                letterSpacing: '-0.3px',
              }}>
                {greeting()}, {displayName}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                {streakDays > 0 && (
                  <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Flame size={12} /> {streakDays} day streak
                  </span>
                )}
                {streakDays > 0 && <span>·</span>}
                <span>{tierName}</span>
              </div>
            </div>
          </div>
          {referralLink && (
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 9,
              padding: '9px 11px 9px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div>
                <span style={{
                  display: 'block',
                  fontSize: 10, color: 'rgba(255,255,255,0.7)',
                  letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500,
                }}>Your referral link</span>
                <span style={{
                  fontSize: 14, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500,
                }}>{referralLink.replace(/^https?:\/\//, '')}</span>
              </div>
              <button onClick={copyRef} style={{
                background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
                color: '#fff', border: 'none',
                padding: '8px 14px', borderRadius: 6,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
              }}>
                {refCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          )}
        </section>

        {/* ── FAST START PILL ──────────────────────────────── */}
        {/* Auto-hides when member has worked through the Fast Start guide.
            Uses the platform's accent-cyan gradient so it reads as a
            "primary action" moment, consistent with other CTAs on the site. */}
        {showFastStart(dash) && (
          <section style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
            color: '#fff',
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 14, flexWrap: 'wrap',
            boxShadow: '0 4px 14px rgba(14,165,233,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36,
                background: 'rgba(255,255,255,0.22)',
                borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}><Rocket size={17} /></div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Fast Start · {fastStartProgress(dash)} of 3 done
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
                  {fastStartMessage(dash)}
                </div>
              </div>
            </div>
            <Link to="/training" style={{
              background: '#fff', color: '#0ea5e9',
              padding: '8px 16px', borderRadius: 7,
              fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>Continue <ArrowRight size={13} /></Link>
          </section>
        )}

        {/* ── THE 4 DOORS ──────────────────────────────────── */}
        {/* 4 columns on desktop, collapses to 2 on tablet, 1 on mobile.
            Cards stretch with viewport because of the 1fr columns. */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
          className="sap-doors-grid">
          {DOORS.map((door) => {
            const Icon = door.icon;
            return (
              <Link key={door.id} to={door.href} style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '20px 22px',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                transition: 'border-color 0.15s ease, transform 0.15s ease',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 10,
                  background: door.colour,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 13,
                }}>
                  <Icon size={22} color="#fff" />
                </div>
                <div style={{ ...TYPE.labelSmall, color: '#94a3b8', marginBottom: 3 }}>
                  {door.label}
                </div>
                <h3 style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 22, fontWeight: 500,
                  color: '#0f172a',
                  margin: '0 0 6px',
                  letterSpacing: '-0.3px',
                }}>{door.title}</h3>
                <p style={{
                  fontSize: 13, color: '#64748b',
                  margin: '0 0 14px', lineHeight: 1.55,
                }}>{door.desc}</p>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                  borderTop: '1px solid #f1f5f9',
                  fontSize: 13, fontWeight: 500,
                }}>
                  <span style={{ color: '#94a3b8' }}>{door.count}</span>
                  <span style={{ color: door.colour, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Open <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── STREAM STRIP ──────────────────────────────────── */}
        <div style={{ ...TYPE.labelSmall, color: '#94a3b8', marginBottom: 11 }}>
          Your 4 income streams · this month
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
          className="sap-streams-grid">
          {STREAMS.map((stream) => {
            const Icon = stream.icon;
            return (
              <div key={stream.id} style={{
                background: 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)',
                color: '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Left accent bar — per design spec: stream colour appears ONLY
                    as the accent bar on stream cards, never as the full fill */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0,
                  width: 5, background: stream.light,
                }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Icon size={14} style={{ color: stream.light }} />
                  <span style={{
                    fontSize: 9, color: 'rgba(255,255,255,0.75)',
                    letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 500,
                  }}>{stream.payModel}</span>
                </div>
                <div style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 24, fontWeight: 500,
                  letterSpacing: '-0.5px', lineHeight: 1.05, marginBottom: 2,
                }}>{formatMoney(streamValue(stream.id))}</div>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 1 }}>
                  {stream.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Responsive breakpoints — 4 columns on desktop, 2 on tablet, 1 on mobile.
            Using inline <style> so the rules ship with the component and don't
            depend on any parent CSS file. Scoped via the .sap-doors-grid and
            .sap-streams-grid class names. */}
        <style>{`
          @media (max-width: 1024px) {
            .sap-doors-grid { grid-template-columns: repeat(2, 1fr) !important; }
            .sap-streams-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 560px) {
            .sap-doors-grid { grid-template-columns: 1fr !important; }
            .sap-streams-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
        `}</style>

      </div>
    </AppLayout>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function fastStartProgress(dash) {
  if (!dash) return 0;
  return dash.fast_start_progress || 0;
}

function showFastStart(dash) {
  // Show the pill until all 3 steps are complete.
  // If no data loaded yet, show it (new members need to see it immediately).
  if (!dash) return true;
  return fastStartProgress(dash) < 3;
}

function fastStartMessage(dash) {
  const p = fastStartProgress(dash);
  if (p === 0) return 'Start with a quick platform tour, grab your link, and see the income opportunities.';
  if (p === 1) return "Two more steps — your referral link and a look at what's possible.";
  if (p === 2) return "One more step — see the income opportunities on the platform.";
  return 'All done — keep earning!';
}
