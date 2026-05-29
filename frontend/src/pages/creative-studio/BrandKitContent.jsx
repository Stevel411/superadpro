import { useState, useEffect, useRef } from 'react';

// ── Brand Kit — member sets the branding applied to Creative Studio output ──
// Wired to: GET /api/superscene/brand-kit, POST /api/superscene/brand-kit,
// POST /api/superscene/brand-kit/logo (multipart). Reusable platform-wide.

const FONTS = ['Sora', 'DM Sans', 'Inter', 'Montserrat', 'Poppins', 'Roboto', 'Lato', 'Open Sans'];

const DEFAULTS = {
  business_name: '', logo_url: null,
  primary_color: '#0a1438', accent_color: '#06b6d4',
  heading_font: 'Sora', body_font: 'DM Sans',
  cta_text: '', cta_url: '',
  show_intro: true, show_outro: true, show_logo_bug: true, captions: true,
};

export function BrandKitContent() {
  const [kit, setKit] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    fetch('/api/superscene/brand-kit')
      .then(r => r.json())
      .then(d => { setKit({ ...DEFAULTS, ...d }); setLoading(false); })
      .catch(() => { setError('Could not load your brand kit.'); setLoading(false); });
  }, []);

  const set = (k, v) => { setKit(p => ({ ...p, [k]: v })); setSaved(false); };

  async function uploadLogo(file) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setError('Logo too large (max 4MB).'); return; }
    setError(''); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/superscene/brand-kit/logo', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Logo upload failed');
      set('logo_url', d.url);
    } catch (e) { setError(e.message); }
    setUploading(false);
  }

  async function save() {
    setError(''); setSaving(true);
    try {
      const res = await fetch('/api/superscene/brand-kit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(kit),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || d.error || 'Save failed');
      setSaved(true);
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  if (loading) return <div className="bk"><div className="bk-loading">Loading your brand kit…</div></div>;

  const grad = `linear-gradient(135deg, ${kit.primary_color}, #1e3a8a 70%, ${kit.accent_color})`;

  return (
    <div className="bk">
      <style>{CSS}</style>

      <div className="bk-head">
        <h2>Brand Kit</h2>
        <p>Set this once and every video, poster and asset you create comes out as <b>your</b> brand — logo, colours, fonts and call-to-action applied automatically.</p>
      </div>

      <div className="bk-grid">
        {/* ── Editor ── */}
        <div className="bk-card">
          <label className="bk-grp">Logo</label>
          <div className="bk-logo-row">
            <div className="bk-logo-prev" style={{ background: kit.logo_url ? '#0a1438' : 'transparent' }}>
              {kit.logo_url
                ? <img src={kit.logo_url} alt="logo" />
                : <span className="bk-logo-empty">No logo</span>}
            </div>
            <div>
              <button className="bk-btn" disabled={uploading} onClick={() => fileRef.current && fileRef.current.click()}>
                {uploading ? 'Uploading…' : (kit.logo_url ? 'Replace logo' : 'Upload logo')}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                     style={{ display: 'none' }} onChange={e => uploadLogo(e.target.files && e.target.files[0])} />
              <div className="bk-hint">PNG, JPEG, WebP or SVG · max 4MB · a transparent PNG works best</div>
            </div>
          </div>

          <label className="bk-grp">Business name</label>
          <input value={kit.business_name} onChange={e => set('business_name', e.target.value)}
                 placeholder="Your business or brand name" maxLength={120} />

          <div className="bk-two">
            <div>
              <label className="bk-grp">Primary colour</label>
              <div className="bk-colour">
                <input type="color" value={hexOr(kit.primary_color, '#0a1438')} onChange={e => set('primary_color', e.target.value)} />
                <input className="bk-hex" value={kit.primary_color} onChange={e => set('primary_color', e.target.value)} maxLength={9} />
              </div>
            </div>
            <div>
              <label className="bk-grp">Accent colour</label>
              <div className="bk-colour">
                <input type="color" value={hexOr(kit.accent_color, '#06b6d4')} onChange={e => set('accent_color', e.target.value)} />
                <input className="bk-hex" value={kit.accent_color} onChange={e => set('accent_color', e.target.value)} maxLength={9} />
              </div>
            </div>
          </div>

          <div className="bk-two">
            <div>
              <label className="bk-grp">Heading font</label>
              <select value={kit.heading_font} onChange={e => set('heading_font', e.target.value)}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="bk-grp">Body font</label>
              <select value={kit.body_font} onChange={e => set('body_font', e.target.value)}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <label className="bk-grp">Call to action</label>
          <input value={kit.cta_text} onChange={e => set('cta_text', e.target.value)}
                 placeholder="e.g. Start your free trial today" maxLength={120} />
          <input style={{ marginTop: 8 }} value={kit.cta_url} onChange={e => set('cta_url', e.target.value)}
                 placeholder="e.g. www.yourbusiness.com" maxLength={300} />

          <label className="bk-grp">Apply to videos</label>
          <div className="bk-toggles">
            {[['show_intro', 'Intro card'], ['show_outro', 'End card (CTA)'], ['show_logo_bug', 'Logo on every scene'], ['captions', 'Captions']].map(([k, lab]) => (
              <label key={k} className={'bk-toggle' + (kit[k] ? ' on' : '')} onClick={() => set(k, !kit[k])}>
                <span className="bk-check">{kit[k] ? '✓' : ''}</span>{lab}
              </label>
            ))}
          </div>

          {error && <div className="bk-err">{error}</div>}

          <div className="bk-save-row">
            <button className="bk-btn primary" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save brand kit'}
            </button>
            {saved && <span className="bk-saved">✓ Saved — this applies to your next video</span>}
          </div>
        </div>

        {/* ── Live preview ── */}
        <div className="bk-preview">
          <label className="bk-grp">Preview</label>
          <div className="bk-frame" style={{ background: grad }}>
            <div className="bk-frame-bug">
              {kit.logo_url && <img src={kit.logo_url} alt="" />}
            </div>
            <div className="bk-frame-mid">
              {kit.logo_url && <img className="bk-frame-logo" src={kit.logo_url} alt="" />}
              <div className="bk-frame-title" style={{ fontFamily: `'${kit.heading_font}', sans-serif` }}>
                {kit.business_name || 'Your Business'}
              </div>
            </div>
          </div>
          <div className="bk-frame bk-frame-end" style={{ background: grad, marginTop: 10 }}>
            <div className="bk-frame-mid">
              {kit.logo_url && <img className="bk-frame-logo sm" src={kit.logo_url} alt="" />}
              <div className="bk-frame-cta" style={{ fontFamily: `'${kit.heading_font}', sans-serif` }}>
                {kit.cta_text || 'Your call to action'}
              </div>
              <div className="bk-frame-url" style={{ color: kit.accent_color, fontFamily: `'${kit.body_font}', sans-serif` }}>
                {kit.cta_url || 'www.yourbusiness.com'}
              </div>
            </div>
          </div>
          <div className="bk-prev-note">This is how your intro and end cards will look on every explainer video.</div>
        </div>
      </div>
    </div>
  );
}

function hexOr(v, d) { return /^#[0-9a-fA-F]{6}$/.test(v || '') ? v : d; }

const CSS = `
.bk{ --co:#0a1438; --co2:#1e3a8a; --cy:#06b6d4; --cyd:#0e7490; --ink:#0a1438; --inks:#26345c;
  --mut:#64739a; --faint:#94a0c0; --line:#e4e9f4; --soft:#eef1f8;
  font-family:'DM Sans',sans-serif; color:var(--ink); max-width:1000px; margin:0 auto; }
.bk-loading{ padding:60px; text-align:center; color:var(--mut); font-weight:600; }
.bk-head h2{ font-family:'Sora',sans-serif; margin:0 0 2px; font-size:24px; font-weight:700; letter-spacing:-.5px; }
.bk-head p{ margin:0 0 22px; color:var(--mut); font-size:14px; max-width:640px; }
.bk-grid{ display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:22px; align-items:start; }
.bk-card,.bk-preview{ background:#fff; border:1px solid var(--line); border-radius:16px; box-shadow:0 8px 24px rgba(10,20,56,.06); padding:22px 24px; }
.bk-preview{ position:sticky; top:20px; }
.bk-grp{ display:block; font-family:'Sora',sans-serif; font-size:12px; font-weight:600; color:var(--inks); margin:18px 0 8px; text-transform:uppercase; letter-spacing:.6px; }
.bk-card .bk-grp:first-child,.bk-preview .bk-grp:first-child{ margin-top:0; }
.bk input,.bk select{ font-family:'DM Sans'; font-size:14px; color:var(--ink); border:1px solid var(--line); border-radius:10px; background:#fff; padding:10px 12px; width:100%; }
.bk input:focus,.bk select:focus{ outline:none; border-color:var(--cy); box-shadow:0 0 0 3px rgba(6,182,212,.14); }
.bk-two{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.bk-logo-row{ display:flex; gap:16px; align-items:center; }
.bk-logo-prev{ width:96px; height:64px; border:1px solid var(--line); border-radius:10px; display:flex; align-items:center; justify-content:center; overflow:hidden; flex:0 0 auto; }
.bk-logo-prev img{ max-width:88%; max-height:80%; object-fit:contain; }
.bk-logo-empty{ font-size:11px; color:var(--faint); }
.bk-hint{ font-size:11.5px; color:var(--faint); margin-top:7px; }
.bk-colour{ display:flex; gap:8px; align-items:center; }
.bk-colour input[type=color]{ width:42px; height:40px; padding:2px; border-radius:9px; cursor:pointer; flex:0 0 auto; }
.bk-hex{ font-family:'JetBrains Mono',monospace; font-size:13px; }
.bk-toggles{ display:grid; grid-template-columns:1fr 1fr; gap:9px; }
.bk-toggle{ display:flex; align-items:center; gap:9px; padding:10px 12px; border:1px solid var(--line); border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:600; color:var(--inks); transition:.12s; }
.bk-toggle.on{ border-color:var(--cy); background:rgba(6,182,212,.05); }
.bk-check{ width:18px; height:18px; border-radius:5px; border:1.5px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:12px; color:#fff; flex:0 0 auto; }
.bk-toggle.on .bk-check{ background:var(--cy); border-color:var(--cy); }
.bk-btn{ font-family:'DM Sans'; font-weight:600; font-size:13.5px; border-radius:10px; padding:10px 18px; cursor:pointer; border:1px solid var(--line); background:#fff; color:var(--inks); }
.bk-btn:disabled{ opacity:.55; cursor:default; }
.bk-btn.primary{ border:0; color:#fff; background:linear-gradient(135deg,var(--co2),var(--cyd)); box-shadow:0 6px 18px rgba(14,116,144,.26); }
.bk-save-row{ display:flex; align-items:center; gap:14px; margin-top:22px; }
.bk-saved{ font-size:13px; color:#0e9f6e; font-weight:600; }
.bk-err{ margin-top:16px; padding:11px 14px; border-radius:10px; background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; font-size:13px; font-weight:500; }
.bk-frame{ position:relative; border-radius:12px; overflow:hidden; aspect-ratio:16/9; display:flex; align-items:center; justify-content:center; }
.bk-frame-bug{ position:absolute; top:8px; right:10px; height:18px; }
.bk-frame-bug img{ height:100%; object-fit:contain; }
.bk-frame-mid{ text-align:center; padding:10px; }
.bk-frame-logo{ max-height:42px; max-width:60%; object-fit:contain; margin-bottom:10px; }
.bk-frame-logo.sm{ max-height:30px; margin-bottom:8px; }
.bk-frame-title{ color:#fff; font-weight:700; font-size:18px; }
.bk-frame-cta{ color:#fff; font-weight:600; font-size:14px; }
.bk-frame-url{ font-size:11px; margin-top:5px; font-family:'JetBrains Mono',monospace; }
.bk-prev-note{ font-size:11.5px; color:var(--faint); margin-top:10px; line-height:1.4; }
@media(max-width:860px){ .bk-grid{ grid-template-columns:1fr; } .bk-preview{ position:static; } }
`;

export default BrandKitContent;
