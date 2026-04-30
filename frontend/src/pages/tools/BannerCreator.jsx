import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { Download, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   SuperAdPro — Internal Social Media Banner & Profile Creator
   Light theme, AppLayout chrome.
   Same canvas rendering as /free/banner-creator.
   ═══════════════════════════════════════════════════════════ */

const PLATFORMS = [
  // Banners
  { id: 'yt-thumb', name: 'YouTube Thumbnail', w: 1280, h: 720, cat: 'banner', icon: 'youtube' },
  { id: 'ig-post', name: 'Instagram Post', w: 1080, h: 1080, cat: 'banner', icon: 'instagram' },
  { id: 'ig-story', name: 'Story / Reels / TikTok', w: 1080, h: 1920, cat: 'banner', icon: 'tiktok' },
  { id: 'fb-cover', name: 'Facebook Cover', w: 820, h: 312, cat: 'banner', icon: 'facebook' },
  { id: 'x-header', name: 'X / Twitter Header', w: 1500, h: 500, cat: 'banner', icon: 'x' },
  { id: 'li-banner', name: 'LinkedIn Banner', w: 1584, h: 396, cat: 'banner', icon: 'linkedin' },
  { id: 'yt-banner', name: 'YouTube Banner', w: 2560, h: 1440, cat: 'banner', icon: 'youtube' },
  { id: 'pin', name: 'Pinterest Pin', w: 1000, h: 1500, cat: 'banner', icon: 'pinterest' },
  // Profiles
  { id: 'yt-profile', name: 'YouTube Profile', w: 800, h: 800, cat: 'profile', icon: 'youtube' },
  { id: 'ig-profile', name: 'Instagram Profile', w: 320, h: 320, cat: 'profile', icon: 'instagram' },
  { id: 'fb-profile', name: 'Facebook Profile', w: 170, h: 170, cat: 'profile', icon: 'facebook' },
  { id: 'x-profile', name: 'X / Twitter Profile', w: 400, h: 400, cat: 'profile', icon: 'x' },
  { id: 'li-profile', name: 'LinkedIn Profile', w: 400, h: 400, cat: 'profile', icon: 'linkedin' },
  { id: 'tt-profile', name: 'TikTok Profile', w: 200, h: 200, cat: 'profile', icon: 'tiktok' },
];

const GRADIENTS = [
  { id: 'g1', from: '#1a0533', to: '#0f172a', name: 'Midnight' },
  { id: 'g2', from: '#0ea5e9', to: '#6366f1', name: 'Ocean' },
  { id: 'g3', from: '#f59e0b', to: '#ef4444', name: 'Sunset' },
  { id: 'g4', from: '#22c55e', to: '#0ea5e9', name: 'Teal' },
  { id: 'g5', from: '#ec4899', to: '#8b5cf6', name: 'Pink' },
  { id: 'g6', from: '#0f172a', to: '#334155', name: 'Slate' },
  { id: 'g7', from: '#0f172a', to: '#1e3a5f', name: 'Navy' },
  { id: 'g8', from: '#7c3aed', to: '#2563eb', name: 'Indigo' },
  { id: 'g9', from: '#dc2626', to: '#f97316', name: 'Fire' },
  { id: 'g10', from: '#ffffff', to: '#f0f3f9', name: 'White' },
];

const FONTS = [
  { id: 'impact', name: 'Impact', family: 'Impact, sans-serif' },
  { id: 'arial', name: 'Arial Black', family: '"Arial Black", sans-serif' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia, serif' },
  { id: 'verdana', name: 'Verdana', family: 'Verdana, sans-serif' },
  { id: 'trebuchet', name: 'Trebuchet', family: '"Trebuchet MS", sans-serif' },
  { id: 'courier', name: 'Courier', family: '"Courier New", monospace' },
];

const PlatformIcon = ({ icon, size = 18 }) => {
  switch (icon) {
    case 'youtube': return (<svg width={size} height={size} viewBox="0 0 24 24"><rect x="1" y="5" width="22" height="14" rx="4" fill="#FF0000"/><polygon points="10,8.5 10,15.5 16,12" fill="#fff"/></svg>);
    case 'instagram': return (<svg width={size} height={size} viewBox="0 0 24 24"><defs><linearGradient id="igX" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#FFDC80"/><stop offset="50%" stopColor="#E4405F"/><stop offset="100%" stopColor="#5B51D8"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#igX)"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="#fff" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/></svg>);
    case 'facebook': return (<svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#1877F2"/><path d="M16.5 14.5l.5-3.5h-3v-2c0-1 .5-1.8 1.8-1.8H17V4.3S15.8 4 14.7 4C12.2 4 10.6 5.7 10.6 8.5V11H8v3.5h2.6V22h3.4v-7.5h2.5z" fill="#fff"/></svg>);
    case 'x': return (<svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#000"/><path d="M13.8 10.5L18.2 5.5H17L13.2 9.8L10.2 5.5H6L10.7 12.8L6 18.2H7.3L11.3 13.5L14.5 18.2H18.6L13.8 10.5ZM8 6.8H9.5L16.6 17H15.1L8 6.8Z" fill="#fff"/></svg>);
    case 'linkedin': return (<svg width={size} height={size} viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="3" fill="#0A66C2"/><path d="M7 10v7H9.5V10H7ZM8.2 6C7.4 6 6.8 6.6 6.8 7.3S7.4 8.5 8.2 8.5 9.5 8 9.5 7.3 9 6 8.2 6ZM16.5 10c-1.5 0-2.2.8-2.5 1.3V10H11.5v7H14v-3.8c0-1 .5-1.7 1.4-1.7s1.2.6 1.2 1.6V17H19v-4.2C19 11 17.8 10 16.5 10z" fill="#fff"/></svg>);
    case 'tiktok': return (<svg width={size} height={size} viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="5" fill="#010101"/><path d="M16.5 6.5c-.7-.8-1-1.7-1-2.5H13v11c0 1.4-1.1 2.5-2.5 2.5S8 16.4 8 15s1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1V10c-.3 0-.5-.1-.8-.1C8 10 6 12 6 15s2.5 5 5 5 4.5-2.2 4.5-5V10c.8.6 1.8 1 3 1V8.5c-.8 0-1.5-.5-2-1z" fill="#fff"/></svg>);
    case 'pinterest': return (<svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#BD081C"/><path d="M12 5C8.7 5 6 7.5 6 10.8c0 1.8 1 3.5 2.6 4.3 0-.4.1-.9.2-1.3l.7-2.7s-.2-.3-.2-.8c0-1 .5-1.7 1.2-1.7.6 0 .9.4.9.9 0 .6-.4 1.4-.6 2.2-.2.7.3 1.3 1 1.3 1.3 0 2.2-1.6 2.2-3.5 0-1.4-1-2.5-2.8-2.5-2.1 0-3.3 1.5-3.3 3.2 0 .6.2 1 .4 1.3.1.1.1.2.1.3l-.1.6c0 .1-.1.2-.3.1-.9-.4-1.3-1.5-1.3-2.7 0-2 1.7-4.4 5-4.4 2.7 0 4.4 1.9 4.4 4 0 2.7-1.5 4.7-3.7 4.7-.7 0-1.4-.4-1.6-.8l-.5 1.7c-.1.5-.4 1-.7 1.4.6.2 1.2.3 1.8.3 3.3 0 6-2.7 6-6S15.3 5 12 5z" fill="#fff"/></svg>);
    default: return null;
  }
};

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

export default function BannerCreatorInternal() {
  const { t } = useTranslation();

  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [catFilter, setCatFilter] = useState('banner');
  const [bgMode, setBgMode] = useState('gradient');
  const [gradient, setGradient] = useState(GRADIENTS[0]);
  const [solidColor, setSolidColor] = useState('#0f172a');
  const [bgImage, setBgImage] = useState(null);
  const [mainText, setMainText] = useState('YOUR HEADLINE HERE');
  const [mainSize, setMainSize] = useState(48);
  const [mainColor, setMainColor] = useState('#FFFFFF');
  const [mainFont, setMainFont] = useState(FONTS[0]);
  const [subText, setSubText] = useState('SUPERADPRO.COM');
  const [subSize, setSubSize] = useState(18);
  const [subColor, setSubColor] = useState('#22d3ee');
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  const drawText = useCallback((cx, W, H) => {
    const scale = Math.min(W, H) / 500;
    if (mainText) {
      const fs = Math.round(mainSize * scale);
      cx.font = `900 ${fs}px ${mainFont.family}`;
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.lineWidth = fs / 8; cx.lineJoin = 'round';
      const lines = mainText.split('\n');
      const lh = fs * 1.15;
      const startY = H * 0.42 - ((lines.length - 1) * lh) / 2;
      lines.forEach((line, i) => {
        const y = startY + i * lh;
        cx.strokeStyle = 'rgba(0,0,0,0.3)'; cx.strokeText(line, W / 2, y);
        cx.fillStyle = mainColor; cx.fillText(line, W / 2, y);
      });
    }
    if (subText) {
      const ss = Math.round(subSize * scale);
      cx.font = `700 ${ss}px ${mainFont.family}`;
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillStyle = subColor;
      cx.fillText(subText, W / 2, H * 0.62);
    }
  }, [mainText, mainSize, mainColor, mainFont, subText, subSize, subColor]);

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const cx = cv.getContext('2d');
    const W = platform.w, H = platform.h;
    cv.width = W; cv.height = H;

    if (bgMode === 'image' && bgImage) {
      const img = new Image(); img.src = bgImage;
      img.onload = () => { cx.drawImage(img, 0, 0, W, H); drawText(cx, W, H); };
      return;
    }
    if (bgMode === 'gradient') {
      const g = cx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, gradient.from); g.addColorStop(1, gradient.to);
      cx.fillStyle = g;
    } else {
      cx.fillStyle = solidColor;
    }
    cx.fillRect(0, 0, W, H);
    drawText(cx, W, H);
  }, [platform, bgMode, gradient, solidColor, bgImage, drawText]);

  useEffect(() => { draw(); }, [draw]);

  const dlPNG = () => {
    const cv = canvasRef.current; if (!cv) return;
    const a = document.createElement('a');
    a.download = `${platform.id}-superadpro.png`;
    a.href = cv.toDataURL('image/png'); a.click();
  };
  const reset = () => {
    setMainText('YOUR HEADLINE HERE'); setSubText('SUPERADPRO.COM');
    setMainSize(48); setSubSize(18); setMainColor('#FFFFFF'); setSubColor('#22d3ee');
    setBgMode('gradient'); setGradient(GRADIENTS[0]); setBgImage(null); setMainFont(FONTS[0]);
  };
  const onBgUpload = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { setBgImage(ev.target.result); setBgMode('image'); };
    r.readAsDataURL(f);
  };

  const filtered = PLATFORMS.filter(p => p.cat === catFilter);

  return (
    <AppLayout title="Banner & Profile Creator" subtitle="Create social media banners and profile pictures at exact platform dimensions">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* LEFT: preview + downloads */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--sap-border)', padding: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Preview</label>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sap-text-muted)' }}>{platform.w} × {platform.h}px</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--sap-bg-elevated)', borderRadius: 12,
            padding: 16, marginBottom: 16, minHeight: 320,
            border: '1px dashed var(--sap-border)', overflow: 'hidden',
          }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: 460, display: 'block', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
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
            <button onClick={reset}
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

          {/* Platform picker */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--sap-border)', padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <label style={{ ...labelStyle, marginBottom: 10 }}>Platform</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[{id:'banner',label:'Banners'},{id:'profile',label:'Profiles'}].map(c => (
                <button key={c.id} onClick={() => setCatFilter(c.id)}
                  style={{
                    flex: 1, padding: '8px 14px', borderRadius: 8,
                    border: catFilter === c.id ? '1.5px solid var(--sap-accent)' : '1.5px solid var(--sap-border)',
                    background: catFilter === c.id ? 'rgba(14,165,233,0.08)' : '#fff',
                    color: catFilter === c.id ? 'var(--sap-accent)' : 'var(--sap-text-muted)',
                    cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                    fontSize: 13, fontWeight: 700, transition: 'all .15s',
                  }}>{c.label}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {filtered.map(p => {
                const sel = platform.id === p.id;
                return (
                  <button key={p.id} onClick={() => setPlatform(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', borderRadius: 10,
                      border: sel ? '1.5px solid var(--sap-accent)' : '1.5px solid var(--sap-border)',
                      background: sel ? 'rgba(14,165,233,0.08)' : '#fff',
                      cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                      fontSize: 12, fontWeight: 700,
                      color: sel ? 'var(--sap-accent)' : 'var(--sap-text-muted)',
                      transition: 'all .15s', textAlign: 'left',
                    }}>
                    <PlatformIcon icon={p.icon} size={18} />
                    <span style={{ flex: 1 }}>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--sap-border)', padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <label style={{ ...labelStyle, marginBottom: 10 }}>{t('bannerTool.background')}</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[{id:'gradient',label:'Gradient'},{id:'solid',label:'Solid'},{id:'image',label:'Image'}].map(m => (
                <button key={m.id} onClick={() => setBgMode(m.id)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8,
                    border: bgMode === m.id ? '1.5px solid var(--sap-accent)' : '1.5px solid var(--sap-border)',
                    background: bgMode === m.id ? 'rgba(14,165,233,0.08)' : '#fff',
                    color: bgMode === m.id ? 'var(--sap-accent)' : 'var(--sap-text-muted)',
                    cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                    fontSize: 12, fontWeight: 700, transition: 'all .15s',
                  }}>{m.label}</button>
              ))}
            </div>

            {bgMode === 'gradient' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {GRADIENTS.map(g => (
                  <button key={g.id} onClick={() => setGradient(g)} title={g.name}
                    style={{
                      aspectRatio: '1', borderRadius: 8,
                      border: gradient.id === g.id ? '2px solid var(--sap-accent)' : '1.5px solid var(--sap-border)',
                      background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                      cursor: 'pointer', transition: 'all .15s',
                    }} />
                ))}
              </div>
            )}
            {bgMode === 'solid' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={solidColor} onChange={e => setSolidColor(e.target.value)}
                  style={{ width: 48, height: 40, padding: 0, borderRadius: 8, border: '1px solid var(--sap-border)', cursor: 'pointer' }} />
                <input type="text" value={solidColor} onChange={e => setSolidColor(e.target.value)} style={inputStyle} />
              </div>
            )}
            {bgMode === 'image' && (
              <div>
                <button onClick={() => fileRef.current?.click()}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 10,
                    border: '1.5px dashed var(--sap-border)', background: 'var(--sap-bg-elevated)',
                    cursor: 'pointer', fontFamily: '"DM Sans",sans-serif',
                    fontSize: 13, fontWeight: 700, color: 'var(--sap-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  <Upload size={16} /> {bgImage ? 'Change image' : 'Upload background image'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={onBgUpload} style={{ display: 'none' }} />
              </div>
            )}
          </div>

          {/* Text */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--sap-border)', padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <label style={{ ...labelStyle, marginBottom: 10 }}>Text</label>

            <div style={{ marginBottom: 12 }}>
              <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Headline</label>
              <input type="text" value={mainText} onChange={e => setMainText(e.target.value)} placeholder={t('bannerTool.headlinePlaceholder')} style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Headline size: {mainSize}</label>
                <input type="range" min={20} max={120} value={mainSize} onChange={e => setMainSize(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--sap-accent)' }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>{t('bannerTool.headlineColour')}</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="color" value={mainColor} onChange={e => setMainColor(e.target.value)}
                    style={{ width: 36, height: 32, padding: 0, borderRadius: 6, border: '1px solid var(--sap-border)', cursor: 'pointer' }} />
                  <input type="text" value={mainColor} onChange={e => setMainColor(e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Subtitle</label>
              <input type="text" value={subText} onChange={e => setSubText(e.target.value)} placeholder={t('bannerTool.subtitlePlaceholder')} style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--sap-accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--sap-border)'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Subtitle size: {subSize}</label>
                <input type="range" min={10} max={60} value={subSize} onChange={e => setSubSize(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--sap-accent)' }} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>{t('bannerTool.subtitleColour')}</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="color" value={subColor} onChange={e => setSubColor(e.target.value)}
                    style={{ width: 36, height: 32, padding: 0, borderRadius: 6, border: '1px solid var(--sap-border)', cursor: 'pointer' }} />
                  <input type="text" value={subColor} onChange={e => setSubColor(e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                </div>
              </div>
            </div>

            <div>
              <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Font</label>
              <select value={mainFont.id} onChange={e => setMainFont(FONTS.find(f => f.id === e.target.value) || FONTS[0])} style={inputStyle}>
                {FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
