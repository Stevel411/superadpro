import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';

// ── Ad Detail (public) ──────────────────────────────────────────
export function AdDetail() {
  var { slug } = useParams();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    apiGet('/api/ads/listing/' + slug)
      .then(function(d) { setData(d); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, [slug]);

  if (loading) return (
    <PublicLayout>
      <div style={{ textAlign: 'center', padding: 80, color: 'rgba(255,255,255,0.3)' }}>{t('adPages.loading')}</div>
    </PublicLayout>
  );

  if (!data || data.error) return (
    <PublicLayout>
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 900, marginBottom: 12 }}>{t('adPages.adNotFound')}</h2>
        <Link to="/ads" style={{ color: 'var(--sap-accent-light)', textDecoration: 'none' }}>{t('adPages.backToAdBoard')}</Link>
      </div>
    </PublicLayout>
  );

  return (
    <PublicLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <Link to="/ads" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          ← Back to Ad Board
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'start' }}>
          <div>
            {data.image_url && (
              <img src={data.image_url} alt={data.title} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 14, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}/>
            )}
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--sap-accent-light)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              {data.is_featured && '⭐ Featured · '}{data.category}
            </div>
            <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 900, margin: '0 0 16px', lineHeight: 1.2 }}>{data.title}</h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, marginBottom: 28 }}>{data.description}</p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Posted by <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{data.owner}</strong></span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{data.views} views · {data.clicks} clicks</span>
            </div>
            <a href={data.link_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', fontFamily: "'Sora',sans-serif" }}>
              Visit →
            </a>
          </div>

          {/* Related ads */}
          {data.related && data.related.length > 0 && (
            <div style={{ minWidth: 200, maxWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>{t('adPages.related')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.related.map(function(r) {
                  return (
                    <Link key={r.id} to={'/ads/listing/' + r.slug} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 12, textDecoration: 'none' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--sap-accent-light)' }}>{r.category}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

// ── Ad Board Manage (member) ────────────────────────────────────
export function AdBoardManage() {
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [showForm, setShowForm] = useState(false);
  var [form, setForm] = useState({ title: '', description: '', category: '', link_url: '', image_url: '', keywords: '', location: '', price: '' });
  var [saving, setSaving] = useState(false);
  var [msg, setMsg] = useState('');
  var navigate = useNavigate();

  function load() {
    apiGet('/api/ads/my')
      .then(function(d) { setData(d); setLoading(false); })
      .catch(function() { setLoading(false); });
  }
  useEffect(load, []);

  function set(k) { return function(e) { setForm(function(f) { return Object.assign({}, f, { [k]: e.target.value }); }); }; }

  function submit(e) {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.link_url) { setMsg('Please fill in all required fields.'); return; }
    setSaving(true); setMsg('');
    apiPost('/api/ads/create', form)
      .then(function(d) {
        setSaving(false);
        if (d.success || d.ok || d.id) { setShowForm(false); setForm({ title: '', description: '', category: '', link_url: '', image_url: '', keywords: '', location: '', price: '' }); setMsg(d.message || ''); load(); }
        else setMsg(d.error || 'Failed to create listing.');
      })
      .catch(function(e) { setSaving(false); setMsg(e.message || 'Failed.'); });
  }

  function toggle(id) {
    apiPost('/api/ads/' + id + '/toggle', {}).then(load);
  }

  function del(id) {
    if (!window.confirm('Delete this listing?')) return;
    apiPost('/api/ads/' + id + '/delete', {}).then(load);
  }

  var categories = data ? data.categories : [];
  var listings = data ? data.listings : [];

  var iS = { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <AppLayout>
      <div style={{ padding: 24, maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 900, margin: '0 0 4px' }}>{t('adPages.myAdListings')}</h1>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', margin: 0 }}>{t('adPages.postListingsDesc')}</p>
          </div>
          <button onClick={function(){setShowForm(!showForm);}} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            {showForm ? 'Cancel' : '+ New Listing'}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14, padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, margin: '0 0 20px' }}>{t('adPages.newListing')}</h3>
            {msg && <div style={{ background: 'var(--sap-red-bg)', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--sap-red)', marginBottom: 16 }}>{msg}</div>}
            <form onSubmit={submit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('adPages.titleRequired')}</label>
                  <input value={form.title} onChange={set('title')} style={{ ...iS, background: 'var(--sap-bg-elevated)', color: 'var(--sap-text-primary)', border: '1px solid #e2e8f0' }} placeholder={t("adPages.listingTitlePlaceholder")}/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('adPages.categoryRequired')}</label>
                  <select value={form.category} onChange={set('category')} style={{ ...iS, background: 'var(--sap-bg-elevated)', color: 'var(--sap-text-primary)', border: '1px solid #e2e8f0' }}>
                    <option value="">{t('adPages.selectCategory')}</option>
                    {categories.map(function(c) { return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>; })}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('adPages.descRequired')}</label>
                <textarea value={form.description} onChange={set('description')} rows={3} style={{ ...iS, background: 'var(--sap-bg-elevated)', color: 'var(--sap-text-primary)', border: '1px solid #e2e8f0', resize: 'vertical' }} placeholder={t("adPages.listingDescPlaceholder")}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('adPages.linkRequired')}</label>
                  <input value={form.link_url} onChange={set('link_url')} style={{ ...iS, background: 'var(--sap-bg-elevated)', color: 'var(--sap-text-primary)', border: '1px solid #e2e8f0' }} placeholder={t('common.urlPlaceholder')}/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('adPages.imageUrlOptional')}</label>
                  <input value={form.image_url} onChange={set('image_url')} style={{ ...iS, background: 'var(--sap-bg-elevated)', color: 'var(--sap-text-primary)', border: '1px solid #e2e8f0' }} placeholder={t('common.urlPlaceholder')}/>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('adPages.priceOptional')}</label>
                  <input value={form.price} onChange={set('price')} style={{ ...iS, background: 'var(--sap-bg-elevated)', color: 'var(--sap-text-primary)', border: '1px solid #e2e8f0' }} placeholder="$99" maxLength={50}/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('adPages.locationOptional')}</label>
                  <input value={form.location} onChange={set('location')} style={{ ...iS, background: 'var(--sap-bg-elevated)', color: 'var(--sap-text-primary)', border: '1px solid #e2e8f0' }} placeholder={t("adPages.locationPlaceholder")} maxLength={100}/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sap-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('adPages.seoKeywords')}</label>
                  <input value={form.keywords} onChange={set('keywords')} style={{ ...iS, background: 'var(--sap-bg-elevated)', color: 'var(--sap-text-primary)', border: '1px solid #e2e8f0' }} placeholder={t('adPages.keywordsPlaceholder')} maxLength={200}/>
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--sap-text-faint)', marginBottom: 16 }}>Keywords help people find your listing through search engines. Separate with commas.</div>
              <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: saving ? 'var(--sap-text-faint)' : 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Saving...' : 'Post Listing'}
              </button>
            </form>
          </div>
        )}

        {/* Listings */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--sap-text-faint)' }}>{t('adPages.loading')}</div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: '#fff', border: '1px solid #e8ecf2', borderRadius: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ color: 'var(--sap-text-faint)', marginBottom: 16 }}>No listings yet. Post your first ad to reach the community.</p>
            <button onClick={function(){setShowForm(true);}} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Post First Listing
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {listings.map(function(l) {
              return (
                <div key={l.id} style={{ background: '#fff', border: '1px solid #e8ecf2', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--sap-text-primary)', marginBottom: 4 }}>{l.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--sap-text-faint)' }}>{l.category} · {l.views} views · {l.clicks} clicks</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: l.is_active ? 'var(--sap-green-bg-mid)' : 'var(--sap-red-bg)', color: l.is_active ? 'var(--sap-green)' : 'var(--sap-red)' }}>
                      {l.is_active ? 'Active' : 'Paused'}
                    </span>
                    <button onClick={function(){toggle(l.id);}} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--sap-text-muted)', fontFamily: 'inherit' }}>
                      {l.is_active ? 'Pause' : 'Activate'}
                    </button>
                    <button onClick={function(){del(l.id);}} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--sap-red)', fontFamily: 'inherit' }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
