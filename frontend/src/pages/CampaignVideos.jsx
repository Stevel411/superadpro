import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import {
  Video, PlayCircle, PlusCircle, Film, BarChart3, Target,
} from 'lucide-react';

// ── My Campaign Videos hub ──────────────────────────────────────────
// One front door for the member's video-advertising workflow. Mirrors
// the Business Hub / My Marketing hub pattern (cobalt hero, card grid,
// family tab-strip). Gathers the five campaign-video pages: watch to
// earn, create a campaign, your uploaded campaigns, video analytics and
// the Campaign Tiers (Profit Grid activation).
//
// Note: Campaign Analytics (/campaign-analytics) lives here as "Video
// Analytics" — moved out of the Business Hub 1 Jun 2026 (Steve). Campaign
// Tiers (/campaign-tiers) intentionally appears in BOTH this hub and the
// Business Hub (as "Profit Grid"); its tab strip stays with Business to
// avoid a page rendering two strips.
//
// Landing is ProtectedRoute-only; each destination enforces its own
// RequireTier gate on arrival.

export default function CampaignVideos() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function go(path) {
    return function () { navigate(path); };
  }

  const sections = [
    {
      heading: t('campaignVideos.sectionWatch', { defaultValue: 'Watch & create' }),
      cards: [
        { key: 'watch', icon: PlayCircle, grad: 'linear-gradient(135deg,#1e3a8a,#22d3ee)',
          title: t('campaignVideos.watch', { defaultValue: 'Watch & Earn' }),
          desc: t('campaignVideos.watchDesc', { defaultValue: 'Watch today\u2019s campaign videos to stay qualified for withdrawals.' }),
          onClick: go('/watch') },
        { key: 'create', icon: PlusCircle, grad: 'linear-gradient(135deg,#0891b2,#22d3ee)',
          title: t('campaignVideos.create', { defaultValue: 'Create Campaign' }),
          desc: t('campaignVideos.createDesc', { defaultValue: 'Upload a video and launch a new advertising campaign.' }),
          onClick: go('/create-campaign') },
        { key: 'mine', icon: Film, grad: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)',
          title: t('campaignVideos.mine', { defaultValue: 'My Campaigns' }),
          desc: t('campaignVideos.mineDesc', { defaultValue: 'Your uploaded campaign videos and their current status.' }),
          onClick: go('/video-library') },
      ],
    },
    {
      heading: t('campaignVideos.sectionTrack', { defaultValue: 'Track & grow' }),
      cards: [
        { key: 'analytics', icon: BarChart3, grad: 'linear-gradient(135deg,#164e63,#06b6d4)',
          title: t('campaignVideos.analytics', { defaultValue: 'Video Analytics' }),
          desc: t('campaignVideos.analyticsDesc', { defaultValue: 'Campaign performance, views and conversion stats.' }),
          onClick: go('/campaign-analytics') },
        { key: 'tiers', icon: Target, grad: 'linear-gradient(135deg,#0a1438,#1e3a8a)',
          title: t('campaignVideos.tiers', { defaultValue: 'Campaign Tiers' }),
          desc: t('campaignVideos.tiersDesc', { defaultValue: 'Activate and manage your Campaign Tiers and Profit Grid positions.' }),
          onClick: go('/campaign-tiers') },
      ],
    },
  ];

  return (
    <AppLayout title={t('campaignVideos.title', { defaultValue: 'My Campaign Videos' })}
               subtitle={t('campaignVideos.subtitle', { defaultValue: 'Watch, create and track your video advertising campaigns' })}>
      <style>{css}</style>
      <div data-build="2026-06-01a" style={{ maxWidth: 1180, margin: '0 auto' }}>

        <div className="cv-hero">
          <div className="cv-hero-ico"><Video size={88} /></div>
          <h1>{t('campaignVideos.heroTitle', { defaultValue: 'My Campaign Videos' })}</h1>
          <p>{t('campaignVideos.heroSub', { defaultValue: 'Everything for your video advertising \u2014 watch to earn, create campaigns, track performance and manage your Campaign Tiers, all in one place.' })}</p>
        </div>

        {sections.map(function (sec) {
          return (
            <div key={sec.heading}>
              <div className="cv-sect">{sec.heading}</div>
              <div className={'cv-row cv-row--' + Math.min(sec.cards.length, 4)}>
                {sec.cards.map(function (c) {
                  var Icon = c.icon;
                  return (
                    <div key={c.key}
                         className="cv-card"
                         onClick={c.onClick}
                         role="button"
                         tabIndex={0}
                         onKeyDown={function (e) { if ((e.key === 'Enter' || e.key === ' ') && c.onClick) { e.preventDefault(); c.onClick(); } }}>
                      <div className="cv-ico" style={{ background: c.grad }}><Icon size={20} color="#fff" /></div>
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
  .cv-hero{background:linear-gradient(135deg,#0a1438,#1e3a8a);border-radius:14px;padding:22px 24px;margin-bottom:20px;position:relative;overflow:hidden}
  .cv-hero h1{font-family:'Sora',sans-serif;font-weight:800;font-size:24px;color:#fff;margin:0 0 5px;letter-spacing:-0.4px}
  .cv-hero p{font-size:14.5px;color:#9fb4d8;margin:0;font-weight:500;max-width:600px;line-height:1.5}
  .cv-hero-ico{position:absolute;right:-6px;top:-10px;color:rgba(56,189,248,0.10);transform:rotate(-12deg);pointer-events:none}
  .cv-sect{font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin:20px 2px 12px}
  .cv-row{display:grid;grid-template-columns:1fr;gap:13px;margin-bottom:6px;align-items:stretch}
  @media (min-width:561px){ .cv-row{grid-template-columns:repeat(2,minmax(0,1fr))} }
  @media (min-width:901px){
    .cv-row--3{grid-template-columns:repeat(3,minmax(0,1fr))}
    .cv-row--2{grid-template-columns:repeat(2,minmax(0,1fr))}
  }
  .cv-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 17px;display:flex;flex-direction:column;cursor:pointer;transition:transform .15s ease, box-shadow .15s ease;position:relative;text-align:left}
  .cv-card:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(10,20,56,0.12)}
  .cv-card:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(34,211,238,0.35)}
  .cv-ico{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:11px;flex-shrink:0}
  .cv-card h3{font-family:'Sora',sans-serif;font-size:15px;font-weight:700;color:#0a1438;margin:0 0 4px}
  .cv-card p{font-size:12.5px;color:#64748b;margin:0;font-weight:500;line-height:1.45;flex:1}
`;
