import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';
import AlShell from '../components/layout/AlShell';
import { UsersRound, Copy, Check } from 'lucide-react';

const NAVY = '#0a1f52', RED = '#c8102e', GRN = '#0b7a3e', MUTED = '#5a6584', LINE = '#e6ecf5';
const initials = (u) => (u || '?').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
const fmtDate = (iso) => { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (e) { return '—'; } };

export default function MyTeam() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState({});
  useEffect(() => { apiGet('/api/my-team').then(setData).catch(() => setData({ members: [], summary: {}, referral_link: '' })); }, []);

  if (!data) return <AlShell active="dashboard" back={{ to: '/dashboard', label: 'Dashboard' }}><div style={{ padding: 60, textAlign: 'center', color: MUTED }}>Loading your team…</div></AlShell>;

  const s = data.summary || {};
  const fullLink = (typeof window !== 'undefined' ? window.location.origin : 'https://advantagelife.club') + (data.referral_link || '');
  const copy = () => { try { navigator.clipboard && navigator.clipboard.writeText(fullLink); } catch (e) {} setCopied(true); setTimeout(() => setCopied(false), 1600); };

  const stat = (n, l, color) => (
    <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 14, padding: '15px 17px' }}>
      <div style={{ fontSize: 26, fontWeight: 900, color: color || NAVY }}>{n}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{l}</div>
    </div>
  );
  const chip = (ok, label) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 800, padding: '4px 7px', borderRadius: 7, whiteSpace: 'nowrap', background: ok ? 'rgba(46,204,113,.15)' : 'rgba(200,16,46,.12)', color: ok ? GRN : RED }}>{ok ? '✓' : '✗'} {label}</span>
  );
  const dcell = (k, v, color) => (
    <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 10, padding: '9px 11px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k}</div>
      <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2, color: color || NAVY }}>{v}</div>
    </div>
  );
  const hint = (m) => {
    const p = (m.pack_level || 0) > 0, w = !!m.watch_qualified, pay = !!m.has_payout;
    if (p && w && pay) return { good: true, text: 'Fully set up to earn — owns a pack, watch-qualified, payout ready. Now help them make their first sale.' };
    const miss = []; if (!p) miss.push('a pack'); if (!w) miss.push("today's watch"); if (!pay) miss.push('a payout method');
    return { good: false, text: 'Not fully set up yet — still needs ' + miss.join(' and ') + '. A quick nudge gets them earning.' };
  };

  return (
    <AlShell active="dashboard" back={{ to: '/dashboard', label: 'Dashboard' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ background: NAVY, borderRadius: 20, color: '#fff', padding: '22px 26px', boxShadow: '0 24px 50px -28px rgba(10,31,82,.55)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(120deg,#c8102e,#e8203f)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><UsersRound size={26} color="#fff" /></div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 23, letterSpacing: -.6 }}>My Team</div>
            <div style={{ fontSize: 13.5, color: '#c9d6f7', fontWeight: 600, marginTop: 2 }}>Members who joined through your link — tap anyone to see if they're set up to earn.</div>
          </div>
        </div>

        {/* Referral link */}
        <div style={{ background: 'linear-gradient(120deg,#0e2a6e,#0a1f52)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#ff8090' }}>Your referral link</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 3, wordBreak: 'break-all' }}>{fullLink}</div>
          </div>
          <button onClick={copy} style={{ marginLeft: 'auto', background: 'linear-gradient(120deg,#c8102e,#e8203f)', color: '#fff', border: 'none', borderRadius: 11, padding: '11px 18px', fontWeight: 900, fontSize: 13.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 12px 26px -10px rgba(200,16,46,.6)' }}>
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 18 }}>
          {stat(s.total ?? 0, 'Direct referrals')}
          {stat(s.active ?? 0, 'Active', GRN)}
          {stat(s.team_packs ?? 0, "Packs they've bought", RED)}
          {stat('$' + Number(s.total_earnings ?? 0).toLocaleString(), 'Your earnings', GRN)}
        </div>

        {/* Team table — coaching view: readiness gates per member, tap to expand */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px -18px rgba(10,31,82,.25)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 62px', gap: 8, padding: '12px 18px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: MUTED, borderBottom: '1.5px solid ' + LINE }}>
            <span>Member</span><span style={{ textAlign: 'center' }}>Ready to earn</span><span style={{ textAlign: 'right' }}>Sold</span>
          </div>
          {(data.members || []).length === 0 && <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontWeight: 600 }}>No referrals yet — share your link above to start building your team.</div>}
          {(data.members || []).map((m, i) => {
            const isOpen = !!open[i];
            const p = (m.pack_level || 0) > 0, w = !!m.watch_qualified, pay = !!m.has_payout;
            const h = hint(m);
            return (
              <div key={m.username + i} style={{ borderBottom: '1px solid #f1f4fa' }}>
                <div onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))} style={{ display: 'grid', gridTemplateColumns: '1fr auto 62px', gap: 8, padding: '13px 18px', alignItems: 'center', cursor: 'pointer', background: isOpen ? '#f4f7fd' : 'transparent' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#12388f,#0a1f52)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, marginRight: 11, flexShrink: 0 }}>{initials(m.username)}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 800, color: NAVY, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>@{m.username}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: MUTED, fontWeight: 600 }}>Joined {fmtDate(m.joined)}{m.is_active ? '' : ' · inactive'}</span>
                    </span>
                  </span>
                  <span style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {chip(p, p ? '$' + m.pack_level : 'Pack')}{chip(w, 'Watch')}{chip(pay, 'Pay')}
                  </span>
                  <span style={{ textAlign: 'right', fontWeight: 900, color: RED, fontVariantNumeric: 'tabular-nums' }}>{m.sold || 0} <span style={{ color: MUTED, fontSize: 11, fontWeight: 700 }}>{isOpen ? '▴' : '▾'}</span></span>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 18px 16px', background: '#f4f7fd' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 12 }}>
                      {dcell('Owns pack', p ? '$' + m.pack_level : 'None yet', p ? GRN : RED)}
                      {dcell('Watch-qualified', w ? 'Yes' : 'No', w ? GRN : RED)}
                      {dcell('Payout method', pay ? 'Set' : 'Not set', pay ? GRN : RED)}
                      {dcell('Packs bought', String(m.packs_bought || 0), NAVY)}
                    </div>
                    <div style={{ marginTop: 9, background: h.good ? 'rgba(46,204,113,.09)' : 'rgba(200,16,46,.07)', border: '1px solid ' + (h.good ? 'rgba(46,204,113,.28)' : 'rgba(200,16,46,.18)'), borderRadius: 10, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, color: h.good ? GRN : '#8a1023', lineHeight: 1.45 }}>{h.text}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AlShell>
  );
}
