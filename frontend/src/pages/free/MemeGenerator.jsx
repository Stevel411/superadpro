import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════
   SuperAdPro — Free Meme Generator v4
   50:50 layout, homepage brand colours, SC-style dropdowns
   ═══════════════════════════════════════════════════════════ */

const FONTS = [
  { id: 'impact', name: 'Impact', family: 'Impact, Haettenschweiler, sans-serif' },
  { id: 'arial', name: 'Arial Black', family: '"Arial Black", Gadget, sans-serif' },
  { id: 'comic', name: 'Comic Sans MS', family: '"Comic Sans MS", cursive' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia, serif' },
  { id: 'verdana', name: 'Verdana Bold', family: 'Verdana, Geneva, sans-serif' },
  { id: 'trebuchet', name: 'Trebuchet MS', family: '"Trebuchet MS", sans-serif' },
  { id: 'courier', name: 'Courier New', family: '"Courier New", monospace' },
  { id: 'tahoma', name: 'Tahoma', family: 'Tahoma, Geneva, sans-serif' },
];

const COLORS = [
  { id: 'white', name: 'White + Black outline', fill: '#FFFFFF', stroke: '#000000' },
  { id: 'black', name: 'Black + White outline', fill: '#000000', stroke: '#FFFFFF' },
  { id: 'yellow', name: 'Yellow + Black outline', fill: '#FFD700', stroke: '#000000' },
  { id: 'red', name: 'Red + Black outline', fill: '#FF3333', stroke: '#000000' },
  { id: 'lime', name: 'Lime + Black outline', fill: '#00FF00', stroke: '#000000' },
  { id: 'cyan', name: 'Cyan + Black outline', fill: '#00E5FF', stroke: '#000000' },
  { id: 'pink', name: 'Pink + Black outline', fill: '#FF69B4', stroke: '#000000' },
  { id: 'orange', name: 'Orange + Black outline', fill: '#FF8C00', stroke: '#000000' },
];

// Shared dropdown chevron SVG (matches SuperScene .sc-select)
const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8e98' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;

const selectStyle = {
  width: '100%', padding: '10px 32px 10px 12px', borderRadius: 10,
  border: '1px solid #3f4650', background: '#2d323a', color: '#fff',
  fontSize: 13, fontFamily: '"DM Sans", sans-serif', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: chevronBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
};

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
      .then(d => { if (d.success) { setTemplates(d.data.memes); setSelected(d.data.memes[0]); } })
      .catch(() => {});
  }, []);

  // ── Load image ─────────────────────────────────────────
  useEffect(() => {
    const src = uploadSrc || selected?.url;
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setLoadedImg(img);
    img.onerror = () => setLoadedImg(null);
    img.src = src;
  }, [selected, uploadSrc]);

  // ── Text helpers ───────────────────────────────────────
  const bc = uploadSrc ? 2 : (selected?.box_count || 2);
  const k = (i) => (uploadSrc ? 'up' : selected?.id) + '_' + i;
  const gt = (i) => texts[k(i)] || '';
  const st = (i, v) => setTexts(p => ({ ...p, [k(i)]: v }));
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
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.lineWidth = fs / 5; cx.lineJoin = 'round'; cx.miterLimit = 2;
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
    for (const word of w) { const test = c ? c + ' ' + word : word; if (cx.measureText(test).width > mw && c) { lines.push(c); c = word; } else c = test; }
    if (c) lines.push(c); return lines.length ? lines : [''];
  }

  // ── Actions ────────────────────────────────────────────
  const dlPNG = () => { const c = canvasRef.current; if (!c) return; const a = document.createElement('a'); a.download = 'meme-superadpro.png'; a.href = c.toDataURL('image/png'); a.click(); };
  const copyClip = async () => { const c = canvasRef.current; if (!c) return; try { const b = await new Promise(r => c.toBlob(r, 'image/png')); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); alert('Copied!'); } catch { alert('Use Download instead.'); } };
  const onUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { setUploadSrc(ev.target.result); setSelected(null); }; r.readAsDataURL(f); };
  const pick = (t) => { setSelected(t); setUploadSrc(null); };
  const vis = search.trim() ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : templates.slice(0, 100);

  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ background: '#050d1a', minHeight: '100vh', fontFamily: '"DM Sans","Rethink Sans",sans-serif', color: '#f0f2f8' }}>

      {/* ── NAV — matches homepage exactly ── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', height: 60, background: 'rgba(10,18,40,0.95)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,180,216,0.12)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 19, color: '#fff' }}>
            <svg style={{ width: 24, height: 24, verticalAlign: 'middle', marginRight: 6 }} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#0ea5e9"/><path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/></svg>
            SuperAd<span style={{ color: '#38bdf8' }}>Pro</span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 16, color: 'rgba(200,220,255,0.7)' }}>Meme Generator</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 20, padding: '3px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}/>FREE
            </span>
          </div>
          <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontSize: 15, fontWeight: 600, padding: '9px 22px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 2px 12px rgba(14,165,233,0.25)', transition: 'all .3s', letterSpacing: 0.3 }}>Get started free</Link>
        </div>
      </nav>

      {/* ── WORKSPACE: 50/50 split ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

        {/* ═══ LEFT: Preview ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#050d1a', borderRight: '1px solid rgba(0,180,216,0.08)' }}>

          {/* Canvas — centred */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: 0, overflow: 'hidden' }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, display: 'block', background: '#0a1525' }} />
          </div>

          {/* Action buttons */}
          <div style={{ padding: '12px 24px 16px', display: 'flex', gap: 10 }}>
            <button onClick={dlPNG} style={{ flex: 1, padding: '12px 0', borderRadius: 10, background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 32px rgba(0,212,255,0.2)', transition: 'all .3s', letterSpacing: 0.3 }}>
              Download PNG
            </button>
            <button onClick={copyClip} style={{ flex: 1, padding: '12px 0', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(200,220,255,0.7)', fontWeight: 600, fontSize: 14, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .3s' }}>
              Copy to clipboard
            </button>
          </div>

          {/* CTA */}
          <div style={{ padding: '12px 24px 14px', background: 'rgba(14,165,233,0.05)', borderTop: '1px solid rgba(0,180,216,0.1)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Want AI video, music & voiceover? </span>
              <span style={{ fontSize: 12, color: 'rgba(200,220,255,0.4)' }}>SuperAdPro — complete creative studio + business-in-a-box.</span>
            </div>
            <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontWeight: 600, fontSize: 13, padding: '8px 18px', borderRadius: 10, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(0,212,255,0.15)' }}>Join free</Link>
          </div>
        </div>

        {/* ═══ RIGHT: Controls + Templates ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#0a1525', overflow: 'hidden' }}>

          {/* Caption inputs */}
          <div style={{ padding: '16px 20px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(200,220,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
              Caption {selected && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— {selected.name}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {labels.map((lbl, i) => (
                <input key={k(i)} type="text" placeholder={lbl + '...'} value={gt(i)} onChange={e => st(i, e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: '#2d323a', border: '1px solid #3f4650', borderRadius: 10, fontSize: 14, color: '#fff', fontFamily: '"DM Sans", sans-serif', boxSizing: 'border-box', outline: 'none', transition: 'border-color .2s' }}
                  onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                  onBlur={e => e.target.style.borderColor = '#3f4650'}
                />
              ))}
            </div>
          </div>

          {/* Style controls — SuperScene-style dropdowns */}
          <div style={{ padding: '0 20px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(200,220,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Style</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#7b8594', marginBottom: 5, fontWeight: 600 }}>Font</div>
                <select value={font.id} onChange={e => setFont(FONTS.find(f => f.id === e.target.value))} style={selectStyle}>
                  {FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#7b8594', marginBottom: 5, fontWeight: 600 }}>Text colour</div>
                <select value={color.id} onChange={e => setColor(COLORS.find(c => c.id === e.target.value))} style={selectStyle}>
                  {COLORS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#7b8594', fontWeight: 600 }}>Font size</span>
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{fontSize}px</span>
              </div>
              <input type="range" min="16" max="80" value={fontSize} onChange={e => setFontSize(+e.target.value)}
                style={{ width: '100%', accentColor: '#0ea5e9' }} />
            </div>
          </div>

          {/* Search + Upload */}
          <div style={{ padding: '0 20px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="text" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', background: '#2d323a', border: '1px solid #3f4650', borderRadius: 10, fontSize: 13, color: '#fff', fontFamily: '"DM Sans", sans-serif', outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s' }}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'}
              onBlur={e => e.target.style.borderColor = '#3f4650'}
            />
            <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()}
              style={{ padding: '10px 16px', background: '#2d323a', border: '1px solid #3f4650', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#c5cad1', cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', whiteSpace: 'nowrap', transition: 'border-color .2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#0ea5e9'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#3f4650'}
            >Upload image</button>
          </div>

          {/* Template grid — scrollable, fills remaining space */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
            <style>{`
              .mg-grid::-webkit-scrollbar{width:6px}
              .mg-grid::-webkit-scrollbar-track{background:transparent}
              .mg-grid::-webkit-scrollbar-thumb{background:#3f4650;border-radius:3px}
              .mg-tmpl{position:relative;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all .15s;aspect-ratio:1}
              .mg-tmpl:hover{border-color:rgba(56,189,248,0.4);transform:scale(1.03)}
              .mg-tmpl.sel{border-color:#0ea5e9;box-shadow:0 0 12px rgba(14,165,233,0.25)}
              .mg-tmpl img{width:100%;height:100%;object-fit:cover;display:block}
              .mg-tmpl-name{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.85));padding:8px 6px 4px;font-size:10px;font-weight:600;color:#fff;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            `}</style>
            <div className="mg-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {vis.map(t => (
                <div key={t.id} className={`mg-tmpl${selected?.id === t.id && !uploadSrc ? ' sel' : ''}`} onClick={() => pick(t)}>
                  <img src={t.url} alt={t.name} loading="lazy" />
                  <div className="mg-tmpl-name">{t.name}</div>
                </div>
              ))}
              {vis.length === 0 && <div style={{ gridColumn: '1/-1', padding: 30, textAlign: 'center', fontSize: 13, color: '#7b8594' }}>No templates match your search</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
