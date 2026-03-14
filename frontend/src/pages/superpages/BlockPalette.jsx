import { useState } from 'react';
import { PALETTE, BG_PRESETS } from './elementDefaults';
import { Type, Image, Play, MousePointer, MessageSquare, Layout, Music, Code } from 'lucide-react';

const ICONS = {
  heading: '𝐇', text: '≡', label: '▣',
  image: '🖼', video: '▶', audio: '🎵',
  button: '▭', form: '☰', cta: '↗',
  review: '💬', badge: '⭐', testimonial: '★', faq: '?', stat: '▊', progress: '▬',
  countdown: '⏱', socialicons: 'f', icontext: '🚀', separator: '—', logostrip: '▤', spacer: '↕', box: '□', divider: '··', embed: '</>',
};

export default function BlockPalette({ canvasBg, canvasBgImage, setCanvasBg, setCanvasBgImage, markDirty, onAddElement }) {
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [bgType, setBgType] = useState(canvasBg.startsWith('linear') ? 'gradient' : canvasBgImage ? 'image' : 'solid');
  const [grad1, setGrad1] = useState('#ffffff');
  const [grad2, setGrad2] = useState('#1a1a4e');
  const [gradDir, setGradDir] = useState('135deg');
  const [bgImageUrl, setBgImageUrl] = useState(canvasBgImage || '');

  const applyBg = (bg) => { setCanvasBg(bg); markDirty(); };
  const applyBgImage = (url) => { setCanvasBgImage(url); setBgImageUrl(url); markDirty(); };

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('text/plain', type);
  };

  // Get hex display for bg preview
  const bgHex = canvasBg.startsWith('linear') ? 'Gradient' : canvasBgImage ? 'Image' : canvasBg;

  return (
    <div style={{
      width: 230, height: 'calc(100vh - 50px)', background: '#161b30', borderLeft: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Header with BG control */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Sora,sans-serif' }}>✦ Blocks</h3>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Click or drag to add</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <div onClick={() => setShowBgPanel(!showBgPanel)}
            style={{ width: 28, height: 28, borderRadius: 8, border: '2px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: canvasBgImage ? `url(${canvasBgImage}) center/cover` : canvasBg }} />
          <div onClick={() => setShowBgPanel(!showBgPanel)} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>BG</div>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{bgHex.length > 10 ? bgHex.slice(0, 10) : bgHex}</span>
          </div>

          {/* BG Panel dropdown */}
          {showBgPanel && (
            <div style={{
              position: 'absolute', top: 36, right: 0, width: 260, background: '#1e2642',
              borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)',
              zIndex: 20, padding: 14,
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Background Type</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {['solid', 'gradient', 'image'].map(t => (
                  <button key={t} onClick={() => setBgType(t)}
                    style={{
                      flex: 1, padding: 6, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: `1px solid ${bgType === t ? '#0ea5e9' : 'rgba(255,255,255,0.1)'}`,
                      background: bgType === t ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.05)',
                      color: bgType === t ? '#0ea5e9' : 'rgba(255,255,255,0.5)',
                    }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Solid */}
              {bgType === 'solid' && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Colour</div>
                  <input type="color" value={canvasBg.startsWith('#') ? canvasBg : '#ffffff'}
                    onChange={e => applyBg(e.target.value)}
                    style={{ width: '100%', height: 32, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
                </div>
              )}

              {/* Gradient */}
              {bgType === 'gradient' && (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>From</div>
                      <input type="color" value={grad1} onChange={e => { setGrad1(e.target.value); applyBg(`linear-gradient(${gradDir},${e.target.value},${grad2})`); }}
                        style={{ width: '100%', height: 28, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>To</div>
                      <input type="color" value={grad2} onChange={e => { setGrad2(e.target.value); applyBg(`linear-gradient(${gradDir},${grad1},${e.target.value})`); }}
                        style={{ width: '100%', height: 28, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>Direction</div>
                  <select value={gradDir} onChange={e => { setGradDir(e.target.value); applyBg(`linear-gradient(${e.target.value},${grad1},${grad2})`); }}
                    style={{ width: '100%', padding: 6, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11, color: '#e2e8f0', outline: 'none', background: 'rgba(255,255,255,0.05)' }}>
                    <option value="180deg">↓ Top to Bottom</option>
                    <option value="135deg">↘ Diagonal</option>
                    <option value="90deg">→ Left to Right</option>
                    <option value="45deg">↗ Diagonal Up</option>
                    <option value="0deg">↑ Bottom to Top</option>
                  </select>
                </div>
              )}

              {/* Image */}
              {bgType === 'image' && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Image URL</div>
                  <input type="text" value={bgImageUrl} onChange={e => setBgImageUrl(e.target.value)}
                    onBlur={() => { if (bgImageUrl) applyBgImage(bgImageUrl); }}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11, color: '#e2e8f0', outline: 'none', background: 'rgba(255,255,255,0.05)', marginBottom: 8, fontFamily: 'DM Sans,sans-serif' }} />
                  {canvasBgImage && (
                    <button onClick={() => { setCanvasBgImage(''); setBgImageUrl(''); markDirty(); }}
                      style={{ width: '100%', padding: 6, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                      Remove Image
                    </button>
                  )}
                </div>
              )}

              {/* Presets */}
              <div style={{ fontSize: 10, fontWeight: 700, color: '#8892a8', margin: '10px 0 6px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Presets</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4 }}>
                {BG_PRESETS.map((p, i) => (
                  <div key={i} onClick={() => {
                    if (p.startsWith('linear')) { setBgType('gradient'); applyBg(p); }
                    else { setBgType('solid'); applyBg(p); }
                    setShowBgPanel(false);
                  }}
                    style={{ width: '100%', aspectRatio: '1', borderRadius: 6, cursor: 'pointer', background: p, border: '1px solid rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Block list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
        {PALETTE.map((cat, ci) => (
          <div key={ci}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '.8px', padding: '10px 0 6px' }}>{cat.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {cat.items.map((item, ii) => (
                <div key={ii}
                  onClick={() => onAddElement(item.type)}
                  draggable
                  onDragStart={e => handleDragStart(e, item.type)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(14,165,233,0.08)'; e.currentTarget.style.borderColor = 'rgba(14,165,233,0.15)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                >
                  <span style={{ fontSize: 14, color: item.color, opacity: 0.8 }}>{ICONS[item.type] || '□'}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
