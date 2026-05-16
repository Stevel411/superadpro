/*
 * AdminRotatorState.jsx — /admin/rotator
 * ─────────────────────────────────────────────────────────────
 * Admin-only page that reads /admin/api/rotator-state and renders
 * the rotator queue, eligibility, recent assignments, and a one-glance
 * "is this thing working" verdict.
 *
 * Built 16 May 2026 because Steve was hitting a rotator failure but
 * couldn't paste JSON output into devtools to debug it. Building a
 * proper page beats expecting people to use curl + devtools.
 *
 * Also exposes a "force-enrol all Founders" button that re-runs the
 * boot-time migration on demand, so we don't need a redeploy to fix
 * an empty queue.
 */
import { useEffect, useState, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { apiGet, apiPost } from '../../utils/api';

export default function AdminRotatorState() {
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [busy, setBusy] = useState(false);
  var [msg, setMsg] = useState('');

  var load = useCallback(function() {
    setLoading(true);
    setError(null);
    apiGet('/admin/api/rotator-state')
      .then(function(d) { setData(d); setLoading(false); })
      .catch(function(e) { setError(String(e && e.message || e)); setLoading(false); });
  }, []);

  useEffect(function() { load(); }, [load]);

  function reEnrol() {
    if (busy) return;
    setBusy(true);
    setMsg('');
    apiPost('/admin/api/rotator-reenrol-founders', {})
      .then(function(r) {
        setMsg(r && r.message ? r.message : 'Re-enrol complete.');
        load();
      })
      .catch(function(e) { setMsg('Error: ' + String(e && e.message || e)); })
      .finally(function() { setBusy(false); });
  }

  if (loading) {
    return <AppLayout title="Rotator state"><div style={{padding:24}}>Loading rotator state…</div></AppLayout>;
  }
  if (error) {
    return (
      <AppLayout title="Rotator state">
        <div style={{padding:24,color:'#dc2626'}}>
          <strong>Failed to load:</strong> {error}
          <div><button onClick={load} style={btnStyle}>Try again</button></div>
        </div>
      </AppLayout>
    );
  }
  if (!data) return null;

  var d = data.diagnostics || {};
  var queueWorks = d.queue_works;
  var verdict = queueWorks
    ? { text: 'Rotator is operational', color: '#059669', bg: '#ecfdf5' }
    : { text: 'Rotator is BROKEN — signups falling to house account', color: '#dc2626', bg: '#fef2f2' };

  return (
    <AppLayout title="Rotator state">
      <div style={{padding:24,maxWidth:1200,margin:'0 auto'}}>

        {/* ── Verdict banner ── */}
        <div style={{background:verdict.bg,border:'1px solid '+verdict.color,borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:verdict.color}}>{verdict.text}</div>
            <div style={{fontSize:13,color:'#64748b',marginTop:4}}>
              {queueWorks
                ? <>Next /start signup will be assigned to <strong>{data.next_pick_would_be && data.next_pick_would_be.username}</strong>.</>
                : <>No eligible Founder in the queue. Click <em>Re-enrol all Founders</em> below.</>
              }
            </div>
          </div>
          <button onClick={load} disabled={loading} style={btnStyle}>↻ Refresh</button>
        </div>

        {/* ── Diagnostics ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          <Stat label="Rows in queue" value={d.total_in_queue}/>
          <Stat label="Eligible to pick" value={d.eligible_for_pick_now} tone={d.eligible_for_pick_now>0?'good':'bad'}/>
          <Stat label="Active Founders" value={d.active_non_admin_founders}/>
          <Stat label="Opted-in users" value={d.opted_in_users_total}/>
        </div>

        {/* ── Re-enrol button ── */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 18px',marginBottom:24,display:'flex',alignItems:'center',justifyContent:'space-between',gap:14}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>Re-enrol all active Founders</div>
            <div style={{fontSize:12,color:'#64748b',marginTop:2}}>
              Idempotent. Only adds Founders not already in the queue and only flips opted_in for those currently FALSE.
            </div>
          </div>
          <button onClick={reEnrol} disabled={busy} style={{...btnStyle,background:'#0ea5e9',color:'#fff',border:'1px solid #0284c7',padding:'10px 18px',fontWeight:700}}>
            {busy ? 'Working…' : 'Re-enrol Founders'}
          </button>
        </div>
        {msg && <div style={{padding:'10px 14px',background:'#f1f5f9',borderRadius:8,marginBottom:24,fontSize:13,color:'#0f172a'}}>{msg}</div>}

        {/* ── Queue table ── */}
        <h3 style={{margin:'0 0 12px',fontSize:14,fontWeight:800,color:'#0f172a',letterSpacing:'.04em',textTransform:'uppercase'}}>Queue ({data.queue && data.queue.length})</h3>
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={trHeadStyle}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Opted-in</th>
                <th style={thStyle}>Founder #</th>
                <th style={thStyle}>Admin?</th>
                <th style={thStyle}>Eligible</th>
                <th style={thStyle}>Last assigned</th>
              </tr>
            </thead>
            <tbody>
              {(data.queue || []).length === 0 ? (
                <tr><td colSpan={8} style={{...tdStyle,textAlign:'center',color:'#64748b',padding:'24px 12px'}}>Queue is empty.</td></tr>
              ) : data.queue.map(function(q) {
                return (
                  <tr key={q.user_id} style={q.eligible_for_pick ? trOkStyle : trDimStyle}>
                    <td style={tdStyle}>{q.queue_position}</td>
                    <td style={{...tdStyle,fontWeight:700}}>{q.username}</td>
                    <td style={tdStyle}>{q.is_active ? '✓' : '✗'}</td>
                    <td style={tdStyle}>{q.rotator_opted_in ? '✓' : '✗'}</td>
                    <td style={tdStyle}>{q.founding_spot_number || '—'}</td>
                    <td style={tdStyle}>{q.is_admin ? 'admin' : '—'}</td>
                    <td style={tdStyle}>
                      {q.eligible_for_pick
                        ? <span style={{color:'#059669',fontWeight:700}}>✓</span>
                        : <span style={{color:'#dc2626',fontWeight:700}}>✗</span>}
                    </td>
                    <td style={{...tdStyle,fontSize:11,color:'#64748b'}}>{q.last_assigned_at ? new Date(q.last_assigned_at).toLocaleString() : 'never'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Recent assignments ── */}
        <h3 style={{margin:'24px 0 12px',fontSize:14,fontWeight:800,color:'#0f172a',letterSpacing:'.04em',textTransform:'uppercase'}}>Recent rotator assignments</h3>
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={trHeadStyle}>
                <th style={thStyle}>When</th>
                <th style={thStyle}>New signup</th>
                <th style={thStyle}>Assigned to</th>
                <th style={thStyle}>Source</th>
              </tr>
            </thead>
            <tbody>
              {(data.recent_assignments || []).length === 0 ? (
                <tr><td colSpan={4} style={{...tdStyle,textAlign:'center',color:'#64748b',padding:'24px 12px'}}>No rotator assignments yet.</td></tr>
              ) : data.recent_assignments.map(function(a) {
                return (
                  <tr key={a.id}>
                    <td style={{...tdStyle,fontSize:11,color:'#64748b'}}>{a.assigned_at ? new Date(a.assigned_at).toLocaleString() : '—'}</td>
                    <td style={{...tdStyle,fontWeight:700}}>{a.signup_username || ('#' + a.signup_user_id)}</td>
                    <td style={tdStyle}>{a.assigned_sponsor_username || ('#' + a.assigned_sponsor_id)}</td>
                    <td style={{...tdStyle,fontSize:11,color:'#64748b'}}>{a.funnel_source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </AppLayout>
  );
}

function Stat({ label, value, tone }) {
  var color = tone === 'good' ? '#059669' : tone === 'bad' ? '#dc2626' : '#0f172a';
  return (
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'14px 16px'}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'#64748b',marginBottom:6}}>{label}</div>
      <div style={{fontSize:28,fontWeight:900,color:color,lineHeight:1}}>{value != null ? value : '—'}</div>
    </div>
  );
}

var btnStyle = {padding:'8px 14px',background:'#fff',color:'#0f172a',border:'1px solid #cbd5e1',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'};
var tableWrapStyle = {background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,overflow:'auto'};
var tableStyle = {width:'100%',borderCollapse:'collapse',fontSize:13};
var trHeadStyle = {background:'#f8fafc'};
var thStyle = {padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',color:'#64748b',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'};
var tdStyle = {padding:'10px 12px',borderBottom:'1px solid #f1f5f9',color:'#0f172a'};
var trOkStyle = {};
var trDimStyle = {opacity:.6,background:'#fafbfc'};
