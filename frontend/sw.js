// Import a library to make IndexedDB easier to use.
// You would need to add this library to your project, e.g., via a CDN link in index.html.
importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

const STATIC_CACHE_NAME = 'tasklab-static-v3'; // Incremented version
const DYNAMIC_CACHE_NAME = 'tasklab-dynamic-v3'; // Incremented version
const urlsToCache = [
  '/', // The root HTML file
  '/index.html',
  '/styles.css',
  '/api.js',
  '/app.js',
  // Add the new modules to the cache
  '/modules/state.js',
  '/modules/ui.js',
  '/modules/taskActions.js',
  '/modules/taskRenderer.js',
  // Also cache the idb library itself for full offline functionality
  'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js'
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

// Fetch event: Intercepts network requests
self.addEventListener('fetch', event => {
  // Strategy: Network falling back to Cache for API GET requests
  if (event.request.url.includes('/api/') && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // If network request is successful, cache it and return it
          return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(event.request.url, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(event.request);
        })
    );
  } 
  // Strategy: Cache first, then network for static assets
  else if (urlsToCache.some(url => event.request.url.endsWith(url) || event.request.url === self.location.origin + '/')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
  // For other requests (like POST/PUT/DELETE to API), just go to network.
  // Offline handling is managed in app.js with Background Sync.
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
