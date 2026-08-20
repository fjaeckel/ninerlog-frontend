import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { useAuthStore } from '../../stores/authStore';

const updateStatus = {
  checkEnabled: true,
  updateAvailable: true,
  branch: 'main',
  components: [
    {
      name: 'api',
      currentVersion: 'v1.3.4',
      latestVersion: 'v1.3.5',
      state: 'update_available',
      channel: 'release',
      releaseUrl: 'https://github.com/fjaeckel/ninerlog-api/releases/tag/v1.3.5',
    },
  ],
};

const respond = (path: string) => {
  if (path.includes('/admin/update')) return { data: updateStatus, error: undefined };
  if (path.includes('/announcements')) return { data: { announcements: [], hints: [] }, error: undefined };
  return {
    data: { data: [], pagination: { total: 3, page: 1, pageSize: 1, totalPages: 3 } },
    error: undefined,
  };
};

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: vi.fn(async (path: string) => respond(path)),
    POST: vi.fn(async (path: string) => respond(path)),
  },
}));

let queryClient: QueryClient;

const signIn = (isAdmin: boolean) => {
  useAuthStore.setState({
    user: {
      id: 'u1',
      email: 'pilot@example.com',
      name: 'Alex Fischer',
      isAdmin,
      createdAt: '',
      updatedAt: '',
    },
    isAuthenticated: true,
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresIn: 900,
  });
};

const renderLayout = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

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

describe('Layout — update light', () => {
  it('shows the light in the header for an admin', async () => {
    signIn(true);
    renderLayout();

    expect(await screen.findByRole('button', { name: /an update is available/i })).toBeInTheDocument();
  });

  it('never shows it to a non-admin', async () => {
    signIn(false);
    renderLayout();

    await screen.findByRole('banner');
    await vi.waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(screen.queryByRole('button', { name: /an update is available/i })).not.toBeInTheDocument();
  });
});
