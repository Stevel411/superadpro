import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';
import AlShell from '../components/layout/AlShell';
import { UsersRound, Copy, Check } from 'lucide-react';

const NAVY = '#0a1f52', RED = '#c8102e', MUTED = '#5a6584', LINE = '#e6ecf5';
const initials = (u) => (u || '?').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
const fmtDate = (iso) => { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (e) { return '—'; } };

export default function MyTeam() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { apiGet('/api/my-team').then(setData).catch(() => setData({ members: [], summary: {}, referral_link: '' })); }, []);

  if (!data) return <AlShell active="dashboard" back={{ to: '/home-preview', label: 'Dashboard' }}><div style={{ padding: 60, textAlign: 'center', color: MUTED, fontFamily: 'Sora,sans-serif' }}>Loading your team…</div></AlShell>;

  const s = data.summary || {};
  const fullLink = (typeof window !== 'undefined' ? window.location.origin : 'https://advantagelife.club') + (data.referral_link || '');
  const copy = () => { try { navigator.clipboard && navigator.clipboard.writeText(fullLink); } catch (e) {} setCopied(true); setTimeout(() => setCopied(false), 1600); };

  const stat = (n, l, color) => (
    <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 14, padding: '15px 17px' }}>
      <div style={{ fontSize: 26, fontWeight: 900, color: color || NAVY }}>{n}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{l}</div>
    </div>
  );

  return (
    <AlShell active="dashboard" back={{ to: '/home-preview', label: 'Dashboard' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ background: NAVY, borderRadius: 20, color: '#fff', padding: '22px 26px', boxShadow: '0 24px 50px -28px rgba(10,31,82,.55)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(120deg,#c8102e,#e8203f)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><UsersRound size={26} color="#fff" /></div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 23, letterSpacing: -.6 }}>My Team</div>
            <div style={{ fontSize: 13.5, color: '#c9d6f7', fontWeight: 600, marginTop: 2 }}>Members who joined through your link — and what they've bought.</div>
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
          {stat(s.active ?? 0, 'Active', '#0b7a3e')}
          {stat(s.team_packs ?? 0, "Packs they've bought", RED)}
          {stat('$' + Number(s.passup_earnings ?? 0).toLocaleString(), 'Your pass-up earnings', '#0b7a3e')}
        </div>

        {/* Team table */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px -18px rgba(10,31,82,.25)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 90px 100px', padding: '12px 18px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: MUTED, borderBottom: '1.5px solid ' + LINE }}>
            <span>Member</span><span style={{ textAlign: 'right' }}>Pack</span><span style={{ textAlign: 'right' }}>Joined</span><span style={{ textAlign: 'right' }}>Sold</span><span style={{ textAlign: 'center' }}>Status</span>
          </div>
          {(data.members || []).length === 0 && <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontWeight: 600 }}>No referrals yet — share your link above to start building your team.</div>}
          {(data.members || []).map((m, i) => (
            <div key={m.username + i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px 90px 100px', padding: '14px 18px', alignItems: 'center', borderBottom: '1px solid #f1f4fa', fontSize: 14 }}>
              <span style={{ fontWeight: 800, color: NAVY, display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#12388f,#0a1f52)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, marginRight: 10 }}>{initials(m.username)}</span>
                @{m.username}
              </span>
              <span style={{ fontWeight: 800, color: '#12388f', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.pack_level ? 'L' + m.pack_level : '—'}</span>
              <span style={{ color: MUTED, fontWeight: 600, fontSize: 13, textAlign: 'right' }}>{fmtDate(m.joined)}</span>
              <span style={{ fontWeight: 800, color: RED, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.sold || 0}</span>
              <span style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: 900, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', background: m.is_active ? '#e7f6ee' : '#eef1f8', color: m.is_active ? '#0b7a3e' : MUTED }}>{m.is_active ? 'Active' : 'Inactive'}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </AlShell>
  );
}
