import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../utils/api';
import { formatMoney } from '../utils/money';

// Three-door dashboard (platform simplification) — ports the approved mock layout
// (docs/platform-assets/dashboard-mockup.html) faithfully. Only the right-hand card's
// four tiles are re-pointed to the Your Business categories, plus two data fixes:
// Income card shows CURRENT BALANCE, grid button -> active grid (/grid-visualiser).
// Wired to real data: /api/dashboard + /api/watch. Served at /home-preview.

const CSS = `
.nd{
  --ink:#0a1438; --ink2:#15275f; --cobalt:#1e3a8a;
  --cyan:#06b6d4; --cyanb:#22d3ee; --cyans:#67e8f9;
  --bg:#eaf0fa; --card:#ffffff; --line:#e4eaf3; --muted:#64748b; --text:#0f172a; --violet:#7c3aed;
  --shadow:0 10px 30px rgba(10,20,56,.08); --shadow-lg:0 22px 50px rgba(10,20,56,.16);
}
.nd *{margin:0;padding:0;box-sizing:border-box;}
.nd{
  font-family:'DM Sans',system-ui,sans-serif;color:var(--text);
  background:
    #FFFFFF;
  min-height:100vh;padding:22px clamp(14px,4vw,40px) 60px;
}
.nd h1,.nd h2,.nd h3,.nd .disp{font-family:'Sora',sans-serif;}
.nd .mono{font-family:'JetBrains Mono',monospace;}
.nd .wrap{width:100%;}
.nd /* top bar */
.top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:26px;}
.nd .brand{display:flex;align-items:center;gap:10px;}
.nd .brand .logomark{width:30px;height:30px;border-radius:50%;background:#0ea5e9;display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:0 4px 12px rgba(14,165,233,.35);}
.nd .brand .wordmark{font-family:'Sora';font-weight:800;font-size:20px;color:var(--ink);letter-spacing:-.3px;line-height:1;}
.nd .brand .wordmark .pro{color:#0ea5e9;}
.nd .chips{display:flex;gap:10px;align-items:center;}
.nd .chip{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:8px 14px;display:flex;align-items:center;gap:8px;box-shadow:var(--shadow);font-size:13px;font-weight:600;}
.nd .chip .lbl{font-family:'JetBrains Mono';font-size:10px;letter-spacing:.5px;color:var(--muted);text-transform:uppercase;}
.nd .chip b{font-family:'Sora';font-weight:700;color:var(--ink);}
.nd .chip.tier b{color:var(--cyan);}
.nd .acct{position:relative;}
.nd .avatar-btn{width:48px;height:44px;border-radius:12px;background:var(--card);border:1px solid var(--line);box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;color:var(--ink);cursor:pointer;transition:border-color .2s,box-shadow .2s,background .2s;}
.nd .avatar-btn:hover{border-color:var(--cyanb);box-shadow:var(--shadow-lg);}
.nd .avatar-btn.open{border-color:var(--cyanb);background:#f4fbff;}
.nd .rt{display:flex;align-items:center;gap:10px;}
.nd .bal{display:flex;align-items:center;gap:9px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 15px 6px 12px;text-decoration:none;box-shadow:var(--shadow);transition:border-color .2s,box-shadow .2s;}
.nd .bal:hover{border-color:var(--cyanb);box-shadow:var(--shadow-lg);}
.nd .bal .ico{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--cyan),#0ea5e9);display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.nd .bal .txt{display:flex;flex-direction:column;line-height:1.05;}
.nd .bal .l{font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);}
.nd .bal .a{font-family:'Sora';font-size:15px;font-weight:800;color:#16a34a;}
@media(max-width:560px){
  .nd .bal{padding:6px 12px 6px 10px;gap:7px;}
  .nd .bal .ico{width:26px;height:26px;}
  .nd .bal .l{display:none;}
  .nd .bal .a{font-size:13.5px;}
}
.nd .menu{position:absolute;right:0;top:54px;width:216px;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);padding:8px;z-index:50;}
.nd .menu .mhead{padding:8px 12px;border-bottom:1px solid var(--line);margin-bottom:6px;}
.nd .menu .mhead b{font-family:'Sora';font-size:14px;color:var(--ink);display:block;}
.nd .menu .mhead span{font-family:'JetBrains Mono';font-size:11px;color:var(--muted);}
.nd .menu a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;font-size:13.5px;font-weight:600;color:#334155;text-decoration:none;}
.nd .menu a:hover{background:#f4f8fd;}
.nd .menu a svg{color:#94a3b8;flex:0 0 auto;}
.nd .menu .sep{height:1px;background:var(--line);margin:6px 0;}
.nd .menu a.out{color:#b91c1c;}
.nd .menu a.out svg{color:#b91c1c;}
.nd /* greeting — now lives inside the watch banner */
.nd .w-copy .greet-line{font-family:'DM Sans';font-weight:600;font-size:15px;color:var(--cyans);margin-bottom:2px;letter-spacing:.2px;}
.nd /* layout */
.doors{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.nd .door{position:relative;border-radius:22px;overflow:hidden;opacity:0;transform:translateY(14px);animation:rise .7s cubic-bezier(.2,.7,.2,1) forwards;cursor:pointer;transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s;}
.nd .door:nth-child(1){animation-delay:.05s;}
.nd .door:nth-child(2){animation-delay:.16s;}
.nd .door:nth-child(3){animation-delay:.27s;}
.nd .door:hover{transform:translateY(-5px);}
.nd .door:focus-visible{outline:3px solid var(--cyanb);outline-offset:3px;}
@keyframes rise{to{opacity:1;transform:translateY(0);}}
.nd /* WATCH — featured,.nd full width */
.watch{grid-column:1 / -1;background:linear-gradient(120deg,#0a1438 0%,#15275f 48%,#0e7490 120%);color:#fff;box-shadow:var(--shadow-lg);padding:30px clamp(22px,3.6vw,40px);display:flex;align-items:center;gap:clamp(20px,4vw,52px);}
.nd .watch::after{content:'';position:absolute;right:-60px;top:-80px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.22),transparent 65%);pointer-events:none;}
.nd .watch:hover{box-shadow:0 30px 64px rgba(8,116,118,.34);}
.nd .w-left{display:flex;align-items:center;gap:clamp(18px,3vw,30px);z-index:1;flex:1;min-width:0;}
.nd .playwrap{position:relative;flex:0 0 auto;width:96px;height:96px;}
.nd .pulse{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(103,232,249,.5);animation:pulse 2.4s ease-out infinite;}
.nd .pulse:nth-child(2){animation-delay:1.2s;}
@keyframes pulse{0%{transform:scale(.7);opacity:.9;}100%{transform:scale(1.45);opacity:0;}}
.nd .play{position:absolute;inset:0;margin:auto;width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#22d3ee,#06b6d4);display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(6,182,212,.5);}
.nd .play svg{margin-left:5px;}
.nd .w-copy .eyebrow{font-family:'JetBrains Mono';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--cyans);}
.nd .w-copy h2{font-size:clamp(22px,3vw,30px);font-weight:800;margin:2px 0 6px;letter-spacing:-.4px;}
.nd .w-copy p{color:#cfe0fb;font-size:14.5px;max-width:420px;line-height:1.5;}
.nd .w-cta{margin-top:16px;display:inline-flex;align-items:center;gap:9px;background:#fff;color:var(--ink);font-family:'Sora';font-weight:700;font-size:14.5px;padding:12px 22px;border-radius:12px;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s;box-shadow:0 8px 22px rgba(0,0,0,.22);}
.nd .w-cta:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(0,0,0,.3);}
.nd .w-right{z-index:1;flex:0 0 auto;text-align:right;}
.nd .streak{display:flex;gap:6px;justify-content:flex-end;margin-bottom:8px;}
.nd .streak i{width:11px;height:11px;border-radius:3px;background:rgba(255,255,255,.18);}
.nd .streak i.on{background:linear-gradient(135deg,var(--cyanb),var(--cyans));box-shadow:0 0 10px rgba(103,232,249,.6);}
.nd .streak-n{font-family:'Sora';font-weight:800;font-size:34px;line-height:1;}
.nd .streak-l{font-family:'JetBrains Mono';font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:#9fb6e0;margin-top:4px;}
.nd .w-status{margin-top:14px;font-size:12.5px;color:#bcd0f0;display:flex;align-items:center;gap:7px;justify-content:flex-end;}
.nd .w-status .ring{width:9px;height:9px;border-radius:50%;background:var(--cyanb);box-shadow:0 0 0 4px rgba(34,211,238,.2);animation:blink 1.8s ease-in-out infinite;}
@keyframes blink{50%{opacity:.4;}}
.nd /* INCOME — deep cobalt money card */
.income{background:linear-gradient(155deg,#0d1a44,#1e3a8a);color:#fff;box-shadow:var(--shadow-lg);padding:26px 28px;display:flex;flex-direction:column;}
.nd .income::after{content:'';position:absolute;left:-50px;bottom:-70px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.14),transparent 65%);pointer-events:none;}
.nd .income:hover{box-shadow:0 30px 60px rgba(13,26,68,.4);}
.nd .d-head{display:flex;align-items:center;justify-content:space-between;z-index:1;}
.nd .d-head .eyebrow{font-family:'JetBrains Mono';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--cyans);}
.nd .d-icon{width:40px;height:40px;border-radius:11px;background:rgba(34,211,238,.16);display:flex;align-items:center;justify-content:center;}
.nd .earned{margin-top:18px;z-index:1;}
.nd .earned .big{font-family:'Sora';font-weight:800;font-size:clamp(34px,5vw,44px);line-height:1;color:#22c55e;letter-spacing:-1px;}
.nd .earned .sub{font-size:13px;color:#bcd0f0;margin-top:6px;}
.nd .d-cta-spacer{}
.nd .earned .sub b{color:#fff;}
.nd .gridbar{margin-top:20px;z-index:1;}
.nd .gridbar .gl{display:flex;justify-content:space-between;font-size:12px;color:#cfe0fb;margin-bottom:7px;}
.nd .gridbar .gl b{font-family:'Sora';color:#fff;}
.nd .track{height:9px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;}
.nd .fill{height:100%;border-radius:6px;background:linear-gradient(90deg,var(--cyan),var(--cyanb));transition:width 1s cubic-bezier(.2,.7,.2,1);}
@keyframes grow{to{width:37.5%;}}
.nd .metrics{display:flex;gap:10px;margin-top:20px;z-index:1;}
.nd .metric{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(103,232,249,.18);border-radius:12px;padding:11px 13px;}
.nd .metric .mn{font-family:'Sora';font-weight:800;font-size:18px;}
.nd .metric .ml{font-family:'JetBrains Mono';font-size:9.5px;letter-spacing:.5px;text-transform:uppercase;color:#9fb6e0;margin-top:2px;}
.nd .d-cta{margin-top:auto;padding-top:20px;z-index:1;display:flex;gap:10px;}
.nd .wallet-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,.08);border:1px solid rgba(103,232,249,.4);color:#fff;font-family:'Sora';font-weight:700;font-size:14.5px;padding:16px 16px;border-radius:13px;cursor:pointer;transition:background .2s,border-color .2s,transform .2s;}
.nd .wallet-btn:hover{background:rgba(103,232,249,.16);border-color:var(--cyanb);transform:translateY(-2px);}
.nd .wallet-btn:focus-visible{outline:3px solid #fff;outline-offset:3px;}
.nd .grid-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(135deg,#22d3ee,#06b6d4);color:#0a1438;font-family:'Sora';font-weight:800;font-size:15.5px;padding:16px 18px;border:none;border-radius:13px;cursor:pointer;box-shadow:0 12px 26px rgba(6,182,212,.42);transition:transform .2s,box-shadow .2s;}
.nd .grid-btn:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(6,182,212,.55);}
.nd .grid-btn:focus-visible{outline:3px solid #fff;outline-offset:3px;}
.nd .grid-btn svg{transition:transform .2s;}
.nd .grid-btn:hover svg{transform:translateX(4px);}
.nd /* TOOLS — clean light card */
.tools{background:var(--card);border:1px solid var(--line);box-shadow:var(--shadow);padding:26px 28px;display:flex;flex-direction:column;}
.nd .tools:hover{box-shadow:var(--shadow-lg);}
.nd .tools .d-head .eyebrow{color:var(--cyan);}
.nd .tools .d-head h3{font-size:19px;font-weight:700;color:var(--ink);margin-top:3px;}
.nd .tools .d-icon{background:#ecfeff;}
.nd .tgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px;flex:1;}
.nd .tile{position:relative;border:1px solid #d4ddea;border-radius:14px;padding:15px;display:flex;flex-direction:column;gap:9px;background:#fff;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 2px 6px rgba(10,20,56,.09),0 20px 44px rgba(10,20,56,.18);transition:border-color .2s,box-shadow .2s;}
.nd .tile:hover{border-color:var(--cyanb);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 2px 6px rgba(10,20,56,.09),0 20px 44px rgba(10,20,56,.18);}
.nd .tile:active{transform:translateY(-1px);box-shadow:0 6px 14px rgba(6,182,212,.16);}
.nd .tile .go{position:absolute;top:13px;right:13px;color:#c2cddd;display:flex;transition:color .2s,transform .2s;}
.nd .tile:hover .go{color:var(--cyan);}
.nd .ti{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;}
.nd .ti.t1{background:linear-gradient(135deg,#1e3a8a,#3b82f6);}
.nd .ti.t2{background:linear-gradient(135deg,#0891b2,#22d3ee);}
.nd .ti.t3{background:linear-gradient(135deg,#7c3aed,#a855f7);}
.nd .ti.t4{background:linear-gradient(135deg,#0e7490,#06b6d4);}
.nd .tile .tn{font-family:'Sora';font-weight:700;font-size:14px;color:var(--ink);}
.nd .tile .td{font-size:11.5px;color:var(--muted);line-height:1.35;}
.nd .foot{text-align:center;margin-top:30px;font-family:'JetBrains Mono';font-size:11px;letter-spacing:.5px;color:#94a3b8;}
.nd /* affiliate link share bar */
.sharebar{grid-column:1 / -1;display:flex;align-items:center;gap:16px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:15px 22px;box-shadow:var(--shadow);}
.nd .sharebar .si{width:40px;height:40px;border-radius:11px;background:#ecfeff;display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.nd .sharebar .sl{flex:1;min-width:0;}
.nd .sharebar .sl .lbl{font-family:'JetBrains Mono';font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);}
.nd .sharebar .sl .lk{font-family:'JetBrains Mono';font-size:14.5px;color:#0e7490;font-weight:600;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.nd .sharebar .acts{display:flex;gap:10px;flex:0 0 auto;}
.nd .sharebar .copy{background:linear-gradient(135deg,#22d3ee,#06b6d4);color:#0a1438;font-family:'Sora';font-weight:700;font-size:14px;padding:11px 20px;border-radius:11px;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;}
.nd .sharebar .copy:hover{transform:translateY(-1px);}
.nd .sharebar .share{background:#fff;border:1px solid var(--line);border-radius:11px;width:46px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--cobalt);}
.nd .sharebar .share:hover{border-color:var(--cyanb);}
@media (max-width:860px){.nd .sharebar{flex-wrap:wrap;} .nd .sharebar .sl{order:2;width:calc(100% - 56px);} .nd .sharebar .si{order:1;} .nd .sharebar .acts{order:3;width:100%;} .nd .sharebar .copy{flex:1;justify-content:center;}}
@media (max-width:860px){.nd .doors{grid-template-columns:1fr;} .nd .watch{flex-direction:column;align-items:flex-start;gap:24px;} .nd .w-right{text-align:left;align-self:stretch;} .nd .streak,.nd .w-status{justify-content:flex-start;}}
@media (prefers-reduced-motion:reduce){.nd *{animation:none!important;transition:none!important;} .nd .door{opacity:1;transform:none;} .nd .fill{width:37.5%;}}
`;

const chev = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>;

const BIZ = [
  { to:'/toolkit', cls:'t1', name:'Tool Kit', desc:'Pages, email, content & ads', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.3 2.3-2.7-.7-.7-2.7z"/></svg> },
  { to:'/marketing', cls:'t2', name:'Marketing', desc:'Your link & promo materials', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 13zM11.5 12.5V19"/></svg> },
  { to:'/campaigns', cls:'t3', name:'Campaign Tiers', desc:'Buy & create your ads', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2"/></svg> },
  { to:'/team', cls:'t4', name:'Team', desc:'Your network & earnings', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0M16 5.5a3 3 0 010 5.5M21 20a6 6 0 00-4-5.7"/></svg> },
];

export default function NewDashboard() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [watch, setWatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
  const initials = ((user?.first_name || name || 'M').charAt(0) + (user?.last_name ? user.last_name.charAt(0) : '')).toUpperCase();
  const tierRaw = (user?.membership_tier || d.membership_tier || '').toString();
  const tierLabel = tierRaw ? tierRaw.charAt(0).toUpperCase() + tierRaw.slice(1) : null;
  const balance = Number(user?.available_total != null ? user.available_total : (d.balance != null ? d.balance : (user?.balance || 0)));
  const gs = d.grid_stats || {};
  const filled = Number(gs.filled != null ? gs.filled : (gs.seats_filled != null ? gs.seats_filled : (gs.total_filled || 0)));
  const total = Number(gs.total != null ? gs.total : (gs.seats || 16)) || 16;
  const pct = total ? Math.min(Math.round((filled / total) * 100), 100) : 0;
  const team = Number(d.total_team || 0);
  const activeTeam = Number(d.directs_active != null ? d.directs_active : (d.network_active || 0));
  const toMilestone = Math.max(Math.min(Math.ceil((filled + 1) / 4) * 4, total) - filled, 0);
  const streak = Number(w.streak_days || 0);
  const watchedToday = !!w.watched_today;
  const refLink = 'https://www.superadpro.com/ref/' + (user?.username || '');
  const dots = Array.from({ length: 7 }, function (_, i) { return i < Math.min(streak, 7); });

  function copyLink() {
    try { navigator.clipboard.writeText(refLink); setCopied(true); setTimeout(function () { setCopied(false); }, 1800); } catch (e) {}
  }

  if (loading) return (<div className="nd"><style>{CSS}</style><div style={{maxWidth:1120,margin:'60px auto',textAlign:'center',color:'#64748b'}}>Loading your dashboard…</div></div>);

  return (
    <div className="nd" onClick={function () { if (menuOpen) setMenuOpen(false); }}>
      <style>{CSS}</style>
      <div className="wrap">

        <div className="top">
          <div className="brand">
            <span className="logomark"><svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg></span>
            <span className="wordmark">SuperAd<span className="pro">Pro</span></span>
          </div>
          <div className="rt">
            <Link className="bal" to="/wallet" aria-label="Wallet — available balance">
              <span className="ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M16 14h2"/></svg></span>
              <span className="txt"><span className="l">Available</span><span className="a">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
            </Link>
            <div className="acct" onClick={function (e) { e.stopPropagation(); }}>
            <button className={'avatar-btn' + (menuOpen ? ' open' : '')} onClick={function () { setMenuOpen(function (o) { return !o; }); }} aria-label="Account menu" aria-expanded={menuOpen}>
              {menuOpen
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>}
            </button>
            {menuOpen && (
              <div className="menu">
                <div className="mhead"><b>{name}</b><span>@{user?.username || ''}</span></div>
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

        <div className="doors">

          <Link className="door watch" to="/watch" style={{ textDecoration: 'none' }}>
            <div className="w-left">
              <div className="playwrap">
                {!watchedToday && <><span className="pulse"></span><span className="pulse"></span></>}
                <span className="play">
                  {watchedToday
                    ? <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0a1438" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-10"/></svg>
                    : <svg width="30" height="30" viewBox="0 0 24 24" fill="#0a1438"><path d="M8 5v14l11-7z"/></svg>}
                </span>
              </div>
              <div className="w-copy">
                <div className="greet-line">Welcome back, {name}</div>
                <h2>{watchedToday ? "Today's watch — done" : "Today's video is ready"}</h2>
                <p>{watchedToday
                  ? "You're qualified to earn and withdraw today. Come back tomorrow to keep your streak alive."
                  : "One watch a day keeps your wallet active and your grid earnings switched on. Miss a day and earning pauses until you're back."}</p>
                {!watchedToday && <span className="w-cta">Watch now &nbsp;&rarr;</span>}
              </div>
            </div>
            <div className="w-right">
              <div className="streak">{dots.map(function (on, i) { return <i key={i} className={on ? 'on' : ''}></i>; })}</div>
              <div className="streak-n">{streak}</div>
              <div className="streak-l">day streak</div>
              <div className="w-status"><span className="ring"></span>{watchedToday ? 'Active today' : 'Watch to stay active today'}</div>
            </div>
          </Link>

          <div className="sharebar">
            <div className="si"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0e7490" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg></div>
            <div className="sl"><div className="lbl">Your affiliate link — share to grow your team</div><div className="lk">{refLink}</div></div>
            <div className="acts">
              <button className="copy" onClick={copyLink}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a1438" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>{copied ? 'Copied' : 'Copy link'}</button>
              <button className="share" aria-label="Share"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg></button>
            </div>
          </div>

          <div className="door income">
            <div className="d-head"><div><div className="eyebrow">Income</div></div><div className="d-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div></div>
            <div className="earned"><div className="big">{formatMoney(balance)}</div><div className="sub">available to withdraw</div></div>
            <div className="gridbar"><div className="gl"><span>Profit Grid</span><b>{filled} / {total} seats</b></div><div className="track"><div className="fill" style={{ width: pct + '%' }}></div></div></div>
            <div className="metrics">
              <div className="metric"><div className="mn">{team}</div><div className="ml">Team</div></div>
              <div className="metric"><div className="mn">{activeTeam}</div><div className="ml">Active</div></div>
              <div className="metric"><div className="mn">{toMilestone}</div><div className="ml">To bonus</div></div>
            </div>
            <div className="d-cta">
              <Link className="wallet-btn" to="/wallet" style={{ textDecoration: 'none' }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14h2"/></svg>Open wallet</Link>
              <Link className="grid-btn" to="/grid-visualiser" style={{ textDecoration: 'none' }}>Open grid <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0a1438" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></Link>
            </div>
          </div>

          <div className="door tools">
            <div className="d-head"><div><div className="eyebrow">Your Business</div><h3>Build &amp; grow</h3></div><div className="d-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.3 2.3-2.7-.7-.7-2.7z"/></svg></div></div>
            <div className="tgrid">
              {BIZ.map(function (b) {
                return (
                  <Link className="tile" to={b.to} key={b.to} style={{ textDecoration: 'none' }}>
                    <span className="go">{chev}</span>
                    <div className={'ti ' + b.cls}>{b.icon}</div>
                    <div><div className="tn">{b.name}</div><div className="td">{b.desc}</div></div>
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
