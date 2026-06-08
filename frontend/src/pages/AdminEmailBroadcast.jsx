// AdminEmailBroadcast.jsx
// ============================================================================
// Admin email broadcast tool — send mass emails to members from inside the
// platform. Three tabs: Members (browse + counts), Compose (write + send),
// History (past broadcasts).
//
// Route: /admin/email-broadcast
// ============================================================================
import { useState, useEffect, useMemo } from 'react';
import { List } from 'react-window';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Mail, Users, Clock, Send, CheckCircle2, AlertCircle, Eye, FileText, Search, Download } from 'lucide-react';

const TABS = [
  { key: 'members',  label: 'Members',  icon: Users },
  { key: 'compose',  label: 'Compose',  icon: Send },
  { key: 'history',  label: 'History',  icon: Clock },
];

export default function AdminEmailBroadcast() {
  var [tab, setTab] = useState('members');

  return (
    <AppLayout title="Email Broadcast" subtitle="Send mass emails to members — list is always live">
      <div style={{ padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
          {TABS.map(function(t) {
            var Icon = t.icon;
            var isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={function() { setTab(t.key); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 18px', fontSize: 14, fontWeight: 500,
                  background: 'transparent', border: 'none',
                  borderBottom: isActive ? '2px solid #0ea5e9' : '2px solid transparent',
                  color: isActive ? '#0ea5e9' : '#64748b',
                  cursor: 'pointer', marginBottom: -1, fontFamily: 'inherit',
                }}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'members' && <MembersTab />}
        {tab === 'compose' && <ComposeTab />}
        {tab === 'history' && <HistoryTab />}

      </div>
    </AppLayout>
  );
}


// ─── MEMBERS TAB ─────────────────────────────────────────────────────────
function MembersTab() {
  var [data, setData] = useState({ recipient_count: 0, preview_count: 0, preview_truncated: false, members: [] });
  var [loading, setLoading] = useState(true);
  var [search, setSearch] = useState('');
  var [status, setStatus] = useState('all');

  function load() {
    setLoading(true);
    var params = new URLSearchParams();
    // We don't pass `q` to the server — searches happen client-side over
    // the loaded slice so typing is instant. The server filter is for
    // status/country which actually affect the *audience*.
    params.set('status', status);
    apiGet('/admin/api/members-emails?' + params.toString())
      .then(function(d) { setData(d); })
      .catch(function() { setData({ recipient_count: 0, preview_count: 0, preview_truncated: false, members: [] }); })
      .finally(function() { setLoading(false); });
  }

  useEffect(load, [status]);

  // Client-side search filtering (instant — no API call per keystroke)
  var filteredMembers = useMemo(function() {
    if (!search.trim()) return data.members;
    var q = search.toLowerCase();
    return data.members.filter(function(m) {
      return (m.email || '').toLowerCase().includes(q)
          || (m.username || '').toLowerCase().includes(q)
          || (m.first_name || '').toLowerCase().includes(q);
    });
  }, [data.members, search]);

  function exportCSV() {
    var headers = ['email', 'username', 'first_name', 'country', 'is_active', 'created_at'];
    var rows = filteredMembers.map(function(m) {
      return headers.map(function(h) {
        var v = m[h];
        if (v == null) v = '';
        var s = String(v);
        return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    });
    var csv = headers.join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'superadpro-members-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // CSS grid columns shared between header and each row so they align.
  // Email is the widest (most variable content), the rest fit-content.
  var gridCols = 'minmax(240px,2fr) minmax(140px,1fr) minmax(100px,1fr) 90px 80px 100px';

  return (
    <div>
      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total in audience" value={data.recipient_count} />
        <StatCard label="Showing" value={filteredMembers.length} />
        <StatCard label="Live list" value="Real-time from DB" small />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search email, username, or name…"
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            style={{
              width: '100%', padding: '10px 12px 10px 38px',
              border: '1px solid #e5e7eb', borderRadius: 8,
              fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={status}
          onChange={function(e) { setStatus(e.target.value); }}
          style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: '#fff', fontFamily: 'inherit', cursor: 'pointer' }}
        >
          <option value="all">All members</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <button
          onClick={exportCSV}
          disabled={!filteredMembers.length}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', background: '#fff',
            border: '1px solid #e5e7eb', borderRadius: 8,
            fontSize: 13, fontWeight: 500, color: '#475569',
            cursor: filteredMembers.length ? 'pointer' : 'not-allowed',
            opacity: filteredMembers.length ? 1 : 0.5,
            fontFamily: 'inherit',
          }}
        >
          <Download size={14} />
          Export CSV ({filteredMembers.length})
        </button>
      </div>

      {/* Virtualised member table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        {/* Sticky header */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridCols,
          background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
          padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#64748b',
          letterSpacing: 0.3, textTransform: 'uppercase',
        }}>
          <div>Email</div>
          <div>Username</div>
          <div>Name</div>
          <div>Country</div>
          <div>Status</div>
          <div>Joined</div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            {search ? 'No members match your search' : 'No members found'}
          </div>
        ) : (
          // CRITICAL: The <List> measures its container to decide visible
          // height. Without an explicit height here, it expands to fit all
          // rows and virtual scrolling is defeated. defaultHeight on the
          // List itself is only used for server-rendering.
          // Window: 600px = ~13 rows visible at 44px each. List auto-shrinks
          // for short lists so we don't get empty space at 5-10 members.
          <div style={{ height: Math.min(filteredMembers.length * 44, 600) + 'px', width: '100%' }}>
            <List
              rowCount={filteredMembers.length}
              rowHeight={44}
              defaultHeight={Math.min(filteredMembers.length * 44, 600)}
              rowComponent={MemberRow}
              rowProps={{ members: filteredMembers, gridCols: gridCols }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
        {data.preview_truncated
          ? <>Showing the first 5,000 members. Use search or status filter to narrow down. Admin users and opted-out users are excluded from broadcasts.</>
          : <>Admin users and opted-out users are excluded from broadcasts.</>}
      </p>
    </div>
  );
}


// A single virtualised row. Receives index + style from react-window,
// plus our custom { members, gridCols } via rowProps.
function MemberRow({ index, style, members, gridCols }) {
  var m = members[index];
  if (!m) return null;
  return (
    <div style={Object.assign({}, style, {
      display: 'grid', gridTemplateColumns: gridCols,
      padding: '10px 14px', fontSize: 13, color: '#334155',
      borderBottom: '1px solid #f1f5f9', alignItems: 'center',
      boxSizing: 'border-box',
    })}>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{m.username}</div>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.first_name || '—'}</div>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.country || '—'}</div>
      <div>
        <span style={{
          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: m.is_active ? '#dcfce7' : '#fef9c3',
          color: m.is_active ? '#166534' : '#854d0e',
        }}>
          {m.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</div>
    </div>
  );
}


// ─── COMPOSE TAB ──────────────────────────────────────────────────────────
function ComposeTab() {
  var [subject, setSubject] = useState('');
  var [body, setBody] = useState('');
  var [status, setStatus] = useState('all');
  var [country, setCountry] = useState('');
  var [audienceCount, setAudienceCount] = useState(null);
  var [showPreview, setShowPreview] = useState(false);
  var [sending, setSending] = useState(false);
  var [result, setResult] = useState(null);
  var [pollTick, setPollTick] = useState(0);
  var [confirmText, setConfirmText] = useState('');

  // Resolve audience count whenever filter changes
  useEffect(function() {
    var params = new URLSearchParams();
    params.set('status', status);
    if (country) params.set('country', country);
    apiGet('/admin/api/members-emails?' + params.toString())
      .then(function(d) { setAudienceCount(d.recipient_count); })
      .catch(function() { setAudienceCount(null); });
  }, [status, country]);

  var needsConfirm = audienceCount !== null && audienceCount > 100;
  var canSend = subject.trim() && body.trim() && (!needsConfirm || confirmText === 'SEND');

  // Insert a merge tag at the cursor in the body textarea so the admin
  // never has to remember the {{first_name}} / {{username}} syntax. Falls
  // back to appending if the caret position isn't available.
  function insertTag(tag) {
    var el = document.getElementById('broadcast-body');
    if (!el || typeof el.selectionStart !== 'number') {
      setBody(function(prev) { return (prev || '') + tag; });
      return;
    }
    var start = el.selectionStart;
    var end = el.selectionEnd;
    var next = body.slice(0, start) + tag + body.slice(end);
    setBody(next);
    // Restore focus and place the caret right after the inserted tag.
    requestAnimationFrame(function() {
      el.focus();
      var pos = start + tag.length;
      try { el.setSelectionRange(pos, pos); } catch (e) {}
    });
  }

  function send(testOnly) {
    if (sending) return;
    setSending(true);
    setResult(null);
    var audience = { status: status };
    if (country) audience.country = country;
    apiPost('/admin/api/broadcast/send', {
      subject: subject,
      body_html: body,
      audience: audience,
      test_only: !!testOnly,
    })
      .then(function(d) {
        // Send now runs in the background and returns instantly with
        // status:"sending". The poll effect below tracks live progress via
        // /admin/api/broadcast/{id} until status is completed/failed.
        setResult({ ok: true, ...d });
        if (!testOnly) {
          // Clear the composer — the send is committed and queued server-side.
          setSubject('');
          setBody('');
          setConfirmText('');
        }
      })
      .catch(function(err) {
        setResult({ ok: false, error: (err && err.message) || 'Send failed' });
      })
      .finally(function() { setSending(false); });
  }

  // Live progress: while a backgrounded broadcast is sending, poll its row
  // every 3s and fold sent/failed/status into result. pollTick in the deps +
  // the finally bump keep the loop alive through transient poll errors; the
  // status guard stops it once the row is completed/failed.
  useEffect(function() {
    if (!result || !result.ok || !result.broadcast_id || result.status !== 'sending') return;
    var t = setTimeout(function() {
      apiGet('/admin/api/broadcast/' + result.broadcast_id)
        .then(function(d) {
          setResult(function(prev) {
            if (!prev) return prev;
            return Object.assign({}, prev, {
              sent: d.sent_count,
              failed: d.failed_count,
              recipient_count: d.recipient_count,
              status: d.status,
              error: d.error_message || prev.error,
            });
          });
        })
        .catch(function() { /* transient — re-tick below */ })
        .finally(function() { setPollTick(function(n) { return n + 1; }); });
    }, 3000);
    return function() { clearTimeout(t); };
  }, [result, pollTick]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

      {/* Composer */}
      <div>
        <Label>Subject</Label>
        <input
          type="text"
          value={subject}
          onChange={function(e) { setSubject(e.target.value); }}
          placeholder="What's the email about?"
          maxLength={300}
          style={input()}
        />

        <Label style={{ marginTop: 20 }}>Body</Label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Personalise:</span>
          <button
            type="button"
            onClick={function() { insertTag('{{first_name}}'); }}
            style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#f0f9ff', color: '#0369a1', cursor: 'pointer' }}
          >+ First name</button>
          <button
            type="button"
            onClick={function() { insertTag('{{username}}'); }}
            style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer' }}
          >+ Username</button>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Each member sees their own name automatically.</span>
        </div>
        <textarea
          id="broadcast-body"
          value={body}
          onChange={function(e) { setBody(e.target.value); }}
          placeholder={"Write naturally — paragraph breaks render correctly.\n\nClick \u201c+ First name\u201d above to greet each member by name.\n\nHTML also works if you want it: <strong>bold</strong>, <em>italic</em>, <a href=\"...\">links</a>."}
          rows={14}
          style={Object.assign({}, input(), { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13, resize: 'vertical' })}
        />
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
          Plain text is auto-formatted into paragraphs. URLs become clickable links. Footer (unsubscribe link) is added automatically. Compliance-safe.
        </p>

        {showPreview && (
          <div style={{ marginTop: 20, padding: 20, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, letterSpacing: 0.5 }}>
              PREVIEW (as a member would see it)
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{subject || '(no subject)'}</div>
            <div dangerouslySetInnerHTML={{ __html: body.replace(/{{first_name}}/g, 'Friend').replace(/{{username}}/g, 'friend') }} />
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              You're receiving this because you're a SuperAdPro member.<br/>
              <span style={{ textDecoration: 'underline' }}>Unsubscribe from broadcast emails</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button onClick={function() { setShowPreview(!showPreview); }} style={btnSecondary()}>
            <Eye size={14} /> {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
          <button onClick={function() { send(true); }} disabled={!subject || !body || sending} style={btnSecondary()}>
            Send test to me
          </button>
        </div>

        {/* Confirmation gate for big sends */}
        {needsConfirm && (
          <div style={{ marginTop: 24, padding: 14, background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>
              ⚠️ This will send to {audienceCount} members. Type SEND to confirm.
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={function(e) { setConfirmText(e.target.value.toUpperCase()); }}
              placeholder="Type SEND to confirm"
              style={Object.assign({}, input(), { background: '#fff' })}
            />
          </div>
        )}

        <button
          onClick={function() { send(false); }}
          disabled={!canSend || sending}
          style={Object.assign({}, btnPrimary(), {
            marginTop: 20,
            opacity: (canSend && !sending) ? 1 : 0.4,
            cursor: (canSend && !sending) ? 'pointer' : 'not-allowed',
          })}
        >
          <Send size={16} />
          {sending ? `Sending to ${audienceCount || '…'} members…` : `Send to ${audienceCount == null ? '…' : audienceCount} members`}
        </button>

        {result && (() => {
          var st = result.ok ? (result.status || 'completed') : 'error';
          var tone = (st === 'completed') ? { bg: '#dcfce7', bd: '#86efac' }
                   : (st === 'sending')   ? { bg: '#e0f2fe', bd: '#7dd3fc' }
                   :                          { bg: '#fee2e2', bd: '#fca5a5' };
          return (
          <div style={{
            marginTop: 20, padding: 16, borderRadius: 10,
            background: tone.bg, border: '1px solid ' + tone.bd,
          }}>
            {st === 'completed' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                  <CheckCircle2 size={18} /> Broadcast complete
                </div>
                <div style={{ fontSize: 13, color: '#15803d' }}>
                  Sent {result.sent != null ? result.sent : '—'} / {result.recipient_count} emails.
                  {result.failed > 0 && ' ' + result.failed + ' failed.'}
                  {result.test_only && ' (Test mode — only you received it.)'}
                </div>
              </>
            )}
            {st === 'sending' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#0369a1', marginBottom: 4 }}>
                  <Clock size={18} /> Sending in the background…
                </div>
                <div style={{ fontSize: 13, color: '#0c4a6e' }}>
                  {(result.sent || 0)} / {result.recipient_count} sent so far.
                  {result.failed > 0 && ' ' + result.failed + ' failed.'}
                  {result.test_only && ' (Test mode — only you.)'}
                  {' '}Safe to leave this page — sending continues server-side. Don’t resend.
                </div>
              </>
            )}
            {(st === 'failed' || st === 'error') && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>
                  <AlertCircle size={18} /> {st === 'failed' ? 'Broadcast stopped' : 'Send failed'}
                </div>
                <div style={{ fontSize: 13, color: '#b91c1c' }}>
                  {result.error || 'Send failed.'}
                  {st === 'failed' && result.recipient_count != null &&
                    ' Sent ' + (result.sent || 0) + ' / ' + result.recipient_count + ' before stopping.'}
                </div>
              </>
            )}
          </div>
          );
        })()}
      </div>

      {/* Audience sidebar */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, position: 'sticky', top: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} /> Audience
        </div>

        <Label small>Status</Label>
        <select value={status} onChange={function(e) { setStatus(e.target.value); }} style={selectStyle()}>
          <option value="all">All members</option>
          <option value="active">Active only (paid Basic)</option>
          <option value="inactive">Inactive only</option>
        </select>

        <Label small style={{ marginTop: 14 }}>Country (ISO code, optional)</Label>
        <input
          type="text"
          value={country}
          onChange={function(e) { setCountry(e.target.value.toUpperCase().slice(0, 2)); }}
          placeholder="GB, US, etc."
          maxLength={2}
          style={input()}
        />

        <div style={{ marginTop: 18, padding: 14, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#0c4a6e', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>RECIPIENTS</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0c4a6e' }}>{audienceCount == null ? '…' : audienceCount}</div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          Admin users and opted-out members are always excluded.
        </div>
      </div>

    </div>
  );
}


// ─── HISTORY TAB ──────────────────────────────────────────────────────────
function HistoryTab() {
  var [broadcasts, setBroadcasts] = useState([]);
  var [loading, setLoading] = useState(true);
  var [selected, setSelected] = useState(null);

  useEffect(function() {
    apiGet('/admin/api/broadcast/history')
      .then(function(d) { setBroadcasts((d && d.broadcasts) || []); })
      .catch(function() { setBroadcasts([]); })
      .finally(function() { setLoading(false); });
  }, []);

  function viewDetail(id) {
    apiGet('/admin/api/broadcast/' + id)
      .then(function(d) { setSelected(d); });
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>;
  if (broadcasts.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No broadcasts sent yet.</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <th style={th()}>Sent</th>
              <th style={th()}>Subject</th>
              <th style={th()}>Recipients</th>
              <th style={th()}>Status</th>
            </tr>
          </thead>
          <tbody>
            {broadcasts.map(function(b) {
              return (
                <tr key={b.id} onClick={function() { viewDetail(b.id); }}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                             background: selected && selected.id === b.id ? '#eff6ff' : 'transparent' }}>
                  <td style={td()}>{b.created_at ? new Date(b.created_at).toLocaleString() : '—'}</td>
                  <td style={Object.assign({}, td(), { fontWeight: 500, color: '#0f172a' })}>{b.subject}</td>
                  <td style={td()}>{b.sent_count} / {b.recipient_count}</td>
                  <td style={td()}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: b.status === 'completed' ? '#dcfce7' : b.status === 'failed' ? '#fee2e2' : '#fef9c3',
                      color: b.status === 'completed' ? '#166534' : b.status === 'failed' ? '#991b1b' : '#854d0e',
                    }}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>SUBJECT</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selected.subject}</div>
            </div>
            <button onClick={function() { setSelected(null); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            Sent to {selected.sent_count} / {selected.recipient_count} ·
            {selected.completed_at && ' completed ' + new Date(selected.completed_at).toLocaleString()}
          </div>
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, maxHeight: 600, overflow: 'auto' }}
               dangerouslySetInnerHTML={{ __html: selected.body_html }} />
        </div>
      )}
    </div>
  );
}


// ─── shared styles + tiny components ──────────────────────────────────────
function StatCard(props) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>{props.label.toUpperCase()}</div>
      <div style={{ fontSize: props.small ? 14 : 22, fontWeight: 700, color: '#0f172a' }}>{props.value}</div>
    </div>
  );
}

function Label(props) {
  return <div style={Object.assign({ fontSize: props.small ? 11 : 12, fontWeight: 600, color: '#64748b', marginBottom: 6, letterSpacing: 0.3 }, props.style || {})}>{props.children}</div>;
}

function input() {
  return { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box' };
}

function selectStyle() {
  return Object.assign({}, input(), { cursor: 'pointer' });
}

function btnPrimary() {
  return { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' };
}

function btnSecondary() {
  return { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#fff', color: '#475569', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' };
}

function th() { return { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: 0.3, textTransform: 'uppercase' }; }
function td() { return { padding: '10px 14px', color: '#334155' }; }
