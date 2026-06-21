import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Shared chrome for the new category pages: top bar (logo + back to dashboard +
// hamburger account menu), no sidebar. Children render inside the same .wrap.
// Design tokens are defined on .cat so page-level CSS (also scoped .cat) can use them.

const SHELL_CSS = `
.cat{--ink:#0a1438;--ink2:#15275f;--cobalt:#1e3a8a;--cyan:#06b6d4;--cyanb:#22d3ee;--cyans:#67e8f9;
  --bg:#eaf0fa;--card:#fff;--line:#e4eaf3;--muted:#64748b;--text:#0f172a;
  --shadow:0 10px 30px rgba(10,20,56,.08);--shadow-lg:0 22px 50px rgba(10,20,56,.16);
  --lift:inset 0 1px 0 rgba(255,255,255,.9),0 2px 6px rgba(10,20,56,.09),0 20px 44px rgba(10,20,56,.18);
  font-family:'DM Sans',system-ui,sans-serif;color:var(--text);min-height:100vh;
  background:radial-gradient(900px 500px at 12% -8%,rgba(34,211,238,.16),transparent 60%),
    radial-gradient(800px 520px at 96% 4%,rgba(30,58,138,.16),transparent 55%),var(--bg);
  padding:20px clamp(14px,4vw,40px) 60px;}
.cat *{margin:0;padding:0;box-sizing:border-box;}
.cat h1,.cat h2,.cat h3,.cat h4{font-family:'Sora','DM Sans',sans-serif;}
.cat .mono{font-family:'JetBrains Mono',monospace;}
.cat .wrap{max-width:1120px;margin:0 auto;}
.cat .top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:22px;}
.cat .tl{display:flex;align-items:center;gap:16px;}
.cat .brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.cat .brand .lm{width:30px;height:30px;border-radius:50%;background:#0ea5e9;display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:0 4px 12px rgba(14,165,233,.35);}
.cat .brand .wm{font-family:'Sora';font-weight:800;font-size:20px;color:var(--ink);letter-spacing:-.3px;line-height:1;}
.cat .brand .wm .pro{color:#0ea5e9;}
.cat .back{display:flex;align-items:center;gap:7px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:8px 15px;font-size:13px;font-weight:600;color:var(--cobalt);box-shadow:var(--shadow);text-decoration:none;}
.cat .back:hover{gap:9px;}
.cat .acct{position:relative;}
.cat .burger{width:48px;height:44px;border-radius:12px;background:var(--card);border:1px solid var(--line);box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;color:var(--ink);cursor:pointer;transition:border-color .2s,box-shadow .2s,background .2s;}
.cat .burger:hover{border-color:var(--cyanb);box-shadow:var(--shadow-lg);}
.cat .burger.open{border-color:var(--cyanb);background:#f4fbff;}
.cat .menu{position:absolute;right:0;top:54px;width:216px;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);padding:8px;z-index:50;}
.cat .menu .mhead{padding:8px 12px;border-bottom:1px solid var(--line);margin-bottom:6px;}
.cat .menu .mhead b{font-family:'Sora';font-size:14px;color:var(--ink);display:block;}
.cat .menu .mhead span{font-family:'JetBrains Mono';font-size:11px;color:var(--muted);}
.cat .menu a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;font-size:13.5px;font-weight:600;color:#334155;text-decoration:none;}
.cat .menu a:hover{background:#f4f8fd;}
.cat .menu a svg{color:#94a3b8;flex:0 0 auto;}
.cat .menu .sep{height:1px;background:var(--line);margin:6px 0;}
.cat .menu a.out{color:#b91c1c;}
.cat .menu a.out svg{color:#b91c1c;}
.cat .phead{margin-bottom:18px;}
.cat .phead .eb{font-family:'JetBrains Mono';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#0e7490;}
.cat .phead h1{font-size:clamp(24px,3.6vw,32px);font-weight:800;color:var(--ink);letter-spacing:-.5px;margin-top:4px;}
.cat .phead p{color:var(--muted);font-size:14.5px;margin-top:4px;}
.cat .hero{position:relative;overflow:hidden;border-radius:22px;background:linear-gradient(120deg,#0a1438 0%,#15275f 52%,#1e3a8a 120%);color:#fff;box-shadow:var(--shadow-lg);padding:32px clamp(24px,3.6vw,40px);display:flex;align-items:center;gap:clamp(24px,4vw,48px);margin-bottom:30px;}
.cat .hero::after{content:'';position:absolute;right:-80px;top:-90px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.2),transparent 65%);}
.cat .hero .hl{z-index:1;flex:1;min-width:0;}
.cat .hero .feat{font-family:'JetBrains Mono';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--cyans);}
.cat .hero h2{font-size:clamp(24px,3vw,32px);font-weight:800;margin:8px 0 10px;letter-spacing:-.4px;}
.cat .hero p{color:#cfe0fb;font-size:15px;max-width:460px;line-height:1.55;}
.cat .hero .cta{margin-top:20px;display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#22d3ee,#06b6d4);color:#0a1438;font-family:'Sora';font-weight:800;font-size:15px;padding:14px 24px;border-radius:13px;box-shadow:0 12px 28px rgba(6,182,212,.4);text-decoration:none;transition:transform .2s,box-shadow .2s;}
.cat .hero .cta:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(6,182,212,.55);}
.cat .hero .hr{z-index:1;flex:0 0 auto;width:300px;}
.cat .prev{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 24px 50px rgba(0,0,0,.32);}
.cat .prev .bar{height:30px;background:#f1f5f9;display:flex;align-items:center;gap:6px;padding:0 12px;}
.cat .prev .bar i{width:9px;height:9px;border-radius:50%;background:#cbd5e1;}
.cat .prev .body{padding:16px;}
.cat .prev .h{height:42px;border-radius:8px;background:linear-gradient(135deg,#1e3a8a,#06b6d4);margin-bottom:10px;}
.cat .prev .l{height:9px;border-radius:5px;background:#e2e8f0;margin-bottom:7px;}
.cat .prev .l.s{width:60%;}
.cat .prev .btn{height:26px;width:96px;border-radius:7px;background:#22d3ee;margin-top:12px;}
.cat .sect{display:flex;align-items:baseline;gap:12px;margin:0 2px 16px;}
.cat .sect h3{font-family:'Sora';font-size:18px;font-weight:800;color:var(--ink);}
.cat .sect span{font-size:13px;color:var(--muted);}
.cat .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;}
.cat .tile{position:relative;background:#fff;border:1px solid #d4ddea;border-radius:16px;padding:20px;cursor:pointer;box-shadow:var(--lift);transition:border-color .2s;display:flex;flex-direction:column;gap:10px;text-decoration:none;}
.cat .tile:hover{border-color:var(--cyanb);}
.cat .tile .ti{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;}
.cat .tile .t1{background:linear-gradient(135deg,#1e3a8a,#3b82f6);}
.cat .tile .t2{background:linear-gradient(135deg,#0891b2,#22d3ee);}
.cat .tile .t3{background:linear-gradient(135deg,#7c3aed,#a855f7);}
.cat .tile .t4{background:linear-gradient(135deg,#0e7490,#06b6d4);}
.cat .tile h4{font-family:'Sora';font-size:16px;font-weight:700;color:var(--ink);}
.cat .tile p{font-size:12.5px;color:var(--muted);line-height:1.4;}
.cat .tile .go{margin-top:auto;display:inline-flex;align-items:center;gap:7px;font-family:'Sora';font-weight:700;font-size:13px;color:var(--cobalt);}
@media (max-width:820px){.cat .hero{flex-direction:column;align-items:flex-start;}.cat .hero .hr{width:100%;max-width:340px;}.cat .grid{grid-template-columns:1fr;}}
`;

export default function CategoryShell({ children, backTo = '/home-preview', backLabel = 'Dashboard' }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = user?.first_name || user?.username || 'there';

  return (
    <div className="cat" onClick={function () { if (menuOpen) setMenuOpen(false); }}>
      <style>{SHELL_CSS}</style>
      <div className="wrap">
        <div className="top">
          <div className="tl">
            <Link className="brand" to="/home-preview">
              <span className="lm"><svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg></span>
              <span className="wm">SuperAd<span className="pro">Pro</span></span>
            </Link>
            <Link className="back" to={backTo}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>{backLabel}</Link>
          </div>
          <div className="acct" onClick={function (e) { e.stopPropagation(); }}>
            <button className={'burger' + (menuOpen ? ' open' : '')} onClick={function () { setMenuOpen(function (o) { return !o; }); }} aria-label="Account menu" aria-expanded={menuOpen}>
              {menuOpen
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>}
            </button>
            {menuOpen && (
              <div className="menu">
                <div className="mhead"><b>{name}</b><span>@{user?.username || ''}</span></div>
                <Link to="/account"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>Profile</Link>
                <Link to="/account"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>Membership &amp; billing</Link>
                <Link to="/account"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>Security</Link>
                <Link to="/account"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>Payouts</Link>
                <Link to="/account"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></svg>Verification</Link>
                <div className="sep"></div>
                <a className="out" href="/logout"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>Sign out</a>
              </div>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
