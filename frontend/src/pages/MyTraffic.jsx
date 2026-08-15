import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';
import AlShell from '../components/layout/AlShell';

const NAVY = '#0a1f52', NAVY2 = '#12388f', RED = '#c8102e', GOLD = '#f0a52a',
  GREEN = '#22c26b', INK = '#0d1230', MUTED = '#61708f', LINE = '#e6ebf5';

const SOURCE_META = {
  flight: { label: 'Freedom Flight', color: NAVY2 },
  run: { label: 'Coast Run', color: '#1fb6c9' },
  beach: { label: 'Beach Bounce', color: GOLD },
  ref: { label: 'Referral link', color: RED },
  other: { label: 'Other', color: '#9aa7c4' },
};

function Card({ title, children, style }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 18, padding: 20, marginBottom: 16, boxShadow: '0 10px 30px -22px rgba(10,31,82,.4)', ...style }}>
      {title && <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: MUTED, marginBottom: 14 }}>{title}</div>}
      {children}
    </div>
  );
}

function FunnelStep({ icon, bg, color, n, conv, label, pct }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', flex: 'none', fontSize: 20, background: bg }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: NAVY, lineHeight: 1 }}>
          {n.toLocaleString()}{conv != null && <span style={{ fontSize: 12, fontWeight: 800, color: MUTED, marginLeft: 8 }}>· {conv}% {label.split('—')[0].trim().toLowerCase() === 'plays' ? 'played' : 'joined'}</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: MUTED, marginTop: 2 }}>{label}</div>
        <div style={{ height: 10, borderRadius: 6, background: '#eef2fb', marginTop: 8, overflow: 'hidden' }}>
          <i style={{ display: 'block', height: '100%', borderRadius: 6, width: pct + '%', background: color }} />
        </div>
      </div>
    </div>
  );
}

export default function MyTraffic() {
  const [d, setD] = useState(null);
  useEffect(() => {
    apiGet('/api/traffic/summary')
      .then(setD)
      .catch(() => setD({ visits: 0, plays: 0, signups: 0, visits_30d: 0, plays_30d: 0, signups_30d: 0, by_source: {}, team_total: 0 }));
  }, []);

  const back = { to: '/dashboard', label: 'Dashboard' };
  if (!d) return <AlShell active="traffic" back={back}><div style={{ padding: 60, textAlign: 'center', color: MUTED }}>Loading your traffic…</div></AlShell>;

  const visits = d.visits || 0, plays = d.plays || 0, signups = d.signups || 0;
  const playPct = visits ? Math.round((plays / visits) * 100) : 0;
  const joinPct = plays ? Math.round((signups / plays) * 100) : 0;

  const srcEntries = Object.entries(d.by_source || {})
    .map(([k, v]) => ({ key: k, count: v, ...(SOURCE_META[k] || SOURCE_META.other) }))
    .sort((a, b) => b.count - a.count);
  const srcMax = srcEntries.reduce((m, s) => Math.max(m, s.count), 0) || 1;
  const empty = visits === 0 && signups === 0;

  return (
    <AlShell active="traffic" back={back}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* header */}
        <div style={{ background: NAVY, color: '#fff', borderRadius: 20, padding: '24px 24px 28px', marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9fb4e6' }}>📈 Your Traffic</div>
          <h1 style={{ fontSize: 27, fontWeight: 900, letterSpacing: '-.5px', margin: '6px 0 0' }}>Traffic you've generated</h1>
          <p style={{ fontSize: 14, color: '#cfe0ff', marginTop: 8, lineHeight: 1.5, fontWeight: 500 }}>
            Every visit, play and signup your shared games &amp; links have produced. The more you share, the more this grows.
          </p>
        </div>

        {empty ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '18px 6px' }}>
              <div style={{ fontSize: 40 }}>🚀</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: NAVY, marginTop: 8 }}>No traffic yet — let's fix that</div>
              <div style={{ fontSize: 14, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>Share a game challenge and every play sends new people to your links. Your numbers will show up here.</div>
              <a href="/dashboard" style={{ display: 'inline-block', marginTop: 16, background: RED, color: '#fff', fontWeight: 900, fontSize: 15, padding: '13px 26px', borderRadius: 12, textDecoration: 'none' }}>Share a game →</a>
            </div>
          </Card>
        ) : (
          <>
            {/* hero */}
            <Card>
              <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-3px', color: NAVY, lineHeight: .9 }}>{visits.toLocaleString()}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: MUTED, marginTop: 8 }}>visits to your links, all-time</div>
              {d.visits_30d > 0 && <div style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 800, color: GREEN, background: 'rgba(34,194,107,.12)', padding: '6px 12px', borderRadius: 20 }}>▲ {d.visits_30d.toLocaleString()} in the last 30 days</div>}
            </Card>

            {/* funnel */}
            <Card title="Your funnel">
              <FunnelStep icon="👁️" bg="rgba(18,56,143,.12)" color={NAVY2} n={visits} conv={null} label="Visits — people landed on your links" pct={100} />
              <FunnelStep icon="🎮" bg="rgba(240,165,42,.15)" color={GOLD} n={plays} conv={playPct} label="Plays — visitors who played your game" pct={playPct} />
              <FunnelStep icon="✅" bg="rgba(34,194,107,.15)" color={GREEN} n={signups} conv={joinPct} label="Signups — joined your team" pct={Math.max(joinPct, signups > 0 ? 4 : 0)} />
            </Card>

            {/* 30 day */}
            <Card title="Last 30 days">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[['Visits', d.visits_30d], ['Plays', d.plays_30d], ['Signups', d.signups_30d]].map(([k, v]) => (
                  <div key={k} style={{ background: '#f7f9fe', border: `1px solid ${LINE}`, borderRadius: 14, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: NAVY }}>{(v || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: MUTED, marginTop: 4 }}>{k}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* by source */}
            {srcEntries.length > 0 && (
              <Card title="Where your traffic comes from">
                {srcEntries.map((s) => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', flex: 'none', background: s.color }} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: INK, width: 130 }}>{s.label}</span>
                    <span style={{ flex: 1, height: 9, background: '#eef2fb', borderRadius: 5, overflow: 'hidden' }}>
                      <i style={{ display: 'block', height: '100%', borderRadius: 5, width: Math.round((s.count / srcMax) * 100) + '%', background: s.color }} />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: MUTED, width: 42, textAlign: 'right' }}>{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}

        {/* CTA */}
        <div style={{ background: `linear-gradient(135deg,${NAVY},${NAVY2})`, borderRadius: 18, padding: 22, color: '#fff', textAlign: 'center' }}>
          <h3 style={{ fontSize: 19, fontWeight: 900, marginBottom: 6 }}>Want more traffic?</h3>
          <p style={{ fontSize: 13, color: '#cfe0ff', marginBottom: 16, fontWeight: 500 }}>Share a game challenge — every play sends new people to your links.</p>
          <a href="/dashboard" style={{ display: 'inline-block', background: RED, color: '#fff', fontWeight: 900, fontSize: 15, padding: '14px 26px', borderRadius: 12, textDecoration: 'none' }}>Share a game →</a>
        </div>
      </div>
    </AlShell>
  );
}
