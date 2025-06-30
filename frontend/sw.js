// Import a library to make IndexedDB easier to use.
// You would need to add this library to your project, e.g., via a CDN link in index.html.
importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

const STATIC_CACHE_NAME = 'tasklab-static-v4'; // Incremented version to force update
const DYNAMIC_CACHE_NAME = 'tasklab-dynamic-v4'; // Incremented version to force update
const urlsToCache = [
  '/', // The root HTML file
  '/index.html',
  '/styles.css',
  '/api.js',
  '/app.js',
  // Module files (using root-relative paths)
  '/modules/state.js',
  '/modules/ui.js',
  '/modules/taskActions.js',
  '/modules/taskRenderer.js',
  '/pushNotifications.js',
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
  const requestUrl = new URL(event.request.url);

  // 1. Handle API requests
  if (requestUrl.pathname.startsWith('/api/')) {
    // For API GET requests: Network First, then Cache
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then(networkResponse => {
            // Cache successful network responses for future offline use
            return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          })
          .catch(() => {
            // If network fails, try to get from cache
            return caches.match(event.request);
          })
      );
    } else {
      // For API POST/PUT/DELETE requests: Network Only (offline handling in app.js)
      event.respondWith(fetch(event.request));
    }
  }
  // 2. Handle all other requests (static assets, HTML, etc.): Cache First, then Network
  else {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Return from cache if found, otherwise fetch from network
        return cachedResponse || fetch(event.request).then(networkResponse => {
          // And cache the new response for next time
          return caches.open(STATIC_CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
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

// --- Push Notification Event Listeners ---

/**
 * Listen for push events from the server.
 */
self.addEventListener('push', event => {
    console.log('[Service Worker] Push Received.');
    const data = event.data.json();
    console.log('[Service Worker] Push data: ', data);

    const title = data.title || 'Task Lab';
    const options = {
        body: data.body || 'You have a new notification.',
        icon: '/icons/icon-192x192.png', // Ensure you have an icon here
        badge: '/icons/icon-96x96.png', // And a smaller badge icon
        data: {
            url: data.url || '/' // URL to open when notification is clicked
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Listen for clicks on notifications.
 */
self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
