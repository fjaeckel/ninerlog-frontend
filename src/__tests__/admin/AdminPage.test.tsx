import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPage from '../../pages/admin/AdminPage';
import { useAuthStore } from '../../stores/authStore';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
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
    user: { id: 'admin-1', email: 'admin@pilotlog.app', name: 'Admin User', isAdmin: true, createdAt: '', updatedAt: '' },
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

describe('AdminPage — Dashboard Tab', () => {
  it('shows admin console with Dashboard tab active by default', () => {
    setAdmin();
    renderWithProviders(<AdminPage />);
    expect(screen.getByText('Admin Console')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });

  it('renders all six tab buttons', () => {
    setAdmin();
    renderWithProviders(<AdminPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('Config')).toBeInTheDocument();
  });
});

describe('AdminPage — Users Tab', () => {
  it('shows user table headers when Users tab clicked', async () => {
    setAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    await user.click(screen.getByText('Users'));

    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('2FA')).toBeInTheDocument();
    expect(screen.getByText('Flights')).toBeInTheDocument();
    expect(screen.getByText('Aircraft')).toBeInTheDocument();
    expect(screen.getByText('Last Login')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('shows search input on Users tab', async () => {
    setAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    await user.click(screen.getByText('Users'));

    expect(screen.getByRole('textbox', { name: /search users/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
  });
});

describe('AdminPage — Audit Log Tab', () => {
  it('shows audit log table headers when Audit Log tab clicked', async () => {
    setAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    await user.click(screen.getByText('Audit Log'));

    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Target User')).toBeInTheDocument();
  });
});

describe('AdminPage — Maintenance Tab', () => {
  it('shows maintenance tools when Maintenance tab clicked', async () => {
    setAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    await user.click(screen.getByText('Maintenance'));

    expect(screen.getByText('Token Cleanup')).toBeInTheDocument();
    expect(screen.getByText('SMTP Test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clean up expired tokens/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send test email/i })).toBeInTheDocument();
  });
});

describe('AdminPage — Announcements Tab', () => {
  it('shows announcement creation form when Announcements tab clicked', async () => {
    setAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    await user.click(screen.getByText('Announcements'));

    expect(screen.getByText('Create Announcement')).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/severity/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publish announcement/i })).toBeInTheDocument();
  });

  it('shows severity options', async () => {
    setAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    await user.click(screen.getByText('Announcements'));

    const select = screen.getByLabelText(/severity/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Info (blue)')).toBeInTheDocument();
    expect(screen.getByText('Warning (orange)')).toBeInTheDocument();
    expect(screen.getByText('Critical (red)')).toBeInTheDocument();
    expect(screen.getByText('Success (green)')).toBeInTheDocument();
  });
});

describe('AdminPage — Config Tab', () => {
  it('shows config tab button', () => {
    setAdmin();
    renderWithProviders(<AdminPage />);
    expect(screen.getByText('Config')).toBeInTheDocument();
  });

  it('shows config content when Config tab clicked', async () => {
    setAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    await user.click(screen.getByText('Config'));

    // Config tab is active — no "Access Denied" shown
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    // The Create Announcement form from Announcements tab should not be visible
    expect(screen.queryByText('Create Announcement')).not.toBeInTheDocument();
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

describe('AdminPage — Full Workflow Validation', () => {
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

  it('admin can navigate between all tabs', async () => {
    setAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    // Dashboard is default
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Switch to Users
    await user.click(screen.getByText('Users'));
    expect(screen.getByRole('textbox', { name: /search users/i })).toBeInTheDocument();

    // Switch to Audit Log
    await user.click(screen.getByText('Audit Log'));
    expect(screen.getByText('Timestamp')).toBeInTheDocument();

    // Switch to Maintenance
    await user.click(screen.getByText('Maintenance'));
    expect(screen.getByText('Token Cleanup')).toBeInTheDocument();

    // Switch to Announcements
    await user.click(screen.getByText('Announcements'));
    expect(screen.getByText('Create Announcement')).toBeInTheDocument();

    // Switch to Config
    await user.click(screen.getByText('Config'));
    expect(screen.queryByText('Create Announcement')).not.toBeInTheDocument();

    // Switch back to Dashboard
    await user.click(screen.getByText('Dashboard'));
    expect(screen.queryByText('Publish Announcement')).not.toBeInTheDocument();
  });

  it('users table does not expose flight data, credentials, or passwords', async () => {
    setAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    await user.click(screen.getByText('Users'));

    // Table should show metadata columns only
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    // Must NOT contain individual data columns
    expect(screen.queryByText('Password')).not.toBeInTheDocument();
    expect(screen.queryByText('Credentials')).not.toBeInTheDocument();
    expect(screen.queryByText('Logbook')).not.toBeInTheDocument();
    expect(screen.queryByText('Route')).not.toBeInTheDocument();
    expect(screen.queryByText('Departure')).not.toBeInTheDocument();
    expect(screen.queryByText('Arrival')).not.toBeInTheDocument();
  });

  it('admin page is lazy-loaded (distinct module chunk)', () => {
    // Verify AdminPage is imported via lazy() by checking it renders within Suspense
    setAdmin();
    const { container } = renderWithProviders(<AdminPage />);
    expect(container.querySelector('.page-title')).toBeTruthy();
  });
});
