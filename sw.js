const CACHE = 'warehouse-v9';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
const NETWORK_TIMEOUT = 4000; // мс — если сеть не ответила за это время, берём кеш

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Позволяет странице принудительно попросить SW обновиться немедленно
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

// NETWORK-FIRST с тайм-аутом.
// Если сеть зависает (например на этапе TLS-хендшейка) дольше NETWORK_TIMEOUT —
// сразу отдаём кешированную копию, не заставляя пользователя ждать вечно.
// Если сеть отвечает быстро — используем свежие данные и обновляем кеш.
self.addEventListener('fetch', e => {
  if (e.request.url.includes('script.google.com')) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    Promise.race([
      fetch(e.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return response;
      }),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), NETWORK_TIMEOUT))
    ]).catch(() =>
      caches.match(e.request).then(cached => cached || fetch(e.request))
    )
  );
});
