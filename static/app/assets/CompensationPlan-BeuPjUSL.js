import{r as n,j as e}from"./vendor-BEa4jfna.js";import{a as l,C as c}from"./index-D8R2fzd5.js";import"./vendor-charts-sutgcRna.js";const p=`
.cp{--navy:#0a1f52;--navy2:#12388f;--red:#c8102e;--line:#dfe5f1;--mute:#5b6b8c;--wash:#f4f7fd}
.cp *{box-sizing:border-box}
.cp .sec{padding:46px 0}
.cp .eyebrow{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--red);margin-bottom:12px}
.cp .eyebrow.on-navy{color:#7fa3ff}
.cp h1{font-size:clamp(32px,7vw,56px);font-weight:900;letter-spacing:-.035em;line-height:1.03;margin:0}
.cp h2{font-size:clamp(24px,4.4vw,36px);font-weight:900;letter-spacing:-.03em;line-height:1.08;margin:0 0 10px}
.cp h3{font-size:17px;font-weight:800;letter-spacing:-.01em;margin:0 0 6px}
.cp .lede{font-size:clamp(15px,2.3vw,17.5px);color:var(--mute);max-width:60ch;margin:0}

.cp .hero{position:relative;isolation:isolate;background:var(--navy);color:#fff;
  padding:46px clamp(16px,4vw,34px) 0;overflow:hidden;border-radius:20px}
.cp .hero-bg{position:absolute;inset:0;z-index:0;background-image:url('/static/images/al/comp-plan-hero.jpg');
  background-size:cover;background-position:center 46%}
.cp .hero-scrim{position:absolute;inset:0;z-index:1;opacity:.72;
  background:linear-gradient(180deg,rgba(10,31,82,.10) 0%,rgba(10,31,82,.34) 46%,rgba(10,31,82,.90) 100%),
             linear-gradient(96deg,rgba(10,31,82,.76) 0%,rgba(10,31,82,.16) 56%,rgba(18,56,143,.34) 100%)}
.cp .hero-in{position:relative;z-index:2}
.cp .hero h1{text-shadow:0 2px 12px rgba(4,17,48,.72),0 4px 40px rgba(4,17,48,.5)}
.cp .hero h1 span{color:#ff8095}
.cp .hero .lede{color:#c6d3ee;text-shadow:0 1px 8px rgba(4,17,48,.8),0 2px 22px rgba(4,17,48,.55);margin-top:14px}
@media(max-width:620px){.cp .hero-bg{background-position:68% 46%}.cp .hero-scrim{opacity:.82}}

.cp .strip-block{margin-top:32px;padding-bottom:44px}
.cp .strip-label{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#7fa3ff;margin-bottom:13px}
.cp .strip{display:flex;gap:7px;align-items:flex-end;overflow-x:auto;padding-bottom:6px}
.cp .slot{flex:0 0 auto;width:56px;border-radius:9px;padding:11px 0 9px;text-align:center;
  background:rgba(4,17,48,.60);-webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px);
  border:1.5px solid rgba(255,255,255,.22)}
.cp .slot .n{font-size:18px;font-weight:900;letter-spacing:-.03em;line-height:1}
.cp .slot .t{font-size:8.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-top:6px;opacity:.66}
.cp .slot.up{background:var(--red);border-color:var(--red);box-shadow:0 6px 18px rgba(200,16,46,.42)}
.cp .slot.up .t{opacity:.95}
.cp .slot.tail{width:auto;padding:11px 16px 9px;background:transparent;border-style:dashed;
  border-color:rgba(255,255,255,.32);backdrop-filter:none}
.cp .slot.tail .n{font-size:13px;letter-spacing:-.01em;white-space:nowrap}
.cp .strip-key{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px;font-size:12.5px;font-weight:600;color:#b9c8e8}
.cp .dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px}
.cp .dot.keep{background:rgba(255,255,255,.34)}
.cp .dot.pass{background:var(--red)}
.cp .note{margin-top:20px;padding:15px 17px;border-left:3px solid var(--red);border-radius:0 9px 9px 0;
  font-size:14.5px;font-weight:600;color:#e8eefb;max-width:62ch;
  background:rgba(4,17,48,.55);-webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px)}

.cp .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;align-items:stretch}
.cp .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;display:flex;flex-direction:column}
.cp .card .body{flex:1}
.cp .card p{font-size:14.5px;color:var(--mute);margin:4px 0 0}
.cp .gate-n{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;
  border-radius:7px;background:var(--navy);color:#fff;font-size:13px;font-weight:900;margin-bottom:12px}
.cp .pill{display:inline-block;margin-top:14px;padding:5px 11px;border-radius:99px;background:var(--wash);
  border:1px solid var(--line);font-size:11.5px;font-weight:800;letter-spacing:.04em;color:var(--navy2)}

.cp .chainbox{background:var(--navy);border-radius:16px;padding:24px;margin-top:22px;color:#fff}
.cp .you{display:inline-flex;align-items:center;gap:10px;padding:11px 20px;border-radius:11px;
  background:var(--red);font-weight:900;font-size:16px;box-shadow:0 8px 26px rgba(200,16,46,.42)}
.cp .rail{margin-top:6px;padding-left:22px;border-left:2px dashed rgba(255,255,255,.34)}
.cp .lvl{display:flex;align-items:center;gap:12px;padding:11px 0;flex-wrap:wrap}
.cp .lvl-tag{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#7fa3ff;min-width:64px}
.cp .lvl-txt{font-size:14px;color:#d6e0f6;font-weight:600;flex:1;min-width:180px}
.cp .lvl-amt{font-size:12.5px;font-weight:900;color:#fff;padding:5px 11px;border-radius:7px;
  background:rgba(200,16,46,.85);white-space:nowrap}
.cp .lvl.inf .lvl-txt{color:#fff;font-weight:800}
.cp .lvl.inf .lvl-tag{color:#ff8095}

.cp .tbl-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background:#fff}
.cp table{width:100%;border-collapse:collapse;min-width:560px}
.cp th,.cp td{padding:13px 15px;text-align:left;font-size:14px;border-bottom:1px solid var(--line)}
.cp th{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);
  background:var(--wash);white-space:nowrap}
.cp tbody tr:last-child td{border-bottom:0}
.cp td.name{font-weight:800}
.cp td.price{font-weight:900;color:var(--red);font-size:16px;letter-spacing:-.02em;white-space:nowrap}
.cp td.num{font-variant-numeric:tabular-nums}
.cp .tbl-foot{font-size:13px;color:var(--mute);margin-top:12px}
.cp .state{padding:22px;text-align:center;color:var(--mute);font-size:14.5px;font-weight:600}
.cp .state.err{color:var(--red)}

.cp .route{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:14px}
.cp .route h3{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.cp .route p{font-size:14.5px;color:var(--mute);margin:10px 0 0}
.cp .tag{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;
  border-radius:5px;background:var(--wash);color:var(--navy2);border:1px solid var(--line)}
.cp .tag.red{background:#fdeaee;color:var(--red);border-color:#f6c9d2}
.cp .flow{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px;font-size:13.5px;font-weight:700}
.cp .node{padding:7px 12px;border-radius:8px;background:var(--wash);border:1px solid var(--line)}
.cp .node.win{background:var(--navy);color:#fff;border-color:var(--navy)}
.cp .arw{color:var(--mute);font-weight:900}

.cp .lg{border:1px solid var(--line);border-radius:14px;background:#fff;overflow:hidden}
.cp .lg-row{display:grid;grid-template-columns:26px 1fr auto 70px;gap:10px;align-items:center;
  padding:12px 14px;border-bottom:1px solid var(--line);font-size:14.5px}
.cp .lg-row:last-child{border-bottom:0}
.cp .lg-head{background:var(--wash);font-size:10.5px;font-weight:800;letter-spacing:.1em;
  text-transform:uppercase;color:var(--mute)}
.cp .lg-n{font-weight:900;color:var(--mute);font-variant-numeric:tabular-nums}
.cp .lg-s{font-weight:700}
.cp .lg-t{font-weight:900;text-align:right;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.cp .lg-w{font-size:11.5px;font-weight:800;padding:4px 9px;border-radius:6px;white-space:nowrap}
.cp .w-you{background:var(--navy);color:#fff}
.cp .w-chain{background:var(--red);color:#fff}
.cp .lg-row.dim .lg-s{color:var(--mute)}
.cp .lg-zero{color:var(--mute);font-weight:700}
.cp .after{margin-top:14px;padding:15px 17px;border-left:3px solid var(--red);background:#fff;
  border-radius:0 12px 12px 0;font-size:14.5px;color:var(--mute)}
.cp .after strong{color:var(--navy)}

/* Buy Packs CTA. /packs is SERVER-RENDERED (main.py:70732) and App.jsx routes
   it through HardRedirect — a react-router <Link> renders nothing for it, so
   this must stay a plain anchor. */
.cp .cta-wrap{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:20px}
.cp .cta{display:inline-flex;align-items:center;gap:9px;background:var(--red);color:#fff;
  font-weight:900;font-size:15.5px;letter-spacing:-.01em;padding:14px 22px;border-radius:11px;
  text-decoration:none;box-shadow:0 10px 26px -8px rgba(200,16,46,.55);transition:transform .12s ease}
.cp .cta:hover{transform:translateY(-1px)}
.cp .cta-note{font-size:13.5px;color:var(--mute);font-weight:600}
`,d=[{n:1},{n:2},{n:3,chain:1},{n:4},{n:5},{n:6,chain:2},{n:7},{n:8},{n:9,chain:3}],h=[["Level 1","A member you kept passes up their 3rd, 6th and 9th sale"],["Level 2","The member they passed up is wired to you — their 3rd, 6th and 9th come to you too"],["Level 3","And the member they pass up. Same wiring, same three sales"],["Level 4","And the next. The chain does not shorten with depth"]],x=[{n:1},{n:2},{n:3,chain:1},{n:4},{n:5},{n:6,chain:2},{n:7},{n:8},{n:9,chain:3},{n:10}];function m(r){return"$"+Number(r||0).toLocaleString("en-US",{maximumFractionDigits:0})}function b(){const[r,i]=n.useState(null),[t,o]=n.useState("");return n.useEffect(()=>{let a=!0;return l("/api/al/packs").then(s=>{a&&i(Array.isArray(s==null?void 0:s.packs)?s.packs:[])}).catch(s=>{a&&o((s==null?void 0:s.message)||"Could not load the pack list.")}),()=>{a=!1}},[]),e.jsxs(c,{children:[e.jsx("style",{children:p}),e.jsxs("div",{className:"cp",children:[e.jsxs("header",{className:"hero",children:[e.jsx("div",{className:"hero-bg"}),e.jsx("div",{className:"hero-scrim"}),e.jsxs("div",{className:"hero-in",children:[e.jsx("div",{className:"eyebrow on-navy",children:"How you get paid"}),e.jsxs("h1",{children:["You pass up three sales.",e.jsx("br",{}),e.jsx("span",{children:"Three chains pay you back, forever."})]}),e.jsx("p",{className:"lede",children:"Every campaign pack you sell pays you 100% of its price, member to member. The platform never touches the money."}),e.jsxs("div",{className:"strip-block",children:[e.jsx("div",{className:"strip-label",children:"The three you pass up"}),e.jsxs("div",{className:"strip",children:[d.map(a=>e.jsxs("div",{className:"slot"+(a.chain?" up":""),children:[e.jsx("div",{className:"n",children:a.n}),e.jsx("div",{className:"t",children:a.chain?"Chain "+a.chain:"Yours"})]},a.n)),e.jsxs("div",{className:"slot tail",children:[e.jsx("div",{className:"n",children:"10 onward — all yours"}),e.jsx("div",{className:"t",children:"For life"})]})]}),e.jsxs("div",{className:"strip-key",children:[e.jsxs("span",{children:[e.jsx("span",{className:"dot keep"}),"You earn it"]}),e.jsxs("span",{children:[e.jsx("span",{className:"dot pass"}),"Opens a chain above you"]})]}),e.jsx("p",{className:"note",children:"Those three are the only sales you ever pass up. Each one opens a chain that pays you back — from any depth, with no end."})]})]})]}),e.jsxs("section",{className:"sec",children:[e.jsx("div",{className:"eyebrow",children:"Before you can earn"}),e.jsx("h2",{children:"Two gates. You need both."}),e.jsx("p",{className:"lede",style:{marginBottom:24},children:"Miss either on the day a sale lands and it routes past you. Neither gate is retroactive."}),e.jsxs("div",{className:"grid2",children:[e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"body",children:[e.jsx("div",{className:"gate-n",children:"1"}),e.jsx("h3",{children:"Own that level or higher"}),e.jsx("p",{children:"To earn on a $200 Advanced sale you must own a $200 pack or bigger. Own the $100 Pro and that one passes you by."})]}),e.jsx("span",{className:"pill",children:"Level-or-higher"})]}),e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"body",children:[e.jsx("div",{className:"gate-n",children:"2"}),e.jsx("h3",{children:"Stay watch-qualified"}),e.jsx("p",{children:"Complete your daily watch quota, set by the biggest pack you own — 1 a day at Launchpad, up to 5 at Champion. Also the gate on withdrawals."})]}),e.jsx("span",{className:"pill",children:"48-hour grace window"})]})]}),e.jsxs("div",{className:"card",style:{marginTop:16},children:[e.jsx("h3",{children:"Why the 48 hours exist"}),e.jsx("p",{children:"Once you hit quota you stay qualified for 48 hours, so a buyer in another time zone can’t skip you because today’s watch hasn’t landed yet."})]})]}),e.jsxs("section",{className:"sec",style:{paddingTop:0},children:[e.jsx("div",{className:"eyebrow",children:"The part that compounds"}),e.jsx("h2",{children:"Three chains. No bottom."}),e.jsxs("p",{className:"lede",children:["When one of your members passes up a sale, that buyer is wired to ",e.jsx("em",{children:"you"})," — permanently. Their own 3rd, 6th and 9th sales come to you. So do the sales of whoever they pass up. The chain never runs out of depth."]}),e.jsxs("div",{className:"chainbox",children:[e.jsx("div",{className:"you",children:"YOU"}),e.jsxs("div",{className:"rail",children:[h.map(([a,s])=>e.jsxs("div",{className:"lvl",children:[e.jsx("span",{className:"lvl-tag",children:a}),e.jsx("span",{className:"lvl-txt",children:s}),e.jsx("span",{className:"lvl-amt",children:"3 sales"})]},a)),e.jsxs("div",{className:"lvl inf",children:[e.jsx("span",{className:"lvl-tag",children:"No limit"}),e.jsx("span",{className:"lvl-txt",children:"There is no level at which this stops"}),e.jsx("span",{className:"lvl-amt",children:"Keeps going"})]})]})]})]}),e.jsxs("section",{className:"sec",style:{paddingTop:0},children:[e.jsx("div",{className:"eyebrow",children:"What you sell"}),e.jsx("h2",{children:"The price is the commission."}),e.jsx("p",{className:"lede",style:{marginBottom:24},children:"No split, no company share on a pack sale. The buyer pays the seller directly, in full."}),e.jsx("div",{className:"tbl-scroll",children:t?e.jsx("div",{className:"state err",children:t}):r===null?e.jsx("div",{className:"state",children:"Loading packs…"}):r.length===0?e.jsx("div",{className:"state",children:"No active packs to show."}):e.jsxs("table",{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Pack"}),e.jsx("th",{children:"You earn"}),e.jsx("th",{children:"Views delivered"}),e.jsx("th",{children:"Daily watches"})]})}),e.jsx("tbody",{children:r.map(a=>e.jsxs("tr",{children:[e.jsx("td",{className:"name",children:a.name}),e.jsx("td",{className:"price",children:m(a.price)}),e.jsx("td",{className:"num",children:Number(a.views_target||0).toLocaleString("en-US")}),e.jsx("td",{className:"num",children:a.daily_watch_required??"—"})]},a.level))})]})}),e.jsx("p",{className:"tbl-foot",children:"Your watch quota follows the largest pack you own. A campaign runs until its views are delivered, then has a grace window before it expires."}),e.jsxs("div",{className:"cta-wrap",children:[e.jsx("a",{className:"cta",href:"/packs",children:"Buy a pack →"}),e.jsx("span",{className:"cta-note",children:"Your level is the ceiling on what you can be paid."})]})]}),e.jsxs("section",{className:"sec",style:{paddingTop:0},children:[e.jsx("div",{className:"eyebrow",children:"Where the money actually goes"}),e.jsx("h2",{children:"Every sale resolves to one person."}),e.jsx("p",{className:"lede",style:{marginBottom:24},children:"Worked out before the buyer pays, so the pay page names the right member. The counter only moves on confirmation — nobody can shuffle their slots."}),e.jsxs("div",{className:"route",children:[e.jsxs("h3",{children:["A sale you keep ",e.jsx("span",{className:"tag",children:"Slots 1, 2, 4, 5, 7, 8, 10+"})]}),e.jsxs("div",{className:"flow",children:[e.jsx("span",{className:"node",children:"Buyer"}),e.jsx("span",{className:"arw",children:"→"}),e.jsx("span",{className:"node win",children:"You"})]}),e.jsxs("p",{children:["Fail either gate and it goes to the company. It does ",e.jsx("strong",{children:"not"})," climb — a kept sale is yours or nobody’s."]})]}),e.jsxs("div",{className:"route",children:[e.jsxs("h3",{children:["A sale you pass up ",e.jsx("span",{className:"tag red",children:"Slots 3, 6, 9"})]}),e.jsxs("div",{className:"flow",children:[e.jsx("span",{className:"node",children:"Buyer"}),e.jsx("span",{className:"arw",children:"→"}),e.jsx("span",{className:"node",children:"Your upline"}),e.jsx("span",{className:"arw",children:"→"}),e.jsx("span",{className:"node",children:"Next upline"}),e.jsx("span",{className:"arw",children:"→"}),e.jsx("span",{className:"node win",children:"First one qualified"})]}),e.jsx("p",{children:"It climbs until it finds someone who owns that level and is watch-qualified. Only if the whole chain fails does it reach the company."})]}),e.jsxs("div",{className:"route",children:[e.jsxs("h3",{children:["How a chain is created ",e.jsx("span",{className:"tag",children:"Set once, at join"})]}),e.jsxs("p",{children:["Land on someone’s 3rd, 6th or 9th slot and your pass-ups skip them and flow to ",e.jsx("em",{children:"their"})," upline instead — permanently. That single rule is what turns three slots into three chains that keep paying from any depth."]})]})]}),e.jsxs("section",{className:"sec",style:{paddingTop:0},children:[e.jsx("div",{className:"eyebrow",children:"A real sequence"}),e.jsx("h2",{children:"Your first ten sales"}),e.jsx("p",{className:"lede",style:{marginBottom:22},children:"You own the $200 Advanced pack and you watch daily. Every buyer here takes the $200 pack, so every sale is worth the same $200 — the only thing that changes is who it goes to."}),e.jsxs("div",{className:"lg",children:[e.jsxs("div",{className:"lg-row lg-head",children:[e.jsx("span",{children:"#"}),e.jsx("span",{children:"They buy"}),e.jsx("span",{children:"Goes to"}),e.jsx("span",{children:"You get"})]}),x.map(a=>e.jsxs("div",{className:"lg-row"+(a.chain?" dim":""),children:[e.jsx("span",{className:"lg-n",children:a.n}),e.jsx("span",{className:"lg-s",children:"$200 Advanced"}),a.chain?e.jsxs("span",{className:"lg-w w-chain",children:["Opens chain ",a.chain]}):e.jsx("span",{className:"lg-w w-you",children:"You"}),a.chain?e.jsx("span",{className:"lg-t lg-zero",children:"—"}):e.jsx("span",{className:"lg-t",children:"$200"})]},a.n))]}),e.jsxs("p",{className:"after",children:[e.jsx("strong",{children:"Seven sales paid you $200 each — $1,400."})," Three went up a chain instead, at the same $200. From sale 11 on, nothing is ever passed up again."]}),e.jsxs("p",{className:"after",children:[e.jsx("strong",{children:"Buyers pick their own pack."})," Someone taking the $1,000 Champion pays you $1,000 — but only if you own the $1,000 pack yourself. Own the $200 and that sale goes to the company without climbing. Your own pack level is the ceiling on what you can be paid."]})]})]})]})}export{b as default};
