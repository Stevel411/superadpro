/**
 * NewLanding.jsx — 4-door landing page (Phase 1 preview)
 *
 * Preview page at /new/landing. Uses ONLY the platform's existing CSS
 * variables from design-tokens.css — no bespoke colours, no invented
 * tokens. Layout follows the locked mockup: 2×2 door grid + 1×4 stream
 * strip. Responsive pattern mirrors Dashboard: fluid 1fr columns,
 * single 767px breakpoint, drops to 2 or 1 columns on mobile.
 *
 * See docs/redesign/ for the design spec and route audit.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { formatMoney } from '../utils/money';
import AppLayout from '../components/layout/AppLayout';
import { TYPE } from '../styles/typography';
import {
  Gauge, TrendingUp, PenSquare, BookOpen,
  Rocket, Flame, Copy, Check, ArrowRight,
  Users, LayoutGrid, Star, GraduationCap,
} from 'lucide-react';

// ── Door configuration ─────────────────────────────────────
// Each door's icon colour pulls from design-tokens.css — NO hardcoded hex.
const DOORS = [
  {
    id: 'command-centre',
    label: 'Your cockpit',
    title: 'Command Centre',
    desc: "Daily briefing, team pulse, today's play. Your operations room for running the business.",
    count: '9 items',
    colourVar: 'var(--sap-accent)',          // cyan — primary brand accent
    icon: Gauge,
    href: '/dashboard',
  },
  {
    id: 'income',
    label: 'Where you earn',
    title: 'Income',
    desc: 'Earnings, wallet, and the 4 streams that pay you. See where your money comes from.',
    count: '7 items',
    colourVar: 'var(--sap-green)',
    icon: TrendingUp,
    href: '/wallet',
  },
  {
    id: 'tools',
    label: 'Build your business',
    title: 'Tools',
    desc: 'Creative Studio, Lead Finder, funnels, outreach. Everything you need to create and capture.',
    count: '14 tools',
    colourVar: 'var(--sap-violet)',
    icon: PenSquare,
    href: '/marketing-materials',
  },
  {
    id: 'learn',
    label: 'Skill up',
    title: 'Learn',
    desc: 'Fast Start, comp plan, traffic guide, community. Understand how it all works.',
    count: '8 items',
    colourVar: 'var(--sap-amber-dark)',
    icon: BookOpen,
    href: '/training',
  },
];

// ── Stream strip configuration ─────────────────────────────
// Stream cards are white with a left accent bar. Accent colours all
// pull from design tokens.
const STREAMS = [
  { id: 'membership', name: 'Membership',    colourVar: 'var(--sap-accent)',      payModel: '50% recurring', icon: Users },
  { id: 'grid',       name: 'Campaign Grid', colourVar: 'var(--sap-green)',       payModel: '8 tiers',       icon: LayoutGrid },
  { id: 'nexus',      name: 'Credit Nexus',  colourVar: 'var(--sap-violet)',      payModel: '3×3 matrix',    icon: Star },
  { id: 'courses',    name: 'Courses',       colourVar: 'var(--sap-amber-dark)',  payModel: '100% resale',   icon: GraduationCap },
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
    ? `https://www.superadpro.com/ref/${user.username}`
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

  function streamValue(id) {
    if (!dash) return 0;
    if (id === 'membership') return dash.membership_earnings_month || dash.membership_earned || 0;
    if (id === 'grid')       return dash.grid_earnings_month || 0;
    if (id === 'nexus')      return dash.nexus_earnings_month || 0;
    if (id === 'courses')    return dash.courses_earnings_month || 0;
    return 0;
  }

  function streamContext(id) {
    if (!dash) return '';
    if (id === 'membership') return `${dash.personal_referrals || 0} referrals`;
    if (id === 'grid')       return dash.current_tier_name ? `Tier ${dash.current_tier_name}` : 'No tier active';
    if (id === 'nexus')      return dash.nexus_pack_active ? 'Pack active' : 'No pack active';
    if (id === 'courses')    return `${dash.courses_sales_month || 0} sales this month`;
    return '';
  }

  return (
    <AppLayout title="New Landing (Preview)">
      <div style={{ width: '100%' }}>

        {/* ── HERO ────────────────────────────────────────────── */}
        {/* Platform hero pattern: cobalt-to-indigo gradient matching the
            main Dashboard welcome banner. */}
        <section style={{
          background: 'linear-gradient(135deg, var(--sap-cobalt-deep), var(--sap-cobalt-mid), var(--sap-indigo))',
          color: '#fff',
          borderRadius: 18,
          padding: '28px 32px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
          boxShadow: '0 8px 32px rgba(67,56,202,0.35)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800,
              border: '2px solid rgba(255,255,255,0.2)',
            }}>{displayName.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{
                fontSize: 12, fontWeight: 800, letterSpacing: 1.8,
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 4,
              }}>
                {greeting()}
              </div>
              <div style={{
                fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 900,
                color: '#fff', marginBottom: 6, letterSpacing: '-0.3px',
              }}>
                {displayName}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {streakDays > 0 && (
                  <>
                    <span style={{ color: 'var(--sap-amber-bright)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                      <Flame size={12} /> {streakDays} day streak
                    </span>
                    <span style={{ opacity: 0.4 }}>·</span>
                  </>
                )}
                <span style={{ fontWeight: 600 }}>{tierName}</span>
              </div>
            </div>
          </div>
          {referralLink && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(0,0,0,0.25)', borderRadius: 10,
              padding: '10px 14px', maxWidth: 480, minWidth: 280,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
                flexShrink: 0,
              }}>Your link</div>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--sap-accent-light)',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', fontFamily: 'monospace',
              }}>
                www.superadpro.com/ref/{user?.username}
              </div>
              <button onClick={copyRef} style={{
                padding: '7px 14px', borderRadius: 8, border: 'none',
                background: 'var(--sap-accent)', color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                {refCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          )}
        </section>

        {/* ── FAST START PILL ──────────────────────────────── */}
        {showFastStart(dash) && (
          <section style={{
            background: 'linear-gradient(135deg, var(--sap-accent), var(--sap-accent-light))',
            color: '#fff',
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 14, flexWrap: 'wrap',
            boxShadow: '0 4px 14px rgba(14,165,233,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38,
                background: 'rgba(255,255,255,0.22)',
                borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}><Rocket size={18} /></div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  Fast Start · {fastStartProgress(dash)} of 3 done
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
                  {fastStartMessage(dash)}
                </div>
              </div>
            </div>
            <Link to="/training" style={{
              background: '#fff', color: 'var(--sap-accent)',
              padding: '8px 16px', borderRadius: 7,
              fontSize: 13, fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>Continue <ArrowRight size={13} /></Link>
          </section>
        )}

        {/* ── THE 4 DOORS (2×2 → 1 col on mobile) ─────────── */}
        <div
          className="sap-doors-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 14,
            marginBottom: 20,
          }}>
          {DOORS.map((door) => {
            const Icon = door.icon;
            return (
              <Link key={door.id} to={door.href} className="sap-door-card" style={{
                background: 'var(--sap-bg-card)',
                border: '1px solid var(--sap-border)',
                borderRadius: 14,
                padding: '22px 24px',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* 4px top accent bar in the door's brand colour — same pattern as Dashboard stream cards */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                  background: door.colourVar,
                }} />
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: door.colourVar,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <Icon size={22} color="#fff" />
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 800,
                  letterSpacing: 1.4, textTransform: 'uppercase',
                  color: 'var(--sap-text-faint)', marginBottom: 4,
                }}>
                  {door.label}
                </div>
                <h3 style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 22, fontWeight: 800,
                  color: 'var(--sap-text-primary)',
                  margin: '0 0 8px',
                  letterSpacing: '-0.3px',
                }}>{door.title}</h3>
                <p style={{
                  ...TYPE.bodyMuted,
                  margin: '0 0 16px',
                  lineHeight: 1.55,
                }}>{door.desc}</p>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '1px solid var(--sap-border-light)',
                  fontSize: 13, fontWeight: 700,
                }}>
                  <span style={{ color: 'var(--sap-text-faint)' }}>{door.count}</span>
                  <span style={{ color: door.colourVar, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Open <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── STREAM STRIP (1×4 → 2 cols on mobile) ───────── */}
        <div style={{
          fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
          textTransform: 'uppercase', color: 'var(--sap-text-muted)',
          marginBottom: 12,
        }}>
          Your 4 income streams · this month
        </div>
        <div
          className="sap-streams-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
          }}>
          {STREAMS.map((stream) => {
            const Icon = stream.icon;
            return (
              <div key={stream.id} className="sap-stream-card" style={{
                background: 'var(--sap-bg-card)',
                border: '1px solid var(--sap-border)',
                borderRadius: 14,
                padding: 20,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s',
              }}>
                {/* 4px top accent bar — matches Dashboard's stream card pattern */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                  background: stream.colourVar,
                }} />
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 14,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 11,
                    background: stream.colourVar,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} color="#fff" />
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    padding: '3px 9px', borderRadius: 20,
                    letterSpacing: 0.3,
                    background: 'var(--sap-bg-hover)',
                    color: 'var(--sap-text-muted)',
                  }}>{stream.payModel}</span>
                </div>
                <div style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 28, fontWeight: 900,
                  color: stream.colourVar,
                  lineHeight: 1, marginBottom: 6,
                }}>${formatMoney(streamValue(stream.id))}</div>
                <div style={{ ...TYPE.cardTitleBold, marginBottom: 3 }}>
                  {stream.name}
                </div>
                <div style={TYPE.bodyMuted}>
                  {streamContext(stream.id) || '\u00A0'}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── RESPONSIVE ─────────────────────────────────────
            Matches Dashboard's pattern exactly: single 767px breakpoint,
            fluid 1fr columns that stretch to fill available space.
            Desktop: 2×2 doors + 1×4 streams
            Mobile (≤767px): 1-col doors + 2-col streams
        ─────────────────────────────────────────────────── */}
        <style>{`
          .sap-door-card:hover,
          .sap-stream-card:hover {
            box-shadow: 0 6px 20px rgba(0,0,0,0.22), 0 12px 40px rgba(0,0,0,0.16) !important;
            transform: translateY(-2px);
          }
          @media(max-width: 767px) {
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
