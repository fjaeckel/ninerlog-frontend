import { lazy, type ComponentType } from 'react';

/** Detects errors thrown by a failed dynamic `import()` (chunk load failure). */
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
    // Safari's generic failure message.
    msg.includes("'text/html' is not a valid javascript mime type")
  );
}

/**
 * Wraps `React.lazy` with one automatic retry on dynamic-import failure, then
 * a single hard reload guarded by a sessionStorage flag.
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
      // Retry once.
      try {
        return await factory();
      } catch (err2) {
        if (!isChunkLoadError(err2)) throw err2;
        // Force a single reload.
        if (typeof window !== 'undefined' && !sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          // Never resolves; the page is reloading.
          return new Promise<{ default: T }>(() => {});
        }
        throw err2;
      }
    }
  });
}
