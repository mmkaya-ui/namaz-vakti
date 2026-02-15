const CACHE_NAME = 'namaz-zikir-v2.7.2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './icon1.jpg',
    './manifest.json'
];

// Install: cache core app files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch strategy: 
// - App files (HTML): Cache-first (offline-ready)
// - API calls: Network-first with cache fallback (fresh data when online)
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // API calls: network-first
    if (url.hostname.includes('aladhan.com') || url.hostname.includes('alquran.cloud')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache successful API responses
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // CDN resources (React, Tailwind, etc): cache-first
    if (url.hostname.includes('cdn') || url.hostname.includes('unpkg') || url.hostname.includes('fonts')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // App files: cache-first
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});
