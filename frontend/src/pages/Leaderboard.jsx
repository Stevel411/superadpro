import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';
import AlShell from '../components/layout/AlShell';
import { Trophy, Flame, Award, Coins } from 'lucide-react';

const NAVY = '#0a1f52', RED = '#c8102e', MUTED = '#5a6584', LINE = '#e6ecf5';

function useCountdown(target) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!target) return;
    const t = new Date(target).getTime();
    const tick = () => {
      const d = t - Date.now();
      if (d <= 0) { setLeft('resetting…'); return; }
      const days = Math.floor(d / 86400000), h = Math.floor((d % 86400000) / 3600000), m = Math.floor((d % 3600000) / 60000);
      setLeft(days + 'd ' + h + 'h ' + m + 'm');
    };
    tick(); const id = setInterval(tick, 30000); return () => clearInterval(id);
  }, [target]);
  return left;
}

const SORTS = [
  { key: 'sold', label: 'Packs Sold', Icon: Flame, col: m => m.sold, fmt: v => v, big: 'Packs sold' },
  { key: 'owned', label: 'Packs Owned', Icon: Award, col: m => m.owned, fmt: v => 'L' + v, big: 'Highest level' },
  { key: 'revenue', label: 'Revenue', Icon: Coins, col: m => m.revenue, fmt: v => '$' + Number(v).toLocaleString(), big: 'Revenue' },
];

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [sort, setSort] = useState('sold');
  useEffect(() => { apiGet('/api/leaderboard/weekly').then(setData).catch(() => setData({ members: [], you: null })); }, []);
  const reset = useCountdown(data && data.next_reset);
  const S = SORTS.find(s => s.key === sort);

  if (!data) return <AlShell active="dashboard" back={{ to: '/dashboard', label: 'Dashboard' }}><div style={{ padding: 60, textAlign: 'center', color: MUTED, fontFamily: 'Sora,sans-serif' }}>Loading leaderboard…</div></AlShell>;

  const members = [...(data.members || [])].sort((a, b) => S.col(b) - S.col(a));
  members.forEach((m, i) => m._rank = i + 1);
  const top3 = members.slice(0, 3);
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);
  const rest = members.slice(3);
  const medal = ['🥇', '🥈', '🥉'];

  const cell = (v, kind) => <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: kind === 'sold' ? RED : kind === 'owned' ? '#12388f' : '#0b7a3e' }}>{kind === 'sold' ? v : kind === 'owned' ? 'L' + v : '$' + Number(v).toLocaleString()}</span>;

  return (
    <AlShell active="dashboard" back={{ to: '/dashboard', label: 'Dashboard' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ background: NAVY, borderRadius: 20, color: '#fff', padding: '22px 26px', boxShadow: '0 24px 50px -28px rgba(10,31,82,.55)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(120deg,#c8102e,#e8203f)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trophy size={26} color="#fff" /></div>
          <div style={{ minWidth: 180 }}>
            <div style={{ fontWeight: 900, fontSize: 23, letterSpacing: -.6 }}>Weekly Leaderboard</div>
            <div style={{ fontSize: 13.5, color: '#c9d6f7', fontWeight: 600, marginTop: 2 }}>Top pack sellers across AdvantageLife — resets every Monday.</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, padding: '10px 16px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#ff8090' }}>Resets in</div>
            <div style={{ fontSize: 20, fontWeight: 900, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{reset || '—'}</div>
          </div>
        </div>

        {/* Sort toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {SORTS.map(({ key, label, Icon }) => {
            const on = key === sort;
            return <button key={key} onClick={() => setSort(key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 11, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', background: on ? NAVY : '#fff', color: on ? '#fff' : NAVY, border: '1.5px solid ' + (on ? NAVY : LINE) }}><Icon size={15} /> {label}</button>;
          })}
        </div>

        {/* Podium */}
        {podium.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 12, alignItems: 'end', marginBottom: 20 }}>
          {podium.map((m) => {
            const place = m._rank; const isG = place === 1;
            const border = place === 1 ? '#f5b301' : place === 2 ? '#9fb0c9' : '#cd7f4d';
            return <div key={m.username} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px -18px rgba(10,31,82,.25)', padding: '18px 14px', textAlign: 'center', borderTop: '4px solid ' + border, transform: isG ? 'translateY(-8px)' : 'none' }}>
              <div style={{ fontSize: 26 }}>{medal[place - 1]}</div>
              <div style={{ fontWeight: 900, fontSize: 15, marginTop: 4, color: NAVY }}>@{m.username}</div>
              <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>Level {m.owned}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: RED, marginTop: 8 }}>{S.fmt(S.col(m))}</div>
              <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{S.big}</div>
            </div>;
          })}
        </div>}

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px -18px rgba(10,31,82,.25)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 90px 90px 110px', padding: '12px 18px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: MUTED, borderBottom: '1.5px solid ' + LINE }}>
            <span>#</span><span>Member</span><span style={{ textAlign: 'right' }}>Sold</span><span style={{ textAlign: 'right' }}>Owned</span><span style={{ textAlign: 'right' }}>Revenue</span>
          </div>
          {rest.length === 0 && podium.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontWeight: 600 }}>No pack sales yet this week — be the first on the board!</div>}
          {rest.map((m) => (
            <div key={m.username} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 90px 90px 110px', padding: '14px 18px', alignItems: 'center', borderBottom: '1px solid #f1f4fa', fontSize: 14, background: m.is_you ? 'linear-gradient(90deg,rgba(200,16,46,.07),transparent)' : 'transparent', borderLeft: m.is_you ? '3px solid ' + RED : '3px solid transparent' }}>
              <span style={{ fontWeight: 900, color: NAVY }}>{m._rank}</span>
              <span style={{ fontWeight: 800, color: NAVY }}>@{m.username}{m.is_you && <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', background: RED, borderRadius: 20, padding: '2px 8px', marginLeft: 8 }}>YOU</span>}</span>
              {cell(m.sold, 'sold')}{cell(m.owned, 'owned')}{cell(m.revenue, 'revenue')}
            </div>
          ))}
        </div>

        {/* Your rank pin (if you're not on the visible board) */}
        {data.you && data.you.rank && data.you.rank > 50 && (
          <div style={{ marginTop: 12, background: '#fff', borderRadius: 14, border: '1.5px solid ' + RED, padding: '14px 18px', display: 'grid', gridTemplateColumns: '52px 1fr 90px 90px 110px', alignItems: 'center', fontSize: 14 }}>
            <span style={{ fontWeight: 900, color: NAVY }}>{data.you.rank}</span>
            <span style={{ fontWeight: 800, color: NAVY }}>You (@{data.you.username})</span>
            {cell(data.you.sold, 'sold')}{cell(data.you.owned, 'owned')}{cell(data.you.revenue, 'revenue')}
          </div>
        )}
      </div>
    </AlShell>
  );
}
