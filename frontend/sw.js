importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

const STATIC_CACHE_NAME = 'tasklab-static-v6';
const DYNAMIC_CACHE_NAME = 'tasklab-dynamic-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/api.js',
  '/app.js',
  '/modules/state.js',
  '/modules/ui.js',
  '/modules/taskActions.js',
  '/modules/taskRenderer.js',
  '/modules/localDb.js',
  '/pushNotifications.js',
  'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js'
];

const QUEUE_STORE_NAME = 'request-queue';

// --- Service Worker Lifecycle Events ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// --- Fetch Event: Caching ---
self.addEventListener('fetch', event => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (requestUrl.pathname.startsWith('/api/')) {
    // For API requests, just fetch. The app logic handles offline.
    event.respondWith(fetch(request));
  } else {
    // For static assets, use Cache First strategy.
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        return cachedResponse || fetch(request).then(networkResponse => {
          return caches.open(STATIC_CACHE_NAME).then(cache => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});

// --- Background Sync ---
self.addEventListener('sync', event => {
  if (event.tag === 'sync-queued-requests') {
    console.log('Service Worker: Background sync triggered.');
    event.waitUntil(syncQueuedRequests());
  }
});

async function syncQueuedRequests() {
    const db = await idb.openDB('tasklab-db', 2);
    const allRequests = await db.getAll(QUEUE_STORE_NAME);
    const failedRequests = [];

    for (const req of allRequests) {
        try {
            const fetchOptions = {
                method: req.method,
                headers: req.headers,
            };

            if (req.method !== 'GET' && req.method !== 'HEAD') {
                fetchOptions.body = JSON.stringify(req.body);
            }

            const response = await fetch(req.url, fetchOptions);

            if (!response.ok) {
                failedRequests.push(req);
            }
        } catch (err) {
            failedRequests.push(req);
        }
    }

    // Clear the queue and re-add any failed requests
    await db.clear(QUEUE_STORE_NAME);
    for (const req of failedRequests) {
        await db.add(QUEUE_STORE_NAME, req);
    }

    if (failedRequests.length === 0) {
        console.log('Service Worker: All queued requests synced successfully.');
        // Notify clients that sync is complete so they can re-fetch data
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_COMPLETE' });
        });
    }
}
