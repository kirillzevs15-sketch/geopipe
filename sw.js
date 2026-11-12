const V = 'geobattle-v1', RT = 'geobattle-rt';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V && k !== RT).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await cache.delete(keys[0]);
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // Файлы приложения: из кэша, в фоне обновляем
  if (u.origin === location.origin) {
    e.respondWith(
      caches.match(r, { ignoreSearch: true }).then(hit => {
        const net = fetch(r).then(res => {
          if (res.ok) caches.open(V).then(c => c.put(r, res.clone()));
          return res;
        }).catch(() => hit || caches.match('./index.html'));
        return hit || net;
      })
    );
    return;
  }

  // Leaflet и тайлы карты: кэшируем по мере использования
  e.respondWith(
    caches.open(RT).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => {
        if (res.ok || res.type === 'opaque') { c.put(r, res.clone()); trim(c, 500); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
