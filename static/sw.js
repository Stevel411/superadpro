// SuperAdPro Service Worker
// Handles offline caching and PWA installation

const CACHE_NAME = 'superadpro-v1';

// Static assets to cache immediately on install
const PRECACHE_URLS = [
  '/static/mobile.css',
  '/static/manifest.json',
  '/login',
];

// ── Install ────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Don't fail install if precache has issues
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch Strategy ─────────────────────────────────────────────
// Network first for all requests (keeps watch tracking live)
// Falls back to cache if offline
self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip API calls — always need live data
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache static assets
        if (event.request.url.includes('/static/')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback — return from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // If no cache and offline, return a simple offline message for pages
          if (event.request.headers.get('Accept').includes('text/html')) {
            return new Response(
              '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0a1a;color:#fff"><h2>You are offline</h2><p style="color:#94a3b8">Please check your connection and try again.</p><a href="/" style="color:#00d4ff">Retry</a></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
        });
      })
  );
});
