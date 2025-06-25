// Import a library to make IndexedDB easier to use.
// You would need to add this library to your project, e.g., via a CDN link in index.html.
importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

const STATIC_CACHE_NAME = 'tasklab-static-v2';
const DYNAMIC_CACHE_NAME = 'tasklab-dynamic-v2';
const urlsToCache = [
  '/', // The root HTML file
  '/index.html',
  '/styles.css',
  '/app.js',
  '/api.js',
];

// Install event: Caches static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event: Cleans up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all( // FIX: Correctly map over caches to delete old ones
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

// Fetch event: Intercepts network requests
self.addEventListener('fetch', event => {
  // For API requests, use a "Network Only" strategy for POST/PUT/DELETE
  // and "Network first, then cache" for GET
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      // For GET requests, try network then fall back to cache.
      // For other methods, just try network. The offline save is handled in app.js
      fetch(event.request).catch(err => {
        if (event.request.method === 'GET') {
          return caches.match(event.request);
        }
        // For POST/PUT/DELETE, the error will be caught in app.js
        throw err;
      })
    );
  } else {
    // For other requests (HTML, CSS, JS), use "Cache first, then network"
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});

// Background Sync Event
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered', event);
  if (event.tag === 'sync-new-task') {
    console.log('Service Worker: Syncing new tasks');
    event.waitUntil(syncNewTasks());
  }
});

async function syncNewTasks() {
  const db = await idb.openDB('tasklab-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sync-tasks')) {
        db.createObjectStore('sync-tasks', { keyPath: 'id', autoIncrement: true });
      }
    },
  });

  const allTasks = await db.getAll('sync-tasks');
  for (const task of allTasks) {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });

      if (response.ok) {
        console.log('Service Worker: Synced task to server', task);
        await db.delete('sync-tasks', task.id); // Remove from queue on success
      }
    } catch (err) {
      console.error('Service Worker: Failed to sync task', err);
    }
  }
}
