import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// AdvantageLife shared shell — the dashboard chrome (white top bar + account
// menu, floating navy sidebar) extracted so the AI Tools hub and every tool
// page render inside one consistent AL frame. Built 12 Jul 2026.
//
// Props:
//   active   — sidebar key to highlight: dashboard|ai-tools|campaigns|watch|packs|sales|wallet
//   back     — optional { to, label } back-link shown above the main content
//   children — page body (each page brings its own <style> + markup)

const CHROME = `
.al{min-height:100vh;background:#f3f5fb;font-family:'Inter',system-ui,sans-serif;color:#0d1230;padding:18px clamp(12px,2.5vw,28px) 90px}
.al *{box-sizing:border-box}
.al a{text-decoration:none;color:inherit}
.al .shell{max-width:1340px;margin:0 auto}
.al .top{background:#fff;border-radius:18px;box-shadow:0 10px 30px -18px rgba(10,31,82,.25);display:flex;align-items:center;gap:26px;padding:14px 22px;margin-bottom:18px}
.al .logo{display:flex;align-items:center;gap:10px;font-weight:900;font-size:21px;letter-spacing:-.4px;color:#0d1230}
.al .logo .mk{width:38px;height:38px;border-radius:11px;background:linear-gradient(160deg,#12388f,#0a1f52);display:flex;align-items:center;justify-content:center;flex:none}
.al .logo .life{color:#c8102e}
.al .sp{flex:1}
.al .avatar-btn{width:42px;height:42px;border-radius:12px;background:#0a1f52;color:#fff;font-weight:900;font-size:14px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}
.al .acct{position:relative}
.al .menu{position:absolute;right:0;top:52px;background:#fff;border:1.5px solid #e3e8f4;border-radius:14px;box-shadow:0 24px 50px -20px rgba(10,31,82,.35);min-width:230px;padding:8px;z-index:60}
.al .menu .mhead{padding:10px 12px;border-bottom:1.5px solid #eef1f8;margin-bottom:6px}
.al .menu .mhead b{display:block;font-weight:900;font-size:14px}
.al .menu .mhead span{font-size:12px;color:#5a6584;font-weight:600}
.al .menu a{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:9px;font-size:13.5px;font-weight:700;color:#2a3352}
.al .menu a:hover{background:#f3f5fb}
.al .menu .sep{height:1.5px;background:#eef1f8;margin:6px 0}
.al .menu .out{color:#c8102e}
.al .cols{display:grid;grid-template-columns:272px 1fr;gap:20px;align-items:stretch}
.al .cols > main{min-width:0;max-width:100%}
@media(max-width:980px){.al .cols{grid-template-columns:1fr}.al .side{display:none}}
.al .side{background:linear-gradient(175deg,#0e2a6e,#0a1f52);border-radius:22px;padding:20px 14px;box-shadow:0 24px 50px -24px rgba(10,31,82,.6);display:flex;flex-direction:column}
.al .side a{display:flex;align-items:center;gap:12px;color:#c7d3f2;font-weight:800;font-size:15px;padding:14px 16px;border-radius:13px;margin-bottom:5px}
.al .side a.on{background:linear-gradient(120deg,#c8102e,#e8203f);color:#fff;box-shadow:0 10px 22px -10px rgba(200,16,46,.7)}
.al .side a:not(.on):hover{background:rgba(255,255,255,.07);color:#fff}
.al .albk{display:inline-flex;align-items:center;gap:6px;color:#5a6584;font-weight:800;font-size:12.5px;margin-bottom:12px}
.al .albk:hover{color:#c8102e}
`;

const NAV = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard', link: true },
  { header: 'GET STARTED' },
  { key: 'start', label: 'Start Here', to: '/start-here', link: false, big: true },
  { key: 'packs', label: 'Create Campaign', to: '/packs?new=1', link: false },
  { key: 'campaigns', label: 'My Campaigns', to: '/campaigns', link: true },
  { key: 'performance', label: 'Performance', to: '/campaign-analytics', link: true },
  { key: 'wallet', label: 'Payment Details', to: '/payout-methods', link: false },
  { key: 'watch', label: 'Daily Watch', to: '/watch', link: true },
  { header: 'RUN YOUR BUSINESS' },
  { key: 'sales', label: 'Confirm a Sale', to: '/my-sales', link: false },
  { key: 'team', label: 'My Team', to: '/my-team', link: true },
  { key: 'leaderboard', label: 'Leaderboard', to: '/leaderboard', link: true },
  { key: 'ai-tools', label: 'Marketing Tools', to: '/ai-tools', link: true },
  { key: 'marketing', label: 'My Marketing', to: '/my-marketing', link: true },
  { key: 'comp', label: 'Compensation Plan', to: '/compensation-plan', link: true },
  { header: 'MORE' },
  { key: 'wisdom', label: 'Daily Wisdom', to: '/wisdom', link: true },
  { key: 'extras', label: 'Vetted Extras', to: '/collaborations', link: true },
];

// Group the flat NAV into collapsible sections keyed by their header.
const NAV_GROUPS = (function () {
  const groups = []; let cur = { header: null, items: [] };
  NAV.forEach(function (n) {
    if (n.header) { if (cur.items.length || cur.header) groups.push(cur); cur = { header: n.header, items: [] }; }
    else cur.items.push(n);
  });
  if (cur.items.length || cur.header) groups.push(cur);
  return groups;
})();

export default function AlShell({ active, back, children }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(function () {
    try { return JSON.parse(localStorage.getItem('al_nav_collapsed') || '{}') || {}; } catch (e) { return {}; }
  });
  // Which section contains the current page — it starts open by default.
  const activeHeader = (function () {
    for (var i = 0; i < NAV_GROUPS.length; i++) {
      var g = NAV_GROUPS[i];
      if (g.header && g.items.some(function (n) { return n.key === active; })) return g.header;
    }
    return null;
  })();
  function isCollapsed(h) {
    if (!h) return false;
    return (h in collapsed) ? !!collapsed[h] : (h !== activeHeader);
  }
  function toggleGroup(h) {
    setCollapsed(function (prev) {
      const next = Object.assign({}, prev); next[h] = !((h in prev) ? prev[h] : (h !== activeHeader));
      try { localStorage.setItem('al_nav_collapsed', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }
  const name = user?.first_name || user?.username || 'there';

  return (
    <div className="al" onClick={function () { if (menuOpen) setMenuOpen(false); }}>
      <style>{CHROME}</style>
      <div className="shell">

        <div className="top">
          <span className="logo">
            <span className="mk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 17L9 10l4 4 8-9" stroke="#ff2743" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 5h6v6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            <span>Advantage<span className="life">Life</span></span>
          </span>
          <span className="sp"></span>
          <div className="acct" onClick={function (e) { e.stopPropagation(); }}>
            <button className="avatar-btn" onClick={function () { setMenuOpen(function (o) { return !o; }); }} aria-label="Menu" aria-expanded={menuOpen}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
            {menuOpen && (
              <div className="menu">
                <div className="mhead"><b>{name}</b><span>@{user?.username || ''}</span></div>
                <Link to="/account">Profile</Link>
                <Link to="/account?tab=security">Security</Link>
                <a href="/support-center">Support</a>
                {user && user.is_admin && (<><div className="sep"></div><Link to="/admin/al" style={{ color: '#c8102e', fontWeight: 900 }}>Admin</Link></>)}
                <div className="sep"></div>
                <a className="out" href="/logout">Sign out</a>
              </div>
            )}
          </div>
        </div>

        <div className="cols">
          <aside className="side">
            {NAV_GROUPS.map(function (g, gi) {
              const isCol = isCollapsed(g.header);
              function renderItem(n) {
                const cls = n.key === active ? 'on' : undefined;
                if (n.big) {
                  return <a key={n.key} className={cls} href={n.to} style={{ fontSize: 18, fontWeight: 900, color: '#2ecc71' }}><span style={{ fontSize: 20 }}>⭐</span> {n.label}</a>;
                }
                return n.link
                  ? <Link key={n.key} className={cls} to={n.to}>{n.label}</Link>
                  : <a key={n.key} className={cls} href={n.to}>{n.label}</a>;
              }
              if (!g.header) {
                return <div key={'g' + gi}>{g.items.map(renderItem)}</div>;
              }
              return (
                <div key={'g' + gi} style={{ marginTop: 8 }}>
                  <div onClick={function () { toggleGroup(g.header); }} role="button" aria-expanded={!isCol}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', padding: '11px 13px', borderRadius: 11, background: isCol ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.10)', marginBottom: isCol ? 0 : 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.82)' }}>{g.header}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ transform: isCol ? 'rotate(-90deg)' : 'none', transition: 'transform .18s ease', flex: 'none' }}>
                      <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.65)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ overflow: 'hidden', maxHeight: isCol ? 0 : 1000, transition: 'max-height .22s ease', paddingLeft: 4 }}>
                    {g.items.map(renderItem)}
                  </div>
                </div>
              );
            })}
          </aside>

          <main>
            {back && <Link className="albk" to={back.to}>&larr; {back.label}</Link>}
            {children}
          </main>
        </div>

      </div>
    </div>
  );
}
