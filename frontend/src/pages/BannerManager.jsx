import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';

var SIZES = [
  { id: '728x90', name: 'Leaderboard', w: 728, h: 90 },
  { id: '300x250', name: 'Medium Rectangle', w: 300, h: 250 },
  { id: '160x600', name: 'Skyscraper', w: 160, h: 600 },
  { id: '320x50', name: 'Mobile Banner', w: 320, h: 50 },
  { id: '970x250', name: 'Billboard', w: 970, h: 250 },
];

var CATEGORIES = ['General', 'Business', 'Technology', 'Health', 'Finance', 'Education', 'Crypto', 'Lifestyle', 'Travel', 'Food'];

export default function BannerManager() {
  var { t } = useTranslation();
  var { user } = useAuth();
  var [tab, setTab] = useState('create');
  var [banners, setBanners] = useState([]);
  var [loading, setLoading] = useState(false);
  var [msg, setMsg] = useState('');
  var [error, setError] = useState('');
  var [form, setForm] = useState({
    title: '', description: '', image_url: '', link_url: '',
    size: '728x90', category: 'General', keywords: '', location: ''
  });

  useEffect(function() {
    apiGet('/api/banners/my').then(function(d) { setBanners(d.banners || []); }).catch(function() {});
  }, []);

  function set(k) { return function(e) { setForm(function(f) { return Object.assign({}, f, { [k]: e.target.value }); }); }; }

  function submit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setMsg('');
    apiPost('/api/banners/create', form)
      .then(function(d) {
        setLoading(false);
        if (d.success) {
          setMsg(d.message || 'Banner created!');
          setForm({ title: '', description: '', image_url: '', link_url: '', size: '728x90', category: 'General', keywords: '', location: '' });
          apiGet('/api/banners/my').then(function(d) { setBanners(d.banners || []); });
        } else {
          setError(d.error || 'Failed to create banner');
        }
      })
      .catch(function(e) { setLoading(false); setError(e.message || 'Error'); });
  }

  function toggleBanner(id) {
    apiPost('/api/banners/' + id + '/toggle', {}).then(function() {
      apiGet('/api/banners/my').then(function(d) { setBanners(d.banners || []); });
    });
  }

  function deleteBanner(id) {
    if (!confirm('Delete this banner?')) return;
    apiPost('/api/banners/' + id + '/delete', {}).then(function() {
      apiGet('/api/banners/my').then(function(d) { setBanners(d.banners || []); });
    });
  }

  var selectedSize = SIZES.find(function(s) { return s.id === form.size; }) || SIZES[0];
  var isPro = (user?.membership_tier || 'basic') === 'pro';

  var lS = { fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6, display: 'block' };
  var iS = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: '#fff', outline: 'none' };

  return (
    <AppLayout title="Banner Ads" subtitle="Create and manage your display banners">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
          {[['create', 'Create Banner'], ['manage', 'My Banners (' + banners.length + ')']].map(function([k, l]) {
            return (
              <button key={k} onClick={function() { setTab(k); }}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: tab === k ? '#fff' : 'transparent', color: tab === k ? '#0f172a' : '#94a3b8', boxShadow: tab === k ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                {l}
              </button>
            );
          })}
        </div>

        {/* Messages */}
        {msg && <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{msg}</div>}
        {error && <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{error}</div>}

        {/* CREATE TAB */}
        {tab === 'create' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

            {/* Form */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>Create a Banner Ad</div>
              <form onSubmit={submit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={lS}>Banner Title</label>
                  <input style={iS} value={form.title} onChange={set('title')} placeholder="My Awesome Product" required maxLength={120} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={lS}>Description (optional)</label>
                  <textarea style={Object.assign({}, iS, { height: 70, resize: 'vertical' })} value={form.description} onChange={set('description')} placeholder="Brief description of your banner ad" maxLength={300} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={lS}>Banner Image URL</label>
                  <input style={iS} value={form.image_url} onChange={set('image_url')} placeholder="https://example.com/banner.jpg" required />
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Upload your banner image to a host (e.g. Imgur, Cloudflare) and paste the URL here</div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={lS}>Click-Through URL</label>
                  <input style={iS} value={form.link_url} onChange={set('link_url')} placeholder="https://yoursite.com" required />
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Where people go when they click your banner</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={lS}>Banner Size</label>
                    <select style={iS} value={form.size} onChange={set('size')}>
                      {SIZES.map(function(s) { return <option key={s.id} value={s.id}>{s.name} ({s.id})</option>; })}
                    </select>
                  </div>
                  <div>
                    <label style={lS}>Category</label>
                    <select style={iS} value={form.category} onChange={set('category')}>
                      {CATEGORIES.map(function(c) { return <option key={c} value={c}>{c}</option>; })}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={lS}>SEO Keywords</label>
                  <input style={iS} value={form.keywords} onChange={set('keywords')} placeholder="marketing, digital ads, brand awareness" maxLength={200} />
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Comma-separated words people would search for</div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={lS}>Location (optional)</label>
                  <input style={iS} value={form.location} onChange={set('location')} placeholder="London, UK" maxLength={100} />
                </div>

                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 800, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', background: loading ? '#94a3b8' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', boxShadow: loading ? 'none' : '0 4px 0 #b45309,0 6px 16px rgba(245,158,11,.3)' }}>
                  {loading ? 'Submitting...' : 'Create Banner Ad'}
                </button>

                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>
                  Weekly limit: {isPro ? '6' : '3'} banners{!isPro && ' (upgrade to Pro for 6)'}
                </div>
              </form>
            </div>

            {/* Preview */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>Preview</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>{selectedSize.name} ({selectedSize.id})</div>
              <div style={{
                width: '100%', maxWidth: selectedSize.w, aspectRatio: selectedSize.w + '/' + selectedSize.h,
                background: '#f1f5f9', border: '2px dashed #e2e8f0', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', margin: '0 auto'
              }}>
                {form.image_url ? (
                  <img src={form.image_url} alt="Banner preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={function(e) { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>🖼️</div>
                    Paste image URL to preview
                  </div>
                )}
              </div>
              {form.title && (
                <div style={{ marginTop: 16, padding: 14, background: '#f8f9fb', borderRadius: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{form.title}</div>
                  {form.description && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{form.description}</div>}
                  <div style={{ fontSize: 11, color: '#0ea5e9' }}>{form.link_url || 'Click-through URL'}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MANAGE TAB */}
        {tab === 'manage' && (
          <div>
            {banners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🖼️</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>No banners yet</div>
                <div style={{ fontSize: 13 }}>Create your first banner ad to get started</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {banners.map(function(b) {
                  return (
                    <div key={b.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                      <img src={b.image_url} alt={b.title} style={{ width: 120, height: 60, objectFit: 'cover', borderRadius: 6, background: '#f1f5f9', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{b.title}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{b.size} · {b.category}</div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8' }}>
                          <span>{b.impressions} impressions</span>
                          <span>{b.clicks} clicks</span>
                          <span style={{ color: b.status === 'approved' ? '#16a34a' : b.status === 'pending' ? '#f59e0b' : '#dc2626', fontWeight: 700 }}>
                            {b.status === 'approved' ? '✓ Live' : b.status === 'pending' ? '⏳ Under Review' : '✗ Rejected'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={function() { toggleBanner(b.id); }}
                          style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: b.is_active ? '#dc2626' : '#16a34a', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {b.is_active ? 'Pause' : 'Activate'}
                        </button>
                        <button onClick={function() { deleteBanner(b.id); }}
                          style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
