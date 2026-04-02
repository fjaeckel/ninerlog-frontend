import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CurrencyPage from '../../pages/currency/CurrencyPage';
import * as useCurrencyHook from '../../hooks/useCurrency';
import * as useCredentialsHook from '../../hooks/useCredentials';
import * as useLicensesHook from '../../hooks/useLicenses';
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

describe('CurrencyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { id: 'u1', name: 'Pilot', email: 'p@t.com' }, accessToken: 'tok' } as any);

    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({
      data: [
        { id: 'lic-1', regulatoryAuthority: 'EASA', licenseType: 'PPL', licenseNumber: 'DE.FCL.12345' },
      ],
      isLoading: false, error: null,
    } as any);
  });

  it('renders page title', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({ data: { ratings: [], passengerCurrency: [] }, isLoading: false, error: null } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByText('Currency & Compliance')).toBeInTheDocument();
  });

  it('shows currency cards grouped by license', async () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [
          {
            classRatingId: 'cr-1', classType: 'SEP_LAND', licenseId: 'lic-1',
            regulatoryAuthority: 'EASA', licenseType: 'PPL', status: 'current',
            message: 'EASA SEP_LAND current', ruleDescription: 'Requires 12h total + 6h PIC...',
            requirements: [],
          },
        ],
        passengerCurrency: [],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByText('Flight Currency')).toBeInTheDocument();
    expect(screen.getByText('SEP (Land)')).toBeInTheDocument();
    expect(screen.getByText('CURRENT')).toBeInTheDocument();
    expect(screen.getByText('Requires 12h total + 6h PIC...')).toBeInTheDocument();
  });

  it('shows license header with rating count', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [
          { classRatingId: 'cr-1', classType: 'SEP_LAND', licenseId: 'lic-1', regulatoryAuthority: 'EASA', licenseType: 'PPL', status: 'current', message: 'ok', requirements: [] },
          { classRatingId: 'cr-2', classType: 'IR', licenseId: 'lic-1', regulatoryAuthority: 'EASA', licenseType: 'PPL', status: 'expiring', message: 'warn', requirements: [] },
        ],
        passengerCurrency: [],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    // License header shows authority + type
    expect(screen.getAllByText('EASA PPL').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2 ratings')).toBeInTheDocument();
  });

  it('shows alert badge when ratings are expiring', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [
          { classRatingId: 'cr-1', classType: 'SEP_LAND', licenseId: 'lic-1', regulatoryAuthority: 'EASA', status: 'expired', message: 'expired', requirements: [] },
        ],
        passengerCurrency: [],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByText('1 alert')).toBeInTheDocument();
  });

  it('renders collapsible license sections with ratings visible by default', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [
          { classRatingId: 'cr-1', classType: 'SEP_LAND', licenseId: 'lic-1', regulatoryAuthority: 'EASA', licenseType: 'PPL', status: 'current', message: 'ok', requirements: [] },
        ],
        passengerCurrency: [],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    // License header exists with rating count
    expect(screen.getByText('1 rating')).toBeInTheDocument();
    // Currency card is visible by default (expanded)
    expect(screen.getByText('SEP (Land)')).toBeInTheDocument();
  });

  it('shows credentials section with validity status', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({ data: { ratings: [], passengerCurrency: [] }, isLoading: false, error: null } as any);

    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({
      data: [
        {
          id: 'cred-1', credentialType: 'EASA_CLASS2_MEDICAL',
          credentialNumber: 'MED-001', issuingAuthority: 'AME Dr. Schmidt',
          issueDate: '2025-01-01', expiryDate: in30Days,
          createdAt: '', updatedAt: '',
        },
      ],
      isLoading: false, error: null,
    } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByText('Credentials & Medicals')).toBeInTheDocument();
    expect(screen.getByText('EASA CLASS2 MEDICAL')).toBeInTheDocument();
    expect(screen.getByText('EXPIRING')).toBeInTheDocument();
    expect(screen.getByText(/EASA Class 2 Medical/)).toBeInTheDocument();
  });

  it('shows valid badge for non-expiring credential', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({ data: { ratings: [], passengerCurrency: [] }, isLoading: false, error: null } as any);

    const inOneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({
      data: [
        {
          id: 'cred-2', credentialType: 'FAA_CLASS3_MEDICAL',
          credentialNumber: 'FAA-001', issuingAuthority: 'FAA AME',
          issueDate: '2025-06-01', expiryDate: inOneYear,
          createdAt: '', updatedAt: '',
        },
      ],
      isLoading: false, error: null,
    } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByText('VALID')).toBeInTheDocument();
  });

  it('shows empty state when no class ratings', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({ data: { ratings: [], passengerCurrency: [] }, isLoading: false, error: null } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByText(/No class ratings found/)).toBeInTheDocument();
    expect(screen.getByText(/No credentials found/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: undefined, isLoading: true, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByText('Loading currency data...')).toBeInTheDocument();
  });

  it('counts alerts from both ratings and credentials', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [
          { classRatingId: 'cr-1', classType: 'SEP_LAND', licenseId: 'lic-1', regulatoryAuthority: 'EASA', status: 'expiring', message: 'warn', requirements: [] },
        ],
        passengerCurrency: [],
      },
      isLoading: false, error: null,
    } as any);

    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({
      data: [
        { id: 'c1', credentialType: 'EASA_CLASS2_MEDICAL', expiryDate: in10Days, issueDate: '2025-01-01', createdAt: '', updatedAt: '' },
      ],
      isLoading: false, error: null,
    } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByText('2 alerts')).toBeInTheDocument();
  });

  it('shows passenger currency section with day/night status', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [],
        passengerCurrency: [
          {
            classType: 'SEP_LAND', regulatoryAuthority: 'EASA',
            dayStatus: 'current', nightStatus: 'expired',
            dayLandings: 5, nightLandings: 1, dayRequired: 3, nightRequired: 3,
            message: 'EASA SEP_LAND — day passenger current, night not current',
            ruleDescription: '3 takeoffs & landings in same type/class within preceding 90 days to carry passengers (EASA FCL.060(b))',
          },
        ],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByText('Passenger Currency')).toBeInTheDocument();
    expect(screen.getByTestId('passenger-currency-SEP_LAND')).toBeInTheDocument();
    expect(screen.getByText('DAY ONLY')).toBeInTheDocument();
    expect(screen.getByText(/FCL.060/)).toBeInTheDocument();
  });

  it('shows fully current passenger currency badge', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [],
        passengerCurrency: [
          {
            classType: 'SEP_LAND', regulatoryAuthority: 'FAA',
            dayStatus: 'current', nightStatus: 'current',
            dayLandings: 5, nightLandings: 4, dayRequired: 3, nightRequired: 3,
            message: 'FAA SEP_LAND — current for day and night passengers',
            ruleDescription: '14 CFR 61.57(a)/(b)',
          },
        ],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByTestId('passenger-currency-section')).toBeInTheDocument();
    // The badge should say CURRENT
    const paxCard = screen.getByTestId('passenger-currency-SEP_LAND');
    expect(paxCard).toHaveTextContent('CURRENT');
  });

  it('hides passenger currency section when empty', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: { ratings: [], passengerCurrency: [] },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.queryByText('Passenger Currency')).not.toBeInTheDocument();
  });

  it('shows two-tier structure with both rating and passenger currency', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [
          {
            classRatingId: 'cr-1', classType: 'SEP_LAND', licenseId: 'lic-1',
            regulatoryAuthority: 'EASA', licenseType: 'PPL', status: 'current',
            message: 'EASA SEP_LAND current', requirements: [],
          },
        ],
        passengerCurrency: [
          {
            classType: 'SEP_LAND', regulatoryAuthority: 'EASA',
            dayStatus: 'current', nightStatus: 'expired',
            dayLandings: 4, nightLandings: 0, dayRequired: 3, nightRequired: 3,
            message: 'day current, night not current',
            ruleDescription: 'FCL.060(b)',
          },
        ],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    // Both sections should be visible
    expect(screen.getByText('Flight Currency')).toBeInTheDocument();
    expect(screen.getByText('Passenger Currency')).toBeInTheDocument();
  });

  it('shows flight review card for FAA pilots', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [],
        passengerCurrency: [],
        flightReview: {
          lastCompleted: '2025-06-15',
          expiresOn: '2027-06-30',
          status: 'current',
          message: 'Flight review current — completed 2025-06-15, valid until 2027-06-30 (14 CFR 61.56)',
        },
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByTestId('flight-review-card')).toBeInTheDocument();
    expect(screen.getByText(/Flight Review/)).toBeInTheDocument();
    expect(screen.getByText('CURRENT')).toBeInTheDocument();
    expect(screen.getByTestId('flight-review-card')).toHaveTextContent('2025-06-15');
  });

  it('shows expired flight review badge', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [],
        passengerCurrency: [],
        flightReview: {
          status: 'expired',
          message: 'No flight review on record — required every 24 calendar months (14 CFR 61.56)',
        },
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByTestId('flight-review-card')).toBeInTheDocument();
    expect(screen.getByText('EXPIRED')).toBeInTheDocument();
  });

  it('does not show flight review card for EASA pilots', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [
          { classRatingId: 'cr-1', classType: 'SEP_LAND', licenseId: 'lic-1', regulatoryAuthority: 'EASA', licenseType: 'PPL', status: 'current', message: 'ok', requirements: [] },
        ],
        passengerCurrency: [],
        // no flightReview — EASA doesn't use it
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.queryByTestId('flight-review-card')).not.toBeInTheDocument();
  });

  it('hides night currency bar when nightPrivilege is false (Sport Pilot)', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [],
        passengerCurrency: [
          {
            classType: 'SEP_LAND', regulatoryAuthority: 'FAA',
            dayStatus: 'current', nightStatus: 'unknown',
            dayLandings: 5, nightLandings: 0, dayRequired: 3, nightRequired: 0,
            nightPrivilege: false,
            message: 'FAA SEP_LAND — current for day passengers (night not applicable for Sport)',
            ruleDescription: '14 CFR 61.57(a)',
          },
        ],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByTestId('passenger-currency-SEP_LAND')).toBeInTheDocument();
    expect(screen.getByTestId('night-not-applicable')).toBeInTheDocument();
    expect(screen.getByText('CURRENT')).toBeInTheDocument();
  });

  it('shows night currency bar when nightPrivilege is true (PPL)', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [],
        passengerCurrency: [
          {
            classType: 'SEP_LAND', regulatoryAuthority: 'EASA',
            dayStatus: 'current', nightStatus: 'expired',
            dayLandings: 5, nightLandings: 1, dayRequired: 3, nightRequired: 3,
            nightPrivilege: true,
            message: 'EASA SEP_LAND — day current, night not current',
            ruleDescription: 'FCL.060(b)',
          },
        ],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByTestId('passenger-currency-SEP_LAND')).toBeInTheDocument();
    expect(screen.queryByTestId('night-not-applicable')).not.toBeInTheDocument();
    expect(screen.getByText('DAY ONLY')).toBeInTheDocument();
  });

  it('shows passenger privilege badge when present', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [],
        passengerCurrency: [
          {
            classType: 'SEP_LAND', regulatoryAuthority: 'EASA',
            dayStatus: 'current', nightStatus: 'unknown',
            dayLandings: 5, nightLandings: 0, dayRequired: 3, nightRequired: 0,
            nightPrivilege: false,
            message: 'LAPL SEP_LAND — current',
            ruleDescription: 'FCL.060(b)',
            passengerPrivilege: {
              eligible: false,
              message: 'Need 10h PIC after license issue — currently 5h (LAPL(A) FCL.140.A(b))',
            },
          },
        ],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.getByTestId('passenger-privilege-badge')).toBeInTheDocument();
    expect(screen.getByTestId('passenger-privilege-badge')).toHaveTextContent('Need 10h PIC');
  });

  it('shows eligible passenger privilege badge', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [],
        passengerCurrency: [
          {
            classType: 'SEP_LAND', regulatoryAuthority: 'EASA',
            dayStatus: 'current', nightStatus: 'unknown',
            dayLandings: 5, nightLandings: 0, dayRequired: 3, nightRequired: 0,
            nightPrivilege: false,
            message: 'current',
            ruleDescription: 'FCL.060(b)',
            passengerPrivilege: {
              eligible: true,
              message: 'Eligible to carry 1 passenger (10h PIC completed)',
            },
          },
        ],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    const badge = screen.getByTestId('passenger-privilege-badge');
    expect(badge).toHaveTextContent('Eligible to carry 1 passenger');
  });

  it('does not show passenger privilege badge when absent', () => {
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
      data: {
        ratings: [],
        passengerCurrency: [
          {
            classType: 'SEP_LAND', regulatoryAuthority: 'FAA',
            dayStatus: 'current', nightStatus: 'current',
            dayLandings: 5, nightLandings: 4, dayRequired: 3, nightRequired: 3,
            nightPrivilege: true,
            message: 'current',
            ruleDescription: '14 CFR 61.57',
            // no passengerPrivilege — PPL doesn't have additional requirements
          },
        ],
      },
      isLoading: false, error: null,
    } as any);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as any);

    renderWithProviders(<CurrencyPage />);
    expect(screen.queryByTestId('passenger-privilege-badge')).not.toBeInTheDocument();
  });
});