import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// ── Meme templates with text zones ─────────────────────────────────
const TEMPLATES = [
  { id: 'drake', name: 'Drake', emoji: '🙅', zones: [{ x: .52, y: .02, w: .46, h: .46, label: 'Top text' }, { x: .52, y: .52, w: .46, h: .46, label: 'Bottom text' }], bg: '#f5f0e8', desc: 'Nah vs Yeah' },
  { id: 'distracted', name: 'Distracted BF', emoji: '😤', zones: [{ x: .02, y: .02, w: .3, h: .25, label: 'Her' }, { x: .35, y: .02, w: .3, h: .25, label: 'Him' }, { x: .7, y: .02, w: .28, h: .25, label: 'You' }], bg: '#e8ddd0', desc: '3 panels' },
  { id: 'brain', name: 'Galaxy Brain', emoji: '🧠', zones: [{ x: .52, y: .01, w: .46, h: .22, label: 'Small brain' }, { x: .52, y: .26, w: .46, h: .22, label: 'Medium brain' }, { x: .52, y: .51, w: .46, h: .22, label: 'Big brain' }, { x: .52, y: .76, w: .46, h: .22, label: 'Galaxy brain' }], bg: '#e0e0e8', desc: '4 levels' },
  { id: 'change', name: 'Change My Mind', emoji: '☕', zones: [{ x: .1, y: .05, w: .8, h: .3, label: 'Your hot take' }], bg: '#d4e8d0', desc: 'One statement' },
  { id: 'twobuttons', name: 'Two Buttons', emoji: '😰', zones: [{ x: .05, y: .05, w: .4, h: .2, label: 'Option A' }, { x: .5, y: .05, w: .4, h: .2, label: 'Option B' }], bg: '#dde0f0', desc: '2 choices' },
  { id: 'classic', name: 'Classic Meme', emoji: '😂', zones: [{ x: .05, y: .02, w: .9, h: .15, label: 'Top text' }, { x: .05, y: .83, w: .9, h: .15, label: 'Bottom text' }], bg: '#e8e8e8', desc: 'Top + bottom' },
  { id: 'disaster', name: 'Disaster Girl', emoji: '🔥', zones: [{ x: .05, y: .02, w: .9, h: .15, label: 'Top text' }, { x: .05, y: .83, w: .9, h: .15, label: 'Bottom text' }], bg: '#f0e0d0', desc: 'Chaos energy' },
  { id: 'doge', name: 'Doge', emoji: '🐕', zones: [{ x: .05, y: .02, w: .4, h: .15, label: 'Such text' }, { x: .5, y: .4, w: .45, h: .15, label: 'Much text' }, { x: .1, y: .8, w: .5, h: .15, label: 'Wow' }], bg: '#f8f0d0', desc: 'Much wow' },
  { id: 'blank', name: 'Upload Image', emoji: '📤', zones: [{ x: .05, y: .02, w: .9, h: .15, label: 'Top text' }, { x: .05, y: .83, w: .9, h: .15, label: 'Bottom text' }], bg: '#f0f0f0', desc: 'Your image', isUpload: true },
];

const FONTS = [
  { id: 'impact', name: 'Impact (Classic)', family: 'Impact, Haettenschweiler, sans-serif' },
  { id: 'arial', name: 'Arial Black', family: '"Arial Black", Gadget, sans-serif' },
  { id: 'comic', name: 'Comic Sans', family: '"Comic Sans MS", cursive' },
  { id: 'bebas', name: 'Bebas Neue', family: '"Bebas Neue", Impact, sans-serif' },
];

const TEXT_STYLES = [
  { id: 'white', name: 'White + Black outline', fill: '#FFFFFF', stroke: '#000000' },
  { id: 'black', name: 'Black + White outline', fill: '#000000', stroke: '#FFFFFF' },
  { id: 'yellow', name: 'Yellow + Black outline', fill: '#FFD700', stroke: '#000000' },
  { id: 'red', name: 'Red + White outline', fill: '#FF3333', stroke: '#FFFFFF' },
];

const CANVAS_W = 800;
const CANVAS_H = 600;

export default function MemeGenerator() {
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [texts, setTexts] = useState({});
  const [font, setFont] = useState(FONTS[0]);
  const [textStyle, setTextStyle] = useState(TEXT_STYLES[0]);
  const [fontSize, setFontSize] = useState(42);
  const [uploadedImg, setUploadedImg] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Update text for a zone
  const setText = (zoneIdx, val) => {
    setTexts(prev => ({ ...prev, [template.id + '_' + zoneIdx]: val }));
  };
  const getText = (zoneIdx) => texts[template.id + '_' + zoneIdx] || '';

  // ── Canvas rendering ────────────────────────────────────
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    // Background
    ctx.fillStyle = template.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw uploaded image if available and template is upload
    if (uploadedImg && template.isUpload) {
      const img = new Image();
      img.onload = () => {
        // Cover fill
        const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
        drawTexts(ctx);
        drawWatermark(ctx);
      };
      img.src = uploadedImg;
      return;
    }

    // Draw template placeholder graphics
    drawTemplatePlaceholder(ctx, template);
    drawTexts(ctx);
    drawWatermark(ctx);
  }, [template, texts, font, textStyle, fontSize, uploadedImg]);

  const drawTemplatePlaceholder = (ctx, tmpl) => {
    // Draw styled template placeholders based on template type
    ctx.save();
    if (tmpl.id === 'drake') {
      // Two rows — reject/accept
      ctx.fillStyle = '#d4c4a8'; ctx.fillRect(0, 0, CANVAS_W * 0.5, CANVAS_H * 0.5);
      ctx.fillStyle = '#c8b898'; ctx.fillRect(0, CANVAS_H * 0.5, CANVAS_W * 0.5, CANVAS_H * 0.5);
      ctx.fillStyle = '#f5efe5'; ctx.fillRect(CANVAS_W * 0.5, 0, CANVAS_W * 0.5, CANVAS_H * 0.5);
      ctx.fillStyle = '#f0eadf'; ctx.fillRect(CANVAS_W * 0.5, CANVAS_H * 0.5, CANVAS_W * 0.5, CANVAS_H * 0.5);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(CANVAS_W * 0.5, 0); ctx.lineTo(CANVAS_W * 0.5, CANVAS_H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, CANVAS_H * 0.5); ctx.lineTo(CANVAS_W, CANVAS_H * 0.5); ctx.stroke();
      // Emoji faces
      ctx.font = '80px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🙅', CANVAS_W * 0.25, CANVAS_H * 0.3);
      ctx.fillText('👉', CANVAS_W * 0.25, CANVAS_H * 0.78);
    } else if (tmpl.id === 'brain') {
      for (let i = 0; i < 4; i++) {
        const y = i * (CANVAS_H / 4);
        ctx.fillStyle = i % 2 === 0 ? '#d8d8e4' : '#e4e4ec';
        ctx.fillRect(0, y, CANVAS_W * 0.5, CANVAS_H / 4);
        ctx.fillStyle = i % 2 === 0 ? '#ececf4' : '#f4f4fc';
        ctx.fillRect(CANVAS_W * 0.5, y, CANVAS_W * 0.5, CANVAS_H / 4);
        ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }
      ctx.font = '48px sans-serif'; ctx.textAlign = 'center';
      const brains = ['🧠', '🧠✨', '🧠💫', '🧠🌌'];
      for (let i = 0; i < 4; i++) {
        ctx.fillText(brains[i], CANVAS_W * 0.25, (i + 0.55) * (CANVAS_H / 4));
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(CANVAS_W * 0.5, 0); ctx.lineTo(CANVAS_W * 0.5, CANVAS_H); ctx.stroke();
    } else if (tmpl.id === 'distracted') {
      ctx.fillStyle = '#d8cfc0';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.font = '72px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('👩', CANVAS_W * 0.2, CANVAS_H * 0.6);
      ctx.fillText('👨', CANVAS_W * 0.5, CANVAS_H * 0.55);
      ctx.fillText('👩', CANVAS_W * 0.8, CANVAS_H * 0.6);
    } else {
      // Generic meme background with faint grid
      ctx.fillStyle = tmpl.bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.font = '120px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(tmpl.emoji, CANVAS_W / 2, CANVAS_H / 2);
    }
    ctx.restore();
  };

  const drawTexts = (ctx) => {
    template.zones.forEach((zone, i) => {
      const text = getText(i);
      if (!text) return;

      const x = zone.x * CANVAS_W + (zone.w * CANVAS_W) / 2;
      const y = zone.y * CANVAS_H + (zone.h * CANVAS_H) / 2;
      const maxW = zone.w * CANVAS_W - 20;

      ctx.save();
      ctx.font = `bold ${fontSize}px ${font.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = fontSize / 6;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;

      // Word wrap
      const lines = wrapText(ctx, text.toUpperCase(), maxW);
      const lineHeight = fontSize * 1.2;
      const startY = y - ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, li) => {
        const ly = startY + li * lineHeight;
        ctx.strokeStyle = textStyle.stroke;
        ctx.strokeText(line, x, ly);
        ctx.fillStyle = textStyle.fill;
        ctx.fillText(line, x, ly);
      });
      ctx.restore();
    });
  };

  const drawWatermark = (ctx) => {
    ctx.save();
    ctx.font = '500 16px "DM Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText('SuperAdPro.com', CANVAS_W - 12, CANVAS_H - 10);
    ctx.fillText('SuperAdPro.com', CANVAS_W - 12, CANVAS_H - 10);
    ctx.restore();
  };

  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  };

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  // ── Download ────────────────────────────────────────────
  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'meme-superadpro.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const copyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('Copied to clipboard!');
    } catch { alert('Copy not supported in this browser — use Download instead.'); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImg(ev.target.result);
      // Auto-select the upload template
      const uploadTmpl = TEMPLATES.find(t => t.isUpload);
      if (uploadTmpl) setTemplate(uploadTmpl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ background: '#050d1a', minHeight: '100vh', fontFamily: '"DM Sans","Rethink Sans",sans-serif' }}>
      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 64, background: 'rgba(10,18,40,0.97)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,180,216,0.12)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#050d1a' }}>S</div>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 18, color: '#fff' }}>Super<span style={{ color: '#38bdf8' }}>AdPro</span></span>
        </Link>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 2px 12px rgba(14,165,233,0.25)', transition: 'all .3s' }}>Get started free</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(180deg,#050d1a 0%,#0a1830 50%,#091428 100%)', padding: '20px 24px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Floating particles */}
        <style>{`
          @keyframes mfloat{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-12px);opacity:.8}}
          @keyframes mpulse{0%,100%{opacity:1}50%{opacity:.2}}
        `}</style>
        <div style={{ position: 'absolute', top: '15%', left: '12%', width: 5, height: 5, borderRadius: '50%', background: 'rgba(56,189,248,0.4)', animation: 'mfloat 4s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '30%', right: '18%', width: 4, height: 4, borderRadius: '50%', background: 'rgba(139,92,246,0.35)', animation: 'mfloat 5s ease-in-out infinite 1s' }} />
        <div style={{ position: 'absolute', bottom: '25%', left: '30%', width: 3, height: 3, borderRadius: '50%', background: 'rgba(14,165,233,0.3)', animation: 'mfloat 6s ease-in-out infinite 0.5s' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#0ea5e9', border: '1px solid rgba(0,180,216,0.3)', borderRadius: 50, padding: '3px 14px', marginBottom: 10 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0ea5e9', animation: 'mpulse 2s ease-in-out infinite' }} />
          Free tool — No signup required
        </div>

        <h1 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 'clamp(24px,3.5vw,36px)', color: '#fff', lineHeight: 1.1, margin: '0 0 6px' }}>
          Meme <span style={{ background: 'linear-gradient(135deg,#38bdf8,#7c9fff,#0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Generator</span>
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(200,225,210,0.5)', maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
          Create viral memes in seconds. Pick a template, add your text, download and share.
        </p>
      </div>

      {/* ── WORKSPACE ── */}
      <div style={{ background: 'linear-gradient(180deg,#091428 0%,#0e1a30 3%,#f3f4f6 3%,#f3f4f6 100%)', padding: '0 16px 40px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

          {/* ── Left: Canvas ── */}
          <div>
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ padding: 12 }}>
                <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block', background: '#e2e8f0' }} />
              </div>

              {/* Action buttons */}
              <div style={{ padding: '0 12px 12px', display: 'flex', gap: 8 }}>
                <button onClick={downloadPNG} style={{ flex: 1, padding: 11, borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 0 #075985,0 4px 12px rgba(14,165,233,0.3)', letterSpacing: 0.3 }}>
                  Download PNG
                </button>
                <button onClick={copyToClipboard} style={{ flex: 1, padding: 11, borderRadius: 10, background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, border: '1.5px solid #e2e8f0', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Copy to clipboard
                </button>
              </div>
            </div>

            {/* CTA banner */}
            <div style={{ marginTop: 14, background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(0,180,216,0.15)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 13, color: '#fff', marginBottom: 3 }}>Want AI-powered video, music & voiceover?</div>
                <div style={{ fontSize: 11, color: 'rgba(200,225,210,0.45)', lineHeight: 1.4 }}>SuperAdPro gives you a complete AI creative studio plus a business-in-a-box with income opportunities.</div>
              </div>
              <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 13, padding: '11px 22px', borderRadius: 10, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(14,165,233,0.3)' }}>
                Join free
              </Link>
            </div>
          </div>

          {/* ── Right: Controls ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Template picker */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5 }}>Templates</div>
              <div style={{ padding: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {TEMPLATES.map(t => (
                  <div key={t.id} onClick={() => setTemplate(t)}
                    style={{
                      aspectRatio: '1', background: template.id === t.id ? '#eff6ff' : '#f8fafc', borderRadius: 8,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', border: template.id === t.id ? '2px solid #0ea5e9' : '1.5px solid #e8ecf2',
                      transition: 'all .15s', position: 'relative',
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 1 }}>{t.emoji}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: template.id === t.id ? '#0ea5e9' : '#64748b', textAlign: 'center', lineHeight: 1.2 }}>{t.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload button (if upload template selected) */}
            {template.isUpload && (
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: 13, borderRadius: 12, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 0 #5b21b6', letterSpacing: 0.3 }}>
                  {uploadedImg ? 'Change image' : 'Upload your image'}
                </button>
              </div>
            )}

            {/* Text inputs */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5 }}>Text</div>
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {template.zones.map((zone, i) => (
                  <input key={template.id + '_' + i} type="text" placeholder={zone.label + '...'} value={getText(i)}
                    onChange={e => setText(i, e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e8ecf2', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                    onBlur={e => e.target.style.borderColor = '#e8ecf2'}
                  />
                ))}
              </div>
            </div>

            {/* Style controls */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5 }}>Style</div>
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3, fontWeight: 600 }}>Font</div>
                  <select value={font.id} onChange={e => setFont(FONTS.find(f => f.id === e.target.value) || FONTS[0])}
                    style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #e8ecf2', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: '#334155', background: '#fff', cursor: 'pointer' }}>
                    {FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3, fontWeight: 600 }}>Text colour</div>
                  <select value={textStyle.id} onChange={e => setTextStyle(TEXT_STYLES.find(s => s.id === e.target.value) || TEXT_STYLES[0])}
                    style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #e8ecf2', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', color: '#334155', background: '#fff', cursor: 'pointer' }}>
                    {TEXT_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Font size</span>
                    <span style={{ fontSize: 10, color: '#334155', fontWeight: 700 }}>{fontSize}px</span>
                  </div>
                  <input type="range" min="20" max="80" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#0ea5e9' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: '#050d1a', borderTop: '1px solid rgba(0,180,216,0.1)', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(200,225,210,0.3)', margin: '0 0 8px' }}>
          Made with ❤️ by <Link to="/" style={{ color: '#38bdf8', textDecoration: 'none' }}>SuperAdPro.com</Link> — Your business-in-a-box platform
        </p>
        <p style={{ fontSize: 11, color: 'rgba(200,225,210,0.2)', margin: 0 }}>
          Free meme generator — no signup, no watermark removal fees, no BS. Just make memes.
        </p>
      </div>
    </div>
  );
}
