import { Link } from 'react-router-dom';
import CategoryShell from '../components/CategoryShell';

// Tool Kit category page (no sidebar). Showcases the Page Builder, with the other
// three tools below. First of the four category pages built on CategoryShell.

const PAGE_CSS = `
.cat .phead{margin-bottom:18px;}
.cat .phead .eb{font-family:'JetBrains Mono';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#0e7490;}
.cat .phead h1{font-size:clamp(24px,3.6vw,32px);font-weight:800;color:var(--ink);letter-spacing:-.5px;margin-top:4px;}
.cat .phead p{color:var(--muted);font-size:14.5px;margin-top:4px;}
.cat .hero{position:relative;overflow:hidden;border-radius:22px;background:linear-gradient(120deg,#0a1438 0%,#15275f 52%,#1e3a8a 120%);color:#fff;box-shadow:var(--shadow-lg);padding:32px clamp(24px,3.6vw,40px);display:flex;align-items:center;gap:clamp(24px,4vw,48px);margin-bottom:30px;}
.cat .hero::after{content:'';position:absolute;right:-80px;top:-90px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.2),transparent 65%);}
.cat .hero .hl{z-index:1;flex:1;min-width:0;}
.cat .hero .feat{font-family:'JetBrains Mono';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--cyans);}
.cat .hero h2{font-size:clamp(24px,3vw,32px);font-weight:800;margin:8px 0 10px;letter-spacing:-.4px;}
.cat .hero p{color:#cfe0fb;font-size:15px;max-width:440px;line-height:1.55;}
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
.cat .tile .t2{background:linear-gradient(135deg,#0891b2,#22d3ee);}
.cat .tile .t3{background:linear-gradient(135deg,#7c3aed,#a855f7);}
.cat .tile .t4{background:linear-gradient(135deg,#0e7490,#06b6d4);}
.cat .tile h4{font-family:'Sora';font-size:16px;font-weight:700;color:var(--ink);}
.cat .tile p{font-size:12.5px;color:var(--muted);line-height:1.4;}
.cat .tile .go{margin-top:auto;display:inline-flex;align-items:center;gap:7px;font-family:'Sora';font-weight:700;font-size:13px;color:var(--cobalt);}
@media (max-width:820px){.cat .hero{flex-direction:column;align-items:flex-start;}.cat .hero .hr{width:100%;max-width:320px;}.cat .grid{grid-template-columns:1fr;}}
`;

const MORE = [
  { to:'/pro/leads', cls:'t2', name:'Autoresponder', desc:'Capture leads and follow up automatically with email sequences.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> },
  { to:'/creative-studio', cls:'t3', name:'Content creator', desc:'Generate videos, posters and posts for your campaigns in seconds.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10z"/></svg> },
  { to:'/campaign-studio', cls:'t4', name:'Ad creator', desc:'Build the campaign ads that get watched across the network.', icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 13z"/></svg> },
];

export default function ToolKitPage() {
  return (
    <CategoryShell>
      <style>{PAGE_CSS}</style>

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
