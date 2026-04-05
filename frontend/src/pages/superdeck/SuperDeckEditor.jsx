import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete } from '../../utils/api';
import { THEMES, THEME_KEYS, SLIDE_LAYOUTS } from './themes';
import { Type, Image, Square, Sparkles, ChevronLeft, ChevronRight, Plus, Trash2, Copy, Download, Eye, Save, ArrowLeft, Move, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';

var UID = function() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

export default function SuperDeckEditor() {
  var { deckId } = useParams();
  var navigate = useNavigate();
  var [deck, setDeck] = useState(null);
  var [slides, setSlides] = useState([]);
  var [activeSlide, setActiveSlide] = useState(0);
  var [selectedEl, setSelectedEl] = useState(null);
  var [theme, setTheme] = useState('midnight');
  var [title, setTitle] = useState('');
  var [saving, setSaving] = useState(false);
  var [dirty, setDirty] = useState(false);
  var [tool, setTool] = useState('select');
  var [dragging, setDragging] = useState(null);
  var canvasRef = useRef(null);

  // Load deck
  useEffect(function() {
    apiGet('/api/superdeck/' + deckId).then(function(d) {
      setDeck(d);
      setSlides(d.slides || []);
      setTheme(d.theme || 'midnight');
      setTitle(d.title || '');
    }).catch(function() { navigate('/superdeck'); });
  }, [deckId]);

  var t = THEMES[theme] || THEMES.midnight;

  // Save
  var save = useCallback(function() {
    setSaving(true);
    apiPost('/api/superdeck/' + deckId + '/save', { title: title, theme: theme, slides: slides })
      .then(function() { setSaving(false); setDirty(false); })
      .catch(function() { setSaving(false); });
  }, [deckId, title, theme, slides]);

  // Auto-save every 30s
  useEffect(function() {
    var iv = setInterval(function() { if (dirty) save(); }, 30000);
    return function() { clearInterval(iv); };
  }, [dirty, save]);

  function markDirty() { setDirty(true); }

  // Slide management
  function addSlide() {
    var newSlide = { id: UID(), elements: [], background: t.primary, notes: '' };
    var ns = slides.slice(); ns.push(newSlide); setSlides(ns);
    setActiveSlide(ns.length - 1); setSelectedEl(null); markDirty();
  }

  function dupSlide(idx) {
    var ns = slides.slice();
    var copy = JSON.parse(JSON.stringify(ns[idx]));
    copy.id = UID();
    copy.elements = copy.elements.map(function(e) { return Object.assign({}, e, { id: UID() }); });
    ns.splice(idx + 1, 0, copy); setSlides(ns);
    setActiveSlide(idx + 1); markDirty();
  }

  function delSlide(idx) {
    if (slides.length <= 1) return;
    var ns = slides.filter(function(_, i) { return i !== idx; });
    setSlides(ns);
    if (activeSlide >= ns.length) setActiveSlide(ns.length - 1);
    setSelectedEl(null); markDirty();
  }

  // Element management
  function addElement(type) {
    var el = { id: UID(), type: type, x: 100, y: 100, w: 400, h: 60 };
    if (type === 'heading') { el.text = 'Your heading here'; el.fontSize = 36; el.color = t.text; el.bold = true; el.align = 'center'; el.fontFamily = t.headingFont; el.w = 600; el.h = 80; el.x = 200; }
    else if (type === 'text') { el.text = 'Add your content here. Click to edit.'; el.fontSize = 18; el.color = t.muted; el.align = 'left'; el.fontFamily = t.bodyFont; el.w = 500; el.h = 60; el.x = 150; }
    else if (type === 'image') { el.src = ''; el.w = 300; el.h = 200; el.x = 250; }
    else if (type === 'shape') { el.shapeType = 'rect'; el.fill = t.accent; el.w = 200; el.h = 120; el.x = 300; }

    var ns = slides.slice();
    ns[activeSlide] = Object.assign({}, ns[activeSlide], { elements: ns[activeSlide].elements.concat([el]) });
    setSlides(ns); setSelectedEl(el.id); markDirty();
  }

  function updateElement(elId, updates) {
    var ns = slides.slice();
    var s = ns[activeSlide];
    s.elements = s.elements.map(function(e) { return e.id === elId ? Object.assign({}, e, updates) : e; });
    ns[activeSlide] = Object.assign({}, s);
    setSlides(ns); markDirty();
  }

  function deleteElement() {
    if (!selectedEl) return;
    var ns = slides.slice();
    var s = ns[activeSlide];
    s.elements = s.elements.filter(function(e) { return e.id !== selectedEl; });
    ns[activeSlide] = Object.assign({}, s);
    setSlides(ns); setSelectedEl(null); markDirty();
  }

  function updateSlideBackground(color) {
    var ns = slides.slice();
    ns[activeSlide] = Object.assign({}, ns[activeSlide], { background: color });
    setSlides(ns); markDirty();
  }

  function updateSlideNotes(text) {
    var ns = slides.slice();
    ns[activeSlide] = Object.assign({}, ns[activeSlide], { notes: text });
    setSlides(ns); markDirty();
  }

  // Drag on canvas
  function handleCanvasMouseDown(e, elId) {
    e.stopPropagation();
    setSelectedEl(elId);
    var rect = canvasRef.current.getBoundingClientRect();
    var el = slides[activeSlide].elements.find(function(x) { return x.id === elId; });
    if (!el) return;
    var scaleX = 1000 / rect.width;
    var scaleY = 562 / rect.height;
    var startX = e.clientX; var startY = e.clientY;
    var origX = el.x; var origY = el.y;

    function onMove(ev) {
      var dx = (ev.clientX - startX) * scaleX;
      var dy = (ev.clientY - startY) * scaleY;
      updateElement(elId, { x: Math.max(0, Math.round(origX + dx)), y: Math.max(0, Math.round(origY + dy)) });
    }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Current slide & selected element
  var cs = slides[activeSlide] || { elements: [], background: t.primary, notes: '' };
  var selEl = selectedEl ? cs.elements.find(function(e) { return e.id === selectedEl; }) : null;

  if (!deck) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f0e2a' }}>
    <div style={{ width: 40, height: 40, border: '3px solid #333', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin .8s linear infinite' }}/>
    <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
  </div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'DM Sans, sans-serif', background: '#0f0e2a', color: '#fff', overflow: 'hidden' }}>

      {/* Top toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 52, borderBottom: '1px solid #1e1b4b', background: '#13122a', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={function() { if (dirty) save(); navigate('/superdeck'); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', fontSize: 13 }}>
            <ArrowLeft size={16}/> Back
          </button>
          <div style={{ width: 1, height: 24, background: '#1e1b4b' }}/>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          </div>
          <input value={title} onChange={function(e) { setTitle(e.target.value); markDirty(); }}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', outline: 'none', width: 250 }}
            placeholder="Presentation title" />
        </div>

        {/* Tool mode */}
        <div style={{ display: 'flex', gap: 2, background: '#1e1b4b', borderRadius: 8, padding: 3 }}>
          {[{ key: 'heading', icon: Type, label: 'Text' }, { key: 'image', icon: Image, label: 'Image' }, { key: 'shape', icon: Square, label: 'Shape' }].map(function(t2) {
            return <button key={t2.key} onClick={function() { addElement(t2.key); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 6, border: 'none', background: 'transparent', color: '#a5b4fc', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              <t2.icon size={14}/> {t2.label}
            </button>;
          })}
          <button onClick={function() { addElement('text'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 6, border: 'none', background: 'transparent', color: '#a5b4fc', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            <AlignLeft size={14}/> Body
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={save} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 16px', borderRadius: 8, border: '1px solid #1e1b4b', background: dirty ? '#312e81' : 'transparent', color: dirty ? '#c4b5fd' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Save size={14}/> {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={function() { window.open('/api/superdeck/' + deckId + '/export', '_blank'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 16px', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Download size={14}/> Download .pptx
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Left: slide panel */}
        <div style={{ width: 160, borderRight: '1px solid #1e1b4b', background: '#0f0e2a', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
          {slides.map(function(s, i) {
            var isActive = i === activeSlide;
            return <div key={s.id || i} style={{ marginBottom: 10 }}>
              <div onClick={function() { setActiveSlide(i); setSelectedEl(null); }}
                style={{ borderRadius: 6, border: isActive ? '2px solid #8b5cf6' : '1px solid #1e1b4b', overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ aspectRatio: '16/9', background: s.background || t.primary, padding: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                  {s.elements.slice(0, 3).map(function(el, ei) {
                    if (el.type === 'heading') return <div key={ei} style={{ fontSize: 7, fontWeight: 700, color: el.color || '#fff', textAlign: 'center', overflow: 'hidden', maxHeight: 16 }}>{(el.text || '').slice(0, 30)}</div>;
                    if (el.type === 'text') return <div key={ei} style={{ fontSize: 5, color: el.color || '#999', textAlign: 'center', overflow: 'hidden', maxHeight: 10 }}>{(el.text || '').slice(0, 40)}</div>;
                    if (el.type === 'image') return <div key={ei} style={{ width: '40%', height: 12, borderRadius: 2, background: '#334155' }}/>;
                    if (el.type === 'shape') return <div key={ei} style={{ width: 16, height: 10, borderRadius: 2, background: el.fill || '#8b5cf6' }}/>;
                    return null;
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 2px' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>{i + 1}</span>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={function(e) { e.stopPropagation(); dupSlide(i); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}><Copy size={10}/></button>
                  <button onClick={function(e) { e.stopPropagation(); delSlide(i); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}><Trash2 size={10}/></button>
                </div>
              </div>
            </div>;
          })}
          <button onClick={addSlide} style={{ width: '100%', padding: '10px 0', border: '1.5px dashed #312e81', borderRadius: 6, background: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={14}/> Add slide
          </button>
        </div>

        {/* Centre: canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0920', padding: 24 }}
          onClick={function() { setSelectedEl(null); }}>
          <div ref={canvasRef}
            style={{ width: '100%', maxWidth: 800, aspectRatio: '16/9', background: cs.background || t.primary, borderRadius: 4, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.4)' }}>
            {cs.elements.map(function(el) {
              var isSel = el.id === selectedEl;
              var sx = (el.x / 1000) * 100;
              var sy = (el.y / 562.5) * 100;
              var sw = (el.w / 1000) * 100;
              var sh = (el.h / 562.5) * 100;

              return <div key={el.id}
                onMouseDown={function(e) { handleCanvasMouseDown(e, el.id); }}
                onDoubleClick={function(e) {
                  e.stopPropagation();
                  if (el.type === 'heading' || el.type === 'text') {
                    var newText = window.prompt('Edit text:', el.text || '');
                    if (newText !== null) updateElement(el.id, { text: newText });
                  } else if (el.type === 'image') {
                    var src = window.prompt('Image URL:', el.src || '');
                    if (src !== null) updateElement(el.id, { src: src });
                  }
                }}
                style={{
                  position: 'absolute', left: sx + '%', top: sy + '%', width: sw + '%', height: sh + '%',
                  cursor: 'move', border: isSel ? '2px solid #3b82f6' : '1px solid transparent',
                  borderRadius: 2, boxSizing: 'border-box',
                }}>
                {(el.type === 'heading' || el.type === 'text') && (
                  <div style={{
                    fontSize: Math.max(8, el.fontSize * 0.7) + 'px', fontWeight: el.bold ? 700 : 400,
                    fontStyle: el.italic ? 'italic' : 'normal',
                    color: el.color || '#fff', textAlign: el.align || 'left',
                    fontFamily: el.fontFamily || t.bodyFont,
                    width: '100%', height: '100%', overflow: 'hidden',
                    display: 'flex', alignItems: el.type === 'heading' ? 'center' : 'flex-start',
                    justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
                    padding: '2px 4px', lineHeight: 1.3,
                  }}>{el.text || ''}</div>
                )}
                {el.type === 'image' && (
                  el.src ? <img src={el.src} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} alt=""/>
                    : <div style={{ width: '100%', height: '100%', background: '#1e293b', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image size={24} color="#475569"/>
                      </div>
                )}
                {el.type === 'shape' && (
                  <div style={{ width: '100%', height: '100%', background: el.fill || t.accent, borderRadius: el.shapeType === 'circle' ? '50%' : 4 }}/>
                )}
                {isSel && <>
                  <div style={{ position: 'absolute', top: -4, left: -4, width: 8, height: 8, background: '#3b82f6', borderRadius: 2 }}/>
                  <div style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, background: '#3b82f6', borderRadius: 2 }}/>
                  <div style={{ position: 'absolute', bottom: -4, left: -4, width: 8, height: 8, background: '#3b82f6', borderRadius: 2 }}/>
                  <div style={{ position: 'absolute', bottom: -4, right: -4, width: 8, height: 8, background: '#3b82f6', borderRadius: 2 }}/>
                </>}
              </div>;
            })}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#475569' }}>Slide {activeSlide + 1} of {slides.length}</div>
        </div>

        {/* Right: properties panel */}
        <div style={{ width: 240, borderLeft: '1px solid #1e1b4b', background: '#13122a', padding: 16, overflowY: 'auto', flexShrink: 0 }}>
          {selEl ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' }}>
                {selEl.type} properties
              </div>

              {(selEl.type === 'heading' || selEl.type === 'text') && <>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Font size</label>
                <input type="number" value={selEl.fontSize || 16} onChange={function(e) { updateElement(selEl.id, { fontSize: parseInt(e.target.value) || 16 }); }}
                  style={{ width: '100%', padding: '8px 10px', background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 6, color: '#fff', fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }}/>

                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Color</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <input type="color" value={selEl.color || '#ffffff'} onChange={function(e) { updateElement(selEl.id, { color: e.target.value }); }}
                    style={{ width: 32, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }}/>
                  <input value={selEl.color || '#ffffff'} onChange={function(e) { updateElement(selEl.id, { color: e.target.value }); }}
                    style={{ flex: 1, padding: '6px 8px', background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 6, color: '#94a3b8', fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box' }}/>
                </div>

                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Alignment</label>
                <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
                  {[{ v: 'left', I: AlignLeft }, { v: 'center', I: AlignCenter }, { v: 'right', I: AlignRight }].map(function(a) {
                    var active = (selEl.align || 'left') === a.v;
                    return <button key={a.v} onClick={function() { updateElement(selEl.id, { align: a.v }); }}
                      style={{ flex: 1, padding: 6, borderRadius: 4, border: active ? '1px solid #8b5cf6' : '1px solid #312e81', background: active ? 'rgba(139,92,246,.1)' : 'transparent', color: active ? '#8b5cf6' : '#64748b', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                      <a.I size={14}/>
                    </button>;
                  })}
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <button onClick={function() { updateElement(selEl.id, { bold: !selEl.bold }); }}
                    style={{ flex: 1, padding: 6, borderRadius: 4, border: selEl.bold ? '1px solid #8b5cf6' : '1px solid #312e81', background: selEl.bold ? 'rgba(139,92,246,.1)' : 'transparent', color: selEl.bold ? '#8b5cf6' : '#64748b', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                    <Bold size={14}/>
                  </button>
                  <button onClick={function() { updateElement(selEl.id, { italic: !selEl.italic }); }}
                    style={{ flex: 1, padding: 6, borderRadius: 4, border: selEl.italic ? '1px solid #8b5cf6' : '1px solid #312e81', background: selEl.italic ? 'rgba(139,92,246,.1)' : 'transparent', color: selEl.italic ? '#8b5cf6' : '#64748b', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                    <Italic size={14}/>
                  </button>
                </div>
              </>}

              {selEl.type === 'image' && <>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Image URL</label>
                <input value={selEl.src || ''} onChange={function(e) { updateElement(selEl.id, { src: e.target.value }); }}
                  placeholder="https://..." style={{ width: '100%', padding: '8px 10px', background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 6, color: '#fff', fontSize: 12, marginBottom: 12, boxSizing: 'border-box' }}/>
              </>}

              {selEl.type === 'shape' && <>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Fill color</label>
                <input type="color" value={selEl.fill || '#8b5cf6'} onChange={function(e) { updateElement(selEl.id, { fill: e.target.value }); }}
                  style={{ width: '100%', height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 12 }}/>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Shape</label>
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  <button onClick={function() { updateElement(selEl.id, { shapeType: 'rect' }); }}
                    style={{ flex: 1, padding: 6, borderRadius: 4, border: selEl.shapeType !== 'circle' ? '1px solid #8b5cf6' : '1px solid #312e81', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>Rect</button>
                  <button onClick={function() { updateElement(selEl.id, { shapeType: 'circle' }); }}
                    style={{ flex: 1, padding: 6, borderRadius: 4, border: selEl.shapeType === 'circle' ? '1px solid #8b5cf6' : '1px solid #312e81', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>Circle</button>
                </div>
              </>}

              <button onClick={deleteElement} style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #7f1d1d', background: 'rgba(127,29,29,.1)', color: '#fca5a5', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 }}>
                <Trash2 size={12}/> Delete element
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' }}>Slide background</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {[t.primary, t.secondary, t.surface, '#ffffff', '#f8fafc', '#0f172a', '#1e1b4b', '#0c4a6e', '#14532d', '#7f1d1d'].map(function(c) {
                  return <div key={c} onClick={function() { updateSlideBackground(c); }}
                    style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: cs.background === c ? '2px solid #8b5cf6' : '1px solid #312e81' }}/>;
                })}
                <input type="color" value={cs.background || t.primary} onChange={function(e) { updateSlideBackground(e.target.value); }}
                  style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer' }}/>
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Theme</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                {THEME_KEYS.map(function(k) {
                  var th = THEMES[k];
                  return <button key={k} onClick={function() { setTheme(k); markDirty(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, border: theme === k ? '1px solid #8b5cf6' : '1px solid #1e1b4b', background: theme === k ? 'rgba(139,92,246,.08)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: th.primary, border: '1px solid #312e81', flexShrink: 0 }}/>
                    <span style={{ fontSize: 12, color: theme === k ? '#c4b5fd' : '#64748b' }}>{th.name}</span>
                  </button>;
                })}
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Speaker notes</div>
              <textarea value={cs.notes || ''} onChange={function(e) { updateSlideNotes(e.target.value); }}
                placeholder="Add speaker notes..."
                rows={4}
                style={{ width: '100%', padding: '8px 10px', background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 6, color: '#a5b4fc', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
