import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPage from '../../pages/admin/AdminPage';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';

type Result = { data?: unknown; error?: unknown; response: { status: number } };
let postResult: Result = { data: { message: 'ok' }, response: { status: 200 } };

const users = [
  { id: 'admin-1', email: 'admin@ninerlog.app', name: 'Admin User', isAdmin: true, isBootstrapAdmin: false, emailVerified: true, twoFactorEnabled: false, disabled: false, locked: false, flightCount: 1, aircraftCount: 0, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'u2', email: 'pilot@example.com', name: 'Pilot', isAdmin: false, isBootstrapAdmin: false, emailVerified: true, twoFactorEnabled: false, disabled: false, locked: false, flightCount: 5, aircraftCount: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'u3', email: 'new@example.com', name: 'Unverified', isAdmin: false, isBootstrapAdmin: false, emailVerified: false, twoFactorEnabled: false, disabled: false, locked: false, flightCount: 0, aircraftCount: 0, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'boot', email: 'ops@example.com', name: 'Ops', isAdmin: true, isBootstrapAdmin: true, emailVerified: true, twoFactorEnabled: true, disabled: false, locked: false, flightCount: 0, aircraftCount: 0, createdAt: '2026-01-01T00:00:00Z' },
];

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: vi.fn(async (path: string) => ({
      data: path === '/admin/users'
        ? { data: users, pagination: { total: 4, page: 1, pageSize: 20, totalPages: 1 } }
        : { data: [] },
      error: undefined,
      response: { status: 200 },
    })),
    POST: vi.fn(async () => postResult),
  },
}));

let queryClient: QueryClient;

const openUsersTab = async () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><AdminPage /></BrowserRouter>
    </QueryClientProvider>,
  );
  await user.click(screen.getByRole('button', { name: /^Users$/ }));
  await screen.findAllByText('pilot@example.com');
  return user;
};

const desktopRow = (email: string) => screen.getAllByText(email)[0].closest('tr') as HTMLElement;

beforeEach(() => {
  postResult = { data: { message: 'ok' }, response: { status: 200 } };
  useAuthStore.setState({
    user: { id: 'admin-1', email: 'admin@ninerlog.app', name: 'Admin User', isAdmin: true, createdAt: '', updatedAt: '' },
    isAuthenticated: true, accessToken: 't', refreshToken: 'r', expiresIn: 900,
  });
});

afterEach(() => {
  cleanup();
  queryClient?.clear();
  vi.clearAllMocks();
});

describe('AdminPage — admin roles', () => {
  it('badges admins and offers grant only to verified non-admins', async () => {
    await openUsersTab();
    expect(within(desktopRow('admin@ninerlog.app')).getByText('Admin')).toBeInTheDocument();
    expect(within(desktopRow('admin@ninerlog.app')).getByRole('button', { name: 'Revoke admin rights' })).toBeInTheDocument();
    expect(within(desktopRow('pilot@example.com')).getByRole('button', { name: 'Grant admin rights' })).toBeInTheDocument();
    expect(within(desktopRow('new@example.com')).queryByRole('button', { name: 'Grant admin rights' })).not.toBeInTheDocument();
  });

  it('grants admin rights after confirmation', async () => {
    const user = await openUsersTab();
    await user.click(within(desktopRow('pilot@example.com')).getByRole('button', { name: 'Grant admin rights' }));
    expect(screen.getByText(/Give pilot@example.com admin rights/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Make admin' }));
    expect(apiClient.POST).toHaveBeenCalledWith('/admin/users/{userId}/grant-admin', { params: { path: { userId: 'u2' } } });
    expect(await screen.findByText('pilot@example.com is now an admin.')).toBeInTheDocument();
  });

  it('explains a revoke conflict', async () => {
    postResult = { error: { error: 'Cannot revoke the last admin' }, response: { status: 409 } };
    const user = await openUsersTab();
    await user.click(within(desktopRow('admin@ninerlog.app')).getByRole('button', { name: 'Revoke admin rights' }));
    expect(screen.getByText(/Remove your own admin rights/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove admin' }));
    expect(await screen.findByText(/it is the last active admin/)).toBeInTheDocument();
    expect(useAuthStore.getState().user?.isAdmin).toBe(true);
  });

  it('revoking your own rights drops you out of the console', async () => {
    const user = await openUsersTab();
    await user.click(within(desktopRow('admin@ninerlog.app')).getByRole('button', { name: 'Revoke admin rights' }));
    await user.click(screen.getByRole('button', { name: 'Remove admin' }));
    expect(await screen.findByText('Access Denied')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.isAdmin).toBe(false);
  });

  it('filters to admins', async () => {
    const user = await openUsersTab();
    await user.click(screen.getByRole('checkbox', { name: 'Admins only' }));
    expect(apiClient.GET).toHaveBeenLastCalledWith('/admin/users', {
      params: { query: { page: 1, pageSize: 20, search: undefined, isAdmin: true } },
    });
  });

  it('offers no destructive actions on the ADMIN_EMAIL account', async () => {
    await openUsersTab();
    const row = desktopRow('ops@example.com');
    expect(within(row).getByText('Admin · ADMIN_EMAIL')).toBeInTheDocument();
    for (const name of ['Revoke admin rights', 'Disable account', 'Reset 2FA', 'Delete account and all content']) {
      expect(within(row).queryByTitle(name)).not.toBeInTheDocument();
    }
  });

  it('warns that disabling an admin removes their rights and explains a refusal', async () => {
    postResult = { error: { error: 'Cannot remove the last admin' }, response: { status: 409 } };
    const user = await openUsersTab();
    await user.click(within(desktopRow('admin@ninerlog.app')).getByTitle('Disable account'));
    expect(screen.getByText(/This also removes their admin rights/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Disable' }));
    expect(await screen.findByText(/it is the last active admin/)).toBeInTheDocument();
  });
});
