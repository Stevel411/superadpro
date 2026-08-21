import{av as g,a8 as u,r as n,j as e}from"./vendor-uHY1p1JL.js";import{A as c,a as m,b}from"./index-CLk5OBcd.js";const w=`
.acD{max-width:1080px;margin:0 auto;padding:6px 4px 50px;font-family:Inter,system-ui,sans-serif;color:#0d1230}
.acD .back{font-size:13px;font-weight:800;color:#5a6584;cursor:pointer;display:inline-block;margin-bottom:12px}
.acD .player{background:#000;border-radius:18px 18px 0 0;overflow:hidden;aspect-ratio:16/9;width:100%}
.acD .player iframe{width:100%;height:100%;border:0;display:block}
.acD .now{background:#0a1f52;color:#fff;padding:16px 22px;border-radius:0 0 18px 18px;margin-bottom:22px}
.acD .now h2{font-size:18px;font-weight:800;margin:0}
.acD .now span{font-size:12px;color:#a9bce0;font-weight:600}
.acD .head{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:8px}
.acD .head .lbl{font-size:11px;font-weight:800;color:#c8102e;letter-spacing:.08em;text-transform:uppercase}
.acD .head h1{font-size:26px;font-weight:900;letter-spacing:-.6px;max-width:560px;line-height:1.1;margin:4px 0 0;color:#0a1f52}
.acD .head p{font-size:13.5px;color:#5a6584;margin:8px 0 0;max-width:560px;font-weight:500;line-height:1.5}
.acD .prog{min-width:180px}
.acD .prog .pct{font-size:26px;font-weight:900;color:#0a1f52}
.acD .prog .pl{font-size:10.5px;color:#5a6584;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.acD .prog .pbar{height:7px;background:#e6ecf5;border-radius:99px;margin-top:8px;overflow:hidden}
.acD .prog .pbar i{display:block;height:100%;background:linear-gradient(90deg,#12388f,#c8102e);border-radius:99px}
.acD .modh{font-size:12px;font-weight:900;color:#0a1f52;text-transform:uppercase;letter-spacing:.06em;padding:22px 0 8px}
.acD .lesson{display:flex;align-items:center;gap:14px;padding:12px 12px;border:1px solid #e6ecf5;border-radius:12px;margin-bottom:8px;cursor:pointer;background:#fff}
.acD .lesson.active{border-color:#c8102e;box-shadow:0 0 0 1px #c8102e}
.acD .lnum{width:30px;height:30px;border-radius:8px;flex:none;display:grid;place-items:center;font-size:12px;font-weight:900;border:0;cursor:pointer}
.acD .lnum.done{background:#22c26b;color:#fff}
.acD .lnum.todo{background:#eef2fa;color:#8a97b8}
.acD .lbody{flex:1;min-width:0}
.acD .lbody b{display:block;font-size:14px;font-weight:700;color:#0d1230}
.acD .lbody span{font-size:11.5px;color:#5a6584;font-weight:600}
.acD .ldur{font-size:11.5px;font-weight:800;color:#5a6584;flex:none}
.acD .foot{margin-top:24px;background:linear-gradient(135deg,rgba(240,165,42,.12),rgba(200,16,46,.06));border:1px solid rgba(240,165,42,.35);border-radius:14px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.acD .foot b{font-size:15px;font-weight:900;color:#0a1f52}
.acD .foot p{font-size:12.5px;color:#5a6584;font-weight:600;margin-top:2px}
.acD .foot a{background:#0a1f52;color:#fff;font-weight:900;font-size:13px;padding:11px 20px;border-radius:10px;text-decoration:none;white-space:nowrap;cursor:pointer}
`;function D(){const{slug:d}=g(),l=u(),[o,p]=n.useState(null),[r,x]=n.useState(null),f=()=>m("/api/al/academy/course/"+d).then(p).catch(()=>p({notfound:!0}));n.useEffect(()=>{f()},[d]),n.useEffect(()=>{if(o&&o.modules&&!r){let t=null,i=null;o.modules.forEach(a=>a.lessons.forEach(s=>{t||(t=s),!i&&!s.done&&(i=s)})),x(i||t)}},[o,r]);async function h(t,i){i&&i.stopPropagation();try{await b("/api/al/academy/lesson/"+t.id+"/complete",{}),await f()}catch{}}return o&&o.notfound?e.jsx(c,{children:e.jsx("div",{className:"acD",children:e.jsx("p",{children:"Course not found."})})}):o?e.jsxs(c,{children:[e.jsx("style",{children:w}),e.jsxs("div",{className:"acD",children:[e.jsx("span",{className:"back",onClick:()=>l("/academy"),children:"← Academy"}),r?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"player",children:e.jsx("iframe",{src:r.embed_url,title:r.title,allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",allowFullScreen:!0})}),e.jsxs("div",{className:"now",children:[e.jsx("h2",{children:r.title}),r.source_creator?e.jsxs("span",{children:["Source: ",r.source_creator]}):null]})]}):null,e.jsxs("div",{className:"head",children:[e.jsxs("div",{children:[e.jsx("span",{className:"lbl",children:o.category}),e.jsx("h1",{children:o.title}),o.description?e.jsx("p",{children:o.description}):null]}),e.jsxs("div",{className:"prog",children:[e.jsxs("div",{className:"pct",children:[o.progress_pct,"%"]}),e.jsxs("div",{className:"pl",children:["complete · ",o.completed,"/",o.total_lessons]}),e.jsx("div",{className:"pbar",children:e.jsx("i",{style:{width:o.progress_pct+"%"}})})]})]}),o.modules.map((t,i)=>e.jsxs("div",{children:[e.jsx("div",{className:"modh",children:t.title}),t.lessons.map(a=>e.jsxs("div",{className:"lesson"+(r&&r.id===a.id?" active":""),onClick:()=>x(a),children:[e.jsx("button",{className:"lnum "+(a.done?"done":"todo"),onClick:s=>h(a,s),title:a.done?"Mark not done":"Mark done",children:a.done?"✓":"▶"}),e.jsxs("div",{className:"lbody",children:[e.jsx("b",{children:a.title}),e.jsxs("span",{children:[a.takeaway,a.takeaway&&a.source_creator?" · ":"",a.source_creator]})]}),a.duration?e.jsx("div",{className:"ldur",children:a.duration}):null]},a.id))]},i)),e.jsxs("div",{className:"foot",children:[e.jsxs("div",{children:[e.jsx("b",{children:"Ready to put this to work?"}),e.jsx("p",{children:"You've got the theory — now launch a real campaign on AdvantageLife."})]}),e.jsx("a",{onClick:()=>l("/packs"),children:"Create your campaign →"})]})]})]}):e.jsx(c,{children:e.jsx("div",{className:"acD",children:"Loading…"})})}export{D as default};
