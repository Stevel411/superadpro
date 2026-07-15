import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../utils/api';
import AlShell from '../components/layout/AlShell';
import { Gauge, ShieldCheck, Coins, Users, RefreshCw, Check, X, ExternalLink, Wallet, Handshake } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────
   AdvantageLife admin — built for the pack / pass-up model.
   The legacy AdminDashboard reports the retired business (grids,
   memberships, Creator Credits) and never reads PackCommission —
   the table AL actually pays from. This reports what AL IS now.
   ──────────────────────────────────────────────────────────────── */

const NAVY = '#0a1f52', RED = '#c8102e', MUTED = '#5a6584', LINE = '#e6ecf5', GREEN = '#0b7a3e';
const money = (n) => '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const TABS = [
  { key: 'overview', label: 'Overview', Icon: Gauge },
  { key: 'share', label: 'Share Approval', Icon: ShieldCheck },
  { key: 'sales', label: 'Pack Sales', Icon: Coins },
  { key: 'finances', label: 'Finances', Icon: Wallet },
  { key: 'settlements', label: 'Settlements', Icon: Handshake },
  { key: 'members', label: 'Members', Icon: Users },
];

const card = { background: '#fff', border: '1px solid ' + LINE, borderRadius: 14, padding: '15px 17px' };
const th = { padding: '11px 14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: MUTED, textAlign: 'left' };
const td = { padding: '12px 14px', fontSize: 13.5, borderTop: '1px solid #f1f4fa' };

function Stat({ n, l, color }) {
  return <div style={card}>
    <div style={{ fontSize: 25, fontWeight: 900, color: color || NAVY }}>{n}</div>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{l}</div>
  </div>;
}

function Overview({ d }) {
  if (!d) return <div style={{ color: MUTED, fontWeight: 600, padding: 30 }}>Loading…</div>;
  const s = d.share_queue || {}, st = d.settlements || {}, cw = d.commissions_this_week || {};
  const company = cw.company || cw.pass_up_company || null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 9 }}>Pack sales</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          <Stat n={d.sales?.today?.count ?? 0} l="Sold today" color={RED} />
          <Stat n={money(d.sales?.today?.value)} l="Value today" color={GREEN} />
          <Stat n={d.sales?.week?.count ?? 0} l="Sold this week" color={RED} />
          <Stat n={money(d.sales?.week?.value)} l="Value this week" color={GREEN} />
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 9 }}>Members</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          <Stat n={d.members?.total ?? 0} l="Total members" />
          <Stat n={d.members?.with_packs ?? 0} l="Own a pack" />
          <Stat n={d.members?.new_this_week ?? 0} l="Joined this week" />
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>Commissions this week</div>
        <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 600, marginBottom: 9 }}>
          Company earnings rising is the early warning that members are failing the earning gates.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {Object.keys(cw).length === 0 && <div style={{ ...card, color: MUTED, fontWeight: 600, fontSize: 13 }}>No commissions yet this week.</div>}
          {Object.entries(cw).map(([k, v]) => (
            <Stat key={k} n={money(v.value)} l={`${k.replace(/_/g, ' ')} (${v.count})`} color={k.includes('company') ? RED : NAVY} />
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 9 }}>Needs attention</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
          <Stat n={s.awaiting_approval ?? 0} l="Share approvals waiting" color={(s.awaiting_approval > 0) ? RED : NAVY} />
          <Stat n={st.disputed ?? 0} l="Disputed settlements" color={(st.disputed > 0) ? RED : NAVY} />
          <Stat n={st.proof_submitted ?? 0} l="Proofs to confirm" />
          <Stat n={st.pending ?? 0} l="Pending intents" />
          <Stat n={s.verified_views_this_week ?? 0} l="Verified share views (wk)" color={GREEN} />
          <Stat n={s.approved ?? 0} l="Campaigns share-approved" />
        </div>
      </div>
    </div>
  );
}

function ShareQueue({ reload }) {
  const [state, setState] = useState('pending');
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = useCallback(() => {
    setRows(null);
    apiGet(`/admin/api/al/share-queue?state=${state}`).then(d => setRows(d.campaigns || [])).catch(() => setRows([]));
  }, [state]);
  useEffect(() => { load(); }, [load]);

  const act = async (id, approve) => {
    setBusy(id);
    try {
      await apiPost('/admin/api/al/share-approve', { campaign_id: id, approve });
      setRows(r => r.filter(x => x.id !== id));
      reload && reload();
    } catch (e) { /* leave row in place */ }
    setBusy(null);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: MUTED, fontWeight: 600, marginBottom: 12, maxWidth: 760, lineHeight: 1.55 }}>
        Approved campaigns appear on members' <b>public</b> share pages, promoted to their own friends and family.
        Nothing goes public without a decision here.
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['pending', 'approved'].map(s => (
          <button key={s} onClick={() => setState(s)} style={{ padding: '8px 15px', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', background: state === s ? NAVY : '#fff', color: state === s ? '#fff' : NAVY, border: '1.5px solid ' + (state === s ? NAVY : LINE) }}>
            {s === 'pending' ? 'Awaiting approval' : 'Approved'}
          </button>
        ))}
      </div>
      {!rows ? <div style={{ color: MUTED, fontWeight: 600, padding: 20 }}>Loading…</div>
        : rows.length === 0 ? <div style={{ ...card, textAlign: 'center', color: MUTED, fontWeight: 600, padding: 34 }}>{state === 'pending' ? 'Nothing waiting — queue is clear.' : 'No approved campaigns yet.'}</div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
            {rows.map(c => (
              <div key={c.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 900, fontSize: 14.5, color: NAVY }}>{c.title}</div>
                <div style={{ fontSize: 12, color: MUTED, fontWeight: 700 }}>@{c.owner} · {c.platform} · tier {c.owner_tier || 1} · {c.views_delivered || 0}/{c.views_target || 0} views</div>
                {c.description && <div style={{ fontSize: 12.5, color: '#42506e', lineHeight: 1.5 }}>{c.description.slice(0, 180)}{c.description.length > 180 ? '…' : ''}</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, fontWeight: 700 }}>
                  <a href={c.video_url} target="_blank" rel="noreferrer" style={{ color: '#12388f', display: 'inline-flex', alignItems: 'center', gap: 4 }}><ExternalLink size={12} /> Watch video</a>
                  {c.cta_url && <a href={c.cta_url} target="_blank" rel="noreferrer" style={{ color: '#12388f', display: 'inline-flex', alignItems: 'center', gap: 4 }}><ExternalLink size={12} /> CTA destination</a>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {state === 'pending' ? (
                    <button disabled={busy === c.id} onClick={() => act(c.id, true)} style={{ flex: 1, background: GREEN, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 12px', fontWeight: 900, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Check size={14} /> Approve for sharing</button>
                  ) : (
                    <button disabled={busy === c.id} onClick={() => act(c.id, false)} style={{ flex: 1, background: '#fff', color: RED, border: '1.5px solid ' + RED, borderRadius: 9, padding: '9px 12px', fontWeight: 900, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><X size={14} /> Revoke</button>
                  )}
                </div>
              </div>
            ))}
          </div>}
    </div>
  );
}

function PackSales() {
  const [rows, setRows] = useState(null);
  useEffect(() => { apiGet('/admin/api/al/pack-sales?limit=100').then(d => setRows(d.sales || [])).catch(() => setRows([])); }, []);
  if (!rows) return <div style={{ color: MUTED, fontWeight: 600, padding: 20 }}>Loading…</div>;
  if (rows.length === 0) return <div style={{ ...card, textAlign: 'center', color: MUTED, fontWeight: 600, padding: 34 }}>No pack sales yet.</div>;
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid ' + LINE, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead><tr style={{ background: '#f8fafd' }}>
            <th style={th}>#</th><th style={th}>Buyer</th><th style={th}>Pack</th><th style={th}>Amount</th><th style={th}>Where the money went</th><th style={th}>When</th>
          </tr></thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id}>
                <td style={{ ...td, color: MUTED, fontWeight: 700 }}>{s.id}</td>
                <td style={{ ...td, fontWeight: 800, color: NAVY }}>@{s.buyer}</td>
                <td style={{ ...td, fontWeight: 800, color: '#12388f' }}>L{s.pack_level}</td>
                <td style={{ ...td, fontWeight: 800 }}>{money(s.amount)}</td>
                <td style={td}>
                  {s.commissions.length === 0 ? <span style={{ color: MUTED }}>—</span> : s.commissions.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 20, background: c.earner === 'COMPANY' ? '#fdeaec' : '#eef1f8', color: c.earner === 'COMPANY' ? RED : NAVY }}>{(c.type || '').replace(/_/g, ' ')}</span>
                      <b style={{ color: c.earner === 'COMPANY' ? RED : NAVY }}>{c.earner === 'COMPANY' ? 'COMPANY' : '@' + c.earner}</b>
                      <span style={{ color: GREEN, fontWeight: 800 }}>{money(c.amount)}</span>
                      {c.pass_up_depth ? <span style={{ color: MUTED, fontSize: 11 }}>depth {c.pass_up_depth}</span> : null}
                    </div>
                  ))}
                </td>
                <td style={{ ...td, color: MUTED, fontSize: 12.5 }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Members() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const load = useCallback(() => {
    setRows(null);
    apiGet('/admin/api/al/members?limit=50&q=' + encodeURIComponent(q)).then(d => setRows(d.members || [])).catch(() => setRows([]));
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  const pill = (ok, label) => <span style={{ fontSize: 10.5, fontWeight: 900, padding: '2px 8px', borderRadius: 20, background: ok ? '#e7f6ee' : '#fdeaec', color: ok ? GREEN : RED }}>{label}</span>;
  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search username…"
             style={{ width: '100%', maxWidth: 320, padding: '10px 13px', borderRadius: 10, border: '1.5px solid ' + LINE, fontSize: 13.5, fontFamily: 'inherit', marginBottom: 14 }} />
      {!rows ? <div style={{ color: MUTED, fontWeight: 600, padding: 20 }}>Loading…</div>
        : <div style={{ background: '#fff', borderRadius: 14, border: '1px solid ' + LINE, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead><tr style={{ background: '#f8fafd' }}>
              <th style={th}>Member</th><th style={th}>Owns</th><th style={th}>Sales</th><th style={th}>Sponsor</th><th style={th}>Pass-up to</th><th style={th}>Can earn?</th>
            </tr></thead>
            <tbody>
              {rows.map(m => (
                <tr key={m.id}>
                  <td style={{ ...td, fontWeight: 800, color: NAVY }}>@{m.username}{m.is_admin && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 900, color: '#fff', background: NAVY, borderRadius: 20, padding: '2px 7px' }}>ADMIN</span>}</td>
                  <td style={{ ...td, fontWeight: 800, color: '#12388f' }}>{m.owned_level ? 'L' + m.owned_level : '—'}</td>
                  <td style={{ ...td, fontWeight: 800, color: RED }}>{m.pack_sale_count}</td>
                  <td style={{ ...td, color: MUTED }}>{m.sponsor_id || '—'}</td>
                  <td style={{ ...td, color: MUTED }}>{m.pass_up_sponsor_id || '—'}</td>
                  <td style={td}><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{pill(m.watch_qualified, 'watch')}{pill(m.payable, 'payout')}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
    </div>
  );
}


function Finances() {
  const [d, setD] = useState(null);
  useEffect(() => { apiGet('/admin/api/al/finances').then(setD).catch(() => setD(null)); }, []);
  if (!d) return <div style={{ color: MUTED, fontWeight: 600, padding: 20 }}>Loading…</div>;
  const pi = d.platform_income || {}, gm = d.member_gmv || {}, c = d.commissions || {}, w = d.withdrawals || {};
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '12px 15px', fontSize: 12.5, color: '#7c2d12', fontWeight: 600, lineHeight: 1.55 }}>
        Pack money is 100% member-to-member and moves off-platform — it is <b>member GMV, not platform revenue</b>.
        The platform earns from $100 lifetime joins, plus commissions that fell to the company because a member failed a gate.
      </div>

      <div>
        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 9 }}>Platform income</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          <Stat n={money(pi.total)} l="Total platform income" color={GREEN} />
          <Stat n={money(pi.lifetime_joins?.value)} l={`Lifetime joins (${pi.lifetime_joins?.members ?? 0})`} />
          <Stat n={money(pi.company_fallback_commissions)} l="Fell to company" color={RED} />
        </div>
        <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginTop: 7 }}>{pi.note}</div>
      </div>

      <div>
        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 9 }}>Member-to-member (pack sales)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          <Stat n={money(gm.all_time)} l="GMV all time" />
          <Stat n={money(gm.this_week)} l="GMV this week" />
          <Stat n={c.member_share_pct != null ? c.member_share_pct + '%' : '—'} l="Commission reaching members" color={GREEN} />
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 9 }}>Commissions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          <Stat n={money(c.to_members_all_time)} l="To members (all time)" color={GREEN} />
          <Stat n={money(c.to_company_all_time)} l="To company (all time)" color={RED} />
          <Stat n={money(c.paid)} l="Paid" />
          <Stat n={money(c.pending)} l="Pending" />
        </div>
        <div style={{ marginTop: 12, background: '#fff', border: '1px solid ' + LINE, borderRadius: 14, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
            <thead><tr style={{ background: '#f8fafd' }}><th style={th}>Type</th><th style={th}>All time</th><th style={th}>This week</th></tr></thead>
            <tbody>
              {Object.keys(c.by_type_all_time || {}).length === 0 && <tr><td style={{ ...td, color: MUTED }} colSpan={3}>No commissions recorded yet.</td></tr>}
              {Object.entries(c.by_type_all_time || {}).map(([k, v]) => {
                const wk = (c.by_type_this_week || {})[k];
                const isCo = k.includes('company');
                return <tr key={k}>
                  <td style={{ ...td, fontWeight: 800, color: isCo ? RED : NAVY }}>{k.replace(/_/g, ' ')}</td>
                  <td style={td}>{money(v.value)} <span style={{ color: MUTED }}>({v.count})</span></td>
                  <td style={td}>{wk ? money(wk.value) + ' (' + wk.count + ')' : '—'}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: '#f8fafd', border: '1px solid ' + LINE, borderRadius: 12, padding: '13px 16px', fontSize: 12.5, color: MUTED, fontWeight: 600, lineHeight: 1.55 }}>
        <b style={{ color: NAVY }}>No withdrawals, no balances.</b> AdvantageLife never holds member money —
        buyers pay earners directly using the payee's payout details. Member balances and withdrawal queues are
        SuperAdPro concepts. Money-flow health lives in <b style={{ color: NAVY }}>Settlements</b> (intents, proofs, disputes).
      </div>
    </div>
  );
}

function Settlements() {
  const [status, setStatus] = useState('');
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    apiGet('/admin/api/al/settlements-view' + (status ? '?status=' + status : '')).then(setD).catch(() => setD({ intents: [], counts: {} }));
  }, [status]);
  const counts = (d && d.counts) || {};
  const chip = (s, label) => {
    const on = status === s;
    return <button key={s || 'all'} onClick={() => setStatus(s)} style={{ padding: '8px 14px', borderRadius: 10, fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', background: on ? NAVY : '#fff', color: on ? '#fff' : NAVY, border: '1.5px solid ' + (on ? NAVY : LINE) }}>
      {label}{s && counts[s] != null ? ` (${counts[s]})` : ''}
    </button>;
  };
  const tone = { disputed: RED, proof_submitted: '#b45309', confirmed: GREEN, pending: MUTED, expired: MUTED, cancelled: MUTED };
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {chip('', 'All')}{chip('pending', 'Pending')}{chip('proof_submitted', 'Proof submitted')}
        {chip('disputed', 'Disputed')}{chip('confirmed', 'Confirmed')}{chip('expired', 'Expired')}
      </div>
      {!d ? <div style={{ color: MUTED, fontWeight: 600, padding: 20 }}>Loading…</div>
        : (d.intents || []).length === 0 ? <div style={{ ...card, textAlign: 'center', color: MUTED, fontWeight: 600, padding: 34 }}>No settlements here.</div>
          : <div style={{ background: '#fff', borderRadius: 14, border: '1px solid ' + LINE, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
              <thead><tr style={{ background: '#f8fafd' }}>
                <th style={th}>#</th><th style={th}>Buyer pays</th><th style={th}>Earner</th><th style={th}>Pack</th><th style={th}>Amount</th><th style={th}>Type</th><th style={th}>Status</th><th style={th}>Proof</th>
              </tr></thead>
              <tbody>
                {d.intents.map(i => (
                  <tr key={i.id}>
                    <td style={{ ...td, color: MUTED, fontWeight: 700 }}>{i.id}</td>
                    <td style={{ ...td, fontWeight: 800, color: NAVY }}>@{i.buyer}</td>
                    <td style={{ ...td, fontWeight: 800, color: i.earner === 'COMPANY' ? RED : NAVY }}>{i.earner === 'COMPANY' ? 'COMPANY' : '@' + i.earner}</td>
                    <td style={{ ...td, fontWeight: 800, color: '#12388f' }}>L{i.pack_level}</td>
                    <td style={{ ...td, fontWeight: 800 }}>{money(i.amount)}</td>
                    <td style={{ ...td, fontSize: 12, color: MUTED }}>{(i.commission_type || '').replace(/_/g, ' ')}{i.pass_up_depth ? ' · d' + i.pass_up_depth : ''}</td>
                    <td style={td}><span style={{ fontSize: 10.5, fontWeight: 900, padding: '2px 8px', borderRadius: 20, background: '#f1f4fa', color: tone[i.status] || NAVY }}>{(i.status || '').replace(/_/g, ' ')}</span></td>
                    <td style={td}>{i.proof_url ? <a href={i.proof_url} target="_blank" rel="noreferrer" style={{ color: '#12388f', fontWeight: 700, fontSize: 12 }}>View</a> : <span style={{ color: MUTED }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
    </div>
  );
}

export default function AdminAL() {
  const [tab, setTab] = useState('overview');
  const [ov, setOv] = useState(null);
  const loadOv = useCallback(() => { apiGet('/admin/api/al/overview').then(setOv).catch(() => setOv(null)); }, []);
  useEffect(() => { loadOv(); }, [loadOv]);

  return (
    <AlShell active="dashboard" back={{ to: '/home-preview', label: 'Dashboard' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ background: NAVY, borderRadius: 20, color: '#fff', padding: '22px 26px', boxShadow: '0 24px 50px -28px rgba(10,31,82,.55)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(120deg,#c8102e,#e8203f)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Gauge size={26} color="#fff" /></div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 23, letterSpacing: -.6 }}>AdvantageLife Admin</div>
            <div style={{ fontSize: 13.5, color: '#c9d6f7', fontWeight: 600, marginTop: 2 }}>Packs, pass-ups, settlements and share approvals.</div>
          </div>
          <button onClick={loadOv} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 10, padding: '9px 15px', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Refresh</button>
        </div>

        <div style={{ display: 'flex', gap: 6, borderBottom: '2px solid ' + LINE, marginBottom: 18, flexWrap: 'wrap' }}>
          {TABS.map(({ key, label, Icon }) => {
            const on = key === tab;
            const badge = key === 'share' ? (ov?.share_queue?.awaiting_approval || 0) : 0;
            return <button key={key} onClick={() => setTab(key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 16px', fontWeight: 800, fontSize: 13.5, color: on ? RED : MUTED, background: 'none', border: 'none', borderBottom: '2px solid ' + (on ? RED : 'transparent'), marginBottom: -2, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Icon size={15} /> {label}
              {badge > 0 && <span style={{ fontSize: 10.5, fontWeight: 900, color: '#fff', background: RED, borderRadius: 20, padding: '1px 7px' }}>{badge}</span>}
            </button>;
          })}
        </div>

        {tab === 'overview' && <Overview d={ov} />}
        {tab === 'share' && <ShareQueue reload={loadOv} />}
        {tab === 'sales' && <PackSales />}
        {tab === 'finances' && <Finances />}
        {tab === 'settlements' && <Settlements />}
        {tab === 'members' && <Members />}
      </div>
    </AlShell>
  );
}
