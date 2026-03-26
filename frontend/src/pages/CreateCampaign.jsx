import { useState } from 'react';

export default function CreateCampaign() {
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
    { value: 'business', label: 'Business & Finance' },
    { value: 'marketing', label: 'Marketing & Ads' },
    { value: 'crypto', label: 'Crypto & Web3' },
    { value: 'health', label: 'Health & Fitness' },
    { value: 'education', label: 'Education & Training' },
    { value: 'tech', label: 'Technology' },
    { value: 'lifestyle', label: 'Lifestyle' },
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'forex', label: 'Forex & Trading' },
    { value: 'general', label: 'General' },
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
    if (!title.trim()) { setError('Please enter a campaign title'); return; }
    if (!videoUrl.trim()) { setError('Please paste a video URL'); return; }
    if (!preview) { setError('Invalid video URL. Please use a YouTube or Vimeo link.'); return; }

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
    h1: { fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 },
    wrap: { maxWidth: 800, margin: '24px auto', padding: '0 24px' },
    card: { background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 32 },
    label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6, marginTop: 20 },
    input: { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', transition: 'border 0.2s', background: '#f8fafc' },
    select: { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', background: '#f8fafc', cursor: 'pointer' },
    textarea: { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', background: '#f8fafc', minHeight: 80, resize: 'vertical' },
    btn: { display: 'inline-block', padding: '14px 40px', borderRadius: 12, fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', boxShadow: '0 4px 20px rgba(14,165,233,0.2)', transition: 'all 0.3s', marginTop: 24 },
    btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
    error: { marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 14, fontWeight: 600 },
    success: { marginTop: 16, padding: '16px 20px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981', fontSize: 14, fontWeight: 600 },
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>Create Video Campaign</h1>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Upload a video and start getting views from the SuperAdPro network</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="/video-library" style={{ padding: '8px 20px', borderRadius: 10, background: '#f1f5f9', color: '#334155', textDecoration: 'none', fontWeight: 700, fontSize: 13, border: '1px solid #e2e8f0' }}>My Campaigns</a>
          <a href="/dashboard" style={{ padding: '8px 20px', borderRadius: 10, background: '#f1f5f9', color: '#334155', textDecoration: 'none', fontWeight: 700, fontSize: 13, border: '1px solid #e2e8f0' }}>← Dashboard</a>
        </div>
      </div>

      <div style={S.wrap}>
        <div style={S.card}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Campaign Details</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Paste a YouTube or Vimeo link. Members will watch your video and you'll see real engagement analytics.</div>

          <label style={S.label}>Campaign Title *</label>
          <input style={S.input} value={title} onChange={function(e) { setTitle(e.target.value); }} placeholder="e.g. How to Start Affiliate Marketing in 2026" maxLength={120} />

          <label style={S.label}>Video URL *</label>
          <input style={S.input} value={videoUrl} onChange={function(e) { handleUrlChange(e.target.value); }} placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." />
          {videoUrl && !preview && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>⚠ Unsupported URL. Use YouTube or Vimeo links.</div>}

          {/* Video preview */}
          {preview && (
            <div style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#000' }}>
              <iframe src={preview.embed} style={{ width: '100%', height: 340, border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="preview" />
              <div style={{ padding: '10px 16px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: preview.platform === 'youtube' ? 'rgba(239,68,68,0.08)' : 'rgba(14,165,233,0.08)', color: preview.platform === 'youtube' ? '#ef4444' : '#0ea5e9' }}>{preview.platform}</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>ID: {preview.id}</span>
              </div>
            </div>
          )}

          <label style={S.label}>Category</label>
          <select style={S.select} value={category} onChange={function(e) { setCategory(e.target.value); }}>
            {categories.map(function(c) { return <option key={c.value} value={c.value}>{c.label}</option>; })}
          </select>

          <label style={S.label}>Description</label>
          <textarea style={S.textarea} value={description} onChange={function(e) { setDescription(e.target.value); }} placeholder="Brief description of your video content..." maxLength={500} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={S.label}>Target Country (optional)</label>
              <input style={S.input} value={targetCountry} onChange={function(e) { setTargetCountry(e.target.value); }} placeholder="e.g. US, UK, Worldwide" maxLength={200} />
            </div>
            <div>
              <label style={S.label}>Target Interests (optional)</label>
              <input style={S.input} value={targetInterests} onChange={function(e) { setTargetInterests(e.target.value); }} placeholder="e.g. crypto, marketing" maxLength={200} />
            </div>
          </div>

          {error && <div style={S.error}>{error}</div>}
          {result && <div style={S.success}>✓ Campaign created successfully! {result.status === 'pending' ? 'Under review — will be live shortly.' : 'Your campaign is now live.'} <a href="/video-library" style={{ color: '#10b981', fontWeight: 800 }}>View My Campaigns →</a></div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
            <button style={{ ...S.btn, ...(submitting ? S.btnDisabled : {}) }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : '🚀 Launch Campaign'}
            </button>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>Your campaign tier determines view targets and limits</div>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🎬</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Paste & Go</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>Just paste a YouTube or Vimeo link. We handle the rest — embedding, delivery, and analytics.</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>👁️</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Real Views</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>Members watch your full video. No bots, no fake engagement. Real people, real attention.</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Live Analytics</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>Track views delivered, completion rate, and campaign progress in real-time on your dashboard.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
