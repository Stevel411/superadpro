import { useTranslation } from 'react-i18next';
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
  midnight: { name:'Midnight', primary:'var(--sap-text-primary)', secondary:'var(--sap-text-primary)', accent:'var(--sap-purple)', text:'var(--sap-bg-elevated)', muted:'var(--sap-text-faint)', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  ocean:    { name:'Ocean', primary:'#0c4a6e', secondary:'#075985', accent:'var(--sap-accent-light)', text:'#f0f9ff', muted:'#7dd3fc', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  forest:   { name:'Forest', primary:'#14532d', secondary:'#166534', accent:'#4ade80', text:'var(--sap-green-bg)', muted:'#86efac', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  coral:    { name:'Coral', primary:'#7f1d1d', secondary:'#991b1b', accent:'#fb923c', text:'#fff7ed', muted:'#fdba74', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  charcoal: { name:'Charcoal', primary:'#18181b', secondary:'#27272a', accent:'var(--sap-amber-bright)', text:'#fafafa', muted:'#a1a1aa', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  clean:    { name:'Clean White', primary:'#ffffff', secondary:'var(--sap-bg-elevated)', accent:'#3b82f6', text:'var(--sap-text-primary)', muted:'var(--sap-text-muted)', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
  lavender: { name:'Lavender', primary:'var(--sap-cobalt-deep)', secondary:'#312e81', accent:'#c4b5fd', text:'var(--sap-purple-pale)', muted:'var(--sap-purple-light)', headingFont:"'Sora',sans-serif", bodyFont:"'DM Sans',sans-serif" },
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

var SHAPE_TYPES = [
  { id: 'rect', name: 'Rectangle' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'circle', name: 'Circle' },
  { id: 'triangle', name: 'Triangle' },
  { id: 'diamond', name: 'Diamond' },
  { id: 'arrow', name: 'Arrow' },
  { id: 'star', name: 'Star' },
  { id: 'hexagon', name: 'Hexagon' },
  { id: 'line', name: 'Line' },
  { id: 'bubble', name: 'Bubble' },
];

function ShapeRender(props) {
  var fill = props.fill || 'var(--sap-purple)';
  var type = props.shapeType || 'rect';
  var w = '100%', h = '100%';
  if (type === 'rect') return <div style={{width:w,height:h,background:fill,borderRadius:4}}/>;
  if (type === 'rounded') return <div style={{width:w,height:h,background:fill,borderRadius:16}}/>;
  if (type === 'circle') return <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{width:w,height:h,display:'block'}}><circle cx="50" cy="50" r="48" fill={fill}/></svg>;  if (type === 'line') return <div style={{width:w,height:'100%',display:'flex',alignItems:'center'}}><div style={{width:'100%',height:4,background:fill,borderRadius:2}}/></div>;
  // SVG shapes
  var svgMap = {
    triangle: <polygon points="50,5 95,95 5,95"/>,
    diamond: <polygon points="50,2 98,50 50,98 2,50"/>,
    arrow: <polygon points="0,30 65,30 65,10 100,50 65,90 65,70 0,70"/>,
    star: <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"/>,
    hexagon: <polygon points="25,5 75,5 98,50 75,95 25,95 2,50"/>,
    bubble: <><rect x="2" y="2" width="96" height="72" rx="12"/><polygon points="20,74 35,74 25,96"/></>,
  };
  if (svgMap[type]) return <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{width:w,height:h,display:'block'}}><g fill={fill}>{svgMap[type]}</g></svg>;
  return <div style={{width:w,height:h,background:fill,borderRadius:4}}/>;
}

/* Mini shape icon for selector */
function ShapeIcon(props) {
  var type = props.type;
  var c = props.color || 'var(--sap-text-muted)';
  var s = 20;
  if (type === 'rect') return <svg width={s} height={s} viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="1" fill={c}/></svg>;
  if (type === 'rounded') return <svg width={s} height={s} viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="4" fill={c}/></svg>;
  if (type === 'circle') return <svg width={s} height={s} viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill={c}/></svg>;
  if (type === 'triangle') return <svg width={s} height={s} viewBox="0 0 20 20"><polygon points="10,2 18,17 2,17" fill={c}/></svg>;
  if (type === 'diamond') return <svg width={s} height={s} viewBox="0 0 20 20"><polygon points="10,1 19,10 10,19 1,10" fill={c}/></svg>;
  if (type === 'arrow') return <svg width={s} height={s} viewBox="0 0 20 20"><polygon points="1,7 12,7 12,3 19,10 12,17 12,13 1,13" fill={c}/></svg>;
  if (type === 'star') return <svg width={s} height={s} viewBox="0 0 20 20"><polygon points="10,1 12.2,7 18.5,7 13.5,11.2 15.5,17.5 10,13.8 4.5,17.5 6.5,11.2 1.5,7 7.8,7" fill={c}/></svg>;
  if (type === 'hexagon') return <svg width={s} height={s} viewBox="0 0 20 20"><polygon points="5,2 15,2 19,10 15,18 5,18 1,10" fill={c}/></svg>;
  if (type === 'line') return <svg width={s} height={s} viewBox="0 0 20 20"><rect x="1" y="9" width="18" height="2" rx="1" fill={c}/></svg>;
  if (type === 'bubble') return <svg width={s} height={s} viewBox="0 0 20 20"><rect x="1" y="1" width="18" height="13" rx="3" fill={c}/><polygon points="5,14 9,14 6,19" fill={c}/></svg>;
  return <svg width={s} height={s} viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" fill={c}/></svg>;
}

export default function SuperDeckEditor() {
  var { t } = useTranslation();
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
  var [fontDropOpen, setFontDropOpen] = useState(false);
  var [sizeDropOpen, setSizeDropOpen] = useState(false);
  var fontDropRef = useRef(null);
  var sizeDropRef = useRef(null);

  useEffect(function () {
    apiGet('/api/superdeck/' + deckId).then(function (d) {
      var s = d.slides || [];
      if (s.length === 0) s = [{ id: 's1', background: '', elements: [], notes: '' }];
      setSlides(s); setTheme(d.theme || 'midnight'); setTitle(d.title || ''); setLoaded(true);
    }).catch(function () { nav('/superdeck'); });
  }, [deckId]);

  var thm = THEMES[theme] || THEMES.midnight;
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
      if (fontDropRef.current && !fontDropRef.current.contains(e.target)) setFontDropOpen(false);
      if (sizeDropRef.current && !sizeDropRef.current.contains(e.target)) setSizeDropOpen(false);
    }
    document.addEventListener('mousedown', h); return function () { document.removeEventListener('mousedown', h); };
  }, []);

  /* ── Slide operations ──────────────────────────────── */
  function addSlide() {
    var ns = slides.slice();
    ns.splice(active + 1, 0, { id: 'sl_' + UID(), background: '', elements: [
      { id: UID(), type: 'heading', text: 'Slide title', fontSize: 36, color: thm.text, bold: true, align: 'center', fontFamily: thm.headingFont, x: 200, y: 200, w: 600, h: 80 },
      { id: UID(), type: 'text', text: 'Click to edit', fontSize: 18, color: thm.muted, align: 'left', fontFamily: t.bodyFont, x: 250, y: 300, w: 500, h: 50 },
    ], notes: '' });
    setSlides(ns); setActive(active + 1); mark();
  }
  function dupSlide(i) { var ns = slides.slice(); ns.splice(i + 1, 0, JSON.parse(JSON.stringify(Object.assign({}, ns[i], { id: 'sl_' + UID() })))); setSlides(ns); setActive(i + 1); mark(); }
  function delSlide(i) { if (slides.length <= 1) return; var ns = slides.filter(function (_, j) { return j !== i; }); setSlides(ns); if (active >= ns.length) setActive(ns.length - 1); setSelId(null); mark(); }

  /* ── Element operations ────────────────────────────── */
  function addEl(type) {
    var el = { id: UID(), type: type, x: 150, y: 150, w: 400, h: 60 };
    if (type === 'heading') Object.assign(el, { text: 'Click to edit heading', fontSize: 36, color: isLightBg(cs.background || t.primary) ? 'var(--sap-text-primary)' : '#ffffff', bold: true, align: 'center', fontFamily: thm.headingFont, w: 600, h: 80, x: 200, y: 200 });
    else if (type === 'text') Object.assign(el, { text: 'Click to edit text', fontSize: 18, color: isLightBg(cs.background || t.primary) ? 'var(--sap-text-muted)' : 'var(--sap-text-faint)', align: 'left', fontFamily: t.bodyFont, w: 500, h: 50, x: 250, y: 300 });
    else if (type === 'image') Object.assign(el, { src: '', w: 300, h: 200, x: 350, y: 180 });
    else if (type === 'shape') Object.assign(el, { shapeType: 'rect', fill: thm.accent, w: 200, h: 120, x: 400, y: 220 });
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
          els.push({ id: UID(), type: 'heading', text: h, fontSize: 36, color: thm.text, bold: true, align: 'center', fontFamily: thm.headingFont, x: 100, y: 80, w: 800, h: 80 });
          if (body) els.push({ id: UID(), type: 'text', text: body, fontSize: 18, color: thm.muted, align: 'left', fontFamily: t.bodyFont, x: 100, y: 200, w: 800, h: 200 });
          if (s.bullets) { var btext = s.bullets.map(function(b,i){return '\u2022 '+b;}).join('\n'); els.push({ id: UID(), type: 'text', text: btext, fontSize: 18, color: thm.muted, align: 'left', fontFamily: t.bodyFont, x: 100, y: 200, w: 800, h: 250 }); }
          if (s.stats) { s.stats.forEach(function(st, i) { els.push({ id: UID(), type: 'heading', text: st.value, fontSize: 48, color: thm.accent, bold: true, align: 'center', fontFamily: thm.headingFont, x: 100 + i * 300, y: 200, w: 250, h: 70 }); els.push({ id: UID(), type: 'text', text: st.label, fontSize: 14, color: thm.muted, align: 'center', fontFamily: t.bodyFont, x: 100 + i * 300, y: 280, w: 250, h: 30 }); }); }
          if (s.quote_text) { els = [{ id: UID(), type: 'heading', text: '\u201C' + s.quote_text + '\u201D', fontSize: 28, color: thm.text, bold: false, italic: true, align: 'center', fontFamily: 'Georgia, serif', x: 100, y: 150, w: 800, h: 180 }]; if (s.attribution) els.push({ id: UID(), type: 'text', text: s.attribution, fontSize: 16, color: thm.muted, align: 'center', fontFamily: t.bodyFont, x: 300, y: 380, w: 400, h: 30 }); }
          if (s.cta_text) els.push({ id: UID(), type: 'shape', shapeType: 'rect', fill: thm.accent, x: 350, y: 400, w: 300, h: 60 });
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

  if (!loaded) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'var(--sap-text-primary)'}}><Loader2 size={32} color="var(--sap-purple)" style={{animation:'spin 1s linear infinite'}}/><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>;

  /* ── PRESENT MODE ──────────────────────────────────── */
  if (presenting) return (
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={function(){setActive(function(a){return Math.min(a+1,slides.length-1);});}}>
      <div style={{width:'100vw',height:'100vh',maxWidth:'177.78vh',maxHeight:'56.25vw',position:'relative'}}>
        <div style={{width:'100%',height:'100%',background:cs.background||t.primary,position:'relative'}}>
          {cs.elements.map(function(el){
            var pctX=(el.x/CANVAS_W)*100,pctY=(el.y/CANVAS_H)*100,pctW=(el.w/CANVAS_W)*100,pctH=(el.h/CANVAS_H)*100;
            return <div key={el.id} style={{position:'absolute',left:pctX+'%',top:pctY+'%',width:pctW+'%',height:pctH+'%'}}>
              {(el.type==='heading'||el.type==='text')&&<div style={{fontSize:el.fontSize*1.5+'px',fontWeight:el.bold?700:400,fontStyle:el.italic?'italic':'normal',textDecoration:el.underline?'underline':'none',color:el.color||'#fff',background:el.elBg||'transparent',textAlign:el.align||'left',fontFamily:el.fontFamily||t.bodyFont,width:'100%',height:'100%',lineHeight:1.3,display:'flex',alignItems:el.type==='heading'?'center':'flex-start',justifyContent:el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start',whiteSpace:'pre-wrap'}}>{el.text||''}</div>}
              {el.type==='image'&&(el.src?<img src={el.src} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:4}} alt=""/>:<div/>)}
              {el.type==='shape'&&<ShapeRender shapeType={el.shapeType} fill={el.fill||thm.accent}/>}
            </div>;
          })}
        </div>
      </div>
      <div style={{position:'fixed',bottom:20,right:20,background:'rgba(0,0,0,0.7)',borderRadius:8,padding:'6px 14px',display:'flex',alignItems:'center',gap:12}} onClick={function(e){e.stopPropagation();}}>
        <span style={{color:'var(--sap-text-faint)',fontSize:13}}>{active+1}/{slides.length}</span>
        <button onClick={function(){setPresenting(false);}} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',display:'flex',padding:4}}><X size={16}/></button>
      </div>
    </div>
  );

  var btnS={background:'#334155',border:'none',color:'var(--sap-border)',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:13,fontFamily:'inherit',padding:'7px 14px',borderRadius:6,fontWeight:600};
  var tbtn=function(active){return{background:active?'var(--sap-purple-pale)':'#fff',border:'1px solid '+(active?'var(--sap-purple)':'var(--sap-border)'),borderRadius:4,padding:'5px 7px',cursor:'pointer',display:'flex',color:active?'var(--sap-purple)':'var(--sap-text-muted)'};};

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'var(--sap-bg-elevated)',fontFamily:"'DM Sans',sans-serif"}}>

      {/* ── TOOLBAR ──────────────────────────────────── */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 20px',background:'linear-gradient(180deg,#172554,#1e3a8a)',borderBottom:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
        <button onClick={function(){if(dirty)save();nav('/superdeck');}} style={{...btnS,background:'none',color:'var(--sap-text-faint)'}}
          onMouseEnter={function(e){e.currentTarget.style.background='#334155';}} onMouseLeave={function(e){e.currentTarget.style.background='none';}}>
          <ArrowLeft size={14}/> {t('superDeck.back')}</button>
        <div style={{width:1,height:24,background:'#334155'}}/>
        <input value={title} onChange={function(e){setTitle(e.target.value);mark();}} style={{background:'transparent',border:'none',color:'var(--sap-bg-elevated)',fontSize:16,fontWeight:700,fontFamily:"'Sora',sans-serif",outline:'none',padding:'4px 8px',flex:1,maxWidth:280}} placeholder={t("superDeck.untitledPlaceholder")}/>
        <div style={{flex:1}}/>

        {/* Insert dropdown and Theme removed — elements are now in right sidebar */}

        <button onClick={function(){setShowAi(!showAi);}} style={{...btnS,background:'linear-gradient(135deg,#8b5cf6,#7c3aed)',color:'#fff',fontWeight:700}}>
          <Sparkles size={14}/> {t('superDeck.aiGenerate')}</button>
        <button onClick={function(){if(dirty)save();setPresenting(true);}} style={{...btnS,background:'var(--sap-green-dark)',color:'#fff',fontWeight:700}}
          onMouseEnter={function(e){e.currentTarget.style.background='#047857';}} onMouseLeave={function(e){e.currentTarget.style.background='var(--sap-green-dark)';}}>
          <Play size={14}/> {t('superDeck.present')}</button>
        <button onClick={save} disabled={saving} style={{background:'none',border:'none',color:dirty?'var(--sap-amber-bright)':'#4ade80',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12,fontFamily:'inherit',padding:'6px 8px'}}>
          <Save size={14}/> {saving?'Saving...':dirty?'Unsaved':'Saved'}</button>
      </div>

      {/* AI panel */}
      {showAi&&<div style={{padding:'16px 20px',background:'var(--sap-cobalt-deep)',borderBottom:'1px solid #312e81',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <Wand2 size={20} color="var(--sap-purple-light)"/>
        <input value={aiPrompt} onChange={function(e){setAiPrompt(e.target.value);}} onKeyDown={function(e){if(e.key==='Enter')generateAI();}}
          placeholder={t("superDeck.descPlaceholder")} style={{flex:1,padding:'10px 16px',borderRadius:8,border:'1px solid #4c1d95',background:'#312e81',color:'var(--sap-border)',fontSize:14,fontFamily:'inherit',outline:'none'}}/>
        <button onClick={generateAI} disabled={aiLoading} style={{padding:'10px 24px',borderRadius:8,border:'none',background:aiLoading?'var(--sap-text-muted)':'var(--sap-purple)',color:'#fff',fontSize:14,fontWeight:700,cursor:aiLoading?'default':'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
          {aiLoading?<><Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> {t('superDeck.generatingDots')}</>:<><Sparkles size={14}/> {t('superDeck.generate')}</>}</button>
        <button onClick={function(){setShowAi(false);}} style={{background:'none',border:'none',color:'var(--sap-text-faint)',cursor:'pointer',padding:4,display:'flex'}}><X size={18}/></button>
      </div>}

      {/* ── MAIN AREA ──────────────────────────────────── */}
      <div style={{display:'flex',flex:1,minHeight:0}}>

        {/* LEFT: Thumbnails */}
        <div style={{width:210,borderRight:'1px solid #e2e8f0',background:'#fff',padding:'10px 6px',overflowY:'auto',flexShrink:0}}>
          {slides.map(function(s,i){var isA=i===active;return <div key={s.id||i} style={{marginBottom:6}}>
            <div style={{display:'flex',gap:4,alignItems:'flex-start'}}>
              <span style={{fontSize:11,color:'var(--sap-text-faint)',width:16,textAlign:'right',paddingTop:4,flexShrink:0}}>{i+1}</span>
              <div style={{flex:1}}>
                <div onClick={function(){setActive(i);setSelId(null);setEditingId(null);}}
                  style={{borderRadius:4,border:isA?'2px solid #8b5cf6':'1px solid #e2e8f0',overflow:'hidden',cursor:'pointer'}}>
                  <div style={{aspectRatio:'16/9',background:s.background||t.primary,position:'relative',overflow:'hidden'}}>
                    {s.elements.map(function(el,ei){
                      var pX=(el.x/CANVAS_W)*100,pY=(el.y/CANVAS_H)*100,pW=(el.w/CANVAS_W)*100,pH=(el.h/CANVAS_H)*100;
                      return <div key={ei} style={{position:'absolute',left:pX+'%',top:pY+'%',width:pW+'%',height:pH+'%',zIndex:ei+1}}>
                        {(el.type==='heading'||el.type==='text')&&<div style={{fontSize:el.type==='heading'?'5px':'3.5px',fontWeight:el.bold?700:400,color:el.color||'#fff',textAlign:el.align||'left',fontFamily:el.fontFamily||t.bodyFont,overflow:'hidden',lineHeight:1.2,width:'100%',height:'100%',display:'flex',alignItems:el.type==='heading'?'center':'flex-start',justifyContent:el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start',background:el.elBg||'transparent'}}>{(el.text||'').slice(0,40)}</div>}
                        {el.type==='image'&&(el.src?<img src={el.src} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:1}} alt=""/>:<div style={{width:'100%',height:'100%',background:'rgba(255,255,255,.08)',borderRadius:1}}/>)}
                        {el.type==='shape'&&<ShapeRender shapeType={el.shapeType} fill={el.fill||thm.accent}/>}
                      </div>;
                    })}
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',gap:4,padding:'3px 0'}}>
                  <button onClick={function(){dupSlide(i);}} title={t('superDeck.duplicateSlide')}
                    onMouseEnter={function(e){e.currentTarget.style.background='var(--sap-purple-pale)';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';}}
                    style={{background:'transparent',border:'none',color:'var(--sap-text-faint)',cursor:'pointer',padding:4,borderRadius:4,display:'flex'}}><Copy size={16}/></button>
                  <button onClick={function(){delSlide(i);}} title={t('superDeck.deleteSlide')}
                    onMouseEnter={function(e){e.currentTarget.style.background='#fee2e2';e.currentTarget.style.color='var(--sap-red)';}} onMouseLeave={function(e){e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--sap-text-faint)';}}
                    style={{background:'transparent',border:'none',color:'var(--sap-text-faint)',cursor:'pointer',padding:4,borderRadius:4,display:'flex'}}><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          </div>;})}
          <button onClick={addSlide}
            onMouseEnter={function(e){e.currentTarget.style.borderColor='var(--sap-purple)';e.currentTarget.style.color='var(--sap-purple)';}}
            onMouseLeave={function(e){e.currentTarget.style.borderColor='var(--sap-text-ghost)';e.currentTarget.style.color='var(--sap-text-faint)';}}
            style={{width:'100%',padding:'8px 0',border:'2px dashed #cbd5e1',borderRadius:4,background:'none',color:'var(--sap-text-faint)',fontSize:12,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
            <Plus size={12}/> {t('superDeck.addSlide')}</button>
        </div>

        {/* CENTRE: Canvas */}
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'var(--sap-border)',padding:16,minWidth:0}}
          onClick={function(){if(editingId)finishEdit();setSelId(null);}}>
          <div ref={canvasRef} style={{width:'100%',maxWidth:1040,aspectRatio:'16/9',background:cs.background||t.primary,borderRadius:4,position:'relative',overflow:'hidden',boxShadow:'0 6px 30px rgba(0,0,0,.3)'}}>
            {cs.elements.map(function(el,elIdx){
              var isSel=el.id===selId,isEdit=el.id===editingId;
              var pctX=(el.x/CANVAS_W)*100,pctY=(el.y/CANVAS_H)*100,pctW=(el.w/CANVAS_W)*100,pctH=(el.h/CANVAS_H)*100;
              return <div key={el.id}
                onMouseDown={function(e){if(!isEdit)onElMouseDown(e,el.id);}}
                onDoubleClick={function(e){e.stopPropagation();if(el.type==='heading'||el.type==='text')startEdit(el.id);else if(el.type==='image')uploadImage();}}
                onClick={function(e){e.stopPropagation();if(!isEdit)setSelId(el.id);}}
                style={{position:'absolute',left:pctX+'%',top:pctY+'%',width:pctW+'%',height:pctH+'%',cursor:isEdit?'text':'move',outline:isSel&&!isEdit?'2px solid #3b82f6':'none',borderRadius:2,boxSizing:'border-box',zIndex:elIdx+1}}>
                {(el.type==='heading'||el.type==='text')&&(isEdit?
                  <div ref={editRef} contentEditable suppressContentEditableWarning onBlur={finishEdit} onKeyDown={function(e){if(e.key==='Escape')finishEdit();}}
                    style={{fontSize:Math.max(10,el.fontSize*0.65)+'px',fontWeight:el.bold?700:400,fontStyle:el.italic?'italic':'normal',textDecoration:el.underline?'underline':'none',color:el.color||'#fff',textAlign:el.align||'left',fontFamily:el.fontFamily||t.bodyFont,width:'100%',height:'100%',outline:'2px solid #8b5cf6',padding:'4px 6px',lineHeight:1.3,overflow:'hidden',background:'rgba(0,0,0,.15)',borderRadius:2,whiteSpace:'pre-wrap'}}>{el.text||''}</div>
                  :<div style={{fontSize:Math.max(10,el.fontSize*0.65)+'px',fontWeight:el.bold?700:400,fontStyle:el.italic?'italic':'normal',textDecoration:el.underline?'underline':'none',color:el.color||'#fff',background:el.elBg||'transparent',textAlign:el.align||'left',fontFamily:el.fontFamily||t.bodyFont,width:'100%',height:'100%',overflow:'hidden',padding:'4px 6px',display:'flex',alignItems:el.type==='heading'?'center':'flex-start',justifyContent:el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start',lineHeight:1.3,userSelect:'none',whiteSpace:'pre-wrap'}}>{el.text||''}</div>
                )}
                {el.type==='image'&&(el.src?<img src={el.src} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:4,pointerEvents:'none'}} alt=""/>
                  :<div style={{width:'100%',height:'100%',background:'rgba(255,255,255,.05)',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',border:'1px dashed rgba(255,255,255,.2)'}}><Image size={24} color="var(--sap-text-secondary)"/></div>)}
                {el.type==='shape'&&<ShapeRender shapeType={el.shapeType} fill={el.fill||thm.accent}/>}
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
                  <div style={{position:'absolute',top:-34,left:'50%',transform:'translateX(-50%)',display:'flex',gap:2,background:'var(--sap-text-primary)',borderRadius:6,padding:'3px 4px',boxShadow:'0 4px 12px rgba(0,0,0,0.3)',zIndex:30}} onClick={function(e){e.stopPropagation();}}>
                    <button onClick={function(e){e.stopPropagation();if(!selId)return;var ns=slides.slice();var s=Object.assign({},ns[active]);var els=s.elements.slice();var idx=els.findIndex(function(x){return x.id===selId;});if(idx>0){var el=els.splice(idx,1)[0];els.unshift(el);s.elements=els;ns[active]=s;setSlides(ns);mark();}}} title={t('superDeck.sendToBack')} style={{background:'transparent',border:'none',color:'var(--sap-text-ghost)',cursor:'pointer',padding:'4px 6px',borderRadius:4,display:'flex'}}><ArrowDown size={14}/></button>
                    <button onClick={function(e){e.stopPropagation();if(!selId)return;var ns=slides.slice();var s=Object.assign({},ns[active]);var els=s.elements.slice();var idx=els.findIndex(function(x){return x.id===selId;});if(idx>=0&&idx<els.length-1){var el=els.splice(idx,1)[0];els.push(el);s.elements=els;ns[active]=s;setSlides(ns);mark();}}} title={t('superDeck.bringToFront')} style={{background:'transparent',border:'none',color:'var(--sap-text-ghost)',cursor:'pointer',padding:'4px 6px',borderRadius:4,display:'flex'}}><ArrowUp size={14}/></button>
                    <div style={{width:1,height:20,background:'var(--sap-text-secondary)',margin:'0 2px'}}/>
                    <button onClick={function(e){e.stopPropagation();delEl();}} title={t('superDeck.deleteSlide')} style={{background:'transparent',border:'none',color:'#f87171',cursor:'pointer',padding:'4px 6px',borderRadius:4,display:'flex'}}><Trash2 size={14}/></button>
                  </div>
                </>}
              </div>;
            })}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16,marginTop:12}}>
            <button onClick={function(){setActive(Math.max(0,active-1));}} disabled={active===0} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 10px',cursor:active>0?'pointer':'default',color:active>0?'#334155':'var(--sap-text-ghost)',display:'flex'}}><ChevronLeft size={16}/></button>
            <span style={{fontSize:13,color:'var(--sap-text-muted)',fontWeight:600}}>Slide {active+1} of {slides.length}</span>
            <button onClick={function(){setActive(Math.min(slides.length-1,active+1));}} disabled={active>=slides.length-1} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 10px',cursor:active<slides.length-1?'pointer':'default',color:active<slides.length-1?'#334155':'var(--sap-text-ghost)',display:'flex'}}><ChevronRight size={16}/></button>
          </div>
          <div style={{width:'100%',maxWidth:1040,marginTop:8}}>
            <textarea value={cs.notes||''} onChange={function(e){var ns=slides.slice();ns[active]=Object.assign({},ns[active],{notes:e.target.value});setSlides(ns);mark();}} placeholder={t("superDeck.speakerNotesPlaceholder")} rows={2}
              style={{width:'100%',padding:'8px 12px',background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,color:'var(--sap-text-secondary)',fontSize:12,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box',outline:'none'}}/>
          </div>
        </div>

        {/* RIGHT: Properties + Layers (always visible) */}
        <div style={{width:270,borderLeft:'1px solid #e2e8f0',background:'#fff',padding:14,overflowY:'auto',flexShrink:0}}>

          {/* ── Add Elements (always visible) ── */}
          <div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-faint)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>{t('superDeck.addElements')}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:4,marginBottom:14}}>
            {[{t:'heading',n:'Heading',i:Type,c:'var(--sap-purple)'},{t:'text',n:'Text',i:Type,c:'var(--sap-accent)'},{t:'image',n:'Image',i:Image,c:'var(--sap-green-bright)'},{t:'shape',n:'Shape',i:Square,c:'var(--sap-amber)'}].map(function(it){
              return <button key={it.t} onClick={function(){addEl(it.t);}}
                onMouseEnter={function(e){e.currentTarget.style.background='var(--sap-purple-pale)';e.currentTarget.style.borderColor='var(--sap-purple)';}}
                onMouseLeave={function(e){e.currentTarget.style.background='var(--sap-bg-elevated)';e.currentTarget.style.borderColor='var(--sap-border)';}}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'8px 4px',borderRadius:6,border:'1px solid #e2e8f0',background:'var(--sap-bg-elevated)',cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}>
                <it.i size={16} color={it.c}/>
                <span style={{fontSize:10,fontWeight:600,color:'#334155'}}>{it.n}</span>
              </button>;
            })}
          </div>

          {/* ── Element Properties (only when selected) ── */}
          {selEl&&<>
            <div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-faint)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>{t('superDeck.elementProperties')}</div>

            {/* Layer ordering — send to back / bring to front */}
            <div style={{display:'flex',gap:4,marginBottom:10}}>
              <button onClick={function(e){e.stopPropagation();
                if(!selId)return;var ns=slides.slice();var s=Object.assign({},ns[active]);var els=s.elements.slice();
                var idx=els.findIndex(function(x){return x.id===selId;});
                if(idx>0){var el=els.splice(idx,1)[0];els.unshift(el);s.elements=els;ns[active]=s;setSlides(ns);mark();}
              }}
                onMouseEnter={function(e){e.currentTarget.style.background='var(--sap-purple-pale)';}} onMouseLeave={function(e){e.currentTarget.style.background='var(--sap-bg-elevated)';}}
                style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'8px',borderRadius:6,border:'1px solid #e2e8f0',background:'var(--sap-bg-elevated)',color:'#334155',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                <ArrowDown size={13}/> {t('superDeck.sendToBack')}</button>
              <button onClick={function(e){e.stopPropagation();
                if(!selId)return;var ns=slides.slice();var s=Object.assign({},ns[active]);var els=s.elements.slice();
                var idx=els.findIndex(function(x){return x.id===selId;});
                if(idx>=0&&idx<els.length-1){var el=els.splice(idx,1)[0];els.push(el);s.elements=els;ns[active]=s;setSlides(ns);mark();}
              }}
                onMouseEnter={function(e){e.currentTarget.style.background='var(--sap-purple-pale)';}} onMouseLeave={function(e){e.currentTarget.style.background='var(--sap-bg-elevated)';}}
                style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'8px',borderRadius:6,border:'1px solid #e2e8f0',background:'var(--sap-bg-elevated)',color:'#334155',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                <ArrowUp size={13}/> {t('superDeck.bringToFrontLabel')}</button>
            </div>

            {(selEl.type==='heading'||selEl.type==='text')&&<>
              <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>{t('superDeck.fontLabel')}</div>
              <div ref={fontDropRef} style={{position:'relative',marginBottom:10}}>
                <div onClick={function(e){e.stopPropagation();setFontDropOpen(!fontDropOpen);setSizeDropOpen(false);}}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:fontDropOpen?'#f5f3ff':'#fff',border:'1.5px solid '+(fontDropOpen?'var(--sap-purple)':'var(--sap-border)'),borderRadius:8,cursor:'pointer',transition:'all 0.15s'}}>
                  <span style={{width:28,height:28,borderRadius:6,background:'var(--sap-bg-page)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--sap-purple)',fontFamily:(selEl.fontFamily||"'Sora',sans-serif"),flexShrink:0}}>{t('superDeck.fontPreview')}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--sap-text-primary)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:(selEl.fontFamily||"'Sora',sans-serif")}}>{(selEl.fontFamily||'').split(',')[0].replace(/'/g,'').trim()||'Sora'}</span>
                  <svg style={{flexShrink:0,opacity:0.4,transform:fontDropOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sap-text-faint)" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {fontDropOpen&&<div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,marginTop:4,background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:10,overflow:'hidden',boxShadow:'0 12px 40px rgba(0,0,0,.12)',maxHeight:260,overflowY:'auto'}}>
                  {['Sora','DM Sans','Inter','Poppins','Montserrat','Playfair Display','Roboto','Open Sans','Lato','Oswald','Raleway','Merriweather','Georgia','Arial','Trebuchet MS','Verdana','Courier New','Impact'].map(function(f){
                    var isActive=(selEl.fontFamily||'').indexOf(f)>=0;
                    return <div key={f} onClick={function(e){e.stopPropagation();upd(selId,{fontFamily:"'"+f+"',sans-serif"});setFontDropOpen(false);}}
                      onMouseEnter={function(e){if(!isActive)e.currentTarget.style.background='var(--sap-bg-elevated)';}}
                      onMouseLeave={function(e){if(!isActive)e.currentTarget.style.background='transparent';}}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',cursor:'pointer',background:isActive?'#f5f3ff':'transparent',borderLeft:isActive?'3px solid #8b5cf6':'3px solid transparent',transition:'background 0.15s'}}>
                      <span style={{width:26,height:26,borderRadius:5,background:isActive?'var(--sap-purple-pale)':'var(--sap-bg-page)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:isActive?'var(--sap-purple)':'var(--sap-text-muted)',fontFamily:"'"+f+"',sans-serif",flexShrink:0}}>{t('superDeck.fontPreview')}</span>
                      <span style={{fontSize:13,fontWeight:isActive?700:500,color:isActive?'var(--sap-purple)':'var(--sap-text-primary)',fontFamily:"'"+f+"',sans-serif"}}>{f}</span>
                    </div>;
                  })}
                </div>}
              </div>

              <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>{t('superDeck.sizeLabel')}</div>
              <div ref={sizeDropRef} style={{position:'relative',marginBottom:10}}>
                <div onClick={function(e){e.stopPropagation();setSizeDropOpen(!sizeDropOpen);setFontDropOpen(false);}}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:sizeDropOpen?'#f5f3ff':'#fff',border:'1.5px solid '+(sizeDropOpen?'var(--sap-purple)':'var(--sap-border)'),borderRadius:8,cursor:'pointer',transition:'all 0.15s'}}>
                  <span style={{width:28,height:28,borderRadius:6,background:'var(--sap-bg-page)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--sap-purple)',flexShrink:0}}>{selEl.fontSize||18}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--sap-text-primary)',flex:1}}>{(selEl.fontSize||18)+'px'}</span>
                  <svg style={{flexShrink:0,opacity:0.4,transform:sizeDropOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sap-text-faint)" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {sizeDropOpen&&<div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,marginTop:4,background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:10,overflow:'hidden',boxShadow:'0 12px 40px rgba(0,0,0,.12)',maxHeight:260,overflowY:'auto'}}>
                  {FONT_SIZES.map(function(s){
                    var isActive=(selEl.fontSize||18)===s;
                    return <div key={s} onClick={function(e){e.stopPropagation();upd(selId,{fontSize:s});setSizeDropOpen(false);}}
                      onMouseEnter={function(e){if(!isActive)e.currentTarget.style.background='var(--sap-bg-elevated)';}}
                      onMouseLeave={function(e){if(!isActive)e.currentTarget.style.background='transparent';}}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',cursor:'pointer',background:isActive?'#f5f3ff':'transparent',borderLeft:isActive?'3px solid #8b5cf6':'3px solid transparent',transition:'background 0.15s'}}>
                      <span style={{fontSize:13,fontWeight:isActive?700:500,color:isActive?'var(--sap-purple)':'var(--sap-text-primary)'}}>{s}px</span>
                      <span style={{fontSize:11,color:'var(--sap-text-faint)',marginLeft:'auto'}}>{s<=16?'Small':s<=24?'Body':s<=36?'Subtitle':s<=56?'Title':'Display'}</span>
                    </div>;
                  })}
                </div>}
              </div>

              <div style={{display:'flex',gap:3,marginBottom:10}}>
                <button onClick={function(){upd(selId,{bold:!selEl.bold});}} style={tbtn(selEl.bold)}><Bold size={14}/></button>
                <button onClick={function(){upd(selId,{italic:!selEl.italic});}} style={tbtn(selEl.italic)}><Italic size={14}/></button>
                <button onClick={function(){upd(selId,{underline:!selEl.underline});}} style={tbtn(selEl.underline)}><Underline size={14}/></button>
                <div style={{width:1,background:'var(--sap-border)',margin:'0 2px'}}/>
                {['left','center','right'].map(function(a){return <button key={a} onClick={function(){upd(selId,{align:a});}} style={tbtn((selEl.align||'left')===a)}>
                  {a==='left'?<AlignLeft size={14}/>:a==='center'?<AlignCenter size={14}/>:<AlignRight size={14}/>}</button>;})}
              </div>

              <div style={{display:'flex',gap:10,marginBottom:12}}>
                <div><div style={{fontSize:11,color:'var(--sap-text-muted)',marginBottom:3}}>{t('superDeck.textColour')}</div>
                  <input type="color" value={selEl.color||'#ffffff'} onChange={function(e){upd(selId,{color:e.target.value});}} style={{width:44,height:34,border:'2px solid #e2e8f0',borderRadius:6,cursor:'pointer',padding:1}}/></div>
                <div><div style={{fontSize:11,color:'var(--sap-text-muted)',marginBottom:3}}>{t('superDeck.fillLabel')}</div>
                  <input type="color" value={selEl.elBg||'#transparent'} onChange={function(e){upd(selId,{elBg:e.target.value});}} style={{width:44,height:34,border:'2px solid #e2e8f0',borderRadius:6,cursor:'pointer',padding:1}}/></div>
              </div>
            </>}

            {selEl.type==='shape'&&<>
              <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>{t('superDeck.fillColour')}</div>
              <input type="color" value={selEl.fill||thm.accent} onChange={function(e){upd(selId,{fill:e.target.value});}} style={{width:'100%',height:40,border:'2px solid #e2e8f0',borderRadius:6,cursor:'pointer',padding:1,marginBottom:10}}/>
              <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>{t('superDeck.shapeLabel')}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:3,marginBottom:10}}>
                {SHAPE_TYPES.map(function(sh){var isActive=(selEl.shapeType||'rect')===sh.id;
                  return <button key={sh.id} onClick={function(){upd(selId,{shapeType:sh.id});}} title={sh.name}
                    onMouseEnter={function(e){if(!isActive)e.currentTarget.style.background='var(--sap-bg-elevated)';e.currentTarget.style.borderColor='var(--sap-purple)';}}
                    onMouseLeave={function(e){if(!isActive)e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor=isActive?'var(--sap-purple)':'var(--sap-border)';}}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'6px 2px',borderRadius:6,border:'1.5px solid '+(isActive?'var(--sap-purple)':'var(--sap-border)'),background:isActive?'#f5f3ff':'#fff',cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}>
                    <ShapeIcon type={sh.id} color={isActive?'var(--sap-purple)':'var(--sap-text-faint)'}/>
                    <span style={{fontSize:8,fontWeight:600,color:isActive?'var(--sap-purple)':'var(--sap-text-faint)',lineHeight:1}}>{sh.name}</span>
                  </button>;
                })}
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
                onMouseEnter={function(e){e.currentTarget.style.background='var(--sap-purple-pale)';}} onMouseLeave={function(e){e.currentTarget.style.background='var(--sap-bg-elevated)';}}
                style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'10px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'var(--sap-bg-elevated)',color:'#334155',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:10}}>
                <Upload size={14} color="var(--sap-purple)"/> {t('superDeck.uploadReplace')}</button>
            </>}

            <button onClick={delEl}
              onMouseEnter={function(e){e.currentTarget.style.background='#fee2e2';}} onMouseLeave={function(e){e.currentTarget.style.background='var(--sap-red-bg)';}}
              style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #fecaca',background:'var(--sap-red-bg)',color:'var(--sap-red)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>
              <Trash2 size={14}/> {t('superDeck.deleteElement')}</button>

            <div style={{borderTop:'1px solid #e2e8f0',margin:'12px 0'}}/>
          </>}

          {/* ── Slide Design (always visible) ── */}
          <div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-faint)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{t('superDeck.slideDesign')}</div>
          <div style={{fontSize:12,fontWeight:600,color:'#334155',marginBottom:4}}>{t('superDeck.backgroundLabel')}</div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <input type="color" value={cs.background||t.primary} onChange={function(e){updBg(e.target.value);}} style={{width:36,height:36,border:'2px solid #e2e8f0',borderRadius:6,cursor:'pointer',padding:1}}/>
            <span style={{fontSize:12,color:'var(--sap-text-muted)',fontFamily:'monospace'}}>{cs.background||t.primary}</span>
          </div>

          {/* ── Layers (always visible) ── */}
          <div style={{fontSize:12,fontWeight:700,color:'var(--sap-text-faint)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{t('superDeck.layers')}</div>
          {cs.elements.slice().reverse().map(function(el){var isSel=el.id===selId;var label=el.type==='heading'?'H: '+(el.text||'').slice(0,16):el.type==='text'?'T: '+(el.text||'').slice(0,16):el.type==='image'?'Image':el.type==='shape'?'Shape':'?';
            return <div key={el.id} onClick={function(e){e.stopPropagation();setSelId(el.id);}}
              onMouseEnter={function(e){if(!isSel)e.currentTarget.style.background='var(--sap-bg-elevated)';}} onMouseLeave={function(e){if(!isSel)e.currentTarget.style.background=isSel?'var(--sap-purple-pale)':'transparent';}}
              style={{padding:'6px 8px',borderRadius:4,marginBottom:2,cursor:'pointer',fontSize:12,color:isSel?'var(--sap-purple)':'#334155',background:isSel?'var(--sap-purple-pale)':'transparent',border:isSel?'1px solid #c4b5fd':'1px solid transparent',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{display:'flex',alignItems:'center',gap:6}}>
                <Layers size={11} color={isSel?'var(--sap-purple)':'var(--sap-text-faint)'}/>
                {label}
              </span>
            </div>;
          })}
          {cs.elements.length===0&&<div style={{fontSize:11,color:'var(--sap-text-faint)',fontStyle:'italic',marginBottom:8}}>{t('superDeck.noElements')}</div>}

          <div style={{borderTop:'1px solid #e2e8f0',paddingTop:8,marginTop:8}}>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <button onClick={function(){dupSlide(active);}}
                onMouseEnter={function(e){e.currentTarget.style.background='#f3f0ff';}} onMouseLeave={function(e){e.currentTarget.style.background='var(--sap-bg-elevated)';}}
                style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'7px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'var(--sap-bg-elevated)',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                <Copy size={12} color="var(--sap-purple)"/> {t('superDeck.duplicateSlideLabel')}</button>
              <button onClick={function(){delSlide(active);}}
                onMouseEnter={function(e){e.currentTarget.style.background='#fee2e2';}} onMouseLeave={function(e){e.currentTarget.style.background='var(--sap-bg-elevated)';}}
                style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'7px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'var(--sap-bg-elevated)',color:'#334155',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                <Trash2 size={12} color="var(--sap-red)"/> {t('superDeck.deleteSlideLabel')}</button>
            </div>
          </div>
        </div>
      </div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
