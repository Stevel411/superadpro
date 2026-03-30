import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════
   SuperAdPro — Free Meme Generator
   Industry-standard layout: compact preview left, controls right
   Real templates from Imgflip API, canvas rendering, zero cost
   ═══════════════════════════════════════════════════════════ */

const FONTS = [
  { id: 'impact', name: 'Impact', family: 'Impact, Haettenschweiler, sans-serif' },
  { id: 'arial', name: 'Arial Black', family: '"Arial Black", Gadget, sans-serif' },
  { id: 'comic', name: 'Comic Sans', family: '"Comic Sans MS", cursive' },
];
const COLORS = [
  { id: 'white', name: 'White text', fill: '#fff', stroke: '#000' },
  { id: 'black', name: 'Black text', fill: '#000', stroke: '#fff' },
  { id: 'yellow', name: 'Yellow text', fill: '#FFD700', stroke: '#000' },
];

export default function MemeGenerator() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [texts, setTexts] = useState({});
  const [font, setFont] = useState(FONTS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [fontSize, setFontSize] = useState(36);
  const [loadedImg, setLoadedImg] = useState(null);
  const [search, setSearch] = useState('');
  const [uploadSrc, setUploadSrc] = useState(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  // ── Fetch templates ────────────────────────────────────
  useEffect(() => {
    fetch('https://api.imgflip.com/get_memes')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTemplates(d.data.memes);
          setSelected(d.data.memes[0]);
        }
      }).catch(() => {});
  }, []);

  // ── Load image when template changes ───────────────────
  useEffect(() => {
    const src = uploadSrc || selected?.url;
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setLoadedImg(img);
    img.onerror = () => setLoadedImg(null);
    img.src = src;
  }, [selected, uploadSrc]);

  // ── Text state helpers ─────────────────────────────────
  const bc = uploadSrc ? 2 : (selected?.box_count || 2);
  const key = (i) => (uploadSrc ? 'up' : selected?.id) + '_' + i;
  const gt = (i) => texts[key(i)] || '';
  const st = (i, v) => setTexts(p => ({ ...p, [key(i)]: v }));
  const labels = bc === 1 ? ['Text'] : bc === 2 ? ['Top text', 'Bottom text'] : Array.from({ length: bc }, (_, i) => `Text ${i + 1}`);

  // ── Canvas render ──────────────────────────────────────
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !loadedImg) return;
    const cx = cv.getContext('2d');
    const W = loadedImg.naturalWidth, H = loadedImg.naturalHeight;
    cv.width = W; cv.height = H;
    cx.drawImage(loadedImg, 0, 0, W, H);

    const sc = Math.min(W, H) / 600;
    const fs = Math.round(fontSize * sc);

    labels.forEach((_, i) => {
      const t = gt(i);
      if (!t) return;
      cx.save();
      cx.font = `bold ${fs}px ${font.family}`;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.lineWidth = fs / 5;
      cx.lineJoin = 'round';
      cx.miterLimit = 2;

      const x = W / 2;
      const y = bc <= 1 ? H * 0.1 : bc === 2 ? (i === 0 ? H * 0.08 : H * 0.92) : H * (0.08 + i * 0.84 / (bc - 1));
      const maxW = W * 0.92;
      const lines = wrap(cx, t.toUpperCase(), maxW);
      const lh = fs * 1.15;
      const sy = y - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, li) => {
        cx.strokeStyle = color.stroke; cx.strokeText(ln, x, sy + li * lh);
        cx.fillStyle = color.fill; cx.fillText(ln, x, sy + li * lh);
      });
      cx.restore();
    });

    // Watermark
    cx.save();
    const ws = Math.max(11, Math.round(W * 0.016));
    cx.font = `500 ${ws}px sans-serif`;
    cx.textAlign = 'right'; cx.textBaseline = 'bottom';
    cx.lineWidth = 2; cx.lineJoin = 'round';
    cx.strokeStyle = 'rgba(0,0,0,.4)'; cx.strokeText('SuperAdPro.com', W - 8, H - 6);
    cx.fillStyle = 'rgba(255,255,255,.55)'; cx.fillText('SuperAdPro.com', W - 8, H - 6);
    cx.restore();
  }, [loadedImg, texts, font, color, fontSize, bc]);

  useEffect(() => { draw(); }, [draw]);

  function wrap(cx, t, mw) {
    const w = t.split(' '), lines = []; let c = '';
    for (const word of w) {
      const test = c ? c + ' ' + word : word;
      if (cx.measureText(test).width > mw && c) { lines.push(c); c = word; } else c = test;
    }
    if (c) lines.push(c);
    return lines.length ? lines : [''];
  }

  // ── Actions ────────────────────────────────────────────
  const dlPNG = () => { const c = canvasRef.current; if (!c) return; const a = document.createElement('a'); a.download = 'meme-superadpro.png'; a.href = c.toDataURL('image/png'); a.click(); };
  const copyClip = async () => { const c = canvasRef.current; if (!c) return; try { const b = await new Promise(r => c.toBlob(r, 'image/png')); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); alert('Copied!'); } catch { alert('Use Download instead.'); } };
  const onUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { setUploadSrc(ev.target.result); setSelected(null); }; r.readAsDataURL(f); };
  const pick = (t) => { setSelected(t); setUploadSrc(null); };

  const vis = search.trim() ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : templates.slice(0, 100);

  // ── RENDER ─────────────────────────────────────────────
  return (
    <div style={{ background: '#0b1120', minHeight: '100vh', fontFamily: '"DM Sans","Rethink Sans",sans-serif', color: '#e2e8f0' }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 50, background: 'rgba(11,17,32,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}>
          <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#0b1120' }}>S</div>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 15, color: '#fff' }}>Super<span style={{ color: '#38bdf8' }}>AdPro</span></span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'rgba(200,220,255,0.4)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}/>Free tool — no signup
          </span>
          <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontSize: 11, fontWeight: 700, padding: '6px 16px', borderRadius: 7, textDecoration: 'none' }}>Join SuperAdPro</Link>
        </div>
      </nav>

      {/* MAIN WORKSPACE — fills viewport below nav */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', height: 'calc(100vh - 50px)', overflow: 'hidden' }}>

        {/* ═══ LEFT: Preview + actions ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#0f1729', borderRight: '1px solid rgba(56,189,248,0.08)' }}>

          {/* Canvas area — centered, padded */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: 0, overflow: 'hidden' }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 6, display: 'block', background: '#1a2236', objectFit: 'contain' }} />
          </div>

          {/* Action bar */}
          <div style={{ padding: '10px 20px 14px', display: 'flex', gap: 8, borderTop: '1px solid rgba(56,189,248,0.06)' }}>
            <button onClick={dlPNG} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Download PNG
            </button>
            <button onClick={copyClip} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: 13, border: '1px solid rgba(148,163,184,0.2)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Copy to clipboard
            </button>
          </div>

          {/* CTA strip */}
          <div style={{ padding: '10px 20px 12px', background: 'rgba(14,165,233,0.06)', borderTop: '1px solid rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Want AI video, music & voiceover? </span>
              <span style={{ fontSize: 11, color: 'rgba(200,225,210,0.4)' }}>SuperAdPro has a full creative studio + business tools.</span>
            </div>
            <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 11, padding: '7px 14px', borderRadius: 7, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Join free</Link>
          </div>
        </div>

        {/* ═══ RIGHT: Controls + Templates ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#131b2e', overflow: 'hidden' }}>

          {/* Text inputs */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              Caption {selected && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#475569' }}>— {selected.name}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {labels.map((lbl, i) => (
                <input key={key(i)} type="text" placeholder={lbl + '...'} value={gt(i)} onChange={e => st(i, e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, fontSize: 13, color: '#e2e8f0', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(14,165,233,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              ))}
            </div>
          </div>

          {/* Style controls — single row */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={font.id} onChange={e => setFont(FONTS.find(f => f.id === e.target.value))}
              style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 11, color: '#cbd5e1', cursor: 'pointer', fontFamily: 'inherit' }}>
              {FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select value={color.id} onChange={e => setColor(COLORS.find(c => c.id === e.target.value))}
              style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 11, color: '#cbd5e1', cursor: 'pointer', fontFamily: 'inherit' }}>
              {COLORS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="range" min="16" max="72" value={fontSize} onChange={e => setFontSize(+e.target.value)}
                style={{ flex: 1, accentColor: '#0ea5e9', height: 4 }} />
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{fontSize}px</span>
            </div>
          </div>

          {/* Template search + upload */}
          <div style={{ padding: '10px 16px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="text" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, fontSize: 12, color: '#e2e8f0', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'rgba(14,165,233,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()}
              style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, fontSize: 11, fontWeight: 600, color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Upload image
            </button>
          </div>

          {/* Template grid — scrollable, fills remaining space */}
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {vis.map(t => (
                <div key={t.id} onClick={() => pick(t)}
                  style={{
                    position: 'relative', borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                    border: selected?.id === t.id && !uploadSrc ? '2px solid #0ea5e9' : '2px solid transparent',
                    transition: 'border-color .15s, transform .15s',
                    aspectRatio: '1',
                  }}
                  onMouseEnter={e => { if (selected?.id !== t.id) e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)'; e.currentTarget.style.transform = 'scale(1.03)'; }}
                  onMouseLeave={e => { if (selected?.id !== t.id) e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <img src={t.url} alt={t.name} loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', padding: '10px 4px 3px', fontSize: 9, fontWeight: 600, color: '#fff', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.name}
                  </div>
                </div>
              ))}
              {vis.length === 0 && (
                <div style={{ gridColumn: '1/-1', padding: 30, textAlign: 'center', fontSize: 13, color: '#475569' }}>No templates match your search</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
