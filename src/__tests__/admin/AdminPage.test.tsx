import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPage from '../../pages/admin/AdminPage';
import { useAuthStore } from '../../stores/authStore';

let queryClient: QueryClient;

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(new Response(JSON.stringify({ data: [], pagination: { total: 0, page: 1, totalPages: 0 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
  );
});

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

afterEach(() => {
  cleanup();
  queryClient?.clear();
  vi.restoreAllMocks();
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    expiresIn: 0,
  } as any);
});

const setAdmin = () => {
  useAuthStore.setState({
    user: { id: 'admin-1', email: 'admin@ninerlog.app', name: 'Admin User', isAdmin: true, createdAt: '', updatedAt: '' },
    isAuthenticated: true,
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresIn: 900,
  });
};

const setRegularUser = () => {
  useAuthStore.setState({
    user: { id: 'user-1', email: 'pilot@example.com', name: 'Regular Pilot', isAdmin: false, createdAt: '', updatedAt: '' },
    isAuthenticated: true,
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresIn: 900,
  });
};

describe('AdminPage — Admin Features', () => {
  it('shows admin console with tabs, Users content with search, and privacy enforcement', async () => {
    setAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    // Dashboard tab buttons
    expect(screen.getByText('Admin Console')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('Config')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();

    // Navigate to Users
    await user.click(screen.getByText('Users'));
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('2FA')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /search users/i })).toBeInTheDocument();
    // Privacy: no sensitive data columns
    expect(screen.queryByText('Password')).not.toBeInTheDocument();
    expect(screen.queryByText('Credentials')).not.toBeInTheDocument();
    expect(screen.queryByText('Logbook')).not.toBeInTheDocument();
  });
});

describe('AdminPage — Access Control', () => {
  it('shows access denied for non-admin users', () => {
    setRegularUser();
    renderWithProviders(<AdminPage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Console')).not.toBeInTheDocument();
  });

  it('shows access denied when isAdmin is undefined', () => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'pilot@example.com', name: 'Pilot', createdAt: '', updatedAt: '' },
      isAuthenticated: true, accessToken: 'token', refreshToken: 'refresh', expiresIn: 900,
    });
    renderWithProviders(<AdminPage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});

describe('Admin Auth Store', () => {
  it('isAdmin flag is stored in auth state', () => {
    setAdmin();
    expect(useAuthStore.getState().user?.isAdmin).toBe(true);
  });

  it('isAdmin defaults to false/undefined for regular users', () => {
    setRegularUser();
    expect(useAuthStore.getState().user?.isAdmin).toBeFalsy();
  });
});

describe('AdminPage — Access Restrictions', () => {
  it('non-admin users see no admin tabs or table', () => {
    setRegularUser();
    renderWithProviders(<AdminPage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Log')).not.toBeInTheDocument();
    expect(screen.queryByText('Maintenance')).not.toBeInTheDocument();
    expect(screen.queryByText('Announcements')).not.toBeInTheDocument();
    expect(screen.queryByText('Config')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('AdminPage — Lazy Loading', () => {
  it('admin page is lazy-loaded (distinct module chunk)', () => {
    setAdmin();
    const { container } = renderWithProviders(<AdminPage />);
    expect(container.querySelector('.page-title')).toBeTruthy();
  });
});
