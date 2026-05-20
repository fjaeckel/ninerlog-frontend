import { lazy, type ComponentType } from 'react';

/**
 * Detects errors thrown by a failed dynamic `import()` (chunk load failure).
 *
 * These typically happen when the deployed bundle has new chunk hashes but the
 * user's tab still references the old `index.html`. The PWA service worker
 * (autoUpdate) makes this more frequent: after a deploy, navigating to a route
 * whose chunk has never been fetched can 404 / fail with a MIME-type error.
 */
export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; message?: string; code?: string };
  const msg = (e.message || '').toLowerCase();
  return (
    e.name === 'ChunkLoadError' ||
    e.code === 'CSS_CHUNK_LOAD_FAILED' ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('unknown variable dynamic import') ||
    // Safari sometimes surfaces a generic message for SSL/network blips
    msg.includes("'text/html' is not a valid javascript mime type")
  );
}

/**
 * Wraps `React.lazy` with one automatic retry on dynamic-import failure, then
 * forces a hard reload (once) so the browser fetches the fresh `index.html`
 * with current chunk hashes. A sessionStorage flag prevents reload loops.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    const RELOAD_KEY = 'ninerlog:chunk-reloaded';
    try {
      return await factory();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;
      // Retry once — covers transient network glitches.
      try {
        return await factory();
      } catch (err2) {
        if (!isChunkLoadError(err2)) throw err2;
        // Force a single reload to pick up the new index.html / chunks. The
        // ErrorBoundary handles the case where reload didn't help (offline,
        // truly broken deploy) and shows a Retry button.
        if (typeof window !== 'undefined' && !sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          // Return a never-resolving promise so Suspense keeps the loader up
          // until the page actually reloads, instead of flashing an error.
          return new Promise<{ default: T }>(() => {});
        }
        throw err2;
      }
    }
  });
}
