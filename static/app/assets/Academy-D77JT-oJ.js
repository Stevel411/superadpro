import{a8 as h,r as o,j as e}from"./vendor-uHY1p1JL.js";import{a as g,A as f}from"./index-DEfj6MTY.js";const m=`
.acad{max-width:1080px;margin:0 auto;padding:6px 4px 50px;font-family:Inter,system-ui,sans-serif;color:#0d1230}
.acad .hero{background:linear-gradient(135deg,#0a1f52,#12388f);border-radius:24px;padding:34px 36px;color:#fff;position:relative;overflow:hidden;margin-bottom:14px}
.acad .hero:after{content:"";position:absolute;right:-40px;top:-40px;width:220px;height:220px;border-radius:50%;background:rgba(240,165,42,.18)}
.acad .hero h1{font-size:32px;font-weight:900;letter-spacing:-1px;line-height:1.05;margin:0}
.acad .hero h1 b{color:#f0a52a}
.acad .hero p{margin:12px 0 0;font-size:15px;color:#c9d6f0;max-width:520px;font-weight:500;line-height:1.5}
.acad .stats{display:flex;gap:26px;margin-top:20px}
.acad .stats b{display:block;font-size:22px;font-weight:900}
.acad .stats span{font-size:11px;color:#a9bce0;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.acad .filters{display:flex;gap:8px;margin:20px 0 16px;flex-wrap:wrap}
.acad .chip{font-size:12.5px;font-weight:800;padding:8px 15px;border-radius:99px;border:1.5px solid #e6ecf5;background:#fff;color:#5a6584;cursor:pointer}
.acad .chip.on{background:#0a1f52;color:#fff;border-color:#0a1f52}
.acad .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
@media(max-width:820px){.acad .grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.acad .grid{grid-template-columns:1fr}}
.acad .course{background:#fff;border:1px solid #e6ecf5;border-radius:16px;overflow:hidden;box-shadow:0 14px 30px -24px rgba(10,31,82,.5);cursor:pointer;display:flex;flex-direction:column;transition:transform .12s,box-shadow .12s}
.acad .course:hover{transform:translateY(-3px);box-shadow:0 22px 40px -22px rgba(10,31,82,.55)}
.acad .thumb{height:120px;position:relative;display:grid;place-items:center}
.acad .thumb .cat{position:absolute;top:10px;left:10px;font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;background:rgba(255,255,255,.92);color:#0a1f52;padding:4px 9px;border-radius:6px}
.acad .thumb .play{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.92);display:grid;place-items:center;color:#c8102e;font-size:15px}
.acad .thumb .dur{position:absolute;bottom:10px;right:10px;font-size:10px;font-weight:800;background:rgba(13,18,48,.8);color:#fff;padding:3px 8px;border-radius:6px}
.acad .cbody{padding:14px 15px 16px;flex:1;display:flex;flex-direction:column}
.acad .cbody h3{font-size:15.5px;font-weight:800;letter-spacing:-.3px;line-height:1.25;color:#0a1f52;margin:0}
.acad .cbody .by{font-size:11.5px;color:#5a6584;font-weight:600;margin-top:4px}
.acad .cmeta{display:flex;align-items:center;gap:10px;margin-top:auto;padding-top:12px;font-size:11px;font-weight:700;color:#5a6584}
.acad .lvl{background:rgba(34,194,107,.14);color:#159a52;padding:2px 8px;border-radius:5px;font-weight:800}
.acad .pbar{height:5px;background:#e6ecf5;border-radius:99px;margin-top:11px;overflow:hidden}
.acad .pbar i{display:block;height:100%;background:linear-gradient(90deg,#12388f,#c8102e);border-radius:99px}
.acad .empty{background:#fff;border:1px solid #e6ecf5;border-radius:16px;padding:40px;text-align:center;color:#5a6584;font-weight:600}
`;function j(){const n=h(),[s,t]=o.useState(null),[i,c]=o.useState("All");o.useEffect(()=>{g("/api/al/academy").then(t).catch(()=>t({categories:[],courses:[]}))},[]);const r=s?s.courses:[],l=s?["All",...s.categories]:["All"],d=i==="All"?r:r.filter(a=>a.category===i),p=r.reduce((a,x)=>a+(x.lessons||0),0);return e.jsxs(f,{children:[e.jsx("style",{children:m}),e.jsxs("div",{className:"acad",children:[e.jsxs("div",{className:"hero",children:[e.jsxs("h1",{children:["AdvantageLife ",e.jsx("b",{children:"Academy"})]}),e.jsx("p",{children:"The exact playbook to grow your business — hand-picked lessons from the world's top marketers, put in the right order. Free with your membership."}),e.jsxs("div",{className:"stats",children:[e.jsxs("div",{children:[e.jsx("b",{children:r.length}),e.jsx("span",{children:"Courses"})]}),e.jsxs("div",{children:[e.jsx("b",{children:p}),e.jsx("span",{children:"Lessons"})]}),e.jsxs("div",{children:[e.jsx("b",{children:"100%"}),e.jsx("span",{children:"Free"})]})]})]}),e.jsx("div",{className:"filters",children:l.map(a=>e.jsx("span",{className:"chip"+(i===a?" on":""),onClick:()=>c(a),children:a},a))}),s?d.length===0?e.jsx("div",{className:"empty",children:"No courses here yet — check back soon."}):e.jsx("div",{className:"grid",children:d.map(a=>e.jsxs("div",{className:"course",onClick:()=>n("/academy/"+a.slug),children:[e.jsxs("div",{className:"thumb",style:{background:`linear-gradient(135deg,${a.cover_color||"#0a1f52"},${a.cover_color2||"#12388f"})`},children:[e.jsx("span",{className:"cat",children:a.category}),e.jsx("div",{className:"play",children:"▶"}),e.jsxs("span",{className:"dur",children:[a.lessons," lesson",a.lessons===1?"":"s"]})]}),e.jsxs("div",{className:"cbody",children:[e.jsx("h3",{children:a.title}),a.description?e.jsxs("div",{className:"by",children:[(a.description||"").slice(0,70),(a.description||"").length>70?"…":""]}):null,e.jsxs("div",{className:"cmeta",children:[e.jsx("span",{className:"lvl",children:a.level}),a.progress_pct>0?e.jsxs("span",{children:["· ",a.progress_pct,"% done"]}):null]}),e.jsx("div",{className:"pbar",children:e.jsx("i",{style:{width:(a.progress_pct||0)+"%"}})})]})]},a.slug))}):e.jsx("div",{className:"empty",children:"Loading courses…"})]})]})}export{j as default};
