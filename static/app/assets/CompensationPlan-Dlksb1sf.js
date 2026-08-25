import{j as e,r as s}from"./vendor-uHY1p1JL.js";import{C as n,a as o}from"./index-CQWy-gS4.js";const c=`
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
`;function p({children:t,backTo:r="/dashboard",backLabel:a="Dashboard"}){return e.jsxs("div",{className:"cat",children:[e.jsx("style",{children:c}),e.jsxs("div",{className:"wrap",children:[e.jsx("div",{className:"topwrap",children:e.jsx(n,{backTo:r,backLabel:a})}),t]})]})}const l=t=>"$"+Number(t||0).toLocaleString("en-US"),d=[{n:1,kind:"keep"},{n:2,kind:"keep"},{n:3,kind:"ops"},{n:4,kind:"keep"},{n:5,kind:"keep"},{n:6,kind:"up"},{n:7,kind:"keep"},{n:8,kind:"keep"},{n:9,kind:"up"},{n:10,kind:"keep"},{n:11,kind:"up"}],x=`
.cp{--navy:#0a1f52;--navy2:#12388f;--red:#c8102e;--green:#2ecc71;--line:#e3e9f5;--mute:#7c89a8;max-width:900px;margin:0 auto;padding:8px 0 60px}
.cp *{box-sizing:border-box}
.cp .hero{position:relative;background:linear-gradient(135deg,var(--navy),var(--navy2));border-radius:22px;padding:40px 44px;color:#fff;overflow:hidden;text-align:left}
.cp .hero::after{content:'';position:absolute;top:-40px;right:-40px;width:220px;height:220px;background:radial-gradient(circle,rgba(255,39,67,.22),transparent 70%);pointer-events:none}
.cp .hero .eb{display:flex;align-items:center;gap:10px;font-size:11.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#9fb8ff;margin-bottom:14px}
.cp .hero .eb::before{content:'';width:26px;height:3px;background:var(--red);border-radius:2px}
.cp .hero h1{font-size:clamp(30px,5vw,46px);font-weight:900;letter-spacing:-.02em;line-height:1.04;margin:0 0 14px}
.cp .hero h1 .accent{color:#ff6b7f}
.cp .hero p{font-size:15.5px;color:#c3cff0;font-weight:500;line-height:1.6;margin:0;max-width:60ch}
.cp .hero .pills{display:flex;gap:9px;flex-wrap:wrap;margin-top:20px}
.cp .hero .pill{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:8px 13px;font-size:12.5px;font-weight:800;color:#eaf0ff}
.cp .hero .pill .dot{width:7px;height:7px;border-radius:50%;background:var(--red2)}
.cp .card{background:#fff;border-radius:20px;padding:26px;margin-top:18px;box-shadow:0 12px 34px -22px rgba(10,31,82,.3);border:1px solid var(--line)}
.cp .card h2{font-size:20px;font-weight:800;color:var(--navy);letter-spacing:-.01em}
.cp .sub{font-size:14px;color:var(--mute);margin-top:6px;font-weight:500;line-height:1.55}
.cp .cycle{display:grid;grid-template-columns:repeat(auto-fit,minmax(66px,1fr));gap:9px;margin-top:20px}
.cp .chip{border-radius:13px;padding:13px 6px;text-align:center;color:#fff}
.cp .chip .cn{font-size:21px;font-weight:900;line-height:1}
.cp .chip .ct{font-size:9px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;margin-top:5px;opacity:.95}
.cp .keep{background:var(--green)}.cp .ops{background:var(--red)}.cp .up{background:var(--navy2)}
.cp .legend{display:flex;gap:18px;margin-top:18px;flex-wrap:wrap}
.cp .lg{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--navy)}
.cp .ldot{width:13px;height:13px;border-radius:4px}
.cp .sum{display:flex;gap:12px;margin-top:20px}
.cp .sc{flex:1;border-radius:15px;padding:16px 10px;text-align:center}
.cp .sc .big{font-size:28px;font-weight:900;line-height:1}
.cp .sc .lbl{font-size:10.5px;font-weight:800;margin-top:5px;letter-spacing:.03em}
.cp .sc.k{background:rgba(46,204,113,.12)}.cp .sc.k .big,.cp .sc.k .lbl{color:#1f9d57}
.cp .sc.u{background:rgba(18,56,143,.1)}.cp .sc.u .big,.cp .sc.u .lbl{color:var(--navy2)}
.cp .sc.o{background:rgba(200,16,46,.1)}.cp .sc.o .big,.cp .sc.o .lbl{color:var(--red)}
.cp .ops-card{background:linear-gradient(135deg,#fff,#fff6f7);border:1.5px solid rgba(200,16,46,.22)}
.cp .ops-card h2{color:var(--red)}
.cp .ops-card .sub{color:#8a5560}
.cp .repeat{display:flex;align-items:center;gap:12px;background:#f6f8fd;border-radius:15px;padding:15px 17px;margin-top:18px}
.cp .repeat .ic{font-size:23px}
.cp .repeat .tx{font-size:13px;color:#33415c;font-weight:600;line-height:1.5}
.cp .repeat .tx b{color:var(--navy);font-weight:800}
.cp table{width:100%;border-collapse:collapse;margin-top:16px}
.cp th{text-align:left;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--mute);padding:0 10px 10px;border-bottom:1px solid var(--line)}
.cp th.num{text-align:right}
.cp td{padding:12px 10px;border-bottom:1px solid #f0f3f9;font-size:14px;color:var(--navy);font-weight:600}
.cp td.price{font-weight:800}
.cp td.num{text-align:right;font-weight:600;color:var(--mute)}
.cp .tbl-foot{font-size:12px;color:var(--mute);margin-top:12px;line-height:1.5}
.cp .cta-wrap{margin-top:20px;text-align:center}
.cp .cta{display:inline-block;background:var(--red);color:#fff;font-weight:800;font-size:15px;padding:14px 34px;border-radius:12px;text-decoration:none}
.cp .state{padding:22px;text-align:center;color:var(--mute);font-size:14px}
`;function f(){const[t,r]=s.useState(null);return s.useEffect(()=>{let a=!0;return o("/api/al/packs").then(i=>{a&&r(Array.isArray(i==null?void 0:i.packs)?i.packs:[])}).catch(()=>{a&&r([])}),()=>{a=!1}},[]),e.jsxs(p,{children:[e.jsx("style",{children:x}),e.jsxs("div",{className:"cp",children:[e.jsxs("div",{className:"hero",children:[e.jsx("div",{className:"eb",children:"Compensation Plan"}),e.jsxs("h1",{children:["Your effort. ",e.jsx("span",{className:"accent",children:"Your income."})]}),e.jsx("p",{children:"Sales are paid member-to-member, straight to your wallet. Here's exactly where every sale you make goes — nothing hidden."}),e.jsxs("div",{className:"pills",children:[e.jsxs("span",{className:"pill",children:[e.jsx("span",{className:"dot"})," Paid member-to-member"]}),e.jsxs("span",{className:"pill",children:[e.jsx("span",{className:"dot"})," Straight to your wallet"]}),e.jsxs("span",{className:"pill",children:[e.jsx("span",{className:"dot"})," Nothing hidden"]})]})]}),e.jsx("div",{className:"card",style:{padding:0,overflow:"hidden",background:"#000"},children:e.jsx("video",{controls:!0,preload:"metadata",playsInline:!0,poster:"/static/videos/advantagelife-plan-poster.jpg",style:{display:"block",width:"100%",height:"auto",aspectRatio:"16 / 9"},children:e.jsx("source",{src:"/static/videos/advantagelife-plan.mp4",type:"video/mp4"})})}),e.jsxs("div",{className:"card",children:[e.jsx("h2",{children:"Every 11 sales — the full cycle"}),e.jsx("div",{className:"sub",children:"This is one full package cycle — your first eleven sales. You keep seven; three pass up to your team; one funds the platform."}),e.jsx("div",{className:"cycle",children:d.map(a=>e.jsxs("div",{className:"chip "+a.kind,children:[e.jsx("div",{className:"cn",children:a.n}),e.jsx("div",{className:"ct",children:a.kind==="keep"?"You":a.kind==="ops"?"Ops":"Pass-up"})]},a.n))}),e.jsxs("div",{className:"legend",children:[e.jsxs("div",{className:"lg",children:[e.jsx("span",{className:"ldot",style:{background:"#2ecc71"}}),"You keep"]}),e.jsxs("div",{className:"lg",children:[e.jsx("span",{className:"ldot",style:{background:"#12388f"}}),"Passes up to your upline"]}),e.jsxs("div",{className:"lg",children:[e.jsx("span",{className:"ldot",style:{background:"#c8102e"}}),"Operational fee"]})]}),e.jsxs("div",{className:"sum",children:[e.jsxs("div",{className:"sc k",children:[e.jsx("div",{className:"big",children:"7"}),e.jsx("div",{className:"lbl",children:"YOU KEEP"})]}),e.jsxs("div",{className:"sc u",children:[e.jsx("div",{className:"big",children:"3"}),e.jsx("div",{className:"lbl",children:"PASS UP"})]}),e.jsxs("div",{className:"sc o",children:[e.jsx("div",{className:"big",children:"1"}),e.jsx("div",{className:"lbl",children:"OPERATIONS"})]})]})]}),e.jsxs("div",{className:"card ops-card",children:[e.jsx("h2",{children:"The 3rd sale — your operational fee"}),e.jsx("div",{className:"sub",children:"The 3rd sale of each cycle goes to the platform. It's what keeps AdvantageLife running — the hosting that keeps it online, the tools you use every day, and member support. There's no separate subscription and nothing to pay from your pocket: the platform funds itself from activity, so it can stay free to join and member-to-member on everything else."})]}),e.jsxs("div",{className:"card",children:[e.jsx("h2",{children:"How pass-ups work"}),e.jsx("div",{className:"sub",children:"Your 6th, 9th and 11th sales pass up to the first qualified member above you — someone who owns that pack level or higher and has done their daily watch. That's the team-building engine: as your team sells, their pass-ups flow up to you too."}),e.jsxs("div",{className:"repeat",children:[e.jsx("span",{className:"ic",children:"💯"}),e.jsxs("span",{className:"tx",children:[e.jsx("b",{children:"After your 11th sale, you keep 100%."})," Every further sale on that package is yours. When its views are delivered the package expires — renew, and a fresh 11-sale cycle begins."]})]})]}),e.jsxs("div",{className:"card",children:[e.jsx("h2",{children:"The packs"}),e.jsx("div",{className:"sub",children:"Every pack is a real video-advertising campaign. The price is the full commission that moves member-to-member on each sale."}),t===null?e.jsx("div",{className:"state",children:"Loading packs…"}):t.length===0?e.jsx("div",{className:"state",children:"No active packs to show."}):e.jsxs("table",{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Pack"}),e.jsx("th",{className:"num",children:"Price"}),e.jsx("th",{className:"num",children:"Views"}),e.jsx("th",{className:"num",children:"Daily watch"})]})}),e.jsx("tbody",{children:t.map(a=>e.jsxs("tr",{children:[e.jsx("td",{className:"name",children:a.name}),e.jsx("td",{className:"price",children:l(a.price)}),e.jsx("td",{className:"num",children:Number(a.views_target||0).toLocaleString("en-US")}),e.jsx("td",{className:"num",children:a.daily_watch_required??"—"})]},a.level))})]}),e.jsx("p",{className:"tbl-foot",children:"Your watch quota follows the largest pack you own. A campaign runs until its views are delivered, then has a grace window before it expires."}),e.jsx("div",{className:"cta-wrap",children:e.jsx("a",{className:"cta",href:"/packs",children:"Buy a pack →"})})]})]})]})}export{f as default};
