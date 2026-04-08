import { useRef, useCallback, useEffect, useState } from 'react';
import { CANVAS_WIDTH, SNAP_THRESHOLD, SOCIAL_SVGS } from './elementDefaults';
import InlineToolbar from './InlineToolbar';

export default function Canvas({ els, selId, canvasBg, canvasBgImage, selectElement, deselectAll, updateElement, markDirty, onEditElement, deviceView }) {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const guideRefs = useRef({});
  const [editingId, setEditingId] = useState(null);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const editableRef = useRef(null);

  const EDITABLE_TYPES = ['heading', 'text', 'label', 'review', 'testimonial', 'faq', 'stat', 'icontext', 'separator', 'logostrip'];

  // ── Canvas height ──
  const maxElY = els.length > 0 ? Math.max(...els.map(e => e.y + e.h)) : 0;
  const canvasHeight = Math.max(1200, maxElY + 500);

  // ── Inline editing ──
  const startInlineEdit = useCallback((id) => {
    const el = els.find(x => x.id === id);
    if (!el || !EDITABLE_TYPES.includes(el.type)) return;
    setEditingId(id);
    // Position toolbar above element
    const dom = document.getElementById(id);
    if (dom) {
      const rect = dom.getBoundingClientRect();
      setToolbarPos({ x: rect.left + rect.width / 2, y: rect.top - 50 });
    }
    // Make content editable after state update
    setTimeout(() => {
      const ce = document.querySelector(`#${id} .cel-editable`);
      if (ce) {
        ce.contentEditable = 'true';
        ce.style.pointerEvents = 'auto';
        ce.style.cursor = 'text';
        ce.style.outline = 'none';
        ce.focus();
        editableRef.current = ce;
        // Select all text
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(ce);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 50);
  }, [els]);

  const exitInlineEdit = useCallback(() => {
    if (!editingId) return;
    const ce = editableRef.current;
    if (ce) {
      const html = ce.innerHTML;
      updateElement(editingId, { txt: html });
      markDirty();
      ce.contentEditable = 'false';
      ce.style.pointerEvents = 'none';
      ce.style.cursor = 'grab';
    }
    setEditingId(null);
    editableRef.current = null;
  }, [editingId, updateElement, markDirty]);

  // Update toolbar position on scroll/resize
  useEffect(() => {
    if (!editingId) return;
    const update = () => {
      const dom = document.getElementById(editingId);
      if (dom) {
        const rect = dom.getBoundingClientRect();
        setToolbarPos({ x: rect.left + rect.width / 2, y: Math.max(10, rect.top - 50) });
      }
    };
    const area = document.querySelector('.sp-canvas-area');
    if (area) area.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      if (area) area.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [editingId]);

  // ── Background style ──
  const bgStyle = {
    background: canvasBg,
    ...(canvasBgImage ? {
      backgroundImage: `url(${canvasBgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    } : {}),
  };

  // ── Alignment guides ──
  const showGuides = useCallback((el) => {
    const guides = guideRefs.current;
    // Hide all
    Object.values(guides).forEach(g => { if (g) g.style.display = 'none'; });

    const elCX = el.x + el.w / 2;
    const elL = el.x, elR = el.x + el.w;
    const elT = el.y, elB = el.y + el.h, elCY = el.y + el.h / 2;

    // Canvas centre
    if (Math.abs(elCX - CANVAS_WIDTH / 2) < SNAP_THRESHOLD) {
      if (guides.vCentre) { guides.vCentre.style.left = (CANVAS_WIDTH / 2) + 'px'; guides.vCentre.style.display = 'block'; }
      el.x = CANVAS_WIDTH / 2 - el.w / 2;
    }

    // Other elements
    els.forEach(other => {
      if (other.id === el.id) return;
      const oT = other.y, oB = other.y + other.h, oCY = other.y + other.h / 2;
      const oL = other.x, oR = other.x + other.w, oCX = other.x + other.w / 2;

      // Horizontal snaps
      if (Math.abs(elT - oT) < SNAP_THRESHOLD) { showGuide('hTop', 'top', oT); el.y = oT; }
      if (Math.abs(elCY - oCY) < SNAP_THRESHOLD) { showGuide('hMid', 'top', oCY); el.y = oCY - el.h / 2; }
      if (Math.abs(elB - oB) < SNAP_THRESHOLD) { showGuide('hBot', 'top', oB); el.y = oB - el.h; }
      if (Math.abs(elT - oB) < SNAP_THRESHOLD) { showGuide('hTop', 'top', oB); el.y = oB; }
      if (Math.abs(elB - oT) < SNAP_THRESHOLD) { showGuide('hBot', 'top', oT); el.y = oT - el.h; }

      // Vertical snaps
      if (Math.abs(elL - oL) < SNAP_THRESHOLD) { showGuide('vLeft', 'left', oL); el.x = oL; }
      if (Math.abs(elCX - oCX) < SNAP_THRESHOLD) { showGuide('vCentre', 'left', oCX); el.x = oCX - el.w / 2; }
      if (Math.abs(elR - oR) < SNAP_THRESHOLD) { showGuide('vRight', 'left', oR); el.x = oR - el.w; }
      if (Math.abs(elL - oR) < SNAP_THRESHOLD) { showGuide('vLeft', 'left', oR); el.x = oR; }
      if (Math.abs(elR - oL) < SNAP_THRESHOLD) { showGuide('vRight', 'left', oL); el.x = oL - el.w; }
    });
  }, [els]);

  const showGuide = (name, prop, val) => {
    const g = guideRefs.current[name];
    if (g) { g.style[prop] = val + 'px'; g.style.display = 'block'; }
  };

  const hideGuides = () => {
    Object.values(guideRefs.current).forEach(g => { if (g) g.style.display = 'none'; });
  };

  // ── Drag Move ──
  const startDrag = useCallback((e, id) => {
    if (e.target.closest('.cel-bar') || e.target.closest('.cel-resize')) return;
    e.preventDefault();

    if (id !== selId) {
      selectElement(id);
      return;
    }

    const el = els.find(x => x.id === id);
    if (!el) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      const newEl = { ...el, x: Math.max(0, d.origX + dx), y: Math.max(0, d.origY + dy) };
      showGuides(newEl);
      // Direct DOM update for smooth dragging
      const dom = document.getElementById(id);
      if (dom) { dom.style.left = newEl.x + 'px'; dom.style.top = newEl.y + 'px'; }
      // Store for mouseup
      dragRef.current.finalX = newEl.x;
      dragRef.current.finalY = newEl.y;
    };

    const onUp = () => {
      const d = dragRef.current;
      if (d && (d.finalX !== undefined)) {
        updateElement(d.id, { x: d.finalX, y: d.finalY });
        markDirty();
      }
      dragRef.current = null;
      hideGuides();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [els, selId, selectElement, updateElement, markDirty, showGuides]);

  // ── Resize ──
  const startResize = useCallback((e, id, handle) => {
    e.preventDefault();
    e.stopPropagation();
    const el = els.find(x => x.id === id);
    if (!el) return;
    resizeRef.current = { id, handle, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.w, origH: el.h };

    const onMove = (ev) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = ev.clientX - r.startX;
      const dy = ev.clientY - r.startY;
      let newX = r.origX, newY = r.origY, newW = r.origW, newH = r.origH;

      // Right edge
      if (handle.includes('r')) newW = Math.max(40, r.origW + dx);
      // Left edge — moves x and shrinks width
      if (handle.includes('l')) { newW = Math.max(40, r.origW - dx); newX = r.origX + (r.origW - newW); }
      // Bottom edge
      if (handle.includes('b')) newH = Math.max(20, r.origH + dy);
      // Top edge — moves y and shrinks height
      if (handle.includes('t')) { newH = Math.max(20, r.origH - dy); newY = r.origY + (r.origH - newH); }

      // Direct DOM update for smooth resize
      const dom = document.getElementById(r.id);
      if (dom) { dom.style.width = newW + 'px'; dom.style.height = newH + 'px'; dom.style.left = newX + 'px'; dom.style.top = newY + 'px'; }
      resizeRef.current.finalX = newX;
      resizeRef.current.finalY = newY;
      resizeRef.current.finalW = newW;
      resizeRef.current.finalH = newH;
    };

    const onUp = () => {
      const r = resizeRef.current;
      if (r && r.finalW !== undefined) {
        updateElement(r.id, { x: r.finalX, y: r.finalY, w: r.finalW, h: r.finalH });
        markDirty();
      }
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [els, updateElement, markDirty]);

  // ── Drop from palette ──
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!type) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // addElement is called from parent via the drop handler
    if (window._spAddElement) window._spAddElement(type, x, y);
  }, []);

  // ── Canvas click deselect ──
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current || e.target.closest('.canvas-empty')) {
      exitInlineEdit();
      deselectAll();
    }
  };

  // ── Render element inner content ──
  const renderInner = (el) => {
    const textStyles = ['fontFamily', 'fontSize', 'fontWeight', 'color', 'textAlign', 'lineHeight', 'letterSpacing', 'textTransform', 'fontStyle'];
    let innerStyle = 'width:100%;height:100%;overflow:hidden;outline:none;word-wrap:break-word;';
    textStyles.forEach(k => { if (el.s?.[k]) innerStyle += k.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + el.s[k] + ';'; });

    if (el.type === 'video' && el.txt) {
      // Auto-convert YouTube/Vimeo watch URLs to embed URLs at render time
      let videoSrc = el.txt;
      const ytMatch = videoSrc.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) videoSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
      const vmMatch = videoSrc.match(/(?:vimeo\.com\/)(\d+)/);
      if (vmMatch && !videoSrc.includes('player.vimeo.com')) videoSrc = `https://player.vimeo.com/video/${vmMatch[1]}`;

      const isMP4 = el._isMP4 || /\.(mp4|webm|ogg)/.test(videoSrc) || videoSrc.includes('funnel-videos');
      if (isMP4) {
        return <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <video src={videoSrc} style={{ width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover', pointerEvents: 'none' }} controls />
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'grab' }} />
        </div>;
      }
      return <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <iframe src={videoSrc} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12, pointerEvents: 'none' }} allowFullScreen />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'grab' }} />
      </div>;
    }
    if (el.type === 'video' && !el.txt) {
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,41,0.3)', borderRadius: 12, border: '1px dashed #334155', color: '#475569', fontSize: 13 }}>Click ✎ VIDEO to add</div>;
    }
    if (el.type === 'image' && el.txt) {
      return <img src={el.txt} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: el.s?.borderRadius || '8px' }} alt="" />;
    }
    if (el.type === 'image' && !el.txt) {
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,41,0.3)', borderRadius: 12, border: '1px dashed #334155', color: '#475569', fontSize: 13 }}>Click ✎ IMAGE to upload</div>;
    }
    if (['spacer', 'divider', 'box'].includes(el.type) && !el.txt) return null;
    if (el.type === 'button' || el.type === 'announcement') {
      return <div className="cel-editable" style={{ ...Object.fromEntries(textStyles.filter(k => el.s?.[k]).map(k => [k, el.s[k]])), width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} dangerouslySetInnerHTML={{__html: el.txt || 'Button'}} />;
    }
    if (el.type === 'countdown') {
      return <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
        {['Days', 'Hrs', 'Min', 'Sec'].map(l => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 28, fontWeight: 900, color: '#fff', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 14px', minWidth: 50, border: '1px solid rgba(255,255,255,0.08)' }}>00</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
          </div>
        ))}
      </div>;
    }
    if (el.type === 'progress') {
      const pct = el._percent || 75, lbl = el._label || 'Progress', clr = el._color || '#0ea5e9';
      return <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{lbl}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: clr }}>{pct}%</span>
        </div>
        <div style={{ width: '100%', height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: clr, borderRadius: 5 }} />
        </div>
      </div>;
    }
    if (el.type === 'socialicons') {
      return <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
        {Object.keys(SOCIAL_SVGS).map(k => (
          <svg key={k} viewBox="0 0 24 24" width={22} height={22} fill="#94a3b8" style={{ opacity: 0.7 }}><path d={SOCIAL_SVGS[k]} /></svg>
        ))}
      </div>;
    }
    if (el.type === 'audio') {
      if (el._audioUrl) {
        return <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <audio src={el._audioUrl} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} controls />
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'grab' }} />
        </div>;
      }
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,41,0.3)', borderRadius: 12, border: '1px dashed #334155', color: '#475569', fontSize: 13, gap: 8 }}>🎵 Click ✎ AUDIO to add</div>;
    }
    if (el.type === 'embed') {
      if (el._embedCode) {
        return <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 8, pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: el._embedCode }} />;
      }
      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,41,0.3)', borderRadius: 12, border: '1px dashed #334155', color: '#475569', fontSize: 13, gap: 8 }}>⟨/⟩ Click ✎ CODE to add HTML</div>;
    }
    // Default: contenteditable text
    return <div className="cel-editable" dangerouslySetInnerHTML={{ __html: el.txt || '' }} style={Object.fromEntries(
      innerStyle.split(';').filter(Boolean).map(s => { const [k, ...v] = s.split(':'); return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.join(':').trim()]; })
    )} />;
  };

  // ── Element outer styles ──
  const getOuterStyle = (el) => {
    const layoutStyles = ['background', 'borderRadius', 'border', 'padding', 'boxShadow', 'borderLeft', 'borderTop', 'borderRight', 'borderBottom', 'opacity'];
    const style = {
      position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
      cursor: editingId === el.id ? 'text' : 'grab', userSelect: editingId === el.id ? 'auto' : 'none', minWidth: 40, minHeight: 20,
    };
    layoutStyles.forEach(k => { if (el.s?.[k]) style[k] = el.s[k]; });
    return style;
  };

  // Edit label per type
  const editLabel = (type) => {
    const labels = { form: '✎ FORM', video: '✎ VIDEO', image: '✎ IMAGE', button: '✎ LINK', announcement: '✎ BANNER', countdown: '✎ SET', progress: '✎ SET', socialicons: '✎ LINKS', audio: '✎ AUDIO', embed: '✎ CODE' };
    return labels[type] || '✎ EDIT';
  };

  return (
    <div className="sp-canvas-area" style={{ flex: 1, background: '#0f1525', overflow: 'auto', padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div
        ref={canvasRef}
        className="sp-canvas"
        onMouseDown={handleCanvasClick}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          width: CANVAS_WIDTH, minHeight: canvasHeight, position: 'relative',
          borderRadius: 6, boxShadow: '0 0 60px rgba(0,0,0,0.3)',
          ...bgStyle,
        }}
      >
        {/* Alignment guides */}
        {['vCentre', 'vLeft', 'vRight'].map(name => (
          <div key={name} ref={el => guideRefs.current[name] = el}
            style={{ display: 'none', position: 'absolute', top: 0, width: 1, height: '100%', background: 'rgba(14,165,233,0.4)', zIndex: 100, pointerEvents: 'none' }} />
        ))}
        {['hTop', 'hMid', 'hBot'].map(name => (
          <div key={name} ref={el => guideRefs.current[name] = el}
            style={{ display: 'none', position: 'absolute', left: 0, height: 1, width: '100%', background: 'rgba(14,165,233,0.4)', zIndex: 100, pointerEvents: 'none' }} />
        ))}

        {/* Empty state */}
        {els.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 600 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
            <h3 style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Start building</h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>Click any block from the right panel to add it, or drag it onto the canvas.</p>
          </div>
        )}

        {/* Elements */}
        {els.map(el => (
          <div
            key={el.id}
            id={el.id}
            className={`cel${el.id === selId ? ' selected' : ''}${el.id === editingId ? ' editing' : ''}`}
            style={getOuterStyle(el)}
            onMouseDown={e => { if (editingId === el.id) return; startDrag(e, el.id); }}
            onDoubleClick={() => { if (EDITABLE_TYPES.includes(el.type)) { selectElement(el.id); startInlineEdit(el.id); } }}
          >
            {/* Inner content */}
            <div style={{ pointerEvents: editingId === el.id ? 'auto' : 'none', width: '100%', height: '100%' }}>{renderInner(el)}</div>

            {/* Toolbar */}
            <div className="cel-bar" style={{
              position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)',
              display: el.id === selId ? 'flex' : 'none',
              alignItems: 'center', gap: 2, padding: '3px 4px',
              background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              zIndex: 20, whiteSpace: 'nowrap',
            }}>
              {!['spacer', 'divider', 'box'].includes(el.type) && (
                <>
                  <button onClick={e => { e.stopPropagation(); if (EDITABLE_TYPES.includes(el.type)) { startInlineEdit(el.id); } else { onEditElement(el.id); } }}
                    style={{ padding: '2px 8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 800, color: EDITABLE_TYPES.includes(el.type) ? '#6366f1' : '#0ea5e9' }}>
                    {EDITABLE_TYPES.includes(el.type) ? '✎ EDIT' : editLabel(el.type)}
                  </button>
                  <div style={{ width: 1, height: 14, background: '#e5e7eb' }} />
                </>
              )}
              <button onClick={e => { e.stopPropagation(); if (window._spDuplicateElement) window._spDuplicateElement(el.id); }}
                style={{ padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }} title="Duplicate">⧉</button>
              <div style={{ width: 1, height: 14, background: '#e5e7eb' }} />
              <button onClick={e => { e.stopPropagation(); if (window._spDeleteElement) window._spDeleteElement(el.id); }}
                style={{ padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#dc2626' }} title="Delete">✕</button>
            </div>

            {/* Resize handles — all 8 directions */}
            {el.id === selId && [
              { pos: 'tl', style: { top: -4, left: -4, width: 10, height: 10, cursor: 'nwse-resize', borderRadius: 3 } },
              { pos: 't',  style: { top: -3, left: '50%', width: 24, height: 6, transform: 'translateX(-50%)', cursor: 'ns-resize', borderRadius: 3 } },
              { pos: 'tr', style: { top: -4, right: -4, width: 10, height: 10, cursor: 'nesw-resize', borderRadius: 3 } },
              { pos: 'l',  style: { top: '50%', left: -3, width: 6, height: 24, transform: 'translateY(-50%)', cursor: 'ew-resize', borderRadius: 3 } },
              { pos: 'r',  style: { top: '50%', right: -3, width: 6, height: 24, transform: 'translateY(-50%)', cursor: 'ew-resize', borderRadius: 3 } },
              { pos: 'bl', style: { bottom: -4, left: -4, width: 10, height: 10, cursor: 'nesw-resize', borderRadius: 3 } },
              { pos: 'b',  style: { bottom: -3, left: '50%', width: 24, height: 6, transform: 'translateX(-50%)', cursor: 'ns-resize', borderRadius: 3 } },
              { pos: 'br', style: { bottom: -4, right: -4, width: 10, height: 10, cursor: 'nwse-resize', borderRadius: 3 } },
            ].map(({ pos, style }) => (
              <div key={pos} className="cel-resize"
                onMouseDown={e => startResize(e, el.id, pos)}
                style={{ position: 'absolute', background: '#0ea5e9', zIndex: 15, ...style }} />
            ))}
          </div>
        ))}
      </div>

      <style>{`
        .cel:hover { outline: 1px dashed rgba(14,165,233,0.35); outline-offset: 1px; }
        .cel.selected { outline: 2px solid #0ea5e9; outline-offset: 1px; }
        .cel.editing { outline: 2px solid #6366f1; outline-offset: 1px; cursor: text !important; }
        .cel.editing * { cursor: text !important; user-select: auto !important; }
        .cel > *:not(.cel-bar):not(.cel-resize) { pointer-events: none; }
        .cel.editing > * { pointer-events: auto !important; }
        .cel .cel-bar, .cel .cel-bar * { pointer-events: auto !important; cursor: pointer !important; }
        .cel .cel-resize { pointer-events: auto !important; }
        .cel-editable:focus { outline: none; }
        .cel-editable::selection { background: rgba(14,165,233,0.2); }
      `}</style>

      {/* Inline Formatting Toolbar */}
      <InlineToolbar
        visible={!!editingId}
        position={toolbarPos}
        onCommand={() => {
          // Sync content back to state on every formatting change
          if (editableRef.current && editingId) {
            updateElement(editingId, { txt: editableRef.current.innerHTML });
            markDirty();
          }
        }}
      />
    </div>
  );
}
