import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../utils/api';
import AlShell from '../components/layout/AlShell';
import { Gauge, ShieldCheck, Coins, Users, RefreshCw, Check, X, ExternalLink, Wallet, Handshake, Activity, Share2, Clock } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────
   AdvantageLife admin — built for the pack / pass-up model.
   The legacy AdminDashboard reports the retired business (grids,
   memberships, Creator Credits) and never reads PackCommission —
   the table AL actually pays from. This reports what AL IS now.
   ──────────────────────────────────────────────────────────────── */

const NAVY = '#0a1f52', NAVY2 = '#12388f', RED = '#c8102e', MUTED = '#5a6584', LINE = '#e6ecf5', GREEN = '#0b7a3e';
const money = (n) => '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const TABS = [
  { key: 'overview', label: 'Overview', Icon: Gauge },
  { key: 'share', label: 'Share Approval', Icon: ShieldCheck },
  { key: 'sales', label: 'Pack Sales', Icon: Coins },
  { key: 'finances', label: 'Finances', Icon: Wallet },
  { key: 'settlements', label: 'Settlements', Icon: Handshake },
  { key: 'members', label: 'Members', Icon: Users },
  { key: 'trials', label: 'Trials', Icon: Clock },
  { key: 'sharing', label: 'Sharing', Icon: Share2 },
  { key: 'health', label: 'Health', Icon: Activity },
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

function Trials() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { apiGet('/admin/api/al/trial-stats').then(setD).catch(() => setErr('Could not load trial stats')); }, []);
  if (err) return <div style={{ padding: 22, color: RED, fontWeight: 700 }}>{err}</div>;
  if (!d) return <div style={{ padding: 22, color: MUTED, fontWeight: 600 }}>Loading…</div>;
  const b = d.active_by_days_left || {};
  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
        <Stat n={d.active_trials ?? 0} l="Active trials" color={NAVY} />
        <Stat n={d.new_trials_this_week ?? 0} l="New this week" color={RED} />
        <Stat n={d.converted_to_lifetime ?? 0} l="Upgraded to lifetime" color={GREEN} />
        <Stat n={(d.conversion_rate_pct ?? 0) + '%'} l="Conversion rate" color={GREEN} />
        <Stat n={d.lapsed_no_upgrade ?? 0} l="Lapsed (no upgrade)" color={MUTED} />
      </div>

      <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 14, color: NAVY, marginBottom: 12 }}>Active trials by time left</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          <Stat n={b.expiring_today ?? 0} l="Expiring today" color={RED} />
          <Stat n={b.in_1_2_days ?? 0} l="In 1–2 days" color="#b45309" />
          <Stat n={b.in_3_7_days ?? 0} l="In 3–7 days" color={NAVY} />
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid ' + LINE, borderRadius: 14, padding: 18 }}>
        <div style={{ fontWeight: 900, fontSize: 14, color: NAVY, marginBottom: 4 }}>Expiring soon — worth a nudge</div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>Trials ending within 2 days. Reach out before their week's up.</div>
        {(!d.expiring_soon || d.expiring_soon.length === 0)
          ? <div style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>Nobody expiring in the next 2 days.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ textAlign: 'left', fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                <th style={{ padding: '6px 8px' }}>Member</th><th style={{ padding: '6px 8px' }}>Email</th><th style={{ padding: '6px 8px' }}>Days left</th></tr></thead>
              <tbody>
                {d.expiring_soon.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid ' + LINE }}>
                    <td style={{ padding: '8px', fontWeight: 800, color: NAVY }}>@{r.username}</td>
                    <td style={{ padding: '8px', color: MUTED, fontSize: 13 }}>{r.email}</td>
                    <td style={{ padding: '8px', fontWeight: 800, color: r.days_left <= 1 ? RED : '#b45309' }}>{r.days_left}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

function ShareQueue({ reload }) {
  const [state, setState] = useState('pending');
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    setRows(null);
    apiGet(`/admin/api/al/share-queue?state=${state}`).then(d => setRows(d.campaigns || [])).catch(() => setRows([]));
  }, [state]);
  useEffect(() => { load(); }, [load]);

  // Refetch from the server rather than filtering locally — a local filter
  // makes the UI *look* right even when the write failed, so the list and the
  // database silently drift apart. And never swallow the error: if approval
  // fails, say so.
  const act = async (id, approve) => {
    setBusy(id);
    setErr('');
    try {
      const r = await apiPost('/admin/api/al/share-approve', { campaign_id: id, approve });
      if (r && r.error) throw new Error(r.error);
      await load();
      reload && reload();
    } catch (e) {
      setErr((approve ? 'Approve' : 'Revoke') + ' failed: ' + (e && e.message ? e.message : 'unknown error'));
    }
    setBusy(null);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: MUTED, fontWeight: 600, marginBottom: 12, maxWidth: 760, lineHeight: 1.55 }}>
        Approved campaigns appear on members' <b>public</b> share pages, promoted to their own friends and family.
        Nothing goes public without a decision here.
      </div>
      {err && <div style={{ background: '#fdeaec', border: '1.5px solid ' + RED, color: RED, borderRadius: 10, padding: '10px 14px', fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{err}</div>}
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

function MemberDetail({ id, onClose }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setD(null); setErr('');
    apiGet('/admin/api/al/member/' + id)
      .then(setD).catch(() => setErr('Could not load this member.'));
  }, [id]);
  const TYPE_LABEL = { direct: 'Direct sales', pass_up: 'Pass-up sales', direct_company: 'Direct (to company)', pass_up_company: 'Pass-up (to company)' };
  const pill = (ok, label) => <span style={{ fontSize: 11, fontWeight: 900, padding: '3px 10px', borderRadius: 20, background: ok ? '#e7f6ee' : '#fdeaec', color: ok ? GREEN : RED }}>{label} {ok ? '✓' : '✗'}</span>;
  const box = { background: '#fff', border: '1px solid ' + LINE, borderRadius: 12, padding: 16 };
  const lab = { fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED, marginBottom: 8 };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,31,82,.5)', zIndex: 120, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px,100%)', background: '#f1f5f9', height: '100%', overflowY: 'auto', boxShadow: '-20px 0 50px -20px rgba(0,0,0,.4)' }}>
        <div style={{ background: NAVY, color: '#fff', padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 19 }}>{d ? '@' + d.username : 'Loading…'}</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: 9, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {err ? <div style={{ padding: 22, color: RED, fontWeight: 700 }}>{err}</div>
          : !d ? <div style={{ padding: 22, color: MUTED, fontWeight: 600 }}>Loading…</div>
          : <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={box}>
              <div style={lab}>Account</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {(function () {
                  var al = d.access_level, S = { fontSize: 12.5, fontWeight: 900, padding: '3px 10px', borderRadius: 20 };
                  if (d.lifetime || al === 'lifetime') return <span style={{ ...S, background: '#e7f6ee', color: GREEN }}>Lifetime member</span>;
                  if (al === 'annual') return <span style={{ ...S, background: '#e8eefb', color: '#2563eb' }}>Annual member</span>;
                  if (al === 'trial') {
                    var days = d.membership_expires_at ? Math.max(0, Math.ceil((new Date(d.membership_expires_at) - Date.now()) / 86400000)) : null;
                    return <span style={{ ...S, background: '#fff3e0', color: '#b45309' }}>{'Trial' + (days != null ? ' · ' + days + ' day' + (days === 1 ? '' : 's') + ' left' : '')}</span>;
                  }
                  return <span style={{ ...S, background: '#eef2f8', color: MUTED }}>Free — not joined</span>;
                })()}
                {d.is_admin && <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', background: NAVY, borderRadius: 20, padding: '3px 10px' }}>ADMIN</span>}
              </div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 10, fontWeight: 600 }}>{d.email}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>ID {d.id} · joined {d.created_at ? new Date(d.created_at).toLocaleDateString('en-GB') : '—'}</div>
            </div>

            <div style={box}>
              <div style={lab}>Can this member earn?</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {pill(!!d.gates.owned_level, 'Owns a pack')}
                {pill(d.gates.watch_qualified, 'Watch-qualified')}
                {pill(d.gates.payable, 'Has payout method')}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 10, fontWeight: 600, lineHeight: 1.5 }}>
                All three are required for a sale to pay them. Any failing gate sends the sale up their chain.
              </div>
            </div>

            <div style={box}>
              <div style={lab}>Earnings received</div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: d.earnings.count ? 12 : 0 }}>
                <div><div style={{ fontSize: 24, fontWeight: 900, color: GREEN }}>{money(d.earnings.total)}</div><div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>Total</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 900, color: NAVY }}>{money(d.earnings.paid)}</div><div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>Paid</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 900, color: '#b45309' }}>{money(d.earnings.pending)}</div><div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>Pending</div></div>
              </div>
              {Object.keys(d.earnings.by_type || {}).length > 0 &&
                <div style={{ borderTop: '1px solid ' + LINE, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(d.earnings.by_type).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: MUTED, fontWeight: 600 }}>{TYPE_LABEL[k] || k}</span>
                      <b style={{ color: NAVY }}>{money(v)}</b>
                    </div>
                  ))}
                </div>}
              {d.earnings.count === 0 && <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 600 }}>No commissions earned yet.</div>}
            </div>

            <div style={box}>
              <div style={lab}>Packs ({d.sales_made} sold)</div>
              {d.packs.length === 0 ? <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 600 }}>No packs owned.</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {d.packs.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, borderBottom: i < d.packs.length - 1 ? '1px solid ' + LINE : 'none', paddingBottom: 6 }}>
                      <span><b style={{ color: '#12388f' }}>L{p.level}</b> · {money(p.amount)}{p.source === 'gift' ? ' (granted)' : ''}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 900, padding: '2px 8px', borderRadius: 20, background: p.status === 'active' ? '#e7f6ee' : p.status === 'expired' ? '#eef2f8' : '#fff7ed', color: p.status === 'active' ? GREEN : p.status === 'expired' ? MUTED : '#b45309' }}>{p.status}</span>
                    </div>
                  ))}
                </div>}
            </div>

            <div style={box}>
              <div style={lab}>Payout methods</div>
              {d.payout_methods.length === 0 ? <div style={{ fontSize: 12.5, color: RED, fontWeight: 700 }}>None on file — sales skip this member.</div>
                : <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {d.payout_methods.map((pm, i) => <span key={i} style={{ fontSize: 12, fontWeight: 800, padding: '4px 11px', borderRadius: 8, background: '#eef2f8', color: NAVY }}>{pm.type}{pm.is_default ? ' · default' : ''}</span>)}
                </div>}
              <div style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>Account details are the member's own and are not shown here.</div>
            </div>

            <div style={box}>
              <div style={lab}>Tree</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED, fontWeight: 600 }}>Sponsor</span><b style={{ color: NAVY }}>{d.tree.sponsor ? '@' + d.tree.sponsor : '—'}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED, fontWeight: 600 }}>Pass-up to</span><b style={{ color: NAVY }}>{d.tree.pass_up_sponsor ? '@' + d.tree.pass_up_sponsor : '— (set on first sale)'}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: MUTED, fontWeight: 600 }}>Direct referrals</span><b style={{ color: RED }}>{d.tree.direct_referrals}</b></div>
              </div>
            </div>

          </div>}
      </div>
    </div>
  );
}

function Members() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [openId, setOpenId] = useState(null);
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
                <tr key={m.id} onClick={() => setOpenId(m.id)} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafd'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
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
          <div style={{ padding: '10px 14px', fontSize: 12, color: MUTED, fontWeight: 600 }}>Tap a member for full details.</div>
        </div>}
      {openId && <MemberDetail id={openId} onClose={() => setOpenId(null)} />}
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
          <Stat n={money(pi.lifetime_joins?.value)} l={`Paid joins (${pi.lifetime_joins?.paid_joins ?? 0} of ${pi.lifetime_joins?.members ?? 0})`} />
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


function Health() {
  const [d, setD] = useState(null);
  const load = useCallback(() => { setD(null); apiGet('/admin/api/al/health').then(setD).catch(() => setD(null)); }, []);
  useEffect(() => { load(); }, [load]);
  if (!d) return <div style={{ color: MUTED, fontWeight: 600, padding: 20 }}>Running checks…</div>;
  const tone = { critical: RED, warn: '#b45309', info: '#12388f' };
  const bg = { critical: '#fdeaec', warn: '#fff7ed', info: '#eef4ff' };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: d.healthy ? '#e7f6ee' : '#fff7ed', color: d.healthy ? GREEN : '#b45309', border: '1.5px solid ' + (d.healthy ? '#a7e0c0' : '#fed7aa'), borderRadius: 30, padding: '8px 16px', fontWeight: 900, fontSize: 13 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.healthy ? GREEN : '#b45309' }} />
          {d.healthy ? 'All clear' : 'Needs attention'}
        </span>
        <button onClick={load} style={{ background: '#fff', color: NAVY, border: '1.5px solid ' + LINE, borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><RefreshCw size={13} /> Re-run</button>
      </div>
      <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 600, marginBottom: 14, maxWidth: 720, lineHeight: 1.55 }}>{d.note}</div>
      {(d.issues || []).length === 0
        ? <div style={{ ...card, textAlign: 'center', color: MUTED, fontWeight: 600, padding: 34 }}>Nothing to report — every check passed.</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {d.issues.map((i, n) => (
            <div key={n} style={{ background: bg[i.severity] || '#fff', border: '1.5px solid ' + LINE, borderLeft: '4px solid ' + (tone[i.severity] || NAVY), borderRadius: 12, padding: '13px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em', color: tone[i.severity] }}>{i.severity}</span>
                <b style={{ fontSize: 14, color: NAVY }}>{i.message}</b>
              </div>
              {i.hint && <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 600, marginTop: 4 }}>{i.hint}</div>}
            </div>
          ))}
        </div>}
    </div>
  );
}


function Sharing() {
  const [d, setD] = useState(null);
  const [resetUser, setResetUser] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const load = useCallback(() => { setD(null); apiGet('/admin/api/al/share-performance').then(setD).catch(() => setD(null)); }, []);
  useEffect(() => { load(); }, [load]);
  if (!d) return <div style={{ color: MUTED, fontWeight: 600, padding: 20 }}>Loading…</div>;
  const t = d.totals || {};
  return (
    <div>
      <div style={{ background: '#f8fafd', border: '1px solid ' + LINE, borderLeft: '4px solid ' + NAVY, borderRadius: 12, padding: '13px 16px', fontSize: 12.5, color: MUTED, fontWeight: 600, lineHeight: 1.6, marginBottom: 16 }}>
        {d.note}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
        <Stat n={t.links_created ?? 0} l="Share links created" />
        <Stat n={t.shared_this_week ?? 0} l="Shared this week" color={RED} />
        <Stat n={t.views_verified_week ?? 0} l="Verified views (wk)" color={GREEN} />
        <Stat n={t.views_verified ?? 0} l="Verified views (all)" color={GREEN} />
        <Stat n={t.views_started ?? 0} l="Views started" />
        <Stat n={t.verify_rate_pct != null ? t.verify_rate_pct + '%' : '—'} l="Reached 30s" color={NAVY2} />
      </div>

      <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 9 }}>Per member — did their link actually produce views?</div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid ' + LINE, overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead><tr style={{ background: '#f8fafd' }}>
            <th style={th}>Member</th><th style={th}>Showcase link</th><th style={th}>Shared?</th>
            <th style={th}>Times shared</th><th style={th}>Verified views (wk)</th><th style={th}>Verified (all)</th>
          </tr></thead>
          <tbody>
            {(d.members || []).length === 0 && <tr><td style={{ ...td, color: MUTED }} colSpan={6}>No share links yet — they're created when a member first loads the dashboard.</td></tr>}
            {(d.members || []).map((m, i) => (
              <tr key={i}>
                <td style={{ ...td, fontWeight: 800, color: NAVY }}>@{m.username}</td>
                <td style={td}><a href={m.url} target="_blank" rel="noreferrer" style={{ color: '#12388f', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{m.url}</a></td>
                <td style={td}><span style={{ fontSize: 10.5, fontWeight: 900, padding: '2px 8px', borderRadius: 20, background: m.shared_this_week ? '#e7f6ee' : '#eef1f8', color: m.shared_this_week ? GREEN : MUTED }}>{m.shared_this_week ? 'This week' : (m.last_shared_at ? 'Not this week' : 'Never')}</span></td>
                <td style={{ ...td, color: MUTED, fontWeight: 700 }}>{m.share_count}</td>
                <td style={{ ...td, fontWeight: 900, color: m.verified_views_week > 0 ? GREEN : MUTED }}>{m.verified_views_week}</td>
                <td style={{ ...td, fontWeight: 800, color: NAVY2 }}>{m.verified_views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>Evidence trail — most recent verified views</div>
      <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 600, marginBottom: 9 }}>Each row is a real person who watched 30+ seconds on that member's link.</div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid ' + LINE, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead><tr style={{ background: '#f8fafd' }}><th style={th}>Shared by</th><th style={th}>Campaign</th><th style={th}>Watched</th><th style={th}>When</th></tr></thead>
          <tbody>
            {(d.recent_views || []).length === 0 && <tr><td style={{ ...td, color: MUTED }} colSpan={4}>No verified views yet. Approve a campaign for sharing, then open a showcase link and watch 30 seconds — it'll appear here.</td></tr>}
            {(d.recent_views || []).map((v, i) => (
              <tr key={i}>
                <td style={{ ...td, fontWeight: 800, color: NAVY }}>@{v.sharer}</td>
                <td style={td}>{v.campaign}</td>
                <td style={{ ...td, fontWeight: 800, color: GREEN }}>{v.watched_secs}s</td>
                <td style={{ ...td, color: MUTED, fontSize: 12.5 }}>{v.verified_at ? new Date(v.verified_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={load} style={{ background: '#fff', color: NAVY, border: '1.5px solid ' + LINE, borderRadius: 10, padding: '9px 15px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><RefreshCw size={13} /> Refresh</button>
        <input value={resetUser} onChange={e => setResetUser(e.target.value)} placeholder="username (blank = you)"
               style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid ' + LINE, fontSize: 12.5, fontFamily: 'inherit', width: 180 }} />
        <button onClick={async () => {
          try { await apiPost('/admin/api/al/share-reset', { username: resetUser }); setResetMsg('Cleared — reload the dashboard'); load(); }
          catch (e) { setResetMsg('Failed'); }
          setTimeout(() => setResetMsg(''), 2500);
        }} style={{ background: '#fff', color: RED, border: '1.5px solid ' + RED, borderRadius: 10, padding: '9px 15px', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
          Reset weekly share state
        </button>
        {resetMsg && <span style={{ fontSize: 12.5, fontWeight: 700, color: GREEN }}>{resetMsg}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, fontWeight: 600, marginTop: 7 }}>
        Testing aid — clears "shared this week" so the card returns to its un-shared state. Verified views are never touched.
      </div>
    </div>
  );
}

export default function AdminAL() {
  const [tab, setTab] = useState('overview');
  const [ov, setOv] = useState(null);
  const [supportOpen, setSupportOpen] = useState(0);
  const loadOv = useCallback(() => { apiGet('/admin/api/al/overview').then(setOv).catch(() => setOv(null)); }, []);
  useEffect(() => { loadOv(); }, [loadOv]);
  useEffect(() => {
    apiGet('/api/al/support/admin/list?status=open')
      .then(d => setSupportOpen((d && d.counts && d.counts.open) || 0))
      .catch(() => {});
  }, []);

  return (
    <AlShell active="dashboard" back={{ to: '/dashboard', label: 'Dashboard' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ background: NAVY, borderRadius: 20, color: '#fff', padding: '22px 26px', boxShadow: '0 24px 50px -28px rgba(10,31,82,.55)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(120deg,#c8102e,#e8203f)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Gauge size={26} color="#fff" /></div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 23, letterSpacing: -.6 }}>AdvantageLife Admin</div>
            <div style={{ fontSize: 13.5, color: '#c9d6f7', fontWeight: 600, marginTop: 2 }}>Packs, pass-ups, settlements and share approvals.</div>
          </div>
          <a href="/admin/wisdom" style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 10, padding: '9px 15px', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>Daily Wisdom</a>
          <a href="/admin/collaborations" style={{  background: 'rgba(255,255,255,.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 10, padding: '9px 15px', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>Vetted Extras</a>
          <a href="/admin/support" style={{ background: supportOpen > 0 ? '#c8102e' : 'rgba(255,255,255,.1)', color: '#fff', border: '1.5px solid ' + (supportOpen > 0 ? '#c8102e' : 'rgba(255,255,255,.2)'), borderRadius: 10, padding: '9px 15px', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>Support{supportOpen > 0 ? ' (' + supportOpen + ')' : ''}</a>
          <button onClick={loadOv} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: 10, padding: '9px 15px', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Refresh</button>
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
        {tab === 'trials' && <Trials />}
        {tab === 'sharing' && <Sharing />}
        {tab === 'health' && <Health />}
      </div>
    </AlShell>
  );
}
