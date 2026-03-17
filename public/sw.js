const CACHE_NAME = 'wishbound-trooper-v2';
const APP_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

const STATIC_EXTENSIONS = [
  // Keep runtime cache lean for PWA performance.
  // Large game images are loaded from network (and browser HTTP cache),
  // not persisted in Service Worker Cache Storage.
  '.js', '.css', '.svg', '.ico', '.woff', '.woff2', '.ttf'
];

function isCacheableStaticRequest(requestUrl) {
  try {
    const url = new URL(requestUrl);
    if (url.origin !== self.location.origin) return false;
    if (url.pathname.startsWith('/api/')) return false;
    return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext)) || APP_ASSETS.includes(url.pathname);
  } catch {
    return false;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Never cache Supabase/API requests to avoid stale user data and huge cache growth.
  const reqUrl = new URL(event.request.url);
  if (reqUrl.origin !== self.location.origin) {
    return;
  }

  // HTML/navigation: network-first for realtime accuracy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', responseClone));
          return networkResponse;
        })
        .catch(() => caches.match('/') || Response.error())
    );
    return;
  }

  // Only cache static app assets.
  if (!isCacheableStaticRequest(event.request.url)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match('/'));
    })
  );
});
