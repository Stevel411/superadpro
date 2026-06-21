import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Shared no-sidebar top bar used by both the category pages (CategoryShell) and
// the category DESTINATION pages (AppLayout category mode). Two exits:
//   - logo  -> dashboard (/home-preview), always
//   - back  -> the parent category page (configurable per page)
// Self-contained: own state, own outside-click close, own scoped CSS with
// hard-coded brand colours so it renders correctly in any layout context.

const CSS = `
.ctb{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;font-family:'DM Sans',system-ui,sans-serif;}
.ctb *{box-sizing:border-box;}
.ctb .tl{display:flex;align-items:center;gap:16px;}
.ctb .brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.ctb .brand .lm{width:30px;height:30px;border-radius:50%;background:#0ea5e9;display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:0 4px 12px rgba(14,165,233,.35);}
.ctb .brand .wm{font-family:'Sora','DM Sans',sans-serif;font-weight:800;font-size:20px;color:#0a1438;letter-spacing:-.3px;line-height:1;}
.ctb .brand .wm .pro{color:#0ea5e9;}
.ctb .back{display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #e4eaf3;border-radius:999px;padding:8px 15px;font-size:13px;font-weight:600;color:#1e3a8a;box-shadow:0 10px 30px rgba(10,20,56,.08);text-decoration:none;transition:gap .2s,border-color .2s;}
.ctb .back:hover{gap:9px;border-color:#22d3ee;}
.ctb .rt{display:flex;align-items:center;gap:10px;}
.ctb .bal{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid #e4eaf3;border-radius:999px;padding:6px 15px 6px 12px;text-decoration:none;box-shadow:0 10px 30px rgba(10,20,56,.08);transition:border-color .2s,box-shadow .2s;}
.ctb .bal:hover{border-color:#22d3ee;box-shadow:0 22px 50px rgba(10,20,56,.16);}
.ctb .bal .ico{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#06b6d4,#0ea5e9);display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.ctb .bal .txt{display:flex;flex-direction:column;line-height:1.05;}
.ctb .bal .l{font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#64748b;}
.ctb .bal .a{font-family:'Sora','DM Sans',sans-serif;font-size:15px;font-weight:800;color:#0a1438;}
.ctb .acct{position:relative;}
.ctb .burger{width:48px;height:44px;border-radius:12px;background:#fff;border:1px solid #e4eaf3;box-shadow:0 10px 30px rgba(10,20,56,.08);display:flex;align-items:center;justify-content:center;color:#0a1438;cursor:pointer;transition:border-color .2s,box-shadow .2s,background .2s;}
.ctb .burger:hover{border-color:#22d3ee;box-shadow:0 22px 50px rgba(10,20,56,.16);}
.ctb .burger.open{border-color:#22d3ee;background:#f4fbff;}
.ctb .menu{position:absolute;right:0;top:54px;width:216px;background:#fff;border:1px solid #e4eaf3;border-radius:14px;box-shadow:0 22px 50px rgba(10,20,56,.16);padding:8px;z-index:1200;}
.ctb .menu .mhead{padding:8px 12px;border-bottom:1px solid #e4eaf3;margin-bottom:6px;}
.ctb .menu .mhead b{font-family:'Sora','DM Sans',sans-serif;font-size:14px;color:#0a1438;display:block;}
.ctb .menu .mhead span{font-family:'JetBrains Mono',monospace;font-size:11px;color:#64748b;}
.ctb .menu a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;font-size:13.5px;font-weight:600;color:#334155;text-decoration:none;}
.ctb .menu a:hover{background:#f4f8fd;}
.ctb .menu a svg{color:#94a3b8;flex:0 0 auto;}
.ctb .menu .sep{height:1px;background:#e4eaf3;margin:6px 0;}
.ctb .menu a.out{color:#b91c1c;}
.ctb .menu a.out svg{color:#b91c1c;}
@media(max-width:560px){
  .ctb .back{padding:8px 11px;}
  .ctb .back .bl{display:none;}
  .ctb .bal{padding:6px 12px 6px 10px;gap:7px;}
  .ctb .bal .ico{width:26px;height:26px;}
  .ctb .bal .l{display:none;}
  .ctb .bal .a{font-size:13.5px;}
}
`;

export default function CategoryTopBar({ backTo = '/home-preview', backLabel = 'Dashboard' }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const acctRef = useRef(null);
  const name = (user && (user.first_name || user.username)) || 'there';
  const bal = Number((user && user.balance) || 0);

  useEffect(function () {
    if (!menuOpen) return undefined;
    function onDown(e) {
      if (acctRef.current && !acctRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return function () { document.removeEventListener('mousedown', onDown); };
  }, [menuOpen]);

  return (
    <div className="ctb">
      <style>{CSS}</style>
      <div className="tl">
        <Link className="brand" to="/home-preview">
          <span className="lm"><svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg></span>
          <span className="wm">SuperAd<span className="pro">Pro</span></span>
        </Link>
        <Link className="back" to={backTo}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg><span className="bl">{backLabel}</span></Link>
      </div>
      <div className="rt">
        <Link className="bal" to="/wallet" aria-label="Wallet — available balance">
          <span className="ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M16 14h2"/></svg></span>
          <span className="txt"><span className="l">Available</span><span className="a">${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
        </Link>
        <div className="acct" ref={acctRef}>
        <button className={'burger' + (menuOpen ? ' open' : '')} onClick={function () { setMenuOpen(function (o) { return !o; }); }} aria-label="Account menu" aria-expanded={menuOpen}>
          {menuOpen
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>}
        </button>
        {menuOpen && (
          <div className="menu">
            <div className="mhead"><b>{name}</b><span>@{(user && user.username) || ''}</span></div>
            <Link to="/account"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>Profile</Link>
            <Link to="/account?tab=billing"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>Membership &amp; billing</Link>
            <Link to="/account?tab=security"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>Security</Link>
            <Link to="/account?tab=payouts"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>Payouts</Link>
            <Link to="/account?tab=verification"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></svg>Verification</Link>
            <div className="sep"></div>
            <a className="out" href="/logout"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>Sign out</a>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
