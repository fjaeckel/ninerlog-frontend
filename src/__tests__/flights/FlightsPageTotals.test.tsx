import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightsPage from '../../pages/flights/FlightsPage';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useLicensesHook from '../../hooks/useLicenses';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];
type FlightTotals = components['schemas']['FlightTotals'];

const flight = (id: string, date: string, over: Partial<Flight> = {}): Flight =>
  ({
    id,
    userId: 'user-1',
    date,
    aircraftReg: 'D-EFGH',
    aircraftType: 'C172',
    departureIcao: 'EDDF',
    arrivalIcao: 'EDDH',
    offBlockTime: '10:00:00',
    onBlockTime: '11:30:00',
    totalTime: 90,
    isPic: true,
    isDual: false,
    picTime: 90,
    dualTime: 0,
    nightTime: 0,
    ifrTime: 0,
    soloTime: 0,
    crossCountryTime: 0,
    landingsDay: 1,
    landingsNight: 0,
    allLandings: 1,
    takeoffsDay: 1,
    takeoffsNight: 0,
    distance: 0,
    createdAt: `${date}T00:00:00Z`,
    updatedAt: `${date}T00:00:00Z`,
    ...over,
  }) as Flight;

const totals = (over: Partial<FlightTotals> = {}): FlightTotals => ({
  flights: 42,
  totalTime: 3_000,
  picTime: 2_400,
  dualTime: 600,
  nightTime: 125,
  ifrTime: 0,
  crossCountryTime: 0,
  sicTime: 0,
  picusTime: 0,
  spicTime: 0,
  reliefTime: 0,
  dualGivenTime: 0,
  examinerTime: 0,
  multiPilotTime: 0,
  soloTime: 0,
  simulatedFlightTime: 0,
  actualInstrumentTime: 0,
  simulatedInstrumentTime: 0,
  groundTrainingTime: 0,
  landingsDay: 50,
  landingsNight: 3,
  takeoffsDay: 50,
  takeoffsNight: 3,
  approaches: 0,
  holds: 0,
  distance: 0,
  ...over,
});

const page = {
  data: [flight('a', '2026-01-15', { nightTime: 30, landingsNight: 1 }), flight('b', '2026-01-10')],
  pagination: { page: 1, pageSize: 20, total: 42, totalPages: 3 },
  totals: totals(),
  monthTotals: [{ month: '2026-01', totals: totals({ flights: 7, totalTime: 600 }) }],
};

function setViewport(wide: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/flights']}>
        <Routes>
          <Route path="/flights" element={<FlightsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function mockQueries(wide: boolean) {
  setViewport(wide);
  vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue({
    data: wide ? page : undefined,
    isLoading: false,
    error: null,
  } as never);
  vi.spyOn(useFlightsHook, 'useInfiniteFlights').mockReturnValue({
    data: wide ? undefined : { pages: [page], pageParams: [1] },
    isLoading: false,
    error: null,
    isError: false,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  } as never);
  vi.spyOn(useFlightsHook, 'useDeleteFlight').mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({ data: [] } as never);
}

describe('FlightsPage — totals', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('foots the table with the totals of every matching flight', () => {
    mockQueries(true);
    renderPage();

    const footer = screen.getByTestId('flight-totals-row');
    expect(footer).toHaveTextContent('42 flights');
    expect(footer).toHaveTextContent('50h 0m');
    // Night time is on the page, so its column carries a total too.
    expect(footer).toHaveTextContent('2h 5m');
    // Night landings on the page split the landings column, total included.
    expect(footer).toHaveTextContent('50/3');
  });

  it('heads a month with the whole month, not just the flights loaded', () => {
    mockQueries(true);
    renderPage();

    const table = screen.getByRole('table');
    expect(within(table).getByText(/7 flights · 10h 0m/)).toBeInTheDocument();
  });

  it('shows a totals strip above the cards on a phone', () => {
    mockQueries(false);
    renderPage();

    const strip = screen.getByTestId('flight-totals-strip');
    expect(strip).toHaveTextContent('42 flights');
    expect(strip).toHaveTextContent('50h 0m');
  });
});
