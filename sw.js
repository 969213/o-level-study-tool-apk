const CACHE_NAME = 'o-level-prep-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './questions.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install Event - Caching Assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching files...');
      return cache.addAll(ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event - Serve Cache First, fallback to network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Fallback to fetch from network
      return fetch(e.request).catch((err) => {
        console.error('[Service Worker] Fetch failed offline:', err);
      });
    })
  );
});
