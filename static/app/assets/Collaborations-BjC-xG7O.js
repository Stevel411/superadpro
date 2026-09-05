import{r,j as e}from"./vendor-w_O3uhpf.js";import{a as f}from"./index-PZLf2UI0.js";const x=`
.col{background:#f1f5f9;min-height:100vh;font-family:Inter,system-ui,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased}
.col .top{background:#0a1f52;color:#fff;padding:34px 0 30px}
.col .wrap{max-width:1080px;margin:0 auto;padding:0 18px}
.col .bk{display:inline-block;font-size:12.5px;font-weight:800;color:#8fa8d8;text-decoration:none;margin-bottom:14px}
.col .bk:hover{color:#fff}
.col .kick{font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#f0a8b4}
.col h1{font-size:clamp(25px,3.6vw,34px);font-weight:900;letter-spacing:-.025em;margin-top:7px}
.col .sub{color:#b8c7e8;font-size:14.5px;margin-top:9px;max-width:600px;line-height:1.55}
.col .body{padding:22px 0 70px}
.col .ribbon{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:700;color:#0a1f52;background:#eaf0fb;border:1px solid #d3e0f7;border-radius:10px;padding:11px 15px}
.col .ribbon b{color:#12388f}
.col .discl{background:#fffbeb;border:1px solid #fcd9a8;border-left:4px solid #f59e0b;border-radius:10px;padding:13px 16px;margin-top:12px}
.col .discl b{display:block;font-size:11.5px;font-weight:900;color:#b45309;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em}
.col .discl p{font-size:12.5px;color:#8a5a1a;line-height:1.55}
.col .bar{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 4px}
.col .chip{background:#fff;border:1.5px solid #e2e8f0;border-radius:99px;padding:8px 15px;font-size:12.5px;font-weight:700;color:#64748b;cursor:pointer;font-family:inherit}
.col .chip.on{background:#0a1f52;border-color:#0a1f52;color:#fff}
.col .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:15px;align-items:stretch;margin-top:16px;max-width:100%}
.col .card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.col .card .cap{height:8px}
.col .card .in{padding:18px;display:flex;flex-direction:column;flex:1}
.col .card .logo{width:52px;height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px;color:#fff;margin-bottom:13px}
.col .card .cat{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#64748b}
.col .card h4{font-size:18px;font-weight:900;letter-spacing:-.01em;color:#0a1f52;margin-top:5px}
.col .card .bl{font-size:13.5px;color:#475569;line-height:1.55;margin-top:9px}
.col .card .take{background:#f6f8fc;border-left:3px solid #c8102e;border-radius:0 8px 8px 0;padding:10px 12px;margin-top:13px;font-size:13px;color:#334155;line-height:1.5;font-style:italic;flex:1}
.col .card .foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:15px}
.col .card .go{background:#c8102e;color:#fff;border:0;border-radius:9px;padding:11px 18px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;text-decoration:none}
.col .card .mine{font-size:11px;font-weight:700;color:#64748b;display:inline-flex;align-items:center;gap:5px}
.col .card .mine .d{width:7px;height:7px;border-radius:50%;background:#16a34a}
.col .empty{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:44px 26px;text-align:center;margin-top:16px}
.col .empty b{display:block;font-size:17px;font-weight:900;color:#0a1f52;margin-bottom:7px}
.col .empty p{font-size:14px;color:#64748b;line-height:1.6;max-width:400px;margin:0 auto}
.col .load{padding:50px 0;text-align:center;color:#64748b;font-weight:700}
.col .featured{display:flex;flex-direction:column;gap:15px;margin-top:16px}
.col .fcard{background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;display:grid;grid-template-columns:1.4fr 1fr}
.col .fcard .fimg{background:#081733 center/cover no-repeat;min-height:240px}
.col .fcard .fin{padding:22px;display:flex;flex-direction:column;justify-content:center}
@media(max-width:640px){.col .fcard{grid-template-columns:1fr}.col .fcard .fimg{min-height:160px}}
`;function h(){const[n,l]=r.useState([]),[t,d]=r.useState([]),[i,s]=r.useState("all"),[p,c]=r.useState(!0);r.useEffect(function(){f("/api/al/collaborations").then(function(a){l(a&&a.items||[]),d(a&&a.categories||[]),c(!1)}).catch(function(){l([]),c(!1)})},[]);var o=i==="all"?n:n.filter(function(a){return a.category===i});return e.jsxs("div",{className:"col",children:[e.jsx("style",{children:x}),e.jsx("div",{className:"top",children:e.jsxs("div",{className:"wrap",children:[e.jsx("a",{className:"bk",href:"/dashboard",children:"← Dashboard"}),e.jsx("div",{className:"kick",children:"Things I actually use"}),e.jsx("h1",{children:"My Vetted Extras"}),e.jsx("p",{className:"sub",children:"A short list of outside opportunities I’m personally in and rate. AdvantageLife is the main event — these are extras, not replacements."})]})}),e.jsx("div",{className:"body",children:e.jsxs("div",{className:"wrap",children:[e.jsxs("div",{className:"ribbon",children:[e.jsx("span",{children:"✓"}),e.jsxs("span",{children:["Every link here carries ",e.jsx("b",{children:"my referral"})," — I only add things I’m actually in."]})]}),e.jsxs("div",{className:"discl",children:[e.jsx("b",{children:"Before you click"}),e.jsx("p",{children:"These are independent platforms. They are not AdvantageLife, I don’t run them, and I can’t control what they do. Never risk money you can’t afford to lose, and do your own checks first."})]}),t.length>1&&e.jsxs("div",{className:"bar",children:[e.jsx("button",{className:"chip"+(i==="all"?" on":""),onClick:function(){s("all")},children:"All"}),t.map(function(a){return e.jsx("button",{className:"chip"+(i===a?" on":""),onClick:function(){s(a)},children:a},a)})]}),p?e.jsx("div",{className:"load",children:"Loading…"}):o.length===0?e.jsxs("div",{className:"empty",children:[e.jsx("b",{children:"Nothing here just yet"}),e.jsx("p",{children:"I add opportunities here as I find ones worth your time. Check back soon."})]}):e.jsxs(e.Fragment,{children:[o.filter(function(a){return a.image_url}).length>0&&e.jsx("div",{className:"featured",children:o.filter(function(a){return a.image_url}).map(function(a){return e.jsxs("div",{className:"fcard",children:[e.jsx("div",{className:"fimg",style:{backgroundImage:"url("+a.image_url+")"}}),e.jsxs("div",{className:"fin",children:[e.jsx("div",{className:"cat",children:a.category}),e.jsx("h4",{children:a.name}),e.jsx("div",{className:"bl",children:a.blurb}),a.take&&e.jsx("div",{className:"take",children:a.take}),e.jsxs("div",{className:"foot",children:[e.jsx("a",{className:"go",href:"/api/al/collaborations/go/"+a.id,target:"_blank",rel:"noopener noreferrer nofollow",children:"Check it out →"}),e.jsxs("span",{className:"mine",children:[e.jsx("span",{className:"d"})," My link"]})]})]})]},"f"+a.id)})}),o.filter(function(a){return!a.image_url}).length>0&&e.jsx("div",{className:"cards",children:o.filter(function(a){return!a.image_url}).map(function(a){return e.jsxs("div",{className:"card",children:[e.jsx("div",{className:"cap",style:{background:"linear-gradient(90deg,"+a.logo_from+","+a.logo_to+")"}}),e.jsxs("div",{className:"in",children:[e.jsx("div",{className:"logo",style:{background:"linear-gradient(135deg,"+a.logo_from+","+a.logo_to+")"},children:a.logo_text}),e.jsx("div",{className:"cat",children:a.category}),e.jsx("h4",{children:a.name}),e.jsx("div",{className:"bl",children:a.blurb}),a.take&&e.jsx("div",{className:"take",children:a.take}),e.jsxs("div",{className:"foot",children:[e.jsx("a",{className:"go",href:"/api/al/collaborations/go/"+a.id,target:"_blank",rel:"noopener noreferrer nofollow",children:"Check it out →"}),e.jsxs("span",{className:"mine",children:[e.jsx("span",{className:"d"})," My link"]})]})]})]},a.id)})})]})]})})]})}export{h as default};
