/**
 * Videos.jsx — Member-facing video explainer library
 * ═════════════════════════════════════════════════════════
 * Lives at /videos. Members-only (login required). Shows all
 * published videos grouped into 4 category tabs:
 *   Getting Started · Income Streams · Tools · Advanced
 *
 * Each card is a thumbnail + title + duration + view count.
 * Clicking a card opens the dedicated page at /videos/{slug}
 * for full playback. We use dedicated pages rather than a
 * modal so members can bookmark + share specific videos.
 *
 * Backend: GET /api/videos returns {categories: {...}, total}.
 * Empty state shown for any category with no videos yet —
 * important because we're launching with 0 videos and
 * filling the library over time.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet } from '../utils/api';
import { Play, Clock, Eye, Sparkles, TrendingUp, Wrench, Award } from 'lucide-react';

var CATEGORIES = [
  { id: 'getting-started', label: 'Getting Started', icon: Sparkles, tone: '#7c3aed', desc: "New here? Start with these." },
  { id: 'income-streams',  label: 'Income Streams',  icon: TrendingUp, tone: '#16a34a', desc: "How the four ways to earn work." },
  { id: 'tools',           label: 'Tools',           icon: Wrench,    tone: '#0284c7', desc: "Walkthroughs of every tool." },
  { id: 'advanced',        label: 'Advanced',        icon: Award,     tone: '#b45309', desc: "Power-user tips and strategies." },
];

function formatDuration(s) {
  if (!s || s < 1) return '';
  var m = Math.floor(s / 60);
  var ss = s % 60;
  return m + ':' + (ss < 10 ? '0' : '') + ss;
}

function VideoCard({ video }) {
  return (
    <Link to={"/videos/" + video.slug} style={{
      display: 'block', textDecoration: 'none', color: 'inherit',
      background: '#fff', borderRadius: 12,
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      transition: 'transform 0.15s, box-shadow 0.15s',
      boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
    }}
      onMouseEnter={function(e) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15,23,42,0.1)'; }}
      onMouseLeave={function(e) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.06)'; }}
    >
      <div style={{
        position: 'relative', width: '100%',
        paddingBottom: '56.25%',  // 16:9 aspect
        background: video.thumbnail_url ? ('center / cover no-repeat url(' + video.thumbnail_url + ')') : '#0f172a',
      }}>
        {!video.thumbnail_url && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748b', fontSize: 13,
          }}>No preview</div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.5) 100%)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(255,255,255,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          <Play size={20} strokeWidth={2.5} fill="#172554" color="#172554" style={{ marginLeft: 2 }} />
        </div>
        {video.duration_sec ? (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.7)', color: '#fff',
            padding: '2px 8px', borderRadius: 4,
            fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
          }}>{formatDuration(video.duration_sec)}</div>
        ) : null}
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#172554', marginBottom: 4, lineHeight: 1.3 }}>
          {video.title}
        </div>
        {video.description && (
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{video.description}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#94a3b8', fontSize: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Eye size={12} /> {video.view_count || 0}
          </span>
          {video.duration_sec ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> {formatDuration(video.duration_sec)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function CategoryEmpty({ category }) {
  return (
    <div style={{
      gridColumn: '1 / -1',
      background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12,
      padding: '40px 24px', textAlign: 'center', color: '#64748b',
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🎬</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
        Coming soon
      </div>
      <div style={{ fontSize: 13, maxWidth: 380, margin: '0 auto', lineHeight: 1.5 }}>
        Steve is recording the {category.label} videos this week.
        Check back soon — this section will fill up fast.
      </div>
    </div>
  );
}

export default function Videos() {
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [activeCategory, setActiveCategory] = useState('getting-started');

  useEffect(function() {
    apiGet('/api/videos').then(function(r) {
      setData(r);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

  var activeCatMeta = CATEGORIES.find(function(c) { return c.id === activeCategory; });
  var activeVideos = (data && data.categories && data.categories[activeCategory]) || [];

  return (
    <AppLayout title="Video Library" subtitle="Watch short explainers on every part of the platform">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        {/* Category tabs */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          padding: '8px 0 16px', marginBottom: 24,
          scrollbarWidth: 'none', borderBottom: '1px solid #e2e8f0',
        }}>
          {CATEGORIES.map(function(cat) {
            var Icon = cat.icon;
            var isActive = cat.id === activeCategory;
            var count = (data && data.categories && data.categories[cat.id]) ? data.categories[cat.id].length : 0;
            return (
              <button
                key={cat.id}
                onClick={function() { setActiveCategory(cat.id); }}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px',
                  background: isActive ? cat.tone : '#fff',
                  color: isActive ? '#fff' : '#172554',
                  border: '1px solid ' + (isActive ? cat.tone : '#e2e8f0'),
                  borderRadius: 8,
                  fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={16} />
                {cat.label}
                {count > 0 && (
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: isActive ? '#fff' : '#64748b',
                    padding: '0 6px', borderRadius: 10,
                    fontSize: 11, fontWeight: 700,
                    minWidth: 18, textAlign: 'center',
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Category description */}
        {activeCatMeta && (
          <div style={{ marginBottom: 20, color: '#64748b', fontSize: 14 }}>
            {activeCatMeta.desc}
          </div>
        )}

        {/* Video grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading…</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {activeVideos.length > 0
              ? activeVideos.map(function(v) { return <VideoCard key={v.id} video={v} />; })
              : <CategoryEmpty category={activeCatMeta} />
            }
          </div>
        )}
      </div>
    </AppLayout>
  );
}
