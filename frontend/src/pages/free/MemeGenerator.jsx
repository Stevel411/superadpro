import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const FONTS = [
  { id: 'impact', name: 'Impact', family: 'Impact, Haettenschweiler, sans-serif' },
  { id: 'arial', name: 'Arial Black', family: '"Arial Black", Gadget, sans-serif' },
  { id: 'comic', name: 'Comic Sans', family: '"Comic Sans MS", cursive' },
];

const TEXT_COLORS = [
  { id: 'white', name: 'White', fill: '#FFFFFF', stroke: '#000000' },
  { id: 'black', name: 'Black', fill: '#000000', stroke: '#FFFFFF' },
  { id: 'yellow', name: 'Yellow', fill: '#FFD700', stroke: '#000000' },
];

export default function MemeGenerator() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [texts, setTexts] = useState({});
  const [font, setFont] = useState(FONTS[0]);
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [fontSize, setFontSize] = useState(38);
  const [loadedImg, setLoadedImg] = useState(null);
  const [search, setSearch] = useState('');
  const [uploadedImg, setUploadedImg] = useState(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  // ── Load templates from Imgflip API ────────────────────
  useEffect(() => {
    fetch('https://api.imgflip.com/get_memes')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.memes) {
          setTemplates(d.data.memes);
          setSelected(d.data.memes[0]);
        }
      })
      .catch(() => {});
  }, []);

  // ── Load selected template image ───────────────────────
  useEffect(() => {
    if (!selected && !uploadedImg) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setLoadedImg(img);
    img.onerror = () => setLoadedImg(null);
    img.src = uploadedImg || selected?.url || '';
  }, [selected, uploadedImg]);

  // ── Text helpers ───────────────────────────────────────
  const boxCount = uploadedImg ? 2 : (selected?.box_count || 2);
  const getKey = (i) => (uploadedImg ? 'upload' : selected?.id) + '_' + i;
  const getText = (i) => texts[getKey(i)] || '';
  const setText = (i, val) => setTexts(prev => ({ ...prev, [getKey(i)]: val }));

  const boxLabels = (count) => {
    if (count === 1) return ['Text'];
    if (count === 2) return ['Top text', 'Bottom text'];
    if (count === 3) return ['Text 1', 'Text 2', 'Text 3'];
    return Array.from({ length: count }, (_, i) => 'Text ' + (i + 1));
  };

  // ── Canvas rendering ──────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImg) return;
    const ctx = canvas.getContext('2d');
    const w = loadedImg.naturalWidth;
    const h = loadedImg.naturalHeight;
    canvas.width = w;
    canvas.height = h;

    // Draw image
    ctx.drawImage(loadedImg, 0, 0, w, h);

    // Scale font relative to image size
    const scale = Math.min(w, h) / 600;
    const fs = Math.round(fontSize * scale);

    // Draw text in standard meme positions
    const labels = boxLabels(boxCount);
    labels.forEach((_, i) => {
      const text = getText(i);
      if (!text) return;

      ctx.save();
      ctx.font = `bold ${fs}px ${font.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = fs / 5;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;

      // Position: distribute evenly vertically
      let x = w / 2;
      let y;
      if (boxCount === 1) {
        y = h * 0.12;
      } else if (boxCount === 2) {
        y = i === 0 ? h * 0.08 : h * 0.92;
      } else {
        y = h * (0.08 + (i * 0.84 / (boxCount - 1)));
      }
      const maxW = w * 0.92;

      const lines = wrapText(ctx, text.toUpperCase(), maxW);
      const lh = fs * 1.15;
      const startY = y - ((lines.length - 1) * lh) / 2;

      lines.forEach((line, li) => {
        const ly = startY + li * lh;
        ctx.strokeStyle = textColor.stroke;
        ctx.strokeText(line, x, ly);
        ctx.fillStyle = textColor.fill;
        ctx.fillText(line, x, ly);
      });
      ctx.restore();
    });

    // Watermark
    ctx.save();
    const wmSize = Math.max(12, Math.round(w * 0.018));
    ctx.font = `500 ${wmSize}px "DM Sans", sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.strokeText('SuperAdPro.com', w - 8, h - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('SuperAdPro.com', w - 8, h - 6);
    ctx.restore();
  }, [loadedImg, texts, font, textColor, fontSize, boxCount, selected, uploadedImg]);

  useEffect(() => { render(); }, [render]);

  const wrapText = (ctx, text, maxW) => {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = word;
      } else { cur = test; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  // ── Actions ────────────────────────────────────────────
  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement('a');
    a.download = 'meme-superadpro.png';
    a.href = c.toDataURL('image/png');
    a.click();
  };

  const copy = async () => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('Copied to clipboard!');
    } catch { alert('Use Download instead — clipboard not supported here.'); }
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setUploadedImg(ev.target.result); setSelected(null); };
    reader.readAsDataURL(file);
  };

  const selectTemplate = (t) => { setSelected(t); setUploadedImg(null); };

  // ── Filter templates ───────────────────────────────────
  const filtered = search.trim()
    ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : templates.slice(0, 100);

  return (
    <div style={{ background: '#050d1a', minHeight: '100vh', fontFamily: '"DM Sans","Rethink Sans",sans-serif' }}>
      <style>{`
        @keyframes mfloat{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-8px);opacity:.7}}
        @keyframes mpulse{0%,100%{opacity:1}50%{opacity:.2}}
        .tmpl-thumb{cursor:pointer;border-radius:6px;overflow:hidden;border:2px solid transparent;transition:all .15s;position:relative;aspect-ratio:1;background:#1e293b}
        .tmpl-thumb:hover{border-color:#38bdf8;transform:translateY(-2px)}
        .tmpl-thumb.active{border-color:#0ea5e9;box-shadow:0 0 0 2px rgba(14,165,233,.3)}
        .tmpl-thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .tmpl-name{position:absolute;bottom:0;left:0;right:0;padding:2px 4px;background:rgba(0,0,0,.7);font-size:9px;color:#fff;font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mg-btn{padding:10px 16px;border-radius:10px;font-weight:700;font-size:13px;border:none;cursor:pointer;font-family:inherit;transition:all .15s}
        .mg-btn:active{transform:scale(.97)}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, background: 'rgba(10,18,40,0.97)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,180,216,0.12)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#050d1a' }}>S</div>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 16, color: '#fff' }}>Super<span style={{ color: '#38bdf8' }}>AdPro</span></span>
        </Link>
        <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontSize: 12, fontWeight: 700, padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get started free</Link>
      </nav>

      {/* ── HERO (compact) ── */}
      <div style={{ background: 'linear-gradient(180deg,#050d1a,#0a1830)', padding: '16px 24px 14px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 4, height: 4, borderRadius: '50%', background: 'rgba(56,189,248,0.35)', animation: 'mfloat 4s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '40%', right: '15%', width: 3, height: 3, borderRadius: '50%', background: 'rgba(139,92,246,0.3)', animation: 'mfloat 5s ease-in-out infinite 1s' }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#0ea5e9', border: '1px solid rgba(0,180,216,0.25)', borderRadius: 50, padding: '3px 12px', marginBottom: 8 }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#0ea5e9', animation: 'mpulse 2s ease-in-out infinite' }} />
          Free tool — No signup required
        </div>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 'clamp(22px,3vw,32px)', color: '#fff', lineHeight: 1.1, margin: '0 0 4px' }}>
          Meme <span style={{ background: 'linear-gradient(135deg,#38bdf8,#7c9fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Generator</span>
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(200,225,210,0.45)', margin: 0 }}>
          100+ real templates. Add your text. Download and share.
        </p>
      </div>

      {/* ── WORKSPACE ── */}
      <div style={{ background: '#f3f4f6', padding: '16px 16px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14, alignItems: 'start' }}>

          {/* ── LEFT: Canvas + actions ── */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: 10, background: '#f8f9fb' }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', borderRadius: 6, display: 'block', background: '#1e293b' }} />
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
              <button onClick={download} className="mg-btn" style={{ flex: 1, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', boxShadow: '0 3px 0 #075985' }}>
                Download PNG
              </button>
              <button onClick={copy} className="mg-btn" style={{ flex: 1, background: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0' }}>
                Copy to clipboard
              </button>
            </div>
          </div>

          {/* ── RIGHT: Controls ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Text inputs */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '7px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5 }}>Caption</div>
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {boxLabels(boxCount).map((label, i) => (
                  <input key={getKey(i)} type="text" placeholder={label + '...'} value={getText(i)}
                    onChange={e => setText(i, e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e8ecf2', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = '#0ea5e9'; }}
                    onBlur={e => { e.target.style.borderColor = '#e8ecf2'; }}
                  />
                ))}
              </div>
            </div>

            {/* Style */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '7px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5 }}>Style</div>
              <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <select value={font.id} onChange={e => setFont(FONTS.find(f => f.id === e.target.value))}
                  style={{ padding: '7px 8px', border: '1.5px solid #e8ecf2', borderRadius: 8, fontSize: 11, fontFamily: 'inherit', color: '#334155', cursor: 'pointer' }}>
                  {FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <select value={textColor.id} onChange={e => setTextColor(TEXT_COLORS.find(c => c.id === e.target.value))}
                  style={{ padding: '7px 8px', border: '1.5px solid #e8ecf2', borderRadius: 8, fontSize: 11, fontFamily: 'inherit', color: '#334155', cursor: 'pointer' }}>
                  {TEXT_COLORS.map(c => <option key={c.id} value={c.id}>{c.name} text</option>)}
                </select>
              </div>
              <div style={{ padding: '4px 10px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Size</span>
                  <span style={{ fontSize: 10, color: '#334155', fontWeight: 700 }}>{fontSize}px</span>
                </div>
                <input type="range" min="16" max="72" value={fontSize} onChange={e => setFontSize(+e.target.value)}
                  style={{ width: '100%', accentColor: '#0ea5e9' }} />
              </div>
            </div>

            {/* Template grid */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '7px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5 }}>Templates</span>
                <span style={{ fontSize: 9, color: '#94a3b8' }}>{templates.length} available</span>
              </div>
              <div style={{ padding: '6px 10px 4px' }}>
                <input type="text" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', border: '1.5px solid #e8ecf2', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', marginBottom: 6 }}
                  onFocus={e => { e.target.style.borderColor = '#0ea5e9'; }}
                  onBlur={e => { e.target.style.borderColor = '#e8ecf2'; }}
                />
              </div>
              <div style={{ padding: '0 10px 8px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, maxHeight: 280, overflowY: 'auto' }}>
                {/* Upload own */}
                <div className={`tmpl-thumb ${uploadedImg ? 'active' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18 }}>📤</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: '#64748b' }}>Upload</div>
                  </div>
                </div>
                {filtered.map(t => (
                  <div key={t.id} className={`tmpl-thumb ${selected?.id === t.id && !uploadedImg ? 'active' : ''}`}
                    onClick={() => selectTemplate(t)}>
                    <img src={t.url} alt={t.name} loading="lazy" />
                    <div className="tmpl-name">{t.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(0,180,216,0.12)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 12, color: '#fff', marginBottom: 3 }}>Want AI video, music & voiceover?</div>
                <div style={{ fontSize: 10, color: 'rgba(200,225,210,0.4)', lineHeight: 1.4 }}>Complete AI creative studio + business-in-a-box.</div>
              </div>
              <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 11, padding: '8px 16px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Join free
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />

      {/* ── FOOTER ── */}
      <div style={{ background: '#050d1a', borderTop: '1px solid rgba(0,180,216,0.1)', padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(200,225,210,0.3)', margin: 0 }}>
          Made with ❤️ by <Link to="/" style={{ color: '#38bdf8', textDecoration: 'none' }}>SuperAdPro.com</Link> — Free meme generator, no signup, no BS
        </p>
      </div>
    </div>
  );
}
