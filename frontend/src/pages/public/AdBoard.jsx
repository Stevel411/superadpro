import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { apiGet, apiPost } from '../../utils/api';

export default function AdBoard() {
  var { t } = useTranslation();
  var [params, setParams] = useSearchParams();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [page, setPage] = useState(1);
  var category = params.get('category') || '';

  function load(cat, pg) {
    setLoading(true);
    var q = new URLSearchParams();
    if (cat) q.set('category', cat);
    q.set('page', pg);
    apiGet('/api/ads?' + q.toString())
      .then(function(d) { setData(d); setLoading(false); })
      .catch(function() { setLoading(false); });
  }

  useEffect(function() { load(category, page); }, [category, page]);

  function setCategory(cat) {
    setPage(1);
    if (cat) setParams({ category: cat });
    else setParams({});
  }

  var listings = data ? data.listings : [];
  var categories = data ? data.categories : [];

  return (
    <PublicLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 32, fontWeight: 900, margin: '0 0 8px' }}>Ad Board</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0 }}>Community marketplace — browse listings from members</p>
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          <button onClick={function(){setCategory('');}} style={{ padding: '7px 16px', borderRadius: 100, border: '1px solid', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: !category ? 'var(--sap-accent-light)' : 'rgba(255,255,255,0.05)', borderColor: !category ? 'var(--sap-accent-light)' : 'rgba(255,255,255,0.1)', color: !category ? '#000' : 'rgba(255,255,255,0.6)' }}>
            All
          </button>
          {categories.map(function(c) {
            var active = category === c.id;
            return (
              <button key={c.id} onClick={function(){setCategory(c.id);}} style={{ padding: '7px 16px', borderRadius: 100, border: '1px solid', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: active ? 'var(--sap-accent-light)' : 'rgba(255,255,255,0.05)', borderColor: active ? 'var(--sap-accent-light)' : 'rgba(255,255,255,0.1)', color: active ? '#000' : 'rgba(255,255,255,0.6)' }}>
                {c.icon} {c.name}
              </button>
            );
          })}
        </div>

        {/* Listings grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>No listings in this category yet.</p>
            <Link to="/register" style={{ color: 'var(--sap-accent-light)', textDecoration: 'none', fontWeight: 700 }}>Post your first ad →</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
            {listings.map(function(l) {
              return (
                <Link key={l.id} to={'/ads/listing/' + l.slug} style={{ textDecoration: 'none', display: 'block', background: 'rgba(255,255,255,0.03)', border: l.is_featured ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', transition: 'border-color .15s' }}
                  onMouseEnter={function(e){e.currentTarget.style.borderColor='rgba(56,189,248,0.4)';}}
                  onMouseLeave={function(e){e.currentTarget.style.borderColor=l.is_featured?'rgba(56,189,248,0.3)':'rgba(255,255,255,0.07)';}}>
                  {l.image_url && <img src={l.image_url} alt={l.title} style={{ width: '100%', height: 160, objectFit: 'cover' }}/>}
                  {!l.image_url && <div style={{ height: 100, background: 'linear-gradient(135deg,rgba(14,165,233,0.1),rgba(99,102,241,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📢</div>}
                  <div style={{ padding: '16px' }}>
                    {l.is_featured && <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--sap-accent-light)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>⭐ Featured</div>}
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 6, lineHeight: 1.3 }}>{l.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10, lineHeight: 1.5 }}>{l.description.slice(0, 80)}{l.description.length > 80 ? '...' : ''}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>by {l.owner}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{l.views} views</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
            {Array.from({ length: data.total_pages }, function(_, i) {
              return (
                <button key={i} onClick={function(){setPage(i+1);}} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: page === i+1 ? 'var(--sap-accent-light)' : 'rgba(255,255,255,0.05)', borderColor: page === i+1 ? 'var(--sap-accent-light)' : 'rgba(255,255,255,0.1)', color: page === i+1 ? '#000' : 'rgba(255,255,255,0.6)' }}>
                  {i+1}
                </button>
              );
            })}
          </div>
        )}

        {/* Post an ad CTA */}
        <div style={{ marginTop: 48, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 14, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Want to post an ad?</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Members can post listings and reach the whole community.</div>
          </div>
          <Link to="/register" style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Join Free to Post
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
