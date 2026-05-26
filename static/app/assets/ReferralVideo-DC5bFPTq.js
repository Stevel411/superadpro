import{az as B,r as n,j as e}from"./vendor-DWD-Km08.js";import"./vendor-charts-sutgcRna.js";const $="https://pub-c65d78296e574524bdcda856c402c7a1.r2.dev/funnel-videos/SuperAdPro%20Overview1.mp4",T="https://pub-c65d78296e574524bdcda856c402c7a1.r2.dev/marketing-bg/growth-hero-bg.jpg";function I(){const{username:a}=B();n.useEffect(()=>{a&&fetch(`/ref/${encodeURIComponent(a)}`,{method:"GET",credentials:"include",redirect:"manual"}).catch(()=>{})},[a]);const o=a?`/ref/${encodeURIComponent(a)}`:"/register",s=a?`@${a}`:"a SuperAdPro member";return e.jsxs(e.Fragment,{children:[e.jsx("style",{children:W}),e.jsx("header",{className:"rv-header",children:e.jsxs("div",{className:"rv-header-inner",children:[e.jsxs("div",{className:"rv-brand",children:["Super",e.jsx("span",{className:"rv-brand-accent",children:"AdPro"})]}),e.jsx("a",{href:o,className:"rv-header-cta",children:"Join — $20/mo →"})]})}),e.jsxs("main",{className:"rv-main",children:[e.jsxs("section",{className:"rv-hero",children:[e.jsxs("div",{className:"rv-pill",children:[e.jsx("span",{className:"rv-pill-dot"}),e.jsxs("span",{children:["Invited by ",s]})]}),e.jsxs("h1",{className:"rv-h1",children:["The AI marketing toolkit",e.jsx("br",{}),"built for ",e.jsx("span",{className:"rv-highlight",children:"affiliate marketers."})]}),e.jsx("p",{className:"rv-subhead",children:"Watch the 22-minute overview. The complete toolkit to capture leads, build pages, and grow your audience — plus an optional comp plan that pays you to share what you already love using."}),e.jsxs("div",{className:"rv-hero-meta",children:[e.jsx("span",{className:"rv-meta-item",children:"$20/month"}),e.jsx("span",{className:"rv-meta-item",children:"Cancel anytime"}),e.jsx("span",{className:"rv-meta-item",children:"No upsells"})]})]}),e.jsx(A,{src:$}),e.jsx(R,{}),e.jsxs("section",{className:"rv-section",children:[e.jsx("div",{className:"rv-eyebrow",children:"◆ The toolkit"}),e.jsxs("h2",{className:"rv-section-heading",children:["Built for affiliate marketers.",e.jsx("br",{}),"Every tool you actually use."]}),e.jsx("p",{className:"rv-section-subhead",children:"Capture leads, build pages, run email campaigns, and brand yourself — under one roof, one login, one price."}),e.jsxs("div",{className:"rv-value-grid",children:[e.jsx(c,{emoji:"🪄",tint:"blue",title:"AI Page Builder",body:"Generate landing pages, opt-ins, sales pages and full funnels with AI. Drag-edit anything. Publish in minutes."}),e.jsx(c,{emoji:"🎨",tint:"pink",title:"Creative Studio",body:"Banners, posters, ad creatives, even AI video. Same models the top creators pay premium subscriptions for."}),e.jsx(c,{emoji:"📧",tint:"green",title:"CRM + Email Engine",body:"Capture leads from your pages, segment automatically, send broadcasts and full autoresponder sequences."}),e.jsx(c,{emoji:"🔗",tint:"amber",title:"LinkHub + Bio Tools",body:"Replace Linktree with a fully-branded bio page. Lead Finder, QR codes, custom shortlinks — all included."}),e.jsx(c,{emoji:"⚡",tint:"lavender",title:"No upsells, ever",body:"One price. Full access. No 'next tier' gating. Cancel anytime from your account in two clicks."})]})]}),e.jsxs("section",{className:"rv-compare-section",children:[e.jsx("div",{className:"rv-eyebrow",children:"◆ The maths"}),e.jsx("h2",{className:"rv-section-heading",children:"$20 replaces $200+ of tools"}),e.jsx("p",{className:"rv-section-subhead",children:"Most affiliates stitch together five subscriptions to run their business. SuperAdPro does it all in one."}),e.jsxs("div",{className:"rv-compare-grid",children:[e.jsxs("div",{className:"rv-compare-row rv-header-row",children:[e.jsx("div",{children:"Job to be done"}),e.jsx("div",{children:"Typical stack"}),e.jsx("div",{children:"SuperAdPro"})]}),e.jsx(p,{task:"Page builder",them:"$49/mo"}),e.jsx(p,{task:"CRM + email autoresponder",them:"$49/mo"}),e.jsx(p,{task:"Bio link page",them:"$9/mo"}),e.jsx(p,{task:"AI creative generator",them:"$25/mo"}),e.jsx(p,{task:"AI video tools",them:"$40/mo"}),e.jsxs("div",{className:"rv-compare-row rv-total-row",children:[e.jsx("div",{className:"rv-compare-task",children:"Total monthly cost"}),e.jsx("div",{className:"rv-compare-them-strike",children:"$172/mo"}),e.jsx("div",{className:"rv-compare-us-bright",children:"$20/mo"})]})]})]}),e.jsxs("section",{className:"rv-final-cta",children:[e.jsxs("a",{href:o,className:"rv-cta-join",children:["Join SuperAdPro ",e.jsx("span",{className:"rv-cta-arrow",children:"→"})]}),e.jsxs("p",{className:"rv-final-cta-meta",children:["$20/month · cancel anytime · invited by ",e.jsx("span",{children:s})]})]})]}),e.jsxs("footer",{className:"rv-footer",children:[e.jsx("p",{children:"SuperAdPro provides marketing tools and an optional compensation program. Results from the optional comp program depend entirely on the effort, skill, and network of each member. No income is guaranteed."}),e.jsxs("p",{style:{opacity:.7,marginTop:12},children:["© ",new Date().getFullYear()," SuperAdPro Ltd · superadpro.com"]})]})]})}function A({src:a}){const o=n.useRef(null),s=n.useRef(null),[l,f]=n.useState(!1),[v,j]=n.useState(0),[h,w]=n.useState(0),[k,N]=n.useState(0),[z,C]=n.useState(!1),x=n.useRef(!1),b=r=>{if(!isFinite(r))return"0:00";const t=Math.floor(r/60),i=Math.floor(r%60).toString().padStart(2,"0");return`${t}:${i}`},g=()=>{const r=o.current;r&&(r.paused?r.play():r.pause())},m=r=>{const t=s.current,i=o.current;if(!t||!i||!i.duration)return;const d=t.getBoundingClientRect(),E=r.touches?r.touches[0].clientX:r.clientX,L=Math.max(0,Math.min(1,(E-d.left)/d.width));i.currentTime=L*i.duration},S=r=>{r.stopPropagation(),x.current=!0,m(r)},M=r=>{r.stopPropagation(),x.current=!0,m(r)};n.useEffect(()=>{const r=i=>{x.current&&m(i)},t=()=>{x.current=!1};return document.addEventListener("mousemove",r),document.addEventListener("mouseup",t),document.addEventListener("touchmove",r,{passive:!0}),document.addEventListener("touchend",t),()=>{document.removeEventListener("mousemove",r),document.removeEventListener("mouseup",t),document.removeEventListener("touchmove",r),document.removeEventListener("touchend",t)}},[]),n.useEffect(()=>{const r=t=>{var d;if(t.code!=="Space")return;const i=(d=document.activeElement)==null?void 0:d.tagName;i==="INPUT"||i==="TEXTAREA"||i==="BUTTON"||(t.preventDefault(),g())};return document.addEventListener("keydown",r),()=>document.removeEventListener("keydown",r)},[]);const G=r=>{r.stopPropagation();const t=o.current;t&&(document.fullscreenElement?(document.exitFullscreen||document.webkitExitFullscreen||(()=>{})).call(document):(t.requestFullscreen||t.webkitRequestFullscreen||(()=>{})).call(t))},P=r=>{r.stopPropagation();const t=o.current;t&&(t.muted=!t.muted,C(t.muted))},y=v?h/v*100:0;return e.jsx("div",{className:"rv-video-wrap",children:e.jsx("div",{className:"rv-video-wrap-inner",children:e.jsxs("div",{className:`rv-video-player ${l?"rv-playing":""}`,children:[e.jsxs("div",{className:"rv-video-frame",onClick:g,children:[e.jsx("video",{ref:o,playsInline:!0,preload:"metadata",onPlay:()=>f(!0),onPause:()=>f(!1),onEnded:()=>f(!1),onLoadedMetadata:r=>j(r.target.duration),onTimeUpdate:r=>w(r.target.currentTime),onProgress:r=>{const t=r.target;t.buffered.length>0&&t.duration&&N(t.buffered.end(t.buffered.length-1)/t.duration*100)},children:e.jsx("source",{src:a,type:"video/mp4"})}),!l&&e.jsx("div",{className:"rv-play-overlay",children:e.jsx("button",{className:"rv-play-big",onClick:r=>{r.stopPropagation(),g()},"aria-label":"Play video",children:e.jsx("svg",{viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M8 5v14l11-7z"})})})})]}),e.jsxs("div",{className:"rv-controls",children:[e.jsx("button",{className:"rv-ctrl-btn",onClick:r=>{r.stopPropagation(),g()},"aria-label":"Play / pause",children:l?e.jsx("svg",{viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M6 4h4v16H6zM14 4h4v16h-4z"})}):e.jsx("svg",{viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M8 5v14l11-7z"})})}),e.jsxs("div",{className:"rv-scrub",ref:s,onMouseDown:S,onTouchStart:M,children:[e.jsx("div",{className:"rv-scrub-buffer",style:{width:`${k}%`}}),e.jsx("div",{className:"rv-scrub-progress",style:{width:`${y}%`}}),e.jsx("div",{className:"rv-scrub-thumb",style:{left:`${y}%`}})]}),e.jsxs("div",{className:"rv-time",children:[b(h)," / ",b(v)]}),e.jsx("button",{className:"rv-ctrl-btn",onClick:P,"aria-label":"Mute / unmute",children:z?e.jsx("svg",{viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"})}):e.jsx("svg",{viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77S18.01 4.14 14 3.23z"})})}),e.jsx("button",{className:"rv-ctrl-btn",onClick:G,"aria-label":"Fullscreen",children:e.jsx("svg",{viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"})})})]})]})})})}function R(){return e.jsx("section",{className:"rv-pg-section",children:e.jsx("div",{className:"rv-pg-inner",children:e.jsxs("div",{className:"rv-pg-layout",children:[e.jsxs("div",{className:"rv-pg-copy",children:[e.jsx("div",{className:"rv-eyebrow rv-eyebrow-left",children:"◆ The Profit Grid"}),e.jsxs("h2",{className:"rv-pg-headline",children:["Build a Grid.",e.jsx("br",{}),e.jsx("span",{className:"rv-pg-headline-accent",children:"Every position pays."})]}),e.jsxs("p",{className:"rv-pg-subhead",children:["Every member you refer becomes a seat in your Profit Grid — a ",e.jsx("strong",{children:"6 × 6 grid"})," of 36 positions that fills as your team buys campaigns. Earn ",e.jsx("strong",{children:"40% direct"}),"on every entry, plus ",e.jsx("strong",{children:"6.25% across 8 uni-level levels"})," as commissions walk up the chain."]}),e.jsxs("div",{className:"rv-pg-bullets",children:[e.jsx(u,{dot:"gold",title:"Gold seats — your directs",body:"40% commission on every campaign entry from anyone you personally refer."}),e.jsx(u,{dot:"cyan",title:"Cyan seats — your uni-level",body:"6.25% from every entry across 8 levels deep — 50% in total uni-level commission."}),e.jsx(u,{dot:"pulse",title:"Completion bonus — seat 36",body:e.jsxs(e.Fragment,{children:["When the final seat fills, the bonus pool pays out — up to ",e.jsx("strong",{children:"$3,200"}),". Then the grid cycles again."]})})]}),e.jsxs("div",{className:"rv-pg-footer-pill",children:[e.jsx("span",{className:"rv-pg-footer-dot"}),"100% optional · the toolkit works standalone"]})]}),e.jsx("div",{className:"rv-pg-visual",children:e.jsxs("div",{className:"rv-pg-visual-frame",children:[e.jsx(F,{}),e.jsx("div",{className:"rv-pg-tag rv-pg-tag-gold",children:"+40% direct"}),e.jsx("div",{className:"rv-pg-tag rv-pg-tag-cyan",children:"+6.25% × 8 levels"})]})})]})})})}function u({dot:a,title:o,body:s}){return e.jsxs("div",{className:"rv-pg-bullet",children:[e.jsx("div",{className:`rv-pg-bullet-dot rv-dot-${a}`}),e.jsxs("div",{children:[e.jsx("div",{className:"rv-pg-bullet-title",children:o}),e.jsx("div",{className:"rv-pg-bullet-body",children:s})]})]})}function F(){return e.jsxs("svg",{viewBox:"0 0 480 540",xmlns:"http://www.w3.org/2000/svg",className:"rv-pg-svg",children:[e.jsxs("defs",{children:[e.jsxs("radialGradient",{id:"rvGold",cx:"50%",cy:"40%",r:"65%",children:[e.jsx("stop",{offset:"0%",stopColor:"#fde047"}),e.jsx("stop",{offset:"50%",stopColor:"#fbbf24"}),e.jsx("stop",{offset:"100%",stopColor:"#b45309"})]}),e.jsxs("radialGradient",{id:"rvCyan",cx:"50%",cy:"40%",r:"65%",children:[e.jsx("stop",{offset:"0%",stopColor:"#67e8f9"}),e.jsx("stop",{offset:"50%",stopColor:"#22d3ee"}),e.jsx("stop",{offset:"100%",stopColor:"#0891b2"})]}),e.jsxs("radialGradient",{id:"rvYou",cx:"50%",cy:"40%",r:"65%",children:[e.jsx("stop",{offset:"0%",stopColor:"#fef3c7"}),e.jsx("stop",{offset:"40%",stopColor:"#fbbf24"}),e.jsx("stop",{offset:"100%",stopColor:"#92400e"})]}),e.jsxs("radialGradient",{id:"rvComplete",cx:"50%",cy:"40%",r:"65%",children:[e.jsx("stop",{offset:"0%",stopColor:"#fef3c7"}),e.jsx("stop",{offset:"40%",stopColor:"#fbbf24"}),e.jsx("stop",{offset:"100%",stopColor:"#b45309"})]}),e.jsxs("linearGradient",{id:"rvLineGold",x1:"0",x2:"0",y1:"0",y2:"1",children:[e.jsx("stop",{offset:"0%",stopColor:"#fbbf24",stopOpacity:"0.85"}),e.jsx("stop",{offset:"100%",stopColor:"#fbbf24",stopOpacity:"0.3"})]}),e.jsxs("filter",{id:"rvGlowGold",x:"-50%",y:"-50%",width:"200%",height:"200%",children:[e.jsx("feGaussianBlur",{stdDeviation:"3.5",result:"blur"}),e.jsxs("feMerge",{children:[e.jsx("feMergeNode",{in:"blur"}),e.jsx("feMergeNode",{in:"SourceGraphic"})]})]}),e.jsxs("filter",{id:"rvGlowCyan",x:"-50%",y:"-50%",width:"200%",height:"200%",children:[e.jsx("feGaussianBlur",{stdDeviation:"2.5",result:"blur"}),e.jsxs("feMerge",{children:[e.jsx("feMergeNode",{in:"blur"}),e.jsx("feMergeNode",{in:"SourceGraphic"})]})]})]}),e.jsxs("circle",{cx:"240",cy:"50",r:"28",fill:"none",stroke:"#fde047",strokeWidth:"2",opacity:"0.5",children:[e.jsx("animate",{attributeName:"r",values:"28;44;28",dur:"2.4s",repeatCount:"indefinite"}),e.jsx("animate",{attributeName:"opacity",values:"0.5;0;0.5",dur:"2.4s",repeatCount:"indefinite"})]}),e.jsxs("g",{filter:"url(#rvGlowGold)",children:[e.jsx("circle",{cx:"240",cy:"50",r:"28",fill:"url(#rvYou)"}),e.jsx("circle",{cx:"240",cy:"50",r:"28",fill:"none",stroke:"#fde047",strokeWidth:"2",opacity:"0.85"}),e.jsx("text",{x:"240",y:"55",textAnchor:"middle",fontFamily:"Sora, sans-serif",fontWeight:"800",fontSize:"12",fill:"#451a03",children:"YOU"})]}),e.jsx("line",{x1:"240",y1:"78",x2:"65",y2:"150",stroke:"url(#rvLineGold)",strokeWidth:"2"}),e.jsx("line",{x1:"240",y1:"78",x2:"135",y2:"150",stroke:"url(#rvLineGold)",strokeWidth:"2"}),e.jsx("line",{x1:"240",y1:"78",x2:"205",y2:"150",stroke:"url(#rvLineGold)",strokeWidth:"2"}),e.jsx("line",{x1:"240",y1:"78",x2:"275",y2:"150",stroke:"url(#rvLineGold)",strokeWidth:"2"}),e.jsx("line",{x1:"240",y1:"78",x2:"345",y2:"150",stroke:"url(#rvLineGold)",strokeWidth:"2"}),e.jsx("line",{x1:"240",y1:"78",x2:"415",y2:"150",stroke:"url(#rvLineGold)",strokeWidth:"2"}),e.jsx("rect",{x:"20",y:"120",width:"440",height:"380",rx:"14",fill:"rgba(255,255,255,0.4)",stroke:"rgba(10,20,56,0.08)",strokeWidth:"1"}),e.jsxs("g",{fontFamily:"JetBrains Mono, monospace",fontSize:"9.5",fontWeight:"700",fill:"#94a3b8",textAnchor:"end",children:[e.jsx("text",{x:"14",y:"154",children:"L1"}),e.jsx("text",{x:"14",y:"214",children:"L2"}),e.jsx("text",{x:"14",y:"274",children:"L3"}),e.jsx("text",{x:"14",y:"334",children:"L4"}),e.jsx("text",{x:"14",y:"394",children:"L5"}),e.jsx("text",{x:"14",y:"454",children:"L6"})]}),e.jsx("g",{filter:"url(#rvGlowGold)",children:[65,135,205,275,345,415].map(a=>e.jsx("circle",{cx:a,cy:"150",r:"18",fill:"url(#rvGold)"},a))}),e.jsxs("g",{filter:"url(#rvGlowCyan)",children:[[210,270,330,390].flatMap(a=>[65,135,205,275,345,415].map(o=>e.jsx("circle",{cx:o,cy:a,r:"14",fill:"url(#rvCyan)"},`${o}-${a}`))),[65,135,205,275,345].map(a=>e.jsx("circle",{cx:a,cy:"450",r:"14",fill:"url(#rvCyan)"},`r6-${a}`))]}),e.jsxs("circle",{cx:"415",cy:"450",r:"14",fill:"none",stroke:"#fde047",strokeWidth:"2",opacity:"0.6",children:[e.jsx("animate",{attributeName:"r",values:"14;26;14",dur:"2.2s",repeatCount:"indefinite"}),e.jsx("animate",{attributeName:"opacity",values:"0.6;0;0.6",dur:"2.2s",repeatCount:"indefinite"})]}),e.jsxs("g",{filter:"url(#rvGlowGold)",children:[e.jsx("circle",{cx:"415",cy:"450",r:"16",fill:"url(#rvComplete)"}),e.jsx("circle",{cx:"415",cy:"450",r:"16",fill:"none",stroke:"#fde047",strokeWidth:"1.5",opacity:"0.8"}),e.jsx("text",{x:"415",y:"454",textAnchor:"middle",fontFamily:"Sora, sans-serif",fontWeight:"800",fontSize:"9",fill:"#451a03",children:"36"})]}),e.jsx("text",{x:"240",y:"510",textAnchor:"middle",fontFamily:"JetBrains Mono, monospace",fontSize:"11",fontWeight:"700",fill:"#0a1438",letterSpacing:"0.4",children:"6 WIDE × 6 DEEP = 36 SEATS"}),e.jsx("text",{x:"240",y:"528",textAnchor:"middle",fontFamily:"JetBrains Mono, monospace",fontSize:"9",fontWeight:"700",fill:"#64748b",letterSpacing:"0.3",children:"commissions pay 8 levels deep ↓"})]})}function c({emoji:a,tint:o,title:s,body:l}){return e.jsxs("div",{className:"rv-value-card",children:[e.jsx("div",{className:`rv-value-icon rv-tint-${o}`,children:a}),e.jsx("div",{className:"rv-value-title",children:s}),e.jsx("div",{className:"rv-value-body",children:l})]})}function p({task:a,them:o}){return e.jsxs("div",{className:"rv-compare-row",children:[e.jsx("div",{className:"rv-compare-task",children:a}),e.jsx("div",{className:"rv-compare-them",children:o}),e.jsx("div",{className:"rv-compare-us",children:"included"})]})}const W=`
  .rv-header {
    position: sticky; top: 0; z-index: 50;
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(10,20,56,0.08);
  }
  .rv-header-inner {
    max-width: 1120px; margin: 0 auto;
    padding: 14px 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }
  .rv-brand {
    font-family: 'Sora', sans-serif;
    font-size: 19px; font-weight: 800;
    color: #0a1438;
    letter-spacing: -0.02em;
  }
  .rv-brand-accent { color: #06b6d4; }
  .rv-header-cta {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 11px 20px;
    border-radius: 10px;
    background: #0a1438;
    color: #fff;
    font-family: 'Sora', sans-serif;
    font-size: 13px; font-weight: 800;
    letter-spacing: 0.2px;
    text-decoration: none;
    transition: all .2s;
    box-shadow: 0 4px 14px rgba(10,20,56,0.15);
    border: none;
  }
  .rv-header-cta:hover {
    background: #1e3a8a;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(10,20,56,0.25);
  }

  .rv-main {
    position: relative;
    background-color: #fafbfd;
    background-image: url('${T}');
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
    background-attachment: fixed;
    color: #0a1438;
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    line-height: 1.55;
  }

  .rv-hero {
    max-width: 1120px; margin: 0 auto;
    padding: 44px 24px 24px;
    position: relative;
    z-index: 1;
  }
  .rv-pill {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 5px 12px;
    border-radius: 999px;
    background: #ecfeff;
    border: 1px solid #a5f3fc;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; font-weight: 700;
    color: #0891b2;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .rv-pill-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #06b6d4;
  }
  .rv-h1 {
    font-family: 'Sora', sans-serif;
    font-size: clamp(28px, 4.6vw, 48px);
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: #0a1438;
    margin: 0 0 14px;
  }
  .rv-highlight {
    background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .rv-subhead {
    font-size: clamp(14px, 1.7vw, 16px);
    color: #475569;
    max-width: 640px;
    line-height: 1.55;
    margin: 0 0 18px;
  }
  .rv-hero-meta {
    display: inline-flex; flex-wrap: wrap; gap: 8px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px; font-weight: 700;
    color: #64748b;
    letter-spacing: 0.3px;
  }
  .rv-meta-item { display: inline-flex; align-items: center; gap: 6px; }
  .rv-meta-item::before { content: '◆'; color: #06b6d4; font-size: 8px; }

  /* Video player */
  .rv-video-wrap { max-width: 1120px; margin: 16px auto 0; padding: 0 24px; }
  .rv-video-wrap-inner { position: relative; }
  .rv-video-wrap-inner::before {
    content: '';
    position: absolute;
    inset: -12px -12px 12px 12px;
    background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%);
    border-radius: 22px;
    z-index: 0;
    opacity: 0.18;
    transform: rotate(0.6deg);
  }
  .rv-video-player {
    position: relative; z-index: 1;
    border-radius: 20px;
    overflow: hidden;
    background: #0e1a3e;
    box-shadow:
      0 30px 80px -20px rgba(10,20,56,0.35),
      0 0 0 1px rgba(34,211,238,0.18);
  }
  .rv-video-frame {
    position: relative;
    background: #000;
    aspect-ratio: 1796 / 1080;
    overflow: hidden;
    cursor: pointer;
  }
  .rv-video-frame video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
  }
  .rv-play-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: transparent;
    transition: opacity .25s;
    z-index: 2;
    pointer-events: none;
  }
  .rv-playing .rv-play-overlay { opacity: 0; }
  .rv-play-big {
    width: 88px; height: 88px;
    border-radius: 50%;
    background: rgba(255,255,255,0.96);
    color: #0a1438;
    display: flex; align-items: center; justify-content: center;
    box-shadow:
      0 12px 40px rgba(0,0,0,0.35),
      0 0 0 8px rgba(255,255,255,0.18);
    transition: transform .2s;
    border: none;
    pointer-events: auto;
    cursor: pointer;
  }
  .rv-video-frame:hover .rv-play-big { transform: scale(1.06); }
  .rv-play-big svg { width: 32px; height: 32px; margin-left: 4px; }
  .rv-controls {
    background: linear-gradient(180deg, #0e1a3e 0%, #0a1438 100%);
    padding: 12px 16px 14px;
    display: flex; align-items: center; gap: 12px;
    color: #fff;
    border-top: 1px solid rgba(34,211,238,0.18);
  }
  .rv-ctrl-btn {
    background: transparent; border: none; color: #fff;
    width: 36px; height: 36px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s;
    flex-shrink: 0;
    cursor: pointer;
  }
  .rv-ctrl-btn:hover { background: rgba(34,211,238,0.15); }
  .rv-ctrl-btn svg { width: 20px; height: 20px; }
  .rv-scrub {
    flex: 1;
    position: relative;
    height: 6px;
    background: rgba(255,255,255,0.15);
    border-radius: 999px;
    cursor: pointer;
    margin: 0 4px;
  }
  .rv-scrub-buffer { position: absolute; top: 0; left: 0; height: 100%; background: rgba(255,255,255,0.25); border-radius: 999px; }
  .rv-scrub-progress { position: absolute; top: 0; left: 0; height: 100%; background: linear-gradient(90deg, #06b6d4, #22d3ee); border-radius: 999px; }
  .rv-scrub-thumb {
    position: absolute; top: 50%;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    transform: translate(-50%, -50%);
    transition: transform .15s;
  }
  .rv-scrub:hover .rv-scrub-thumb { transform: translate(-50%, -50%) scale(1.2); }
  .rv-time {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; font-weight: 700;
    color: rgba(255,255,255,0.85);
    letter-spacing: 0.3px;
    min-width: 92px;
    text-align: center;
    user-select: none;
  }

  /* ── Profit Grid section ── */
  .rv-pg-section {
    background:
      radial-gradient(circle at 0% 0%, rgba(34,211,238,0.12), transparent 50%),
      radial-gradient(circle at 100% 100%, rgba(14,165,233,0.08), transparent 55%),
      linear-gradient(180deg, #ecfeff 0%, #f0fafb 100%);
    padding: 72px 0;
    position: relative;
    overflow: hidden;
    border-top: 1px solid rgba(6,182,212,0.15);
    border-bottom: 1px solid rgba(6,182,212,0.15);
    margin-top: 48px;
  }
  .rv-pg-section::before {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(6,182,212,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(6,182,212,0.05) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    pointer-events: none;
  }
  .rv-pg-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }
  .rv-pg-layout {
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    gap: 48px;
    align-items: center;
  }
  .rv-pg-copy { max-width: 540px; }
  .rv-eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px; font-weight: 700;
    color: #06b6d4;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    margin-bottom: 12px;
    text-align: center;
  }
  .rv-eyebrow-left { text-align: left; margin-bottom: 16px; }
  .rv-pg-headline {
    font-family: 'Sora', sans-serif;
    font-size: clamp(32px, 4.4vw, 50px);
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: #0a1438;
    margin: 0 0 18px;
  }
  .rv-pg-headline-accent {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 60%, #d97706 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .rv-pg-subhead {
    font-size: 16px;
    color: #475569;
    line-height: 1.6;
    margin: 0 0 28px;
  }
  .rv-pg-subhead strong { color: #0a1438; font-weight: 800; }
  .rv-pg-bullets { display: flex; flex-direction: column; gap: 18px; margin-bottom: 28px; }
  .rv-pg-bullet { display: flex; gap: 14px; align-items: flex-start; }
  .rv-pg-bullet-dot {
    flex-shrink: 0;
    width: 14px; height: 14px;
    border-radius: 50%;
    margin-top: 4px;
    box-shadow: 0 0 0 3px rgba(255,255,255,0.85);
  }
  .rv-dot-gold {
    background: radial-gradient(circle at 30% 30%, #fde047, #d97706);
    box-shadow: 0 0 0 3px rgba(251,191,36,0.18), 0 0 12px rgba(251,191,36,0.5);
  }
  .rv-dot-cyan {
    background: radial-gradient(circle at 30% 30%, #67e8f9, #0891b2);
    box-shadow: 0 0 0 3px rgba(34,211,238,0.18), 0 0 12px rgba(34,211,238,0.4);
  }
  .rv-dot-pulse {
    background: radial-gradient(circle at 30% 30%, #fef3c7, #fbbf24);
    box-shadow: 0 0 0 3px rgba(251,191,36,0.18), 0 0 14px rgba(251,191,36,0.6);
    animation: rvDotPulse 2.2s ease-in-out infinite;
  }
  @keyframes rvDotPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.18); }
  }
  .rv-pg-bullet-title {
    font-family: 'Sora', sans-serif;
    font-size: 15px; font-weight: 800;
    color: #0a1438;
    margin-bottom: 3px;
    letter-spacing: -0.005em;
  }
  .rv-pg-bullet-body {
    font-size: 13.5px;
    color: #64748b;
    line-height: 1.5;
  }
  .rv-pg-bullet-body strong { color: #0a1438; font-weight: 800; }
  .rv-pg-visual { display: flex; align-items: center; justify-content: center; }
  .rv-pg-visual-frame { position: relative; width: 100%; max-width: 480px; aspect-ratio: 480 / 540; }
  .rv-pg-svg { width: 100%; height: 100%; display: block; }
  .rv-pg-tag {
    position: absolute;
    padding: 7px 13px;
    border-radius: 999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; font-weight: 800;
    letter-spacing: 0.3px;
    box-shadow: 0 6px 18px rgba(10,20,56,0.18);
    white-space: nowrap;
  }
  .rv-pg-tag-gold {
    top: 18%; left: -8px;
    background: linear-gradient(135deg, #fde047, #f59e0b);
    color: #451a03;
    border: 1px solid rgba(180, 83, 9, 0.4);
  }
  .rv-pg-tag-cyan {
    top: 50%; right: -8px;
    background: linear-gradient(135deg, #67e8f9, #06b6d4);
    color: #083344;
    border: 1px solid rgba(8, 145, 178, 0.4);
  }
  .rv-pg-footer-pill {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 18px;
    border-radius: 999px;
    background: #fff;
    border: 1px solid rgba(6,182,212,0.3);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; font-weight: 700;
    color: #0891b2;
    letter-spacing: 0.4px;
  }
  .rv-pg-footer-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #22d3ee;
    box-shadow: 0 0 10px rgba(34,211,238,0.8);
  }

  /* ── Toolkit section ── */
  .rv-section { max-width: 1120px; margin: 0 auto; padding: 80px 24px; }
  .rv-section-heading {
    font-family: 'Sora', sans-serif;
    font-size: clamp(28px, 4.5vw, 44px);
    font-weight: 900;
    color: #0a1438;
    letter-spacing: -0.025em;
    line-height: 1.1;
    text-align: center;
    margin: 0 0 14px;
  }
  .rv-section-subhead {
    text-align: center;
    color: #64748b;
    font-size: 16px;
    margin: 0 auto 52px;
    max-width: 600px;
    line-height: 1.6;
  }
  .rv-value-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 14px;
  }
  .rv-value-card {
    background: #fff;
    border: 1px solid #e6eaf0;
    border-radius: 16px;
    padding: 28px 26px;
    transition: all .2s;
    position: relative;
    overflow: hidden;
  }
  .rv-value-card:hover {
    border-color: #06b6d4;
    transform: translateY(-3px);
    box-shadow: 0 12px 32px -8px rgba(6,182,212,0.18);
  }
  .rv-value-card::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #06b6d4, #0ea5e9);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform .25s;
  }
  .rv-value-card:hover::after { transform: scaleX(1); }
  .rv-value-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px;
    border-radius: 12px;
    margin-bottom: 18px;
    font-size: 22px;
    border: 1px solid #a5f3fc;
  }
  .rv-tint-blue   { background: linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%); border-color: #93c5fd; }
  .rv-tint-pink   { background: linear-gradient(135deg,#fce7f3 0%,#fbcfe8 100%); border-color: #f9a8d4; }
  .rv-tint-green  { background: linear-gradient(135deg,#dcfce7 0%,#bbf7d0 100%); border-color: #86efac; }
  .rv-tint-amber  { background: linear-gradient(135deg,#fef3c7 0%,#fde68a 100%); border-color: #fcd34d; }
  .rv-tint-lavender { background: linear-gradient(135deg,#ede9fe 0%,#ddd6fe 100%); border-color: #c4b5fd; }
  .rv-value-title {
    font-family: 'Sora', sans-serif;
    font-size: 18px; font-weight: 800;
    color: #0a1438;
    margin-bottom: 8px;
    letter-spacing: -0.01em;
  }
  .rv-value-body {
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
  }

  /* ── Maths comparison ── */
  .rv-compare-section {
    background:
      radial-gradient(circle at 20% 0%, rgba(6,182,212,0.06), transparent 50%),
      radial-gradient(circle at 80% 100%, rgba(30,58,138,0.05), transparent 50%),
      #f5f7fb;
    padding: 80px 0;
    border-top: 1px solid #e6eaf0;
    border-bottom: 1px solid #e6eaf0;
  }
  .rv-compare-grid {
    max-width: 800px;
    margin: 40px auto 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 0 24px;
  }
  .rv-compare-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 20px;
    align-items: center;
    padding: 18px 24px;
    background: #fff;
    border: 1px solid #e6eaf0;
    border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
  }
  .rv-compare-row.rv-header-row {
    background: transparent;
    border: none;
    padding: 0 24px 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
  .rv-compare-row.rv-total-row {
    background: #0a1438;
    color: #fff;
    border-color: #0a1438;
  }
  .rv-compare-task { font-weight: 600; color: #0a1438; }
  .rv-compare-row.rv-total-row .rv-compare-task { color: #fff; }
  .rv-compare-them { color: #94a3b8; text-align: right; font-weight: 600; }
  .rv-compare-them-strike { color: rgba(255,255,255,0.6); text-align: right; font-weight: 600; text-decoration: line-through; }
  .rv-compare-us {
    color: #06b6d4; font-weight: 800;
    text-align: right;
    font-family: 'Sora', sans-serif;
  }
  .rv-compare-us-bright {
    color: #22d3ee; font-weight: 800;
    text-align: right;
    font-family: 'Sora', sans-serif;
  }

  /* ── Final CTA ── */
  .rv-final-cta {
    max-width: 720px;
    margin: 0 auto;
    padding: 72px 24px 96px;
    text-align: center;
  }
  .rv-cta-join {
    display: inline-flex; align-items: center; gap: 12px;
    padding: 22px 56px;
    border-radius: 14px;
    background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%);
    color: #fff;
    font-family: 'Sora', sans-serif;
    font-size: 22px; font-weight: 800;
    letter-spacing: 0.3px;
    text-decoration: none;
    box-shadow: 0 12px 32px rgba(6,182,212,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
    transition: all .2s;
  }
  .rv-cta-join:hover {
    transform: translateY(-3px);
    box-shadow: 0 18px 44px rgba(6,182,212,0.55), inset 0 1px 0 rgba(255,255,255,0.25);
  }
  .rv-cta-arrow { font-size: 24px; transition: transform .2s; }
  .rv-cta-join:hover .rv-cta-arrow { transform: translateX(4px); }
  .rv-final-cta-meta {
    margin-top: 22px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px; font-weight: 700;
    color: #64748b;
    letter-spacing: 0.3px;
  }
  .rv-final-cta-meta span { color: #06b6d4; }

  /* ── Footer ── */
  .rv-footer {
    background: #fafbfd;
    padding: 40px 24px;
    text-align: center;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.65;
    border-top: 1px solid #e6eaf0;
  }
  .rv-footer p { max-width: 720px; margin: 0 auto 8px; }

  /* ── Mobile ── */
  @media (max-width: 640px) {
    .rv-hero { padding: 28px 20px 18px; }
    .rv-header-cta { padding: 9px 16px; font-size: 12px; }
    .rv-video-wrap { padding: 0 16px; }
    .rv-video-wrap-inner::before { inset: -8px -8px 8px 8px; }
    .rv-controls { padding: 10px 12px 12px; gap: 8px; }
    .rv-ctrl-btn { width: 32px; height: 32px; }
    .rv-time { font-size: 11px; min-width: 78px; }
    .rv-play-big { width: 68px; height: 68px; }
    .rv-play-big svg { width: 26px; height: 26px; }
    .rv-section { padding: 56px 20px; }
    .rv-value-card { padding: 22px 20px; }
    .rv-pg-section { padding: 56px 0; }
    .rv-pg-layout { grid-template-columns: 1fr; gap: 36px; }
    .rv-pg-copy { max-width: 100%; }
    .rv-eyebrow-left { text-align: center; }
    .rv-pg-headline { text-align: center; }
    .rv-pg-subhead { text-align: center; }
    .rv-pg-visual-frame { max-width: 360px; margin: 0 auto; }
    .rv-pg-tag-gold { left: 0; }
    .rv-pg-tag-cyan { right: 0; }
    .rv-compare-row { font-size: 13px; padding: 14px 16px; grid-template-columns: 1.2fr auto auto; }
    .rv-final-cta { padding: 48px 20px 72px; }
    .rv-cta-join { padding: 18px 36px; font-size: 18px; }
    .rv-cta-arrow { font-size: 20px; }
  }
`;export{I as default};
