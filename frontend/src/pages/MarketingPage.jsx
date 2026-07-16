import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import CategoryShell from '../components/CategoryShell';

// Marketing category page (no sidebar) — affiliate link showcase + materials.

const CSS = `
.cat .tile .t5{background:linear-gradient(135deg,#0e7490,#16a34a);}
.cat .tile .t6{background:linear-gradient(135deg,#0a1438,#0ea5e9);}
.cat .linkbox{margin-top:20px;background:rgba(255,255,255,.08);border:1px solid rgba(103,232,249,.35);border-radius:13px;padding:13px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;max-width:560px;}
.cat .linkbox .lk{flex:1;min-width:200px;font-family:'JetBrains Mono';font-size:14px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cat .linkbox .cpy{background:#fff;color:#0a1438;font-family:'Sora';font-weight:700;font-size:14px;padding:11px 18px;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:8px;}
.cat .linkbox .cpy:hover{transform:translateY(-1px);}
.cat .tile .to1{background:linear-gradient(135deg,#0891b2,#1e3a8a);}
.cat .tile .to2{background:linear-gradient(135deg,#070d24,#f59e0b);}
.cat .tile .to3{background:linear-gradient(135deg,#059669,#f59e0b);}
.cat .tile .to4{background:linear-gradient(135deg,#d946ef,#7c3aed);}
`;

const MATS = [
  { to:'/marketing/lead-magnets', cls:'t5', name:'Lead magnets', desc:'Free done-for-you courses — share the page and grow your list on autopilot.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15a6 6 0 0 0 12 0V3h-4v12a2 2 0 1 1-4 0V3H6z"/><line x1="6" y1="7" x2="10" y2="7"/><line x1="14" y1="7" x2="18" y2="7"/></svg> },
  { ext:'video', cls:'t6', name:'Personal sales video', desc:'Your branded video sales page — share the link with prospects.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z" fill="#fff"/></svg> },
  { to:'/brand-posters', cls:'t3', name:'Brand posters', desc:'Ready-made designs, sized for every platform.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg> },
  { to:'/email-swipes', cls:'t2', name:'Email swipes', desc:'Proven copy — paste, personalise and send.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> },
  { to:'/link-tools', cls:'t1', name:'Link tools', desc:'Smart links and trackers for your promotions.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg> },
];

export default function MarketingPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const refLink = (typeof window !== 'undefined' ? window.location.origin : 'https://www.advantagelife.club') + '/ref/' + (user?.username || '');
  function copyLink() {
    try { navigator.clipboard.writeText(refLink); setCopied(true); setTimeout(function () { setCopied(false); }, 1800); } catch (e) {}
  }
  return (
    <CategoryShell>
      <style>{CSS}</style>
      <div className="phead"><div className="eb">Marketing</div><h1>Promote SuperAdPro</h1><p>Share your link and grow your team with ready-made materials.</p></div>

      <div className="hero">
        <div className="hl">
          <div className="feat">Featured &middot; Your affiliate link</div>
          <h2>Share SuperAdPro, grow your team</h2>
          <p>Everyone who joins through your link becomes part of your network. Share it anywhere — it's always live.</p>
          <div className="linkbox">
            <span className="lk">{refLink}</span>
            <button className="cpy" onClick={copyLink}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a1438" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>{copied ? 'Copied' : 'Copy link'}</button>
          </div>
        </div>
      </div>

      <div className="sect"><h3>Ready-made materials</h3><span>lead magnets, sales video, posters &amp; swipes</span></div>
      <div className="grid">
        {MATS.map(function (m) {
          var inner = (<><div className={'ti ' + m.cls}>{m.icon}</div><h4>{m.name}</h4><p>{m.desc}</p><span className="go">Open &rarr;</span></>);
          if (m.ext === 'video') {
            return (
              <a className="tile" href={refLink + '/video'} target="_blank" rel="noopener noreferrer" key={m.name}>{inner}</a>
            );
          }
          return (
            <Link className="tile" to={m.to} key={m.to}>{inner}</Link>
          );
        })}
      </div>

      <div className="sect"><h3>Your offer page</h3><span>income-forward landing with your link built in — pick a theme, share the URL</span></div>
      <div className="grid">
        {[
          { t:'', cls:'to1', name:'Ocean', desc:'Light, clean, on-brand — with the live earning-grid animation.' },
          { t:'midnight', cls:'to2', name:'Midnight', desc:'Dark navy and gold — the classic opportunity aesthetic.' },
          { t:'emerald', cls:'to3', name:'Emerald', desc:'Greens and gold — the money palette, bright and fresh.' },
          { t:'voltage', cls:'to4', name:'Voltage', desc:'Neon violet and magenta — the scroll-stopper for social.' },
        ].map(function (o) {
          var url = (typeof window !== 'undefined' ? window.location.origin : 'https://www.advantagelife.club') + '/m/offer/' + (user?.username || '') + (o.t ? '?t=' + o.t : '');
          return (
            <a className="tile" href={url} target="_blank" rel="noopener noreferrer" key={o.name}>
              <div className={'ti ' + o.cls}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg></div>
              <h4>Offer page &middot; {o.name}</h4><p>{o.desc}</p><span className="go">Open &rarr;</span>
            </a>
          );
        })}
      </div>
    </CategoryShell>
  );
}
