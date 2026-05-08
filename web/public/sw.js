// Phase 95 — minimal network-first service worker.
const CACHE = 'yapgitsin-v1';
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => clients.claim());
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const c = r.clone();
        caches.open(CACHE).then((cc) => cc.put(e.request, c));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
