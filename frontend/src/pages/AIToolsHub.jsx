import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// AdvantageLife — AI Tools hub. Built 12 Jul 2026 to Steve's approved mockup:
// reuses the NewDashboard chrome verbatim (white top bar + account menu,
// floating navy sidebar, .al card grammar), swaps the earnings hero for a
// compact toolkit hero, and drops the 8 carried-over tools in as .card blocks
// where the video + right-rail cards sit on the dashboard. Served at /ai-tools.

const CSS = `
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
/* ── layout: sidebar stretches to bottom of tool grid ── */
.al .cols{display:grid;grid-template-columns:272px 1fr;gap:20px;align-items:stretch}
@media(max-width:980px){.al .cols{grid-template-columns:1fr}.al .side{display:none}}
.al .side{background:linear-gradient(175deg,#0e2a6e,#0a1f52);border-radius:22px;padding:20px 14px;box-shadow:0 24px 50px -24px rgba(10,31,82,.6);display:flex;flex-direction:column}
.al .side a{display:flex;align-items:center;gap:12px;color:#c7d3f2;font-weight:800;font-size:15px;padding:14px 16px;border-radius:13px;margin-bottom:5px}
.al .side a.on{background:linear-gradient(120deg,#c8102e,#e8203f);color:#fff;box-shadow:0 10px 22px -10px rgba(200,16,46,.7)}
.al .side a:not(.on):hover{background:rgba(255,255,255,.07);color:#fff}
/* ── compact hero (replaces earnings hero) ── */
.al .hero{background:#0a1f52;border-radius:24px;color:#fff;display:grid;grid-template-columns:1.15fr 1fr;overflow:hidden;box-shadow:0 30px 60px -28px rgba(10,31,82,.55);margin-bottom:20px}
@media(max-width:820px){.al .hero{grid-template-columns:1fr}}
.al .hero .hl{padding:clamp(24px,3vw,36px);align-self:center}
.al .hero .k{display:flex;align-items:center;gap:10px;font-size:11.5px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#ff8fa0;margin-bottom:14px}
.al .hero .k::before{content:'';width:26px;height:3px;background:#c8102e;border-radius:2px}
.al .hero .htitle{font-weight:900;font-size:clamp(30px,4vw,42px);letter-spacing:-1.4px;line-height:1.04}
.al .hero .cap{font-size:15.5px;font-weight:600;color:#c9d6f7;margin-top:10px;max-width:460px;line-height:1.5}
.al .hero .img{position:relative;min-height:170px;background:url('/static/images/al-plan-bg.jpg') center/cover,#12388f}
.al .hero .img .tag{position:absolute;left:16px;bottom:14px;background:rgba(6,14,40,.72);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.18);border-radius:9px;padding:8px 13px;font-size:10.5px;font-weight:800;letter-spacing:.18em;color:#dbe6ff}
/* ── tool blocks (reuse .card grammar) ── */
.al .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(262px,1fr));gap:20px}
.al .card{background:#fff;border-radius:22px;box-shadow:0 10px 30px -18px rgba(10,31,82,.22);padding:24px;display:flex;flex-direction:column;transition:.17s;border:1.5px solid transparent}
.al a.card:hover{transform:translateY(-3px);box-shadow:0 22px 44px -20px rgba(10,31,82,.4);border-color:#e3e8f4}
.al .card .thead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.al .card .tic{width:54px;height:54px;border-radius:15px;background:linear-gradient(160deg,#eef1fb,#dfe6fa);color:#12388f;display:flex;align-items:center;justify-content:center;flex:none}
.al .card .go{width:34px;height:34px;border-radius:50%;border:1.5px solid #e3e8f4;display:flex;align-items:center;justify-content:center;color:#0a1f52;flex:none;transition:.17s}
.al a.card:hover .go{background:#c8102e;border-color:#c8102e;color:#fff}
.al .card h3{font-weight:900;font-size:19px;letter-spacing:-.4px;margin:0 0 7px}
.al .card .td{font-size:14px;font-weight:600;color:#5a6584;line-height:1.5;flex:1}
.al .card .topen{display:flex;align-items:center;gap:6px;color:#c8102e;font-weight:900;font-size:13.5px;margin-top:16px}
`;

// inline SVG icons (app has no icon font) — stroke uses currentColor (#12388f)
const I = {
  studio: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/></svg>,
  builder: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/></svg>,
  blog: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M7 8.5h10M7 12h10M7 15.5h6"/></svg>,
  linkhub: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 14.5l5-5"/><path d="M11.5 6.5l1-1a4 4 0 015.7 5.7l-2 2"/><path d="M12.5 17.5l-1 1a4 4 0 01-5.7-5.7l2-2"/></svg>,
  linktools: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="2.2" fill="#eef1fb"/><circle cx="16" cy="12" r="2.2" fill="#eef1fb"/><circle cx="10" cy="17" r="2.2" fill="#eef1fb"/></svg>,
  email: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="M4 7.5l8 5.5 8-5.5"/></svg>,
  lead: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20.5 20.5l-4.2-4.2"/></svg>,
  proseller: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>,
};

const TOOLS = [
  { icon: I.studio, name: 'Creative Studio', to: '/creative-studio', desc: 'AI image, video, music, voiceover, lipsync and captions — your creative powerhouse.' },
  { icon: I.builder, name: 'Page Builder', to: '/pro/funnels', desc: 'Drag-and-drop landing pages. Hosted, mobile-ready, conversion-focused.' },
  { icon: I.blog, name: 'My Blog', to: '/my-site', desc: 'Your own blog and website — posts, pages, themes and a custom domain.' },
  { icon: I.linkhub, name: 'Link Hub', to: '/linkhub', desc: 'A single page hosting all your links in one place.' },
  { icon: I.linktools, name: 'Link Tools', to: '/link-tools', desc: 'Shorteners, cloakers, pixel tracking and A/B redirects.' },
  { icon: I.email, name: 'Email Marketing', to: '/pro/leads', desc: 'Email sequences, broadcasts and lead nurture that run on autopilot.' },
  { icon: I.lead, name: 'Lead Finder', to: '/lead-finder', desc: 'Local business and web prospect finder to fill your pipeline.' },
  { icon: I.proseller, name: 'ProSeller', to: '/proseller', desc: 'Your personal AI sales coach — strategy, copy and objection handling.' },
];

export default function AIToolsHub() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = user?.first_name || user?.username || 'there';

  return (
    <div className="al" onClick={function () { if (menuOpen) setMenuOpen(false); }}>
      <style>{CSS}</style>
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
                {user && user.is_admin && (<><div className="sep"></div><Link to="/admin" style={{ color: '#12388f' }}>Admin</Link></>)}
                <div className="sep"></div>
                <a className="out" href="/logout">Sign out</a>
              </div>
            )}
          </div>
        </div>

        <div className="cols">
          <aside className="side">
            <Link to="/home-preview">Dashboard</Link>
            <a className="on" href="/ai-tools">AI Tools</a>
            <Link to="/video-library">Campaigns</Link>
            <Link to="/watch">Watch-to-Earn</Link>
            <a href="/packs">Buy Packs</a>
            <a href="/my-sales">Confirm Sale</a>
            <a href="/payout-methods">Wallet</a>
          </aside>

          <main>
            <div className="hero">
              <div className="hl">
                <div className="k">Your toolkit</div>
                <div className="htitle">AI Tools</div>
                <div className="cap">Everything you need to build pages, capture leads, create content and grow your business — all included with your membership.</div>
              </div>
              <div className="img"><span className="tag">EVERY TOOL · ADVANTAGELIFE</span></div>
            </div>

            <div className="grid">
              {TOOLS.map(function (t) {
                return (
                  <Link key={t.name} className="card" to={t.to}>
                    <div className="thead"><div className="tic">{t.icon}</div><span className="go">→</span></div>
                    <h3>{t.name}</h3>
                    <div className="td">{t.desc}</div>
                    <div className="topen">Open {t.name}</div>
                  </Link>
                );
              })}
            </div>
          </main>
        </div>

      </div>
    </div>
  );
}
