/*
 * BackgroundVideo.jsx
 * ─────────────────────────────────────────────────────────────
 * Hero background video loop. Autoplays muted on capable
 * devices; falls back to a poster image (Pexels JPEG thumbnail)
 * for users on slow connections, reduced motion (when not
 * explicitly forced on by the user), or where autoplay is
 * denied by the browser.
 *
 * Default placeholder source is a Pexels CC0 drone shot of an
 * autumn mountain road (Alex Moliski, free for commercial use,
 * no attribution required per Pexels license). Swap the src
 * prop or VIDEO_SRC default when Steve provides the final clip.
 *
 * IMPORTANT: pass force={true} when the user has explicitly
 * opted in via UI (e.g. the bgmode toggle). The accessibility
 * gates below are sensible defaults for first-load behaviour
 * but should not block a user who explicitly wants the video.
 */
import { useEffect, useRef, useState } from 'react';

var VIDEO_SRC =
  'https://videos.pexels.com/video-files/34305614/14533125_1440_2560_60fps.mp4';
var VIDEO_POSTER =
  'https://images.pexels.com/videos/34305614/adventure-autumn-car-clouds-34305614.jpeg?auto=compress&cs=tinysrgb&w=1920';

export default function BackgroundVideo({ src, poster, force }) {
  var [shouldMount, setShouldMount] = useState(false);
  var [loaded, setLoaded] = useState(false);
  var videoRef = useRef(null);

  useEffect(function() {
    // If the parent explicitly forced video on (toggle clicked,
    // user navigated here specifically to see motion, etc.) skip
    // all the accessibility/data gates and mount immediately.
    if (force) {
      setShouldMount(true);
      return;
    }
    // Respect prefers-reduced-motion as soft default
    if (typeof window !== 'undefined' && window.matchMedia) {
      var motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motionMq.matches) return;
    }
    // Respect Save-Data on metered connections
    if (typeof navigator !== 'undefined' && navigator.connection) {
      if (navigator.connection.saveData) return;
      if (navigator.connection.effectiveType === 'slow-2g' ||
          navigator.connection.effectiveType === '2g') return;
    }
    // Skip on very small viewports — saves battery/data
    if (typeof window !== 'undefined' && window.innerWidth < 600) return;
    // Mount immediately on capable desktop devices. The previous
    // 800ms deferral was over-cautious — the video tag's own preload
    // handles its loading lifecycle without blocking other paints.
    setShouldMount(true);
  }, [force]);

  // Fade the video in when its first frame is ready, to avoid a
  // hard switch from poster to playback
  function handleLoadedData() {
    setLoaded(true);
    if (videoRef.current) {
      var p = videoRef.current.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function(err) {
          // Autoplay denied — log it so we can see why in devtools
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[BackgroundVideo] autoplay denied:', err && err.message);
          }
        });
      }
    }
  }

  function handleError(e) {
    // Surface video load failures to the console for debugging.
    // If you see this in production, the source URL is probably
    // returning a non-200 or blocked by CORS.
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[BackgroundVideo] video element error', e);
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
          onError={handleError}
        />
      )}
      <div className="bg-video-overlay"/>
    </div>
  );
}
