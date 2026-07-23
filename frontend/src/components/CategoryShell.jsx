import CategoryTopBar from './CategoryTopBar';

// Shared chrome for the new category pages: top bar (logo + back to dashboard +
// hamburger account menu), no sidebar. Children render inside the same .wrap.
// Design tokens are defined on .cat so page-level CSS (also scoped .cat) can use them.

const SHELL_CSS = `
.cat{--ink:#0a1f52;--ink2:#12388f;--cobalt:#12388f;--cyan:#c8102e;--cyanb:#e0243c;--cyans:#ff5f74;
  --bg:#eaf0fa;--card:#fff;--line:#e4eaf3;--muted:#64748b;--text:#0f172a;
  --shadow:0 10px 30px rgba(10,20,56,.08);--shadow-lg:0 22px 50px rgba(10,20,56,.16);
  --lift:inset 0 1px 0 rgba(255,255,255,.9),0 2px 6px rgba(10,20,56,.09),0 20px 44px rgba(10,20,56,.18);
  font-family:'Inter',system-ui,sans-serif;color:var(--text);min-height:100vh;
  background:#FFFFFF;
  padding:20px clamp(14px,4vw,40px) 60px;}
.cat *{margin:0;padding:0;box-sizing:border-box;}
.cat h1,.cat h2,.cat h3,.cat h4{font-family:'Inter',sans-serif;}
.cat .mono{font-family:'JetBrains Mono',monospace;}
.cat .wrap{width:100%;}
.cat .topwrap{margin-bottom:22px;}
.cat .phead{margin-bottom:18px;}
.cat .phead .eb{font-family:'Inter';font-weight:800;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c8102e;}
.cat .phead h1{font-size:clamp(24px,3.6vw,32px);font-weight:800;color:var(--ink);letter-spacing:-.5px;margin-top:4px;}
.cat .phead p{color:var(--muted);font-size:14.5px;margin-top:4px;}
.cat .hero{position:relative;overflow:hidden;border-radius:22px;background:linear-gradient(120deg,#0a1438 0%,#15275f 52%,#1e3a8a 120%);color:#fff;box-shadow:var(--shadow-lg);padding:32px clamp(24px,3.6vw,40px);display:flex;align-items:center;gap:clamp(24px,4vw,48px);margin-bottom:30px;}
.cat .hero::after{content:'';position:absolute;right:-80px;top:-90px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(34,211,238,.2),transparent 65%);}
.cat .hero .hl{z-index:1;flex:1;min-width:0;}
.cat .hero .feat{font-family:'Inter';font-weight:800;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--cyans);}
.cat .hero h2{font-size:clamp(24px,3vw,32px);font-weight:800;margin:8px 0 10px;letter-spacing:-.4px;}
.cat .hero p{color:#cfe0fb;font-size:15px;max-width:460px;line-height:1.55;}
.cat .hero .cta{margin-top:20px;display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#e0243c,#c8102e);color:#fff;font-family:'Inter';font-weight:800;font-size:15px;padding:14px 24px;border-radius:13px;box-shadow:0 12px 28px rgba(200,16,46,.35);text-decoration:none;transition:transform .2s,box-shadow .2s;}
.cat .hero .cta:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(6,182,212,.55);}
.cat .hero .hr{z-index:1;flex:0 0 auto;width:300px;}
.cat .prev{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 24px 50px rgba(0,0,0,.32);}
.cat .prev .bar{height:30px;background:#f1f5f9;display:flex;align-items:center;gap:6px;padding:0 12px;}
.cat .prev .bar i{width:9px;height:9px;border-radius:50%;background:#cbd5e1;}
.cat .prev .body{padding:16px;}
.cat .prev .h{height:42px;border-radius:8px;background:linear-gradient(135deg,#12388f,#c8102e);margin-bottom:10px;}
.cat .prev .l{height:9px;border-radius:5px;background:#e2e8f0;margin-bottom:7px;}
.cat .prev .l.s{width:60%;}
.cat .prev .btn{height:26px;width:96px;border-radius:7px;background:#c8102e;margin-top:12px;}
.cat .sect{display:flex;align-items:baseline;gap:12px;margin:0 2px 16px;}
.cat .sect h3{font-family:'Inter';font-size:18px;font-weight:800;color:var(--ink);}
.cat .sect span{font-size:13px;color:var(--muted);}
.cat .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;}
.cat .tile{position:relative;background:#fff;border:1px solid #d4ddea;border-radius:16px;padding:20px;cursor:pointer;box-shadow:var(--lift);transition:border-color .2s;display:flex;flex-direction:column;gap:10px;text-decoration:none;}
.cat .tile:hover{border-color:var(--cyanb);}
.cat .tile .ti{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;}
.cat .tile .t1{background:linear-gradient(135deg,#1e3a8a,#3b82f6);}
.cat .tile .t2{background:linear-gradient(135deg,#12388f,#1e4fc4);}
.cat .tile .t3{background:linear-gradient(135deg,#7c3aed,#a855f7);}
.cat .tile .t4{background:linear-gradient(135deg,#c8102e,#ff5f74);}
.cat .tile h4{font-family:'Inter';font-size:16px;font-weight:700;color:var(--ink);}
.cat .tile p{font-size:12.5px;color:var(--muted);line-height:1.4;}
.cat .tile .go{margin-top:auto;display:inline-flex;align-items:center;gap:7px;font-family:'Inter';font-weight:700;font-size:13px;color:var(--cobalt);}
@media (max-width:820px){.cat .hero{flex-direction:column;align-items:flex-start;}.cat .hero .hr{width:100%;max-width:340px;}.cat .grid{grid-template-columns:1fr;}}
`;

export default function CategoryShell({ children, backTo = '/dashboard', backLabel = 'Dashboard' }) {
  return (
    <div className="cat">
      <style>{SHELL_CSS}</style>
      <div className="wrap">
        <div className="topwrap"><CategoryTopBar backTo={backTo} backLabel={backLabel} /></div>
        {children}
      </div>
    </div>
  );
}
