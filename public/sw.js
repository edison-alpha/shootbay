/**
 * Service Worker — Optimized caching for native-like PWA experience.
 * 
 * Strategy:
 * - Shell assets: cache-first (pre-cached on install)
 * - Static assets (JS, CSS, fonts): stale-while-revalidate
 * - Images (webp, png, svg): cache-first with network fallback (runtime cache)
 * - Navigation (HTML): network-first with offline fallback
 * - API/Supabase: network-only (never cached)
 * 
 * Image cache is capped at 80 entries to prevent storage bloat.
 */

const CACHE_VERSION = 'v5';
const SHELL_CACHE = `shootbay-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `shootbay-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `shootbay-images-${CACHE_VERSION}`;
const ALL_CACHES = [SHELL_CACHE, STATIC_CACHE, IMAGE_CACHE];

// Shell assets — pre-cached on install for instant app shell loading
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Extensions for stale-while-revalidate static cache
const STATIC_EXTENSIONS = ['.js', '.css', '.woff', '.woff2', '.ttf', '.ico'];

// Extensions for cache-first image cache
const IMAGE_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.avif'];

const MAX_IMAGE_CACHE_SIZE = 80;

function isStaticAsset(url) {
  return STATIC_EXTENSIONS.some(ext => url.pathname.endsWith(ext));
}

function isImageAsset(url) {
  return IMAGE_EXTENSIONS.some(ext => url.pathname.endsWith(ext));
}

function isExternalRequest(url) {
  return url.origin !== self.location.origin;
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase');
}

// ─── Install: Pre-cache shell assets ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: Clean old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => !ALL_CACHES.includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: Route-based caching strategies ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip external / API requests entirely
  if (isExternalRequest(url) || isApiRequest(url)) return;

  // Navigation (HTML): Network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(event.request));
    return;
  }

  // Images: Cache-first (fast!) with network fallback + cache eviction
  if (isImageAsset(url)) {
    event.respondWith(cacheFirstImages(event.request));
    return;
  }

  // Static assets (JS/CSS/fonts): Stale-while-revalidate (instant + fresh)
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  // Shell assets: cache-first
  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(event.request, SHELL_CACHE));
    return;
  }
});

// ─── Strategy: Network-first with offline fallback ──────────────────────────
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache the HTML for offline fallback
    const cache = await caches.open(SHELL_CACHE);
    cache.put('/', networkResponse.clone());
    return networkResponse;
  } catch {
    const cached = await caches.match('/');
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// ─── Strategy: Cache-first ──────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// ─── Strategy: Cache-first for images with eviction ─────────────────────────
async function cacheFirstImages(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
      // Evict old entries if over limit
      trimCache(IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE);
    }
    return networkResponse;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// ─── Strategy: Stale-while-revalidate ───────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Start network fetch in parallel (don't block on it)
  const networkFetch = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached immediately, or wait for network
  if (cached) return cached;

  const networkResponse = await networkFetch;
  return networkResponse || new Response('', { status: 408, statusText: 'Offline' });
}

// ─── Cache Eviction Helper ──────────────────────────────────────────────────
async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxSize) return;

  // Delete oldest entries (FIFO)
  const excess = keys.length - maxSize;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

// ─── Message handler for cache invalidation from app ────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_IMAGE_CACHE') {
    caches.delete(IMAGE_CACHE);
  }
});
