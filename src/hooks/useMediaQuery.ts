import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query currently matches. Read synchronously on the
 * first render and subscribed to changes.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia?.(query);
      if (!list) return () => {};
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => !!window.matchMedia?.(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
