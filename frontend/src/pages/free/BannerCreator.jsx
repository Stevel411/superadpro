import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════
   SuperAdPro — Social Media Banner & Profile Creator
   Pick platform → customise text/bg → download PNG
   Brand-colour SVG logos, canvas-based rendering
   ═══════════════════════════════════════════════════════════ */

// ── Platform definitions with SVG icons ──────────────────
const PLATFORMS = [
  // Banners
  { id: 'yt-thumb', name: 'YouTube Thumbnail', w: 1280, h: 720, cat: 'banner', color: '#FF0000', icon: 'youtube' },
  { id: 'ig-post', name: 'Instagram Post', w: 1080, h: 1080, cat: 'banner', color: '#E4405F', icon: 'instagram' },
  { id: 'ig-story', name: 'Story / Reels / TikTok', w: 1080, h: 1920, cat: 'banner', color: '#EE1D52', icon: 'tiktok' },
  { id: 'fb-cover', name: 'Facebook Cover', w: 820, h: 312, cat: 'banner', color: '#1877F2', icon: 'facebook' },
  { id: 'x-header', name: 'X / Twitter Header', w: 1500, h: 500, cat: 'banner', color: '#000000', icon: 'x' },
  { id: 'li-banner', name: 'LinkedIn Banner', w: 1584, h: 396, cat: 'banner', color: '#0A66C2', icon: 'linkedin' },
  { id: 'yt-banner', name: 'YouTube Banner', w: 2560, h: 1440, cat: 'banner', color: '#FF0000', icon: 'youtube' },
  { id: 'pin', name: 'Pinterest Pin', w: 1000, h: 1500, cat: 'banner', color: '#BD081C', icon: 'pinterest' },
  // Profiles
  { id: 'yt-profile', name: 'YouTube Profile', w: 800, h: 800, cat: 'profile', color: '#FF0000', icon: 'youtube' },
  { id: 'ig-profile', name: 'Instagram Profile', w: 320, h: 320, cat: 'profile', color: '#E4405F', icon: 'instagram' },
  { id: 'fb-profile', name: 'Facebook Profile', w: 170, h: 170, cat: 'profile', color: '#1877F2', icon: 'facebook' },
  { id: 'x-profile', name: 'X / Twitter Profile', w: 400, h: 400, cat: 'profile', color: '#000000', icon: 'x' },
  { id: 'li-profile', name: 'LinkedIn Profile', w: 400, h: 400, cat: 'profile', color: '#0A66C2', icon: 'linkedin' },
  { id: 'tt-profile', name: 'TikTok Profile', w: 200, h: 200, cat: 'profile', color: '#010101', icon: 'tiktok' },
];

const GRADIENTS = [
  { id: 'g1', from: '#1a0533', to: '#0f172a', name: 'Midnight' },
  { id: 'g2', from: '#0ea5e9', to: '#6366f1', name: 'Ocean' },
  { id: 'g3', from: '#f59e0b', to: '#ef4444', name: 'Sunset' },
  { id: 'g4', from: '#10b981', to: '#0ea5e9', name: 'Teal' },
  { id: 'g5', from: '#ec4899', to: '#8b5cf6', name: 'Pink' },
  { id: 'g6', from: '#1e293b', to: '#334155', name: 'Slate' },
  { id: 'g7', from: '#0f172a', to: '#1e3a5f', name: 'Navy' },
  { id: 'g8', from: '#7c3aed', to: '#2563eb', name: 'Indigo' },
  { id: 'g9', from: '#dc2626', to: '#f97316', name: 'Fire' },
  { id: 'g10', from: '#ffffff', to: '#f1f5f9', name: 'White' },
];

const FONTS = [
  { id: 'impact', name: 'Impact', family: 'Impact, sans-serif' },
  { id: 'arial', name: 'Arial Black', family: '"Arial Black", sans-serif' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia, serif' },
  { id: 'verdana', name: 'Verdana', family: 'Verdana, sans-serif' },
  { id: 'trebuchet', name: 'Trebuchet', family: '"Trebuchet MS", sans-serif' },
  { id: 'courier', name: 'Courier', family: '"Courier New", monospace' },
];

// SVG Icon components
const PlatformIcon = ({ icon, size = 20 }) => {
  const s = size;
  switch (icon) {
    case 'youtube': return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect x="1" y="5" width="22" height="14" rx="4" fill="#FF0000"/>
        <polygon points="10,8.5 10,15.5 16,12" fill="#fff"/>
      </svg>
    );
    case 'instagram': return (
      <svg width={s} height={s} viewBox="0 0 24 24">
        <defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#FFDC80"/><stop offset="25%" stopColor="#F77737"/><stop offset="50%" stopColor="#E4405F"/><stop offset="75%" stopColor="#C32AA3"/><stop offset="100%" stopColor="#5B51D8"/></linearGradient></defs>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig)"/>
        <circle cx="12" cy="12" r="4.5" fill="none" stroke="#fff" strokeWidth="1.8"/>
        <circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/>
      </svg>
    );
    case 'facebook': return (
      <svg width={s} height={s} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#1877F2"/>
        <path d="M16.5 14.5l.5-3.5h-3v-2c0-1 .5-1.8 1.8-1.8H17V4.3S15.8 4 14.7 4C12.2 4 10.6 5.7 10.6 8.5V11H8v3.5h2.6V22h3.4v-7.5h2.5z" fill="#fff"/>
      </svg>
    );
    case 'x': return (
      <svg width={s} height={s} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#000"/>
        <path d="M13.8 10.5L18.2 5.5H17L13.2 9.8L10.2 5.5H6L10.7 12.8L6 18.2H7.3L11.3 13.5L14.5 18.2H18.6L13.8 10.5ZM8 6.8H9.5L16.6 17H15.1L8 6.8Z" fill="#fff"/>
      </svg>
    );
    case 'linkedin': return (
      <svg width={s} height={s} viewBox="0 0 24 24">
        <rect x="1" y="1" width="22" height="22" rx="3" fill="#0A66C2"/>
        <path d="M7 10v7H9.5V10H7ZM8.2 6C7.4 6 6.8 6.6 6.8 7.3S7.4 8.5 8.2 8.5 9.5 8 9.5 7.3 9 6 8.2 6ZM16.5 10c-1.5 0-2.2.8-2.5 1.3V10H11.5v7H14v-3.8c0-1 .5-1.7 1.4-1.7s1.2.6 1.2 1.6V17H19v-4.2C19 11 17.8 10 16.5 10z" fill="#fff"/>
      </svg>
    );
    case 'tiktok': return (
      <svg width={s} height={s} viewBox="0 0 24 24">
        <rect x="1" y="1" width="22" height="22" rx="5" fill="#010101"/>
        <path d="M16.5 6.5c-.7-.8-1-1.7-1-2.5H13v11c0 1.4-1.1 2.5-2.5 2.5S8 16.4 8 15s1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1V10c-.3 0-.5-.1-.8-.1C8 10 6 12 6 15s2.5 5 5 5 4.5-2.2 4.5-5V10c.8.6 1.8 1 3 1V8.5c-.8 0-1.5-.5-2-1z" fill="#fff"/>
        <path d="M16.5 6.5c-.7-.8-1-1.7-1-2.5H13v11c0 1.4-1.1 2.5-2.5 2.5" fill="none" stroke="#69C9D0" strokeWidth=".6" strokeLinecap="round" opacity=".7"/>
        <path d="M8 15c0-1.4 1.1-2.5 2.5-2.5" fill="none" stroke="#EE1D52" strokeWidth=".6" strokeLinecap="round" opacity=".7"/>
      </svg>
    );
    case 'pinterest': return (
      <svg width={s} height={s} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#BD081C"/>
        <path d="M12 5C8.7 5 6 7.5 6 10.8c0 1.8 1 3.5 2.6 4.3 0-.4.1-.9.2-1.3l.7-2.7s-.2-.3-.2-.8c0-1 .5-1.7 1.2-1.7.6 0 .9.4.9.9 0 .6-.4 1.4-.6 2.2-.2.7.3 1.3 1 1.3 1.3 0 2.2-1.6 2.2-3.5 0-1.4-1-2.5-2.8-2.5-2.1 0-3.3 1.5-3.3 3.2 0 .6.2 1 .4 1.3.1.1.1.2.1.3l-.1.6c0 .1-.1.2-.3.1-.9-.4-1.3-1.5-1.3-2.7 0-2 1.7-4.4 5-4.4 2.7 0 4.4 1.9 4.4 4 0 2.7-1.5 4.7-3.7 4.7-.7 0-1.4-.4-1.6-.8l-.5 1.7c-.1.5-.4 1-.7 1.4.6.2 1.2.3 1.8.3 3.3 0 6-2.7 6-6S15.3 5 12 5z" fill="#fff"/>
      </svg>
    );
    default: return null;
  }
};

const inp = { width: '100%', padding: '10px 14px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 10, fontSize: 14, color: '#fff', fontFamily: '"DM Sans",sans-serif', boxSizing: 'border-box', outline: 'none', transition: 'border-color .2s' };

export default function BannerCreator() {
  useEffect(() => {
    document.title = 'Free Social Media Banner & Profile Creator | SuperAdPro';
    const meta = document.querySelector('meta[name="description"]') || document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Create free social media banners and profile pictures for YouTube, Instagram, Facebook, TikTok, X/Twitter, LinkedIn, and Pinterest. Exact platform dimensions, custom backgrounds, text styling. Download as PNG.';
    if (!meta.parentNode) document.head.appendChild(meta);
    return () => { document.title = 'SuperAdPro'; };
  }, []);

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

  // ── Draw canvas ────────────────────────────────────────
  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const cx = cv.getContext('2d');
    const W = platform.w, H = platform.h;
    cv.width = W; cv.height = H;

    // Background
    if (bgMode === 'image' && bgImage) {
      const img = new Image(); img.src = bgImage;
      img.onload = () => {
        cx.drawImage(img, 0, 0, W, H);
        drawText(cx, W, H);
      };
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
  }, [platform, bgMode, gradient, solidColor, bgImage, mainText, mainSize, mainColor, mainFont, subText, subSize, subColor]);

  const drawText = (cx, W, H) => {
    const scale = Math.min(W, H) / 500;

    // Main text
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

    // Subtitle
    if (subText) {
      const ss = Math.round(subSize * scale);
      cx.font = `700 ${ss}px ${mainFont.family}`;
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillStyle = subColor;
      cx.fillText(subText, W / 2, H * 0.62);
    }

  };

  useEffect(() => { draw(); }, [draw]);

  // ── Actions ────────────────────────────────────────────
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
  const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8e98' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', fontFamily: '"DM Sans","Rethink Sans",sans-serif', color: '#f0f2f8', display: 'flex', flexDirection: 'column' }}>
      {/* Background image + overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img src="/static/images/explore-bg2.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(3,7,18,0.85) 0%,rgba(3,7,18,0.75) 30%,rgba(3,7,18,0.8) 60%,rgba(3,7,18,0.95) 100%)' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', height: 80, background: 'rgba(10,18,40,0.95)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,180,216,0.12)', flexShrink: 0, position: 'relative' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <svg style={{ width: 28, height: 28 }} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#0ea5e9"/><path d="M13 10.5L22 16L13 21.5V10.5Z" fill="white"/></svg>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, color: '#fff' }}>SuperAd<span style={{ color: '#38bdf8' }}>Pro</span></span>
        </Link>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, color: '#fff' }}>Social Media Creator</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.4)', borderRadius: 20, padding: '4px 14px', letterSpacing: 1.5 }}>FREE</span>
        </div>
        <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontSize: 15, fontWeight: 600, padding: '10px 24px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 2px 12px rgba(14,165,233,0.25)' }}>Get started free</Link>
      </nav>

      {/* WORKSPACE 50/50 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* LEFT: Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 20px 14px', borderRight: '1px solid rgba(0,180,216,0.06)', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', maxHeight: 'calc(100vh - 300px)' }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, display: 'block', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }} />
          </div>

          <div style={{ textAlign: 'center', padding: '6px 0 0', fontSize: 11, color: '#7b8594' }}>
            {platform.name} — {platform.w} × {platform.h}px
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '10px 0', flexShrink: 0 }}>
            <button onClick={dlPNG} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(0,212,255,0.2)' }}>Download PNG</button>
            <button onClick={reset} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'rgba(255,255,255,.05)', color: 'rgba(200,220,255,.6)', fontWeight: 600, fontSize: 13, border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer', fontFamily: 'inherit' }}>Reset</button>
          </div>

          <div style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(0,180,216,0.1)', borderRadius: 12, padding: '12px 16px', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Create stunning content for free</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(200,220,255,.35)', flex: 1 }}>AI video, music & voiceover — all in one platform.</span>
              <Link to="/register" style={{ background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 11, padding: '7px 14px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}>Learn more</Link>
            </div>
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#0a1220', overflow: 'auto', padding: '16px 18px 14px' }}>

          {/* Platform picker */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Choose platform</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button onClick={() => setCatFilter('banner')} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 11, fontWeight: catFilter === 'banner' ? 700 : 600, background: catFilter === 'banner' ? '#0ea5e9' : '#1b2030', color: catFilter === 'banner' ? '#fff' : '#7b8594', borderWidth: 1, borderStyle: 'solid', borderColor: catFilter === 'banner' ? '#0ea5e9' : '#2a3040' }}>Banners & Posts</button>
            <button onClick={() => setCatFilter('profile')} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 11, fontWeight: catFilter === 'profile' ? 700 : 600, background: catFilter === 'profile' ? '#0ea5e9' : '#1b2030', color: catFilter === 'profile' ? '#fff' : '#7b8594', borderWidth: 1, borderStyle: 'solid', borderColor: catFilter === 'profile' ? '#0ea5e9' : '#2a3040' }}>Profile Pictures</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14, maxHeight: 200, overflow: 'auto' }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => setPlatform(p)}
                style={{
                  padding: '8px 10px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .15s',
                  background: platform.id === p.id ? `${p.color}18` : '#1b2030',
                  border: `1.5px solid ${platform.id === p.id ? p.color : '#2a3040'}`,
                }}>
                <PlatformIcon icon={p.icon} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: platform.id === p.id ? '#fff' : '#c5cad1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: '#7b8594' }}>{p.w} × {p.h}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Background */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Background</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {['gradient', 'solid', 'image'].map(m => (
              <button key={m} onClick={() => setBgMode(m)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: '"DM Sans",sans-serif', fontSize: 11, textTransform: 'capitalize', fontWeight: bgMode === m ? 700 : 600, background: bgMode === m ? '#0ea5e9' : '#1b2030', color: bgMode === m ? '#fff' : '#7b8594', borderWidth: 1, borderStyle: 'solid', borderColor: bgMode === m ? '#0ea5e9' : '#2a3040' }}>{m}</button>
            ))}
          </div>

          {bgMode === 'gradient' && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
              {GRADIENTS.map(g => (
                <div key={g.id} onClick={() => setGradient(g)}
                  style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(135deg, ${g.from}, ${g.to})`, cursor: 'pointer', border: gradient.id === g.id ? '2px solid #0ea5e9' : '2px solid transparent', transition: 'border-color .15s' }}
                  title={g.name} />
              ))}
            </div>
          )}
          {bgMode === 'solid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 10, marginBottom: 14 }}>
              <input type="color" value={solidColor} onChange={e => setSolidColor(e.target.value)} style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0, background: 'none' }} />
              <span style={{ fontSize: 12, color: '#c5cad1' }}>{solidColor.toUpperCase()}</span>
            </div>
          )}
          {bgMode === 'image' && (
            <div style={{ marginBottom: 14 }}>
              <input ref={fileRef} type="file" accept="image/*" onChange={onBgUpload} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: '#1b2030', border: '1px solid #2a3040', color: '#c5cad1', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans",sans-serif' }}>
                {bgImage ? 'Change image' : 'Upload background image'}
              </button>
            </div>
          )}

          {/* Main text */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Main text</div>
          <input type="text" value={mainText} onChange={e => setMainText(e.target.value)} placeholder="Your headline..." style={{ ...inp, marginBottom: 8 }}
            onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#2a3040'} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 3, fontWeight: 600 }}>Size <span style={{ color: '#fff', fontWeight: 700 }}>{mainSize}</span></div>
              <input type="range" min="16" max="80" value={mainSize} onChange={e => setMainSize(+e.target.value)} style={{ width: '100%', accentColor: '#0ea5e9' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 3, fontWeight: 600 }}>Colour</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 8 }}>
                <input type="color" value={mainColor} onChange={e => setMainColor(e.target.value)} style={{ width: 20, height: 20, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0, background: 'none' }} />
                <span style={{ fontSize: 10, color: '#c5cad1' }}>{mainColor}</span>
              </div>
            </div>
          </div>

          {/* Font */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 3, fontWeight: 600 }}>Font</div>
            <select value={mainFont.id} onChange={e => setMainFont(FONTS.find(f => f.id === e.target.value))}
              style={{ width: '100%', padding: '9px 30px 9px 12px', borderRadius: 10, border: '1px solid #2a3040', background: '#1b2030', color: '#fff', fontSize: 12, fontFamily: '"DM Sans",sans-serif', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', backgroundImage: chevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', outline: 'none' }}>
              {FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,220,255,.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Subtitle</div>
          <input type="text" value={subText} onChange={e => setSubText(e.target.value)} placeholder="Subtitle..." style={{ ...inp, marginBottom: 8 }}
            onFocus={e => e.target.style.borderColor = '#0ea5e9'} onBlur={e => e.target.style.borderColor = '#2a3040'} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 3, fontWeight: 600 }}>Size <span style={{ color: '#fff', fontWeight: 700 }}>{subSize}</span></div>
              <input type="range" min="8" max="48" value={subSize} onChange={e => setSubSize(+e.target.value)} style={{ width: '100%', accentColor: '#0ea5e9' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#7b8594', marginBottom: 3, fontWeight: 600 }}>Colour</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#1b2030', border: '1px solid #2a3040', borderRadius: 8 }}>
                <input type="color" value={subColor} onChange={e => setSubColor(e.target.value)} style={{ width: 20, height: 20, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0, background: 'none' }} />
                <span style={{ fontSize: 10, color: '#c5cad1' }}>{subColor}</span>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div style={{ padding: '8px 14px', background: 'rgba(14,165,233,0.03)', borderTop: '1px solid rgba(0,180,216,0.06)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', flex: 1 }}>Earn money online with SuperAdPro</span>
            <Link to="/earn" style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', textDecoration: 'none' }}>See how →</Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
