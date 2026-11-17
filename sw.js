/* شغلي — Service Worker: كاش للأصول الثابتة، وشبكة أولاً للوظائف */
'use strict';

const CACHE = 'sho8ly-v1';
const CORE = [
  './', './index.html', './styles.css', './app.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // الوظائف: الشبكة أولاً، والكاش احتياطياً عند انقطاع الاتصال.
  if (url.pathname.indexOf('/api/') !== -1) {
    event.respondWith(
      fetch(event.request).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        return res;
      }).catch(function () { return caches.match(event.request); })
    );
    return;
  }
  // الأصول من نفس النطاق: الكاش أولاً، ثم الشبكة مع تحديث الكاش.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(function (hit) {
        if (hit) return hit;
        return fetch(event.request).then(function (res) {
          const copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
          return res;
        });
      })
    );
  }
});
