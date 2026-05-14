/**
 * VideoDetail.jsx — Single-video playback page
 * ════════════════════════════════════════════════════
 * Lives at /videos/{slug}. Plays the video full-bleed at
 * 16:9 with title + description beneath. Includes a
 * "Back to library" link and view-tracking that fires
 * after 5 seconds of playback.
 *
 * View tracking calls POST /api/videos/{slug}/track-view
 * once per session, with watched_seconds + played_to_end
 * flags so admin analytics can see retention.
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { apiGet, apiPost } from '../utils/api';
import { ArrowLeft, Eye, Clock } from 'lucide-react';

function formatDuration(s) {
  if (!s || s < 1) return '';
  var m = Math.floor(s / 60);
  var ss = s % 60;
  return m + ':' + (ss < 10 ? '0' : '') + ss;
}

export default function VideoDetail() {
  var { slug } = useParams();
  var [video, setVideo] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var videoRef = useRef(null);
  var trackedRef = useRef(false);  // ensure track-view only fires once per session

  useEffect(function() {
    apiGet('/api/videos/' + encodeURIComponent(slug)).then(function(r) {
      setVideo(r);
      setLoading(false);
    }).catch(function(e) {
      setError(e.message || 'Video not found');
      setLoading(false);
    });
  }, [slug]);

  // View tracking — fire once when playback crosses 5 seconds.
  // The 'ended' event also fires a track call with played_to_end=true
  // so we know completion rate even if it came in via fast-forward.
  function handleTimeUpdate() {
    if (trackedRef.current) return;
    var el = videoRef.current;
    if (!el) return;
    if (el.currentTime >= 5) {
      trackedRef.current = true;
      apiPost('/api/videos/' + encodeURIComponent(slug) + '/track-view', {
        watched_seconds: Math.floor(el.currentTime),
        played_to_end: false,
      }).catch(function() {});
    }
  }

  function handleEnded() {
    var el = videoRef.current;
    apiPost('/api/videos/' + encodeURIComponent(slug) + '/track-view', {
      watched_seconds: el ? Math.floor(el.duration || 0) : 0,
      played_to_end: true,
    }).catch(function() {});
  }

  if (loading) {
    return (
      <AppLayout title="Video">
        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>Loading…</div>
      </AppLayout>
    );
  }

  if (error || !video) {
    return (
      <AppLayout title="Video">
        <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#172554', marginBottom: 8 }}>
            Video not found
          </div>
          <div style={{ color: '#64748b', marginBottom: 24 }}>
            This video may have been moved or removed.
          </div>
          <Link to="/videos" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', background: '#172554', color: '#fff',
            borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
          }}>
            <ArrowLeft size={16} /> Back to library
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={video.title}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        <Link to="/videos" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: '#64748b', textDecoration: 'none', fontSize: 14,
          marginBottom: 16,
        }}>
          <ArrowLeft size={14} /> Back to library
        </Link>

        {/* Player */}
        <div style={{
          background: '#000', borderRadius: 12, overflow: 'hidden',
          marginBottom: 20, boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
        }}>
          <video
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            poster={video.thumbnail_url || undefined}
            style={{ width: '100%', display: 'block', maxHeight: '70vh', background: '#000' }}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          >
            <source src={video.r2_url} />
            Your browser doesn't support HTML5 video.
          </video>
        </div>

        {/* Title + meta */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#172554', margin: '0 0 8px' }}>
          {video.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#64748b', fontSize: 13, marginBottom: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Eye size={14} /> {video.view_count || 0} views
          </span>
          {video.duration_sec ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} /> {formatDuration(video.duration_sec)}
            </span>
          ) : null}
        </div>

        {video.description && (
          <div style={{
            background: '#fff', padding: 20, borderRadius: 12,
            border: '1px solid #e2e8f0',
            fontSize: 15, color: '#334155', lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}>
            {video.description}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
