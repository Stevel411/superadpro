import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════
   PDF Creator — Visual drag-and-drop PDF builder
   Template picker → Canvas editor → Export as PDF
   Uses html2canvas + jsPDF for pixel-perfect PDF rendering
   ═══════════════════════════════════════════════════════════ */

// ── TEMPLATES ────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'lead-magnet', name: 'Lead Magnet', desc: 'eBook / Guide', category: 'lead',
    color: '#8b5cf6', badge: 'POPULAR',
    elements: [
      { id: 'e1', type: 'text', x: 50, y: 40, w: 495, h: 30, text: 'FREE GUIDE', fontSize: 14, fontWeight: 700, color: '#8b5cf6', align: 'center', letterSpacing: 4 },
      { id: 'e2', type: 'text', x: 50, y: 80, w: 495, h: 70, text: '10 Steps to Building\nYour Online Business', fontSize: 32, fontWeight: 900, color: '#1a1a2e', align: 'center', lineHeight: 1.2 },
      { id: 'e3', type: 'text', x: 80, y: 170, w: 435, h: 40, text: 'Everything you need to know to start earning from home in 2026', fontSize: 14, color: '#6b7280', align: 'center', lineHeight: 1.6 },
      { id: 'e4', type: 'divider', x: 50, y: 230, w: 495, h: 2, color: '#e5e7eb' },
      { id: 'e5', type: 'text', x: 50, y: 260, w: 495, h: 30, text: 'Step 1: Find Your Niche', fontSize: 20, fontWeight: 800, color: '#1a1a2e' },
      { id: 'e6', type: 'text', x: 50, y: 300, w: 495, h: 70, text: 'The most important decision you\'ll make is choosing a niche that aligns with your passion and has market demand. Research trending topics and validate your idea.', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
      { id: 'e7', type: 'text', x: 50, y: 390, w: 495, h: 30, text: 'Step 2: Build Your Platform', fontSize: 20, fontWeight: 800, color: '#1a1a2e' },
      { id: 'e8', type: 'text', x: 50, y: 430, w: 495, h: 70, text: 'Every successful online business needs a home base. Whether it\'s a website, social media presence, or both — your platform is where you\'ll attract and convert your audience.', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
      { id: 'e9', type: 'text', x: 50, y: 520, w: 495, h: 30, text: 'Step 3: Create Your First Product', fontSize: 20, fontWeight: 800, color: '#1a1a2e' },
      { id: 'e10', type: 'text', x: 50, y: 560, w: 495, h: 70, text: 'Start with a minimum viable product. Digital products like courses, eBooks, and templates are the fastest way to start generating revenue without inventory costs.', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
    ],
  },
  {
    id: 'report', name: 'Business Report', desc: 'Data + charts', category: 'report',
    color: '#0ea5e9',
    elements: [
      { id: 'e1', type: 'rect', x: 0, y: 0, w: 595, h: 120, color: '#0f172a' },
      { id: 'e2', type: 'text', x: 50, y: 35, w: 495, h: 40, text: 'Q4 Business Report', fontSize: 28, fontWeight: 900, color: '#ffffff' },
      { id: 'e3', type: 'text', x: 50, y: 80, w: 495, h: 20, text: 'Prepared by Your Company  |  March 2026', fontSize: 12, color: 'rgba(255,255,255,0.6)' },
      { id: 'e4', type: 'text', x: 50, y: 150, w: 495, h: 30, text: 'Executive Summary', fontSize: 20, fontWeight: 800, color: '#1a1a2e' },
      { id: 'e5', type: 'text', x: 50, y: 190, w: 495, h: 80, text: 'This report outlines key performance indicators, revenue growth, and strategic initiatives for Q4. Overall performance exceeded expectations with a 23% increase in monthly recurring revenue and significant improvements in customer retention.', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
      { id: 'e6', type: 'divider', x: 50, y: 290, w: 495, h: 2, color: '#e5e7eb' },
      { id: 'e7', type: 'text', x: 50, y: 320, w: 495, h: 30, text: 'Key Metrics', fontSize: 20, fontWeight: 800, color: '#1a1a2e' },
      { id: 'e8', type: 'rect', x: 50, y: 360, w: 150, h: 80, color: '#f0f9ff', radius: 10 },
      { id: 'e9', type: 'text', x: 60, y: 370, w: 130, h: 20, text: 'Revenue', fontSize: 12, color: '#64748b' },
      { id: 'e10', type: 'text', x: 60, y: 395, w: 130, h: 30, text: '$142,500', fontSize: 24, fontWeight: 800, color: '#0ea5e9' },
      { id: 'e11', type: 'rect', x: 220, y: 360, w: 150, h: 80, color: '#f0fdf4', radius: 10 },
      { id: 'e12', type: 'text', x: 230, y: 370, w: 130, h: 20, text: 'Growth', fontSize: 12, color: '#64748b' },
      { id: 'e13', type: 'text', x: 230, y: 395, w: 130, h: 30, text: '+23%', fontSize: 24, fontWeight: 800, color: '#16a34a' },
      { id: 'e14', type: 'rect', x: 390, y: 360, w: 155, h: 80, color: '#fefce8', radius: 10 },
      { id: 'e15', type: 'text', x: 400, y: 370, w: 135, h: 20, text: 'Customers', fontSize: 12, color: '#64748b' },
      { id: 'e16', type: 'text', x: 400, y: 395, w: 135, h: 30, text: '1,847', fontSize: 24, fontWeight: 800, color: '#ca8a04' },
    ],
  },
  {
    id: 'invoice', name: 'Invoice', desc: 'Professional billing', category: 'invoice',
    color: '#22c55e',
    elements: [
      { id: 'e1', type: 'text', x: 50, y: 50, w: 200, h: 35, text: 'INVOICE', fontSize: 28, fontWeight: 900, color: '#1a1a2e' },
      { id: 'e2', type: 'text', x: 400, y: 50, w: 145, h: 20, text: 'Invoice #INV-0042', fontSize: 13, color: '#6b7280', align: 'right' },
      { id: 'e3', type: 'text', x: 400, y: 72, w: 145, h: 20, text: 'Date: 30 March 2026', fontSize: 13, color: '#6b7280', align: 'right' },
      { id: 'e4', type: 'divider', x: 50, y: 110, w: 495, h: 2, color: '#1a1a2e' },
      { id: 'e5', type: 'text', x: 50, y: 130, w: 200, h: 20, text: 'Bill To:', fontSize: 13, fontWeight: 700, color: '#1a1a2e' },
      { id: 'e6', type: 'text', x: 50, y: 152, w: 250, h: 60, text: 'Client Name\n123 Business Street\nLondon, EC1A 1BB\nUnited Kingdom', fontSize: 12, color: '#6b7280', lineHeight: 1.6 },
      { id: 'e7', type: 'text', x: 350, y: 130, w: 195, h: 20, text: 'From:', fontSize: 13, fontWeight: 700, color: '#1a1a2e' },
      { id: 'e8', type: 'text', x: 350, y: 152, w: 195, h: 60, text: 'Your Company Name\n456 Your Address\nYour City, Postcode\nYour Country', fontSize: 12, color: '#6b7280', lineHeight: 1.6 },
      { id: 'e9', type: 'rect', x: 50, y: 250, w: 495, h: 30, color: '#f1f5f9' },
      { id: 'e10', type: 'text', x: 60, y: 256, w: 250, h: 18, text: 'Description', fontSize: 11, fontWeight: 700, color: '#475569' },
      { id: 'e11', type: 'text', x: 360, y: 256, w: 60, h: 18, text: 'Qty', fontSize: 11, fontWeight: 700, color: '#475569', align: 'center' },
      { id: 'e12', type: 'text', x: 430, y: 256, w: 115, h: 18, text: 'Amount', fontSize: 11, fontWeight: 700, color: '#475569', align: 'right' },
      { id: 'e13', type: 'text', x: 60, y: 290, w: 250, h: 18, text: 'Web Design Services', fontSize: 12, color: '#374151' },
      { id: 'e14', type: 'text', x: 360, y: 290, w: 60, h: 18, text: '1', fontSize: 12, color: '#374151', align: 'center' },
      { id: 'e15', type: 'text', x: 430, y: 290, w: 115, h: 18, text: '$2,500.00', fontSize: 12, color: '#374151', align: 'right' },
      { id: 'e16', type: 'text', x: 60, y: 316, w: 250, h: 18, text: 'SEO Optimisation', fontSize: 12, color: '#374151' },
      { id: 'e17', type: 'text', x: 360, y: 316, w: 60, h: 18, text: '1', fontSize: 12, color: '#374151', align: 'center' },
      { id: 'e18', type: 'text', x: 430, y: 316, w: 115, h: 18, text: '$800.00', fontSize: 12, color: '#374151', align: 'right' },
      { id: 'e19', type: 'divider', x: 350, y: 350, w: 195, h: 1, color: '#e5e7eb' },
      { id: 'e20', type: 'text', x: 350, y: 362, w: 80, h: 20, text: 'Total:', fontSize: 16, fontWeight: 800, color: '#1a1a2e' },
      { id: 'e21', type: 'text', x: 430, y: 362, w: 115, h: 20, text: '$3,300.00', fontSize: 16, fontWeight: 800, color: '#22c55e', align: 'right' },
    ],
  },
  {
    id: 'resume', name: 'Resume / CV', desc: 'Clean professional', category: 'resume',
    color: '#ef4444',
    elements: [
      { id: 'e1', type: 'rect', x: 0, y: 0, w: 595, h: 100, color: '#1e293b' },
      { id: 'e2', type: 'text', x: 50, y: 25, w: 300, h: 35, text: 'Your Full Name', fontSize: 28, fontWeight: 900, color: '#ffffff' },
      { id: 'e3', type: 'text', x: 50, y: 65, w: 400, h: 20, text: 'Professional Title  |  your@email.com  |  +44 7700 900000', fontSize: 12, color: 'rgba(255,255,255,0.6)' },
      { id: 'e4', type: 'text', x: 50, y: 130, w: 495, h: 20, text: 'PROFESSIONAL SUMMARY', fontSize: 13, fontWeight: 700, color: '#ef4444', letterSpacing: 2 },
      { id: 'e5', type: 'text', x: 50, y: 158, w: 495, h: 60, text: 'Results-driven professional with over 10 years of experience in digital marketing and business development. Proven track record of increasing revenue, building high-performing teams, and driving strategic growth initiatives.', fontSize: 12, color: '#4b5563', lineHeight: 1.7 },
      { id: 'e6', type: 'divider', x: 50, y: 235, w: 495, h: 1, color: '#e5e7eb' },
      { id: 'e7', type: 'text', x: 50, y: 255, w: 495, h: 20, text: 'EXPERIENCE', fontSize: 13, fontWeight: 700, color: '#ef4444', letterSpacing: 2 },
      { id: 'e8', type: 'text', x: 50, y: 283, w: 300, h: 22, text: 'Senior Marketing Manager', fontSize: 16, fontWeight: 700, color: '#1a1a2e' },
      { id: 'e9', type: 'text', x: 400, y: 285, w: 145, h: 18, text: '2022 — Present', fontSize: 12, color: '#6b7280', align: 'right' },
      { id: 'e10', type: 'text', x: 50, y: 305, w: 300, h: 18, text: 'Company Name, London', fontSize: 12, color: '#6b7280' },
      { id: 'e11', type: 'text', x: 50, y: 330, w: 495, h: 50, text: '• Led a team of 12 across paid media, content, and analytics\n• Increased organic traffic by 180% in 18 months\n• Managed annual marketing budget of £2.5M', fontSize: 12, color: '#4b5563', lineHeight: 1.6 },
    ],
  },
  {
    id: 'one-pager', name: 'One-Pager', desc: 'Pitch / overview', category: 'onepager',
    color: '#f59e0b',
    elements: [
      { id: 'e1', type: 'rect', x: 0, y: 0, w: 595, h: 160, color: '#0f172a' },
      { id: 'e2', type: 'text', x: 50, y: 40, w: 495, h: 40, text: 'Your Product Name', fontSize: 34, fontWeight: 900, color: '#ffffff' },
      { id: 'e3', type: 'text', x: 50, y: 95, w: 400, h: 40, text: 'A short tagline that explains what you do and why it matters to your audience.', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 },
      { id: 'e4', type: 'text', x: 50, y: 190, w: 495, h: 25, text: 'The Problem', fontSize: 18, fontWeight: 800, color: '#1a1a2e' },
      { id: 'e5', type: 'text', x: 50, y: 220, w: 495, h: 50, text: 'Describe the pain point your product solves. What frustrations do your customers face? What are they currently doing that doesn\'t work well enough?', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
      { id: 'e6', type: 'text', x: 50, y: 300, w: 495, h: 25, text: 'The Solution', fontSize: 18, fontWeight: 800, color: '#1a1a2e' },
      { id: 'e7', type: 'text', x: 50, y: 330, w: 495, h: 50, text: 'Explain how your product fixes the problem. Be specific about the key features and benefits. Use concrete numbers where possible.', fontSize: 13, color: '#4b5563', lineHeight: 1.7 },
      { id: 'e8', type: 'rect', x: 50, y: 410, w: 150, h: 70, color: '#fef3c7', radius: 10 },
      { id: 'e9', type: 'text', x: 60, y: 420, w: 130, h: 16, text: 'Metric One', fontSize: 11, color: '#92400e' },
      { id: 'e10', type: 'text', x: 60, y: 442, w: 130, h: 25, text: '10,000+', fontSize: 22, fontWeight: 800, color: '#f59e0b' },
      { id: 'e11', type: 'rect', x: 220, y: 410, w: 150, h: 70, color: '#fef3c7', radius: 10 },
      { id: 'e12', type: 'text', x: 230, y: 420, w: 130, h: 16, text: 'Metric Two', fontSize: 11, color: '#92400e' },
      { id: 'e13', type: 'text', x: 230, y: 442, w: 130, h: 25, text: '98%', fontSize: 22, fontWeight: 800, color: '#f59e0b' },
    ],
  },
  {
    id: 'blank', name: 'Blank Page', desc: 'Build from scratch', category: 'blank',
    color: '#64748b',
    elements: [],
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'lead', name: 'Lead Magnets' },
  { id: 'report', name: 'Reports' },
  { id: 'invoice', name: 'Invoices' },
  { id: 'resume', name: 'Resumes' },
  { id: 'onepager', name: 'One-Pagers' },
  { id: 'blank', name: 'Blank' },
];

const PAGE_SIZES = {
  A4: { w: 595, h: 842 },
  Letter: { w: 612, h: 792 },
  Legal: { w: 612, h: 1008 },
};

let nextId = 100;
const uid = () => 'el_' + (nextId++);

export default function PDFCreator() {
  const [view, setView] = useState('templates'); // 'templates' | 'editor'
  const [catFilter, setCatFilter] = useState('all');
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [pageBg, setPageBg] = useState('#FFFFFF');
  const [editingId, setEditingId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  const canvasRef = useRef(null);
  const pageRef = useRef(null);

  const page = PAGE_SIZES[pageSize];
  const pw = orientation === 'portrait' ? page.w : page.h;
  const ph = orientation === 'portrait' ? page.h : page.w;

  // ── Template Selection ─────────────────────────────────
  const selectTemplate = (tmpl) => {
    setElements(tmpl.elements.map(e => ({ ...e, id: uid() })));
    setView('editor');
    setSelectedId(null);
  };

  const filtered = catFilter === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === catFilter);

  // ── Element CRUD ───────────────────────────────────────
  const updateEl = (id, props) => setElements(els => els.map(e => e.id === id ? { ...e, ...props } : e));
  const deleteEl = (id) => { setElements(els => els.filter(e => e.id !== id)); setSelectedId(null); };

  const addText = () => {
    const el = { id: uid(), type: 'text', x: 50, y: 50, w: 300, h: 30, text: 'New text block', fontSize: 16, fontWeight: 400, color: '#1a1a2e', align: 'left', lineHeight: 1.5 };
    setElements(p => [...p, el]); setSelectedId(el.id);
  };
  const addRect = () => {
    const el = { id: uid(), type: 'rect', x: 50, y: 50, w: 200, h: 100, color: '#f1f5f9', radius: 8 };
    setElements(p => [...p, el]); setSelectedId(el.id);
  };
  const addDivider = () => {
    const el = { id: uid(), type: 'divider', x: 50, y: 50, w: 495, h: 2, color: '#e5e7eb' };
    setElements(p => [...p, el]); setSelectedId(el.id);
  };
  const addImage = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
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

  // ── Drag ───────────────────────────────────────────────
  const onMouseDown = (e, id) => {
    if (editingId) return;
    e.stopPropagation();
    setSelectedId(id);
    const el = elements.find(x => x.id === id);
    if (!el) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    const scale = rect ? rect.width / pw : 1;
    setDragState({ id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, scale });
  };

  const onResizeDown = (e, id, handle) => {
    e.stopPropagation(); e.preventDefault();
    const el = elements.find(x => x.id === id);
    if (!el) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    const scale = rect ? rect.width / pw : 1;
    setResizeState({ id, handle, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.w, origH: el.h, scale });
  };

  useEffect(() => {
    if (!dragState && !resizeState) return;

    const onMove = (e) => {
      if (dragState) {
        const dx = (e.clientX - dragState.startX) / dragState.scale;
        const dy = (e.clientY - dragState.startY) / dragState.scale;
        updateEl(dragState.id, { x: Math.round(dragState.origX + dx), y: Math.round(dragState.origY + dy) });
      }
      if (resizeState) {
        const dx = (e.clientX - resizeState.startX) / resizeState.scale;
        const dy = (e.clientY - resizeState.startY) / resizeState.scale;
        let { origX, origY, origW, origH } = resizeState;
        const h = resizeState.handle;
        let nx = origX, ny = origY, nw = origW, nh = origH;
        if (h.includes('e')) nw = Math.max(30, origW + dx);
        if (h.includes('w')) { nw = Math.max(30, origW - dx); nx = origX + dx; }
        if (h.includes('s')) nh = Math.max(10, origH + dy);
        if (h.includes('n')) { nh = Math.max(10, origH - dy); ny = origY + dy; }
        updateEl(resizeState.id, { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) });
      }
    };
    const onUp = () => { setDragState(null); setResizeState(null); };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragState, resizeState]);

  // ── Inline text editing ────────────────────────────────
  const startEdit = (id) => {
    const el = elements.find(x => x.id === id);
    if (!el || el.type !== 'text') return;
    setEditingId(id);
    setTimeout(() => {
      const dom = document.getElementById('edit-' + id);
      if (dom) { dom.focus(); const sel = window.getSelection(); sel.selectAllChildren(dom); sel.collapseToEnd(); }
    }, 50);
  };

  const finishEdit = (id) => {
    const dom = document.getElementById('edit-' + id);
    if (dom) updateEl(id, { text: dom.innerText });
    setEditingId(null);
  };

  // ── PDF Export ─────────────────────────────────────────
  const exportPDF = async () => {
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    const node = pageRef.current;
    if (!node) return;

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
      position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.type === 'text' ? 'auto' : el.h,
      minHeight: el.h, cursor: isEdit ? 'text' : 'move', userSelect: isEdit ? 'text' : 'none',
      outline: isSel ? '2px solid #0ea5e9' : 'none', outlineOffset: 2,
    };

    let content = null;
    if (el.type === 'text') {
      content = (
        <div
          id={'edit-' + el.id}
          contentEditable={isEdit}
          suppressContentEditableWarning
          onDoubleClick={(e) => { e.stopPropagation(); startEdit(el.id); }}
          onBlur={() => finishEdit(el.id)}
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
      content = <div style={{ width: '100%', height: '100%', background: el.color || '#f1f5f9', borderRadius: el.radius || 0 }} />;
    } else if (el.type === 'divider') {
      content = <div style={{ width: '100%', height: el.h || 2, background: el.color || '#e5e7eb' }} />;
    } else if (el.type === 'image') {
      content = <img src={el.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, display: 'block' }} />;
    }

    return (
      <div key={el.id} style={baseStyle} onMouseDown={(e) => onMouseDown(e, el.id)}>
        {content}
        {isSel && !isEdit && (
          <>
            {['nw','ne','sw','se','n','s','e','w'].map(h => {
              const s = { position: 'absolute', width: h.length === 1 ? (h === 'n' || h === 's' ? 20 : 8) : 8, height: h.length === 1 ? (h === 'e' || h === 'w' ? 20 : 8) : 8, background: '#0ea5e9', borderRadius: 2, zIndex: 10 };
              if (h.includes('n')) s.top = -4;
              if (h.includes('s')) s.bottom = -4;
              if (h.includes('w')) s.left = -4;
              if (h.includes('e')) s.right = -4;
              if (h === 'n') { s.left = '50%'; s.transform = 'translateX(-50%)'; s.cursor = 'ns-resize'; }
              if (h === 's') { s.left = '50%'; s.transform = 'translateX(-50%)'; s.cursor = 'ns-resize'; }
              if (h === 'e') { s.top = '50%'; s.transform = 'translateY(-50%)'; s.cursor = 'ew-resize'; }
              if (h === 'w') { s.top = '50%'; s.transform = 'translateY(-50%)'; s.cursor = 'ew-resize'; }
              if (h === 'nw') { s.cursor = 'nwse-resize'; }
              if (h === 'ne') { s.cursor = 'nesw-resize'; }
              if (h === 'sw') { s.cursor = 'nesw-resize'; }
              if (h === 'se') { s.cursor = 'nwse-resize'; }
              return <div key={h} style={s} onMouseDown={e => onResizeDown(e, el.id, h)} />;
            })}
          </>
        )}
      </div>
    );
  };

  const selectedEl = elements.find(e => e.id === selectedId);

  // ═══════════════════════════════════════════════════════
  // TEMPLATE PICKER VIEW
  // ═══════════════════════════════════════════════════════
  if (view === 'templates') {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 24, color: '#fff', marginBottom: 6 }}>Choose a template or start from scratch</div>
          <div style={{ fontSize: 13, color: 'rgba(200,220,255,0.35)' }}>Professional templates for lead magnets, reports, invoices, and more. Fully customisable.</div>
        </div>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: '"DM Sans",sans-serif', fontSize: 11,
                fontWeight: catFilter === c.id ? 700 : 600,
                background: catFilter === c.id ? '#0ea5e9' : '#1b2030',
                color: catFilter === c.id ? '#fff' : '#7b8594',
                borderWidth: 1, borderStyle: 'solid',
                borderColor: catFilter === c.id ? '#0ea5e9' : '#2a3040',
              }}>{c.name}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, maxWidth: 960, margin: '0 auto' }}>
          {filtered.map(tmpl => (
            <div key={tmpl.id} onClick={() => selectTemplate(tmpl)}
              style={{ borderRadius: 10, overflow: 'hidden', border: tmpl.badge ? `2px solid ${tmpl.color}40` : '2px solid transparent', cursor: 'pointer', background: '#0a1220', transition: 'all .15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{ aspectRatio: '0.71', background: `linear-gradient(135deg, ${tmpl.color}15, ${tmpl.color}25)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative' }}>
                {tmpl.id === 'blank' ? (
                  <>
                    <div style={{ width: 40, height: 40, borderRadius: 10, border: '2px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)' }}>+</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Start blank</div>
                  </>
                ) : (
                  <>
                    <div style={{ width: '60%', height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 3, marginBottom: 6 }} />
                    <div style={{ width: '80%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 4 }} />
                    <div style={{ width: '75%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 4 }} />
                    <div style={{ width: '70%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 10 }} />
                    <div style={{ width: '60%', height: 16, background: `${tmpl.color}30`, borderRadius: 4 }} />
                  </>
                )}
                {tmpl.badge && <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 7, fontWeight: 700, color: tmpl.color, background: `${tmpl.color}20`, padding: '2px 6px', borderRadius: 4 }}>{tmpl.badge}</div>}
              </div>
              <div style={{ padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{tmpl.name}</div>
                <div style={{ fontSize: 9, color: '#7b8594' }}>{tmpl.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(0,180,216,0.08)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'rgba(200,220,255,0.3)' }}>Want AI video, music & voiceover?</span>
            <Link to="/register" style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', textDecoration: 'none' }}>Join SuperAdPro free</Link>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // EDITOR VIEW
  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* TOOLBAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 16px', height: 46, background: '#0d1628', borderBottom: '1px solid rgba(0,180,216,0.06)', flexShrink: 0 }}>
        <button onClick={() => setView('templates')} style={{ padding: '5px 12px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#7b8594', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', marginRight: 8 }}>← Templates</button>

        <div style={{ width: 1, height: 20, background: '#2a3040', margin: '0 6px' }} />

        {/* Add blocks */}
        <button onClick={addText} style={{ padding: '5px 12px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#7b8594', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif' }}>+ Text</button>
        <button onClick={addImage} style={{ padding: '5px 12px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#7b8594', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif' }}>+ Image</button>
        <button onClick={addRect} style={{ padding: '5px 12px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#7b8594', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif' }}>+ Shape</button>
        <button onClick={addDivider} style={{ padding: '5px 12px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#7b8594', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif' }}>+ Divider</button>

        {selectedEl && (
          <>
            <div style={{ width: 1, height: 20, background: '#2a3040', margin: '0 6px' }} />
            <button onClick={() => deleteEl(selectedId)} style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif' }}>Delete</button>
          </>
        )}

        <div style={{ flex: 1 }} />
        <button onClick={exportPDF} style={{ padding: '8px 20px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', boxShadow: '0 0 20px rgba(0,212,255,0.15)' }}>Download PDF</button>
      </div>

      {/* CANVAS + PROPERTIES */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 260px', overflow: 'hidden' }}>

        {/* CANVAS */}
        <div ref={canvasRef} style={{ overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 30, background: '#0a0e1a' }}
          onClick={() => { setSelectedId(null); if (editingId) finishEdit(editingId); }}
        >
          <div ref={pageRef} style={{
            width: pw, minHeight: ph, background: pageBg, borderRadius: 2,
            boxShadow: '0 4px 40px rgba(0,0,0,0.4)', position: 'relative', flexShrink: 0,
          }}>
            {elements.map(el => renderElement(el))}
            <div style={{ position: 'absolute', bottom: 12, right: 20, fontSize: 9, color: 'rgba(0,0,0,0.12)', fontWeight: 600 }}>Created with SuperAdPro.com</div>
          </div>
        </div>

        {/* PROPERTIES PANEL */}
        <div style={{ background: '#0d1628', borderLeft: '1px solid rgba(0,180,216,0.06)', padding: 16, overflow: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Page settings</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Page size</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.keys(PAGE_SIZES).map(s => (
                <button key={s} onClick={() => setPageSize(s)}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 11,
                    fontWeight: pageSize === s ? 700 : 600,
                    background: pageSize === s ? '#0ea5e9' : '#1b2030',
                    color: pageSize === s ? '#fff' : '#7b8594',
                    borderWidth: 1, borderStyle: 'solid', borderColor: pageSize === s ? '#0ea5e9' : '#2a3040',
                  }}>{s}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Orientation</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['portrait', 'landscape'].map(o => (
                <button key={o} onClick={() => setOrientation(o)}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 11, textTransform: 'capitalize',
                    fontWeight: orientation === o ? 700 : 600,
                    background: orientation === o ? '#0ea5e9' : '#1b2030',
                    color: orientation === o ? '#fff' : '#7b8594',
                    borderWidth: 1, borderStyle: 'solid', borderColor: orientation === o ? '#0ea5e9' : '#2a3040',
                  }}>{o}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Background</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 8 }}>
              <input type="color" value={pageBg} onChange={e => setPageBg(e.target.value)} style={{ width: 24, height: 24, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0, background: 'none' }} />
              <span style={{ fontSize: 11, color: '#c5cad1' }}>{pageBg}</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 1, background: '#2a3040', margin: '16px 0' }} />

          {/* Selected element properties */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
            {selectedEl ? `${selectedEl.type} properties` : 'Selected element'}
          </div>

          {!selectedEl ? (
            <div style={{ padding: 16, background: '#1b2030', border: '1px solid #2a3040', borderRadius: 10, textAlign: 'center', fontSize: 12, color: '#7b8594' }}>
              Click an element to edit
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedEl.type === 'text' && (
                <>
                  <div>
                    <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Font size</div>
                    <input type="number" value={selectedEl.fontSize || 16} onChange={e => updateEl(selectedId, { fontSize: +e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: '"DM Sans",sans-serif' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Font weight</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[400, 600, 700, 900].map(fw => (
                        <button key={fw} onClick={() => updateEl(selectedId, { fontWeight: fw })}
                          style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 10,
                            fontWeight: (selectedEl.fontWeight || 400) === fw ? 700 : 600,
                            background: (selectedEl.fontWeight || 400) === fw ? '#0ea5e9' : '#1b2030',
                            color: (selectedEl.fontWeight || 400) === fw ? '#fff' : '#7b8594',
                            borderWidth: 1, borderStyle: 'solid', borderColor: (selectedEl.fontWeight || 400) === fw ? '#0ea5e9' : '#2a3040',
                          }}>{fw === 400 ? 'Regular' : fw === 600 ? 'Semi' : fw === 700 ? 'Bold' : 'Black'}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Alignment</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['left', 'center', 'right'].map(a => (
                        <button key={a} onClick={() => updateEl(selectedId, { align: a })}
                          style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 10, textTransform: 'capitalize',
                            fontWeight: (selectedEl.align || 'left') === a ? 700 : 600,
                            background: (selectedEl.align || 'left') === a ? '#0ea5e9' : '#1b2030',
                            color: (selectedEl.align || 'left') === a ? '#fff' : '#7b8594',
                            borderWidth: 1, borderStyle: 'solid', borderColor: (selectedEl.align || 'left') === a ? '#0ea5e9' : '#2a3040',
                          }}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Text colour</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 8 }}>
                      <input type="color" value={selectedEl.color || '#1a1a2e'} onChange={e => updateEl(selectedId, { color: e.target.value })} style={{ width: 20, height: 20, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0, background: 'none' }} />
                      <span style={{ fontSize: 10, color: '#c5cad1' }}>{(selectedEl.color || '#1a1a2e').toUpperCase()}</span>
                    </div>
                  </div>
                </>
              )}
              {(selectedEl.type === 'rect' || selectedEl.type === 'divider') && (
                <div>
                  <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Colour</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 8 }}>
                    <input type="color" value={selectedEl.color || '#f1f5f9'} onChange={e => updateEl(selectedId, { color: e.target.value })} style={{ width: 20, height: 20, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0, background: 'none' }} />
                    <span style={{ fontSize: 10, color: '#c5cad1' }}>{(selectedEl.color || '#f1f5f9').toUpperCase()}</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>X</div>
                  <input type="number" value={Math.round(selectedEl.x)} onChange={e => updateEl(selectedId, { x: +e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 6, color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: '"DM Sans",sans-serif' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Y</div>
                  <input type="number" value={Math.round(selectedEl.y)} onChange={e => updateEl(selectedId, { y: +e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 6, color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: '"DM Sans",sans-serif' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>W</div>
                  <input type="number" value={Math.round(selectedEl.w)} onChange={e => updateEl(selectedId, { w: +e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 6, color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: '"DM Sans",sans-serif' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>H</div>
                  <input type="number" value={Math.round(selectedEl.h)} onChange={e => updateEl(selectedId, { h: +e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 6, color: '#fff', fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: '"DM Sans",sans-serif' }} />
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <div style={{ padding: '8px 12px', background: 'rgba(14,165,233,0.03)', border: '1px solid rgba(0,180,216,0.06)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', flex: 1 }}>Earn money with SuperAdPro</span>
              <Link to="/earn" style={{ fontSize: 9, fontWeight: 700, color: '#0ea5e9', textDecoration: 'none' }}>See how →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
