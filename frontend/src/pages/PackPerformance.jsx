import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AlShell from '../components/layout/AlShell';
import { apiGet } from '../utils/api';

const NAVY = '#0a1f52', BLUE = '#12388f', RED = '#c8102e', MUTED = '#8a97b8';
const CARD = {
  background: '#fff', borderRadius: 20, padding: 24, marginBottom: 20,
  boxShadow: '0 20px 45px -28px rgba(10,31,82,.4)', border: '1px solid #e3e9f5',
};

function fmt(n) { return (n || 0).toLocaleString(); }

function VideoRow({ v, index, maxv }) {
  const meta = [v.platform, v.category].filter(Boolean).join(' \u00b7 ');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 13 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: NAVY, color: '#fff', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{index + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
        {meta && <div style={{ fontSize: 11.5, fontWeight: 700, color: '#9aa6c4' }}>{meta}</div>}
        <div style={{ height: 5, background: '#eef1f8', borderRadius: 4, marginTop: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: Math.round(100 * v.views / maxv) + '%', background: '#2f6fe0', borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ fontWeight: 900, fontSize: 15, textAlign: 'right', flexShrink: 0, color: NAVY }}>
        {fmt(v.views)}<div style={{ fontSize: 10.5, fontWeight: 700, color: '#aab4d0' }}>views</div>
      </div>
    </div>
  );
}

export default function PackPerformance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    apiGet('/api/al/pack-performance')
      .then(function (r) { setData(r); setLoading(false); })
      .catch(function () { setLoading(false); });
  }, []);

  const packs = (data && data.packs) || [];
  const orphans = (data && data.orphans) || [];

  let body;
  if (loading) {
    body = <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontWeight: 700 }}>Loading your packs\u2026</div>;
  } else if (packs.length === 0 && orphans.length === 0) {
    body = (
      <div style={{ ...CARD, textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: NAVY, marginBottom: 6 }}>No active packs yet</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: MUTED, marginBottom: 18 }}>
          Buy a campaign pack to start advertising \u2014 each pack runs multiple video ads.
        </div>
        <Link to="/packs?new=1" style={{ display: 'inline-block', background: RED, color: '#fff', fontWeight: 800, fontSize: 14, padding: '11px 20px', borderRadius: 12, textDecoration: 'none' }}>
          Create a campaign
        </Link>
      </div>
    );
  } else {
    const packCards = packs.map(function (p) {
      const maxv = Math.max(1, ...(p.videos || []).map(function (v) { return v.views; }));
      const pill = p.status === 'active'
        ? { bg: 'rgba(46,204,113,.14)', c: '#1a8f4e', t: '\u25cf ACTIVE' }
        : p.status === 'wrapping'
          ? { bg: 'rgba(212,175,55,.16)', c: '#9a7d1f', t: 'WRAPPING UP' }
          : { bg: 'rgba(10,31,82,.08)', c: '#5a6584', t: 'COMPLETED' };
      const freeSlots = (p.slots_total || 0) - (p.slots_used || 0);
      return (
        <div key={p.pack_id} style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 10 }}>
            <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-.4px', color: NAVY }}>
              ${p.level} {p.name} pack <span style={{ fontWeight: 700, color: '#8a97b8', fontSize: 13 }}>&middot; up to {p.slots_total} video ads</span>
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 900, letterSpacing: '.04em', padding: '6px 13px', borderRadius: 20, background: pill.bg, color: pill.c, whiteSpace: 'nowrap' }}>{pill.t}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 9 }}>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1, color: NAVY }}>{fmt(p.aggregate)}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: MUTED }}>of {fmt(p.total)} views delivered</div>
            <div style={{ marginLeft: 'auto', fontSize: 17, fontWeight: 900, color: BLUE }}>{p.pct}%</div>
          </div>
          <div style={{ height: 12, background: '#eaf0fb', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: Math.max(2, p.pct) + '%', background: 'linear-gradient(90deg,#12388f,#2f6fe0)', borderRadius: 8 }} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, margin: '8px 0 18px' }}>
            {p.slots_used} of {p.slots_total} video slots in use &middot; pack completes at {fmt(p.total)} aggregate views
          </div>
          <div style={{ borderTop: '1px solid #eef1f8', paddingTop: 16 }}>
            {(p.videos || []).length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', color: '#aab4d0', marginBottom: 12 }}>Your video ads on this pack</div>
            )}
            {(p.videos || []).map(function (v, i) { return <VideoRow key={v.id} v={v} index={i} maxv={maxv} />; })}
            {freeSlots > 0 && p.status === 'active' && (
              <Link to="/packs?new=1" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', border: '1.5px dashed #c8d3ec', borderRadius: 12, color: BLUE, fontWeight: 800, fontSize: 14, textDecoration: 'none', marginTop: 4 }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: '#eaf0fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900 }}>+</span>
                Add another video ad \u2014 it shares this pack's views, no extra cost
              </Link>
            )}
          </div>
        </div>
      );
    });

    let orphanCard = null;
    if (orphans.length > 0) {
      const omax = Math.max(1, ...orphans.map(function (v) { return v.views; }));
      orphanCard = (
        <div key="orphans" style={CARD}>
          <div style={{ fontSize: 17, fontWeight: 900, color: NAVY, marginBottom: 4 }}>Campaigns not tied to a pack</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, marginBottom: 16 }}>
            These video ads are running but aren't backed by a campaign pack (e.g. admin-created, or a pack that's been removed).
          </div>
          <div style={{ borderTop: '1px solid #eef1f8', paddingTop: 16 }}>
            {orphans.map(function (v, i) { return <VideoRow key={v.id} v={v} index={i} maxv={omax} />; })}
          </div>
        </div>
      );
    }

    body = <>{packCards}{orphanCard}</>;
  }

  return (
    <AlShell active="packperf" back={{ to: '/dashboard', label: 'Dashboard' }}>
      <div style={{ maxWidth: 680 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.5px', color: NAVY, marginBottom: 4 }}>Pack performance</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#5a6584', marginBottom: 22 }}>
          Each pack delivers its full view target across its videos \u2014 track the aggregate and every ad.
        </div>
        {body}
      </div>
    </AlShell>
  );
}
