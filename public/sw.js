// Minimal Service Worker for PWA installability
const CACHE_NAME = 'linguocare-v1';

// Cache the basic shell on install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/index.html', '/manifest.json'])
    )
  );
});

// Network first strategy — always get fresh data from backend
self.addEventListener('fetch', (event) => {
  // Don't intercept API calls to Flask backend
  if (event.request.url.includes(':5000')) return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request)
    )
  );
});
