const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ConstellationHero-BezCuOim.js","assets/vendor-BVYZkoj1.js","assets/vendor-charts-sutgcRna.js","assets/vendor-three-DOH45lMl.js"])))=>i.map(i=>d[i]);
import{r,j as e,aj as u,ck as t,L as x,ag as b,cl as y}from"./vendor-BVYZkoj1.js";import{a as v,P as w,b as j}from"./index-CXTXyMm1.js";import"./vendor-charts-sutgcRna.js";var k="https://videos.pexels.com/video-files/6339869/6339869-hd_1920_1080_30fps.mp4",N="https://images.pexels.com/videos/6339869/board-coffee-pause-diagrams-discussion-6339869.jpeg?auto=compress&cs=tinysrgb&w=1920";function S({src:c,poster:g,force:n}){var[h,s]=r.useState(!1),[f,d]=r.useState(!1),l=r.useRef(null);r.useEffect(function(){if(n){s(!0);return}if(typeof window<"u"&&window.matchMedia){var o=window.matchMedia("(prefers-reduced-motion: reduce)");if(o.matches)return}typeof navigator<"u"&&navigator.connection&&(navigator.connection.saveData||navigator.connection.effectiveType==="slow-2g"||navigator.connection.effectiveType==="2g")||typeof window<"u"&&window.innerWidth<600||s(!0)},[n]);function a(){if(d(!0),l.current){var o=l.current.play();o&&typeof o.catch=="function"&&o.catch(function(p){typeof console<"u"&&console.warn&&console.warn("[BackgroundVideo] autoplay denied:",p&&p.message)})}}function i(o){typeof console<"u"&&console.warn&&console.warn("[BackgroundVideo] video element error",o)}return e.jsxs("div",{className:"bg-video-wrap","aria-hidden":"true",children:[e.jsx("img",{src:g||N,alt:"",className:"bg-video-poster",loading:"eager",decoding:"async"}),h&&e.jsx("video",{ref:l,className:"bg-video"+(f?" bg-video-loaded":""),src:c||k,autoPlay:!0,muted:!0,loop:!0,playsInline:!0,preload:"auto",onLoadedData:a,onError:i}),e.jsx("div",{className:"bg-video-overlay"})]})}var z=r.lazy(function(){return b(()=>import("./ConstellationHero-BezCuOim.js"),__vite__mapDeps([0,1,2,3]))});t.registerPlugin(y);function E(){var c=r.useRef(null),g=r.useRef(null),[n,h]=r.useState({members:138,foundingRemaining:77}),[s,f]=r.useState(!1),d=u();function l(a){a&&a.preventDefault&&a.preventDefault(),!s&&(f(!0),j("/api/start/peek-next-sponsor",{}).then(function(i){var o=i&&i.sponsor_username?i.sponsor_username:"SuperAdPro";d("/register?via=start&ref="+encodeURIComponent(o))}).catch(function(){d("/register?via=start")}))}return r.useEffect(function(){v("/api/start/stats").then(function(a){a&&typeof a.total_members=="number"&&h({members:a.total_members,foundingRemaining:typeof a.founding_remaining=="number"?a.founding_remaining:77})}).catch(function(){})},[]),r.useEffect(function(){var a=t.context(function(){var i=t.utils.toArray(".hero-word");t.fromTo(i,{y:60,opacity:0},{y:0,opacity:1,duration:1.1,stagger:.09,ease:"expo.out",delay:.6}),t.fromTo(".hero-tag",{y:20,opacity:0},{y:0,opacity:1,duration:1,ease:"power2.out",delay:.3}),t.fromTo(".hero-promise",{y:30,opacity:0},{y:0,opacity:1,duration:1.2,ease:"expo.out",delay:1.5}),t.fromTo(".hero-sub",{opacity:0},{opacity:1,duration:1.4,ease:"power2.out",delay:1.9}),t.fromTo(".hero-stats > *",{y:20,opacity:0},{y:0,opacity:1,duration:1,stagger:.12,ease:"power3.out",delay:2.2}),t.fromTo(".hero-cta-row > *",{y:24,opacity:0},{y:0,opacity:1,duration:1,stagger:.18,ease:"expo.out",delay:2.55}),t.to(".hero-cta-primary",{boxShadow:"0 14px 48px rgba(6,182,212,.65), inset 0 0 0 1px rgba(255,255,255,.35)",duration:1.8,delay:3.6,repeat:-1,yoyo:!0,ease:"sine.inOut"});var o={val:100};t.to(o,{val:n.foundingRemaining,duration:2.4,ease:"power3.out",delay:1.8,onUpdate:function(){var m=document.getElementById("memberCount");m&&(m.textContent=Math.round(o.val).toLocaleString())}}),t.fromTo(".fusion-left",{x:-80,opacity:0},{x:0,opacity:1,duration:1.4,ease:"expo.out",scrollTrigger:{trigger:".fusion-section",start:"top 75%"}}),t.fromTo(".fusion-right",{x:80,opacity:0},{x:0,opacity:1,duration:1.4,ease:"expo.out",scrollTrigger:{trigger:".fusion-section",start:"top 75%"}}),t.fromTo(".fusion-seam",{scale:0,opacity:0},{scale:1,opacity:1,duration:1.6,ease:"elastic.out(1, 0.5)",scrollTrigger:{trigger:".fusion-section",start:"top 70%"},delay:.4}),t.fromTo(".tool-card",{y:80,opacity:0},{y:0,opacity:1,duration:1,ease:"expo.out",stagger:.15,scrollTrigger:{trigger:".tools-section",start:"top 70%"}});var p=t.timeline({scrollTrigger:{trigger:".converge-section",start:"top top",end:"+=1200",pin:!0,scrub:.8}});p.fromTo(".converge-svg",{opacity:0,scale:.85},{opacity:1,scale:1,duration:1}).fromTo(".converge-stream-1",{strokeDashoffset:1e3},{strokeDashoffset:0,duration:1.5},"<0.2").fromTo(".converge-label-1",{opacity:0,y:20},{opacity:1,y:0,duration:.6},"<0.3").fromTo(".converge-stream-2",{strokeDashoffset:1e3},{strokeDashoffset:0,duration:1.5},"<0.2").fromTo(".converge-label-2",{opacity:0,y:20},{opacity:1,y:0,duration:.6},"<0.3").fromTo(".converge-stream-3",{strokeDashoffset:1e3},{strokeDashoffset:0,duration:1.5},"<0.2").fromTo(".converge-label-3",{opacity:0,y:20},{opacity:1,y:0,duration:.6},"<0.3").fromTo(".converge-stream-4",{strokeDashoffset:1e3},{strokeDashoffset:0,duration:1.5},"<0.2").fromTo(".converge-label-4",{opacity:0,y:20},{opacity:1,y:0,duration:.6},"<0.3").fromTo(".converge-hub",{scale:.3,opacity:0},{scale:1,opacity:1,duration:1,ease:"expo.out"},"+=0.2"),t.fromTo(".founding-dot",{scale:0,opacity:0},{scale:1,opacity:1,duration:.5,ease:"back.out(2)",stagger:{each:.008,from:"random"},scrollTrigger:{trigger:".founding-section",start:"top 65%"}}),t.fromTo(".founding-price",{y:60,opacity:0,scale:.85},{y:0,opacity:1,scale:1,duration:1.6,ease:"expo.out",scrollTrigger:{trigger:".founding-section",start:"top 50%"}}),t.fromTo(".portal-headline",{y:50,opacity:0},{y:0,opacity:1,duration:1.4,ease:"expo.out",scrollTrigger:{trigger:".portal-section",start:"top 75%"}}),t.fromTo(".portal-cta",{y:30,opacity:0},{y:0,opacity:1,duration:1,ease:"expo.out",stagger:.15,delay:.3,scrollTrigger:{trigger:".portal-section",start:"top 75%"}})},c);return function(){a.revert()}},[n.foundingRemaining]),e.jsxs(w,{children:[e.jsx("style",{children:T}),e.jsxs("div",{className:"start-page",ref:c,children:[e.jsxs("section",{className:"hero-section",children:[e.jsxs("div",{className:"hero-canvas-wrap bgmode-both",children:[e.jsx(S,{force:!0}),e.jsx(r.Suspense,{fallback:e.jsx("div",{className:"hero-canvas-loading"}),children:e.jsx(z,{})}),e.jsx("div",{className:"hero-vignette"})]}),e.jsxs("div",{className:"hero-overlay",ref:g,children:[e.jsx("div",{className:"hero-tag",children:"100 Founding Partner spots · price locked for life"}),e.jsxs("h1",{className:"hero-headline",children:[e.jsx("span",{className:"hero-word",children:"Be"})," ",e.jsx("span",{className:"hero-word",children:"one of the"})," ",e.jsx("span",{className:"hero-word hero-word-bright",children:"first 100."}),e.jsx("br",{}),e.jsxs("span",{className:"hero-headline-line2",children:[e.jsx("span",{className:"hero-word",children:"Locked at"})," ",e.jsx("span",{className:"hero-word hero-word-bright",children:"$15/mo"})," ",e.jsx("span",{className:"hero-word",children:"forever."})]})]}),e.jsxs("div",{className:"hero-promise",children:[e.jsx("div",{className:"hero-promise-label",children:"// Founding spots remaining"}),e.jsx("span",{className:"hero-promise-val",id:"memberCount",children:"0"}),e.jsx("div",{className:"hero-promise-sub",children:"// Out of 100 · price never increases"})]}),e.jsx("p",{className:"hero-sub",children:"When spot #100 is claimed this offer closes forever. Standard membership reverts to $20/month. Founding Partners keep their $15 rate for life — no exceptions, no annual increases."}),e.jsxs("div",{className:"hero-cta-row",children:[e.jsxs("a",{href:"/register?via=start",onClick:l,className:"hero-cta-primary",style:s?{pointerEvents:"none",opacity:.6}:void 0,children:[e.jsx("span",{className:"hero-cta-label",children:s?"Finding your sponsor…":"Claim your Founder spot"}),e.jsx("span",{className:"hero-cta-arrow",children:"→"}),e.jsx("span",{className:"hero-cta-shimmer"})]}),e.jsx(x,{to:"#how-it-works",className:"hero-cta-ghost",children:"See how it works"})]}),e.jsxs("div",{className:"hero-stats",children:[e.jsxs("div",{className:"hero-stat",children:[e.jsx("span",{className:"hero-stat-num",children:"$15"}),e.jsx("div",{className:"hero-stat-label",children:"/mo locked"})]}),e.jsxs("div",{className:"hero-stat",children:[e.jsx("span",{className:"hero-stat-num",children:"100"}),e.jsx("div",{className:"hero-stat-label",children:"total spots"})]}),e.jsxs("div",{className:"hero-stat",children:[e.jsx("span",{className:"hero-stat-num",children:"$0"}),e.jsx("div",{className:"hero-stat-label",children:"to sign up"})]})]})]}),e.jsx("div",{className:"hero-scroll-cue",children:"Scroll into the network ↓"})]}),e.jsx("section",{className:"fusion-section beat",children:e.jsxs("div",{className:"beat-inner",children:[e.jsxs("div",{className:"beat-header",children:[e.jsx("div",{className:"beat-tag",children:"Section 02 — What it actually is"}),e.jsxs("h2",{className:"beat-h",children:["Two halves of one platform.",e.jsx("span",{className:"beat-h-accent",children:"Fused at the seam."})]}),e.jsx("p",{className:"beat-sub",children:"Most affiliate platforms have no real product. Most AI tools have no upside structure. SuperAdPro is what happens when you build both, on purpose, into one system."})]}),e.jsxs("div",{className:"fusion-grid",children:[e.jsxs("div",{className:"fusion-left fusion-side",children:[e.jsx("div",{className:"side-tag",children:"// Left half"}),e.jsx("h3",{children:"AI tools that work"}),e.jsx("p",{children:"A complete content and marketing suite. Real software with margin and substance — the kind you would pay separate subscriptions for."}),e.jsxs("ul",{children:[e.jsx("li",{children:"Creative Studio — ten AI content tools"}),e.jsx("li",{children:"Brand Poster Generator — six templates"}),e.jsx("li",{children:"Lead Finder — live web-sourced prospects"}),e.jsx("li",{children:"SuperPages — drag-and-drop landing pages"}),e.jsx("li",{children:"SuperDeck — AI presentations"})]})]}),e.jsx("div",{className:"fusion-seam-wrap",children:e.jsx("div",{className:"fusion-seam"})}),e.jsxs("div",{className:"fusion-right fusion-side",children:[e.jsx("div",{className:"side-tag",children:"// Right half"}),e.jsx("h3",{children:"A network that compounds"}),e.jsx("p",{children:"Four income streams running on one membership. The same network powers all four — build once, earn from each."}),e.jsxs("ul",{children:[e.jsx("li",{children:"Membership commissions"}),e.jsx("li",{children:"8×8 Campaign Grid spillover"}),e.jsx("li",{children:"3×3 Credit Nexus matrix"}),e.jsx("li",{children:"Course Academy cascade"}),e.jsx("li",{children:"Transparent live commission ledger"})]})]})]})]})}),e.jsx("section",{id:"how-it-works",className:"tools-section beat",children:e.jsxs("div",{className:"beat-inner",children:[e.jsxs("div",{className:"beat-header",children:[e.jsx("div",{className:"beat-tag",children:"Section 03 — The tools"}),e.jsxs("h2",{className:"beat-h",children:["Real software for operators.",e.jsx("span",{className:"beat-h-accent",children:"Not feature theatre."})]}),e.jsx("p",{className:"beat-sub",children:"Each of these ships, runs daily, and is used by real members. Membership unlocks every one of them."})]}),e.jsx("div",{className:"tools-grid",children:[{title:"Creative Studio",desc:"Ten AI content tools under one roof. Video, images, music, voiceover, lip sync, storyboards, captions, editor, gallery, credit packs.",icon:"M12 2L2 7v10l10 5 10-5V7l-10-5z"},{title:"Brand Poster Generator",desc:"Six AI templates. Branded marketing posters in sixty seconds. Your referral link baked in automatically.",icon:"M4 4h16v16H4zM4 9h16M9 4v16"},{title:"Lead Finder",desc:"Search-driven prospect lists with live contact details. Filter by sector, geography, and intent signals.",icon:"M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35"},{title:"SuperPages & Funnels",desc:"Drag-and-drop landing page builder. Eight templates, AI copy, free-form canvas, conversion tracking.",icon:"M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10"},{title:"SuperDeck",desc:"AI-powered slide presentations. Free-form drag canvas, eighteen typefaces, present mode, multilingual.",icon:"M3 3h18v12H3zM7 19h10M9 15v4M15 15v4"},{title:"MyLeads CRM",desc:"Lead capture, autoresponder with visual email timeline, AI-generated outreach. Native Brevo integration.",icon:"M2 3h20v14H2z M2 7l10 6 10-6"}].map(function(a){return e.jsxs("div",{className:"tool-card",children:[e.jsx("div",{className:"tool-icon",children:e.jsx("svg",{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("path",{d:a.icon})})}),e.jsx("h4",{children:a.title}),e.jsx("p",{children:a.desc})]},a.title)})})]})}),e.jsx("section",{className:"converge-section beat",children:e.jsxs("div",{className:"beat-inner converge-inner",children:[e.jsxs("div",{className:"beat-header",children:[e.jsx("div",{className:"beat-tag",children:"Section 04 — The earning"}),e.jsxs("h2",{className:"beat-h",children:["Four streams. One destination.",e.jsx("span",{className:"beat-h-accent",children:"Everything funnels back."})]}),e.jsx("p",{className:"beat-sub",children:"Most platforms ask you to stack disconnected income sources. SuperAdPro runs four streams off the same network — the activity that drives one feeds the others."})]}),e.jsxs("svg",{className:"converge-svg",viewBox:"0 0 900 480",preserveAspectRatio:"xMidYMid meet",children:[e.jsxs("defs",{children:[e.jsxs("linearGradient",{id:"streamGrad",x1:"0",y1:"0",x2:"1",y2:"0",children:[e.jsx("stop",{offset:"0",stopColor:"#22d3ee",stopOpacity:"0"}),e.jsx("stop",{offset:"0.5",stopColor:"#22d3ee",stopOpacity:"1"}),e.jsx("stop",{offset:"1",stopColor:"#0ea5e9",stopOpacity:"0.8"})]}),e.jsxs("radialGradient",{id:"hubGrad",cx:"50%",cy:"50%",r:"50%",children:[e.jsx("stop",{offset:"0",stopColor:"#ecfeff"}),e.jsx("stop",{offset:"0.4",stopColor:"#22d3ee"}),e.jsx("stop",{offset:"0.8",stopColor:"#0ea5e9"}),e.jsx("stop",{offset:"1",stopColor:"#0f172a",stopOpacity:"0"})]}),e.jsxs("filter",{id:"glow",x:"-50%",y:"-50%",width:"200%",height:"200%",children:[e.jsx("feGaussianBlur",{stdDeviation:"3",result:"blur"}),e.jsx("feComposite",{in:"SourceGraphic",in2:"blur",operator:"over"})]})]}),e.jsx("path",{className:"converge-stream-1",d:"M100 100 Q 450 100 450 240",fill:"none",stroke:"url(#streamGrad)",strokeWidth:"2",strokeDasharray:"1000",filter:"url(#glow)"}),e.jsx("path",{className:"converge-stream-2",d:"M800 100 Q 450 100 450 240",fill:"none",stroke:"url(#streamGrad)",strokeWidth:"2",strokeDasharray:"1000",filter:"url(#glow)"}),e.jsx("path",{className:"converge-stream-3",d:"M100 380 Q 450 380 450 240",fill:"none",stroke:"url(#streamGrad)",strokeWidth:"2",strokeDasharray:"1000",filter:"url(#glow)"}),e.jsx("path",{className:"converge-stream-4",d:"M800 380 Q 450 380 450 240",fill:"none",stroke:"url(#streamGrad)",strokeWidth:"2",strokeDasharray:"1000",filter:"url(#glow)"}),e.jsxs("g",{className:"converge-label-1",children:[e.jsx("circle",{cx:"100",cy:"100",r:"10",fill:"#22d3ee"}),e.jsx("text",{x:"100",y:"74",fontFamily:"JetBrains Mono,monospace",fontSize:"12",fontWeight:"700",fill:"#22d3ee",textAnchor:"middle",letterSpacing:"3",children:"01 MEMBERSHIP"})]}),e.jsxs("g",{className:"converge-label-2",children:[e.jsx("circle",{cx:"800",cy:"100",r:"10",fill:"#22d3ee"}),e.jsx("text",{x:"800",y:"74",fontFamily:"JetBrains Mono,monospace",fontSize:"12",fontWeight:"700",fill:"#22d3ee",textAnchor:"middle",letterSpacing:"3",children:"02 GRID"})]}),e.jsxs("g",{className:"converge-label-3",children:[e.jsx("circle",{cx:"100",cy:"380",r:"10",fill:"#22d3ee"}),e.jsx("text",{x:"100",y:"412",fontFamily:"JetBrains Mono,monospace",fontSize:"12",fontWeight:"700",fill:"#22d3ee",textAnchor:"middle",letterSpacing:"3",children:"03 NEXUS"})]}),e.jsxs("g",{className:"converge-label-4",children:[e.jsx("circle",{cx:"800",cy:"380",r:"10",fill:"#22d3ee"}),e.jsx("text",{x:"800",y:"412",fontFamily:"JetBrains Mono,monospace",fontSize:"12",fontWeight:"700",fill:"#22d3ee",textAnchor:"middle",letterSpacing:"3",children:"04 ACADEMY"})]}),e.jsxs("g",{className:"converge-hub",children:[e.jsx("circle",{cx:"450",cy:"240",r:"80",fill:"url(#hubGrad)",children:e.jsx("animate",{attributeName:"r",values:"80;92;80",dur:"3.5s",repeatCount:"indefinite"})}),e.jsx("circle",{cx:"450",cy:"240",r:"36",fill:"#22d3ee"}),e.jsx("text",{x:"450",y:"247",fontFamily:"Sora,sans-serif",fontSize:"18",fontWeight:"900",fill:"#fff",textAnchor:"middle",letterSpacing:"-0.5",children:"YOU"})]})]})]})}),e.jsx("section",{className:"founding-section beat",children:e.jsxs("div",{className:"beat-inner founding-inner",children:[e.jsxs("div",{className:"beat-header",children:[e.jsx("div",{className:"beat-tag",children:"Section 05 — The founding"}),e.jsxs("h2",{className:"beat-h",children:["A founding rate. Locked for life.",e.jsx("span",{className:"beat-h-accent",children:"Only one hundred members get it."})]})]}),e.jsx("div",{className:"founding-dots-grid",children:Array.from({length:100}).map(function(a,i){var o=i<100-n.foundingRemaining;return e.jsx("span",{className:"founding-dot "+(o?"lit":"dim")},i)})}),e.jsxs("div",{className:"founding-price",children:[e.jsx("div",{className:"founding-price-label",children:"// Founding Partner"}),e.jsx("span",{className:"founding-price-val",children:"$15"}),e.jsx("div",{className:"founding-price-foot",children:"/ month — locked for life"})]}),e.jsx("p",{className:"beat-sub",style:{maxWidth:560,margin:"24px auto 0"},children:"This price will not exist after spot 100. The standard membership is $20/month. The difference compounds over years."})]})}),e.jsx("section",{className:"portal-section beat",children:e.jsxs("div",{className:"beat-inner portal-inner",children:[e.jsxs("div",{className:"beat-header",children:[e.jsx("div",{className:"beat-tag",children:"Section 06 — The doorway"}),e.jsx("h2",{className:"portal-headline",children:"Step in."}),e.jsx("p",{className:"portal-sub portal-cta",children:"The Founding Partner spots are filling. The only way in is at the top of this page."})]}),e.jsx("div",{className:"portal-ctas",children:e.jsx("button",{type:"button",onClick:function(){window.scrollTo({top:0,behavior:"smooth"})},className:"portal-cta portal-cta-ghost portal-back-to-top",children:"↑ Back to the top"})}),e.jsx("div",{className:"portal-signoff portal-cta",children:"Made in the UK · Built for operators"}),e.jsxs("div",{className:"portal-disclaimer portal-cta",children:["Income depends on individual effort and many other factors. No earnings are guaranteed. See the ",e.jsx(x,{to:"/income-disclaimer",style:{color:"#22d3ee"},children:"full income disclaimer"}),"."]})]})})]})]})}var T=`
.start-page{font-family:'DM Sans',sans-serif;color:#fafbff;background:#050a1f;position:relative;overflow-x:hidden}
.start-page *{box-sizing:border-box}

/* ═══════════ HERO (Beat 1) ═══════════ */
.hero-section{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 32px 60px;overflow:hidden}
.hero-canvas-wrap{position:absolute;inset:0;z-index:1}
.hero-canvas-loading{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(14,165,233,.08),transparent 60%)}
.hero-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(5,10,31,.25) 75%,rgba(5,10,31,.55) 100%);pointer-events:none;z-index:4}

/* ── BackgroundVideo: poster + lazy video + dark overlay ── */
.bg-video-wrap{position:absolute;inset:0;z-index:1;overflow:hidden}
.bg-video-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1) brightness(.92)}
.bg-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.2s ease-out;filter:saturate(1) brightness(.92)}
.bg-video-loaded{opacity:1}
.bg-video-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,10,31,.15) 0%,rgba(5,10,31,.25) 55%,rgba(5,10,31,.55) 100%);pointer-events:none}

/* When layered with the constellation, dim the video a touch more
   so the network metaphor still reads above it — but nowhere near
   the gloom of the previous treatment */
.bgmode-both .bg-video-poster,
.bgmode-both .bg-video{filter:saturate(.92) brightness(.78)}
.bgmode-both .bg-video-overlay{background:linear-gradient(180deg,rgba(5,10,31,.25) 0%,rgba(5,10,31,.35) 55%,rgba(5,10,31,.65) 100%)}

/* When video-only, no constellation layer needs to be visible */
.bgmode-video canvas{display:none}
/* Constellation needs to render above the video when both are present;
   the canvas auto-positions to inset:0 via inline style */
.bgmode-both canvas{z-index:2;mix-blend-mode:screen;opacity:.85}
.hero-overlay{position:relative;z-index:5;max-width:1100px}

.hero-tag{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#22d3ee;letter-spacing:.26em;text-transform:uppercase;margin-bottom:32px;display:inline-flex;align-items:center;gap:14px}
.hero-tag::before,.hero-tag::after{content:'';width:36px;height:1px;background:#22d3ee;opacity:.6}

.hero-headline{font-family:'Sora',sans-serif;font-size:clamp(48px,7vw,108px);font-weight:900;line-height:.93;letter-spacing:-.05em;margin-bottom:24px;text-shadow:0 2px 24px rgba(5,10,31,.55), 0 1px 2px rgba(5,10,31,.4)}
.hero-headline-line2{display:block;margin-top:8px;font-weight:300;letter-spacing:-.03em;font-size:.62em;color:#a5f3fc;opacity:.85}
.hero-word{display:inline-block;opacity:0;will-change:transform,opacity}
.hero-word-bright{color:#22d3ee;text-shadow:0 0 40px rgba(6,182,212,.4)}

.hero-promise{margin:36px 0 22px;opacity:0}
.hero-promise-label{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(250,251,255,.45);font-weight:700;margin-bottom:10px}
.hero-promise-val{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(64px,8.5vw,124px);letter-spacing:-.06em;line-height:.85;background:linear-gradient(180deg,#ecfeff 0%,#22d3ee 38%,#0284c7 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 70px rgba(6,182,212,.55));display:inline-block;will-change:filter}
.hero-promise-sub{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(250,251,255,.55);font-weight:600;margin-top:12px}

.hero-sub{font-size:19px;line-height:1.55;color:rgba(250,251,255,.85);max-width:660px;margin:24px auto 56px;opacity:0;text-shadow:0 1px 12px rgba(5,10,31,.6)}

.hero-stats{display:flex;gap:64px;margin:0 auto 60px;justify-content:center;flex-wrap:wrap;width:100%;max-width:720px}
.hero-stat{text-align:left;opacity:0}
.hero-stat-num{font-family:'Sora',sans-serif;font-weight:900;font-size:38px;letter-spacing:-.03em;color:#22d3ee;line-height:1;text-shadow:0 0 28px rgba(6,182,212,.3);display:block;margin-bottom:6px}
.hero-stat-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(250,251,255,.42);font-weight:600}

/* ── Hero CTA row — sits between sub-headline and stats, the
   primary conversion surface above the fold ── */
.hero-cta-row{display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center;margin:8px auto 40px;width:100%;max-width:720px}
.hero-cta-primary{display:inline-flex;align-items:center;gap:14px;padding:22px 48px;border-radius:14px;font-family:'Sora',sans-serif;font-size:18px;font-weight:800;letter-spacing:.005em;text-decoration:none;background:linear-gradient(135deg,#06b6d4,#0ea5e9);color:#fff;box-shadow:0 8px 32px rgba(6,182,212,.45),inset 0 0 0 1px rgba(255,255,255,.22);transition:transform .25s ease-out;position:relative;overflow:hidden;will-change:transform,box-shadow;opacity:0}
.hero-cta-primary:hover{transform:translateY(-3px)}
.hero-cta-label{position:relative;z-index:2}
.hero-cta-arrow{position:relative;z-index:2;font-size:22px;transition:transform .25s}
.hero-cta-primary:hover .hero-cta-arrow{transform:translateX(4px)}
.hero-cta-shimmer{position:absolute;inset:0;background:linear-gradient(135deg,transparent,rgba(255,255,255,.3),transparent);transform:translateX(-100%);transition:transform .7s;z-index:1}
.hero-cta-primary:hover .hero-cta-shimmer{transform:translateX(100%)}
.hero-cta-ghost{display:inline-flex;align-items:center;gap:8px;padding:22px 32px;border-radius:14px;font-family:'Sora',sans-serif;font-size:15px;font-weight:600;text-decoration:none;background:rgba(250,251,255,.06);color:#fff;border:1px solid rgba(250,251,255,.16);backdrop-filter:blur(8px);transition:background .3s,border-color .3s;opacity:0}
.hero-cta-ghost:hover{background:rgba(250,251,255,.1);border-color:rgba(34,211,238,.4)}

.hero-scroll-cue{position:absolute;bottom:24px;left:0;right:0;text-align:center;z-index:5;font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(250,251,255,.5);letter-spacing:.22em;text-transform:uppercase;animation:scrollNudge 2.6s ease-in-out 3.8s infinite both}
@keyframes scrollNudge{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(8px);opacity:.95}}

/* ═══════════ BEAT SHARED STYLES ═══════════ */
.beat{position:relative;padding:140px 32px}
.beat-inner{max-width:1280px;margin:0 auto}

/* Centred section header wrapper used by beats 2-4. Beats 5 and 6
   were already centred via inline styles. Constrains text width for
   readability rather than letting the headline stretch the full
   1280px container. */
.beat-header{max-width:780px;margin:0 auto 64px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px}
.beat-tag{display:inline-flex;align-items:center;gap:14px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#22d3ee;letter-spacing:.22em;text-transform:uppercase;justify-content:center}
.beat-tag::before,.beat-tag::after{content:'';width:40px;height:1px;background:#22d3ee;opacity:.7}
.beat-h{font-family:'Sora',sans-serif;font-size:clamp(38px,5vw,72px);font-weight:900;line-height:1;letter-spacing:-.04em;margin:0}
.beat-h-accent{display:block;font-weight:300;letter-spacing:-.025em;opacity:.7;line-height:1.1;font-size:.6em;margin-top:8px;color:#a5f3fc}
.beat-sub{font-size:18px;line-height:1.6;color:rgba(250,251,255,.6);max-width:620px;margin:0}

/* Softer section transitions — fade-out at bottom of each beat and
   fade-in at top of the next, instead of a hard divider line. Adds
   atmospheric depth that makes the page feel continuous, like film. */
.beat::before{content:'';position:absolute;top:0;left:0;right:0;height:120px;background:linear-gradient(180deg,rgba(5,10,31,.6),transparent);pointer-events:none;z-index:1}
.beat::after{content:'';position:absolute;bottom:0;left:0;right:0;height:120px;background:linear-gradient(0deg,rgba(5,10,31,.6),transparent);pointer-events:none;z-index:1}
.beat > *{position:relative;z-index:2}
.sap-divider{display:none}  /* hard dividers replaced by gradient fades above */

/* ═══════════ BEAT 2 — FUSION ═══════════ */
.fusion-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:0;align-items:stretch;margin-top:64px}
.fusion-side{padding:48px;background:linear-gradient(180deg,rgba(23,37,84,.5),rgba(11,18,48,.3));border:1px solid rgba(250,251,255,.08);border-radius:24px;backdrop-filter:blur(12px)}
.fusion-side .side-tag{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#22d3ee;margin-bottom:18px;font-weight:700}
.fusion-side h3{font-family:'Sora',sans-serif;font-size:30px;font-weight:900;line-height:1;margin-bottom:16px;letter-spacing:-.03em}
.fusion-side p{font-size:15px;line-height:1.65;color:rgba(250,251,255,.6);margin-bottom:22px}
.fusion-side ul{list-style:none;padding:0;margin:0}
.fusion-side ul li{padding:10px 0;font-size:14px;color:rgba(250,251,255,.72);border-bottom:1px solid rgba(250,251,255,.06);display:flex;align-items:center;gap:12px}
.fusion-side ul li::before{content:'';width:6px;height:6px;background:#22d3ee;border-radius:50%;flex-shrink:0;box-shadow:0 0 8px rgba(6,182,212,.6)}

.fusion-seam-wrap{display:flex;align-items:center;justify-content:center;padding:0 32px;height:100%;min-width:120px}
.fusion-seam{width:88px;height:88px;border-radius:50%;background:radial-gradient(circle,#22d3ee 0%,#0ea5e9 50%,transparent 80%);box-shadow:0 0 80px rgba(6,182,212,.7);position:relative;will-change:transform,opacity}
.fusion-seam::before{content:'';position:absolute;inset:-24px;border-radius:50%;border:1px solid rgba(34,211,238,.4);animation:fusionRing 3.5s ease-in-out infinite}
.fusion-seam::after{content:'';position:absolute;inset:-50px;border-radius:50%;border:1px solid rgba(34,211,238,.15);animation:fusionRing 3.5s ease-in-out infinite .5s}
@keyframes fusionRing{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.4);opacity:.1}}

/* ═══════════ BEAT 3 — TOOLS ═══════════ */
.tools-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:60px}
.tool-card{padding:36px 30px;background:linear-gradient(180deg,rgba(23,37,84,.55),rgba(11,18,48,.4));border:1px solid rgba(250,251,255,.08);border-radius:20px;backdrop-filter:blur(12px);position:relative;overflow:hidden;transition:border-color .35s,transform .5s,box-shadow .5s;will-change:transform,opacity}
.tool-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#22d3ee,transparent);opacity:0;transition:opacity .4s}
.tool-card:hover{transform:translateY(-6px);border-color:rgba(34,211,238,.4);box-shadow:0 24px 60px rgba(6,182,212,.12)}
.tool-card:hover::before{opacity:1}
.tool-icon{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,rgba(6,182,212,.18),rgba(14,165,233,.08));display:flex;align-items:center;justify-content:center;margin-bottom:20px;border:1px solid rgba(34,211,238,.25)}
.tool-icon svg{width:26px;height:26px;color:#22d3ee}
.tool-card h4{font-family:'Sora',sans-serif;font-size:20px;font-weight:700;margin-bottom:10px;letter-spacing:-.01em}
.tool-card p{font-size:14px;line-height:1.6;color:rgba(250,251,255,.55)}

/* ═══════════ BEAT 4 — CONVERGENCE (PINNED) ═══════════ */
.converge-section{min-height:100vh;display:flex;align-items:center}
.converge-inner{width:100%}
.converge-svg{width:100%;max-width:1000px;margin:60px auto 0;display:block;height:auto;will-change:transform,opacity}

/* ═══════════ BEAT 5 — FOUNDING ═══════════ */
.founding-section{background:radial-gradient(ellipse 80% 60% at 50% 50%,rgba(15,20,50,.85),transparent 70%)}
.founding-inner{text-align:center;max-width:840px;margin:0 auto}
.founding-dots-grid{display:grid;grid-template-columns:repeat(20,1fr);gap:8px;margin:56px auto 64px;max-width:560px}
.founding-dot{width:100%;aspect-ratio:1;border-radius:50%;will-change:transform,opacity}
.founding-dot.lit{background:radial-gradient(circle,#22d3ee 0%,#0ea5e9 70%);box-shadow:0 0 10px rgba(6,182,212,.55);animation:dotBreath 4s ease-in-out infinite}
.founding-dot.dim{background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.12)}
.founding-dot.lit:nth-child(3n){animation-delay:.4s}
.founding-dot.lit:nth-child(5n){animation-delay:1.1s}
.founding-dot.lit:nth-child(7n){animation-delay:1.8s}
.founding-dot.lit:nth-child(11n){animation-delay:2.6s}
@keyframes dotBreath{0%,100%{opacity:.85;box-shadow:0 0 10px rgba(6,182,212,.55)}50%{opacity:1;box-shadow:0 0 18px rgba(6,182,212,.85)}}

.founding-price{margin:56px 0 32px;will-change:transform,opacity}
.founding-price-label{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(250,251,255,.55);margin-bottom:14px;font-weight:700}
.founding-price-val{font-family:'Sora',sans-serif;font-weight:900;font-size:clamp(80px,10vw,140px);letter-spacing:-.06em;line-height:.85;background:linear-gradient(180deg,#ecfeff 0%,#22d3ee 38%,#0284c7 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 80px rgba(6,182,212,.55));display:inline-block}
.founding-price-foot{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#22d3ee;margin-top:20px;font-weight:700}

/* ═══════════ BEAT 6 — PORTAL ═══════════ */
.portal-inner{text-align:center;max-width:760px;margin:0 auto}
.portal-headline{font-family:'Sora',sans-serif;font-size:clamp(56px,8vw,128px);font-weight:900;line-height:.9;letter-spacing:-.05em;margin-bottom:24px;background:linear-gradient(180deg,#fff 0%,#22d3ee 70%,#0ea5e9 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 60px rgba(6,182,212,.4));display:inline-block;will-change:transform,opacity}
.portal-sub{font-size:18px;line-height:1.55;color:rgba(250,251,255,.6);max-width:540px;margin:0 auto 56px}

.portal-ctas{display:inline-flex;gap:18px;flex-wrap:wrap;justify-content:center;margin-bottom:80px}
.portal-cta-primary{display:inline-flex;align-items:center;gap:10px;padding:22px 50px;border-radius:14px;font-family:'Sora',sans-serif;font-size:17px;font-weight:700;text-decoration:none;letter-spacing:.01em;background:linear-gradient(135deg,#06b6d4,#0ea5e9);color:#fff;box-shadow:0 8px 32px rgba(6,182,212,.45),inset 0 0 0 1px rgba(255,255,255,.25);transition:transform .25s, box-shadow .35s;position:relative;overflow:hidden}
.portal-cta-primary:hover{transform:translateY(-4px);box-shadow:0 16px 56px rgba(6,182,212,.6),inset 0 0 0 1px rgba(255,255,255,.25)}
.portal-shimmer{position:absolute;inset:0;background:linear-gradient(135deg,transparent,rgba(255,255,255,.3),transparent);transform:translateX(-100%);transition:transform .7s}
.portal-cta-primary:hover .portal-shimmer{transform:translateX(100%)}
.portal-cta-ghost{display:inline-flex;align-items:center;gap:10px;padding:22px 38px;border-radius:14px;font-family:'Sora',sans-serif;font-size:16px;font-weight:600;text-decoration:none;background:rgba(250,251,255,.05);color:#fff;border:1px solid rgba(250,251,255,.12);backdrop-filter:blur(8px);transition:background .35s,border-color .35s}
.portal-cta-ghost:hover{background:rgba(250,251,255,.1);border-color:rgba(34,211,238,.35)}
.portal-back-to-top{cursor:pointer;font-family:inherit}

.portal-signoff{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(250,251,255,.32);font-weight:600;margin-bottom:32px}
.portal-signoff::before,.portal-signoff::after{content:'';display:inline-block;width:36px;height:1px;background:rgba(250,251,255,.18);margin:0 14px;vertical-align:middle}
.portal-disclaimer{font-size:12px;color:rgba(250,251,255,.4);max-width:520px;margin:0 auto;line-height:1.7}

/* ═══════════ RESPONSIVE — mobile ═══════════ */
@media (max-width:768px){
  .hero-section{padding:64px 20px 48px;min-height:100svh}
  .hero-headline{font-size:clamp(36px,10vw,56px)}
  .hero-promise-val{font-size:clamp(48px,16vw,72px)}
  .hero-sub{font-size:16px;margin:20px auto 36px}
  .hero-stats{gap:28px;flex-wrap:wrap;justify-content:center}
  .hero-stat{text-align:center}
  .beat{padding:80px 20px}
  .beat-h{font-size:clamp(32px,7vw,48px)}
  .fusion-grid{grid-template-columns:1fr;gap:32px}
  .fusion-seam-wrap{padding:0;height:auto}
  .fusion-seam{width:64px;height:64px}
  .tools-grid{grid-template-columns:1fr;gap:14px}
  .tool-card{padding:28px 22px}
  .founding-dots-grid{grid-template-columns:repeat(10,1fr);max-width:340px;gap:6px}
  .founding-price-val{font-size:clamp(64px,18vw,96px)}
  .portal-headline{font-size:clamp(48px,12vw,80px)}
  .portal-cta-primary,.portal-cta-ghost{padding:18px 32px;font-size:15px}
  .converge-section{min-height:auto}
}
`;export{E as default};
