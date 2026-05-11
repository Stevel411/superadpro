// SocialPostGallery.jsx
// ============================================================================
// "My Designs" landing page for Social Post Studio.
// Route: /creative-studio/social-post
// Shows: thumbnail grid of member's designs + "New design" card.
// ============================================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { ASPECTS } from './canvasReducer';
import './social-post.css';

export default function SocialPostGallery() {
  var navigate = useNavigate();
  var [designs, setDesigns] = useState([]);
  var [loading, setLoading] = useState(true);

  function loadDesigns() {
    setLoading(true);
    fetch('/api/social-post/designs')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setDesigns((data && data.designs) || []);
      })
      .catch(function(err) {
        console.error('Failed to load designs:', err);
        setDesigns([]);
      })
      .finally(function() { setLoading(false); });
  }

  useEffect(loadDesigns, []);

  function handleDelete(designId, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this design? This cannot be undone.')) return;
    fetch('/api/social-post/design/' + designId, { method: 'DELETE' })
      .then(function(r) {
        if (r.ok) {
          setDesigns(function(prev) { return prev.filter(function(d) { return d.id !== designId; }); });
        }
      });
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      var now = new Date();
      var diffMs = now - d;
      var diffDays = Math.floor(diffMs / 86400000);
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7)  return diffDays + ' days ago';
      return d.toLocaleDateString();
    } catch (e) { return ''; }
  }

  return (
    <AppLayout>
      <div className="sps-root">
        <div className="sps-gallery">
          <div className="sps-gallery-header">
            <div>
              <div className="sps-gallery-title">Social Post Studio</div>
              <div className="sps-gallery-sub">Your designs — pick up where you left off or start fresh</div>
            </div>
          </div>

          {loading ? (
            <div className="sps-loading">Loading…</div>
          ) : (
            <div className="sps-gallery-grid">
              {/* "New design" card always first */}
              <div
                className="sps-gallery-card is-new"
                onClick={function() { navigate('/creative-studio/social-post/new'); }}
              >
                <div className="sps-gallery-thumb">
                  <div style={{ textAlign: 'center', color: 'var(--sps-gold-2)' }}>
                    <div style={{ fontSize: 48, fontWeight: 200, lineHeight: 1, marginBottom: 8 }}>+</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>New design</div>
                  </div>
                </div>
                <div className="sps-gallery-info">
                  <div className="sps-gallery-name" style={{ color: 'var(--sps-gold-2)' }}>Start fresh</div>
                  <div className="sps-gallery-meta">Pick aspect, add layers</div>
                </div>
              </div>

              {/* Saved designs */}
              {designs.map(function(d) {
                var aspect = ASPECTS[d.aspect_ratio];
                return (
                  <div
                    key={d.id}
                    className="sps-gallery-card"
                    onClick={function() { navigate('/creative-studio/social-post/' + d.id); }}
                  >
                    <div className="sps-gallery-thumb">
                      {d.thumbnail_url ? (
                        <img src={d.thumbnail_url} alt={d.name} />
                      ) : (
                        <div style={{ color: 'var(--sps-text-mute)', fontSize: 12 }}>
                          {d.aspect_ratio} · {aspect ? aspect.label : ''}
                        </div>
                      )}
                    </div>
                    <div className="sps-gallery-info">
                      <div className="sps-gallery-name">{d.name}</div>
                      <div className="sps-gallery-meta" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{d.aspect_ratio} · {formatDate(d.updated_at)}</span>
                        <button
                          onClick={function(e) { handleDelete(d.id, e); }}
                          style={{
                            background: 'transparent', border: 'none',
                            color: 'var(--sps-text-mute)', cursor: 'pointer',
                            fontSize: 14, padding: 0, lineHeight: 1,
                          }}
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
