import{o as w,ag as k,r as f,aq as v,U as j,ar as N,Z as H,T as V,E as C,as as z,j as e,ap as S,b1 as L}from"./vendor-Dlf1p8G5.js";import{u as P,A}from"./index-DsI2MfU2.js";import"./vendor-charts-sutgcRna.js";function M(){const{t:a}=w(),p=k(),{user:c}=P(),b=!!(c&&c.is_active),x=function(){try{return new URLSearchParams(window.location.search).get("launchpad")==="preview"}catch{return!1}}(),n=!b||x,[t,l]=f.useState(!1),[u,o]=f.useState("");async function g(){if(!t){o(""),l(!0);try{const s=await fetch("/api/stripe/checkout/launchpad",{method:"POST",credentials:"include"}),i=await s.json().catch(function(){return{}});if(s.ok&&i.checkout_url){window.location.href=i.checkout_url;return}l(!1),o(i.detail||i.error||"Could not start Launchpad checkout. Please try again.")}catch{l(!1),o("Connection error. Please try again.")}}}function r(s){return function(){p(s)}}const h=[{heading:a("businessHub.sectionTrack",{defaultValue:"Track & manage"}),cards:[{key:"performance",icon:v,grad:"linear-gradient(135deg,#1e3a8a,#0ea5e9)",title:a("businessHub.performance",{defaultValue:"Performance"}),desc:a("businessHub.performanceDesc",{defaultValue:"Your snapshot, directs, structures and month-on-month earnings."}),onClick:r("/command-centre")},{key:"team",icon:j,grad:"linear-gradient(135deg,#0891b2,#22d3ee)",title:a("businessHub.team",{defaultValue:"Team"}),desc:a("businessHub.teamDesc",{defaultValue:"Your downline, direct referrals and commission breakdown."}),onClick:r("/my-team")},{key:"fullanalytics",icon:N,grad:"linear-gradient(135deg,#1e3a8a,#0ea5e9)",title:a("businessHub.fullAnalytics",{defaultValue:"Full Analytics"}),desc:a("businessHub.fullAnalyticsDesc",{defaultValue:"Charts, breakdowns, link performance, withdrawals and team growth."}),onClick:r("/analytics")}]},{heading:a("businessHub.sectionEarn",{defaultValue:"Earn & optimise"}),cards:[{key:"mygrid",icon:H,grad:"linear-gradient(135deg,#1e3a8a,#22d3ee)",title:a("businessHub.myGrid",{defaultValue:"My Grid"}),desc:a("businessHub.myGridDesc",{defaultValue:"Your live Profit Grid — see your seats filling and per-seat earnings in real time."}),onClick:r("/grid-visualiser")},{key:"grid",icon:V,grad:"linear-gradient(135deg,#0a1438,#1e3a8a)",title:a("businessHub.profitGrid",{defaultValue:"Profit Grid"}),desc:a("businessHub.profitGridDesc",{defaultValue:"Activate and manage your Campaign Tiers and grid positions."}),onClick:r("/campaign-tiers")},{key:"credits",icon:C,grad:"linear-gradient(135deg,#0e7490,#06b6d4)",title:a("businessHub.creatorCredits",{defaultValue:"Creator Credits"}),desc:a("businessHub.creatorCreditsDesc",{defaultValue:"Your credit balance, packs and usage across the creator tools."}),onClick:r("/my-credits")},{key:"calc",icon:z,grad:"linear-gradient(135deg,#164e63,#22d3ee)",title:a("businessHub.gridCalculator",{defaultValue:"Grid Calculator"}),desc:a("businessHub.gridCalculatorDesc",{defaultValue:"Model your earnings across tiers and team-growth scenarios."}),onClick:r("/grid-calculator")}]}],m=["d","i","i","d","i","d","i","i","i","i","d","i","d","i","i","i"];return e.jsxs(A,{title:a("businessHub.title",{defaultValue:"My Business"}),subtitle:a("businessHub.subtitle",{defaultValue:"Track performance, manage your team and run the Profit Grid"}),children:[e.jsx("style",{children:T}),e.jsxs("div",{style:{maxWidth:1180,margin:"0 auto"},children:[e.jsxs("div",{className:"bh-hero",children:[e.jsx("div",{className:"bh-hero-ico",children:e.jsx(S,{size:88})}),e.jsx("h1",{children:a("businessHub.heroTitle",{defaultValue:"My Business"})}),e.jsx("p",{children:a("businessHub.heroSub",{defaultValue:"Everything on the earning side of SuperAdPro — your performance, team, Profit Grid, credits, analytics and calculator, all in one place."})})]}),n&&e.jsxs("div",{className:"lp",children:[e.jsxs("div",{className:"lp-in",children:[e.jsxs("div",{className:"lp-main",children:[e.jsxs("span",{className:"lp-badge",children:["◆ ",a("businessHub.lpBadge",{defaultValue:"START HERE · LAUNCHPAD"})]}),e.jsxs("h2",{children:[a("businessHub.lpTitle1",{defaultValue:"You haven't started earning yet."}),e.jsx("br",{}),e.jsx("span",{className:"g",children:a("businessHub.lpTitle2",{defaultValue:"Launchpad opens the door."})})]}),e.jsx("p",{className:"sub",children:a("businessHub.lpSub",{defaultValue:"Everything below is the earning side of SuperAdPro. Launchpad is your $10 way in — it places you on a live Profit Grid so you can start earning commissions today, then qualify to unlock the full platform."})}),e.jsxs("div",{className:"lp-steps",children:[e.jsxs("div",{className:"lp-step",children:[e.jsx("span",{className:"n",children:"1"}),e.jsx("div",{children:a("businessHub.lpStep1",{defaultValue:"Join Launchpad for $10 — you're placed on a 16-seat Profit Grid."})})]}),e.jsxs("div",{className:"lp-step",children:[e.jsx("span",{className:"n",children:"2"}),e.jsx("div",{children:a("businessHub.lpStep2",{defaultValue:"Earn real commissions as your seats fill with referrals."})})]}),e.jsxs("div",{className:"lp-step",children:[e.jsx("span",{className:"n",children:"3"}),e.jsx("div",{children:a("businessHub.lpStep3",{defaultValue:"Qualify for full membership and unlock every card below."})})]})]}),e.jsxs("div",{className:"lp-cta-row",children:[e.jsx("button",{className:"lp-cta",onClick:g,disabled:t,children:t?a("businessHub.lpStarting",{defaultValue:"Starting…"}):a("businessHub.lpCta",{defaultValue:"Get Launchpad — $10"})+" →"}),e.jsx("span",{className:"lp-pnote",children:a("businessHub.lpPayNote",{defaultValue:"One-time payment"})}),e.jsx("button",{className:"lp-second",onClick:r("/upgrade"),children:a("businessHub.lpSecond",{defaultValue:"or go straight to full membership →"})})]}),u&&e.jsx("div",{className:"lp-err",children:u})]}),e.jsxs("div",{className:"lp-viz",children:[e.jsx("div",{className:"lp-seats",children:m.map(function(s,i){return e.jsx("div",{className:"lp-seat "+s},i)})}),e.jsxs("div",{className:"lp-vcap",children:[a("businessHub.lpVizCap",{defaultValue:"YOUR 16-SEAT GRID"}),e.jsx("br",{}),a("businessHub.lpVizKey",{defaultValue:"cyan = direct · amber = team"})]})]})]}),e.jsxs("div",{className:"lp-locked",children:[e.jsxs("span",{className:"li",children:["🔒 ",a("businessHub.lpLock1",{defaultValue:"Watch-to-Earn"})]}),e.jsxs("span",{className:"li",children:["🔒 ",a("businessHub.lpLock2",{defaultValue:"AI creator tools"})]}),e.jsxs("span",{className:"li",children:["🔒 ",a("businessHub.lpLock3",{defaultValue:"Campaign Tiers 1–8"})]}),e.jsxs("span",{className:"li",children:["🔒 ",a("businessHub.lpLock4",{defaultValue:"Page & funnel builder"})]})]})]}),n&&e.jsxs("div",{className:"bp",role:"button",tabIndex:0,onClick:r("/upgrade"),onKeyDown:function(s){(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),p("/upgrade"))},children:[e.jsxs("div",{className:"bp-l",children:[e.jsxs("span",{className:"bp-badge",children:["★ ",a("businessHub.bpBadge",{defaultValue:"BECOME A PARTNER"})]}),e.jsx("h3",{children:a("businessHub.bpTitle",{defaultValue:"The full toolkit — $20/month."})}),e.jsx("p",{children:a("businessHub.bpDesc",{defaultValue:"Unlock the entire SuperAdPro platform — Creative Studio, the Brand Poster Generator, MyLeads CRM, the page & funnel builder, AI marketing tools and the affiliate platform. Run your business, and share in the upside as your team grows. Cancel anytime."})}),e.jsxs("div",{className:"bp-cta-row",children:[e.jsxs("span",{className:"bp-cta",children:[a("businessHub.bpCta",{defaultValue:"Become a Partner"})," →"]}),e.jsx("span",{className:"bp-note",children:a("businessHub.bpNote",{defaultValue:"$20/month · cancel anytime"})})]})]}),e.jsx("div",{className:"bp-r",children:e.jsx(L,{size:66})})]}),h.map(function(s){return e.jsxs("div",{children:[e.jsxs("div",{className:"bh-sect",children:[s.heading,n&&e.jsx("span",{className:"bh-lockpill",children:a("businessHub.lpUnlockPill",{defaultValue:"unlocks after Launchpad"})})]}),e.jsx("div",{className:"bh-row bh-row--"+Math.min(s.cards.length,4),children:s.cards.map(function(i){var y=i.icon;return e.jsxs("div",{className:"bh-card"+(n?" bh-card--locked":""),onClick:i.onClick,role:"button",tabIndex:0,onKeyDown:function(d){(d.key==="Enter"||d.key===" ")&&i.onClick&&(d.preventDefault(),i.onClick())},children:[n&&e.jsx("span",{className:"bh-lk",children:"🔒"}),e.jsx("div",{className:"bh-ico",style:{background:i.grad},children:e.jsx(y,{size:20,color:"#fff"})}),e.jsx("h3",{children:i.title}),e.jsx("p",{children:i.desc})]},i.key)})})]},s.heading)})]})]})}var T=`
  .bh-hero{background:linear-gradient(135deg,#0a1438,#1e3a8a);border-radius:14px;padding:22px 24px;margin-bottom:18px;position:relative;overflow:hidden}
  .bh-hero h1{font-family:'Sora',sans-serif;font-weight:800;font-size:24px;color:#fff;margin:0 0 5px;letter-spacing:-0.4px}
  .bh-hero p{font-size:14.5px;color:#9fb4d8;margin:0;font-weight:500;max-width:580px;line-height:1.5}
  .bh-hero-ico{position:absolute;right:-6px;top:-10px;color:rgba(56,189,248,0.10);transform:rotate(-12deg);pointer-events:none}

  /* Free-user Launchpad "start here" banner */
  .lp{position:relative;border-radius:16px;overflow:hidden;margin-bottom:24px;
      background:radial-gradient(140% 120% at 88% 6%,#13315e 0%,#0a1f44 42%,#06122e 100%);
      box-shadow:0 18px 44px -22px rgba(6,18,46,.85)}
  .lp::after{content:"";position:absolute;width:360px;height:360px;right:-110px;top:-140px;border-radius:50%;
      background:radial-gradient(circle,rgba(34,211,238,.16),transparent 68%);pointer-events:none}
  .lp-in{position:relative;display:grid;grid-template-columns:1fr auto;gap:30px;padding:26px 30px;align-items:center}
  .lp-badge{display:inline-flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;
      color:#7dd3fc;background:rgba(34,211,238,.10);border:1px solid rgba(34,211,238,.28);padding:5px 11px;border-radius:999px;letter-spacing:.06em;margin-bottom:13px}
  .lp h2{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(20px,2.6vw,26px);color:#fff;line-height:1.12;letter-spacing:-.02em;margin:0}
  .lp h2 .g{background:linear-gradient(90deg,#22d3ee,#fbbf24);-webkit-background-clip:text;background-clip:text;color:transparent}
  .lp .sub{font-size:14px;color:rgba(255,255,255,.74);line-height:1.55;margin:10px 0 18px;max-width:440px}
  .lp-steps{display:flex;flex-direction:column;gap:9px;margin-bottom:20px}
  .lp-step{display:flex;align-items:flex-start;gap:11px;font-size:13.5px;color:rgba(255,255,255,.9)}
  .lp-step .n{flex:none;width:21px;height:21px;border-radius:50%;display:grid;place-items:center;font-family:'JetBrains Mono',monospace;
      font-size:11px;font-weight:600;color:#04121f;background:linear-gradient(135deg,#22d3ee,#0ea5e9)}
  .lp-step b{color:#fff;font-weight:700}
  .lp-cta-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .lp-cta{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;color:#04121f;border:none;cursor:pointer;
      background:linear-gradient(135deg,#22d3ee,#0ea5e9);padding:13px 24px;border-radius:11px;
      box-shadow:0 10px 26px -8px rgba(34,211,238,.7);transition:transform .15s}
  .lp-cta:hover{transform:translateY(-2px)}
  .lp-cta:disabled{opacity:.6;cursor:default;transform:none}
  .lp-pnote{font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(255,255,255,.6)}
  .lp-second{font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(34,211,238,.92);background:none;border:none;cursor:pointer;font-weight:600;padding:0}
  .lp-second:hover{color:#fff}
  .lp-err{font-size:12.5px;color:#fda4af;margin-top:12px}
  .lp-viz{display:flex;flex-direction:column;align-items:center;gap:11px}
  .lp-seats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:138px}
  .lp-seat{aspect-ratio:1;border-radius:6px}
  .lp-seat.d{background:linear-gradient(135deg,#0ea5e9,#22d3ee);box-shadow:0 4px 12px -6px rgba(34,211,238,.8)}
  .lp-seat.i{background:linear-gradient(135deg,#f59e0b,#fbbf24);box-shadow:0 4px 12px -6px rgba(245,158,11,.6)}
  .lp-vcap{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,.55);letter-spacing:.04em;text-align:center;line-height:1.5}
  .lp-locked{position:relative;display:flex;gap:8px 16px;flex-wrap:wrap;padding:12px 30px;background:rgba(255,255,255,.05);border-top:1px solid rgba(255,255,255,.1)}
  .lp-locked .li{display:flex;align-items:center;gap:6px;font-size:12px;color:rgba(255,255,255,.68)}
  @media(max-width:680px){.lp-in{grid-template-columns:1fr;gap:20px}.lp-viz{order:-1;flex-direction:row}}

  /* Become a Partner card (free-user upgrade CTA → /upgrade) */
  .bp{position:relative;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;cursor:pointer;
      border-radius:16px;overflow:hidden;margin-bottom:24px;padding:24px 28px;
      background:radial-gradient(130% 130% at 90% 10%,#1e3a8a 0%,#0f2350 46%,#0a1740 100%);
      border:1px solid rgba(34,211,238,.22);box-shadow:0 16px 40px -20px rgba(6,18,46,.8);
      transition:transform .15s ease, box-shadow .15s ease}
  .bp:hover{transform:translateY(-3px);box-shadow:0 22px 50px -22px rgba(6,18,46,.9)}
  .bp:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(34,211,238,.4)}
  .bp-badge{display:inline-flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;
      color:#7dd3fc;background:rgba(34,211,238,.10);border:1px solid rgba(34,211,238,.30);padding:5px 11px;border-radius:999px;letter-spacing:.06em;margin-bottom:12px}
  .bp h3{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(19px,2.4vw,23px);color:#fff;margin:0 0 9px;letter-spacing:-.02em;line-height:1.15}
  .bp p{font-size:13.5px;color:rgba(255,255,255,.76);line-height:1.55;margin:0 0 17px;max-width:560px;font-weight:500}
  .bp-cta-row{display:flex;align-items:center;gap:15px;flex-wrap:wrap}
  .bp-cta{font-family:'Sora',sans-serif;font-weight:700;font-size:14.5px;color:#04121f;
      background:linear-gradient(135deg,#22d3ee,#0ea5e9);padding:11px 22px;border-radius:11px;
      box-shadow:0 10px 26px -8px rgba(34,211,238,.6)}
  .bp-note{font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(255,255,255,.6)}
  .bp-r{color:rgba(56,189,248,.16);flex:none}
  @media(max-width:680px){.bp{grid-template-columns:1fr;gap:14px}.bp-r{display:none}}

  .bh-sect{font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em;margin:20px 2px 12px;display:flex;align-items:center;gap:9px}
  .bh-lockpill{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;padding:2px 8px;border-radius:999px;text-transform:none;letter-spacing:0}
  .bh-row{display:grid;grid-template-columns:1fr;gap:13px;margin-bottom:6px;align-items:stretch}
  @media (min-width:561px){ .bh-row{grid-template-columns:repeat(2,minmax(0,1fr))} }
  @media (min-width:901px){
    .bh-row--3{grid-template-columns:repeat(3,minmax(0,1fr))}
    .bh-row--4{grid-template-columns:repeat(4,minmax(0,1fr))}
  }
  .bh-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 17px;display:flex;flex-direction:column;cursor:pointer;transition:transform .15s ease, box-shadow .15s ease;position:relative;text-align:left}
  .bh-card:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(10,20,56,0.12)}
  .bh-card:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(34,211,238,0.35)}
  .bh-card--locked{opacity:.6}
  .bh-card--locked:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(10,20,56,0.12);opacity:.78}
  .bh-lk{position:absolute;top:12px;right:13px;font-size:13px;opacity:.75}
  .bh-ico{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:11px;flex-shrink:0}
  .bh-card h3{font-family:'Sora',sans-serif;font-size:15px;font-weight:700;color:#0a1438;margin:0 0 4px}
  .bh-card p{font-size:12.5px;color:#64748b;margin:0;font-weight:500;line-height:1.45;flex:1}
`;export{M as default};
