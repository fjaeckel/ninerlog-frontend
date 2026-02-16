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
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({ data: { ratings: [] }, isLoading: false, error: null } as any);
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
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({ data: { ratings: [] }, isLoading: false, error: null } as any);

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
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({ data: { ratings: [] }, isLoading: false, error: null } as any);

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
    vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({ data: { ratings: [] }, isLoading: false, error: null } as any);
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
});
