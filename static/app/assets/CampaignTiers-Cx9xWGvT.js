import{o as w,r as s,j as e,aS as u,L as y}from"./vendor-CsiGalqd.js";import{a as j,A as x}from"./index-DvBLBZq0.js";import"./vendor-charts-sutgcRna.js";const n=r=>"$"+Number(r||0).toLocaleString("en-US",{minimumFractionDigits:Number(r)%1?2:0,maximumFractionDigits:2}),N=r=>Number(r||0).toLocaleString("en-US"),_=new Set([0,2,7,9,12]),k=`
.ctcfg{max-width:1000px;margin:0 auto;font-family:'DM Sans',sans-serif}
.ct-toast{display:flex;align-items:center;gap:8px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-weight:600;font-size:14px;padding:12px 16px;border-radius:12px;margin-bottom:18px}
.ct-head{margin-bottom:20px}
.ct-eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#0ea5e9;font-weight:600}
.ct-head h1{font-family:'Sora',sans-serif;font-size:clamp(26px,4.5vw,34px);font-weight:800;color:var(--sap-text-primary);margin:8px 0;letter-spacing:-.02em}
.ct-head p{font-size:15px;color:var(--sap-text-secondary);max-width:560px;line-height:1.55}
.ct-pills{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 12px}
.ct-pill{font-family:'Sora',sans-serif;font-weight:600;font-size:13px;color:#1e3a8a;padding:9px 15px;border-radius:999px;border:1px solid rgba(12,26,56,.1);background:#fff;cursor:pointer;transition:.18s;box-shadow:0 2px 10px -4px rgba(12,26,56,.14);display:inline-flex;align-items:center;gap:6px}
.ct-pill:hover{border-color:rgba(14,165,233,.5);transform:translateY(-1px)}
.ct-pill.on{color:#fff;background:linear-gradient(90deg,#1e3a8a,#0ea5e9);border-color:transparent;box-shadow:0 10px 22px -10px rgba(14,165,233,.7)}
.ct-owned{font-size:11px;opacity:.9}
.ct-ladder{display:flex;gap:5px;margin:6px 0 24px}
.ct-ladder i{height:5px;flex:1;border-radius:3px;background:rgba(12,26,56,.1);transition:.25s}
.ct-ladder i.fill{background:linear-gradient(90deg,#1e3a8a,#22d3ee)}
.ct-card{background:#fff;border:1px solid rgba(12,26,56,.09);border-radius:24px;box-shadow:0 18px 44px -22px rgba(12,26,56,.3);padding:32px;position:relative;overflow:hidden}
.ct-card::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,#1e3a8a,#0ea5e9,#22d3ee)}
.ct-top{display:flex;justify-content:space-between;align-items:flex-start;gap:22px;flex-wrap:wrap}
.ct-name{font-family:'Sora',sans-serif;font-weight:700;font-size:22px;color:var(--sap-text-primary)}
.ct-price{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(38px,6.5vw,50px);color:var(--sap-text-primary);line-height:1;margin-top:8px}
.ct-priceunit{font-size:12.5px;color:var(--sap-text-muted);font-weight:600;margin-top:6px}
.ct-viewbox{text-align:right;min-width:180px}
.ct-views{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(40px,8vw,60px);line-height:1;background:linear-gradient(92deg,#0ea5e9,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
.ct-viewlbl{font-size:13px;color:var(--sap-text-muted);margin-top:4px;font-weight:600}
.ct-body{display:grid;grid-template-columns:auto 1fr;gap:36px;margin-top:30px;align-items:center}
.ct-gridwrap{text-align:center}
.ct-seats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:184px}
.ct-seat{aspect-ratio:1;border-radius:8px;animation:ctpop .4s backwards}
.ct-seat.direct{background:linear-gradient(135deg,#0ea5e9,#22d3ee);box-shadow:0 6px 16px -6px rgba(34,211,238,.85)}
.ct-seat.indirect{background:linear-gradient(135deg,#f59e0b,#fbbf24);box-shadow:0 6px 16px -6px rgba(245,158,11,.55)}
@keyframes ctpop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.ct-gridlbl{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--sap-text-muted);margin-top:12px;letter-spacing:.05em}
.ct-legend{display:flex;gap:8px 18px;justify-content:center;flex-wrap:wrap;margin-top:13px}
.ct-leg{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--sap-text-secondary)}
.ct-leg .sw{width:13px;height:13px;border-radius:4px;flex:none}
.ct-leg .sw.d{background:linear-gradient(135deg,#0ea5e9,#22d3ee)}
.ct-leg .sw.i{background:linear-gradient(135deg,#f59e0b,#fbbf24)}
.ct-comp{display:flex;flex-direction:column}
.ct-crow{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:15px 0;border-bottom:1px solid rgba(12,26,56,.06)}
.ct-crow:last-child{border-bottom:none}
.ct-clbl{font-size:14px;color:var(--sap-text-primary);font-weight:600}
.ct-clbl small{display:block;color:var(--sap-text-muted);font-size:11.5px;font-weight:500;margin-top:3px}
.ct-camt{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:20px;color:var(--sap-text-primary);white-space:nowrap}
.ct-camt.cyan{color:#0ea5e9}
.ct-camt.amber{color:#d97706}
.ct-prog{margin-top:24px;padding-top:20px;border-top:1px solid rgba(12,26,56,.08)}
.ct-prog-top{display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--sap-text-secondary);margin-bottom:7px}
.ct-prog-bar{height:8px;background:rgba(12,26,56,.07);border-radius:5px;overflow:hidden}
.ct-prog-bar>div{height:100%;background:linear-gradient(90deg,#0ea5e9,#22d3ee);border-radius:5px;transition:width .5s}
.ct-actions{display:flex;align-items:center;gap:16px;margin-top:28px;flex-wrap:wrap}
.ct-btn{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;color:#fff;text-decoration:none;background:linear-gradient(92deg,#1e3a8a,#0ea5e9);padding:14px 26px;border-radius:12px;box-shadow:0 22px 50px -26px rgba(14,165,233,.55);transition:.18s;display:inline-block}
.ct-btn:hover{transform:translateY(-2px)}
.ct-active{display:inline-flex;align-items:center;gap:7px;font-family:'Sora',sans-serif;font-weight:700;font-size:14px;color:#fff;background:linear-gradient(92deg,#059669,#10b981);border:1px solid transparent;padding:13px 22px;border-radius:12px;box-shadow:0 12px 26px -10px rgba(16,185,129,.6)}
.ct-share{font-family:'JetBrains Mono',monospace;font-size:12px;color:#1e3a8a}
.ct-share b{color:var(--sap-text-primary)}
.ct-disc{font-size:12px;color:var(--sap-text-muted);line-height:1.55;margin-top:22px;max-width:780px}
@media(max-width:620px){
  .ct-body{grid-template-columns:1fr;gap:26px}
  .ct-gridwrap{order:2}
  .ct-seats{margin:0 auto}
  .ct-viewbox{text-align:left;min-width:0}
  .ct-top{flex-direction:column;gap:14px}
}
`;function C(){const{t:r}=w(),[c,b]=s.useState([]),[v,m]=s.useState(!0),[l,p]=s.useState(3),[g,f]=s.useState(null);if(s.useEffect(function(){const a=(new URLSearchParams(window.location.search).get("activated")||"").match(/^tier_(\d+)$/);if(a){f(parseInt(a[1]));try{window.history.replaceState({},"",window.location.pathname)}catch{}setTimeout(function(){f(null)},8e3)}},[]),s.useEffect(function(){j("/api/campaign-tiers").then(function(a){const i=(a.tiers||[]).filter(function(d){return d.tier!==0});b(i);const h=i.find(function(d){return!d.is_active});h?p(h.tier):i.length&&p(i[0].tier),m(!1)}).catch(function(){m(!1)})},[]),v)return e.jsx(x,{categoryBack:{to:"/campaigns",label:"Campaign Tiers"},title:r("campaignTiers.title"),children:e.jsxs("div",{style:{display:"flex",justifyContent:"center",padding:80},children:[e.jsx("div",{style:{width:40,height:40,border:"3px solid #e5e7eb",borderTopColor:"var(--sap-accent)",borderRadius:"50%",animation:"spin .8s linear infinite"}}),e.jsx("style",{children:"@keyframes spin{to{transform:rotate(360deg)}}"})]})});const t=c.find(function(a){return a.tier===l})||c[0];if(!t)return e.jsx(x,{categoryBack:{to:"/campaigns",label:"Campaign Tiers"},title:r("campaignTiers.title"),children:e.jsx("div",{style:{padding:40,textAlign:"center",color:"var(--sap-text-muted)"},children:"No campaign tiers available right now."})});const o=t.grid;return e.jsxs(x,{categoryBack:{to:"/campaigns",label:"Campaign Tiers"},title:r("campaignTiers.title"),children:[e.jsx("style",{children:k}),e.jsxs("div",{className:"ctcfg",children:[g!==null&&e.jsxs("div",{className:"ct-toast",children:[e.jsx(u,{size:16})," Tier ",g," activated — your campaign is live."]}),e.jsxs("div",{className:"ct-head",children:[e.jsx("span",{className:"ct-eyebrow",children:"My Business · Campaign Tiers"}),e.jsx("h1",{children:"Choose your campaign."}),e.jsx("p",{children:"Each tier runs an AI advertising campaign that delivers guaranteed views to your offer. The Profit Grid is built in if you want to earn — but the views are yours either way."})]}),e.jsx("div",{className:"ct-pills",children:c.map(function(a){return e.jsxs("button",{className:"ct-pill"+(a.tier===l?" on":""),onClick:function(){p(a.tier)},children:[a.name,a.is_active&&e.jsx("span",{className:"ct-owned",children:"✓"})]},a.tier)})}),e.jsx("div",{className:"ct-ladder",children:c.map(function(a){return e.jsx("i",{className:a.tier<=l?"fill":""},a.tier)})}),e.jsxs("div",{className:"ct-card",children:[e.jsxs("div",{className:"ct-top",children:[e.jsxs("div",{children:[e.jsx("div",{className:"ct-name",children:t.name}),e.jsx("div",{className:"ct-price",children:n(t.price)}),e.jsx("div",{className:"ct-priceunit",children:"one-time · what you pay"})]}),e.jsxs("div",{className:"ct-viewbox",children:[e.jsx("div",{className:"ct-views",children:N(t.views_target)}),e.jsx("div",{className:"ct-viewlbl",children:"ad views · what you get"})]})]}),e.jsxs("div",{className:"ct-body",children:[e.jsxs("div",{className:"ct-gridwrap",children:[e.jsx("div",{className:"ct-seats",children:Array.from({length:16}).map(function(a,i){return e.jsx("div",{className:"ct-seat "+(_.has(i)?"direct":"indirect"),style:{animationDelay:i*18+"ms"}},i)})}),e.jsx("div",{className:"ct-gridlbl",children:"16-seat Profit Grid · example fill"}),e.jsxs("div",{className:"ct-legend",children:[e.jsxs("div",{className:"ct-leg",children:[e.jsx("span",{className:"sw d"})," Direct — you earn ",t.direct_pct,"%"]}),e.jsxs("div",{className:"ct-leg",children:[e.jsx("span",{className:"sw i"})," Uni-level — ",t.per_level_pct,"% × ",t.uni_level_depth," levels"]})]})]}),e.jsxs("div",{className:"ct-comp",children:[e.jsxs("div",{className:"ct-crow",children:[e.jsxs("div",{className:"ct-clbl",children:["Direct commission",e.jsxs("small",{children:[t.direct_pct,"% · per member you personally refer"]})]}),e.jsx("div",{className:"ct-camt cyan",children:n(t.direct_commission)})]}),e.jsxs("div",{className:"ct-crow",children:[e.jsxs("div",{className:"ct-clbl",children:["Uni-level commission",e.jsxs("small",{children:[t.per_level_pct,"% each · ",t.uni_level_depth," levels deep (",n(t.uni_level_per_member),"/level)"]})]}),e.jsx("div",{className:"ct-camt amber",children:n(t.uni_level_total!=null?t.uni_level_total:t.uni_level_per_member)})]}),e.jsxs("div",{className:"ct-crow",children:[e.jsxs("div",{className:"ct-clbl",children:["Bonus pool",e.jsxs("small",{children:[t.bonus_pool_pct,"% · paid as your 16 seats fill (4 / 8 / 12 / 16)"]})]}),e.jsx("div",{className:"ct-camt cyan",children:n(t.completion_bonus)})]})]})]}),t.is_active&&o&&e.jsxs("div",{className:"ct-prog",children:[e.jsxs("div",{className:"ct-prog-top",children:[e.jsx("span",{children:"Your grid"}),e.jsxs("span",{children:[o.filled," filled · Grid #",o.advance]})]}),e.jsx("div",{className:"ct-prog-bar",children:e.jsx("div",{style:{width:(o.pct||0)+"%"}})})]}),e.jsxs("div",{className:"ct-actions",children:[t.is_active?e.jsxs("div",{className:"ct-active",children:[e.jsx(u,{size:15})," ",t.name," is active"]}):e.jsxs(y,{to:"/activate/"+t.tier,className:"ct-btn",children:["Run this campaign — ",n(t.price)," →"]}),e.jsxs("span",{className:"ct-share",children:["⚡ ",e.jsx("b",{children:"100%"})," of campaign revenue shared across the grid"]})]})]}),e.jsxs("p",{className:"ct-disc",children:["Commission figures are the maximums defined by the Profit Grid and depend entirely on your own referral activity — they are not income guarantees, and many members simply use the advertising without referring anyone. Direct = ",t.direct_pct,"% of tier price · uni-level = ",t.per_level_pct,"% per level across ",t.uni_level_depth," levels · bonus pool = the ",t.bonus_pool_pct,"% grid pool. Company retains 0% of campaign revenue. All tiers are one-time payments — no subscriptions."]})]})]})}export{C as default};
