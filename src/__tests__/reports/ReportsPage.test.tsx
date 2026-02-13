import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReportsPage from '../../pages/reports/ReportsPage';
import * as useReportsHook from '../../hooks/useReports';

// Mock recharts to avoid SVG rendering issues in happy-dom
vi.mock('recharts', () => {
  const MockChart = ({ children }: any) => <div data-testid="mock-chart">{children}</div>;
  return {
    BarChart: MockChart,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    Legend: () => null,
    PieChart: MockChart,
    Pie: () => null,
    Cell: () => null,
    AreaChart: MockChart,
    Area: () => null,
  };
});

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

const mockTrendsData: useReportsHook.TrendsData = {
  monthly: [
    {
      month: '2026-01',
      totalFlights: 5,
      totalHours: 8.5,
      picHours: 6.0,
      dualHours: 2.5,
      nightHours: 1.0,
      ifrHours: 0.5,
      landingsDay: 7,
      landingsNight: 1,
    },
    {
      month: '2026-02',
      totalFlights: 3,
      totalHours: 4.2,
      picHours: 4.2,
      dualHours: 0,
      nightHours: 0,
      ifrHours: 0,
      landingsDay: 4,
      landingsNight: 0,
    },
  ],
  byAircraftType: [
    { aircraftType: 'C172', totalFlights: 6, totalHours: 10.0 },
    { aircraftType: 'PA28', totalFlights: 2, totalHours: 2.7 },
  ],
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.spyOn(useReportsHook, 'useTrends').mockReturnValue({
      data: undefined, isLoading: true, error: null,
    } as any);

    renderWithProviders(<ReportsPage />);
    expect(screen.getByText(/loading reports/i)).toBeInTheDocument();
  });

  it('renders page title and subtitle', () => {
    vi.spyOn(useReportsHook, 'useTrends').mockReturnValue({
      data: mockTrendsData, isLoading: false, error: null,
    } as any);

    renderWithProviders(<ReportsPage />);
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText(/flight trends/i)).toBeInTheDocument();
  });

  it('renders summary cards with correct values', () => {
    vi.spyOn(useReportsHook, 'useTrends').mockReturnValue({
      data: mockTrendsData, isLoading: false, error: null,
    } as any);

    renderWithProviders(<ReportsPage />);
    expect(screen.getByText('8')).toBeInTheDocument(); // total flights
    expect(screen.getByText('12.7')).toBeInTheDocument(); // total hours
    expect(screen.getByText('2')).toBeInTheDocument(); // aircraft types
  });

  it('renders time range selector buttons', () => {
    vi.spyOn(useReportsHook, 'useTrends').mockReturnValue({
      data: mockTrendsData, isLoading: false, error: null,
    } as any);

    renderWithProviders(<ReportsPage />);
    expect(screen.getByText('6mo')).toBeInTheDocument();
    expect(screen.getByText('12mo')).toBeInTheDocument();
    expect(screen.getByText('24mo')).toBeInTheDocument();
  });

  it('renders export buttons', () => {
    vi.spyOn(useReportsHook, 'useTrends').mockReturnValue({
      data: mockTrendsData, isLoading: false, error: null,
    } as any);

    renderWithProviders(<ReportsPage />);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
  });

  it('renders chart sections', () => {
    vi.spyOn(useReportsHook, 'useTrends').mockReturnValue({
      data: mockTrendsData, isLoading: false, error: null,
    } as any);

    renderWithProviders(<ReportsPage />);
    expect(screen.getByText('Block Hours Over Time')).toBeInTheDocument();
    expect(screen.getByText('Flights Per Month')).toBeInTheDocument();
    expect(screen.getByText('Hours by Aircraft Type')).toBeInTheDocument();
    expect(screen.getByText('Aircraft Type Breakdown')).toBeInTheDocument();
  });

  it('renders aircraft type breakdown bars', () => {
    vi.spyOn(useReportsHook, 'useTrends').mockReturnValue({
      data: mockTrendsData, isLoading: false, error: null,
    } as any);

    renderWithProviders(<ReportsPage />);
    expect(screen.getByText('C172')).toBeInTheDocument();
    expect(screen.getByText('PA28')).toBeInTheDocument();
    expect(screen.getByText(/10\.0h/)).toBeInTheDocument();
    expect(screen.getByText(/2\.7h/)).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    vi.spyOn(useReportsHook, 'useTrends').mockReturnValue({
      data: { monthly: [], byAircraftType: [] }, isLoading: false, error: null,
    } as any);

    renderWithProviders(<ReportsPage />);
    expect(screen.getByText(/no flight data available/i)).toBeInTheDocument();
  });

  it('changes time range when selector is clicked', async () => {
    const user = userEvent.setup();
    const mockUseTrends = vi.spyOn(useReportsHook, 'useTrends').mockReturnValue({
      data: mockTrendsData, isLoading: false, error: null,
    } as any);

    renderWithProviders(<ReportsPage />);

    await user.click(screen.getByText('6mo'));

    // useTrends should have been called with 6
    await waitFor(() => {
      const calls = mockUseTrends.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(6);
    });
  });
});
