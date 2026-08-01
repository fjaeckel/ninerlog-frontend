import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query currently matches.
 *
 * For deciding what to *fetch*, not what to show — CSS handles showing. The
 * flights list renders either a card list or a table depending on width, and
 * each wants a different query; rendering both and hiding one with CSS would
 * run both queries and double the most expensive read in the app.
 *
 * Read synchronously on the first render so there is no flash of the wrong
 * layout, and subscribed to so a resize across the breakpoint takes effect.
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
