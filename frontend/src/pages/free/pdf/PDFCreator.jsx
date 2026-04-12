import { useTranslation } from 'react-i18next';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════
   PDF Creator v2 — Visual drag-and-drop PDF builder
   Blank canvas default, template dropdown to load content,
   light canvas bg, proper click handling
   ═══════════════════════════════════════════════════════════ */

const TEMPLATES = [
  {
    id: 'lead-magnet', name: 'Lead Magnet', desc: 'eBook / Guide',
    elements: [
      { type: 'text', x: 50, y: 40, w: 495, h: 30, text: 'FREE GUIDE', fontSize: 14, fontWeight: 700, color: 'var(--sap-purple)', align: 'center', letterSpacing: 4 },
      { type: 'text', x: 50, y: 80, w: 495, h: 70, text: '10 Steps to Building\nYour Online Business', fontSize: 32, fontWeight: 900, color: '#1a1a2e', align: 'center', lineHeight: 1.2 },
      { type: 'text', x: 80, y: 170, w: 435, h: 40, text: 'Everything you need to know to start earning from home in 2026', fontSize: 14, color: '#6b7280', align: 'center', lineHeight: 1.6 },
      { type: 'divider', x: 50, y: 230, w: 495, h: 2, color: 'var(--sap-border-strong)' },
      { type: 'text', x: 50, y: 260, w: 495, h: 30, text: 'Step 1: Find Your Niche', fontSize: 20, fontWeight: 800, color: '#1a1a2e' },
      { type: 'text', x: 50, y: 300, w: 495, h: 70, text: 'The most important decision you\'ll make is choosing a niche that aligns with your passion and has market demand.', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
      { type: 'text', x: 50, y: 390, w: 495, h: 30, text: 'Step 2: Build Your Platform', fontSize: 20, fontWeight: 800, color: '#1a1a2e' },
      { type: 'text', x: 50, y: 430, w: 495, h: 70, text: 'Every successful online business needs a home base. Your platform is where you\'ll attract and convert your audience.', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
      { type: 'text', x: 50, y: 520, w: 495, h: 30, text: 'Step 3: Create Your First Product', fontSize: 20, fontWeight: 800, color: '#1a1a2e' },
      { type: 'text', x: 50, y: 560, w: 495, h: 70, text: 'Digital products like courses, eBooks, and templates are the fastest way to start generating revenue.', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
    ],
  },
  {
    id: 'report', name: 'Business Report', desc: 'Data + charts',
    elements: [
      { type: 'rect', x: 0, y: 0, w: 595, h: 120, color: 'var(--sap-text-primary)' },
      { type: 'text', x: 50, y: 35, w: 495, h: 40, text: 'Q4 Business Report', fontSize: 28, fontWeight: 900, color: '#ffffff' },
      { type: 'text', x: 50, y: 80, w: 495, h: 20, text: 'Prepared by Your Company  |  March 2026', fontSize: 12, color: 'rgba(255,255,255,0.6)' },
      { type: 'text', x: 50, y: 150, w: 495, h: 30, text: 'Executive Summary', fontSize: 20, fontWeight: 800, color: '#1a1a2e' },
      { type: 'text', x: 50, y: 190, w: 495, h: 80, text: 'This report outlines key performance indicators, revenue growth, and strategic initiatives for Q4.', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
      { type: 'divider', x: 50, y: 290, w: 495, h: 2, color: 'var(--sap-border-strong)' },
      { type: 'text', x: 50, y: 320, w: 495, h: 30, text: 'Key Metrics', fontSize: 20, fontWeight: 800, color: '#1a1a2e' },
      { type: 'rect', x: 50, y: 360, w: 150, h: 80, color: '#f0f9ff', radius: 10 },
      { type: 'text', x: 60, y: 370, w: 130, h: 20, text: 'Revenue', fontSize: 12, color: 'var(--sap-text-muted)' },
      { type: 'text', x: 60, y: 395, w: 130, h: 30, text: '$142,500', fontSize: 24, fontWeight: 800, color: 'var(--sap-accent)' },
      { type: 'rect', x: 220, y: 360, w: 150, h: 80, color: 'var(--sap-green-bg)', radius: 10 },
      { type: 'text', x: 230, y: 370, w: 130, h: 20, text: 'Growth', fontSize: 12, color: 'var(--sap-text-muted)' },
      { type: 'text', x: 230, y: 395, w: 130, h: 30, text: '+23%', fontSize: 24, fontWeight: 800, color: 'var(--sap-green)' },
      { type: 'rect', x: 390, y: 360, w: 155, h: 80, color: '#fefce8', radius: 10 },
      { type: 'text', x: 400, y: 370, w: 135, h: 20, text: 'Customers', fontSize: 12, color: 'var(--sap-text-muted)' },
      { type: 'text', x: 400, y: 395, w: 135, h: 30, text: '1,847', fontSize: 24, fontWeight: 800, color: '#ca8a04' },
    ],
  },
  {
    id: 'invoice', name: 'Invoice', desc: 'Professional billing',
    elements: [
      { type: 'text', x: 50, y: 50, w: 200, h: 35, text: 'INVOICE', fontSize: 28, fontWeight: 900, color: '#1a1a2e' },
      { type: 'text', x: 400, y: 50, w: 145, h: 20, text: 'Invoice #INV-0042', fontSize: 13, color: '#6b7280', align: 'right' },
      { type: 'text', x: 400, y: 72, w: 145, h: 20, text: 'Date: 30 March 2026', fontSize: 13, color: '#6b7280', align: 'right' },
      { type: 'divider', x: 50, y: 110, w: 495, h: 2, color: '#1a1a2e' },
      { type: 'text', x: 50, y: 130, w: 200, h: 20, text: 'Bill To:', fontSize: 13, fontWeight: 700, color: '#1a1a2e' },
      { type: 'text', x: 50, y: 152, w: 250, h: 60, text: 'Client Name\n123 Business Street\nLondon, EC1A 1BB', fontSize: 12, color: '#6b7280', lineHeight: 1.6 },
      { type: 'text', x: 350, y: 130, w: 195, h: 20, text: 'From:', fontSize: 13, fontWeight: 700, color: '#1a1a2e' },
      { type: 'text', x: 350, y: 152, w: 195, h: 60, text: 'Your Company Name\n456 Your Address\nYour City, Postcode', fontSize: 12, color: '#6b7280', lineHeight: 1.6 },
      { type: 'rect', x: 50, y: 250, w: 495, h: 30, color: 'var(--sap-bg-page)' },
      { type: 'text', x: 60, y: 256, w: 250, h: 18, text: 'Description', fontSize: 11, fontWeight: 700, color: 'var(--sap-text-secondary)' },
      { type: 'text', x: 430, y: 256, w: 115, h: 18, text: 'Amount', fontSize: 11, fontWeight: 700, color: 'var(--sap-text-secondary)', align: 'right' },
      { type: 'text', x: 60, y: 290, w: 250, h: 18, text: 'Web Design Services', fontSize: 12, color: '#374151' },
      { type: 'text', x: 430, y: 290, w: 115, h: 18, text: '$2,500.00', fontSize: 12, color: '#374151', align: 'right' },
      { type: 'divider', x: 350, y: 320, w: 195, h: 1, color: 'var(--sap-border-strong)' },
      { type: 'text', x: 350, y: 335, w: 80, h: 20, text: 'Total:', fontSize: 16, fontWeight: 800, color: '#1a1a2e' },
      { type: 'text', x: 430, y: 335, w: 115, h: 20, text: '$2,500.00', fontSize: 16, fontWeight: 800, color: 'var(--sap-green-bright)', align: 'right' },
    ],
  },
  {
    id: 'resume', name: 'Resume / CV', desc: 'Clean professional',
    elements: [
      { type: 'rect', x: 0, y: 0, w: 595, h: 100, color: 'var(--sap-text-primary)' },
      { type: 'text', x: 50, y: 25, w: 300, h: 35, text: 'Your Full Name', fontSize: 28, fontWeight: 900, color: '#ffffff' },
      { type: 'text', x: 50, y: 65, w: 400, h: 20, text: 'Professional Title  |  your@email.com  |  +44 7700 900000', fontSize: 12, color: 'rgba(255,255,255,0.6)' },
      { type: 'text', x: 50, y: 130, w: 495, h: 20, text: 'PROFESSIONAL SUMMARY', fontSize: 13, fontWeight: 700, color: 'var(--sap-red-bright)', letterSpacing: 2 },
      { type: 'text', x: 50, y: 158, w: 495, h: 60, text: 'Results-driven professional with over 10 years of experience in digital marketing and business development.', fontSize: 12, color: '#4b5563', lineHeight: 1.7 },
      { type: 'divider', x: 50, y: 235, w: 495, h: 1, color: 'var(--sap-border-strong)' },
      { type: 'text', x: 50, y: 255, w: 495, h: 20, text: 'EXPERIENCE', fontSize: 13, fontWeight: 700, color: 'var(--sap-red-bright)', letterSpacing: 2 },
      { type: 'text', x: 50, y: 283, w: 300, h: 22, text: 'Senior Marketing Manager', fontSize: 16, fontWeight: 700, color: '#1a1a2e' },
      { type: 'text', x: 400, y: 285, w: 145, h: 18, text: '2022 — Present', fontSize: 12, color: '#6b7280', align: 'right' },
    ],
  },
  {
    id: 'one-pager', name: 'One-Pager', desc: 'Pitch / overview',
    elements: [
      { type: 'rect', x: 0, y: 0, w: 595, h: 160, color: 'var(--sap-text-primary)' },
      { type: 'text', x: 50, y: 40, w: 495, h: 40, text: 'Your Product Name', fontSize: 34, fontWeight: 900, color: '#ffffff' },
      { type: 'text', x: 50, y: 95, w: 400, h: 40, text: 'A short tagline that explains what you do.', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 },
      { type: 'text', x: 50, y: 190, w: 495, h: 25, text: 'The Problem', fontSize: 18, fontWeight: 800, color: '#1a1a2e' },
      { type: 'text', x: 50, y: 220, w: 495, h: 50, text: 'Describe the pain point your product solves. What frustrations do your customers face?', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
      { type: 'text', x: 50, y: 300, w: 495, h: 25, text: 'The Solution', fontSize: 18, fontWeight: 800, color: '#1a1a2e' },
      { type: 'text', x: 50, y: 330, w: 495, h: 50, text: 'Explain how your product fixes the problem. Be specific about features and benefits.', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
    ],
  },
];

const PAGE_SIZES = { A4: { w: 595, h: 842 }, Letter: { w: 612, h: 792 }, Legal: { w: 612, h: 1008 } };

let nextId = 100;
const uid = () => 'el_' + (nextId++);

export default function PDFCreator() {
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [pageBg, setPageBg] = useState('#FFFFFF');
  const [editingId, setEditingId] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const pageRef = useRef(null);
  const canvasAreaRef = useRef(null);

  const page = PAGE_SIZES[pageSize];
  const pw = orientation === 'portrait' ? page.w : page.h;
  const ph = orientation === 'portrait' ? page.h : page.w;

  // ── Template loading ───────────────────────────────────
  const loadTemplate = (tmpl) => {
    setElements(tmpl.elements.map(e => ({ ...e, id: uid() })));
    setSelectedId(null);
    setEditingId(null);
    setShowTemplates(false);
  };
  const clearAll = () => { setElements([]); setSelectedId(null); setEditingId(null); };

  // ── Element CRUD ───────────────────────────────────────
  const updateEl = useCallback((id, props) => setElements(els => els.map(e => e.id === id ? { ...e, ...props } : e)), []);
  const deleteEl = (id) => { setElements(els => els.filter(e => e.id !== id)); setSelectedId(null); };

  const addText = () => {
    const el = { id: uid(), type: 'text', x: 50, y: 50, w: 300, h: 30, text: 'New text block', fontSize: 16, fontWeight: 400, color: '#1a1a2e', align: 'left', lineHeight: 1.5 };
    setElements(p => [...p, el]); setSelectedId(el.id);
  };
  const addRect = () => {
    const el = { id: uid(), type: 'rect', x: 50, y: 50, w: 200, h: 100, color: 'var(--sap-bg-page)', radius: 8 };
    setElements(p => [...p, el]); setSelectedId(el.id);
  };
  const addDivider = () => {
    const el = { id: uid(), type: 'divider', x: 50, y: 50, w: 495, h: 2, color: 'var(--sap-border-strong)' };
    setElements(p => [...p, el]); setSelectedId(el.id);
  };
  const addImage = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = (ev) => {
      const f = ev.target.files?.[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        const el = { id: uid(), type: 'image', x: 50, y: 50, w: 200, h: 150, src: re.target.result };
        setElements(p => [...p, el]); setSelectedId(el.id);
      };
      reader.readAsDataURL(f);
    };
    inp.click();
  };

  // ── Drag & Resize ──────────────────────────────────────
  const getScale = () => {
    const area = canvasAreaRef.current;
    if (!area) return 1;
    const pageEl = pageRef.current;
    if (!pageEl) return 1;
    return pageEl.getBoundingClientRect().width / pw;
  };

  const onElMouseDown = (e, id) => {
    if (editingId === id) return; // allow text editing clicks
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    if (editingId && editingId !== id) finishEdit(editingId);
    const el = elements.find(x => x.id === id);
    if (!el) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, scale: getScale() };
  };

  const onHandleDown = (e, id, handle) => {
    e.preventDefault();
    e.stopPropagation();
    const el = elements.find(x => x.id === id);
    if (!el) return;
    resizeRef.current = { id, handle, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.w, origH: el.h, scale: getScale() };
  };

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      const r = resizeRef.current;
      if (d) {
        const dx = (e.clientX - d.startX) / d.scale;
        const dy = (e.clientY - d.startY) / d.scale;
        updateEl(d.id, { x: Math.round(d.origX + dx), y: Math.round(d.origY + dy) });
      }
      if (r) {
        const dx = (e.clientX - r.startX) / r.scale;
        const dy = (e.clientY - r.startY) / r.scale;
        let { origX: nx, origY: ny, origW: nw, origH: nh } = r;
        const h = r.handle;
        if (h.includes('e')) nw = Math.max(30, r.origW + dx);
        if (h.includes('w')) { nw = Math.max(30, r.origW - dx); nx = r.origX + (r.origW - nw); }
        if (h.includes('s')) nh = Math.max(10, r.origH + dy);
        if (h.includes('n')) { nh = Math.max(10, r.origH - dy); ny = r.origY + (r.origH - nh); }
        updateEl(r.id, { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) });
      }
    };
    const onUp = () => { dragRef.current = null; resizeRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [updateEl]);

  // ── Inline text editing ────────────────────────────────
  const startEdit = (id) => {
    const el = elements.find(x => x.id === id);
    if (!el || el.type !== 'text') return;
    setEditingId(id);
    setTimeout(() => {
      const dom = document.getElementById('edit-' + id);
      if (dom) { dom.focus(); }
    }, 50);
  };

  const finishEdit = useCallback((id) => {
    const dom = document.getElementById('edit-' + id);
    if (dom) {
      setElements(els => els.map(e => e.id === id ? { ...e, text: dom.innerText } : e));
    }
    setEditingId(null);
  }, []);

  // ── PDF Export ─────────────────────────────────────────
  const exportPDF = async () => {
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    const node = pageRef.current; if (!node) return;
    // Temporarily remove selection outlines
    setSelectedId(null);
    setEditingId(null);
    await new Promise(r => setTimeout(r, 100));
    const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: pageBg });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: orientation === 'portrait' ? 'p' : 'l', unit: 'pt', format: [pw, ph] });
    pdf.addImage(imgData, 'PNG', 0, 0, pw, ph);
    pdf.save('document-superadpro.pdf');
  };

  // ── Render Element ─────────────────────────────────────
  const renderElement = (el) => {
    const isSel = el.id === selectedId;
    const isEdit = el.id === editingId;

    const baseStyle = {
      position: 'absolute', left: el.x, top: el.y, width: el.w,
      height: el.type === 'text' ? 'auto' : el.h, minHeight: el.h,
      cursor: isEdit ? 'text' : 'move', userSelect: isEdit ? 'text' : 'none',
      outline: isSel ? '2px solid #0ea5e9' : 'none', outlineOffset: 1,
      zIndex: isSel ? 10 : 1,
    };

    let content = null;
    if (el.type === 'text') {
      content = (
        <div id={'edit-' + el.id} contentEditable={isEdit} suppressContentEditableWarning
          onDoubleClick={(e) => { e.stopPropagation(); startEdit(el.id); }}
          onBlur={() => { if (editingId === el.id) finishEdit(el.id); }}
          onMouseDown={(e) => { if (isEdit) e.stopPropagation(); }}
          style={{
            fontSize: el.fontSize || 16, fontWeight: el.fontWeight || 400,
            color: el.color || '#1a1a2e', textAlign: el.align || 'left',
            lineHeight: el.lineHeight || 1.5, letterSpacing: el.letterSpacing || 0,
            whiteSpace: 'pre-wrap', outline: 'none', width: '100%',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >{el.text}</div>
      );
    } else if (el.type === 'rect') {
      content = <div style={{ width: '100%', height: '100%', background: el.color || 'var(--sap-bg-page)', borderRadius: el.radius || 0 }} />;
    } else if (el.type === 'divider') {
      content = <div style={{ width: '100%', height: el.h || 2, background: el.color || 'var(--sap-border-strong)' }} />;
    } else if (el.type === 'image') {
      content = <img src={el.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, display: 'block', pointerEvents: 'none' }} draggable={false} />;
    }

    const handles = isSel && !isEdit ? ['nw','ne','sw','se','n','s','e','w'].map(h => {
      const sz = 8;
      const s = { position: 'absolute', width: sz, height: sz, background: 'var(--sap-accent)', borderRadius: 2, zIndex: 20, boxShadow: '0 0 3px rgba(0,0,0,.3)' };
      if (h.includes('n')) s.top = -sz/2;
      if (h.includes('s')) s.bottom = -sz/2;
      if (h.includes('w')) s.left = -sz/2;
      if (h.includes('e')) s.right = -sz/2;
      if (h === 'n' || h === 's') { s.left = '50%'; s.marginLeft = -sz/2; s.cursor = 'ns-resize'; }
      if (h === 'e' || h === 'w') { s.top = '50%'; s.marginTop = -sz/2; s.cursor = 'ew-resize'; }
      if (h === 'nw' || h === 'se') s.cursor = 'nwse-resize';
      if (h === 'ne' || h === 'sw') s.cursor = 'nesw-resize';
      return <div key={h} style={s} onMouseDown={e => onHandleDown(e, el.id, h)} />;
    }) : null;

    return (
      <div key={el.id} style={baseStyle} onMouseDown={(e) => onElMouseDown(e, el.id)}>
        {content}
        {handles}
      </div>
    );
  };

  const selectedEl = elements.find(e => e.id === selectedId);
  const tb = { padding: '5px 12px', background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#c5cad1', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* TOOLBAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 16px', height: 46, background: '#0d1628', borderBottom: '1px solid rgba(0,180,216,0.06)', flexShrink: 0 }}>
        {/* Template dropdown */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowTemplates(!showTemplates)} style={{ ...tb, display: 'flex', alignItems: 'center', gap: 4 }}>
            Templates <span style={{ fontSize: 8, marginLeft: 2 }}>▼</span>
          </button>
          {showTemplates && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 240, background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,.5)', zIndex: 100, overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}>
              {TEMPLATES.map(t => (
                <div key={t.id} onClick={() => loadTemplate(t)}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #2a3040', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: '#7b8594' }}>{t.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--sap-navy-card)', margin: '0 6px' }} />

        <button onClick={addText} style={tb}>+ Text</button>
        <button onClick={addImage} style={tb}>+ Image</button>
        <button onClick={addRect} style={tb}>+ Shape</button>
        <button onClick={addDivider} style={tb}>+ Divider</button>

        {selectedEl && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--sap-navy-card)', margin: '0 6px' }} />
            <button onClick={() => deleteEl(selectedId)} style={{ ...tb, background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: 'var(--sap-red-bright)' }}>{t('pdfTools.deleteBlock')}</button>
          </>
        )}

        {elements.length > 0 && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--sap-navy-card)', margin: '0 6px' }} />
            <button onClick={clearAll} style={{ ...tb, color: '#7b8594' }}>{t('pdfTools.clearAll')}</button>
          </>
        )}

        <div style={{ flex: 1 }} />
        <button onClick={exportPDF} style={{ padding: '8px 20px', background: 'var(--sap-accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', boxShadow: '0 0 20px rgba(0,212,255,0.15)' }}>{t('pdfTools.downloadPdf')}</button>
      </div>

      {/* CANVAS + PROPERTIES */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 260px', overflow: 'hidden' }}>

        {/* CANVAS — light neutral background */}
        <div ref={canvasAreaRef}
          style={{ overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 30, background: 'var(--sap-border-light)' }}
          onClick={() => { setSelectedId(null); if (editingId) finishEdit(editingId); setShowTemplates(false); }}
        >
          <div ref={pageRef} style={{
            width: pw, minHeight: ph, background: pageBg, borderRadius: 2,
            boxShadow: '0 2px 20px rgba(0,0,0,0.15)', position: 'relative', flexShrink: 0,
          }}>
            {elements.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#b0b8c8', pointerEvents: 'none' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>+</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{t('pdfTools.blankPage')}</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{t("pdfTools.addElementsDesc")}</div>
              </div>
            )}
            {elements.map(el => renderElement(el))}
            {elements.length > 0 && (
              <div style={{ position: 'absolute', bottom: 12, right: 20, fontSize: 9, color: 'rgba(0,0,0,0.1)', fontWeight: 600, pointerEvents: 'none' }}>{t("pdfTools.createdWith")}</div>
            )}
          </div>
        </div>

        {/* PROPERTIES PANEL */}
        <div style={{ background: '#0d1628', borderLeft: '1px solid rgba(0,180,216,0.06)', padding: 16, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>{t('pdfTools.pageSettings')}</div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>{t('pdfTools.pageSizeLabel')}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.keys(PAGE_SIZES).map(s => (
                <button key={s} onClick={() => setPageSize(s)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 11, fontWeight: pageSize === s ? 700 : 600, background: pageSize === s ? 'var(--sap-accent)' : 'var(--sap-navy-soft)', color: pageSize === s ? '#fff' : '#7b8594', borderWidth: 1, borderStyle: 'solid', borderColor: pageSize === s ? 'var(--sap-accent)' : 'var(--sap-navy-card)' }}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>{t('pdfTools.orientationLabel')}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['portrait', 'landscape'].map(o => (
                <button key={o} onClick={() => setOrientation(o)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 11, textTransform: 'capitalize', fontWeight: orientation === o ? 700 : 600, background: orientation === o ? 'var(--sap-accent)' : 'var(--sap-navy-soft)', color: orientation === o ? '#fff' : '#7b8594', borderWidth: 1, borderStyle: 'solid', borderColor: orientation === o ? 'var(--sap-accent)' : 'var(--sap-navy-card)' }}>{o}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>{t('pdfTools.backgroundLabel')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 8 }}>
              <input type="color" value={pageBg} onChange={e => setPageBg(e.target.value)} style={{ width: 22, height: 22, border: 'none', borderRadius: 5, cursor: 'pointer', padding: 0, background: 'none' }} />
              <span style={{ fontSize: 11, color: '#c5cad1' }}>{pageBg}</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 1, background: 'var(--sap-navy-card)', margin: '8px 0 14px' }} />

          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
            {selectedEl ? `${selectedEl.type} properties` : 'Element properties'}
          </div>

          {!selectedEl ? (
            <div style={{ padding: 14, background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 10, textAlign: 'center', fontSize: 12, color: '#7b8594' }}>Click an element to edit</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedEl.type === 'text' && (
                <>
                  <div>
                    <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 3, fontWeight: 600 }}>Font size</div>
                    <input type="number" value={selectedEl.fontSize || 16} onChange={e => updateEl(selectedId, { fontSize: +e.target.value })} style={{ width: '100%', padding: '6px 8px', background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: '"DM Sans",sans-serif' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 3, fontWeight: 600 }}>Weight</div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[{v:400,l:'Reg'},{v:600,l:'Semi'},{v:700,l:'Bold'},{v:900,l:'Black'}].map(fw => (
                        <button key={fw.v} onClick={() => updateEl(selectedId, { fontWeight: fw.v })} style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 10, fontWeight: (selectedEl.fontWeight || 400) === fw.v ? 700 : 600, background: (selectedEl.fontWeight || 400) === fw.v ? 'var(--sap-accent)' : 'var(--sap-navy-soft)', color: (selectedEl.fontWeight || 400) === fw.v ? '#fff' : '#7b8594', borderWidth: 1, borderStyle: 'solid', borderColor: (selectedEl.fontWeight || 400) === fw.v ? 'var(--sap-accent)' : 'var(--sap-navy-card)' }}>{fw.l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 3, fontWeight: 600 }}>Align</div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {['left','center','right'].map(a => (
                        <button key={a} onClick={() => updateEl(selectedId, { align: a })} style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 10, textTransform: 'capitalize', fontWeight: (selectedEl.align || 'left') === a ? 700 : 600, background: (selectedEl.align || 'left') === a ? 'var(--sap-accent)' : 'var(--sap-navy-soft)', color: (selectedEl.align || 'left') === a ? '#fff' : '#7b8594', borderWidth: 1, borderStyle: 'solid', borderColor: (selectedEl.align || 'left') === a ? 'var(--sap-accent)' : 'var(--sap-navy-card)' }}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 3, fontWeight: 600 }}>Colour</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 7 }}>
                      <input type="color" value={selectedEl.color || '#1a1a2e'} onChange={e => updateEl(selectedId, { color: e.target.value })} style={{ width: 18, height: 18, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0, background: 'none' }} />
                      <span style={{ fontSize: 10, color: '#c5cad1' }}>{(selectedEl.color || '#1a1a2e').toUpperCase()}</span>
                    </div>
                  </div>
                </>
              )}
              {(selectedEl.type === 'rect' || selectedEl.type === 'divider') && (
                <div>
                  <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 3, fontWeight: 600 }}>Colour</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 7 }}>
                    <input type="color" value={selectedEl.color || 'var(--sap-bg-page)'} onChange={e => updateEl(selectedId, { color: e.target.value })} style={{ width: 18, height: 18, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0, background: 'none' }} />
                    <span style={{ fontSize: 10, color: '#c5cad1' }}>{(selectedEl.color || 'var(--sap-bg-page)').toUpperCase()}</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {[['X','x'],['Y','y'],['W','w'],['H','h']].map(([label, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 3, fontWeight: 600 }}>{label}</div>
                    <input type="number" value={Math.round(selectedEl[key])} onChange={e => updateEl(selectedId, { [key]: +e.target.value })} style={{ width: '100%', padding: '5px 7px', background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 6, color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: '"DM Sans",sans-serif' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <div style={{ padding: '8px 12px', background: 'rgba(14,165,233,0.03)', border: '1px solid rgba(0,180,216,0.06)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', flex: 1 }}>Earn money with SuperAdPro</span>
              <Link to="/earn" style={{ fontSize: 9, fontWeight: 700, color: 'var(--sap-accent)', textDecoration: 'none' }}>See how →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
