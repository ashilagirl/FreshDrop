// sw.js - Service Worker for Fresh Drop POS V3
const CACHE_NAME = 'freshdrop-pos-v3';
const urlsToCache = [
  '.',
  'index.html',
  'style.css',
  'app.js',
  'data/menu.js',
  'data/recipes.js',
  'data/stock.js',
  'manifest.json'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch and cache strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Activate and clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});