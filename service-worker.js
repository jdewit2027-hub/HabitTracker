/* Habit RPG service worker — cache-first with network fallback */
var CACHE_NAME = 'habit-rpg-cache-v11';

var CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/theme-manager.js',
  './js/app.js',
  './assets/themes/voxel-world.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        /* Icons may not exist yet — cache them individually so a missing
           file doesn't block install of the rest of the app. */
        return Promise.all(
          CORE_ASSETS.map(function (url) {
            return cache.add(url).catch(function () {});
          })
        );
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            if (key !== CACHE_NAME) return caches.delete(key);
          })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      });
    })
  );
});
