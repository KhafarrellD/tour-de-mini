/**
 * Registers the service worker that keeps the game current and lets it run
 * without a connection. Everything about it is optional: if the browser has
 * no service workers, or the page is opened from a file, the game is
 * exactly the same, just online-only.
 */
export function keepFresh() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    // The worker's own scope is this folder, so an embedded copy of the game
    // never touches the rest of the site.
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { scope: './' }).catch(() => {
      // Nothing to do: the game works without it.
    });
  });
}
