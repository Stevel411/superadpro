import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { Check, X, Edit3, ChevronUp, ChevronDown, Eye, Clock, Shield, AlertCircle, Sparkles } from 'lucide-react';

var COLOUR_SWATCHES = [
  { key: 'green',  hex: '#22c55e' },
  { key: 'sky',    hex: '#0ea5e9' },
  { key: 'indigo', hex: '#6366f1' },
  { key: 'amber',  hex: '#f59e0b' },
  { key: 'pink',   hex: '#ec4899' },
];

function formatMoney(n) {
  var v = Math.max(0, Math.floor(Number(n) || 0));
  return '$' + v.toLocaleString('en-US');
}

// Preview card — deliberately mirrors the .tl-card structure from /explore
// so the admin sees exactly what members will see, but with dark mockup colours
// so the cards read well against the admin panel's light theme.
function StoryPreview(props) {
  var s = props.story;
  var colourHex = (COLOUR_SWATCHES.find(function(c) { return c.key === s.milestone_color; }) || COLOUR_SWATCHES[0]).hex;
  var nameLine = s.display_country ? (s.display_initials + ' · ' + s.display_country) : s.display_initials;
  return (
    <div style={{
      background:'linear-gradient(180deg,rgba(11,18,48,.95),rgba(11,18,48,.85))',
      border:'1px solid rgba(255,255,255,.1)', borderRadius:16,
      padding:20, position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background: 'linear-gradient(90deg,' + colourHex + ',transparent)' }}/>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <div style={{
          width:44, height:44, borderRadius:'50%', background: colourHex,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'Sora,sans-serif', fontWeight:800, fontSize:15, color:'#0b1230', flexShrink:0,
        }}>{s.display_initials || 'SA'}</div>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:15, color:'#fff', letterSpacing:'-.01em' }}>{nameLine}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', letterSpacing:'.1em', textTransform:'uppercase', marginTop:2, fontFamily:'JetBrains Mono,monospace' }}>{s.niche}</div>
        </div>
      </div>
      {(s.days_to_milestone !== null && s.days_to_milestone !== undefined) && (
        <div style={{
          padding:'10px 14px', borderRadius:10,
          background: 'linear-gradient(135deg,' + colourHex + '33,' + colourHex + '14)',
          border: '1px solid ' + colourHex + '59',
          display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:12,
        }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:28, color: colourHex, letterSpacing:'-.04em', lineHeight:1 }}>{s.days_to_milestone}</div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,.5)', letterSpacing:'.1em', textTransform:'uppercase', textAlign:'right', fontFamily:'JetBrains Mono,monospace' }}>
            {s.days_to_milestone === 1 ? 'day to' : 'days to'}
            <div style={{ color:'#fff', fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:12, marginTop:2, textTransform:'none', letterSpacing:'-.01em' }}>{s.milestone_label}</div>
          </div>
        </div>
      )}
      {s.story_text && (
        <div style={{
          fontSize:13, lineHeight:1.5, color:'rgba(255,255,255,.75)',
          paddingLeft:10, borderLeft: '2px solid ' + colourHex + '59', marginBottom:12,
        }}>{s.story_text}</div>
      )}
      {s.now_monthly_amount > 0 && (
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          paddingTop:10, borderTop:'1px solid rgba(255,255,255,.08)',
        }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'JetBrains Mono,monospace' }}>earning now</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontWeight:900, fontSize:18, color:'#4ade80', letterSpacing:'-.02em' }}>{formatMoney(s.now_monthly_amount)}/mo</div>
        </div>
      )}
    </div>
  );
}

// Inline edit modal — same fields as the member-facing form, pre-filled
function EditModal(props) {
  var s = props.story;
  var _niche = useState(s.niche || ''); var niche = _niche[0]; var setNiche = _niche[1];
  var _country = useState(s.display_country || ''); var country = _country[0]; var setCountry = _country[1];
  var _days = useState(s.days_to_milestone == null ? '' : String(s.days_to_milestone)); var days = _days[0]; var setDays = _days[1];
  var _label = useState(s.milestone_label || ''); var label = _label[0]; var setLabel = _label[1];
  var _text = useState(s.story_text || ''); var text = _text[0]; var setText = _text[1];
  var _monthly = useState(s.now_monthly_amount == null ? '' : String(s.now_monthly_amount)); var monthly = _monthly[0]; var setMonthly = _monthly[1];
  var _colour = useState(s.milestone_color || 'green'); var colour = _colour[0]; var setColour = _colour[1];
  var _initials = useState(s.display_initials || ''); var initials = _initials[0]; var setInitials = _initials[1];
  var _saving = useState(false); var saving = _saving[0]; var setSaving = _saving[1];
  var _err = useState(''); var err = _err[0]; var setErr = _err[1];

  function save() {
    if (saving) return;
    setSaving(true); setErr('');
    apiPost('/admin/api/stories/' + s.id + '/edit', {
      niche: niche,
      display_country: country,
      days_to_milestone: days === '' ? null : parseInt(days, 10),
      milestone_label: label,
      story_text: text,
      now_monthly_amount: monthly === '' ? null : parseFloat(monthly),
      milestone_color: colour,
      display_initials: initials,
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
        maxWidth:640, width:'100%', maxHeight:'90vh', overflowY:'auto',
        background:'#fff', borderRadius:18, padding:28,
      }} onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:18 }}>
          Edit story #{s.id}
        </div>
        {err && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', color:'#b91c1c', padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13 }}>
            <AlertCircle size={16}/><span>{err}</span>
          </div>
        )}

        <Field label="Initials (2 chars)">
          <input style={iStyle()} type="text" maxLength={4} value={initials} onChange={function(e) { setInitials(e.target.value); }}/>
        </Field>
        <Field label="Niche *">
          <input style={iStyle()} type="text" maxLength={100} value={niche} onChange={function(e) { setNiche(e.target.value); }}/>
        </Field>
        <Field label="Country / region">
          <input style={iStyle()} type="text" maxLength={100} value={country} onChange={function(e) { setCountry(e.target.value); }}/>
        </Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 120px', gap:12 }}>
          <Field label="Milestone label *">
            <input style={iStyle()} type="text" maxLength={120} value={label} onChange={function(e) { setLabel(e.target.value); }}/>
          </Field>
          <Field label="Days">
            <input style={iStyle()} type="number" min="0" max="9999" value={days} onChange={function(e) { setDays(e.target.value); }}/>
          </Field>
        </div>
        <Field label={'Story text (' + text.length + '/400) *'}>
          <textarea style={Object.assign({}, iStyle(), { minHeight:100, resize:'vertical' })} maxLength={400} value={text} onChange={function(e) { setText(e.target.value); }}/>
        </Field>
        <Field label="Now earning monthly ($, optional)">
          <input style={iStyle()} type="number" min="0" step="0.01" value={monthly} onChange={function(e) { setMonthly(e.target.value); }}/>
        </Field>
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

export default function AdminStories() {
  var auth = useAuth();
  var _tab = useState('pending'); var tab = _tab[0]; var setTab = _tab[1];
  var _stories = useState([]); var stories = _stories[0]; var setStories = _stories[1];
  var _counts = useState({ pending: 0, approved: 0 }); var counts = _counts[0]; var setCounts = _counts[1];
  var _loading = useState(true); var loading = _loading[0]; var setLoading = _loading[1];
  var _error = useState(''); var error = _error[0]; var setError = _error[1];
  var _editing = useState(null); var editing = _editing[0]; var setEditing = _editing[1];
  var _busyId = useState(null); var busyId = _busyId[0]; var setBusyId = _busyId[1];

  function load() {
    setLoading(true);
    apiGet('/admin/api/stories?status=' + tab).then(function(r) {
      if (r) {
        setStories(r.stories || []);
        setCounts(r.counts || { pending: 0, approved: 0 });
      }
      setLoading(false);
    }).catch(function(e) {
      setError((e && e.message) || 'Failed to load');
      setLoading(false);
    });
  }

  useEffect(function() { load(); }, [tab]);

  function approve(id) {
    if (busyId) return;
    setBusyId(id);
    apiPost('/admin/api/stories/' + id + '/approve', {}).then(function() {
      setBusyId(null); load();
    }).catch(function(e) {
      setBusyId(null); setError((e && e.message) || 'Approve failed');
    });
  }

  function reject(id) {
    if (busyId) return;
    if (!window.confirm('Reject and permanently delete this story? The member can submit a new one after.')) return;
    setBusyId(id);
    apiPost('/admin/api/stories/' + id + '/reject', {}).then(function() {
      setBusyId(null); load();
    }).catch(function(e) {
      setBusyId(null); setError((e && e.message) || 'Reject failed');
    });
  }

  function reorder(id, delta) {
    if (busyId) return;
    var story = stories.find(function(x) { return x.id === id; });
    if (!story) return;
    var newOrder = (story.sort_order || 0) + delta;
    setBusyId(id);
    apiPost('/admin/api/stories/' + id + '/reorder', { sort_order: newOrder }).then(function() {
      setBusyId(null); load();
    }).catch(function(e) {
      setBusyId(null); setError((e && e.message) || 'Reorder failed');
    });
  }

  // Admin guard — redirect non-admins
  if (auth && auth.user && !auth.user.is_admin) {
    return (
      <AppLayout title="Admin — Stories">
        <div style={{ padding:40, textAlign:'center', color:'#64748b' }}>Admin access required.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Story Moderation"
      subtitle="Approve first-dollar stories submitted by members for /explore tab 2"
    >
      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', color:'#b91c1c', padding:'12px 16px', borderRadius:10, marginBottom:16, fontSize:14 }}>
          <AlertCircle size={18}/><span>{error}</span>
        </div>
      )}

      {/* Status tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:24, borderBottom:'2px solid #e8ecf2', paddingBottom:0 }}>
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

      {loading ? (
        <div style={{ padding:60, display:'flex', justifyContent:'center' }}>
          <div style={{ width:36, height:36, border:'3px solid #e5e7eb', borderTopColor:'#0ea5e9', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      ) : stories.length === 0 ? (
        <div style={{ padding:60, textAlign:'center', color:'#64748b', background:'#f8fafc', border:'1px dashed #cbd5e1', borderRadius:16 }}>
          <Sparkles size={32} style={{ color:'#94a3b8', marginBottom:10 }}/>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>No {tab === 'pending' ? 'pending' : tab === 'approved' ? 'approved' : ''} stories</div>
          <div style={{ fontSize:13 }}>
            {tab === 'pending' ? "When members submit, they'll show up here for review." : tab === 'approved' ? 'Approved stories appear on /explore tab 2.' : 'No stories have been submitted yet.'}
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(420px, 1fr))', gap:18 }}>
          {stories.map(function(s) {
            return (
              <div key={s.id} style={{
                background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:18,
                display:'flex', flexDirection:'column', gap:14,
              }}>
                {/* Header: badge + admin context */}
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
                      {s.user_country && <> · {s.user_country}</>}
                    </div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                      Submitted {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                    </div>
                  </div>
                  {s.approved && (
                    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                      <button onClick={function() { reorder(s.id, -1); }} disabled={busyId === s.id}
                        style={{ padding:4, border:'1px solid #e2e8f0', borderRadius:6, background:'#fff', cursor:'pointer', color:'#64748b' }}
                        title="Move up (lower sort_order)">
                        <ChevronUp size={14}/>
                      </button>
                      <span style={{ fontSize:11, color:'#94a3b8', minWidth:18, textAlign:'center' }}>{s.sort_order}</span>
                      <button onClick={function() { reorder(s.id, 1); }} disabled={busyId === s.id}
                        style={{ padding:4, border:'1px solid #e2e8f0', borderRadius:6, background:'#fff', cursor:'pointer', color:'#64748b' }}
                        title="Move down (higher sort_order)">
                        <ChevronDown size={14}/>
                      </button>
                    </div>
                  )}
                </div>

                {/* Card preview — exactly what members will see on /explore */}
                <StoryPreview story={s}/>

                {/* Actions */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {!s.approved && (
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
