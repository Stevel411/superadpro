import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import {
  Briefcase, Gauge, Users, Target, Layers, BarChart3, Zap, LayoutGrid, LineChart,
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

export default function BusinessHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
        { key: 'analytics', icon: BarChart3, grad: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)',
          title: t('businessHub.analytics', { defaultValue: 'Campaign Analytics' }),
          desc: t('businessHub.analyticsDesc', { defaultValue: 'Campaign performance, views and conversion stats.' }),
          onClick: go('/campaign-analytics') },
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

        {sections.map(function (sec) {
          return (
            <div key={sec.heading}>
              <div className="bh-sect">{sec.heading}</div>
              <div className="bh-row">
                {sec.cards.map(function (c) {
                  var Icon = c.icon;
                  return (
                    <div key={c.key}
                         className="bh-card"
                         onClick={c.onClick}
                         role="button"
                         tabIndex={0}
                         onKeyDown={function (e) { if ((e.key === 'Enter' || e.key === ' ') && c.onClick) { e.preventDefault(); c.onClick(); } }}>
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
  .bh-hero{background:linear-gradient(135deg,#0a1438,#1e3a8a);border-radius:14px;padding:22px 24px;margin-bottom:20px;position:relative;overflow:hidden}
  .bh-hero h1{font-family:'Sora',sans-serif;font-weight:800;font-size:24px;color:#fff;margin:0 0 5px;letter-spacing:-0.4px}
  .bh-hero p{font-size:14.5px;color:#9fb4d8;margin:0;font-weight:500;max-width:580px;line-height:1.5}
  .bh-hero-ico{position:absolute;right:-6px;top:-10px;color:rgba(56,189,248,0.10);transform:rotate(-12deg);pointer-events:none}
  .bh-sect{font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin:20px 2px 12px}
  .bh-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:6px;align-items:stretch}
  .bh-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 17px;display:flex;flex-direction:column;cursor:pointer;transition:transform .15s ease, box-shadow .15s ease;position:relative;text-align:left}
  .bh-card:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(10,20,56,0.12)}
  .bh-card:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(34,211,238,0.35)}
  .bh-ico{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:11px;flex-shrink:0}
  .bh-card h3{font-family:'Sora',sans-serif;font-size:15px;font-weight:700;color:#0a1438;margin:0 0 4px}
  .bh-card p{font-size:12.5px;color:#64748b;margin:0;font-weight:500;line-height:1.45;flex:1}
  @media (max-width:900px){ .bh-row{grid-template-columns:repeat(2,minmax(0,1fr))} }
  @media (max-width:560px){ .bh-row{grid-template-columns:1fr} }
`;
