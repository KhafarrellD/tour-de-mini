/**
 * Keeps the game fresh, and playable without a connection.
 *
 * GitHub Pages tells browsers to hold onto files for ten minutes, so after
 * a deploy a returning player could be served the old game. This worker
 * asks the network first and only falls back to its cache when the network
 * cannot answer — so an online player always gets the current build, and an
 * offline one still gets a game.
 *
 * This file runs in the service worker scope, not the page, so it is not
 * part of the page's typecheck; keep it small and plain.
 */
const CACHE = 'tour-de-mini-v1';

self.addEventListener('install', () => {
  // Take over as soon as this version is ready; there is nothing to migrate.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        // Only whole, own responses are worth keeping.
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error(`offline and not cached: ${url.pathname}`);
      }
    })(),
  );
});
