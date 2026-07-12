/* Habit RPG service worker — cache-first with network fallback */
var CACHE_NAME = 'habit-rpg-cache-v14';

var THEMES = [
  'voxel-world', 'blue-ember', 'abyssal-athlete', 'midnight-virtuoso',
  'scholars-observatory', 'roman-resolve', 'neon-training-lab',
  'light-minimal', 'monarch'
];

var THEME_PARTS = [
  'bg', 'hero', 'sigil', 'quote', 'saying', 'empty',
  'stat-completed', 'stat-level', 'stat-xp', 'stat-today', 'stat-habits', 'stat-streak'
];

var CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './css/themes/shared-theme-layout.css',
  './js/theme-manager.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

THEMES.forEach(function (theme) {
  CORE_ASSETS.push('./css/themes/' + theme + '.css');
  THEME_PARTS.forEach(function (part) {
    CORE_ASSETS.push('./assets/themes/' + theme + '/' + part + '.svg');
  });
});

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
