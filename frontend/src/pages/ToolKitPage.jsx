import { Link } from 'react-router-dom';
import CategoryShell from '../components/CategoryShell';

// Tool Kit category page (no sidebar) — Page Builder showcase + the other tools.

const MORE = [
  { to:'/pro/leads', cls:'t2', name:'Autoresponder', desc:'Capture leads and follow up automatically with email sequences.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> },
  { to:'/creative-studio', cls:'t3', name:'Content creator', desc:'Generate videos, posters and posts for your campaigns in seconds.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10z"/></svg> },
  { to:'/campaign-studio', cls:'t4', name:'Ad creator', desc:'Build the campaign ads that get watched across the network.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 13z"/></svg> },
];

export default function ToolKitPage() {
  return (
    <CategoryShell>
      <div className="phead">
        <div className="eb">Tool Kit</div>
        <h1>Build your business</h1>
        <p>Everything you need to create, capture and convert — start with the page builder.</p>
      </div>

      <div className="hero">
        <div className="hl">
          <div className="feat">Featured &middot; Page Builder</div>
          <h2>Build landing pages that convert</h2>
          <p>Drag-and-drop pages, funnels and opt-ins — no code, fully branded, live in minutes. Your front door to every campaign.</p>
          <Link className="cta" to="/pro/funnels">Open Page Builder &nbsp;&rarr;</Link>
        </div>
        <div className="hr">
          <div className="prev">
            <div className="bar"><i></i><i></i><i></i></div>
            <div className="body"><div className="h"></div><div className="l"></div><div className="l"></div><div className="l s"></div><div className="btn"></div></div>
          </div>
        </div>
      </div>

      <div className="sect"><h3>More in your toolkit</h3><span>capture leads, make content, build ads</span></div>
      <div className="grid">
        {MORE.map(function (t) {
          return (
            <Link className="tile" to={t.to} key={t.to}>
              <div className={'ti ' + t.cls}>{t.icon}</div>
              <h4>{t.name}</h4>
              <p>{t.desc}</p>
              <span className="go">Open &rarr;</span>
            </Link>
          );
        })}
      </div>
    </CategoryShell>
  );
}
