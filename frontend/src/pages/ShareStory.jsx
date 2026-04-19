import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';
import AppLayout from '../components/layout/AppLayout';
import { Sparkles, Check, AlertCircle, Clock, Heart } from 'lucide-react';

// Milestone colour swatches — must match milestone_color enum in app/main.py
var COLOUR_SWATCHES = [
  { key: 'green',  hex: '#22c55e', name: 'Green'  },
  { key: 'sky',    hex: '#0ea5e9', name: 'Sky'    },
  { key: 'indigo', hex: '#6366f1', name: 'Indigo' },
  { key: 'amber',  hex: '#f59e0b', name: 'Amber'  },
  { key: 'pink',   hex: '#ec4899', name: 'Pink'   },
];

// Field length caps — match Column(String(N)) in database.py MemberStory
var MAX = {
  niche:           100,
  country:         100,
  milestone_label: 120,
  story_text:      400,
};

export default function ShareStory() {
  var { t } = useTranslation();
  var auth = useAuth();
  var user = auth.user;

  var _loading = useState(true);        var loading = _loading[0];        var setLoading = _loading[1];
  var _existing = useState(null);       var existing = _existing[0];       var setExisting = _existing[1];
  var _submitted = useState(false);     var submitted = _submitted[0];     var setSubmitted = _submitted[1];
  var _submitting = useState(false);    var submitting = _submitting[0];   var setSubmitting = _submitting[1];
  var _error = useState('');            var error = _error[0];             var setError = _error[1];

  // Form fields
  var _niche = useState('');            var niche = _niche[0];             var setNiche = _niche[1];
  var _country = useState('');          var country = _country[0];         var setCountry = _country[1];
  var _days = useState('');             var days = _days[0];               var setDays = _days[1];
  var _milestoneLabel = useState('');   var milestoneLabel = _milestoneLabel[0]; var setMilestoneLabel = _milestoneLabel[1];
  var _storyText = useState('');        var storyText = _storyText[0];     var setStoryText = _storyText[1];
  var _nowMonthly = useState('');       var nowMonthly = _nowMonthly[0];   var setNowMonthly = _nowMonthly[1];
  var _milestoneColor = useState('green'); var milestoneColor = _milestoneColor[0]; var setMilestoneColor = _milestoneColor[1];

  // Initial load: check if user already submitted
  useEffect(function() {
    apiGet('/api/member/story/mine').then(function(r) {
      if (r && r.exists) {
        setExisting(r);
      }
      setLoading(false);
    }).catch(function() {
      // 401 or other — leave form open, form itself will gate on submit
      setLoading(false);
    });
  }, []);

  // Pre-fill country from user.display_city when user loads
  useEffect(function() {
    if (user && user.display_city && !country) {
      setCountry(user.display_city);
    }
  }, [user]);

  function handleSubmit() {
    if (submitting) return;
    setError('');

    // Client-side validation (server re-validates)
    var n = (niche || '').trim();
    var m = (milestoneLabel || '').trim();
    var s = (storyText || '').trim();
    if (!n || !m || !s) {
      setError(t('shareStory.errRequired', { defaultValue: 'Niche, milestone label, and your story are all required.' }));
      return;
    }
    if (s.length > MAX.story_text) {
      setError(t('shareStory.errTooLong', { defaultValue: 'Story text is too long.' }));
      return;
    }

    setSubmitting(true);

    var payload = {
      niche:              n.slice(0, MAX.niche),
      display_country:    (country || '').trim().slice(0, MAX.country),
      days_to_milestone:  days === '' ? null : parseInt(days, 10),
      milestone_label:    m.slice(0, MAX.milestone_label),
      story_text:         s.slice(0, MAX.story_text),
      milestone_color:    milestoneColor,
      now_monthly_amount: nowMonthly === '' ? null : parseFloat(nowMonthly),
    };

    apiPost('/api/member/story', payload).then(function(r) {
      setSubmitting(false);
      if (r && r.success) {
        setSubmitted(true);
      } else {
        setError(t('shareStory.errSubmitFailed', { defaultValue: 'Something went wrong. Please try again.' }));
      }
    }).catch(function(e) {
      setSubmitting(false);
      setError((e && e.message) || t('shareStory.errSubmitFailed', { defaultValue: 'Something went wrong. Please try again.' }));
    });
  }

  // ── Renders ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppLayout title={t('shareStory.title', { defaultValue: 'Share Your Story' })}>
        <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
          <div style={{ width:40, height:40, border:'3px solid #e5e7eb', borderTopColor:'#0ea5e9', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      </AppLayout>
    );
  }

  // Already submitted — show state depending on approved flag
  if (existing || submitted) {
    var approved = existing && existing.approved;
    return (
      <AppLayout title={t('shareStory.title', { defaultValue: 'Share Your Story' })}>
        <div style={{
          maxWidth: 640, margin: '0 auto', padding: '48px 32px',
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18,
          textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: approved ? 'rgba(34,197,94,.12)' : 'rgba(14,165,233,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            {approved
              ? <Check size={36} color="#22c55e"/>
              : <Clock size={36} color="#0ea5e9"/>}
          </div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:24, fontWeight:800, color:'#0f172a', marginBottom:10 }}>
            {approved
              ? t('shareStory.liveTitle', { defaultValue: 'Your story is live on /explore 🎉' })
              : t('shareStory.pendingTitle', { defaultValue: "Thanks — we're reviewing your story" })}
          </div>
          <div style={{ fontSize:15, lineHeight:1.6, color:'#475569', maxWidth:480, margin:'0 auto' }}>
            {approved
              ? t('shareStory.liveBody',    { defaultValue: 'Your story has been approved and is helping new members see what\'s possible. Thank you for sharing.' })
              : t('shareStory.pendingBody', { defaultValue: 'Our team reviews every story to keep /explore authentic. You\'ll get a notification once it goes live — usually within 24 hours.' })}
          </div>
          {existing && existing.milestone_label && (
            <div style={{
              marginTop: 28, padding: '16px 20px',
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
              textAlign: 'left',
            }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>
                {t('shareStory.yourSubmission', { defaultValue: 'Your submission' })}
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:4 }}>
                {existing.niche} · {existing.milestone_label}
              </div>
              <div style={{ fontSize:13, color:'#475569', lineHeight:1.5 }}>
                {existing.story_text}
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // Full form
  var storyLen = (storyText || '').length;
  var nicheLen = (niche || '').length;
  var labelLen = (milestoneLabel || '').length;
  var countryLen = (country || '').length;

  return (
    <AppLayout
      title={t('shareStory.title',    { defaultValue: 'Share Your Story' })}
      subtitle={t('shareStory.subtitle', { defaultValue: 'Inspire the next member. Your first-dollar story shows up on /explore once approved.' })}
    >
      <style>{`
        .ss-label { display:block; font-size:12px; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
        .ss-hint  { font-size:12px; color:#64748b; margin-top:6px; line-height:1.5; }
        .ss-input, .ss-textarea {
          width:100%; padding:11px 14px; font-size:14px; font-family:inherit;
          border:1px solid #cbd5e1; border-radius:10px; background:#fff; color:#0f172a;
          transition: border-color .15s, box-shadow .15s;
        }
        .ss-input:focus, .ss-textarea:focus {
          outline:none; border-color:#0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.15);
        }
        .ss-textarea { min-height:110px; resize:vertical; line-height:1.5; }
        .ss-counter { font-size:11px; color:#94a3b8; font-weight:600; }
        .ss-counter.warn { color:#f59e0b; }
        .ss-counter.over { color:#ef4444; }
        .ss-row { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
        @media(max-width:640px){ .ss-row { grid-template-columns: 1fr; } }
        .ss-swatch {
          width:36px; height:36px; border-radius:10px; border:2px solid transparent;
          cursor:pointer; transition: transform .15s, border-color .15s;
        }
        .ss-swatch:hover { transform: scale(1.08); }
        .ss-swatch.active { border-color:#0f172a; transform: scale(1.1); }
        .ss-submit {
          background: linear-gradient(135deg,#0ea5e9,#38bdf8);
          color:#fff; border:none; padding:14px 28px; border-radius:12px;
          font-size:15px; font-weight:700; cursor:pointer; font-family:inherit;
          transition: transform .15s, box-shadow .15s, opacity .15s;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .ss-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(14,165,233,.3); }
        .ss-submit:disabled { opacity:.6; cursor:not-allowed; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Intro card */}
      <div style={{
        maxWidth:720, margin:'0 auto 24px',
        background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
        border:'1px solid #bae6fd', borderRadius:16, padding:'24px 28px',
        display:'flex', gap:16, alignItems:'flex-start',
      }}>
        <div style={{
          width:48, height:48, borderRadius:12, background:'#0ea5e9',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>
          <Sparkles size={24} color="#fff"/>
        </div>
        <div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:18, fontWeight:700, color:'#0c4a6e', marginBottom:6 }}>
            {t('shareStory.introTitle', { defaultValue: 'Your story helps new members believe' })}
          </div>
          <div style={{ fontSize:14, lineHeight:1.6, color:'#075985' }}>
            {t('shareStory.introBody', { defaultValue: 'Nothing sells SuperAdPro like a real person describing their first paid commission. Keep it honest, keep it short, and the team will review it within 24 hours.' })}
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{
        maxWidth:720, margin:'0 auto',
        background:'#fff', border:'1px solid #e2e8f0', borderRadius:18,
        padding:'32px',
      }}>
        {error && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)',
            color:'#b91c1c', padding:'12px 16px', borderRadius:10, marginBottom:20, fontSize:14,
          }}>
            <AlertCircle size={18}/>
            <span>{error}</span>
          </div>
        )}

        {/* Niche */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
            <label className="ss-label" style={{ marginBottom:0 }}>
              {t('shareStory.nicheLabel', { defaultValue: 'Your niche' })} *
            </label>
            <span className={'ss-counter' + (nicheLen > MAX.niche * 0.9 ? ' warn' : '') + (nicheLen > MAX.niche ? ' over' : '')}>
              {nicheLen}/{MAX.niche}
            </span>
          </div>
          <input
            className="ss-input" type="text" maxLength={MAX.niche}
            placeholder={t('shareStory.nichePlaceholder', { defaultValue: 'e.g. Yoga teacher, Crypto trader, Pet groomer' })}
            value={niche}
            onChange={function(e) { setNiche(e.target.value); }}
          />
          <div className="ss-hint">
            {t('shareStory.nicheHint', { defaultValue: 'A short description of what you do. Shown on your card.' })}
          </div>
        </div>

        {/* Country */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
            <label className="ss-label" style={{ marginBottom:0 }}>
              {t('shareStory.countryLabel', { defaultValue: 'Country (or region)' })}
            </label>
            <span className={'ss-counter' + (countryLen > MAX.country * 0.9 ? ' warn' : '') + (countryLen > MAX.country ? ' over' : '')}>
              {countryLen}/{MAX.country}
            </span>
          </div>
          <input
            className="ss-input" type="text" maxLength={MAX.country}
            placeholder={t('shareStory.countryPlaceholder', { defaultValue: 'e.g. United Kingdom, California, India' })}
            value={country}
            onChange={function(e) { setCountry(e.target.value); }}
          />
          <div className="ss-hint">
            {t('shareStory.countryHint', { defaultValue: 'Optional. Helps readers see members earning from all over the world.' })}
          </div>
        </div>

        {/* Milestone row: label + days */}
        <div className="ss-row" style={{ marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <label className="ss-label" style={{ marginBottom:0 }}>
                {t('shareStory.milestoneLabel', { defaultValue: 'Milestone' })} *
              </label>
              <span className={'ss-counter' + (labelLen > MAX.milestone_label * 0.9 ? ' warn' : '') + (labelLen > MAX.milestone_label ? ' over' : '')}>
                {labelLen}/{MAX.milestone_label}
              </span>
            </div>
            <input
              className="ss-input" type="text" maxLength={MAX.milestone_label}
              placeholder={t('shareStory.milestonePlaceholder', { defaultValue: 'e.g. first $17.50, first grid completion' })}
              value={milestoneLabel}
              onChange={function(e) { setMilestoneLabel(e.target.value); }}
            />
          </div>
          <div>
            <label className="ss-label">
              {t('shareStory.daysLabel', { defaultValue: 'Days to reach it' })}
            </label>
            <input
              className="ss-input" type="number" min="0" max="9999"
              placeholder={t('shareStory.daysPlaceholder', { defaultValue: 'e.g. 3' })}
              value={days}
              onChange={function(e) { setDays(e.target.value); }}
            />
          </div>
        </div>

        {/* Story text */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
            <label className="ss-label" style={{ marginBottom:0 }}>
              {t('shareStory.storyLabel', { defaultValue: 'Your story' })} *
            </label>
            <span className={'ss-counter' + (storyLen > MAX.story_text * 0.9 ? ' warn' : '') + (storyLen > MAX.story_text ? ' over' : '')}>
              {storyLen}/{MAX.story_text}
            </span>
          </div>
          <textarea
            className="ss-textarea" maxLength={MAX.story_text}
            placeholder={t('shareStory.storyPlaceholder', { defaultValue: 'What did you do? How did you share your link? What surprised you? Keep it real — 2-3 sentences works best.' })}
            value={storyText}
            onChange={function(e) { setStoryText(e.target.value); }}
          />
          <div className="ss-hint">
            {t('shareStory.storyHint', { defaultValue: 'Honest and specific beats polished. 200 characters is the sweet spot.' })}
          </div>
        </div>

        {/* Now monthly (optional) */}
        <div style={{ marginBottom:20 }}>
          <label className="ss-label">
            {t('shareStory.nowMonthlyLabel', { defaultValue: 'Currently earning per month (optional)' })}
          </label>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#64748b', fontWeight:700, fontSize:14 }}>$</span>
            <input
              className="ss-input" type="number" min="0" step="0.01"
              style={{ paddingLeft:26 }}
              placeholder={t('shareStory.nowMonthlyPlaceholder', { defaultValue: 'e.g. 420' })}
              value={nowMonthly}
              onChange={function(e) { setNowMonthly(e.target.value); }}
            />
          </div>
          <div className="ss-hint">
            {t('shareStory.nowMonthlyHint', { defaultValue: "Only fill this in if you're comfortable sharing. Shown as 'Now earning $X/mo' on the card footer." })}
          </div>
        </div>

        {/* Colour */}
        <div style={{ marginBottom:28 }}>
          <label className="ss-label">
            {t('shareStory.colorLabel', { defaultValue: 'Card accent colour' })}
          </label>
          <div style={{ display:'flex', gap:10 }}>
            {COLOUR_SWATCHES.map(function(sw) {
              return (
                <button
                  key={sw.key}
                  type="button"
                  className={'ss-swatch' + (milestoneColor === sw.key ? ' active' : '')}
                  style={{ background: sw.hex }}
                  title={sw.name}
                  aria-label={sw.name}
                  onClick={function() { setMilestoneColor(sw.key); }}
                />
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:12, alignItems:'center' }}>
          <div style={{ fontSize:12, color:'#64748b' }}>
            {t('shareStory.reviewNote', { defaultValue: 'Reviewed within 24h before going live' })}
          </div>
          <button
            type="button"
            className="ss-submit"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
                <span>{t('shareStory.submitting', { defaultValue: 'Submitting…' })}</span>
              </>
            ) : (
              <>
                <Heart size={16}/>
                <span>{t('shareStory.submitBtn', { defaultValue: 'Submit for review' })}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
