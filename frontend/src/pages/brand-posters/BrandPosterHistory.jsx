import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../utils/api';
import AppLayout from '../../components/layout/AppLayout';
import { ArrowLeft, Clock, Plus, Image as ImageIcon } from 'lucide-react';

function statusBadge(status) {
  if (status === 'chosen') return { label: 'Chosen', bg: '#dcfce7', fg: '#15803d' };
  if (status === 'ready')  return { label: 'Ready to pick', bg: '#dbeafe', fg: '#1e40af' };
  if (status === 'failed') return { label: 'Failed', bg: '#fee2e2', fg: '#b91c1c' };
  if (status === 'generating') return { label: 'Generating…', bg: '#fef3c7', fg: '#92400e' };
  return { label: status, bg: '#e2e8f0', fg: '#475569' };
}

function timeAgo(iso) {
  if (!iso) return '';
  var diff = Date.now() - new Date(iso).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  var days = Math.floor(hrs / 24);
  return days + 'd ago';
}

export default function BrandPosterHistory() {
  var [generations, setGenerations] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');

  useEffect(function() {
    apiGet('/api/posters/my-generations?limit=50').then(function(res) {
      if (res && res.generations) {
        setGenerations(res.generations);
      } else {
        setError('Could not load history.');
      }
      setLoading(false);
    }).catch(function() {
      setError('Network error.');
      setLoading(false);
    });
  }, []);

  return (
    <AppLayout title="My posters" subtitle="Your generation history">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px' }}>

        <Link to="/brand-posters" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--sap-text-muted)',
          textDecoration: 'none',
          fontSize: 14,
          marginBottom: 20,
        }}>
          <ArrowLeft size={14} /> Brand Poster Generator
        </Link>

        {/* Make new poster CTA */}
        <Link to="/brand-posters" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, var(--sap-accent), var(--sap-accent-light))',
          color: 'white',
          padding: '10px 18px',
          borderRadius: 10,
          fontWeight: 700,
          textDecoration: 'none',
          fontSize: 14,
          marginBottom: 24,
        }}>
          <Plus size={16} /> Make a new poster
        </Link>

        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--sap-text-muted)' }}>
            Loading…
          </div>
        )}

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
            padding: 14, borderRadius: 10, marginBottom: 16,
          }}>{error}</div>
        )}

        {!loading && !error && generations.length === 0 && (
          <div style={{
            background: 'var(--sap-card-bg)',
            border: '1px solid var(--sap-border)',
            borderRadius: 14,
            padding: '60px 30px',
            textAlign: 'center',
            color: 'var(--sap-text-muted)',
          }}>
            <Clock size={36} style={{ marginBottom: 14, opacity: 0.4 }}/>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--sap-text-primary)' }}>
              No posters yet
            </div>
            <div>Once you generate your first poster, it'll show here.</div>
          </div>
        )}

        {!loading && generations.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {generations.map(function(g) {
              var badge = statusBadge(g.status);
              return (
                <Link key={g.id}
                  to={'/brand-posters/result/' + g.id}
                  style={{
                    background: 'var(--sap-card-bg)',
                    border: '1px solid var(--sap-border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                  <div style={{
                    aspectRatio: '3/4',
                    background: g.chosen_url
                      ? '#0a1438'
                      : 'linear-gradient(135deg, #1e3a8a, #0ea5e9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.5)',
                    position: 'relative',
                  }}>
                    {g.chosen_url ? (
                      <img src={g.chosen_url} alt={g.template_name} style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                      }}/>
                    ) : (
                      <ImageIcon size={36} />
                    )}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                      {g.template_name}
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontSize: 12, color: 'var(--sap-text-muted)',
                    }}>
                      <span style={{
                        background: badge.bg,
                        color: badge.fg,
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                      }}>{badge.label}</span>
                      <span>{timeAgo(g.created_at)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
