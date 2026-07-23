import { Link } from 'react-router-dom';
import CategoryShell from '../components/CategoryShell';

// Campaign Tiers category page (no sidebar) — buy a tier & create your campaign
// showcase, then create / my campaigns / performance.

const CSS = `
.cat .tiers-mini{display:flex;flex-direction:column;gap:10px;}
.cat .tiers-mini .tr{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:13px 16px;}
.cat .tiers-mini .tr .nm{font-family:'Inter';font-weight:700;font-size:14px;color:#fff;}
.cat .tiers-mini .tr .pr{font-family:'Inter';font-weight:800;font-size:18px;color:var(--cyans);}
.cat .tiers-mini .tr.feat{background:rgba(200,16,46,.18);border-color:var(--cyanb);}
`;

const SUB = [
  { to:'/create-campaign', cls:'t2', name:'Create campaign', desc:'Upload your video and launch it to the network.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> },
  { to:'/campaign-videos', cls:'t3', name:'My campaigns', desc:'Manage and edit every campaign you are running.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg> },
  { to:'/campaign-analytics', cls:'t4', name:'Performance', desc:'See the views your ads delivered across the network.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5M4 19h16M8 16v-5M13 16V8M18 16v-3"/></svg> },
];

export default function CampaignsPage() {
  return (
    <CategoryShell>
      <style>{CSS}</style>
      <div className="phead"><div className="eb">Campaign Packs</div><h1>Your advertising</h1><p>Buy a pack, create the campaign that gets watched, and deliver real views to your offer.</p></div>

      <div className="hero">
        <div className="hl">
          <div className="feat">Featured &middot; Buy a pack</div>
          <h2>Get your video watched</h2>
          <p>Pick a pack, then create your campaign — real members watch it daily to stay earning-qualified, so your views come from people with a reason to pay attention.</p>
          <Link className="cta" to="/campaign-tiers">Buy a pack &nbsp;&rarr;</Link>
        </div>
        <div className="hr">
          <div className="tiers-mini">
            <div className="tr"><span className="nm">Launchpad</span><span className="pr">$10</span></div>
            <div className="tr feat"><span className="nm">Starter</span><span className="pr">$20</span></div>
            <div className="tr"><span className="nm">Builder</span><span className="pr">$50</span></div>
          </div>
        </div>
      </div>

      <div className="sect"><h3>Run your campaigns</h3><span>create, manage and track</span></div>
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
