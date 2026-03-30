import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const FONTS = [
  { id: 'impact', name: 'Impact', family: 'Impact, Haettenschweiler, sans-serif' },
  { id: 'arial', name: 'Arial Black', family: '"Arial Black", Gadget, sans-serif' },
  { id: 'comic', name: 'Comic Sans', family: '"Comic Sans MS", cursive' },
];

const TEXT_STYLES = [
  { id: 'white', name: 'White', fill: '#FFFFFF', stroke: '#000000' },
  { id: 'black', name: 'Black', fill: '#000000', stroke: '#FFFFFF' },
  { id: 'yellow', name: 'Yellow', fill: '#FFD700', stroke: '#000000' },
];

export default function MemeGenerator() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadedImg, setLoadedImg] = useState(null);
  const [texts, setTexts] = useState([]);
  const [font, setFont] = useState(FONTS[0]);
  const [textStyle, setTextStyle] = useState(TEXT_STYLES[0]);
  const [fontSize, setFontSize] = useState(38);
  const [search, setSearch] = useState('');
  const [uploadedImg, setUploadedImg] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Load templates from Imgflip API ──────────────────────
  useEffect(() => {
    fetch('https://api.imgflip.com/get_memes')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.memes) {
          setTemplates(data.data.memes);
          selectTemplate(data.data.memes[0]);
        }
      })
      .catch(() => {});
  }, []);

  const selectTemplate = (tmpl) => {
    setSelected(tmpl);
    setTexts(Array.from({ length: tmpl.box_count || 2 }, () => ''));
    setUploadedImg(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setLoadedImg(img);
    img.onerror = () => setLoadedImg(null);
    img.src = tmpl.url;
  };

  const setText = (idx, val) => {
    setTexts(prev => { const n = [...prev]; n[idx] = val; return n; });
  };

  // ── Canvas rendering ──────────────────────────────────────
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const sourceImg = uploadedImg || loadedImg;
    if (!sourceImg) {
      canvas.width = 800; canvas.height = 600;
      ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Select a template to get started', 400, 300);
      return;
    }

    canvas.width = sourceImg.naturalWidth || sourceImg.width;
    canvas.height = sourceImg.naturalHeight || sourceImg.height;
    ctx.drawImage(sourceImg, 0, 0);

    const W = canvas.width;
    const H = canvas.height;
    const boxCount = selected?.box_count || 2;
    const scale = Math.max(1, W / 800);
    const scaledFont = Math.round(fontSize * scale);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    texts.forEach((text, i) => {
      if (!text) return;
      ctx.save();
      ctx.font = `bold ${scaledFont}px ${font.family}`;
      ctx.lineWidth = Math.max(3, scaledFont / 5);

      let x, y, maxW;
      if (boxCount === 1) {
        x = W / 2; y = H * 0.1; maxW = W * 0.9;
      } else if (boxCount === 2) {
        x = W / 2;
        y = i === 0 ? scaledFont * 0.8 + 10 : H - scaledFont * 0.8 - 10;
        maxW = W * 0.9;
      } else if (boxCount === 3) {
        x = W / 2;
        y = i === 0 ? scaledFont * 0.8 + 10 : i === 1 ? H / 2 : H - scaledFont * 0.8 - 10;
        maxW = W * 0.9;
      } else {
        x = W / 2;
        y = (H / (boxCount + 1)) * (i + 1);
        maxW = W * 0.9;
      }

      const lines = wrapText(ctx, text.toUpperCase(), maxW);
      const lineH = scaledFont * 1.15;
      const startY = y - ((lines.length - 1) * lineH) / 2;

      lines.forEach((line, li) => {
        const ly = startY + li * lineH;
        ctx.strokeStyle = textStyle.stroke; ctx.strokeText(line, x, ly);
        ctx.fillStyle = textStyle.fill; ctx.fillText(line, x, ly);
      });
      ctx.restore();
    });

    // Watermark
    ctx.save();
    const wmSize = Math.max(12, Math.round(14 * scale));
    ctx.font = `500 ${wmSize}px "DM Sans", sans-serif`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeText('SuperAdPro.com', W - 10, H - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('SuperAdPro.com', W - 10, H - 8);
    ctx.restore();
  }, [selected, loadedImg, uploadedImg, texts, font, textStyle, fontSize]);

  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = []; let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) { lines.push(current); current = word; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  };

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  const downloadPNG = () => {
    const c = canvasRef.current; if (!c) return;
    const link = document.createElement('a');
    link.download = `meme-${selected?.name?.replace(/\s+/g, '-').toLowerCase() || 'custom'}-superadpro.png`;
    link.href = c.toDataURL('image/png'); link.click();
  };

  const copyToClipboard = async () => {
    const c = canvasRef.current; if (!c) return;
    try {
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('Copied to clipboard!');
    } catch { alert('Copy not supported — use Download instead.'); }
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setUploadedImg(img);
        setSelected({ id: 'custom', name: 'Custom Upload', box_count: 2, url: '', width: img.width, height: img.height });
        setTexts(['', '']);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const filtered = search
    ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : templates.slice(0, 48);

  return (
    <div style={{ background: '#050d1a', minHeight: '100vh', fontFamily: '"DM Sans","Rethink Sans",sans-serif' }}>
      <style>{`
        @keyframes mfloat{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-8px);opacity:.7}}
        @keyframes mpulse{0%,100%{opacity:1}50%{opacity:.2}}
        .tmpl-thumb{cursor:pointer;border-radius:6px;overflow:hidden;border:2px solid transparent;transition:all .15s;aspect-ratio:1;background:#1e293b;position:relative}
        .tmpl-thumb:hover{border-color:rgba(56,189,248,0.5);transform:scale(1.04)}
        .tmpl-thumb.active{border-color:#0ea5e9;box-shadow:0 0 12px rgba(14,165,233,0.3)}
        .tmpl-thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .tmpl-name{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.85));padding:4px 4px 3px;font-size:9px;font-weight:700;color:#fff;text-align:center;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mg-btn{padding:10px 16px;border-radius:10px;font-weight:800;font-size:13px;border:none;cursor:pointer;font-family:inherit;transition:all .15s;letter-spacing:.3px}
        .mg-btn:active{transform:scale(.97)}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, background: 'rgba(10,18,40,0.97)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,180,216,0.12)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#050d1a' }}>S</div>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 16, color: '#fff' }}>Super<span style={{ color: '#38bdf8' }}>AdPro</span></span>
        </Link>
        <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontSize: 12, fontWeight: 700, padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get started free</Link>
      </nav>

      {/* ── COMPACT HERO ── */}
      <div style={{ background: 'linear-gradient(180deg,#050d1a,#0a1830)', padding: '16px 24px 14px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 4, height: 4, borderRadius: '50%', background: 'rgba(56,189,248,0.35)', animation: 'mfloat 4s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '40%', right: '15%', width: 3, height: 3, borderRadius: '50%', background: 'rgba(139,92,246,0.3)', animation: 'mfloat 5s ease-in-out infinite 1s' }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#0ea5e9', border: '1px solid rgba(0,180,216,0.3)', borderRadius: 50, padding: '3px 12px', marginBottom: 8 }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#0ea5e9', animation: 'mpulse 2s ease-in-out infinite' }} />
          Free tool — No signup required
        </div>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 28, color: '#fff', lineHeight: 1.1, margin: '0 0 4px' }}>
          Meme <span style={{ color: '#38bdf8' }}>Generator</span>
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(200,225,210,0.45)', margin: 0 }}>Create and download viral memes in seconds — 100 popular templates</p>
      </div>

      {/* ── WORKSPACE ── */}
      <div style={{ background: '#f3f4f6', padding: '12px 16px 32px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14, alignItems: 'start' }}>

          {/* LEFT: Canvas */}
          <div>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ padding: 10, background: '#0f172a', borderRadius: '12px 12px 0 0' }}>
                <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', borderRadius: 6, display: 'block' }} />
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
                <button onClick={downloadPNG} className="mg-btn" style={{ flex: 1, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', boxShadow: '0 3px 0 #075985' }}>
                  Download PNG
                </button>
                <button onClick={copyToClipboard} className="mg-btn" style={{ flex: 1, background: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0' }}>
                  Copy to clipboard
                </button>
              </div>
            </div>

            {/* CTA */}
            <div style={{ marginTop: 12, background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(0,180,216,0.12)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 13, color: '#fff', marginBottom: 2 }}>Want AI video, music & voiceover too?</div>
                <div style={{ fontSize: 11, color: 'rgba(200,225,210,0.4)', lineHeight: 1.4 }}>SuperAdPro — Complete AI creative studio + business-in-a-box</div>
              </div>
              <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 12, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}>Join free</Link>
            </div>
          </div>

          {/* RIGHT: Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Templates */}
            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="text" placeholder="Search 100 templates..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', border: '1.5px solid #e8ecf2', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#e8ecf2'} />
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} className="mg-btn" style={{ padding: '6px 10px', fontSize: 11, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>Upload</button>
              </div>
              <div style={{ padding: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {filtered.map(t => (
                  <div key={t.id} className={`tmpl-thumb${selected?.id === t.id ? ' active' : ''}`} onClick={() => selectTemplate(t)}>
                    <img src={t.url} alt={t.name} loading="lazy" />
                    <div className="tmpl-name">{t.name}</div>
                  </div>
                ))}
                {filtered.length === 0 && <div style={{ gridColumn: '1/-1', padding: 20, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>No templates found</div>}
              </div>
            </div>

            {/* Text */}
            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '7px 10px', borderBottom: '1px solid #f0f0f0', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Text {selected && <span style={{ fontWeight: 400, color: '#94a3b8', textTransform: 'none', letterSpacing: 0 }}>— {selected.name}</span>}
              </div>
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {texts.map((t, i) => (
                  <input key={i} type="text" placeholder={`Text ${i + 1}...`} value={t} onChange={e => setText(i, e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e8ecf2', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#e8ecf2'} />
                ))}
              </div>
            </div>

            {/* Style */}
            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '7px 10px', borderBottom: '1px solid #f0f0f0', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5 }}>Style</div>
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>Font</div>
                    <select value={font.id} onChange={e => setFont(FONTS.find(f => f.id === e.target.value) || FONTS[0])}
                      style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #e8ecf2', borderRadius: 7, fontSize: 11, fontFamily: 'inherit', color: '#334155', background: '#fff', cursor: 'pointer' }}>
                      {FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>Colour</div>
                    <select value={textStyle.id} onChange={e => setTextStyle(TEXT_STYLES.find(s => s.id === e.target.value) || TEXT_STYLES[0])}
                      style={{ width: '100%', padding: '6px 8px', border: '1.5px solid #e8ecf2', borderRadius: 7, fontSize: 11, fontFamily: 'inherit', color: '#334155', background: '#fff', cursor: 'pointer' }}>
                      {TEXT_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Size</span>
                    <span style={{ fontSize: 10, color: '#334155', fontWeight: 700 }}>{fontSize}px</span>
                  </div>
                  <input type="range" min="18" max="72" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#0ea5e9' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ background: '#050d1a', borderTop: '1px solid rgba(0,180,216,0.1)', padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(200,225,210,0.3)', margin: 0 }}>
          Made with love by <Link to="/" style={{ color: '#38bdf8', textDecoration: 'none' }}>SuperAdPro.com</Link> — Free meme generator, no signup, no nonsense.
        </p>
      </div>
    </div>
  );
}
