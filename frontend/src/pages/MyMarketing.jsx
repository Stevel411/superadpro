import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AlShell from '../components/layout/AlShell';
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

  const refBase = (typeof window !== 'undefined' ? window.location.origin : 'https://www.advantagelife.club') + '/ref/' + (user && user.username ? user.username : '');

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
        { key: 'link', icon: Link2, grad: 'linear-gradient(135deg,#a00d24,#e8203f)',
          title: t('myMarketing.affiliateLink', { defaultValue: 'Affiliate Link & Social Share' }),
          desc: t('myMarketing.affiliateLinkDesc', { defaultValue: 'Your referral link, QR code and ready-made social posts.' }),
          onClick: go('/social-share') },
        { key: 'video', icon: PlayCircle, grad: 'linear-gradient(135deg,#0a1f52,#12388f)',
          title: t('myMarketing.salesVideo', { defaultValue: 'Personal Sales Video' }),
          desc: t('myMarketing.salesVideoDesc', { defaultValue: 'Your branded video sales page — share the link with prospects.' }),
          onClick: go(refBase + '/video', true) },
      ],
    },
    {
      heading: t('myMarketing.sectionExplain', { defaultValue: 'Explain & convert' }),
      cards: [
        { key: 'plan', icon: FileText, grad: 'linear-gradient(135deg,#0a1f52,#c8102e)',
          title: t('myMarketing.compPlan', { defaultValue: 'Compensation Plan' }),
          desc: t('myMarketing.compPlanDesc', { defaultValue: 'Present the full earning plan — share or walk a prospect through it.' }),
          onClick: go('/compensation-plan') },
        { key: 'mvideos', icon: Tv, grad: 'linear-gradient(135deg,#0a1f52,#e8203f)',
          title: t('myMarketing.marketingVideos', { defaultValue: 'Marketing Videos' }),
          desc: t('myMarketing.marketingVideosDesc', { defaultValue: 'Company-branded videos to share with prospects.' }),
          soon: COMING_SOON_MARKETING_VIDEOS,
          onClick: COMING_SOON_MARKETING_VIDEOS ? null : go('/marketing-videos') },
      ],
    },
    {
      heading: t('myMarketing.sectionCreate', { defaultValue: 'Create & materials' }),
      cards: [
        { key: 'posters', icon: Image, grad: 'linear-gradient(135deg,#12388f,#12388f)',
          title: t('myMarketing.brandPosters', { defaultValue: 'Brand Posters' }),
          desc: t('myMarketing.brandPostersDesc', { defaultValue: 'Generate branded marketing posters with the AI poster tool.' }),
          onClick: go('/brand-posters') },
        { key: 'email', icon: Mail, grad: 'linear-gradient(135deg,#0a1f52,#e8203f)',
          title: t('myMarketing.emailSwipes', { defaultValue: 'Email Swipes' }),
          desc: t('myMarketing.emailSwipesDesc', { defaultValue: 'Pre-written email copy you can personalise and send.' }),
          onClick: go('/email-swipes') },
      ],
    },
  ];

  return (
    <AlShell active="marketing" back={{ to: '/dashboard', label: 'Dashboard' }}>
      <style>{css}</style>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        <div className="mm-hero">
          <div className="mm-hero-ico"><Megaphone size={88} /></div>
          <h1>{t('myMarketing.heroTitle', { defaultValue: 'My Marketing' })}</h1>
          <p>{t('myMarketing.heroSub', { defaultValue: 'Everything you need to promote your business and share AdvantageLife — your link, gifts, posters, decks, videos and the plan, all in one place.' })}</p>
        </div>

        <div className="mm-feature"
             onClick={go('/my-marketing/lead-magnets')}
             role="button" tabIndex={0}
             onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('/my-marketing/lead-magnets')(); } }}>
          <div className="mm-feature-ico"><Magnet size={27} color="#fff" /></div>
          <div className="mm-feature-txt">
            <div className="mm-feature-tag">{t('myMarketing.leadMagnetsTag', { defaultValue: 'FREE · DONE-FOR-YOU' })}</div>
            <h2>{t('myMarketing.leadMagnets', { defaultValue: 'Lead Magnets' })}</h2>
            <p>{t('myMarketing.leadMagnetsFeatureDesc', { defaultValue: 'Two ready-to-share pages that grow your list on autopilot — share your link, and every signup joins your list and your welcome sequence automatically.' })}</p>
          </div>
          <div className="mm-feature-cta">{t('myMarketing.leadMagnetsCta', { defaultValue: 'Open Lead Magnets' })} →</div>
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
                      <div className="mm-ico" style={{ background: c.grad }}><Icon size={26} color="#fff" /></div>
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
    </AlShell>
  );
}

var css = `
  .mm-hero{background:linear-gradient(135deg,#0a1f52,#12388f);border-radius:14px;padding:22px 24px;margin-bottom:20px;position:relative;overflow:hidden}
  .mm-hero h1{font-family:'Sora',sans-serif;font-weight:800;font-size:24px;color:#fff;margin:0 0 5px;letter-spacing:-0.4px}
  .mm-hero p{font-size:14.5px;color:#9fb4d8;margin:0;font-weight:500;max-width:580px;line-height:1.5}
  .mm-hero-ico{position:absolute;right:-6px;top:-10px;color:rgba(232,32,63,0.10);transform:rotate(-12deg);pointer-events:none}
  .mm-feature{position:relative;display:flex;align-items:center;gap:18px;background:#fff;border:1.5px solid #bfe3fb;border-radius:16px;padding:18px 22px 18px 26px;margin-bottom:8px;cursor:pointer;overflow:hidden;transition:transform .15s ease, box-shadow .15s ease;box-shadow:0 8px 24px rgba(14,116,180,0.10)}
  .mm-feature::before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,#c8102e,#16a34a)}
  .mm-feature:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(14,116,180,0.16)}
  .mm-feature:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(232,32,63,0.35)}
  .mm-feature-ico{width:54px;height:54px;border-radius:14px;background:linear-gradient(135deg,#0a1f52,#c8102e);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .mm-feature-txt{flex:1;min-width:0}
  .mm-feature-tag{font-family:'Sora',sans-serif;font-size:10px;font-weight:800;letter-spacing:0.1em;color:#a00d24;margin-bottom:3px}
  .mm-feature-txt h2{font-family:'Sora',sans-serif;font-weight:800;font-size:18px;color:#0a1f52;margin:0 0 3px}
  .mm-feature-txt p{font-size:13px;color:#475569;margin:0;font-weight:500;line-height:1.45;max-width:640px}
  .mm-feature-cta{flex-shrink:0;font-family:'Sora',sans-serif;font-weight:700;font-size:13.5px;color:#fff;background:linear-gradient(135deg,#12388f,#c8102e);padding:12px 20px;border-radius:11px;white-space:nowrap;box-shadow:0 4px 12px rgba(14,116,180,0.3)}
  .mm-sect{font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin:20px 2px 12px}
  .mm-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-bottom:8px}
  .mm-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px 26px;display:flex;flex-direction:column;cursor:pointer;transition:transform .15s ease, box-shadow .15s ease;position:relative;text-align:left}
  .mm-card:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(10,20,56,0.12)}
  .mm-card:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(232,32,63,0.35)}
  .mm-card.soon{cursor:default;opacity:0.72}
  .mm-card.soon:hover{transform:none;box-shadow:none}
  .mm-ico{width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;flex-shrink:0}
  .mm-card h3{font-family:'Sora',sans-serif;font-size:18px;font-weight:700;color:#0a1f52;margin:0 0 6px}
  .mm-card p{font-size:14px;color:#64748b;margin:0;font-weight:500;line-height:1.5}
  .mm-tag{position:absolute;top:13px;right:14px;font-size:9.5px;font-weight:800;letter-spacing:0.5px;padding:2px 8px;border-radius:5px;font-family:'Sora',sans-serif}
  .mm-tag.soon{background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0}
  @media (max-width:900px){ .mm-row{grid-template-columns:1fr} .mm-feature{flex-direction:column;align-items:flex-start;gap:13px} .mm-feature-cta{width:100%;text-align:center} }
`;
