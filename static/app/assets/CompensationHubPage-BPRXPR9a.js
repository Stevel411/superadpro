import{u as t,r as s,j as a,ae as r}from"./index-tjPFqZz4.js";function n(){var{t:e}=t();return s.useEffect(function(){window.scrollTo(0,0)},[]),a.jsxs("div",{className:"comp-hub-page",children:[a.jsx("style",{children:o}),a.jsxs("div",{className:"ambient-bg",children:[a.jsx("div",{className:"ambient-stars"}),a.jsx("div",{className:"ambient-wash"})]}),a.jsx("nav",{className:"stream-nav",children:a.jsx("div",{className:"stream-nav-inner",children:a.jsxs(r,{to:"/explore",className:"stream-back",children:[a.jsx("svg",{viewBox:"0 0 24 24",fill:"none",children:a.jsx("path",{d:"M19 12H5M12 19l-7-7 7-7",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"})}),e("compHub.backLink")]})})}),a.jsxs("section",{className:"hero",id:"sec-hero",children:[a.jsx("div",{className:"hero-pattern"}),a.jsx("div",{className:"hero-depth",id:"hero-particles"}),a.jsx("div",{className:"hero-mark",children:a.jsxs("svg",{viewBox:"0 0 24 24",fill:"none",children:[a.jsx("path",{d:"M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0",stroke:"#fff",strokeWidth:"2.2",strokeLinecap:"round",fill:"none"}),a.jsx("path",{d:"M3 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0",stroke:"#fff",strokeWidth:"2.2",strokeLinecap:"round",fill:"none",opacity:".65"}),a.jsx("path",{d:"M3 7c2-4 4-4 6 0s4 4 6 0 4-4 6 0",stroke:"#fff",strokeWidth:"2.2",strokeLinecap:"round",fill:"none",opacity:".45"})]})}),a.jsxs("h1",{className:"hero-h",children:[a.jsx("span",{className:"word w1",children:e("compHub.hero.word1")})," ",a.jsx("span",{className:"word w2",children:e("compHub.hero.word2")})," ",a.jsx("span",{className:"word w3",children:e("compHub.hero.word3")})]}),a.jsxs("div",{className:"hero-streams",id:"hero-streams",children:[a.jsxs(r,{to:"/membership",className:"hero-stream-card","data-c":"green","data-delay":"0",children:[a.jsx("div",{className:"hero-stream-num",children:e("compHub.streams.membershipNum")}),a.jsx("div",{className:"hero-stream-name",children:e("compHub.streams.membershipName")}),a.jsx("div",{className:"hero-stream-tag",children:e("compHub.streams.membershipTag")}),a.jsx("div",{className:"hero-stream-arrow",children:a.jsx("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",children:a.jsx("path",{d:"M5 12h14M13 5l7 7-7 7",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round"})})})]}),a.jsxs(r,{to:"/grid",className:"hero-stream-card","data-c":"indigo","data-delay":"1",children:[a.jsx("div",{className:"hero-stream-num",children:e("compHub.streams.gridNum")}),a.jsx("div",{className:"hero-stream-name",children:e("compHub.streams.gridName")}),a.jsx("div",{className:"hero-stream-tag",children:e("compHub.streams.gridTag")}),a.jsx("div",{className:"hero-stream-arrow",children:a.jsx("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",children:a.jsx("path",{d:"M5 12h14M13 5l7 7-7 7",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round"})})})]}),a.jsxs(r,{to:"/nexus",className:"hero-stream-card","data-c":"purple","data-delay":"2",children:[a.jsx("div",{className:"hero-stream-num",children:e("compHub.streams.nexusNum")}),a.jsx("div",{className:"hero-stream-name",children:e("compHub.streams.nexusName")}),a.jsx("div",{className:"hero-stream-tag",children:e("compHub.streams.nexusTag")}),a.jsx("div",{className:"hero-stream-arrow",children:a.jsx("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",children:a.jsx("path",{d:"M5 12h14M13 5l7 7-7 7",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round"})})})]}),a.jsxs("div",{className:"hero-stream-card coming-soon","data-c":"amber","data-delay":"3",children:[a.jsx("div",{className:"hero-stream-badge",children:e("compHub.streams.comingSoon")}),a.jsx("div",{className:"hero-stream-num",children:e("compHub.streams.coursesNum")}),a.jsx("div",{className:"hero-stream-name",children:e("compHub.streams.coursesName")}),a.jsx("div",{className:"hero-stream-tag",children:e("compHub.streams.coursesTag")})]})]})]})]})}var o=`
:root{
  --cobalt-deepest:#020617;
  --cobalt-deep:#050a1f;
  --cobalt:#0b1230;
  --cobalt-mid:#1a2558;
  --sky:#0ea5e9;
  --sky-bright:#38bdf8;
  --sky-pale:#7dd3fc;
  --indigo:#4f46e5;
  --indigo-soft:#818cf8;
  --purple:#9333ea;
  --purple-soft:#c084fc;
  --rose:#0ea5e9;
  --rose-bright:#38bdf8;
  --rose-pale:#7dd3fc;
  --rose-deep:#0369a1;
  --ink:#f8fafc;
  --ink-60:rgba(248,250,252,.72);
  --ink-40:rgba(248,250,252,.48);
  --ink-20:rgba(248,250,252,.22);
  --ink-10:rgba(248,250,252,.10);
}

/* Page shell */
.comp-hub-page{min-height:100vh;background:var(--cobalt-deepest);color:var(--ink);font-family:'DM Sans',sans-serif;position:relative;overflow-x:hidden}

/* Ambient background */
.ambient-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.ambient-stars{position:absolute;inset:0;background-image:
  radial-gradient(1px 1px at 20% 30%,#fff 0,transparent 50%),
  radial-gradient(1px 1px at 75% 70%,#fff 0,transparent 50%),
  radial-gradient(1px 1px at 10% 80%,#fff 0,transparent 50%),
  radial-gradient(1px 1px at 50% 50%,#fff 0,transparent 50%),
  radial-gradient(1px 1px at 90% 20%,#fff 0,transparent 50%);
  background-size:900px 900px,700px 700px,1100px 1100px,800px 800px,600px 600px;
  opacity:.4;animation:starDrift 240s linear infinite}
.ambient-wash{position:absolute;inset:0;background:
  radial-gradient(ellipse 70% 50% at 50% 0%,rgba(14,165,233,.18),transparent 60%),
  radial-gradient(ellipse 60% 40% at 10% 100%,rgba(79,70,229,.15),transparent 60%),
  radial-gradient(ellipse 60% 40% at 90% 100%,rgba(147,51,234,.12),transparent 60%)}
@keyframes starDrift{to{transform:translateY(-900px)}}

/* Back-link top-left */
.stream-nav{position:sticky;top:0;z-index:50;padding:24px 32px;backdrop-filter:blur(14px);background:linear-gradient(180deg,rgba(2,6,23,.7) 0%,rgba(2,6,23,0) 100%)}
.stream-nav-inner{max-width:1400px;margin:0 auto;display:flex;justify-content:flex-start}
.stream-back{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:100px;background:rgba(255,255,255,.04);border:1px solid var(--ink-10);font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--ink-60);text-decoration:none;transition:all .25s}
.stream-back:hover{background:rgba(255,255,255,.08);color:var(--ink);border-color:var(--ink-20)}
.stream-back svg{width:14px;height:14px;stroke-width:2}

/* Hero */
.hero{position:relative;min-height:auto;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:70px 48px 70px;z-index:2;overflow:hidden}
.hero-pattern{position:absolute;inset:0;pointer-events:none;opacity:.2;background-image:
  radial-gradient(circle at 20% 30%,rgba(56,189,248,.3),transparent 40%),
  radial-gradient(circle at 80% 70%,rgba(129,140,248,.3),transparent 40%)}
.hero-depth{position:absolute;inset:0;pointer-events:none}
.hero-depth .dp{position:absolute;border-radius:50%;pointer-events:none}

/* Glowing waveform icon */
.hero-mark{width:84px;height:84px;border-radius:22px;background:linear-gradient(135deg,var(--rose),var(--rose-deep) 60%,var(--purple));display:flex;align-items:center;justify-content:center;margin-bottom:28px;position:relative;animation:heroMarkRise 1.6s cubic-bezier(.2,.9,.3,1) both;box-shadow:0 0 80px rgba(14,165,233,.65),0 0 160px rgba(79,70,229,.35)}
.hero-mark::before{content:'';position:absolute;inset:-4px;border-radius:28px;background:linear-gradient(135deg,var(--rose),var(--rose-bright),var(--purple-soft));z-index:-1;opacity:.5;filter:blur(14px);animation:markPulse 4s ease-in-out infinite}
.hero-mark::after{content:'';position:absolute;inset:-18px;border-radius:44px;border:1px solid rgba(14,165,233,.25);animation:markRing 6s ease-in-out infinite}
.hero-mark svg{width:40px;height:40px;color:#fff}
@keyframes heroMarkRise{0%{opacity:0;transform:translateY(-20px) scale(.8)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes markPulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.75;transform:scale(1.04)}}
@keyframes markRing{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.08);opacity:.15}}

/* Headline */
.hero-h{font-family:'Sora',sans-serif;font-size:clamp(34px,4.5vw,64px);font-weight:900;line-height:.95;letter-spacing:-.04em;margin-bottom:16px;max-width:1200px}
.hero-h .word{display:inline-block;opacity:0;transform:translateY(20px)}
.hero-h .word.w1{animation:wordRiseBright .8s cubic-bezier(.2,.9,.3,1) .85s forwards}
.hero-h .word.w2{animation:wordRiseBright .8s cubic-bezier(.2,.9,.3,1) 1.0s forwards}
.hero-h .word.w3{animation:wordRiseBright .8s cubic-bezier(.2,.9,.3,1) 1.15s forwards}
@keyframes wordRiseBright{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}

/* Hero streams grid */
.hero-streams{
  margin:48px auto 32px;
  max-width:1080px;
  display:grid;grid-template-columns:repeat(2,1fr);gap:24px;
  padding:0 16px;
}
.hero-stream-card{
  position:relative;
  display:flex;flex-direction:column;gap:12px;
  padding:40px 36px 36px;border-radius:22px;
  background:linear-gradient(180deg,rgba(11,18,48,.72),rgba(11,18,48,.42));
  backdrop-filter:blur(18px);
  border:1px solid rgba(var(--c-rgb),.22);
  box-shadow:0 20px 60px rgba(0,0,0,.35),0 0 0 1px rgba(var(--c-rgb),.04),0 0 40px rgba(var(--c-rgb),.12);
  opacity:0;transform:translateY(24px) scale(.96);
  animation:streamFloat 1s cubic-bezier(.2,.9,.3,1) forwards;
  text-align:left;
  overflow:hidden;
}
.hero-stream-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--c-accent),transparent);
  opacity:.8;
}
.hero-stream-card[data-c="green"]{--c-accent:#34d399;--c-rgb:52,211,153}
.hero-stream-card[data-c="indigo"]{--c-accent:#818cf8;--c-rgb:129,140,248}
.hero-stream-card[data-c="purple"]{--c-accent:#c084fc;--c-rgb:192,132,252}
.hero-stream-card[data-c="amber"]{--c-accent:#fbbf24;--c-rgb:251,191,36}
.hero-stream-card[data-delay="0"]{animation-delay:1.4s}
.hero-stream-card[data-delay="1"]{animation-delay:1.7s}
.hero-stream-card[data-delay="2"]{animation-delay:2.0s}
.hero-stream-card[data-delay="3"]{animation-delay:2.3s}

.hero-stream-num{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:14px;letter-spacing:.14em;color:var(--c-accent);opacity:.75}
.hero-stream-name{font-family:'Sora',sans-serif;font-weight:900;font-size:42px;letter-spacing:-.03em;color:var(--c-accent);line-height:1;text-shadow:0 0 40px rgba(var(--c-rgb),.35)}
.hero-stream-tag{font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;color:var(--ink-60);line-height:1.4;letter-spacing:-.005em;margin-top:4px}

/* Link-card state */
a.hero-stream-card{text-decoration:none;color:inherit;cursor:pointer;transition:transform .35s cubic-bezier(.2,.9,.3,1),border-color .35s,box-shadow .35s}
.hero-stream-arrow{position:absolute;top:28px;right:28px;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(var(--c-rgb),.12);border:1px solid rgba(var(--c-rgb),.32);color:var(--c-accent);opacity:0;transform:translateX(-6px);transition:opacity .3s,transform .3s}
a.hero-stream-card:hover{transform:translateY(-4px);border-color:rgba(var(--c-rgb),.55);box-shadow:0 28px 70px rgba(0,0,0,.45),0 0 0 1px rgba(var(--c-rgb),.2),0 0 60px rgba(var(--c-rgb),.22)}
a.hero-stream-card:hover .hero-stream-arrow{opacity:1;transform:translateX(0)}

/* Coming-soon badge */
.hero-stream-badge{position:absolute;top:16px;right:16px;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:100px;background:rgba(var(--c-rgb),.15);border:1px solid rgba(var(--c-rgb),.4);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--c-accent)}

/* Coming-soon state — ends at 0.72 opacity via its own keyframes */
.hero-stream-card.coming-soon{cursor:default;animation-name:streamFloatSoon}
.hero-stream-card.coming-soon:hover{transform:none;border-color:rgba(var(--c-rgb),.22);box-shadow:0 20px 60px rgba(0,0,0,.35),0 0 0 1px rgba(var(--c-rgb),.04),0 0 40px rgba(var(--c-rgb),.12)}

@keyframes streamFloat{0%{opacity:0;transform:translateY(24px) scale(.96)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes streamFloatSoon{0%{opacity:0;transform:translateY(24px) scale(.96)}100%{opacity:.72;transform:translateY(0) scale(1)}}

/* Mobile */
@media (max-width: 900px){
  .hero{padding:48px 20px 60px}
  .hero-mark{width:72px;height:72px;margin-bottom:24px}
  .hero-mark svg{width:30px;height:30px}
  .hero-h{font-size:clamp(30px,7vw,44px);margin-bottom:12px}
  .hero-streams{margin:28px auto 20px;gap:14px;grid-template-columns:1fr;max-width:none;padding:0 4px}
  .hero-stream-card{padding:26px 22px 22px}
  .hero-stream-name{font-size:32px}
  .hero-stream-tag{font-size:13px}
  .hero-stream-arrow{top:22px;right:22px;width:30px;height:30px}
}
`;export{n as default};
