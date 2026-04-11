import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../pages/DashboardPage';
import * as useStatisticsHook from '../hooks/useStatistics';
import * as useLicensesHook from '../hooks/useLicenses';
import * as useFlightsHook from '../hooks/useFlights';
import * as useCredentialsHook from '../hooks/useCredentials';
import * as useCurrencyHook from '../hooks/useCurrency';
import { useAuthStore } from '../stores/authStore';

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

describe('DashboardPage Currency Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth store
    useAuthStore.setState({
      user: { id: 'user-1', name: 'Test Pilot', email: 'pilot@test.com' },
      accessToken: 'mock-token',
    } as any);

    // Mock licenses
    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({
      data: [{ id: 'lic-1', regulatoryAuthority: 'EASA', licenseType: 'PPL' }],
      isLoading: false, error: null,
    } as any);

    // Mock flights
    vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue({
      data: { data: [], pagination: { total: 0 } },
      isLoading: false, error: null,
    } as any);

    // Mock statistics
    vi.spyOn(useStatisticsHook, 'useLicenseStatistics').mockReturnValue({
      data: { totalFlights: 10, totalMinutes: 50, picMinutes: 40, dualMinutes: 10, nightMinutes: 5, ifrMinutes: 3, soloMinutes: 30, crossCountryMinutes: 25, landingsDay: 20, landingsNight: 5 },
      isLoading: false, error: null,
    } as any);

    // Mock credentials
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({
      data: [], isLoading: false, error: null,
    } as any);
  });

  it('renders currency cards when currency data is available', async () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [
          {
            classRatingId: 'cr-1',
            classType: 'SEP_LAND',
            licenseId: 'lic-1',
            regulatoryAuthority: 'EASA',
            licenseType: 'PPL',
            status: 'current',
            message: 'EASA SEP_LAND current — all revalidation requirements met',
            expiryDate: '2027-06-15',
            requirements: [
              { name: 'Total Time', met: true, current: 15, required: 12, unit: 'minutes', message: '900 / 720 minutes in class' },
              { name: 'PIC Time', met: true, current: 8, required: 6, unit: 'minutes', message: '480 / 360 PIC minutes' },
            ],
          },
        ],
      },
      isLoading: false, error: null,
    } as any);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Flight Currency')).toBeInTheDocument();
      expect(screen.getByText('SEP (Land)')).toBeInTheDocument();
      expect(screen.getByText('CURRENT')).toBeInTheDocument();
      expect(screen.getByText('EASA PPL')).toBeInTheDocument();
    });
  });

  it('renders multiple currency cards for different class ratings', async () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [
          {
            classRatingId: 'cr-1', classType: 'SEP_LAND', licenseId: 'lic-1',
            regulatoryAuthority: 'EASA', licenseType: 'PPL', status: 'current',
            message: 'EASA SEP_LAND current', requirements: [],
          },
          {
            classRatingId: 'cr-2', classType: 'IR', licenseId: 'lic-1',
            regulatoryAuthority: 'EASA', licenseType: 'PPL', status: 'expiring',
            message: 'EASA IR — IFR hour requirement not met', requirements: [
              { name: 'IFR Time', met: false, current: 5, required: 10, unit: 'minutes', message: '5.0 / 10.0 IFR hours' },
            ],
          },
        ],
      },
      isLoading: false, error: null,
    } as any);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('SEP (Land)')).toBeInTheDocument();
      expect(screen.getByText('Instrument Rating')).toBeInTheDocument();
      expect(screen.getByText('CURRENT')).toBeInTheDocument();
      expect(screen.getByText('ATTENTION')).toBeInTheDocument();
    });
  });

  it('does not render currency section when no ratings exist', async () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: { ratings: [] },
      isLoading: false, error: null,
    } as any);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText('Flight Currency')).not.toBeInTheDocument();
    });
  });

  it('does not render currency section when data is undefined', async () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: undefined,
      isLoading: false, error: null,
    } as any);

    renderWithProviders(<DashboardPage />);

    expect(screen.queryByText('Flight Currency')).not.toBeInTheDocument();
  });

  it('renders statistics cards alongside currency', async () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [
          {
            classRatingId: 'cr-1', classType: 'SEP_LAND', licenseId: 'lic-1',
            regulatoryAuthority: 'FAA', licenseType: 'PPL', status: 'expired',
            message: 'FAA SEP_LAND — not current', requirements: [],
          },
        ],
      },
      isLoading: false, error: null,
    } as any);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      // Currency card
      expect(screen.getByText('NOT CURRENT')).toBeInTheDocument();
      // Stats cards
      expect(screen.getByText('Total Time')).toBeInTheDocument();
      expect(screen.getByText('PIC Time')).toBeInTheDocument();
      expect(screen.getByText('Total Flights')).toBeInTheDocument();
    });
  });

  it('renders credential expiry alerts', async () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: { ratings: [] },
      isLoading: false, error: null,
    } as any);

    const now = new Date();
    const in10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({
      data: [
        {
          id: 'cred-1', credentialType: 'EASA_CLASS2_MEDICAL',
          credentialNumber: 'MED-001', issuingAuthority: 'AME',
          issueDate: '2025-01-01', expiryDate: in10Days,
          createdAt: '', updatedAt: '',
        },
      ],
      isLoading: false, error: null,
    } as any);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/EASA CLASS2 MEDICAL/i)).toBeInTheDocument();
      expect(screen.getByText(/expires in \d+ days/i)).toBeInTheDocument();
    });
  });
});
