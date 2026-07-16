import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import {
  Briefcase, Gauge, Users, Target, Layers, Zap, LayoutGrid, LineChart, Rocket,
} from 'lucide-react';

// ── Business Hub ────────────────────────────────────────────────────
// One front door for the member's business surfaces — the earning side
// of the platform. Mirrors the My Marketing hub exactly (same card grid,
// same cobalt hero, same family tab-strip). Every card points at an
// existing live page; the hub just gathers them so members hold a single
// mental model: "My Business" = where I track performance, manage my
// team, and run the Profit Grid.
//
// Landing is ProtectedRoute-only (no tier gate) so every member sees the
// full surface. The four tier-gated destinations (Profit Grid, Creator
// Credits, Analytics, Grid Calculator) enforce their own RequireTier gate
// on arrival, exactly as they do from the sidebar — the hub never hides
// them, matching the "tools first, see everything" posture.
//
// Launchpad intro (12 Jun 2026, Steve): for FREE users (!user.is_active)
// this page leads with a "start here" Launchpad banner and dims the cards
// with an "unlocks after Launchpad" treatment — My Business is the earning
// side, so it's the natural home to introduce the $10 on-ramp. Active
// members never see any of it; they get the normal hub. Replaces the old
// free-user Launchpad card on the dashboard, keeping the dashboard clean.
// /business-hub?launchpad=preview forces the free-user view for review.

export default function BusinessHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isActive = !!(user && user.is_active);
  // Preview override: /business-hub?launchpad=preview lets an admin/active
  // account see the free-user Launchpad view for review. Real users never
  // carry the param, so normal gating (free-only) holds.
  const lpPreview = (function () { try { return new URLSearchParams(window.location.search).get('launchpad') === 'preview'; } catch (e) { return false; } })();
  const showLaunchpad = !isActive || lpPreview;

  const [lpLoading, setLpLoading] = useState(false);
  const [lpError, setLpError] = useState('');
  async function getLaunchpad() {
    if (lpLoading) return;
    setLpError('');
    setLpLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout/launchpad', { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(function () { return {}; });
      if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setLpLoading(false);
      setLpError(data.detail || data.error || 'Could not start Launchpad checkout. Please try again.');
    } catch (e) {
      setLpLoading(false);
      setLpError('Connection error. Please try again.');
    }
  }

  function go(path) {
    return function () { navigate(path); };
  }

  const sections = [
    {
      heading: t('businessHub.sectionTrack', { defaultValue: 'Track & manage' }),
      cards: [
        { key: 'performance', icon: Gauge, grad: 'linear-gradient(135deg,#1e3a8a,#0ea5e9)',
          title: t('businessHub.performance', { defaultValue: 'Performance' }),
          desc: t('businessHub.performanceDesc', { defaultValue: 'Your snapshot, directs, structures and month-on-month earnings.' }),
          onClick: go('/command-centre') },
        { key: 'team', icon: Users, grad: 'linear-gradient(135deg,#0891b2,#22d3ee)',
          title: t('businessHub.team', { defaultValue: 'Team' }),
          desc: t('businessHub.teamDesc', { defaultValue: 'Your downline, direct referrals and commission breakdown.' }),
          onClick: go('/my-team') },
        { key: 'fullanalytics', icon: LineChart, grad: 'linear-gradient(135deg,#1e3a8a,#0ea5e9)',
          title: t('businessHub.fullAnalytics', { defaultValue: 'Full Analytics' }),
          desc: t('businessHub.fullAnalyticsDesc', { defaultValue: 'Charts, breakdowns, link performance, withdrawals and team growth.' }),
          onClick: go('/analytics') },
      ],
    },
    {
      heading: t('businessHub.sectionEarn', { defaultValue: 'Earn & optimise' }),
      cards: [
        { key: 'mygrid', icon: LayoutGrid, grad: 'linear-gradient(135deg,#1e3a8a,#22d3ee)',
          title: t('businessHub.myGrid', { defaultValue: 'My Grid' }),
          desc: t('businessHub.myGridDesc', { defaultValue: 'Your live Profit Grid — see your seats filling and per-seat earnings in real time.' }),
          onClick: go('/grid-visualiser') },
        { key: 'grid', icon: Target, grad: 'linear-gradient(135deg,#0a1438,#1e3a8a)',
          title: t('businessHub.profitGrid', { defaultValue: 'Profit Grid' }),
          desc: t('businessHub.profitGridDesc', { defaultValue: 'Activate and manage your Campaign Tiers and grid positions.' }),
          onClick: go('/campaign-tiers') },
        { key: 'credits', icon: Layers, grad: 'linear-gradient(135deg,#0e7490,#06b6d4)',
          title: t('businessHub.creatorCredits', { defaultValue: 'Creator Credits' }),
          desc: t('businessHub.creatorCreditsDesc', { defaultValue: 'Your credit balance, packs and usage across the creator tools.' }),
          onClick: go('/my-credits') },
        { key: 'calc', icon: Zap, grad: 'linear-gradient(135deg,#164e63,#22d3ee)',
          title: t('businessHub.gridCalculator', { defaultValue: 'Grid Calculator' }),
          desc: t('businessHub.gridCalculatorDesc', { defaultValue: 'Model your earnings across tiers and team-growth scenarios.' }),
          onClick: go('/grid-calculator') },
      ],
    },
  ];

  // Illustrative seat fill for the banner grid (cyan = direct, amber = team).
  const SEATS = ['d','i','i','d','i','d','i','i','i','i','d','i','d','i','i','i'];

  return (
    <AppLayout title={t('businessHub.title', { defaultValue: 'My Business' })}
               subtitle={t('businessHub.subtitle', { defaultValue: 'Track performance, manage your team and run the Profit Grid' })}>
      <style>{css}</style>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        <div className="bh-hero">
          <div className="bh-hero-ico"><Briefcase size={88} /></div>
          <h1>{t('businessHub.heroTitle', { defaultValue: 'My Business' })}</h1>
          <p>{t('businessHub.heroSub', { defaultValue: 'Everything on the earning side of SuperAdPro — your performance, team, Profit Grid, credits, analytics and calculator, all in one place.' })}</p>
        </div>

        {showLaunchpad && (
          <div className="lp">
            <div className="lp-in">
              <div className="lp-main">
                <span className="lp-badge">◆ {t('businessHub.lpBadge', { defaultValue: 'START HERE · LAUNCHPAD' })}</span>
                <h2>{t('businessHub.lpTitle1', { defaultValue: "You haven't started earning yet." })}<br /><span className="g">{t('businessHub.lpTitle2', { defaultValue: 'Launchpad opens the door.' })}</span></h2>
                <p className="sub">{t('businessHub.lpSub', { defaultValue: 'Everything below is the earning side of SuperAdPro. Launchpad is your $10 way in — it places you on a live Profit Grid so you can start earning commissions today, then qualify to unlock the full platform.' })}</p>
                <div className="lp-steps">
                  <div className="lp-step"><span className="n">1</span><div>{t('businessHub.lpStep1', { defaultValue: "Join Launchpad for $10 — you're placed on a 16-seat Profit Grid." })}</div></div>
                  <div className="lp-step"><span className="n">2</span><div>{t('businessHub.lpStep2', { defaultValue: 'Earn real commissions as your seats fill with referrals.' })}</div></div>
                  <div className="lp-step"><span className="n">3</span><div>{t('businessHub.lpStep3', { defaultValue: 'Qualify for full membership and unlock every card below.' })}</div></div>
                </div>
                <div className="lp-cta-row">
                  <button className="lp-cta" onClick={getLaunchpad} disabled={lpLoading}>
                    {lpLoading ? t('businessHub.lpStarting', { defaultValue: 'Starting…' }) : t('businessHub.lpCta', { defaultValue: 'Get Launchpad — $10' }) + ' →'}
                  </button>
                  <span className="lp-pnote">{t('businessHub.lpPayNote', { defaultValue: 'One-time payment' })}</span>
                  <button className="lp-second" onClick={go('/upgrade')}>{t('businessHub.lpSecond', { defaultValue: 'or go straight to full membership →' })}</button>
                </div>
                {lpError && <div className="lp-err">{lpError}</div>}
              </div>
              <div className="lp-viz">
                <div className="lp-seats">
                  {SEATS.map(function (s, i) { return <div key={i} className={'lp-seat ' + s}></div>; })}
                </div>
                <div className="lp-vcap">{t('businessHub.lpVizCap', { defaultValue: 'YOUR 16-SEAT GRID' })}<br />{t('businessHub.lpVizKey', { defaultValue: 'cyan = direct · amber = team' })}</div>
              </div>
            </div>
            <div className="lp-locked">
              <span className="li">🔒 {t('businessHub.lpLock1', { defaultValue: 'Watch-to-Earn' })}</span>
              <span className="li">🔒 {t('businessHub.lpLock2', { defaultValue: 'AI creator tools' })}</span>
              <span className="li">🔒 {t('businessHub.lpLock3', { defaultValue: 'Campaign Tiers 1–8' })}</span>
              <span className="li">🔒 {t('businessHub.lpLock4', { defaultValue: 'Page & funnel builder' })}</span>
            </div>
          </div>
        )}

        {showLaunchpad && (
          <div className="bp" role="button" tabIndex={0}
               onClick={go('/upgrade')}
               onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate("/join"); } }}>
            <div className="bp-l">
              <span className="bp-badge">★ {t('businessHub.bpBadge', { defaultValue: 'BECOME A PARTNER' })}</span>
              <h3>{t('businessHub.bpTitle', { defaultValue: 'The full toolkit — $20/month.' })}</h3>
              <p>{t('businessHub.bpDesc', { defaultValue: 'Unlock the entire SuperAdPro platform — Creative Studio, the Brand Poster Generator, MyLeads CRM, the page & funnel builder, AI marketing tools and the affiliate platform. Run your business, and share in the upside as your team grows. Cancel anytime.' })}</p>
              <div className="bp-cta-row">
                <span className="bp-cta">{t('businessHub.bpCta', { defaultValue: 'Become a Partner' })} →</span>
                <span className="bp-note">{t('businessHub.bpNote', { defaultValue: '$20/month · cancel anytime' })}</span>
              </div>
            </div>
            <div className="bp-r"><Rocket size={66} /></div>
          </div>
        )}

        {sections.map(function (sec) {
          return (
            <div key={sec.heading}>
              <div className="bh-sect">
                {sec.heading}
                {showLaunchpad && <span className="bh-lockpill">{t('businessHub.lpUnlockPill', { defaultValue: 'unlocks after Launchpad' })}</span>}
              </div>
              <div className={'bh-row bh-row--' + Math.min(sec.cards.length, 4)}>
                {sec.cards.map(function (c) {
                  var Icon = c.icon;
                  return (
                    <div key={c.key}
                         className={'bh-card' + (showLaunchpad ? ' bh-card--locked' : '')}
                         onClick={c.onClick}
                         role="button"
                         tabIndex={0}
                         onKeyDown={function (e) { if ((e.key === 'Enter' || e.key === ' ') && c.onClick) { e.preventDefault(); c.onClick(); } }}>
                      {showLaunchpad && <span className="bh-lk">🔒</span>}
                      <div className="bh-ico" style={{ background: c.grad }}><Icon size={20} color="#fff" /></div>
                      <h3>{c.title}</h3>
                      <p>{c.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>
    </AppLayout>
  );
}

var css = `
  .bh-hero{background:linear-gradient(135deg,#0a1438,#1e3a8a);border-radius:14px;padding:22px 24px;margin-bottom:18px;position:relative;overflow:hidden}
  .bh-hero h1{font-family:'Sora',sans-serif;font-weight:800;font-size:24px;color:#fff;margin:0 0 5px;letter-spacing:-0.4px}
  .bh-hero p{font-size:14.5px;color:#9fb4d8;margin:0;font-weight:500;max-width:580px;line-height:1.5}
  .bh-hero-ico{position:absolute;right:-6px;top:-10px;color:rgba(56,189,248,0.10);transform:rotate(-12deg);pointer-events:none}

  /* Free-user Launchpad "start here" banner */
  .lp{position:relative;border-radius:16px;overflow:hidden;margin-bottom:24px;
      background:radial-gradient(140% 120% at 88% 6%,#13315e 0%,#0a1f44 42%,#06122e 100%);
      box-shadow:0 18px 44px -22px rgba(6,18,46,.85)}
  .lp::after{content:"";position:absolute;width:360px;height:360px;right:-110px;top:-140px;border-radius:50%;
      background:radial-gradient(circle,rgba(34,211,238,.16),transparent 68%);pointer-events:none}
  .lp-in{position:relative;display:grid;grid-template-columns:1fr auto;gap:30px;padding:26px 30px;align-items:center}
  .lp-badge{display:inline-flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;
      color:#7dd3fc;background:rgba(34,211,238,.10);border:1px solid rgba(34,211,238,.28);padding:5px 11px;border-radius:999px;letter-spacing:.06em;margin-bottom:13px}
  .lp h2{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(20px,2.6vw,26px);color:#fff;line-height:1.12;letter-spacing:-.02em;margin:0}
  .lp h2 .g{background:linear-gradient(90deg,#22d3ee,#fbbf24);-webkit-background-clip:text;background-clip:text;color:transparent}
  .lp .sub{font-size:14px;color:rgba(255,255,255,.74);line-height:1.55;margin:10px 0 18px;max-width:440px}
  .lp-steps{display:flex;flex-direction:column;gap:9px;margin-bottom:20px}
  .lp-step{display:flex;align-items:flex-start;gap:11px;font-size:13.5px;color:rgba(255,255,255,.9)}
  .lp-step .n{flex:none;width:21px;height:21px;border-radius:50%;display:grid;place-items:center;font-family:'JetBrains Mono',monospace;
      font-size:11px;font-weight:600;color:#04121f;background:linear-gradient(135deg,#22d3ee,#0ea5e9)}
  .lp-step b{color:#fff;font-weight:700}
  .lp-cta-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .lp-cta{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;color:#04121f;border:none;cursor:pointer;
      background:linear-gradient(135deg,#22d3ee,#0ea5e9);padding:13px 24px;border-radius:11px;
      box-shadow:0 10px 26px -8px rgba(34,211,238,.7);transition:transform .15s}
  .lp-cta:hover{transform:translateY(-2px)}
  .lp-cta:disabled{opacity:.6;cursor:default;transform:none}
  .lp-pnote{font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(255,255,255,.6)}
  .lp-second{font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(34,211,238,.92);background:none;border:none;cursor:pointer;font-weight:600;padding:0}
  .lp-second:hover{color:#fff}
  .lp-err{font-size:12.5px;color:#fda4af;margin-top:12px}
  .lp-viz{display:flex;flex-direction:column;align-items:center;gap:11px}
  .lp-seats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:138px}
  .lp-seat{aspect-ratio:1;border-radius:6px}
  .lp-seat.d{background:linear-gradient(135deg,#0ea5e9,#22d3ee);box-shadow:0 4px 12px -6px rgba(34,211,238,.8)}
  .lp-seat.i{background:linear-gradient(135deg,#f59e0b,#fbbf24);box-shadow:0 4px 12px -6px rgba(245,158,11,.6)}
  .lp-vcap{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,.55);letter-spacing:.04em;text-align:center;line-height:1.5}
  .lp-locked{position:relative;display:flex;gap:8px 16px;flex-wrap:wrap;padding:12px 30px;background:rgba(255,255,255,.05);border-top:1px solid rgba(255,255,255,.1)}
  .lp-locked .li{display:flex;align-items:center;gap:6px;font-size:12px;color:rgba(255,255,255,.68)}
  @media(max-width:680px){.lp-in{grid-template-columns:1fr;gap:20px}.lp-viz{order:-1;flex-direction:row}}

  /* Become a Partner card (free-user upgrade CTA → /upgrade) */
  .bp{position:relative;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;cursor:pointer;
      border-radius:16px;overflow:hidden;margin-bottom:24px;padding:24px 28px;
      background:radial-gradient(130% 130% at 90% 10%,#1e3a8a 0%,#0f2350 46%,#0a1740 100%);
      border:1px solid rgba(34,211,238,.22);box-shadow:0 16px 40px -20px rgba(6,18,46,.8);
      transition:transform .15s ease, box-shadow .15s ease}
  .bp:hover{transform:translateY(-3px);box-shadow:0 22px 50px -22px rgba(6,18,46,.9)}
  .bp:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(34,211,238,.4)}
  .bp-badge{display:inline-flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;
      color:#7dd3fc;background:rgba(34,211,238,.10);border:1px solid rgba(34,211,238,.30);padding:5px 11px;border-radius:999px;letter-spacing:.06em;margin-bottom:12px}
  .bp h3{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(19px,2.4vw,23px);color:#fff;margin:0 0 9px;letter-spacing:-.02em;line-height:1.15}
  .bp p{font-size:13.5px;color:rgba(255,255,255,.76);line-height:1.55;margin:0 0 17px;max-width:560px;font-weight:500}
  .bp-cta-row{display:flex;align-items:center;gap:15px;flex-wrap:wrap}
  .bp-cta{font-family:'Sora',sans-serif;font-weight:700;font-size:14.5px;color:#04121f;
      background:linear-gradient(135deg,#22d3ee,#0ea5e9);padding:11px 22px;border-radius:11px;
      box-shadow:0 10px 26px -8px rgba(34,211,238,.6)}
  .bp-note{font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(255,255,255,.6)}
  .bp-r{color:rgba(56,189,248,.16);flex:none}
  @media(max-width:680px){.bp{grid-template-columns:1fr;gap:14px}.bp-r{display:none}}

  .bh-sect{font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin:20px 2px 12px;display:flex;align-items:center;gap:9px}
  .bh-lockpill{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;padding:2px 8px;border-radius:999px;text-transform:none;letter-spacing:0}
  .bh-row{display:grid;grid-template-columns:1fr;gap:13px;margin-bottom:6px;align-items:stretch}
  @media (min-width:561px){ .bh-row{grid-template-columns:repeat(2,minmax(0,1fr))} }
  @media (min-width:901px){
    .bh-row--3{grid-template-columns:repeat(3,minmax(0,1fr))}
    .bh-row--4{grid-template-columns:repeat(4,minmax(0,1fr))}
  }
  .bh-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 17px;display:flex;flex-direction:column;cursor:pointer;transition:transform .15s ease, box-shadow .15s ease;position:relative;text-align:left}
  .bh-card:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(10,20,56,0.12)}
  .bh-card:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(34,211,238,0.35)}
  .bh-card--locked{opacity:.6}
  .bh-card--locked:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(10,20,56,0.12);opacity:.78}
  .bh-lk{position:absolute;top:12px;right:13px;font-size:13px;opacity:.75}
  .bh-ico{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:11px;flex-shrink:0}
  .bh-card h3{font-family:'Sora',sans-serif;font-size:15px;font-weight:700;color:#0a1438;margin:0 0 4px}
  .bh-card p{font-size:12.5px;color:#64748b;margin:0;font-weight:500;line-height:1.45;flex:1}
`;
