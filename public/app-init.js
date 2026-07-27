// Pre-render bootstrap. This lives in a file rather than an inline <script>
// in index.html so the Content-Security-Policy can drop 'unsafe-inline' from
// script-src — with 'unsafe-inline' present, any reflected or stored string
// that reaches the DOM as markup executes, which is the exact class of bug a
// CSP is there to stop.
//
// Loaded as a classic, render-blocking script from <head> (see index.html).
// It must not become a module or gain `defer`: the theme block below has to
// run before first paint, and a deferred script paints the wrong theme first
// and corrects it afterwards.
//
// Served no-cache (see the /app-init.js location in nginx.conf) because the
// filename is not content-hashed — a long-lived immutable cache entry would
// pin an old copy across deploys.

// Reflect the deployment's configured app name in the document title.
// window.ENV comes from /env-config.js, which is loaded immediately before
// this file.
if (window.ENV && window.ENV.VITE_APP_NAME) {
  document.title = window.ENV.VITE_APP_NAME + ' - Pilot Logbook';
}

// Apply the persisted theme before the first paint, so a dark-theme user does
// not get a white flash while React boots. Mirrors the zustand-persist shape
// used by the theme store; a malformed or absent value falls through to the
// OS preference.
(function () {
  try {
    var stored = JSON.parse(localStorage.getItem('ninerlog-theme') || '{}');
    var theme = stored.state && stored.state.theme;
    var dark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    // localStorage can throw (Safari private browsing, disabled storage) —
    // the OS preference still applies via CSS, so there is nothing to do.
  }
})();
