import{r as s,j as t}from"./vendor-CX9SWiUx.js";import{c as x}from"./index-V1TDdWa2.js";import"./vendor-charts-sutgcRna.js";const f=`
.al .dsp{max-width:760px;margin:0 auto;padding:4px 2px 40px}
.al .dsp .hero{margin-bottom:22px}
.al .dsp .eyebrow{font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#c8102e;margin-bottom:10px}
.al .dsp h1{font-weight:900;font-size:clamp(28px,4vw,40px);letter-spacing:-1.3px;line-height:1.05;color:#0a1f52;margin:0 0 8px}
.al .dsp .hp{font-size:15px;font-weight:600;color:#5a6584;line-height:1.55;max-width:560px}
.al .dsp .tcard{background:#fff;border-radius:22px;box-shadow:0 20px 46px -24px rgba(200,16,46,.32);border:1.5px solid #f7c1cb;padding:24px;margin-bottom:30px}
.al .dsp .th{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.al .dsp .theme{font-size:12px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#12388f;background:#eef1fb;padding:6px 12px;border-radius:20px}
.al .dsp .tag{margin-left:auto;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:#c8102e;padding:5px 11px;border-radius:20px}
.al .dsp .ptext{font-size:16.5px;font-weight:600;color:#0a1f52;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.al .dsp .btns{display:flex;gap:10px;margin-top:20px}
.al .dsp .cp{flex:1;background:#c8102e;color:#fff;border:none;border-radius:12px;padding:15px;font-weight:900;font-size:15px;cursor:pointer;transition:.16s;box-shadow:0 12px 26px -12px rgba(200,16,46,.6)}
.al .dsp .cp:hover{background:#b00d27}
.al .dsp .sh{background:#0a1f52;color:#fff;border:none;border-radius:12px;padding:15px 22px;font-weight:900;font-size:15px;cursor:pointer;transition:.16s}
.al .dsp .sh:hover{background:#0e2a6e}
.al .dsp .mh{font-size:13px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#8a97b8;margin:0 2px 14px}
.al .dsp .mcard{background:#fff;border-radius:16px;border:1.5px solid #eef1f8;padding:18px 20px;margin-bottom:12px;display:flex;align-items:flex-start;gap:16px}
.al .dsp .mcard .mbody{flex:1;min-width:0}
.al .dsp .mtheme{font-size:11px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#12388f;margin-bottom:6px}
.al .dsp .mtext{font-size:14px;font-weight:600;color:#3a4667;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.al .dsp .mcp{flex:none;background:#f3f5fb;color:#0a1f52;border:1.5px solid #e0e6f1;border-radius:10px;padding:10px 16px;font-weight:900;font-size:13px;cursor:pointer;transition:.16s}
.al .dsp .mcp:hover{background:#0a1f52;color:#fff;border-color:#0a1f52}
.al .dsp .tip{font-size:12px;font-weight:600;color:#8a97b8;margin:22px 2px 4px;line-height:1.55}
@media(max-width:560px){.al .dsp .mcard{flex-direction:column;gap:12px}.al .dsp .mcp{align-self:flex-start}}
`;function b(){const[a,p]=s.useState(null),[r,d]=s.useState([]),[i,n]=s.useState(null);s.useEffect(()=>{fetch("/api/al/sales-post/today").then(function(e){return e.json()}).then(function(e){e&&e.ok&&p(e)}).catch(function(){}),fetch("/api/al/sales-post/library").then(function(e){return e.json()}).then(function(e){e&&e.ok&&d(e.posts||[])}).catch(function(){})},[]);function o(e,c){try{navigator.clipboard.writeText(e),n(c),setTimeout(function(){n(null)},1800)}catch{}}function l(e){navigator.share?navigator.share({text:e}).catch(function(){}):o(e,"today")}return t.jsxs(x,{active:"marketing",children:[t.jsx("style",{children:f}),t.jsxs("div",{className:"dsp",children:[t.jsxs("div",{className:"hero",children:[t.jsx("div",{className:"eyebrow",children:"My Marketing · Daily Sales Post"}),t.jsx("h1",{children:"Today’s post is ready."}),t.jsx("p",{className:"hp",children:"A fresh message every day, with your Test Drive link already built in — and it shows a preview image when you post it. Tap copy, paste it wherever you like. That’s the whole job."})]}),a&&t.jsxs("div",{className:"tcard",children:[t.jsxs("div",{className:"th",children:[t.jsx("span",{className:"theme",children:a.theme}),t.jsx("span",{className:"tag",children:"Today"})]}),t.jsx("div",{className:"ptext",children:a.text}),t.jsxs("div",{className:"btns",children:[t.jsx("button",{className:"cp",onClick:function(){o(a.text,"today")},children:i==="today"?"Copied ✓":"Copy post"}),t.jsx("button",{className:"sh",onClick:function(){l(a.text)},children:"Share →"})]})]}),r.filter(function(e){return!e.is_today}).length>0&&t.jsxs("div",{children:[t.jsx("div",{className:"mh",children:"More you can post any time"}),r.filter(function(e){return!e.is_today}).map(function(e){return t.jsxs("div",{className:"mcard",children:[t.jsxs("div",{className:"mbody",children:[t.jsx("div",{className:"mtheme",children:e.theme}),t.jsx("div",{className:"mtext",children:e.text})]}),t.jsx("button",{className:"mcp",onClick:function(){o(e.text,e.index)},children:i===e.index?"Copied ✓":"Copy"})]},e.index)}),t.jsx("div",{className:"tip",children:"A new post lands here every day. Post whichever you like — and remember, sending real people to try it is what grows your team."})]})]})]})}export{b as default};
