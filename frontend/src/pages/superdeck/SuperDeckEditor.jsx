import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../../utils/api';
import { THEMES, THEME_KEYS } from './themes';
import {
  Type, Image, Square, Plus, Trash2, Copy, Download, Save, ArrowLeft,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  Sparkles, Monitor, ChevronRight, ChevronLeft, Scissors, Clipboard,
  PanelRightClose, PanelRightOpen, Layers, Eye, EyeOff,
  ArrowUp, ArrowDown, Upload, XCircle,
} from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────── */
var UID = function () { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
var CANVAS_W = 1000;
var CANVAS_H = 562.5;
var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
var isLightBg = function (hex) {
  var c = hex.replace('#', '');
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  var r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
};

/* ── Colour swatches for the ribbon font group ──────── */
var FONT_COLOURS = ['#ffffff','#0f172a','#8b5cf6','#0ea5e9','#22c55e','#f59e0b','#ef4444','#ec4899','#64748b'];

/* ── Component ────────────────────────────────────────── */
export default function SuperDeckEditor() {
  var params = useParams();
  var deckId = params.deckId;
  var nav = useNavigate();

  /* State */
  var [slides, setSlides] = useState([]);
  var [active, setActive] = useState(0);
  var [selId, setSelId] = useState(null);
  var [theme, setTheme] = useState('midnight');
  var [title, setTitle] = useState('');
  var [saving, setSaving] = useState(false);
  var [dirty, setDirty] = useState(false);
  var [loaded, setLoaded] = useState(false);
  var [ribbonTab, setRibbonTab] = useState('home');
  var [ribbonOpen, setRibbonOpen] = useState(true);
  var [panelOpen, setPanelOpen] = useState(true);
  var [editingId, setEditingId] = useState(null);
  var canvasRef = useRef(null);
  var editRef = useRef(null);

  /* Load deck */
  useEffect(function () {
    apiGet('/api/superdeck/' + deckId).then(function (d) {
      setSlides(d.slides || []);
      setTheme(d.theme || 'midnight');
      setTitle(d.title || '');
      setLoaded(true);
    }).catch(function () { nav('/superdeck'); });
  }, [deckId]);

  var t = THEMES[theme] || THEMES.midnight;
  var cs = slides[active] || { elements: [], background: '#ffffff', notes: '' };
  var selEl = selId ? cs.elements.find(function (e) { return e.id === selId; }) : null;

  /* ── Persistence ──────────────────────────────────── */
  var save = useCallback(function () {
    setSaving(true);
    apiPost('/api/superdeck/' + deckId + '/save', { title: title, theme: theme, slides: slides })
      .then(function () { setSaving(false); setDirty(false); })
      .catch(function () { setSaving(false); });
  }, [deckId, title, theme, slides]);

  useEffect(function () {
    var iv = setInterval(function () { if (dirty) save(); }, 30000);
    return function () { clearInterval(iv); };
  }, [dirty, save]);

  function mark() { setDirty(true); }

  /* ── Slide operations ─────────────────────────────── */
  function addSlide() {
    var ns = slides.slice();
    ns.push({ id: UID(), elements: [], background: '#ffffff', notes: '' });
    setSlides(ns); setActive(ns.length - 1); setSelId(null); mark();
  }
  function dupSlide(i) {
    var ns = slides.slice();
    var c = JSON.parse(JSON.stringify(ns[i]));
    c.id = UID();
    c.elements = c.elements.map(function (e) { return Object.assign({}, e, { id: UID() }); });
    ns.splice(i + 1, 0, c);
    setSlides(ns); setActive(i + 1); mark();
  }
  function delSlide(i) {
    if (slides.length <= 1) return;
    var ns = slides.filter(function (_, j) { return j !== i; });
    setSlides(ns);
    if (active >= ns.length) setActive(ns.length - 1);
    setSelId(null); mark();
  }

  /* ── Element operations ───────────────────────────── */
  function addEl(type) {
    var el = { id: UID(), type: type, x: 150, y: 150, w: 400, h: 60 };
    if (type === 'heading') Object.assign(el, { text: 'Click to edit heading', fontSize: 36, color: isLightBg(cs.background || '#ffffff') ? '#0f172a' : '#ffffff', bold: true, align: 'center', fontFamily: t.headingFont, w: 600, h: 80, x: 200, y: 200 });
    else if (type === 'text') Object.assign(el, { text: 'Click to edit text', fontSize: 18, color: isLightBg(cs.background || '#ffffff') ? '#64748b' : '#94a3b8', align: 'left', fontFamily: t.bodyFont, w: 500, h: 50, x: 250, y: 300 });
    else if (type === 'image') Object.assign(el, { src: '', w: 300, h: 200, x: 350, y: 180 });
    else if (type === 'shape') Object.assign(el, { shapeType: 'rect', fill: t.accent, w: 200, h: 120, x: 400, y: 220 });
    var ns = slides.slice();
    ns[active] = Object.assign({}, ns[active], { elements: ns[active].elements.concat([el]) });
    setSlides(ns); setSelId(el.id); mark();
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

  function delAllEls() {
    if (!window.confirm('Delete all elements on this slide?')) return;
    var ns = slides.slice();
    ns[active] = Object.assign({}, ns[active], { elements: [] });
    setSlides(ns); setSelId(null); mark();
  }

  function moveElForward() {
    if (!selId) return;
    var ns = slides.slice();
    var s = Object.assign({}, ns[active]);
    var els = s.elements.slice();
    var idx = els.findIndex(function (e) { return e.id === selId; });
    if (idx < 0 || idx >= els.length - 1) return;
    var tmp = els[idx]; els[idx] = els[idx + 1]; els[idx + 1] = tmp;
    s.elements = els; ns[active] = s; setSlides(ns); mark();
  }

  function moveElBackward() {
    if (!selId) return;
    var ns = slides.slice();
    var s = Object.assign({}, ns[active]);
    var els = s.elements.slice();
    var idx = els.findIndex(function (e) { return e.id === selId; });
    if (idx <= 0) return;
    var tmp = els[idx]; els[idx] = els[idx - 1]; els[idx - 1] = tmp;
    s.elements = els; ns[active] = s; setSlides(ns); mark();
  }

  function uploadImage(file) {
    if (!file) return;
    var formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'superdeck');
    fetch('/api/upload-media', { method: 'POST', body: formData, credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.url) {
          var el = { id: UID(), type: 'image', src: data.url, x: 200, y: 150, w: 400, h: 250 };
          var ns = slides.slice();
          ns[active] = Object.assign({}, ns[active], { elements: ns[active].elements.concat([el]) });
          setSlides(ns); setSelId(el.id); mark();
        }
      })
      .catch(function (err) { console.error('Upload failed:', err); });
  }

  function updBg(c) {
    var ns = slides.slice();
    ns[active] = Object.assign({}, ns[active], { background: c });
    setSlides(ns); mark();
  }

  function updNotes(val) {
    var ns = slides.slice();
    ns[active] = Object.assign({}, ns[active], { notes: val });
    setSlides(ns); mark();
  }

  /* ── Canvas: drag to move ─────────────────────────── */
  function onElMouseDown(e, elId) {
    e.stopPropagation();
    setSelId(elId);
    setEditingId(null);
    var rect = canvasRef.current.getBoundingClientRect();
    var el = cs.elements.find(function (x) { return x.id === elId; });
    if (!el) return;
    var scX = CANVAS_W / rect.width;
    var scY = CANVAS_H / rect.height;
    var sx = e.clientX, sy = e.clientY, ox = el.x, oy = el.y;
    function mv(ev) {
      upd(elId, {
        x: clamp(Math.round(ox + (ev.clientX - sx) * scX), 0, CANVAS_W - 20),
        y: clamp(Math.round(oy + (ev.clientY - sy) * scY), 0, CANVAS_H - 20),
      });
    }
    function up() { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', mv);
    document.addEventListener('mouseup', up);
  }

  /* ── Canvas: resize handles ───────────────────────── */
  function onResizeDown(e, elId, corner) {
    e.stopPropagation(); e.preventDefault();
    var rect = canvasRef.current.getBoundingClientRect();
    var el = cs.elements.find(function (x) { return x.id === elId; });
    if (!el) return;
    var scX = CANVAS_W / rect.width;
    var scY = CANVAS_H / rect.height;
    var sx = e.clientX, sy = e.clientY;
    var ox = el.x, oy = el.y, ow = el.w, oh = el.h;
    function mv(ev) {
      var dx = (ev.clientX - sx) * scX;
      var dy = (ev.clientY - sy) * scY;
      var u = {};
      if (corner.includes('r')) u.w = Math.max(40, Math.round(ow + dx));
      if (corner.includes('l')) { u.x = Math.round(ox + dx); u.w = Math.max(40, Math.round(ow - dx)); }
      if (corner.includes('b')) u.h = Math.max(20, Math.round(oh + dy));
      if (corner.includes('t')) { u.y = Math.round(oy + dy); u.h = Math.max(20, Math.round(oh - dy)); }
      upd(elId, u);
    }
    function up() { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', mv);
    document.addEventListener('mouseup', up);
  }

  /* ── Inline text editing ──────────────────────────── */
  function startEdit(elId) {
    setEditingId(elId);
    setTimeout(function () {
      if (editRef.current) { editRef.current.focus(); }
    }, 50);
  }
  function finishEdit() {
    if (editRef.current && editingId) {
      upd(editingId, { text: editRef.current.innerText });
    }
    setEditingId(null);
  }

  /* ── Keyboard shortcuts ───────────────────────────── */
  useEffect(function () {
    function kd(e) {
      if (editingId) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selId) { e.preventDefault(); delEl(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); save(); }
      if (e.key === 'Escape') { setSelId(null); setEditingId(null); }
    }
    document.addEventListener('keydown', kd);
    return function () { document.removeEventListener('keydown', kd); };
  }, [selId, editingId, save]);

  /* ── Loading state ────────────────────────────────── */
  if (!loaded) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#faf9f5' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );

  /* ── Styles (shared) ──────────────────────────────── */
  var S = {
    rBtn: { padding: '8px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    rBtnActive: { borderColor: '#8b5cf6', background: 'rgba(139,92,246,.1)', color: '#8b5cf6' },
    groupLabel: { fontSize: 12, color: '#334155', textAlign: 'center', marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
    panelLabel: { fontSize: 14, fontWeight: 700, color: '#334155', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
    panelInput: { width: '100%', padding: '9px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, color: '#0f172a', fontSize: 16, boxSizing: 'border-box', fontFamily: 'inherit' },
    divider: { width: 1, height: 48, background: '#f8fafc', flexShrink: 0 },
  };

  function rbtn(active) { return Object.assign({}, S.rBtn, active ? S.rBtnActive : {}); }

  /* ══════════════════════════════════════════════════════ */
  /*  RENDER                                                */
  /* ══════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'DM Sans, sans-serif', background: '#faf9f5', color: '#fff', overflow: 'hidden' }}>

      {/* ── TITLE BAR ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: 58, background: 'linear-gradient(90deg, #172554 0%, #1e3a8a 100%)', borderBottom: 'none', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={function () { if (dirty) save(); nav('/superdeck'); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit', fontSize: 14 }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ width: 1, height: 18, background: '#f8fafc' }} />
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Monitor size={13} color="#fff" />
          </div>
          <input value={title} onChange={function (e) { setTitle(e.target.value); mark(); }}
            style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: 20, fontWeight: 600, fontFamily: 'inherit', outline: 'none', width: 340 }}
            placeholder="Presentation title" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 14px', borderRadius: 6, border: 'none', background: dirty ? '#8b5cf6' : '#312e81', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Save size={12} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={function () { window.open('/api/superdeck/' + deckId + '/export', '_blank'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Download size={12} /> Download .pptx
          </button>
        </div>
      </div>

      {/* ── RIBBON TAB BAR ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, padding: '0 14px', height: 42, background: '#ffffff', borderBottom: '1px solid #e2e8f0', alignItems: 'flex-end', flexShrink: 0 }}>
        {['home', 'insert', 'design'].map(function (tab) {
          var isActive = ribbonTab === tab;
          return (
            <button key={tab} onClick={function () {
              if (ribbonTab === tab) { setRibbonOpen(!ribbonOpen); }
              else { setRibbonTab(tab); setRibbonOpen(true); }
            }}
              style={{ padding: '8px 24px', fontSize: 16, fontWeight: isActive ? 600 : 400, color: isActive ? '#c4b5fd' : '#64748b', background: isActive && ribbonOpen ? '#f1f5f9' : 'transparent', border: 'none', borderBottom: isActive && ribbonOpen ? '2px solid #8b5cf6' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1, textTransform: 'capitalize' }}>
              {tab}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button onClick={function () { setPanelOpen(!panelOpen); }}
          style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center', fontSize: 14, gap: 5, fontFamily: 'inherit' }}>
          {panelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          {panelOpen ? 'Hide panel' : 'Show panel'}
        </button>
      </div>

      {/* ── RIBBON CONTENT (collapsible) ───────────────── */}
      {ribbonOpen && (
        <div style={{ padding: '12px 18px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'flex-start', flexShrink: 0, minHeight: 88 }}>

          {ribbonTab === 'home' && <>
            {/* Clipboard group */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 3 }}>
                <button style={S.rBtn}><Scissors size={12} /> <span style={{ fontSize: 11, marginLeft: 2 }}>Cut</span></button>
                <button style={S.rBtn}><Clipboard size={12} /> <span style={{ fontSize: 11, marginLeft: 2 }}>Copy</span></button>
                <button style={S.rBtn}><Clipboard size={12} /> <span style={{ fontSize: 11, marginLeft: 2 }}>Paste</span></button>
              </div>
              <div style={S.groupLabel}>Clipboard</div>
            </div>

            <div style={S.divider} />

            {/* Font group */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12, color: '#6366f1', minWidth: 70, background: '#f8fafc' }}>
                  {selEl && selEl.fontFamily ? selEl.fontFamily.split(',')[0] : 'Sora'}
                </div>
                <input type="number" value={selEl ? (selEl.fontSize || 18) : 36}
                  onChange={function (e) { if (selEl) upd(selId, { fontSize: parseInt(e.target.value) || 18 }); }}
                  style={{ width: 56, padding: '6px 8px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12, color: '#fff', textAlign: 'center', background: '#f8fafc' }} />
                <button onClick={function () { if (selEl) upd(selId, { bold: !selEl.bold }); }} style={rbtn(selEl && selEl.bold)}>
                  <Bold size={13} />
                </button>
                <button onClick={function () { if (selEl) upd(selId, { italic: !selEl.italic }); }} style={rbtn(selEl && selEl.italic)}>
                  <Italic size={13} />
                </button>
                <button onClick={function () { if (selEl) upd(selId, { underline: !selEl.underline }); }} style={rbtn(selEl && selEl.underline)}>
                  <Underline size={13} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                {FONT_COLOURS.map(function (c) {
                  return (
                    <div key={c} onClick={function () { if (selEl) upd(selId, { color: c }); }}
                      style={{ width: 26, height: 26, borderRadius: 5, background: c, cursor: 'pointer', border: selEl && selEl.color === c ? '2px solid #8b5cf6' : '1px solid #312e81' }} />
                  );
                })}
                <input type="color" value={selEl ? (selEl.color || '#ffffff') : '#ffffff'}
                  onChange={function (e) { if (selEl) upd(selId, { color: e.target.value }); }}
                  style={{ width: 26, height: 26, border: 'none', borderRadius: 5, cursor: 'pointer' }} />
              </div>
              <div style={S.groupLabel}>Font</div>
            </div>

            <div style={S.divider} />

            {/* Paragraph group */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {[{ v: 'left', I: AlignLeft }, { v: 'center', I: AlignCenter }, { v: 'right', I: AlignRight }].map(function (a) {
                  return (
                    <button key={a.v} onClick={function () { if (selEl) upd(selId, { align: a.v }); }}
                      style={rbtn(selEl && (selEl.align || 'left') === a.v)}>
                      <a.I size={13} />
                    </button>
                  );
                })}
              </div>
              <div style={S.groupLabel}>Paragraph</div>
            </div>

            <div style={S.divider} />

            {/* Insert mini-group */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={function () { document.getElementById('sd-img-upload').click(); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Upload size={16} /> Upload
                </button>
                {[{ k: 'image', l: 'Image', I: Image }, { k: 'shape', l: 'Shape', I: Square }, { k: 'text', l: 'Text box', I: Type }].map(function (b) {
                  return (
                    <button key={b.k} onClick={function () { addEl(b.k === 'text' ? 'heading' : b.k); }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <b.I size={16} /> {b.l}
                    </button>
                  );
                })}
              </div>
              <div style={S.groupLabel}>Insert</div>
              <input id="sd-img-upload" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={function (e) { if (e.target.files && e.target.files[0]) uploadImage(e.target.files[0]); e.target.value = ''; }} />
            </div>

            <div style={S.divider} />

            {/* AI group */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 24px', borderRadius: 10, border: '1px solid rgba(139,92,246,.3)', background: 'rgba(139,92,246,.06)', color: '#8b5cf6', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Sparkles size={14} /> AI generate
              </button>
              <div style={S.groupLabel}>AI assistant</div>
            </div>
          </>}

          {ribbonTab === 'insert' && <>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={function () { document.getElementById('sd-img-upload').click(); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#475569', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Upload size={20} /> Upload image
              </button>
              {[{ k: 'heading', l: 'Heading', I: Type }, { k: 'text', l: 'Body text', I: AlignLeft }, { k: 'image', l: 'Image URL', I: Image }, { k: 'shape', l: 'Shape', I: Square }].map(function (b) {
                return (
                  <button key={b.k} onClick={function () { addEl(b.k); }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#475569', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <b.I size={20} /> {b.l}
                  </button>
                );
              })}
            </div>
            <div style={S.divider} />
            <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '14px 26px', borderRadius: 10, border: '1px solid rgba(139,92,246,.3)', background: 'rgba(139,92,246,.06)', color: '#8b5cf6', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Sparkles size={14} /> AI generate slide
            </button>
          </>}

          {ribbonTab === 'design' && <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Background</span>
              <input type="color" value={cs.background || t.primary} onChange={function (e) { updBg(e.target.value); }}
                style={{ width: 26, height: 26, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
              {[t.primary, t.secondary, t.surface, '#ffffff', '#0f172a', '#1e1b4b'].map(function (c) {
                return <div key={c} onClick={function () { updBg(c); }}
                  style={{ width: 30, height: 30, borderRadius: 6, background: c, cursor: 'pointer', border: cs.background === c ? '2px solid #8b5cf6' : '1px solid #312e81' }} />;
              })}
            </div>
            <div style={S.divider} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Theme</span>
              {THEME_KEYS.map(function (k) {
                var th = THEMES[k];
                return <div key={k} onClick={function () { setTheme(k); mark(); }} title={th.name}
                  style={{ width: 22, height: 22, borderRadius: 4, background: th.primary, cursor: 'pointer', border: theme === k ? '2px solid #8b5cf6' : '1px solid #312e81' }} />;
              })}
            </div>
          </>}
        </div>
      )}

      {/* ── MAIN AREA ──────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── LEFT: Slide thumbnails ────────────────────── */}
        <div style={{ width: 180, borderRight: '1px solid #e2e8f0', background: '#ffffff', padding: '8px 6px', overflowY: 'auto', flexShrink: 0 }}>
          {slides.map(function (s, i) {
            var isA = i === active;
            return (
              <div key={s.id || i} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, color: '#334155', width: 14, textAlign: 'right', paddingTop: 4, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div onClick={function () { setActive(i); setSelId(null); setEditingId(null); }}
                      style={{ borderRadius: 4, border: isA ? '2px solid #8b5cf6' : '1px solid #1e1b4b', overflow: 'hidden', cursor: 'pointer' }}>
                      <div style={{ aspectRatio: '16/9', background: s.background || t.primary, padding: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        {s.elements.slice(0, 2).map(function (el, ei) {
                          if (el.type === 'heading') return <div key={ei} style={{ fontSize: 6, fontWeight: 700, color: el.color || '#fff', textAlign: 'center', overflow: 'hidden', maxHeight: 14 }}>{(el.text || '').slice(0, 25)}</div>;
                          if (el.type === 'text') return <div key={ei} style={{ fontSize: 4, color: el.color || '#999', textAlign: 'center', overflow: 'hidden', maxHeight: 8, marginTop: 1 }}>{(el.text || '').slice(0, 35)}</div>;
                          if (el.type === 'image') return <div key={ei} style={{ width: '30%', height: 8, borderRadius: 1, background: '#334155', marginTop: 2 }} />;
                          if (el.type === 'shape') return <div key={ei} style={{ width: 12, height: 8, borderRadius: el.shapeType === 'circle' ? '50%' : 1, background: el.fill || '#8b5cf6', marginTop: 2 }} />;
                          return null;
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 3, padding: '2px 0' }}>
                      <button onClick={function () { dupSlide(i); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 1 }}><Copy size={9} /></button>
                      <button onClick={function () { delSlide(i); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 1 }}><Trash2 size={9} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ width: 14 }} />
            <button onClick={addSlide} style={{ flex: 1, padding: '8px 0', border: '1.5px dashed #cbd5e1', borderRadius: 4, background: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Plus size={12} /> Add
            </button>
          </div>
        </div>

        {/* ── CENTRE: Canvas ────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#faf9f5', padding: 20, minWidth: 0 }}
          onClick={function () { if (editingId) finishEdit(); setSelId(null); }}>

          <div ref={canvasRef}
            style={{ width: '100%', maxWidth: 820, aspectRatio: '16/9', background: cs.background || t.primary, borderRadius: 3, position: 'relative', overflow: 'hidden', boxShadow: '0 6px 30px rgba(0,0,0,.4)' }}>

            {cs.elements.map(function (el) {
              var isSel = el.id === selId;
              var isEdit = el.id === editingId;
              var pctX = (el.x / CANVAS_W) * 100;
              var pctY = (el.y / CANVAS_H) * 100;
              var pctW = (el.w / CANVAS_W) * 100;
              var pctH = (el.h / CANVAS_H) * 100;

              return (
                <div key={el.id}
                  onMouseDown={function (e) { if (!isEdit) onElMouseDown(e, el.id); }}
                  onDoubleClick={function (e) {
                    e.stopPropagation();
                    if (el.type === 'heading' || el.type === 'text') startEdit(el.id);
                    else if (el.type === 'image') {
                      var inp = document.createElement('input');
                      inp.type = 'file'; inp.accept = 'image/*';
                      inp.onchange = function () {
                        if (inp.files && inp.files[0]) {
                          var fd = new FormData();
                          fd.append('file', inp.files[0]);
                          fd.append('folder', 'superdeck');
                          fetch('/api/upload-media', { method: 'POST', body: fd, credentials: 'include' })
                            .then(function (r) { return r.json(); })
                            .then(function (d) { if (d.url) upd(el.id, { src: d.url }); });
                        }
                      };
                      inp.click();
                    }
                  }}
                  onClick={function (e) { e.stopPropagation(); if (!isEdit) setSelId(el.id); }}
                  style={{
                    position: 'absolute',
                    left: pctX + '%', top: pctY + '%',
                    width: pctW + '%', height: pctH + '%',
                    cursor: isEdit ? 'text' : 'move',
                    outline: isSel && !isEdit ? '2px solid #3b82f6' : 'none',
                    borderRadius: 2, boxSizing: 'border-box',
                    zIndex: isSel ? 10 : 1,
                  }}>

                  {/* Text / Heading */}
                  {(el.type === 'heading' || el.type === 'text') && (
                    isEdit ? (
                      <div ref={editRef} contentEditable suppressContentEditableWarning
                        onBlur={finishEdit}
                        onKeyDown={function (e) { if (e.key === 'Escape') finishEdit(); }}
                        style={{
                          fontSize: Math.max(10, el.fontSize * 0.65) + 'px',
                          fontWeight: el.bold ? 700 : 400,
                          fontStyle: el.italic ? 'italic' : 'normal',
                          textDecoration: el.underline ? 'underline' : 'none',
                          color: el.color || '#fff',
                          textAlign: el.align || 'left',
                          fontFamily: el.fontFamily || t.bodyFont,
                          width: '100%', height: '100%',
                          outline: '2px solid #8b5cf6',
                          padding: '4px 6px', lineHeight: 1.3,
                          overflow: 'hidden',
                          background: 'rgba(0,0,0,.15)',
                          borderRadius: 2,
                        }}>{el.text || ''}</div>
                    ) : (
                      <div style={{
                        fontSize: Math.max(10, el.fontSize * 0.65) + 'px',
                        fontWeight: el.bold ? 700 : 400,
                        fontStyle: el.italic ? 'italic' : 'normal',
                        textDecoration: el.underline ? 'underline' : 'none',
                        color: el.color || '#fff',
                        textAlign: el.align || 'left',
                        fontFamily: el.fontFamily || t.bodyFont,
                        width: '100%', height: '100%',
                        overflow: 'hidden', padding: '4px 6px',
                        display: 'flex',
                        alignItems: el.type === 'heading' ? 'center' : 'flex-start',
                        justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
                        lineHeight: 1.3, userSelect: 'none',
                      }}>{el.text || ''}</div>
                    )
                  )}

                  {/* Image */}
                  {el.type === 'image' && (
                    el.src
                      ? <img src={el.src} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, pointerEvents: 'none' }} alt="" />
                      : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,.05)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #312e81' }}>
                        <Image size={24} color="#475569" />
                      </div>
                  )}

                  {/* Shape */}
                  {el.type === 'shape' && (
                    <div style={{ width: '100%', height: '100%', background: el.fill || t.accent, borderRadius: el.shapeType === 'circle' ? '50%' : 4 }} />
                  )}

                  {/* 8-point resize handles */}
                  {isSel && !isEdit && ['tl', 't', 'tr', 'r', 'br', 'b', 'bl', 'l'].map(function (c) {
                    var hs = { position: 'absolute', width: 10, height: 10, background: '#3b82f6', borderRadius: 2, zIndex: 20 };
                    var cursors = { tl: 'nwse-resize', t: 'ns-resize', tr: 'nesw-resize', r: 'ew-resize', br: 'nwse-resize', b: 'ns-resize', bl: 'nesw-resize', l: 'ew-resize' };
                    hs.cursor = cursors[c];
                    if (c.includes('t')) hs.top = -5;
                    if (c.includes('b')) hs.bottom = -5;
                    if (c.includes('l')) hs.left = -5;
                    if (c.includes('r')) hs.right = -5;
                    if (c === 't' || c === 'b') { hs.left = '50%'; hs.transform = 'translateX(-50%)'; }
                    if (c === 'l' || c === 'r') { hs.top = '50%'; hs.transform = 'translateY(-50%)'; }
                    return <div key={c} onMouseDown={function (e) { onResizeDown(e, el.id, c); }} style={hs} />;
                  })}
                </div>
              );
            })}
          </div>

          {/* Speaker notes + counter */}
          <div style={{ width: '100%', maxWidth: 820, marginTop: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#334155', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Speaker notes</div>
              <textarea value={cs.notes || ''} onChange={function (e) { updNotes(e.target.value); }}
                placeholder="Add notes for this slide..."
                rows={2}
                style={{ width: '100%', padding: '6px 8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4, color: '#94a3b8', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ fontSize: 14, color: '#334155', paddingTop: 18 }}>Slide {active + 1} of {slides.length}</div>
          </div>
        </div>

        {/* ── RIGHT: Properties panel (collapsible) ────── */}
        {panelOpen && (
          <div style={{ width: 280, borderLeft: '1px solid #e2e8f0', background: '#ffffff', padding: '18px 20px', overflowY: 'auto', flexShrink: 0 }}>

            {/* FORMAT SHAPE */}
            {selEl && <>
              <div style={S.panelLabel}>Format shape</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>Position</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#334155', marginBottom: 2 }}>X</div>
                    <input type="number" value={selEl.x} onChange={function (e) { upd(selId, { x: parseInt(e.target.value) || 0 }); }} style={S.panelInput} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#334155', marginBottom: 2 }}>Y</div>
                    <input type="number" value={selEl.y} onChange={function (e) { upd(selId, { y: parseInt(e.target.value) || 0 }); }} style={S.panelInput} />
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>Size</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#334155', marginBottom: 2 }}>W</div>
                    <input type="number" value={selEl.w} onChange={function (e) { upd(selId, { w: Math.max(20, parseInt(e.target.value) || 40) }); }} style={S.panelInput} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#334155', marginBottom: 2 }}>H</div>
                    <input type="number" value={selEl.h} onChange={function (e) { upd(selId, { h: Math.max(10, parseInt(e.target.value) || 20) }); }} style={S.panelInput} />
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginBottom: 12 }}>
                <button onClick={delEl} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #7f1d1d', background: 'rgba(127,29,29,.08)', color: '#fca5a5', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Trash2 size={11} /> Delete element
                </button>
              </div>
            </>}

            {/* SLIDE DESIGN */}
            <div style={{ borderTop: selEl ? '1px solid #1e1b4b' : 'none', paddingTop: selEl ? 12 : 0, marginBottom: 12 }}>
              <div style={S.panelLabel}>Slide design</div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Background</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                {[t.primary, t.secondary, t.surface, '#ffffff', '#0f172a', '#7f1d1d'].map(function (c) {
                  return <div key={c} onClick={function () { updBg(c); }}
                    style={{ width: 30, height: 30, borderRadius: 6, background: c, cursor: 'pointer', border: cs.background === c ? '2px solid #8b5cf6' : '1px solid #312e81' }} />;
                })}
                <input type="color" value={cs.background || t.primary} onChange={function (e) { updBg(e.target.value); }}
                  style={{ width: 30, height: 30, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
              </div>

              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Theme</div>
              <div style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, cursor: 'pointer' }}>
                <div style={{ width: 24, height: 24, borderRadius: 5, background: t.primary }} />
                <span style={{ fontSize: 12, color: '#6366f1', flex: 1 }}>{t.name}</span>
                <span style={{ fontSize: 12, color: '#334155' }}>v</span>
              </div>

              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Transition</div>
              <div style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#6366f1', marginBottom: 10 }}>
                Fade
              </div>
            </div>

            {/* LAYERS */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={S.panelLabel}>Layers</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  <button onClick={moveElForward} title="Bring forward"
                    style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'transparent', color: selId ? '#475569' : '#cbd5e1', cursor: selId ? 'pointer' : 'default', display: 'flex' }}>
                    <ArrowUp size={12} />
                  </button>
                  <button onClick={moveElBackward} title="Send backward"
                    style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'transparent', color: selId ? '#475569' : '#cbd5e1', cursor: selId ? 'pointer' : 'default', display: 'flex' }}>
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>
              {cs.elements.map(function (el) {
                var isSel = el.id === selId;
                var label = '';
                if (el.type === 'heading') label = 'Heading: "' + (el.text || '').slice(0, 18) + '..."';
                else if (el.type === 'text') label = 'Text: "' + (el.text || '').slice(0, 18) + '..."';
                else if (el.type === 'image') label = el.src ? 'Image' : 'Image (empty)';
                else if (el.type === 'shape') label = 'Shape (' + (el.shapeType || 'rect') + ')';
                return (
                  <div key={el.id}
                    onClick={function (e) { e.stopPropagation(); setSelId(el.id); }}
                    style={{
                      padding: '8px 14px', borderRadius: 6, marginBottom: 4, cursor: 'pointer',
                      fontSize: 14, color: isSel ? '#8b5cf6' : '#334155',
                      background: isSel ? 'rgba(139,92,246,.08)' : 'transparent',
                      border: isSel ? '1px solid rgba(139,92,246,.2)' : '1px solid transparent',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                    <span>{label}</span>
                    {isSel && <button onClick={function (e) { e.stopPropagation(); delEl(); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2, display: 'flex' }}>
                      <Trash2 size={11} />
                    </button>}
                  </div>
                );
              })}
              {cs.elements.length === 0 && (
                <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No elements yet</div>
              )}
              {cs.elements.length > 1 && (
                <button onClick={delAllEls}
                  style={{ width: '100%', marginTop: 8, padding: '7px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <XCircle size={13} /> Clear all elements
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
