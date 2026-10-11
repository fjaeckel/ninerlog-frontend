/**
 * The screens the harness knows how to reach.
 *
 * A target is `{ name, path }` plus, optionally:
 *   act(page)  an interaction to run before the shot (open a modal, switch tab)
 *   empty      serve empty collections, to capture the empty state
 *   fail       serve 500s for the page's own list, to capture the error state
 *   anonymous  do not seed a session — for the public/auth routes
 *   user       fields merged over the fixture user, in the session and /users/me
 *   viewport   a desktop viewport other than the default 1440×1100
 *   routes     `{ path: body }` served in place of the default fixtures
 *   respond(method, path, searchParams, state)  a { status, body } answer
 *              overriding the fixtures, or undefined to fall through to them;
 *              `state` lives for one shot
 *
 * Add a target whenever you add a screen.
 */
import { licenses, logbookMode, logbookModeOff } from './fixtures.mjs';

const editFlight = async (page) => {
  await page.getByRole('button', { name: /edit flight|flug .*bearbeiten/i }).first().click();
  await page.waitForTimeout(600);
};

async function openRestoreTab(page) {
  await page.getByRole('tab', { name: /^(restore json backup|json-sicherung wiederherstellen)$/i }).click();
  await page.waitForTimeout(300);
}

async function uploadBackup(page) {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'ninerlog_backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'NinerLog JSON Backup', version: '1.0', flights: [] })),
  });
  await page.waitForTimeout(800);
}

const RESTORE_NOT_EMPTY = {
  status: 409,
  body: { error: 'The account already holds data; restore into an empty account or use mode=replace', code: 'account_not_empty' },
};
const RESTORE_ATTACHMENTS = {
  status: 409,
  body: {
    error: 'Replacing would delete document files or signed flights that a backup does not carry',
    code: 'replace_would_drop_attachments',
  },
};
const RESTORE_SUCCESS = {
  status: 200,
  body: {
    aircraftImported: 3, aircraftSkipped: 0, licensesImported: 2, classRatingsImported: 4,
    credentialsImported: 2, flightsImported: 214, crewMembersImported: 31, contactsImported: 12,
    flightRevisionsImported: 37, logbookCertificationsImported: 5,
    contactsSkipped: 0, contactsCreated: 3, customCurrencyRulesImported: 2, customReportsImported: 2,
    notificationPreferencesImported: true, flightBaselineImported: true, mode: 'restore',
    warnings: [
      { section: 'customCurrencyRules', index: 1, message: 'restored paused - the definition no longer passes validation' },
      { section: 'customReports', index: 0, message: 'licence scope dropped - the backup does not carry that licence' },
    ],
  },
};

/** Answers the JSON restore endpoint per `mode`. */
function restoreResponder(byMode) {
  return (method, path, params) => {
    if (method !== 'POST' || path !== '/users/me/data') return undefined;
    return byMode[params.get('mode') ?? 'restore'];
  };
}

export const TARGETS = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'flights', path: '/flights' },
  {
    name: 'flights-custom-columns',
    path: '/flights',
    user: {
      flightListColumnMode: 'custom',
      flightListColumns: ['function', 'landings', 'picName', 'crew'],
    },
  },
  { name: 'flights-narrow', path: '/flights', viewport: { width: 1024, height: 900 } },
  {
    name: 'flights-row-hover',
    path: '/flights',
    act: async (page) => {
      await page.locator('tbody tr[class*="cursor-pointer"]').nth(1).hover();
      await page.waitForTimeout(300);
    },
  },
  {
    name: 'flights-custom-columns-ifr',
    path: '/flights',
    user: {
      flightListColumnMode: 'custom',
      flightListColumns: ['ifrTime', 'landings', 'approaches', 'approachTypes', 'holds', 'checks'],
    },
  },
  {
    name: 'flights-modal',
    path: '/flights',
    act: async (page) => {
      await page.getByRole('button', { name: /log flight|flug eintragen/i }).first().click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'flights-modal-airport-search',
    path: '/flights',
    act: async (page) => {
      await page.getByRole('button', { name: /log flight|flug eintragen/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#departureIcao').fill('kon');
      await page.waitForTimeout(800);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
    },
  },
  {
    name: 'flights-modal-airport-picked',
    path: '/flights',
    act: async (page) => {
      await page.getByRole('button', { name: /log flight|flug eintragen/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#departureIcao').fill('kon');
      await page.waitForTimeout(800);
      await page.getByRole('listbox', { name: /airport suggestions|flugplatzvorschläge/i }).getByRole('option').first().click();
      await page.waitForTimeout(200);
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
  { name: 'flight-detail', path: '/flights/f1' },
  {
    name: 'flight-detail-from-list',
    path: '/flights',
    act: async (page) => {
      const row = page.locator('tbody tr[class*="cursor-pointer"]').nth(1);
      if (await row.isVisible()) await row.click();
      else await page.locator('article[role="button"]').nth(1).click();
      await page.waitForTimeout(600);
    },
  },
  { name: 'flight-detail-local-ident', path: '/flights/f8' },
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
  {
    name: 'flight-detail-history-system',
    path: '/flights/f1',
    act: async (page) => {
      await page.getByRole('button', { name: /show 1 system change|1 systemänderung anzeigen/i }).click();
      await page.getByRole('heading', { name: /^(history|verlauf)$/i }).scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    },
  },
  {
    name: 'flights-modal-edit-correction',
    path: '/flights/f1',
    respond: (method, path) =>
      method === 'PUT' && path === '/flights/f1'
        ? {
            status: 422,
            body: { error: 'This edit is a correction and needs a reason', code: 'correction_reason_required' },
          }
        : undefined,
    act: async (page) => {
      await editFlight(page);
      await page.locator('#offBlockTime').fill('09:05');
      await page.locator('#onBlockTime').fill('10:50');
      await page.locator('form button[type="submit"]').click();
      await page.waitForTimeout(600);
      await page.locator('#correction-reason').fill('On-block time corrected from the tech log');
      await page.waitForTimeout(200);
    },
  },
  {
    name: 'flights-modal-edit-override',
    path: '/flights/f1',
    respond: (method, path) =>
      method === 'PUT' && path === '/flights/f1'
        ? {
            status: 422,
            body: {
              error: 'A manual override may only reduce an auto-calculated time',
              code: 'override_exceeds_calculated',
              details: [{ field: 'nightTime', message: 'Must not exceed the calculated 0 min' }],
            },
          }
        : undefined,
    act: async (page) => {
      await editFlight(page);
      await page.locator('#offBlockTime').fill('09:05');
      await page.locator('#onBlockTime').fill('10:50');
      await page.locator('form button[type="submit"]').click();
      await page.waitForTimeout(600);
      await page.locator('#nightTime').scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
    },
  },
  {
    name: 'flights-modal-edit-override-hidden',
    path: '/flights/f1',
    respond: (method, path) =>
      method === 'PUT' && path === '/flights/f1'
        ? {
            status: 422,
            body: {
              error: 'A manual override may only reduce an auto-calculated time',
              code: 'override_exceeds_calculated',
              details: [
                { field: 'nightTime', message: 'Must not exceed the calculated 0 min' },
                { field: 'landingsDay', message: 'Must not exceed the calculated 1' },
                { field: 'sicTime', message: 'Must not exceed the calculated 0 min' },
              ],
            },
          }
        : undefined,
    act: async (page) => {
      await editFlight(page);
      await page.locator('#offBlockTime').fill('09:05');
      await page.locator('#onBlockTime').fill('10:50');
      await page.locator('form button[type="submit"]').click();
      await page.waitForTimeout(600);
      await page.getByRole('dialog').getByRole('radiogroup').scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
    },
  },
  {
    name: 'flight-delete-strict',
    path: '/flights/f1',
    act: async (page) => {
      await page.getByRole('button', { name: /delete flight|flug .*löschen/i }).first().click();
      await page.waitForTimeout(400);
      await page.locator('#delete-reason').fill('Duplicate entry');
    },
  },
  {
    name: 'flight-delete-error',
    path: '/flights/f1',
    respond: (method, path) =>
      method === 'DELETE' && path === '/flights/f1'
        ? { status: 409, body: { error: 'Flight is signed and cannot be deleted' } }
        : undefined,
    act: async (page) => {
      await page.getByRole('button', { name: /delete flight|flug .*löschen/i }).first().click();
      await page.waitForTimeout(400);
      await page.locator('#delete-reason').fill('Duplicate entry');
      await page.getByRole('dialog').getByRole('button', { name: /^(delete flight|flug löschen)$/i }).click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'flight-detail-crew-correction',
    path: '/flights/f1',
    respond: (method, path) =>
      method === 'PUT' && path === '/flights/f1'
        ? {
            status: 422,
            body: { error: 'This edit is a correction and needs a reason', code: 'correction_reason_required' },
          }
        : undefined,
    act: async (page) => {
      await page.getByRole('button', { name: /change name of amelia|namen von amelia/i }).first().click();
      await page.waitForTimeout(200);
      await page.keyboard.press('Control+A');
      await page.keyboard.type('Amelia M. Earhart');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(600);
    },
  },
  { name: 'flights-voided', path: '/flights/voided' },
  { name: 'flight-history-voided', path: '/flights/fv1/history' },
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
  {
    name: 'licenses-modal-country',
    path: '/licenses',
    act: async (page) => {
      await page.getByRole('button', { name: /add country to easa lapl|staat für easa lapl/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#issuingCountry').selectOption('CH');
      await page.locator('#issuingCountry').scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
    },
  },
  {
    name: 'licenses-strict-notice',
    path: '/licenses',
    respond: (method, path, _params, state) => {
      if (method === 'PATCH' && path === '/licenses/l5') {
        state.saved = true;
        return { body: { ...licenses.find((l) => l.id === 'l5'), issuingCountry: 'CH' } };
      }
      if (path === '/logbook/mode') return { body: state.saved ? logbookMode : logbookModeOff };
      return undefined;
    },
    act: async (page) => {
      await page.getByRole('button', { name: /add country to easa lapl|staat für easa lapl/i }).first().click();
      await page.waitForTimeout(600);
      await page.locator('#issuingCountry').selectOption('CH');
      await page.locator('form button[type="submit"]').click();
      await page.waitForTimeout(1200);
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
  { name: 'import-restore', path: '/import', act: openRestoreTab },
  {
    name: 'import-restore-not-empty',
    path: '/import',
    respond: restoreResponder({ restore: RESTORE_NOT_EMPTY }),
    act: async (page) => {
      await openRestoreTab(page);
      await uploadBackup(page);
    },
  },
  {
    name: 'import-restore-attachments',
    path: '/import',
    respond: restoreResponder({ restore: RESTORE_NOT_EMPTY, replace: RESTORE_ATTACHMENTS }),
    act: async (page) => {
      await openRestoreTab(page);
      await uploadBackup(page);
      await page.getByRole('button', { name: /^(replace everything|alles ersetzen)$/i }).click({ timeout: 2000 });
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'import-restore-success',
    path: '/import',
    respond: restoreResponder({ restore: RESTORE_SUCCESS }),
    act: async (page) => {
      await openRestoreTab(page);
      await uploadBackup(page);
      await page.locator('main details > summary').first().click({ timeout: 2000 });
      await page.waitForTimeout(300);
    },
  },
  { name: 'help', path: '/help' },
  { name: 'profile', path: '/profile' },
  {
    name: 'profile-columns-too-wide',
    path: '/profile',
    user: {
      flightListColumnMode: 'custom',
      flightListColumns: [
        'picTime', 'nightTime', 'dualTime', 'ifrTime', 'crossCountryTime', 'sicTime', 'picusTime',
        'soloTime', 'picName', 'instructorName', 'crew', 'remarks',
      ],
    },
  },
  {
    name: 'profile-custom-columns',
    path: '/profile',
    user: { flightListColumnMode: 'custom', flightListColumns: ['picTime', 'nightTime', 'landings', 'picName', 'crew'] },
  },
  {
    name: 'profile-sessions',
    path: '/profile',
    act: async (page) => {
      await page.getByRole('button', { name: /^(data & security|daten & sicherheit)$/i }).first().click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'profile-logbook',
    path: '/profile',
    act: async (page) => {
      await page.getByRole('button', { name: /^(data & security|daten & sicherheit)$/i }).first().click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'profile-logbook-certify-error',
    path: '/profile',
    respond: (method, path) =>
      method === 'POST' && path === '/logbook/certifications'
        ? { status: 422, body: { error: 'certifiedThrough is in the future', code: 'certification_in_future' } }
        : undefined,
    act: async (page) => {
      await page.getByRole('button', { name: /^(data & security|daten & sicherheit)$/i }).first().click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /^(certify|bestätigen)$/i }).click();
      await page.waitForTimeout(400);
      await page.locator('#certified-through').scrollIntoViewIfNeeded();
    },
  },
  {
    name: 'profile-logbook-off',
    path: '/profile',
    routes: { '/logbook/mode': logbookModeOff },
    act: async (page) => {
      await page.getByRole('button', { name: /^(data & security|daten & sicherheit)$/i }).first().click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'profile-logbook-records',
    path: '/profile',
    act: async (page) => {
      await page.getByRole('button', { name: /^(data & security|daten & sicherheit)$/i }).first().click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /^(what ninerlog records|was ninerlog aufzeichnet)$/i }).click();
      await page.waitForTimeout(300);
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
  { name: 'empty-flights-voided', path: '/flights/voided', empty: true },

  // Error states — reached by failing the page's own list request.
  { name: 'error-flights', path: '/flights', fail: true },
  { name: 'error-licenses', path: '/licenses', fail: true },

  // Public routes.
  { name: 'auth-login', path: '/login', anonymous: true },
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
  '/reports/custom': [],
  '/flights/voided': [],
};
