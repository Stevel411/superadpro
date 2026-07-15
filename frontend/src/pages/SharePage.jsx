import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';

/* ────────────────────────────────────────────────────────────────
   PUBLIC share page (/w/:token) — Phase 1.
   The first non-gated campaign surface: strangers land here from a
   member's social post. Deliberately NOT the member chrome — it must
   read as a legitimate public video site, not a members' area.

   The CTA is visible IMMEDIATELY (no 30s lock). The lock on the closed
   loop is anti-skip for members being paid to watch; a stranger isn't
   paid and will simply leave. A pre-30s click still doesn't count as a
   view — but the advertiser gets the click, which is worth more.
   ──────────────────────────────────────────────────────────────── */

const NAVY = '#0a1f52', RED = '#c8102e', MUTED = '#5a6584', LINE = '#e6ecf5';
const THUMBS = [
  'linear-gradient(135deg,#12388f,#0a1f52)', 'linear-gradient(135deg,#0a1f52,#c8102e)',
  'linear-gradient(135deg,#7c2d12,#ea580c)', 'linear-gradient(135deg,#0b7a3e,#0a1f52)',
  'linear-gradient(135deg,#12388f,#e8203f)', 'linear-gradient(135deg,#3b1d5e,#12388f)',
  'linear-gradient(135deg,#0a1f52,#0b7a3e)', 'linear-gradient(135deg,#a00d24,#0a1f52)',
];

function VideoCard({ v, i, token, viewSeconds }) {
  const [playing, setPlaying] = useState(false);
  const [counted, setCounted] = useState(false);
  const viewIdRef = useRef(null);
  const timerRef = useRef(null);

  const start = useCallback(async () => {
    setPlaying(true);
    if (viewIdRef.current || counted) return;
    try {
      const r = await fetch(`/api/share/${token}/view-start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: v.id }),
      });
      const d = await r.json();
      if (!d.tracked || !d.view_id) return;
      viewIdRef.current = d.view_id;
      // Server re-checks the elapsed time — this timer only decides when to ASK.
      timerRef.current = setTimeout(async () => {
        try {
          const c = await fetch(`/api/share/${token}/view-complete`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ view_id: viewIdRef.current }),
          });
          const cd = await c.json();
          if (cd.verified) setCounted(true);
        } catch (e) { /* view just doesn't count */ }
      }, (viewSeconds + 1) * 1000);
    } catch (e) { /* tracking is best-effort; never block playback */ }
  }, [token, v.id, viewSeconds, counted]);

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  return (
    <div style={{ background: '#fff', borderRadius: 15, overflow: 'hidden', border: '1px solid ' + LINE, boxShadow: '0 10px 30px -20px rgba(10,31,82,.3)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ aspectRatio: '16/9', position: 'relative', background: THUMBS[i % THUMBS.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {playing ? (
          <iframe src={v.embed_url + (v.embed_url.includes('?') ? '&' : '?') + 'autoplay=1'} title={v.title} allow="autoplay; encrypted-media" allowFullScreen loading="lazy"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
        ) : (
          <button onClick={start} aria-label={'Play: ' + v.title}
                  style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.92)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,.25)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={NAVY} style={{ marginLeft: 3 }}><path d="M8 5v14l11-7z" /></svg>
          </button>
        )}
        {counted && <span style={{ position: 'absolute', left: 8, bottom: 8, background: 'rgba(0,0,0,.72)', color: '#fff', fontSize: 10.5, fontWeight: 800, padding: '4px 9px', borderRadius: 20 }}>✓ Viewed</span>}
      </div>
      <div style={{ padding: '13px 14px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.32, color: NAVY }}>{v.title}</div>
        <div style={{ fontSize: 12, color: MUTED, fontWeight: 700, marginTop: 5 }}>{v.advertiser}</div>
        {v.cta_url && (
          <a href={v.cta_url} target="_blank" rel="noopener noreferrer sponsored"
             style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: RED, color: '#fff', borderRadius: 10, padding: '10px 12px', fontWeight: 900, fontSize: 13, textDecoration: 'none', boxShadow: '0 10px 22px -12px rgba(200,16,46,.75)' }}>
            Learn more →
          </a>
        )}
      </div>
    </div>
  );
}

export default function SharePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    document.title = 'AdvantageLife — Video Showcase';
    fetch(`/api/share/${token}/page`).then(r => r.json())
      .then(d => (d.error ? setErr(true) : setData(d))).catch(() => setErr(true));
  }, [token]);

  if (err) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', color: MUTED, fontWeight: 600 }}>This share page isn’t available.</div>;
  if (!data) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', color: MUTED, fontWeight: 600 }}>Loading videos…</div>;

  const videos = data.videos || [];
  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', background: '#f3f5fb', minHeight: '100vh', color: NAVY }}>
      <div style={{ background: '#fff', borderBottom: '1px solid ' + LINE, padding: '14px clamp(14px,4vw,40px)', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 9 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 900, fontSize: 19 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(160deg,#12388f,#0a1f52)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 17L9 10l4 4 8-9" stroke="#ff2743" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 5h6v6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>Advantage<span style={{ color: RED }}>Life</span>
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: MUTED, fontWeight: 600 }}>Shared by <b style={{ color: NAVY }}>@{data.sharer?.username}</b></span>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px clamp(14px,4vw,40px) 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 'clamp(24px,3.4vw,33px)', fontWeight: 900, letterSpacing: -1 }}>This week’s <span style={{ color: RED }}>video showcase</span></h1>
          <p style={{ color: MUTED, fontWeight: 600, fontSize: 15, marginTop: 7 }}>Videos from independent creators and businesses. Watch whatever interests you.</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12, background: '#fff', border: '1.5px solid ' + LINE, borderRadius: 30, padding: '7px 15px', fontSize: 12.5, fontWeight: 800, color: '#12388f' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 4px rgba(22,163,74,.15)' }} /> Updated continuously — new videos every visit
          </div>
        </div>

        {videos.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 16, padding: 44, textAlign: 'center', color: MUTED, fontWeight: 600 }}>No videos are showing right now — check back shortly.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
            {videos.map((v, i) => <VideoCard key={v.id} v={v} i={i} token={token} viewSeconds={data.view_seconds || 30} />)}
          </div>
        )}

        <div style={{ marginTop: 30, background: 'linear-gradient(120deg,#0e2a6e,#0a1f52)', borderRadius: 20, padding: 'clamp(22px,3vw,32px)', textAlign: 'center', color: '#fff', boxShadow: '0 26px 55px -30px rgba(10,31,82,.7)' }}>
          <h2 style={{ fontSize: 'clamp(19px,2.4vw,25px)', fontWeight: 900, letterSpacing: -.5 }}>Want your video seen by thousands?</h2>
          <p style={{ color: '#c9d6f7', fontWeight: 600, fontSize: 14, marginTop: 7, maxWidth: 560, margin: '7px auto 0' }}>AdvantageLife puts independent creators and businesses in front of real people. Lifetime access to the full marketing toolkit — one payment, no subscription.</p>
          <a href="/" style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(120deg,#c8102e,#e8203f)', color: '#fff', borderRadius: 12, padding: '13px 26px', fontWeight: 900, fontSize: 14.5, textDecoration: 'none', boxShadow: '0 14px 30px -12px rgba(200,16,46,.7)' }}>See how it works →</a>
        </div>

        <div style={{ textAlign: 'center', color: '#9aa6c2', fontSize: 11.5, fontWeight: 600, marginTop: 22, lineHeight: 1.6 }}>
          Videos are supplied by independent advertisers. AdvantageLife does not endorse their claims or products.<br />© {new Date().getFullYear()} AdvantageLife
        </div>
      </div>
    </div>
  );
}
