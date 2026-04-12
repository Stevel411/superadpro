import { useTranslation } from 'react-i18next';
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

var lS = { display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--sap-text-faint)', marginBottom: 6 };
var iS = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', color: 'var(--sap-text-primary)', background: '#fff', outline: 'none', boxSizing: 'border-box' };

export default function AdHub() {
  var { t } = useTranslation();
  var { user } = useAuth();
  var isPro = (user?.membership_tier || 'basic') === 'pro';
  var weeklyLimit = isPro ? 6 : 3;

  var [view, setView] = useState('home'); // home | create-ad | create-banner | manage
  var [manageTab, setManageTab] = useState('ads');
  var [ads, setAds] = useState([]);
  var [banners, setBanners] = useState([]);
  var [videos, setVideos] = useState([]);
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
      apiGet('/api/video-library').catch(function() { return { campaigns: [] }; }),
    ]).then(function([adData, bannerData, videoData]) {
      setAds(adData.listings || []);
      setBanners(bannerData.banners || []);
      setVideos((videoData.campaigns || []).filter(function(v) { return v.user_id === user?.id; }));
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
        {msg && <div style={{ padding: '12px 16px', background: 'var(--sap-green-bg)', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 700, color: 'var(--sap-green)' }}>{msg}</div>}
        {error && <div style={{ padding: '12px 16px', background: 'var(--sap-red-bg)', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 700, color: 'var(--sap-red)' }}>{error}</div>}

        {/* ═══ HOME VIEW — Creation Cards ═══ */}
        {view === 'home' && (
          <div>
            <style>{`
              @keyframes adhub-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
              @keyframes adhub-pulse{0%,100%{opacity:.6}50%{opacity:1}}
              @keyframes adhub-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
              .adhub-card{border-radius:16px;padding:0;cursor:pointer;transition:all .3s;overflow:hidden;position:relative}
              .adhub-card:hover{transform:translateY(-6px) scale(1.02)}
              .adhub-card-bg{padding:28px 24px;text-align:center;position:relative;overflow:hidden}
              .adhub-card-bg::before{content:'';position:absolute;inset:0;opacity:.12;background:radial-gradient(circle at 30% 20%,#fff 0%,transparent 60%)}
              .adhub-icon{width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 16px;animation:adhub-float 3s ease-in-out infinite;backdrop-filter:blur(8px)}
              .adhub-card-body{padding:20px 24px;background:#fff;text-align:center}
            `}</style>
            {/* Three creation cards */}
            <div className="grid-5-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>

              {/* Classified Ad */}
              <div className="adhub-card" onClick={function() { setView('create-ad'); setMsg(''); setError(''); }}
                style={{ boxShadow: '0 4px 20px rgba(16,185,129,.15)' }}
                onMouseEnter={function(e) { e.currentTarget.style.boxShadow = '0 16px 40px rgba(16,185,129,.25)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,.15)'; }}>
                <div className="adhub-card-bg" style={{ background: 'linear-gradient(135deg,#059669,#10b981,#34d399)' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.1)', animation: 'adhub-pulse 4s ease-in-out infinite' }} />
                  <div style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
                  <div className="adhub-icon" style={{ background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)' }}>📋</div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 4, position: 'relative' }}>Create Listing</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', position: 'relative' }}>Classified Ads</div>
                </div>
                <div className="adhub-card-body">
                  <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', lineHeight: 1.6, marginBottom: 16 }}>Post a classified ad with images, links, and SEO keywords. Displayed on the public Ad Board.</div>
                  <div style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 0 #047857' }}>+ New Listing</div>
                </div>
              </div>

              {/* Banner Ad */}
              <div className="adhub-card" onClick={function() { setView('create-banner'); setMsg(''); setError(''); }}
                style={{ boxShadow: '0 4px 20px rgba(245,158,11,.15)' }}
                onMouseEnter={function(e) { e.currentTarget.style.boxShadow = '0 16px 40px rgba(245,158,11,.25)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,158,11,.15)'; }}>
                <div className="adhub-card-bg" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b,#fbbf24)' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.1)', animation: 'adhub-pulse 4s ease-in-out infinite .5s' }} />
                  <div style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
                  <div className="adhub-icon" style={{ background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', animationDelay: '.3s' }}>🖼️</div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 4, position: 'relative' }}>Create Banner</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', position: 'relative' }}>Display Advertising</div>
                </div>
                <div className="adhub-card-body">
                  <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', lineHeight: 1.6, marginBottom: 16 }}>Upload a visual banner ad with click tracking. Displayed in the public Banner Gallery.</div>
                  <div style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 0 #b45309' }}>+ New Banner</div>
                </div>
              </div>

              {/* Video Campaign */}
              <div className="adhub-card" onClick={function() { window.location.href = '/campaign-tiers'; }}
                style={{ boxShadow: '0 4px 20px rgba(139,92,246,.15)' }}
                onMouseEnter={function(e) { e.currentTarget.style.boxShadow = '0 16px 40px rgba(139,92,246,.25)'; }}
                onMouseLeave={function(e) { e.currentTarget.style.boxShadow = '0 4px 20px rgba(139,92,246,.15)'; }}>
                <div className="adhub-card-bg" style={{ background: 'linear-gradient(135deg,#7c3aed,#8b5cf6,#a78bfa)' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.1)', animation: 'adhub-pulse 4s ease-in-out infinite 1s' }} />
                  <div style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
                  <div className="adhub-icon" style={{ background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', animationDelay: '.6s' }}>🎬</div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 4, position: 'relative' }}>Video Campaign</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', position: 'relative' }}>Video Advertising</div>
                </div>
                <div className="adhub-card-body">
                  <div style={{ fontSize: 13, color: 'var(--sap-text-muted)', lineHeight: 1.6, marginBottom: 16 }}>Launch a video ad campaign through Campaign Tiers. Displayed in the public Video Library.</div>
                  <div style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 0 #6d28d9' }}>Campaign Tiers →</div>
                </div>
              </div>
            </div>

            {/* Manage section */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                {[['ads', '📋 My Listings (' + ads.length + ')', 'var(--sap-green-mid)'], ['banners', '🖼️ My Banners (' + banners.length + ')', 'var(--sap-amber)'], ['videos', '🎬 My Videos (' + videos.length + ')', 'var(--sap-purple)']].map(function([k, l, color]) {
                  return (
                    <button key={k} onClick={function() { setManageTab(k); }}
                      style={{ flex: 1, padding: '14px 16px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: manageTab === k ? '3px solid ' + color : '3px solid transparent', background: 'transparent', color: manageTab === k ? 'var(--sap-text-primary)' : 'var(--sap-text-faint)' }}>
                      {l}
                    </button>
                  );
                })}
              </div>

              <div style={{ padding: 20 }}>
                {/* Weekly limit info */}
                <div style={{ fontSize: 11, color: 'var(--sap-text-faint)', marginBottom: 16, padding: '8px 12px', background: 'var(--sap-bg-input)', borderRadius: 8 }}>
                  Weekly limit: {weeklyLimit} per ad type{!isPro && ' · Upgrade to Pro for 6/week'}
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--sap-text-faint)' }}>Loading...</div>
                ) : manageTab === 'ads' ? (
                  ads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sap-text-faint)' }}>
                      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📋</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>No listings yet</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {ads.map(function(l) {
                        return (
                          <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: 10, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 2 }}>{l.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--sap-text-faint)' }}>{l.category} · {l.views || 0} views · {l.clicks || 0} clicks</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: l.is_active ? 'var(--sap-green-bg-mid)' : l.status === 'pending' ? 'var(--sap-amber-bg)' : 'var(--sap-red-bg)', color: l.is_active ? 'var(--sap-green)' : l.status === 'pending' ? 'var(--sap-amber-dark)' : 'var(--sap-red)' }}>
                                {l.is_active ? 'Live' : l.status === 'pending' ? 'Under Review' : 'Paused'}
                              </span>
                              <button onClick={function() { toggleAd(l.id); }} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: 'var(--sap-text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                                {l.is_active ? 'Pause' : 'Activate'}
                              </button>
                              <button onClick={function() { deleteAd(l.id); }} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #fecaca', background: '#fff', color: 'var(--sap-red)', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : manageTab === 'banners' ? (
                  banners.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sap-text-faint)' }}>
                      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>🖼️</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>No banners yet</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {banners.map(function(b) {
                        return (
                          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: 10 }}>
                            <img src={b.image_url} alt={b.title} style={{ width: 100, height: 50, objectFit: 'cover', borderRadius: 6, background: 'var(--sap-bg-page)', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 2 }}>{b.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--sap-text-faint)' }}>{b.size} · {b.impressions || 0} impressions · {b.clicks || 0} clicks</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: b.status === 'approved' ? 'var(--sap-green-bg-mid)' : b.status === 'pending' ? 'var(--sap-amber-bg)' : 'var(--sap-red-bg)', color: b.status === 'approved' ? 'var(--sap-green)' : b.status === 'pending' ? 'var(--sap-amber-dark)' : 'var(--sap-red)' }}>
                                {b.status === 'approved' ? 'Live' : b.status === 'pending' ? 'Under Review' : 'Rejected'}
                              </span>
                              <button onClick={function() { toggleBanner(b.id); }} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: 'var(--sap-text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                                {b.is_active ? 'Pause' : 'Activate'}
                              </button>
                              <button onClick={function() { deleteBanner(b.id); }} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #fecaca', background: '#fff', color: 'var(--sap-red)', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  videos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--sap-text-faint)' }}>
                      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>🎬</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>No video campaigns yet</div>
                      <div style={{ fontSize: 12, color: '#b0b8c4' }}>Launch a campaign tier to create your first video ad</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {videos.map(function(v) {
                        return (
                          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: 10 }}>
                            <div style={{ width: 100, height: 56, borderRadius: 6, background: 'var(--sap-bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>▶️</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 2 }}>{v.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--sap-text-faint)' }}>Tier {v.campaign_tier} · {v.views_delivered || 0}/{v.views_target || 0} views · {v.platform}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: v.status === 'active' ? 'var(--sap-green-bg-mid)' : v.status === 'completed' ? '#dbeafe' : 'var(--sap-red-bg)', color: v.status === 'active' ? 'var(--sap-green)' : v.status === 'completed' ? '#2563eb' : 'var(--sap-red)' }}>
                              {v.status === 'active' ? 'Active' : v.status === 'completed' ? 'Completed' : v.status}
                            </span>
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
            <button onClick={function() { setView('home'); setError(''); }} style={{ marginBottom: 16, padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: 'var(--sap-text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Ad Hub</button>
            <div style={{ background: '#fff', border: '2px solid #dcfce7', borderRadius: 16, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📋</div>
                <div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--sap-text-primary)' }}>Create Classified Listing</div>
                  <div style={{ fontSize: 12, color: 'var(--sap-text-muted)' }}>Your listing will appear on the public Ad Board with its own SEO-indexed page</div>
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
                <div style={{ fontSize: 10, color: 'var(--sap-text-faint)', marginBottom: 16 }}>Keywords help people find your listing through search engines. Separate with commas.</div>
                <button type="submit" disabled={saving} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', background: saving ? 'var(--sap-text-faint)' : 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', boxShadow: saving ? 'none' : '0 4px 0 #047857,0 6px 16px rgba(16,185,129,.2)' }}>
                  {saving ? 'Submitting...' : 'Post Listing'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══ CREATE BANNER FORM ═══ */}
        {view === 'create-banner' && (
          <div>
            <button onClick={function() { setView('home'); setError(''); }} style={{ marginBottom: 16, padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid #e2e8f0', background: '#fff', color: 'var(--sap-text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Ad Hub</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
              <div style={{ background: '#fff', border: '2px solid #fef3c7', borderRadius: 16, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🖼️</div>
                  <div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--sap-text-primary)' }}>Create Banner Ad</div>
                    <div style={{ fontSize: 12, color: 'var(--sap-text-muted)' }}>Your banner will appear in the public Banner Gallery with click tracking</div>
                  </div>
                </div>
                <form onSubmit={submitBanner}>
                  <div style={{ marginBottom: 14 }}><label style={lS}>Banner Title *</label><input style={iS} value={bannerForm.title} onChange={setBanner('title')} placeholder="My Product Banner" required maxLength={120} /></div>
                  <div style={{ marginBottom: 14 }}><label style={lS}>Description (optional)</label><textarea style={Object.assign({}, iS, { height: 60, resize: 'vertical' })} value={bannerForm.description} onChange={setBanner('description')} placeholder="Brief description" maxLength={300} /></div>
                  <div style={{ marginBottom: 14 }}><label style={lS}>Banner Image URL *</label><input style={iS} value={bannerForm.image_url} onChange={setBanner('image_url')} placeholder="https://example.com/banner.jpg" required />
                    <div style={{ fontSize: 10, color: 'var(--sap-text-faint)', marginTop: 4 }}>Upload to Imgur or similar and paste the URL</div></div>
                  <div style={{ marginBottom: 14 }}><label style={lS}>Click-Through URL *</label><input style={iS} value={bannerForm.link_url} onChange={setBanner('link_url')} placeholder="https://yoursite.com" required />
                    <div style={{ fontSize: 10, color: 'var(--sap-text-faint)', marginTop: 4 }}>Where people go when they click your banner</div></div>
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
                  <button type="submit" disabled={saving} style={{ width: '100%', padding: '12px 28px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', background: saving ? 'var(--sap-text-faint)' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', boxShadow: saving ? 'none' : '0 4px 0 #b45309,0 6px 16px rgba(245,158,11,.2)' }}>
                    {saving ? 'Submitting...' : 'Create Banner'}
                  </button>
                </form>
              </div>

              {/* Preview */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 16 }}>Live Preview</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-text-faint)', marginBottom: 8 }}>{selectedSize.name} ({selectedSize.id})</div>
                <div style={{ width: '100%', maxWidth: selectedSize.w, aspectRatio: selectedSize.w + '/' + selectedSize.h, background: 'var(--sap-bg-page)', border: '2px dashed #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '0 auto' }}>
                  {bannerForm.image_url ? (
                    <img src={bannerForm.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={function(e) { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--sap-text-faint)', fontSize: 13 }}>
                      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>🖼️</div>
                      Paste image URL to preview
                    </div>
                  )}
                </div>
                {bannerForm.title && (
                  <div style={{ marginTop: 16, padding: 12, background: 'var(--sap-bg-input)', borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text-primary)', marginBottom: 2 }}>{bannerForm.title}</div>
                    {bannerForm.description && <div style={{ fontSize: 11, color: 'var(--sap-text-muted)', marginBottom: 2 }}>{bannerForm.description}</div>}
                    <div style={{ fontSize: 11, color: 'var(--sap-accent)' }}>{bannerForm.link_url || 'Click-through URL'}</div>
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
