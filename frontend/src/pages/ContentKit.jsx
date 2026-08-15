import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';
import AlShell from '../components/layout/AlShell';

const NAVY = '#0a1f52', NAVY2 = '#12388f', RED = '#c8102e', GOLD = '#f0a52a',
  GREEN = '#22c26b', INK = '#0d1230', MUTED = '#61708f', LINE = '#e6ebf5';

const TONE = {
  a: { bg: '#e5edff', c: '#12388f' }, b: { bg: '#e7f8ee', c: '#1a9a54' },
  c: { bg: '#fff3e0', c: '#a06a00' }, d: { bg: '#fde8ec', c: '#c8102e' },
};
const GAME_ICON = { flight: '\uD83D\uDD4A\uFE0F', run: '\uD83D\uDEF5', beach: '\uD83C\uDFD6\uFE0F' };

function copyText(t, done) {
  try {
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, done);
    else done();
  } catch (e) { done(); }
}
async function shareImage(url, caption, fallbackDone) {
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
      {hit ? '\u2713 Copied' : label}
    </button>
  );
}

export default function ContentKit() {
  const [d, setD] = useState(null);
  useEffect(() => { apiGet('/api/kit').then(setD).catch(() => setD(false)); }, []);

  const back = { to: '/dashboard', label: 'Dashboard' };
  if (d === null) return <AlShell active="kit" back={back}><div style={{ padding: 60, textAlign: 'center', color: MUTED }}>Loading your content kit\u2026</div></AlShell>;
  if (d === false) return <AlShell active="kit" back={back}><div style={{ padding: 60, textAlign: 'center', color: MUTED }}>Couldn't load the kit. Please refresh.</div></AlShell>;

  const sect = { fontSize: 13, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: NAVY, margin: '30px 2px 16px' };
  const graphicByKey = Object.fromEntries(d.graphics.map((g) => [g.key, g]));

  let today = null;
  if (d.today) {
    const [kind, key] = d.today.split(':');
    if (kind === 'graphic' && graphicByKey[key]) today = { type: 'graphic', item: graphicByKey[key] };
    else if (kind === 'game') today = { type: 'game', item: d.games.find((g) => g.key === key) };
  }
  const todayCaption = today ? (today.type === 'game'
    ? `\uD83C\uDFAE Think you can beat me? Free to play on AdvantageLife \u2014 top score this month wins $400. Bet you can't \u2192 ${today.item.share}`
    : `${d.swipe[0].text}`) : '';

  const tileBtn = { flex: 1, fontSize: 13, padding: 9, borderRadius: 9, cursor: 'pointer' };

  return (
    <AlShell active="kit" back={back}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        {/* header */}
        <div style={{ background: NAVY, color: '#fff', borderRadius: 20, padding: '26px 28px 30px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9fb4e6' }}>\uD83D\uDCE2 Content Kit</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.5px', margin: '6px 0 0' }}>Ready to post. Just tap.</h1>
          <p style={{ fontSize: 15, color: '#cfe0ff', marginTop: 8, lineHeight: 1.5, fontWeight: 500, maxWidth: 620 }}>
            We make the content \u2014 graphics, captions, games \u2014 with your link already in it. No design, no writing. Copy or share in one tap.
          </p>
        </div>

        {/* POST TODAY \u2014 image left, caption right on desktop */}
        {today && (
          <>
            <div style={sect}>\u2B50 Post this today</div>
            <div style={{ background: `linear-gradient(135deg,${NAVY},${NAVY2})`, borderRadius: 20, overflow: 'hidden', marginBottom: 8, boxShadow: '0 20px 44px -26px rgba(10,31,82,.6)', display: 'flex', flexWrap: 'wrap' }}>
              {today.type === 'graphic' && (
                <img src={today.item.url} alt={today.item.label} style={{ width: 340, maxWidth: '100%', display: 'block', flex: 'none' }} loading="lazy" />
              )}
              <div style={{ flex: 1, minWidth: 280, padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: GOLD }}>Today's pick \u00b7 {today.item.label}</div>
                <div style={{ background: 'rgba(255,255,255,.1)', borderRadius: 12, padding: '13px 15px', margin: '12px 0', color: '#eaf1ff', fontSize: 14, lineHeight: 1.55, fontWeight: 500 }}>{todayCaption}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <CopyBtn text={todayCaption} label="Copy caption" style={{ flex: 1, textAlign: 'center', fontSize: 14, padding: 13, borderRadius: 11, background: 'rgba(255,255,255,.14)', color: '#fff' }} />
                  <button onClick={() => today.type === 'graphic' ? shareImage(today.item.url, todayCaption, () => {}) : (navigator.share ? navigator.share({ text: todayCaption }) : copyText(todayCaption, () => {}))}
                    style={{ flex: 1, textAlign: 'center', fontSize: 14, padding: 13, borderRadius: 11, background: RED, color: '#fff', border: 0, fontWeight: 900, cursor: 'pointer' }}>Share now \u2192</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* GRAPHICS \u2014 responsive grid w/ labels (matches mockup) */}
        <div style={sect}>\uD83D\uDDBC\uFE0F Ready-made graphics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 22 }}>
          {d.graphics.map((g) => (
            <div key={g.key}>
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 30px -20px rgba(10,31,82,.45)' }}>
                <img src={g.url} alt={g.label} style={{ width: '100%', display: 'block', aspectRatio: '1/1' }} loading="lazy" />
                <div style={{ padding: 12, display: 'flex', gap: 8 }}>
                  <CopyBtn text={d.ref} label="Copy link" style={{ ...tileBtn, background: '#eef2fb', color: NAVY }} />
                  <button onClick={() => shareImage(g.url, d.swipe[0].text, () => {})} style={{ ...tileBtn, background: RED, color: '#fff', border: 0, fontWeight: 800 }}>Share image</button>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: MUTED, marginTop: 9 }}>{g.label}</div>
            </div>
          ))}
        </div>

        {/* SWIPE COPY \u2014 2-col on desktop */}
        <div style={sect}>\u270D\uFE0F Swipe copy</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {d.swipe.map((s, i) => {
            const t = TONE[s.tone] || TONE.a;
            return (
              <div key={i} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, boxShadow: '0 8px 22px -20px rgba(10,31,82,.35)', display: 'flex', flexDirection: 'column' }}>
                <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, marginBottom: 9, background: t.bg, color: t.c }}>{s.angle}</span>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: INK, fontWeight: 500, flex: 1 }}>{s.text}</p>
                <CopyBtn text={s.text} label="\uD83D\uDCCB Copy this post" style={{ marginTop: 12, width: '100%', fontSize: 13, padding: 10, borderRadius: 10, border: `1px solid ${LINE}`, background: '#f7f9fe', color: NAVY }} />
              </div>
            );
          })}
        </div>

        {/* GAMES */}
        <div style={sect}>\uD83C\uDFAE Game challenges</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {d.games.map((g) => (
            <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', fontSize: 20, flex: 'none', background: '#eef4ff' }}>{GAME_ICON[g.key] || '\uD83C\uDFAE'}</div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: INK }}>{g.label}</div>
              <button onClick={() => navigator.share ? navigator.share({ title: 'Beat my score on AdvantageLife', url: g.share }) : copyText(g.share, () => {})}
                style={{ background: RED, color: '#fff', fontWeight: 800, fontSize: 13, padding: '9px 16px', borderRadius: 10, border: 0, cursor: 'pointer' }}>Share</button>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px dashed #c9d4ea', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: MUTED, lineHeight: 1.6, fontWeight: 600, margin: '18px 0 4px' }}>
          \uD83C\uDFAC Short videos with your link are coming in a later drop. New graphics &amp; captions are added regularly \u2014 check back for fresh content to post.
        </div>
      </div>
    </AlShell>
  );
}
