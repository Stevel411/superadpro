import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../../utils/api';
import {
  Type, Image, Square, Plus, Trash2, Copy, Save, ArrowLeft,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  Sparkles, ChevronDown, ChevronLeft, ChevronRight, Play, X,
  ArrowUp, ArrowDown, Upload, Loader2, Wand2, Minus, PlusCircle,
  Palette, Layers
} from 'lucide-react';

/* ── Themes (inline) ───────────────────────────────────── */
var THEMES = {
  midnight: { name:'Midnight', primary:'#0f172a', secondary:'#1e293b', accent:'#8b5cf6', text:'#f8fafc', muted:'#94a3b8', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  ocean:    { name:'Ocean', primary:'#0c4a6e', secondary:'#075985', accent:'#38bdf8', text:'#f0f9ff', muted:'#7dd3fc', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  forest:   { name:'Forest', primary:'#14532d', secondary:'#166534', accent:'#4ade80', text:'#f0fdf4', muted:'#86efac', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  coral:    { name:'Coral', primary:'#7f1d1d', secondary:'#991b1b', accent:'#fb923c', text:'#fff7ed', muted:'#fdba74', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  charcoal: { name:'Charcoal', primary:'#18181b', secondary:'#27272a', accent:'#fbbf24', text:'#fafafa', muted:'#a1a1aa', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  clean:    { name:'Clean White', primary:'#ffffff', secondary:'#f8fafc', accent:'#3b82f6', text:'#0f172a', muted:'#64748b', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  lavender: { name:'Lavender', primary:'#1e1b4b', secondary:'#312e81', accent:'#c4b5fd', text:'#ede9fe', muted:'#a78bfa', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  sunset:   { name:'Sunset', primary:'#431407', secondary:'#7c2d12', accent:'#f97316', text:'#fff7ed', muted:'#fb923c', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
};
var THEME_KEYS = Object.keys(THEMES);

/* ── Helpers ──────────────────────────────────────────── */
var UID = function () { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
var CANVAS_W = 1000;
var CANVAS_H = 562.5;
var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
var isLightBg = function (hex) {
  if (!hex) return false;
  var c = hex.replace('#', '');
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  var r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
};

var FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 80, 96];

export default function SuperDeckEditor() {
  var params = useParams(), deckId = params.deckId, nav = useNavigate();

  var [slides, setSlides] = useState([]);
  var [active, setActive] = useState(0);
  var [selId, setSelId] = useState(null);
  var [editingId, setEditingId] = useState(null);
  var [theme, setTheme] = useState('midnight');
  var [title, setTitle] = useState('');
  var [saving, setSaving] = useState(false);
  var [dirty, setDirty] = useState(false);
  var [loaded, setLoaded] = useState(false);
  var [presenting, setPresenting] = useState(false);
  var [showThemes, setShowThemes] = useState(false);
  var [showInsert, setShowInsert] = useState(false);
  var [aiPrompt, setAiPrompt] = useState('');
  var [aiLoading, setAiLoading] = useState(false);
  var [showAi, setShowAi] = useState(false);
  var canvasRef = useRef(null);
  var editRef = useRef(null);
  var thRef = useRef(null);
  var insRef = useRef(null);

  useEffect(function () {
    apiGet('/api/superdeck/' + deckId).then(function (d) {
      var s = d.slides || [];
      if (s.length === 0) s = [{ id: 's1', background: '', elements: [], notes: '' }];
      setSlides(s); setTheme(d.theme || 'midnight'); setTitle(d.title || ''); setLoaded(true);
    }).catch(function () { nav('/superdeck'); });
  }, [deckId]);

  var t = THEMES[theme] || THEMES.midnight;
  var cs = slides[active] || { elements: [], background: '', notes: '' };
  var selEl = selId ? cs.elements.find(function (e) { return e.id === selId; }) : null;

  function mark() { setDirty(true); }

  var save = useCallback(function () {
    setSaving(true);
    apiPost('/api/superdeck/' + deckId + '/save', { title: title, theme: theme, slides: slides })
      .then(function () { setSaving(false); setDirty(false); })
      .catch(function () { setSaving(false); });
  }, [deckId, title, theme, slides]);

  useEffect(function () { var iv = setInterval(function () { if (dirty) save(); }, 15000); return function () { clearInterval(iv); }; }, [dirty, save]);

  useEffect(function () {
    function h(e) {
      if (thRef.current && !thRef.current.contains(e.target)) setShowThemes(false);
      if (insRef.current && !insRef.current.contains(e.target)) setShowInsert(false);
    }
    document.addEventListener('mousedown', h); return function () { document.removeEventListener('mousedown', h); };
  }, []);

  /* ── Slide operations ──────────────────────────────── */
  function addSlide() {
    var ns = slides.slice();
    ns.splice(active + 1, 0, { id: 'sl_' + UID(), background: '', elements: [
      { id: UID(), type: 'heading', text: 'Slide title', fontSize: 36, color: t.text, bold: true, align: 'center', fontFamily: t.headingFont, x: 200, y: 200, w: 600, h: 80 },
      { id: UID(), type: 'text', text: 'Click to edit', fontSize: 18, color: t.muted, align: 'left', fontFamily: t.bodyFont, x: 250, y: 300, w: 500, h: 50 },
    ], notes: '' });
    setSlides(ns); setActive(active + 1); mark();
  }
  function dupSlide(i) { var ns = slides.slice(); ns.splice(i + 1, 0, JSON.parse(JSON.stringify(Object.assign({}, ns[i], { id: 'sl_' + UID() })))); setSlides(ns); setActive(i + 1); mark(); }
  function delSlide(i) { if (slides.length <= 1) return; var ns = slides.filter(function (_, j) { return j !== i; }); setSlides(ns); if (active >= ns.length) setActive(ns.length - 1); setSelId(null); mark(); }

  /* ── Element operations ────────────────────────────── */
  function addEl(type) {
    var el = { id: UID(), type: type, x: 150, y: 150, w: 400, h: 60 };
    if (type === 'heading') Object.assign(el, { text: 'Click to edit heading', fontSize: 36, color: isLightBg(cs.background || t.primary) ? '#0f172a' : '#ffffff', bold: true, align: 'center', fontFamily: t.headingFont, w: 600, h: 80, x: 200, y: 200 });
    else if (type === 'text') Object.assign(el, { text: 'Click to edit text', fontSize: 18, color: isLightBg(cs.background || t.primary) ? '#64748b' : '#94a3b8', align: 'left', fontFamily: t.bodyFont, w: 500, h: 50, x: 250, y: 300 });
    else if (type === 'image') Object.assign(el, { src: '', w: 300, h: 200, x: 350, y: 180 });
    else if (type === 'shape') Object.assign(el, { shapeType: 'rect', fill: t.accent, w: 200, h: 120, x: 400, y: 220 });
    var ns = slides.slice();
    ns[active] = Object.assign({}, ns[active], { elements: ns[active].elements.concat([el]) });
    setSlides(ns); setSelId(el.id); setShowInsert(false); mark();
  }

  function upd(id, u) {
    var ns = slides.slice();
    var s = Object.assign({}, ns[active]);
    s.elements = s.elements.map(function (e) { return e.id === id ? Object.assign({}, e, u) : e; });
    ns[active] = s; setSlides(ns); mark();
  }

  function delEl() {
    if (!selId) return;
    var ns = slides.slice();
    var s = Object.assign({}, ns[active]);
    s.elements = s.elements.filter(function (e) { return e.id !== selId; });
    ns[active] = s; setSlides(ns); setSelId(null); mark();
  }

  function moveElForward() {
    if (!selId) return; var ns = slides.slice(); var s = Object.assign({}, ns[active]); var els = s.elements.slice();
    var idx = els.findIndex(function (e) { return e.id === selId; });
    if (idx < 0 || idx >= els.length - 1) return;
    var tmp = els[idx]; els[idx] = els[idx + 1]; els[idx + 1] = tmp;
    s.elements = els; ns[active] = s; setSlides(ns); mark();
  }
  function moveElBackward() {
    if (!selId) return; var ns = slides.slice(); var s = Object.assign({}, ns[active]); var els = s.elements.slice();
    var idx = els.findIndex(function (e) { return e.id === selId; });
    if (idx <= 0) return;
    var tmp = els[idx]; els[idx] = els[idx - 1]; els[idx - 1] = tmp;
    s.elements = els; ns[active] = s; setSlides(ns); mark();
  }

  function updBg(c) { var ns = slides.slice(); ns[active] = Object.assign({}, ns[active], { background: c }); setSlides(ns); mark(); }

  /* ── Canvas: drag to move ─────────────────────────── */
  function onElMouseDown(e, elId) {
    e.stopPropagation(); setSelId(elId); setEditingId(null);
    var rect = canvasRef.current.getBoundingClientRect();
    var el = cs.elements.find(function (x) { return x.id === elId; }); if (!el) return;
    var scX = CANVAS_W / rect.width, scY = CANVAS_H / rect.height;
    var sx = e.clientX, sy = e.clientY, ox = el.x, oy = el.y;
    function mv(ev) { upd(elId, { x: clamp(Math.round(ox + (ev.clientX - sx) * scX), 0, CANVAS_W - 20), y: clamp(Math.round(oy + (ev.clientY - sy) * scY), 0, CANVAS_H - 20) }); }
    function up() { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  }

  /* ── Canvas: resize handles ───────────────────────── */
  function onResizeDown(e, elId, corner) {
    e.stopPropagation(); e.preventDefault();
    var rect = canvasRef.current.getBoundingClientRect();
    var el = cs.elements.find(function (x) { return x.id === elId; }); if (!el) return;
    var scX = CANVAS_W / rect.width, scY = CANVAS_H / rect.height;
    var sx = e.clientX, sy = e.clientY, ox = el.x, oy = el.y, ow = el.w, oh = el.h;
    function mv(ev) {
      var dx = (ev.clientX - sx) * scX, dy = (ev.clientY - sy) * scY, u = {};
      if (corner.includes('r')) u.w = Math.max(40, Math.round(ow + dx));
      if (corner.includes('l')) { u.x = Math.round(ox + dx); u.w = Math.max(40, Math.round(ow - dx)); }
      if (corner.includes('b')) u.h = Math.max(20, Math.round(oh + dy));
      if (corner.includes('t')) { u.y = Math.round(oy + dy); u.h = Math.max(20, Math.round(oh - dy)); }
      upd(elId, u);
    }
    function up() { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  }

  /* ── Inline text editing ──────────────────────────── */
  function startEdit(elId) { setEditingId(elId); setTimeout(function () { if (editRef.current) editRef.current.focus(); }, 50); }
  function finishEdit() { if (editRef.current && editingId) upd(editingId, { text: editRef.current.innerText }); setEditingId(null); }

  /* ── Image upload ─────────────────────────────────── */
  function uploadImage() {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      if (inp.files && inp.files[0]) {
        var fd = new FormData(); fd.append('file', inp.files[0]); fd.append('folder', 'superdeck');
        fetch('/api/superdeck/upload-image', { method: 'POST', body: fd, credentials: 'include' })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.url) { if (selEl && selEl.type === 'image') { upd(selId, { src: d.url }); } else { addEl('image'); setTimeout(function(){ var last = slides[active].elements[slides[active].elements.length-1]; if(last) upd(last.id, { src: d.url }); }, 100); } }
          });
      }
    }; inp.click();
  }

  /* ── AI Generate ──────────────────────────────────── */
  function generateAI() {
    if (!aiPrompt.trim() || aiLoading) return; setAiLoading(true);
    apiPost('/api/superdeck/ai-generate', { prompt: aiPrompt, slide_count: 8 }).then(function (r) {
      if (r.success && r.slides) {
        var newSlides = r.slides.map(function (s) {
          var bg = ''; var els = [];
          var h = s.heading || s.title || 'Slide';
          var body = s.body || s.subtitle || s.content || '';
          els.push({ id: UID(), type: 'heading', text: h, fontSize: 36, color: t.text, bold: true, align: 'center', fontFamily: t.headingFont, x: 100, y: 80, w: 800, h: 80 });
          if (body) els.push({ id: UID(), type: 'text', text: body, fontSize: 18, color: t.muted, align: 'left', fontFamily: t.bodyFont, x: 100, y: 200, w: 800, h: 200 });
          if (s.bullets) { var btext = s.bullets.map(function(b,i){return '\u2022 '+b;}).join('\n'); els.push({ id: UID(), type: 'text', text: btext, fontSize: 18, color: t.muted, align: 'left', fontFamily: t.bodyFont, x: 100, y: 200, w: 800, h: 250 }); }
          if (s.stats) { s.stats.forEach(function(st, i) { els.push({ id: UID(), type: 'heading', text: st.value, fontSize: 48, color: t.accent, bold: true, align: 'center', fontFamily: t.headingFont, x: 100 + i * 300, y: 200, w: 250, h: 70 }); els.push({ id: UID(), type: 'text', text: st.label, fontSize: 14, color: t.muted, align: 'center', fontFamily: t.bodyFont, x: 100 + i * 300, y: 280, w: 250, h: 30 }); }); }
          if (s.quote_text) { els = [{ id: UID(), type: 'heading', text: '\u201C' + s.quote_text + '\u201D', fontSize: 28, color: t.text, bold: false, italic: true, align: 'center', fontFamily: 'Georgia, serif', x: 100, y: 150, w: 800, h: 180 }]; if (s.attribution) els.push({ id: UID(), type: 'text', text: s.attribution, fontSize: 16, color: t.muted, align: 'center', fontFamily: t.bodyFont, x: 300, y: 380, w: 400, h: 30 }); }
          if (s.cta_text) els.push({ id: UID(), type: 'shape', shapeType: 'rect', fill: t.accent, x: 350, y: 400, w: 300, h: 60 });
          return { id: 'sl_' + UID(), background: bg, elements: els, notes: s.notes || '' };
        });
        setSlides(newSlides); setActive(0); setShowAi(false); setAiPrompt(''); mark();
      }
      setAiLoading(false);
    }).catch(function () { setAiLoading(false); });
  }

  /* ── Keyboard shortcuts ───────────────────────────── */
  useEffect(function () {
    function kd(e) {
      if (editingId) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selId) { e.preventDefault(); delEl(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); save(); }
      if (e.key === 'Escape') { if (presenting) setPresenting(false); else { setSelId(null); setEditingId(null); } }
      if (presenting) {
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setActive(function(a){return Math.min(a+1, slides.length-1);}); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); setActive(function(a){return Math.max(a-1, 0);}); }
      }
    }
    document.addEventListener('keydown', kd); return function () { document.removeEventListener('keydown', kd); };
  }, [selId, editingId, save, presenting, slides.length]);

  if (!loaded) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#0f172a'}}><Loader2 size={32} color="#8b5cf6" style={{animation:'spin 1s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;

  /* ── PRESENT MODE ──────────────────────────────────── */
  if (presenting) return (
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={function(){setActive(function(a){return Math.min(a+1,slides.length-1);});}}>
      <div style={{width:'100vw',height:'100vh',maxWidth:'177.78vh',maxHeight:'56.25vw',position:'relative'}}>
        <div style={{width:'100%',height:'100%',background:cs.background||t.primary,position:'relative'}}>
          {cs.elements.map(function(el){
            var pctX=(el.x/CANVAS_W)*100,pctY=(el.y/CANVAS_H)*100,pctW=(el.w/CANVAS_W)*100,pctH=(el.h/CANVAS_H)*100;
            return <div key={el.id} style={{position:'absolute',left:pctX+'%',top:pctY+'%',width:pctW+'%',height:pctH+'%'}}>
              {(el.type==='heading'||el.type==='text')&&<div style={{fontSize:el.fontSize*1.5+'px',fontWeight:el.bold?700:400,fontStyle:el.italic?'italic':'normal',textDecoration:el.underline?'underline':'none',color:el.color||'#fff',textAlign:el.align||'left',fontFamily:el.fontFamily||t.bodyFont,width:'100%',height:'100%',lineHeight:1.3,display:'flex',alignItems:el.type==='heading'?'center':'flex-start',justifyContent:el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start',whiteSpace:'pre-wrap'}}>{el.text||''}</div>}
              {el.type==='image'&&(el.src?<img src={el.src} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:4}} alt=""/>:<div/>)}
              {el.type==='shape'&&<div style={{width:'100%',height:'100%',background:el.fill||t.accent,borderRadius:el.shapeType==='circle'?'50%':4}}/>}
            </div>;
          })}
        </div>
      </div>
      <div style={{position:'fixed',bottom:20,right:20,background:'rgba(0,0,0,0.7)',borderRadius:8,padding:'6px 14px',display:'flex',alignItems:'center',gap:12}} onClick={function(e){e.stopPropagation();}}>
        <span style={{color:'#94a3b8',fontSize:13}}>{active+1}/{slides.length}</span>
        <button onClick={function(){setPresenting(false);}} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',display:'flex',padding:4}}><X size={16}/></button>
      </div>
    </div>
  );

  var btnS={background:'#334155',border:'none',color:'#e2e8f0',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:13,fontFamily:'inherit',padding:'7px 14px',borderRadius:6,fontWeight:600};
  var tbtn=function(active){return{background:active?'#ede9fe':'#fff',border:'1px solid '+(active?'#8b5cf6':'#e2e8f0'),borderRadius:4,padding:'5px 7px',cursor:'pointer',display:'flex',color:active?'#8b5cf6':'#64748b'};};

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#f8fafc',fontFamily:"'DM Sans',sans-serif"}}>

      {/* ── TOOLBAR ──────────────────────────────────── */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 20px',background:'linear-gradient(180deg,#172554,#1e3a8a)',borderBottom:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
        <button onClick={function(){if(dirty)save();nav('/superdeck');}} style={{...btnS,background:'none',color:'#94a3b8'}}
          onMouseEnter={function(e){e.currentTarget.style.background='#334155';}} onMouseLeave={function(e){e.currentTarget.style.background='none';}}>
          <ArrowLeft size={14}/> Back</button>
        <div style={{width:1,height:24,background:'#334155'}}/>
        <input value={title} onChange={function(e){setTitle(e.target.value);mark();}} style={{background:'transparent',border:'none',color:'#f8fafc',fontSize:16,fontWeight:700,fontFamily:"'Sora',sans-serif",outline:'none',padding:'4px 8px',flex:1,maxWidth:280}} placeholder="Untitled"/>
        <div style={{flex:1}}/>

        {/* Insert dropdown and Theme removed — elements are now in right sidebar */}

        <button onClick={function(){setShowAi(!showAi);}} style={{...btnS,background:'linear-gradient(135deg,#8b5cf6,#7c3aed)',color:'#fff',fontWeight:700}}>
          <Sparkles size={14}/> AI Generate</button>
        <button onClick={function(){if(dirty)save();setPresenting(true);}} style={{...btnS,background:'#059669',color:'#fff',fontWeight:700}}
          onMouseEnter={function(e){e.currentTarget.style.background='#047857';}} onMouseLeave={function(e){e.currentTarget.style.background='#059669';}}>
          <Play size={14}/> Present</button>
        <button onClick={save} disabled={saving} style={{background:'none',border:'none',color:dirty?'#fbbf24':'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12,fontFamily:'inherit',padding:'6px 8px'}}>
          <Save size={14}/> {saving?'Saving...':dirty?'Unsaved':'Saved'}</button>
      </div>

      {/* AI panel */}
      {showAi&&<div style={{padding:'16px 20px',background:'#1e1b4b',borderBottom:'1px solid #312e81',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <Wand2 size={20} color="#a78bfa"/>
        <input value={aiPrompt} onChange={function(e){setAiPrompt(e.target.value);}} onKeyDown={function(e){if(e.key==='Enter')generateAI();}}
          placeholder="Describe your presentation..." style={{flex:1,padding:'10px 16px',borderRadius:8,border:'1px solid #4c1d95',background:'#312e81',color:'#e2e8f0',fontSize:14,fontFamily:'inherit',outline:'none'}}/>
        <button onClick={generateAI} disabled={aiLoading} style={{padding:'10px 24px',borderRadius:8,border:'none',background:aiLoading?'#64748b':'#8b5cf6',color:'#fff',fontSize:14,fontWeight:700,cursor:aiLoading?'default':'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
          {aiLoading?<><Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> Generating...</>:<><Sparkles size={14}/> Generate</>}</button>
        <button onClick={function(){setShowAi(false);}} style={{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',padding:4,display:'flex'}}><X size={18}/></button>
      </div>}

      {/* ── MAIN AREA ──────────────────────────────────── */}
      <div style={{display:'flex',flex:1,minHeight:0}}>

        {/* LEFT: Thumbnails */}
        <div style={{width:210,borderRight:'1px solid #e2e8f0',background:'#fff',padding:'10px 6px',overflowY:'auto',flexShrink:0}}>
          {slides.map(function(s,i){var isA=i===active;return <div key={s.id||i} style={{marginBottom:6}}>
            <div style={{display:'flex',gap:4,alignItems:'flex-start'}}>
              <span style={{fontSize:11,color:'#94a3b8',width:16,textAlign:'right',paddingTop:4,flexShrink:0}}>{i+1}</span>
              <div style={{flex:1}}>
                <div onClick={function(){setActive(i);setSelId(null);setEditingId(null);}}
                  style={{borderRadius:4,border:isA?'2px solid #8b5cf6':'1px solid #e2e8f0',overflow:'hidden',cursor:'pointer'}}>
                  <div style={{aspectRatio:'16/9',background:s.background||t.primary,padding:4,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
                    {s.elements.slice(0,2).map(function(el,ei){
                      if(el.type==='heading')return <div key={ei} style={{fontSize:6,fontWeight:700,color:el.color||'#fff',textAlign:'center',overflow:'hidden',maxHeight:14}}>{(el.text||'').slice(0,25)}</div>;
                      if(el.type==='text')return <div key={ei} style={{fontSize:4,color:el.color||'#999',textAlign:'center',overflow:'hidden',maxHeight:8,marginTop:1}}>{(el.text||'').slice(0,35)}</div>;
                      return null;
                    })}
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',gap:4,padding:'3px 0'}}>
                  <button onClick={function(){dupSlide(i);}} title="Duplicate"
                    onMouseEnter={function(e){e.currentTarget.style.background='#ede9fe';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';}}
                    style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer',padding:4,borderRadius:4,display:'flex'}}><Copy size={16}/></button>
                  <button onClick={function(){delSlide(i);}} title="Delete"
                    onMouseEnter={function(e){e.currentTarget.style.background='#fee2e2';e.currentTarget.style.color='#dc2626';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#94a3b8';}}
                    style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer',padding:4,borderRadius:4,display:'flex'}}><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          </div>;})}
          <button onClick={addSlide}
            onMouseEnter={function(e){e.currentTarget.style.borderColor='#8b5cf6';e.currentTarget.style.color='#8b5cf6';}}
            onMouseLeave={function(e){e.currentTarget.style.borderColor='#cbd5e1';e.currentTarget.style.color='#94a3b8';}}
            style={{width:'100%',padding:'8px 0',border:'2px dashed #cbd5e1',borderRadius:4,background:'none',color:'#94a3b8',fontSize:12,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
            <Plus size={12}/> Add slide</button>
        </div>

        {/* CENTRE: Canvas */}
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#e2e8f0',padding:16,minWidth:0}}
          onClick={function(){if(editingId)finishEdit();setSelId(null);}}>
          <div ref={canvasRef} style={{width:'100%',maxWidth:1040,aspectRatio:'16/9',background:cs.background||t.primary,borderRadius:4,position:'relative',overflow:'hidden',boxShadow:'0 6px 30px rgba(0,0,0,.3)'}}>
            {cs.elements.map(function(el){
              var isSel=el.id===selId,isEdit=el.id===editingId;
              var pctX=(el.x/CANVAS_W)*100,pctY=(el.y/CANVAS_H)*100,pctW=(el.w/CANVAS_W)*100,pctH=(el.h/CANVAS_H)*100;
              return <div key={el.id}
                onMouseDown={function(e){if(!isEdit)onElMouseDown(e,el.id);}}
                onDoubleClick={function(e){e.stopPropagation();if(el.type==='heading'||el.type==='text')startEdit(el.id);else if(el.type==='image')uploadImage();}}
                onClick={function(e){e.stopPropagation();if(!isEdit)setSelId(el.id);}}
                style={{position:'absolute',left:pctX+'%',top:pctY+'%',width:pctW+'%',height:pctH+'%',cursor:isEdit?'text':'move',outline:isSel&&!isEdit?'2px solid #3b82f6':'none',borderRadius:2,boxSizing:'border-box',zIndex:isSel?10:1}}>
                {(el.type==='heading'||el.type==='text')&&(isEdit?
                  <div ref={editRef} contentEditable suppressContentEditableWarning onBlur={finishEdit} onKeyDown={function(e){if(e.key==='Escape')finishEdit();}}
                    style={{fontSize:Math.max(10,el.fontSize*0.65)+'px',fontWeight:el.bold?700:400,fontStyle:el.italic?'italic':'normal',textDecoration:el.underline?'underline':'none',color:el.color||'#fff',textAlign:el.align||'left',fontFamily:el.fontFamily||t.bodyFont,width:'100%',height:'100%',outline:'2px solid #8b5cf6',padding:'4px 6px',lineHeight:1.3,overflow:'hidden',background:'rgba(0,0,0,.15)',borderRadius:2,whiteSpace:'pre-wrap'}}>{el.text||''}</div>
                  :<div style={{fontSize:Math.max(10,el.fontSize*0.65)+'px',fontWeight:el.bold?700:400,fontStyle:el.italic?'italic':'normal',textDecoration:el.underline?'underline':'none',color:el.color||'#fff',textAlign:el.align||'left',fontFamily:el.fontFamily||t.bodyFont,width:'100%',height:'100%',overflow:'hidden',padding:'4px 6px',display:'flex',alignItems:el.type==='heading'?'center':'flex-start',justifyContent:el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start',lineHeight:1.3,userSelect:'none',whiteSpace:'pre-wrap'}}>{el.text||''}</div>
                )}
                {el.type==='image'&&(el.src?<img src={el.src} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:4,pointerEvents:'none'}} alt=""/>
                  :<div style={{width:'100%',height:'100%',background:'rgba(255,255,255,.05)',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',border:'1px dashed rgba(255,255,255,.2)'}}><Image size={24} color="#475569"/></div>)}
                {el.type==='shape'&&<div style={{width:'100%',height:'100%',background:el.fill||t.accent,borderRadius:el.shapeType==='circle'?'50%':4}}/>}
                {isSel&&!isEdit&&<>
                  {['tl','t','tr','r','br','b','bl','l'].map(function(c){
                    var hs={position:'absolute',width:10,height:10,background:'#3b82f6',borderRadius:2,zIndex:20};
                    var cursors={tl:'nwse-resize',t:'ns-resize',tr:'nesw-resize',r:'ew-resize',br:'nwse-resize',b:'ns-resize',bl:'nesw-resize',l:'ew-resize'};
                    hs.cursor=cursors[c];
                    if(c.includes('t'))hs.top=-5;if(c.includes('b'))hs.bottom=-5;if(c.includes('l'))hs.left=-5;if(c.includes('r'))hs.right=-5;
                    if(c==='t'||c==='b'){hs.left='50%';hs.transform='translateX(-50%)';}
                    if(c==='l'||c==='r'){hs.top='50%';hs.transform='translateY(-50%)';}
                    return <div key={c} onMouseDown={function(e){onResizeDown(e,el.id,c);}} style={hs}/>;
                  })}
                  <div style={{position:'absolute',top:-34,left:'50%',transform:'translateX(-50%)',display:'flex',gap:2,background:'#1e293b',borderRadius:6,padding:'3px 4px',boxShadow:'0 4px 12px rgba(0,0,0,0.3)',zIndex:30}} onClick={function(e){e.stopPropagation();}}>
                    <button onClick={function(e){e.stopPropagation();moveElBackward();}} title="Send back" style={{background:'transparent',border:'none',color:'#cbd5e1',cursor:'pointer',padding:'4px 6px',borderRadius:4,display:'flex'}}><ArrowDown size={14}/></button>
                    <button onClick={function(e){e.stopPropagation();moveElForward();}} title="Bring forward" style={{background:'transparent',border:'none',color:'#cbd5e1',cursor:'pointer',padding:'4px 6px',borderRadius:4,display:'flex'}}><ArrowUp size={14}/></button>
                    <div style={{width:1,height:20,background:'#475569',margin:'0 2px'}}/>
                    <button onClick={function(e){e.stopPropagation();delEl();}} title="Delete" style={{background:'transparent',border:'none',color:'#f87171',cursor:'pointer',padding:'4px 6px',borderRadius:4,display:'flex'}}><Trash2 size={14}/></button>
                  </div>
                </>}
              </div>;
            })}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16,marginTop:12}}>
            <button onClick={function(){setActive(Math.max(0,active-1));}} disabled={active===0} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 10px',cursor:active>0?'pointer':'default',color:active>0?'#334155':'#cbd5e1',display:'flex'}}><ChevronLeft size={16}/></button>
            <span style={{fontSize:13,color:'#64748b',fontWeight:600}}>Slide {active+1} of {slides.length}</span>
            <button onClick={function(){setActive(Math.min(slides.length-1,active+1));}} disabled={active>=slides.length-1} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 10px',cursor:active<slides.length-1?'pointer':'default',color:active<slides.length-1?'#334155':'#cbd5e1',display:'flex'}}><ChevronRight size={16}/></button>
          </div>
          <div style={{width:'100%',maxWidth:1040,marginTop:8}}>
            <textarea value={cs.notes||''} onChange={function(e){var ns=slides.slice();ns[active]=Object.assign({},ns[active],{notes:e.target.value});setSlides(ns);mark();}} placeholder="Speaker notes..." rows={2}
              style={{width:'100%',padding:'8px 12px',background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,color:'#475569',fontSize:12,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box',outline:'none'}}/>
          </div>
        </div>

        {/* RIGHT: Properties */}
        <div style={{width:270,borderLeft:'1px solid #e2e8f0',background:'#fff',padding:14,overflowY:'auto',flexShrink:0}}>
          {selEl?<>
            <div style={{fontSize:12,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Element Properties</div>

            {(selEl.type==='heading'||selEl.type==='text')&&<>
              <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>Font</div>
              <select value={(selEl.fontFamily||'').split(',')[0].replace(/'/g,'').trim()||'Sora'} onChange={function(e){upd(selId,{fontFamily:"'"+e.target.value+"',sans-serif"});}}
                onMouseEnter={function(e){e.currentTarget.style.borderColor='#8b5cf6';e.currentTarget.style.background='#ede9fe';}}
                onMouseLeave={function(e){e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.background='#fff';}}
                style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:13,fontWeight:600,color:'#0f172a',background:'#fff',fontFamily:'inherit',cursor:'pointer',marginBottom:8,transition:'all 0.15s',appearance:'none',backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',backgroundRepeat:'no-repeat',backgroundPosition:'right 10px center',paddingRight:28}}>
                {['Sora','DM Sans','Inter','Poppins','Montserrat','Playfair Display','Roboto','Open Sans','Lato','Oswald','Raleway','Merriweather','Georgia','Arial','Trebuchet MS','Verdana','Courier New','Impact'].map(function(f){return <option key={f} value={f} style={{fontFamily:f}}>{f}</option>;})}</select>

              <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>Size</div>
              <select value={selEl.fontSize||18} onChange={function(e){upd(selId,{fontSize:parseInt(e.target.value)});}}
                onMouseEnter={function(e){e.currentTarget.style.borderColor='#8b5cf6';e.currentTarget.style.background='#ede9fe';}}
                onMouseLeave={function(e){e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.background='#fff';}}
                style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:13,fontWeight:600,color:'#0f172a',background:'#fff',fontFamily:'inherit',cursor:'pointer',marginBottom:8,transition:'all 0.15s',appearance:'none',backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',backgroundRepeat:'no-repeat',backgroundPosition:'right 10px center',paddingRight:28}}>
                {FONT_SIZES.map(function(s){return <option key={s} value={s}>{s}px</option>;})}</select>

              <div style={{display:'flex',gap:3,marginBottom:8}}>
                <button onClick={function(){upd(selId,{bold:!selEl.bold});}} style={tbtn(selEl.bold)}><Bold size={14}/></button>
                <button onClick={function(){upd(selId,{italic:!selEl.italic});}} style={tbtn(selEl.italic)}><Italic size={14}/></button>
                <button onClick={function(){upd(selId,{underline:!selEl.underline});}} style={tbtn(selEl.underline)}><Underline size={14}/></button>
                <div style={{width:1,background:'#e2e8f0',margin:'0 2px'}}/>
                {['left','center','right'].map(function(a){return <button key={a} onClick={function(){upd(selId,{align:a});}} style={tbtn((selEl.align||'left')===a)}>
                  {a==='left'?<AlignLeft size={14}/>:a==='center'?<AlignCenter size={14}/>:<AlignRight size={14}/>}</button>;})}
              </div>

              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <div><div style={{fontSize:11,color:'#64748b',marginBottom:2}}>Text colour</div>
                  <input type="color" value={selEl.color||'#ffffff'} onChange={function(e){upd(selId,{color:e.target.value});}} style={{width:36,height:30,border:'2px solid #e2e8f0',borderRadius:6,cursor:'pointer',padding:1}}/></div>
                <div><div style={{fontSize:11,color:'#64748b',marginBottom:2}}>Background</div>
                  <input type="color" value={selEl.background||'#00000000'} onChange={function(e){upd(selId,{background:e.target.value});}} style={{width:36,height:30,border:'2px solid #e2e8f0',borderRadius:6,cursor:'pointer',padding:1}}/></div>
              </div>
            </>}

            {selEl.type==='shape'&&<>
              <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>Fill colour</div>
              <input type="color" value={selEl.fill||t.accent} onChange={function(e){upd(selId,{fill:e.target.value});}} style={{width:'100%',height:36,border:'2px solid #e2e8f0',borderRadius:6,cursor:'pointer',padding:1,marginBottom:8}}/>
              <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>Shape</div>
              <div style={{display:'flex',gap:4,marginBottom:8}}>
                <button onClick={function(){upd(selId,{shapeType:'rect'});}} style={tbtn(selEl.shapeType!=='circle')}>Rect</button>
                <button onClick={function(){upd(selId,{shapeType:'circle'});}} style={tbtn(selEl.shapeType==='circle')}>Circle</button>
              </div>
            </>}

            {selEl.type==='image'&&<>
              <button onClick={function(){
                var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
                inp.onchange=function(){if(inp.files&&inp.files[0]){
                  var fd=new FormData();fd.append('file',inp.files[0]);fd.append('folder','superdeck');
                  fetch('/api/superdeck/upload-image',{method:'POST',body:fd,credentials:'include'})
                    .then(function(r){return r.json();}).then(function(d){if(d.url)upd(selId,{src:d.url});});
                }};inp.click();
              }}
                onMouseEnter={function(e){e.currentTarget.style.background='#ede9fe';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
                style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:8}}>
                <Upload size={13} color="#8b5cf6"/> Upload / Replace image</button>
            </>}

            <div style={{borderTop:'1px solid #e2e8f0',paddingTop:8,marginTop:4}}>
              <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>Position & Size</div>
              <div style={{display:'flex',gap:4,marginBottom:8}}>
                <div style={{flex:1}}><div style={{fontSize:10,color:'#94a3b8'}}>X</div><input type="number" value={selEl.x} onChange={function(e){upd(selId,{x:parseInt(e.target.value)||0});}} style={{width:'100%',padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,fontSize:12,boxSizing:'border-box'}}/></div>
                <div style={{flex:1}}><div style={{fontSize:10,color:'#94a3b8'}}>Y</div><input type="number" value={selEl.y} onChange={function(e){upd(selId,{y:parseInt(e.target.value)||0});}} style={{width:'100%',padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,fontSize:12,boxSizing:'border-box'}}/></div>
                <div style={{flex:1}}><div style={{fontSize:10,color:'#94a3b8'}}>W</div><input type="number" value={selEl.w} onChange={function(e){upd(selId,{w:Math.max(20,parseInt(e.target.value)||40)});}} style={{width:'100%',padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,fontSize:12,boxSizing:'border-box'}}/></div>
                <div style={{flex:1}}><div style={{fontSize:10,color:'#94a3b8'}}>H</div><input type="number" value={selEl.h} onChange={function(e){upd(selId,{h:Math.max(10,parseInt(e.target.value)||20)});}} style={{width:'100%',padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,fontSize:12,boxSizing:'border-box'}}/></div>
              </div>
              <button onClick={delEl} style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                <Trash2 size={13}/> Delete element</button>
            </div>
          </>:<>
            {/* No element selected — show insert elements + slide design */}
            <div style={{fontSize:12,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Add Elements</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:16}}>
              {[{t:'heading',n:'Heading',i:Type,c:'#8b5cf6'},{t:'text',n:'Text Box',i:Type,c:'#0ea5e9'},{t:'image',n:'Image',i:Image,c:'#22c55e'},{t:'shape',n:'Shape',i:Square,c:'#f59e0b'}].map(function(it){
                return <button key={it.t} onClick={function(){addEl(it.t);}}
                  onMouseEnter={function(e){e.currentTarget.style.background='#ede9fe';e.currentTarget.style.borderColor='#8b5cf6';}}
                  onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderColor='#e2e8f0';}}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'12px 8px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'#f8fafc',cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}>
                  <it.i size={20} color={it.c}/>
                  <span style={{fontSize:11,fontWeight:600,color:'#334155'}}>{it.n}</span>
                </button>;
              })}
            </div>

            <div style={{fontSize:12,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>Slide Design</div>
            <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>Background</div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <input type="color" value={cs.background||t.primary} onChange={function(e){updBg(e.target.value);}} style={{width:36,height:36,border:'2px solid #e2e8f0',borderRadius:6,cursor:'pointer',padding:1}}/>
              <span style={{fontSize:12,color:'#64748b',fontFamily:'monospace'}}>{cs.background||t.primary}</span>
            </div>

            <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>Layers</div>
            {cs.elements.map(function(el){var isSel=el.id===selId;var label=el.type==='heading'?'H: '+(el.text||'').slice(0,16):el.type==='text'?'T: '+(el.text||'').slice(0,16):el.type==='image'?'Image':el.type==='shape'?'Shape':'?';
              return <div key={el.id} onClick={function(e){e.stopPropagation();setSelId(el.id);}}
                onMouseEnter={function(e){e.currentTarget.style.background='#f8fafc';}} onMouseLeave={function(e){e.currentTarget.style.background=isSel?'#ede9fe':'transparent';}}
                style={{padding:'6px 8px',borderRadius:4,marginBottom:2,cursor:'pointer',fontSize:12,color:isSel?'#8b5cf6':'#334155',background:isSel?'#ede9fe':'transparent',border:isSel?'1px solid #c4b5fd':'1px solid transparent',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span>{label}</span>
              </div>;
            })}
            {cs.elements.length===0&&<div style={{fontSize:11,color:'#94a3b8',fontStyle:'italic',marginBottom:8}}>Click an element above to add it to the slide</div>}
            <div style={{borderTop:'1px solid #e2e8f0',paddingTop:8,marginTop:8}}>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <button onClick={function(){dupSlide(active);}}
                  onMouseEnter={function(e){e.currentTarget.style.background='#f3f0ff';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
                  style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'7px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                  <Copy size={12} color="#8b5cf6"/> Duplicate slide</button>
                <button onClick={function(){delSlide(active);}}
                  onMouseEnter={function(e){e.currentTarget.style.background='#fee2e2';}} onMouseLeave={function(e){e.currentTarget.style.background='#f8fafc';}}
                  style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'7px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                  <Trash2 size={12} color="#dc2626"/> Delete slide</button>
              </div>
            </div>
          </>}
        </div>
      </div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
