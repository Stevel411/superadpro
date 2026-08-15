import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';
import AlShell from '../components/layout/AlShell';

const NAVY = '#0a1f52', NAVY2 = '#12388f', RED = '#c8102e', GOLD = '#f0a52a',
  GREEN = '#22c26b', INK = '#0d1230', MUTED = '#61708f', LINE = '#e6ebf5';

const TONE = {
  a: { bg: '#e5edff', c: '#12388f' }, b: { bg: '#e7f8ee', c: '#1a9a54' },
  c: { bg: '#fff3e0', c: '#a06a00' }, d: { bg: '#fde8ec', c: '#c8102e' },
};
const GAME_ICON = { flight: '🕊️', run: '🛵', beach: '🏖️' };

function copyText(t, done) {
  try {
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, done);
    else done();
  } catch (e) { done(); }
}
async function shareImage(url, caption, fallbackDone) {
  // Try native share with the image file; fall back to sharing the caption+link.
  try {
    if (navigator.canShare) {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], 'advantagelife.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
        return;
      }
    }
    if (navigator.share) { await navigator.share({ text: caption }); return; }
  } catch (e) { /* fall through */ }
  copyText(caption, fallbackDone);
}

function CopyBtn({ text, label, style, done }) {
  const [hit, setHit] = useState(false);
  return (
    <button onClick={() => copyText(text, () => { setHit(true); setTimeout(() => setHit(false), 1400); if (done) done(); })}
      style={{ cursor: 'pointer', border: 0, fontWeight: 800, ...style }}>
      {hit ? '✓ Copied' : label}
    </button>
  );
}

export default function ContentKit() {
  const [d, setD] = useState(null);
  useEffect(() => { apiGet('/api/kit').then(setD).catch(() => setD(false)); }, []);

  const back = { to: '/dashboard', label: 'Dashboard' };
  if (d === null) return <AlShell active="kit" back={back}><div style={{ padding: 60, textAlign: 'center', color: MUTED }}>Loading your content kit…</div></AlShell>;
  if (d === false) return <AlShell active="kit" back={back}><div style={{ padding: 60, textAlign: 'center', color: MUTED }}>Couldn't load the kit. Please refresh.</div></AlShell>;

  const sect = { fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: MUTED, margin: '24px 4px 12px' };
  const graphicByKey = Object.fromEntries(d.graphics.map((g) => [g.key, g]));

  // resolve "post this today"
  let today = null;
  if (d.today) {
    const [kind, key] = d.today.split(':');
    if (kind === 'graphic' && graphicByKey[key]) today = { type: 'graphic', item: graphicByKey[key] };
    else if (kind === 'game') today = { type: 'game', item: d.games.find((g) => g.key === key) };
  }
  const todayCaption = today ? (today.type === 'game'
    ? `🎮 Think you can beat me? Free to play on AdvantageLife — top score this month wins $400. Bet you can't → ${today.item.share}`
    : `${d.swipe[0].text}`) : '';

  return (
    <AlShell active="kit" back={back}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* header */}
        <div style={{ background: NAVY, color: '#fff', borderRadius: 20, padding: '24px 24px 28px', marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9fb4e6' }}>📢 Content Kit</div>
          <h1 style={{ fontSize: 27, fontWeight: 900, letterSpacing: '-.5px', margin: '6px 0 0' }}>Ready to post. Just tap.</h1>
          <p style={{ fontSize: 14, color: '#cfe0ff', marginTop: 8, lineHeight: 1.5, fontWeight: 500 }}>
            We make the content — graphics, captions, games — with your link already in it. No design, no writing. Copy or share in one tap.
          </p>
        </div>

        {/* POST TODAY */}
        {today && (
          <>
            <div style={sect}>⭐ Post this today</div>
            <div style={{ background: `linear-gradient(135deg,${NAVY},${NAVY2})`, borderRadius: 20, overflow: 'hidden', marginBottom: 16, boxShadow: '0 20px 44px -26px rgba(10,31,82,.6)' }}>
              {today.type === 'graphic' && (
                <img src={today.item.url} alt={today.item.label} style={{ width: '100%', display: 'block' }} loading="lazy" />
              )}
              <div style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: GOLD }}>Today's pick · {today.item.label}</div>
                <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 12, padding: '12px 14px', margin: '12px 0', color: '#eaf1ff', fontSize: 13, lineHeight: 1.55, fontWeight: 500 }}>{todayCaption}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <CopyBtn text={todayCaption} label="Copy caption" style={{ flex: 1, textAlign: 'center', fontSize: 14, padding: 13, borderRadius: 11, background: 'rgba(255,255,255,.14)', color: '#fff' }} />
                  <button onClick={() => today.type === 'graphic' ? shareImage(today.item.url, todayCaption, () => {}) : (navigator.share ? navigator.share({ text: todayCaption }) : copyText(todayCaption, () => {}))}
                    style={{ flex: 1, textAlign: 'center', fontSize: 14, padding: 13, borderRadius: 11, background: RED, color: '#fff', border: 0, fontWeight: 900, cursor: 'pointer' }}>Share now →</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* GRAPHICS */}
        <div style={sect}>🖼️ Ready-made graphics</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {d.graphics.map((g) => {
            const cap = `${d.swipe[0].text}`;
            return (
              <div key={g.key} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 22px -18px rgba(10,31,82,.4)' }}>
                <img src={g.url} alt={g.label} style={{ width: '100%', display: 'block', aspectRatio: '1/1' }} loading="lazy" />
                <div style={{ padding: 10, display: 'flex', gap: 8 }}>
                  <CopyBtn text={d.ref} label="Copy link" style={{ flex: 1, fontSize: 12, padding: 8, borderRadius: 9, background: '#eef2fb', color: NAVY }} />
                  <button onClick={() => shareImage(g.url, cap, () => {})} style={{ flex: 1, fontSize: 12, padding: 8, borderRadius: 9, background: RED, color: '#fff', border: 0, fontWeight: 800, cursor: 'pointer' }}>Share</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* SWIPE COPY */}
        <div style={sect}>✍️ Swipe copy</div>
        {d.swipe.map((s, i) => {
          const t = TONE[s.tone] || TONE.a;
          return (
            <div key={i} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, marginBottom: 10, boxShadow: '0 8px 22px -20px rgba(10,31,82,.35)' }}>
              <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, marginBottom: 9, background: t.bg, color: t.c }}>{s.angle}</span>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: INK, fontWeight: 500 }}>{s.text}</p>
              <CopyBtn text={s.text} label="📋 Copy this post" style={{ marginTop: 10, width: '100%', fontSize: 13, padding: 10, borderRadius: 10, border: `1px solid ${LINE}`, background: '#f7f9fe', color: NAVY }} />
            </div>
          );
        })}

        {/* GAMES */}
        <div style={sect}>🎮 Game challenges</div>
        {d.games.map((g) => (
          <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', fontSize: 20, flex: 'none', background: '#eef4ff' }}>{GAME_ICON[g.key] || '🎮'}</div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: INK }}>{g.label}</div>
            <button onClick={() => navigator.share ? navigator.share({ title: 'Beat my score on AdvantageLife', url: g.share }) : copyText(g.share, () => {})}
              style={{ background: RED, color: '#fff', fontWeight: 800, fontSize: 13, padding: '9px 16px', borderRadius: 10, border: 0, cursor: 'pointer' }}>Share</button>
          </div>
        ))}

        <div style={{ background: '#fff', border: '1px dashed #c9d4ea', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: MUTED, lineHeight: 1.6, fontWeight: 600, marginTop: 12 }}>
          🎬 Short videos with your link are coming in a later drop. New graphics &amp; captions are added regularly — check back for fresh content to post.
        </div>
      </div>
    </AlShell>
  );
}
