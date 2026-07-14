const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/WalletConnect-CFtB1ipS.js","assets/vendor-rOWelCtb.js","assets/vendor-charts-sutgcRna.js","assets/index-B-w3AAsS.js","assets/index-CKskfRr8.css"])))=>i.map(i=>d[i]);
import{az as _,ag as A,r as s,j as e,L as w,N as P,ad as T}from"./vendor-rOWelCtb.js";import{u as D,a as M}from"./index-B-w3AAsS.js";import{u as W}from"./PurchaseConsentModal-i3BFONEt.js";import"./vendor-charts-sutgcRna.js";let f;function h(){return f||(f=T(()=>import("./WalletConnect-CFtB1ipS.js"),__vite__mapDeps([0,1,2,3,4]))),f}const R=s.lazy(function(){return h().then(function(i){return{default:i.WalletConnectProvider}})}),G=s.lazy(function(){return h().then(function(i){return{default:i.WalletConnectGate}})}),E=s.lazy(function(){return h().then(function(i){return{default:i.WalletPayLink}})}),F="linear-gradient(135deg,#78350f,#b45309,#fbbf24)",O="linear-gradient(135deg,#064e3b,#047857,#10b981)",B=[{position:1,username:"member_a",isDirect:!0},{position:2,username:"member_b",isDirect:!1},{position:3,username:"member_c",isDirect:!1}],x=`
.gact-page {
  background:
    radial-gradient(circle at 90% 0%, rgba(34,211,238,.10), transparent 60%),
    radial-gradient(circle at 0% 100%, rgba(14,165,233,.15), transparent 55%),
    linear-gradient(180deg, #0a1438 0%, #1e3a8a 100%);
  min-height: 100vh;
  padding: 24px 20px 60px;
  color: #fff;
}
.gact-shell { max-width: 720px; margin: 0 auto; }

.gact-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  color: #22d3ee;
  margin-bottom: 10px;
  text-align: center;
}
.gact-title {
  font-family: 'Sora', sans-serif;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -.5px;
  margin: 0 0 10px;
  text-align: center;
}
@media (max-width: 600px) {
  .gact-title { font-size: 24px; }
}
.gact-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: rgba(255,255,255,.7);
  margin: 0 0 22px;
  text-align: center;
  line-height: 1.5;
  max-width: 540px;
  margin-left: auto;
  margin-right: auto;
}

/* White card — the mini grid sits inside this so it visually mirrors
   the live visualiser (white card on dark page). Wider than the
   default page shell (680px) so each individual seat stays small —
   wide-but-shallow card keeps CTA visible above the fold. */
.gact-card {
  background: #fff;
  color: #0a1438;
  border-radius: 14px;
  overflow: hidden;
  margin: 0 auto 22px;
  max-width: 620px;
  box-shadow: 0 12px 36px -12px rgba(0,0,0,.40);
}
.gact-card-header {
  background: linear-gradient(135deg, #172554, #1e3a8a);
  padding: 14px 18px;
  display: flex; align-items: center; justify-content: space-between;
}
.gact-card-header-title {
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}
.gact-card-header-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: rgba(255,255,255,.65);
  font-weight: 600;
}

.gact-card-body { padding: 14px 18px 16px; }

.gact-progress {
  height: 6px;
  background: #f1f5f9;
  border-radius: 4px;
  margin-bottom: 12px;
  overflow: hidden;
}
.gact-progress-fill {
  height: 100%;
  width: 12.5%;
  border-radius: 4px;
  background: linear-gradient(90deg, #064e3b, #10b981);
}

.gact-legend {
  display: flex; gap: 14px; flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 12px;
}
.gact-legend-item {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}
.gact-legend-swatch {
  width: 12px; height: 12px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 7px; font-weight: 800;
}
.gact-legend-swatch.direct { background: linear-gradient(135deg,#78350f,#b45309,#fbbf24); color: #78350f; }
.gact-legend-swatch.spill  { background: linear-gradient(135deg,#064e3b,#047857,#10b981); color: #fff; }
.gact-legend-swatch.empty  { background: #f8fafc; border: 1px dashed #94a3b8; color: #94a3b8; }

/* Mini-grid: 6 columns × 4 rows = 24 cells. Wider layout (the grid
   itself stretches horizontally across the card) with individually
   smaller nodes — Steve's feedback after the 4×4 version pushed the
   CTA below the fold. With aspect-ratio:1 each seat is ~85px in the
   620px card, so the full grid stands ~360px tall — comparable to
   the previous 4×4 but with far more visual presence. */
.gact-mini-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
}
.gact-seat {
  border-radius: 7px;
  aspect-ratio: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  font-size: 10px;
  position: relative;
  overflow: hidden;
}
.gact-seat.empty {
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
  color: #cbd5e1;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
}
.gact-seat.filled {
  border: 1.5px solid;
  color: #fff;
}
.gact-seat-badge {
  position: absolute;
  top: -3px; right: -3px;
  width: 11px; height: 11px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 6px; font-weight: 800;
  border: 1.5px solid #fff;
}
.gact-seat-badge.direct { background: #fbbf24; color: #78350f; }
.gact-seat-badge.spill  { background: #10b981; color: #fff; }
.gact-seat-avatar {
  width: 16px; height: 16px;
  border-radius: 50%;
  background: rgba(255,255,255,.22);
  border: 1px solid rgba(255,255,255,.35);
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 800;
  margin-bottom: 2px;
}
.gact-seat-name {
  font-size: 8px;
  font-weight: 700;
  max-width: 86%;
  overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap;
}

/* CTA section */
.gact-cta-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 14px;
  padding: 20px 22px;
}
.gact-cta-title {
  font-family: 'Sora', sans-serif;
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 4px;
}
.gact-cta-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: rgba(255,255,255,.65);
  margin: 0 0 16px;
}
.gact-warning {
  background: rgba(220,38,38,.10);
  border: 1px solid rgba(220,38,38,.3);
  color: #fca5a5;
  border-radius: 10px;
  padding: 10px 14px;
  margin-top: 14px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  text-align: center;
  line-height: 1.5;
}

/* Success state */
.gact-success {
  background: linear-gradient(135deg, rgba(16,185,129,.15), rgba(6,78,59,.15));
  border: 1px solid rgba(16,185,129,.3);
  border-radius: 18px;
  padding: 36px 28px;
  text-align: center;
}
.gact-success-headline {
  font-family: 'Sora', sans-serif;
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px;
}
.gact-success-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  color: rgba(255,255,255,.75);
  margin: 0 0 24px;
}
.gact-success-card {
  background: rgba(255,255,255,.06);
  border-radius: 12px;
  padding: 18px;
  margin: 0 auto 24px;
  max-width: 360px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  text-align: left;
}
.gact-success-card .kv-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255,255,255,.55);
  margin-bottom: 4px;
}
.gact-success-card .kv-value {
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #22d3ee;
}
.gact-next-cta {
  display: inline-block;
  padding: 14px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  color: #0a1438;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 800;
  text-decoration: none;
  transition: transform .15s ease;
}
.gact-next-cta:hover { transform: translateY(-1px); }
`;function Y(){const{user:i}=D(),[u]=_();A();const[m,d]=s.useState(null),[g,b]=s.useState(null),[t,c]=s.useState(!1),[y,l]=s.useState(""),[v,S]=s.useState(!1),{ensureConsent:j,consentModal:k}=W();s.useEffect(function(){fetch("/api/stripe/status",{credentials:"include"}).then(function(a){return a.json()}).then(function(a){a&&a.configured===!0&&S(!0)}).catch(function(){})},[]);async function N(){if(!(t||!await j())){c(!0),l("");try{const r=await(await fetch("/api/stripe/checkout/campaign-tier",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({tier_id:1})})).json();r.checkout_url?window.location.href=r.checkout_url:(l(r.detail||r.error||"Card checkout unavailable. Please try crypto."),c(!1))}catch{l("Connection error. Please try again."),c(!1)}}}async function z(){if(!(t||!await j())){c(!0),l("");try{const r=await(await fetch("/api/nowpayments/create-invoice",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({product_key:"grid_1"})})).json();r.invoice_url?window.location.href=r.invoice_url:(l(r.error||"Payment service unavailable. Please try again."),c(!1))}catch{l("Connection error. Please try again."),c(!1)}}}if(s.useEffect(function(){let a=!0;return M("/api/fast-start/state").then(function(n){a&&(u.get("activated")==="1"||n.has_grid_position?(d("success"),b(n)):(d("pending"),b(n)))}).catch(function(){a&&d("pending")}),function(){a=!1}},[u]),!m)return e.jsxs("div",{className:"gact-page",children:[e.jsx("style",{children:x}),e.jsx("div",{className:"gact-shell",children:e.jsx("div",{style:{height:200}})})]});if(m==="success"){const a=(g==null?void 0:g.next_position)||"SAP-"+String((i==null?void 0:i.id)||0).padStart(5,"0");return e.jsxs("div",{className:"gact-page",children:[e.jsx("style",{children:x}),e.jsx("div",{className:"gact-shell",children:e.jsxs("div",{className:"gact-success",children:[e.jsx("div",{style:{fontSize:56,marginBottom:12},children:"⚡"}),e.jsx("h1",{className:"gact-success-headline",children:"You're in."}),e.jsx("p",{className:"gact-success-sub",children:"Your Grid is live. Your position is locked in below."}),e.jsxs("div",{className:"gact-success-card",children:[e.jsxs("div",{children:[e.jsx("div",{className:"kv-label",children:"Position"}),e.jsx("div",{className:"kv-value",children:a})]}),e.jsxs("div",{children:[e.jsx("div",{className:"kv-label",children:"Tier"}),e.jsx("div",{className:"kv-value",children:"T1 Starter"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"kv-label",children:"Sponsor"}),e.jsxs("div",{className:"kv-value",children:["@",(i==null?void 0:i.sponsor_username)||"company"]})]}),e.jsxs("div",{children:[e.jsx("div",{className:"kv-label",children:"Status"}),e.jsx("div",{className:"kv-value",style:{color:"#10b981"},children:"Active"})]})]}),e.jsx(w,{to:"/my-campaigns/new",className:"gact-next-cta",children:"Create your first campaign →"})]})})]})}return e.jsx(s.Suspense,{fallback:e.jsx("div",{className:"gact-page"}),children:e.jsx(R,{children:e.jsxs("div",{className:"gact-page",children:[e.jsx("style",{children:x}),e.jsxs("div",{className:"gact-shell",children:[e.jsx("div",{className:"gact-eyebrow",children:"★ Grid activation"}),e.jsx("h1",{className:"gact-title",children:"Activate your Grid for $20."}),e.jsx("p",{className:"gact-sub",children:"One $20 activation kicks off the Video Campaign system and your affiliate income stream. This is your first position in the Grid — and your sponsor pool starts here."}),e.jsxs("div",{className:"gact-card",children:[e.jsxs("div",{className:"gact-card-header",children:[e.jsx("div",{className:"gact-card-header-title",children:"T1 Starter — $20"}),e.jsx("div",{className:"gact-card-header-meta",children:"3 of 24 (illustrative)"})]}),e.jsxs("div",{className:"gact-card-body",children:[e.jsx("div",{className:"gact-progress",children:e.jsx("div",{className:"gact-progress-fill"})}),e.jsxs("div",{className:"gact-legend",children:[e.jsxs("div",{className:"gact-legend-item",children:[e.jsx("span",{className:"gact-legend-swatch direct",children:"★"})," Direct"]}),e.jsxs("div",{className:"gact-legend-item",children:[e.jsx("span",{className:"gact-legend-swatch spill",children:"↓"})," Auto-place"]}),e.jsxs("div",{className:"gact-legend-item",children:[e.jsx("span",{className:"gact-legend-swatch empty",children:"?"})," Empty"]})]}),e.jsx("div",{className:"gact-mini-grid",children:Array.from({length:24},function(a,n){const r=n+1,o=B.find(function(p){return p.position===r});if(o){const p=o.isDirect?F:O,C=o.isDirect?"#fbbf24":"#10b981";return e.jsxs("div",{className:"gact-seat filled",style:{background:p,borderColor:C},children:[e.jsx("div",{className:"gact-seat-badge "+(o.isDirect?"direct":"spill"),children:o.isDirect?"★":"↓"}),e.jsx("div",{className:"gact-seat-avatar",children:o.username.charAt(0).toUpperCase()}),e.jsx("div",{className:"gact-seat-name",children:o.username})]},n)}return e.jsx("div",{className:"gact-seat empty",children:r},n)})}),e.jsx("p",{style:{margin:"20px 0 0",fontSize:12,color:"#64748b",textAlign:"center",lineHeight:1.55,fontFamily:"'DM Sans', sans-serif"},children:"Sample layout — your actual grid fills as members join under you and via auto-placement from the platform's spillover."})]})]}),e.jsxs("div",{className:"gact-cta-section",children:[e.jsx("h2",{className:"gact-cta-title",children:"Activate for $20 →"}),e.jsx("p",{className:"gact-cta-sub",children:"Pay once. Your grid goes live the moment your transaction confirms."}),v&&e.jsx("button",{onClick:N,disabled:t,style:{display:"flex",alignItems:"center",justifyContent:"center",gap:12,width:"100%",padding:"18px 18px",borderRadius:12,fontSize:16,fontWeight:800,border:"none",cursor:t?"wait":"pointer",fontFamily:"Sora, sans-serif",background:t?"linear-gradient(135deg,#7dd3fc,#38bdf8,#0ea5e9)":"linear-gradient(135deg,#38bdf8,#0ea5e9,#0284c7)",color:"#fff",boxShadow:t?"0 4px 0 #075985,0 6px 20px rgba(14,165,233,.2)":"0 4px 0 #075985,0 6px 24px rgba(14,165,233,.4)",letterSpacing:.3,transition:"all 0.2s",opacity:t?.85:1},children:t?e.jsxs(e.Fragment,{children:[e.jsx("span",{style:{display:"inline-block",width:16,height:16,border:"2.5px solid rgba(255,255,255,.5)",borderTopColor:"#fff",borderRadius:"50%",animation:"gact-spin 0.8s linear infinite"}}),e.jsx("span",{children:"Redirecting to secure checkout…"})]}):e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsx("span",{style:{fontSize:20},children:"💳"}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-start",lineHeight:1.2},children:[e.jsx("span",{children:"Pay $20"}),e.jsx("span",{style:{fontSize:11,fontWeight:600,opacity:.85,letterSpacing:.5,textTransform:"uppercase",marginTop:2},children:"with debit or credit card"})]})]})}),v&&e.jsxs("div",{style:{position:"relative",margin:"14px 0",textAlign:"center"},children:[e.jsx("div",{style:{height:1,background:"rgba(255,255,255,.12)",position:"absolute",left:0,right:0,top:"50%"}}),e.jsx("span",{style:{position:"relative",background:"rgba(255,255,255,.04)",padding:"0 12px",fontSize:10,color:"rgba(255,255,255,.55)",textTransform:"uppercase",letterSpacing:1,fontWeight:600,fontFamily:"'JetBrains Mono', monospace"},children:"or pay with crypto"})]}),e.jsxs(s.Suspense,{fallback:e.jsx("div",{style:{height:56}}),children:[e.jsx(G,{hideWhenConnected:!0,label:"Connect Wallet — $20",style:{width:"100%",padding:"14px 18px",borderRadius:12,border:"none",fontSize:15,fontWeight:800,color:"#fff",background:"linear-gradient(135deg,#ea580c,#f97316)",boxShadow:"0 4px 14px rgba(249,115,22,.35)",fontFamily:"Sora, sans-serif"}}),e.jsx(E,{productType:"grid",productKey:"grid_1",label:"Activate $20 from wallet",style:{padding:"14px 18px",fontSize:15,borderRadius:12,width:"100%"}})]}),e.jsxs("div",{style:{position:"relative",margin:"14px 0",textAlign:"center"},children:[e.jsx("div",{style:{height:1,background:"rgba(255,255,255,.12)",position:"absolute",left:0,right:0,top:"50%"}}),e.jsx("span",{style:{position:"relative",background:"rgba(255,255,255,.04)",padding:"0 12px",fontSize:10,color:"rgba(255,255,255,.55)",textTransform:"uppercase",letterSpacing:1,fontWeight:600,fontFamily:"'JetBrains Mono', monospace"},children:"or"})]}),e.jsx("button",{onClick:z,disabled:t,style:{display:"flex",alignItems:"center",justifyContent:"center",gap:12,width:"100%",padding:"16px 18px",borderRadius:12,fontSize:15,fontWeight:700,border:"none",cursor:t?"wait":"pointer",fontFamily:"'Sora', sans-serif",background:t?"rgba(255,255,255,.10)":"rgba(255,255,255,.08)",color:"#fff",transition:"all 0.2s",opacity:t?.85:1},onMouseOver:function(a){t||(a.currentTarget.style.background="rgba(255,255,255,.14)")},onMouseOut:function(a){t||(a.currentTarget.style.background="rgba(255,255,255,.08)")},children:t?e.jsxs(e.Fragment,{children:[e.jsx("span",{style:{display:"inline-block",width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"gact-spin 0.8s linear infinite"}}),e.jsx("span",{children:"Creating secure invoice…"})]}):e.jsxs(e.Fragment,{children:[e.jsx(P,{size:18}),e.jsx("span",{children:"Pay $20 via NOWPayments"})]})}),e.jsx("style",{children:"@keyframes gact-spin{to{transform:rotate(360deg)}}"}),e.jsx("p",{style:{textAlign:"center",fontSize:12,color:"rgba(255,255,255,.55)",fontFamily:"'DM Sans', sans-serif",margin:"14px 0 0",lineHeight:1.55},children:"🔒 Secure checkout · 350+ cryptos accepted · ⚡ Instant activation"}),y&&e.jsx("div",{style:{marginTop:12,padding:"10px 14px",borderRadius:10,background:"rgba(220,38,38,.15)",border:"1px solid rgba(220,38,38,.4)",color:"#fca5a5",fontFamily:"'DM Sans', sans-serif",fontSize:13,textAlign:"center"},children:y}),e.jsxs("div",{className:"gact-warning",children:[e.jsx("strong",{children:"All sales final."})," Campaign tier purchases trigger instant commission payouts and cannot be reversed."]})]}),k,e.jsx("div",{style:{textAlign:"center",marginTop:24},children:e.jsx(w,{to:"/dashboard",style:{color:"rgba(255,255,255,.55)",fontFamily:"'DM Sans', sans-serif",fontSize:13,textDecoration:"none"},children:"← Back to dashboard"})})]})]})})})}export{Y as default};
