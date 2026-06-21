import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Star, Check, ArrowUpRight, Wallet, TrendingUp, Layers, Sparkles } from 'lucide-react';

// ── The proposed New Profit Grid, presented to members for feedback. ──────────
// Mirrors docs/platform-assets New-Profit-Grid-Plan-50 proposal. Figures are
// illustrative on the $50 tier. NOT LIVE — no live commission code is touched.

var INK = '#0a1438';
var INK2 = '#15275f';
var CYAN = '#06b6d4';
var CYANB = '#22d3ee';
var GOLD = '#f59e0b';
var VIOLET = '#7c3aed';
var VIOLETB = '#8b5cf6';
var LINE = '#e4eaf3';
var MUTED = '#64748b';

var CARD_SHADOW = 'inset 0 1px 0 rgba(255,255,255,.9), 0 2px 6px rgba(10,20,56,.09), 0 20px 44px rgba(10,20,56,.10)';

var SHARES = [
  { label: 'Direct sponsor', pct: '40%', amt: '$20.00', color: GOLD,
    note: 'Cash, paid instantly to whoever referred them.' },
  { label: 'Uni-level — 4 levels', pct: '20%', amt: '$10.00', color: CYAN,
    note: '$2.50 to each of 4 levels up your sponsor line, cash.' },
  { label: 'Locked welcome bonus', pct: '15%', amt: '$7.50', color: INK2,
    note: "Waits in the new member's wallet — unlocked when they activate." },
  { label: 'Bonus pool', pct: '25%', amt: '$12.50', color: VIOLET,
    note: 'Paid out as the grid fills — at seats 4, 8, 12 & 16.', split: true },
];

var COMPLETION = [
  { label: 'Direct sponsor commissions', sub: '16 × $20', amt: '$320.00' },
  { label: 'Uni-level, 4 levels', sub: '16 × $10', amt: '$160.00' },
  { label: 'Locked welcome bonuses', sub: '16 × $7.50', amt: '$120.00' },
  { label: 'Grid bonuses', sub: '$100 cash + $100 step-up', amt: '$200.00' },
];

var HOW = [
  { n: 1, icon: TrendingUp, title: 'Strong direct pay',
    desc: 'Refer someone and you earn 40% — $20 on a $50 tier — the moment they activate. The biggest share goes to the person who did the work.' },
  { n: 2, icon: Layers, title: 'Four levels of team pay',
    desc: "You also earn on four levels of your team's activations, so a growing organisation keeps paying you as it deepens." },
  { n: 3, icon: Wallet, title: 'The locked welcome bonus',
    desc: "Every new member sees a bonus waiting in their wallet the moment they join — locked. They unlock it by activating. It's the built-in nudge that turns sign-ups into active members." },
  { n: 4, icon: ArrowUpRight, title: 'Step-up credit climbs the tiers',
    desc: 'Half of every grid bonus is cash you can withdraw. The other half is step-up credit that automatically moves you up to the next tier — so completing one grid funds your way into the next.' },
];

var SEATS = [
  { n: 1,  name: 'Maria K', ini: 'M',  role: 'direct' },
  { n: 2,  name: 'James T', ini: 'JT', role: 'spill' },
  { n: 3,  name: 'Aisha R', ini: 'AR', role: 'spill' },
  { n: 4,  name: 'Devon L', ini: 'DL', role: 'bonusPaid' },
  { n: 5,  name: 'Sofia M', ini: 'SM', role: 'spill' },
  { n: 6,  name: 'Tariq B', ini: 'TB', role: 'spill' },
  { n: 7,  role: 'open' },
  { n: 8,  role: 'bonusOpen' },
  { n: 9,  role: 'open' },
  { n: 10, role: 'open' },
  { n: 11, role: 'open' },
  { n: 12, role: 'bonusOpen' },
  { n: 13, role: 'open' },
  { n: 14, role: 'open' },
  { n: 15, role: 'open' },
  { n: 16, role: 'bonusOpen' },
];

var SENTIMENTS = [
  { key: 'love',   label: 'Love it' },
  { key: 'good',   label: "It's good" },
  { key: 'unsure', label: 'On the fence' },
  { key: 'no',     label: 'Not for me' },
];

function Pill() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
      borderRadius: 999, background: 'rgba(124,58,237,.10)', color: VIOLET,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
      letterSpacing: 1, textTransform: 'uppercase',
    }}>
      <Sparkles size={12} /> Proposal · For member feedback
    </span>
  );
}

function ShareRow(s) {
  return (
    <div key={s.label} style={{
      display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px',
      borderBottom: '1px solid ' + LINE,
    }}>
      <div style={{ width: 6, alignSelf: 'stretch', borderRadius: 4, background: s.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15, color: INK }}>{s.label}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: s.color }}>{s.pct}</span>
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 3, lineHeight: 1.5 }}>{s.note}</div>
        {s.split && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 130, background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.18)', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: VIOLET, fontFamily: 'JetBrains Mono, monospace' }}>CASH · 12.5%</div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: INK, marginTop: 2 }}>$6.25</div>
              <div style={{ fontSize: 11, color: MUTED }}>Withdrawable</div>
            </div>
            <div style={{ flex: 1, minWidth: 130, background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.18)', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: VIOLET, fontFamily: 'JetBrains Mono, monospace' }}>STEP-UP · 12.5%</div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: INK, marginTop: 2 }}>$6.25</div>
              <div style={{ fontSize: 11, color: MUTED }}>Auto-applies to next tier</div>
            </div>
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 17, color: INK, whiteSpace: 'nowrap' }}>{s.amt}</div>
    </div>
  );
}

function Seat(s) {
  var base = {
    position: 'relative', borderRadius: 12, padding: '12px 10px', minHeight: 92,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', overflow: 'hidden',
  };
  var num = (
    <span style={{ position: 'absolute', top: 7, left: 9, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, opacity: .6 }}>
      {String(s.n).padStart(2, '0')}
    </span>
  );

  if (s.role === 'open') {
    return (
      <div key={s.n} style={{ ...base, border: '2px dashed ' + '#cdd7ea', background: '#f8fafc', color: '#94a3b8' }}>
        {num}
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800 }}>{String(s.n).padStart(2, '0')}</span>
      </div>
    );
  }
  if (s.role === 'bonusOpen') {
    return (
      <div key={s.n} style={{ ...base, border: '2px dashed ' + VIOLETB, background: 'rgba(124,58,237,.06)', color: VIOLET }}>
        {num}
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800 }}>{String(s.n).padStart(2, '0')}</span>
        <Star size={16} fill={VIOLET} stroke={VIOLET} style={{ margin: '3px 0' }} />
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 800 }}>$50</span>
      </div>
    );
  }

  var color = s.role === 'direct' ? GOLD : (s.role === 'bonusPaid' ? VIOLET : CYAN);
  var bg = s.role === 'direct'
    ? 'linear-gradient(135deg,#fbbf24,#f59e0b)'
    : (s.role === 'bonusPaid' ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'linear-gradient(135deg,#22d3ee,#06b6d4)');
  var roleLabel = s.role === 'direct' ? 'DIRECT' : (s.role === 'bonusPaid' ? '$50 PAID' : 'SPILLOVER');

  return (
    <div key={s.n} style={{ ...base, background: bg, color: '#fff', boxShadow: '0 6px 16px rgba(10,20,56,.14)' }}>
      <span style={{ position: 'absolute', top: 7, left: 9, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>
        {String(s.n).padStart(2, '0')}
      </span>
      {s.role === 'bonusPaid' && (
        <span style={{ position: 'absolute', top: 6, right: 8 }}><Star size={13} fill="#fff" stroke="#fff" /></span>
      )}
      <span style={{
        width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.22)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 800, marginBottom: 5,
      }}>{s.ini}</span>
      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 12.5, fontWeight: 700, lineHeight: 1.1 }}>{s.name}</span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, fontWeight: 700, letterSpacing: .6, marginTop: 3, opacity: .92 }}>{roleLabel}</span>
    </div>
  );
}

function LegendDot(p) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: INK, fontWeight: 600 }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, background: p.bg, border: p.border ? '2px dashed ' + p.border : 'none', flexShrink: 0 }} />
      {p.label}
    </span>
  );
}

export default function ProposedGrid() {
  var [sentiment, setSentiment] = useState(null);
  var [comment, setComment] = useState('');
  var [saved, setSaved] = useState(false);
  var [saving, setSaving] = useState(false);
  var [err, setErr] = useState('');

  useEffect(function () {
    apiGet('/api/grid-plan-feedback').then(function (r) {
      if (r && r.mine) {
        setSentiment(r.mine.sentiment);
        setComment(r.mine.comment || '');
        setSaved(true);
      }
    }).catch(function () {});
  }, []);

  function submit() {
    if (!sentiment) { setErr('Pick how you feel about it first.'); return; }
    setSaving(true); setErr('');
    apiPost('/api/grid-plan-feedback', { sentiment: sentiment, comment: comment })
      .then(function () { setSaved(true); setSaving(false); })
      .catch(function (e) { setErr(e.message || 'Could not save — try again.'); setSaving(false); });
  }

  var card = { background: '#fff', border: '1px solid ' + LINE, borderRadius: 18, boxShadow: CARD_SHADOW };
  var sectionTitle = { fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: INK, margin: '0 0 4px' };
  var sectionSub = { fontSize: 14, color: MUTED, margin: '0 0 18px', lineHeight: 1.55 };

  return (
    <AppLayout categoryBack={{ to: '/home-preview', label: 'Dashboard' }} title="The New Profit Grid" subtitle="How it pays — worked on the $50 Campaign Tier">
      <div style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 60 }}>

        {/* Intro */}
        <div style={{ marginBottom: 24 }}>
          <Pill />
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 30, fontWeight: 800, color: INK, margin: '14px 0 6px', lineHeight: 1.1 }}>
            100% of every Profit Grid commission goes to members
          </h1>
          <p style={{ fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.6 }}>
            The company doesn't take a cent from the Grid. Here's where every $50 lands — four shares, every one to a member.
          </p>
        </div>

        {/* Where every $50 goes */}
        <div style={{ ...card, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ padding: '18px 18px 4px' }}>
            <h2 style={sectionTitle}>Where every $50 goes</h2>
            <p style={sectionSub}>Four shares, every one to a member. Only the bonus pool splits into cash and step-up credit — the rest is straightforward.</p>
          </div>
          {SHARES.map(ShareRow)}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: INK, color: '#fff' }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15 }}>Total — 100% to members · $0 to the company</span>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 20 }}>$50.00</span>
          </div>
        </div>

        {/* The grid */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>Your grid — a bonus every 4 seats</h2>
          <p style={sectionSub}>Refer one, and overspill from your upline helps fill the rest. Every 4th seat pays the same flat bonus.</p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
            <LegendDot bg={'linear-gradient(135deg,#fbbf24,#f59e0b)'} label="Your direct referral" />
            <LegendDot bg={'linear-gradient(135deg,#22d3ee,#06b6d4)'} label="Spillover (overspill)" />
            <LegendDot bg={'linear-gradient(135deg,#7c3aed,#6d28d9)'} label="Bonus seat — $50" />
            <LegendDot bg={'#f8fafc'} border={'#cdd7ea'} label="Open seat" />
          </div>

          <div style={{ ...card, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 9 }}>
              {SEATS.map(Seat)}
            </div>
          </div>

          <div style={{ marginTop: 14, padding: '16px 18px', background: 'rgba(124,58,237,.05)', border: '1px solid rgba(124,58,237,.18)', borderRadius: 14 }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14, color: VIOLET, marginBottom: 4 }}>Every starred seat pays the same</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 22, color: INK }}>
              $50.00 <span style={{ fontSize: 14, fontWeight: 600, color: MUTED }}>at seats 4, 8, 12 &amp; 16</span>
            </div>
            <div style={{ fontSize: 13.5, color: '#475569', marginTop: 6, lineHeight: 1.55 }}>
              <strong>$25.00 cash</strong> + <strong>$25.00 step-up credit</strong>, every time. Complete a full grid and that's <strong>$100 cash plus $100 toward your next tier</strong>.
            </div>
          </div>
        </div>

        {/* Completion */}
        <div style={{ ...card, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ padding: '18px 18px 4px' }}>
            <h2 style={sectionTitle}>When the grid completes</h2>
            <p style={sectionSub}>A full grid is 16 activations — $800 flowing in. Here's exactly where all of it lands.</p>
          </div>
          {COMPLETION.map(function (c) {
            return (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid ' + LINE }}>
                <div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14.5, color: INK }}>{c.label}</div>
                  <div style={{ fontSize: 12.5, color: MUTED, fontFamily: 'JetBrains Mono, monospace' }}>{c.sub}</div>
                </div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 16, color: INK }}>{c.amt}</div>
              </div>
            );
          })}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'linear-gradient(135deg,' + CYAN + ',' + INK2 + ')', color: '#fff' }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15 }}>Total — 100% to members</span>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 20 }}>$800.00</span>
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>How it works, in plain English</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 16 }}>
            {HOW.map(function (h) {
              var Icon = h.icon;
              return (
                <div key={h.n} style={{ ...card, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(6,182,212,.10)', color: CYAN, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} />
                    </span>
                    <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15, color: INK }}>{h.title}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#475569', margin: 0, lineHeight: 1.55 }}>{h.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback */}
        <div style={{ ...card, padding: 22, marginBottom: 22, borderColor: 'rgba(6,182,212,.35)' }}>
          <h2 style={{ ...sectionTitle, fontSize: 20 }}>What do you think?</h2>
          <p style={sectionSub}>This is a proposal, and your feedback shapes it. Tell us what you'd change before we build it.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 14 }}>
            {SENTIMENTS.map(function (s) {
              var on = sentiment === s.key;
              return (
                <button key={s.key} onClick={function () { setSentiment(s.key); setSaved(false); setErr(''); }}
                  style={{
                    padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
                    border: on ? '2px solid ' + CYAN : '2px solid ' + LINE,
                    background: on ? 'rgba(6,182,212,.08)' : '#fff',
                    color: on ? INK : '#475569', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'border-color .12s',
                  }}>
                  {on && <Check size={15} color={CYAN} />}{s.label}
                </button>
              );
            })}
          </div>

          <textarea value={comment} onChange={function (e) { setComment(e.target.value); setSaved(false); }}
            placeholder="Anything you'd change? (optional)"
            maxLength={1000}
            style={{
              width: '100%', minHeight: 92, padding: '12px 14px', borderRadius: 12, border: '1px solid ' + LINE,
              fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: INK, resize: 'vertical', boxSizing: 'border-box',
            }} />

          {err && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{err}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <button onClick={submit} disabled={saving}
              style={{
                padding: '12px 22px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer',
                background: INK, color: '#fff', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14.5,
                opacity: saving ? .6 : 1,
              }}>
              {saved ? 'Update my feedback' : (saving ? 'Saving…' : 'Send feedback')}
            </button>
            {saved && <span style={{ color: '#059669', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Check size={16} /> Thanks — your feedback is in.</span>}
          </div>
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
          This is a proposed compensation plan shared with members for feedback. It is not yet live and the figures may change.
          All amounts shown are illustrations of how the plan's mechanics work — they are not a promise, projection, or guarantee of income.
          What you earn depends entirely on your own effort and the activity of the people you introduce, and many members earn little or nothing.
          The SuperAdPro toolkit can be used to grow your own business whether or not you ever refer anyone. "Spillover" depends on the activity
          of your upline and is never guaranteed; the names and grid shown are an illustrative example only.
        </p>
      </div>
    </AppLayout>
  );
}
