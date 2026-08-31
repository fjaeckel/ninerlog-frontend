/**
 * The screens the harness knows how to reach.
 *
 * A target is `{ name, path }` plus, optionally:
 *   act(page)  an interaction to run before the shot (open a modal, switch tab)
 *   empty      serve empty collections, to capture the empty state
 *   fail       serve 500s for the page's own list, to capture the error state
 *   anonymous  do not seed a session — for the public/auth routes
 *   respond    `{ path: { status, body } }`, replacing the fixture for that path
 *
 * Add a target whenever you add a screen.
 */
export const TARGETS = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'flights', path: '/flights' },
  {
    name: 'flights-modal',
    path: '/flights',
    act: async (page) => {
      await page.getByRole('button', { name: /log flight|flug eintragen/i }).first().click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'flights-modal-simulator',
    path: '/flights',
    act: async (page) => {
      await page.getByRole('button', { name: /log flight|flug eintragen/i }).first().click();
      await page.waitForTimeout(600);
      await page.getByRole('radio', { name: /simulator/i }).click();
      await page.waitForTimeout(300);
    },
  },
  { name: 'flight-detail', path: '/flights/f1' },
  { name: 'flight-detail-simulator', path: '/flights/f6' },
  { name: 'aircraft', path: '/aircraft' },
  {
    name: 'aircraft-modal',
    path: '/aircraft',
    act: async (page) => {
      await page.getByRole('button', { name: /add aircraft|luftfahrzeug hinzufügen/i }).first().click();
      await page.waitForTimeout(600);
    },
  },
  { name: 'licenses', path: '/licenses' },
  { name: 'credentials', path: '/credentials' },
  { name: 'currency', path: '/currency' },
  { name: 'currency-builder', path: '/currency/builder' },
  { name: 'people', path: '/people' },
  { name: 'quicklog', path: '/quicklog' },
  { name: 'reports', path: '/reports' },
  { name: 'map', path: '/map' },
  { name: 'export', path: '/export' },
  { name: 'import', path: '/import' },
  { name: 'help', path: '/help' },
  { name: 'profile', path: '/profile' },
  {
    name: 'profile-sessions',
    path: '/profile',
    act: async (page) => {
      await page.getByRole('button', { name: /^(data & security|daten & sicherheit)$/i }).first().click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'update-indicator',
    path: '/dashboard',
    act: async (page) => {
      await page.getByRole('button', { name: /an update is available|ein update ist verfügbar/i }).first().click();
      await page.waitForTimeout(400);
    },
  },
  { name: 'admin', path: '/admin' },
  {
    name: 'admin-users',
    path: '/admin',
    act: async (page) => {
      await page.getByRole('button', { name: /^(users|benutzer)$/i }).first().click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'admin-config',
    path: '/admin',
    act: async (page) => {
      await page.getByRole('button', { name: /^(config|konfiguration)$/i }).first().click();
      await page.waitForTimeout(500);
    },
  },

  // Empty states.
  { name: 'empty-flights', path: '/flights', empty: true },
  { name: 'empty-aircraft', path: '/aircraft', empty: true },
  { name: 'empty-licenses', path: '/licenses', empty: true },
  { name: 'empty-credentials', path: '/credentials', empty: true },

  // Error states — reached by failing the page's own list request.
  { name: 'error-flights', path: '/flights', fail: true },
  { name: 'error-licenses', path: '/licenses', fail: true },

  // Public routes.
  { name: 'auth-login', path: '/login', anonymous: true },
  {
    name: 'auth-login-unverified',
    path: '/login',
    anonymous: true,
    respond: {
      '/auth/login': {
        status: 403,
        body: { error: 'Email address not verified.', code: 'email_not_verified' },
      },
    },
    act: async (page) => {
      await page.getByLabel(/^e-?mail/i).fill('amelia@example.com');
      await page.getByLabel(/password|passwort/i).fill('correcthorsebattery');
      await page.getByRole('button', { name: /^log in$|^anmelden$/i }).click();
      await page.waitForTimeout(600);
    },
  },
  { name: 'auth-register', path: '/register', anonymous: true },
  { name: 'auth-reset', path: '/reset-password', anonymous: true },
  { name: 'auth-new-password', path: '/new-password?token=demo-token', anonymous: true },
];

/** Paths whose list request is failed for a `fail` target. */
export const FAILING_PATHS = ['/flights', '/licenses', '/aircraft', '/credentials'];

/** Bodies served in place of the real collections for an `empty` target. */
export const EMPTY_BODIES = {
  '/flights': { data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } },
  '/aircraft': { data: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 } },
  '/licenses': [],
  '/credentials': [],
  '/contacts': [],
};
