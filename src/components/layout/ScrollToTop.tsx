import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/**
 * Starts a newly opened page at the top.
 *
 * A single-page app keeps the window's scroll across a route change, so
 * opening a flight from halfway down the list landed you halfway down the
 * flight. Three things this deliberately does *not* do:
 *
 * - Going back is left alone. The browser restores where you were in the list,
 *   which is the whole point of going back — and with the list scrolling
 *   endlessly, throwing that away would cost far more than it did before.
 * - It watches the path, not the query string. The flights list rewrites its
 *   own query string as you type a search or change a filter, and yanking the
 *   page to the top on every keystroke would be worse than the bug.
 * - It jumps rather than glides. `scroll-smooth` is set globally, so a plain
 *   `scrollTo` would animate the whole way down a long list while the next
 *   page is already rendering.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  // Compared inside the effect rather than leaned on as a dependency: a filter
  // update flips the navigation type while the path stands still, and that must
  // not count as arriving somewhere new.
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    if (navigationType === 'POP') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, navigationType]);

  return null;
}
