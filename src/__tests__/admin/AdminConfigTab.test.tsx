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
  return { data: match ? routes[match] : { data: [] }, error: undefined };
};

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

// Only the fields these tests assert on; the rest of AdminConfig is filled in
// per test.
const baseConfig = {
  goVersion: 'go1.23.0',
  serverUptime: '1d 2h 3m',
  migrationVersion: 28,
  airportDatabaseSize: 29331,
  corsOrigins: ['https://ninerlog.app'],
  rateLimitAuth: '10 req/min',
  rateLimitAdmin: '30 req/min',
  smtpConfigured: true,
  adminEmailConfigured: true,
  cloudBackupsConfigured: false,
  cloudBackupProviders: [],
};

const openConfigTab = async () => {
  const user = userEvent.setup();
  renderWithProviders(<AdminPage />);
  await user.click(screen.getAllByRole('button', { name: /config/i })[0]);
};

// Assertions scoped to the row, not the page.
const rowFor = (label: string) => {
  const cell = screen.getByText(label);
  const row = cell.parentElement;
  if (!row) throw new Error(`no row for ${label}`);
  return within(row);
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

describe('AdminPage — runtime configuration', () => {
  it('reports the authentication mode, OIDC issuer and reference files', async () => {
    setAdmin();
    mockApi({
      '/admin/config': {
        ...baseConfig,
        authMode: 'oidc',
        oidcIssuer: 'https://sso.example.com/realms/pilots',
        documentFilesEnabled: true,
      },
    });

    await openConfigTab();

    expect(await screen.findByText('Single sign-on (OIDC)')).toBeInTheDocument();
    expect(rowFor('OIDC issuer').getByText('https://sso.example.com/realms/pilots')).toBeInTheDocument();
    expect(rowFor('Reference files').getByText('Enabled')).toBeInTheDocument();
  });

  it('distinguishes a switched-off subsystem from one the API does not report', async () => {
    setAdmin();
    mockApi({
      '/admin/config': {
        ...baseConfig,
        authMode: 'local',
        // no oidcIssuer: not applicable outside SSO
        documentFilesEnabled: false,
      },
    });

    await openConfigTab();

    expect(await screen.findByText('Local accounts')).toBeInTheDocument();
    // The issuer row stays, showing an em dash.
    expect(rowFor('OIDC issuer').getByText('—')).toBeInTheDocument();
    expect(rowFor('Reference files').getByText('Disabled')).toBeInTheDocument();
  });
});
