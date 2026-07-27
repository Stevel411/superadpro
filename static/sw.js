// AdvantageLife Service Worker v5
// v5 (26 Jul 2026): app bundles under /static/app/ are now served
// NETWORK-FIRST, not cache-first — a cache-first SW was pinning returning
// browsers to stale JS after deploys (the dashboard bell not appearing was
// this). Bumping the cache name forces every browser to drop the old cache
// and install this SW, clearing the stale bundles.
// v4: CACHE renamed superadpro-v3 -> advantagelife-v4 so returning browsers
// stop being served stale SuperAdPro-era assets from disk.
var CACHE = 'advantagelife-v5';
var STATIC = [
  '/',
  '/watch',
  '/home-preview',
  '/payout-methods',
  '/static/manifest.json',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/icons/apple-touch-icon.png',
];

// Install — cache static assets
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(STATIC).catch(function() {});
    })
  );
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Fetch strategy:
// - API calls: network only (never cache)
// - Static assets: cache first, fallback network
// - HTML pages: network first, fallback cache
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Skip non-GET
  if (e.request.method !== 'GET') return;

  // API calls — always network
  if (url.includes('/api/')) return;

  // App bundles (/static/app/assets/*) are content-hashed by Vite, but a
  // cache-first SW can still pin a browser to an old index-*.js if the HTML
  // that names it was cached, or the entry file was cached under a stable
  // name. Serve these NETWORK-FIRST so every new deploy is picked up at once;
  // fall back to cache only when offline. (Fixes members being stuck on stale
  // JS after a deploy — e.g. the dashboard bell not appearing.)
  if (url.includes('/static/app/')) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return response;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Other static assets (icons, manifest — rarely change) — cache first
  if (url.includes('/static/')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          return response;
        });
      })
    );
    return;
  }

  // HTML pages — network first, cache fallback
  e.respondWith(
    fetch(e.request).then(function(response) {
      var clone = response.clone();
      caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
      return response;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('/');
      });
    })
  );
});
