// Versão sobe a cada mudança visual grande, para o PWA instalado não ficar
// preso ao CSS antigo (v2: redesign com tema escuro/claro).
const CACHE_NAME = 'afk-trade-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

// Install SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate SW
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Strategy: Network First for creating a fresh experience, Cache Fallback for offline support
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests like APIs needed for live data
  if (!event.request.url.startsWith(self.location.origin)) {
      return;
  }

  // Network First, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            // If not in cache and looks like a navigation (HTML), return index.html
            // This fixes "SPA refresh on 404" behavior when offline/failing
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
            return null;
        });
      })
  );
});
