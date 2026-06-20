import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { formatMoney } from '../utils/money';

// Three-door dashboard (Watch to Earn / Income / Tools) — platform simplification.
// Spec: docs/platform-simplification-spec.md · Visual ref: docs/platform-assets/dashboard-mockup.html
// Wired to real data: /api/dashboard (earnings, grid, team, balance) + /api/watch (streak, watched_today).
// Served at /home-preview for review before it replaces /dashboard.

const CSS = `
.nd{--ink:#0a1438;--ink2:#15275f;--cobalt:#1e3a8a;--cyan:#06b6d4;--cyanb:#22d3ee;--cyans:#67e8f9;
  --bg:#eaf0fa;--card:#fff;--line:#e4eaf3;--muted:#64748b;--text:#0f172a;
  --shadow:0 10px 30px rgba(10,20,56,.08);--shadow-lg:0 22px 50px rgba(10,20,56,.16);
  font-family:'DM Sans',system-ui,sans-serif;color:var(--text);min-height:100vh;
  background:radial-gradient(900px 500px at 12% -8%,rgba(34,211,238,.16),transparent 60%),
    radial-gradient(800px 520px at 96% 4%,rgba(30,58,138,.16),transparent 55%),var(--bg);
  padding:22px clamp(14px,4vw,40px) 60px;}
.nd *{margin:0;padding:0;box-sizing:border-box;}
.nd .disp,.nd h1,.nd h2,.nd h3{font-family:'Sora','DM Sans',sans-serif;}
.nd .mono{font-family:'JetBrains Mono',monospace;}
.nd .wrap{max-width:1120px;margin:0 auto;}
.nd .top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:26px;}
.nd .brand{font-family:'Sora';font-weight:800;font-size:20px;color:var(--ink);letter-spacing:-.3px;display:flex;align-items:center;gap:9px;}
.nd .brand .dot{width:11px;height:11px;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--cyanb));box-shadow:0 0 0 4px rgba(34,211,238,.18);}
.nd .chips{display:flex;gap:10px;align-items:center;}
.nd .chip{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:8px 14px;display:flex;align-items:center;gap:8px;box-shadow:var(--shadow);font-size:13px;font-weight:600;text-decoration:none;color:var(--text);}
.nd .chip .lbl{font-family:'JetBrains Mono';font-size:10px;letter-spacing:.5px;color:var(--muted);text-transform:uppercase;}
.nd .chip b{font-family:'Sora';font-weight:700;color:var(--ink);}
.nd .chip.tier b{color:var(--cyan);}
.nd .greet{margin-bottom:22px;}
.nd .greet h1{font-size:clamp(22px,3.4vw,30px);font-weight:800;color:var(--ink);letter-spacing:-.5px;}
.nd .greet p{color:var(--muted);font-size:15px;margin-top:5px;max-width:580px;}
.nd .doors{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.nd .door{position:relative;border-radius:22px;overflow:hidden;transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s;text-decoration:none;color:inherit;display:block;}
.nd .door:hover{transform:translateY(-5px);}
.nd .watch{grid-column:1 / -1;background:linear-gradient(120deg,#0a1438 0%,#15275f 48%,#0e7490 120%);color:#fff;box-shadow:var(--shadow-lg);padding:30px clamp(22px,3.6vw,40px);display:flex;align-items:center;gap:clamp(20px,4vw,52px);}
.nd .watch::after{content:'';position:absolute;right:-60px;top:-80px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.22),transparent 65%);pointer-events:none;}
.nd .watch:hover{box-shadow:0 30px 64px rgba(8,116,118,.34);}
.nd .w-left{display:flex;align-items:center;gap:clamp(18px,3vw,30px);z-index:1;flex:1;min-width:0;}
.nd .playwrap{position:relative;flex:0 0 auto;width:96px;height:96px;}
.nd .pulse{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(103,232,249,.5);animation:ndpulse 2.4s ease-out infinite;}
.nd .pulse.b{animation-delay:1.2s;}
@keyframes ndpulse{0%{transform:scale(.7);opacity:.9;}100%{transform:scale(1.45);opacity:0;}}
.nd .play{position:absolute;inset:0;margin:auto;width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#22d3ee,#06b6d4);display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(6,182,212,.5);}
.nd .play.done{background:linear-gradient(135deg,#34d399,#10b981);box-shadow:0 12px 30px rgba(16,185,129,.45);}
.nd .w-copy .eyebrow{font-family:'JetBrains Mono';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--cyans);}
.nd .w-copy h2{font-size:clamp(22px,3vw,30px);font-weight:800;margin:5px 0 6px;letter-spacing:-.4px;}
.nd .w-copy p{color:#cfe0fb;font-size:14.5px;max-width:440px;line-height:1.5;}
.nd .w-cta{margin-top:16px;display:inline-flex;align-items:center;gap:9px;background:#fff;color:var(--ink);font-family:'Sora';font-weight:700;font-size:14.5px;padding:12px 22px;border-radius:12px;box-shadow:0 8px 22px rgba(0,0,0,.22);}
.nd .w-right{z-index:1;flex:0 0 auto;text-align:right;}
.nd .streak{display:flex;gap:6px;justify-content:flex-end;margin-bottom:8px;}
.nd .streak i{width:11px;height:11px;border-radius:3px;background:rgba(255,255,255,.18);}
.nd .streak i.on{background:linear-gradient(135deg,var(--cyanb),var(--cyans));box-shadow:0 0 10px rgba(103,232,249,.6);}
.nd .streak-n{font-family:'Sora';font-weight:800;font-size:34px;line-height:1;}
.nd .streak-l{font-family:'JetBrains Mono';font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:#9fb6e0;margin-top:4px;}
.nd .w-status{margin-top:14px;font-size:12.5px;color:#bcd0f0;display:flex;align-items:center;gap:7px;justify-content:flex-end;}
.nd .w-status .ring{width:9px;height:9px;border-radius:50%;background:var(--cyanb);box-shadow:0 0 0 4px rgba(34,211,238,.2);}
.nd .income{background:linear-gradient(155deg,#0d1a44,#1e3a8a);color:#fff;box-shadow:var(--shadow-lg);padding:26px 28px;display:flex;flex-direction:column;}
.nd .income::after{content:'';position:absolute;left:-50px;bottom:-70px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.14),transparent 65%);pointer-events:none;}
.nd .income:hover{box-shadow:0 30px 60px rgba(13,26,68,.4);}
.nd .d-head{display:flex;align-items:center;justify-content:space-between;z-index:1;}
.nd .d-head .eyebrow{font-family:'JetBrains Mono';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--cyans);}
.nd .d-icon{width:40px;height:40px;border-radius:11px;background:rgba(34,211,238,.16);display:flex;align-items:center;justify-content:center;}
.nd .earned{margin-top:18px;z-index:1;}
.nd .earned .big{font-family:'Sora';font-weight:800;font-size:clamp(32px,5vw,42px);line-height:1;color:var(--cyanb);letter-spacing:-1px;}
.nd .earned .sub{font-size:13px;color:#bcd0f0;margin-top:6px;}
.nd .gridbar{margin-top:20px;z-index:1;}
.nd .gridbar .gl{display:flex;justify-content:space-between;font-size:12px;color:#cfe0fb;margin-bottom:7px;}
.nd .gridbar .gl b{font-family:'Sora';color:#fff;}
.nd .track{height:9px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;}
.nd .fill{height:100%;border-radius:6px;background:linear-gradient(90deg,var(--cyan),var(--cyanb));transition:width 1s cubic-bezier(.2,.7,.2,1);}
.nd .metrics{display:flex;gap:10px;margin-top:20px;z-index:1;}
.nd .metric{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(103,232,249,.18);border-radius:12px;padding:11px 13px;}
.nd .metric .mn{font-family:'Sora';font-weight:800;font-size:18px;}
.nd .metric .ml{font-family:'JetBrains Mono';font-size:9.5px;letter-spacing:.5px;text-transform:uppercase;color:#9fb6e0;margin-top:2px;}
.nd .grid-btn{margin-top:auto;padding-top:20px;z-index:1;}
.nd .grid-btn span{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(135deg,#22d3ee,#06b6d4);color:#0a1438;font-family:'Sora';font-weight:800;font-size:15.5px;padding:16px 22px;border-radius:13px;box-shadow:0 12px 26px rgba(6,182,212,.42);transition:transform .2s,box-shadow .2s;}
.nd .income:hover .grid-btn span{transform:translateY(-2px);box-shadow:0 16px 34px rgba(6,182,212,.55);}
.nd .tools{background:var(--card);border:1px solid var(--line);box-shadow:var(--shadow);padding:26px 28px;display:flex;flex-direction:column;}
.nd .tools:hover{box-shadow:var(--shadow-lg);}
.nd .tools .d-head .eyebrow{color:var(--cyan);}
.nd .tools .d-head h3{font-size:19px;font-weight:700;color:var(--ink);margin-top:3px;}
.nd .tools .d-icon{background:#ecfeff;}
.nd .tgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px;flex:1;}
.nd .tile{position:relative;border:1px solid #d4ddea;border-radius:14px;padding:15px;display:flex;flex-direction:column;gap:9px;background:#fff;box-shadow:0 1px 2px rgba(10,20,56,.05),0 6px 16px rgba(10,20,56,.08);transition:border-color .2s,transform .2s,box-shadow .2s;text-decoration:none;}
.nd .tile:hover{border-color:var(--cyanb);transform:translateY(-4px);box-shadow:0 16px 30px rgba(6,182,212,.2);}
.nd .tile .go{position:absolute;top:13px;right:13px;color:#c2cddd;display:flex;transition:color .2s,transform .2s;}
.nd .tile:hover .go{color:var(--cyan);transform:translateX(3px);}
.nd .ti{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;}
.nd .ti.t1{background:linear-gradient(135deg,#1e3a8a,#3b82f6);}
.nd .ti.t2{background:linear-gradient(135deg,#0891b2,#22d3ee);}
.nd .ti.t3{background:linear-gradient(135deg,#7c3aed,#a855f7);}
.nd .ti.t4{background:linear-gradient(135deg,#0e7490,#06b6d4);}
.nd .tile .tn{font-family:'Sora';font-weight:700;font-size:14px;color:var(--ink);}
.nd .tile .td{font-size:11.5px;color:var(--muted);line-height:1.35;}
.nd .nd-load{max-width:1120px;margin:60px auto;text-align:center;color:var(--muted);font-size:15px;}
@media (max-width:860px){
  .nd .doors{grid-template-columns:1fr;}
  .nd .watch{flex-direction:column;align-items:flex-start;gap:24px;}
  .nd .w-right{text-align:left;align-self:stretch;}
  .nd .streak,.nd .w-status{justify-content:flex-start;}
}
`;

const ICON = {
  play: <svg width="30" height="30" viewBox="0 0 24 24" fill="#0a1438"><path d="M8 5v14l11-7z"/></svg>,
  check: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-10"/></svg>,
  dollar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  wrench: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.3 2.3-2.7-.7-.7-2.7z"/></svg>,
  arrow: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0a1438" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  chev: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>,
};

const TOOLS = [
  { to:'/pro/funnels', cls:'t1', name:'Page builder', desc:'Landing pages & funnels', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg> },
  { to:'/pro/leads', cls:'t2', name:'Autoresponder', desc:'Capture & email leads', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> },
  { to:'/creative-studio', cls:'t3', name:'Content creator', desc:'Videos, posters, posts', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg> },
  { to:'/ad-studio', cls:'t4', name:'Ad creator', desc:'Build campaign ads', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 13zM11.5 12.5V19"/></svg> },
];

export default function NewDashboard() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [watch, setWatch] = useState(null);
  const [loading, setLoading] = useState(true);

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
  const tierRaw = (user?.membership_tier || d.membership_tier || '').toString();
  const tierLabel = tierRaw ? tierRaw.charAt(0).toUpperCase() + tierRaw.slice(1) : null;
  const balance = Number(d.balance != null ? d.balance : (user?.balance || 0));
  const earned = Number(d.total_earned || 0);
  const gs = d.grid_stats || {};
  const filled = Number(gs.filled != null ? gs.filled : (gs.seats_filled != null ? gs.seats_filled : (gs.total_filled || 0)));
  const total = Number(gs.total != null ? gs.total : (gs.seats || 16)) || 16;
  const pct = total ? Math.min(Math.round((filled / total) * 100), 100) : 0;
  const team = Number(d.total_team || 0);
  const activeTeam = Number(d.directs_active != null ? d.directs_active : (d.network_active || 0));
  const nextMilestone = Math.min(Math.ceil((filled + 1) / 4) * 4, total);
  const toMilestone = Math.max(nextMilestone - filled, 0);
  const streak = Number(w.streak_days || 0);
  const watchedToday = !!w.watched_today;
  const streakDots = Array.from({ length: 7 }, function (_, i) { return i < Math.min(streak % 7 === 0 && streak > 0 ? 7 : streak % 7, 7); });

  if (loading) {
    return (<div className="nd"><style>{CSS}</style><div className="nd-load">Loading your dashboard…</div></div>);
  }

  return (
    <div className="nd">
      <style>{CSS}</style>
      <div className="wrap">

        <div className="top">
          <div className="brand"><span className="dot"></span>SuperAdPro</div>
          <div className="chips">
            {tierLabel && <span className="chip tier"><span className="lbl">Tier</span><b>{tierLabel}</b></span>}
            <Link className="chip" to="/wallet"><span className="lbl">Wallet</span><b>{formatMoney(balance)}</b></Link>
          </div>
        </div>

        <div className="greet">
          <h1>Welcome back, {name}</h1>
          <p>{watchedToday
            ? "You're active today — your wallet's switched on and your grid is earning."
            : "Watch today's video to keep your wallet active and your Profit Grid earning."}</p>
        </div>

        <div className="doors">

          {/* WATCH TO EARN */}
          <Link className="door watch" to="/watch">
            <div className="w-left">
              <div className="playwrap">
                {!watchedToday && <><span className="pulse"></span><span className="pulse b"></span></>}
                <span className={'play' + (watchedToday ? ' done' : '')}>{watchedToday ? ICON.check : ICON.play}</span>
              </div>
              <div className="w-copy">
                <div className="eyebrow">Watch to Earn</div>
                <h2>{watchedToday ? "Today's watch — done" : "Today's video is ready"}</h2>
                <p>{watchedToday
                  ? "You're qualified to earn and withdraw today. Come back tomorrow to keep your streak alive."
                  : "One watch a day keeps your wallet active and your grid earnings switched on. Miss a day and earning pauses until you're back."}</p>
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

          {/* INCOME */}
          <Link className="door income" to="/campaign-tiers">
            <div className="d-head"><div><div className="eyebrow">Income</div></div><div className="d-icon">{ICON.dollar}</div></div>
            <div className="earned">
              <div className="big">{formatMoney(earned)}</div>
              <div className="sub">total earned from your Profit Grid &amp; team</div>
            </div>
            <div className="gridbar">
              <div className="gl"><span>Profit Grid</span><b>{filled} / {total} seats</b></div>
              <div className="track"><div className="fill" style={{ width: pct + '%' }}></div></div>
            </div>
            <div className="metrics">
              <div className="metric"><div className="mn">{team}</div><div className="ml">Team</div></div>
              <div className="metric"><div className="mn">{activeTeam}</div><div className="ml">Active</div></div>
              <div className="metric"><div className="mn">{toMilestone}</div><div className="ml">To bonus</div></div>
            </div>
            <div className="grid-btn"><span>Open Profit Grid {ICON.arrow}</span></div>
          </Link>

          {/* TOOLS */}
          <div className="door tools">
            <div className="d-head"><div><div className="eyebrow">Tools</div><h3>Your toolkit</h3></div><div className="d-icon">{ICON.wrench}</div></div>
            <div className="tgrid">
              {TOOLS.map(function (t) {
                return (
                  <Link className="tile" to={t.to} key={t.to}>
                    <span className="go">{ICON.chev}</span>
                    <div className={'ti ' + t.cls}>{t.icon}</div>
                    <div><div className="tn">{t.name}</div><div className="td">{t.desc}</div></div>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
