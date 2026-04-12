import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../components/layout/AppLayout';

export default function CreateCampaign() {
  var { t } = useTranslation();
  var [title, setTitle] = useState('');
  var [videoUrl, setVideoUrl] = useState('');
  var [category, setCategory] = useState('business');
  var [description, setDescription] = useState('');
  var [targetCountry, setTargetCountry] = useState('');
  var [targetInterests, setTargetInterests] = useState('');
  var [submitting, setSubmitting] = useState(false);
  var [result, setResult] = useState(null);
  var [error, setError] = useState(null);
  var [preview, setPreview] = useState(null);

  var categories = [
    { value: 'business', label: t('createCampaign.catBusiness') },
    { value: 'marketing', label: t('createCampaign.catMarketing') },
    { value: 'crypto', label: t('createCampaign.catCrypto') },
    { value: 'health', label: t('createCampaign.catHealth') },
    { value: 'education', label: t('createCampaign.catEducation') },
    { value: 'tech', label: t('createCampaign.catTech') },
    { value: 'lifestyle', label: t('createCampaign.catLifestyle') },
    { value: 'ecommerce', label: t('createCampaign.catEcommerce') },
    { value: 'forex', label: t('createCampaign.catForex') },
    { value: 'general', label: t('createCampaign.catGeneral') },
  ];

  function parseVideoUrl(url) {
    if (!url) return null;
    var yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return { platform: 'youtube', id: yt[1], embed: 'https://www.youtube.com/embed/' + yt[1] };
    var vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return { platform: 'vimeo', id: vm[1], embed: 'https://player.vimeo.com/video/' + vm[1] };
    return null;
  }

  function handleUrlChange(url) {
    setVideoUrl(url);
    var parsed = parseVideoUrl(url);
    setPreview(parsed);
  }

  function handleSubmit() {
    if (!title.trim()) { setError(t('createCampaign.errTitle')); return; }
    if (!videoUrl.trim()) { setError(t('createCampaign.errUrl')); return; }
    if (!preview) { setError(t('createCampaign.errInvalidUrl')); return; }

    setSubmitting(true);
    setError(null);

    var formData = new URLSearchParams();
    formData.append('title', title.trim());
    formData.append('video_url', videoUrl.trim());
    formData.append('category', category);
    formData.append('description', description.trim());
    formData.append('target_country', targetCountry.trim());
    formData.append('target_interests', targetInterests.trim());

    fetch('/upload', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      setSubmitting(false);
      if (d.error) { setError(d.error); }
      else { setResult(d); setTitle(''); setVideoUrl(''); setDescription(''); setPreview(null); }
    })
    .catch(function(e) { setSubmitting(false); setError(e.message); });
  }

  var S = {
    page: { background: '#f0f3f9', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif" },
    header: { background: '#fff', borderBottom: '1px solid #e8ecf2', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    h1: { fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--sap-text-primary)', margin: 0 },
    wrap: { maxWidth: 800, margin: '24px auto', padding: '0 24px' },
    card: { background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 32 },
    label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6, marginTop: 20 },
    input: { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', transition: 'border 0.2s', background: 'var(--sap-bg-elevated)' },
    select: { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', background: 'var(--sap-bg-elevated)', cursor: 'pointer' },
    textarea: { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', background: 'var(--sap-bg-elevated)', minHeight: 80, resize: 'vertical' },
    btn: { display: 'inline-block', padding: '14px 40px', borderRadius: 12, fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', boxShadow: '0 4px 20px rgba(14,165,233,0.2)', transition: 'all 0.3s', marginTop: 24 },
    btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
    error: { marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: 'var(--sap-red-bright)', fontSize: 14, fontWeight: 600 },
    success: { marginTop: 16, padding: '16px 20px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: 'var(--sap-green-mid)', fontSize: 14, fontWeight: 600 },
  };

  return (
    <AppLayout title={t("createCampaign.title")} subtitle={t("createCampaign.subtitle")}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

      <div style={S.wrap}>
        <div style={S.card}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{t('createCampaign.campaignDetails')}</div>
          <div style={{ fontSize: 14, color: 'var(--sap-text-muted)', marginBottom: 8 }}>{t('createCampaign.campaignDetailsDesc')}</div>

          <label style={S.label}>{t('createCampaign.campaignTitle')}</label>
          <input style={S.input} value={title} onChange={function(e) { setTitle(e.target.value); }} placeholder={t("createCampaign.campaignTitlePlaceholder")} maxLength={120} />

          <label style={S.label}>{t('createCampaign.videoUrl')}</label>
          <input style={S.input} value={videoUrl} onChange={function(e) { handleUrlChange(e.target.value); }} placeholder={t("createCampaign.videoUrlPlaceholder")} />
          {videoUrl && !preview && <div style={{ fontSize: 12, color: 'var(--sap-red-bright)', marginTop: 6 }}>{t('createCampaign.unsupportedUrl')}</div>}

          {/* Video preview */}
          {preview && (
            <div style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#000' }}>
              <iframe src={preview.embed} style={{ width: '100%', height: 340, border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="preview" />
              <div style={{ padding: '10px 16px', background: 'var(--sap-bg-elevated)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: preview.platform === 'youtube' ? 'rgba(239,68,68,0.08)' : 'rgba(14,165,233,0.08)', color: preview.platform === 'youtube' ? 'var(--sap-red-bright)' : 'var(--sap-accent)' }}>{preview.platform}</span>
                <span style={{ fontSize: 12, color: 'var(--sap-text-muted)' }}>ID: {preview.id}</span>
              </div>
            </div>
          )}

          <label style={S.label}>{t('createCampaign.category')}</label>
          <select style={S.select} value={category} onChange={function(e) { setCategory(e.target.value); }}>
            {categories.map(function(c) { return <option key={c.value} value={c.value}>{c.label}</option>; })}
          </select>

          <label style={S.label}>{t('createCampaign.description')}</label>
          <textarea style={S.textarea} value={description} onChange={function(e) { setDescription(e.target.value); }} placeholder={t("createCampaign.descPlaceholder")} maxLength={500} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={S.label}>{t('createCampaign.targetCountry')}</label>
              <input style={S.input} value={targetCountry} onChange={function(e) { setTargetCountry(e.target.value); }} placeholder={t("createCampaign.targetCountryPlaceholder")} maxLength={200} />
            </div>
            <div>
              <label style={S.label}>{t('createCampaign.targetInterests')}</label>
              <input style={S.input} value={targetInterests} onChange={function(e) { setTargetInterests(e.target.value); }} placeholder={t("createCampaign.targetInterestsPlaceholder")} maxLength={200} />
            </div>
          </div>

          {error && <div style={S.error}>{error}</div>}
          {result && <div style={S.success}>{t('createCampaign.successCreated')} {result.status === 'pending' ? t('createCampaign.pendingReview') : t('createCampaign.nowLive')} <a href="/video-library" style={{ color: 'var(--sap-green-mid)', fontWeight: 800 }}>{t('createCampaign.viewMyCampaigns')}</a></div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
            <button style={{ ...S.btn, ...(submitting ? S.btnDisabled : {}) }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? t('createCampaign.creating') : t('createCampaign.launchCampaign')}
            </button>
            <div style={{ fontSize: 13, color: 'var(--sap-text-faint)' }}>{t('createCampaign.tierNote')}</div>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🎬</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{t('createCampaign.pasteAndGo')}</div>
            <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', lineHeight: 1.5 }}>{t('createCampaign.pasteAndGoDesc')}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>👁️</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{t('createCampaign.realViews')}</div>
            <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', lineHeight: 1.5 }}>{t('createCampaign.realViewsDesc')}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{t('createCampaign.liveAnalytics')}</div>
            <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', lineHeight: 1.5 }}>{t('createCampaign.liveAnalyticsDesc')}</div>
          </div>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
