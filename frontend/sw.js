const CACHE_NAME = 'task-lab-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    // We only want to cache GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});