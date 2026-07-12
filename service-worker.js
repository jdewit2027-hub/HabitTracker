/* Habit RPG service worker — cache-first with network fallback */
var CACHE_NAME = 'habit-rpg-cache-v25';

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

/* Voxel World ships production PNG renders (shader background + voxel art)
   plus the pixel font, in addition to the shared per-theme SVGs above. */
[
  'background', 'backpack',
  'steve-clean', 'tree-clean', 'hourglass-clean', 'monument-clean',
  'grass-block-clean', 'diamond-clean', 'xp-clean', 'sword-clean',
  'book-clean', 'trophy-clean', 'bottom-block-clean', 'badge-clean', 'fab-clean'
].forEach(function (part) {
  CORE_ASSETS.push('./assets/themes/voxel-world/' + part + '.png');
});
CORE_ASSETS.push('./assets/fonts/voxel-pixel.ttf');

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        /* Bypass the browser HTTP cache while building a new versioned cache.
           Otherwise a new worker can accidentally precache stale CSS. */
        return Promise.all(
          CORE_ASSETS.map(function (url) {
            return fetch(url, { cache: 'reload' })
              .then(function (response) {
                if (response && response.status === 200) {
                  return cache.put(url, response);
                }
              })
              .catch(function () {});
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
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (clients) {
        return Promise.all(clients.map(function (client) {
          return client.navigate(client.url);
        }));
      })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var requestUrl = new URL(event.request.url);
  var mustRefresh = event.request.mode === 'navigate' ||
    event.request.destination === 'style' ||
    requestUrl.pathname.endsWith('/assets/themes/voxel-world/background.png');

  if (mustRefresh) {
    event.respondWith(
      fetch(event.request, { cache: 'reload' })
        .then(function (response) {
          if (response && response.status === 200 && response.type === 'basic') {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(function () { return caches.match(event.request); })
    );
    return;
  }

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
