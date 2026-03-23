import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../utils/api';

var AD_CATEGORIES = ['General','Business','Technology','Health','Finance','Education','Crypto','Lifestyle','Travel','Food','Property','Automotive','Services','Entertainment'];
var BANNER_SIZES = [
  { id: '728x90', name: 'Leaderboard', w: 728, h: 90 },
  { id: '300x250', name: 'Medium Rectangle', w: 300, h: 250 },
  { id: '160x600', name: 'Skyscraper', w: 160, h: 600 },
  { id: '320x50', name: 'Mobile Banner', w: 320, h: 50 },
  { id: '970x250', name: 'Billboard', w: 970, h: 250 },
];

var lS = { display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6 };
var iS = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', color: '#0f172a', background: '#fff', outline: 'none', boxSizing: 'border-box' };

export default function AdHub() {
  var { user } = useAuth();
  var isPro = (user?.membership_tier || 'basic') === 'pro';
  var weeklyLimit = isPro ? 6 : 3;

  var [view, setView] = useState('home'); // home | create-ad | create-banner | manage
  var [manageTab, setManageTab] = useState('ads');
  var [ads, setAds] = useState([]);
  var [banners, setBanners] = useState([]);
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);
  var [msg, setMsg] = useState('');
  var [error, setError] = useState('');

  var [adForm, setAdForm] = useState({ title: '', description: '', category: 'General', link_url: '', image_url: '', keywords: '', location: '', price: '' });
  var [bannerForm, setBannerForm] = useState({ title: '', description: '', image_url: '', link_url: '', size: '728x90', category: 'General', keywords: '', location: '' });

  function loadData() {
    setLoading(true);
    Promise.all([
      apiGet('/api/ads/my').catch(function() { return { listings: [] }; }),
      apiGet('/api/banners/my').catch(function() { return { banners: [] }; }),
    ]).then(function([adData, bannerData]) {
      setAds(adData.listings || []);
      setBanners(bannerData.banners || []);
      setLoading(false);
    });
  }
  useEffect(loadData, []);

  function setAd(k) { return function(e) { setAdForm(function(f) { return Object.assign({}, f, { [k]: e.target.value }); }); }; }
  function setBanner(k) { return function(e) { setBannerForm(function(f) { return Object.assign({}, f, { [k]: e.target.value }); }); }; }

  function submitAd(e) {
    e.preventDefault(); setSaving(true); setError(''); setMsg('');
    apiPost('/api/ads/create', adForm).then(function(d) {
      setSaving(false);
      if (d.success) {
        setMsg(d.message || 'Ad created!');
        setAdForm({ title: '', description: '', category: 'General', link_url: '', image_url: '', keywords: '', location: '', price: '' });
        setView('manage'); setManageTab('ads'); loadData();
      } else { setError(d.error || 'Failed'); }
    }).catch(function(e) { setSaving(false); setError(e.message || 'Error'); });
  }

  function submitBanner(e) {
    e.preventDefault(); setSaving(true); setError(''); setMsg('');
    apiPost('/api/banners/create', bannerForm).then(function(d) {
      setSaving(false);
      if (d.success) {
        setMsg(d.message || 'Banner created!');
        setBannerForm({ title: '', description: '', image_url: '', link_url: '', size: '728x90', category: 'General', keywords: '', location: '' });
        setView('manage'); setManageTab('banners'); loadData();
      } else { setError(d.error || 'Failed'); }
    }).catch(function(e) { setSaving(false); setError(e.message || 'Error'); });
  }

  function toggleAd(id) { apiPost('/api/ads/' + id + '/toggle', {}).then(loadData); }
  function deleteAd(id) { if (confirm('Delete this listing?')) apiPost('/api/ads/' + id + '/delete', {}).then(loadData); }
  function toggleBanner(id) { apiPost('/api/banners/' + id + '/toggle', {}).then(loadData); }
  function deleteBanner(id) { if (confirm('Delete this banner?')) apiPost('/api/banners/' + id + '/delete', {}).then(loadData); }

  var selectedSize = BANNER_SIZES.find(function(s) { return s.id === bannerForm.size; }) || BANNER_SIZES[0];

  return (
    <AppLayout title="Ad Hub" subtitle="Create and manage all your advertisements">
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Messages */}
        {msg && <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{msg}</div>}
        {error && <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{error}</div>}

        {/* ═══ HOME VIEW — Creation Cards ═══ */}
        {view === 'home' && (
          <div>
            {/* Three creation cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>

              {/* Classified Ad */}
              <div onClick={function() { setView('create-ad'); setMsg(''); setError(''); }}
                style={{ background: '#fff', border: '2px solid #dcfce7', borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'all .2s', textAlign: 'center' }}
                onMouseEnter={function(e) { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(16,185,129,.12)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.borderColor = '#dcfce7'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>📋</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Create Listing</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 14 }}>Post a classified ad with images, links, and SEO keywords. Displayed on the public Ad Board.</div>
                <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 13 }}>+ New Listing</div>
              </div>

              {/* Banner Ad */}
              <div onClick={function() { setView('create-banner'); setMsg(''); setError(''); }}
                style={{ background: '#fff', border: '2px solid #fef3c7', borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'all .2s', textAlign: 'center' }}
                onMouseEnter={function(e) { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(245,158,11,.12)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.borderColor = '#fef3c7'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>🖼️</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Create Banner</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 14 }}>Upload a visual banner ad with click tracking. Displayed in the public Banner Gallery.</div>
                <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontWeight: 700, fontSize: 13 }}>+ New Banner</div>
              </div>

              {/* Video Campaign */}
              <div onClick={function() { window.location.href = '/campaign-tiers'; }}
                style={{ background: '#fff', border: '2px solid #ede9fe', borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'all .2s', textAlign: 'center' }}
                onMouseEnter={function(e) { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(139,92,246,.12)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.borderColor = '#ede9fe'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>🎬</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Video Campaign</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 14 }}>Launch a video ad campaign through Campaign Tiers. Displayed in the public Video Library.</div>
                <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', fontWeight: 700, fontSize: 13 }}>Campaign Tiers →</div>
              </div>
            </div>

            {/* Manage section */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                {[['ads', '📋 My Listings (' + ads.length + ')'], ['banners', '🖼️ My Banners (' + banners.length + ')']].map(function([k, l]) {
                  return (
                    <button key={k} onClick={function() { setManageTab(k); }}
                      style={{ flex: 1, padding: '14px 16px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: manageTab === k ? '3px solid #0ea5e9' : '3px solid transparent', background: 'transparent', color: manageTab === k ? '#0f172a' : '#94a3b8' }}>
                      {l}
                    </button>
                  );
                })}
              </div>

              <div style={{ padding: 20 }}>
                {/* Weekly limit info */}
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16, padding: '8px 12px', background: '#f8f9fb', borderRadius: 8 }}>
                  Weekly limit: {weeklyLimit} per ad type{!isPro && ' · Upgrade to Pro for 6/week'}
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
                ) : manageTab === 'ads' ? (
                  ads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📋</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>No listings yet</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {ads.map(function(l) {
                        return (
                          <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: 10, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{l.title}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{l.category} · {l.views || 0} views · {l.clicks || 0} clicks</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: l.is_active ? '#dcfce7' : l.status === 'pending' ? '#fef3c7' : '#fef2f2', color: l.is_active ? '#16a34a' : l.status === 'pending' ? '#d97706' : '#dc2626' }}>
                                {l.is_active ? 'Live' : l.status === 'pending' ? 'Under Review' : 'Paused'}
                              </span>
                              <button onClick={function() { toggleAd(l.id); }} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
                                {l.is_active ? 'Pause' : 'Activate'}
                              </button>
                              <button onClick={function() { deleteAd(l.id); }} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  banners.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>🖼️</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>No banners yet</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {banners.map(function(b) {
                        return (
                          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: 10 }}>
                            <img src={b.image_url} alt={b.title} style={{ width: 100, height: 50, objectFit: 'cover', borderRadius: 6, background: '#f1f5f9', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{b.title}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.size} · {b.impressions || 0} impressions · {b.clicks || 0} clicks</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: b.status === 'approved' ? '#dcfce7' : b.status === 'pending' ? '#fef3c7' : '#fef2f2', color: b.status === 'approved' ? '#16a34a' : b.status === 'pending' ? '#d97706' : '#dc2626' }}>
                                {b.status === 'approved' ? 'Live' : b.status === 'pending' ? 'Under Review' : 'Rejected'}
                              </span>
                              <button onClick={function() { toggleBanner(b.id); }} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
                                {b.is_active ? 'Pause' : 'Activate'}
                              </button>
                              <button onClick={function() { deleteBanner(b.id); }} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ CREATE LISTING FORM ═══ */}
        {view === 'create-ad' && (
          <div>
            <button onClick={function() { setView('home'); setError(''); }} style={{ marginBottom: 16, padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Ad Hub</button>
            <div style={{ background: '#fff', border: '2px solid #dcfce7', borderRadius: 16, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📋</div>
                <div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Create Classified Listing</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Your listing will appear on the public Ad Board with its own SEO-indexed page</div>
                </div>
              </div>
              <form onSubmit={submitAd}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div><label style={lS}>Title *</label><input style={iS} value={adForm.title} onChange={setAd('title')} placeholder="Your listing title" required maxLength={120} /></div>
                  <div><label style={lS}>Category</label>
                    <select style={iS} value={adForm.category} onChange={setAd('category')}>{AD_CATEGORIES.map(function(c) { return <option key={c} value={c}>{c}</option>; })}</select></div>
                </div>
                <div style={{ marginBottom: 14 }}><label style={lS}>Description *</label><textarea style={Object.assign({}, iS, { height: 80, resize: 'vertical' })} value={adForm.description} onChange={setAd('description')} placeholder="Describe your listing..." required maxLength={500} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div><label style={lS}>Link URL *</label><input style={iS} value={adForm.link_url} onChange={setAd('link_url')} placeholder="https://yoursite.com" required /></div>
                  <div><label style={lS}>Image URL (optional)</label><input style={iS} value={adForm.image_url} onChange={setAd('image_url')} placeholder="https://example.com/image.jpg" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div><label style={lS}>Price (optional)</label><input style={iS} value={adForm.price} onChange={setAd('price')} placeholder="$99" maxLength={50} /></div>
                  <div><label style={lS}>Location (optional)</label><input style={iS} value={adForm.location} onChange={setAd('location')} placeholder="London, UK" maxLength={100} /></div>
                  <div><label style={lS}>SEO Keywords</label><input style={iS} value={adForm.keywords} onChange={setAd('keywords')} placeholder="marketing, digital" maxLength={200} /></div>
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 16 }}>Keywords help people find your listing through search engines. Separate with commas.</div>
                <button type="submit" disabled={saving} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', background: saving ? '#94a3b8' : 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', boxShadow: saving ? 'none' : '0 4px 0 #047857,0 6px 16px rgba(16,185,129,.2)' }}>
                  {saving ? 'Submitting...' : 'Post Listing'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══ CREATE BANNER FORM ═══ */}
        {view === 'create-banner' && (
          <div>
            <button onClick={function() { setView('home'); setError(''); }} style={{ marginBottom: 16, padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Ad Hub</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
              <div style={{ background: '#fff', border: '2px solid #fef3c7', borderRadius: 16, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🖼️</div>
                  <div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Create Banner Ad</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Your banner will appear in the public Banner Gallery with click tracking</div>
                  </div>
                </div>
                <form onSubmit={submitBanner}>
                  <div style={{ marginBottom: 14 }}><label style={lS}>Banner Title *</label><input style={iS} value={bannerForm.title} onChange={setBanner('title')} placeholder="My Product Banner" required maxLength={120} /></div>
                  <div style={{ marginBottom: 14 }}><label style={lS}>Description (optional)</label><textarea style={Object.assign({}, iS, { height: 60, resize: 'vertical' })} value={bannerForm.description} onChange={setBanner('description')} placeholder="Brief description" maxLength={300} /></div>
                  <div style={{ marginBottom: 14 }}><label style={lS}>Banner Image URL *</label><input style={iS} value={bannerForm.image_url} onChange={setBanner('image_url')} placeholder="https://example.com/banner.jpg" required />
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Upload to Imgur or similar and paste the URL</div></div>
                  <div style={{ marginBottom: 14 }}><label style={lS}>Click-Through URL *</label><input style={iS} value={bannerForm.link_url} onChange={setBanner('link_url')} placeholder="https://yoursite.com" required />
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Where people go when they click your banner</div></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div><label style={lS}>Banner Size</label>
                      <select style={iS} value={bannerForm.size} onChange={setBanner('size')}>{BANNER_SIZES.map(function(s) { return <option key={s.id} value={s.id}>{s.name} ({s.id})</option>; })}</select></div>
                    <div><label style={lS}>Category</label>
                      <select style={iS} value={bannerForm.category} onChange={setBanner('category')}>{AD_CATEGORIES.map(function(c) { return <option key={c} value={c}>{c}</option>; })}</select></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div><label style={lS}>SEO Keywords</label><input style={iS} value={bannerForm.keywords} onChange={setBanner('keywords')} placeholder="branding, ads" maxLength={200} /></div>
                    <div><label style={lS}>Location (optional)</label><input style={iS} value={bannerForm.location} onChange={setBanner('location')} placeholder="London, UK" maxLength={100} /></div>
                  </div>
                  <button type="submit" disabled={saving} style={{ width: '100%', padding: '12px 28px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', background: saving ? '#94a3b8' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', boxShadow: saving ? 'none' : '0 4px 0 #b45309,0 6px 16px rgba(245,158,11,.2)' }}>
                    {saving ? 'Submitting...' : 'Create Banner'}
                  </button>
                </form>
              </div>

              {/* Preview */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Live Preview</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>{selectedSize.name} ({selectedSize.id})</div>
                <div style={{ width: '100%', maxWidth: selectedSize.w, aspectRatio: selectedSize.w + '/' + selectedSize.h, background: '#f1f5f9', border: '2px dashed #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '0 auto' }}>
                  {bannerForm.image_url ? (
                    <img src={bannerForm.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={function(e) { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>🖼️</div>
                      Paste image URL to preview
                    </div>
                  )}
                </div>
                {bannerForm.title && (
                  <div style={{ marginTop: 16, padding: 12, background: '#f8f9fb', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{bannerForm.title}</div>
                    {bannerForm.description && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{bannerForm.description}</div>}
                    <div style={{ fontSize: 11, color: '#0ea5e9' }}>{bannerForm.link_url || 'Click-through URL'}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
