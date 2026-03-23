import { useState, useRef, useCallback } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';

var SIZES = [
  { id: '728x90', name: 'Leaderboard', w: 728, h: 90 },
  { id: '300x250', name: 'Medium Rectangle', w: 300, h: 250 },
  { id: '320x50', name: 'Mobile Banner', w: 320, h: 50 },
  { id: '970x250', name: 'Billboard', w: 970, h: 250 },
];

var TEMPLATES = [
  { id: 'bold-gradient', name: 'Bold Gradient', bg: 'linear-gradient(135deg,#667eea,#764ba2)', textColor: '#fff', ctaColor: '#fbbf24', ctaBg: '#fff', ctaText: '#764ba2', style: 'modern' },
  { id: 'dark-pro', name: 'Dark Pro', bg: 'linear-gradient(135deg,#0f172a,#1e293b)', textColor: '#fff', ctaColor: '#38bdf8', ctaBg: '#0ea5e9', ctaText: '#fff', style: 'dark' },
  { id: 'green-energy', name: 'Green Energy', bg: 'linear-gradient(135deg,#059669,#10b981,#34d399)', textColor: '#fff', ctaColor: '#fff', ctaBg: '#fff', ctaText: '#059669', style: 'vibrant' },
  { id: 'sunset-warm', name: 'Sunset Warm', bg: 'linear-gradient(135deg,#f97316,#ef4444,#ec4899)', textColor: '#fff', ctaColor: '#fff', ctaBg: 'rgba(255,255,255,.2)', ctaText: '#fff', style: 'warm' },
  { id: 'ocean-blue', name: 'Ocean Blue', bg: 'linear-gradient(135deg,#0284c7,#0ea5e9,#38bdf8)', textColor: '#fff', ctaColor: '#fbbf24', ctaBg: '#fbbf24', ctaText: '#0c4a6e', style: 'fresh' },
  { id: 'minimal-white', name: 'Minimal White', bg: '#ffffff', textColor: '#0f172a', ctaColor: '#0ea5e9', ctaBg: '#0ea5e9', ctaText: '#fff', style: 'clean', border: '2px solid #e2e8f0' },
  { id: 'royal-purple', name: 'Royal Purple', bg: 'linear-gradient(135deg,#581c87,#7c3aed,#a78bfa)', textColor: '#fff', ctaColor: '#fbbf24', ctaBg: '#fbbf24', ctaText: '#581c87', style: 'premium' },
  { id: 'neon-dark', name: 'Neon Dark', bg: 'linear-gradient(135deg,#09090b,#18181b)', textColor: '#4ade80', ctaColor: '#4ade80', ctaBg: '#4ade80', ctaText: '#09090b', style: 'tech' },
  { id: 'coral-peach', name: 'Coral Peach', bg: 'linear-gradient(135deg,#fb7185,#f472b6,#c084fc)', textColor: '#fff', ctaColor: '#fff', ctaBg: 'rgba(255,255,255,.25)', ctaText: '#fff', style: 'soft' },
  { id: 'gold-luxury', name: 'Gold Luxury', bg: 'linear-gradient(135deg,#78350f,#a16207,#ca8a04)', textColor: '#fff', ctaColor: '#fef3c7', ctaBg: '#fef3c7', ctaText: '#78350f', style: 'luxury' },
];

function BannerCanvas({ template, size, headline, subtitle, ctaLabel, logoUrl, customBg, customTextColor, customCtaBg }) {
  var t = template;
  var s = size;
  var isLeaderboard = s.h <= 90;
  var isMobile = s.id === '320x50';
  var bg = customBg || t.bg;
  var textCol = customTextColor || t.textColor;
  var ctaBgCol = customCtaBg || t.ctaBg;

  var headSize = isMobile ? 14 : isLeaderboard ? 20 : s.id === '970x250' ? 28 : 22;
  var subSize = isMobile ? 10 : isLeaderboard ? 12 : 14;
  var ctaSize = isMobile ? 10 : isLeaderboard ? 11 : 13;
  var pad = isMobile ? '8px 12px' : isLeaderboard ? '12px 24px' : '20px 28px';

  return (
    <div style={{
      width: '100%', maxWidth: s.w, aspectRatio: s.w + '/' + s.h,
      background: bg, borderRadius: 8, overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: isLeaderboard || isMobile ? 'center' : 'flex-end',
      padding: pad, boxSizing: 'border-box',
      border: t.border || 'none',
    }}>
      {/* Decorative circles */}
      {t.style !== 'clean' && (
        <>
          <div style={{ position: 'absolute', top: -20, right: -20, width: s.h * 0.8, height: s.h * 0.8, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: '40%', width: s.h * 0.6, height: s.h * 0.6, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
        </>
      )}

      {/* Logo */}
      {logoUrl && (
        <div style={{ position: 'absolute', top: isMobile ? 6 : 12, left: isMobile ? 8 : 16, zIndex: 2 }}>
          <img src={logoUrl} alt="Logo" style={{ height: isMobile ? 20 : isLeaderboard ? 30 : 40, borderRadius: 4, objectFit: 'contain' }} onError={function(e) { e.target.style.display = 'none'; }} />
        </div>
      )}

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: isLeaderboard || isMobile ? 'flex' : 'block',
        alignItems: 'center', gap: isLeaderboard ? 20 : isMobile ? 10 : 0,
        justifyContent: 'space-between',
        marginLeft: logoUrl ? (isMobile ? 28 : isLeaderboard ? 50 : 0) : 0,
        textAlign: isLeaderboard || isMobile ? 'left' : 'left',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: headSize, fontWeight: 900, color: textCol, lineHeight: 1.2, marginBottom: isLeaderboard || isMobile ? 0 : 6 }}>
            {headline || 'Your Headline Here'}
          </div>
          {subtitle && !isMobile && (
            <div style={{ fontSize: subSize, color: textCol, opacity: 0.8, lineHeight: 1.4, marginBottom: isLeaderboard ? 0 : 12 }}>
              {subtitle}
            </div>
          )}
        </div>
        {ctaLabel && (
          <div style={{
            display: 'inline-block', padding: isMobile ? '4px 10px' : isLeaderboard ? '6px 16px' : '8px 20px',
            borderRadius: 6, background: ctaBgCol, color: t.ctaText || '#fff',
            fontSize: ctaSize, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {ctaLabel}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BannerMaker() {
  var { user } = useAuth();
  var isPro = (user?.membership_tier || 'basic') === 'pro';
  var canvasRef = useRef(null);

  var [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  var [selectedSize, setSelectedSize] = useState(SIZES[0]);
  var [headline, setHeadline] = useState('');
  var [subtitle, setSubtitle] = useState('');
  var [ctaLabel, setCtaLabel] = useState('Learn More');
  var [logoUrl, setLogoUrl] = useState('');
  var [customBg, setCustomBg] = useState('');
  var [customTextColor, setCustomTextColor] = useState('');
  var [customCtaBg, setCustomCtaBg] = useState('');
  var [exporting, setExporting] = useState(false);

  var exportBanner = useCallback(function() {
    var el = canvasRef.current;
    if (!el) return;
    setExporting(true);
    import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.js')
      .then(function(mod) { return mod.default(el, { scale: 2, useCORS: true, backgroundColor: null }); })
      .then(function(canvas) {
        var link = document.createElement('a');
        link.download = 'banner-' + selectedSize.id + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        setExporting(false);
      })
      .catch(function() {
        // Fallback: copy the canvas HTML as instructions
        alert('To save your banner: right-click the preview and select "Save image as..." or take a screenshot.');
        setExporting(false);
      });
  }, [selectedSize]);

  var lS = { display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6 };
  var iS = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: '#fff', outline: 'none', boxSizing: 'border-box' };

  if (!isPro) {
    return (
      <AppLayout title="Banner Maker" subtitle="Design professional banners">
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Banner Maker is a Pro Feature</h2>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
            Design professional banner ads with 10 premium templates, custom colours, and instant download. Upgrade to Pro to unlock the Banner Maker.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, maxWidth: 500, margin: '0 auto 28px' }}>
            {TEMPLATES.slice(0, 5).map(function(t) {
              return <div key={t.id} style={{ height: 40, borderRadius: 6, background: t.bg, border: t.border || 'none', opacity: 0.5 }} />;
            })}
          </div>
          <a href="/upgrade" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 0 #6d28d9,0 6px 16px rgba(139,92,246,.3)' }}>
            Upgrade to Pro — $15
          </a>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Banner Maker" subtitle="Design professional banners with templates">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>

          {/* LEFT — Controls */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, position: 'sticky', top: 90 }}>

            {/* Template picker */}
            <div style={{ marginBottom: 20 }}>
              <label style={lS}>Template</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {TEMPLATES.map(function(t) {
                  var on = selectedTemplate.id === t.id;
                  return (
                    <button key={t.id} onClick={function() { setSelectedTemplate(t); setCustomBg(''); setCustomTextColor(''); setCustomCtaBg(''); }}
                      style={{ height: 36, borderRadius: 6, background: t.bg, border: on ? '3px solid #0ea5e9' : t.border || '2px solid transparent', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all .15s' }}
                      title={t.name}>
                      {on && <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,165,233,.15)' }} />}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, fontWeight: 600 }}>{selectedTemplate.name}</div>
            </div>

            {/* Size */}
            <div style={{ marginBottom: 18 }}>
              <label style={lS}>Banner Size</label>
              <select style={iS} value={selectedSize.id} onChange={function(e) { setSelectedSize(SIZES.find(function(s) { return s.id === e.target.value; }) || SIZES[0]); }}>
                {SIZES.map(function(s) { return <option key={s.id} value={s.id}>{s.name} ({s.id})</option>; })}
              </select>
            </div>

            {/* Text fields */}
            <div style={{ marginBottom: 14 }}>
              <label style={lS}>Headline</label>
              <input style={iS} value={headline} onChange={function(e) { setHeadline(e.target.value); }} placeholder="Your Headline Here" maxLength={60} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lS}>Subtitle (optional)</label>
              <input style={iS} value={subtitle} onChange={function(e) { setSubtitle(e.target.value); }} placeholder="Supporting text" maxLength={80} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lS}>CTA Button Text</label>
              <input style={iS} value={ctaLabel} onChange={function(e) { setCtaLabel(e.target.value); }} placeholder="Learn More" maxLength={30} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={lS}>Logo / Image URL (optional)</label>
              <input style={iS} value={logoUrl} onChange={function(e) { setLogoUrl(e.target.value); }} placeholder="https://..." />
            </div>

            {/* Custom colours */}
            <div style={{ marginBottom: 18, padding: 12, background: '#f8f9fb', borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Customise Colours</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4 }}>Background</div>
                  <input type="color" value={customBg || '#667eea'} onChange={function(e) { setCustomBg(e.target.value); }} style={{ width: '100%', height: 30, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4 }}>Text</div>
                  <input type="color" value={customTextColor || '#ffffff'} onChange={function(e) { setCustomTextColor(e.target.value); }} style={{ width: '100%', height: 30, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4 }}>CTA Button</div>
                  <input type="color" value={customCtaBg || '#fbbf24'} onChange={function(e) { setCustomCtaBg(e.target.value); }} style={{ width: '100%', height: 30, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                </div>
              </div>
              <button onClick={function() { setCustomBg(''); setCustomTextColor(''); setCustomCtaBg(''); }}
                style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Reset to template colours
              </button>
            </div>

            {/* Export */}
            <button onClick={exportBanner} disabled={exporting}
              style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 800, cursor: exporting ? 'default' : 'pointer', fontFamily: 'inherit', background: exporting ? '#94a3b8' : 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', boxShadow: exporting ? 'none' : '0 4px 0 #0369a1,0 6px 16px rgba(14,165,233,.3)' }}>
              {exporting ? 'Generating...' : '💾 Download Banner as PNG'}
            </button>
            <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
              Then upload the image to create your banner ad in the Ad Hub
            </div>
          </div>

          {/* RIGHT — Preview */}
          <div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Live Preview</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 20 }}>{selectedSize.name} — {selectedSize.w}×{selectedSize.h}px</div>

              {/* Actual size preview */}
              <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
                <div ref={canvasRef}>
                  <BannerCanvas
                    template={selectedTemplate} size={selectedSize}
                    headline={headline} subtitle={subtitle} ctaLabel={ctaLabel}
                    logoUrl={logoUrl} customBg={customBg} customTextColor={customTextColor} customCtaBg={customCtaBg}
                  />
                </div>
              </div>
            </div>

            {/* All templates preview */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, marginTop: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>All Templates</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {TEMPLATES.map(function(t) {
                  var on = selectedTemplate.id === t.id;
                  return (
                    <div key={t.id} onClick={function() { setSelectedTemplate(t); setCustomBg(''); setCustomTextColor(''); setCustomCtaBg(''); }}
                      style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: on ? '3px solid #0ea5e9' : '2px solid #e2e8f0', transition: 'all .15s' }}>
                      <BannerCanvas
                        template={t} size={{ id: '728x90', w: 728, h: 90 }}
                        headline={headline || 'Your Headline Here'} subtitle="" ctaLabel={ctaLabel || 'Learn More'}
                        logoUrl="" customBg="" customTextColor="" customCtaBg=""
                      />
                      <div style={{ padding: '8px 12px', background: '#f8f9fb', fontSize: 11, fontWeight: 700, color: on ? '#0ea5e9' : '#64748b' }}>{t.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
