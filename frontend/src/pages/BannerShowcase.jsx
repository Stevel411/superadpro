import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '../utils/api';
import AlShell from '../components/layout/AlShell';

const NAVY = '#0a1f52', MUTED = '#5a6584', LINE = '#e6ecf5';

// One banner tile — renders image or sandboxed HTML, tracks a single impression
// when it's been ≥50% visible for ~1s.
function BannerTile({ b }) {
  const ref = useRef(null);
  const fired = useRef(false);
  const timer = useRef(null);

  useEffect(function () {
    if (!ref.current || fired.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio >= 0.5) {
          if (!timer.current && !fired.current) {
            timer.current = setTimeout(function () {
              fired.current = true;
              apiPost('/api/al/banner/' + b.id + '/impression', {}).catch(function () {});
              obs.disconnect();
            }, 1000);
          }
        } else if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      });
    }, { threshold: [0, 0.5, 1] });
    obs.observe(el);
    return function () { obs.disconnect(); if (timer.current) clearTimeout(timer.current); };
  }, [b.id]);

  // cap render width to the column while keeping aspect ratio
  const maxW = Math.min(b.width, 300);
  const scale = maxW / b.width;
  const h = Math.round(b.height * scale);

  const inner = b.mode === 'html'
    ? <iframe title={'banner-' + b.id} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" srcDoc={b.html_code || ''} style={{ width: b.width, height: b.height, border: 0, transform: 'scale(' + scale + ')', transformOrigin: 'top left' }} />
    : <a href={'/api/al/banner/' + b.id + '/click'} target="_blank" rel="noreferrer"><img src={b.image_url} alt={b.title || 'banner'} style={{ width: maxW, height: h, display: 'block', objectFit: 'cover' }} /></a>;

  return (
    <div ref={ref} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 34px -24px rgba(10,31,82,.5)', background: '#0a1a3a', position: 'relative', width: maxW }}>
      <div style={{ width: maxW, height: b.mode === 'html' ? h : 'auto', overflow: 'hidden', position: 'relative' }}>{inner}</div>
      {(b.title || b.category) ? (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'rgba(6,12,32,.62)', padding: '7px 10px' }}>
          {b.title ? <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>{b.title}</div> : null}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#b9c6e6', marginTop: 1 }}>{b.category} · {(b.impressions || 0).toLocaleString()} impressions</div>
        </div>
      ) : null}
      <span title="Report" onClick={function () { const why = window.prompt('Report this banner — reason (optional):', ''); if (why !== null) apiPost('/api/al/banner/' + b.id + '/report', { reason: why }).then(function () { alert('Thanks — reported for review.'); }).catch(function () {}); }}
        style={{ position: 'absolute', top: 6, right: 6, fontSize: 11, color: '#fff', background: 'rgba(6,12,32,.5)', borderRadius: 6, padding: '2px 7px', cursor: 'pointer', fontWeight: 700 }}>⚑</span>
    </div>
  );
}

export default function BannerShowcase() {
  const [data, setData] = useState(null);
  const [cat, setCat] = useState('All');

  const load = useCallback(function (c) {
    apiGet('/api/al/banners/showcase' + (c && c !== 'All' ? '?category=' + encodeURIComponent(c) : ''))
      .then(setData).catch(function () { setData({ categories: [], banners: [] }); });
  }, []);
  useEffect(function () { load(cat); }, [cat, load]);

  const banners = data ? data.banners : [];
  const cats = data ? ['All'].concat(data.categories || []) : ['All'];

  return (
    <AlShell>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '6px 4px 50px', fontFamily: 'Inter,system-ui,sans-serif', color: '#0d1230' }}>
        <div style={{ background: 'linear-gradient(135deg,#0a1f52,#12388f)', borderRadius: 22, padding: '32px 34px', color: '#fff', position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>Banner <span style={{ color: '#f0a52a' }}>Showcase</span></h1>
          <p style={{ fontSize: 14, color: '#c9d6f0', fontWeight: 500, marginTop: 10, maxWidth: 560 }}>Real offers, tools and opportunities from AdvantageLife members. Every banner is placed by a member running an active campaign pack.</p>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
          {cats.map(function (c) {
            const on = cat === c;
            return <span key={c} onClick={function () { setCat(c); }} style={{ fontSize: 12.5, fontWeight: 800, padding: '8px 15px', borderRadius: 99, border: '1.5px solid ' + (on ? NAVY : LINE), background: on ? NAVY : '#fff', color: on ? '#fff' : MUTED, cursor: 'pointer' }}>{c}</span>;
          })}
        </div>

        {!data ? (
          <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontWeight: 600 }}>Loading banners…</div>
        ) : banners.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 16, padding: 40, textAlign: 'center', color: MUTED, fontWeight: 600 }}>No banners here yet — be the first to place one.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
            {banners.map(function (b) { return <BannerTile key={b.id} b={b} />; })}
          </div>
        )}
      </div>
    </AlShell>
  );
}
