import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import {
  Megaphone, Link2, Gift, PlayCircle, FileText, Tv,
  Sparkles, Image, Files, Mail, Magnet,
} from 'lucide-react';

// ── My Marketing hub ────────────────────────────────────────────────
// One front door for the member's promotional surfaces. Most cards point
// at existing live pages; the hub just gathers them. Pay It Forward (the
// gift-voucher page) gets its first menu placement here. Marketing Videos
// is a net-new page built as a separate task — shown here as "coming soon"
// and feature-flagged off until it's live + seeded, so members don't land
// on an empty page.
const COMING_SOON_MARKETING_VIDEOS = true;

export default function MyMarketing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const refBase = 'https://www.superadpro.com/ref/' + (user && user.username ? user.username : '');

  // Card factory. external=true uses window.open (for the member's own
  // public referral video page, which lives outside the app shell).
  function go(path, external) {
    return function () {
      if (external) { window.open(path, '_blank', 'noopener'); }
      else { navigate(path); }
    };
  }

  const sections = [
    {
      heading: t('myMarketing.sectionShare', { defaultValue: 'Share & invite' }),
      cards: [
        { key: 'link', icon: Link2, grad: 'linear-gradient(135deg,#0891b2,#22d3ee)',
          title: t('myMarketing.affiliateLink', { defaultValue: 'Affiliate Link & Social Share' }),
          desc: t('myMarketing.affiliateLinkDesc', { defaultValue: 'Your referral link, QR code and ready-made social posts.' }),
          onClick: go('/social-share') },
        { key: 'leadmagnets', icon: Magnet, grad: 'linear-gradient(135deg,#0a1438,#0ea5e9)',
          title: t('myMarketing.leadMagnets', { defaultValue: 'Lead Magnets' }),
          desc: t('myMarketing.leadMagnetsDesc', { defaultValue: 'Free done-for-you giveaways — share to grow your list automatically.' }),
          onClick: go('/my-marketing/lead-magnets') },
        { key: 'gift', icon: Gift, grad: 'linear-gradient(135deg,#db2777,#f472b6)',
          title: t('myMarketing.payItForward', { defaultValue: 'Pay It Forward' }),
          desc: t('myMarketing.payItForwardDesc', { defaultValue: 'Gift a free voucher to invite someone in — generate and send gift links.' }),
          onClick: go('/pay-it-forward') },
        { key: 'video', icon: PlayCircle, grad: 'linear-gradient(135deg,#0a1438,#1e3a8a)',
          title: t('myMarketing.salesVideo', { defaultValue: 'Personal Sales Video' }),
          desc: t('myMarketing.salesVideoDesc', { defaultValue: 'Your branded video sales page — share the link with prospects.' }),
          onClick: go(refBase + '/video', true) },
      ],
    },
    {
      heading: t('myMarketing.sectionExplain', { defaultValue: 'Explain & convert' }),
      cards: [
        { key: 'plan', icon: FileText, grad: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)',
          title: t('myMarketing.compPlan', { defaultValue: 'Compensation Plan' }),
          desc: t('myMarketing.compPlanDesc', { defaultValue: 'Present the full earning plan — share or walk a prospect through it.' }),
          onClick: go('/compensation-plan') },
        { key: 'mvideos', icon: Tv, grad: 'linear-gradient(135deg,#164e63,#22d3ee)',
          title: t('myMarketing.marketingVideos', { defaultValue: 'Marketing Videos' }),
          desc: t('myMarketing.marketingVideosDesc', { defaultValue: 'Company-branded videos to share with prospects.' }),
          soon: COMING_SOON_MARKETING_VIDEOS,
          onClick: COMING_SOON_MARKETING_VIDEOS ? null : go('/marketing-videos') },
        { key: 'story', icon: Sparkles, grad: 'linear-gradient(135deg,#0891b2,#0ea5e9)',
          title: t('myMarketing.shareStory', { defaultValue: 'Share Your Story' }),
          desc: t('myMarketing.shareStoryDesc', { defaultValue: 'Publish your testimonial as social proof for the community.' }),
          onClick: go('/share-story') },
      ],
    },
    {
      heading: t('myMarketing.sectionCreate', { defaultValue: 'Create & materials' }),
      cards: [
        { key: 'posters', icon: Image, grad: 'linear-gradient(135deg,#1e3a8a,#3b82f6)',
          title: t('myMarketing.brandPosters', { defaultValue: 'Brand Posters' }),
          desc: t('myMarketing.brandPostersDesc', { defaultValue: 'Generate branded marketing posters with the AI poster tool.' }),
          onClick: go('/brand-posters') },
        { key: 'decks', icon: Files, grad: 'linear-gradient(135deg,#0e7490,#06b6d4)',
          title: t('myMarketing.decks', { defaultValue: 'Marketing Decks' }),
          desc: t('myMarketing.decksDesc', { defaultValue: 'Downloadable presentations and brand assets.' }),
          onClick: go('/marketing-materials') },
        { key: 'email', icon: Mail, grad: 'linear-gradient(135deg,#155e75,#22d3ee)',
          title: t('myMarketing.emailSwipes', { defaultValue: 'Email Swipes' }),
          desc: t('myMarketing.emailSwipesDesc', { defaultValue: 'Pre-written email copy you can personalise and send.' }),
          onClick: go('/email-swipes') },
      ],
    },
  ];

  return (
    <AppLayout title={t('myMarketing.title', { defaultValue: 'My Marketing' })}
               subtitle={t('myMarketing.subtitle', { defaultValue: 'Promote your business and share SuperAdPro' })}>
      <style>{css}</style>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        <div className="mm-hero">
          <div className="mm-hero-ico"><Megaphone size={88} /></div>
          <h1>{t('myMarketing.heroTitle', { defaultValue: 'My Marketing' })}</h1>
          <p>{t('myMarketing.heroSub', { defaultValue: 'Everything you need to promote your business and share SuperAdPro — your link, gifts, posters, decks, videos and the plan, all in one place.' })}</p>
        </div>

        {sections.map(function (sec) {
          return (
            <div key={sec.heading}>
              <div className="mm-sect">{sec.heading}</div>
              <div className="mm-row">
                {sec.cards.map(function (c) {
                  var Icon = c.icon;
                  return (
                    <div key={c.key}
                         className={'mm-card' + (c.soon ? ' soon' : '')}
                         onClick={c.onClick || undefined}
                         role="button"
                         tabIndex={0}
                         onKeyDown={function (e) { if ((e.key === 'Enter' || e.key === ' ') && c.onClick) { e.preventDefault(); c.onClick(); } }}>
                      {c.soon ? <span className="mm-tag soon">Coming soon</span> : null}
                      <div className="mm-ico" style={{ background: c.grad }}><Icon size={20} color="#fff" /></div>
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
  .mm-hero{background:linear-gradient(135deg,#0a1438,#1e3a8a);border-radius:14px;padding:22px 24px;margin-bottom:20px;position:relative;overflow:hidden}
  .mm-hero h1{font-family:'Sora',sans-serif;font-weight:800;font-size:24px;color:#fff;margin:0 0 5px;letter-spacing:-0.4px}
  .mm-hero p{font-size:14.5px;color:#9fb4d8;margin:0;font-weight:500;max-width:580px;line-height:1.5}
  .mm-hero-ico{position:absolute;right:-6px;top:-10px;color:rgba(56,189,248,0.10);transform:rotate(-12deg);pointer-events:none}
  .mm-sect{font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin:20px 2px 12px}
  .mm-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-bottom:6px}
  .mm-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 17px;display:flex;flex-direction:column;cursor:pointer;transition:transform .15s ease, box-shadow .15s ease;position:relative;text-align:left}
  .mm-card:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(10,20,56,0.12)}
  .mm-card:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(34,211,238,0.35)}
  .mm-card.soon{cursor:default;opacity:0.72}
  .mm-card.soon:hover{transform:none;box-shadow:none}
  .mm-ico{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:11px;flex-shrink:0}
  .mm-card h3{font-family:'Sora',sans-serif;font-size:15px;font-weight:700;color:#0a1438;margin:0 0 4px}
  .mm-card p{font-size:12.5px;color:#64748b;margin:0;font-weight:500;line-height:1.45}
  .mm-tag{position:absolute;top:13px;right:14px;font-size:9.5px;font-weight:800;letter-spacing:0.5px;padding:2px 8px;border-radius:5px;font-family:'Sora',sans-serif}
  .mm-tag.soon{background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0}
  @media (max-width:900px){ .mm-row{grid-template-columns:1fr} }
`;
