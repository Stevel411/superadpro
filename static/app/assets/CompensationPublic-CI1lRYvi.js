import{r as d,j as a,L as o}from"./vendor-Dlf1p8G5.js";import"./vendor-charts-sutgcRna.js";var m=[{n:"Starter",p:20},{n:"Builder",p:50},{n:"Pro",p:100},{n:"Advanced",p:200},{n:"Premium",p:400},{n:"Elite",p:600},{n:"Master",p:800},{n:"Champion",p:1e3}],g=[4,8,12,16];function r(c){return"$"+c.toLocaleString("en-US",{minimumFractionDigits:c%1?2:0,maximumFractionDigits:2})}function j(){var c=d.useState(m[0]),l=c[0],x=c[1],t=d.useState(2),n=t[0],h=t[1],p=l.p,i=n*10,s;return n===0?s="Refer members to start earning $10/mo each.":i<20?s="1 more referral covers your $20/mo membership.":i===20?s="Just 2 referrals cover your own $20/mo membership.":s=r(i)+"/mo recurring — "+r(i-20)+"/mo after your membership.",a.jsxs(a.Fragment,{children:[a.jsx("style",{children:v}),a.jsxs("div",{className:"comp-plan",children:[a.jsx("div",{className:"cp-nav",children:a.jsxs("div",{className:"cp-wrap cp-nav-in",children:[a.jsxs(o,{to:"/",className:"cp-brand",children:[a.jsx("span",{className:"cp-mk",children:a.jsx("svg",{viewBox:"0 0 24 24",fill:"#fff",children:a.jsx("path",{d:"M8 5v14l11-7z"})})}),a.jsxs("span",{className:"cp-nm",children:["SuperAd",a.jsx("em",{children:"Pro"})]})]}),a.jsxs("div",{className:"cp-right",children:[a.jsx(o,{to:"/explore",className:"cp-navlink",children:"Explore"}),a.jsx(o,{to:"/register",className:"cp-btn cp-pri cp-nav-cta",children:"Create account"})]})]})}),a.jsx("section",{className:"cp-hero",children:a.jsxs("div",{className:"cp-wrap",children:[a.jsx("span",{className:"cp-eyebrow",children:"The compensation plan"}),a.jsxs("h1",{children:["See exactly how",a.jsx("br",{}),a.jsx("span",{className:"cp-g",children:"the money is shared."})]}),a.jsx("p",{className:"cp-sub",children:"SuperAdPro is an advertising platform you can earn from. Pick a tier below and see the real numbers — 100% of Campaign Grid revenue is shared with members, with nothing hidden."}),a.jsx("span",{className:"cp-disc-pill",children:"⚠️ Earnings depend on individual effort — no income is guaranteed."})]})}),a.jsx("section",{className:"cp-sec",children:a.jsxs("div",{className:"cp-wrap",children:[a.jsxs("div",{className:"cp-head",children:[a.jsx("span",{className:"cp-eyebrow",children:"First, what you're buying"}),a.jsx("h2",{children:"It's an advertising platform first"}),a.jsx("p",{children:"The Campaign Grid isn't a money game — it's how SuperAdPro shares its advertising revenue with the members who power it."})]}),a.jsxs("div",{className:"cp-adrow",children:[a.jsxs("div",{className:"cp-adcard",children:[a.jsx("div",{className:"cp-an",children:"1"}),a.jsx("h4",{children:"Buy a campaign tier"}),a.jsx("p",{children:"Activate a tier to put your content into the advertising rotation in front of real members."})]}),a.jsxs("div",{className:"cp-adcard",children:[a.jsx("div",{className:"cp-an",children:"2"}),a.jsx("h4",{children:"Real members watch"}),a.jsx("p",{children:"Every member watches daily to stay qualified — a genuinely engaged audience, not bots."})]}),a.jsxs("div",{className:"cp-adcard",children:[a.jsx("div",{className:"cp-an",children:"3"}),a.jsx("h4",{children:"100% is shared back"}),a.jsx("p",{children:"50% direct · 25% across five levels · 25% bonus pool. The company keeps 0%."})]})]})]})}),a.jsx("section",{className:"cp-sec cp-alt",children:a.jsxs("div",{className:"cp-wrap",children:[a.jsxs("div",{className:"cp-head",children:[a.jsx("span",{className:"cp-eyebrow",children:"Interactive"}),a.jsx("h2",{children:"Explore the Campaign Grid"}),a.jsx("p",{children:"Tap a tier to see how each commission is calculated. Every figure is the live platform rate."})]}),a.jsxs("div",{className:"cp-calc",children:[a.jsxs("div",{className:"cp-calc-top",children:[a.jsxs("div",{children:[a.jsx("h3",{children:"Campaign Grid calculator"}),a.jsxs("p",{children:["Tier: ",a.jsx("span",{className:"cp-mono",children:l.n})," · seat price ",a.jsxs("span",{className:"cp-mono",children:["$",p]})]})]}),a.jsx("div",{className:"cp-badge100",children:"100% to members · 0% company"})]}),a.jsx("div",{className:"cp-tiers",children:m.map(function(e){return a.jsxs("button",{type:"button",className:"cp-tierbtn"+(e.n===l.n?" on":""),onClick:function(){x(e)},children:[e.n,a.jsxs("small",{children:["$",e.p]})]},e.n)})}),a.jsxs("div",{className:"cp-calc-body",children:[a.jsxs("div",{className:"cp-outs",children:[a.jsxs("div",{className:"cp-out d",children:[a.jsx("div",{className:"cp-oic",children:"50%"}),a.jsxs("div",{children:[a.jsx("div",{className:"cp-ot",children:"Direct commission — per member you personally sponsor"}),a.jsx("div",{className:"cp-ov",children:r(p*.5)})]})]}),a.jsxs("div",{className:"cp-out u",children:[a.jsx("div",{className:"cp-oic",children:"5%"}),a.jsxs("div",{children:[a.jsx("div",{className:"cp-ot",children:"Uni-level — per qualifying member, on each of 5 levels"}),a.jsxs("div",{className:"cp-ov",children:[r(p*.05)," ",a.jsxs("small",{children:["× 5 levels = ",r(p*.25)]})]})]})]}),a.jsxs("div",{className:"cp-out b",children:[a.jsx("div",{className:"cp-oic",children:"25%"}),a.jsxs("div",{children:[a.jsx("div",{className:"cp-ot",children:"Bonus pool — paid across a completed 16-seat grid"}),a.jsx("div",{className:"cp-ov",children:r(p*4)})]})]})]}),a.jsxs("div",{className:"cp-gridbox",children:[a.jsx("div",{className:"cp-gl",children:"4 × 4 grid · bonus paid at seats 4 · 8 · 12 · 16"}),a.jsx("div",{className:"cp-g4",children:Array.from({length:16},function(e,f){return f+1}).map(function(e){return a.jsx("div",{className:"cp-cell"+(g.indexOf(e)>=0?" bonus":""),children:e},e)})}),a.jsxs("div",{className:"cp-gcap",children:["Completed grid bonus pool: ",a.jsx("b",{children:r(p*4)})]})]})]})]})]})}),a.jsx("section",{className:"cp-sec",children:a.jsxs("div",{className:"cp-wrap",children:[a.jsxs("div",{className:"cp-head",children:[a.jsx("span",{className:"cp-eyebrow",children:"All together"}),a.jsx("h2",{children:"Three ways the money comes back"})]}),a.jsxs("div",{className:"cp-streams",children:[a.jsxs("div",{className:"cp-scard s1",children:[a.jsx("div",{className:"cp-strip"}),a.jsx("div",{className:"cp-tag",children:"Stream 1 · Membership"}),a.jsx("h4",{children:"Refer, earn monthly"}),a.jsx("p",{children:"Earn $10/month for every active member you refer — recurring, for as long as they stay."}),a.jsxs("div",{className:"cp-slider-wrap",children:[a.jsxs("div",{className:"cp-slider-row",children:[a.jsxs("span",{className:"cp-slider-lab",children:[n," active ",n===1?"referral":"referrals"]}),a.jsxs("span",{className:"cp-rv",children:["$",i,a.jsx("small",{children:"/mo"})]})]}),a.jsx("input",{type:"range",min:"0",max:"20",value:n,onChange:function(e){h(+e.target.value)}}),a.jsx("div",{className:"cp-hint",children:s})]})]}),a.jsxs("div",{className:"cp-scard s2",children:[a.jsx("div",{className:"cp-strip"}),a.jsx("div",{className:"cp-tag",children:"Stream 2 · Campaign Grid"}),a.jsx("h4",{children:"100% to members"}),a.jsx("p",{children:"A revenue-share advertising product. Across 8 tiers, the completed-grid bonus pool ranges from $80 to $4,000 — all shared with members."})]}),a.jsxs("div",{className:"cp-scard s3",children:[a.jsx("div",{className:"cp-strip"}),a.jsx("div",{className:"cp-tag",children:"Stream 3 · Creator Credits"}),a.jsx("h4",{children:"20% flat share"}),a.jsx("p",{children:"Earn 20% on every Creator Credit pack your referrals buy — their first purchase and every repurchase after."})]})]})]})}),a.jsx("section",{className:"cp-sec cp-alt",style:{padding:"60px 0"},children:a.jsx("div",{className:"cp-wrap",children:a.jsxs("div",{className:"cp-disc-box",children:[a.jsx("b",{children:"Income disclosure."}),' The figures above are commission rates, not earnings projections. Actual income depends entirely on individual effort, the size and activity of your network, and grid completion. Many members earn little or nothing. "100% to members" applies to the Campaign Grid advertising product. No income is guaranteed.']})})}),a.jsx("section",{className:"cp-final",children:a.jsxs("div",{className:"cp-wrap",children:[a.jsx("h2",{children:"Ready to start?"}),a.jsx(o,{to:"/register",className:"cp-btn cp-pri cp-final-btn",children:"Create your free account  →"})]})}),a.jsx("div",{className:"cp-foot",children:"© 2026 SuperAdPro · Earnings depend on individual effort; no income is guaranteed."})]})]})}var v=`
.comp-plan{
  --ink:#0a1438;--ink2:#1e2c54;--dim:#5b6b8c;--line:#e6edf8;
  --cy1:#0891b2;--cy2:#06b6d4;--cy3:#22d3ee;--sky:#0ea5e9;--grn:#16a34a;--vio:#7c3aed;--cob:#1e3a8a;
  --shadow:0 30px 70px -36px rgba(20,45,110,.32);--shadow-sm:0 14px 36px -20px rgba(20,45,110,.30);
  font-family:'DM Sans',sans-serif;color:var(--ink);background:#fff;min-height:100vh;overflow-x:hidden;
}
.comp-plan h1,.comp-plan h2,.comp-plan h3,.comp-plan h4{font-family:'Sora',sans-serif}
.comp-plan .cp-mono{font-family:'JetBrains Mono',monospace}
.comp-plan .cp-wrap{max-width:1100px;margin:0 auto;padding:0 40px}
.comp-plan .cp-eyebrow{font-family:'Sora';font-weight:700;font-size:12.5px;letter-spacing:2.5px;text-transform:uppercase;color:var(--cy1)}
.comp-plan .cp-btn{display:inline-flex;align-items:center;gap:8px;font-family:'Sora';font-weight:700;font-size:15px;border-radius:12px;padding:14px 26px;text-decoration:none;cursor:pointer;border:none;transition:transform .18s,box-shadow .2s}
.comp-plan .cp-pri{background:linear-gradient(135deg,var(--cy1),var(--cob));color:#fff;box-shadow:0 16px 32px -14px rgba(8,145,178,.55)}
.comp-plan .cp-pri:hover{transform:translateY(-2px)}
.comp-plan .cp-nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.comp-plan .cp-nav-in{display:flex;align-items:center;height:74px;gap:18px}
.comp-plan .cp-brand{display:flex;align-items:center;gap:11px;text-decoration:none}
.comp-plan .cp-mk{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--cy2),var(--cob));display:grid;place-items:center}.comp-plan .cp-mk svg{width:15px;height:15px}
.comp-plan .cp-nm{font-family:'Sora';font-weight:800;font-size:20px;color:var(--ink)}.comp-plan .cp-nm em{color:var(--cy1);font-style:normal}
.comp-plan .cp-right{margin-left:auto;display:flex;gap:9px;align-items:center}
.comp-plan .cp-navlink{font-weight:600;font-size:15px;color:var(--ink2);text-decoration:none;padding:9px 14px;border-radius:9px}
.comp-plan .cp-navlink:hover{background:#f3f7ff}
.comp-plan .cp-nav-cta{padding:10px 18px;font-size:14px}
.comp-plan .cp-hero{position:relative;overflow:hidden;text-align:center;padding:70px 0 56px;background:radial-gradient(75% 90% at 50% 0%,#eaf3ff 0%,transparent 60%),linear-gradient(180deg,#fbfdff,#f4f8ff)}
.comp-plan .cp-hero h1{font-weight:800;font-size:58px;line-height:1.04;letter-spacing:-1.5px;margin:18px auto 0;max-width:16ch}
.comp-plan .cp-g{background:linear-gradient(115deg,var(--cy1),var(--cy2) 55%,var(--vio));-webkit-background-clip:text;background-clip:text;color:transparent}
.comp-plan .cp-sub{font-size:19px;line-height:1.55;color:var(--dim);max-width:600px;margin:20px auto 0}
.comp-plan .cp-disc-pill{display:inline-flex;align-items:center;gap:8px;margin-top:22px;background:#fff;border:1px solid var(--line);border-radius:100px;padding:8px 16px;font-size:12.5px;font-weight:600;color:var(--dim);box-shadow:var(--shadow-sm)}
.comp-plan .cp-sec{padding:84px 0}
.comp-plan .cp-alt{background:linear-gradient(180deg,#f6f9ff,#fff)}
.comp-plan .cp-head{text-align:center;max-width:680px;margin:0 auto 48px}
.comp-plan .cp-head h2{font-weight:800;font-size:40px;letter-spacing:-1px;margin:14px 0 12px}
.comp-plan .cp-head p{font-size:17px;color:var(--dim);line-height:1.6}
.comp-plan .cp-adrow{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.comp-plan .cp-adcard{background:#fff;border:1px solid var(--line);border-radius:18px;padding:28px 24px;box-shadow:var(--shadow-sm)}
.comp-plan .cp-an{width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,var(--cy1),var(--cob));color:#fff;font-family:'Sora';font-weight:800;display:grid;place-items:center;margin-bottom:16px}
.comp-plan .cp-adcard h4{font-size:18px;font-weight:800;margin-bottom:8px}
.comp-plan .cp-adcard p{font-size:14px;color:var(--dim);line-height:1.55}
.comp-plan .cp-calc{background:#fff;border:1px solid var(--line);border-radius:26px;box-shadow:var(--shadow);overflow:hidden}
.comp-plan .cp-calc-top{background:linear-gradient(135deg,var(--cob),#0a1438);padding:30px 36px;color:#fff;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
.comp-plan .cp-calc-top h3{font-size:22px;font-weight:800}
.comp-plan .cp-calc-top p{color:#bcd0f0;font-size:14px;margin-top:4px}
.comp-plan .cp-badge100{background:rgba(34,197,94,.18);border:1px solid rgba(34,197,94,.5);color:#4ade80;font-family:'Sora';font-weight:800;font-size:13px;padding:9px 16px;border-radius:100px}
.comp-plan .cp-tiers{display:flex;flex-wrap:wrap;gap:9px;padding:26px 36px 6px}
.comp-plan .cp-tierbtn{font-family:'Sora';font-weight:700;font-size:14px;padding:11px 16px;border-radius:11px;border:1.5px solid var(--line);background:#fff;color:var(--ink2);cursor:pointer;transition:all .15s}
.comp-plan .cp-tierbtn:hover{border-color:var(--cy2)}
.comp-plan .cp-tierbtn.on{background:linear-gradient(135deg,var(--cy1),var(--cob));color:#fff;border-color:transparent;box-shadow:0 10px 22px -12px rgba(8,145,178,.7)}
.comp-plan .cp-tierbtn small{display:block;font-family:'JetBrains Mono';font-size:11px;opacity:.7;font-weight:700}
.comp-plan .cp-calc-body{display:grid;grid-template-columns:1fr 1fr;gap:32px;padding:24px 36px 36px;align-items:center}
.comp-plan .cp-outs{display:grid;gap:14px}
.comp-plan .cp-out{display:flex;align-items:center;gap:16px;border:1px solid var(--line);border-radius:14px;padding:18px 20px;background:#fbfdff}
.comp-plan .cp-oic{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;color:#fff;flex:none;font-family:'Sora';font-weight:800;font-size:13px}
.comp-plan .cp-out.d .cp-oic{background:linear-gradient(135deg,var(--cy1),var(--cy2))}
.comp-plan .cp-out.u .cp-oic{background:linear-gradient(135deg,var(--sky),#38bdf8)}
.comp-plan .cp-out.b .cp-oic{background:linear-gradient(135deg,var(--vio),#a78bfa)}
.comp-plan .cp-ot{font-size:13px;color:var(--dim);font-weight:600}
.comp-plan .cp-ov{font-family:'JetBrains Mono';font-weight:800;font-size:26px;color:var(--ink);line-height:1.1}
.comp-plan .cp-ov small{font-size:13px;color:var(--dim);font-weight:600}
.comp-plan .cp-gridbox{text-align:center}
.comp-plan .cp-gl{font-family:'Sora';font-weight:700;font-size:13px;color:var(--ink2);margin-bottom:14px}
.comp-plan .cp-g4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:300px;margin:0 auto}
.comp-plan .cp-cell{aspect-ratio:1;border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono';font-weight:800;font-size:13px;background:#eef4fb;border:1px solid #e2e9f4;color:#7e8fb0}
.comp-plan .cp-cell.bonus{background:linear-gradient(140deg,var(--vio),#a78bfa);color:#fff;border:none}
.comp-plan .cp-gcap{margin-top:14px;font-size:13px;color:var(--dim)}
.comp-plan .cp-gcap b{color:var(--vio);font-family:'JetBrains Mono'}
.comp-plan .cp-streams{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.comp-plan .cp-scard{background:#fff;border:1px solid var(--line);border-radius:20px;padding:30px 26px;box-shadow:var(--shadow-sm);position:relative;overflow:hidden}
.comp-plan .cp-strip{position:absolute;top:0;left:0;right:0;height:5px}
.comp-plan .cp-scard.s1 .cp-strip{background:linear-gradient(90deg,var(--cob),#3b82f6)}
.comp-plan .cp-scard.s2 .cp-strip{background:linear-gradient(90deg,var(--cy1),var(--cy3))}
.comp-plan .cp-scard.s3 .cp-strip{background:linear-gradient(90deg,var(--vio),#a78bfa)}
.comp-plan .cp-tag{font-family:'Sora';font-weight:700;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--cy1)}
.comp-plan .cp-scard.s1 .cp-tag{color:var(--cob)}.comp-plan .cp-scard.s3 .cp-tag{color:var(--vio)}
.comp-plan .cp-scard h4{font-size:21px;font-weight:800;margin:8px 0 14px}
.comp-plan .cp-scard p{font-size:14px;color:var(--dim);line-height:1.55}
.comp-plan .cp-slider-wrap{margin-top:18px;padding-top:18px;border-top:1px dashed var(--line)}
.comp-plan .cp-slider-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
.comp-plan .cp-slider-lab{font-size:13px;color:var(--dim);font-weight:600}
.comp-plan .cp-rv{font-family:'JetBrains Mono';font-weight:800;font-size:24px;color:var(--grn)}
.comp-plan .cp-rv small{font-size:13px;color:var(--dim)}
.comp-plan .cp-slider-wrap input{width:100%;accent-color:var(--cy1)}
.comp-plan .cp-hint{font-size:12px;color:var(--dim);margin-top:8px}
.comp-plan .cp-disc-box{max-width:820px;margin:0 auto;background:#f8fafc;border:1px solid var(--line);border-radius:16px;padding:24px 28px;font-size:13px;color:var(--dim);line-height:1.6;text-align:center}
.comp-plan .cp-final{text-align:center;padding:80px 0 90px}
.comp-plan .cp-final h2{font-size:38px;font-weight:800;letter-spacing:-1px;margin-bottom:24px}
.comp-plan .cp-final-btn{font-size:17px;padding:17px 34px}
.comp-plan .cp-foot{background:#0a1438;color:#8aa2cc;text-align:center;padding:32px;font-size:13px}
@media(max-width:880px){
  .comp-plan .cp-adrow,.comp-plan .cp-streams{grid-template-columns:1fr}
  .comp-plan .cp-calc-body{grid-template-columns:1fr;gap:28px}
  .comp-plan .cp-hero h1{font-size:42px}
  .comp-plan .cp-head h2{font-size:30px}
  .comp-plan .cp-tiers,.comp-plan .cp-calc-top,.comp-plan .cp-calc-body{padding-left:22px;padding-right:22px}
}
`;export{j as default};
