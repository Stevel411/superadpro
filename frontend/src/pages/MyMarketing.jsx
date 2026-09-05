import { useNavigate } from 'react-router-dom';
import AlShell from '../components/layout/AlShell';
import NetworkAd from '../components/NetworkAd';
import { useAuth } from '../hooks/useAuth';

// ── My Marketing hub — AL-themed (Inter, navy/red/white) ─────────────
// Rebuilt 3 Aug 2026 onto the Marketing Tools design language so the two
// hubs are visual siblings: Marketing Tools = the tools to build,
// My Marketing = the member's ready-to-share assets. Each card opens the
// member's own personalised link (public /ref pages) or an in-app tool.

const CSS = `
.al .mmhero{background:#0a1f52;border-radius:24px;color:#fff;display:grid;grid-template-columns:1.15fr 1fr;overflow:hidden;box-shadow:0 30px 60px -28px rgba(10,31,82,.55);margin-bottom:22px}
@media(max-width:820px){.al .mmhero{grid-template-columns:1fr}}
.al .mmhero .hl{padding:clamp(24px,3vw,36px);align-self:center}
.al .mmhero .k{display:flex;align-items:center;gap:10px;font-size:11.5px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#ff8fa0;margin-bottom:14px}
.al .mmhero .k::before{content:'';width:26px;height:3px;background:#c8102e;border-radius:2px}
.al .mmhero .htitle{font-weight:900;font-size:clamp(30px,4vw,42px);letter-spacing:-1.4px;line-height:1.04}
.al .mmhero .cap{font-size:15.5px;font-weight:600;color:#c9d6f7;margin-top:10px;max-width:460px;line-height:1.5}
.al .mmhero .img{position:relative;min-height:170px;background:radial-gradient(120% 90% at 80% 10%,rgba(200,16,46,.5),rgba(200,16,46,0) 60%),linear-gradient(160deg,#12388f,#0a1f52)}
.al .mmhero .img .tag{position:absolute;left:16px;bottom:14px;background:rgba(6,14,40,.72);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.18);border-radius:9px;padding:8px 13px;font-size:10.5px;font-weight:800;letter-spacing:.18em;color:#dbe6ff}
.al .mmgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(262px,1fr));gap:20px}
.al .mmcard{background:#fff;border-radius:22px;box-shadow:0 10px 30px -18px rgba(10,31,82,.22);padding:24px;display:flex;flex-direction:column;transition:.17s;border:1.5px solid transparent;position:relative;cursor:pointer;text-align:left}
.al .mmcard:hover{transform:translateY(-3px);box-shadow:0 22px 44px -20px rgba(10,31,82,.4);border-color:#e3e8f4}
.al .mmcard:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(200,16,46,.32)}
.al .mmcard.feat{border-color:#f7c1cb;box-shadow:0 16px 34px -18px rgba(200,16,46,.28)}
.al .mmcard .thead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.al .mmcard .tic{width:54px;height:54px;border-radius:15px;background:linear-gradient(160deg,#eef1fb,#dfe6fa);color:#12388f;display:flex;align-items:center;justify-content:center;flex:none}
.al .mmcard.feat .tic{background:linear-gradient(160deg,#c8102e,#ff2743);color:#fff}
.al .mmcard .go{width:34px;height:34px;border-radius:50%;border:1.5px solid #e3e8f4;display:flex;align-items:center;justify-content:center;color:#0a1f52;flex:none;transition:.17s;font-weight:900}
.al .mmcard:hover .go{background:#c8102e;border-color:#c8102e;color:#fff}
.al .mmcard h3{font-weight:900;font-size:19px;letter-spacing:-.4px;margin:0 0 7px;color:#0a1f52}
.al .mmcard .td{font-size:14px;font-weight:600;color:#5a6584;line-height:1.5;flex:1}
.al .mmcard .topen{display:flex;align-items:center;gap:6px;color:#c8102e;font-weight:900;font-size:13.5px;margin-top:16px}
.al .mmcard .badge{position:absolute;top:16px;right:58px;background:#c8102e;color:#fff;font-size:9.5px;font-weight:900;letter-spacing:.08em;padding:3px 9px;border-radius:6px}
.al .mmcard .tic svg{width:26px;height:26px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
`;

const I = {
  sales: <svg viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  video: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
  link: <svg viewBox="0 0 24 24"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  plan: <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2.2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>,
  email: <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M4 7.5l8 5.5 8-5.5"/></svg>,
  lead: <svg viewBox="0 0 24 24"><path d="M6 4v7a6 6 0 0 0 12 0V4"/><path d="M4 4h4M16 4h4"/><path d="M12 17v3"/></svg>,
  daily: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2.2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="M8.5 15l2.2 2.2L15 13"/></svg>,
};

export default function MyMarketing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const origin = (typeof window !== 'undefined' ? window.location.origin : 'https://www.advantagelife.club');
  const refBase = origin + '/ref/' + (user && user.username ? user.username : '');

  function go(path, external) {
    return function () {
      if (external) { window.open(path, '_blank', 'noopener'); }
      else { navigate(path); }
    };
  }

  const cards = [
    { key: 'daily', icon: I.daily, feat: true, badge: 'NEW',
      title: 'Daily Sales Post',
      desc: 'A fresh, ready-to-post message every day \u2014 with your link built in. Tap, copy, post.',
      open: 'Get today\u2019s post', onClick: go('/my-marketing/daily-post') },
    { key: 'sales', icon: I.sales, feat: true, badge: 'NEW',
      title: 'Your Sales Page',
      desc: 'Pick a design — light, dark or bold — and grab your personalised link. Videos built in.',
      open: 'Choose & share', onClick: go('/my-marketing/sales-pages') },
    { key: 'video', icon: I.video,
      title: 'Personal Sales Video',
      desc: 'Your branded video sales page — a focused pitch to send a prospect.',
      open: 'Open your video', onClick: go(refBase + '/video', true) },
    { key: 'link', icon: I.link,
      title: 'Affiliate Link & Social Share',
      desc: 'Your referral link, QR code and ready-made social posts.',
      open: 'Open', onClick: go('/social-share') },
    { key: 'plan', icon: I.plan,
      title: 'Compensation Plan',
      desc: 'Walk a prospect through the full earning plan, or share the link.',
      open: 'Open', onClick: go('/compensation-plan') },
    { key: 'email', icon: I.email,
      title: 'Email Swipes',
      desc: 'Pre-written emails you can personalise and send.',
      open: 'Open', onClick: go('/email-swipes') },
    { key: 'lead', icon: I.lead,
      title: 'Lead Magnets',
      desc: 'Done-for-you pages that grow your list on autopilot.',
      open: 'Open', onClick: go('/my-marketing/lead-magnets') },
  ];

  return (
    <AlShell active="marketing">
      <style>{CSS}</style>

      <div className="mmhero">
        <div className="hl">
          <div className="k">Share &amp; promote</div>
          <div className="htitle">My Marketing</div>
          <div className="cap">Your ready-to-share sales pages, videos, swipes and materials — everything you hand a prospect, all in one place.</div>
        </div>
        <div className="img"><span className="tag">SHARE IT &middot; ADVANTAGELIFE</span></div>
      </div>

      <NetworkAd size="728x90" />
      <div className="mmgrid">
        {cards.map(function (c) {
          return (
            <div key={c.key}
                 className={'mmcard' + (c.feat ? ' feat' : '')}
                 onClick={c.onClick}
                 role="button" tabIndex={0}
                 onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.onClick(); } }}>
              {c.badge ? <span className="badge">{c.badge}</span> : null}
              <div className="thead"><div className="tic">{c.icon}</div><span className="go">&rarr;</span></div>
              <h3>{c.title}</h3>
              <div className="td">{c.desc}</div>
              <div className="topen">{c.open} &rarr;</div>
            </div>
          );
        })}
      </div>
    </AlShell>
  );
}
