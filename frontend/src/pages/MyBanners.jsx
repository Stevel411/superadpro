import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../utils/api';
import AlShell from '../components/layout/AlShell';

const NAVY = '#0a1f52', RED = '#c8102e', MUTED = '#5a6584', LINE = '#e6ecf5', GREEN = '#159a52';

const STATUS = {
  active: { bg: 'rgba(34,194,107,.15)', c: GREEN, t: '● Live' },
  flagged: { bg: 'rgba(240,165,42,.16)', c: '#b8860b', t: '⚑ In review' },
  paused: { bg: '#eef1f8', c: MUTED, t: '❙❙ Paused' },
};

export default function MyBanners() {
  const nav = useNavigate();
  const [d, setD] = useState(null);
  useEffect(function () { apiGet('/api/al/banners/mine').then(setD).catch(function () { setD({ totals: {}, slots: [], banners: [] }); }); }, []);

  const stat = function (k, v) {
    return (
      <div style={{ background: 'linear-gradient(135deg,#0a1f52,#12388f)', borderRadius: 14, padding: '15px 16px', color: '#fff' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#a9bce0', textTransform: 'uppercase', letterSpacing: '.05em' }}>{k}</div>
        <div style={{ fontSize: 23, fontWeight: 900, marginTop: 4 }}>{v}</div>
      </div>
    );
  };

  return (
    <AlShell>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '6px 4px 50px', fontFamily: 'Inter,system-ui,sans-serif', color: '#0d1230' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.6px', color: NAVY }}>My Banners</h1>
          <button onClick={function () { nav('/banners/create'); }} style={{ background: RED, color: '#fff', border: 0, borderRadius: 11, padding: '11px 20px', fontWeight: 900, fontSize: 13.5, cursor: 'pointer' }}>+ Create Banner</button>
        </div>

        {!d ? <div style={{ padding: 30, color: MUTED, fontWeight: 600 }}>Loading…</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }} className="al-bstat">
              {stat('Impressions', (d.totals.impressions || 0).toLocaleString())}
              {stat('Clicks', (d.totals.clicks || 0).toLocaleString())}
              {stat('Avg CTR', (d.totals.ctr || 0) + '%')}
              {stat('Live banners', d.totals.live || 0)}
            </div>

            {d.slots && d.slots.length > 0 ? (
              <div style={{ background: '#fff', border: '1px solid #e3e8f4', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: NAVY }}>Banner slots</span>
                {d.slots.map(function (s) {
                  return <span key={s.pack_id} style={{ fontSize: 11.5, fontWeight: 800, color: MUTED, background: '#eef2fa', padding: '5px 11px', borderRadius: 8 }}>{s.name} · <b style={{ color: RED }}>{s.used} of {s.total}</b> used</span>;
                })}
              </div>
            ) : null}

            {d.banners.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 16, padding: 40, textAlign: 'center', color: MUTED, fontWeight: 600 }}>No banners yet — tap “Create Banner” to place your first.</div>
            ) : d.banners.map(function (b) {
              const st = STATUS[b.status] || STATUS.paused;
              return (
                <div key={b.id} style={{ background: '#fff', border: '1px solid #e3e8f4', borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                  <div style={{ width: 110, height: 46, borderRadius: 7, flex: 'none', overflow: 'hidden', background: '#eef2fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {b.image_url ? <img src={b.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 10, fontWeight: 800, color: '#8a97b8' }}>HTML</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: NAVY }}>{b.title || '(untitled)'}</div>
                    <div style={{ fontSize: 11.5, color: '#7a869e', fontWeight: 600, marginTop: 2 }}>{b.size} · {b.category}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flex: 'none' }} className="al-bnums">
                    {[['Impr.', (b.impressions || 0).toLocaleString()], ['Clicks', (b.clicks || 0).toLocaleString()], ['CTR', (b.ctr || 0) + '%']].map(function (n) {
                      return <div key={n[0]} style={{ textAlign: 'center' }}><div style={{ fontSize: 15, fontWeight: 900, color: NAVY }}>{n[1]}</div><div style={{ fontSize: 10, fontWeight: 700, color: '#8a97b8', textTransform: 'uppercase' }}>{n[0]}</div></div>;
                    })}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 7, flex: 'none', background: st.bg, color: st.c }}>{st.t}</span>
                </div>
              );
            })}
          </>
        )}
        <style>{`@media(max-width:640px){.al-bstat{grid-template-columns:1fr 1fr !important}.al-bnums{display:none !important}}`}</style>
      </div>
    </AlShell>
  );
}
