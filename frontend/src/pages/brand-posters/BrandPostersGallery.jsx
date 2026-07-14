import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../utils/api';
import AlShell from '../../components/layout/AlShell';
import { Lock, Sparkles, Image as ImageIcon, ArrowRight, Clock } from 'lucide-react';

// Category labels and accent colours for the gallery filter pills
var CATEGORIES = [
  { key: 'all',          label: 'All templates',  colour: 'var(--sap-accent)' },
  { key: 'professional', label: 'Professional',   colour: '#c8102e' },
  { key: 'lifestyle',    label: 'Lifestyle',      colour: '#12388f' },
  { key: 'generosity',   label: 'Pay It Forward', colour: '#ec4899' },
  { key: 'tech',         label: 'Tech',           colour: '#e8203f' },
];

export default function BrandPostersGallery() {
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [filter, setFilter] = useState('all');

  useEffect(function() {
    apiGet('/api/posters/templates').then(function(res) {
      if (res && res.templates) {
        setData(res);
      } else {
        setError('Could not load templates.');
      }
      setLoading(false);
    }).catch(function(e) {
      setError('Network error loading templates.');
      setLoading(false);
    });
  }, []);

  var visibleTemplates = data && data.templates
    ? data.templates.filter(function(t) { return filter === 'all' || t.category === filter; })
    : [];

  return (
    <AlShell active="marketing" back={{ to: '/my-marketing', label: 'My Marketing' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      <div style={{background:'#0a1f52',borderRadius:20,color:'#fff',padding:'22px 26px',boxShadow:'0 24px 50px -28px rgba(10,31,82,.55)',marginBottom:18,display:'flex',alignItems:'center',gap:15}}>
        <div style={{width:52,height:52,borderRadius:14,background:'linear-gradient(120deg,#c8102e,#e8203f)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
        </div>
        <div>
          <div style={{fontWeight:900,fontSize:23,letterSpacing:-.6}}>Brand Poster Generator</div>
          <div style={{fontSize:13.5,color:'#c9d6f7',fontWeight:600,marginTop:2}}>Generate complete branded marketing posters in 60 seconds.</div>
        </div>
      </div>

        {/* Hero / access banner */}
        {!loading && data && (
          <div style={{
            background: data.has_access
              ? 'linear-gradient(135deg, var(--sap-accent) 0%, var(--sap-accent-light) 100%)'
              : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: 16,
            padding: '24px 28px',
            marginBottom: 28,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 280 }}>
              {data.has_access
                ? <Sparkles size={32} />
                : <Lock size={32} />}
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
                  {data.has_access
                    ? ('Each poster costs ' + (data.poster_cost || 2) + ' Creator Credits')
                    : 'You need Creator Credits to generate posters'}
                </div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>
                  {data.has_access
                    ? ('You have ' + (data.credit_balance || 0) + ' credits — pick a template below to start.')
                    : ('You have ' + (data.credit_balance || 0) + ' credits. Top up your Creator Credits to start — browse the gallery to see what you\'ll get.')}
                </div>
              </div>
            </div>
            {!data.has_access && (
              <Link to="/my-credits" style={{
                background: 'var(--sap-accent)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: 10,
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                Top up Creator Credits <ArrowRight size={16} />
              </Link>
            )}
            {data.has_access && (
              <Link to="/brand-posters/history" style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: 10,
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid rgba(255,255,255,0.3)',
              }}>
                <Clock size={16} /> My posters
              </Link>
            )}
          </div>
        )}

        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {CATEGORIES.map(function(cat) {
            var active = filter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={function() { setFilter(cat.key); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: active ? 'none' : '1px solid var(--sap-border)',
                  background: active ? cat.colour : 'transparent',
                  color: active ? 'white' : 'var(--sap-text-primary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--sap-text-muted)' }}>
            Loading templates…
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            padding: 16,
            borderRadius: 10,
            marginBottom: 16,
          }}>{error}</div>
        )}

        {/* Template grid */}
        {!loading && !error && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}>
            {visibleTemplates.map(function(t) {
              return (
                <Link key={t.slug}
                  to={'/brand-posters/template/' + t.slug}
                  style={{
                    background: 'var(--sap-card-bg)',
                    border: '1px solid var(--sap-border)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={function(e) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={function(e) {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  {/* Preview image (when seeded) or placeholder gradient (when not).
                      Once an admin runs /admin/bpg seeding, the preview URLs come
                      back via /api/posters/templates and we render the image.
                      The placeholder is still here as a graceful fallback for
                      templates that haven't been seeded yet. */}
                  {t.preview_image_url ? (
                    <div style={{
                      aspectRatio: '3/4',
                      background: '#0a1f52',
                      overflow: 'hidden',
                    }}>
                      <img
                        src={t.preview_image_url}
                        alt={t.name + ' preview'}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      aspectRatio: '3/4',
                      background: 'linear-gradient(135deg, #12388f 0%, #c8102e 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255,255,255,0.4)',
                    }}>
                      <ImageIcon size={48} />
                    </div>
                  )}

                  <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: 'var(--sap-accent)',
                      marginBottom: 6,
                    }}>{t.category}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>{t.name}</div>
                    <div style={{
                      fontSize: 13,
                      color: 'var(--sap-text-muted)',
                      lineHeight: 1.5,
                      flex: 1,
                    }}>{t.description}</div>
                    <div style={{
                      marginTop: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--sap-accent)',
                    }}>
                      {data && data.has_access ? 'Make this poster' : 'Preview'}
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Footer hint for non-access members */}
        {!loading && data && !data.has_access && (
          <div style={{
            marginTop: 40,
            textAlign: 'center',
            padding: '24px',
            background: 'var(--sap-card-bg)',
            border: '1px solid var(--sap-border)',
            borderRadius: 12,
            color: 'var(--sap-text-muted)',
            fontSize: 14,
            lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--sap-text-primary)' }}>Want to make these yourself?</strong><br/>
            The Brand Poster Generator unlocks the moment you activate any Credit Nexus pack —
            from $20 starter up to $1,000 ultimate. <Link to="/my-credits" style={{ color: 'var(--sap-accent)' }}>See packs →</Link>
          </div>
        )}
      </div>
    </AlShell>
  );
}
