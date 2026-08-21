// /public/sw.js — Play Nexa Service Worker
// 4-cache strategy: static, thumbs, games, data
// Max 50KB, no heavy libs, 2GB RAM safe

const STATIC_CACHE = 'pn-static-v2';
const THUMBS_CACHE = 'pn-thumbs-v2';
const GAMES_CACHE  = 'pn-games-v2';
const DATA_CACHE   = 'pn-data-v2';
const MAX_THUMBS   = 50;
const MAX_CACHE_MB = 100;

// ── INSTALL: cache static shell ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/games',
        '/offline.html',
      ]).catch(() => {
        // Silent fail for unavailable routes
      });
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches ──
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, THUMBS_CACHE, GAMES_CACHE, DATA_CACHE];
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ── STORAGE QUOTA CHECK ──
async function hasStorageQuota(requiredMB) {
  try {
    const est = await navigator.storage.estimate();
    const availableMB = (est.quota - est.usage) / (1024 * 1024);
    return availableMB >= requiredMB;
  } catch {
    return true; // assume OK if API unavailable
  }
}

// ── THUMBNAIL LRU EVICTION ──
async function evictOldThumbs(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_THUMBS) return;
  const excess = keys.length - MAX_THUMBS;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

// ── FETCH ROUTER ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const req = event.request;

  // Skip non-GET
  if (req.method !== 'GET') return;

  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith('http')) return;

  // Route 1: games.json — Stale While Revalidate
  if (url.pathname.endsWith('/games.json') || url.pathname.endsWith('/movies.json') || url.pathname.endsWith('/shorts.json')) {
    event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }

  // Route 2: Thumbnail images — Cache First
  const isThumb =
    url.hostname.includes('img.poki-cdn.com') ||
    url.hostname.includes('imgs.crazygames.com') ||
    url.hostname.includes('img.gamepix.com') ||
    url.hostname.includes('img.youtube.com') ||
    url.hostname.includes('i.ytimg.com') ||
    url.hostname.includes('img.gamedistribution.com') ||
    url.hostname.includes('img.itch.zone') ||
    (url.pathname.includes('/thumbnail') && req.destination === 'image');

  if (isThumb) {
    event.respondWith(cacheFirstThumb(req));
    return;
  }

  // Route 3: Game iframe URLs — Network First
  const isGameUrl =
    url.hostname.includes('poki.com') ||
    url.hostname.includes('crazygames.com') ||
    url.hostname.includes('gamepix.com') ||
    url.hostname.includes('gamedistribution.com') ||
    url.hostname.includes('html5.gamedistribution.com') ||
    url.hostname.includes('itch.io');

  if (isGameUrl && (req.destination === 'iframe' || req.mode === 'navigate')) {
    event.respondWith(networkFirstGame(req));
    return;
  }

  // Route 4: Static assets / navigation — Cache First → Network
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstStatic(req));
    return;
  }

  // Default: network only (don't cache unknown)
  event.respondWith(
    fetch(req).catch(() => new Response('Offline', { status: 503 }))
  );
});

// ── STRATEGY: Stale While Revalidate ──
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req).then((response) => {
    if (response.ok) {
      cache.put(req, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// ── STRATEGY: Cache First (Thumbnails) ──
async function cacheFirstThumb(req) {
  const hasQuota = await hasStorageQuota(50);
  if (!hasQuota) {
    return fetch(req).catch(() => new Response('', { status: 503 }));
  }

  const cache = await caches.open(THUMBS_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const response = await fetch(req);
    if (response.ok) {
      await cache.put(req, response.clone());
      await evictOldThumbs(cache);
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

// ── STRATEGY: Network First (Games) ──
async function networkFirstGame(req) {
  const hasQuota = await hasStorageQuota(200);
  const cache = await caches.open(GAMES_CACHE);

  try {
    const response = await fetch(req);
    if (response.ok && hasQuota) {
      cache.put(req, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response('Game not available offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ── STRATEGY: Cache First (Static Shell) ──
async function cacheFirstStatic(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const response = await fetch(req);
    if (response.ok && (req.destination === 'script' || req.destination === 'style' || req.destination === 'document')) {
      cache.put(req, response.clone());
    }
    return response;
  } catch {
    // Navigation fallback → offline page
    if (req.mode === 'navigate') {
      const offline = await cache.match('/offline.html');
      if (offline) return offline;
    }
    return new Response('Offline', { status: 503 });
  }
}
