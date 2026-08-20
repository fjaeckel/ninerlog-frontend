import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReportsPage from '../../pages/reports/ReportsPage';
import * as useAnalyticsHook from '../../hooks/useAnalytics';
import type { FlightAnalytics } from '../../hooks/useAnalytics';

// Chart bodies stubbed; assertions target DOM the page owns (headings,
// stat tiles, ranked bars, table-view twins).
vi.mock('recharts', () => {
  const Stub = ({ children }: any) => <div data-testid="mock-chart">{children}</div>;
  const Null = () => null;
  return {
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    AreaChart: Stub,
    BarChart: Stub,
    Area: Null,
    Bar: Null,
    Cell: Null,
    XAxis: Null,
    YAxis: Null,
    CartesianGrid: Null,
    Tooltip: Null,
    Legend: Null,
  };
});

// IntersectionObserver backs the section nav's scroll-spy.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly scrollMargin = '';
  readonly thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

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

const bucket = (key: number, label: string, flights = 1, totalMinutes = 60) => ({
  key,
  label,
  flights,
  totalMinutes,
});

const mockAnalytics: FlightAnalytics = {
  range: { months: 12, allTime: false, from: '2025-08-01', to: '2026-07-28' },
  totals: {
    totalFlights: 8,
    totalMinutes: 762,
    picMinutes: 600,
    sicMinutes: 0,
    dualMinutes: 162,
    dualGivenMinutes: 0,
    soloMinutes: 0,
    nightMinutes: 60,
    ifrMinutes: 30,
    actualInstrumentMinutes: 20,
    simulatedInstrumentMinutes: 0,
    crossCountryMinutes: 500,
    multiPilotMinutes: 0,
    simulatedFlightMinutes: 0,
    groundTrainingMinutes: 0,
    landingsDay: 11,
    landingsNight: 1,
    takeoffsDay: 11,
    takeoffsNight: 1,
    approaches: 3,
    holds: 1,
    distanceNm: 1240.5,
    distinctRegistrations: 2,
    distinctTypes: 2,
    distinctAirports: 3,
    distinctCountries: 2,
    firstFlightDate: '2025-09-01',
    lastFlightDate: '2026-07-20',
  },
  monthly: [
    {
      month: '2026-01',
      flights: 5,
      totalMinutes: 510,
      picMinutes: 360,
      sicMinutes: 0,
      dualMinutes: 150,
      dualGivenMinutes: 0,
      soloMinutes: 0,
      nightMinutes: 60,
      ifrMinutes: 30,
      landingsDay: 7,
      landingsNight: 1,
      distanceNm: 800,
      cumulativeMinutes: 510,
    },
    {
      month: '2026-02',
      flights: 3,
      totalMinutes: 252,
      picMinutes: 240,
      sicMinutes: 0,
      dualMinutes: 12,
      dualGivenMinutes: 0,
      soloMinutes: 0,
      nightMinutes: 0,
      ifrMinutes: 0,
      landingsDay: 4,
      landingsNight: 0,
      distanceNm: 440.5,
      cumulativeMinutes: 762,
    },
  ],
  yearly: [
    {
      year: 2026,
      flights: 8,
      totalMinutes: 762,
      picMinutes: 600,
      dualMinutes: 162,
      nightMinutes: 60,
      ifrMinutes: 30,
      landings: 12,
      distanceNm: 1240.5,
    },
  ],
  byAircraftType: [
    { label: 'C172', subLabel: 'Cessna 172S', flights: 6, totalMinutes: 600, picMinutes: 600, dualMinutes: 0, nightMinutes: 60, ifrMinutes: 30, landings: 8, distanceNm: 800, lastFlightDate: '2026-07-20' },
    { label: 'PA28', subLabel: 'Piper Archer', flights: 2, totalMinutes: 162, picMinutes: 0, dualMinutes: 162, nightMinutes: 0, ifrMinutes: 0, landings: 4, distanceNm: 440.5, lastFlightDate: '2026-02-10' },
  ],
  byRegistration: [
    { label: 'D-EAAA', subLabel: 'Cessna 172S', flights: 6, totalMinutes: 600, picMinutes: 600, dualMinutes: 0, nightMinutes: 60, ifrMinutes: 30, landings: 8, distanceNm: 800, lastFlightDate: '2026-07-20' },
  ],
  byClass: [{ label: 'SEP_LAND', flights: 8, totalMinutes: 762, picMinutes: 600, dualMinutes: 162, landings: 12 }],
  byCategory: [{ label: 'Complex', flights: 2, totalMinutes: 162, picMinutes: 0, dualMinutes: 162, landings: 4 }],
  byAirport: [
    { icao: 'EDNY', name: 'Friedrichshafen', country: 'DE', latitude: 47.67, longitude: 9.51, departures: 8, arrivals: 5, flights: 8 },
    { icao: 'LSZH', name: 'Zurich', country: 'CH', latitude: 47.46, longitude: 8.55, departures: 0, arrivals: 3, flights: 3 },
  ],
  byCountry: [
    { country: 'DE', airports: 2, flights: 8 },
    { country: 'CH', airports: 1, flights: 3 },
  ],
  byRoute: [{ departureIcao: 'EDNY', arrivalIcao: 'LSZH', flights: 3, totalMinutes: 180, distanceNm: 41 }],
  byInstructor: [{ name: 'M. Keller', role: null, flights: 2, totalMinutes: 162, lastFlightDate: '2026-02-10' }],
  byCrew: [{ name: 'J. Moreau', role: 'SIC', flights: 1, totalMinutes: 90, lastFlightDate: '2026-01-15' }],
  approachTypes: [
    { type: 'ILS', count: 2 },
    { type: 'RNAV/GPS', count: 1 },
  ],
  dayOfWeek: [1, 2, 3, 4, 5, 6, 7].map((k) => bucket(k, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][k - 1])),
  hourOfDay: Array.from({ length: 24 }, (_, k) => bucket(k, String(k).padStart(2, '0'))),
  monthOfYear: Array.from({ length: 12 }, (_, i) => bucket(i + 1, `M${i + 1}`)),
  durationBuckets: ['<30m', '30-60m', '1-2h', '2-3h', '3-5h', '>5h'].map((l, i) => bucket(i, l)),
  records: {
    longestFlight: { id: 'a1', date: '2026-01-15', aircraftReg: 'D-EAAA', aircraftType: 'C172', departureIcao: 'EDNY', arrivalIcao: 'LSZH', totalMinutes: 180, distanceNm: 41 },
    longestDistanceFlight: { id: 'a1', date: '2026-01-15', aircraftReg: 'D-EAAA', aircraftType: 'C172', departureIcao: 'EDNY', arrivalIcao: 'LSZH', totalMinutes: 180, distanceNm: 41 },
    busiestDay: '2026-01-15',
    busiestDayFlights: 2,
    busiestMonth: '2026-01',
    busiestMonthMinutes: 510,
    busiestYear: 2026,
    busiestYearMinutes: 762,
    longestStreakMonths: 2,
    currentStreakMonths: 2,
    activeMonths: 2,
    daysSinceLastFlight: 8,
    farthestAirport: { icao: 'LSZH', name: 'Zurich', country: 'CH', latitude: 47.46, longitude: 8.55, departures: 0, arrivals: 3, flights: 3 },
    farthestAirportNm: 41,
    homeBase: 'EDNY',
  },
};

const mockUseAnalytics = (overrides: Partial<ReturnType<typeof useAnalyticsHook.useAnalytics>> = {}) =>
  vi.spyOn(useAnalyticsHook, 'useAnalytics').mockReturnValue({
    data: mockAnalytics,
    isLoading: false,
    isFetching: false,
    error: null,
    ...overrides,
  } as any);

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state', () => {
    mockUseAnalytics({ data: undefined, isLoading: true } as any);
    renderWithProviders(<ReportsPage />);
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('renders the error state when the request fails', () => {
    mockUseAnalytics({ data: undefined, isLoading: false, error: new Error('boom') } as any);
    renderWithProviders(<ReportsPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/failed to load reports/i)).toBeInTheDocument();
  });

  it('leads with the total block time as the hero figure', () => {
    mockUseAnalytics();
    renderWithProviders(<ReportsPage />);
    expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument();

    // Assertion scoped to the hero band.
    const hero = screen.getByText(/across 8 flights/i).closest('div') as HTMLElement;
    expect(within(hero).getByText('12h 42m')).toBeInTheDocument();
    expect(within(hero).getByText(/since/i)).toBeInTheDocument();
  });

  it('renders every section in the jump nav', () => {
    mockUseAnalytics();
    renderWithProviders(<ReportsPage />);
    for (const label of ['Overview', 'Experience', 'Aircraft', 'Places', 'Instrument', 'Patterns', 'Records']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  it('renders the headline stat tiles', () => {
    mockUseAnalytics();
    renderWithProviders(<ReportsPage />);
    expect(screen.getByText('12')).toBeInTheDocument(); // landings, 11 day + 1 night
    expect(screen.getByText('11 day / 1 night')).toBeInTheDocument();
    expect(screen.getByText('8 days ago')).toBeInTheDocument();
    expect(screen.getByText('in 2 countries')).toBeInTheDocument();
  });

  it('renders aircraft, airport and approach breakdowns', () => {
    mockUseAnalytics();
    renderWithProviders(<ReportsPage />);

    const cardBody = (title: string) => screen.getByText(title).closest('section') as HTMLElement;

    expect(within(cardBody('By aircraft type')).getByText('C172')).toBeInTheDocument();
    expect(within(cardBody('By aircraft type')).getByText('PA28')).toBeInTheDocument();
    expect(within(cardBody('By registration')).getByText('D-EAAA')).toBeInTheDocument();
    // Scoped to the airport ranking.
    expect(within(cardBody('Most visited airports')).getByText('EDNY')).toBeInTheDocument();
    expect(within(cardBody('Approach types')).getByText('ILS')).toBeInTheDocument();
    expect(within(cardBody('Most flown routes')).getByText('EDNY → LSZH')).toBeInTheDocument();
  });

  it('resolves country codes to names', () => {
    mockUseAnalytics();
    renderWithProviders(<ReportsPage />);
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('Switzerland')).toBeInTheDocument();
  });

  it('renders personal records', () => {
    mockUseAnalytics();
    renderWithProviders(<ReportsPage />);
    expect(screen.getByText('Longest flight')).toBeInTheDocument();
    expect(screen.getByText('Busiest day')).toBeInTheDocument();
    expect(screen.getByText('Current streak')).toBeInTheDocument();
    expect(screen.getByText('Longest: 2 months')).toBeInTheDocument();
  });

  it('omits time categories with no logged time', () => {
    mockUseAnalytics();
    renderWithProviders(<ReportsPage />);
    // SIC and solo are zero in the fixture: their meters are not rendered.
    expect(screen.queryByRole('meter', { name: 'SIC' })).not.toBeInTheDocument();
    expect(screen.queryByRole('meter', { name: 'Solo' })).not.toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'PIC' })).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Night' })).toBeInTheDocument();
  });

  it('offers a table view twin for chart cards', async () => {
    const user = userEvent.setup();
    mockUseAnalytics();
    renderWithProviders(<ReportsPage />);

    const card = screen.getByText('Approach types').closest('section') as HTMLElement;
    expect(within(card).queryByRole('table')).not.toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: /show as table/i }));

    const table = within(card).getByRole('table');
    expect(within(table).getByText('ILS')).toBeInTheDocument();
    expect(within(table).getByText('2')).toBeInTheDocument();
  });

  it('renders the empty state for a logbook with no flights', () => {
    mockUseAnalytics({
      data: { ...mockAnalytics, totals: { ...mockAnalytics.totals, totalFlights: 0, totalMinutes: 0 } },
    } as any);
    renderWithProviders(<ReportsPage />);
    expect(screen.getByText(/no flights to report on yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Overview' })).not.toBeInTheDocument();
  });

  it('opens on all time so the totals match the dashboard', () => {
    const spy = mockUseAnalytics();
    renderWithProviders(<ReportsPage />);

    expect(spy.mock.calls[0][0]).toBe(0);
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('refetches when the timeframe changes', async () => {
    const user = userEvent.setup();
    const spy = mockUseAnalytics();
    renderWithProviders(<ReportsPage />);

    await user.click(screen.getByRole('button', { name: '12mo' }));

    await waitFor(() => {
      expect(spy.mock.calls[spy.mock.calls.length - 1][0]).toBe(12);
    });
  });

  it('notes the initial-hours snapshot folded into the totals', () => {
    mockUseAnalytics({
      data: {
        ...mockAnalytics,
        baseline: {
          baselineDate: '2020-06-30',
          totalFlights: 400,
          totalMinutes: 30000,
          picMinutes: 24000,
          dualMinutes: 0,
          nightMinutes: 0,
          ifrMinutes: 0,
          landingsDay: 600,
          landingsNight: 0,
        },
      },
    } as any);
    renderWithProviders(<ReportsPage />);

    expect(screen.getByText(/500h 0m carried forward from before your logbook/i)).toBeInTheDocument();
    expect(screen.getByText(/count toward the totals only/i)).toBeInTheDocument();
  });

  it('omits the snapshot note when the timeframe carries no baseline', () => {
    mockUseAnalytics();
    renderWithProviders(<ReportsPage />);
    expect(screen.queryByText(/^Includes .* carried forward/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/count toward the totals only/i)).not.toBeInTheDocument();
  });

  it('disables the exports when there is nothing to export', () => {
    mockUseAnalytics({
      data: { ...mockAnalytics, totals: { ...mockAnalytics.totals, totalFlights: 0, totalMinutes: 0 } },
    } as any);
    renderWithProviders(<ReportsPage />);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeDisabled();
  });
});
