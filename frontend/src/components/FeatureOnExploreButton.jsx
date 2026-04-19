import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost } from '../utils/api';
import { Sparkles, Check, Clock, X, AlertCircle } from 'lucide-react';

var COLOUR_SWATCHES = [
  { key: 'sky',    hex: '#0ea5e9' },
  { key: 'indigo', hex: '#6366f1' },
  { key: 'amber',  hex: '#f59e0b' },
  { key: 'green',  hex: '#22c55e' },
  { key: 'pink',   hex: '#ec4899' },
];

var METRIC_PRESETS = [
  { key: 'clicks',      label: 'Clicks this month' },
  { key: 'subscribers', label: 'Active subscribers' },
  { key: 'conversion',  label: 'Conversion rate' },
  { key: 'sales',       label: 'Sales total' },
  { key: 'views',       label: 'Views delivered' },
  { key: 'custom',      label: 'Custom…' },
];

var MAX = {
  display_title: 160,
  display_niche: 80,
  metric_label:  60,
  metric_value:  40,
};

/**
 * Drop-in button that opens the "Feature on /explore" modal.
 * Renders one of three states based on /api/member/showcase/eligible:
 *   - "Feature on /explore" (default — opens modal)
 *   - "Pending review" (member has submitted, awaiting admin)
 *   - "Featured on /explore" (approved and live)
 *
 * Props:
 *   artifactType:  "bio-link" | "landing-page" | "campaign"
 *   artifactId:    integer (optional — if omitted, auto-discovers the user's
 *                  single artifact of this type, e.g. their LinkHub profile)
 *   artifactTitle: optional string, pre-fills display_title for convenience
 *   variant:       "primary" | "secondary" (default secondary — fits into editor toolbars)
 */
export default function FeatureOnExploreButton(props) {
  var { t } = useTranslation();
  var artifactType = props.artifactType;

  var _state = useState({ loaded: false, submitted: null, resolvedId: null }); var state = _state[0]; var setState = _state[1];
  var _modalOpen = useState(false); var modalOpen = _modalOpen[0]; var setModalOpen = _modalOpen[1];

  function loadState() {
    if (!artifactType) return;
    apiGet('/api/member/showcase/eligible').then(function(r) {
      // Resolve artifact id: prop takes precedence, else auto-pick from eligibility list
      var resolvedId = props.artifactId;
      if (!resolvedId && r) {
        if (artifactType === 'bio-link' && r.bio_links && r.bio_links.length > 0) {
          resolvedId = r.bio_links[0].id;
        }
        // landing-page and campaign require explicit id — member may have many
      }
      var submitted = null;
      if (resolvedId && r && r.submitted) {
        submitted = r.submitted[artifactType + ':' + resolvedId] || null;
      }
      setState({ loaded: true, submitted: submitted, resolvedId: resolvedId });
    }).catch(function() {
      setState({ loaded: true, submitted: null, resolvedId: props.artifactId || null });
    });
  }

  useEffect(function() { loadState(); }, [artifactType, props.artifactId]);

  function onSubmitted() {
    setModalOpen(false);
    loadState();
  }

  if (!state.loaded) {
    return (
      <button disabled style={buttonStyle(props.variant, 'neutral')}>
        <Sparkles size={15}/>
        <span>{t('featureExplore.loading', { defaultValue: 'Loading…' })}</span>
      </button>
    );
  }

  // Nothing to feature — member hasn't created the artifact yet (e.g. no published LinkHub).
  // Hide the button rather than confusing the user.
  if (!state.resolvedId) {
    return null;
  }

  if (state.submitted && state.submitted.approved) {
    return (
      <button disabled style={buttonStyle(props.variant, 'live')}>
        <Check size={15}/>
        <span>{t('featureExplore.live', { defaultValue: 'Featured on /explore' })}</span>
      </button>
    );
  }

  if (state.submitted && !state.submitted.approved) {
    return (
      <button disabled style={buttonStyle(props.variant, 'pending')}>
        <Clock size={15}/>
        <span>{t('featureExplore.pending', { defaultValue: 'Pending review' })}</span>
      </button>
    );
  }

  return (
    <>
      <button onClick={function() { setModalOpen(true); }} style={buttonStyle(props.variant, 'default')}>
        <Sparkles size={15}/>
        <span>{t('featureExplore.cta', { defaultValue: 'Feature on /explore' })}</span>
      </button>
      {modalOpen && (
        <ShowcaseModal
          artifactType={artifactType}
          artifactId={state.resolvedId}
          artifactTitle={props.artifactTitle || ''}
          onClose={function() { setModalOpen(false); }}
          onSubmitted={onSubmitted}
        />
      )}
    </>
  );
}

function buttonStyle(variant, mode) {
  var base = {
    display:'inline-flex', alignItems:'center', gap:8,
    padding: variant === 'primary' ? '11px 20px' : '9px 16px',
    fontSize: variant === 'primary' ? 14 : 13,
    fontWeight: 700, fontFamily:'inherit',
    borderRadius: 10, cursor: 'pointer',
    transition: 'transform .15s, box-shadow .15s, opacity .15s',
    border: 'none',
  };
  if (mode === 'default') {
    return Object.assign(base, {
      background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
      color: '#fff',
    });
  }
  if (mode === 'pending') {
    return Object.assign(base, {
      background: 'rgba(245,158,11,.12)', color: '#b45309', cursor:'default',
      border: '1px solid rgba(245,158,11,.3)',
    });
  }
  if (mode === 'live') {
    return Object.assign(base, {
      background: 'rgba(34,197,94,.12)', color: '#15803d', cursor:'default',
      border: '1px solid rgba(34,197,94,.3)',
    });
  }
  return Object.assign(base, {
    background: '#e2e8f0', color: '#64748b', cursor:'wait',
  });
}

// ── Modal ─────────────────────────────────────────────────────

function ShowcaseModal(props) {
  var { t } = useTranslation();
  var _title = useState(props.artifactTitle || ''); var title = _title[0]; var setTitle = _title[1];
  var _niche = useState(''); var niche = _niche[0]; var setNiche = _niche[1];
  var _metricPreset = useState('clicks'); var metricPreset = _metricPreset[0]; var setMetricPreset = _metricPreset[1];
  var _metricLabel = useState('Clicks this month'); var metricLabel = _metricLabel[0]; var setMetricLabel = _metricLabel[1];
  var _metricValue = useState(''); var metricValue = _metricValue[0]; var setMetricValue = _metricValue[1];
  var _colour = useState('sky'); var colour = _colour[0]; var setColour = _colour[1];

  var _submitting = useState(false); var submitting = _submitting[0]; var setSubmitting = _submitting[1];
  var _error = useState(''); var error = _error[0]; var setError = _error[1];

  function onPresetChange(e) {
    var v = e.target.value;
    setMetricPreset(v);
    var preset = METRIC_PRESETS.find(function(p) { return p.key === v; });
    if (preset && v !== 'custom') {
      setMetricLabel(preset.label);
    } else if (v === 'custom') {
      setMetricLabel('');
    }
  }

  function submit() {
    if (submitting) return;
    setError('');
    var t = (title || '').trim();
    var n = (niche || '').trim();
    if (!t || !n) {
      setError('Title and niche are both required.');
      return;
    }
    setSubmitting(true);
    apiPost('/api/member/showcase', {
      artifact_type: props.artifactType,
      artifact_id:   props.artifactId,
      display_title: t.slice(0, MAX.display_title),
      display_niche: n.slice(0, MAX.display_niche),
      metric_label:  (metricLabel || '').slice(0, MAX.metric_label),
      metric_value:  (metricValue || '').slice(0, MAX.metric_value),
      accent_color:  colour,
    }).then(function(r) {
      setSubmitting(false);
      if (r && r.success) {
        props.onSubmitted();
      } else {
        setError('Submit failed. Please try again.');
      }
    }).catch(function(e) {
      setSubmitting(false);
      setError((e && e.message) || 'Submit failed.');
    });
  }

  var titleLen = (title || '').length;
  var nicheLen = (niche || '').length;
  var valueLen = (metricValue || '').length;

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,.6)', zIndex:100,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    }} onClick={props.onClose}>
      <div style={{
        maxWidth:560, width:'100%', maxHeight:'90vh', overflowY:'auto',
        background:'#fff', borderRadius:18, padding:28, position:'relative',
      }} onClick={function(e) { e.stopPropagation(); }}>
        <button onClick={props.onClose} style={{
          position:'absolute', top:16, right:16,
          width:32, height:32, borderRadius:8, border:'none',
          background:'#f1f5f9', color:'#64748b', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <X size={18}/>
        </button>

        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:6 }}>
          <div style={{
            width:40, height:40, borderRadius:10, background:'#0ea5e9',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Sparkles size={20} color="#fff"/>
          </div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:20, fontWeight:800, color:'#0f172a' }}>
            {t('featureExplore.modalTitle', { defaultValue: 'Feature on /explore' })}
          </div>
        </div>
        <div style={{ fontSize:13, color:'#64748b', marginBottom:22, lineHeight:1.5 }}>
          {t('featureExplore.modalSubtitle', { defaultValue: 'Your work could inspire the next member. Once approved, this card will appear on /explore tab 3 for new visitors to see.' })}
        </div>

        {error && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', color:'#b91c1c', padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13 }}>
            <AlertCircle size={16}/><span>{error}</span>
          </div>
        )}

        <Field label={t('featureExplore.titleLabel', { defaultValue: 'Display title' }) + ' *'} counter={titleLen + '/' + MAX.display_title}>
          <input style={iStyle()} type="text" maxLength={MAX.display_title}
            placeholder={t('featureExplore.titlePlaceholder', { defaultValue: 'e.g. The clean-eating reset · 7 days' })}
            value={title}
            onChange={function(e) { setTitle(e.target.value); }}/>
        </Field>

        <Field label={t('featureExplore.nicheLabel', { defaultValue: 'Niche' }) + ' *'} counter={nicheLen + '/' + MAX.display_niche}>
          <input style={iStyle()} type="text" maxLength={MAX.display_niche}
            placeholder={t('featureExplore.nichePlaceholder', { defaultValue: 'e.g. Nutrition, Trading, Fitness' })}
            value={niche}
            onChange={function(e) { setNiche(e.target.value); }}/>
        </Field>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label={t('featureExplore.metricLabelLabel', { defaultValue: 'Metric label' })}>
            <select style={iStyle()} value={metricPreset} onChange={onPresetChange}>
              {METRIC_PRESETS.map(function(p) { return <option key={p.key} value={p.key}>{p.label}</option>; })}
            </select>
            {metricPreset === 'custom' && (
              <input style={Object.assign({}, iStyle(), { marginTop:8 })} type="text" maxLength={MAX.metric_label}
                placeholder={t('featureExplore.metricLabelPlaceholder', { defaultValue: 'e.g. Members enrolled' })}
                value={metricLabel}
                onChange={function(e) { setMetricLabel(e.target.value); }}/>
            )}
          </Field>
          <Field label={t('featureExplore.metricValueLabel', { defaultValue: 'Metric value' })} counter={valueLen + '/' + MAX.metric_value}>
            <input style={iStyle()} type="text" maxLength={MAX.metric_value}
              placeholder={t('featureExplore.metricValuePlaceholder', { defaultValue: 'e.g. 8,420' })}
              value={metricValue}
              onChange={function(e) { setMetricValue(e.target.value); }}/>
          </Field>
        </div>

        <Field label={t('featureExplore.colorLabel', { defaultValue: 'Accent colour' })}>
          <div style={{ display:'flex', gap:8 }}>
            {COLOUR_SWATCHES.map(function(sw) {
              return (
                <button key={sw.key} type="button" onClick={function() { setColour(sw.key); }}
                  style={{
                    width:36, height:36, borderRadius:10, border: colour === sw.key ? '2px solid #0f172a' : '2px solid transparent',
                    background: sw.hex, cursor:'pointer', transform: colour === sw.key ? 'scale(1.08)' : 'scale(1)', transition:'all .15s',
                  }}
                  aria-label={sw.key}
                />
              );
            })}
          </div>
        </Field>

        <div style={{
          marginTop:18, padding:'12px 14px',
          background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10,
          fontSize:12, color:'#075985', lineHeight:1.5,
        }}>
          {t('featureExplore.reviewNote', { defaultValue: 'Our team reviews every submission before it goes live on /explore. Usually within 24 hours.' })}
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
          <button onClick={props.onClose} disabled={submitting}
            style={{ padding:'10px 18px', borderRadius:10, border:'1px solid #cbd5e1', background:'#fff', color:'#475569', fontWeight:600, cursor:'pointer', fontSize:14 }}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button onClick={submit} disabled={submitting}
            style={{ padding:'10px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#0ea5e9,#38bdf8)', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? t('featureExplore.submitting', { defaultValue: 'Submitting…' }) : t('featureExplore.submitBtn', { defaultValue: 'Submit for review' })}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field(props) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
        <label style={{ fontSize:11, fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:'.05em' }}>{props.label}</label>
        {props.counter && <span style={{ fontSize:10, color:'#94a3b8', fontWeight:600 }}>{props.counter}</span>}
      </div>
      {props.children}
    </div>
  );
}
function iStyle() {
  return { width:'100%', padding:'9px 12px', fontSize:13, fontFamily:'inherit', border:'1px solid #cbd5e1', borderRadius:8, background:'#fff', color:'#0f172a' };
}
