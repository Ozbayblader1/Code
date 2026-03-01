/**
 * sw.js — Service Worker for NEON DASH ULTRA (web version)
 *
 * Strategy: Cache-first for all game assets so the game loads
 * instantly and works fully offline after the first visit.
 *
 * Bump CACHE_VERSION whenever game.js or assets change so
 * players always get the latest build.
 */

const CACHE_VERSION = 'neon-dash-v1.5';

const PRECACHE = [
  'platformer-web.html',
  'game.js',
  'platform/web.js',
  'manifest.json',
  'icon.png',
  // Google Fonts are cached on first use (see fetch handler below)
];

// ── Install: pre-cache core assets ───────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old cache versions ──────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first with network fallback ──────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin + Google Fonts (for offline font support)
  const isGameAsset = url.origin === self.location.origin;
  const isFonts     = url.hostname === 'fonts.googleapis.com' ||
                      url.hostname === 'fonts.gstatic.com';

  if (!isGameAsset && !isFonts) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const clone = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('platformer-web.html');
        }
      });
    })
  );
});
