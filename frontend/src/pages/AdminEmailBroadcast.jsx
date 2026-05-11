// AdminEmailBroadcast.jsx
// ============================================================================
// Admin email broadcast tool — send mass emails to members from inside the
// platform. Three tabs: Members (browse + counts), Compose (write + send),
// History (past broadcasts).
//
// Route: /admin/email-broadcast
// ============================================================================
import { useState, useEffect, useMemo } from 'react';
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
  var [data, setData] = useState({ recipient_count: 0, preview_count: 0, members: [] });
  var [loading, setLoading] = useState(true);
  var [search, setSearch] = useState('');
  var [status, setStatus] = useState('all');

  function load() {
    setLoading(true);
    var params = new URLSearchParams();
    if (search) params.set('q', search);
    params.set('status', status);
    apiGet('/admin/api/members-emails?' + params.toString())
      .then(function(d) { setData(d); })
      .catch(function() { setData({ recipient_count: 0, preview_count: 0, members: [] }); })
      .finally(function() { setLoading(false); });
  }

  useEffect(load, [status]);

  function handleSearch(e) {
    e.preventDefault();
    load();
  }

  function exportCSV() {
    var headers = ['email', 'username', 'first_name', 'country', 'is_active', 'created_at'];
    var rows = data.members.map(function(m) {
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

  return (
    <div>
      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total in audience" value={data.recipient_count} />
        <StatCard label="Showing" value={data.preview_count} />
        <StatCard label="Live list" value="Real-time from DB" small />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search email, username, or name…"
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            style={{
              width: '100%', padding: '10px 12px 10px 38px',
              border: '1px solid #e5e7eb', borderRadius: 8,
              fontSize: 14, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </form>
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
          disabled={!data.members.length}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', background: '#fff',
            border: '1px solid #e5e7eb', borderRadius: 8,
            fontSize: 13, fontWeight: 500, color: '#475569',
            cursor: data.members.length ? 'pointer' : 'not-allowed',
            opacity: data.members.length ? 1 : 0.5,
            fontFamily: 'inherit',
          }}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Member table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : data.members.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No members found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <th style={th()}>Email</th>
                <th style={th()}>Username</th>
                <th style={th()}>Name</th>
                <th style={th()}>Country</th>
                <th style={th()}>Status</th>
                <th style={th()}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map(function(m) {
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td()}>{m.email}</td>
                    <td style={td()}>@{m.username}</td>
                    <td style={td()}>{m.first_name || '—'}</td>
                    <td style={td()}>{m.country || '—'}</td>
                    <td style={td()}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: m.is_active ? '#dcfce7' : '#fef9c3',
                        color: m.is_active ? '#166534' : '#854d0e',
                      }}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={td()}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
        Preview limited to 500 members. Admin users and opted-out users are excluded from broadcasts.
      </p>
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
        setResult({ ok: true, ...d });
        if (!testOnly) {
          // Clear the composer on successful real send
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

        <Label style={{ marginTop: 20 }}>Body (HTML allowed)</Label>
        <textarea
          value={body}
          onChange={function(e) { setBody(e.target.value); }}
          placeholder={"Write your message here. Use {{first_name}} or {{username}} for personalisation.\n\nHTML tags work: <strong>bold</strong>, <em>italic</em>, <a href=\"...\">links</a>, <br>"}
          rows={14}
          style={Object.assign({}, input(), { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13, resize: 'vertical' })}
        />
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
          Footer (unsubscribe link) is added automatically. Compliance-safe.
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

        {result && (
          <div style={{
            marginTop: 20, padding: 16, borderRadius: 10,
            background: result.ok ? '#dcfce7' : '#fee2e2',
            border: '1px solid ' + (result.ok ? '#86efac' : '#fca5a5'),
          }}>
            {result.ok ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                  <CheckCircle2 size={18} /> Broadcast sent
                </div>
                <div style={{ fontSize: 13, color: '#15803d' }}>
                  Sent {result.sent} / {result.recipient_count} emails.
                  {result.failed > 0 && ' ' + result.failed + ' failed.'}
                  {result.test_only && ' (Test mode — only you received it.)'}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>
                  <AlertCircle size={18} /> Send failed
                </div>
                <div style={{ fontSize: 13, color: '#b91c1c' }}>{result.error}</div>
              </>
            )}
          </div>
        )}
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
