/*
 * BackgroundVideo.jsx
 * ─────────────────────────────────────────────────────────────
 * Hero background video loop. Autoplays muted on capable
 * devices; falls back to a poster image (Pexels JPEG thumbnail)
 * for users on slow connections, reduced motion, or where
 * autoplay is denied by the browser.
 *
 * Default placeholder source is a Pexels CC0 drone shot of an
 * autumn mountain road (Alex Moliski, free for commercial use,
 * no attribution required per Pexels license). Swap the src
 * prop or VIDEO_SRC default when Steve provides the final clip.
 *
 * Performance:
 *   - Video element is mounted lazily (after 800ms) so the
 *     hero text and 3D constellation finish their first paint
 *     before the network starts pulling 5-15MB of MP4.
 *   - Poster image renders immediately as a fallback surface.
 *   - On Save-Data, reduced-motion, or width <= 600px, video
 *     does NOT mount — poster only. Saves mobile data + battery.
 *   - object-fit: cover handles both portrait and landscape
 *     source clips.
 *
 * Visual treatment:
 *   - 65% black overlay on top of the video so hero text stays
 *     legible regardless of source brightness
 *   - Slight desaturation + blur so it reads as atmosphere not
 *     as foreground content
 */
import { useEffect, useRef, useState } from 'react';

var VIDEO_SRC =
  'https://videos.pexels.com/video-files/34305614/14533125_1440_2560_60fps.mp4';
var VIDEO_POSTER =
  'https://images.pexels.com/videos/34305614/adventure-autumn-car-clouds-34305614.jpeg?auto=compress&cs=tinysrgb&w=1920';

export default function BackgroundVideo({ src, poster }) {
  var [shouldMount, setShouldMount] = useState(false);
  var [loaded, setLoaded] = useState(false);
  var videoRef = useRef(null);

  useEffect(function() {
    // Respect prefers-reduced-motion: never autoplay anything that moves
    if (typeof window !== 'undefined' && window.matchMedia) {
      var motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motionMq.matches) return;
    }
    // Respect Save-Data (set by users on metered connections)
    if (typeof navigator !== 'undefined' && navigator.connection) {
      if (navigator.connection.saveData) return;
      if (navigator.connection.effectiveType === 'slow-2g' ||
          navigator.connection.effectiveType === '2g') return;
    }
    // Skip video on small viewports — battery and data discipline
    if (typeof window !== 'undefined' && window.innerWidth < 600) return;
    // Defer mount until after first paint, so the constellation and
    // hero text are rendered first.
    var t = setTimeout(function() { setShouldMount(true); }, 800);
    return function() { clearTimeout(t); };
  }, []);

  // Fade the video in when its first frame is ready, to avoid a
  // hard switch from poster to playback
  function handleLoadedData() {
    setLoaded(true);
    if (videoRef.current) {
      var p = videoRef.current.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function() { /* autoplay denied — poster stays */ });
      }
    }
  }

  return (
    <div className="bg-video-wrap" aria-hidden="true">
      <img
        src={poster || VIDEO_POSTER}
        alt=""
        className="bg-video-poster"
        loading="eager"
        decoding="async"
      />
      {shouldMount && (
        <video
          ref={videoRef}
          className={'bg-video' + (loaded ? ' bg-video-loaded' : '')}
          src={src || VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={handleLoadedData}
        />
      )}
      <div className="bg-video-overlay"/>
    </div>
  );
}
