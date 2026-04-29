import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { Download, RefreshCw, Upload, Search, ChevronDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   SuperAdPro — Internal Meme Generator
   Light theme, AppLayout chrome.
   Same Imgflip API + canvas rendering as /free version.
   ═══════════════════════════════════════════════════════════ */

const FONTS = [
  { id: 'impact', name: 'Impact', desc: 'Classic meme font' },
  { id: 'arial', name: 'Arial Black', desc: 'Bold and clean' },
  { id: 'comic', name: 'Comic Sans MS', desc: 'Fun and playful' },
  { id: 'georgia', name: 'Georgia', desc: 'Elegant serif' },
  { id: 'verdana', name: 'Verdana Bold', desc: 'Wide and readable' },
  { id: 'trebuchet', name: 'Trebuchet MS', desc: 'Modern humanist' },
  { id: 'courier', name: 'Courier New', desc: 'Typewriter' },
  { id: 'tahoma', name: 'Tahoma', desc: 'Compact and sharp' },
];
const FONT_FAMILIES = {
  impact: 'Impact, Haettenschweiler, sans-serif',
  arial: '"Arial Black", Gadget, sans-serif',
  comic: '"Comic Sans MS", cursive',
  georgia: 'Georgia, serif',
  verdana: 'Verdana, Geneva, sans-serif',
  trebuchet: '"Trebuchet MS", sans-serif',
  courier: '"Courier New", monospace',
  tahoma: 'Tahoma, Geneva, sans-serif',
};

const COLORS = [
  { id: 'white', name: 'White', fill: '#fff', stroke: '#000' },
  { id: 'black', name: 'Black', fill: '#000', stroke: '#fff' },
  { id: 'yellow', name: 'Yellow', fill: '#FFD700', stroke: '#000' },
  { id: 'red', name: 'Red', fill: '#FF3333', stroke: '#000' },
  { id: 'lime', name: 'Lime', fill: '#00FF00', stroke: '#000' },
  { id: 'cyan', name: 'Cyan', fill: '#00E5FF', stroke: '#000' },
  { id: 'pink', name: 'Hot Pink', fill: '#FF69B4', stroke: '#000' },
  { id: 'orange', name: 'Orange', fill: '#FF8C00', stroke: '#000' },
];

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: '#fff', border: '1.5px solid var(--sap-border)', borderRadius: 10,
  fontSize: 14, color: 'var(--sap-text-primary)', fontFamily: '"DM Sans",sans-serif',
  boxSizing: 'border-box', outline: 'none', transition: 'border-color .2s',
};
const labelStyle = {
  display:'block', fontSize:12, fontWeight:700,
  color:'var(--sap-text-muted)', marginBottom:6,
  textTransform:'uppercase', letterSpacing:0.5,
};

export default function MemeGeneratorInternal() {
  const { t } = useTranslation();

  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [texts, setTexts] = useState({});
  const [fontId, setFontId] = useState('impact');
  const [colorId, setColorId] = useState('white');
  const [fontSize, setFontSize] = useState(36);
  const [loadedImg, setLoadedImg] = useState(null);
  const [search, setSearch] = useState('');
  const [uploadSrc, setUploadSrc] = useState(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  const color = COLORS.find(c => c.id === colorId) || COLORS[0];

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

  function wrap(cx, t, mw) {
    const w = t.split(' '), lines = []; let c = '';
    for (const word of w) {
      const test = c ? c + ' ' + word : word;
      if (cx.measureText(test).width > mw && c) { lines.push(c); c = word; }
      else c = test;
    }
    if (c) lines.push(c);
    return lines.length ? lines : [''];
  }

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv || !loadedImg) return;
    const cx = cv.getContext('2d');
    const W = loadedImg.naturalWidth, H = loadedImg.naturalHeight;
    cv.width = W; cv.height = H;
    cx.drawImage(loadedImg, 0, 0, W, H);
    const sc = Math.min(W, H) / 600, fs = Math.round(fontSize * sc);
    const fam = FONT_FAMILIES[fontId] || FONT_FAMILIES.impact;
    labels.forEach((_, i) => {
      const t = gt(i); if (!t) return;
      cx.save();
      cx.font = `bold ${fs}px ${fam}`;
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.lineWidth = fs / 5; cx.lineJoin = 'round'; cx.miterLimit = 2;
      const x = W / 2;
      const y = bc <= 1 ? H * 0.1 : bc === 2 ? (i === 0 ? H * 0.08 : H * 0.92) : H * (0.08 + i * 0.84 / (bc - 1));
      const lines = wrap(cx, t.toUpperCase(), W * 0.92);
      const lh = fs * 1.15;
      const sy = y - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, li) => {
        cx.strokeStyle = color.stroke; cx.strokeText(ln, x, sy + li * lh);
        cx.fillStyle = color.fill; cx.fillText(ln, x, sy + li * lh);
      });
      cx.restore();
    });
  }, [loadedImg, texts, fontId, colorId, fontSize, bc, color.fill, color.stroke]);

  useEffect(() => { draw(); }, [draw]);

  const dlPNG = () => {
    const c = canvasRef.current; if (!c) return;
    const a = document.createElement('a');
    a.download = 'meme-superadpro.png';
    a.href = c.toDataURL('image/png');
    a.click();
  };
  const resetMeme = () => {
    setTexts({}); setUploadSrc(null);
    setFontSize(36); setFontId('impact'); setColorId('white');
    if (templates.length) setSelected(templates[0]);
  };
  const onUpload = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { setUploadSrc(ev.target.result); setSelected(null); };
    r.readAsDataURL(f);
  };
  const pick = (t) => { setSelected(t); setUploadSrc(null); };
  const vis = search.trim() ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : templates.slice(0, 100);

  return (
    <AppLayout title="Meme Generator" subtitle="Create memes from 100+ templates or upload your own image">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* LEFT: canvas + downloads */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--sap-border)', padding: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', position: 'sticky', top: 20 }}>
          <label style={{ ...labelStyle, marginBottom: 12 }}>Preview</label>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--sap-bg-elevated)', borderRadius: 12,
            padding: 16, marginBottom: 16, minHeight: 320,
            border: '1px dashed var(--sap-border)',
          }}>
            {loadedImg ? (
              <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: 480, display: 'block', borderRadius: 8 }} />
            ) : (
              <div style={{ color: 'var(--sap-text-faint)', fontSize: 13 }}>Loading template…</div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={dlPNG}
              style={{
                padding: '12px 16px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, var(--sap-accent), var(--sap-accent-light))',
                color: '#fff', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(14,165,233,0.25)',
              }}>
              <Download size={16} /> Download PNG
            </button>
            <button onClick={resetMeme}
              style={{
                padding: '12px 16px', borderRadius: 10,
                border: '1.5px solid var(--sap-border)', background: '#fff', color: 'var(--sap-text-muted)',
                cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* RIGHT: controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Templates panel */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--sap-border)', padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Choose a template</label>
              <button onClick={() => fileRef.current?.click()}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  border: '1.5px solid var(--sap-border)', background: '#fff', color: 'var(--sap-text-muted)',
                  cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--sap-accent)'; e.currentTarget.style.color = 'var(--sap-accent)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--sap-border)'; e.currentTarget.style.color = 'var(--sap-text-muted)'; }}>
                <Upload size={14} /> Upload image
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
            </div>

            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--sap-text-faint)' }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search 100+ templates…"
                style={{ ...inputStyle, paddingLeft: 36 }}
                onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, maxHeight: 240, overflowY: 'auto', padding: 2 }}>
              {vis.map(t => {
                const sel = !uploadSrc && selected?.id === t.id;
                return (
                  <button key={t.id} onClick={() => pick(t)} title={t.name}
                    style={{
                      padding: 0, borderRadius: 8,
                      border: sel ? '2px solid var(--sap-accent)' : '1.5px solid var(--sap-border)',
                      background: '#fff', cursor: 'pointer', overflow: 'hidden',
                      transition: 'all .15s', aspectRatio: '1', position: 'relative',
                    }}>
                    <img src={t.url} alt={t.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      crossOrigin="anonymous" loading="lazy" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text inputs */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--sap-border)', padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <label style={{ ...labelStyle, marginBottom: 12 }}>Your meme text</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {labels.map((lbl, i) => (
                <input key={i} type="text" value={gt(i)} onChange={e => st(i, e.target.value)}
                  placeholder={lbl} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
              ))}
            </div>
          </div>

          {/* Style options */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--sap-border)', padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <label style={{ ...labelStyle, marginBottom: 12 }}>Style</label>

            <div style={{ marginBottom: 14 }}>
              <label style={{ ...labelStyle, fontSize: 11, marginBottom: 6 }}>Font</label>
              <select value={fontId} onChange={e => setFontId(e.target.value)} style={inputStyle}>
                {FONTS.map(f => <option key={f.id} value={f.id}>{f.name} — {f.desc}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ ...labelStyle, fontSize: 11, marginBottom: 6 }}>Text colour</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {COLORS.map(c => (
                  <button key={c.id} onClick={() => setColorId(c.id)} title={c.name}
                    style={{
                      padding: '8px 4px', borderRadius: 8,
                      border: colorId === c.id ? '2px solid var(--sap-accent)' : '1.5px solid var(--sap-border)',
                      background: '#fff', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      transition: 'all .15s',
                    }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: c.fill, border: '2px solid ' + c.stroke }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sap-text-muted)' }}>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ ...labelStyle, fontSize: 11, marginBottom: 6 }}>Font size: {fontSize}px</label>
              <input type="range" min={20} max={80} value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--sap-accent)' }} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
