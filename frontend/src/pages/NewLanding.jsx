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
    colour: '#2755d6',        // cobalt
    colourDark: '#1e3a8a',
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
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── HERO ──────────────────────────────────────────── */}
        <section style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2755d6 100%)',
          color: '#fff',
          borderRadius: 14,
          padding: '22px 28px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: '#93c5fd', color: '#1e3a8a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 500,
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
                background: '#fff', color: '#1e3a8a', border: 'none',
                padding: '8px 14px', borderRadius: 6,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                {refCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          )}
        </section>

        {/* ── FAST START PILL ──────────────────────────────── */}
        {/* Auto-hides when member has worked through the Fast Start guide.
            Progress comes from /api/dashboard.fast_start_progress (0-3).
            Falls back to showing the pill if data isn't loaded yet. */}
        {showFastStart(dash) && (
          <section style={{
            background: 'linear-gradient(135deg, #2755d6 0%, #7c3aed 100%)',
            color: '#fff',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 14, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}><Rocket size={16} /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  Fast Start · {fastStartProgress(dash)} of 3 done
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
                  {fastStartMessage(dash)}
                </div>
              </div>
            </div>
            <Link to="/training" style={{
              background: '#fff', color: '#1e3a8a',
              padding: '7px 14px', borderRadius: 6,
              fontSize: 12, fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>Continue <ArrowRight size={12} /></Link>
          </section>
        )}

        {/* ── THE 4 DOORS ──────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}>
          {STREAMS.map((stream) => {
            const Icon = stream.icon;
            return (
              <div key={stream.id} style={{
                background: '#2755d6',
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

        {/* Debug footer — helps you see what data the page received, useful for
            the early preview period. Remove before final cutover. */}
        <div style={{
          fontSize: 11, color: '#94a3b8', textAlign: 'center',
          padding: '16px 0', borderTop: '1px dashed #e2e8f0',
        }}>
          Preview page · {dash ? 'data loaded' : 'loading…'} · user: {user ? user.username : 'anonymous'}
        </div>

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
