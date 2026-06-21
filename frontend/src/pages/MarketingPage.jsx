import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import CategoryShell from '../components/CategoryShell';

// Marketing category page (no sidebar) — affiliate link showcase + materials.

const CSS = `
.cat .linkbox{margin-top:20px;background:rgba(255,255,255,.08);border:1px solid rgba(103,232,249,.35);border-radius:13px;padding:13px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;max-width:560px;}
.cat .linkbox .lk{flex:1;min-width:200px;font-family:'JetBrains Mono';font-size:14px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cat .linkbox .cpy{background:#fff;color:#0a1438;font-family:'Sora';font-weight:700;font-size:14px;padding:11px 18px;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:8px;}
.cat .linkbox .cpy:hover{transform:translateY(-1px);}
`;

const MATS = [
  { to:'/brand-posters', cls:'t3', name:'Brand posters', desc:'Ready-made designs, sized for every platform.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg> },
  { to:'/email-swipes', cls:'t2', name:'Email swipes', desc:'Proven copy — paste, personalise and send.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> },
  { to:'/link-tools', cls:'t1', name:'Link tools', desc:'Smart links and trackers for your promotions.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg> },
];

export default function MarketingPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const refLink = 'https://www.superadpro.com/ref/' + (user?.username || '');
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

      <div className="sect"><h3>Ready-made materials</h3><span>posters, swipes and link tools</span></div>
      <div className="grid">
        {MATS.map(function (m) {
          return (
            <Link className="tile" to={m.to} key={m.to}>
              <div className={'ti ' + m.cls}>{m.icon}</div>
              <h4>{m.name}</h4>
              <p>{m.desc}</p>
              <span className="go">Open &rarr;</span>
            </Link>
          );
        })}
      </div>
    </CategoryShell>
  );
}
