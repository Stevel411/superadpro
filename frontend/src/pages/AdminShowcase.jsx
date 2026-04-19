import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Check, X, Edit3, ChevronUp, ChevronDown, Eye, Clock, AlertCircle, Sparkles, Link2, Globe, Film, ExternalLink } from 'lucide-react';

var COLOUR_SWATCHES = [
  { key: 'sky',    hex: '#0ea5e9' },
  { key: 'indigo', hex: '#6366f1' },
  { key: 'amber',  hex: '#f59e0b' },
  { key: 'green',  hex: '#22c55e' },
  { key: 'pink',   hex: '#ec4899' },
];

var TYPE_META = {
  'bio-link':     { label: 'Bio Link',     icon: Link2,  accent: '#0ea5e9' },
  'landing-page': { label: 'Landing Page', icon: Globe,  accent: '#6366f1' },
  'campaign':     { label: 'Campaign',     icon: Film,   accent: '#f59e0b' },
};

// Artifact preview panel — dereferences the live artifact into a compact card
// so the admin can see exactly what they're approving. Art data comes from
// the server via _fetch_artifact_display() so this UI never has to hit the
// source tables directly.
function ArtifactPreview(props) {
  var s = props.story; // "showcase row" naming kept for consistency with AdminStories
  var art = s.artifact || null;
  var meta = TYPE_META[s.artifact_type] || TYPE_META['bio-link'];
  var Icon = meta.icon;

  if (!s.artifact_alive || !art) {
    return (
      <div style={{
        padding:'20px', borderRadius:12,
        background:'rgba(239,68,68,.06)', border:'1px dashed rgba(239,68,68,.3)',
        display:'flex', alignItems:'center', gap:12,
      }}>
        <AlertCircle size={20} color="#dc2626"/>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#b91c1c', marginBottom:2 }}>Artifact deleted</div>
          <div style={{ fontSize:11, color:'#64748b' }}>
            The source {meta.label.toLowerCase()} (id {s.artifact_id}) no longer exists. Rejecting this submission is recommended.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius:12, overflow:'hidden',
      background:'linear-gradient(180deg,rgba(11,18,48,.95),rgba(11,18,48,.85))',
      border:'1px solid rgba(255,255,255,.1)',
    }}>
      {/* Banner / thumb */}
      <div style={{
        height:100, position:'relative', overflow:'hidden',
        background: art.banner_url
          ? '#0b1230'
          : 'linear-gradient(135deg,' + meta.accent + '33,' + meta.accent + '11)',
      }}>
        {art.banner_url && (
          <img src={art.banner_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        )}
        <div style={{
          position:'absolute', top:10, left:10,
          padding:'3px 10px', borderRadius:100, fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase',
          background:'rgba(11,18,48,.75)', backdropFilter:'blur(8px)',
          border:'1px solid rgba(255,255,255,.1)', color: meta.accent,
          display:'inline-flex', alignItems:'center', gap:5,
        }}>
          <Icon size={11}/>{meta.label}
        </div>
      </div>

      <div style={{ padding:16 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          {s.artifact_type === 'bio-link' && art.avatar_url && (
            <img src={art.avatar_url} alt="" style={{ width:40, height:40, borderRadius:'50%', flexShrink:0, background:'#1e293b' }}/>
          )}
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:15, color:'#fff', letterSpacing:'-.01em' }}>
              {art.title || '(Untitled)'}
            </div>
            {art.subtitle && (
              <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', marginTop:4, lineHeight:1.4 }}>
                {art.subtitle.length > 140 ? art.subtitle.slice(0, 140) + '…' : art.subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Artifact-specific extra info */}
        {art.extra && (
          <div style={{ marginTop:10, display:'flex', gap:10, flexWrap:'wrap' }}>
            {s.artifact_type === 'bio-link' && art.extra.views !== undefined && (
              <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', fontFamily:'JetBrains Mono,monospace' }}>
                {art.extra.views.toLocaleString()} views
              </span>
            )}
            {s.artifact_type === 'landing-page' && art.extra.template && (
              <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', fontFamily:'JetBrains Mono,monospace', textTransform:'uppercase', letterSpacing:'.05em' }}>
                {art.extra.template}
              </span>
            )}
            {s.artifact_type === 'campaign' && (
              <>
                {art.extra.platform && (
                  <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', fontFamily:'JetBrains Mono,monospace', textTransform:'uppercase' }}>
                    {art.extra.platform}
                  </span>
                )}
                {art.extra.views !== undefined && (
                  <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', fontFamily:'JetBrains Mono,monospace' }}>
                    {art.extra.views.toLocaleString()} views delivered
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {art.url && (
          <a href={art.url} target="_blank" rel="noopener noreferrer"
            style={{
              marginTop:12, display:'inline-flex', alignItems:'center', gap:5,
              fontSize:11, color: meta.accent, fontWeight:700, textDecoration:'none',
            }}>
            <ExternalLink size={11}/>Open source artifact
          </a>
        )}
      </div>
    </div>
  );
}

// Inline edit modal — 5 display fields from the showcase row
function EditModal(props) {
  var s = props.story;
  var _title = useState(s.display_title || ''); var title = _title[0]; var setTitle = _title[1];
  var _niche = useState(s.display_niche || ''); var niche = _niche[0]; var setNiche = _niche[1];
  var _metricLabel = useState(s.metric_label || ''); var metricLabel = _metricLabel[0]; var setMetricLabel = _metricLabel[1];
  var _metricValue = useState(s.metric_value || ''); var metricValue = _metricValue[0]; var setMetricValue = _metricValue[1];
  var _colour = useState(s.accent_color || 'sky'); var colour = _colour[0]; var setColour = _colour[1];
  var _saving = useState(false); var saving = _saving[0]; var setSaving = _saving[1];
  var _err = useState(''); var err = _err[0]; var setErr = _err[1];

  function save() {
    if (saving) return;
    setSaving(true); setErr('');
    apiPost('/admin/api/showcase/' + s.id + '/edit', {
      display_title: title,
      display_niche: niche,
      metric_label:  metricLabel,
      metric_value:  metricValue,
      accent_color:  colour,
    }).then(function() {
      setSaving(false);
      props.onSaved();
    }).catch(function(e) {
      setSaving(false);
      setErr((e && e.message) || 'Save failed');
    });
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,.6)', zIndex:100,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={props.onClose}>
      <div style={{
        maxWidth:560, width:'100%', maxHeight:'90vh', overflowY:'auto',
        background:'#fff', borderRadius:18, padding:28,
      }} onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:18 }}>
          Edit showcase #{s.id}
        </div>
        {err && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', color:'#b91c1c', padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13 }}>
            <AlertCircle size={16}/><span>{err}</span>
          </div>
        )}

        <Field label="Title *">
          <input style={iStyle()} type="text" maxLength={160} value={title} onChange={function(e) { setTitle(e.target.value); }}/>
        </Field>
        <Field label="Niche *">
          <input style={iStyle()} type="text" maxLength={80} value={niche} onChange={function(e) { setNiche(e.target.value); }}/>
        </Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Metric label">
            <input style={iStyle()} type="text" maxLength={60} value={metricLabel} onChange={function(e) { setMetricLabel(e.target.value); }}/>
          </Field>
          <Field label="Metric value">
            <input style={iStyle()} type="text" maxLength={40} value={metricValue} onChange={function(e) { setMetricValue(e.target.value); }}/>
          </Field>
        </div>
        <Field label="Accent colour">
          <div style={{ display:'flex', gap:8 }}>
            {COLOUR_SWATCHES.map(function(sw) {
              return (
                <button key={sw.key} type="button" onClick={function() { setColour(sw.key); }}
                  style={{
                    width:32, height:32, borderRadius:8, border: colour === sw.key ? '2px solid #0f172a' : '2px solid transparent',
                    background: sw.hex, cursor:'pointer', transform: colour === sw.key ? 'scale(1.1)' : 'scale(1)', transition:'all .15s',
                  }}
                  aria-label={sw.key}
                />
              );
            })}
          </div>
        </Field>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
          <button onClick={props.onClose} disabled={saving}
            style={{ padding:'10px 18px', borderRadius:10, border:'1px solid #cbd5e1', background:'#fff', color:'#475569', fontWeight:600, cursor:'pointer', fontSize:14 }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            style={{ padding:'10px 18px', borderRadius:10, border:'none', background:'#0ea5e9', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field(props) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>{props.label}</label>
      {props.children}
    </div>
  );
}
function iStyle() {
  return { width:'100%', padding:'9px 12px', fontSize:13, fontFamily:'inherit', border:'1px solid #cbd5e1', borderRadius:8, background:'#fff', color:'#0f172a' };
}

export default function AdminShowcase() {
  var auth = useAuth();
  var _tab = useState('pending'); var tab = _tab[0]; var setTab = _tab[1];
  var _typeFilter = useState(''); var typeFilter = _typeFilter[0]; var setTypeFilter = _typeFilter[1];
  var _rows = useState([]); var rows = _rows[0]; var setRows = _rows[1];
  var _counts = useState({ pending: 0, approved: 0 }); var counts = _counts[0]; var setCounts = _counts[1];
  var _loading = useState(true); var loading = _loading[0]; var setLoading = _loading[1];
  var _error = useState(''); var error = _error[0]; var setError = _error[1];
  var _editing = useState(null); var editing = _editing[0]; var setEditing = _editing[1];
  var _busyId = useState(null); var busyId = _busyId[0]; var setBusyId = _busyId[1];

  function load() {
    setLoading(true);
    var params = 'status=' + tab;
    if (typeFilter) params += '&artifact_type=' + typeFilter;
    apiGet('/admin/api/showcase?' + params).then(function(r) {
      if (r) {
        setRows(r.showcase || []);
        setCounts(r.counts || { pending: 0, approved: 0 });
      }
      setLoading(false);
    }).catch(function(e) {
      setError((e && e.message) || 'Failed to load');
      setLoading(false);
    });
  }

  useEffect(function() { load(); }, [tab, typeFilter]);

  function approve(id) {
    if (busyId) return;
    setBusyId(id);
    apiPost('/admin/api/showcase/' + id + '/approve', {}).then(function() {
      setBusyId(null); load();
    }).catch(function(e) {
      setBusyId(null); setError((e && e.message) || 'Approve failed');
    });
  }

  function reject(id) {
    if (busyId) return;
    if (!window.confirm('Reject and permanently delete this showcase? The member can submit the same artifact again afterwards.')) return;
    setBusyId(id);
    apiPost('/admin/api/showcase/' + id + '/reject', {}).then(function() {
      setBusyId(null); load();
    }).catch(function(e) {
      setBusyId(null); setError((e && e.message) || 'Reject failed');
    });
  }

  function reorder(id, delta) {
    if (busyId) return;
    var row = rows.find(function(x) { return x.id === id; });
    if (!row) return;
    var newOrder = (row.sort_order || 0) + delta;
    setBusyId(id);
    apiPost('/admin/api/showcase/' + id + '/reorder', { sort_order: newOrder }).then(function() {
      setBusyId(null); load();
    }).catch(function(e) {
      setBusyId(null); setError((e && e.message) || 'Reorder failed');
    });
  }

  if (auth && auth.user && !auth.user.is_admin) {
    return (
      <AppLayout title="Admin — Showcase">
        <div style={{ padding:40, textAlign:'center', color:'#64748b' }}>Admin access required.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Showcase Moderation"
      subtitle="Approve featured artifacts submitted by members for /explore tab 3"
    >
      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', color:'#b91c1c', padding:'12px 16px', borderRadius:10, marginBottom:16, fontSize:14 }}>
          <AlertCircle size={18}/><span>{error}</span>
        </div>
      )}

      {/* Status tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, borderBottom:'2px solid #e8ecf2', paddingBottom:0 }}>
        {[
          { key:'pending',  label:'Pending review', count: counts.pending,  icon: Clock },
          { key:'approved', label:'Approved (live)', count: counts.approved, icon: Check },
          { key:'all',      label:'All',             count: counts.pending + counts.approved, icon: Eye },
        ].map(function(t) {
          var Icon = t.icon;
          var on = tab === t.key;
          return (
            <button key={t.key} onClick={function() { setTab(t.key); }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', fontSize:13, fontWeight: on ? 800 : 600,
                       border:'none', borderBottom: on ? '3px solid #0ea5e9' : '3px solid transparent',
                       cursor:'pointer', fontFamily:'inherit', background: on ? 'rgba(14,165,233,.06)' : 'transparent',
                       color: on ? '#0ea5e9' : '#64748b', marginBottom:-2, borderRadius:'6px 6px 0 0', transition:'all .15s' }}>
              <Icon size={14}/><span>{t.label}</span>
              <span style={{ background: on ? '#0ea5e9' : '#cbd5e1', color:'#fff', padding:'2px 7px', borderRadius:10, fontSize:11, fontWeight:700 }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Type filter chips */}
      <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap' }}>
        {[
          { key: '', label: 'All types' },
          { key: 'bio-link', label: 'Bio Links' },
          { key: 'landing-page', label: 'Landing Pages' },
          { key: 'campaign', label: 'Campaigns' },
        ].map(function(f) {
          var on = typeFilter === f.key;
          return (
            <button key={f.key || 'any'} onClick={function() { setTypeFilter(f.key); }}
              style={{
                padding:'6px 12px', fontSize:12, fontWeight: on ? 700 : 600,
                borderRadius:100, cursor:'pointer', fontFamily:'inherit',
                border: on ? '1px solid #0ea5e9' : '1px solid #cbd5e1',
                background: on ? 'rgba(14,165,233,.08)' : '#fff',
                color: on ? '#0ea5e9' : '#64748b',
              }}>{f.label}</button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding:60, display:'flex', justifyContent:'center' }}>
          <div style={{ width:36, height:36, border:'3px solid #e5e7eb', borderTopColor:'#0ea5e9', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding:60, textAlign:'center', color:'#64748b', background:'#f8fafc', border:'1px dashed #cbd5e1', borderRadius:16 }}>
          <Sparkles size={32} style={{ color:'#94a3b8', marginBottom:10 }}/>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>No {tab === 'pending' ? 'pending' : tab === 'approved' ? 'approved' : ''} showcase entries</div>
          <div style={{ fontSize:13 }}>
            {tab === 'pending' ? "When members opt artifacts in, they'll show up here for review." : tab === 'approved' ? 'Approved showcase entries appear on /explore tab 3.' : 'No showcase entries have been submitted yet.'}
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(480px, 1fr))', gap:18 }}>
          {rows.map(function(s) {
            return (
              <div key={s.id} style={{
                background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:18,
                display:'flex', flexDirection:'column', gap:14,
              }}>
                {/* Header */}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                  <div>
                    <div style={{
                      display:'inline-flex', alignItems:'center', gap:6,
                      padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700,
                      background: s.approved ? 'rgba(34,197,94,.12)' : 'rgba(245,158,11,.12)',
                      color: s.approved ? '#16a34a' : '#d97706',
                    }}>
                      {s.approved ? <Check size={12}/> : <Clock size={12}/>}
                      {s.approved ? 'LIVE' : 'PENDING'}
                    </div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:6 }}>
                      <strong style={{ color:'#334155' }}>#{s.id}</strong>
                      {s.username && <> · <span style={{ color:'#0ea5e9' }}>@{s.username}</span></>}
                    </div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                      Submitted {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                    </div>
                  </div>
                  {s.approved && (
                    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                      <button onClick={function() { reorder(s.id, -1); }} disabled={busyId === s.id}
                        style={{ padding:4, border:'1px solid #e2e8f0', borderRadius:6, background:'#fff', cursor:'pointer', color:'#64748b' }}
                        title="Move up">
                        <ChevronUp size={14}/>
                      </button>
                      <span style={{ fontSize:11, color:'#94a3b8', minWidth:18, textAlign:'center' }}>{s.sort_order}</span>
                      <button onClick={function() { reorder(s.id, 1); }} disabled={busyId === s.id}
                        style={{ padding:4, border:'1px solid #e2e8f0', borderRadius:6, background:'#fff', cursor:'pointer', color:'#64748b' }}
                        title="Move down">
                        <ChevronDown size={14}/>
                      </button>
                    </div>
                  )}
                </div>

                {/* Live artifact preview (dereferenced via server) */}
                <ArtifactPreview story={s}/>

                {/* Member-submitted showcase copy */}
                <div style={{ padding:'12px 14px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>
                    Member-submitted copy
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:2 }}>{s.display_title}</div>
                  <div style={{ fontSize:12, color:'#64748b' }}>{s.display_niche}</div>
                  {s.metric_label && s.metric_value && (
                    <div style={{ marginTop:8, fontSize:12, color:'#475569' }}>
                      <strong>{s.metric_label}:</strong> {s.metric_value}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {!s.approved && s.artifact_alive && (
                    <button onClick={function() { approve(s.id); }} disabled={busyId === s.id}
                      style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 14px', borderRadius:10, border:'none', background:'#22c55e', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:13, opacity: busyId === s.id ? 0.6 : 1 }}>
                      <Check size={15}/>Approve
                    </button>
                  )}
                  <button onClick={function() { setEditing(s); }} disabled={busyId === s.id}
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 14px', borderRadius:10, border:'1px solid #cbd5e1', background:'#fff', color:'#475569', fontWeight:600, cursor:'pointer', fontSize:13 }}>
                    <Edit3 size={14}/>Edit
                  </button>
                  <button onClick={function() { reject(s.id); }} disabled={busyId === s.id}
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 14px', borderRadius:10, border:'1px solid #fecaca', background:'#fff', color:'#dc2626', fontWeight:600, cursor:'pointer', fontSize:13 }}>
                    <X size={14}/>Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <EditModal story={editing} onClose={function() { setEditing(null); }} onSaved={function() { setEditing(null); load(); }}/>}
    </AppLayout>
  );
}
