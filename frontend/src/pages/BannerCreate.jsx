import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../utils/api';
import AlShell from '../components/layout/AlShell';

const NAVY = '#0a1f52', RED = '#c8102e', MUTED = '#5a6584', LINE = '#e6ecf5';

const SIZE_GROUPS = [
  { group: 'Horizontal', sizes: [['Leaderboard', 728, 90], ['Billboard', 970, 250], ['Super Leaderboard', 970, 90], ['Full Banner', 468, 60], ['Half Banner', 234, 60]] },
  { group: 'Rectangle & Square', sizes: [['Medium Rectangle', 300, 250], ['Large Rectangle', 336, 280], ['Square', 250, 250], ['Small Square', 200, 200], ['Button', 125, 125]] },
  { group: 'Vertical', sizes: [['Half Page', 300, 600], ['Wide Skyscraper', 160, 600], ['Skyscraper', 120, 600], ['Portrait', 300, 1050]] },
  { group: 'Mobile', sizes: [['Mobile Leaderboard', 320, 50], ['Large Mobile', 320, 100]] },
];

const NETWORK_SIZES = [
  { name: 'Leaderboard', w: 728, h: 90, where: 'Top of every shared page + mobile' },
  { name: 'Medium Rectangle', w: 300, h: 250, where: 'Corners & gutters of shared pages' },
  { name: 'Half Page', w: 300, h: 600, where: 'Sticky side rails of shared pages' },
];

function demoDims(w, h) { // proportional mini-preview, capped
  const maxW = 80, maxH = 70; let dw = w, dh = h;
  const s = Math.min(maxW / w, maxH / h); dw = Math.max(6, Math.round(w * s)); dh = Math.max(5, Math.round(h * s));
  return { width: dw + 'px', height: dh + 'px' };
}

const inp = { width: '100%', padding: '10px 12px', border: '1.5px solid #cdd8ec', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: '#0d1230', boxSizing: 'border-box' };
const lbl = { fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', margin: '14px 0 5px' };
const card = { background: '#fff', border: '1px solid #e3e8f4', borderRadius: 18, padding: '22px 24px', marginBottom: 16 };

export default function BannerCreate() {
  const nav = useNavigate();
  const [sel, setSel] = useState(['Leaderboard', 728, 90]);
  const [mode, setMode] = useState('image');
  const [imageUrl, setImageUrl] = useState('');
  const [flash, setFlash] = useState(false);
  const [dest, setDest] = useState('');
  const [html, setHtml] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [desc, setDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function upload(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    setUploading(true); setMsg('');
    try {
      const fd = new FormData(); fd.append('file', f);
      const res = await fetch('/api/al/banner/upload-image', { method: 'POST', credentials: 'include', body: fd });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error || 'Upload failed'); }
      else { setImageUrl(d.url); setFlash(!!d.flash_flagged); if (d.flash_flagged) setMsg('⚠ This GIF flashes quickly — it\'ll be held for review before going public.'); }
    } catch (er) { setMsg('Upload failed'); }
    setUploading(false);
  }

  async function submit() {
    setBusy(true); setMsg('');
    try {
      const body = { mode, size: sel[1] + 'x' + sel[2], width: sel[1], height: sel[2], title, category, description: desc };
      if (mode === 'html') { body.html_code = html; }
      else { body.image_url = imageUrl; body.destination_url = dest; body.flash_flagged = flash; }
      const r = await apiPost('/api/al/banner/create', body);
      if (r.success) nav('/my-banners');
    } catch (er) { setMsg(er.message || 'Could not create banner'); }
    setBusy(false);
  }

  return (
    <AlShell>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '6px 4px 50px', fontFamily: 'Inter,system-ui,sans-serif', color: '#0d1230' }}>
        <h1 style={{ fontSize: 27, fontWeight: 900, letterSpacing: '-.6px', color: NAVY, margin: '4px 0 4px' }}>Create a Banner Ad</h1>
        <p style={{ fontSize: 13.5, color: MUTED, fontWeight: 500, marginBottom: 18, maxWidth: 540 }}>Runs across the AdvantageLife banner network — the top, corners and side rails of every shared page (showcase, sales, games) — real reach on top of your video campaign.</p>

        {/* Step 1 — size */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: RED }}>Step 1</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 3 }}>Choose a size</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: '#7c3aed', background: 'rgba(124,58,237,.1)', padding: '5px 11px', borderRadius: 8, marginBottom: 12 }}>✨ Every size supports animation — GIF &amp; HTML5</div>
          <div style={{ background: 'linear-gradient(135deg,#0a1f52,#12388f)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '.05em', textTransform: 'uppercase', color: '#9fb8ff', marginBottom: 3 }}>⚡ Network sizes — recommended</div>
            <div style={{ fontSize: 13, color: '#c3cff0', fontWeight: 600, marginBottom: 14 }}>These three rotate across every shared page. Pick one of these for maximum reach — other sizes only show on the Banner Showcase.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }} className="al-bnet">
              {NETWORK_SIZES.map(function (s) {
                const on = sel[0] === s.name && sel[1] === s.w && sel[2] === s.h;
                return (
                  <div key={s.name} onClick={function () { setSel([s.name, s.w, s.h]); }} style={{
                    border: on ? '2px solid #ff2743' : '2px solid rgba(255,255,255,.14)', background: on ? 'rgba(255,39,67,.16)' : 'rgba(255,255,255,.06)',
                    borderRadius: 11, padding: '14px 10px', cursor: 'pointer', textAlign: 'center', color: '#fff',
                  }}>
                    <div style={{ height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={Object.assign({ background: 'linear-gradient(135deg,#ff2743,#c8102e)', borderRadius: 3, display: 'block' }, demoDims(s.w, s.h))} />
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 900 }}>{s.name}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#9fb8ff', margin: '2px 0 5px' }}>{s.w}×{s.h}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: '#c3cff0', lineHeight: 1.3, marginBottom: 8 }}>{s.where}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 900, letterSpacing: '.03em', textTransform: 'uppercase', color: '#2ecc71', background: 'rgba(46,204,113,.14)', border: '1px solid rgba(46,204,113,.35)', borderRadius: 6, padding: '3px 7px' }}>✓ Shows on showcase pages</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.05em', textTransform: 'uppercase', color: '#8a97b8', margin: '4px 0 2px' }}>Other sizes</div>
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, margin: '0 0 4px' }}>These do <b>not</b> appear on shared showcase pages — they show only in the Banner Showcase gallery.</div>
          {SIZE_GROUPS.map(function (grp) {
            return (
              <div key={grp.group}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.05em', textTransform: 'uppercase', color: '#8a97b8', margin: '14px 0 9px' }}>{grp.group}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }} className="al-bsz">
                  {grp.sizes.map(function (s) {
                    const on = sel[0] === s[0];
                    return (
                      <div key={s[0]} onClick={function () { setSel(s); }} style={{
                        border: on ? '1.5px solid ' + RED : '1.5px solid ' + LINE, boxShadow: on ? '0 0 0 1px ' + RED : 'none',
                        background: on ? '#fff5f6' : '#fff', borderRadius: 11, padding: '12px 8px', cursor: 'pointer',
                        textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 7, minHeight: 110,
                      }}>
                        <div style={{ height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={Object.assign({ background: 'linear-gradient(135deg,#12388f,#3b82f6)', borderRadius: 3, display: 'block' }, demoDims(s[1], s[2]))} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: NAVY, lineHeight: 1.15 }}>{s[0]}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#8a97b8' }}>{s[1]}×{s[2]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 2 — content */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: RED }}>Step 2</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 12 }}>Add your banner</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[['image', '🖼️ Upload image'], ['html', '</> Paste HTML / embed code']].map(function (m) {
              const on = mode === m[0];
              return <span key={m[0]} onClick={function () { setMode(m[0]); }} style={{ fontSize: 13, fontWeight: 800, padding: '9px 16px', borderRadius: 10, border: '1.5px solid ' + (on ? NAVY : LINE), background: on ? NAVY : '#fff', color: on ? '#fff' : MUTED, cursor: 'pointer' }}>{m[1]}</span>;
            })}
          </div>
          {mode === 'image' ? (
            <>
              <label style={{ display: 'block', border: '2px dashed #c3d0e8', borderRadius: 12, padding: 24, textAlign: 'center', color: MUTED, fontWeight: 600, fontSize: 13, background: '#f8fafd', cursor: 'pointer' }}>
                {uploading ? 'Uploading…' : imageUrl ? '✓ Image uploaded — choose another to replace' : <>Drop an image or animated GIF, or <b style={{ color: NAVY }}>browse</b> — JPG, PNG, GIF · <b style={{ color: NAVY }}>{sel[1]}×{sel[2]}</b></>}
                <input type="file" accept="image/*" onChange={upload} style={{ display: 'none' }} />
              </label>
              <label style={lbl}>Destination URL (where clicks go)</label>
              <input style={inp} value={dest} onChange={function (e) { setDest(e.target.value); }} placeholder="https://yoursite.com/offer" />
            </>
          ) : (
            <>
              <textarea style={Object.assign({}, inp, { minHeight: 120, fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12 })} value={html} onChange={function (e) { setHtml(e.target.value); }} placeholder="<!-- Paste banner embed code from your ad source here -->" />
              <div style={{ fontSize: 11.5, color: '#8a97b8', fontWeight: 500, marginTop: 6 }}>Runs sandboxed in an isolated frame — it can't touch the rest of the page.</div>
            </>
          )}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#8a5a00', background: '#fff8e8', border: '1px solid #f3e2b8', borderRadius: 9, padding: '10px 12px', marginTop: 12 }}>
            ⚡ Animation &amp; blinking are fine — but avoid rapid strobing (faster than 3 flashes/sec). It's a seizure risk on a public page, so anything faster is auto-flagged for review.
          </div>
        </div>

        {/* Step 3 — details */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase', color: RED }}>Step 3</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 4 }}>Details for the showcase &amp; discovery page</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="al-b2">
            <div><label style={lbl}>Title</label><input style={inp} value={title} onChange={function (e) { setTitle(e.target.value); }} /></div>
            <div><label style={lbl}>Category</label><input style={inp} value={category} onChange={function (e) { setCategory(e.target.value); }} placeholder="e.g. Crypto & Finance" /></div>
          </div>
          <label style={lbl}>Short description (helps it get found)</label>
          <input style={inp} value={desc} onChange={function (e) { setDesc(e.target.value); }} />
        </div>

        {msg ? <div style={{ padding: '11px 14px', background: '#fff4f4', border: '1px solid #f3c9c9', borderRadius: 10, color: '#a01', fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>{msg}</div> : null}

        <div style={card}>
          <button onClick={submit} disabled={busy} style={{ background: RED, color: '#fff', border: 0, borderRadius: 11, padding: '13px 26px', fontSize: 14.5, fontWeight: 900, cursor: 'pointer', width: '100%', opacity: busy ? 0.6 : 1 }}>{busy ? 'Launching…' : 'Launch Banner →'}</button>
        </div>
        <style>{`@media(max-width:760px){.al-bsz{grid-template-columns:repeat(3,1fr) !important}}@media(max-width:480px){.al-bsz{grid-template-columns:1fr 1fr !important}.al-b2{grid-template-columns:1fr !important}}`}</style>
      </div>
    </AlShell>
  );
}
