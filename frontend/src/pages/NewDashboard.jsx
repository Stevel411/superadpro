import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { formatMoney } from '../utils/money';

// Three-tier dashboard (platform simplification): Watch-to-Earn gateway, affiliate
// share bar, Income (current balance), and a "Your Business" section of category
// gateway cards (Tool Kit / Marketing / Campaign Tiers / Team).
// Wired to real data: /api/dashboard + /api/watch. Served at /home-preview.

const CSS = `
.nd{--ink:#0a1438;--ink2:#15275f;--cobalt:#1e3a8a;--cyan:#06b6d4;--cyanb:#22d3ee;--cyans:#67e8f9;
  --bg:#eaf0fa;--card:#fff;--line:#e4eaf3;--muted:#64748b;--text:#0f172a;
  --shadow:0 10px 30px rgba(10,20,56,.08);--shadow-lg:0 22px 50px rgba(10,20,56,.16);
  font-family:'DM Sans',system-ui,sans-serif;color:var(--text);min-height:100vh;
  background:radial-gradient(900px 500px at 12% -8%,rgba(34,211,238,.16),transparent 60%),
    radial-gradient(800px 520px at 96% 4%,rgba(30,58,138,.16),transparent 55%),var(--bg);
  padding:20px clamp(14px,4vw,40px) 60px;}
.nd *{margin:0;padding:0;box-sizing:border-box;}
.nd h1,.nd h2,.nd h3{font-family:'Sora','DM Sans',sans-serif;}
.nd .mono{font-family:'JetBrains Mono',monospace;}
.nd .wrap{max-width:1120px;margin:0 auto;}
.nd .top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:24px;}
.nd .brand{font-family:'Sora';font-weight:800;font-size:20px;color:var(--ink);display:flex;align-items:center;gap:9px;}
.nd .brand .dot{width:11px;height:11px;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--cyanb));box-shadow:0 0 0 4px rgba(34,211,238,.18);}
.nd .chips{display:flex;gap:10px;align-items:center;}
.nd .chip{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:8px 14px;display:flex;align-items:center;gap:8px;box-shadow:var(--shadow);font-size:13px;font-weight:600;text-decoration:none;color:var(--text);}
.nd .chip .lbl{font-family:'JetBrains Mono';font-size:10px;letter-spacing:.5px;color:var(--muted);text-transform:uppercase;}
.nd .chip b{font-family:'Sora';font-weight:700;color:var(--ink);}
.nd .chip.tier b{color:var(--cyan);}
.nd .acct{position:relative;}
.nd .avatar-btn{width:42px;height:42px;border-radius:13px;background:linear-gradient(135deg,#1e3a8a,#06b6d4);border:2px solid #fff;box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;font-family:'Sora';font-weight:800;font-size:15px;color:#fff;cursor:pointer;}
.nd .menu{position:absolute;right:0;top:52px;width:212px;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);padding:8px;z-index:40;}
.nd .menu .mhead{padding:8px 12px 8px;border-bottom:1px solid var(--line);margin-bottom:6px;}
.nd .menu .mhead b{font-family:'Sora';font-size:14px;color:var(--ink);display:block;}
.nd .menu .mhead span{font-family:'JetBrains Mono';font-size:11px;color:var(--muted);}
.nd .menu a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;font-size:13.5px;font-weight:600;color:#334155;text-decoration:none;}
.nd .menu a:hover{background:#f4f8fd;}
.nd .menu a svg{color:#94a3b8;}
.nd .menu .sep{height:1px;background:var(--line);margin:6px 0;}
.nd .menu a.out{color:#b91c1c;}
.nd .greet{margin-bottom:20px;}
.nd .greet h1{font-size:clamp(22px,3.4vw,30px);font-weight:800;color:var(--ink);letter-spacing:-.5px;}
.nd .greet p{color:var(--muted);font-size:15px;margin-top:5px;max-width:580px;}
/* WATCH */
.nd .watch{position:relative;border-radius:22px;overflow:hidden;background:linear-gradient(120deg,#0a1438 0%,#15275f 48%,#0e7490 120%);color:#fff;box-shadow:var(--shadow-lg);padding:28px clamp(22px,3.6vw,40px);display:flex;align-items:center;gap:clamp(20px,4vw,52px);text-decoration:none;transition:transform .35s,box-shadow .35s;margin-bottom:16px;}
.nd .watch:hover{transform:translateY(-4px);box-shadow:0 30px 64px rgba(8,116,118,.34);}
.nd .watch::after{content:'';position:absolute;right:-60px;top:-80px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.22),transparent 65%);}
.nd .w-left{display:flex;align-items:center;gap:clamp(18px,3vw,30px);z-index:1;flex:1;min-width:0;}
.nd .playwrap{position:relative;width:90px;height:90px;flex:0 0 auto;}
.nd .pulse{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(103,232,249,.5);animation:ndpulse 2.4s ease-out infinite;}
.nd .pulse.b{animation-delay:1.2s;}
@keyframes ndpulse{0%{transform:scale(.7);opacity:.9;}100%{transform:scale(1.45);opacity:0;}}
.nd .play{position:absolute;inset:0;margin:auto;width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#22d3ee,#06b6d4);display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(6,182,212,.5);}
.nd .play.done{background:linear-gradient(135deg,#34d399,#10b981);}
.nd .w-copy .eb{font-family:'JetBrains Mono';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--cyans);}
.nd .w-copy h2{font-size:clamp(20px,2.6vw,27px);font-weight:800;margin:5px 0 6px;}
.nd .w-copy p{color:#cfe0fb;font-size:14px;max-width:440px;}
.nd .w-cta{margin-top:14px;display:inline-flex;align-items:center;gap:9px;background:#fff;color:var(--ink);font-family:'Sora';font-weight:700;font-size:14px;padding:11px 20px;border-radius:11px;box-shadow:0 8px 22px rgba(0,0,0,.22);}
.nd .w-right{z-index:1;text-align:right;}
.nd .streak{display:flex;gap:5px;justify-content:flex-end;margin-bottom:7px;}
.nd .streak i{width:10px;height:10px;border-radius:3px;background:rgba(255,255,255,.18);}
.nd .streak i.on{background:linear-gradient(135deg,var(--cyanb),var(--cyans));box-shadow:0 0 10px rgba(103,232,249,.6);}
.nd .streak-n{font-family:'Sora';font-weight:800;font-size:30px;line-height:1;}
.nd .streak-l{font-family:'JetBrains Mono';font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#9fb6e0;margin-top:3px;}
.nd .w-status{margin-top:12px;font-size:12px;color:#bcd0f0;display:flex;align-items:center;gap:7px;justify-content:flex-end;}
.nd .w-status .ring{width:8px;height:8px;border-radius:50%;background:var(--cyanb);box-shadow:0 0 0 4px rgba(34,211,238,.2);}
/* SHARE BAR */
.nd .sharebar{display:flex;align-items:center;gap:16px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:15px 22px;box-shadow:var(--shadow);margin-bottom:16px;}
.nd .sharebar .si{width:40px;height:40px;border-radius:11px;background:#ecfeff;display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.nd .sharebar .sl{flex:1;min-width:0;}
.nd .sharebar .sl .lbl{font-family:'JetBrains Mono';font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);}
.nd .sharebar .sl .lk{font-family:'JetBrains Mono';font-size:14px;color:#0e7490;font-weight:600;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.nd .sharebar .copy{background:linear-gradient(135deg,#22d3ee,#06b6d4);color:#0a1438;font-family:'Sora';font-weight:700;font-size:14px;padding:11px 20px;border-radius:11px;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;flex:0 0 auto;}
.nd .sharebar .copy:hover{transform:translateY(-1px);}
/* INCOME */
.nd .income{position:relative;overflow:hidden;border-radius:20px;background:linear-gradient(150deg,#0d1a44,#1e3a8a);color:#fff;box-shadow:var(--shadow-lg);padding:24px 28px;margin-bottom:24px;display:flex;flex-wrap:wrap;align-items:center;gap:24px;}
.nd .income::after{content:'';position:absolute;left:-50px;bottom:-70px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.14),transparent 65%);}
.nd .inc-bal{z-index:1;flex:1;min-width:200px;}
.nd .inc-bal .eb{font-family:'JetBrains Mono';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--cyans);}
.nd .inc-bal .big{font-family:'Sora';font-weight:800;font-size:clamp(34px,5vw,46px);line-height:1;color:var(--cyanb);letter-spacing:-1px;margin:8px 0 4px;}
.nd .inc-bal .sub{font-size:13px;color:#bcd0f0;}
.nd .inc-grid{z-index:1;flex:1;min-width:240px;}
.nd .inc-grid .gl{display:flex;justify-content:space-between;font-size:12.5px;color:#cfe0fb;margin-bottom:7px;}
.nd .inc-grid .gl b{font-family:'Sora';color:#fff;}
.nd .track{height:9px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;}
.nd .fill{height:100%;border-radius:6px;background:linear-gradient(90deg,var(--cyan),var(--cyanb));transition:width 1s;}
.nd .inc-grid .gbtn{margin-top:16px;display:flex;align-items:center;justify-content:center;gap:9px;background:linear-gradient(135deg,#22d3ee,#06b6d4);color:#0a1438;font-family:'Sora';font-weight:800;font-size:14.5px;padding:13px 20px;border-radius:12px;box-shadow:0 10px 24px rgba(6,182,212,.4);text-decoration:none;transition:transform .2s;}
.nd .inc-grid .gbtn:hover{transform:translateY(-2px);}
/* YOUR BUSINESS */
.nd .sect{display:flex;align-items:baseline;gap:12px;margin:4px 2px 14px;}
.nd .sect h2{font-family:'Sora';font-size:19px;font-weight:800;color:var(--ink);}
.nd .sect span{font-size:13px;color:var(--muted);}
.nd .biz{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:stretch;}
.nd .bcard{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:var(--shadow);display:flex;flex-direction:column;text-decoration:none;color:inherit;transition:transform .3s,box-shadow .3s,border-color .3s;}
.nd a.bcard:hover{transform:translateY(-5px);box-shadow:var(--shadow-lg);border-color:var(--cyanb);}
.nd .bhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
.nd .beb{font-family:'JetBrains Mono';font-size:10.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--cyan);}
.nd .bcard h3{font-family:'Sora';font-size:18px;font-weight:700;color:var(--ink);margin-top:2px;}
.nd .bcard .bd{font-size:12.5px;color:var(--muted);margin-top:4px;}
.nd .bicon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;flex:0 0 auto;}
.nd .bgo{margin-top:auto;padding-top:16px;display:inline-flex;align-items:center;gap:8px;font-family:'Sora';font-weight:700;font-size:13.5px;color:var(--cobalt);}
.nd .toolmini{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 4px;}
.nd .tm{display:flex;align-items:center;gap:9px;padding:9px;border:1px solid #e4eaf3;border-radius:11px;text-decoration:none;transition:border-color .2s,background .2s;}
.nd .tm:hover{border-color:var(--cyanb);background:#f8fdff;}
.nd .tm .tmi{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;flex:0 0 auto;}
.nd .tm .tmn{font-family:'Sora';font-weight:700;font-size:12.5px;color:var(--ink);}
.t1{background:linear-gradient(135deg,#1e3a8a,#3b82f6);}.t2{background:linear-gradient(135deg,#0891b2,#22d3ee);}
.t3{background:linear-gradient(135deg,#7c3aed,#a855f7);}.t4{background:linear-gradient(135deg,#0e7490,#06b6d4);}
.bi-mkt{background:linear-gradient(135deg,#0891b2,#22d3ee);}.bi-camp{background:linear-gradient(135deg,#d97706,#f59e0b);}.bi-team{background:linear-gradient(135deg,#7c3aed,#a855f7);}
.nd .nd-load{max-width:1120px;margin:60px auto;text-align:center;color:var(--muted);font-size:15px;}
@media (max-width:860px){
  .nd .biz{grid-template-columns:1fr;}
  .nd .watch{flex-direction:column;align-items:flex-start;gap:22px;}
  .nd .w-right{text-align:left;align-self:stretch;}.nd .streak,.nd .w-status{justify-content:flex-start;}
  .nd .sharebar{flex-wrap:wrap;}.nd .sharebar .sl{order:2;width:calc(100% - 56px);}.nd .sharebar .copy{order:3;width:100%;justify-content:center;}
}
`;

const TOOLS = [
  { to:'/pro/funnels', cls:'t1', name:'Page builder', icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg> },
  { to:'/pro/leads', cls:'t2', name:'Autoresponder', icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> },
  { to:'/creative-studio', cls:'t3', name:'Content creator', icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10z"/></svg> },
  { to:'/campaign-studio', cls:'t4', name:'Ad creator', icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 13z"/></svg> },
];

export default function NewDashboard() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [watch, setWatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(function () {
    let alive = true;
    Promise.allSettled([apiGet('/api/dashboard'), apiGet('/api/watch')]).then(function (res) {
      if (!alive) return;
      if (res[0].status === 'fulfilled') setDash(res[0].value || {});
      if (res[1].status === 'fulfilled') setWatch(res[1].value || {});
      setLoading(false);
    });
    return function () { alive = false; };
  }, []);

  const d = dash || {};
  const w = watch || {};
  const name = d.display_name || user?.first_name || user?.username || 'there';
  const initials = (name || 'M').charAt(0).toUpperCase();
  const tierRaw = (user?.membership_tier || d.membership_tier || '').toString();
  const tierLabel = tierRaw ? tierRaw.charAt(0).toUpperCase() + tierRaw.slice(1) : null;
  const balance = Number(d.balance != null ? d.balance : (user?.balance || 0));
  const gs = d.grid_stats || {};
  const filled = Number(gs.filled != null ? gs.filled : (gs.seats_filled != null ? gs.seats_filled : (gs.total_filled || 0)));
  const total = Number(gs.total != null ? gs.total : (gs.seats || 16)) || 16;
  const pct = total ? Math.min(Math.round((filled / total) * 100), 100) : 0;
  const streak = Number(w.streak_days || 0);
  const watchedToday = !!w.watched_today;
  const refLink = 'https://www.superadpro.com/ref/' + (user?.username || '');
  const streakDots = Array.from({ length: 7 }, function (_, i) { return i < Math.min(streak > 0 && streak % 7 === 0 ? 7 : streak % 7, 7); });

  function copyLink() {
    try { navigator.clipboard.writeText(refLink); setCopied(true); setTimeout(function () { setCopied(false); }, 1800); } catch (e) {}
  }

  if (loading) {
    return (<div className="nd"><style>{CSS}</style><div className="nd-load">Loading your dashboard…</div></div>);
  }

  return (
    <div className="nd" onClick={function () { if (menuOpen) setMenuOpen(false); }}>
      <style>{CSS}</style>
      <div className="wrap">

        <div className="top">
          <div className="brand"><span className="dot"></span>SuperAdPro</div>
          <div className="chips">
            {tierLabel && <span className="chip tier"><span className="lbl">Tier</span><b>{tierLabel}</b></span>}
            <Link className="chip" to="/wallet"><span className="lbl">Wallet</span><b>{formatMoney(balance)}</b></Link>
            <div className="acct" onClick={function (e) { e.stopPropagation(); }}>
              <button className="avatar-btn" onClick={function () { setMenuOpen(function (o) { return !o; }); }}>{initials}</button>
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
        </div>

        <div className="greet">
          <h1>Welcome back, {name}</h1>
          <p>{watchedToday
            ? "You're active today — your wallet's switched on and your grid is earning."
            : "Watch today's video to keep your wallet active and your Profit Grid earning."}</p>
        </div>

        <Link className="watch" to="/watch">
          <div className="w-left">
            <div className="playwrap">
              {!watchedToday && <><span className="pulse"></span><span className="pulse b"></span></>}
              <span className={'play' + (watchedToday ? ' done' : '')}>
                {watchedToday
                  ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-10"/></svg>
                  : <svg width="28" height="28" viewBox="0 0 24 24" fill="#0a1438"><path d="M8 5v14l11-7z"/></svg>}
              </span>
            </div>
            <div className="w-copy">
              <div className="eb">Watch to Earn</div>
              <h2>{watchedToday ? "Today's watch — done" : "Today's video is ready"}</h2>
              <p>{watchedToday
                ? "You're qualified to earn and withdraw today. Come back tomorrow to keep your streak alive."
                : "One watch a day keeps your wallet active and your grid earnings switched on."}</p>
              {!watchedToday && <span className="w-cta">Watch now &nbsp;&rarr;</span>}
            </div>
          </div>
          <div className="w-right">
            <div className="streak">{streakDots.map(function (on, i) { return <i key={i} className={on ? 'on' : ''}></i>; })}</div>
            <div className="streak-n">{streak}</div>
            <div className="streak-l">day streak</div>
            <div className="w-status"><span className="ring"></span>{watchedToday ? 'Active today' : 'Watch to stay active today'}</div>
          </div>
        </Link>

        <div className="sharebar">
          <div className="si"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0e7490" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg></div>
          <div className="sl"><div className="lbl">Your affiliate link — share to grow your team</div><div className="lk">{refLink}</div></div>
          <button className="copy" onClick={copyLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a1438" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <div className="income">
          <div className="inc-bal">
            <div className="eb">Income · current balance</div>
            <div className="big">{formatMoney(balance)}</div>
            <div className="sub">available in your wallet — full breakdown in analytics</div>
          </div>
          <div className="inc-grid">
            <div className="gl"><span>Profit Grid</span><b>{filled} / {total} seats</b></div>
            <div className="track"><div className="fill" style={{ width: pct + '%' }}></div></div>
            <Link className="gbtn" to="/grid-visualiser">Open my Profit Grid &nbsp;&rarr;</Link>
          </div>
        </div>

        <div className="sect"><h2>Your Business</h2><span>everything you use to build and grow</span></div>
        <div className="biz">

          <div className="bcard">
            <div className="bhead"><div><div className="beb">Tool Kit</div><h3>Build your business</h3></div>
              <div className="bicon t1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.3 2.3-2.7-.7-.7-2.7z"/></svg></div>
            </div>
            <div className="toolmini">
              {TOOLS.map(function (t) { return (<Link className="tm" to={t.to} key={t.to}><span className={'tmi ' + t.cls}>{t.icon}</span><span className="tmn">{t.name}</span></Link>); })}
            </div>
          </div>

          <Link className="bcard" to="/affiliate">
            <div className="bhead"><div><div className="beb">Marketing</div><h3>Promote SuperAdPro</h3></div>
              <div className="bicon bi-mkt"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 13zM11.5 12.5V19"/></svg></div>
            </div>
            <div className="bd">Your link plus ready-made posters, email swipes and brand assets to share.</div>
            <span className="bgo">Open Marketing &rarr;</span>
          </Link>

          <Link className="bcard" to="/campaign-tiers">
            <div className="bhead"><div><div className="beb">Campaign Tiers</div><h3>Your advertising</h3></div>
              <div className="bicon bi-camp"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2"/></svg></div>
            </div>
            <div className="bd">Buy a tier, then create the campaign that gets watched — manage and track performance.</div>
            <span className="bgo">Start a campaign &rarr;</span>
          </Link>

          <Link className="bcard" to="/command-centre">
            <div className="bhead"><div><div className="beb">Team</div><h3>Your network</h3></div>
              <div className="bicon bi-team"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0M16 5.5a3 3 0 010 5.5M21 20a6 6 0 00-4-5.7"/></svg></div>
            </div>
            <div className="bd">See who's joined, who's active, and grow your team and unilevel earnings.</div>
            <span className="bgo">Open Team &rarr;</span>
          </Link>

        </div>
      </div>
    </div>
  );
}
