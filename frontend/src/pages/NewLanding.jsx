/**
 * NewLanding.jsx — 4-door landing page (Phase 1 prototype)
 *
 * Test page at /new/landing. Rebuilt 24 Apr 2026 to match the locked
 * design mockup at docs/redesign/superadpro-platform-mockup.html exactly.
 *
 * Layout:
 *   - Cobalt hero (full width)
 *   - Fast Start pill (full width, cobalt→purple gradient)
 *   - 2×2 grid of door cards (big, white, one per section)
 *   - 1×4 stream strip (small cobalt cards, one per income stream)
 *
 * Palette follows the redesign spec, not the current platform tokens.
 * The hero is meant to feel distinct from the darker sidebar — they
 * form a cobalt L-shape with two tones (spec §3).
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { formatMoney } from '../utils/money';
import AppLayout from '../components/layout/AppLayout';
import {
  Gauge, TrendingUp, PenSquare, BookOpen,
  Rocket, Flame, Copy, Check, ArrowRight,
  Users, LayoutGrid, Star, GraduationCap,
} from 'lucide-react';

// ── Door configuration (spec §3) ───────────────────────────
// Each door has a distinct brand colour used ONLY on the icon square
// and the "Open →" text. Card body stays white with slate borders.
const DOORS = [
  {
    id: 'command-centre',
    label: 'Your cockpit',
    title: 'Command Centre',
    desc: "Daily briefing, team pulse, today's play. Your operations room for running the business.",
    count: '9 items',
    colour: '#2755d6',   // cobalt (brand primary for the redesign)
    icon: Gauge,
    href: '/dashboard',   // temporary — real destination in Phase 2
  },
  {
    id: 'income',
    label: 'Where you earn',
    title: 'Income',
    desc: 'Earnings, wallet, and the 4 streams that pay you. See where your money comes from.',
    count: '7 items',
    colour: '#16a34a',   // green
    icon: TrendingUp,
    href: '/wallet',
  },
  {
    id: 'tools',
    label: 'Build your business',
    title: 'Tools',
    desc: 'Creative Studio, Lead Finder, funnels, outreach. Everything you need to create and capture.',
    count: '14 tools',
    colour: '#7c3aed',   // purple
    icon: PenSquare,
    href: '/marketing-materials',
  },
  {
    id: 'learn',
    label: 'Skill up',
    title: 'Learn',
    desc: 'Fast Start, comp plan, traffic guide, community. Understand how it all works.',
    count: '8 items',
    colour: '#d97706',   // amber
    icon: BookOpen,
    href: '/training',
  },
];

// ── Stream strip (spec §3) ─────────────────────────────────
// Cards are solid cobalt with a stream-coloured left accent bar + dot.
// The brand-coloured accent is the ONLY place the stream colour appears
// in the strip (spec rule: cobalt is chrome, stream colours are accents).
const STREAMS = [
  { id: 'membership', name: 'Membership',    accent: '#93c5fd', payModel: '50% recurring', icon: Users },
  { id: 'grid',       name: 'Campaign Grid', accent: '#86efac', payModel: '8 tiers',       icon: LayoutGrid },
  { id: 'nexus',      name: 'Credit Nexus',  accent: '#c4b5fd', payModel: '3×3 matrix',    icon: Star },
  { id: 'courses',    name: 'Courses',       accent: '#fdba74', payModel: '100% resale',   icon: GraduationCap },
];

export default function NewLanding() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [refCopied, setRefCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/dashboard')
      .then((data) => { if (!cancelled) setDash(data); })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, []);

  const referralLink = user && user.username
    ? `${window.location.origin}/join/${user.username}`
    : '';

  function copyRef() {
    if (!referralLink) return;
    try {
      navigator.clipboard.writeText(referralLink);
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    } catch (e) { /* ignore */ }
  }

  const streakDays = (dash && dash.streak_days) || 0;
  const displayName = (user && (user.display_name || user.username)) || 'there';
  const tierName = (user && user.tier_name) || 'Free';

  // Pull per-stream values from /api/dashboard. These fields don't all
  // exist yet — will be wired up as part of Phase 1. Missing values
  // render as $0.00 which is correct for new members.
  function streamValue(id) {
    if (!dash) return 0;
    if (id === 'membership') return dash.membership_earnings_month || 0;
    if (id === 'grid')       return dash.grid_earnings_month || 0;
    if (id === 'nexus')      return dash.nexus_earnings_month || 0;
    if (id === 'courses')    return dash.courses_earnings_month || 0;
    return 0;
  }

  // Context line shown beneath each stream's amount. Temporary placeholders
  // while the real per-stream endpoints are being built.
  function streamContext(id) {
    if (!dash) return '';
    if (id === 'membership') return `${dash.active_referrals || 0} active referrals`;
    if (id === 'grid')       return dash.current_tier_name ? `Tier ${dash.current_tier_name}` : 'No tier active';
    if (id === 'nexus')      return dash.nexus_pack_active ? 'Pack active' : 'No pack';
    if (id === 'courses')    return `${dash.courses_sales_month || 0} sales this month`;
    return '';
  }

  return (
    <AppLayout title="New Landing (Preview)">
      <div style={{ width: '100%' }}>

        {/* ── HERO ────────────────────────────────────────────── */}
        {/* Mockup spec: gradient #1e3a8a → #2755d6, padding 22/28,
            border-radius 14, margin-bottom 20. NOT the platform Topbar
            gradient — the hero is intentionally a lighter cobalt so the
            chrome and hero read as two tones of one system. */}
        <section style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2755d6 100%)',
          color: '#fff',
          borderRadius: 14,
          padding: '22px 28px',
          marginBottom: 20,
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
              fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 500,
            }}>{displayName.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{
                fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 500,
                letterSpacing: '-0.3px',
              }}>
                {greeting()}, {displayName}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {streakDays > 0 && (
                  <>
                    <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Flame size={12} /> {streakDays} day streak
                    </span>
                    <span style={{ opacity: 0.5 }}>·</span>
                  </>
                )}
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
        {/* Mockup spec: gradient cobalt → purple, communicates "onboarding
            moment" — visually distinct from the hero. Auto-hides when all
            three tabs are complete. */}
        {showFastStart(dash) && (
          <section style={{
            background: 'linear-gradient(135deg, #2755d6 0%, #7c3aed 100%)',
            color: '#fff',
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 14, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}><Rocket size={17} /></div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  Fast Start · {fastStartProgress(dash)} of 3 done
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
                  {fastStartMessage(dash)}
                </div>
              </div>
            </div>
            <Link to="/training" style={{
              background: '#fff', color: '#1e3a8a',
              padding: '8px 16px', borderRadius: 7,
              fontSize: 13, fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>Continue <ArrowRight size={13} /></Link>
          </section>
        )}

        {/* ── THE 4 DOORS (2×2) ─────────────────────────────── */}
        {/* Mockup spec: grid-template-columns: 1fr 1fr → 2×2.
            Cards are white (#fff) with slate-200 border. */}
        <div
          className="sap-new-doors-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
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
                <div style={{
                  fontSize: 10, fontWeight: 500,
                  letterSpacing: 1.3, textTransform: 'uppercase',
                  color: '#94a3b8', marginBottom: 3,
                }}>
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

        {/* ── STREAM STRIP (1×4) ────────────────────────────── */}
        {/* Mockup spec: grid-template-columns: repeat(4, 1fr).
            Cards are solid #2755d6 cobalt, 5px stream-coloured left
            accent bar, small dot + pay-model label + big $ + name + context. */}
        <div style={{
          fontSize: 11, letterSpacing: 1.3, color: '#94a3b8',
          textTransform: 'uppercase', fontWeight: 500, marginBottom: 11,
        }}>
          Your 4 income streams · this month
        </div>
        <div
          className="sap-new-streams-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}>
          {STREAMS.map((stream) => (
            <div key={stream.id} style={{
              background: '#2755d6',
              color: '#fff',
              borderRadius: 12,
              padding: '16px 18px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* 5px left accent bar in the stream's brand colour */}
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: 5, background: stream.accent,
              }} />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 8,
              }}>
                {/* Dot matches the accent bar */}
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: stream.accent,
                }} />
                <span style={{
                  fontSize: 9, color: 'rgba(255,255,255,0.75)',
                  letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 500,
                }}>{stream.payModel}</span>
              </div>
              <div style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 26, fontWeight: 500,
                letterSpacing: '-0.5px', lineHeight: 1.05, marginBottom: 3,
              }}>{formatMoney(streamValue(stream.id))}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                {stream.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                {streamContext(stream.id) || '\u00A0'}
              </div>
            </div>
          ))}
        </div>

        {/* Responsive: tablet drops streams to 2 cols; phone drops
            doors and streams to 1 col each. */}
        <style>{`
          @media (max-width: 900px) {
            .sap-new-streams-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 560px) {
            .sap-new-doors-grid { grid-template-columns: 1fr !important; }
            .sap-new-streams-grid { grid-template-columns: 1fr !important; }
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
