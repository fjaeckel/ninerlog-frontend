import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPage from '../../pages/admin/AdminPage';
import { useAuthStore } from '../../stores/authStore';

let routes: Record<string, unknown> = {};

const respond = (path: string) => {
  const match = Object.keys(routes).find((p) => path === p);
  return { data: match ? routes[match] : { data: [] }, error: undefined };
};

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: vi.fn(async (path: string) => respond(path)),
    POST: vi.fn(async (path: string) => respond(path)),
  },
}));

const baseStats = {
  totalUsers: 128, totalFlights: 9421, totalSimulatorSessions: 486, totalPassengerFlights: 132,
  totalAircraft: 312, totalContacts: 517, activeSessions: 194, totalCredentials: 244,
  totalImports: 87, flightsThisMonth: 216, newUsersThisWeek: 6, lockedAccounts: 0, disabledAccounts: 0,
  totalCustomReports: 57, importsByFormat: {},
  cloudBackupDestinations: { total: 0, byProvider: {} },
};

const renderAdmin = (stats: Record<string, unknown>) => {
  routes = { '/admin/stats': stats };
  useAuthStore.setState({
    user: { id: 'admin-1', email: 'admin@ninerlog.app', name: 'Admin', isAdmin: true, createdAt: '', updatedAt: '' },
    isAuthenticated: true,
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresIn: 900,
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AdminPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

const tileValue = (label: string) => screen.getByText(label).previousElementSibling?.textContent;

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null, refreshToken: null } as never);
});

describe('Admin dashboard — aircraft reminders and pilot profiles', () => {
  it('shows total and overdue aircraft reminders', async () => {
    renderAdmin({
      ...baseStats,
      aircraftReminders: { total: 214, overdue: 17 },
      pilotProfiles: { everythingMode: 0, overrides: {} },
    });
    await screen.findByText('Aircraft Reminders');
    expect(tileValue('Aircraft Reminders')).toBe('214');
    expect(tileValue('Overdue Reminders')).toBe('17');
  });

  it('shows the pilot-profile overrides as a discipline table', async () => {
    renderAdmin({
      ...baseStats,
      aircraftReminders: { total: 0, overdue: 0 },
      pilotProfiles: {
        everythingMode: 9,
        overrides: {
          IFR: { on: 0, off: 5, goal: 1 },
          SAILPLANE: { on: 4, off: 1, goal: 6 },
        },
      },
    });
    const card = await screen.findByTestId('admin-pilot-profiles');
    expect(within(card).getByText('9')).toBeInTheDocument();
    expect(within(card).getByText('Show everything')).toBeInTheDocument();
    const rows = within(card).getAllByRole('row');
    expect(within(rows[0]).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Discipline', 'On', 'Off', 'Goal']);
    expect(within(rows[1]).getByRole('rowheader')).toHaveTextContent('Sailplane');
    expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['4', '1', '6']);
    expect(within(rows[2]).getByRole('rowheader')).toHaveTextContent('IFR');
  });

  it('says so when no discipline was overridden', async () => {
    renderAdmin({ ...baseStats, aircraftReminders: { total: 0, overdue: 0 }, pilotProfiles: { everythingMode: 0, overrides: {} } });
    expect(await screen.findByText('No pilot has set a discipline explicitly yet.')).toBeInTheDocument();
  });

  it('degrades to a dash when an older API omits the new stats', async () => {
    renderAdmin(baseStats);
    await screen.findByText('Aircraft Reminders');
    expect(tileValue('Aircraft Reminders')).toBe('—');
    expect(tileValue('Overdue Reminders')).toBe('—');
    expect(within(screen.getByTestId('admin-pilot-profiles')).getByText('—')).toBeInTheDocument();
  });
});
