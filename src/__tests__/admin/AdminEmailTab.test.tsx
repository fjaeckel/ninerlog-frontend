import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPage from '../../pages/admin/AdminPage';
import { useAuthStore } from '../../stores/authStore';

// Mock the client itself, as the hook tests do.
let routes: Record<string, unknown> = {};

const respond = (path: string) => {
  const match = Object.keys(routes).find((p) => path.includes(p));
  return { data: match ? routes[match] : emptyFor(path), error: undefined };
};

const emptyFor = (path: string) =>
  path.includes('/admin/users') || path.includes('/audit-log')
    ? { data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }
    : { data: [] };

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: vi.fn(async (path: string) => respond(path)),
    POST: vi.fn(async (path: string) => respond(path)),
    DELETE: vi.fn(async (path: string) => respond(path)),
    PUT: vi.fn(async (path: string) => respond(path)),
    PATCH: vi.fn(async (path: string) => respond(path)),
  },
}));

let queryClient: QueryClient;

const mockApi = (r: Record<string, unknown>) => { routes = r; };

const renderWithProviders = (component: React.ReactElement) => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

const setAdmin = () => {
  useAuthStore.setState({
    user: {
      id: 'admin-1',
      email: 'admin@ninerlog.app',
      name: 'Admin User',
      isAdmin: true,
      createdAt: '',
      updatedAt: '',
    },
    isAuthenticated: true,
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresIn: 900,
  });
};

const openEmailTab = async () => {
  const user = userEvent.setup();
  renderWithProviders(<AdminPage />);
  await user.click(screen.getAllByRole('button', { name: /email/i })[0]);
  return user;
};

beforeEach(() => {
  routes = {};
});

afterEach(() => {
  cleanup();
  queryClient?.clear();
  vi.clearAllMocks();
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    expiresIn: 0,
  } as unknown as Parameters<typeof useAuthStore.setState>[0]);
});

describe('AdminPage — email deliverability', () => {
  it('shows the delivery log with each outcome', async () => {
    setAdmin();
    mockApi({
      '/admin/email/deliveries': {
        data: [
          {
            id: '1',
            recipient: 'ok@example.com',
            emailType: 'verify_email',
            status: 'delivered',
            smtpCode: 250,
            createdAt: '2026-08-01T10:00:00Z',
          },
          {
            id: '2',
            recipient: 'dead@example.com',
            emailType: 'verification_reminder',
            status: 'hard_bounce',
            smtpCode: 550,
            detail: 'RCPT TO: 550 no such user',
            createdAt: '2026-08-01T11:00:00Z',
          },
          {
            id: '3',
            recipient: 'later@example.com',
            emailType: 'password_reset',
            status: 'server_error',
            smtpCode: 535,
            createdAt: '2026-08-01T12:00:00Z',
          },
        ],
      },
    });

    await openEmailTab();

    expect(await screen.findByText('ok@example.com')).toBeInTheDocument();
    expect(screen.getByText('dead@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Hard bounce \(550\)/)).toBeInTheDocument();

    // Server-error styling differs from bounce styling.
    expect(screen.getByText(/Server error \(535\)/)).toBeInTheDocument();
  });

  it('states plainly that delivered does not mean the message reached an inbox', async () => {
    setAdmin();
    await openEmailTab();

    expect(
      await screen.findByText(/not that it reached an inbox/i)
    ).toBeInTheDocument();
  });

  it('lists suppressed addresses and offers to lift one', async () => {
    setAdmin();
    mockApi({
      '/admin/email/suppressions': {
        data: [
          {
            email: 'dead@example.com',
            reason: 'hard_bounce',
            smtpCode: 550,
            firstBouncedAt: '2026-07-01T10:00:00Z',
            lastBouncedAt: '2026-08-01T10:00:00Z',
            bounceCount: 3,
          },
        ],
      },
    });

    await openEmailTab();

    expect(await screen.findByText('dead@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lift suppression/i })).toBeInTheDocument();
  });

  it('says so when nothing is suppressed rather than showing an empty box', async () => {
    setAdmin();
    await openEmailTab();

    expect(
      await screen.findByText(/every recipient is still accepting mail/i)
    ).toBeInTheDocument();
  });
});

describe('AdminPage — unverified account lifecycle', () => {
  it('shows the scheduled deletion date and undeliverable flag on a user', async () => {
    setAdmin();
    mockApi({
      '/admin/users': {
        data: [
          {
            id: 'u1',
            email: 'stale@example.com',
            name: 'Stale Signup',
            createdAt: '2026-06-01T10:00:00Z',
            emailVerified: false,
            twoFactorEnabled: false,
            disabled: false,
            flightCount: 0,
            aircraftCount: 0,
            verificationReminderSentAt: '2026-06-02T10:00:00Z',
            scheduledDeletionAt: '2026-07-02T10:00:00Z',
            emailSuppressed: true,
          },
        ],
        pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);
    await user.click(screen.getAllByRole('button', { name: /users/i })[0]);

    expect((await screen.findAllByText('stale@example.com')).length).toBeGreaterThan(0);
    // Both the pending deletion and the reason it will never verify itself.
    expect(screen.getAllByText(/Deletion/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Undeliverable/).length).toBeGreaterThan(0);
  });

  it('does not show a deletion date for a verified account', async () => {
    setAdmin();
    mockApi({
      '/admin/users': {
        data: [
          {
            id: 'u2',
            email: 'good@example.com',
            name: 'Verified Pilot',
            createdAt: '2026-06-01T10:00:00Z',
            emailVerified: true,
            twoFactorEnabled: false,
            disabled: false,
            flightCount: 5,
            aircraftCount: 1,
          },
        ],
        pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);
    await user.click(screen.getAllByRole('button', { name: /users/i })[0]);

    expect((await screen.findAllByText('good@example.com')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Deletion/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Undeliverable/)).not.toBeInTheDocument();
  });

  it('disables the sweep button when cleanup is off on the deployment', async () => {
    setAdmin();
    mockApi({
      '/admin/config': {
        goVersion: 'go1.26',
        serverUptime: '1d',
        migrationVersion: 56,
        airportDatabaseSize: 100,
        corsOrigins: [],
        rateLimitAuth: '10 req/min',
        rateLimitAdmin: '30 req/min',
        smtpConfigured: false,
        adminEmailConfigured: false,
        cloudBackupsConfigured: false,
        cloudBackupProviders: [],
        unverifiedCleanupEnabled: false,
        unverifiedCleanupDisabledReason: 'smtp_not_configured',
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);
    await user.click(screen.getAllByRole('button', { name: /maintenance/i })[0]);

    const sweepButton = await screen.findByRole('button', { name: /run sweep/i });
    expect(sweepButton).toBeDisabled();
    expect(screen.getByText(/SMTP is not configured/i)).toBeInTheDocument();
  });

  it('refuses the sweep in SSO mode and explains that it cannot be switched on', async () => {
    setAdmin();
    mockApi({
      '/admin/config': {
        goVersion: 'go1.26',
        serverUptime: '1d',
        migrationVersion: 56,
        airportDatabaseSize: 100,
        corsOrigins: [],
        rateLimitAuth: '10 req/min',
        rateLimitAdmin: '30 req/min',
        smtpConfigured: true,
        adminEmailConfigured: true,
        cloudBackupsConfigured: false,
        cloudBackupProviders: [],
        authMode: 'oidc',
        // SMTP configured and mail working; the mode alone forbids reaping.
        unverifiedCleanupEnabled: false,
        unverifiedCleanupDisabledReason: 'oidc_mode',
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);
    await user.click(screen.getAllByRole('button', { name: /maintenance/i })[0]);

    expect(await screen.findByRole('button', { name: /run sweep/i })).toBeDisabled();
    expect(screen.getByText(/cannot be switched on in SSO mode/i)).toBeInTheDocument();
    // No irreversible-deletion warning here.
    expect(screen.queryByText(/irreversible/i)).not.toBeInTheDocument();
  });

  it('names single sign-on in the config tab rather than a bare "disabled"', async () => {
    setAdmin();
    mockApi({
      '/admin/config': {
        goVersion: 'go1.26',
        serverUptime: '1d',
        migrationVersion: 56,
        airportDatabaseSize: 100,
        corsOrigins: [],
        rateLimitAuth: '10 req/min',
        rateLimitAdmin: '30 req/min',
        smtpConfigured: true,
        adminEmailConfigured: true,
        cloudBackupsConfigured: false,
        cloudBackupProviders: [],
        authMode: 'oidc',
        unverifiedCleanupEnabled: false,
        unverifiedCleanupDisabledReason: 'oidc_mode',
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);
    await user.click(screen.getAllByRole('button', { name: /^config$/i })[0]);

    expect(await screen.findByText(/Disabled \(single sign-on\)/i)).toBeInTheDocument();
  });

  it('warns that the sweep deletes irreversibly when it is enabled', async () => {
    setAdmin();
    mockApi({
      '/admin/config': {
        goVersion: 'go1.26',
        serverUptime: '1d',
        migrationVersion: 56,
        airportDatabaseSize: 100,
        corsOrigins: [],
        rateLimitAuth: '10 req/min',
        rateLimitAdmin: '30 req/min',
        smtpConfigured: true,
        adminEmailConfigured: true,
        cloudBackupsConfigured: false,
        cloudBackupProviders: [],
        unverifiedCleanupEnabled: true,
        unverifiedReminderAfter: '24h0m0s',
        unverifiedRetention: '720h0m0s',
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);
    await user.click(screen.getAllByRole('button', { name: /maintenance/i })[0]);

    const sweepButton = await screen.findByRole('button', { name: /run sweep/i });
    expect(sweepButton).toBeEnabled();
    expect(screen.getByText(/irreversible/i)).toBeInTheDocument();
  });

  it('reports the configured lifecycle timing in the config tab', async () => {
    setAdmin();
    mockApi({
      '/admin/config': {
        goVersion: 'go1.26',
        serverUptime: '1d',
        migrationVersion: 56,
        airportDatabaseSize: 100,
        corsOrigins: [],
        rateLimitAuth: '10 req/min',
        rateLimitAdmin: '30 req/min',
        smtpConfigured: true,
        adminEmailConfigured: true,
        cloudBackupsConfigured: false,
        cloudBackupProviders: [],
        unverifiedCleanupEnabled: true,
        unverifiedReminderAfter: '24h0m0s',
        unverifiedRetention: '720h0m0s',
        emailSuppressedCount: 2,
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);
    await user.click(screen.getAllByRole('button', { name: /^config$/i })[0]);

    const timing = await screen.findByText(/Reminder after 24h0m0s, deleted 720h0m0s later/);
    expect(timing).toBeInTheDocument();

    const suppressedRow = screen.getByText(/Suppressed addresses/).closest('div');
    expect(suppressedRow && within(suppressedRow).getByText('2')).toBeTruthy();
  });
});
