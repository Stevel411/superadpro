import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../utils/api';
import CategoryShell from '../components/CategoryShell';

// Team category page (no sidebar) — your network snapshot (real data) + sub-pages.

const CSS = `
.cat .net-stats{display:flex;gap:14px;}
.cat .net-stats .ns{flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(103,232,249,.25);border-radius:14px;padding:16px 18px;text-align:center;}
.cat .net-stats .ns .nn{font-family:'Sora';font-weight:800;font-size:30px;color:var(--cyanb);line-height:1;}
.cat .net-stats .ns .nl{font-family:'JetBrains Mono';font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#9fb6e0;margin-top:6px;}
`;

const SUB = [
  { to:'/command-centre', cls:'t1', name:'My team', desc:'Everyone in your network at a glance, with their status.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0M16 5.5a3 3 0 010 5.5M21 20a6 6 0 00-4-5.7"/></svg> },
  { to:'/my-team', cls:'t3', name:'Network tree', desc:'See your full downline structure level by level.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M12 11.5L5 16.5M12 11.5l7 5"/></svg> },
  { to:'/leaderboard', cls:'t4', name:'Leaderboard', desc:'See the top performers and where you rank.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3"/></svg> },
  { to:'/compensation-plan', cls:'t2', name:'Compensation plan', desc:'How all three income streams pay — explained in full.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h11l5 5v11a0 0 0 010 0H4z"/><path d="M14 4v5h5M8 13h8M8 17h8M8 9h2"/></svg> },
  { to:'/pay-it-forward', cls:'t3', name:'Pay It Forward', desc:'Gift a membership to your team and help them get started.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9M12 8C12 8 11 3 8 3a2.5 2.5 0 000 5h4zM12 8s1-5 4-5a2.5 2.5 0 010 5h-4z"/></svg> },
];

export default function TeamPage() {
  const [dash, setDash] = useState(null);
  useEffect(function () {
    let alive = true;
    apiGet('/api/dashboard').then(function (v) { if (alive) setDash(v || {}); }).catch(function () {});
    return function () { alive = false; };
  }, []);
  const d = dash || {};
  const team = Number(d.total_team || 0);
  const active = Number(d.directs_active != null ? d.directs_active : (d.network_active || 0));
  const directs = Number(d.personal_referrals != null ? d.personal_referrals : (d.direct_referrals_count || 0));

  return (
    <CategoryShell>
      <style>{CSS}</style>
      <div className="phead"><div className="eb">Team</div><h1>Your network</h1><p>Grow your team, keep them active, and build your unilevel earnings.</p></div>

      <div className="hero">
        <div className="hl">
          <div className="feat">Featured &middot; Network snapshot</div>
          <h2>Your team at a glance</h2>
          <p>Every active member in your network earns alongside you. Keep growing and keep them watching.</p>
          <Link className="cta" to="/command-centre">Open your team &nbsp;&rarr;</Link>
        </div>
        <div className="hr">
          <div className="net-stats">
            <div className="ns"><div className="nn">{team}</div><div className="nl">Team</div></div>
            <div className="ns"><div className="nn">{active}</div><div className="nl">Active</div></div>
            <div className="ns"><div className="nn">{directs}</div><div className="nl">Direct</div></div>
          </div>
        </div>
      </div>

      <div className="sect"><h3>Manage your network</h3><span>team, structure and rankings</span></div>
      <div className="grid">
        {SUB.map(function (s) {
          return (
            <Link className="tile" to={s.to} key={s.to}>
              <div className={'ti ' + s.cls}>{s.icon}</div>
              <h4>{s.name}</h4>
              <p>{s.desc}</p>
              <span className="go">Open &rarr;</span>
            </Link>
          );
        })}
      </div>
    </CategoryShell>
  );
}
