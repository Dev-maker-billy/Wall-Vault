// Wall Vault Admin service worker.
// Deliberately small: it only makes the admin app installable and shows a friendly
// page when the device is offline. It never caches pages, data or images, so the
// admin always sees live content.

const CACHE = 'wall-vault-admin-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.mode !== 'navigate') return;
  if (!new URL(request.url).pathname.startsWith('/admin')) return;

  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
});
