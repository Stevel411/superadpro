import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════
   SuperAdPro — Free Meme Generator v6
   Built to Steve's mockup: balanced 50/50, templates top-right,
   controls bottom-right, SC-style rich dropdowns
   ═══════════════════════════════════════════════════════════ */

const FONTS = [
  { id: 'impact', name: 'Impact', desc: 'Classic meme font', color: 'var(--sap-accent)', badge: 'POPULAR' },
  { id: 'arial', name: 'Arial Black', desc: 'Bold and clean', color: '#22d3ee', badge: null },
  { id: 'comic', name: 'Comic Sans MS', desc: 'Fun and playful', color: 'var(--sap-purple-light)', badge: null },
  { id: 'georgia', name: 'Georgia', desc: 'Elegant serif', color: 'var(--sap-amber)', badge: null },
  { id: 'verdana', name: 'Verdana Bold', desc: 'Wide and readable', color: '#34d399', badge: null },
  { id: 'trebuchet', name: 'Trebuchet MS', desc: 'Modern humanist', color: '#fb7185', badge: null },
  { id: 'courier', name: 'Courier New', desc: 'Typewriter monospace', color: 'var(--sap-text-faint)', badge: null },
  { id: 'tahoma', name: 'Tahoma', desc: 'Compact and sharp', color: '#c084fc', badge: null },
];
const FONT_FAMILIES = { impact: 'Impact, Haettenschweiler, sans-serif', arial: '"Arial Black", Gadget, sans-serif', comic: '"Comic Sans MS", cursive', georgia: 'Georgia, serif', verdana: 'Verdana, Geneva, sans-serif', trebuchet: '"Trebuchet MS", sans-serif', courier: '"Courier New", monospace', tahoma: 'Tahoma, Geneva, sans-serif' };

const COLORS = [
  { id: 'white', name: 'White', desc: 'Black outline', fill: '#fff', stroke: '#000', swatch: '#ffffff', badge: 'CLASSIC' },
  { id: 'black', name: 'Black', desc: 'White outline', fill: '#000', stroke: '#fff', swatch: '#000000', badge: null },
  { id: 'yellow', name: 'Yellow', desc: 'Black outline', fill: '#FFD700', stroke: '#000', swatch: '#FFD700', badge: null },
  { id: 'red', name: 'Red', desc: 'Black outline', fill: '#FF3333', stroke: '#000', swatch: '#FF3333', badge: null },
  { id: 'lime', name: 'Lime', desc: 'Black outline', fill: '#00FF00', stroke: '#000', swatch: '#00FF00', badge: null },
  { id: 'cyan', name: 'Cyan', desc: 'Black outline', fill: '#00E5FF', stroke: '#000', swatch: '#00E5FF', badge: null },
  { id: 'pink', name: 'Hot Pink', desc: 'Black outline', fill: '#FF69B4', stroke: '#000', swatch: '#FF69B4', badge: null },
  { id: 'orange', name: 'Orange', desc: 'Black outline', fill: '#FF8C00', stroke: '#000', swatch: '#FF8C00', badge: null },
];

export default function MemeGenerator() {
  var { t } = useTranslation();
  useEffect(() => {
    document.title = 'Free Meme Generator — Create Memes Online | SuperAdPro';
    const meta = document.querySelector('meta[name="description"]') || document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Create hilarious memes for free with 100+ templates. Choose a template, add your text, customise fonts and colours, download as PNG. No signup required.';
    if (!meta.parentNode) document.head.appendChild(meta);
    return () => { document.title = 'SuperAdPro'; };
  }, []);

  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [texts, setTexts] = useState({});
  const [fontId, setFontId] = useState('impact');
  const [colorId, setColorId] = useState('white');
  const [fontSize, setFontSize] = useState(36);
  const [loadedImg, setLoadedImg] = useState(null);
  const [search, setSearch] = useState('');
  const [uploadSrc, setUploadSrc] = useState(null);
  const [fontOpen, setFontOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  const font = FONTS.find(f => f.id === fontId) || FONTS[0];
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
      cx.save(); cx.font = `bold ${fs}px ${fam}`;
      cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.lineWidth = fs / 5; cx.lineJoin = 'round'; cx.miterLimit = 2;
      const x = W / 2, y = bc <= 1 ? H * 0.1 : bc === 2 ? (i === 0 ? H * 0.08 : H * 0.92) : H * (0.08 + i * 0.84 / (bc - 1));
      const lines = wrap(cx, t.toUpperCase(), W * 0.92), lh = fs * 1.15, sy = y - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, li) => { cx.strokeStyle = color.stroke; cx.strokeText(ln, x, sy + li * lh); cx.fillStyle = color.fill; cx.fillText(ln, x, sy + li * lh); });
      cx.restore();
    });
    cx.restore();
  }, [loadedImg, texts, fontId, colorId, fontSize, bc]);

  useEffect(() => { draw(); }, [draw]);
  function wrap(cx, t, mw) { const w = t.split(' '), lines = []; let c = ''; for (const word of w) { const test = c ? c + ' ' + word : word; if (cx.measureText(test).width > mw && c) { lines.push(c); c = word; } else c = test; } if (c) lines.push(c); return lines.length ? lines : ['']; }

  const dlPNG = () => { const c = canvasRef.current; if (!c) return; const a = document.createElement('a'); a.download = 'meme-superadpro.png'; a.href = c.toDataURL('image/png'); a.click(); };
  const resetMeme = () => { setTexts({}); setUploadSrc(null); setFontSize(36); setFontId('impact'); setColorId('white'); if (templates.length) setSelected(templates[0]); };
  const onUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { setUploadSrc(ev.target.result); setSelected(null); }; r.readAsDataURL(f); };
  const pick = (t) => { setSelected(t); setUploadSrc(null); };
  const vis = search.trim() ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : templates.slice(0, 100);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => { setFontOpen(false); setColorOpen(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Rich dropdown component (SuperScene style) ─────────
  function RichDropdown({ items, value, onChange, open, setOpen, renderItem }) {

    var { t } = useTranslation();
  const current = items.find(i => i.id === value) || items[0];
    return (
      <div style={{ position: 'relative' }}>
        <div onClick={e => { e.stopPropagation(); setOpen(!open); }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 12, cursor: 'pointer', transition: 'border-color .2s', borderColor: open ? 'var(--sap-accent)' : 'var(--sap-navy-card)' }}>
          {renderItem(current, true)}
          <svg style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.4 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8e8e98" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4, background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,.5)', maxHeight: 280, overflowY: 'auto' }}>
            {items.map(item => (
              <div key={item.id} onClick={e => { e.stopPropagation(); onChange(item.id); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: item.id === value ? 'rgba(14,165,233,.08)' : 'transparent', borderLeft: item.id === value ? '3px solid #0ea5e9' : '3px solid transparent', transition: 'background .15s' }}
                onMouseEnter={e => { if (item.id !== value) e.currentTarget.style.background = 'rgba(255,255,255,.03)'; }}
                onMouseLeave={e => { if (item.id !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                {renderItem(item, false)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const inp = { width: '100%', padding: '9px 12px', background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 10, fontSize: 13, color: '#fff', fontFamily: '"DM Sans",sans-serif', boxSizing: 'border-box', outline: 'none', transition: 'border-color .2s' };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', fontFamily: '"DM Sans","Rethink Sans",sans-serif', color: '#f0f2f8', display: 'flex', flexDirection: 'column' }}>
      {/* Background image + overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img src="/static/images/explore-bg2.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(3,7,18,0.85) 0%,rgba(3,7,18,0.75) 30%,rgba(3,7,18,0.8) 60%,rgba(3,7,18,0.95) 100%)' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .mg-tmpl{position:relative;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all .15s;aspect-ratio:1}
        .mg-tmpl:hover{border-color:rgba(56,189,248,.4);transform:scale(1.03)}
        .mg-tmpl.sel{border-color:#0ea5e9;box-shadow:0 0 12px rgba(14,165,233,.25)}
        .mg-tmpl img{width:100%;height:100%;object-fit:cover;display:block}
        .mg-tname{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.85));padding:8px 5px 4px;font-size:10px;font-weight:600;color:#fff;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mg-scroll::-webkit-scrollbar{width:5px}
        .mg-scroll::-webkit-scrollbar-track{background:transparent}
        .mg-scroll::-webkit-scrollbar-thumb{background:#2a3040;border-radius:3px}
      `}</style>

      {/* ═══ NAV — taller, centred title, homepage logo ═══ */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', height: 80, background: 'rgba(10,18,40,0.95)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,180,216,0.12)', flexShrink: 0 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <svg style={{ width: 28, height: 28 }} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="var(--sap-accent)"/><path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/></svg>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, color: '#fff' }}>SuperAd<span style={{ color: 'var(--sap-accent-light)' }}>{t('freeMeme.pro')}</span></span>
        </Link>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22, color: '#fff' }}>{t('freeMeme.title')}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-accent)', border: '1px solid rgba(14,165,233,0.4)', borderRadius: 20, padding: '4px 14px', letterSpacing: 1.5 }}>{t('freeMeme.free')}</span>
        </div>
        <Link to="/register" style={{ background: 'var(--sap-accent)', color: '#fff', fontSize: 15, fontWeight: 600, padding: '10px 24px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 2px 12px rgba(14,165,233,0.25)' }}>{t('freeMeme.getStartedFree')}</Link>
      </nav>

      {/* ═══ WORKSPACE — 50/50 ═══ */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* ═══ LEFT HALF ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 20px 14px', borderRight: '1px solid rgba(0,180,216,0.06)', overflow: 'hidden' }}>

          {/* Canvas — constrained so buttons stay visible */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', maxHeight: 'calc(100vh - 310px)' }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, display: 'block', background: '#0a1525' }} />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, padding: '12px 0 10px', flexShrink: 0 }}>
            <button onClick={dlPNG} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'var(--sap-accent)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(0,212,255,0.2)' }}>{t('freeMeme.downloadPng')}</button>
            <button onClick={resetMeme} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'rgba(255,255,255,.05)', color: 'rgba(200,220,255,.6)', fontWeight: 600, fontSize: 14, border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer', fontFamily: 'inherit' }}>{t('freeMeme.resetMeme')}</button>
          </div>

          {/* CTA */}
          <div style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(0,180,216,0.1)', borderRadius: 12, padding: '12px 16px', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{t("freeMeme.startBusiness")}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(200,220,255,.35)', lineHeight: 1.5, flex: 1 }}>{t("freeMeme.aiCreativeDesc")}</span>
              <Link to="/register" style={{ background: 'var(--sap-accent)', color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 16px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>{t('freeMeme.learnMore')}</Link>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT HALF ═══ */}
        <div style={{ overflowY: 'auto', background: '#0a1220' }}>

          {/* TOP: Template grid — CONTAINED with internal scroll */}
          <div style={{ padding: '16px 16px 8px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              Choose template <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#7b8594' }}>— {templates.length} available (scroll to browse)</span>
            </div>
            {/* Search + Upload — above the grid */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input type="text" placeholder={t("freeMeme.searchTemplates")} value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, flex: 1 }}
                onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'} onBlur={e => e.target.style.borderColor = 'var(--sap-navy-card)'} />
              <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()}
                style={{ padding: '9px 16px', background: 'var(--sap-navy-soft)', border: '1px solid #2a3040', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#c5cad1', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', whiteSpace: 'nowrap', transition: 'border-color .2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--sap-accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--sap-navy-card)'}
              >{t('freeMeme.uploadImage')}</button>
            </div>
            <div className="mg-scroll" style={{ height: 320, overflow: 'auto', borderRadius: 10, border: '1px solid #2a3040', background: '#0d1628', padding: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {vis.map(t => (
                <div key={t.id} className={`mg-tmpl${selected?.id === t.id && !uploadSrc ? ' sel' : ''}`} onClick={() => pick(t)}>
                  <img src={t.url} alt={t.name} loading="lazy" />
                  <div className="mg-tname">{t.name}</div>
                </div>
              ))}
              {vis.length === 0 && <div style={{ gridColumn: '1/-1', padding: 24, textAlign: 'center', fontSize: 13, color: '#7b8594' }}>{t('freeMeme.noTemplates')}</div>}
              </div>
            </div>
          </div>

          {/* BOTTOM: Controls */}
          <div style={{ padding: '12px 16px 14px', borderTop: '1px solid rgba(0,180,216,0.06)', background: '#0d1628' }}>

            {/* Caption */}
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              Caption {selected && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— {selected.name}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {labels.map((lbl, i) => (
                <input key={ky(i)} type="text" placeholder={lbl + '...'} value={gt(i)} onChange={e => st(i, e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'} onBlur={e => e.target.style.borderColor = 'var(--sap-navy-card)'} />
              ))}
            </div>

            {/* Style — rich dropdowns */}
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>{t('freeMeme.styleLabel')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>{t('freeMeme.fontLabel')}</div>
                <RichDropdown items={FONTS} value={fontId} onChange={setFontId} open={fontOpen} setOpen={v => { setFontOpen(v); setColorOpen(false); }}
                  renderItem={(f, isTrigger) => (
                    <>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${f.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: f.color, flexShrink: 0, fontFamily: FONT_FAMILIES[f.id] }}>{t('freeMeme.fontPreviewAa')}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{f.name}</div>
                        {!isTrigger && <div style={{ fontSize: 10, color: '#7b8594' }}>{f.desc}</div>}
                      </div>
                      {f.badge && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--sap-accent)', border: '1px solid rgba(14,165,233,.3)', borderRadius: 4, padding: '1px 6px', letterSpacing: 0.5, flexShrink: 0 }}>{f.badge}</span>}
                    </>
                  )}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 4, fontWeight: 600 }}>{t('freeMeme.textColour')}</div>
                <RichDropdown items={COLORS} value={colorId} onChange={setColorId} open={colorOpen} setOpen={v => { setColorOpen(v); setFontOpen(false); }}
                  renderItem={(c, isTrigger) => (
                    <>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--sap-navy-soft)', border: `2px solid ${c.swatch}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: c.swatch }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.name}</div>
                        {!isTrigger && <div style={{ fontSize: 10, color: '#7b8594' }}>{c.desc}</div>}
                      </div>
                      {c.badge && <span style={{ fontSize: 9, fontWeight: 700, color: '#22d3ee', border: '1px solid rgba(34,211,238,.3)', borderRadius: 4, padding: '1px 6px', letterSpacing: 0.5, flexShrink: 0 }}>{c.badge}</span>}
                    </>
                  )}
                />
              </div>
            </div>

            {/* Size slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: '#7b8594', fontWeight: 600 }}>{t('freeMeme.sizeLabel')}</span>
              <input type="range" min="16" max="80" value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{ flex: 1, accentColor: 'var(--sap-accent)' }} />
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>{fontSize}px</span>
            </div>

          </div>

          {/* Earn CTA */}
          <div style={{ padding: '8px 16px 10px', borderTop: '1px solid rgba(0,180,216,0.06)', background: 'rgba(14,165,233,0.03)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', flex: 1 }}>{t('freeMeme.earnCtaFull')}</span>
            <Link to="/earn" style={{ fontSize: 10, fontWeight: 700, color: 'var(--sap-accent)', textDecoration: 'none' }}>{t('freeMeme.seeHowFull')}</Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
