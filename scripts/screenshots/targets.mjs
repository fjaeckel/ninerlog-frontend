/**
 * The screens the harness knows how to reach.
 *
 * A target is `{ name, path }` plus, optionally:
 *   act(page)  an interaction to run before the shot (open a modal, switch tab)
 *   empty      serve empty collections, to capture the empty state
 *   fail       serve 500s for the page's own list, to capture the error state
 *   anonymous  do not seed a session — for the public/auth routes
 *   personaOnly  only captured when named, or in a persona run
 *   skip(fx)   true when the target does not apply to the fixture set
 *
 * `act(page, fx)` receives the fixture set; persona sets carry
 * `shotAircraft`, the registrations their form shots select.
 *
 * Add a target whenever you add a screen.
 */
export const TARGETS = [
  { name: 'dashboard', path: '/dashboard' },
  {
    name: 'dashboard-no-reminders',
    path: '/dashboard',
    act: async (page) => {
      await page.route('**/api/v1/aircraft-reminders*', (route) => route.fulfill({ json: [] }));
      await page.reload();
      await page.waitForTimeout(800);
    },
  },
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
    name: 'flights-modal-takeoffs-mismatch',
    path: '/flights',
    act: async (page) => {
      await page.getByRole('button', { name: /log flight|flug eintragen/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#landings').fill('3');
      await page.locator('#takeoffsDay').fill('1');
      await page.locator('#takeoffsDay').scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
    },
  },
  {
    name: 'flights-modal-instrument',
    path: '/flights',
    act: async (page) => {
      await page.getByRole('button', { name: /log flight|flug eintragen/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#offBlockTime').fill('08:05');
      await page.locator('#onBlockTime').fill('09:30');
      await page.getByRole('button', { name: /instrument \/ ifr/i }).click();
      await page.getByRole('button', { name: /training & currency|ausbildung & recency/i }).click();
      await page.locator('#ifrTime').evaluate((el) => {
        const panel = el.closest('.overflow-y-auto');
        panel.scrollTop += el.getBoundingClientRect().top - panel.getBoundingClientRect().top - 120;
      });
      await page.waitForTimeout(300);
    },
  },
  {
    name: 'flights-save-report',
    path: '/flights?q=night%3E0&aircraftReg=D-EABC&function=pic&startDate=2026-01-01&endDate=2026-08-16',
    act: async (page) => {
      await page.getByRole('button', { name: /save as report|als bericht speichern/i }).first().click();
      await page.waitForTimeout(1200);
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
  {
    name: 'flights-modal-glider',
    path: '/flights',
    act: async (page) => {
      await page.getByRole('button', { name: /log flight|flug eintragen/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#aircraftReg').fill('D-5812');
      await page.locator('#date').click();
      await page.locator('#launchMethod').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    },
  },
  {
    name: 'flights-modal-quick-add-glider',
    path: '/flights',
    act: async (page) => {
      await page.getByRole('button', { name: /log flight|flug eintragen/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#aircraftReg').fill('D-1234');
      await page.getByRole('button', { name: /new aircraft\?|neues luftfahrzeug\?/i }).click();
      await page.waitForTimeout(300);
    },
  },
  {
    name: 'flights-modal-quick-add-ul',
    path: '/flights',
    act: async (page) => {
      await page.getByRole('button', { name: /log flight|flug eintragen/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#aircraftReg').fill('D-MNEW');
      await page.getByRole('button', { name: /new aircraft\?|neues luftfahrzeug\?/i }).click();
      await page.waitForTimeout(300);
    },
  },
  {
    name: 'flights-modal-primary',
    path: '/flights',
    personaOnly: true,
    skip: (fx) => !fx.shotAircraft?.[0],
    act: (page, fx) => openFormWithAircraft(page, fx.shotAircraft[0]),
  },
  {
    name: 'flights-modal-secondary',
    path: '/flights',
    personaOnly: true,
    skip: (fx) => !fx.shotAircraft?.[1],
    act: (page, fx) => openFormWithAircraft(page, fx.shotAircraft[1]),
  },
  { name: 'flight-detail', path: '/flights/f1' },
  {
    name: 'flights-modal-edit',
    path: '/flights/f1',
    act: async (page) => {
      await page.getByRole('button', { name: /edit flight|flug .*bearbeiten/i }).first().click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'flights-modal-edit-crew',
    path: '/flights/f1',
    act: async (page) => {
      await page.getByRole('button', { name: /edit flight|flug .*bearbeiten/i }).first().click();
      await page.waitForTimeout(600);
      await page.getByRole('dialog').getByRole('combobox', { name: /role of amelia|rolle von amelia/i }).scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
    },
  },
  { name: 'flight-detail-simulator', path: '/flights/f6' },
  { name: 'flight-detail-signed', path: '/flights/f2' },
  {
    name: 'flight-detail-crew-rename',
    path: '/flights/f1',
    act: async (page) => {
      await page.getByRole('button', { name: /change name of amelia|namen von amelia/i }).first().click();
      await page.waitForTimeout(300);
    },
  },
  { name: 'aircraft', path: '/aircraft' },
  {
    name: 'aircraft-reminder-form',
    path: '/aircraft',
    act: async (page) => {
      await page.getByRole('button', { name: /^(add reminder|erinnerung hinzufügen)$/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#reminder-kind').selectOption('RESCUE_SYSTEM_REPACK');
      await page.waitForTimeout(200);
    },
  },
  {
    name: 'aircraft-modal',
    path: '/aircraft',
    act: async (page) => {
      await page.getByRole('button', { name: /add aircraft|luftfahrzeug hinzufügen/i }).first().click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'aircraft-modal-ul',
    path: '/aircraft',
    act: async (page) => {
      await page.getByRole('button', { name: /add aircraft|luftfahrzeug hinzufügen/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#aircraftClass').selectOption('ULTRALIGHT');
      await page.waitForTimeout(300);
    },
  },
  {
    name: 'aircraft-modal-ul-gyro',
    path: '/aircraft',
    act: async (page) => {
      await page.getByRole('button', { name: /add aircraft|luftfahrzeug hinzufügen/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#aircraftClass').selectOption('ULTRALIGHT');
      await page.locator('#ulKind').selectOption('GYROPLANE');
      await page.waitForTimeout(300);
    },
  },
  { name: 'licenses', path: '/licenses' },
  { name: 'licenses-rating-edit', path: '/licenses?editRating=cr9' },
  {
    name: 'licenses-modal-ul',
    path: '/licenses',
    act: async (page) => {
      await page.getByRole('button', { name: /add license|lizenz hinzufügen/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#regulatoryAuthority').fill('EASA');
      await page.locator('#licenseType').fill('UL');
      await page.waitForTimeout(300);
    },
  },
  {
    name: 'licenses-rating-ul',
    path: '/licenses',
    act: async (page) => {
      await page.getByRole('button', { name: /add rating|berechtigung hinzufügen/i }).first().click();
      await page.waitForTimeout(300);
      await page.locator('select').first().selectOption('ULTRALIGHT');
      await page.waitForTimeout(300);
    },
  },
  { name: 'credentials', path: '/credentials' },
  { name: 'currency', path: '/currency' },
  { name: 'currency-builder', path: '/currency/builder' },
  { name: 'people', path: '/people' },
  { name: 'quicklog', path: '/quicklog' },
  { name: 'reports', path: '/reports' },
  {
    name: 'reports-custom',
    path: '/reports#custom',
    act: async (page) => {
      await page.waitForTimeout(1500);
    },
  },
  {
    name: 'reports-custom-menu',
    path: '/reports#custom',
    act: async (page) => {
      await page.getByRole('button', { name: /actions for hours per month|aktionen für hours per month/i }).first().click();
      await page.waitForTimeout(300);
    },
  },
  {
    name: 'reports-custom-edit',
    path: '/reports#custom',
    act: async (page) => {
      await page.getByRole('button', { name: /actions for night time by aircraft|aktionen für night time by aircraft/i }).first().click();
      await page.getByRole('menuitem', { name: /^(edit|bearbeiten)$/i }).click();
      await page.waitForTimeout(1200);
    },
  },
  { name: 'map', path: '/map' },
  { name: 'export', path: '/export' },
  {
    name: 'export-weblogbook',
    path: '/export',
    act: async (page) => {
      await page.getByLabel(/^csv format$|^csv-format$/i).selectOption('weblogbook');
      await page.waitForTimeout(200);
    },
  },
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
    name: 'profile-notifications',
    path: '/profile',
    act: async (page) => {
      await page.getByRole('button', { name: /^(notifications|benachrichtigungen)$/i }).first().click();
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
  { name: 'empty-reports-custom', path: '/reports#custom', empty: true },

  // Error states — reached by failing the page's own list request.
  { name: 'error-flights', path: '/flights', fail: true },
  { name: 'error-licenses', path: '/licenses', fail: true },

  // Public routes.
  { name: 'auth-login', path: '/login', anonymous: true },
  { name: 'auth-register', path: '/register', anonymous: true },
  { name: 'auth-reset', path: '/reset-password', anonymous: true },
  { name: 'auth-new-password', path: '/new-password?token=demo-token', anonymous: true },
];

/** The flight form with `registration` picked from the fleet. */
async function openFormWithAircraft(page, registration) {
  await page.getByRole('button', { name: /log flight|flug eintragen/i }).first().click();
  await page.waitForTimeout(600);
  await page.locator('#aircraftReg').fill(registration);
  await page.locator('#date').click();
  await page.waitForTimeout(400);
}

/** The screens a persona run captures when no target is named. */
export const PERSONA_TARGETS = [
  'dashboard', 'flights', 'flights-modal', 'flights-modal-primary', 'flights-modal-secondary',
  'flight-detail', 'aircraft', 'licenses', 'currency', 'reports', 'profile',
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
  '/reports/custom': [],
};
