import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPage from '../../pages/admin/AdminPage';
import { useAuthStore } from '../../stores/authStore';

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

const taggedRelease = {
  checkEnabled: true,
  updateAvailable: true,
  branch: 'main',
  lastCheckedAt: '2026-08-20T06:00:00Z',
  components: [
    {
      name: 'api',
      currentVersion: 'v1.3.4',
      latestVersion: 'v1.3.5',
      state: 'update_available',
      channel: 'release',
      releaseUrl: 'https://github.com/fjaeckel/ninerlog-api/releases/tag/v1.3.5',
      publishedAt: '2026-08-18T20:32:52Z',
    },
    {
      name: 'frontend',
      currentVersion: 'v1.3.2',
      latestVersion: 'v1.3.2',
      state: 'up_to_date',
      channel: 'release',
    },
  ],
};

const latestBuild = {
  checkEnabled: true,
  updateAvailable: true,
  branch: 'main',
  lastCheckedAt: '2026-08-20T06:00:00Z',
  components: [
    {
      name: 'api',
      currentVersion: 'latest',
      currentCommit: '4f2c1ab',
      state: 'update_available',
      channel: 'commit',
      behindBy: 7,
      compareUrl: 'https://github.com/fjaeckel/ninerlog-api/compare/4f2c1ab...main',
    },
    {
      name: 'frontend',
      currentVersion: 'latest',
      currentCommit: 'a1b2c3d',
      state: 'up_to_date',
      channel: 'commit',
    },
  ],
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

describe('AdminPage — update availability', () => {
  it('announces a newer release with the version it would move to', async () => {
    setAdmin();
    mockApi({ '/admin/update': taggedRelease });
    renderWithProviders(<AdminPage />);

    const banner = await screen.findByRole('status', { name: /an update is available/i });
    expect(banner).toHaveTextContent(/an update is available/i);
    expect(banner).toHaveTextContent('v1.3.4');
    expect(banner).toHaveTextContent('v1.3.5');
    expect(banner).toHaveTextContent(/docker compose pull/);

    const notes = screen.getByRole('link', { name: /release notes/i });
    expect(notes).toHaveAttribute('href', 'https://github.com/fjaeckel/ninerlog-api/releases/tag/v1.3.5');
  });

  it('reports how far a latest build trails the branch', async () => {
    setAdmin();
    mockApi({ '/admin/update': latestBuild });
    renderWithProviders(<AdminPage />);

    const banner = await screen.findByRole('status', { name: /an update is available/i });
    expect(banner).toHaveTextContent('4f2c1ab');
    expect(banner).toHaveTextContent(/7 commits behind main/i);

    const compare = screen.getByRole('link', { name: /view changes/i });
    expect(compare).toHaveAttribute('href', 'https://github.com/fjaeckel/ninerlog-api/compare/4f2c1ab...main');
  });

  it('stays silent when every component is current', async () => {
    setAdmin();
    mockApi({
      '/admin/update': {
        checkEnabled: true,
        updateAvailable: false,
        branch: 'main',
        components: [
          { name: 'api', currentVersion: 'v1.3.5', state: 'up_to_date', channel: 'release' },
          { name: 'frontend', currentVersion: 'v1.3.2', state: 'up_to_date', channel: 'release' },
        ],
      },
    });
    renderWithProviders(<AdminPage />);

    await screen.findByText(/admin console/i);
    expect(screen.queryByRole('status', { name: /an update is available/i })).not.toBeInTheDocument();
  });

  it('stays silent when the check is switched off', async () => {
    setAdmin();
    mockApi({
      '/admin/update': {
        checkEnabled: false,
        updateAvailable: false,
        components: [
          { name: 'api', currentVersion: 'v1.3.4', state: 'unknown' },
          { name: 'frontend', currentVersion: 'dev', state: 'unknown' },
        ],
      },
    });
    renderWithProviders(<AdminPage />);

    await screen.findByText(/admin console/i);
    expect(screen.queryByRole('status', { name: /an update is available/i })).not.toBeInTheDocument();
  });

  it('shows per-component state in the config tab, update or not', async () => {
    setAdmin();
    const user = userEvent.setup();
    mockApi({
      '/admin/config': {
        appVersion: 'v1.3.4',
        goVersion: 'go1.26.7',
        serverUptime: '1d',
        migrationVersion: 41,
        airportDatabaseSize: 29331,
        corsOrigins: [],
        rateLimitAuth: '10 req/min',
        rateLimitAdmin: '30 req/min',
        smtpConfigured: true,
        adminEmailConfigured: true,
        cloudBackupsConfigured: false,
        cloudBackupProviders: [],
        updateCheckEnabled: true,
        updateCheckInterval: '24h0m0s',
      },
      '/admin/update': taggedRelease,
    });
    renderWithProviders(<AdminPage />);
    await user.click(screen.getAllByRole('button', { name: /config/i })[0]);

    expect(await screen.findByText(/v1\.3\.5 available/i)).toBeInTheDocument();
    expect(screen.getByText(/^up to date$/i)).toBeInTheDocument();
    expect(screen.getByText(/enabled \(every 24h0m0s\)/i)).toBeInTheDocument();
  });
});
