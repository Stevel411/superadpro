import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Map, Share2, DollarSign, Link2, Users, Zap, Eye, Sparkles, Wallet, Heart, ChevronDown, ChevronUp, Play, ArrowRight } from 'lucide-react';

var SECTIONS = [
  {
    id: 'dashboard',
    num: '1',
    title: 'Your Dashboard',
    desc: 'This is your home base. Every time you log in, you land here. You can see your earnings, your network size, and your referral link. The 6 Quick Action cards guide you to the most important areas of the platform.',
    tips: [
      'Your referral link is always visible at the top — copy and share it anytime',
      'The 3 income cards show your earnings across Membership, Grid, and Campaigns',
      'Quick Action cards change based on your membership level',
    ],
    link: '/dashboard',
    linkLabel: 'Go to Dashboard',
    Icon: Map,
    color: '#6366f1',
    bg: '#eef2ff',
  },
  {
    id: 'referral',
    num: '2',
    title: 'Your Referral Link',
    desc: 'Your referral link is how you earn. When someone signs up through your link, you earn 50% of their membership fee every month. Share it on social media, in messages, on your LinkHub page — everywhere.',
    tips: [
      'Your link looks like: www.superadpro.com/ref/YourUsername',
      'You earn $10 per Basic referral and $17.50 per Pro referral — every month',
      'Use the Social Share tool to generate AI-written posts with your link embedded',
    ],
    link: '/affiliate',
    linkLabel: 'Go to Social Share',
    Icon: Share2,
    color: '#0ea5e9',
    bg: '#e0f2fe',
  },
  {
    id: 'compplan',
    num: '3',
    title: 'Compensation Plan',
    desc: 'SuperAdPro has 5 income streams and pays out 95% of all revenue to members. The Compensation Plan page breaks down exactly how each stream works, with interactive calculators so you can project your earnings.',
    tips: [
      'Membership referrals — 50% recurring commission',
      '8×8 Campaign Grid — 40% direct + 6.25% across 8 levels + completion bonus',
      'SuperScene sponsor earnings — $0.025 per credit your referrals use',
      'Course marketplace and Pay It Forward complete the 5 streams',
    ],
    link: '/compensation-plan',
    linkLabel: 'View Comp Plan',
    Icon: DollarSign,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    id: 'linkhub',
    num: '4',
    title: 'LinkHub — Your Branded Page',
    desc: 'LinkHub is your personal link-in-bio page, similar to Linktree or Stan Store. Add your photo, bio, social links, and custom buttons. Share one link that sends people to everything you offer. It works as a mini website for your personal brand.',
    tips: [
      'Add your photo and a compelling bio',
      'Add links to your social profiles, products, or any URL',
      'Drag and drop to reorder your links',
      'Choose from multiple themes to match your brand',
    ],
    link: '/linkhub',
    linkLabel: 'Build Your LinkHub',
    Icon: Link2,
    color: '#8b5cf6',
    bg: '#ede9fe',
  },
  {
    id: 'socialshare',
    num: '5',
    title: 'Social Share',
    desc: 'The AI Social Share tool generates platform-specific posts for Facebook, X, Instagram, LinkedIn, TikTok, YouTube, WhatsApp, Telegram, and more. Choose a platform, pick a tone, and the AI writes a ready-to-post message with your referral link embedded.',
    tips: [
      'Choose from 12 social platforms',
      '5 tone options: Professional, Casual, Hype, Story, Educational',
      'Add your niche for more targeted content',
      'One-click copy or share directly to the platform',
    ],
    link: '/affiliate',
    linkLabel: 'Generate Posts',
    Icon: Users,
    color: '#ec4899',
    bg: '#fce7f3',
  },
  {
    id: 'tiers',
    num: '6',
    title: 'Campaign Tiers',
    desc: 'Campaign Tiers are how you unlock the 8×8 Income Grid — the biggest earning potential on the platform. Choose a tier from T1 ($20) to T8 ($1,000). Each tier activates a grid that fills with members from your network. Higher tiers mean bigger commissions and completion bonuses.',
    tips: [
      '8 tiers from $20 to $1,000',
      'Each tier creates an 8×8 grid (64 positions)',
      'You earn 40% direct, 6.25% from 8 levels, plus a completion bonus',
      'Grid commissions go to your Campaign Wallet',
    ],
    link: '/campaign-tiers',
    linkLabel: 'View Campaign Tiers',
    Icon: Zap,
    color: '#f59e0b',
    bg: '#fef3c7',
    pro: true,
  },
  {
    id: 'watch',
    num: '7',
    title: 'Watch to Earn',
    desc: 'Watch to Earn is the engine that keeps the platform running. Members watch short campaign videos daily to maintain their commission qualification. This delivers real views to advertisers while keeping your earning status active. Think of it as your daily check-in.',
    tips: [
      'Watch your daily quota of videos to stay qualified',
      'Missing your quota pauses Campaign Wallet withdrawals',
      'Videos are short — usually 30-60 seconds each',
      'Your watch progress is tracked on the dashboard',
    ],
    link: '/watch',
    linkLabel: 'Start Watching',
    Icon: Eye,
    color: '#7c3aed',
    bg: '#f5f3ff',
    pro: true,
  },
  {
    id: 'superscene',
    num: '8',
    title: 'SuperScene — AI Creative Studio',
    desc: 'SuperScene is your all-in-one AI content creation studio. Generate professional videos, images, music, voiceovers, and captions — all powered by the latest AI models. Use it to create marketing content, social media posts, pitch videos, and more. No design skills needed.',
    tips: [
      '10 tabs: Create, Studio, Images, Captions, Music, Voiceover, Editor, Gallery, Packs, AI Builder',
      'Video models include Kling 3.0, Sora 2 Pro, Veo 3.1, and more',
      'Credits never expire — buy packs from $8 to $99',
      'Your sponsor earns $0.025 per credit you use — passive income for them',
    ],
    link: '/superscene',
    linkLabel: 'Open SuperScene',
    Icon: Sparkles,
    color: '#0891b2',
    bg: '#ecfeff',
  },
  {
    id: 'wallet',
    num: '9',
    title: 'Your Wallet',
    desc: 'You have two wallets. Your Affiliate Wallet holds membership referral commissions and SuperScene sponsor earnings — you can withdraw these anytime. Your Campaign Wallet holds grid commissions — these require an active tier and daily watch quota to withdraw.',
    tips: [
      'Affiliate Wallet — always withdrawable, no conditions',
      'Campaign Wallet — requires active tier + daily watch quota',
      'View your complete transaction history in one place',
      'Set up your crypto wallet in the Crypto Guide (under Account)',
    ],
    link: '/wallet',
    linkLabel: 'View Your Wallet',
    Icon: Wallet,
    color: '#059669',
    bg: '#d1fae5',
  },
  {
    id: 'pif',
    num: '10',
    title: 'Pay It Forward',
    desc: 'Pay It Forward lets you gift a Basic membership to someone for $20 from your wallet. You become their sponsor and earn commissions on everything they do. When they earn $20 or more, they are prompted to pay it forward to someone else — creating an organic growth chain.',
    tips: [
      'Gift costs $20 from your Affiliate Wallet',
      'You become the sponsor of the gifted member',
      'You earn referral commissions on their activity',
      'Creates a viral growth loop — they gift someone, who gifts someone...',
    ],
    link: '/pay-it-forward',
    linkLabel: 'Gift a Membership',
    Icon: Heart,
    color: '#db2777',
    bg: '#fce7f3',
  },
];

export default function PlatformTour() {
  var [expanded, setExpanded] = useState(null);

  return (
    <AppLayout title="Platform Tour" subtitle="Your complete guide to SuperAdPro">

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,#1e1b4b,#2d1b69,#4338ca)', borderRadius: 18,
        padding: '36px 40px 30px', marginBottom: 24, textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(139,92,246,.12)' }}/>
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(59,130,246,.1)' }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Map size={32} color="#fff"/>
          </div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 30, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Platform Tour</div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', lineHeight: 1.7, maxWidth: 550, margin: '0 auto' }}>
            Everything you need to know about SuperAdPro in 10 steps. Click each section to learn more, then use the link to go straight to that area.
          </div>
        </div>
      </div>

      {/* Sticky jump nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', margin: '0 -24px', padding: '12px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {SECTIONS.map(function(s) {
            var isActive = expanded === s.id;
            return <button key={s.id} onClick={function() { setExpanded(s.id); setTimeout(function() { var el = document.getElementById('tour-' + s.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: isActive ? '1.5px solid ' + s.color : '1px solid #e2e8f0', background: isActive ? s.bg : '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: isActive ? 700 : 600, color: isActive ? s.color : '#475569', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .15s' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: isActive ? s.color : s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.Icon size={12} color={isActive ? '#fff' : s.color}/>
              </div>
              {s.title.split(' — ')[0]}
            </button>;
          })}
        </div>
      </div>

      {/* Tour sections */}
      <div style={{ marginTop: 20 }}>
      {SECTIONS.map(function(s, i) {
        var isOpen = expanded === s.id || expanded === null;
        return <div key={s.id} id={'tour-' + s.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 16, overflow: 'hidden', scrollMarginTop: 80 }}>
          {/* Section header */}
          <div onClick={function() { setExpanded(expanded === s.id ? null : s.id); }}
            style={{ padding: '22px 28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.Icon size={24} color={s.color}/>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{s.title}</span>
                  {s.pro && <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(139,92,246,.1)', fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>Pro</span>}
                </div>
                <div style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Step {s.num} of 10</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isOpen ? <ChevronUp size={20} color="#94a3b8"/> : <ChevronDown size={20} color="#94a3b8"/>}
            </div>
          </div>

          {/* Expanded content */}
          {isOpen && (
            <div style={{ padding: '0 28px 28px' }}>
              {/* Image/video placeholder */}
              <div style={{ background: s.bg, borderRadius: 14, aspectRatio: '16/7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '2px dashed ' + s.color + '30', position: 'relative' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
                  <Play size={24} color={s.color}/>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>Screenshot or video coming soon</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>A visual walkthrough of {s.title.split(' — ')[0]} will appear here</div>
              </div>

              {/* Description */}
              <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.8, margin: '0 0 18px' }}>{s.desc}</p>

              {/* Tips */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '18px 22px', marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Key things to know</div>
                {s.tips.map(function(tip, ti) {
                  return <div key={ti} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: ti < s.tips.length - 1 ? 10 : 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, marginTop: 8, flexShrink: 0 }}/>
                    <div style={{ fontSize: 15, color: '#475569', lineHeight: 1.7 }}>{tip}</div>
                  </div>;
                })}
              </div>

              {/* Action button */}
              <Link to={s.link} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 10, textDecoration: 'none',
                background: s.color, color: '#fff', fontSize: 15, fontWeight: 700,
                boxShadow: '0 4px 12px ' + s.color + '30',
              }}>
                {s.linkLabel} <ArrowRight size={16}/>
              </Link>
            </div>
          )}
        </div>;
      })}
      </div>

      {/* Footer */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Ready to start earning?</div>
        <div style={{ fontSize: 15, color: '#64748b', marginBottom: 16 }}>You have seen the full platform. Now it is time to take action.</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/affiliate" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', borderRadius: 10, background: '#0ea5e9', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Share Your Link <ArrowRight size={16}/>
          </Link>
          <Link to="/compensation-plan" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', borderRadius: 10, background: '#fff', border: '1.5px solid #e2e8f0', color: '#475569', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            View Comp Plan <ArrowRight size={16}/>
          </Link>
        </div>
      </div>

    </AppLayout>
  );
}
