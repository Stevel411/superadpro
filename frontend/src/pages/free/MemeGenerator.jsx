import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

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
  { id: 'white', name: 'White + Black outline', fill: '#fff', stroke: '#000' },
  { id: 'black', name: 'Black + White outline', fill: '#000', stroke: '#fff' },
  { id: 'yellow', name: 'Yellow + Black outline', fill: '#FFD700', stroke: '#000' },
  { id: 'red', name: 'Red + Black outline', fill: '#FF3333', stroke: '#000' },
  { id: 'lime', name: 'Lime + Black outline', fill: '#00FF00', stroke: '#000' },
  { id: 'cyan', name: 'Cyan + Black outline', fill: '#00E5FF', stroke: '#000' },
  { id: 'pink', name: 'Pink + Black outline', fill: '#FF69B4', stroke: '#000' },
  { id: 'orange', name: 'Orange + Black outline', fill: '#FF8C00', stroke: '#000' },
];
const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8e98' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;
const sel = { width: '100%', padding: '9px 30px 9px 12px', borderRadius: 10, border: '1px solid #3f4650', background: '#2d323a', color: '#fff', fontSize: 13, fontFamily: '"DM Sans",sans-serif', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', backgroundImage: chevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' };
const inp = { width: '100%', padding: '9px 12px', background: '#2d323a', border: '1px solid #3f4650', borderRadius: 10, fontSize: 13, color: '#fff', fontFamily: '"DM Sans",sans-serif', boxSizing: 'border-box', outline: 'none', transition: 'border-color .2s' };

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

  useEffect(() => {
    fetch('https://api.imgflip.com/get_memes').then(r => r.json())
      .then(d => { if (d.success) { setTemplates(d.data.memes); setSelected(d.data.memes[0]); } }).catch(() => {});
  }, []);

  useEffect(() => {
    const src = uploadSrc || selected?.url; if (!src) return;
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => setLoadedImg(img); img.onerror = () => setLoadedImg(null); img.src = src;
  }, [selected, uploadSrc]);

  const bc = uploadSrc ? 2 : (selected?.box_count || 2);
  const ky = (i) => (uploadSrc ? 'up' : selected?.id) + '_' + i;
  const gt = (i) => texts[ky(i)] || '';
  const st = (i, v) => setTexts(p => ({ ...p, [ky(i)]: v }));
  const labels = bc === 1 ? ['Text'] : bc === 2 ? ['Top text', 'Bottom text'] : Array.from({ length: bc }, (_, i) => `Text ${i + 1}`);

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv || !loadedImg) return;
    const cx = cv.getContext('2d');
    const W = loadedImg.naturalWidth, H = loadedImg.naturalHeight;
    cv.width = W; cv.height = H;
    cx.drawImage(loadedImg, 0, 0, W, H);
    const sc = Math.min(W, H) / 600, fs = Math.round(fontSize * sc);
    labels.forEach((_, i) => {
      const t = gt(i); if (!t) return;
      cx.save(); cx.font = `bold ${fs}px ${font.family}`;
      cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.lineWidth = fs / 5; cx.lineJoin = 'round'; cx.miterLimit = 2;
      const x = W / 2, y = bc <= 1 ? H * 0.1 : bc === 2 ? (i === 0 ? H * 0.08 : H * 0.92) : H * (0.08 + i * 0.84 / (bc - 1));
      const lines = wrap(cx, t.toUpperCase(), W * 0.92), lh = fs * 1.15, sy = y - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, li) => { cx.strokeStyle = color.stroke; cx.strokeText(ln, x, sy + li * lh); cx.fillStyle = color.fill; cx.fillText(ln, x, sy + li * lh); });
      cx.restore();
    });
    cx.save(); const ws = Math.max(11, Math.round(W * 0.016)); cx.font = `500 ${ws}px sans-serif`; cx.textAlign = 'right'; cx.textBaseline = 'bottom'; cx.lineWidth = 2; cx.lineJoin = 'round'; cx.strokeStyle = 'rgba(0,0,0,.4)'; cx.strokeText('SuperAdPro.com', W - 8, H - 6); cx.fillStyle = 'rgba(255,255,255,.55)'; cx.fillText('SuperAdPro.com', W - 8, H - 6); cx.restore();
  }, [loadedImg, texts, font, color, fontSize, bc]);

  useEffect(() => { draw(); }, [draw]);

  function wrap(cx, t, mw) { const w = t.split(' '), lines = []; let c = ''; for (const word of w) { const test = c ? c + ' ' + word : word; if (cx.measureText(test).width > mw && c) { lines.push(c); c = word; } else c = test; } if (c) lines.push(c); return lines.length ? lines : ['']; }

  const dlPNG = () => { const c = canvasRef.current; if (!c) return; const a = document.createElement('a'); a.download = 'meme-superadpro.png'; a.href = c.toDataURL('image/png'); a.click(); };
  const copyClip = async () => { const c = canvasRef.current; if (!c) return; try { const b = await new Promise(r => c.toBlob(r, 'image/png')); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); alert('Copied!'); } catch { alert('Use Download instead.'); } };
  const onUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { setUploadSrc(ev.target.result); setSelected(null); }; r.readAsDataURL(f); };
  const pick = (t) => { setSelected(t); setUploadSrc(null); };
  const vis = search.trim() ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : templates.slice(0, 100);

  return (
    <div style={{ background: '#050d1a', minHeight: '100vh', fontFamily: '"DM Sans","Rethink Sans",sans-serif', color: '#f0f2f8', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .mg-tmpl{position:relative;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all .15s;aspect-ratio:1}
        .mg-tmpl:hover{border-color:rgba(56,189,248,.4);transform:scale(1.04)}
        .mg-tmpl.sel{border-color:#0ea5e9;box-shadow:0 0 12px rgba(14,165,233,.25)}
        .mg-tmpl img{width:100%;height:100%;object-fit:cover;display:block}
        .mg-tname{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.85));padding:8px 5px 4px;font-size:10px;font-weight:600;color:#fff;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mg-scroll::-webkit-scrollbar{width:5px}
        .mg-scroll::-webkit-scrollbar-track{background:transparent}
        .mg-scroll::-webkit-scrollbar-thumb{background:#3f4650;border-radius:3px}
      `}</style>

      {/* ═══ NAV — homepage exact match ═══ */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', height: 56, background: 'rgba(10,18,40,0.95)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,180,216,0.12)', flexShrink: 0 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 18, color: '#fff' }}>
            <svg style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 7 }} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#0ea5e9"/><path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/></svg>
            SuperAd<span style={{ color: '#38bdf8' }}>Pro</span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 15, color: '#fff' }}>Free Meme Generator</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 20, padding: '2px 10px', letterSpacing: 1 }}>FREE</span>
          <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontSize: 14, fontWeight: 600, padding: '8px 20px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 2px 12px rgba(14,165,233,0.25)' }}>Get started free</Link>
        </div>
      </nav>

      {/* ═══ MAIN: 3-column — marketing | preview | controls ═══ */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '10% 40% 40% 10%', overflow: 'hidden' }}>

        {/* Left gutter — marketing */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px 8px', gap: 16, background: '#050d1a' }}>
          <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(0,180,216,0.2)' }}>SuperAdPro.com</div>
        </div>

        {/* ═══ PREVIEW COLUMN (40%) ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#050d1a', padding: '12px 12px 0' }}>

          {/* Canvas */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', padding: '0 0 8px' }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, display: 'block', background: '#0a1525' }} />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, padding: '0 0 10px' }}>
            <button onClick={dlPNG} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(0,212,255,0.2)' }}>Download PNG</button>
            <button onClick={copyClip} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'rgba(255,255,255,.05)', color: 'rgba(200,220,255,.6)', fontWeight: 600, fontSize: 13, border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer', fontFamily: 'inherit' }}>Copy to clipboard</button>
          </div>

          {/* Marketing CTA strip */}
          <div style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(0,180,216,0.1)', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Start your online business today</div>
              <div style={{ fontSize: 10, color: 'rgba(200,220,255,.35)', lineHeight: 1.4 }}>AI creative tools, income opportunities, and everything you need to earn online — all in one platform.</div>
            </div>
            <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 10, padding: '6px 12px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Learn more</Link>
          </div>
        </div>

        {/* ═══ CONTROLS COLUMN (40%) ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#0a1525', borderLeft: '1px solid rgba(0,180,216,0.06)', overflow: 'hidden' }}>

          {/* Caption */}
          <div style={{ padding: '14px 16px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.35)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              Caption {selected && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— {selected.name}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {labels.map((lbl, i) => (
                <input key={ky(i)} type="text" placeholder={lbl + '...'} value={gt(i)} onChange={e => st(i, e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#3f4650'} />
              ))}
            </div>
          </div>

          {/* Style */}
          <div style={{ padding: '0 16px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.35)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Style</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Font</div>
                <select value={font.id} onChange={e => setFont(FONTS.find(f => f.id === e.target.value))} style={sel}>
                  {FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>Text colour</div>
                <select value={color.id} onChange={e => setColor(COLORS.find(c => c.id === e.target.value))} style={sel}>
                  {COLORS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, color: '#7b8594', fontWeight: 600, whiteSpace: 'nowrap' }}>Size</span>
              <input type="range" min="16" max="80" value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{ flex: 1, accentColor: '#0ea5e9' }} />
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>{fontSize}px</span>
            </div>
          </div>

          {/* Search + upload */}
          <div style={{ padding: '0 16px 8px', display: 'flex', gap: 6 }}>
            <input type="text" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, flex: 1 }}
              onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#3f4650'} />
            <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()}
              style={{ padding: '9px 14px', background: '#2d323a', border: '1px solid #3f4650', borderRadius: 10, fontSize: 11, fontWeight: 600, color: '#c5cad1', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#0ea5e9'} onMouseLeave={e => e.currentTarget.style.borderColor = '#3f4650'}
            >Upload</button>
          </div>

          {/* Template grid — scrollable */}
          <div className="mg-scroll" style={{ flex: 1, overflow: 'auto', padding: '0 16px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {vis.map(t => (
                <div key={t.id} className={`mg-tmpl${selected?.id === t.id && !uploadSrc ? ' sel' : ''}`} onClick={() => pick(t)}>
                  <img src={t.url} alt={t.name} loading="lazy" />
                  <div className="mg-tname">{t.name}</div>
                </div>
              ))}
              {vis.length === 0 && <div style={{ gridColumn: '1/-1', padding: 24, textAlign: 'center', fontSize: 13, color: '#7b8594' }}>No templates found</div>}
            </div>
          </div>

          {/* Bottom marketing */}
          <div style={{ padding: '8px 16px 10px', borderTop: '1px solid rgba(0,180,216,0.06)', background: 'rgba(14,165,233,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Earn money with SuperAdPro</div>
                <div style={{ fontSize: 9, color: 'rgba(200,220,255,.3)', lineHeight: 1.4 }}>Join thousands building an online income with our AI tools, affiliate program & income grid.</div>
              </div>
              <Link to="/earn" style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', textDecoration: 'none', whiteSpace: 'nowrap' }}>See how →</Link>
            </div>
          </div>
        </div>

        {/* Right gutter — marketing */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px 8px', gap: 16, background: '#050d1a' }}>
          <div style={{ writingMode: 'vertical-rl', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(0,180,216,0.2)' }}>Free tools by SuperAdPro</div>
        </div>
      </div>
    </div>
  );
}
