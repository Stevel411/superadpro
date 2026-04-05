import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../../utils/api';
import { THEMES, THEME_KEYS } from './themes';
import { Type, Image, Square, Plus, Trash2, Copy, Download, Save, ArrowLeft, AlignLeft, AlignCenter, AlignRight, Bold, Italic, ChevronDown, ChevronUp, Layers, Palette, SlidersHorizontal, Sparkles, Monitor } from 'lucide-react';

var UID = function() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

export default function SuperDeckEditor() {
  var { deckId } = useParams();
  var nav = useNavigate();
  var [slides, setSlides] = useState([]);
  var [activeSlide, setActiveSlide] = useState(0);
  var [selectedEl, setSelectedEl] = useState(null);
  var [theme, setTheme] = useState('midnight');
  var [title, setTitle] = useState('');
  var [saving, setSaving] = useState(false);
  var [dirty, setDirty] = useState(false);
  var [loaded, setLoaded] = useState(false);
  var [ribbonTab, setRibbonTab] = useState(null);
  var [editingText, setEditingText] = useState(null);
  var canvasRef = useRef(null);
  var editRef = useRef(null);

  useEffect(function() {
    apiGet('/api/superdeck/' + deckId).then(function(d) {
      setSlides(d.slides || []); setTheme(d.theme || 'midnight');
      setTitle(d.title || ''); setLoaded(true);
    }).catch(function() { nav('/superdeck'); });
  }, [deckId]);

  var t = THEMES[theme] || THEMES.midnight;

  var save = useCallback(function() {
    setSaving(true);
    apiPost('/api/superdeck/' + deckId + '/save', { title: title, theme: theme, slides: slides })
      .then(function() { setSaving(false); setDirty(false); })
      .catch(function() { setSaving(false); });
  }, [deckId, title, theme, slides]);

  useEffect(function() {
    var iv = setInterval(function() { if (dirty) save(); }, 30000);
    return function() { clearInterval(iv); };
  }, [dirty, save]);

  function mark() { setDirty(true); }
  var cs = slides[activeSlide] || { elements: [], background: t.primary, notes: '' };
  var selEl = selectedEl ? cs.elements.find(function(e) { return e.id === selectedEl; }) : null;

  // Slide ops
  function addSlide() {
    var ns = slides.slice();
    ns.push({ id: UID(), elements: [], background: t.primary, notes: '' });
    setSlides(ns); setActiveSlide(ns.length - 1); setSelectedEl(null); mark();
  }
  function dupSlide(i) {
    var ns = slides.slice();
    var c = JSON.parse(JSON.stringify(ns[i]));
    c.id = UID(); c.elements = c.elements.map(function(e) { return Object.assign({}, e, { id: UID() }); });
    ns.splice(i + 1, 0, c); setSlides(ns); setActiveSlide(i + 1); mark();
  }
  function delSlide(i) {
    if (slides.length <= 1) return;
    var ns = slides.filter(function(_, j) { return j !== i; });
    setSlides(ns); if (activeSlide >= ns.length) setActiveSlide(ns.length - 1); setSelectedEl(null); mark();
  }

  // Element ops
  function addElement(type) {
    var el = { id: UID(), type: type, x: 150, y: 150, w: 400, h: 60 };
    if (type === 'heading') { Object.assign(el, { text: 'Click to edit heading', fontSize: 36, color: t.text, bold: true, align: 'center', fontFamily: t.headingFont, w: 600, h: 80, x: 200, y: 200 }); }
    else if (type === 'text') { Object.assign(el, { text: 'Click to edit text', fontSize: 18, color: t.muted, align: 'left', fontFamily: t.bodyFont, w: 500, h: 50, x: 250, y: 300 }); }
    else if (type === 'image') { Object.assign(el, { src: '', w: 300, h: 200, x: 350, y: 180 }); }
    else if (type === 'shape') { Object.assign(el, { shapeType: 'rect', fill: t.accent, w: 200, h: 120, x: 400, y: 220 }); }
    var ns = slides.slice();
    ns[activeSlide] = Object.assign({}, ns[activeSlide], { elements: ns[activeSlide].elements.concat([el]) });
    setSlides(ns); setSelectedEl(el.id); setRibbonTab(null); mark();
  }

  function upd(id, u) {
    var ns = slides.slice(); var s = Object.assign({}, ns[activeSlide]);
    s.elements = s.elements.map(function(e) { return e.id === id ? Object.assign({}, e, u) : e; });
    ns[activeSlide] = s; setSlides(ns); mark();
  }

  function delEl() {
    if (!selectedEl) return;
    var ns = slides.slice(); var s = Object.assign({}, ns[activeSlide]);
    s.elements = s.elements.filter(function(e) { return e.id !== selectedEl; });
    ns[activeSlide] = s; setSlides(ns); setSelectedEl(null); mark();
  }

  function updBg(c) {
    var ns = slides.slice(); ns[activeSlide] = Object.assign({}, ns[activeSlide], { background: c }); setSlides(ns); mark();
  }

  function updNotes(t) {
    var ns = slides.slice(); ns[activeSlide] = Object.assign({}, ns[activeSlide], { notes: t }); setSlides(ns); mark();
  }

  // Canvas drag
  function onElMouseDown(e, elId) {
    e.stopPropagation(); setSelectedEl(elId); setEditingText(null);
    var rect = canvasRef.current.getBoundingClientRect();
    var el = cs.elements.find(function(x) { return x.id === elId; });
    if (!el) return;
    var scX = 1000 / rect.width, scY = 562.5 / rect.height;
    var sx = e.clientX, sy = e.clientY, ox = el.x, oy = el.y;
    function mv(ev) { upd(elId, { x: Math.max(0, Math.round(ox + (ev.clientX - sx) * scX)), y: Math.max(0, Math.round(oy + (ev.clientY - sy) * scY)) }); }
    function up() { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  }

  // Canvas resize
  function onResizeDown(e, elId, corner) {
    e.stopPropagation(); e.preventDefault();
    var rect = canvasRef.current.getBoundingClientRect();
    var el = cs.elements.find(function(x) { return x.id === elId; });
    if (!el) return;
    var scX = 1000 / rect.width, scY = 562.5 / rect.height;
    var sx = e.clientX, sy = e.clientY;
    var ox = el.x, oy = el.y, ow = el.w, oh = el.h;
    function mv(ev) {
      var dx = (ev.clientX - sx) * scX, dy = (ev.clientY - sy) * scY;
      var u = {};
      if (corner.includes('r')) u.w = Math.max(40, Math.round(ow + dx));
      if (corner.includes('l')) { u.x = Math.round(ox + dx); u.w = Math.max(40, Math.round(ow - dx)); }
      if (corner.includes('b')) u.h = Math.max(20, Math.round(oh + dy));
      if (corner.includes('t')) { u.y = Math.round(oy + dy); u.h = Math.max(20, Math.round(oh - dy)); }
      upd(elId, u);
    }
    function up() { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  }

  // Inline text editing
  function startEditing(elId) {
    setEditingText(elId);
    setTimeout(function() { if (editRef.current) { editRef.current.focus(); editRef.current.select(); } }, 50);
  }

  function finishEditing() {
    if (editRef.current && editingText) {
      upd(editingText, { text: editRef.current.innerText });
    }
    setEditingText(null);
  }

  // Keyboard shortcuts
  useEffect(function() {
    function kd(e) {
      if (editingText) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEl) { e.preventDefault(); delEl(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); save(); }
    }
    document.addEventListener('keydown', kd);
    return function() { document.removeEventListener('keydown', kd); };
  }, [selectedEl, editingText, save]);

  if (!loaded) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0920' }}>
    <div style={{ width: 40, height: 40, border: '3px solid #222', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin .8s linear infinite' }}/>
    <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
  </div>;

  var RIBBON_TABS = [
    { key: 'insert', label: 'Insert' },
    { key: 'format', label: 'Format' },
    { key: 'design', label: 'Design' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'DM Sans, sans-serif', background: '#0a0920', color: '#fff', overflow: 'hidden' }}>

      {/* Title bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 44, background: '#0f0e2a', borderBottom: '1px solid #1a1840', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={function() { if (dirty) save(); nav('/superdeck'); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit', fontSize: 12 }}>
            <ArrowLeft size={14}/> Back
          </button>
          <div style={{ width: 1, height: 20, background: '#1e1b4b' }}/>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Monitor size={12} color="#fff"/>
          </div>
          <input value={title} onChange={function(e) { setTitle(e.target.value); mark(); }}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', outline: 'none', width: 280 }}
            placeholder="Presentation title"/>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 6, border: '1px solid #1e1b4b', background: dirty ? '#312e81' : 'transparent', color: dirty ? '#c4b5fd' : '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Save size={12}/> {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={function() { window.open('/api/superdeck/' + deckId + '/export', '_blank'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Download size={12}/> Download .pptx
          </button>
        </div>
      </div>

      {/* Ribbon tabs row */}
      <div style={{ display: 'flex', gap: 0, padding: '0 16px', height: 32, background: '#0f0e2a', borderBottom: '1px solid #1a1840', alignItems: 'flex-end', flexShrink: 0 }}>
        {RIBBON_TABS.map(function(rt) {
          var active = ribbonTab === rt.key;
          return <button key={rt.key} onClick={function() { setRibbonTab(active ? null : rt.key); }}
            style={{ padding: '6px 18px', fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#c4b5fd' : '#64748b', background: active ? '#1a1840' : 'transparent', border: 'none', borderBottom: active ? '2px solid #8b5cf6' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>
            {rt.label}
          </button>;
        })}
      </div>

      {/* Ribbon content — collapsible */}
      {ribbonTab && (
        <div style={{ padding: '10px 16px', background: '#0f0e2a', borderBottom: '1px solid #1a1840', display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>

          {ribbonTab === 'insert' && <>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ k: 'heading', l: 'Heading', I: Type }, { k: 'text', l: 'Body text', I: AlignLeft }, { k: 'image', l: 'Image', I: Image }, { k: 'shape', l: 'Shape', I: Square }].map(function(b) {
                return <button key={b.k} onClick={function() { addElement(b.k); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 16px', borderRadius: 8, border: '1px solid #1e1b4b', background: 'transparent', color: '#a5b4fc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <b.I size={18}/> {b.l}
                </button>;
              })}
            </div>
            <div style={{ width: 1, height: 40, background: '#1e1b4b' }}/>
            <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(139,92,246,.2)', background: 'rgba(139,92,246,.06)', color: '#8b5cf6', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Sparkles size={14}/> AI generate slide
            </button>
          </>}

          {ribbonTab === 'format' && selEl && <>
            {(selEl.type === 'heading' || selEl.type === 'text') && <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Size</span>
                <input type="number" value={selEl.fontSize || 18} onChange={function(e) { upd(selEl.id, { fontSize: parseInt(e.target.value) || 18 }); }}
                  style={{ width: 50, padding: '5px 6px', background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 4, color: '#fff', fontSize: 12, textAlign: 'center' }}/>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={function() { upd(selEl.id, { bold: !selEl.bold }); }}
                  style={{ padding: '5px 8px', borderRadius: 4, border: selEl.bold ? '1px solid #8b5cf6' : '1px solid #312e81', background: selEl.bold ? 'rgba(139,92,246,.1)' : 'transparent', color: selEl.bold ? '#8b5cf6' : '#64748b', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>B</button>
                <button onClick={function() { upd(selEl.id, { italic: !selEl.italic }); }}
                  style={{ padding: '5px 8px', borderRadius: 4, border: selEl.italic ? '1px solid #8b5cf6' : '1px solid #312e81', background: selEl.italic ? 'rgba(139,92,246,.1)' : 'transparent', color: selEl.italic ? '#8b5cf6' : '#64748b', cursor: 'pointer', fontStyle: 'italic', fontSize: 13 }}>I</button>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {['left', 'center', 'right'].map(function(a) {
                  var I = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
                  var act = (selEl.align || 'left') === a;
                  return <button key={a} onClick={function() { upd(selEl.id, { align: a }); }}
                    style={{ padding: '5px 8px', borderRadius: 4, border: act ? '1px solid #8b5cf6' : '1px solid #312e81', background: act ? 'rgba(139,92,246,.1)' : 'transparent', color: act ? '#8b5cf6' : '#64748b', cursor: 'pointer' }}>
                    <I size={14}/>
                  </button>;
                })}
              </div>
              <div style={{ width: 1, height: 30, background: '#1e1b4b' }}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Colour</span>
                <input type="color" value={selEl.color || '#ffffff'} onChange={function(e) { upd(selEl.id, { color: e.target.value }); }}
                  style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer' }}/>
              </div>
            </>}
            {selEl.type === 'shape' && <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Fill</span>
                <input type="color" value={selEl.fill || '#8b5cf6'} onChange={function(e) { upd(selEl.id, { fill: e.target.value }); }}
                  style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer' }}/>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={function() { upd(selEl.id, { shapeType: 'rect' }); }}
                  style={{ padding: '5px 12px', borderRadius: 4, border: selEl.shapeType !== 'circle' ? '1px solid #8b5cf6' : '1px solid #312e81', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>Rect</button>
                <button onClick={function() { upd(selEl.id, { shapeType: 'circle' }); }}
                  style={{ padding: '5px 12px', borderRadius: 4, border: selEl.shapeType === 'circle' ? '1px solid #8b5cf6' : '1px solid #312e81', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>Circle</button>
              </div>
            </>}
            {selEl.type === 'image' && <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>URL</span>
                <input value={selEl.src || ''} onChange={function(e) { upd(selEl.id, { src: e.target.value }); }}
                  placeholder="https://..." style={{ width: 250, padding: '5px 8px', background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 4, color: '#fff', fontSize: 12 }}/>
              </div>
            </>}
            <div style={{ width: 1, height: 30, background: '#1e1b4b' }}/>
            <button onClick={delEl} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: '1px solid #7f1d1d', background: 'rgba(127,29,29,.08)', color: '#fca5a5', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Trash2 size={12}/> Delete
            </button>
          </>}
          {ribbonTab === 'format' && !selEl && <div style={{ fontSize: 12, color: '#475569' }}>Select an element on the canvas to format it</div>}

          {ribbonTab === 'design' && <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Background</span>
              <input type="color" value={cs.background || t.primary} onChange={function(e) { updBg(e.target.value); }}
                style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer' }}/>
              {[t.primary, t.secondary, t.surface, '#ffffff', '#0f172a'].map(function(c) {
                return <div key={c} onClick={function() { updBg(c); }}
                  style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer', border: cs.background === c ? '2px solid #8b5cf6' : '1px solid #312e81' }}/>;
              })}
            </div>
            <div style={{ width: 1, height: 30, background: '#1e1b4b' }}/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Theme</span>
              {THEME_KEYS.map(function(k) {
                var th = THEMES[k];
                return <div key={k} onClick={function() { setTheme(k); mark(); }} title={th.name}
                  style={{ width: 24, height: 24, borderRadius: 4, background: th.primary, cursor: 'pointer', border: theme === k ? '2px solid #8b5cf6' : '1px solid #312e81' }}/>;
              })}
            </div>
          </>}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Left: slide thumbnails */}
        <div style={{ width: 140, borderRight: '1px solid #1a1840', background: '#0f0e2a', padding: '8px 6px', overflowY: 'auto', flexShrink: 0 }}>
          {slides.map(function(s, i) {
            var isA = i === activeSlide;
            return <div key={s.id || i} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, color: '#475569', width: 14, textAlign: 'right', paddingTop: 4, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div onClick={function() { setActiveSlide(i); setSelectedEl(null); setEditingText(null); }}
                    style={{ borderRadius: 4, border: isA ? '2px solid #8b5cf6' : '1px solid #1e1b4b', overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ aspectRatio: '16/9', background: s.background || t.primary, padding: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      {s.elements.slice(0, 2).map(function(el, ei) {
                        if (el.type === 'heading') return <div key={ei} style={{ fontSize: 6, fontWeight: 700, color: el.color || '#fff', textAlign: 'center', overflow: 'hidden', maxHeight: 14 }}>{(el.text || '').slice(0, 25)}</div>;
                        if (el.type === 'text') return <div key={ei} style={{ fontSize: 4, color: el.color || '#999', textAlign: 'center', overflow: 'hidden', maxHeight: 8, marginTop: 1 }}>{(el.text || '').slice(0, 35)}</div>;
                        if (el.type === 'image') return <div key={ei} style={{ width: '30%', height: 8, borderRadius: 1, background: '#334155', marginTop: 2 }}/>;
                        if (el.type === 'shape') return <div key={ei} style={{ width: 12, height: 8, borderRadius: el.shapeType === 'circle' ? '50%' : 1, background: el.fill || '#8b5cf6', marginTop: 2 }}/>;
                        return null;
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2, padding: '2px 0' }}>
                    <button onClick={function() { dupSlide(i); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 1 }}><Copy size={9}/></button>
                    <button onClick={function() { delSlide(i); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 1 }}><Trash2 size={9}/></button>
                  </div>
                </div>
              </div>
            </div>;
          })}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ width: 14 }}/>
            <button onClick={addSlide} style={{ flex: 1, padding: '8px 0', border: '1.5px dashed #312e81', borderRadius: 4, background: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Plus size={12}/> Add
            </button>
          </div>
        </div>

        {/* Centre: canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080718', padding: 20 }}
          onClick={function() { if (editingText) finishEditing(); setSelectedEl(null); }}>
          <div ref={canvasRef}
            style={{ width: '100%', maxWidth: 820, aspectRatio: '16/9', background: cs.background || t.primary, borderRadius: 3, position: 'relative', overflow: 'hidden', boxShadow: '0 6px 30px rgba(0,0,0,.4)' }}>

            {cs.elements.map(function(el) {
              var isSel = el.id === selectedEl;
              var isEdit = el.id === editingText;
              var sx = (el.x / 1000) * 100, sy = (el.y / 562.5) * 100;
              var sw = (el.w / 1000) * 100, sh = (el.h / 562.5) * 100;

              return <div key={el.id}
                onMouseDown={function(e) { if (!isEdit) onElMouseDown(e, el.id); }}
                onDoubleClick={function(e) {
                  e.stopPropagation();
                  if (el.type === 'heading' || el.type === 'text') { startEditing(el.id); }
                  else if (el.type === 'image') {
                    var src = window.prompt('Image URL:', el.src || '');
                    if (src !== null) upd(el.id, { src: src });
                  }
                }}
                onClick={function(e) { e.stopPropagation(); if (!isEdit) { setSelectedEl(el.id); setRibbonTab('format'); } }}
                style={{
                  position: 'absolute', left: sx + '%', top: sy + '%', width: sw + '%', height: sh + '%',
                  cursor: isEdit ? 'text' : 'move',
                  outline: isSel && !isEdit ? '2px solid #3b82f6' : 'none',
                  borderRadius: 2, boxSizing: 'border-box', zIndex: isSel ? 10 : 1,
                }}>

                {(el.type === 'heading' || el.type === 'text') && (
                  isEdit ? (
                    <div ref={editRef} contentEditable suppressContentEditableWarning
                      onBlur={finishEditing}
                      onKeyDown={function(e) { if (e.key === 'Escape') finishEditing(); }}
                      style={{
                        fontSize: Math.max(10, el.fontSize * 0.65) + 'px', fontWeight: el.bold ? 700 : 400,
                        fontStyle: el.italic ? 'italic' : 'normal', color: el.color || '#fff',
                        textAlign: el.align || 'left', fontFamily: el.fontFamily || t.bodyFont,
                        width: '100%', height: '100%', outline: '2px solid #8b5cf6', padding: '4px 6px',
                        lineHeight: 1.3, overflow: 'hidden', background: 'rgba(0,0,0,.15)', borderRadius: 2,
                      }}>{el.text || ''}</div>
                  ) : (
                    <div style={{
                      fontSize: Math.max(10, el.fontSize * 0.65) + 'px', fontWeight: el.bold ? 700 : 400,
                      fontStyle: el.italic ? 'italic' : 'normal', color: el.color || '#fff',
                      textAlign: el.align || 'left', fontFamily: el.fontFamily || t.bodyFont,
                      width: '100%', height: '100%', overflow: 'hidden', padding: '4px 6px',
                      display: 'flex', alignItems: el.type === 'heading' ? 'center' : 'flex-start',
                      justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
                      lineHeight: 1.3, userSelect: 'none',
                    }}>{el.text || ''}</div>
                  )
                )}

                {el.type === 'image' && (
                  el.src ? <img src={el.src} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, pointerEvents: 'none' }} alt=""/>
                    : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,.05)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #312e81' }}>
                        <Image size={24} color="#475569"/>
                      </div>
                )}

                {el.type === 'shape' && (
                  <div style={{ width: '100%', height: '100%', background: el.fill || t.accent, borderRadius: el.shapeType === 'circle' ? '50%' : 4 }}/>
                )}

                {/* Resize handles — 8 points */}
                {isSel && !isEdit && <>
                  {['tl','t','tr','r','br','b','bl','l'].map(function(c) {
                    var s = {};
                    if (c.includes('t')) s.top = -5;
                    if (c.includes('b')) s.bottom = -5;
                    if (c.includes('l')) s.left = -5;
                    if (c.includes('r')) s.right = -5;
                    if (c === 't' || c === 'b') { s.left = '50%'; s.transform = 'translateX(-50%)'; }
                    if (c === 'l' || c === 'r') { s.top = '50%'; s.transform = 'translateY(-50%)'; }
                    var corner = '';
                    if (c === 'tl') corner = 'tl';
                    if (c === 't') corner = 't';
                    if (c === 'tr') corner = 'tr';
                    if (c === 'r') corner = 'r';
                    if (c === 'br') corner = 'br';
                    if (c === 'b') corner = 'b';
                    if (c === 'bl') corner = 'bl';
                    if (c === 'l') corner = 'l';
                    var cursors = { tl: 'nwse-resize', t: 'ns-resize', tr: 'nesw-resize', r: 'ew-resize', br: 'nwse-resize', b: 'ns-resize', bl: 'nesw-resize', l: 'ew-resize' };
                    return <div key={c} onMouseDown={function(e) { onResizeDown(e, el.id, corner); }}
                      style={Object.assign({}, s, { position: 'absolute', width: 10, height: 10, background: '#3b82f6', borderRadius: 2, cursor: cursors[c], zIndex: 20 })}/>;
                  })}
                </>}
              </div>;
            })}
          </div>

          {/* Notes + counter below canvas */}
          <div style={{ width: '100%', maxWidth: 820, marginTop: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Speaker notes</div>
              <textarea value={cs.notes || ''} onChange={function(e) { updNotes(e.target.value); }}
                placeholder="Add notes for this slide..."
                rows={2}
                style={{ width: '100%', padding: '6px 8px', background: '#13122a', border: '1px solid #1e1b4b', borderRadius: 4, color: '#94a3b8', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}/>
            </div>
            <div style={{ fontSize: 11, color: '#475569', paddingTop: 16 }}>Slide {activeSlide + 1} of {slides.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
